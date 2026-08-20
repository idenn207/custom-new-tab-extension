# Plan: 캘린더 모드가 자기 목표를 갖는다 (업무 캘린더 M1)

**Source PRD**: `.claude/prds/work-calendar.prd.md`
**Selected Milestone**: M1 — 캘린더 모드가 자기 목표를 갖는다
**Complexity**: Medium

## Summary

시계 모드(가정용)와 캘린더 모드(업무용)의 제품·디자인 문서를 갈라, 이후 모든 화면 판단이 "사진이 안 가려지는가"가 아니라 "상기되는가"로 내려지게 한다. 산출물은 새 문서 둘(`PRODUCT.calendar.md`·`DESIGN.calendar.md`)과 기존 문서 둘의 최소 수정이며, 확장 코드는 한 줄도 바뀌지 않는다.

새 문서는 손으로 쓰지 않고 **impeccable 스킬이 생성 주체가 된다**(UI2). impeccable의 context 로더가 root의 `PRODUCT.md`/`DESIGN.md` 한 쌍만 인식하므로 두 번째 쌍을 만들 경로가 없고, 그래서 시계 문서를 잠시 치우고 `/impeccable init` → `/impeccable document --seed`를 돌린 뒤 산출물을 `*.calendar.md`로 옮기고 원본을 바이트 동일하게 되돌리는 **swap 절차**를 쓴다. 이 절차가 PRD Open Question "캘린더 모드 제품 문서를 만드는 절차"의 해소안이다.

**검증은 문서가 아니라 스크립트가 한다.** 이 플랜의 판정은 `.claude/plans/work-calendar-m1.verify.sh`의 다섯 게이트(A·B·C·D·E)와 gate-final 이며, 각 게이트는 실패 시 0이 아닌 코드로 죽는다. Task 사이의 순서는 주석이 아니라 게이트 호출로 강제된다.

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
| 문서 간 참조 | `PRODUCT.md:108` "해결값은 DESIGN.md의 Glass 절에 있다" | 다른 문서를 **절 이름으로** 가리키고 값은 복사하지 않는다. UI5가 요구하는 방식의 기존 선례 |
| 시각 문서 형식 | `DESIGN.md:166-460` | Stitch 6절 순서 고정. frontmatter가 규범이고 본문은 적용 맥락이다 |
| 규칙 관용구 | `DESIGN.md:224` | `**The [이름] Rule.** [한 문장 도그마]` 형태. 절당 1~3개 |
| 근거 표기 | `PRODUCT.md:90-106` 대비 실측 표 | 측정 조건(해상도·배경·밝기 값)과 판정 기준을 값과 같은 표에 둔다. 값만 적지 않는다 |
| 앞으로의 기준 표기 | `DESIGN.md:172` | 굵게 표시한 규칙은 코드가 아직 그렇지 않은 항목, 즉 앞으로의 기준이다. 나머지는 코드의 사실이다 |
| 되돌릴 수 있는 순서 | `.claude/plans/calendar-widget-v2.plan.md` 의 Task 0 | 첫 태스크가 백업·베이스라인 확보다. 파괴적 단계는 그 다음에 온다 |
| 실행 가능한 회귀 판정 | `test/positioning.smoke.js:234` | 판정을 산문이 아니라 **실행되는 코드**로 둔다. 프로덕션 핸들러를 직접 불러 로직을 복제하지 않고, 스냅샷을 문자열로 비교한다 |
| 두 축 판정 | `README.md:250` | **차이**(베이스라인 대비 변화)와 **단언 실패**(베이스라인과 무관)를 가른다. 베이스라인을 다시 떠도 단언 실패는 사라지지 않는다. 이 플랜의 게이트도 같은 두 축을 쓴다 |
| 단위 테스트 러너 | — | **없다.** `package.json`·빌드 단계가 저장소에 없다. 그래서 판정을 하네스에 얹지 못하고 이 마일스톤 전용 셸 스크립트로 만든다 |

## Design Decisions

작성자 판단이며 사용자 요구가 아니다. PRD Open Question 해소안과, 1차 리뷰 패널이 낸 지적의 흡수를 포함한다.

**DD1 — impeccable은 두 번째 문서 쌍을 만들 수 없다. 다만 이 사실을 플랜이 단언하지 않고 게이트가 실측한다.**
읽어서 확인한 것은 이렇다. impeccable 스킬의 `context.mjs`는 상수 `PRODUCT_NAMES`·`DESIGN_NAMES`로 각각 `PRODUCT.md`/`Product.md`/`product.md`, `DESIGN.md`/`Design.md`/`design.md`만 인식하고, `resolveContextDir()`는 cwd → `.agents/context` → `docs` → `IMPECCABLE_CONTEXT_DIR` 순으로 첫 매치에서 멈춘다. `reference/init.md` Step 4는 `PROJECT_ROOT/PRODUCT.md`에 쓴다고 못박고, `reference/document.md`는 root `DESIGN.md`와 `.impeccable/design.json`에 쓴다.

그러나 **이 파일들은 이 저장소에 없다.** `~/.claude/skills/impeccable/` 아래에 있고 버전이 올라가면 조용히 달라진다. 그래서 위 서술을 근거로 삼지 않고, Task 0의 GATE-A가 **실행 시점에 직접 확인한다**: 파일 존재, `SKILL.md`의 `version` 필드를 `.claude/plans/work-calendar-m1.answers.md`에 기록된 값과 대조, 그리고 `context.mjs`가 지금 실제로 root 문서를 읽고 있는지의 양성 프로브. 셋 중 하나라도 어긋나면 게이트가 죽고 swap을 시작하지 않는다. 관측된 버전은 착수 시점 기준 `3.5.0`이다.

