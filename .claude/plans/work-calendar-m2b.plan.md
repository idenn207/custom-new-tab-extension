# Plan: 불연속 배치가 화면에 그대로 보인다 (업무 캘린더 M2b)

**Source PRD**: `.claude/prds/work-calendar.prd.md`
**Selected Milestone**: M2 — 작업이 실제 업무 모양을 담는다 (**후반부**)
**Paired plan**: `.claude/plans/work-calendar-m2.plan.md` (전반부 — 데이터)
**Complexity**: Medium

## Summary

M2는 두 플랜으로 갈렸다. PRD의 M2 결과문에 동사가 둘 있고 그 둘이 서로 다른 일이기 때문이다 — 작업이 업무 모양을 **담는다**(데이터)와 불연속 배치가 그대로 **표현된다**(화면). 앞의 것은 `work-calendar-m2.plan.md`가 하고, **이 플랜은 뒤의 것만 한다.**

전반부가 끝난 시점의 상태는 이렇다 — 저장소에는 `gates[]`와 `projectId`가 있고 마감 의미는 종단 관문에서 나오는데, **화면은 아직 파생 `startDate..endDate` 범위로 셀을 채운다.** 데이터는 불연속인데 그림은 연속이다. 이 플랜이 그 간극을 닫는다.

**바꾸는 것은 "어느 셀이 차는가" 하나다.** 새 색·새 칩 모양·새 아이콘·새 상시 표면을 만들지 않는다(UI4). 관문을 **어떻게** 보일 것인가는 M3이 정한다.

## 이 플랜이 전반부와 갈린 이유

santa 루프가 8라운드를 돌고 캡에서 종료했다(`.claude/reviews/santa-review-work-calendar.md`). 41건이 해소됐지만 새 지적이 4·4·4로 평평해졌고, 마지막 세 라운드 12건 중 **여섯이 "한 자리를 고치고 쌍둥이를 남긴 것"**이었다 — DD는 고쳤는데 Task Action이 낡았고, Task는 고쳤는데 Acceptance가 낡았다.

원인은 결함이 아니라 **결합**이었다. 1,000줄 한 문서에서 하나의 결정이 DD·Task Action·Validation·Acceptance 네 자리에 흩어져 있고, 그 넷을 함께 잡아 줄 기계가 없다. 특히 점유 전환(DD31)이 등가 케이스·Task 7 허용 diff·Acceptance 세 자리를 동시에 흔들었고, 그 셋이 서로를 부정하는 상태가 세 번 반복됐다.

**가른 자리가 그 결합을 끊는다.** 전반부는 "화면이 안 바뀐다"를 단언하므로 등가 케이스가 예외 없이 단순해지고, 이 플랜은 "화면이 이렇게 바뀐다"만 단언하므로 그 변화를 한 자리에서 열거할 수 있다. 두 플랜이 같은 문장을 두 번 적을 일이 없다.

## User Intent

전반부와 공유하는 제약은 그 플랜의 표를 따른다. 이 플랜이 직접 지는 것만 적는다.

| ID | Constraint (user-stated) | Kind |
|---|---|---|
| UI4 | 화면은 기존 표면을 재사용하는 수준으로만 바뀐다 | constraint |
| UI5 | 겹침을 막지 않는다. 겹침·밀집 경고를 만들지 않는다 | exclusion |
| UI8 | 프로젝트를 강제하지 않는다. 기본값은 마지막에 쓴 프로젝트이고 무소속 자리를 남기며, 첫 실행 온보딩을 M2에 포함한다 | constraint |
| UI13 | 시계 모드의 동작과 화면은 이 작업으로 달라지지 않는다 | exclusion |
| UI15 | 불연속 배치는 M2에서 화면에 표현된다. 월·수 관문이면 화요일 셀이 비어 보여야 한다 | constraint |

**UI8과 UI15가 "M2에 포함한다"·"M2에서 표현된다"라고 말한다.** 이 플랜이 그 M2의 후반부이므로 둘 다 지켜진다 — 다만 **PRD의 M2 행은 두 플랜이 모두 끝나야 `complete`가 된다.** 전반부만 끝난 상태는 M2가 끝난 상태가 아니다. 그 표기 규칙을 Task 5가 강제한다.

**UI15는 통째로 이 플랜이 지고 UI8은 셋 중 하나만 진다 — 그 경계를 여기 적는다**(santa R1 B2). UI8의 문장은 요구 셋이고, 앞의 둘은 **전반부**가 이미 진다: "프로젝트를 강제하지 않는다(무소속 `null` 자리)"는 전반부 DD7·Task 3이, "기본값은 마지막에 쓴 프로젝트"는 전반부 Task 3의 설정 키 `lastUsedProjectId`가 받는다. **이 플랜이 지는 것은 셋째 "첫 실행 온보딩" 하나이고**, 그것을 DD13과 Task 3이 받는다. 전반부의 같은 자리(`work-calendar-m2.plan.md` User Intent 아래)가 이 분할을 같은 말로 적고 있다 — 한쪽만 적으면 그것이 다음 쌍둥이가 된다.

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| 인덱스 구조 | `newtab.js:2097` `rebuildIndex()` | `eventsByDate`는 `Map`이고 **날짜 키 하나에 이벤트 배열**이 달린다(`bucket.push`). 키 목록에서 셀별 개수를 알 수 없다 |
| 패널의 조회 우회 | `newtab.js:2124` 주석 + `2129` `getEventsForDate()` | 패널은 렌더 창 밖 날짜를 열 수 있어 **창 인덱스를 일부러 우회하고 전체를 훑는다.** 그 이유는 이 플랜에서도 유지된다 — 바꾸는 것은 조회 규칙이지 우회 여부가 아니다 |
| 칩 상한 | `newtab.js:2820`·`2843` `createChips()` | `MAX_CHIPS_PER_CELL`로 자르고 넘치면 `+N`을 붙인다. 그러므로 **칩 개수 ≠ 버킷 길이**다 |
| 상시 아닌 안내 | `newtab.js:459` `applyStorageNotice()` | 상시 표면을 늘리지 않고 필요할 때만 나타난다. 온보딩이 따라야 할 형태 |
| 레이아웃 무변 단언 | `test/positioning.smoke.js:909` `runErrorBannerGeometryCases()` | 표면 하나가 늘어도 밴드 높이·패널 스크롤이 안 움직이는지를 단언하는 관용구 |
| 도메인 투영 | `test/positioning.smoke.js:497` `migration-v3/01-promote` | 의미를 볼 때는 `collector.add(name, value)`의 `value`에 도메인 값을 직접 담는다 |
| 날짜의 상대성 | `test/positioning.smoke.js:633` 머리말 + `shiftDateKey()` | 날짜는 전부 `todayKey` 기준 상대값이다. 고정 날짜는 돌리는 날에 따라 케이스를 뒤집는다 |
| 스냅샷의 범위 | `test/positioning.smoke.js:191` `snapshot()` | rect·display·classes·`inlineWidth`와 교차 여부만 담는다. **색·문구·칩 형태를 담지 않으므로 시각 언어 변화를 보지 못한다** |

