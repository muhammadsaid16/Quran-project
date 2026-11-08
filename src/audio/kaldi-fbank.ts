/**
 * Kaldi 80-dimensional Filterbank (FBank) Feature Extractor
 *
 * Implements exact Kaldi feature extraction specification with Povey window:
 * - Sample Rate: 16,000 Hz (Mono)
 * - Feature Dimension: 80
 * - Frame Length: 25 ms (400 samples)
 * - Frame Shift: 10 ms (160 samples)
 * - Window Type: Povey (Gaussian-like taper: pow(0.5 - 0.5 * cos(2*pi*i/(N-1)), 0.85))
 * - Linear Pre-emphasis: 0.97
 * - DC Offset Removal: Enabled
 * - FFT Length: 512
 * - Low Freq: 20 Hz, High Freq: 7,600 Hz (sampleRate/2 - 400)
 * - Mel Scale: 1127.0 * ln(1.0 + f / 700.0)
 * - Streaming Frame Buffering: Remainder preservation across chunks
 */

export interface KaldiFbankConfig {
  sampleRate?: number;
  featureDim?: number;
  frameLengthMs?: number;
  frameShiftMs?: number;
  preemphasis?: number;
  removeDcOffset?: boolean;
  lowFreq?: number;
  highFreq?: number;
  energyFloor?: number;
}

export class KaldiFbankExtractor {
  readonly sampleRate: number;
  readonly featureDim: number;
  readonly frameLength: number; // 400 samples @ 16kHz
  readonly frameShift: number;  // 160 samples @ 16kHz
  readonly preemphasis: number;
  readonly removeDcOffset: boolean;
  readonly lowFreq: number;
  readonly highFreq: number;
  readonly energyFloor: number;
  readonly fftSize: number;

  private readonly poveyWindow: Float32Array;
  private readonly melFilters: { left: number; center: number; right: number; weights: Float32Array }[];
  private remainderBuffer: Float32Array;

  constructor(config: KaldiFbankConfig = {}) {
    this.sampleRate = config.sampleRate ?? 16000;
    this.featureDim = config.featureDim ?? 80;
    const frameLengthMs = config.frameLengthMs ?? 25;
    const frameShiftMs = config.frameShiftMs ?? 10;
    this.frameLength = Math.round((this.sampleRate * frameLengthMs) / 1000); // 400
    this.frameShift = Math.round((this.sampleRate * frameShiftMs) / 1000);   // 160
    this.preemphasis = config.preemphasis ?? 0.97;
    this.removeDcOffset = config.removeDcOffset ?? true;
    this.lowFreq = config.lowFreq ?? 20;
    this.highFreq = config.highFreq ?? (this.sampleRate / 2 - 400); // 7600
    this.energyFloor = config.energyFloor ?? 1e-10;

    // Next power of 2 for FFT >= frameLength (400 -> 512)
    this.fftSize = 1;
    while (this.fftSize < this.frameLength) {
      this.fftSize <<= 1;
    }

    this.poveyWindow = this.computePoveyWindow(this.frameLength);
    this.melFilters = this.computeMelFilterbanks(
      this.featureDim,
      this.fftSize,
      this.sampleRate,
      this.lowFreq,
      this.highFreq
    );
    this.remainderBuffer = new Float32Array(0);
  }

  /**
   * Povey window calculation:
   * w[i] = (0.5 - 0.5 * cos(2 * pi * i / (N - 1))) ^ 0.85
   */
  private computePoveyWindow(length: number): Float32Array {
    const window = new Float32Array(length);
    const factor = (2 * Math.PI) / (length - 1);
    for (let i = 0; i < length; i++) {
      const hanning = 0.5 - 0.5 * Math.cos(factor * i);
      window[i] = Math.pow(hanning, 0.85);
    }
    return window;
  }

  private hzToMel(hz: number): number {
    return 1127.0 * Math.log(1.0 + hz / 700.0);
  }

  private melToHz(mel: number): number {
    return 700.0 * (Math.exp(mel / 1127.0) - 1.0);
  }

  private computeMelFilterbanks(
    numBins: number,
    fftSize: number,
    sampleRate: number,
    lowFreq: number,
    highFreq: number
  ) {
    const numFftBins = Math.floor(fftSize / 2) + 1; // 257 bins
    const lowMel = this.hzToMel(lowFreq);
    const highMel = this.hzToMel(highFreq);
    const melDelta = (highMel - lowMel) / (numBins + 1);

    const binFreqs = new Float32Array(numBins + 2);
    for (let i = 0; i < numBins + 2; i++) {
      binFreqs[i] = this.melToHz(lowMel + i * melDelta);
    }

    const filters: { left: number; center: number; right: number; weights: Float32Array }[] = [];

    for (let bin = 0; bin < numBins; bin++) {
      const leftHz = binFreqs[bin];
      const centerHz = binFreqs[bin + 1];
      const rightHz = binFreqs[bin + 2];

      const leftFft = Math.floor((leftHz * fftSize) / sampleRate);
      const centerFft = Math.round((centerHz * fftSize) / sampleRate);
      const rightFft = Math.ceil((rightHz * fftSize) / sampleRate);

      const weights = new Float32Array(numFftBins);
      for (let k = leftFft; k <= centerFft && k < numFftBins; k++) {
        if (centerFft > leftFft) {
          weights[k] = (k - leftFft) / (centerFft - leftFft);
        }
      }
      for (let k = centerFft; k <= rightFft && k < numFftBins; k++) {
        if (rightFft > centerFft) {
          weights[k] = (rightFft - k) / (rightFft - centerFft);
        }
      }

      filters.push({
        left: Math.max(0, leftFft),
        center: Math.min(numFftBins - 1, centerFft),
        right: Math.min(numFftBins - 1, rightFft),
        weights,
      });
    }

    return filters;
  }

