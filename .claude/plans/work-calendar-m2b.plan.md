# Plan: 불연속 배치가 화면에 그대로 보인다 (업무 캘린더 M2b)

**Source PRD**: `.claude/prds/work-calendar.prd.md`
**Selected Milestone**: M2 — 작업이 실제 업무 모양을 담는다 (**후반부**)
**Paired plan**: `.claude/plans/work-calendar-m2.plan.md` (전반부 — 데이터)
**Complexity**: Medium

## Summary

M2는 두 플랜으로 갈렸다. PRD의 M2 결과문에 동사가 둘 있고 그 둘이 서로 다른 일이기 때문이다 — 작업이 업무 모양을 **담는다**(데이터)와 불연속 배치가 그대로 **표현된다**(화면). 앞의 것은 `work-calendar-m2.plan.md`가 하고, **이 플랜은 뒤의 것만 한다.**

전반부가 끝난 시점의 상태는 이렇다 — 저장소에는 `gates[]`와 `projectId`가 있고 마감 의미는 종단 관문에서 나오는데, **화면은 아직 파생 `startDate..endDate` 범위로 셀을 채운다.** 데이터는 불연속인데 그림은 연속이다. 이 플랜이 그 간극을 닫는다.

**그리드에서 바꾸는 것은 "어느 셀이 차는가" 하나다.** 새 색·새 칩 모양·새 아이콘·새 상시 표면을 만들지 않는다(UI4). 관문을 **어떻게** 보일 것인가는 M3이 정한다.

**그러나 이 플랜이 바꾸는 것이 그 하나뿐은 아니다 — 그 사실을 여기 적는다**(santa R4 B1 · R5 B0·B1). 앞선 판은 이 문단을 "하나다" 에서 끝냈는데, 같은 파일의 Task 2 는 **패널 메타를 관문 날짜로** 바꾸고 **칩의 마감 상태를 셀 단위로** 정하며 **프로젝트 이름을 `.calendar-todo-meta` 에 넣고**, Task 3 은 **첫 실행 온보딩이라는 표면을 새로 세운다.** 범위 주장이 같은 파일의 Task 보다 좁으면 **한 구현자는 인덱스만 고치고 끝났다 하고 다른 구현자는 다섯을 다 고쳐도 둘 다 "플랜을 지켰다" 가 되어**, 심사가 판단의 문제로 내려가고 서로 다른 화면이 각각 규격 준수를 주장한다.

정확히 적는다 — 이 플랜이 바꾸는 것은 **점유 · 패널 메타 · 칩 상태 · 프로젝트 이름 자리 · 첫 실행 온보딩 다섯**이다. 앞의 넷은 전부 "불연속 배치가 그대로 표현된다" 를 **그리드 밖에서도** 참으로 만들기 위한 것이고(그리드만 고치면 패널이 옛 범위로 말한다 — DD32), 다섯째는 UI8 이 M2 에 포함하라고 한 것이다. **바꾸지 않는 것은 시각 언어다** — 색 · 칩 모양 · 아이콘 · 상시 표면은 그대로이며 그것이 UI4 이고, 그 판정은 Acceptance 의 육안 항목이 진다.

**PRD 결과문의 두 구절이 이 플랜과 긴장한다. 둘 다 여기서 답한다 — 답하지 않으면 심사자가 그 긴장을 결함으로 읽는다**(santa R7 B0·B1).

**(1) "겹침이 그대로 표현된다" 와 칩 상한.** `createChips()`(`newtab.js:4120`·`4148-4151`)는 한 셀에 칩을 `MAX_CHIPS_PER_CELL`(= `2`, `newtab.js:115`)까지만 그리고 나머지를 `+N` 으로 요약한다. 점유를 관문으로 옮겨도 그 상한은 그대로이므로, **하루에 셋 이상 겹치면 M2 가 끝나도 칩 셋이 나란히 보이지는 않는다.** 이 플랜은 그것을 **바꾸지 않기로 한다.** 근거 셋 — (a) **PRD 자신이 부하 표시를 M3 으로 미뤘다**(`work-calendar.prd.md` 77행: "경고 대신 부하를 표시만 한다(M3)"). "겹침이 그대로 표현된다" 가 요구하는 것은 **도구가 겹침을 막거나 옮기지 않는 것**이고(UI5·UI6), 밀집을 **어떤 형태로** 보일지는 M3 의 결정이다. (b) `+N` 은 **개수를 보존한다** — 겹친 건수가 화면에서 사라지지 않으므로 숨김이 아니라 요약이다. (c) 상한을 올리거나 `+N` 을 다른 형태로 바꾸는 것은 **새 시각 언어**라 UI4 를 어기고 M3 의 결정을 앞당긴다. **대가를 적는다** — 하루 셋 이상 겹치는 사용자에게는 M2 만으로 겹침이 완전히 보이지 않으며, 그 구간이 M3 까지 남는다.

**(2) "화면은 기존 표면을 재사용하는 수준으로만 바뀐다" 와 새 온보딩 표면.** Task 3 은 첫 실행 안내라는 **새 표면**을 세우므로 그 구절의 문자 그대로와 어긋난다. **어긋나는 것이 맞고, 사용자가 그렇게 정했다** — UI8 이 "첫 실행 온보딩을 **M2에 포함한다**" 라고 명시적으로 말한다. 재사용 조항은 M2 결과문의 일반 규칙이고 UI8 은 그 규칙에 대한 **더 구체적인 사용자 지시**이므로 뒤가 앞을 좁힌다. **다만 예외의 폭을 여기서 묶는다** — 온보딩은 (a) 프로젝트가 하나도 없을 때만, (b) **한 번만** 뜨고, (c) **상시 표면이 아니며**, (d) 밴드 높이와 패널 스크롤을 바꾸지 않는다(Acceptance 가 그 넷을 판정한다). 그 밖의 어떤 새 표면도 이 플랜에 없다.

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

**아래 줄번호는 `7a24204`(전반부 M2 구현) 시점에 다시 맞춘 것이다.** 이 플랜은 전반부가 커밋되기 전에 쓰였고, 그 구현이 `newtab.js` 를 5,517줄로 · `test/positioning.smoke.js` 를 2,012줄로 키우면서 **처음 적힌 인용 열여덟이 전부 밀려 있었다.** 인용이 밀린 플랜은 조용히 틀린다 — 구현자가 그 줄을 열면 무관한 코드가 나오고, "지금 코드가 이렇게 하고 있다" 는 이 플랜의 근거 문장이 확인 불가가 된다. 다시 밀렸는지 보려면 아래를 돌린다:

```sh
# 인용한 줄이 여전히 그 이름을 가리키는지 — 표본 셋
sed -n '3321p;3353p;3945p' newtab.js   # rebuildIndex · getEventsForDate · getCellDueState
sed -n '1277p;1734p' test/positioning.smoke.js   # range/01-month-boundary · runAll
```

