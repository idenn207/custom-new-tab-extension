# Plan: 작업이 실제 업무 모양을 담는다 (업무 캘린더 M2)

**Source PRD**: `.claude/prds/work-calendar.prd.md`
**Selected Milestone**: M2 — 작업이 실제 업무 모양을 담는다
**Complexity**: Large

## Summary

작업당 마감이 하나라는 전제를 걷어낸다. 작업은 **프로젝트에 속하고**, 서로 다른 날짜의 **관문 집합**을 가지며, 연속 범위는 저장되는 값에서 파생값(`min..max`)으로 강등된다. 관문마다 계획과 실제가 남아 조기·지연·범위축소가 구분된다.

이 마일스톤은 디자인 수렴 대상이 아니다(PRD: "M1과 M3은 impeccable 루프 대상이고 M2는 데이터 작업이라 그렇지 않다"). 화면은 새 시각 언어를 만들지 않고 **기존 표면이 새 데이터를 읽도록 적응시키는 수준**까지만 바뀐다.

**경계를 한 문장으로 긋는다(DD31·UI15)** — M2는 **어느 셀이 차는가**를 정하고, M3은 **찬 셀이 어떻게 보이는가**를 정한다. 앞의 것은 데이터가 답하고 뒤의 것은 디자인이 답한다. 그래서 월·수 관문이 화요일을 비우는 것은 M2의 몫이고(불연속 배치는 이 마일스톤의 헤드라인 결과물이다), 관문에 종류별 색이나 모양을 주는 것은 M3의 몫이다.

**판정은 기존 스모크 하네스가 한다.** M1은 러너가 없어 전용 셸 게이트(`verify.sh`)를 만들었지만, 데이터 계층에는 이미 판정자가 있다 — `test/positioning.smoke.js`가 v2·v3 마이그레이션을 초회·멱등·무손상 세 축으로 검사하는 케이스를 갖고 있다(`441-491`, `497-548`). M2는 그 선례를 확장하고 두 번째 판정자를 만들지 않는다(DD11).

## User Intent

| ID | Constraint (user-stated) | Kind |
|---|---|---|
| UI1 | M1은 완료 상태로 두고 M2 계획으로 넘어간다 | direction |
| UI2 | 연속 범위를 관문으로 옮기는 방식은 Claude 판단으로 정하되, PRD와 다른 문서를 판단 기준으로 삼는다 | direction |
| UI3 | 백업은 수동 내보내기와 복구를 모두 만든다. 되돌릴 수 없으면 백업이 아니다 | constraint |
| UI4 | 화면은 기존 표면을 재사용하는 수준으로만 바뀐다 | constraint |
| UI5 | 겹침을 막지 않는다. 겹침·밀집 경고를 만들지 않는다 | exclusion |
| UI6 | 자동 일정 재배치를 하지 않는다. 제안까지 하고 결정은 사용자가 한다 | exclusion |
| UI7 | 계획 대비 실제는 저장하되 회고·통계 화면을 갖지 않는다 | exclusion |
| UI8 | 프로젝트를 강제하지 않는다. 기본값은 마지막에 쓴 프로젝트이고 무소속 자리를 남기며, 첫 실행 온보딩을 M2에 포함한다 | constraint |
| UI9 | 관문 프리셋은 dev·review·stg·prod·monitor 다섯을 최소 기준으로 두고 최종 목록을 확정하지 않는다 | direction |
| UI10 | 정량 지표를 새로 만들어 확신을 흉내내지 않는다 | exclusion |
| UI11 | 마일스톤 판정은 2주 dogfooding이 아니라 하루 재현 테스트로 한다 | direction |
| UI12 | all-day 날짜만 다룬다. 시:분·타임존·반복 일정은 범위 밖이다 | exclusion |
| UI13 | 시계 모드의 동작과 화면은 이 작업으로 달라지지 않는다 | exclusion |
| UI14 | 로컬 저장만 하며 동기화 계층을 만들지 않는다 | exclusion |
| UI15 | 불연속 배치는 M2에서 화면에 표현된다. 월·수 관문이면 화요일 셀이 비어 보여야 한다 | constraint |

UI15는 santa R0의 B2(CRITICAL)가 PRD와 플랜의 어긋남을 잡은 뒤 사용자가 정했다
(2026-08-22). 플랜은 점유를 파생 `min..max`로 계속 칠하려 했고 PRD 32·96행은 그것을
금지하고 있었다. 사용자는 **PRD를 좁히는 대신 M2가 자기 헤드라인 결과물을 지키는**
쪽을 골랐다 — 근거는 DD31이고, 그 대가는 등가 단언을 다시 쓰는 것이다(Task 5).

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| 마이그레이션 | `newtab.js:410` `migrateCalendarToV3()` | 자체 버전 가드로 멱등, 여러 키를 **한 번의 `storage.set()`으로** 커밋, `catch`에서 `false` 반환 + 콘솔 고지. 조용히 넘기지 않는다 |
| 마이그레이션 독립성 | `newtab.js:376-378` 주석 + `newtab.js:418` | v2는 자체 상수로 가드하고 v3는 `SETTINGS_VERSION`으로 가드한다. 새 마이그레이션이 그 상수를 올리면 **이전 마이그레이션이 영영 실행되지 않는 함정**이 있고 주석이 그것을 기록해 두었다 |
| 레거시 잔존 필드 | `newtab.js:327-330` DD6 주석 | 승격 후에도 옛 필드를 **지우지 않고 파생값으로 유지**한다(`date: startDate`). 옛 코드로 롤백해도 렌더가 산다. 입력의 옛 필드를 그대로 복사하지는 **않는다** — 어긋난 값이 인덱스를 깨뜨린다 |
| 생성 게이트 | `newtab.js:304` `createCalendarEvent()` | 모든 이벤트 생성의 **유일한 경로**. 화이트리스트 대입으로 prototype pollution을 막고, 상한 초과는 절단하며, 필수값 부재는 `null` 반환 |
| 원자적 쓰기 | `newtab.js:2146` `persistEvents()` | 스냅샷 전체를 한 번에 커밋하고 실패 시 메모리·인덱스·DOM을 건드리지 않아 자동 롤백된다. `opSeq` 토큰으로 재입력을 막는다 |
| 읽기 실패 봉인 | `newtab.js:2062` `loadEvents()` + `2151` `isFullReplacement` | 손상된 저장값을 읽으면 쓰기를 차단하고, **전체 교체만이 유일한 복구 경로**로 남는다. 백업 복구가 이 자리에 붙는다 |
| 가져오기 정제 | `newtab.js:492` `sanitizeImportedEvents()` | 항목 수와 총 문자 수 상한을 함께 보고, 초과 시 **조용히 자르지 않고 전체를 거절**한다. ID 충돌은 새 UUID로 푼다 |
| 하네스 마이그레이션 케이스 | `test/positioning.smoke.js:441`·`497` | 초회 승격 · 2회 실행 멱등 · 레거시와 사용자 데이터 무손상 **세 축**을 한 벌로 만든다 |
| 하네스 불변식 케이스 | `test/positioning.smoke.js:283` `runBandInvariance()` | 조합 폭발을 전수로 돌리지 않고 **불변식 하나**로 압축해 단언한다 |
| 스냅샷의 범위 | `test/positioning.smoke.js:191` `snapshot()` | 담는 것은 위젯·검색의 **기하**(rect·display·classes·`inlineWidth`)와 교차 여부뿐이다. 마감 상태·칩·배너 문구는 담기지 않으므로 **의미 회귀를 보지 못한다**. `inlineWidth`(`element.style.width`)까지 직렬화한다는 것은 `test/positioning.smoke.js:204`에서 확인했다 — 이 한 필드가 유일한 비-기하 항목이며, 인라인 폭 변화는 잡되 색·문구·칩 형태는 여전히 잡지 못한다 |
| 도메인 투영 | `test/positioning.smoke.js:497` `migration-v3/01-promote` | 의미를 볼 때는 `collector.add(name, value)`의 `value`에 **도메인 값을 직접 담는다**(`promotedRanges`·`legacyDatePreserved`·`donePreserved`). 등가 판정이 따라야 할 관용구 |
| 날짜의 상대성 | `test/positioning.smoke.js:633` 머리말 + `shiftDateKey()` | 날짜는 전부 `todayKey` 기준 상대값으로 만든다. 고정 날짜는 하네스를 돌리는 날에 따라 케이스를 저절로 뒤집는다 |
| 두 축 판정 | `test/positioning.smoke.js:54` `assert()` + `README.md:250` | **차이**(베이스라인 대비 변화)와 **단언 실패**(베이스라인과 무관)를 가른다. 재베이스라인해도 단언 실패는 사라지지 않는다 |
| 단위 테스트 러너 | — | **없다.** `package.json`도 빌드 단계도 없다. 판정은 `node --check`와 브라우저에서 여는 `test/positioning.smoke.html`뿐이며, 이것이 Validation 절의 형태를 정한다 |

## Design Decisions

작성자 판단이며 사용자 요구가 아니다. UI2가 마이그레이션 방식의 판단을 위임했으므로 DD1~DD4가 그 위임에 답하고 근거를 전부 적는다.

**번호가 비어 있는 자리가 넷 있다 — DD8 · DD17 · DD18 · DD21.** 넷 다 백업 경로의 결정이었고 아래 범위 축소에서 그 마일스톤과 함께 나갔다. 번호를 당겨 메우지 않은 이유는 R0~R5 리뷰 기록과 백로그가 **그 번호로 그 결정들을 가리키고 있어서**, 재번호가 이미 쓰인 참조를 전부 조용히 거짓으로 만들기 때문이다. 빈 번호는 결함이 아니라 이사 간 자리다.

### PRD Open Question 1 해소 — 연속 범위를 관문으로 옮기는 방식

PRD가 **M2 착수 전 답을 요구한** 질문이다: "저장된 기존 일정을 시작 관문 + 종료 관문 둘로 승격하는 것이 자명한가, 아니면 종료 관문 하나만 두는 것이 실제 의도(마감일)에 가까운가." `PRODUCT.calendar.md`도 이것을 "아직 정하지 않은 것(발명하지 말 것)"에 올려 두었다. UI2가 판단을 위임했으므로 아래 넷이 그 답이다.

**DD1 — 관문 집합은 `{startDate, endDate}`의 중복 제거다. 두 갈래 규칙이 아니라 한 줄이다.**

```
gates = uniqueDates([event.startDate, event.endDate]).map(toGate)
```

`startDate === endDate`인 항목은 관문 하나가 되고, 폭이 있는 항목은 둘이 된다. **v2에서 올라온 단일 날짜는 전부 전자에 해당한다** — v3의 DD6이 `startDate = endDate = date`로 승격했기 때문이다. 분기를 쓰지 않고 집합의 중복 제거로 같은 결과를 얻으므로 규칙이 두 개로 갈리지 않는다.

"종료 관문 하나만"을 택하지 않은 이유는 화면이다. PRD는 연속 범위를 **파생값으로 강등**하라고 했지 없애라고 하지 않았고, 파생 규칙은 `min..max`다. 종료 하나만 남기면 5일짜리 띠가 하루로 줄어드는데, 그것은 사용자가 범위 선택 UI로 **의도해서 넣은 정보**를 마이그레이션이 지우는 것이다. UI4는 표면을 재사용하라고 했지 표면이 담던 것을 줄이라고 하지 않았다.

**DD2 — 마이그레이션이 만드는 관문에는 이름이 없다(`kind: null`).**

"시작 관문 + 종료 관문 둘"이 자명하지 **않은** 진짜 이유가 여기다. 관문은 이름을 갖는 것(dev·review·stg·prod·monitor)인데 저장된 데이터에는 이름이 없다. `startDate`를 `dev`라고 부르면 사용자가 입력한 적 없는 사실을 마이그레이션이 만들어 내는 것이고, `PRODUCT.calendar.md`의 "발명하지 말 것"과 "패턴을 새로 발명하지 않는다"를 동시에 어긴다.

`kind: null`은 "관문이긴 한데 어느 관문인지 사용자가 아직 말하지 않았다"를 뜻한다. 저장된 데이터가 단언하는 것은 **날짜 둘**이지 **관문 이름 둘**이 아니며, 이 결정은 그 차이를 정확히 보존한다. 이름은 사용자가 나중에 붙인다.

**DD3 — 마감 상태는 종단 관문(`max(planned)`)에서만 나온다. 이것이 "의미가 바뀐다"를 막는 자리다.**

실측 근거: `getEventDueState()`(`newtab.js:2627-2633`)는 **`endDate`만** 읽는다. `startDate`는 이 확장의 어떤 코드 경로에서도 `overdue`·`today`·`soon`을 만들지 않는다. 즉 **코드가 이미 `endDate`를 유일한 마감으로 취급하고 있다.**

관문 전부가 마감 상태를 만들게 하면 마이그레이션 다음 날 아침에 요약 배너가 **없던 지연 건수를 보고한다** — 지나간 `startDate`가 전부 `overdue`가 되기 때문이다. PRD가 경고한 "저장된 일정의 의미가 바뀐다"가 정확히 이 모습이다. 그래서 마감 상태의 입력을 종단 관문 하나로 고정하고, 그 값은 마이그레이션 전후로 `endDate`와 같다.

사용자가 이름 있는 관문을 직접 만들면 그때부터 각 관문이 자기 마감을 갖는다. 바뀌는 것은 **사용자가 그렇게 하겠다고 말한 뒤**이지 마이그레이션이 아니다.

**DD4 — 연속 범위는 저장하지 않고 `min..max`로 파생하되, 레거시 필드 셋은 남긴다.**

`startDate`·`endDate`·`date`를 지우지 않는다. v3의 DD6과 같은 이유다 — v4를 쓴 뒤 v3 코드로 롤백해도 달력이 그대로 렌더된다. **이 주장이 검증되는 범위를 좁혀 적는다**(R7 invariant F9): 하네스가 실제로 보는 것은 "v3가 읽는 필드 셋이 v4 데이터에 남아 있고 파생값과 일치하는가"이지 "v3 코드를 실제로 돌려 봤는가"가 아니다. 후자는 v3 코드가 교체되므로 이 저장소에서 돌릴 수단이 없다. 그러므로 DD4가 보증하는 것은 **v3가 의존하는 입력이 온전하다**까지이며, 그 이상을 주장하지 않는다. 다만 v3의 함정을 반복하지 않는다: **입력의 옛 필드를 복사하지 않고 관문 집합에서 다시 파생한다**(`startDate := min(planned)`, `endDate := max(planned)`, `date := startDate`). 복사하면 관문을 편집한 뒤 옛 필드가 어긋나 인덱스가 깨진다. `newtab.js:327-329`가 같은 함정을 v3에서 기록해 두었다.

### 나머지 결정

**DD5 — 관문 상태는 `pending` · `done` · `dropped` 셋이고 `dropped`가 범위축소다.** 마일스톤은 "조기·지연·범위축소가 구분되어 남고"를 요구한다. 조기·지연은 날짜 비교로 나오지만 범위축소는 **하지 않기로 한 관문**이므로 날짜로 표현되지 않는다. 관문을 지우면 그 사실이 사라지므로 지우지 않고 `dropped`로 남긴다(UI7: 계획 대비 실제는 저장한다).

**DD6 — 조기·지연은 `actual - planned`의 부호이며 저장만 하고 화면을 갖지 않는다.** 관문은 `planned`(계획일)와 `actual`(실제 완료일, 없으면 `null`)를 갖는다. `actual < planned`가 조기, 반대가 지연이다. UI7이 회고·통계 화면을 금지하므로 이 값을 모아 보여 주는 표면을 만들지 않는다. "결정을 내리는 순간에만 그 자리에서 한 줄로" 나오는 것은 M3 이후의 몫이다.

**DD7 — 프로젝트는 별도 컬렉션이고 이벤트는 `projectId`로 가리킨다. `null`이 무소속이다.** 이벤트 안에 프로젝트 이름을 문자열로 박으면 이름을 고칠 때 전건을 훑어야 하고 그것이 UI8의 "마찰"을 만든다. 저장 키를 하나 늘리고(`calendarProjects`) 참조로 잇는다. 참조가 끊긴 이벤트는 **무소속으로 강등하되 이벤트를 지우지 않는다** — 재생 불가 데이터다.

**DD9 — PRD의 반증 지표는 이름 있는 관문만 센다.** PRD의 "작업당 실제로 쓰이는 관문 수"는 가설을 반증할 수 있어야 하는 지표다. 마이그레이션이 만든 이름 없는 관문을 함께 세면 폭 있는 일정이 많던 사용자는 시작 시점에 이미 평균 2개가 되어 **"1~2개에 머물면 과잉"이라는 반증이 영영 발화하지 못한다.** 세는 대상을 사용자가 이름 붙인 관문으로 좁힌다. DD2의 `kind: null`이 이 구분을 공짜로 준다.

**DD10 — `SETTINGS_VERSION_V3` 상수를 새로 만든 뒤 `SETTINGS_VERSION`을 4로 올린다.** `migrateCalendarToV3()`의 가드는 지금 `SETTINGS_VERSION`을 읽는다(`newtab.js:418`). 상수만 4로 올리면 v3 마이그레이션이 **영영 실행되지 않고**, v2 저장소를 가진 브라우저는 승격 없이 v4 코드를 만난다. `newtab.js:376-377`이 v2에서 같은 함정을 겪고 기록해 둔 바로 그 함정이다. 셋을 각각 자기 상수로 가드해 독립적으로 멱등이 되게 한다.

**DD11 — 이 마일스톤은 전용 셸 게이트를 만들지 않는다.** M1은 판정자가 없어 `verify.sh`를 만들었다. 데이터 계층에는 이미 있다 — `test/positioning.smoke.js`가 마이그레이션을 세 축으로 보는 케이스를 두 벌 갖고 있고 범위·정제·읽기실패 케이스도 있다. 두 번째 판정자를 만들면 같은 계약을 두 자리에서 유지하게 되고, M1 백로그에 이미 그 부채가 둘 적혀 있다(`id=m1-verify-defects`, `id=reanchor-r1-f1`). **선례를 확장하고 발명하지 않는다.**

**DD12 — 관문 프리셋 다섯은 코드 상수이고 편집 UI를 만들지 않는다.** UI9가 다섯을 최소 기준으로 두되 확정하지 말라고 했다. 확정하지 않는 방법은 편집 UI를 여는 것이 아니라 **상수 한 줄로 두어 고치기 싸게 만드는 것**이다. PRD가 메모 종류에 대해 같은 결정을 내렸다: "목록 확장은 코드 상수 수정으로 하고 사용자 편집 UI는 만들지 않는다." 사용자가 한 명이라 편집 UI는 값을 만들지 않는다.

**DD13 — 첫 실행 온보딩은 프로젝트 하나를 만드는 것까지만 한다.** UI8이 온보딩을 M2에 포함하라고 했다. 범위를 넓히면 이 마일스톤이 디자인 수렴을 끌어들이는데, PRD가 마일스톤 경계를 그은 이유가 그것을 막는 것이다. 온보딩은 "프로젝트가 하나도 없을 때" 한 번 뜨는 안내이며 건너뛸 수 있고 흔적을 남기지 않는다 — 무소속이 정상 상태이므로 강제가 아니다.

**DD14 — 되돌릴 수 있는 순서를 Task 배치가 강제한다.** Task 1~2(스키마와 마이그레이션)까지는 화면이 옛 경로로 그대로 돈다. Task 5(렌더 적응)가 첫 비가역 지점이고, 그 앞에 Task 0의 베이스라인과 Task 2의 마이그레이션 케이스가 선다. 온보딩(Task 6)을 렌더(Task 5)보다 **앞**에 두는 안은 기각했다 — 온보딩이 만드는 것은 프로젝트인데, 프로젝트를 읽는 화면이 아직 적응되지 않은 자리에서 그것을 만들면 만들자마자 보이지 않는다. 백업 경로는 이 순서 논의에서 아예 빠졌다(아래 범위 축소) — 그것이 담을 스키마를 Task 1~4가 확정하므로, M2.5는 확정된 스키마 위에서 시작한다.

### L2 리뷰가 되돌려보낸 것 — 판정 축의 재설계 (DD15~DD16)

R0 패널이 `divergent`를 냈다. 정족수를 막은 아홉 건은 사실상 **한 결함**이다 — 플랜이 "diff 0"을 네 자리에서 판정 기준으로 인용하면서 **그 diff를 산출하는 하네스 케이스를 설계하지 않았다.** 코드를 다시 읽으니 결함은 리뷰어가 본 것보다 한 겹 더 깊었다.

**DD15 — 등가 판정은 `snapshot()` diff가 아니라 도메인 투영 `assert()`다.**

`snapshot()`(`test/positioning.smoke.js:191`)이 담는 것은 `widgetType` · `clock` · `calendar` · `search`의 **기하**(rect·display·classes·`inlineWidth`)와 교차 여부뿐이다. 마감 상태도, 칩도, 배너 문구도 담지 않는다. 그러므로 마이그레이션 케이스에 `snapshot()`을 붙였더라도 **DD3이 지키려는 것을 볼 수 없었다** — 마감 의미가 통째로 뒤집혀도 위젯 사각형은 1픽셀도 움직이지 않는다.

하네스가 달력 의미를 실제로 보는 수단은 따로 있다. `collector.add(name, value)`의 `value`에 **도메인 투영**을 담는 방식이며, `migration-v3/01-promote`가 바로 그것이다(`promotedRanges` · `legacyDatePreserved` · `donePreserved` · `calendarWidthCacheCleared`). 등가 판정은 이 관용구를 쓴다.

그리고 **diff가 아니라 `assert()`로 낸다.** diff는 약한 축이다 — 재베이스라인하면 사라진다(`README.md:250`, 하네스 머리말 `54` 근처의 두 축 설명). "마이그레이션 전후로 화면이 같다"는 이 마일스톤의 **핵심 안전 주장**이고, 재베이스라인 한 번으로 지워질 수 있는 자리에 두면 안 된다. 같은 이유로 `runBandInvariance()`(`283`)가 조합 전수 대신 불변식 단언을 쓴다 — 선례가 이미 있다.