**DD2 — 백업 위치는 `.claude/_backup/m1/`이며, 그 안전성은 경로 문자열이 아니라 음성 프로브로 판정한다.**
`docs/`와 `.agents/context/`는 DD1의 fallback 목록에 있으므로 백업지로 쓸 수 없다. 다만 "경로에 `docs/`가 없다"를 검사하는 것으로는 오타를 못 잡는다. 진짜 판정은 **swap 직후 `context.mjs`가 `NO_PRODUCT_MD`를 내는가**이며(GATE-B의 첫 단언), 이것이 참이면 백업이 어디에 있든 로더가 그것을 집지 않았음이 증명된다. 경로 상수는 스크립트에 한 번만 정의해 Task마다 다시 타이핑하지 않는다.

**DD3 — `DESIGN.calendar.md`는 `/impeccable document --seed`로 만든다** (UI6 해소).
seed 모드는 `reference/document.md`에 세 가지가 명시돼 있다. 첫째, 다섯 질문만 받고 최소 frontmatter만 쓴다. 둘째, Components 절을 통째로 생략한다. 셋째, `.impeccable/design.json` 사이드카를 쓰지 않는다. 셋이 각각 UI6·UI5·사이드카 충돌 회피에 대응한다. 셋 다 GATE-C가 산출물에서 직접 확인하므로, 스킬이 약속을 어기면 게이트가 죽는다.

**DD4 — 상속은 절 이름 참조로 하고 값을 옮기지 않는다** (UI5).
대비 실측법·유리 정당화 조건·`brightness` 규칙·타이포·모션·포커스 링·한국어 줄바꿈이 대상이다. 캘린더 문서에는 "`DESIGN.md` 4절 The brightness Rule을 그대로 따른다" 형태로만 적는다. 검사는 손으로 고른 몇 개 값을 찾는 방식이 아니라, **원본 두 문서에서 측정치 토큰을 기계적으로 추출해 그 전부를 캘린더 문서에서 찾는다**(GATE-D). 값이 두 곳에 생기면 다음 실측 때 한쪽만 갱신되고, 그것이 PRD Risk "제품 문서 분리의 표류"가 말하는 실패다.

**DD5 — 갈아 끼우는 것은 목표 층위뿐이고, 재료 층위는 상속한다** (UI7).
PRD Design Direction 표의 좌열 넷(주인공·성공 지표·anti-reference 적용 범위·두 상태 계약)만 캘린더 문서가 새로 정의한다. 우열 넷은 DD4의 참조로 처리한다. 이 경계가 곧 `[셸]`·`[시계]` 태그의 판정 기준이다.

**DD6 — `DESIGN.md:172`의 범위 문장은 정정 대상이다.**
현재 "달력 v2는 M1만 완료이고 M2·M3는 dogfooding 결과 대기 중"이라 적혀 있는데, 그 v2 PRD는 이번 PRD가 대체했고(UI13) 그 dogfooding은 수행되지 않았다(PRD Evidence). 문장을 그대로 두면 새 문서가 폐기된 계획을 근거로 자기 범위를 설명하게 된다. 바뀔 문장을 여기서 확정한다 — 대체 텍스트는 **"범위: 달력 위젯 제외. 달력 모드의 시각 기준은 `DESIGN.calendar.md`에 있다. 이 문서가 다루는 것은 배경 레이어, 시계, 검색창, 바로가기(고정 + 사이드바), 배경 이미지 사이드바, 설정 모달, 저장소 고지 배너, 그리고 이들이 공유하는 유리 언어다."** 이며, `gate-final`이 옛 문구(`dogfooding 결과 대기`)의 부재와 새 문구의 존재를 함께 확인한다.

**DD7 — 판정 2건의 값은 M1에서 정하지 않는다.**
M1이 만드는 것은 결정을 내리는 **규칙**이지 결정 자체가 아니다. 렌더된 화면 없이 값을 굳히면 M3의 실측이 그것을 뒤집을 때 문서가 먼저 틀린 것이 된다. 대신 Acceptance가 "이 문서만 보고 그 두 결정을 내릴 수 있는가"를 묻는다. PRD Open Question "M1의 산출물을 무엇으로 판정하는가"의 해소안이다.

**DD8 — 인터뷰 답은 산문이 아니라 파일이다.**
`/impeccable init`과 `/impeccable document`는 대화형 스킬이라 사람이 답을 타이핑한다. 답을 이 플랜 본문의 산문으로만 두면 옮겨 적는 과정에서 흔들리고, 그 흔들림은 사후 grep으로 잡히지 않는다. 그래서 답을 `.claude/plans/work-calendar-m1.answers.md`에 **먼저 확정해 파일로 만들고**, 인터뷰에서는 그 파일의 항목을 그대로 붙여 넣는다. 같은 파일이 산출물 검사의 기준이 된다 — 각 답에 딸린 `must-contain` 목록을 GATE-C가 생성 문서에서 확인한다. 스킬의 질문 순서나 문구가 버전에 따라 달라져도, 답의 내용과 검사 기준은 그 변화에 매이지 않는다.

**DD9 — 아래 fan-out 절은 M1이 아니라 M2 이후를 겨냥한다.**
Phase 2.5 패널에 PRD 전문을 넘겨 4/4 관점을 받았는데, CRITICAL 7건이 전부 관문 데이터 모델·마이그레이션·저장 스키마다. M1에는 코드가 없으므로 그중 이 플랜이 소비하는 것은 architect의 HIGH 1건("문서 분리가 코드에 반영될 자리가 없다")과 같은 관점의 meta-gap 하나뿐이다. 나머지는 M2 플랜의 입력으로 보존한다.