## Design Decisions

### DD31 — `rebuildIndex()`는 파생 `min..max`가 아니라 `gates[].planned`로 셀을 채운다

전반부의 DD4가 연속 범위를 파생값으로 강등한 것은 **v3 롤백용 잔존 필드를 남기기 위해서이지 점유의 근거로 삼기 위해서가 아니다.** 잔존 필드를 점유 계산에 쓰면 강등이 이름만 강등이 된다 — 저장은 관문으로 하면서 화면은 여전히 범위로 말하므로, 사용자가 보는 것은 M1과 같다.

`rebuildIndex()`가 이벤트마다 `event.gates`를 돌며 `g.planned` 하나하나를 버킷에 넣는다. **단, 한 이벤트는 한 날짜에 한 번만 들어간다** — 이벤트별로 `planned`를 집합으로 접은 뒤 넣는다(santa R0 B2). 전반부 DD25가 같은 날 `dev`·`review`를 **허용하므로**, 접지 않으면 그 이벤트가 같은 버킷에 두 번 들어가 그리드는 칩을 둘 그리는데 DD32의 `getEventsForDate()`는 `.some(...)`이라 패널에 하나를 낸다 — 아래 DD32가 막으려는 바로 그 불일치가 다른 입구로 돌아온다. **접는 것은 이벤트 안에서만이다**: 서로 다른 이벤트가 같은 날에 서는 것은 그대로 버킷 길이 둘이고, 그것이 Task 1 고정 입력 3번이 지키는 구분이다. 파생 `startDate`·`endDate`는 인덱스 입력에서 빠지고 DD4가 정한 원래 용도(v3 롤백 입력)로 돌아간다. `dropped` 관문도 버킷에 들어간다 — **계획은 남는다.** 안 하기로 한 것과 애초에 없던 것은 다르고, 그 구분이 PRD가 M2에 요구한 "범위축소가 구분되어 남는다"의 화면 쪽 몫이다.

이 결정은 santa R0에서 리뷰어가 PRD와 플랜의 어긋남을 잡은 뒤 **사용자가 정했다**(2026-08-22). 대안은 PRD의 M2 행에서 "표현된다"를 M3으로 내리는 것이었고 기각됐다.

### DD32 — 점유를 읽는 자리는 둘이고, 둘 다 바꾼다

그리드는 `rebuildIndex()`가 만든 버킷을 보고, 상세 패널은 `getEventsForDate()`를 본다(`newtab.js:2874` → `2129`). 그런데 후자는 **범위 조회**다 — `event.startDate <= dateKey && dateKey <= event.endDate`.

앞의 것만 바꾸면 그리드는 화요일을 비워 두는데 **화요일 칸을 누르면 패널에 그 이벤트가 나온다.** 한 날짜에 대해 그리드와 패널이 다른 답을 내면 불연속 배치는 구현된 것이 아니라 반쯤 구현된 것이고, 사용자가 보는 것은 버그다.

`getEventsForDate(dateKey)`를 `event.gates.some((g) => g.planned === dateKey)`로 바꾼다. **창 인덱스를 우회하는 이유는 그대로 지킨다** — 패널이 렌더 창 밖 날짜를 열 수 있다는 사실은 변하지 않았고(`newtab.js:2124`의 주석이 그것을 기록한다), 바뀌는 것은 "그 날짜에 이 이벤트가 있는가"의 판정 규칙뿐이다.

### DD33 — 이 플랜의 등가 단언은 "무엇이 달라졌는가"를 열거한다

전반부의 등가 케이스는 "마이그레이션이 의미를 바꾸지 않았다"를 단언한다 — 예외가 없다. **이 플랜은 반대다.** 여기서는 화면이 의도적으로 달라지므로, 단언이 "안 달라졌다"일 수 없고 "**이렇게** 달라졌다"여야 한다.

그리고 그 열거는 **케이스 이름과 기대값까지** 적는다. "값이 바뀌는 것은 허용"이라고 넓히면 재베이스라인이 모든 회귀를 삼키는 문이 된다.

투영에 담는 셋을 이름으로 못박는다 — **셋이 서로 다른 것이다.**

- `bucketKeys` — `rebuildIndex()`가 만든 **날짜 키 목록**. 날짜당 키가 하나뿐이므로 같은 날짜가 두 번 나오지 않는다
- `bucketSizesByDate` — 날짜별 **버킷 배열의 길이**. 같은 날에 이벤트 셋이 서면 `3`이다. 키 목록에서는 이 수를 알 수 없다
- `chipCountsByDate` — 각 셀에 실제로 **그려진 칩 개수**. `createChips()`가 `MAX_CHIPS_PER_CELL`로 자르므로 버킷 길이와 같지 않을 수 있다

