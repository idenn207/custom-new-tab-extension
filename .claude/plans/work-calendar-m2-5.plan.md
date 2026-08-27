# Plan: M2.5 — 잃어버린 데이터를 되돌릴 수 있다

**Source PRD**: `.claude/prds/work-calendar.prd.md`
**Selected Milestone**: M2.5 — 잃어버린 데이터를 되돌릴 수 있다 (판정 장치 이식 포함)
**Complexity**: Large

## Summary

전체 상태(배경 이미지 제외)를 파일 하나로 내보내고 그 파일로 되돌린다. 캘린더 읽기가
깨진 상태에서도 복구가 통하고, 복구가 저장소를 덮기 직전의 상태는 되돌리기 슬롯 하나에
자동으로 보관된다.

이 플랜은 그 앞에 **판정 장치를 먼저 세운다.** 스모크 하네스는 `chrome.storage.local` 을
직접 부르기 때문에 `chrome-extension://` 오리진에서만 돌고, 그 사실이 M2 전·후반부
두 번의 종료 기록에서 "판정이 돌지 않았다"로 남았다(백로그 `id=m2-headless-runner`).

수치는 실측이다(2026-08-26, `test/positioning.smoke.js`): `chrome.storage` 를 담은 **줄이
42개**, `chrome.storage.local` **등장이 41회**, 그중 실제 메서드 호출(`.get`/`.set`/
`.remove`/`.clear`)이 **36회**다. 셋은 다른 수이고 이 플랜은 셋을 구별해 쓴다 — 치환 대상은
41회 등장 전부이며, "42" 는 줄 수일 뿐 호출 수가 아니다.
`newtab.js`는 이미 `selectStorageBackend()`로 http 오리진용 백엔드를 갖고 있으므로, 그
어댑터를 공유 파일로 옮기고 하네스를 그 위에 얹으면 하네스가 로컬 서버(127.0.0.1 의 5500
포트)에서 돈다. **데이터 소실을 막는 기능을 판정 없이 배포하지 않기 위해 그 순서로 한다.**

## User Intent

<!-- USER-STATED constraints only. 작성자 근거는 ## Design Decisions 로 간다. -->

| ID | Constraint (user-stated) | Kind |
|---|---|---|
| UI1 | M2.5 백업 복구와 스모크 하네스의 localhost 이식을 같은 플랜에 넣는다 | direction |
| UI2 | 백업 파일은 캘린더 이벤트와 프로젝트와 북마크와 모든 설정을 담는 전체 상태 백업이다 | constraint |
| UI3 | 배경 이미지(업로드 이미지와 고정 이미지)는 백업 파일에 담지 않는다 | exclusion |
| UI4 | 덮어쓰기 직전 상태는 저장소 안 되돌리기 슬롯에 보존하고 화면에서 한 번에 복귀한다 | constraint |
| UI5 | 복구 직전 상태를 파일로 자동 내려받게 하지 않는다 | exclusion |
| UI6 | 로컬 서버가 열려 있고 화면은 127.0.0.1 포트 5500 경로에서 볼 수 있다 | direction |
| UI7 | 이 마일스톤은 메모 마일스톤 착수 전에 반드시 존재해야 한다 | constraint |
| UI8 | 각 마일스톤의 판정은 하루 재현 테스트로 끝내고 정량 지표를 새로 만들지 않는다 | constraint |
| UI9 | 되돌릴 수 없으면 백업이 아니다 — 읽기가 깨진 상태에서도 복구가 통해야 한다 | constraint |
| UI10 | 사용자 정의 메모 종류와 저장 데이터 암호화는 이 범위에 넣지 않는다 | exclusion |

## Design Decisions

작성자 근거다. 위 User Intent 와 섞지 않는다.

**DD1 — 백업 봉투는 기존 내보내기 봉투를 확장하지 않고 새로 만든다.**
현재 내보내기 봉투의 `version` 은 **캘린더 스키마 버전**이고 `sanitizeImportedEvents()` 가
정확히 숫자 `4` 만 화이트리스트한다(`newtab.js:1220`). 여기에 `bookmarks` 를 더하면 한
필드가 두 가지(스키마 버전, 백업 포맷 버전)를 뜻하게 되고, 그 순간 "version 5" 가 무엇인지
코드가 답할 수 없다. 새 봉투는 다른 판별자를 쓴다:

```json
{
  "schema": "newtab-backup",
  "backupVersion": 1,
  "settingsVersion": 4,
  "exportedAt": "2026-08-26T00:00:00.000Z",
  "excludedKeys": ["uploadedImages", "fixedImage"],
  "sourceLoadFailed": false,
  "data": { "calendarEvents": [], "calendarProjects": [], "bookmarks": [] }
}
```

`excludedKeys` 를 **파일 안에 적는다** — 복구하는 사람이 "사진이 왜 안 돌아왔는가" 를
파일만 보고 답할 수 있어야 한다. UI3 이 만든 구멍의 유일한 증거이므로 장식이 아니다.

**DD2 — 백업은 화이트리스트가 아니라 deny-list 다.**
비대칭 때문이다. 백업이 키를 **빠뜨리면 복구에서 소실**이고, **여분을 담으면 무해**하다
(복구가 그 키를 그대로 써 넣는다). 그러므로 기본값이 "담는다" 여야 한다. `storage.get(null)`
전량에서 제외 목록만 뺀다.

**앞선 판의 이 자리 괄호는 "복구가 그대로 되돌려 놓는다" 였고 그것은 틀렸다.** 그 문장은
복구가 저장소를 **통째로 치환**한다고 가정하는데, 어댑터의 `set()` 은 양쪽 백엔드 모두
**병합**이다 — `local-preview` 는 `readAll()` 로 전량을 읽어 키별로 대입한 뒤 `writeAll()`
하고(`newtab.js:203-209`), `extension` 은 통과 어댑터라 `chrome.storage.local.set` 의
병합 의미가 그대로 나온다. deny-list 라는 결론 자체는 살아남지만 — 빠뜨리면 소실이고
여분은 써 넣어질 뿐이다 — **근거를 고쳐야 했고 그 고침이 DD14 다.** R8 architect 가
HIGH 로 지목했고 옳다. 화이트리스트를 쓰면 메모 마일스톤에서 키가 생겼을 때 백업이
**조용히** 그것을 빠뜨리고, 그 사실은 데이터를 잃은 다음에만 드러난다.

제외 목록은 셋이다. 배경 이미지 두 키는 UI3 이고, 되돌리기 슬롯 키는 재귀 방지다 —
슬롯이 자기 자신을 담으면 복구할 때마다 저장된 바이트가 배로 늘어난다.

**DD3 — 복구는 한 번의 `set()` 과 페이지 리로드다.**
`storage.set(payload)` 한 번이면 부분 커밋이 없다. `persistEvents()` 가 이미 같은 이유로
"set() 호출은 어느 분기에서도 정확히 하나다" 를 지킨다(`newtab.js:3612`). 커밋 뒤 메모리를
맞추는 방법이 둘인데, 매니저를 하나씩 손으로 갱신하는 쪽은 **하나를 빠뜨린 상태**가 화면과
저장소가 어긋난 채 남고 그 어긋남이 다음 쓰기에서 저장소를 덮는다. 리로드는 재동기화 코드를
한 줄도 새로 쓰지 않고 그 위험을 통째로 없앤다. 대가는 화면 깜빡임 한 번이고, 복구는 드문
조작이므로 지불할 만하다.

**DD4 — 되돌리기 슬롯은 복구와 같은 `set()` 에 들어간다.**
두 번으로 나누면 사이에서 죽었을 때 (a) 슬롯만 있고 복구가 안 된 상태, (b) 복구는 됐는데
슬롯이 없는 상태 둘이 생기고, (b) 가 정확히 **되돌릴 수 없는 상태**다. 같은 payload 에
넣으면 어댑터의 `set()` 한 번이므로 그 중간 상태가 존재하지 않는다.
슬롯은 **하나만** 유지한다. 여러 개를 쌓으면 저장소 압박을 우리가 만들고, 그것이 이
마일스톤이 완화하려는 바로 그 위험이다(PRD Risks 의 저장소 축출 행).

**DD5 — 슬롯은 백업이 아니라 실수 취소다. 화면도 그렇게 부른다.**
슬롯은 저장소 안에 있으므로 **축출 위험을 복구 대상과 공유한다.** 저장소가 통째로 날아가면
슬롯도 함께 날아간다. UI4 가 슬롯을 고른 것은 사용자 조작 0회로 자동 동작하는 유일한
형태이기 때문이고, 그것이 막는 것은 **잘못된 파일로 복구한 실수**이지 저장소 소실이 아니다.
화면 문구에서 슬롯을 "백업" 이라고 부르지 않는다 — 그렇게 부르면 사용자가 파일 백업을
그만둔다.

**DD6 — 저장소 어댑터를 공유 파일로 옮긴다. 복제하지 않는다.**
`newtab.js` 의 어댑터 주석이 이미 적어 두었다 — "스모크 하네스가 원시 키를 직접
시드 백업 복원하므로 형태를 바꾸면 조용히 깨진다"(`newtab.js:157`). 하네스에 어댑터 사본을
두면 그 경고가 실현되는 경로를 하나 더 만드는 것이다: 봉투 키나 모양이 갈라져도 하네스는
자기 사본으로 초록을 낸다. 새 파일 하나를 `newtab.html` 과
`test/positioning.smoke.html` 이 함께 로드하면 정의가 하나다.
**이동이지 재작성이 아니다.** Task 1 의 판정은 옮긴 함수 본문이 바이트 단위로 같은가이다.

**DD7 — 어댑터는 `window.__newTabStorage` 로 명시 노출한다.**
최상위 `const` 는 classic script 의 전역 **어휘** 환경에 들어가므로 같은 realm 의 다른
스크립트에서는 **이름으로 보이지만** `window` 의 속성은 **아니다.** 두 절이 함께여야 뜻이
맞는다. 하네스는 iframe **바깥**의 다른 창이므로 `frameWindow.PREVIEW_STORAGE_KEY` 를 읽을
수 없고, 그 창 간 접근만을 위해 `window.__newTabApp = app`(`newtab.js:5841`) 과 같은
관용구로 핸들을 붙인다.

**같은 문서 안의 접근에는 아무것도 바꿀 필요가 없다.** R1 architect 가 이 자리를 CRITICAL
둘로 지목했다 — "어댑터를 옮기면 `applyStorageNotice()` 의 `STORAGE_BACKEND` 참조가
ReferenceError 로 죽는다". **실측으로 반증했다**(2026-08-26, `node:vm` 으로 한 realm 에
두 스크립트를 올려 확인):

- 두 번째 스크립트에서 첫 스크립트의 `const` 를 이름으로 읽으면 값이 나온다 (`"local-preview"`)
- 세 번째 스크립트에서 같은 이름을 재선언하면 `SyntaxError: Identifier 'STORAGE_BACKEND'
  has already been declared` — 두 스크립트가 **같은 전역 어휘 환경을 공유한다는 직접 증거**다
- 같은 확인에서 `Object.prototype.hasOwnProperty.call(globalThis, "STORAGE_BACKEND")` 는
  `false` — 이것이 DD7 후반부가 존재하는 이유이고, 리뷰어가 이 절반을 읽어 전체로 삼았다

다만 리뷰어가 함께 낸 HIGH 는 **유효하다**: `node --check` 와 `grep` 은 런타임 바인딩을
증명하지 못한다. 그래서 Task 1 이 런타임 증인을 요구한다 — `applyStorageNotice()` 가 성공해야
`document.body.dataset.storageBackend` 가 세워지므로(`newtab.js:1035`), 그 값의 존재가
"바인딩이 실제로 해석됐다" 의 관측 가능한 대리다.

**`node:vm` 추론을 실제 브라우저 런타임이 확인했다** (2026-08-27, 로컬 서버의
`newtab.html`, 이동 **전** 트리). `node:vm` 은 realm 을 흉내낸 것이고 아래는 진짜 문서다:

| 관측 | 값 | 무엇을 고정하는가 |
|---|---|---|
| `'selectStorageBackend' in window` | `true` | `function` 선언은 window 속성이 된다 — R6 architect HIGH(1558행이 undefined 가 된다)를 실런타임에서 반증한다 |
| `'PREVIEW_STORAGE_KEY' in window` | `false` | `const` 는 되지 않는다 — DD7 후반부가 존재하는 이유 |
| `document.body.dataset.storageBackend` | `'local-preview'` | 어휘 바인딩이 **실제로 해석된다**. R1 architect HIGH 가 요구한 런타임 증거이며, 이동 전 기대값을 못박아 Task 1 이 대조할 상대를 준다 |
| `storageNotice.hidden` | `false` | Task 2 가 "단언이 아니라 베이스라인 차이" 라고 분류한 값이 실제로 그렇게 갈린다 — DD8 의 근거 |

세 번째 줄이 이 표의 값이다. 앞선 판은 그 증인을 Task 1 의 `[사람]` 항으로 미뤄 두었고,
그래서 **승인 시점에는 아무 런타임 증거도 없었다.** 이제 이동 전 값이 측정돼 있으므로
Task 1 은 "세워지는가" 가 아니라 "**`local-preview` 로 같은가**" 를 묻는 대조 판정이 된다.

**DD8 — 하네스 베이스라인에 오리진을 태그하고, 불일치하면 비교를 거부한다.**
확장 오리진과 localhost 는 렌더 조건이 다르다 — M2 전반부 종료 기록이 이미 같은 트리에서
검색창 폭이 `492` 와 `491` 사이로 흔들려 매 실행 30여 건이 차이로 뜨는 것을 적었다. 두
오리진의 스냅샷을 비교하면 전건 차이가 나고, 그러면 하네스가 영구 빨간불이 되어 아무도 그
색을 믿지 않게 된다. 하네스가 `assertFailures` 를 `capturedErrors` 와 가른 것과 **같은
이유**다(`test/positioning.smoke.js:44`). 베이스라인 메타에 오리진을 넣고 비교 시
불일치면 조용히 비교하지 않고 **거부**한다.

**식별자를 고정한다** — 메타 필드는 `baselineOrigin`, 거부 문구는 "오리진이 다른
베이스라인" 을 포함한다. 판정이 문자열로 존재를 확인하기 때문이고, R3 invariant 가
"DD8 이 Action 에만 있고 판정에는 없다 — 안전장치가 선언만 되고 검증되지 않는다"고
지목한 자리를 그것으로 닫는다. 이름을 바꾸면 Task 2 Validate 도 함께 바꿔야 한다.

**DD9 — 전체 백업 내보내기에는 `canExport()` 가드를 걸지 않는다. 대신 상태를 파일에 적는다.**
naive 하게 미러링하면 안 되는 자리다. 기존 `canExport()`(`newtab.js:3822`)가 존재하는
이유는 캘린더 내보내기가 **메모리의 정제된 목록**(`getEvents()`)을 직렬화하기 때문이다 —
읽기가 실패하면 그 목록이 비어 있고, 빈 파일이 백업으로 오인된다. 전체 백업은
`storage.get(null)` 로 **원시 바이트**를 읽으므로 그 위험이 없다: 손상까지 그대로 복사하며,
그것이 백업이 해야 하는 일이다. 읽기가 깨진 상태에서 내보내기를 막으면 **깨진 순간에
백업을 못 뜨게 되고**, 그때가 백업이 가장 필요한 때다(UI9).
대신 봉투에 `sourceLoadFailed` 를 적어 사용자가 오해하지 않게 한다.
기존 캘린더 전용 내보내기의 가드는 **그대로 둔다** — 그쪽은 여전히 메모리를 직렬화한다.

**DD10 — 판정 장치를 먼저 세우고 그 위에서 기능을 만든다.**
데이터 경로를 바꾸는 변경과 판정 장치를 바꾸는 변경을 한 커밋에 넣으면 실패했을 때 어느
쪽이 원인인지 물을 수 없다. M2 가 같은 이유로 헤드리스 러너를 뒤로 미뤘다. 여기서는 순서를
반대로 한다 — Task 1 과 2 로 하네스를 이식해 **초록을 확인한 뒤**에 Task 3 이 시작한다.

**DD11 — 복구 입력은 신뢰 불가 입력이다.**
`sanitizeImportedEvents()` 와 같은 규율을 쓴다: 아는 값을 열거하는 화이트리스트로 파싱하고
나머지를 전부 거절한다. `data` 는 평범한 객체여야 하고, 키는 `__proto__` 와 `constructor`
와 `prototype` 을 거절하며, 값 전체 크기 상한을 둔다. 항목 하나라도 탈락하면 배치 전체를
거절한다 — 부분 복구는 사용자가 무엇을 잃었는지 모른 채 성공했다고 믿게 만든다.

**DD13 — 봉투의 `settingsVersion` 은 기록이 아니라 관문이다.**
DD1 이 그 값을 봉투에 적어 두고도 아무도 읽지 않으면 장식이다. 복구는 봉투의
`settingsVersion` 을 앱의 `SETTINGS_VERSION`(`newtab.js:18`)과 대조해 세 갈래로 간다.

| 봉투 | 처리 | 이유 |
|---|---|---|
| 같다 | 그대로 복구 | 같은 스키마다 |
| **더 낮다** | 그대로 복구하고, 리로드 뒤 **기존 시동 마이그레이션이 처리한다** | `migrateSettingsToV2`·`migrateCalendarToV3`·`migrateCalendarToV4` 가 각자 자기 상수로 가드하며 멱등이다(`newtab.js:698` 외). DD3 의 리로드가 그 체인을 정확히 한 번 태운다 — **리로드를 고른 이유가 여기서 한 번 더 회수된다** |
| **더 높다** | **거절한다** | 옛 코드는 미래 스키마를 이해할 수 없고, 추측해 읽으면 조용히 망가진다. `sanitizeImportedEvents()` 가 이미 같은 규율을 쓴다 — "version 5 가 미래에 생겨도 옛 코드는 그것을 추측해 읽지 않고 죽는다, 그리고 그것이 옳다"(`newtab.js:1213` 부근 주석) |

R3 invariant MEDIUM 이 지목했고 옳다. 이 마일스톤 뒤에 M3·M4 가 저장소 키를 더하므로
그때 만들어진 백업을 지금 코드로 되돌리는 상황이 **실제로 생긴다.**

**그러면 M3·M4 는 `SETTINGS_VERSION` 을 언제 올려야 하는가.** R8 architect 가 MEDIUM 으로
"플랜이 상황만 인정하고 규칙을 주지 않는다" 고 지목했고 옳다. 규칙은 관문이 무엇을
판별하는지에서 그대로 나온다 — 관문이 묻는 것은 "옛 코드가 이 봉투를 **옳게 읽을 수
있는가**" 이지 "키가 늘었는가" 가 아니다.

