// Testy aplikacji w jsdom: przepływ treningu, podpowiedzi, zastój, lżejszy tydzień, plany, kopia na GitHubie, import, migracja.
// Dane są sztuczne: w repozytorium nie ma prawdziwych treningów ani planów.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const HTML=fs.readFileSync(path.join(__dirname,'..','src','dziennik-silowy.html'),'utf8');
const TAIL='\ninstallAll();\nmigrate();\nrender();\n</script>';
if(HTML.split(TAIL).length!==2)throw new Error('Nie znaleziono końca skryptu aplikacji');
const EXPOSE='loadPlan,validatePlan,importAny,importData,ghSync,ghPlans,ghSet,ghCfg,dayEx,volume,suggest,hintFor,lastFor,stallInfo,planEst,planSeq,clashes,targetFor,moveAnim,animKeyOf,G,MX,mdExport,render,save,genPlan,evalPlan,tModel,dayEst,calendar,patOf,musOf,regOf,isFD,macroRows,macroPos,macroCheck,macroGoals';
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
  eq(A.ph('Martwy'),'137,5↑ 142,5↑ 147,5↑ 152,5↑','rampa rośnie, a za duże kroki (10 kg) są wyrównane w polach');
  ok(/Kroki między seriami były za duże.*137,5 \/ 142,5 \/ 147,5 \/ 152,5/.test(A.card('Martwy').querySelector('.hint').textContent),'informacja o wyrównaniu rampy');
  eq(A.T.suggest(['Przysiad',4,8,'rampa'],{sets:[{w:80,r:8},{w:85,r:8},{w:90,r:8},{w:95,r:8}],reps:8}).map(q=>q.w),[82.5,87.5,92.5,97.5],'równa rampa rośnie w całości bez zmian kroków');
  eq(A.T.suggest(['Przysiad',4,8,'rampa'],{sets:[{w:80,r:8},{w:90,r:8},{w:100,r:7},{w:110,r:5}],reps:8}).map(q=>q.w),[80,90,100,110],'niezaliczona rampa zostaje bez zmian');
  ok(!/Kroki między/.test(A.T.hintFor(['Przysiad',4,8,'rampa'],{sets:[{w:80,r:8},{w:85,r:8},{w:90,r:8},{w:95,r:8}],reps:8}).t),'kroki 5 kg są w porządku');
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
  eq(A.T.suggest(['Wiosłowanie na wyciągu siedząc',3,12,''],{sets:[{w:32,r:10},{w:39,r:10},{w:45,r:10},{w:52,r:10}],reps:10}).map(x=>x.w),[35,42.5,47.5],'seria mniej: odpowiednikami są najcięższe serie');
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

// ---------- generator następnego bloku (dane sztuczne) ----------
// Plan z błędami z przeglądu: dwa uginania nóg, OHP + skos w jednym dniu, wznosy + face pull w superserii, ćwiczenie bez postępu.
const GP={type:'dziennik-plan',v:1,id:'blk',name:'Blok 3.1 Siła',sub:'',dayPrefix:'',weeks:4,light:{weeks:[4]},days:[
  {name:'A',ex:[['Przysiad',4,6,'rampa',[3,2,1,3]],['Wyciskanie touch and go',4,6,'rampa',[3,2,1,3]],['Uginanie podudzi leżąc',4,10,'',[2,2,1,2]],['Powell raises',3,12,'',1],['Ab wheel',3,'max','',1]],warmup:[['krazenia',45]],stretch:[['oddech',60]]},
  {name:'B',ex:[['Martwy ciąg klasyczny',4,5,'rampa',[3,2,1,3]],['OHP',4,8,'',[2,2,1,2]],['Wyciskanie hantli na skosie dodatnim',3,10,'',[2,2,1,2]],['Wiosłowanie na wyciągu siedząc',4,10,'',[2,2,1,2]],['Hollow body',3,'max','',1]],warmup:[['krazenia',45]],stretch:[['oddech',60]]},
  {name:'C',ex:[['Wyciskanie leżąc wąsko',3,8,'',[2,2,1,2]],['Ściąganie drążka podchwytem',4,8,'',[2,2,1,2]],['Split squat',3,10,'',[2,2,1,2]],['Wiosłowanie hantlem jednorącz',4,10,'',[2,2,1,2]],['Uginanie podudzi siedząc',3,10,'',[2,2,1,2]],['Wood chopper',3,12,'',1]],warmup:[['krazenia',45]],stretch:[['oddech',60]]}],
  extra:{sport:[[['Wznosy bokiem',3,12,10]],[['Wznosy bokiem',3,12,10,'A'],['Face pull',3,15,12,'A']],[['Wznosy bokiem',3,12,10],['Lina na rolce',3,'max',null,null,60,'30–40 s']]],wolverine:[[],[],[]],sila:[[],[],[]]}};
