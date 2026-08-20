---
name: 배경 사진 새 탭
description: 사용자 사진 위에 유리판으로 얹은 크롬 새 탭. 다크 전용, 셸 한정 (달력 위젯 제외).
colors:
  glass-light: "#1212144D"
  glass-deep: "#0C0C0E80"
  panel-solid: "#0C0C0EEB"
  modal-scrim: "#000000B3"
  single-hue-accent: "#5880E680"
  single-hue-accent-forward: "#6496FF"
  focus-ring: "#7EA0F5F2"
  danger: "#FF3B30"
  text-on-glass: "#FFFFFFF2"
  text-on-glass-muted: "#FFFFFFA6"
  hairline: "#FFFFFF14"
  hover-wash: "#FFFFFF0F"
typography:
  display:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Segoe UI, Malgun Gothic, Noto Sans KR, sans-serif"
    fontSize: "9rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.028em"
    fontVariant: "tabular-nums"
  title:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Segoe UI, Malgun Gothic, Noto Sans KR, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  section:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Segoe UI, Malgun Gothic, Noto Sans KR, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.01em"
  body:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Segoe UI, Malgun Gothic, Noto Sans KR, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.01em"
  label:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Segoe UI, Malgun Gothic, Noto Sans KR, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
  caption:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Segoe UI, Malgun Gothic, Noto Sans KR, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.01em"
rounded:
  favicon: "4px"
  tab: "6px"
  cell: "8px"
  item: "10px"
  chip: "12px"
  modal: "16px"
  pill: "999px"
  circle: "50%"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  corner-icon-button:
    backgroundColor: "{colors.glass-deep}"
    textColor: "{colors.text-on-glass}"
    rounded: "{rounded.chip}"
    size: "44px"
  corner-icon-button-hover:
    backgroundColor: "{colors.hover-wash}"
  pinned-shortcut:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.text-on-glass}"
    typography: "{typography.body}"
    rounded: "{rounded.item}"
    padding: "10px 14px"
    width: "196px"
  pinned-shortcut-hover:
    backgroundColor: "{colors.hover-wash}"
  sidebar-item:
    backgroundColor: "{colors.glass-deep}"
    textColor: "{colors.text-on-glass}"
    typography: "{typography.body}"
    rounded: "{rounded.item}"
    padding: "12px 14px"
  sidebar-item-hover:
    backgroundColor: "{colors.hover-wash}"
  date-pill:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.text-on-glass}"
    typography: "{typography.body}"
    rounded: "{rounded.chip}"
    padding: "10px 16px"
  search-input:
    backgroundColor: "{colors.glass-deep}"
    textColor: "{colors.text-on-glass}"
    typography: "{typography.section}"
    rounded: "{rounded.pill}"
    padding: "18px 24px"
    width: "min(100%, 500px)"
  search-input-focus:
    backgroundColor: "{colors.panel-solid}"
  search-submit:
    backgroundColor: "{colors.single-hue-accent}"
    textColor: "#FFFFFF"
    rounded: "{rounded.circle}"
    size: "44px"
  search-submit-hover:
    backgroundColor: "{colors.single-hue-accent-forward}"
  button-primary:
    backgroundColor: "{colors.single-hue-accent}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.item}"
    padding: "12px"
  button-primary-hover:
    backgroundColor: "{colors.single-hue-accent-forward}"
  button-secondary:
    backgroundColor: "{colors.panel-solid}"
    textColor: "{colors.text-on-glass-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.item}"
    padding: "12px"
  button-secondary-hover:
    backgroundColor: "{colors.hover-wash}"
    textColor: "{colors.text-on-glass}"
  modal-surface:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.text-on-glass}"
    rounded: "{rounded.modal}"
    padding: "32px"
    width: "min(90%, 400px)"
  settings-tab:
    backgroundColor: "transparent"
    textColor: "{colors.text-on-glass-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.tab}"
    padding: "10px 14px"
  settings-tab-active:
    backgroundColor: "#5880E61F"
    textColor: "{colors.single-hue-accent}"
  segment-option:
    backgroundColor: "transparent"
    textColor: "{colors.text-on-glass-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.tab}"
    padding: "6px 14px"
  segment-option-active:
    backgroundColor: "#5880E638"
    textColor: "{colors.text-on-glass}"
  storage-notice:
    backgroundColor: "{colors.glass-light}"
    textColor: "#FFFFFFDB"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
---

# Design System: 배경 사진 새 탭

`newtab.css`와 `newtab.js`의 런타임 동작에서 캡처한 시각 시스템이다. 새 표면을 만들 때 위 frontmatter의 토큰을 먼저 쓰고, 없을 때만 새로 정한다. **frontmatter가 규범이고, 아래 본문은 그것을 어디에 왜 쓰는지를 말한다.**

본문에서 **굵게** 표시한 규칙은 현재 코드가 아직 그렇지 않은 항목, 즉 앞으로의 기준이다. 나머지는 코드의 사실이다.

**범위: 달력 위젯 제외.** 달력 v2는 M1만 완료(`2e6fffe`)이고 M2·M3는 dogfooding 결과 대기 중이라 현재 값을 시스템으로 굳히지 않는다. 이 문서가 다루는 것은 배경 레이어, 시계, 검색창, 바로가기(고정 + 사이드바), 배경 이미지 사이드바, 설정 모달, 저장소 고지 배너, 그리고 이들이 공유하는 유리 언어다. 달력의 시각 스펙은 리디자인 확정 후 `/impeccable document`로 다시 기록한다.

