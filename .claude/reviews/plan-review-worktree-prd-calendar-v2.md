# Plan Review Panel — worktree-prd-calendar-v2

**Rounds**: r1·r2 = `.claude/plans/calendar-center-layout.plan.md` (Slice B, 보류) · r3 = `.claude/plans/calendar-storage-alert-fix.plan.md` (Slice A)
**Current verdict**: `divergent` via `multi-agent` — **차단됨** (receipt 없음)
**Layers**: L1 `converged` · L2 `divergent` · L3 발화 안 함

| Round | Plan | architect | security | test | invariant | Quorum |
|---|---|---|---|---|---|---|
| r1 | Slice B `97ddbc2b` | fail (5) | **pass** (4) | fail (5) | fail (7) | 1/3 |
| r2 | Slice B `80e9050a` | fail (3) | fail (4) | fail (5) | fail (5) | 0/3 |
| r3 | Slice A `d758e2da` | fail (4) | fail (4) | fail (5) | fail (6) | 0/3 |

누적 12 에이전트 · 약 51만 토큰.

---

## r3 — 계획 자체의 결함 (전부 실물 확인, 수정 저렴)

| Severity | 지적 | 근거 |
|---|---|---|
| HIGH (architect) | 오버레이 차폐 보정이 **할 일 입력 폼을 놓쳤다.** 배너는 `.calendar-body`의 형제라 섹션 하단 전폭을 덮는데, 계획은 `.calendar-todo-list`에만 `padding-bottom`을 준다. `.calendar-todo-form`은 리스트의 형제로 패널 최하단에 있어 밀리지 않는다 — **저장 실패 배너가 다시 입력해야 할 입력창을 덮는다.** 패널이 닫혀 있을 때 월 그리드 마지막 주가 덮이는 것도 미보정 | `newtab.html:343` `<ul class="calendar-todo-list">` → `:346` `<form class="calendar-todo-form">`(형제) · `:358` `</div><!-- /.calendar-body -->` 직후 `:360` `.calendar-error` |
| HIGH (invariant) · MEDIUM (architect) | `loadFailed` 가드가 **가져오기(복구 경로)까지 막는다.** `replaceEvents()`는 전체 교체라 로드 성공에 의존하지 않는데 `persistEvents()`를 경유해 차단된다. 손상 데이터가 영구적이면 재시도가 영영 성공하지 못해 **앱이 인앱 복구 수단 없이 영구 쓰기 잠금**된다 | `newtab.js:2069-2071` `replaceEvents → persistEvents` · `:3805` `await this.calendarManager.replaceEvents(sanitized)` |
| HIGH (security) | Task 1의 "워킹 트리 전체 커밋 + `git status` 비어 있음"이 **절대 경로가 든 파일을 커밋시킨다.** 저장소에 `.gitignore`가 없고 `.claude/state\|cache\|receipts\|notes`가 전부 untracked다. r1이 지적한 절대 경로 유출 표면을 새 경로로 다시 연다 | `.claude/receipts/.migrations/v0.2.8-generic-quarantine.json:3`에 저장소 절대 경로가 들어 있다(이 문서에는 옮겨 적지 않는다) · 저장소 루트에 `.gitignore` 없음 |
| MEDIUM (architect, invariant) | 다시 시도 버튼의 소유자가 둘인데 분기 규칙이 없다. 현재 `retryPersist()`에 하드와이어돼 있고, `loadFailed` 상태에서 그것은 `persistEvents()` → 즉시 `false` — **아무 일도 안 하는 버튼**이 되어 `loadFailed`를 영영 못 푼다 | `newtab.js:2178` `errorRetryButton.addEventListener('click', () => this.retryPersist())` · `:1969-1974` |
| MEDIUM (security) | C1이 **rejection 경로만** 닫는다. 저장값이 객체·문자열로 깨지면 `Array.isArray(...) ? ... : []`가 reject 없이 `[]`를 만들고 `loadFailed`가 서지 않는다. `.filter(e => e !== null)`도 유효성 실패 항목을 조용히 버린다 | `newtab.js:1872`, `:1876` |
| MEDIUM (invariant) | C1의 "정의되지 않은 상태" 표현이 편집으로 달성되지 않는다. 생성자가 이미 `this.events = []`를 세우므로 catch 대입을 지워도 빈 배열과 구별되지 않는다. 실질 가드는 `loadFailed` 플래그뿐인데 `getEvents()`가 그것을 참조하지 않는다 | `newtab.js:1422` `this.events = [];` (생성자) |
| LOW (security) | `local-preview`의 **유입** 신뢰 경계 미정. 같은 오리진의 임의 페이지가 문법상 유효한 JSON을 써 넣으면 그대로 사용자 일정으로 로드된다. 방어가 "손상 시 reject"뿐 | 계획 Task 4 · Task 6은 유출 방향만 문서화 |
| LOW (security) | `getEvents()` 복사본의 **깊이 미규정**. 얕은 복사면 호출자가 이벤트 객체를 in-place 변형해 `persistEvents`를 우회할 수 있다 | `newtab.js:1934` JSDoc "기존 배열 in-place 변형 금지" |

