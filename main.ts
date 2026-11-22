import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
// Independent rooms, optimal push A*, exact reverse-push assignment bound.
export function solve(text) {
 const rows=text.trimEnd().split('\n'), w=rows[0].length, board=rows.join(''), step=[-w,w,-1,1], letters='udlr';
 let player=board.search(/[@+]/), hall=Math.floor(player/w), answer='';
 const floor=p=>p>=0&&p<board.length&&board[p]!='#';
 let boxes=new Set([...board].flatMap((c,i)=>'$*'.includes(c)?[i]:[]));
 const used=new Set();
 function walk(from,to) {
  const q=[from], prev=new Map([[from,null]]);
  for(let k=0;k<q.length&&!prev.has(to);k++) for(let d=0;d<4;d++) {
   const n=q[k]+step[d]; if(floor(n)&&!boxes.has(n)&&!prev.has(n)){prev.set(n,[q[k],d]);q.push(n);}
  }
  if(!prev.has(to))throw Error('unreachable walk');
  let s=''; for(let p=to;p!=from;){const [v,d]=prev.get(p);s=letters[d]+s;p=v;} return s;
 }
 for(let seed=0;seed<board.length;seed++) {
  if(!floor(seed)||Math.floor(seed/w)==hall||used.has(seed))continue;
  const room=[seed];used.add(seed);
  for(let k=0;k<room.length;k++)for(const d of step){let p=room[k]+d;if(floor(p)&&Math.floor(p/w)!=hall&&!used.has(p)){used.add(p);room.push(p);}}
  if(!room.some(p=>boxes.has(p)))continue;
  const cells=room.concat([...Array(w).keys()].map(x=>hall*w+x).filter(floor)).sort((a,b)=>a-b), n=cells.length;
  const idx=new Map(cells.map((p,i)=>[p,i])), adj=cells.map(p=>step.map(d=>idx.get(p+d)??-1));
  const goals=cells.flatMap((p,i)=>'.*+'.includes(board[p])?[i]:[]), initial=cells.flatMap((p,i)=>boxes.has(p)?[i]:[]);
  const dist=goals.map(g=>{const a=Array(n).fill(999),q=[g];a[g]=0;for(let k=0;k<q.length;k++)for(let d=0;d<4;d++){let b=adj[q[k]][d], c=b<0?-1:adj[b][d];if(c>=0&&a[b]==999){a[b]=a[q[k]]+1;q.push(b);}}return a;});
  const goalSet=new Set(goals), live=cells.map((_,i)=>dist.some(a=>a[i]<999));
  function bound(bs){let best=999;function rec(i,mask,sum){if(sum>=best)return;if(i==bs.length){best=sum;return;}for(let g=0;g<goals.length;g++)if(!(mask>>g&1))rec(i+1,mask|1<<g,sum+dist[g][bs[i]]);}rec(0,0,0);return best;}
  function reach(bs,p){const occupied=new Set(bs),seen=new Uint8Array(n),q=[p];seen[p]=1;let min=p;for(let k=0;k<q.length;k++)for(const v of adj[q[k]])if(v>=0&&!seen[v]&&!occupied.has(v)){seen[v]=1;q.push(v);if(v<min)min=v;}return [seen,min];}
  const key=(bs,p)=>bs.reduce((k,b)=>k*64+b,p);
  const heap=[];let serial=0;
  const less=(a,b)=>a.f<b.f||a.f==b.f&&(a.g>b.g||a.g==b.g&&a.id<b.id);
  function push(a){a.id=serial++;let i=heap.length;heap.push(a);while(i){let p=(i-1)>>1;if(!less(a,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=a;}
  function pop(){const top=heap[0],a=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&less(heap[c+1],heap[c]))c++;if(!less(heap[c],a))break;heap[i]=heap[c];i=c;}heap[i]=a;}return top;}
  const [,r]=reach(initial,idx.get(player)), start={bs:initial,p:r,g:0,f:bound(initial),prev:null};
  const best=new Map([[key(initial,r),0]]);push(start);let end=null, expanded=0;
  while(heap.length){const s=pop();if(best.get(key(s.bs,s.p))!=s.g)continue;if(s.bs.every(b=>goalSet.has(b))){end=s;break;}if(++expanded>1500000)throw Error('search limit');
   const [seen]=reach(s.bs,s.p), occupied=new Set(s.bs);
   for(let i=0;i<s.bs.length;i++)for(let d=0;d<4;d++){const b=s.bs[i],to=adj[b][d],back=adj[b][d^1];if(back<0||!seen[back]||to<0||occupied.has(to)||!live[to])continue;
    const bs=s.bs.slice();bs[i]=to;bs.sort((a,b)=>a-b);const [,p]=reach(bs,b), k=key(bs,p),g=s.g+1;if((best.get(k)??Infinity)<=g)continue;const h=bound(bs);if(h>=999)continue;
    best.set(k,g);push({bs,p,g,f:g+h,prev:s,move:[cells[b],d]});
   }
  }
  if(!end)throw Error('unsolved room');const moves=[];for(let s=end;s.prev;s=s.prev)moves.push(s.move);
  for(const [b,d] of moves.reverse()){answer+=walk(player,b-step[d])+letters[d];boxes.delete(b);boxes.add(b+step[d]);player=b;}
  const home=board.search(/[@+]/);answer+=walk(player,home);player=home;
 }
 return answer;
}
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(I).sort()){const moves=solve(readFileSync(`${I}/${id}/level.txt`,'utf8'));mkdirSync(`${O}/${id}`,{recursive:true});writeFileSync(`${O}/${id}/solution.txt`,moves+'\n');}
