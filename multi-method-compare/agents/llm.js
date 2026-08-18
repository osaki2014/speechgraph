import { softScore } from '../lib/modelHub.js';

async function proxy(endpoint, payload, modelName){
  if(!endpoint) throw new Error('endpoint not configured');
  const t0=performance.now();
  const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const data=await r.json();
  return {data,inferMs:performance.now()-t0,model:modelName,status:'real'};
}
function inquiryFallback(text){
  const question=softScore(text,['なぜ','なんで','どうして','どうなる','？','?']);
  const hypothesis=softScore(text,['たぶん','かもしれ','と思う','予想','もし']);
  const test=softScore(text,['試す','やってみ','確かめ','比べ','実験']);
  return {score:Math.min(1,.45*question+.35*hypothesis+.4*test),question,hypothesis,test,summary:'local heuristic'};
}
export async function inquiryLLMAgent(text, endpoint){
  try{const r=await proxy(endpoint,{role:'inquiry',text,output:'json scores 0..1'},'GPT via secure proxy'); return {value:r.data,initMs:0,inferMs:r.inferMs,model:r.model,status:r.status};}
  catch(e){const t0=performance.now();return{value:inquiryFallback(text),initMs:0,inferMs:performance.now()-t0,model:'GPT via proxy',status:'fallback',error:String(e)}}
}
export async function scienceLLMAgent(text, endpoint, role='science'){
  try{const r=await proxy(endpoint,{role,text,output:'json: score, concepts, explanation'},'GPT via secure proxy');return{value:r.data,initMs:0,inferMs:r.inferMs,model:r.model,status:r.status};}
  catch(e){const t0=performance.now();const score=softScore(text,['なぜ','原因','観察','比較','変化','光','温度','植物','動物','実験']);return{value:{score,concepts:[],explanation:'local heuristic'},initMs:0,inferMs:performance.now()-t0,model:'GPT via proxy',status:'fallback',error:String(e)}}
}
export async function gemmaAgent(text, endpoint){
  try{const r=await proxy(endpoint,{role:'science-concept',text,output:'json: score, concepts'},'Gemma via inference endpoint');return{value:r.data,initMs:0,inferMs:r.inferMs,model:r.model,status:r.status};}
  catch(e){const t0=performance.now();const score=softScore(text,['光','温度','力','運動','植物','動物','水','空気','電気','エネルギー']);return{value:{score,concepts:[],explanation:'local heuristic'},initMs:0,inferMs:performance.now()-t0,model:'Gemma endpoint',status:'fallback',error:String(e)}}
}
export async function integrationLLMAgent(payload, endpoint){
  try{const r=await proxy(endpoint,{role:'integrator',payload,output:'json x,y in -1..1 plus explanation'},'GPT integrator via secure proxy');return{value:r.data,initMs:0,inferMs:r.inferMs,model:r.model,status:r.status};}
  catch(e){const t0=performance.now(); const inquiry=payload.inquiry?.score??.3, emotion=payload.emotion?.arousal??.3, science=payload.science?.score??.3; const x=Math.max(-1,Math.min(1,2*inquiry-1)); const y=Math.max(-1,Math.min(1,(emotion+science)-1));return{value:{x,y,explanation:'deterministic fallback integrator'},initMs:0,inferMs:performance.now()-t0,model:'GPT integrator via proxy',status:'fallback',error:String(e)}}
}
