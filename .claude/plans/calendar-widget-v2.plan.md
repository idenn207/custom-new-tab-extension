# Plan: 전체 너비 업무 캘린더 (달력 위젯 v2)

**Source PRD**: `.claude/prds/calendar-widget-v2.prd.md`
**Selected Milestone**: M1 — 전체 너비 업무 캘린더
**Complexity**: Large

## Summary

M1 달력 위젯(340px 카드, 단일 날짜 이벤트)을 **위치 설정 없는 전체 너비 밴드**로 바꾸고, 데이터 모델을 `date` 단일 키에서 `startDate`~`endDate` 범위 + 중요도 + 작업 메모로 승격한다. 입력 경로를 간편(인라인)/상세(모달) 2종으로 나누고, 중요도·마감 상태를 색+형태로 이중 부호화한 뒤 상단에 요약 한 줄을 붙인다.

되돌릴 수 있는 순서(데이터 모델 → 범위 렌더 → 레이아웃 → 입력 → 시각 언어 → 요약)로 9개 태스크로 분해하며, 각 태스크가 끝난 시점의 확장은 항상 동작한다. `test/positioning.smoke.js` 하네스는 시계 경로에 대해 diff 0을 유지하고, 달력 경로는 **의도된 변경**으로 재베이스라인한다.

## User Intent

<!-- PRD에서 "사용자 명시 결정 / 사용자 결정"으로 표기된 항목과 Out of scope 표(= 사용자가 유보·배제한 것)만 옮긴다. 작성자 논거는 ## Design Decisions에 있다. -->

| ID | Constraint (user-stated) | Kind |
|---|---|---|
| UI1 | 위치 제거·전체 너비·범위 일정·이중 입력·시각 언어 5개 항목을 쪼개지 않고 하나의 릴리스로 낸다 | direction |
| UI2 | 전체 너비는 취하되 높이와 불투명도를 억제해 "배경이 주인공이다" 원칙을 유지한다 | constraint |
| UI3 | 상세 입력 경로에 작업 메모 기록 필드를 포함한다 | direction |
| UI4 | 시계 모드의 동작과 화면은 이번 변경으로 달라지지 않는다 | exclusion |
| UI5 | 브라우저 알림은 이번 릴리스에서 만들지 않고 M2로 유보한다 | exclusion |
| UI6 | Google Calendar 양방향 동기화는 이번 릴리스에서 만들지 않는다 | exclusion |
| UI7 | 시 분 단위 일정과 타임존을 다루지 않고 all-day 범위만 취급한다 | exclusion |
| UI8 | manifest.json에 새 권한을 추가하지 않는다 | constraint |
| UI9 | 반복 일정과 주간 일간 뷰와 드래그 이동을 만들지 않는다 | exclusion |
| UI10 | 소형 위젯이 아니라 캘린더 프로그램 수준의 퀄리티와 디자인을 원한다 | direction |
| UI11 | 로컬 저장만 하며 타인과 공유하거나 동기화하지 않는다 | constraint |
| UI12 | 데이터 밀도는 전부 보여주기가 아니라 급한 것만 크게 보여주기로 얻는다 | constraint |

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| 마이그레이션 | `newtab.js:86` `migrateSettingsToV2()` | 버전 가드 후 1회 실행, 레거시 키는 **읽기만 하고 남겨둔다**(다운그레이드 안전성). `Application.initialize()` 첫 줄에서 `await` |
| 저장 상태 머신 | `newtab.js:1325` `persistEvents()` | 스냅샷을 넘겨 저장 성공 시에만 메모리·인덱스·DOM 커밋. 실패 시 아무것도 안 건드려 롤백 자동 성립, `pending`으로 새 편집 차단, 동일 payload 재시도 |
| 신뢰 불가 입력 정제 | `newtab.js:115` `sanitizeImportedEvents()` | 화이트리스트 필드만 새 객체로 복사(prototype pollution 원천 차단) + 날짜 왕복 검증(`makeDateKey(parseDateKey(d)) === d`) |
| 날짜 키 | `newtab.js:44,57` `makeDateKey` / `parseDateKey` | `toISOString()`·`new Date(문자열)` 금지. 로컬 자정 기준으로만 생성·파싱 |
| 위치 클래스 소유권 | `newtab.js:68` `stripPositioningClasses()` | `position-*` / `overlap-offset` / `collision-compact` 셋만 제거. 위젯 타입 클래스는 보존 |
| 실측 충돌 | `newtab.js:2663` `applyMeasuredCollision()` | 축소 클래스를 **제거한 상태에서 측정**하고 같은 동기 블록에서 재적용 → ResizeObserver 폭주 방지, `isMeasuringCollision` 재진입 가드 |
| 사용자 문자열 렌더 | `newtab.js:1864` `createTodoItem()` | 항상 `textContent`. `innerHTML`은 하드코딩 SVG 아이콘에만 |
| 오류 문구 | `newtab.js:1350` | 무슨 일이 일어났는지 + 그 결과를 함께 말한다("저장하지 못했습니다. 변경 사항은 적용되지 않았습니다") |
| 이벤트 리스너 | `newtab.js:1471` `setupEventListeners()` | 컨테이너 1개에 델리게이션 + `data-*` 액션 속성 (`data-nav`, `data-todo-action`) |
| 회귀 하네스 | `test/positioning.smoke.js:234` | 프로덕션 핸들러를 직접 호출(`settings.handleWidgetPositionChange`)해 위치 로직을 **복제하지 않는다**. 스냅샷 JSON 문자열 비교 |
| 테스트 없음 | — | 단위 테스트 러너·`package.json`·빌드 단계가 **없다**. 검증은 `node --check` + 확장 컨텍스트에서 스모크 하네스 수동 실행 |

