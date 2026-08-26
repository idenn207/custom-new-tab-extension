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

그리드는 `rebuildIndex()`가 만든 버킷을 보고, 상세 패널은 `getEventsForDate()`를 본다(`renderPanel()` `newtab.js:4161` 의 **`4179` 줄**이 부르고, 정의는 `3353` 이다 — 앞선 판은 함수 머리 줄만 적어 호출부 인용으로 읽혔다). 그런데 후자는 **범위 조회**다 — `event.startDate <= dateKey && dateKey <= event.endDate`.

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

프로젝트가 하나도 없을 때 한 번 뜨는 안내를 만든다. 조건은 **`this.settingsManager.calendarSettingsLoaded && this.calendarManager.projects.length === 0 && !this.calendarManager.projectsLoadFailed && !this.settingsManager.calendarOnboardingSeen`** **넷 다**이다.

**첫째 항은 이 판에서 새로 더한 것이다 — `undefined` 가 온보딩을 켜는 경로 둘을 닫는다**(L2 security CRITICAL · invariant CRITICAL · security HIGH · invariant HIGH ×2 를 한 자리에서 흡수한다. 2026-08-26 실측). 앞선 판은 셋째 항 `!this.settingsManager.calendarOnboardingSeen` 에 소유자와 시점까지 못박고 끝냈는데, **그 필드가 `undefined` 로 남는 경로가 이 저장소에 둘 있고 둘 다 조용하다.** `!undefined` 는 참이므로 그 경로에서는 항이 있으나 마나이고 온보딩이 **매 로드마다 다시 뜬다** — 이 DD 가 스스로 "항을 넣어 놓고 항상 참이 되는 것은 항을 안 넣은 것과 같다" 고 적은 결함이 **다른 입구로 돌아온 것이다.**

경로 둘을 이름과 줄로 적는다:

- **(1) 설정 저장소 읽기 실패.** `loadSettings()` 의 `storage.get([...])`(`newtab.js:4544`)는 `try` 안에 있고 그 `catch` 는 `console.error` 만 하고 **재던지지 않는다**(`newtab.js:4587`~`4589`). 아래 "읽기" 항이 `'calendarOnboardingSeen'` 을 **바로 그 목록**에 넣으라고 지시하므로, `storage.get` 이 던지면 그 아래 대입 전체가 건너뛰어지고 필드는 **대입된 적이 없는 상태**로 남는다
- **(2) 설정 DOM 요소 부재.** `SettingsManager.initialize()`(`newtab.js:4313`)는 설정 모달 요소 열둘 중 **하나라도** 없으면 `console.error('Settings elements not found')` 뒤에 **조기 `return` 한다**(`newtab.js:4341`~`4342`). 그 경로에서는 `loadSettings()` 가 **아예 호출되지 않는다**(`newtab.js:4347`)

**둘 다 "설정을 못 읽었다" 이고, 그 상태는 첫 실행이 아니다.** 프로젝트 읽기 실패를 첫 실행으로 오인하지 않는다는 아래 규칙과 **같은 규칙**이며 다른 것은 오인의 원인이 `CalendarManager` 냐 `SettingsManager` 냐 하나다. 그러므로 답도 같다 — **온보딩을 띄우지 않고, 한 번뿐인 플래그도 태우지 않는다.**

**기본값을 `undefined` 가 아니라 `false` 로 만드는 것이 실제 수리다 — 판정식에 항을 더하는 것만으로는 안 된다.** 필드가 `undefined` 인 한 새로 더한 항이 읽는 값 역시 `undefined` 이고, 그러면 항을 하나 더 늘려 같은 결함을 하나 더 만든 것이 된다. 그래서 둘을 **함께** 한다:

- `SettingsManager` **생성자**(`newtab.js:4278` 이하 — `this.widgetType = 'clock';` 이 그 자리의 관용구다)에 `this.calendarSettingsLoaded = false;` 와 `this.calendarOnboardingSeen = false;` 를 **필드 기본값으로** 둔다. 그러면 위 두 경로 어느 쪽에서도 필드가 `undefined` 가 아니다
- `loadSettings()` 의 `try` **안에서**, `'calendarOnboardingSeen'` 대입 바로 다음 줄에 `this.calendarSettingsLoaded = true;` 를 둔다. `storage.get` 이 던지면 이 줄에 닿지 못하므로 `false` 로 남는다. **`catch` 안에 두지 않고 `finally` 에도 두지 않는다** — 둘 다 실패 경로에서 `true` 가 되어 첫째 항이 도로 무력해진다

**이 수리는 fail-open 을 fail-closed 로 뒤집는다.** 자리를 잘못 잡은 구현(판정을 `settingsManager` 초기화 **전에** 두는 것)에서도 첫째 항이 `false` 라 온보딩이 **안 뜨고**, 그것은 Acceptance 의 정상 경로 항목 (1) "빈 프로필 첫 로드에 뜬다" 가 즉시 잡는다. 앞선 판에서 같은 실수는 **매번 뜨는** 쪽으로 무너졌고 그쪽은 (1) 을 통과한다 — 방향이 뒤집힌 것이 요점이다.

**그리고 자리 자체도 기계가 본다**(L2 security HIGH). Validation 2 가 `Application.initialize()` 본문에서 `await this.settingsManager.initialize();` 줄과 판정 줄의 **순서**를 확인한다. 구조적 수리와 기계 검사를 둘 다 두는 이유는 서로 다른 것을 잡기 때문이다 — 구조는 피해를 막고, 검사는 계약 위반을 드러낸다.

**셋째 항에도 소유자를 붙여 적는다**(L2 architect, id=arch-m1). 앞선 판은 앞 두 항만 `this.calendarManager.*` 로 적고 셋째만 bare `!onboardingSeen` 으로 두었다. 그러면 **이 문단이 아래에서 스스로 경고하는 것과 똑같은 결함**이 셋째 항에 남는다 — 구현자가 지역 변수로 읽거나, 없는 접근자를 지어내거나, `CalendarManager` 쪽에서 찾는다. 셋 다 셋째 항을 언제나 참으로 만들고, 항을 넣어 놓고 항상 참이 되는 것은 **항을 안 넣은 것과 같다.** 판정식에 적힌 형태가 곧 구현 계약이다.

**셋째 항이 없으면 "한 번만" 이 성립하지 않는다**(santa R8 B1). 앞선 판은 아래 Task 3 에 "건너뛴 경우에도 다시 뜨지 않는 플래그를 저장한다" 를 적어 두고 **판정식에는 그 플래그를 넣지 않았다.** 그러면 건너뛰기를 누른 사용자나 나중에 프로젝트를 전부 지워 다시 0개가 된 사용자에게 **초기화할 때마다 온보딩이 다시 뜬다** — 무소속을 정상 상태로 두겠다는 UI8 을 깨고 프로젝트 생성을 사실상 반복 강제한다. **플래그를 이름으로 못박는다** — 설정 키 `calendarOnboardingSeen`(불리언, 기본 `false`)이고, **프로젝트를 만들었을 때와 건너뛰었을 때 둘 다** `true` 로 쓴다. 읽기·쓰기 주체는 `SettingsManager` 이며(다른 설정 키와 같은 경로), 읽기 실패로 온보딩이 뜨지 않은 경우에는 **쓰지 않는다** — 그 상태는 첫 실행이 아니기 때문이다.

**판정이 서는 자리를 시점까지 못박는다 — 소유자만으로는 부족하다**(2026-08-23 실측). 이 판정은 `Application.initialize()` 안에서, **`await this.settingsManager.initialize()` 뒤에** 선다. 그 시점이 아니면 셋째 항을 읽을 수가 없다 — `SettingsManager` 는 `newtab.js:5500` 근처에서 `await this.calendarManager.initialize()`(`newtab.js:5491`) **보다 나중에** 만들어지고 초기화되므로, 앞 두 항이 알려지는 시점에는 `this.settingsManager` 가 아직 없다. **앞선 판은 "읽기·쓰기 주체는 `SettingsManager`" 라고만 적고 그 주체가 언제 준비되는지를 적지 않았고**, 그러면 구현자는 존재하지 않는 객체에서 플래그를 읽어 `undefined` 를 얻는다 — `!undefined` 는 참이라 **셋째 항이 조용히 무력해지고 온보딩이 매번 다시 뜬다.** 판정식에 항을 넣어 놓고 그 항이 항상 참이 되는 것은 항을 안 넣은 것과 같다.

**그 "뒤"가 어디인지도 정한다 — 그 호출이 메서드의 마지막 문장이기 때문이다**(L2 architect, id=arch-m2). `await this.settingsManager.initialize()` 는 `Application.initialize()` 의 **마지막 문장**이므로(`newtab.js:5506`) "뒤에 선다"는 말만으로는 구현이 셋으로 갈린다 — (a) 그 줄 뒤에 새 문장을 잇는다, (b) 초기화 순서를 바꾼다, (c) 별도 메서드로 뺀다. **(a) 를 택한다.** `await this.settingsManager.initialize();` **바로 다음 줄**에 판정 한 문장을 잇고, 그것이 `Application.initialize()` 의 새 마지막 문장이 된다.

나머지 둘을 왜 안 쓰는지도 적는다 — 적지 않으면 다음 구현자가 같은 자리에서 다시 갈린다. **(b) 는 성립하지 않는다**: `SettingsManager` 는 생성자에서 `this.calendarManager` 를 인자로 받으므로(`newtab.js:5500`~`5505`) 그것보다 먼저 만들 수 없다. **(c) 는 답이 아니다**: 별도 메서드로 빼도 그 메서드를 부르는 자리는 결국 같은 곳이므로 자리 문제를 한 겹 옮기기만 한다. **같은 메서드의 `applyStorageNotice(...)` 호출(`newtab.js:5497`)이 바로 이 (a) 형태다** — 필요한 객체가 생긴 직후에 한 문장을 잇는 것이 이 메서드의 기존 관용구이고, 온보딩 판정도 같은 규칙을 탄다.

**그리고 그 키를 읽는 자리도 새로 만든다 — "같은 경로"가 무엇인지를 코드 형태로 적는다**(L2 architect, id=arch-m1). `SettingsManager.loadSettings()`(`newtab.js:4537`)는 지금 `calendarOnboardingSeen` 을 읽지 않는다(실측 — 그 이름이 `newtab.js` 어디에도 없다). **그리고 `SettingsManager` 에는 `getSetting()` 같은 범용 접근자가 아예 없다**(실측 2026-08-24 — `newtab.js` 전체에 그 이름이 없다). 설정은 `loadSettings()` 가 `storage.get([...])` 로 한 번에 읽어 **인스턴스 필드에 담고**(`this.widgetType`·`this.widgetPosition`·`this.searchPosition` 이 그 형태다, `newtab.js:4544`~`4566`), 쓰기는 키마다 작은 async 메서드가 `storage.set({...})` 를 부른다(`saveWidgetSetting()` `newtab.js:4817` 이 원형이다). **앞선 판의 "다른 설정 키와 같은 경로"는 이 저장소에서 두 가지로 읽힌다** — 없는 접근자를 지어내는 쪽과 필드를 다는 쪽. 그래서 형태를 못박는다:

- **읽기** — `loadSettings()` 의 `storage.get([...])` 키 목록에 `'calendarOnboardingSeen'` 을 더하고, 그 아래에서 `this.calendarOnboardingSeen = result.calendarOnboardingSeen === true;` 로 필드에 담고 **그 바로 다음 줄에 `this.calendarSettingsLoaded = true;` 를 둔다**(위 첫째 항 — `try` 안이어야 하고 `catch`·`finally` 에 두면 안 된다). **`=== true` 를 쓴다** — 키가 없으면 `undefined === true` 가 거짓이므로 그것이 기본값 `false` 다. `!== false` 를 쓰지 않는다. 그것은 기본값 `true` 를 주는 관용구이고(`widgetEnabled` 가 그 예다) 기본값이 뒤집히면 **첫 실행에 온보딩이 아예 안 뜬다**
- **쓰기** — `saveWidgetSetting()` 과 같은 모양의 `async saveCalendarOnboardingSeen()` 을 더해 `await storage.set({ calendarOnboardingSeen: true })` 를 부르고 `this.calendarOnboardingSeen = true` 로 **필드도 함께 올린다.** 필드를 안 올리면 같은 세션에서 판정이 다시 서는 경로가 생겼을 때 옛 값을 읽는다

그것이 DD13 이 말하는 "읽기·쓰기 주체는 `SettingsManager`" 의 실제 내용이다.

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
| `work-calendar-m2b.baseline.json` | CREATE | **커밋한다.** Task 0이 내려받아 저장소 루트에 두고 Task 4가 재베이스라인 뒤 덮어쓴다. **커밋하는 이유를 바로 적는다**(L2 invariant) — 앞선 판은 "커밋되지 않으면 `shasum -c` 가 없는 파일에서 죽는다" 고 적었는데 **그 근거가 틀렸다.** 구현 중에는 그 파일이 작업 트리에 있으므로 `-c` 는 커밋 여부와 무관하게 돈다. 진짜 이유는 **앵커가 이 트리 밖에서도 검증 가능해야 한다**는 것이다 — 전반부의 `work-calendar-m2.baseline.json` 은 `.gitignore` 98행에 걸려 추적되지 않아 Task 0 이 적어 둔 대로 **새로 클론한 저장소에서는 전반부 앵커를 검증할 수 없다.** 이 플랜은 그 약점을 물려받지 않기로 하고 자기 봉투는 커밋한다. **전반부와 다르게 처리하는 것이 의도다** — `.gitignore` 에 `m2b` 항목을 더하지 **않는다**(실측 2026-08-24: 98행은 `/work-calendar-m2.baseline.json` 정확 일치라 `m2b` 는 이미 추적 대상이고, `git check-ignore` 가 무시하지 않음을 확인했다) |
| `.claude/plans/work-calendar-m2b.baseline.sha256` | CREATE | Task 0이 뜬 구현 전 앵커. **기록이지 끝 상태 게이트가 아니다** |
| `.claude/plans/work-calendar-m2b.rebaseline.sha256` | CREATE | Task 4가 재베이스라인 직후에 뜬 앵커. **끝 상태 게이트는 이쪽이다** |
| `.claude/prds/work-calendar.prd.md` | UPDATE | M2 행을 `complete`로. 전반부만으로는 바꾸지 않는다 |
| `README.md` | UPDATE | 불연속 배치 동작 갱신. **무엇을 적을지 정한다**(L2 architect LOW) — 달력 설명에서 "시작일~종료일 범위가 셀을 채운다" 는 서술을 **"관문(`planned`) 날짜만 셀을 채우고 사이 날짜는 빈다"** 로 바꾸고, `dropped` 관문의 날짜도 그대로 점유한다는 한 줄을 더한다. **새 시각 언어를 설명하지 않는다**(UI4 — 색·아이콘은 M3). 판정자는 Acceptance 의 `[사람]` 이며 기계 검사를 두지 않는다: 문서 문구를 grep 으로 고정하면 표현을 바꿀 때마다 게이트가 죽는다 |

**바꾸지 않는 것**: 시계 모드 경로(`ClockManager`), 배경·즐겨찾기·이미지·검색 매니저, `createCalendarEvent()`·`createCalendarGate()`·`promoteEventsToV4()` 등 전반부가 확정한 데이터 경로.

## Tasks

### Task 0: 후반부 베이스라인 확보

