// @ts-check
'use strict';

/**
 * 파일 위치: /my-newtab-extension/newtab.js
 * 파일명: newtab.js
 * 용도: New Tab 페이지의 동적 기능 구현
 * 기능: 시계, 달력, 검색, 즐겨찾기(고정 기능 포함), 이미지 관리, 설정
 * 책임: UI 상호작용 및 비즈니스 로직 처리 (단일 책임 원칙 준수)
 */

/**
 * 설정 스키마 버전. 마이그레이션 멱등성 마커
 *
 * 두 마이그레이션은 각자의 가드를 쓴다. v2가 이 상수를 그대로 쓰면 v2 실행만으로
 * 버전이 3이 되어 v3 마이그레이션이 영영 건너뛰어진다.
 */
const SETTINGS_VERSION = 4;

/** migrateSettingsToV2 전용 가드 값 */
const SETTINGS_VERSION_V2 = 2;

/**
 * migrateCalendarToV3 전용 가드 값 (DD10)
 *
 * v3의 가드는 원래 `SETTINGS_VERSION`을 읽었다. 상수만 4로 올리면 v3 마이그레이션이
 * **영영 실행되지 않고**, v2 저장소를 가진 브라우저는 승격 없이 v4 코드를 만난다.
 * 위 주석이 v2에서 이미 겪고 기록해 둔 바로 그 함정이다 — 셋을 각각 자기 상수로
 * 가드해 독립적으로 멱등이 되게 한다.
 */
const SETTINGS_VERSION_V3 = 3;

/** 이벤트 제목 최대 길이 */
const MAX_TITLE_LENGTH = 500;

/** 작업 메모 최대 길이 */
const MAX_NOTE_LENGTH = 2000;

/** 이벤트 하나가 덮을 수 있는 최대 일수 (시작일 포함) */
const MAX_RANGE_DAYS = 366;

/** 가져오기 시 허용하는 최대 이벤트 수 */
const MAX_IMPORT_EVENTS = 5000;

/**
 * 가져오기 전체 문자 수 상한
 *
 * 항목별 상한만으로는 총량이 잡히지 않는다. manifest에 `unlimitedStorage`가 있어
 * 쿼터가 막아주지 않고, persistEvents()가 편집 한 번마다 배열 전체를 다시 쓴다.
 * 항목 상한만 믿으면 5000 × 2500자가 통과해 이후 모든 체크 토글이 느려진다.
 */
const MAX_IMPORT_CHARS = 2000000;

/** 항목당 JSON 봉투(키 이름·구분자·id·날짜) 근사 비용 */
const IMPORT_ITEM_OVERHEAD_CHARS = 120;

/** 중요도 열거값. 이 목록 밖의 값은 전부 'normal'로 떨어진다 */
const PRIORITIES = ['low', 'normal', 'high'];

/**
 * 관문 종류 프리셋 (DD12)
 *
 * UI9가 다섯을 최소 기준으로 두되 확정하지 말라고 했다. 확정하지 않는 방법은
 * 편집 UI를 여는 것이 아니라 이 한 줄로 두어 고치기 싸게 만드는 것이다.
 * 이 목록 밖의 값과 `null`은 전부 `null`(이름 없는 관문)로 떨어진다.
 */
const GATE_KINDS = ['dev', 'review', 'stg', 'prod', 'monitor'];

/** 관문 상태 열거값. 이 목록 밖의 값은 전부 'pending'으로 떨어진다 (DD5) */
const GATE_STATUSES = ['pending', 'done', 'dropped'];

/**
 * 관문 액션의 짝 (포커스 복원용)
 *
 * 누르면 그 버튼이 짝으로 바뀐다. 목록을 통째로 다시 그린 뒤 같은 자리를 찾으려면
 * 무엇으로 바뀌는지 알아야 한다. `remove` 는 짝이 없다 — 그 줄 자체가 사라진다.
 */
const GATE_ACTION_PAIRS = { done: 'undone', undone: 'done', drop: 'restore', restore: 'drop' };

/**
 * 이벤트 하나가 가질 수 있는 최대 관문 수
 *
 * 프리셋 다섯에 사용자가 이름 없는 관문을 더할 여지를 둔 값이다. 상한이 필요한
 * 이유는 가져오기가 남의 파일에서 `gates` 배열을 그대로 받기 때문이다(DD28).
 */
const MAX_GATES_PER_EVENT = 12;

/** 프로젝트 컬렉션 상한 */
const MAX_PROJECTS = 50;

/** 프로젝트 이름 최대 길이 */
const MAX_PROJECT_NAME_CHARS = 60;

/** 'YYYY-MM-DD' 날짜 키 형식 */
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 하루 밀리초 */
const MS_PER_DAY = 86400000;

/** 요일 라벨 (일~토) */
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 중요도 라벨 (설명·aria용) */
const PRIORITY_LABELS = { low: '보통 이하', normal: '보통', high: '중요' };

/** 마감 상태 라벨 (aria용 — 색에만 의존하지 않기 위해) */
const DUE_STATE_LABELS = { overdue: '지연', today: '오늘 마감', soon: '내일 마감' };

/**
 * 날짜 셀 하나에 그리는 최대 칩 수. 넘치면 `+N`
 *
 * dot 3개였던 자리에 칩은 2개만 넣는다. 칩은 dot과 달리 가로로 길어
 * 44px 셀에서 3개를 넣으면 날짜 숫자가 밀린다.
 */
const MAX_CHIPS_PER_CELL = 2;

/** 미리보기 백엔드가 모든 설정을 담는 단일 localStorage 키 */
const PREVIEW_STORAGE_KEY = '__newTabPreviewStorage__';

/**
 * 스토리지 백엔드 결정 (순수 함수)
 *
 * 가용성만 본다. 실행 중 오류로 다른 백엔드로 넘어가는 일은 **없다** — 넘어가면
 * 사용자가 적은 것이 기대와 다른 곳에 저장되고 UI는 성공한 척한다 (원칙 4).
 *
 * 인자를 받는 이유는 테스트 때문이다. 스모크 하네스가 가짜 참조를 넣어
 * 세 분기를 전부 확인한다 (makeDateKey·migrateCalendarToV3와 같은 호출 방식).
 *
 * @param {{chromeRef?: any, localStorageRef?: any}} [refs]
 * @returns {'extension'|'local-preview'|'none'}
 */
function selectStorageBackend(refs) {
  const { chromeRef, localStorageRef } = refs || {};

  if (chromeRef && chromeRef.storage && chromeRef.storage.local) return 'extension';

  // 존재 확인만으로는 부족하다. Safari 비공개 모드나 사이트 차단 설정에서는
  // localStorage가 있는데 setItem이 던진다.
  try {
    if (localStorageRef) {
      const probe = `${PREVIEW_STORAGE_KEY}probe`;
      localStorageRef.setItem(probe, '1');
      localStorageRef.removeItem(probe);
      return 'local-preview';
    }
  } catch (error) {
    // 접근 불가 — 아래 'none'으로 떨어진다
  }

  return 'none';
}

/**
 * 선택된 백엔드로 `chrome.storage.local` 모양의 Promise API를 만든다
 *
 * 계약 세 가지:
 * 1. `extension`은 **통과일 뿐**이다. 키 형태를 바꾸지 않는다 — 스모크 하네스가
 *    원시 키를 직접 시드·백업·복원하므로 형태를 바꾸면 조용히 깨진다
 * 2. 손상·접근 불가는 **reject**한다. 빈 객체를 돌려주면 loadEvents()가 그것을
 *    정상으로 받아 데이터 소실이 무증상이 된다
 * 3. 어떤 실패에서도 다른 백엔드로 넘어가지 않는다
 *
 * @param {'extension'|'local-preview'|'none'} backend
 * @param {{chromeRef?: any, localStorageRef?: any}} [refs]
 */
function createStorageAdapter(backend, refs) {
  const { chromeRef, localStorageRef } = refs || {};

  if (backend === 'extension') return chromeRef.storage.local;

  if (backend === 'none') {
    const fail = () =>
      Promise.reject(new Error('사용 가능한 저장소가 없습니다 (확장 저장소·localStorage 모두 접근 불가)'));
    return { get: fail, set: fail, remove: fail, clear: fail };
  }

  /** @returns {Record<string, any>} 손상 시 throw */
  const readAll = () => {
    const raw = localStorageRef.getItem(PREVIEW_STORAGE_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw); // 손상이면 여기서 던진다 — 계약 2
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('미리보기 저장소 형식이 올바르지 않습니다');
    }
    return parsed;
  };

  const writeAll = (next) => localStorageRef.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(next));

  return {
    /** @param {string[]|string|null} [keys] */
    async get(keys) {
      const all = readAll();
      if (keys === null || keys === undefined) return all;
      const list = Array.isArray(keys) ? keys : [keys];
      const picked = {};
      list.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(all, key)) picked[key] = all[key];
      });
      return picked;
    },
    /** @param {Record<string, any>} items */
    async set(items) {
      const all = readAll();
      Object.keys(items).forEach((key) => {
        all[key] = items[key];
      });
      writeAll(all); // QuotaExceededError는 그대로 던진다 — 배너가 받는다
    },
    /** @param {string[]|string} keys */
    async remove(keys) {
      const all = readAll();
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => {
        delete all[key];
      });
      writeAll(all);
    },
    async clear() {
      localStorageRef.removeItem(PREVIEW_STORAGE_KEY);
    },
  };
}

/** 이 실행에서 고른 백엔드. 모듈 로드 시 1회 결정하고 이후 바뀌지 않는다 */
const STORAGE_BACKEND = selectStorageBackend({
  chromeRef: typeof chrome !== 'undefined' ? chrome : undefined,
  localStorageRef: typeof localStorage !== 'undefined' ? localStorage : undefined,
});

/**
 * 앱 전체의 유일한 저장소 진입점
 *
 * `chrome.storage.local`을 직접 부르지 않는다. 확장 오리진이 아닌 곳(로컬 서버
 * 미리보기)에서는 `chrome.storage`가 아예 없어 모든 저장이 TypeError로 실패했다.
 */
const storage = createStorageAdapter(STORAGE_BACKEND, {
  chromeRef: typeof chrome !== 'undefined' ? chrome : undefined,
  localStorageRef: typeof localStorage !== 'undefined' ? localStorage : undefined,
});

/**
 * @typedef {Object} CalendarEvent
 * @property {string} id          - crypto.randomUUID()
 * @property {string} startDate   - 'YYYY-MM-DD' (로컬 기준). makeDateKey()로만 생성
 * @property {string} endDate     - 'YYYY-MM-DD'. 항상 startDate 이상, 최대 MAX_RANGE_DAYS 폭
 * @property {string} date        - DD6 롤백용 잔존 필드. **항상 startDate에서 파생**한다.
 *                                  입력값을 그대로 복사하면 두 번째 진실 원천이 되어
 *                                  범위와 어긋난 날짜에 이벤트가 숨는다
 * @property {string} title       - 사용자 입력. 렌더는 반드시 textContent
 * @property {string} note        - 작업 메모. 렌더는 반드시 textContent
 * @property {'low'|'normal'|'high'} priority
 * @property {boolean} done
 * @property {number} createdAt   - Date.now()
 * @property {number} updatedAt   - Date.now()
 * @property {'local'} source     - M2 Google Calendar 연동 대비 예약 필드
 * @property {CalendarGate[]} gates - v4 관문 집합. **저장되는 진실 원천**이고
 *                                  startDate·endDate·date는 여기서 파생된다(DD4·DD26)
 * @property {string|null} projectId - 소속 프로젝트 참조. null이 무소속이다 (DD7)
 */

/**
 * @typedef {Object} CalendarGate
 * @property {string} id       - crypto.randomUUID()
 * @property {'dev'|'review'|'stg'|'prod'|'monitor'|null} kind
 *   관문 이름. **마이그레이션이 만드는 관문은 항상 `null`이다** (DD2) —
 *   저장된 데이터가 단언하는 것은 날짜 둘이지 관문 이름 둘이 아니다.
 * @property {string} planned  - 계획일 'YYYY-MM-DD'
 * @property {string|null} actual - 실제 완료일. 없으면 null (DD6)
 * @property {'pending'|'done'|'dropped'} status
 *   `dropped`가 범위축소다 (DD5). 계획과 점유에는 남고 마감 판정에서만 빠진다 (DD5a).
 */

/**
 * @typedef {Object} CalendarProject
 * @property {string} id   - crypto.randomUUID()
 * @property {string} name - 사용자 입력. 렌더는 반드시 textContent
 */

/**
 * Date → 'YYYY-MM-DD' (로컬 기준)
 * toISOString()은 UTC로 변환되어 하루가 밀리므로 사용 금지
 * @param {Date} date
 * @returns {string}
 */
function makeDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 'YYYY-MM-DD' → Date (로컬 자정)
 * new Date('2026-08-06')은 UTC 자정으로 파싱되므로 사용 금지
 * @param {string} key
 * @returns {Date}
 */
function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 날짜 키를 형식·실재 양쪽으로 검증해 돌려준다. 실패하면 빈 문자열.
 *
 * DATE_KEY_PATTERN만으로는 '2026-08-32'가 통과한다. parseDateKey가 9월 1일로
 * 조용히 정규화하므로 이후 비교는 전부 통과하는데, 저장되는 문자열은 존재하지
 * 않는 '2026-08-32' 그대로 남는다. 왕복 검증이 그 간극을 막는다.
 * @param {unknown} value
 * @returns {string} 유효한 'YYYY-MM-DD' 또는 ''
 */
function pickDateKey(value) {
  if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return '';
  return makeDateKey(parseDateKey(value)) === value ? value : '';
}

/**
 * 날짜 키를 일 단위로 이동
 * @param {string} key
 * @param {number} deltaDays
 * @returns {string}
 */
function shiftDateKey(key, deltaDays) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + deltaDays);
  return makeDateKey(date);
}

/**
 * 두 날짜 키가 덮는 일수 (양끝 포함). 같은 날이면 1.
 *
 * DST가 있는 지역에서는 하루가 23/25시간이 되는 날이 있어 나눗셈만 쓰면
 * 경계에서 한 칸씩 흔들린다. 자정 기준 Date끼리의 차이를 반올림한다.
 * @param {string} startKey
 * @param {string} endKey
 * @returns {number}
 */
function spanDays(startKey, endKey) {
  const start = parseDateKey(startKey).getTime();
  const end = parseDateKey(endKey).getTime();
  return Math.round((end - start) / MS_PER_DAY) + 1;
}

/**
 * 'YYYY-MM-DD' → '8월 12일' (목록의 기간 표기용)
 * @param {string} key
 * @returns {string}
 */
function formatShortDate(key) {
  const date = parseDateKey(key);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/**
 * CalendarEvent 생성의 **유일한** 경로
 *
 * addEvent / sanitizeImportedEvents / migrateCalendarToV3가 전부 이 함수를 통과한다.
 * 경로마다 리터럴을 따로 쓰면 어떤 경로로 만들어졌는지에 따라 필드가 있거나 없는
 * 두 가지 형태가 같은 배열에 섞인다.
 *
 * 신뢰 불가 입력을 그대로 받아도 안전하다 — 화이트리스트 필드만 **검증된 지역 변수**로
 * 새 객체를 만든다. `{...input}` / `Object.assign({}, input)`으로 바꾸면
 * prototype pollution이 다시 열리므로 금지.
 *
 * @param {any} input - 신뢰 불가 가능. v2 형식(date만 있음)도 받는다
 * @returns {CalendarEvent|null} 유효하지 않으면 null
 */
/**
 * 날짜 키 배열의 중복 제거 + 오름차순 정렬 (DD1)
 *
 * 분기를 쓰지 않고 집합의 중복 제거로 "폭 없으면 관문 하나, 폭 있으면 둘"을
 * 얻는다. 규칙이 두 개로 갈리지 않는 것이 DD1의 요점이다.
 * @param {unknown[]} keys
 * @returns {string[]} 유효한 날짜 키만, 오름차순
 */
function uniqueDates(keys) {
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  keys.forEach((value) => {
    const key = pickDateKey(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  });
  out.sort();
  return out;
}

/**
 * 관문 하나의 생성 게이트 (Task 1)
 *
 * `createCalendarEvent()`와 **같은 형태**로 필드를 하나씩 적은 새 객체를 돌려준다.
 * 전개(`{...input}`)나 `Object.assign`을 쓰지 않는 것이 이 저장소가 prototype
 * pollution을 막는 유일한 방식이다 — `__proto__`·`constructor` 키가 섞여 들어와도
 * 화이트리스트 밖이라 그대로 버려진다.
 * @param {any} input - 신뢰 불가 가능
 * @returns {CalendarGate|null} 유효하지 않으면 null
 */
function createCalendarGate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  // planned는 필수다. 날짜 없는 관문은 계획도 판정도 만들지 못한다.
  const planned = pickDateKey(input.planned);
  if (!planned) return null;

  // 목록 밖의 kind와 null은 전부 '이름 없는 관문'으로 떨어진다 (DD2).
  const kind = GATE_KINDS.indexOf(input.kind) !== -1 ? input.kind : null;
  const status = GATE_STATUSES.indexOf(input.status) !== -1 ? input.status : 'pending';

  return {
    id: typeof input.id === 'string' && input.id ? input.id : crypto.randomUUID(),
    kind,
    planned,
    actual: pickDateKey(input.actual) || null,
    status,
  };
}

/**
 * 프로젝트 하나의 생성 게이트 (DD20)
 *
 * `id` 자동 생성은 **만들 때의 규칙이지 읽을 때의 규칙이 아니다.** 적재 경로는
 * 이 함수에 넘기기 전에 `id`를 먼저 검사한다 — 그러지 않으면 손상된 행이 새 id를
 * 달고 되살아나 봉인이 발화하지 않고, 옛 id를 든 이벤트들이 전건 무소속이 된다.
 * @param {any} input - 신뢰 불가 가능
 * @returns {CalendarProject|null}
 */
function createCalendarProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const name = String(input.name ?? '').slice(0, MAX_PROJECT_NAME_CHARS).trim();
  if (!name) return null;

  return {
    id: typeof input.id === 'string' && input.id ? input.id : crypto.randomUUID(),
    name,
  };
}

/**
 * 관문 배열 조립의 **유일한 구현** (DD36·DD25)
 *
 * `createCalendarEvent()`와 Task 4의 관문 CRUD 셋이 **둘 다 이것을 부른다.**
 * 규칙이 생성 게이트 본문에 묻혀 있으면 CRUD는 그것을 부를 방법이 없어 결국
 * 자기 안에 한 벌 더 쓰게 되고, 그때부터 가져오기와 편집기가 같은 입력에 다른
 * 답을 낸다 — DD25가 금지한 갈라짐이 그것이다.
 *
 * 네 단계이고 **순서가 계약이다**:
 * 1. 각 항목을 `createCalendarGate()`에 통과시키고 `null`을 버린다
 * 2. 살아남은 것 중 **`kind === null`인 것만** `planned`를 키로 처음 것만 남긴다
 * 3. 이름 있는 관문은 손대지 않는다 (같은 날 `dev`와 `review`가 서는 것이 이
 *    마일스톤이 담으려는 업무 모양이다)
 * 4. 상한 위반이면 **전체를 거절한다** (빈 배열). 넘치는 것만 잘라내면 기준점이
 *    움직여 기존 관문이 조용히 사라진다 — 아래 본문 참고
 *
 * 접기가 **생성 게이트 뒤**에 오는 이유는 `planned`가 `makeDateKey()` 왕복 검증을
 * 지난 정규 형태여야 키로 쓸 수 있기 때문이다. 검증 전 값으로 접으면 같은 날짜의
 * 다른 표기가 서로 다른 키가 된다.
 *
 * 빈 배열이면 빈 배열을 돌려주고 **거절 판단은 하지 않는다** — `null`로 내릴지
 * `false`로 내릴지는 부르는 쪽이 정한다.
 * @param {unknown} inputGates
 * @returns {CalendarGate[]}
 */
function normalizeGates(inputGates) {
  if (!Array.isArray(inputGates)) return [];

  /** @type {CalendarGate[]} */
  const created = [];
  inputGates.forEach((item) => {
    const gate = createCalendarGate(item);
    if (gate) created.push(gate);
  });
  if (created.length === 0) return [];

  // 이름 없는 관문만 날짜로 접는다. 원래 순서를 보존한다.
  /** @type {Set<string>} */
  const seenAnonymous = new Set();
  /** @type {CalendarGate[]} */
  const folded = [];
  created.forEach((gate) => {
    if (gate.kind !== null) {
      folded.push(gate);
      return;
    }
    if (seenAnonymous.has(gate.planned)) return;
    seenAnonymous.add(gate.planned);
    folded.push(gate);
  });

  // 범위 상한과 개수 상한. **위반을 조용히 잘라내지 않고 빈 배열로 거절한다.**
  //
  // 예전에는 `filter`와 `slice`로 넘치는 것만 버렸다. 그런데 `earliest`는 입력에서
  // 나오므로 기존 관문보다 366일 이른 관문이 하나 들어오면 **그것이 새 기준점이 되어
  // 기존 관문 전부가 상한 밖으로 밀려 사라졌다.** addGate()는 남은 길이가 0이 아니라는
  // 이유로 그것을 커밋하고 성공을 돌려줬다 — 연도 오타 한 번에 관문 집합이 통째로
  // 날아가고 화면은 아무 말도 하지 않았다. 조용한 재생 불가 데이터 손실이다.
  //
  // 빈 배열은 이 함수의 **거절 신호**다(머리말 참고). 부르는 쪽이 각자 답한다:
  // `createCalendarEvent()`는 `null`로 내려 가져오기 배치 전체를 거절하게 하고,
  // 관문 CRUD 셋은 `false`를 돌려 편집기가 사용자에게 말하게 한다. 어느 쪽도
  // 조용히 지우지 않는다.
  //
  // 개수 상한도 같은 판단으로 옮겼다. `slice`는 **뒤에 붙은 새 관문**을 버리므로
  // 더하기가 성공으로 보고되면서 아무 일도 일어나지 않았다.
  let earliest = folded[0].planned;
  folded.forEach((gate) => {
    if (gate.planned < earliest) earliest = gate.planned;
  });
  const exceedsRange = folded.some((gate) => spanDays(earliest, gate.planned) > MAX_RANGE_DAYS);
  if (exceedsRange || folded.length > MAX_GATES_PER_EVENT) return [];

  return folded;
}

/**
 * 관문 집합에서 파생 범위를 다시 계산해 **같은 객체에 박고 그 객체를 돌려준다**
 *
 * DD26의 유지 지점이다. 관문을 만지고 이것을 부르지 않는 경로가 있으면
 * `startDate`가 관문과 어긋난 채 커밋되고, 그 어긋남은 인덱스가 이벤트를
 * 엉뚱한 날짜에 밀어 넣는 것으로 나타난다.
 *
 * **`dropped` 관문도 포함한다** (DD5a) — 계획은 남는다. 사용자가 그 날에
 * 무언가를 하려 했다는 사실은 지워지지 않는다. 빠지는 것은 마감 판정뿐이다.
 * @param {CalendarEvent} event
 * @returns {CalendarEvent} 같은 객체
 */
function deriveEventRange(event) {
  if (!event || !Array.isArray(event.gates) || event.gates.length === 0) return event;

  let min = event.gates[0].planned;
  let max = event.gates[0].planned;
  event.gates.forEach((gate) => {
    if (gate.planned < min) min = gate.planned;
    if (gate.planned > max) max = gate.planned;
  });

  event.startDate = min;
  event.endDate = max;
  // DD6 잔존 필드. 입력의 date를 복사하지 않고 관문에서 다시 파생한다.
  event.date = min;
  return event;
}

/**
 * 그 날짜에 **살아 있는**(`status !== 'dropped'`) 관문이 하나라도 있는가 (Task 2 규칙 2)
 *
 * DD31이 dropped 관문의 날짜도 점유에 남기므로, 살아 있는 종단 관문이 지연인
 * 이벤트에서는 "안 하기로 한 날"의 셀에도 지연 상태가 붙는다. 사용자는 범위축소를
 * 지연으로 읽고, PRD가 M2에 요구한 "조기·지연·범위축소가 **구분되어** 남는다"가
 * 화면에서 다시 합쳐진다. 칩(`createChips()`)과 셀(`getCellDueState()`)이 **서로 다른
 * 경로로** 마감 상태를 붙이므로 둘 다 이 함수를 탄다 — 한쪽만 고치면 칩에서 지운
 * 지연색이 셀 배경과 `aria-label` 로 그대로 되돌아온다.
 *
 * `dropped` 를 **어떻게** 보이게 할지는 정하지 않는다 — 새 시각 언어는 M3의 몫이고(UI4),
 * 이 마일스톤이 하는 것은 틀린 상태를 붙이지 않는 것까지다.
 * @param {CalendarEvent} event
 * @param {string} dateKey
 * @returns {boolean}
 */
function hasLiveGateOn(event, dateKey) {
  return (event && Array.isArray(event.gates) ? event.gates : []).some(
    (gate) => gate && gate.planned === dateKey && gate.status !== 'dropped'
  );
}

/**
 * 패널 메타에 열거할 관문 날짜 (Task 2 규칙 1)
 *
 * 살아 있는 관문(`status !== 'dropped'`)의 `planned` 를 오름차순으로 중복 없이 돌려준다.
 * **살아 있는 관문이 하나도 없으면(전부 `dropped`) `dropped` 관문의 날짜를 같은 규칙으로
 * 돌려준다** — DD31이 그 날짜의 셀 점유를 남기므로, 패널이 날짜를 비우면 그리드는 차
 * 있는데 패널은 비어 보여 DD32의 불변식이 그 입력에서만 깨진다. 마감이 없다는 사실은
 * `getEventDueState()` 가 `''` 를 돌려주는 것으로 이미 표현되고, 메타는 **어디에 서
 * 있는가**만 말한다.
 * @param {CalendarEvent} event
 * @returns {string[]}
 */
function gateMetaDates(event) {
  const gates = event && Array.isArray(event.gates) ? event.gates : [];
  const pick = (dropped) =>
    Array.from(
      new Set(
        gates
          .filter((gate) => gate && gate.planned && (gate.status === 'dropped') === dropped)
          .map((gate) => gate.planned)
      )
    ).sort();

  const alive = pick(false);
  return alive.length > 0 ? alive : pick(true);
}