## Design Decisions

작성자 판단이며 사용자 요구가 아니다. Open Question 해소안을 포함한다.

**DD1 — `PRODUCT.md` anti-reference와 요약 배너의 충돌 해소.** `PRODUCT.md`는 "통계 카드, 진행률 바, 대시보드 그리드를 쓰지 않는다"를 anti-reference로 못 박는다. PRD의 "요약 배너"와 "진행도"는 그대로 만들면 이 금지에 정면으로 걸린다. 해소안: 배너를 **문장 한 줄**로 만든다(`오늘 마감 2건 · 지연 1건`). 카드·바·타일을 만들지 않고, 표시할 것이 0건이면 배너 노드 자체가 사라진다("마감 없음"을 말하지 않는다). 진행률 바는 만들지 않는다.

**DD2 — "진행도"의 정의를 개별 완료 체크 집계로 한정** (PRD OQ2 해소). *프로젝트* 라는 새 개념을 데이터 모델에 넣지 않는다. 넣는 순간 범위가 M1을 넘는다. 진행도는 배너의 완료/전체 카운트로만 표현한다.

**DD3 — 달력은 상단 밴드, 검색창의 9분할은 유지** (PRD OQ3 해소). 새 탭 진입 직후 시선이 닿는 곳이 상단이고, 검색창은 중앙이 기본값이라 상단 밴드가 기본 배치와 덜 부딪힌다. 검색창 위치 설정 9종은 **그대로 남긴다**(UI4의 정신 — 기존 조작을 뺏지 않는다). 검색창이 `top-*`일 때만 밴드 높이만큼 아래로 밀어낸다.

**DD4 — 달력 모드에서 위젯 위치 그리드는 숨기고, 저장값은 보존한다** (PRD OQ4 해소). `updatePositionSettingsVisibility()`가 이미 `calendarDataSetting`에 대해 같은 일을 하고 있으므로 동형 확장이다. `mainWidgetPosition`은 쓰지도 지우지도 않으므로 시계로 되돌리면 이전 위치가 그대로 복원된다.

**DD5 — 메모는 `calendarEvents` 단일 키에 계속 담는다** (PRD OQ5 해소). `manifest.json`에 `unlimitedStorage`가 **이미 있으므로**(`manifest.json:9`) 5MB/10MB 쿼터 논거가 성립하지 않고, 키 분리는 `persistEvents()`의 단일 원자적 쓰기 계약을 깨뜨린다(두 키 중 하나만 성공하는 부분 실패 상태가 생긴다). 대신 `MAX_NOTE_LENGTH = 2000`으로 상한을 두고, 저장 실패는 기존 오류 배너 계약으로 표면화한다.

