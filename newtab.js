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
const SETTINGS_VERSION = 3;

/** migrateSettingsToV2 전용 가드 값 */
const SETTINGS_VERSION_V2 = 2;

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
 * @property {string|null} externalId - M2 Google Calendar event id 대비 예약 필드
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
function createCalendarEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  // v3의 startDate를 우선하고, 없으면 v2의 date에서 승격한다 (DD6).
  const startDate = pickDateKey(input.startDate) || pickDateKey(input.date);
  if (!startDate) return null;

  // endDate는 startDate와 **독립적으로** 왕복 검증한다.
  let endDate = pickDateKey(input.endDate) || startDate;
  if (endDate < startDate) endDate = startDate;
  if (spanDays(startDate, endDate) > MAX_RANGE_DAYS) {
    endDate = shiftDateKey(startDate, MAX_RANGE_DAYS - 1);
  }

  const title = String(input.title ?? '').slice(0, MAX_TITLE_LENGTH).trim();
  if (!title) return null;

  const createdAt = Number.isFinite(input.createdAt) ? Number(input.createdAt) : Date.now();

  return {
    id: typeof input.id === 'string' && input.id ? input.id : crypto.randomUUID(),
    startDate,
    endDate,
    // DD6 — M1 코드로 롤백해도 렌더되도록 남기는 잔존 필드.
    // input.date를 복사하지 **않는다**. 복사하면 startDate와 어긋난 값이 그대로
    // 저장되어 인덱스가 엉뚱한 날짜에 이벤트를 밀어 넣는다.
    date: startDate,
    title,
    note: String(input.note ?? '').slice(0, MAX_NOTE_LENGTH),
    priority: PRIORITIES.indexOf(input.priority) !== -1 ? input.priority : 'normal',
    done: input.done === true,
    createdAt,
    updatedAt: Number.isFinite(input.updatedAt) ? Number(input.updatedAt) : createdAt,
    source: 'local',
    externalId: typeof input.externalId === 'string' ? input.externalId : null,
  };
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
async function migrateCalendarToV3() {
  try {
    const stored = await storage.get([
      'settingsVersion',
      'calendarEvents',
      'searchWidthByWidget',
    ]);

    if ((stored.settingsVersion ?? 1) >= SETTINGS_VERSION) return true;

    const rawEvents = Array.isArray(stored.calendarEvents) ? stored.calendarEvents : [];
    /** @type {CalendarEvent[]} */
    const promoted = [];
    rawEvents.forEach((event) => {
      // 이미 v3인 항목은 자기 값을 그대로 보존한다 (재실행 시 note/priority 유실 방지).
      const next = createCalendarEvent(event);
      if (next) promoted.push(next);
    });

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
      settingsVersion: SETTINGS_VERSION,
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
 * @param {{migrationFailed: boolean}} state
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

  if (messages.length === 0) {
    element.hidden = true;
    return;
  }

  element.textContent = messages.join(' · ');
  element.hidden = false;
}

/**
 * 가져온 JSON을 신뢰 불가 입력으로 취급해 정제
 * 화이트리스트 필드만 새 객체로 복사하므로 prototype pollution이 원천 차단된다.
 * @param {unknown} raw - JSON.parse 결과
 * @returns {CalendarEvent[]}
 * @throws {Error} 구조가 유효하지 않으면
 */
function sanitizeImportedEvents(raw) {
  if (!Array.isArray(raw)) {
    throw new Error('최상위 구조가 배열이 아닙니다');
  }
  if (raw.length > MAX_IMPORT_EVENTS) {
    throw new Error(`항목이 너무 많습니다 (최대 ${MAX_IMPORT_EVENTS}개)`);
  }

  const usedIds = new Set();
  /** @type {CalendarEvent[]} */
  const sanitized = [];
  let usedChars = 0;

  raw.forEach((item) => {
    // 날짜 왕복 검증 · 범위 상한 · 메모 절단 · 중요도 화이트리스트가 전부
    // createCalendarEvent 안에 있다. 여기서 다시 구현하지 않는다.
    const event = createCalendarEvent(item);
    if (!event) return;

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

    await this.loadEvents();
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

    modal.root.classList.add('active');
    modal.titleInput.focus();
    modal.titleInput.select();
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

    const input = {
      startDate,
      endDate,
      title,
      note: modal.noteInput.value,
      priority: this.getModalPriority(),
    };

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
      this.events = raw.map((event) => createCalendarEvent(event)).filter((event) => event !== null);
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
   * 렌더 창과 겹치는 이벤트만 날짜 버킷에 담는다 (DD7)
   *
   * 'YYYY-MM-DD'는 사전순 비교가 곧 시간순 비교라 문자열 그대로 겹침을 판정한다.
   * @param {string} windowStartKey - 그리드 첫 칸
   * @param {string} windowEndKey   - 그리드 마지막 칸
   */
  rebuildIndex(windowStartKey, windowEndKey) {
    this.eventsByDate = new Map();
    if (!windowStartKey || !windowEndKey) return;

    this.events.forEach((event) => {
      // 창 밖이면 전개 자체를 하지 않는다
      if (event.endDate < windowStartKey || event.startDate > windowEndKey) return;

      const from = event.startDate < windowStartKey ? windowStartKey : event.startDate;
      const to = event.endDate > windowEndKey ? windowEndKey : event.endDate;

      let cursor = from;
      while (cursor <= to) {
        const bucket = this.eventsByDate.get(cursor);
        if (bucket) {
          bucket.push(event);
        } else {
          this.eventsByDate.set(cursor, [event]);
        }
        cursor = shiftDateKey(cursor, 1);
      }
    });
  }

  /**
   * 특정 날짜에 걸친 이벤트 (렌더 창과 무관)
   *
   * 패널은 월을 넘겨도 열려 있을 수 있어 선택 날짜가 렌더 창 밖일 수 있다.
   * 창 인덱스로 조회하면 그 경우 빈 목록이 나오므로 전체를 훑는다.
   * @param {string} dateKey
   * @returns {CalendarEvent[]}
   */
  getEventsForDate(dateKey) {
    return this.events.filter((event) => event.startDate <= dateKey && dateKey <= event.endDate);
  }

  /**
   * 이벤트 영속화 — 스냅샷 기반 상태 머신
   *
   * 성공해야만 메모리/인덱스/DOM을 커밋한다. 실패 시 아무것도 건드리지 않으므로
   * 롤백이 자동으로 성립한다. pending 중에는 새 편집을 차단해 재시도가 엉뚱한
   * 스냅샷을 커밋하는 것을 막는다.
   *
   * @param {CalendarEvent[]} nextEvents - 새 배열 (기존 배열 in-place 변형 금지)
   * @param {{isFullReplacement?: boolean}} [options] - 전체 교체(가져오기)는
   *   loadFailed 잠금을 통과한다. 기존 목록에서 파생되지 않으므로 읽기 성공에
   *   의존하지 않고, 읽기가 영구히 깨졌을 때 유일한 복구 수단이다.
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

    const opToken = ++this.opSeq;
    this.pending = { nextEvents, opToken };
    this.setPendingState(true);

    try {
      await storage.set({ calendarEvents: nextEvents });
      if (opToken !== this.opSeq) return false;

      this.events = nextEvents;
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
    const event = createCalendarEvent(input);
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
    const next = createCalendarEvent({
      ...input,
      id: existing.id,
      done: existing.done,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
      externalId: existing.externalId,
    });
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
    return this.persistEvents(nextEvents, { isFullReplacement: true });
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
    return this.events.map((event) => ({ ...event }));
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
   * 판정 기준은 **종료일**이다. 3일짜리 일정의 첫날은 아직 지연이 아니다.
   * @param {CalendarEvent} event
   * @returns {'' | 'overdue' | 'today' | 'soon'}
   */
  getEventDueState(event) {
    if (event.done) return '';
    if (event.endDate < this.todayKey) return 'overdue';
    if (event.endDate === this.todayKey) return 'today';
    if (event.endDate === shiftDateKey(this.todayKey, 1)) return 'soon';
    return '';
  }

  /**
   * 셀의 마감 상태 = 그 셀에 걸친 이벤트 중 가장 급한 것 (지연 > 오늘 > 내일)
   * @param {CalendarEvent[]} dayEvents
   * @returns {'' | 'overdue' | 'today' | 'soon'}
   */
  getCellDueState(dayEvents) {
    /** @type {'' | 'overdue' | 'today' | 'soon'} */
    let state = '';
    for (let i = 0; i < dayEvents.length; i += 1) {
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
    const dueState = this.getCellDueState(dayEvents);

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

      const dueState = this.getEventDueState(event);
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
    if (event.startDate !== event.endDate) {
      meta.push(`${formatShortDate(event.startDate)} – ${formatShortDate(event.endDate)}`);
    }
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

    const json = JSON.stringify(this.calendarManager.getEvents(), null, 2);
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

    // 저장소가 확장이 아니거나 마이그레이션이 실패했다면 화면으로 말한다.
    // body가 존재하는 이 시점이 dataset을 세울 수 있는 가장 이른 지점이다.
    applyStorageNotice({ migrationFailed: !v2Ok || !v3Ok });

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

    this.settingsManager = new SettingsManager(
      settingsModal,
      settingsToggle,
      this.backgroundManager,
      this.calendarManager
    );
    await this.settingsManager.initialize();
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
