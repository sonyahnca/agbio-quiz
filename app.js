/* 시험 대비 퀴즈 — 정적 PWA (vanilla JS) */
(function(){
'use strict';
const SUBJECTS = window.QUIZ_SUBJECTS || [];
const $app = document.getElementById('app');
const $home = document.getElementById('homeBtn');
const $timer = document.getElementById('timer');
const $title = document.getElementById('title');
const CIRC = ['①','②','③','④','⑤'];
const CHAP_NOTE = {1:'ch01-matter-atom',2:'ch02-chemical-bonding',3:'ch03-chemical-reaction',
 4:'ch04-aqueous-solution',5:'ch05-organic-chemistry',6:'ch06-biomolecules',7:'ch07-cells',
 8:'ch08-enzymes',9:'ch09-hormones',10:'ch10-carbohydrate-metabolism',11:'ch11-lipid-metabolism',
 12:'ch12-protein-metabolism',13:'ch13-nucleic-acid-metabolism',14:'ch14-crop-production',
 15:'ch15-livestock-production'};
let subj = SUBJECTS[0] || {subject:'(데이터 없음)', questions:[]};
let timerInt = null;
let maskMode = false; // 가리기(능동 회상) 모드

/* PWA 설치 — 과목별로 이 페이지 자신을 설치. 홈에서 다른 과목은 못 깐다(브라우저 제약). */
let deferredPrompt = null;
/* 이미 설치돼 standalone(앱 창)으로 열렸으면 설치 버튼을 숨긴다 */
const isStandalone = ()=> window.matchMedia('(display-mode: standalone)').matches
  || window.matchMedia('(display-mode: fullscreen)').matches
  || window.navigator.standalone === true;
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault(); deferredPrompt = e;
  const b=document.getElementById('mInstall'); if(b && !isStandalone()) b.hidden=false;
});
window.addEventListener('appinstalled', ()=>{
  deferredPrompt=null; const b=document.getElementById('mInstall'); if(b) b.hidden=true;
});

/* 인라인 SVG 아이콘 (루시드 스타일, 무의존·오프라인) */
const ICONS={
 home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
 book:'<path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z"/>',
 zap:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
 shuffle:'<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
 clipboard:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/>',
 repeat:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
 marked:'<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
 chart:'<path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8"/><rect x="12" y="6" width="3" height="12"/><rect x="17" y="13" width="3" height="5"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 eyeoff:'<path d="M9.9 4.2A9 9 0 0 1 12 5c6.5 0 10 7 10 7a13 13 0 0 1-2.2 2.9"/><path d="M6.6 6.6A13 13 0 0 0 2 12s3.5 7 10 7a9 9 0 0 0 3.4-.6"/><path d="M2 2l20 20"/>',
 check:'<path d="M20 6L9 17l-5-5"/>',
 x:'<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
 list:'<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
 pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 help:'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
 award:'<circle cx="12" cy="8" r="6"/><path d="M8.2 13.9 7 22l5-3 5 3-1.2-8.1"/>'
};
function ic(n,sz){return '<svg class="ic" width="'+(sz||20)+'" height="'+(sz||20)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[n]||'')+'</svg>';}

/* ---------- 저장(진도) ---------- */
const SKEY = 'quizStats_v1';
function loadStats(){ try{return JSON.parse(localStorage.getItem(SKEY))||{}}catch(e){return{}} }
function saveStats(s){ localStorage.setItem(SKEY, JSON.stringify(s)); }
function record(qid, correct){
  const s = loadStats(); const r = s[qid] || {s:0,c:0,w:0};
  r.s++; correct ? r.c++ : r.w++; r.last = correct?1:0; s[qid]=r; saveStats(s);
}
function resetStats(){ if(confirm('진도·정오 기록을 모두 지울까요?')){localStorage.removeItem(SKEY);render();} }

/* ---------- 유틸 ---------- */
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;}
function chapters(){const m={};subj.questions.forEach(q=>{m[q.chapter]=m[q.chapter]||{n:0,name:q.topic};m[q.chapter].n++});return m;}
function mcOnly(qs){return qs.filter(q=>q.type==='mc');}
function fmtTime(sec){const m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function esc(t){const d=document.createElement('div');d.textContent=t==null?'':t;return d.innerHTML;}
function stopTimer(){if(timerInt){clearInterval(timerInt);timerInt=null;}$timer.hidden=true;}

/* 보기 셔플: {opts:[...], correctIdx, correctSet} */
function prep(q){
  const idx = q.options.map((o,i)=>i);
  const sh = shuffle(idx);
  const opts = sh.map(i=>q.options[i]);
  const ansSet = q.answers && q.answers.length ? q.answers : (q.answer!=null?[q.answer]:[]);
  const correctSet = sh.map((orig,disp)=>ansSet.includes(orig)?disp:-1).filter(x=>x>=0);
  return {opts, correctSet};
}
/* 보기 순서 유지(기출 그대로) */
function prepPlain(q){
  const a = q.answers && q.answers.length ? q.answers : (q.answer!=null?[q.answer]:[]);
  return {opts:q.options.slice(), correctSet:a.slice()};
}
/* 빈칸(단답) 채점: 공백·괄호·붙임표 무시, 괄호 안/밖 둘 다 정답 인정 */
function normAns(s){return (s||'').toLowerCase().replace(/[\s()（）·,]/g,'').replace(/[–—\-]/g,'');}
function acceptSet(q){
  const raw=q.options[q.answer]||''; const set=new Set([normAns(raw)]);
  const m=raw.match(/^(.+?)[（(]([^)）]+)[)）]\s*$/);   // "황산암모늄(유안)" → 둘 다 인정
  if(m){set.add(normAns(m[1]));set.add(normAns(m[2]));}
  return set;
}
function gradeBlank(q,v){ if(!v||!v.trim())return false; return acceptSet(q).has(normAns(v)); }
function isBlank(q){ return route.opt&&route.opt.blank&&q.type==='mc'&&q.blankable&&q.answer!=null; }