**DD6 — 기존 M1 데이터는 `startDate = endDate = date`로 승격** (PRD OQ7 해소). all-day 마감에서 자명하다. 승격 후에도 **`date` 필드를 지우지 않고 `startDate` 값으로 계속 써 둔다** — `migrateSettingsToV2`가 레거시 키를 남기는 것과 같은 이유로, M1 코드로 롤백해도 달력이 그대로 렌더된다.

**DD7 — 전역 `eventsByDate` 인덱스를 렌더 창(42칸) 인덱스로 교체.** 범위 일정을 전역으로 날짜 전개하면 최악의 경우 `이벤트 수 × 범위 일수` 만큼 엔트리가 생긴다. 대신 렌더마다 이벤트를 한 번 순회해 표시 중인 42일 창에 겹치는 구간만 버킷에 담는다(`O(n + 겹침)`). 범위 상한 `MAX_RANGE_DAYS = 366`을 둔다.

**DD8 — 달력 모드에서 `collision-compact` / `matchSearchWidthToWidget`을 끈다.** 밴드는 폭이 100%라 "위젯 폭에 검색창을 맞추면" 검색창이 화면 전체로 늘어난다. 축소 밀도도 폭이 아니라 **밴드 높이 상한 + 내부 스크롤**로 해결한다. 시계 경로의 두 함수는 손대지 않는다(UI4).

**DD9 — `PRODUCT.md` / `DESIGN.md`를 이 브랜치로 가져온다.** 두 문서는 `feat/calendar-widget` 브랜치에만 있고 현재 브랜치에는 없다(`git ls-files` 확인). PRD가 제약의 근거로 인용하고 있고 이번 변경이 두 문서의 "위치 시스템"·"달력 내부 규칙" 절을 무효화하므로, 갱신 대상 파일이 브랜치에 존재해야 한다.

## Files to Change

| File | Action | Why |
|---|---|---|
| `newtab.js` | UPDATE | 데이터 모델 v3 + `migrateCalendarToV3()`, `CalendarManager` 범위 렌더·간편/상세 입력·요약, `SettingsManager` 달력 모드 분기 |
| `newtab.css` | UPDATE | 전체 너비 밴드, 이벤트 칩, 중요도 토큰, 상세 모달, 요약 한 줄, reduced-motion |
| `newtab.html` | UPDATE | 밴드 마크업, 요약 노드, 상세 모달, 간편 입력 |
| `test/positioning.smoke.js` | UPDATE | 달력 케이스 재범위 + 범위/마이그레이션/메모 케이스 추가, `addEvent` 시그니처 변경 반영 |
| `test/positioning.smoke.html` | UPDATE | 달력 베이스라인을 시계와 분리해 캡처하는 버튼 (T8에서 필요하다고 확정될 때만) |
| `PRODUCT.md` | CREATE→UPDATE | 브랜치로 가져온 뒤 원칙 2("한 번에 하나의 메인 위젯")·anti-reference와 밴드/배너의 관계를 명시 (DD9) |
| `DESIGN.md` | CREATE→UPDATE | "위치 시스템"·"달력 내부 규칙"이 달력에 한해 무효가 된다. 밴드 규칙과 중요도 토큰을 추가 (DD9) |
| `README.md` | UPDATE | 달력 사용법(범위 등록, 메모, 중요도) 반영 |
| `.claude/prds/calendar-widget-v2.prd.md` | UPDATE | Delivery Milestones 1행 `pending → in-progress` + Plan 경로 (본 계획 작성 시 반영 완료) |
| `manifest.json` | **NO CHANGE** | UI8 — 권한을 추가하지 않는다. `unlimitedStorage`는 이미 존재한다 |

## Tasks

