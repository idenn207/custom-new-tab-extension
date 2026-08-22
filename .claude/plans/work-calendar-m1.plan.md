# Plan: 캘린더 모드가 자기 목표를 갖는다 (업무 캘린더 M1)

**Source PRD**: `.claude/prds/work-calendar.prd.md`
**Selected Milestone**: M1 — 캘린더 모드가 자기 목표를 갖는다
**Complexity**: Medium

## Summary

시계 모드(가정용)와 캘린더 모드(업무용)의 제품·디자인 문서를 갈라, 이후 모든 화면 판단이 "사진이 안 가려지는가"가 아니라 "상기되는가"로 내려지게 한다. 산출물은 새 문서 둘(`PRODUCT.calendar.md`·`DESIGN.calendar.md`)과 기존 문서 둘의 최소 수정이며, 확장 코드는 한 줄도 바뀌지 않는다.

새 문서는 손으로 쓰지 않고 **impeccable 스킬이 생성 주체가 된다**(UI2). impeccable의 context 로더가 cwd 기준으로 `PRODUCT.md`/`DESIGN.md` 한 쌍만 인식하므로 저장소 루트에서는 두 번째 쌍을 만들 경로가 없다. 그래서 **저장소 밖 staging 디렉터리에서 생성하고 산출물만 루트로 옮긴다.** 저장소의 파일은 생성 단계에서 읽히지도 쓰이지도 않으며, 이것이 PRD Open Question "캘린더 모드 제품 문서를 만드는 절차"의 해소안이다.

**검증은 문서가 아니라 스크립트가 한다.** 이 플랜의 판정은 `.claude/plans/work-calendar-m1.verify.sh`의 다섯 게이트(A·B·C·D·E)와 gate-final 이며, 각 게이트는 실패 시 0이 아닌 코드로 죽는다. Task 사이의 순서는 주석이 아니라 게이트 호출로 강제된다.

> **판본 주의.** 이 플랜의 impeccable 관련 서술은 전부 설치본 **4.1.1 을 직접 읽고 실행해 확인한 것이다(2026-08-22 재확인).** 3.x 를 전제하던 판본과 사이에 계약 넷이 바뀌었다 — `init` 의 `register` 질문 소멸, `document --seed` 의 기존 구현 존재 시 거부, 정규 절 순서 6절에서 8절로 확장, 그리고 **seed 인터뷰가 다섯 질문에서 new-work 의 world workshop 으로 교체**(DD18). DD1 이 넷을 각각 기록하고 GATE-A 가 실행 시점에 다시 확인한다.
>
> **배포 채널이 바뀌었다는 것이 이 판본 주의의 본론이다(DD19).** impeccable 은 npm CLI(`impeccable skills install` → `~/.claude/skills/impeccable`)에서 **marketplace plugin**(`impeccable@impeccable` → `~/.claude/plugins/cache/impeccable/impeccable/<버전>/skills/impeccable`)으로 옮겼고, CLI 채널은 더 지원되지 않는다. npm 의 latest 는 아직 `3.6.0` 이고 plugin 은 `4.1.1` 이라 **두 채널이 major 하나만큼 벌어져 있다.** 직전 판이 "설치본은 4.1.1"라고 적고도 게이트가 3.5.0 을 관측하던 이유가 이것이다 — 플랜은 plugin 판본을 정확히 기술했고, 경로가 옛 CLI 설치본을 가리키고 있었다. 서술이 아니라 **경로가 틀렸던 것**이고, DD19 가 그 경로를 고정한다.

## User Intent

| ID | Constraint (user-stated) | Kind |
|---|---|---|
| UI1 | 화면 디자인 계획은 impeccable 스킬을 통해 구성한다 | direction |
| UI2 | 문서는 임의 편집이 아니라 impeccable 스킬을 경유해 생성한다. DESIGN.md의 생성 주체가 impeccable 스킬이다 | constraint |
| UI3 | 문서 분리는 2분할로 하고, 공유하는 셸 부분은 기존 문서 안에 표시를 달아 캘린더 문서가 이름으로 상속한다 | direction |
| UI4 | 캘린더 모드 문서는 저장소 루트에 PRODUCT.calendar.md 와 DESIGN.calendar.md 로 둔다 | constraint |
| UI5 | 상속하는 항목은 참조와 델타만 적고 전문을 복사하지 않는다 | constraint |
| UI6 | M1의 디자인 문서는 판정 기준까지만 쓰고 컴포넌트 스펙은 채우지 않는다 | constraint |
| UI7 | 목표는 갈리지만 재료는 상속한다. 패턴이 완전히 바뀌면 이질감이 생긴다 | direction |
| UI8 | 이 마일스톤은 코드 변경 없이 문서만 산출한다 | constraint |
| UI9 | 시계 모드의 동작과 화면은 이 작업으로 달라지지 않는다 | exclusion |
| UI10 | 두 문서가 공유하는 것은 하나다. 모드는 택일이며 공존하지 않는다 | constraint |
| UI11 | 2주 dogfooding을 폐기하고 각 마일스톤을 하루 재현 테스트로 판정한다 | direction |
| UI12 | 정량 지표를 새로 만들어 확신을 흉내내지 않는다 | exclusion |
| UI13 | 이 PRD가 calendar-widget-v2 PRD를 대체한다 | direction |

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| 범위 밖 선언 | `PRODUCT.md:118-122` "이 문서의 범위" | 범위 제외를 문서 끝 절 하나로 격리하고, 남는 사실 한 줄만 본문에 둔다. 이 절이 이번에 "위임"으로 바뀐다 |
| 문서 간 참조 | `PRODUCT.md:108` "해결값은 DESIGN.md의 Glass 절에 있다" | 다른 문서를 **절 이름으로** 가리킨다. UI5가 요구하는 방식의 기존 선례이나 **지금 그 줄은 값도 함께 복사하고 있다** — DD12가 그것을 고쳐 선례를 성립시킨다 |
| 시각 문서 형식 | `DESIGN.md:176-460` (`## 1. Overview` 부터 `## 6. Do's and Don'ts` 까지) | 정규 절 순서 고정, frontmatter가 규범이고 본문은 적용 맥락이다. **다만 이 6절은 3.x 판본이 만든 것이고 4.1.1의 정규 순서는 8절**(Overview·Colors·Typography·Layout·Elevation & Depth·Shapes·Components·Do's and Don'ts)이다. 캘린더 문서는 4.1.1 순서에서 Components를 뺀 7절이 된다(DD3) |
| 규칙 관용구 | `DESIGN.md:357` `**The brightness Rule.**` | `**The [이름] Rule.**` 형태. 이름이 한국어여도 같은 틀을 쓴다(`**The 표면을 누르지 알파를 올리지 않는다 Rule.**`) |
| 근거 표기 | `PRODUCT.md:90-106` 대비 실측 표 | 측정 조건(해상도·배경·밝기 값)과 판정 기준을 값과 같은 표에 둔다. 값만 적지 않는다 |
| 앞으로의 기준 표기 | `DESIGN.md:172` | 굵게 표시한 규칙은 코드가 아직 그렇지 않은 항목, 즉 앞으로의 기준이다. 나머지는 코드의 사실이다 |
| 되돌릴 수 있는 순서 | `.claude/plans/calendar-widget-v2.plan.md` 의 Task 0 | 첫 태스크가 백업·베이스라인 확보다. 파괴적 단계는 그 다음에 온다 |
| 실행 가능한 회귀 판정 | `test/positioning.smoke.js:234` | 판정을 산문이 아니라 **실행되는 코드**로 둔다. 프로덕션 핸들러를 직접 불러 로직을 복제하지 않고, 스냅샷을 문자열로 비교한다 |
| 두 축 판정 | `README.md:250` | **차이**(베이스라인 대비 변화)와 **단언 실패**(베이스라인과 무관)를 가른다. 베이스라인을 다시 떠도 단언 실패는 사라지지 않는다. 이 플랜의 게이트도 같은 두 축을 쓴다 |
| 단위 테스트 러너 | — | **없다.** `package.json`·빌드 단계가 저장소에 없다. 그래서 판정을 하네스에 얹지 못하고 이 마일스톤 전용 셸 스크립트로 만든다 |

## Design Decisions

작성자 판단이며 사용자 요구가 아니다. PRD Open Question 해소안과, 지금까지 네 라운드의 리뷰 패널이 낸 지적의 흡수를 포함한다.

> **4차 라운드 흡수 기록(2026-08-21).** 직전 라운드는 `divergent` 로 끝났고 `MCCP_REVIEW_SINGLE_PASS=deadline_pressure` 로 진행돼 blocking 7건이 `.claude/plans/codex-findings-backlog.md` 에 적재됐다. 이번 판이 그 넷(FAIL 3건은 관점별 판정이므로 findings 넷의 해소로 함께 닫힌다)을 흡수한다 — security HIGH 2건은 **DD14**(판정 기준 지문 고정)로, test HIGH 1건은 Risks 표의 과잉 주장 정정으로, invariant HIGH 1건은 `refs_resolve` 의 낱말 경계 대조로 갔다. 그 과정에서 **플랜이 스스로 규정한 참조 형태가 자기 게이트에서 죽던 결함**을 함께 찾아 고쳤다(DD4 의 `` `DESIGN.md` 4절 The brightness Rule `` 형태 — 추출 창이 `절` 에서 끊겨 이름이 밖에 남았다). 값싼 MEDIUM·LOW 넷(mktemp 가드·답안지 구조 검사·정규 절 개수·`PRODUCT.md` 참조 양성 검사)도 함께 흡수했고, 흡수하지 **않기로** 한 셋은 Risks 표에 이유와 함께 남겼다.

**DD1 — impeccable 4.1.1은 저장소 루트에서 두 번째 문서 쌍을 만들 수 없고, `--seed` 를 저장소 안에서 거부한다. 플랜이 이것을 단언하지 않고 게이트가 실측한다.**

설치본(plugin `impeccable@impeccable`, `version: 4.1.1`)을 직접 읽고 실행해 확인한 것은 넷이다. **아래 행번호는 전부 2026-08-22 에 그 설치본에서 다시 뽑았다** — 직전 판은 같은 숫자를 적고도 옛 CLI 설치본(3.5.0)을 가리키고 있었고, 그 판본에서는 넷 중 셋이 어긋난다.

> **인용 관례.** 아래에서 `reference/*.md` · `scripts/*.mjs` 로 줄여 부르는 파일은 전부 **plugin 설치 경로** `~/.claude/plugins/cache/impeccable/impeccable/4.1.1/skills/impeccable/` 아래에 있다 — **저장소 안이 아니고, `~/.claude/skills/impeccable` 도 아니다**(DD19). 저장소 파일을 가리키는 `PRODUCT.md:108` 형태의 인용과 구분하기 위해, 스킬 파일은 줄번호를 `:NN` 이 아니라 "NN행" 으로 적는다.

1. `scripts/context.mjs` 44-45행 가 `PRODUCT_NAMES`/`DESIGN_NAMES` 를 각각 `PRODUCT.md`/`Product.md`/`product.md`, `DESIGN.md`/`Design.md`/`design.md` 로 고정한다. `FALLBACK_DIRS`(47행)는 `.agents/context`·`docs` 이고 `IMPECCABLE_CONTEXT_DIR`(245행)가 마지막 우선순위다. `*.calendar.md` 를 인식할 이름이 없다. **staging 위생 검사가 이 셋을 전부 덮어야 한다는 뜻이고**, 직전 판은 cwd 의 여섯 이름만 봤다 — `stage_is_clean_of_docs` 가 이번에 폴백 두 디렉터리까지 내려가고 GATE-B 가 `IMPECCABLE_CONTEXT_DIR` 설정 자체를 거부한다.
2. `reference/init.md` 100행 이 새 파일을 `PROJECT_ROOT/PRODUCT.md` 에 쓴다고 못박고, 3행 은 init 이 **DESIGN.md 를 쓰지 않는다**고 명시한다. `register` 질문은 4.1.1에 **없다**(`init.md` 전문에서 `register` 문자열 적중 0건) — Step 4(56행) 절 목록은 Platform·Stack·Users·Product Purpose·Positioning·Operating Context·Capabilities and Constraints·Brand Commitments·Evidence on Hand·Product Principles·Accessibility & Inclusion 이다. 3.x 의 GATE-C 는 `## Register` 절을 요구했고, 그 단언은 4.1.1 산출물에서 반드시 죽는다.
3. `reference/document.md` 78행 — "`/impeccable document --seed` requests new-work's world workshop, but it does not authorize replacing coherent code: when an incumbent system exists, offer scan mode or route an explicit identity-replacement request through new-work." 이 저장소에는 `newtab.css`·`newtab.html`·`.impeccable/design.json`(31KB)이 있으므로 **저장소 루트에서 `--seed` 를 부르면 거부된다.**
4. 그러나 저장소 **밖** cwd 에서 부르면 로더는 `PRODUCT_INIT_REQUIRED: No product context or visual authority was found.` 를 낸다 — 실측했다. 기존 구현을 언급하는 절이 붙지 않으므로 그 자리에서 `--seed` 는 정당하다.

**GATE-A가 확인하는 것은 문서이지 동작이 아니다.** 3차 패널 test 관점의 지적이 정확하다 — 4.0.5가 같은 문장을 유지한 채 동작만 바꾸면 GATE-A는 통과하고 GATE-C가 산출물에서 잡는다. 그 늦음의 대가를 계산해 두면 이렇다: 그 시점까지 쓰인 것은 **저장소 밖 임시 디렉터리 하나**이고 저장소는 GATE-D가 무변경을 증명하므로, 잃는 것은 인터뷰 한 번의 시간뿐이다. 실행 테스트를 앞당기려면 seed를 한 번 돌려 봐야 하는데 그것이 곧 Task 3이므로, 앞당길 자리가 없다.

이 넷은 `~/.claude/` 아래에 있고 버전이 올라가면 조용히 달라진다. 그래서 서술을 근거로 삼지 않고 **GATE-A가 실행 시점에 다시 확인한다**: 파일 존재, `SKILL.md` 의 `version` 을 답안지 고정값과 대조, 그리고 `reference/document.md` 가 지금도 seed 계약 셋(정규 절 순서 사용·Components 통째 생략·사이드카 생략)을 **문장으로 약속하는지**의 내용 검사. 3차 패널 test 관점이 "존재 검사만으로는 약속이 지켜지는지 모른다"고 지적한 항목이며, 판본이 실제로 바뀐 지금 그 지적이 옳았음이 증명됐다.

**그 내용 검사를 실제로 두 판본에 돌려 본 결과를 적어 둔다(2026-08-22).** 옛 CLI 설치본 3.5.0 에서는 계약 문자열 넷 중 `canonical section order from Scan mode` 가 **없어서** GATE-A 가 죽고, plugin 4.1.1 에서는 넷 다 적중한다. 즉 이 검사는 장식이 아니라 **실제로 두 판본을 가른다** — 버전 대조만 있었다면 답안지 숫자를 고쳐 넘길 수 있었을 자리를, 내용 검사가 함께 막는다.

**DD2 — swap을 폐기하고 저장소 밖 staging 디렉터리에서 생성한다. 저장소 루트 문서는 한 번도 움직이지 않는다.**

직전 판본은 root `PRODUCT.md`·`DESIGN.md` 를 잠시 치우고(swap) 생성 후 되돌리는 절차였다. 그 절차의 위험은 전부 "치운 상태에서 중단되면"에서 나왔고, 3차 패널 invariant 관점의 CRITICAL 도 같은 자리를 겨눴다. staging 경로는 그 위험을 **제거**한다 — 옮기지 않으므로 되돌릴 것이 없고, 백업본을 로더가 집을 위험도 없다.

`STAGE="${TMPDIR:-/tmp}/work-calendar-m1-stage"` 를 쓴다. 저장소 밖이어야 하는 이유는 둘이다. 첫째, `.gitignore` 나 커밋 사고와 무관해진다. 둘째, `resolveContextDir` 의 project-root 탐지가 판본에 따라 상위 디렉터리로 올라갈 수 있는데 저장소 밖이면 그 경우에도 루트 문서를 집지 않는다. 저장소 안 임시 디렉터리로도 실측상 동작했으나(로더가 루트를 집지 않았다) **그 동작에 기대지 않는다** — 저장소에 `package.json` 이 생기는 것만으로 달라질 수 있는 종류의 사실이다. GATE-B가 `STAGE` 가 저장소 루트 밖인지와, 로더가 그 자리에서 `PRODUCT_INIT_REQUIRED` 를 내는지를 함께 본다.

**DD3 — `DESIGN.calendar.md` 는 staging 에서 `/impeccable document --seed` 로 만든다** (UI6 해소).

`reference/document.md` 362-383행 이 seed 모드에 약속하는 것은 셋이다. 첫째, scan 모드의 정규 절 순서를 쓰되(364행) **Components 는 "omit entirely; no components exist yet"**(380행). 둘째, frontmatter 는 `name`·`description` 만 쓰는 최소본이다(383행). 셋째, `.impeccable/design.json` 사이드카를 쓰지 않는다(같은 383행). 셋이 각각 UI6·UI5·사이드카 충돌 회피에 대응한다. 산출물 선두에는 `<!-- SEED:` 마커가 붙는다(369행).

셋 다 GATE-C 가 산출물에서 직접 확인하므로, 스킬이 약속을 어기거나 scan 으로 빠지면 게이트가 죽는다. 4.1.1의 정규 절은 51-59행 이 여덟으로 못박고(`Overview`·`Colors`·`Typography`·`Layout`·`Elevation & Depth`·`Shapes`·`Components`·`Do's and Don'ts`) Components 를 빼면 일곱이다 — GATE-C 는 그 일곱을 이름으로 찾고 Components 의 부재를 함께 본다.

**한 가지 새로 알게 된 느슨함을 적어 둔다.** 62행 은 "Omit irrelevant sections rather than filling them with invented rules" 라고 적는다. 즉 정규 순서는 상한이지 하한이 아니고, **올바른 산출물이 일곱보다 적을 수 있다.** 그런데 seed 의 절별 지침(374-381행)은 Components 를 뺀 일곱 전부에 각각 지시를 주므로 seed 의 기대 형태는 일곱이다. GATE-C 의 `NSEC=7` 은 그 기대에 물린 것이고, **적게 나오면 죽는다** — 방향이 fail-closed 이므로 감수하되, 죽었을 때의 올바른 해석은 "생성이 틀렸다"가 아니라 **"어느 절이 왜 생략됐는지 확인하고 DD3 을 갱신하라"** 이다. die 문구가 그렇게 읽히도록 적혀 있다.

> **여기서 절 번호가 두 종류라는 것을 명시한다 — 리뷰어 둘이 연달아 이 둘을 섞었으므로 서술이 모호했던 것이 맞다.**
>
> - **생성물** `DESIGN.calendar.md` 는 **4.1.1 정규 순서 7절**이다(Overview·Colors·Typography·Layout·Elevation & Depth·Shapes·Do's and Don'ts). `Layout` 과 `Shapes` 는 여기에만 있다. GATE-C 의 헤더 검사와 `NSEC=7` 이 보는 것이 이쪽이다.
> - **원본** `DESIGN.md` 는 **3.x가 만든 6절**이다(Overview·Colors·Typography·Elevation·Components·Do's and Don'ts). `Layout`·`Shapes` 절이 **없다**. 답안지 Brand Commitments 의 `4절 Elevation`·`3절 Typography`·`6절 Do's and Don'ts` 와 DD4의 `4절 The brightness Rule` 은 전부 **이쪽 번호**다.
>
> 둘은 서로 다른 문서의 서로 다른 목차이고, seed 가 생성물을 어떻게 번호 매기든 원본의 번호는 바뀌지 않는다. 상속 참조가 원본을 가리키므로 `refs_resolve` 가 대조하는 것도 원본의 목차다. `Layout`·`Shapes` 에 상속할 대상이 없다는 사실이 답안지의 "값 없이 규칙 수준으로만 쓴다" 항목과 GATE-C 의 수치 금지 검사가 존재하는 이유다.

**DD13 — 생성기는 `DESIGN.md` 를 볼 수 없다. 그래서 상속을 `PRODUCT.calendar.md` 의 `## Brand Commitments` 로 실어 보낸다.**

staging 에서 도는 impeccable 은 저장소의 `DESIGN.md` 를 읽지 못한다. 그것이 staging 을 쓰는 이유이므로 우회할 수 없는 대가다. 그러면 seed 는 상속할 재료를 모른 채 **새 시각 세계를 발명하려 들고**, 그것은 UI7("패턴이 완전히 바뀌면 이질감이 생긴다")과 정면으로 부딪힌다. 4.1.1의 `reference/new-work.md` 41행 `### Create or replace the visual world` 가 seed 에 물리는 world workshop 은 실제로 일곱 후보 도출과 `concept-seed.mjs` 주사위를 도는 **새 세계 발명 절차**이며, 그 절차는 심지어 "예측 가능한 답"(the rut)을 후보에서 **명시적으로 배제**한다. 상속은 정확히 그 배제 대상의 모양을 하고 있다 — DD18 이 이 충돌을 다룬다.

impeccable 자신이 이 문제에 채널을 갖고 있다. `reference/document.md` Style guidelines — "PRODUCT.md 의 구속력 있는 로고·아이덴티티 자산·접근성 요구·브랜드 약속은 DESIGN.md 를 구속할 수 있다." 그리고 `init.md` Step 4 의 절 목록에 `## Brand Commitments` 가 있다. 그러므로 Task 2 의 init 인터뷰에서 상속 목록을 **브랜드 약속으로 적는다** — "이 모드는 `DESIGN.md` 의 Glass 절·Named Rules 절·Typography 절을 이름으로 상속하며 값을 다시 정하지 않는다" 형태다. 답안지가 이 문장을 고정하고, GATE-C 가 `PRODUCT.calendar.md` 의 Brand Commitments 존재와 `DESIGN.calendar.md` 의 절 이름 역참조를 함께 본다.

이것이 UI2(생성 주체는 impeccable)를 지키면서 UI5·UI7 을 얻는 유일한 경로다. 대안 둘은 각각 사용자 제약을 깬다 — scan 모드는 시계의 컴포넌트를 통째로 베껴 UI5·UI6 을 깨고, 손으로 쓰는 것은 UI2 를 깬다.

**게이트가 어디까지 보는지 정확히 적는다.** GATE-C 는 **넷**을 본다 — `## Brand Commitments` 절의 존재, 그 절이 `DESIGN.md` 를 절 이름으로 가리키는 것, **그 절 이름이 원본에 실재하는 것**(`refs_resolve`), 그리고 **답안지가 선언한 다섯 절이 그 절 안에 전부 있는 것**(`must-inherit` · DD23). 세 번째가 3차 패널 test 관점의 CRITICAL 흡수다 — 그전에는 `DESIGN.md 의 비존재섹션 절` 이 그대로 통과했다. 네 번째는 6차 패널 test 관점의 HIGH 흡수다 — 그전에는 다섯 중 **하나만** 적어도 통과했다. 번호가 틀린 참조는 DD21 이 따로 잡는다.

**그래도 남는 것이 있다.** 게이트는 "Typography 절을 상속한다"고 적은 문서가 그 아래에서 새 타입 스케일을 정의하는 것을 잡지 못한다 — 참조가 실재하는지는 알아도 그 참조가 지켜졌는지는 모른다. 값 복사는 `gate-final` 의 토큰 전수 검사가 잡지만, **값을 옮기지 않으면서 규칙만 새로 쓰는 것**은 문자열로 구분되지 않는다. 그 잔여는 Acceptance 의 통독 항목과 대리 판정이 맡으며, 게이트가 그것까지 잡는 척하지 않는다. 반영이 어긋나 게이트가 죽으면 복구는 답안지의 Brand Commitments 문안을 더 강하게 고쳐 다시 도는 것이다.

**DD4 — 상속은 절 이름 참조로 하고 값을 옮기지 않는다** (UI5).
대비 실측법·유리 정당화 조건·`brightness` 규칙·타이포·모션·포커스 링·한국어 줄바꿈이 대상이다. 캘린더 문서에는 "`DESIGN.md` 4절 The brightness Rule을 그대로 따른다" 형태로만 적는다. **절 이름이 원본에서 여러 번 나오면 절 번호를 반드시 동반한다** — `Named Rules` 는 `DESIGN.md` 에 세 번 있고(`:290` 2절 Colors, `:327` 3절 Typography, `:355` 4절 Elevation), `refs_resolve` 는 낱말 경계 대조라 번호 없는 `Named Rules` 가 셋 중 아무거나에 닿아도 통과한다. 게이트가 잡지 못하는 모호함이므로 형태 쪽에서 닫는다. 검사는 손으로 고른 몇 개 값을 찾는 방식이 아니라, **원본 두 문서에서 측정치 토큰을 기계적으로 추출해 그 전부를 캘린더 문서에서 찾는다**(gate-final). 값이 두 곳에 생기면 다음 실측 때 한쪽만 갱신되고, 그것이 PRD Risk "제품 문서 분리의 표류"가 말하는 실패다.

**DD5 — 갈아 끼우는 것은 목표 층위뿐이고, 재료 층위는 상속한다** (UI7).
PRD Design Direction 표의 좌열 넷(주인공·성공 지표·anti-reference 적용 범위·두 상태 계약)만 캘린더 문서가 새로 정의한다. 우열 넷은 DD4의 참조로 처리한다. 이 경계가 곧 `[셸]`·`[시계]` 태그의 판정 기준이다.

**경계에 예외가 하나 있다 — 값은 상속되는데 그 근거가 좌열에 매여 있는 규칙이다.** `DESIGN.md:359` `The 표면을 누르지 알파를 올리지 않는다 Rule` 은 자기 근거를 "사진이 절반 넘게 죽어 **면적 예산**과 정면으로 부딪힌다"로 적는다. 그런데 면적 예산은 좌열 2번(성공 지표 = 사진이 몇 퍼센트 보이느냐)에서 나온 값이고, 캘린더 모드는 그 지표를 "상기되는가"로 갈아 끼운다. 즉 **값은 상속되지만 왜 그런지가 상속되지 않는다.** 그대로 두면 M3가 "면적 예산은 캘린더 모드에 없으니 알파를 올려도 된다"로 갈 수 있고, 그것은 값을 옮기지도 절을 무시하지도 않았으므로 DD4·DD13의 형식 검사를 전부 통과한다.

그래서 규칙을 하나 더한다 — **재료를 상속하되, 그 재료의 근거가 좌열에 매여 있으면 근거만 캘린더 모드의 좌열로 다시 쓴다.** 값을 다시 정하는 것이 아니므로 UI5와 부딪히지 않는다. 위 규칙의 경우 캘린더 모드에서 알파를 올리지 않는 근거는 면적 예산이 아니라 **원칙 3**이다 — 알파는 사진 전체를 균일하게 덮어 오늘 줄과 배경의 밝기 차이를 함께 지우므로, 상기의 단서가 되는 대비 자체가 줄어든다. 근거가 갈리는 자리는 이 하나로 알려져 있고, 새로 생기면 통독이 잡는다(Acceptance). **게이트는 이것을 잡지 못한다** — 근거는 문자열이 아니라 논증이고, DD13 마지막 문단이 적은 잔여와 같은 종류다.

**DD6 — `DESIGN.md:172`의 범위 문장은 정정 대상이다.**
현재 "달력 v2는 M1만 완료이고 M2·M3는 dogfooding 결과 대기 중"이라 적혀 있는데, 그 v2 PRD는 이번 PRD가 대체했고(UI13) 그 dogfooding은 수행되지 않았다(PRD Evidence). 문장을 그대로 두면 새 문서가 폐기된 계획을 근거로 자기 범위를 설명하게 된다. 바뀔 문장을 여기서 확정한다 — 대체 텍스트는 **"범위: 달력 위젯 제외. 달력 모드의 시각 기준은 `DESIGN.calendar.md`에 있다. 이 문서가 다루는 것은 배경 레이어, 시계, 검색창, 바로가기(고정 + 사이드바), 배경 이미지 사이드바, 설정 모달, 저장소 고지 배너, 그리고 이들이 공유하는 유리 언어다."** 이며, `gate-final`이 옛 문구(`dogfooding 결과 대기`)의 부재와 새 문구의 존재를 함께 확인한다.

**DD7 — 판정 2건의 값은 M1에서 정하지 않는다.**
M1이 만드는 것은 결정을 내리는 **규칙**이지 결정 자체가 아니다. 렌더된 화면 없이 값을 굳히면 M3의 실측이 그것을 뒤집을 때 문서가 먼저 틀린 것이 된다. 대신 Acceptance가 "이 문서만 보고 그 두 결정을 내릴 수 있는가"를 묻는다. PRD Open Question "M1의 산출물을 무엇으로 판정하는가"의 해소안이다.

**DD8 — 인터뷰 답은 산문이 아니라 파일이고, 그 파일은 커밋한다.**
`/impeccable init`과 `/impeccable document`는 대화형 스킬이라 사람이 답을 타이핑한다. 답을 이 플랜 본문의 산문으로만 두면 옮겨 적는 과정에서 흔들리고, 그 흔들림은 사후 grep으로 잡히지 않는다. 그래서 답을 `.claude/plans/work-calendar-m1.answers.md`에 **먼저 확정해 파일로 만들고**, 인터뷰에서는 그 파일의 항목을 그대로 붙여 넣는다. 같은 파일이 산출물 검사의 기준이 된다 — 각 답에 딸린 `must-contain` 목록을 GATE-C가 생성 문서에서 확인한다.

이 파일은 게이트의 판정 기준(버전 고정값·must-contain 목록)을 담으므로 신뢰 경계다. 그래서 **`verify.sh` 와 같은 커밋에 함께 들어가고 같은 리뷰를 받는다** — 3차 패널 security 관점이 "이 파일의 버전 관리 상태가 어디에도 안 적혀 있다"고 지적한 항목이다. 추적되지 않는 파일이 게이트의 느슨함을 조용히 정할 수 있어서는 안 된다. GATE-A 가 이 파일이 git 추적 대상인지를 함께 확인한다. **추적만으로는 부족하다는 것이 4차 패널에서 다시 지적됐고, 그 흡수가 DD14 다** — 추적은 파일의 출처를, 지문은 한 번의 실행 안에서의 불변을 각각 맡는다.

