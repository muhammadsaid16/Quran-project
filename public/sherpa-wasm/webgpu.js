import * as ort from "onnxruntime-web/webgpu";

//#region src/webgpu.ts
/** Initialize the optional native build produced by scripts/build-asr-runtime.sh. */
async function initWebGpuASRModule() {
	const { default: init } = await import(new URL("./prebuilt/asr-webgpu.js", import.meta.url).href);
	const wasmUrl = new URL("./prebuilt/asr-webgpu.wasm", import.meta.url).href;
	return init({ locateFile: () => wasmUrl });
}
/**
* Own ORT sessions and tensor transport; pass this backend to createStreamingRecognizer.
* Requires a dedicated WebGpuModule. GPU is enabled only during an awaited decode,
* so native recognizer construction and warmup continue to use Sherpa's CPU sessions.
*/
async function createWebGpuBackend(bridge, weights) {
	const adapter = await navigator.gpu?.requestAdapter();
	if (!adapter || adapter.info.isFallbackAdapter) throw new Error("Hardware WebGPU is unavailable in this browser");
	ort.env.wasm.numThreads = 1;
	ort.env.wasm.wasmPaths = {
		mjs: new URL("./prebuilt/ort-wasm-simd-threaded.asyncify.mjs", import.meta.url).href,
		wasm: new URL("./prebuilt/ort-wasm-simd-threaded.asyncify.wasm", import.meta.url).href
	};
	const sessions = {};
	let disposed = false;
	async function dispose() {
		if (disposed) return;
		disposed = true;
		bridge._SherpawSetWebGpuEnabled(0);
		delete bridge.runAsr;
		await Promise.all(Object.values(sessions).map((session) => session.release()));
	}
	try {
		for (const [name, model] of Object.entries(weights)) sessions[name] = await ort.InferenceSession.create(model.bytes, { executionProviders: [model.provider] });
		if ((await ort.env.webgpu.device).adapterInfo.isFallbackAdapter) throw new Error("ONNX Runtime selected a software GPU adapter");
		installAsrRunner(bridge, sessions);
		return {
			async decode(recognizer, stream) {
				bridge.asrError = void 0;
				bridge._SherpawSetWebGpuEnabled(1);
				try {
					await bridge.ccall("SherpaOnnxDecodeOnlineStream", null, ["number", "number"], [recognizer.handle, stream.handle], { async: true });
					if (bridge.asrError) throw new Error(bridge.asrError);
				} finally {
					bridge._SherpawSetWebGpuEnabled(0);
				}
			},
			dispose
		};
	} catch (error) {
		await dispose();
		throw error;
	}
}
/** Connect the Sherpa session boundary to browser inference, preserving tensor ownership. */
function installAsrRunner(bridge, sessions) {
	/** Triggering workflow: C++ AsrWebRun -> async session.run -> tensors copied into Sherpa heap -> C++ decoding resumes. */
	bridge.runAsr = async (model, descriptors) => {
		const inputs = {};
		const allocations = [];
		let outputs;
		try {
			for (const input of descriptors) {
				const bytes = bridge.HEAPU8.slice(input.ptr, input.ptr + input.count * (input.type === 7 ? 8 : 4));
				if (input.type === 1) inputs[input.name] = new ort.Tensor("float32", new Float32Array(bytes.buffer), input.dims);
				else if (input.type === 6) inputs[input.name] = new ort.Tensor("int32", new Int32Array(bytes.buffer), input.dims);
				else if (input.type === 7) inputs[input.name] = new ort.Tensor("int64", new BigInt64Array(bytes.buffer), input.dims);
				else throw new Error(`Unsupported ASR input type ${input.type}`);
			}
			const session = sessions[model];
			outputs = await session.run(inputs);
			const result = [];
			for (const name of session.outputNames) {
				const tensor = outputs[name];
				const data = await tensor.getData();
				if (tensor.type !== "float32" && tensor.type !== "int32" && tensor.type !== "int64") throw new Error(`Unsupported ASR output type ${tensor.type}`);
				const array = data;
				const ptr$1 = bridge._malloc(array.byteLength) >>> 0;
				if (!ptr$1) throw new Error("Not enough WASM memory for an inference output");
				allocations.push(ptr$1);
				bridge.HEAPU8.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), ptr$1);
				result.push({
					type: tensor.type === "float32" ? 1 : tensor.type === "int32" ? 6 : 7,
					dims: tensor.dims,
					ptr: ptr$1
				});
			}
			const json = JSON.stringify(result);
			const size = bridge.lengthBytesUTF8(json) + 1;
			const ptr = bridge._malloc(size) >>> 0;
			if (!ptr) throw new Error("Not enough WASM memory for output descriptors");
			allocations.push(ptr);
			bridge.stringToUTF8(json, ptr, size);
			allocations.length = 0;
			return ptr;
		} finally {
			for (const ptr of allocations) bridge._free(ptr);
			for (const tensor of Object.values(inputs)) tensor.dispose();
			if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose();
		}
	};
}

//#endregion
export { createWebGpuBackend, initWebGpuASRModule };