function createCalendarEvent(input, options) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const allowLegacyGateSynthesis = Boolean(options && options.allowLegacyGateSynthesis);

  // 레거시 범위 필드. v2의 date · v3의 startDate/endDate이며, v4 항목에도
  // DD4의 잔존 필드로 남아 있다.
  const legacyStart = pickDateKey(input.startDate) || pickDateKey(input.date);
  let legacyEnd = pickDateKey(input.endDate) || legacyStart;
  if (legacyEnd < legacyStart) legacyEnd = legacyStart;
  if (legacyStart && spanDays(legacyStart, legacyEnd) > MAX_RANGE_DAYS) {
    legacyEnd = shiftDateKey(legacyStart, MAX_RANGE_DAYS - 1);
  }

  const done = input.done === true;

  // 관문 집합이 v4의 진실 원천이다. 세 갈래이고 갈래마다 답이 다르다.
  /** @type {CalendarGate[]|null} */
  let gates = null;
  if (Array.isArray(input.gates)) {
    // (1) v4 모양이다. normalizeGates 가 빈 배열을 돌려주면(전부 무효이거나 상한
    //     위반) 그것은 **손상**이고
    //     범위에서 다시 만들지 않는다 — 재구성하면 각 관문의 kind·actual·status가
    //     조용히 사라진 채 양 끝 익명 관문 둘로 덮인다. 되돌릴 수 없다.
    gates = normalizeGates(input.gates);
    if (gates.length === 0) return null;
  } else if (allowLegacyGateSynthesis) {
    // (2) gates가 없고 레거시 범위 필드가 있다. 승격과 **같은 방식**으로 만든다
    //     — uniqueDates([startDate, endDate])이지 종단 관문 하나가 아니다.
    //     하나만 만들면 5일짜리 일정이 하루로 접히고, deriveEventRange가
    //     startDate := min(planned) = endDate로 다시 파생하므로 원래 시작일이
    //     복구 불가능하게 사라진다 (santa R2 B2).
    if (!legacyStart) return null;
    const dates = uniqueDates([legacyStart, legacyEnd]);
    gates = normalizeGates(
      dates.map((planned, index) => ({
        kind: null,
        planned,
        actual: null,
        // 종단 관문만 이벤트의 done을 물려받는다. v3에 완료 시각이 없으므로
        // actual은 전부 null이다 — 없는 값을 만들지 않는다.
        status: index === dates.length - 1 && done ? 'done' : 'pending',
      }))
    );
    if (gates.length === 0) return null;
  } else {
    // (3) 저장소가 이미 v4인데 gates가 없다 = 레거시가 아니라 손상이다.
    return null;
  }

  const title = String(input.title ?? '').slice(0, MAX_TITLE_LENGTH).trim();
  if (!title) return null;

  const createdAt = Number.isFinite(input.createdAt) ? Number(input.createdAt) : Date.now();

  const event = {
    id: typeof input.id === 'string' && input.id ? input.id : crypto.randomUUID(),
    // 아래 셋은 자리만 잡는다. 값은 deriveEventRange()가 관문에서 파생한다.
    startDate: legacyStart || gates[0].planned,
    endDate: legacyEnd || gates[0].planned,
    date: legacyStart || gates[0].planned,
    gates,
    projectId: typeof input.projectId === 'string' && input.projectId ? input.projectId : null,
    title,
    note: String(input.note ?? '').slice(0, MAX_NOTE_LENGTH),
    priority: PRIORITIES.indexOf(input.priority) !== -1 ? input.priority : 'normal',
    done,
    createdAt,
    updatedAt: Number.isFinite(input.updatedAt) ? Number(input.updatedAt) : createdAt,
    source: 'local',
    externalId: typeof input.externalId === 'string' ? input.externalId : null,
  };

  // DD26의 **첫째 호출 자리.** 입력의 옛 필드를 그대로 믿지 않고 관문에서 다시
  // 파생한다 — 복사하면 관문을 편집한 뒤 옛 필드가 어긋나 인덱스가 깨진다.
  return deriveEventRange(event);
}

/**
 * positioning이 소유한 클래스만 제거 (나머지는 전부 보존)
 * 제거: position-* / overlap-offset / collision-compact
 * 보존: clock / calendar-widget / search-container / enable-transition / 그 외
 * @param {HTMLElement} element
 */
function stripPositioningClasses(element) {
  const owned = Array.from(element.classList).filter(
    (name) => name.startsWith('position-') || name === 'overlap-offset' || name === 'collision-compact'
  );
  if (owned.length > 0) {
    element.classList.remove(...owned);
  }
}

/**
 * 설정 스키마 v2 마이그레이션 (멱등, 1회)
 * 레거시 키(clockEnabled/clockPosition/searchWidth)는 읽기만 하고 남겨둔다.
 * 구버전으로 롤백해도 정상 동작하게 하기 위함.
 *
 * 반드시 Application.initialize()의 첫 줄에서 await 해야 한다.
 * 매니저 내부에서 실행하면 다른 매니저가 복사 이전 값을 읽는 경합이 생긴다.
 * @returns {Promise<boolean>} 성공 여부. 실패를 조용히 넘기지 않고 고지에 반영한다
 */
async function migrateSettingsToV2() {
  try {
    const stored = await storage.get([
      'settingsVersion',
      'mainWidgetEnabled',
      'mainWidgetPosition',
      'clockEnabled',
      'clockPosition',
    ]);

    // 자체 가드. SETTINGS_VERSION(3)을 쓰면 이 마이그레이션 하나로 버전이 3이 되어
    // migrateCalendarToV3가 영영 실행되지 않는다.
    if ((stored.settingsVersion ?? 1) >= SETTINGS_VERSION_V2) return true;

    await storage.set({
      mainWidgetEnabled: stored.mainWidgetEnabled ?? stored.clockEnabled !== false,
      mainWidgetPosition: stored.mainWidgetPosition ?? (stored.clockPosition || 'center-center'),
      settingsVersion: SETTINGS_VERSION_V2,
    });
    return true;
  } catch (error) {
    console.error('Failed to migrate settings:', error);
    return false;
  }
}

/**
 * 달력 데이터 스키마 v3 마이그레이션 (멱등, 1회)
 *
 * 하는 일 세 가지:
 * 1. 기존 이벤트를 `startDate = endDate = date`로 승격한다 (DD6). `date`는 지우지 않는다
 * 2. `searchWidthByWidget.calendar`에 남은 M1 시절 340px 캐시를 제거한다.
 *    밴드는 폭이 100%인데 이 값이 남아 있으면 applyInitialOverlap()이 첫 페인트에
 *    340px를 검색창에 그대로 물린다
 * 3. settingsVersion을 3으로 올린다
 *
 * **반드시 매니저를 만들기 전에 await 해야 한다.** SettingsManager가 같은
 * `searchWidthByWidget` 키를 읽고 리사이즈 콜백에서 read-modify-write로 되쓰므로,
 * 순서가 어긋나면 나중에 끝난 쪽이 상대의 쓰기를 조용히 덮는다.
 *
 * 세 키를 **한 번의 set으로** 커밋한다. 두 번으로 나누면 사이에서 죽었을 때
 * 버전만 올라가거나 이벤트만 승격된 반쪽 상태가 남는다.
 * @returns {Promise<boolean>} 성공 여부. 실패를 조용히 넘기지 않고 고지에 반영한다
 */
/**
 * 이 이벤트에 **사용자가 손댄 관문**이 있는가
 *
 * 마이그레이션이 만든 관문은 전부 `kind: null` · `status: 'pending'` · `actual: null`
 * 이다(DD2). 그 상태를 벗어난 관문이 하나라도 있으면 사용자가 관문을 직접 만졌다는
 * 뜻이고, 그때부터 상세 모달의 시작일·종료일은 **파생 표시**가 된다.
 *
 * 이 구분이 필요한 이유: 관문이 있는 이벤트에서 파생 범위는 `min..max`이므로
 * 모달에서 친 날짜를 그대로 저장하면 `deriveEventRange()`가 곧바로 덮어쓴다.
 * 편집 가능한 것처럼 보이는 칸이 조용히 무시되는 것은 "저장된 척"과 같은 종류의
 * 결함이므로, 사용자 관문이 있으면 그 칸을 읽기 전용으로 바꾸고 관문 편집기로
 * 보낸다. 손댄 관문이 없으면(승격 직후) 범위 편집이 관문을 다시 만든다.
 * @param {CalendarEvent} event
 * @returns {boolean}
 */
function eventHasUserGateWork(event) {
  const gates = event.gates || [];

  // **관문 셋 이상은 범위 둘로 재구성될 수 없다.** 이름 없는 pending 관문만 있어도
  // 마찬가지다 — 재합성은 `uniqueDates([startDate, endDate])`이므로 양 끝만 남고
  // 가운데가 사라진다. 아래 `some`만 두었을 때 정확히 그 손실이 났다: 편집기의
  // 종류 기본값이 '이름 없음'이라 사용자가 직접 세운 관문이 전부 이 판정을
  // 통과하지 못했고, 아무것도 고치지 않고 저장만 눌러도 가운데 관문이 지워졌다.
  //
  // 둘까지는 안전하다. `deriveEventRange()`가 startDate := min, endDate := max로
  // 박으므로 관문 둘은 정확히 그 양 끝이고 재합성해도 같은 집합이 나온다. 승격
  // 직후(관문 하나 또는 둘)에 범위 편집이 관문을 다시 만드는 동작은 그대로 산다.
  if (gates.length > 2) return true;

  return gates.some(
    (gate) => gate.kind !== null || gate.status !== 'pending' || gate.actual !== null
  );
}

/**
 * 관문의 계획 대비 실제를 한 줄로 (DD6)
 *
 * 회고·통계 **화면을 만들지 않는다**(UI7). 그 관문을 보고 있는 자리에서만 나온다.
 * @param {CalendarGate} gate
 * @returns {string} actual 이 없으면 빈 문자열
 */
function gateActualLabel(gate) {
  if (!gate.actual) return '';
  if (gate.actual === gate.planned) return `실제 ${gate.actual} · 정시`;
  const early = gate.actual < gate.planned;
  const from = early ? gate.actual : gate.planned;
  const to = early ? gate.planned : gate.actual;
  return `실제 ${gate.actual} · ${early ? '조기' : '지연'} ${spanDays(from, to) - 1}일`;
}

/**
 * 이벤트의 완료 여부를 관문에서 파생한다 (DD5a)
 *
 * **살아 있는 관문 전부가 `done`인가.** `dropped`는 세지 않는다 — 범위를 줄인
 * 작업이 영영 끝나지 않으면 안 되기 때문이다. `every`는 빈 배열에 `true`이므로
 * 관문이 **전부 `dropped`인 경우가 분기 없이 완료로 떨어진다.**
 *
 * 종단 관문 하나만 보는 규칙과는 다르다: 앞선 살아 있는 관문이 `pending`인데
 * 종단만 `done`이면 종단 규칙은 완료, 이 규칙은 미완료다. 후자가 옳다.
 *
 * 이 값이 화면에 닿는 자리는 `createDayCell()`의 `pendingCount`이며, 규칙이
 * 갈리면 범위를 줄인 작업이 셀 안내에서 영영 미완료로 집계된다.
 *
 * **마이그레이션은 이 함수를 부르지 않는다.** 승격은 이벤트의 `done`을 그대로
 * 보존하고 종단 관문에 물려주기만 한다(Task 2) — 여기서 다시 파생하면 완료된
 * 다일 일정이 `[pending, done]`이 되어 `done`이 거짓으로 뒤집히고, 그것은
 * 등가 단언이 금지한 "마이그레이션이 마감 의미를 바꿨다"가 된다. 새 규칙은
 * 사용자가 관문을 실제로 편집한 뒤부터 적용된다.
 * @param {CalendarGate[]} gates
 * @returns {boolean}
 */
function deriveEventDone(gates) {
  const living = (Array.isArray(gates) ? gates : []).filter((gate) => gate.status !== 'dropped');
  return living.every((gate) => gate.status === 'done');
}

/**
 * 끊긴 프로젝트 참조를 무소속으로 되돌린다 (DD28) — **새 배열을 돌려준다**
 *
 * **셋째 인자는 필수이고 없으면 던진다.** 조용한 기본값은 "안전하지만 숨긴다" —
 * 호출부 하나가 서명 변경을 안 따라왔을 때 그 실수가 영영 드러나지 않는다.
 * 그리고 인자를 빠뜨리면 `undefined`가 falsy 로 읽혀 강등하지 않는 쪽으로 조용히
 * 붙는데, 그 침묵이 정확히 이 함수가 막으려는 종류의 결함이다.
 *
 * **`projectsLoaded`가 거짓이면 강등하지 않고 입력을 그대로 돌려준다.** 프로젝트
 * 목록을 읽지 못한 상태에서 "목록에 없다"는 **참조가 끊겼다는 뜻이 아니라 모른다는**
 * **뜻**이고, 모르는 것을 지우면 재생 불가 데이터가 사라진다. `loadEvents()`가 읽기
 * 실패를 빈 배열로 바꾸지 않고 쓰기를 잠그는 것과 같은 판단이다.
 *
 * 강등만 하고 **이벤트는 지우지 않는다** (DD7).
 * @param {CalendarEvent[]} events
 * @param {CalendarProject[]} projects
 * @param {{projectsLoaded: boolean}} options
 * @returns {CalendarEvent[]}
 * @throws {TypeError} projectsLoaded 가 boolean 이 아니면
 */
function reconcileProjectRefs(events, projects, options) {
  const projectsLoaded = options ? options.projectsLoaded : undefined;
  if (typeof projectsLoaded !== 'boolean') {
    throw new TypeError('reconcileProjectRefs: projectsLoaded 는 필수 boolean 인자다 (DD28)');
  }

  const list = Array.isArray(events) ? events : [];
  if (!projectsLoaded) return list;

  /** @type {Set<string>} */
  const known = new Set();
  (Array.isArray(projects) ? projects : []).forEach((project) => {
    if (project && typeof project.id === 'string' && project.id) known.add(project.id);
  });

  let downgraded = 0;
  const next = list.map((event) => {
    if (!event || !event.projectId || known.has(event.projectId)) return event;
    downgraded += 1;
    return { ...event, projectId: null };
  });

  if (downgraded > 0) {
    console.error(`Calendar: downgraded ${downgraded} event(s) to unassigned (프로젝트 참조 끊김)`);
  }
  return next;
}

/**
 * v2 → v3 승격 (DD19) — **순수 함수. 저장소도 searchWidthByWidget도 모른다.**
 *
 * 배열을 받아 배열을 돌려준다. 껍데기 `migrateCalendarToV3()`와 백업 마일스톤의
 * 복구가 **같은 함수**를 부른다 — 두 번 구현하면 승격 의미가 경로마다 갈리고,
 * 그것은 재생 불가 데이터에서 가장 나쁜 부채다.
 *
 * 승격 규칙 자체는 `createCalendarEvent()`가 이미 갖고 있다(`startDate`가 없으면
 * `date`에서 올리고 `date`는 잔존 필드로 남긴다, DD6). 여기서 다시 적지 않는다 —
 * 적으면 그 순간 규칙이 두 자리에 살게 된다.
 *
 * **입력 배열을 in-place 변형하지 않는다** (`newtab.js`의 persistEvents 규약과 같다).
 * @param {unknown[]} events - v2 모양(date만 가진 항목)이 섞여 있을 수 있다
 * @returns {CalendarEvent[]}
 */
function promoteEventsToV3(events) {
  const list = Array.isArray(events) ? events : [];
  /** @type {CalendarEvent[]} */
  const promoted = [];
  list.forEach((event) => {
    // 이미 v3인 항목은 자기 값을 그대로 보존한다 (재실행 시 note/priority 유실 방지).
    const next = createCalendarEvent(event, { allowLegacyGateSynthesis: true });
    if (next) promoted.push(next);
  });
  return promoted;
}

/**
 * v3 → v4 승격 (DD1·DD2·DD19) — **순수 함수.**
 *
 * 관문 집합은 `{startDate, endDate}`의 중복 제거다(DD1). 만들어지는 관문은
 * `kind: null`이고(DD2) 종단 관문만 이벤트의 `done`을 물려받으며 `actual`은 전부
 * `null`이다 — v3에 완료 시각이 없으므로 없는 값을 만들지 않는다. 그 규칙은
 * `createCalendarEvent()`의 레거시 합성 갈래가 갖고 있고, 관문은 그 경로에서도
 * `createCalendarGate()`를 지난다. 순수 함수라고 해서 생성 게이트를 건너뛰지
 * 않는다 — 건너뛰면 마이그레이션이 유일하게 검사받지 않는 관문 생성 통로가 된다.
 *
 * **각 이벤트를 돌려주기 직전에 `deriveEventRange(event)`를 부른다** — DD26이 세는
 * **셋째 호출 자리**다. 이 호출이 없으면 `startDate ≠ min(planned)`인 이벤트가
 * 그대로 커밋된다.
 *
 * 이미 `gates`가 있으면 건드리지 않는다(멱등) — `createCalendarEvent()`가 입력의
 * `gates`를 우선하므로 재실행이 관문을 다시 만들지 않는다.
 * @param {unknown[]} events
 * @returns {CalendarEvent[]}
 */
function promoteEventsToV4(events) {
  const list = Array.isArray(events) ? events : [];
  /** @type {CalendarEvent[]} */
  const promoted = [];
  list.forEach((event) => {
    const next = createCalendarEvent(event, { allowLegacyGateSynthesis: true });
    if (!next) return;
    promoted.push(deriveEventRange(next));
  });
  return promoted;
}

/**
 * 달력 데이터 스키마 v4 마이그레이션 (멱등, 1회)
 *
 * 읽기·가드·쓰기 **껍데기**다. 승격 규칙은 `promoteEventsToV4()`가 갖는다.
 *
 * 세 키를 **한 번의 set으로** 커밋한다. 두 번으로 나누면 사이에서 죽었을 때
 * 버전만 올라가거나 이벤트만 승격된 반쪽 상태가 남는다.
 * @returns {Promise<boolean>} 성공 여부. 실패를 조용히 넘기지 않고 고지에 반영한다
 */
async function migrateCalendarToV4() {
  try {
    const stored = await storage.get(['settingsVersion', 'calendarEvents', 'calendarProjects']);

    if ((stored.settingsVersion ?? 1) >= SETTINGS_VERSION) return true;

    // 값이 없는 것(첫 실행)과 배열이 아닌 것(손상)은 다르다. 후자를 []로 바꿔 쓰면
    // 마이그레이션이 손상된 저장값을 **덮어써서 지운다** — loadEvents()가 봉인할
    // 기회조차 사라지고, 사용자는 아무 설명 없이 빈 달력을 만난다. 승격하지 않고
    // 실패로 돌려 고지에 반영한다(호출부가 applyStorageNotice 에 넘긴다).
    // loadEvents()가 같은 구분을 같은 이유로 하고 있다.
    if (stored.calendarEvents !== undefined && !Array.isArray(stored.calendarEvents)) {
      console.error('Failed to migrate calendar to v4: 저장된 일정 형식이 올바르지 않습니다 (배열이 아님) — 승격하지 않습니다');
      return false;
    }

    // **형제 키에도 같은 가드를 건다.** 위 세 줄의 판단을 calendarEvents 에만
    // 걸어 두었을 때, 손상된 calendarProjects 가 []로 덮여 사라졌다 —
    // loadProjects()의 봉인이 발화할 기회를 잃고, 그 목록을 "아는 프로젝트
    // 전부"로 믿은 reconcileProjectRefs()가 멀쩡한 참조를 전건 강등한다.
    // 손실이 두 겹이 되는 자리라 형제 키를 예외로 둘 근거가 없다.
    if (stored.calendarProjects !== undefined && !Array.isArray(stored.calendarProjects)) {
      console.error('Failed to migrate calendar to v4: 저장된 프로젝트 형식이 올바르지 않습니다 (배열이 아님) — 승격하지 않습니다');
      return false;
    }

    const promoted = promoteEventsToV4(stored.calendarEvents);
    // 프로젝트 컬렉션의 자리를 여기서 연다. 이미 있으면 건드리지 않는다.
    const projects = Array.isArray(stored.calendarProjects) ? stored.calendarProjects : [];

    await storage.set({
      calendarEvents: promoted,
      calendarProjects: projects,
      settingsVersion: SETTINGS_VERSION,
    });
    return true;
  } catch (error) {
    console.error('Failed to migrate calendar to v4:', error);
    return false;
  }
}

async function migrateCalendarToV3() {
  try {
    const stored = await storage.get([
      'settingsVersion',
      'calendarEvents',
      'searchWidthByWidget',
    ]);

    // **자기 상수로 가드한다** (DD10). SETTINGS_VERSION을 읽으면 그것이 4로 오른
    // 순간 이 마이그레이션이 영영 실행되지 않는다.
    if ((stored.settingsVersion ?? 1) >= SETTINGS_VERSION_V3) return true;

    // 값이 없는 것(첫 실행)과 배열이 아닌 것(손상)은 다르다. 후자를 []로 바꿔 쓰면
    // 마이그레이션이 손상된 저장값을 **덮어써서 지운다** — loadEvents()가 봉인할
    // 기회조차 사라지고, 사용자는 아무 설명 없이 빈 달력을 만난다. 승격하지 않고
    // 실패로 돌려 고지에 반영한다(호출부가 applyStorageNotice 에 넘긴다).
    // loadEvents()가 같은 구분을 같은 이유로 하고 있다.
    if (stored.calendarEvents !== undefined && !Array.isArray(stored.calendarEvents)) {
      console.error('Failed to migrate calendar to v3: 저장된 일정 형식이 올바르지 않습니다 (배열이 아님) — 승격하지 않습니다');
      return false;
    }

    // 승격 본문은 순수 함수가 갖는다. 자체 구현을 남겨 두면 DD16의 증인이
    // 가리키는 대상이 둘이 되어 판정이 죽는다.
    const promoted = promoteEventsToV3(stored.calendarEvents);

    // 화이트리스트 복사. Object.keys 순회 + 대입은 '__proto__' 키가 섞였을 때
    // 프로토타입을 건드린다. 의미 있는 위젯 타입은 clock/calendar 둘뿐이다.
    const widths = stored.searchWidthByWidget;
    /** @type {Record<string, number>} */
    const nextWidths = {};
    if (widths && typeof widths === 'object' && typeof widths.clock === 'number' && widths.clock > 0) {
      nextWidths.clock = widths.clock;
    }

    await storage.set({
      calendarEvents: promoted,
      searchWidthByWidget: nextWidths,
      settingsVersion: SETTINGS_VERSION_V3,
    });
    return true;
  } catch (error) {
    console.error('Failed to migrate calendar to v3:', error);
    return false;
  }
}

/**
 * 저장소 상태를 화면과 DOM에 고지한다
 *
 * 확장 저장소가 아닌 곳에 저장되고 있거나 마이그레이션이 실패했다면 침묵하지
 * 않는다 (PRODUCT.md 원칙 4). 확장에서 정상이면 아무것도 그리지 않는다.
 *
 * body에 쓰므로 모듈 평가 시점이 아니라 initialize()에서 부른다.
 * @param {{migrationFailed?: boolean, projectsLoadFailed?: boolean}} state
 *   **매번 처음부터 다시 만들어 통째로 대입한다 — 누적하지 않는다.** 그래서
 *   부르는 쪽은 그 시점에 참인 상태를 **전부** 넘겨야 한다. 하나만 넘기면
 *   앞서 띄운 고지가 지워진다 (DD37).
 */
function applyStorageNotice(state) {
  document.body.dataset.storageBackend = STORAGE_BACKEND;

  const element = document.getElementById('storageNotice');
  if (!element) return;

  /** @type {string[]} */
  const messages = [];
  if (STORAGE_BACKEND === 'local-preview') {
    messages.push('미리보기 모드 · 확장 저장소가 아닌 이 브라우저에만 저장됩니다');
  } else if (STORAGE_BACKEND === 'none') {
    messages.push('저장소를 쓸 수 없습니다 · 이 화면에서 바꾼 내용은 남지 않습니다');
  }
  if (state.migrationFailed) {
    messages.push('설정 마이그레이션 실패');
  }
  if (state.projectsLoadFailed) {
    messages.push('프로젝트 목록을 읽지 못했습니다 · 프로젝트 변경이 잠겨 있습니다');
  }

  if (messages.length === 0) {
    element.hidden = true;
    return;
  }

  element.textContent = messages.join(' · ');
  element.hidden = false;
}

/**
 * 첫 실행 온보딩을 연다 (DD13 · UI8)
 *
 * **판정은 하지 않는다** — 부를지 말지는 `Application.initialize()` 의 네 항 AND 식이
 * 정하고, 이 함수는 열기만 한다. 판정을 여기로 내리면 그 식이 두 자리로 갈라진다.
 *
 * `applyStorageNotice()` 와 같은 형태다 — 상시 표면을 늘리지 않고 필요할 때만 나타난다.
 *
 * 사용자 문자열은 `textContent` 로만 렌더한다(`innerHTML` 금지). 프로젝트 이름이 닿는
 * 곳은 이 함수의 입력값과 `.calendar-todo-meta` 의 한 줄 `textContent` 뿐이다.
 *
 * @param {CalendarManager} calendarManager
 * @param {SettingsManager} settingsManager
 */
function openCalendarOnboarding(calendarManager, settingsManager) {
  const element = document.getElementById('calendarOnboarding');
  const form = document.getElementById('calendarOnboardingForm');
  const input = document.getElementById('calendarOnboardingName');
  const create = document.getElementById('calendarOnboardingCreate');
  const skip = document.getElementById('calendarOnboardingSkip');
  const error = document.getElementById('calendarOnboardingError');
  if (!element || !(form instanceof HTMLFormElement) || !(input instanceof HTMLInputElement) || !skip) {
    // 표면이 없으면 조용히 지나간다. **플래그는 태우지 않는다** — 본 적이 없는
    // 안내를 봤다고 기록하면 그 사용자는 온보딩을 영영 못 본다.
    console.error('Calendar onboarding elements not found');
    return;
  }

  const showError = (message) => {
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  };

  const close = () => {
    element.hidden = true;
  };

  /**
   * 저장이 도는 동안 재진입을 막는다
   *
   * `submitting` 이 실제 자물쇠이고 `disabled` 는 그 사실을 화면에 보이는 쪽이다 —
   * 둘 다 있어야 한다. 가드가 없으면 Enter 를 두 번 빠르게 친 사용자의 두 번째
   * 제출이 `persistEvents()` 의 `if (this.pending) return false` 에 걸려
   * "저장하지 못했습니다" 를 띄운다. **첫 번째는 성공했는데도.**
   *
   * 입력칸은 잠그지 않는다 — Enter 로 제출하면 포커스가 아직 그 칸에 있고, 여기서
   * disabled 를 걸면 포커스가 body 로 떨어졌다가 오류 경로의 `input.focus()` 로
   * 되돌아오는 깜빡임이 생긴다. 잠글 것은 다시 **누를 수 있는** 두 버튼이다.
   */
  let submitting = false;
  const setBusy = (busy) => {
    if (create instanceof HTMLButtonElement) create.disabled = busy;
    if (skip instanceof HTMLButtonElement) skip.disabled = busy;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (error) error.hidden = true; // 지난 시도의 문구를 남겨 두지 않는다
    const name = input.value.trim();
    if (!name) {
      showError('프로젝트 이름을 적어 주세요.');
      input.focus();
      return;
    }

    submitting = true;
    setBusy(true);
    try {
      // 만들기가 실패하면 **플래그를 태우지 않고 표면도 닫지 않는다.** 실패를 삼키면
      // 사용자는 만들었다고 믿는데 목록은 비어 있고, 한 번뿐인 안내는 이미 소모된다.
      // 문구는 무슨 일이 있었는지와 **그 결과**를 함께 말한다 — 저장 실패는 이 제품이
      // 조용함을 포기하는 자리다.
      const created = await calendarManager.addProject({ name });
      if (!created) {
        showError('프로젝트를 저장하지 못했습니다. 만들어지지 않았으니 다시 시도하거나 건너뛰세요.');
        input.focus();
        return;
      }

      if (error) error.hidden = true;
      await settingsManager.saveCalendarOnboardingSeen();
      close();
    } finally {
      // 성공 경로에서도 푼다. 이미 닫힌 표면의 버튼을 되돌리는 것은 무해하고,
      // `finally` 로 두면 위 어느 await 이 던져도 자물쇠가 걸린 채 남지 않는다 —
      // 그 상태의 카드는 눌러도 아무 일이 없으면서 닫히지도 않는다.
      submitting = false;
      setBusy(false);
    }
  });

  /**
   * 안내를 닫고 한 번뿐인 플래그를 태운다 (건너뛰기 · Escape 공용)
   *
   * **건너뛴 경우에도 플래그를 태운다** — 무소속이 정상 상태이므로(UI8) 반복 안내는
   * 프로젝트 생성의 사실상 강제가 된다. 이 자리가 없으면 넷째 항이 영원히 false 라
   * 건너뛴 사용자에게 매 초기화마다 다시 뜬다.
   */
  const dismiss = async () => {
    if (submitting) return; // 저장 중에 닫으면 결과를 못 본 채 플래그만 탄다
    await settingsManager.saveCalendarOnboardingSeen();
    close();
  };

  skip.addEventListener('click', dismiss);

  // Escape 를 건너뛰기와 **같은 경로**로 보낸다. 닫기만 하고 플래그를 안 태우면 다음
  // 로드에 다시 뜨고, 사용자가 닫은 *방법*에 따라 다시 뜨는지가 갈린다 — UI8 이 막으려는
  // 반복 안내가 키보드 사용자에게만 돌아온다.
  //
  // 리스너는 **카드에 건다(document 가 아니다).** document 에 걸면 온보딩이 떠 있는
  // 동안 설정 모달에서 누른 Escape 까지 여기 닿아, 사용자가 의도하지 않은 자리에서
  // 한 번뿐인 플래그가 탄다. 카드에 걸면 포커스가 카드 안에 있을 때 — 즉 사용자가 이
  // 표면을 다루고 있을 때만 — 반응한다.
  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    dismiss();
  });

  element.hidden = false;
  // **자동으로 포커스를 가져오지 않는다.** 새 탭의 1차 동선은 Ctrl+T 직후 주소창
  // 타이핑이고, 여기서 `input.focus()` 를 부르면 그 첫 입력이 프로젝트 이름 칸으로
  // 샌다 — 한 번뿐인 안내가 제품의 주 동선을 첫 실행에서 가로채는 셈이다. 카드는
  // 보이고, 들어올지는 사용자가 클릭이나 Tab 으로 정한다.
  //
  // 위 오류 경로의 `input.focus()` 는 남긴다 — 그쪽은 사용자가 이미 제출한 **뒤**라
  // 포커스가 카드 안에 있고, 무엇을 고쳐야 하는지를 가리키는 것이 맞다.
}

