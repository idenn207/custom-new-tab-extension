# Implementation Report: 전체 너비 업무 캘린더 (달력 위젯 v2)

**Plan**: `.claude/plans/calendar-widget-v2.plan.md`
**PRD**: `.claude/prds/calendar-widget-v2.prd.md` (M1)
**Branch**: `worktree-prd-calendar-v2`
**Date**: 2026-08-10

## Summary

340px 절대배치 달력 카드를 **상단 전체 너비 밴드**로 바꾸고, 데이터 모델을 `date` 단일 키에서 `startDate`~`endDate` 범위 + 중요도 + 작업 메모로 승격했다. 입력 경로를 간편(인라인 Enter)과 상세(모달) 2종으로 나누고, 중요도·마감을 색이 아닌 **형태**로 이중 부호화한 뒤 헤더에 요약 한 줄을 붙였다.

Task 0–9 전부 완료. 브라우저에서 실제로 구동해 밴드 위치 불변식·범위 렌더·마이그레이션·키보드 경로·대비를 실측했다.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Large | Large — 예측대로 |
| Files Changed | 8 (manifest 제외) | 7 변경 + 2 신규(브랜치로 반입) |
| 태스크 수 | 10 (T0–T9) | 10, 전부 완료 |
| 신규 결함 발견 | — | 브라우저 실측에서 3건 (아래 Issues) |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 0 | 베이스라인 캡처 + 설계 문서 확보 | 부분 완료 | `PRODUCT.md`/`DESIGN.md` 반입 완료. **확장 컨텍스트 베이스라인 캡처는 미실행** (아래 Deviations) |
| 1 | 데이터 모델 v3 + 마이그레이션 | 완료 | 보안 리뷰 4건 흡수해 설계 변경 |
| 2 | 범위 인지 인덱스와 렌더 | 완료 | 42일 창 인덱스 + 범위 칩 |
| 3 | 전체 너비 밴드 + 위치 설정 제거 | 완료 | 위치 CSS 블록 109줄 삭제 |
| 4 | 간편 입력 (인라인) | 완료 | 패널이 오른쪽 열로 이동, Enter 1회 등록 유지 |
| 5 | 상세 모달 | 완료 | 포커스 트랩 · Esc · Shift+방향키 범위 |
| 6 | 중요도·마감 시각 언어 | 완료 | 계획 문언 1건 이탈 (아래) |
| 7 | 요약 한 줄 | 완료 | 0건이면 노드 삭제 |
| 8 | 하네스 확장 | 코드 완료 | **하네스 실행은 확장 컨텍스트 필요 — 미실행** |
| 9 | 설계·사용 문서 갱신 | 완료 | 실측과 어긋난 기존 서술 2건 정정 |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| 구문 검사 | PASS | `node --check newtab.js`, `node --check test/positioning.smoke.js` |
| CSS/HTML 구조 | PASS | 중괄호 균형 0, `<div>` 66/66 |
| 타입 검사 (선택) | 조건부 | 57건 — 베이스라인 50건, 신규 7건. **신규 오류 유형 0** (아래) |
| 브라우저 실측 | PASS | 로컬 서버 + `chrome.storage` 폴리필로 전 항목 검증 |
| 스모크 하네스 | 미실행 | 확장 컨텍스트 필수 (`chrome://extensions`) |
| 대비 실측 | PASS | 순백 배경 최악 조건에서 AA 전 항목 충족 |

### 브라우저 실측 (로컬 서버 + 폴리필)

