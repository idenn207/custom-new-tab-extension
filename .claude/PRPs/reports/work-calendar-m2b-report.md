# Implementation Report: 불연속 배치가 화면에 그대로 보인다 (업무 캘린더 M2b)

- **Plan**: `.claude/plans/work-calendar-m2b.plan.md` (제자리 유지 — 아카이브는 `/mccp:archive-complete` 의 몫)
- **Branch**: `work-calendar` (worktree)
- **Decision**: `work-calendar-m2b`
- **Receipt**: `.claude/receipts/mccp-implement-codex/work-calendar-m2b.json`
- **일시**: 2026-08-26

## Summary

전반부(M2a)가 저장 구조를 관문(`gates[].planned`)으로 옮겨 놓았지만 **화면은 여전히 파생
`startDate..endDate` 범위로 셀을 채우고 있었다.** 이 플랜이 그 간극을 닫는다 — 점유의 근거를
관문으로 바꾸고(DD31), 그리드와 패널 **양쪽**을 같은 규칙으로 판정하게 하고(DD32), 렌더 표면
셋을 관문·프로젝트에 맞게 적응시키고, UI8 이 M2 에 포함하라고 한 첫 실행 온보딩을 세웠다.

코드·하네스 작업은 완료했다. **베이스라인 봉투와 앵커 셋, 스모크 실행은 브라우저가 필요해
이 세션에서 수행하지 못했다** — 아래 "완료하지 못한 것" 에 범위와 근거를 적는다.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Medium | Medium — 코드 변경은 국소적이나 게이트 검사가 20건 이상이라 형태 제약이 촘촘했다 |
| Files Changed | 9 (코드 4 · 문서 2 · 산출물 3) | **5** (코드 4 · 문서 1). 산출물 3 과 PRD 1 은 미완 (아래) |
| Confidence | — | 코드 로직: 높음(28건 실행 검증) · 종단 동작: **미확인**(브라우저 없음) |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 0 | 후반부 베이스라인 확보 | **BLOCKED** | 하네스의 `베이스라인 내보내기` 는 `chrome-extension://` 오리진이 필요하다. **구현 전 스냅샷은 아직 복구 가능하다** — `a82debd` 에 하네스가 추적돼 있다 |
| 1 | 점유 전환 (첫 비가역 지점) | **완료** | `rebuildIndex()` 가 이벤트별로 `planned` 를 집합으로 접어 넣고 창 절단을 유지한다. `getEventsForDate()` 가 `gates.some(...)` 로 바뀌었다 |
| 2 | 렌더 표면 적응 | **완료** | 규칙 1(패널 메타=관문 날짜 열거) · 2(`dropped` 날짜에 마감 상태 미부착 — 칩·셀·`aria-label` 셋 다) · 3(프로젝트 이름이 `.calendar-todo-meta` 첫 조각) |
| 3 | 첫 실행 온보딩 | **완료** | 판정식 네 항 + 배선 셋 + 표면(HTML·CSS·컨트롤러). 하네스 케이스 여섯 |
| 4 | 하네스 배선과 재베이스라인 | **부분** | `runAll()` 배선은 완료. **재베이스라인·재내보내기·앵커 둘은 BLOCKED** |
| 5 | PRD 갱신과 하루 재현 테스트 | **부분** | Plan 칸은 이미 두 플랜을 가리킨다. **Status 는 `in-progress` 로 둔다** — 아래 근거 |

### Task 5 의 Status 를 넘기지 않은 이유

플랜이 "전반부와 이 플랜이 **둘 다 끝났을 때만** 바꾼다" 로 못박았고, 이 플랜의 Acceptance
스물다섯 중 브라우저를 요구하는 항목이 아직 미판정이다. `complete` 로 넘기면 PRD 가 참이
아닌 상태를 단언하게 된다.

## Validation Results