/**
 * 가져온 JSON을 신뢰 불가 입력으로 취급해 정제
 * 화이트리스트 필드만 새 객체로 복사하므로 prototype pollution이 원천 차단된다.
 * @param {unknown} raw - JSON.parse 결과
 * @returns {CalendarEvent[]}
 * @throws {Error} 구조가 유효하지 않으면
 */
function sanitizeImportedEvents(raw) {
  // **봉투 판별이 함수의 첫 줄이다.** 뒤에 두면 {version:4, events:[...]}라는
  // 정상 파일이 "최상위 구조가 배열이 아닙니다"로 죽는다 — 내보내기에 봉투를
  // 씌우는 순간 자기 자신이 내보낸 파일을 못 읽는 상태가 된다.
  //
  // 아는 값 **둘을 열거하고 나머지를 전부 거절하는 화이트리스트**다. 아는 나쁜
  // 값을 열거하는 블랙리스트가 아니므로 version 5가 미래에 생겨도 옛 코드는
  // 그것을 추측해 읽지 않고 죽는다 — 그리고 그것이 옳다.
  //
  // 비교는 `===`와 숫자 리터럴이다. 느슨한 비교를 쓰면 version: "4"가 통과한다.
  const isPlainObject = typeof raw === 'object' && raw !== null && !Array.isArray(raw);
  /** @type {unknown[]} */
  let items;
  /** @type {boolean} */
  let allowLegacyGateSynthesis;
  if (Array.isArray(raw)) {
    items = raw;
    allowLegacyGateSynthesis = true;
  } else if (isPlainObject && raw.version === 4 && Array.isArray(raw.events)) {
    items = raw.events;
    allowLegacyGateSynthesis = false;
  } else if (isPlainObject) {
    // version 부재 · {version:3} · {version:999} · version:4인데 events가 배열이
    // 아닌 것이 전부 여기로 온다. 마지막 경우를 같은 줄에 두는 이유는, 봉투를
    // 신뢰해 raw.events.forEach로 들어가면 TypeError가 나고 그 예외를 아래
    // catch가 같은 문구로 받아 **의도한 거절과 우연한 크래시를 구별할 수 없게**
    // 되기 때문이다.
    throw new Error('알 수 없는 내보내기 형식입니다 (v3 배열 또는 version 4 봉투만 읽습니다)');
  } else {
    throw new Error('최상위 구조가 배열이 아닙니다');
  }

  if (items.length > MAX_IMPORT_EVENTS) {
    throw new Error(`항목이 너무 많습니다 (최대 ${MAX_IMPORT_EVENTS}개)`);
  }

  const usedIds = new Set();
  /** @type {CalendarEvent[]} */
  const sanitized = [];
  let usedChars = 0;

  items.forEach((item, index) => {
    // 날짜 왕복 검증 · 범위 상한 · 메모 절단 · 중요도 화이트리스트가 전부
    // createCalendarEvent 안에 있다. 여기서 다시 구현하지 않는다.
    const event = createCalendarEvent(item, { allowLegacyGateSynthesis });
    // **검증 탈락 항목이 하나라도 있으면 배치 전체를 거절한다.** 예전에는 그
    // 항목만 건너뛰었는데, 그러면 사용자는 무엇이 빠졌는지 모른 채 "가져왔다"고
    // 믿는다. 상한 초과에 이미 쓰고 있는 판단을 같은 이유로 넓힌 것이다.
    // 던지면 replaceEvents()에 도달하지 않으므로 저장소는 손대지 않은 채 남는다.
    if (!event) {
      throw new Error(`${index + 1}번째 항목을 읽을 수 없습니다. 파일 전체를 가져오지 않았습니다`);
    }

    if (usedIds.has(event.id)) event.id = crypto.randomUUID();
    usedIds.add(event.id);

    usedChars += event.title.length + event.note.length + IMPORT_ITEM_OVERHEAD_CHARS;
    sanitized.push(event);
  });

  // 항목 수와 항목별 길이를 각각 막아도 그 곱은 막히지 않는다.
  // 조용히 잘라내지 않고 가져오기 전체를 거절한다 — 사용자가 적은 것이
  // 일부만 들어왔는지 모른 채로 남는 편이 더 나쁘다.
  if (usedChars > MAX_IMPORT_CHARS) {
    throw new Error(
      `가져올 내용이 너무 큽니다 (약 ${Math.round(usedChars / 10000) / 100}만자, 최대 ${MAX_IMPORT_CHARS / 10000}만자). 항목을 줄여 다시 시도해 주세요.`
    );
  }

  return sanitized;
}

/**
 * 시간 관리 클래스
 * 책임: 시계 표시 및 업데이트 관리
 */
class ClockManager {
  /**
   * @param {HTMLElement} timeElement - 시간 표시 요소
   * @param {HTMLElement} dateElement - 날짜 표시 요소
   */
  constructor(timeElement, dateElement) {
    this.timeElement = timeElement;
    this.dateElement = dateElement;
  }

  /**
   * 시계 초기화 및 업데이트 시작
   */
  initialize() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  /**
   * 시계 업데이트
   */
  updateClock() {
    const now = new Date();

    // 시간 표시 (HH:mm)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    this.timeElement.textContent = `${hours}:${minutes}`;

    // 날짜 표시 (yyyy년 mm월 dd일 요일)
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayName = days[now.getDay()];
    this.dateElement.textContent = `${year}년 ${month}월 ${date}일 ${dayName}`;
  }
}

/**
 * 배경 이미지 관리 클래스
 * 책임: 랜덤/고정 배경 이미지 로드 및 표시
 */
class BackgroundManager {
  /**
   * @param {HTMLElement} backgroundElement - 배경 요소
   */
  constructor(backgroundElement) {
    this.backgroundElement = backgroundElement;
    this.imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    /** @type {string[]} */
    this.uploadedImages = [];
    this.isRandomMode = true;
    this.fixedImage = null;
  }

  /**
   * 배경 이미지 초기화
   */
  async initialize() {
    await this.loadUploadedImages();
    await this.loadSettings();
    await this.loadBackground();
  }

  /**
   * Chrome Storage에서 업로드된 이미지 목록 로드
   */
  async loadUploadedImages() {
    try {
      const result = await storage.get(['uploadedImages']);
      this.uploadedImages = result.uploadedImages || [];
    } catch (error) {
      console.error('Failed to load uploaded images:', error);
      this.uploadedImages = [];
    }
  }

  /**
   * 설정 로드
   */
  async loadSettings() {
    try {
      const result = await storage.get(['isRandomMode', 'fixedImage']);
      this.isRandomMode = result.isRandomMode !== false;
      this.fixedImage = result.fixedImage || null;
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  /**
   * 배경 이미지 로드
   */
  async loadBackground() {
    try {
      const allImages = await this.getAllImages();

      if (allImages.length === 0) {
        console.warn('No images available');
        this.setFallbackBackground();
        return;
      }

      let imageToShow;

      if (this.isRandomMode) {
        // 랜덤 모드: 매번 다른 이미지
        imageToShow = allImages[Math.floor(Math.random() * allImages.length)];
      } else {
        // 고정 모드: 저장된 이미지 사용, 없으면 첫 번째 이미지
        if (this.fixedImage && allImages.includes(this.fixedImage)) {
          imageToShow = this.fixedImage;
        } else {
          imageToShow = allImages[0];
          this.fixedImage = imageToShow;
          await this.saveSettings();
        }
      }

      this.backgroundElement.style.backgroundImage = `url('${imageToShow}')`;
    } catch (error) {
      console.error('Failed to load background image:', error);
      this.setFallbackBackground();
    }
  }

  /**
   * 모든 이미지 목록 가져오기 (업로드 이미지 우선)
   * @returns {Promise<string[]>}
   */
  async getAllImages() {
    // 업로드된 이미지가 있으면 업로드 이미지만 사용
    if (this.uploadedImages.length > 0) {
      return this.uploadedImages;
    }

    // 없으면 로컬 이미지 사용
    const localImages = this.getLocalImageList();
    return localImages;
  }

  /**
   * 로컬 images 폴더의 이미지 목록
   * @returns {string[]}
   */
  getLocalImageList() {
    const maxImages = 20;
    return Array.from({ length: maxImages }, (_, i) => `images/${i + 1}.jpg`);
  }

  /**
   * 대체 배경 설정 (그라데이션)
   */
  setFallbackBackground() {
    this.backgroundElement.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }

  /**
   * 업로드된 이미지 목록 반환
   * @returns {string[]}
   */
  getUploadedImages() {
    return this.uploadedImages;
  }

  /**
   * 이미지 추가
   * @param {string} imageData - Base64 이미지 데이터
   */
  async addImage(imageData) {
    // 최대 30개 제한
    if (this.uploadedImages.length >= this.maxImages) {
      throw new Error(`최대 ${this.maxImages}개까지만 업로드할 수 있습니다.`);
    }

    this.uploadedImages.push(imageData);
    await this.saveUploadedImages();
  }

  /**
   * 이미지 삭제
   * @param {number} index - 삭제할 인덱스
   */
  async removeImage(index) {
    this.uploadedImages.splice(index, 1);
    await this.saveUploadedImages();

    // 고정 모드에서 고정된 이미지를 삭제한 경우
    if (!this.isRandomMode && this.fixedImage === this.uploadedImages[index]) {
      this.fixedImage = null;
      await this.saveSettings();
      await this.loadBackground();
    }
  }

  /**
   * 업로드된 이미지 목록 저장
   */
  async saveUploadedImages() {
    try {
      await storage.set({ uploadedImages: this.uploadedImages });
    } catch (error) {
      console.error('Failed to save uploaded images:', error);
    }
  }

  /**
   * 랜덤/고정 모드 토글
   * @param {boolean} isRandom - 랜덤 모드 여부
   */
  async setRandomMode(isRandom) {
    this.isRandomMode = isRandom;

    if (!isRandom) {
      // 고정 모드로 변경: 현재 표시된 이미지를 고정
      const currentBg = this.backgroundElement.style.backgroundImage;
      const urlMatch = currentBg.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (urlMatch) {
        this.fixedImage = urlMatch[1];
      }
    }

    await this.saveSettings();
  }

  /**
   * 설정 저장
   */
  async saveSettings() {
    try {
      await storage.set({
        isRandomMode: this.isRandomMode,
        fixedImage: this.fixedImage,
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }
}

/**
 * 검색 기능 관리 클래스
 * 책임: 검색 폼 처리 및 Google 검색 실행
 */
class SearchManager {
  /**
   * @param {HTMLFormElement} searchForm - 검색 폼 요소
   * @param {HTMLInputElement} searchInput - 검색 입력 요소
   */
  constructor(searchForm, searchInput) {
    this.searchForm = searchForm;
    this.searchInput = searchInput;
  }

  /**
   * 검색 기능 초기화
   */
  initialize() {
    this.searchForm.addEventListener('submit', (e) => this.handleSearch(e));
  }

  /**
   * 검색 처리
   * @param {Event} event - 폼 제출 이벤트
   */
  handleSearch(event) {
    event.preventDefault();
    const query = this.searchInput.value.trim();

    if (!query) return;

    // URL 형식인지 확인
    const isUrl = this.isValidUrl(query);

    if (isUrl) {
      // URL로 직접 이동
      window.location.href = query.startsWith('http') ? query : `https://${query}`;
    } else {
      // Google 검색
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  }

  /**
   * 유효한 URL인지 확인
   * @param {string} string - 확인할 문자열
   * @returns {boolean}
   */
  isValidUrl(string) {
    try {
      new URL(string.startsWith('http') ? string : `https://${string}`);
      return string.includes('.');
    } catch {
      return false;
    }
  }
}

/**
 * 즐겨찾기 관리 클래스
 * 책임: 즐겨찾기 CRUD 작업 및 로컬 저장소 관리 (고정 기능 포함)
 */
class BookmarkManager {
  /**
   * @param {HTMLElement} bookmarksList - 즐겨찾기 목록 요소
   * @param {HTMLElement} pinnedBookmarks - 고정된 즐겨찾기 영역
   * @param {HTMLElement} sidebar - 사이드바 요소
   * @param {HTMLElement} toggleBtn - 토글 버튼
   * @param {HTMLElement} addBtn - 추가 버튼 요소
   * @param {HTMLElement} modal - 모달 요소
   */
  constructor(bookmarksList, pinnedBookmarks, sidebar, toggleBtn, addBtn, modal) {
    this.bookmarksList = bookmarksList;
    this.pinnedBookmarks = pinnedBookmarks;
    this.sidebar = sidebar;
    this.toggleBtn = toggleBtn;
    this.addBtn = addBtn;
    this.modal = modal;
    /** @type {Array<{name: string, url: string, pinned?: boolean}>} */
    this.bookmarks = [];
    this.draggedItem = null;
  }

  /**
   * 즐겨찾기 기능 초기화
   */
  async initialize() {
    await this.loadBookmarks();
    this.renderBookmarks();
    this.renderPinnedBookmarks();
    this.setupEventListeners();
  }

  /**
   * 로컬 저장소에서 즐겨찾기 로드
   */
  async loadBookmarks() {
    try {
      const result = await storage.get(['bookmarks']);
      this.bookmarks = result.bookmarks || this.getDefaultBookmarks();
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      this.bookmarks = this.getDefaultBookmarks();
    }
  }

  /**
   * 기본 즐겨찾기 반환
   * @returns {Array<{name: string, url: string, pinned?: boolean}>}
   */
  getDefaultBookmarks() {
    return [
      { name: 'Google', url: 'https://www.google.com', pinned: true },
      { name: 'YouTube', url: 'https://www.youtube.com', pinned: true },
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'Gmail', url: 'https://mail.google.com' },
    ];
  }

  /**
   * 즐겨찾기 저장
   */
  async saveBookmarks() {
    try {
      await storage.set({ bookmarks: this.bookmarks });
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
    }
  }

  /**
   * 즐겨찾기 렌더링 (사이드바)
   */
  renderBookmarks() {
    this.bookmarksList.innerHTML = '';

    this.bookmarks.forEach((bookmark, index) => {
      const item = this.createBookmarkElement(bookmark, index);
      this.bookmarksList.appendChild(item);
    });
  }

  /**
   * 고정된 즐겨찾기 렌더링
   */
  renderPinnedBookmarks() {
    this.pinnedBookmarks.innerHTML = '';

    const pinned = this.bookmarks.filter((b) => b.pinned);

    pinned.forEach((bookmark) => {
      const item = this.createPinnedBookmarkElement(bookmark);
      this.pinnedBookmarks.appendChild(item);
    });
  }

  /**
   * 즐겨찾기 요소 생성 (사이드바용)
   * @param {{name: string, url: string, pinned?: boolean}} bookmark - 즐겨찾기 데이터
   * @param {number} index - 인덱스
   * @returns {HTMLElement}
   */
  createBookmarkElement(bookmark, index) {
    const item = document.createElement('a');
    item.className = 'bookmark-item';
    item.href = bookmark.url;
    item.target = '_self';

    const icon = document.createElement('img');
    icon.className = 'bookmark-icon';
    icon.src = `https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=32`;
    icon.alt = bookmark.name;
    icon.onerror = () => {
      icon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"><circle cx="12" cy="12" r="10"/></svg>';
    };

    const name = document.createElement('span');
    name.className = 'bookmark-name';
    name.textContent = bookmark.name;

    const actions = document.createElement('div');
    actions.className = 'bookmark-actions';

    // 고정 버튼
    const pinBtn = document.createElement('button');
    pinBtn.className = bookmark.pinned ? 'bookmark-pin pinned' : 'bookmark-pin';

    // 고정된 경우: 채워진 핀, 해제된 경우: 빈 핀
    if (bookmark.pinned) {
      // 채워진 핀 (고정됨)
      pinBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
      </svg>`;
    } else {
      // 빈 핀 (고정 안됨)
      pinBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
      </svg>`;
    }

    pinBtn.title = bookmark.pinned ? '고정 해제' : '고정';
    pinBtn.onclick = (e) => {
      e.preventDefault();
      this.togglePin(index);
    };

    // 삭제 버튼
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'bookmark-delete';
    // 글리프('×') 대신 SVG를 담는다. 문자로 그리면 모양과 굵기가 본문 폰트에
    // 매이고, 접근성 이름도 '×'가 되어 읽어 주는 쪽에서 무슨 버튼인지 알 수 없다.
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
    deleteBtn.title = '삭제';
    deleteBtn.setAttribute('aria-label', `${bookmark.name} 삭제`);
    deleteBtn.onclick = (e) => {
      e.preventDefault();
      this.deleteBookmark(index);
    };

    actions.appendChild(pinBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(actions);

    // 드래그 앤 드롭 이벤트
    item.draggable = true;
    item.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
    item.addEventListener('dragend', (e) => this.handleDragEnd(e));
    item.addEventListener('dragover', (e) => this.handleDragOver(e));
    item.addEventListener('drop', (e) => this.handleDrop(e, index));
    item.addEventListener('dragleave', (e) => this.handleDragLeave(e));

    return item;
  }

  /**
   * 고정된 즐겨찾기 요소 생성
   * @param {{name: string, url: string}} bookmark - 즐겨찾기 데이터
   * @returns {HTMLElement}
   */
  createPinnedBookmarkElement(bookmark) {
    const item = document.createElement('a');
    item.className = 'pinned-bookmark-item';
    item.href = bookmark.url;
    item.target = '_self';

    const icon = document.createElement('img');
    icon.className = 'bookmark-icon';
    icon.src = `https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=32`;
    icon.alt = bookmark.name;
    icon.onerror = () => {
      icon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"><circle cx="12" cy="12" r="10"/></svg>';
    };

    const name = document.createElement('span');
    name.className = 'bookmark-name';
    name.textContent = bookmark.name;

    item.appendChild(icon);
    item.appendChild(name);

    return item;
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 토글 버튼
    this.toggleBtn.addEventListener('click', () => this.toggleSidebar());

    // 사이드바 외부 클릭시 닫기
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target instanceof Node && !this.sidebar.contains(target) && !this.toggleBtn.contains(target) && this.sidebar.classList.contains('active')) {
        this.closeSidebar();
      }
    });

    // 추가 버튼
    this.addBtn.addEventListener('click', () => this.openModal());

    // 모달 폼
    const form = document.getElementById('bookmarkForm');
    if (form instanceof HTMLFormElement) {
      form.addEventListener('submit', (e) => this.handleAddBookmark(e));
    }

    // 취소 버튼
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    // 모달 배경 클릭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });
  }

  /**
   * 사이드바 토글
   */
  toggleSidebar() {
    this.sidebar.classList.toggle('active');
  }

  /**
   * 사이드바 닫기
   */
  closeSidebar() {
    this.sidebar.classList.remove('active');
  }

  /**
   * 모달 열기
   */
  openModal() {
    this.modal.classList.add('active');
    const nameInput = document.getElementById('bookmarkName');
    if (nameInput instanceof HTMLInputElement) {
      nameInput.focus();
    }
  }

  /**
   * 모달 닫기
   */
  closeModal() {
    this.modal.classList.remove('active');
    const form = document.getElementById('bookmarkForm');
    if (form instanceof HTMLFormElement) {
      form.reset();
    }
  }

  /**
   * 즐겨찾기 추가 처리
   * @param {Event} event - 폼 제출 이벤트
   */
  async handleAddBookmark(event) {
    event.preventDefault();

    const nameInput = document.getElementById('bookmarkName');
    const urlInput = document.getElementById('bookmarkUrl');

    if (!(nameInput instanceof HTMLInputElement) || !(urlInput instanceof HTMLInputElement)) {
      return;
    }

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name || !url) return;

    this.bookmarks.push({ name, url, pinned: false });
    await this.saveBookmarks();
    this.renderBookmarks();
    this.closeModal();
  }

  /**
   * 즐겨찾기 고정/해제 토글
   * @param {number} index - 토글할 인덱스
   */
  async togglePin(index) {
    this.bookmarks[index].pinned = !this.bookmarks[index].pinned;
    await this.saveBookmarks();
    this.renderBookmarks();
    this.renderPinnedBookmarks();
  }

  /**
   * 즐겨찾기 삭제
   * @param {number} index - 삭제할 인덱스
   */
  async deleteBookmark(index) {
    if (confirm('이 즐겨찾기를 삭제하시겠습니까?')) {
      this.bookmarks.splice(index, 1);
      await this.saveBookmarks();
      this.renderBookmarks();
      this.renderPinnedBookmarks();
    }
  }

  /**
   * 드래그 시작
   * @param {DragEvent} event
   * @param {number} index
   */
  handleDragStart(event, index) {
    this.draggedItem = index;
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      target.classList.add('dragging');
    }
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  /**
   * 드래그 종료
   * @param {DragEvent} event
   */
  handleDragEnd(event) {
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      target.classList.remove('dragging');
    }
    // 모든 drag-over 클래스 제거
    document.querySelectorAll('.bookmark-item.drag-over').forEach((el) => {
      el.classList.remove('drag-over');
    });
  }

  /**
   * 드래그 오버
   * @param {DragEvent} event
   */
  handleDragOver(event) {
    event.preventDefault();
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      target.classList.add('drag-over');
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  /**
   * 드래그 리브
   * @param {DragEvent} event
   */
  handleDragLeave(event) {
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      target.classList.remove('drag-over');
    }
  }

  /**
   * 드롭
   * @param {DragEvent} event
   * @param {number} targetIndex
   */
  async handleDrop(event, targetIndex) {
    event.preventDefault();
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      target.classList.remove('drag-over');
    }

    if (this.draggedItem === null || this.draggedItem === targetIndex) {
      return;
    }

    // 배열 순서 변경
    const draggedBookmark = this.bookmarks[this.draggedItem];
    this.bookmarks.splice(this.draggedItem, 1);

    // targetIndex 조정
    const newIndex = this.draggedItem < targetIndex ? targetIndex - 1 : targetIndex;
    this.bookmarks.splice(newIndex, 0, draggedBookmark);

    await this.saveBookmarks();
    this.renderBookmarks();
    this.renderPinnedBookmarks();

    this.draggedItem = null;
  }
}

/**
 * 이미지 관리 클래스
 * 책임: 이미지 업로드, 삭제, 렌더링 관리
 */
class ImageManager {
  /**
   * @param {HTMLElement} sidebar - 이미지 사이드바
   * @param {HTMLElement} toggleBtn - 토글 버튼
   * @param {BackgroundManager} backgroundManager - 배경 관리자
   */
  constructor(sidebar, toggleBtn, backgroundManager) {
    this.sidebar = sidebar;
    this.toggleBtn = toggleBtn;
    this.backgroundManager = backgroundManager;
    this.uploadArea = null;
    this.imageUpload = null;
    this.imagesGrid = null;
    this.maxFileSizeMB = 30; // 30MB
    this.maxFileSize = this.maxFileSizeMB * 1024 * 1024; // 30MB
    this.maxImages = 30;
  }