| 검증 항목 | 결과 |
|---|---|
| 밴드 위치 불변식 (9×9 = 81조합) | rect가 `0,0,742,283` **하나** — 불변 |
| 상단 검색창 ↔ 밴드 교차 | `top-left/center/right` 전부 `false` |
| 시계 9위치 (UI4) | 9개 서로 다른 위치 유지, `display:block` 그대로 |
| 밴드 해제 시 흔적 | `has-calendar-band` 제거 · `--calendar-band-height` 제거 |
| 월 경계 범위 (1/28~2/3) | 1월 뷰 7일 전부 · 2월 뷰 3일 표시 |
| 칩 형태 부호화 | `is-start` / `is-middle` / `is-end` 정확 |
| 범위 상한 | 2026-03-01~2030-03-01 → 366일로 클램프 |
| 메모 절단 | 2500자 → 2000자 |
| 종료일 역전 | 시작일로 접힘 |
| `date` 미러 일치 (DD6) | 전 이벤트 `date === startDate` |
| v3 마이그레이션 | version 3 · 단일날짜 승격 · `date` 잔존 · `done` 보존 · 12필드 |
| `searchWidthByWidget.calendar` 정리 | 제거됨, `clock: 420` 보존 |
| 마이그레이션 2회 멱등 | `note`/`priority` 유실 없음 |
| Shift+방향키 범위 | 4칸 선택 → `is-in-range` 4개 |
| 범위 상태 Enter | 상세 창이 범위 프리필로 열림 |
| 포커스 트랩 | 마지막 → 첫 요소로 순환 |
| 종료일 < 시작일 저장 | 거부 + "종료일이 시작일보다 빠릅니다. 저장하지 않았습니다." |
| Esc | 모달만 닫히고 패널 유지 |
| 요약 한 줄 | 0건 시 노드 없음 → 발생 시 `오늘 마감 2건 · 지연 1건` |

### 대비 실측 (순백 배경 = 최악 조건)

밴드 표면 합성색을 스크린샷 픽셀에서 직접 측정: **rgb(89,89,90)** (상대휘도 0.1001).

| 요소 | alpha | 합성색 | 대비 | 필요 | 판정 |
|---|---|---|---|---|---|
| 날짜 숫자 (13px) | 0.95 | rgb(247) | 6.53:1 | 4.5 | PASS |
| 월 제목 (18px bold) | 0.95 | rgb(247) | 6.53:1 | 3.0 | PASS |
| 요일 약자 · 요약 · 일정 추가 · 오늘 | 0.78 | rgb(218) | 5.01:1 | 4.5 | PASS |
| 이웃 달 숫자 · 할 일 기간/중요도 | 0.72 | rgb(209) | 4.58:1 | 4.5 | PASS |
| 할 일 메모 (12px) | 0.78 | rgb(218) | 5.01:1 | 4.5 | PASS |

> 처음 측정에서 **2건이 AA 미달**이었다(요약 4.18:1, 이웃 달 숫자 2.70:1). 전역 `--text-secondary`(0.65)가 이 표면에서 4.10:1이라 밴드 안 약화 텍스트 전부가 미달이었다. 달력 범위에 `--calendar-muted`(0.78) / `--calendar-faint`(0.72)를 두어 해소했다. 모달은 `rgba(0,0,0,0.7)` 스크림 위라 대상이 아니다.

## Files Changed

| File | Action | 요지 |
|---|---|---|
| `newtab.js` | UPDATE | v3 모델·`createCalendarEvent` 단일 팩토리·`migrateCalendarToV3`·범위 인덱스·칩·상세 모달·요약·밴드 분기 |
| `newtab.css` | UPDATE | 밴드 레이아웃, 위치 클래스 109줄 삭제, 칩 시각 언어, 모달, 대비 토큰 |
| `newtab.html` | UPDATE | `.calendar-body`/`.calendar-month` 래퍼, 일정 추가 버튼, 상세 모달 |
| `test/positioning.smoke.js` | UPDATE | 달력 매트릭스 → 위치 불변식, v3/범위/요약 케이스 추가 |
| `PRODUCT.md` | CREATE | 브랜치 반입 + 밴드·요약의 원칙 위반 여부 판정 기록 |
| `DESIGN.md` | CREATE | 브랜치 반입 + 위치 시스템 예외·밴드 규칙·칩 규칙 추가, 잘못된 서술 2건 정정 |
| `README.md` | UPDATE | 기간·중요도·메모 사용법, 키보드 표, v2.2.0 변경 내역 |
| `.claude/prds/calendar-widget-v2.prd.md` | UPDATE | M1 상태 + 리포트 경로 |
| `manifest.json` | **무변경** | UI8 준수 |

