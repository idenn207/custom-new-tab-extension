# Plan: 달력 배치 3종 + 센터 카드 + 태그 + 저장 신뢰성

**Source PRD**: `.claude/prds/calendar-widget-v2.prd.md`
**Selected Milestone**: (신규) M1.5 — 달력 배치 선택 · 센터 카드 · 태그 · localhost 저장 복구
**Complexity**: Large
**Revision**: r2 — L2 반증 패널(architect · security · test · invariant) 지적 20건 반영. 기록: `.claude/reviews/plan-review-worktree-prd-calendar-v2.md`

> **상태: SLICE B로 보류 (착수 금지).** r2에서 게이트가 `divergent`로 차단됐고 receipt가 없다. 사용자 결정에 따라 버그 수정만 `.claude/plans/calendar-storage-alert-fix.plan.md`(Slice A)로 분리했다.
>
> 이 계획을 재개하기 전에 해결해야 하는 것:
>
> 1. **하네스 역량 선행 과제** — 저장된 베이스라인이 비교 1회로 사라지고(`test/positioning.smoke.js:122` vs `:806-809`), 부분 대조를 표현할 수 없으며(`:829-844`, `:868`), 앵커에 해시 스탬프가 없다(`:893-898`). 이 계획의 Validate 다수가 이 역량을 전제한다. 선행 태스크로 신설해야 한다. (Slice A의 Task 2가 실패 채널만 먼저 만들어 둔다)
> 2. **센터 카드 ↔ 고정 즐겨찾기 충돌** — `.pinned-bookmarks`가 `fixed; left:24px; width:196px; z-index:99`로 x 24~220을 점유하고 `.main-content`는 `z-index:50`이라(`newtab.css:126-134, 155, 525-532`) 즐겨찾기가 카드 위를 덮고 포인터를 가로챈다. **사용자 결정: 기본값은 카드 폭을 즐겨찾기 바깥으로 유지하고, 즐겨찾기 숨김은 설정 옵션으로 제공한다.** Task 5의 "center에서 즐겨찾기가 밴드 오프셋을 받지 않는다" 봉인은 이 결정에 맞게 다시 써야 한다.
> 3. **읽기 경로** — Slice A의 Task 3이 `loadEvents()`의 파괴적 catch를 고친다. 이 계획의 Task 2는 그 위에서 다시 써야 한다.
> 4. `updatePinnedBookmarksVisibility()`는 죽은 코드다(호출부가 `newtab.js:3347`에서 주석 처리). C2 대상이 아니라 삭제 대상이다.
>
> **유지되는 것**: C1(`this.events` 불변)과 C2(저장값 ≠ 실효 가시성)는 r2 심사에서 security가 실제로 닫혔다고 확인했다.

## Summary

M1이 만든 상단 전체 너비 밴드는 "검색창을 피해야 한다"는 제약 아래 설계됐다. 사용자가 달력 모드에서 검색창을 쓰지 않기로 결정하면서 그 제약이 사라졌고, 달력은 화면 정중앙의 넓은 카드가 될 수 있다. 이 계획은 (1) 배치를 `top | center | bottom` 사용자 선택으로 만들고 센터 카드를 신규 구현하며, (2) 달력 모드에서 검색창을 숨겨 밴드↔검색창 충돌 기계장치를 걷어내고, (3) localhost에서 `chrome.storage` 부재로 발생하던 저장 실패와 그 오류 배너가 유발하는 스크롤을 고치고, (4) 일정에 태그를 붙여 저장·표시·필터할 수 있게 한다.

M1 구현 전체(1,776줄)가 **아직 커밋되지 않았다.** 첫 태스크는 코드 변경이 아니라 스냅샷이다.

## User Intent

| ID | Constraint (user-stated) | Kind |
|---|---|---|
| UI1 | 달력 위젯을 화면 정중앙(center, center)에 배치한다 | direction |
| UI2 | 센터 달력은 화면 끝에 붙지 않는 넓은 카드 형태이며 사방에 배경 여백이 남는다 | constraint |
| UI3 | 지금 구현된 상단 디자인을 프로토타입으로 백업해 남긴다 | constraint |
| UI4 | 달력 포지션을 상단·센터·하단 세 가지로 구분한다 | direction |
| UI5 | 이번에 구현된 디자인이 상단이고, 이번에 구현할 디자인이 센터다 | direction |
| UI6 | 달력 위젯을 쓸 때는 검색 등 다른 위젯을 쓰지 않으므로 검색창을 강제로 숨기고 토글도 비활성화한다 | constraint |
| UI7 | localhost 환경에서 할 일을 저장할 때 오류가 뜨는 문제를 해결한다 | constraint |
| UI8 | 아래쪽 알럿이 영역을 차지해 스크롤이 생기는 문제를 해결한다 | constraint |
| UI9 | 일정을 추가할 때 라벨이나 태그를 붙이는 레이어를 하나 더 둔다 | direction |
| UI10 | 태그 저장·표시·필터까지만 이번에 하고 그룹핑·모아보기 전용 뷰는 다음으로 미룬다 | exclusion |

## Core Contracts

r2에서 새로 명문화한 세 계약. 태스크가 이것을 어기면 구현이 아니라 계획 위반이다.

### C1 — `this.events`는 언제나 전체 집합이다 (데이터 소실 방지)

태그 필터는 **렌더 전용 파생값**이며 `this.events`를 절대 대체하지 않는다.

- 파생은 단 하나의 함수 `getVisibleEvents()`가 소유한다. 새 배열을 반환하고, 그 결과를 `this.events`에 **다시 대입하지 않는다.**
- **읽기(렌더) 경로만** 이 함수를 쓴다: `rebuildIndex()` · `getEventsForDate()` · `renderSummary()`.
- **쓰기 경로는 언제나 `this.events`를 직접 읽는다**: `addEvent()`(`newtab.js:2017`) · `updateEvent()`(`:2041`) · `toggleEvent()`(`:2049`) · `deleteEvent()`(`:2061`) · `replaceEvents()`(`:2069`) · `getEvents()`(`:2077`, 내보내기).

