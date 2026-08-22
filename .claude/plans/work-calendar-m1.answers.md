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