`must-contain` 하한 **5**는 임의의 수가 아니다. 아래 **답안지 형식** 절이 그 다섯을 이름으로 든다 — 앞 넷(상기·Esc·제안까지·택일)은 조사 노트 판정 1이 "새 문서에 반드시 들어가야 할 것"으로 지목한 항목이고, 다섯째(`면적 예산이 아니라`)는 성격이 달라 DD5 의 근거 재바인딩을 문자열로 물린 것이다. 다섯은 하한이고 늘리는 것은 자유다(4차 패널 invariant LOW). **GATE-A 와 GATE-C 가 같은 수를 요구한다** — 두 수가 갈리면 답안지 결함을 생성이 끝난 뒤에야 알게 되고, 그것이 5차 패널 test HIGH 가 짚은 자리다. 이 문단이 `4` 로 남아 있던 것을 9차 패널 test 가 다시 잡았다: **산문과 코드가 갈리는 자리는 고쳐도 다시 생긴다.**

**DD9 — 아래 fan-out 절은 M1이 아니라 M2 이후를 겨냥한다.**
Phase 2.5 패널에 PRD 전문을 넘겨 4/4 관점을 받았는데, CRITICAL 7건이 전부 관문 데이터 모델·마이그레이션·저장 스키마다. M1에는 코드가 없으므로 그중 이 플랜이 소비하는 것은 architect의 HIGH 1건("문서 분리가 코드에 반영될 자리가 없다")과 같은 관점의 meta-gap 하나뿐이다. 나머지는 M2 플랜의 입력으로 보존한다.

**DD10 — staging 생성은 1회성 시술이 아니라 이름 붙은 반복 절차다.**
`DESIGN.md:172`는 달력 시각 스펙을 "리디자인 확정 후 `/impeccable document`로 다시 기록한다"고 예고한다. M3가 실제로 그 시점이며, 그때도 impeccable 은 여전히 cwd 의 한 쌍만 본다. 그러므로 M1이 만드는 것은 문서 둘만이 아니라 **다시 실행할 수 있는 절차 하나**다. 재사용의 단위는 **스크립트가 아니라 절차**다. `verify.sh`는 캘린더 문서 이름을 `CAL_PRODUCT`·`CAL_DESIGN` 환경변수로 받고 기본값만 M1의 두 이름으로 두므로, M3는 같은 파일을 그대로 두고 그 변수만 덮어 게이트를 다시 돈다. 새 플래그를 만들지 않는다. M3가 추가로 필요로 하는 것은 seed 가 아니라 scan 모드 산출물이므로 `gate-c` 의 seed 단언만 그때 완화되며, 그 완화는 M3 플랜이 자기 DD로 적는다. **M3에서는 staging 이 아니라 저장소 루트에서 도는 편이 옳을 수 있다** — 그때는 캘린더 코드가 실재하므로 scan 이 읽을 기존 시스템이 정당하게 존재한다.

**DD11 — 게이트는 되돌릴 수 없는 단계 앞에 선다. 되돌릴 수 있는 단계 앞에는 서지 않는다.**
1차 패널 invariant 지적의 핵심은 "검증이 마지막에 몰려 있어 늦게 발견한다"였다. GATE-A는 **Task 1보다 먼저** 코드 무변경 베이스라인과 impeccable 계약을 확인하고, GATE-B는 staging 이 성립했는지를 생성 전에 확인하며, GATE-C는 산출물이 루트로 온 직후 검사하고, GATE-D는 저장소가 생성 과정에서 조금도 바뀌지 않았음을 Task 5의 의도된 편집 **전에** 증명하며, GATE-E는 Task 7이 PRD를 건드리기 전에 태그 누락을 잡는다. 각 게이트는 `set -euo pipefail` 아래에서 죽으며, 다음 Task는 앞 게이트의 종료 코드 0을 전제로만 시작한다.

**이 원칙의 범위를 정확히 적는다.** 2·3차 패널 invariant 가 같은 자리를 두 번 겨눴다 — "`gate-final` 이 Task 7 의 PRD 편집 **뒤에** 도니 DD11 위반"이라는 것이다. 그 지적은 Task 7 을 되돌릴 수 없는 단계로 읽는데, **그렇지 않다.** 이 마일스톤에서 되돌릴 수 없는 것은 생성 자체(impeccable 이 staging 에 쓰는 것)와 저장소 문서의 변형뿐이고, 전자는 저장소 밖 임시 디렉터리에서 일어나며 후자는 GATE-D 가 일어나지 않았음을 증명한다. Task 5·6·7 이 만지는 파일은 **넷 다 추적되고 게이트 직전에 깨끗함이 확인된 파일**이므로 `git checkout -- <파일>` 이 항상 완전 복구다. GATE-E 가 Task 7 직전에 PRD 의 그 조건을 확인하는 것이 이 문단의 기계적 뒷받침이다.

그리고 **기록은 원리적으로 사후 검증밖에 안 된다.** `gate-final` 이 확인하는 것은 "PRD 의 기록이 현재 플랜 판본을 가리키는가"인데, 기록이 쓰이기 전에는 검증할 대상 자체가 없다. 그래서 이 자리에서 게이트가 할 수 있는 최선은 **틀린 기록을 못 쓰게 막는 것이 아니라, 틀린 기록으로 끝나지 못하게 막는 것**이다 — `gate-final` 이 0을 내지 않으면 Task 7 은 완료가 아니고, 되돌림은 한 줄이며, 커밋은 그 뒤에 온다(Task 7 Validate).

**DD12 — 기존 두 문서가 이미 어긋나 있다. M1이 그것을 고치고 간다.**
`PRODUCT.md:108`은 유리 표면의 해결값을 `brightness(0.60)`으로, `DESIGN.md:357` The brightness Rule은 `brightness(0.62)`로 적는다. 같은 규칙의 값이 두 문서에 각각 있고 서로 다르다 — DD4가 막으려는 표류가 캘린더 문서를 만들기도 전에 이미 일어나 있다. 3차 패널 architect가 찾아낸 실재 결함이다. 값의 출처는 `DESIGN.md`(frontmatter가 규범)이므로 `PRODUCT.md:108`에서 수치를 **빼고** 절 이름 참조로 바꾼다. 이것이 DD4가 요구하는 형태이며, 동시에 `PRODUCT.md:108`을 Patterns 표의 선례로 계속 쓸 수 있게 만든다 — 지금은 그 줄이 "값을 복사하지 말라"의 선례이면서 스스로 값을 복사하고 있다.

**그 줄은 두 군데가 틀렸고, 직전 판까지 우리는 한 군데만 알고 있었다(5차 패널 architect CRITICAL).** 값을 복사하는 것에 더해 **가리키는 절 이름 자체가 실재하지 않는다** — 그 줄은 "`DESIGN.md`의 **Glass** 절에 있다"라고 적는데 `DESIGN.md`의 최상위 절은 Overview·Colors·Typography·Elevation·Components·Do's and Don'ts 여섯이고 `Glass` 는 없다. 하위 헤더에도 없다. Patterns 표가 이 줄을 "다른 문서를 절 이름으로 가리킨다"의 선례로 인용하고 있으니, **선례가 죽은 참조였다.**

그래서 DD12는 값 삭제만으로 끝나지 않는다. **대체 문장을 여기서 확정한다** — `해결값은 \`DESIGN.md\` 4절 The brightness Rule에 있다.` 형태다. 절 번호를 동반하고(DD4), 이름을 코드 스팬 밖 평문으로 두며(`refs_resolve` 의 형태 계약), 수치를 담지 않는다. 이 문장이 들어가야 `gate-final` 의 원본 자기참조 검사가 통과한다.

**그리고 그 죽은 참조가 왜 지금까지 살아 있었는지가 더 큰 문제였다.** `refs_resolve` 는 원본에서 절 이름을 뽑아 **캘린더 문서의** 참조만 대조했고 원본의 자기 참조는 한 번도 보지 않았다. 그것을 실제로 돌려 보니 더 나쁜 것이 나왔다 — 돌려도 **통과한다.** 통과시키는 것은 같은 줄에 복사돼 있던 값 `` `brightness(0.60)` `` 이다. `brightness` 가 Named Rule 이름이고 앞뒤가 백틱과 여는 괄호라 낱말 경계 검사를 그대로 넘긴다. 4차 라운드에 추출 창을 80자로 넓힌 대가로 **창 안의 무관한 텍스트가 절 이름을 공급하는** 경로가 열려 있었던 것이다. `strip_code_spans` 가 그 경로를 닫고, `gate-final` 이 원본 두 문서에도 `refs_resolve` 를 돌린다. 값 복사와 죽은 참조가 서로를 가려 주던 구조였다는 점을 적어 둔다.

**DD14 — 게이트는 실행 도중에 자기 판정 기준을 갈아 끼울 수 없다. 판정 기준 두 파일을 GATE-A 가 지문으로 고정하고, 이후 모든 게이트가 대조한다.**

4차 패널 security 관점이 같은 자리를 두 번 겨눴다(HIGH 2건). DD8 이 답안지를 "신뢰 경계"로 선언해 놓고 GATE-A 는 `tracked` 만 확인하는데, `PRODUCT.md`·`DESIGN.md` 는 `tracked` 에 더해 `git status --porcelain` 이 빈지까지 본다. 그 비대칭이 실제 창을 연다 — GATE-C 는 `must-contain` 목록을 **작업 트리의** 답안지에서 읽으므로, GATE-A 통과 뒤에 그 파일을 고치면 판정 기준이 조용히 느슨해진다. 게이트가 자기 기준을 실행 중에 갈아 끼울 수 있으면 그것은 기준이 아니다.

**그러나 지적이 제안한 처방은 이 두 파일에 쓸 수 없다.** `PRODUCT.md`·`DESIGN.md` 의 깨끗함 검사가 성립하는 이유는 그 둘이 이미 커밋된 파일이고 `gate-final` 이 `git show HEAD:` 로 읽기 때문이다. `verify.sh` 와 답안지는 **Task 0 이 새로 만드는 파일**이고 커밋은 게이트 통과 뒤에 온다(Task 7 Validate). `git status --porcelain` 이 빌 것을 요구하면 착수 첫 실행에서 반드시 죽는다 — 존재할 수 없는 상태를 요구하는 게이트다.

그래서 처방을 축으로 바꾼다. 두 파일은 HEAD 가 아니라 **자기 자신의 GATE-A 시점 내용**에 묶인다. GATE-A 가 `sha256sum "$ANSWERS" "$VERIFY" > "$CRITERIA"` 로 지문을 남기고, GATE-B·C·D·E·final 이 각각 `criteria_unchanged` 를 먼저 호출한다. `tracked` 검사는 그대로 남는다 — 둘은 다른 것을 막는다. `tracked` 는 "추적되지 않는 파일이 기준을 정하는 것"을, 지문은 "한 번의 실행 안에서 기준이 바뀌는 것"을 막는다.

**이것이 막지 못하는 것을 적는다.** GATE-A 를 다시 돌리면 지문도 다시 찍히므로, 답안지를 느슨하게 고치고 처음부터 다시 도는 경로는 열려 있다. 그 경로를 닫는 것은 게이트가 아니라 리뷰다 — 두 파일이 추적되고 같은 커밋에 들어가므로(DD8) 그 편집은 diff 로 보인다. 게이트가 막는 것은 **한 번의 실행 안에서 기준이 움직이는 것**이고, 그 이상을 막는 척하지 않는다.

**DD15 — 태그의 정오를 커버리지로 판정하지 않는다. 답안지가 기대 태그를 선언하고 GATE-E가 대조한다.**

2차 패널 architect가 "`[셸]`이어야 할 절에 `[시계]`가 가도 게이트가 못 잡는다"고 지적했고 이 플랜은 그것을 Risks 표에 "게이트가 잡지 못한다"로 적어 두는 것으로 처리했다. 5차 패널 test가 같은 자리를 HIGH로 다시 지적했다 — 두 번 지적된 항목을 세 번째로 "적어 뒀다"고 답하는 것은 답이 아니다.

**판단을 기계로 옮기지 않는다. 판단을 선언으로 옮긴다.** 어느 절이 모드 무관인지는 DD5의 경계를 사람이 적용해야 알고, 그것은 지금도 참이다. 바뀌는 것은 그 판단이 어디에 사는가다 — 전에는 Task 6의 편집 안에만 있었고 대조할 상대가 없었다. 이제 답안지의 `tag-map:` 줄이 기대값을 적고 GATE-E가 산출물과 대조한다.

셋이 함께 있어야 성립한다. (1) 선언은 **Task 0**에 확정된다 — DD14의 지문이 GATE-A 시점에 답안지를 동결하므로 뒤에서 덧붙일 수 없고, 그 동결이 곧 설계다. 태그를 붙이기 전에 기대값을 적어야 대조가 도장 찍기가 아니게 된다. (2) 선언은 두 문서의 `## ` 절과 **일대일**이어야 한다 — 행 수 대조가 누락과 중복을 함께 막는다. (3) 선언이 틀렸음을 Task 6에서 알게 되면 복구는 GATE-A부터 다시 도는 것이고, 그 재실행은 판정 기준 지문을 바꾸므로 PRD 기록 줄에 드러난다(DD14 보강).

**여전히 못 잡는 것을 적는다.** 선언 자체가 틀리면 게이트는 통과한다. 그것을 잡는 것은 리뷰이며, 답안지가 추적되고 같은 커밋에 들어가므로(DD8) 그 판단은 diff에 보인다. 게이트가 판정하는 것은 **선언과 산출물의 일치**이지 선언의 옳음이 아니고, 그 이상을 잡는 척하지 않는다. 다만 전과 달리 틀린 판단은 이제 **적혀 있고**, 적히지 않은 판단과 적힌 판단은 리뷰 가능성에서 다르다.

**DD16 — 상속을 선언한 규칙의 재정의는 이름 충돌로 잡는다.**

DD13 마지막 문단은 "값을 옮기지 않으면서 규칙만 새로 쓰는 것은 문자열로 구분되지 않는다"고 적었다. 5차 패널 architect와 test가 각각 HIGH로 그 자리를 지적했다. 다시 보니 **한 축은 문자열로 구분된다** — 이 저장소에서 규칙이 취하는 형태가 `**The [이름] Rule.**` 하나로 고정돼 있기 때문이다(Patterns 표, `DESIGN.md:357`). 상속한다고 선언한 규칙을 캘린더 문서가 **같은 이름으로** 다시 정의하면 그것은 이름 충돌이고, 이름 충돌은 기계 판정이다.

GATE-C가 두 문서에서 `**The … Rule.**` 이름 집합을 뽑아 교집합을 본다. 교집합이 비어야 통과한다. **캘린더 고유의 새 이름 규칙은 막지 않는다** — 막아야 하는 것은 재정의이지 신설이 아니며, DD5 좌열 넷은 새 규칙을 세우는 자리다.

**이것이 덮는 범위를 정확히 적는다.** 같은 이름으로 덮어쓰는 것은 잡는다. 다른 이름으로 같은 내용을 다시 쓰는 것은 잡지 못한다 — 그 잔여는 여전히 Acceptance의 통독이 맡는다. 그러나 전에는 축이 하나도 없었고 지금은 가장 흔한 축 하나가 닫혔다. `The 두 단계 Rule` 을 상속한다고 적고 그 아래에서 같은 이름으로 세 단계를 정의하는 것이 정확히 이 게이트가 막는 것이다.

**DD17 — 게이트 순서를 규율이 아니라 원장으로 강제한다.**

DD11은 "각 게이트는 되돌릴 수 없는 단계 앞에 서고, 다음 Task는 앞 게이트의 종료 코드 0을 전제로만 시작한다"고 적었다. 그런데 그 "전제로만"을 **강제하는 것이 아무것도 없었다** — `gate-final` 은 최종 상태만 보므로 GATE-B·C·D·E 를 건너뛰고 바로 불러도 상태가 맞으면 0을 낸다. 5차 패널 invariant 가 HIGH 로 짚은 자리이고, 지적이 옳다. DD11이 선언한 불변식이 코드에는 없었다.

각 게이트가 통과 시점에 자기 이름을 `.claude/plans/.m1-gates.log` 에 남기고 `gate-final` 이 `gate-a` 부터 `gate-e` 까지 전건을 요구한다. 원장은 **GATE-A 가 새로 만들고**(`: > "$GATELOG"`) `gate-final` 이 베이스라인·판정 기준과 함께 지우므로 한 번의 실행에만 유효하다 — 옛 실행의 통과 기록을 재사용할 수 없다. 이것은 DD14의 판정 기준 지문과 같은 성격의 장치다: 지문은 기준이 실행 중에 움직이는 것을, 원장은 단계가 실행 중에 생략되는 것을 각각 막는다.

**막지 못하는 것을 적는다.** 원장은 게이트가 **돌았다**는 사실만 기록하지 그 사이에 사람이 무엇을 했는지는 모른다. GATE-C 통과 뒤 산출물을 고치고 gate-final 로 가는 경로는 열려 있다 — 그것을 막는 것은 `criteria_unchanged` 도 원장도 아니고 `gate-final` 이 산출물을 **다시 보는 것**이다(참조 실재·토큰 전수·4방향 링크를 전부 재검사한다). 원장이 닫는 것은 "게이트를 아예 부르지 않는 것"이고, 그 이상을 막는 척하지 않는다.

**DD18 — 4.1.1의 seed 는 다섯 질문이 아니라 world workshop 이다. 상속은 답변이 아니라 *핀*으로 들어간다.**

직전 판의 답안지는 `document --seed` 에 "다섯 질문"(색 전략·타이포 방향·모션 에너지·참조 셋·anti-reference)이 온다고 적었다. **4.1.1에 그 인터뷰는 없다.** `reference/document.md` 354-360행 이 seed Step 1 을 `new-work.md` 로 라우팅하고, 거기서 도는 것은 (1) 청중의 문화 세계에서 **일곱 후보** 도출 (2) `concept-seed.mjs --scope direction` 이 방향을 배정하고 challenger 를 딜하는 **주사위** (3) `serve-question.mjs --start` 가 띄우는 **결정 페이지에서 사용자가 카드 하나를 잠그는 것** (4) `## 4. Commit the world` 의 색 전략·서체 확정이다. 다섯 질문을 준비해 가면 물어보지 않는 질문에 답을 들고 서 있게 된다.

이 절차는 상속에 두 번 적대적이다. 후보 도출이 "the rut"(그 카테고리가 늘 내는 답과 그 뻔한 반대)을 **명시적으로 배제**하는데, 시계 모드에서 상속한 유리 언어는 이 저장소 맥락에서 정확히 그 자리에 있다. 그리고 주사위는 순위 고착을 깨는 것이 목적이므로 "가장 자연스러운 답"이 오히려 덜 딜린다.

**그러나 workshop 자신이 상속의 문을 열어 둔다.** `new-work.md` 의 direction 라운드 규약에 `**a user- or brief-pinned direction beats the roll, always**` 가 있고, 같은 문서가 "Record a standing preference as a brand commitment in PRODUCT.md" 라고 적는다. 즉 DD13 이 고른 채널(`## Brand Commitments`)이 **바로 이 핀의 기록 자리**다. 그래서 M1 의 Task 3 은 workshop 을 **이기려 하지 않고 핀으로 들어간다** — 카드를 고르는 자리에서 상속 방향을 pinned direction 으로 선언하고, 주사위가 무엇을 딜하든 그것을 잠근다. 답안지가 준비해야 하는 것은 다섯 답이 아니라 **그 핀 문장 하나와, 결정 페이지에서 무엇을 잠글지의 사전 결정**이다.

**대가를 적는다.** 이 경로는 M1 을 "상속을 확정하는 문서 작업"으로 유지하는 대신, workshop 이 제공하는 탐색(일곱 후보·challenger·raise)을 **의도적으로 쓰지 않는다.** 캘린더 모드가 독자적 시각 세계를 가질 자격이 있는가는 M3 의 물음이고, M1 에서 그 문을 열면 UI7·UI8 과 함께 마일스톤 경계가 무너진다. 그때 workshop 을 제대로 도는 것이 DD10 이 말한 "다시 실행할 수 있는 절차"의 두 번째 실행이다.

**게이트가 이것을 어디까지 잡는가.** 잡지 못한다 — 핀을 선언했는지는 결정 페이지에서 일어나는 일이고 산출물에 그 흔적이 남는다는 보장이 없다. 게이트가 보는 것은 여전히 **결과물의 형태**(Brand Commitments 존재·절 이름 실재·값 미복사·규칙 이름 미충돌)뿐이다. workshop 이 새 세계를 발명해 버렸다면 그 산출물은 DD16 의 이름 충돌이나 `gate-final` 의 토큰 검사에서 죽을 **가능성이 높지만 확실하지 않다.** 확실한 것은 Acceptance 의 통독이 맡는다.

**DD19 — impeccable 은 plugin 으로 설치되며, 게이트는 그 경로를 *탐지*하고 옛 CLI 설치본의 공존을 거부한다.**

배포 채널이 npm CLI 에서 marketplace plugin 으로 바뀌었다(판본 주의). 결과로 스킬 파일의 자리가 셋 중 하나일 수 있다:

| 채널 | 경로 | 이 저장소에서의 판본 |
|---|---|---|
| plugin (현행) | `~/.claude/plugins/cache/impeccable/impeccable/<버전>/skills/impeccable` | **4.1.1** |
| npm CLI (폐지) | `~/.claude/skills/impeccable` | 3.5.0 (잔존) |
| npm latest | — | 3.6.0 |

**경로를 하드코딩하지 않는다.** plugin 경로가 버전을 품고 있어서, 하드코딩하면 판본 고정이 답안지와 경로 두 곳에 생기고 업데이트마다 게이트가 "파일이 없다"로 죽는다 — 설계된 "버전 불일치" 진단 대신 무의미한 진단이 나온다. 그래서 GATE-A 가 `installed_plugins.json` 에서 `^impeccable@` 로 시작하는 키를 찾아 `installPath` 를 읽고 `/skills/impeccable` 을 붙인다. marketplace 이름은 게이트가 알 필요 없는 사실이므로 접두어로만 맞춘다.

**공존을 거부하는 것이 이 DD 의 절반이다.** 두 설치본이 동시에 있으면 같은 이름의 skill 이 둘이고, `/impeccable` 을 불렀을 때 어느 쪽이 도는지를 이 플랜이 통제할 수 없다. 그러면 GATE-A 가 4.1.1의 `reference/*.md` 를 읽고 통과시킨 뒤 Task 2·3 이 3.5.0 을 실행하는 경로가 열린다 — **게이트가 검사한 것과 실행되는 것이 다른** 최악의 형태다. GATE-A 가 `~/.claude/skills/impeccable` 의 존재 자체를 실패로 처리하고, 복구는 그 디렉터리를 지우는 것이다.

> **부수 발견(M1 범위 밖).** 이 채널 변경으로 mccp 자신의 impeccable 탐지도 깨진다 — `impeccable-detect.js` 의 `probeSkillAvailable` 이 `impeccable@anthropics` 를 찾는데 실제 키는 `impeccable@impeccable` 이고, 지금 `true` 가 나오는 것은 순전히 위의 레거시 디렉터리 폴백 때문이다. 즉 **DD19 가 요구하는 정리를 하는 순간 mccp 의 디자인 게이트가 조용히 꺼진다.** `/mccp:setup` 은 한술 더 떠 폐지된 npm CLI 설치를 권하고 그 디렉터리를 다시 만든다. 이 플랜이 고칠 대상이 아니므로 upstream 에 보고했다 — `idenn207/mccp#155`. M1 에 미치는 실효는 하나뿐이다: 이 마일스톤을 도는 동안 mccp receipt 의 `impeccable_skipped` 가 참으로 찍힐 수 있고, **그것은 이 플랜의 게이트와 무관하다**(판정자는 `verify.sh` 이지 receipt 가 아니다).

**DD20 — Task 7 이 PRD 에 쓰는 것을 gate-final 이 실제로 읽는다. 적어 두고 안 보던 자리를 닫는다.**

Task 7 Validate 는 "`gate-final` 은 두 Open Question 항목이 `[x]` 이고 각각 해소 근거 한 줄을 가지는지 본다"고 적어 왔다. **구현이 없었다** — 6차 패널 invariant 가 CRITICAL 로 짚었고, `gate-final` 전체에서 Open Question 검사 적중이 0건임을 확인했다. 이 플랜이 다섯 라운드에 걸쳐 반복해서 고쳐 온 결함과 정확히 같은 종류다: **게이트가 잡는다고 적힌 것을 게이트가 잡지 않는 것.** 그것을 다섯 번 고치고도 한 자리가 남아 있었다는 사실 자체가, 이 결함이 산문과 코드가 갈리는 어디서든 다시 생긴다는 증거다.

닫는 방식은 셋을 **한 줄에** 요구하는 것이다 — 줄 머리의 `- [x] `, 물음 문구, 그리고 `해소`. 셋을 따로 보면 각각이 다른 줄에서 충족돼 통과한다(체크만 하고 근거가 없거나, 다른 물음의 해소 표기가 이 물음을 대신 통과시킨다). 대조는 `awk` 의 `index()` 로 하며 물음 문구가 정규식 메타문자를 품어도 이스케이프가 필요 없다.

**여기서도 게이트가 판정하는 것은 형태다.** 해소 근거가 **옳은지**는 보지 않는다 — 그것은 리뷰이고, PRD 는 추적되므로 그 편집은 diff 에 보인다. 게이트가 막는 것은 "근거 없이 체크만 하고 끝내는 것"이다.

**DD21 — 절 번호를 실제로 대조한다. DD4 의 "형태 쪽에서 닫는다" 가 형태만 요구하고 검사가 없던 자리다.**

DD4 는 "절 이름이 원본에서 여러 번 나오면 절 번호를 반드시 동반한다"고 요구하고, 그 모호함을 "게이트가 잡지 못하므로 형태 쪽에서 닫는다"고 적었다. 6차 패널 architect 가 HIGH 두 건으로 같은 자리를 짚었고 지적이 옳다 — **형태를 요구하는 문장은 있었고 그 형태가 맞는지 보는 코드는 없었다.** `### Named Rules` 는 `DESIGN.md` 에 셋이므로(`:290` 2절 · `:327` 3절 · `:355` 4절) `DESIGN.md 2절 The brightness Rule` 처럼 **번호만 틀린** 참조가 이름 검사를 그대로 통과했다.

`refs_resolve` 가 원본에서 `번호|이름` 목록을 함께 뽑고, 참조가 `N절` 을 달고 있으면 맞은 이름 중 하나가 실제로 N절에 속할 것을 요구한다. 두 가지를 함께 고쳐야 성립한다 — 이름 대조가 첫 적중에서 멈추지 않고 **맞은 이름을 전부** 내야 한다. 첫 적중만 보면 같은 참조 안의 다른 이름이 정답일 때 멀쩡한 참조가 죽는다.

**번호를 안 쓴 참조는 막지 않는다.** DD4 가 요구하는 것은 모호할 때의 번호이고, 유일한 이름에까지 번호를 강제하면 `DESIGN.md의 Elevation 절` 같은 정상 참조가 죽는다. 즉 이 검사가 닫는 것은 "번호를 썼는데 틀린 것"이지 "번호를 안 쓴 것"이 아니다 — 후자는 여전히 DD4 의 형태 규약이고 리뷰가 본다. **범위를 정확히 적는 이유는, 직전 판이 바로 이 구분을 흐린 채 "닫는다"고 적었기 때문이다.**

**DD22 — 게이트의 환경 전제를 게이트가 확인한다. CR 하나가 판정자를 죽인다.**

이 저장소는 `core.autocrlf=true` 이고 `.gitattributes` 가 없다. 그러면 `verify.sh` 를 커밋한 뒤 다시 체크아웃할 때 CRLF 로 내려오고, `bash` 는 그 파일을 실행하지 못한다(`$'\r': command not found`). **더 나쁜 것은 진단이 틀린다는 점이다** — GATE-A 의 바이트 비교가 먼저 죽으면서 "옮겨 적다 틀렸거나 한쪽만 고쳤다"고 말하는데, 실제 원인은 체크아웃이다. 6차 패널 test 가 줄바꿈 축을 MEDIUM 으로 짚었고, 확인해 보니 `autocrlf` 가 실제로 켜져 있어 지적보다 사정이 나빴다.

원인과 증상을 각각 막는다. Task 0 이 `.gitattributes` 에 `*.verify.sh text eol=lf` 를 더해 **원인**을 막고, GATE-A 가 `verify.sh` 의 CR 존재를 검사해 **증상을 이름으로** 잡는다. 둘 다 필요하다 — `.gitattributes` 는 이미 잘못 체크아웃된 작업 트리를 고치지 않고, CR 검사는 다음 체크아웃을 막지 못한다.

같은 자리에서 외부 도구 존재도 확인한다(`sha256sum`·`mktemp`·`comm`·`awk`·`sed`·`grep`·`diff`). `sha256sum` 은 플랫폼에 따라 갈리고(macOS 는 `shasum`), 없으면 게이트가 **중간에** 죽는다 — GATE-D 에서 베이스라인 대조가 실패하는 것으로 나타나 "저장소가 바뀌었다"는 틀린 진단을 낸다. DD11 대로 착수 앞에서 죽는 편이 싸다.

**DD23 — 상속 목록을 산문에서 기계가 읽는 줄로 내린다. "절 하나라도 가리키는가"는 상속 검사가 아니다.**

