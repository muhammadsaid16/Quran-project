/**
 * Production Voice Recognition Engine for Quran Cognitive OS
 *
 * Orchestrates:
 * 1. Web Audio API AudioWorklet for glitch-free 16kHz audio capture & resampling
 * 2. 80-dimensional Kaldi FBank feature extraction (Povey window)
 * 3. sherpa-onnx WebAssembly inference for Zipformer Quran 3.2 CTC
 * 4. Incremental streaming token emission with frame timestamps & confidence scores
 * 5. Deterministic synthetic audio feeding for automated tests and CI
 * 6. Zero external network requests during recording and inference
 */

import {
  AudioLevelEvent,
  EngineStatus,
  RecognitionFinalResult,
  RecognitionPartialResult,
  StreamingTokenEvent,
  VoiceRecognitionCallbacks,
  VoiceRecognitionEngineConfig,
} from './types';
import { KaldiFbankExtractor } from './kaldi-fbank';
import { AUDIO_CAPTURE_WORKLET_CODE } from './audio-worklet-processor';

export class VoiceRecognitionEngine {
  private config: Required<VoiceRecognitionEngineConfig>;
  private callbacks: VoiceRecognitionCallbacks = {};
  private status: EngineStatus = 'uninitialized';

  // Browser Audio Objects
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;

  // Direct In-Process Engine (Node.js & Browser WASM)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private nativeSherpa: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private nativeRecognizer: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private nativeActiveStream: any = null;

  // Feature Extraction Validator
  private fbankExtractor: KaldiFbankExtractor;

  // Stream Metrics
  private lastTokenCount = 0;
  private streamStartTime = 0;
  private totalSamplesStreamed = 0;

  constructor(
    config: VoiceRecognitionEngineConfig = {},
    callbacks: VoiceRecognitionCallbacks = {}
  ) {
    this.config = {
      sampleRate: config.sampleRate ?? 16000,
      chunkSize: config.chunkSize ?? 2560, // 160ms @ 16kHz
      featureDim: config.featureDim ?? 80,
      modelPath: config.modelPath ?? 'models/zipformer_p_arabic_v3.2.int8.onnx',
      tokensPath: config.tokensPath ?? 'models/tokens.txt',
      decodingMethod: config.decodingMethod ?? 'greedy_search',
      numThreads: config.numThreads ?? 1,
      vadSilenceThreshold: config.vadSilenceThreshold ?? 5,
      vadTrailingSilenceMs: config.vadTrailingSilenceMs ?? 1500,
    };
    this.callbacks = callbacks;
    this.fbankExtractor = new KaldiFbankExtractor({
      sampleRate: this.config.sampleRate,
      featureDim: this.config.featureDim,
    });
  }

  public getStatus(): EngineStatus {
    return this.status;
  }