### DD13 — 첫 실행 온보딩은 "프로젝트가 없다"와 "못 읽었다"를 가른다

프로젝트가 하나도 없을 때 한 번 뜨는 안내를 만든다. 조건은 `this.projects.length === 0 && !this.projectsLoadFailed` **둘 다**이다.

전반부의 DD27a가 읽기 실패를 `this.projects = []` + `projectsLoadFailed = true`로 표현하므로, 앞 조건만 보면 **프로젝트가 멀쩡히 있는데 못 읽은 상태**가 "첫 실행"으로 오인된다. 그러면 둘 중 하나가 난다 — 안내를 따라 프로젝트를 만들려 해도 `persistProjects()`가 봉인돼 실패하거나, 건너뛰기를 눌러 **한 번뿐인 온보딩 플래그를 첫 실행도 아닌데 태운다.**

읽기 실패 상태에서는 온보딩 대신 전반부 DD27c의 상시 고지가 화면을 맡는다. 그 상황에서 사용자에게 필요한 말은 "프로젝트를 만드시겠어요?"가 아니라 "목록을 못 읽었습니다"이다.

프로젝트 이름 하나를 받아 만들고, 건너뛰면 무소속으로 계속 쓴다. **건너뛴 경우에도 다시 뜨지 않는다** — 무소속이 정상 상태이므로(UI8) 반복 안내는 강제가 된다.

### DD34 — 온보딩은 점유 전환 뒤에 온다

온보딩이 만드는 것은 프로젝트인데, **프로젝트를 읽는 화면이 아직 적응되지 않은 자리에서 그것을 만들면 만들자마자 보이지 않는다.** 그래서 Task 3(온보딩)이 Task 1·2(점유·표면) 뒤에 선다. 전반부 DD14가 같은 판단으로 Task 순서를 정한 것과 같은 규칙이다.

### DD35 — 이 플랜은 자기 베이스라인을 따로 뜬다

전반부가 하네스와 베이스라인을 이미 한 번 움직였다. 이 플랜의 diff 축은 **전반부가 끝난 상태**를 기준으로 재야 하므로, 전반부의 `rebaseline.sha256`을 그대로 쓰지 않고 Task 0이 새로 뜬다.

앵커는 셋이 된다 — 전반부의 `work-calendar-m2.baseline.sha256`(구현 전 기록)·`work-calendar-m2.rebaseline.sha256`(전반부 종료), 그리고 이 플랜의 `work-calendar-m2b.rebaseline.sha256`(후반부 종료). 셋 다 `.claude/plans/` 아래에 있고 셋의 차이가 M2 전체가 하네스를 어떻게 움직였는지의 감사 기록이다. **축약명(`m2b-rebaseline.sha256` 식)을 쓰지 않는다** — 앞선 판이 이 자리와 Acceptance 에서만 축약명을 써 Files to Change·Task 0·Validation 이 요구하는 실제 파일과 다른 이름 체계를 가리켰고, 그러면 체크리스트를 수행한 사람과 `-c` 가 검사하는 대상이 갈라진다(santa R3 B2 — santa R0·R1 에 이어 세 번째로 올라온 지적이라 이번에 고친다).

## 이 플랜이 다루지 않는 것

- **관문의 시각 언어** — 종류별 색·모양·아이콘은 M3이 정한다(UI4). 이 플랜은 기존 칩·뱃지 토큰을 그대로 쓴다
- **겹침·부하 표시** — UI5가 금지한다. 겹침은 그대로 보이되 경고도 밀도 표현도 만들지 않는다
- **스키마 변경** — 전반부가 확정했다. 이 플랜은 읽기만 한다
- **백업·복구** — M2.5의 몫이다

## Files to Change

| File | Action | Why |
|---|---|---|
| `newtab.js` | UPDATE | `rebuildIndex()`·`getEventsForDate()` 점유 전환(DD31·DD32), 렌더 표면이 `gates`·`projectId`를 읽게 적응, 온보딩 표면 |
| `newtab.html` | UPDATE | 온보딩 안내 표면 |
| `newtab.css` | UPDATE | 온보딩의 최소 스타일. 새 시각 언어를 만들지 않는다 |
| `test/positioning.smoke.js` | UPDATE | `runCalendarOccupancyCases()` · `runCalendarOnboardingCases()` 신설, `runAll()` 배선, 재베이스라인 |
| `work-calendar-m2b.baseline.json` | CREATE | Task 0이 내려받아 저장소 루트에 두고 Task 4가 재베이스라인 뒤 덮어쓴다. 두 sha256이 이 파일을 해싱하므로 커밋되지 않으면 `shasum -c`가 없는 파일에서 죽는다 |
| `.claude/plans/work-calendar-m2b.baseline.sha256` | CREATE | Task 0이 뜬 구현 전 앵커. **기록이지 끝 상태 게이트가 아니다** |
| `.claude/plans/work-calendar-m2b.rebaseline.sha256` | CREATE | Task 4가 재베이스라인 직후에 뜬 앵커. **끝 상태 게이트는 이쪽이다** |
| `.claude/prds/work-calendar.prd.md` | UPDATE | M2 행을 `complete`로. 전반부만으로는 바꾸지 않는다 |
| `README.md` | UPDATE | 불연속 배치 동작 갱신 |

**바꾸지 않는 것**: 시계 모드 경로(`ClockManager`), 배경·즐겨찾기·이미지·검색 매니저, `createCalendarEvent()`·`createCalendarGate()`·`promoteEventsToV4()` 등 전반부가 확정한 데이터 경로.