## r3 — 구조적 결론: 하네스가 실패 경로를 검증할 수 없다

지적 6건이 한 곳을 가리킨다. **`test/positioning.smoke.js`에는 실패를 주입할 이음매도, 신뢰할 수 있는 단언 채널도 없다.**

| Severity | 지적 | 근거 |
|---|---|---|
| HIGH (architect) | **C3의 실패 채널과 실패 주입 테스트가 같은 `console.error`를 공유해 서로를 무효화한다.** 판정은 `errorCount === 0`을 요구하는데, Task 3·4가 주입하는 실패의 프로덕션 경로는 반드시 `console.error`를 부른다. 의도된 실패를 주입하는 순간 하네스가 영구 빨간불이 되고, 팀은 `errorCount`를 무시하게 되어 C3가 만든 유일한 채널이 죽는다 | `test/positioning.smoke.js:875` · `:100-103` 무조건 적재 · `newtab.js:1878`, `:1955` |
| HIGH (invariant) | **`errorCount`는 전역 `console.error` 카운트가 아니다.** 케이스별 스냅샷 필드에서 파생되며, `collector.add`에 3번째 인자를 넘긴 케이스에만 존재한다. `:446, :459, :516, :576, :590, :598, :719, :745`는 넘기지 않는다 — 그 케이스에 assert를 달면 실패가 조용히 사라진다. **C3의 전제가 틀렸다** | `test/positioning.smoke.js:223` · `:832` `currentJson.includes('"errors"')` |
| HIGH (invariant) | 새 채널을 고정하는 유일한 테스트가 설계상 삭제된다. 게다가 `capturedErrors = []`가 `loadApp`마다 리셋되므로, assert 이후 `loadApp`을 하는 케이스는 오류를 잃는다 | 계획 Task 2 Validate("확인 후 제거한다") · `test/positioning.smoke.js:127` |
| HIGH (test) | **C1을 검증할 주입 지점이 없다.** `loadApp()`은 `stage.src`로 `newtab.html`을 통째로 로드할 뿐이고 모듈 평가 전에 어댑터를 갈아끼울 훅이 없다. C2가 "모듈 로드 시 1회 선택"을 계약으로 못박아 런타임 교체까지 금지한다. Task 5는 이 문제를 인지해 회피했는데 Task 3은 바로 그 훅을 전제한다 | `test/positioning.smoke.js:121-147` · 계획 C2 |
| HIGH (test) | Acceptance의 "어댑터 4분기 검증"이 Validate와 다르다. `selectStorageBackend()`는 가용성만 보는 순수 함수라 **손상 JSON은 애초에 그 함수의 분기가 아니다.** `local-preview` 어댑터의 read·write·손상 reject는 chrome이 없어야 선택되므로 확장 오리진에서 도달 불가하고, 수동 절차는 해피 패스만 본다 | 계획 Task 4 Validate vs Acceptance |
| MEDIUM (invariant) | 베이스라인 완화책이 1회용이다. 비교 실행 자체가 저장된 베이스라인을 파괴하므로, 실수로 두 번째 비교를 돌리면 이미 바뀐 코드에서 베이스라인을 떠야 한다 — "재캡처가 회귀를 굳힌다"가 선택이 아니라 기정사실이 된다 | `test/positioning.smoke.js:122` · `:806-809` · `:897` |

## Refutation attempted (r3)

| Perspective | Verdict | 착지 실패한 공격 (= 계획이 방어한 것) |
|---|---|---|
| architect | fail | 인용 좌표 전수 대조 — 오인용 없음. `chrome.storage.local` 22건 실측 일치. "extension flat 키 불변"과 하네스 시드·복원의 결합, `selectStorageBackend`를 최상위 순수 함수로 두는 결정, `getEvents()` 복사본화가 하네스 케이스(`:382, :575, :640`)를 깨는지 공격 → 결함 못 세움 |
| security | fail | C2 백엔드 런타임 강등(확장 오리진에서 불가) · `loadFailed` 우회로 import 통과(단일 관문이라 막힘) · `migrateCalendarToV3`의 `__proto__` 오염(`newtab.js:303-310` 화이트리스트가 이미 닫음) · 어댑터 flat 키 변경으로 하네스 침묵시키기(C2가 못박음) |
| test | fail | 계획이 하네스 한계를 인정한 것 자체는 정직하다고 판단. 문제는 인정 후에도 **실행 불가능한 Validate가 남아 있다**는 것 |
| invariant | fail | — |