| Level | Status | Notes |
|---|---|---|
| 1 · 문법 (`node --check` ×2) | **Pass** | `newtab.js` · `test/positioning.smoke.js` |
| 1-b · 인용 줄 드리프트 | **Pass (구현 전)** | 승인 시점에 다섯 인용 전부 제자리. 구현 후에는 설계상 건너뛴다 |
| 1-c · M2a 전제 | **Pass** | `createCalendarGate()` 존재 · `createCalendarEvent()` 본문이 `gates`·`projectId` 생성 · `link.download` 파일명 고정 |
| 2 · 존재·배선·표식 | **Pass** | 함수 둘 선언+`runAll()` 배선 · `DD31-FIXTURE`=5 · `DD13-CASE`=6 · `TASK2-RULE-1·2·3` · `DD32-CONSISTENCY-1·5` |
| 2-b · 온보딩 판정식·배선 | **Pass** | (i) 네 항 한 AND 식(`&&`=3, `\|\|` 없음, 첫째 항 미부정) · (ii) 생성자 기본값 둘 · (iii) `= true` 정확히 1곳, `loadSettings()` 첫 `try` 안 · (iv) `await settingsManager.initialize()` 뒤 · (v) 선언 1 · 호출 2 |
| 2-c · DD32 패널 쪽 | **Pass** | `getEventsForDate()` 가 `gates` 를 읽고 `startDate`/`endDate` 범위 비교가 남지 않았다 |
| 2-d · 복제 상수 드리프트 | **Pass** | `MAX_CHIPS_PER_CELL = 2` · `DUE_STATE_LABELS.overdue = '지연'` |
| 3-1 · 전반부 봉투 보존 | **성립하지 않음** | `work-calendar-m2.baseline.json` 부재 — 이 플랜이 덮을 대상이 없다. 플랜이 정한 세 상태 중 (부재) 이고 실패가 아니다 |
| 3-2 / 3-2b / 3-2c / 3-3 · 앵커 | **BLOCKED** | 봉투와 앵커 셋이 아직 없다 (브라우저) |
| 4 · 스모크 하네스 실행 | **BLOCKED** | 확장 컨텍스트 필요 |
| 보안 범위 전제 | **Pass** | `openCalendarOnboarding()` 전 범위에 `innerHTML` 없음. `createTodoItem()` 의 유일한 `innerHTML` 은 기존의 하드코딩 SVG 이고, 프로젝트 이름은 `metaLine.textContent` 로만 닿는다 |

### 브라우저 없이 수행한 대체 검증

하네스를 돌릴 수 없으므로 **`newtab.js` 를 Node `vm` 컨텍스트에서 평가해 순수 로직을 직접
실행**했다. 하네스의 대체물이 아니라, 되돌릴 수 없는 Task 1 을 커밋 전에 한 번은 실행해
본다는 최소 보증이다.

- **28건 전부 통과** — `rebuildIndex()` 9(사이 날짜 비움 · 이벤트별 접기 · 이벤트 경계 · `dropped` 잔존 · 창 절단 유지) · `getEventsForDate()` 3 · `hasLiveGateOn`/`gateMetaDates` 4 · `getCellDueState()` 3 · `createChips()` 2 · `createTodoItem()` 5 · 상수 2
- **`range/01-month-boundary` 의 구현 후 기대값을 구현으로부터 유도해 대조** — `renderGrid()` 의
  창 산술(그 달 1일이 속한 주의 일요일 + 41일)을 그대로 옮겨 계산했다. 결과가 플랜 Task 4
  Validate (d) 의 절대값과 **정확히 일치**한다:
  `januaryChipDates=['2026-01-28','2026-02-03']` · `februaryChipDates=['2026-02-03']` ·
  `distinctDates=['2026-01-28','2026-02-03']` · `visibleInBothMonths=true`.
  1월 뷰 창은 `2025-12-28..2026-02-07`(1/1 목요일), 2월 뷰 창은 `2026-02-01..2026-03-14`(2/1
  일요일)로 실측됐다 — 플랜의 유도와 같다. **Validation 3-2c 가 봉투에서 찾을 값이 이것이다.**

이 두 스크립트는 세션 scratchpad 에 있고 저장소에 커밋하지 않았다 — 정식 검증 경로는
하네스이고, 임시 대체물을 저장소에 남기면 다음 사람이 그것을 게이트로 오인한다.

### Design Finish (Phase 3.6)