DD13 은 다섯을 상속한다고 골랐다(`DESIGN.md` 4절 Elevation · 4절 Named Rules · 2절 Named Rules · 3절 Typography · 6절 Do's and Don'ts). 그런데 GATE-C 가 물어 온 것은 "Brand Commitments 가 `DESIGN.md` 의 절을 **하나라도** 가리키는가"였다. **넷을 빠뜨리고 하나만 적어도 통과한다**(6차 패널 test HIGH). 목록이 산문에만 있고 기계가 읽는 자리에 없던 것이 원인이며, DD15 가 태그에 대해 이미 푼 문제와 같은 모양이다 — **판단을 선언으로 옮기고 대조한다.**

답안지에 `must-inherit:` 줄을 두고 GATE-C 가 대조한다. 범위가 중요하다: **`## Brand Commitments` 절 안에서만** 찾는다. 문서 아무 데서나 찾으면 절 이름이 본문 어딘가에 스치기만 해도 통과하고, 그것은 채널을 확인한 것이 아니라 문자열을 확인한 것이다.

**여전히 못 잡는 것.** 상속한다고 **적고** 그 아래에서 다시 정의하는 것은 DD16 의 이름 충돌과 `gate-final` 의 토큰 전수가 각각 한 축씩 잡고, 나머지는 Acceptance 통독이다. DD23 이 닫는 것은 "골라 놓고 안 적는 것" 하나다.

**DD24 — 답안지를 플랜에 묶는다. `verify.sh` 만 묶여 있고 판정 기준은 안 묶여 있었다.**

`verify.sh` 는 GATE-A 가 플랜 본문의 블록과 바이트 비교로 묶는다. 답안지는 묶여 있지 않았다 — 플랜이 템플릿을 **보여주기만** 했고, 그것과 다른 값으로 답안지를 써도 GATE-A 는 형태(절 존재·개수 하한)만 보고 통과한 뒤 DD14 의 지문이 **틀린 기준을 동결**했다(6차 패널 test HIGH). 판정 기준이 플랜과 갈리면 그 뒤 모든 게이트가 플랜이 말한 것과 다른 것을 판정하며, 그것은 게이트가 있다는 사실만 남고 무엇을 판정하는지는 모르는 상태다.

GATE-A 가 플랜의 템플릿 블록에서 `must-contain:`·`must-inherit:` 줄을 뽑아 답안지가 그 **상위집합**임을 요구한다. 상위집합인 이유는 하한이 하한이기 때문이다 — 늘리는 것은 자유이고 빼면 판정이 플랜보다 느슨해진다.

**`tag-map:` 은 일부러 묶지 않는다.** 플랜이 그것을 **초안**이라고 명시하고 Task 0 이 절 구성을 확인해 고치도록 설계했다(DD15). 여기서 묶으면 그 설계가 죽는다. 즉 이 DD 가 묶는 것은 "플랜이 값까지 정한 항목"이고, "플랜이 초안만 준 항목"은 GATE-E 의 일대일 대조가 따로 맡는다.

**DD25 — 정규 절 *순서*를 실제로 본다. 존재와 개수는 순서를 함의하지 않는다.**

GATE-C 는 일곱 이름의 존재와 개수 7을 확인했다. 순서가 뒤바뀐 산출물은 그 둘을 모두 통과한다(6차 패널 test MEDIUM). DD3 이 요구하는 것은 "4.1.1 정규 **순서**"이므로 검사가 요구와 어긋나 있었다.

최상위 `## ` 헤더를 순서대로 읽어 정규 이름으로 환원하고 기대 순서와 대조한다. 하위 헤더는 보지 않는다 — 절 안의 구성이지 정규 순서의 대상이 아니다. 죽으면 처방은 개수 검사와 같다: `reference/document.md` 를 다시 읽고 DD3 을 갱신하는 것이며, 판본이 순서를 바꿨다는 신호다.

**DD26 — 대리 판정에 통과 조건과 기록 자리를 준다. 오라클을 만들 수는 없고, 기준 없는 판정을 남겨 둘 이유도 없다.**

Acceptance 의 대리 판정은 "두 물음에 문서가 답하지 못하면 M1 은 미완이다"로 끝났다. 6차 패널 test 가 "판정 방법이 명시되지 않았다"고 짚었고 지적이 옳다 — **이진 판정인데 무엇이 통과인지가 적혀 있지 않았다.** 작성자와 판정자가 같은 사람인 마일스톤에서(Risks 표) 기준 없는 이진 판정은 사실상 자동 통과다.

**오라클은 만들지 않는다.** "이 문서로 M3 의 결정을 내릴 수 있는가"는 논증의 충분성에 대한 물음이고, 셸 스크립트가 판정할 수 있는 종류가 아니다. `gate-final` 의 두 grep(`대비.*재측정` · `부하.*(형태|테두리|패턴|축)`)은 **그 논증이 그 자리에 있기는 한지**만 본다. 그 이상을 하는 척하면 DD20 이 고친 결함 — 게이트가 잡는다고 적힌 것을 안 잡는 것 — 을 다시 만든다.

대신 둘을 준다.

- **통과 조건(rubric).** 첫째 물음의 답은 *값*이 아니라 *절차*여야 하며, `PRODUCT.md` 의 대비 실측 표가 쓰는 축 셋 — 무엇을 무슨 배경 위에 렌더해 재는가 · 어떤 값을 읽는가 · 어떤 기준과 대조하는가 — 을 이름으로 갖춰야 한다. 둘째 물음의 답은 **알파도 hue 도 아닌 축**을 하나 지목해야 한다(둘은 각각 중요도와 accent 가 이미 쓰고 있다). 축을 못 고르고 "형태로 가른다"까지만 적혀 있으면 그것은 답이 아니라 물음의 반복이다.
- **기록 자리.** 판정 결과는 PRD 의 "M1의 산출물을 무엇으로 판정하는가" Open Question 해소 줄에 적는다. **그 줄의 존재는 DD20 이 이미 기계로 요구한다** — 즉 판정을 안 하고 넘어가면 `gate-final` 이 죽는다. 게이트가 보증하는 것은 "판정이 기록됐다"이고 "판정이 옳다"는 여전히 리뷰이지만, 기록되지 않은 판정과 기록된 판정은 감사 가능성에서 다르다(DD15 가 태그에 대해 같은 구분을 썼다).

**남는 것을 정확히 적는다.** 작성자가 자기 rubric 을 느슨하게 적용하는 것은 막지 못한다. 막는 것은 rubric 없이 판정했다고 말하는 것과, 판정 자체를 건너뛰는 것 둘이다.

## Files to Change

| File | Action | Why |
|---|---|---|
| `.claude/plans/work-calendar-m1.verify.sh` | CREATE | 다섯 게이트(A·B·C·D·E)와 gate-final 을 담은 실행 가능한 판정 스크립트. 이 플랜의 유일한 합격 판정자 |
| `.claude/plans/work-calendar-m1.answers.md` | CREATE | 인터뷰 답안지와 각 답의 `must-contain` 검사 기준(DD8). 관측된 impeccable 버전도 여기 기록한다. verify.sh 와 같은 커밋에 들어간다 |
| `PRODUCT.calendar.md` | CREATE | 캘린더 모드(업무용) 제품 문서. staging 의 `/impeccable init` 산출물을 이 이름으로 옮긴 것 |
| `DESIGN.calendar.md` | CREATE | 캘린더 모드 시각 문서. staging 의 `/impeccable document --seed` 산출물 |
| `PRODUCT.md` | UPDATE | `118-122` "이 문서의 범위" 절을 위임 선언으로 교체하고, `108`의 `brightness` 수치를 절 이름 참조로 바꾸며(DD12), 절마다 태그를 단다 |
| `DESIGN.md` | UPDATE | `172` 범위 문장 정정(DD6), `174` 택일 사실 유지, 절마다 태그 |
| `.claude/prds/work-calendar.prd.md` | UPDATE | Delivery Milestones M1 행. 완료 시 Open Question 2건 해소 표기(`gate-final` 이 DD20 으로 실제 검사한다)와 게이트 실행 기록 |
| `.gitattributes` | CREATE | `*.verify.sh text eol=lf` 한 줄. `core.autocrlf=true` 인 저장소에서 판정 스크립트가 CRLF 로 체크아웃돼 bash 가 죽는 것을 막는다(DD22). 저장소에 이 파일이 아직 없다 |
| `.gitignore` | UPDATE | 관리 블록 **밖에** 세 줄(`.claude/plans/.m1-baseline.sha256` · `.claude/plans/.m1-criteria.sha256` · `.claude/plans/.m1-gates.log`). Task 0 이 더한다. 9차 패널 security 가 "Task 0 이 요구하는데 이 표에 없다"고 짚은 자리다 — 표에 없으면 실행자가 빠뜨리고, 빠뜨리면 아래 세 지문 파일이 커밋될 수 있다 |

**이 표에 없는 것이 이 마일스톤의 절반이다.** 확장 코드 파일(`newtab.js`, `newtab.css`, `newtab.html`, `manifest.json`)과 `fonts/`·`images/`·`test/`·`.impeccable/` 은 한 줄도 바뀌지 않는다(UI8). GATE-A가 착수 **전에** 베이스라인을 뜨고, GATE-D가 생성 직후에 그것과 대조한다. 이 표 밖에 있는 것이 넷이고, **저장소 밖에 있는 것은 그중 하나뿐이다.** 9차 패널 security 가 이 문장을 "베이스라인이 저장소 밖이라고 적어 놓고 `.claude/plans/` 안에 만든다"로 읽었고, 그렇게 읽히도록 쓴 것이 잘못이므로 나눠 적는다.

- **저장소 밖**: staging 디렉터리 `${TMPDIR}/work-calendar-m1-stage` 하나. 그것이 DD2 의 요점이다.
- **저장소 안이되 추적하지 않는 작업 중 산물 셋**: `.claude/plans/.m1-baseline.sha256`(GATE-A 가 뜨고 GATE-D 가 대조) · `.claude/plans/.m1-criteria.sha256`(DD14 의 판정 기준 지문) · `.claude/plans/.m1-gates.log`(DD17 의 게이트 원장). 셋 다 게이트 사이에만 존재하고 `gate-final` 이 함께 지우며, Task 0 이 `.gitignore` 에 등재해 커밋을 막는다. **저장소 안에 두는 것이 설계다** — 게이트가 `$ROOT` 를 기준으로 상대 경로로 읽고, 세 파일은 저장소의 상태에 대한 지문이라 그 상태와 같은 자리에 있어야 한다.

## Tasks

### Task 0: 착수 조건 확인 (GATE-A)
- **선행 조건(환경, 2026-08-22 실측)**: `~/.claude/skills/impeccable` 을 **지운다.** 폐지된 npm CLI 채널이 남긴 3.5.0 설치본이고, plugin 4.1.1과 공존하면 게이트가 검사한 판본과 인터뷰가 실행하는 판본이 갈린다(DD19). 지우지 않으면 GATE-A 가 첫 검사에서 죽으며, 실제로 그렇게 죽는 것을 확인했다(위 실측 기록). 이것은 저장소 밖 사용자 환경이므로 이 플랜의 Files to Change 표에 없고, `git` 으로 되돌릴 수 있는 종류도 아니다 — 지우기 전에 `~/.claude/plugins/installed_plugins.json` 에 `impeccable@…` 항목이 있는지 먼저 확인한다.
> **부트스트랩 역설은 없다 — 두 번 오독됐으므로 기전을 적어 둔다.** 6차 패널 test 와 8차 패널 invariant 가 각각 "GATE-A 가 `tracked "$ANSWERS"; tracked "$VERIFY"` 를 요구하는데 그 파일들이 없으니 논리적 불가능"이라고 CRITICAL 로 보고했다(invariant 는 같은 주장을 네 건으로 나눠 냈다). **`tracked()` 는 커밋이 아니라 인덱스를 본다** — `git ls-files --error-unmatch` 는 `git add` 된 미커밋 파일에 대해 성공한다. 그래서 이 Task 의 순서 **생성 → `git add` → `gate-a` 실행**은 그대로 성립하며, 커밋은 그 뒤 Task 7 에 온다(DD8). 실행해 확인했다: `git add` 전에는 실패하고 후에는 통과한다. 두 리뷰어가 읽은 것은 "플랜 검토 시점에 파일이 없다"이고, 그것은 이 Task 가 아직 수행되지 않았다는 사실이지 결함이 아니다.

- **Action**: 순서가 계약이다 — 이 Task는 `verify.sh`를 **쓰는 것으로 시작한다.** Files to Change 표는 그것을 CREATE로 적지만 만드는 시점은 여기이고, GATE-A가 그것을 실행하는 것은 파일이 존재한 뒤다(부트스트랩 순환은 없다). `.claude/plans/work-calendar-m1.verify.sh`는 아래 Validation 절의 `bash` 블록을 **한 글자도 바꾸지 않고 그대로** 옮긴 것이어야 한다 — GATE-A가 플랜에서 같은 블록을 뽑아 바이트 비교하므로, 옮기다 틀리거나 나중에 한쪽만 고치면 죽는다. `.claude/plans/work-calendar-m1.answers.md`도 함께 쓰고 **둘 다 `git add`** 하며, `.gitignore`에 `.claude/plans/.m1-baseline.sha256`·`.claude/plans/.m1-criteria.sha256`·`.claude/plans/.m1-gates.log` 세 줄을, `.gitattributes`에 `*.verify.sh text eol=lf` 한 줄을 더한다(DD22 — `core.autocrlf=true` 이므로 이 줄이 없으면 재체크아웃 시 `verify.sh` 가 CRLF 로 내려와 bash 가 죽는다). 답안지 형식은 아래 **답안지 형식** 절이 정한다 — 게이트가 읽는 네 필드(`impeccable-version:`, `pinned-direction:`, `must-contain:`, `tag-map:`)가 그 형식의 계약이다. **`tag-map` 은 여기서 확정한다**(DD15): 아래 (6)이 답안지를 지문으로 동결하므로 Task 6에서 덧붙일 수 없고, 태그를 붙이기 전에 기대값이 적혀 있어야 GATE-E의 대조가 의미를 갖는다. 초안 14행이 답안지 형식 절에 있고 그중 다투는 넷은 표로 따로 적어 뒀다 — 붙여 넣기 전에 그 넷을 확인한다. 그다음 `bash .claude/plans/work-calendar-m1.verify.sh gate-a`를 실행한다. 이 게이트는 (1) 코드 무변경과 문서 베이스라인을 **착수 전에** 확보하고 (2) impeccable 스킬 파일의 존재와 `SKILL.md`의 `version`이 답안지에 기록된 값과 같은지 대조하며 (3) `reference/document.md`가 지금도 seed 계약 셋을 문장으로 약속하는지 **내용을** 확인하고 (4) 답안지와 `verify.sh`가 git 추적 대상인지 보며 (5) 답안지가 두 인터뷰의 답 절과 Brand Commitments 답을 실제로 담았는지 확인하고 (6) 그 두 파일의 내용 지문을 `.m1-criteria.sha256`에 남긴다(DD14). 여섯째가 이후 모든 게이트의 첫 줄인 `criteria_unchanged`와 짝을 이룬다 — 판정 기준은 한 번의 실행 안에서 움직이지 않는다.
- **Mirror**: `test/positioning.smoke.js:234` — 판정을 산문이 아니라 실행되는 코드로 둔다
- **Validate**: `gate-a`가 종료 코드 0. 0이 아니면 **Task 1을 시작하지 않는다**. 버전 불일치는 실패다 — 스킬이 올라갔다면 `reference/init.md`와 `reference/document.md`를 다시 읽고 DD1·DD3·DD13을 갱신한 뒤 답안지의 버전을 올린다. 이 플랜 자체가 그 실패를 한 번 겪고 고쳐진 결과다(3.5.0에서 4.1.1로)

### Task 1: staging 확보 (GATE-B)
- **Action**: `STAGE="${TMPDIR:-/tmp}/work-calendar-m1-stage"` 를 비우고 새로 만든다. `bash .claude/plans/work-calendar-m1.verify.sh gate-b`를 실행한다 — `STAGE`가 저장소 루트 밖인지, 비어 있는지, 그리고 그 자리에서 `context.mjs`가 `PRODUCT_INIT_REQUIRED`를 내는지의 **양성 프로브** 셋을 본다.
- **Mirror**: `.claude/plans/calendar-widget-v2.plan.md` 의 Task 0 — 생성 앞에 조건을 먼저 세운다
- **Validate**: `gate-b`가 종료 코드 0. 0이 아니면 생성을 **시작하지 않는다**. 프로브가 기존 구현을 언급하면 `STAGE`가 저장소 안이거나 상위 탐지가 저장소를 집은 것이므로 경로를 고쳐 다시 돈다

### Task 2: `PRODUCT.calendar.md` 생성
- **Action**: cwd를 `$STAGE`로 두고 `/impeccable init`을 실행한다. 인터뷰에는 답안지 항목을 그대로 붙여 넣되, `## Brand Commitments`에 DD13의 상속 선언을 반드시 넣는다. 산출된 `$STAGE/PRODUCT.md`를 저장소 루트의 `PRODUCT.calendar.md`로 **옮긴다**.
- **Mirror**: `PRODUCT.md`의 절 구성과 담백한 한국어 어조. 다만 절 이름은 4.1.1가 쓰는 것을 따르고 3.x의 `## Register`를 흉내내지 않는다(DD1)
- **Validate**: `PRODUCT.calendar.md`가 루트에 있고 `$STAGE/PRODUCT.md`가 사라졌다. 정식 판정은 GATE-C·GATE-D가 한다

### Task 3: `DESIGN.calendar.md` 생성과 산출물 검사 (GATE-C)
- **Action**: cwd를 `$STAGE`로 둔 채 — `PRODUCT.calendar.md`를 `$STAGE/PRODUCT.md`로 되돌려 두고(생성기가 제품 진실을 봐야 하고, 4.1.1의 seed Step 1 은 `PRODUCT.md` 를 **전제 조건**으로 요구한다) — `/impeccable document --seed`를 실행한다(DD3). **이 호출은 다섯 질문 인터뷰가 아니라 new-work 의 world workshop 으로 들어간다**(DD18) — 일곱 후보 도출, `concept-seed.mjs` 주사위, 결정 페이지에서의 카드 잠금 순서다. 답안지의 `pinned-direction:` 을 pinned direction 으로 선언하고 그것을 잠근다. 주사위가 딜한 것을 고르지 않는다. 산출된 `$STAGE/DESIGN.md`를 루트의 `DESIGN.calendar.md`로 옮기며 `$STAGE/PRODUCT.md`도 다시 `PRODUCT.calendar.md`로 옮긴다. **두 파일을 `git add` 한다** — staging 에서 `mv` 로 온 파일은 untracked 로 태어나고, 그대로 두면 Task 7의 커밋이 이 마일스톤의 산출물 자체를 빠뜨려도 게이트가 0을 낸다(5차 패널 invariant HIGH). `gate-final` 이 `tracked()` 로 확인한다. 그다음 `bash .claude/plans/work-calendar-m1.verify.sh gate-c`를 실행한다.
- **Mirror**: `DESIGN.md:357`의 Named Rule 관용구. 절 순서는 4.1.1 정규 순서에서 Components를 뺀 7절
- **Validate**: `gate-c`가 종료 코드 0. 게이트가 보는 것은 일곱이다 — 두 산출물 존재, seed 마커, 정규 7절 헤더, Components 절 부재, `PRODUCT.calendar.md`의 `## Brand Commitments` 존재와 그 안의 `DESIGN.md` 절 이름 참조(DD13), `DESIGN.calendar.md`의 절 이름 역참조, 답안지 `must-contain` 항목 전건 적중, Named Rule 형식

### Task 4: 저장소 무변경 증명 (GATE-D)
- **Action**: `bash .claude/plans/work-calendar-m1.verify.sh gate-d`를 실행한다.
- **Mirror**: `newtab.js:1325` `persistEvents()`의 정신 — 성공을 확인한 뒤에만 커밋한다
- **Validate**: `gate-d`가 종료 코드 0. `PRODUCT.md`·`DESIGN.md`·`.impeccable/design.json`의 sha256이 GATE-A 베이스라인과 바이트 단위로 동일하고, 코드 무변경이 여전히 참이며, `$STAGE`에 문서가 남아 있지 않아야 한다. 0이 아니면 **Task 5를 시작하지 않는다** — Task 5는 이 두 파일을 의도적으로 편집하므로, 검증되지 않은 상태 위에 편집을 얹으면 무엇이 원본이었는지 잃는다

### Task 5: 네 문서의 상호 참조 부착
- **Action**: `PRODUCT.md:118-122`를 "판단 범위 밖"에서 "별도 문서로 위임 + `PRODUCT.calendar.md` 링크"로 바꾸고, `108`의 `brightness` 수치를 절 이름 참조로 바꾼다(DD12). `DESIGN.md:172`를 DD6대로 정정하고 `DESIGN.calendar.md`를 가리킨다. 두 캘린더 문서에서 root 문서를 **절 이름으로** 역참조한다. `174`의 "메인 위젯은 시계와 달력 중 택일" 문장은 네 문서 모두에 남긴다(UI10).
- **Mirror**: `PRODUCT.md:108`의 절 이름 참조 방식 — DD12가 그 줄을 먼저 고친 뒤에야 선례로 성립한다
- **Validate**: **이 Task 에는 자기 게이트가 없고, 그것이 설계다(DD11).** Task 5 가 만지는 네 파일은 전부 추적되고 직전 GATE-D 가 깨끗함을 증명했으므로 `git checkout -- <파일>` 이 항상 완전 복구다. 되돌릴 수 있는 단계 앞에는 게이트를 세우지 않으며, 여기에 중간 게이트를 세우면 `gate-final` 의 부분집합이 되어 같은 검사를 두 자리에서 유지하게 된다.

  Task 5 의 편집을 실제로 판정하는 것은 **Task 7 의 `gate-final`** 이다 — 4방향 링크 존재, 캘린더 문서의 역참조가 파일명 단독이 아니라 절 이름을 동반하는지, **원본 두 문서의 자기 참조가 실재 절에 닿는지**(DD12 의 `Glass` 정정이 여기서 판정된다), `PRODUCT.md` 에서 brightness 수치가 빠지고 그 자리에 절 이름 참조가 들어왔는지를 전부 본다.

  **여기서 `gate-final` 을 미리 돌리지 마라.** 그것은 Task 7 이 쓰는 PRD 기록 줄을 요구하므로 반드시 죽고, 그 실패는 Task 5 의 결함이 아니라 순서를 어긴 결과다. 직전 판은 이 자리에 "`gate-final`이 종료 코드 0"이라고만 적었고 5차 패널 invariant 가 그것을 "Task 5 에서 gate-final 을 돌려라"로 읽어 CRITICAL deadlock 을 보고했다. **deadlock 은 아니다** — Task 6 은 자기 게이트(gate-e)를 갖고 스크립트도 `gate-final` 을 "Task 7 이후"로 주석해 두었으므로 진행이 막히지 않는다. 그러나 **읽히는 대로가 계약**이고 그렇게 읽히도록 쓴 것이 잘못이므로 문장을 고친다

### Task 6: `[셸]`·`[시계]` 태그 부착 (GATE-E)
- **Action**: `PRODUCT.md`·`DESIGN.md`의 각 절 머리에 DD5의 경계로 `[셸]`(모드 무관) 또는 `[시계]`(시계 모드 고유) 태그를 단다.
- **Mirror**: `DESIGN.md:172`의 문서 내 표기 규약
- **Validate**: `bash .claude/plans/work-calendar-m1.verify.sh gate-e` 가 종료 코드 0. Task 7이 PRD를 건드리기 전에 태그 **누락과 정오**를 함께 잡는다(DD15) — 커버리지에 더해 각 절의 실제 태그가 답안지 `tag-map` 선언과 같은지를 대조한다. `gate-final`까지 미루면 세 Task의 편집을 되감아야 한다. 선언이 틀렸다고 판단되면 여기서 고치지 말고 GATE-A부터 다시 돌아라 — 답안지는 지문으로 동결돼 있어 지금 고치면 `criteria_unchanged`가 죽는다

### Task 7: PRD 갱신과 게이트 실행 기록
- **Action**: Delivery Milestones M1 행을 `complete`로 바꾸고, Open Questions 중 "캘린더 모드 제품 문서를 만드는 절차"(DD1~DD3·DD10·DD13으로 해소)와 "M1의 산출물을 무엇으로 판정하는가"(DD7로 해소)를 해소 표기한다. **어느 게이트가 어느 플랜 판본에서 통과했는지를 함께 적는다** — PRD의 M1 행 아래에 아래 형태의 줄 하나를 더한다. 형태가 계약이다: `gate-final`이 `^[-*] … gate 실행 기록 … <16자>` 로 물리므로, 해시만 문서 어딘가에 있어서는 통과하지 않는다.

  ```
  - gate 실행 기록: 2026-MM-DD · gate-a,b,c,d,e,final · plan sha256 <sha256sum .claude/plans/work-calendar-m1.plan.md | cut -c1-16 의 출력> · criteria sha256 <sha256sum .claude/plans/.m1-criteria.sha256 | cut -c1-16 의 출력>
  ```

  `criteria sha256` 은 DD14 보강이다. 지문 파일 자체는 `.gitignore` 대상이라 답안지를 느슨하게 고치고 GATE-A 부터 다시 도는 경로가 diff 에 아무 흔적도 남기지 않았다 — 5차 패널 architect HIGH. 지문 16자를 **커밋되는 이 줄에** 실으면 기준이 바뀔 때마다 이 줄을 고쳐야 하고, 그 편집은 리뷰에 보인다. `gate-final` 이 현재 지문과 대조하므로 옛 값을 남겨 둘 수도 없다. 재실행을 **막는** 것이 아니라 **보이게** 만드는 장치다.

- **Mirror**: 조사 노트의 `- [x] ~~...~~ **해소(날짜)** — 근거` 표기
- **Validate**: `gate-final`이 종료 코드 0. **0을 받은 뒤에만 커밋한다** — 이 마일스톤에 CI도 커밋 훅도 없으므로 게이트와 커밋 사이를 잇는 것은 이 문장 하나뿐이고, 그 사실을 숨기지 않고 적어 둔다(3차 패널 invariant 지적). `gate-final`은 두 Open Question 항목이 `[x]`이고 각각 해소 근거 한 줄을 가지는지, 그리고 게이트 기록 줄이 이 플랜의 현재 sha256을 담는지를 본다. 플랜을 다시 고치면 해시가 달라지므로 이 줄도 다시 써야 한다 — 그것이 이 앵커의 목적이다

## Validation

판정은 아래 스크립트 하나이며, Task 순서는 게이트 호출로 강제된다. 각 게이트는 `set -euo pipefail` 아래에서 실행되고 첫 실패에서 죽는다. **어떤 게이트도 통과 없이 다음 Task로 넘어가지 않는다.**

