# Plan Review Panel — work-calendar

**Plan**: `.claude/plans/work-calendar-m1.plan.md` · **Plan version**: `sha256:2a994f277bb63fd40500e12fa6d670b9c4def7807bb58c40799d67d317db8108`
**Verdict**: `unavailable` via `multi-agent`
**Quorum**: 4/3 responses · 4 distinct roles (of 4 fielded) · passed=false
**Layers**: L1 converged · L2 divergent · L3 not fired
**Halted at**: `5.2g2`

> Reason: plan changed after L2 read it: reviewed sha256:2a994f277bb6… but current is sha256:15fb9eab2a6d… — recovery is to rerun L2 against the current plan, NOT to reseal (DD13)

## Findings

| Perspective | Severity | Claim | Evidence |
|---|---|---|---|
| architect | HIGH | Plan validation gate-c checks for all 6 fixed design sections as required by pattern | Plan line 39 cites 'Stitch 6절 순서 고정' (6 sections fixed order), but gate-c script at lines 195-197 only validates 5 sections: Overview, Colors, Typography, Elevation, Do's and Don'ts. Missing: Components. Actual DESIGN.md has 6 sections (verified via grep of `## [0-9]`). |
| architect | MEDIUM | PRODUCT.md:108 demonstrates the pattern 'reference by section name without copying values' that UI5 and DD4 require | Plan line 38 cites PRODUCT.md:108 as precedent for 'reference by name, don't copy values'. Actual text at PRODUCT.md:108 reads: '해결값은 DESIGN.md의 Glass 절에 있다 — 본문을 담는 단일 유리에 `brightness(0.60)`을 함께 거는 것이다.' This explicitly includes a value (brightness(0.60)), directly contradicting the 'don't copy values' pattern. |
| architect | HIGH | PRODUCT.md and DESIGN.md have consistent brightness specifications for the Glass rule | PRODUCT.md:108 specifies `brightness(0.60)`, but DESIGN.md:357 (The brightness Rule) specifies `brightness(0.62)`. These conflicting values violate the structural goal of DD4/UI5 to prevent document drift. The existing codebase already exhibits the exact failure mode (token divergence) that the plan claims to prevent. DD4's token extraction will not detect this pre-existing discrepancy since both are in 'original' documents that don't change. |
| architect | MEDIUM | Plan's boundary between inherited and new material is clearly enforced by the verification scheme | DD5 states right-column items (대비판정, 유리조건, hue, 타이포·모션·포커스·줄바꿈) are inherited by reference only. Plan cites PRODUCT.md:108 as precedent. However, the existing `brightness` value already appears in both PRODUCT.md and DESIGN.md with different numbers, showing that this boundary is porous in current code. The plan does not include a Task to fix this pre-existing violation before implementing the calendar split. |
| security | MEDIUM | CAL_PRODUCT and CAL_DESIGN environment variables accept arbitrary paths including directory traversal sequences without validation, enabling path traversal attack | Plan lines 154-155 define: CAL_PRODUCT="${CAL_PRODUCT:-PRODUCT.calendar.md}" with no validation. DD10 (line 82) documents that M3 will override these variables. Lines 190-231 use these variables in grep operations that read file content: grep -q '^## Register' "$CAL_PRODUCT" (line 191), grep -qF "$NEEDLE" "$CAL_PRODUCT" (line 206), grep -qE '(PRODUCT\|DESIGN)\\.md' "$CAL_PRODUCT" (line 228). If CAL_PRODUCT is set to '../../../etc/passwd', the script would attempt to read arbitrary files. |
| security | LOW | Plan does not explicitly document whether .claude/plans/work-calendar-m1.answers.md should be version-controlled and code-reviewed, yet this file is a trust boundary controlling gate validation logic | Lines 76 (DD8) state answers file is created and used during interview; lines 156, 174, 204 show gates read this file. Plan does not specify version control status, commit requirements, or code review process for this file. Answers file controls: (1) impeccable version pinning (line 174), (2) must-contain validation criteria (line 204). While mitigated by gate-a version check and gate-final checks, trust boundary should be explicit. |
| test | MEDIUM | Token extraction in gate-final captures all inherited measurement tokens to detect copying (DD4, line 63-64). DD4 explicitly lists 'motion' as an inheritance target that must not be copied. | Regex pattern at plan line 236: `[0-9]+(\\.[0-9]+)?:1\|sRGB [0-9]+\|-?[0-9]*\\.?[0-9]+(em\|rem\|px)\|brightness\\([0-9.]+\\)\|#[0-9A-Fa-f]{6,8}\|lineHeight: [0-9.]+` includes units `(em\|rem\|px)` but omits `s`. However, DESIGN.md lines 198, 219, 220, 397 reference duration tokens like `--transition-speed` 0.3s, position 0.3s slide, and 0.15 ~ 0.2s ease. If a calendar document copied these duration values, gate-final line 240-241 would not detect the violation because the regex won't match them. |
| test | MEDIUM | DD3 asserts that seed mode behavior is documented in reference/document.md: 'seed 모드는 `reference/document.md`에 세 가지가 명시돼 있다' — specifically (1) five questions only with minimal frontmatter, (2) Components section omitted, (3) no sidecar created. | Plan line 61 makes this documentary claim about reference/document.md. But GATE-A (lines 170-172) only tests file existence: `[ -f "$SKILL/reference/init.md" ] && [ -f "$SKILL/reference/document.md" ]`. It does not validate the content of reference/document.md contains these three promises. GATE-C verifies the resulting behavior (seed marker, no Components, sidecar unchanged) but that tests that impeccable currently works as expected, not that the documentation promises these behaviors. If reference/document.md were updated to remove or change these promises, GATE-A would still pass. |
| invariant | CRITICAL | GATE-A fails to establish complete baseline before irreversible file swap. It only checks CODE_PATHS (newtab.js, CSS, HTML, manifest, fonts, images, test), excluding PRODUCT.md and DESIGN.md which will be irreversibly moved in Task 2. | Plan line 104 states gate-a establishes baseline 'before startup' (착수 전에). Plan line 158 defines CODE_PATHS without PRODUCT.md or DESIGN.md. Gate-a lines 168-169 check only CODE_PATHS via code_unchanged(). Task 2 line 114 performs irreversible move of these excluded files. If files are missing or corrupted before Task 1 backup, failure is discovered only at GATE-D after files are moved. |
| invariant | HIGH | GATE-C performs no validation if must-contain list is empty. The validation loop (lines 204-208) only executes if entries exist; zero entries result in vacuous pass without checking generated content. | Plan lines 204-208: sed-driven while loop skips entirely if no must-contain lines. If loop doesn't iterate, gate reaches line 209 echo without die(). Plan line 121 lists must-contain as GATE-C validation target, but does not require at least one entry exist. DD8 line 76 requires answers to have must-contain list, but GATE-A doesn't verify this list is non-empty. |
| invariant | MEDIUM | Task 7 action is documented vaguely ('어느 게이트가 어느 플랜 판본에서 통과했는지를 함께 적는다') but does not explicitly state it must write the current plan's sha256 to PRD. GATE-FINAL hardly enforces this anchor exists, failing with no guidance if missing. | Plan lines 138-141 describe Task 7 action without explicitly stating 'write plan sha256 to PRD'. Plan lines 260-262 GATE-FINAL requires grep for PLANHASH in PRD, dying with message 'PRD의 게이트 기록이 현재 플랜 판본을 가리키지 않는다' if missing. No instruction in Task 7 tells user what to append to PRD. |
| invariant | MEDIUM | Tasks 5, 6, 7 lack inter-task gates. All three complete before GATE-FINAL runs, meaning missed Task 6 (tag attachment) is only discovered after Tasks 5 and 7 edit files. Recovery requires rewinding multiple manual edits. | Plan line 13 states 'Task 사이의 순서는... 게이트 호출로 강제된다'. Lines 128-141 show Tasks 5-7 with validation 'gate-final에 포함' but no gates between them. GATE-FINAL (line 248-249) checks tags were attached to PRODUCT.md/DESIGN.md, but this check runs after Tasks 5 and 7 have modified those files. Plan line 84-85 DD11 states 'gates stand before irreversible steps', but Tasks 5/7 are irreversible without rework. |

