import { webSpeechAgent, whisperAgent } from '../agents/speech.js';
import { semanticAnchorAgent, embeddingAgent } from '../agents/embedding.js';
import { smallEmotionAgent, robertaEmotionAgent } from '../agents/emotion.js';
import { inquiryLLMAgent, scienceLLMAgent, gemmaAgent, integrationLLMAgent } from '../agents/llm.js';
import { movementAgent } from '../agents/movement.js';
import { visualizationAgent } from '../agents/visualization.js';

const asNode=(name,r,summary='')=>({name,...r,summary});
const demoSpeech=(text,name='Whisper')=>({value:text||'',initMs:0,inferMs:0,model:`${name} (text fallback)`,status:'fallback'});
async function sharedWhisper(ctx){
  if(!ctx.audio) return demoSpeech(ctx.demoText||ctx.sharedText);
  if(!ctx.whisperPromise){
    ctx.whisperPromise=whisperAgent(ctx.audio).then(r=>{
      if(r.value?.trim()) return r;
      if(ctx.sharedText?.trim()) return {...demoSpeech(ctx.sharedText,'Whisper → Web Speech'), error:'Whisper returned empty transcript'};
      return r;
    }).catch(e=>({...demoSpeech(ctx.sharedText||ctx.demoText,'Whisper → Web Speech'), error:String(e)}));
  }
  return ctx.whisperPromise;
}
const score=(v, fallback=.3)=>Number(v?.score ?? v?.arousal ?? fallback);
const prog=(ctx,mid,node,msg)=>ctx.progress?.(mid,node,msg);