| Category | Source | Pattern |
|---|---|---|
| 인덱스 구조 | `newtab.js:3321` `rebuildIndex()` | `eventsByDate`는 `Map`이고 **날짜 키 하나에 이벤트 배열**이 달린다(`bucket.push`). 키 목록에서 셀별 개수를 알 수 없다 |
| 패널의 조회 우회 | `newtab.js:3349` 주석 + `3353` `getEventsForDate()` | 패널은 렌더 창 밖 날짜를 열 수 있어 **창 인덱스를 일부러 우회하고 전체를 훑는다.** 그 이유는 이 플랜에서도 유지된다 — 바꾸는 것은 조회 규칙이지 우회 여부가 아니다 |
| 칩 상한 | `newtab.js:4120`·`4148` `createChips()` | `MAX_CHIPS_PER_CELL`로 자르고 넘치면 `+N`을 붙인다. 그러므로 **칩 개수 ≠ 버킷 길이**다 |
| 상시 아닌 안내 | `newtab.js:985` `applyStorageNotice()` | 상시 표면을 늘리지 않고 필요할 때만 나타난다. 온보딩이 따라야 할 형태 |
| 레이아웃 무변 단언 | `test/positioning.smoke.js:1668` `runErrorBannerGeometryCases()` | 표면 하나가 늘어도 밴드 높이·패널 스크롤이 안 움직이는지를 단언하는 관용구 |
| 도메인 투영 | `test/positioning.smoke.js:559` `migration-v3/01-promote` | 의미를 볼 때는 `collector.add(name, value)`의 `value`에 도메인 값을 직접 담는다 |
| 날짜의 상대성 | `test/positioning.smoke.js:780` 머리말 + `shiftDateKey()` | 날짜는 전부 `todayKey` 기준 상대값이다. 고정 날짜는 돌리는 날에 따라 케이스를 뒤집는다 |
| 스냅샷의 범위 | `test/positioning.smoke.js:200` `snapshot()` | rect·display·classes·`inlineWidth`와 교차 여부만 담는다. **색·문구·칩 형태를 담지 않으므로 시각 언어 변화를 보지 못한다** |

## Design Decisions

### DD31 — `rebuildIndex()`는 파생 `min..max`가 아니라 `gates[].planned`로 셀을 채운다

전반부의 DD4가 연속 범위를 파생값으로 강등한 것은 **v3 롤백용 잔존 필드를 남기기 위해서이지 점유의 근거로 삼기 위해서가 아니다.** 잔존 필드를 점유 계산에 쓰면 강등이 이름만 강등이 된다 — 저장은 관문으로 하면서 화면은 여전히 범위로 말하므로, 사용자가 보는 것은 M1과 같다.

`rebuildIndex()`가 이벤트마다 `event.gates`를 돌며 `g.planned` 하나하나를 버킷에 넣는다. **단, 한 이벤트는 한 날짜에 한 번만 들어간다** — 이벤트별로 `planned`를 집합으로 접은 뒤 넣는다(santa R0 B2). 전반부 DD25가 같은 날 `dev`·`review`를 **허용하므로**, 접지 않으면 그 이벤트가 같은 버킷에 두 번 들어가 그리드는 칩을 둘 그리는데 DD32의 `getEventsForDate()`는 `.some(...)`이라 패널에 하나를 낸다 — 아래 DD32가 막으려는 바로 그 불일치가 다른 입구로 돌아온다. **접는 것은 이벤트 안에서만이다**: 서로 다른 이벤트가 같은 날에 서는 것은 그대로 버킷 길이 둘이고, 그것이 Task 1 고정 입력 3번이 지키는 구분이다. 파생 `startDate`·`endDate`는 인덱스 입력에서 빠지고 DD4가 정한 원래 용도(v3 롤백 입력)로 돌아간다. `dropped` 관문도 버킷에 들어간다 — **계획은 남는다.** 안 하기로 한 것과 애초에 없던 것은 다르고, 그 구분이 PRD가 M2에 요구한 "범위축소가 구분되어 남는다"의 화면 쪽 몫이다.

이 결정은 santa R0에서 리뷰어가 PRD와 플랜의 어긋남을 잡은 뒤 **사용자가 정했다**(2026-08-22). 대안은 PRD의 M2 행에서 "표현된다"를 M3으로 내리는 것이었고 기각됐다.

### DD32 — 점유를 읽는 자리는 둘이고, 둘 다 바꾼다

그리드는 `rebuildIndex()`가 만든 버킷을 보고, 상세 패널은 `getEventsForDate()`를 본다(`newtab.js:4161` → `3353`). 그런데 후자는 **범위 조회**다 — `event.startDate <= dateKey && dateKey <= event.endDate`.

앞의 것만 바꾸면 그리드는 화요일을 비워 두는데 **화요일 칸을 누르면 패널에 그 이벤트가 나온다.** 한 날짜에 대해 그리드와 패널이 다른 답을 내면 불연속 배치는 구현된 것이 아니라 반쯤 구현된 것이고, 사용자가 보는 것은 버그다.

`getEventsForDate(dateKey)`를 `event.gates.some((g) => g.planned === dateKey)`로 바꾼다. **창 인덱스를 우회하는 이유는 그대로 지킨다** — 패널이 렌더 창 밖 날짜를 열 수 있다는 사실은 변하지 않았고(`newtab.js:3349`의 주석이 그것을 기록한다), 바뀌는 것은 "그 날짜에 이 이벤트가 있는가"의 판정 규칙뿐이다.

### DD33 — 이 플랜의 등가 단언은 "무엇이 달라졌는가"를 열거한다

전반부의 등가 케이스는 "마이그레이션이 의미를 바꾸지 않았다"를 단언한다 — 예외가 없다. **이 플랜은 반대다.** 여기서는 화면이 의도적으로 달라지므로, 단언이 "안 달라졌다"일 수 없고 "**이렇게** 달라졌다"여야 한다.

그리고 그 열거는 **케이스 이름과 기대값까지** 적는다. "값이 바뀌는 것은 허용"이라고 넓히면 재베이스라인이 모든 회귀를 삼키는 문이 된다.

투영에 담는 셋을 이름으로 못박는다 — **셋이 서로 다른 것이다.**

- `bucketKeys` — `rebuildIndex()`가 만든 **날짜 키 목록**. 날짜당 키가 하나뿐이므로 같은 날짜가 두 번 나오지 않는다
- `bucketSizesByDate` — 날짜별 **버킷 배열의 길이**. 같은 날에 이벤트 셋이 서면 `3`이다. 키 목록에서는 이 수를 알 수 없다
- `chipCountsByDate` — 각 셀에 실제로 **그려진 칩 개수**. `createChips()`가 `MAX_CHIPS_PER_CELL`로 자르므로 버킷 길이와 같지 않을 수 있다

### DD13 — 첫 실행 온보딩은 "프로젝트가 없다"와 "못 읽었다"를 가른다

프로젝트가 하나도 없을 때 한 번 뜨는 안내를 만든다. 조건은 **`this.calendarManager.projects.length === 0 && !this.calendarManager.projectsLoadFailed && !onboardingSeen`** **셋 다**이다.

**셋째 항이 없으면 "한 번만" 이 성립하지 않는다**(santa R8 B1). 앞선 판은 아래 Task 3 에 "건너뛴 경우에도 다시 뜨지 않는 플래그를 저장한다" 를 적어 두고 **판정식에는 그 플래그를 넣지 않았다.** 그러면 건너뛰기를 누른 사용자나 나중에 프로젝트를 전부 지워 다시 0개가 된 사용자에게 **초기화할 때마다 온보딩이 다시 뜬다** — 무소속을 정상 상태로 두겠다는 UI8 을 깨고 프로젝트 생성을 사실상 반복 강제한다. **플래그를 이름으로 못박는다** — 설정 키 `calendarOnboardingSeen`(불리언, 기본 `false`)이고, **프로젝트를 만들었을 때와 건너뛰었을 때 둘 다** `true` 로 쓴다. 읽기·쓰기 주체는 `SettingsManager` 이며(다른 설정 키와 같은 경로), 읽기 실패로 온보딩이 뜨지 않은 경우에는 **쓰지 않는다** — 그 상태는 첫 실행이 아니기 때문이다.

