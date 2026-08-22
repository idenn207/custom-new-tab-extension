# 구현 게이트 기록 — 업무 캘린더 M1

**대상 플랜**: `.claude/plans/work-calendar-m1.plan.md`
**게이트**: `mccp-implement-codex` · decision `work-calendar-m1`
**작성**: `/mccp:prp-implement` Phase 2.5 (2026-08-22)

> **왜 플랜 본문이 아니라 이 파일인가.** Phase 2.5.4 는 이 절을 플랜 본문에 주입하라고 요구하고,
> Phase 2.5.7 은 그 직후 읽기-검증을 통과하라고 요구한다. 그런데 주입은 플랜의 sha256 을 바꾸고,
> 바뀐 해시는 상류 `mccp-plan-codex` 수신증을 `stale` 로 만든다 — 즉 같은 명령의 두 요구가 서로를
> 배제한다. 이 플랜은 특히 그 충돌에 취약하다: 자기 해시가 하중을 받는 앵커이기 때문이다
> (DD14 판정 기준 지문 · DD20 의 PRD 게이트 기록 줄 · GATE-A 의 `verify.sh` 바이트 비교 ·
> DD24 의 답안지↔플랜 템플릿 결속).
>
> 그래서 산출물을 이 파일로 옮기고 플랜을 원상 복구했다. **자리는 한 번 더 옮겼다** — 처음 쓴 곳은
> `.claude/notes/` 였는데 `.gitignore:6`(mccp 관리 블록 **밖**, 사용자 자신의 규칙)이 그 디렉터리를
> 통째로 무시한다. 커밋되지 않는 감사 기록은 감사 기록이 아니므로, 이미 추적되는 `.claude/reviews/`
> 로 옮겼다. 근거는 Phase 2.5.6 Step A 가 검증 대상을
> **`<plan or notes path>`** 로 명시한다는 것이다 — notes 경로가 이 게이트의 정당한 산출 자리다.
> 복구 후 플랜의 해시는 `sha256:417d10160ace1cc6ef61fccbf915d26f42fea2e188399e275bc70953c8fafb56`
> 로, 상류 수신증이 앵커한 값과 바이트 단위로 같다(9,303 바이트의 주입분을 떼어 재현 확인).

---

## Codex Implementation Review

<!-- Auto-injected by /mccp:prp-implement Phase 2.5.4. 이 절에는 코드 펜스를 넣지 않는다 —
     GATE-A 는 `gate-final)` 를 품은 bash 펜스를, DD24 는 markdown 펜스 **전부**를 이어붙여
     답안지와 대조하므로, 여기에 펜스가 하나라도 생기면 두 장치가 조용히 어긋난다. -->

- 호출: `node C:/Users/skypark207/.claude/plugins/cache/mccp/mccp/1.30.0/scripts/lib/codex-invoke.js adversarial-review` (fail-closed Bash wrapper, v0.2.2)
- 라운드 수: 1 (`MCCP_REVIEW_SINGLE_PASS=deadline_pressure` 로 cap 이 1 에 고정됨)
- 합치 결론: Codex 판정은 `needs-attention` 이며 지적 둘 다 **실재한다.** HIGH 는 이 구현이 진입 전에 스스로 지목한 자리와 같다 — 플랜 Task 2·3 이 cwd 를 `$STAGE` 로 둔 채 impeccable 을 부르라고 요구하는데 Skill 도구는 cwd 를 바꾸지 못한다. 다만 **전제는 맞고 귀결은 틀렸다**: impeccable 4.1.1 은 프로그램이 아니라 **지시문**이고(`SKILL.md` Setup 1·`init.md` 3행·`document.md` 354-360행), cwd 에 민감한 실행 지점은 내가 Bash 로 부르는 `context.mjs` 와 workshop 스크립트뿐이다. 그 자리는 `cd "$STAGE"` 로 통제된다. 따라서 계약 불일치는 **해소 가능**하되, "실제로 `$STAGE` 에서 돌았는가"를 기계가 증명하지 못한다는 잔여는 남는다 — 그 잔여를 아래 Open Questions 에 명시하고, 우회를 발명하는 대신 정지 규칙으로 물렸다.

- YAGNI Triage:

| Finding | Severity | Verdict | Why |
|---|---|---|---|
| F1 — staging cwd 계약을 Skill 도구가 제공하지 못한다 | HIGH | ACCEPT_NOW | 전제는 정확하나 귀결이 틀렸다. impeccable 은 지시문 기반이므로 cwd 민감 지점은 Bash 호출 하나이고 그것은 통제된다. R1 에서 아래 **구현 시점 계약**으로 흡수 완료 |
| F2 — `.gitattributes` LF 규칙이 지시만 되고 게이트되지 않는다 | MEDIUM | DEFER_TO_BACKLOG | 수리가 GATE-A 수정 → 플랜 수정 → plan sha256 변경 → `mccp-plan-codex` 수신증과 DD20 앵커 동시 무효화로 번진다. MEDIUM 대비 폭발 반경 과다. Task 0 이 `.gitattributes` 를 실제로 만드는 것으로 완화 |

- **F1 흡수 — 구현 시점 계약 (이 실행에 구속력이 있다):**
  - impeccable 의 cwd 민감 호출(`context.mjs`, `concept-seed.mjs`, `serve-question.mjs`, 그리고 산출물 쓰기)은 **전부** Bash 에서 `cd "$STAGE"` 로 실행하며, 스킬 스크립트는 plugin 절대 경로로 부른다(플랜이 이미 못박은 바 — 답안지 `## /impeccable document --seed` 절의 "스크립트 경로 주의").
  - 저장소 루트를 cwd 로 둔 채 `init` 이나 `document --seed` 를 부르지 않는다. 루트에서 `--seed` 는 기존 구현 존재로 거부되는 것이 정상 동작이며(DD1-3), 그 거부를 우회하지 않는다.
  - **손으로 쓰지 않는다.** 생성물이 impeccable 의 산출이 아니게 되면 UI2 가 깨지고, 그 위반은 GATE-C 의 형태 검사를 그대로 통과한다 — 즉 게이트가 잡지 못하는 종류다.
  - 위 셋 중 하나라도 이 하네스에서 수행 불가함이 드러나면 **우회를 만들지 않고 정지해 사용자에게 보고한다.** Codex 의 권고(`stop and report`)를 이 형태로 받아들인다.

- Deferred to backlog: 1 → `.claude/plans/codex-findings-backlog.md` (id=impl-r1-f2)
- Open Questions: `$STAGE` 에서 생성이 실제로 일어났는지의 **출처 증명**은 기계가 하지 못한다 — severity MEDIUM. GATE-B 의 양성 프로브가 생성 **전에** 그 자리가 깨끗함을, GATE-D 가 생성 **후에** 저장소가 무변경임을 각각 증명하지만, 둘 사이에서 생성기가 실제로 그 자리에서 돌았는지는 증명 대상 밖이다. 플랜이 Risks 표에 이미 적어 둔 잔여와 같은 종류이며, 위 구현 시점 계약의 마지막 줄(정지 규칙)이 그 창을 규율로 닫는다. §0 auto-CRITICAL 카탈로그(보안 경계·원자적 상태·스키마 파괴) 어디에도 해당하지 않는다.
- Codex session 참조: thread `01a02818-f405-7d32-b5d8-04b262b5dac3`

### Security Reviewer

> **not invoked — 발동 조건이 성립하지 않는다(auto-fallback 아님).** Phase 2.5.5 는 보안 민감 영역(인증·암호·비밀·입력 검증·SQL/명령 주입·SSRF·경로 순회·권한 상승)에 **한해** security-reviewer 를 부르라고 요구한다. 이 마일스톤의 산출물은 문서 넷과 게이트 스크립트 하나이고 확장 코드는 한 줄도 바뀌지 않으므로(UI8), 그 여덟 표면 중 어느 것도 건드리지 않는다.
>
> **따라서 수신증에 `security_skipped=true` 를 찍지 않는다.** 그 플래그는 스키마 주석(`schema.js:320`)이 못박듯 "security-reviewer **auto-fallback**" — 즉 리뷰어가 **필요했는데 실패한** 경우 — 을 추적하며, `/mccp:pr` 을 exit 2 로 차단한다(`tests/e2e-dogfood.test.js:59`). 부르지 않아도 되는 것을 부르지 못했다고 적으면 하류에 **거짓 차단**을 만든다. 조건 불성립과 호출 실패는 다른 사실이고, 수신증은 둘을 구분해 적어야 한다.
>
> 남는 사실 하나를 숨기지 않고 적는다 — 이 세션은 사용자가 명시적으로 요청하지 않는 한 Agent 도구 호출이 금지돼 있으므로, 조건이 성립했더라도 이 실행에서는 security-reviewer 를 부를 수 없었을 것이다. 그 경우의 올바른 기록은 `security_skipped=true` 였다.

