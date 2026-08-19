import { getPipeline, softScore, runInference } from '../lib/modelHub.js';

function normalizeLabels(out){
  const rows=Array.isArray(out?.[0])?out[0]:out;
  const map={}; for(const r of rows||[]) map[(r.label||'').toLowerCase()]=r.score;
  return map;
}
export async function smallEmotionAgent(text, model='Xenova/distilbert-base-multilingual-cased-sentiments-student') {
  text=(text||'').trim() || ' ';
  try{
    const { pipe, initMs }=await getPipeline('text-classification',model,{dtype:'q8'});
    const t0=performance.now(); const out=await runInference(() => pipe(text,{top_k:5}));
    const m=normalizeLabels(out); const vals=Object.values(m); const score=vals.length?Math.max(...vals):.5;
    return { value:{arousal:score,label:Object.keys(m).sort((a,b)=>m[b]-m[a])[0]||'unknown'}, initMs, inferMs:performance.now()-t0, model, status:'real' };
  }catch(e){
    const t0=performance.now(); const arousal=softScore(text,['えっ','わあ','すご','びっくり','面白','うれ','楽しい','なぜ','なんで']);
    return {value:{arousal,label:'heuristic'},initMs:0,inferMs:performance.now()-t0,model,status:'fallback',error:String(e)};
  }
}
export async function robertaEmotionAgent(text, model='Xenova/twitter-roberta-base-sentiment-latest') {
  return smallEmotionAgent(text, model);
}