- **키를 더하기만 한다 → 올리지 않는다.** deny-list 백업이 모르는 키도 그대로 담고
  (케이스 9), 복구는 범위 한정 치환이라 그대로 써 넣는다 (DD14). 옛 코드는 그 키를 안
  읽을 뿐 **잘못** 읽지 않는다.
- **기존 키의 뜻이나 모양을 바꾼다 / 새 키 없이는 기존 키가 잘못 해석된다 → 올린다.**
  그리고 자기 상수로 가드하는 멱등 마이그레이션을 함께 더한다(`migrateCalendarToV4` 형태).
  올리지 않으면 옛 코드가 새 봉투를 같은 버전으로 보고 **추측해 읽는다** — 관문이 막으려는
  것이 정확히 그것이다.

이 규칙을 지금 적어 두는 이유는, 없으면 M3 가 올릴지 말지를 그때 즉흥으로 정하게 되고
**그 결정이 이 관문의 뜻을 사후에 바꾸기** 때문이다. 규칙이 먼저 있어야 관문이 상수다.

**DD12 — 앵커는 둘로 가르고, 줄바꿈을 LF 로 고정한다.**
R1 invariant 가 CRITICAL 로 지목했고 **실측으로 확인됐다.** 기존 M2 종료 앵커를 지금 검증하면
**exit 1** 이다:

```
$ shasum -a 256 -c .claude/plans/work-calendar-m2.rebaseline.sha256
shasum: test/positioning.smoke.js: No such file or directory
```

원인이 둘이고 둘 다 이 플랜에 그대로 복사돼 있었다.

1. **줄바꿈.** 그 앵커 파일은 working tree 에서 **CRLF** 라 `shasum -c` 가 파일명을
   `test/positioning.smoke.js\r` 로 읽는다(`od -c` 로 확인). 파일은 멀쩡히 존재하는데
   검증이 실패한다 — 즉 이 앵커는 **한 번도 통과한 적이 없거나 통과 이후 체크아웃에서
   깨졌다.** `.gitattributes` 에 `*.sha256 text eol=lf` 를 넣어 원인을 막고, LF 로 쓴
   앵커가 실제로 통과하는 것을 확인했다(exit 0).
2. **추적되지 않는 대상.** 그 앵커는 `work-calendar-m2.baseline.json` 을 포함하는데 그
   파일은 `.gitignore` 에 걸려 있고 이 트리에 **없다.** 다른 기계는 물론 같은 기계에서도
   내려받기 전에는 검증이 성립하지 않는다.

그러므로 앵커를 **둘로 가른다.**

- `work-calendar-m2-5.baseline.sha256` / `.rebaseline.sha256` — **추적되는 소스 파일만**
  담는다. 어느 기계에서든 `shasum -c` 가 성립하며, Acceptance 가 요구하는 것은 이쪽이다.
- `work-calendar-m2-5.artifact.local.sha256` — 기계 로컬 산출물(하네스 내보내기 JSON)만
  담는다. **이식 가능하지 않다는 사실을 파일 이름이 말한다**(`.local.`). 이것을 만든 기계
  밖에서 실패하는 것은 결함이 아니라 정의이며, Acceptance 는 이쪽에 통과를 요구하지 않는다.

가르지 않으면 하나의 실패가 두 가지를 뜻하게 되고 — "코드가 바뀌었다" 와 "그 기계가 아니다"
— 둘을 구별할 수 없는 앵커는 앵커가 아니다.

**DD14 — 복구는 전역 `clear()` 가 아니라 범위 한정 치환이다.**
R8 architect 가 HIGH 로 지목한 자리다. 앞선 판은 "전체 상태를 그 파일로 되돌린다"
(Summary·UI2·UI9)고 말하면서 복구를 `set()` 한 번으로만 적어 두었고, **그 둘이 어긋난다.**
어댑터의 `set()` 은 병합이므로 `set(봉투.data)` 만으로는 **백업 시점에 없던 키가
살아남는다.** 그 순간 "되돌린다" 가 거짓이 된다.

**그렇다고 `clear()` 를 쓸 수는 없다 — 그쪽이 더 나쁘다.**

1. `clear()` 는 제외 키까지 지운다. `uploadedImages` 와 `fixedImage` 는 UI3 때문에
   **백업에 담기지 않으므로** 지워지면 봉투에서 되살릴 수단이 없다. 복구했더니 배경
   사진이 영구히 사라지는 것은 데이터 소실이고, 이 마일스톤이 막으려는 바로 그것이다.
2. `local-preview` 의 `clear()` 는 `PREVIEW_STORAGE_KEY` 항목을 통째로 지운다
   (`newtab.js:217-219`). 되돌리기 슬롯도 같은 항목 안에 있으므로 **방금 만든 슬롯이 함께
   날아간다** — DD4 가 막으려던 "(b) 복구는 됐는데 슬롯이 없는 상태" 를 `clear()` 가
   직접 만든다.

그러므로 복구는 **제외 목록 바깥의 키 집합에 대해서만** 치환한다. 그 집합은 DD2 의
deny-list 가 이미 정의하고 있으므로 새 개념이 아니다.

| 키의 자리 | 복구 뒤 | 수단 |
|---|---|---|
| 봉투에 있다 | 봉투 값으로 덮는다 | `set` |
| 봉투에 없고 **제외 목록에 있다** | 그대로 둔다 — 백업 대상이 아니었다 (UI3) | 손대지 않는다 |
| 봉투에 없고 제외 목록에도 없다 | **지운다** — 백업 시점에 없던 키다 | `remove` |
| 되돌리기 슬롯 키 | 같은 `set()` 에 새 슬롯을 쓴다 (DD4) | `set` |

**순서는 `set()` 다음 `remove()` 이고 뒤집지 않는다.** 중간에서 죽었을 때 남는 상태가
갈리기 때문이다. `remove` 를 먼저 하면 **키가 빠진 상태**(소실)로 남고, `set` 을 먼저
하면 **봉투가 온전히 적용된 위에 오래된 키 몇 개가 더 있는 상태**(상위집합)로 남는다.
후자에는 되돌리기 슬롯이 이미 들어 있으므로 사용자가 되돌릴 수 있다. 어느 쪽이 안전한지는
비교할 필요가 없다.

**DD3 의 "`set()` 은 한 번" 은 그대로 참이다.** 늘어나는 것은 `remove()` 한 번이고 그것도
지울 키가 있을 때만이다. 원자성 주장이 약해지는 만큼을 케이스 10 이 호출 수와 **순서**로
못박고, 케이스 14 가 "정말 사라지는가" 를 본다.

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| 명명 | `newtab.js:698` | 저장소 절차는 최상위 async 함수이고 `Promise<boolean>` 을 돌려준다. 실패를 조용히 넘기지 않고 고지에 반영한다 |
| 실패 처리 | `newtab.js:3217` | 부재와 손상을 가른다 — 부재는 빈 배열, 손상은 **봉인**(잠금과 배너). 조용히 빈 값으로 강등하지 않는다 |
| 원자 커밋 | `newtab.js:3612` | "set() 호출은 어느 분기에서도 정확히 하나다" — 반쪽 상태를 만들지 않는다 |
| 신뢰 불가 입력 | `newtab.js:1202` | 화이트리스트로 파싱하고 나머지 거절. 항목 하나라도 탈락하면 배치 전체 거절 |
| 화면 고지 | `newtab.js:1034` | 상시 표면을 늘리지 않고 필요할 때만 나타난다. 상태를 누적하지 않고 매번 통째로 대입 |
| 설정 UI | `newtab.html:181` | `settings-subsection` 안에 제목과 `settings-item` 과 설명 문단과 `settings-status[role=status]` |
| 렌더 안전 | `newtab.js:1073` | 사용자 문자열은 `textContent` 로만 렌더한다 |
| 테스트 | `test/positioning.smoke.js:1612` | `loadApp(seed)` 로 앱을 올리고 프로덕션 객체를 직접 조작한 뒤 `assert()` 하고 `collector.add()` 로 스냅샷을 남긴다 |
| 테스트 분리 | `test/positioning.smoke.js:44` | 단언 실패와 콘솔 오류를 다른 배열에 담는다 — 실패 경로 케이스가 하네스를 영구 빨간불로 만들지 않게 |

## Files to Change

| File | Action | Why |
|---|---|---|
| `storage-adapter.js` | CREATE | 백엔드 선택과 어댑터를 `newtab.js` 에서 이동. 앱과 하네스가 같은 정의를 공유한다 (DD6) |
| `newtab.js` | UPDATE | 어댑터 이동, 백업 봉투 순수 함수, 복구와 되돌리기 커밋, UI 배선 |
| `newtab.html` | UPDATE | 어댑터 스크립트 로드, 설정 모달에 전체 백업 섹션 |
| `newtab.css` | UPDATE | 백업 섹션과 되돌리기 버튼. 기존 settings 클래스를 재사용하고 새 토큰을 도입하지 않는다 |
| `test/positioning.smoke.html` | UPDATE | 어댑터 스크립트 로드, 현재 오리진 표시 |
| `test/positioning.smoke.js` | UPDATE | `chrome.storage.local` 직접 호출을 어댑터로 치환, 베이스라인 오리진 태그, 백업 복구 케이스 추가 |
| `.gitignore` | UPDATE | M2.5 베이스라인 내보내기 파일을 추적에서 제외 |
| `.gitattributes` | UPDATE | `*.sha256 text eol=lf` — 체크아웃 CRLF 변환이 앵커를 깨는 것을 막는다 (DD12) |
| `.claude/prds/work-calendar.prd.md` | UPDATE | M2.5 행 상태 갱신. 착수 시 `in-progress` 는 이 커맨드가 수행하고 종료는 Task 8 |

## Tasks

### Task 0: 착수 기록과 전제 실측

- **Action**:
  - 0-a) **먼저 `.gitattributes` 에 `*.sha256 text eol=lf` 를 넣는다** (DD12).
    **명령을 적어 둔다.** 앞선 판은 이 줄을 산문으로만 두고 실행 형태를 주지 않아서, 정작
    코드 블록은 아래 `tr` 정규화에만 있었다 — R8 invariant 가 HIGH 둘("실행 명령이 없다",
    "실패해도 만든 자리에서 아무도 안 본다")로 지목했고 옳다. 멱등이고 실패하면 앵커를
    뜨기 **전에** 멈춘다:
    ```bash
    grep -qxF '*.sha256 text eol=lf' .gitattributes 2>/dev/null \
      || printf '%s\n' '*.sha256 text eol=lf' >> .gitattributes
    # 쓰기가 조용히 실패하면(권한·디스크 참) 여기서 죽는다. Task 0 Validate 가 뒤에서
    # 또 보지만 그때는 0-b~0-f 를 다 지난 뒤이고, 앵커는 이 줄이 없는 채로 이미 떠 있다.
    grep -qxF '*.sha256 text eol=lf' .gitattributes \
      || { echo ".gitattributes 규칙 추가 실패 — 앵커를 뜨기 전에 멈춘다"; exit 1; }
    ```
    이 줄이 없으면 아래에서 뜨는 앵커가 다음 체크아웃에서 CRLF 가 되어 `shasum -c` 가 파일명을
    `...\r` 로 읽고 영구히 실패한다. 기존 M2 앵커가 지금 그 상태다.
    **그리고 그 M2 앵커를 함께 고친다.** 규칙만 넣는 것은 앞으로를 막을 뿐 이미 깨진
    것을 되살리지 않는다(R6 invariant MEDIUM). 기존 둘을 LF 로 정규화한다:
    ```bash
    for f in .claude/plans/work-calendar-m2.baseline.sha256              .claude/plans/work-calendar-m2.rebaseline.sha256; do
      [ -e "$f" ] || continue
      tr -d '
' < "$f" > "$f.lf" && mv -f "$f.lf" "$f"
    done
    ```
    **해시 값은 건드리지 않는다 — 줄바꿈만 바꾼다.** 정규화 뒤에도 그 앵커는
    `work-calendar-m2.baseline.json` 이 이 트리에 없어 여전히 실패하며, 그것은 **다른
    원인**(추적되지 않는 대상)이고 DD12 가 M2.5 앵커를 가른 이유다. 즉 이 조치가 고치는
    것은 두 원인 중 하나뿐이고, 그 사실을 Task 8 의 종료 기록에 적는다.
  - 0-b) **추적되는 소스만** 담는 착수 앵커를 뜬다.
    `shasum -a 256 newtab.js newtab.html newtab.css test/positioning.smoke.js test/positioning.smoke.html > .claude/plans/work-calendar-m2-5.baseline.sha256`
    이 파일은 기계 로컬 산출물을 담지 않으므로 **어느 기계에서든** 검증이 성립한다.
  - 0-c) 저장소 밖 복구본을 뜬다 — `cp .claude/plans/work-calendar-m2-5.baseline.sha256 "$HOME/"`.
    전반부 앵커가 `.gitignore` 에 걸려 영구 소실됐던 전례가 있다(백로그 `id=m2base-backup`).
    **이 방어는 약하다** — `$HOME` 이 지워지면 함께 사라지고 버전 관리가 없다. 앵커 본체가
    이제 추적되는 파일이므로 git 이 1차 방어이고 이것은 2차다.
  - 0-d) **전제를 실측한다 — 계획 시점에 이미 했고, 그 결과가 이 플랜을 고쳤다.**
    2026-08-27, 로컬 서버(127.0.0.1 의 5500 포트, 경로 `/.worktrees/work-calendar`)의 하네스
    페이지에서 "비교 실행" 을 눌러 관측했다. 하네스 자신의 오류 표면이 낸 문구는:

    > 하네스 실행 실패: Cannot read properties of undefined (reading 'local')

    케이스는 **0건 실행**됐다. 전제("하네스가 이 오리진에서 죽는다")는 참이다.

    **그러나 앞선 판이 적어 둔 기대 문구는 틀렸다.** `chrome is not defined` 가 아니다 —
    Chromium 계열 브라우저는 일반 페이지에도 `chrome` 객체를 노출하므로 http 오리진에서도
    `typeof chrome !== 'undefined'` 가 **참**이고(실측), 없는 것은 `chrome.storage` 다.
    그래서 던지는 것은 `ReferenceError` 가 아니라 `TypeError` 이며, 하네스는
    `test/positioning.smoke.js:155` 의 `chrome.storage.local.clear()` 에서 처음 죽는다.
    **이 저장소의 코드는 처음부터 그것을 옳게 적고 있었다** — `newtab.js:236` 의 주석이
    "`chrome.storage`가 아예 없어 모든 저장이 TypeError로 실패했다" 라고 말한다. 틀린 것은
    코드가 아니라 플랜이었고, **실행해 보기 전까지 여섯 번의 리뷰 라운드가 그것을 잡지
    못했다.** 정적 검사는 문구의 참·거짓을 볼 수단이 없기 때문이다.
    문구를 틀리게 두면 구현자가 없는 오류를 찾다가 전제가 거짓이라고 결론짓거나 기록을
    꾸미게 되므로, 이것은 문서 오타가 아니라 판정을 오염시키는 결함이다.

    구현자는 자기 기계에서 위 문구를 **재확인**하고 한 줄로 적는다. 값싼 이유는 어디를
    봐야 하는지 이미 알기 때문이고, 그럼에도 값이 있는 이유는 브라우저·서버 조합이 다르면
    문구가 또 달라질 수 있기 때문이다.
  - 0-e) 치환 대상 수를 실측해 적는다 — `grep -o 'chrome\.storage\.local' test/positioning.smoke.js | wc -l`.
    계획 시점 값은 41 이고 Task 2 가 이것을 0 으로 만든다.
  - 0-f) **이동 구간의 줄 범위를 기록한다.** Task 1 의 바이트 동일성 판정이 이 숫자를 쓴다.
    편집 전에 재야 뜻이 있으므로 Task 0 에 둔다.
    ```bash
    FROM=$(grep -n '미리보기 백엔드가 모든 설정을 담는' newtab.js | cut -d: -f1)
    TO=$(awk '/^const storage = createStorageAdapter/{i=NR} i&&NR>=i&&/^\}\);$/{print NR; exit}' newtab.js)
    # 빈 값을 그대로 흘리면 Task 1 의 sed 가 조용히 빈 출력을 내고 diff 가 통과한다.
    # 측정이 실패한 것과 구간이 0줄인 것은 다르고, 후자는 있을 수 없다.
    case "$FROM$TO" in *[!0-9]*|'') echo "구간 측정 실패 (FROM='$FROM' TO='$TO')"; exit 1;; esac
    [ "$TO" -gt "$FROM" ] || { echo "구간이 뒤집혔다"; exit 1; }
    # 줄 번호만으로는 구간 **안쪽**이 바뀐 편집을 놓친다(첫 줄·끝 줄이 그대로면 탐지 실패).
    # 구간 내용의 해시를 함께 적어 Task 1 이 정확히 대조하게 한다 — R4 invariant HIGH.
    REGION_SHA=$(sed -n "${FROM},${TO}p" newtab.js | shasum -a 256 | cut -d' ' -f1)
    printf '%s %s %s\n' "$FROM" "$TO" "$REGION_SHA" > .claude/plans/work-calendar-m2-5.moved-range.txt
    ```
    계획 시점 실측값은 **117 239**(123줄)이다. 구현 시점에 다시 재는 이유는 그 사이 다른
    편집이 줄을 밀 수 있기 때문이고, **Task 1 보다 앞에서** 재야 이동 전 상태를 가리킨다.
    R3 invariant HIGH 가 빈 값 가드 부재를 지목했고 위 두 줄이 그것이다.
    **줄 번호가 낡는 위험은 남는다** — Task 0 과 Task 1 사이에 `newtab.js` 를 편집하면
    범위가 어긋난다. Task 1 의 판정이 추출된 구간의 **첫 줄과 끝 줄 문구**를 함께 대조해
    그 어긋남을 탐지한다(그 자리 참조). 탐지이지 예방은 아니다.
  - 0-a 를 뺀 나머지는 **절차 규칙이고 기계적 강제가 없다.** 이 저장소에는 러너도 CI 도
    커밋 훅도 없다.
- **Mirror**: M2 후반부 플랜 Task 0 의 착수 앵커와 저장소 밖 복구본 절차
- **Validate**: `grep -q 'sha256 text eol=lf' .gitattributes && shasum -a 256 -c .claude/plans/work-calendar-m2-5.baseline.sha256 && grep -qE '^[0-9]+ [0-9]+ [0-9a-f]{64}$' .claude/plans/work-calendar-m2-5.moved-range.txt && bash -c 'read -r F T S < .claude/plans/work-calendar-m2-5.moved-range.txt; [ "$T" -gt "$F" ]'`

  `moved-range.txt` 검사가 여기 있는 이유는 **0-f 를 건너뛴 실행이 Task 0 게이트를 통과하면
  Task 1 이 한참 뒤에 알 수 없는 이유로 죽기 때문**이다. R3 test HIGH 가 지목했다.

### Task 1: 저장소 어댑터를 공유 파일로 이동

