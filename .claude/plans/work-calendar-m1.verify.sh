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