**DD16 — v3가 실제로 돌았다는 증인은 340px 캐시 정리다.**

DD10의 함정("상수만 올리면 v3가 영영 실행되지 않는다")은 **최종 자료구조만 봐서는 드러나지 않는다.** v2 데이터를 v4까지 올린 뒤 `gates`가 서 있으면, v3를 건너뛰고 v4가 `date`에서 직접 만들었어도 똑같이 서 있기 때문이다.

v3에만 있고 v4에는 없는 부수효과가 필요하다. 있다 — `migrateCalendarToV3()`는 `searchWidthByWidget.calendar`(M1 시절 340px 카드 폭 캐시)를 지운다. 기존 케이스가 이미 그것을 `calendarWidthCacheCleared`로 관찰하고 있다(`test/positioning.smoke.js:527`). v2 데이터에 그 캐시를 심어 두고 연쇄 마이그레이션 뒤 **사라졌는지**를 단언하면, v3의 실행 여부가 기계적으로 드러난다. v4는 그 키를 건드리지 않으므로 증인이 오염되지 않는다.

### R1 패널이 되돌려보낸 것 — 승격의 단일 출처와 프로젝트 게이트 (DD19~DD22)

R1에서 test 관점은 통과했다(R0의 판정-축 결함은 해소됐다). 대신 security 관점이 **Task 3·6의 요구와 기제 사이의 간극**을 다섯 건 지목했다. 요구는 적혀 있는데 그것을 수행할 함수·서명·순서가 적혀 있지 않다는 것이며, 읽어 보니 맞다.

**DD19 — 마이그레이션 규칙을 순수 함수로 뽑는다. 하네스가 그것을 호출로 관찰할 수 있어야 하기 때문이다.**

`migrateCalendarToV3()`·`migrateCalendarToV4()`는 **저장소에서 읽고 저장소에 쓴다.** 읽기·가드·쓰기가 한 덩어리라 "승격 규칙이 실제로 돌았는가"를 밖에서 관찰할 수단이 없고, DD16의 증인은 정확히 그것을 관찰해야 한다.

**이 결정의 원래 동기는 백업 복구였고, 그 소비자는 이제 M2 밖에 있다**(범위 축소 — 아래 "이 마일스톤이 다루지 않는 것"). 그래도 남긴다: 순수 함수가 없으면 DD16의 spy 단언이 성립하지 않고, 그 단언이 DD10의 함정을 잡는 유일한 기계다. 그리고 백업 마일스톤이 같은 함수를 소비할 것이므로 규칙이 두 자리로 갈라지는 일도 미리 막는다.

순수 함수 둘을 뽑는다: `promoteEventsToV3(events)`와 `promoteEventsToV4(events)`. 저장소 마이그레이션은 읽기·쓰기 껍데기가 되어 이것을 부르고, 백업 마일스톤(M2.5)의 봉투 검사자도 같은 것을 부르게 된다. **승격 규칙의 단일 출처**가 생긴다.

**DD20 — 프로젝트도 생성 게이트를 통과한다. 이벤트에만 화이트리스트를 두는 비대칭을 남기지 않는다.**

`createCalendarProject(input)`을 `createCalendarEvent()`(`newtab.js:304`)와 같은 형태로 만든다 — 화이트리스트 대입(prototype pollution 차단), `name` 길이 상한과 절단, `id` 부재 시 `crypto.randomUUID()`, 타임스탬프 강제, 필수값 부재 시 `null` 반환. `MAX_PROJECTS`와 `MAX_PROJECT_NAME_CHARS`를 상수로 둔다. 항목 수 상한 `MAX_PROJECTS`는 프로젝트를 **추가하는 경로**가 확인한다 — 초과하면 만들지 않고 알린다. 파일에서 프로젝트 **배열**을 통째로 받아 검사하는 봉투 검사자(`sanitizeImportedProjects()`)는 **M2에 소비자가 없다** — 이 마일스톤의 가져오기는 이벤트만 받는다(`newtab.js:4075`가 `sanitizeImportedEvents()` 하나만 부르고 `replaceEvents()`는 `calendarEvents`만 교체한다). 소비자 없는 함수를 만들면 검사받지 않는 채로 굳으므로 백업 마일스톤으로 함께 넘긴다. **여기서 닫는 것은 생성 게이트이고**, 그것만으로 프로젝트가 검사받지 않는 통로가 되는 일은 M2 안에서 막힌다.

이것이 없으면 프로젝트가 유일하게 **검사받지 않는 입력 통로**가 된다 — 이벤트에는 생성 게이트가 있고 프로젝트에는 없는 비대칭이 그 통로이며, 백업 마일스톤이 파일에서 프로젝트를 읽어 올 때 그 구멍이 실제 입력을 만난다.

**DD22 — `persistEvents()`는 선택적 `nextProjects`를 받아 한 번의 `set()`으로 둘을 커밋한다.**

Task 3이 "이벤트와 프로젝트가 같은 스냅샷 경로를 공유한다"를 요구하는데 현재 서명은 `persistEvents(nextEvents, options)`이고 프로젝트를 받을 자리가 없다(`newtab.js:2146`). 서명을 바꾸는 대신 `options.nextProjects`(선택)를 더한다 — 있으면 `storage.set({ calendarEvents, calendarProjects })`로 **두 키를 한 번에** 커밋하고, 없으면 지금과 완전히 같다.

호출부를 전부 고치는 개명(`persistSnapshot`)은 기각했다. 원자성은 `set()` 호출이 하나라는 사실에서 나오지 이름에서 나오지 않으며, 서명을 바꾸면 `opSeq` 토큰·`loadFailed` 잠금·롤백 규약을 쓰는 기존 호출부 전부가 회귀 위험에 들어간다. 롤백 규약은 그대로다 — `set()`이 resolve하기 전에는 메모리·인덱스·DOM 어느 것도 건드리지 않으므로 실패 시 둘 다 롤백된다.

### R1 invariant 관점 — 무엇을 기계화할 수 있고 무엇을 할 수 없는가 (DD23)

R1의 invariant 관점은 여섯 건을 냈고 **전부 한 문장의 변주**다: 이 저장소에는 CI도 커밋 훅도 테스트 러너도 없으므로 모든 게이트가 기제가 아니라 문장이다. 지적은 옳다. 그러나 여섯 건이 요구하는 것을 하나로 뭉뚱그리면 답을 그르친다 — **절반은 지금 당장 기계화되고, 절반은 이 저장소에서 원리적으로 불가능하다.** 갈라서 답한다.

**DD23 — 존재와 앵커는 기계가 검사한다. 수행은 검사할 수 없고, 검사할 수 있는 척하지 않는다.**

*기계화하는 것 (F1·F3·F4·F6에 답한다).* "누군가 함수를 만들지 않고도 체크박스를 칠 수 있다"는 지적은 **맞고, 고칠 수 있다.** 판정 함수의 **존재**와 베이스라인 **앵커**는 파일을 읽으면 알 수 있으므로 셸 한 줄이면 된다. Validation 절에 검사 블록을 둔다 — `grep -q`로 이 마일스톤이 약속한 함수 여섯이 실제로 코드에 있는지 보고, `shasum -c`로 Task 0이 적어 둔 해시가 지금 파일과 맞는지 본다. 통과하지 못하면 Acceptance를 칠 수 없다.

이것은 DD11을 어기지 않는다. DD11이 만들지 않기로 한 것은 **두 번째 판정자**이며, 여기 있는 것은 판정이 아니라 **존재 확인**이다. 등가 단언이 참인지는 여전히 하네스만 안다. 이 블록은 "하네스에 그 단언이 아예 없는" 경우를 잡을 뿐이고, 그것이 R1이 지목한 fail-open의 실제 모양이다.

*기계화할 수 없는 것 (F2·F5의 잔여).* "사람이 브라우저에서 하네스를 실제로 돌렸는가"는 이 저장소에서 **증명할 수단이 없다.** 하네스는 `test/positioning.smoke.html`을 브라우저에서 열어야 돌고, 러너가 없으므로 CI가 그것을 대신할 수 없다. 스크린샷이나 붙여넣은 출력을 요구하는 방법은 있으나, 위조가 체크박스를 치는 것보다 어렵지 않으므로 **강제가 아니라 의례**가 된다.

그래서 그 자리에는 기제를 두지 않고 **사실을 적는다.** Validation 절이 "게이트가 커밋을 막지 못한다"를 적고 Task 0이 "절차 규칙이고 기계적 강제가 없다"를 적는 이유가 그것이다. R1은 그 두 문장을 결함의 증거로 인용했는데, 그것은 **문제를 감추지 않은 흔적**이지 문제를 만든 원인이 아니다. 막을 수 없는 것을 막는다고 쓰는 편이 훨씬 나쁘다 — 그때 게이트는 닫힌 것처럼 보이면서 열려 있고, R1이 F3에서 정확히 그 모양을 경고했다.

*이 잔여를 줄이는 유일한 진짜 방법*은 이 마일스톤 밖에 있다 — 러너를 도입해 하네스를 헤드리스로 돌리는 것이다. 데이터 모델 4차 변경과 같은 커밋에 넣으면 두 위험이 곱해지므로 여기서 하지 않는다. **백로그로 남긴다**(`.claude/plans/codex-findings-backlog.md`).

### R2 패널이 되돌려보낸 것 — 판정의 층위와 불변식의 주인 (DD24~DD27)

R2에서 security는 통과했다(R1의 백업 기제 간극이 해소됐다). 대신 architect가 CRITICAL 하나를 포함해 다섯, test가 HIGH 둘, invariant가 일곱을 냈다. **그중 둘은 내가 R1을 흡수하면서 새로 만든 결함이다** — R0가 막은 것이 "판정 기제를 선언만 하고 만들지 않았다"였는데, 그것을 고치면서 같은 종류를 두 개 더 만들었다. 아래는 실행 가능한지 먼저 확인하고 적는다.

**DD24 — 판정은 세 층위이고 각 층위가 잡는 것이 다르다. 어느 하나도 다른 것을 대신하지 못한다.**

R2 invariant F1이 옳다 — `grep`은 **빈 스텁도 통과시킨다.** 존재 확인을 행동 검증인 것처럼 적으면 그것이야말로 "닫힌 것처럼 보이는 열린 게이트"다. 층위를 갈라 적는다.

| 층위 | 무엇을 잡는가 | 어디서 도는가 | 잡지 못하는 것 |
|---|---|---|---|
| **존재** — `grep -qE` | 약속한 함수가 **아예 없는** 경우 | 셸, 즉시 | 스텁·잘못된 구현 |
| **호출** — spy 래퍼 | 함수는 있는데 **아무도 부르지 않는** 경우 | 하네스 | 부르지만 틀린 구현 |
| **행동** — `assert()` | 불러서 나온 값이 **틀린** 경우 | 하네스 | 사람이 하네스를 안 돌린 경우(DD23의 잔여) |

빈 스텁은 존재 층위를 통과하지만 **행동 층위에서 반드시 죽는다** — 등가 단언이 실제 값을 비교하기 때문이다. 그러므로 존재 검사는 값싼 사전 여과이지 판정이 아니며, 이 플랜은 그렇게만 주장한다.

`grep` 패턴도 고친다. R2 architect F4가 지적한 대로 `function $fn`은 화살표 함수·메서드 축약을 놓친다. Validation 절은 선언 형태 여섯(`function` · `async function` · `const`/`let`/`var` 대입 · 메서드 축약)을 전부 잡는 정규식을 쓴다.

**DD25 — 같은 날짜에 관문이 둘 이상 설 수 있다. `uniqueDates`는 마이그레이션에만 적용된다.**

R2 architect F5가 DD1의 `uniqueDates`와 Task 1·4의 자유로운 관문 생성 사이의 모순을 지목했다. 모순이 아니라 **범위를 안 적은 것**이다. 명시한다 — `uniqueDates`는 `{startDate, endDate}` 둘을 접는 **마이그레이션 규칙**이고(폭 없는 일정이 관문 둘을 갖지 않게 하는 것이 목적), 사용자가 만드는 관문에는 적용되지 않는다. 같은 날 `dev`와 `review`가 함께 서는 것은 **실제 업무 모양이고 이 마일스톤이 담으려는 것**이다. 중복 제거를 사용자 입력에 걸면 그것을 지운다.

단, `kind`가 **둘 다 `null`인** 같은 날짜 관문은 구별할 수단이 없으므로 만들지 않는다 — 편집기가 이름 없는 관문을 같은 날에 두 번 만들지 못하게 막는다.

**DD26 — 파생 필드의 유지 지점은 `deriveEventRange()` 하나이고, 부르는 자리는 셋이다.**

R2 architect F2가 옳다 — DD4가 "파생값"이라고 정했는데 **누가 언제 다시 파생하는지**를 어느 Task도 함수 이름으로 지목하지 않았다. 그러면 `startDate ≠ min(gates)`인 이벤트가 존재할 수 있는 창이 열리고, 그 창의 크기는 아무도 모른다.

`deriveEventRange(event)`를 만든다 — `gates`에서 `startDate = min(planned)` · `endDate = max(planned)` · `date = startDate`를 다시 계산해 **같은 객체에 박고 그 객체를 돌려준다.**

부르는 자리는 **셋**이다. R3 architect가 CRITICAL 둘로 지목한 것이 이 목록의 이전 판이며, 그 판은 **둘이라고 적어 놓고 셋째를 빠뜨렸다** — 그리고 빠진 셋째가 하필 마이그레이션 경로였다.

1. `createCalendarEvent()`의 마지막 — 입력을 받아 이벤트를 만드는 모든 자리
2. 관문을 변형하는 모든 CRUD의 커밋 직전 — Task 4
3. **`promoteEventsToV4()`가 각 이벤트를 돌려주기 직전** — DD19가 이 함수를 **순수 함수**로 뽑았으므로 `createCalendarEvent()`를 지나지 않는다. 1번이 마이그레이션까지 덮는다고 적었던 것은 **거짓이었다**: 순수 승격은 `gates`를 직접 세우고 그대로 반환하므로, 셋째 호출이 없으면 `startDate ≠ min(planned)`인 이벤트가 저장소에 커밋된다

불변식은 이렇게 적어야 참이 된다 — **`gates`를 만들거나 바꾼 함수는 반환 직전에 `deriveEventRange()`를 부른다.** 함수를 기준으로 세지 말고 `gates`를 만진 사실을 기준으로 센다.

**셋을 무엇이 판정하는지도 적는다**(R8 test F5 — 세 자리가 여러 Task 의 Validate 에 흩어져
있어 어느 케이스가 어느 자리를 보는지가 암묵이었다). 한 케이스가 셋을 다 보지 않는다.

| # | 호출 자리 | 만드는 Task | 판정 케이스 | 층위 |
|---|---|---|---|---|
| 1 | `createCalendarEvent()` 마지막 | Task 1 | `runCalendarGateCases` (Task 4) · 기존 `sanitize/**` | 결과 |
| 2 | `addGate`·`updateGate`·`removeGate` 커밋 직전 | Task 4 | `runCalendarGateCases` | 호출(spy) + 결과 |
| 3 | `promoteEventsToV4()` 반환 직전 | Task 2 | `runCalendarV4MigrationCases` | 호출(spy) + 결과 |

셋 **전체**를 한 번에 훑는 값싼 사전 여과는 Validation 2b 의 호출 자리 검사다 —
`deriveEventRange(` 가 4회(선언 1 + 호출 3) 미만이면 자리 하나가 비었다는 뜻이고,
그것은 사람이 브라우저를 열기 전에 셸이 잡는다.

**DD27 — 프로젝트 쓰기는 `persistProjects()` 하나를 통과한다. 선택적 인자에 규율을 맡기지 않는다.**

R2 architect F3이 DD22의 실질적 위험을 지목했다 — `options.nextProjects`가 **선택적**이면 프로젝트 CRUD가 그것을 빠뜨렸을 때 변경이 조용히 사라지고, 아무것도 그것을 잡지 못한다. "호출자가 잘 넘긴다"는 규율은 코드 구조가 아니다.

`persistProjects(nextProjects)`를 둔다 — 내부에서 `persistEvents(this.events, { nextProjects })`를 부르는 얇은 껍데기다. 프로젝트를 바꾸는 모든 경로는 이것만 부르고 `persistEvents`를 직접 부르지 않는다. 원자성은 DD22 그대로(한 번의 `set()`)이고, 빠뜨릴 수 있는 인자가 **호출부에서 사라진다.**

**DD27a — 프로젝트 목록을 읽지 못했으면 프로젝트를 쓰지 않는다.** (santa R0 B3, CRITICAL)

`loadEvents()`가 손상된 저장값을 읽으면 쓰기를 봉인하고 전체 교체만 남긴다(`newtab.js:2062`·`2151`). **프로젝트 쪽에는 그 봉인이 없었다.** `loadProjects()`가 실패해 `projectsLoadFailed`가 서고 `this.projects`가 `[]`로 남은 상태에서 사용자가 프로젝트를 하나 만들면, `persistProjects([새것])`이 `calendarProjects`를 그 한 건으로 **덮어써서 읽지 못했을 뿐 멀쩡히 있던 목록 전체가 사라진다.** `reconcileProjectRefs`의 `projectsLoaded` 인자는 이 경우를 막지 못한다 — 그것이 지키는 것은 이벤트의 `projectId` 강등이지 프로젝트 목록 자체가 아니다.

`persistProjects()`는 **첫 줄에서 `this.projectsLoadFailed`를 보고 참이면 쓰지 않고 `false`를 돌려준다.** 이벤트 쪽과 같은 판단이고 같은 이유다 — 읽지 못한 것을 덮어쓰지 않는다. 봉인을 푸는 유일한 경로는 이벤트 쪽과 동형인 **전체 교체**이며, 그 경로는 M2.5의 복구가 만든다 — M2에서는 봉인만 세우고 해제 수단을 만들지 않는다. 그것이 이 마일스톤이 감당할 수 있는 정직한 범위다.

**생성 게이트는 읽기 검증자가 아니다** (santa R2 B1, CRITICAL). 아래 "부분 손상도 읽기 실패다"가 봉인의 조건을 `createCalendarProject()`의 `null` 반환에 걸었는데, **그 함수는 `id`가 없으면 `null`을 돌려주지 않고 `crypto.randomUUID()`로 새로 만들어 준다**(DD20). 그래서 `id`를 잃고 `name`만 남은 행은 — 봉인이 걸려야 마땅한 손상인데 — 조용히 **새 id를 달고 되살아나고** `projectsLoadFailed`는 거짓으로 남는다. 그 사이 이벤트들은 **옛 id**를 들고 있으므로 다음 강등이 `{ projectsLoaded: true }`로 돌면서 전건 무소속이 된다. 봉인을 넓히려던 수정이 봉인을 우회하는 구멍을 그대로 남겨 둔 셈이다.

원인은 하나다 — **id 자동 생성은 만들 때의 규칙이지 읽을 때의 규칙이 아니다.** 새 프로젝트를 만들 때 id가 없는 것은 정상이고(아직 안 정해졌다) 저장된 행에 id가 없는 것은 손상이다. 같은 함수가 둘을 구별할 수 없으므로 `loadProjects()`가 **생성 게이트에 넘기기 전에** 스스로 본다: `typeof row.id === 'string'`이고 비어 있지 않은가. 아니면 그 행은 읽지 못한 것으로 세고(아래 규칙에 따라 봉인) 생성 게이트에 넘기지 않는다. 가져오기(`sanitizeImportedProjects` 경로)는 남의 파일에서 온 것이라 id를 새로 만드는 것이 맞으므로 이 검사를 **적재 경로에만** 둔다.

**부분 손상도 읽기 실패다** (santa R1 B2, CRITICAL). R0에서 이 결정을 쓸 때 봉인의 발동 조건을 "값이 배열이 아닌 것"으로만 두었다. 그런데 Task 3은 읽은 배열의 각 항목을 `createCalendarProject()`에 통과시키고 **`null`을 버린다.** 그래서 배열은 맞는데 항목 하나가 손상된 경우 — `projectsLoadFailed`는 **거짓**으로 남고, `this.projects`는 그 하나가 빠진 채로 서고, 다음 `persistProjects()`나 `replaceEvents()`가 `{ projectsLoaded: true }`로 **정상 읽기라고 선언하며** 강등을 돌린다. 버려진 프로젝트를 가리키던 이벤트가 전건 `projectId: null`이 되고, 저장소에는 그 프로젝트가 **멀쩡히 있는데도** 그렇게 커밋된다.

이것은 R9 security F3이 잡았던 "빈 목록으로 강등"과 **같은 결함의 부분 버전**이고, 그 답이 부분 손상을 덮지 못했다. 규칙을 하나로 적는다 — **`createCalendarProject()`가 `null`을 돌려준 항목이 하나라도 있으면 `projectsLoadFailed = true`를 세운다.** 저장된 것을 온전히 읽지 못했다는 사실이 봉인의 조건이지, 못 읽은 양이 얼마인가가 아니다. 버린 항목 수는 콘솔에 고지한다(`migrateCalendarToV3()`의 `catch` 고지와 같은 자리, 같은 판단).

**DD27c — 프로젝트 실패를 사람에게 말하려면 `applyStorageNotice()`를 늘려야 한다. 부르는 것만으로는 아무 말도 하지 않는다.** (santa R1 B3, HIGH)

DD27a를 처음 쓸 때 "호출부는 `false`를 받으면 `applyStorageNotice()`로 고지한다(`newtab.js:459`)"고 적었다. **그 함수는 그 말을 할 수 없다.** 현재 서명은 `applyStorageNotice({ migrationFailed })` 하나이고 내는 문구는 셋뿐이다 — 미리보기 저장소 · 저장소 없음 · 설정 마이그레이션 실패. 프로젝트 읽기 실패도, 프로젝트 쓰기 실패도 담을 자리가 없다. 시키는 대로 부르면 **사용자는 아무 고지도 못 받고** 프로젝트가 없는 화면이나 되돌아간 변경만 본다.

