# Implementation Report: 업무 캘린더 M1 — 캘린더 모드가 자기 목표를 갖는다

**Plan**: `.claude/plans/work-calendar-m1.plan.md` (제자리 유지)
**Branch**: `work-calendar` (worktree)
**Date**: 2026-08-22
**Decision**: `work-calendar-m1`

## Summary

시계 모드(가정용)와 캘린더 모드(업무용)의 제품·시각 문서를 갈랐다. 새 문서 둘(`PRODUCT.calendar.md`·`DESIGN.calendar.md`)은 impeccable 4.1.1 의 `init` 과 `document --seed` 지시문을 따라 **저장소 밖 staging 에서** 생성했고, 원본 두 문서에는 위임 선언·절 이름 참조·모드 태그를 달았다. 확장 코드는 한 줄도 바뀌지 않았다(UI8).

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Medium | Medium — 문서 작성은 예측대로였고, **예측 밖은 전부 도구 쪽이었다**(impeccable 스킬 미등록, verify.sh 결함 3건) |
| Files Changed | 8 (표 기준) | 12 (표의 8 + 구현 리뷰 기록 + 백로그 + 보고서 + `.claude/notes` → `.claude/reviews` 이동) |
| 코드 변경 | 0 | 0 |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 0 | 착수 조건 확인 (GATE-A) | 완료 | `verify.sh` 656행을 플랜 bash 펜스에서 **awk 추출**(손으로 옮기지 않음). `.gitattributes` 가 즉시 효력 — `git add` 시 CRLF 경고가 다른 셋에는 뜨고 `verify.sh` 에만 뜨지 않았다(DD22 실증) |
| 1 | staging 확보 (GATE-B) | 완료 | `/tmp/work-calendar-m1-stage`. 양성 프로브가 `PRODUCT_INIT_REQUIRED` 확인 |
| 2 | `PRODUCT.calendar.md` 생성 | 완료 | `context.mjs` 를 `$STAGE` 에서 실행해 그곳을 projectRoot 로 만든 뒤 `init.md` Step 4 템플릿으로 생성 |
| 3 | `DESIGN.calendar.md` 생성 (GATE-C) | 완료 | `concept-seed.mjs --scope direction --mode operate` 실행(배정 index 7 확인), 답안지 핀을 잠금. seed 정규 7절 |
| 4 | 저장소 무변경 증명 (GATE-D) | 완료 | `PRODUCT.md`·`DESIGN.md`·`.impeccable/design.json` sha256 베이스라인 일치 |
| 5 | 네 문서의 상호 참조 부착 | 완료 | DD12(죽은 `Glass` 참조 + `brightness` 수치 제거) · DD6(폐기된 dogfooding 문구 정정) · 4방향 링크 |
| 6 | `[셸]`·`[시계]` 태그 (GATE-E) | 완료 | 답안지 `tag-map` 14행과 1:1, 커버리지 100% |
| 7 | PRD 갱신과 게이트 기록 | 완료 | M1 `complete`, Open Question 2건 해소, 게이트 기록 줄 1개 |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | 통과 | `bash -n verify.sh`. type-check/lint 은 **해당 없음** — `package.json` 이 없다 |
| Unit Tests | 해당 없음 | 테스트 러너가 없다. 플랜 Patterns 표가 "없다"고 명시하고, 그래서 판정을 셸 스크립트로 만들었다 |
| Build | 해당 없음 | 빌드 단계 없음 |
| Integration | 해당 없음 | 문서 산출 마일스톤 |
| Edge Cases (게이트) | 통과 | gate-a·b·c·d·e·final 전부 exit 0 |

### Design Grounding

**N/A (no design trigger).** implement 게이트의 impeccable 검출은 `skill_available=1 · design_signal=0 · silent_skip=no-signal` — 렌더 표면(`.tsx/.css/.html` 등)이 diff 에 없기 때문이며, 코드를 바꾸지 않는 마일스톤에서 정답이다. 따라서 critique 루프·stage routing·design-direction capture 가 모두 발동하지 않았고 Phase 3.6·3.7 은 no-op 이다.

## Files Changed

| File | Action | 비고 |
|---|---|---|
| `PRODUCT.calendar.md` | CREATED | 84행 |
| `DESIGN.calendar.md` | CREATED | 86행, seed 정규 7절 |
| `.claude/plans/work-calendar-m1.verify.sh` | CREATED | 656행, 플랜 블록에서 추출 |
| `.claude/plans/work-calendar-m1.answers.md` | CREATED | 104행 |
| `.gitattributes` | CREATED | `*.verify.sh text eol=lf` |
| `PRODUCT.md` | UPDATED | DD12 참조 정정 + 위임 선언 + 태그 8 |
| `DESIGN.md` | UPDATED | DD6 정정 + 캘린더 문서 링크 + 태그 6 |
| `.claude/prds/work-calendar.prd.md` | UPDATED | M1 complete + 게이트 기록 + Open Question 2건 해소 |
| `.gitignore` | UPDATED | 게이트 작업 산물 3줄 (관리 블록 밖) |
| `.claude/plans/codex-findings-backlog.md` | UPDATED | 신규 3건 |
| `.claude/reviews/work-calendar-m1-implement-review.md` | CREATED | 구현 게이트 감사 기록 |

## Deviations from Plan