문서에 남는 달력 관련 사실은 구조적인 것 하나뿐이다. **메인 위젯은 시계와 달력 중 택일이며 공존하지 않는다.** 새 메인 위젯을 만들 때 이 제약이 유지된다.

## 1. Overview: 사진 위의 유리판

**Creative North Star: "사진 위의 유리판"**

유리는 사진을 가리려고 고른 재료가 아니다. 사진을 통과시키면서 그 자리만 눌러 글자를 띄우려고 고른 재료다. 이 구분이 이 시스템의 전부다. 불투명 패널을 얹으면 글자는 읽히지만 사진이 사라지고, 표면 없이 글자만 두면 사진은 다 보이지만 밝은 사진에서 글자가 사라진다 — 실측으로 시계는 흰 배경에서 1.0:1까지 떨어진다. 반투명 + `backdrop-filter`만이 두 요구를 동시에 만족한다. 그래서 유리는 이 제품에서 장식이 아니라 **기본 표면**이다.

테마는 **다크 전용**이고 라이트 테마는 만들지 않는다. 취향이 아니라 구조다. 배경이 사용자 사진이므로 표면은 항상 사진 위에 뜬 반투명 판이고, 그 위의 글자는 흰색이어야 어떤 사진에서도 성립한다. 검은 글자는 어두운 사진에서 즉시 무너진다.

밀도는 낮다. 사용자는 이 화면을 보러 오지 않고 지나칠 뿐이며, 대부분 1초 안에 검색어를 치거나 바로가기를 누르고 떠난다. 성공은 기능 수가 아니라 **사진이 몇 퍼센트 보이느냐**로 측정된다. 이 시스템은 업무용 SaaS 대시보드(통계 카드, 진행률 바, 대시보드 그리드), 알록달록한 포털 시작페이지 위젯 모음, 각지고 회색진 Windows 네이티브 앱 스타일, 그리고 **불투명 카드로 사진을 액자 테두리로 전락시키는 배경화면 앱**을 거부한다. 마지막 것이 가장 가까이 있는 실패다.

**Key Characteristics:**

- 다크 전용. 표면은 근검정 유리, 글자는 흰색 한 가지.
- hue 계열은 평상시 하나뿐. 상태 색은 그 상태가 실제로 발생했을 때만 등장한다.
- 폰트 한 가족(Pretendard Variable), 위계는 크기보다 굵기와 색이 만든다.
- 스크롤하지 않는 단일 화면. 반응형은 구조로 처리하고 유동 타이포를 쓰지 않는다.
- 모션은 상태 전달 전용. 등장 연출이 없다.

### 공간과 형태

간격은 4pt 기반 5단계다 (`spacing`: 4 / 8 / 12 / 16 / 24px). 토큰은 있지만 셸의 대부분은 아직 리터럴 px를 쓴다 (코너 여백 24px, 사이드바 패딩 24px, 설정 본문 `24px 28px`, 고정 바로가기 `10px 14px`). **새로 쓰는 규칙은 토큰을 쓰고, 기존 값은 손대는 김에 옮긴다.**

레이아웃 상수 셋: `--icon-size` 44px, `--sidebar-width` 320px, `--transition-speed` 0.3s.

모서리는 표면 크기에 비례한다 (`rounded`). 파비콘 4px → 설정 탭·닫기 버튼·세그먼트 옵션 6px → 위치 셀·세그먼트 트랙·컴팩트 버튼 8px → 고정 바로가기·사이드바 항목·모달 입력·주요/보조 버튼 10px → 코너 아이콘 버튼·날짜 알약 12px → 모달 본문 16px → 알약과 원. 알약은 코드에 `50px`(검색 입력)과 `999px`(저장소 고지) 두 리터럴로 있고 렌더 결과는 같다. **새로 쓸 때는 `999px`을 쓴다.**

### 배치

시계와 검색창은 각각 9개 위치(`top|center|bottom` × `left|center|right`) 중 하나를 갖는다. `position-{v}-{h}` 클래스와 `transform` 조합으로 배치하며, JS는 클래스만 토글한다.

- 위치 클래스는 `position-*` / `overlap-offset` / `collision-compact` 셋만 positioning이 소유한다. 그 외 클래스(`clock`, `enable-transition`)는 위치 변경 시 보존한다.
- 같은 위치일 때 `overlap-offset`으로 서로 비킨다. 시계는 위로, 검색창은 아래로 간다.
- 위치가 달라도 겹칠 수 있으므로 `getBoundingClientRect()`로 실측해 교차를 확인한다.
- 좌우 끝 위치의 안쪽 여백은 280px다. 왼쪽 사이드바(320px)가 열렸을 때를 고려한 값이다.

z-index는 현재 -2, -1, 2, 10, 50, 99, 100, 120, 200, 1000으로 그때그때 골라져 있다. **정리안은 여덟 단계다:** `--z-background` -2(배경 이미지) · `--z-overlay` -1(오버레이) · `--z-canvas` 10(날짜) · `--z-widget` 50(메인 위젯·검색창) · `--z-pinned` 90(고정 바로가기) · `--z-chrome` 100(코너 버튼) · `--z-panel` 200(사이드바) · `--z-modal` 1000(전면 모달). 현재 값과 거의 1:1이라 도입 비용이 낮다. **새 표면은 이 여덟 단계 안에서 자리를 고르고, 사이에 끼워 넣지 않는다.**