/* 도움말(필수 용어) 팝업 */
function showHelp(){
  const t=(subj.terms||[])[0];
  const html=t?t.html:'<p class="muted">용어집이 없습니다.</p>';
  const ov=document.createElement('div'); ov.className='modal';
  ov.innerHTML=`<div class="modal-box"><button class="modal-x" id="mx">${ic('x',24)}</button><div class="mdbody">${html}</div></div>`;
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  document.body.appendChild(ov);
  byId('mx').onclick=()=>ov.remove();
  hookNoteLinks(ov);
}

/* ---------- 화면 전환 ---------- */
let route = {name:'home'};
const navStack = [];               // 뒤로가기용 화면 스택(현재 화면 아래의 이전 화면들)
function applyRoute(){ render(); window.scrollTo(0,0); }
function go(name, data){
  stopTimer();
  if(name === route.name){         // 같은 화면 재렌더(퀴즈 진행·마스크 토글 등) → 히스토리 안 쌓음
    route = {name, ...data}; applyRoute(); return;
  }
  navStack.push(route);            // 화면 전환 → 한 단계 쌓기
  route = {name, ...data};
  history.pushState({d: navStack.length}, '');
  applyRoute();
}
function goHome(){ navStack.length = 0; route = {name:'home'}; history.pushState({d:0}, ''); applyRoute(); }
function back(){ stopTimer(); route = navStack.length ? navStack.pop() : {name:'home'}; applyRoute(); }
// 폰 하드웨어/제스처 뒤로 + 화면 좌상단 버튼 → 한 단계 뒤로
window.addEventListener('popstate', ()=>{
  if(route.name === 'exam'){       // 모의고사 진행 중 이탈은 확인(취소 시 제자리)
    if(!confirm('모의고사를 나갈까요? 진행 중 답안은 사라집니다.')){
      history.pushState({d: navStack.length + 1}, ''); return;
    }
  }
  back();
});
history.replaceState({d:0}, '');   // 초기 베이스
$home.textContent = '← 뒤로';
$home.onclick = ()=>history.back();
$title.style.cursor = 'pointer';   // 제목(과목명) 탭 → 홈
$title.title = '홈으로';
$title.onclick = ()=>{ if(route.name!=='home') goHome(); };
const $help=document.getElementById('helpBtn');
if($help){ $help.innerHTML=ic('help',24); $help.onclick=showHelp; }

function render(){
  $home.hidden = (route.name==='home');
  const f = ({home:Home, quizSetup:QuizSetup, quiz:Quiz, examSetup:ExamSetup, exam:Exam, result:Result, stats:Stats, wrongbook:WrongBook, notes:Notes, note:NoteView, cheat:Cheat, review:Quiz})[route.name] || Home;
  $app.innerHTML=''; f();
}