- **Action**:

  **만드는 것 — 셋이다.**
  1. `work-calendar-m2b.baseline.json` — 하네스의 `베이스라인 내보내기` 버튼으로 내려받아 저장소 루트에 둔다. **버튼이 내려주는 파일명은 이 이름이 아니다 — 반드시 바꿔 저장한다**(2026-08-23 실측). `test/positioning.smoke.js` 의 `exportBaseline` 리스너는 `link.download` 을 **`'work-calendar-m2.baseline.json'` 으로 하드코딩**해 둔다(전반부가 만들 때의 이름이다). 그대로 받아 저장소 루트에 두면 **전반부의 앵커 파일을 덮어쓴다** — `work-calendar-m2.rebaseline.sha256` 이 그 파일을 해싱하므로 `-c` 가 그 자리에서 깨지고, M2 전체의 감사 기록 셋 중 하나가 복구 불가능하게 사라진다. 버튼을 고쳐 파일명을 바꾸지 **않는다** — 그것은 전반부가 확정한 하네스 표면을 건드리는 일이고, 이름 하나 때문에 재베이스라인 축을 또 흔든다. **저장소 루트의 `work-calendar-m2.baseline.json` 을 아예 건드리지 않는 것이 규칙이다.** 받은 파일을 그 이름으로 저장소 루트에 두었다가 나중에 옮기는 순서를 쓰지 않는다 — 그 순간 전반부 파일이 이미 덮였고, **되돌릴 방법이 없다.**

     **되돌릴 수 없는 이유를 정확히 적는다**(2026-08-23 실측). `work-calendar-m2.baseline.json` 은 `.gitignore` 98행(`/work-calendar-m2.baseline.json`)에 걸려 **git 이 추적하지 않는다** — `git ls-files --error-unmatch` 가 "did not match any file(s) known to git" 을 준다. 그러므로 `git checkout -- work-calendar-m2.baseline.json` 은 **아무 일도 하지 않는다.** 앞선 판이 그것을 복구 수단으로 적었는데 틀렸다. 그리고 다시 뜰 수도 없다 — 그 파일은 **전반부가 끝난 시점의 하네스**에서 나온 것이고 이 플랜의 Task 1·3·4 가 그 하네스를 고치므로, 덮은 뒤에는 같은 것을 만들 수 없다. **한 번 덮으면 M2 전반부의 감사 기록은 영구히 사라진다.**

     그래서 순서를 뒤집는다 — 저장소 루트를 거치지 않고 **내려받은 자리에서 새 이름으로 바로 옮긴다:**

     ```sh
     # 판정을 함수 하나로 못박는다 — 아래 0)과 2)가, 그리고 Validation 3-1 이 **같은 셋**을 본다.
     # 상태는 셋이다: (부재) · (존재+불일치) · (존재+일치). 앞의 둘을 뭉개면 안 된다.
     m2base_guard() {
       n=$(grep -c 'work-calendar-m2\.baseline\.json' .claude/plans/work-calendar-m2.rebaseline.sha256)
       [ "$n" = "1" ] || { echo "전반부 앵커에서 그 줄을 정확히 하나 뽑지 못했다(${n}개) — 빈 입력을 -c 에 흘리면 **그냥 통과한다**"; return 1; }
       if [ ! -e work-calendar-m2.baseline.json ]; then
         # 부재 — 이 검사의 목적은 "Task 0 이 전반부 봉투를 덮었는가" 하나이고,
         # 대상이 없으면 덮을 것도 없다. 통과가 아니라 **성립하지 않음**이므로 그대로 적고 진행한다.
         echo "NOTE: work-calendar-m2.baseline.json 이 이 트리에 없다 — 보존 검사가 성립하지 않는다(아래 구조적 약점). 진행하되 **이 이름으로 파일을 만들지 않는다**"
         return 0
       fi
       grep 'work-calendar-m2\.baseline\.json' .claude/plans/work-calendar-m2.rebaseline.sha256 \
         | shasum -a 256 -c -   # 또는 sha256sum -c -
     }

     # 0) 전반부 파일의 상태를 먼저 본다. **불일치**면 이미 덮인 것이므로 아래를 진행하지 말고
     #    사용자에게 알린다 (복구 수단이 없다). **부재**면 덮을 대상이 없으므로 진행한다.
     m2base_guard || exit 1

     # 0-b) **복구본을 하나 뜬다** (L2 invariant HIGH, 이 판에서 더함). 위 0) 은 덮였는지를
     #      *탐지*할 뿐 덮이는 것을 *막지* 못하고, 이 파일은 `.gitignore` 98행에 걸려 git 이
     #      복구해 주지 않으므로 앞선 판에서 이 자리의 사고는 **되돌릴 수 없었다.** 그 사실
     #      자체를 이 세 줄이 없앤다 — 아래 mv 의 목적지를 잘못 적어도 복구본이 남는다.
     #      저장소 **밖**에 둔다: 루트에 두면 그것이 또 하나의 덮어쓰기 후보가 되고, 이름이
     #      비슷한 파일이 앵커 옆에 서면 Validation 3-1 이 무엇을 보는지가 흐려진다.
     #      부재 상태에서는 뜰 것이 없으므로 아무 일도 하지 않는다(현재가 그 상태다).
     [ -e work-calendar-m2.baseline.json ] && [ ! -e "$HOME/work-calendar-m2.baseline.json.bak" ] \
       && cp work-calendar-m2.baseline.json "$HOME/work-calendar-m2.baseline.json.bak"

     # 1) 브라우저가 내려받은 파일은 다운로드 폴더에 `work-calendar-m2.baseline.json` 이름으로 떨어진다.
     #    **그것을 저장소 루트에 그 이름으로 복사하지 않는다.** 다운로드 자리에서 새 이름으로 바로 옮긴다.
     #    부재 상태에서도 이 규칙은 그대로다 — 그 이름으로 파일을 만드는 순간 (존재+불일치) 로
     #    떨어져 Validation 3-1 이 **이 플랜이 덮었다고** 판정한다.
     [ -e work-calendar-m2b.baseline.json ] && { echo "work-calendar-m2b.baseline.json 이 이미 있다 — 옛 것을 치운 뒤 다시 한다"; exit 1; }
     mv "$HOME/Downloads/work-calendar-m2.baseline.json" ./work-calendar-m2b.baseline.json || { echo "mv 실패 — 내려받은 경로를 확인한다"; exit 1; }

     # 2) 옮긴 뒤 다시 본다. 0)과 같은 함수이고, 같은 답이 나와야 한다.
     m2base_guard || exit 1
     ```

     **부재를 불일치와 갈라 적는 이유를 적는다 — 실측이다**(2026-08-25). 앞선 판은 0)·2)와 Validation 3-1 에 `grep … | -c -` 한 줄만 두고 "여기서 실패하면 이미 덮인 것" 이라고 적었는데, **그 한 줄은 부재와 불일치를 같은 exit 1 로 뭉갠다.** 그리고 이 저장소는 지금 **부재** 상태다 — `work-calendar-m2.baseline.json` 이 이 작업 트리에도 main 체크아웃에도 없다(저장소 전체 `find` 로 확인). 바로 아래 "구조적 약점" 문단이 예고한 상태가 **이미 현실이 됐다**는 뜻이다.

     뭉갠 한 줄을 그대로 두면 결과가 둘이고 둘 다 나쁘다. 하나는 **틀린 진단**이다 — Task 0 을 시작하자마자 "덮였다 · 복구 불가 · 멈춰라" 가 나오는데 아무도 아무것도 덮지 않았다. 다른 하나가 더 나쁘다 — Validation 3-1 이 같은 줄이므로 **구현이 무엇을 하든 이 플랜은 자기 Validation 을 통과할 수 없다.** 게이트가 언제나 죽으면 사람은 그 줄을 고치지 않고 지운다.

     **부재에서 진행하는 것이 fail-open 이 아닌 이유도 적는다.** 이 검사의 목적은 좁고 플랜이 이미 못박고 있다 — "덮어쓰기가 훼손하는 것은 `work-calendar-m2.baseline.json` **하나**" 다. 대상이 부재하면 이 플랜이 훼손할 것이 없으므로 검사는 **통과한 것이 아니라 성립하지 않는다**, 그리고 그 사실을 `NOTE:` 로 적어 남긴다. "전반부가 정말 깨끗하게 끝났는가" 는 이 검사가 답하던 질문이 **아니며, 그 답은 따로 있다** — Task 0 이 지금 트리에서 새로 뜨는 봉투의 `meta.assertFailures` 를 Validation 3-2 가 기계로 읽는다. 그 사슬은 부재와 무관하게 온전하다.

     **`grep -c` 로 줄 수를 먼저 세는 것도 이 판에서 더했다**(L2 invariant LOW). `grep` 이 아무것도 못 찾으면 `-c -` 는 **빈 입력을 받아 exit 0 을 준다** — 앵커에서 그 줄이 사라진 실행이 조용히 통과한다. 정확히 하나가 아니면 죽는다.

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

     **각 고정 입력 줄에 주석 표식 `DD31-FIXTURE`를 단다 — 형태까지 못박는다**(L2 test). 정확히 `// DD31-FIXTURE` 이고, **그 고정 입력을 만드는 문장과 같은 줄 끝**에 번호와 함께 붙인다:

     ```js
     await calendar.addEvent({ /* … */ }); // DD31-FIXTURE 1 — today-3·today 관문
     ```

     **형태를 안 정하면 검사가 헛돈다** — Validation 2 는 `grep -c "DD31-FIXTURE"` 로 **줄 수**를 세므로, 표식 다섯을 머리말 주석 블록에 몰아 적어도 다섯이 세어지고 정작 고정 입력에는 하나도 안 붙을 수 있다. 반대로 여러 줄에 걸친 객체 리터럴의 **중간 줄**에 붙이면 사람이 어느 입력의 표식인지 알 수 없다. 그래서 **입력 하나당 정확히 한 줄**이다. Validation 이 그 표식을 세어 **다섯** 미만이면 죽는다. 표식이 값의 정확성을 증명하지는 않지만, "폭 없는 항목만으로 케이스를 써 두어 DD31이 구현되지 않아도 통과하는" 실패 모양은 확실히 잡는다.

  **고치는 것 — 둘이고 둘 다 필수다(DD32).**
  - `rebuildIndex()`(`newtab.js:3321`) — 이벤트마다 `event.gates` 의 `g.planned` 를 **집합으로 접은 뒤**(`new Set(...)`) 그 **고유 날짜마다 이벤트를 한 번씩** 버킷에 넣는다. **관문마다 넣지 않는다** — DD25 가 같은 날 `dev`·`review` 를 허용하므로 관문 단위로 넣으면 한 이벤트가 같은 버킷에 두 번 들어가고, 그리드는 칩 둘 · 패널은 하나가 되어 DD32 가 막으려는 불일치가 돌아온다(DD31). **그 접기 규칙이 DD31 본문과 아래 고정 입력 5번에는 있었는데 이 지시 줄에만 없었다** — Action 만 읽은 구현자가 그대로 이중 삽입을 만들게 돼 있었고, DD29 가 금지한 "규칙은 산문에, 지시에는 없음" 이 바로 이 모양이다 (santa R6 A). **파생 `startDate`·`endDate`는 인덱스 입력에서 뺀다.** `dropped` 관문의 날짜도 넣는다. **그리고 고유 `planned` 중 `windowStartKey <= planned && planned <= windowEndKey` 인 것만 넣는다 — 창 절단은 그대로 유지한다.**

    **위 지시의 마지막 절이 왜 거기 있는지를 적는다**(L2 architect HIGH). 앞선 판은 그 제약을 이 문단에만 두었고, **지시 줄에 없는 규칙은 지시만 읽는 사람에게 없는 규칙이다** — DD29 가 금지한 모양이라 이번에 지시 문장 안으로 옮겼다. `rebuildIndex(windowStartKey, windowEndKey)` 는 지금 **렌더 창 밖 이벤트를 건너뛰고**(`newtab.js:3327` `if (event.endDate < windowStartKey || event.startDate > windowEndKey) return;`) 창 안으로 잘라 넣는다(`3329`). 그 이유는 상한이다 — 5,000건 × 366일이면 인덱스가 터지므로 42일 창과 겹치는 구간만 담는다(`newtab.js:2199`~`2202` 의 주석이 그것을 적는다). **관문으로 바꾸는 것은 *무엇을* 넣는가이지 *얼마나* 넣는가가 아니다**: 고유 `planned` 날짜 중 **`windowStartKey <= planned && planned <= windowEndKey` 인 것만** 버킷에 넣는다. 앞선 판은 이 제약을 Validation 의 전제 단언 쪽에만 적어 두어(`bucketKeys` 가 창으로 잘린 값이라는 문단), **Action 만 읽은 구현자는 창 절단을 지운다** — 그러면 상한이 사라지고 이 플랜이 성능 회귀를 만든다. DD29 가 금지한 "규칙은 산문에, 지시에는 없음" 이 다시 이 자리다

    **이 Task 가 만드는 `runCalendarOccupancyCases()` 는 Task 2 의 단언 셋도 담는다 — 지시 쪽에 적는다**(L2 architect MEDIUM, 이 판에서 더함). 아래 Validate 와 Task 2 Validate 가 그 사실을 적고 있었지만 **경고였지 계약이 아니었다.** 계약으로 적는다: 이 함수는 단언 **열**을 담는다(점유 다섯 · 그리드-패널 일치 둘 · Task 2 렌더 규칙 셋). Task 1 만 수행하고 함수를 닫으면 Validation 2 의 `TASK2-RULE-n` 검사에서 죽는다
  - `getEventsForDate(dateKey)`(`newtab.js:3353`) — `event.gates.some((g) => g.planned === dateKey)`로 바꾼다. 창 인덱스를 우회하는 구조는 그대로 둔다

  **하나만 고치면 그리드와 패널이 같은 날짜에 다른 답을 낸다**(DD32). 둘을 한 Task에 둔 이유가 그것이다 — 나누면 그 사이에 그 버그가 실재하는 커밋이 생긴다.