### Design Review

impeccable-detect(`--mode implement`) 최초 실행: `skill_available=false` · `reason=skill-missing`. **이것은 사실이 아니며, 원인을 특정했으므로 우회가 아니라 정정으로 처리한다.**

- **근본 원인.** mccp `scripts/lib/impeccable-detect.js` 139행 의 `probeKeys` 는 매니페스트 키를 `impeccable@anthropics` 와 `impeccable` **둘만** 찾는다. 이 환경의 실제 설치 키는 `impeccable@impeccable`(marketplace `impeccable`, plugin `impeccable`, `installPath` = `~/.claude/plugins/cache/impeccable/impeccable/4.1.1`, `version: 4.1.1`)이라 두 키 어디에도 걸리지 않는다. 그래서 프로브가 폴백(146-153행)으로 내려가 `~/.claude/skills/impeccable` 을 찾는데, **그 디렉터리는 이 플랜 Task 0 의 선행 조건이 지우라고 요구한 폐지된 CLI 설치본이다**(DD19).
- **즉 플랜의 선행 조건을 지키면 mccp 의 검출기가 반드시 `skill-missing` 을 낸다.** DD19 가 플랜 게이트에서 고친 것과 **같은 종류의 결함**(게이트가 검사하는 경로와 스킬이 실제로 사는 경로의 불일치)이 한 층 위 mccp 쪽에 남아 있다. 플랜의 `## Design Critique` 절이 기록한 plan 단계 관측(`skill_available=true`)과 지금이 갈리는 이유도 이것이다 — 그 사이에 레거시 설치본이 제거됐다.
- **정정.** `MCCP_IMPECCABLE_SKILL=available` 을 쓴다. 이것은 같은 함수 135행 이 **첫 번째로** 보는 일급 override 이며 임시방편이 아니다. 그리고 이 값은 **참이다** — plugin 4.1.1 의 `skills/impeccable/SKILL.md` 를 직접 읽어 `name: impeccable` · `version: 4.1.1` · `user-invocable: true` 를 확인했고, DD1 이 인용하는 계약 넷(`init.md` 3행·100행, `document.md` 78행·354-360행·380행, 정규 8절 51-59행)도 같은 설치본에서 원문으로 재확인했다. 사실이 아닌 것을 참으로 만드는 override 가 아니라, 탐지가 놓친 사실을 되돌려 놓는 override 다.
- **하류 영향을 적어 둔다.** 정정하지 않았다면 `impeccable_skipped=true` 가 수신증에 찍혀 `/mccp:pr` 이 차단됐을 것이다. 즉 이 결함의 대가는 "플랜의 선행 조건을 지킨 실행이 PR 게이트에서 막히는 것"이었다.

정정 후 관측: `skill_available=true` · `design_signal=false` · `silent_skip=true` · `silent_skip_reason=no-signal`.

- **판정: silent-skip 행(SKILL_AVAIL=1 · SIGNAL=0)이며 이것이 이 마일스톤의 정답이다.** M1 은 확장 코드를 한 줄도 바꾸지 않으므로(UI8) diff 에 렌더 표면(`.tsx/.jsx/.vue/.svelte/.astro/.css/.scss/.html` · `.claude/cache/{STATUS.md,status.html}`)이 **없다.** 비평할 화면이 생기지 않는다는 것은 플랜 `## Design Critique` 절이 이미 같은 근거로 적어 둔 사실이다.
- 따라서 critique retry loop 를 돌리지 않고, stage-aware routing 도 하지 않으며, Phase 2.5.5c 의 design-direction capture 도 발동하지 않는다(그 결과 Phase 3.6 DESIGN FINISH 와 Phase 3.7 DESIGN GROUNDING VERIFY 는 각각 자기 게이트에서 no-op 이 된다). 수신증에는 `--impeccable-silent-skip --impeccable-silent-skip-reason no-signal` 을 정보성으로 forward 한다 — M1 계약상 차단이 아니다.
- **혼동하지 말 것.** 여기서 impeccable 을 부르지 않는다는 것은 이 **게이트**가 부르지 않는다는 뜻이지, 마일스톤이 부르지 않는다는 뜻이 아니다. UI2 가 요구하는 impeccable 호출(`init` · `document --seed`)은 Phase 3 의 Task 2·Task 3 에서 일어나며, 그것이 이 마일스톤의 본론이다.