브레이크포인트는 둘이다. ≤1024px에서 시계가 144 → 108px, ≤768px에서 코너 버튼 44 → 40px · 여백 24 → 16px · 시계 → 80px · 고정 바로가기 196 → 160px · 사이드바 320/360 → 280px · 검색 입력 16 → 14px. 크기 변경은 `:root`의 토큰을 덮어서 하고 컴포넌트 규칙을 중복 정의하지 않는다 — `.time` 규칙은 파일에 하나뿐이다.

### 모션

| 대상 | 값 |
|---|---|
| 위치 전환 (`--transition-speed`) | 0.3s ease |
| 사이드바 슬라이드 | 0.3s |
| 배경 이미지 교체 | 1s ease-in-out (opacity) |
| 호버·색 변화 | 0.15 ~ 0.2s ease |

**The 첫 페인트 Rule.** 초기 렌더에는 트랜지션을 걸지 않는다. `.enable-transition` 클래스를 사용자 조작 시점에만 부여한다. 첫 페인트에 전환이 걸리면 위젯이 화면을 가로질러 날아온다.

**The 상태 전달 Rule.** 모션은 상태를 전달할 때만 쓴다. 새 탭은 통과하는 화면이므로 등장 연출·스크롤 시퀀스·스태거를 넣지 않는다.

**The 면적 예산 Rule.** 새 표면의 기본값은 "더 투명하게, 더 작게"다. 화면에서 UI가 차지하는 면적이 늘어나는 변경은 그 자체로 후퇴이며, 무엇을 줄여 상쇄했는지가 함께 있어야 한다.

**The 단일 화면 Rule.** 새 탭은 스크롤하지 않고 사용자는 일정한 DPI에서 본다. 반응형은 구조적으로 처리하고 `clamp()` 유동 타이포를 쓰지 않는다.

정리 대상 둘: `transition: all`이 25곳에 있다 — 전환할 속성을 명시하면 레이아웃 속성이 딸려 들어가는 것을 막을 수 있다. 그리고 `prefers-reduced-motion: reduce` 블록이 달력 선택자 위주여서 셸의 전환 48건(사이드바 슬라이드, 위치 이동, 호버 `scale`)이 감축 대상에서 빠져 있다. **감축 설정에서는 셸의 전환도 제거한다.**

## 2. Colors: 유일한 hue

근검정 유리 위의 흰 글자, 그리고 파랑 하나. 색 자체가 말하는 것은 거의 없고 대부분의 정보는 알파와 굵기가 나른다.

색은 코드에서 OKLCH가 아니라 `rgba()`로 쓴다. 반투명이 이 디자인의 핵심 재료라 알파를 직접 다루는 편이 정확하고, 합성 결과를 실측으로 검증하므로 색 공간의 지각 균일성보다 알파 제어가 중요하다. frontmatter의 `#RRGGBBAA` 표기는 같은 값의 손실 없는 다른 표기다.

### Primary

- **유일한 hue** (`single-hue-accent` → `--accent-color`): 주요 액션(검색 버튼, 즐겨찾기 추가), 선택 상태, 포커스 테두리. 알파 0.5로 절반 물러서 있는 것이 이 색의 정체다. 완전히 앞에 나오는 것은 호버뿐이다.
- **유일한 hue (전면)** (`single-hue-accent-forward`): 위 색의 호버 상태. 알파 없이 완전 불투명하게 앞으로 나온다.

### Tertiary

- **포커스 링** (`focus-ring` → `--calendar-accent`): `outline: 2px solid`. 화면 전체에서 하나의 포커스 링이다.
- **위험** (`danger`): 삭제 액션의 호버 상태에만 등장한다.

### Neutral

- **옅은 유리** (`glass-light` → `--bg-secondary-glass`, 알파 0.3): 고정 바로가기, 날짜 알약, 사이드바 본체, 설정 본문, 모달 본문, 저장소 고지.
- **진한 유리** (`glass-deep` → `--bg-primary-glass`, 알파 0.5): 코너 아이콘 버튼, 검색 입력, 사이드바 항목, 설정 좌측 탭, 모달 헤더.
- **불투명 판** (`panel-solid` → `--bg-primary`, 알파 0.92): 사진이 통과할 이유가 없는 컨트롤 배경 — 슬라이더 트랙, 위치 셀, 세그먼트 트랙, 보조 버튼, 검색 입력의 포커스 상태.
- **모달 스크림** (`modal-scrim`): 전면 모달이 화면 전체에 까는 층. 이 아래로는 사진이 통과하지 않는다.
- **표면 위의 본문** (`text-on-glass` → `--text-primary`): 유리 표면 위의 모든 본문.
- **약화된 텍스트** (`text-on-glass-muted` → `--text-secondary`): 아이콘, 비활성 상태, 큰 텍스트, 그리고 아래 두 가지 실측 예외.
- **실선 한 올** (`hairline` → `--border-color`): 모든 경계선. 유리의 가장자리를 알려 주는 것 이상을 하지 않는다.
- **호버 워시** (`hover-wash` → `--hover-bg`): 호버 배경.

`--bg-secondary`(`rgba(18,18,20,0.95)`)는 `:root`에 정의돼 있으나 사용처가 **0곳**이다. 죽은 토큰이므로 지운다.

### 대비 실측

