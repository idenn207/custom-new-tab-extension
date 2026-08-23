# Implementation Report: 작업이 실제 업무 모양을 담는다 (업무 캘린더 M2 전반부)

- **Plan**: `.claude/plans/work-calendar-m2.plan.md` (plan sha256 `d8b7b45ac1eb2092…`, 그대로 유지 — 아카이브하지 않았다)
- **Branch**: `work-calendar`
- **날짜**: 2026-08-23

## Summary

작업당 마감이 하나라는 전제를 걷어냈다. 작업은 프로젝트에 속하고, 서로 다른 날짜의 **관문 집합**을 가지며,
연속 범위는 저장되는 값에서 파생값(`min..max`)으로 강등됐다. 관문마다 계획과 실제가 남아 조기·지연·범위축소가
구분된다. 데이터 계층만 하고 **화면 표현(점유 전환·렌더 표면 적응·온보딩)은 후반부**(`work-calendar-m2b.plan.md`)가 진다.

플랜의 `## Validation` "구현 완료 시점" 블록이 **exit 0** 이고, 하네스는 실제 Chrome 확장 컨텍스트에서
**케이스 137건 · 단언 실패 0건**으로 돌았다.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Large | Large — 예측대로 |
| Files Changed | 10 (README 포함) | 10 (변경 7 · 신설 3) |
| 기계 게이트 | 존재 확인 + 호출 자리 + 표식 + 앵커 | exit 0 |
| 하네스 케이스 | 기존 + 넷 추가 | 118 → 137 (신규 키 19개) |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 0 | 착수 조건과 베이스라인 확보 | 완료 | `베이스라인 내보내기` 버튼 + `__smokeBaselineMeta` 봉투. 베이스라인 118건 · `assertFailures: 0` |
| 1 | 데이터 모델 v4 정의 | 완료 | 함수 5 · 상수 4 · typedef 2 신설, 호출부 6 수정 |
| 2 | v4 마이그레이션 | 완료 | `SETTINGS_VERSION_V3` 분리(DD10) · 순수 승격 함수 둘 · `migrateCalendarToV4()` |
| 3 | 프로젝트 컬렉션 | 완료 | `loadProjects`/`persistProjects`/CRUD/`reconcileProjectRefs` · DD37 둘째 고지 |
| 4 | 관문 편집과 계획 대비 실제 | 완료 | `addGate`/`updateGate`/`removeGate` · 편집기 · 프로젝트 선택기 |
| 5 | 마감 의미 적응 | 완료 | `getEventDueState()` 가 종단 관문을 읽는다 |
| 6 | (첫 실행 온보딩) | 해당 없음 | 후반부로 이사 — 플랜이 그렇게 적어 두었다 |
| 7 | 하네스 확충과 재베이스라인 | 완료 | `spyOn` + 케이스 넷 + `runAll` 배선 + 재베이스라인 + 앵커 둘 |
| 8 | PRD 갱신과 하루 재현 테스트 | **부분** | PRD 확인·게이트 기록 완료. **하루 재현 테스트는 수행되지 않았다**(사람만 할 수 있다) |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | 통과 | `node --check newtab.js` · `node --check test/positioning.smoke.js` |
| Unit Tests | 통과 (대체 수단) | 러너가 없다(DD11). Node `vm` 샌드박스 자기 확인 **164건 전부 통과** |
| Build | 해당 없음 | 빌드 단계가 없다 |
| Integration | 통과 | 실제 Chrome 확장 컨텍스트에서 하네스 **137건 · 단언 실패 0건** |
| Edge Cases | 통과 | DD25 접기 (a)(b) · 마지막 관문 · `done` 파생 3분기 · 동점 면제 순서 뒤집기 |
| **플랜 기계 게이트** | **exit 0** | 존재 검사 · 호출 자리 · 배선 · 표식 계수 · `shasum -c` 전부 |

### 하네스를 어떻게 돌렸는가