`applyStorageNotice(state)`의 `state`에 `projectsLoadFailed`를 더하고 문구 하나를 잇는다 — `'프로젝트 목록을 읽지 못했습니다 · 프로젝트 변경이 잠겨 있습니다'`. `messages` 배열에 밀어 넣는 기존 형태 그대로이고 새 표면을 만들지 않는다(UI4). `Application.initialize()`가 `loadProjects()` 뒤에 그 값을 넘긴다.

쓰기 실패는 다르게 다룬다 — 그쪽은 상시 고지가 아니라 **그 순간의 오류**이므로 `persistEvents()`가 이미 쓰는 `this.showError()`(`newtab.js:2177`)를 탄다. 프로젝트 쓰기는 `persistEvents()`를 통과하므로(DD27) 그 경로가 자동으로 붙고, 따로 만들 것이 없다. **상시 상태는 `applyStorageNotice`, 일회성 실패는 `showError` — 이 저장소가 이미 쓰고 있는 갈래를 그대로 따른다.**

**DD27b — `this.projects` 대입은 `persistEvents()` **안**, `this.events` 대입 바로 옆이다.** (santa R0 B4 · **santa R1 B1이 R0의 답을 반려했다**, CRITICAL)

R0에서 이 결정을 처음 쓸 때 "`persistProjects()`가 `persistEvents(...)`의 반환값이 참일 때에만 `this.projects`를 대입한다"고 적었다. **그 답은 틀렸고, 두 겹으로 틀렸다.**

1. **`persistEvents()`는 `async`다**(`newtab.js:2146`). `const ok = this.persistEvents(...)`는 `Promise`를 받고 `if (ok)`는 **언제나 참**이다. 쓰기가 실패해도 `this.projects`가 갈아 끼워진다 — 이 결정이 막으려던 바로 그 일이 일어난다
2. `await`를 붙여 1번을 고쳐도 남는다. `persistEvents()`는 성공 경로에서 **반환하기 전에 `this.render()`를 부른다**(`newtab.js:2170`). 그러므로 `await` 뒤의 대입은 렌더보다 늦고, 이름을 바꾸거나 프로젝트를 지운 직후의 화면이 **옛 목록으로 그려진다.** 다음 렌더까지 그대로 남는다

두 겹 다 **대입을 `persistProjects()`에 둔 것**에서 나온다. 자리를 옮기면 둘 다 사라진다 — `persistEvents()`가 `options.nextProjects`를 받았을 때, 성공 블록에서 `this.events = nextEvents` **바로 다음, `this.render()` 앞에** `this.projects = options.nextProjects`를 한다. `opToken !== this.opSeq` 재입력 가드와 `catch`의 자동 롤백을 이벤트와 **똑같이** 탄다.

```js
// persistEvents() 성공 블록 (newtab.js:2160 부근)
this.events = nextEvents;
if (options && options.nextProjects) this.projects = options.nextProjects;   // DD27b
this.pending = null;
// ... 이하 기존 그대로, this.render() 는 이 뒤에 있다
```

그러면 `persistProjects()`는 다시 얇아진다 — `async`이고, DD27a 가드 뒤에 `return this.persistEvents(...)` 하나다. **이것이 DD22 원자성이 실제로 뜻하는 바다**: 한 번의 `set()`으로 커밋되고, 같은 조건으로 메모리에 반영되고, **같은 렌더에 보인다.** 셋 중 하나라도 갈라지면 원자적이지 않다.

**DD28 — 끊긴 `projectId`를 되돌리는 자리도 하나다. `reconcileProjectRefs()`가 그것이다.**

DD7이 "참조가 끊긴 이벤트는 무소속으로 강등한다"를 정했는데, **누가 그것을 하는지**를 어느 Task도 함수 이름으로 지목하지 않았다. DD26이 파생 필드에서 고친 것과 **정확히 같은 종류의 빠짐**이다 — 결정에만 있고 지시에 없는 요구는 구현되지 않는다. 강등 지점이 둘 이상이면 호출부 규율에 맡기는 것이 되어 DD27이 거부한 모양으로 돌아간다.

끊기는 경로는 M2 안에 **둘**이다.

1. **프로젝트 삭제**(Task 3) — 지운 프로젝트를 가리키던 이벤트가 남는다. 이쪽은 플랜이 이미 요구하고 있었다
2. **가져오기**(`newtab.js:4075`) — **이쪽은 아무도 보지 않고 있었다.** `sanitizeImportedEvents()`가 만든 이벤트는 남의 파일에서 온 `projectId`를 갖는데, `replaceEvents()`는 `calendarEvents`만 교체하고 `calendarProjects`는 건드리지 않는다(`newtab.js:2311`). 그래서 가져오기 직후, 이 저장소에 존재하지 않는 프로젝트를 가리키는 이벤트가 **전건** 생긴다. `createCalendarEvent()`는 이것을 대신할 수 없다 — 화이트리스트는 값의 **형식**을 보지 **존재**를 보지 않으며, 애초에 프로젝트 목록을 모른다

`reconcileProjectRefs(events, projects, { projectsLoaded })`를 만든다 — `projects`에 없는 `projectId`를 `null`로 내리고 **새 배열을 돌려준다**. 셋째 인자는 필수이고 부재 시 `false`로 읽는다. **그리고 진입부에서 `typeof projectsLoaded !== 'boolean'`이면 던진다**(santa R5 A 제안) — fail-closed 기본값은 빠뜨려도 **안전하지만** 빠뜨린 사실을 영영 숨기고, R1·R2가 두 번 다친 자리가 정확히 그 모양이었다(서명은 바뀌었는데 호출부가 안 따라온 것을 아무것도 알려 주지 않았다). 이 저장소의 다른 방어선은 전부 문서 규약이므로 여기 하나는 실행 시점에 세운다(Task 3이 계약을 적는다)(`persistEvents()`의 in-place 금지 규약, `newtab.js:2140`).

부르는 자리는 **호출부가 아니라 병목 둘**이다. DD27이 `options.nextProjects`에 대해 내린 판단과 같다 — "삭제 경로가 부른다"·"가져오기 경로가 부른다"로 적으면 그것은 규율이지 구조가 아니고, 빠뜨릴 수 있는 자리가 남는다. 둘 다 `CalendarManager` 안에 이미 있는 관문에 넣는다.

1. `persistProjects(nextProjects)` **안** — 프로젝트를 바꾸는 유일한 쓰기 경로이므로(DD27) 삭제·이름 변경·생성이 전부 여기를 지난다. 본문 한 줄이 그 자체로 불변식이다: `this.persistEvents(reconcileProjectRefs(this.events, nextProjects, { projectsLoaded: !this.projectsLoadFailed }), { nextProjects })`. 줄어든 프로젝트와 강등된 이벤트가 **같은 `set()`으로** 커밋되므로 부분 상태가 생기지 않는다
2. `replaceEvents(nextEvents)` **안** — 가져오기의 유일한 관문이다(`newtab.js:2311`). `persistEvents`에 넘기기 전에 `reconcileProjectRefs(nextEvents, this.projects, { projectsLoaded: !this.projectsLoadFailed })`를 통과시킨다. UI 핸들러 `handleCalendarImport()`(`newtab.js:4064`)는 **고치지 않는다** — 참조 무결성을 UI가 알아야 할 이유가 없다 불변식은 DD26과 같은 형태로 적어야 참이 된다 — **`projects`를 줄이거나 `events`를 밖에서 들여온 경로는 커밋 직전에 `reconcileProjectRefs()`를 부른다.**

**이벤트를 지우지 않는다**(DD7) — 재생 불가 데이터다. 그리고 **강등 건수를 콘솔에 고지한다**: 가져오기 한 번으로 프로젝트 소속이 통째로 사라지는 것은 사용자가 알아야 하는 변화이고, `migrateCalendarToV3()`의 `catch` 고지가 같은 자리에서 같은 판단을 한다. 조용히 넘기지 않는다.

### R6 패널이 되돌려보낸 것 — 산문은 지시가 아니다 (DD29)

**DD29 — Task Action은 "만드는 것"과 "고치는 것"의 목록으로 시작한다. 요구를 산문 안에 두지 않는다.**

R6에서 security는 통과했다. 나머지 셋이 낸 열 건 중 **다섯이 문자 그대로 같은 지적**이다 — `createCalendarGate`(test F5) · `spyOn`(test F2, CRITICAL) · `promoteEventsToV3` 추출(test F4) · `deriveEventRange`의 첫째 호출(test F1, CRITICAL) · 등가 케이스의 고정 입력(test F3). 다섯 다 **플랜에 이미 적혀 있었다.** 리뷰어가 인용한 행이 곧 Task Action 본문이고, `createCalendarGate`의 경우 리뷰어는 "이 함수도 이 Task가 만든다"를 인용한 뒤 "만들라고 적혀 있지 않다"고 적었다.

리터럴로는 리뷰어가 틀렸다. 그런데 **다섯 번 같은 자리에서 틀렸다면 그것은 리뷰어의 문제가 아니다.** Task Action이 서술과 지시를 같은 산문에 섞어 두었고, 그 안에서 "부르므로"·"통과시킨다"·"뽑는다"가 관찰인지 명령인지는 읽는 사람이 판단해야 했다. 구현자도 같은 판단을 해야 한다 — 그리고 R4가 CRITICAL로 잡은 실제 결함(`promoteEventsToV4`의 `deriveEventRange` 호출 누락)이 정확히 그 판단이 어긋나서 생긴 것이다. **플랜 자신의 규칙이 "결정에만 있고 지시에 없는 요구는 구현되지 않는다"인데, 지시를 서술처럼 보이게 써 두었다면 규칙을 반만 지킨 것이다.**

그래서 형태를 바꾼다. Task 0·1·2·3·5의 Action은 **번호 매긴 "새로 만드는 것"과 "고치는 것" 목록으로 시작하고**, 근거와 세부는 그 아래에 잇는다. 목록에 없으면 이 Task의 산출물이 아니고, 목록에 있으면 완료 조건이다. 판정은 세 층위 그대로다(DD24) — 이 목록은 **존재** 층위와 일대일로 맞고, Validation 절의 `grep` 대상이 곧 이 목록이다.

**이것은 내용 변경이 아니라 형태 변경이다.** 요구 하나도 새로 생기지 않았고 하나도 사라지지 않았다. 유일한 내용 변경은 architect F1이 지목한 자리 — DD28의 가져오기 호출 지점이 "가져오기 경로도 부른다"까지만 적혀 있었고, 어디에 넣는지가 없었다. 그것은 진짜 빠짐이었고 병목 둘로 답했다(위 DD28).

**DD30 — 같은 결함이 같은 문서의 다른 절에 남아 있었다. Acceptance 도 목록 안에서 판정자를 밝힌다.**

DD29 가 Task Action 에서 고친 것은 "요구가 산문 안에 있어 지시인지 서술인지 읽는
사람이 판단해야 한다"였다. R7 은 그 처치가 들었음을 보여 준다 — architect 는 HIGH 에서
MEDIUM 으로, test 는 CRITICAL 둘에서 0 으로 내려갔다. 그런데 **invariant 가 같은 결함을
다른 절에서 찾아냈다**(F6·F8): Acceptance 는 강제력 설명을 목록 **뒤** 문단에 두었고,
체크박스를 치는 사람은 목록을 읽지 그 뒤 문단을 읽지 않는다.

내용은 처음부터 맞았다 — 그 문단은 R2 invariant F6 을 흡수하며 들어온 것이고 기계와
사람을 정확히 갈라 적는다. 틀린 것은 **그 정보가 놓인 자리**다. 그래서 판정자를 항목
앞으로 옮겼다: `[기계]` · `[사람]` · `[기계+사람]`. 열일곱 중 열하나가 `[사람]` 이라는
사실이 이제 목록을 훑기만 해도 보인다.

**이것으로 강제되지 않는 스물아홉이 강제되지는 않는다.** 바뀐 것은 그 스물아홉이 강제되지
않는다는 사실을 **숨기기 어려워졌다**는 것뿐이고, 그것이 이 저장소에서 가능한 전부다
(DD23). R7 invariant 가 낸 열 건 중 다섯(F1·F2·F4·F6·F8)이 "플랜이 강제 불가를 스스로
적어 놓고 체크박스로 올렸다"의 변주였는데, 그중 실제로 고칠 수 있는 잔여는 이 배치
하나였고 나머지는 잡는 척 적으라는 요구다 — 그것이 M1 DD20 이 고친 결함이다.

### santa R0 이 되돌려보낸 것 — 점유는 파생 범위가 아니라 관문이다 (DD31)

**DD31 — `rebuildIndex()`는 파생 `min..max`가 아니라 `gates[].planned`로 셀을 채운다.**

santa R0의 B2(CRITICAL)가 **플랜과 PRD가 M2의 헤드라인 결과물에서 어긋나 있다**고
냈고, 확인해 보니 맞았다. 플랜은 Task 5에 "`rebuildIndex()`가 관문 집합을 버킷화하되
**파생 범위로 셀을 채우는 현재 동작을 유지한다**"고 적어 두었는데, PRD는 32행에서
문제 정의로 "하나의 작업이 월·수에 걸치고 화요일에는 다른 작업을 하는 식으로
**불연속하게** 배치된다"를 들고 96행에서 M2의 결과로 "**불연속 배치**와 겹침이 그대로
표현된다"를 요구한다. 파생 범위로 칠하면 월·수 관문이 화요일을 칠하고, 그것은 PRD가
든 바로 그 예를 정확히 반대로 그리는 것이다.

**틀린 쪽은 플랜이었다.** DD4가 연속 범위를 파생값으로 강등한 것은 v3 롤백용 잔존
필드를 남기기 위해서이지 **점유의 근거로 삼기 위해서가 아니다.** 잔존 필드를 점유
계산에 쓰면 강등이 이름만 강등이 된다 — 저장은 관문으로 하면서 화면은 여전히 범위로
말하므로, 사용자가 보는 것은 M1과 같다.

`rebuildIndex()`가 이벤트마다 `event.gates`를 돌며 `g.planned` 하나하나를 버킷에
넣는다. 파생 `startDate`·`endDate`는 인덱스 입력에서 빠지고 DD4가 정한 원래 용도
(v3 롤백 입력)로 돌아간다. `dropped` 관문도 버킷에 들어간다 — 계획은 남는다는 것이
Task 4의 판단이고 여기서 뒤집지 않는다.

**이것은 UI4를 넘지 않는다.** 바뀌는 것은 "어느 셀을 채우는가" 하나이고 새 색·새 칩
모양·새 아이콘·새 상시 표면이 생기지 않는다. 관문을 **어떻게 보일 것인가**는 그대로
M3의 몫이다(DD31의 경계는 Summary에 한 문장으로 적었다).

**대가를 숨기지 않는다 — 등가 단언을 다시 써야 한다.** DD15의 `runCalendarV4EquivalenceCases()`는
"마이그레이션 전후 도메인 투영이 **일치**한다"를 단언하는데, 그 투영에 셀별 칩 수와
버킷 키 목록이 들어 있다. 폭 있는 이벤트는 이제 그 둘이 **의도적으로** 달라지므로
등가 단언을 그대로 두면 이 변경이 성공했을 때 죽는다. Task 5가 투영을 두 무리로
가르고 각각 다른 것을 단언하게 고친다 — 자세한 것은 그 자리에 적었다.

## 이 마일스톤이 다루지 않는 것 — 백업 경로의 분리

**백업 내보내기와 복구는 M2에서 빠졌고 자기 마일스톤을 갖는다.** PRD의 M2 행이 원래 그것을 포함했으므로 PRD도 함께 고쳤다(새 행 "잃어버린 데이터를 되돌릴 수 있다").

**왜.** L2 패널을 네 번 돌리는 동안 정족수가 2/4 → 2/4 → 1/4 → 0/4로 갔다. 마지막 라운드의 CRITICAL 넷 중 셋이 백업 경로에서 나왔고, 그 경로 하나가 설계 결정 여섯(DD8·DD17·DD18·DD21 그리고 DD19·DD22의 절반)을 끌고 들어왔다. 결정들이 서로를 부수기 시작했다 — 순수 승격 함수(DD19)와 파생 유지 지점(DD26)이 정면으로 모순됐고, 프로젝트 원자 커밋(DD22·DD27)을 만들어 놓고 복구는 프로젝트를 받지 못하는 `replaceEvents()`를 쓰게 남겨 뒀다. **한 마일스톤이 어려운 문제 둘을 지고 있었다** — 데이터 모델 이행과 백업·복구 하위 시스템은 각자 검토받아야 한다.

**UI3을 어기지 않는다.** UI3은 백업이 *무엇이어야 하는가*를 정했지("되돌릴 수 없으면 백업이 아니다") *언제*를 정하지 않았다. PRD의 요구는 "메모(M4) 착수 전에 반드시 존재하게 한다"이고, 분리된 마일스톤이 M4 앞에 서므로 그 요구는 그대로 지켜진다.

**대가를 적는다.** 저장소 축출 위험은 M2 동안 **완화되지 않은 채로 남는다**(위 Risks). 재생 불가 데이터에 백업이 없는 기간이 한 마일스톤만큼 길어진다는 뜻이고, 그것이 이 분리의 값이다.

**빠진 것의 목록** — 다음 마일스톤이 받는다: 봉투 검사자 `sanitizeImportedBackup()`(DD18) · 복구 직전 자동 내보내기(DD17) · 복구 시 끊긴 참조 강등(DD21) · 백업 왕복과 읽기 실패 복구 케이스 · `replaceEvents()`가 프로젝트를 함께 커밋하도록 넓히는 일(R3 security CRITICAL) · 프로젝트 **배열**을 파일에서 받아 검사하는 봉투 검사자 `sanitizeImportedProjects()`(DD20 — M2의 가져오기는 이벤트만 받으므로 소비자가 없다). `promoteEventsToV3/V4`(DD19)와 `createCalendarProject()`(DD20)는 **M2에 남는다** — 전자는 DD16의 spy 증인이 요구하고, 후자는 프로젝트가 M2에 있기 때문이다.


## Files to Change

| File | Action | Why |
|---|---|---|
| `newtab.js` | UPDATE | 데이터 모델 v4(`gates[]`·`projectId`), `SETTINGS_VERSION_V3` 분리 + `migrateCalendarToV4()`, 프로젝트 컬렉션 CRUD, 관문 CRUD와 계획 대비 실제, **`gates[].planned` 기반 점유(DD31)**·종단 관문 마감으로 렌더 경로 적응 |
| `newtab.html` | UPDATE | 상세 모달의 관문 편집기, 프로젝트 선택기, 온보딩 안내 |
| `newtab.css` | UPDATE | 관문·프로젝트 표기의 최소 스타일. 새 시각 언어를 만들지 않고 기존 칩·뱃지 토큰을 재사용한다(UI4) |
| `test/positioning.smoke.js` | UPDATE | v4 마이그레이션 3축 케이스 + v3 실행 증인(DD16), **`runCalendarV4EquivalenceCases()`**(마이그레이션 전후 도메인 투영 — `meaning` 불변 단언 + `occupancy` 의도적 변화 단언 셋, DD15·DD31), 관문 집합 불변식, 프로젝트 참조 무결성 |
| `.claude/prds/work-calendar.prd.md` | UPDATE | M2 행을 `in-progress`로, 완료 시 `complete`로. Open Question 1을 DD1~DD4 근거와 함께 해소 표기 |
| `test/positioning.smoke.html` | UPDATE | `베이스라인 내보내기` 버튼 하나. `__smokeBaseline`을 JSON 파일로 내려 앵커 검사가 실재하게 만든다 (Task 0, R2 architect F1) |
| `work-calendar-m2.baseline.json` | CREATE | Task 0이 `베이스라인 내보내기`로 받아 저장소 루트에 두고 Task 7이 재베이스라인 뒤 덮어쓴다. **두 sha256 파일이 이 파일을 해싱하므로 커밋되지 않으면 `shasum -c`가 없는 파일에서 죽는다**(santa R4 B4 — 앞선 판은 sha 둘만 적고 정작 해싱 대상을 목록에서 빠뜨렸다) |
| `.claude/plans/work-calendar-m2.rebaseline.sha256` | CREATE | Task 7이 재베이스라인 직후에 뜬 `test/positioning.smoke.js`·`work-calendar-m2.baseline.json`의 sha256. **끝 상태 게이트는 이쪽이다**(santa R2 B3) |
| `.claude/plans/work-calendar-m2.baseline.sha256` | CREATE | Task 0이 뜬 베이스라인과 `test/positioning.smoke.js`의 sha256을 `shasum -c`가 읽는 형식으로. Validation 3번이 검사한다 (DD23) |
| `README.md` | UPDATE | 데이터 모델(관문·프로젝트) 갱신 |

**바꾸지 않는 것**: 시계 모드 경로(`ClockManager`), 배경·즐겨찾기·이미지·검색 매니저, 위젯 위치 계산. UI13이 요구하고 Task 8의 하네스 diff 0이 증명한다.

## Tasks