```bash
# .claude/plans/work-calendar-m1.verify.sh — 이 플랜의 유일한 합격 판정자.
# 사용법: bash .claude/plans/work-calendar-m1.verify.sh <gate-a|gate-b|gate-c|gate-d|gate-e|gate-final>
set -euo pipefail

# ROOT 를 pwd 형태로 정규화한다. `git rev-parse --show-toplevel` 은 Git Bash 에서
# Windows 형(`C:/...`)을 내고 `pwd` 는 POSIX 형(`/c/...`)을 내므로, 정규화 없이
# 문자열을 비교하면 GATE-B 의 "STAGE 가 저장소 안인가" 가드가 조용히 통과한다.
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"; ROOT="$(pwd)"
STAGE_BASE="${TMPDIR:-/tmp}"                        # GATE-B가 존재를 확인한다 — /tmp 가 없는 셸이 있다
STAGE="$STAGE_BASE/work-calendar-m1-stage"          # DD2 — 저장소 밖. 한 번만 정의한다
BASELINE=".claude/plans/.m1-baseline.sha256"        # GATE-A가 뜨고 GATE-D가 대조한다
CRITERIA=".claude/plans/.m1-criteria.sha256"        # DD14 — GATE-A가 판정 기준 두 파일을 고정하고 이후 모든 게이트가 대조한다
GATELOG=".claude/plans/.m1-gates.log"               # DD17 — 어느 게이트가 이번 실행에서 통과했는지의 원장. gate-final이 전건을 요구한다
CAL_PRODUCT="${CAL_PRODUCT:-PRODUCT.calendar.md}"   # DD10 — M3는 이 둘만 덮어 같은 게이트를 재사용한다
CAL_DESIGN="${CAL_DESIGN:-DESIGN.calendar.md}"
ANSWERS=".claude/plans/work-calendar-m1.answers.md"
VERIFY=".claude/plans/work-calendar-m1.verify.sh"
PLANFILE=".claude/plans/work-calendar-m1.plan.md"
PRDFILE=".claude/prds/work-calendar.prd.md"
LEGACY_SKILL="$HOME/.claude/skills/impeccable"   # DD19 — 폐지된 npm CLI 채널이 쓰던 자리. 공존은 실패다
# DD19 — plugin 경로는 버전을 품으므로 하드코딩하지 않는다. 하드코딩하면 판본 고정이
# 답안지와 경로 두 곳에 생기고, 업데이트마다 "파일이 없다"로 죽어 설계된 "버전 불일치"
# 진단을 덮는다. `installed_plugins.json` 에서 `impeccable@<marketplace>` 를 접두어로
# 찾는다 — 어느 marketplace 에서 왔는지는 이 게이트가 알 필요 없는 사실이다.
# node 는 이미 GATE-B 의 양성 프로브가 요구하므로 새 의존이 아니다.
#
# **후보를 전부 내고 GATE-A 가 하나임을 요구한다.** 여러 marketplace 가 같은 이름의
# 플러그인을 제공하면 "첫 번째"를 고르는 것은 조용한 선택이고, 그 선택이 틀리면
# DD19 가 막으려는 바로 그 상태 — 게이트가 검사한 파일과 실행되는 파일이 다른 상태 —
# 가 된다. 모호하면 죽는 편이 낫다.
#
# 최상위 `return` 은 `node -e` 에서 문법 오류다(Illegal return statement). 실제로 그렇게
# 적었다가 조용히 빈 값을 내는 것을 실행해서 발견했으므로, 함수로 감싸 둔다. try 가
# 감싸는 것은 실행 오류이지 파싱 오류가 아니고, stderr 를 죽여 두면 그 차이가 보이지
# 않는다 — 읽어서는 나오지 않고 돌려야만 나오는 결함이었다.
SKILL_CANDIDATES="$(node -e '
  var fs = require("fs"), path = require("path"), os = require("os");
  function candidates() {
    var f = path.join(os.homedir(), ".claude", "plugins", "installed_plugins.json");
    var plugins = (JSON.parse(fs.readFileSync(f, "utf8")) || {}).plugins || {};
    var out = [];
    Object.keys(plugins).sort().forEach(function (k) {
      if (k.indexOf("impeccable@") !== 0) return;
      (plugins[k] || []).forEach(function (e) {
        if (e && e.installPath) out.push(path.join(e.installPath, "skills", "impeccable"));
      });
    });
    return out;
  }
  try { process.stdout.write(candidates().join("\n")); } catch (_e) { /* 빈 값 → GATE-A 가 진단한다 */ }
' 2>/dev/null || true)"
SKILL="$(printf '%s\n' "$SKILL_CANDIDATES" | grep . | head -1 || true)"
DOC="$SKILL/reference/document.md"
CODE_PATHS="newtab.js newtab.css newtab.html manifest.json fonts images test"
BASE_PATHS="PRODUCT.md DESIGN.md .impeccable/design.json"   # 생성 중 절대 안 바뀌어야 하는 것
# CAL_* 는 M3가 덮는 값이다. 경로가 아니라 저장소 루트의 파일명이어야 한다 —
# 디렉터리 성분이 섞이면 게이트가 의도치 않은 파일을 읽는다.
case "$CAL_PRODUCT$CAL_DESIGN" in */*|*..*) echo "[GATE-FAIL] CAL_PRODUCT/CAL_DESIGN 는 루트 파일명이어야 한다" 1>&2; exit 1 ;; esac
die() { echo "[GATE-FAIL] $*" 1>&2; exit 1; }
# DD17 — 게이트 순서는 지금까지 **규율**이었지 기계가 아니었다. gate-final 은 최종
# 상태만 보므로 GATE-B·C·D·E 를 건너뛰고 바로 불러도 상태가 맞으면 0을 낸다
# (5차 패널 invariant HIGH). 각 게이트가 통과 시점에 자기 이름을 원장에 남기고
# gate-final 이 전건을 요구하면 그 창이 닫힌다. 원장은 GATE-A 가 새로 만들고
# gate-final 이 지우므로 **한 번의 실행에만** 유효하다 — 옛 실행의 통과를 재사용할 수 없다.
mark_gate() { echo "$1" >> "$GATELOG"; }

code_unchanged() {                          # 두 축 중 "차이" 축 (README.md:250)
  [ -z "$(git diff --stat -- $CODE_PATHS)" ] || die "코드가 바뀌었다 — M1의 전제(UI8)가 깨졌다"
}
tracked() { git ls-files --error-unmatch "$1" >/dev/null 2>&1 || die "$1 이 git 추적 대상이 아니다"; }
# DD14 — 게이트는 실행 중에 자기 판정 기준을 갈아 끼울 수 없어야 한다. 답안지와 이
# 스크립트는 **작업 트리에서** 읽히므로, PRODUCT.md·DESIGN.md 에 거는 "HEAD 와 일치하는가"
# 검사가 여기서는 성립하지 않는다 — 둘 다 Task 0 이 새로 만들고 커밋은 그 뒤에 오므로
# HEAD 대조는 착수 첫 실행에서 반드시 죽는다. 대신 GATE-A 가 내용 지문을 남기고 이후
# 게이트가 그것과 대조한다. 3차 패널 security HIGH 2건의 흡수다.
criteria_unchanged() {
  [ -f "$CRITERIA" ] || die "판정 기준 지문이 없다 ($CRITERIA) — GATE-A 를 돌지 않았다"
  sha256sum -c --status "$CRITERIA" \
    || die "GATE-A 이후 판정 기준 파일이 바뀌었다 ($ANSWERS 또는 $VERIFY). must-contain 목록·버전 고정값·게이트 단언은 실행 중에 느슨해질 수 없다 — 편집이 의도한 것이면 GATE-A 부터 다시 돌려라"
}
# DD1-1 이 적어 둔 사실을 이 함수가 쓰지 않고 있었다 — `context.mjs` 의 `PRODUCT_NAMES`/
# `DESIGN_NAMES` 는 대문자·머리글자·소문자 **여섯**을 인식하는데 여기서는 대문자 둘만
# 봤다. staging 에 `product.md` 가 남아 있으면 "깨끗하다"고 판정한 뒤 로더가 그것을
# 집는다. 플랜이 자기 근거 문단에 적어 둔 목록을 자기 검사에 쓰지 않던 자리다
# (5차 패널 security MEDIUM).
# **cwd 만 보는 것으로는 부족하다는 것이 이번 재접지의 발견이다.** `resolveContextDir` 는
# cwd → `FALLBACK_DIRS`(`.agents/context`·`docs`, 47행) → `IMPECCABLE_CONTEXT_DIR`(245행)
# 순으로 내려가므로, `$STAGE/docs/PRODUCT.md` 하나가 남아 있으면 이 함수가 "깨끗하다"고
# 답한 뒤 로더가 그것을 집는다. DD1-1 이 세 자리를 전부 적어 두고 검사는 첫 자리만 봤다 —
# 5차 패널 security MEDIUM 이 여섯 이름에 대해 지적한 것과 **같은 종류의 누락**이 한 층
# 위에 남아 있었다. 환경변수 자리는 여기서 볼 수 없으므로 GATE-B 가 따로 거부한다.
stage_is_clean_of_docs() {
  for dir in "$STAGE" "$STAGE/.agents/context" "$STAGE/docs"; do
    [ -d "$dir" ] || continue
    for base in PRODUCT Product product DESIGN Design design; do
      [ ! -f "$dir/$base.md" ] \
        || die "staging 에 문서가 남아 있다: ${dir#$STAGE/}/$base.md — 산출물을 루트로 옮기지 않았거나, 로더가 집을 수 있는 이름의 파일이 남아 있다 (DD1-1 의 여섯 이름 × 세 자리)"
    done
  done
}
# 캘린더 문서의 `… 절` 역참조가 **실재하는** 절을 가리키는가. 3차 패널 test 관점의
# CRITICAL 흡수 — 이전 판은 `DESIGN.md … 절` 이라는 문자열의 존재만 봤으므로
# `DESIGN.md 의 비존재섹션 절` 이 그대로 통과했다. 참조가 아무 데도 닿지 않으면
# 그것은 참조가 아니라 참조처럼 생긴 문장이고, UI5 를 만족하지 않는다.
# 참조 문자열에서 백틱 코드 스팬을 벗겨낸다. 5차 패널이 연 자리에서 찾은 fail-open 의
# 수리다 — 그 패널은 `PRODUCT.md:108` 이 실재하지 않는 `Glass` 절을 가리킨다는 것을
# CRITICAL 로 짚었는데, 확인해 보니 **그 참조는 refs_resolve 를 통과하고 있었다.**
# 통과시킨 것은 `Glass` 가 아니라 같은 줄에 복사돼 있던 값 `brightness(0.60)` 이다 —
# `brightness` 는 Named Rule 이름이고 앞뒤가 백틱과 여는 괄호라 낱말 경계 검사를
# 그대로 넘겼다. 즉 4차 라운드에 창을 80자로 넓힌 대가로, 창 안의 **무관한 텍스트가
# 절 이름을 공급하는** 경로가 열려 있었다. 낱말 경계는 이름의 모양만 좁히지 이름이
# 참조 위치에 있는지를 좁히지 않는다.
#
# 코드 스팬을 벗기면 값이 공급하던 이름이 사라지고, DD4 가 정한 두 형태
# (`DESIGN.md의 Elevation 절` · `DESIGN.md` 4절 The brightness Rule)는 둘 다 살아남는다.
# 세 단계인 이유가 있다: 추출 창이 파일명에서 시작하므로 `` `DESIGN.md` `` 의 닫는
# 백틱이 창 머리에 고아로 남고, 그것을 먼저 떼지 않으면 3단계가 참조 전체를 날린다.
#
# **형태 계약이 하나 생긴다 — 절 이름은 평문으로 적는다.** 이름을 코드 스팬 안에 넣으면
# 여기서 벗겨져 참조가 죽는다. 방향이 fail-closed 이므로 감수한다(놓치는 것보다 낫다).
strip_code_spans() { sed -E 's/^([A-Za-z]+\.md)`/\1/; s/`[^`]*`/ /g; s/`.*$/ /'; }

refs_resolve() {                            # $1 = 작업용 임시 디렉터리, $2.. = 검사 대상(생략 시 캘린더 두 문서)
  local W="$1"; shift
  local TARGETS=("$@")
  [ "${#TARGETS[@]}" -gt 0 ] || TARGETS=("$CAL_PRODUCT" "$CAL_DESIGN")
  { grep -hoE '^#{2,4} .*' PRODUCT.md DESIGN.md \
      | sed -E 's/^#+ //; s/\[[^]]*\][[:space:]]*//g; s/^[0-9]+\.[[:space:]]*//; s/:.*$//; s/[[:space:]]+$//'
    grep -hoE '^\*\*The .+ Rule\.\*\*' DESIGN.md \
      | sed -E 's/^\*\*The //; s/ Rule\.\*\*$//'
  } | grep -E '.{3,}' | sort -u > "$W/sections"   # 2자 이하(`Do` 같은 하위 헤더)는 우연 일치를 만든다
  [ -s "$W/sections" ] || die "원본 두 문서에서 절 이름을 하나도 뽑지 못했다 — 검사가 무의미해진다"
  # DD21 — **절 번호를 실제로 대조한다.** DD4 는 "이름이 여러 번 나오면 절 번호를 반드시
  # 동반한다" 고 요구하고 그 모호함을 "형태 쪽에서 닫는다" 고 적었는데, 형태를 요구하는
  # 문장만 있고 **그 형태가 맞는지 보는 코드가 없었다**(6차 패널 architect HIGH 2건).
  # `### Named Rules` 는 DESIGN.md 에 셋이므로(:290 §2 · :327 §3 · :355 §4) 번호가 틀린
  # 참조는 이름만으로는 구분되지 않는다 — `DESIGN.md 2절 The brightness Rule` 이 통과했다.
  # 번호가 어느 절에 속하는지를 원본에서 뽑아 두고 아래에서 대조하면 그 창이 닫힌다.
  # 번호를 **안 쓴** 참조는 여기서 막지 않는다 — DD4 가 요구하는 것은 모호할 때의 번호이고,
  # 유일한 이름에 번호를 강제하면 멀쩡한 참조가 죽는다.
  awk '
    FNR == 1 { cur = "" }
    /^## [0-9]+\./ {
      n = $2; sub(/\..*$/, "", n)
      name = $0; sub(/^## [0-9]+\.[[:space:]]*/, "", name)
      sub(/:.*$/, "", name); gsub(/[[:space:]]+$/, "", name)
      if (length(name) >= 3) print n "|" name
      cur = n; next
    }
    /^#{3,4} / && cur != "" {
      name = $0; sub(/^#+[[:space:]]*/, "", name)
      sub(/\[[^]]*\][[:space:]]*/, "", name)
      sub(/:.*$/, "", name); gsub(/[[:space:]]+$/, "", name)
      if (length(name) >= 3) print cur "|" name
      next
    }
    /^\*\*The .+ Rule\.\*\*/ && cur != "" {
      name = $0; sub(/^\*\*The /, "", name); sub(/ Rule\.\*\*.*$/, "", name)
      if (length(name) >= 3) print cur "|" name
    }
  ' PRODUCT.md DESIGN.md | sort -u > "$W/sections-numbered"
  # 창을 `절` 뒤까지 넓힌다. 이전 판은 `…[^)]{0,60}절` 에서 끊었으므로, DD4 가 스스로
  # 규정한 형태(`DESIGN.md` 4절 The brightness Rule 을 그대로 따른다 — 번호가 먼저 오고
  # 이름이 뒤에 온다)에서 절 이름이 창 밖에 남았다. 즉 플랜이 정한 참조 형태가 플랜의
  # 게이트에서 죽었다. 창은 넓히되 통과 판정은 아래에서 좁힌다 — 넓힌 창이 값에서
  # 이름을 주워 오던 것이 위 strip_code_spans 가 막는 것이다.
  grep -ohE '(PRODUCT|DESIGN)\.md[^)]{0,80}' "${TARGETS[@]}" \
    | grep -F '절' | sort -u > "$W/refs"
  [ -s "$W/refs" ] || die "${TARGETS[*]} 에 절 이름 역참조가 하나도 없다 (UI5/DD4)"
  while read -r REF; do
    [ -z "$REF" ] && continue
    REF_TEXT=$(printf '%s' "$REF" | strip_code_spans)
    # 부분문자열이 아니라 **낱말 경계**로 맞춘다. `case … in *"$SEC"*)` 는 실재하는
    # `Overview` 로 실재하지 않는 `Overviewz` 를 통과시켰다 — 없는 절을 가리키는 참조가
    # 실재 절 이름을 접두사로 품기만 하면 열리는 fail-open 이다(3차 패널 invariant HIGH).
    # awk 의 index() 로 위치를 잡고 앞뒤 한 글자가 ASCII 영숫자가 아닌지 본다. 정규식이
    # 아니므로 절 이름에 든 메타문자(`Do's and Don'ts` 의 따옴표 등)를 이스케이프할
    # 필요가 없고, 한글 절 이름은 이웃이 영숫자가 아니므로 그대로 통과한다.
    # DD21 — 맞은 이름을 **전부** 낸다. 이전 판은 첫 적중에서 `exit` 하고 "1" 만 냈는데,
    # 그러면 아래 번호 대조가 "첫 번째로 맞은 이름"에만 걸려 같은 참조 안의 다른 이름이
    # 정답일 때 멀쩡한 참조를 죽인다. 존재 검사는 "하나라도 맞았는가", 번호 대조는
    # "맞은 것 중 하나가 그 번호에 속하는가" 이므로 둘 다 전체 목록을 필요로 한다.
    HITS=$(awk -v ref="$REF_TEXT" '
      { sec = $0; if (sec == "") next
        n = length(sec); start = 1
        while ((p = index(substr(ref, start), sec)) > 0) {
          pos = start + p - 1
          before = (pos == 1) ? "" : substr(ref, pos - 1, 1)
          after  = substr(ref, pos + n, 1)
          if (before !~ /[A-Za-z0-9]/ && after !~ /[A-Za-z0-9]/) { print sec; break }
          start = pos + 1
        }
      }' "$W/sections")
    [ -n "$HITS" ] || die "실재하지 않는 절을 가리키는 참조다: $REF (원본의 절 이름은 $W/sections 에 있다. 절 이름은 코드 스팬 밖 평문으로 적어야 한다)"
    # 참조가 `N절` 을 달고 있으면 맞은 이름 중 하나가 **실제로 N절에 속해야** 한다.
    # `|| true` 가 없으면 안 된다: 번호 없는 참조에서 grep 이 정당하게 0건을 내고,
    # `set -o pipefail` 아래에서 그 1이 대입문의 종료 코드가 되어 `set -e` 가 **메시지
    # 없이** 게이트를 죽인다. 실행해서 찾았다 — `DESIGN.md의 Elevation 절` 처럼 완전히
    # 정상인 참조가 빈 진단과 함께 판정자를 무너뜨렸다.
    REFNUM=$(printf '%s' "$REF_TEXT" | grep -oE '[0-9]+절' | head -1 | sed 's/절$//' || true)
    if [ -n "$REFNUM" ]; then
      NUMOK=""
      while read -r NAME; do
        [ -z "$NAME" ] && continue
        if grep -qxF "$REFNUM|$NAME" "$W/sections-numbered"; then NUMOK=1; break; fi
      done <<EOF_HITS
$HITS
EOF_HITS
      [ -n "$NUMOK" ] \
        || die "참조가 단 절 번호가 원본과 다르다: $REF — 맞은 이름($(printf '%s' "$HITS" | tr '\n' ' '))이 ${REFNUM}절에 속하지 않는다. 원본의 '번호|이름' 목록은 $W/sections-numbered 에 있다 (DD4/DD21). \`### Named Rules\` 처럼 이름이 여러 절에 나오는 경우가 이 검사가 존재하는 이유다"
    fi
  done < "$W/refs"
  # 명시적 성공. `while` 은 마지막으로 실행된 명령의 종료 코드를 물려주므로, 마지막
  # 참조가 번호를 안 달았으면 `[ -n "$REFNUM" ]` 의 거짓(1)이 그대로 함수의 반환값이
  # 되고 호출자의 `set -e` 가 조용히 죽는다. die 없이 죽는 게이트는 통과하지 못한
  # 것도 통과한 것도 아닌 상태이므로, 성공 경로를 문장으로 못박는다.
  return 0
}

case "${1:?gate name required}" in