// treningi: A w środy, B w soboty, C w poniedziałki; czasy serii z odstępami, żeby działał model czasu
const MON=Date.parse('2026-10-05T17:00:00Z');
function gses(day,t0,week,list){let t=t0+900e3,last=t;const ex=list.map(([name,sets,iv],k)=>{if(k)t+=230e3;const st=sets.map(([w,r],j)=>{if(j)t+=iv*1000;last=t;return {w,r,t}});return {name,sets:st}});
  return {date:iso(t0),plan:'blk',week,day,label:'x',ex,start:t0,dur:Math.round((last-t0)/1000)+400}}
function gstate(){const ses=[];
  for(let w=0;w<3;w++){const m=MON+w*7*day, k=w*2.5, d=ses.length;
    ses.push(gses(0,m+2*day,w+1,[['Przysiad',[[90+k,6],[95+k,6],[100+k,6],[105+k,6]],270],['Wyciskanie touch and go',[[65+k,6],[67.5+k,6],[70+k,6],[72.5+k,6]],240],['Uginanie podudzi leżąc',[[50,10],[60,10],[70,10],[70+k,10]],160],['Powell raises',[[14,12],[14,12],[14,12]],150],['Ab wheel',[[null,12+w],[null,12],[null,12]],130],['Wznosy bokiem',[[12,12],[12,12],[12,12]],120]]));
    ses.push(gses(1,m+5*day,w+1,[['Martwy ciąg klasyczny',[[120+k,5],[125+k,5],[130+k,5],[135+k,5]],300],['OHP',[[40+k,8],[40+k,8],[40+k,8],[40+k,8]],220],['Wyciskanie hantli na skosie dodatnim',[[18,10],[20,10],[22,10]],180],['Wiosłowanie na wyciągu siedząc',[[39,10],[45,10],[52,10],[52+k,10]],210],['Hollow body',[[null,40+w],[null,40],[null,35]],130]]));
    ses.push(gses(2,m+7*day,w+1,[['Wyciskanie leżąc wąsko',[[60+k,8],[62.5+k,8],[65+k,8]],320],['Ściąganie drążka podchwytem',[[66,8],[73,8],[73+k,8],[73+k,8]],230],['Wejścia na skrzynię',[[20+w*2,10],[20+w*2,10],[20+w*2,10]],360],['Wiosłowanie hantlem jednorącz',[[16,10],[18,10],[20,10],[20+w*2,10]],190],['Uginanie podudzi siedząc',[[40,10],[45,10],[50,10]],160],['Wood chopper',[[22.5+w,12],[22.5+w,12],[22.5+w,12]],150]]));
    ses[d+2].ex[2].from='Split squat';}
  return {plan:'blk',week:4,day:0,tab:'trening',goal:'sport',migs:['m1026'],userPlans:{blk:GP},sessions:ses,
    swaps:{'blk-2':{'2':{name:'Wejścia na skrzynię',since:MON}}},profile:'Wzrost 180 cm. Zdrowie: ból kolana przy front squacie.'}}
