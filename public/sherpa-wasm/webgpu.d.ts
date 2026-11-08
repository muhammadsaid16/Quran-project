import { t as StreamingBackend } from "./streaming-CJO70wco.js";
import "./tokens-CAkSVa4s.js";
import { WebAssemblyModule } from "@sherpaw/shared";

//#region src/webgpu.d.ts
type Network = 'encoder' | 'decoder';
interface Descriptor {
  name: string;
  type: number;
  dims: number[];
  count: number;
  ptr: number;
}
interface WebGpuModule extends WebAssemblyModule {
  _SherpawSetWebGpuEnabled: (enabled: number) => void;
  runAsr?: (model: Network, inputs: Descriptor[]) => Promise<number>;
  asrError?: string;
}
type WebGpuWeights = Partial<Record<Network, {
  bytes: Uint8Array;
  provider: 'wasm' | 'webgpu';
}>>;
/** Initialize the optional native build produced by scripts/build-asr-runtime.sh. */
declare function initWebGpuASRModule(): Promise<WebGpuModule>;
/**
 * Own ORT sessions and tensor transport; pass this backend to createStreamingRecognizer.
 * Requires a dedicated WebGpuModule. GPU is enabled only during an awaited decode,
 * so native recognizer construction and warmup continue to use Sherpa's CPU sessions.
 */
declare function createWebGpuBackend(bridge: WebGpuModule, weights: WebGpuWeights): Promise<StreamingBackend>;
//#endregion
export { Network, WebGpuModule, WebGpuWeights, createWebGpuBackend, initWebGpuASRModule };