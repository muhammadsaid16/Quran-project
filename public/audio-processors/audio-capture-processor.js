/**
 * Audio Capture & Resampling Worklet Processor (Web Audio API)
 * Distributed under public/audio-processors for browser fetch
 */

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetSampleRate = 16000;
    this.sourceSampleRate = sampleRate; // Global AudioWorklet sampleRate (e.g. 44100 or 48000)
    this.chunkSize = (options && options.processorOptions && options.processorOptions.chunkSize) || 2560; // 160ms @ 16kHz
    this.isRecording = true;
    this.resampleRatio = this.sourceSampleRate / this.targetSampleRate;

    // Resampling interpolation state
    this.resamplePhase = 0.0;
    this.lastInputSample = 0.0;

    // Chunk accumulation buffer
    this.chunkBuffer = new Float32Array(this.chunkSize);
    this.chunkOffset = 0;
    this.totalSamplesProcessed = 0;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'start') {
        this.isRecording = true;
      } else if (data.type === 'pause') {
        this.isRecording = false;
      } else if (data.type === 'flush') {
        this.flushPartialChunk();
      } else if (data.type === 'stop') {
        this.flushPartialChunk();
        this.isRecording = false;
      }
    };
  }

  flushPartialChunk() {
    if (this.chunkOffset > 0) {
      const partial = new Float32Array(this.chunkOffset);
      partial.set(this.chunkBuffer.subarray(0, this.chunkOffset));
      
      let sumSq = 0;
      let peak = 0;
      for (let i = 0; i < this.chunkOffset; i++) {
        const val = partial[i];
        sumSq += val * val;
        const absVal = Math.abs(val);
        if (absVal > peak) peak = absVal;
      }
      const rms = Math.sqrt(sumSq / this.chunkOffset);
      const level = Math.min(100, Math.round(rms * 100 * 3));

      this.port.postMessage(
        {
          type: 'audio_chunk',
          pcm: partial,
          rms: level,
          peak: peak,
          sampleCount: this.chunkOffset,
          totalSamples: this.totalSamplesProcessed,
          isFinal: true,
        },
        [partial.buffer]
      );
      this.chunkOffset = 0;
    }
  }

  process(inputs, outputs, parameters) {
    if (!this.isRecording) {
      return true;
    }

    const input = inputs[0];
    if (!input || input.length === 0 || !input[0] || input[0].length === 0) {
      return true;
    }

    const numChannels = input.length;
    const inputLength = input[0].length; // Typically 128 samples

    // 1. Downmix to Mono in temporary buffer
    const mono = new Float32Array(inputLength);
    if (numChannels === 1) {
      mono.set(input[0]);
    } else {
      const scale = 1.0 / numChannels;
      for (let c = 0; c < numChannels; c++) {
        const channel = input[c];
        for (let i = 0; i < inputLength; i++) {
          mono[i] += channel[i] * scale;
        }
      }
    }

    // 2. Resample to 16,000 Hz if hardware sample rate differs
    if (Math.abs(this.sourceSampleRate - this.targetSampleRate) < 1.0) {
      // Direct 16kHz input
      for (let i = 0; i < inputLength; i++) {
        this.chunkBuffer[this.chunkOffset++] = mono[i];
        this.totalSamplesProcessed++;

        if (this.chunkOffset >= this.chunkSize) {
          this.emitFullChunk();
        }
      }
    } else {
      // High-precision linear interpolation resampling
      let srcIndex = this.resamplePhase;
      while (srcIndex < inputLength) {
        const i0 = Math.floor(srcIndex);
        const frac = srcIndex - i0;
        const s0 = i0 >= 0 ? mono[i0] : this.lastInputSample;
        const s1 = (i0 + 1 < inputLength) ? mono[i0 + 1] : mono[inputLength - 1];

        const interpolated = s0 + frac * (s1 - s0);
        this.chunkBuffer[this.chunkOffset++] = interpolated;
        this.totalSamplesProcessed++;

        if (this.chunkOffset >= this.chunkSize) {
          this.emitFullChunk();
        }

        srcIndex += this.resampleRatio;
      }

      this.resamplePhase = srcIndex - inputLength;
      this.lastInputSample = mono[inputLength - 1];
    }

    return true;
  }

  emitFullChunk() {
    const chunk = new Float32Array(this.chunkSize);
    chunk.set(this.chunkBuffer);

    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < this.chunkSize; i++) {
      const val = chunk[i];
      sumSq += val * val;
      const absVal = Math.abs(val);
      if (absVal > peak) peak = absVal;
    }
    const rms = Math.sqrt(sumSq / this.chunkSize);
    const level = Math.min(100, Math.round(rms * 100 * 3));

    // Zero-copy transfer of chunk.buffer
    this.port.postMessage(
      {
        type: 'audio_chunk',
        pcm: chunk,
        rms: level,
        peak: peak,
        sampleCount: this.chunkSize,
        totalSamples: this.totalSamplesProcessed,
        isFinal: false,
      },
      [chunk.buffer]
    );

    this.chunkOffset = 0;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