test('generator: następny blok bez błędów z przeglądu planów',async()=>{
  const A=app(gstate());await wait(50);const T=A.T;
  eq(T.calendar('blk',3),{wd:[2,5,0],known:true},'kalendarz: śr., sob., pon.');
  const r=T.genPlan();ok(r&&r.plan,'plan ułożony');const p=r.plan,g=p.extra.sport,names=i=>[...p.days[i].ex.map(x=>x[0]),...g[i].map(x=>x[0])],all=[0,1,2].flatMap(names);
  ok(!T.validatePlan(p).err,'poprawny plik planu');eq(T.validatePlan(p).conf,[],'jedna partia na dzień');
  eq([p.name,p.sub,p.id,p.gen.phase],['Blok 3.2','Akumulacja, z aplikacji','g32','acc'],'po bloku siłowym akumulacja');
  eq(p.light,{weeks:[4]});
  const ex=n=>p.days.flatMap(d=>d.ex).find(x=>x[0]===n);
  eq([ex('Przysiad').slice(1,4),ex('Wyciskanie touch and go').slice(1,4),ex('Martwy ciąg klasyczny').slice(1,4)],[[4,8,'rampa'],[4,8,'rampa'],[4,6,'rampa']],'boje: 8/8/6 powtórzeń, rampa');
  ok(!all.includes('Split squat')&&all.includes('Wejścia na skrzynię'),'zamieniony split squat nie wraca, zamiennik zostaje');
  ok(!all.includes('Front squat'),'ból z profilu');
  ok(!all.includes('Powell raises'),'ćwiczenie bez postępu zamienione');
  const hams=all.filter(n=>T.patOf(n)==='ham'),hinge=[0,1,2].filter(i=>names(i).some(n=>T.patOf(n)==='hinge'));
  eq(hams.length,1,'jedno uginanie nóg');eq(hinge,[0],'skłon w środę, najdalej od martwego ciągu w sobotę');
  [0,1,2].forEach(i=>ok(names(i).filter(T.isFD).length<=1,'najwyżej jedno ciężkie wyciskanie na przednie barki: '+names(i).join(', ')));
  [0,1,2].forEach(i=>{const by={};[...p.days[i].ex.map(x=>[x[0],x[6]]),...g[i].map(x=>[x[0],x[4]])].forEach(([n,s])=>{if(s)(by[s]=by[s]||[]).push(n)});
    Object.values(by).filter(q=>q.length===2).forEach(([a,b])=>ok(!T.regOf(a).some(x=>T.regOf(b).includes(x)),'superseria bez wspólnej okolicy: '+a+' + '+b))});
  const v=r.ev.vol;['bb','pion','bt'].forEach(m=>ok(v[m]>=8,'priorytet '+m+': '+v[m]));ok(v.dwu>=6,'tył uda: '+v.dwu);
  r.ev.est.forEach((t,i)=>ok(t<=7200,'dzień '+i+' do 2 h: '+t));
  eq(r.ev.issues.filter(x=>x.lv==='err'),[],'bez błędów w ocenie');
  ok(p.gen.why.some(w=>/Face pull/.test(w.t)&&/osobno/.test(w.t)),'powód: wznosy i face pull osobno');
  eq(A.errs,[]);
});
test('ocena planu: wykrywa błędy z przeglądu',async()=>{
  const A=app(gstate());await wait(50);
  const bad=JSON.parse(JSON.stringify(GP));bad.id='bad';delete bad.light;
  bad.days[2].ex.push(['Rumuński martwy ciąg',3,10,'',2]);bad.days[2].ex.push(['Nieznane ćwiczenie',3,10,'',2]);
  const e=A.T.evalPlan(bad,{cur:'blk'}),txt=e.issues.map(x=>x.lv+' '+x.t).join('\n');
  [/err .*Split squat: wraca/,/err .*Nieznane ćwiczenie/,/warn B \(sob\.\): dwa ciężkie wyciskania na przednie barki/,/err B \(sob\.\): superseria Wznosy bokiem \+ Face pull/,
   /warn B \(sob\.\) i C \(pon\.\): .*co 2 dni/,/err C \(pon\.\): dwa ćwiczenia na tył uda/,/warn Brak lżejszego tygodnia/,/Powell raises: bez postępu/].forEach(re=>ok(re.test(txt),'brak: '+re+'\n'+txt));
  ok(e.score<50,'niska ocena: '+e.score);
});
test('czas treningu: model z zapisów, superseria krótsza',async()=>{
  const A=app(gstate());await wait(50);const m=A.T.tModel();
  ok(Math.abs(m.iv('Przysiad')-270)<1&&Math.abs(m.iv('Wejścia na skrzynię')-360)<1,'odstęp między seriami z zapisów');
  ok(m.pre>800&&m.pre<1000&&Math.abs(m.cal)<120,'rozgrzewka i poprawka: '+m.pre+' '+m.cal);
  const P=JSON.parse(JSON.stringify(GP));P.id='ss';P.days[0].ex[3].push(null,'Z');P.days[0].ex[4].push(null,'Z');A.T.loadPlan(JSON.stringify(P),true);
  const sep=A.T.dayEst('blk',0);ok(A.T.dayEst('ss',0)<sep,'superseria skraca dzień: '+A.T.dayEst('ss',0)+' < '+sep);
  const DX=A.T.dayEx('ss',0),pw=DX.find(x=>x.ex[0]==='Powell raises');ok(pw.ss==='Z'&&pw.partner==='Ab wheel'&&pw.first,'superseria w ćwiczeniach planu');
});
test('ułożenie bloku w aplikacji: baner, podgląd, zapis, eksport',async()=>{
  const A=app(gstate());await wait(50);
  const b=A.d.querySelector('[data-gen]');ok(b&&/Ostatni tydzień bloku/.test(b.closest('.card').textContent),'baner w ostatnim tygodniu');b.click();
  ok(/Następny blok/.test(A.d.querySelector('#view').textContent)&&A.d.querySelectorAll('.genl').length===3,'podgląd z trzema dniami');
  ok(/Co się zmienia i dlaczego/.test(A.d.querySelector('#view').textContent),'powody zmian');
  A.d.querySelector('[data-genok]').click();
  const s=A.S();eq([s.plan,s.week,s.day],['g32',1,0]);ok(s.userPlans.g32.gen&&s.userPlans.g32.gen.why.length,'plan z powodami w kopii');
  ok(A.d.querySelectorAll('.ex').length>=6,'trening z nowego planu');
  ok(/Bloki ułożone w aplikacji[\s\S]*Blok 3\.2 Akumulacja, z aplikacji \(g32\)[\s\S]*Zmiana/.test(A.T.mdExport()),'eksport dla Claude');
  A.d.querySelector('[data-tab=kopia]').click();ok(/ułożony w aplikacji/.test(A.d.querySelector('#view').textContent));
  A.d.querySelector('[data-gen]').click();A.d.querySelector('[data-gendrop]').click();ok(!/Następny blok<small/.test(A.d.querySelector('#view').innerHTML));
  const B=app(null);await wait(50);B.d.querySelector('[data-tab=kopia]').click();B.d.querySelector('[data-gen]').click();ok(/Następny blok/.test(B.d.querySelector('#view').textContent),'bez historii też działa');
  eq(A.errs,[]);eq(B.errs,[]);
});