  /**
   * Fast In-Place Radix-2 Cooley-Tukey FFT
   */
  private fft(real: Float32Array, imag: Float32Array, n: number) {
    // Bit reversal
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        const tr = real[i];
        real[i] = real[j];
        real[j] = tr;
        const ti = imag[i];
        imag[i] = imag[j];
        imag[j] = ti;
      }
      let k = n >> 1;
      while (k <= j) {
        j -= k;
        k >>= 1;
      }
      j += k;
    }

    // Cooley-Tukey butterflies
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const angle = (-2 * Math.PI) / len;
      const wStepR = Math.cos(angle);
      const wStepI = Math.sin(angle);

      for (let i = 0; i < n; i += len) {
        let wr = 1.0;
        let wi = 0.0;
        for (let m = 0; m < half; m++) {
          const uR = real[i + m];
          const uI = imag[i + m];
          const vR = real[i + m + half] * wr - imag[i + m + half] * wi;
          const vI = real[i + m + half] * wi + imag[i + m + half] * wr;

          real[i + m] = uR + vR;
          imag[i + m] = uI + vI;
          real[i + m + half] = uR - vR;
          imag[i + m + half] = uI - vI;

          const nextWr = wr * wStepR - wi * wStepI;
          wi = wr * wStepI + wi * wStepR;
          wr = nextWr;
        }
      }
    }
  }

  /**
   * Process a single 400-sample raw frame into an 80-dimensional FBank feature vector
   */
  public extractFrame(rawFrame: Float32Array): Float32Array {
    if (rawFrame.length < this.frameLength) {
      throw new Error(`Frame length ${rawFrame.length} is less than expected ${this.frameLength}`);
    }

    // 1. Remove DC offset
    let mean = 0;
    if (this.removeDcOffset) {
      for (let i = 0; i < this.frameLength; i++) {
        mean += rawFrame[i];
      }
      mean /= this.frameLength;
    }

    // 2. Linear pre-emphasis and Povey windowing
    const real = new Float32Array(this.fftSize);
    const imag = new Float32Array(this.fftSize);

    let prevSample = this.removeDcOffset ? rawFrame[0] - mean : rawFrame[0];
    for (let i = 0; i < this.frameLength; i++) {
      const currentSample = this.removeDcOffset ? rawFrame[i] - mean : rawFrame[i];
      const preemphasized = currentSample - this.preemphasis * prevSample;
      prevSample = currentSample;
      real[i] = preemphasized * this.poveyWindow[i];
    }

    // 3. 512-point FFT
    this.fft(real, imag, this.fftSize);

    // 4. Power spectrum: |X[k]|^2
    const numFftBins = Math.floor(this.fftSize / 2) + 1;
    const powerSpectrum = new Float32Array(numFftBins);
    for (let k = 0; k < numFftBins; k++) {
      powerSpectrum[k] = real[k] * real[k] + imag[k] * imag[k];
    }

    // 5. Mel filterbank energies
    const fbank = new Float32Array(this.featureDim);
    for (let m = 0; m < this.featureDim; m++) {
      const filter = this.melFilters[m];
      let energy = 0;
      for (let k = filter.left; k <= filter.right; k++) {
        energy += powerSpectrum[k] * filter.weights[k];
      }
      fbank[m] = Math.log(Math.max(energy, this.energyFloor));
    }

    return fbank;
  }

  /**
   * Streaming Feature Frame Extraction
   * Accumulates chunks across invocations and extracts all available 80-dim frames.
   * Trailing samples that don't yet form a full frame are retained in remainder buffer.
   */
  public acceptAudioChunk(chunk: Float32Array): Float32Array[] {
    const totalSamples = this.remainderBuffer.length + chunk.length;
    const combined = new Float32Array(totalSamples);
    combined.set(this.remainderBuffer, 0);
    combined.set(chunk, this.remainderBuffer.length);

    const frames: Float32Array[] = [];
    let offset = 0;

    while (offset + this.frameLength <= totalSamples) {
      const frameSlice = combined.subarray(offset, offset + this.frameLength);
      frames.push(this.extractFrame(frameSlice));
      offset += this.frameShift;
    }

    // Retain trailing remainder
    this.remainderBuffer = combined.subarray(offset);
    return frames;
  }

  /**
   * Complete stream and flush any final partial frame if possible
   */
  public inputFinished(): Float32Array[] {
    const frames: Float32Array[] = [];
    if (this.remainderBuffer.length >= this.frameLength) {
      frames.push(this.extractFrame(this.remainderBuffer.subarray(0, this.frameLength)));
    }
    this.remainderBuffer = new Float32Array(0);
    return frames;
  }

  /**
   * Reset the streaming remainder buffer
   */
  public reset(): void {
    this.remainderBuffer = new Float32Array(0);
  }

  /**
   * Batch Extraction: extract all frames for an entire audio buffer at once
   */
  public extractAll(audioSamples: Float32Array): Float32Array[] {
    this.reset();
    const frames = this.acceptAudioChunk(audioSamples);
    const finalFrames = this.inputFinished();
    return [...frames, ...finalFrames];
  }
}