**판정이 서는 자리를 시점까지 못박는다 — 소유자만으로는 부족하다**(2026-08-23 실측). 이 판정은 `Application.initialize()` 안에서, **`await this.settingsManager.initialize()` 뒤에** 선다. 그 시점이 아니면 셋째 항을 읽을 수가 없다 — `SettingsManager` 는 `newtab.js:5500` 근처에서 `await this.calendarManager.initialize()`(`newtab.js:5491`) **보다 나중에** 만들어지고 초기화되므로, 앞 두 항이 알려지는 시점에는 `this.settingsManager` 가 아직 없다. **앞선 판은 "읽기·쓰기 주체는 `SettingsManager`" 라고만 적고 그 주체가 언제 준비되는지를 적지 않았고**, 그러면 구현자는 존재하지 않는 객체에서 플래그를 읽어 `undefined` 를 얻는다 — `!undefined` 는 참이라 **셋째 항이 조용히 무력해지고 온보딩이 매번 다시 뜬다.** 판정식에 항을 넣어 놓고 그 항이 항상 참이 되는 것은 항을 안 넣은 것과 같다.

**그리고 그 키를 읽는 자리도 새로 만든다.** `SettingsManager.loadSettings()`(`newtab.js:4537`)는 지금 `calendarOnboardingSeen` 을 읽지 않는다(실측 — 그 이름이 `newtab.js` 어디에도 없다). 다른 설정 키와 **같은 경로**로 그 키를 읽기 목록에 더하고 기본값 `false` 를 준다. 그것이 DD13 이 말하는 "읽기·쓰기 주체는 `SettingsManager`" 의 실제 내용이다.

그리고 앞 두 항의 소유자를 붙여 적는다(santa R6 B1). 그 자리에서 `this` 는 `Application` 이다. **그 클래스에는 `projects` 도 `projectsLoadFailed` 도 없다** — 둘 다 `CalendarManager` 의 필드다. bare `this.projects` 로 적으면 구현이 `undefined.length` 에서 터지거나, 구현자가 소유자를 임의로 추측해 첫 실행에 온보딩이 안 뜨거나 초기화가 끊긴다. 전반부가 같은 값을 `this.calendarManager.projectsLoadFailed` 로 넘기라고 적고 있으므로(`work-calendar-m2.plan.md` Task 3 item 4b) 두 플랜이 같은 이름을 쓴다.

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
  1. `work-calendar-m2b.baseline.json` — 하네스의 `베이스라인 내보내기` 버튼으로 내려받아 저장소 루트에 둔다. **버튼이 내려주는 파일명은 이 이름이 아니다 — 반드시 바꿔 저장한다**(2026-08-23 실측). `test/positioning.smoke.js` 의 `exportBaseline` 리스너는 `link.download` 을 **`'work-calendar-m2.baseline.json'` 으로 하드코딩**해 둔다(전반부가 만들 때의 이름이다). 그대로 받아 저장소 루트에 두면 **전반부의 앵커 파일을 덮어쓴다** — `work-calendar-m2.rebaseline.sha256` 이 그 파일을 해싱하므로 `-c` 가 그 자리에서 깨지고, M2 전체의 감사 기록 셋 중 하나가 복구 불가능하게 사라진다. 버튼을 고쳐 파일명을 바꾸지 **않는다** — 그것은 전반부가 확정한 하네스 표면을 건드리는 일이고, 이름 하나 때문에 재베이스라인 축을 또 흔든다. **저장소 루트의 `work-calendar-m2.baseline.json` 을 아예 건드리지 않는 것이 규칙이다.** 받은 파일을 그 이름으로 저장소 루트에 두었다가 나중에 옮기는 순서를 쓰지 않는다 — 그 순간 전반부 파일이 이미 덮였고, **되돌릴 방법이 없다.**

     **되돌릴 수 없는 이유를 정확히 적는다**(2026-08-23 실측). `work-calendar-m2.baseline.json` 은 `.gitignore` 98행(`/work-calendar-m2.baseline.json`)에 걸려 **git 이 추적하지 않는다** — `git ls-files --error-unmatch` 가 "did not match any file(s) known to git" 을 준다. 그러므로 `git checkout -- work-calendar-m2.baseline.json` 은 **아무 일도 하지 않는다.** 앞선 판이 그것을 복구 수단으로 적었는데 틀렸다. 그리고 다시 뜰 수도 없다 — 그 파일은 **전반부가 끝난 시점의 하네스**에서 나온 것이고 이 플랜의 Task 1·3·4 가 그 하네스를 고치므로, 덮은 뒤에는 같은 것을 만들 수 없다. **한 번 덮으면 M2 전반부의 감사 기록은 영구히 사라진다.**

     그래서 순서를 뒤집는다 — 저장소 루트를 거치지 않고 **내려받은 자리에서 새 이름으로 바로 옮긴다:**

     ```sh
     # 0) 전반부 파일이 제자리에 온전한지 먼저 확인한다. 여기서 실패하면 이미 덮인 것이므로
     #    아래를 진행하지 말고 사용자에게 알린다 (복구 수단이 없다).
     grep 'work-calendar-m2\.baseline\.json' .claude/plans/work-calendar-m2.rebaseline.sha256 \
       | shasum -a 256 -c -   # 또는 sha256sum -c -

     # 1) 브라우저가 내려받은 파일은 다운로드 폴더에 `work-calendar-m2.baseline.json` 이름으로 떨어진다.
     #    **그것을 저장소 루트에 그 이름으로 복사하지 않는다.** 다운로드 자리에서 새 이름으로 바로 옮긴다.
     [ -e work-calendar-m2b.baseline.json ] && { echo "work-calendar-m2b.baseline.json 이 이미 있다 — 옛 것을 치운 뒤 다시 한다"; exit 1; }
     mv "$HOME/Downloads/work-calendar-m2.baseline.json" ./work-calendar-m2b.baseline.json || { echo "mv 실패 — 내려받은 경로를 확인한다"; exit 1; }

     # 2) 옮긴 뒤 전반부 파일이 여전히 그대로인지 다시 본다. 0)과 같은 명령이고, 통과해야 한다.
     grep 'work-calendar-m2\.baseline\.json' .claude/plans/work-calendar-m2.rebaseline.sha256 \
       | shasum -a 256 -c -
     ```

     **`mv -n` 을 쓰지 않는 이유도 적어 둔다**(실측): 대상이 이미 있으면 `mv -n` 은 아무것도 하지 않고 **exit 0** 을 준다 — dst 그대로, src 그대로. 재시도에서 그 조용한 no-op 이 최악이라, 대상 존재를 위처럼 **먼저 명시적으로 막는다.**

     **구조적 약점 하나를 여기 남긴다 — 이 플랜이 만든 것이 아니고 고치지도 않는다.** 앵커 파일(`.claude/plans/work-calendar-m2.rebaseline.sha256`)은 **추적되는데** 그것이 해싱하는 `work-calendar-m2.baseline.json` 은 **추적되지 않는다**(`.gitignore` 98행이 그 이유를 적고 있다 — 프로필마다 다른 기계 로컬 산출물이라서다). 그래서 **새로 클론한 저장소에서는 전반부 앵커를 검증할 수 없다** — 해시는 있는데 대상이 없다. 감사 기록이 이 작업 트리 안에서만 유효하다는 뜻이고, 그 판단은 전반부가 내린 것이다. 이 플랜은 그 사실 위에서 "적어도 이 트리에서는 덮이지 않게 한다" 까지만 한다 **버튼과 그 리스너는 전반부 Task 0이 이미 만들었다**(`test/positioning.smoke.html`의 마크업 + `test/positioning.smoke.js`의 `addEventListener`) — 이 플랜은 그것을 쓰기만 한다
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
  - `rebuildIndex()`(`newtab.js:3321`) — 이벤트마다 `event.gates` 의 `g.planned` 를 **집합으로 접은 뒤**(`new Set(...)`) 그 **고유 날짜마다 이벤트를 한 번씩** 버킷에 넣는다. **관문마다 넣지 않는다** — DD25 가 같은 날 `dev`·`review` 를 허용하므로 관문 단위로 넣으면 한 이벤트가 같은 버킷에 두 번 들어가고, 그리드는 칩 둘 · 패널은 하나가 되어 DD32 가 막으려는 불일치가 돌아온다(DD31). **그 접기 규칙이 DD31 본문과 아래 고정 입력 5번에는 있었는데 이 지시 줄에만 없었다** — Action 만 읽은 구현자가 그대로 이중 삽입을 만들게 돼 있었고, DD29 가 금지한 "규칙은 산문에, 지시에는 없음" 이 바로 이 모양이다 (santa R6 A). **파생 `startDate`·`endDate`는 인덱스 입력에서 뺀다.** `dropped` 관문의 날짜도 넣는다
  - `getEventsForDate(dateKey)`(`newtab.js:3353`) — `event.gates.some((g) => g.planned === dateKey)`로 바꾼다. 창 인덱스를 우회하는 구조는 그대로 둔다

  **하나만 고치면 그리드와 패널이 같은 날짜에 다른 답을 낸다**(DD32). 둘을 한 Task에 둔 이유가 그것이다 — 나누면 그 사이에 그 버그가 실재하는 커밋이 생긴다.
