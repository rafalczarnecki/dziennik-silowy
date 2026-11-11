// Testy aplikacji w jsdom: przepływ treningu, podpowiedzi, zastój, lżejszy tydzień, plany, kopia na GitHubie, import, migracja.
// Dane są sztuczne: w repozytorium nie ma prawdziwych treningów ani planów.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const HTML=fs.readFileSync(path.join(__dirname,'..','src','dziennik-silowy.html'),'utf8');
const TAIL='\ninstallAll();\nmigrate();\nrender();\n</script>';
if(HTML.split(TAIL).length!==2)throw new Error('Nie znaleziono końca skryptu aplikacji');
const EXPOSE='loadPlan,validatePlan,importAny,importData,ghSync,ghPlans,ghSet,ghCfg,dayEx,volume,suggest,hintFor,lastFor,stallInfo,planEst,planSeq,clashes,targetFor,moveAnim,animKeyOf,G,MX,mdExport,render,save';
const SRC=HTML.replace(TAIL,`\nwindow.__t={${EXPOSE},get S(){return S},set S(v){S=v},PLANS:()=>PLANS};`+TAIL);
const day=864e5, now=Date.now(), iso=t=>new Date(t).toISOString();
const PLAN={type:'dziennik-plan',v:1,id:'tst',name:'Plan testowy',sub:'',dayPrefix:'',weeks:4,light:{weeks:[4]},days:[
  {name:'A',ex:[['Przysiad',4,8,'',2],['Wyciskanie touch and go',4,8,'',2],['Wznosy bokiem',3,12,'',1],['Dead bug (zdechły robak)',3,'max','',1]],add:[]},
  {name:'B',ex:[['Martwy ciąg klasyczny',4,6,'rampa',2],['Podciąganie nachwytem',3,5,'',2]],add:[]}],extra:{sport:[[],[]],wolverine:[[],[]],sila:[[],[]]}};
const sesA=(t,week,sq,be)=>({date:iso(t),plan:'tst',week,day:0,label:'A',ex:[
  {name:'Przysiad',sec:1200,sets:sq.map(([w,r])=>({w,r}))},{name:'Wyciskanie touch and go',sec:1100,sets:be.map(x=>x.length>2?{w:x[0],r:x[1],parts:[{w:x[0],r:x[2]}]}:{w:x[0],r:x[1]})},
  {name:'Wznosy bokiem',sets:[{w:10,r:12},{w:10,r:12},{w:10,r:12}]},{name:'Dead bug (zdechły robak)',sets:[{r:10},{r:10},{r:10}]}]});
const sesB=(t,week)=>({date:iso(t),plan:'tst',week,day:1,label:'B',ex:[{name:'Martwy ciąg klasyczny',sets:[{w:120,r:6},{w:130,r:6},{w:140,r:6},{w:150,r:6}]},{name:'Podciąganie nachwytem',sets:[{r:5},{r:5},{r:5}]}]});
const base=(over={})=>Object.assign({plan:'tst',week:2,day:0,tab:'trening',goal:'sport',migs:['m1026'],userPlans:{tst:PLAN},
  sessions:[sesA(now-7*day,1,[[100,8],[100,8],[100,8],[100,8]],[[80,8],[80,7,1],[80,8],[80,8]]),sesB(now-6*day,1)]},over);