## Tasks

### Task 0: 후반부 베이스라인 확보

- **Action**:

  **만드는 것 — 셋이다.**
  1. `work-calendar-m2b.baseline.json` — 하네스의 `베이스라인 내보내기` 버튼으로 내려받아 저장소 루트에 둔다. **버튼과 그 리스너는 전반부 Task 0이 이미 만들었다**(`test/positioning.smoke.html`의 마크업 + `test/positioning.smoke.js`의 `addEventListener`) — 이 플랜은 그것을 쓰기만 한다
  2. `.claude/plans/work-calendar-m2b.baseline.sha256` — `shasum -a 256 test/positioning.smoke.js work-calendar-m2b.baseline.json > .claude/plans/work-calendar-m2b.baseline.sha256` — **`shasum` 이 없으면 `sha256sum` 에 같은 인자를 준다.** 출력 형식이 같아 `-c` 가 서로 읽는다 (santa R2 B0)
  3. 전반부가 끝난 상태에서 **단언 실패 0건**임을 먼저 확인한다. 실패가 있는 채로 뜬 베이스라인은 회귀를 기준으로 굳힌다. **그리고 그 사실이 봉투에 남아야 한다** — `베이스라인 내보내기`가 내려주는 JSON 의 `meta.assertFailures` 가 `0` 이어야 하고, **Validation 3 이 그 값을 기계로 읽어 아니면 죽는다**(santa R3 B1). 눈으로 확인하는 것만으로는 오염된 베이스라인이 앵커로 굳는 것을 막지 못한다 — 전반부는 이 기계 검사를 갖고 있었는데 분할 때 이쪽으로 오지 않았다

  **고치는 것**: 없다.

  > **절차 규칙이고 기계적 강제가 없다.** 이 저장소에는 CI도 커밋 훅도 없으므로 Task 0을 건너뛰고 Task 1을 커밋하는 것을 막을 수단이 없다. 그 사실을 숨기지 않고 적는다 — 강제가 아니라 규율이다. 헤드리스 러너 도입이 유일한 실질 수리이며 이 마일스톤 밖이다(백로그 `id=m2-headless-runner`).
- **Mirror**: 전반부 Task 0 — 파괴적 단계 앞에 베이스라인을 먼저 세운다
- **Validate**: `shasum -a 256 -c .claude/plans/work-calendar-m2b.baseline.sha256`(또는 `sha256sum -c` — santa R2 B0)이 그 자리에서 통과한다. 이후로는 기록이지 게이트가 아니다

### Task 1: 점유 전환 (첫 비가역 지점)

- **Action**:

  **만드는 것 — 하나다.**
  1. `test/positioning.smoke.js` `runCalendarOccupancyCases(collector)` — 고정 입력을 **여기 적는다**. 날짜는 전부 `shiftDateKey(calendar.todayKey, ±n)`으로 만든다:

     | # | 관문 `planned` | 기대 점유 날짜 | 무엇을 잡는가 |
     |---|---|---|---|
     | 1 | `today-3`, `today` | `today-3`, `today` **둘뿐** | 폭 있는 항목의 사이 날짜가 비는가 (**이 케이스의 반증자**) |
     | 2 | `today` | `today` | 폭 없는 항목이 그대로인가 |
     | 3 | `today`, `today` (이벤트 둘) | `today` 하나, 버킷 길이 2 | 키 목록과 버킷 길이가 다른 것임을 드러낸다 |
     | 4 | `today-1`(dropped), `today+1` | `today-1`, `today+1` **둘 다** | `dropped`가 점유에 남는가 (DD31) |
     | 5 | `today`(`kind: 'dev'`), `today`(`kind: 'review'`) — **이벤트 하나** | `today` 하나, 버킷 길이 **1** | 전반부 DD25가 허용하는 같은 날 관문 둘이 한 이벤트를 두 번 점유하지 않는가 (santa R0 B2) |

     **각 고정 입력 줄에 주석 표식 `DD31-FIXTURE`를 단다.** Validation이 그 표식을 세어 **다섯** 미만이면 죽는다. 표식이 값의 정확성을 증명하지는 않지만, "폭 없는 항목만으로 케이스를 써 두어 DD31이 구현되지 않아도 통과하는" 실패 모양은 확실히 잡는다.

  **고치는 것 — 둘이고 둘 다 필수다(DD32).**
  - `rebuildIndex()`(`newtab.js:2097`) — `event.gates`를 돌며 `g.planned` 각각을 버킷에 넣는다. **파생 `startDate`·`endDate`는 인덱스 입력에서 뺀다.** `dropped` 관문도 넣는다
  - `getEventsForDate(dateKey)`(`newtab.js:2129`) — `event.gates.some((g) => g.planned === dateKey)`로 바꾼다. 창 인덱스를 우회하는 구조는 그대로 둔다

  **하나만 고치면 그리드와 패널이 같은 날짜에 다른 답을 낸다**(DD32). 둘을 한 Task에 둔 이유가 그것이다 — 나누면 그 사이에 그 버그가 실재하는 커밋이 생긴다.