- **Mirror**: `newtab.js:3321` `rebuildIndex()`의 버킷 구성과 `3353` `getEventsForDate()`의 전체 훑기
- **Validate**: `runCalendarOccupancyCases(collector)`가 **다섯**을 전부 돌리고 아래 **다섯**을 단언한다(santa R1 B3 — santa R0 B2가 고정 입력과 단언을 하나씩 더하면서 이 머리말의 수를 넷으로 남겨 두었다).

  1. `assert(setEq(bucketKeys, allGatePlannedDates), '점유가 관문 집합과 다르다')` — 점유의 **정의**가 관문이라는 DD31의 단언이다.
     **`allGatePlannedDates` 가 무엇인지를 여기서 정한다 — 비워 두면 구현자가 정하게 되고, 그러면 이 단언은 자기가 만든 기대값과 자기를 비교한다.** `allGatePlannedDates` = 그 고정 입력의 **모든 이벤트**의 **모든 관문**의 `planned` 를 모은 뒤 중복을 없앤 집합이다. 둘을 명시한다 — (a) **`status === 'dropped'` 인 관문도 들어간다**(DD31 이 계획을 남기므로 그 날짜도 점유된다. 4번 고정 입력이 이것을 반증한다), (b) 이 집합은 **날짜의 집합**이므로 이벤트별 접기(DD31)는 여기에 영향을 주지 않는다 — 같은 날 관문 둘은 이쪽에서도 한 날짜다. **접기가 가르는 것은 `bucketKeys` 가 아니라 `bucketSizesByDate` 이고**, 그것을 보는 것은 아래 5번이다
  2. `assert(isSubset(bucketKeys, legacyRangeDates), '관문에 없던 날을 점유했다')` — 관문은 옛 범위 안에 있으므로 새 날이 생길 수 없다
  3. 각 날짜 `d`에 대해 `assert(chipCountsByDate[d] === Math.min(bucketSizesByDate[d], MAX_CHIPS_PER_CELL), '그리드 칩이 인덱스와 어긋난다')` — **인덱스가 맞다는 것과 화면이 맞다는 것은 다른 주장이다.** `rebuildIndex()`만 옳게 고치고 `createChips()`가 옛 범위로 그리면 1·2번은 통과하고 여기서만 죽는다. 비교 대상이 **키 목록이 아니라 버킷 길이**인 것과 상한 절단을 함께 넣는 것이 요점이다(키 목록에서 유도하면 언제나 1이고, 자르지 않은 수와 비교하면 상한을 넘는 날에서 옳은 구현이 죽는다)
  4. **1번 고정 입력에서** `assert(bucketKeys.length === 2, '불연속 배치가 반영되지 않았다 — 4일 폭인데 점유가 줄지 않았다')` — 이 줄이 없으면 `rebuildIndex()`를 고치지 않고도 1~3번이 전부 통과한다

  5. **5번 고정 입력에서** `assert(bucketSizesByDate[today] === 1, '같은 날 관문 둘이 한 이벤트를 두 번 점유했다')` — 전반부 DD25가 허용하는 모양이고, 이벤트 안에서 접지 않으면 버킷 길이가 2가 되어 3번 단언을 타고 칩이 둘 그려진다(DD31, santa R0 B2)

  더해서 **그리드와 패널의 일치**를 단언한다 — 1번 고정 입력에서 `today-1` 셀이 비어 있고 **그 날짜의 `getEventsForDate()`도 빈 배열**인지. 둘 중 하나만 고치면 여기서 죽는다(DD32). **5번 고정 입력에서도 같은 일치를 본다** — `today` 셀의 칩이 **하나**이고 `getEventsForDate(today)`도 길이 **1**인지. 1번은 "둘 다 비었나"를 묻고 이쪽은 "둘 다 하나인가"를 물으므로, 접기 누락은 1번을 통과하고 여기서만 죽는다(santa R0 B2).

### Task 2: 렌더 표면 적응