  public setCallbacks(callbacks: VoiceRecognitionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private setStatus(newStatus: EngineStatus): void {
    this.status = newStatus;
    this.callbacks.onStatusChange?.(newStatus);
  }

  /**
   * Initialize speech recognition engine and load model weights
   */
  public async initialize(): Promise<void> {
    if (this.status === 'ready' || this.status === 'recording') {
      return;
    }

    this.setStatus('initializing');

    try {
      // Determine if running in browser or Node
      const isBrowser =
        typeof window !== 'undefined' && typeof window.document !== 'undefined';

      if (!isBrowser) {
        // Node / Headless Environment
        await this.initDirectEngine();
      } else {
        // Browser Environment: Direct WebAssembly Engine
        await this.initBrowserWasm();
      }

      this.setStatus('ready');
    } catch (err) {
      this.setStatus('error');
      const error = err instanceof Error ? err : new Error(String(err));
      this.callbacks.onError?.(error);
      throw error;
    }
  }

  /**
   * Initialize in-process sherpa-onnx for Node.js / CI tests
   */
  private async initDirectEngine(): Promise<void> {
    // Dynamic non-webpack require to prevent bundler from bundling Node sherpa-onnx into client builds
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = typeof (globalThis as any).__non_webpack_require__ !== 'undefined'
      ? (globalThis as any).__non_webpack_require__
      : typeof require !== 'undefined'
      ? require
      : null;

    if (!req) {
      throw new Error('CommonJS require is not available in this environment');
    }

    const modName = 'sherpa-onnx';
    this.nativeSherpa = req(modName);
    this.nativeRecognizer = this.nativeSherpa.createOnlineRecognizer({
      featConfig: {
        sampleRate: this.config.sampleRate,
        featureDim: this.config.featureDim,
      },
      modelConfig: {
        zipformer2Ctc: {
          model: this.config.modelPath,
        },
        tokens: this.config.tokensPath,
        numThreads: this.config.numThreads,
        provider: 'cpu',
        debug: 0,
      },
      decodingMethod: this.config.decodingMethod,
      enableEndpoint: 0,
    });
  }

  /**
   * Initialize in-process WebAssembly sherpa-onnx for browser execution
   */
  private async initBrowserWasm(): Promise<void> {
    if (this.nativeRecognizer) {
      return;
    }

    const dynamicImport = new Function('url', 'return import(url)');
    const { initASRModule, createOnlineRecognizer, OnlineRecognizerTypes } =
      await dynamicImport('/sherpa-wasm/index.js');
    const mod = await initASRModule();

    const modelUrl = this.config.modelPath.startsWith('/')
      ? this.config.modelPath
      : `/${this.config.modelPath}`;
    const tokensUrl = this.config.tokensPath.startsWith('/')
      ? this.config.tokensPath
      : `/${this.config.tokensPath}`;

    const [modelBuf, tokensTxt] = await Promise.all([
      fetch(modelUrl).then((r) => {
        if (!r.ok) throw new Error(`Model fetch failed: ${modelUrl} (${r.status})`);
        return r.arrayBuffer();
      }),
      fetch(tokensUrl).then((r) => {
        if (!r.ok) throw new Error(`Tokens fetch failed: ${tokensUrl} (${r.status})`);
        return r.text();
      }),
    ]);

    try { mod.FS_unlink('/zipformer.onnx'); } catch {}
    try { mod.FS_unlink('/tokens.txt'); } catch {}

    mod.FS_createDataFile('/', 'zipformer.onnx', new Uint8Array(modelBuf), true, true, true);
    mod.FS_createDataFile('/', 'tokens.txt', new TextEncoder().encode(tokensTxt), true, true, true);

    this.nativeRecognizer = createOnlineRecognizer(mod, {
      type: OnlineRecognizerTypes.Zipformer2CTC,
      featConfig: {
        sampleRate: this.config.sampleRate,
        featureDim: this.config.featureDim,
      },
      modelConfig: {
        zipformer2Ctc: {
          model: '/zipformer.onnx',
        },
        tokens: '/tokens.txt',
        numThreads: this.config.numThreads,
        provider: 'cpu',
        debug: 0,
      },
      decodingMethod: this.config.decodingMethod,
      enableEndpoint: 0,
    });
  }

  /**
   * Start live microphone recording via AudioWorklet
   */
  public async startRecording(): Promise<void> {
    if (this.status !== 'ready' && this.status !== 'stopped') {
      await this.initialize();
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices) {
      throw new Error('Microphone recording is only available in a browser environment');
    }

    try {
      this.setStatus('recording');
      this.streamStartTime = Date.now();
      this.lastTokenCount = 0;
      this.totalSamplesStreamed = 0;

      // 1. Request microphone access (Zero external network)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Initialize AudioContext
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtxClass();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // 3. Register AudioWorklet processor
      const workletBlob = new Blob([AUDIO_CAPTURE_WORKLET_CODE], {
        type: 'application/javascript',
      });
      const workletUrl = URL.createObjectURL(workletBlob);
      await this.audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      // 4. Connect Audio graph
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-capture-processor', {
        processorOptions: {
          chunkSize: this.config.chunkSize,
        },
      });

      // 5. Start recognition stream
      if (this.nativeActiveStream) {
        this.nativeActiveStream.free();
      }
      if (!this.nativeRecognizer) {
        throw new Error('Recognition model is not initialized');
      }
      this.nativeActiveStream = this.nativeRecognizer.createStream();

      // 6. Handle chunks from worklet
      this.workletNode.port.onmessage = (event) => {
        const { type, pcm, rms, peak, sampleCount } = event.data;
        if (type === 'audio_chunk' && pcm) {
          this.totalSamplesStreamed += sampleCount || pcm.length;

          // Emit Audio Level & VAD Status
          const isSpeaking = rms > this.config.vadSilenceThreshold;
          this.callbacks.onAudioLevel?.({
            rmsLevel: rms,
            peak,
            isSpeaking,
          });

          // Feed waveform directly to active stream
          if (this.nativeRecognizer && this.nativeActiveStream) {
            this.nativeActiveStream.acceptWaveform(this.config.sampleRate, pcm);
            while (this.nativeRecognizer.isReady(this.nativeActiveStream)) {
              this.nativeRecognizer.decode(this.nativeActiveStream);
            }

            const interim = this.nativeRecognizer.getResult(this.nativeActiveStream);

            // Emit incremental tokens
            if (interim.tokens && interim.tokens.length > this.lastTokenCount) {
              for (let i = this.lastTokenCount; i < interim.tokens.length; i++) {
                const token = interim.tokens[i];
                const timestamp = (interim.timestamps && interim.timestamps[i]) ?? 0;
                const confidence = (interim.ys_probs && interim.ys_probs[i]) ?? 1.0;

                this.callbacks.onToken?.({
                  token,
                  timestampMs: Math.round(timestamp * 1000),
                  confidence: Number(confidence.toFixed(4)),
                  index: i,
                  isFinal: false,
                });
              }
              this.lastTokenCount = interim.tokens.length;
            }

            this.callbacks.onPartial?.({
              text: interim.text || '',
              tokens: interim.tokens || [],
              timestamps: interim.timestamps || [],
              confidences: interim.ys_probs || [],
            });
          }
        }
      };

      source.connect(this.workletNode);
    } catch (err) {
      this.setStatus('error');
      const error = err instanceof Error ? err : new Error(String(err));
      this.callbacks.onError?.(error);
      throw error;
    }
  }

  /**
   * Stop recording and retrieve final recognition result
   */
  public async stopRecording(): Promise<RecognitionFinalResult> {
    if (this.status !== 'recording') {
      throw new Error(`Cannot stop recording when status is ${this.status}`);
    }

    this.setStatus('processing');

    // Flush and stop worklet
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'stop' });
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    // Stop microphone tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    // Close AudioContext
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    const finalResult = this.finishNativeStream();
    this.setStatus('stopped');
    this.callbacks.onFinal?.(finalResult);
    return finalResult;
  }

  /**
   * Synthetic Audio Feeder for Automated Headless Testing and CI Benchmarks
   * Emulates live AudioWorklet chunk streaming with exact 160ms chunks
   */
  public async feedSyntheticAudio(
    samples: Float32Array,
    sampleRate = 16000,
    chunkSize = 2560
  ): Promise<RecognitionFinalResult> {
    if (this.status !== 'ready' && this.status !== 'stopped') {
      await this.initialize();
    }

    this.setStatus('recording');
    this.streamStartTime = Date.now();
    this.lastTokenCount = 0;
    this.totalSamplesStreamed = samples.length;

    // Resample if necessary
    let pcm16k = samples;
    if (sampleRate !== 16000) {
      pcm16k = this.resampleBuffer(samples, sampleRate, 16000);
    }

    if (!this.nativeRecognizer) {
      throw new Error('Recognition backend is not initialized');
    }

    // Direct in-process execution (Node or Browser)
    if (this.nativeActiveStream) {
      this.nativeActiveStream.free();
    }
    this.nativeActiveStream = this.nativeRecognizer.createStream();

    // Stream in chunks
    for (let offset = 0; offset < pcm16k.length; offset += chunkSize) {
      const chunk = pcm16k.subarray(offset, Math.min(offset + chunkSize, pcm16k.length));

      // Compute RMS
      let sumSq = 0;
      let peak = 0;
      for (let i = 0; i < chunk.length; i++) {
        const v = chunk[i];
        sumSq += v * v;
        const a = Math.abs(v);
        if (a > peak) peak = a;
      }
      const rms = Math.min(100, Math.round(Math.sqrt(sumSq / chunk.length) * 300));

      this.callbacks.onAudioLevel?.({
        rmsLevel: rms,
        peak,
        isSpeaking: rms > this.config.vadSilenceThreshold,
      });

      this.nativeActiveStream.acceptWaveform(16000, chunk);
      while (this.nativeRecognizer.isReady(this.nativeActiveStream)) {
        this.nativeRecognizer.decode(this.nativeActiveStream);
      }

      const interim = this.nativeRecognizer.getResult(this.nativeActiveStream);

      // Emit incremental tokens
      if (interim.tokens && interim.tokens.length > this.lastTokenCount) {
        for (let i = this.lastTokenCount; i < interim.tokens.length; i++) {
          const token = interim.tokens[i];
          const timestamp = (interim.timestamps && interim.timestamps[i]) ?? 0;
          const confidence = (interim.ys_probs && interim.ys_probs[i]) ?? 1.0;

          this.callbacks.onToken?.({
            token,
            timestampMs: Math.round(timestamp * 1000),
            confidence: Number(confidence.toFixed(4)),
            index: i,
            isFinal: false,
          });
        }
        this.lastTokenCount = interim.tokens.length;
      }

      this.callbacks.onPartial?.({
        text: interim.text || '',
        tokens: interim.tokens || [],
        timestamps: interim.timestamps || [],
        confidences: interim.ys_probs || [],
      });
    }

    const finalResult = this.finishNativeStream();
    this.setStatus('stopped');
    this.callbacks.onFinal?.(finalResult);
    return finalResult;
  }

  private finishNativeStream(): RecognitionFinalResult {
    if (!this.nativeActiveStream || !this.nativeRecognizer) {
      throw new Error('Native stream not active');
    }

    this.nativeActiveStream.inputFinished();
    while (this.nativeRecognizer.isReady(this.nativeActiveStream)) {
      this.nativeRecognizer.decode(this.nativeActiveStream);
    }

    const res = this.nativeRecognizer.getResult(this.nativeActiveStream);
    const now = Date.now();
    const inferenceTimeMs = now - this.streamStartTime;
    const durationMs = (this.totalSamplesStreamed / 16000) * 1000;
    const rtf = durationMs > 0 ? inferenceTimeMs / durationMs : 0;

    // Emit any remaining tokens
    if (res.tokens && res.tokens.length > this.lastTokenCount) {
      for (let i = this.lastTokenCount; i < res.tokens.length; i++) {
        this.callbacks.onToken?.({
          token: res.tokens[i],
          timestampMs: Math.round(((res.timestamps && res.timestamps[i]) ?? 0) * 1000),
          confidence: Number(((res.ys_probs && res.ys_probs[i]) ?? 1.0).toFixed(4)),
          index: i,
          isFinal: true,
        });
      }
      this.lastTokenCount = res.tokens.length;
    }

    const finalResult: RecognitionFinalResult = {
      text: res.text || '',
      tokens: res.tokens || [],
      timestamps: res.timestamps || [],
      confidences: res.ys_probs || [],
      durationMs,
      inferenceTimeMs,
      realTimeFactor: Number(rtf.toFixed(4)),
    };

    this.nativeActiveStream.free();
    this.nativeActiveStream = null;
    return finalResult;
  }

  /**
   * Resample Float32Array to 16,000 Hz
   */
  private resampleBuffer(
    buffer: Float32Array,
    fromRate: number,
    toRate: number
  ): Float32Array {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const outLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(outLength);

    for (let i = 0; i < outLength; i++) {
      const srcIndex = i * ratio;
      const i0 = Math.floor(srcIndex);
      const frac = srcIndex - i0;
      const s0 = buffer[i0] ?? 0;
      const s1 = buffer[i0 + 1] ?? s0;
      result[i] = s0 + frac * (s1 - s0);
    }
    return result;
  }

  public getKaldiFbankExtractor(): KaldiFbankExtractor {
    return this.fbankExtractor;
  }

  /**
   * Free all allocated resources and sessions
   */
  public dispose(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.nativeActiveStream) {
      this.nativeActiveStream.free();
      this.nativeActiveStream = null;
    }
    if (this.nativeRecognizer) {
      this.nativeRecognizer.free();
      this.nativeRecognizer = null;
    }
    this.setStatus('uninitialized');
  }
}