### Task 0: 회귀 베이스라인 캡처 + 설계 문서 확보
- **Action**: 코드 변경 **전에** 확장을 로드해 `test/positioning.smoke.html`에서 "베이스라인 캡처"를 실행하고, 결과를 파일로도 내보내 보관한다(`chrome.storage.local.__smokeBaseline`은 하네스가 스토리지를 지우고 복원하는 경로를 타므로 브랜치 밖 사본을 남긴다). 이어서 `git checkout feat/calendar-widget -- PRODUCT.md DESIGN.md`로 설계 문서를 브랜치에 가져온다.
- **Mirror**: `test/positioning.smoke.js:609` 베이스라인 버튼 흐름
- **Validate**: 하네스 요약이 `베이스라인 N건 캡처 완료`이고 `오류 발생 케이스 0건`. `git status`에 `PRODUCT.md`/`DESIGN.md`가 추가됨

### Task 1: 데이터 모델 v3 + 마이그레이션
- **Action**: `CalendarEvent` typedef를 `{id, startDate, endDate, title, note, priority, done, createdAt, updatedAt, source, externalId, date}`로 확장(`date`는 DD6의 롤백용 잔존 필드, 항상 `startDate`와 동일하게 유지). `SETTINGS_VERSION = 3`으로 올리고 `migrateCalendarToV3()`를 추가한다 — 자체 버전 가드(`>= 3`)를 쓰고 `migrateSettingsToV2()`는 자체 가드(`>= 2`)로 바꿔 두 마이그레이션이 독립적으로 멱등이 되게 한다. `sanitizeImportedEvents()`에 `startDate`/`endDate`(왕복 검증 + `endDate >= startDate` + `MAX_RANGE_DAYS` 상한), `note`(`MAX_NOTE_LENGTH` 절단), `priority`(열거값 화이트리스트, 그 외 `normal`)를 추가한다. v2 형식(`date`만 있는 JSON)도 계속 받아들인다.
- **Mirror**: `newtab.js:86` 버전 가드 + 레거시 보존, `newtab.js:115` 화이트리스트 복사 + 날짜 왕복 검증
- **Validate**: `node --check newtab.js`. 하네스 `sanitize/table`·`migration/**` 케이스가 새 필드까지 포함해 통과. v2 JSON을 가져와도 항목이 유실되지 않음

### Task 2: 범위 인지 인덱스와 렌더
- **Action**: 전역 `rebuildIndex()`를 렌더 창 인덱스로 교체한다(DD7): 표시 중인 42일 구간과 겹치는 이벤트만 날짜 버킷에 담는다. `createDayCell`의 dot을 **범위 칩**으로 바꾼다 — 범위의 시작/중간/끝을 형태로 구분하고, 한 셀에 최대 2칩 + `+N`. `getDueState()`를 `endDate` 기준으로 판정하도록 고친다. `addEvent(dateKey, title)` → `addEvent({startDate, endDate, title, priority, note})`로 시그니처를 넓힌다.
- **Mirror**: `newtab.js:1712` `renderGrid()`의 fragment 1회 커밋, `newtab.js:1790` `createDots()`의 최대 N + `+N` 관용구
- **Validate**: `node --check`. 하네스에 추가한 월 경계 범위 케이스(예: 1/28~2/3)에서 두 달 모두 칩이 보임. 렌더 후 콘솔 오류 0건

### Task 3: 전체 너비 밴드 레이아웃 + 위치 설정 제거
- **Action**: `body[data-widget-type="calendar"]`에서 `.calendar-widget`을 좌우 0의 상단 고정 밴드로 만들고 `max-height` + 내부 스크롤로 높이를 억제한다(UI2, UI12). `applyWidgetSetting()`의 인라인 `display: 'block'`이 밴드 레이아웃을 덮어쓰므로 위젯 타입에 맞는 값으로 분기한다. 달력 모드에서 `matchSearchWidthToWidget()`·`collision-compact` 경로를 건너뛴다(DD8). 밴드 실측 높이를 `--calendar-band-height`로 내보내 검색창이 `top-*`일 때만 아래로 밀어낸다(DD3). 설정에서 위젯 위치 그리드를 숨긴다(DD4). `searchWidthByWidget.calendar`에 남아 있는 M1 시절 340px 캐시를 마이그레이션에서 제거해 첫 페인트에 잘못된 폭이 적용되지 않게 한다.
- **Mirror**: `newtab.js:2846` `calendarDataSetting` 표시 분기, `newtab.js:2582` 디바운스 ResizeObserver
- **Validate**: 하네스 `matrix/clock/**`·`toggle/clock/**`이 **diff 0**. 달력 모드에서 위젯 위치를 9종 모두 바꿔도 밴드 rect가 동일. 검색창 `top-*`에서 밴드와 교차하지 않음(`intersects: false`)

