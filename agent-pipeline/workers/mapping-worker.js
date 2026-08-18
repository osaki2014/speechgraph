const xPositive=['思う','考える','理由','なぜ','分析','比較','データ','構造','方法','because','analyze','compare','data','reason'];
const xNegative=['嬉しい','悲しい','好き','嫌い','楽しい','怖い','驚き','感動','feel','happy','sad','love','afraid','excited'];
const yPositive=['社会','世界','地域','学校','他者','みんな','環境','自然','community','society','world','people','environment'];
const yNegative=['私','自分','僕','わたし','経験','気持ち','個人','me','my','myself','personal'];
function lexical(text,pos,neg){let s=0;const t=text.toLowerCase();for(const w of pos)if(t.includes(w.toLowerCase()))s++;for(const w of neg)if(t.includes(w.toLowerCase()))s--;return Math.max(-1,Math.min(1,s/3));}
function embeddingSignal(v,offset){let a=0,b=0;for(let i=offset;i<v.length;i+=4)a+=v[i];for(let i=offset+2;i<v.length;i+=4)b+=v[i];return Math.tanh((a-b)*1.7);}
self.onmessage=(e)=>{const d=e.data;const lx=lexical(d.text,xNegative,xPositive); // negative=analytical, positive=emotional
const ly=lexical(d.text,yPositive,yNegative); // positive=social/world
const ex=embeddingSignal(d.embedding,0), ey=embeddingSignal(d.embedding,1);const x=Math.max(-1,Math.min(1,0.68*lx+0.32*ex));const y=Math.max(-1,Math.min(1,0.68*ly+0.32*ey));
let label=(y>=0?'社会・外界':'個人')+' × '+(x>=0?'感情':'分析');self.postMessage({...d,x,y,label});};
