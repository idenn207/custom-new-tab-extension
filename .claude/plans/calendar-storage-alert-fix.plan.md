# Plan: 저장 신뢰성 + 오류 배너 (Slice A)

**Source PRD**: `.claude/prds/calendar-widget-v2.prd.md`
**Selected Milestone**: (신규) M1.5a — 사용자가 실제로 겪는 두 버그 + 그 과정에서 드러난 데이터 소실 경로
**Complexity**: Small
**Deferred sibling**: 센터 레이아웃·태그는 Slice B로 분리 — `.claude/plans/calendar-center-layout.plan.md`

## Summary

사용자가 보고한 두 가지를 고친다: localhost에서 할 일 저장이 실패하는 것, 그 오류 배너가 영역을 먹어 스크롤을 만드는 것. 원인 조사 중 **선재 데이터 소실 경로**가 하나 드러나 함께 고친다 — `loadEvents()`의 catch가 모든 읽기 실패를 "빈 목록"으로 바꾸고, 다음 조작 한 번이 그 빈 목록을 스토리지에 커밋해 이전 일정을 전부 지운다.

레이아웃·태그는 이 슬라이스에 없다. 화면은 지금과 똑같이 보여야 한다 — 기존 스모크 케이스가 전부 diff 0인 것이 이 계획의 성공 조건 중 하나다.

## User Intent

| ID | Constraint (user-stated) | Kind |
|---|---|---|
| UI7 | localhost 환경에서 할 일을 저장할 때 오류가 뜨는 문제를 해결한다 | constraint |
| UI8 | 아래쪽 알럿이 영역을 차지해 스크롤이 생기는 문제를 해결한다 | constraint |
| UI3 | 지금 구현된 디자인을 일단 백업해 남긴다 | constraint |
| UI11 | 버그를 먼저 떼어내 고치고 레이아웃과 태그는 별도 계획으로 미룬다 | direction |

## Core Contracts

### C1 — 읽기 실패는 빈 목록이 아니다

읽기가 실패하면 `this.events`는 **정의되지 않은 상태**이지 빈 목록이 아니다. 그 상태에서 쓰기는 금지된다.

- `loadEvents()`가 실패하면 `loadFailed = true`를 세우고 오류를 표면화한다. `this.events = []`를 "정상"으로 취급하지 않는다.
- `loadFailed`인 동안 `persistEvents()`는 즉시 실패를 반환한다. 내보내기도 거절한다.
- 재시도가 성공해야만 `loadFailed`가 풀린다.

근거: `newtab.js:1877-1880`의 catch가 **모든** rejection을 `this.events = []`로 바꾸고, 이어서 `addEvent()`가 `persistEvents(this.events.concat(event))`(`newtab.js:2013-2017`)로 `[한 건]`을 커밋한다. 저장돼 있던 일정이 전부 사라진다. `toggleEvent()`(`:2048`)·`deleteEvent()`(`:2060`)도 같다. PRODUCT.md 원칙 4("저장된 척하지 않는다")의 읽기 쪽 대응물이다.

### C2 — 백엔드는 시작 시 1회 고르고 런타임에 바꾸지 않는다

- 선택은 **가용성 기준 1회**. 런타임 오류(quota·손상)에서 다른 백엔드로 넘어가지 않는다. 넘어가면 사용자가 적은 것이 다른 곳에 저장되고 UI는 성공한 척한다.
- `extension` 백엔드는 `chrome.storage.local`의 **flat 키 스키마를 그대로 통과**시킨다. 키 형태를 바꾸면 스모크 하네스의 시드·백업·복원(`test/positioning.smoke.js:122-124`, `:784`)이 침묵으로 깨진다.
- 손상 JSON·접근 불가는 **reject**한다. 빈 객체를 반환하지 않는다 — C1이 그 rejection을 받아 표면화한다.

### C3 — 단언은 베이스라인과 무관한 채널로 실패한다

하네스의 판정은 `passed = failCount === 0 && errorCount === 0`(`test/positioning.smoke.js:875`)이다. `failCount`는 베이스라인 대비 JSON 차이라 **베이스라인을 다시 뜨면 틀린 값이 정상이 된다.** `errorCount`는 iframe의 `console.error`를 후킹해 세므로(`:96-109`) 베이스라인과 무관하다.