gate-a)   # 착수 조건. Task 1보다 먼저 돈다.
  # DD19 — **환경 전제를 맨 앞에 둔다.** 아래 모든 검사가 "어느 impeccable 이 도는가"에
  # 의존하고, 답안지의 `impeccable-version:` 고정값 자체를 그것을 알기 전에는 쓸 수 없다.
  # 뒤에 두면 설치가 잘못된 사용자가 "답안지가 추적되지 않는다"는 무관한 진단을 먼저 받고
  # 답안지를 고치러 간다. 진단은 고칠 수 있는 것을 가리켜야 한다.
  #
  # 어느 설치본이 도는지가 통제되지 않으면 GATE-A 가 읽은 파일과 Task 2·3 이 실행하는
  # 스킬이 달라진다. 그것이 이 마일스톤에서 가능한 최악의 형태다: 게이트는 4.1.1 을
  # 검사하고 인터뷰는 3.5.0 이 받는다. 공존 자체를 실패로 처리한다.
  [ ! -e "$LEGACY_SKILL" ] \
    || die "폐지된 npm CLI 설치본이 남아 있다 ($LEGACY_SKILL) — plugin 과 공존하면 같은 이름의 skill 이 둘이고, 게이트가 검사한 판본과 실제로 도는 판본이 달라진다. 그 디렉터리를 지우고 다시 돌려라 (DD19)"
  [ -n "$SKILL" ] \
    || die "impeccable plugin 설치를 찾지 못했다 — ~/.claude/plugins/installed_plugins.json 에 'impeccable@…' 키가 없다. marketplace 를 추가하고 plugin 을 설치한 뒤 **새 세션에서** 다시 돌려라 (스킬 레지스트리는 세션 시작 시 만들어진다). (DD19)"
  NSKILL=$(printf '%s\n' "$SKILL_CANDIDATES" | grep -c . || true)
  [ "${NSKILL:-0}" = "1" ] \
    || die "impeccable plugin 설치가 $NSKILL 개다 — 어느 것이 도는지 이 게이트가 정할 수 없고, 조용히 첫 번째를 고르면 DD19 가 막으려는 상태(검사한 파일 ≠ 실행되는 파일)가 된다. 하나만 남기고 다시 돌려라: $(printf '%s' "$SKILL_CANDIDATES" | tr '\n' ' ')"
  [ -d "$SKILL" ] \
    || die "installed_plugins.json 이 가리키는 경로에 스킬이 없다 ($SKILL) — 설치가 깨졌거나 캐시가 정리됐다 (DD19)"
  [ -f "$SKILL/scripts/context.mjs" ] || die "impeccable context.mjs가 없다 — DD1의 전제가 성립하지 않는다"
  [ -f "$SKILL/reference/init.md" ] && [ -f "$DOC" ] || die "impeccable reference 문서가 없다"
  [ -f "$SKILL/reference/new-work.md" ] \
    || die "reference/new-work.md 가 없다 — 4.1.1의 seed 는 이 문서의 world workshop 으로 라우팅되므로(DD18) 그것이 없으면 Task 3 의 절차가 성립하지 않는다"
  # DD22 — 이 스크립트가 쓰는 외부 도구를 착수 시점에 확인한다. 없으면 게이트가
  # **중간에** 죽고, 그 실패는 "판정 기준이 틀렸다"처럼 보이지만 실제로는 환경이다.
  # `sha256sum` 은 특히 갈린다(macOS 는 `shasum`). 여기서 죽는 편이 GATE-D 에서
  # 베이스라인 대조가 죽는 것보다 싸다 (DD11).
  for T in sha256sum mktemp comm awk sed grep diff; do
    command -v "$T" >/dev/null 2>&1 || die "필요한 도구가 없다: $T — 이 스크립트는 POSIX 셸 도구를 전제한다. Windows 에서는 Git Bash 로 실행한다 (DD22)"
  done
  # DD22 — **CR 이 이 스크립트를 죽인다.** 이 저장소는 `core.autocrlf=true` 이고
  # `.gitattributes` 가 없으므로, 커밋 뒤 다시 체크아웃하면 `verify.sh` 가 CRLF 로 내려온다.
  # 그러면 `bash` 가 `$'\r': command not found` 로 죽고, 더 나쁘게는 GATE-A 의 바이트 비교가
  # 먼저 죽어 "옮겨 적다 틀렸다"는 **틀린 진단**을 낸다. Task 0 이 `.gitattributes` 에
  # `*.verify.sh text eol=lf` 를 더해 원인을 막고, 이 검사가 증상을 이름으로 잡는다.
  ! grep -qU $'\r' "$VERIFY" 2>/dev/null \
    || die "$VERIFY 에 CR(캐리지 리턴)이 있다 — core.autocrlf=true 체크아웃의 결과이며 bash 가 이 파일을 실행하지 못한다. .gitattributes 에 '*.verify.sh text eol=lf' 를 더하고 \`git rm --cached\` 후 다시 받아라 (DD22)"
  code_unchanged
  [ -z "$(git status --porcelain -- $CODE_PATHS)" ] || die "코드 경로에 미커밋 변경이 있다"
  for f in PRODUCT.md DESIGN.md; do
    [ -f "$f" ] || die "$f 가 없다"
    tracked "$f"
    # 추적만으로는 부족하다. `gate-final` 이 `git show HEAD:$f` 로 원본 토큰을 뽑으므로
    # 스테이징만 되고 커밋되지 않은 편집은 그 시점에 조용히 무시된다 — 3차 패널
    # architect 지적. 착수 시점에 HEAD 와 일치할 것을 요구해 그 창을 닫는다.
    [ -z "$(git status --porcelain -- "$f")" ] \
      || die "$f 에 미커밋 변경이 있다 — gate-final 은 HEAD 판본으로 토큰을 뽑으므로 이 편집을 보지 못한다. 커밋하거나 되돌린 뒤 다시 돌려라"
    git cat-file -e "HEAD:$f" 2>/dev/null \
      || die "$f 가 HEAD 에 없다 — gate-final 의 \`git show HEAD:$f\` 가 실패한다"
  done
  # DD8 — 판정 기준을 담은 두 파일이 추적 대상이어야 한다. 추적되지 않는 파일이
  # 게이트의 느슨함(버전 고정값·must-contain 목록)을 조용히 정해서는 안 된다.
  tracked "$ANSWERS"; tracked "$VERIFY"
  OBSERVED=$(sed -n 's/^version:[[:space:]]*//p' "$SKILL/SKILL.md" | head -1)
  PINNED=$(sed -n 's/^impeccable-version:[[:space:]]*//p' "$ANSWERS" | head -1)
  [ -n "$OBSERVED" ] && [ "$OBSERVED" = "$PINNED" ] \
    || die "impeccable 버전 불일치 (관측 '$OBSERVED' vs 고정 '$PINNED') — DD1/DD3/DD13의 근거가 이 버전에서 확인된 것이므로 재확인 없이 진행하지 않는다"
  # 존재가 아니라 내용을 본다. 3차 패널 test 관점의 지적이며, 3.5.0 → 4.1.1 에서
  # 실제로 계약이 바뀌었으므로 존재 검사만으로는 부족하다는 것이 증명됐다.
  grep -qF 'canonical section order from Scan mode' "$DOC" || die "seed 계약 1(정규 절 순서) 문장이 $DOC 에 없다 — DD3 재확인 필요"
  grep -qF 'omit entirely' "$DOC"                          || die "seed 계약 2(Components 생략) 문장이 없다 — DD3/UI6 재확인 필요"
  grep -qF 'sidecar in seed mode'  "$DOC"                  || die "seed 계약 3(사이드카 생략) 문장이 없다 — DD3 재확인 필요"
  grep -qF '<!-- SEED'             "$DOC"                  || die "seed 마커 규약이 없다 — GATE-C 의 마커 검사가 무의미해진다"
  grep -qF 'PROJECT_ROOT/PRODUCT.md' "$SKILL/reference/init.md" || die "init 이 PROJECT_ROOT/PRODUCT.md 에 쓴다는 문장이 없다 — DD1 재확인 필요"
  # 이 스크립트가 **플랜이 말하는 그 스크립트인가.** 판정자가 플랜 본문에서 손으로
  # 옮겨진 파일이므로 옮기다 틀리거나, 플랜만 고치고 파일을 안 고치면 게이트의 단언이
  # 조용히 옛 판본에 머문다 — 3차 패널 test 관점 CRITICAL. plan 의 fenced block 을
  # 뽑아 바이트 비교한다. gate-final 이 PRD 에 묶는 것은 플랜 해시이지 이 파일이
  # 아니므로, 그 사이를 잇는 것이 이 검사다.
  W="$(mktemp -d)" || die "임시 디렉터리를 만들지 못했다 — 검사를 수행할 자리가 없다"
  [ -n "$W" ] && [ -d "$W" ] || die "mktemp -d 가 쓸 수 없는 값을 냈다 ('$W') — 빈 값이면 아래 trap 의 rm -rf 가 빈 인자로 돈다 (3차 패널 invariant MEDIUM)"
  trap 'rm -rf "$W"' EXIT
  awk '/^```bash$/{inb=1; buf=""; next}
       inb && /^```$/{ if (buf ~ /gate-final\)/) { printf "%s", buf; exit } inb=0; next }
       inb { buf = buf $0 "\n" }' "$PLANFILE" > "$W/plan-script"
  [ -s "$W/plan-script" ] || die "플랜에서 verify 스크립트 블록을 찾지 못했다 — 플랜과 스크립트를 잇는 검사가 성립하지 않는다"
  diff -q "$W/plan-script" "$VERIFY" >/dev/null \
    || die "$VERIFY 가 플랜 본문의 스크립트 블록과 다르다 — 옮겨 적다 틀렸거나 한쪽만 고쳤다. \`diff <(awk …) $VERIFY\` 로 확인하고 플랜 쪽을 정본으로 맞춰라"
  # DD24 — **답안지의 판정 항목이 플랜이 정한 것을 담고 있는가.** `verify.sh` 는 플랜
  # 본문과 바이트 비교로 묶여 있는데 답안지는 묶여 있지 않았다 — 플랜이 템플릿을
  # "보여주기만" 하고, 그것과 다른 값으로 답안지를 써도 GATE-A 는 형태만 보고 통과한 뒤
  # DD14 의 지문이 **틀린 기준을 동결**했다(6차 패널 test HIGH). 판정 항목이 플랜과
  # 갈리면 그 뒤의 모든 게이트가 플랜이 말한 것과 다른 것을 판정한다.
  #
  # **부분집합이 아니라 상위집합을 요구한다.** 답안지는 늘릴 수 있어야 하고(must-contain
  # 하한 5는 하한이지 상한이 아니다) tag-map 은 절 구성이 바뀌면 고쳐야 하므로, 묶는 것은
  # 플랜이 이름으로 든 판정 항목 둘뿐이다: `must-contain:` 과 `must-inherit:`.
  # `tag-map:` 은 의도적으로 제외한다 — 플랜이 그것을 **초안**이라고 명시하고 Task 0 이
  # 확인해 고치도록 설계했으므로, 여기서 묶으면 그 설계가 죽는다.
  awk '/^```markdown$/{inb=1; next} inb && /^```$/{inb=0; next} inb' "$PLANFILE" \
    | grep -E '^(must-contain|must-inherit):' | sort -u > "$W/plan-needles"
  [ -s "$W/plan-needles" ] \
    || die "플랜의 답안지 템플릿에서 판정 항목을 뽑지 못했다 — 템플릿 블록이 바뀌었거나 사라졌다 (DD24)"
  grep -E '^(must-contain|must-inherit):' "$ANSWERS" | sort -u > "$W/ans-needles" || true
  MISSING=$(comm -23 "$W/plan-needles" "$W/ans-needles" | head -3 | tr '\n' '|')
  [ -z "$MISSING" ] \
    || die "답안지가 플랜 템플릿의 판정 항목을 빠뜨렸다: $MISSING — 답안지는 플랜이 든 항목의 **상위집합**이어야 한다. 늘리는 것은 자유이나 빼면 판정이 플랜보다 느슨해지고, DD14 의 지문이 그 느슨함을 동결한다 (DD24)"
  # 답안지가 형태를 갖췄는가. must-contain 하한은 GATE-C 에도 있지만 그때는 이미
  # 생성이 끝난 뒤다 — 착수 전에 죽는 편이 싸다 (DD11).
  NA=$(sed -n 's/^must-contain:[[:space:]]*//p' "$ANSWERS" | grep -c . || true)
  # 하한은 GATE-C 와 **같은 수**여야 한다. 5차 라운드에 근거 재바인딩 항목을 더하면서
  # GATE-C 만 5로 올리고 여기를 4로 둔 적이 있다 — 정확히 4개면 GATE-A 가 통과하고
  # GATE-C 가 죽으므로, 문서 둘을 생성한 **뒤에야** 답안지 결함을 알게 된다. DD11 이
  # 막으려는 바로 그 늦음이다(5차 패널 test HIGH). 두 수는 함께 움직인다.
  [ "${NA:-0}" -ge 5 ] || die "답안지 must-contain 이 $NA 개다 — 최소 5개(상기·Esc·제안까지·택일·근거 재바인딩)가 있어야 하고, 그 사실은 생성 전에 알 수 있다"
  # 개수만 보면 인터뷰 답 **자체가** 통째로 비어 있어도 GATE-A 가 통과하고, 그 사실은
  # 생성이 끝난 뒤에야 드러난다(3차 패널 test MEDIUM). 답안지가 두 인터뷰의 답을 실제로
  # 담고 있는지를 절 이름으로 함께 확인한다 — 내용의 옳고 그름은 여전히 사람이 본다.
  grep -q '^## /impeccable init'           "$ANSWERS" || die "답안지에 init 인터뷰 답 절이 없다 (DD8) — 붙여 넣을 답이 없는 채로 Task 2 에 들어간다"
  grep -q '^## /impeccable document --seed' "$ANSWERS" || die "답안지에 document --seed 답 절이 없다 (DD8)"
  grep -q 'Brand Commitments'               "$ANSWERS" || die "답안지에 Brand Commitments 답이 없다 — DD13 의 상속 채널이 비어 있고, seed 는 상속할 재료를 모른 채 새 세계를 발명한다"
  # DD18 — 4.1.1의 seed 는 다섯 질문이 아니라 world workshop 이다. 답안지가 준비해야
  # 하는 것은 다섯 답이 아니라 **핀 문장**이고, 그것이 없으면 결정 페이지 앞에서
  # 무엇을 잠글지 모른 채 서 있게 된다. 그 사실은 생성 전에 알 수 있다 (DD11).
  grep -q '^pinned-direction:' "$ANSWERS" \
    || die "답안지에 pinned-direction: 줄이 없다 (DD18) — 4.1.1의 --seed 는 new-work 의 world workshop 으로 라우팅되고 주사위가 방향을 딜한다. 상속을 지키는 유일한 경로는 pinned direction 이며(new-work.md: a user- or brief-pinned direction beats the roll, always) 그 문장이 여기 미리 적혀 있어야 한다"
  mkdir -p "$(dirname "$BASELINE")"
  sha256sum $BASE_PATHS > "$BASELINE"
  # DD14 — 판정 기준 두 파일의 지문을 여기서 고정한다. 이후 게이트는 criteria_unchanged()
  # 로 이것과 대조하므로, 답안지의 must-contain 목록이나 이 스크립트의 단언을 실행 도중에
  # 느슨하게 고쳐도 다음 게이트가 죽는다.
  sha256sum "$ANSWERS" "$VERIFY" > "$CRITERIA"
  : > "$GATELOG"; mark_gate gate-a
  echo "[GATE-A] ok (impeccable $OBSERVED, 코드 무변경, seed 계약 3건, 스크립트-플랜 일치, 답안지 $NA 건, 베이스라인·판정기준 지문 기록)" ;;

gate-b)   # staging 이 성립했는가. 생성 시작 전.
  criteria_unchanged
  # DD1-1 의 세 번째 자리. `IMPECCABLE_CONTEXT_DIR` 은 `resolveContextDir` 의 마지막
  # 우선순위(245행)이고 **cwd 와 무관한 절대 경로를 받을 수 있으므로**, 이것이 설정돼
  # 있으면 staging 격리가 통째로 무의미해진다 — 저장소를 가리키면 로더가 시계 모드
  # 문서를 집는다. 아래 양성 프로브가 그 순간을 잡기는 하지만 프로브는 GATE-B 시점의
  # 환경만 보고 생성은 Task 2·3 에서 일어난다. 설정 자체를 거부해 그 창을 없앤다.
  [ -z "${IMPECCABLE_CONTEXT_DIR:-}" ] \
    || die "IMPECCABLE_CONTEXT_DIR 이 설정돼 있다 ('$IMPECCABLE_CONTEXT_DIR') — 이 변수는 cwd 와 무관하게 로더의 컨텍스트 자리를 덮으므로 staging 격리(DD2)가 성립하지 않는다. 해제하고 다시 돌려라"
  [ -d "$STAGE_BASE" ] || die "임시 디렉터리 베이스가 없다 ($STAGE_BASE) — TMPDIR 를 실재하는 저장소 밖 경로로 설정하고 다시 돌려라"
  [ -d "$STAGE" ] || die "STAGE 디렉터리가 없다 — Task 1 이 만들지 않았다"
  # 존재를 먼저 보고, 그다음 실제 경로로 정규화해 비교한다. 문자열 그대로 비교하면
  # 경로 형태 차이(위 ROOT 주석)로 이 가드가 무력해진다 — 실행해서 확인한 결함이다.
  STAGE_ABS="$(cd "$STAGE" && pwd)"
  case "$STAGE_ABS" in "$ROOT"|"$ROOT"/*) die "STAGE 가 저장소 안이다 ($STAGE_ABS) — 로더가 루트 문서를 집을 수 있다 (DD2)" ;; esac
  stage_is_clean_of_docs
  # 양성 프로브 — 이 자리에서 로더가 "제품 맥락도 시각 권위도 없다"고 말해야
  # `--seed` 가 정당하다 (DD1-4). 기존 구현을 언급하면 저장소를 집은 것이다.
  PROBE=$( cd "$STAGE" && node "$SKILL/scripts/context.mjs" 2>&1 || true )
  printf '%s' "$PROBE" | grep -q 'PRODUCT_INIT_REQUIRED' \
    || die "양성 프로브 실패 — staging 에서 로더가 from-scratch 를 보고하지 않는다"
  ! printf '%s' "$PROBE" | grep -q 'incumbent visual implementation' \
    || die "로더가 기존 구현을 봤다 — STAGE 가 저장소를 집었다. --seed 는 거부된다 (DD1-3)"
  mark_gate gate-b
  echo "[GATE-B] ok (staging 저장소 밖·비어 있음·from-scratch 프로브 통과)" ;;

gate-c)   # 생성물 검사. 산출물이 루트로 온 직후.
  # 이 게이트가 아래에서 읽는 must-contain 목록은 **작업 트리의** 답안지에서 온다.
  # GATE-A 와 여기 사이에 그 파일을 고치면 판정 기준이 조용히 느슨해지므로, 읽기 전에
  # 지문을 대조한다 (DD14 · 3차 패널 security HIGH).
  criteria_unchanged
  [ -f "$CAL_PRODUCT" ] && [ -f "$CAL_DESIGN" ] || die "생성물 둘 중 하나가 없다"
  # 5차 패널 invariant MEDIUM 의 잔여 흡수. `gate-final` 이 이미 `tracked` 를 보지만
  # 그것은 Task 7 이고, 두 문서가 untracked 로 태어나는 순간은 **여기 직전의 Task 3**
  # 이다. 생성 지점에서 세 Task 뒤에야 알게 되는 것은 DD11 이 막으려는 늦음 그 자체다.
  # 같은 검사를 두 자리에 두는 것이 중복으로 보이지만 두 자리가 막는 것이 다르다 —
  # 여기는 "Task 3 이 git add 를 빠뜨렸다"를, gate-final 은 "그 뒤에 누가 지웠다"를 잡는다.
  tracked "$CAL_PRODUCT"; tracked "$CAL_DESIGN"
  stage_is_clean_of_docs
  W="$(mktemp -d)" || die "임시 디렉터리를 만들지 못했다 — 검사를 수행할 자리가 없다"
  [ -n "$W" ] && [ -d "$W" ] || die "mktemp -d 가 쓸 수 없는 값을 냈다 ('$W') — 빈 값이면 아래 trap 의 rm -rf 가 빈 인자로 돈다 (3차 패널 invariant MEDIUM)"
  trap 'rm -rf "$W"' EXIT
  # 3.x 의 `## Register` 절은 4.1.1 init 에 없다 (DD1-2). 그것을 요구하던 단언은
  # 삭제됐다 — 없는 것을 요구하는 게이트는 정확한 산출물을 죽인다.
  grep -q '^## Brand Commitments' "$CAL_PRODUCT" || die "Brand Commitments 절이 없다 — 상속 채널이 비었다 (DD13)"
  grep -qE 'DESIGN\.md[^)]{0,60}절' "$CAL_PRODUCT" \
    || die "Brand Commitments 가 DESIGN.md 를 절 이름으로 가리키지 않는다 (DD13/UI5)"
  # DD23 — **어느 절을 상속했는지**까지 본다. 직전 판은 "DESIGN.md 의 절 하나라도
  # 가리키는가"만 물었으므로, DD13 이 고른 다섯 중 넷을 빠뜨리고 하나만 적어도 통과했다
  # (6차 패널 test HIGH). 상속 목록이 산문에만 있고 기계가 읽는 자리에 없던 것이 원인이다.
  # 답안지의 `must-inherit:` 줄이 그 목록이고, 여기서 **Brand Commitments 절 안에서만**
  # 찾는다 — 문서 아무 데나 있으면 통과하는 것은 채널을 확인한 것이 아니다.
  awk '/^## Brand Commitments/{inb=1; next} /^## /{inb=0} inb' "$CAL_PRODUCT" > "$W/brand"
  [ -s "$W/brand" ] || die "Brand Commitments 절이 비어 있다 — 상속 채널이 헤더만 있고 내용이 없다 (DD13/DD23)"
  sed -n 's/^must-inherit:[[:space:]]*//p' "$ANSWERS" | grep . > "$W/inherit" || true
  NI=$(wc -l < "$W/inherit")
  [ "${NI:-0}" -ge 5 ] \
    || die "답안지 must-inherit 이 $NI 개다 — DD13 이 고른 다섯(4절 Elevation·4절 Named Rules·2절 Named Rules·3절 Typography·6절 Do's and Don'ts)이 하한이다 (DD23)"
  while read -r ITEM; do
    [ -z "$ITEM" ] && continue
    grep -qF "$ITEM" "$W/brand" \
      || die "Brand Commitments 절에 상속 선언이 없다: $ITEM — 답안지 must-inherit 이 요구하는 절이다 (DD23). 문서 다른 곳에 있어도 통과하지 않는다: 상속은 그 절에 적혀야 채널이다"
  done < "$W/inherit"
  head -5 "$CAL_DESIGN" | grep -q '<!-- SEED' || die "seed 마커가 없다 — scan 모드로 빠졌다 (DD3)"
  ! grep -qE '^#{2,4} .*Components' "$CAL_DESIGN" || die "Components 절이 있다 — UI6 위반 (DD3)"
  # 4.1.1 정규 순서 8절에서 Components 를 뺀 7절. 3.x 의 6절이 아니다.
  # **헤더 줄에만** 물린다. 이전 판은 파일 전체에 `grep -qF` 를 걸어서 본문 산문의
  # "Overview of the system" 한 줄이 절 하나를 대신 통과시켰다 — 3차 패널 test 지적.
  grep -E '^#{2,4} ' "$CAL_DESIGN" > "$W/heads" || die "$CAL_DESIGN 에 절 헤더가 하나도 없다"
  for h in Overview Colors Typography Layout Elevation Shapes "Do's and Don'ts"; do
    grep -qF "$h" "$W/heads" || die "정규 절 헤더 '$h' 가 없다 (4.1.1 순서) — 헤더 줄에서 찾는다"
  done
  # DD25 — **순서까지 본다.** 이름 일곱이 다 있고 개수도 일곱인데 순서가 뒤바뀐 산출물은
  # 위 두 검사를 모두 통과한다(6차 패널 test MEDIUM). DD3 이 요구하는 것은 "정규 절
  # *순서*" 이고, 존재·개수·순서는 서로를 함의하지 않는다. 최상위 헤더만 본다 — 하위
  # 헤더는 절 안의 구성이지 정규 순서의 대상이 아니다.
  grep -E '^## ' "$CAL_DESIGN" > "$W/toplevel" || die "$CAL_DESIGN 에 최상위 절이 없다"
  : > "$W/order-actual"
  while IFS= read -r H; do
    for c in Overview Colors Typography Layout Elevation Shapes "Do's and Don'ts"; do
      case "$H" in *"$c"*) printf '%s\n' "$c" >> "$W/order-actual"; break ;; esac
    done
  done < "$W/toplevel"
  printf '%s\n' Overview Colors Typography Layout Elevation Shapes "Do's and Don'ts" > "$W/order-expect"
  diff -q "$W/order-expect" "$W/order-actual" >/dev/null 2>&1 \
    || die "$CAL_DESIGN 의 절 순서가 4.1.1 정규 순서와 다르다 (DD3/DD25). 기대: $(tr '\n' '>' < "$W/order-expect") / 실제: $(tr '\n' '>' < "$W/order-actual") — seed 가 순서를 바꿨다면 reference/document.md 의 정규 순서를 다시 읽고 DD3 을 갱신해라"
  # 일곱이 **전부인가.** 이름 일곱을 찾기만 하면 seed 가 절을 더 얹었을 때를 구분하지
  # 못한다 — "정규 순서를 따랐다"는 DD3 의 단언이 검사에 물리지 않은 채 남는다(3차 패널
  # test MEDIUM). 개수로 본다: 이름 대조는 판본이 절 이름을 다듬으면 깨지지만 개수는
  # 정규 순서가 실제로 바뀌었을 때만 어긋난다. 죽으면 reference/document.md 를 다시
  # 읽고 DD3 을 갱신하라는 신호이며, 그것이 GATE-A 의 버전 대조와 같은 처방이다.
  # 5차 패널 test HIGH — Layout·Shapes 는 `DESIGN.md` 에 대응 절이 아예 없어 이름으로
  # 상속할 대상이 없다. seed 가 그 둘을 구체 수치로 채우면 gate-final 의 토큰 전수
  # 검사가 죽는데, 그 die 문구는 "상속 값이 복사됐다 — 참조로 바꿔라"라서 이 경우엔
  # 오해를 부른다(참조할 원본 절이 없으므로 올바른 복구는 값 삭제다). 여기서 먼저
  # 잡고 맞는 문구를 낸다 — DD11 대로 되돌릴 수 없는 단계 앞에 세우는 것이기도 하다.
  #
  # **이 정규식은 의도적으로 넓다.** 8차 패널 test 가 "`The 1px Rule` 같은 규칙 이름이나
  # 설명문의 `1px margin` 도 걸린다"고 MEDIUM 으로 짚었고 사실이다. 그러나 이 두 절의
  # 계약은 "값 없이 규칙 수준으로만"(UI6/DD7)이므로 **수치가 규칙 이름에 있든 설명문에
  # 있든 계약 위반이다** — 오탐이 아니라 정탐이다. 방향도 안전하다: 막히면 값을 지우면
  # 되고(die 문구가 그렇게 지시한다), 놓치면 gate-final 의 토큰 전수가 더 나쁜 문구로
  # 뒤늦게 죽는다. 좁히면 "규칙 이름에 숨긴 수치"라는 우회로가 생기므로 좁히지 않는다.
  awk '/^## /{ inx = ($0 ~ /Layout|Shapes/) } inx' "$CAL_DESIGN" > "$W/layshape" || true
  if [ -s "$W/layshape" ]; then
    BADTOK=$(grep -ohE '\-?[0-9]*\.?[0-9]+(em|rem|px|s)\b|#[0-9A-Fa-f]{6,8}|[0-9]+(\.[0-9]+)?:1' "$W/layshape" \
      | sort -u | head -3 | tr '\n' ' ' || true)
    [ -z "$BADTOK" ] \
      || die "Layout·Shapes 절에 구체 수치가 있다: $BADTOK — 이 둘은 DESIGN.md 에 대응 절이 없어 참조로 바꿀 대상이 없다. 올바른 복구는 **값 삭제**이고 규칙 수준 서술만 남기는 것이다 (UI6/DD7)"
  fi
  NSEC=$(grep -c '^## ' "$CAL_DESIGN" || true)
  [ "${NSEC:-0}" = "7" ] \
    || die "$CAL_DESIGN 의 최상위 절이 $NSEC 개다 — 4.1.1 정규 8절에서 Components 를 뺀 7개여야 한다 (DD3). 늘었다면 판본이 절을 더한 것이니 reference/document.md 를 다시 읽고 DD3 을 갱신해라"
  # 역참조가 존재하고, 그것이 **실재하는** 절을 가리키는가 (test 관점 CRITICAL 흡수)
  grep -qE '(PRODUCT|DESIGN)\.md[^)]{0,60}절' "$CAL_DESIGN" \
    || die "$CAL_DESIGN 의 역참조에 절 이름이 없다 — 파일명만으로는 UI5 를 만족하지 않는다"
  refs_resolve "$W"
  # Named Rule 형식 — `**The … Rule.**` 이 아닌 Rule 줄이 하나라도 있으면 죽는다.
  # Rule 줄이 하나도 없는 것은 통과다(seed 가 규칙을 안 쓸 수 있다).
  ! grep -nE '^\*\*.*Rule\.?\*\*' "$CAL_DESIGN" | grep -qvE '^\s*[0-9]+:\*\*The .+ Rule\.\*\*' \
    || die "Named Rule 형식이 어긋난 줄이 있다 — \`**The [이름] Rule.**\` 이어야 한다"
  # DD16 — 상속을 선언한 규칙을 캘린더 문서가 **같은 이름으로 다시 정의**하면 그것은
  # 상속이 아니라 덮어쓰기다. 값 복사는 gate-final 의 토큰 전수 검사가 잡지만, 값을
  # 옮기지 않고 이름만 재사용해 규칙을 새로 쓰는 것은 잡히지 않았다 — DD13 마지막
  # 문단이 "그 잔여는 사람이 맡는다"고 적어 둔 자리이고, 5차 패널 architect/test 가
  # HIGH 로 각각 다시 지적한 자리다. 이 저장소에서 규칙의 형태는 \`**The [이름] Rule.**\`
  # 하나로 고정돼 있으므로(Patterns 표) **이름 충돌은 기계 판정이 된다.**
  # 캘린더 고유의 **새 이름** 규칙은 막지 않는다 — 막아야 하는 것은 재정의이지 신설이 아니다.
  grep -ohE '^\*\*The .+ Rule\.\*\*' DESIGN.md | sort -u > "$W/rules.orig"
  grep -ohE '^\*\*The .+ Rule\.\*\*' "$CAL_DESIGN" | sort -u > "$W/rules.cal" || true
  DUP=$(comm -12 "$W/rules.orig" "$W/rules.cal" | head -3 | tr '\n' ' ')
  [ -z "$DUP" ] \
    || die "캘린더 문서가 DESIGN.md 의 규칙을 같은 이름으로 다시 정의한다 — 상속은 참조이지 재정의가 아니다 (DD16): $DUP"
  # 답안지 must-contain — 스킬 질문 순서가 바뀌어도 답의 내용은 매이지 않는다 (DD8).
  # 목록이 비면 루프가 한 번도 돌지 않아 검사 없이 통과한다. 빈 목록은 통과가 아니다.
  sed -n 's/^must-contain:[[:space:]]*//p' "$ANSWERS" | grep . > "$W/needles" || true
  N=$(wc -l < "$W/needles")
  [ "$N" -ge 5 ] || die "답안지 must-contain 이 $N 개다 — 최소 5개(상기·Esc·제안까지·택일·근거 재바인딩)가 있어야 한다"
  while read -r NEEDLE; do
    [ -z "$NEEDLE" ] && continue
    grep -qF "$NEEDLE" "$CAL_PRODUCT" "$CAL_DESIGN" \
      || die "답안지 항목이 생성물에 없다: $NEEDLE"
  done < "$W/needles"
  mark_gate gate-c
  echo "[GATE-C] ok (seed 계약·정규 7절 헤더·참조 실재·답안지 $N 건 적중)" ;;

gate-d)   # 저장소 무변경 증명. Task 5의 의도된 편집 전.
  criteria_unchanged
  [ -f "$BASELINE" ] || die "베이스라인이 없다 — GATE-A 를 돌지 않았다"
  sha256sum -c "$BASELINE"
  code_unchanged
  [ -z "$(git diff --stat -- PRODUCT.md DESIGN.md)" ] \
    || die "루트 문서가 커밋 상태와 다르다 — 생성 과정이 저장소를 건드렸다"
  stage_is_clean_of_docs
  mark_gate gate-d
  echo "[GATE-D] ok (저장소는 생성 과정에서 바뀌지 않았다)" ;;

gate-e)   # Task 6 직후, Task 7 전. 태그 누락과 **정오**를 여기서 잡는다.
  criteria_unchanged
  W="$(mktemp -d)" || die "임시 디렉터리를 만들지 못했다 — 검사를 수행할 자리가 없다"
  [ -n "$W" ] && [ -d "$W" ] || die "mktemp -d 가 쓸 수 없는 값을 냈다 ('$W')"
  trap 'rm -rf "$W"' EXIT
  # DD15 — 커버리지는 "태그가 붙었는가"만 답한다. "맞게 붙었는가"는 2차 패널 architect 가
  # 지적하고 이 플랜이 "게이트가 잡지 못한다"고 적어 둔 자리이며, 5차 패널 test 가 HIGH 로
  # 다시 지적했다. 판단 자체는 여전히 사람이 한다 — 다만 그 판단을 **답안지에 선언**하게
  # 하고 여기서 실제와 대조하므로 더는 검사 밖이 아니다. 틀린 **선언**은 리뷰가 잡고
  # (답안지는 추적되며 같은 커밋에 든다 — DD8), 선언과 **산출물이 어긋나는 것**은 여기서 죽는다.
  sed -n 's/^tag-map:[[:space:]]*//p' "$ANSWERS" | grep . | sort -u > "$W/tagmap" || true
  [ -s "$W/tagmap" ] || die "답안지에 tag-map 선언이 없다 (DD15) — 태그의 정오는 커버리지로 판정되지 않는다"
  MAPN=$(wc -l < "$W/tagmap")
  SUMN=$(( $(grep -c '^## ' PRODUCT.md) + $(grep -c '^## ' DESIGN.md) ))
  [ "$MAPN" = "$SUMN" ] \
    || die "tag-map 이 $MAPN 행인데 두 문서의 절은 $SUMN 개다 — 선언은 절과 일대일이어야 한다 (중복 행은 이미 걸러진 뒤의 수다)"
  for f in PRODUCT.md DESIGN.md; do
    TOTAL=$(grep -c '^## ' "$f" || true); TAGGED=$(grep -cE '^## .*\[(셸|시계)\]' "$f" || true)
    [ "$TOTAL" = "$TAGGED" ] || die "$f 에 태그 없는 절이 $((TOTAL-TAGGED))개 있다"
    sed -nE 's/^## (.*[^[:space:]])[[:space:]]*\[(셸|시계)\][[:space:]]*$/\1|\2/p' "$f" > "$W/actual"
    PARSED=$(wc -l < "$W/actual")
    [ "$PARSED" = "$TOTAL" ] \
      || die "$f 의 태그를 $PARSED/$TOTAL 개만 파싱했다 — 태그는 헤더 줄 맨 끝에 [셸] 또는 [시계] 로 붙어야 한다"
    while IFS='|' read -r SEC TAG; do
      [ -z "$SEC" ] && continue
      WANT=$(awk -F'|' -v ff="$f" -v ss="$SEC" '$1==ff && $2==ss {print $3; exit}' "$W/tagmap")
      [ -n "$WANT" ] || die "$f 의 절 '$SEC' 가 답안지 tag-map 에 없다 — 선언되지 않은 절에는 태그를 붙일 수 없다 (DD15)"
      [ "$WANT" = "$TAG" ] || die "$f 의 절 '$SEC' 태그가 선언과 다르다 (선언 '$WANT' vs 실제 '$TAG') — DD5 의 경계를 다시 보고 둘 중 하나를 고쳐라"
    done < "$W/actual"
  done
  # Task 7 이 PRD 를 편집하기 직전이다. 그 편집의 되돌림 지점을 여기서 확정한다 —
  # PRD 가 추적되고 깨끗하면 `git checkout -- $PRDFILE` 이 항상 완전 복구이고,
  # 그래서 Task 7 은 되돌릴 수 있는 단계다(DD11 의 범위 밖). 이 확인이 없으면
  # gate-final 이 기록을 물렸을 때 무엇으로 되돌릴지가 불분명해진다.
  tracked "$PRDFILE"
  [ -z "$(git status --porcelain -- "$PRDFILE")" ] \
    || die "$PRDFILE 에 미커밋 변경이 있다 — Task 7 편집의 되돌림 지점이 불분명하다. 커밋하거나 되돌린 뒤 Task 7 을 시작해라"
  mark_gate gate-e
  echo "[GATE-E] ok (태그 커버리지 100%, PRD 되돌림 지점 확보)" ;;