- **Action**:

  **만드는 것**: 없다.

  **고치는 것 — 새 시각 언어를 만들지 않는다(UI4).**
  - `renderSummary` · `renderGrid` · `createDayCell` · `createChips` · `renderPanel` · `createTodoItem` — 새 데이터(`gates`·`projectId`)를 읽되 **기존 칩·뱃지 토큰을 그대로 쓴다.** 새 색·새 아이콘·새 칩 모양을 만들지 않는다(UI4).

    **아래 셋은 출력 규칙까지 못박는다**(santa R5 B0·B1, R4 B2). 앞선 판은 "새 데이터를 읽되 기존 토큰을 쓴다" 까지만 적었는데, **그 셋이 전부 UI15 를 깨는 자리이고 셋 다 지금 코드가 반대로 하고 있다.** 읽으라고만 적으면 구현자마다 다른 화면이 나오고 Acceptance 가 어느 쪽이 옳은지 가리지 못한다.

    1. **패널 메타는 관문 날짜를 말한다.** `createTodoItem()`(`newtab.js:4198`)은 지금 `event.startDate !== event.endDate` 일 때 `formatShortDate(startDate) – formatShortDate(endDate)` 를 메타에 넣는다 — **연속 범위다.** 그대로 두면 월·수 관문 이벤트에서 **그리드는 화요일을 비우는데 패널은 화요일을 포함한 범위로 말한다.** 그리드와 패널이 같은 이벤트를 두고 다른 답을 내는 것이 DD32 가 막으려던 결함이고, 여기서는 UI15 의 헤드라인 결과가 패널에서 되살아난다. **바꾼다** — 살아 있는 관문(`status !== 'dropped'`)의 `planned` 를 오름차순으로 `formatShortDate` 해 `·` 로 잇는다. 관문이 하나면 메타에 날짜를 넣지 않는다(폭 없는 항목이 지금도 날짜 메타를 안 내는 것과 같은 규칙이다). **`.calendar-todo-meta` 스팬을 그대로 쓴다** — 새 요소도 새 클래스도 만들지 않는다. **살아 있는 관문이 하나도 없으면(전부 `dropped`) `dropped` 관문의 날짜를 같은 규칙으로 열거한다**(santa R7 B2 — 앞선 판은 "살아 있는 관문" 만 적고 0개인 경우를 정하지 않아, 같은 입력에서 구현자마다 빈 메타 · 옛 연속 범위 · 숨김이 갈렸다). 전부 `dropped` 여도 **DD31 이 그 날짜의 셀 점유를 남기므로**, 패널이 날짜를 비우면 그리드는 차 있는데 패널은 비어 보여 DD32 의 불변식이 그 입력에서만 깨진다. 마감이 없다는 사실은 `getEventDueState()` 가 `''` 를 돌려주는 것으로 이미 표현되고(전반부 DD5a), 메타는 **어디에 서 있는가**만 말한다
    2. **칩의 마감 상태는 셀마다 정한다.** `createChips()`(`newtab.js:4135`)는 지금 `const dueState = this.getEventDueState(event)` 를 **이벤트당 한 번** 계산해 그 이벤트의 **모든 칩**에 같은 `is-due-*` 를 붙인다. DD31 이 `dropped` 관문의 날짜도 점유에 남기므로, 살아 있는 종단 관문이 지연인 이벤트에서는 **"안 하기로 한 날"의 칩에도 지연색이 붙는다** — 사용자는 범위축소를 지연으로 읽고, PRD 가 M2 에 요구한 "조기·지연·범위축소가 **구분되어** 남는다" 가 화면에서 다시 합쳐진다. **바꾼다** — 그 날짜의 관문이 **전부 `dropped`** 이면 그 칩에는 `is-due-*` 를 붙이지 않는다. 하나라도 살아 있으면 지금처럼 이벤트의 마감 상태를 붙인다. **`dropped` 를 어떻게 보이게 할지는 정하지 않는다** — 새 시각 언어는 M3 의 몫이고(UI4), 이 플랜이 하는 것은 **틀린 상태를 붙이지 않는 것**까지다.

       **셀과 aria-label 도 같은 규칙을 탄다 — 칩만 고치면 절반만 고친 것이다**(santa R6 B0). `createDayCell()`(`newtab.js:4062`)은 칩과 **별도 경로로** `const dueState = this.getCellDueState(dayEvents)` 를 불러 셀에 `is-due-{dueState}` 를 붙이고 `DUE_STATE_LABELS[dueState]` 를 `aria-label` 에 넣는다. 그리고 `getCellDueState(dayEvents)`(`newtab.js:3945`)는 그 날의 이벤트마다 `getEventDueState(event)` 를 불러 가장 급한 것을 고르는데 — **날짜를 받지 않으므로 그 이벤트가 그 날에 왜 서 있는지(살아 있는 관문인지 `dropped` 인지)를 알 수 없다.** 칩에서 지운 지연색이 **셀 배경과 스크린리더 문구로 그대로 되돌아온다.** **바꾼다** — 서명을 `getCellDueState(dayEvents, dateKey)` 로 넓혀 날짜를 함께 받고, **그 날짜의 관문이 전부 `dropped` 인 이벤트는 집계에서 건너뛴다.** 호출부(`createDayCell()`)가 그 셀의 `dateKey` 를 넘긴다. 살아 있는 관문이 하나라도 있는 이벤트는 지금처럼 집계된다
    3. **프로젝트 이름의 자리를 실제 DOM 으로 적는다.** 앞선 판은 "기존 뱃지 자리에 이름만" 이라고 적었는데 **`createTodoItem()` 에는 프로젝트 뱃지 자리가 없다** — 제목 · 메타 · 메모 · 편집 · 삭제뿐이다(`newtab.js:4198` 이하). 없는 자리를 가리키는 지시는 구현자마다 다른 곳에 넣거나 새 뱃지를 만들거나 생략하게 만든다. **정한다** — 프로젝트 이름은 **`.calendar-todo-meta` 의 첫 항목**으로 들어간다(위 1 의 관문 날짜 앞). 새 요소도 새 클래스도 만들지 않는다. `projectId` 가 `null`(무소속)이면 **아무것도 넣지 않는다** — 무소속이 정상이고 그것을 따로 표시하지 않는 것이 UI8 이다
  - 겹침 경고를 만들지 않고 부하 표시도 하지 않는다(UI5 — M3의 몫)
- **Mirror**: `newtab.js:3960` `render()`의 호출 순서와 `4096` `createDayCell()`의 aria-label 구성
- **Validate**: 시계 모드 경로 `snapshot()` diff 0(UI13). **달력 경로의 기하 diff 0은 이 플랜에서 요구하지 않는다** — 점유가 바뀌면 칩이 붙는 셀이 달라지고 그것이 이 플랜의 목적이다. 달력 쪽 판정은 Task 1의 단언과 아래 Acceptance의 육안 대조가 한다

### Task 3: 첫 실행 온보딩

- **Action**:

  **만드는 것 — 둘이다.**
  1. `newtab.html`·`newtab.js` 첫 실행 안내 표면
  2. `test/positioning.smoke.js` `runCalendarOnboardingCases(collector)`

  **고치는 것**: `Application.initialize()` — 온보딩 판정을 잇는다.

  조건은 **`this.calendarManager.projects.length === 0 && !this.calendarManager.projectsLoadFailed`** **둘 다**이고, 여기에 **`&& !onboardingSeen` 셋째 항이 붙는다**(DD13 — 소유자를 붙여 적는다. 이 자리의 `this` 는 `Application` 이고 앞 두 필드는 그 클래스에 **없다**, santa R6 B1). 이름 하나를 받아 프로젝트를 만들고, 건너뛰면 무소속으로 계속 쓴다. **플래그는 설정 키 `calendarOnboardingSeen`**(불리언, 기본 `false`)이고 **만들었을 때와 건너뛰었을 때 둘 다** `true` 로 쓴다 — 셋째 항이 판정식에 없으면 건너뛴 사용자에게 매 초기화마다 다시 뜬다(santa R8 B1).
- **Mirror**: `newtab.js:985` `applyStorageNotice()` — 상시 표면을 늘리지 않고 필요할 때만 나타난다
- **Validate**: 하네스 케이스 — 프로젝트가 없으면 뜨고, 건너뛰면 다시 뜨지 않고, **읽기 실패 상태(`projectsLoadFailed = true`)에서는 뜨지 않고 플래그도 타지 않으며**, 온보딩이 밴드 높이와 패널 스크롤을 바꾸지 않는다(`test/positioning.smoke.js:1668` `runErrorBannerGeometryCases()`와 같은 형태)

### Task 4: 하네스 배선과 재베이스라인

