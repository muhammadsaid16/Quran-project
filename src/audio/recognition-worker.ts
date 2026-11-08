/**
 * Web Worker for Offline Streaming Speech Recognition via sherpa-onnx WASM
 *
 * Runs completely off the main UI thread to prevent UI micro-stutters or frame drops.
 * Emits incremental token events, timestamps, and confidence scores as audio chunks arrive.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export const RECOGNITION_WORKER_CODE = `
let sherpa = null;
let recognizer = null;
let activeStream = null;
let lastEmittedTokenIndex = 0;
let streamStartTime = 0;
let totalAudioSamplesProcessed = 0;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'init': {
        const { modelPath, tokensPath, wasmPath, config } = payload;
        
        // Dynamically import or load sherpa-onnx in worker
        if (typeof importScripts === 'function' && !sherpa) {
          if (wasmPath) {
            importScripts(wasmPath);
          }
        }
        
        // In Node worker or bundler-loaded worker
        if (!sherpa) {
          if (typeof self.sherpaOnnx !== 'undefined') {
            sherpa = self.sherpaOnnx;
          } else if (typeof require !== 'undefined') {
            sherpa = require('sherpa-onnx');
          }
        }

        if (sherpa) {
          recognizer = sherpa.createOnlineRecognizer({
            featConfig: {
              sampleRate: (config && config.sampleRate) || 16000,
              featureDim: (config && config.featureDim) || 80,
            },
            modelConfig: {
              zipformer2Ctc: {
                model: modelPath,
              },
              tokens: tokensPath,
              numThreads: (config && config.numThreads) || 1,
              provider: 'cpu',
              debug: 0,
            },
            decodingMethod: (config && config.decodingMethod) || 'greedy_search',
            enableEndpoint: 0,
          });
        }

        self.postMessage({ type: 'ready' });
        break;
      }

      case 'start_stream': {
        if (!recognizer) {
          throw new Error('Recognizer not initialized');
        }
        if (activeStream) {
          activeStream.free();
        }
        activeStream = recognizer.createStream();
        lastEmittedTokenIndex = 0;
        streamStartTime = Date.now();
        totalAudioSamplesProcessed = 0;
        self.postMessage({ type: 'stream_started' });
        break;
      }

      case 'audio_chunk': {
        if (!recognizer || !activeStream) {
          return;
        }

        const { pcm, sampleRate = 16000, isFinal = false } = payload;
        totalAudioSamplesProcessed += pcm.length;

        // Feed waveform to OnlineStream
        activeStream.acceptWaveform(sampleRate, pcm);

        // Decode ready frames
        while (recognizer.isReady(activeStream)) {
          recognizer.decode(activeStream);
        }

        const result = recognizer.getResult(activeStream);

        // Emit new streaming tokens
        if (result.tokens && result.tokens.length > lastEmittedTokenIndex) {
          for (let i = lastEmittedTokenIndex; i < result.tokens.length; i++) {
            const token = result.tokens[i];
            const timestamp = (result.timestamps && result.timestamps[i]) ?? 0;
            const confidence = (result.ys_probs && result.ys_probs[i]) ?? 1.0;

            self.postMessage({
              type: 'token',
              payload: {
                token,
                timestampMs: Math.round(timestamp * 1000),
                confidence: Number(confidence.toFixed(4)),
                index: i,
                isFinal: false,
              },
            });
          }
          lastEmittedTokenIndex = result.tokens.length;
        }

        // Emit partial transcription
        self.postMessage({
          type: 'partial_result',
          payload: {
            text: result.text || '',
            tokens: result.tokens || [],
            timestamps: result.timestamps || [],
            confidences: result.ys_probs || [],
          },
        });

        if (isFinal) {
          finishStream();
        }
        break;
      }

      case 'stop_stream': {
        finishStream();
        break;
      }

      case 'reset': {
        if (activeStream) {
          activeStream.free();
          activeStream = null;
        }
        lastEmittedTokenIndex = 0;
        totalAudioSamplesProcessed = 0;
        self.postMessage({ type: 'stream_reset' });
        break;
      }

      case 'free': {
        if (activeStream) {
          activeStream.free();
          activeStream = null;
        }
        if (recognizer) {
          recognizer.free();
          recognizer = null;
        }
        self.postMessage({ type: 'freed' });
        break;
      }
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      payload: { message: err.message || String(err) },
    });
  }
};

function finishStream() {
  if (!recognizer || !activeStream) return;

  activeStream.inputFinished();
  while (recognizer.isReady(activeStream)) {
    recognizer.decode(activeStream);
  }

  const finalRes = recognizer.getResult(activeStream);
  const now = Date.now();
  const inferenceTimeMs = now - streamStartTime;
  const audioDurationMs = (totalAudioSamplesProcessed / 16000) * 1000;
  const rtf = audioDurationMs > 0 ? inferenceTimeMs / audioDurationMs : 0;

  // Emit any remaining tokens
  if (finalRes.tokens && finalRes.tokens.length > lastEmittedTokenIndex) {
    for (let i = lastEmittedTokenIndex; i < finalRes.tokens.length; i++) {
      self.postMessage({
        type: 'token',
        payload: {
          token: finalRes.tokens[i],
          timestampMs: Math.round(((finalRes.timestamps && finalRes.timestamps[i]) ?? 0) * 1000),
          confidence: Number(((finalRes.ys_probs && finalRes.ys_probs[i]) ?? 1.0).toFixed(4)),
          index: i,
          isFinal: true,
        },
      });
    }
    lastEmittedTokenIndex = finalRes.tokens.length;
  }

  self.postMessage({
    type: 'final_result',
    payload: {
      text: finalRes.text || '',
      tokens: finalRes.tokens || [],
      timestamps: finalRes.timestamps || [],
      confidences: finalRes.ys_probs || [],
      durationMs: audioDurationMs,
      inferenceTimeMs,
      realTimeFactor: Number(rtf.toFixed(4)),
    },
  });

  activeStream.free();
  activeStream = null;
}
`;

/**
 * Returns a Blob URL for initializing the recognition web worker.
 */
export function getRecognitionWorkerBlobUrl(): string {
  const blob = new Blob([RECOGNITION_WORKER_CODE], {
    type: 'application/javascript',
  });
  return URL.createObjectURL(blob);
}