### Task 0: 착수 조건과 베이스라인 확보
- **Action**:

  **이 Task가 만드는 것 — 아래가 전부다.**
  1. `test/positioning.smoke.html` — 버튼 하나(`id="exportBaseline"`, 라벨 `베이스라인 내보내기`)와 그 핸들러. `chrome.storage.local.get([BASELINE_KEY])`로 읽어 `JSON.stringify(v, null, 2)`를 `Blob`으로 내린다. 기존 버튼 셋(`102-104`) 옆에 넣는다
  2. `work-calendar-m2.baseline.json` — 위 버튼으로 내려받아 저장소 루트에 둔다
  3. `.claude/plans/work-calendar-m2.baseline.sha256` — `shasum -a 256 test/positioning.smoke.js work-calendar-m2.baseline.json > .claude/plans/work-calendar-m2.baseline.sha256`

  **고치는 것**: `test/positioning.smoke.js` — **버튼 마크업은 `.html`에 가지만 리스너는 여기 붙는다**(santa R3 B1). 확장 오리진 페이지라 인라인 스크립트가 CSP에 막히고, 기존 버튼들도 전부 이 파일에서 `document.getElementById('runBaseline')?.addEventListener(...)` 형태로 붙는다(`test/positioning.smoke.js:1119` 부근). 앞선 판은 "만드는 것"에 `.html` 하나만 적고 "고치는 것: 없다"라고 했는데, **그대로 따르면 버튼은 생기고 리스너가 없어 눌러도 아무 파일도 안 받아진다.** 그러면 Task 0이 `work-calendar-m2.baseline.json`을 만들지 못하고, 그것을 요구하는 Task 7과 Validation 3의 앵커 사슬이 시작조차 못 한다.

  **케이스는 건드리지 않는다** — 이 Task가 `.js`에서 더하는 것은 리스너 하나뿐이고, `runAll()`의 케이스 목록과 실행 순서는 그대로다. 그리고 **해시는 이 변경 뒤에 뜬다**(아래 3번). 리스너를 더하기 전 파일로 해시를 뜨면 첫 `shasum -c`부터 깨진다.

  > **이 셋은 지금 저장소에 없다. 그것이 이 Task의 존재 이유다.** R6 invariant F1이 "`베이스라인 내보내기` 버튼이 `test/positioning.smoke.html`에 없다"를 HIGH로 냈고, M1도 같은 오독을 두 번 받았다(백로그 `id=9i-bootstrap`). 플랜 검토 시점에 Task 0의 산출물이 없는 것은 결함이 아니라 **Task 0이 아직 수행되지 않았다는 사실**이다. Validation 절이 두 시점으로 갈린 이유가 정확히 이것이며, 앵커 검사(3번)는 이 Task 뒤에만 돈다.

  절차는 아래와 같다. `test/positioning.smoke.html`을 브라우저에서 열어 "Run Baseline"으로 현재 스냅샷을 저장한다. 단언 실패가 0건인지 먼저 확인한다 — 실패가 있는 상태의 베이스라인은 이후 모든 비교를 무의미하게 만든다(`test/positioning.smoke.js:1089-1090`이 같은 경고를 적어 두었다). `git status --porcelain`으로 작업 트리가 깨끗한지 확인하고, `node --check newtab.js`가 통과하는지 본다.
- **Mirror**: `.claude/plans/calendar-widget-v2.plan.md`의 Task 0 — 파괴적 단계 앞에 베이스라인을 먼저 세운다
- **Validate**: 단언 실패 0건이고 베이스라인이 `__smokeBaseline`에 저장됐다.
  - **베이스라인을 뜨는 저장 상태를 고정한다.** 하네스 케이스는 저마다 `loadApp()`에 자기 저장 상태를 넘기므로(`test/positioning.smoke.js:265`·`495`) "현재 스냅샷"에 모호함이 없다 — 베이스라인은 `runAll()`이 도는 그 상태들의 집합이다. 사람이 브라우저 저장소를 미리 채워 두고 뜨면 안 된다. 확장을 실제로 쓰던 프로필에서 열지 말고 **빈 프로필이나 시크릿 창에서 `test/positioning.smoke.html`을 연다.**
  - **베이스라인과 하네스 코드의 해시를 함께 적는다**(R0 invariant F6 — plan 해시는 하네스도 베이스라인도 고정하지 못한다). `sha256`을 둘 떠서 PRD의 게이트 실행 기록 줄에 남긴다: **먼저 베이스라인을 파일로 꺼낼 수단을 만든다.** R1 흡수에서 나는 "Copy Baseline으로 받은 JSON"이라고 적었는데 **그런 것은 없다** — 베이스라인은 `chrome.storage.local`의 `__smokeBaseline`에만 있고(`test/positioning.smoke.js:14`·`1123`), `positioning.smoke.html`의 버튼은 셋뿐이다(`베이스라인 캡처`·`비교 실행`·`베이스라인 삭제`, `102-104`). 파일이 없으니 `shasum -c`는 "no such file"로 죽는다 — **실행될 수 없는 검사를 판정으로 적어 둔 것이고, R0가 막은 결함과 같은 종류다**(R2 architect F1).
  그래서 Task 0이 하네스에 버튼 하나를 더한다 — `베이스라인 내보내기`: `chrome.storage.local.get([BASELINE_KEY])`로 읽어 `JSON.stringify(v, null, 2)`를 `Blob`으로 내리는 열 줄 남짓이다. 내려받은 `work-calendar-m2.baseline.json`을 저장소에 두고, 그 파일과 `test/positioning.smoke.js` 둘의 해시를 **`shasum -c`가 읽는 표준 형식**(`<64자 hex><공백 두 개><경로>` 한 줄씩, R2 invariant F2가 형식 미지정을 지적했다)으로 `.claude/plans/work-calendar-m2.baseline.sha256`에 남긴다. 생성은 `shasum -a 256 test/positioning.smoke.js work-calendar-m2.baseline.json > .claude/plans/work-calendar-m2.baseline.sha256` 한 줄이다.
  **이 앵커가 사는 것과 사지 못하는 것을 갈라 적는다**(R2 invariant F7). 베이스라인은 Task 0에서, 즉 **플랜 승인 뒤에** 만들어지므로 plan 해시가 그것을 구속하지 못한다 — 앵커가 막는 것은 "승인된 베이스라인으로 시작했는가"가 아니라 **"Task 0과 Task 8 사이에 베이스라인이나 하네스가 소리 없이 바뀌었는가"**이며, 그것이 재베이스라인 판정을 무의미하게 만드는 실제 경로다. 그 이상을 주장하지 않는다. 이 줄이 없으면 Task 8의 재베이스라인이 무엇 대비 변화인지 사후에 확인할 수 없다.
  - **실패가 있으면 Task 1을 시작하지 않는다 — 원인을 먼저 찾는다.** 이것은 **절차 규칙이고 기계적 강제가 없다**(R0 invariant F1). CI도 커밋 훅도 없으므로 이 문장을 잇는 것은 이 문장뿐이며, Validation 절이 같은 사실을 적어 두었다. 막을 수 없는 것을 막는다고 쓰지 않는다

### Task 1: 데이터 모델 v4 정의
- **Action**:

  **이 Task가 `newtab.js`에 새로 만드는 것 — 아래가 전부다.** 목록에 있는 것은 전부 새로 쓰는 코드이고, 목록에 없는 것은 이 Task의 산출물이 아니다.
  1. `createCalendarGate(input)` → `CalendarGate | null` — 관문 하나의 생성 게이트
  2. `createCalendarProject(input)` → `CalendarProject | null` — 프로젝트 하나의 생성 게이트 (DD20)
  3. `deriveEventRange(event)` → `event` — 관문 집합에서 `startDate`·`endDate`·`date`를 다시 계산해 **같은 객체에 박고 그 객체를 돌려준다** (DD26의 유지 지점)
  4. 상수 넷 — `GATE_KINDS`(`dev`·`review`·`stg`·`prod`·`monitor`, DD12) · `MAX_GATES_PER_EVENT` · `MAX_PROJECTS` · `MAX_PROJECT_NAME_CHARS`
  5. typedef 둘 — `CalendarGate` · `CalendarProject`

  **이 Task가 고치는 것 — 하나다.**
  - `loadEvents()`(`newtab.js:2062`) — `createCalendarEvent()`가 버린 항목 수를 세고, **하나라도 있으면 `this.loadFailed = true`로 두고 `hideError()`를 부르지 않는다** (santa R5 B1). 현재는 `.filter()`로 버린 뒤 곧바로 `loadFailed = false`를 세우므로, 손상 이벤트가 조용히 사라지고 다음 편집이 그 삭제를 영구 커밋한다
  - `sanitizeImportedEvents()`(`newtab.js:492`) — 검증 탈락 항목이 하나라도 있으면 **배치 전체를 거절한다** (santa R5 B1). 현재는 `if (!event) return;`으로 그 항목만 건너뛴다. 상한 초과에 이미 쓰고 있는 "조용히 자르지 않고 전체를 거절" 판단을 같은 함수 안에서 같은 이유로 넓히는 것이다
  - `createCalendarEvent()`(`newtab.js:304`) — `gates`와 `projectId`를 화이트리스트에 더하고, **함수의 마지막 줄에서 `deriveEventRange(event)`를 부른 뒤 그 반환값을 돌려준다.** 이것이 DD26이 세는 **첫째 호출 자리**이며, 선택이 아니라 이 Task의 완료 조건이다

  세부 계약은 아래에 잇는다. `CalendarGate` typedef를 새로 만든다 — `{ id, kind, planned, actual, status }`. `kind`는 `null` 또는 `GATE_KINDS`(`dev`·`review`·`stg`·`prod`·`monitor`, DD12의 코드 상수) 중 하나이고, `planned`는 `makeDateKey()`로만 생성한 `'YYYY-MM-DD'`, `actual`은 같은 형식 또는 `null`, `status`는 `pending`·`done`·`dropped`(DD5). `CalendarProject`는 `{ id, name, createdAt, updatedAt }`이고 **자체 생성 게이트 `createCalendarProject()`를 갖는다**(DD20) — `createCalendarEvent()`와 같은 화이트리스트 대입, `MAX_PROJECT_NAME_CHARS` 절단, `id` 부재 시 `crypto.randomUUID()`, 필수값 부재 시 `null` 반환. 상수 `MAX_PROJECTS`도 함께 둔다. 이벤트에만 게이트가 있고 프로젝트에는 없으면 백업 파일이 **유일하게 검사받지 않는 입력 통로**가 된다(R1 security F4). `CalendarEvent`에 `gates`(비어 있지 않은 배열)와 `projectId`(문자열 또는 `null`)를 더하고, `startDate`·`endDate`·`date`는 **관문에서 파생되는 잔존 필드로 재정의**하고, 재계산은 `deriveEventRange(event)` 하나가 맡는다(DD4·DD26) — `createCalendarEvent()`의 **마지막**에서 부르므로 생성·적재·정제가 그 지점을 지난다. **마이그레이션은 지나지 않는다** — `promoteEventsToV4()`는 DD19의 순수 함수라 `createCalendarEvent()`를 거치지 않으므로 자기가 직접 부른다(DD26의 셋째 호출 자리, R3 architect CRITICAL). `createCalendarEvent()`를 확장하되 화이트리스트 대입 방식을 그대로 지킨다 — `gates`는 항목마다 **`createCalendarGate(input)`을 통과시킨다 — 이 함수도 이 Task가 만든다**(R4 security F1 · test F3에서 "쓰인다고만 적히고 만들라고는 적히지 않았다"로 지목됐다). `createCalendarEvent()`와 같은 형태다: 화이트리스트 대입(prototype pollution 차단) · `planned`는 `makeDateKey()` 왕복 검증을 통과한 `'YYYY-MM-DD'`만 · `kind`는 `null` 또는 `GATE_KINDS` 화이트리스트 · `status`는 `pending`/`done`/`dropped` 화이트리스트 · `actual`은 같은 날짜 형식 또는 `null` · `id` 부재 시 `crypto.randomUUID()` · 필수값이 없거나 형식이 틀리면 **`null` 반환**(호출부가 걸러낸다). **빈 관문 집합은 존재할 수 없다. 그런데 "관문이 없다"에는 서로 다른 두 입력이 있고, 둘을 같게 다루면 데이터가 사라진다.** 조건을 `gates` **키의 유무**로 가른다(santa R3 B4가 두 문장이 서로 다른 조건을 걸고 있는 것을 잡았고, santa R4 B1이 그것을 **한쪽으로 통일한 답**이 틀렸다는 것을 잡았다 — 둘을 합치면 아래가 된다).

- **`gates`가 아예 없다**(키 부재 또는 배열이 아님) **+ 레거시 범위 필드가 있다** → **재구성한다.** 이것은 v3 시절의 입력이고 관문이라는 개념 자체가 없던 데이터다. 범위에서 만들어도 **잃을 것이 없다.**
- **`gates`가 배열로 있는데 유효한 것이 하나도 남지 않았다** → **`null`을 돌려준다. 재구성하지 않는다.** 이것은 v4 모양의 데이터가 **손상된** 것이고, 범위에서 다시 만들면 각 관문의 `kind`·`actual`·`status`가 **조용히 사라진 채** 양 끝 익명 관문 둘로 덮인다. 되돌릴 수 없다. 앞선 판은 이 경우를 위 항목과 같게 다뤄, 손상된 v4 이벤트가 오류 없이 잘려서 다음 저장에 영구 커밋되게 만들고 있었다.
- **레거시 범위 필드마저 없다** → `null`(기존 필수값 규약).

**`null`이 돌아간 뒤의 처리를 이 Task가 함께 고친다. 호출부가 이미 갈라 두었다고 적었던 것은 거짓이었다**(santa R5 B1). 코드를 다시 읽으면 둘 다 반대로 한다 —

- `sanitizeImportedEvents()`(`newtab.js:509`)는 `if (!event) return;`으로 **그 항목만 조용히 건너뛰고 나머지를 가져온다.** "전체를 거절"하는 규약은 **항목 수·글자 수 상한**에만 걸려 있고 검증 탈락에는 걸려 있지 않다
- `loadEvents()`(`newtab.js:2077-2078`)는 `.filter((event) => event !== null)`로 **버린 뒤 곧바로 `this.loadFailed = false`로 봉인을 푼다**

그러면 앞 문단의 세 갈래가 **데이터 손실 경로가 된다.** 손상된 v4 이벤트가 `null`을 받아 적재에서 조용히 사라지고, 봉인이 풀린 채로 앱이 열리고, 사용자가 아무 일정이나 한 번 고치는 순간 **짧아진 배열이 저장소에 커밋되어 그 이벤트와 관문 정보가 영구히 지워진다.** 재구성을 막으려다 삭제를 만든 셈이다.

**두 호출부를 이 Task가 고친다.** 규칙은 프로젝트 쪽 DD27a와 같다 — 못 읽은 것을 읽은 척하지 않는다.

1. `loadEvents()` — `createCalendarEvent()`가 `null`을 돌려준 항목 수를 센다. **하나라도 있으면 `this.loadFailed = true`로 두고 `hideError()`를 부르지 않는다.** 버린 개수를 콘솔에 고지하고 기존 문구로 알린다. 봉인을 푸는 길은 이미 있다 — `persistEvents()`의 `isFullReplacement`가 `loadFailed`를 통과시키므로(`newtab.js:2151`) **가져오기가 곧 복구 경로**다. M2.5를 기다리지 않아도 된다는 점이 프로젝트 쪽과 다르다
2. `sanitizeImportedEvents()` — 검증 탈락 항목이 하나라도 있으면 **배치 전체를 거절한다.** 상한 초과에 이미 쓰고 있는 판단을 같은 함수 안에서 같은 이유로 확장하는 것이다: 부분만 들여오면 사용자는 무엇이 빠졌는지 모른 채 "가져왔다"고 믿는다

**이것은 기존 동작의 변경이고 대가가 있다.** 지금까지는 옛 저장값에 깨진 항목 하나가 섞여 있어도 앱이 그냥 열렸는데, 앞으로는 그 상태에서 쓰기가 잠긴다. 그 대가를 치르는 이유는 **조용히 지워지는 것보다 잠기는 편이 되돌릴 수 있기 때문**이고, 잠금 해제가 이 마일스톤 안에 이미 있기 때문이다(가져오기). 잠긴 이유를 사용자가 알 수 있도록 고지 문구에 **버린 개수**를 넣는다. **어느 날짜에서 만드는지를 못박는다**(R9 architect F1 — "`endDate`/`date`에서"는 둘 중 무엇이 이기는지를 정하지 않았고, `startDate`에서 만들면 DD3의 종단 관문이 `endDate`와 달라져 마감 의미가 바뀐다): **종단** 관문은 `planned := endDate ?? date`에서 만들고 `startDate`에서 만들지 않는다. 둘 다 없으면 이벤트 자체가 무효이므로 `createCalendarEvent()`가 `null`을 돌려준다(기존 필수값 규약).

**그런데 종단 관문 **하나만** 만들면 가져오기가 데이터를 지운다**(santa R2 B2, CRITICAL). R9는 "종단 관문을 **어느 날짜**에서 만드는가"에 답한 것이지 "관문을 **몇 개** 만드는가"에 답한 것이 아니었는데, 앞선 판은 뒤 질문까지 답한 것처럼 `startDate`를 통째로 버렸다. 그러면 승격 경로와 가져오기 경로가 **같은 입력에 다른 답**을 낸다 — `promoteEventsToV4()`는 `uniqueDates([startDate, endDate])`로 관문 **둘**을 세우는데(DD1), 사용자가 v4 이전에 내보낸 v3 JSON을 나중에 가져오면 그것은 `handleCalendarImport()` → `replaceEvents()` → `sanitizeImportedEvents()` → `createCalendarEvent()`를 타고(그리고 Task 3이 `handleCalendarImport()`를 **고치지 않기로** 했으므로 그 경로가 유일하다) 관문 **하나**만 얻는다. 5일짜리 일정이 하루로 접히고, `deriveEventRange()`가 `startDate := min(planned) = endDate`로 다시 파생하므로 **원래 시작일이 복구 불가능하게 사라진다.** DD31 이후에는 점유까지 하루로 줄어 화면에서도 사라진다. 오류는 나지 않는다.

**규칙을 하나로 적는다 — 위 세 갈래 중 **첫째 갈래**(`gates` 부재 + 레거시 범위 필드 존재)에서만, 승격과 같은 방식으로 만든다**: `uniqueDates([startDate, endDate ?? date])`. **조건은 위와 같은 것이고 여기서 다시 정의하지 않는다**(santa R3 B4 · R4 B1). 종단 관문의 출처는 R9가 정한 그대로 `endDate ?? date`이고(그 답은 옳고 여기서 뒤집지 않는다), `startDate`가 다르면 시작 관문이 하나 더 선다. `startDate`가 없거나 같으면 `uniqueDates`가 하나로 접으므로 단일 날짜 이벤트는 지금과 같다. **가져오기와 마이그레이션이 같은 입력에 같은 답을 내는 것이 이 규칙의 전부이고**, 그것이 DD1이 "범위 선택 UI로 의도해서 넣은 정보를 지우지 않는다"고 적은 판단을 가져오기 경로에도 적용한 것이다. 관문 개수 상한 `MAX_GATES_PER_EVENT`를 두고 초과분은 절단한다. **같은 날짜의 관문 둘은 허용한다**(DD25) — `uniqueDates`는 마이그레이션 규칙이지 입력 규칙이 아니며, 같은 날 `dev`와 `review`가 서는 것이 이 마일스톤이 담으려는 업무 모양이다(R2 architect F5). 단 `kind`가 **둘 다 `null`인** 같은 날짜 관문은 구별할 수단이 없으므로 만들지 않는다.
**막는 자리는 편집기가 아니라 `createCalendarEvent()` 다**(R7 architect F1) — 편집기만 막으면
가져오기가 그 규칙을 우회하고, 이 마일스톤에서 남의 파일이 `gates` 를 들고 들어오는
경로가 실제로 있다(DD28). `gates` 배열을 조립할 때 **`kind === null` 인 항목끼리만**
`planned` 기준으로 중복을 접는다. **순서를 못박는다**(R10 architect F4): (1) 입력 항목을
각각 `createCalendarGate()` 에 통과시키고 `null` 을 버린다 → (2) 살아남은 것 중
`kind === null` 인 것만 `planned` 를 키로 **처음 것만 남긴다**(`Map` 하나면 된다) →
(3) 이름 있는 관문은 손대지 않고 그대로 이어 붙인다 → (4) `MAX_GATES_PER_EVENT` 절단.
접기가 **생성 게이트 뒤**에 오는 이유는 `planned` 가 `makeDateKey()` 왕복 검증을 지난
정규 형태여야 키로 쓸 수 있기 때문이다 — 검증 전 값으로 접으면 같은 날짜의 다른 표기가
서로 다른 키가 된다 — 이름 있는 관문은 접지 않는다(DD25: 같은 날 `dev` 와
`review` 가 서는 것이 이 마일스톤이 담으려는 모양이다). DD1 의 `uniqueDates` 와 같은
연산을 같은 이유로 쓰되, 적용 대상이 이름 없는 관문으로 좁혀진 것이다.
- **Mirror**: `newtab.js:304` `createCalendarEvent()` — 화이트리스트 대입, 상한 절단, 필수값 부재 시 `null` 반환
- **Validate**: `node --check newtab.js`. 하네스의 `sanitize/**` 케이스가 새 필드까지 포함해 통과하고, prototype pollution 케이스(`test/positioning.smoke.js:731-792`)가 `gates` 배열 안쪽에도 적용되는지 케이스를 하나 더해 확인한다