- 참·거짓 단언은 스냅샷 값으로만 기록하지 않고, 실패 시 iframe의 `console.error`를 호출해 `errorCount`로 올린다.
- 이 슬라이스는 하네스의 부분 비교·해시 스탬프 앵커를 만들지 않는다. Slice B의 선행 과제로 남긴다(아래 Deferred).

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| 저장 실패 계약 | `newtab.js:1937` `persistEvents()` | 성공해야만 커밋 · 실패 시 무변경 · 배너 + 동일 payload 재시도 |
| 실패 표면화 | `newtab.js:1991` `showError()` · `:1969` `retryPersist()` | 배너 + 다시 시도 버튼. C1의 읽기 실패가 같은 표면을 재사용한다 |
| 입력 차단 | `newtab.js:1980` `setPendingState()` | 클래스 토글 + 입력 `disabled` |
| 최상위 함수를 하네스가 직접 호출 | `test/positioning.smoke.js:371, 443, 511, 579` | `frameWindow.makeDateKey()` · `frameWindow.migrateCalendarToV3()`. `selectStorageBackend()`도 같은 방식으로 검증한다 |
| 앱 인스턴스 접근 | `newtab.js:3922` `window.__newTabApp` · `test/positioning.smoke.js:149` | 하네스가 매니저를 잡아 메서드를 직접 부른다. 배너 기하 검증이 이걸 쓴다 |
| 불리언 사실 기록 | `test/positioning.smoke.js:760-763` `v2Promoted: Boolean(...)` | 판정을 스냅샷 값으로 남기는 기존 관례. C3의 `console.error`를 여기에 덧댄다 |
| 하네스 격리 | `test/positioning.smoke.js:121, 784-809` | 원본 storage 백업 → 시드 → 실행 → 복원 |

## Files to Change

| File | Action | Why |
|---|---|---|
| `newtab.js` | UPDATE | 스토리지 어댑터 · `loadFailed` 상태 · 마이그레이션 실패 기록 · `getEvents()` 방어 |
| `newtab.css` | UPDATE | 오류 배너 오버레이화 · 프리뷰 고지 한 줄 |
| `newtab.html` | UPDATE | 프리뷰 고지 노드 |
| `test/positioning.smoke.js` | UPDATE | assert 채널 · 어댑터 4분기 · 배너 무반동 · C1 보존 케이스 |
| `README.md` | UPDATE | localhost 미리보기 동작과 데이터 잔존 · 읽기 실패 시 동작 |

## Tasks

### Task 1: 복구 지점 만들기 (코드 변경 전 필수)
- **Action**: 워킹 트리 전체를 WIP 커밋으로 고정한다.
- **왜 먼저인가**: M1 구현 1,776줄이 전부 미커밋이다. 다음 태스크의 첫 편집이 유일본을 덮는다.
- **`prototypes/` 복사는 하지 않는다 (r1 대비 변경)**: 커밋이 곧 백업이고 파일 복사보다 낫다 — diff 가능하고, 복원 가능하고, 드리프트하지 않는다. 이 슬라이스는 레이아웃을 건드리지 않으므로 상단 디자인이 위험해지는 시점은 Slice B다. 거기서 필요하면 그때 뜬다. r1 심사에서 `prototypes/`가 절대 경로 유출 표면으로 지적된 것도 이 판단에 들어갔다.
- **Validate**: `git status --short`가 비어 있고 `git log --oneline -1`이 스냅샷 커밋을 가리킨다.

### Task 2: 하네스에 베이스라인 무관 실패 채널 (C3)
- **Action**: 하네스에 `assert(cond, message)`를 추가한다. 실패 시 `frameWindow.console.error('[ASSERT] ' + message)`를 호출해 `capturedErrors`에 실리게 하고, 판정값 자체도 스냅샷에 기록한다. 두 채널 모두 쓴다.
- **Mirror**: `test/positioning.smoke.js:96-109` console.error 후킹 · `:760-763` 불리언 사실 기록.
- **왜 여기부터인가**: 이후 모든 태스크의 Validate가 이 채널에 의존한다. 이게 없으면 단언이 "베이스라인만 다시 뜨면 초록"이 된다.
- **범위 한계 (정직하게)**: 이건 실패 채널만 만든다. 부분 비교·해시 스탬프 앵커·`loadApp`의 `storage.clear()`가 `BASELINE_KEY`를 지우는 문제는 **고치지 않는다.** Slice B의 선행 과제다.
- **Validate**: 일부러 `assert(false, ...)`를 넣은 임시 케이스가 요약을 빨간불로 만든다. 확인 후 제거한다.

