import { getPipeline } from '../lib/modelHub.js';

export async function embeddingAgent(text, model='Xenova/paraphrase-multilingual-MiniLM-L12-v2') {
  const { pipe, initMs } = await getPipeline('feature-extraction', model, { dtype:'q8' });
  const t0=performance.now();
  const out = await pipe(text, { pooling:'mean', normalize:true });
  const data = Array.from(out.data || []);
  return { value:data, initMs, inferMs:performance.now()-t0, model, status:'real' };
}

export async function semanticAnchorAgent(text, model='Xenova/paraphrase-multilingual-MiniLM-L12-v2') {
  const { pipe, initMs } = await getPipeline('feature-extraction', model, { dtype:'q8' });
  const anchors=['論理 分析 比較 証拠 原因','驚き 感動 喜び 面白い','自分 私 個人的 経験','社会 他者 世界 自然 環境'];
  const t0=performance.now();
  const all=await pipe([text,...anchors],{pooling:'mean',normalize:true});
  const dim=all.dims?.at(-1)||384, arr=Array.from(all.data||[]), rows=[];
  for(let i=0;i<5;i++) rows.push(arr.slice(i*dim,(i+1)*dim));
  const cos=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const x=Math.max(-1,Math.min(1,cos(rows[0],rows[1])-cos(rows[0],rows[2])));
  const y=Math.max(-1,Math.min(1,cos(rows[0],rows[4])-cos(rows[0],rows[3])));
  return { value:{x,y}, initMs, inferMs:performance.now()-t0, model, status:'real' };
}