**DD12 — 기존 두 문서가 이미 어긋나 있다. M1이 그것을 고치고 간다.**
`PRODUCT.md:108`은 유리 표면의 해결값을 `brightness(0.60)`으로, `DESIGN.md:357` The brightness Rule은 `brightness(0.62)`로 적는다. 같은 규칙의 값이 두 문서에 각각 있고 서로 다르다 — DD4가 막으려는 표류가 캘린더 문서를 만들기도 전에 이미 일어나 있다. 3차 패널 architect가 찾아낸 실재 결함이다. 값의 출처는 `DESIGN.md`(frontmatter가 규범)이므로 `PRODUCT.md:108`에서 수치를 **빼고** 절 이름 참조로 바꾼다. 이것이 DD4가 요구하는 형태이며, 동시에 `PRODUCT.md:108`을 Patterns 표의 선례로 계속 쓸 수 있게 만든다 — 지금은 그 줄이 "값을 복사하지 말라"의 선례이면서 스스로 값을 복사하고 있다.

**DD10 — swap은 1회성 시술이 아니라 이름 붙은 반복 절차다.**
`DESIGN.md:172`는 달력 시각 스펙을 "리디자인 확정 후 `/impeccable document`로 다시 기록한다"고 예고한다. M3가 실제로 그 시점이며, 그때도 impeccable은 여전히 root 한 쌍만 본다. 그러므로 M1이 만드는 것은 문서 둘만이 아니라 **다시 실행할 수 있는 절차 하나**다. 재사용의 단위는 **스크립트가 아니라 절차**다. `verify.sh`는 캘린더 문서 이름을 `CAL_PRODUCT`·`CAL_DESIGN` 환경변수로 받고 기본값만 M1의 두 이름으로 두므로, M3는 같은 파일을 그대로 두고 그 변수만 덮어 게이트를 다시 돈다. 새 플래그를 만들지 않는다 — 2차 패널 architect가 이 지점을 지적했고, 없는 기능을 문서가 약속하고 있었던 것이 맞다. M3가 추가로 필요로 하는 것은 seed가 아니라 scan 모드 산출물이므로 `gate-c`의 seed 단언만 그때 완화되며, 그 완화는 M3 플랜이 자기 DD로 적는다.

**DD11 — 게이트는 되돌릴 수 없는 단계 앞에 선다.**
1차 패널 invariant 지적의 핵심은 "검증이 마지막에 몰려 있어 늦게 발견한다"였다. 순서를 바꾼다. GATE-A는 **Task 1보다 먼저** 코드 무변경 베이스라인과 impeccable 계약을 확인하고, GATE-B는 swap 성립을 확인한 뒤에야 생성이 시작되며, GATE-C는 산출물을 검사한 뒤에야 원복이 오고, GATE-D는 원복의 바이트 동일성을 확인한 뒤에야 Task 5의 의도된 편집이 허용된다. 각 게이트는 `set -euo pipefail` 아래에서 죽으며, 다음 Task는 앞 게이트의 종료 코드 0을 전제로만 시작한다.

## Files to Change

| File | Action | Why |
|---|---|---|
| `.claude/plans/work-calendar-m1.verify.sh` | CREATE | 다섯 게이트(A·B·C·D·E)와 gate-final 을 담은 실행 가능한 판정 스크립트. 이 플랜의 유일한 합격 판정자 |
| `.claude/plans/work-calendar-m1.answers.md` | CREATE | 인터뷰 답안지와 각 답의 `must-contain` 검사 기준(DD8). 관측된 impeccable 버전도 여기 기록한다 |
| `PRODUCT.calendar.md` | CREATE | 캘린더 모드(업무용) 제품 문서. `/impeccable init` 산출물을 이 이름으로 옮긴 것 |
| `DESIGN.calendar.md` | CREATE | 캘린더 모드 시각 문서. `/impeccable document --seed` 산출물 |
| `PRODUCT.md` | UPDATE | `118-122` "이 문서의 범위" 절을 위임 선언으로 교체하고, `108`의 `brightness` 수치를 절 이름 참조로 바꾸며(DD12), 절마다 태그를 단다 |
| `DESIGN.md` | UPDATE | `172` 범위 문장 정정(DD6), `174` 택일 사실 유지, 절마다 태그 |
| `.claude/prds/work-calendar.prd.md` | UPDATE | Delivery Milestones M1 행. 완료 시 Open Question 2건 해소 표기와 게이트 실행 기록 |

**이 표에 없는 것이 이 마일스톤의 절반이다.** 확장 코드 파일(`newtab.js`, `newtab.css`, `newtab.html`, `manifest.json`)과 `fonts/`·`images/`·`test/`는 한 줄도 바뀌지 않는다(UI8). GATE-A가 착수 **전에**, GATE-D가 종료 시에 각각 이것을 확인한다. 백업 디렉터리 `.claude/_backup/m1/`도 이 표 밖이다 — 추적 대상이 아니라 작업 중 산물이며, `.gitignore` 관리 블록 밖에 있으므로 커밋 전에 지운다.

## Tasks

### Task 0: 착수 조건 확인 (GATE-A)
- **Action**: `.claude/plans/work-calendar-m1.verify.sh`와 `.claude/plans/work-calendar-m1.answers.md`를 먼저 쓴다. 답안지 형식은 아래 **답안지 형식** 절이 정한다 — 게이트가 읽는 두 필드(`impeccable-version:`, `must-contain:`)가 그 형식의 계약이다. 그다음 `bash .claude/plans/work-calendar-m1.verify.sh gate-a`를 실행한다. 이 게이트는 (1) 코드 무변경 베이스라인을 **착수 전에** 확보하고 (2) impeccable 스킬 파일의 존재와 `SKILL.md`의 `version`이 답안지에 기록된 값과 같은지 대조하며 (3) `context.mjs`가 지금 root 문서를 읽고 있는지 양성 프로브를 돈다.
- **Mirror**: `test/positioning.smoke.js:234` — 판정을 산문이 아니라 실행되는 코드로 둔다
- **Validate**: `gate-a`가 종료 코드 0. 0이 아니면 **Task 1을 시작하지 않는다**. 버전 불일치는 실패다 — 스킬이 올라갔다면 `reference/init.md`와 `reference/document.md`를 다시 읽고 DD1·DD3을 갱신한 뒤 답안지의 버전을 올린다