`test/positioning.smoke.html` 은 `chrome.storage` 를 직접 쓰므로 확장 컨텍스트가 필요하다. Chrome 136+ 가
`--load-extension` 을 막았으므로 **CDP 파이프 전송 + `Extensions.loadUnpacked`** 로 올려 헤드리스 Chrome 151 에서
버튼을 실제로 눌렀다. 창 크기는 `1920x1080` 으로 못박았다 — 스냅샷이 `getBoundingClientRect` 기하를 담으므로
창 크기가 다르면 Task 0 과 Task 7 의 비교가 무의미해진다.

## 이 라운드에서 게이트가 잡은 것

### 하네스가 잡은 실제 회귀 (수리 완료)

`migrateCalendarToV4()` 가 손상된 `calendarEvents`(배열이 아닌 값)를 `Array.isArray(...) ? ... : []` 로 읽어
**빈 배열로 덮어써 지우고** 있었다. 그러면 `loadEvents()` 가 봉인할 기회조차 사라지고 재생 불가 데이터가
아무 설명 없이 사라진다. `runLoadFailureCases` 의 단언 여섯이 정확히 그것을 지목했다.

수리: 손상값이면 승격하지 않고 `false` 를 돌려준다(호출부가 `applyStorageNotice` 에 넘긴다). **같은 잠재
경로가 있던 `migrateCalendarToV3()` 껍데기도 함께 고쳤다** — 그쪽은 변경 전부터 있던 것이고 가드가 먼저
`return` 해서 발화하지 않았을 뿐이다. 인접한 코드를 고치면서 같은 종류의 데이터 소실 경로를 남겨 두지 않았다.

### 보안 리뷰어가 잡은 것 (구현 전 흡수)

`Task(mccp:security-reviewer)` 를 구현 **전**에 돌렸다. CRITICAL 0 · HIGH 2 · MEDIUM 4 · LOW 3.
HIGH 둘은 코드를 한 줄도 쓰기 전에 흡수했다 — 자세한 판정은 `.claude/notes/work-calendar-m2.md`.

- **봉투 판별의 Proxy 우회** — 도달성을 실측했다(프로덕션 호출부는 `newtab.js:4075` 하나이고 인자는 언제나
  `JSON.parse` 결과라 Proxy 가 될 수 없다). 실효 LOW 로 재평가했으나 **수정은 했다**
- **읽기 실패 봉인의 우회** — 봉인이 `persistProjects()` 에만 있으면 `nextProjects` 를 넘기는 새 호출부 하나가
  그것을 조용히 무력화한다. `persistEvents()` 안에도 걸었다

## Deviations from Plan

플랜대로 하지 않은 것과 플랜이 예상하지 못한 것을 갈라 적는다.

### 1. `## Codex Implementation Review` 를 플랜이 아니라 notes 에 썼다

명령 본문 2.5.4 는 그 절을 **플랜 본문에** 주입하라고 한다. 실제로 해 봤더니 플랜의 sha256 이 바뀌어
(`d8b7b45a…` → `9dde5e40…`) `mccp-plan-codex/work-calendar-m2` 수신증이 **stale** 이 됐고
`validate` 가 exit 2 로 떨어졌다 — 즉 지시를 그대로 따르면 그 명령 자신의 2.5.7 을 통과할 수 없다.
2.5.6 Step A 가 grep 대상을 "plan **or notes** path" 로 적고 있으므로 `.claude/notes/work-calendar-m2.md` 로
옮겼다. 기록은 남고 앵커는 온전하다 (`validate` exit 0 확인).

### 2. Codex 는 돌지 않았다

사용량 한도 소진(해제 2026-08-30). fail-closed 로 멈췄고 사용자가 `MCCP_CODEX_DISABLED=1` 을 골랐다.
**이 결정에는 승인 판정을 낸 적대적 리뷰어가 하나도 없다** — `mccp-plan-codex` 수신증도 이미
`review_verdict: divergent`(L2 invariant CRITICAL 3 · HIGH 1 봉인) 이다.

### 3. 플랜의 허용 diff 목록에 **넷째가 필요하다**