게이트 시점(EXECUTE 전)에는 추적 diff 에 UI 파일이 없어 `design_signal=false` → silent-skip
이었고, receipt 에 그대로 기록했다. **EXECUTE 후에는 `newtab.css`·`newtab.html` 이 생겨
트리거가 선다** — 라우팅 오라클이 `phase=finish` 에서 다섯을 `invoke` 로 냈다.

| Command | call_form | status | 판단 |
|---|---|---|---|
| `clarify` | invoke | **invoked** | 플랜의 Design Routing Guide 가 명시적으로 허용한 둘 중 하나. 온보딩 표면에만 스코프 |
| `distill` · `harden` · `optimize` · `polish` | invoke | **skipped** | 같은 Guide 가 "이 표를 이 플랜에서는 대부분 쓰면 안 된다" 로 막는다 — UI4 가 새 시각 언어를 금지하고 관문의 시각 어휘는 M3 의 몫이다. 정직하게 `skipped` 로 기록했다(무시하지 않았다) |

`clarify` 가 낸 것과 그로 인해 함께 드러난 DESIGN.md 위반을 반영했다:

- **copy** — 제목을 질문형에서 라벨형(`프로젝트 만들기`)으로, 리드를 두 문장에서 한 줄로
  (브랜드 보이스: 감탄·격려·설명 늘리기 금지). 사라지는 placeholder 를 라벨로 쓰지 않도록
  영속 `<label>` 을 추가하고 placeholder 를 예시로 내렸다. 버튼을 동사+목적어(`프로젝트 만들기`)로.
  저장 실패 문구에 **결과**를 함께 적었다(`만들어지지 않았으니 다시 시도하거나 건너뛰세요`).
  재시도 시 지난 문구를 지운다.
- **DESIGN.md 위반 셋 (내가 직전에 만든 것)** — (1) `background: var(--bg-secondary)`(알파 0.95)는
  "사진 위에 불투명 카드" 로 DESIGN.md 의 가장 강한 Don't 였다. 같은 자리의 `.storage-notice` 가
  쓰는 `--bg-secondary-glass` + `backdrop-filter: blur(10px) brightness(0.62)` 로 바꿨다 — 새
  언어가 아니라 기존 유리 관용구다. (2) 포커스 링이 `outline: none` + border 색이었다 →
  `outline: 2px solid var(--calendar-accent)` + `outline-offset: 2px`(저장소 공통형). (3)
  `prefers-reduced-motion: reduce` 목록에 새 컨트롤 셋을 넣었다. 제목에 `word-break: keep-all` 추가.
- **기계 탐지기** — `detect.mjs` 39건 중 **온보딩 표면 관련 0건**(나머지는 이 마일스톤 범위 밖의
  기존 지적이며 UI4·플랜 범위상 손대지 않았다).

**남는 것 하나를 적어 둔다** — `restamp-routed` 는 `--impeccable-routing-mode` 를 받지 않아
receipt 의 `meta.impeccable_routing_mode` 가 `null` 로 남았다(라우팅은 실제로 `auto` 였다).
게이트 시점에는 라우팅이 안 돌아 2.5.6 에서도 안 실렸다. 도구 계약의 공백이며 값을 우회로
넣지 않았다.

### Design Grounding (Phase 3.7)

**N/A** — 2.5.5c 캡처가 트리거되지 않아(게이트 시점 `design_signal=false`) 방향 산출물이 없고,
3.7 은 그 산출물의 **존재**로 자기 실행 여부를 정하므로 완전한 no-op 이다.

## Files Changed

| File | Action | Lines |
|---|---|---|
| `newtab.js` | UPDATED | +311 / -24 (일부) |
| `test/positioning.smoke.js` | UPDATED | +534 |
| `newtab.css` | UPDATED | +143 |
| `newtab.html` | UPDATED | +25 |
| `README.md` | UPDATED | +19 / -2 |
| `.claude/plans/codex-findings-backlog.md` | UPDATED | +1 (유예 기록) |

