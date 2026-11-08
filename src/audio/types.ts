/**
 * Types & Contracts for Voice Recognition Engine
 */

export interface StreamingTokenEvent {
  token: string;
  timestampMs: number;
  confidence: number;
  index: number;
  isFinal?: boolean;
}

export interface RecognitionPartialResult {
  text: string;
  tokens: string[];
  timestamps: number[];
  confidences: number[];
}

export interface RecognitionFinalResult {
  text: string;
  tokens: string[];
  timestamps: number[];
  confidences: number[];
  durationMs: number;
  inferenceTimeMs: number;
  realTimeFactor: number;
}

export interface AudioLevelEvent {
  rmsLevel: number; // 0 to 100 scale
  peak: number;    // 0.0 to 1.0 amplitude
  isSpeaking: boolean;
}

export type EngineStatus =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'recording'
  | 'processing'
  | 'stopped'
  | 'error';

export interface VoiceRecognitionEngineConfig {
  sampleRate?: number;            // Default: 16000
  chunkSize?: number;             // Default: 2560 (160ms @ 16kHz)
  featureDim?: number;            // Default: 80
  modelPath?: string;             // Path or URL to ONNX weights
  tokensPath?: string;            // Path or URL to tokens.txt
  decodingMethod?: 'greedy_search' | 'modified_beam_search';
  numThreads?: number;            // Default: 1 for WASM
  vadSilenceThreshold?: number;   // RMS threshold under which audio is considered silence
  vadTrailingSilenceMs?: number;  // ms of trailing silence before auto-endpointing
}

export interface VoiceRecognitionCallbacks {
  onToken?: (event: StreamingTokenEvent) => void;
  onPartial?: (result: RecognitionPartialResult) => void;
  onFinal?: (result: RecognitionFinalResult) => void;
  onAudioLevel?: (event: AudioLevelEvent) => void;
  onStatusChange?: (status: EngineStatus) => void;
  onError?: (error: Error) => void;
}