- **Action**:
  - `PREVIEW_STORAGE_KEY`, `selectStorageBackend()`, `createStorageAdapter()`,
    `STORAGE_BACKEND`, `storage` 다섯을 `newtab.js` 에서 잘라 `storage-adapter.js` 로 옮긴다.
    **함수 본문은 한 글자도 바꾸지 않는다** (DD6).
  - 파일 끝에서 다섯을 `window.__newTabStorage` 객체로 노출한다 (DD7).
  - `newtab.html` 의 `newtab.js` 스크립트 태그 **앞에** 어댑터 스크립트 태그를 넣는다.
  - `applyStorageNotice()` 가 읽는 `STORAGE_BACKEND` 는 전역 어휘 바인딩이므로 `newtab.js`
    쪽 호출부를 고칠 필요가 없다(DD7 의 실측). **그러나 그것을 믿고 넘어가지 않는다** —
    아래 두 판정이 각각 정적·동적으로 확인한다.
  - 옮긴 구간을 `storage-adapter.js` 안에서 **감시 표식으로 감싼다.** 표식이 추출의 유일한
    경계이므로 문구를 바꾸지 않는다:
    ```js
    // ==== MOVED VERBATIM FROM newtab.js — BEGIN (M2.5 Task 1) ====
    // …다섯 선언…
    // ==== MOVED VERBATIM FROM newtab.js — END ====
    ```
  - **판정 (1) 바이트 동일성 (정적).** 옛 쪽은 Task 0-f 가 기록한 **줄 범위**로, 새 쪽은
    위 **표식**으로 뽑는다. 양쪽 다 결정적이고, 기대 줄 수가 숫자로 있으므로 둘 다 비는
    사고가 통과할 수 없다:
    ```bash
    M25TMP="${TMPDIR:-/tmp}"   # Windows Git Bash 에서 /tmp 매핑이 흔들릴 수 있다
    read -r FROM TO REGION_SHA < .claude/plans/work-calendar-m2-5.moved-range.txt
    EXPECT=$((TO - FROM + 1))
    git show HEAD:newtab.js | sed -n "${FROM},${TO}p" > $M25TMP/m25-before.txt
    # 정확한 staleness 판정 — 첫 줄·끝 줄만 보면 구간 안쪽 편집을 놓친다 (R4 invariant HIGH)
    [ "$(shasum -a 256 < $M25TMP/m25-before.txt | cut -d' ' -f1)" = "$REGION_SHA" ] \
      || { echo "구간 내용이 Task 0-f 이후 바뀌었다 — 0-f 를 다시 재라"; exit 1; }
    awk '/MOVED VERBATIM FROM newtab\.js . BEGIN/{f=1;next} /MOVED VERBATIM FROM newtab\.js . END/{f=0} f' \
      storage-adapter.js > $M25TMP/m25-after.txt
    [ "$(wc -l < $M25TMP/m25-before.txt)" -eq "$EXPECT" ] || { echo "옛 구간 추출이 $EXPECT 줄이 아니다"; exit 1; }
    [ "$(wc -l < $M25TMP/m25-after.txt)"  -eq "$EXPECT" ] || { echo "새 구간 추출이 $EXPECT 줄이 아니다"; exit 1; }
    # 줄 번호가 낡았는지 탐지한다 — 길이만 맞고 다른 구간을 가리킬 수 있다.
    head -1 $M25TMP/m25-before.txt | grep -q '미리보기 백엔드가 모든 설정을 담는' \
      || { echo "구간 시작이 어긋났다 — Task 0-f 를 다시 재라"; exit 1; }
    tail -1 $M25TMP/m25-before.txt | grep -qx '});' \
      || { echo "구간 끝이 어긋났다 — Task 0-f 를 다시 재라"; exit 1; }
    diff -u $M25TMP/m25-before.txt $M25TMP/m25-after.txt
    ```
    **앞선 판에서는 이 자리에 `awk` 범위식을 두었고 그것이 틀렸다.** 종료 패턴
    `/^}$|^;$|^\)/` 이 `const storage` 선언의 끝줄 `});` 에 맞지 않아 범위가 닫히지 않고
    어댑터를 지나 `makeDateKey()` 까지 삼켰다 — 실측 157줄 추출(기대 123줄). R2 test HIGH 가
    지목했고 실행해 확인했다. **패턴으로 코드 경계를 추측하지 않는 형태로 바꾼 이유**가
    그것이다: 한쪽은 편집 전에 잰 숫자, 다른 쪽은 사람이 박은 표식이며 둘 다 추측이 아니다.
  - **판정 (2) 런타임 증인 (동적, `[사람]`).** 로컬 서버에서 `newtab.html` 을 열고 콘솔에서
    `document.body.dataset.storageBackend` 가 `local-preview` 인지 확인한다. 이 값은
    `applyStorageNotice()` 가 `STORAGE_BACKEND` 를 **실제로 읽어야** 세워지므로
    (`newtab.js:1035`), 바인딩이 해석됐다는 관측 가능한 대리다. `node --check` 와 `grep` 은
    이것을 증명할 수 없다 — R1 architect HIGH 가 정확히 지목한 구멍이고 이 항이 그것을 닫는다.
  - 이 Task 는 **단독 커밋**이다. 다른 Task 의 변경을 같은 커밋에 담지 않는다 (DD10).
- **Mirror**: `newtab.js:5841` 의 `window.__newTabApp` 노출 관용구
- **Validate**: `node --check storage-adapter.js && node --check newtab.js && grep -q "storage-adapter.js" newtab.html && awk '/<script[^>]*storage-adapter\.js/{a=NR} /<script[^>]*newtab\.js/{b=NR} END{exit (a && b && a < b) ? 0 : 1}' newtab.html && grep -q "__newTabStorage" storage-adapter.js && grep -q "MOVED VERBATIM FROM newtab.js" storage-adapter.js && bash -c 'M25TMP="${TMPDIR:-/tmp}"; read -r F T S < .claude/plans/work-calendar-m2-5.moved-range.txt; E=$((T-F+1)); git show HEAD:newtab.js | sed -n "$F,${T}p" > $M25TMP/m25-before.txt; [ "$(shasum -a 256 < $M25TMP/m25-before.txt | cut -d" " -f1)" = "$S" ] && awk "/MOVED VERBATIM FROM newtab\.js . BEGIN/{f=1;next} /MOVED VERBATIM FROM newtab\.js . END/{f=0} f" storage-adapter.js > $M25TMP/m25-after.txt; [ "$(wc -l < $M25TMP/m25-before.txt)" -eq "$E" ] && [ "$(wc -l < $M25TMP/m25-after.txt)" -eq "$E" ] && diff -q $M25TMP/m25-before.txt $M25TMP/m25-after.txt'`

### Task 2: 하네스를 어댑터 위로 이식

- **Action**:
  - `test/positioning.smoke.html` 이 어댑터 스크립트를 `positioning.smoke.js` **앞에**
    로드하게 한다.
  - `test/positioning.smoke.js` 상단에 어댑터 핸들을 **이 형태 그대로** 둔다:
    `const harnessStorage = window.__newTabStorage.storage;` — 하네스 문서도
    어댑터 스크립트를 로드하므로 자기 창의 핸들을 쓴다. 그 뒤 `chrome.storage.local` **등장
    41회를 전부** 그 핸들로 치환한다(Task 0-e 의 실측값). 치환은 기계적이며 인자와 반환
    형태를 바꾸지 않는다. **완결성은 잔여 0 으로 판정한다** — 아래 Validate 가 남은 등장이
    하나라도 있으면 실패한다. 하나를 빠뜨려도 어댑터가 로드돼 있어 조용히 도는 것이
    R1 test MEDIUM 이 지목한 구멍이고, 잔여 0 검사가 그것을 닫는다.
  - `loadApp()` 의 iframe src 는 상대 경로 그대로 둔다 — 하네스와 iframe 이 같은 오리진이므로
    `localStorage` 가 공유되고 시드가 iframe 에 보인다.
  - **드리프트 감시 케이스를 하나 더한다**: 이름은 `runAdapterIdentityCases` 로 고정한다
    (Validate 가 이름으로 존재를 본다). 하네스 창과 iframe 창의 어댑터가 같은
    `PREVIEW_STORAGE_KEY` 와 같은 `STORAGE_BACKEND` 를 갖는지 단언한다. **접근자를 못박는다** —
    iframe 쪽은 `frameWindow.__newTabStorage.PREVIEW_STORAGE_KEY` 로 읽는다.
    `frameWindow['PREVIEW_STORAGE_KEY']` 는 **undefined** 이며, `const` 가 window 속성이
    아니라는 것이 바로 `window.__newTabStorage` 를 두는 이유다(DD7 의 실측).
    반대로 `frameWindow['selectStorageBackend']`(`test/positioning.smoke.js:1558`)은
    **고치지 않는다** — 그것은 `function` 선언(`newtab.js:132`)이라 window 속성이 되고,
    바이트 동일 이동은 선언 형태를 바꾸지 않는다. R6 architect 가 이 자리를 HIGH 로
    지목했으나 실측으로 반증했다(같은 realm 에서 `function` 은 true, `const` 는 false).
    **같은 케이스에서
    Task 1 의 런타임 증인도 기계로 내린다** — `frameWindow.document.body.dataset.storageBackend`
    가 비어 있지 않아야 한다. DD6 이 막으려는 사고와 R1 architect HIGH 가 지목한 구멍을
    한 케이스가 함께 잡는다.
  - **오리진을 하드코딩한 단언을 고친다 — 이것을 빼면 하네스가 localhost 에서 절대
    초록이 되지 않는다.** `runStorageBackendCases()` 가
    `assert(actual === 'extension', …)` 로 실제 백엔드를 단언한다
    (`test/positioning.smoke.js:1588`). localhost 에서는 `local-preview` 가 나오므로 이
    케이스는 **반드시** 실패하고, Task 7-a 의 "단언 실패 0건" 이 원리적으로 불가능해진다.
    기대값을 오리진에서 **유도**한다 — 같은 함수로 현재 환경을 풀어 그 결과와 대조한다:
    `select({ chromeRef: typeof chrome !== 'undefined' ? chrome : undefined, localStorageRef: localStorage })`.
    상수와 대조하지 않고 **같은 규칙으로 두 번 계산해 일치를 보는** 형태이므로 두 오리진
    모두에서 참이고, 백엔드가 잘못 골라지는 회귀는 여전히 잡는다.
    **단언 문구를 `backendMatchesOrigin` 으로 고정한다.** 부재 검사(`! grep`)만 두면 이
    단언을 **통째로 지운 구현도 통과한다.** 그러면 백엔드 오선택 회귀를 잡는 케이스가
    사라진 채 Task 7-a 가 초록이 되고, 그것은 이 항이 막으려던 것과 정확히 반대다. 그래서
    Validate 가 부재(옛 상수 비교)와 존재(유도 단언) **둘 다** 요구한다. 이 플랜이
    `baselineOrigin`·`futureVersionRejected`·`legacyEnvelopePromoted`·`brokenExportViaUi`
    에 이미 쓰는 관례이고, 이 자리에만 적용되지 않았다. R7 test HIGH 가 지목했다.
    `select()` 를 가짜 참조로 부르는 나머지 네 단언(1580행 등)은 오리진과 무관하므로
    **건드리지 않는다.**
  - **오리진에 따라 값이 갈리는 스냅샷은 단언이 아니라 베이스라인 차이로 나타난다** —
    `noticeShown`(754·992행)과 `noticeHidden`(1596행)이 그렇다. 미리보기에서는 고지 배너가
    떠 `hidden === false` 다. 이것은 **결함이 아니라 정상 동작**이고, 그래서 DD8 이 오리진이
    다른 베이스라인끼리의 비교를 거부한다. 고치지 않는다.
  - 베이스라인 메타에 오리진을 기록하고, 비교 실행 시 현재 오리진과 다르면 비교를
    **거부**하고 그 이유를 요약에 적는다 (DD8).
  - 이 Task 는 **단독 커밋**이고, 통과 뒤에야 Task 3 이 시작한다. **순서를 기계로 건다** —
    "비교 실행" 단언 실패 0건을 확인한 뒤 `.claude/plans/work-calendar-m2-5.task2.pass` 에
    아래 네 줄을 적고, Task 3~6 의 Validate 가 **그 내용**을 요구한다:
    ```
    origin=<location.origin 그대로>
    plan=<이 플랜 파일의 sha256 — shasum -a 256 로 계산한다>
    assert_failures=0
    at=<ISO 8601>
    ```
    R1·R3 invariant 가 "Task 2 통과가 Task 3 을 막지 못한다" 와 "존재만 보는 마커는
    fail-open 이다" 를 각각 지목했다. **존재 검사에서 내용 검사로 올린 것이 이번 판의
    변경**이고, 그래서 위조 비용이 `touch` 에서 "그 플랜 해시를 알고 네 줄을 꾸며 쓰기" 로
    오른다. **여전히 위조 가능하며 그 이상을 주장하지 않는다** — 진짜 강제는 러너다
    (`id=m2-headless-runner`). 마커가 잡는 것은 정직한 건너뜀이지 부정직한 우회가 아니다.
- **Mirror**: `test/positioning.smoke.js:1612` 의 케이스 작성 형태
- **Validate**: `node --check test/positioning.smoke.js && grep -q "storage-adapter.js" test/positioning.smoke.html && awk '/<script[^>]*storage-adapter\.js/{a=NR} /<script[^>]*positioning\.smoke\.js/{b=NR} END{exit (a && b && a < b) ? 0 : 1}' test/positioning.smoke.html && [ "$(grep -oE 'chrome\.storage\.local\.(get\|set\|remove\|clear)\(' test/positioning.smoke.js | wc -l)" -eq 0 ] && [ "$(grep -c 'runAdapterIdentityCases' test/positioning.smoke.js)" -ge 2 ] && ! grep -q "actual === 'extension'" test/positioning.smoke.js && grep -q 'baselineOrigin' test/positioning.smoke.js && grep -q '오리진이 다른 베이스라인' test/positioning.smoke.js && grep -q 'backendMatchesOrigin' test/positioning.smoke.js && grep -q '^assert_failures=0$' .claude/plans/work-calendar-m2-5.task2.pass && grep -q "^plan=$(shasum -a 256 .claude/plans/work-calendar-m2-5.plan.md | cut -d' ' -f1)$" .claude/plans/work-calendar-m2-5.task2.pass && grep -q '^origin=' .claude/plans/work-calendar-m2-5.task2.pass`

  뒤의 세 검사가 **이번 판에 더해진 것**이고 셋 다 R3 이 지목한 구멍이다:
  하드코딩 단언이 **사라졌는가**(`! grep`) · 베이스라인 메타가 오리진을 담는가
  (`baselineOrigin` 이라는 고정 식별자를 쓴다) · 불일치 시 거부하는 경로가 존재하는가
  (거부 문구를 고정 문자열로 둔다). 앞선 판은 DD8 을 Action 에만 적고 판정에 두지 않아
  **안전장치가 선언만 되고 검증되지 않은 상태**였다.

  잔여 검사는 **호출 형태**를 센다(`.get(`/`.set(`/`.remove(`/`.clear(`). 토큰만 세면
  `chrome.storage.local 이 진짜여야` 같은 **주석 한 줄이 게이트를 영구 실패**시키고, 그러면
  검사를 지우게 된다. 계획 시점 실측: 호출 36회 · 토큰 등장 41회.

### Task 3: 백업 봉투 순수 함수

- **Action**:
  - `newtab.js` 에 슬롯 키 상수, 제외 키 목록, 봉투 스키마 이름, 봉투 버전 상수를 더한다 (DD2).
  - `buildBackupEnvelope(allStored, options)` — 순수 함수. `allStored` 에서 제외 목록을 뺀
    나머지를 `data` 에 담고 DD1 의 봉투를 돌려준다. **저장소를 읽지 않는다** — 호출부가
    읽어서 넘긴다. 하네스가 저장소 없이 직접 부를 수 있어야 하기 때문이다.
  - `parseBackupEnvelope(raw)` — 순수 함수. DD11 의 화이트리스트 파싱. 실패는 던진다.
    거절 사유: 봉투가 아님, `schema` 불일치, `backupVersion` 미지, `data` 가 평범한 객체가
    아님, 금지 키 포함, 총 크기 상한 초과.
  - 두 함수를 하네스가 부를 수 있게 **`window` 에 명시 노출한다** — 최상위 `function` 선언은
    `window` 속성이 되지만(DD7 의 실측에서 `const` 와 갈린 자리), 하네스가 의존하는 접점을
    암묵에 두지 않는다. `window.__newTabBackup = { buildBackupEnvelope, parseBackupEnvelope }`
    로 붙이고 Validate 가 그 이름을 본다. R1 test MEDIUM 이 "노출을 검사하지 않는다"고
    지목한 자리다.
- **Mirror**: `newtab.js:1202` 의 화이트리스트 파싱과 전건 거절
- **Validate**: `grep -q '^assert_failures=0$' .claude/plans/work-calendar-m2-5.task2.pass && grep -q "^plan=$(shasum -a 256 .claude/plans/work-calendar-m2-5.plan.md | cut -d' ' -f1)$" .claude/plans/work-calendar-m2-5.task2.pass && grep -q '^origin=' .claude/plans/work-calendar-m2-5.task2.pass && node --check newtab.js && grep -q "function buildBackupEnvelope" newtab.js && grep -q "function parseBackupEnvelope" newtab.js && grep -q "__newTabBackup" newtab.js`

### Task 4: 복구 커밋과 되돌리기 슬롯