gate-final)   # Task 7 이후. 의도된 편집이 전부 반영된 상태를 본다.
  criteria_unchanged
  code_unchanged
  for f in PRODUCT.md DESIGN.md "$CAL_PRODUCT" "$CAL_DESIGN"; do
    [ -f "$f" ] || die "문서 누락: $f"
  done
  # 5차 패널 invariant HIGH — 존재 검사만으로는 **추적되지 않은 산출물**을 걸러내지
  # 못한다. 캘린더 두 문서는 Task 2·3 이 staging 에서 `mv` 로 가져오므로 untracked 로
  # 태어나고, Task 7 의 커밋이 그 둘을 빠뜨려도 게이트가 0을 낸다 — 마일스톤의
  # 산출물 자체가 커밋에서 누락되는 경로다. Task 2·3 이 `git add` 를 하고 여기서 확인한다.
  tracked "$CAL_PRODUCT"; tracked "$CAL_DESIGN"
  grep -q "$CAL_PRODUCT" PRODUCT.md || die "PRODUCT.md 가 캘린더 문서를 가리키지 않는다"
  grep -q "$CAL_DESIGN"  DESIGN.md  || die "DESIGN.md 가 캘린더 문서를 가리키지 않는다"
  # 역참조는 파일명 단독이 아니라 절 이름을 동반해야 한다 (Task 5 / PRODUCT.md 108행 방식)
  grep -qE '(PRODUCT|DESIGN)\.md[^)]{0,60}절' "$CAL_PRODUCT" || die "$CAL_PRODUCT 의 역참조에 절 이름이 없다"
  grep -qE '(PRODUCT|DESIGN)\.md[^)]{0,60}절' "$CAL_DESIGN"  || die "$CAL_DESIGN 의 역참조에 절 이름이 없다"
  W="$(mktemp -d)" || die "임시 디렉터리를 만들지 못했다 — 검사를 수행할 자리가 없다"
  [ -n "$W" ] && [ -d "$W" ] || die "mktemp -d 가 쓸 수 없는 값을 냈다 ('$W') — 빈 값이면 아래 trap 의 rm -rf 가 빈 인자로 돈다 (3차 패널 invariant MEDIUM)"
  trap 'rm -rf "$W"' EXIT
  # 5차 패널 architect HIGH — 원본 두 문서의 **자기 참조**는 지금까지 한 번도 실재
  # 검사를 받지 않았다. refs_resolve 는 원본에서 절 이름을 뽑아 캘린더 문서의 참조만
  # 대조했고, 그래서 `PRODUCT.md:108` 의 죽은 `Glass` 절 참조가 이 저장소에 그대로
  # 살아 있었다. Patterns 표가 그 줄을 "절 이름으로 가리킨다"의 선례로 인용하는데
  # 선례가 죽은 참조였던 셈이다. Task 5 가 DD12 로 그것을 고치고, 이 호출이 고쳐졌는지
  # 확인한다 — 값만 지우고 이름을 그대로 두면 여기서 죽는다.
  refs_resolve "$W" PRODUCT.md DESIGN.md
  # Task 5 가 참조를 더 붙였으므로 실재 검사를 다시 돈다 — 이번에는 태그가 붙은
  # 최종 헤더를 기준으로 본다(`refs_resolve` 가 `[셸]`·`[시계]` 를 벗겨낸다).
  refs_resolve "$W"
  # 값 복사 금지 (DD4) — 손으로 고른 목록이 아니라 원본에서 측정치 토큰을 뽑아 전부 본다
  git show HEAD:PRODUCT.md > "$W/orig-product"
  git show HEAD:DESIGN.md  > "$W/orig-design"
  # 2·3차 패널 지적 흡수 — rem·px·unitless lineHeight·hex 에 더해 지속시간 단위 s.
  # s 를 넣으면 산문의 숫자+s 도 걸릴 수 있으나, 방향이 과잉 차단이므로 감수한다.
  grep -ohE '[0-9]+(\.[0-9]+)?:1|sRGB [0-9]+|-?[0-9]*\.?[0-9]+(em|rem|px|s)|brightness\([0-9.]+\)|#[0-9A-Fa-f]{6,8}|lineHeight: [0-9.]+' \
    "$W/orig-product" "$W/orig-design" | sort -u > "$W/tokens"
  while read -r TOK; do
    [ -z "$TOK" ] && continue
    ! grep -qF "$TOK" "$CAL_PRODUCT" "$CAL_DESIGN" \
      || die "상속 값이 복사됐다: $TOK — 참조로 바꿔라 (DD4/UI5)"
  done < "$W/tokens"
  # 시계 지표 누출 (DD5) — 한 문구가 아니라 성공 지표 어휘 전체를 본다
  ! grep -qE '사진이 몇 퍼센트|사진 노출|사진 표시 비율|사진이 안 가려' "$CAL_PRODUCT" "$CAL_DESIGN" \
    || die "시계 모드 성공 지표가 캘린더 문서에 샜다"
  # DD12 — PRODUCT.md 가 brightness 수치를 더 이상 들고 있지 않은가
  ! grep -qE 'brightness\([0-9.]+\)' PRODUCT.md \
    || die "PRODUCT.md 가 아직 brightness 수치를 복사하고 있다 — DESIGN.md 의 절 이름으로 바꿔라 (DD12)"
  # 음성 검사만으로는 "값을 지웠는가"밖에 모른다. 값을 지우고 아무것도 두지 않으면
  # 해결값이 어디 있는지 문서가 답하지 못하고, Patterns 표가 선례로 드는 `PRODUCT.md:108`
  # 이 선례이기를 멈춘다(3차 패널 test LOW). 대체물이 절 이름 참조인지 함께 본다.
  grep -qE 'DESIGN\.md[^)]{0,80}절' PRODUCT.md \
    || die "PRODUCT.md 가 brightness 값을 뺀 자리에 DESIGN.md 의 절 이름 참조를 두지 않았다 (DD12) — 값 삭제는 절반이고, 나머지 절반이 UI5 가 요구하는 참조다"
  # DD6 — 옛 문구가 사라지고 확정 문구가 들어왔는가
  ! grep -q 'dogfooding 결과 대기' DESIGN.md || die "DESIGN.md 에 폐기된 v2 dogfooding 문구가 남아 있다 (DD6)"
  # DD7 — 값이 아니라 절차가 적혔는가. M3의 두 결정을 이름으로 확인한다
  grep -qE '대비.*재측정|재측정.*대비' "$CAL_DESIGN" \
    || die "오늘 줄 제목의 대비 재측정 절차가 $CAL_DESIGN 에 없다 (DD7)"
  grep -qE '부하.*(형태|테두리|패턴|축)' "$CAL_DESIGN" \
    || die "부하와 중요도를 가르는 축이 $CAL_DESIGN 에 없다 (DD7)"
  # 게이트 실행 기록이 이 플랜 판본에 묶였는가 (Task 7).
  # 문서 어디서든 그 16자가 보이면 통과하던 이전 판은 느슨했다 — 주석이나 옛 예시에
  # 우연히 남은 문자열도 통과시킨다(3차 패널 invariant 지적). 기록 줄의 형태를
  # 함께 요구해, 해시가 **그 줄에** 있을 때만 통과한다.
  PLANHASH=$(sha256sum "$PLANFILE" | cut -c1-16)
  RECORDS=$(grep -cE "^[-*][[:space:]].*gate 실행 기록" "$PRDFILE" || true)
  [ "${RECORDS:-0}" = "1" ] \
    || die "PRD의 'gate 실행 기록' 줄이 $RECORDS 개다 — 정확히 하나여야 한다. **0이면 Task 7 이 아직 그 줄을 쓰지 않은 것이고, 그것은 이 게이트의 결함이 아니라 순서다** — gate-final 은 Task 7 **이후**에 도는 게이트이므로 Task 5·6 에서 미리 부르면 여기서 죽는 것이 정상이다(Task 5 Validate 참조). 여럿이면 어느 것이 이번 실행인지 문서가 답하지 못하고, 옛 예시가 검사를 통과시킨다"
  grep -qE "^[-*][[:space:]].*gate 실행 기록.*$PLANHASH" "$PRDFILE" \
    || die "PRD의 유일한 'gate 실행 기록' 줄이 현재 플랜 판본($PLANHASH)을 가리키지 않는다 (Task 7)"
  # DD14 보강 — 지문은 한 번의 실행 안에서의 불변만 보장했고, **답안지를 느슨하게 고치고
  # GATE-A 부터 다시 도는 경로**는 열려 있었다. 그 경로를 닫는 것이 "게이트가 아니라
  # 리뷰"라고 적어 뒀는데, 리뷰가 볼 대상이 .gitignore 된 파일이라 실제로는 diff 에
  # 아무것도 남지 않았다 — 5차 패널 architect HIGH. 이제 판정 기준 지문이 **커밋되는 PRD
  # 기록 줄에** 함께 실리고 게이트가 그것을 대조한다. 기준을 바꾸고 다시 돌면 이 16자가
  # 달라지므로 PRD 를 고쳐야 하고, 그 편집은 diff 에 남는다. 막는 것이 아니라 보이게 만드는 것이다.
  CRITHASH=$(sha256sum "$CRITERIA" | cut -c1-16)
  grep -qE "^[-*][[:space:]].*gate 실행 기록.*$CRITHASH" "$PRDFILE" \
    || die "PRD의 'gate 실행 기록' 줄이 이번 실행의 판정 기준 지문($CRITHASH)을 담지 않는다 — GATE-A 를 다시 돌아 기준이 바뀌었다면 그 사실이 커밋되는 자리에 남아야 한다 (DD14)"
  # DD20 — Task 7 Validate 가 "gate-final 은 두 Open Question 이 [x] 인지 본다"고 적어
  # 놓고 **구현이 없었다**(6차 패널 invariant CRITICAL, 실측으로 확인 — gate-final 전체에
  # Open Question 검사 적중 0건). 이 플랜이 다섯 라운드에 걸쳐 반복해서 고쳐 온 결함과
  # 같은 종류다: 게이트가 잡는다고 적힌 것을 게이트가 잡지 않는 것. PRD 갱신은 Task 7 의
  # 산출물 중 유일하게 **다른 문서의 진실성**을 바꾸는 부분이므로 여기서 검사한다.
  #
  # awk 의 index() 로 맞춘다 — 물음 문구가 정규식 메타문자를 품어도 이스케이프가 필요 없고,
  # 체크박스는 줄 머리에서, 근거는 같은 줄에서 각각 확인한다. 셋을 한 줄에 요구하는 것이
  # 핵심이다: `[x]` 만 보면 근거 없이 체크만 한 것을 통과시키고, `해소` 만 보면 다른 줄의
  # 해소 표기가 이 물음을 대신 통과시킨다.
  for Q in "캘린더 모드 제품 문서를 만드는 절차" "M1의 산출물을 무엇으로 판정하는가"; do
    awk -v q="$Q" '
      substr($0, 1, 6) != "- [x] " { next }
      index($0, q) == 0 { next }
      index($0, "해소") == 0 { next }
      { found = 1 }
      END { exit(found ? 0 : 1) }
    ' "$PRDFILE" \
      || die "PRD Open Question '$Q' 가 '- [x] … 해소 …' 한 줄로 닫히지 않았다 (Task 7 / DD20) — 체크와 근거가 같은 줄에 함께 있어야 한다. 셋 중 무엇이 빠졌는지는 PRD 의 해당 줄을 보면 안다"
  done
  # UI10 — 네 문서가 공유하는 단 하나. 넷 다에 남아야 하고, 그것이 유일한 공유물이다.
  for f in PRODUCT.md DESIGN.md "$CAL_PRODUCT" "$CAL_DESIGN"; do
    grep -q '택일' "$f" || die "$f 에 '모드는 택일' 문장이 없다 — 네 문서가 공유하는 단 하나가 빠졌다 (UI10)"
  done
  # DD17 — 앞 다섯 게이트가 **이번 실행에서** 전부 통과했는가. 최종 상태만 맞으면
  # 통과하던 창을 닫는다(5차 패널 invariant HIGH).
  [ -f "$GATELOG" ] || die "게이트 실행 원장이 없다 ($GATELOG) — GATE-A 부터 이번 실행을 다시 돌려라"
  for g in gate-a gate-b gate-c gate-d gate-e; do
    grep -qx "$g" "$GATELOG" \
      || die "$g 가 이번 실행에서 통과한 기록이 없다 — gate-final 은 최종 상태만 보므로 앞 게이트를 건너뛰면 상태가 맞아도 통과해서는 안 된다 (DD17). 건너뛴 게이트부터 다시 돌려라"
  done
  rm -f "$BASELINE" "$CRITERIA" "$GATELOG"
  echo "[GATE-FINAL] ok" ;;

*) die "unknown gate: $1" ;;
esac
```

### 답안지 형식 (`.claude/plans/work-calendar-m1.answers.md`)

GATE-A는 `impeccable-version:` 과 `pinned-direction:` 을, GATE-C는 `must-contain:` 줄 전부를, GATE-E는 `tag-map:` 줄 전부를 읽는다. 네 접두어가 이 파일의 계약이며, 접두어는 줄 맨 앞에 오고 값은 한 줄에 하나다. **넷 다 Task 0 에 확정된다** — DD14의 지문이 GATE-A 시점에 이 파일을 동결하므로 뒤에서 덧붙일 수 없고, `tag-map` 의 경우 그 동결이 곧 설계다: 태그를 **붙이기 전에** 기대값을 선언해야 GATE-E의 대조가 도장 찍기가 아니게 된다. 나머지 산문은 사람이 인터뷰에서 그대로 붙여 넣기 위한 것이다. **이 파일은 `verify.sh` 와 같은 커밋에 들어간다**(DD8) — GATE-A가 추적 여부를 확인한다.

```markdown
# M1 인터뷰 답안지

impeccable-version: 4.1.1

<!-- 착수 시점에 SKILL.md 에서 관측한 값. GATE-A가 이 값과 실제를 대조하고
     다르면 죽는다. 순환 의존은 없다 — 이 값은 impeccable을 실행해서가 아니라
     SKILL.md 를 읽어서 얻으며, 그것은 Task 0 이전에 가능하다.
     **어느 SKILL.md 를 읽는가가 이 필드의 절반이다**(DD19): GATE-A 는
     installed_plugins.json 이 가리키는 plugin 경로를 읽고, 폐지된 CLI 설치본
     (~/.claude/skills/impeccable)이 남아 있으면 그 자체를 실패로 처리한다.
     직전 판이 이 값을 정확히 적고도 게이트가 3.5.0 을 관측한 것은 서술이 아니라
     경로가 틀려서였다. 그 사고가 이 필드와 DD19 가 함께 존재하는 이유다. -->

## /impeccable init — Step 4 인터뷰 답 (4.1.1 절 이름 기준)

- Platform: `web`
- Users: PRD `## Users` 절 Primary 4항목을 그대로 옮긴다
- Product Purpose: PRD `## Hypothesis` 문장
- Positioning / Operating Context: 새 탭을 지나치는 몇 초. 모드는 택일이며 공존하지 않는다
- Brand Commitments (DD13 — 이 항목이 상속의 유일한 채널이다):
  - 이 모드는 `DESIGN.md` 의 **4절 Elevation**(유리 정당화 조건), **4절 Named Rules**
    (`The brightness Rule` · `The 표면을 누르지 알파를 올리지 않는다 Rule`),
    **2절 Named Rules**(`The 두 단계 Rule` — 유리 알파는 0.3과 0.5 두 단계뿐이다),
    **3절 Typography**, **6절 Do's and Don'ts**, 그리고 `PRODUCT.md` 의 대비 실측 절을
    **이름으로 상속하며 값을 다시 정하지 않는다.**
  - 화면의 hue 계열은 accent 하나이며 상태 색은 발생 시에만 쓴다 — `DESIGN.md` Colors 절을 따른다.
  - 목표는 갈리지만 재료는 상속한다. 패턴을 새로 발명하지 않는다.
- Accessibility & Inclusion: 대비 기준은 `PRODUCT.md` 의 실측 절을 상속한다고만 적는다 (DD4)

## /impeccable document --seed — world workshop 대응 (DD18)

<!-- 직전 판은 이 자리에 "다섯 질문"(색 전략·타이포 방향·모션 에너지·참조 셋·
     anti-reference)을 적었다. **4.1.1에 그 인터뷰는 없다** — reference/document.md
     354-360행 이 seed Step 1 을 reference/new-work.md 의 world workshop 으로
     라우팅한다. 다섯 답을 들고 가면 물어보지 않는 질문에 답을 준비해 간 셈이 된다.
     여기 적는 것은 답이 아니라 **핀**이다. -->

pinned-direction: 캘린더 모드는 새 시각 세계를 만들지 않는다. 시계 모드의 유리 언어를 그대로 상속하고, 갈리는 것은 목표 층위(주인공·성공 지표·anti-reference 적용 범위·두 상태 계약)뿐이다.

<!-- GATE-A 가 이 접두어의 존재를 확인한다. 문장 자체의 옳음은 사람이 본다. -->

- **workshop 이 도는 순서와 이 답안지가 개입하는 자리**(`new-work.md` 41행 이하):
  일곱 후보 도출 → `concept-seed.mjs --scope direction` 주사위 → `serve-question.mjs`
  결정 페이지 → 카드 잠금 → `## 4. Commit the world`. **개입 지점은 카드 잠금 하나다.**
- 주사위가 무엇을 딜하든 위 `pinned-direction:` 을 pinned direction 으로 선언하고 그것을 잠근다.
  근거는 workshop 자신의 규약이다 — `a user- or brief-pinned direction beats the roll, always`.
  **주사위를 이기려 하지 말고 핀으로 들어간다**(DD18).
- 결정 페이지가 뜨지 않거나(sandbox/포트) 구조화 도구로 폴백하면 같은 핀을 그 자리에 낸다.
  `new-work.md` 는 무응답 시 배정된 방향으로 **무인 진행**하므로, 답 없이 두면 상속이 깨진다.
- `## 4. Commit the world` 의 색 전략은 `DESIGN.md` Colors 절을 이름으로 가리키고 값을 옮기지 않는다.
  서체도 같다 — 새로 고르지 않고 `DESIGN.md` 3절 Typography 를 가리킨다.
- workshop 은 cwd 에 `.impeccable/config.json`·`.impeccable/mocks/decision/` 을 쓸 수 있다.
  cwd 는 `$STAGE` 이므로 저장소 밖이고(DD2), GATE-D 가 그 사실을 사후에 증명한다.
- **스크립트 경로 주의.** `new-work.md` 는 `node .claude/skills/impeccable/scripts/concept-seed.mjs`
  라고 **저장소 상대 경로**로 적는데, plugin 설치에는 그런 자리가 없고 cwd 는 `$STAGE` 다.
  절대 경로(GATE-A 가 해석한 `$SKILL/scripts/…`)로 부른다.
- **Layout·Shapes 는 값 없이 규칙 수준으로만 쓴다.** `DESIGN.md` 에 대응 절이 아예 없어 이름으로 상속할 대상이 없고, seed 가 그 두 절을 구체 수치로 채우면 `gate-final` 의 토큰 전수 검사가 죽는다 — 원본 토큰에 `1px`·`12px`·`1rem` 이 있고 대조가 `grep -F` 라 `1px` 는 `21px` 안에서도 걸리므로 px 값이 하나라도 들어가면 사실상 확정 실패다. 이것은 UI6·DD7 이 이미 요구하는 바이며 답안지에 문장이 없었을 뿐이다(백로그 `542b95a0` 조치). **이 경우 `gate-final` 의 실패 문구("상속 값이 복사됐다 — 참조로 바꿔라")는 오해를 부른다 — 참조할 원본 절이 없으므로 올바른 복구는 참조 전환이 아니라 값 삭제다**

## tag-map — Task 6 이 붙일 태그의 선언 (DD15)

<!-- 형식은 `<파일>|<헤더 본문(태그 제외, 앞뒤 공백 없이)>|<셸|시계>` 이고 한 줄에 하나다.
     PRODUCT.md·DESIGN.md 의 `## ` 절 **전부**를 빠짐없이, 중복 없이 덮어야 한다 —
     GATE-E 가 (1) 행 수와 절 수가 같은지 (2) 실제 태그가 선언과 같은지를 대조한다.
     경계는 DD5 다: 좌열 넷(주인공·성공 지표·anti-reference 적용 범위·두 상태 계약)에
     걸리는 절이 [시계], 나머지가 [셸]. **판단은 여전히 사람이 하고**, 게이트가 잡는 것은
     선언과 산출물이 어긋나는 것뿐이다. Task 6 에서 선언이 틀렸음을 알게 되면 복구는
     GATE-A 부터 다시 도는 것이며, 그 재실행은 판정 기준 지문이 달라지므로 PRD 기록
     줄에 드러난다(DD14). 아래는 착수 시점 절 구성에 대응하는 **초안**이다 — Task 0 이
     붙여 넣기 전에 확인한다. 절 구성이 바뀌면 함께 고친다. -->

tag-map: PRODUCT.md|Register|셸
tag-map: PRODUCT.md|Users|셸
tag-map: PRODUCT.md|Product Purpose|시계
tag-map: PRODUCT.md|Brand Personality|시계
tag-map: PRODUCT.md|Anti-references|시계
tag-map: PRODUCT.md|Design Principles|시계
tag-map: PRODUCT.md|Accessibility & Inclusion|셸
tag-map: PRODUCT.md|이 문서의 범위|시계
tag-map: DESIGN.md|1. Overview: 사진 위의 유리판|시계
tag-map: DESIGN.md|2. Colors: 유일한 hue|셸
tag-map: DESIGN.md|3. Typography|셸
tag-map: DESIGN.md|4. Elevation: 유리라는 깊이|셸
tag-map: DESIGN.md|5. Components|시계
tag-map: DESIGN.md|6. Do's and Don'ts|셸

## must-contain — 생성물에 반드시 있어야 하는 문자열

must-contain: 상기
must-contain: Esc
must-contain: 제안까지
must-contain: 택일
must-contain: 면적 예산이 아니라

## must-inherit — Brand Commitments 가 이름으로 가리켜야 하는 절 (DD23)

<!-- DD13 이 산문으로 고른 상속 목록을 **기계가 읽는 줄**로 내린 것이다. GATE-C 가
     `PRODUCT.calendar.md` 의 `## Brand Commitments` 절 **안에서만** 이 문자열들을 찾는다.
     문서 아무 데나 있으면 통과하던 것과 다르다 — 상속 선언은 그 절에 있어야 채널이다. -->

must-inherit: 4절 Elevation
must-inherit: 4절 Named Rules
must-inherit: 2절 Named Rules
must-inherit: 3절 Typography
must-inherit: 6절 Do's and Don'ts
```

**초안에서 다투는 행이 넷이고, Task 0 이 확인해야 하는 것이 정확히 그 넷이다.** 나머지 열은 다툴 여지가 없다.

| 절 | 초안 | 왜 다투는가 |
|---|---|---|
| `PRODUCT.md` Brand Personality | 시계 | 목소리(담백한 한국어, 저장 실패 예외)는 모드 무관인데 "주인공은 사진이고 UI는 유리판"이 좌열 1이다. 한 절이 두 층위를 걸친다 — 좌열이 하나라도 있으면 `[시계]` 로 간다는 것이 이 초안의 규칙이다 |
| `PRODUCT.md` Anti-references | 시계 | 목록 자체는 재료지만 DD5 좌열 3이 **적용 범위**를 좌열로 규정한다. 특히 "업무용 SaaS 대시보드"는 업무 캘린더가 부분적으로 완화해야 하는 항목이라 범위가 실제로 갈린다 |
| `PRODUCT.md` Design Principles | 시계 | **태그 도식이 깔끔하게 타이핑하지 못하는 유일한 절이다.** 원칙 1(배경이 주인공)은 좌열이고 원칙 2·3·4·5(유리·대비·슬라이더·저장)는 재료다. 절 단위 태그로는 둘을 가를 수 없어 좌열 우선 규칙으로 `[시계]` 를 준다. 캘린더 문서가 원칙 2~5를 잃지는 않는다 — DD4의 절 이름 참조로 따로 상속하며, 태그는 "이 절이 두 모드를 대변하는가"만 말한다 |
| `DESIGN.md` 5. Components | 시계 | 시계 위젯 스펙이 들어 있어 모드 고유다. 다만 Buttons·Inputs 같은 셸 컴포넌트도 같은 절에 있어 위와 같은 혼재가 약하게 있다 |

혼재 절 문제는 **M1에서 고치지 않는다.** 고치려면 두 원본 문서를 절 단위로 쪼개야 하고 그것은 UI8(코드 무변경)의 범위는 넘지 않으나 이 마일스톤의 범위는 넘는다. 초안이 좌열 우선 규칙을 쓴다는 사실과 그 결과 `[시계]` 가 넉넉하게 붙는다는 사실을 적어 둔다 — 방향이 **과잉 표시**이므로 캘린더 문서가 상속을 놓치는 쪽이 아니라 원본이 시계 쪽으로 넉넉히 기우는 쪽으로 틀린다.

`must-contain` 앞 네 줄은 조사 노트 판정 1이 "새 문서에 반드시 들어가야 할 것"으로 든 넷에 대응한다 — ambient의 성공 지표(상기), 두 상태 계약의 이탈 키(Esc), 매니저의 경계(제안까지 하고 결정은 사용자), 그리고 두 문서가 공유하는 단 하나(모드는 택일)다. 늘리는 것은 자유이나 줄이면 GATE-C가 그만큼 느슨해진다.

**다섯째 줄은 성격이 다르다.** `면적 예산이 아니라` 는 DD5 의 근거 재바인딩 예외를 문자열로 물린 것이다. 그 예외는 "값은 상속하되 근거가 좌열에 매여 있으면 근거만 다시 쓴다"는 규칙인데, 규칙만 플랜에 적어 두면 생성물이 그것을 반영했는지 아무도 확인하지 않는다 — 5차 패널 test 가 HIGH 로 지적한 자리다. 캘린더 문서가 알파를 올리지 않는 이유를 면적 예산이 **아닌** 것으로 다시 적으면 이 문자열이 자연히 들어오고, 안 적으면 GATE-C 가 죽는다. 문자열 검사가 논증을 판정하지는 못하지만, **논증이 그 자리에 있기는 한지**는 판정한다.

**이 스크립트가 저장소의 유일한 자동 판정 수단이다.** `test/positioning.smoke.js`는 위치 회귀 전용이라 이 마일스톤을 검사하지 않고, `package.json`도 테스트 러너도 없다. 그래서 판정을 산문 체크리스트로 두지 않고 실행 가능한 코드로 만들었다 — 1차 리뷰 패널 invariant 관점이 지적한 것이 정확히 그 점이었다.

### 이 스크립트를 실제로 돌려 본 기록 (2026-08-22, Task 0 이전)

다섯 라운드의 패널이 이 스크립트를 **읽고** 지적했지 **돌려 본** 적은 없다. 돌려 보니 읽어서는 나오지 않는 것이 나왔으므로 결과를 남긴다. 아래는 전부 플랜 본문의 `bash` 블록을 그대로 뽑아 저장소 밖 임시 자리에서 실행한 것이고, 저장소에는 한 글자도 쓰지 않았다.

| 검사 | 결과 | 무엇이 확인됐나 |
|---|---|---|
| 블록 추출 (GATE-A 의 awk) | 433행, 유일한 `bash` 블록 | 플랜에 `bash` 펜스가 하나뿐이라 `gate-final)` 조건 없이도 모호하지 않다. 추출-바이트비교 장치가 성립한다 |
| `bash -n` 문법 검사 | 통과 | 옮겨 적기 전에 이미 파싱된다 |
| `refs_resolve` 를 **원본 두 문서**에 (gate-final 619행) | **죽는다** — `DESIGN.md의 Glass 절에 있다` 를 실재하지 않는 참조로 잡음 | DD12 가 고치려는 결함이 게이트에 **실제로** 걸린다. 5차 패널이 "이 결함은 gate-final 까지 안 잡힌다"고 본 자리이며, 잡히는 것이 맞고 잡히는 시점도 설계대로다(Task 5 가 고치고 gate-final 이 판정한다) |
| DD12 확정 대체 문장 | **통과** — `brightness` 규칙 이름에 낱말 경계로 적중 | DD12 가 못박은 문안이 자기 게이트를 통과한다는 것이 확인됐다. 직전 라운드에 "플랜이 규정한 참조 형태가 자기 게이트에서 죽던" 결함이 있었으므로 이 확인은 형식적이지 않다 |
| `strip_code_spans` 회귀 | 죽은 `Glass` 참조가 더는 값에서 이름을 얻지 못함 | 4차 라운드에 열렸던 fail-open 이 닫혔다 |
| `gate-final` 두 번째 실행 | 즉시 `판정 기준 지문이 없다` 로 죽음 | 5차 패널 invariant MEDIUM 이 "정리 뒤 재실행이 **지연된** 실패를 낸다"고 본 것은 사실이 아니다. 첫 줄의 `criteria_unchanged` 에서 즉시 fail-closed 다 |
| `gate-final` 토큰 전수 추출 | 원본에서 **108개** | 통과 가능한 규모다. 다만 `1px`·`1:1`·`1s` 처럼 짧은 토큰이 `grep -F` 부분문자열로 오탐을 만들 수 있다(`1px` 가 `21px` 안에서 걸린다). Risks 표의 "과잉 차단" 행이 말하는 것이 이것이고, 답안지의 Layout·Shapes 항목이 그 첫 방어다 |
| GATE-A 계약 문자열 × 판본 둘 | 4.1.1 넷 적중 / 3.5.0 한 건 누락 | 내용 검사가 실제로 두 판본을 가른다(DD1) |
| DD19 의 plugin 경로 탐지 | **처음엔 조용히 빈 값** → 고친 뒤 후보 1개·`4.1.1` 적중 | `node -e` 최상위 `return` 이 문법 오류(`Illegal return statement`)인데 `try/catch` 는 파싱 오류를 잡지 못하고 `2>/dev/null` 이 그 사실을 가렸다. **읽어서는 통과하고 돌려야만 죽는 종류**이고, 이 표가 존재하는 이유다 |
| `gate-a` 전체 실행 (현재 환경) | `[GATE-FAIL]` 레거시 설치본 잔존 | DD19 가드가 **첫 번째로** 걸리고 진단이 고칠 수 있는 것을 가리킨다. 이 환경에서 M1 착수의 실제 선행 조건은 `~/.claude/skills/impeccable` 제거다 |
| DD21 절 번호 대조 × 6가지 참조 (`set -euo pipefail`) | `4절 The brightness Rule` 통과 · **`2절 The brightness Rule` 차단** · 번호 없는 참조 통과 · `2절 Named Rules` 통과 · 죽은 `Glass` 차단 · 혼합 참조 통과 | 6차 패널 architect 가 든 바로 그 시나리오(번호만 틀린 참조)가 이제 죽는다. 원본에서 뽑은 `번호\|이름` 42행이 대조표다 |
| DD21 구현 중 발견한 **자기 회귀** | 번호 없는 참조가 **빈 진단과 함께** 게이트를 죽였다 → 고침 | `grep -oE '[0-9]+절'` 이 정당하게 0건을 내면 `pipefail` 이 그 1을 대입문 종료 코드로 만들고 `set -e` 가 메시지 없이 죽인다. `\|\| true` 와 `return 0` 둘 다 필요했다. **읽어서는 옳아 보이는 코드였다** — 이 표가 두 번째로 값을 한 자리 |
| DD20 Open Question 검사 × 3상태 | 현재 PRD(미해소) 차단 · Task 7 후(해소) 통과 · **체크만·근거없음 차단** | 셋을 한 줄에 요구하는 설계가 실제로 "체크만 하고 근거 없음"을 가른다 |
| `refs_resolve` 원본 회귀 재확인 (DD21 적용 후) | 여전히 `Glass` 를 차단 | 번호 대조를 얹으면서 기존 존재 검사가 무뎌지지 않았다 |
| DD23 `must-inherit` × 4상태 | 다섯 다 선언 통과 · 하나만 선언 차단 · **다른 절에 적음 차단** · 빈 절 차단 | 세 번째가 이 검사의 요점이다 — 절 이름이 문서 어딘가에 있는 것과 Brand Commitments **안에** 있는 것은 다르고, 범위를 좁히지 않으면 채널이 아니라 문자열을 확인한 것이 된다 |
| DD24 답안지↔플랜 결속 × 4상태 | 템플릿 그대로 통과 · 늘림 통과 · `면적 예산이 아니라` 삭제 차단 · `3절 Typography` 삭제 차단 | 상위집합 규칙이 "늘리는 것은 자유, 빼는 것은 불가"로 정확히 동작한다. 플랜 템플릿에서 뽑히는 판정 항목은 10개 |
| **부트스트랩 순서** — `git add` 한 미커밋 파일이 `tracked()` 를 통과하는가 | `git add` **전 실패 · 후 통과**(커밋 없음) | Task 0 의 순서(생성 → `git add` → `gate-a`)가 성립한다. 6차 test·8차 invariant 가 CRITICAL 로 보고한 "논리적 불가능"은 `tracked()` 가 커밋이 아니라 **인덱스**를 본다는 사실을 놓친 것이다. 같은 오독이 두 번 나왔으므로 Task 0 머리에 기전을 못박았다 |
| **DD22 의 CRLF 위험** — 실재하는가 | 위 프로브 도중 git 이 스스로 경고: `LF will be replaced by CRLF the next time Git touches it` | 추정이 아니라 **git 자신의 진단**이다. `core.autocrlf=true` 인 이 저장소에서 `.gitattributes` 없이 `verify.sh` 를 커밋하면 재체크아웃 시 CRLF 가 되고 bash 가 죽는다. DD22 의 두 장치(`.gitattributes` + GATE-A 의 CR 검사)가 각각 원인과 증상을 막는다 |
| DD25 절 순서 × 3상태 | 정규 순서 통과 · Overview/Colors 뒤바뀜 차단 · Components 끼어듦은 순서 검사 **통과** | 마지막이 설계대로다 — Components 는 부재 검사와 `NSEC=7` 이 각각 잡고, 순서 검사는 순서만 본다. 한 검사가 여러 축을 겸하면 어느 축이 죽었는지 진단이 말하지 못한다 |

**함께 발견한, 이 마일스톤이 고치지 않는 것.** 죽은 `Glass` 참조는 `PRODUCT.md:108` 에만 있는 것이 아니라 **`newtab.css:2153` 주석에도 똑같이 있다**(`텍스트가 아니라 표면(brightness) 쪽에서 풀어야 한다 — DESIGN.md의 Glass 절`). UI8이 코드 무변경을 못박으므로 M1은 이것을 건드리지 않으며, `refs_resolve` 도 문서 넷만 본다. **그래서 M1 종료 시점에도 저장소에는 같은 죽은 참조가 하나 남는다** — 고쳤다고 적을 수 없는 자리이므로 백로그로 넘긴다. 값 쪽은 확인해 두었다: 실제 CSS 는 `brightness(0.62)`(`newtab.css:862`·`:1493`)이므로 `DESIGN.md:357` 이 옳고 `PRODUCT.md:108` 의 `0.60` 이 틀렸다. **DD12 의 방향이 "frontmatter 가 규범이므로"라는 문서 규약이 아니라 코드로 뒷받침된다.**

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **impeccable 판본이 또 올라가 DD1·DD3·DD13·DD18의 근거가 달라진다** | High | 이미 두 번 일어났다. 한 번은 판본이 올라가서(3.x → 4.x, seed 인터뷰가 통째로 교체됐다), 한 번은 **배포 채널이 바뀌어 경로가 옛 설치본을 가리켜서**다(DD19). GATE-A가 버전 대조에 더해 `reference/document.md` 의 seed 계약 **문장 셋을 내용으로** 확인하고, 그 검사가 두 판본을 실제로 가르는 것이 실측됐다(DD1). 버전만 보면 문구가 바뀐 패치판을 놓친다 |
| **경로가 옛 설치본을 가리켜 게이트가 엉뚱한 판본을 검사한다** | Medium | 이 라운드에 실제로 일어난 실패다 — 플랜은 plugin 판본을 정확히 기술했는데 `SKILL` 이 `~/.claude/skills/impeccable` 로 하드코딩돼 있어 게이트가 3.5.0 을 관측했다. DD19가 경로를 `installed_plugins.json` 에서 **탐지**하고 레거시 설치본의 공존 자체를 실패로 처리한다. 남는 위험은 plugin 매니페스트 형식이 바뀌는 것이며, 그때는 탐지가 빈 값을 내고 GATE-A가 진단과 함께 죽는다(fail-closed) |
| **world workshop 이 절차적으로 무겁고 대화형이다** | High | 4.1.1의 seed 는 `concept-seed.mjs` 주사위와 `serve-question.mjs` 가 띄우는 로컬 결정 페이지를 요구한다(DD18). 이 하네스에서 포트 바인딩이나 브라우저 열기가 막히면 구조화 도구로 폴백하고, **거기서도 답이 없으면 new-work 는 배정된 방향으로 무인 진행한다** — 즉 무응답이 곧 상속 포기다. 그래서 답안지가 `pinned-direction:` 을 미리 못박고 GATE-A 가 그 줄의 존재를 확인한다. 게이트가 잡지 못하는 것은 "핀을 실제로 냈는가"이며 그것은 산출물 형태 검사(DD13·DD16·토큰)와 Acceptance 통독이 사후에 맡는다 |
| **seed가 상속 대신 새 시각 세계를 발명한다** | High | 4.1.1의 seed는 new-work의 world workshop을 태우므로 발명이 기본 동작이다. DD13이 상속을 `## Brand Commitments`로 실어 보낸다. **GATE-C가 보는 것은 상속의 반영이 아니라 그 채널의 형태다** — Brand Commitments 절의 존재, 그것이 `DESIGN.md`를 절 이름으로 가리키는 것, 그 절 이름이 원본에 실재하는 것 셋이다. 값이 옮겨졌는지는 `gate-final`의 토큰 전수 검사가 따로 본다. **어느 쪽도 "상속한다고 적고 실제로는 새로 정의했는가"를 판정하지 못하며**, 그 잔여는 Acceptance의 통독 항목이 맡는다(DD13 마지막 문단). 게이트가 죽으면 복구는 답안지 문안을 더 강하게 고쳐 다시 도는 것이다 |
| **staging이 저장소를 집는다** | Medium | GATE-B가 경로 검사(`$ROOT` 하위 금지)와 **양성 프로브**(`PRODUCT_INIT_REQUIRED` 존재 + `incumbent visual implementation` 부재)를 함께 본다. 프로브가 기존 구현을 보면 `--seed`는 거부되므로 생성을 시작조차 하지 않는다 |
| **생성물이 시계 모드 내용을 베낀다** | Medium | staging 에서는 로더가 저장소 코드를 읽지 않으므로 직전 판본보다 위험이 낮다. 남는 경로는 사람이 답안지 밖의 말을 넣는 것이며, GATE-C의 `must-contain`이 필요한 것이 들어왔는지를, `gate-final`의 어휘 검사가 들어오면 안 되는 것이 샜는지를 각각 본다 |
| **`--seed`가 무시되고 scan 모드로 빠진다** | Low | GATE-C가 seed 마커와 Components 절 부재를 함께 보므로 어느 쪽으로 빠져도 잡힌다. 사이드카는 저장소에 있고 staging 에는 없으므로 애초에 쓸 대상이 없다 |
| **두 문서 표류** — 상속 값이 갈라진다 | Medium | `gate-final`이 원본에서 측정치 토큰을 **기계적으로 추출해 전부** 대조한다. 손으로 고른 목록이 아니므로 새 값이 원본에 생겨도 자동으로 검사 대상이 된다 |
| **토큰 정규식의 과잉 차단** | Medium | 지속시간 단위 `s` 를 넣은 대가로 산문의 "3s" 같은 문자열도 걸릴 수 있다. 방향이 **과잉 차단**이므로 감수한다 — 놓치는 것보다 낫고, 걸리면 그 자리를 참조로 바꾸면 된다 |
| **M1 판정이 자기충족적이다** — 작성자가 판정자다 | High | PRD가 이미 "검증되지 않았다"고 적었다. DD7이 값 선결을 거부해 판정을 "규칙이 결정을 내리게 하는가"로 좁힌다. 남는 약점이므로 Acceptance에 한 명이 두 역할을 한다는 사실을 명시한다 |
| **fan-out 결과를 M1에서 소비하려는 유혹** | Medium | DD9가 경계를 긋는다. CRITICAL 7건은 전부 M2의 데이터 모델 결정이며, M1에서 손대면 코드 무변경 전제가 깨진다 |
| **태그가 붙었으나 잘못 붙는다** — `[셸]`이어야 할 절에 `[시계]`가 간다 | Medium | **절반은 게이트가 잡는다(DD15).** 답안지 `tag-map` 이 절마다 기대 태그를 Task 0 시점에 선언하고 GATE-E 가 산출물과 대조하므로, **선언과 다르게 붙는 것**은 죽는다. 남는 것은 **선언 자체가 틀린 경우**이고 그것은 여전히 사람 몫이다 — 어느 절이 모드 무관인지는 DD5의 경계를 적용해야 알기 때문이다. 다만 그 판단이 이제 추적되는 파일에 적히고 같은 커밋에 들어가므로(DD8) diff 에 보인다. 초안 14행 중 다투는 넷(Brand Personality·Anti-references·Design Principles·Components)은 답안지 형식 절에 표로 따로 적어 뒀고, 혼재 절 문제는 좌열 우선 규칙으로 **과잉 표시** 쪽으로 틀리게 뒀다 |
| **게이트를 건너뛰고 Acceptance를 체크한다** | Medium | Acceptance의 마지막 항목이 체크박스가 아니라 **`gate-final`의 종료 코드**다. 그리고 `gate-final`은 PRD의 게이트 기록이 현재 플랜 sha256을 담는지까지 보므로, 옛 판본에서 통과한 기록을 재사용할 수 없다. **다만 게이트 실행 자체를 강제하는 것은 없다** — 이 저장소에 CI도 커밋 훅도 없어 `gate-final`과 커밋 사이를 잇는 것은 Task 7의 문장 하나다. 3차 패널 invariant가 지적한 그대로이고, M1에서 CI를 세우는 것은 UI8(코드 무변경)과 범위를 함께 넘는다. 남는 규율 의존이라고 적어 둔다 |
| **게이트가 형식은 보되 의미는 못 본다** | High | 이 마일스톤의 판정 대상은 산문이고, 셸 스크립트가 볼 수 있는 것은 문자열의 존재·부재·형태다. 그래서 3차 패널이 같은 지적을 네 자리에서 냈다 — `must-contain`은 부분문자열이지 의미가 아니고, seed 마커는 주석 한 줄이며, `gate-e`는 태그를 세지 판단하지 않고, 상속 참조는 절 이름이 실재하는지까지만 본다. **가능한 만큼은 기계로 좁혔다**: 헤더 검사를 헤더 줄에 물렸고, 참조가 원본의 실재 절 이름에 닿는지 확인하며, 값 복사는 토큰 추출로 전수 검사한다. 그 위에 남는 것 — "상속한다고 적고 실제로는 새로 정의했는가" — 은 Acceptance의 통독 항목과 대리 판정이 맡는다. 게이트가 그것까지 잡는 척하지 않는 편이 낫다 |
| **베이스라인·판정기준·게이트 원장 파일이 실수로 커밋된다** | Low | 셋 다 게이트 사이에만 존재하고 `gate-final`이 함께 지운다. 게이트가 중간에 죽으면 남으므로, Task 0에서 `.gitignore`의 관리 블록 밖에 세 줄(`.claude/plans/.m1-baseline.sha256` · `.claude/plans/.m1-criteria.sha256` · `.claude/plans/.m1-gates.log`)을 더해 창을 닫는다 |
| **Task 5의 손편집 오류가 `gate-final`에서야 드러난다** | Medium | **고치지 않기로 한다.** 4차 패널 invariant MEDIUM 이 "편집 뒤에야 검증한다"고 지적했으나, DD11이 그 경계를 이미 그었다 — 게이트는 되돌릴 수 없는 단계 앞에 서고 Task 5는 되돌릴 수 있다. 만지는 두 파일은 GATE-A가 HEAD와 일치함을 확인했고 GATE-D가 그때까지 무변경임을 증명했으므로 `git checkout -- PRODUCT.md DESIGN.md`가 항상 완전 복구다. 여기에 중간 게이트를 하나 더 세우면 `gate-final`의 부분집합이 되어 같은 검사를 두 자리에서 유지하게 된다 |
| **참조 추출 정규식이 80자까지 허용해 이상한 문자열을 받는다** | Low | 4차 패널 invariant LOW. **의도적으로 넓다** — 창이 좁아서 DD4가 규정한 참조 형태를 잘라내던 것이 이번에 고친 결함이고, 방향을 반대로 되돌리면 같은 결함이 돌아온다. 추출은 넓게 하고 판정은 `refs_resolve`의 낱말 경계 대조가 좁게 한다. 이상한 문자열은 추출되더라도 실재 절 이름에 낱말 경계로 닿지 못하면 게이트를 죽인다 |