### Task 4: 간편 입력 (인라인)
- **Action**: 날짜 셀을 선택하면 열리는 기존 패널의 입력창을 밴드 문맥에 맞게 재배치하고, Enter 한 번으로 `startDate = endDate = 선택일`인 이벤트가 등록되게 한다. 저장 중 `is-pending` 입력 차단과 저장 후 포커스 복귀를 유지한다.
- **Mirror**: `newtab.js:1500` 폼 submit 후 `focus()` 복귀, `newtab.js:1369` `setPendingState()`
- **Validate**: 키보드만으로 날짜 이동 → 선택 → 제목 입력 → Enter까지 도달 가능. 저장 실패 시 항목이 화면에 남지 않음(원칙 4)

### Task 5: 상세 모달 (범위·중요도·메모)
- **Action**: 시작일/종료일, 중요도, 제목, 작업 메모(`MAX_NOTE_LENGTH`)를 받는 모달을 추가한다. 기존 `.modal` 구조를 재사용하고 포커스 트랩 + Esc 닫기를 건다. 그리드에서 범위 선택이 **키보드만으로** 가능해야 한다(Shift+방향키로 종료일 확장). 달력 루트의 기존 Esc 핸들러(`newtab.js:1523`)와 모달 Esc가 겹치지 않도록 모달이 열려 있으면 패널 Esc를 먹지 않게 한다.
- **Mirror**: `newtab.html:366` `addBookmarkModal` 구조, `newtab.js:1535` roving tabindex 키 처리
- **Validate**: `node --check`. Tab이 모달 밖으로 나가지 않음. Esc 1회로 모달만 닫히고 패널은 유지. 메모 2000자 초과 입력이 절단되어 저장됨

### Task 6: 중요도·마감의 시각 언어
- **Action**: 중요도를 색 + 형태(칩 좌측 두께/배지/dot)로 이중 부호화한다. 마감 임박·초과는 기존 `--calendar-overdue`/`--calendar-soon`을 재사용한다. `prefers-reduced-motion: reduce`에서 새 전환을 제거한다.
- **강조색 상한 (SKILL Output Constraint)**: 한 뷰포트에 경쟁하는 색상(hue) 계열을 **1개로 제한한다.** 기존 `--calendar-accent`(파랑) + `--calendar-overdue`(빨강) + `--calendar-soon`(주황)에 중요도 3색을 **새 hue로 추가하면 한 화면에 6계열이 깔려** `PRODUCT.md` anti-reference("알록달록한 위젯 모음")와 정면으로 충돌한다. 따라서 중요도는 **새 색을 만들지 않고** — (a) 형태(칩 좌측 막대 두께 3단계)를 1차 부호로, (b) 기존 마감 상태 hue의 **알파/명도 단계**를 2차 부호로 쓴다. 새 `--calendar-priority-*` 토큰을 만든다면 `--calendar-overdue`/`--calendar-soon`의 파생값이어야 하고 독립 hue여서는 안 된다.
- **Mirror**: `newtab.css:29` 달력 상태 색 토큰 블록, `newtab.css:2232` reduced-motion 블록
- **Validate**: 밝은 배경 사진을 깐 상태에서 **렌더된 픽셀 실측**으로 본문 4.5:1 / 큰 텍스트 3:1 확인(`PRODUCT.md` 접근성 절의 방법). 색을 회색조로 낮춰도 중요도가 구분됨