### Task 2: v4 마이그레이션
- **Action**:

  **이 Task가 새로 만드는 것 — 아래가 전부다.**
  1. `newtab.js` 상수 `SETTINGS_VERSION_V3 = 3` (`SETTINGS_VERSION_V2`가 `newtab.js:21`에 이미 있는 선례 그대로)
  2. `newtab.js` `promoteEventsToV3(events)` → `CalendarEvent[]` — **순수 함수.** 저장소도 `searchWidthByWidget`도 모른다
  3. `newtab.js` `promoteEventsToV4(events)` → `CalendarEvent[]` — **순수 함수.** 각 이벤트를 돌려주기 직전에 `deriveEventRange(event)`를 부른다 (DD26의 **셋째 호출 자리**)
  4. `newtab.js` `migrateCalendarToV4()` — 읽기·가드·쓰기 껍데기
  5. `test/positioning.smoke.js` `spyOn(frameWindow, name)` → `{ calls, restore() }` — **이 Task의 산출물이다.** Validate가 이것을 쓰므로 없으면 Validate가 돌지 않는다
  6. `test/positioning.smoke.js` `runCalendarV4MigrationCases(collector)`

  **이 Task가 고치는 것 — 셋이다.**
  - `migrateCalendarToV3()`(`newtab.js:410`) — 가드를 `SETTINGS_VERSION`에서 `SETTINGS_VERSION_V3`로 바꾸고(DD10), 승격 본문을 `promoteEventsToV3()` **호출로 교체한다.** 자체 구현을 남겨 두면 DD16의 spy 카운터가 0이 되어 판정이 죽는다. 340px 캐시 정리는 **껍데기에 그대로 남긴다**
  - `SETTINGS_VERSION`을 `3` → `4`
  - `Application.initialize()` — v2 → v3 다음에 v4를 잇는다

  세부는 아래에 잇는다. `SETTINGS_VERSION_V3 = 3` 상수를 새로 만들고 `migrateCalendarToV3()`의 가드를 그것으로 바꾼 뒤(DD10) `SETTINGS_VERSION = 4`로 올린다. `migrateCalendarToV4()`를 추가한다 — 자체 가드(`>= SETTINGS_VERSION`), 각 이벤트에 대해 `gates = uniqueDates([startDate, endDate]).map(...)`(DD1), 만들어지는 관문은 `kind: null`(DD2), 종단 관문의 `status`는 이벤트의 `done`을 물려받고 나머지는 `pending`, `actual`은 전부 `null`(v3에 완료 시각이 없으므로 없는 값을 만들지 않는다). `projectId: null`로 시작하고 `calendarProjects: []`를 함께 쓴다. 세 키를 **한 번의 `set()`으로** 커밋한다.
  **`promoteEventsToV4()`는 각 이벤트를 돌려주기 직전에 `deriveEventRange(event)`를 부른다**(DD26의 셋째 호출 자리). 이 문장이 R4에서 CRITICAL 둘로 지목됐다(test F1 · invariant F4) — DD26이 "셋째 호출이 없으면 `startDate ≠ min(planned)`인 이벤트가 커밋된다"고 경고해 놓고, **Task Action에는 그 호출을 적지 않았다.** 결정에만 있고 지시에 없는 요구는 구현되지 않는다. `Application.initialize()`의 v2 → v3 다음에 v4를 잇는다.
  **승격 규칙을 순수 함수로 뽑는다**(DD19, R1 security F3) — `promoteEventsToV3(events)`와 `promoteEventsToV4(events)`는 저장소를 모르고 배열을 받아 배열을 돌려준다. **둘의 계약을 여기 적는다**(R4 test F4 — 존재만 요구하고 규칙은 기존 코드에서 유추하게 두면 두 구현이 갈라진다):
    - `promoteEventsToV3(events)` — 입력은 v2 모양(`date`만 가진 항목이 섞여 있다). 각 항목에 `startDate = endDate = date`를 세우고 `date`는 남긴다(DD6 잔존 필드). 이미 `startDate`가 있으면 건드리지 않는다(멱등). **저장소도 `searchWidthByWidget`도 만지지 않는다** — 340px 캐시 정리는 껍데기 `migrateCalendarToV3()`가 계속 맡는다(DD16의 증인이 그 자리에 있어야 한다).
    - `promoteEventsToV4(events)` — 각 항목에 `gates = uniqueDates([startDate, endDate]).map(d => createCalendarGate({ kind: null, planned: d, actual: null, status: ... }))`를 세운다(DD1). **`.map(...)`을 생략하지 않고 적는다**(R9 architect F2 — 매핑 함수를 비워 두면 `id` 를 누가 만드는지가 정해지지 않는다): 관문은 이 경로에서도 **`createCalendarGate()`를 지나며**, 그래서 `id`는 거기서 `crypto.randomUUID()`로 생기고 화이트리스트·형식 검증도 같은 자리에서 걸린다. 순수 함수라고 해서 생성 게이트를 건너뛰지 않는다 — 건너뛰면 마이그레이션이 유일하게 검사받지 않는 관문 생성 통로가 된다. 만들어지는 관문은 `kind: null`(DD2), 종단 관문의 `status`는 이벤트의 `done`을 물려받고 나머지는 `pending`, `actual`은 전부 `null`. `projectId`가 없으면 `null`. 이미 `gates`가 있으면 건드리지 않는다(멱등). **각 이벤트를 돌려주기 직전에 `deriveEventRange(event)`를 부른다**(아래).
    둘 다 입력 배열을 in-place 변형하지 않고 새 배열을 돌려준다 — `persistEvents()`의 규약(`newtab.js:2140` "기존 배열 in-place 변형 금지")과 같다. `migrateCalendarToV3/V4()`는 읽기·가드·쓰기 껍데기가 되어 이것을 부르고, 백업 마일스톤(M2.5)의 복구도 **같은 함수**를 부른다. 두 번 구현하면 승격 의미가 경로마다 갈라지고, 그것은 재생 불가 데이터에서 가장 나쁜 부채다.
  **하네스 쪽 spy 인프라도 이 Task가 만든다**(R4 test F2 — Validate가 요구하는데 Action이 만들라고 하지 않았다). `test/positioning.smoke.js`에 헬퍼 하나를 둔다: `spyOn(frameWindow, name)` — 원본을 보관하고 호출 수를 세는 래퍼로 바꾼 뒤 `{ calls, restore() }`를 돌려준다. 케이스는 `try/finally`로 감싸 **반드시 `restore()`한다** — 복원하지 않으면 뒤따르는 케이스가 래퍼를 쓰게 되고, `runAll()`이 저장소를 복원하는 규약(`test/positioning.smoke.js:975` 부근)과 같은 이유다.
- **Mirror**: `newtab.js:410` `migrateCalendarToV3()`의 구조 전체 — 자체 가드·원자적 커밋·`catch` 고지 + `test/positioning.smoke.js:985` 부근의 저장·복원 관용구(spy 복원이 같은 형태다)
- **Validate**: 하네스에 `runCalendarV4MigrationCases()`를 더한다. 세 축을 전부 본다 — (1) v3 데이터가 관문으로 승격되고 `kind`가 전부 `null`이며 폭 없는 항목이 관문 하나를 갖는가, (2) 2회 실행 후 결과가 동일하고 사용자 메모·중요도·이름 붙인 관문이 유실되지 않는가, (3) `startDate`·`endDate`·`date`가 남아 있고 파생값과 일치하는가. **v2 데이터가 v3를 거쳐 v4까지 한 번에 올라오는 케이스를 반드시 넣는다** — DD10이 막으려는 함정이 여기서만 드러난다. **그 케이스는 "v3가 실제로 돌았다"를 두 층위로 단언한다**(DD16·DD24, R0 test F3 · R2 invariant F4·F5). **(호출 층위 — 이쪽이 주 증인이다)** 연쇄를 돌리기 전에 `frameWindow.promoteEventsToV3`를 세는 래퍼로 감싸고, 끝난 뒤 `assert(v3Calls >= 1, 'v2→v4 연쇄에서 promoteEventsToV3가 호출되지 않았다')`를 건다. 같은 단언이 DD19의 단일 출처도 함께 증명한다 — `migrateCalendarToV3()`가 순수 함수를 부르지 않고 자체 구현을 갖고 있으면 카운터가 0이다. **(부수효과 층위 — 보조)** 340px 캐시 정리도 함께 본다.
  **하네스는 초기화 이전을 볼 수 없다 — 그것을 전제로 쓴 단언 둘을 고친다**(santa R5 B2).

  `loadApp()`(`test/positioning.smoke.js:145` 부근)은 `__newTabApp` 노출 · `settingsManager` 초기화 · `calendarManager` 초기화를 **전부 기다린 뒤에** 반환하고, 시동 마이그레이션은 `Application.initialize()` 안에서 그보다 먼저 끝난다(`newtab.js:4115-4116`). 그러므로 `loadApp()` 뒤에 spy를 감으면 **시동 호출을 0으로 세고**, "마이그레이션 전에 렌더한 투영 A"라고 적은 것은 이미 마이그레이션 후 상태다. 앞선 판의 두 단언은 그 자리에서 거짓으로 통과하거나 옳은 구현을 죽인다.

  이 저장소에서 초기화 이전에 끼어드는 유일한 길은 **프로덕션 코드에 훅을 내는 것**인데, 테스트를 위해 `newtab.js`에 구멍을 내는 것은 이 마일스톤이 살 수 있는 값이 아니다. 그래서 **증명 대상을 바꾼다** — 시동 시점을 훔쳐보는 대신 **순수 함수를 직접 부른다.**

  - **변환 자체**는 `promoteEventsToV3(events)`·`promoteEventsToV4(events)`를 하네스에서 **직접 호출해** 입력과 출력을 맞댄다. DD19가 둘을 순수 함수로 뽑아 둔 것이 여기서 값을 낸다 — 시동 타이밍과 무관하고, spy보다 강한 단언이다(호출 여부가 아니라 결과를 본다)
  - **투영 A(마이그레이션 전)**도 같은 방식으로 만든다. v3 데이터를 `loadApp`으로 올려 렌더한 것이 투영 A이고(그 시점에 v4는 아직 없다 — `SETTINGS_VERSION` 가드가 v4를 만들기 전이므로 v3 데이터를 넣으면 v3 상태로 선다), 그 뒤 `promoteEventsToV4()`를 직접 태워 저장하고 다시 올린 것이 투영 B다. **"한 번 올린 앱 안에서 전후를 본다"가 아니라 "두 번 올린다"로 바꾸는 것**이 요점이다
  - **시동 연쇄가 실제로 돌았는가**는 spy로 증명하지 못한다. 남는 증인은 340px 캐시 정리 하나이고, R2 invariant F5가 지적했듯 **v4가 같은 정리를 직접 구현하면 그것마저 통과한다.** 이 한계를 숨기지 않고 적는다 — **이 하네스로는 "v3가 시동에서 돌았다"를 증명할 수 없다.** 대신 증명하는 것은 "v3 변환 함수가 옳다"와 "v2 입력이 v4 상태로 끝난다"이며, 그 둘 사이의 연결(누가 언제 불렀는가)은 `Application.initialize()`를 사람이 읽어 확인하는 몫으로 남는다. 백로그 `id=m2-headless-runner`가 풀리기 전에는 이것이 이 저장소의 천장이다

  **`deriveEventRange`도 같은 방식으로 단언한다**(R4 architect F1 · security F2 · test F5). DD26의 셋째 호출은 이 마일스톤에서 데이터 손상에 가장 가까운 자리인데, R4까지 그것을 **강제하는 단언이 하나도 없었다.** 둘을 건다 — (호출) `spyOn(frameWindow, 'deriveEventRange')`로 감싸고 승격 뒤 `assert(spy.calls >= events.length, 'promoteEventsToV4가 각 이벤트에 deriveEventRange를 부르지 않았다')`, (결과) 승격된 전건에 대해 `assert(e.startDate === min(e.gates.map(g => g.planned)) && e.endDate === max(...), '파생 필드가 관문과 어긋난 채 커밋됐다')`. 호출만 보면 잘못 부른 경우를 놓치고, 결과만 보면 우연히 맞은 경우를 통과시킨다 — DD24의 세 층위가 여기서도 갈린다: `loadApp({ settingsVersion: 2, searchWidthByWidget: { clock: 420, calendar: 340 }, calendarEvents: [ /* date만 가진 v2 항목 */ ] })`으로 올린 뒤 `assert(widths.calendar === undefined, 'v2→v4 연쇄에서 v3가 실행되지 않았다 — 340px 캐시가 남아 있다')`를 건다. 최종 `gates`가 서 있는지만 보면 v3를 건너뛰어도 통과한다 — v4가 `date`에서 직접 만들어도 모양이 같기 때문이다. 340px 캐시 정리는 v3에만 있는 부수효과라 보조 증인이 된다(`test/positioning.smoke.js:527`이 이미 `calendarWidthCacheCleared`로 관찰한다). **부수효과만으로는 부족하다** — v4가 같은 정리를 직접 구현하면 v3를 건너뛰고도 통과한다(R2 invariant F5). 그래서 주 증인은 spy이고 이것은 곁다리다