/* ---------- 홈 ---------- */
function Home(){
  $title.innerHTML=ic('book',22)+' '+esc(subj.subject);
  const ch = chapters();
  const st = loadStats();
  const seen = Object.keys(st).length, mc = mcOnly(subj.questions).length;
  let subjSel='';
  if(SUBJECTS.length>1){
    subjSel = `<div class="row" style="margin-bottom:10px">`+SUBJECTS.map((s,i)=>
      `<button class="pill ${s===subj?'on':''}" data-si="${i}">${esc(s.subject)}</button>`).join('')+`</div>`;
  }
  $app.innerHTML = `
    ${subjSel}
    <div class="card">
      <div class="muted">문제은행</div>
      <div style="font-size:28px;font-weight:800">${subj.questions.length}문항 <small class="muted" style="font-size:16px">(객관식 ${mc} · 서술형 ${subj.questions.length-mc})</small></div>
      <div class="muted" style="margin-top:6px">학습한 문항 ${seen} · 정리노트 ${(subj.notes||[]).length}장</div>
    </div>
    <h3>공부</h3>
    <button class="btn" id="mNotes">${ic('book')} 정리노트 (${(subj.notes||[]).length}장)</button>
    <button class="btn sec" id="mCheat">${ic('zap')} 시험 직전 치트시트</button>
    <h3>문제 풀이</h3>
    <button class="btn" id="mQuiz">${ic('shuffle')} 랜덤 퀴즈</button>
    <button class="btn sec" id="mExam">${ic('clipboard')} 모의고사 (타이머)</button>
    <button class="btn sec" id="mWeak">${ic('repeat')} 약점 복습</button>
    <button class="btn sec" id="mWrong">${ic('marked')} 오답노트 <span class="muted" style="font-weight:500">${wrongList().length}</span></button>
    <button class="btn sec" id="mStats">${ic('chart')} 통계 / 진도</button>
    <button class="btn sec" id="mInstall" hidden>${ic('home')} 이 과목 앱 설치</button>
    <p class="muted" style="text-align:center;font-size:13px;margin-top:20px">
      "이 과목 앱 설치"(또는 브라우저의 "홈 화면에 추가")로 오프라인 앱처럼 사용</p>`;
  $app.querySelectorAll('[data-si]').forEach(b=>b.onclick=()=>{subj=SUBJECTS[+b.dataset.si];render();});
  byId('mQuiz').onclick=()=>go('quizSetup');
  byId('mExam').onclick=()=>go('examSetup');
  byId('mStats').onclick=()=>go('stats');
  byId('mNotes').onclick=()=>go('notes');
  byId('mCheat').onclick=()=>go('cheat');
  byId('mWrong').onclick=()=>go('wrongbook');
  const $inst=byId('mInstall');
  if($inst && !isStandalone()){
    if(deferredPrompt) $inst.hidden=false;
    $inst.onclick=async()=>{
      if(!deferredPrompt){ alert('이미 설치됐거나, 이 브라우저에선 메뉴의 "홈 화면에 추가"를 사용하세요.'); return; }
      deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; $inst.hidden=true;
    };
  }
  byId('mWeak').onclick=()=>{
    const st=loadStats();
    const pool=subj.questions.filter(q=>{const r=st[q.id];return r&&r.w>0&&r.last===0&&!r.m;});
    if(!pool.length){alert('약점(최근 틀린) 문항이 없습니다. 퀴즈를 먼저 풀어보세요.');return;}
    startQuiz(shuffle(pool), {mode:'review',title:'약점 복습'});
  };
}
function byId(id){return document.getElementById(id);}

/* 오답노트 대상: 한 번이라도 틀렸고(w>0) '이해함' 처리 안 한 문항 */
function wrongList(){
  const st=loadStats();
  return subj.questions.map(q=>({q,r:st[q.id]})).filter(x=>x.r&&x.r.w>0&&!x.r.m);
}
function setMastered(qid,v){const s=loadStats();if(s[qid]){s[qid].m=v?1:0;saveStats(s);}}

/* ---------- 정리노트 / 치트시트 ---------- */
function hookNoteLinks(root){
  root.querySelectorAll('a[href^="#note:"]').forEach(a=>{
    a.onclick=e=>{e.preventDefault();
      const slug=decodeURIComponent(a.getAttribute('href').slice(6));
      if((subj.notes||[]).some(n=>n.slug===slug)) go('note',{slug});
    };
  });
}
function Notes(){
  $title.textContent='📖 정리노트';
  const ns=subj.notes||[];
  if(!ns.length){$app.innerHTML='<div class="card muted">정리노트가 없습니다.</div>';return;}
  $app.innerHTML='<p class="muted">장을 골라 읽고, 바로 그 장 문제를 풀 수 있습니다.</p><div id="nl"></div>';
  const nl=byId('nl');
  ns.forEach(n=>{const b=document.createElement('button');b.className='btn sec';
    b.style.textAlign='left';
    const imp=n.importance==='high'?'★★★':n.importance==='med'?'★★':'★';
    b.innerHTML=`<span>${esc(n.title)}</span><br><small class="muted">${imp} · 기출 ${n.exam_freq||0}회</small>`;
    b.onclick=()=>go('note',{slug:n.slug});nl.appendChild(b);});
}
function maskBtn(){return `<button class="btn sec" id="maskT">${maskMode?ic('eye'):ic('eyeoff')} ${maskMode?'전부 보이기':'가리기(암기 점검)'}</button>`;}
function applyMask(root){
  const body=root.querySelector('.mdbody'); if(!body)return;
  if(maskMode){body.classList.add('mask');
    body.querySelectorAll('strong').forEach(s=>s.onclick=()=>s.classList.toggle('show'));}
}
function NoteView(){
  const ns=subj.notes||[]; const i=ns.findIndex(x=>x.slug===route.slug); const n=ns[i];
  if(!n){go('notes');return;}
  $title.textContent=n.chapter+'장';
  $app.innerHTML=`${maskBtn()}<div class="mdbody card">${n.html}</div>
    <button class="btn" id="cq">${ic('shuffle')} 이 장(${n.chapter}장) 문제 풀기</button>
    <div class="row">
      ${i>0?`<button class="btn sec" id="prevN" style="flex:1">← ${ns[i-1].chapter}장</button>`:''}
      <button class="btn sec" id="listN" style="flex:1">목록</button>
      ${i<ns.length-1?`<button class="btn sec" id="nextN" style="flex:1">${ns[i+1].chapter}장 →</button>`:''}
    </div>`;
  hookNoteLinks($app); applyMask($app);
  byId('maskT').onclick=()=>{maskMode=!maskMode;go('note',{slug:n.slug});};
  byId('cq').onclick=()=>{const pool=mcOnly(subj.questions.filter(q=>q.chapter===n.chapter));
    if(!pool.length){alert('이 장 객관식 문제가 없습니다.');return;}
    startQuiz(shuffle(pool),{mode:'quiz',title:n.chapter+'장 퀴즈',noteSlug:n.slug,chapter:n.chapter});};
  if(i>0)byId('prevN').onclick=()=>go('note',{slug:ns[i-1].slug});
  if(i<ns.length-1)byId('nextN').onclick=()=>go('note',{slug:ns[i+1].slug});
  byId('listN').onclick=()=>go('notes');
}
function Cheat(){
  $title.textContent='⚡ 치트시트';
  const cs=subj.cheatsheets||[];
  if(!cs.length){$app.innerHTML='<div class="card muted">치트시트가 없습니다.</div>';return;}
  const showSheet=(k)=>{$app.innerHTML=`${maskBtn()}<div class="mdbody card">${cs[k].html}</div>`;
    hookNoteLinks($app);applyMask($app);
    byId('maskT').onclick=()=>{maskMode=!maskMode;go('cheat',{cs:k});};};
  if(cs.length===1){showSheet(0);return;}
  if(route.cs!=null){showSheet(route.cs);return;}
  $app.innerHTML='<div id="cl"></div>';const cl=byId('cl');
  cs.forEach((c,k)=>{const b=document.createElement('button');b.className='btn sec';
    b.textContent=c.title||c.slug;b.onclick=()=>go('cheat',{cs:k});cl.appendChild(b);});
}