### Task 1: 백업 확보
- **Action**: `PRODUCT.md`·`DESIGN.md`·`.impeccable/design.json`을 `.claude/_backup/m1/`에 복사하고 sha256을 `.claude/_backup/m1/SHA256SUMS`에 기록한다. 경로는 verify 스크립트가 정의한 상수 하나를 쓰고 다시 타이핑하지 않는다(DD2).
- **Mirror**: `.claude/plans/calendar-widget-v2.plan.md` 의 Task 0 — 파괴적 단계 앞에 베이스라인을 먼저 세운다
- **Validate**: `sha256sum -c` 전건 OK. 이 검사는 GATE-B의 첫 단언으로 다시 돈다

### Task 2: swap 성립 확인과 `PRODUCT.calendar.md` 생성 (GATE-B)
- **Action**: root `PRODUCT.md`·`DESIGN.md`를 백업 위치로 **이동**한다(복사가 아니라 이동). `bash .claude/plans/work-calendar-m1.verify.sh gate-b`를 실행한다 — 백업 해시 재확인과 **음성 프로브**(`context.mjs`가 `NO_PRODUCT_MD`를 내는가)를 함께 본다. 게이트가 0을 낸 뒤에만 `/impeccable init`을 실행하고, 인터뷰에는 답안지 항목을 그대로 붙여 넣는다(DD8). 산출된 root `PRODUCT.md`를 `PRODUCT.calendar.md`로 옮긴다.
- **Mirror**: `PRODUCT.md`의 절 구성과 담백한 한국어 어조
- **Validate**: `gate-b`가 종료 코드 0. 0이 아니면 이동이 실패했거나 로더가 백업본을 집은 것이므로, `git checkout -- PRODUCT.md DESIGN.md`로 되돌리고 원인을 고친 뒤 다시 시작한다. 생성 자체는 시작하지 않는다

### Task 3: `DESIGN.calendar.md` 생성과 산출물 검사 (GATE-C)
- **Action**: `init` Step 5의 위임을 받아 `/impeccable document --seed`를 실행한다(DD3). 답안지의 다섯 답을 넣고, 산출된 root `DESIGN.md`를 `DESIGN.calendar.md`로 옮긴다. `bash .claude/plans/work-calendar-m1.verify.sh gate-c`를 실행한다.
- **Mirror**: `DESIGN.md:166-460`의 6절 헤더와 `DESIGN.md:224`의 Named Rule 관용구
- **Validate**: `gate-c`가 종료 코드 0. 게이트가 보는 것은 여섯이다 — seed 마커 존재, 6절 헤더가 문자 그대로, Components 절 부재, `.impeccable/design.json` 해시 불변, 답안지 `must-contain` 항목 전건 적중, Named Rule이 `**The … Rule.**` 형태

### Task 4: 시계 문서 원복과 바이트 동일성 증명 (GATE-D)
- **Action**: 백업본을 root `PRODUCT.md`·`DESIGN.md`로 되돌린다. `bash .claude/plans/work-calendar-m1.verify.sh gate-d`를 실행한다.
- **Mirror**: `newtab.js:1325` `persistEvents()`의 정신 — 성공을 확인한 뒤에만 커밋한다
- **Validate**: `gate-d`가 종료 코드 0. 원복 두 파일의 sha256이 Task 1 기록과 바이트 단위로 동일하고, `context.mjs`가 다시 root 문서를 읽으며, 코드 무변경이 여전히 참이어야 한다. 0이 아니면 **Task 5를 시작하지 않는다** — Task 5는 이 두 파일을 의도적으로 편집하므로, 검증되지 않은 상태 위에 편집을 얹으면 무엇이 원본이었는지 잃는다

### Task 5: 네 문서의 상호 참조 부착
- **Action**: `PRODUCT.md:118-122`를 "판단 범위 밖"에서 "별도 문서로 위임 + `PRODUCT.calendar.md` 링크"로 바꾼다. `DESIGN.md:172`를 DD6대로 정정하고 `DESIGN.calendar.md`를 가리킨다. 두 캘린더 문서에서 root 문서를 **절 이름으로** 역참조한다. `174`의 "메인 위젯은 시계와 달력 중 택일" 문장은 네 문서 모두에 남긴다(UI10).
- **Mirror**: `PRODUCT.md:108`의 절 이름 참조 방식
- **Validate**: `gate-final`이 종료 코드 0 (아래 Validation). 4방향 링크 존재에 더해, 캘린더 문서의 역참조가 **파일명 단독이 아니라 절 이름을 동반**하는지까지 본다

### Task 6: `[셸]`·`[시계]` 태그 부착
- **Action**: `PRODUCT.md`·`DESIGN.md`의 각 절 머리에 DD5의 경계로 `[셸]`(모드 무관) 또는 `[시계]`(시계 모드 고유) 태그를 단다.
- **Mirror**: `DESIGN.md:172`의 문서 내 표기 규약
- **Validate**: `bash .claude/plans/work-calendar-m1.verify.sh gate-e` 가 종료 코드 0. Task 7이 PRD를 건드리기 전에 태그 누락을 잡는다 — `gate-final`까지 미루면 세 Task의 편집을 되감아야 한다