### Task 3: 읽기 실패를 빈 목록으로 바꾸지 않는다 (C1)
- **Action**: `loadEvents()`(`newtab.js:1869`)의 catch를 고친다 — `this.events = []` 대신 `this.loadFailed = true`를 세우고 `showError('할 일을 불러오지 못했습니다. 새로 고치거나 다시 시도해 주세요.')`를 띄운다. `persistEvents()`는 `loadFailed`면 즉시 `false`를 반환한다. `pending` 가드와 같은 자리다. 내보내기도 거절한다. 다시 시도 버튼이 `loadEvents()`를 재시도하고, 성공해야 플래그가 풀린다.
- **Mirror**: `newtab.js:1938` `if (this.pending) return false;` 가드와 `:1969` `retryPersist()` 재시도 관용구.
- **`getEvents()` 방어 (r2 security LOW)**: `newtab.js:2077`이 내부 배열을 참조로 넘긴다. 복사본을 반환하도록 바꾼다 — 이 메서드가 C1의 전체 집합 계약을 지는 위치가 되므로 방어적이어야 한다.
- **선재 결함임을 명시**: 이 버그는 오늘도 존재한다. `chrome.storage.local.get`이 던지면 그대로 발생한다. Task 4가 reject 경로를 설계 동작으로 만들면서 도달 가능성이 크게 올라가므로 **Task 4보다 먼저** 고친다.
- **Validate**: 항상 reject하는 읽기를 주입한 뒤 (a) 배너가 뜨고 (b) 할 일 추가가 거절되며 (c) **스토리지의 기존 일정이 그대로 남아 있는지** 확인한다. (c)가 이 태스크의 존재 이유다.

### Task 4: 스토리지 어댑터 — localhost 저장 실패 해소 (UI7, C2)
- **Action**: `chrome.storage.local` 직접 호출 22곳을 어댑터로 바꾼다.
  - `selectStorageBackend({ chromeRef, localStorageRef })` — **최상위 순수 함수**, `'extension'` · `'local-preview'` · `'none'` 중 하나를 반환. 하네스가 `frameWindow.selectStorageBackend()`로 직접 호출해 검증한다. `test/positioning.smoke.js:443`의 `migrateSettingsToV2` 호출과 같은 패턴이다.
  - `extension` → `chrome.storage.local` 통과. **flat 키 스키마 불변**(C2).
  - `local-preview` → 단일 네임스페이스 JSON 키. 손상 시 **reject**.
  - `none` → 모든 읽기·쓰기 reject.
- **모듈 로드 시 1회 선택**(C2). `document.body.dataset.storageBackend`는 `Application.initialize()`에서 설정한다 — 모듈 평가 시점에는 `body`가 없을 수 있다.
- **사용자 가시 고지 (원칙 4)**: `local-preview`가 활성이면 **화면에 보이는 한 줄** — "미리보기 모드 · 확장 저장소가 아닌 이 브라우저에만 저장됩니다". `console.warn`과 `dataset`만으로는 부족하다. 저장 위치가 사용자 기대와 다를 때 침묵하지 않는다.
- **마이그레이션 실패를 삼키지 않는다 (r2 security MEDIUM)**: `newtab.js:261-263`·`:317-319`의 catch가 어댑터 rejection을 조용히 먹는다. 실패를 기록해 위 고지 줄에 반영한다.
- **Validate**: `node --check newtab.js`. 하네스가 `selectStorageBackend()`에 가짜 `chromeRef`·`localStorageRef`를 주입해 **네 분기를 전부** 검증한다. 확장 오리진에서 실행 가능하다. localhost 실환경 확인은 **수동**이며 Validation 절에 그렇게 표시한다.