**흰색 배경 사진 + 오버레이 없음**(가장 밝은 조건)에서 렌더된 PNG 픽셀을 읽어 산출했다. 유리는 CSS 값과 렌더 결과가 다르므로 계산으로 판정할 수 없다. 실측일 2026-08-19, 1440×900.

| 표면 | 렌더값 (sRGB) | 0.65 텍스트 | 0.95 텍스트 |
|---|---|---|---|
| 설정 모달 (스크림 + 유리) | 60 | **5.75:1** | 10.12:1 |
| 사이드바 항목 (유리 위 유리) | 97 | 3.69:1 | **5.77:1** |
| 단일 유리 알파 0.3 (고정 바로가기, 날짜) | 183 | 1.60:1 | 2.00:1 |
| 단일 유리 + `brightness(0.62)` | 112 | 3.11:1 | **4.65:1** |

셸 요소별 판정 (목표 WCAG 2.1 AA — 본문 4.5:1, 큰 텍스트·비텍스트 3:1):

| 요소 | 크기/알파 | 밝기 50 (기본) | 밝기 100 (최악) | 판정 |
|---|---|---|---|---|
| 고정 바로가기 이름 | 14px / 0.95 | 3.02:1 | **1.94:1** | 미달 |
| 날짜 표시 | 14px / 0.95 | 3.65:1 | **1.94:1** | 미달 |
| 사이드바 즐겨찾기 이름 | 14px / 0.95 | 7.68:1 | 5.77:1 | 통과 |
| 검색 플레이스홀더 | 16px / 0.65 | 3.72:1 | **2.49:1** | 미달 |
| 검색 입력 텍스트 | 16px / 0.95 | 5.86:1 | **3.50:1** | 밝기 60 이상 미달 |
| 설정 모달 설명 | 12px / 0.65 | 5.75:1 | 5.75:1 | 통과 (스크림 위) |
| 시계 숫자 | 144px / 0.95 | 1.86:1 | **1.00:1** | 미달 (그림자로만 읽힘) |
| 코너 아이콘 버튼 | 0.95 | 5.63:1 | 3.43:1 | 통과 |
| 검색 버튼 아이콘 | 0.95 | 4.59:1 | 3.60:1 | 통과 |

텍스트 색으로 할 수 있는 일은 이미 했다. 고정 바로가기 이름과 날짜 표시의 알파를 0.65에서 0.95로 올려 밝기 50에서 2.25 → 3.02, 2.78 → 3.65로 끌어올렸지만 밝기 100에서는 여전히 1.94:1이다. 남은 원인은 전부 표면이며 해결값은 Elevation 절에 있다.

### Named Rules

**The 유일한 hue Rule.** 평상시 화면의 hue 계열은 `single-hue-accent` 하나다. 상태 색(위험, 경고)은 그 상태가 실제로 발생했을 때만 나타난다. 색을 장식으로 쓰지 않는다 — accent는 주요 액션, 현재 선택, 상태 표시에만 간다.

**The 두 단계 Rule.** 유리 알파는 0.3과 0.5 두 단계뿐이다. 세 번째 단계를 만들지 않는다. 대비가 부족하면 알파가 아니라 `brightness()`로 해결한다.

**The 표면이 정한다 Rule.** 대비는 텍스트 색이 아니라 그 자리의 표면이 정한다. 위 실측표에서 같은 0.65 텍스트가 스크림 위에서는 5.75:1, 단일 유리 위에서는 1.60:1이다. 대비 문제를 만나면 텍스트 알파부터 올리지 말고 어떤 표면 위인지를 먼저 본다.

**The 두 예외 Rule.** `--text-secondary`(0.65)를 본문에 쓰는 자리는 딱 둘이고, 둘 다 실측 근거가 있다. **검색 플레이스홀더** — 본문 색으로 올리면 입력한 글자와 구분되지 않아 검색어가 이미 적혀 있는 것처럼 보인다. **설정 모달 설명 문구** — 스크림 위라 0.65가 5.75:1이고, 0.95로 올리면 라벨과의 위계만 잃는다. 이 둘 말고는 표면 위의 본문에 0.65를 쓰지 않는다.

## 3. Typography

**Display / Body / Label 폰트:** Pretendard Variable 하나 (폴백 `Pretendard`, `-apple-system`, `Segoe UI`, `Malgun Gothic`, `Noto Sans KR`).

**Character:** 한 가족을 굵기와 색으로만 부린다. 유리판은 좁아서 크기를 키우면 줄바꿈이 먼저 깨지므로, 위계의 대부분은 크기가 아니라 굵기와 색이 만든다.

확장 패키지 안에 번들된 `fonts/PretendardVariable.woff2`(2.0MB, 가변 축 `wght` 45~920)이고 웹폰트는 이것 하나뿐이다. 이전에는 본문이 시스템 스택이고 `.time`만 Google Fonts의 Nanum Gothic이었다. 바꾼 이유는 둘이다. **네트워크를 끊었다** — 새 탭이 열릴 때마다 폰트 CDN 요청이 붙고 있었고, 오프라인에서도 열리는 화면의 가장 큰 글자가 네트워크에 매여 있을 이유가 없다. **조판을 확정할 수 있게 됐다** — 시스템 스택은 OS마다 다른 폰트로 렌더되므로 자간·굵기·한글 균형을 정할 수 없다.

로딩 규칙 셋:

- `font-display: block`. `swap`은 폴백으로 한 번 그린 뒤 교체하는데, 144px 시계에서 그 교체는 화면 절반이 출렁이는 것으로 보인다. 로컬 파일이라 블록 구간이 짧다.
- `<link rel="preload" ... crossorigin>`을 `newtab.html`에 둔다. `@font-face`는 CSS 파싱 후에야 발견되므로 이 줄이 없으면 요청이 한 박자 늦다. 폰트는 같은 오리진이어도 CORS 모드로 가져오므로 `crossorigin`이 없으면 미리 받은 것을 재사용하지 못한다.
- 실측(로컬 서버, 콜드 캐시): 폰트 요청 시작 10ms, 소요 21ms, `document.fonts.ready`까지 총 31ms. `block`의 3초 한도와는 두 자릿수 차이다.

### Hierarchy

- **Display** (800, 9rem/144px, line-height 1, tracking -0.028em): 시계. 이 시스템에서 유일하게 큰 글자다. 반응형에서 토큰째로 덮인다 — ≤1024px 6.75rem(108px), ≤768px 5rem(80px).
- **Title** (600, 1.25rem/20px, 1.3, -0.01em): 표면 제목. 사이드바 `h2`, 모달 `h2`/`h3`.
- **Section** (400, 1rem/16px, 1.3, 0.01em): 섹션 제목과 검색 입력.
- **Body** (400, 0.875rem/14px, 1.5, 0.01em): 본문·라벨·버튼. `body`의 기본값이다. 이 화면의 텍스트는 대부분 라벨이거나 컨트롤 안의 짧은 문구여서 밀집 화면의 본문 크기가 곧 기본값이 된다.
- **Label** (500, 0.875rem/14px, 1.3, 0.01em): 설정 탭, 세그먼트 옵션.
- **Caption** (400, 0.75rem/12px, 1.5, 0.01em): 보조 설명, 컨트롤 안 라벨. 이것이 하한이다.

크기 비율은 1.25 / 1.14 / 1.17이다. 설정 패널처럼 텍스트 역할이 많은 밀집 화면에서는 이 정도가 상한이고, 더 벌리면 패널이 소리치기 시작한다. 값이 `rem`인 것은 사용자가 브라우저 기본 글자 크기를 키우면 화면 전체가 함께 커지기 위해서다.

굵기는 네 단계다 (400 regular / 500 medium / 600 semibold / 800 display). **700은 쓰지 않는다.** 줄 높이는 네 단계 (1 시계 / 1.3 제목·한 줄 라벨·폼 컨트롤 / 1.5 `body` 기본 / 1.6 여러 줄 설명). 자간은 세 단계 — 어두운 배경 위의 밝은 글자는 획이 번져 자간이 좁아 보이므로 작은 글자에는 0.01em을 더하고, 큰 글자는 반대로 조인다.

### Named Rules

**The 한 가족 Rule.** 웹폰트를 더 늘리지 않는다. 굵기가 더 필요하면 이 가변 폰트의 `wght` 축에서 꺼낸다. 시계에 별도 폰트를 주지 않는다.

**The em 자간 Rule.** 디스플레이 자간은 `em`으로 둔다. 이전의 `-4px`는 144px에서 -0.028em이지만 80px에서 **-0.05em**이 되어 자간 하한 -0.04em을 넘어섰다. 폭이 바뀔 때마다 숫자가 붙었다.

**The 고정폭 숫자 Rule.** 매초·매분 바뀌는 숫자에는 `font-variant-numeric: tabular-nums`를 건다. 비례 숫자에서는 `1`이 좁아서 `10:11 → 10:12`처럼 분이 바뀔 때마다 시계 전체 폭이 달라지고, 시계는 `transform`으로 가운데 맞춰져 있어 그 폭 변화가 매분 좌우로 튀는 것으로 보인다. 시계·날짜·슬라이더 값이 대상이다.

**The 12px 하한 Rule.** 컨트롤 안 라벨의 하한은 `caption`(12px)이다. 인라인 토글의 ON/OFF·랜덤/고정 라벨이 9px이었고, 그 크기의 한글은 읽는 글자가 아니라 무늬였다. 12px로 올리면서 트랙을 56 → 68px로 넓혔다.

**The 상속 한 곳 Rule.** `button, input, textarea, select`의 `font-family: inherit`를 한 곳에서 건다. 폼 컨트롤은 폰트를 상속하지 않아서, 이 규칙 전에는 검색 입력·모달 입력·설정 좌측 탭·모달 버튼이 브라우저 기본 폰트로 그려지고 있었다. 개별 규칙에 흩어 두면 새 컨트롤을 만들 때마다 빠뜨릴 자리가 생긴다.

**The 한국어 줄바꿈 Rule.** 한국어 문장에는 `word-break: keep-all`을 쓴다. 어절 중간에서 꺾이면 읽기 리듬이 끊긴다. URL처럼 끊을 곳이 없는 문자열을 위해 `overflow-wrap: anywhere`를 함께 둔다. 제목에는 `text-wrap: balance`를 건다.

## 4. Elevation: 유리라는 깊이

**이 시스템의 깊이는 그림자가 아니라 투과다.** 표면이 떠 있다는 사실은 그림자가 아니라 그 표면을 통과해 보이는 사진과, 그 자리만 눌린 밝기가 말한다. 그림자는 보조 역할로만 존재하며 어느 표면도 그림자로 위계를 얻지 않는다.

유리는 세 가지가 함께 와야 성립한다.