- **Action**: Task 1·3이 만든 케이스 **둘**(`runCalendarOccupancyCases` · `runCalendarOnboardingCases`)을 `runAll()` 순서에 넣는다.

  재베이스라인 뒤 **`베이스라인 내보내기`를 다시 눌러 파일을 새로 받고** `work-calendar-m2b.baseline.json`을 덮어쓴 다음 뒤쪽 앵커를 뜬다 — `shasum -a 256 test/positioning.smoke.js work-calendar-m2b.baseline.json > .claude/plans/work-calendar-m2b.rebaseline.sha256` (`shasum` 이 없으면 `sha256sum` 으로 같은 인자를 준다 — santa R2 B0). 순서가 계약이다: (1) 재베이스라인 → (2) 재내보내기·덮어쓰기 → (3) 해시 생성. 재내보내기를 빠뜨리면 해시가 "옛 파일이 안 바뀌었다"만 증명하고, 비교에 실제로 쓰이는 베이스라인과 커밋된 파일이 같은지는 증명하지 않는다.
- **Mirror**: `test/positioning.smoke.js:1734` `runAll()`의 실행 순서와 저장소 복원 규약
- **Validate**: 단언 실패 0건. 시계 경로 diff 0.

  **"설명되는 diff"를 열거로 못박는다.** 허용되는 diff는 **넷뿐**이다: (a) 새 케이스가 추가한 **새 키**(`occupancy/*` · `onboarding/*`), (b) 기존 케이스의 도메인 투영에 **새 필드가 늘어난 것**, (c) 필드 목록을 문자열로 담은 값이 그만큼 길어진 것, (d) **DD31이 요구하는 점유 축소 — 아래에 케이스 이름과 기대값까지 적는다.**

  - `range/01-month-boundary`(`test/positioning.smoke.js:1261-1285`) — 입력이 `{ startDate: '2026-01-28', endDate: '2026-02-03' }` 한 건이므로 관문은 그 **양 끝 둘**이 되고 사이 나흘은 점유에서 빠진다.
    - `januaryChipDates`: `['2026-01-28','2026-01-29','2026-01-30','2026-01-31','2026-02-01','2026-02-02','2026-02-03']` → **`['2026-01-28','2026-02-03']`**
    - `februaryChipDates`: `['2026-02-01','2026-02-02','2026-02-03']` → **`['2026-02-03']`**
    - `distinctDates`(둘의 합집합을 정렬한 **배열**이지 개수가 아니다): 7원소 → **`['2026-01-28','2026-02-03']`**
    - `visibleInBothMonths`: `true` → **`true`** — 둘 다 비지 않으므로 안 바뀐다. **값이 안 바뀌는 것도 적어 둔다** — 적지 않으면 그것이 움직였을 때 그게 (d)인지 아닌지를 판단의 문제로 내린다

    **앞선 판은 `januaryChipDates`의 현재값을 넯으로 적고 전환 후 값을 `['2026-01-28']`로 적었는데, 둘 다 틀렸다**(2026-08-23 실측 — 커밋된 `work-calendar-m2.baseline.json` 의 `range/01-month-boundary` 항목이 근거다). **1월 뷰의 42칸 창은 1월에서 끝나지 않는다** — 2026년 1월 그리드는 2025-12-28(일)에서 시작해 2026-02-07까지 닿으므로 **2/1~2/3 셀이 1월 뷰 안에 함께 그려진다.** 그래서 현재 `januaryChipDates`는 넷이 아니라 **일곱**이고, 전환 뒤에도 1월 뷰가 2/3 관문을 계속 보므로 **둘**이 남는다. (2월 뷰는 반대다 — 2026-02-01이 일요일이라 창이 정확히 2/1에서 시작해 1월 날짜를 하나도 담지 않고, 그것이 `februaryChipDates`가 셈이였던 이유다.) **틀린 기대값은 없는 것보다 나쁘다** — 이 세 값은 사람이 재베이스라인 앞에 맞춤 보는 유일한 기준이므로, 틀린 값을 적어 두면 **올바른 구현이 "원인을 찾으라"에 걸리고** 사람은 없는 버그를 뒤진다
  - 위 셋 **말고** 기존 키의 기존 필드 값이 바뀌면 그것은 (d)가 아니다. **DD31의 파급이 여기서 끝난다는 것이 이 열거의 주장이고**, 다른 케이스에서 값이 움직였다면 점유 말고 다른 것이 함께 바뀐 것이므로 재베이스라인하지 말고 원인을 찾는다
  - **그 주장은 근거가 있고, 근거를 여기 적어 재확인할 수 있게 둔다**(2026-08-23 `7a24204` 기준 실측). 점유가 바뀌면 값이 움직이는 자리는 **셀 점유를 읽는 케이스뿐**이고, 하네스 전체에서 그런 케이스는 **하나다** — `grep -n '\.calendar-chip\|\.calendar-day' test/positioning.smoke.js` 가 `chipDatesFor`(`test/positioning.smoke.js:1261-1266`) **한 곳에만** 걸리며 그것이 `range/01-month-boundary` 전용 도우미다. 그리고 `snapshot()`(`test/positioning.smoke.js:200`)은 `#clock`·`#calendarWidget`·`.search-container` **세 컨테이너의 기하만** 담고 날짜 셀을 담지 않으므로, 칩이 붙는 셀이 달라져도 스냅샷 축은 움직이지 않는다(밴드 높이가 고정이므로 컨테이너 rect 도 그대로다). **재베이스라인 전에 이 두 명령을 다시 돌린다** — 케이스가 늘어 셀 점유를 읽는 자리가 둘이 되면 이 열거가 낡고, 그때는 (d)에 그 케이스의 기대값을 함께 적어야 한다
  - **순서를 빼먹은 것은 기계가 잡는다 — 절차 규칙이라고 적고 끝내지 않는다.** 위 (2) 재내보내기를 빠뜨리면 봉투 안의 `baseline` 에 새 케이스 키가 없으므로, 그 하나만 보면 된다. 해시를 뜨기 전에 돌린다:

    ```sh
    node -e 'const b=require("./work-calendar-m2b.baseline.json").baseline;
      const k=Object.keys(b).filter(x=>/^(occupancy|onboarding)\//.test(x));
      if(k.length===0){console.error("재내보내기를 빠뜨렸다 — occupancy/* · onboarding/* 키가 하나도 없다. 이 파일은 재베이스라인 전의 것이다.");process.exit(1)}
      console.log("새 케이스 키 "+k.length+"개 확인")'
    ```

    이것이 잡는 것은 **"새 파일을 받지 않았다" 하나뿐**이다. 순서를 바꿔 다는 것도, 손으로 고친 봉투도 잡지 못한다 — 그 둘은 여전히 규율이다. 그래도 가장 흔한 실수 하나를 규율에서 기계로 옴긴다
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
#    **그리고 전반부의 베이스라인 파일이 여전히 온전한가.** Task 0 이 받는 파일은 내보내기
#    버튼이 `work-calendar-m2.baseline.json` 으로 내려주므로, 이름을 안 바꾸고 저장하면
#    전반부의 앵커 대상 파일이 조용히 덮인다. 그러면 **이 플랜의 게이트는 그대로 통과하면서**
#    M2 전반부의 감사 기록만 무효가 된다 — 덮어쓴 쪽을 아무것도 보지 않았기 때문이다.
#
#    **전반부 앵커를 통째로 `-c` 하지 않는다 — 그것은 설계상 반드시 깨진다.**
#    `work-calendar-m2.rebaseline.sha256` 은 `test/positioning.smoke.js` 도 함께 해싱하는데
#    이 플랜의 Task 1·3·4 가 바로 그 파일을 고친다. 위 3번 머리말이 자기 baseline.sha256 을
#    끝 상태 게이트로 쓰지 않는 이유와 **같은 이유**이고, 통째로 검사하면 옳은 구현이 전부
#    이 줄에서 죽는다. (실측 2026-08-23: `7a24204` 에서 그 앵커의 하네스 줄은 **지금도**
#    맞지 않는다 — 전반부가 재앵커를 다음 세션으로 미뤘기 때문이다. 통째 검사를 넣었다면
#    구현을 시작하기도 전에 죽었을 것이다.)
#
#    덮어쓰기가 훼손하는 것은 `work-calendar-m2.baseline.json` **하나**이므로 그 줄만 뽑아
#    검사한다. 하네스가 바뀌어도 통과하고, 덮어쓰기는 잡는다.
#    **이 검사가 성립하려면 그 파일이 제자리에 남아 있어야 한다** — Task 0 이 저장소 루트의
#    그 파일을 옮기거나 덮지 않고 다운로드 자리에서 새 이름으로 가져오는 이유가 이것이다.
#    (앞선 판은 그 파일을 `mv` 로 옮기라고 적어 두고 옮긴 뒤에 이 검사를 돌리게 해서,
#    옳게 수행해도 "No such file" 로 죽었다.)
grep 'work-calendar-m2\.baseline\.json' .claude/plans/work-calendar-m2.rebaseline.sha256 \
  | SHA256C - || { echo "전반부의 work-calendar-m2.baseline.json 이 바뀌었다 — Task 0 에서 내보낸 파일이 이름을 안 바꾼 채 그것을 덮었을 가능성이 가장 크다. git checkout 으로 복구한 뒤 Task 0 을 다시 한다"; exit 1; }

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