- **Action**:
  - `restoreFromBackup(envelope)` 절차 (DD14):
    1. `storage.get(null)` 로 현재 전량을 읽는다.
    2. 슬롯 payload 를 만든다 — 현재 전량에서 제외 목록을 뺀 것.
    3. **사라져야 할 키를 고른다.** `collectStaleInScopeKeys(currentAll, envelopeData)`
       라는 이름의 순수 함수로 세운다(Validate 가 이름으로 존재를 본다). 현재 전량의 키
       중 **제외 목록에도 없고 봉투에도 없는** 것들이다. 제외 키와 슬롯 키는 이 집합에
       들어가지 않는다 — 들어가면 배경 사진이 지워지고 슬롯이 자기를 지운다.
    4. **한 번의** `storage.set()` 에 봉투의 `data` 와 슬롯을 함께 넣는다 (DD3, DD4).
    5. 3에서 고른 키가 하나라도 있으면 **그 뒤에** `storage.remove(그 키들)` 을 한 번
       부른다. 비어 있으면 부르지 않는다. **순서를 뒤집지 않는다** (DD14).
    6. 성공하면 페이지를 리로드한다.
  - **`clear()` 를 부르지 않는다.** 부르면 백업에 담기지 않은 배경 사진이 영구히 사라지고,
    `local-preview` 에서는 방금 쓴 되돌리기 슬롯까지 함께 날아간다 (DD14).
  - `undoRestore()` 는 슬롯을 읽어 같은 형태로 한 번에 되돌리고 슬롯을 지운다. 슬롯이 없으면
    거절하고 이유를 화면에 적는다.
  - **던지는 자리에 따라 남는 상태가 셋이고, 셋 다 되돌릴 수 있다.** `set()` **앞**에서
    던지면 저장소는 손대지 않은 채 남는다(아무것도 쓰지 않았다). `set()` 이 던지면
    어댑터가 원자적이라 반쪽 쓰기가 없다. `set()` 과 `remove()` **사이**에서 죽으면 남는
    것은 **상위집합**이다 — 봉투가 온전히 적용됐고 오래된 in-scope 키 몇 개가 더 있으며
    되돌리기 슬롯이 이미 들어 있다. 소실이 아니고 되돌릴 수 있다 (DD14).
    앞선 판은 이 세 번째 상태를 적지 않았다. `remove()` 가 없었기 때문이고, 없었다는 것이
    R8 architect HIGH 가 지목한 결함이다.
  - 실패 문구는 상태 문단에 `textContent` 로 적는다.
  - **DD13 의 버전 관문을 `assertRestorableVersion(envelope)` 이라는 이름의 함수로 세운다.**
    봉투의 `settingsVersion` 이 `SETTINGS_VERSION` 보다 크면 던지고, 같거나 작으면 통과시킨다.
    `restoreFromBackup()` 이 저장소를 읽기 **전에** 부른다 — 거절이 어떤 부수효과보다 앞서야
    한다. 이름을 고정하는 이유는 Validate 가 그것으로 존재를 보기 때문이다.
    Task 6 에 케이스 11 을 더한다: 봉투의 `settingsVersion` 을 `SETTINGS_VERSION + 1` 로
    만들어 복구가 **거절되고 저장소가 손대지지 않음**을 단언한다.
  - **`set()` 이 정확히 한 번인 것은 주석이 아니라 케이스가 증명한다** — Task 6 케이스 10 이
    어댑터의 `set` 을 spy 로 감싸 복구 1회당 호출 1회, 되돌리기 1회당 호출 1회를 센다.
    R1 test MEDIUM 이 "성공 경로에서 두 번 부르지 않는지 아무도 안 본다"고 지목한 자리다.
- **Mirror**: `newtab.js:3612` 의 단일 `set()` 원자 커밋 규율
- **Validate**: `grep -q '^assert_failures=0$' .claude/plans/work-calendar-m2-5.task2.pass && grep -q "^plan=$(shasum -a 256 .claude/plans/work-calendar-m2-5.plan.md | cut -d' ' -f1)$" .claude/plans/work-calendar-m2-5.task2.pass && grep -q '^origin=' .claude/plans/work-calendar-m2-5.task2.pass && node --check newtab.js && grep -q "function restoreFromBackup" newtab.js && grep -q "function undoRestore" newtab.js && grep -q "function assertRestorableVersion" newtab.js && grep -q "function collectStaleInScopeKeys" newtab.js && ! grep -qE '\bstorage\.clear\(' newtab.js`

  뒤의 둘이 **이번 판에 더해진 것**이고 DD14 를 판정에 내린다. `collectStaleInScopeKeys`
  가 없으면 복구는 병합으로 끝나고, `storage.clear(` 가 있으면 배경 사진과 슬롯이 함께
  날아간다. 계획 시점 실측: `newtab.js` 의 `storage.clear(` 는 **0건**이므로 이 부재
  검사는 지금 통과하며, 구현이 그것을 도입하는 순간에만 실패한다.

### Task 5: 설정 UI 배선

- **Action**:
  - `newtab.html` 설정 모달의 "달력 데이터" 서브섹션 **아래**에 서브섹션 하나를 더한다:
    제목 "전체 백업", 버튼 `backupExportBtn` 과 `backupImportBtn` 과 `backupUndoBtn`,
    숨김 `backupImportInput`, 설명 문단, 상태 문단 `backupStatus`.
    **진입점은 설정 모달 안에만 둔다** — 지나치는 상태에 표면을 늘리지 않는다.
  - 설명 문단이 DD5 를 말한다: 되돌리기는 실수 취소이고 저장소가 통째로 사라지면 함께
    사라지므로 파일 백업을 대체하지 않는다. 배경 이미지는 담기지 않는다(UI3).
  - `backupUndoBtn` 은 슬롯이 있을 때만 활성화한다.
  - `newtab.css` 는 기존 settings 클래스를 재사용한다. 새 색 토큰을 도입하지 않는다.
  - 파일명은 `newtab-backup-` 뒤에 날짜를 붙인 `.json` 이다.
- **Mirror**: `newtab.html:181` 의 "달력 데이터" 서브섹션 마크업 구조
- **Validate**: `grep -q 'id="backupExportBtn"' newtab.html && grep -q 'id="backupUndoBtn"' newtab.html && grep -q 'id="backupStatus"' newtab.html`

### Task 6: 하네스 케이스

- **Action**: `runBackupRestoreCases(collector)` 를 더하고 `runAll()` 에 등록한다. 케이스 열넷:
  1. **왕복** — 시드에서 봉투를 만들고 파싱한 뒤 복구하면 **저장소의 키 집합이 원래와
     정확히 같고**(추가도 누락도 없다) 각 값이 원래 값과 같다. 단언 문구에
     `restoredKeySetExact` 를 쓴다. 제외 키와 슬롯 키는 비교에서 뺀다 — 각각 UI3 과 DD4
     때문에 남는 것이 정상이다.
     **앞선 판의 문장은 "모든 키가 원래 값과 같다" 였고 두 가지로 읽힌다** — 원래 키의
     값이 보존됐다는 읽기와, 그 밖의 키가 없다는 읽기다. 앞쪽으로 읽으면 나중에 생긴 키가
     남아 있어도 통과하고, 그것이 정확히 DD14 가 닫는 구멍이다. R8 architect 가 MEDIUM 으로
     지목했고 옳다.
  2. **이미지 제외** — 시드에 이미지 두 키를 넣고 봉투에 없음을 단언한다. `excludedKeys` 가
     파일에 적혀 있음도 함께 단언한다 (UI3, DD1).
  3. **읽기 깨진 상태에서 내보내기가 된다** — `calendarEvents` 를 배열 아닌 값으로 시드하고
     봉투에 그 손상값이 **그대로** 담기며 `sourceLoadFailed` 가 참임을 단언한다 (DD9, UI9).
  4. **읽기 깨진 상태에서 복구가 통한다** — 3번 상태에서 정상 봉투로 복구해 잠금이 풀림을
     단언한다.
  5. **되돌리기** — 복구 뒤 슬롯이 존재하고 `undoRestore()` 가 복구 이전 값을 되돌림을
     단언한다.
  6. **슬롯 재귀 없음** — 복구를 두 번 한 뒤에도 슬롯 안에 슬롯이 없음을 단언한다 (DD2).
  7. **원자성** — 파싱이 던지는 입력에서 저장소가 **손대지 않은 채** 남음을 단언한다.
     `runLoadFailureCases` 의 `untouched` 단언과 같은 형태다.
  8. **드리프트 감시** — Task 2 가 더한 `runAdapterIdentityCases` 를 `runAll()` 에서 함께 돌린다.
  9. **미지 키 프로브 (deny-list 의 안전 속성)** — 시드에 코드가 알지 못하는 이름의 키
     (`__futureKeyProbe`)를 넣고 **봉투에 그것이 담기는지** 단언한다. DD2 가 주장하는 것은
     "빠뜨리지 않는다" 이고, 8번까지의 케이스는 **제외**만 검사하므로 숨은 화이트리스트가
     테스트를 통과할 수 있다 — 그 구멍을 이 케이스가 닫는다. R1 test HIGH 가 지목한 자리다.
     **단언 문구를 `futureKeyIncluded` 로 고정한다.** `__futureKeyProbe` 는 **시드 키 이름**
     이므로, 키를 넣기만 하고 아무것도 단언하지 않는 구현도 그 grep 을 통과한다. 표식이
     단언 쪽에 있어야 "담기는지 본다" 가 판정에 남는다 — 케이스 11·12 가 이미 그 형태다
     (`futureVersionRejected`·`legacyEnvelopePromoted`). R7 test HIGH 가 지목했다.
  10. **`set()`·`remove()` 호출 횟수와 순서** — 어댑터의 `set` 을 spy 로 감싸 복구 1회당
      정확히 1회, 되돌리기 1회당 정확히 1회임을 단언한다 (DD3·DD4). **`remove` 도 함께
      센다**(spy 이름 `removeCallSpy`): 복구 1회당 **최대 1회**이고, 불렸다면 반드시
      `set` **뒤**여야 한다. 순서가 뒤집히면 중간 상태가 상위집합이 아니라 소실이 되므로,
      DD14 가 고른 순서는 주석이 아니라 이 단언이 지킨다.
  11. **상위 버전 봉투 거절 (DD13)** — 봉투의 `settingsVersion` 을 `SETTINGS_VERSION + 1`
      로 만들어 `restoreFromBackup()` 이 **거절하고 저장소가 손대지지 않음**을 단언한다.
      단언 문구에 `futureVersionRejected` 를 쓴다(Validate 가 그 이름으로 존재를 본다).
      Task 4 가 이 케이스를 요구하는데 앞선 판의 목록이 10 에서 끝나 **플랜이 자기 자신과
      어긋나 있었다** — R4 test HIGH 가 지목했다.
  12. **하위 버전 봉투 통과 + 승격 (DD13)** — `settingsVersion` 을 3 으로 만든 봉투가
      거절되지 **않고** 복구되며, **복구 뒤 저장소의 `settingsVersion` 이
      `SETTINGS_VERSION` 으로 올라가 있음**을 단언한다(단언 문구에 `legacyEnvelopePromoted`).
      11번만 있으면 관문이 전부 거절하도록 구현돼도 통과하고 정상 백업까지 못 되돌린다.
      **뒤의 단언이 빠지면 절반이다** — "거절되지 않았다" 는 마이그레이션이 돌지 않아
      데이터가 옛 형태로 남은 경우에도 참이고, DD13 이 하위 버전을 허용하는 근거가
      바로 "리로드가 시동 마이그레이션을 태운다" 이기 때문이다. R5 test HIGH 가 지목했다.
  13. **깨진 상태에서 UI 경로로 내보내기 (DD9)** — 3번은 `buildBackupEnvelope()` 를
      **순수 함수로 직접** 부르므로, UI 핸들러가 `canExport()` 를 잘못 걸어도 잡지 못한다.
      이 케이스는 손상된 `calendarEvents` 를 시드한 뒤 **화면의 내보내기 핸들러를 눌러**
      봉투가 실제로 만들어지는지 본다(단언 문구에 `brokenExportViaUi`). DD9 의 주장은
      순수 함수가 아니라 **경로**에 대한 것이므로 경로로 시험해야 한다. R5 test MEDIUM 이
      지목했다.
  14. **백업 시점에 없던 키가 복구로 사라진다 (DD14)** — 시드로 봉투를 만든 **뒤에**
      제외 목록 바깥의 키 하나(`__addedAfterBackup`)를 저장소에 더하고, 그 봉투로
      복구한다. 복구 뒤 그 키가 **없어야** 한다. 단언 문구에 `staleInScopeKeyRemoved`
      를 쓴다. **같은 케이스에서 배경 이미지 두 키와 슬롯 키는 그대로 남아 있음도
      단언한다** — `remove` 가 범위를 넘으면 UI3 의 사진이 사라지기 때문이고, 그것이
      `clear()` 를 쓰지 않는 이유다.
      **케이스 9 와 짝이다.** 9 는 "빠뜨리지 않는다"(deny-list 가 숨은 화이트리스트가
      아님)를 보고 14 는 "남기지 않는다"(복구가 병합이 아님)를 본다. 9 만 있으면
      `set()` 하나로 끝내는 구현이 통과하는데, 그 구현은 "그 파일로 되돌린다" 를 지키지
      않는다. R8 architect 가 HIGH 로 지목했다.
- **`runAll()` 에 실제로 등록됐는지를 판정이 본다.** 케이스를 정의만 하고 부르지 않으면
  전부 죽은 코드이며 하네스는 초록으로 남는다 — R1 test 가 CRITICAL 로 지목한 자리다.
  Validate 가 정의와 호출 **둘 다**를 요구하고, 호출은 `runAll` 블록 안에 있어야 한다.
- **케이스 9·10 은 이름으로 판정된다.** 함수의 존재와 호출만 검사하면 구현이 케이스 1~8 만
  넣고 9·10 을 빼도 게이트가 통과한다 — 그리고 9·10 이야말로 R1 이 지목한 안전 속성 둘
  (deny-list 가 숨은 화이트리스트가 아님 · `set()` 원자성)의 **유일한** 증인이다.
  R2 invariant 가 CRITICAL 로 지목했고 옳다. 그래서 두 케이스가 각각 고정된 표식을 갖는다:
  - 케이스 9 는 시드 키 이름 `__futureKeyProbe` 를 **리터럴로** 쓴다
  - 케이스 10 은 spy 를 `setCallSpy` 라는 이름으로 세운다
  Validate 가 두 리터럴을 요구한다. **이것이 증명하는 것은 "케이스가 거기 있다" 까지이고
  단언의 값이 옳은지는 아니다** — 그 판정은 브라우저 실행(Validation 4)이 내린다.
- **Mirror**: `test/positioning.smoke.js:1612` 의 `runLoadFailureCases()`
- **Validate**: `grep -q '^assert_failures=0$' .claude/plans/work-calendar-m2-5.task2.pass && grep -q "^plan=$(shasum -a 256 .claude/plans/work-calendar-m2-5.plan.md | cut -d' ' -f1)$" .claude/plans/work-calendar-m2-5.task2.pass && grep -q '^origin=' .claude/plans/work-calendar-m2-5.task2.pass && node --check test/positioning.smoke.js && [ "$(grep -c 'runBackupRestoreCases' test/positioning.smoke.js)" -ge 2 ] && grep -q '__futureKeyProbe' test/positioning.smoke.js && grep -q 'futureKeyIncluded' test/positioning.smoke.js && grep -q 'setCallSpy' test/positioning.smoke.js && grep -q 'assertRestorableVersion' test/positioning.smoke.js && grep -q 'futureVersionRejected' test/positioning.smoke.js && grep -q 'legacyEnvelopePromoted' test/positioning.smoke.js && grep -q 'brokenExportViaUi' test/positioning.smoke.js && grep -q 'restoredKeySetExact' test/positioning.smoke.js && grep -q 'removeCallSpy' test/positioning.smoke.js && grep -q 'staleInScopeKeyRemoved' test/positioning.smoke.js && awk '/^async function runAll/{f=1} f&&/runBackupRestoreCases\(/{found=1} f&&/^}/{exit} END{exit found?0:1}' test/positioning.smoke.js`

### Task 7: 종료 앵커와 실제 완주

- **Action**:
  - 7-a) 로컬 서버의 하네스 페이지에서 "베이스라인 캡처" 와 "비교 실행" 을 돌린다.
    **단언 실패 0건**을 확인한다.
  - 7-b) "베이스라인 내보내기" 로 받은 파일을 저장소 루트에
    `work-calendar-m2-5.baseline.json` 으로 둔다. **덮어쓰기를 기계로 막는다** — `mv -n`
    (no-clobber) 을 쓰고, 옮기기 전에 전반부 파일의 존재를 확인해 있으면 저장소 밖으로
    복사한다:
    ```bash
    [ -e work-calendar-m2.baseline.json ] && cp -n work-calendar-m2.baseline.json "$HOME/" || true
    mv -n "$HOME/Downloads/work-calendar-m2.baseline.json" work-calendar-m2-5.baseline.json
    [ -e work-calendar-m2-5.baseline.json ] || { echo "이동 실패 — 목적지가 이미 있거나 원본이 없다"; exit 1; }
    ```
    하네스의 내보내기 버튼이 **하드코딩된 파일명**(`work-calendar-m2.baseline.json`)을 쓰므로
    받는 이름과 두는 이름이 다르다. R1 invariant HIGH 가 "절차뿐이고 강제가 없다"고 지목했고,
    `-n` 이 그 자리를 기계로 닫는다. **남는 한계** — 사람이 이 블록을 통째로 건너뛰는 것은
    막지 못한다(러너 몫, `id=m2-headless-runner`).
  - 7-c) **앵커 둘을 각각 뜬다** (DD12). 추적되는 소스만 담는 이식 가능한 앵커와, 기계
    로컬 산출물만 담는 비이식 앵커를 섞지 않는다:
    ```bash
    shasum -a 256 newtab.js newtab.html newtab.css storage-adapter.js \
      test/positioning.smoke.js test/positioning.smoke.html \
      > .claude/plans/work-calendar-m2-5.rebaseline.sha256
    shasum -a 256 work-calendar-m2-5.baseline.json \
      > .claude/plans/work-calendar-m2-5.artifact.local.sha256
    ```
    두 파일 모두 **LF** 여야 한다 — Task 0-a 의 `.gitattributes` 줄이 그것을 유지한다.
  - 7-d) `.gitignore` 에 `/work-calendar-m2-5.baseline.json` 을 더한다.
    `.artifact.local.sha256` 은 **추적한다** — 그 기계에서 무엇이 나왔는지의 기록이고,
    다른 기계에서 검증이 실패하는 것은 정의이지 결함이 아니다.
  - **확장 오리진에서도 1회 돌린다** — DD8 이 오리진 태그를 넣은 이유가 두 오리진을 다
    지원하기 위함이므로, 확장에서 회귀가 없음을 확인하지 않으면 이식이 절반이다.
    확장을 로드한 Chromium 이 없으면 **돌리지 못했다고 적는다.** 체크박스를 치지 않는다.
- **Mirror**: M2 전반부의 착수와 종료 앵커 쌍 — **다만 그 쌍이 지금 exit 1 인 이유**(DD12)를
  고친 형태로 쓴다
- **Validate**: `grep -q 'sha256 text eol=lf' .gitattributes && shasum -a 256 -c .claude/plans/work-calendar-m2-5.rebaseline.sha256 && grep -q "work-calendar-m2-5.baseline.json" .gitignore && [ -f .claude/plans/work-calendar-m2-5.artifact.local.sha256 ]`

### Task 8: 하루 재현 테스트와 마일스톤 종료 기록

- **Action**:
  - 실제 업무 데이터가 들어 있는 상태에서 사람이 1회 완주한다: 내보내기, 파일 확인(이벤트와
    프로젝트와 북마크와 설정이 있고 배경 이미지가 없다), 저장소를 일부러 손상, 복구,
    화면이 원래대로, 되돌리기로 손상 직전 상태 복귀.
  - "메모장을 연 이유" 목록을 이 마일스톤 몫으로 기록한다 (PRD Success Metrics 셋째 행).
  - PRD 의 M2.5 행을 `complete` 로 바꾸고 **수행하지 못한 것이 있으면 함께 적는다.**
    M2 종료 기록이 그 형식을 갖고 있다.
  - 판정자와 작성자가 같다는 한계를 적는다. M1 과 M2 가 같은 자리에 같은 한계를 적었다.
