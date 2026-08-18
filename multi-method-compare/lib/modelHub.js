const cache = new Map();
let tfm = null;

export async function transformers() {
  if (!tfm) tfm = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
  return tfm;
}

export async function getPipeline(task, model, options={}) {
  const key = `${task}:${model}:${JSON.stringify(options)}`;
  if (cache.has(key)) return { pipe: cache.get(key), initMs: 0, cached: true };
  const t0 = performance.now();
  const { pipeline } = await transformers();
  const pipe = await pipeline(task, model, options);
  const initMs = performance.now() - t0;
  cache.set(key, pipe);
  return { pipe, initMs, cached: false };
}

export function clip(v, min=-1, max=1){ return Math.max(min, Math.min(max, v)); }
export function softScore(text, words){
  const s = text.toLowerCase();
  let hit = 0;
  for (const w of words) if (s.includes(w.toLowerCase())) hit++;
  return Math.min(1, hit / Math.max(1, words.length * .35));
}