왜 계약으로 올리는가: 모든 쓰기가 `this.events`에서 `nextEvents`를 만들어 `persistEvents()`로 넘긴다. 필터를 `this.events`에 적용하면 가려진 일정이 **다음 저장 한 번에 스토리지에서 영구히 사라진다.** PRD가 "재생 불가능한 유일한 사용자 데이터"로 지목한 것이 이 데이터다.

### C2 — 저장값과 실효 가시성은 다른 것이다

`isSearchEnabled()`(`newtab.js:3203`)는 `searchToggle.checked`를 읽는다. `disabled` 속성은 `checked`를 바꾸지 않으므로, 토글을 비활성화하는 것만으로는 이 함수가 `false`를 반환하지 않는다.

- `isSearchEnabled()` — **사용자가 고른 값**. 의미와 구현 모두 그대로 둔다.
- `isSearchVisible()` — **신규**. `isSearchEnabled() && this.widgetType !== 'calendar'`.
- 실효 가시성을 묻는 모든 호출부가 후자로 옮겨간다. Task 4가 그 목록을 전부 나열한다.

### C3 — 공허하게 통과하는 단언을 만들지 않는다

`snapshot()`의 교차 판정은 `display: none`인 요소를 만나면 `intersects`를 `false`로 둔다(`test/positioning.smoke.js:195`). 달력 모드에서 검색창을 숨기면 기존 "밴드와 검색창이 겹치지 않는다" 단언이 **아무것도 검증하지 않은 채 초록불**이 된다.

- 교차 비-겹침을 단언하는 모든 케이스는 **먼저 두 요소가 모두 표시 중임을 단언**한다. 하나라도 숨겨져 있으면 그 케이스는 통과가 아니라 실패다.
- 검색창이 설계상 부재해야 하는 케이스는 "겹치지 않는다"가 아니라 **"숨겨져 있다"를 직접 단언**한다.

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| 위치 클래스 | `newtab.css:572` | `.<widget>.position-<slot>` → `top` / `left` / `transform` 3줄. 센터는 `top:50%; left:50%; translate(-50%,-50%)` |
| 레이아웃 상태 전달 | `newtab.js:3540` | `document.body.classList.toggle(...)` + `root.style.setProperty('--...')` 쌍. 변수 유무만으로 판정하면 fallback 값이 새 나간다 |
| body 데이터 속성 | `newtab.js:3212` `applyWidgetType()` | `document.body.dataset.widgetType` — CSS가 분기 기준으로 읽는다. `calendarLayout`도 같은 방식 |
| 이벤트 생성 단일 경로 | `newtab.js:180` `createCalendarEvent()` | 화이트리스트 필드만 **검증된 지역 변수**로 새 객체. `{...input}` 금지(prototype pollution) |
| 신뢰 불가 키의 집합 | `newtab.js:337` `const usedIds = new Set()` | 사용자 문자열을 키로 쓸 때는 순수 객체가 아니라 `Set`/`Map`. 태그 중복 제거가 그대로 따른다 |
| 로드 정규화 | `newtab.js:1876` | `raw.map(createCalendarEvent).filter(Boolean)` — 메모리에는 항상 한 가지 형태만 |
| 저장 실패 계약 | `newtab.js:1937` `persistEvents()` | 성공해야만 커밋 · 실패 시 무변경(자동 롤백) · 배너 + 동일 payload 재시도 |
| 가져오기 총량 예산 | `newtab.js:340, 351, 358` | 항목 수와 항목별 상한의 **곱**을 따로 막는다. 새 필드는 이 합산에 들어가야 한다 |
| 사용자 문자열 렌더 | `newtab.js:2657, 2675` | 반드시 `textContent`. `innerHTML` 금지 |
| "셀 것 없으면 사라진다" | `newtab.css:1429` `.calendar-summary` | 0건 상태 스타일을 만들지 않고 JS가 노드를 지운다. 태그 필터 바도 이걸 따른다 |
| 마이그레이션 | `newtab.js:242, 266` | 멱등 1회 · 자체 버전 가드 · 레거시 키 보존 · `Application.initialize()` 첫 줄에서 await |
| 렌더 베이스라인 | `test/positioning.smoke.js:897, 912, 933` | `BASELINE_KEY`에 결과를 저장하고 다음 실행이 대조. 파일 복사가 아니라 **렌더 결과** 비교 |
| 하네스 격리 | `test/positioning.smoke.js:121, 784-809` | 원본 storage 백업 → 시드 → 실행 → 복원 |

## Files to Change

| File | Action | Why |
|---|---|---|
| `prototypes/calendar-band-top/` | CREATE | UI3 — 상단 밴드 스냅샷 3파일 + 복원 안내(저장소 상대 경로만) |
| `newtab.js` | UPDATE | 스토리지 어댑터 · `calendarLayout` · `isSearchVisible()` · `getVisibleEvents()` · 태그 모델/입력/필터 |
| `newtab.css` | UPDATE | 센터 카드 신규 · top/bottom 변형 · 반응형 블록 재배치 · 배너 오버레이 · 태그 칩 |
| `newtab.html` | UPDATE | 배치 세그먼트 · 검색창 비활성 안내 · 모달 태그 입력 · 태그 필터 바 · 프리뷰 백엔드 고지 |
| `test/positioning.smoke.js` | UPDATE | 렌더 베이스라인 · 공허 단언 방지 · 배치 3종 · 배너 무반동 · 태그 왕복/필터/보존 · 어댑터 선택 순수함수 |
| `PRODUCT.md` | UPDATE | "전체 너비 밴드" 판정 블록을 3배치 체제로 갱신 |
| `DESIGN.md` | UPDATE | 배치 토큰 · 태그 칩 신규 hue 금지 · 배너 오버레이 |
| `README.md` | UPDATE | 배치/태그 설정 · localhost 미리보기 동작과 데이터 잔존 · 태그 롤백 비대칭 |
| `.claude/prds/calendar-widget-v2.prd.md` | UPDATE | M1.5 행 추가 · Open Question 2건 해소 표시 |