## Refutation attempted

| Perspective | Verdict | What was attacked |
|---|---|---|
| architect | fail | Verified: (1) All 6 section headers actually present in DESIGN.md via grep. Confirmed gate-c script lists only 5 in the loop—"Components" missing. (2) Read PRODUCT.md:108 verbatim—confirms it includes brightness(0.60) value, not just section reference. (3) Read DESIGN.md:357 (The brightness Rule)—confirms it specifies brightness(0.62). Confirmed these values differ. (4) Traced DD4/UI5 intent (no value copying, only references)—found existing codebase already violates this for brightness rule. (5) Checked Tasks 1–7 in the plan—no Task explicitly fixes the 0.60 vs 0.62 discrepancy. (6) Verified plan does not list PRODUCT.md:108 for update in Files to Change table. |
| security | fail | Attacked the plan's input validation, trust boundaries, and data leakage vectors. Traced CAL_PRODUCT and CAL_DESIGN variables from definition (lines 154-155) through all gate usages (gate-c lines 190-207, gate-final lines 228-231). Verified that these deliberately-extensible environment variables (documented in DD10 for M3 reuse) are used in file operations (grep, file existence checks) without pathname validation. Confirmed vulnerability: setting CAL_PRODUCT='../../../etc/passwd' would trigger grep operations on arbitrary files. Examined version pinning, backup integrity, answers file trust model, SHA256 validation, and bash script safety (set -euo pipefail); found these adequate. Verified no other injection vectors in sed/grep patterns (appropriate use of -F flags, fixed patterns). Checked migration procedure, gate ordering, and atomic operations; no defects found. Only material finding is unvalidated environment variable input used in file I/O operations." |
| test | fail | Attacked DD4 (value inheritance checking): examined DESIGN.md and PRODUCT.md line-by-line for measurement token types. Found duration tokens (0.3s, 0.15s, 0.2s) on DESIGN.md lines 198, 219-220, 397 that fall under 'motion' inheritance targets but are excluded from the extraction regex which only matches `(em\|rem\|px)` units. Attacked DD3 (seed mode documentation): traced the plan's claim about reference/document.md down to GATE-A implementation and confirmed GATE-A does not validate document content, only file existence. Checked DESIGN.md section structure (6 sections) against gate-c checks (5 by name + 1 by negation) and confirmed this is correct. Examined code_unchanged() coverage and confirmed CODE_PATHS list is appropriately scoped to actual code files. Checked risk mitigations and gate ordering (gates before destructive operations) and found they are properly structured." |
| invariant | fail | Attacked fail-open drift in GATE-A: traced baseline establishment before Task 2 swap, verified CODE_PATHS excludes source documents being moved, confirmed no pre-backup validation of PRODUCT.md/DESIGN.md existence or integrity. Attacked skip predicates in GATE-C: verified must-contain validation loop executes only if entries exist, confirmed zero-entry case results in no validation. Attacked receipt anchoring: verified GATE-FINAL requires PRD hash but Task 7 action doesn't explicitly state hash must be written. Attacked task ordering gates: confirmed Tasks 5-7 have no inter-gate enforcement, only endpoint validation via gate-final. |

## Measurement

<!-- Written by plan-review/cli.js record on EVERY exit path, pass or halt.
     Machine-readable; do not hand-edit. A null field means the axis was
     not observed, never that it was zero. -->

```json
{
  "verdict": "unavailable",
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
  "wall_clock_ms": 499590,
  "halt_stage": "5.2g2",
  "backlog_appended": null,
  "backlog_skipped_nonblocking": null,
  "granted": 4,
  "reviewed_plan_hash": "sha256:2a994f277bb63fd40500e12fa6d670b9c4def7807bb58c40799d67d317db8108",
  "plan_path": ".claude/plans/work-calendar-m1.plan.md",
  "recorded_at": "2026-08-20T23:15:30.233Z"
}
```
