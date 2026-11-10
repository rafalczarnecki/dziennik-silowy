// Test kolizji animacji: ciało ze sprzętem i części ciała ze sobą, w każdej klatce ustawiania i ruchu (także między klatkami).
// Użycie: node tests/collide.js            porównanie z tests/collide-baseline.json (kod wyjścia 1 przy pogorszeniu)
//         node tests/collide.js --update   zapisanie nowego stanu jako wzorca
//         node tests/collide.js klucz -v   szczegóły jednego ćwiczenia
const fs=require('fs'),vm=require('vm'),path=require('path');
const HTML=fs.readFileSync(path.join(__dirname,'..','src','dziennik-silowy.html'),'utf8');
// kod animacji wycinany wprost z aplikacji: testujemy to, co trafia na telefon
const i0=HTML.indexOf('// ---------- animacje ruchu'), i1=HTML.indexOf('\nlet swapOpen=null;');
if(i0<0||i1<0)throw new Error('Nie znaleziono sekcji animacji w pliku aplikacji');
const code=HTML.slice(i0,i1);
const ctx={window:{},console,Math,Object,Array,Set,JSON,Number,String,RegExp,G:{},S:{},patOf:()=>null,esc:x=>x,matchMedia:()=>({matches:false})};
vm.createContext(ctx);vm.runInContext(code+'\nthis.X={animChain,ANIMSUB,barAt,bodyCaps,propGeom,BARW,PLZ,ANIM,animPoses,setupStates,interpJ,interpPose,v3,sub3,dot3,len3,nrm3,mid3,PLATE,cross3,anatFrames,anatPt,MUSC,BONES,gripOf,NAMEANIM,PATANIM,ANIMALT,spineF};',ctx);
const X=ctx.X;const {v3,sub3,dot3,len3,nrm3,mid3}=X;
const FLOOR=-3;
function segSeg(p1,q1,p2,q2){const d1=sub3(q1,p1),d2=sub3(q2,p2),r=sub3(p1,p2),a=dot3(d1,d1),e=dot3(d2,d2),f=dot3(d2,r);let s,t;
  if(a<1e-9&&e<1e-9){s=0;t=0}
  else if(a<1e-9){s=0;t=Math.min(1,Math.max(0,f/e))}else{const c=dot3(d1,r);if(e<1e-9){t=0;s=Math.min(1,Math.max(0,-c/a))}else{const b=dot3(d1,d2),den=a*e-b*b;
    s=den>1e-9?Math.min(1,Math.max(0,(b*f-c*e)/den)):0;t=(b*s+f)/e;if(t<0){t=0;s=Math.min(1,Math.max(0,-c/a))}else if(t>1){t=1;s=Math.min(1,Math.max(0,(b-c)/a))}}}
  const c1=v3(p1,d1,s),c2=v3(p2,d2,t);return [len3(sub3(c1,c2)),s,t,c1,c2]}
// etykieta części ciała dla punktu z opisu anatomicznego
function lab(sp,X){const k=sp[0];
  if(k==='T'){const u=sp[1];return u<5?'pel':u<12?'lum':u<=25.5?'tho':'neck'}
  if(k==='H')return 'head';
  if(k==='S'||k==='clav')return 'gird'+X;
  if(k==='hum')return (sp[1]<.5?'humP':'humD')+X;
  if(k==='fa'||k==='rad'||k==='tub'||k==='tubA')return 'fa'+X;
  if(k==='hand')return 'hand'+X;
  if(k==='fem')return (sp[1]<.5?'femP':'femD')+X;
  if(k==='tib')return 'tib'+X;
  if(k==='heel'||k==='ball'||k==='ft')return 'foot'+X;
  if(k==='KW')return 'knee'+X; if(k==='EW')return 'elb'+X; if(k==='HW')return 'hip'+X;
  return '?'}
const ADJL=[['pel','lum'],['lum','tho'],['tho','neck'],['neck','head'],['pel','tho']];
['L','R'].forEach(X=>ADJL.push(['tho','gird'+X],['neck','gird'+X],['head','gird'+X],['gird'+X,'humP'+X],['tho','humP'+X],['humP'+X,'humD'+X],['humD'+X,'elb'+X],['elb'+X,'fa'+X],['humD'+X,'fa'+X],['fa'+X,'hand'+X],
  ['pel','hip'+X],['pel','femP'+X],['lum','femP'+X],['hip'+X,'femP'+X],['femP'+X,'femD'+X],['femD'+X,'knee'+X],['knee'+X,'tib'+X],['femD'+X,'tib'+X],['tib'+X,'foot'+X],['lum','gird'+X]));