- **Mirror**: PRD 의 M2 종료 기록 — 수행되지 않은 것을 번호를 매겨 그대로 적는 형식
- **Validate**: `grep -n "^| 2.5 |" .claude/prds/work-calendar.prd.md`

## Validation

승인 시점에 도는 것과 구현 뒤에 도는 것을 갈라 적는다. 갈라 적지 않으면 승인 시점에 돌 수
없는 검사가 통과한 것처럼 보인다.

```bash
# ── 1. 승인 시점 (지금 돈다) ───────────────────────────────────────────────
set -e
cd "$(git rev-parse --show-toplevel)"

# 1-a) 로컬 서버가 세 경로를 서빙하는가 — UI6 의 전제
# 호스트와 포트를 갈라 둔다. 붙여 쓰면 플랜 인용 검사가 `파일:줄번호` 로 오독한다.
PREVIEW_HOST=127.0.0.1
PREVIEW_PORT=5500
PREVIEW_BASE="http://$PREVIEW_HOST:$PREVIEW_PORT/.worktrees/work-calendar"
for u in newtab.html test/positioning.smoke.html newtab.js; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$PREVIEW_BASE/$u")
  [ "$code" = "200" ] || { echo "FAIL: $u -> $code"; exit 1; }
done

# 1-b) 이식의 대상이 실재하는가 — 직접 호출과 어댑터 셋
[ "$(grep -c 'chrome\.storage' test/positioning.smoke.js)" -ge 40 ]
grep -q '^const PREVIEW_STORAGE_KEY' newtab.js
grep -q '^function selectStorageBackend' newtab.js
grep -q '^function createStorageAdapter' newtab.js

# 1-c) 백업이 담아야 할 키가 실재하는가 — deny-list 의 대상
grep -q 'uploadedImages' newtab.js
grep -q 'fixedImage' newtab.js
grep -q 'calendarProjects' newtab.js

# 1-d) 이 플랜이 CREATE 로 선언한 파일이 아직 없는가
[ ! -e storage-adapter.js ]

# 1-e) **전제의 검사 가능한 절반.** 이 플랜은 "하네스가 http 오리진에서 죽는다" 위에 선다.
# 실행 증거는 Task 0-d 가 만들고, 여기서는 코드 증거를 기계로 고정한다.
# R2 invariant MEDIUM 이 "승인 게이트에 전제 검사가 없다" 고 지목했다.
#
# 하네스는 자기 저장소 핸들이 없다 — 그래서 `chrome.storage` 가 없는 오리진에서 직접 호출이
# 그대로 던진다. `chrome` 자체는 http 오리진에서도 정의돼 있다(2026-08-27 실측) — 던지는 것은
# ReferenceError 가 아니라 TypeError 이고 첫 사망 지점은 test/positioning.smoke.js:155 다.
# Task 0-d 가 그 실측을 담는다. (하네스가 `selectStorageBackend` 를 언급하기는 하지만 그것은 프로덕션
# 순수 함수를 `frameWindow` 로 꺼내 **시험하는** 자리이지 자기 백엔드를 고르는 것이 아니다.
# 앞선 판에서 이 둘을 구별하지 않은 검사를 넣었다가 오탐으로 실패했고, 실행해서 알았다.)
grep -q '__newTabStorage' test/positioning.smoke.js && { echo "FAIL: 하네스에 이미 어댑터 핸들이 있다 — 전제가 다르다"; exit 1; }
# newtab.js 는 반대로 그 분기를 갖고 있어야 한다(이식이 기댈 대상)
grep -q "typeof chrome !== 'undefined'" newtab.js

# 1-f) **Task 2 가 반드시 고쳐야 하는 자리가 지금 존재하는가 — 차단 검사다.**
# 하네스가 실제 백엔드를 'extension' 으로 하드코딩해 단언한다. 그대로 두면 localhost 에서
# 이 케이스가 **반드시** 실패해 Task 7-a 의 "단언 실패 0건" 이 원리적으로 불가능해진다.
# 이미 없다면 이 플랜이 **낡은 트리를 보고 쓰였다**는 뜻이므로 통과시키지 않는다.
# (앞선 판은 이것을 NOTE 로 두어 실패하지 않았다 — R3 test MEDIUM 이 "장식" 이라 지목했다.)
grep -q "actual === 'extension'" test/positioning.smoke.js \
  || { echo "FAIL: 하드코딩 단언이 이미 없다 — Task 2 의 대상이 사라졌으니 플랜을 재확인하라"; exit 1; }

# 1-g) `.gitattributes` 에 아직 규칙이 없는가 — Task 0-a 가 할 일이 남아 있음을 확인한다.
# 이미 있다면 그것 역시 플랜이 낡았다는 신호이므로 조용히 넘기지 않는다.
grep -q 'sha256 text eol=lf' .gitattributes \
  && echo "NOTE: .gitattributes 규칙이 이미 있다 — Task 0-a 는 무동작이 된다"

echo "승인 시점 검사 통과"
echo "주의: 1-e 는 **코드 증거**다. 실행 증거는 Task 0-d 만이 만든다."
```

```bash
# ── 2. 구현 뒤 (Task 1~6 완료 시점) ────────────────────────────────────────
set -e
cd "$(git rev-parse --show-toplevel)"

node --check storage-adapter.js
node --check newtab.js
node --check test/positioning.smoke.js

# 어댑터가 newtab.js 에서 빠졌는가
grep -q '^const PREVIEW_STORAGE_KEY' newtab.js && { echo "FAIL: 어댑터가 남아 있다"; exit 1; }
# 하네스에서 직접 호출이 0인가 — 토큰이 아니라 호출 형태를 센다(주석 오탐 방지)
LEFT=$(grep -oE 'chrome\.storage\.local\.(get|set|remove|clear)\(' test/positioning.smoke.js | wc -l)
[ "$LEFT" -eq 0 ] || { echo "FAIL: 직접 호출 $LEFT 건이 남아 있다"; exit 1; }
# 두 문서가 같은 어댑터를 로드하는가 — 그리고 **앱 코드보다 먼저** 로드하는가.
# 존재만 보면 어댑터가 뒤에 놓여도 통과하고, 실패는 런타임에서만 드러난다 (R9 test HIGH x2).
grep -q 'storage-adapter.js' newtab.html
grep -q 'storage-adapter.js' test/positioning.smoke.html
awk '/<script[^>]*storage-adapter\.js/{a=NR} /<script[^>]*newtab\.js/{b=NR} END{exit (a && b && a < b) ? 0 : 1}' newtab.html \
  || { echo "FAIL: newtab.html 에서 어댑터가 newtab.js 보다 먼저 로드되지 않는다"; exit 1; }
awk '/<script[^>]*storage-adapter\.js/{a=NR} /<script[^>]*positioning\.smoke\.js/{b=NR} END{exit (a && b && a < b) ? 0 : 1}' test/positioning.smoke.html \
  || { echo "FAIL: positioning.smoke.html 에서 어댑터가 하네스보다 먼저 로드되지 않는다"; exit 1; }
# Task 2 가 실제로 돌았는가 — Task 3~6 Validate 가 이미 요구하는 마커를 이 게이트도 요구한다.
# 없으면 "Task 2 를 건너뛰고 3~6 만 구현한 뒤 이 블록만 돌린다" 가 열린다 (R9 invariant CRITICAL).
grep -q '^assert_failures=0$' .claude/plans/work-calendar-m2-5.task2.pass \
  || { echo "FAIL: task2.pass 가 없거나 assert_failures=0 이 아니다 — Task 2 가 돌지 않았다"; exit 1; }
grep -q "^plan=$(shasum -a 256 .claude/plans/work-calendar-m2-5.plan.md | cut -d' ' -f1)$" \
     .claude/plans/work-calendar-m2-5.task2.pass \
  || { echo "FAIL: task2.pass 의 plan= 해시가 현재 플랜과 다르다 — Task 2 를 다시 돌려라"; exit 1; }
grep -q '^origin=' .claude/plans/work-calendar-m2-5.task2.pass \
  || { echo "FAIL: task2.pass 에 origin= 이 없다"; exit 1; }
# 케이스가 정의만 되고 죽어 있지 않은가 — runAll() 안에서 실제로 불리는가
for fn in runBackupRestoreCases runAdapterIdentityCases; do
  [ "$(grep -c "$fn" test/positioning.smoke.js)" -ge 2 ] || { echo "FAIL: $fn 정의만 있고 호출이 없다"; exit 1; }
  awk -v f="$fn" '/^async function runAll/{i=1} i&&index($0,f"("){ok=1} i&&/^}/{exit} END{exit ok?0:1}' \
    test/positioning.smoke.js || { echo "FAIL: $fn 이 runAll() 안에서 불리지 않는다"; exit 1; }
done
# 백업 함수가 하네스에 노출됐는가
grep -q '__newTabBackup' newtab.js
# 어댑터가 창 밖으로 노출됐는가
grep -q '__newTabStorage' storage-adapter.js
# 백업 표면이 배선됐는가
for id in backupExportBtn backupImportBtn backupImportInput backupUndoBtn backupStatus; do
  grep -q "id=\"$id\"" newtab.html || { echo "FAIL: $id 없음"; exit 1; }
done
# 슬롯이 자기 자신을 담지 않는가 — 제외 목록에 슬롯 키가 있는가
grep -q 'BACKUP_EXCLUDED_KEYS' newtab.js
grep -q 'BACKUP_UNDO_SLOT_KEY' newtab.js
# 복구가 범위 한정 치환인가 — 사라질 키를 고르는 순수 함수가 있는가 (DD14)
grep -q 'function collectStaleInScopeKeys' newtab.js \
  || { echo "FAIL: 복구가 병합으로 끝난다 — 사라져야 할 키를 고르지 않는다"; exit 1; }
# 복구 경로가 전역 clear() 를 부르지 않는가 — 부르면 배경 사진과 슬롯이 함께 날아간다
grep -nE '\bstorage\.clear\(' newtab.js \
  && { echo "FAIL: newtab.js 에 전역 storage.clear() 가 있다 (DD14)"; exit 1; }
# 새 케이스의 단언 표식 셋 — 이름의 존재만 보는 검사이고 그 이상을 주장하지 않는다
for m in restoredKeySetExact removeCallSpy staleInScopeKeyRemoved; do
  grep -q "$m" test/positioning.smoke.js || { echo "FAIL: $m 없음"; exit 1; }
done

echo "구현 뒤 검사 통과"
```

```bash
# ── 3. 앵커 (Task 0 / Task 7) ──────────────────────────────────────────────
# 이식 가능한 앵커 둘. 추적되는 소스만 담으므로 어느 기계에서든 성립해야 한다.
# 착수 앵커는 **여기서 -c 하지 않는다.** Task 0-b 가 착수 시점 소스 5개의 해시를 박는데
# Task 1~6 이 그 5개를 전부 바꾸므로, 구현 뒤 -c 는 구조적으로 반드시 실패한다
# (R9 invariant HIGH). 그 -c 가 뜻을 갖는 시점은 Task 0 직후뿐이고 Task 0 Validate 가
# 이미 거기서 건다. 여기서 요구하는 것은 앵커가 **남아 있고 형태가 온전한가** 이다.
[ -f .claude/plans/work-calendar-m2-5.baseline.sha256 ] \
  || { echo "FAIL: 착수 앵커가 없다"; exit 1; }
[ "$(wc -l < .claude/plans/work-calendar-m2-5.baseline.sha256)" -eq 5 ] \
  || { echo "FAIL: 착수 앵커가 소스 5개를 담고 있지 않다"; exit 1; }
for f in newtab.js newtab.html newtab.css test/positioning.smoke.js test/positioning.smoke.html; do
  grep -qF "  $f" .claude/plans/work-calendar-m2-5.baseline.sha256 \
    || { echo "FAIL: 착수 앵커에 $f 가 없다"; exit 1; }
done
# 종료 앵커는 구현 뒤 상태를 담으므로 -c 가 성립한다.
shasum -a 256 -c .claude/plans/work-calendar-m2-5.rebaseline.sha256  # 종료

# 줄바꿈이 LF 인가 — CRLF 면 shasum 이 파일명을 "...\r" 로 읽어 영구 실패한다.
# 기존 M2 앵커가 정확히 그 상태이고(실측 exit 1), 이 검사가 재발을 막는다.
#
# 판정을 node 로 하는 이유는 실측이다: 같은 파일에 `grep -c $'\r'` 는 2 를 돌려주는데
# `grep -q $'\r'` 는 비매치로 떨어졌다(2026-08-26, Git Bash). 셸 인용을 거치는 CR 리터럴은
# 전달 경로에 따라 흔들리고, **흔들리는 검사는 조용히 통과하는 검사**다. 바이트를 직접 본다.
for f in .claude/plans/work-calendar-m2-5.baseline.sha256 \
         .claude/plans/work-calendar-m2-5.rebaseline.sha256; do
  node -e 'process.exit(require("fs").readFileSync(process.argv[1]).includes(13)?1:0)' "$f" \
    || { echo "FAIL: $f 에 CR 이 있다 — .gitattributes 의 eol=lf 를 확인하라"; exit 1; }
done

# 기계 로컬 앵커는 **이식 가능하지 않다.** 존재만 요구하고 검증은 그 기계에서만 뜻이 있다.
[ -f .claude/plans/work-calendar-m2-5.artifact.local.sha256 ]
```

**4. 브라우저 (Task 7 · 사람 또는 브라우저 자동화)** — 이것만은 셸이 대신할 수 없다.
로컬 서버의 하네스 페이지에서 "비교 실행" 이 **단언 실패 0건**. 확장 오리진에서 같은 실행이
회귀 0건. **돌지 않았다면 돌지 않았다고 적는다** — M2 가 그 자리를 비워 둔 채 닫혔고 그
결과가 PRD 종료 기록의 (2) 다.

**더는 "수단이 없다" 가 아니다** (2026-08-27). 로컬 서버가 세 경로를 200 으로 서빙하고
(Validation 1-a 실측 통과) 브라우저 자동화가 같은 오리진에 붙는다. 이 플랜의 **승인
시점에** Task 0-d 의 전제와 DD7 의 런타임 증인 둘이 실제로 그렇게 측정됐고, 그중 하나가
플랜의 결함을 하나 잡았다. 남는 한계는 **러너·CI 의 부재이지 브라우저의 부재가 아니다** —
그 둘을 뭉뚱그리면 지금 돌릴 수 있는 판정을 안 돌린 채 마일스톤을 닫게 되고, M2 후반부가
정확히 그렇게 닫혔다(PRD 종료 기록 (2)).

**이 게이트들이 커밋을 막지는 못한다.** 이 저장소에는 러너도 CI 도 커밋 훅도 없다.
1번은 지금 돌고, 2번과 3번은 구현자가 부를 때 돌며, 4번은 사람이나 브라우저 자동화가
부를 때 돈다 — 자동으로 도는 것은 하나도 없다. 앵커가
사는 범위는 Task 0 과 Task 7 사이의 무단 변경뿐이고 그 이상을 주장하지 않는다.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **저장 코어를 데이터 소실 마일스톤에서 건드린다** — 어댑터 이동이 앱 전체의 유일한 저장 진입점을 옮긴다 | Medium | 이동이지 재작성이 아니다(DD6). Task 1 단독 커밋, `node --check`, 함수 본문 무변경 확인, 하네스 전건 초록 뒤에야 Task 3 시작(DD10) |
| **두 오리진의 스냅샷을 섞어 비교해 하네스가 영구 빨간불이 된다** | High | 베이스라인에 오리진을 태그하고 불일치 시 비교를 **거부**한다(DD8). 조용히 비교하지 않는다 |
| **전반부 베이스라인 파일을 덮어 감사 기록이 영구 소실된다** | Medium | 파일명이 다르다. Task 7-b 가 옮기기 전에 파일명을 확인하고, Task 0-b 가 저장소 밖 복구본을 남긴다 |
| **슬롯이 저장소 축출을 함께 당해 되돌리기가 없다** | Medium | 이것은 **완화되지 않는다.** DD5 가 그 사실을 화면 문구로 공개하고 슬롯을 백업이라 부르지 않는다. 진짜 완화는 파일 백업이고 그것이 이 마일스톤의 본체다 |
| **복구가 전체 상태를 덮으므로 잘못된 파일 하나가 모든 것을 지운다** | Medium | 되돌리기 슬롯이 복구와 같은 `set()` 안에 있다(DD4). 파싱이 전건 거절이라 부분 복구가 없다(DD11). `set()` 과 뒤따르는 `remove()` 사이에서 죽어도 남는 것은 슬롯을 포함한 **상위집합**이므로 되돌릴 수 있다(DD14) |
| **복구가 병합으로 끝나 백업 시점에 없던 키가 살아남는다** — "그 파일로 되돌린다" 가 거짓이 된다 | Medium | 원인은 어댑터의 `set()` 이 양쪽 백엔드 모두 병합이라는 것이다(`newtab.js:203-209`). 범위 한정 치환으로 닫고(DD14) 케이스 14 가 증인이다. **전역 `clear()` 로 닫지 않는다** — 그쪽은 배경 사진과 슬롯을 함께 지운다 |
| **이미지 제외가 "복원했는데 화면이 다르다" 로 나타난다** | High | 봉투에 `excludedKeys` 를 적고(DD1) 설정 설명 문단이 미리 말한다(Task 5). 사진은 재생 가능하므로 소실이 아니다 |
| **하네스 이식이 확장 오리진 동작을 깬다** | Medium | `selectStorageBackend()` 가 확장에서 통과 어댑터를 돌려주므로 형태가 그대로다. Task 7 이 확장 오리진에서도 1회 돌리게 하고, 못 돌리면 그 사실을 적는다 |
| **판정자와 작성자가 같다** | High | 완화되지 않는다. M1 과 M2 가 같은 한계를 적었고 이 플랜도 적는다. L2 리뷰 패널이 유일한 외부 시선이다 |

## Acceptance

- [ ] `[기계]` Validation 1번 전건 exit 0 (승인 시점)
- [ ] `[기계]` Validation 2번 전건 exit 0 (Task 1~6 완료 시점)
- [ ] `[기계]` **이식 가능한** 앵커 둘 `shasum -c` 통과, 그리고 둘 다 CR 이 없다 (DD12)
- [ ] `[기계]` 기계 로컬 앵커 파일이 존재한다. **통과는 요구하지 않는다** — 그 기계 밖에서
      실패하는 것이 정의다 (DD12)
