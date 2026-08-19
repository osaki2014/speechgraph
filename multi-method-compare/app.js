import { METHODS } from './methods/methods.js';

const $=s=>document.querySelector(s); const grid=$('#methodGrid'); const tbody=$('#timingTable tbody');
let micStream=null, audioCtx=null, sourceNode=null, processorNode=null, timer=null, recognition=null, sharedText='', chunkNo=0, videoEl=null;
let pcmFrames=[]; let processingChain=Promise.resolve();
const histories=[];

function card(m){return `<article class="method-card" id="${m.id}"><header><span class="label">METHOD ${m.id.slice(1)}</span><h3>${m.title}</h3><p class="hint">${m.subtitle}</p></header><div class="method-body"><div class="node-list">${m.nodes.map(n=>`<div class="node" data-node="${n}"><div class="node-top"><span>${n}</span><span class="time">—</span></div><small class="model">待機中</small></div>`).join('')}</div><div class="method-summary"><div class="metric"><span class="label">TOTAL</span><strong class="total">—</strong></div><div class="metric"><span class="label">OUTPUT</span><div class="out">—</div></div><div class="plot"><span class="axisy">+Y</span><span class="axisx">+X</span><i class="dot"></i></div></div></div></article>`}
grid.innerHTML=METHODS.map(card).join('');

function setRunning(method){
 const el=$(`#${method.id}`); el.querySelector('.total').textContent='処理中…';
 for(const row of el.querySelectorAll('.node')){row.querySelector('.time').textContent='…';row.querySelector('.model').textContent='処理待ち';}
}
function updateCard(method,result,total){
 const el=$(`#${method.id}`); el.querySelector('.total').textContent=`${total.toFixed(0)} ms`; el.querySelector('.out').textContent=`(${result.point.x.toFixed(2)}, ${result.point.y.toFixed(2)})`;
 const dot=el.querySelector('.dot'); dot.style.left=`${50+result.point.x*45}%`; dot.style.top=`${50-result.point.y*45}%`;
 for(const n of result.nodes){const row=[...el.querySelectorAll('.node')].find(x=>x.dataset.node===n.name); if(row){row.querySelector('.time').textContent=`${n.inferMs.toFixed(0)} ms`; row.querySelector('.model').textContent=`${n.model} • ${n.status}${n.initMs?` • init ${n.initMs.toFixed(0)} ms`:''}`;}}
}
function appendRows(method,result,runId){for(const n of result.nodes){const tr=document.createElement('tr'); tr.innerHTML=`<td>${method.title}</td><td>${n.name}</td><td>${n.model}</td><td class="${n.status}">${n.status}</td><td>${n.initMs.toFixed(1)}</td><td>${n.inferMs.toFixed(1)}</td><td>${String(n.summary||'').slice(0,100)}</td>`; tbody.prepend(tr); histories.push({runId,method:method.title,node:n.name,model:n.model,status:n.status,initMs:n.initMs,inferMs:n.inferMs,summary:n.summary||''});}}

function concatFloat32(frames){
 const n=frames.reduce((s,a)=>s+a.length,0); const out=new Float32Array(n); let off=0;
 for(const a of frames){out.set(a,off);off+=a.length;} return out;
}
function downsample(input,srcRate,targetRate=16000){
 if(!input.length || srcRate===targetRate) return input;
 const ratio=srcRate/targetRate; const outLen=Math.max(1,Math.round(input.length/ratio)); const out=new Float32Array(outLen);
 for(let i=0;i<outLen;i++){
   const start=Math.floor(i*ratio), end=Math.min(input.length,Math.floor((i+1)*ratio));
   let sum=0,count=0; for(let j=start;j<end;j++){sum+=input[j];count++;} out[i]=count?sum/count:input[Math.min(start,input.length-1)];
 }
 return out;
}
function takePCM(){
 if(!pcmFrames.length) return null; const frames=pcmFrames; pcmFrames=[];
 const raw=concatFloat32(frames); return downsample(raw,audioCtx?.sampleRate||48000,16000);
}