---

## 실행 정지 기록 — Task 2 (2026-08-22)

**Task 0·Task 1 완료(GATE-A·GATE-B 각각 exit 0), Task 2 에서 정지.** 정지의 근거는 이 문서 위쪽
`## Codex Implementation Review` 의 **F1 흡수 — 구현 시점 계약** 마지막 줄이다: "이 하네스에서
수행 불가함이 드러나면 우회를 만들지 않고 정지해 사용자에게 보고한다."

### 무엇이 막혔나

`Skill(impeccable, "init")` 과 `Skill(impeccable:impeccable, "init")` 이 둘 다 `Unknown skill` 로
거부된다. impeccable 스킬이 이 세션의 스킬 레지스트리에 없다. UI2 는 "문서는 임의 편집이 아니라
impeccable 스킬을 경유해 생성한다"를 **constraint** 로 못박았으므로, 스킬 없이 Task 2·3 을
진행하는 것은 이 마일스톤의 중심 주장을 만드는 대신 흉내내는 것이 된다.

### 원인 특정 (증거와 함께, 그리고 한 번의 오진 포함)

- **설치와 활성화는 정상이다.** `installed_plugins.json` 에 `impeccable@impeccable` 이 있고
  (`installPath` = `~/.claude/plugins/cache/impeccable/impeccable/4.1.1`, `version: 4.1.1`,
  `installedAt: 2026-08-22T04:20:04Z`), `~/.claude/settings.json` 의 `enabledPlugins` 에
  `"impeccable@impeccable": true` 가 있다. `SKILL.md` 도 실재하며 `name: impeccable` ·
  `version: 4.1.1` · `user-invocable: true` 이고 description 은 895자로 한도 안이다.
- **세션 시점 문제가 아니다.** 설치 04:20Z, 이 세션 첫 hook-trace 05:58Z — 설치가 세션보다 1시간 38분 앞선다.
- **오진 하나를 기록해 둔다(반증됨).** 처음에는 `SKILL.md` 의 CRLF(CR 85개)를 원인으로 지목했다.
  DD22 가 `verify.sh` 에 대해 기술한 것과 같은 실패 형태였기에 그럴듯했다. **그러나 반증됐다** —
  설치된 모든 플러그인의 `SKILL.md` 를 전수 조사하니 `claude-plugins-official/vercel` 96개와
  `openai-codex/codex` 6개가 CRLF 인데 **둘 다 정상 등록돼 있다.** 로더는 CRLF 를 문제 삼지 않는다.
- **남은 유일한 구조적 차이는 매니페스트다.** `plugin.json` 의 `skills` 필드를 전수 대조한 결과,
  정상 등록된 플러그인(mccp · vercel · codex · skill-creator · frontend-design)은 **전부 이 필드가
  없고** 기본 `./skills/` 규약에 의존한다. 문자열 `"./skills/"` 를 명시한 것은 **impeccable 하나뿐**이며,
  그것이 등록에 실패한 유일한 활성 플러그인이다. (`vercel` 의 `.cursor-plugin` · `.kimi-plugin` 이
  같은 필드를 쓰지만 그것은 다른 하네스의 매니페스트이고 Claude 가 읽는 자리가 아니다.)
- **확신 수준을 정직하게 적는다.** 로더 내부를 볼 수 없으므로 이것은 전수 대조에 기반한 **강한 추론**이지
  증명이 아니다. 다만 CRLF 가설과 달리 이 가설은 반례가 없다.

### 이 가설이 맞다면 고칠 자리는 둘이다 (저장소 밖 — 사용자 환경)

- `~/.claude/plugins/cache/impeccable/impeccable/4.1.1/.claude-plugin/plugin.json`
- `~/.claude/plugins/marketplaces/impeccable/plugin/.claude-plugin/plugin.json`