## Deviations from Plan

1. **Task 6 — "칩 좌측 막대 두께 3단계" → "칩 자체 높이 3단계"**
   계획의 좌측 보더 부호화는 impeccable 스킬의 **absolute ban**(side-stripe borders: 1px 초과 컬러 좌/우 보더)에 정면으로 걸린다. 중요도를 형태로 부호화한다는 의도는 유지하되, 보더가 아니라 칩 자체의 높이(3/4/7px)와 같은 hue의 알파 단계로 구현했다. 회색조에서도 구분된다는 요건은 그대로 충족한다.

2. **Task 0 베이스라인 캡처 미실행 / Task 8 하네스 미실행**
   둘 다 `chrome://extensions`에서 압축 해제 로드한 확장 컨텍스트가 필요하다. 대신 로컬 서버 + `chrome.storage` 폴리필로 하네스가 검사하려던 **불변식 자체를 직접 실측**했다(위 표). 변경 전 베이스라인은 HEAD(`0fcd7a2`)에 그대로 있으므로 언제든 재현 가능하다.

3. **계획 본문 대신 `.claude/notes/`에 리뷰 섹션 주입**
   Phase 2.5.4가 요구하는 `## Codex Implementation Review` 섹션을 계획 본문에 넣으면 plan hash가 바뀌어 상위 `mccp-plan-codex` receipt가 **반드시** stale이 된다(편집 전 해시가 receipt와 정확히 일치함을 확인). 명령서 Phase 2.5.6 Step A가 허용하는 대체 대상(`<plan or notes path>`)인 `.claude/notes/calendar-widget-v2.md`에 기록해 감사 흔적을 남기고 계획 해시를 원복했다. `MCCP_SKIP_RECEIPT=1` 우회는 쓰지 않았다.

4. **계획 아카이브 안 함**
   Phase 5는 계획을 `completed/`로 옮기라고 하지만, receipt가 `.claude/plans/calendar-widget-v2.plan.md`를 참조하므로 옮기면 `/mccp:pr`의 plan-hash 검사가 파일을 못 찾는다. 계획은 아직 untracked이기도 하다.

5. **Phase 7 AUTO-CHAIN 실행 안 함 (커밋·PR 미생성)**
   환경 지시가 "커밋·푸시는 사용자가 요청할 때만"이다. PR 생성은 외부로 나가는 동작이라 확인 없이 진행하지 않았다.

## Issues Encountered

브라우저에서 처음 렌더한 순간 정적 검토로는 잡히지 않는 결함 3건이 드러났다. 전부 수정 후 재실측했다.

1. **코너 컨트롤과 밴드 헤더 충돌** — 즐겨찾기 토글(24,24,44×44)과 이미지·설정 토글(1316·1372,24)이 `position:fixed` z-index 100이라 밴드 헤더(y 12–40) 위에 뜬다. 화살표와 `일정 추가` 버튼이 눌리지 않았다. 밴드 표면은 화면 끝까지 두되 **내용을 좌우 136px 안쪽으로** 물렸다.
2. **고정 즐겨찾기가 그리드를 덮음** — (24,84,196×88)에 세로로 서 있어 밴드 안쪽 여백으로는 비켜 줄 수 없다. 검색창과 같은 방식으로 밴드 높이만큼 아래로 내렸다.
3. **패널 입력창 포커스 시 달력이 밀려 올라감** — `.calendar-body`에 `overflow-y: auto`가 걸려 있어, 브라우저가 하단 입력창을 보이게 하려고 본문 전체를 스크롤했다(scrollTop 18). 스크롤을 `.calendar-month`와 `.calendar-todo-list` 두 열로 각각 내렸다.

부수적으로: 6주 그리드가 밴드 상한을 10px 넘겨 스크롤바가 생기던 것을 칸 높이 52px + 행 `flex: 1 0 auto`로 해소했고(`1 1 0`으로 두면 행이 콘텐츠 아래로 찌그러진다), 버튼 히트 영역(`::before inset -10px`)이 만들던 2px 가로 스크롤바를 패딩으로 흡수했다.