test('blok z listy rozwijanej: kolejność, nowy plan od tygodnia 1, powrót za ostatnim treningiem',async()=>{
  const st=base({week:2,day:1});['n1','n2','n3'].forEach((id,i)=>{const P=JSON.parse(JSON.stringify(PLAN));P.id=id;P.name='Blok '+(i+2);st.userPlans[id]=P});
  st.sessions.push(Object.assign(sesB(now-30*day,3),{plan:'n1'}));
  const A=app(st);await wait(50);const sel=()=>A.d.querySelector('#plansel');
  ok(sel()&&!A.d.querySelector('.plans'),'lista rozwijana zamiast przycisków');
  eq([...sel().options].map(o=>o.value),['tst','n2','n3','n1','start'],'bieżący, nowe, wg ostatniego treningu, startowy na końcu');
  ok(/nowy/.test(sel().options[1].textContent)&&/ostatnio/.test(sel().options[3].textContent));
  sel().value='n2';sel().dispatchEvent(new A.w.Event('change',{bubbles:true}));
  eq([A.S().plan,A.S().week,A.S().day],['n2',1,0],'nowy plan od początku');
  sel().value='n1';sel().dispatchEvent(new A.w.Event('change',{bubbles:true}));
  eq([A.S().plan,A.S().week,A.S().day],['n1',4,0],'powrót: za ostatnim treningiem (tydz. 3, B → tydz. 4, A)');
  sel().value='tst';sel().dispatchEvent(new A.w.Event('change',{bubbles:true}));
  eq([A.S().plan,A.S().week,A.S().day],['tst',2,0],'bieżący blok: tydz. 1 B → tydz. 2 A');eq(A.errs,[]);
});