플랜의 Files to Change 중 **만들지 못한 것 셋**: `work-calendar-m2b.baseline.json` ·
`.claude/plans/work-calendar-m2b.baseline.sha256` · `.claude/plans/work-calendar-m2b.rebaseline.sha256`.
**바꾸지 않은 것 하나**: `.claude/prds/work-calendar.prd.md`(위 Task 5 참조).

plan-conflict-detector: `conflict=false` — 바뀐 파일이 전부 플랜의 목록 안이다.

## 주요 구현 결정

- **접기의 위치** — `rebuildIndex()` 안에서 이벤트별 `Set` 으로 접은 뒤 창 절단을 적용한다.
  창 겹침 판정에는 파생 범위를 그대로 쓴다(모든 `planned` 가 그 범위 안이므로 관문을 잃지
  않으면서 5,000건 × 366일 상한을 지킨다).
- **모듈 레벨 헬퍼 둘** — `hasLiveGateOn(event, dateKey)` 와 `gateMetaDates(event)`. 칩
  (`createChips`)과 셀(`getCellDueState`)이 **서로 다른 경로로** 마감 상태를 붙이므로 둘이
  같은 판정을 타야 한다 — 한쪽만 고치면 칩에서 지운 지연색이 셀 배경과 `aria-label` 로 되돌아온다.
- **온보딩 표면의 자리** — `.storage-notice` 옆의 `position: fixed` 오버레이. 밴드 흐름에 넣으면
  나타나는 순간 `.calendar-month` 에 내부 스크롤이 생겨 "레이아웃을 바꾸지 않는다" 와 정면
  충돌한다(기존 오류 배너가 오버레이인 것과 같은 이유).
- **하네스 케이스 구조** — 고정 입력마다 프레임을 새로 띄운다. 한 프레임에 다 넣으면
  "1번에서 점유가 관문 둘로 줄었다" 와 "5번에서 버킷 길이가 1이다" 가 서로를 부정한다.
- **창 가장자리 대응** — `focusWindowOn()` 이 현재·이전·다음 달 순으로 창을 시도해 고정 입력의
  관문이 전부 렌더 창에 들어오게 한다. 플랜이 남겨 둔 전제 단언은 최종 판정자로 그대로 둔다
  (오늘이 그 달 1일이면서 일요일이면 `today-3` 이 창 밖으로 나가 **옳은 구현도 깨지는** 자리다).
- **DD13-CASE 4 의 세우는 법** — 필드를 직접 `false` 로 대입하지 않는다(그러면 생성자 기본값과
  try 경계 둘 다 검사에서 빠진다). 정상 부팅한 프레임에서 `chrome.storage.local.get` 이 설정 키
  목록에서만 던지게 만든 뒤 두 번째 `SettingsManager` 인스턴스로 `loadSettings()` 를 **실제로**
  실패시킨다. 6번은 플랜이 적은 대로 요소 제거 + 두 번째 인스턴스다.
- **"안 뜬다" 를 단언하기 위한 동기화 신호** — 온보딩 판정은 `Application.initialize()` 의 마지막
  문장이고 `loadApp()` 은 그보다 먼저 반환한다. `overlayBrightness` 를 특이값(37)으로 시드해
  `#opacityValue` 가 그 값에 닿는 것을 `loadSettings()` 완주 신호로 쓴다 — 프로덕션 표면을
  늘리지 않고 판정이 이미 섰음을 확정하는 유일한 기존 부수효과다.

## 완료하지 못한 것 — 브라우저가 필요한 범위

하네스(`test/positioning.smoke.html`)는 `chrome.storage.local` 이 **진짜여야** 하므로
`chrome-extension://<id>/test/positioning.smoke.html` 에서만 돈다. 이 저장소에는 러너도 CI 도
없고, 이 세션의 브라우저 자동화 경로(Playwright → Whale, 고정 프로필)에는 확장을 로드할
`--load-extension` 수단이 없다.

**남은 절차 (사람이 브라우저에서 수행)**