```css
background: var(--bg-secondary-glass);   /* 또는 --bg-primary-glass */
backdrop-filter: blur(10px);
border: 1px solid var(--border-color);
```

`blur(10px)`이 표준이다. 예외는 두 곳뿐이다 — 전면 모달 스크림이 `blur(5px)`, 배경 오버레이가 `blur(3px)`.

### Named Rules

**The brightness Rule.** 본문 텍스트를 담는 유리 표면에는 `brightness(0.62)` 이하를 함께 건다. 알파 0.3 유리는 그 자체로 흰 사진 위에서 sRGB 183이고, 그 위에서는 불투명 흰색조차 2.00:1이다. 표면을 누르지 않으면 텍스트 쪽에서 할 수 있는 일이 없다. 현재 이 값이 걸린 곳은 달력 밴드와 저장소 고지 배너 둘뿐이다 — **고정 바로가기와 날짜 표시에도 필요하다.**

**The 표면을 누르지 알파를 올리지 않는다 Rule.** 알파는 사진 전체를 균일하게 덮지만 `brightness()`는 밝은 부분만 눌러 같은 대비를 더 적은 사진 손실로 얻는다. 유리 알파 단계를 0.3과 0.5 둘로 묶어 두는 이유가 이것이다. 0.65 텍스트를 본문 기준까지 올리려면 표면을 sRGB 80(`brightness(0.42)`)까지 눌러야 하고, 그러면 사진이 절반 넘게 죽어 면적 예산과 정면으로 부딪힌다.

**The 유리 위 유리 금지 Rule.** 이미 유리인 표면 안쪽에 다시 `backdrop-filter`를 걸지 않는다. 블러 뒤에 사진이 아니라 유리가 있으면 비용만 내고 얻는 것이 없다. 사이드바 항목이 그 예다. 유리를 걷어내도 대비가 그대로인 자리라면 그 유리는 순수한 장식이다.

**The 오버레이 무시 Rule.** 각 표면은 배경 오버레이가 없다고 가정하고 자기 대비를 스스로 확보한다. `.overlay`는 CSS에 `rgba(0,0,0,0.08) → 0.12`로 적혀 있으나 이 값은 죽은 코드이고 `newtab.js`가 로드 시점에 사용자 설정으로 덮어쓴다. 배경 밝기 0~100(기본 50)이 `rgba(0,0,0,α₁) → rgba(0,0,0,α₂)`를 만들며, α₁ = (100−밝기)/100 × 0.4, α₂ = 같은 식 × 0.6이다. **밝기 100이면 알파가 정확히 0이 되어 오버레이가 사라진다.** 따라서 오버레이는 어떤 표면의 대비 근거도 될 수 없다. CSS의 죽은 값은 JS 기본값과 같게 맞춰 둔다 — 지금은 JS가 붙기 전 첫 프레임에서만 0.08/0.12가 잠깐 보인다.

### Shadow Vocabulary

그림자는 네 가지뿐이고 전부 보조적이다.

- **패널 그림자** (`box-shadow: 4px 0 24px rgba(0,0,0,0.3)`, 우측 사이드바는 `-4px 0 24px`): 화면 가장자리에서 슬라이드해 들어온 사이드바가 본문 위에 있음을 알린다. 방향이 진입 방향의 반대다.
- **모달 그림자** (`box-shadow: 0 20px 60px rgba(0,0,0,0.5)`): 전면 모달 하나에만. 스크림이 이미 배경을 끊었으므로 그림자는 부피감만 준다.
- **배너 그림자** (`box-shadow: 0 4px 16px rgba(0,0,0,0.36)`): 저장소 고지·오류 배너.
- **포커스 글로우** (`box-shadow: 0 0 0 3px rgba(100,150,255,0.1)` — 검색 입력은 `4px`): 입력 필드의 포커스 상태. 링이 아니라 번짐이다. 키보드 포커스 링(`outline`)과는 다른 것이며 둘 다 필요하다.

시계에는 유일하게 `text-shadow: 0 2px 8px rgba(0,0,0,0.5)`가 있다. **표면 없는 텍스트는 이 시스템에서 유일한 예외이며 새로 만들지 않는다.**

## 5. Components

모든 셸 컨트롤은 같은 어휘를 쓴다 — 유리 표면, 1px 실선 한 올, 역할에 맞는 모서리, `--transition-speed` 안의 상태 전환. 어떤 컴포넌트도 자기만의 형태 언어를 발명하지 않는다.

### Buttons

- **Shape:** 사각 액션 버튼은 부드러운 모서리 (`rounded.item` 10px), 아이콘 버튼은 살짝 더 둥근 사각 (`rounded.chip` 12px), 검색 제출은 완전한 원 (`rounded.circle`).
- **Primary** (`button-primary`): accent 배경에 흰 글자, semibold, 패딩 12px. 호버에서 accent가 완전 불투명해지고 `translateY(-2px)`와 `0 4px 12px rgba(100,150,255,0.4)` 글로우가 붙는다. 감축 모션에서는 `transform: none`이다.
- **Secondary** (`button-secondary`): 불투명 판 배경 + 실선 한 올, 글자는 약화 색. 호버에서 호버 워시로 바뀌고 글자가 본문 색으로 올라온다.
- **Corner icon buttons** (`corner-icon-button`): 44px 정사각, 진한 유리, 화면 모서리 고정 3종 (즐겨찾기 좌상단 24px · 배경 이미지 우측 80px · 설정 우상단 24px). 호버에서 호버 워시 + accent 테두리 + `scale(1.05)`.
- **Compact action** (`.btn-compact`): 설정 패널 안의 작은 액션. 8px 모서리.
- **Focus:** **모든 버튼에 `outline: 2px solid var(--focus-ring)` + `outline-offset: 2px`가 필요하다.** 현재 셸에는 `:focus-visible` 규칙이 `.segment-option`과 `.btn-compact` 둘뿐이고, 파일의 나머지 14건은 전부 달력 쪽이다.