## Design Routing Guide

routing mode: `auto` (effective at implement stage). At implement the design gate routes these stage-appropriate impeccable commands; here they are a checklist only.

| Stage | Command |
|---|---|
| discovery | `/impeccable shape` |
| refine | `/impeccable layout` |
| refine | `/impeccable typeset` |
| refine | `/impeccable animate` |
| refine | `/impeccable colorize` |
| refine | `/impeccable bolder` |
| refine | `/impeccable quieter` |
| refine | `/impeccable overdrive` |
| refine | `/impeccable delight` |
| simplify | `/impeccable adapt` |
| simplify | `/impeccable distill` |
| simplify | `/impeccable clarify` |
| evaluate | `/impeccable critique` |
| evaluate | `/impeccable audit` |
| harden | `/impeccable harden` |
| harden | `/impeccable optimize` |
| harden | `/impeccable onboard` |
| polish | `/impeccable polish` |
| system | `/impeccable document` |
| system | `/impeccable extract` |

> **M1이 실제로 쓰는 것은 `system` 단계의 `/impeccable document`와 `init`뿐이다**(PRD가 예고한 대로 순서가 반대다). 나머지 행은 M3·M4가 통상 순서로 소비하며, 그때 문서를 다시 만드는 경로는 DD10의 반복 절차다. 이 플랜의 `/impeccable shape`는 이미 GROUND에서 소비됐고, 그 결과가 위 User Intent와 Design Decisions다.

## Acceptance

- [ ] Task 0~7 전부 완료
- [ ] **환경 선행 조건이 충족됐다**(DD19): `~/.claude/skills/impeccable`(폐지된 CLI 채널의 3.5.0)이 제거됐고, GATE-A 가 해석한 `$SKILL` 이 plugin 경로 하나이며 `SKILL.md` 의 `version` 이 답안지 고정값과 같다. 이 항목은 체크박스가 아니라 GATE-A 의 종료 코드가 판정한다
- [ ] **workshop 에서 핀이 실제로 들어갔다**(DD18): Task 3 의 결정 페이지에서 주사위가 딜한 방향이 아니라 답안지의 `pinned-direction:` 이 잠겼다. **게이트는 이것을 잡지 못한다** — 잡는 것은 산출물 쪽 형태 검사(Brand Commitments·절 이름 실재·이름 충돌·토큰 전수)와 아래 통독이며, 그 둘이 모두 통과했는데 세계가 바뀌어 있을 가능성이 남는다는 사실을 판정 기록에 적는다
- [ ] **`bash .claude/plans/work-calendar-m1.verify.sh gate-final`이 종료 코드 0** — 이 항목이 위 체크박스들의 실질이다. 개별 항목을 손으로 체크하는 것으로는 대신할 수 없고, 게이트가 현재 플랜 sha256을 확인하므로 옛 판본의 통과 기록을 재사용할 수도 없다
- [ ] 다섯 게이트(A·B·C·D·E)가 각각 자기 Task 앞에서 0을 냈다 — 마지막에 몰아서 돌린 것이 아니다(DD11)
- [ ] Patterns 재사용, 재발명 아님 — 문서 형식은 4.1.1의 정규 절 순서와 `DESIGN.md:357`의 Named Rule 관용구를 따른다
- [ ] **상속이 실제로 상속됐다**(DD13): `DESIGN.calendar.md`가 시각 재료를 새로 정의하지 않고 `DESIGN.md`의 절을 이름으로 가리킨다. GATE-C가 형식을, 사람이 통독으로 내용을 본다
- [ ] **대리 판정**(PRD Open Question 해소안, DD7·DD26): `DESIGN.calendar.md`만 열어 놓고 M3의 시각 결정 두 개를 실제로 내려 본다. 첫째, 오늘 줄이 제목을 담을 때 대비를 **어떤 절차로** 다시 재는가 — 통과 조건은 답이 **절차**이고 `PRODUCT.md` 대비 실측 표의 축 셋(무엇을 무슨 배경 위에 렌더해 재는가 · 어떤 값을 읽는가 · 어떤 기준과 대조하는가)을 이름으로 갖추는 것이다. 둘째, 겹친 부하를 중요도(이미 알파 단계 사용)와 **어떤 축으로** 가르는가 — 통과 조건은 **알파도 hue 도 아닌 축을 하나 지목**하는 것이다("형태로 가른다"까지만은 물음의 반복이지 답이 아니다). 두 물음에 문서가 답하지 못하면 M1은 미완이다.
- [ ] **그 판정을 PRD에 적었다**(DD26): 답 둘을 PRD의 "M1의 산출물을 무엇으로 판정하는가" 해소 줄에 기록한다. 그 줄의 존재는 `gate-final`이 DD20으로 이미 요구하므로, 판정을 건너뛰면 게이트가 죽는다. **판정자와 작성자가 같은 사람이라는 한계를 그 기록에 함께 적는다** — 게이트가 보증하는 것은 판정이 기록됐다는 사실이지 판정이 옳다는 것이 아니다
- [ ] 게이트/경로를 실제로 1회 완주하고 산출물을 확인 — staging 절차(GATE-A → staging 확보 → GATE-B → 생성 둘 → GATE-C → GATE-D)를 끝까지 한 번 돌리고, 그 결과로 루트 세 파일(`PRODUCT.md`·`DESIGN.md`·`.impeccable/design.json`)의 sha256이 GATE-A 베이스라인과 일치하며 캘린더 두 문서가 실재한다. 검사 항목이 개별로 통과하는 것과 절차가 완주되는 것은 다르다

## Multi-Perspective Fan-out

<!-- Auto-injected by /mccp:plan Phase 2.5 fan-out (read-only). -->

**Coverage**: 4/4 perspectives (architect, security, test, explorer) · spent ~48k.

### Findings (severity-ranked)

