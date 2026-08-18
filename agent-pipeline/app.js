const $ = (s) => document.querySelector(s);
const states = { speech: $('#speechState'), text: $('#textState'), semantic: $('#semanticState'), map: $('#mapState'), viz: $('#vizState') };
const cards = Object.fromEntries([...document.querySelectorAll('.agent-card')].map(c=>[c.dataset.agent,c]));
const points=[];
let running=false;

function setAgent(name,state){states[name].textContent=state; cards[name].classList.toggle('active',state==='working');}
function setStatus(t){$('#globalStatus').textContent=t;}

class EventBus{ constructor(){this.t=new EventTarget()} on(n,fn){this.t.addEventListener(n,e=>fn(e.detail))} emit(n,d){this.t.dispatchEvent(new CustomEvent(n,{detail:d}))} }
const bus=new EventBus();

class SpeechAgent{
  constructor(bus){this.bus=bus;this.rec=null;this.manualStop=false}
  start(lang){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) throw new Error('SpeechRecognition API がこのブラウザで利用できません。Chrome / Edge / Safari を試してください。');
    this.manualStop=false; this.rec=new SR(); this.rec.lang=lang; this.rec.continuous=true; this.rec.interimResults=true;
    this.rec.onstart=()=>{setAgent('speech','listening');setStatus('音声認識中')};
    this.rec.onresult=(e)=>{
      let interim='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const text=e.results[i][0].transcript.trim();
        if(e.results[i].isFinal) this.bus.emit('speech:final',{text,at:Date.now()}); else interim+=text;
      }
      this.bus.emit('speech:interim',{text:interim});
    };
    this.rec.onerror=(e)=>{setStatus('音声認識エラー: '+e.error)};
    this.rec.onend=()=>{ if(running&&!this.manualStop){try{this.rec.start()}catch{}} else setAgent('speech','idle'); };
    this.rec.start();
  }
  stop(){this.manualStop=true;this.rec?.stop();}
}

class TextAgent{
  constructor(bus){bus.on('speech:interim',d=>$('#interim').textContent=d.text||'…');bus.on('speech:final',d=>this.process(d));}
  process(d){setAgent('text','working'); const text=d.text.replace(/\s+/g,' ').trim(); if(text.length>1) bus.emit('text:ready',{...d,text,id:crypto.randomUUID()}); setAgent('text','idle');}
}

class SemanticAgent{
  constructor(bus){this.bus=bus;this.worker=new Worker('./workers/semantic-worker.js',{type:'module'});this.worker.onmessage=e=>{setAgent('semantic','idle');bus.emit('semantic:ready',e.data)};bus.on('text:ready',d=>this.process(d));}
  process(d){setAgent('semantic','working');this.worker.postMessage(d)}
}

class MappingAgent{
  constructor(bus){this.bus=bus;this.worker=new Worker('./workers/mapping-worker.js',{type:'module'});this.worker.onmessage=e=>{setAgent('map','idle');bus.emit('map:ready',e.data)};bus.on('semantic:ready',d=>this.process(d));}
  process(d){setAgent('map','working');this.worker.postMessage(d)}
}

class VisualizationAgent{
  constructor(bus){bus.on('map:ready',d=>this.render(d));}
  render(d){setAgent('viz','working');points.push(d);const li=document.createElement('li');li.innerHTML=`<b>${escapeHtml(d.text)}</b><br><small>${d.label} / x=${d.x.toFixed(2)}, y=${d.y.toFixed(2)}</small>`;$('#transcriptList').prepend(li);$('#latestText').textContent=d.text;$('#latestX').textContent=d.x.toFixed(2);$('#latestY').textContent=d.y.toFixed(2);$('#latestClass').textContent=d.label;draw();setAgent('viz','idle');}
}

function escapeHtml(s){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function draw(){
  const c=$('#scatter'),ctx=c.getContext('2d'),w=c.width,h=c.height,m=64;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#fcfcfb';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#d5d5d5';ctx.lineWidth=1;
  for(let i=0;i<=10;i++){let x=m+(w-2*m)*i/10,y=m+(h-2*m)*i/10;ctx.beginPath();ctx.moveTo(x,m);ctx.lineTo(x,h-m);ctx.stroke();ctx.beginPath();ctx.moveTo(m,y);ctx.lineTo(w-m,y);ctx.stroke();}
  ctx.strokeStyle='#222';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(m,h/2);ctx.lineTo(w-m,h/2);ctx.stroke();ctx.beginPath();ctx.moveTo(w/2,m);ctx.lineTo(w/2,h-m);ctx.stroke();
  ctx.fillStyle='#555';ctx.font='18px sans-serif';ctx.fillText('分析的',m,36);ctx.fillText('感情的',w-m-56,36);ctx.fillText('社会・外界志向',w/2+10,m-16);ctx.fillText('個人的',w/2+10,h-m+38);
  for(const [i,p] of points.entries()){const x=m+(p.x+1)/2*(w-2*m),y=h-m-(p.y+1)/2*(h-2*m);ctx.beginPath();ctx.fillStyle='#111';ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.font='13px sans-serif';ctx.fillText(String(i+1),x+10,y-8);}
}

draw(); const speech=new SpeechAgent(bus); new TextAgent(bus); new SemanticAgent(bus); new MappingAgent(bus); new VisualizationAgent(bus);
$('#startBtn').onclick=()=>{try{running=true;speech.start($('#langSelect').value);$('#startBtn').disabled=true;$('#stopBtn').disabled=false}catch(e){alert(e.message)}};
$('#stopBtn').onclick=()=>{running=false;speech.stop();$('#startBtn').disabled=false;$('#stopBtn').disabled=true;setStatus('停止')};
$('#clearBtn').onclick=()=>{points.length=0;$('#transcriptList').innerHTML='';$('#interim').textContent='…';$('#latestText').textContent='—';$('#latestX').textContent='—';$('#latestY').textContent='—';$('#latestClass').textContent='—';draw()};
