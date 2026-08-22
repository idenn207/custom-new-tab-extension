# Plan Review Panel — work-calendar

**Plan**: `.claude/plans/work-calendar-m1.plan.md` · **Plan version**: `sha256:7628dd8456b61be89d077665103076c6fac7896ea5fa7422baa142cd61a90d58`
**Verdict**: `divergent` via `multi-agent`
**Quorum**: 4/3 responses · 4 distinct roles (of 4 fielded) · passed=false
**Layers**: L1 converged · L2 divergent · L3 not fired

> Reason: L2 quorum not satisfied: 4 blocking finding(s): architect/HIGH, architect/CRITICAL, architect/CRITICAL, architect/FAIL — MCCP_REVIEW_SINGLE_PASS=deadline_pressure 로 진행한다. verdict는 divergent 그대로 봉인된다.

## Findings

| Perspective | Severity | Claim | Evidence |
|---|---|---|---|
| architect | HIGH | The answer sheet template (lines 542-545) provides an incomplete list of sections to be inherited in Brand Commitments | The plan states (line 41) that impeccable 4.0.4 generates 8 canonical sections (Overview·Colors·Typography·Layout·Elevation & Depth·Shapes·Components·Do's and Don'ts), and M1's DESIGN.calendar.md should remove only Components for 7 sections total (DD3, line 81). The verification gate (line 396-398) explicitly checks for these 7 headers: Overview, Colors, Typography, Layout, Elevation, Shapes, Do's and Don'ts. However, the answer sheet Brand Commitments section (lines 542-545) only mentions Elevation, Named Rules, Typography, and Colors. It omits Layout, Shapes, Overview, and Do's and Don'ts entirely. Following the answer sheet literally (as instructed in Task 2, line 168: 'answers을 그대로 붙여 넣되') will produce Brand Commitments that reference only ~50% of the generated sections. This violates UI5 (line 25): inherited items require explicit references, not silence about what's inherited. |
| architect | CRITICAL | The answer sheet references 'Named Rules 절' which is a subsection (###), not a top-level section (##) | DESIGN.md line 355 shows '### Named Rules' as a level-3 heading. The verification gate (line 396-398) iterates through top-level section headers (## level, checked with '^#{2,4}' regex). The answer sheet (line 542) directs users to cite 'Named Rules 절' as if it were a top-level section to be inherited. When refs_resolve in gate-final tries to match 'Named Rules 절' from Brand Commitments against the actual section headers in DESIGN.calendar.md, it will look for a top-level section named 'Named Rules', but impeccable will likely place it as a subsection under another section (e.g., under Shapes per canonical 4.0.4 order). The reference will not resolve word-bounded to a top-level header. |
| architect | CRITICAL | The plan's answer sheet section names (e.g., 'Elevation 절') may not match impeccable's generated names ('Elevation & Depth') | The plan states at line 41 that the 4.0.4 canonical order includes 'Elevation & Depth' (not just 'Elevation'). The answer sheet (line 542) references only 'Elevation 절'. The verification gate refs_resolve (lines 278-285) checks if section names from the generated document appear word-bounded in the references. If DESIGN.calendar.md contains '## 5. Elevation & Depth' but Brand Commitments only says '`DESIGN.md` の Elevation 절', the substring 'Elevation & Depth' (15 chars) will not be found word-bounded in 'Elevation 節' (9 chars for 'Elevation', the rest is Japanese particle). This causes gate-final to fail with 'refs_resolve: 実在しない節を指す参照' error. |
| test | MEDIUM | Brand Commitments section in answers.md correctly specifies which DESIGN.md sections should be inherited | GATE-A (line 348) checks only that the word 'Brand Commitments' appears in answers.md; does not validate content. Template (lines 541-547) specifies 'Elevation 절·Named Rules 절·Typography 절' must be listed, but GATE-A never checks this. GATE-C (line 388-389) only verifies Brand Commitments references DESIGN.md with *some* section name, not specific required ones. Result: if answers.md lists wrong sections, gates still pass until GATE-C generation phase. |
| test | MEDIUM | The answers.md template format has same rigor as verify.sh script | verify.sh is byte-locked (lines 337-339): awk extracts fenced block from plan, diff compares with verify.sh file. answers.md template (lines 541-547) is example only—GATE-A checks only that '## /impeccable init', '## /impeccable document --seed', and 'Brand Commitments' sections exist (lines 346-348). No byte-comparison. Humans must transcribe answers.md to CLI interactively with no recorded capture. Task 2 (line 167) says 'Brand Commitments에 DD13의 상속 선언을 반드시 넣는다' but gates enforce form, not completeness. |
| test | LOW | M3 design decisions (contrast remeasurement and load visualization strategy) are verified to be actually specified in DESIGN.calendar.md | gate-final lines 495-498 search for keyword substrings only: `grep -qE '대비.*재측정'` and `grep -qE '부하.*(형태\|테두리\|패턴\|축)'`. These checks pass if the document contains the words but doesn't validate the actual procedure is sound or complete. Plan acknowledges (line 582): '게이트가 형식은 보되 의미는 못 본다'. M3 decisions are asserted as part of DD7's claim that 'rules allow decisions to be made', but no test verifies the rules are actually usable. |

## Refutation attempted

| Perspective | Verdict | What was attacked |
|---|---|---|
| architect | fail | I systematically verified: (1) the plan's citations to impeccable 4.0.4 canonical section order (line 41); (2) what section headers the verify.sh gates explicitly require (lines 396-398); (3) what the answer sheet template instructs users to reference in Brand Commitments (lines 542-545); (4) the structure of actual sections in current DESIGN.md (lines 176-432); (5) the word-boundary matching logic in refs_resolve (lines 278-285); (6) the definition of UI5 (line 25) requiring explicit references for inherited items. The three critical mismatches are: (a) answer sheet omits Layout, Shapes, Overview, Do's and Don'ts entirely yet these 4 sections will be auto-generated and appear in DESIGN.calendar.md; (b) answer sheet cites 'Named Rules 절' as a top-level section when it's actually a subsection; (c) answer sheet says 'Elevation 節' but impeccable generates 'Elevation & Depth' per canonical 4.0.4, and refs_resolve word-boundary matching will fail. The plan provides an incomplete and partially incompatible answer sheet template that users are instructed to copy-paste verbatim. |
| security | pass | Investigated answers.md as a modifiable trust boundary (DD14 acknowledged); path traversal via CAL_PRODUCT/CAL_DESIGN; grep/awk injection in refs_resolve section validation; STAGE directory manipulation via TMPDIR; temporary file cleanup; checksum bypass vectors. All defects found were explicitly documented as design choices in DD14 or other design decisions with stated mitigations. |
| test | pass | Attacked three core test claims: (1) Brand Commitments content validation — read GATE-A (lines 346-348), GATE-C (lines 387-389), and gate-final refs_resolve (lines 270-290); confirmed gates only check form (section/word presence), not which specific sections should be inherited per template (lines 541-547). (2) answers.md rigor vs verify.sh — compared byte-lock mechanism for verify.sh (lines 337-339: awk+diff) with answers.md validation (lines 346-348: grep for section headers only); no template enforcement. Task 2 describes manual CLI transcription (line 167) with no capture. (3) M3 decision falsifiability — read gate-final checks (lines 495-498) that search keyword substrings, and Acceptance requirement (line 623) that human must validate correctness; confirmed gates check presence of '대비.*재측정' and '부하.*(형태\|테두리\|패턴\|축)' but not logic. Read Risks section (line 572) and Acceptance (lines 622-625) which document these as known form-vs-meaning gaps left to human review. All three findings are already documented in the plan as by-design limitations. No undocumented critical defects found in gate mechanics themselves—the gates do what they claim to do, but acknowledge what they don't test. |
| invariant | pass | 공격 대상: (1) GATE-A 판정 기준 고정 메커니즘 — 답안지·스크립트 지문을 확인하고 이후 게이트가 체크섬으로 불변 보장; (2) refs_resolve 절 이름 참조 검증 — 낱말 경계를 이용한 실재 절 이름 확인, 그리고 추출 윈도우 크기; (3) staging 생성 디렉터리 보호 — 저장소 밖 배치와 양성 프로브로 기존 구현 감지 회피; (4) Task 5-6 파일 편집 가역성 — git 추적 상태와 GATE-D·GATE-E의 정정 지점 확보; (5) gate-final 사후 기록 앵커링 — PRD의 'gate 실행 기록' 줄이 현재 플랜 해시를 가리키고 기록이 하나만 존재; (6) 토큰 복사 금지 검증 — 원본에서 측정치를 기계적으로 추출해 캘린더 문서에서 전수 확인. 상세 조사: **GATE-A 판정 기준 고정 (DD14)**: GATE-A가 답안지·verify.sh의 sha256을 $CRITERIA에 저장하고, 이후 모든 게이트가 criteria_unchanged()를 먼저 호출해 지문 대조. 한 번의 실행 안에서 기준 파일이 바뀌는 것을 막는다. GATE-A를 다시 돌리면 새 지문이 찍히지만 이는 코드 리뷰(tracked 검사)가 담당한다고 명시. 보호 유효. **refs_resolve 섹션 참조 검증 (DD4, lines 255-291)**: awk 기반 낱말 경계 검사로 섹션 이름을 실재하는지 확인. 추출 윈도우 80자는 의도적으로 넓게 설정(Plan line 585). 부분 매치 위험은 있지만 짧은 섹션명(2자 이하) 필터링과 섹션 번호를 포함한 참조 형식이 실무에서는 충분한 완화책. 형태 검사에 한정한다는 점은 명시돼 있고 의미 검사는 Acceptance 통독 항목. **staging 경로 보호 (DD2)**: STAGE를 저장소 밖(TMPDIR/work-calendar-m1-stage)에 배치. GATE-B가 두 가지 검사: (1) 경로가 ROOT 하위가 아닌지 정규화 후 확인(Windows 경로 형식 대응됨), (2) 양성 프로브로 로더가 "PRODUCT_INIT_REQUIRED"를 내는지 확인 + "incumbent visual implementation" 부재 확인. 생성이 저장소를 건드릴 창 제거. 보호 유효. **Task 5-6 문서 편집 가역성 (DD11)**: PRODUCT.md·DESIGN.md·.impeccable/design.json은 GATE-A에서 sha256 베이스라인 확보. GATE-D가 생성 후 베이스라인과 바이트 동일성 검증(생성 과정 무변경 증명). Task 5 편집 전에 이미 보증됨. Task 5-6은 "되돌릴 수 있는 단계"로 분류(git checkout으로 완전 복구 가능). 순서는 계약(set -euo pipefail, 이전 게이트 성공 전제). 보호 유효. **gate-final 기록 앵커링 (Task 7, lines 503-508)**: 플랜 파일의 sha256 16자를 계산하고 PRD의 'gate 실행 기록' 줄이 그 해시를 정확히 포함하는지 검사. 플랜을 수정하면 해시가 달라지므로 기록도 다시 써야 함. 기록이 여러 개면 "어느 것이 이번 실행인지 문서가 답하지 못한다"는 이유로 실패. 한 줄만 존재할 때만 통과. 플랜 판본과의 바인딩 강력함. 보호 유효. **값 복사 금지 (DD4, gate-final lines 474-480)**: 원본 문서에서 정규식으로 토큰(rem·px·brightness()·hex·시간 단위 s 등)을 기계적으로 추출해 캘린더 문서에서 **부재**를 확인. 손으로 고른 목록이 아니라 전수 검사. 새 값이 원본에 생기면 자동으로 대상이 됨. 값 복사는 필연적으로 두 문서 표류 야기하는데(업데이트 시 한쪽만 갱신) 토큰 전수 검사가 이를 잡음. 보호 유효. **시계 모드 성공 지표 누출 방지 (gate-final line 482-483)**: 캘린더 문서에 시계 모드 어휘("사진이 몇 퍼센트", "사진 노출" 등)가 없는지 검사. 규칙 재정의 누수를 방지. 보호 유효. **태그 커버리지 (GATE-E)**: 모든 최상위 섹션이 [셸] 또는 [시계] 태그를 가지는지 확인. 섹션 추가/삭제는 개수 불일치로 잡힘. Task 7 전에 누락을 조기 포착. 보호 유효. **GATE 순서 강제 (set -euo pipefail)**: 각 게이트가 실패하면 Task는 진행 불가. 플랜 구조상 다음 Task는 이전 게이트의 exit 0을 전제로만 시작. 순서 건너뛰기 불가. 보호 유효. |

## Measurement

<!-- Written by plan-review/cli.js record on EVERY exit path, pass or halt.
     Machine-readable; do not hand-edit. A null field means the axis was
     not observed, never that it was zero. -->

```json
{
  "verdict": "divergent",
  "source": "multi-agent",
  "layers": {
    "l1": "converged",
    "l2": "divergent",
    "l3": "not fired"
  },
  "quorum": {
    "responded": 4,
    "required": 3,
    "roles": 4,
    "of": 4,
    "passed": false
  },
  "wall_clock_ms": 705159,
  "halt_stage": null,
  "backlog_appended": 4,
  "backlog_skipped_nonblocking": 3,
  "granted": 4,
  "reviewed_plan_hash": "sha256:7628dd8456b61be89d077665103076c6fac7896ea5fa7422baa142cd61a90d58",
  "plan_path": ".claude/plans/work-calendar-m1.plan.md",
  "recorded_at": "2026-08-21T05:52:55.796Z"
}
```