## Tasks

### Task 1: 스냅샷 + 렌더 베이스라인 (코드 변경 전 필수)
- **Action**: (a) 워킹 트리를 WIP 커밋으로 고정한다. (b) `newtab.html/css/js`를 `prototypes/calendar-band-top/`에 복사하고 복원 안내 `README.md`를 둔다 — 경로는 **저장소 상대 경로만** 쓴다. (c) **현재 하네스를 있는 그대로 한 번 실행해 `BASELINE_KEY`에 렌더 베이스라인을 저장한다.**
- **Mirror**: `test/positioning.smoke.js:897` `chrome.storage.local.set({ [BASELINE_KEY]: results })`.
- **왜 렌더 베이스라인인가 (test HIGH #3)**: 파일 복사본은 "렌더 결과가 같은가"를 답하지 못한다. 그리고 Task 3·4가 **의도적으로** top 배치의 렌더를 바꾸므로, 뒤에서 캡처하면 회귀와 의도된 변경을 구분할 수 없다. 베이스라인은 반드시 이 시점의 것이어야 한다.
- **Validate**: `git log --oneline -1`이 스냅샷 커밋. `diff -r prototypes/calendar-band-top/ ./`로 3파일 동일. `grep -rn 'C:\\\\' prototypes/`가 0건. 하네스가 베이스라인을 기록했다.

### Task 2: 스토리지 어댑터 — localhost 저장 실패 해소 (UI7)
- **Action**: `chrome.storage.local` 직접 호출 22곳을 단일 어댑터로 바꾼다. 백엔드 결정은 **주입 가능한 순수 함수** `selectStorageBackend({ chromeRef, localStorageRef })`가 소유하고, `'extension' | 'local-preview' | 'none'`을 반환한다. 모듈 로드 시 1회 호출한다.
- **Mirror**: `newtab.js:1937` `persistEvents()` 실패 계약 — 어댑터는 실패를 **reject로 전달만** 하고 삼키지 않는다.
- **미지 입력 분기 (invariant MEDIUM)** — 전부 명시한다:
  - `chrome.storage.local` 있음 → `extension`.
  - 없고 `localStorage` 접근 가능 → `local-preview`.
  - 둘 다 불가(보안 설정·차단) → `none`. 모든 읽기·쓰기가 **reject**한다. 조용한 성공은 없다.
  - 네임스페이스 JSON 손상 → **reject**. 빈 객체를 반환하면 `loadEvents()`(`newtab.js:1869`)가 `[]`를 정상 상태로 받아 데이터 소실이 무증상이 된다.
  - `QuotaExceededError` → reject 그대로. 기존 오류 배너가 받는다.
- **런타임 폴백 금지 (원칙 4)**: 백엔드 선택은 **가용성 기준 1회뿐**이다. 런타임 오류에서 다른 백엔드로 넘어가지 않는다. 넘어가면 사용자가 적은 것이 다른 곳에 저장되고 UI는 성공한 척한다.
- **사용자 가시 고지 (invariant MEDIUM, 원칙 4)**: `local-preview`가 활성이면 **화면에 보이는 한 줄**을 띄운다 — "미리보기 모드 · 확장 저장소가 아닌 이 브라우저 탭에만 저장됩니다". `console.warn`과 `dataset`만으로는 부족하다. 원칙 4는 저장 위치가 사용자 기대와 다를 때 침묵하지 말라고 요구한다. `document.body.dataset.storageBackend`는 `Application.initialize()`에서 설정한다(모듈 평가 시점에는 `body`가 없을 수 있다).
- **Validate**: `node --check newtab.js`. 하네스가 `selectStorageBackend()`에 가짜 `chromeRef`/`localStorageRef`를 주입해 **네 분기를 전부** 검증(확장 오리진에서 실행 가능 — test HIGH #1의 해소). localhost 실환경 확인은 **수동**이며 아래 Validation 절에 그렇게 표시한다.

### Task 3: 오류 배너를 높이 예산에서 뺀다 (UI8)
- **Action**: `.calendar-error`를 flex 자식에서 **absolute 오버레이**로 바꾼다. 컨테이너에 `position: relative`, 배너는 안쪽 아래 모서리 고정. 나타나고 사라지는 것이 형제 요소 크기 계산에 참여하지 않는다. 스크롤 컨테이너에 배너 높이만큼 `scroll-padding-bottom`.
- **Mirror**: `newtab.css:1341` `.calendar-error[hidden] { display: none }` 숨김 계약 유지.
- **왜 이게 원인인가**: 배너는 `max-height: min(48vh,480px)`로 묶인 표면의 마지막 flex 자식이다. 나타나면 `.calendar-body`가 눌리고 `overflow-y:auto`인 `.calendar-month`에 스크롤이 생긴다.
- **포인터 차폐 (invariant LOW)**: 오버레이가 마지막 할 일 항목의 체크·삭제 버튼을 덮으면 저장 실패 표면화가 조작 차단으로 변질된다. 패널이 열려 있을 때는 `.calendar-todo-list`에 배너 높이만큼 `padding-bottom`을 더해 마지막 항목이 배너 위로 올라오게 한다(스크롤 영역 안이므로 표면 높이는 그대로다).
- **배너를 띄우는 수단 (test MEDIUM)**: 하네스에 저장 실패 주입 훅이 없다(`test/positioning.smoke.js`에는 성공 경로만 있다). Task 2의 어댑터가 이미 주입 가능하므로, **항상 reject하는 가짜 백엔드를 주입**해 배너를 띄운다. 별도 훅을 새로 만들지 않는다.
- **Validate**: 배너 표시 전후로 표면의 `getBoundingClientRect().height`와 `.calendar-month`의 `scrollHeight`/`clientHeight`가 **불변**. 배너 표시 중 마지막 할 일 항목의 삭제 버튼이 `elementFromPoint`로 도달 가능.

### Task 4: 달력 모드에서 검색창 숨김 (UI6) — C2 적용
- **Action**: `isSearchVisible()`을 추가하고(C2), 실효 가시성을 묻는 **모든** 호출부를 옮긴다:
  - `applySearchSetting()`(`newtab.js:3237`) — 표시/숨김 결정
  - `checkOverlap()`(`:3451`) — 조기 반환 조건
  - `applyInitialOverlap()`(`:3643`) — 첫 페인트 경로
  - `updatePositionSettingsVisibility()`(`:3704`) — 검색창 위치 그리드 노출
  설정 UI에서 `#searchToggle`을 `disabled` 처리하고 이유 한 줄을 붙인다. **저장값 `searchEnabled`는 읽지도 쓰지도 않는다** — 시계로 되돌리면 사용자가 고른 상태가 복원된다.
- **Mirror**: `newtab.js:3704`의 DD4 관용구 — 그리드는 숨기되 저장값은 건드리지 않아 복원이 성립한다.
- **함께 걷어내는 것**: 달력 모드에서 검색창이 언제나 숨겨지므로 밴드↔검색창 충돌 코드가 죽는다. `checkOverlap()`의 calendar 분기, `matchSearchWidthToWidget()`/`loadSearchWidth()`의 calendar 조기 반환, `newtab.css:1407`의 `body.has-calendar-band .search-container.position-top-*` 규칙을 제거한다. **`isSearchVisible()`로 먼저 옮긴 뒤에** 지운다 — 순서를 바꾸면 숨겨진 검색창이 일반 경로로 떨어져 폭 맞춤을 받는다(architect HIGH #2).
- **즐겨찾기 오프셋**: Task 5의 layout-aware 밴드 메트릭이 소유한다. 여기서는 손대지 않는다.
- **테스트 변경 (C3, test HIGH #2)**: `runBandInvariance`(`test/positioning.smoke.js:259-303`)를 다시 쓴다. "상단 검색창이 밴드 아래로 비킨다"는 이제 존재하지 않는 동작이다. 대체 단언 — 달력 모드에서 `.search-container`가 **존재하며 `display:none`이다**, 그리고 시계로 되돌리면 이전 상태로 **복원된다**. 아울러 C3의 공허 단언 방지 가드를 `snapshot()` 소비 케이스 전반에 넣는다.
- **Validate**: 시계 경로가 Task 1 렌더 베이스라인 대비 diff 0. 달력 전환 → 검색창 `display:none` + 토글 `disabled` + `searchEnabled` 저장값 불변. 시계 복귀 → 복원.

### Task 5: `calendarLayout` 상태 · 설정 UI · layout-aware 밴드 메트릭 (UI4)
- **Action**: 저장 키 `calendarLayout: 'top' | 'center' | 'bottom'`, 기본값 `'center'`. `applyCalendarLayout()`이 `document.body.dataset.calendarLayout`을 설정한다. 설정의 "위젯 위치" 자리에 달력 모드일 때만 보이는 3버튼 세그먼트를 넣는다(시계 모드는 기존 9분할 그리드 그대로).
- **밴드 메트릭을 layout-aware로 (architect HIGH #1)**: `updateBandMetrics()`(`newtab.js:3534`)의 판정을 바꾼다 — `isBand = widgetType === 'calendar' && isWidgetEnabled() && (layout === 'top' || layout === 'bottom')`. `has-calendar-band` 단일 클래스를 `has-calendar-band-top` / `has-calendar-band-bottom`으로 나누고, `newtab.css:1420`의 즐겨찾기 오프셋은 **`-top`에만** 건다. 이 태스크가 그 소유자다.
  - 이걸 빼면 기본값 `center`에서 `has-calendar-band`가 켜진 채로 남아 즐겨찾기가 카드 높이(최대 760px)만큼 밀려 **화면 밖으로 나간다.**
- **세그먼트 가시성 소유자 (architect LOW)**: `updatePositionSettingsVisibility()`가 `#widgetPositionSetting`과 `#widgetPositionGrid`를 각각 숨긴다(`newtab.js:3716-3725`). 세 노드는 형제이므로 이 함수가 세그먼트까지 함께 다루도록 확장한다 — 달력 모드면 9분할 2노드를 숨기고 세그먼트를 보인다.
- **Mirror**: `newtab.html:149` `#widgetTypeSegment` 마크업과 `newtab.js:3353` `updateWidgetTypeSegment()` 갱신 관용구.
- **마이그레이션 불필요 · 기본값 근거 (invariant MEDIUM 정정)**: `calendarLayout`은 기본값을 가진 신규 키이고, `loadEvents()`가 이벤트를 이미 정규화하므로 스토리지 마이그레이션이 필요 없다. `SETTINGS_VERSION`은 3에 둔다. **기본값이 `center`인 이유는 "배포된 적이 없어서"가 아니다** — 사용자가 압축 해제 로드로 워킹 트리를 실사용 중이므로 그 프록시는 틀렸다. 이유는 UI1이다: 사용자가 정중앙을 명시적으로 요청했다. 원칙 5("기존 사용자의 화면을 바꾸지 않는다")를 이 한 설치에 대해 **알고서 양보하는 것**이며, `top`은 세그먼트 클릭 한 번 거리에 남는다.
- **Validate**: 세 값을 각각 시드해 `body[data-calendar-layout]`과 실제 렌더 위치가 일치. 값이 없으면 `center`. **`center`에서 즐겨찾기의 `top`이 밴드 오프셋을 받지 않는다**(회귀 봉인).

### Task 6: 센터 카드 레이아웃 (UI1, UI2) — 이번 라운드의 핵심
- **Action**: `body[data-calendar-layout="center"]`에서 달력 표면을 `top:50%; left:50%; transform: translate(-50%,-50%)` 카드로 만든다. `width: min(92vw, 1180px)`, `max-height: min(76vh, 760px)`, 네 모서리 `border-radius: 16px`. 밴드 전용이던 좌우 136px 패딩(코너 토글 자리 비움)과 `border-top: 0`을 제거한다 — 카드는 화면 모서리에 닿지 않아 코너 컨트롤과 겹치지 않는다.
- **Mirror**: `newtab.css:572` `.clock.position-center-center` 정렬 3줄. `newtab.css:660`의 글래스 토큰과 `--calendar-measure` 내용 상한 상속.
- **원칙 1과의 관계 (정직하게)**: 정중앙은 배경 사진의 주피사체를 가장 잘 가리는 자리다. 상단 밴드는 가장자리라 덜 가렸다. 면적 상한 유지 + 배경 알파 불변(0.3) + 사용자가 top/bottom으로 되돌릴 수 있음으로 상쇄한다. 배치 선택지가 존재해야 하는 진짜 이유가 이것이다.
- **대비 재검증**: 표면이 중앙으로 오면 뒤 배경 픽셀 분포가 달라진다. PRODUCT.md 방법대로 **밝은 배경 이미지 위 렌더 픽셀 실측**을 다시 하고 `--calendar-muted`(0.78)/`--calendar-faint`(0.72)가 여전히 명암비 4.5 대 1을 넘는지 확인한다. 토큰 계산으로 대체하지 않는다.
- **Validate**: 카드 중심이 뷰포트 중심의 ±2px 이내. 좁은 뷰포트(1024×640)에서 카드가 뷰포트를 벗어나지 않고 내부 스크롤로 흡수. 밝은 배경 실측 스크린샷 1장.

### Task 7: top / bottom 변형 + 반응형 블록 재배치 (UI5)
- **Action**: 현재 밴드 스타일을 `body[data-calendar-layout="top"]` 아래로 옮긴다. `bottom`은 미러 — `top:auto; bottom:0`, `border-radius: 16px 16px 0 0`, `border-bottom: 0`.
- **반응형 블록 소유 (architect MEDIUM)**: `newtab.css:2612`(max-width 1024px)와 `:2728`(max-width 768px)의 `.calendar-widget` 규칙은 특정도 (0,1,0)이다. 밴드 기본 스타일을 `body[data-calendar-layout="top"]`(0,2,0)으로 올리면 **미디어 규칙이 져서 좁은 화면 튜닝이 조용히 죽고**, 동시에 밴드 전용 120px 패딩이 센터 카드로 샌다. 두 블록을 배치별로 쪼갠다 — 밴드 전용 값(120px 패딩)은 `[data-calendar-layout="top"], [data-calendar-layout="bottom"]` 아래로, 센터에는 폭·높이 축소 규칙을 따로 준다.
- **범위 판단**: `bottom`은 사용자가 taxonomy로만 언급했다. CSS 미러로 값싸서 포함하지만 **가장 먼저 잘라낼 항목**이다.
- **Validate**: `top` 시드 → **달력 표면 기하(위치·크기)** 가 Task 1 렌더 베이스라인과 일치. 화면 전체 diff가 아니다 — Task 3·4가 배너와 검색창을 의도적으로 바꿨으므로(test HIGH #3). 1024px·768px 각 배치에서 표면이 뷰포트를 벗어나지 않는다.

### Task 8: 태그 데이터 모델 (UI9)
- **Action**: `CalendarEvent`에 `tags: string[]`. 정규화는 `createCalendarEvent()` 안에서만 — 배열 아니면 `[]`, 각 항목 문자열 강제 → `trim()` → 빈 값 제거 → **`Set` 기반** 대소문자 무시 중복 제거(표시는 첫 표기 유지) → 태그당 `MAX_TAG_LENGTH`(20자) → 이벤트당 `MAX_TAGS_PER_EVENT`(5개) 절단.
- **Mirror**: `newtab.js:194-215`처럼 검증된 지역 변수로 새 배열을 만든다. `input.tags` 참조를 그대로 넣지 않는다. 중복 제거는 `newtab.js:337` `const usedIds = new Set()`를 그대로 따른다 — **순수 객체를 seen-map으로 쓰면 `__proto__` 태그가 프로토타입 할당으로 흡수되어 중복 제거가 조용히 어긋난다**(security LOW).
- **가져오기 총량 예산 (security MEDIUM)**: `newtab.js:351`의 `usedChars` 합산에 태그 길이를 더한다. 이 예산은 "항목 수 상한과 항목별 상한의 곱은 막히지 않는다"(`:355` 주석)를 막으려 만든 방어인데, 태그가 빠지면 5000항목 × 5태그 × 20자 = 최대 50만자가 예산 밖으로 샌다. localStorage 백엔드에서 5MB 상한에 그만큼 빨리 닿는다.
- **마이그레이션 불필요**: `loadEvents()`가 모든 이벤트를 `createCalendarEvent()`로 통과시킨다(`newtab.js:1876`). 기존 이벤트는 로드 시점에 `tags: []`를 얻고 다음 쓰기에 영구화된다.
- **롤백 비대칭**: `date` 잔존 필드와 달리 `tags`에는 하위호환 짝이 없다. 구버전으로 되돌린 뒤 **쓰기가 한 번 일어나면** 태그가 사라진다. 되돌리기만 하면 보존된다. README에 적는다.
- **Validate**: 왕복 — 6개 태그 / 25자 태그 / 중복 / 대소문자 변형 / `__proto__` / 비배열 / 객체 주입을 시드해 5개·20자·중복 제거가 관철되는지. 태그로 부풀린 가져오기가 `MAX_IMPORT_CHARS`에서 거절되는지.

### Task 9: 태그 입력·표시 (UI9)
- **Action**: 상세 모달의 작업 메모 위에 태그 필드 — 쉼표·Enter로 확정되는 칩 입력, 기존 전체 태그를 `<datalist>`로 자동완성, 칩마다 삭제 버튼. 목록 표시는 `createTodoItem()`의 meta 줄 뒤에 중립 칩 행.
- **Mirror**: `newtab.js:2660-2670` meta 줄 조립. 사용자 문자열은 `textContent`.
- **색 제약 (강제)**: 태그에 **새 hue를 쓰지 않는다.** 화면의 hue는 accent · overdue · soon 3계열이고 PRODUCT.md는 "네 번째 hue"를 판정이 흔들리는 신호로 명시했다. 태그 칩은 기존 유리 언어(투명 배경 + `--border-color` + `--text-secondary`)로만 구분한다. 태그별 색상 지정은 범위 밖이다.
- **월간 그리드**: 날짜 칸 칩(`createChips()`)에는 태그를 그리지 않는다. `MAX_CHIPS_PER_CELL`(2)에 이미 밀도가 차 있다.
- **Validate**: 모달에서 태그 3개 입력 → 저장 → 재로드 후 패널 목록에 3칩. 키보드만으로 입력·삭제 가능. `handleModalKeydown()`의 포커스 트랩 안에 새 컨트롤이 포함.

### Task 10: 태그 필터 (UI9, UI10) — C1 적용
- **Action**: 달력 헤더 아래에 **태그가 하나라도 존재할 때만** 나타나는 필터 칩 행. 칩을 누르면 그 태그를 가진 일정만 남고 다시 누르면 해제. 다중 선택은 OR.
- **적용 방식**: C1의 `getVisibleEvents()` 하나만 만든다. `rebuildIndex()` · `getEventsForDate()` · **`renderSummary()`(`newtab.js:2416`)** 셋이 전부 이 함수를 읽는다. 요약 줄은 지금 `this.events`를 직접 순회하므로(`:2424`) **명시적으로 옮겨야 한다** — 앞의 둘만 고치면 요약이 필터를 무시해 세 표면이 어긋난다(invariant HIGH).
- **쓰기 경로 불가침 (C1, CRITICAL)**: `this.events`를 필터링하지 않는다. `getEvents()`(내보내기)는 언제나 전체를 반환한다.
- **Mirror**: `newtab.css:1429` `.calendar-summary`의 "셀 것이 없으면 노드 자체가 사라진다" — 태그가 0개면 필터 바가 존재하지 않는다. 대시보드 anti-reference를 피하는 장치다.
- **영속성 없음 (의도)**: 필터는 **세션 한정**이며 저장하지 않는다. 새 탭은 언제나 전체를 보여준다. 저장하면 잊은 필터 때문에 마감이 숨고, 그것은 원칙 4가 막으려는 것과 같은 종류의 거짓말이다.
- **필터 활성 중 추가 — 결정 (test LOW 해소)**: 일정을 추가하면 **필터를 자동 해제한다.** 방금 적은 것이 눈앞에서 사라지는 것보다 낫고, 필터 재적용은 클릭 한 번이다. 구현 중 재판단하지 않는다.
- **범위 밖 (UI10)**: 태그별 전용 "모아보기" 뷰는 만들지 않는다. PRD에 다음 마일스톤으로 기록한다.
- **Validate**: **필터를 켠 상태에서 토글·삭제·내보내기를 한 뒤 가려진 일정이 스토리지에 그대로 있는가**(C1 봉인 — 이 케이스가 없으면 태스크 미완). 필터 적용 시 그리드·패널·요약이 같은 집합을 반영. 새 탭 재로드 시 해제 상태. 일정 추가 시 필터 자동 해제.

### Task 11: 스모크 하네스 확장
- **Action**: 케이스 추가 — 어댑터 백엔드 선택 4분기(주입), 배너 무반동 + 포인터 도달성, 배치 3종 실측, `center`에서 즐겨찾기 오프셋 부재, 검색창 숨김·복원, 태그 정규화 왕복, 태그 예산, **필터 중 쓰기 후 데이터 보존**, 필터 3표면 일관성.
- **C3 적용**: `snapshot()`을 소비하는 모든 비-겹침 단언에 "두 요소가 모두 표시 중"을 선행 단언한다. `runBandInvariance`는 Task 4가 재작성한다.
- **Mirror**: `test/positioning.smoke.js:121` `loadApp()` · `:784-809` 백업/복원 · `:897` 베이스라인.
- **Validate**: 확장 오리진에서 `chrome-extension://<id>/test/positioning.smoke.html` 전체 통과. 시계 경로가 Task 1 베이스라인 대비 diff 0.

### Task 12: 문서 갱신
- **Action**: `PRODUCT.md` 판정 블록을 3배치 체제로 다시 쓴다(정중앙 카드가 원칙 1에 갖는 의미, 배치 선택이 완화 장치라는 점, 판정이 흔들리는 신호 재정의). `DESIGN.md`에 배치 토큰·태그 칩 신규 hue 금지·배너 오버레이. `README.md`에 배치/태그 설정, **localhost 미리보기의 데이터 잔존**(웹 오리진 `localStorage`에 평문으로 남고 같은 포트의 다른 로컬 서버가 읽을 수 있음 — security MEDIUM), 태그 롤백 비대칭. PRD에 M1.5 행 추가 + Open Question 2건 해소 표시.
- **Mirror**: `PRODUCT.md:40-49` 판정 블록 형식(항목별 근거 + "판정이 흔들리는 신호").
- **Validate**: PRD Delivery Milestones에 M1.5 행이 있고 Plan 열이 이 파일을 가리킨다.

## Validation

```bash
# 구문 검사 (이 저장소에는 package.json / 테스트 러너가 없다)
node --check newtab.js
node --check test/positioning.smoke.js

# 스냅샷 무결성 + 절대 경로 유출 (Task 1)
diff -r prototypes/calendar-band-top/ ./     # Task 2 이후로는 차이가 나는 것이 정상
grep -rn 'C:\\' prototypes/                  # 0건이어야 한다

# 자동 — 확장 오리진에서만 유효하다 (chrome.storage가 진짜여야 한다)
#   1. chrome://extensions → 개발자 모드 → 압축해제된 확장 로드
#   2. chrome-extension://<확장 ID>/test/positioning.smoke.html
#   3. 시계 경로가 Task 1 렌더 베이스라인 대비 diff 0
#   어댑터 4분기는 selectStorageBackend()에 가짜를 주입해 여기서 전부 검증된다

# 수동 — 자동화 불가. 하네스가 chrome.storage에 의존해 localhost 오리진에서 실행되지 않는다
python -m http.server 8000   # → http://localhost:8000/newtab.html
#   할 일 추가 → 오류 배너가 뜨지 않고 새로고침 후에도 남아 있어야 한다
#   "미리보기 모드" 고지 한 줄이 화면에 보여야 한다

# 수동 — 대비 실측 (Task 6). 토큰 계산으로 대체 금지
#   밝은 배경 이미지를 깐 상태에서 카드 위 본문 픽셀을 실측해 명암비 4.5 대 1 확인
```

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **필터가 데이터를 지운다** — 쓰기 경로가 필터된 집합을 읽으면 가려진 일정이 영구 삭제 | Medium | C1 계약 + Task 10의 "필터 중 쓰기 후 보존" 테스트가 봉인. 이 케이스 없이는 태스크 미완 |
| **정중앙 카드가 원칙 1을 잠식한다** | High | 면적 상한·알파 불변. 배치 선택지가 완화 장치. PRODUCT.md 판정 블록 재작성(Task 12) |
| **대비 회귀** | Medium | Task 6에서 밝은 배경 실측 재수행 |
| **공허하게 통과하는 테스트** — 요소를 숨기면 교차 단언이 무의미해진다 | Medium | C3 선행 단언 가드를 `snapshot()` 소비 케이스 전반에 적용 |
| **숨겨진 검색창이 폭 맞춤을 받는다** — `disabled ≠ unchecked` | Medium | C2. Task 4가 호출부를 먼저 옮긴 **뒤에** calendar 분기를 제거 |
| **즐겨찾기가 화면 밖으로** — 밴드 메트릭이 layout을 모른다 | Medium | Task 5가 소유. `center`에서 오프셋 부재를 테스트로 봉인 |
| **반응형 튜닝이 조용히 죽는다** — 특정도 역전 | Medium | Task 7이 두 미디어 블록을 배치별로 쪼갠다 |
| **가져오기 예산 우회** — 태그가 합산에서 빠짐 | Medium | Task 8이 `usedChars`에 태그 포함 |
| **프리뷰 백엔드가 원칙 4를 완화한다** | Medium | 화면에 보이는 고지 한 줄. `console.warn`만으로는 부족 |
| **시계 경로 회귀** | Medium | Task 1 렌더 베이스라인 → 시계 케이스 diff 0 유지 |
| **미리보기 데이터 잔존** — 웹 오리진 localStorage에 평문 | Low | localhost 전용 경로. README에 명시(Task 12) |
| **태그 롤백 손실** | Low | 하위호환 짝을 만들 수 없음을 인정하고 README에 적는다 |
| **스코프 확대** | High | Task 1→12가 되돌릴 수 있게 배치. Task 2·3(버그)만으로 독립 출하 가능. Task 7의 `bottom`이 첫 절단 후보 |

## Open Questions

- **`bottom` 배치의 즐겨찾기 간섭** — `.pinned-bookmarks`는 좌상단이라 `bottom` 밴드와 보통 안 겹치지만, 화면이 짧으면 세로로 닿는다. Task 5의 `has-calendar-band-bottom`을 즐겨찾기에 걸지 말지 Task 7에서 실측 후 결정 — *severity LOW*

## Acceptance

- [ ] Task 1 스냅샷과 **렌더 베이스라인**이 존재하고, `prototypes/`에 절대 경로가 없다
- [ ] localhost에서 할 일을 추가·저장·재로드할 수 있고 "미리보기 모드" 고지가 화면에 보인다
- [ ] 어댑터 4분기(extension / local-preview / none / 손상 JSON)가 주입 테스트로 검증된다
- [ ] 오류 배너가 표시돼도 표면 높이와 내부 스크롤 상태가 불변이고, 가려진 항목의 컨트롤이 도달 가능하다
- [ ] 달력 모드에서 검색창이 `display:none`이고 토글이 비활성이며, `searchEnabled` 저장값이 불변이고 시계 복귀 시 복원된다
- [ ] `runBandInvariance`가 공허 통과가 아니라 "숨겨져 있음"을 직접 단언한다
- [ ] 배치 top/center/bottom을 고를 수 있고 기본값이 center다
- [ ] `center`에서 즐겨찾기가 밴드 오프셋을 받지 않는다
- [ ] 센터 카드가 정중앙에 뜨고 사방에 배경 여백이 남는다
- [ ] `top` 배치의 **달력 표면 기하**가 Task 1 렌더 베이스라인과 일치한다
- [ ] 1024px·768px에서 세 배치 모두 표면이 뷰포트를 벗어나지 않는다
- [ ] 일정에 태그를 붙여 저장·표시·필터할 수 있고, 필터는 새 탭에서 해제된다
- [ ] **필터를 켠 채 토글·삭제·내보내기를 해도 가려진 일정이 보존된다** (C1)
- [ ] 태그가 가져오기 총량 예산에 합산된다
- [ ] 태그 칩이 새 hue를 도입하지 않는다
- [ ] 스모크 하네스 전체 통과 · 시계 경로 베이스라인 diff 0
- [ ] 밝은 배경 실측으로 카드 본문 명암비 4.5 대 1 확인
- [ ] PRODUCT.md / DESIGN.md / README.md / PRD 갱신

## Review Response (r1 → r2)

L2 패널 지적 20건의 처리. 전문은 `.claude/reviews/plan-review-worktree-prd-calendar-v2.md`.

| # | 지적 | 처리 |
|---|---|---|
| CRITICAL | 필터가 `this.events`에 적용되면 영구 삭제 | **C1 계약 신설** + Task 10 Validate에 보존 테스트를 완료 조건으로 |
| HIGH | 밴드 메트릭이 layout을 몰라 `center`에서 즐겨찾기가 화면 밖 | Task 5가 소유. `has-calendar-band`를 `-top`/`-bottom`으로 분할 |
| HIGH | `disabled ≠ unchecked`, 숨겨진 검색창이 폭 맞춤을 받음 | **C2 계약 신설**. Task 4가 호출부 4곳을 명시하고 제거 순서를 고정 |
| HIGH | localhost 분기를 검증할 테스트가 구조적으로 불가 | Task 2에서 백엔드 선택을 **주입 가능한 순수 함수**로 분리 → 확장 오리진에서 4분기 검증. localhost 실환경은 **수동**으로 명시 |
| HIGH | `runBandInvariance`가 공허 통과로 변질 | **C3 계약 신설**. Task 4가 해당 케이스를 재작성, 선행 표시 단언을 전반에 적용 |
| HIGH | "top diff 0"이 실행 불가·자기모순 | Task 1이 **렌더 베이스라인**을 Task 3 이전에 캡처. Task 7 범위를 **달력 표면 기하**로 축소 |
| HIGH | `renderSummary()`가 필터 초크포인트를 우회 | Task 10이 세 번째 리더로 명시 |
| MEDIUM | 반응형 `.calendar-widget` 규칙의 특정도 역전 | Task 7이 두 미디어 블록을 소유 |
| MEDIUM | 태그가 `usedChars` 예산에서 누락 | Task 8이 합산에 포함 |
| MEDIUM | 프리뷰 백엔드에 사용자 가시 고지 없음 | Task 2가 화면 한 줄 고지 추가 |
| MEDIUM | localhost 데이터 잔존·격리 손실 미기술 | Task 12가 README에 명시 |
| MEDIUM | "커밋 안 됨 = 배포 안 됨" 프록시 오류 | Task 5의 근거를 UI1(사용자 명시 요청)로 정정. 원칙 5를 **알고서 양보**한다고 기술 |
| MEDIUM | 어댑터 미지 입력 분기 미정 | Task 2가 4분기 + 손상 JSON reject + `body` 타이밍을 명시 |
| MEDIUM | 배너를 띄울 수단 없음 | Task 3이 Task 2의 주입 가능 어댑터를 재사용 |
| LOW | 태그 중복 제거의 prototype 오염 | Task 8이 `Set` 사용을 `newtab.js:337` 미러로 고정 |
| LOW | `prototypes/` README 절대 경로 | Task 1이 상대 경로만 + `grep` 검증 |
| LOW | 오버레이가 컨트롤을 덮음 | Task 3이 `padding-bottom` 보정 + 도달성 테스트 |
| LOW | 세그먼트 가시성 소유자 부재 | Task 5가 `updatePositionSettingsVisibility()`를 명시 |
| LOW | Task 10 사양 미결정 | 결정함 — 일정 추가 시 필터 자동 해제 |

## Design Routing Guide

routing mode: `auto` (구현 단계에서 발효). 플랜 단계는 아무것도 호출하지 않는다 — 아래는 `/mccp:prp-implement`가 소비할 체크리스트다.

`impeccable-detect --mode plan`: `skill_available=true` · `design_signal=true` · `reason=ok` · `silent_skip=false`
signal files: `newtab.css` · `newtab.html` · `test/positioning.smoke.html`

| Stage | Command |
|---|---|
| discovery | `/impeccable shape` |
| refine | `/impeccable layout` · `/impeccable typeset` · `/impeccable animate` · `/impeccable colorize` · `/impeccable bolder` · `/impeccable quieter` · `/impeccable overdrive` · `/impeccable delight` |
| simplify | `/impeccable adapt` · `/impeccable distill` · `/impeccable clarify` |
| evaluate | `/impeccable critique` · `/impeccable audit` |
| harden | `/impeccable harden` · `/impeccable optimize` · `/impeccable onboard` |
| polish | `/impeccable polish` |
| system | `/impeccable document` · `/impeccable extract` |

**SKILL Output Constraints 대조** (`frontend-design-direction/SKILL.md` §Output Constraints):

- *강조색 화면당 1개* — Task 9의 "태그에 새 hue 금지"가 이 앵커의 직접 적용이다. 화면 hue는 accent · overdue · soon 3계열이고 태그는 중립 유리 칩으로만 구분한다.
- *정보 위계 3단계* — 센터 카드의 위계는 헤더(월·내비) → 그리드 → 패널 3단에서 끝난다. 태그 필터 바는 4번째 단이 되지 않도록 헤더 아래 같은 층에 붙이고, 태그가 0개면 노드가 사라진다.
- *한 화면 항목 수 상한* — 날짜 칸 칩은 `MAX_CHIPS_PER_CELL`(2) + `+N` 축약을 지킨다. 태그를 그리드에 그리지 않는 이유가 이 앵커다.
- *raw markdown marker 금지* — 사용자 문자열은 전부 `textContent`이므로 해당 없음.

`/impeccable document`(system)는 Task 12와 겹친다 — PRODUCT.md 판정 블록 재작성이 그 지점이다.

## Codex Adversarial Review

<!-- placeholder: will be replaced by Phase 7.3 -->
