/**
 * The recognition engine is expensive: the Zipformer weights are ~70 MB and
 * the sherpa-onnx WASM runtime allocates its own session. Every component that
 * needs the microphone must share ONE instance — the HUD, the page spotter,
 * and anything added later.
 *
 * The instance is intentionally kept alive after a session ends so the next
 * microphone press does not pay the model-load cost again. Only one consumer
 * may record at a time; callers guard on `getStatus()` / the recitation store
 * before calling `startRecording`.
 */

import { VoiceRecognitionEngine } from './voice-recognition-engine';

let sharedEngine: VoiceRecognitionEngine | null = null;

export function getSharedRecognitionEngine(): VoiceRecognitionEngine {
  if (!sharedEngine) {
    sharedEngine = new VoiceRecognitionEngine({
      modelPath: '/models/zipformer_p_arabic_v3.2.int8.onnx',
      tokensPath: '/models/tokens.txt',
    });
  }
  return sharedEngine;
}

/** Frees the shared model. Only for tests or a hard reset. */
export function disposeSharedRecognitionEngine(): void {
  if (sharedEngine) {
    sharedEngine.dispose();
    sharedEngine = null;
  }
}