### Cards / Containers

카드를 쓰지 않는다. 이 시스템의 컨테이너는 전부 유리판이며, 유리판 안에 유리판을 넣지 않는다.

- **Pinned shortcut** (`pinned-shortcut`): 좌상단 세로 스택, 196px 고정폭, 옅은 유리, 18px 파비콘 + 이름 한 줄(말줄임). 호버에서 `translateX(4px)`.
- **Sidebar item** (`sidebar-item`): 진한 유리, 20px 파비콘 + 이름 + 액션 아이콘. 액션은 호버에서만 나타난다(`opacity` 0 → 1). 드래그 정렬을 지원하며 `cursor: grab`, `.dragging`에서 `opacity: 0.5` + `grabbing`, `.drag-over`에서 accent 테두리.
- **Date pill** (`date-pill`): 우하단 고정, 옅은 유리, 고정폭 숫자.
- **Storage notice** (`storage-notice`): 하단 중앙 알약, 미리보기(localhost) 모드 전용. 옅은 유리 + `brightness(0.62)`, 12px, `word-break: keep-all`. 확장에서는 `hidden`이라 존재하지 않는 것과 같다.
- **Sidebars:** 즐겨찾기 좌측 320px, 배경 이미지 우측 360px. 옅은 유리 본체 + 패널 그림자 + `left`/`right` 0.3s 슬라이드. 헤더는 제목 + 1px 아래 경계선, 우측에 36px accent 추가 버튼.
- **Modal** (`modal-surface`): `modal-scrim` + `blur(5px)` 위의 16px 모서리 표면. 설정 모달은 좌측 탭 160px + 우측 본문, 최대 700px / 80vh. **모달 본문은 유리를 쓰지 않는다** — 스크림이 이미 사진을 끊었으므로 `--bg-secondary-glass` + `backdrop-filter`는 비용만 낸다. 불투명 표면이 맞다.

### Inputs / Fields

- **Search input** (`search-input`): 알약, 진한 유리, 2px 실선 한 올, 최대 500px(모서리 위치에서는 450px). 우측 8px 지점에 44px 원형 제출 버튼.
- **Focus:** 테두리가 accent로 바뀌고 배경이 불투명 판으로 바뀌며 `0 0 0 4px` 글로우가 붙는다. 배경이 불투명해지는 것이 핵심이다 — 입력 중에는 사진보다 글자가 우선한다.
- **Modal input:** 10px 모서리, 진한 유리, 1px 실선, 포커스 글로우 3px.
- **Placeholder:** 약화 색 (`text-on-glass-muted`). Colors 절의 The 두 예외 Rule 참조.

### Navigation

- **Settings tabs** (`settings-tab`): 좌측 160px 세로 목록. 기본은 투명 + 약화 색, 활성은 accent 12% 틴트 + accent 글자 + semibold.
- **Segment control** (`segment-option`): 2px 패딩 트랙(불투명 판, 8px 모서리) 안의 옵션. 메인 위젯 종류(시계 / 달력) 선택. 활성은 accent 22% 틴트 + 본문 색.

### 폼 컨트롤

| 컨트롤 | 형태 |
|---|---|
| 토글 스위치 | 68px 트랙 + 12px ON/OFF 텍스트 |
| 슬라이더 | 5px 트랙, 16px 원형 thumb, 값은 accent 색 + `tabular-nums` |
| 위치 그리드 | 3×3 정사각 셀 (8px 모서리, 2px 테두리), 중앙 dot이 선택 시 8 → 12px |

### 시계 (Signature)

`.clock`은 이 시스템에서 유일하게 표면이 없는 컴포넌트다. 144px / 800 / `tabular-nums`, `text-shadow`로만 읽힌다. 밝은 사진에서 대비가 1.0:1까지 떨어지며, **이것은 기록된 예외이지 따라 할 패턴이 아니다.** 새 표면 없는 텍스트를 만들지 않는다.

### 고쳐야 할 패턴

- **설정 탭의 좌측 3px 강조 막대** (`.settings-menu-item::before`). 활성 탭을 사이드 스트라이프로 표시하는 것은 의도된 적이 거의 없는 패턴이다. 이미 배경 틴트와 색·굵기 변화로 활성 상태를 말하고 있으므로 막대는 없어도 정보가 줄지 않는다.
- **모달 본문의 유리.** 위 Modal 항목과 Elevation 절 참조.
- **셸 컨트롤의 `:focus-visible` 부재.** 위 Buttons 항목 참조.
- **`--calendar-accent`라는 이름.** 실제로는 셸 컨트롤(`.segment-option`, `.btn-compact`)의 포커스 링이 이 값을 쓴다. 포커스 링은 화면 전체에서 하나여야 하므로 `--focus-ring`으로 옮기고, 달력 리디자인 시 함께 정리한다.
- **시각 크기가 작은 컨트롤의 히트 영역.** 가상 요소로 넓힌다.

