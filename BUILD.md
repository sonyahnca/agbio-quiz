# 퀴즈/학습 PWA — 빌드 & 재현 명세

> 다른 세션(또는 다른 사람)이 **이 앱을 처음부터 똑같이 만들거나 유지**할 수 있도록 한 명세.
> 핵심 원칙: **md(공부용, 원천) → `build_questions.py`(빌드) → `data/<과목>.js`(앱 데이터)**. 앱은 데이터만 읽는다.

## 0. 무엇인가
- 위키(`<과목>/wiki/`)의 **drills(문제)·topics(정리노트)·cheatsheets**를 재료로 한 **정적 PWA 학습 허브**.
- 기능: 정리노트 뷰어(+가리기 능동회상) · 치트시트 · 랜덤퀴즈(스마트 출제) · 모의고사(타이머+OMR) · 약점복습 · 오답노트 · 통계.
- 무의존(바닐라 JS), 무빌드(번들러 없음), 오프라인(SW), `file://`·호스팅 양쪽 동작.

## 1. 디렉토리
```
_app/
├── index.html              # 셸. <script src="data/<과목>.js"> 로 과목 등록
├── app.js                  # 전체 로직(SPA, 라우팅 객체 render())
├── style.css               # 다크/라이트, 태블릿 최적화, .mdbody(노트), .mask(가리기)
├── data/<과목>.{json,js}    # 빌드 산출물 (js는 window.QUIZ_SUBJECTS.push(번들))
├── build_questions.py      # 빌드 스크립트 (★로컬 전용, .gitignore)
├── serve.js                # 로컬 node 정적 서버 (★로컬 전용, .gitignore)
├── manifest.webmanifest · icon.svg · sw.js   # PWA(설치·오프라인, network-first)
└── .github/workflows/deploy.yml              # GitHub Pages 자동 배포
```

## 2. 데이터 모델 (`window.QUIZ_SUBJECTS`의 한 원소 = 한 과목 번들)
```js
{ subject:"농업생물화학", count, mc_count,
  questions:[{ id, subject, chapter:int, topic, type:"mc"|"short",
               question, options:[4개 또는 []], answer:0~3|null,
               answers:[복수정답]|null, explanation, source:"2016-Q22"|null }],
  notes:[{ slug, chapter, title, importance, exam_freq, html }],   // 정리노트(HTML)
  cheatsheets:[{ slug, title, html }] }
```
- 멀티 과목: 과목마다 `data/<과목>.js` 1개 + `index.html`에 `<script>` 1줄. 앱이 과목 탭 자동 생성.
- **슬러그·id는 vault 전체 유일**해야 함. 새 과목은 접두 사용(토양학 `soil-`, 농유전 `gen-`).

## 3. 파서가 읽는 md 형식 (★중요 — 이 형식을 지켜야 자동 추출됨)
### drills (`<과목>/wiki/drills/ch*-drills.md`)
```
## A. 객관식 ...
**1. 질문 텍스트?** (선택: (2016 Q22) 형태 출처)
① 보기1 ② 보기2 ③ 보기3 ④ 보기4
<details><summary>정답·해설</summary>

**③** — 해설 텍스트
</details>
```
- 정답 마커 `**③**`(또는 중복 `**③·④**`)가 details 본문 맨 앞.
- 보기 없는 서술형은 `type:"short"`(정답만). 출처 `(20YY Q?)`는 헤더에서 자동 추출.
### topics / cheatsheets
- 일반 마크다운(YAML 프론트매터 포함). 빌드 시 `markdown` 라이브러리로 HTML화.
- 표(`| |`)·`**굵게**`(=가리기 대상)·`> 인용`·`[[위키링크]]` 지원.
- `[[slug|라벨]]` → 앱 내부 이동 링크(`#note:slug`). topics 슬러그만 이동, 그 외는 무시.

## 4. 빌드 & 미리보기 & 배포
```bash
# 의존: python3 + markdown,  node(미리보기),  poppler/pyhwp(원본 읽기 시)
python3 _app/build_questions.py      # md → data/<과목>.{json,js}  (무결성 체크 출력)
node _app/serve.js                   # http://localhost:8778 (절대경로 ROOT 하드코딩)
# 배포(GitHub Pages): _app가 자체 git repo. push 하면 deploy.yml가 자동 배포
cd _app && git add -A && git commit -m "..." && git push    # → https://<id>.github.io/<repo>/
```
- 새 과목 추가: `build_questions.py`의 `SUBJ_DIR/SUBJECT/CHAP_NAME`을 과목에 맞게(또는 인자화) → 빌드 → `index.html`에 `<script>` 추가.
- SW는 **network-first(`quiz-vN`)** — 온라인이면 갱신 즉시 반영. 전략 바꾸면 캐시 버전(N) 올릴 것.

## 5. app.js 구조 요약 (수정 지점)
- `render()`의 라우팅 객체에 화면 함수 매핑. 화면: Home/Notes/NoteView/Cheat/QuizSetup/Quiz/ExamSetup/Exam/Result/WrongBook/Stats.
- 진도: `localStorage['quizStats_v1']` = `{ [qid]:{s,c,w,last,m} }` (s시도 c정답 w오답 last최근 m이해함). 과목은 qid 접두로 분리.
- 아이콘: `ICONS`+`ic(name,size)` 인라인 SVG(루시드 스타일, 무의존).
- 가리기: `maskMode` + `.mdbody.mask strong` CSS + 탭 토글.

## 6. 원본 읽기 도구(참고)
- PDF 스캔본: `pdftoppm -png -r 200 file.pdf out` 후 이미지 OCR. 텍스트 PDF: `pdftotext -f S -l E file -`.
- HWP: `~/Library/Python/3.9/bin/hwp5txt file.hwp` (pyhwp).