- **[CRITICAL][architect]** Data model v4 migration path is underspecified. PRD Open Question 1 (line 137-138) must be resolved before M2 implementation: should existing single-date events migrate to (a) start + end gates OR (b) single end gate? Decision affects stored event semantics. — PRD line 137-138: '[연속 범위를 파생값으로 강등하는 마이그레이션.] 저장된 기존 일정을 "시작 관문 + 종료 관문 둘"로 승격하는 것이 자명한가, 아니면 **종료 관문 하나만** 두는 것이 실제 의도(마감일)에 가까운가'; newtab.js:410-448 shows existing migration pattern (v3) with guards but no v4 design yet.
- **[CRITICAL][architect]** Gate model requires new rendering architecture. Current CalendarManager assumes continuous date ranges (startDate/endDate) with single-pass windowed indexing (rebuildIndex). Gate model treats gates as points, making current eventsByDate Map and renderGrid unsuitable for non-continuous task scheduling (e.g., 1-2-1 pattern, PRD evidence 2). — PRD meta doc (2026-08-20-calendar-mode-work-goal.md line 54-62): '[1(월) - 2(화) - 1(수)]는 더 근본적인 것을 건드린다. 현재 모델은 연속 범위 하나뿐이라 이 배치를 표현할 수 없다'; newtab.js:2097-2119 rebuildIndex() only spans continuous ranges; newtab.js:2129-2131 getEventsForDate() assumes range overlap check
- **[CRITICAL][architect]** Project entity missing from storage schema. New data model requires projects to group tasks, but current single-key `calendarEvents` array stores only flat task list with no project reference. Storage key organization strategy for projects, gates, and typed memos is not yet designed. — PRD Scope M2 (line 96-97): 'プロジェクトで묶인 작업이 자유롭게 조합된 관문을 갖고'; current newtab.js:198-213 CalendarEvent typedef has no `projectId` or gate/stage fields; manifest.json:9 has `unlimitedStorage` but no key partitioning strategy yet
- **[CRITICAL][test]** Migration path is undecided between two models (시작 관문 + 종료 관문 둘 vs 종료 관문 하나). This choice bakes into the migration function's semantics and cannot be fixed retroactively on user data. No test strategy distinguishes which path is correct without violating the assumption. — PRD Open Question line 137: '종료 관문 하나만 두는 것이 실제 의도에 가까운가'. Meta doc 2026-08-20-calendar-notes-integration.md Verdict 2 line 177: '마이그레이션 부담이 커진다 — 기존 범위 이벤트는 "시작 관문 + 종료 관문 2개"로 승격하는 것이 자명한 경로로 보이나, 확인이 필요하다'. Existing v2 migration (test/positioning.smoke.js:494-548) has three test cases (promote, idempotent, legacy-preserved) but no branching validation for two models.
- **[CRITICAL][explorer]** Migration pattern for schema versioning exists and should be followed exactly - migrateCalendarToV3() uses independent version guards and preserves legacy fields for downgrade safety — newtab.js:86 migrateSettingsToV2() + newtab.js:410 migrateCalendarToV3() both use self-contained version checks. Work-calendar.prd.md M2 requires migration from range-based to gate-based model - must follow this pattern.
- **[CRITICAL][explorer]** Backward compatibility risks: existing 'done' boolean field + startDate/endDate range model will collide with gate model. Rollback safety requires preserving old fields during migration (like 'date' field in M1→M3) — newtab.js:327-330 preserves 'date' field as DD6 rollback path. Work-calendar investigative doc Verdict section asks 'Ascending path unclear: single date to gates - obvious to add start/end gates or just end gate?' Open question not yet resolved.
- **[CRITICAL][explorer]** Project concept does not exist in data model - no 'project' field on CalendarEvent, no grouping structure. This is the largest gap. Must be introduced in M2 along with gate model. — newtab.js:198-213 CalendarEvent typedef has no project field. PR invocation requirement 'project단위로 묶인 다단계 관문' requires new data structure.
- **[HIGH][architect]** Memo categorization type system not designed. PRD M4 introduces memos with 8 minimum types (account/link/term/flow/spec/issue/deploy/memo) but current `note` field is untyped string. Type system scope (attachment points: project vs task vs gate?), nesting depth, and backward compat path for v3 `note` field are unspecified. — PRD line 143-144: 'メモ 종류의 최종 개수. 여덟(계정·링크·용어·플로우·스펙·이슈·배포·메모)을 **하한**으로 두고 확정하지 않는다'; newtab.js:206 `note` is single string, no type field; meta doc line 226 mentions memo attachment to both tasks and projects but structure unclear
- **[HIGH][architect]** Calendar mode product/design document separation breaks coupling to main PRODUCT.md. PRD mandates separate documents because success metrics differ (calendar: reminder surface vs clock: background photo). Current codebase has no explicit mode-level namespace, versioning, or reference binding to separate product docs. — PRD line 95-97 M1 outcome: 'M3의 시각 판단이 근거 문서가 없다' until M1 splits docs; meta doc verdict 1 (line 143-150): 'PRODUCT.md는 시계 모드(가정용) 문서로 확정...캘린더 모드용 제품 문서를 만든다...두 문서가 공유하는 것은 딱 하나 — **모드는 택일이며 공존하지 않는다**'; no current separation in code organization
- **[HIGH][architect]** Export strategy is single-purpose, needs splitting. Current persistEvents()/backup path dumps JSON as single format. PRD M5 requires dual-format export (JSON backup + iCal `.ics`), with potential task-only/memo-only extractions. Current code provides no export plugin or format strategy. — PRD line 139-140 Open Question: 'メモと캘린더의 내보내기를 어떻게 가르는가...세 조합을 다 만들 것인가'; meta doc verdict 5 (line 228-234): 'Google Calendar 연동용 `.ics`와 백업용 JSON을 분리...관문 하나 = `VEVENT` 하나로 내보낸다'; newtab.js:4036-4058 export only handles JSON, no format abstraction
- **[HIGH][architect]** Migration v3→v4 creates multi-step consistency risk. Existing v2→v3 migrations use idempotent per-version guards and single atomic set(). Gate model migration must transform both task structure AND introduce new entities (gates). Design must prevent partial states (e.g., tasks upgraded but gates not initialized). — PRD risk (line 154-155): '**데이터 모델 3차 변경** — 단일 날짜 → 범위 → 관문 집합. 이전 변경 이후 얼마 지나지 않았다...기존 마이그레이션 관용구와 스모크 하네스를 재사용'; newtab.js:366-390 migrateSettingsToV2() uses single gate check; migrateCalendarToV3() (410-448) also atomic but far simpler than gate promotion will be
- **[HIGH][security]** Sensitive project reference data (credentials, API keys, internal URLs) will be stored unencrypted in memo fields with no masking or visibility toggle — PRD work-calendar.prd.md line 12: '프로젝트별 참조 정보(계정, 문서 위치, 용어, 서비스 플로우)'. PRD line 82 explicitly defers encryption: '저장 데이터 암호화 (AES) | 위협 모델상 로컬 PC가 뚫리면 다른 credential도 함께 뚫린다. 마스킹·잠금·보기 토글은 실제 위협을 줄이지 않는다 → backlog'. MVP memo fields (M2/M4) store account info, links, specs, deployment details without masking UI.
- **[HIGH][security]** Data model migration (third iteration: date → range → gate collection) creates corruption and data loss vectors during version transitions — PRD line 154 identifies as 'High likelihood, High impact' risk. migrateCalendarToV3() (newtab.js:410-448) rewrites events array; if migration fails mid-operation or version detection fails, stored events could be silently dropped. No atomic commit wrapper shown for multi-key set operation.
- **[HIGH][security]** Storage eviction can permanently destroy irreplaceable user data (calendar events, project memos) with no guaranteed backup path before MVP release — PRD line 146: '저장소 축출 위험의 실제 크기' flagged as unconfirmed risk. PRD line 156 identifies 'Medium Impact' risk of data loss from eviction. Backup path (M2) noted as critical but not yet implemented in MVP (line 96: '잃어버린 데이터를 되돌릴 백업 경로가 생긴다'). No built-in backup trigger or periodic snapshot.
- **[HIGH][test]** Gate model's 'next incomplete gate' logic for banner has no test strategy defined. The PRD metric 'oday title readable without clicking' depends on correct gate ordering, but no test case scopes gate ordering edge cases (zero gates, reversed dates, gates with future-only dates, gates on same date). — PRD line 48: '오늘 할 일의 제목이 클릭 0회로 읽힌다' success metric. Meta doc 2026-08-20-calendar-mode-work-goal.md verdict 3: '작업의 "마감"은 다음 미완 관문의 날짜다'. No test case in existing smoke harness (test/positioning.smoke.js) covers gate validation. Existing v2 tests cover range edges (line 597-627) but not gate orderings.
- **[HIGH][test]** Project entity is introduced as 'sact ually required' with first-run onboarding, but no test strategy covers project lifecycle: non-existent state (first run), archival, task orphaning, reassignment across projects. — Meta doc 2026-08-20-calendar-notes-integration.md Verdict 1: 'Inbox는 예외로만 남기고, 프로젝트 0개인 첫 실행에는 온보딩이 필요하다'. No corresponding test case in positioning.smoke.js. v2 smoke tests don't mock or seed project data because project doesn't exist in v2.
- **[HIGH][test]** Backup path is specified as M2 deliverable ('잃어버린 데이터를 되돌릴 백업 경로가 생긴다') but its format is not named in the PRD. No test validates that backup restore fully recovers the system to pre-loss state. — PRD line 96 M2 outcome: '잃어버린 데이터를 되돌릴 백업 경로가 생긴다'. Meta doc verdict 8 line 255-260: '백업용 JSON 경로를 명시적으로 만든다'. No format spec in either document. Existing test suite (test/positioning.smoke.js:858-900) has load-failure cases but no backup/restore round-trip test.
- **[HIGH][test]** No test strategy covers variable gate pipeline validation. PRD states '경로가 작업마다 다르다' (dev/stg/prod, dev/prod hotfix, dev-only), but smoke harness has no test for tasks with incomplete or non-canonical gate sequences. — PRD line 31: '고정 파이프라인이 아니다 — 전 구간을 도는 작업도, 개발만 하고 끝나는 작업도, hotfix로 스테이징을 건너뛰는 작업도 정상이다'. Meta doc verdict 2 line 175: '순서는 날짜가 정한다'. No existing test validates that zero gates, one gate, or sparse gate sequences all render and behave correctly.
- **[HIGH][explorer]** CalendarEvent data structure exists and already supports range + priority + note, but 'done' boolean will need to become per-gate status when gate model is introduced — newtab.js:198-213 CalendarEvent typedef includes startDate/endDate/title/note/priority/done. Plan must upgrade 'done' from boolean to gate-keyed completion tracking.
- **[HIGH][explorer]** Sanitization pathway for untrusted input (JSON import) already exists and handles date validation + field whitelist - must be extended to validate gate objects — newtab.js:492 sanitizeImportedEvents() validates date keys via makeDateKey(parseDateKey()) roundtrip + MAX_NOTE_LENGTH truncation + priority whitelist. Gateway/project objects will need equivalent validation.
- **[HIGH][explorer]** No completion/status tracking per gate - 'done' boolean is all-or-nothing. M2 gates require individual completion state per gate while task itself remains 'active'. Architecture mismatch. — newtab.js:334 done:input.done===true (single boolean). PRD gate model requires tracking 'which gates are complete, which are pending' independently. Needs gate array with status objects, not task-level done.
- **[MEDIUM][architect]** Mode-specific storage backend selection lacks explicit boundaries. Current selectStorageBackend() (newtab.js:88) and STORAGE_BACKEND decision are module-global and mode-agnostic. Calendar mode's data lifetime and eviction risk (PRD risk table line 146-147) require explicit storage isolation guarantees that current flat schema cannot provide. — PRD risk (line 146-147): '저장소 축출 위험의 실제 크기...축출이 실제로 얼마나 쉬운지는 미확인'; meta doc Prior Art (line 98-104): '**미사용 항목을 축출**할 수 있다. 메모가 들어오면 잃을 것이 더 커진다'; newtab.js:74-107 storage backend selection has no mode-aware eviction protection
- **[MEDIUM][architect]** Gate model rendering breaks current index optimization. Current approach reserves `eventsByDate` map to window of 42 cells, O(n + overlaps). Gate model with point-based dates and flexible ordering will need new strategy to avoid either (a) full-array scan per render or (b) complex pre-calculated lookup. Decision deferred; scalability assumption not stated. — PRD risk (line 153): '**관문 모델 과잉** — 실제로는 작업당 관문 1~2개만 쓰여서, 도입한 복잡도가 회수되지 않는다...M2 판정에서 1~2개에 머물면 M3 이후 범위를 재검토'; newtab.js:2097-2119 rebuildIndex is O(n*windowSize) with range windowing; gate model scalability not addressed, only usage observation noted
- **[MEDIUM][security]** Favicon URLs constructed with unvalidated bookmark URLs may enable URL parameter injection or SSRF attacks — newtab.js:945, 1028 construct favicon URLs as `https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=32` where bookmark.url is injected directly. While isValidUrl() validates URL format, special characters in domain parameter could be misinterpreted. Example: bookmark.url='example.com&domain=attacker.com' injects second parameter.
- **[MEDIUM][security]** Calendar event memo field (MAX_NOTE_LENGTH=2000) accepts user text rendered as textContent but stored without encryption, creating data exposure for sensitive project information — newtab.js:206, 332: memo field described as work notes and explicitly allows user input up to 2000 chars. newtab.js:2932 renders via textContent (safe), but content persists in chrome.storage.local unencrypted. Users will store deployment credentials, issue descriptions, internal flow details here per PRD context.
- **[MEDIUM][security]** No input length validation or rate limiting on calendar event creation could enable resource exhaustion via storage quota abuse — createCalendarEvent (newtab.js:304-340) validates title/note truncation but no check for rapid-fire creation. Import validation limits total (MAX_IMPORT_CHARS=2000000) but live addEvent() has no per-operation size or frequency guards. With unlimitedStorage permission, attacker could theoretically fill quota within extension context.
- **[MEDIUM][security]** Multiple data storage backends (chrome.storage vs localStorage preview mode) create consistency risks and potential data loss if user switches contexts — newtab.js:88-107 selectStorageBackend() detects and pins backend at load time (line 181). No automatic sync between backends. Preview mode data lives in single localStorage key '__newTabPreviewStorage__' (line 74) and stays there even if loaded as extension later. Data could be invisible or duplicated.
- **[MEDIUM][test]** One-day reenactment test is the sole success metric but is not automatable within the smoke harness. No test strategy defines fixture format for 'past week's work' or measurement method for '0 clicks to read title'. — PRD line 58: 'Success Metrics: 지난 한 주의 실제 업무를 사후에 입력하고, 그때 필요했던 정보가 지금 화면에서 읽히는지 확인한다'. Meta doc verdict 9 method 2 (line 274-278): '미래를 예측하는 대신 과거를 재현한다'. These are observational, not automatable. Smoke harness can seed data but cannot measure user eye movement or assess readability.
- **[MEDIUM][test]** Banner text content changes from counts ('오늘 마감 N건') to titles ('오늘 · 정산 API 리팩터링 — 운영배포'). Existing test baseline snapshots only the counts string. New oracle must specify title truncation, multi-line handling, and readability over photos. — Meta doc verdict 3 line 183-184: 'Oday · 정산 API 리팩터링 — 운영배포'. Current v3 test (test/positioning.smoke.js:631-681) snapshots `.calendar-summary` text content as counts only. PRD Design Direction line 121-122: '배너가 제목을 담으면 대비를 다시 재야 한다. 밴드 위 텍스트는 이미 실측에서 취약한 자리다'. No test validates pixel-level contrast or truncation oracle.
- **[MEDIUM][test]** Test harness requires update for multi-key snapshot pattern (projects, tasks, gates instead of single calendarEvents key). No clear commit/rollback strategy for partial failures across three keys is documented. — Meta doc verdict 5 (line 214): '최소 분리: `projects` / `tasks` / `notes`'. Existing harness (test/positioning.smoke.js:975-1017) uses single `chrome.storage.local.set/clear` for one-key snapshots. The contract in newtab.js line 115 ('스냅샷 커밋 계약 … 두 키 중 하나만 성공하는 부분 실패 상태가 생긴다') applies to design but harness has no test for partial storage failures.
- **[MEDIUM][test]** Testability of observational success metrics ('메모장을 여는 이유 목록', external tool opening count) requires manual logging outside the smoke harness. No mechanism in the plan to integrate user-logged observations into regression detection. — PRD line 60: '메모장을 여는 **이유**가 남는다면 그것이 무엇인지 목록으로 나온다'. PRD line 59: '마감 확인 목적의 외부 도구 열람 · 하루 0회 · 수동 집계'. These are behavioral traces, not system-level assertions. Existing smoke harness has no reporting mechanism for human observations.
- **[MEDIUM][test]** Overlapping tasks are normal ('일정이 겹치는 것이 정상이다') but no test validates overlap rendering at high density. Existing v3 tests snapshot 9×9 positioning matrix but don't test visual density or chip truncation at MAX_CHIPS_PER_CELL boundaries. — PRD line 32: '일정이 겹치는 것이 정상이다. 여러 작업을 병행하며'. Meta doc verdict 2 line 165-167: 'MAX_CHIPS_PER_CELL = 2 · 넘치면 "+N"'. Test case positioning.smoke.js line 574-580 renders same-date events but doesn't validate `+N` truncation or re-expansion via popover.
- **[MEDIUM][test]** Gate's 'plannedDue vs revisedDue' variance tracking requires new test cases for conditional logic (early completion, delays, multiple push attempts). No existing test validates doneAt/revisedDue relationships or variance calculation oracle. — Meta doc verdict 2 line 181: '`plannedDue`는 불변이다. 지연으로 날짜를 바꿀 때는 `revisedDue`에 쓴다'. Line 182: '`doneAt`이 조기·지연·정시를 한 필드로 해결한다'. Existing v3 harness has no gate-level field access, only event-level snapshot. No test case validates doneAt < plannedDue (early) or doneAt > revisedDue (further delay).
- **[MEDIUM][explorer]** Factory function pattern for event creation (createCalendarEvent) is the single trusted pathway - all 3 code paths (addEvent/import/migration) use it. Gate/project creation should follow same pattern — newtab.js:304 createCalendarEvent() is documented as 'uique pathway' and used by addEvent(), sanitizeImportedEvents(), migrateCalendarToV3(). Inline literal creation in multiple places will cause data shape fragmentation.
- **[MEDIUM][explorer]** Summary banner (배너) currently exists but only shows counts - rendering 'oday line' with task titles requires extending existing renderTitle() rather than creating new component — newtab.js:2676-2710 renderTitle() currently outputs '오늘 마감 N건 · 지연 M건'. PRD M3 requires task title display. Reuse existing rendering, extend with textContent swap.
- **[MEDIUM][explorer]** Export/import pattern exists (handleCalendarExport/handleCalendarImport) but only supports JSON - M5 requirement for .ics calendar format requires new export pathway alongside existing JSON backup — newtab.js:4036-4089 export handler creates JSON blob + downloads with filename. PRD M5 separates 'backup JSON' from '.ics sync export'. New export type needed, not replacement.
- **[MEDIUM][explorer]** Storage adapter abstraction pattern (selectStorageBackend) exists to handle chrome.storage.local vs localStorage - project/gate data should use same adapter, not create new storage layer — newtab.js:88-177 createStorageAdapter() provides unified API abstracting extension storage vs preview localStorage. M2 project/gate data uses storage.get/set/remove, not direct chrome.storage calls.
- **[MEDIUM][explorer]** Modal overflow/clipping issue already documented - popover component needed for M4 memo display must render outside calendar band, not inside overflow:hidden container — newtab.css:1228 comment notes elements clip when overflow hidden. newtab.js:1732-1733 documents 'modal is body-direct because band has overflow:hidden'. M4 popover for memo preview must follow same out-of-band pattern.
- **[MEDIUM][explorer]** Note/memo system currently uses single 'note' string field (MAX_NOTE_LENGTH=2000) but PRD M4 requires type/category system (8 preset types). Upgrade requires note array or typed structure. — newtab.js:27 MAX_NOTE_LENGTH=2000 as string. PRD Verdict 7 specifies 'memo종류 8개는 하한' (계정·링크·용어·플로우·스펙·이슈·배포·메모). Current note field incompatible with categorical system.
- **[MEDIUM][explorer]** Popover component does not exist - all detail surfaces are modal or side panel. M4 memo preview requires new popover/tooltip component within calendar band that respects overflow boundaries. — newtab.js:1668-1687 modal documentation explicitly excludes body-direct modal from band to avoid overflow clipping. PopOver for 'progressive disclosure' (판정 4) is new surface type, no precedent in codebase.
- **[MEDIUM][explorer]** .ics export capability missing - only JSON export exists. M5 requires iCal format support for Google Calendar sync without OAuth. New serialization pathway required. — newtab.js:4050 only JSON.stringify() and Blob creation. PRD Verdict 5 specifies 'VEVENT + DTSTART;VALUE=DATE for all-day export' and 'gate=VEVENT', requiring ICAL serialization library or manual builder.
- **[LOW][architect]** Mode state machine is implicit in CalendarManager. Calendar mode transitions (ambient→engaged via panel open, explicit escape close, no artifact left) are well-documented in PRD design constraints (line 116) but scattered across CalendarManager methods (openEventModal, closePanel, selectDate). No explicit mode state machine class or formal contract. — PRD design direction (line 116-117): '두 상태(지나침/머무름)의 계약 — 명시적 진입 · Esc 이탈 · 흔적 없음'; newtab.js:1789-1846 modal open/close, selectedKey tracking, panelElement visibility are spread across methods without explicit FSM abstraction
- **[LOW][architect]** Banner rendering assumes single-line title fit. PRD M3 changes banner from count (`오늘 마감 N건`) to first title (`오늘 · 정산 API 리팩터링`) but doesn't specify truncation, wrapping, or overflow handling within measure constraint (--calendar-measure: 1440px). Current message buffer assumes short text. — PRD design direction (line 121-123): '배너가 제목을 담으면 대비를 다시 재야 한다...밴드 위 텍스트는 이미 실측에서 취약한 자리다'; meta doc verdict 3 (line 189-191): '제목 길이는 전제 9의 `--calendar-measure` 안에서 한 줄로 잘라야...잘림은 실패가 아니다'; newtab.js:2676-2710 renderSummary() builds count string, no title truncation logic yet
- **[LOW][security]** Import error messages may expose data schema or structure to attackers via overly detailed error text — newtab.js:4086 returns `statusElement.textContent = \`가져오기 실패: ${error.message}\`. Error messages from sanitizeImportedEvents (lines 522-524) include character counts and item limits that could help attackers understand data validation boundaries and craft targeted payloads.
- **[LOW][explorer]** Modal structure for event detail editing already exists (startDate/endDate/note inputs + priority radios) - can be reused for gate editing without major restructuring — newtab.js:1798-1826 openEventModal() shows modal state machine pattern. newtab.js:1737-1782 initializeModalRefs() shows modal structure with heading/form/titleInput/startInput/endInput/noteInput/noteCount/error/deleteButton. M4 gate editing can reuse this structure.
- **[LOW][explorer]** Priority system (low/normal/high) already exists and is working - no need to redesign, can be extended for gates if needed — newtab.js:48 PRIORITIES=['low','normal','high']. PRD Design Direction mentions priority display via 'color + form (thickness/badge/dot)'. Existing priority model is sound foundation.
- **[LOW][explorer]** Dual-view (summary/monthly) pattern not present - current calendar only shows 6-week grid. M3 requires switchable views. Existing renderGrid() path can be extracted to allow view swapping. — newtab.js:1790-1870 renderGrid() always renders 42-day grid. PRD M3 'summary/monthly dual density' requires conditional rendering path, not just visual CSS swapping.

### Meta-gaps

- Gate model rendering strategy not specified — current index assumes continuous ranges; gate model needs points with flexible ordering; scalability assumption for N gates per task not stated  _(architect)_
- Storage schema for projects, gates, and typed memos not designed — key partitioning vs single-key strategy, eviction risk mitigation, mode isolation guarantees  _(architect)_
- Memo attachment point not finalized — can memos attach to projects, tasks, gates, or all three? Nesting depth? Backward-compat path for migrating v3 `note` to typed memo system?  _(architect)_
- Migration v3→v4 strategy incomplete — transformation rules for single-date→gate(s), atomic consistency between task and gate creation, rollback safety  _(architect)_
- Mode-level document organization not in code — design says calendar/clock are separate products with separate docs, but code has no explicit mode namespace or doc reference binding  _(architect)_
- Export format abstraction missing — need plugin or strategy pattern to support JSON (backup) vs iCal vs potential task-only/memo-only variants  _(architect)_
- Ambient/engaged state machine formalized only in PRD — no explicit FSM class; transitions hardcoded across CalendarManager methods  _(architect)_
- PRD does not specify how project gate preset names should be validated (currently only 'dev, review, stg, prod, monitor' mentioned but extensible)  _(security)_
- No documented threat model beyond acknowledgment that PC compromise = credential compromise  _(security)_
- No specification for export data format security (are credentials/URLs included in calendar export JSON? Memo export format unspecified)  _(security)_
- M2 backup path design deferred but no interim mitigation strategy described for MVP data loss risk  _(security)_
- No specification for handling sensitive data in UI (clipboard access when copying task details, browser history when displaying links)  _(security)_
- Migration rollback strategy unclear - if v4 migration fails, can users downgrade safely without data loss  _(security)_
- Memo type system (M4) will have 8+ categories but no specification for handling categories with security implications (e.g., 'credentials' vs 'notes')  _(security)_
- Onboarding for first-time users not specified - risk of accidental credential leak if users don't understand local-only storage  _(security)_
- No rate-limiting or abuse detection specified for calendar operations despite unlimitedStorage permission  _(security)_
- Migration decision gate: The plan must resolve Open Question 1 (two gates vs one gate) and lock it in before implementation. Two separate test harness branches should validate both models to guard against wrong choice baking into user data.  _(test)_
- Backup/restore test round-trip: Define JSON schema for backup, seed a task+project set, export, clear storage, import, verify byte-for-byte equivalence. No existing test covers this.  _(test)_
- Gate validation oracle: Define which gate date orderings are valid (dates can be equal? reversed? mixed past/future?). Specify 'next incomplete gate' algorithm test cases explicitly.  _(test)_
- Project lifecycle test matrix: Seed projects at various states (0, 1, archived, null). Verify task behavior in each. Test onboarding path (no projects → create first → default to last used).  _(test)_
- Fixture format for reenactment test: Document JSON schema for 'past week's work' data. Specify assertion: title should be readable on-screen without hover/click. Define how to measure (screenshot + human review or pixel contrast?).  _(test)_
- Banner text assertion: Define truncation behavior (15-20 chars?). Test title readability over various background photos (existing PRODUCT.md brightness rule). Set pixel-level contrast oracle.  _(test)_
- Multi-key snapshot semantics: Extend smoke harness to seed {projects, tasks, notes} as separate keys. Add test case for partial storage failure (projects saved, tasks fails) — verify rollback behavior.  _(test)_
- Gate rendering edge cases: Test all pipeline variants (0, 1, 2, 5+ gates). Test same-date gates. Test gates in past, future, and mixed. Snapshot chip rendering for each.  _(test)_
- Overlap load visualization: Add test case with 4+ overlapping tasks on one date. Verify truncation to MAX_CHIPS_PER_CELL=2 and popover expansion. Snapshot before/after states.  _(test)_
- Observational metric integration: Define log format for human traces (which external tools opened, why notes were added). Specify how to correlate logs with heuristic suite (e.g., 'external tool opens = banner not readable').  _(test)_
- PRD does not specify gate field structure or interface (is it {name, dueDate, status} or {kind, dueDate}?) - required before data model task  _(explorer)_
- Migration strategy unclear: does each existing startDate/endDate range become (startGate + endGate) pair or just endGate? PRD Investigation Verdict OQ3 remains open  _(explorer)_
- Note type enumeration (8 preset types) not listed in code constants yet - specification incomplete for M4  _(explorer)_
- Storage key layout for project/gate data not specified - should projects and gates be separate keys or nested under calendarData key?  _(explorer)_
- Popover implementation constraints (keyboard tabbing, overflow handling, Esc behavior) not detailed - conflicts with existing modal Esc handling  _(explorer)_
- iCal export UID stability strategy not documented - required for .ics import/update tracking (Verdict OQ8)  _(explorer)_
- Dual-view toggle location and default state (summary vs monthly) not specified in PRD  _(explorer)_
- Backward compatibility: what happens to existing done=true events when migrated to gate model? Are they marked complete on all gates?  _(explorer)_
- .ics import capability - PRD only specifies export to Google Calendar, no mention of importing .ics files back  _(explorer)_

### Patterns to mirror

- newtab.js:86-107 — Version-gated idempotent migration pattern with self-guard (SETTINGS_VERSION_V2 constant), leaning on each migration's own version check to avoid cascade failures. Apply to v3→v4 gate migration with separate SETTINGS_VERSION_V4 guard.  _(architect)_
- newtab.js:1325-1447 persistEvents() — Snapshot-based state machine (pending token, opSeq race protection, rollback-by-NOP). Use for atomic multi-entity commits (task + gates + memos together).  _(architect)_
- newtab.js:115-528 sanitizeImportedEvents() — Whitelist-based copy, date round-trip validation (makeDateKey(parseDateKey(d)) === d), bounds checking (MAX_RANGE_DAYS), field clamping. Mirror for gate validation (date must exist, name must be in preset, etc.).  _(architect)_
- newtab.js:2097-2119 rebuildIndex() — Windowed index pattern: avoid full scan by pre-filtering to render window. Gate model will need analogous strategy (e.g., index by date range of visible gates, or pre-sort gates by date).  _(architect)_
- newtab.js:1471-2448 setupEventListeners() — Event delegation with data-* action attributes (data-nav, data-todo-action). Extend to gate/project/memo actions without new listener per entity.  _(architect)_
- test/positioning.smoke.js — Regression harness calls production handlers directly, compares snapshots. Will need new gate-model test cases; re-baseline calendar after data model change.  _(architect)_
- newtab.js:1854-1886 createCalendarEvent() — Only path for event creation; ensures uniform field initialization. Create analogous gate creation helper to prevent inconsistent gate objects.  _(architect)_
- newtab.js:2664-2710 renderSummary() / banner pattern — Single source of truth for summary rendering. Banner redesign for titles requires same pattern but with title extraction, truncation, and overflow rules codified in one place.  _(architect)_
- newtab.js:248-251 pickDateKey() — round-trip validation pattern for date strings (parse → stringify → compare)  _(security)_
- newtab.js:304-340 createCalendarEvent() — single-entry validation path with whitelist-based field copying (prevents prototype pollution, enforces field type contracts)  _(security)_
- newtab.js:492-528 sanitizeImportedEvents() — untrusted input handler with length/count limits and per-item validation before commit  _(security)_
- newtab.js:953, 1036, 2914, 2932 — consistent textContent usage for all user-supplied title/name/note fields (XSS mitigation)  _(security)_
- newtab.js:366-390 migrateSettingsToV2() — version guard pattern (separate constant per migration to prevent idempotency loss)  _(security)_
- newtab.js:438-442 atomic storage commit — all related keys in single storage.set() to prevent split-brain state  _(security)_
- DESIGN.md principle 5 — explicit storage error reporting (no silent failures) should extend to credential/memo sensitivity layers  _(security)_
- newtab.js:137-141 JSON.parse error handling in storage adapter — throw to caller rather than silent empty fallback  _(security)_
- test/positioning.smoke.js:86-106 — waitFor + settle timing pattern for initialization and debounce waits. Apply to gate data load + banner render delay.  _(test)_
- test/positioning.smoke.js:127-134 — installErrorHooks pattern for console.error + unhandledrejection capture. Extend to validate gate validation errors don't leak to user.  _(test)_
- test/positioning.smoke.js:304-327 — band-invariance assertion pattern. Apply to backup file invariants (startDate, endDate, gates array structure post-restore).  _(test)_
- test/positioning.smoke.js:441-491 — migration test structure (legacy state → first run snapshot → idempotent re-run → legacy fields preserved). Replicate exactly for gate migration, but test BOTH two-gates and one-gate paths to guard against wrong choice.  _(test)_
- test/positioning.smoke.js:551-629 — runRangeCases pattern (month boundary, max span, truncation, reversal). Adapt for gate date validation (zero gates, reversed planned/revised, future-only dates).  _(test)_
- test/positioning.smoke.js:638-681 — summary lifecycle pattern (absent when empty → present when due → absent when all done). Adapt to test banner title readability (0 clicks) assertion.  _(test)_
- newtab.js:304-340 — createCalendarEvent firewall pattern (whitelist-only copy, no `{...input}`, validate each field). Replicate for gate array sanitization + project foreign-key validation.  _(test)_
- newtab.js:1325-1370 — persistEvents rollback pattern (snapshot committed only if save succeeds; pending flag blocks edits). Extend to multi-key commit (all 3 keys succeed atomically, or none).  _(test)_
- newtab.js:2127-2131 — getEventsForDate() pattern (return all for date, no filtering). Adapt for 'getGatesForDate()' or 'getTasksWithIncompleteGates()' query pattern for banner logic.  _(test)_
- test/positioning.smoke.js:731-792 — sanitizeImportedEvents pattern (handle v2 format, whitelist fields, test prototype pollution). Replicate for v3→M2 gate migration import (handle missing gates array, fill defaults).  _(test)_
- newtab.js:86 migrateSettingsToV2() - independent version guard pattern, preserve legacy fields, call from Application.initialize() before manager creation  _(explorer)_
- newtab.js:410 migrateCalendarToV3() - separate version constant (SETTINGS_VERSION_V2), whitelist-only field copy, atomic multi-key set()  _(explorer)_
- newtab.js:304 createCalendarEvent() - single trusted factory function as only creation pathway, validateonput + normalize + whitelist fields in one place  _(explorer)_
- newtab.js:492 sanitizeImportedEvents() - date roundtrip validation (makeDateKey(parseDateKey(d))===d), per-item validation over array validation, overflow array over silent truncation  _(explorer)_
- newtab.js:1325 persistEvents() - snapshot-based save (nextEvents passed, committed only on success), pending flag blocks new edits, rollback via no-op  _(explorer)_
- newtab.js:1471 setupEventListeners() - container delegation + data-* actions, not per-element listeners  _(explorer)_
- newtab.js:2676 renderTitle() - textContent only (never innerHTML except for SVG glyphs), aria-live for dynamic updates  _(explorer)_
- newtab.js:1798 openEventModal()/closeEventModal() - modal state in this.modalState, return focus to opener, keydown Esc+Tab trap  _(explorer)_
- newtab.css:1228 comment + overflow handling - document band overflow issue, ensure popover renders outside band layer  _(explorer)_
- newtab.js:4036 handleCalendarExport() - check canExport() before creating blob, filename includes makeDateKey(), revoke objectURL after click  _(explorer)_
- .claude/plans/calendar-widget-v2.plan.md Tasks 0-9 - staged decomposition with rollback points, task-level acceptance criteria, smoke test baseline before changes  _(explorer)_


## Design Critique

impeccable-detect(`--mode plan`): `skill_available=true` · `cli_available=true` · `design_signal=true` · `signal_files=[newtab.css, newtab.html]` · `reason=ok` · `silent_skip=false`. routing mode: `auto`.

**plan 단계는 어떤 impeccable review 명령도 호출하지 않는다.** 렌더된 UI가 없기 때문이며, 이 마일스톤은 특히 그렇다 — M1은 코드를 바꾸지 않으므로 비평할 화면 자체가 생기지 않는다(UI8). 대신 위 `## Design Routing Guide`가 구현 단계에서 소비할 체크리스트로 기록됐다.

GROUND 단계에서 실제로 소비한 impeccable은 `/impeccable shape`다(UI1). setup 3단계(`context.mjs` 로드 → `reference/shape.md` → register `product`의 `reference/product.md`)를 거쳤고, 그 Discovery Interview의 답이 위 `## User Intent` UI3~UI6과 `## Design Decisions` DD1~DD3으로 남았다. `shape.md` Phase 1.5 Visual Direction Probe는 이 하네스에 네이티브 이미지 생성이 없어 생략했고, 생략 사실을 여기 기록한다.

**재접지 1차(2026-08-21).** 판본이 3.x 에서 4.x 로 올라간 것을 전제로 `scripts/context.mjs`·`reference/init.md`·`reference/document.md`·`reference/new-work.md`를 다시 읽고 로더를 두 자리(저장소 루트·저장소 밖)에서 실행해 확인했다. 그 결과가 DD1의 네 항목, DD2의 staging 전환, DD3의 정규 7절, 그리고 새 DD13이다. 위 setup 3단계 서술의 `register` 는 3.x 의 절차이며 4.x 에는 없다 — 이 문단이 그 사실을 남기는 자리다.

**재접지 2차(2026-08-22) — 서술이 아니라 경로가 틀렸다.** 1차 재접지가 기술한 4.x 계약은 **전부 맞았다.** 그런데 게이트를 실제로 돌려 보니 `SKILL.md` 의 `version` 이 `3.5.0` 으로 관측됐다. 원인은 배포 채널 전환이었다 — impeccable 이 npm CLI 에서 marketplace plugin 으로 옮겼고 CLI 채널은 지원이 끊겼는데, 스크립트의 `SKILL` 은 CLI 가 쓰던 `~/.claude/skills/impeccable` 을 하드코딩하고 있었다. plugin 설치본(`4.1.1`)을 대상으로 다시 확인한 결과:

- DD1 의 행번호 인용 **넷 다 적중**한다 — `context.mjs` 44-45행·47행·245행, `init.md` 100행·3행·56행.
- `init.md` 전문에서 `register` 문자열 적중 **0건** — DD1-2 가 맞다.
- GATE-A 의 계약 문자열 넷은 4.1.1에서 전부 적중하고, **3.5.0에서는 `canonical section order from Scan mode` 가 없어 죽는다.** 내용 검사가 두 판본을 실제로 가른다.
- 정규 절은 `document.md` 51-59행 이 여덟으로 못박고 seed 가 Components 를 생략(380행)하므로 일곱이다 — DD3 이 맞다.
- **그러나 seed 인터뷰가 통째로 교체됐다** — 다섯 질문이 사라지고 `new-work.md` 의 world workshop 으로 라우팅된다(354-360행). 1차 재접지가 놓친 유일한 계약이며 새 DD18 이 그것을 다룬다.

경로 문제 자체는 DD19 가 맡는다. **이 두 라운드의 교훈을 한 줄로 적어 둔다 — 판본을 확인했다는 것과 그 판본을 실행한다는 것은 다르고, 게이트가 검사한 파일과 스킬이 실행하는 파일이 같은지를 묻는 검사가 따로 있어야 한다.**

M1이 생성 단계에서 쓸 명령은 `system` 단계의 `/impeccable init`과 `/impeccable document --seed` 둘이며, 그 호출은 이 게이트가 아니라 Task 2·3에서 일어난다.

**5차 라운드 정정(2026-08-22) — 위 "plan 단계는 어떤 impeccable review 명령도 호출하지 않는다"는 이번 라운드에 더는 사실이 아니다.** 사용자가 디자인 판단을 impeccable에 위임하도록 지시했고, 이 게이트가 `Skill(impeccable, "critique work-calendar-m1")`을 실제로 호출했다. 다만 직전 문장의 **근거는 여전히 옳다** — 렌더된 화면이 없으므로 `reference/critique.md`의 Assessment B(detector + 브라우저 증거)는 성립하지 않는다. 그래서 비평 대상을 화면이 아니라 **이 플랜이 `DESIGN.calendar.md`에 물릴 설계 결정**으로 잡았고, 대조 기준은 `PRODUCT.md`·`DESIGN.md`·`reference/product.md`(register: product)·`frontend-design-direction/SKILL.md`의 Output Constraints 넷이다. Assessment B를 돌리지 않았다는 사실을 숨기지 않고 적는다.

- 라운드 수: 2 (R0 발견 → 흡수 → R1 재판정)
- 판정: `CONVERGED` (`design-critique-decide.decideCritique`, cap 2)
- Output Constraints 기계 검사: H1(위계 3단계) — 플랜 본문 `^####` 0건으로 통과. H3(raw markdown marker)·H4(list-of-N 상한)는 렌더 표면 앵커이며 플랜 마크다운은 렌더 표면이 아니므로 해당 없음

| # | Severity | Verdict | 발견과 처리 |
|---|---|---|---|
| F1 | HIGH | ACCEPT_NOW | `Named Rules`는 `DESIGN.md`에 **세 번** 있는 절 이름인데(`:290` 2절 Colors · `:327` 3절 Typography · `:355` 4절 Elevation) 답안지 Brand Commitments가 번호 없이 참조했다. `refs_resolve`는 낱말 경계 대조라 셋 중 아무거나에 닿아도 통과하므로 GATE-C가 이 모호함을 못 잡는다. 게다가 **DD4가 정한 참조 형태("4절 The brightness Rule")를 답안지가 스스로 어기고 있었다.** 걸리는 곳이 뼈아프다 — 알파 2단계 고정 규칙 `The 두 단계 Rule`은 **2절** Named Rules에 있는데 답안지 괄호는 `The brightness Rule`(4절)을 지목한다. 그 규칙이 곧 Acceptance 대리 판정 둘째 물음의 결정적 제약이다. 흡수: 답안지를 절 번호 형태로 고치고 2절 Named Rules와 6절 Do's and Don'ts를 명시적으로 데려왔으며, DD4에 "이름이 원본에서 반복되면 절 번호를 동반한다"를 형태 규칙으로 못박았다 |
| F2 | HIGH | ACCEPT_NOW | **값은 상속되는데 근거가 상속되지 않는 자리가 있다.** `DESIGN.md:359` `The 표면을 누르지 알파를 올리지 않는다 Rule`은 자기 근거를 "면적 예산"으로 적는데, 면적 예산은 DD5 좌열 2번(성공 지표)에서 나오고 캘린더 모드는 그 지표를 "상기되는가"로 갈아 끼운다. M3가 "면적 예산은 캘린더 모드에 없으니 알파를 올려도 된다"로 가도 **DD4·DD13의 형식 검사를 전부 통과한다.** 흡수: DD5에 "재료를 상속하되 근거가 좌열에 매여 있으면 근거만 다시 쓴다"를 예외로 추가하고, 이 규칙의 캘린더 모드 근거를 원칙 3으로 다시 적었다 |
| F3 | MEDIUM | DEFER_TO_BACKLOG | 대리 판정 둘째 물음("겹친 부하를 **어떤 축으로** 가르는가")의 **가용 축 제약 집합**이 한 자리에 모여 있지 않다 — 알파 불가(2단계 고정, 이미 중요도가 사용), hue 추가 불가(accent 하나), 색 단독 불가(Do 규칙), 상태 색은 발생 시에만. 읽는 사람이 네 곳에서 스스로 모아야 한다. 다만 M1의 위험은 Acceptance의 대리 판정이 이미 잡고, 축을 고르는 것 자체는 M3 결정이라 DD7이 M1에서 금한다. 백로그로 넘긴다 |
| F4 | LOW | REJECT_YAGNI | `## Design Routing Guide` 20행 중 M1이 쓰는 것은 2행뿐이라 H4(list-of-N) 정신에 어긋나 보인다. 그러나 플랜 마크다운은 렌더 표면이 아니고, 그 표는 `impeccable-routing.routeCommands`가 생성한 것이라 손으로 줄이면 오라클과 어긋난다. 필요 없다 |

- Deferred to backlog: 1 → `.claude/plans/codex-findings-backlog.md`

## Codex Adversarial Review

<!-- placeholder: will be replaced by Phase 7.3 -->