**항목마다 앞에 판정자를 적고, `[기계]` 에는 **언제** 도는지까지 괄호로 적는다.** `[기계]`는 사람의 눈이 아니라 **종료 코드가 답을 낸다**는 뜻이지, **지금 돌 수 있다는 뜻이 아니다** — 앞선 판은 이 자리에 "셸이 **지금** 판정한다" 라고 적어 두고 다섯 중 넷을 구현 뒤에야 도는 검사에 붙였다. 그러면 승인 게이트가 강제하지 **못하는** 것을 강제한다고 읽히고, 바로 그 믿음 때문에 Task 0 을 건너뛴 실행이 아무도 모르게 지나간다. **(승인 시점)** 이 붙은 하나만 지금 돌고, 나머지는 그 항목이 검사하는 산출물을 Task 가 만든 뒤에 돌다 — 그것은 이 저장소에 러너도 CI 도 커밋 훅도 없다는 사실의 직접적 결과이며, 백로그 `m2-headless-runner` 가 유일한 실질 수리다. `[사람]`은 사람이 브라우저에서 하네스를 돌려야 알 수 있고 **이 저장소에는 그것을 강제할 수단이 없다.** `[기계+사람]`은 존재는 기계가, 통과는 사람이 본다.

- [ ] `[사람]` Task 0~5 전부 완료
- [ ] `[기계]` (승인 시점) `node --check` 둘 다 통과
- [ ] `[기계]` (Task 1·3 뒤) **Validation 2번이 통과한다** — 함수 둘의 존재, `runAll()` 배선 둘, `DD31-FIXTURE` 표식 **다섯**(santa R0 B2 가 같은 날 관문 둘 케이스를 더했다)
- [ ] `[기계]` (Task 0 뒤) **전반부의 베이스라인 파일이 여전히 온전하다** — `work-calendar-m2.rebaseline.sha256` 에서 `work-calendar-m2.baseline.json` 줄만 뽑아 `-c` 로 검사해 통과한다. **이 항목이 없으면 이 플랜의 게이트는 전반부의 감사 기록을 지우고도 전부 통과한다** — 내보내기 버튼이 `work-calendar-m2.baseline.json` 이라는 이름을 내려주기 때문에 그 덮어쓰기는 실수가 아니라 **기본 경로**이고, 다른 모든 검사는 `m2b` 쪽만 본다. **앵커를 통째로 검사하지 않는다** — 같은 파일이 `test/positioning.smoke.js` 도 해싱하는데 이 플랜이 그것을 고치므로 통째 검사는 옳은 구현에서도 반드시 깨진다 (Task 0, Validation 3)
- [ ] `[기계]` (Task 4 뒤) **앵커 둘이 있고 뒤엣것이 통과한다** — Task 0이 `.claude/plans/work-calendar-m2b.baseline.sha256`을(구현 전 기록), Task 4가 재베이스라인 직후 `.claude/plans/work-calendar-m2b.rebaseline.sha256`을 남겼고 `SHA256C`가 후자에서 통과한다 (santa R3 B2 — 앞선 판은 이 줄에서만 `m2b-baseline.sha256` 식 축약명을 써 Files to Change·Task 0·Validation 이 요구하는 실제 파일명과 다른 체계를 가리키고 있었다)
- [ ] `[기계]` (Task 0 뒤) **베이스라인이 깨끗한 실행에서 나왔다** — `work-calendar-m2b.baseline.json` 의 봉투에 `meta.assertFailures` 가 있고 그 값이 `0` 이다. 없거나 0이 아니면 이후 모든 비교의 전제가 무너져 있다. **손으로 고친 봉투는 잡지 못한다** (Task 0, santa R3 B1 — 전반부에는 있고 후반부에는 없던 검사다)
- [ ] `[사람]` 스모크 하네스 단언 실패 0건
- [ ] `[사람]` **시계 모드 경로 `snapshot()` diff 0** (UI13)
- [ ] `[기계+사람]` **`runCalendarOccupancyCases()`가 존재하고(기계) 단언 다섯이 통과한다(사람)** — 점유가 관문 집합과 같고, 관문에 없던 날을 점유하지 않고, 칩이 `min(버킷 길이, MAX_CHIPS_PER_CELL)`와 같고, 4일 폭 입력에서 점유가 둘로 줄고, **같은 날 `dev`·`review` 관문을 가진 이벤트 하나의 버킷 길이가 1이다**(DD31의 이벤트별 접기). **마지막 항이 빠지면 접기를 빼먹은 구현이 최종 게이트를 통과하고, 그리드에는 칩 둘 · 패널에는 이벤트 하나가 남는다** — DD32가 막으려는 불일치가 그대로 출하된다 (santa R1 B3)
- [ ] `[사람]` **그리드와 패널이 같은 날짜에 같은 답을 낸다** — `today-3`·`today` 관문 이벤트에서 `today-1` 셀이 비어 있고 그 날짜의 `getEventsForDate()`도 빈 배열이다 (DD32). **그리고 같은 날 `dev`·`review` 관문을 가진 이벤트 하나에서 `today` 셀의 칩이 하나이고 `getEventsForDate(today)`도 길이 1이다** — 앞의 것은 "둘 다 비었나"를, 이것은 "둘 다 하나인가"를 묻는다. 접기 누락은 앞의 것을 통과하고 이것만 죽인다 (santa R1 B3)
- [ ] `[사람]` **`dropped` 관문이 점유에는 남는다** — 안 하기로 한 관문의 셀이 여전히 차 있다. 계획은 남는다 (DD31)
- [ ] `[사람]` **`dropped` 관문의 날짜에 지연색이 붙지 않는다 — 칩 · 셀 · `aria-label` 셋 다** — 살아 있는 종단 관문이 지난 날짜(지연)이고 그보다 늦은 관문이 `dropped` 인 이벤트를 만든 뒤, 그 `dropped` 날짜에서 (a) 칩에 `is-due-overdue` 가 없고, (b) **셀(`.calendar-day`)에도 `is-due-overdue` 가 없으며**, (c) **셀의 `aria-label` 에 지연 문구가 없는지** 확인한다. **칩만 보면 절반만 본 것이다** — 셀 클래스와 `aria-label` 은 `getCellDueState()` 라는 별도 경로로 붙으므로 칩을 고쳐도 그대로 남고, 눈으로는 셀 배경이 스크린리더로는 문구가 여전히 범위축소를 지연이라고 말한다 (Task 2 규칙 2, santa R5 B1 · R6 B0)
- [ ] `[사람]` **패널이 관문 날짜를 말한다** — `today-3`·`today` 관문 이벤트를 열어 패널 메타가 `today-3 – today` **연속 범위가 아니라** 두 관문 날짜를 열거하는지 확인한다. 범위로 나오면 그리드는 `today-1` 을 비우는데 패널은 포함해 말하게 되어 DD32 가 막으려던 불일치가 패널 쪽에 남는다 (Task 2 규칙 1, santa R5 B0)
- [ ] `[사람]` **불연속 배치가 눈에 보인다** — `today-3`·`today` 관문 이벤트를 만들고 그리드에서 `today-2`·`today-1` 셀이 **비어 있는지** 눈으로 확인한다. 이것이 M2의 헤드라인 결과물이다 (UI15)
- [ ] `[사람]` **UI4 판정은 사람이 눈으로 본다** — 달력 표면을 전반부 종료 상태와 나란히 놓고, 프로젝트 이름이 **`.calendar-todo-meta` 의 첫 항목**으로(Task 2 규칙 3 — `createTodoItem()` 에 프로젝트 뱃지 자리는 **없다**), 관문이 **기존 칩 형태 그대로** 나오는지 확인한다. **"기존 뱃지 자리" 라는 옛 문구를 판정 기준으로 쓰지 않는다**(santa R6 B2) — 그 자리가 실재하지 않아 Task 2 가 실제 DOM 으로 바꿔 적었는데 이 항목만 옛 문구로 남아 있었고, 그러면 Task 2 를 따른 구현이 여기서 실패로 읽히고 없는 자리를 만들어 낸 구현이 통과한다. 새 색·새 아이콘·새 칩 모양·새 상시 표면이 하나라도 생겼으면 실패다. **기계로 판정할 수단이 없다** — `snapshot()`은 기하만 담으므로 이 항목의 대역이 될 수 없다
- [ ] `[사람]` **읽기 실패를 첫 실행으로 오인하지 않는다** — `projectsLoadFailed`가 참인 상태에서 온보딩이 뜨지 않고 한 번뿐인 플래그가 타지 않는다 (DD13)
- [ ] `[사람]` **온보딩이 레이아웃을 바꾸지 않는다** — 밴드 높이와 패널 스크롤이 안 움직인다
- [ ] `[사람]` **재베이스라인 전에 (d)의 세 값을 눈으로 맞췄다** — `range/01-month-boundary`의 `januaryChipDates`·`februaryChipDates`·`distinctDates`가 Task 4가 적어 둔 기대값과 같다. 다른 기존 케이스에서 값이 움직였으면 재베이스라인하지 않고 원인을 찾는다
- [ ] `[기계]` (Task 5 뒤) PRD M2 행이 `complete`이고 Plan 칸이 두 플랜을 모두 가리킨다
- [ ] `[사람]` **하루 재현 테스트를 실제로 수행하고 결과를 적었다** — 관찰 목록이며 수치를 새로 만들지 않았다 (UI10·UI11)
- [ ] `[사람]` 브라우저에서 확장을 실제로 1회 로드해 불연속 배치와 온보딩을 손으로 확인했다 — **하네스 통과가 경로 작동과 같지 않다**