- [ ] `[기계]` `test/positioning.smoke.js` 에 저장소 **직접 호출**이 0건 (토큰이 아니라 호출 형태)
- [ ] `[기계]` 어댑터 파일을 `newtab.html` 과 `test/positioning.smoke.html` 이 모두 로드
- [ ] `[기계]` `runBackupRestoreCases` 와 `runAdapterIdentityCases` 가 `runAll()` **안에서
      실제로 불린다** — 정의만 있고 죽어 있지 않다
- [ ] `[기계]` Task 1 의 이동이 바이트 동일하다 (`diff` 가 비고 추출 줄 수가 0이 아니다)
- [ ] `[기계]` 미지 키 프로브가 봉투에 담긴다 — deny-list 가 숨은 화이트리스트가 아니다
- [ ] `[기계]` 복구 1회당 `set()` 이 정확히 1회, 되돌리기 1회당 정확히 1회이고,
      `remove()` 는 최대 1회이며 불렸다면 `set()` **뒤**다 (DD14, 케이스 10)
- [ ] `[기계]` 복구가 **범위 한정 치환**이다 — `collectStaleInScopeKeys` 가 존재하고
      `newtab.js` 에 전역 `storage.clear(` 가 없다 (DD14)
- [ ] `[기계]` 백업 시점에 없던 in-scope 키가 복구로 **사라지고**, 배경 이미지 두 키와
      되돌리기 슬롯 키는 **남는다** (케이스 14)
- [ ] `[기계]` 왕복 케이스가 값만이 아니라 **키 집합의 일치**를 단언한다 (`restoredKeySetExact`)
- [ ] `[기계]` 1588행 하드코딩 단언이 **사라졌다** — 없으면 localhost 초록이 불가능하다
- [ ] `[기계]` 베이스라인이 `baselineOrigin` 을 담고 불일치 거부 경로가 존재한다 (DD8)
- [ ] `[기계]` `assertRestorableVersion` 이 존재하고, 케이스 11(상위 버전 거절)과
      12(하위 버전 통과)가 **둘 다** 하네스에 있다 (DD13)
- [ ] `[기계]` Task 1 의 이동 구간이 Task 0-f 가 기록한 **내용 해시**와 일치한다 —
      첫 줄·끝 줄만으로는 안쪽 편집을 놓친다
- [ ] `[기계]` `task2.pass` 가 `assert_failures=0` · `plan=sha256:` · `origin=` 을 담는다
      — **존재만이 아니라 내용**. 위조는 여전히 가능하다(공개)
- [ ] `[사람]` Task 1 런타임 증인 — `document.body.dataset.storageBackend` 가 세워진다
- [ ] `[사람]` localhost 하네스 "비교 실행" 단언 실패 **0건** (Task 7-a). 돌지 않았으면 그렇게 적는다
- [ ] `[사람]` 확장 오리진 하네스 회귀 0건 (Task 7). 확장 로드 수단이 없으면 그렇게 적는다
- [ ] `[사람]` 내보내기 파일에 이벤트와 프로젝트와 북마크와 설정이 있고 배경 이미지가 없다 (UI2, UI3)
- [ ] `[사람]` 캘린더 읽기가 깨진 상태에서 내보내기가 되고 복구가 통한다 (UI9, DD9)
- [ ] `[사람]` 복구 뒤 되돌리기 한 번으로 직전 상태로 돌아온다 (UI4)
- [ ] `[사람]` 복구 직전 상태가 파일로 자동 내려받아지지 **않는다** (UI5)
- [ ] `[사람]` 하루 재현 테스트 1회 완주와 "메모장을 연 이유" 목록 (UI8, Task 8)
- [ ] `[문서]` PRD M2.5 행이 `complete` 이고 수행하지 못한 것이 함께 적혀 있다
- [ ] 패턴을 재발명하지 않고 `## Patterns to Mirror` 의 출처를 따랐다
- [ ] 게이트와 경로를 실제로 1회 완주하고 산출물을 확인 (단위 test 통과는 경로 작동과 다르다)

## Review Absorption — L2 패널 R1 (2026-08-26)

`multi-agent` 모드, 리뷰어 넷. 결과 `pass 1 / fail 3`, quorum 3 미달로 **divergent**.
15건 중 CRITICAL 3 · HIGH 4 를 아래처럼 처리했다. 기록은
`.claude/reviews/plan-review-work-calendar.md` 와 `.claude/state/plan-review/l2.json` 에 있다.

| # | 지적 | 판정 | 조치 |
|---|---|---|---|
| architect CRITICAL 1 | 어댑터를 옮기면 `applyStorageNotice()` 의 `STORAGE_BACKEND` 가 ReferenceError 로 죽는다 | **반증** | `node:vm` 으로 한 realm 에 두 스크립트를 올려 실측: 이름으로 읽히고(값 반환), 재선언은 `already been declared`. 전역 어휘 환경을 공유한다. 리뷰어가 "window 속성이 아니다" 를 "보이지 않는다" 로 읽었다. DD7 에 실측 전문 기록 |
| architect CRITICAL 2 | 호출부를 안 고쳐 추상화가 샌다 | **반증** | 1번에 종속. 고칠 호출부가 없다 |
| architect HIGH 3 | `node --check` 와 `grep` 은 런타임 바인딩을 증명 못 한다 | **흡수** | Task 1 에 런타임 증인 추가(`document.body.dataset.storageBackend`), Task 2 의 `runAdapterIdentityCases` 가 그것을 기계로 내린다 |
| test CRITICAL 1 | 케이스를 정의만 하고 `runAll()` 에서 안 부르면 죽은 코드 | **흡수** | Validate 가 정의와 **호출** 둘 다 요구하고, `awk` 로 `runAll()` 블록 안인지 본다 |
| test HIGH 2 | 드리프트 케이스 존재를 검사하지 않는다 | **흡수** | 이름을 `runAdapterIdentityCases` 로 고정하고 Validate 가 본다 |
| test HIGH 3 | "바이트 동일" 을 요구하면서 비교 명령이 없다 | **흡수** | Task 1 에 추출 `diff` 추가. 양쪽이 빈 파일이면 `diff` 도 비므로 **추출 줄 수 0 아님**을 함께 요구 |
| test HIGH 4 | deny-list 의 안전 속성(빠뜨리지 않음)이 테스트되지 않는다 — 제외만 검사한다 | **흡수** | 케이스 9: 미지 키 프로브. 숨은 화이트리스트를 반증한다 |
| test MEDIUM ×3 | 하네스 노출 미검증 · 치환 완결성 미검증 · `set()` 1회 미검증 | **흡수** | `__newTabBackup` 노출 검사 · 잔여 호출 0 검사 · 케이스 10 (spy) |
| invariant CRITICAL 1 | 종료 앵커가 추적되지 않는 기계 로컬 파일을 담아 다른 기계에서 검증 불가 | **흡수 · 실측으로 확인** | 기존 M2 앵커를 실제로 돌려 **exit 1** 확인. 원인이 둘(CRLF · 미추적 대상)이고 DD12 가 둘 다 고친다 — 앵커 분리 + `.gitattributes` |
| invariant HIGH 2 | 덮어쓰기 방지가 절차뿐이고 강제가 없다 | **흡수** | Task 7-b 를 `mv -n` + 사전 복사로 기계화. 블록 자체를 건너뛰는 것은 여전히 못 막는다(공개) |
| invariant HIGH 3 | Task 2 통과가 Task 3 착수를 막지 못한다 | **부분 흡수** | `work-calendar-m2-5.task2.pass` 마커를 Task 3~6 Validate 가 요구한다. **잡는 것은 "통째로 건너뛴 실행" 뿐** — 손으로 만들면 통과한다(공개) |
| invariant MEDIUM 1 | `$HOME` 복구본이 약하다 | **공개된 한계** | 사실이다. 앵커 본체가 이제 추적되는 파일이라 git 이 1차 방어이고 `$HOME` 은 2차임을 Task 0-c 에 적었다 |
| invariant LOW 1 | "42곳" 이 실제와 다르다 | **흡수** | 실측해 정정: 줄 42 · 토큰 등장 41 · 호출 36. 셋을 구별해 쓴다 |

### R2 (2026-08-26) — `pass 2 / fail 2`

architect 와 security 가 pass 로 돌아섰다(R1 의 architect CRITICAL 둘은 실측 반증이 받아들여졌다).
quorum 3 미달로 여전히 **divergent**. blocking 6건.

| # | 지적 | 판정 | 조치 |
|---|---|---|---|
| test HIGH | Task 1 의 `awk` 범위식 종료 패턴이 `});` 에 맞지 않아 추출이 닫히지 않는다 | **흡수 · 실행으로 확인** | 돌려 보니 어댑터를 지나 `makeDateKey()` 까지 삼켰다(157줄, 기대 123). 패턴 추출을 버리고 **옛 쪽은 Task 0-f 가 잰 줄 범위 · 새 쪽은 표식**으로 갈았다. 양쪽 길이를 기대값과 대조하므로 둘 다 비는 사고가 통과할 수 없다 |
| test CRITICAL | `.gitattributes` 에 `*.sha256 text eol=lf` 가 **지금** 없다 | **오독** | 그것을 넣는 것이 Task 0-a 이고 Task 0 Validate 가 검사한다. "플랜이 지시한 것이 아직 안 돼 있다" 는 모든 플랜에 참이다. 다만 걱정의 알맹이는 닫았다 — Validation 3 이 앵커 생성 뒤 CR 을 직접 본다 |
| invariant CRITICAL·HIGH | 케이스 9·10 을 빼도 Task 6 Validate 가 통과한다 — Acceptance 는 그것을 `[기계]` 라 부른다 | **흡수** | 정확한 지적이다. 두 케이스에 고정 표식(`__futureKeyProbe`·`setCallSpy`)을 주고 Validate 가 요구한다. **표식은 존재만 증명하고 단언의 값은 증명하지 않는다** 는 것도 함께 적었다 |
| invariant MEDIUM | 전제("하네스가 localhost 에서 죽는다")가 승인 시점에 검사되지 않는다 | **부분 흡수** | 검사 가능한 절반(코드 증거)을 Validation 1-e 로 내렸다. 실행 증거는 Task 0-d 뿐이고 그 사실을 그대로 적는다 |
| test MEDIUM | 케이스 9 는 구현 전략(deny-list vs 화이트리스트)을 증명하지 못한다 | **부분 수용** | 맞다. 프로브 키를 담지 않는 화이트리스트는 **반증**되지만, 프로브 키를 우연히 포함하는 화이트리스트는 통과한다. 그 좁음을 Task 6 에 적었다 |
| test LOW | 잔여 0 검사가 런타임 바인딩을 보지 않는다 | 수용 · 비차단 | Task 2 의 하네스 실행이 그것을 잡는다 |

**이 라운드가 낸 값 — 리뷰어가 아니라 흡수 과정에서 나온 것이 더 컸다.** 1-e 검사를 실제로
돌려 보다가 하네스가 `test/positioning.smoke.js:1588` 에서 실제 백엔드를 `'extension'` 으로
**하드코딩해 단언**하는 것을 찾았다. 그대로 이식하면 localhost 에서 이 케이스가 반드시 실패해
Task 7-a 의 "단언 실패 0건" 이 **원리적으로 불가능**해진다 — 즉 이 플랜의 목표가 달성 불가가
된다. Task 2 에 그 항을 넣었고, 같은 훑기에서 오리진에 따라 갈리는 스냅샷 셋(754·992·1596행)이
단언이 아니라 베이스라인 차이임을 확인해 **고치지 않을 자리**도 함께 확정했다.

### R3 (2026-08-26) — `pass 2 / fail 2`

architect·security 유지 pass, test·invariant fail. blocking 9건. **이번 라운드의 지적은
거의 전부 "Action 에는 적었는데 판정에는 없다" 의 변주였고, 그 진단이 옳았다.**

| # | 지적 | 판정 | 조치 |
|---|---|---|---|
| test HIGH | 1588행 하드코딩 단언 수정이 Task 2 Validate 에 없다 | **흡수** | `! grep -q "actual === 'extension'"` 를 Validate 에 넣었다 |
| test HIGH | Task 0 Validate 가 `moved-range.txt` 를 검사하지 않아 0-f 를 건너뛰면 Task 1 이 한참 뒤에 죽는다 | **흡수** | 형식과 대소 관계를 Task 0 Validate 에서 본다 |
| invariant CRITICAL | `task2.pass` 가 존재 검사뿐이라 fail-open | **흡수(부분)** | 네 줄 내용 검사로 올렸다(`assert_failures=0`·`plan=sha256:`·`origin=`). 위조 비용이 `touch` 에서 "플랜 해시를 알고 꾸며 쓰기" 로 오른다. **여전히 위조 가능**하고 그 이상을 주장하지 않는다 |
| invariant CRITICAL·HIGH | DD8 오리진 태깅이 판정에 없다 — 안전장치가 선언만 되고 검증되지 않는다 | **흡수** | 식별자를 `baselineOrigin` 과 거부 문구로 고정하고 Task 2 Validate 가 둘 다 요구한다 |
| invariant HIGH | Task 0-f 가 빈 값을 가드하지 않아 `sed` 가 조용히 빈 출력을 낸다 | **흡수** | 숫자 검사와 대소 검사를 0-f 에 넣고, Task 1 이 구간의 **첫 줄·끝 줄 문구**까지 대조해 낡은 줄 번호를 탐지한다 |
| invariant MEDIUM | 봉투의 `settingsVersion` 을 아무도 읽지 않는다 — 상·하위 호환 경로가 없다 | **흡수 · 새 DD** | DD13 신설. 같으면 그대로, **낮으면** 리로드 뒤 기존 시동 마이그레이션이 처리(DD3 의 리로드가 여기서 다시 회수된다), **높으면 거절**. `sanitizeImportedEvents` 가 이미 쓰는 규율이다 |
| invariant HIGH | 승인 게이트가 `.gitattributes` 규칙을 강제하지 않는다 | **부분 흡수** | 그것을 넣는 것이 Task 0-a 이므로 승인 시점 강제는 순환이다. 대신 1-g 가 규칙이 **아직 없음**을 확인하고(플랜이 낡지 않았다는 뜻), Validation 3 이 생성된 앵커의 CR 을 직접 본다 |
| test MEDIUM ×3 | 표식은 어휘적일 뿐 · 1-f 가 비차단 NOTE · 줄 번호 staleness | **흡수** | 1-f 를 차단으로 바꿨다. 나머지 둘의 좁음은 각 자리에 명시했다 — 표식은 "케이스가 있다" 까지만 증명하고 값은 브라우저 실행이 판정한다 |

### R4 (2026-08-26) — `pass 2 / fail 2`

architect·security 두 라운드 연속 pass. test 의 지적이 7 → 5 → **2** 로 줄었고 둘 다
플랜의 내부 모순이었다. invariant 는 **공개된 한계를 인용하는 쪽으로 옮겨갔다.**

| # | 지적 | 판정 | 조치 |
|---|---|---|---|
| test HIGH | Task 4 가 "Task 6 에 케이스 11 을 더한다" 고 적었는데 Task 6 목록이 10 에서 끝난다 | **흡수 · 내 모순** | 케이스 11(상위 버전 거절) 추가. **케이스 12(하위 버전 통과)도 함께** — 거절 경로만 시험하면 전부 거절하는 구현도 통과하고 그러면 정상 백업까지 못 되돌린다 |
| test MEDIUM | Validate 가 함수 이름 존재만 본다 | **흡수** | `futureVersionRejected` 를 단언 문구로 고정하고 Validate 가 요구한다 |
| invariant HIGH | 줄 번호 staleness 탐지가 첫 줄·끝 줄뿐이라 구간 **안쪽** 편집을 놓친다 | **흡수 · 실행으로 확인** | 정확한 지적이다. 구간 내용의 sha256 을 Task 0-f 가 함께 기록하고 Task 1 이 대조한다. 변조본을 만들어 확인했다 — 첫 줄·끝 줄 검사는 통과하고 해시만 잡는다 |
| invariant CRITICAL | `task2.pass` 를 위조할 수 있다 | **공개된 한계 · 재지적(R1·R3·R4)** | 근거로 인용된 것이 **플랜 자신의 공개 문장 셋**이다. R3 에서 존재 검사 → 내용 검사로 이미 올렸고, 그 이상은 러너 없이는 불가능하다. 숨기는 것이 유일한 "수리" 이며 그것은 결함이다 (`id=m2-headless-runner`) |
| invariant CRITICAL·HIGH ×2 | 승인 게이트가 `.gitattributes` 규칙을 강제하지 않는다 | **순환 · 부분 흡수** | 그 규칙을 넣는 것이 **Task 0-a** 다. 승인 시점에 요구하면 플랜은 영원히 승인될 수 없다. 순환하지 않는 가장 이른 지점인 **Task 7 Validate** 로 옮겨 강제했다(앵커가 실제로 만들어지는 자리) |
| invariant HIGH | Validation 3 의 CR 검사가 사후이지 예방이 아니다 | **부분 오독** | 손상은 쓰기가 아니라 **체크아웃**에서 생긴다(`shasum >` 는 LF 를 쓴다). 그러므로 예방은 `.gitattributes` 이고 Validation 3 은 그것이 실패했을 때 잡는 자리다. 순서가 뒤바뀐 진단이지만 결론(둘 다 필요)은 같아 둘 다 유지한다 |
| invariant HIGH | 베이스라인 오리진 태그가 서명이 아니라 문자열이라 사후 수정 가능 | **기각 · 위협 모델 불일치** | 베이스라인은 사용자 본인 기계의 테스트 산출물이고 공격자가 없다. DD8 이 막는 것은 **사고**(오리진이 다른 스냅샷을 섞어 비교)이지 위조가 아니다. 서명을 넣으면 키 관리가 생기고 단일 사용자 로컬 확장에 그럴 근거가 없다 |

### R5 (2026-08-26) — `pass 2 / fail 2`

architect·security 세 라운드 연속 pass. **invariant 의 blocking finding 이 0 이 되었다**
(MEDIUM 2 · LOW 1) — 자기 계약("HIGH/CRITICAL 이 하나라도 있으면 fail")대로면 pass 여야
하는데 `fail` 을 냈다. test 는 지적이 2 → 7 로 늘었고 **그중 넷이 플랜 자신의 공개 문장을
인용해 심각도를 올린 것**이다.

