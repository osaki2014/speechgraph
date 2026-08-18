import { METHODS } from './methods/methods.js';

const $=s=>document.querySelector(s); const grid=$('#methodGrid'); const tbody=$('#timingTable tbody');
let mediaRecorder=null, stream=null, timer=null, recognition=null, sharedText='', chunkNo=0, videoEl=null;
const histories=[];

function card(m){return `<article class="method-card" id="${m.id}"><header><span class="label">METHOD ${m.id.slice(1)}</span><h3>${m.title}</h3><p class="hint">${m.subtitle}</p></header><div class="method-body"><div class="node-list">${m.nodes.map(n=>`<div class="node" data-node="${n}"><div class="node-top"><span>${n}</span><span class="time">—</span></div><small class="model">待機中</small></div>`).join('')}</div><div class="method-summary"><div class="metric"><span class="label">TOTAL</span><strong class="total">—</strong></div><div class="metric"><span class="label">OUTPUT</span><div class="out">—</div></div><div class="plot"><span class="axisy">+Y</span><span class="axisx">+X</span><i class="dot"></i></div></div></div></article>`}
grid.innerHTML=METHODS.map(card).join('');

function updateCard(method,result,total){
 const el=$(`#${method.id}`); el.querySelector('.total').textContent=`${total.toFixed(0)} ms`; el.querySelector('.out').textContent=`(${result.point.x.toFixed(2)}, ${result.point.y.toFixed(2)})`;
 const dot=el.querySelector('.dot'); dot.style.left=`${50+result.point.x*45}%`; dot.style.top=`${50-result.point.y*45}%`;
 for(const n of result.nodes){const row=[...el.querySelectorAll('.node')].find(x=>x.dataset.node===n.name); if(row){row.querySelector('.time').textContent=`${n.inferMs.toFixed(0)} ms`; row.querySelector('.model').textContent=`${n.model} • ${n.status}${n.initMs?` • init ${n.initMs.toFixed(0)} ms`:''}`;}}
}
function appendRows(method,result,runId){for(const n of result.nodes){const tr=document.createElement('tr'); tr.innerHTML=`<td>${method.title}</td><td>${n.name}</td><td>${n.model}</td><td class="${n.status}">${n.status}</td><td>${n.initMs.toFixed(1)}</td><td>${n.inferMs.toFixed(1)}</td><td>${String(n.summary||'').slice(0,100)}</td>`; tbody.prepend(tr); histories.push({runId,method:method.title,node:n.name,model:n.model,status:n.status,initMs:n.initMs,inferMs:n.inferMs,summary:n.summary||''});}}

async function decodeBlob(blob){const ab=await blob.arrayBuffer(); const ctx=new AudioContext({sampleRate:16000}); const audio=await ctx.decodeAudioData(ab.slice(0)); let data=audio.getChannelData(0); if(audio.numberOfChannels>1){data=Float32Array.from(data,(v,i)=>(v+audio.getChannelData(1)[i])/2)} await ctx.close(); return data;}
async function runAll({blob=null,demoText=''}){
 chunkNo++; $('#chunkBadge').textContent=`chunk ${chunkNo}`; let audio=null; if(blob){try{audio=await decodeBlob(blob)}catch(e){console.warn('audio decode failed',e)}}
 const ctx={audio,demoText,sharedText:sharedText||demoText,llmEndpoint:$('#llmEndpoint').value.trim(),gemmaEndpoint:$('#gemmaEndpoint').value.trim(),videoEl};
 const runId=`${Date.now()}-${chunkNo}`;
 const jobs=METHODS.map(async m=>{const t0=performance.now(); try{const result=await m.run(ctx); const total=performance.now()-t0; updateCard(m,result,total); appendRows(m,result,runId); return {m,result,total};}catch(e){console.error(m.id,e); const el=$(`#${m.id}`);el.querySelector('.total').textContent='ERROR';el.querySelector('.out').textContent=String(e).slice(0,80);}});
 const done=await Promise.all(jobs); const texts=done.filter(Boolean).map(x=>x.result.text).filter(Boolean); if(texts.length) $('#inputText').textContent=texts[0];
}

function startWebSpeech(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return; recognition=new SR();recognition.lang='ja-JP';recognition.continuous=true;recognition.interimResults=true;recognition.onresult=e=>{let s='';for(let i=e.resultIndex;i<e.results.length;i++)s+=e.results[i][0].transcript; if(s){sharedText=s;$('#inputText').textContent=s}};recognition.onerror=e=>console.warn(e);recognition.onend=()=>{if(mediaRecorder?.state==='recording')try{recognition.start()}catch{}};try{recognition.start()}catch{}}
async function startCamera(){try{const cam=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});videoEl=document.createElement('video');videoEl.srcObject=cam;videoEl.muted=true;videoEl.playsInline=true;await videoEl.play();}catch(e){console.warn('camera unavailable',e)}}
async function start(){stream=await navigator.mediaDevices.getUserMedia({audio:true}); await startCamera(); startWebSpeech(); const sec=Math.max(2,Number($('#chunkSec').value)||5); let chunks=[];mediaRecorder=new MediaRecorder(stream);mediaRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};mediaRecorder.onstop=()=>{};mediaRecorder.start(); timer=setInterval(async()=>{if(mediaRecorder.state!=='recording')return; mediaRecorder.requestData(); await new Promise(r=>setTimeout(r,120)); if(chunks.length){const blob=new Blob(chunks,{type:mediaRecorder.mimeType});chunks=[];runAll({blob});}},sec*1000);$('#startBtn').disabled=true;$('#stopBtn').disabled=false;$('#recordingBadge').textContent='録音中';}
function stop(){clearInterval(timer);timer=null;if(mediaRecorder?.state==='recording')mediaRecorder.stop();stream?.getTracks().forEach(t=>t.stop());if(videoEl?.srcObject)videoEl.srcObject.getTracks().forEach(t=>t.stop());try{recognition?.stop()}catch{};$('#startBtn').disabled=false;$('#stopBtn').disabled=true;$('#recordingBadge').textContent='停止中';}
$('#startBtn').onclick=()=>start().catch(e=>alert(`マイク開始エラー: ${e.message}`));$('#stopBtn').onclick=stop;$('#demoBtn').onclick=()=>{const text='えっ、葉っぱは光の方向に向くの？ じゃあ光の位置を変えたら向きも変わるか試してみたい。';sharedText=text;$('#inputText').textContent=text;runAll({demoText:text});};
$('#csvBtn').onclick=()=>{const cols=['runId','method','node','model','status','initMs','inferMs','summary'];const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;const csv='\ufeff'+[cols.join(','),...histories.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='agent-timing-comparison.csv';a.click();URL.revokeObjectURL(a.href);};