**`[사람]` 항목은 스물하나 중 열넷이다.** 그 열넷은 체크한다고 해서 참이 되지 않는다 — 러너도 CI도 커밋 훅도 없으므로 이 목록의 **스물하나 중 열넷**은 약속이지 게이트가 아니다. 수를 어림으로 적지 않는다: `[기계]` 여섯 · `[기계+사람]` 하나 · `[사람]` 열넷 = 스물하나이며, 항목을 더할 때마다 이 문단의 수를 같이 고친다.

**이 문단을 고치기 전에 세어 본다.** 항목을 더하거나 뺀 뒤 커밋 전에 아래를 돌려 수를 맞춘다 — 이 문단이 낡는 사고가 santa R3·R4·R5 에서 세 번 났고, 세 번 다 "항목은 더했는데 이 문단은 안 고쳤다" 였다. 사람이 세면 또 틀린다.

```sh
awk '/^## Acceptance/,/^## Codex Adversarial Review/' .claude/plans/work-calendar-m2b.plan.md |
  { grep -c '^- \[ \] ' ; } 
```

판정자별로 세려면 `'^- \[ \] `\[기계\]`'` · `'^- \[ \] `\[기계+사람\]`'` · `'^- \[ \] `\[사람\]`'` 로 각각 센다.

스크린샷이나 붙여넣은 출력을 요구할 수는 있으나 위조가 체크박스보다 어렵지 않으므로 강제가 아니라 의례가 된다. 헤드리스 러너 도입이 유일한 실질 수리이며 이 마일스톤 밖이다(백로그 `id=m2-headless-runner`).

## Design Routing Guide

routing mode: `auto` (implement 단계에서 유효하다). plan 단계에는 아직 그려진 UI가 없으므로 **여기서는 어떤 impeccable 명령도 부르지 않는다** — 아래는 체크리스트일 뿐이다.

| Stage | Command |
|---|---|
| discovery | `/impeccable shape` |
| refine | `/impeccable layout` · `/impeccable typeset` · `/impeccable animate` · `/impeccable colorize` · `/impeccable bolder` · `/impeccable quieter` · `/impeccable overdrive` · `/impeccable delight` |
| simplify | `/impeccable adapt` · `/impeccable distill` · `/impeccable clarify` |
| evaluate | `/impeccable critique` · `/impeccable audit` |
| harden | `/impeccable harden` · `/impeccable optimize` · `/impeccable onboard` |
| polish | `/impeccable polish` |
| system | `/impeccable document` · `/impeccable extract` |

**이 표를 이 플랜에서는 대부분 쓰면 안 된다 — 그 사실을 표 옆에 적어 둔다.** UI4가 "새 시각 언어를 만들지 않는다"이고 이 플랜이 바꾸지 않기로 한 것이 색·칩 모양·아이콘·상시 표면이다. `colorize`·`bolder`·`overdrive`·`delight`는 정확히 그 넷을 건드리는 명령이라 **실행하면 UI4를 어긴다.** 이 플랜에서 실제로 쓸 수 있는 것은 Task 3의 온보딩 표면 하나에 한정된 `layout`·`clarify` 정도이고, `critique`·`audit`은 판정만 하므로 언제든 안전하다. 관문의 시각 언어를 정하는 것은 M3이며 이 표의 나머지는 그때 열린다.

## Codex Adversarial Review

<!-- placeholder: will be replaced by /mccp:plan Phase 7.3 -->