/* ---------- 오답노트 ---------- */
function WrongBook(){
  $title.textContent='📕 오답노트';
  const items=wrongList();
  if(!items.length){
    $app.innerHTML=`<div class="card" style="text-align:center">
      <div style="font-size:40px">🎉</div><div>오답노트가 비어 있습니다.</div>
      <div class="muted">퀴즈·모의고사에서 틀린 문제가 여기 모입니다.</div></div>`;
    return;
  }
  // 장별 오답 개수 분포 (많은 순)
  const dist={};
  items.forEach(({q})=>{dist[q.chapter]=dist[q.chapter]||{n:0,name:q.topic,weak:0};
    dist[q.chapter].n++; });
  const order=Object.keys(dist).map(Number).sort((a,b)=>dist[b].n-dist[a].n);
  const maxN=Math.max(...order.map(c=>dist[c].n));
  let distHtml=order.map(c=>{
    const o=dist[c];const nt=(subj.notes||[]).find(x=>x.chapter===c);
    return `<div class="bar"><div class="lbl">${c}장 ${esc(o.name)}</div>
      <div class="track"><i style="width:${o.n/maxN*100}%;background:var(--bad)"></i></div>
      <div style="width:78px;text-align:right">오답 ${o.n}개</div></div>
      ${nt?`<div class="muted" style="font-size:12px;margin:-2px 0 8px 0">📄 정리노트 복습: <a href="#note:${nt.slug}">${esc(nt.title)}</a></div>`:''}`;
  }).join('');

  // 장별 문제 목록
  let listHtml='';
  order.forEach(c=>{
    listHtml+=`<h3>${c}장 ${esc(dist[c].name)} (${dist[c].n})</h3>`;
    items.filter(x=>x.q.chapter===c).forEach(({q,r})=>{
      const ans=(q.answers&&q.answers.length?q.answers:[q.answer]).map(i=>CIRC[i]+' '+q.options[i]).join(' / ');
      const tag=r.last===0?`<span class="pill" style="color:var(--bad)">현재 약점</span>`:`<span class="pill" style="color:var(--warn)">교정됨</span>`;
      listHtml+=`<div class="card" data-q="${q.id}">
        <div style="display:flex;justify-content:space-between;gap:8px">
          <div style="font-weight:600">${esc(q.question)}</div>${tag}</div>
        <div class="muted" style="font-size:13px">틀린 횟수 ${r.w} · 시도 ${r.s}${q.source?' · '+q.source:''}</div>
        <div class="expl"><b>정답: ${esc(ans)}</b><br>${esc(q.explanation)}</div>
        <button class="btn sec mastered" data-id="${q.id}" style="margin-top:8px">✓ 이해함 (오답노트에서 빼기)</button>
      </div>`;
    });
  });

  $app.innerHTML=`
    <div class="card"><div class="muted">오답 분포 — 많은 장부터 보충</div>
      <div style="font-size:24px;font-weight:800">총 ${items.length}개 오답 · ${order.length}개 장</div></div>
    ${distHtml}
    <button class="btn" id="reviewWeak">🔁 현재 약점만 다시 풀기</button>
    ${listHtml}`;
  byId('reviewWeak').onclick=()=>{
    const pool=items.filter(x=>x.r.last===0).map(x=>x.q);
    if(!pool.length){alert('현재 약점(최근 틀린) 문항이 없습니다. 모두 교정됨 상태예요.');return;}
    startQuiz(shuffle(pool),{mode:'review',title:'오답 복습'});
  };
  $app.querySelectorAll('.mastered').forEach(b=>b.onclick=()=>{setMastered(b.dataset.id,true);go('wrongbook');});
  hookNoteLinks($app);
}