### Task 3: 프로젝트 컬렉션
- **Action**:

  **이 Task가 새로 만드는 것 — 아래가 전부다.**
  1. 저장 키 `calendarProjects`와 설정 키 `lastUsedProjectId`
  2. `loadProjects()` — `storage.get(['calendarProjects'])` 로 읽어 `this.projects` 를 세운다.
     **`loadEvents()`(`newtab.js:2062`) 와 같은 규율을 그대로 쓴다**: 값이 없는 것(첫 실행)과
     배열이 아닌 것(손상)을 가르고, 후자는 조용히 `[]` 로 바꾸지 않고 **`this.projectsLoadFailed`**
     **(성공 시 `false`, 실패 시 `true`)** 를 세운다. **플래그는 이 하나뿐이고 이름은**
     **`loadEvents()` 의 `this.loadFailed`(`newtab.js:2062`) 를 그대로 따른다.** 실패 쪽을
     참으로 두는 것이 이 저장소의 규약이므로 뒤집지 않는다.

     `reconcileProjectRefs()` 는 성공 쪽(`projectsLoaded`)을 받으므로 **부정을 호출부에서**
     **한다** — `{ projectsLoaded: !this.projectsLoadFailed }`. 다리를 함수 안에 숨기지
     않고 호출부에 노출하는 이유는, 이 인자를 빠뜨리면 기본값이 무엇이든 조용히 틀린
     쪽으로 동작하기 때문이다. 호출부 둘은 아래 "고치는 것"과 DD28에 **인자까지 적힌**
     **형태 그대로** 있다(R10 architect F1·F2·F3 · security F1·F2 — 앞선 판은 서명만
     3인자로 바꾸고 호출부는 2인자로 남겨 두어, 안전장치가 영영 발화하지 않았다).
     `loadProjects()` 는 실패해도 예외를 던지지 않고 `this.projects = []` 로 두되
     플래그를 세운다 — 빈 목록 자체가 위험한 것이 아니라 **빈 목록을 근거로 강등하는 것**이
     위험하고, 그것을 막는 것이 이 플래그다.

     읽은 배열로 `this.projects` 를 세운다. **각 행을 생성 게이트에 넘기기 전에**
     **`typeof row.id === 'string' && row.id` 를 먼저 본다**(santa R2 B1) — 아니면
     그 행은 읽지 못한 것으로 세고 넘기지 않는다. `createCalendarProject()` 는
     `id` 부재 시 `crypto.randomUUID()` 로 **새로 만들어 주므로**(DD20), 그것에
     맡기면 손상된 행이 새 id 를 달고 되살아나 봉인이 발화하지 않고, 옛 id 를 든
     이벤트들이 다음 강등에서 전건 무소속이 된다. **id 자동 생성은 만들 때의**
     **규칙이지 읽을 때의 규칙이 아니다.** 그 뒤 각 항목은 `createCalendarProject()` 를
     통과시키고 `null` 은 버리되, **버린 것이 하나라도 있으면 `projectsLoadFailed` 를**
     **참으로 세우고 버린 개수를 콘솔에 고지한다**(DD27a, santa R1 B2). 배열이 맞아도
     항목이 손상됐으면 저장된 것을 온전히 읽지 못한 것이고, 그 목록을 근거로 강등하면
     저장소에 멀쩡히 있는 프로젝트를 가리키던 이벤트가 전건 무소속으로 내려앉는다. `Application.initialize()` 에서 `loadEvents()` 와
     같은 자리에 잇는다. (santa R0 — 이 자리에 `를 세운다. 각 항목은…` 으로 시작하는
     주어 없는 문장 토막이 남아 있었다. 앞선 라운드의 편집 사고이고 구현자가 무엇을
     세우라는 것인지 읽어 낼 수 없었다.)

     **이 항목이 없으면 DD28이 데이터를 지운다**(R9 security F3, CRITICAL — 내가 R7에서
     만든 결함이다). `replaceEvents()` 가 `reconcileProjectRefs(nextEvents, this.projects, ...)`
     를 부르는데 `this.projects` 가 비어 있으면 **가져온 이벤트의 `projectId` 가 전건**
     **`null` 로 강등된다** — 저장소에는 그 프로젝트가 멀쩡히 있는데도. 참조 무결성을
     지키려고 넣은 것이 참조를 지우는 경로가 된다.
  3. `ProjectStore` 경로 — 생성 · 이름 변경 · 삭제
  4. `persistProjects(nextProjects)` — 프로젝트를 바꾸는 **유일한** 쓰기 경로 (DD27). 본문은 **세 줄**이고 순서가 계약이다 (santa R0 B3·B4):

     ```js
     async persistProjects(nextProjects) {
       if (this.projectsLoadFailed) return false;                     // DD27a — 읽지 못한 것을 덮어쓰지 않는다
       return this.persistEvents(
         reconcileProjectRefs(this.events, nextProjects, { projectsLoaded: !this.projectsLoadFailed }),
         { nextProjects });                                           // DD27b — 대입은 persistEvents 안에서 한다
     }
     ```

     가드가 없으면 목록을 읽지 못한 상태에서 프로젝트 하나를 만드는 것만으로
     `calendarProjects` 전체가 그 한 건으로 덮여 사라진다(DD27a). **`async` 와**
     **`persistEvents` 안 대입은 둘 다 필수다** — `persistEvents` 는 `async` 라
     반환값을 그냥 `if` 로 보면 Promise 가 언제나 참이고, 대입을 이 함수에 두면
     `persistEvents` 안의 `render()` 보다 늦어 화면이 옛 목록을 그린다(DD27b,
     santa R1 B1). 호출부는 `false` 를 받으면 메모리·DOM 을 되돌린다 — 상시 고지는
     `applyStorageNotice` 가 **늘어난 서명으로** 하고(DD27c) 일회성 쓰기 실패는
     `persistEvents` 의 `showError`(`newtab.js:2177`) 가 이미 한다
  4a. `applyStorageNotice(state)`(`newtab.js:459`) — **이 Task가 고친다**(DD27c). `state` 에 `projectsLoadFailed` 를 더하고 `messages` 에 `'프로젝트 목록을 읽지 못했습니다 · 프로젝트 변경이 잠겨 있습니다'` 를 잇는다. `Application.initialize()` 가 `loadProjects()` 뒤에 그 값을 넘긴다. **현재 서명은 `{ migrationFailed }` 하나여서 프로젝트 실패를 담을 자리가 없다** — 늘리지 않고 부르면 사용자는 아무 고지도 못 받는다(santa R1 B3)
  5. `reconcileProjectRefs(events, projects, { projectsLoaded })` → **새 배열** — `projects` 에
     없는 `projectId` 를 `null` 로 내린다 (DD28). 입력 배열을 in-place 변형하지 않는다
     (`newtab.js:2140`). 강등 건수를 콘솔에 고지한다.
     **셋째 인자는 필수다.** 생략되면(`options` 부재) `projectsLoaded` 를 **`false` 로 읽어**
     강등하지 않는다 — 빠뜨렸을 때 기본값이 "강등한다"로 떨어지면 그 실수가 곧 데이터
     소실이고, 안전한 기본값은 아무것도 지우지 않는 쪽이다.

     **`projectsLoaded` 가 거짓이면 강등하지 않고 입력을 그대로 돌려준다.** 프로젝트 목록을
     읽지 못한 상태에서 "목록에 없다"는 **참조가 끊겼다는 뜻이 아니라 모른다는 뜻**이고,
     모르는 것을 지우면 재생 불가 데이터가 사라진다. `loadEvents()` 가 읽기 실패를 빈
     배열로 바꾸지 않고 쓰기를 잠그는 것과 **같은 판단**이다(`newtab.js:2082-2086`) —
     그 함수의 주석이 정확히 그 사고를 기록해 두었다("빈 목록으로 강등하지 않는다").
  6. `test/positioning.smoke.js` **`runCalendarProjectCases(collector)`** — 아래 Validate가 요구하는 케이스가 사는 자리. **이름을 여기 적는다**(R8 test F2): Task 2·5는 하네스 케이스를 Action 목록에 세웠는데 Task 3·4·6은 Validate 산문에만 두었고, 그러면 Task 7이 무엇을 `runAll()`에 잇는지가 다시 판단의 문제가 된다

  **이 Task가 고치는 것 — 둘이다. 그리고 UI 핸들러는 고치지 않는다.**
  - `persistEvents()`(`newtab.js:2146`) — `options.nextProjects`(선택)를 받는다. 서명은
    바꾸지 않는다. **조건부를 결과가 아니라 형태로 적는다**(R9 security F4 — "두 키를 한
    번에"라는 결과만 적으면 `set()` 두 번으로 구현해도 문장에는 맞는다). 현재 `newtab.js:2161`
    의 `await storage.set({ calendarEvents: nextEvents })` 한 줄을 아래로 바꾼다 —
    **`set()` 호출은 어느 분기에서도 정확히 하나다**:

    ```js
    const payload = { calendarEvents: nextEvents };
    if (options && options.nextProjects) payload.calendarProjects = options.nextProjects;
    await storage.set(payload);
    ```
  - `replaceEvents()`(`newtab.js:2311`) — `persistEvents`에 넘기기 **전에** `reconcileProjectRefs(nextEvents, this.projects, { projectsLoaded: !this.projectsLoadFailed })`를 부른다. **이것이 DD28의 가져오기 호출 자리다**
  - `handleCalendarImport()`(`newtab.js:4064`)는 **건드리지 않는다.** 참조 무결성은 UI 핸들러가 알 일이 아니고, `replaceEvents()`가 가져오기의 유일한 관문이므로 거기 하나만 막으면 된다 — DD27이 `persistProjects`에서 내린 것과 같은 판단이다. 강등 지점이 둘이지만 **둘 다 `CalendarManager` 안의 병목**이고, 호출부가 빠뜨릴 수 있는 자리는 남지 않는다

  세부는 아래에 잇는다. `calendarProjects` 저장 키와 `ProjectStore` 경로를 만든다 — 생성·이름 변경·삭제. 삭제는 그 프로젝트를 가리키던 이벤트를 **무소속으로 강등하고 이벤트를 지우지 않는다**(DD7). `lastUsedProjectId`를 저장해 새 이벤트의 기본값으로 쓰고, 그 프로젝트가 사라졌으면 `null`(무소속)로 떨어진다. 이벤트 쓰기와 프로젝트 쓰기가 같은 `persistEvents()` 스냅샷 경로를 공유하게 해 부분 커밋이 생기지 않게 한다 — **구체적으로는 `options.nextProjects`(선택)를 더해 `storage.set({ calendarEvents, calendarProjects })`로 두 키를 한 번에 커밋하고, 프로젝트를 바꾸는 경로는 전부 얇은 껍데기 `persistProjects(nextProjects)`만 부른다**(DD22·DD27, R1 security F2 · R2 architect F3). 선택적 인자를 호출부 규율에 맡기면 빠뜨렸을 때 변경이 조용히 사라지므로, 빠뜨릴 수 있는 인자를 호출부에서 없앤다. 서명 자체는 바꾸지 않는다: 원자성은 `set()` 호출이 하나라는 사실에서 나오고, 개명하면 `opSeq`·`loadFailed`·롤백 규약을 쓰는 기존 호출부 전부가 회귀 위험에 들어간다. 저장 키는 `calendarProjects` 하나이며 `lastUsedProjectId`는 이벤트와 무관한 설정이므로 이 스냅샷에 넣지 않는다. **끊긴 참조를 되돌리는 함수도 이 Task가 만든다 — `reconcileProjectRefs(events, projects, { projectsLoaded })`**(DD28). `persistProjects()` 가 커밋 직전에 이것을 부르고, **`replaceEvents()`(가져오기의 유일한 관문)도 부른다** — 둘 다 위 목록에 인자까지 적힌 형태 그대로다 — `replaceEvents()`는 `calendarEvents`만 교체하므로(`newtab.js:2311`) 남의 파일에서 온 `projectId`가 전건 끊긴 채 들어온다. 강등만 하고 이벤트는 지우지 않으며(DD7), 강등 건수를 콘솔에 고지한다.
- **Mirror**: `newtab.js:2146` `persistEvents()` — 스냅샷 전체를 한 번에 커밋하고 실패 시 메모리를 건드리지 않는다
- **Validate**: 하네스 케이스 — 프로젝트 삭제 후 이벤트가 살아 있고 `projectId`가 `null`인가, 기본값이 마지막 사용 프로젝트인가, 그 프로젝트를 지우면 기본값이 무소속으로 떨어지는가. 참조가 끊긴 이벤트가 렌더에서 사라지지 않는가.
  - **가져오기 케이스를 함께 넣는다**(DD28) — 이 저장소에 없는 `projectId`를 가진 이벤트를 `sanitizeImportedEvents()` → `replaceEvents()` 경로로 넣고, 전건이 `projectId === null`로 내려앉되 **이벤트 수가 줄지 않는가**를 단언한다. 그리고 **기존 로컬 프로젝트가 가져오기로 사라지지 않는가** — `replaceEvents()`가 `calendarProjects`를 건드리지 않는다는 사실이 이 단언으로 고정된다. 두 경로(삭제·가져오기)가 **같은 함수**를 부르는지는 `spyOn(frameWindow, 'reconcileProjectRefs')`로 본다(DD24의 호출 층위, Task 2가 만드는 헬퍼를 재사용한다)

### Task 4: 관문 편집과 계획 대비 실제
- **Action**:

  **이 Task가 새로 만드는 것 — 아래가 전부다.** DD29 를 적용하며 Task 4 만 빠뜨렸고,
  하필 DD26 의 **둘째 호출 자리**가 여기 산문에 묻혀 있었다(R7 architect F2·F5 · test F2).
  1. `newtab.js` `CalendarManager` 의 관문 CRUD 셋 — **이름을 준다**: `addGate(eventId, input)` ·
     `updateGate(eventId, gateId, patch)` · `removeGate(eventId, gateId)`. **셋 모두 커밋 직전에**
     **`deriveEventRange(event)` 를 부른다** — 이것이 DD26 이 세는 둘째 호출 자리이고,
     "편집기가 부른다"가 아니라 **이 세 함수가 부른다**. 이름이 없으면 부르는 자리도 없다
  2. `newtab.html` 상세 모달의 관문 편집기 — 관문 추가(프리셋 다섯 + 이름 없음) · 날짜 지정 ·
     완료 표시(`actual` 에 오늘 날짜, `status: 'done'`) · 범위축소(`status: 'dropped'`, 날짜와
     이름은 남긴다). 편집기는 위 셋만 부르고 `gates` 를 직접 만지지 않는다
  3. `test/positioning.smoke.js` **`runCalendarGateCases(collector)`** — 아래 Validate 의 호출
     층위·결과 층위 단언이 사는 자리 (R8 test F1)

  **이 Task가 고치는 것 — 하나다.**
  - 이벤트의 `done` 을 종단 관문의 `status === 'done'` 에서 파생되게 한다. 필드 자체는
    롤백용으로 남긴다(DD4)

  **하지 않는 것**: 자동 재배치. 관문 하나를 옮겨도 다른 관문은 그대로 있다(UI6).

  세부는 아래에 잇는다. 관문 편집 후 **`deriveEventRange(event)`를 불러** `startDate`·`endDate`·`date`를 다시 파생한다(DD4·DD26) — 이름 있는 함수 하나가 유지 지점이며, 관문을 만지고 이것을 부르지 않는 경로가 없어야 한다(R2 architect F2). 이벤트의 `done`은 종단 관문의 `status === 'done'`에서 파생되게 하되 필드 자체는 롤백용으로 남긴다. **자동 재배치를 하지 않는다** — 관문 하나를 옮겨도 다른 관문은 그대로 있다(UI6).
- **Mirror**: `newtab.js:2244-2299` `addEvent`·`updateEvent`·`toggleEvent`·`deleteEvent`의 CRUD 형태와 `updatedAt` 갱신 규약
- **Validate**: **호출 층위와 결과 층위를 함께 본다**(DD24). Task 2 는 DD26 의 첫째·셋째
  호출 자리에 spy 를 걸어 두었는데 **둘째 자리에는 결과 검사만 있었다**(R7 architect F4) —
  결과만 보면 우연히 맞은 경우를 통과시킨다. Task 2 가 만든 `spyOn` 헬퍼를 재사용해
  `addGate`·`updateGate`·`removeGate` 각각에 대해 `deriveEventRange` 호출 수가
  1 이상인지 단언한다.
  이어서 결과 층위 — 하네스 케이스로 관문 추가·삭제 후 파생 범위가 `min..max`와 같은가, `dropped` 관문이 파생 범위에 포함되는가(포함한다 — 계획은 남는다), 관문 하나를 옮겨도 나머지가 움직이지 않는가(UI6의 기계적 단언), 조기·지연 부호가 `actual - planned`와 맞는가

### Task 5: 렌더 경로 적응 (첫 비가역 지점)
- **Action**:

  **이 Task가 새로 만드는 것 — 하나다.**
  1. `test/positioning.smoke.js` `runCalendarV4EquivalenceCases(collector)` — **고정 입력 넷을**
     **반드시 담는다. 값을 여기 적는다**(R7 test F1·F4 — 값이 Validate 에만 있으면 Action 은
     자기 완결이 아니고, DD29 가 고친 것과 같은 모양이다). 날짜는 전부
     `shiftDateKey(calendar.todayKey, ±n)` 으로 만든다:

     | # | `startDate` | `endDate` | 기대 `getEventDueState()` |
     |---|---|---|---|
     | 1 | `today-3` | `today` | `'today'` |
     | 2 | `today-5` | `today-1` | `'overdue'` |
     | 3 | `today` | `today+2` | `''` |
     | 4 | `today` | `today` | `'today'` |

     **각 고정 입력 줄에 주석 표식 `DD3-FIXTURE` 를 단다.** Validation 2b 가 그 표식을 세어
     넷 미만이면 죽는다 — 표식이 값의 정확성을 증명하지는 않지만, R7 test F1 이 지목한
     실패 모양("폭 없는 항목만으로 함수를 써 두는 것")은 확실히 잡는다. 1번 한 줄이
     DD3 의 실질 판정이다. **이 넷이 빠지면 케이스는 반증 불가능해지고, 그것은 케이스가 없는 것과 같다** — v3 데이터는 전부 `startDate === endDate`라 폭 없는 항목만으로는 DD3이 정반대로 구현돼도 통과한다

  **이 Task가 고치는 것 — 렌더 경로다. 새 시각 언어를 만들지 않는다(UI4).**
  - `getEventDueState()`(`newtab.js:2627`) — 종단 관문을 읽게 바꾼다(DD3)
  - `rebuildIndex()` — **`event.gates`를 돌며 `g.planned` 각각을 버킷에 넣는다. 파생 `startDate`·`endDate`는 인덱스 입력에서 뺀다** (DD31·UI15). 월·수 관문이면 화요일 버킷은 비어 있어야 한다. `dropped` 관문도 넣는다(계획은 남는다)
  - `getEventsForDate(dateKey)`(`newtab.js:2129`) — **같이 바꾼다**(DD31, santa R1 B5). 현재 규칙은 `event.startDate <= dateKey && dateKey <= event.endDate`라는 **범위 조회**이고 창 인덱스를 일부러 우회한다(패널이 렌더 창 밖 날짜를 열 수 있어서다 — 그 주석이 `newtab.js:2124`에 있다). 그대로 두면 그리드는 화요일을 비워 두는데 **화요일 칸을 누르면 패널에 그 이벤트가 나온다.** `event.gates.some((g) => g.planned === dateKey)`로 바꾼다 — 인덱스를 우회하는 이유(창 밖 조회)는 그대로 지키면서 점유의 정의만 관문으로 맞춘다
  - `renderSummary` · `renderGrid` · `createDayCell` · `createChips` · `renderPanel` · `createTodoItem` — 새 데이터를 읽되 기존 칩·뱃지 토큰을 그대로 쓴다

  세부는 아래에 잇는다. `getEventDueState()`가 **종단 관문**을 읽게 바꾼다(DD3) — 파생 `endDate`와 같은 값이므로 결과는 마이그레이션 전후로 동일해야 한다. `rebuildIndex()`가 **`gates[].planned`로 셀을 채운다** — 파생 범위로 채우던 현재 동작을 **버린다**(DD31·UI15). 이것이 이 Task에서 마이그레이션 전후 화면이 의도적으로 달라지는 **유일한** 지점이고, 그 차이가 곧 M2가 약속한 불연속 배치다. **점유를 읽는 자리가 둘이므로 둘 다 바꾼다** — 그리드는 `rebuildIndex()`의 버킷을 보고 패널은 `getEventsForDate()`의 범위 조회를 본다(`newtab.js:2874` → `2129`). 하나만 바꾸면 그리드가 비워 둔 날을 눌렀을 때 패널이 그 이벤트를 낸다(santa R1 B5). **한 날짜에 대해 그리드와 패널이 다른 답을 내면 불연속 배치는 구현된 것이 아니라 반쯤 구현된 것이고, 사용자가 보는 것은 버그다.** `renderSummary`·`renderGrid`·`createDayCell`·`createChips`·`renderPanel`·`createTodoItem`이 새 데이터를 읽되 **새 시각 언어를 만들지 않는다**(UI4) — 프로젝트는 기존 뱃지 자리에 이름만, 관문은 기존 칩 형태 그대로다. 겹침 경고를 만들지 않고 부하 표시도 하지 않는다(UI5, M3의 몫).
- **Mirror**: `newtab.js:2655` `render()`의 호출 순서와 `2757` `createDayCell()`의 aria-label 구성
- **Validate**: `runCalendarV4EquivalenceCases(collector)`를 새로 만든다. **이 함수가 DD3·DD4의 기계적 단언을 산출하는 자리이며, 이름이 없으면 그 단언은 존재하지 않는다**(R0 test F1·F2·F4가 막은 것이 정확히 이 부재다).
  - **왜 `snapshot()`이 아닌가.** `snapshot()`(`test/positioning.smoke.js:191`)은 위젯 기하만 담는다 — 마감 의미가 통째로 뒤집혀도 사각형은 움직이지 않으므로 그 diff는 DD3을 지키지 못한다(DD15).
  - **무엇을 비교하는가.** 같은 v3 데이터에 대해 **도메인 투영**을 두 번 떠서 맞댄다. **앱을 두 번 올린다**(santa R5 B2 — 한 번 올린 앱 안에서 "전후"를 보려던 앞선 판은 성립하지 않는다. `loadApp()`은 시동 마이그레이션이 끝난 뒤에야 반환하므로 그 안에서의 "전"은 이미 "후"다): (1) v3 데이터를 `loadApp`으로 올려 렌더한 것이 투영 A, (2) 그 데이터에 `promoteEventsToV4()`를 **직접 태워** 저장한 뒤 다시 `loadApp`으로 올려 렌더한 것이 투영 B다. 투영은 `migration-v3/01-promote`(`497`)의 관용구를 따른다.

    **투영을 두 무리로 가른다 — 하나는 같아야 하고 하나는 달라져야 한다**(DD31·UI15). 원래는 넷을 한 덩어리로 `JSON.stringify` 비교했는데, DD31이 점유를 관문으로 옮기면서 **뒤 둘이 의도적으로 달라졌다.** 그대로 두면 이 케이스는 변경이 성공했을 때 죽고, 그러면 사람이 단언을 지우게 되어 앞 둘의 보호까지 함께 사라진다. 무리를 가르는 것이 그 압력을 없앤다.

    - **`meaning` (불변) — 마이그레이션이 건드리면 안 되는 것.** 이벤트별 `getEventDueState()` 결과 · `.calendar-summary`의 `textContent`(없으면 `null`). DD3이 지키는 마감 의미가 여기 있다
    - **`occupancy` (의도적 변화) — 이 마일스톤이 바꾸려는 것.** 셋을 담고 **셋이 서로 다른 것임을 이름으로 못박는다**(santa R5 B4):
      - `bucketKeys` — `rebuildIndex()`가 만든 **날짜 키 목록**. `eventsByDate`는 `Map`이고 날짜당 키가 **하나뿐**이므로(`newtab.js:2098`·`2114`) 이 목록에는 같은 날짜가 두 번 나오지 않는다
      - `bucketSizesByDate` — 날짜별 **버킷 배열의 길이**. 같은 날에 이벤트 셋이 서면 `3`이다. 위 키 목록에서는 이 수를 알 수 없다
      - `chipCountsByDate` — 그리드 각 셀에 실제로 그려진 **칩 개수**. `createChips()`가 `MAX_CHIPS_PER_CELL`로 자르고 넘치면 `+N`을 붙이므로(`newtab.js:2820`·`2843`) 버킷 길이와 **같지 않을 수 있다**
  - **어떻게 판정하는가.** 네 단언을 건다. **diff가 아니라 단언이다**(DD15) — 재베이스라인해도 사라지지 않아야 하는 주장이다.
    1. `assert(JSON.stringify(A.meaning) === JSON.stringify(B.meaning), 'v4 마이그레이션이 마감 의미를 바꿨다')` — 원래 단언이 지키던 것이 그대로 남는다
    2. `assert(setEq(B.occupancy.bucketKeys, allGatePlannedDates), 'v4 점유가 관문 집합과 다르다')` — 점유의 **정의**가 관문이라는 DD31의 단언이다
    3. `assert(isSubset(B.occupancy.bucketKeys, A.occupancy.bucketKeys), 'v4가 v3에 없던 날을 점유했다')` — 승격은 관문을 **옛 범위의 양 끝**에 세우므로 새 날이 생길 수 없다. 생겼다면 승격이 틀린 것이다
    3b. 각 날짜 `d`에 대해 `assert(B.occupancy.chipCountsByDate[d] === Math.min(B.occupancy.bucketSizesByDate[d], MAX_CHIPS_PER_CELL), '그리드 칩이 인덱스와 어긋난다')` — **투영이 담는다고 적은 것을 실제로 단언한다**(santa R4 B2). 앞선 판은 `occupancy`에 "셀별 칩 개수"와 "버킷 키 목록" 둘을 담는다고 적어 놓고 단언은 버킷 키만 봤다. 그러면 `rebuildIndex()`는 옳게 고쳤는데 `createChips()`가 옛 범위로 칩을 그리거나 중복해 그려도 나머지가 전부 통과하고, **사람이 보는 그리드만 틀린 채로 남는다.**

        **비교 대상은 키 목록이 아니라 버킷 길이다**(santa R5 B4 — 앞선 판은 키 목록에서 개수를 유도하려 했는데, 날짜당 키가 하나뿐이므로 그 유도값은 **언제나 1**이고 같은 날 이벤트가 둘 이상인 고정 입력에서 **옳은 구현이 죽는다**). 상한 절단도 함께 넣는다 — `createChips()`가 `MAX_CHIPS_PER_CELL`을 넘기면 자르고 `+N`을 붙이므로, 자르지 않은 수와 비교하면 상한을 넘는 날에서 역시 옳은 구현이 죽는다.
    4. `assert(B.occupancy.bucketKeys.length < A.occupancy.bucketKeys.length, '불연속 배치가 반영되지 않았다 — 폭 있는 고정 입력이 있는데 점유 일수가 줄지 않았다')` — **이 케이스의 반증자다.** 아래 고정 입력에 `today-3..today`(4일 폭, 관문 둘)가 있으므로 DD31이 실제로 구현됐다면 점유가 반드시 줄어든다. 이 줄이 없으면 `rebuildIndex()`를 고치지 않고도 1~3번이 전부 통과한다

    투영 둘은 `collector.add('v4-equivalence/01-before'|'02-after', …)`로 함께 남겨 어긋났을 때 무엇이 달라졌는지 읽을 수 있게 한다.
  - **폭 있는 항목이 반드시 들어간다 — 이것이 없으면 이 케이스는 반증 불가능하다**(R2 test F1·F2). v3 마이그레이션 데이터는 전부 `startDate === endDate`이므로(v2 단일 날짜 승격) **"종단 관문만 읽는다"와 "모든 관문을 읽는다"가 같은 답을 낸다.** DD3이 정확히 반대로 구현돼도 케이스가 통과한다. 버그는 `startDate`가 과거이고 `endDate`가 오늘·미래인 항목에서만 드러나고, `getEventDueState()`의 문서 문장이 그 자리를 이미 지목한다 — "3일짜리 일정의 첫날은 아직 지연이 아니다"(`newtab.js:2622`). 그러므로 고정 입력에 최소 넷을 둔다:
    - `startDate = today-3` · `endDate = today` → `'today'`여야 한다. **모든 관문을 읽는 구현이면 `'overdue'`가 나와 즉시 죽는다 — 이 한 줄이 DD3의 실질 판정이다**
    - `startDate = today-5` · `endDate = today-1` → `'overdue'`
    - `startDate = today` · `endDate = today+2` → `''`(아직 급하지 않다)
    - `startDate = endDate = today`(폭 없음) → `'today'`
  - **날짜는 전부 `shiftDateKey(calendar.todayKey, ±n)`로 만든다.** 고정 날짜를 쓰면 하네스를 돌리는 날에 따라 같은 항목이 미래였다가 지연이 되어 케이스가 저절로 뒤집힌다 — `runSummaryCases`(`633`) 머리말이 같은 함정을 기록해 두었다.
  - 더해서 **시계 모드 경로의 `snapshot()` diff 0**(UI13). 기하는 이 축이 맞는 자리다

### Task 6: 첫 실행 온보딩
- **Action**:

  **이 Task가 새로 만드는 것 — 둘이다.**
  1. `newtab.html`·`newtab.js` 첫 실행 안내 표면
  2. `test/positioning.smoke.js` **`runCalendarOnboardingCases(collector)`** (R8 test F3)

  세부는 아래에 잇는다. **`this.projects.length === 0 && !this.projectsLoadFailed`일 때** 한 번 뜨는 안내를 만든다(DD13). **두 조건을 함께 보는 것이 요점이다**(santa R4 B3) — Task 3은 읽기 실패를 `this.projects = []` + `projectsLoadFailed = true`로 표현하므로, 앞 조건만 보면 **프로젝트가 멀쩡히 있는데 못 읽은 상태**가 "첫 실행"으로 오인된다. 그러면 둘 중 하나가 난다: 안내를 따라 프로젝트를 만들려 해도 `persistProjects()`가 DD27a로 잠겨 있어 실패하거나, 건너뛰기를 눌러 **한 번뿐인 온보딩 플래그를 첫 실행도 아닌데 태워 버린다.** 읽기 실패 상태에서는 온보딩 대신 DD27c의 상시 고지가 화면을 맡는다 — 사용자에게 필요한 말이 "프로젝트를 만드시겠어요?"가 아니라 "목록을 못 읽었습니다"이기 때문이다. 프로젝트 이름 하나를 받아 만들고, 건너뛰면 무소속으로 계속 쓴다. 다시 뜨지 않게 하는 플래그를 저장하되 **프로젝트를 만들지 않고 건너뛴 경우에도** 다시 뜨지 않는다 — 무소속이 정상 상태이므로 반복 안내는 강제가 된다(UI8).
- **Mirror**: `newtab.js:459` `applyStorageNotice()` — 상시 표면을 늘리지 않고 필요할 때만 나타나는 안내
- **Validate**: 하네스 케이스 — 프로젝트가 없으면 뜨고, 건너뛰면 다시 뜨지 않고, 온보딩이 밴드 높이와 패널 스크롤을 바꾸지 않는다(`test/positioning.smoke.js:909` `runErrorBannerGeometryCases()`와 같은 형태의 레이아웃 무변 단언)

### Task 7: 하네스 확충과 재베이스라인
- **Action**: Task 2~6이 만든 케이스 **다섯**을 `runAll()` 순서에 넣는다. **무엇을 잇는지 세어 적는다**(R8 test F4 — "Task 2~6에서 더한 케이스"라고만 적으면 Task 3·4·6이 무엇을 더했는지가 다시 판단의 문제가 된다): 기존 `runCalendarV3MigrationCases` 바로 뒤에 `runCalendarV4MigrationCases`, 그 뒤에 `runCalendarV4EquivalenceCases`(등가 판정은 마이그레이션이 검증된 다음에만 의미가 있다), 이어서 `runCalendarProjectCases` · `runCalendarGateCases` · `runCalendarOnboardingCases`. **시계 경로 diff 0을 먼저 확인한 뒤** 달력 경로를 의도된 변경으로 재베이스라인한다. 단언 실패가 0건인지 마지막에 다시 본다.
  **재베이스라인 직후, `베이스라인 내보내기`를 다시 눌러 파일을 새로 받은 뒤** 뒤쪽 앵커를 뜬다(santa R2 B3 · **santa R3 B3이 그 답의 구멍을 잡았다**) — `shasum -a 256 test/positioning.smoke.js work-calendar-m2.baseline.json > .claude/plans/work-calendar-m2.rebaseline.sha256`.

  **재내보내기가 빠지면 앵커가 아무것도 묶지 못한다.** 재베이스라인은 하네스를 다시 돌려 새 스냅샷을 `chrome.storage.local`의 `__smokeBaseline`에 넣는 동작이고(`test/positioning.smoke.js:1122` 부근), 저장소 루트의 `work-calendar-m2.baseline.json`은 **Task 0이 한 번 내려받아 둔 파일일 뿐 그것과 연결돼 있지 않다.** 재내보내기 없이 해시를 뜨면 "Task 0의 옛 파일이 그동안 안 바뀌었다"만 증명하고, 정작 **비교에 실제로 쓰이는 베이스라인과 커밋된 파일이 같은가**는 증명하지 않는다. 순서를 못박는다 — (1) 재베이스라인, (2) `베이스라인 내보내기` 재클릭 후 받은 파일로 `work-calendar-m2.baseline.json` 덮어쓰기, (3) 그 파일과 하네스로 `rebaseline.sha256` 생성. Task 0의 `baseline.sha256`은 **구현 전 기록이라 여기서 갱신하지 않고 그대로 둔다**; 둘의 차이가 이 마일스톤이 하네스와 베이스라인을 어떻게 움직였는지의 감사 기록이다. 끝 상태 게이트(Validation 3)가 읽는 것은 뒤쪽이다.
- **Mirror**: `test/positioning.smoke.js:975` `runAll()`의 실행 순서와 저장소 복원 규약
- **Validate**: 단언 실패 0건(`runCalendarV4EquivalenceCases`의 등가 단언 포함). 시계 경로 diff 0.
  - **"설명되는 diff"를 열거로 못박는다**(R0 invariant F4 — 정의가 없으면 거의 모든 diff를 정당화할 수 있다). 허용되는 diff는 **넷뿐**이다: (a) 새 케이스가 추가한 **새 키**(`v4-equivalence/*` · `migration-v4/*` · `project/*` · `gate/*` · `onboarding/*`), (b) 기존 달력 케이스의 도메인 투영에 **새 필드가 늘어난 것**(`gates` · `projectId`), (c) `migration-v3/01-promote`의 `fields` 문자열처럼 **필드 목록을 문자열로 담은 값이 그 두 필드만큼 길어진 것**, (d) **DD31이 요구하는 점유 축소 — 아래에 케이스 이름과 기대값까지 열거한다.**

    **(d)를 열거로 적는 이유**(santa R3 B2). 앞선 판은 (a)~(c) 셋만 허용하고 "기존 키의 기존 필드 **값**이 바뀌는 것"을 명시적으로 금지했는데, **DD31을 옳게 구현하면 정확히 그 금지된 변화가 난다.** 플랜이 자기 구현을 자기 검증으로 떨어뜨리고 있었다. 그렇다고 "값 변화 허용"이라고 넓히면 (a)~(c)를 열거로 못박은 R0 invariant F4의 취지가 통째로 사라지므로, **바뀌는 케이스와 바뀐 뒤의 값을 이름으로 적는다.**

    - `range/01-month-boundary`(`test/positioning.smoke.js:568-589`) — 입력이 `{ startDate: '2026-01-28', endDate: '2026-02-03' }` 한 건이므로 관문은 그 **양 끝 둘**이 되고 사이 나흘은 점유에서 빠진다.
      - `januaryChipDates`: `['2026-01-28','2026-01-29','2026-01-30','2026-01-31']` → **`['2026-01-28']`**
      - `februaryChipDates`: `['2026-02-01','2026-02-02','2026-02-03']` → **`['2026-02-03']`**
      - `distinctDates`(둘의 합집합을 정렬한 **배열**이지 개수가 아니다 — `test/positioning.smoke.js`의 `Array.from(new Set(january.concat(february))).sort()`): `['2026-01-28','2026-01-29','2026-01-30','2026-01-31','2026-02-01','2026-02-02','2026-02-03']` → **`['2026-01-28','2026-02-03']`**
    - 위 셋 **말고** 기존 키의 기존 필드 값이 바뀌면 그것은 (d)가 아니다. **DD31의 파급이 여기서 끝난다는 것이 이 열거의 주장이고**, 다른 케이스에서 값이 움직였다면 점유 말고 다른 것이 함께 바뀐 것이므로 재베이스라인하지 말고 원인을 찾는다.
    - 이 세 값은 **재베이스라인 전에 사람이 먼저 눈으로 맞춰 본다.** 재베이스라인은 diff를 지우는 동작이므로, 맞는지 보지 않고 누르면 (d)가 "모든 값 변화 허용"과 같아진다.
  - **허용되지 않는 것도 명시한다.** 기존 키의 **기하**(`snapshot()`이 담는 `rect`·`display`·`classes`·`intersects`)는 달력 경로에서도 **전부 diff 0이어야 한다** — UI4가 새 시각 언어를 금지했으므로 M2에서 사각형이 움직일 이유가 없다. 기존 키의 **기존 필드 값이 바뀐 것**(예: `donePreserved` · `promotedRanges` · `dueText`)도 허용되지 않는다. 이 둘 중 하나라도 나오면 **재베이스라인하지 않고 원인을 찾는다**

### Task 8: PRD 갱신과 하루 재현 테스트
- **Action**: PRD의 M2 행을 `complete`로 바꾸고, Open Question 1("연속 범위를 파생값으로 강등하는 마이그레이션")을 DD1~DD4 근거와 함께 해소 표기한다. **하루 재현 테스트를 실제로 수행하고 결과를 적는다**(UI11) — 지난 한 주의 실제 업무를 사후에 입력하고, (a) 관문이 실제 업무 경로를 담는가, (b) 작업당 실제로 쓰인 **이름 있는** 관문 수는 몇인가(DD9의 반증 지표), (c) 옮기는 비용이 실제로 줄었는가를 기록한다. **1~2개에 머물면 그 사실을 그대로 적는다** — PRD가 그것을 관문 모델 과잉의 신호로 미리 선언했고, 숨기면 반증 지표를 만든 이유가 사라진다.
- **Mirror**: `.claude/prds/work-calendar.prd.md` 의 Open Questions 절에 있는 M1 해소 표기의 `- [x] ~~...~~ **해소(날짜)** — 근거` 형태
- **Validate**: PRD의 M2 행이 `complete`이고 Open Question 1이 `[x]`이며 해소 근거가 한 줄 이상 있다. 하루 재현 테스트 결과가 수치가 아니라 **관찰 목록**으로 적혀 있다(UI10 — 정량 지표를 새로 만들지 않는다).
  - **이 항목이 검증하는 것은 산출물의 존재이지 테스트의 수행이 아니다**(R0 invariant F2). 기계적으로 확인 가능한 것만 요구한다 — PRD에 (a)~(c) 세 물음에 각각 답한 줄이 있고, (b)의 답이 **이름 있는 관문의 실제 개수**를 담고, 입력한 작업의 건수가 적혀 있는가. 수행 여부 자체는 확인할 수 없다.
  - **독립 판정자가 없다는 사실을 결과 옆에 함께 적는다.** M1이 같은 자리에서 같은 한계를 기록했다("판정자와 작성자가 같은 사람이다"). PRD도 "전부 단일 사용자의 자기 보고"를 약점으로 이미 선언했다. **한계를 적는 것이 이 마일스톤이 할 수 있는 전부이며, 적지 않으면 자기 보고가 측정으로 읽힌다**

## Validation

이 저장소에는 **테스트 러너도 빌드 단계도 없다.** 그리고 아래 검사들은 **도는 시점이 서로 다르다** — R4 invariant가 CRITICAL 둘로 지목한 것이 그 뒤섞임이다. 앞선 판은 넷을 한 블록에 늘어놓아 전부 게이트 검사처럼 보이게 했는데, **3·4번은 플랜 승인 시점에 돌 수 없다.** 3번이 검사하는 체크섬 파일은 Task 0이 만들고, 4번의 하네스는 구현이 있어야 의미가 있다. 닫힌 것처럼 보이는 열린 게이트를 만들지 않으려면 시점을 갈라 적어야 한다.

**2번도 승인 시점에는 통과하지 못한다** — 이 플랜이 만들라는 함수가 아직 없기 때문이다. 그것이 정상이고, 그래서 이것도 구현 시점 검사다.

### 승인 시점에 도는 것 (지금)

```bash
# 문법 — 현재 트리가 깨져 있지 않은지. 이것 하나뿐이다.
node --check newtab.js
```

플랜을 승인할 때 기계가 확인할 수 있는 것은 이것이 전부다. **나머지를 여기 두면 게이트를 흉내내는 것이 된다.**

### 구현 완료 시점에 도는 것 (Task 0~8을 마친 뒤)

```bash
# 1. 문법 — 모든 파일 변경 뒤 즉시
node --check newtab.js

# 이 블록에는 백슬래시를 쓰지 않는다 — 정규식 이스케이프도, 줄 연속도.
# 플랜 본문을 편집하는 과정에서 세 번 깨졌다: 역슬래시+b 가 리터럴 백스페이스(0x08)로,
# 역슬래시+별표 가 사라져 무효 문자 클래스로, 줄 연속 역슬래시가 리터럴 n 으로
# 바뀌어 목록에 없는 함수 `n` 을 검사 대상에 넣었다. 셋 다 `bash -n` 을 통과한다 —
# 문법은 멀쩡하고 의미만 틀리기 때문이다. 그러므로 이 블록은 **문법 검사가 아니라
# 실행으로** 검증한다: 한 줄이 길어지더라도 이스케이프 없는 형태로 적는다.

# 0b. **이 블록을 도는 셸을 못박는다** (santa R5 B3). 아래는 POSIX sh/bash 문법이다 —
#     함수 정의(`decl() { ... }`), `[ ... ]` 테스트, `grep`·`sed`·`shasum`을 쓴다.
#     이 저장소의 기본 셸은 PowerShell 이고 **거기서는 이 블록이 돌지 않는다.**
#     Git for Windows 가 함께 깔려 있으므로 Git Bash 에서 돌린다 — 확인:
#         bash -lc 'grep --version >/dev/null && sed --version >/dev/null && echo ok'
#     `shasum` 이 없으면 `sha256sum` 으로 바꾼다(둘 다 같은 형식을 쓴다).
#     플랜이 셸을 적지 않으면 "기계 게이트가 있다"고 적어 놓고 실행자가 그것을
#     돌릴 방법을 모르는 상태가 된다 — 없는 게이트와 구별되지 않는다.

# 2. 약속 이행 검사 — 이 플랜이 약속한 함수가 실제로 코드에 있는가 (DD23)
#    "체크박스는 쳐졌는데 함수가 없다"를 잡는다. 판정이 아니라 존재 확인이라
#    DD11(두 번째 판정자를 만들지 않는다)에 걸리지 않는다.
#    선언 형태 여섯을 전부 잡는다 — function · async function · const/let/var 대입 ·
#    메서드 축약. `function $fn` 만 보면 화살표 함수를 놓친다 (R2 architect F4).
#    **선언 접두어를 선택적으로 두면 검사가 뒤집힌다** (santa R2 B4). 앞선 판은
#    접두어 그룹에 `?` 를 달아 두었고, 그러면 `await runCalendarProjectCases(collector);`
#    라는 **호출 한 줄이 "선언이 있다"를 통과시킨다.** 실측했다 — 통과한다.
#    그러면 이 블록은 "약속한 함수가 실제로 있는가"를 묻는다고 적혀 있으면서
#    아무것도 묻지 않는다. `?` 는 클래스 메서드 축약(`  async loadProjects() {`)을
#    잡으려고 붙었던 것이므로, 그것을 **선택적 접두어가 아니라 별도 가지**로 적는다.
#    가지 둘 — (1) 줄머리의 키워드 선언, (2) 들여쓴 메서드 축약이되 **같은 줄에서**
#    **`) {` 로 닫히는 것**. (2)의 닫힘 요구가 호출과 선언을 가른다.
#    이스케이프 없는 형태는 그대로 지킨다 — `[(]`·`[)]`·`[{]` 는 문자 클래스다.
decl() { printf '(^(function|async[[:space:]]+function|const|let|var)[[:space:]]+%s[[:space:]]*[(=:]|^[[:space:]]*(async[[:space:]]+)?%s[[:space:]]*[(][^)]*[)][[:space:]]*[{])' "$1" "$1"; }
for fn in runCalendarV4MigrationCases runCalendarV4EquivalenceCases runCalendarProjectCases runCalendarGateCases runCalendarOnboardingCases spyOn; do
  grep -qE "$(decl $fn)" test/positioning.smoke.js || { echo "MISSING: $fn"; exit 1; }
done
#    newtab.js 함수 열하나 — createCalendarGate 가 R4 에서 빠져 있었다 (security F1 · test F3).
#    (santa R1 자체 발견: 이 주석이 "일곱"이라 적혀 있었는데 아래 목록은 열하나다.
#     Acceptance 쪽은 처음부터 열하나로 맞아 있었으므로 틀린 것은 이 주석이었다.)
for fn in promoteEventsToV3 promoteEventsToV4 deriveEventRange createCalendarGate createCalendarProject loadProjects persistProjects reconcileProjectRefs addGate updateGate removeGate; do
  grep -qE "$(decl $fn)" newtab.js || { echo "MISSING: $fn"; exit 1; }
done
#    배선 검사 — 다섯 **전부**를 `runAll()` **본문 안에서** 찾는다 (santa R1 B4).
#    앞선 판은 `grep -q "runCalendarV4EquivalenceCases(collector)"` 하나였는데,
#    **그 문자열은 선언부 `function runCalendarV4EquivalenceCases(collector) {` 자신에**
#    **매치되므로 배선을 하나도 안 해도 통과한다.** 게다가 다섯 중 하나만 봤다.
#    범위를 runAll 본문으로 좁히면 선언부가 빠지고, 그때 남는 매치는 호출뿐이다.
#    (전제: `runAll` 은 column 0 의 `async function runAll(` 로 시작해 column 0 의
#     `}` 로 끝난다 — 현재 test/positioning.smoke.js:975·1018 이 그 형태이고,
#     기존 호출도 `await runBandInvariance(collector);` 처럼 본문 안에 있다.
#     runAll 을 들여쓰거나 중첩 함수로 바꾸면 이 검사가 먼저 죽는다 — 조용히
#     통과하지 않고 죽는 쪽이므로 fail-closed 다.)
runall() { sed -n '/^async function runAll(/,/^}/p' test/positioning.smoke.js; }
[ "$(runall | wc -l)" -gt 5 ] || { echo "runAll() 본문을 뜨지 못했다 — 선언 형태가 바뀌었는지 확인하라"; exit 1; }
for fn in runCalendarV4MigrationCases runCalendarV4EquivalenceCases runCalendarProjectCases runCalendarGateCases runCalendarOnboardingCases; do
  runall | grep -q "$fn(collector)" || { echo "NOT WIRED into runAll(): $fn"; exit 1; }
done

# 2b. 호출 자리 검사 — DD26·DD28 의 불변식은 "존재"가 아니라 "부르는 자리"다
#     (R7 invariant F3·F5). 존재만 보면 선언해 놓고 아무 데서도 부르지 않는
#     경우를 통과시키고, 그것이 DD26 이 R3 에서 CRITICAL 로 잡힌 결함의 모양이다.
#     주석으로 시작하는 줄을 걷어낸 뒤 `이름(` 등장 횟수를 센다 — 선언 1 + 호출 N.
#     **정규식 이스케이프를 한 글자도 쓰지 않는 형태로 적는다.** BRE 에서 `(` 는
#     리터럴이고 주석 제외는 문자 클래스 하나로 끝나므로 필요가 없다. 이 규칙은
#     취향이 아니다 — 이 블록을 처음 쓸 때 이스케이프가 플랜으로 옮겨지는 과정에서
#     깨져 `(*|//|/*)` 라는 무효 패턴이 됐고, 실행해 보지 않았다면 "검사가 있다"고
#     적힌 채 아무것도 검사하지 않았을 것이다. R4·R6 이 잡은 결함과 같은 종류다.
occ() { grep -v '^[[:space:]]*[*/]' "$2" | grep -o "$1(" | wc -l; }
D=$(occ deriveEventRange newtab.js)
[ "$D" -ge 4 ] || { echo "deriveEventRange: 선언 1 + DD26 의 호출 3자리 = 4회 이상이어야 하는데 ${D}회"; exit 1; }
R=$(occ reconcileProjectRefs newtab.js)
[ "$R" -ge 3 ] || { echo "reconcileProjectRefs: 선언 1 + DD28 의 병목 2자리 = 3회 이상이어야 하는데 ${R}회"; exit 1; }

#     ↓ 이 검사가 통과했을 때 반드시 보이는 자리에 한계를 적는다 (santa R0 A2, CRITICAL).
#     한계는 원래 Acceptance 목록과 DD26 본문에만 적혀 있었다. 이 블록을 돌리는
#     사람은 그 둘을 읽지 않고 "통과"만 보므로, 통과 메시지가 곧 오해의 자리였다.
echo "  [주의] 위 둘은 **횟수만** 세는 하한 검사이고 **자리를 특정하지 못한다.**"
echo "         deriveEventRange 4회가 전부 createCalendarEvent() 안에 있어도 통과한다."
echo "         그때 promoteEventsToV4()·관문 CRUD 는 파생을 안 하고, startDate != min(planned)"
echo "         인 이벤트가 저장소에 커밋된다 (DD26 이 CRITICAL 로 경고한 바로 그 손상)."
echo "         reconcileProjectRefs 3회도 마찬가지로 { projectsLoaded } 인자 유무와"
echo "         병목 둘(persistProjects·replaceEvents)에 실제로 들어갔는지를 보지 못한다 (DD28)."
echo "         자리를 특정하는 것은 아래 4번의 spy 단언뿐이며, 그것은 브라우저에서"
echo "         사람이 돌려야 한다. **이 블록의 통과는 DD26·DD28 의 충족이 아니다.**"
#     등가 케이스의 고정 입력 넷 — 표식을 센다 (R7 test F1).
#     표식이 값의 정확성을 증명하지는 않는다. 잡는 것은 "폭 없는 항목만으로 케이스를
#     써 두어 DD3 이 정반대로 구현돼도 통과하는" 모양이며, 그것이 F1 이 지목한 실패다.
F=$(grep -c "DD3-FIXTURE" test/positioning.smoke.js)
[ "$F" -ge 4 ] || { echo "DD3 고정 입력 표식이 ${F}개 — Task 5 가 요구하는 넷을 못 채운다"; exit 1; }
#     이것은 **하한 검사이고 자리를 특정하지 못한다** — 같은 자리에서 네 번 불러도
#     통과한다. 정확한 자리는 하네스의 spy 가 본다(DD24 의 호출 층위). 이 줄은 그것을
#     대신하지 않고 **앞에 선다**: spy 는 사람이 브라우저를 열어야 돌고, 이것은 지금 돈다.
#    존재 확인은 "아예 없는" 경우만 잡는다. 빈 스텁은 여기를 통과하고
#    4번의 등가·spy 단언에서 죽는다 — 세 층위를 섞지 않는다 (DD24).

# 3. 앵커 검사 — Task 0의 해시가 지금 파일과 맞는가 (DD23)
#    Task 0 이 하네스에 더한 '베이스라인 내보내기' 버튼으로 내린 파일을 검사한다.
#    그 버튼은 지금 없다 — Task 0 이 만든다 (R4 invariant F3). 그러므로 이 줄은
#    Task 0 이전에는 돌지 않으며, 그것이 이 절이 두 시점으로 갈린 이유다.
#    **앵커는 둘이고, 끝에서 보는 것은 뒤엣것이다** (santa R2 B3).
#    Task 0 이 뜬 `baseline.sha256` 은 **구현 전** 하네스와 베이스라인을 가리킨다.
#    그런데 Task 2~7 이 `test/positioning.smoke.js` 를 고치고 Task 7 이 재베이스라인
#    하므로, 그 파일로 `-c` 를 돌리면 **설계상 반드시 깨진다.** 앞선 판은 그것을
#    끝 상태 게이트로 걸어 두어 자기 종료 조건을 만족할 수 없는 플랜이었다.
#    갈라 적는다 —
#      · `baseline.sha256`   : Task 0 이 쓰고 **그 자리에서 한 번** 확인한다.
#                              이후로는 기록이지 게이트가 아니다. 무엇을 기준으로
#                              베이스라인을 떴는지 남기는 것이 이것의 용도다.
#      · `rebaseline.sha256` : Task 7 이 재베이스라인 직후에 쓴다. **끝 상태 게이트는**
#                              **이쪽이다.** 둘의 차이가 곧 "이 마일스톤이 하네스와
#                              베이스라인을 어떻게 움직였는가"의 감사 기록이다.
#    둘 다 커밋한다. 뒤엣것만 두면 R0 invariant F6 이 막으려던 것 — 아무 데나
#    대고 재베이스라인해도 아무도 모르는 상태 — 이 되돌아온다.
shasum -a 256 -c .claude/plans/work-calendar-m2.rebaseline.sha256

# 4. 스모크 하네스 — 브라우저에서 연다 (자동화 불가)
#    빈 프로필/시크릿 창에서 test/positioning.smoke.html 을 열고:
#      - "Run" 으로 전 케이스 실행
#      - 단언 실패 0건 확인 (베이스라인과 무관한 축)
#      - "Compare" 로 베이스라인 대비 diff 확인 (변화 축)
#    두 축은 독립이다. 재베이스라인해도 단언 실패는 사라지지 않는다.
#
#    이 마일스톤의 핵심 주장 — "마이그레이션 전후로 같은 화면"— 은 diff 축이
#    아니라 단언 축에 둔다(DD15). runCalendarV4EquivalenceCases() 의 단언이
#    그것이며, 재베이스라인으로 지워지지 않는다.
#    snapshot() 은 위젯 기하만 담으므로 마감 의미를 보지 못한다 — 그 축의
#    diff 0 은 UI13(시계 경로 무변)과 UI4(새 시각 언어 없음)의 판정이다.
```

**앵커가 플랜 해시에 묶이지 않는다는 것도 적어 둔다**(R4 invariant F5). 베이스라인은 Task 0에서, 즉 승인 뒤에 생기므로 이 플랜의 sha256이 그것을 구속할 방법이 없다. 앵커가 사는 범위는 **Task 0과 Task 8 사이의 무단 변경**뿐이고, "승인된 베이스라인으로 시작했는가"는 이 저장소의 수단으로 증명되지 않는다. 그 이상을 주장하지 않는다.

**게이트가 커밋을 막지 못한다.** CI도 커밋 훅도 없으므로 "하네스가 초록일 때만 커밋한다"를 잇는 것은 이 문장 하나뿐이다. M1이 같은 자리에 같은 문장을 적었고, 그것이 이 저장소에서 유일하게 정직한 표현이다.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **마이그레이션이 마감의 의미를 바꾼다** — 관문 전부가 마감을 만들면 지나간 `startDate`가 전부 지연으로 보고된다 | High | High | DD3이 마감 입력을 종단 관문으로 고정하고, Task 5의 `runCalendarV4EquivalenceCases()`가 마이그레이션 전후 도메인 투영을 맞대 **단언**한다(DD15). **기존 요약 배너 케이스는 이 위험을 잡지 못한다** — `runSummaryCases`(`test/positioning.smoke.js:638`)는 `addEvent()`로 새 이벤트를 만들 뿐 마이그레이션된 데이터를 전혀 보지 않는다(R0 test F2). 그 케이스에 기대던 이전 판단은 틀렸고, 새 등가 케이스가 그 자리를 대신한다 |
| **v3 마이그레이션이 영영 실행되지 않는다** — 상수만 올리면 v2 저장소가 승격을 건너뛴다 | High | High | DD10이 `SETTINGS_VERSION_V3`를 분리한다. Task 2의 판정에 **v2 → v4 연쇄 케이스**를 필수로 넣었다 — 이 함정은 그 케이스에서만 드러난다 |
| **반증 지표가 마이그레이션으로 오염된다** — 이름 없는 관문을 함께 세면 "1~2개에 머문다"가 발화하지 못한다 | Medium | High | DD9가 세는 대상을 이름 있는 관문으로 좁힌다. DD2의 `kind: null`이 구분을 공짜로 준다 |
| **데이터 모델 4차 변경** — 단일 날짜 → 범위 → 관문 집합. 이전 변경 이후 얼마 지나지 않았다 | High | High | PRD가 "지금이 여전히 가장 싼 시점이며 매일 비싸진다"고 판단했다. 완화는 마이그레이션 관용구 재사용(DD10)과 레거시 잔존 필드(DD4), 그리고 되돌릴 수 있는 Task 순서(DD14)다. **위험을 없애지 못하고 줄일 뿐이다** |
| **관문 모델 과잉** — 실제로는 작업당 관문 1~2개만 쓰인다 | Medium | High | 없애지 않는다. Task 8이 실측하고 결과를 그대로 적는다. 과잉이면 M3 이후 범위를 재검토한다 |
| **저장소 축출** — 무제한 권한이 있어도 압박 상황에서 미사용 항목이 축출될 수 있다 | Low | High | **이 마일스톤에는 완화책이 없다.** 백업 경로가 그것이었고 아래 범위 축소로 빠졌으므로, M2 동안 이 위험은 **줄지 않고 그대로 있다.** PRD가 백업을 M4 착수 전까지 요구하므로 다음 마일스톤이 곧바로 이것을 다룬다. 축출이 실제로 얼마나 쉬운지는 PRD의 미해결 질문이다 |
| **화면 적응이 M3의 디자인 결정을 선점한다** — Task 5에서 관문을 어떻게 보일지 정해 버릴 수 있다 | Medium | Medium | UI4가 경계다. **기계는 이 경계를 지키지 못한다**(santa R0 B5) — `snapshot()` 기하 diff 0은 레이아웃이 안 움직였다만 말하고 색·문구·칩 형태를 보지 않으므로, 새 시각 언어를 만들고도 통과한다. 실제 판정자는 Acceptance의 `[사람]` 육안 대조 항목 하나이며 강제 수단은 없다 |
| **한 파일 4199줄이 더 커진다** — `newtab.js`에 모듈 시스템이 없다 | High | Low | 이 마일스톤에서 분할하지 않는다. 분할은 데이터 모델 변경과 함께 오면 두 위험이 곱해진다. 백로그로 남긴다 |

## Design Routing Guide

routing mode: `auto` (implement 단계에서 유효). **plan 단계는 아무것도 호출하지 않는다** — 렌더된 UI가 아직 없으므로 아래는 체크리스트일 뿐이다.

| Stage | Command |
|---|---|
| discovery | `/impeccable shape` |
| refine | `/impeccable layout` · `/impeccable typeset` · `/impeccable animate` · `/impeccable colorize` · `/impeccable bolder` · `/impeccable quieter` · `/impeccable overdrive` · `/impeccable delight` |
| simplify | `/impeccable adapt` · `/impeccable distill` · `/impeccable clarify` |
| evaluate | `/impeccable critique` · `/impeccable audit` |
| harden | `/impeccable harden` · `/impeccable optimize` · `/impeccable onboard` |
| polish | `/impeccable polish` |
| system | `/impeccable document` · `/impeccable extract` |

**이 마일스톤에서는 위 표의 어느 것도 실행하지 않는다.** PRD가 M1·M3만 디자인 수렴 대상으로 선언했고 M2는 데이터 작업이다. `design_signal`이 켜진 이유는 플랜이 `newtab.html`·`newtab.css`·`test/positioning.smoke.html`을 건드리기 때문이지 새 시각 언어를 만들기 때문이 아니다 — UI4가 그것을 금지한다. 접근성 회귀가 의심되면 `/impeccable audit` 하나만 선택적으로 본다.

M3이 관문·부하 표시의 시각 언어를 결정할 때 위 순서를 따른다. M2가 그 결정을 앞당기지 않는 것이 UI4의 목적이다.

## Acceptance

**항목마다 앞에 판정자를 적는다.** `[기계]` 는 셸이 지금 판정한다. `[사람]` 은 사람이
브라우저에서 하네스를 돌려야 알 수 있고 **이 저장소에는 그것을 강제할 수단이 없다.**
`[기계+사람]` 은 존재는 기계가, 통과는 사람이 본다(DD24 의 층위 구분).

표기를 목록 **안**으로 옮긴 이유는 R7 invariant F6·F8 이다. 강제력 설명은 이 목록
아래 문단에 원래 있었는데, 체크박스를 치는 사람은 목록을 읽지 그 뒤 문단을 읽지
않는다. 내용이 맞는데 형태가 틀린 것이고, DD29 가 Task Action 에서 고친 것과 **같은
결함이 같은 문서의 다른 절에 남아 있었다**(DD30).

- [ ] `[사람]` Task 0~8 전부 완료
- [ ] `[기계]` `node --check newtab.js` 통과
- [ ] `[사람]` 스모크 하네스 단언 실패 0건
- [ ] `[사람]` **시계 모드 경로 `snapshot()` diff 0** (UI13)
- [ ] `[사람]` **달력 경로 `snapshot()` 기하 diff 0** — 레이아웃이 움직이지 않았다는 판정이다. **UI4("새 시각 언어를 만들지 않았다")의 판정이 아니다** (santa R0 B5, HIGH): `snapshot()`은 rect·display·classes·`inlineWidth`만 담고 색·문구·칩 형태·아이콘을 담지 않으므로, 위젯 사각형을 1픽셀도 안 움직이면서 시각 언어를 통째로 갈아 끼워도 이 diff는 0으로 통과한다
- [ ] `[사람]` **UI4 판정은 사람이 눈으로 본다** — 확장을 브라우저에서 열어 달력 표면을 M1 상태와 나란히 놓고, 프로젝트가 **기존 뱃지 자리에 이름만**으로, 관문이 **기존 칩 형태 그대로** 나오는지 확인하고 그 결과를 적는다. 새 색·새 아이콘·새 칩 모양·새 상시 표면이 하나라도 생겼으면 실패다. **이 저장소에는 이것을 기계로 판정할 수단이 없고, 위 diff 항목이 그 대역이 될 수 없다는 것이 이 항목이 따로 서 있는 이유다**
- [ ] `[기계+사람]` **`runCalendarV4EquivalenceCases()`가 존재하고(기계) 네 단언이 통과한다(사람)** — `meaning`(마감 상태 · 배너 문구)은 마이그레이션 전후로 **일치**하고, `occupancy`(셀별 칩 수 · 인덱스 버킷 키)는 관문 집합과 같으며 옛 점유의 부분집합이고 **폭 있는 고정 입력에서 반드시 줄어든다** (DD15·DD31·UI15)
- [ ] `[사람]` **불연속 배치가 화면에 보인다** — `today-3`·`today`에 관문 둘을 가진 이벤트를 만들고 그리드에서 `today-2`·`today-1` 셀이 **비어 있는지** 눈으로 확인한다. 이것이 M2의 헤드라인 결과물이고 위 4번 단언의 사람 쪽 확인이다 (UI15, santa R0 B2) (DD3·DD4·DD15). **diff가 아니라 단언이므로 재베이스라인해도 남는다**
- [ ] `[사람]` v2 → v3 → v4 연쇄 마이그레이션 케이스 통과, **그리고 340px 캐시 정리로 v3의 실행이 단언됐다** (DD10·DD16)
- [ ] `[기계]` **앵커 둘이 있고 뒤엣것이 통과한다** — Task 0이 `baseline.sha256`을(구현 전 기록), Task 7이 재베이스라인 직후 `rebaseline.sha256`을 남겼고, **`shasum -a 256 -c .claude/plans/work-calendar-m2.rebaseline.sha256`이 통과한다.** 앞엣것으로 끝 상태를 검사하지 않는다 — Task 2~7이 하네스를 고치므로 설계상 깨진다 (DD23, santa R2 B3)
- [ ] `[기계]` **Validation 2번의 약속 이행 검사가 통과한다** — `newtab.js`의 함수 **열하나**(`promoteEventsToV3` · `promoteEventsToV4` · `deriveEventRange` · `createCalendarGate` · `createCalendarProject` · `loadProjects` · `persistProjects` · `reconcileProjectRefs` · `addGate` · `updateGate` · `removeGate`)과 하네스 산출물 **여섯**(케이스 다섯 — `runCalendarV4MigrationCases` · `runCalendarV4EquivalenceCases` · `runCalendarProjectCases` · `runCalendarGateCases` · `runCalendarOnboardingCases` — 과 `spyOn` 헬퍼)이 실제로 있고 등가 케이스가 `runAll()`에 연결됐다 (DD23. R4에서 `createCalendarGate`가 목록에서 빠져 개수가 맞지 않았다 — security F1. R5에서 `sanitizeImportedProjects`를 `reconcileProjectRefs`로 바꿨다 — DD28)
- [ ] `[기계]` **Validation 2b번의 호출 자리 검사가 통과한다** — `deriveEventRange(` 4회 이상(선언 1 + DD26의 호출 3자리), `reconcileProjectRefs(` 3회 이상(선언 1 + DD28의 병목 2자리), `DD3-FIXTURE` 표식 4개 이상(Task 5의 고정 입력). **하한 검사이고 자리를 특정하지 못한다** — 특정은 아래 항목의 spy가 한다 (R7 invariant F3·F5)
- [ ] `[사람]` **`deriveEventRange` 호출·결과 단언이 통과한다** — `promoteEventsToV4()`가 각 이벤트에 그것을 부르고, 승격된 전건의 `startDate`·`endDate`가 관문의 `min`·`max`와 일치한다 (DD26의 셋째 호출 자리, R4 architect F1)
- [ ] `[사람]` **프로젝트 목록을 읽지 못한 상태에서는 강등하지 않는다** — `projectsLoaded`가 거짓일 때 `reconcileProjectRefs()`가 입력을 그대로 돌려주고, 가져온 이벤트의 `projectId`가 살아남는다 (R9 security F3 — 이것이 없으면 DD28이 참조 무결성 대신 데이터 소실을 만든다)
- [ ] `[사람]` **프로젝트 목록을 읽지 못했으면 프로젝트를 쓰지 않는다** — `projectsLoadFailed`가 참인 상태에서 `persistProjects()`가 `storage.set`을 **한 번도 부르지 않고** `false`를 돌려주고, 저장소의 `calendarProjects`가 그대로인지 단언한다 (DD27a, santa R0 B3)
- [ ] `[사람]` **쓰기가 실패하면 `this.projects`가 옛 값 그대로다** — `storage.set`을 실패하게 만든 뒤 `persistProjects(next)`가 `false`를 돌려주고 `this.projects !== next`인지, 성공하면 `this.projects === next`인지 양쪽을 단언한다 (DD27b, santa R0 B4)
- [ ] `[사람]` **성공한 프로젝트 변경이 그 렌더에 보인다** — `spyOn`으로 `render`를 감싸고, `persistProjects(next)` 성공 시 **render가 불린 시점에 이미 `this.projects === next`**인지 단언한다. 대입이 `persistEvents()` 밖에 있으면 render가 옛 목록으로 돌아 이 단언이 죽는다 (DD27b, santa R1 B1)
- [ ] `[사람]` **항목 하나가 손상돼도 봉인된다** — `calendarProjects`를 배열로 두되 한 항목만 망가뜨린 뒤, `projectsLoadFailed`가 참이 되고 `persistProjects()`가 `false`를 돌려주며 **그 프로젝트를 가리키던 이벤트의 `projectId`가 살아 있는지** 단언한다 (DD27a, santa R1 B2)
- [ ] `[사람]` **`id`를 잃은 행은 되살아나지 않는다** — `calendarProjects`의 한 행에서 `id`만 지운 뒤, `projectsLoadFailed`가 참이 되고 그 프로젝트를 가리키던 이벤트의 `projectId`가 **살아 있는지** 단언한다. 생성 게이트에 맡기면 새 UUID가 붙어 통과하므로 이 단언이 죽는다 (DD27a, santa R2 B1)
- [ ] `[사람]` **버려진 이벤트가 있으면 쓰기가 잠긴다** — `calendarEvents`에 검증 탈락 항목 하나를 섞어 올린 뒤, `loadFailed`가 참이고 `persistEvents()`가 `false`를 돌려주며 **저장소의 배열 길이가 그대로인지** 단언한다. 지금 코드는 버린 뒤 `loadFailed = false`를 세우므로 이 단언이 죽는다 (Task 1, santa R5 B1)
- [ ] `[사람]` **탈락 항목이 있는 가져오기는 배치째 거절된다** — 유효 항목 둘과 무효 항목 하나가 든 파일을 가져왔을 때 **아무것도 들어오지 않고** 기존 일정이 그대로인지 단언한다. 지금 코드는 무효 하나만 건너뛰고 둘을 들인다 (Task 1, santa R5 B1)
- [ ] `[사람]` **`reconcileProjectRefs()`가 인자 누락을 즉시 드러낸다** — 셋째 인자 없이 부르면 던지는지 단언한다. 부재 시 `false`로 읽는 fail-closed 기본값은 안전하지만 **빠뜨린 사실 자체를 영영 숨기므로**, R1·R2가 두 번 다친 자리에 문서 규약 말고 실행 시점 단언을 하나 둔다 (DD28, santa R5 A 제안)
- [ ] `[사람]` **손상된 v4 관문은 재구성되지 않고 거절된다** — `gates`가 배열로 있으나 전부 무효이고 `startDate`·`endDate`가 남은 이벤트를 넣었을 때, `createCalendarEvent()`가 `null`을 돌려주고 적재 경로가 쓰기를 봉인하며 가져오기 경로가 배치를 거절하는지 단언한다. 범위에서 재구성하면 `kind`·`actual`·`status`가 사라진 채 통과하므로 이 단언이 죽는다 (Task 1, santa R4 B1)
- [ ] `[사람]` **그리드 칩이 인덱스와 어긋나지 않는다** — `occupancy.chipCountsByDate`가 `bucketKeys`에서 유도한 값과 같은지 단언한다. `rebuildIndex()`만 고치고 `createChips()`가 옛 범위로 그리면 버킷 키 단언 넷은 통과하고 여기서만 죽는다 (DD31, santa R4 B2)
- [ ] `[사람]` **읽기 실패를 첫 실행으로 오인하지 않는다** — `calendarProjects`를 손상시켜 `projectsLoadFailed`가 참인 상태에서 온보딩이 **뜨지 않고** 한 번뿐인 온보딩 플래그가 **타지 않는지** 단언한다. 대신 DD27c의 상시 고지가 뜬다 (Task 6, santa R4 B3)
- [ ] `[사람]` **`베이스라인 내보내기` 버튼이 실제로 파일을 받아 낸다** — 브라우저에서 눌러 `work-calendar-m2.baseline.json`이 실제로 내려오는지 확인한다. 리스너가 `test/positioning.smoke.js`에 붙지 않으면 버튼만 생기고 아무 일도 안 일어나며, 그러면 앵커 사슬이 시작되지 않는다 (Task 0, santa R3 B1)
- [ ] `[기계+사람]` **재베이스라인 뒤 커밋된 베이스라인 파일이 실제 비교 기준과 같다** — Task 7이 재베이스라인 → `베이스라인 내보내기` 재클릭 → 파일 덮어쓰기 → `rebaseline.sha256` 생성 **순서로** 했고(사람), `shasum -c`가 통과한다(기계). 재내보내기를 빠뜨리면 옛 파일이 안 바뀐 것만 증명된다 (santa R3 B3)
- [ ] `[사람]` **DD31의 점유 축소가 열거한 세 값에서만 난다** — 재베이스라인 **전에** `range/01-month-boundary`의 `januaryChipDates`·`februaryChipDates`·`distinctDates`가 Task 7이 적어 둔 기대값과 같은지 눈으로 맞춘다. 다른 기존 케이스에서 값이 움직였으면 재베이스라인하지 않고 원인을 찾는다 (santa R3 B2)
- [ ] `[사람]` **가져오기와 마이그레이션이 같은 입력에 같은 답을 낸다** — 폭 있는 v3 이벤트 하나(`startDate = today-3`·`endDate = today`)를 (a) 마이그레이션으로 승격시킨 결과와 (b) 같은 JSON을 `replaceEvents()`로 가져온 결과의 `gates.map(g => g.planned).sort()`가 **일치하는지** 단언한다. 종단 관문만 만들면 (b)가 하나로 접혀 죽는다 (DD1, santa R2 B2)
- [ ] `[사람]` **프로젝트 읽기 실패가 화면에 고지된다** — `applyStorageNotice({ projectsLoadFailed: true })`가 `storageNotice`에 프로젝트 문구를 낸다. 늘어난 서명을 안 쓰면 아무 문구도 안 나와 죽는다 (DD27c, santa R1 B3)
- [ ] `[사람]` **그리드와 패널이 같은 날짜에 같은 답을 낸다** — `today-3`·`today` 관문 이벤트에서 `today-1` 셀이 비어 있고 **그 날짜의 `getEventsForDate()`도 빈 배열인지** 단언한다. 둘 중 하나만 고치면 여기서 죽는다 (DD31, santa R1 B5)
- [ ] `[사람]` **프로젝트+이벤트 커밋이 `set()` 한 번이다** — `spyOn`으로 `storage.set` 호출 수를 세어 프로젝트 변경 경로에서 정확히 1인지 단언한다 (DD22·DD27, R9 security F2)
- [ ] `[사람]` **끊긴 프로젝트 참조가 두 경로 모두에서 강등된다** — 프로젝트 삭제와 가져오기 각각에서 `projectId`가 `null`로 내려앉고 **이벤트 수가 줄지 않으며**, 로컬 프로젝트가 가져오기로 사라지지 않는다 (DD7·DD28)
- [ ] `[기계]` PRD M2 행 `complete`, Open Question 1 해소 표기
- [ ] `[사람]` **하루 재현 테스트를 실제로 수행하고 결과를 적었다.** 이름 있는 관문 수가 1~2개에 머물면 그 사실을 숨기지 않고 기록했다 (UI11 · DD9)
- [ ] `[사람]` 브라우저에서 확장을 실제로 1회 로드해 마이그레이션과 관문 편집을 손으로 확인했다 — **하네스 통과가 경로 작동과 같지 않다**

**`[사람]` 항목은 서른여섯 중 스물아홉이다.** 그 스물아홉은 체크한다고 해서 참이 되지 않는다 —
러너도 CI도 커밋 훅도 없으므로 이 목록의 **서른여섯 중 스물아홉**은 약속이지 게이트가
아니다. **비율을 근사해서 적지 않는다** — "절반"·"일곱 중 다섯" 같은 어림수가 항목이
늘 때마다 조용히 틀려지는 것이 아래 괄호가 기록한 사고의 원인이었다. 같은 수를 두 번
적는다.
(santa R0 에서 앞 문장이 "열하나"라 해 놓고 다음 문장이 "그 아홉"·"그 절반"이라
적고 있는 것을 잡았다. 세 수가 서로 달랐고 어느 것도 목록과 맞지 않았다. 지금은
`[기계]` 다섯 · `[기계+사람]` 둘 · `[사람]` 스물아홉 = 서른여섯이며, 셋을 더할 때마다
이 문단의 수를 같이 고친다.)
스크린샷이나 붙여넣은 출력을 요구할 수는 있으나 위조가 체크박스보다 어렵지 않으므로
강제가 아니라 의례가 된다. 헤드리스 러너 도입이 유일한 실질 수리이며 이 마일스톤
밖이다(백로그 `id=m2-headless-runner`).


## Codex Adversarial Review

<!-- placeholder: will be replaced by Phase 7.3 -->