Task 7 은 허용 diff 를 셋으로 못박고 "넷째는 없다. 기존 키의 기존 필드 **값**이 바뀌면 전부 회귀다" 라고
적었다. 그런데 이 플랜의 Task 2 자신이 `SETTINGS_VERSION` 을 4로 올리고, 하네스의 세 케이스가
(`migration/01-first-run` · `migration/02-idempotent` · `migration-v3/01-promote`) 그 값을 투영에 담고 있다.
**플랜이 자기 헤드라인 변경을 허용 목록에서 빠뜨린 것**이지 구현이 벗어난 것이 아니다.

실측 diff 60건의 분류:

| 분류 | 건수 | 판정 |
|---|---|---|
| (a) 새 케이스가 추가한 새 키 | 19 | 허용 |
| (b)(c) `gates`·`projectId` 필드 증가만 | 3 | 허용 |
| **(d) `settingsVersion` 3 → 4** | 3 | **플랜이 빠뜨린 넷째** — 이 마일스톤의 정의 자체다 |
| `storage/load-failure-preserves-data` 의 `errors` 한 줄 증가 | 1 | 위 회귀 수리가 정직하게 말하는 소리 |
| 검색창 rect ±1px 잡음 | 34 | **기존 결함** — 아래 |

### 4. 하네스 판정자를 고쳤다 — 비교가 키 순서에 걸려 있었다

**측정**: 코드를 하나도 바꾸지 않은 트리에서 같은 프로필로 capture → compare 를 돌리면 118건 중
**117건이 "차이"** 로 뜬다. 그중 87건은 값이 완전히 같고 키 순서만 다르다. 원인은 `chrome.storage.local` 이
값을 되돌려줄 때 객체 키를 알파벳순으로 정규화하는 것이다 — 베이스라인은 저장소를 거쳐 오고(정렬됨)
현재 결과는 방금 만든 객체(삽입 순서)라 `JSON.stringify` 비교가 **언제나** 다르다고 답한다.

그러면 이 하네스의 두 축 중 **차이 축이 통째로 죽는다.** 고치는 자리는 판정자이지 대상이 아니므로
`stableStringify()` 를 두어 비교만 정규화했다 — 저장되는 값도 내보내는 파일도 그대로다.
**배열 순서는 정렬하지 않는다**(관문 목록처럼 순서가 의미를 갖는 투영이 있다). 117 → 32 로 줄었다.

### 5. `sanitize/table` 의 입력을 좁혔다

Task 1 이 "검증 탈락이 하나라도 있으면 배치 전체를 거절" 로 바꿨으므로, 탈락 항목이 섞인 기존 페이로드는
이제 던져서 케이스를 죽인다. 그 키가 재던 것(화이트리스트 복사·프로토타입 청결·비배열 거절)은 **값이 그대로
유지되도록** 유효 항목 하나로 좁히고, 탈락 항목의 처리는 새 키 `sanitize/batch-reject` 로 옮겼다.
그래서 이 키의 diff 는 `keptKeys` 가 `gates`·`projectId` 만큼 길어진 것 하나다(허용 (c)).

### 6. 상세 모달의 날짜 칸을 조건부 읽기 전용으로 만들었다

플랜이 다루지 않은 상호작용이다. 관문이 있는 이벤트에서 파생 범위는 `min..max` 이므로 모달에서 친 날짜를
그대로 저장하면 `deriveEventRange()` 가 곧바로 덮어쓴다 — **편집 가능한 것처럼 보이는 칸이 조용히 무시되는
것은 "저장된 척" 과 같은 종류의 결함**이다. 사용자가 손댄 관문(`kind` 가 붙었거나 `pending` 이 아니거나
`actual` 이 있는 것)이 하나라도 있으면 그 칸을 읽기 전용으로 바꾸고 관문 편집기로 보낸다. 손댄 관문이
없으면(승격 직후) 범위 편집이 관문을 다시 만든다.

### 7. `normalizeGates()` 가 `MAX_RANGE_DAYS` 도 지킨다

v3까지는 `createCalendarEvent` 가 `endDate` 를 잘라 "이벤트 하나는 최대 366일" 을 지켰다. v4에서 파생 범위가
관문에서 나오므로 같은 불변식을 관문 조립 자리에서 지켜야 한다 — 지키지 않으면 남의 파일이 10년짜리 관문
둘을 들고 들어와 상한을 우회한다.

