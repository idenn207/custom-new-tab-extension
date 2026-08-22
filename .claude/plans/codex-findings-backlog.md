# Codex / 리뷰 패널 findings 백로그

게이트가 **지금 흡수하지 않기로 한** 지적이 쌓이는 append-only 원장이다. 두 경로가 여기에 적재한다.

- `/mccp:plan` Phase 5.4 — Codex 라운드에서 `DEFER_TO_BACKLOG` 로 분류된 항목
- `/mccp:plan` Phase 5.2g2 — `MCCP_REVIEW_SINGLE_PASS` 로 반복 라운드를 생략했을 때 L2 패널이 낸 blocking findings

**두 번째 표기 `~~반증(날짜)~~` 는 흡수가 아니라 기각이다.** 지적의 전제를 실제로 실행해 확인했더니 사실이 아니었다는 뜻이며, 근거를 같은 셀에 함께 적는다. `~~해소~~`(고쳤다)와 구분되어야 하는 이유는, 기각된 지적은 다음 라운드에 같은 형태로 다시 올라올 수 있고 그때 근거 없이 재흡수하면 없는 결함을 좇게 되기 때문이다.

**행을 지우지 않는다.** 해소된 항목은 `Finding` 셀 앞에 `~~해소(날짜)~~` 를 붙여 표시하고 행 자체는 남긴다 — 지적이 사라지면 "검토했는데 안 고치기로 했다"와 "애초에 없었다"를 구분할 수 없게 된다.

아래 헤더 줄은 형식이 아니라 **계약**이다. `scripts/lib/plan-review/backlog-append.js` 의 `HEADER_RE` 와 대시보드의 `derive/sources/backlog.js` 가 정확히 이 줄에 표를 앵커하므로, 문구를 바꾸면 적재된 행이 모든 소비자에게 보이지 않게 된다.

| Date | Severity | Source plan | Finding |
|---|---|---|---|
| 2026-08-21 | HIGH | .claude/plans/work-calendar-m1.plan.md | ~~해소(2026-08-21)~~ L2 security: Trust boundary violation: answers.md file integrity not fully verified between GATE-A and GATE-C, allowing validation criteria to be weakened · 원문 .claude/reviews/plan-review-work-calendar.md · id=3723da7b |
| 2026-08-21 | HIGH | .claude/plans/work-calendar-m1.plan.md | ~~해소(2026-08-21)~~ L2 security: Incomplete response to pre-existing security finding: answers.md file lacks git status validation despite explicit identification as trust boundary · 원문 .claude/reviews/plan-review-work-calendar.md · id=930820d5 |
| 2026-08-21 | FAIL | .claude/plans/work-calendar-m1.plan.md | ~~해소(2026-08-21)~~ L2 security: reviewer returned verdict=fail · 원문 .claude/reviews/plan-review-work-calendar.md · id=988d9372 |
| 2026-08-21 | HIGH | .claude/plans/work-calendar-m1.plan.md | ~~해소(2026-08-21)~~ L2 test: GATE-C validates that inheritance is 'reflected in output' and that impe ccable used Brand Commitments correctly (DD13, line 493: 'GATE-C가 그 상속이 산출물에 실제로 반영됐는지를 본다') · 원문 .claude/reviews/plan-review-work-calendar.md · id=bffb42e8 |
| 2026-08-21 | FAIL | .claude/plans/work-calendar-m1.plan.md | ~~해소(2026-08-21)~~ L2 test: reviewer returned verdict=fail · 원문 .claude/reviews/plan-review-work-calendar.md · id=b164d498 |
| 2026-08-21 | HIGH | .claude/plans/work-calendar-m1.plan.md | ~~해소(2026-08-21)~~ L2 invariant: Reference validation uses substring matching instead of exact section matching, creating fail-open vulnerability for future section name collisions · 원문 .claude/reviews/plan-review-work-calendar.md · id=6130e307 |
| 2026-08-21 | FAIL | .claude/plans/work-calendar-m1.plan.md | ~~해소(2026-08-21)~~ L2 invariant: reviewer returned verdict=fail · 원문 .claude/reviews/plan-review-work-calendar.md · id=a60b6308 |
| 2026-08-21 | HIGH | .claude/plans/work-calendar-m1.plan.md | L2 architect: The answer sheet template (lines 542-545) provides an incomplete list of sections to be inherited in Brand Commitments · 원문 .claude/reviews/plan-review-work-calendar.md · id=542b95a0 · **부분유효 · OPEN — Task 3 착수 전 필독.** 리터럴 주장은 틀렸다(DESIGN.md 에 `Layout`·`Shapes` 절이 아예 없으므로 이름으로 상속할 대상 자체가 없다 — 리뷰어가 "생성물이 가질 7절"과 "원본에서 상속할 절"을 합쳤다). 남는 알맹이: 원본에 대응 절이 없는 Layout·Shapes 를 seed 가 구체 수치로 채우면 `gate-final` 의 토큰 전수 검사가 죽는다. 원본 토큰 108개에 `1px`·`10px`·`12px`·`14px`·`16px`·`1rem` 이 있고 `grep -F` 라 `1px` 는 `21px` 안에서도 걸리므로, px 값이 하나라도 들어가면 사실상 확정 실패다. **조치**: Task 3 의 `/impeccable document --seed` 인터뷰에서 Layout·Shapes 를 값 없이 규칙 수준으로만 쓰게 한다 — 이것은 UI6(컴포넌트 스펙 미기재)·DD7(값이 아니라 규칙)이 이미 요구하는 바이며, 답안지에 그 문장이 없을 뿐이다. 실패 시 die 문구("상속 값이 복사됐다 — 참조로 바꿔라")는 이 경우 오해를 부른다: 참조할 원본 절이 없으므로 올바른 복구는 참조 전환이 아니라 **값 삭제**다 |
| 2026-08-21 | CRITICAL | .claude/plans/work-calendar-m1.plan.md | ~~반증(2026-08-21)~~ L2 architect: The answer sheet references 'Named Rules 절' which is a subsection (###), not a top-level section (##) · 원문 .claude/reviews/plan-review-work-calendar.md · id=b9e1636a · 반증근거 refs_resolve 의 절 추출 정규식은 `^#{2,4}` 이므로 DESIGN.md:355 `### Named Rules` 가 그대로 추출된다 — 최상위 절만 본다는 전제가 사실이 아니다 |
| 2026-08-21 | CRITICAL | .claude/plans/work-calendar-m1.plan.md | ~~반증(2026-08-21)~~ L2 architect: The plan's answer sheet section names (e.g., 'Elevation 절') may not match impeccable's generated names ('Elevation &amp; Depth') · 원문 .claude/reviews/plan-review-work-calendar.md · id=a7538f42 · 반증근거 refs_resolve 는 **원본** DESIGN.md 의 절 이름과 대조하고 그 이름은 `Elevation` 이다(DESIGN.md:341 `## 4. Elevation: 유리라는 깊이`). `Elevation & Depth` 는 생성물 헤더 이름이며 gate-c 가 부분문자열로 따로 본다 |
| 2026-08-21 | FAIL | .claude/plans/work-calendar-m1.plan.md | L2 architect: reviewer returned verdict=fail · 원문 .claude/reviews/plan-review-work-calendar.md · id=4bf8898b |