ADJL.push(['tho','head'],['pel','femPL'],['pel','femPR'],['femPL','femPR']); // wnętrze ud przy kroczu
const ADJ=new Set(ADJL.flatMap(([a,b])=>[a+'|'+b,b+'|'+a]));
const near=(A,B)=>A.some(a=>B.some(b=>a===b||ADJ.has(a+'|'+b)));
function bodyGeom(J,name,key,f){const a=X.ANIM[key],gr=X.gripOf(name);const r=X.bodyCaps(J,a.sup,gr[0]+(gr[1]-gr[0])*f);r.G.forEach(g=>{g.c=mid3(g.p,g.q);g.R=len3(sub3(g.p,g.q))/2+Math.max(g.r0,g.r1)});return r}
const PART={pel:'miednica',lum:'brzuch/lędźwie',tho:'klatka',neck:'szyja',head:'głowa',gird:'obręcz barkowa',humP:'ramię',humD:'ramię',elb:'łokieć',fa:'przedramię',hand:'dłoń',hip:'biodro',femP:'udo',femD:'udo',knee:'kolano',tib:'goleń',foot:'stopa'};
const pl=L=>{const b=L.replace(/[LR]$/,''),s=L.slice(-1);return (PART[b]||b)+(s==='L'?' L':s==='R'?' P':'')};
function capDist(A,B){const [d,s,t]=segSeg(A.p,A.q,B.p,B.q);return [d,A.r0+(A.r1-A.r0)*s,B.r0+(B.r1-B.r0)*t]}
function objects(J,P0,free,a,name,F,key,f){const O=[];
  let pr=(a.pr||[]).filter(x=>x[0]!=='slab'&&x[0]!=='plat');
  if(/hantl/i.test(name))pr=pr.map(x=>x[0]==='bar'?['db',x[1],x[2]]:x);
  if(/wyciąg|maszyn|Hammer|Hack|Wypychanie/i.test(name))pr=pr.filter(x=>x[0]!=='bar');
  pr.forEach(([k,j,o])=>{const PJ=free&&/^wr/.test(j||'')?P0:J;const hand=/^wr/.test(j||'');
    if(k==='bar'||k==='hbar'){const c=X.barAt(PJ,j,o),w=k==='bar'?X.BARW:22;O.push({n:'gryf',p:v3(c,[0,0,-w]),q:v3(c,[0,0,w]),r:.8,hand,on:j});
      if(k==='bar')[-1,1].forEach(sg=>O.push({n:'talerz',disk:1,c:v3(c,[0,0,sg*(X.PLZ[0]+X.PLZ[1])/2]),ax:[0,0,1],R:X.PLATE,h:(X.PLZ[1]-X.PLZ[0])/2+1.6}))}
    if(k==='db'||(k==='db1'&&key!=='chop')||k==='hex'){X.propGeom(k,PJ,a,name,f,key,j).forEach(g=>{
      if(g.r)O.push({n:k==='hex'?'trap bar':'hantel',p:g.p,q:g.p,r:g.r,hand:k!=='hex',side:g.X});
      else if(k==='hex'&&g.w===3.2)O.push({n:'talerz',p:g.p,q:g.q,r:1.6});
      else O.push({n:k==='hex'?'trap bar':'hantel',p:g.p,q:g.q,r:g.w/2,hand:1,side:g.X,handle:k==='hex'&&g.w===1.4})})}
    if(k==='pad'){const c=v3(PJ[j],o||[0,0,0]);O.push({n:'wałek',p:v3(c,[0,0,-10]),q:v3(c,[0,0,10]),r:3.2,soft:1})}
    if(k==='wheel'){const c=v3(PJ[j],o||[0,0,0]);O.push({n:'kółko',disk:1,c,ax:[0,0,1],R:5,h:2,hand:1})}
  });
  (a.st||[]).forEach(e=>{if(e[0]==='box')O.push({n:'sprzęt',box:e.slice(1)});if(e[0]==='line')O.push({n:'drążek',p:e[1],q:e[2],r:(e[3]||2.5)/2.5,hand:1})});
  return O}