- **Mirror**: `newtab.js:2097` `rebuildIndex()`의 버킷 구성과 `2129` `getEventsForDate()`의 전체 훑기
- **Validate**: `runCalendarOccupancyCases(collector)`가 **다섯**을 전부 돌리고 아래 **다섯**을 단언한다(santa R1 B3 — santa R0 B2가 고정 입력과 단언을 하나씩 더하면서 이 머리말의 수를 넷으로 남겨 두었다).

  1. `assert(setEq(bucketKeys, allGatePlannedDates), '점유가 관문 집합과 다르다')` — 점유의 **정의**가 관문이라는 DD31의 단언이다
  2. `assert(isSubset(bucketKeys, legacyRangeDates), '관문에 없던 날을 점유했다')` — 관문은 옛 범위 안에 있으므로 새 날이 생길 수 없다
  3. 각 날짜 `d`에 대해 `assert(chipCountsByDate[d] === Math.min(bucketSizesByDate[d], MAX_CHIPS_PER_CELL), '그리드 칩이 인덱스와 어긋난다')` — **인덱스가 맞다는 것과 화면이 맞다는 것은 다른 주장이다.** `rebuildIndex()`만 옳게 고치고 `createChips()`가 옛 범위로 그리면 1·2번은 통과하고 여기서만 죽는다. 비교 대상이 **키 목록이 아니라 버킷 길이**인 것과 상한 절단을 함께 넣는 것이 요점이다(키 목록에서 유도하면 언제나 1이고, 자르지 않은 수와 비교하면 상한을 넘는 날에서 옳은 구현이 죽는다)
  4. **1번 고정 입력에서** `assert(bucketKeys.length === 2, '불연속 배치가 반영되지 않았다 — 4일 폭인데 점유가 줄지 않았다')` — 이 줄이 없으면 `rebuildIndex()`를 고치지 않고도 1~3번이 전부 통과한다

  5. **5번 고정 입력에서** `assert(bucketSizesByDate[today] === 1, '같은 날 관문 둘이 한 이벤트를 두 번 점유했다')` — 전반부 DD25가 허용하는 모양이고, 이벤트 안에서 접지 않으면 버킷 길이가 2가 되어 3번 단언을 타고 칩이 둘 그려진다(DD31, santa R0 B2)

  더해서 **그리드와 패널의 일치**를 단언한다 — 1번 고정 입력에서 `today-1` 셀이 비어 있고 **그 날짜의 `getEventsForDate()`도 빈 배열**인지. 둘 중 하나만 고치면 여기서 죽는다(DD32). **5번 고정 입력에서도 같은 일치를 본다** — `today` 셀의 칩이 **하나**이고 `getEventsForDate(today)`도 길이 **1**인지. 1번은 "둘 다 비었나"를 묻고 이쪽은 "둘 다 하나인가"를 물으므로, 접기 누락은 1번을 통과하고 여기서만 죽는다(santa R0 B2).

### Task 2: 렌더 표면 적응

- **Action**:

  **만드는 것**: 없다.

  **고치는 것 — 새 시각 언어를 만들지 않는다(UI4).**
  - `renderSummary` · `renderGrid` · `createDayCell` · `createChips` · `renderPanel` · `createTodoItem` — 새 데이터(`gates`·`projectId`)를 읽되 **기존 칩·뱃지 토큰을 그대로 쓴다.** 프로젝트는 기존 뱃지 자리에 이름만, 관문은 기존 칩 형태 그대로다
  - 겹침 경고를 만들지 않고 부하 표시도 하지 않는다(UI5 — M3의 몫)
- **Mirror**: `newtab.js:2655` `render()`의 호출 순서와 `2757` `createDayCell()`의 aria-label 구성
- **Validate**: 시계 모드 경로 `snapshot()` diff 0(UI13). **달력 경로의 기하 diff 0은 이 플랜에서 요구하지 않는다** — 점유가 바뀌면 칩이 붙는 셀이 달라지고 그것이 이 플랜의 목적이다. 달력 쪽 판정은 Task 1의 단언과 아래 Acceptance의 육안 대조가 한다

### Task 3: 첫 실행 온보딩

- **Action**:

  **만드는 것 — 둘이다.**
  1. `newtab.html`·`newtab.js` 첫 실행 안내 표면
  2. `test/positioning.smoke.js` `runCalendarOnboardingCases(collector)`

  **고치는 것**: `Application.initialize()` — 온보딩 판정을 잇는다.

  조건은 `this.projects.length === 0 && !this.projectsLoadFailed` **둘 다**이다(DD13). 이름 하나를 받아 프로젝트를 만들고, 건너뛰면 무소속으로 계속 쓴다. **건너뛴 경우에도 다시 뜨지 않는 플래그**를 저장한다.
- **Mirror**: `newtab.js:459` `applyStorageNotice()` — 상시 표면을 늘리지 않고 필요할 때만 나타난다
- **Validate**: 하네스 케이스 — 프로젝트가 없으면 뜨고, 건너뛰면 다시 뜨지 않고, **읽기 실패 상태(`projectsLoadFailed = true`)에서는 뜨지 않고 플래그도 타지 않으며**, 온보딩이 밴드 높이와 패널 스크롤을 바꾸지 않는다(`test/positioning.smoke.js:909` `runErrorBannerGeometryCases()`와 같은 형태)

### Task 4: 하네스 배선과 재베이스라인

- **Action**: Task 1·3이 만든 케이스 **둘**(`runCalendarOccupancyCases` · `runCalendarOnboardingCases`)을 `runAll()` 순서에 넣는다.

  재베이스라인 뒤 **`베이스라인 내보내기`를 다시 눌러 파일을 새로 받고** `work-calendar-m2b.baseline.json`을 덮어쓴 다음 뒤쪽 앵커를 뜬다 — `shasum -a 256 test/positioning.smoke.js work-calendar-m2b.baseline.json > .claude/plans/work-calendar-m2b.rebaseline.sha256` (`shasum` 이 없으면 `sha256sum` 으로 같은 인자를 준다 — santa R2 B0). 순서가 계약이다: (1) 재베이스라인 → (2) 재내보내기·덮어쓰기 → (3) 해시 생성. 재내보내기를 빠뜨리면 해시가 "옛 파일이 안 바뀌었다"만 증명하고, 비교에 실제로 쓰이는 베이스라인과 커밋된 파일이 같은지는 증명하지 않는다.