/* ---------- 랜덤 퀴즈 설정 ---------- */
let selChaps = null;
function QuizSetup(){
  $title.textContent='랜덤 퀴즈 설정';
  const ch = chapters();
  if(selChaps===null) selChaps = new Set(Object.keys(ch).map(Number));
  let count = QuizSetup.count || 20, incShort = QuizSetup.incShort||false;
  function draw(){
    $app.innerHTML = `
      <h2>출제 범위</h2>
      <div class="row"><button class="pill" id="all">전체</button><button class="pill" id="none">해제</button></div>
      <div class="chip-grid" id="chips"></div>
      <h2>문항 수</h2><div class="seg" id="cnt"></div>
      <label class="card" style="display:flex;justify-content:space-between;align-items:center">
        <span>서술형 문제 포함</span>
        <input type="checkbox" id="short" ${incShort?'checked':''} style="width:26px;height:26px">
      </label>
      <label class="card" style="display:flex;justify-content:space-between;align-items:center">
        <span>스마트 출제 <small class="muted">(틀린·안 푼 문제 우선)</small></span>
        <input type="checkbox" id="smart" ${QuizSetup.smart?'checked':''} style="width:26px;height:26px">
      </label>
      <label class="card" style="display:flex;justify-content:space-between;align-items:center">
        <span>빈칸 모드 <small class="muted">(보기 대신 정답 직접 입력 · 가능한 문제만)</small></span>
        <input type="checkbox" id="blank" ${QuizSetup.blank?'checked':''} style="width:26px;height:26px">
      </label>
      <button class="btn" id="start">시작</button>`;
    const cg=byId('chips');
    Object.keys(ch).sort((a,b)=>a-b).forEach(c=>{
      const on=selChaps.has(+c);
      const b=document.createElement('button');b.className='chip'+(on?' on':'');
      b.innerHTML=`<span>${c}장 ${esc(ch[c].name)}</span><small>${ch[c].n}</small>`;
      b.onclick=()=>{on?selChaps.delete(+c):selChaps.add(+c);draw();};
      cg.appendChild(b);
    });
    const seg=byId('cnt');[10,20,30,'전체'].forEach(n=>{
      const b=document.createElement('button');b.textContent=n;b.className=(count===n?'on':'');
      b.onclick=()=>{count=n;QuizSetup.count=n;draw();};seg.appendChild(b);
    });
    byId('all').onclick=()=>{selChaps=new Set(Object.keys(ch).map(Number));draw();};
    byId('none').onclick=()=>{selChaps=new Set();draw();};
    byId('short').onchange=e=>{incShort=e.target.checked;QuizSetup.incShort=incShort;};
    byId('smart').onchange=e=>{QuizSetup.smart=e.target.checked;};
    byId('blank').onchange=e=>{QuizSetup.blank=e.target.checked;};
    byId('start').onclick=()=>{
      let pool=subj.questions.filter(q=>selChaps.has(q.chapter));
      if(!incShort) pool=mcOnly(pool);
      if(!pool.length){alert('범위를 선택하세요.');return;}
      pool=shuffle(pool);
      if(QuizSetup.smart){ const st=loadStats();
        // 우선순위: 최근 틀림(0) > 안 푼 것(1) > 맞춘 것(2)
        const rank=q=>{const r=st[q.id]; if(r&&r.w>0&&r.last===0)return 0; if(!r)return 1; return 2;};
        pool.sort((a,b)=>rank(a)-rank(b)); }
      if(count!=='전체') pool=pool.slice(0,count);
      if(QuizSetup.smart) pool=shuffle(pool); // 선정 후 순서는 섞기
      startQuiz(pool,{mode:'quiz',title:QuizSetup.smart?'스마트 퀴즈':'랜덤 퀴즈',blank:QuizSetup.blank});
    };
  }
  draw();
}