const cross3=X.cross3;
function boxDist(p,b){const [x0,x1,y0,y1,z0,z1]=b;const dx=Math.max(x0-p[0],0,p[0]-x1),dy=Math.max(y0-p[1],0,p[1]-y1),dz=Math.max(z0-p[2],0,p[2]-z1);
  const out=Math.hypot(dx,dy,dz);if(out>0)return out;return -Math.min(p[0]-x0,x1-p[0],p[1]-y0,y1-p[1],p[2]-z0,z1-p[2])}
function check(J,name,key,f,P0,TOLB,TOLE,LP){const a=X.ANIM[key];const {G,F}=bodyGeom(J,name,key,f);const out=[];
  // ciało z ciałem
  for(let i=0;i<G.length;i++)for(let k=i+1;k<G.length;k++){const A=G[i],B=G[k];if(A.id===B.id&&A.side===B.side)continue;
    if(len3(sub3(A.c,B.c))>A.R+B.R)continue;if(near(A.L,B.L))continue;
    const [d,ra,rb]=capDist(A,B);const pen=ra+rb-d;const hnd=[...A.L,...B.L].some(l=>/^hand/.test(l)),tol=hnd?1.6:(A.kind==='b'||B.kind==='b')?TOLB*.6:TOLB;if(pen>tol)out.push([pen,pl(A.L[0])+' ('+A.id+')',pl(B.L[0])+' ('+B.id+')'])}
  // ciało ze sprzętem
  let O;if(LP){const [Pa,Pb,t]=LP,fa=LP[3],fb=LP[4],Oa=objects(Pa,P0,Pa._free,a,name,bodyGeom(Pa,name,key,fa).F,key,fa),Ob=objects(Pb,P0,Pb._free,a,name,bodyGeom(Pb,name,key,fb).F,key,fb);
    const L=(x,y)=>Array.isArray(x)?x.map((v,i)=>v+(y[i]-v)*t):x;O=Oa.map((o,i)=>{const b=Ob[i]||o,r={};Object.keys(o).forEach(k=>r[k]=(k==='p'||k==='q'||k==='c')?L(o[k],b[k]):o[k]);return r})}
  else O=objects(J,P0,J._free,a,name,F,key,f);
  O.forEach(o=>G.forEach(g=>{
    if(o.hand&&g.L.some(l=>/^(hand|fa)/.test(l))&&(!o.side||g.side===o.side))return;
    if(o.n==='gryf'&&g.L.some(l=>/^(hand|fa)/.test(l)))return; // dłonie trzymają gryf
    if(o.n==='trap bar'&&!o.handle&&g.L.some(l=>/^(hand)/.test(l)))return;
    if(o.on&&!/^wr/.test(o.on)){// sztanga na barkach / biodrach: dopuszczalny docisk do tkanek
      if(o.on==='sh'&&g.L.some(l=>/^(tho|neck|gird|humP|head)/.test(l)))return; if(o.on==='hp'&&g.L.some(l=>/^(pel|femP|lum)/.test(l)))return;}
    let pen;
    if(o.box){let w=-1e9;for(let i=0;i<=6;i++){const t=i/6,p=v3(g.p,sub3(g.q,g.p),t),r=g.r0+(g.r1-g.r0)*t;w=Math.max(w,r-boxDist(p,o.box))}pen=w}
    else if(o.disk){let w=-1e9;for(let i=0;i<=6;i++){const t=i/6,p=v3(g.p,sub3(g.q,g.p),t),r=g.r0+(g.r1-g.r0)*t,v=sub3(p,o.c),h=Math.abs(dot3(v,o.ax)),rad=len3(v3(v,o.ax,-dot3(v,o.ax)));w=Math.max(w,Math.min(o.h+r-h,o.R+r-rad))}pen=w}
    else{const [d,s,t]=segSeg(o.p,o.q,g.p,g.q);pen=o.r+g.r0+(g.r1-g.r0)*t-d}
    const tol=o.soft||o.box?TOLE+1.4:TOLE;
    if(pen>tol)out.push([pen,o.n,pl(g.L[0])+' ('+g.id+')'])}));
  // podłoga
  if(!a.nf){G.forEach(g=>{const y=Math.min(g.p[1]-g.r0,g.q[1]-g.r1);if(y<FLOOR-TOLE)out.push([FLOOR-y,'podłoga',pl(g.L[0])+' ('+g.id+')'])});
    O.filter(o=>o.disk&&o.n==='talerz').forEach(o=>{const y=o.c[1]-o.R;if(y<FLOOR-.5)out.push([FLOOR-y,'podłoga','talerz'])})}
  return out}