### Task 7: 요약 한 줄
- **Action**: 밴드 상단에 `오늘 마감 N건 · 지연 M건`을 문장 한 줄로 렌더한다(DD1). 카드·진행률 바를 만들지 않는다. **N=0 이고 M=0이면 노드를 렌더하지 않는다.** `aria-live="polite"`로 갱신을 알린다.
- **Mirror**: `newtab.js:1704` `renderTitle()`의 `textContent` 갱신, `newtab.html:300` `aria-live="polite"`
- **Validate**: 이벤트가 전무한 초기 상태에서 배너 DOM이 존재하지 않음. 지연 항목을 만들면 한 줄이 나타나고 완료 처리하면 사라짐

### Task 8: 하네스 확장 + 회귀 검증
- **Action**: `runPositionMatrix(collector, 'calendar')`를 **위치 무관 불변 검사**로 바꾼다(9×9 조합에서 밴드 rect가 동일한지 단언). `runDynamicCases`의 `addEvent` 호출을 새 시그니처로 고친다. 케이스 추가: v2→v3 마이그레이션(단일 날짜 승격 + `date` 필드 잔존 + 2회 멱등), 월 경계 범위 이벤트, 메모 길이 절단, `searchWidthByWidget.calendar` 정리. 시계 경로 diff 0을 먼저 확인한 뒤 달력 경로를 **의도된 변경으로 재베이스라인**한다.
- **Mirror**: `test/positioning.smoke.js:361` 마이그레이션 케이스 3종 구조(초회/멱등/레거시 무손상)
- **Validate**: 시계 관련 전 케이스 `동일`. 달력 케이스는 차이 목록을 한 건씩 검토해 의도된 변경임을 확인한 뒤 새 베이스라인 캡처. 전 케이스 `오류 발생 0건`

### Task 9: 설계·사용 문서 갱신
- **Action**: `DESIGN.md`의 "위치 시스템"에 달력 예외를, "달력 내부 규칙"에 밴드 규칙·칩·요약 한 줄을 추가한다. `PRODUCT.md` 원칙 2와 anti-reference에 대해 밴드/배너가 왜 위반이 아닌지 기록한다(DD1). `DESIGN.md`가 달력 배경을 "알파 0.7"로 적고 있으나 실제 CSS는 `--bg-secondary-glass`(0.3) + `brightness(0.62)`이므로 실제 구현과 맞춘다. `README.md`에 범위 등록·메모·중요도를 반영한다.
- **Mirror**: `DESIGN.md`의 "현재 코드에서 캡처한 시각 시스템" 서술 방식 — 규범이 아니라 실제 값을 적는다
- **Validate**: 문서에 적힌 토큰·클래스명이 `newtab.css`에 실제로 존재함(grep 대조)

## Validation