- **Mirror**: `test/positioning.smoke.js:975` `runAll()`의 실행 순서와 저장소 복원 규약
- **Validate**: 단언 실패 0건. 시계 경로 diff 0.

  **"설명되는 diff"를 열거로 못박는다.** 허용되는 diff는 **넷뿐**이다: (a) 새 케이스가 추가한 **새 키**(`occupancy/*` · `onboarding/*`), (b) 기존 케이스의 도메인 투영에 **새 필드가 늘어난 것**, (c) 필드 목록을 문자열로 담은 값이 그만큼 길어진 것, (d) **DD31이 요구하는 점유 축소 — 아래에 케이스 이름과 기대값까지 적는다.**

  - `range/01-month-boundary`(`test/positioning.smoke.js:568-589`) — 입력이 `{ startDate: '2026-01-28', endDate: '2026-02-03' }` 한 건이므로 관문은 그 **양 끝 둘**이 되고 사이 나흘은 점유에서 빠진다.
    - `januaryChipDates`: `['2026-01-28','2026-01-29','2026-01-30','2026-01-31']` → **`['2026-01-28']`**
    - `februaryChipDates`: `['2026-02-01','2026-02-02','2026-02-03']` → **`['2026-02-03']`**
    - `distinctDates`(둘의 합집합을 정렬한 **배열**이지 개수가 아니다): 7원소 → **`['2026-01-28','2026-02-03']`**
  - 위 셋 **말고** 기존 키의 기존 필드 값이 바뀌면 그것은 (d)가 아니다. **DD31의 파급이 여기서 끝난다는 것이 이 열거의 주장이고**, 다른 케이스에서 값이 움직였다면 점유 말고 다른 것이 함께 바뀐 것이므로 재베이스라인하지 말고 원인을 찾는다
  - 이 세 값은 **재베이스라인 전에 사람이 먼저 눈으로 맞춰 본다.** 재베이스라인은 diff를 지우는 동작이므로, 맞는지 보지 않고 누르면 (d)가 "모든 값 변화 허용"과 같아진다

### Task 5: PRD 갱신과 하루 재현 테스트

- **Action**: PRD의 M2 행을 `complete`로 바꾼다. **전반부와 이 플랜이 둘 다 끝났을 때만 바꾼다** — 어느 한쪽만으로는 M2의 결과문이 참이 되지 않는다.

  **하루 재현 테스트를 실제로 수행하고 결과를 적는다**(UI11). 하루치 실제 업무를 넣어 보고 관문이 몇 개 쓰였는지, 이름을 붙인 것이 몇 개인지, 불연속 배치가 실제로 눈에 들어오는지를 **관찰 목록으로** 적는다. 수치를 새로 만들지 않는다(UI10).
- **Mirror**: PRD Open Questions 절의 M1 해소 표기 형태 — `- [x] ~~...~~ **해소(날짜)** — 근거`
- **Validate**: PRD의 M2 행이 `complete`이고 Plan 칸이 두 플랜을 모두 가리킨다. 하루 재현 결과가 수치가 아니라 관찰 목록으로 적혀 있다

## Validation

**셸을 못박는다.** 아래는 POSIX sh/bash 문법이다. 이 저장소의 기본 셸은 PowerShell이고 거기서는 돌지 않는다 — Git Bash에서 돌린다. `shasum`이 없으면 `sha256sum`을 쓴다 — **3번 블록이 그 선택을 스스로 하므로 손으로 바꿀 필요가 없고**, Task 0·4 의 생성 명령에는 두 형태를 함께 적어 두었다 (santa R2 B0).

**승인 시점에 돌 수 있는 것은 1번뿐이다.** 2·3번은 구현이 있어야 돌고, 4번은 브라우저가 있어야 돈다.