/* ---------- 퀴즈(즉시 채점) ---------- */
function startQuiz(pool,opt){ go('quiz',{pool,i:0,score:0,wrong:[],opt,prep:prep(pool[0])}); }
function Quiz(){
  const r=route; const q=r.pool[r.i]; $title.textContent=r.opt.title;
  const total=r.pool.length;
  const wrap=document.createElement('div');
  wrap.innerHTML=`<div class="card">
    <div class="qmeta"><span class="qnum">${r.i+1} / ${total}</span>
      <span class="qsrc">${q.chapter}장 ${esc(q.topic)}${q.source?' · '+q.source:''}</span></div>
    <div class="qtext">${esc(q.question)}</div>
    <div id="opts"></div><div id="fb"></div></div>`;
  $app.appendChild(wrap);
  const $opts=wrap.querySelector('#opts'), $fb=wrap.querySelector('#fb');

  if(isBlank(q)){
    $opts.innerHTML=`<div class="blankrow">
      <input id="bi" class="blankin" type="text" inputmode="text" autocomplete="off" autocapitalize="off" placeholder="정답을 입력하고 Enter">
      <button class="btn" id="bchk" style="flex:0 0 64px">확인</button></div>
      <button class="btn sec" id="bskip">모르겠음 (정답 보기)</button>`;
    const inp=byId('bi'); setTimeout(()=>inp.focus(),50);
    let done=false;
    const submit=(skip)=>{
      if(done)return; done=true;
      const val=inp.value.trim(); const ok=!skip&&gradeBlank(q,val);
      inp.disabled=true; byId('bchk').disabled=true; byId('bskip').disabled=true;
      record(q.id,ok); if(ok)r.score++; else r.wrong.push(q);
      const ca=q.options[q.answer];
      $fb.innerHTML=`<div class="expl"><b style="color:${ok?'var(--ok)':'var(--bad)'}">${ic(ok?'check':'x',18)} ${ok?'정답':(skip?'넘어감':'오답')}</b> — 정답: <b>${esc(ca)}</b>${(!ok&&val)?` <span class="muted">(입력: ${esc(val)})</span>`:''}<br>${esc(q.explanation)}</div>`;
      nextBar();
    };
    byId('bchk').onclick=()=>submit(false);
    byId('bskip').onclick=()=>submit(true);
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit(false);}});
  } else if(q.type==='mc'){
    const P=r.prep;
    P.opts.forEach((o,disp)=>{
      const b=document.createElement('button');b.className='opt';
      b.innerHTML=`<span class="num">${CIRC[disp]}</span><span>${esc(o)}</span>`;
      b.onclick=()=>answerMC(disp);$opts.appendChild(b);
    });
    function answerMC(disp){
      const correct=P.correctSet.includes(disp);
      [...$opts.children].forEach((b,i)=>{b.disabled=true;
        if(P.correctSet.includes(i))b.classList.add('correct');
        else if(i===disp)b.classList.add('wrong');});
      record(q.id,correct); if(correct)r.score++; else r.wrong.push(q);
      $fb.innerHTML=`<div class="expl"><b style="color:${correct?'var(--ok)':'var(--bad)'}">${ic(correct?'check':'x',18)} ${correct?'정답':'오답'}</b> — 정답 ${P.correctSet.map(i=>CIRC[i]).join('·')}<br>${esc(q.explanation)}</div>`;
      nextBar();
    }
  } else {
    const b=document.createElement('button');b.className='btn sec';b.textContent='정답 보기';
    b.onclick=()=>{
      $fb.innerHTML=`<div class="expl short"><b>정답</b><br>${esc(q.explanation)}</div>
        <div class="row" style="margin-top:10px"><button class="btn" id="ok" style="background:var(--ok)">맞음</button>
        <button class="btn" id="ng" style="background:var(--bad)">틀림</button></div>`;
      byId('ok').onclick=()=>{record(q.id,true);r.score++;next();};
      byId('ng').onclick=()=>{record(q.id,false);r.wrong.push(q);next();};
    };
    $opts.appendChild(b);
  }
  function nextBar(){
    const bar=document.createElement('div');bar.className='fixedbar';
    bar.innerHTML=`<div class="progress"><i style="width:${(r.i+1)/total*100}%"></i></div>
      <button class="btn" id="nx" style="flex:0 0 130px">${r.i+1<total?'다음 →':'결과 보기'}</button>`;
    $app.appendChild(bar);byId('nx').onclick=next;
  }
  function next(){ if(r.i+1<total){r.i++;r.prep=prep(r.pool[r.i]);go('quiz',r);} else finishQuiz(r); }
}
function finishQuiz(r){
  go('result',{kind:'quiz',title:r.opt.title,total:r.pool.length,score:r.score,wrong:r.wrong,pool:r.pool,
    noteSlug:r.opt.noteSlug,chapter:r.opt.chapter});
}