function app(state,opt={}){
  const errs=[];
  const dom=new JSDOM(SRC,{runScripts:'dangerously',url:'https://x.test/',pretendToBeVisual:true,beforeParse(w){
    if(state)w.localStorage.setItem('dziennik-silowy-v1',JSON.stringify(state));
    if(opt.gh)w.localStorage.setItem('dziennik-gh',JSON.stringify(opt.gh));
    w.scrollTo=()=>{};w.matchMedia=()=>({matches:false});if(opt.fetch)w.fetch=opt.fetch;
    w.addEventListener('error',e=>errs.push(e.message))}});
  const w=dom.window,d=w.document;
  return {w,d,T:w.__t,errs,S:()=>JSON.parse(w.localStorage.getItem('dziennik-silowy-v1')),
    card:n=>[...d.querySelectorAll('.ex')].find(e=>e.querySelector('h2').textContent.includes(n)),
    ph(n){return [...this.card(n).querySelectorAll('[data-k=w]')].map(i=>i.placeholder+(i.classList.contains('upw')?'↑':'')).join(' ')},
    toast:()=>(d.querySelector('#toast')||{}).textContent||'',
    inp(el,v){el.value=v;el.dispatchEvent(new w.Event('input',{bubbles:true}))}};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;const fails=[];
function eq(a,b,m){if(JSON.stringify(a)===JSON.stringify(b))return;throw new Error(`${m||'eq'}: jest ${JSON.stringify(a)}, miało być ${JSON.stringify(b)}`)}
function ok(v,m){if(!v)throw new Error(m||'warunek niespełniony')}
const tests=[];const test=(n,f)=>tests.push([n,f]);
const b64=s=>Buffer.from(s,'utf8').toString('base64'), unb64=s=>Buffer.from(s,'base64').toString('utf8');

test('podpowiedzi: podwójna progresja, przerwana seria, rampa',async()=>{
  const A=app(base());await wait(50);
  eq(A.ph('Przysiad'),'102,5↑ 102,5↑ 102,5↑ 102,5↑');
  ok(/przerwy w środku/.test(A.card('Wyciskanie touch').querySelector('.hint').textContent),'wyciskanie: przerwana seria');
  eq(A.ph('Wyciskanie touch'),'80 80 80 80');
  eq(A.ph('Wznosy'),'12↑ 12↑ 12↑','hantle +2 kg');
  A.d.querySelector('[data-day="1"]').click();
  eq(A.ph('Martwy'),'120 130 140 152,5↑');
  ok(/1 powtórzenie więcej/.test(A.card('Podciąganie').querySelector('.hint').textContent),'masa ciała: powtórzenia zamiast ciężaru');
  eq(A.errs,[]);
});
test('trening: zapis serii, rekord, historia, eksport',async()=>{
  const A=app(base());await wait(50);
  A.card('Przysiad').querySelector('[data-cueopen]').click();A.inp(A.d.querySelector('textarea[data-cue="Przysiad"]'),'Kolana na zewnątrz');A.d.querySelector('[data-cueclose]').click();
  eq(A.S().cues,{Przysiad:'Kolana na zewnątrz'});
  A.card('Przysiad').querySelector('.set [data-ok]').click();
  const db=A.card('Dead bug').querySelector('.set');A.inp(db.querySelector('[data-k=r]'),'12');db.querySelector('[data-ok]').click();
  A.d.querySelector('#finish').click();A.d.querySelector('#finish').click();
  ok(/Rekord/.test(A.toast()),'toast z rekordem: '+A.toast());
  const s=A.S(),last=s.sessions.at(-1);eq(s.sessions.length,3);eq(last.ex[0].sets[0].w,102.5);ok(last.prs&&last.prs.length===2,'dwa rekordy');
  A.d.querySelector('[data-tab=postepy]').click();ok([...A.d.querySelectorAll('.card')].some(c=>c.textContent.startsWith('Rekordy')),'karta rekordów');
  A.d.querySelector('[data-tab=historia]').click();ok(A.d.querySelectorAll('details.card').length>=3,'historia');
  const md=A.T.mdExport();ok(/Rekordy:/.test(md)&&/Kolana na zewnątrz/.test(md)&&/Bilans tygodnia/.test(md),'eksport');
  eq(A.errs,[]);
});
test('wszystkie zakładki i opisy z animacją renderują się bez błędów',async()=>{
  const A=app(base());await wait(50);
  A.d.querySelectorAll('[data-tab]').forEach(b=>b.click());
  A.d.querySelector('[data-tab=trening]').click();
  A.card('Przysiad').querySelector('.infomini').click();ok(A.card('Przysiad').querySelector('svg.moveanim'),'animacja w opisie');
  eq(A.errs,[]);
});
test('animacje: każde ćwiczenie z bazy buduje się w obu trybach, bez NaN',async()=>{
  const A=app(base());await wait(50);let n=0;
  for(const mode of ['sch','anat']){A.T.S.animMode=mode;const seen=new Set();
    for(const name of Object.keys(A.T.G)){const k=A.T.animKeyOf(name);if(!k||seen.has(k))continue;seen.add(k);const h=A.T.moveAnim(name);ok(h.includes('<svg'),name);ok(!/NaN|undefined/.test(h),mode+' '+name+': NaN/undefined w rysunku');n++}}
  ok(n>=120,'za mało animacji: '+n);
});
test('wskazówki w animacji: zatrzymania, podpisy i częste błędy (przysiad, martwy ciąg, wyciskanie)',async()=>{
  const A=app(base());await wait(50);
  for(const name of ['Przysiad','Martwy ciąg klasyczny','Wyciskanie touch and go']){const h=A.T.moveAnim(name);
    ok((h.match(/class="cue"/g)||[]).length>=3,name+': podpisy wskazówek');ok(/Częste błędy/.test(h)&&(h.match(/<figure/g)||[]).length===2,name+': dwa błędy');
    ok(/Na co zwrócić uwagę/.test(h),name+': lista');ok(!/NaN|undefined/.test(h),name+': NaN')}
  for(const name of ['Podciąganie nachwytem','Wznosy bokiem','OHP','Wejścia na skrzynię','Wyciskanie leżąc wąsko','Hollow body','Wood chopper']){const h=A.T.moveAnim(name);
    ok((h.match(/class="cue"/g)||[]).length>=2,name+': podpisy wskazówek');ok(!/NaN|undefined/.test(h),name+': NaN')}
  ok(/Ciężar|ciężar/.test(A.T.moveAnim('Wyciskanie hantli'))&&!/sztang/i.test((A.T.moveAnim('Wyciskanie hantli').match(/class="cue"[^<]*<b[^<]*<\/b>[^<]*/g)||[]).join(' ')),'hantle: wskazówki bez słowa sztanga');
  ok(!/Częste błędy/.test(A.T.moveAnim('JM press'))&&!/class="cue"/.test(A.T.moveAnim('JM press')),'JM press bez odziedziczonych wskazówek');
});
test('zastój i wariant ćwiczenia',async()=>{
  const st=base({week:4});st.sessions=[1,2,3].map(i=>sesA(now-(22-7*i)*day,i,[[100,8],[100,8],[100,8],[100+i*2.5,8]],[[80,8],[80,8],[80,8],[80,8]]));
  const A=app(st);await wait(50);
  ok(A.T.stallInfo('Wyciskanie touch and go'),'zastój wykryty');ok(!A.T.stallInfo('Przysiad'),'przysiad rośnie');
  A.T.S.week=2;A.T.render();
  const box=A.card('Wyciskanie').querySelector('.stall');ok(box&&/Brak progresu/.test(box.textContent),'ramka zastoju');
  A.d.querySelector('[data-stick="Wyciskanie touch and go|nie"]').click();
  A.d.querySelector('[data-vswap]').click();
  const sw=A.S().swaps['tst-0'];ok(sw&&sw['1']&&sw['1'].name,'zamiana zapisana');
  ok(!A.card('Wyciskanie touch'),'karta pokazuje wariant');
  eq(A.errs,[]);
});
test('zastój nie porównuje różnych zakresów powtórzeń',async()=>{
  const st=base();const P2=JSON.parse(JSON.stringify(PLAN));P2.id='old';P2.days[0].ex[1][2]=6;st.userPlans.old=P2;
  const s1=sesA(now-21*day,1,[[100,8]],[[90,6],[90,6],[90,6],[90,6]]);s1.plan='old';
  st.sessions=[s1,sesA(now-14*day,1,[[100,8]],[[80,8],[80,8],[80,8],[80,8]]),sesA(now-7*day,2,[[100,8]],[[80,8],[80,8],[80,8],[80,8]])];
  const A=app(st);await wait(50);eq(A.T.stallInfo('Wyciskanie touch and go'),null);
});
test('zmiana zakresu powtórzeń: ciężar przeliczony',async()=>{
  const A=app(base());await wait(50);
  const L={sets:[{w:82.5,r:8},{w:87.5,r:8},{w:92.5,r:8},{w:97.5,r:8}],reps:8};
  eq(A.T.suggest(['Przysiad',4,6,'rampa'],L).map(x=>x.w),[85,90,97.5,102.5]);
  ok(/Nowy zakres/.test(A.T.hintFor(['Przysiad',4,6,'rampa'],L).t));
  eq(A.T.suggest(['Przysiad',4,12,''],L).map(x=>x.w),[72.5,77.5,82.5,87.5],'więcej powtórzeń: lżej');
});
test('lżejszy tydzień: seria mniej, ok. 10% lżej, wynik pominięty w podpowiedziach',async()=>{
  const A=app(base({week:4}));await wait(50);
  eq(A.ph('Przysiad'),'90 90 90');ok(/Lżejszy tydzień/.test(A.card('Przysiad').querySelector('.hint').textContent));
  ok(/lżejszy/.test(A.d.querySelector('[data-week="4"]').textContent),'oznaczenie tygodnia');
  A.T.S.sessions.push(sesA(now,4,[[90,8],[90,8],[90,8]],[[72,8],[72,8],[72,8]]));
  eq(A.T.lastFor('Przysiad').sets[0].w,100,'ostatni pełny trening');
  ok(/^3×8/.test(A.T.targetFor(A.T.S.sessions.at(-1),'Przysiad')),'cel w eksporcie');
  A.d.querySelector('[data-week="1"]').click();eq(A.ph('Przysiad'),'102,5↑ 102,5↑ 102,5↑ 102,5↑');eq(A.errs,[]);
});
test('plan: walidacja, konflikty partii, kolejność dni, szacowany czas',async()=>{
  const A=app(base());await wait(50);
  ok(A.T.validatePlan({type:'x'}).err);ok(A.T.validatePlan(Object.assign({},PLAN,{id:'zły id!'})).err);
  ok(A.T.validatePlan(Object.assign({},PLAN,{days:[{name:'A',ex:[['Przysiad',0,8]]}]})).err,'0 serii');
  const C=JSON.parse(JSON.stringify(PLAN));C.id='c1';C.days[0].ex.push(['Hack squat',3,10,'',1]);C.days[0].ex.push(['Rumuński martwy ciąg',3,8,'',1]);
  const v=A.T.validatePlan(C);eq(v.conf.length,1,'przysiad + hack squat');eq(v.seq.length,1,'RDL w A, martwy ciąg w B');
  eq(A.T.validatePlan(PLAN).seq.length,0);eq(A.T.clashes(['Przysiad','Wyciskanie touch and go']).length,0);
  const e=A.T.planEst('tst');eq(e.length,2);ok(e[0].t>=1800&&e[0].t<=7200,'czas dnia A: '+e[0].t);
  const v2=A.T.volume('tst');eq(v2.czw,6,'czworogłowe: przysiad 4 + martwy ciąg 4×0,5');eq(v2.bb,3);eq(v2.pion,3);eq(v2.klatka,4,'klatka: '+A.T.dayEx('tst',0).map(x=>x.ex[0]).join(', '));
});
test('wczytanie planu: nowy plan przełącza, aktualizacja zostawia pozycję',async()=>{
  const A=app(base());await wait(50);
  const N=JSON.parse(JSON.stringify(PLAN));N.id='n2';N.name='Nowy';
  A.T.loadPlan(JSON.stringify({type:'dziennik-pakiet',v:1,plans:[N]}),true);
  eq([A.T.S.plan,A.T.S.week,A.T.S.day],['n2',1,0]);ok(/Nowy plan z GitHuba: Nowy/.test(A.toast()));
  A.T.S.week=3;A.T.S.day=1;N.days[0].ex[0][1]=5;
  A.T.loadPlan(JSON.stringify({type:'dziennik-pakiet',v:1,plans:[N]}),true);
  eq([A.T.S.plan,A.T.S.week,A.T.S.day],['n2',3,1]);eq(A.T.PLANS().n2.days[0].ex[0][1],5);
  A.T.loadPlan('{zły json');ok(/poprawny plik planu/.test(A.toast()));eq(A.errs,[]);
});
test('import kopii: scalanie bez duplikatów; nieznany plik odrzucony',async()=>{
  const A=app(base());await wait(50);const before=A.T.S.sessions.length;
  const bk={app:'dziennik-silowy',v:2,sessions:[...base().sessions.map(x=>Object.assign({},x,{date:A.T.S.sessions[0].date})).slice(0,1),sesB(now-2*day,2)]};
  A.T.importAny(JSON.stringify(bk));eq(A.T.S.sessions.length,before+1);ok(/Dodano treningów: 1/.test(A.toast()));
  A.T.importAny(JSON.stringify(bk));eq(A.T.S.sessions.length,before+1);
  A.T.importAny('{"a":1}');ok(/Nie rozpoznano/.test(A.toast()));
  const d=A.T.S.sessions.map(x=>Date.parse(x.date));ok(d.every((v,i)=>!i||v>=d[i-1]),'kolejność dat');
});
const ghMock=(files,log)=>async(url,o={})=>{
  const m=String(url).match(/\/contents\/([^?]+)/), f=m&&m[1], raw=/raw/.test(((o.headers||{}).Accept)||'');
  if(!f)return {ok:true,status:200,json:async()=>({private:true}),text:async()=>''};
  if((o.method||'GET')==='PUT'){const b=JSON.parse(o.body);files[f]=unb64(b.content);log.push(f);return {ok:true,status:200,json:async()=>({})}}
  if(!(f in files))return {ok:false,status:404,json:async()=>({}),text:async()=>''};
  return {ok:true,status:200,text:async()=>raw?files[f]:'',json:async()=>({sha:'s'+files[f].length,content:b64(files[f])})};
};
const GH={repo:'a/b',token:'x'.repeat(30)};
test('kopia na GitHubie: wysyłka danych i eksportu',async()=>{
  const files={},log=[];const A=app(base(),{gh:GH,fetch:ghMock(files,log)});await wait(50);
  await A.T.ghSync(true);
  eq(log,['dziennik.json','eksport-dla-claude.md']);eq(JSON.parse(files['dziennik.json']).sessions.length,2);
  ok(/Eksport dla Claude|eksport dla Claude/i.test(files['eksport-dla-claude.md']));ok(!A.T.ghCfg().dirty,'brak zaległej kopii');
});
test('kopia na GitHubie: nowsze treningi na GitHubie są scalane, nie nadpisywane',async()=>{
  const st=base(),rem={app:'dziennik-silowy',v:2,sessions:[...st.sessions,sesB(now-1*day,2)]};
  const files={'dziennik.json':JSON.stringify(rem)},log=[];const A=app(st,{gh:GH,fetch:ghMock(files,log)});await wait(50);
  await A.T.ghSync(true);
  eq(log,[],'bez nadpisania');eq(A.T.S.sessions.length,3,'trening z GitHuba dodany');
  await A.T.ghSync(true);eq(log,['dziennik.json','eksport-dla-claude.md']);eq(JSON.parse(files['dziennik.json']).sessions.length,3);
});
test('plany z GitHuba: pobranie przy zmianie pliku, brak pliku bez błędu',async()=>{
  const N=JSON.parse(JSON.stringify(PLAN));N.id='gh1';N.name='Z GitHuba';
  const files={'plany.json':JSON.stringify({type:'dziennik-pakiet',v:1,plans:[N]})};const A=app(base(),{gh:GH,fetch:ghMock(files,[])});await wait(50);
  await A.T.ghPlans();eq(A.T.S.plan,'gh1');ok(A.T.ghCfg().planSha);
  A.T.S.week=2;await A.T.ghPlans();eq(A.T.S.week,2);
  const B=app(base(),{gh:GH,fetch:ghMock({},[])});await wait(50);await B.T.ghPlans();eq(B.T.S.plan,'tst');eq(B.errs,[]);
});
test('migracja: pusty start i stary zapis bez nowych pól',async()=>{
  const A=app(null);await wait(50);eq(A.errs,[]);ok(A.d.querySelectorAll('.ex').length>0,'plan startowy');
  A.d.querySelectorAll('[data-tab]').forEach(b=>b.click());eq(A.errs,[]);
  const B=app({sessions:[{date:iso(now-30*day),plan:'start',week:1,day:0,label:'x',ex:[{name:'Przysiad',sets:[{w:60,r:8}]}]}]});await wait(50);
  B.d.querySelectorAll('[data-tab]').forEach(b=>b.click());eq(B.errs,[]);eq(B.S().sessions.length,1);
  const C=app({sessions:'zepsute'});await wait(50);eq(C.errs,[]);
});

(async()=>{
  const only=process.argv[2];
  for(const [n,f] of tests){if(only&&!n.includes(only))continue;
    try{await f();pass++;console.log('ok   '+n)}catch(e){fail++;fails.push(n);console.log('BŁĄD '+n+'\n     '+String(e&&e.message||e).split('\n')[0])}}
  console.log(`\n${pass} zaliczonych, ${fail} niezaliczonych`);process.exit(fail?1:0)})();