```sh
# 1. 문법 (승인 시점에도 돈다)
node --check newtab.js
node --check test/positioning.smoke.js

# 2. 약속 이행 검사 — 이 플랜이 약속한 것이 실제로 있는가
#    선언 형태 둘을 가른다 — (1) 줄머리 키워드 선언, (2) 들여쓴 메서드 축약이되
#    같은 줄에서 `) {` 로 닫히는 것. 접두어를 선택적으로 두면 **호출 한 줄이**
#    **"선언이 있다"를 통과시킨다.** 이스케이프 없는 형태를 지킨다 — `[(]`·`[)]`·`[{]` 는 문자 클래스다.
decl() { printf '(^(function|async[[:space:]]+function|const|let|var)[[:space:]]+%s[[:space:]]*[(=:]|^[[:space:]]*(async[[:space:]]+)?%s[[:space:]]*[(][^)]*[)][[:space:]]*[{])' "$1" "$1"; }
for fn in runCalendarOccupancyCases runCalendarOnboardingCases; do
  grep -qE "$(decl $fn)" test/positioning.smoke.js || { echo "MISSING: $fn"; exit 1; }
done

#    배선 검사 — 둘 **전부**를 runAll() **본문 안에서** 찾는다.
#    범위를 좁히지 않으면 선언부 자신에 매치되어 배선을 안 해도 통과한다.
runall() { sed -n '/^async function runAll(/,/^}/p' test/positioning.smoke.js; }
[ "$(runall | wc -l)" -gt 5 ] || { echo "runAll() 본문을 뜨지 못했다 — 선언 형태를 확인하라"; exit 1; }
for fn in runCalendarOccupancyCases runCalendarOnboardingCases; do
  runall | grep -q "$fn(collector)" || { echo "NOT WIRED into runAll(): $fn"; exit 1; }
done

#    고정 입력 표식 — 다섯을 센다 (5번은 santa R0 B2 가 더한 같은 날 관문 둘 케이스)
F=$(grep -c "DD31-FIXTURE" test/positioning.smoke.js)
[ "$F" -ge 5 ] || { echo "DD31 고정 입력 표식이 ${F}개 — Task 1이 요구하는 다섯을 못 채운다"; exit 1; }

# 3. 앵커 — 끝 상태 게이트는 **뒤쪽**이다.
#    Task 0 의 baseline.sha256 은 구현 전 기록이고, Task 1~4 가 하네스를 고치므로
#    그것으로 끝 상태를 검사하면 설계상 반드시 깨진다.
#    해시 도구를 여기서 한 번 정하고 그것만 쓴다 (santa R2 B0 — 위 머리말이 "shasum 이
#    없으면 sha256sum 으로 바꾼다" 고 적어 놓고 실제 명령은 shasum 에 고정돼 있었다.
#    sha256sum 만 있는 환경에서는 구현이 옳아도 이 줄에서 죽는다). 출력 형식이 같다.
if command -v shasum >/dev/null 2>&1; then
  SHA256C() { shasum -a 256 -c "$@"; }
elif command -v sha256sum >/dev/null 2>&1; then
  SHA256C() { sha256sum -c "$@"; }
else
  echo "ANCHOR: shasum 도 sha256sum 도 없다 — 앵커 검사를 돌릴 수 없다"; exit 1
fi
#    **첫 앵커가 있는가** — Task 0 을 통째로 건너뛴 실행을 여기서 잡는다. 존재 검사는
#    `-c` 가 아니므로 재베이스라인과 충돌하지 않고, 사슬이 시작은 됐는지를 본다.
[ -f .claude/plans/work-calendar-m2b.baseline.sha256 ] || { echo "work-calendar-m2b.baseline.sha256 이 없다 — Task 0 의 앵커가 아예 없다(사슬이 시작되지 않았다)"; exit 1; }
#    **그리고 그 베이스라인이 깨끗한 실행에서 나왔는가** (santa R3 B1). 해시는 파일과
#    자기 해시가 맞는지만 보므로 **단언이 깨진 실행에서 뜬 베이스라인도 자기 해시와는
#    완벽히 맞는다** — 게이트가 성공하면서 전제가 무너지는 자리다. 그러면 실패한 실행의
#    스냅샷이 정상 기준으로 굳고, 이후 Compare 는 진짜 회귀를 그 오염된 기준과의 일치로
#    오인해 통과시킨다. 전반부 Validation 3 은 이 검사를 갖고 있었는데 **분할 때 이쪽으로
#    오지 않아 후반부만 fail-open 으로 남아 있었다.** Task 0 이 봉투에 담은 수를 읽는다.
grep -qE '"assertFailures"[[:space:]]*:[[:space:]]*0' work-calendar-m2b.baseline.json || { echo "work-calendar-m2b.baseline.json 이 단언 실패 0건을 증명하지 못한다 — 봉투에 meta.assertFailures 가 없거나 0이 아니다 (Task 0)"; exit 1; }
SHA256C .claude/plans/work-calendar-m2b.rebaseline.sha256

# 4. 스모크 하네스 — 브라우저에서 연다 (자동화 불가)
#    빈 프로필/시크릿 창에서 test/positioning.smoke.html 을 열고 Run → 단언 실패 0건,
#    Compare → 위 (a)~(d) 로 설명되는 diff 만 남는지 확인한다.
```

**2번이 통과해도 DD31·DD32가 충족된 것은 아니다.** 존재와 배선을 볼 뿐 `rebuildIndex()`가 실제로 관문을 읽는지는 보지 못한다. 그것을 보는 것은 4번의 단언뿐이고, 그것은 사람이 브라우저에서 돌려야 한다.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **점유 전환이 M3의 디자인 결정을 선점한다** | Medium | Medium | UI4가 경계다. **기계는 이 경계를 지키지 못한다** — `snapshot()`은 색·문구·칩 형태를 보지 않으므로 새 시각 언어를 만들고도 통과한다. 실제 판정자는 Acceptance의 육안 대조 하나이며 강제 수단은 없다 |
| **폭 있는 일정이 하루로 보여 사용자가 데이터를 잃었다고 오해한다** | Medium | Medium | 데이터는 그대로다(파생 범위가 남아 있다). 다만 화면이 달라지는 것은 사실이므로 **하루 재현 테스트(Task 5)에서 그 인상을 관찰 목록에 적는다.** 완화가 필요하면 M3의 시각 언어가 답한다 |
| **그리드와 패널이 갈린 채 커밋된다** | Low | High | DD32가 둘을 한 Task에 묶었고, Task 1의 마지막 단언이 같은 날짜에 대해 둘의 답을 맞댄다 |
| **전반부가 안 끝난 채 이 플랜이 시작된다** | Low | High | 이 플랜은 `gates[]`가 저장소에 있다고 전제한다. Task 0의 베이스라인이 전반부 종료 상태에서 떠지므로 단언 실패 0건 확인이 그 사실을 걸러 낸다 |

## Acceptance

**항목마다 앞에 판정자를 적는다.** `[기계]`는 셸이 지금 판정한다. `[사람]`은 사람이 브라우저에서 하네스를 돌려야 알 수 있고 **이 저장소에는 그것을 강제할 수단이 없다.** `[기계+사람]`은 존재는 기계가, 통과는 사람이 본다.

- [ ] `[사람]` Task 0~5 전부 완료
- [ ] `[기계]` `node --check` 둘 다 통과
- [ ] `[기계]` **Validation 2번이 통과한다** — 함수 둘의 존재, `runAll()` 배선 둘, `DD31-FIXTURE` 표식 **다섯**(santa R0 B2 가 같은 날 관문 둘 케이스를 더했다)
- [ ] `[기계]` **앵커 둘이 있고 뒤엣것이 통과한다** — Task 0이 `.claude/plans/work-calendar-m2b.baseline.sha256`을(구현 전 기록), Task 4가 재베이스라인 직후 `.claude/plans/work-calendar-m2b.rebaseline.sha256`을 남겼고 `SHA256C`가 후자에서 통과한다 (santa R3 B2 — 앞선 판은 이 줄에서만 `m2b-baseline.sha256` 식 축약명을 써 Files to Change·Task 0·Validation 이 요구하는 실제 파일명과 다른 체계를 가리키고 있었다)
- [ ] `[기계]` **베이스라인이 깨끗한 실행에서 나왔다** — `work-calendar-m2b.baseline.json` 의 봉투에 `meta.assertFailures` 가 있고 그 값이 `0` 이다. 없거나 0이 아니면 이후 모든 비교의 전제가 무너져 있다. **손으로 고친 봉투는 잡지 못한다** (Task 0, santa R3 B1 — 전반부에는 있고 후반부에는 없던 검사다)
- [ ] `[사람]` 스모크 하네스 단언 실패 0건
- [ ] `[사람]` **시계 모드 경로 `snapshot()` diff 0** (UI13)
- [ ] `[기계+사람]` **`runCalendarOccupancyCases()`가 존재하고(기계) 단언 다섯이 통과한다(사람)** — 점유가 관문 집합과 같고, 관문에 없던 날을 점유하지 않고, 칩이 `min(버킷 길이, MAX_CHIPS_PER_CELL)`와 같고, 4일 폭 입력에서 점유가 둘로 줄고, **같은 날 `dev`·`review` 관문을 가진 이벤트 하나의 버킷 길이가 1이다**(DD31의 이벤트별 접기). **마지막 항이 빠지면 접기를 빼먹은 구현이 최종 게이트를 통과하고, 그리드에는 칩 둘 · 패널에는 이벤트 하나가 남는다** — DD32가 막으려는 불일치가 그대로 출하된다 (santa R1 B3)
- [ ] `[사람]` **그리드와 패널이 같은 날짜에 같은 답을 낸다** — `today-3`·`today` 관문 이벤트에서 `today-1` 셀이 비어 있고 그 날짜의 `getEventsForDate()`도 빈 배열이다 (DD32). **그리고 같은 날 `dev`·`review` 관문을 가진 이벤트 하나에서 `today` 셀의 칩이 하나이고 `getEventsForDate(today)`도 길이 1이다** — 앞의 것은 "둘 다 비었나"를, 이것은 "둘 다 하나인가"를 묻는다. 접기 누락은 앞의 것을 통과하고 이것만 죽인다 (santa R1 B3)
- [ ] `[사람]` **`dropped` 관문이 점유에는 남는다** — 안 하기로 한 관문의 셀이 여전히 차 있다. 계획은 남는다 (DD31)
- [ ] `[사람]` **불연속 배치가 눈에 보인다** — `today-3`·`today` 관문 이벤트를 만들고 그리드에서 `today-2`·`today-1` 셀이 **비어 있는지** 눈으로 확인한다. 이것이 M2의 헤드라인 결과물이다 (UI15)
- [ ] `[사람]` **UI4 판정은 사람이 눈으로 본다** — 달력 표면을 전반부 종료 상태와 나란히 놓고, 프로젝트가 **기존 뱃지 자리에 이름만**으로, 관문이 **기존 칩 형태 그대로** 나오는지 확인한다. 새 색·새 아이콘·새 칩 모양·새 상시 표면이 하나라도 생겼으면 실패다. **기계로 판정할 수단이 없다** — `snapshot()`은 기하만 담으므로 이 항목의 대역이 될 수 없다
- [ ] `[사람]` **읽기 실패를 첫 실행으로 오인하지 않는다** — `projectsLoadFailed`가 참인 상태에서 온보딩이 뜨지 않고 한 번뿐인 플래그가 타지 않는다 (DD13)
- [ ] `[사람]` **온보딩이 레이아웃을 바꾸지 않는다** — 밴드 높이와 패널 스크롤이 안 움직인다
- [ ] `[사람]` **재베이스라인 전에 (d)의 세 값을 눈으로 맞췄다** — `range/01-month-boundary`의 `januaryChipDates`·`februaryChipDates`·`distinctDates`가 Task 4가 적어 둔 기대값과 같다. 다른 기존 케이스에서 값이 움직였으면 재베이스라인하지 않고 원인을 찾는다
- [ ] `[기계]` PRD M2 행이 `complete`이고 Plan 칸이 두 플랜을 모두 가리킨다
- [ ] `[사람]` **하루 재현 테스트를 실제로 수행하고 결과를 적었다** — 관찰 목록이며 수치를 새로 만들지 않았다 (UI10·UI11)
- [ ] `[사람]` 브라우저에서 확장을 실제로 1회 로드해 불연속 배치와 온보딩을 손으로 확인했다 — **하네스 통과가 경로 작동과 같지 않다**

**`[사람]` 항목은 열일곱 중 열둘이다.** 그 열둘은 체크한다고 해서 참이 되지 않는다 — 러너도 CI도 커밋 훅도 없으므로 이 목록의 **열일곱 중 열둘**은 약속이지 게이트가 아니다. 수를 어림으로 적지 않는다: `[기계]` 넷 · `[기계+사람]` 하나 · `[사람]` 열둘 = 열일곱이며, 항목을 더할 때마다 이 문단의 수를 같이 고친다.

스크린샷이나 붙여넣은 출력을 요구할 수는 있으나 위조가 체크박스보다 어렵지 않으므로 강제가 아니라 의례가 된다. 헤드리스 러너 도입이 유일한 실질 수리이며 이 마일스톤 밖이다(백로그 `id=m2-headless-runner`).

## Codex Adversarial Review

<!-- placeholder: will be replaced by /mccp:plan Phase 7.3 -->
