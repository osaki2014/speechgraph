const cache = new Map();
let tfm = null;
let initChain = Promise.resolve();
let inferChain = Promise.resolve();

function enqueue(chainName, job) {
  if (chainName === 'init') {
    const run = initChain.then(job, job);
    initChain = run.catch(() => {});
    return run;
  }
  const run = inferChain.then(job, job);
  inferChain = run.catch(() => {});
  return run;
}

export async function transformers() {
  if (!tfm) {
    tfm = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
    // Prefer the stable browser default (WASM/CPU). WebGPU can be enabled later as an option.
    try {
      if (tfm.env?.backends?.onnx?.wasm) tfm.env.backends.onnx.wasm.numThreads = 1;
    } catch {}
  }
  return tfm;
}

export async function getPipeline(task, model, options={}) {
  const safeOptions = { ...options };
  delete safeOptions.device; // force stable WASM/CPU for the comparison build
  const key = `${task}:${model}:${JSON.stringify(safeOptions)}`;
  if (cache.has(key)) return { pipe: cache.get(key), initMs: 0, cached: true };

  return enqueue('init', async () => {
    if (cache.has(key)) return { pipe: cache.get(key), initMs: 0, cached: true };
    const t0 = performance.now();
    const { pipeline } = await transformers();
    const pipe = await pipeline(task, model, safeOptions);
    const initMs = performance.now() - t0;
    cache.set(key, pipe);
    return { pipe, initMs, cached: false };
  });
}

// Transformers.js / ONNX Runtime Web does not support truly simultaneous session execution.
// Every transformer inference therefore passes through one shared queue.
export async function runInference(fn) {
  return enqueue('infer', fn);
}

export function clip(v, min=-1, max=1){ return Math.max(min, Math.min(max, v)); }
export function softScore(text, words){
  const s = text.toLowerCase();
  let hit = 0;
  for (const w of words) if (s.includes(w.toLowerCase())) hit++;
  return Math.min(1, hit / Math.max(1, words.length * .35));
}