둘 다 `"skills": "./skills/"` 를 담고 있다. 어느 쪽이든 고친 뒤에는 **세션 재시작이 필요하다** —
스킬 등록은 세션 시작에 일어나므로 이 세션 안에서는 어떤 수리로도 Task 2 를 진행할 수 없다.
저장소 밖 사용자 환경이므로 이 구현은 손대지 않고 사용자 판단에 맡긴다. 플랜이 DD19 의 선행 조건
(`~/.claude/skills/impeccable` 제거)을 다룬 방식과 같은 경계다.

### 재진입 시 상태

- `.claude/plans/work-calendar-m1.verify.sh`(656행) · `.claude/plans/work-calendar-m1.answers.md`(104행) ·
  `.gitattributes` · `.gitignore` 는 생성·`git add` 완료. **그대로 두면 된다** — GATE-A 가 추적 여부를 요구한다.
- 게이트 원장 `.claude/plans/.m1-gates.log` 에 `gate-a` · `gate-b` 가 기록돼 있고, 지문 파일 둘도 있다.
  셋 다 `.gitignore` 관리 블록 밖에서 정상 무시된다(90-92행).
- **재진입은 GATE-A 부터 다시 돈다.** 원장은 한 번의 실행에만 유효하고 GATE-A 가 새로 만든다(DD17).
  staging `/tmp/work-calendar-m1-stage` 는 비어 있으며 Task 1 이 다시 만든다.
- 저장소의 `PRODUCT.md` · `DESIGN.md` · `.impeccable/design.json` 은 **한 바이트도 바뀌지 않았다** —
  GATE-A 가 뜬 베이스라인이 그대로 유효하고, 생성 단계에 들어가지 않았으므로 되돌릴 편집도 없다.

### 정지 해제 — 사용자 결정 (2026-08-22)

사용자가 위 정지 보고를 받은 뒤 **"해당 경로를 명시하고 (mccp 환경변수를 이용) 구현을 계속하라"**
고 지시했다. 우려를 제기했고 사용자가 요청을 재확인했으므로 그 판단을 따른다. 무엇이 달라지고
무엇이 달라지지 않는지를 적어 둔다.

- **달라지는 것은 지시문을 로드하는 경로 하나다.** `Skill(impeccable, …)` 도구는 SKILL.md 와
  해당 `reference/*.md` 를 컨텍스트에 넣는 것이 전부이고, 그 파일들을 명시 경로에서 직접 읽으면
  **같은 바이트가 같은 자리에 들어온다.** 생성의 주체는 여전히 impeccable 의 지시문이다.
- **경로는 GATE-A 가 해석한 것과 같은 방식으로 도출한다** — `installed_plugins.json` 에서
  `impeccable@` 접두 항목의 `installPath` + `/skills/impeccable`. 후보가 하나임을 GATE-A 가
  이미 요구했고, 여기서 다른 방식으로 경로를 정하면 DD19 가 막으려는 상태(게이트가 검사한 파일과
  실행되는 파일이 다른 상태)를 스스로 만든다.
- **mccp 환경변수는 `MCCP_IMPECCABLE_SKILL=available` 하나만 쓴다.** `IMPECCABLE_CONTEXT_DIR` 은
  쓸 수 없다 — GATE-B(verify.sh 353행)가 그 변수의 설정 자체를 거부한다. 로더의 컨텍스트 자리를
  cwd 와 무관하게 덮어 staging 격리(DD2)를 깨기 때문이며, 그 거부가 옳다.
- **달라지지 않는 것 — F1 흡수 계약은 그대로 구속력을 갖는다.** cwd 민감 호출은 전부
  `cd "$STAGE"` 로 실행하고, 저장소 루트에서 `--seed` 를 부르지 않으며, 손으로 쓰지 않는다.
- **남는 잔여를 정직하게 적는다.** Skill 도구를 경유하지 않으므로 SKILL.md 의 Routing 절이
  하네스 차원에서 강제되지 않고, 그 절을 내가 읽고 따르는 것으로 대신한다. 산출물의 출처가
  impeccable 이라는 주장은 이 문서의 기록과 아래 게이트(GATE-C 의 seed 마커·정규 7절·
  Components 부재·must-contain·must-inherit)가 함께 뒷받침하며, 어느 쪽도 "지시문을 읽고 따랐다"는
  사실 자체를 기계로 증명하지는 못한다.