  /**
   * 이미지 관리 기능 초기화
   */
  initialize() {
    this.uploadArea = document.getElementById('uploadArea');
    this.imageUpload = document.getElementById('imageUpload');
    this.imagesGrid = document.getElementById('imagesGrid');

    if (!this.uploadArea || !this.imageUpload || !this.imagesGrid) {
      console.error('Image management elements not found');
      return;
    }

    this.setupEventListeners();
    this.renderImages();
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 토글 버튼
    this.toggleBtn.addEventListener('click', () => this.toggleSidebar());

    // 닫기 버튼
    const closeBtn = document.getElementById('closeImagesSidebar');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeSidebar());
    }

    // 사이드바 외부 클릭시 닫기
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target instanceof Node && !this.sidebar.contains(target) && !this.toggleBtn.contains(target) && this.sidebar.classList.contains('active')) {
        this.closeSidebar();
      }
    });

    // 파일 선택
    this.imageUpload.addEventListener('change', (e) => this.handleFileSelect(e));

    // 드래그 앤 드롭
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      const files = e.dataTransfer?.files;
      if (files) {
        this.handleFiles(Array.from(files));
      }
    });
  }

  /**
   * 사이드바 토글
   */
  toggleSidebar() {
    this.sidebar.classList.toggle('active');
    if (this.sidebar.classList.contains('active')) {
      this.renderImages();
    }
  }

  /**
   * 사이드바 닫기
   */
  closeSidebar() {
    this.sidebar.classList.remove('active');
  }

  /**
   * 파일 선택 처리
   * @param {Event} event
   */
  handleFileSelect(event) {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.files) {
      this.handleFiles(Array.from(target.files));
      target.value = '';
    }
  }

  /**
   * 파일 처리
   * @param {File[]} files
   */
  async handleFiles(files) {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    const currentCount = this.backgroundManager.getUploadedImages().length;
    if (currentCount + imageFiles.length > this.maxImages) {
      alert(`최대 ${this.maxImages}개까지만 업로드할 수 있습니다. (현재: ${currentCount}개)`);
      return;
    }

    for (const file of imageFiles) {
      if (file.size > this.maxFileSize) {
        alert(`${file.name}은(는) 너무 큽니다. ${this.maxFileSizeMB}MB 이하의 이미지만 업로드 가능합니다.`);
        continue;
      }

      try {
        const compressedImageData = await this.compressImage(file);
        await this.backgroundManager.addImage(compressedImageData);
      } catch (error) {
        console.error('Failed to upload image:', error);
        if (error instanceof Error) {
          alert(error.message);
        }
      }
    }

    this.renderImages();
  }

  /**
   * 파일을 Data URL로 읽기
   * @param {File} file
   * @returns {Promise<string>}
   */
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 이미지 압축
   * @param {File} file
   * @returns {Promise<string>}
   */
  compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          // 캔버스 생성
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas context not supported'));
            return;
          }

          // 최대 크기 설정 (1920x1080)
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;

          let width = img.width;
          let height = img.height;

          // 비율 유지하면서 리사이징
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          // 캔버스 크기 설정
          canvas.width = width;
          canvas.height = height;

          // 이미지 그리기
          ctx.drawImage(img, 0, 0, width, height);

          // JPEG로 변환 (품질 0.8)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

          // 압축 결과 로그
          const originalSize = file.size;
          const compressedSize = Math.round((compressedDataUrl.length * 3) / 4);
          const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

          console.log(`Image compressed: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${ratio}% reduction)`);

          resolve(compressedDataUrl);
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        if (typeof e.target?.result === 'string') {
          img.src = e.target.result;
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * 이미지 목록 렌더링
   */
  renderImages() {
    if (!this.imagesGrid) return;

    const images = this.backgroundManager.getUploadedImages();

    if (images.length === 0) {
      this.imagesGrid.innerHTML = `
        <div class="empty-images">
          <p>업로드된 이미지가 없습니다.</p>
          <p>위에서 이미지를 업로드하세요.</p>
        </div>
      `;
      return;
    }

    this.imagesGrid.innerHTML = '';

    images.forEach((imageData, index) => {
      const item = this.createImageElement(imageData, index);
      this.imagesGrid.appendChild(item);
    });
  }

  /**
   * 이미지 요소 생성
   * @param {string} imageData - Base64 이미지 데이터
   * @param {number} index - 인덱스
   * @returns {HTMLElement}
   */
  createImageElement(imageData, index) {
    const item = document.createElement('div');
    item.className = 'image-item';

    const img = document.createElement('img');
    img.src = imageData;
    img.alt = `Uploaded image ${index + 1}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'image-delete';
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
    deleteBtn.title = '이미지 삭제';
    deleteBtn.setAttribute('aria-label', `이미지 ${index + 1} 삭제`);
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.deleteImage(index);
    };

    item.appendChild(img);
    item.appendChild(deleteBtn);

    // 이미지 클릭 시 배경으로 설정 (고정 모드에서만)
    item.onclick = async () => {
      this.backgroundManager.backgroundElement.style.backgroundImage = `url('${imageData}')`;
      if (!this.backgroundManager.isRandomMode) {
        this.backgroundManager.fixedImage = imageData;
        await this.backgroundManager.saveSettings();
      }
    };

    return item;
  }

  /**
   * 이미지 삭제
   * @param {number} index
   */
  async deleteImage(index) {
    if (confirm('이 이미지를 삭제하시겠습니까?')) {
      await this.backgroundManager.removeImage(index);
      this.renderImages();
    }
  }
}

/**
 * 달력 관리 클래스
 * 책임: 월간 그리드 렌더링, 날짜별 할 일 CRUD, 이벤트 영속성 관리
 */
class CalendarManager {
  /**
   * @param {HTMLElement} rootElement - .calendar-widget 루트
   */
  constructor(rootElement) {
    this.root = rootElement;

    /**
     * 항상 "마지막으로 영속된 상태". 미저장 상태를 담지 않는다.
     * @type {CalendarEvent[]}
     */
    this.events = [];

    /**
     * 읽기가 실패했는가.
     *
     * 이 플래그가 서면 `this.events`(빈 배열)는 **저장된 내용이 아니다.**
     * 그대로 두면 addEvent()가 `this.events.concat(event)` = `[한 건]`을 커밋해
     * 저장돼 있던 일정을 전부 지운다. 그래서 서 있는 동안 쓰기를 막는다.
     *
     * 예외는 가져오기 하나뿐이다 — 전체 교체라 읽기 성공에 의존하지 않고,
     * 읽기가 영구히 깨졌을 때 사용자에게 남은 유일한 복구 수단이다.
     * @type {boolean}
     */
    this.loadFailed = false;

    /**
     * 프로젝트 컬렉션. 항상 "마지막으로 영속된 상태" (DD7)
     * @type {CalendarProject[]}
     */
    this.projects = [];

    /**
     * 프로젝트 목록 읽기가 실패했는가 (DD27a)
     *
     * 이름과 극성은 `this.loadFailed`를 그대로 따른다 — 실패 쪽을 참으로 두는 것이
     * 이 저장소의 규약이므로 뒤집지 않는다. 이 플래그가 서 있는 동안 프로젝트
     * 쓰기가 잠긴다. **빈 목록 자체가 위험한 것이 아니라 빈 목록을 근거로**
     * **강등하는 것**이 위험하고, 그것을 막는 것이 이 플래그다.
     * @type {boolean}
     */
    this.projectsLoadFailed = false;

    /**
     * 새 이벤트의 기본 프로젝트 (UI8). 그 프로젝트가 사라졌으면 무소속으로 내려간다.
     * @type {string|null}
     */
    this.lastUsedProjectId = null;

    /**
     * 렌더 창(42칸)에 걸친 이벤트만 담는 날짜 버킷. renderGrid()가 매 렌더마다 새로 만든다.
     *
     * 전역으로 범위를 날짜 전개하면 최악의 경우 `이벤트 수 × 범위 일수`만큼
     * 엔트리가 생긴다(5000 × 366). 표시 중인 42일과 겹치는 구간만 담아 상한을 건다.
     * @type {Map<string, CalendarEvent[]>}
     */
    this.eventsByDate = new Map();

    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.todayKey = makeDateKey(now);

    /** @type {string|null} 선택된 날짜. null이면 패널 닫힘 */
    this.selectedKey = null;
    /** @type {string} roving tabindex 대상 */
    this.focusKey = this.todayKey;

    /**
     * Shift+방향키로 잡는 범위. 마우스 없이 여러 날 일정을 만들기 위한 경로다.
     * anchor가 null이면 범위 선택 중이 아니다.
     * @type {string|null}
     */
    this.rangeAnchorKey = null;
    /** @type {string|null} */
    this.rangeEndKey = null;

    /** @type {{mode: 'create'|'edit', id: string|null}|null} 모달 상태 */
    this.modalState = null;
    /** @type {HTMLElement|null} 모달을 연 요소. 닫을 때 포커스를 돌려준다 */
    this.modalReturnFocus = null;

    /**
     * 저장 진행/실패 중인 스냅샷. null이 아니면 새 편집을 차단한다.
     * @type {{nextEvents: CalendarEvent[], opToken: number}|null}
     */
    this.pending = null;
    this.opSeq = 0;

    /** 자정 롤오버 감지 타이머 */
    this.rolloverTimerId = null;

    // DOM 참조
    this.titleElement = null;
    this.gridElement = null;
    this.panelElement = null;
    this.panelTitleElement = null;
    this.todoListElement = null;
    this.todoFormElement = null;
    this.todoInputElement = null;
    this.errorElement = null;
    this.errorTextElement = null;
    this.errorRetryButton = null;

    /**
     * 상세 모달의 DOM 묶음 (달력 루트 밖에 있다 — 밴드의 overflow에 갇히면 안 된다)
     *
     * 요소를 열한 개의 nullable 필드로 흩어 두지 않고 하나로 묶는다. 전부 있거나
     * 전부 없거나 둘 중 하나이므로 검사도 한 번이면 되고, 쓰는 쪽에서
     * `if (!modal) return`을 한 번 통과하면 나머지는 전부 확정이다.
     * @type {{
     *   root: HTMLElement,
     *   heading: HTMLElement,
     *   form: HTMLFormElement,
     *   titleInput: HTMLInputElement,
     *   startInput: HTMLInputElement,
     *   endInput: HTMLInputElement,
     *   noteInput: HTMLTextAreaElement,
     *   noteCount: HTMLElement,
     *   error: HTMLElement,
     *   deleteButton: HTMLElement,
     *   cancelButton: HTMLElement,
     * }|null}
     */
    this.modal = null;
  }

  /**
   * 달력 초기화
   */
  async initialize() {
    this.titleElement = this.root.querySelector('.calendar-title');
    this.gridElement = this.root.querySelector('.calendar-grid');
    this.panelElement = this.root.querySelector('.calendar-panel');
    this.panelTitleElement = this.root.querySelector('.calendar-panel-title');
    this.todoListElement = this.root.querySelector('.calendar-todo-list');
    this.todoFormElement = this.root.querySelector('.calendar-todo-form');
    this.todoInputElement = this.root.querySelector('.calendar-todo-input');
    this.errorElement = this.root.querySelector('.calendar-error');
    this.errorTextElement = this.root.querySelector('.calendar-error-text');
    this.errorRetryButton = this.root.querySelector('.calendar-error-retry');

    if (
      !this.titleElement ||
      !this.gridElement ||
      !this.panelElement ||
      !this.panelTitleElement ||
      !this.todoListElement ||
      !(this.todoFormElement instanceof HTMLFormElement) ||
      !(this.todoInputElement instanceof HTMLInputElement) ||
      !this.errorElement ||
      !this.errorTextElement ||
      !this.errorRetryButton
    ) {
      console.error('Calendar elements not found');
      return;
    }

    this.initializeModalRefs();
    this.setupGateEditorListeners();

    await this.loadEvents();
    // DD37 — `loadEvents()`와 **같은 자리**다. 여기서 부르지 않으면
    // `projectsLoadFailed`가 세워지지 않고, `persistProjects()`의 가드가
    // `undefined`를 거짓으로 읽어 **읽지 못한 프로젝트 위에 쓰기가 통과한다.**
    await this.loadProjects();
    this.render();
    this.setupEventListeners();
    this.startRolloverWatch();
  }

  /**
   * 상세 모달 DOM 참조 수집
   *
   * 모달은 달력 루트 밖(body 직속)에 있다. 밴드 안에 두면 밴드의 max-height와
   * overflow에 갇혀 잘린다.
   *
   * 하나라도 없으면 상세 경로만 끄고 달력 본체는 계속 동작하게 둔다.
   */
  initializeModalRefs() {
    const root = document.getElementById('calendarEventModal');
    const heading = document.getElementById('calendarEventModalTitle');
    const form = document.getElementById('calendarEventForm');
    const titleInput = document.getElementById('calendarEventTitle');
    const startInput = document.getElementById('calendarEventStart');
    const endInput = document.getElementById('calendarEventEnd');
    const noteInput = document.getElementById('calendarEventNote');
    const noteCount = document.getElementById('calendarEventNoteCount');
    const error = document.getElementById('calendarEventError');
    const deleteButton = document.getElementById('calendarEventDelete');
    const cancelButton = document.getElementById('calendarEventCancel');

    if (
      !root ||
      !heading ||
      !(form instanceof HTMLFormElement) ||
      !(titleInput instanceof HTMLInputElement) ||
      !(startInput instanceof HTMLInputElement) ||
      !(endInput instanceof HTMLInputElement) ||
      !(noteInput instanceof HTMLTextAreaElement) ||
      !noteCount ||
      !error ||
      !deleteButton ||
      !cancelButton
    ) {
      console.error('Calendar detail modal elements not found');
      this.modal = null;
      const trigger = this.root.querySelector('.calendar-detail-add');
      if (trigger instanceof HTMLElement) trigger.hidden = true;
      return;
    }

    // **관문 편집기와 프로젝트 선택기는 선택적 참조다.** 하나라도 없으면 그 경로만
    // 끄고 상세 모달 본체는 계속 동작하게 둔다 — 기존 참조 검증과 같은 판단이다.
    const projectSelect = document.getElementById('calendarEventProject');
    const gatesBox = document.getElementById('calendarEventGates');
    const gateList = document.getElementById('calendarEventGateList');
    const gateKind = document.getElementById('calendarEventGateKind');
    const gateDate = document.getElementById('calendarEventGateDate');
    const gateAdd = document.getElementById('calendarEventGateAdd');
    const gateHint = document.getElementById('calendarEventGateHint');

    const gateEditor =
      gatesBox &&
      gateList &&
      gateKind instanceof HTMLSelectElement &&
      gateDate instanceof HTMLInputElement &&
      gateAdd instanceof HTMLButtonElement &&
      gateHint
        ? { box: gatesBox, list: gateList, kind: gateKind, date: gateDate, add: gateAdd, hint: gateHint }
        : null;
    if (!gateEditor) console.error('Calendar gate editor elements not found — 관문 편집 경로만 끕니다');

    this.modal = {
      root,
      heading,
      form,
      titleInput,
      startInput,
      endInput,
      noteInput,
      noteCount,
      error,
      deleteButton,
      cancelButton,
      projectSelect: projectSelect instanceof HTMLSelectElement ? projectSelect : null,
      gateEditor,
    };
  }

  /**
   * 상세 모달이 열려 있는지
   * @returns {boolean}
   */
  isModalOpen() {
    return Boolean(this.modal && this.modal.root.classList.contains('active'));
  }

  /**
   * 상세 모달 열기
   * @param {'create'|'edit'} mode
   * @param {CalendarEvent|null} event - edit일 때만
   */
  openEventModal(mode, event) {
    const modal = this.modal;
    if (!modal) return;
    // 저장이 진행/실패 중이면 새 편집을 받지 않는다. 인라인 입력과 같은 규칙이다.
    if (this.pending) return;

    this.modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.modalState = { mode, id: event ? event.id : null };

    const anchor = event ? event.startDate : this.rangeAnchorKey || this.selectedKey || this.focusKey;
    const other = event ? event.endDate : this.rangeEndKey || anchor;
    // 범위를 왼쪽으로 확장했으면 anchor가 뒤에 온다
    const from = anchor <= other ? anchor : other;
    const to = anchor <= other ? other : anchor;

    modal.heading.textContent = mode === 'edit' ? '일정 수정' : '일정 추가';
    modal.titleInput.value = event ? event.title : '';
    modal.startInput.value = from;
    modal.endInput.value = to;
    modal.noteInput.value = event ? event.note : '';
    this.setModalPriority(event ? event.priority : 'normal');
    this.updateNoteCount();
    this.hideModalError();
    modal.deleteButton.hidden = mode !== 'edit';

    // 프로젝트 선택기 — 새 일정의 기본값은 마지막에 쓴 프로젝트다 (UI8).
    this.populateProjectPicker(event ? event.projectId : this.defaultProjectId());

    // 관문 편집기는 **편집 모드에서만** 선다. 새 일정은 아직 id 가 없어 관문 CRUD 를
    // 부를 수 없고, 그 관문은 아래 저장에서 시작일·종료일로부터 만들어진다 (DD1).
    const derivedRange = mode === 'edit' && event ? eventHasUserGateWork(event) : false;
    modal.startInput.readOnly = derivedRange;
    modal.endInput.readOnly = derivedRange;
    if (modal.gateEditor) {
      modal.gateEditor.box.hidden = mode !== 'edit';
      if (mode === 'edit' && event) {
        // 관문 날짜 칸의 기본값은 **모달을 열 때 한 번만** 세운다. renderGateEditor
        // 안에 두었을 때는 직전 일정에서 남은 값이 그대로 따라와 다음 일정의 새
        // 관문 기본 날짜가 됐다.
        modal.gateEditor.date.value = event.endDate;
        this.renderGateEditor(event);
      }
    } else if (derivedRange) {
      // 편집기가 없으면 잠긴 기간을 바꿀 수단이 하나도 남지 않는다. 잠긴 것만
      // 보여 주고 이유를 말하지 않으면 그것도 "조용히 무시"와 같은 종류다.
      this.showModalError('관문 편집기를 열 수 없어 기간을 바꿀 수 없습니다.');
    }

    modal.root.classList.add('active');
    modal.titleInput.focus();
    modal.titleInput.select();
  }

  /**
   * 프로젝트 선택기 채우기
   *
   * 무소속 자리를 항상 남긴다 — 프로젝트를 강제하지 않는다 (UI8).
   * 목록을 읽지 못했으면 선택기를 잠근다: 읽지 못한 목록에서 고르게 하면
   * 사용자가 "무소속"을 고른 것처럼 보이는 저장이 일어난다.
   * @param {string|null} selectedId
   */
  populateProjectPicker(selectedId) {
    const select = this.modal && this.modal.projectSelect;
    if (!select) return;

    select.textContent = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '무소속';
    select.appendChild(none);

    this.projects.forEach((project) => {
      const option = document.createElement('option');
      option.value = project.id;
      // 사용자 입력이다. textContent 로만 쓴다.
      option.textContent = project.name;
      select.appendChild(option);
    });

    select.value = selectedId && this.projects.some((p) => p.id === selectedId) ? selectedId : '';
    select.disabled = this.projectsLoadFailed;
  }

  /**
   * 관문 목록 렌더 (Task 4)
   *
   * **셋을 펼치고 나머지는 접는다.** 정렬은 `planned` 오름차순이고 `dropped` 는
   * 살아 있는 관문 **뒤로** 보낸다 — 계획은 남기되 먼저 보이지 않는다.
   *
   * 종류는 글자 라벨로만 구별하고 hue 를 주지 않는다. 전부 `textContent` 로 쓴다.
   * @param {CalendarEvent} event
   */
  renderGateEditor(event) {
    const editor = this.modal && this.modal.gateEditor;
    if (!editor) return;

    const gates = (event.gates || []).slice().sort((a, b) => {
      const aDropped = a.status === 'dropped' ? 1 : 0;
      const bDropped = b.status === 'dropped' ? 1 : 0;
      if (aDropped !== bDropped) return aDropped - bDropped;
      return a.planned < b.planned ? -1 : a.planned > b.planned ? 1 : 0;
    });

    editor.list.textContent = '';
    const head = gates.slice(0, 3);
    const rest = gates.slice(3);

    head.forEach((gate) => editor.list.appendChild(this.createGateItem(event.id, gate)));

    if (rest.length > 0) {
      const details = document.createElement('details');
      details.className = 'gate-more';
      const summary = document.createElement('summary');
      summary.textContent = `관문 ${rest.length}개 더 보기`;
      details.appendChild(summary);
      const more = document.createElement('ul');
      more.className = 'gate-list';
      rest.forEach((gate) => more.appendChild(this.createGateItem(event.id, gate)));
      details.appendChild(more);
      const wrapper = document.createElement('li');
      wrapper.appendChild(details);
      editor.list.appendChild(wrapper);
    }

    editor.hint.textContent =
      gates.length >= MAX_GATES_PER_EVENT
        ? `관문은 최대 ${MAX_GATES_PER_EVENT}개까지입니다`
        : '';
  }

  /**
   * 관문 한 줄
   * @param {string} eventId
   * @param {CalendarGate} gate
   * @returns {HTMLLIElement}
   */
  createGateItem(eventId, gate) {
    const item = document.createElement('li');
    item.className = 'gate-item';
    if (gate.status === 'done') item.classList.add('is-done');
    if (gate.status === 'dropped') item.classList.add('is-dropped');
    item.dataset.gateId = gate.id;

    const kind = document.createElement('span');
    kind.className = 'gate-kind';
    // 이름 없는 관문 — 마이그레이션은 이름을 지어내지 않는다 (DD2).
    kind.textContent = gate.kind || '이름 없음';
    item.appendChild(kind);

    const planned = document.createElement('span');
    planned.className = 'gate-planned';
    planned.textContent = gate.planned;
    item.appendChild(planned);

    const actualLabel = gateActualLabel(gate);
    if (actualLabel) {
      const actual = document.createElement('span');
      actual.className = 'gate-actual';
      actual.textContent = actualLabel;
      item.appendChild(actual);
    }

    const actions = document.createElement('div');
    actions.className = 'gate-actions';
    const add = (action, label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gate-action';
      button.dataset.gateAction = action;
      button.dataset.eventId = eventId;
      button.dataset.gateId = gate.id;
      button.textContent = label;
      actions.appendChild(button);
    };

    if (gate.status === 'done') add('undone', '되돌리기');
    else if (gate.status !== 'dropped') add('done', '완료');

    if (gate.status === 'dropped') add('restore', '복구');
    else add('drop', '범위축소');

    add('remove', '삭제');
    item.appendChild(actions);
    return item;
  }

  /**
   * 관문 편집기 배선. 목록은 매번 새로 그리므로 **위임**으로 건다.
   */
  setupGateEditorListeners() {
    const editor = this.modal && this.modal.gateEditor;
    if (!editor) return;

    editor.list.addEventListener('click', async (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('[data-gate-action]');
      if (!(button instanceof HTMLElement)) return;

      const action = button.dataset.gateAction;
      const eventId = button.dataset.eventId;
      const gateId = button.dataset.gateId;
      if (!action || !eventId || !gateId) return;

      // 편집기는 관문 CRUD 셋만 부르고 gates 를 직접 만지지 않는다.
      let committed = false;
      if (action === 'done') {
        committed = await this.updateGate(eventId, gateId, { status: 'done', actual: this.todayKey });
      } else if (action === 'undone') {
        committed = await this.updateGate(eventId, gateId, { status: 'pending', actual: null });
      } else if (action === 'drop') {
        // 날짜와 이름은 남긴다 — 범위축소는 삭제가 아니다 (DD5).
        committed = await this.updateGate(eventId, gateId, { status: 'dropped' });
      } else if (action === 'restore') {
        committed = await this.updateGate(eventId, gateId, { status: 'pending' });
      } else if (action === 'remove') {
        committed = await this.removeGate(eventId, gateId);
        if (!committed) {
          editor.hint.textContent = '마지막 관문은 지울 수 없습니다. 일정 자체를 지우려면 "일정 삭제"를 쓰세요.';
          return;
        }
      }

      if (!committed) {
        editor.hint.textContent = '관문을 저장하지 못했습니다. 변경 사항은 적용되지 않았습니다.';
        return;
      }
      this.refreshGateEditor(eventId, { gateId, action });
    });

    editor.add.addEventListener('click', async () => {
      const state = this.modalState;
      if (!state || !state.id) return;

      const planned = pickDateKey(editor.date.value);
      if (!planned) {
        editor.hint.textContent = '관문 날짜를 확인해 주세요.';
        return;
      }

      const gateCountOf = (id) => {
        const found = this.events.find((event) => event.id === id);
        return found ? (found.gates || []).length : 0;
      };
      const before = gateCountOf(state.id);

      const committed = await this.addGate(state.id, {
        kind: editor.kind.value || null,
        planned,
        actual: null,
        status: 'pending',
      });
      if (!committed) {
        editor.hint.textContent = `관문을 더하지 못했습니다. 최대 ${MAX_GATES_PER_EVENT}개이고, 가장 이른 관문에서 ${MAX_RANGE_DAYS}일을 넘을 수 없습니다.`;
        return;
      }

      // **커밋이 성공해도 관문이 늘지 않을 수 있다.** 같은 날짜의 이름 없는 관문은
      // 하나로 접히기 때문이다(DD25). 성공으로만 답하면 화면에 아무 변화가 없고
      // 설명도 없어 "저장된 척"이 된다 — 상한 초과를 알려 주는 것과 같은 이유로
      // 접힘도 말해야 한다.
      const added = gateCountOf(state.id) > before;
      this.refreshGateEditor(state.id);
      if (!added) {
        editor.hint.textContent = '같은 날짜의 이름 없는 관문은 하나로 접힙니다. 관문이 늘지 않았습니다.';
      }
    });
  }

  /**
   * 커밋 뒤 편집기를 다시 그린다. 이벤트가 사라졌으면 모달을 닫는다.
   * @param {string} eventId
   * @param {{gateId: string, action: string}} [focus] - 방금 누른 버튼. 목록을
   *   통째로 다시 그리므로 넘기지 않으면 포커스가 body 로 떨어진다.
   */
  refreshGateEditor(eventId, focus) {
    const next = this.events.find((event) => event.id === eventId);
    if (!next) {
      this.closeEventModal();
      return;
    }
    const editor = this.modal && this.modal.gateEditor;
    if (editor) editor.hint.textContent = '';
    this.renderGateEditor(next);
    // 관문을 만지면 파생 범위가 바뀐다 — 모달의 날짜 칸도 함께 따라간다.
    this.modal.startInput.value = next.startDate;
    this.modal.endInput.value = next.endDate;
    this.modal.startInput.readOnly = eventHasUserGateWork(next);
    this.modal.endInput.readOnly = this.modal.startInput.readOnly;
    if (editor && focus) this.restoreGateFocus(editor, focus);
  }

  /**
   * 관문 목록을 다시 그린 뒤 포커스를 되돌린다
   *
   * `renderGateEditor()` 가 목록을 통째로 버리므로 방금 누른 버튼이 사라지고
   * 포커스가 body 로 떨어진다. 키보드 사용자는 관문 하나를 만질 때마다 모달을
   * 처음부터 다시 훑게 된다 — 모달이 이미 `modalReturnFocus` 로 같은 규약을
   * 쓰고 있으므로 여기만 예외로 둘 근거가 없다.
   *
   * 액션은 누르면 짝으로 바뀌므로(완료·되돌리기 / 범위축소·복구) 같은 관문의
   * **짝 버튼**을 찾는다. 삭제는 짝이 없어 관문 추가 버튼으로 보낸다.
   * 선택자를 조립하지 않고 순회로 찾는다 — 관문 id 는 남의 파일에서 올 수 있고,
   * 이 저장소는 신뢰 불가 문자열로 선택자를 만들지 않는다.
   * @param {{list: HTMLElement, add: HTMLButtonElement}} editor
   * @param {{gateId: string, action: string}} focus
   */
  restoreGateFocus(editor, focus) {
    const wanted = GATE_ACTION_PAIRS[focus.action] || focus.action;
    const match = Array.from(editor.list.querySelectorAll('[data-gate-action]')).find(
      (button) => button.dataset.gateId === focus.gateId && button.dataset.gateAction === wanted
    );
    if (!match) {
      editor.add.focus();
      return;
    }
    // 넷째부터는 details 안에 접혀 있다. 펼치지 않으면 포커스가 가지 않는다.
    const details = match.closest('details');
    if (details) details.open = true;
    match.focus();
  }

  /**
   * 상세 모달 닫기 (저장하지 않음)
   */
  closeEventModal() {
    if (!this.modal) return;

    this.modal.root.classList.remove('active');
    this.modalState = null;

    // 모달을 연 요소로 포커스를 되돌린다. 그 사이 render()가 셀을 새로 만들었으면
    // 그 노드는 이미 문서에 없으므로 현재 포커스 날짜로 대신 보낸다.
    const target = this.modalReturnFocus;
    this.modalReturnFocus = null;
    if (target && document.contains(target)) {
      target.focus();
    } else {
      this.focusDayCell(this.focusKey);
    }
  }

  /**
   * @param {string} priority
   */
  setModalPriority(priority) {
    if (!this.modal) return;
    this.modal.root.querySelectorAll('input[name="calendarEventPriority"]').forEach((radio) => {
      if (radio instanceof HTMLInputElement) radio.checked = radio.value === priority;
    });
  }

  /**
   * @returns {string}
   */
  getModalPriority() {
    if (!this.modal) return 'normal';
    const checked = this.modal.root.querySelector('input[name="calendarEventPriority"]:checked');
    if (checked instanceof HTMLInputElement && PRIORITIES.indexOf(checked.value) !== -1) {
      return checked.value;
    }
    return 'normal';
  }

  /**
   * 메모 글자 수 표시. 비어 있으면 아무 말도 하지 않는다.
   */
  updateNoteCount() {
    const modal = this.modal;
    if (!modal) return;

    const length = modal.noteInput.value.length;
    if (length === 0) {
      modal.noteCount.textContent = '';
      return;
    }
    modal.noteCount.textContent =
      length >= MAX_NOTE_LENGTH
        ? `${length} / ${MAX_NOTE_LENGTH}자 — 상한에 도달했습니다`
        : `${length} / ${MAX_NOTE_LENGTH}자`;
  }

  /**
   * @param {string} message
   */
  showModalError(message) {
    if (!this.modal) return;
    this.modal.error.textContent = message;
    this.modal.error.hidden = false;
  }

  hideModalError() {
    if (!this.modal) return;
    this.modal.error.hidden = true;
  }

  /**
   * 상세 모달 저장
   *
   * 범위 상한과 앞뒤 역전은 여기서 **말해 준다**. createCalendarEvent()는 조용히
   * 잘라 맞추지만 그건 신뢰 불가 입력(가져오기)용 방어선이고, 사람이 직접 친
   * 값을 소리 없이 바꾸면 저장된 것과 화면에 적은 것이 달라진다.
   */
  async submitEventModal() {
    const modal = this.modal;
    if (!modal || !this.modalState) return;

    const title = modal.titleInput.value.trim();
    if (!title) {
      this.showModalError('제목을 입력해 주세요. 제목 없이는 저장할 수 없습니다.');
      modal.titleInput.focus();
      return;
    }

    const startDate = pickDateKey(modal.startInput.value);
    const endDate = pickDateKey(modal.endInput.value);
    if (!startDate || !endDate) {
      this.showModalError('날짜를 확인해 주세요. 시작일과 종료일이 모두 필요합니다.');
      return;
    }
    if (endDate < startDate) {
      this.showModalError('종료일이 시작일보다 빠릅니다. 저장하지 않았습니다.');
      modal.endInput.focus();
      return;
    }
    if (spanDays(startDate, endDate) > MAX_RANGE_DAYS) {
      this.showModalError(`일정 하나는 최대 ${MAX_RANGE_DAYS}일까지입니다. 저장하지 않았습니다.`);
      modal.endInput.focus();
      return;
    }

    const projectId = modal.projectSelect ? modal.projectSelect.value || null : null;

    /** @type {any} */
    const input = {
      startDate,
      endDate,
      title,
      note: modal.noteInput.value,
      priority: this.getModalPriority(),
      projectId,
    };

    // 재합성 여부는 **DOM 이 아니라 저장 직전의 이벤트에서 다시 계산한다.**
    // `modal.startInput.readOnly` 를 읽던 예전 코드는 판단 근거를 화면 상태에
    // 맡겼다 — 그 속성이 무슨 이유로든 실제 이벤트와 어긋나면 사용자가 친 날짜가
    // 조용히 버려지거나 관문이 조용히 재구성된다. 근거는 readOnly 를 세운 것과
    // **같은 술어**여야 한다.
    const existingForSave =
      this.modalState.mode === 'edit' && this.modalState.id
        ? this.events.find((event) => event.id === this.modalState.id)
        : null;
    const derivedRange = existingForSave ? eventHasUserGateWork(existingForSave) : false;

    if (derivedRange) {
      // 파생 범위인데 값이 달라졌다면 **말해 준다.** 조용히 무시하면 저장된 것과
      // 화면에 적은 것이 갈린다 — 이 함수 머리말이 금지한 바로 그것이다.
      if (startDate !== existingForSave.startDate || endDate !== existingForSave.endDate) {
        this.showModalError('기간은 관문에서 파생됩니다. 날짜는 관문 편집기에서 바꿔 주세요.');
        return;
      }
    } else {
      // 친 범위로 관문을 **다시 만든다.** `gates` 를 소유 속성으로 넘기는 것이 그
      // 신호이고, 키 자체를 넘기지 않으면 기존 관문이 그대로 이긴다.
      input.gates = undefined;
    }

    const committed =
      this.modalState.mode === 'edit' && this.modalState.id
        ? await this.updateEvent(this.modalState.id, input)
        : await this.addEvent(input);

    // 실패하면 모달을 닫지 않는다. 닫으면 사용자가 적은 내용이 사라진 채로
    // "저장된 척"이 된다 (원칙 4).
    if (!committed) {
      this.showModalError('저장하지 못했습니다. 변경 사항은 적용되지 않았습니다.');
      return;
    }

    // 마지막에 쓴 프로젝트를 기억한다 (UI8). 실패해도 저장 자체는 이미 끝났으므로
    // 여기서 되돌리지 않는다 — 기본값 하나가 다음 번에 무소속으로 뜰 뿐이다.
    if (projectId) await this.setLastUsedProjectId(projectId);

    // 방금 저장한 일정이 보이는 자리로 뷰를 옮긴다
    const start = parseDateKey(startDate);
    this.viewYear = start.getFullYear();
    this.viewMonth = start.getMonth();
    this.clearRangeSelection();
    this.selectedKey = startDate;
    this.focusKey = startDate;
    this.render();
    this.closeEventModal();
  }

  /**
   * 상세 모달에서 삭제
   */
  async deleteFromModal() {
    if (!this.modalState || !this.modalState.id) return;

    const committed = await this.deleteEvent(this.modalState.id);
    if (!committed) {
      this.showModalError('삭제하지 못했습니다. 변경 사항은 적용되지 않았습니다.');
      return;
    }
    this.closeEventModal();
  }

  /**
   * 모달 안 키 처리 — Esc 닫기 + Tab 포커스 트랩
   * @param {KeyboardEvent} e
   */
  handleModalKeydown(e) {
    if (!this.isModalOpen()) return;

    if (e.key === 'Escape') {
      // 달력 패널의 Esc와 겹치지 않게 여기서 멈춘다. 모달은 달력 루트 밖에 있어
      // 구조적으로도 안 겹치지만, 나중에 위치가 바뀌어도 순서가 유지되게 해 둔다.
      e.preventDefault();
      e.stopPropagation();
      this.closeEventModal();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusable = this.getModalFocusable();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /**
   * 모달 안에서 실제로 포커스를 받을 수 있는 요소들
   * @returns {HTMLElement[]}
   */
  getModalFocusable() {
    if (!this.modal) return [];

    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    /** @type {HTMLElement[]} */
    const focusable = [];
    this.modal.root.querySelectorAll(selector).forEach((element) => {
      // hidden(삭제 버튼)과 display:none 조상 아래의 요소는 실제로 포커스를 못 받는다
      if (element instanceof HTMLElement && !element.hidden && element.offsetParent !== null) {
        focusable.push(element);
      }
    });
    return focusable;
  }

  /**
   * Shift+방향키 범위 선택 해제
   */
  clearRangeSelection() {
    this.rangeAnchorKey = null;
    this.rangeEndKey = null;
  }

  /**
   * 현재 잡혀 있는 범위 (정렬된 [시작, 끝]). 없으면 null
   * @returns {{from: string, to: string}|null}
   */
  getSelectedRange() {
    if (!this.rangeAnchorKey || !this.rangeEndKey) return null;
    return this.rangeAnchorKey <= this.rangeEndKey
      ? { from: this.rangeAnchorKey, to: this.rangeEndKey }
      : { from: this.rangeEndKey, to: this.rangeAnchorKey };
  }

  /**
   * 이벤트 목록 로드
   *
   * 실패하면 **빈 목록으로 강등하지 않는다.** 예전에는 catch가 `this.events = []`를
   * 정상 상태로 만들었고, 그 뒤 할 일을 하나만 추가해도 `[한 건]`이 커밋되어
   * 저장돼 있던 일정이 전부 사라졌다. 지금은 loadFailed를 세워 쓰기를 막는다.
   * @returns {Promise<boolean>} 로드 성공 여부
   */
  async loadEvents() {
    try {
      const result = await storage.get(['calendarEvents']);
      const stored = result.calendarEvents;

      // 값이 없는 것(첫 실행)과 배열이 아닌 것(손상)은 다르다. 후자를 조용히
      // 빈 배열로 바꾸면 reject 없이 같은 소실 경로로 들어간다.
      if (stored !== undefined && !Array.isArray(stored)) {
        throw new Error('저장된 일정 형식이 올바르지 않습니다 (배열이 아님)');
      }

      // 마이그레이션이 실패했거나(스토리지 오류) 구버전이 쓴 값이 남아 있어도
      // 메모리에는 항상 v3 한 가지 형태만 둔다. 렌더 경로가 필드 유무를 검사하지
      // 않아도 되게 하려면 형태가 갈라지는 지점이 없어야 한다.
      const raw = stored || [];
      // **여기서 false 다.** 이 Task가 SETTINGS_VERSION = 4와 시동 마이그레이션을
      // 함께 세우므로 이 줄부터 저장소는 v4이고, `gates` 없는 행은 레거시가 아니라
      // **손상**이다. 세 변경(상수 · 시동 배선 · 이 뒤집기)은 한 커밋에 함께 간다 —
      // 앞 Task에 두면 v4가 아직 없는 구간에서 기존 v3 행이 전부 손상으로 판정되어
      // 달력이 잠기고 DD14가 약속한 "Task 1~2까지는 옛 경로로 그대로 돈다"가 깨진다.
      let dropped = 0;
      this.events = raw
        .map((event) => {
          const next = createCalendarEvent(event, { allowLegacyGateSynthesis: false });
          if (!next) dropped += 1;
          return next;
        })
        .filter((event) => event !== null);

      // **버린 것이 하나라도 있으면 봉인한다.** 예전에는 filter로 버린 뒤 곧바로
      // loadFailed = false를 세웠고, 그러면 손상 이벤트가 조용히 사라진 채 앱이
      // 열리고 사용자가 아무 일정이나 한 번 고치는 순간 짧아진 배열이 커밋되어
      // 그 이벤트가 영구히 지워진다. 잠금 해제 경로는 이미 있다 —
      // persistEvents()의 isFullReplacement가 통과시키므로 가져오기가 곧 복구다.
      if (dropped > 0) {
        console.error(`Calendar load: dropped ${dropped} corrupted event(s)`);
        this.loadFailed = true;
        this.showError(
          `일정 ${dropped}건을 읽지 못해 저장이 잠겨 있습니다. 파일에서 가져오면 복구됩니다.`
        );
        return false;
      }

      this.loadFailed = false;
      this.hideError();
      return true;
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      this.loadFailed = true;
      this.showError('할 일을 불러오지 못했습니다. 저장이 잠겨 있습니다 — 다시 시도해 주세요.');
      return false;
    }
    // 인덱스는 renderGrid()가 렌더 창을 알게 된 뒤에 만든다.
  }

  /**
   * 프로젝트 목록 로드 (DD27a)
   *
   * `loadEvents()`와 **같은 규율**이다 — 값이 없는 것(첫 실행)과 배열이 아닌
   * 것(손상)을 가르고, 후자를 조용히 `[]`로 바꾸지 않는다.
   * @returns {Promise<boolean>} 로드 성공 여부
   */
  async loadProjects() {
    try {
      const result = await storage.get(['calendarProjects', 'lastUsedProjectId']);
      const stored = result.calendarProjects;

      if (stored !== undefined && !Array.isArray(stored)) {
        throw new Error('저장된 프로젝트 형식이 올바르지 않습니다 (배열이 아님)');
      }

      const raw = stored || [];
      let dropped = 0;
      /** @type {CalendarProject[]} */
      const projects = [];
      raw.forEach((row) => {
        // **각 행을 생성 게이트에 넘기기 전에 id 를 먼저 본다.**
        // createCalendarProject()는 id 부재 시 새로 만들어 주므로(DD20) 그것에
        // 맡기면 손상된 행이 새 id 를 달고 되살아나 봉인이 발화하지 않고, 옛 id 를
        // 든 이벤트들이 다음 강등에서 전건 무소속이 된다. id 자동 생성은
        // **만들 때의 규칙이지 읽을 때의 규칙이 아니다.**
        if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id) {
          dropped += 1;
          return;
        }
        const project = createCalendarProject(row);
        if (!project) {
          dropped += 1;
          return;
        }
        projects.push(project);
      });

      // **상한 절단도 "온전히 읽지 못한 것"이다.** dropped 와 같은 취급을 하지
      // 않으면 51번째 이후 프로젝트가 조용히 사라진 채 봉인이 서지 않고, 그 목록을
      // 아는 프로젝트 전부로 믿은 reconcileProjectRefs()가 그것을 가리키던 이벤트를
      // 무소속으로 내린다. 쓰기 경로가 상한을 지키므로 도달은 드물지만, 드문 것과
      // 막지 않는 것은 다르다.
      const truncated = Math.max(0, projects.length - MAX_PROJECTS);
      this.projects = projects.slice(0, MAX_PROJECTS);
      this.lastUsedProjectId =
        typeof result.lastUsedProjectId === 'string' && result.lastUsedProjectId
          ? result.lastUsedProjectId
          : null;

      // 배열이 맞아도 항목이 손상됐으면 **저장된 것을 온전히 읽지 못한 것**이고,
      // 그 목록을 근거로 강등하면 저장소에 멀쩡히 있는 프로젝트를 가리키던
      // 이벤트가 전건 무소속으로 내려앉는다.
      if (dropped > 0 || truncated > 0) {
        console.error(
          `Calendar: project list not fully read (corrupted=${dropped}, truncated=${truncated})`
        );
        this.projectsLoadFailed = true;
        return false;
      }

      this.projectsLoadFailed = false;
      return true;
    } catch (error) {
      console.error('Failed to load calendar projects:', error);
      // 예외를 던지지 않고 빈 목록으로 두되 **플래그를 세운다.**
      this.projects = [];
      this.projectsLoadFailed = true;
      return false;
    }
  }

  /**
   * 프로젝트를 바꾸는 **유일한** 쓰기 경로 (DD27)
   *
   * 본문은 세 줄이고 **순서가 계약이다**:
   * 1. 읽지 못한 것을 덮어쓰지 않는다 (DD27a). 가드가 없으면 목록을 읽지 못한
   *    상태에서 프로젝트 하나를 만드는 것만으로 `calendarProjects` 전체가 그 한
   *    건으로 덮여 사라진다
   * 2. 커밋 직전에 참조를 정리한다 (DD28)
   * 3. 대입은 `persistEvents` 안에서 한다 (DD27b) — 여기서 하면 그 안의
   *    `render()`보다 늦어 화면이 옛 목록을 그린다
   *
   * `async`도 필수다 — `persistEvents`가 `async`라 반환값을 그냥 `if`로 보면
   * Promise 가 언제나 참이다.
   * @param {CalendarProject[]} nextProjects
   * @returns {Promise<boolean>} 커밋 성공 여부
   */
  async persistProjects(nextProjects) {
    if (this.projectsLoadFailed) return false;
    return this.persistEvents(
      reconcileProjectRefs(this.events, nextProjects, { projectsLoaded: !this.projectsLoadFailed }),
      { nextProjects }
    );
  }

  /**
   * 관문 추가 (DD26의 **둘째 호출 자리**)
   *
   * 세 단계이고 셋이 같다. 단계를 공통 헬퍼로 접지 않는 이유는, DD25의 접기와
   * DD26의 파생이 **세 자리 각각에서** 일어나야 하고 그것을 자리마다 읽을 수
   * 있어야 하기 때문이다.
   *
   * 1. 다음 관문 배열을 **새로 만든다** — `push`/`splice` 로 제자리 변형하지
   *    않는다. 제자리 변형은 2번을 건너뛸 수 있는 유일한 길이다
   * 2. `normalizeGates()` 를 통과시킨다 (DD36). `createCalendarEvent()` 가 부르는
   *    것과 **같은 함수**이므로 가져오기와 편집기가 같은 답을 낸다
   * 3. 빈 배열이면 커밋하지 않고 `false` (DD5)
   * @param {string} eventId
   * @param {{kind?: string|null, planned: string, actual?: string|null, status?: string}} input
   * @returns {Promise<boolean>}
   */
  async addGate(eventId, input) {
    const existing = this.events.find((event) => event.id === eventId);
    if (!existing) return false;

    const nextGates = normalizeGates((existing.gates || []).concat([input]));
    if (nextGates.length === 0) return false;

    const next = { ...existing, gates: nextGates, updatedAt: Date.now() };
    next.done = deriveEventDone(nextGates);
    deriveEventRange(next);

    return this.persistEvents(this.events.map((event) => (event.id === eventId ? next : event)));
  }

  /**
   * 관문 수정 — 완료 표시(`actual` + `status:'done'`)와 범위축소(`status:'dropped'`)가
   * 전부 이 경로를 탄다. 자동 재배치는 하지 않는다 (UI6) — 관문 하나를 옮겨도
   * 다른 관문은 그대로 있다.
   * @param {string} eventId
   * @param {string} gateId
   * @param {{kind?: string|null, planned?: string, actual?: string|null, status?: string}} patch
   * @returns {Promise<boolean>}
   */
  async updateGate(eventId, gateId, patch) {
    const existing = this.events.find((event) => event.id === eventId);
    if (!existing) return false;
    if (!(existing.gates || []).some((gate) => gate.id === gateId)) return false;

    // id 는 patch 가 덮지 못한다 — 덮으면 같은 관문이 둘로 갈린다.
    const nextGates = normalizeGates(
      existing.gates.map((gate) => (gate.id === gateId ? { ...gate, ...patch, id: gate.id } : gate))
    );
    if (nextGates.length === 0) return false;

    const next = { ...existing, gates: nextGates, updatedAt: Date.now() };
    next.done = deriveEventDone(nextGates);
    deriveEventRange(next);

    return this.persistEvents(this.events.map((event) => (event.id === eventId ? next : event)));
  }

  /**
   * 관문 삭제
   *
   * **마지막 관문은 지워지지 않는다** — 결과가 빈 배열이면 커밋하지 않고 `false` 를
   * 돌려준다 (DD5). 커밋하면 다음 적재에서 `createCalendarEvent()` 가 그 행을
   * `null` 로 버려 **이벤트가 통째로 사라진다.**
   * @param {string} eventId
   * @param {string} gateId
   * @returns {Promise<boolean>}
   */
  async removeGate(eventId, gateId) {
    const existing = this.events.find((event) => event.id === eventId);
    if (!existing) return false;

    const nextGates = normalizeGates((existing.gates || []).filter((gate) => gate.id !== gateId));
    if (nextGates.length === 0) return false;

    const next = { ...existing, gates: nextGates, updatedAt: Date.now() };
    next.done = deriveEventDone(nextGates);
    deriveEventRange(next);

    return this.persistEvents(this.events.map((event) => (event.id === eventId ? next : event)));
  }

  /**
   * 프로젝트 생성
   * @param {{name: string}} input
   * @returns {Promise<boolean>}
   */
  async addProject(input) {
    const project = createCalendarProject(input);
    if (!project) return false;
    if (this.projects.length >= MAX_PROJECTS) return false;
    return this.persistProjects(this.projects.concat(project));
  }

  /**
   * 프로젝트 이름 변경. 참조는 id 로 걸려 있으므로 이벤트를 훑지 않는다 (DD7)
   *
   * **아직 호출부가 없다.** 프로젝트 관리 화면이 다음 단계이고, 그 화면이 부를
   * 쓰기 경로를 여기 미리 세워 둔 것이다. 그 사실을 적어 두지 않으면 다음 사람이
   * 죽은 코드로 읽고 지운다.
   * @param {string} id
   * @param {string} name
   * @returns {Promise<boolean>}
   */
  async renameProject(id, name) {
    const existing = this.projects.find((project) => project.id === id);
    if (!existing) return false;

    const next = createCalendarProject({ id: existing.id, name });
    if (!next) return false;

    return this.persistProjects(this.projects.map((project) => (project.id === id ? next : project)));
  }

  /**
   * 프로젝트 삭제
   *
   * 그 프로젝트를 가리키던 이벤트는 **무소속으로 강등되고 지워지지 않는다** (DD7) —
   * 재생 불가 데이터다. 강등은 `persistProjects()`가 부르는
   * `reconcileProjectRefs()`가 하므로 여기서 다시 하지 않는다.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async removeProject(id) {
    if (!this.projects.some((project) => project.id === id)) return false;

    const committed = await this.persistProjects(this.projects.filter((project) => project.id !== id));
    // 지운 프로젝트가 기본값이었다면 무소속으로 내려간다 (UI8).
    if (committed && this.lastUsedProjectId === id) await this.setLastUsedProjectId(null);
    return committed;
  }

  /**
   * 새 이벤트의 기본 프로젝트 (UI8)
   *
   * 마지막에 쓴 프로젝트이고, 그것이 사라졌으면 무소속(`null`)으로 떨어진다.
   * @returns {string|null}
   */
  defaultProjectId() {
    if (this.lastUsedProjectId && this.projects.some((project) => project.id === this.lastUsedProjectId)) {
      return this.lastUsedProjectId;
    }
    return null;
  }

  /**
   * 마지막 사용 프로젝트 기록
   *
   * 이벤트와 무관한 **설정**이므로 `persistEvents()`의 스냅샷에 넣지 않는다.
   * @param {string|null} id
   * @returns {Promise<boolean>}
   */
  async setLastUsedProjectId(id) {
    const next = typeof id === 'string' && id ? id : null;
    try {
      await storage.set({ lastUsedProjectId: next });
      this.lastUsedProjectId = next;
      return true;
    } catch (error) {
      console.error('Failed to save lastUsedProjectId:', error);
      return false;
    }
  }

  /**
   * 렌더 창과 겹치는 이벤트를 **관문 날짜** 버킷에 담는다 (DD31)
   *
   * 점유의 근거는 파생 `startDate..endDate` 범위가 아니라 `gates[].planned` 다.
   * 전반부 DD4가 연속 범위를 파생값으로 강등한 것은 v3 롤백용 잔존 필드를 남기기
   * 위해서이지 점유의 근거로 삼기 위해서가 아니다 — 잔존 필드로 셀을 채우면 저장은
   * 관문으로 하면서 화면은 여전히 범위로 말하므로 사용자가 보는 것은 M1과 같다.
   *
   * 'YYYY-MM-DD'는 사전순 비교가 곧 시간순 비교라 문자열 그대로 겹침을 판정한다.
   * @param {string} windowStartKey - 그리드 첫 칸
   * @param {string} windowEndKey   - 그리드 마지막 칸
   */
  rebuildIndex(windowStartKey, windowEndKey) {
    this.eventsByDate = new Map();
    if (!windowStartKey || !windowEndKey) return;

    this.events.forEach((event) => {
      // 창 밖이면 전개 자체를 하지 않는다. 파생 범위는 여기서 **겹침 판정에만** 쓴다 —
      // 모든 관문의 planned 는 그 범위 안에 있으므로(deriveEventRange) 이 컷은
      // 관문을 하나도 잃지 않으면서 5,000건 × 366일을 42칸 창으로 자르는 상한을 지킨다.
      if (event.endDate < windowStartKey || event.startDate > windowEndKey) return;

      // 이벤트별로 planned 를 **집합으로 접는다.** 전반부 DD25가 같은 날 dev·review 를
      // 허용하므로 관문 단위로 넣으면 한 이벤트가 같은 버킷에 두 번 들어가고, 그리드는
      // 칩을 둘 그리는데 getEventsForDate() 는 .some(...) 이라 패널에 하나를 낸다 —
      // DD32가 막으려는 바로 그 불일치가 다른 입구로 돌아온다. 접는 것은 **이벤트
      // 안에서만**이다: 서로 다른 이벤트가 같은 날에 서는 것은 그대로 버킷 길이 둘이다.
      //
      // dropped 관문의 날짜도 넣는다 — **계획은 남는다.** 안 하기로 한 것과 애초에
      // 없던 것은 다르고, 그 구분이 PRD가 M2에 요구한 "범위축소가 구분되어 남는다"의
      // 화면 쪽 몫이다.
      const plannedDates = new Set();
      (event.gates || []).forEach((gate) => {
        if (gate && gate.planned) plannedDates.add(gate.planned);
      });

      plannedDates.forEach((dateKey) => {
        // 창 절단은 그대로 유지한다 — 관문으로 바꾸는 것은 *무엇을* 넣는가이지
        // *얼마나* 넣는가가 아니다. 이 줄을 지우면 상한이 사라지고 성능 회귀가 난다.
        if (dateKey < windowStartKey || dateKey > windowEndKey) return;

        const bucket = this.eventsByDate.get(dateKey);
        if (bucket) {
          bucket.push(event);
        } else {
          this.eventsByDate.set(dateKey, [event]);
        }
      });
    });
  }

  /**
   * 특정 날짜에 **관문이 선** 이벤트 (렌더 창과 무관) — DD32
   *
   * 점유를 읽는 자리는 둘이고 둘 다 관문으로 판정해야 한다. 그리드(`rebuildIndex()`)만
   * 바꾸면 그리드는 화요일을 비워 두는데 화요일 칸을 누르면 패널에 그 이벤트가 나온다.
   * 한 날짜에 대해 그리드와 패널이 다른 답을 내면 불연속 배치는 반쯤 구현된 것이고,
   * 사용자가 보는 것은 버그다.
   *
   * **창 인덱스를 우회하는 구조는 그대로 둔다** — 패널은 월을 넘겨도 열려 있을 수 있어
   * 선택 날짜가 렌더 창 밖일 수 있고, 창 인덱스로 조회하면 그 경우 빈 목록이 나온다.
   * 바뀌는 것은 조회 규칙이지 우회 여부가 아니다.
   * @param {string} dateKey
   * @returns {CalendarEvent[]}
   */
  getEventsForDate(dateKey) {
    return this.events.filter((event) =>
      (event.gates || []).some((gate) => gate && gate.planned === dateKey)
    );
  }

  /**
   * 이벤트 영속화 — 스냅샷 기반 상태 머신
   *
   * 성공해야만 메모리/인덱스/DOM을 커밋한다. 실패 시 아무것도 건드리지 않으므로
   * 롤백이 자동으로 성립한다. pending 중에는 새 편집을 차단해 재시도가 엉뚱한
   * 스냅샷을 커밋하는 것을 막는다.
   *
   * @param {CalendarEvent[]} nextEvents - 새 배열 (기존 배열 in-place 변형 금지)
   * @param {{isFullReplacement?: boolean, nextProjects?: CalendarProject[]}} [options]
   *   `isFullReplacement` — 전체 교체(가져오기)는 loadFailed 잠금을 통과한다.
   *   기존 목록에서 파생되지 않으므로 읽기 성공에 의존하지 않고, 읽기가 영구히
   *   깨졌을 때 유일한 복구 수단이다.
   *   `nextProjects` — 함께 커밋할 프로젝트 목록 (DD22·DD27). 서명은 바꾸지
   *   않는다: 원자성은 `set()` 호출이 **하나라는 사실**에서 나오고, 개명하면
   *   `opSeq`·`loadFailed`·롤백 규약을 쓰는 기존 호출부 전부가 회귀 위험에 든다.
   * @returns {Promise<boolean>} 커밋 성공 여부
   */
  async persistEvents(nextEvents, options) {
    if (this.pending) return false;

    // 읽기가 실패한 상태의 this.events는 저장된 내용이 아니다. 거기서 파생된
    // 쓰기는 남아 있는 일정을 지운다.
    if (this.loadFailed && !(options && options.isFullReplacement)) {
      this.showError('할 일을 불러오지 못해 저장이 잠겨 있습니다. 다시 시도하거나 파일에서 가져오세요.');
      return false;
    }

    // 프로젝트를 함께 커밋하는 분기에는 **프로젝트 쪽 봉인도 여기 건다.**
    // 봉인이 persistProjects()에만 있으면 nextProjects 를 넘기는 새 호출부 하나가
    // 그것을 조용히 무력화한다 — 인자를 받는 함수가 그 인자의 전제를 지키는 것이
    // 호출부 규율보다 강하다 (security-reviewer F4·F6).
    const nextProjects = options ? options.nextProjects : undefined;
    if (nextProjects !== undefined) {
      if (!Array.isArray(nextProjects)) {
        throw new TypeError('persistEvents: options.nextProjects 는 배열이어야 한다');
      }
      if (this.projectsLoadFailed) {
        this.showError('프로젝트 목록을 읽지 못해 프로젝트 변경이 잠겨 있습니다.');
        return false;
      }
    }

    const opToken = ++this.opSeq;
    this.pending = { nextEvents, opToken };
    this.setPendingState(true);

    try {
      // **set() 호출은 어느 분기에서도 정확히 하나다.** 둘로 나누면 사이에서
      // 죽었을 때 이벤트만 커밋되고 프로젝트가 남는 반쪽 상태가 생긴다.
      const payload = { calendarEvents: nextEvents };
      if (nextProjects) payload.calendarProjects = nextProjects;
      await storage.set(payload);
      if (opToken !== this.opSeq) return false;

      this.events = nextEvents;
      // DD27b — 대입은 **여기서**, 아래 render() 보다 앞에서 한다.
      if (nextProjects) this.projects = nextProjects;
      this.pending = null;
      // 전체 교체가 성공했다면 저장소 내용이 확정됐다 — 잠금을 푼다.
      this.loadFailed = false;
      this.setPendingState(false);
      this.hideError();
      this.render();
      return true;
    } catch (error) {
      console.error('Failed to save calendar events:', error);
      if (opToken !== this.opSeq) return false;

      // this.events / 인덱스 / DOM 미변경 = 자동 롤백.
      // pending은 유지해 재시도가 동일 payload를 재전송하게 한다.
      this.setPendingState(false);
      this.showError('할 일을 저장하지 못했습니다. 변경 사항은 적용되지 않았습니다.');
      return false;
    }
  }

  /**
   * 배너의 "다시 시도" — 무엇을 재시도할지는 실패 종류가 정한다
   *
   * 버튼은 하나인데 실패는 둘이다. 읽기 실패가 우선한다 — 그 상태에서 쓰기를
   * 재시도해 봐야 persistEvents()가 잠금에 걸려 즉시 false를 반환하고,
   * 아무 일도 안 하는 버튼이 된다.
   */
  async retryFailedOperation() {
    if (this.loadFailed) {
      const ok = await this.loadEvents();
      if (ok) this.render();
      return;
    }
    await this.retryPersist();
  }

  /**
   * 실패한 저장을 정확히 같은 payload로 재시도
   */
  async retryPersist() {
    if (!this.pending) return;
    const { nextEvents } = this.pending;
    this.pending = null;
    await this.persistEvents(nextEvents);
  }

  /**
   * 저장 진행/실패 중 입력 차단 상태 반영
   * @param {boolean} isPending
   */
  setPendingState(isPending) {
    this.root.classList.toggle('is-pending', isPending);
    if (this.todoInputElement instanceof HTMLInputElement) {
      this.todoInputElement.disabled = isPending;
    }
  }

  /**
   * 오류 배너 노출
   * @param {string} message
   */
  showError(message) {
    if (!this.errorElement || !this.errorTextElement) return;
    this.errorTextElement.textContent = message;
    this.errorElement.hidden = false;
    // 배너는 오버레이라 자리를 차지하지 않는다. 다만 할 일 입력 폼은 가리면
    // 안 되므로(재입력 수단이다) 패널만 그만큼 비켜준다 — CSS가 처리한다.
    this.root.classList.add('has-error');
  }

  /**
   * 오류 배너 숨김
   */
  hideError() {
    if (!this.errorElement) return;
    this.errorElement.hidden = true;
    this.root.classList.remove('has-error');
  }

  /**
   * 할 일 추가
   *
   * 객체 하나만 받는다. 간편 입력(제목만)과 상세 모달(범위·중요도·메모)이 같은
   * 경로를 타야 두 입력이 만든 이벤트의 형태가 갈라지지 않는다.
   * @param {{startDate: string, endDate?: string, title: string, priority?: string, note?: string}} input
   * @returns {Promise<boolean>} 커밋 성공 여부
   */
  async addEvent(input) {
    // **이 줄이 없으면 이 Task 직후부터 새 일정을 만들 수 없다.** 상세 모달과
    // 간편 입력은 `gates`를 만들지 않고 범위 필드만 주는데, createCalendarEvent의
    // 기본값이 false라 그 입력은 전부 "v4인데 gates가 없다 = 손상"으로 떨어진다.
    const event = createCalendarEvent(input, { allowLegacyGateSynthesis: true });
    if (!event) return false;

    return this.persistEvents(this.events.concat(event));
  }

  /**
   * 기존 이벤트 수정 (상세 모달)
   * @param {string} id
   * @param {{startDate: string, endDate?: string, title: string, priority?: string, note?: string}} input
   * @returns {Promise<boolean>}
   */
  async updateEvent(id, input) {
    const existing = this.events.find((event) => event.id === id);
    if (!existing) return false;

    // id·createdAt·done은 보존하고 편집 가능한 필드만 덮는다.
    // 관문·프로젝트는 이 경로에서 편집하지 않는다 — 관문은 Task 4의 CRUD 셋이,
    // 프로젝트는 선택기가 갖는다. 여기서는 기존 값을 그대로 물려준다.
    // allowLegacyGateSynthesis는 gates를 함께 넘기지 않는 호출(간편 편집)을 위해
    // 남긴다 — 넘기면 그쪽이 이기므로 관문이 있는 이벤트는 영향받지 않는다.
    const next = createCalendarEvent(
      {
        ...input,
        id: existing.id,
        // **소유 속성 유무가 신호다.** `gates: undefined`를 명시적으로 넘기면
        // "범위에서 다시 만들라"는 뜻이고, 키 자체를 넘기지 않으면 기존 관문이
        // 그대로 이긴다. `??`로 쓰면 둘을 구별할 수 없어 모달에서 친 날짜가
        // 조용히 무시된다.
        gates: Object.prototype.hasOwnProperty.call(input, 'gates') ? input.gates : existing.gates,
        projectId: Object.prototype.hasOwnProperty.call(input, 'projectId')
          ? input.projectId
          : existing.projectId,
        done: existing.done,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
        externalId: existing.externalId,
      },
      { allowLegacyGateSynthesis: true }
    );
    if (!next) return false;

    return this.persistEvents(this.events.map((event) => (event.id === id ? next : event)));
  }

  /**
   * 할 일 완료 토글
   * @param {string} id
   */
  async toggleEvent(id) {
    const nextEvents = this.events.map((event) =>
      event.id === id ? { ...event, done: !event.done, updatedAt: Date.now() } : event
    );
    await this.persistEvents(nextEvents);
  }

  /**
   * 할 일 삭제
   * @param {string} id
   * @returns {Promise<boolean>} 커밋 성공 여부
   */
  async deleteEvent(id) {
    return this.persistEvents(this.events.filter((event) => event.id !== id));
  }

  /**
   * 전체 이벤트 교체 (가져오기)
   *
   * loadFailed 잠금을 통과하는 유일한 쓰기다. 기존 목록에서 파생되지 않으므로
   * 읽기 실패가 오염시킬 것이 없고, 읽기가 영구히 깨졌을 때(손상된 저장값)
   * 사용자에게 남은 유일한 복구 경로다.
   * @param {CalendarEvent[]} nextEvents
   * @returns {Promise<boolean>}
   */
  async replaceEvents(nextEvents) {
    // **DD28의 가져오기 호출 자리다.** replaceEvents()는 calendarEvents 만
    // 교체하므로 남의 파일에서 온 projectId 가 전건 끊긴 채 들어온다.
    // handleCalendarImport()는 건드리지 않는다 — 참조 무결성은 UI 핸들러가 알
    // 일이 아니고, 이 함수가 가져오기의 유일한 관문이므로 여기 하나면 된다.
    const reconciled = reconcileProjectRefs(nextEvents, this.projects, {
      projectsLoaded: !this.projectsLoadFailed,
    });
    return this.persistEvents(reconciled, { isFullReplacement: true });
  }

  /**
   * 현재 이벤트 목록 반환 (내보내기용)
   *
   * 복사본을 준다. 내부 배열을 그대로 넘기면 호출자가 in-place로 변형해
   * persistEvents()를 우회한 채 메모리와 저장소를 어긋나게 할 수 있다.
   * 항목까지 얕게 복사해 이벤트 객체 필드 변형도 막는다.
   * @returns {CalendarEvent[]}
   */
  getEvents() {
    // 관문 배열까지 복사한다. 얕은 복사만 하면 호출자가 gates를 in-place로
    // 변형해 persistEvents()를 우회한 채 메모리와 저장소를 어긋나게 할 수 있다.
    return this.events.map((event) => ({
      ...event,
      gates: (event.gates || []).map((gate) => ({ ...gate })),
    }));
  }

  /**
   * 내보내도 되는 상태인가
   *
   * 읽기가 실패한 상태에서 내보내면 빈 파일이 만들어져, 사용자가 그것을
   * 백업이라고 믿게 된다.
   * @returns {boolean}
   */
  canExport() {
    return !this.loadFailed;
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 헤더 내비게이션 (이전/다음/오늘)
    const header = this.root.querySelector('.calendar-header');
    if (header) {
      header.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const button = target.closest('[data-nav]');
        if (!(button instanceof HTMLElement)) return;

        if (button.dataset.nav === 'prev') this.shiftMonth(-1);
        else if (button.dataset.nav === 'next') this.shiftMonth(1);
        else if (button.dataset.nav === 'today') this.goToToday();
        else if (button.dataset.nav === 'detail') this.openEventModal('create', null);
      });
    }

    // 날짜 셀 클릭 (델리게이션)
    if (this.gridElement) {
      this.gridElement.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const cell = target.closest('.calendar-day');
        if (!(cell instanceof HTMLElement) || !cell.dataset.date) return;
        this.selectDate(cell.dataset.date);
      });

      this.gridElement.addEventListener('keydown', (e) => this.handleGridKeydown(e));
    }

    // 할 일 목록 (완료 토글 / 삭제)
    if (this.todoListElement) {
      this.todoListElement.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.closest('[data-todo-action]');
        if (!(action instanceof HTMLElement)) return;

        const item = action.closest('.calendar-todo-item');
        if (!(item instanceof HTMLElement) || !item.dataset.id) return;

        if (action.dataset.todoAction === 'toggle') this.toggleEvent(item.dataset.id);
        else if (action.dataset.todoAction === 'delete') this.deleteEvent(item.dataset.id);
        else if (action.dataset.todoAction === 'edit') {
          const target = this.events.find((event) => event.id === item.dataset.id);
          if (target) this.openEventModal('edit', target);
        }
      });
    }

    // 상세 모달
    const modal = this.modal;
    if (modal) {
      modal.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitEventModal();
      });
      modal.cancelButton.addEventListener('click', () => this.closeEventModal());
      modal.deleteButton.addEventListener('click', () => this.deleteFromModal());
      modal.noteInput.addEventListener('input', () => this.updateNoteCount());
      modal.root.addEventListener('keydown', (e) => this.handleModalKeydown(e));

      // 배경(모달 바깥) 클릭으로 닫기 — 기존 설정 모달과 같은 관용구
      modal.root.addEventListener('click', (e) => {
        if (e.target === modal.root) this.closeEventModal();
      });
    }

    // 할 일 추가 폼
    if (this.todoFormElement) {
      this.todoFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!(this.todoInputElement instanceof HTMLInputElement) || !this.selectedKey) return;
        const value = this.todoInputElement.value;
        this.todoInputElement.value = '';
        // 간편 입력은 언제나 하루짜리다. 범위는 상세 모달에서만 늘린다.
        await this.addEvent({
          startDate: this.selectedKey,
          endDate: this.selectedKey,
          title: value,
        });
        // 저장 중 input이 disabled 되면서 포커스가 빠진다. 연속 입력을 위해 되돌린다.
        this.todoInputElement.focus();
      });
    }

    // 패널 닫기
    const panelClose = this.root.querySelector('.calendar-panel-close');
    if (panelClose) {
      panelClose.addEventListener('click', () => this.closePanel());
    }

    // 저장 실패 재시도
    if (this.errorRetryButton) {
      this.errorRetryButton.addEventListener('click', () => this.retryFailedOperation());
    }

    // Esc로 패널 닫기
    this.root.addEventListener('keydown', (e) => {
      // 모달이 열려 있으면 Esc는 모달 것이다. 모달이 이 루트 밖에 있어 지금은
      // 이벤트가 여기까지 오지 않지만, 순서를 코드로도 못박아 둔다.
      if (this.isModalOpen()) return;
      if (e.key === 'Escape' && this.selectedKey) {
        e.stopPropagation();
        this.closePanel();
      }
    });
  }

  /**
   * 그리드 키보드 내비게이션
   * @param {KeyboardEvent} e
   */
  handleGridKeydown(e) {
    // Enter / Space는 의도적으로 처리하지 않는다. 날짜 셀이 <button>이라
    // 네이티브 click이 발생하고, 여기서도 selectDate를 부르면 두 번 토글되어
    // 패널이 열리자마자 닫힌다. 선택은 click 델리게이션에 맡긴다.
    // 범위를 잡아 둔 상태의 Enter는 날짜 선택이 아니라 상세 입력으로 간다.
    // 마우스 없이 "범위 선택 → 상세 모달 → 저장"에 도달하는 경로다.
    if (e.key === 'Enter' && this.getSelectedRange() && this.modal) {
      e.preventDefault();
      this.openEventModal('create', null);
      return;
    }

    const moves = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      PageUp: null,
      PageDown: null,
    };
    if (!(e.key in moves) && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    e.preventDefault();

    const isArrow =
      e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown';
    const extending = e.shiftKey && isArrow;

    if (extending) {
      // 확장을 시작한 자리가 범위의 한쪽 끝으로 고정된다
      if (this.rangeAnchorKey === null) this.rangeAnchorKey = this.focusKey;
    } else {
      // Shift 없이 움직이면 잡아 둔 범위를 놓는다
      this.clearRangeSelection();
    }

    const current = parseDateKey(this.focusKey);

    if (e.key === 'PageUp') {
      this.shiftMonth(-1);
      return;
    }
    if (e.key === 'PageDown') {
      this.shiftMonth(1);
      return;
    }
    if (e.key === 'Home') {
      current.setDate(current.getDate() - current.getDay());
    } else if (e.key === 'End') {
      current.setDate(current.getDate() + (6 - current.getDay()));
    } else {
      current.setDate(current.getDate() + moves[e.key]);
    }

    this.focusKey = makeDateKey(current);
    if (extending) this.rangeEndKey = this.focusKey;

    // 다른 달로 넘어가면 뷰를 따라 이동
    if (current.getFullYear() !== this.viewYear || current.getMonth() !== this.viewMonth) {
      this.viewYear = current.getFullYear();
      this.viewMonth = current.getMonth();
      this.render();
    } else if (extending) {
      // 범위 하이라이트를 다시 칠해야 하므로 tabindex만 갱신해서는 안 된다
      this.render();
    } else {
      this.updateRovingTabindex();
    }
    this.focusDayCell(this.focusKey);
  }

  /**
   * 지정한 날짜 셀에 포커스
   * @param {string} dateKey
   */
  focusDayCell(dateKey) {
    if (!this.gridElement) return;
    const cell = this.gridElement.querySelector(`.calendar-day[data-date="${dateKey}"]`);
    if (cell instanceof HTMLElement) cell.focus();
  }

  /**
   * roving tabindex 갱신
   */
  updateRovingTabindex() {
    if (!this.gridElement) return;
    this.gridElement.querySelectorAll('.calendar-day').forEach((cell) => {
      if (cell instanceof HTMLElement) {
        cell.tabIndex = cell.dataset.date === this.focusKey ? 0 : -1;
      }
    });
  }

  /**
   * 월 이동
   * @param {number} delta - -1(이전) 또는 1(다음)
   */
  shiftMonth(delta) {
    const shifted = new Date(this.viewYear, this.viewMonth + delta, 1);
    this.viewYear = shifted.getFullYear();
    this.viewMonth = shifted.getMonth();

    // 포커스를 새 달 안으로 당긴다
    const focused = parseDateKey(this.focusKey);
    const lastDay = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    this.focusKey = makeDateKey(new Date(this.viewYear, this.viewMonth, Math.min(focused.getDate(), lastDay)));

    this.render();
  }

  /**
   * 오늘로 복귀
   */
  goToToday() {
    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.todayKey = makeDateKey(now);
    this.focusKey = this.todayKey;
    this.render();
  }

  /**
   * 날짜 선택 → 할 일 패널 열기 (같은 날짜 재선택 시 닫기)
   * @param {string} dateKey
   */
  selectDate(dateKey) {
    // 날짜 하나를 고르는 순간 잡아 둔 범위는 의미를 잃는다
    this.clearRangeSelection();
    this.focusKey = dateKey;
    this.selectedKey = this.selectedKey === dateKey ? null : dateKey;
    this.render();

    // render()가 셀을 전부 새로 만들므로 포커스가 body로 빠진다. 항상 되돌려준다.
    if (this.selectedKey && this.todoInputElement instanceof HTMLInputElement) {
      this.todoInputElement.focus();
    } else {
      this.focusDayCell(this.focusKey);
    }
  }

  /**
   * 할 일 패널 닫기
   */
  closePanel() {
    if (!this.selectedKey) return;
    this.selectedKey = null;
    this.render();
    this.focusDayCell(this.focusKey);
  }

  /**
   * 자정 롤오버 감시 — 날짜가 바뀌면 '오늘' 강조를 갱신
   */
  startRolloverWatch() {
    if (this.rolloverTimerId !== null) clearInterval(this.rolloverTimerId);
    this.rolloverTimerId = setInterval(() => {
      const currentKey = makeDateKey(new Date());
      if (currentKey !== this.todayKey) {
        this.todayKey = currentKey;
        this.render();
      }
    }, 60000);
  }

  /**
   * 이벤트 하나의 마감 상태
   *
   * 판정 기준은 **종단 관문**이다 (DD3). 3일짜리 일정의 첫날은 아직 지연이 아니다.
   *
   * 마이그레이션 직후에는 `dropped` 관문이 없으므로 종단 관문의 `planned` 가 파생
   * `endDate` 와 **같은 값**이고, 따라서 마감 판정 결과도 전후로 같다. `dropped` 가
   * 결과를 바꾸는 것은 사용자가 관문을 내린 **뒤**이며 그때의 동작은 DD5a 가 정한다.
   * @param {CalendarEvent} event
   * @returns {'' | 'overdue' | 'today' | 'soon'}
   */
  getEventDueState(event) {
    if (event.done) return '';

    // **종단 관문** = `status !== 'dropped'` 인 관문 중 `planned` 가 가장 늦은 것
    // (DD3·DD5a). 관문 전부가 마감 상태를 만들게 하면 마이그레이션 다음 날 아침에
    // 요약 배너가 **없던 지연 건수를 보고한다** — 지나간 startDate 가 전부 overdue 가
    // 되기 때문이다. 그래서 입력을 종단 관문 하나로 고정한다.
    //
    // `dropped` 를 제외하는 이유는 **범위를 줄인 행위가 늦은 것으로 뒤집히면 안 되기**
    // 때문이다. 8월 25일 관문을 "안 하기로" 표시했는데 25일이 지나 그 작업이
    // 지연으로 보고되면, PRD 가 M2 에 요구한 "조기·지연·범위축소가 구분되어 남는다"가
    // 저장 필드에만 있고 판정에는 없는 상태가 된다.
    //
    // `planned` **하나만** 읽으므로 같은 날짜의 관문이 둘이어도 어느 것을 골랐는지가
    // 답을 바꾸지 않는다 — DD25 가 동점 타이브레이크를 두지 않은 근거가 이것이다.
    let terminal = '';
    (event.gates || []).forEach((gate) => {
      if (gate.status === 'dropped') return;
      if (!terminal || gate.planned > terminal) terminal = gate.planned;
    });

    // 살아 있는 관문이 하나도 없으면(전부 dropped) 마감이 없다 — 지연도 오늘도 아니다.
    if (!terminal) return '';

    if (terminal < this.todayKey) return 'overdue';
    if (terminal === this.todayKey) return 'today';
    if (terminal === shiftDateKey(this.todayKey, 1)) return 'soon';
    return '';
  }

  /**
   * 셀의 마감 상태 = 그 셀에 **살아 있는 관문으로** 선 이벤트 중 가장 급한 것
   * (지연 > 오늘 > 내일) — Task 2 규칙 2
   *
   * **날짜를 함께 받는다.** 서명이 `(dayEvents)` 하나였을 때 이 함수는 그 이벤트가
   * 그 날에 **왜** 서 있는지(살아 있는 관문인지 `dropped` 인지)를 알 수 없었고,
   * 그래서 칩에서 지운 지연색이 셀 배경(`is-due-*`)과 `aria-label` 로 그대로
   * 되돌아왔다. 호출부(`createDayCell()`)가 그 셀의 `dateKey` 를 넘긴다.
   * @param {CalendarEvent[]} dayEvents
   * @param {string} dateKey - 이 셀의 날짜
   * @returns {'' | 'overdue' | 'today' | 'soon'}
   */
  getCellDueState(dayEvents, dateKey) {
    /** @type {'' | 'overdue' | 'today' | 'soon'} */
    let state = '';
    for (let i = 0; i < dayEvents.length; i += 1) {
      // 그 날짜의 관문이 **전부 dropped** 인 이벤트는 집계에서 건너뛴다.
      // 살아 있는 관문이 하나라도 있으면 지금처럼 이벤트의 마감 상태를 집계한다.
      if (!hasLiveGateOn(dayEvents[i], dateKey)) continue;
      const eventState = this.getEventDueState(dayEvents[i]);
      if (eventState === 'overdue') return 'overdue';
      if (eventState === 'today') state = 'today';
      else if (eventState === 'soon' && state !== 'today') state = 'soon';
    }
    return state;
  }

  /**
   * 전체 렌더링
   */
  render() {
    this.renderTitle();
    this.renderSummary();
    this.renderGrid();
    this.renderPanel();
  }

  /**
   * 요약 한 줄 — `오늘 마감 2건 · 지연 1건`
   *
   * 카드도 진행률 바도 만들지 않는다. 그 형태는 이 제품이 "새 탭이 일처럼 느껴지면
   * 실패"라며 금지한 업무용 대시보드 어휘다. 셀 것이 없으면 **노드 자체를 없앤다** —
   * "마감 없음"이라고 말하려고 한 줄을 차지하지 않는다.
   *
   * 절충 하나: aria-live는 이미 문서에 있는 노드의 변화만 알린다. 0건일 때 노드를
   * 지우는 요구와 정확히 상충하므로, 0 → 1건 전환은 보조기기가 못 읽을 수 있다.
   * "없을 때 아무것도 없다"를 우선했다.
   */
  renderSummary() {
    const header = this.root.querySelector('.calendar-header');
    if (!header) return;

    const existing = header.querySelector('.calendar-summary');

    let dueToday = 0;
    let overdue = 0;
    this.events.forEach((event) => {
      const state = this.getEventDueState(event);
      if (state === 'today') dueToday += 1;
      else if (state === 'overdue') overdue += 1;
    });

    if (dueToday === 0 && overdue === 0) {
      if (existing) existing.remove();
      return;
    }

    const parts = [];
    if (dueToday > 0) parts.push(`오늘 마감 ${dueToday}건`);
    if (overdue > 0) parts.push(`지연 ${overdue}건`);
    const text = parts.join(' · ');

    if (existing) {
      if (existing.textContent !== text) existing.textContent = text;
      return;
    }

    const summary = document.createElement('p');
    summary.className = 'calendar-summary';
    summary.setAttribute('aria-live', 'polite');
    summary.textContent = text;
    // '일정 추가' 버튼 앞. 버튼이 없으면 헤더 끝에 붙는다.
    header.insertBefore(summary, header.querySelector('.calendar-detail-add'));
  }

  /**
   * 헤더 제목 렌더링
   */
  renderTitle() {
    if (!this.titleElement) return;
    this.titleElement.textContent = `${this.viewYear}년 ${this.viewMonth + 1}월`;
  }

  /**
   * 월간 그리드 렌더링 (6주 고정 — 높이 점프 방지)
   */
  renderGrid() {
    if (!this.gridElement) return;
    this.gridElement.textContent = '';

    // 그리드 시작일 = 이 달 1일이 속한 주의 일요일
    const firstOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    const gridStart = new Date(this.viewYear, this.viewMonth, 1 - firstOfMonth.getDay());
    const gridEnd = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + 41);

    // 셀을 만들기 전에 이 42일 창에 걸친 이벤트만 버킷화한다 (DD7).
    // 렌더 창이 정해진 뒤에야 만들 수 있으므로 여기가 유일한 호출 지점이다.
    this.rebuildIndex(makeDateKey(gridStart), makeDateKey(gridEnd));

    // 42개 셀을 fragment에 모아 한 번만 커밋 (행마다 append 하면 리플로우가 6회)
    const fragment = document.createDocumentFragment();

    for (let week = 0; week < 6; week += 1) {
      const row = document.createElement('div');
      row.className = 'calendar-row';
      row.setAttribute('role', 'row');

      for (let day = 0; day < 7; day += 1) {
        const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + week * 7 + day);
        row.appendChild(this.createDayCell(cellDate));
      }
      fragment.appendChild(row);
    }

    this.gridElement.appendChild(fragment);
  }

  /**
   * 날짜 셀 생성
   * @param {Date} cellDate
   * @returns {HTMLButtonElement}
   */
  createDayCell(cellDate) {
    const dateKey = makeDateKey(cellDate);
    const dayEvents = this.eventsByDate.get(dateKey) || [];
    const pendingCount = dayEvents.filter((event) => !event.done).length;
    // 이 셀의 날짜를 함께 넘긴다 — 그 날짜의 관문이 전부 dropped 인 이벤트를
    // 집계에서 빼려면 함수가 날짜를 알아야 한다 (Task 2 규칙 2).
    const dueState = this.getCellDueState(dayEvents, dateKey);

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-day';
    cell.setAttribute('role', 'gridcell');
    cell.dataset.date = dateKey;
    cell.tabIndex = dateKey === this.focusKey ? 0 : -1;

    if (cellDate.getMonth() !== this.viewMonth) cell.classList.add('is-outside');
    if (dateKey === this.todayKey) {
      cell.classList.add('is-today');
      cell.setAttribute('aria-current', 'date');
    }
    if (dateKey === this.selectedKey) cell.classList.add('is-selected');

    // Shift+방향키로 잡는 중인 범위
    const range = this.getSelectedRange();
    if (range && range.from <= dateKey && dateKey <= range.to) cell.classList.add('is-in-range');
    // is-due-* 는 '오늘 날짜'를 뜻하는 is-today와 별도 네임스페이스다
    if (dueState) cell.classList.add(`is-due-${dueState}`);
    cell.setAttribute('aria-selected', dateKey === this.selectedKey ? 'true' : 'false');

    // 상태를 색으로만 말하지 않는다 — 스크린리더에도 같은 정보가 가야 한다
    const weekday = WEEKDAY_LABELS[cellDate.getDay()];
    const labelParts = [`${cellDate.getMonth() + 1}월 ${cellDate.getDate()}일 ${weekday}요일`];
    if (dayEvents.length > 0) {
      labelParts.push(`할 일 ${dayEvents.length}개`);
      if (pendingCount > 0 && dueState) labelParts.push(DUE_STATE_LABELS[dueState]);
    }
    cell.setAttribute('aria-label', labelParts.join(', '));

    const number = document.createElement('span');
    number.className = 'calendar-day-num';
    number.textContent = String(cellDate.getDate());
    cell.appendChild(number);

    if (dayEvents.length > 0) {
      cell.appendChild(this.createChips(dayEvents, dateKey));
    }

    return cell;
  }

  /**
   * 범위 칩 (최대 MAX_CHIPS_PER_CELL + `+N`)
   *
   * 칩 하나가 그 셀에서 이벤트의 어느 지점인지를 **형태로** 말한다:
   * 하루짜리는 양끝이 둥글고, 시작/끝은 한쪽만 둥글며, 중간은 양끝이 각져
   * 좌우 셀로 이어져 보인다. 색을 회색조로 낮춰도 범위가 읽힌다.
   * @param {CalendarEvent[]} dayEvents
   * @param {string} dateKey - 이 칩을 그리는 셀의 날짜
   * @returns {HTMLElement}
   */
  createChips(dayEvents, dateKey) {
    const chips = document.createElement('span');
    chips.className = 'calendar-chips';
    chips.setAttribute('aria-hidden', 'true');

    dayEvents.slice(0, MAX_CHIPS_PER_CELL).forEach((event) => {
      const chip = document.createElement('span');
      const isStart = event.startDate === dateKey;
      const isEnd = event.endDate === dateKey;

      let shape = 'is-middle';
      if (isStart && isEnd) shape = 'is-single';
      else if (isStart) shape = 'is-start';
      else if (isEnd) shape = 'is-end';

      // Task 2 규칙 2 — 마감 상태는 **셀마다** 정한다. 이 날짜의 관문이 전부
      // dropped 이면 이 칩에 is-due-* 를 붙이지 않는다. 이벤트당 한 번 계산해
      // 모든 칩에 같은 상태를 붙이면 "안 하기로 한 날"의 칩이 지연색을 쓴다.
      const dueState = hasLiveGateOn(event, dateKey) ? this.getEventDueState(event) : '';
      chip.className = [
        'calendar-chip',
        shape,
        `is-priority-${event.priority}`,
        dueState ? `is-due-${dueState}` : '',
        event.done ? 'is-done' : '',
      ]
        .filter(Boolean)
        .join(' ');
      chips.appendChild(chip);
    });

    if (dayEvents.length > MAX_CHIPS_PER_CELL) {
      const more = document.createElement('span');
      more.className = 'calendar-chip-more';
      more.textContent = `+${dayEvents.length - MAX_CHIPS_PER_CELL}`;
      chips.appendChild(more);
    }

    return chips;
  }

  /**
   * 할 일 패널 렌더링
   */
  renderPanel() {
    if (!this.panelElement || !this.panelTitleElement || !this.todoListElement) return;

    // 패널이 열려 있을 때만 본문이 2열이 된다. 닫혀 있으면 달력이 폭을 다 쓴다.
    this.root.classList.toggle('has-panel', Boolean(this.selectedKey));

    if (!this.selectedKey) {
      this.panelElement.hidden = true;
      return;
    }
    this.panelElement.hidden = false;

    const selected = parseDateKey(this.selectedKey);
    const weekday = WEEKDAY_LABELS[selected.getDay()];
    this.panelTitleElement.textContent = `${selected.getMonth() + 1}월 ${selected.getDate()}일 (${weekday})`;

    this.todoListElement.textContent = '';
    // 창 인덱스가 아니라 전체 조회를 쓴다 — 패널은 월을 넘겨도 열려 있을 수 있다
    const dayEvents = this.getEventsForDate(this.selectedKey);

    if (dayEvents.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'calendar-todo-empty';
      empty.textContent = '아래 입력창에 이 날 마감할 일을 적어 두세요';
      this.todoListElement.appendChild(empty);
      return;
    }

    dayEvents.forEach((event) => this.todoListElement.appendChild(this.createTodoItem(event)));
  }

  /**
   * 할 일 항목 생성
   * 사용자 문자열은 반드시 textContent로만 렌더한다 (innerHTML 금지)
   * @param {CalendarEvent} event
   * @returns {HTMLLIElement}
   */
  createTodoItem(event) {
    const item = document.createElement('li');
    item.className = event.done ? 'calendar-todo-item is-done' : 'calendar-todo-item';
    item.dataset.id = event.id;

    // 체크박스는 CSS로 그린다. ☐/☑ 글리프는 Windows 폰트 커버리지가 불안정해
    // tofu로 보이거나 행마다 메트릭이 달라진다.
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'calendar-todo-toggle';
    toggle.dataset.todoAction = 'toggle';
    toggle.setAttribute('aria-pressed', event.done ? 'true' : 'false');
    toggle.setAttribute('aria-label', `${event.title} 완료 ${event.done ? '해제' : '표시'}`);
    item.appendChild(toggle);

    // 제목 + (여러 날이면) 기간 + (있으면) 메모 한 줄. 전부 textContent.
    const body = document.createElement('span');
    body.className = 'calendar-todo-body';

    const title = document.createElement('span');
    title.className = 'calendar-todo-title';
    title.textContent = event.title;
    body.appendChild(title);

    const meta = [];

    // Task 2 규칙 3 — 프로젝트 이름이 메타의 **첫 조각**이다.
    // `createTodoItem()` 에 프로젝트 뱃지 자리는 **없다**(제목·메타·메모·편집·삭제뿐).
    // 없는 자리를 만들지 않고 기존 `.calendar-todo-meta` 스팬을 그대로 쓴다 —
    // 새 요소도 새 클래스도 만들지 않는 것이 UI4다. `projectId` 가 null(무소속)이면
    // 아무것도 넣지 않는다: 무소속이 정상 상태이고 그것을 따로 표시하지 않는 것이 UI8이다.
    if (event.projectId) {
      const project = this.projects.find((candidate) => candidate.id === event.projectId);
      if (project) meta.push(project.name);
    }

    // Task 2 규칙 1 — 메타는 파생 연속 범위가 아니라 **관문 날짜를 열거**한다.
    // 옛 경로는 `formatShortDate(startDate) – formatShortDate(endDate)` 였고, 그대로
    // 두면 월·수 관문 이벤트에서 그리드는 화요일을 비우는데 패널은 화요일을 포함한
    // 범위로 말한다 — DD32가 막으려던 불일치가 패널 쪽에서 되살아난다.
    // 관문이 하나면 날짜를 넣지 않는다(폭 없는 항목이 지금도 날짜 메타를 안 내는 것과
    // 같은 규칙이다). 구분자는 `·` 이며, 이것이 옛 범위 표기(` – `)와 가르는 자리다.
    const metaDates = gateMetaDates(event);
    if (metaDates.length > 1) meta.push(metaDates.map(formatShortDate).join(' · '));

    if (event.priority !== 'normal') meta.push(PRIORITY_LABELS[event.priority]);
    if (meta.length > 0) {
      const metaLine = document.createElement('span');
      metaLine.className = 'calendar-todo-meta';
      metaLine.textContent = meta.join(' · ');
      body.appendChild(metaLine);
    }

    if (event.note) {
      const note = document.createElement('span');
      note.className = 'calendar-todo-note';
      note.textContent = event.note;
      body.appendChild(note);
    }

    item.appendChild(body);

    // 목록에서 중요도는 위의 meta 줄이 글자로 말한다. 색 배지를 또 붙이지 않는다 —
    // 같은 사실을 두 번 말하는 표식은 밀도만 올린다.
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'calendar-todo-edit';
    edit.dataset.todoAction = 'edit';
    edit.setAttribute('aria-label', `${event.title} 상세 편집`);
    edit.textContent = '편집';
    item.appendChild(edit);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'calendar-todo-delete';
    remove.dataset.todoAction = 'delete';
    remove.setAttribute('aria-label', `${event.title} 삭제`);
    remove.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
    item.appendChild(remove);

    return item;
  }
}

/**
 * 설정 관리 클래스
 * 책임: 설정 UI 및 설정 저장/로드 (blur, overlay opacity)
 */
class SettingsManager {
  /**
   * @param {HTMLElement} modal - 설정 모달
   * @param {HTMLElement} toggleBtn - 토글 버튼
   * @param {BackgroundManager} backgroundManager - 배경 관리자
   */
  constructor(modal, toggleBtn, backgroundManager, calendarManager) {
    this.modal = modal;
    this.toggleBtn = toggleBtn;
    this.backgroundManager = backgroundManager;
    this.calendarManager = calendarManager;
    this.randomToggle = null;
    this.widgetToggle = null;
    this.searchToggle = null;
    this.blurToggle = null;
    this.opacitySlider = null;
    this.overlayElement = null;
    this.clockElement = null;
    this.calendarElement = null;
    this.searchElement = null;
    this.widgetTypeSegment = null;
    this.widgetPositionGrid = null;
    this.searchPositionGrid = null;

    /** @type {'clock'|'calendar'} */
    this.widgetType = 'clock';
    this.widgetPosition = 'center-center';
    this.searchPosition = 'center-center';

    /**
     * 달력 설정을 **실제로 읽었는가** (DD13 첫째 항)
     *
     * 이 기본값이 `undefined` 를 없애는 유일한 줄이다. 아래 `loadSettings()` 의 대입은
     * 성공 경로만 다루므로, 기본값이 없으면 실패 경로에서 필드가 `undefined` 로 남고
     * `!undefined` 는 참이라 온보딩 판정의 항이 있으나 마나가 된다 — 항을 넣어 놓고
     * 항상 참이 되는 것은 항을 안 넣은 것과 같다.
     *
     * 그 실패 경로는 둘이고 둘 다 조용하다:
     * (1) `loadSettings()` 의 `storage.get()` 이 던진다 — `catch` 가 `console.error` 만
     *     하고 재던지지 않으므로 그 아래 대입 전체가 건너뛰어진다
     * (2) `initialize()` 가 설정 모달 요소 열둘 중 하나라도 없어 조기 `return` 한다 —
     *     그 경로에서는 `loadSettings()` 가 **아예 호출되지 않는다**
     *
     * 둘 다 "설정을 못 읽었다"이고 그 상태는 첫 실행이 아니다. 그래서 온보딩을 띄우지
     * 않고, 한 번뿐인 플래그도 태우지 않는다.
     */
    this.calendarSettingsLoaded = false;

    /** 첫 실행 온보딩을 이미 봤는가 (DD13 넷째 항 · 설정 키 `calendarOnboardingSeen`) */
    this.calendarOnboardingSeen = false;

    /** @type {{clock?: number, calendar?: number}} 위젯별 검색창 너비 캐시 */
    this.searchWidthByWidget = {};

    /** 실측 충돌 검사 재진입 가드 */
    this.isMeasuringCollision = false;
    this.overlapDebounceId = null;
    this.resizeObserver = null;
  }

  /**
   * 설정 기능 초기화
   */
  async initialize() {
    this.randomToggle = document.getElementById('randomImageToggle');
    this.widgetToggle = document.getElementById('mainWidgetToggle');
    this.searchToggle = document.getElementById('searchToggle');
    this.blurToggle = document.getElementById('blurToggle');
    this.opacitySlider = document.getElementById('opacitySlider');
    this.overlayElement = document.querySelector('.overlay');
    this.clockElement = document.getElementById('clock');
    this.calendarElement = document.getElementById('calendarWidget');
    this.searchElement = document.querySelector('.search-container');
    this.widgetTypeSegment = document.getElementById('widgetTypeSegment');
    this.widgetPositionGrid = document.getElementById('widgetPositionGrid');
    this.searchPositionGrid = document.getElementById('searchPositionGrid');

    if (
      !this.randomToggle ||
      !this.widgetToggle ||
      !this.searchToggle ||
      !this.blurToggle ||
      !this.opacitySlider ||
      !this.overlayElement ||
      !this.clockElement ||
      !this.calendarElement ||
      !this.searchElement ||
      !this.widgetTypeSegment ||
      !this.widgetPositionGrid ||
      !this.searchPositionGrid
    ) {
      console.error('Settings elements not found');
      return;
    }

    this.setupEventListeners();
    this.setupCollisionObserver();
    await this.loadSettings();
  }

  /**
   * 현재 활성 위젯 요소
   * @returns {HTMLElement|null}
   */
  getActiveWidgetElement() {
    return this.widgetType === 'calendar' ? this.calendarElement : this.clockElement;
  }

  /**
   * 위젯 요소 2종 (활성/비활성 모두)
   * @returns {HTMLElement[]}
   */
  getAllWidgetElements() {
    return [this.clockElement, this.calendarElement].filter(
      (element) => element instanceof HTMLElement
    );
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 토글 버튼
    this.toggleBtn.addEventListener('click', () => this.openModal());

    // X 닫기 버튼
    const closeBtn = document.getElementById('settingsClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    // 모달 배경 클릭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // 메뉴 아이템 클릭
    const menuItems = document.querySelectorAll('.settings-menu-item');
    menuItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget;
        if (target instanceof HTMLElement) {
          const section = target.dataset.section;
          if (section) {
            this.switchSection(section);
          }
        }
      });
    });

    // 랜덤 이미지 토글
    if (this.randomToggle instanceof HTMLInputElement) {
      this.randomToggle.addEventListener('change', () => this.handleRandomToggle());
    }

    // 메인 위젯 토글
    if (this.widgetToggle instanceof HTMLInputElement) {
      this.widgetToggle.addEventListener('change', () => this.handleWidgetToggle());
    }

    // 위젯 타입 세그먼트 (시계 / 달력)
    if (this.widgetTypeSegment) {
      this.widgetTypeSegment.addEventListener('click', (e) => {
        const target = e.target;
        if (target instanceof HTMLElement && target.classList.contains('segment-option')) {
          const type = target.dataset.widgetType;
          if (type === 'clock' || type === 'calendar') {
            this.handleWidgetTypeChange(type);
          }
        }
      });
    }

    // 이벤트 내보내기 / 가져오기
    const exportBtn = document.getElementById('calendarExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleCalendarExport());
    }
    const importInput = document.getElementById('calendarImportInput');
    const importBtn = document.getElementById('calendarImportBtn');
    if (importInput instanceof HTMLInputElement) {
      importInput.addEventListener('change', (e) => this.handleCalendarImport(e));
      // label 대신 버튼으로 여는 이유: hidden input은 포커스를 받을 수 없어
      // label만으로는 키보드로 가져오기를 시작할 수 없다
      if (importBtn) importBtn.addEventListener('click', () => importInput.click());
    }

    // 검색창 토글
    if (this.searchToggle instanceof HTMLInputElement) {
      this.searchToggle.addEventListener('change', () => this.handleSearchToggle());
    }

    // 블러 토글
    if (this.blurToggle instanceof HTMLInputElement) {
      this.blurToggle.addEventListener('change', () => this.handleBlurToggle());
    }

    // 투명도 슬라이더
    if (this.opacitySlider instanceof HTMLInputElement) {
      this.opacitySlider.addEventListener('input', () => this.handleOpacityChange());

      // 슬라이더 값 표시 업데이트
      this.opacitySlider.addEventListener('input', (e) => {
        const target = e.target;
        if (target instanceof HTMLInputElement) {
          const valueDisplay = document.getElementById('opacityValue');
          if (valueDisplay) {
            valueDisplay.textContent = target.value;
          }
        }
      });
    }

    // 메인 위젯 위치 그리드
    if (this.widgetPositionGrid) {
      this.widgetPositionGrid.addEventListener('click', (e) => {
        const target = e.target;
        if (target instanceof HTMLElement && target.classList.contains('position-cell')) {
          const position = target.dataset.position;
          if (position) {
            this.handleWidgetPositionChange(position);
          }
        }
      });
    }

    // 검색창 위치 그리드
    if (this.searchPositionGrid) {
      this.searchPositionGrid.addEventListener('click', (e) => {
        const target = e.target;
        if (target instanceof HTMLElement && target.classList.contains('position-cell')) {
          const position = target.dataset.position;
          if (position) {
            this.handleSearchPositionChange(position);
          }
        }
      });
    }
  }

  /**
   * 설정 섹션 전환
   * @param {string} section - 섹션 이름
   */
  switchSection(section) {
    // 메뉴 아이템 활성화
    const menuItems = document.querySelectorAll('.settings-menu-item');
    menuItems.forEach((item) => {
      if (item instanceof HTMLElement) {
        if (item.dataset.section === section) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      }
    });

    // 섹션 표시
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach((sec) => {
      if (sec.id === `settings${section.charAt(0).toUpperCase() + section.slice(1)}`) {
        sec.classList.add('active');
      } else {
        sec.classList.remove('active');
      }
    });
  }

  /**
   * 모달 열기
   */
  openModal() {
    this.modal.classList.add('active');
  }

  /**
   * 모달 닫기
   */
  closeModal() {
    this.modal.classList.remove('active');
  }

  /**
   * 설정 로드
   */
  async loadSettings() {
    // 랜덤 모드
    if (this.randomToggle instanceof HTMLInputElement) {
      this.randomToggle.checked = this.backgroundManager.isRandomMode;
    }

    // 위젯 표시 설정
    try {
      const result = await storage.get([
        'widgetType',
        'mainWidgetEnabled',
        'mainWidgetPosition',
        'searchEnabled',
        'searchPosition',
        'searchWidthByWidget',
        // 첫 실행 온보딩 플래그 (DD13). 다른 설정 키와 같은 경로로 읽는다 —
        // 이 클래스에는 getSetting() 같은 범용 접근자가 없고, 설정은 이 한 번의
        // storage.get() 이 읽어 인스턴스 필드에 담는 것이 관용구다.
        'calendarOnboardingSeen',
        // 레거시 폴백 (읽기 전용 — 덮어쓰지 않는다)
        'clockEnabled',
        'clockPosition',
      ]);

      this.widgetType = result.widgetType === 'calendar' ? 'calendar' : 'clock';
      const widgetEnabled = (result.mainWidgetEnabled ?? result.clockEnabled) !== false; // 기본값 true
      const searchEnabled = result.searchEnabled !== false; // 기본값 true
      this.widgetPosition = result.mainWidgetPosition || result.clockPosition || 'center-center';
      this.searchPosition = result.searchPosition || 'center-center';
      this.searchWidthByWidget =
        result.searchWidthByWidget && typeof result.searchWidthByWidget === 'object'
          ? result.searchWidthByWidget
          : {};

      // `=== true` 를 쓴다 — 키가 없으면 `undefined === true` 가 거짓이므로 그것이
      // 기본값 false 다. `!== false` 는 기본값 true 를 주는 관용구이고(widgetEnabled 가
      // 그 예다), 기본값이 뒤집히면 첫 실행에 온보딩이 아예 안 뜬다.
      this.calendarOnboardingSeen = result.calendarOnboardingSeen === true;
      // **이 try 블록 안이어야 한다.** catch 나 finally 에 두면 읽기 실패에서도 true 가
      // 되어 DD13 첫째 항이 도로 무력해진다. storage.get() 이 던지면 이 줄에 닿지 못하고
      // 필드는 생성자 기본값 false 로 남는다 — 그것이 이 배선의 전부다.
      this.calendarSettingsLoaded = true;

      if (this.widgetToggle instanceof HTMLInputElement) {
        this.widgetToggle.checked = widgetEnabled;
      }

      if (this.searchToggle instanceof HTMLInputElement) {
        this.searchToggle.checked = searchEnabled;
      }

      this.applyWidgetType(this.widgetType);
      this.applyWidgetSetting(widgetEnabled);
      this.applySearchSetting(searchEnabled);
      this.applyWidgetPosition(this.widgetPosition);
      this.applySearchPosition(this.searchPosition);
      this.updatePositionGrids();
      this.updateWidgetTypeSegment();
      this.updatePositionSettingsVisibility();
      this.observeActiveWidget();

      // 초기 로드 시 즉시 오프셋 적용
      await this.applyInitialOverlap(widgetEnabled, searchEnabled);
    } catch (error) {
      console.error('Failed to load widget settings:', error);
    }

    // 블러 설정
    try {
      const result = await storage.get(['blurEnabled', 'overlayBrightness']);

      const blurEnabled = result.blurEnabled !== false; // 기본값 true
      const overlayBrightness = result.overlayBrightness !== undefined ? result.overlayBrightness : 50;

      if (this.blurToggle instanceof HTMLInputElement) {
        this.blurToggle.checked = blurEnabled;
      }

      if (this.opacitySlider instanceof HTMLInputElement) {
        this.opacitySlider.value = String(overlayBrightness);
        const valueDisplay = document.getElementById('opacityValue');
        if (valueDisplay) {
          valueDisplay.textContent = String(overlayBrightness);
        }
      }

      // 설정 적용
      this.applyBlurSetting(blurEnabled);
      this.applyBrightnessSetting(overlayBrightness);
    } catch (error) {
      console.error('Failed to load overlay settings:', error);
    }
  }

  /**
   * 랜덤 이미지 토글 처리
   */
  async handleRandomToggle() {
    if (this.randomToggle instanceof HTMLInputElement) {
      const isRandom = this.randomToggle.checked;
      await this.backgroundManager.setRandomMode(isRandom);
    }
  }

  /**
   * 메인 위젯 토글 처리
   */
  async handleWidgetToggle() {
    if (this.widgetToggle instanceof HTMLInputElement) {
      this.enableTransitions();
      const widgetEnabled = this.widgetToggle.checked;
      await this.saveWidgetSetting(widgetEnabled);
      this.applyWidgetSetting(widgetEnabled);
      this.updatePositionSettingsVisibility();
      this.scheduleOverlapCheck();
    }
  }

  /**
   * 위젯 타입 전환 처리 (시계 ↔ 달력)
   * @param {'clock'|'calendar'} type
   */
  async handleWidgetTypeChange(type) {
    if (type === this.widgetType) return;

    this.enableTransitions();
    this.widgetType = type;
    await this.saveWidgetType(type);

    this.applyWidgetType(type);
    this.applyWidgetSetting(this.isWidgetEnabled());
    this.applyWidgetPosition(this.widgetPosition);
    this.updateWidgetTypeSegment();
    this.updatePositionSettingsVisibility();
    this.observeActiveWidget();
    this.scheduleOverlapCheck();
  }

  /**
   * 검색창 토글 처리
   */
  async handleSearchToggle() {
    if (this.searchToggle instanceof HTMLInputElement) {
      this.enableTransitions();
      const searchEnabled = this.searchToggle.checked;
      await this.saveSearchSetting(searchEnabled);
      this.applySearchSetting(searchEnabled);
      this.updatePositionSettingsVisibility();
      this.scheduleOverlapCheck();
    }
  }

  /**
   * 블러 토글 처리
   */
  async handleBlurToggle() {
    if (this.blurToggle instanceof HTMLInputElement) {
      const blurEnabled = this.blurToggle.checked;
      await this.saveBlurSetting(blurEnabled);
      this.applyBlurSetting(blurEnabled);
    }
  }

  /**
   * 투명도 변경 처리
   */
  async handleOpacityChange() {
    if (this.opacitySlider instanceof HTMLInputElement) {
      const brightness = parseInt(this.opacitySlider.value);
      await this.saveBrightnessSetting(brightness);
      this.applyBrightnessSetting(brightness);
    }
  }

  /**
   * 블러 설정 적용
   * @param {boolean} enabled
   */
  applyBlurSetting(enabled) {
    if (this.overlayElement) {
      if (enabled) {
        this.overlayElement.style.backdropFilter = 'blur(3px)';
      } else {
        this.overlayElement.style.backdropFilter = 'none';
      }
    }
  }

  /**
   * 밝기 설정 적용 (100%에 가까울수록 밝아짐)
   * @param {number} brightness - 0-100
   */
  applyBrightnessSetting(brightness) {
    if (this.overlayElement) {
      // 100%에 가까울수록 밝아지도록 반전
      // 0 = 가장 어두움 (0.6), 100 = 가장 밝음 (0.0)
      const opacity = 100 - brightness;
      const alpha1 = (opacity / 100) * 0.4;
      const alpha2 = (opacity / 100) * 0.6;

      this.overlayElement.style.background = `linear-gradient(
        135deg,
        rgba(0, 0, 0, ${alpha1}) 0%,
        rgba(0, 0, 0, ${alpha2}) 100%
      )`;
    }
  }

  /**
   * 블러 설정 저장
   * @param {boolean} enabled
   */
  async saveBlurSetting(enabled) {
    try {
      await storage.set({ blurEnabled: enabled });
    } catch (error) {
      console.error('Failed to save blur setting:', error);
    }
  }

  /**
   * 밝기 설정 저장
   * @param {number} brightness
   */
  async saveBrightnessSetting(brightness) {
    try {
      await storage.set({ overlayBrightness: brightness });
    } catch (error) {
      console.error('Failed to save brightness setting:', error);
    }
  }

  /**
   * 메인 위젯 표시 여부 반환
   * @returns {boolean}
   */
  isWidgetEnabled() {
    return this.widgetToggle instanceof HTMLInputElement ? this.widgetToggle.checked : true;
  }

  /**
   * 검색창 표시 여부 반환
   * @returns {boolean}
   */
  isSearchEnabled() {
    return this.searchToggle instanceof HTMLInputElement ? this.searchToggle.checked : true;
  }

  /**
   * 위젯 타입 적용 (body 속성 — CSS가 달력 전용 오프셋을 고르는 기준)
   * @param {'clock'|'calendar'} type
   */
  applyWidgetType(type) {
    document.body.dataset.widgetType = type;
  }

  /**
   * 메인 위젯 표시 설정 적용 (활성 위젯만 보이고 나머지는 숨긴다)
   * @param {boolean} enabled
   */
  applyWidgetSetting(enabled) {
    const active = this.getActiveWidgetElement();
    this.getAllWidgetElements().forEach((element) => {
      if (!enabled || element !== active) {
        element.style.display = 'none';
        return;
      }
      // 달력 밴드의 레이아웃은 CSS가 정한다(flex + 높이 상한). 인라인 block이
      // 그걸 덮으면 내부 스크롤 영역이 성립하지 않고 밴드가 화면을 삼킨다.
      // 시계는 기존 값 'block'을 그대로 유지한다 (UI4).
      element.style.display = this.widgetType === 'calendar' ? '' : 'block';
    });
  }

  /**
   * 검색창 설정 적용
   * @param {boolean} enabled
   */
  applySearchSetting(enabled) {
    if (this.searchElement) {
      if (enabled) {
        this.searchElement.style.display = 'block';
      } else {
        this.searchElement.style.display = 'none';
      }
    }
  }

  /**
   * 메인 위젯 표시 설정 저장
   * 레거시 clockEnabled는 건드리지 않는다 (다운그레이드 안전성)
   * @param {boolean} enabled
   */
  async saveWidgetSetting(enabled) {
    try {
      await storage.set({ mainWidgetEnabled: enabled });
    } catch (error) {
      console.error('Failed to save widget setting:', error);
    }
  }

  /**
   * 첫 실행 온보딩을 봤다는 사실 저장 (DD13)
   *
   * `saveWidgetSetting()` 과 같은 모양이다 — 키마다 작은 async 메서드가
   * `storage.set({...})` 를 부르는 것이 이 클래스의 쓰기 관용구다.
   *
   * **필드도 함께 올린다.** 안 올리면 같은 세션에서 판정이 다시 서는 경로가 생겼을 때
   * 옛 값을 읽는다. 그리고 **만들었을 때와 건너뛰었을 때 둘 다** 이것을 부른다 —
   * 건너뛰기에서 안 부르면 넷째 항이 영원히 false 라 건너뛴 사용자에게 매 초기화마다
   * 온보딩이 다시 뜨고, 무소속을 정상 상태로 두겠다는 UI8이 깨진다.
   *
   * **읽기 실패로 온보딩이 뜨지 않은 경우에는 부르지 않는다** — 그 상태는 첫 실행이
   * 아니므로 한 번뿐인 플래그를 태울 자리가 아니다. 그 판정은 호출부가 진다.
   */
  async saveCalendarOnboardingSeen() {
    this.calendarOnboardingSeen = true;
    try {
      await storage.set({ calendarOnboardingSeen: true });
    } catch (error) {
      console.error('Failed to save calendar onboarding flag:', error);
    }
  }

  /**
   * 위젯 타입 저장
   * @param {'clock'|'calendar'} type
   */
  async saveWidgetType(type) {
    try {
      await storage.set({ widgetType: type });
    } catch (error) {
      console.error('Failed to save widget type:', error);
    }
  }

  /**
   * 검색창 설정 저장
   * @param {boolean} enabled
   */
  async saveSearchSetting(enabled) {
    try {
      await storage.set({ searchEnabled: enabled });
    } catch (error) {
      console.error('Failed to save search setting:', error);
    }
  }

  /**
   * 메인 위젯 위치 변경 처리
   * @param {string} position
   */
  async handleWidgetPositionChange(position) {
    this.enableTransitions();
    this.widgetPosition = position;
    await this.savePositionSettings();
    this.applyWidgetPosition(position);
    this.updatePositionGrids();
    this.scheduleOverlapCheck();
  }

  /**
   * 검색창 위치 변경 처리
   * @param {string} position
   */
  async handleSearchPositionChange(position) {
    this.enableTransitions();
    this.searchPosition = position;
    await this.savePositionSettings();
    this.applySearchPosition(position);
    this.updatePositionGrids();
    this.scheduleOverlapCheck();
  }

  /**
   * 메인 위젯 위치 적용 (시계·달력 양쪽 모두)
   *
   * className 전면 리셋 대신 positioning 소유 클래스만 제거한다.
   * 전면 리셋은 위젯 타입 클래스(clock / calendar-widget)를 날려버린다.
   * @param {string} position
   */
  applyWidgetPosition(position) {
    this.getAllWidgetElements().forEach((element) => {
      // 인라인 스타일 초기화 (애니메이션을 위해)
      element.style.top = '';
      element.style.bottom = '';
      element.style.left = '';
      element.style.right = '';

      stripPositioningClasses(element);
      element.classList.add(`position-${position}`);
    });
  }

  /**
   * 검색창 위치 적용
   * @param {string} position
   */
  applySearchPosition(position) {
    if (this.searchElement) {
      // 인라인 스타일 초기화 (애니메이션을 위해)
      this.searchElement.style.top = '';
      this.searchElement.style.bottom = '';
      this.searchElement.style.left = '';
      this.searchElement.style.right = '';

      stripPositioningClasses(this.searchElement);
      this.searchElement.classList.add(`position-${position}`);
    }

    // 고정 즐겨찾기 숨김 처리 (비활성화)
    // this.updatePinnedBookmarksVisibility(position);
  }

  /**
   * 위젯 타입 세그먼트 컨트롤 활성 상태 갱신
   */
  updateWidgetTypeSegment() {
    if (!this.widgetTypeSegment) return;
    this.widgetTypeSegment.querySelectorAll('.segment-option').forEach((option) => {
      if (option instanceof HTMLElement) {
        const isActive = option.dataset.widgetType === this.widgetType;
        option.classList.toggle('active', isActive);
        option.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
    });
  }

  /**
   * 위치 그리드 업데이트
   */
  updatePositionGrids() {
    // 메인 위젯 위치 그리드
    if (this.widgetPositionGrid) {
      const cells = this.widgetPositionGrid.querySelectorAll('.position-cell');
      cells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          if (cell.dataset.position === this.widgetPosition) {
            cell.classList.add('active');
          } else {
            cell.classList.remove('active');
          }
        }
      });
    }

    // 검색창 위치 그리드
    if (this.searchPositionGrid) {
      const cells = this.searchPositionGrid.querySelectorAll('.position-cell');
      cells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          if (cell.dataset.position === this.searchPosition) {
            cell.classList.add('active');
          } else {
            cell.classList.remove('active');
          }
        }
      });
    }
  }

  /**
   * 겹침 검사를 다음 페인트 이후로 예약
   * 기존 컨벤션인 double-requestAnimationFrame을 유지한다.
   */
  scheduleOverlapCheck() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.checkOverlap();
      });
    });
  }

  /**
   * 리사이즈 기반 재검사 등록 (디바운스)
   * 달력은 폰트 로드·월 이동·패널 펼침·이벤트 증감으로 첫 페인트 이후에도 크기가 변한다.
   */
  setupCollisionObserver() {
    window.addEventListener('resize', () => this.debouncedOverlapCheck());

    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.debouncedOverlapCheck());
  }

  /**
   * 활성 위젯과 검색창만 관찰 (이전 위젯은 해제)
   */
  observeActiveWidget() {
    if (!this.resizeObserver) return;
    this.resizeObserver.disconnect();

    const active = this.getActiveWidgetElement();
    if (active) this.resizeObserver.observe(active);
    if (this.searchElement) this.resizeObserver.observe(this.searchElement);
  }

  /**
   * 디바운스된 겹침 재검사 (측정 폭주 방지)
   */
  debouncedOverlapCheck() {
    if (this.overlapDebounceId !== null) clearTimeout(this.overlapDebounceId);
    this.overlapDebounceId = setTimeout(() => {
      this.overlapDebounceId = null;
      this.checkOverlap();
    }, 120);
  }

  /**
   * 겹침 확인 및 조정
   */
  async checkOverlap() {
    const widget = this.getActiveWidgetElement();
    if (!widget || !this.searchElement) return;

    const widgetEnabled = this.isWidgetEnabled();
    const searchEnabled = this.isSearchEnabled();

    // 밴드 높이는 검색창을 밀어내는 기준이므로 어느 분기로 빠지든 먼저 갱신한다
    this.updateBandMetrics();

    // 둘 다 활성화된 경우가 아니면 오프셋 전부 제거
    if (!widgetEnabled || !searchEnabled) {
      this.getAllWidgetElements().forEach((element) => {
        element.classList.remove('overlap-offset', 'collision-compact');
      });
      this.searchElement.classList.remove('overlap-offset');
      this.searchElement.style.width = '';
      this.searchElement.style.maxWidth = '';
      return;
    }

    // 밴드는 위치 개념이 없다. 항상 상단 전체 폭이고, 검색창은 CSS가
    // --calendar-band-height만큼 비켜준다 (DD3). 여기서 overlap-offset을 붙이면
    // 밴드가 이유 없이 아래로 밀리고 검색창 폭까지 끌려간다.
    if (this.widgetType === 'calendar') {
      this.getAllWidgetElements().forEach((element) => element.classList.remove('overlap-offset'));
      this.searchElement.classList.remove('overlap-offset');
      this.searchElement.style.width = '';
      this.searchElement.style.maxWidth = '';
      this.searchElement.style.textAlign = '';
      this.applyMeasuredCollision();
      return;
    }

    // 같은 위치일 때 오프셋 적용
    if (this.widgetPosition === this.searchPosition) {
      this.getAllWidgetElements().forEach((element) => element.classList.add('overlap-offset'));
      this.searchElement.classList.add('overlap-offset');

      // 위젯 너비를 계산하여 검색창 너비 설정 및 저장
      await this.matchSearchWidthToWidget();

      // 왼쪽/오른쪽 정렬 적용
      this.applyAlignment();
    } else {
      this.getAllWidgetElements().forEach((element) => element.classList.remove('overlap-offset'));
      this.searchElement.classList.remove('overlap-offset');
      this.searchElement.style.width = '';
      this.searchElement.style.maxWidth = '';
      this.searchElement.style.textAlign = '';
    }

    // 위치가 달라도 좁은 뷰포트에서는 겹칠 수 있으므로 실측으로 다시 확인
    this.applyMeasuredCollision();
  }

  /**
   * 실측 충돌 검사 — 활성 위젯 ↔ 검색창 교차 및 뷰포트 이탈
   *
   * collision-compact를 제거한 정상 밀도 상태에서 측정한다. 축소된 자기 자신을
   * 재면 "충돌 없음"으로 오판하기 때문이다. 제거→측정→재적용을 같은 동기 블록에서
   * 처리하므로 판정이 그대로면 프레임 내 순 크기 변화가 0이고 ResizeObserver가
   * 다시 발화하지 않는다.
   */
  applyMeasuredCollision() {
    const widget = this.getActiveWidgetElement();
    if (!widget || !this.searchElement || this.isMeasuringCollision) return;

    this.isMeasuringCollision = true;
    try {
      // 폭 축소로 충돌을 푸는 경로는 달력이 유일한 소비자였고, 밴드가 되면서
      // 성립하지 않는다 — 폭이 100%라 줄일 폭이 없다. 그 역할은 이제 밴드
      // `max-height` + 내부 스크롤이 대신한다 (DD8).
      //
      // 클래스 제거는 남긴다. 이전 버전이 붙여 둔 collision-compact가 그대로
      // 남아 있으면 밴드가 이유 없이 축소 밀도로 그려진다.
      widget.classList.remove('collision-compact');
    } finally {
      this.isMeasuringCollision = false;
    }
  }

  /**
   * 밴드 실측 높이를 CSS 변수로 내보낸다
   *
   * 검색창이 `top-*`일 때만 이 값만큼 아래로 밀어낸다 (DD3). 밴드가 아닐 때는
   * 변수를 지워 시계 경로의 계산에 끼어들지 않게 한다 (UI4).
   */
  updateBandMetrics() {
    const root = document.documentElement;
    const isBand = this.widgetType === 'calendar' && this.isWidgetEnabled();

    // 변수 유무만으로 CSS가 판단하면 fallback 0px 때문에 달력을 껐을 때
    // 검색창이 원래 자리보다 위로 올라간다. 켜짐 여부는 클래스로 따로 말한다.
    document.body.classList.toggle('has-calendar-band', isBand);

    if (!isBand || !this.calendarElement) {
      root.style.removeProperty('--calendar-band-height');
      return;
    }

    const height = Math.round(this.calendarElement.getBoundingClientRect().height);
    root.style.setProperty('--calendar-band-height', `${height}px`);
  }

  /**
   * 검색창 너비를 활성 위젯 너비에 맞춤
   */
  async matchSearchWidthToWidget() {
    const widget = this.getActiveWidgetElement();
    if (!widget || !this.searchElement) return;

    // 달력 밴드는 폭이 100%다. "위젯 폭에 검색창을 맞춘다"를 그대로 적용하면
    // 검색창이 화면 전체로 늘어난다 (DD8). 시계 경로는 손대지 않는다 (UI4).
    if (this.widgetType === 'calendar') {
      this.searchElement.style.width = '';
      this.searchElement.style.maxWidth = '';
      return;
    }

    const widgetWidth = widget.offsetWidth;

    if (widgetWidth > 0) {
      this.searchElement.style.width = `${widgetWidth}px`;
      this.searchElement.style.maxWidth = `${widgetWidth}px`;
      await this.saveSearchWidth(widgetWidth);
    }
  }

  /**
   * 검색창 너비 저장 (위젯별)
   * 레거시 searchWidth는 타입을 바꾸지 않도록 건드리지 않는다.
   * @param {number} width
   */
  async saveSearchWidth(width) {
    if (this.searchWidthByWidget[this.widgetType] === width) return;

    this.searchWidthByWidget = { ...this.searchWidthByWidget, [this.widgetType]: width };
    try {
      await storage.set({ searchWidthByWidget: this.searchWidthByWidget });
    } catch (error) {
      console.error('Failed to save search width:', error);
    }
  }

  /**
   * 현재 위젯의 캐시된 검색창 너비
   * 값이 없으면 시계에 한해 레거시 searchWidth로 폴백한다.
   * @returns {Promise<number|null>}
   */
  async loadSearchWidth() {
    // 밴드 모드에서는 캐시 폭을 절대 쓰지 않는다. v3 마이그레이션이 M1 시절
    // 340px 항목을 지우지만, 그 이후에 어떤 경로로든 값이 다시 생겨도
    // 첫 페인트에 잘못된 폭이 물리지 않게 여기서 한 번 더 막는다 (DD8).
    if (this.widgetType === 'calendar') return null;

    const cached = this.searchWidthByWidget[this.widgetType];
    if (typeof cached === 'number' && cached > 0) return cached;

    if (this.widgetType !== 'clock') return null;

    try {
      const result = await storage.get(['searchWidth']);
      return typeof result.searchWidth === 'number' && result.searchWidth > 0 ? result.searchWidth : null;
    } catch (error) {
      console.error('Failed to load search width:', error);
      return null;
    }
  }

  /**
   * 왼쪽/오른쪽 정렬 적용
   */
  applyAlignment() {
    if (!this.searchElement) return;

    const position = this.searchPosition;

    // 왼쪽 위치일 때 왼쪽 정렬
    if (position.includes('-left')) {
      this.searchElement.style.textAlign = 'left';
    }
    // 오른쪽 위치일 때 오른쪽 정렬
    else if (position.includes('-right')) {
      this.searchElement.style.textAlign = 'right';
    }
    // 중앙은 기본값
    else {
      this.searchElement.style.textAlign = '';
    }
  }

  /**
   * 초기 로드 시 오프셋 즉시 적용 (깜빡임 방지)
   * @param {boolean} widgetEnabled
   * @param {boolean} searchEnabled
   */
  async applyInitialOverlap(widgetEnabled, searchEnabled) {
    const widget = this.getActiveWidgetElement();
    if (!widget || !this.searchElement) return;

    // 검색창이 꺼져 있어도 밴드 높이는 내보낸다. 아래 조기 반환에 묶어 두면
    // 검색창을 껐다 켜기 전까지 변수가 비어 있다.
    this.updateBandMetrics();

    if (!widgetEnabled || !searchEnabled) return;

    // 밴드는 오프셋·폭 맞춤을 타지 않는다. 실측만 예약해 높이를 확정한다 (DD8).
    if (this.widgetType === 'calendar') {
      this.scheduleOverlapCheck();
      return;
    }
    if (this.widgetPosition !== this.searchPosition) {
      // 위치가 달라도 실측 충돌은 있을 수 있으므로 검사는 예약한다
      this.scheduleOverlapCheck();
      return;
    }

    // 즉시 오프셋 클래스 적용
    this.getAllWidgetElements().forEach((element) => element.classList.add('overlap-offset'));
    this.searchElement.classList.add('overlap-offset');

    // 정렬 적용
    this.applyAlignment();

    // 위젯별 캐시 너비를 첫 페인트에 즉시 적용 (전환 시 깜빡임 방지)
    const savedWidth = await this.loadSearchWidth();
    if (savedWidth) {
      this.searchElement.style.width = `${savedWidth}px`;
      this.searchElement.style.maxWidth = `${savedWidth}px`;
    }

    // 렌더링 후 실제 너비 재계산 + 실측 충돌 확인
    this.scheduleOverlapCheck();
  }

  /**
   * 고정 즐겨찾기 표시 여부 업데이트
   * @param {string} searchPosition
   */
  updatePinnedBookmarksVisibility(searchPosition) {
    const pinnedBookmarks = document.getElementById('pinnedBookmarks');
    if (pinnedBookmarks) {
      const searchEnabled = this.searchToggle instanceof HTMLInputElement ? this.searchToggle.checked : true;
      // 검색창이 활성화되어 있고 왼쪽에 있을 때 고정 즐겨찾기 숨김
      const isLeftPosition = searchPosition.includes('-left');

      if (searchEnabled && isLeftPosition) {
        pinnedBookmarks.classList.add('hidden');
      } else {
        pinnedBookmarks.classList.remove('hidden');
      }
    }
  }

  /**
   * 위치 설정 표시 여부 업데이트
   */
  updatePositionSettingsVisibility() {
    const widgetPositionSetting = document.getElementById('widgetPositionSetting');
    const searchPositionSetting = document.getElementById('searchPositionSetting');

    const widgetEnabled = this.isWidgetEnabled();
    const searchEnabled = this.isSearchEnabled();

    // 메인 위젯 위치 설정 표시/숨김
    //
    // 달력은 전체 너비 밴드라 고를 위치가 없다. 그리드만 숨기고 저장값
    // (mainWidgetPosition)은 읽지도 쓰지도 않으므로, 시계로 되돌리면 이전 위치가
    // 그대로 복원된다 (DD4).
    if (widgetPositionSetting) {
      const widgetGrid = this.widgetPositionGrid;
      if (widgetEnabled && this.widgetType !== 'calendar') {
        widgetPositionSetting.style.display = 'flex';
        if (widgetGrid) widgetGrid.style.display = 'grid';
      } else {
        widgetPositionSetting.style.display = 'none';
        if (widgetGrid) widgetGrid.style.display = 'none';
      }
    }

    // 달력 데이터 관리 섹션은 달력 모드에서만 노출
    const calendarDataSetting = document.getElementById('calendarDataSetting');
    if (calendarDataSetting) {
      calendarDataSetting.style.display = this.widgetType === 'calendar' ? 'block' : 'none';
    }

    // 검색창 위치 설정 표시/숨김
    if (searchPositionSetting) {
      const searchGrid = this.searchPositionGrid;
      if (searchEnabled) {
        searchPositionSetting.style.display = 'flex';
        if (searchGrid) searchGrid.style.display = 'grid';
      } else {
        searchPositionSetting.style.display = 'none';
        if (searchGrid) searchGrid.style.display = 'none';
      }
    }
  }

  /**
   * 위치 설정 저장
   */
  async savePositionSettings() {
    try {
      // 레거시 clockPosition은 건드리지 않는다 (다운그레이드 안전성)
      await storage.set({
        mainWidgetPosition: this.widgetPosition,
        searchPosition: this.searchPosition,
      });
    } catch (error) {
      console.error('Failed to save position settings:', error);
    }
  }

  /**
   * 애니메이션 활성화
   */
  enableTransitions() {
    this.getAllWidgetElements().forEach((element) => {
      element.classList.add('enable-transition');
    });
    if (this.searchElement) {
      this.searchElement.classList.add('enable-transition');
    }
  }

  /**
   * 달력 이벤트 JSON 내보내기
   */
  handleCalendarExport() {
    if (!this.calendarManager) return;

    // 읽기가 실패한 상태에서 내보내면 빈 파일이 나온다. 사용자는 그것을
    // 백업이라고 믿고 원본을 덮어쓸 수 있다.
    if (!this.calendarManager.canExport()) {
      const statusElement = document.getElementById('calendarImportStatus');
      if (statusElement) {
        statusElement.textContent =
          '할 일을 불러오지 못한 상태라 내보낼 수 없습니다. 달력의 "다시 시도"를 먼저 눌러 주세요.';
      }
      return;
    }

    // 버전 봉투를 씌운다. 맨 배열이면 v3 내보내기와 손상된 v4 내보내기가
    // 구별되지 않고, 가져오기가 무엇을 가정해야 할지 알 수 없다.
    const json = JSON.stringify({ version: 4, events: this.calendarManager.getEvents() }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar-events-${makeDateKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 달력 이벤트 JSON 가져오기 (신뢰 불가 입력 — 정제 후 교체)
   * @param {Event} e
   */
  async handleCalendarImport(e) {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || !input.files || input.files.length === 0) return;
    if (!this.calendarManager) return;

    const statusElement = document.getElementById('calendarImportStatus');
    const file = input.files[0];
    input.value = ''; // 같은 파일 재선택 허용

    try {
      const text = await file.text();
      const sanitized = sanitizeImportedEvents(JSON.parse(text));
      const committed = await this.calendarManager.replaceEvents(sanitized);

      if (statusElement) {
        statusElement.textContent = committed
          ? `${sanitized.length}개 항목을 가져왔습니다`
          : '저장에 실패했습니다. 기존 데이터는 그대로입니다';
      }
    } catch (error) {
      console.error('Failed to import calendar events:', error);
      if (statusElement) {
        statusElement.textContent = `가져오기 실패: ${error.message}. 기존 데이터는 그대로입니다`;
      }
    }
  }
}

/**
 * 애플리케이션 초기화 및 실행
 * 책임: 모든 매니저 클래스의 인스턴스 생성 및 초기화 조율
 */
class Application {
  constructor() {
    this.clockManager = null;
    this.backgroundManager = null;
    this.searchManager = null;
    this.bookmarkManager = null;
    this.imageManager = null;
    this.calendarManager = null;
    this.settingsManager = null;
  }

  /**
   * 애플리케이션 초기화
   */
  async initialize() {
    // 어떤 매니저도 설정 키를 읽기 전에 마이그레이션을 끝낸다.
    // 매니저 내부에서 돌리면 다른 매니저가 복사 이전 값을 읽는 경합이 생긴다.
    // v3는 calendarEvents와 searchWidthByWidget을 건드리므로 CalendarManager /
    // SettingsManager 생성보다 반드시 앞서야 한다.
    const v2Ok = await migrateSettingsToV2();
    const v3Ok = await migrateCalendarToV3();
    // **반환값을 받는다.** migrateCalendarToV4()는 v3와 같은 모양이라 catch에서
    // false를 돌려주고 던지지 않는다 — 받지 않으면 아래 고지가 v4 실패를 담을 값을
    // 갖지 못하고 실패가 통째로 조용해진다 (santa R0 B4).
    const v4Ok = await migrateCalendarToV4();

    // 저장소가 확장이 아니거나 마이그레이션이 실패했다면 화면으로 말한다.
    // body가 존재하는 이 시점이 dataset을 세울 수 있는 가장 이른 지점이다.
    applyStorageNotice({ migrationFailed: !v2Ok || !v3Ok || !v4Ok });

    // DOM 요소 가져오기
    const timeElement = document.getElementById('time');
    const dateElement = document.getElementById('dateDisplay');
    const backgroundElement = document.getElementById('backgroundLayer');
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const bookmarksList = document.getElementById('bookmarksList');
    const pinnedBookmarks = document.getElementById('pinnedBookmarks');
    const bookmarksSidebar = document.getElementById('bookmarksSidebar');
    const bookmarksToggle = document.getElementById('bookmarksToggle');
    const addBookmarkBtn = document.getElementById('addBookmarkBtn');
    const bookmarkModal = document.getElementById('addBookmarkModal');
    const imagesSidebar = document.getElementById('imagesSidebar');
    const imagesToggle = document.getElementById('imagesToggle');
    const settingsModal = document.getElementById('settingsModal');
    const settingsToggle = document.getElementById('settingsToggle');
    const calendarWidget = document.getElementById('calendarWidget');

    // 요소 검증
    if (
      !calendarWidget ||
      !timeElement ||
      !dateElement ||
      !backgroundElement ||
      !(searchForm instanceof HTMLFormElement) ||
      !(searchInput instanceof HTMLInputElement) ||
      !bookmarksList ||
      !pinnedBookmarks ||
      !bookmarksSidebar ||
      !bookmarksToggle ||
      !addBookmarkBtn ||
      !bookmarkModal ||
      !imagesSidebar ||
      !imagesToggle ||
      !settingsModal ||
      !settingsToggle
    ) {
      console.error('Required DOM elements not found');
      return;
    }

    // 매니저 인스턴스 생성 및 초기화
    this.clockManager = new ClockManager(timeElement, dateElement);
    this.clockManager.initialize();

    this.backgroundManager = new BackgroundManager(backgroundElement);
    this.backgroundManager.initialize();

    this.searchManager = new SearchManager(searchForm, searchInput);
    this.searchManager.initialize();

    this.bookmarkManager = new BookmarkManager(bookmarksList, pinnedBookmarks, bookmarksSidebar, bookmarksToggle, addBookmarkBtn, bookmarkModal);
    this.bookmarkManager.initialize();

    this.imageManager = new ImageManager(imagesSidebar, imagesToggle, this.backgroundManager);
    this.imageManager.initialize();

    this.calendarManager = new CalendarManager(calendarWidget);
    await this.calendarManager.initialize();

    // DD37 — 프로젝트 읽기 실패는 calendarManager 가 생긴 뒤에야 알 수 있다.
    // 위 첫 호출은 그대로 두고 여기서 한 번 더 부른다. **둘 다 넘긴다** —
    // 이 함수는 messages 를 매번 처음부터 다시 만들어 통째로 대입하므로
    // projectsLoadFailed 만 넘기면 첫 고지가 지워진다.
    // **한 줄로 적는다**: 그래야 "두 키를 함께 넘겼는가"를 기계가 한 줄에서 본다.
    applyStorageNotice({ migrationFailed: !v2Ok || !v3Ok || !v4Ok, projectsLoadFailed: this.calendarManager.projectsLoadFailed });

    this.settingsManager = new SettingsManager(
      settingsModal,
      settingsToggle,
      this.backgroundManager,
      this.calendarManager
    );
    await this.settingsManager.initialize();

    // DD13 — 첫 실행 온보딩. **자리 계약이다**: `await this.settingsManager.initialize()`
    // **바로 다음 줄**에 잇고, 이것이 이 메서드의 새 마지막 문장이 된다. 초기화 순서를
    // 바꾸거나 별도 메서드로 빼지 않는다 — SettingsManager 는 생성자에서
    // this.calendarManager 를 받으므로 그것보다 먼저 만들 수 없고(순서 변경 불가),
    // 별도 메서드로 빼도 그것을 부르는 자리는 결국 여기다(문제를 한 겹 옮길 뿐).
    // 위 applyStorageNotice(...) 호출이 바로 이 형태 — 필요한 객체가 생긴 직후에
    // 한 문장을 잇는 것이 이 메서드의 기존 관용구다.
    //
    // **네 항 전부에 소유자가 붙어 있다.** 이 자리의 this 는 Application 이고 그
    // 클래스에는 projects 도 projectsLoadFailed 도 없다 — 둘 다 CalendarManager 의
    // 필드이고, calendarSettingsLoaded·calendarOnboardingSeen 은 SettingsManager 의
    // 필드다. bare 로 적으면 항이 undefined 를 읽고 `!undefined` 가 참이라 그 항은
    // 있으나 마나가 된다.
    //
    // 첫째 항이 막는 것: 설정을 못 읽은 상태(읽기 실패 · DOM 부재로 인한 조기 return)를
    // 첫 실행으로 오인하지 않는다. 셋째 항이 막는 것: 프로젝트 읽기 실패를 첫 실행으로
    // 오인하지 않는다 — 그 상황에서 필요한 말은 "프로젝트를 만드시겠어요?" 가 아니라
    // 전반부 DD27c 의 상시 고지가 이미 하고 있는 "목록을 못 읽었습니다" 다.
    if (
      this.settingsManager.calendarSettingsLoaded &&
      this.calendarManager.projects.length === 0 &&
      !this.calendarManager.projectsLoadFailed &&
      !this.settingsManager.calendarOnboardingSeen
    ) {
      openCalendarOnboarding(this.calendarManager, this.settingsManager);
    }
  }
}

// DOM 로드 완료 후 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  // 스모크 하네스(test/positioning.smoke.html)가 프로덕션 핸들러를 직접 구동하기 위한 참조.
  // 위치 로직을 복제하지 않고 실제 코드를 검증하려면 핸들이 필요하다.
  window.__newTabApp = app;
  app.initialize();
});