## 6. Do's and Don'ts

### Do:

- **Do** 새 표면의 기본값을 "더 투명하게, 더 작게"로 잡는다. 면적을 늘리는 변경에는 무엇을 줄여 상쇄했는지가 함께 있어야 한다.
- **Do** 본문 텍스트를 담는 유리에 `backdrop-filter: blur(10px) brightness(0.62)`를 함께 건다. 표면을 누르지 않으면 텍스트 쪽에서 할 수 있는 일이 없다.
- **Do** 유리 표면 위의 본문에 `--text-primary`(0.95)를 쓴다. 0.65는 아이콘·비활성 상태·큰 텍스트로 제한한다.
- **Do** 각 표면이 배경 오버레이 없이 자기 대비를 확보하게 한다. 밝기 100에서 오버레이 알파는 정확히 0이 된다.
- **Do** 상태를 색에만 의존해 표시하지 않는다. 색과 함께 형태나 아이콘으로도 말한다.
- **Do** 매초·매분 바뀌는 숫자에 `font-variant-numeric: tabular-nums`를 건다.
- **Do** 한국어 문장에 `word-break: keep-all`과 `overflow-wrap: anywhere`를 함께 쓴다.
- **Do** 모든 인터랙티브 컨트롤에 `outline: 2px solid var(--focus-ring)` + `outline-offset: 2px`를 준다. 모든 조작은 마우스 없이 가능해야 한다.
- **Do** `prefers-reduced-motion: reduce`에서 셸의 전환도 함께 제거한다.
- **Do** 사용자가 입력한 문자열을 **항상 `textContent`**로 렌더한다. `innerHTML`은 하드코딩된 SVG 아이콘에만 쓴다.
- **Do** 아이콘을 SVG로 그리고 `aria-label`을 붙인다.
- **Do** 버튼 라벨을 동사 + 목적어로 쓴다 — "변경 취소", "다시 시도", "즐겨찾기 추가".
- **Do** 오류 문구에 무슨 일이 일어났는지와 그 결과를 함께 적는다 — "저장하지 못했습니다. 변경 사항은 적용되지 않았습니다." 저장 실패는 이 제품이 조용함을 포기하는 유일한 자리다.
- **Do** 설정 항목을 라벨 한 줄 + 설명 한 줄로 쓰고, 설명은 그 스위치를 켜면 화면이 어떻게 되는지를 말한다. 기능을 소개하지 않는다.
- **Do** `.enable-transition`을 사용자 조작 시점에만 붙인다.
- **Do** 반응형 크기 변경을 `:root` 토큰을 덮어서 처리한다.

### Don't:

- **Don't** 사진을 배경으로 깔고 그 위에 **불투명 카드를 얹지 않는다.** 사진이 액자 테두리로 전락한다. 이 제품이 피하려는 것 중 가장 가까이 있는 실패다.
- **Don't** **업무용 SaaS 대시보드**(Notion, Asana 류)를 만들지 않는다. 통계 카드, 진행률 바, 대시보드 그리드를 쓰지 않는다. 새 탭이 "일"처럼 느껴지면 실패다.
- **Don't** **알록달록한 위젯 모음**(포털 시작페이지 류)을 만들지 않는다. 화면의 hue 계열은 accent 하나로 유지하고, 상태 색은 그 상태가 실제로 발생했을 때만 나타난다.
- **Don't** **Windows 기본 앱 스타일**로 가지 않는다. 각지고 회색진 네이티브 앱 UI 대신 유리 질감과 둥근 모서리를 유지한다.
- **Don't** 유리 알파에 세 번째 단계를 만들지 않는다. 0.3과 0.5뿐이다.
- **Don't** 대비를 얻으려고 표면 알파를 올리지 않는다. `brightness()`를 쓴다.
- **Don't** 이미 유리인 표면 안쪽에 다시 `backdrop-filter`를 걸지 않는다.
- **Don't** 표면 없는 텍스트를 새로 만들지 않는다. 시계는 기록된 예외다.
- **Don't** 라이트 테마를 만들지 않는다.
- **Don't** 웹폰트를 추가하지 않는다. 굵기가 더 필요하면 가변 폰트의 `wght` 축에서 꺼낸다.
- **Don't** 굵기 700을 쓰지 않는다.
- **Don't** 디스플레이 자간을 `px`로 굳히지 않는다. `em`으로 두지 않으면 반응형에서 하한 -0.04em을 넘는다.
- **Don't** 컨트롤 안 라벨을 12px 미만으로 만들지 않는다.
- **Don't** `clamp()` 유동 타이포를 쓰지 않는다. 새 탭은 스크롤하지 않는 단일 화면이다.
- **Don't** 활성 상태를 좌측 강조 막대(`border-left` 또는 3px `::before` 스트라이프)로 표시하지 않는다.
- **Don't** 등장 연출·스크롤 시퀀스·스태거를 넣지 않는다. 모션은 상태를 전달할 때만 쓴다.
- **Don't** `transition: all`을 새로 쓰지 않는다. 전환할 속성을 명시한다.
- **Don't** 아이콘 자리에 `×` 같은 문자 글리프를 쓰지 않는다. 모양과 굵기가 본문 폰트에 매이고 접근성 이름이 `×`가 된다.
- **Don't** z-index를 그때그때 고르지 않는다. 여덟 단계 안에서 자리를 고르고 사이에 끼워 넣지 않는다.