```bash
# 1. 구문 검사 (빌드 단계·테스트 러너가 없으므로 이것이 유일한 자동 게이트)
node --check newtab.js
node --check test/positioning.smoke.js

# 2. 타입 검사 (@ts-check 파일 — 네트워크 가능할 때만, 선택)
npx -y typescript@5 tsc --noEmit --allowJs --checkJs --target es2022 newtab.js

# 3. 회귀 스모크 (수동 — 확장 컨텍스트 필수)
#    chrome://extensions → 압축해제 로드 → chrome-extension://<id>/test/positioning.smoke.html
#    "베이스라인과 비교" 실행 → 시계 케이스 전부 '동일', 오류 발생 케이스 0건
#    localhost로 열면 chrome.storage가 없어 앱이 죽는다 (확장 컨텍스트에서만 실행)

# 4. 대비 실측 (수동)
#    밝은 배경 이미지를 설정한 뒤 렌더된 픽셀을 측정해 본문 4.5:1 / 큰 텍스트 3:1 확인
```

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **하네스 베이스라인이 달력 전 케이스에서 깨진다** — 위치를 제거하면 `matrix/calendar/**` 81건 + `toggle/calendar/**` + `dynamic/**`의 rect가 전부 달라진다. PRD의 "diff 0 확인" 완화책은 달력 절반에 대해 성립하지 않는다 | High | Task 8에서 하네스를 재범위: 시계 경로만 diff 0을 강제하고, 달력 경로는 "위치를 바꿔도 rect가 불변"이라는 **새 불변식**으로 교체한 뒤 재베이스라인 |
| **`PRODUCT.md` anti-reference 위반** — 요약 배너·진행도는 "통계 카드/진행률 바 금지"에 정면으로 걸린다 | High | DD1/DD2로 해소(문장 한 줄, 0건이면 소멸, 진행률 바 없음). 이것으로 부족하다고 판단되면 원칙 예외 여부를 사용자에게 다시 묻는다 |
| **첫 페인트에 잘못된 검색창 폭** — `searchWidthByWidget.calendar`에 M1 시절 340px가 남아 있으면 `applyInitialOverlap()`이 밴드 모드에서 그 값을 즉시 적용한다 | Medium | Task 3에서 마이그레이션이 해당 캐시 항목을 제거. 하네스에 전용 케이스 추가 |
| **`applyWidgetSetting()`의 인라인 `display: block`** — CSS 밴드 레이아웃을 인라인 스타일이 덮어쓴다 | Medium | Task 3에서 위젯 타입별로 분기. 시계 경로의 값은 그대로 유지(UI4) |
| **마이그레이션 되돌릴 수 없음** — v3 쓰기 후 M1 코드로 롤백하면 `date`가 없어 전 이벤트가 사라진다 | Medium | DD6 — `date` 필드를 `startDate` 값으로 계속 유지해 M1 렌더 경로가 그대로 동작. 하네스 마이그레이션 케이스에서 `date` 잔존을 단언 |
| **범위 인덱스 성능** — 전역 날짜 전개는 이벤트 수 × 범위 일수만큼 엔트리를 만든다 | Medium | DD7 — 렌더 창 42일에 겹치는 구간만 버킷화. `MAX_RANGE_DAYS = 366` 상한 |
| **설계 문서가 브랜치에 없다** — PRD가 인용하는 `PRODUCT.md`/`DESIGN.md`가 `feat/calendar-widget`에만 존재 | Medium | DD9 — Task 0에서 브랜치로 가져온다. 가져오지 않으면 Task 9의 갱신 대상이 없다 |
| **Esc 키 경합** — 상세 모달과 달력 패널이 모두 Esc를 처리한다 | Low | Task 5에서 모달 열림 상태를 우선. 하네스가 아니라 수동 확인 대상 |
| **증거 부재** — 전 범위가 미검증 가정 위에 있다 (PRD Evidence) | High | 계획으로 해소되지 않는다. M1 릴리스를 측정 장치로 취급하고 2주 dogfooding 후 M2 범위를 재결정한다는 PRD 결정을 그대로 따른다 |

## Design Routing Guide

routing mode: `auto` (구현 단계에서 유효). plan 단계는 아무것도 호출하지 않으며 아래는 체크리스트다.

| Stage | Command |
|---|---|
| discovery | `/impeccable shape` |
| refine | `/impeccable layout` · `/impeccable typeset` · `/impeccable animate` · `/impeccable colorize` · `/impeccable bolder` · `/impeccable quieter` · `/impeccable overdrive` · `/impeccable delight` |
| simplify | `/impeccable adapt` · `/impeccable distill` · `/impeccable clarify` |
| evaluate | `/impeccable critique` · `/impeccable audit` |
| harden | `/impeccable harden` · `/impeccable optimize` · `/impeccable onboard` |
| polish | `/impeccable polish` |
| system | `/impeccable document` · `/impeccable extract` |

Task 3(밴드 레이아웃)과 Task 6(시각 언어)이 `refine`/`evaluate` 단계의 실제 소비 지점이고, Task 9가 `system` 단계에 대응한다.

## Acceptance