- **Mirror**: `newtab.js:3321` `rebuildIndex()`의 버킷 구성과 `3353` `getEventsForDate()`의 전체 훑기
- **Validate**: `runCalendarOccupancyCases(collector)`가 **다섯**을 전부 돌리고 아래 **다섯**을 단언한다(santa R1 B3 — santa R0 B2가 고정 입력과 단언을 하나씩 더하면서 이 머리말의 수를 넷으로 남겨 두었다).

  **먼저 단언이 쓰는 세 값을 여기서 유도한다 — 비워 두면 구현자마다 다르게 뽑고, 그러면 아래 다섯 줄의 반증력이 통째로 사라진다**(L2 test, id=test-m1). 앞선 판은 `bucketKeys`·`bucketSizesByDate`·`chipCountsByDate` 를 이름으로만 쓰고 어디서 나오는지를 적지 않았다. 하네스에 이미 있는 관용구를 그대로 쓴다 — `chipDatesFor`(`test/positioning.smoke.js:1261`~`1266`)가 셀·칩 선택자의 원형이다:

  ```js
  // 인덱스 쪽 — CalendarManager.eventsByDate 는 Map<dateKey, CalendarEvent[]> 다 (newtab.js:3322)
  const bucketKeys = Array.from(calendar.eventsByDate.keys()).sort();
  const bucketSizesByDate = Object.fromEntries(
    Array.from(calendar.eventsByDate.entries()).map(([d, list]) => [d, list.length])
  );
  // 화면 쪽 — render() 뒤에 DOM 에서 센다.
  // `.calendar-chip-more`(`+N`)는 클래스 토큰이 달라 `.calendar-chip` 에 걸리지 않는다 — 칩이 아니므로 그것이 맞다.
  const chipCountsByDate = Object.fromEntries(
    Array.from(frameWindow.document.querySelectorAll('.calendar-day')).map((cell) => [
      cell.dataset.date,
      cell.querySelectorAll('.calendar-chip').length,
    ])
  );
  ```

  **셋의 출처가 서로 다른 것이 요점이다** — 앞 둘은 인덱스에서, 셋째는 **렌더된 DOM** 에서 나온다. 셋 다 인덱스에서 뽑으면 아래 3번이 "인덱스와 인덱스"를 비교하게 되어 `createChips()` 가 옛 범위로 그려도 통과한다.

  **그리고 창 절단을 단언 앞에 전제로 세운다.** `rebuildIndex(windowStartKey, windowEndKey)`(`newtab.js:3321`)는 **창 밖 날짜를 버킷에 넣지 않으므로** `bucketKeys` 는 창으로 잘린 값이고 `allGatePlannedDates` 는 잘리지 않은 값이다. 오늘이 그 달 1일이면서 일요일이면 42칸 창이 정확히 오늘에서 시작해 `today-3` 이 창 밖으로 나가고, **옳은 구현에서도 1번이 깨진다** — 돌리는 날에 따라 결과가 갈리는 케이스는 없느니만 못하다(`test/positioning.smoke.js:780` 머리말이 같은 이유로 날짜를 전부 `todayKey` 상대값으로 만든다). 그래서 전제를 먼저 단언하고 **메시지를 가른다**:

  ```js
  const windowDates = new Set(
    Array.from(frameWindow.document.querySelectorAll('.calendar-day')).map((c) => c.dataset.date)
  );
  assert(
    allGatePlannedDates.every((d) => windowDates.has(d)),
    '고정 입력의 관문 날짜가 렌더 창 밖이다 — 구현 결함이 아니라 케이스 결함이다(오늘 날짜에 따라 갈린다)'
  );
  ```

  이 줄이 먼저 죽으면 고칠 것은 구현이 아니라 고정 입력이다. 메시지를 가르지 않으면 창 가장자리에서 난 실패가 DD31 미구현으로 읽힌다.

  1. `assert(setEq(bucketKeys, allGatePlannedDates), '점유가 관문 집합과 다르다')` — 점유의 **정의**가 관문이라는 DD31의 단언이다.
     **`allGatePlannedDates` 가 무엇인지를 여기서 정한다 — 비워 두면 구현자가 정하게 되고, 그러면 이 단언은 자기가 만든 기대값과 자기를 비교한다.** `allGatePlannedDates` = 그 고정 입력의 **모든 이벤트**의 **모든 관문**의 `planned` 를 모은 뒤 중복을 없앤 집합이다. 둘을 명시한다 — (a) **`status === 'dropped'` 인 관문도 들어간다**(DD31 이 계획을 남기므로 그 날짜도 점유된다. 4번 고정 입력이 이것을 반증한다), (b) 이 집합은 **날짜의 집합**이므로 이벤트별 접기(DD31)는 여기에 영향을 주지 않는다 — 같은 날 관문 둘은 이쪽에서도 한 날짜다. **접기가 가르는 것은 `bucketKeys` 가 아니라 `bucketSizesByDate` 이고**, 그것을 보는 것은 아래 5번이다
  2. `assert(isSubset(bucketKeys, legacyRangeDates), '관문에 없던 날을 점유했다')` — 관문은 옛 범위 안에 있으므로 새 날이 생길 수 없다
  3. 각 날짜 `d`에 대해 `assert(chipCountsByDate[d] === Math.min(bucketSizesByDate[d], MAX_CHIPS_PER_CELL), '그리드 칩이 인덱스와 어긋난다')` — **인덱스가 맞다는 것과 화면이 맞다는 것은 다른 주장이다.** `rebuildIndex()`만 옳게 고치고 `createChips()`가 옛 범위로 그리면 1·2번은 통과하고 여기서만 죽는다. 비교 대상이 **키 목록이 아니라 버킷 길이**인 것과 상한 절단을 함께 넣는 것이 요점이다(키 목록에서 유도하면 언제나 1이고, 자르지 않은 수와 비교하면 상한을 넘는 날에서 옳은 구현이 죽는다)
  4. **1번 고정 입력에서** `assert(bucketKeys.length === 2, '불연속 배치가 반영되지 않았다 — 4일 폭인데 점유가 줄지 않았다')` — 이 줄이 없으면 `rebuildIndex()`를 고치지 않고도 1~3번이 전부 통과한다

  5. **5번 고정 입력에서** `assert(bucketSizesByDate[today] === 1, '같은 날 관문 둘이 한 이벤트를 두 번 점유했다')` — 전반부 DD25가 허용하는 모양이고, 이벤트 안에서 접지 않으면 버킷 길이가 2가 되어 3번 단언을 타고 칩이 둘 그려진다(DD31, santa R0 B2)

  **이 함수는 Task 2 의 단언 셋도 담는다 — 여기 적어 둔다**(L2 test finding #4 의 성립하는 절반). `runCalendarOccupancyCases()` 는 점유만 보는 함수가 아니다. Task 2 의 렌더 규칙 셋(패널 메타 · `dropped` 마감 상태 · 프로젝트 이름 자리)이 **같은 고정 입력을 재사용하려고 이 함수 안에 들어온다**(Task 2 Validate 1~3 이 그 셋을 정의한다). 그 사실이 Task 1 쪽에 없으면 **Task 1 만 읽은 구현자가 점유 단언 다섯만 쓰고 함수를 닫고**, Task 2 의 셋은 아무 데도 안 생기면서 Validation 2 의 존재·배선 검사는 그대로 통과한다 — 하네스가 점유는 보고 렌더는 못 보는 반쪽 게이트가 된다. **이것이 이 플랜이 갈라진 이유로 든 "한 자리를 고치고 쌍둥이를 남긴 것" 과 같은 모양이므로** 두 자리에 같은 말을 적는다.

  더해서 **그리드와 패널의 일치**를 단언한다 — 1번 고정 입력에서 `today-1` 셀이 비어 있고 **그 날짜의 `getEventsForDate()`도 빈 배열**인지. 둘 중 하나만 고치면 여기서 죽는다(DD32). **5번 고정 입력에서도 같은 일치를 본다** — `today` 셀의 칩이 **하나**이고 `getEventsForDate(today)`도 길이 **1**인지. 1번은 "둘 다 비었나"를 묻고 이쪽은 "둘 다 하나인가"를 물으므로, 접기 누락은 1번을 통과하고 여기서만 죽는다(santa R0 B2).

  **이 둘도 표식을 단다 — `DD32-CONSISTENCY-1` 과 `DD32-CONSISTENCY-5`**(L2 test LOW, 이 판에서 더함). 형태는 `DD31-FIXTURE`·`TASK2-RULE-n` 과 같다 — 그 단언 문장과 **같은 줄 끝**에 `// DD32-CONSISTENCY-1` 로 붙인다. 표식을 다는 이유가 둘이다. 하나는 **개수의 모호함**이다 — 앞선 판은 고정 입력 표에 다섯 줄만 있고 이 문단이 단언 둘을 따로 말해서, 요구되는 단언이 다섯인지 일곱인지가 읽는 사람마다 갈렸다. 다른 하나는 **판정자**다 — 이 둘은 DD32 의 불변식(그리드와 패널이 같은 답을 낸다)을 지는 유일한 기계 단언인데 표식이 없으면 Validation 2 가 볼 수 없어 Acceptance 의 `[사람]` 만 남는다. **그러므로 이 함수가 담는 단언은 열이다** — 점유 다섯 · 일치 둘 · Task 2 렌더 규칙 셋.

  **단언 열을 코드로 적는다 — 산문만 두면 "무엇을 검사하는지 정해지지 않았다" 가 계속 성립한다**(L2 test HIGH ×3 · invariant HIGH · architect MEDIUM, 이 판에서 더함). 앞선 판은 열 개를 전부 산문으로만 적었고, 그래서 표식 검사가 `assert(` 를 요구해도 **`assert(true) // TASK2-RULE-1` 이 계약을 어기지 않았다** — 어길 계약이 없었기 때문이다. 아래가 그 계약이다. 이름과 값은 이 저장소에서 실제로 닿는 것만 쓴다(실측 2026-08-26).

  ```js
  // ── 헬퍼 ────────────────────────────────────────────────────────────────
  // setEq 는 이 파일에 이미 있지만 **다른 케이스 함수 안의 지역 const 다**
  // (test/positioning.smoke.js:844). isSubset 은 아예 없다(실측 2026-08-26).
  // 그러므로 이 함수 안에 둘 다 새로 둔다 — 없는 헬퍼를 부르는 단언은 돌지 않는다.
  const setEq = (a, b) => a.length === b.length && a.slice().sort().join(',') === b.slice().sort().join(',');
  const isSubset = (a, b) => a.every((x) => b.includes(x));
  // MAX_CHIPS_PER_CELL 은 newtab.js:115 의 **const** 라 프레임 전역에 붙지 않는다
  // (function 선언과 달리 const 는 window 프로퍼티가 아니다 — frameWindow.MAX_CHIPS_PER_CELL 은 undefined).
  // 값을 여기 복제하되 **드리프트를 Validation 이 잡는다**(2-d).
  const CHIP_CAP = 2; // ← newtab.js:115 `const MAX_CHIPS_PER_CELL = 2;`

  // ── 비교의 양쪽을 서로 다른 출처에서 뽑는다 ──────────────────────────────
  // allGatePlannedDates 는 **이벤트의 관문**에서, bucketKeys 는 **인덱스**에서 나온다.
  // 둘을 같은 곳에서 뽑으면 이 단언은 자기가 만든 기대값과 자기를 비교한다.
  const allGatePlannedDates = Array.from(
    new Set(calendar.events.flatMap((e) => e.gates.map((g) => g.planned)))
  ).sort();                                   // dropped 관문도 포함한다 (DD31)
  const legacyRangeDates = Array.from(
    new Set(calendar.events.flatMap((e) => {
      const out = [];
      for (let d = e.startDate; d <= e.endDate; d = frameWindow.shiftDateKey(d, 1)) out.push(d);
      return out;
    }))
  ).sort();

  // ── 전제: 고정 입력의 관문이 전부 렌더 창 안인가 ────────────────────────
  const windowDates = new Set(
    Array.from(frameWindow.document.querySelectorAll('.calendar-day')).map((c) => c.dataset.date)
  );
  assert(
    allGatePlannedDates.every((d) => windowDates.has(d)),
    '고정 입력의 관문 날짜가 렌더 창 밖이다 — 구현 결함이 아니라 케이스 결함이다(오늘 날짜에 따라 갈린다)'
  );

  // ── 점유 다섯 ───────────────────────────────────────────────────────────
  assert(setEq(bucketKeys, allGatePlannedDates), '점유가 관문 집합과 다르다');
  assert(isSubset(bucketKeys, legacyRangeDates), '관문에 없던 날을 점유했다');
  Object.keys(bucketSizesByDate).forEach((d) => {
    assert(
      chipCountsByDate[d] === Math.min(bucketSizesByDate[d], CHIP_CAP),
      '그리드 칩이 인덱스와 어긋난다: ' + d
    );
  });
  // 1번 고정 입력 — **개수가 아니라 날짜를 본다.** length === 2 만 보면
  // today-1·today 를 점유한 잘못된 구현도 통과한다(L2 test HIGH).
  assert(
    setEq(bucketKeys, [f1.gateA, f1.gateB]),   // f1.gateA = shiftDateKey(todayKey,-3), f1.gateB = todayKey
    '불연속 배치가 반영되지 않았다 — 4일 폭인데 점유가 관문 둘로 줄지 않았다'
  );
  // 5번 고정 입력 — 같은 날 dev·review 관문 둘이 한 이벤트를 두 번 점유하지 않는가
  assert(bucketSizesByDate[calendar.todayKey] === 1, '같은 날 관문 둘이 한 이벤트를 두 번 점유했다');

  // ── 그리드-패널 일치 둘 (DD32) ──────────────────────────────────────────
  // 1번: 사이 날짜가 **양쪽 다** 비었는가
  const gapKey = frameWindow.shiftDateKey(calendar.todayKey, -1);
  assert(
    (chipCountsByDate[gapKey] || 0) === 0 && calendar.getEventsForDate(gapKey).length === 0,
    '그리드와 패널이 today-1 에 다른 답을 낸다 — 둘 중 하나만 고쳤다(DD32)'
  ); // DD32-CONSISTENCY-1
  // 5번: 접힌 날이 **양쪽 다** 하나인가
  assert(
    chipCountsByDate[calendar.todayKey] === 1 && calendar.getEventsForDate(calendar.todayKey).length === 1,
    '그리드와 패널이 today 에 다른 개수를 낸다 — 이벤트별 접기가 빠졌다(DD31·DD32)'
  ); // DD32-CONSISTENCY-5
  ```

  **이 코드가 계약이지 완성품은 아니다.** 고정 입력을 세우는 부분(`f1` 등)과 `collector.add(...)` 는 구현자가 위 표대로 채운다. 계약인 것은 **무엇을 무엇과 비교하는가**이고, 그것이 앞선 판에 없어서 표식만으로는 아무것도 반증되지 않았다.

### Task 2: 렌더 표면 적응

- **Action**:

  **만드는 것**: 없다.

  **고치는 것 — 새 시각 언어를 만들지 않는다(UI4).**
  - **여섯 중 직접 고치는 것은 셋이다 — 나머지 셋은 물려받는다**(L2 architect MEDIUM, 이 판에서 가름). 앞선 판은 `renderSummary` · `renderGrid` · `createDayCell` · `createChips` · `renderPanel` · `createTodoItem` 여섯을 한 줄에 묶어 "고치는 것" 으로 적어 놓고 **아래 규칙 1~3 은 그중 셋만 정했다.** 그러면 구현자가 나머지 셋에서 무엇을 고쳐야 하는지 찾다가 없는 변경을 지어내거나, 플랜이 미완이라고 읽는다. 실측으로 가른다(`7a24204`):

    | 함수 | 직접 고치는가 | 근거 |
    |---|---|---|
    | `createTodoItem`(`newtab.js:4198`) | **예** — 규칙 1·3 | 메타 문자열을 자기가 만든다 |
    | `createChips`(`newtab.js:4135`) | **예** — 규칙 2 | `is-due-*` 를 자기가 붙인다 |
    | `createDayCell`(`newtab.js:4062`) | **예** — 규칙 2 | `getCellDueState()` 호출에 `dateKey` 를 넘긴다 |
    | `renderSummary`(`newtab.js:3978`) | 아니오 | `getEventDueState(event)` 를 셀 뿐이고, **그 함수는 전반부가 이미 종단 관문을 읽도록 바꿨다**(전반부 DD5a). 여기서 고칠 것이 없다 |
    | `renderGrid`(`newtab.js:4026`) | 아니오 | 셀을 돌며 `createDayCell()` 을 부르는 오케스트레이터다. 점유 변화는 `rebuildIndex()`(Task 1)에서 오고 이 함수는 그대로 탄다 |
    | `renderPanel`(`newtab.js:4161`) | 아니오 | `createTodoItem()` 을 부르는 오케스트레이터다. 메타 변화는 그 안에서 일어난다 |

    아니오 셋에 **손대지 않는 것이 계약이다** — 손대면 그 변경은 규칙 1~3 어디에도 근거가 없고 UI4 의 "기존 표면 재사용" 을 벗어난다.

  - **전제 하나를 여기 적는다 — 이 플랜만 읽어서는 알 수 없다**(L2 architect MEDIUM, 이 판에서 더함). 위 표의 `renderSummary` 행이 성립하는 이유는 **전반부가 `getEventDueState()` 를 이미 고쳐 두었기 때문**이다: 전반부 DD5a 가 "마감 판정은 `dropped` 를 제외한다 — `getEventDueState()` 가 읽는 **종단 관문**은 `status !== 'dropped'` 인 관문 중 `planned` 가 가장 늦은 것" 이라고 정했다(`work-calendar-m2.plan.md`). 그러므로 **이 플랜은 마감 판정을 건드리지 않는다** — 이 플랜이 바꾸는 것은 *어느 셀이 차는가*(Task 1)와 *그 셀에 어떤 상태를 붙이는가*(Task 2 규칙 2)이지 *마감이 언제인가*가 아니다. 전반부가 끝나지 않은 트리에서 이 플랜을 시작하면 규칙 2 가 기대는 `dropped` 구분 자체가 없으므로 **Task 1 앞에 전반부 완료를 확인한다**(Validation 2 의 함수 존재 검사가 전반부 산출물까지 보지는 않는다 — 이것은 절차 규칙이다).
  - `renderSummary` · `renderGrid` · `createDayCell` · `createChips` · `renderPanel` · `createTodoItem` — 새 데이터(`gates`·`projectId`)를 읽되 **기존 칩·뱃지 토큰을 그대로 쓴다.** 새 색·새 아이콘·새 칩 모양을 만들지 않는다(UI4).

    **아래 셋은 출력 규칙까지 못박는다**(santa R5 B0·B1, R4 B2). 앞선 판은 "새 데이터를 읽되 기존 토큰을 쓴다" 까지만 적었는데, **그 셋이 전부 UI15 를 깨는 자리이고 셋 다 지금 코드가 반대로 하고 있다.** 읽으라고만 적으면 구현자마다 다른 화면이 나오고 Acceptance 가 어느 쪽이 옳은지 가리지 못한다.

    1. **패널 메타는 관문 날짜를 말한다.** `createTodoItem()`(`newtab.js:4198`)은 지금 `event.startDate !== event.endDate` 일 때 `formatShortDate(startDate) – formatShortDate(endDate)` 를 메타에 넣는다 — **연속 범위다.** 그대로 두면 월·수 관문 이벤트에서 **그리드는 화요일을 비우는데 패널은 화요일을 포함한 범위로 말한다.** 그리드와 패널이 같은 이벤트를 두고 다른 답을 내는 것이 DD32 가 막으려던 결함이고, 여기서는 UI15 의 헤드라인 결과가 패널에서 되살아난다. **바꾼다** — 살아 있는 관문(`status !== 'dropped'`)의 `planned` 를 오름차순으로 `formatShortDate` 해 `·` 로 잇는다. 관문이 하나면 메타에 날짜를 넣지 않는다(폭 없는 항목이 지금도 날짜 메타를 안 내는 것과 같은 규칙이다). **`.calendar-todo-meta` 스팬을 그대로 쓴다** — 새 요소도 새 클래스도 만들지 않는다. **살아 있는 관문이 하나도 없으면(전부 `dropped`) `dropped` 관문의 날짜를 같은 규칙으로 열거한다**(santa R7 B2 — 앞선 판은 "살아 있는 관문" 만 적고 0개인 경우를 정하지 않아, 같은 입력에서 구현자마다 빈 메타 · 옛 연속 범위 · 숨김이 갈렸다). 전부 `dropped` 여도 **DD31 이 그 날짜의 셀 점유를 남기므로**, 패널이 날짜를 비우면 그리드는 차 있는데 패널은 비어 보여 DD32 의 불변식이 그 입력에서만 깨진다. 마감이 없다는 사실은 `getEventDueState()` 가 `''` 를 돌려주는 것으로 이미 표현되고(전반부 DD5a), 메타는 **어디에 서 있는가**만 말한다
    2. **칩의 마감 상태는 셀마다 정한다.** `createChips()`(`newtab.js:4135`)는 지금 `const dueState = this.getEventDueState(event)` 를 **이벤트당 한 번** 계산해 그 이벤트의 **모든 칩**에 같은 `is-due-*` 를 붙인다. DD31 이 `dropped` 관문의 날짜도 점유에 남기므로, 살아 있는 종단 관문이 지연인 이벤트에서는 **"안 하기로 한 날"의 칩에도 지연색이 붙는다** — 사용자는 범위축소를 지연으로 읽고, PRD 가 M2 에 요구한 "조기·지연·범위축소가 **구분되어** 남는다" 가 화면에서 다시 합쳐진다. **바꾼다** — 그 날짜의 관문이 **전부 `dropped`** 이면 그 칩에는 `is-due-*` 를 붙이지 않는다. 하나라도 살아 있으면 지금처럼 이벤트의 마감 상태를 붙인다. **`dropped` 를 어떻게 보이게 할지는 정하지 않는다** — 새 시각 언어는 M3 의 몫이고(UI4), 이 플랜이 하는 것은 **틀린 상태를 붙이지 않는 것**까지다.

       **셀과 aria-label 도 같은 규칙을 탄다 — 칩만 고치면 절반만 고친 것이다**(santa R6 B0). `createDayCell()`(`newtab.js:4062`)은 칩과 **별도 경로로** `const dueState = this.getCellDueState(dayEvents)` 를 불러 셀에 `is-due-{dueState}` 를 붙이고 `DUE_STATE_LABELS[dueState]` 를 `aria-label` 에 넣는다. 그리고 `getCellDueState(dayEvents)`(`newtab.js:3945`)는 그 날의 이벤트마다 `getEventDueState(event)` 를 불러 가장 급한 것을 고르는데 — **날짜를 받지 않으므로 그 이벤트가 그 날에 왜 서 있는지(살아 있는 관문인지 `dropped` 인지)를 알 수 없다.** 칩에서 지운 지연색이 **셀 배경과 스크린리더 문구로 그대로 되돌아온다.** **바꾼다** — 서명을 `getCellDueState(dayEvents, dateKey)` 로 넓혀 날짜를 함께 받고, **그 날짜의 관문이 전부 `dropped` 인 이벤트는 집계에서 건너뛴다.** 호출부(`createDayCell()`)가 그 셀의 `dateKey` 를 넘긴다. 살아 있는 관문이 하나라도 있는 이벤트는 지금처럼 집계된다
    3. **프로젝트 이름의 자리를 실제 DOM 으로 적는다.** 앞선 판은 "기존 뱃지 자리에 이름만" 이라고 적었는데 **`createTodoItem()` 에는 프로젝트 뱃지 자리가 없다** — 제목 · 메타 · 메모 · 편집 · 삭제뿐이다(`newtab.js:4198` 이하). 없는 자리를 가리키는 지시는 구현자마다 다른 곳에 넣거나 새 뱃지를 만들거나 생략하게 만든다. **정한다** — 프로젝트 이름은 **`.calendar-todo-meta` 의 첫 항목**으로 들어간다(위 1 의 관문 날짜 앞). 새 요소도 새 클래스도 만들지 않는다. `projectId` 가 `null`(무소속)이면 **아무것도 넣지 않는다** — 무소속이 정상이고 그것을 따로 표시하지 않는 것이 UI8 이다
  - 겹침 경고를 만들지 않고 부하 표시도 하지 않는다(UI5 — M3의 몫)
- **Mirror**: `newtab.js:3960` `render()`의 호출 순서와 `4096` `createDayCell()`의 aria-label 구성
- **Validate**: 시계 모드 경로 `snapshot()` diff 0(UI13). **달력 경로의 기하 diff 0은 이 플랜에서 요구하지 않는다** — 점유가 바뀌면 칩이 붙는 셀이 달라지고 그것이 이 플랜의 목적이다.

  **위 규칙 셋을 육안에만 맡기지 않는다 — 셋 다 하네스 단언으로 내린다**(L2 test, id=test-m2·m3·m5). 앞선 판은 셋을 전부 Acceptance 의 `[사람]` 으로만 두었는데, **바로 위 문장이 달력 경로의 기하 diff 0 을 요구하지 않는다고 적었으므로** `snapshot()` 도 그것들을 잡지 못한다(게다가 `snapshot()` 은 색·문구·칩 형태를 담지 않는다 — Patterns to Mirror). 그 결과가 **렌더 함수 여섯을 고치는 Task 인데 기계 판정이 하나도 없는 상태**였고, 구현자가 규칙 1~3 을 통째로 빼먹어도 하네스는 초록으로 통과한다.

  **새 함수를 만들지 않고 Task 1 의 `runCalendarOccupancyCases(collector)` 안에 잇는다** — 고정 입력이 이미 거기 있고, 함수를 늘리면 Validation 2 의 존재·배선 검사와 Acceptance 의 수까지 함께 흔들린다.

  **그 선택이 만드는 구멍을 여기서 막는다 — 표식 셋을 단다**(L2 test HIGH). 한 함수에 넣기로 했으므로 Validation 2 의 함수 존재·배선 검사는 **점유 단언 다섯만 쓰고 함수를 닫은 구현도 그대로 통과시킨다.** 플랜 스스로 Task 1 쪽에 그 실패 모양을 적어 두었지만 적어 둔 것은 검사가 아니다. 그래서 `DD31-FIXTURE` 와 **같은 형태**의 표식을 아래 셋에 단다:

  - 규칙 1 의 단언 줄 끝에 `// TASK2-RULE-1`
  - 규칙 2 의 단언 줄 끝에 `// TASK2-RULE-2`
  - 규칙 3 의 단언 줄 끝에 `// TASK2-RULE-3`

  자리 규칙도 같다 — **머리말 주석에 몰아 적지 않고, 여러 줄에 걸친 단언의 중간 줄에 붙이지 않는다.** Validation 2 가 `runCalendarOccupancyCases()` **본문 안에서** 셋을 **각각** 찾고(줄 수 합계가 아니라 세 토큰의 개별 존재다 — 합계만 세면 `TASK2-RULE-1` 셋으로도 통과한다), 하나라도 없으면 죽는다. 표식이 단언의 **내용**을 증명하지는 않는다. 잡는 것은 "Task 2 의 셋을 통째로 빼먹고도 하네스가 초록인" 실패 모양 하나이고, 그것이 지금 유일하게 열려 있는 구멍이다.

  1. **패널 메타가 관문 날짜다**(규칙 1) — 1번 고정 입력(`today-3`·`today`)에서 `today` 를 선택해 패널을 그린 뒤 그 항목의 `.calendar-todo-meta` 텍스트를 본다. **두 가지를 함께 단언해야 옛 구현과 갈린다**: (a) `formatShortDate(today-3)` 와 `formatShortDate(today)` 를 **둘 다** 담는다, (b) **` – ` 를 담지 않는다.** 옛 경로는 `` `${formatShortDate(startDate)} – ${formatShortDate(endDate)}` ``(`newtab.js:4223`)라 **양 끝 날짜가 새 규칙과 똑같이 나온다** — (a) 만 보면 아무것도 안 고쳐도 통과한다. 가르는 것은 **구분자**다(새 규칙은 `·` 로 잇는다)
  2. **`dropped` 날짜에 마감 상태가 붙지 않는다 — 칩·셀·`aria-label` 셋 다**(규칙 2) — 살아 있는 종단 관문이 지연이고 그보다 늦은 관문이 `dropped` 인 이벤트를 하나 두고, 그 `dropped` 날짜 셀에서 (a) `.calendar-chip[class*="is-due-"]` 가 0개, (b) 셀 자신의 `classList` 에 `is-due-` 로 시작하는 토큰이 없음, (c) `aria-label` 이 `'지연'`(`DUE_STATE_LABELS.overdue`, `newtab.js:107`)을 담지 않음을 단언한다. **(b)·(c) 는 서명 변경의 *출력* 증거다** — 서명을 안 넓히면 그 함수가 날짜를 모르므로 여기서 죽는다. **다만 출력 증거만으로 서명이 반증되지는 않는다**(L2 test, id=test-m3): 구현자가 `getCellDueState()` 를 그대로 두고 호출부(`createDayCell()`)에서 `dropped` 인 이벤트를 미리 걸러 넘겨도 (b)·(c) 는 통과한다. **그것이 나쁜 구현인 것은 아니다** — 같은 불변식을 지킨다. 그러므로 둘을 가른다: 화면 정합은 (b)·(c) 가 보고, **서명 자체는 Validation 2 의 한 줄이 본다.** 플랜이 서명을 지정한 이상 그 지정이 지켜졌는지도 기계가 봐야 하고, 안 그러면 "유일한 기계 증거" 라는 앞선 판의 주장 자체가 참이 아니다
  3. **프로젝트 이름이 `.calendar-todo-meta` 의 첫 항목이다**(규칙 3) — 프로젝트에 속한 이벤트를 하나 넣고 그 항목의 `.calendar-todo-meta` 텍스트가 **프로젝트 이름으로 시작하는지**(`startsWith`) 단언한다. 메타는 지금도 `meta.join(' · ')` 한 줄 `textContent` 이므로(`newtab.js:4227`~`4231`) 자식 노드가 아니라 **텍스트의 첫 조각**이 판정 대상이다. 그리고 `projectId` 가 `null` 인 이벤트에서는 그 이름이 **들어가지 않는지**도 함께 본다(UI8 — 무소속을 따로 표시하지 않는다)

  **`collector.add('occupancy/…')` 로 값도 함께 남긴다** — 단언은 참/거짓만 남기고 봉투에는 아무것도 남기지 않으므로, 다음 회귀에서 "무엇이 어떻게 달랐는가"를 볼 수 없다(`test/positioning.smoke.js:559` `migration-v3/01-promote` 가 의미를 도메인 값으로 담는 관용구다). 이 셋이 더하는 봉투 키는 Task 4 의 허용 diff (a) 에 해당한다.


  **규칙 셋의 단언도 코드로 적는다**(L2 test MEDIUM · invariant HIGH, 이 판에서 더함). 위 셋의 산문은 무엇을 볼지를 말하지만 **무엇과 비교할지**를 말하지 않았고, 그래서 표식이 `assert(` 를 담아도 어길 계약이 없었다.

  ```js
  // 규칙 1 — 패널 메타가 관문 날짜다. (a) 두 날짜를 담고 (b) 범위 구분자를 **안** 담는다.
  // (b) 가 가르는 자리다: 옛 경로 `${formatShortDate(start)} – ${formatShortDate(end)}`
  // (newtab.js:4223)는 양 끝 날짜가 새 규칙과 똑같이 나오므로 (a) 만으로는 안 갈린다.
  calendar.selectDate(calendar.todayKey);
  const meta1 = frameWindow.document.querySelector('.calendar-todo-meta').textContent;
  assert(
    meta1.includes(frameWindow.formatShortDate(f1.gateA)) &&
      meta1.includes(frameWindow.formatShortDate(f1.gateB)) &&
      !meta1.includes(' – '),
    '패널 메타가 관문 날짜 열거가 아니라 연속 범위다'
  ); // TASK2-RULE-1

  // 규칙 2 — dropped 날짜에 마감 상태가 안 붙는다: 칩 · 셀 · aria-label 셋 다.
  const droppedCell = frameWindow.document.querySelector('.calendar-day[data-date="' + f6.droppedKey + '"]');
  assert(
    droppedCell.querySelectorAll('.calendar-chip[class*="is-due-"]').length === 0 &&
      !Array.from(droppedCell.classList).some((c) => c.startsWith('is-due-')) &&
      !(droppedCell.getAttribute('aria-label') || '').includes('지연'),
    'dropped 관문 날짜에 지연 상태가 붙었다 — 칩/셀/aria-label 중 하나가 남았다'
  ); // TASK2-RULE-2

  // 규칙 3 — 프로젝트 이름이 .calendar-todo-meta 의 **첫 조각**이고, 무소속에는 없다.
  calendar.selectDate(f7.projectEventKey);
  const meta3 = frameWindow.document.querySelector('.calendar-todo-meta').textContent;
  calendar.selectDate(f8.orphanEventKey);
  const metaOrphan = frameWindow.document.querySelector('.calendar-todo-meta').textContent;
  assert(
    meta3.startsWith(f7.projectName) && !metaOrphan.includes(f7.projectName),
    '프로젝트 이름이 메타의 첫 조각이 아니거나, 무소속 항목에 이름이 들어갔다'
  ); // TASK2-RULE-3
  ```

  `f6`·`f7`·`f8` 은 이 규칙들이 요구하는 추가 입력(살아 있는 지연 관문 + 더 늦은 `dropped` 관문을 가진 이벤트 · 프로젝트에 속한 이벤트 · `projectId === null` 인 이벤트)이며 같은 함수 안에서 세운다. **`aria-label` 비교에 `'지연'` 이라는 문자열을 직접 쓰는 이유**는 `DUE_STATE_LABELS`(`newtab.js:107`)가 `const` 라 프레임 전역에 붙지 않기 때문이다 — `CHIP_CAP` 과 같은 사정이고, 같은 드리프트 검사가 받는다(Validation 2-d).
  **UI4 판정만은 여전히 사람이 한다** — 위 셋은 "규칙대로 그렸는가"를 보고, "새 시각 언어를 만들지 않았는가"는 기계가 볼 수단이 없다(Acceptance 의 해당 항목).

### Task 3: 첫 실행 온보딩

- **Action**:

  **만드는 것 — 둘이다.**
  1. `newtab.html`·`newtab.js` 첫 실행 안내 표면
  2. `test/positioning.smoke.js` `runCalendarOnboardingCases(collector)`

  **고치는 것**: `Application.initialize()` — 온보딩 판정을 잇는다.

  **판정식을 여기 통째로 적는다 — DD 를 열지 않아도 구현이 되게 한다**(DD29). 네 항 **전부**에 소유자가 붙어 있고, 서는 자리까지 함께 적는다(L2 architect, id=arch-m1·arch-m2 · L2 security/invariant CRITICAL):

  ```js
  // Application.initialize() 의 새 마지막 문장 —
  // `await this.settingsManager.initialize();` (newtab.js:5506) 바로 다음 줄에 잇는다.
  if (
    this.settingsManager.calendarSettingsLoaded &&
    this.calendarManager.projects.length === 0 &&
    !this.calendarManager.projectsLoadFailed &&
    !this.settingsManager.calendarOnboardingSeen
  ) {
    /* 온보딩 표면을 연다 */
  }
  ```

  이 자리의 `this` 는 `Application` 이고 `projects`·`projectsLoadFailed` 는 **그 클래스에 없다** — 둘 다 `CalendarManager` 의 필드다(santa R6 B1). **셋째·넷째 항도 같은 이유로 `this.settingsManager` 를 붙인다**(id=arch-m1). 자리는 **(a) 이어 붙이기**이고 초기화 순서를 바꾸거나 별도 메서드로 빼지 않는다(DD13, id=arch-m2).

  **첫째 항이 무엇을 막는지는 DD13 이 적는다** — 설정 저장소 읽기 실패(`newtab.js:4587`~`4589` 의 삼킨 `catch`)와 설정 DOM 요소 부재로 인한 조기 `return`(`newtab.js:4341`~`4342`) 둘 다 넷째 항의 필드를 대입하지 못한 채 남기고, `!undefined` 는 참이라 **온보딩이 매 로드마다 다시 뜬다.** 이 항이 그 상태를 "첫 실행 아님" 으로 읽는다.

  **배선 셋을 함께 만든다 — 이것을 빼면 넷째 항이 언제나 `undefined` 라 항을 안 넣은 것과 같다**(DD13):

  - `SettingsManager` **생성자**(`newtab.js:4278` 이하)에 `this.calendarSettingsLoaded = false;` 와 `this.calendarOnboardingSeen = false;` 를 **필드 기본값으로** 둔다. **이것이 `undefined` 를 없애는 유일한 줄이다** — 아래 두 배선은 성공 경로만 다루므로 이 줄이 없으면 실패 경로에서 필드가 여전히 `undefined` 다
  - `SettingsManager.loadSettings()`(`newtab.js:4537`)의 `storage.get([...])` 키 목록에 `'calendarOnboardingSeen'` 을 더하고 `this.calendarOnboardingSeen = result.calendarOnboardingSeen === true;` 로 담은 **바로 다음 줄에 `this.calendarSettingsLoaded = true;`** 를 둔다(`=== true` 가 기본값 `false` 다). **그 `try` 블록 안이어야 한다** — `catch` 나 `finally` 에 두면 읽기 실패에서도 `true` 가 되어 첫째 항이 무력해진다
  - `saveWidgetSetting()`(`newtab.js:4817`) 형태의 `async saveCalendarOnboardingSeen()` 을 더해 `await storage.set({ calendarOnboardingSeen: true })` 와 `this.calendarOnboardingSeen = true` 를 함께 한다

  이름 하나를 받아 프로젝트를 만들고, 건너뛰면 무소속으로 계속 쓴다. **플래그는 만들었을 때와 건너뛰었을 때 둘 다** `true` 로 쓴다 — 셋째 항이 판정식에 없으면 건너뛴 사용자에게 매 초기화마다 다시 뜬다(santa R8 B1). **읽기 실패로 온보딩이 뜨지 않은 경우에는 쓰지 않는다**(DD13 — 그 상태는 첫 실행이 아니다).
- **Mirror**: `newtab.js:985` `applyStorageNotice()` — 상시 표면을 늘리지 않고 필요할 때만 나타난다
- **Validate**: `runCalendarOnboardingCases(collector)` 가 아래 **여섯**을 돌린다. **각 케이스를 세우는 문장의 같은 줄 끝에 `// DD13-CASE <번호>` 를 붙인다** — 형태·자리 규칙은 Task 1 의 `DD31-FIXTURE` 와 같고(머리말에 몰아 적으면 안 되고, 여러 줄 리터럴의 중간 줄에 붙이면 안 된다), Validation 2 가 그 줄 수를 세어 여섯 미만이면 죽는다.

  | # | 상태 | 기대 | 무엇을 잡는가 |
  |---|---|---|---|
  | 1 | 프로젝트 0개 · 설정 읽기 정상 | 온보딩이 **뜬다** | 정상 경로. 이것 없이는 아래 2번이 성립하지 않는다 |
  | 2 | 1번에서 건너뛰기를 누르고 다시 초기화 | **안 뜬다** · `calendarOnboardingSeen === true` | "한 번만" (santa R8 B1) |
  | 3 | `projectsLoadFailed = true` | **안 뜨고** 플래그도 **안 탄다** | 프로젝트 읽기 실패를 첫 실행으로 오인하지 않는다 (DD13) |
  | 4 | **설정 읽기 실패 — `calendarSettingsLoaded === false`** | **안 뜨고** 플래그도 **안 탄다** | **L2 security/invariant CRITICAL 의 반증자.** 첫째 항을 빼거나 생성자 기본값을 안 두면 `!undefined` 가 참이라 여기서만 죽는다 |
  | 5 | 온보딩이 떠 있는 상태(1번) | 밴드 높이·패널 스크롤 **무변** | `test/positioning.smoke.js:1668` `runErrorBannerGeometryCases()` 와 같은 형태 |
  | 6 | **설정 DOM 요소 부재 — `SettingsManager.initialize()` 가 조기 `return`** | `calendarSettingsLoaded === false` (**`undefined` 가 아니다**) · `calendarOnboardingSeen === false` | **DD13 이 이름으로 적은 경로 (2) 의 반증자.** 4번과 다른 것을 잡는다 — 4번은 `loadSettings()` 가 **불렸는데 그 줄에 못 닿은** 경우이고, 6번은 `loadSettings()` 가 **아예 안 불린** 경우다. 생성자 기본값이 없으면 여기서만 `undefined` 가 나온다 |

  **4번을 어떻게 세우는지까지 적는다 — 안 적으면 구현자가 세울 수 없다.** 이 저장소의 하네스는 이미 저장소 실패를 흉내 내는 자리를 갖고 있다(`test/positioning.smoke.js:1612` `runLoadFailureCases()`). 같은 관용구로 `chrome.storage.local.get` 이 던지게 만든 뒤 앱을 초기화하면 `loadSettings()` 의 `try` 가 `this.calendarSettingsLoaded = true;` 에 닿지 못하므로 필드가 생성자 기본값 `false` 로 남는다. **필드를 직접 `false` 로 대입해 세우지 않는다** — 그러면 "생성자 기본값이 있는가" 와 "실패 경로가 그 줄에 안 닿는가" 둘 다 검사에서 빠져 4번이 자기가 잡아야 할 것을 못 잡는다.

  **6번도 세우는 법을 적는다 — 이쪽은 `loadApp()` 을 쓸 수 없기 때문이다**(L2 test HIGH, 이 판에서 더함). `loadApp()`(`test/positioning.smoke.js:154`)은 부팅 끝에 **`SettingsManager` 가 조기 `return` 하지 *않았음*을 기다린다**(`185`~`188` 행의 `waitFor` 가 `settingsManager.clockElement` 를 요구하고, 주석이 "DOM 누락으로 early return 하지 않았는지" 라고 적고 있다). 그 대기를 풀면 **다른 모든 케이스의 전제가 함께 약해지므로 풀지 않는다.** 대신 부팅은 정상으로 하고, 그 프레임 안에서 **두 번째 인스턴스**를 세워 조기 `return` 을 재현한다:

  ```js
  const frameWindow = await loadApp({ widgetType: 'calendar', settingsVersion: 3 }); // DD13-CASE 6
  const app = frameWindow['__newTabApp'];
  frameWindow.document.getElementById('blurToggle').remove();   // 열둘 중 하나만 없어도 4340~4342 가 탄다
  const probe = new (app.settingsManager.constructor)(null, null, app.backgroundManager, app.calendarManager);
  await probe.initialize();                                     // 조기 return — loadSettings() 가 아예 안 불린다
  assert(probe.calendarSettingsLoaded === false, '조기 return 경로에서 calendarSettingsLoaded 가 false 가 아니다 — undefined 면 생성자 기본값이 없는 것이고, !undefined 가 참이라 온보딩이 매 로드마다 다시 뜬다');
  assert(probe.calendarOnboardingSeen === false, '조기 return 경로에서 calendarOnboardingSeen 이 false 가 아니다');
  ```

  **`=== false` 로 보는 것이 요점이다** — `!probe.calendarSettingsLoaded` 로 보면 `undefined` 도 참이라 **이 케이스가 잡아야 할 바로 그 상태를 통과시킨다.** 생성자 인자에 `null` 을 넘겨도 되는 이유는 `initialize()` 가 인자를 쓰기 전에(`setupEventListeners()` 전에) 돌아 나가기 때문이다. **요소를 되돌리지 않는다** — 이 케이스는 자기 프레임을 쓰고 다음 `loadApp()` 이 iframe 을 새로 띄우므로, 되돌리는 줄은 아무것도 지키지 않으면서 "요소가 없는 상태" 라는 이 케이스의 전제만 흐린다. 같은 이유로 **이 프레임에 대고 다른 케이스를 잇지 않는다.**

  **3번·4번·6번은 셋 다 다른 것을 잡는다** — 3번은 `CalendarManager` 쪽 실패, 4번은 `SettingsManager` 의 **읽기** 실패(`loadSettings()` 가 불렸으나 `try` 가 끊긴다), 6번은 `SettingsManager` 의 **초기화** 실패(`loadSettings()` 가 아예 안 불린다). 앞선 판은 3번만 두었고, 그래서 넷째 항이 `undefined` 로 무너지는 경로가 판정을 그대로 빠져나갔다(L2 invariant HIGH "Acceptance criteria for onboarding omit mandatory storage-failure scenario"). 그다음 판은 4번을 더했지만 **DD13 이 이름으로 적은 경로는 둘인데 케이스는 하나뿐이었고**, 그 비대칭이 다시 지적됐다(L2 test HIGH). 주장이 배선보다 넓으면 그것은 이 플랜이 계속 고쳐 온 바로 그 모양이다.

### Task 4: 하네스 배선과 재베이스라인

- **Action**: Task 1·3이 만든 케이스 **둘**(`runCalendarOccupancyCases` · `runCalendarOnboardingCases`)을 `runAll()` 순서에 넣는다.

  재베이스라인 뒤 **`베이스라인 내보내기`를 다시 눌러 파일을 새로 받고** `work-calendar-m2b.baseline.json`을 덮어쓴 다음 뒤쪽 앵커를 뜬다.

  **여기서도 이름을 바꿔야 한다 — Task 0 과 같은 함정이고, 앞선 판은 Task 0 에만 절차를 적었다**(L2 invariant). 내보내기 버튼의 `link.download` 은 여전히 `'work-calendar-m2.baseline.json'` 으로 하드코딩돼 있으므로(Task 0 이 그 이유로 버튼을 고치지 않기로 했다), 두 번째 내려받기도 **전반부의 파일 이름으로 떨어진다.** Task 0 은 그때 대상이 없었지만 **이번에는 있다** — 그래서 여기서는 덮어쓰기가 목적이고, 위험한 것은 저장소 루트의 전반부 파일 쪽이다. 다운로드 자리에서 바로 옮긴다:

  ```sh
  # 재베이스라인을 돌린 뒤. 대상(m2b)은 이미 있으므로 덮어쓰는 것이 맞고,
  # 건드리면 안 되는 것은 저장소 루트의 work-calendar-m2.baseline.json 이다.
  mv -f "$HOME/Downloads/work-calendar-m2.baseline.json" ./work-calendar-m2b.baseline.json \
    || { echo "mv 실패 — 내려받은 경로를 확인한다"; exit 1; }

  # 전반부 파일이 여전히 그대로인지 확인한다 (Validation 3-1 과 같은 명령이다)
  grep 'work-calendar-m2\.baseline\.json' .claude/plans/work-calendar-m2.rebaseline.sha256 \
    | shasum -a 256 -c -   # 또는 sha256sum -c -
  ```

  **Task 0 의 `[ -e ... ] && exit 1` 가드를 여기서는 쓰지 않는다** — 그 가드는 "대상이 이미 있으면 멈춰라"이고 이 자리의 목적은 정확히 그 대상을 덮는 것이다. 대신 `mv -f` 를 쓴다(`mv -n` 은 대상이 있으면 **아무 일도 안 하고 exit 0** 을 주므로 여기서 최악이다 — Task 0 이 같은 이유로 그것을 금지한다).

  앵커는 그다음에 뜬다 — `shasum -a 256 test/positioning.smoke.js work-calendar-m2b.baseline.json > .claude/plans/work-calendar-m2b.rebaseline.sha256` (`shasum` 이 없으면 `sha256sum` 으로 같은 인자를 준다 — santa R2 B0). 순서가 계약이다: (1) 재베이스라인 → (2) 재내보내기·덮어쓰기 → (3) 해시 생성. 재내보내기를 빠뜨리면 해시가 "옛 파일이 안 바뀌었다"만 증명하고, 비교에 실제로 쓰이는 베이스라인과 커밋된 파일이 같은지는 증명하지 않는다.
- **Mirror**: `test/positioning.smoke.js:1734` `runAll()`의 실행 순서와 저장소 복원 규약
- **Validate**: 단언 실패 0건. 시계 경로 diff 0.

  **"설명되는 diff"를 열거로 못박는다.** 허용되는 diff는 **넷뿐**이다: (a) 새 케이스가 추가한 **새 키**(`occupancy/*` · `onboarding/*`), (b) 기존 케이스의 도메인 투영에 **새 필드가 늘어난 것**, (c) 필드 목록을 문자열로 담은 값이 그만큼 길어진 것, (d) **DD31이 요구하는 점유 축소 — 아래에 케이스 이름과 기대값까지 적는다.**

  - `range/01-month-boundary`(`test/positioning.smoke.js:1261-1285`) — 입력이 `{ startDate: '2026-01-28', endDate: '2026-02-03' }` 한 건이므로 관문은 그 **양 끝 둘**이 되고 사이 나흘은 점유에서 빠진다.
    - `januaryChipDates`: `['2026-01-28','2026-01-29','2026-01-30','2026-01-31','2026-02-01','2026-02-02','2026-02-03']` → **`['2026-01-28','2026-02-03']`**
    - `februaryChipDates`: `['2026-02-01','2026-02-02','2026-02-03']` → **`['2026-02-03']`**
    - `distinctDates`(둘의 합집합을 정렬한 **배열**이지 개수가 아니다): 7원소 → **`['2026-01-28','2026-02-03']`**
    - `visibleInBothMonths`: `true` → **`true`** — 둘 다 비지 않으므로 안 바뀐다. **값이 안 바뀌는 것도 적어 둔다** — 적지 않으면 그것이 움직였을 때 그게 (d)인지 아닌지를 판단의 문제로 내린다

    **앞선 판은 `januaryChipDates`의 현재값을 넯으로 적고 전환 후 값을 `['2026-01-28']`로 적었는데, 둘 다 틀렸다**(2026-08-23 실측 — 커밋된 `work-calendar-m2.baseline.json` 의 `range/01-month-boundary` 항목이 근거다). **1월 뷰의 42칸 창은 1월에서 끝나지 않는다** — 2026년 1월 그리드는 2025-12-28(일)에서 시작해 2026-02-07까지 닿으므로 **2/1~2/3 셀이 1월 뷰 안에 함께 그려진다.** 그래서 현재 `januaryChipDates`는 넷이 아니라 **일곱**이고, 전환 뒤에도 1월 뷰가 2/3 관문을 계속 보므로 **둘**이 남는다. (2월 뷰는 반대다 — 2026-02-01이 일요일이라 창이 정확히 2/1에서 시작해 1월 날짜를 하나도 담지 않고, 그것이 `februaryChipDates`가 셈이였던 이유다.) **틀린 기대값은 없는 것보다 나쁘다** — 이 세 값은 사람이 재베이스라인 앞에 맞춤 보는 유일한 기준이므로, 틀린 값을 적어 두면 **올바른 구현이 "원인을 찾으라"에 걸리고** 사람은 없는 버그를 뒤진다

    **그리고 이 세 값이 어떻게 나왔는지를 여기서 다시 유도한다 — 근거 파일이 이 트리에 없기 때문이다**(L2 test HIGH, 이 판에서 더함). 위 문단은 근거로 커밋된 `work-calendar-m2.baseline.json` 을 들었는데 **그 파일은 이 작업 트리에 부재하다**(실측 2026-08-25 · Task 0 · Validation 3-1 이 같은 사실 위에 서 있다). 그러면 기대값의 근거가 확인 불가가 되고, 그것은 이 플랜이 인용 드리프트를 경계하는 것과 같은 문제다. **그래서 파일 없이도 다시 셀 수 있게 적는다** — 근거는 `createDayCell()` 앞의 창 계산 한 줄이다(`newtab.js:4032` `new Date(this.viewYear, this.viewMonth, 1 - firstOfMonth.getDay())` → 그 달 1일이 속한 주의 **일요일**에서 시작해 42칸).

    - **1월 뷰**: 2026-01-01 은 **목요일**(`getDay() === 4`)이므로 창은 `1 - 4 = -3` 일, 곧 **2025-12-28(일)** 에서 시작해 41일 뒤 **2026-02-07** 까지다. 그러므로 2/1~2/3 이 1월 뷰 안에 함께 그려진다 → 전환 전 `januaryChipDates` 는 1/28~2/3 **일곱**, 전환 뒤에는 관문 둘만 남아 `[2026-01-28, 2026-02-03]` **둘**
    - **2월 뷰**: 2026-02-01 은 **일요일**(`getDay() === 0`)이므로 창이 정확히 **2026-02-01** 에서 시작해 **2026-03-14** 까지다 — 1월 날짜를 하나도 담지 않는다 → 전환 전 `februaryChipDates` 는 2/1~2/3 **셋**, 전환 뒤에는 그 창 안의 관문이 2/3 하나뿐이라 **`[2026-02-03]`**
    - `distinctDates` 는 둘의 합집합이므로 `[2026-01-28, 2026-02-03]`

    (실측 2026-08-26: 위 요일과 창 양 끝을 `new Date(2026,0,1).getDay() === 4` · `new Date(2026,1,1).getDay() === 0` 로 확인했고, 같은 산술이 `newtab.js:4032` 에 있다. **이 유도는 절대 날짜만 쓰므로 돌리는 날에 흔들리지 않는다.**)
  - 위 셋 **말고** 기존 키의 기존 필드 값이 바뀌면 그것은 (d)가 아니다. **DD31의 파급이 여기서 끝난다는 것이 이 열거의 주장이고**, 다른 케이스에서 값이 움직였다면 점유 말고 다른 것이 함께 바뀐 것이므로 재베이스라인하지 말고 원인을 찾는다
  - **그 주장은 근거가 있고, 근거를 여기 적어 재확인할 수 있게 둔다**(2026-08-23 `7a24204` 기준 실측). 점유가 바뀌면 값이 움직이는 자리는 **셀 점유를 읽는 케이스뿐**이고, 하네스 전체에서 그런 케이스는 **하나다** — `grep -n '\.calendar-chip\|\.calendar-day' test/positioning.smoke.js` 가 `chipDatesFor`(`test/positioning.smoke.js:1261-1266`) **한 곳에만** 걸리며 그것이 `range/01-month-boundary` 전용 도우미다. 그리고 `snapshot()`(`test/positioning.smoke.js:200`)은 `#clock`·`#calendarWidget`·`.search-container` **세 컨테이너의 기하만** 담고 날짜 셀을 담지 않으므로, 칩이 붙는 셀이 달라져도 스냅샷 축은 움직이지 않는다(밴드 높이가 고정이므로 컨테이너 rect 도 그대로다). **재베이스라인 전에 이 두 명령을 다시 돌린다** — 케이스가 늘어 셀 점유를 읽는 자리가 둘이 되면 이 열거가 낡고, 그때는 (d)에 그 케이스의 기대값을 함께 적어야 한다
  - **순서를 빼먹은 것은 기계가 잡는다 — 절차 규칙이라고 적고 끝내지 않는다.** 위 (2) 재내보내기를 빠뜨리면 봉투 안의 `baseline` 에 새 케이스 키가 없으므로, 그 하나만 보면 된다. 해시를 뜨기 전에 돌린다:

    ```sh
    node -e 'const b=require("./work-calendar-m2b.baseline.json").baseline;
      const k=Object.keys(b).filter(x=>/^(occupancy|onboarding)\//.test(x));
      const occ=k.filter(x=>/^occupancy//.test(x)), onb=k.filter(x=>/^onboarding//.test(x));
      if(occ.length===0||onb.length===0){console.error("재내보내기가 반쪽이다 — occupancy/*="+occ.length+"개 onboarding/*="+onb.length+"개. 양쪽이 다 있어야 한다. Validation 3-2b 와 같은 검사다 — 한 자리만 고치면 쌍둥이가 남는다.");process.exit(1)}
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

**승인 시점에 돌 수 있는 것은 1 · 1-b · 1-c 다.** 2·2-b·2-c·2-d·3번은 구현이 있어야 돌고, 4번은 브라우저가 있어야 돈다. **1-c 는 이 플랜의 *전제*를 보므로 구현 전에 도는 것이 맞고**(전반부가 `gates[]`·`projectId` 를 실제로 만들었는가), 1-b 는 구현 전 전용이다(Task 1~3 이 `newtab.js` 를 고치면 줄이 밀리는 것이 정상이다).

```sh
# 1. 문법 (승인 시점에도 돈다)
node --check newtab.js
node --check test/positioning.smoke.js

# 1-b. 인용 줄 드리프트 — **구현 전에만 돈다** (L2 test LOW).
#    Patterns to Mirror 가 이 명령을 산문에만 두어 아무도 안 돌렸다. 여기로 내린다.
#    다만 **끝 상태 게이트로 쓰지 않는다** — Task 1~3 이 newtab.js 를 고치면 줄이 밀리는 것이
#    정상이고, 밀린 뒤에 이것을 게이트로 쓰면 **옳은 구현이 반드시 여기서 죽는다.**
#    아래 3-2 가 자기 baseline.sha256 을 끝 상태 게이트로 안 쓰는 것과 **같은 이유**다.
#    구현 여부는 Validation 2 가 요구하는 새 함수의 존재로 가른다.
if grep -q "runCalendarOccupancyCases" test/positioning.smoke.js; then
  echo "NOTE: 구현이 이미 있다 — 인용 줄 드리프트 검사는 구현 전 전용이므로 건너뛴다"
else
  sed -n '3321p' newtab.js | grep -q 'rebuildIndex(' || { echo "DRIFT: newtab.js:3321 이 rebuildIndex 가 아니다 — Patterns to Mirror 의 인용이 밀렸다"; exit 1; }
  sed -n '3353p' newtab.js | grep -q 'getEventsForDate(' || { echo "DRIFT: newtab.js:3353 이 getEventsForDate 가 아니다"; exit 1; }
  sed -n '3945p' newtab.js | grep -q 'getCellDueState(' || { echo "DRIFT: newtab.js:3945 이 getCellDueState 가 아니다"; exit 1; }
  sed -n '1277p' test/positioning.smoke.js | grep -q 'range/01-month-boundary' || { echo "DRIFT: test/positioning.smoke.js:1277 이 range/01-month-boundary 가 아니다"; exit 1; }
  sed -n '1734p' test/positioning.smoke.js | grep -q 'runAll(' || { echo "DRIFT: test/positioning.smoke.js:1734 이 runAll 이 아니다"; exit 1; }
fi

# 1-c. **전반부(M2a)의 데이터 모델이 실제로 있는가 — 승인 시점에 돈다** (L2 architect HIGH, 이 판에서 더함).
#    이 플랜은 `event.gates[].planned` 와 `event.projectId` 가 이미 있다고 **전제**하는데,
#    그 전제를 보는 검사가 하나도 없었다. Task 0 의 `meta.assertFailures === 0` 은 전반부의
#    **단언이 통과했다**는 것만 증명하지 필드가 생겼다는 것을 증명하지 않는다 — 전반부가
#    렌더 출력만 단언했다면 필드 없이도 0건이 나온다. 그러면 Task 1 이 `event.gates` 를 처음
#    건드리는 자리에서 `undefined` 를 만나고, 그 시점은 이미 비가역 지점을 지난 뒤다.
#    **이 검사는 1번과 함께 승인 시점에 돈다** — 전제는 구현 전에 성립해야 하고, 실제로 성립한다
#    (실측 2026-08-26 `7a24204`: `createCalendarGate` 선언 1곳 · `createCalendarEvent` 본문에
#     `gates` 12회 · `projectId` 1회).
grep -q '^function createCalendarGate(' newtab.js \
  || { echo "PREREQ: createCalendarGate() 가 없다 — 전반부(M2a)가 끝나지 않았거나 다른 트리다. 이 플랜은 gates[] 가 있다고 전제한다"; exit 1; }
cce_body() { awk '/^function createCalendarEvent\(/{f=1} f{print; if (/^\}[[:space:]]*$/) exit}' newtab.js; }
[ "$(cce_body | wc -l)" -gt 5 ] || { echo "PREREQ: createCalendarEvent() 본문을 뜨지 못했다"; exit 1; }
cce_body | grep -q 'gates' \
  || { echo "PREREQ: createCalendarEvent() 가 gates 를 만들지 않는다 — DD31·DD32 가 읽을 것이 없다"; exit 1; }
cce_body | grep -q 'projectId' \
  || { echo "PREREQ: createCalendarEvent() 가 projectId 를 만들지 않는다 — Task 2 규칙 3 이 읽을 것이 없다"; exit 1; }
#    **그리고 내보내기 버튼의 파일명이 Task 0·4 가 전제하는 그 이름인가** (L2 invariant HIGH, 이 판에서 더함).
#    Task 0 은 "버튼이 'work-calendar-m2.baseline.json' 을 내려준다" 를 전제로 **다운로드 자리에서
#    새 이름으로 옮기는** 절차를 세웠다. 그 이름이 리팩터링이나 오타로 바뀌면 mv 가 없는 파일을
#    가리켜 조용히 실패하고, 되돌릴 수 없는 자리의 절차가 전제부터 무너진다. 전제이므로 승인 시점에 본다.
#    (실측 2026-08-26: test/positioning.smoke.js:2000 이 그 이름을 하드코딩하고 있다.)
grep -qF "link.download = 'work-calendar-m2.baseline.json';" test/positioning.smoke.js \
  || { echo "PREREQ: 내보내기 버튼의 link.download 가 'work-calendar-m2.baseline.json' 이 아니다 — Task 0·4 의 이름 바꾸기 절차가 그 이름을 전제한다"; exit 1; }

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

#    **본문 범위 헬퍼를 여기서 한 번 정한다** — 아래 표식 검사 셋이 전부 이것을 쓴다.
occ() { sed -n '/^async function runCalendarOccupancyCases(/,/^}/p' test/positioning.smoke.js; }
[ "$(occ | wc -l)" -gt 5 ] || { echo "runCalendarOccupancyCases() 본문을 뜨지 못했다 — 선언 형태를 확인하라"; exit 1; }

#    고정 입력 표식 — 다섯을 센다 (5번은 santa R0 B2 가 더한 같은 날 관문 둘 케이스).
#    **범위를 본문으로 좁힌다** (L2 invariant MEDIUM, 이 판에서 고침). 앞선 판은 파일 전체를 셌고,
#    그러면 **머리말 주석에 표식 다섯을 몰아 적은 실행이 통과한다** — 아래 TASK2-RULE 검사가 범위를
#    좁히는 것과 **같은 이유**이고 같은 헬퍼를 쓴다.
#    표식이 값의 정확성까지 증명하지는 않는다 — 그 한계는 백로그 id=test-fixture-count-limit 이고
#    값은 하네스 단언 다섯이 본다.
#    **표식이 붙은 줄이 코드 줄이어야 한다** (L2 test MEDIUM·HIGH, 이 판에서 좁힘). 앞선 판은
#    본문 안이기만 하면 셌으므로 **주석만 있는 줄에 표식 다섯을 적어도 통과했다** — 자리 규칙을
#    산문으로만 적어 둔 것은 검사가 아니다. 표식 앞에 코드가 있는 줄만 센다.
F=$(occ | grep "DD31-FIXTURE" | grep -v '^[[:space:]]*//' | wc -l)
[ "$F" -ge 5 ] || { echo "runCalendarOccupancyCases() 본문 안의 DD31 고정 입력 표식이 ${F}개 — Task 1이 요구하는 다섯을 못 채운다"; exit 1; }

#    온보딩 케이스 표식 — 다섯을 센다. 4번이 설정 읽기 실패다 (Task 3 Validate).
D=$(grep "DD13-CASE" test/positioning.smoke.js | grep -v '^[[:space:]]*//' | wc -l)
[ "$D" -ge 6 ] || { echo "DD13 온보딩 케이스 표식이 ${D}개 — Task 3이 요구하는 여섯을 못 채운다(4번은 설정 읽기 실패, 6번은 설정 DOM 부재로 인한 조기 return — DD13 이 이름으로 적은 경로 둘이 각각 하나씩이다)"; exit 1; }

#    Task 2 렌더 규칙 표식 — 셋을 **각각** 본다 (L2 test HIGH).
#    합계를 세지 않는다: TASK2-RULE-1 이 셋 있어도 합계는 셋이라 통과한다. 토큰별로 본다.
#    범위는 위 occ() 로 이미 좁혀 두었다 — 안 좁히면 파일 어딘가의 머리말 주석이 통과시킨다
#    (runAll() 배선 검사가 범위를 좁히는 것과 같은 이유다).
for r in 1 2 3; do
  occ | grep "TASK2-RULE-$r" | grep -q 'assert(' || { echo "MISSING in runCalendarOccupancyCases(): TASK2-RULE-$r — Task 2 규칙 ${r} 단언이 없다(표식이 있어도 그 줄이 assert( 를 담지 않으면 단언이 아니다)"; exit 1; }
done

#    그리드-패널 일치 단언 둘 — 1번·5번 고정 입력에서 본다 (L2 test LOW, 이 판에서 더함).
#    앞선 판은 이 둘을 Task 1 산문에만 두어 **몇 개가 요구되는지가 흐렸고**(다섯인가 일곱인가),
#    판정자는 Acceptance 의 `[사람]` 뿐이었다. DD31-FIXTURE·TASK2-RULE 과 **같은 형태의 표식**
#    `DD32-CONSISTENCY-1`·`DD32-CONSISTENCY-5` 를 달고 토큰별로 본다. 합계를 세지 않는 이유는
#    바로 위 TASK2-RULE 과 같다.
for c in 1 5; do
  occ | grep "DD32-CONSISTENCY-$c" | grep -q 'assert(' || { echo "MISSING in runCalendarOccupancyCases(): DD32-CONSISTENCY-$c — ${c}번 고정 입력의 그리드-패널 일치 단언이 없다(표식 줄이 assert( 를 담아야 한다)"; exit 1; }
done

#    서명 검사 — getCellDueState 가 날짜를 받도록 넓혀졌는가 (L2 test, id=test-m3).
#    Task 2 규칙 2 의 단언 (b)·(c) 는 **출력**을 보므로 호출부에서 미리 거르는 구현도 통과한다.
#    플랜이 서명을 지정했으므로 서명 자체를 보는 줄이 하나 필요하다.
#    **한 줄 정규식으로 보지 않는다** (L2 test MEDIUM · invariant MEDIUM, 이 판에서 고침).
#    앞선 판은 `[(][^),]*,[^)]*[)][[:space:]]*[{]` 로 **한 줄에 다 들어간 서명만** 봤고 둘째 인자의
#    **이름을 보지 않았다.** 결과가 둘이고 방향이 서로 반대다 —
#    (a) 서명을 여러 줄로 쓴 **옳은 구현이 여기서 죽고**(false negative — 이 플랜이 다른 자리에서
#        계속 경계하는 "옳은 구현이 게이트에서 죽는" 모양이다),
#    (b) `getCellDueState(dayEvents, d)` 처럼 이름만 다른 구현은 **통과한다.** 규칙 2 의 단언과
#        호출부가 `dateKey` 라는 이름에 기대므로 이름이 계약의 일부다.
#    선언 줄부터 `) {` 를 만날 때까지 접어 한 줄로 만든 뒤 그것을 본다.
#    (실측 2026-08-26: 현행 1인자 거부 · 한 줄 2인자 통과 · 여러 줄 2인자 통과 · 이름 다르면 거부.)
getcell_sig() {
  awk '/^[[:space:]]*getCellDueState[[:space:]]*\(/{buf=""; for(;;){buf=buf " " $0; if (buf ~ /\)[[:space:]]*\{/) break; if ((getline)<=0) break} print buf}' newtab.js
}
getcell_sig | grep -qE 'getCellDueState[[:space:]]*[(][^)]*,[[:space:]]*dateKey[[:space:]]*[)]' \
  || { echo "getCellDueState 의 서명이 (dayEvents, dateKey) 가 아니다 — 인자가 하나이거나 둘째 인자 이름이 dateKey 가 아니다(규칙 2 단언과 호출부가 그 이름에 기댄다)"; exit 1; }

#    **서명이 넓어진 것과 그 인자를 *쓰는* 것은 다른 주장이다 — 본문도 본다** (L2 test LOW, 이 판에서 더함).
#    위 검사는 선언만 보므로 `getCellDueState(dayEvents, dateKey)` 로 넓혀 놓고 본문에서 `dateKey` 를
#    한 번도 안 쓰는 구현이 통과한다. 그 구현은 규칙 2 가 요구하는 "그 날짜의 관문이 전부 dropped 인
#    이벤트를 집계에서 건너뛴다" 를 할 수가 없다. **선언 줄을 뺀 본문**에서 그 이름을 찾는다 —
#    `) {` 를 만난 다음 줄부터 보므로 서명이 여러 줄이어도 맞는다.
#    (반증 실측 2026-08-26: 서명만 넓힌 픽스처 거부 · 본문에서 쓰는 픽스처 통과.)
getcell_body() { awk '/^  getCellDueState[[:space:]]*\(/{f=1} f{print; if (/^  \}[[:space:]]*$/) exit}' newtab.js; }
[ "$(getcell_body | wc -l)" -gt 2 ] || { echo "getCellDueState 본문을 뜨지 못했다 — 선언 형태를 확인하라"; exit 1; }
getcell_body | awk 'p{print} /\)[[:space:]]*\{/{p=1}' | grep -q 'dateKey' \
  || { echo "getCellDueState 본문이 dateKey 를 쓰지 않는다 — 서명만 넓히고 날짜를 안 보면 규칙 2 를 할 수 없다"; exit 1; }

# 2-c. **DD32 의 두 자리 중 패널 쪽이 실제로 바뀌었는가** (L2 test MEDIUM, 이 판에서 더함).
#    DD32 는 이 플랜의 핵심 불변식(그리드와 패널이 같은 날짜에 같은 답을 낸다)인데 **기계 판정이
#    하나도 없었다.** 그리드 쪽(`rebuildIndex()`)은 3-2c 가 봉투로 보고, 패널 쪽
#    (`getEventsForDate()`)은 Task 1 의 일치 단언이 보는데 그것은 브라우저 실행이라 `[사람]` 이다.
#    그래서 `rebuildIndex()` 만 고치고 `getEventsForDate()` 를 옛 범위 비교로 둔 구현이 2번·3번
#    검사를 전부 통과했다 — DD32 가 막으려는 바로 그 반쪽 구현이다.
#    **두 방향으로 본다**: 관문을 읽는가(있어야 한다)와 범위 비교가 남았는가(없어야 한다).
#    한쪽만 보면 둘을 **함께** 쓰는 구현이 통과하고, 그러면 옛 규칙이 조용히 살아 있는다.
#    (반증 실측 2026-08-26: 현행 거부 · 범위를 남긴 픽스처 거부 · gates 로 바꾼 픽스처 통과.)
gefd_body() { awk '/^  getEventsForDate[[:space:]]*\(/{f=1} f{print; if (/^  \}[[:space:]]*$/) exit}' newtab.js; }
[ "$(gefd_body | wc -l)" -gt 2 ] || { echo "getEventsForDate 본문을 뜨지 못했다 — 선언 형태를 확인하라"; exit 1; }
gefd_body | grep -q 'gates' \
  || { echo "getEventsForDate 가 gates 를 읽지 않는다 — DD32 의 패널 쪽이 안 바뀌었다(그리드는 화요일을 비우는데 그 칸을 누르면 패널에 그 이벤트가 나온다)"; exit 1; }
gefd_body | grep -qE 'startDate|endDate' \
  && { echo "getEventsForDate 에 아직 startDate/endDate 범위 비교가 남아 있다 — 관문과 범위를 함께 쓰면 옛 규칙이 살아 있다(DD31 이 파생 범위를 점유의 근거에서 뺐다)"; exit 1; }

# 2-b. 온보딩 판정식과 그 배선 — **네 항과 배선 셋이 실제로 있는가**
#    (L2 security CRITICAL · invariant CRITICAL · security HIGH · invariant HIGH ×2).
#    앞선 판은 이 전부를 Acceptance 의 `[사람]` 에만 걸어 두었고, 그래서 넷째 항이
#    `undefined` 로 무너지는 구현이 기계 게이트를 하나도 건드리지 않고 지나갔다.
#
#    **범위 헬퍼를 먼저 정한다 — (i)·(ii)·(iv) 가 전부 이것을 쓴다** (L2 invariant CRITICAL·HIGH·
#    MEDIUM, 이 판에서 고침). 앞선 판의 (i)·(ii)·(iv) 는 셋 다 `newtab.js` **파일 전체**를 grep 했고,
#    그러면 검사가 자기 이름이 말하는 것을 보지 않는다 — (ii) 는 "생성자 기본값" 을 요구하면서
#    파일 어디에 있어도 통과했고, (i) 은 "네 항" 을 요구하면서 첫째 항 하나만 봤다. **이것은
#    Validation 2 가 `occ()` 로 본문을 좁히고 3-1 이 앵커에서 한 줄만 뽑는 것과 같은 규칙이며**,
#    범위를 안 좁힌 검사는 이름만 게이트다.
#    닫는 중괄호는 들여쓰기 2칸이다(실측 2026-08-26: `SettingsManager` 생성자 4308행 ·
#    `Application.initialize` 5507행 둘 다 `  }` 다). newtab.js 는 CRLF 이므로 `$` 앞에
#    공백류를 허용한다 — `/^  \}$/` 로 적으면 `\r` 때문에 조용히 안 맞는 환경이 생긴다.
sm_ctor() {
  awk '/^class SettingsManager \{/{c=1} c' newtab.js \
    | awk '/^  constructor\(/{f=1} f{print; if (/^  \}[[:space:]]*$/) exit}'
}
app_init() {
  awk '/^class Application \{/{c=1} c' newtab.js \
    | awk '/^  async initialize\(\) \{/{f=1} f{print; if (/^  \}[[:space:]]*$/) exit}'
}
[ "$(app_init | wc -l)" -gt 5 ] || { echo "Application.initialize() 본문을 뜨지 못했다 — 선언 형태를 확인하라"; exit 1; }
[ "$(sm_ctor | wc -l)" -gt 5 ] || { echo "SettingsManager 생성자 본문을 뜨지 못했다 — 선언 형태를 확인하라"; exit 1; }
#    (i) **네 항이 한 AND 식 안에 다 있는가** (L2 invariant HIGH, 이 판에서 고침).
#        앞선 판은 첫째 항 하나만 파일 전체에서 grep 했다. 그러면 **둘째~넷째 항이 통째로 빠진**
#        **구현이 기계 게이트를 그대로 통과한다** — DD13 이 "항을 넣어 놓고 항상 참이 되는 것은
#        항을 안 넣은 것과 같다" 고 적은 결함이, 이번에는 *항이 아예 없는* 쪽으로 열려 있었다.
#        `getcell_sig` 와 같은 접기 관용구를 쓴다 — `if (` 부터 `) {` 까지 한 줄로 접은 뒤 그 한 줄에서
#        네 항을 **각각** 본다(합계를 세지 않는 것은 TASK2-RULE 과 같은 이유다).
#        `&&` 를 셋 이상 요구하는 것은 `||` 로 잇는 구현을 막기 위해서다 — OR 이면 항 하나만 참이어도
#        온보딩이 열려 네 항이 한꺼번에 무력해진다. 첫째 항의 **부호**도 본다: `!` 가 붙으면
#        "설정을 못 읽었을 때만 뜨는" 정반대 게이트가 되고, 그것이야말로 이 항이 막으려던 것이다.
#        (반증 실측 2026-08-26 — 픽스처 여섯: 항 둘만 있는 구현 **거부** · `||` **거부** ·
#         첫째 항 부정 **거부** · 기본값 없음 **거부** · 옳은 구현은 한 줄 형태와 여러 줄 형태
#         **둘 다 통과**. 같은 픽스처에서 옛 검사는 앞의 셋을 **전부 통과**시켰다.)
COND=$(app_init | awk '/if[[:space:]]*\(/{buf=""; for(;;){buf=buf " " $0; if (buf ~ /\)[[:space:]]*\{/) break; if ((getline)<=0) break} print buf}' \
  | grep 'calendarSettingsLoaded' | head -1)
[ -n "$COND" ] || { echo "Application.initialize() 안에 calendarSettingsLoaded 를 읽는 온보딩 판정식이 없다"; exit 1; }
echo "$COND" | grep -qE '![[:space:]]*this\.settingsManager\.calendarSettingsLoaded' \
  && { echo "온보딩 판정식의 첫째 항이 부정돼 있다 — 설정을 못 읽었을 때만 온보딩이 뜨는 정반대 게이트다"; exit 1; }
echo "$COND" | grep -qE 'this\.settingsManager\.calendarSettingsLoaded' \
  || { echo "온보딩 판정식에 첫째 항(this.settingsManager.calendarSettingsLoaded)이 없다 — 설정 읽기 실패가 첫 실행으로 오인된다"; exit 1; }
echo "$COND" | grep -qE 'this\.calendarManager\.projects\.length[[:space:]]*===[[:space:]]*0' \
  || { echo "온보딩 판정식에 둘째 항(this.calendarManager.projects.length === 0)이 없다 — 프로젝트가 있어도 뜬다"; exit 1; }
echo "$COND" | grep -qE '![[:space:]]*this\.calendarManager\.projectsLoadFailed' \
  || { echo "온보딩 판정식에 셋째 항(!this.calendarManager.projectsLoadFailed)이 없다 — 프로젝트 읽기 실패가 첫 실행으로 오인된다"; exit 1; }
echo "$COND" | grep -qE '![[:space:]]*this\.settingsManager\.calendarOnboardingSeen' \
  || { echo "온보딩 판정식에 넷째 항(!this.settingsManager.calendarOnboardingSeen)이 없다 — 건너뛴 사용자에게 매 초기화마다 다시 뜬다"; exit 1; }
AND=$(echo "$COND" | grep -o '&&' | wc -l)
[ "$AND" -ge 3 ] || { echo "온보딩 판정식의 && 가 ${AND}개 — 네 항이 AND 로 묶이지 않았다(|| 면 항 하나만 참이어도 열린다)"; exit 1; }
#        **그리고 `||` 가 하나도 없어야 한다** (L2 invariant MEDIUM, 이 판에서 더함). `&&` 개수만
#        세면 `A && B && C && (D || 아무거나)` 가 통과한다 — 넷째 항이 OR 로 약해졌는데 항은 넷 다
#        있고 `&&` 도 셋이다. DD13 의 판정식에는 OR 이 없으므로 **하나라도 있으면 거부**한다.
echo "$COND" | grep -q '||' \
  && { echo "온보딩 판정식에 || 가 있다 — DD13 의 판정식은 네 항의 AND 하나이고, OR 로 묶인 항은 그 항이 없는 것과 같아진다"; exit 1; }
#    (ii) 생성자 기본값 둘. **undefined 를 없애는 유일한 줄이다** — 아래 (iii) 은 성공 경로만
#         다루므로 이 둘이 없으면 실패 경로에서 필드가 여전히 undefined 다.
#         **범위를 `SettingsManager` 생성자 본문으로 좁힌다** (L2 invariant CRITICAL, 이 판에서 고침).
#         앞선 판은 파일 전체를 grep 했고, 그래서 이 검사가 요구한다고 적은 것("생성자 기본값")과
#         실제로 보는 것("파일 어딘가에 그 줄이 있다")이 갈라져 있었다. 기본값을 `initialize()` 안에
#         둔 구현은 **DOM 요소 부재로 조기 `return` 하는 경로에서 실행되지 않으므로** 필드가 여전히
#         `undefined` 인데, 옛 검사는 그것을 통과시킨다 — DD13 의 경로 (2) 가 정확히 그 경로이고,
#         이 항은 그 경로를 막으라고 있는 것이다. (반증 실측 2026-08-26: 기본값 둘을
#         `SettingsManager.initialize()` 로 옮긴 픽스처에서 옛 검사 **통과** · 새 검사 **거부**.)
sm_ctor | grep -qE '^[[:space:]]*this\.calendarSettingsLoaded[[:space:]]*=[[:space:]]*false;' \
  || { echo "SettingsManager **생성자 본문 안**에 this.calendarSettingsLoaded = false 기본값이 없다"; exit 1; }
sm_ctor | grep -qE '^[[:space:]]*this\.calendarOnboardingSeen[[:space:]]*=[[:space:]]*false;' \
  || { echo "SettingsManager **생성자 본문 안**에 this.calendarOnboardingSeen = false 기본값이 없다"; exit 1; }
#    (iii) 성공 경로 대입이 정확히 하나이고 loadSettings() 의 **첫 try 안**에 있다.
#          catch/finally 에 두면 읽기 실패에서도 true 가 되어 첫째 항이 도로 무력해진다.
#          class SettingsManager 뒤로 범위를 좁힌다 — 같은 이름의 loadSettings() 가 앞에 또 있다.
T=$(grep -c 'this\.calendarSettingsLoaded = true;' newtab.js)
[ "$T" = "1" ] || { echo "this.calendarSettingsLoaded = true 가 ${T}곳 — 정확히 하나여야 한다(catch/finally 중복 대입 금지)"; exit 1; }
CLS=$(grep -n '^class SettingsManager {' newtab.js | head -1 | cut -d: -f1)
[ -n "$CLS" ] || { echo "class SettingsManager 선언을 찾지 못했다"; exit 1; }
#          **범위의 양 끝이 배타적이어야 한다** (L2 invariant CRITICAL, 이 판에서 고침).
#          앞선 판은 `sed -n '/^  async loadSettings() {/,/} catch (/p'` 였는데 **sed 의 범위는**
#          **끝 줄을 포함한다.** 그래서 `} catch (error) { this.calendarSettingsLoaded = true;` 처럼
#          catch 를 여는 줄에 같이 적은 구현이 위 `T=1` 과 이 범위 검사를 **둘 다 통과한다** —
#          이 검사가 존재하는 유일한 목적이 try 와 catch 를 가르는 것인데 정확히 그 경계 한 줄에서 샜다.
#          시작도 같은 문제다 — `async loadSettings() {` 부터 뜨면 **첫 try 앞**에 둔 대입이 범위에
#          들어오는데, 그 자리는 storage.get 이 터져도 실행되므로 catch 에 둔 것과 같은 fail-open 이다.
#          그래서 **첫 `try {` 다음 줄부터 뜨고, `} catch (` 를 만나면 그 줄을 찍기 전에 끝낸다.**
#          (실측 2026-08-26: 현행 newtab.js 에서 옛 sed 범위의 마지막 줄이 `} catch (error) {` 였다.
#           새 범위는 첫 try 안 42줄만 뜬다.)
awk -v s="$CLS" 'NR>s' newtab.js \
  | awk '/^  async loadSettings\(\) \{/{fn=1; next} fn && /^[[:space:]]*try[[:space:]]*\{/{inb=1; next} inb && /\} catch[[:space:]]*\(/{exit} inb' \
  | grep -q 'this\.calendarSettingsLoaded = true;' \
  || { echo "this.calendarSettingsLoaded = true 가 loadSettings() 의 첫 try 블록 **안**에 없다 — try 앞이나 catch 여는 줄에 두면 읽기 실패에서도 true 가 된다"; exit 1; }
#    (iv) 판정이 settingsManager 초기화 **뒤**에 선다 (자리 계약, DD13 id=arch-m2).
#         구조적 수리(첫째 항)가 피해를 막고, 이 줄이 계약 위반을 드러낸다 — 다른 것을 잡는다.
#         **범위는 (i) 과 같은 `Application.initialize()` 본문이고, 줄 번호는 그 본문 안의 상대값이다**
#         (L2 invariant MEDIUM, 이 판에서 고침). 앞선 판은 파일 전역 줄 번호를 비교했는데, 그러면
#         이 검사가 "판정이 `Application.initialize()` **안에** 있다" 를 전혀 보지 않는다 — 두 이름이
#         어느 클래스에 있든 앞뒤 순서만 맞으면 통과한다. 범위를 좁히면 "그 메서드 안에 있다" 와
#         "그 안에서 await 뒤에 선다" 가 한 검사로 합쳐진다.
L_INIT=$(app_init | grep -n 'await this\.settingsManager\.initialize();' | head -1 | cut -d: -f1)
L_COND=$(app_init | grep -n 'this\.settingsManager\.calendarSettingsLoaded' | head -1 | cut -d: -f1)
{ [ -n "$L_INIT" ] && [ -n "$L_COND" ] && [ "$L_COND" -gt "$L_INIT" ]; } \
  || { echo "온보딩 판정(Application.initialize() 본문 ${L_COND:-없음}행)이 await this.settingsManager.initialize()(${L_INIT:-없음}행) 뒤에 있지 않다"; exit 1; }

#    (v) **플래그를 쓰는 자리가 둘인가 — 만들었을 때와 건너뛰었을 때** (L2 invariant CRITICAL, 이 판에서 더함).
#        앞선 판의 (i)~(iv) 는 판정식과 **읽기** 배선만 봤다. DD13 은 "플래그는 만들었을 때와
#        건너뛰었을 때 **둘 다** true 로 쓴다" 를 요구하는데 그것을 보는 줄이 없었고, 그러면
#        건너뛰기에서 안 쓰는 구현이 기계 게이트를 통과한다 — 넷째 항이 영원히 false 라
#        **건너뛴 사용자에게 매 초기화마다 다시 뜬다**(santa R8 B1 이 막으려던 바로 그 상태다).
#        선언은 하나, 호출은 둘 이상이어야 한다(선언 줄은 세지 않는다).
SD=$(grep -cE '^[[:space:]]*async saveCalendarOnboardingSeen[[:space:]]*\(' newtab.js)
[ "$SD" = "1" ] || { echo "async saveCalendarOnboardingSeen() 선언이 ${SD}곳 — 정확히 하나여야 한다"; exit 1; }
SC=$(grep 'saveCalendarOnboardingSeen(' newtab.js | grep -vcE '^[[:space:]]*async saveCalendarOnboardingSeen')
[ "$SC" -ge 2 ] || { echo "saveCalendarOnboardingSeen() 호출이 ${SC}곳 — 프로젝트를 만들었을 때와 건너뛰었을 때 **둘 다** 써야 한다(DD13)"; exit 1; }

# 2-d. **테스트가 복제한 상수가 원본과 같은가** (이 판에서 더함 — 위 Task 1·2 단언 코드가 만든 빚).
#    `MAX_CHIPS_PER_CELL`(newtab.js:115)과 `DUE_STATE_LABELS`(newtab.js:107)는 **const** 라
#    프레임 전역에 붙지 않는다(function 선언과 달리 const 는 window 프로퍼티가 아니다).
#    그래서 하네스가 값을 복제할 수밖에 없고, 복제는 드리프트를 만든다 — 원본이 바뀌면
#    단언이 조용히 옛 값을 검사한다. 원본 쪽을 여기서 고정한다.
grep -qF 'const MAX_CHIPS_PER_CELL = 2;' newtab.js \
  || { echo "MAX_CHIPS_PER_CELL 이 2 가 아니다 — Task 1 단언의 CHIP_CAP 복제값과 갈라졌다(둘을 함께 고쳐라)"; exit 1; }
grep -qF "overdue: '지연'" newtab.js \
  || { echo "DUE_STATE_LABELS.overdue 가 '지연' 이 아니다 — Task 2 규칙 2 단언의 aria-label 비교 문자열과 갈라졌다"; exit 1; }

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
#    **순서가 계약이다 — 전반부 보존 검사가 맨 앞이다** (L2 test, id=b467ab7c). 앞선 판은 이 검사를
#    블록 끝에 두었는데, 그러면 앞의 세 검사가 먼저 죽는 실행에서 **덮어쓰기 여부를 영영 보지 못한다.**
#    m2b 쪽 검사는 전부 되돌릴 수 있고 이것만 되돌릴 수 없으므로(추적되지 않는 파일이라 git 이
#    복구하지 못한다 — Task 0), 되돌릴 수 없는 것을 먼저 본다.
#
#    **전반부 앵커를 통째로 `-c` 하지 않는다 — 그것은 설계상 반드시 깨진다.**
#    `work-calendar-m2.rebaseline.sha256` 은 `test/positioning.smoke.js` 도 함께 해싱하는데
#    이 플랜의 Task 1·3·4 가 바로 그 파일을 고친다. 아래 3-2 가 자기 baseline.sha256 을
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
# 3-1. 전반부 베이스라인이 온전한가 (되돌릴 수 없는 것 먼저)
#    **상태가 셋이고 셋을 가른다** — Task 0 의 `m2base_guard()` 와 같은 판정이다.
#    (부재)는 이 플랜이 덮을 대상이 없다는 뜻이므로 "성립하지 않음"으로 적고 지나가고,
#    (존재+불일치)만 멈춘다. 둘을 뭉치면 **부재 상태에서 옳은 구현도 반드시 여기서 죽어**
#    이 플랜이 자기 Validation 을 영영 통과하지 못한다 (실측 2026-08-25 — 지금이 부재다).
#    **줄 수를 먼저 센다** (L2 invariant LOW): grep 이 못 찾으면 `-c -` 는 빈 입력에 exit 0 을 준다.
M2N=$(grep -c 'work-calendar-m2\.baseline\.json' .claude/plans/work-calendar-m2.rebaseline.sha256)
[ "$M2N" = "1" ] || { echo "전반부 앵커에서 work-calendar-m2.baseline.json 줄을 정확히 하나 뽑지 못했다(${M2N}개) — 빈 입력은 -c 를 그냥 통과시키므로 여기서 멈춘다"; exit 1; }
if [ ! -e work-calendar-m2.baseline.json ]; then
  echo "NOTE: work-calendar-m2.baseline.json 이 이 트리에 없다 — 전반부 앵커의 대상이 부재하므로 보존 검사가 **성립하지 않는다**(통과가 아니다). 이 플랜이 덮을 것이 없다는 뜻이고, 전반부가 깨끗했는지는 3-2 의 assertFailures 가 따로 답한다"
else
  grep 'work-calendar-m2\.baseline\.json' .claude/plans/work-calendar-m2.rebaseline.sha256 \
    | SHA256C - || { echo "전반부의 work-calendar-m2.baseline.json 이 바뀌었다 — Task 0 에서 내보낸 파일이 이름을 안 바꾼 채 그것을 덮었을 가능성이 가장 크다. 그 파일은 .gitignore 98행에 걸려 git 이 복구하지 못하므로 여기서 멈추고 사용자에게 알린다"; exit 1; }
fi

# 3-2. **첫 앵커가 있는가** — Task 0 을 통째로 건너뛴 실행을 여기서 잡는다. 존재 검사는
#    `-c` 가 아니므로 재베이스라인과 충돌하지 않고, 사슬이 시작은 됐는지를 본다.
[ -f .claude/plans/work-calendar-m2b.baseline.sha256 ] || { echo "work-calendar-m2b.baseline.sha256 이 없다 — Task 0 의 앵커가 아예 없다(사슬이 시작되지 않았다)"; exit 1; }
#    **그리고 그 베이스라인이 깨끗한 실행에서 나왔는가** (santa R3 B1). 해시는 파일과
#    자기 해시가 맞는지만 보므로 **단언이 깨진 실행에서 뜬 베이스라인도 자기 해시와는
#    완벽히 맞는다** — 게이트가 성공하면서 전제가 무너지는 자리다. 그러면 실패한 실행의
#    스냅샷이 정상 기준으로 굳고, 이후 Compare 는 진짜 회귀를 그 오염된 기준과의 일치로
#    오인해 통과시킨다. 전반부 Validation 3 은 이 검사를 갖고 있었는데 **분할 때 이쪽으로
#    오지 않아 후반부만 fail-open 으로 남아 있었다.** Task 0 이 봉투에 담은 수를 읽는다.
grep -qE '"assertFailures"[[:space:]]*:[[:space:]]*0' work-calendar-m2b.baseline.json || { echo "work-calendar-m2b.baseline.json 이 단언 실패 0건을 증명하지 못한다 — 봉투에 meta.assertFailures 가 없거나 0이 아니다 (Task 0)"; exit 1; }

# 3-2b. **봉투가 재베이스라인 뒤의 것인가** (L2 invariant HIGH — "Validation does not enforce
#    required task ordering for baseline export/regenerate"). Task 4 의 Validate 에만 있던
#    검사를 **게이트 블록으로 내린다** — Task 안에만 있으면 그 Task 를 건너뛴 실행이 이 블록을
#    통째로 통과한다. 잡는 것은 **"(2) 재내보내기를 빠뜨렸다" 하나**이고, 순서를 바꿔 단 것과
#    손으로 고친 봉투는 여전히 잡지 못한다 — Task 4 가 그 한계를 그대로 적고 있다.
node -e 'const b=require("./work-calendar-m2b.baseline.json").baseline;
  const k=Object.keys(b).filter(x=>/^(occupancy|onboarding)\//.test(x));
  const occ=k.filter(x=>/^occupancy//.test(x)), onb=k.filter(x=>/^onboarding//.test(x));
  if(occ.length===0||onb.length===0){console.error("재내보내기가 반쪽이다 — occupancy/*="+occ.length+"개 onboarding/*="+onb.length+"개. **양쪽이 다 있어야 한다**: 한쪽만 세면 케이스 함수 하나가 통째로 비었거나 던진 실행이 통과한다(L2 invariant HIGH).");process.exit(1)}
  console.log("새 케이스 키 "+k.length+"개 확인")' || exit 1

# 3-2c. **불연속 배치가 봉투에 실제로 나타나는가** — 이 플랜의 헤드라인 결과를 기계로 본다
#    (L2 test CRITICAL). 앞선 판은 Task 4 Validate 의 (d) 에 `range/01-month-boundary` 의
#    구현 후 기대값을 **절대값으로 적어 두고도** 그것을 확인하는 줄을 어디에도 두지 않았고,
#    판정자는 Acceptance 의 `[사람]` 하나뿐이었다. 그러면 **DD31 을 구현하지 않은 채 새 케이스만**
#    **더한 실행**이 2번(존재·배선)과 3-2b(새 키 존재)를 전부 통과한다 — 옛 연속 범위 값이
#    그대로 재베이스라인되어 **정상 기준으로 굳고**, 이후 Compare 는 진짜 회귀를 그 오염된
#    기준과의 일치로 읽는다(3-2 가 `meta.assertFailures` 로 막으려는 것과 같은 모양이다).
#    **이 검사는 브라우저가 필요 없다** — Task 4 가 이미 내보낸 JSON 을 읽을 뿐이다. 그리고
#    이 케이스만 **절대 날짜**(`2026-01-28`~`2026-02-03`)라 돌리는 날에 흔들리지 않는다 —
#    다른 케이스가 전부 `todayKey` 상대인 것과 달라서, 여기서는 그 예외가 이득이 된다.
#    **기대값이 두 자리에 있다는 사실을 적어 둔다** — 출처는 Task 4 Validate (d) 이고 강제하는
#    것은 여기다. 값을 고칠 일이 생기면 **두 자리를 함께 고친다**(이 플랜이 계속 경계하는
#    "한 자리를 고치고 쌍둥이를 남기는" 모양이므로 숨기지 않고 적는다).
node -e 'const b=require("./work-calendar-m2b.baseline.json").baseline;
  const v=b["range/01-month-boundary"];
  if(!v){console.error("range/01-month-boundary 키가 봉투에 없다 — 하네스가 이 케이스를 잃었다");process.exit(1)}
  const want={januaryChipDates:["2026-01-28","2026-02-03"],februaryChipDates:["2026-02-03"],distinctDates:["2026-01-28","2026-02-03"]};
  let bad=0;
  for(const k of Object.keys(want)){
    const got=JSON.stringify(v[k]), exp=JSON.stringify(want[k]);
    if(got!==exp){console.error(k+": "+got+" != "+exp);bad++}
  }
  if(bad){console.error("DD31 의 점유 축소가 봉투에 없다 — 화면이 여전히 파생 범위로 셀을 채운다(UI15 미충족). Task 4 Validate (d) 의 기대값과 대조하라");process.exit(1)}
  console.log("불연속 배치 확인 — range/01-month-boundary 가 관문 둘만 점유한다")' || exit 1

# 3-3. 끝 상태 게이트 — **`|| exit 1` 을 붙인다.** 앞선 판은 이 줄만 `||` 없이 두었고,
#    이 블록에는 `set -e` 가 없으므로 **`-c` 가 깨져도 스크립트가 그냥 다음 줄로 갔다.**
#    이 플랜에서 유일한 끝 상태 앵커가 fail-open 이었다는 뜻이다 — 위아래 모든 검사가
#    `|| exit 1` 을 달고 있어 눈으로는 붙어 있는 것처럼 읽혔다.
SHA256C .claude/plans/work-calendar-m2b.rebaseline.sha256 || { echo "work-calendar-m2b.rebaseline.sha256 이 맞지 않는다 — Task 4 의 (1) 재베이스라인 → (2) 재내보내기·덮어쓰기 → (3) 해시 생성 순서를 확인한다"; exit 1; }

# 4. 스모크 하네스 — 브라우저에서 연다 (자동화 불가)
#    빈 프로필/시크릿 창에서 test/positioning.smoke.html 을 열고 Run → 단언 실패 0건,
#    Compare → 위 (a)~(d) 로 설명되는 diff 만 남는지 확인한다.
```

**2번이 통과해도 DD31·DD32가 충족된 것은 아니다.** 존재와 배선을 볼 뿐 `rebuildIndex()`가 실제로 관문을 읽는지는 보지 못한다. **그것을 기계로 보는 것은 3-2c 하나이고, 나머지는 4번의 단언 — 사람이 브라우저에서 돌려야 한다.** 3-2c 는 봉투에 남은 값 하나를 볼 뿐이므로 "이 케이스에서 점유가 줄었다" 까지만 증명하고, 다섯 고정 입력의 단언이 전부 통과했는지는 증명하지 않는다(그것은 4번이다). 그래도 **DD31 을 구현하지 않은 실행을 게이트에서 잡는 유일한 기계 판정**이다.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **점유 전환이 M3의 디자인 결정을 선점한다** | Medium | Medium | UI4가 경계다. **기계는 이 경계를 지키지 못한다** — `snapshot()`은 색·문구·칩 형태를 보지 않으므로 새 시각 언어를 만들고도 통과한다. 실제 판정자는 Acceptance의 육안 대조 하나이며 강제 수단은 없다 |
| **폭 있는 일정이 하루로 보여 사용자가 데이터를 잃었다고 오해한다** | Medium | Medium | 데이터는 그대로다(파생 범위가 남아 있다). 다만 화면이 달라지는 것은 사실이므로 **하루 재현 테스트(Task 5)에서 그 인상을 관찰 목록에 적는다.** 완화가 필요하면 M3의 시각 언어가 답한다 |
| **그리드와 패널이 갈린 채 커밋된다** | Low | High | DD32가 둘을 한 Task에 묶었고, Task 1의 마지막 단언이 같은 날짜에 대해 둘의 답을 맞댄다 |
| **전반부가 안 끝난 채 이 플랜이 시작된다** | Low | High | 이 플랜은 `gates[]`가 저장소에 있다고 전제한다. Task 0의 베이스라인이 전반부 종료 상태에서 떠지므로 단언 실패 0건 확인이 그 사실을 걸러 낸다 |
| **온보딩 플래그가 `undefined` 로 남아 매 로드마다 다시 뜬다** | Medium | High | 경로가 둘이고 둘 다 조용하다 — `loadSettings()` 의 삼킨 `catch`(`newtab.js:4587`~`4589`)와 `SettingsManager.initialize()` 의 조기 `return`(`newtab.js:4341`~`4342`). DD13 이 판정식에 첫째 항 `calendarSettingsLoaded` 를 세우고 **생성자 기본값으로 `undefined` 자체를 없앤다** — 항을 더하는 것만으로는 같은 결함을 하나 더 만들 뿐이다. Validation 2-b 가 네 항과 배선 셋을 **범위를 좁혀** 기계로 보고, Task 3 Validate 의 `DD13-CASE 4`(읽기 실패)와 `DD13-CASE 6`(조기 `return`)이 **경로 둘을 각각** 하네스에서 재현한다 |

## Acceptance

**항목마다 앞에 판정자를 적고, `[기계]` 에는 **언제** 도는지까지 괄호로 적는다.** `[기계]`는 사람의 눈이 아니라 **종료 코드가 답을 낸다**는 뜻이지, **지금 돌 수 있다는 뜻이 아니다** — 앞선 판은 이 자리에 "셸이 **지금** 판정한다" 라고 적어 두고 다섯 중 넷을 구현 뒤에야 도는 검사에 붙였다. 그러면 승인 게이트가 강제하지 **못하는** 것을 강제한다고 읽히고, 바로 그 믿음 때문에 Task 0 을 건너뛴 실행이 아무도 모르게 지나간다. **(승인 시점)** 이 붙은 하나만 지금 돌고, 나머지는 그 항목이 검사하는 산출물을 Task 가 만든 뒤에 돌다 — 그것은 이 저장소에 러너도 CI 도 커밋 훅도 없다는 사실의 직접적 결과이며, 백로그 `m2-headless-runner` 가 유일한 실질 수리다. `[사람]`은 사람이 브라우저에서 하네스를 돌려야 알 수 있고 **이 저장소에는 그것을 강제할 수단이 없다.** `[기계+사람]`은 존재는 기계가, 통과는 사람이 본다.

- [ ] `[사람]` Task 0~5 전부 완료
- [ ] `[기계]` (승인 시점) **`node --check` 둘 다 통과하고, Validation 1-c 의 전반부 전제가 성립한다** — `createCalendarGate()` 가 있고 `createCalendarEvent()` 본문이 `gates` 와 `projectId` 를 만든다. **이 항목이 승인 시점에 도는 유일한 실체 검사다** (L2 architect HIGH — 앞선 판은 `gates[]`·`projectId` 가 이미 있다고 전제하면서 그 전제를 보는 줄이 하나도 없었고, Task 0 의 `meta.assertFailures === 0` 은 전반부의 **단언이 통과했다**만 증명하지 필드가 생겼다는 것을 증명하지 않는다. 전제가 깨진 트리에서는 Task 1 이 `event.gates` 를 처음 건드리는 자리에서 `undefined` 를 만나는데, 그 시점은 이미 첫 비가역 지점을 지난 뒤다)
- [ ] `[기계]` (Task 1·3 뒤) **Validation 2·2-c 가 통과한다** — 함수 둘의 존재, `runAll()` 배선 둘, `DD31-FIXTURE` 표식 **다섯**(santa R0 B2 가 같은 날 관문 둘 케이스를 더했다), **`DD13-CASE` 표식 여섯**(Task 3 Validate — 4번이 설정 **읽기** 실패, 6번이 설정 DOM 부재로 인한 **초기화** 실패다. DD13 이 이름으로 적은 경로가 둘이므로 케이스도 둘이다 — L2 test HIGH), **`runCalendarOccupancyCases()` 본문 안의 `TASK2-RULE-1·2·3` 셋**(L2 test HIGH — 한 함수에 합친 선택이 만든 구멍을 이것이 막는다), **`getCellDueState` 가 두 인자 서명이고 그 본문이 `dateKey` 를 실제로 쓴다**(L2 test, id=test-m3 — 서명만 넓히고 날짜를 안 보는 구현은 규칙 2 를 할 수가 없다), **그리고 `getEventsForDate()` 가 `gates` 를 읽고 `startDate`/`endDate` 범위 비교를 더는 쓰지 않는다**(Validation 2-c, L2 test MEDIUM). **마지막 것이 DD32 의 첫 기계 판정이다** — 그전에는 `rebuildIndex()` 만 고치고 패널 조회를 옛 범위로 둔 반쪽 구현이 기계 검사를 전부 통과했고, 판정자는 브라우저 실행(`[사람]`) 하나뿐이었다 **그리고 Validation 2-d 가 하네스로 복제된 상수 둘이 원본과 같은지 본다** — `MAX_CHIPS_PER_CELL`(`newtab.js:115`)과 `DUE_STATE_LABELS.overdue`(`newtab.js:107`)는 `const` 라 프레임 전역에 붙지 않아 단언 코드가 값을 복제할 수밖에 없고, 복제는 드리프트를 만든다.
- [ ] `[기계]` (Task 3 뒤) **온보딩 판정식의 네 항과 배선 셋이 코드에 있다** — Validation 2-b 가 (i) 판정식이 `Application.initialize()` 본문 안에 있고 **네 항이 한 AND 식에 다 들어 있으며**(첫째 항이 부정돼 있지 않고 `&&` 가 셋 이상), (ii) 기본값 둘이 **`SettingsManager` 생성자 본문 안**에 있고(`calendarSettingsLoaded = false` · `calendarOnboardingSeen = false`), (iii) `calendarSettingsLoaded = true` 가 **정확히 하나**이고 `loadSettings()` 의 **첫 `try` 안**에 있으며, (iv) 판정 줄이 그 메서드 본문 안에서 `await this.settingsManager.initialize();` **뒤**이며, **(v) `saveCalendarOnboardingSeen()` 의 선언이 하나이고 호출이 둘 이상임**(만들었을 때와 건너뛰었을 때 둘 다 — L2 invariant CRITICAL. 앞선 판은 판정식과 **읽기** 배선만 봤고, 건너뛰기에서 안 쓰는 구현은 넷째 항이 영원히 false 라 **매 초기화마다 다시 뜨는데** 기계 게이트를 하나도 건드리지 않았다)을 확인한다. **이 항목이 없으면 넷째 항이 `undefined` 로 무너지는 구현이 기계 게이트를 하나도 건드리지 않고 지나간다** (L2 security CRITICAL · invariant CRITICAL · security HIGH · invariant HIGH ×2 — 앞선 판은 이 전부를 `[사람]` 에만 걸어 두었다). **그리고 (i)·(ii)·(iv) 는 이 판에서 범위를 좁혔다**(L2 invariant CRITICAL·HIGH·MEDIUM) — 셋 다 파일 전체를 grep 하고 있어서, 항이 하나뿐인 판정식과 생성자 밖에 둔 기본값이 **둘 다 통과했다.** 검사가 요구한다고 적은 것과 실제로 보는 것이 갈라져 있으면 그것은 게이트가 아니라 게이트 모양이다 (반증 실측 2026-08-26 — 픽스처 여덟)
- [ ] `[기계]` (Task 0 뒤) **전반부의 베이스라인 파일을 이 플랜이 덮지 않았다** — `work-calendar-m2.rebaseline.sha256` 에서 `work-calendar-m2.baseline.json` 줄만 뽑아 검사하되, **결과가 셋이고 셋을 가른다**: (존재+일치) 통과 · (존재+불일치) 실패 · **(부재) 성립하지 않음**. **이 항목이 없으면 이 플랜의 게이트는 전반부의 감사 기록을 지우고도 전부 통과한다** — 내보내기 버튼이 `work-calendar-m2.baseline.json` 이라는 이름을 내려주기 때문에 그 덮어쓰기는 실수가 아니라 **기본 경로**이고, 다른 모든 검사는 `m2b` 쪽만 본다. **앵커를 통째로 검사하지 않는다** — 같은 파일이 `test/positioning.smoke.js` 도 해싱하는데 이 플랜이 그것을 고치므로 통째 검사는 옳은 구현에서도 반드시 깨진다. **그리고 부재를 실패로 읽지 않는다** — 실측 2026-08-25 로 지금이 부재이며, 뭉치면 옳은 구현도 반드시 여기서 죽는다 (Task 0, Validation 3-1)
- [ ] `[기계]` (Task 4 뒤) **앵커 둘이 있고 뒤엣것이 통과하며, 봉투가 재베이스라인 뒤의 것이다** — Task 0이 `.claude/plans/work-calendar-m2b.baseline.sha256`을(구현 전 기록), Task 4가 재베이스라인 직후 `.claude/plans/work-calendar-m2b.rebaseline.sha256`을 남겼고 `SHA256C`가 후자에서 통과한다 (santa R3 B2 — 앞선 판은 이 줄에서만 `m2b-baseline.sha256` 식 축약명을 써 Files to Change·Task 0·Validation 이 요구하는 실제 파일명과 다른 체계를 가리키고 있었다). **그리고 Validation 3-2b 가 봉투에 `occupancy/*` 와 `onboarding/*` 키가 *양쪽 다* 있는지를 본다** — 한쪽만 세면 케이스 함수 하나가 통째로 비었거나 던진 실행이 통과한다 (L2 invariant HIGH). **여전히 잡지 못하는 것은 순서 뒤바꿈과 손으로 고친 봉투이고, 그 둘은 규율이다**(Task 4 가 그 한계를 적고 있다)
- [ ] `[기계]` (Task 0 뒤) **베이스라인이 깨끗한 실행에서 나왔다** — `work-calendar-m2b.baseline.json` 의 봉투에 `meta.assertFailures` 가 있고 그 값이 `0` 이다. 없거나 0이 아니면 이후 모든 비교의 전제가 무너져 있다. **손으로 고친 봉투는 잡지 못한다** (Task 0, santa R3 B1 — 전반부에는 있고 후반부에는 없던 검사다)
- [ ] `[사람]` 스모크 하네스 단언 실패 0건
- [ ] `[사람]` **시계 모드 경로 `snapshot()` diff 0** (UI13)
- [ ] `[기계+사람]` **`runCalendarOccupancyCases()`가 존재하고(기계) 단언 다섯이 통과한다(사람)** — 점유가 관문 집합과 같고, 관문에 없던 날을 점유하지 않고, 칩이 `min(버킷 길이, MAX_CHIPS_PER_CELL)`와 같고, 4일 폭 입력에서 점유가 둘로 줄고, **같은 날 `dev`·`review` 관문을 가진 이벤트 하나의 버킷 길이가 1이다**(DD31의 이벤트별 접기). **마지막 항이 빠지면 접기를 빼먹은 구현이 최종 게이트를 통과하고, 그리드에는 칩 둘 · 패널에는 이벤트 하나가 남는다** — DD32가 막으려는 불일치가 그대로 출하된다 (santa R1 B3)
- [ ] `[사람]` **그리드와 패널이 같은 날짜에 같은 답을 낸다** — `today-3`·`today` 관문 이벤트에서 `today-1` 셀이 비어 있고 그 날짜의 `getEventsForDate()`도 빈 배열이다 (DD32). **그리고 같은 날 `dev`·`review` 관문을 가진 이벤트 하나에서 `today` 셀의 칩이 하나이고 `getEventsForDate(today)`도 길이 1이다** — 앞의 것은 "둘 다 비었나"를, 이것은 "둘 다 하나인가"를 묻는다. 접기 누락은 앞의 것을 통과하고 이것만 죽인다 (santa R1 B3)
- [ ] `[사람]` **`dropped` 관문이 점유에는 남는다** — 안 하기로 한 관문의 셀이 여전히 차 있다. 계획은 남는다 (DD31)
- [ ] `[기계+사람]` **`dropped` 관문의 날짜에 지연색이 붙지 않는다 — 칩 · 셀 · `aria-label` 셋 다**(Task 2 Validate 2 가 이 셋을 하네스 단언으로 판정한다, id=test-m2) — 살아 있는 종단 관문이 지난 날짜(지연)이고 그보다 늦은 관문이 `dropped` 인 이벤트를 만든 뒤, 그 `dropped` 날짜에서 (a) 칩에 `is-due-overdue` 가 없고, (b) **셀(`.calendar-day`)에도 `is-due-overdue` 가 없으며**, (c) **셀의 `aria-label` 에 지연 문구가 없는지** 확인한다. **칩만 보면 절반만 본 것이다** — 셀 클래스와 `aria-label` 은 `getCellDueState()` 라는 별도 경로로 붙으므로 칩을 고쳐도 그대로 남고, 눈으로는 셀 배경이 스크린리더로는 문구가 여전히 범위축소를 지연이라고 말한다 (Task 2 규칙 2, santa R5 B1 · R6 B0)
- [ ] `[기계+사람]` **패널이 관문 날짜를 말한다**(Task 2 Validate 1 이 하네스 단언으로 판정한다 — 구분자까지 본다, id=test-m3) — `today-3`·`today` 관문 이벤트를 열어 패널 메타가 `today-3 – today` **연속 범위가 아니라** 두 관문 날짜를 열거하는지 확인한다. 범위로 나오면 그리드는 `today-1` 을 비우는데 패널은 포함해 말하게 되어 DD32 가 막으려던 불일치가 패널 쪽에 남는다 (Task 2 규칙 1, santa R5 B0)
- [ ] `[사람]` **불연속 배치가 눈에 보인다** — `today-3`·`today` 관문 이벤트를 만들고 그리드에서 `today-2`·`today-1` 셀이 **비어 있는지** 눈으로 확인한다. 이것이 M2의 헤드라인 결과물이다 (UI15)
- [ ] `[사람]` **UI4 판정은 사람이 눈으로 본다** — 달력 표면을 전반부 종료 상태와 나란히 놓고, 프로젝트 이름이 **`.calendar-todo-meta` 의 첫 항목**으로(Task 2 규칙 3 — `createTodoItem()` 에 프로젝트 뱃지 자리는 **없다**), 관문이 **기존 칩 형태 그대로** 나오는지 확인한다. **"기존 뱃지 자리" 라는 옛 문구를 판정 기준으로 쓰지 않는다**(santa R6 B2) — 그 자리가 실재하지 않아 Task 2 가 실제 DOM 으로 바꿔 적었는데 이 항목만 옛 문구로 남아 있었고, 그러면 Task 2 를 따른 구현이 여기서 실패로 읽히고 없는 자리를 만들어 낸 구현이 통과한다. 새 색·새 아이콘·새 칩 모양·새 상시 표면이 하나라도 생겼으면 실패다. **기계로 판정할 수단이 없다** — `snapshot()`은 기하만 담으므로 이 항목의 대역이 될 수 없다
- [ ] `[기계+사람]` **프로젝트 이름이 `.calendar-todo-meta` 의 첫 조각이다** — 프로젝트에 속한 이벤트에서 메타 텍스트가 그 이름으로 시작하고, `projectId` 가 `null` 인 이벤트에서는 들어가지 않는다 (Task 2 규칙 3·Validate 3, UI8, id=test-m5)
- [ ] `[기계+사람]` **프로젝트 읽기 실패를 첫 실행으로 오인하지 않는다** — `projectsLoadFailed`가 참인 상태에서 온보딩이 뜨지 않고 한 번뿐인 플래그가 타지 않는다 (DD13, Task 3 Validate `DD13-CASE 3`)
- [ ] `[기계+사람]` **설정 읽기 실패도 첫 실행으로 오인하지 않는다 — 경로 둘 다** — `calendarSettingsLoaded` 가 거짓인 상태에서 온보딩이 **뜨지 않고** 플래그도 **타지 않는다** (DD13 첫째 항). **경로마다 케이스가 하나씩이다**: 설정 저장소 읽기가 던진 경우는 `DD13-CASE 4`, 설정 DOM 요소 부재로 `SettingsManager.initialize()` 가 조기 `return` 한 경우는 `DD13-CASE 6` 이 재현한다. **앞선 판에는 이 항목이 없었고**, 그래서 `loadSettings()` 의 삼킨 `catch`(`newtab.js:4587`~`4589`)와 조기 `return`(`newtab.js:4341`~`4342`) 둘 다 넷째 항을 `undefined` 로 남겨 **온보딩이 매 로드마다 다시 뜨는** 상태가 판정을 그대로 빠져나갔다 (L2 security CRITICAL · invariant CRITICAL · invariant HIGH). **그다음 판은 항목은 두 경로를 다 적으면서 케이스는 4번 하나뿐이었다** — 주장이 배선보다 넓었고, 6번이 그 간극을 닫는다 (L2 test HIGH)
- [ ] `[사람]` **정상 경로도 함께 본다 — 뜬다 · 끈다 · 다시 안 뜬다**(L2 invariant). 앞선 판은 온보딩 판정을 **실패 경로 하나로만** 받았다. 그러면 셋째 항을 초기화 전에 읽어 `undefined` 를 얻는 구현(그래서 `!undefined` 가 참이라 **매번 다시 뜨는** 구현)이 그 항목을 그대로 통과한다 — DD13 이 자리와 시점을 못박은 바로 그 결함이 판정을 빠져나간다. 셋을 순서대로 확인한다: (1) 프로젝트가 없는 빈 프로필에서 첫 로드에 온보딩이 **뜬다**, (2) 건너뛰기를 누른다, (3) **새로고침해서 다시 뜨지 않는다.** (3) 이 이 항목의 핵심이고 (1)(2) 없이는 성립하지 않는다. 프로젝트를 만든 경우로도 같은 셋을 한 번 더 돈다 (DD13)
- [ ] `[사람]` **온보딩이 레이아웃을 바꾸지 않는다** — 밴드 높이와 패널 스크롤이 안 움직인다
- [ ] `[사람]` **재베이스라인 전에 (d)의 세 값을 눈으로 맞췄다** — `range/01-month-boundary`의 `januaryChipDates`·`februaryChipDates`·`distinctDates`가 Task 4가 적어 둔 기대값과 같다. 다른 기존 케이스에서 값이 움직였으면 재베이스라인하지 않고 원인을 찾는다
- [ ] `[기계]` (Task 5 뒤) PRD M2 행이 `complete`이고 Plan 칸이 두 플랜을 모두 가리킨다
- [ ] `[사람]` **하루 재현 테스트를 실제로 수행하고 결과를 적었다** — 관찰 목록이며 수치를 새로 만들지 않았다 (UI10·UI11)
- [ ] `[사람]` 브라우저에서 확장을 실제로 1회 로드해 불연속 배치와 온보딩을 손으로 확인했다 — **하네스 통과가 경로 작동과 같지 않다**

**`[사람]` 항목은 스물다섯 중 열둘이다.** 그 열둘은 체크한다고 해서 참이 되지 않는다 — 러너도 CI도 커밋 훅도 없으므로 이 목록의 **스물다섯 중 열둘**은 약속이지 게이트가 아니다. 수를 어림으로 적지 않는다: `[기계]` 일곱 · `[기계+사람]` 여섯 · `[사람]` 열둘 = 스물다섯이며, 항목을 더할 때마다 이 문단의 수를 같이 고친다.

**앞선 판에서 `[기계+사람]` 이 하나에서 넷으로 늘었다** — Task 2 의 렌더 규칙 셋(패널 메타 · `dropped` 마감 상태 · 프로젝트 이름 자리)이 `[사람]` 육안 대조에서 하네스 단언으로 내려왔기 때문이다(L2 test, id=test-m2·m3·m5). 그 셋은 **렌더 함수 여섯을 고치는 Task 의 유일한 기계 증거**이며, 그 전에는 그것이 하나도 없어 규칙을 통째로 빼먹은 구현도 하네스를 초록으로 통과했다.

**이 판에서 다시 스물셋이 스물다섯이 됐고 판정자 분포가 셋 다 움직였다** — 전부 온보딩 fail-open 을 닫는 데서 나온다(L2 security CRITICAL · invariant CRITICAL · security HIGH · invariant HIGH ×2). `[기계]` 가 여섯에서 일곱으로 는 것은 판정식의 네 항과 배선 셋을 보는 Validation 2-b 항목이 새로 섰기 때문이고, `[기계+사람]` 이 넷에서 여섯으로 는 것은 (a) 프로젝트 읽기 실패 항목이 `[사람]` 에서 내려왔고 (b) **설정 읽기 실패 항목이 새로 생겼기** 때문이다. `[사람]` 이 열셋에서 열둘로 준 것은 (a) 의 이동 하나다. **셋째 항만 못박고 넷째 항이 `undefined` 로 무너지는 경로를 안 본 것이 앞선 판이 divergent 로 멈춘 이유이므로**, 이 세 줄이 이번 판에서 가장 중요한 변화다.

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

## Codex Implementation Review

- 호출: `node .../scripts/lib/codex-invoke.js adversarial-review` (fail-closed Bash wrapper, v0.2.2)
- 라운드 수: 0
- 합치 결론: > Codex skipped per MCCP_CODEX_DISABLED=1 — 환경 정책상 1급 skip(classification=`disabled`, exit 0, blocking=false). 이 게이트는 승인 판정을 내리지 않았고, receipt 의 `codex_verdict` 은 `skipped` 로 봉인된다(교차 게이트 dedupe 는 `converged` 가 아닌 값에서 fail-close).
- YAGNI Triage:

  | Finding | Severity | Verdict | Why |
  |---|---|---|---|
  | — | — | — | Codex 가 돌지 않았으므로 finding 이 없다. 빈 표를 "지적 없음(합치)" 으로 읽지 않는다 |

- Deferred to backlog: 0
- Open Questions: 없음 (auto-CRITICAL 카탈로그 해당 없음)
- Codex session 참조: 없음 (`MCCP_CODEX_DISABLED=1`)

### Security Reviewer

이 변경은 §2.5.5 의 보안 민감 카탈로그(auth · crypto · secrets · 입력 검증 · SQL/cmd 주입 · SSRF · 경로 순회 · 권한 상승)에 **해당하지 않는다.** 새 신뢰 경계가 없고, 저장 경로는 전반부가 확정한 `chrome.storage` 그대로이며, 새 사용자 입력은 온보딩의 프로젝트 이름 하나인데 그것이 닿는 곳은 이미 존재하는 `textContent` 싱크다(`.calendar-todo-meta` 는 `meta.join(' · ')` 한 줄 `textContent` 다 — `newtab.js:4227`~`4231`).

**그 전제는 구현에서 기계로 지킨다** — 온보딩 표면과 프로젝트 이름 출력 경로에 `innerHTML` 을 쓰지 않는다. Phase 4 VALIDATE 가 그 부재를 grep 으로 확인한다. 전제가 깨지면(예: 이름을 `innerHTML` 로 넣게 되면) 그때는 카탈로그에 들어가므로 security-reviewer 를 부른다.

이것은 auto-fallback 이 아니라 **범위 판정**이므로 `security_skipped` 를 세우지 않는다.

### Design Review

- `impeccable-detect --mode implement` 결과: `skill_available=true` · `design_signal=false` · `silent_skip=true` (reason=`no-signal`).
- 판정 트리의 `SKILL_AVAIL=1 / SIGNAL=0 / DESIGN_INTENT_ACTIVE=0` 행이므로 **silent-skip** 이고, receipt 에 `--impeccable-silent-skip --impeccable-silent-skip-reason "no-signal"` 로 정직하게 기록한다(M1 에서는 informational warning).
- **탐지기가 못 본 것을 여기 적는다** — 이 플랜은 `newtab.html`·`newtab.css`·`newtab.js` 의 렌더 함수 여섯을 고치므로 실제로는 렌더 표면이 있다. 탐지기가 `design_signal=false` 를 준 것은 **게이트 시점의 추적 diff 에 UI 파일 변경이 아직 하나도 없기 때문**이고(EXECUTE 전이다), 이것이 command body 가 적어 둔 pre-EXECUTE 탐지 맹점이다.
- **그럼에도 `MCCP_DESIGN_INTENT_REASON` 감사 우회로 critique 루프를 강제하지 않는다.** 이 플랜의 `Design Routing Guide` 가 그 이유를 직접 정하고 있다 — UI4 가 "새 시각 언어를 만들지 않는다" 이고, `colorize`·`bolder`·`overdrive`·`delight` 는 정확히 그 금지 대상을 건드리는 명령이라 **돌리면 플랜을 어긴다.** 관문의 시각 언어는 M3 의 몫이다.
- 그러므로 이 게이트에서 impeccable 명령을 하나도 부르지 않으며, Phase 3.6 DESIGN FINISH 와 Phase 3.7 DESIGN GROUNDING VERIFY 도 트리거가 서지 않아 no-op 이다. UI4 의 실제 판정자는 Acceptance 의 육안 항목이고, 그 사실은 플랜 본문이 이미 적고 있다.