test('cykl: 3 bloki (akumulacja, siła, szczyt z testem), cel, tydzień testu, podsumowanie, nowy cykl',async()=>{
  const A=app(gstate());await wait(50);const T=A.T,v=()=>A.d.querySelector('#view').textContent;
  const go=()=>{A.d.querySelector('[data-tab=kopia]').click();A.d.querySelector('[data-gen]').click()};
  go();ok(/Cykl 1, blok 1 z 3/.test(v())&&/Cel cyklu/.test(v()),'karta cyklu w podglądzie');
  const g0=JSON.parse(JSON.stringify(A.d.querySelector('[data-goalpm]')?1:0));ok(g0,'cel do zmiany');
  A.d.querySelector('[data-goalpm="Przysiad|+"]').click();A.d.querySelector('[data-genok]').click();
  let st=A.S();eq(st.macros.length,1);eq(st.macros[0].plans,['g32']);const G=st.macros[0].goals.Przysiad;
  ok(G.base>100&&G.goal>=G.base*1.03+2.5-0.01,'cel przysiadu: start '+G.base+', cel '+G.goal+' (+2,5 kg ręcznie)');
  go();ok(/Cykl 1, blok 2 z 3/.test(v()),'drugi blok tego samego cyklu');A.d.querySelector('[data-genok]').click();
  st=A.S();eq(st.macros[0].plans,['g32','g33']);eq(st.userPlans.g33.gen.phase,'int');
  go();ok(/blok 3 z 3/.test(v())&&/tydzień testu|W 4\. tygodniu tego bloku test/.test(v()),'trzeci blok z testem');A.d.querySelector('[data-genok]').click();
  st=A.S();const P3=st.userPlans.g34;eq([P3.gen.phase,P3.test],['real',{weeks:[4]}]);
  eq(P3.days.flatMap(d=>d.ex).find(x=>x[0]==='Przysiad').slice(1,3),[4,5],'szczyt: przysiad po 5');
  // tydzień testu: ciężka trójka i 2×5 lżej w bojach, reszta lżej
  A.d.querySelector('[data-tab=trening]').click();A.d.querySelector('[data-week="4"]').click();
  ok(/test/.test(A.d.querySelector('[data-week="4"]').textContent),'tydzień 4 oznaczony jako test');
  const sq=A.card('Przysiad');ok(/test: 1×3/.test(sq.querySelector('.target').textContent)&&/Tydzień testu/.test(sq.querySelector('.hint').textContent),'opis testu');
  const ph=A.ph('Przysiad').split(' ');eq(ph.length,3);ok(+ph[0].replace(',','.')>+ph[1].replace(',','.'),'trójka cięższa niż serie po 5: '+ph.join(' '));
  const e1=Math.max(...T.S.sessions.flatMap(x=>x.ex.filter(e=>e.name==='Przysiad').flatMap(e=>e.sets.map(z=>z.w*(1+z.r/30)))));
  ok(Math.abs(+ph[0].replace(',','.')-e1/(1+5/30))<=2.5,'ciężar trójki z szacowanego 1RM ('+e1.toFixed(1)+')');
  // zapis testu i podsumowanie cyklu
  T.S.sessions.push({date:new Date(Date.now()-2*864e5).toISOString(),plan:'g34',week:4,day:0,label:'test',ex:[{name:'Przysiad',sets:[{w:115,r:3,top:true},{w:100,r:5},{w:100,r:5}]}]},
    {date:new Date().toISOString(),plan:'g34',week:4,day:2,label:'C',ex:[{name:'Wyciskanie leżąc wąsko',sets:[{w:60,r:6},{w:60,r:6}]}]});
  Object.assign(T.S,{plan:'g34',week:1,day:0});T.render();
  ok(/Cykl 1 zakończony/.test(v())&&/w teście/.test(v()),'baner z wynikiem cyklu');
  const r=T.macroRows(T.S.macros[0]).find(x=>x.n==='Przysiad');eq(r.test,126.5,'test: 115×3 → 126,5 kg');
  ok(T.lastFor('Przysiad').sets[0].w!==115,'tydzień testu nie zmienia podpowiedzi');
  A.d.querySelector('[data-tab=postepy]').click();ok(/Cykle \(kilka miesięcy\)/.test(v())&&/Cykl 1/.test(v()),'karta cykli w Analizie');
  ok(/## Cykle \(kilka miesięcy\)[\s\S]*Przysiad: start/.test(T.mdExport()),'cykle w eksporcie');
  eq(T.macroPos().idx,0,'po bloku z testem nowy cykl');go();ok(/Cykl 2, blok 1 z 3/.test(v()));A.d.querySelector('[data-gensave]').click();eq(A.S().macros.length,2);
  eq(A.errs,[]);
});

test('zapas w ostatniej serii (RIR): pytanie po ✓, zapis, wpływ na podpowiedź ciężaru',async()=>{
  const st=base();const a=st.sessions[0];a.ex[0].sets[3].rir=0;a.ex[2].sets[2].rir=3; // przysiad: plan RIR 2, zapas 0; wznosy: plan RIR 1, zapas 3+
  const A=app(st);await wait(50);
  eq(A.ph('Przysiad'),'100 100 100 100','bez zapasu: ciężar zostaje');ok(/zapasem 0, a plan zakładał 2/.test(A.card('Przysiad').querySelector('.hint').textContent));
  eq(A.ph('Wznosy'),'14↑ 14↑ 14↑','duży zapas: podwójny krok');ok(/duży zapas/.test(A.card('Wznosy').querySelector('.hint').textContent));
  ok(/100×8 \(RIR 0\)/.test(A.card('Przysiad').querySelector('.last').textContent),'zapas w „Ostatnio”');
  const c=A.card('Przysiad'),q=c.querySelector('[data-rirq]');ok(q&&q.hidden,'pytanie ukryte przed ostatnią serią');
  c.querySelectorAll('.set [data-ok]').forEach(b=>b.click());ok(!q.hidden,'pytanie po ✓ ostatniej serii');
  q.querySelector('[data-rir$="|2"]').click();eq(q.querySelector('[data-rir$="|2"]').getAttribute('aria-pressed'),'true');
  A.d.querySelector('#finish').click();A.d.querySelector('#finish').click();
  const sq=A.S().sessions.at(-1).ex.find(e=>e.name==='Przysiad');eq(sq.sets.map(x=>x.rir??null),[null,null,null,2],'zapas zapisany przy ostatniej serii');
  ok(/RIR 2\)/.test(A.T.mdExport()),'zapas w eksporcie');eq(A.errs,[]);
});
test('serie rozgrzewkowe i talerze przy ćwiczeniach ze sztangą',async()=>{
  const A=app(base());await wait(50);
  const w=A.card('Przysiad').querySelector('details.warm');ok(w&&w.open,'rozgrzewka przy pierwszym ćwiczeniu ze sztangą, rozwinięta');
  const rows=[...w.querySelectorAll('.wrow')].map(r=>r.textContent.replace(/\s+/g,' ').trim());
  eq(rows.slice(0,5),['20 kg × 10pusty gryf','40 kg × 510','62,5 kg × 320 + 1,25','77,5 kg × 225 + 2,5 + 1,25','87,5 kg × 125 + 5 + 2,5 + 1,25'],'drabinka 40/60/75/85% ciężaru 1. serii (102,5 kg) z talerzami na stronę');
  ok(rows.some(r=>/^102,5 kg ?25 \+ 15 \+ 1,25$/.test(r)),'talerze na serie z planu: '+rows.join(' | '));
  const b=A.card('Wyciskanie touch').querySelector('details.warm');ok(b&&!b.open&&b.querySelectorAll('.wrow').length>=2,'drugie ćwiczenie: krótsza rozgrzewka');
  ok(!A.card('Wznosy').querySelector('details.warm'),'bez rozgrzewki przy hantlach');
  A.d.querySelector('[data-day="1"]').click();const dl=[...A.card('Martwy').querySelectorAll('details.warm .wrow')].map(r=>r.textContent);ok(/^60 kg × 5/.test(dl[0]),'martwy ciąg od 60 kg: '+dl[0]);
  A.d.querySelector('[data-tab=kopia]').click();A.d.querySelector('#barin').value='15';A.d.querySelector('#platesin').value='20 10 5 2,5 1,25';A.d.querySelector('#barsave').click();
  A.d.querySelector('[data-tab=trening]').click();A.d.querySelector('[data-day="0"]').click();
  ok(/^15 kg × 10/.test(A.card('Przysiad').querySelector('.wrow').textContent),'gryf 15 kg');eq(A.S().plates,'20 10 5 2,5 1,25');eq(A.errs,[]);
});