### Task 7: PRD 갱신과 게이트 실행 기록
- **Action**: Delivery Milestones M1 행을 `complete`로 바꾸고, Open Questions 중 "캘린더 모드 제품 문서를 만드는 절차"(DD1~DD3·DD10으로 해소)와 "M1의 산출물을 무엇으로 판정하는가"(DD7로 해소)를 해소 표기한다. **어느 게이트가 어느 플랜 판본에서 통과했는지를 함께 적는다.** 구체적으로 PRD의 M1 행 아래에 한 줄을 더한다 — 통과한 게이트 이름들, 실행 날짜, 그리고 `sha256sum .claude/plans/work-calendar-m1.plan.md | cut -c1-16` 의 출력. `gate-final`이 PRD에서 바로 그 16자를 찾으므로, 이 줄이 없으면 게이트가 죽는다.
- **Mirror**: 조사 노트의 `- [x] ~~...~~ **해소(날짜)** — 근거` 표기
- **Validate**: `gate-final`에 포함. 두 항목이 `[x]`이고 각각 해소 근거 한 줄을 가지며, 게이트 기록 줄이 이 플랜의 현재 sha256을 담는다

## Validation

판정은 아래 스크립트 하나이며, Task 순서는 게이트 호출로 강제된다. 각 게이트는 `set -euo pipefail` 아래에서 실행되고 첫 실패에서 죽는다. **어떤 게이트도 통과 없이 다음 Task로 넘어가지 않는다.**