### Task 5: 오류 배너를 높이 예산에서 뺀다 (UI8)
- **Action**: `.calendar-error`(`newtab.css:1330`)를 flex 자식에서 **absolute 오버레이**로 바꾼다. 컨테이너에 `position: relative`, 배너는 안쪽 아래 모서리 고정. 나타나고 사라지는 것이 형제 요소 크기 계산에 참여하지 않는다.
- **Mirror**: `newtab.css:1341` `.calendar-error[hidden] { display: none }` 숨김 계약 유지.
- **왜 이게 원인인가**: 배너는 `max-height: min(48vh,480px)`로 묶인 표면(`newtab.css:701`)의 마지막 flex 자식이다. 나타나면 `.calendar-body`가 눌리고 `overflow-y:auto`인 `.calendar-month`(`:848`)에 스크롤이 생긴다.
- **포인터 차폐**: 오버레이가 마지막 할 일 항목의 체크·삭제를 덮으면 실패 표면화가 조작 차단으로 변질된다. 패널이 열려 있을 때 `.calendar-todo-list`에 배너 높이만큼 `padding-bottom`을 더해 마지막 항목이 배너 위로 올라오게 한다. 스크롤 영역 안이라 표면 높이는 그대로다.
- **배너를 띄우는 수단**: 하네스가 `window.__newTabApp`으로 CalendarManager를 잡아 **`showError()`를 직접 호출**한다. `test/positioning.smoke.js:371`이 `calendar.selectDate()`를 부르는 것과 같은 접근이다. 가짜 백엔드 주입도, 모듈 평가 전 훅도 필요 없다.
- **Validate**: `showError()` 전후로 표면의 `getBoundingClientRect().height`와 `.calendar-month`의 `scrollHeight`·`clientHeight`가 **불변**이다(assert). 배너 표시 중 마지막 할 일 항목의 삭제 버튼이 `elementFromPoint`로 도달 가능하다(assert).

### Task 6: 문서
- **Action**: `README.md`에 (a) localhost 미리보기 동작과 **데이터 잔존** — 웹 오리진 `localStorage`에 평문으로 남고 같은 오리진의 다른 페이지가 읽을 수 있다 — 와 (b) 읽기 실패 시 앱이 쓰기를 막고 배너를 띄운다는 것을 적는다.
- **Validate**: 두 항목이 README에 있다.

## Validation

```bash
# 구문 검사 (이 저장소에는 package.json / 테스트 러너가 없다)
node --check newtab.js
node --check test/positioning.smoke.js

# 자동 — 확장 오리진에서만 유효하다 (chrome.storage가 진짜여야 한다)
#   1. chrome://extensions → 개발자 모드 → 압축해제된 확장 로드
#   2. chrome-extension://<확장 ID>/test/positioning.smoke.html
#   3. 절차: 먼저 비교 실행 → 기존 케이스가 전부 diff 0이어야 한다.
#      이 슬라이스는 기본 상태의 화면을 바꾸지 않으므로 차이가 나면 회귀다.
#      신규 케이스는 베이스라인에 없어 항상 차이로 잡히므로, 기존 케이스 diff 0을
#      확인한 뒤에만 베이스라인을 다시 뜬다.
#   4. errorCount는 베이스라인과 무관하다 — assert 실패가 여기로 올라온다

# 수동 — 자동화 불가. 하네스가 chrome.storage에 의존해 localhost 오리진에서 실행되지 않는다
python -m http.server 8000   # → http://localhost:8000/newtab.html
#   할 일 추가 → 오류 배너가 뜨지 않고 새로고침 후에도 남아 있어야 한다
#   미리보기 모드 고지 한 줄이 화면에 보여야 한다
```

> **베이스라인 재캡처가 이 계획의 알려진 약점이다.** 재캡처는 잘못된 값도 정상으로 굳힌다. 이 슬라이스는 (a) 기존 케이스 diff 0을 재캡처 **전에** 확인하고, (b) 진짜 단언은 베이스라인과 무관한 `errorCount`로 올려 완화한다. 구조적 해결(부분 비교 · 해시 스탬프 앵커 · `loadApp`의 `BASELINE_KEY` 소거)은 Slice B의 선행 과제다.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **어댑터가 flat 키 스키마를 바꿔 하네스가 침묵으로 깨진다** | Medium | C2로 계약화. extension 경로는 통과일 뿐이다 |
| **읽기 실패 차단이 과하게 걸려 정상 사용을 막는다** | Medium | `loadFailed`는 재시도 성공으로만 풀린다. 첫 로드가 성공하면 켜지지 않는다 |
| **프리뷰 백엔드가 원칙 4를 완화한다** | Medium | 화면에 보이는 고지 한 줄. `console.warn`만으로는 부족하다 |
| **localStorage 5MB 상한** — 배경 이미지 data URL이 먼저 닿는다 | Medium | localhost 전용 경로. `QuotaExceededError`를 reject 그대로 전달해 배너로 표면화 |
| **베이스라인 재캡처가 회귀를 굳힌다** | Medium | 재캡처 전 기존 케이스 diff 0 확인 + assert는 `errorCount`로 |
| **미리보기 데이터 잔존** | Low | localhost 전용. README에 명시(Task 6) |
| 오버레이가 컨트롤을 덮는다 | Low | `padding-bottom` 보정 + 도달성 assert |