| # | 지적 | 판정 | 조치 |
|---|---|---|---|
| architect LOW | DD6 이 `newtab.js:161` 을 인용하는데 그 주석은 157-158행이다 | **흡수 · 실측 확인** | 옳다. 161행은 다른 항이다. 157 로 정정했다 |
| test HIGH | 케이스 12 가 "거절 안 됨" 만 보면 마이그레이션이 안 돌아도 통과한다 | **흡수** | 정확하다. **복구 뒤 `settingsVersion` 이 승격됐는지**를 함께 단언한다(`legacyEnvelopePromoted`). DD13 이 하위 버전을 허용하는 근거가 "리로드가 시동 마이그레이션을 태운다" 이므로 그것을 보지 않으면 근거가 검증되지 않는다 |
| test MEDIUM | DD9 를 순수 함수로만 시험해 UI 경로를 못 본다 | **흡수** | 케이스 13 추가 — 손상 상태에서 **화면의 내보내기 핸들러**를 눌러 본다. DD9 의 주장이 경로에 대한 것이므로 경로로 시험하는 것이 맞다 |
| test MEDIUM | `/tmp` 고정 경로가 Windows 에서 취약하다 | **흡수** | `${TMPDIR:-/tmp}` 로 바꿨다. 이 세션에서 `/tmp` 는 실제로 동작하지만 비용이 0 이다 |
| invariant MEDIUM | 마커의 `plan=` 이 형식만 검사되고 **현재 플랜 해시와 대조되지 않는다** | **흡수** | 옳다. Task 3~6 이 `hash-plan` 출력과 문자열 일치를 요구하도록 바꿨다. 플랜이 Task 2 이후 바뀌면 마커가 낡은 것으로 드러난다 |
| test CRITICAL ×2 · HIGH · MEDIUM | 표식 grep 은 케이스가 **도는지·옳은지**를 증명하지 못한다 · `task2.pass` 를 위조할 수 있다 | **공개된 한계 · 네 번째 재지적** | 근거로 인용된 것이 전부 플랜 자신의 문장이다(496·497·783·800행). 정적 검사는 정의상 실행을 증명하지 못하고, 그것을 증명하는 유일한 수단이 브라우저 실행(Validation 4)과 러너다. 심각도가 MEDIUM → CRITICAL 로 오른 것 외에 R3·R4 대비 새 내용이 없다 |
| invariant LOW | 승인 시점에 `.gitattributes` 를 강제하지 않는다 | **순환 · R4 와 동일** | 그 규칙을 넣는 것이 Task 0-a 다. Task 7 Validate 로 이미 옮겼다 |

**패널이 수렴을 멈춘 지점.** R2~R5 네 라운드에서 정족수는 2/4 에 고정돼 있고, 매 라운드
**남는 blocking 은 "정적 검사가 실행을 증명하지 못한다" 한 종류로 수렴했다.** 이 저장소에
러너·CI·커밋 훅이 없다는 사실의 직접적 결과이며, 플랜 개정으로 줄지 않는다 — 오히려
정직하게 적을수록 인용거리가 늘어난다(M2 가 같은 패턴을 `id=m2-r9-disclosure-penalty` 로
기록했다). 실질 수리는 헤드리스 러너 하나뿐이고 그것은 이 마일스톤 밖이다.

### R6 (2026-08-26) — `pass 2 / fail 2` · **test 가 pass 로 뒤집혔다**

security·test pass, architect·invariant fail. 정족수는 네 라운드째 2/4 지만 **통과하는
관점이 바뀌었다** — R2~R5 는 architect+security, R6 은 security+test. 어느 한 관점도
고정된 차단 사유를 갖고 있지 않다는 뜻이다.

| # | 지적 | 판정 | 조치 |
|---|---|---|---|
| architect HIGH | 어댑터를 옮기면 `frameWindow['selectStorageBackend']`(1558행)이 undefined 가 된다 | **반증 · 실측** | `selectStorageBackend` 는 **`function` 선언**이다(`newtab.js:132`). 같은 realm 에서 재보니 `function` 은 window 속성이 되고(true) `const` 는 안 된다(false). 바이트 동일 이동은 선언 형태를 바꾸지 않으므로 1558행은 그대로 돈다. **다만 이 구별을 플랜에 안 적어 둔 것은 결함이라** Task 2 에 명시했다 |
| architect MEDIUM ×2 | 새 케이스가 `PREVIEW_STORAGE_KEY`·`STORAGE_BACKEND` 를 어떻게 읽는지, 치환 핸들이 무엇인지 코드로 안 적혀 있다 | **흡수** | 옳다. `frameWindow.__newTabStorage.PREVIEW_STORAGE_KEY` 와 `const harnessStorage = window.__newTabStorage.storage;` 를 형태 그대로 못박았다. 이 둘이 **정말로** `const` 라서 window 속성이 아니고, 그것이 DD7 이 존재하는 이유다 |
| invariant CRITICAL | Validate 가 존재하지 않는 기계 고정 경로의 CLI 를 부른다 | **증거는 틀렸고 결론은 옳다** | 그 경로는 실재하고 동작한다(실행 확인). 리뷰어의 read-only 도구가 저장소 밖을 못 본 것이다. **그러나 저장소 산출물에 사용자명·드라이브·플러그인 버전이 박힌 절대경로를 넣은 것은 실제 결함이다** — 이식 가능한 `shasum -a 256 <플랜>` 으로 갈았고 플러그인 의존을 없앴다 |
| invariant HIGH | `task2.pass` 가 없으면 Task 3~6 이 전부 막힌다 | **의도된 동작** | 리뷰어 자신이 "This is HALT (correct)" 라고 적었다. 그것이 순서를 거는 방식이다 |
| invariant MEDIUM | `.gitattributes` 규칙은 **이미 깨진** M2 앵커를 되살리지 않는다 | **흡수** | 옳다. Task 0-a 가 기존 앵커 둘을 LF 로 정규화하도록 더했다(해시 값은 건드리지 않는다). **두 원인 중 하나만 고친다** — 나머지(추적되지 않는 대상)는 그 앵커의 설계 문제이고 DD12 가 M2.5 에서 갈라 둔 이유다 |
| invariant MEDIUM ×2 | 1-e 가 런타임을 증명하지 못한다 · 승인 시점 이식성 | **공개된 한계** | 플랜이 그 자리에 그대로 적고 있다 |

**남는 것.** 러너·CI·커밋 훅의 부재에서 오는 잔여는 이 플랜으로 줄지 않는다
(`id=m2-headless-runner`). 판정자와 작성자가 같다는 한계도 그대로다. 이번 라운드가 실제로
값을 낸 자리는 **기존 M2 앵커가 지금 깨져 있다는 발견**이다 — 그것은 이 플랜이 복사하려던
결함이었고, 리뷰가 없었으면 세 번째 마일스톤이 같은 방식으로 닫혔을 것이다.

### R7 (2026-08-27) — `pass 3 / fail 1` · **정족수에 처음 도달했다**

architect·security·invariant pass, test fail. R2~R6 네 라운드가 2/4 에 고정돼 있었고
이번이 **처음으로 정족수 3 을 채운 라운드**다. 그럼에도 판정은 **divergent** 였다 —
`decide` 는 통과 수만 세지 않기 때문이다
(`L2 quorum not satisfied: 3 blocking finding(s): test/HIGH, test/HIGH, test/FAIL`).

**입력이 달라진 자리.** localhost 가 열려 계획 시점에 브라우저 실측이 가능해졌고, 그
실측이 플랜의 결함을 하나 잡았다 — Task 0-d 가 기대하던 오류 문구가 틀렸다. invariant 가
R2~R6 내내 fail 이다가 이번에 pass 로 돌아섰고 blocking 도 0 이지만, **그 인과는 확인되지
않았다.** 여기 적는 것은 관측이지 설명이 아니다.

| # | 지적 | 판정 | 조치 |
|---|---|---|---|
| test HIGH | `! grep "actual === 'extension'"` 은 **부재만** 본다 — 단언을 통째로 지운 구현도 통과한다 | **흡수** | 정확하다. 그러면 백엔드 오선택 회귀를 잡는 케이스가 사라진 채 Task 7-a 가 초록이 되어, 이 항이 막으려던 것과 정확히 반대가 된다. 유도 단언에 `backendMatchesOrigin` 표식을 주고 Validate 가 부재와 존재를 **둘 다** 요구한다. 이 플랜이 다른 네 자리에 이미 쓰는 관례이고 이 자리에만 빠져 있었다 |
| test HIGH | 케이스 9 의 `__futureKeyProbe` 는 **시드 키 이름**이라, 키만 넣고 아무것도 단언하지 않는 구현도 통과한다 | **흡수** | 옳다. 표식을 단언 쪽(`futureKeyIncluded`)으로 옮겨 함께 요구한다. 케이스 11·12 는 이미 그 형태였고(`futureVersionRejected`·`legacyEnvelopePromoted`) 9 만 아니었다 |
| test MEDIUM | Task 6 머리글이 "케이스 여덟" 인데 13개를 나열한다 | **흡수 · 내 모순** | R4 가 11·12 를, R5 가 13 을 더하면서 머리글을 안 고쳤다. "열셋" 으로 정정 |
| test MEDIUM | Task 2 Validate 가 `task2.pass` 생성을 확인하지 않는다 — Tasks 3~6 은 그 내용을 요구한다 | **흡수** | 같은 교훈을 R3 에서 Task 0 의 `moved-range.txt` 에는 적용하고 Task 2 에는 적용하지 않았다. 네 줄 검사를 Task 2 Validate 에 더했다. **fail-closed 이므로 위험은 낮다** — 고쳐서 얻는 것은 Task 3 이 아니라 Task 2 에서 죽는 것이다 |
| test LOW | `brokenExportViaUi` 가 Action 에 고정 표식으로 설명되지 않았다 | **반증** | 케이스 13 이 "봉투가 실제로 만들어지는지 본다(단언 문구에 `brokenExportViaUi`)" 라고 적고 있다. 리뷰어가 그 줄을 놓쳤다 |
| test MEDIUM ×2 | `runAdapterIdentityCases` 와 `baselineOrigin` 이 **코드 위치·자료구조까지** 명세되지 않았다 | **기각 · 범위** | 플랜은 판정 가능한 계약(함수 이름·단언 문구·거부 문구)을 고정하고 구현 형태는 구현자에게 남긴다. 이 요구를 받아들이면 모든 Task 가 코드 블록이 되고, 그것은 플랜이 아니라 구현이다 |
| invariant MEDIUM ×2 · LOW ×2 | `task2.pass` 위조 가능 · 승인 시점 전제의 런타임 증거 · 못 도는 게이트를 문서로 대체하는 형태 · `.gitattributes` 규칙 공존 | **비차단 · 공개된 한계** | invariant 는 pass 를 냈고 blocking 0 이다. 앞의 둘은 R1·R3·R4·R5 가 이미 지목했고 플랜이 그 자리에 그대로 적고 있다. 실질 수리는 헤드리스 러너 하나뿐이며 이 마일스톤 밖이다 (`id=m2-headless-runner`) |

**남는 것.** test 의 두 HIGH 는 **둘 다 "판정이 이름의 존재만 보고 단언의 값을 보지 않는다"**
한 종류였고, 둘 다 플랜 자신의 표식 관례를 빠뜨린 자리였다. R5 가 "정적 검사가 실행을
증명하지 못한다" 를 잔여로 지목했던 것과는 다른 종류다 — 이것은 **고칠 수 있는 누락**이었고
고쳤다. 반면 invariant 가 든 넷은 여전히 러너 부재에서 오고 이 플랜으로 줄지 않는다.

### R8 (2026-08-27) — `pass 1 / fail 3` · **정족수에서 되떨어졌다**

security 만 pass, architect·test·invariant fail. blocking 13건
(`L2 quorum not satisfied: 13 blocking finding(s): architect/HIGH, architect/FAIL, test/CRITICAL, test/CRITICAL`).
R7 이 여덟 라운드 만에 처음 정족수 3 을 채웠는데 이번에 1 로 떨어졌다.

**그 역행 자체가 이 라운드에서 가장 정직한 신호다.** 통과하는 관점이 매 라운드 바뀌었다 —
R2~R5 는 architect+security, R6 은 security+test, R7 은 architect+security+invariant,
R8 은 security 뿐이다. 여덟 라운드 동안 **어느 관점도 고정된 차단 사유를 갖지 못했다.**
표본이 흔들린다는 뜻이지 플랜이 라운드마다 그만큼 나빠졌다는 뜻이 아니다. 그러므로 이번에는
통과 수를 세는 대신 **지적 15건을 하나씩 코드로 확인했다.** 아래 판정은 그 실측이다.

**그리고 이번 라운드는 값을 냈다 — 여덟 라운드 만에 처음으로 설계를 바꾼 지적이 나왔다.**
architect 가 "복구가 치환인지 병합인지 플랜이 어디에도 말하지 않는다" 를 지목했고,
열어 보니 **옳았다.** 어댑터의 `set()` 은 양쪽 백엔드 모두 병합이다(`newtab.js:203-209`
의 `readAll()` → 키별 대입 → `writeAll()`, 확장 쪽은 통과 어댑터라 `chrome.storage.local.set`
의 병합 의미). 그러므로 `set(봉투.data)` 한 번으로 끝내던 앞선 판의 Task 4 는
**백업 시점에 없던 키를 살려 둔다** — Summary·UI2·UI9 가 말하는 "그 파일로 되돌린다" 가
거짓이 되는 것이고, DD2 가 deny-list 를 정당화하며 쓴 괄호("복구가 그대로 되돌려 놓는다")
는 하지 않는 일을 근거로 든 문장이었다.

**고치는 방향이 `clear()` 가 아니라는 것까지가 이 지적의 값이다.** `clear()` 를 부르면
(1) 백업에 담기지 않는 배경 사진 두 키가 영구히 사라지고(UI3 — 봉투에 없으니 되살릴 수단이
없다), (2) `local-preview` 에서는 `PREVIEW_STORAGE_KEY` 항목이 통째로 지워져 **방금 만든
되돌리기 슬롯까지 함께 날아간다**(`newtab.js:217-219`) — DD4 가 막으려던 "(b) 복구는 됐는데
슬롯이 없는 상태" 를 `clear()` 가 직접 만든다. 그래서 **범위 한정 치환**으로 갔고 그것이
DD14 다.

| # | 지적 | 판정 | 조치 |
|---|---|---|---|
| architect HIGH | 복구 의미(치환/병합)가 명세되지 않았다. DD2 의 근거는 치환을 가정하는데 `set()` 은 병합이다 | **흡수 · 실측 확인** | 옳다. **DD14 를 신설**했다 — 제외 목록 바깥 키 집합에 대해서만 치환하고, `set()` 뒤에 필요할 때만 `remove()` 를 부르며 순서를 뒤집지 않는다. Task 4 절차에 `collectStaleInScopeKeys()` 를 넣고, 케이스 14 · Risks 한 행 · Acceptance 넷 · Validation 2 검사 둘이 따라 붙었다. DD2 의 틀린 괄호도 고쳤다 |
| architect MEDIUM | 케이스 1 의 "모든 키가 원래 값과 같다" 가 두 가지로 읽힌다 | **흡수** | 옳다. 값 보존으로 읽으면 나중에 생긴 키가 남아 있어도 통과하고, 그것이 정확히 DD14 가 닫는 구멍이다. **키 집합의 일치**로 문장을 고치고 단언 표식 `restoredKeySetExact` 를 고정했다 |
| architect MEDIUM | M3·M4 가 저장소 키를 더할 때 `SETTINGS_VERSION` 을 올려야 하는지 플랜이 말하지 않는다 | **흡수** | 옳다. DD13 이 "그 상황이 실제로 생긴다" 까지만 적고 규칙을 주지 않았다. 관문이 묻는 것이 "옛 코드가 **옳게** 읽는가" 이므로 규칙이 거기서 나온다 — **키를 더하기만 하면 올리지 않고, 기존 키의 해석이 틀리게 되면 올린다.** DD13 에 적었다. 없으면 M3 가 즉흥으로 정하고 그 결정이 이 관문의 뜻을 사후에 바꾼다 |
| invariant HIGH ×2 | Task 0-a 의 `.gitattributes` 규칙 추가에 **실행 명령이 없고**, 실패해도 만든 자리에서 아무도 안 본다 | **흡수** | 옳다. 0-a 만 산문이고 코드 블록은 `tr` 정규화에만 있었다. 멱등 append 와 **직후 확인**을 코드로 넣었다 — 실패하면 앵커를 뜨기 전에 멈춘다. Validate 의 사후 검사만으로는 0-b~0-f 를 다 지난 뒤에야 드러난다 |
| invariant MEDIUM | Task 2 Validate 가 `task2.pass` 생성을 확인하지 않는다 | **반증 · 사실이 틀렸다** | R7 이 이미 흡수했고 **현재 Task 2 Validate 줄 끝에 세 검사가 있다** — `^assert_failures=0$` · `^plan=<sha256>$` · `^origin=`. 리뷰어가 인용한 "Line 450" 이 바로 그 줄이다. 고칠 것이 없다 |
| test HIGH | `runBackupRestoreCases` 가 `test/positioning.smoke.js` 에 존재하지 않는다 | **기각 · 범주 오류** | 그 함수를 **만들라는 것이 이 플랜**이다(Task 6). 아직 없는 코드가 없다는 것은 플랜의 결함이 아니라 플랜이 있는 이유다. 이 논법을 받아들이면 어떤 플랜도 승인될 수 없다 |
| invariant MEDIUM | Task 2 통과 뒤 플랜을 고치면 `task2.pass` 의 `plan=` 해시가 낡는다 | **반증 · 의도된 fail-closed** | 그 대조가 **보호 장치 자체**다. 플랜이 바뀌면 Task 3~6 Validate 가 실패하고 구현자는 Task 2 를 다시 돌린다. 리뷰어가 "보호가 없다" 고 부른 것은 보호가 작동한 결과다 |
| test CRITICAL ×4 · test HIGH · invariant CRITICAL · architect MEDIUM | `task2.pass` 를 위조할 수 있다 · 표식 grep 은 존재만 증명하고 단언의 값을 보지 않는다 · 러너가 없어 Validate 가 "정직한 실행" 과 "꾸며 쓴 파일" 을 구별 못 한다 | **비차단 · 공개된 한계** | 일곱 건이 **한 뿌리**다: 이 저장소에 러너도 CI 도 커밋 훅도 없으므로 정적 검사가 실행을 증명하지 못한다. R1·R2·R3·R4·R5·R6·R7 이 매 라운드 같은 것을 지목했고, 플랜은 그 자리마다 한계를 **그대로 적고 있다**(Task 2 "여전히 위조 가능하며 그 이상을 주장하지 않는다", Task 6 "증명하는 것은 케이스가 거기 있다 까지", Validation "자동으로 도는 것은 하나도 없다"). 실질 수리는 헤드리스 러너 하나뿐이고 그것은 UI1 이 그은 이 마일스톤의 범위 밖이다(백로그 `id=m2-headless-runner`) |

**남는 것.** 위 마지막 행의 일곱 건은 이 플랜으로 줄지 않으며, **줄일 수 있다고 적지도
않는다.** 판정자와 작성자가 같다는 한계도 그대로다. 다만 R7 이 "브라우저의 부재가 아니라
러너의 부재" 라고 갈라 둔 구분은 이번에도 유효하다 — 로컬 서버가 열려 있으므로
Validation 4 는 **지금 돌릴 수 있고**, 이번 라운드의 architect HIGH 는 정확히 그 실측
가능성이 아니라 **코드 읽기**로 잡혔다. 정적 리뷰가 못 하는 일이 있다는 사실이, 정적
리뷰가 하는 일이 없다는 뜻은 아니다.
### R9 (2026-08-27) — `pass 2 / fail 2` · **구현 게이트 흡수분을 처음 본 라운드**