function nameOf(key){if(key==='curl')return 'Uginanie ramion z hantlami';const n=Object.entries(X.NAMEANIM).find(([n,k])=>k===key);if(n)return n[0];const alt=Object.entries(X.ANIMALT).find(([n,l])=>l.some(x=>x[0]===key));return alt?alt[0]:key}
function lerpJ(A,B,t){const J={};Object.keys(A).forEach(k=>{const a=A[k],b=B[k];J[k]=Array.isArray(a)&&a.length===3&&Array.isArray(b)?[0,1,2].map(i=>a[i]+(b[i]-a[i])*t):(t<.5?a:b)});return J}
const cpl=c=>c.toFixed(2);
function frames(key){const [A]=X.animPoses(key);const SPL=X.animChain(key,6);
  const fr=[];SPL.forEach((s,i)=>{fr.push({P:s.P,f:s.f,lab:cpl(s.cp),cp:s.cp});const n=SPL[i+1];if(!n)return;[.25,.5,.75].forEach(t=>fr.push({P:lerpJ(s.P,n.P,t),f:s.f+(n.f-s.f)*t,lab:cpl(s.cp)+"→"+cpl(n.cp)+' '+t,LP:[s.P,n.P,t,s.f,n.f],seg:[s.cp,n.cp],cp:s.cp+(n.cp-s.cp)*t}))});
  return {fr,A}}
const argv=process.argv.slice(2),verbose=argv.includes('-v'),args=argv.filter(x=>x[0]!=='-');
const only=args[0]&&args[0]!=='all'?args[0].split(','):null;const TOLB=+(args[1]||1.0),TOLE=+(args[2]||.3);
const res={},maxPen={};let t0=Date.now();
Object.keys(X.ANIM).filter(k=>!only||only.includes(k)).forEach(key=>{let F;const name=nameOf(key);try{F=frames(key)}catch(e){res[key]=['BŁĄD '+e.message];maxPen[key]=999;return}
  const worst={};
  F.fr.forEach(({P,f,lab,LP})=>{check(P,name,key,f,F.A,TOLB,TOLE,LP).forEach(([pen,x,y])=>{const k=verbose?x+' × '+y:(x.replace(/ \(.*\)/,'')+' × '+y.replace(/ \(.*\)/,''));if(!worst[k]||worst[k][0]<pen)worst[k]=[pen,lab]})});
  const l=Object.entries(worst).sort((p,q)=>q[1][0]-p[1][0]);if(l.length)maxPen[key]=Math.round(l[0][1][0]*10)/10;if(l.length)res[key]=l.map(([k,[p,lb]])=>`${k}: ${p.toFixed(1)} (${lb})`)});
Object.entries(res).forEach(([k,l])=>console.log(k+' ['+nameOf(k)+']\n  '+l.slice(0,verbose?40:6).join('\n  ')+(l.length>6&&!verbose?`\n  … +${l.length-6}`:'')));
console.log('\nćwiczeń z kolizją:',Object.keys(res).length,'/',(only||Object.keys(X.ANIM)).length,'czas',Date.now()-t0,'ms');

if(!only){
  const BF=path.join(__dirname,'collide-baseline.json');
  if(argv.includes('--update')){fs.writeFileSync(BF,JSON.stringify(maxPen,null,1)+'\n');console.log('Zapisano wzorzec:',BF);process.exit(0)}
  const base=JSON.parse(fs.readFileSync(BF,'utf8')), bad=Object.keys(maxPen).filter(k=>maxPen[k]>(base[k]||0)+.3);
  if(bad.length){console.log('\nNOWE LUB WIĘKSZE KOLIZJE:',bad.map(k=>`${k} ${maxPen[k]} (wzorzec ${base[k]||0})`).join(', '));process.exit(1)}
  console.log('Kolizje: bez pogorszenia względem wzorca.');
}