test('cel cyklu osiągnięty wcześniej: cel rośnie, nowy cykl bierze tempo z poprzedniego',async()=>{
  const A=app(gstate());await wait(50);const T=A.T;
  A.d.querySelector('[data-tab=kopia]').click();A.d.querySelector('[data-gen]').click();A.d.querySelector('[data-genok]').click();
  const g=T.S.macros[0].goals.Przysiad,g0=g.goal;ok(g0>g.base,'cel na starcie');
  // jeden trening tuż przy celu: cel bez zmian; drugi na poziomie celu: cel rośnie
  const w=Math.ceil(g0/(1+8/30)/2.5)*2.5,ses=r=>({date:new Date(Date.now()+r*864e5).toISOString(),plan:'g32',week:1,day:0,label:'A',ex:[{name:'Przysiad',sets:[{w:w-10,r:8},{w:w-5,r:8},{w,r:8}]}]});
  T.S.sessions.push(ses(0));eq(T.macroCheck(),[],'jeden wynik na poziomie celu to jeszcze nie podniesienie');eq(T.S.macros[0].goals.Przysiad.goal,g0);
  T.S.sessions.push(ses(1));const msg=T.macroCheck();ok(msg.length===1&&/Przysiad: cel .* osiągnięty .* nowy cel/.test(msg[0]),'komunikat: '+msg);
  const g1=T.S.macros[0].goals.Przysiad;ok(g1.goal>=g0+2.5,'cel w górę: '+g0+' → '+g1.goal);eq(g1.prev[0].goal,g0,'poprzedni cel zapamiętany');
  eq(T.macroCheck(),[],'bez ponownego podnoszenia bez nowych wyników');
  ok(/cel podniesiony z/.test((A.d.querySelector('[data-tab=postepy]').click(),A.d.querySelector('#view').textContent)),'informacja w Analizie');
  ok(/osiągnięty .* i podniesiony/.test(T.mdExport()),'zmiana celu w eksporcie');
  // nowy cykl po bloku 3: cel liczony z tempa poprzedniego cyklu
  T.S.macros[0].plans=['g32','x2','x3'];Object.assign(T.S,{plan:'x3'});const G=T.macroGoals(T.S.userPlans.g32).Przysiad;
  ok(G.pct>3&&/w cyklu 1 przyrost/.test(G.why),'szybsze tempo w poprzednim cyklu → wyższy cel: +'+G.pct+'%');eq(A.errs,[]);
});