async function runAll({audio=null,demoText=''}){
 chunkNo++; $('#chunkBadge').textContent=`chunk ${chunkNo}`;
 const ctx={audio,demoText,sharedText:sharedText||demoText,llmEndpoint:$('#llmEndpoint').value.trim(),gemmaEndpoint:$('#gemmaEndpoint').value.trim(),videoEl,whisperPromise:null};
 const runId=`${Date.now()}-${chunkNo}`;
 METHODS.forEach(setRunning);
 const jobs=METHODS.map(async m=>{const t0=performance.now(); try{const result=await m.run(ctx); const total=performance.now()-t0; updateCard(m,result,total); appendRows(m,result,runId); return {m,result,total};}catch(e){console.error(m.id,e); const el=$(`#${m.id}`);el.querySelector('.total').textContent='ERROR';el.querySelector('.out').textContent=String(e).slice(0,100); return null;}});
 const done=await Promise.all(jobs); const texts=done.filter(Boolean).map(x=>x.result.text).filter(Boolean); if(texts.length) $('#inputText').textContent=texts[0];
}
function enqueueRun(payload){ processingChain=processingChain.then(()=>runAll(payload)).catch(e=>console.error('batch failed',e)); }

function startWebSpeech(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
 recognition=new SR();recognition.lang='ja-JP';recognition.continuous=true;recognition.interimResults=true;
 recognition.onresult=e=>{let s='';for(let i=e.resultIndex;i<e.results.length;i++)s+=e.results[i][0].transcript; if(s){sharedText=s;$('#inputText').textContent=s}};
 recognition.onerror=e=>console.warn('Web Speech:',e); recognition.onend=()=>{if(audioCtx?.state==='running')try{recognition.start()}catch{}}; try{recognition.start()}catch{}
}
async function startCamera(){try{const cam=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});videoEl=document.createElement('video');videoEl.srcObject=cam;videoEl.muted=true;videoEl.playsInline=true;await videoEl.play();}catch(e){console.warn('camera unavailable',e)}}
async function startPCM(){
 micStream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
 audioCtx=new AudioContext(); await audioCtx.resume(); sourceNode=audioCtx.createMediaStreamSource(micStream);
 // ScriptProcessor is deliberately used here for broad GitHub Pages/browser compatibility.
 // It gives us raw PCM directly, avoiding MediaRecorder WebM fragment decoding failures.
 processorNode=audioCtx.createScriptProcessor(4096,1,1);
 processorNode.onaudioprocess=e=>{const ch=e.inputBuffer.getChannelData(0);pcmFrames.push(new Float32Array(ch));};
 sourceNode.connect(processorNode); processorNode.connect(audioCtx.destination);
}
async function start(){
 await startPCM(); await startCamera(); startWebSpeech(); const sec=Math.max(2,Number($('#chunkSec').value)||5);
 timer=setInterval(()=>{const audio=takePCM(); if(audio?.length) enqueueRun({audio});},sec*1000);
 $('#startBtn').disabled=true;$('#stopBtn').disabled=false;$('#recordingBadge').textContent='録音中';
}
async function stop(){
 clearInterval(timer);timer=null; const audio=takePCM(); if(audio?.length>1600) enqueueRun({audio});
 try{recognition?.stop()}catch{}; recognition=null;
 if(processorNode){processorNode.onaudioprocess=null;try{processorNode.disconnect()}catch{}} if(sourceNode)try{sourceNode.disconnect()}catch{};
 micStream?.getTracks().forEach(t=>t.stop()); micStream=null; if(audioCtx)try{await audioCtx.close()}catch{}; audioCtx=null;
 if(videoEl?.srcObject)videoEl.srcObject.getTracks().forEach(t=>t.stop());videoEl=null; pcmFrames=[];
 $('#startBtn').disabled=false;$('#stopBtn').disabled=true;$('#recordingBadge').textContent='停止中';
}
$('#startBtn').onclick=()=>start().catch(e=>alert(`マイク開始エラー: ${e.message}`));$('#stopBtn').onclick=()=>stop();
$('#demoBtn').onclick=()=>{const text='えっ、葉っぱは光の方向に向くの？ じゃあ光の位置を変えたら向きも変わるか試してみたい。';sharedText=text;$('#inputText').textContent=text;enqueueRun({demoText:text});};
$('#csvBtn').onclick=()=>{const cols=['runId','method','node','model','status','initMs','inferMs','summary'];const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;const csv='\ufeff'+[cols.join(','),...histories.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='agent-timing-comparison.csv';a.click();URL.revokeObjectURL(a.href);};