```bash
# .claude/plans/work-calendar-m1.verify.sh — 이 플랜의 유일한 합격 판정자.
# 사용법: bash .claude/plans/work-calendar-m1.verify.sh <gate-a|gate-b|gate-c|gate-d|gate-e|gate-final>
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"
BACKUP=".claude/_backup/m1"                 # DD2 — 한 번만 정의한다
CAL_PRODUCT="${CAL_PRODUCT:-PRODUCT.calendar.md}"   # DD10 — M3는 이 둘만 덮어 같은 게이트를 재사용한다
CAL_DESIGN="${CAL_DESIGN:-DESIGN.calendar.md}"
ANSWERS=".claude/plans/work-calendar-m1.answers.md"
SKILL="$HOME/.claude/skills/impeccable"
CODE_PATHS="newtab.js newtab.css newtab.html manifest.json fonts images test"
DOC_PATHS="PRODUCT.md DESIGN.md"                     # Task 2가 실제로 옮기는 둘
# CAL_* 는 M3가 덮는 값이다. 경로가 아니라 저장소 루트의 파일명이어야 한다 —
# 디렉터리 성분이 섞이면 게이트가 의도치 않은 파일을 읽는다.
case "$CAL_PRODUCT$CAL_DESIGN" in */*|*..*) echo "[GATE-FAIL] CAL_PRODUCT/CAL_DESIGN 는 루트 파일명이어야 한다" 1>&2; exit 1 ;; esac
die() { echo "[GATE-FAIL] $*" 1>&2; exit 1; }

code_unchanged() {                          # 두 축 중 "차이" 축 (README.md:250)
  [ -z "$(git diff --stat -- $CODE_PATHS)" ] || die "코드가 바뀌었다 — M1의 전제(UI8)가 깨졌다"
}

case "${1:?gate name required}" in

gate-a)   # 착수 조건. Task 1보다 먼저 돈다.
  code_unchanged
  [ -z "$(git status --porcelain -- $CODE_PATHS)" ] || die "코드 경로에 미커밋 변경이 있다"
  # 옮길 두 파일이 커밋돼 있고 깨끗한가. `git checkout` 탈출구가 성립하는 유일한 조건이며,
  # 미커밋 편집이 있는 채로 옮기면 그 편집은 되돌릴 곳이 없다.
  for f in $DOC_PATHS; do
    [ -f "$f" ] || die "$f 가 없다 — swap의 대상이 존재하지 않는다"
    git ls-files --error-unmatch "$f" >/dev/null 2>&1 || die "$f 가 커밋돼 있지 않다 — git checkout 복구가 불가능하다"
  done
  [ -z "$(git status --porcelain -- $DOC_PATHS)" ] \
    || die "PRODUCT.md/DESIGN.md 에 미커밋 변경이 있다 — 옮기면 그 편집을 되돌릴 수 없다"
  [ -f "$SKILL/scripts/context.mjs" ] || die "impeccable context.mjs가 없다 — DD1의 전제가 성립하지 않는다"
  [ -f "$SKILL/reference/init.md" ] && [ -f "$SKILL/reference/document.md" ] \
    || die "impeccable reference 문서가 없다"
  OBSERVED=$(sed -n 's/^version:[[:space:]]*//p' "$SKILL/SKILL.md" | head -1)
  PINNED=$(sed -n 's/^impeccable-version:[[:space:]]*//p' "$ANSWERS" | head -1)
  [ -n "$OBSERVED" ] && [ "$OBSERVED" = "$PINNED" ] \
    || die "impeccable 버전 불일치 (관측 '$OBSERVED' vs 고정 '$PINNED') — DD1/DD3의 근거가 이 버전에서 확인된 것이므로 재확인 없이 진행하지 않는다"
  node "$SKILL/scripts/context.mjs" | head -1 | grep -q '^# PRODUCT\.md$' \
    || die "양성 프로브 실패 — 로더가 지금 root 문서를 읽지 않는다"
  echo "[GATE-A] ok (impeccable $OBSERVED, 코드 무변경, 로더가 root를 읽는다)" ;;

gate-b)   # swap이 성립했는가. 생성 시작 전.
  sha256sum -c "$BACKUP/SHA256SUMS"
  [ ! -f PRODUCT.md ] && [ ! -f DESIGN.md ] || die "root 문서가 아직 치워지지 않았다"
  # 음성 프로브 — 백업 경로가 어디든, 로더가 그것을 집지 않았음을 증명한다 (DD2)
  node "$SKILL/scripts/context.mjs" 2>&1 | grep -q 'NO_PRODUCT_MD' \
    || die "음성 프로브 실패 — 로더가 백업본을 집었다. 백업 위치가 fallback 경로에 있다"
  echo "[GATE-B] ok (swap 성립, 로더는 NO_PRODUCT_MD)" ;;

gate-c)   # 생성물 검사. 원복 전.
  [ -f "$CAL_PRODUCT" ] && [ -f "$CAL_DESIGN" ] || die "생성물 둘 중 하나가 없다"
  grep -q '^## Register' "$CAL_PRODUCT" || die "Register 절이 없다"
  grep -qE '^\s*product\s*$' "$CAL_PRODUCT" || die "register 값이 product 가 아니다"
  head -5 "$CAL_DESIGN" | grep -q '<!-- SEED' || die "seed 마커가 없다 — scan 모드로 빠졌다 (DD3)"
  ! grep -qE '^##.*Components' "$CAL_DESIGN" || die "Components 절이 있다 — UI6 위반"
  for h in Overview Colors Typography Elevation "Do's and Don'ts"; do
    grep -qF "$h" "$CAL_DESIGN" || die "6절 헤더 '$h' 가 없다"
  done
  # Named Rule 형식 — `**The … Rule.**` 이 아닌 Rule 줄이 하나라도 있으면 죽는다.
  ! grep -nE '^\*\*.*Rule\.?\*\*' "$CAL_DESIGN" | grep -qvE '^\s*[0-9]+:\*\*The .+ Rule\.\*\*' \
    || die "Named Rule 형식이 어긋난 줄이 있다 — `**The [이름] Rule.**` 이어야 한다"
  sha256sum -c --ignore-missing <(grep 'design.json' "$BACKUP/SHA256SUMS") \
    || die "사이드카가 바뀌었다 — seed 모드는 사이드카를 쓰지 않아야 한다 (DD3)"
  # 답안지 must-contain — 스킬 질문 순서가 바뀌어도 답의 내용은 매이지 않는다 (DD8).
  # 목록이 비면 아래 루프가 한 번도 돌지 않아 검사 없이 통과한다. 빈 목록은 통과가 아니다.
  NEEDLES=$(sed -n 's/^must-contain:[[:space:]]*//p' "$ANSWERS" | grep -c . || true)
  [ "${NEEDLES:-0}" -ge 4 ] || die "답안지 must-contain 이 $NEEDLES 개다 — 최소 4개(상기·Esc·제안까지·택일)가 있어야 한다"
  sed -n 's/^must-contain:[[:space:]]*//p' "$ANSWERS" | while read -r NEEDLE; do
    [ -z "$NEEDLE" ] && continue
    grep -qF "$NEEDLE" "$CAL_PRODUCT" "$CAL_DESIGN" \
      || die "답안지 항목이 생성물에 없다: $NEEDLE"
  done
  echo "[GATE-C] ok (seed 계약·6절·답안지 적중)" ;;

gate-d)   # 원복 증명. Task 5의 의도된 편집 전.
  sha256sum -c <(grep -vE 'design\.json' "$BACKUP/SHA256SUMS")
  node "$SKILL/scripts/context.mjs" | head -1 | grep -q '^# PRODUCT\.md$' \
    || die "원복 실패 — 로더가 root 문서를 다시 읽지 못한다"
  code_unchanged
  [ -z "$(git diff --stat -- PRODUCT.md DESIGN.md)" ] \
    || die "원복본이 커밋 상태와 다르다 — swap이 원본을 훼손했다"
  echo "[GATE-D] ok (바이트 동일 원복)" ;;

gate-e)   # Task 6 직후, Task 7 전. 태그 누락을 여기서 잡는다.
  for f in $DOC_PATHS; do
    TOTAL=$(grep -c '^## ' "$f"); TAGGED=$(grep -cE '^## .*\[(셸|시계)\]' "$f")
    [ "$TOTAL" = "$TAGGED" ] || die "$f 에 태그 없는 절이 $((TOTAL-TAGGED))개 있다"
  done
  echo "[GATE-E] ok (태그 커버리지 100%)" ;;

gate-final)   # Task 7 이후. 의도된 편집이 전부 반영된 상태를 본다.
  code_unchanged
  for f in PRODUCT.md DESIGN.md PRODUCT.calendar.md DESIGN.calendar.md; do
    [ -f "$f" ] || die "문서 누락: $f"
  done
  grep -q 'PRODUCT.calendar.md' PRODUCT.md || die "PRODUCT.md 가 캘린더 문서를 가리키지 않는다"
  grep -q 'DESIGN.calendar.md'  DESIGN.md  || die "DESIGN.md 가 캘린더 문서를 가리키지 않는다"
  # 역참조는 파일명 단독이 아니라 절 이름을 동반해야 한다 (Task 5 / PRODUCT.md:108 방식)
  grep -qE '(PRODUCT|DESIGN)\.md[^)]{0,40}절' "$CAL_PRODUCT" \
    || die "PRODUCT.calendar.md 의 역참조에 절 이름이 없다"
  grep -qE '(PRODUCT|DESIGN)\.md[^)]{0,40}절' "$CAL_DESIGN" \
    || die "DESIGN.calendar.md 의 역참조에 절 이름이 없다"
  # 값 복사 금지 (DD4) — 손으로 고른 목록이 아니라 원본에서 측정치 토큰을 뽑아 전부 본다
  git show HEAD:PRODUCT.md > "$BACKUP/.orig-product" 2>/dev/null || true
  git show HEAD:DESIGN.md  > "$BACKUP/.orig-design"  2>/dev/null || true
  # 2차 패널 security 지적 흡수 — rem·px·unitless lineHeight·hex 가 빠져 있었다.
  grep -ohE '[0-9]+(\.[0-9]+)?:1|sRGB [0-9]+|-?[0-9]*\.?[0-9]+(em|rem|px|s)|brightness\([0-9.]+\)|#[0-9A-Fa-f]{6,8}|lineHeight: [0-9.]+' \
    "$BACKUP/.orig-product" "$BACKUP/.orig-design" | sort -u > "$BACKUP/.tokens"
  while read -r TOK; do
    [ -z "$TOK" ] && continue
    ! grep -qF "$TOK" "$CAL_PRODUCT" "$CAL_DESIGN" \
      || die "상속 값이 복사됐다: $TOK — 참조로 바꿔라 (DD4/UI5)"
  done < "$BACKUP/.tokens"
  # 시계 지표 누출 (DD5) — 한 문구가 아니라 성공 지표 어휘 전체를 본다
  ! grep -qE '사진이 몇 퍼센트|사진 노출|사진 표시 비율|사진이 안 가려' "$CAL_PRODUCT" "$CAL_DESIGN" \
    || die "시계 모드 성공 지표가 캘린더 문서에 샜다"
  # DD12 — PRODUCT.md 가 brightness 수치를 더 이상 들고 있지 않은가
  ! grep -qE 'brightness\([0-9.]+\)' PRODUCT.md \
    || die "PRODUCT.md 가 아직 brightness 수치를 복사하고 있다 — DESIGN.md 의 절 이름으로 바꿔라 (DD12)"
  # DD6 — 옛 문구가 사라지고 확정 문구가 들어왔는가
  ! grep -q 'dogfooding 결과 대기' DESIGN.md || die "DESIGN.md 에 폐기된 v2 dogfooding 문구가 남아 있다 (DD6)"
  grep -q 'DESIGN.calendar.md' DESIGN.md || die "DESIGN.md 범위 절이 캘린더 시각 문서를 가리키지 않는다 (DD6)"
  # DD7 — 값이 아니라 절차가 적혔는가. M3의 두 결정을 이름으로 확인한다
  grep -qE '대비.*재측정|재측정.*대비' "$CAL_DESIGN" \
    || die "오늘 줄 제목의 대비 재측정 절차가 $CAL_DESIGN 에 없다 (DD7)"
  grep -qE '부하.*(형태|테두리|패턴|축)' "$CAL_DESIGN" \
    || die "부하와 중요도를 가르는 축이 $CAL_DESIGN 에 없다 (DD7)"
  # 게이트 실행 기록이 이 플랜 판본에 묶였는가 (Task 7)
  PLANHASH=$(sha256sum .claude/plans/work-calendar-m1.plan.md | cut -c1-16)
  grep -q "$PLANHASH" .claude/prds/work-calendar.prd.md \
    || die "PRD의 게이트 기록이 현재 플랜 판본($PLANHASH)을 가리키지 않는다"
  rm -f "$BACKUP/.orig-product" "$BACKUP/.orig-design" "$BACKUP/.tokens"
  echo "[GATE-FINAL] ok" ;;

*) die "unknown gate: $1" ;;
esac
```

