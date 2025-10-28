# Custom New Tab Extension

시간대별 배경 이미지가 적용되는 Chrome New Tab 확장 프로그램

## 기능

- ⏰ **실시간 시계**: 현재 시간과 날짜 표시
- 🔍 **통합 검색**: Google 검색 및 URL 직접 입력
- ⭐ **즐겨찾기**: 왼쪽 컬럼에 즐겨찾기 관리
- 🖼️ **이미지 업로드**: 사용자가 직접 이미지 업로드 가능
- 🌅 **랜덤 배경**: 새 탭을 열 때마다 랜덤 배경 이미지 표시
- 🎨 **다크모드**: 배경 색상에 적응하는 다크 테마

## 배경 이미지

새 탭을 열 때마다 다음 위치의 이미지 중 하나가 랜덤하게 표시됩니다:

- **업로드한 이미지**: 사용자가 직접 업로드한 이미지
- **로컬 이미지**: `images/` 폴더의 이미지 (1.jpg ~ 20.jpg)

이미지를 추가하는 두 가지 방법:

1. **UI에서 업로드**: 좌측 "🖼️ 이미지 관리" 버튼 클릭
2. **로컬 파일 추가**: `images/` 폴더에 1.jpg, 2.jpg... 형식으로 저장

## 설치 방법

### 1. 배경 이미지 준비 (선택사항)

로컬 이미지를 사용하려면 `my-newtab-extension/images/` 폴더에 이미지를 추가하세요:

```plaintext
images/
├── 1.jpg      # 1920x1080 권장
├── 2.jpg      # 1920x1080 권장
├── 3.jpg      # 1920x1080 권장
└── ...        # 원하는 만큼 추가 (최대 20개)
```

**파일명 규칙**: 1.jpg, 2.jpg, 3.jpg ... 순서대로 번호를 매겨주세요.

**이미지 권장 사항:**

- 해상도: 1920x1080 이상
- 포맷: JPG, PNG, WEBP
- 용량: 각 이미지 500KB 이하 권장

**참고**: 로컬 이미지 없이도 확장 프로그램을 설치한 후 UI에서 직접 이미지를 업로드할 수 있습니다.

### 2. Chrome에 확장 프로그램 로드

1. Chrome 브라우저를 열고 주소창에 입력:

   ```plaintext
   chrome://extensions/
   ```

2. 오른쪽 상단의 **개발자 모드** 활성화

3. **압축해제된 확장 프로그램을 로드합니다** 클릭

4. `my-newtab-extension` 폴더 선택

5. 새 탭을 열어서 확인!

## 사용 방법

### 검색하기

- 검색창에 텍스트 입력 → Google 검색
- URL 입력 (예: github.com) → 해당 사이트로 이동

### 즐겨찾기 관리

- **추가**: 좌측 하단 `+ 즐겨찾기 추가` 버튼 클릭
- **삭제**: 즐겨찾기에 마우스 오버 → `×` 버튼 클릭
- **방문**: 즐겨찾기 클릭

### 배경 이미지 관리

- **이미지 업로드**: 좌측 `🖼️ 이미지 관리` 버튼 클릭 → 이미지 드래그 또는 선택
- **이미지 미리보기**: 업로드된 이미지 클릭
- **이미지 삭제**: 이미지에 마우스 오버 → `×` 버튼 클릭
- **배경 변경**: 새 탭을 열면 자동으로 랜덤 이미지 표시

## 커스터마이징

### 색상 테마 변경

`newtab.css` 파일의 `:root` 변수를 수정:

```css
:root {
  --bg-primary: rgba(20, 20, 25, 0.85); /* 주 배경색 */
  --bg-secondary: rgba(30, 30, 35, 0.9); /* 보조 배경색 */
  --text-primary: rgba(255, 255, 255, 0.95); /* 주 텍스트 색 */
  --accent-color: rgba(100, 150, 255, 0.8); /* 강조 색상 */
}
```

### 로컬 이미지 개수 변경

더 많은 로컬 이미지를 사용하려면 `newtab.js` 파일의 `getLocalImageList()` 메서드에서 `maxImages` 값 수정:

```javascript
getLocalImageList() {
  const maxImages = 20; // 원하는 개수로 변경 (예: 50)
  return Array.from({ length: maxImages }, (_, i) => `images/${i + 1}.jpg`);
}
```

### 최대 업로드 파일 크기 변경

`newtab.js` 파일의 `ImageManager` 클래스 constructor:

```javascript
constructor(modal, manageBtn, backgroundManager) {
  // ...
  this.maxFileSize = 5 * 1024 * 1024; // 5MB → 원하는 크기로 변경
}
```

### 기본 즐겨찾기 변경

`newtab.js` 파일의 `getDefaultBookmarks()` 메서드 수정:

```javascript
getDefaultBookmarks() {
  return [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'YouTube', url: 'https://www.youtube.com' },
    // 원하는 사이트 추가
  ];
}
```

## 파일 구조

```plaintext
my-newtab-extension/
├── manifest.json       # 확장 프로그램 설정
├── newtab.html         # HTML 구조
├── newtab.css          # 스타일링
├── newtab.js           # 기능 구현
└── images/             # 로컬 배경 이미지 (선택사항)
    ├── 1.jpg
    ├── 2.jpg
    └── ...
```

**참고**: 업로드된 이미지는 Chrome Storage에 Base64 형식으로 저장됩니다.

## 기술 스택

- Vanilla JavaScript (ES6+)
- Chrome Extensions Manifest V3
- Chrome Storage API
- CSS3 (Grid, Flexbox, Backdrop Filter)

## SOLID 원칙 적용

- **단일 책임 원칙**: 각 클래스는 하나의 책임만 가짐

  - `ClockManager`: 시계 관리
  - `BackgroundManager`: 배경 이미지 관리 (로드, 저장)
  - `SearchManager`: 검색 관리
  - `BookmarkManager`: 즐겨찾기 관리
  - `ImageManager`: 이미지 업로드 및 UI 관리
  - `Application`: 초기화 조율

- **개방-폐쇄 원칙**: 확장에는 열려있고 수정에는 닫혀있음
- **인터페이스 분리 원칙**: 필요한 메서드만 공개
- **의존성 역전 원칙**: 추상화에 의존

## 문제 해결

### 배경 이미지가 표시되지 않음

- 이미지를 업로드했는지 확인
- `images/` 폴더에 로컬 이미지 파일이 있는지 확인 (선택사항)
- Chrome 확장 프로그램 페이지에서 새로고침

### 이미지 업로드가 안됨

- 파일 크기가 5MB 이하인지 확인
- 이미지 포맷이 JPG, PNG, WEBP인지 확인
- Chrome Storage 용량 확인 (최대 약 10MB)

### 즐겨찾기가 저장되지 않음

- Chrome 확장 프로그램 권한 확인
- 콘솔 에러 확인 (F12 → Console)

### 시간이 업데이트되지 않음

- 페이지 새로고침
- 확장 프로그램 재설치

### Storage 용량 초과

- 업로드된 이미지 일부 삭제
- 이미지를 압축하여 재업로드
- 로컬 이미지 사용 권장 (Storage 용량 절약)

## 라이선스

MIT License