/* ---------- 모의고사 설정 ---------- */
function ExamSetup(){
  $title.textContent='모의고사 설정';
  const mc=mcOnly(subj.questions);
  let count=ExamSetup.count||35, mins=ExamSetup.mins||50;
  const exs=subj.exams||[];
  function draw(){
    const exHtml = exs.length ? `<h2>기출 회차 (실제 출제 그대로)</h2>
      <p class="muted" style="margin:0 0 8px">아래 회차를 누르면 그 해 기출을 타이머와 함께 풉니다.</p>
      <div class="seg" id="exrow">`+exs.map(e=>`<button data-y="${e.year}">${e.year}<br><small class="muted">${e.count}문항</small></button>`).join('')+`</div>` : '';
    $app.innerHTML=`
      ${exHtml}
      <h2>또는 무작위 모의고사</h2>
      <div class="card muted">문제은행 객관식 <b>${mc.length}문항</b>에서 무작위 출제, 제출 후 일괄 채점.</div>
      <h2>문항 수</h2><div class="seg" id="cnt"></div>
      <h2>제한 시간(분)</h2><div class="seg" id="min"></div>
      <button class="btn" id="start">모의고사 시작</button>`;
    const c=byId('cnt');[20,35,70,'전체'].forEach(n=>{const real=(n==='전체')?mc.length:n;
      const b=document.createElement('button');b.textContent=n+(n==='전체'?` (${mc.length})`:'');
      b.className=(count===n?'on':'');b.onclick=()=>{count=n;ExamSetup.count=n;draw();};
      if(typeof n==='number'&&n>mc.length)b.disabled=true,b.style.opacity=.4;c.appendChild(b);});
    const m=byId('min');[0,30,50,70].forEach(n=>{const b=document.createElement('button');
      b.textContent=n===0?'무제한':n;b.className=(mins===n?'on':'');
      b.onclick=()=>{mins=n;ExamSetup.mins=n;draw();};m.appendChild(b);});
    if(exs.length) $app.querySelectorAll('#exrow button').forEach(b=>b.onclick=()=>{
      const e=exs.find(x=>String(x.year)===b.dataset.y);
      const pool=e.questions.map(q=>({q,prep:prepPlain(q),pick:null}));
      go('exam',{pool,i:0,mins,started:Date.now(),examName:'기출 '+e.year});
    });
    byId('start').onclick=()=>{
      let pool=shuffle(mc);const n=(count==='전체')?mc.length:Math.min(count,mc.length);
      pool=pool.slice(0,n).map(q=>({q,prep:prep(q),pick:null}));
      go('exam',{pool,i:0,mins,started:Date.now()});
    };
  }
  draw();
}

/* ---------- 모의고사(OMR, 타이머) ---------- */
function Exam(){
  const r=route;$title.textContent='모의고사';
  if(r.mins>0){$timer.hidden=false;
    const tick=()=>{const left=r.mins*60-Math.floor((Date.now()-r.started)/1000);
      if(left<=0){$timer.textContent='00:00';submitExam(r);return;}
      $timer.textContent=fmtTime(left);};
    tick();timerInt=setInterval(tick,1000);
  } else {$timer.hidden=false;const t0=r.started;
    timerInt=setInterval(()=>$timer.textContent=fmtTime(Math.floor((Date.now()-t0)/1000)),1000);}
  drawQ();
  function drawQ(){
    const it=r.pool[r.i],q=it.q,P=it.prep,total=r.pool.length;
    $app.innerHTML=`<div class="card">
      <div class="qmeta"><span class="qnum">${r.i+1} / ${total}</span><span class="qsrc">${q.chapter}장</span></div>
      <div class="qtext">${esc(q.question)}</div><div id="opts"></div></div>
      <div id="nav"></div>`;
    const $o=byId('opts');
    P.opts.forEach((o,disp)=>{const b=document.createElement('button');
      b.className='opt'+(it.pick===disp?' sel':'');
      b.innerHTML=`<span class="num">${CIRC[disp]}</span><span>${esc(o)}</span>`;
      b.onclick=()=>{it.pick=disp;drawQ();};$o.appendChild(b);});
    const nav=byId('nav');
    nav.innerHTML=`<h3>답안지 (탭하여 이동)</h3><div class="omr" id="omr"></div>`;
    const omr=byId('omr');
    r.pool.forEach((x,k)=>{const b=document.createElement('button');b.textContent=k+1;
      if(x.pick!=null)b.classList.add('done');if(k===r.i)b.classList.add('cur');
      b.onclick=()=>{r.i=k;drawQ();};omr.appendChild(b);});
    const bar=document.createElement('div');bar.className='fixedbar';
    const done=r.pool.filter(x=>x.pick!=null).length;
    bar.innerHTML=`<button class="btn sec" id="prev" style="flex:0 0 90px" ${r.i===0?'disabled':''}>← 이전</button>
      <button class="btn sec" id="next" style="flex:0 0 90px" ${r.i+1>=total?'disabled':''}>다음 →</button>
      <button class="btn" id="sub">제출 (${done}/${total})</button>`;
    $app.appendChild(bar);
    byId('prev').onclick=()=>{r.i--;drawQ();};byId('next').onclick=()=>{r.i++;drawQ();};
    byId('sub').onclick=()=>{const left=total-done;
      if(left>0&&!confirm(`미응답 ${left}문항이 있습니다. 제출할까요?`))return;submitExam(r);};
  }
}
function submitExam(r){
  stopTimer();let score=0;const wrong=[];const byChap={};
  r.pool.forEach(it=>{const correct=it.pick!=null&&it.prep.correctSet.includes(it.pick);
    record(it.q.id,correct);if(correct)score++;else wrong.push(it.q);
    const c=it.q.chapter;byChap[c]=byChap[c]||{c:0,t:0,name:it.q.topic};byChap[c].t++;if(correct)byChap[c].c++;});
  go('result',{kind:'exam',title:'모의고사 결과',total:r.pool.length,score,wrong,byChap,
    pool:r.pool.map(x=>x.q),elapsed:Math.floor((Date.now()-r.started)/1000)});
}