## Acceptance

- [ ] Task 1 복구 지점 커밋이 존재한다
- [ ] 하네스에 베이스라인 무관 assert 채널이 있고 실패가 `errorCount`로 올라온다
- [ ] 읽기 실패 시 배너가 뜨고 쓰기·내보내기가 거절되며, **스토리지의 기존 일정이 보존된다**
- [ ] `getEvents()`가 내부 배열을 참조로 넘기지 않는다
- [ ] 어댑터 4분기(extension · local-preview · none · 손상 JSON)가 주입 테스트로 검증된다
- [ ] extension 백엔드의 flat 키 스키마가 불변이다
- [ ] localhost에서 할 일을 추가·저장·재로드할 수 있고 미리보기 모드 고지가 화면에 보인다
- [ ] 마이그레이션 실패가 조용히 넘어가지 않는다
- [ ] 오류 배너 표시 중 표면 높이와 내부 스크롤 상태가 불변이다
- [ ] 배너 표시 중 마지막 할 일 항목의 컨트롤이 도달 가능하다
- [ ] **기존 스모크 케이스가 전부 diff 0** — 이 슬라이스는 화면을 바꾸지 않는다
- [ ] README에 localhost 미리보기 동작 · 데이터 잔존 · 읽기 실패 동작이 있다

## Deferred to Slice B

Slice B(`.claude/plans/calendar-center-layout.plan.md`)가 착수 전에 해결해야 하는 것들. r2 심사에서 나온 구조적 지적이며 이 슬라이스에서 고치지 않는다.

**선행 과제 — 하네스 역량**

- `loadApp()`의 `chrome.storage.local.clear()`(`test/positioning.smoke.js:122`)가 `BASELINE_KEY`를 지워, `runAll` finally의 복원(`:806-809`)이 무력화된다. 저장된 베이스라인이 비교 1회로 사라진다
- 케이스 전체 JSON 문자열 비교뿐이라(`:829-844`, `:868`) 시계 경로만 · 달력 표면 기하만 같은 부분 대조를 표현할 수 없다
- 베이스라인에 커밋·플랜 해시 스탬프가 없고 캡처 버튼이 무조건 덮어쓴다(`:893-898`)

**설계 결정 — 이미 확정**

- 센터 카드와 고정 즐겨찾기 충돌: **기본값은 카드 폭을 즐겨찾기 바깥으로 유지한다.** `.pinned-bookmarks`는 `fixed; left:24px; width:196px; z-index:99`로 x 24부터 220까지 점유한다(`newtab.css:126-134, 155`). **즐겨찾기 숨김은 설정 옵션**으로 제공한다 (사용자 결정)
- `updatePinnedBookmarksVisibility()`(`newtab.js:3686`)는 유일한 호출부가 `:3347`에서 주석 처리된 죽은 코드다. 작업 대상이 아니라 **삭제 대상**이다
- `applySearchSetting(enabled)`·`applyInitialOverlap(widgetEnabled, searchEnabled)`는 파라미터 구동 함수다. 실효 가시성의 산출 지점을 호출부(`:3012`, `:3021`, `:3105`)에서 정해야 한다

**이월되는 계약** — Slice B의 C1(`this.events` 불변)·C2(저장값과 실효 가시성 분리)는 r2 심사에서 security가 실제로 닫혔다고 확인했다. 그대로 유지한다.

## Codex Adversarial Review

<!-- placeholder: will be replaced by Phase 7.3 -->