test('rozgrzewka: pierwsze ćwiczenie dnia i pierwsze złożone na nierozgrzaną partię, bez izolacji',async()=>{
  const A=app(base());await wait(50);
  const P={type:'dziennik-plan',v:1,id:'wu',name:'Rozgrzewka test',dayPrefix:'',weeks:4,days:[
    {name:'A',ex:[['Podciąganie nachwytem',4,8,'',2],['Przysiad',4,8,'rampa',2],['Wyciskanie hantli na skosie dodatnim',3,10,'',2],['Wznosy bokiem',3,12,'',1]]},
    {name:'B',ex:[['Wyciskanie leżąc wąsko',3,8,'',2],['Ściąganie drążka podchwytem',4,10,'',2],['Wejścia na skrzynię',3,12,'',2],['Wiosłowanie hantlem jednorącz',3,12,'',2],['Uginanie podudzi leżąc',3,12,'',2]]}],
    extra:{sport:[[],[]],wolverine:[[],[]],sila:[[],[]]}};
  A.T.loadPlan(JSON.stringify(P),true);
  const W=n=>{const c=A.card(n),d=c&&c.querySelector('details.warm');return d?{open:d.open,sum:d.querySelector('summary').textContent,rows:[...d.querySelectorAll('.wrow')].map(r=>r.textContent.trim())}:null};
  let w=W('Podciąganie');ok(w&&w.open&&w.sum==='Rozgrzewka: 2 serie'&&w.rows.every(r=>r==='spokojnie × 3'),'podciąganie jako 1. ćwiczenie dnia: '+JSON.stringify(w));
  w=W('Przysiad');ok(w&&w.open&&/^20 kg × 10/.test(w.rows[0]),'przysiad: pełna drabinka od gryfu (100 kg ostatnio)');
  w=W('Wyciskanie hantli');ok(w&&!w.open&&w.sum==='Rozgrzewka: lekko × 8','skos z hantlami: klatka jeszcze nie pracowała → 1 lekka seria: '+JSON.stringify(w));
  ok(!W('Wznosy'),'izolacja bez serii rozgrzewkowych');
  const txt=n=>(A.card(n).querySelector('.warmok')||{}).textContent||'';
  eq(txt('Wznosy'),'Ćwiczenie nie wymaga rozgrzewki, partia gotowa do ćwiczeń (rozgrzana przy: Wyciskanie hantli na skosie dodatnim).','barki rozgrzane wyciskaniem');
  A.d.querySelector('[data-day="1"]').click();
  w=W('Wyciskanie leżąc wąsko');ok(w&&w.open&&w.rows[0].startsWith('pusty gryf × 10'),'pierwszy bój bez historii: ogólna drabinka');
  ok(W('Ściąganie drążka podchwytem').sum==='Rozgrzewka: lekko × 8','plecy jeszcze nie pracowały');
  ok(W('Wejścia na skrzynię').sum==='Rozgrzewka: bez obciążenia × 8 na nogę','nogi jeszcze nie pracowały');
  ok(!W('Wiosłowanie hantlem'),'plecy rozgrzane ściąganiem drążka');ok(!W('Uginanie podudzi'),'izolacja');
  ok(/partia gotowa do ćwiczeń \(rozgrzana przy: Ściąganie drążka podchwytem\)/.test(txt('Wiosłowanie hantlem')),'wiosłowanie: informacja o rozgrzanej partii');
  ok(/partia gotowa do ćwiczeń \(rozgrzana przy: Wejścia na skrzynię\)/.test(txt('Uginanie podudzi')),'uginanie: nogi rozgrzane skrzynią');
  ok(!txt('Wejścia na skrzynię')&&!txt('Ściąganie drążka podchwytem'),'ćwiczenia z serią rozgrzewkową bez tej informacji');
  const B=app(base({day:1}));await wait(50);const pb=B.card('Podciąganie').querySelector('details.warm');
  ok(pb&&pb.querySelector('summary').textContent==='Rozgrzewka: spokojnie × 3','podciąganie po martwym ciągu: martwy nie rozgrzewa najszerszych');
  eq(A.errs,[]);eq(B.errs,[]);
});

(async()=>{
  const only=process.argv[2];
  for(const [n,f] of tests){if(only&&!n.includes(only))continue;
    try{await f();pass++;console.log('ok   '+n)}catch(e){fail++;fails.push(n);console.log('BŁĄD '+n+'\n     '+String(e&&e.message||e).split('\n')[0])}}
  console.log(`\n${pass} zaliczonych, ${fail} niezaliczonych`);process.exit(fail?1:0)})();