### 타입 검사 신규 7건의 성격

`tsc --checkJs` 기준 베이스라인 50 → 현재 57. 신규 7건은 전부 **기존 파일 전역 패턴 2종**의 인스턴스 증가다.

- `chrome` 전역 미타입 2건 — `migrateCalendarToV3`의 `chrome.storage` 호출 (`@types/chrome` 부재)
- `.search-container`가 `Element`로 추론 5건 — 달력 분기에서 `searchElement.style`을 만지는 지점

새 오류 **유형**은 0건이다. `this.searchElement`에 JSDoc 타입을 붙이면 파일 전체 26건이 한 번에 없어지지만, 시계 경로를 포함한 공용 코드라 이번 범위 밖으로 남겼다.

## Tests Written

단위 테스트 러너와 빌드 단계가 없는 프로젝트다(계획 `## Patterns to Mirror`가 명시). 검증은 스모크 하네스가 담당하며 아래 케이스를 추가했다.

| 케이스 | 검사 내용 |
|---|---|
| `matrix/calendar/band-invariance` | 81조합에서 밴드 rect 불변 + 상단 검색창 비교차 |
| `migration-v3/01-promote` | 단일 날짜 승격 · `date` 잔존 · 340px 캐시 정리 |
| `migration-v3/02-idempotent` | 2회 재실행에도 `note`/`priority` 무손상 |
| `range/01-month-boundary` | 1/28~2/3이 두 달 뷰 모두에 표시 |
| `range/02-max-span` | 366일 클램프 |
| `range/03-note-truncated` | 메모 2000자 절단 |
| `range/04-reversed` | 종료일 역전 시 시작일로 접힘 |
| `summary/01-lifecycle` | 0건 부재 → 발생 시 표시 → 전부 완료 시 소멸 |
| `sanitize/v3-fields` | 거짓 `date` 무시 · 없는 `endDate` 접힘 · 중요도 화이트리스트 · v2 승격 |

기존 `matrix/calendar/**` 81건은 **의도적으로 제거**했다. 위치가 사라져 81건이 전부 같은 값이 되므로, 스냅샷으로 남기면 무언가 깨질 때 diff가 81줄로 번져 원인을 가린다.

## Acceptance 대조

- [x] Task 0–9 전부 완료 (T0 베이스라인·T8 하네스 실행은 확장 컨텍스트 필요 — Deviations 2)
- [x] `node --check` 통과
- [ ] 스모크 하네스 실행 — **미실행** (확장 컨텍스트 필요)
- [x] 달력 위치 9종을 바꿔도 밴드 rect 불변 — 81조합 실측
- [x] 시계 모드 무변화 (UI4) — 9위치 유지, `display:block` 그대로
- [x] `manifest.json` 무변경 (UI8)
- [x] v2 데이터가 `startDate = endDate`로 승격되고 `date` 잔존
- [x] 마감 0건·지연 0건일 때 요약 노드가 DOM에 없음
- [x] 밝은 배경에서 렌더 픽셀 실측 대비 AA 충족
- [x] 키보드만으로 범위 선택 → 상세 모달 → 저장까지 도달
- [x] `## Patterns to Mirror`를 따랐다

## Next Steps

1. **확장 컨텍스트에서 스모크 하네스 실행** — `chrome://extensions` → 압축 해제 로드 → `chrome-extension://<id>/test/positioning.smoke.html`
   - 먼저 **HEAD(`0fcd7a2`) 상태로 베이스라인 캡처** → 이 브랜치로 전환 후 "베이스라인과 비교"
   - 시계 케이스 전부 `동일`, 오류 발생 0건 확인
   - 달력 케이스는 차이를 한 건씩 검토 후 의도된 변경으로 재베이스라인
2. 2주 dogfooding으로 PRD Evidence 공백 메우기 (등록 건수 / GCal 개방 횟수 / 등록 포기 장면)
3. 커밋 → `/mccp:pr`
