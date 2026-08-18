import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.3';
env.allowLocalModels = false;
let extractor;
async function getExtractor(){
  if(!extractor) extractor = await pipeline('feature-extraction','Xenova/paraphrase-multilingual-MiniLM-L12-v2',{dtype:'q8'});
  return extractor;
}
self.onmessage=async(e)=>{
  const d=e.data;
  try{
    const model=await getExtractor();
    const out=await model(d.text,{pooling:'mean',normalize:true});
    const embedding=Array.from(out.data);
    self.postMessage({...d,embedding,mode:'transformer'});
  }catch(err){
    // Offline/model-load fallback: deterministic hash features so the pipeline keeps working.
    const v=new Array(64).fill(0); for(let i=0;i<d.text.length;i++) v[(d.text.charCodeAt(i)+i*17)%64]+=1;
    const n=Math.hypot(...v)||1; self.postMessage({...d,embedding:v.map(x=>x/n),mode:'fallback'});
  }
};