/* ---------- 결과 ---------- */
function Result(){
  const r=route;$title.textContent=r.title;
  const pct=Math.round(r.score/r.total*100);
  const grade=pct>=80?'grade-good':pct>=60?'':'grade-bad';
  let chHtml='';
  if(r.byChap){chHtml='<h3>장별 정답률</h3>';
    Object.keys(r.byChap).sort((a,b)=>a-b).forEach(c=>{const o=r.byChap[c];const p=Math.round(o.c/o.t*100);
      const col=p>=80?'var(--ok)':p>=50?'var(--warn)':'var(--bad)';
      chHtml+=`<div class="bar"><div class="lbl">${c}장 ${esc(o.name)}</div>
        <div class="track"><i style="width:${p}%;background:${col}"></i></div><div>${o.c}/${o.t}</div></div>`;});
  }
  let wrongHtml='';
  if(r.wrong.length){wrongHtml='<h3>틀린 문제 ('+r.wrong.length+')</h3>';
    r.wrong.forEach(q=>{const ans=(q.answers&&q.answers.length?q.answers:[q.answer]).map(i=>CIRC[i]+' '+q.options[i]).join(' / ');
      wrongHtml+=`<div class="card"><div style="font-weight:600">${esc(q.question)}</div>
        <div class="expl"><b>정답: ${esc(ans)}</b><br>${esc(q.explanation)}</div></div>`;});
  }
  // 노트(이 장 문제 풀기)에서 온 경우: 노트로 돌아가기 / 다음 장 노트 버튼
  const ns=subj.notes||[]; const ni=r.noteSlug?ns.findIndex(x=>x.slug===r.noteSlug):-1;
  const nextN=(ni>=0&&ni<ns.length-1)?ns[ni+1]:null;
  const noteNav = r.noteSlug ? `<div class="row">
      <button class="btn sec" id="backNote" style="flex:1">${ic('book')} ${r.chapter}장 노트로</button>
      ${nextN?`<button class="btn" id="nextNote" style="flex:1">${nextN.chapter}장 노트 →</button>`:''}
    </div>` : '';
  $app.innerHTML=`
    <div class="card"><div class="score ${grade}">${pct}<small>%</small></div>
      <div style="text-align:center" class="muted">${r.score} / ${r.total} 정답${r.elapsed!=null?' · 소요 '+fmtTime(r.elapsed):''}</div></div>
    ${chHtml}
    ${noteNav}
    ${r.wrong.length?`<button class="btn" id="re">🔁 틀린 문제만 다시 풀기</button>`:''}
    <button class="btn sec" id="again">다시 (같은 모드)</button>
    <button class="btn sec" id="home2">홈으로</button>
    ${wrongHtml}`;
  if(r.noteSlug){ byId('backNote').onclick=()=>go('note',{slug:r.noteSlug});
    if(nextN)byId('nextNote').onclick=()=>go('note',{slug:nextN.slug}); }
  if(r.wrong.length)byId('re').onclick=()=>startQuiz(shuffle(r.wrong.slice()),{mode:'review',title:'오답 복습'});
  byId('again').onclick=()=>go(r.kind==='exam'?'examSetup':'quizSetup');
  byId('home2').onclick=()=>goHome();
}

/* ---------- 통계 ---------- */
function Stats(){
  $title.textContent='통계 / 진도';const st=loadStats();const ch=chapters();
  const agg={};let tot=0,cor=0;
  subj.questions.forEach(q=>{const r=st[q.id];if(!r)return;
    agg[q.chapter]=agg[q.chapter]||{s:0,c:0,name:q.topic};
    agg[q.chapter].s+=r.s;agg[q.chapter].c+=r.c;tot+=r.s;cor+=r.c;});
  let bars='';Object.keys(ch).sort((a,b)=>a-b).forEach(c=>{const o=agg[c];
    const p=o?Math.round(o.c/o.s*100):null;const col=p==null?'var(--border)':p>=80?'var(--ok)':p>=50?'var(--warn)':'var(--bad)';
    bars+=`<div class="bar"><div class="lbl">${c}장 ${esc(ch[c].name)}</div>
      <div class="track"><i style="width:${p||0}%;background:${col}"></i></div>
      <div>${o?o.c+'/'+o.s:'-'}</div></div>`;});
  $app.innerHTML=`
    <div class="card"><div class="muted">누적 정답률</div>
      <div class="score">${tot?Math.round(cor/tot*100):0}<small>%</small></div>
      <div class="muted" style="text-align:center">전체 시도 ${tot}회</div></div>
    <h3>장별 정답률 (낮은 장 = 약점)</h3>${bars}
    <button class="btn" id="toWrong" style="margin-top:14px">📕 오답노트 (${wrongList().length})</button>
    <button class="btn sec" id="reset" style="margin-top:8px;color:var(--bad)">기록 초기화</button>`;
  byId('toWrong').onclick=()=>go('wrongbook');
  byId('reset').onclick=resetStats;
}

render();
})();