## Issues Encountered

### 해결됨

- **Chrome 151 이 `--load-extension` + 원격 디버깅을 막는다** → CDP 파이프 전송 + `Extensions.loadUnpacked`
- **손상값 덮어쓰기 회귀** → 위 참조
- **비교가 키 순서에 걸려 있었다** → 위 참조

### 남아 있음

- **"diff 0" 은 이 저장소에서 참이 될 수 없다.** 키 순서를 고친 뒤에도 변경 없는 트리에서 30여 건이
  차이로 뜬다. 검색창 폭의 **1픽셀 흔들림**이고(`492`↔`491`), 두 실행의 실패 집합이 32/35이며 공통은 21건뿐
  — **flaky 이고 M2 가 만든 것이 아니다.** 플랜의 Task 7 이 요구한 "시계 경로 diff 0" 은 이 하네스로
  기계 판정할 수 없다. 단언 축(재베이스라인해도 사라지지 않는 축)은 살아 있고 그쪽은 0건이다
- **하루 재현 테스트 미수행** (UI11) — 사람만 할 수 있다
- **관문 편집기·프로젝트 선택기의 시각 판정 미수행** — `snapshot()` 은 모달 안쪽을 담지 않으므로 보는 기계가
  이 마일스톤에 없다. 플랜이 이미 고지한 한계이고, Acceptance 의 `[사람]` 항목이 진다

## Files Changed

| File | Action | Lines |
|---|---|---|
| `newtab.js` | UPDATED | +1298 / -65 |
| `test/positioning.smoke.js` | UPDATED | +732 |
| `newtab.css` | UPDATED | +116 |
| `README.md` | UPDATED | +47 |
| `newtab.html` | UPDATED | +42 |
| `.claude/prds/work-calendar.prd.md` | UPDATED | +3 |
| `test/positioning.smoke.html` | UPDATED | +1 |
| `work-calendar-m2.baseline.json` | CREATED | 76,961 bytes (137키) |
| `.claude/plans/work-calendar-m2.baseline.sha256` | CREATED | 착수 앵커 |
| `.claude/plans/work-calendar-m2.rebaseline.sha256` | CREATED | 종료 앵커 (`shasum -c` 통과) |

## Tests Written

| Test | 케이스 | 덮는 것 |
|---|---|---|
| `runCalendarV4MigrationCases` | 5키 | 승격 3축 · `V2V3V4-CHAIN` 연쇄 · 순수 함수 · `deriveEventRange` 호출 층위 |
| `runCalendarV4EquivalenceCases` | 3키 | 마감 의미 등가(참조 구현) · 점유 불변 · DD25 동점 면제(순서 뒤집기) |
| `runCalendarProjectCases` | 3키 | 삭제 강등 · 기본값 · 가져오기 참조 무결성 · 읽기 실패 봉인 |
| `runCalendarGateCases` | 5키 | 호출 자리 셋 · DD25 접기 (a)(b) · 마지막 관문 · `done` 3분기 · UI6 |
| `sanitize/*` (신규 3키) | 3키 | 배치 전체 거절 · 봉투 화이트리스트 · 관문 배열 안쪽 prototype pollution |

더해서 Node `vm` 샌드박스 자기 확인 164건 (구현 중 사용, 판정자가 아니다 — 판정은 하네스가 한다).

## Next Steps

- [ ] **사람** — 브라우저에서 관문 편집기·프로젝트 선택기 눈으로 확인 (Acceptance 의 `[사람]` 항목)
- [ ] **사람** — 하루 재현 테스트 (UI11). 후반부까지 끝난 뒤 함께 하는 것이 자연스럽다
- [ ] `mccp-plan-codex/work-calendar-m2` 는 `divergent` 로 봉인돼 있다 — PR 전에 그 상태를 어떻게 다룰지 결정
- [ ] 후반부 `work-calendar-m2b.plan.md` (점유 전환 · 렌더 표면 · 온보딩). **PRD 의 M2 행은 그때 `complete`**