1. `chrome://extensions` → 개발자 모드 → 압축해제된 확장 로드
2. **Task 0 (구현 전 앵커)** — 이 트리는 이미 구현이 들어갔으므로, 별도 체크아웃에서
   `a82debd`(전반부 종료)를 꺼내 하네스를 Run → 단언 실패 0건 확인 → `베이스라인 내보내기` →
   내려받은 자리에서 **`work-calendar-m2b.baseline.json` 으로 이름을 바꿔** 저장소 루트로 옮긴다
   (버튼의 `link.download` 은 `work-calendar-m2.baseline.json` 으로 하드코딩돼 있다).
   그다음 `shasum -a 256 test/positioning.smoke.js work-calendar-m2b.baseline.json > .claude/plans/work-calendar-m2b.baseline.sha256`
3. **Validation 4** — 이 트리에서 Run → 단언 실패 0건 · Compare → 허용 diff (a)~(d) 만 남는지
4. **재베이스라인 전 육안 대조** — `range/01-month-boundary` 의 세 값이 위 "대체 검증" 의 값과 같은지
5. **Task 4** — 재베이스라인 → **재내보내기** → `mv -f` 로 `work-calendar-m2b.baseline.json` 덮기 →
   `.claude/plans/work-calendar-m2b.rebaseline.sha256` 생성 (순서가 계약이다)
6. **Validation 3 전체** 재실행 (3-1 · 3-2 · 3-2b · 3-2c · 3-3)
7. **Task 5** — 하루 재현 테스트(UI11) 수행 후 관찰 목록 기록 → PRD M2 행을 `complete` 로

**되돌릴 수 없는 것은 없다.** 전반부 `work-calendar-m2.baseline.json` 은 이 트리에 **부재**하므로
덮어쓸 대상 자체가 없고(Validation 3-1 이 "성립하지 않음" 으로 판정), Task 0 의 구현 전 스냅샷은
`a82debd` 가 하네스를 추적하므로 지금도 다시 뜰 수 있다. 유예 기록은
`.claude/plans/codex-findings-backlog.md` (`id=m2-headless-runner`) 에 남겼다.

## Issues Encountered

- **플랜 본문 편집이 상위 receipt 봉인을 깼다.** Phase 2.5.4 가 지시하는
  `## Codex Implementation Review` 갱신을 수행하자 `mccp-plan-codex` 의 `plan_hash` 가 어긋나
  `validate` 가 exit 2 를 냈다. 그 절은 직전 실행이 이미 써 두고 `/mccp:plan` 이 그것을 포함해
  봉인한 상태였고, 이번 실행의 판정(Codex disabled · silent-skip · finding 0)이 그때와 **같으므로**
  절을 봉인된 바이트로 정확히 되돌렸다(`sha256:b5dd7979…` 재일치 확인). 체인은 `ok:true` 다.
- **heredoc 파싱 실패** — 대용량 한국어 블록을 `<<'EOF'` 로 넘길 때 Git Bash 가 인용 오류를 냈다.
  파일 쓰기로 우회하고, 이후 모든 패치를 **CRLF 보존 + 정확 문자열 1회 일치**를 강제하는
  작은 적용기로 넣었다(모든 대상 파일이 CRLF 다).

## Tests Written

| Test | Cases | Coverage |
|---|---|---|
| `test/positioning.smoke.js` `runCalendarOccupancyCases()` | 고정 입력 6묶음 · 단언 **열** | 점유 다섯 · 그리드-패널 일치 둘 · 렌더 규칙 셋 |
| `test/positioning.smoke.js` `runCalendarOnboardingCases()` | **여섯** | 정상 경로 · 한 번만 · 프로젝트 읽기 실패 · 설정 읽기 실패 · 기하 무변 · 설정 DOM 부재 조기 return |

봉투 키: `occupancy/01`~`occupancy/06` · `onboarding/01`~`onboarding/02` (Validation 3-2b 가
양쪽 접두어의 존재를 함께 본다).

## Next Steps

- [ ] 브라우저에서 위 7단계 수행 (Task 0 · 4 · 5 · Validation 3 · 4)
- [ ] 그 뒤 PRD M2 행을 `complete` 로 (전반부·후반부 둘 다 끝난 시점)
- [ ] `/mccp:code-review` 또는 `/mccp:santa-loop`
- [ ] `/mccp:pr`