1. **구현 게이트 산출물이 플랜 본문이 아니라 `.claude/reviews/` 에 있다.** 명령의 Phase 2.5.4 는 플랜 본문 주입을 요구하는데 그것이 plan sha256 을 바꿔 상류 `mccp-plan-codex` 수신증을 stale 로 만들고, Phase 2.5.7 의 읽기-검증이 그 stale 에서 죽는다 — 같은 명령의 두 요구가 서로를 배제한다. 사용자 결정으로 notes 경로를 택했고(2.5.6 Step A 가 `<plan or notes path>` 를 명시), `.claude/notes/` 가 `.gitignore:6` 에 걸려 있어 추적되는 `.claude/reviews/` 로 다시 옮겼다.
2. **impeccable 을 Skill 도구가 아니라 명시 경로로 로드했다.** 스킬이 이 세션 레지스트리에 없다(원인 추정: `plugin.json` 의 `"skills": "./skills/"` 문자열 — 정상 등록된 다른 플러그인은 전부 이 필드가 없다). 사용자 지시로 GATE-A 가 해석한 것과 **같은 방식**으로 경로를 도출해 지시문을 직접 로드했다. cwd 규율(`cd "$STAGE"`)과 "손으로 쓰지 않는다"는 그대로 지켰다. 상세와 잔여는 구현 리뷰 기록에 있다.
3. **플랜 본문 bash 블록을 2줄 고쳤다.** `set -euo pipefail` 아래에서 `grep` 이 정당하게 0건을 낼 때 `pipefail` 이 그것을 대입문 종료 코드로 만들어 **메시지 없이** 죽는 자리 둘(`BADTOK`, `TOTAL/TAGGED`). 전자는 **Layout·Shapes 가 깨끗한 문서일수록 게이트가 죽는** 결함이라 마일스톤을 진행 불가로 만들었다. GATE-A 의 die 문구가 "플랜 쪽을 정본으로 맞춰라"라고 지시하므로 플랜을 고치고 `verify.sh` 를 재추출했다. plan-conflict-detector 는 `conflict:false`(파일 범위 이탈이 아님) 판정.
4. **참조 넷에서 절 번호를 뺐다.** 태그 부착 후 `sections-numbered` 의 awk 가 `## N.` 분기에서 태그를 벗기지 않아 콜론 없는 절이 `Typography [셸]` 로 잡힌다(아래 Issues). DD4 는 이름이 원본에서 **반복될 때만** 번호를 요구하고 `Typography`·`Do's and Don'ts` 는 반복되지 않으므로 번호 없는 참조가 규약에 맞는다.
5. **`serve-question.mjs` 결정 페이지를 띄우지 않았다.** 방향이 브리프에 이미 고정돼 있고(`pinned-direction:`), workshop 규약이 `a user- or brief-pinned direction beats the roll, always` 이므로 결정 라운드가 물을 것이 없다. `concept-seed.mjs` 는 계약대로 실행하고 배정을 확인했다.

## Issues Encountered

- **verify.sh 결함 3건을 실행으로 발견했다.** 다섯 라운드의 패널이 이 스크립트를 읽고 지적했지 이번처럼 끝까지 돌린 적은 없다. 둘은 고쳤고(위 Deviation 3), 둘은 백로그로 넘겼다 — `sections-numbered` 의 태그 미제거(id=m1-verify-defects a)와 토큰 검사의 `grep -qF` 에 `--` 가 없어 음수 토큰 6개가 **fail-open** 되는 것(같은 id b). 후자는 `grep -F --` 로 따로 확인해 실제 복사가 없음을 검증했다.
- **mccp 의 impeccable 탐지가 이 플랜의 선행 조건과 충돌한다.** `probeKeys` 가 `impeccable@impeccable` 을 모르고 폴백으로 `~/.claude/skills/impeccable` 을 보는데, 그것은 DD19 가 지우라고 요구한 폐지된 설치본이다. 일급 override `MCCP_IMPECCABLE_SKILL=available` 로 정정(백로그 id=mccp-impeccable-probe).
- **`gate-c` 가 처음에 진단 없이 죽었다.** 원인이 위 pipefail 이며, 진단이 없다는 점이 가장 나빴다 — `bash -x` 로 추적해 특정했다.

## Tests Written

없다. 이 마일스톤의 판정자는 `.claude/plans/work-calendar-m1.verify.sh` 의 여섯 게이트이고, 그것이 저장소의 유일한 자동 판정 수단이다(`test/positioning.smoke.js` 는 위치 회귀 전용이라 이 산출물을 검사하지 않는다).

## Acceptance

- [x] Task 0~7 전부 완료
- [x] 환경 선행 조건(DD19) — GATE-A 가 plugin 경로 하나와 `version: 4.1.1` 을 확인
- [x] `gate-final` 종료 코드 0
- [x] 다섯 게이트가 각각 자기 Task 앞에서 0 (원장 `gate-a`~`gate-e` 로 확인, DD17)
- [x] 상속이 형태로 강제됨 — `must-inherit` 5건이 `## Brand Commitments` **안에서만** 적중
- [x] 대리 판정 2건 수행·통과, PRD 에 기록(한계 명시 포함)
- [x] 게이트/경로 1회 완주
- [ ] **workshop 핀이 실제로 들어갔는지는 게이트가 잡지 못한다** — 결정 페이지를 띄우지 않았으므로 핀은 산출물 형태(Brand Commitments·절 이름 실재·이름 충돌 없음·토큰 전수 0건)로만 뒷받침된다

## Next Steps

- [ ] **`mccp-plan-codex` 수신증 재앵커** — 플랜을 고쳤으므로 `stale`(417d1016… → e21c7018…). `/mccp:pr` 이 이 상태로는 막힌다
- [ ] 커밋 (게이트가 0을 냈으므로 커밋 조건 충족 — Task 7 Validate)
- [ ] 백로그 3건은 M3 이 플랜을 다음에 여는 시점에 처리