### 답안지 형식 (`.claude/plans/work-calendar-m1.answers.md`)

GATE-A는 `impeccable-version:` 을, GATE-C는 `must-contain:` 줄 전부를 읽는다. 두 접두어가 이 파일의 계약이며, 접두어는 줄 맨 앞에 오고 값은 한 줄에 하나다. 나머지 산문은 사람이 인터뷰에서 그대로 붙여 넣기 위한 것이다.

```markdown
# M1 인터뷰 답안지

impeccable-version: 3.5.0

<!-- 착수 시점에 SKILL.md 에서 관측한 값. GATE-A가 이 값과 실제를 대조하고
     다르면 죽는다. 순환 의존은 없다 — 이 값은 impeccable을 실행해서가 아니라
     SKILL.md 를 읽어서 얻으며, 그것은 Task 0 이전에 가능하다. -->

## /impeccable init — Step 3 인터뷰 답

- register: `product`
- Users: PRD `## Users` 절 Primary 4항목을 그대로 옮긴다
- Purpose: PRD `## Hypothesis` 문장
- Brand Personality / Anti-references: PRD `## Design Direction` 좌열 4항목
- Accessibility: 대비 기준은 `PRODUCT.md` 의 실측 절을 상속한다고만 적는다 (DD4)

## /impeccable document --seed — 다섯 질문 답

- 색 전략 / 타이포 방향 / 모션 에너지 / 참조 셋 / anti-reference 하나
- 다섯 답 모두 `DESIGN.md` 의 해당 절을 이름으로 가리키고 값을 옮기지 않는다

## must-contain — 생성물에 반드시 있어야 하는 문자열