- [ ] Task 0–9 전부 완료
- [ ] `node --check` 통과 (`newtab.js`, `test/positioning.smoke.js`)
- [ ] 스모크 하네스: 시계 관련 전 케이스 `동일`, 전 케이스 `오류 발생 0건`
- [ ] 달력 케이스 차이 목록을 한 건씩 검토해 의도된 변경으로 확인 후 재베이스라인
- [ ] 달력 모드에서 위젯 위치 9종을 바꿔도 밴드 rect 불변
- [ ] 시계 모드 화면·동작 무변화 (UI4)
- [ ] `manifest.json` 무변경 (UI8)
- [ ] v2 데이터가 `startDate = endDate`로 승격되고 `date` 필드가 잔존 (롤백 안전)
- [ ] 마감 0건·지연 0건일 때 요약 노드가 DOM에 없음
- [ ] 밝은 배경에서 렌더 픽셀 실측 대비 AA 충족
- [ ] 키보드만으로 범위 선택 → 상세 모달 → 저장까지 도달 가능
- [ ] 패턴을 재발명하지 않고 `## Patterns to Mirror`를 따랐다

## Design Critique

- detect: `skill_available=true` · `design_signal=true` · `reason=ok` · `silent_skip=false` · signal files `newtab.css`, `newtab.html`, `test/positioning.smoke.html`
- routing mode: `auto` (plan 단계는 recommend-only — 렌더된 UI가 없어 impeccable 명령을 호출하지 않는다)
- 라운드: 1 / cap 2 · 판정: **CONVERGED**
- SKILL `## Output Constraints` 4개 앵커 대조 결과:

| 앵커 | 결과 | 근거 |
|---|---|---|
| 정보 위계 3단계 (heading depth ≤ 3) | PASS | 계획 본문 최대 깊이 `###` |
| 강조색 화면당 1개 | **FIXED (MEDIUM)** | Task 6가 중요도 3색을 신설하면 기존 accent/overdue/soon과 합쳐 한 뷰포트 6 hue가 된다 → 새 hue 금지, 형태 + 기존 hue의 알파/명도 파생으로 부호화하도록 Task 6에 제약 추가 |
| raw markdown marker 금지 | PASS | 렌더 표면은 전부 `textContent` 경로 (`## Patterns to Mirror`) |
| 한 화면 항목 수 상한 | PASS | 셀당 칩 2개 + `+N` (Task 2), 요약은 한 줄 + 0건이면 소멸 (Task 7) |

## Codex Adversarial Review

> **Codex skipped per MCCP_CODEX_DISABLED=1 (env-level policy).** 이 계획은 외부 적대적 리뷰를 **받지 않았다.**

- 호출: `node .../scripts/lib/plan-codex-runner.js` (codex-intent-context M1 — 리뷰·판정·receipt 봉인이 한 프로세스)
- 분류: `disabled` (env-level policy, first-class skip — advisory 모드가 아니다)
- 라운드 수: 1
- 합치 결론: Codex가 실행되지 않았으므로 **합치 결론이 없다.** 아래 리뷰 대상 3건은 미검증 상태로 남는다
- YAGNI Triage: 해당 없음 (findings 0건 — 리뷰 미실행)
- Deferred to backlog: 0
- Open Questions: 없음 (auto-CRITICAL 해당 없음)
- Intent gate: `verdict=skipped` · `skip_proof=codex_disabled` · `intent_section_present=true` · `intent_items_count=12`

**적대적 리뷰를 받았다면 향했을 지점** (구현 중 자체 검증 대상으로 남긴다):

1. **DD6** — 모든 이벤트에 `startDate`와 동일한 레거시 `date` 필드를 남기는 것이 이중 진실 원천을 만드는가. 어느 경로에서 조용히 어긋날 수 있는가
2. **DD8** — 달력 모드에서 `collision-compact`/`matchSearchWidthToWidget`을 끄고 밴드 `max-height` + 내부 스크롤로 대체하는 것이, 짧은 뷰포트에서 전체 너비 밴드와 검색창의 충돌을 실제로 막는가
3. **Task 8** — 시계 경로만 diff 0을 강제하고 달력 경로를 재베이스라인하는 전략이 달력에 대한 회귀 탐지력을 유지하는가, 아니면 구현 결과를 그대로 승인해 주는가

> Codex 리뷰를 실제로 받으려면 `MCCP_CODEX_DISABLED`를 해제하고 `/mccp:plan .claude/prds/calendar-widget-v2.prd.md`를 다시 실행한다.