architect·security pass, test·invariant fail. blocking 7건
(`L2 quorum not satisfied: 7 blocking finding(s): test/HIGH, test/HIGH, test/FAIL, invariant/CRITICAL`).

이 라운드가 본 본문은 R8 이 본 것과 **정확히 세 절만 다르다** — implement 게이트가 덧붙인
`## Codex Implementation Review` · `### 구속 계약` · `### Security Reviewer` 다. 그 델타는
실측으로 확인했다: 세 절을 잘라낸 본문의 plan-aware 해시가 R7 이 봉인한
`sha256:622ca4aa…` 를 그대로 재현한다. Tasks · Validation · Acceptance · Design Decisions
는 한 글자도 바뀌지 않았다.

**그런데 이번 지적 넷 중 셋은 그 새 절이 아니라 R1~R8 이 여덟 번 지나간 본문을 겨눴다.**
아홉 라운드째 같은 자리에서 새 지적이 나온다는 것은, R8 이 이미 적은 결론 — 표본이
흔들린다 — 을 한 번 더 확인해 준다. 그러므로 이번에도 통과 수를 세지 않고 **넷을 각각
코드로 대조했고 넷 다 사실이었다.** 아래가 그 실측이다.

| Finding | Severity | 판정 | 근거 |
|---|---|---|---|
| test — Task 1 Validate 가 `newtab.html` 의 스크립트 **순서**를 보지 않는다 | HIGH | **흡수** | 사실이다. Task 1 Action 은 어댑터를 `newtab.js` **앞에** 두라 하는데 Validate 는 `grep -q "storage-adapter.js"` 로 **존재만** 봤다. 뒤에 놓여도 통과하고 실패는 런타임에서만 드러난다. `awk` 순서 검사를 더했다 |
| test — Task 2 Validate 가 `test/positioning.smoke.html` 의 순서를 보지 않는다 | HIGH | **흡수** | 같은 구멍이 하네스 쪽에도 있었다. 같은 `awk` 검사를 더했다 |
| invariant — Validation 2 가 `task2.pass` 를 요구하지 않아 Task 2 를 건너뛰는 경로가 열린다 | CRITICAL | **흡수(심각도는 과대)** | 구멍은 사실이다 — Validation 2 에 `task2.pass` 검사가 **없었다**(실측). 다만 Task 2·3·4·6 Validate 와 Acceptance `[기계]` 항이 이미 그 네 줄을 요구하므로 "3~6 을 구현하고 통과" 는 성립하지 않는다. 그래도 값이 싸고 진술한 구멍을 닫으므로 같은 검사를 Validation 2 에 더했다 |
| invariant — Validation 3 의 `shasum -c baseline.sha256` 은 구현 뒤 **반드시** 실패한다 | HIGH | **흡수 · 진짜 결함** | 옳다. Task 0-b 가 착수 시점 소스 5개의 해시를 박고 Task 1~6 이 그 5개를 전부 바꾼다. 착수 앵커의 `-c` 가 뜻을 갖는 시점은 Task 0 직후뿐이고 **Task 0 Validate 가 이미 거기서 건다**. Validation 3 의 그 줄을 존재·형태 검사로 바꿨다. 종료 앵커 `-c` 는 그대로 둔다 — `rebaseline` 은 구현 뒤 상태를 담으므로 성립한다 |

비차단 MEDIUM 셋(표식 grep 이 단언의 값을 보지 않는다 · `__futureKeyProbe` 가 케이스 밖에
있어도 통과한다 · Task 0 줄 범위가 낡으면 잘못된 구간을 뜬다)은 **네 번째 재지적이고**
뿌리가 하나다 — 이 저장소에 러너가 없어 정적 검사가 실행을 증명하지 못한다. 플랜은 그
자리마다 한계를 그대로 적고 있고(Task 6 "증명하는 것은 케이스가 거기 있다 까지"),
실질 수리는 헤드리스 러너 하나뿐이며 UI1 이 그은 범위 밖이다(백로그 `id=m2-headless-runner`).

흡수한 검사 셋은 **반증 가능함을 확인하고 넣었다** — 합성 입력으로 `awk` 순서 검사가
올바른 순서 exit 0 · 뒤집힌 순서 exit 1 · 태그 누락 exit 1 을 내는 것을 관측했고,
플랜 안 bash 블록 9개가 전부 `bash -n` 을 통과한다(2026-08-27).

### R10 (2026-08-27) — `pass 2 / fail 2` · **새 실질 결함 0건 · 열 라운드의 종료 지점**

architect·security pass, test·invariant fail. blocking 8건
(`L2 quorum not satisfied: 8 blocking finding(s): test/CRITICAL, test/HIGH, test/HIGH, test/FAIL`).
R9 가 흡수한 검사 셋을 얹은 본문(`sha256:fac998ba…`)에 대한 첫 라운드다.

**R9 와 정족수는 같지만 내용은 다르다. R10 은 새 실질 결함을 하나도 내지 못했다.**
R9 는 넷을 냈고 넷 다 사실이어서 넷 다 흡수했다. R10 의 차단 상위 둘은 실측에서 무너진다:

| R10 차단 주장 | 판정 | 근거 |
|---|---|---|
| invariant HIGH — Task 2 Validate 가 `task2.pass` 생성을 검사하지 않는다 | **반증 · 사실이 틀렸다 (재발)** | Task 2 Validate 줄에 `task2.pass` 가 세 번 등장하고 `^assert_failures=0$` · `^plan=<sha256>$` · `^origin=` 셋을 실제로 건다. **R7 이 같은 주장을 이미 반증해 이 문서에 적어 뒀다** — 리뷰어가 같은 오독을 두 번째로 했다 |
| test CRITICAL — `task2.pass` 파일이 존재하지 않는다 | **반증 · 범주 오류** | 없는 것은 맞다. 그러나 그것은 Task 2 가 **구현 중에 만드는 산출물**이고 Task 3~6 이 그 내용을 요구하는 것이 순서를 거는 방식이다(Task 2 절차 참조). 승인 시점에 존재하지 않음을 결함으로 세면 모든 Task 의 산출물이 CRITICAL 이 된다 |
| test HIGH · MEDIUM 넷 · invariant 나머지 | **공개된 한계 · 다섯 번째 재지적** | 표식 grep 이 단언의 값을 보지 않는다 · 함수 존재 검사가 함수의 옳음을 보지 않는다 · `! grep storage.clear(` 가 간접 호출을 놓친다. 뿌리는 하나이고 R1 이후 매 라운드 같은 자리다 — 이 저장소에 러너가 없어 정적 검사가 실행을 증명하지 못한다. 플랜은 그 한계를 그 자리마다 그대로 적고 있고, 실질 수리는 헤드리스 러너 하나뿐이며 UI1 이 그은 범위 밖이다(백로그 `id=m2-headless-runner`) |

**그래서 여기서 반복을 끝낸다.** 열 라운드의 기록이 말하는 것은 두 가지다.
하나 — 패널은 값을 냈다. R8 이 DD14 를 바꿨고 R9 가 못 도는 Validation 3 을 잡았다.
둘 — 그 값이 이번 라운드에 0 이 됐고, 남은 지적은 다섯 번째 재지적이며 그 뿌리는
이 마일스톤이 고칠 수 있는 것이 아니다. 통과할 때까지 돌리는 것은 수렴이 아니라
표본을 다시 뽑는 것이고, R7 이 정족수에 닿았다가 R8 에 되떨어진 것이 그 증거다.

`MCCP_REVIEW_SINGLE_PASS=deferred_to_prd_completion` 으로 봉인한다. 이것이 하는 일과
하지 않는 일을 분명히 적는다:

- verdict 는 **`divergent` 그대로 봉인된다.** `converged` 로 세탁되지 않으므로 대시보드,
  `evidence-audit`, ship 게이트가 전부 비승인으로 읽는다.
- 살아남은 finding 은 `.claude/plans/codex-findings-backlog.md` 에 **기계적으로** 적힌다
  (5.2g2). 기록에 실패하면 봉인도 실패한다 — 이의가 사라지는 경로는 없다.
- 사유 토큰 `deferred_to_prd_completion` 이 receipt 에 그대로 남아, 무엇을 근거로
  진행했는지가 감사에서 되짚힌다.
- 반복이 줄어드는 것은 **라운드**이지 리뷰가 아니다. 패널은 봉인 라운드에서도 돈다.

진짜 해소는 헤드리스 러너다. 그때 이 백로그 항목들이 한꺼번에 닫힌다.


## Design Routing Guide

routing mode: `auto` (구현 단계에서 유효). 계획 단계는 아무것도 호출하지 않는다 —
렌더된 UI 가 아직 없으므로 아래는 구현자가 소비할 체크리스트다.

| Stage | Command |
|---|---|
| discovery | `/impeccable shape` |
| refine | `/impeccable layout` · `/impeccable typeset` |
| simplify | `/impeccable distill` · `/impeccable clarify` |
| evaluate | `/impeccable critique` · `/impeccable audit` |
| harden | `/impeccable harden` |
| polish | `/impeccable polish` |

이 마일스톤의 새 표면은 **설정 모달 안 서브섹션 하나**뿐이고 기존 settings 클래스를 그대로
재사용한다. 시각 수렴 대상이 얇으므로 refine 단계는 문구와 줄바꿈에 집중한다 —
한국어 `keep-all` 과 `overflow-wrap` 규칙이 이미 상속된다.

## Design Critique

- `impeccable-detect --mode plan`: `skill_available=true` · `cli_available=true` ·
  `design_signal=true` · `reason=ok` · `silent_skip=false`
- 해석된 호출 형태: `impeccable` (source=env · 사용자 스킬 v4.0.4 가 같은 이름으로 존재)
- routing mode: `auto`
- **계획 단계에서는 어떤 impeccable 명령도 호출하지 않았다** (stage-aware routing, v1.13.0).
  렌더된 UI 가 아직 없기 때문이며, 설치된 스킬 자신이 같은 결론을 적고 있다 —
  SKILL.md Setup 3항: "Do not load it for planning-only work".
- SKILL first-step Read 수행: `~/.claude/skills/impeccable/SKILL.md`.
  v1.3.0-m2 가 요구하는 `## Output Constraints` 절은 **설치된 v4.0.4 에 존재하지 않는다**
  (실재하는 절은 Setup · How to design · Modes · Commands 넷). 그 앵커를 인용한 척하지 않는다.
- critique 재시도 루프: **돌지 않았다** (rounds 0). 위 두 이유 때문이며, receipt 에는
  `skipped` 로 기록된다. 시각 수렴은 구현 단계의 `## Design Routing Guide` 가 받는다.
- 이 마일스톤의 새 표면은 설정 모달 안 서브섹션 하나이고 기존 settings 클래스를 재사용한다.

## Codex Adversarial Review

<!-- placeholder: will be replaced by Phase 7.3 -->

## Codex Implementation Review

- 호출: `node C:/Users/Administrator/.claude/plugins/cache/mccp/mccp/1.32.6/scripts/lib/codex-invoke.js adversarial-review` (fail-closed Bash wrapper, v0.2.2)
- 라운드 수: 0 — 래퍼가 `classification=disabled` 로 short-circuit 했다
- 합치 결론: Codex 는 `MCCP_CODEX_DISABLED=1` 운영자 정책으로 돌지 않았고, 봉인된 정책이
  라운드 캡을 1 로 고정했다(`pinnedBy=codex-disabled`). 구현 시점 결정 여섯(어댑터 파일
  배치 · `window.__newTabStorage`/`__newTabBackup` 노출 형태 · 봉투 상수 자리 ·
  `collectStaleInScopeKeys`/`assertRestorableVersion` 추상화 · 하네스 spy 배선 ·
  설정 UI 재사용)은 security-reviewer 가 대신 심문했다. 그중 둘을 **구속 계약**으로
  흡수했고, 하나는 실측으로 반증했으며, 하나는 리뷰어가 제시한 메커니즘 자체가
  재현되지 않아 심각도를 정정했다.
- YAGNI Triage:

  | Finding | Severity | Verdict | Why |
  |---|---|---|---|
  | S1 `parseBackupEnvelope` 가 `data` **최상위** 금지 키만 본다 — 중첩 `__proto__` 가 통과한다 | CRITICAL 주장 → **HIGH 로 정정** | ACCEPT_NOW | 리뷰어가 든 메커니즘(어댑터 `set()` 의 `all[key] = items[key]` 가 중첩 proto 로 오염된다)은 **재현되지 않았다** — 그 줄은 최상위 키만 대입한다. 실제 벡터는 **최상위** `__proto__` 이고 그것은 DD11 이 이미 막는다. 중첩은 장래의 재귀 병합에 대한 심층 방어이므로 값싸게 받는다 |
  | S2 총 크기 상한이 `JSON.parse` **뒤**에 걸리면 상한이 무의미하다 | CRITICAL | ACCEPT_NOW | 옳다. 1GB 파일은 상한 검사에 닿기 전에 힙을 먹는다. `sanitizeImportedEvents()` 가 이미 순회 **중** 누적으로 세는 것과 같은 규율이다(`newtab.js:1241`) |
  | S3 `collectStaleInScopeKeys` 가 제외 키를 거르지 않으면 배경 사진이 지워진다 | HIGH | **REJECT · 반증** | 사실이 틀렸다. 플랜 Task 4 절차 3항이 이미 문장으로 못박고 있다 — "제외 키와 슬롯 키는 이 집합에 들어가지 않는다 — 들어가면 배경 사진이 지워지고 슬롯이 자기를 지운다". 케이스 14 가 그 증인이다 |
  | S4 `excludedKeys` 가 장래에 사용자 데이터를 담으면 DOM 에 닿는다 | HIGH → **LOW** | REJECT_YAGNI | 리뷰어 자신이 "textContent 이므로 XSS 로부터 안전" 이라 결론냈다. `excludedKeys` 는 하드코딩 상수 셋이고 사용자 문자열이 들어갈 경로가 없다. 가정된 미래 변경을 지금 방어하지 않는다 |
  | S5 "평범한 객체" 판정이 느슨하면 이상한 프로토타입이 통과한다 | MEDIUM | ACCEPT_NOW | 값싸다. `Object.getPrototypeOf(x) === Object.prototype \|\| null` 로 좁힌다 |
  | S6 `window.__newTabStorage` 노출이 창 간 접근 표면을 넓힌다 | MEDIUM | **공개된 한계** | 넓히지 않는다 — `window.__newTabApp = app`(`newtab.js:5841`)이 이미 매니저 전체를 노출하고 있고 어댑터는 그 앱이 쓰는 것의 부분집합이다. DD7 이 이 노출의 이유를 적고 있다 |
  | S7 `JSON.parse` 오류 문구가 파일 구조를 드러낸다 | LOW | REJECT_YAGNI | 리뷰어 자신이 "보안 문제가 아니라 UX" 라고 적었다 |

- Deferred to backlog: 0
- Open Questions: **없음.** auto-CRITICAL 로 올라온 S1·S2 는 아래 구속 계약으로 ACCEPT_NOW
  흡수했고, 각각 기계 판정(하네스 케이스 15·16)이 붙는다. 미해결로 남는 auto-CRITICAL 이
  없으므로 Phase 3 에 진입한다.
- Codex session 참조: 없음 (`codex_disabled=true`)

> Codex skipped per MCCP_CODEX_DISABLED=1

### 구속 계약 (S1·S2·S5 흡수 — 구현이 이 형태를 지킨다)

플랜 본문(DD11 · Task 3)은 고치지 않는다. 흡수 자리는 **산출된 코드**이고, 아래가 그
코드가 지켜야 하는 계약이다. 셋 다 `parseBackupEnvelope()` 안에 있다.

1. **크기 상한은 `JSON.parse` 앞에서 원문 길이로 건다** (S2). 파싱 뒤 객체를 재순회해
   재는 형태를 쓰지 않는다. 상한을 넘으면 파싱하지 않고 던진다.
2. **금지 키 검사는 재귀다** (S1). `__proto__` · `constructor` · `prototype` 은 `data`
   최상위뿐 아니라 **어느 깊이의 객체 키로도** 나타나면 봉투 전체를 거절한다. 실제
   오염 벡터는 최상위이고 그것은 DD11 이 이미 막지만, 재귀 검사는 장래에 누가 재귀
   병합을 넣었을 때를 위한 심층 방어다. 순회 깊이에도 상한을 둔다 — 깊이 자체가
   스택 소진 벡터다.
3. **"평범한 객체" 는 프로토타입으로 판정한다** (S5).
   `Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null`
   이며, 느슨한 `typeof === 'object'` 판정을 쓰지 않는다.

Task 6 의 케이스 목록에 **둘을 더한다**(15·16). 플랜의 Task 6 Validate 는 고정 표식
존재 검사이므로 케이스가 늘어도 게이트가 깨지지 않는다:

- 케이스 15 — **중첩 금지 키 거절**: `data` 안쪽 깊은 곳에 `__proto__` 를 넣은 봉투가
  `parseBackupEnvelope()` 에서 거절되고 저장소가 손대지지 않음을 단언한다.
  단언 문구에 `nestedForbiddenKeyRejected` 를 쓴다.
- 케이스 16 — **상한이 파싱보다 앞선다**: 상한을 넘는 원문이 `JSON.parse` 에
  **닿기 전에** 거절됨을 단언한다. 단언 문구에 `sizeCapBeforeParse` 를 쓴다.

### Security Reviewer

`Task(subagent_type: "security-reviewer")` 로 실제 호출됐다(auto-fallback 아님).
지적 일곱 건은 위 triage 표가 전건을 처리했다. 심각도 정정 둘은 **실측 근거가 있다**:

```
A. JSON.parse 가 중첩 __proto__ 를 own property 로 만드는가: true
B. 중첩 대입 뒤 Object.prototype 오염: 없음        <- 리뷰어 주장 메커니즘 재현 실패
C. 최상위 __proto__ 가 own property 인가: true
D. 최상위 대입 뒤 대상 객체의 프로토타입이 바뀌었는가: true   <- 진짜 벡터, DD11 이 이미 막는다
E. Object.prototype 전역 오염: 없음
```

(2026-08-27, `node -e` 로 어댑터 `set()` 의 `all[key] = items[key]` 와 동형인 대입을 재현.)

CRITICAL/HIGH 로 남은 미해결 보안 지적은 없다. S1·S2·S5 는 구속 계약과 케이스 15·16 으로
닫혔고, S3 는 반증됐으며, S4·S6·S7 은 비차단으로 공개했다.