must-contain: 상기
must-contain: Esc
must-contain: 제안까지
must-contain: 택일
```

`must-contain` 네 줄은 조사 노트 판정 1이 "새 문서에 반드시 들어가야 할 것"으로 든 넷에 대응한다 — ambient의 성공 지표(상기), 두 상태 계약의 이탈 키(Esc), 매니저의 경계(제안까지 하고 결정은 사용자), 그리고 두 문서가 공유하는 단 하나(모드는 택일)다. 늘리는 것은 자유이나 줄이면 GATE-C가 그만큼 느슨해진다.

**이 스크립트가 저장소의 유일한 자동 판정 수단이다.** `test/positioning.smoke.js`는 위치 회귀 전용이라 이 마일스톤을 검사하지 않고, `package.json`도 테스트 러너도 없다. 그래서 판정을 산문 체크리스트로 두지 않고 실행 가능한 코드로 만들었다 — 1차 리뷰 패널 invariant 관점이 지적한 것이 정확히 그 점이었다.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **swap 도중 중단되어 root 문서가 사라진 채 남는다** | Medium | 두 파일 모두 커밋된 상태이므로 `git checkout -- PRODUCT.md DESIGN.md`가 항상 완전 복구다. GATE-B가 실패하면 생성을 시작조차 하지 않으므로 중단 지점이 좁다 |
| **impeccable이 버전업되어 DD1·DD3의 근거가 달라진다** | Medium | GATE-A가 `SKILL.md`의 `version`을 답안지의 고정값과 대조하고 불일치 시 죽는다. 관측 버전 `3.5.0`. 올라갔다면 두 reference를 다시 읽고 DD를 갱신하는 것이 착수 조건이다 |
| **백업을 fallback 경로에 두어 swap이 성립하지 않는다** | Medium | 경로 문자열 검사가 아니라 GATE-B의 **음성 프로브**로 판정한다. 로더가 `NO_PRODUCT_MD`를 내지 않으면 백업본을 집은 것이고 게이트가 죽는다 |
| **생성물이 시계 모드 내용을 베낀다** | High | 코드의 대부분이 셸과 시계이므로 크롤이 그것을 가져올 가능성이 높다. 답안지(DD8)가 답을 고정하고, GATE-C의 `must-contain`이 필요한 것이 들어왔는지를, `gate-final`의 어휘 검사가 들어오면 안 되는 것이 샜는지를 각각 본다 |
| **`--seed`가 무시되고 scan 모드로 빠진다** | Low | GATE-C가 seed 마커·Components 절 부재·사이드카 해시 불변 셋을 함께 보므로 어느 쪽으로 빠져도 잡힌다 |
| **두 문서 표류** — 상속 값이 갈라진다 | Medium | `gate-final`이 원본에서 측정치 토큰을 **기계적으로 추출해 전부** 대조한다. 손으로 고른 목록이 아니므로 새 값이 원본에 생겨도 자동으로 검사 대상이 된다 |
| **M1 판정이 자기충족적이다** — 작성자가 판정자다 | High | PRD가 이미 "검증되지 않았다"고 적었다. DD7이 값 선결을 거부해 판정을 "규칙이 결정을 내리게 하는가"로 좁힌다. 남는 약점이므로 Acceptance에 한 명이 두 역할을 한다는 사실을 명시한다 |
| **fan-out 결과를 M1에서 소비하려는 유혹** | Medium | DD9가 경계를 긋는다. CRITICAL 7건은 전부 M2의 데이터 모델 결정이며, M1에서 손대면 코드 무변경 전제가 깨진다 |
| **태그가 붙었으나 잘못 붙는다** — `[셸]`이어야 할 절에 `[시계]`가 간다 | Medium | **게이트가 잡지 못한다.** 스크립트가 보는 것은 커버리지(태그 없는 절 0개)이지 판단의 옳고 그름이 아니며, 어느 절이 모드 무관인지는 DD5의 경계를 사람이 적용해야 안다. 2차 패널 architect의 지적 그대로다. 완화는 검사가 아니라 범위다 — 대상이 두 문서의 `## ` 절 십수 개로 작아 Task 6 직후 통독으로 잡는다. 자동 판정이 없다는 사실을 적어 두는 편이 게이트가 잡는 척하는 것보다 낫다 |
| **게이트를 건너뛰고 Acceptance를 체크한다** | Medium | Acceptance의 마지막 항목이 체크박스가 아니라 **`gate-final`의 종료 코드**다. 그리고 `gate-final`은 PRD의 게이트 기록이 현재 플랜 sha256을 담는지까지 보므로, 옛 판본에서 통과한 기록을 재사용할 수 없다 |

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
- [ ] **`bash .claude/plans/work-calendar-m1.verify.sh gate-final`이 종료 코드 0** — 이 항목이 위 체크박스들의 실질이다. 개별 항목을 손으로 체크하는 것으로는 대신할 수 없고, 게이트가 현재 플랜 sha256을 확인하므로 옛 판본의 통과 기록을 재사용할 수도 없다
- [ ] 다섯 게이트(A·B·C·D·E)가 각각 자기 Task 앞에서 0을 냈다 — 마지막에 몰아서 돌린 것이 아니다(DD11)
- [ ] Patterns 재사용, 재발명 아님 — 문서 형식은 `DESIGN.md`의 6절과 Named Rule 관용구를 따른다
- [ ] **대리 판정**(PRD Open Question 해소안, DD7): `DESIGN.calendar.md`만 열어 놓고 M3의 시각 결정 두 개를 실제로 내려 본다. 첫째, 오늘 줄이 제목을 담을 때 대비를 **어떤 절차로** 다시 재는가. 둘째, 겹친 부하를 중요도(이미 알파 단계 사용)와 **어떤 축으로** 가르는가. 두 물음에 문서가 답하지 못하면 M1은 미완이다. **판정자와 작성자가 같은 사람이라는 한계를 판정 기록에 함께 적는다.**
- [ ] 게이트/경로를 실제로 1회 완주하고 산출물을 확인 — swap 절차(GATE-A → 치움 → GATE-B → 생성 → GATE-C → 원복 → GATE-D)를 끝까지 한 번 돌리고, 그 결과로 root 두 문서의 sha256이 Task 1 기록과 일치하며 캘린더 두 문서가 실재한다. 검사 항목이 개별로 통과하는 것과 절차가 완주되는 것은 다르다

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

M1이 생성 단계에서 쓸 명령은 `system` 단계의 `/impeccable init`과 `/impeccable document --seed` 둘이며, 그 호출은 이 게이트가 아니라 Task 2·3에서 일어난다.

## Codex Adversarial Review

<!-- placeholder: will be replaced by Phase 7.3 -->