export const METHODS=[
  {
    id:'m1', title:'1. 現在版', subtitle:'Web Speech → Semantic Embedding → 2D Mapping',
    nodes:['Speech Agent','Semantic Agent','Mapping Agent','Visualization Agent'],
    async run(ctx){
      const nodes=[]; prog(ctx,'m1','Speech Agent','Web Speech処理中'); const speech=await webSpeechAgent(ctx.sharedText||ctx.demoText||''); nodes.push(asNode('Speech Agent',speech,speech.value));
      prog(ctx,'m1','Semantic Agent','MiniLM読込/推論待ち'); const semantic=await semanticAnchorAgent(speech.value); nodes.push(asNode('Semantic Agent',semantic,`x=${semantic.value.x.toFixed(2)}, y=${semantic.value.y.toFixed(2)}`));
      const t0=performance.now(); const mapped={value:semantic.value,initMs:0,inferMs:performance.now()-t0,model:'Semantic anchor cosine mapping',status:'real'}; nodes.push(asNode('Mapping Agent',mapped,`(${mapped.value.x.toFixed(2)}, ${mapped.value.y.toFixed(2)})`));
      const vis=await visualizationAgent(mapped.value.x,mapped.value.y); nodes.push(asNode('Visualization Agent',vis,'2D plot'));
      return {text:speech.value, point:vis.value,nodes};
    }
  },
  {
    id:'m2', title:'2. 階層型ハイブリッド', subtitle:'Whisper → MiniLM/E5 → 小型感情Transformer → LLM → 2D',
    nodes:['Speech Agent','Meaning Agent','Emotion Agent','Science Inquiry LLM Agent','Visualization Agent'],
    async run(ctx){
      const nodes=[]; prog(ctx,'m2','Speech Agent','共有Whisper読込/推論中'); const speech=await sharedWhisper(ctx); nodes.push(asNode('Speech Agent',speech,speech.value));
      prog(ctx,'m2','Meaning Agent','MiniLMキュー待ち'); prog(ctx,'m2','Emotion Agent','DistilBERTキュー待ち');
      const [emb,emo]=await Promise.all([embeddingAgent(speech.value),smallEmotionAgent(speech.value)]);
      nodes.push(asNode('Meaning Agent',emb,`${emb.value.length}D embedding`)); nodes.push(asNode('Emotion Agent',emo,`${emo.value.label} / ${score(emo.value).toFixed(2)}`));
      prog(ctx,'m2','Science Inquiry LLM Agent',ctx.llmEndpoint?'LLM endpoint処理中':'endpointなし → fallback'); const science=await scienceLLMAgent(speech.value,ctx.llmEndpoint,'scientific-inquiry'); nodes.push(asNode('Science Inquiry LLM Agent',science,science.value.explanation||`score=${score(science.value).toFixed(2)}`));
      const x=Math.max(-1,Math.min(1,2*score(science.value)-1));
      const y=Math.max(-1,Math.min(1,2*score(emo.value)-1));
      const vis=await visualizationAgent(x,y); nodes.push(asNode('Visualization Agent',vis,'X=探究性 / Y=感情強度'));
      return {text:speech.value,point:vis.value,nodes};
    }
  },
  {
    id:'m3', title:'3. 機能分担マルチエージェント', subtitle:'Whisper + Emotion Transformer + Inquiry LLM + MediaPipe',
    nodes:['Speech Agent','Emotion Agent','Inquiry Agent','Movement Agent','Visualization Agent'],
    async run(ctx){
      const nodes=[]; prog(ctx,'m3','Speech Agent','共有Whisper読込/推論中'); const speech=await sharedWhisper(ctx); nodes.push(asNode('Speech Agent',speech,speech.value));
      prog(ctx,'m3','Emotion Agent','DistilBERTキュー待ち'); prog(ctx,'m3','Inquiry Agent',ctx.llmEndpoint?'LLM endpoint処理中':'endpointなし → fallback'); prog(ctx,'m3','Movement Agent','MediaPipe処理中');
      const [emo,inq,mov]=await Promise.all([smallEmotionAgent(speech.value),inquiryLLMAgent(speech.value,ctx.llmEndpoint),movementAgent(ctx.videoEl)]);
      nodes.push(asNode('Emotion Agent',emo,`${emo.value.label} / ${score(emo.value).toFixed(2)}`)); nodes.push(asNode('Inquiry Agent',inq,`score=${score(inq.value).toFixed(2)}`)); nodes.push(asNode('Movement Agent',mov,`activity=${Number(mov.value.activity||0).toFixed(2)}`));
      const x=Math.max(-1,Math.min(1,2*score(inq.value)-1));
      const y=Math.max(-1,Math.min(1,(score(emo.value)+Number(mov.value.activity||0))-1));
      const vis=await visualizationAgent(x,y); nodes.push(asNode('Visualization Agent',vis,'X=探究性 / Y=感情+身体活動'));
      return {text:speech.value,point:vis.value,nodes};
    }
  },
  {
    id:'m4', title:'4. 異種モデル統合マルチエージェント', subtitle:'Whisper → RoBERTa + GPT + Gemma + BGE/E5 → GPT統合',
    nodes:['Speech Agent','Emotion Agent','Inquiry Agent','Science Concept Agent','Embedding Agent','Integration Agent','Visualization Agent'],
    async run(ctx){
      const nodes=[]; prog(ctx,'m4','Speech Agent','共有Whisper読込/推論中'); const speech=await sharedWhisper(ctx); nodes.push(asNode('Speech Agent',speech,speech.value));
      prog(ctx,'m4','Emotion Agent','RoBERTaキュー待ち'); prog(ctx,'m4','Inquiry Agent',ctx.llmEndpoint?'GPT処理中':'endpointなし → fallback'); prog(ctx,'m4','Science Concept Agent',ctx.gemmaEndpoint?'Gemma処理中':'endpointなし → fallback'); prog(ctx,'m4','Embedding Agent','E5キュー待ち');
      const [emo,inq,sci,emb]=await Promise.all([
        robertaEmotionAgent(speech.value), inquiryLLMAgent(speech.value,ctx.llmEndpoint), gemmaAgent(speech.value,ctx.gemmaEndpoint), embeddingAgent(speech.value,'Xenova/multilingual-e5-small')
      ]);
      nodes.push(asNode('Emotion Agent',emo,`${emo.value.label} / ${score(emo.value).toFixed(2)}`)); nodes.push(asNode('Inquiry Agent',inq,`score=${score(inq.value).toFixed(2)}`)); nodes.push(asNode('Science Concept Agent',sci,`score=${score(sci.value).toFixed(2)}`)); nodes.push(asNode('Embedding Agent',emb,`${emb.value.length}D embedding`));
      prog(ctx,'m4','Integration Agent',ctx.llmEndpoint?'GPT統合処理中':'endpointなし → fallback'); const integrated=await integrationLLMAgent({emotion:emo.value,inquiry:inq.value,science:sci.value,embeddingPreview:emb.value.slice(0,16)},ctx.llmEndpoint); nodes.push(asNode('Integration Agent',integrated,integrated.value.explanation||'integrated'));
      const vis=await visualizationAgent(Number(integrated.value.x||0),Number(integrated.value.y||0)); nodes.push(asNode('Visualization Agent',vis,'LLM integrated 2D'));
      return {text:speech.value,point:vis.value,nodes};
    }
  }
];
