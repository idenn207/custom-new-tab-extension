// @ts-check
'use strict';

/**
 * 파일 위치: /my-newtab-extension/test/positioning.smoke.js
 * 파일명: positioning.smoke.js
 * 용도: 위치 회귀 스모크 하네스의 실행 로직
 * 기능: 실제 newtab.html을 iframe으로 구동하며 스냅샷을 수집하고 베이스라인과 비교
 * 책임: 검증 로직만 담당. 프로덕션 위치 계산을 복제하지 않는다
 *
 * 확장 페이지 CSP(script-src 'self')상 인라인 스크립트가 금지되므로 별도 파일로 분리한다.
 */

const BASELINE_KEY = '__smokeBaseline';

/**
 * 베이스라인을 뜬 그 실행의 단언 실패 수. **BASELINE_KEY와 같은 set()으로 커밋한다.**
 *
 * 단언이 깨진 실행에서 뜬 베이스라인은 이후 모든 비교를 무의미하게 만든다.
 * 그 사실이 파일에 남지 않으면 shasum -c는 "오염된 파일과 그 해시가 맞는다"만
 * 증명하고, 게이트 기계가 성공하면서 전제가 무너진다.
 */
const BASELINE_META_KEY = '__smokeBaselineMeta';
const POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center-center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const stage = /** @type {HTMLIFrameElement} */ (document.getElementById('stage'));
const summaryElement = document.getElementById('summary');
const progressElement = document.getElementById('progress');
const resultsBody = document.querySelector('#results tbody');

/** @type {string[]} 현재 로드된 iframe에서 수집된 콘솔/런타임 오류 */
let capturedErrors = [];

/**
 * 단언 실패 목록. **capturedErrors와 의도적으로 분리한다.**
 *
 * 실패 경로를 검증하는 케이스(손상된 저장값 시드 등)는 앱이 console.error를
 * 부르는 것이 **정상 동작**이다. 두 신호를 한 배열에 섞으면 그런 케이스가
 * 하네스를 영구 빨간불로 만들고, 곧 아무도 그 색을 믿지 않게 된다.
 *
 * 이 배열은 베이스라인과도 무관하다 — 베이스라인을 다시 떠도 단언 실패는
 * 사라지지 않는다. 스냅샷 값 비교만으로는 잡히지 않는 회귀를 여기서 잡는다.
 * @type {string[]}
 */
let assertFailures = [];

/**
 * 단언. 실패하면 요약을 빨간불로 만든다 (베이스라인과 무관)
 * @param {boolean} condition
 * @param {string} message - 무엇이 틀렸는지. 값이 아니라 기대를 적는다
 * @returns {boolean} condition 그대로 — 스냅샷에도 함께 기록하기 위해
 */
function assert(condition, message) {
  if (!condition) assertFailures.push(message);
  return condition;
}

/* ────────────────────────── 유틸 ────────────────────────── */

/**
 * 조건이 참이 될 때까지 대기
 * @param {() => boolean} predicate
 * @param {string} label - 타임아웃 시 표시할 이름
 * @param {number} [timeoutMs]
 * @returns {Promise<void>}
 */
function waitFor(predicate, label, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const tick = () => {
      let ready = false;
      try {
        ready = predicate();
      } catch (_) {
        ready = false;
      }
      if (ready) {
        resolve();
      } else if (performance.now() - startedAt > timeoutMs) {
        reject(new Error(`타임아웃: ${label}`));
      } else {
        requestAnimationFrame(tick);
      }
    };
    tick();
  });
}

/**
 * 레이아웃이 안정될 때까지 double-rAF 대기 (프로덕션의 겹침 검사 스케줄링과 동형)
 * @param {number} [frames]
 * @returns {Promise<void>}
 */
function settle(frames = 4) {
  return new Promise((resolve) => {
    let remaining = frames;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * 디바운스된 ResizeObserver 재검사(120ms)가 끝날 때까지 대기
 * @returns {Promise<void>}
 */
function settleDebounce() {
  return new Promise((resolve) => setTimeout(resolve, 220));
}

/**
 * iframe 창에 오류 수집 훅 설치 (중복 설치 방지)
 * @param {Window} frameWindow
 */
function installErrorHooks(frameWindow) {
  if (!frameWindow || frameWindow['__smokeHooked']) return;
  frameWindow['__smokeHooked'] = true;

  const originalError = frameWindow.console.error;
  frameWindow.console.error = function (...args) {
    capturedErrors.push(`console.error: ${args.map((a) => String(a)).join(' ')}`);
    originalError.apply(frameWindow.console, args);
  };
  frameWindow.addEventListener('error', (e) => {
    capturedErrors.push(`error: ${e.message}`);
  });
  frameWindow.addEventListener('unhandledrejection', (e) => {
    capturedErrors.push(`unhandledrejection: ${String(e.reason)}`);
  });
}

/**
 * 지정한 스토리지 상태로 newtab.html을 새로 로드하고 초기화 완료까지 대기
 *
 * 초기화 성공을 명시적으로 단언한다. Application/SettingsManager가 DOM 누락으로
 * early return 했다면 여기서 실패로 잡힌다 (하네스 위양성 방지의 핵심).
 *
 * @param {Record<string, unknown>} storageState
 * @returns {Promise<Window>}
 */
async function loadApp(storageState) {
  await chrome.storage.local.clear();
  if (Object.keys(storageState).length > 0) {
    await chrome.storage.local.set(storageState);
  }

  capturedErrors = [];

  const loaded = new Promise((resolve) => {
    stage.addEventListener('load', () => resolve(undefined), { once: true });
  });
  stage.src = `../newtab.html?smoke=${Date.now()}`;

  // 새 문서가 잡히는 즉시 훅을 건다. load 이전에 실행되는 초기화 오류도 최대한 포착.
  const hookLoop = () => {
    if (stage.contentWindow && stage.contentWindow.document.readyState !== 'uninitialized') {
      installErrorHooks(stage.contentWindow);
    }
    if (!stage.contentWindow || !stage.contentWindow['__newTabApp']) {
      requestAnimationFrame(hookLoop);
    }
  };
  requestAnimationFrame(hookLoop);

  await loaded;
  const frameWindow = /** @type {Window} */ (stage.contentWindow);
  installErrorHooks(frameWindow);

  await waitFor(() => Boolean(frameWindow['__newTabApp']), 'window.__newTabApp 노출');

  const app = frameWindow['__newTabApp'];
  await waitFor(
    () => Boolean(app.settingsManager && app.settingsManager.clockElement && app.settingsManager.calendarElement),
    'SettingsManager 초기화 완료 (DOM 누락으로 early return 하지 않았는지)'
  );
  await waitFor(() => Boolean(app.calendarManager && app.calendarManager.gridElement), 'CalendarManager 초기화 완료');

  await settle();
  return frameWindow;
}

/**
 * 현재 화면 상태를 스냅샷으로 직렬화
 * @param {Window} frameWindow
 * @returns {Record<string, unknown>}
 */
function snapshot(frameWindow) {
  const doc = frameWindow.document;

  /**
   * @param {Element|null} element
   * @returns {Record<string, unknown>|null}
   */
  const describe = (element) => {
    if (!(element instanceof frameWindow.HTMLElement)) return null;
    const rect = element.getBoundingClientRect();
    return {
      classes: Array.from(element.classList).sort().join(' '),
      display: frameWindow.getComputedStyle(element).display,
      inlineWidth: element.style.width || '',
      rect: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)].join(','),
    };
  };

  const clock = doc.getElementById('clock');
  const calendar = doc.getElementById('calendarWidget');
  const search = doc.querySelector('.search-container');

  /** 활성 위젯 ↔ 검색창 실측 교차 여부 */
  let intersects = false;
  const activeElement = doc.body.dataset.widgetType === 'calendar' ? calendar : clock;
  if (activeElement instanceof frameWindow.HTMLElement && search instanceof frameWindow.HTMLElement) {
    const styleA = frameWindow.getComputedStyle(activeElement);
    const styleB = frameWindow.getComputedStyle(search);
    if (styleA.display !== 'none' && styleB.display !== 'none') {
      const a = activeElement.getBoundingClientRect();
      const b = search.getBoundingClientRect();
      intersects = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    }
  }

  return {
    widgetType: doc.body.dataset.widgetType || '',
    clock: describe(clock),
    calendar: describe(calendar),
    search: describe(search),
    intersects,
  };
}

/* ────────────────────────── 케이스 ────────────────────────── */

/**
 * 케이스 결과 누적기
 * @returns {{add: (name: string, value: unknown, errors?: string[]) => void, results: Record<string, unknown>}}
 */
/**
 * 전역 함수 호출을 세는 스파이 (Task 2가 만들고 Task 3·4가 재사용한다)
 *
 * DD24의 **호출 층위**를 보는 도구다. 결과만 보면 우연히 맞은 경우를 통과시키고,
 * 호출만 보면 잘못 부른 경우를 놓친다 — 두 층위를 함께 걸어야 한다.
 *
 * `newtab.js`는 클래식 스크립트이므로 최상위 `function` 선언이 전역 객체의 속성이
 * 된다. 그래서 그 속성을 갈아 끼우면 내부 호출도 래퍼를 지난다. (`const`로 선언된
 * 상수는 전역 객체에 붙지 않으므로 같은 방법으로 볼 수 없다.)
 *
 * **케이스는 반드시 `try/finally`로 감싸 `restore()`한다.** 복원하지 않으면 뒤따르는
 * 케이스가 래퍼를 쓰게 되고, 그것은 `runAll()`이 저장소를 복원하는 규약과 같은 이유다.
 * @param {Window} frameWindow
 * @param {string} name
 * @returns {{calls: number, restore: () => void}}
 */
function spyOn(frameWindow, name) {
  const original = frameWindow[name];
  if (typeof original !== 'function') {
    throw new Error(`spyOn: ${name} 은 함수가 아니다 (전역 객체에 없거나 const 선언이다)`);
  }
  const state = {
    calls: 0,
    restore() {
      frameWindow[name] = original;
    },
  };
  frameWindow[name] = function spy() {
    state.calls += 1;
    return original.apply(this, arguments);
  };
  return state;
}

function createCollector() {
  /** @type {Record<string, unknown>} */
  const results = {};
  return {
    results,
    add(name, value, errors) {
      results[name] = errors && errors.length > 0 ? { value, errors: errors.slice() } : value;
    },
  };
}

/**
 * 위젯 9위치 × 검색창 9위치 = 81조합 (위젯 타입별)
 * 실제 SettingsManager 핸들러를 호출하므로 위치 로직이 복제되지 않는다.
 * @param {ReturnType<typeof createCollector>} collector
 * @param {'clock'|'calendar'} widgetType
 */
async function runPositionMatrix(collector, widgetType) {
  const frameWindow = await loadApp({ widgetType, settingsVersion: 2, mainWidgetEnabled: true, searchEnabled: true });
  const settings = frameWindow['__newTabApp'].settingsManager;

  for (const widgetPosition of POSITIONS) {
    await settings.handleWidgetPositionChange(widgetPosition);
    for (const searchPosition of POSITIONS) {
      await settings.handleSearchPositionChange(searchPosition);
      await settle();
      collector.add(`matrix/${widgetType}/${widgetPosition}/${searchPosition}`, snapshot(frameWindow), capturedErrors);
      progress(`matrix ${widgetType}: ${widgetPosition} × ${searchPosition}`);
    }
  }
}

/**
 * 달력 밴드의 **위치 불변식** — 81조합에서 밴드 rect가 하나여야 한다
 *
 * 달력에는 더 이상 위치가 없으므로 matrix/calendar/** 81건을 스냅샷으로 남기는 것은
 * 회귀 탐지에 도움이 되지 않는다. 81건이 전부 같은 값이라, 무언가 깨져도 diff가
 * 81줄로 번져 원인을 가린다. 대신 "무엇이 참이어야 하는가"를 한 건으로 적는다.
 *
 * 함께 확인하는 것: 검색창이 top-* 일 때 밴드와 겹치지 않는다 (DD3).
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runBandInvariance(collector) {
  const frameWindow = await loadApp({
    widgetType: 'calendar',
    settingsVersion: 3,
    mainWidgetEnabled: true,
    searchEnabled: true,
  });
  const settings = frameWindow['__newTabApp'].settingsManager;

  /** @type {Set<string>} */
  const bandRects = new Set();
  /** @type {Set<string>} */
  const intersectionsBySearchPosition = new Set();
  let samples = 0;

  for (const widgetPosition of POSITIONS) {
    await settings.handleWidgetPositionChange(widgetPosition);
    for (const searchPosition of POSITIONS) {
      await settings.handleSearchPositionChange(searchPosition);
      await settle();

      const shot = snapshot(frameWindow);
      bandRects.add(shot.calendar ? String(shot.calendar.rect) : 'null');
      intersectionsBySearchPosition.add(`${searchPosition}=${shot.intersects}`);
      samples += 1;
      progress(`band invariance: ${widgetPosition} × ${searchPosition}`);
    }
  }

  const distinctRects = Array.from(bandRects).sort();
  collector.add(
    'matrix/calendar/band-invariance',
    {
      samples,
      distinctBandRects: distinctRects,
      // 핵심 단언 — 위젯 위치 9종을 바꿔도 밴드는 움직이지 않는다
      bandRectIsInvariant: distinctRects.length === 1,
      // 상단 검색창은 밴드 아래로 비켜야 한다. 'top-*=true'가 하나라도 있으면 실패다
      topSearchIntersections: Array.from(intersectionsBySearchPosition)
        .filter((entry) => entry.startsWith('top-'))
        .sort(),
    },
    capturedErrors
  );
}

/**
 * 위젯 ON/OFF × 검색창 ON/OFF 4조합 (위젯 타입별)
 * @param {ReturnType<typeof createCollector>} collector
 * @param {'clock'|'calendar'} widgetType
 */
async function runToggleMatrix(collector, widgetType) {
  for (const widgetEnabled of [true, false]) {
    for (const searchEnabled of [true, false]) {
      const frameWindow = await loadApp({
        widgetType,
        settingsVersion: 2,
        mainWidgetEnabled: widgetEnabled,
        searchEnabled,
        mainWidgetPosition: 'center-center',
        searchPosition: 'center-center',
      });
      await settle();
      collector.add(
        `toggle/${widgetType}/widget=${widgetEnabled}/search=${searchEnabled}`,
        snapshot(frameWindow),
        capturedErrors
      );
      progress(`toggle ${widgetType}: ${widgetEnabled}/${searchEnabled}`);
    }
  }
}

/**
 * 동적 상태 전이 후 재측정
 * 정적 조합만으로는 폰트 로드·월 이동·패널 펼침·리사이즈 이후의 후발 충돌을 못 잡는다.
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runDynamicCases(collector) {
  const frameWindow = await loadApp({
    widgetType: 'calendar',
    settingsVersion: 2,
    mainWidgetEnabled: true,
    searchEnabled: true,
    mainWidgetPosition: 'center-center',
    searchPosition: 'center-center',
  });
  const app = frameWindow['__newTabApp'];
  const settings = app.settingsManager;
  const calendar = app.calendarManager;

  collector.add('dynamic/00-initial', snapshot(frameWindow), capturedErrors);

  // 위젯 전환 (달력 → 시계 → 달력)
  await settings.handleWidgetTypeChange('clock');
  await settle();
  collector.add('dynamic/01-switch-to-clock', snapshot(frameWindow), capturedErrors);

  await settings.handleWidgetTypeChange('calendar');
  await settle();
  collector.add('dynamic/02-switch-to-calendar', snapshot(frameWindow), capturedErrors);

  // 월 이동
  calendar.shiftMonth(1);
  await settle();
  collector.add('dynamic/03-next-month', snapshot(frameWindow), capturedErrors);

  calendar.goToToday();
  await settle();
  collector.add('dynamic/04-today', snapshot(frameWindow), capturedErrors);

  // 패널 펼침 (세로 성장 → 검색창 충돌 가능 구간)
  const todayKey = frameWindow.makeDateKey(new Date());
  calendar.selectDate(todayKey);
  await settle();
  await settleDebounce();
  collector.add('dynamic/05-panel-open', snapshot(frameWindow), capturedErrors);

  // 할 일 추가 → 삭제 (이벤트 개수 변화)
  await calendar.addEvent({ startDate: todayKey, endDate: todayKey, title: '스모크 하네스 항목' });
  await settle();
  collector.add('dynamic/06-todo-added', snapshot(frameWindow), capturedErrors);

  const added = calendar.getEvents().find((event) => event.title === '스모크 하네스 항목');
  if (added) {
    await calendar.deleteEvent(added.id);
    await settle();
  }
  collector.add('dynamic/07-todo-deleted', snapshot(frameWindow), capturedErrors);

  calendar.closePanel();
  await settle();
  await settleDebounce();
  collector.add('dynamic/08-panel-closed', snapshot(frameWindow), capturedErrors);

  // 뷰포트 리사이즈 (디바운스된 ResizeObserver 경로)
  stage.style.width = '900px';
  stage.style.height = '620px';
  await settleDebounce();
  collector.add('dynamic/09-resize-900', snapshot(frameWindow), capturedErrors);

  stage.style.width = '760px';
  stage.style.height = '560px';
  await settleDebounce();
  collector.add('dynamic/10-resize-760', snapshot(frameWindow), capturedErrors);

  stage.style.width = '1280px';
  stage.style.height = '800px';
  await settleDebounce();
  collector.add('dynamic/11-resize-restored', snapshot(frameWindow), capturedErrors);

  progress('dynamic cases 완료');
}

/**
 * 마이그레이션 케이스 — 레거시 키 단독 / 2회 실행 멱등성 / 레거시 무손상
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runMigrationCases(collector) {
  // 레거시 키만 존재하는 업그레이드 직전 상태
  const legacyState = {
    clockEnabled: true,
    clockPosition: 'top-right',
    searchPosition: 'top-right',
    searchWidth: 420,
  };

  const frameWindow = await loadApp(legacyState);
  const first = await chrome.storage.local.get(null);
  collector.add(
    'migration/01-first-run',
    {
      settingsVersion: first.settingsVersion,
      mainWidgetEnabled: first.mainWidgetEnabled,
      mainWidgetPosition: first.mainWidgetPosition,
      legacyClockEnabled: first.clockEnabled,
      legacyClockPosition: first.clockPosition,
      legacySearchWidth: first.searchWidth,
      renderedWidgetPosition: frameWindow['__newTabApp'].settingsManager.widgetPosition,
    },
    capturedErrors
  );

  // 마이그레이션 2회 실행 — 결과가 동일해야 한다 (멱등)
  await frameWindow.migrateSettingsToV2();
  await frameWindow.migrateSettingsToV2();
  const second = await chrome.storage.local.get(null);
  collector.add('migration/02-idempotent', {
    settingsVersion: second.settingsVersion,
    mainWidgetEnabled: second.mainWidgetEnabled,
    mainWidgetPosition: second.mainWidgetPosition,
    sameAsFirstRun:
      second.mainWidgetEnabled === first.mainWidgetEnabled &&
      second.mainWidgetPosition === first.mainWidgetPosition &&
      second.settingsVersion === first.settingsVersion,
  });

  // 레거시 키 무손상 — 위치를 바꿔도 clockPosition은 그대로여야 한다 (다운그레이드 안전성)
  await frameWindow['__newTabApp'].settingsManager.handleWidgetPositionChange('bottom-left');
  const afterChange = await chrome.storage.local.get(['clockPosition', 'clockEnabled', 'searchWidth', 'mainWidgetPosition']);
  collector.add('migration/03-legacy-preserved', {
    legacyClockPosition: afterChange.clockPosition,
    legacyClockEnabled: afterChange.clockEnabled,
    legacySearchWidth: afterChange.searchWidth,
    newMainWidgetPosition: afterChange.mainWidgetPosition,
  });

  progress('migration cases 완료');
}

/**
 * 달력 v3 마이그레이션 — 단일 날짜 승격 / date 잔존 / 340px 캐시 정리 / 2회 멱등
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runCalendarV3MigrationCases(collector) {
  const frameWindow = await loadApp({
    settingsVersion: 2,
    widgetType: 'calendar',
    mainWidgetEnabled: true,
    searchEnabled: true,
    // M1 시절 340px 카드 폭이 캐시로 남아 있는 상태
    searchWidthByWidget: { clock: 420, calendar: 340 },
    calendarEvents: [
      { id: 'evt-1', date: '2026-08-06', title: '단일 날짜', done: false, createdAt: 1, source: 'local', externalId: null },
      { id: 'evt-2', date: '2026-08-20', title: '완료 항목', done: true, createdAt: 2, source: 'local', externalId: null },
    ],
  });

  const first = await chrome.storage.local.get(['settingsVersion', 'calendarEvents', 'searchWidthByWidget']);
  const promoted = Array.isArray(first.calendarEvents) ? first.calendarEvents : [];
  const widths = first.searchWidthByWidget || {};

  collector.add(
    'migration-v3/01-promote',
    {
      settingsVersion: first.settingsVersion,
      count: promoted.length,
      promotedRanges: promoted.map((event) => `${event.startDate}~${event.endDate}`),
      // DD6 — date를 지우지 않아야 M1 코드로 롤백해도 달력이 그대로 렌더된다
      legacyDatePreserved: promoted.every((event) => event.date === event.startDate),
      fields: promoted.length > 0 ? Object.keys(promoted[0]).sort().join(',') : '',
      donePreserved: promoted.map((event) => event.done),
      // 밴드 모드에서 첫 페인트에 340px가 물리는 것을 막는 정리
      calendarWidthCacheCleared: widths.calendar === undefined,
      clockWidthPreserved: widths.clock,
    },
    capturedErrors
  );

  // 사용자가 note/priority를 채운 뒤 마이그레이션이 다시 돌아도 지워지면 안 된다
  const withUserData = promoted.map((event) => ({ ...event, note: '사용자 메모', priority: 'high' }));
  await chrome.storage.local.set({ calendarEvents: withUserData, settingsVersion: 2 });
  await frameWindow.migrateCalendarToV3();
  await frameWindow.migrateCalendarToV3();

  const second = await chrome.storage.local.get(['settingsVersion', 'calendarEvents']);
  const reRun = Array.isArray(second.calendarEvents) ? second.calendarEvents : [];
  collector.add('migration-v3/02-idempotent', {
    settingsVersion: second.settingsVersion,
    count: reRun.length,
    notesPreserved: reRun.every((event) => event.note === '사용자 메모'),
    prioritiesPreserved: reRun.every((event) => event.priority === 'high'),
  });

  progress('calendar v3 migration cases 완료');
}

/**
 * 달력 v4 마이그레이션 — 관문 승격 / 멱등 / 잔존 필드 / v2→v3→v4 연쇄
 *
 * DD24의 세 층위 중 **변환 층위**가 주 증인이다. 시동 호출은 spy 로 셀 수 없다 —
 * `loadApp()`은 초기화가 끝난 뒤에야 반환하므로 그 spy 는 언제나 0을 센다. 그래서
 * 증명 대상을 바꿔 순수 함수를 **직접 부른다**(DD19가 여기서 값을 낸다).
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runCalendarV4MigrationCases(collector) {
  const frameWindow = await loadApp({
    settingsVersion: 2,
    widgetType: 'calendar',
    mainWidgetEnabled: true,
    searchEnabled: true,
    // V2V3V4-CHAIN — v2 데이터가 v3를 거쳐 v4까지 한 번에 올라오는 케이스다.
    // 340px 캐시는 v3에만 있는 부수효과라 "v3가 실제로 돌았다"의 보조 증인이 된다.
    // DD10의 함정(새 마이그레이션이 SETTINGS_VERSION을 올려 v3가 영영 실행되지
    // 않는 것)은 이 케이스에서만 드러난다.
    searchWidthByWidget: { clock: 420, calendar: 340 },
    calendarEvents: [
      { id: 'v2-single', date: '2026-08-06', title: 'v2 단일', done: false, createdAt: 1, source: 'local', externalId: null },
      { id: 'v2-done', date: '2026-08-20', title: 'v2 완료', done: true, createdAt: 2, source: 'local', externalId: null },
      { id: 'v3-range', startDate: '2026-09-01', endDate: '2026-09-05', date: '2026-09-01', title: 'v3 범위', done: false, createdAt: 3, note: '메모', priority: 'high', updatedAt: 3, source: 'local', externalId: null },
    ],
  });

  const first = await chrome.storage.local.get([
    'settingsVersion',
    'calendarEvents',
    'calendarProjects',
    'searchWidthByWidget',
  ]);
  const promoted = Array.isArray(first.calendarEvents) ? first.calendarEvents : [];
  const byId = (id) => promoted.find((event) => event.id === id);
  const widths = first.searchWidthByWidget || {};

  assert(
    widths.calendar === undefined,
    'V2V3V4-CHAIN: v2→v4 연쇄에서 v3가 실행되지 않았다 — 340px 캐시가 남아 있다'
  );
  assert(first.settingsVersion === 4, 'v4 마이그레이션이 settingsVersion을 4로 올리지 않았다');

  // 축 1 — 초회 승격
  collector.add(
    'migration-v4/01-promote',
    {
      settingsVersion: first.settingsVersion,
      count: promoted.length,
      gateCounts: promoted.map((event) => `${event.id}=${event.gates.length}`),
      // 마이그레이션이 만드는 관문에는 이름이 없다 (DD2) — 사용자가 입력한 적 없는
      // 사실을 마이그레이션이 만들어 내지 않는다.
      allKindsNull: promoted.every((event) => event.gates.every((gate) => gate.kind === null)),
      allActualsNull: promoted.every((event) => event.gates.every((gate) => gate.actual === null)),
      // 종단 관문만 done 을 물려받는다.
      doneInheritedByTerminal: (() => {
        const event = byId('v2-done');
        return Boolean(event && event.gates[event.gates.length - 1].status === 'done');
      })(),
      narrowHasOneGate: (() => {
        const event = byId('v2-single');
        return Boolean(event && event.gates.length === 1);
      })(),
      // 폭 있는 항목은 관문 둘 — DD1의 uniqueDates 가 그렇게 접는다.
      widthHasTwoGates: (() => {
        const event = byId('v3-range');
        return Boolean(event && event.gates.length === 2);
      })(),
      projectsOpened: Array.isArray(first.calendarProjects) ? first.calendarProjects.length : null,
      allUnassigned: promoted.every((event) => event.projectId === null),
      calendarWidthCacheCleared: widths.calendar === undefined,
      clockWidthPreserved: widths.clock,
    },
    capturedErrors
  );

  // 축 3 — 잔존 필드가 남아 있고 파생값과 일치한다 (DD4)
  const min = (event) => event.gates.map((gate) => gate.planned).slice().sort()[0];
  const max = (event) => event.gates.map((gate) => gate.planned).slice().sort()[event.gates.length - 1];
  assert(
    promoted.every((event) => event.startDate === min(event) && event.endDate === max(event)),
    '파생 필드가 관문과 어긋난 채 커밋됐다 (startDate !== min(planned) 또는 endDate !== max(planned))'
  );
  collector.add('migration-v4/03-legacy-fields', {
    dateEqualsStart: promoted.every((event) => event.date === event.startDate),
    rangesMatchGates: promoted.every((event) => event.startDate === min(event) && event.endDate === max(event)),
    promotedRanges: promoted.map((event) => `${event.startDate}~${event.endDate}`),
    fields: promoted.length > 0 ? Object.keys(promoted[0]).sort().join(',') : '',
  });

  // 축 2 — 멱등. 사용자가 이름 붙인 관문과 메모가 재실행에서 유실되지 않는다.
  const withUserWork = promoted.map((event) => ({
    ...event,
    note: '사용자 메모',
    gates: event.gates.map((gate, index) => (index === 0 ? { ...gate, kind: 'dev' } : gate)),
  }));
  await chrome.storage.local.set({ calendarEvents: withUserWork, settingsVersion: 3 });
  await frameWindow.migrateCalendarToV4();
  await frameWindow.migrateCalendarToV4();

  const second = await chrome.storage.local.get(['settingsVersion', 'calendarEvents']);
  const reRun = Array.isArray(second.calendarEvents) ? second.calendarEvents : [];
  collector.add('migration-v4/02-idempotent', {
    settingsVersion: second.settingsVersion,
    count: reRun.length,
    notesPreserved: reRun.every((event) => event.note === '사용자 메모'),
    namedGatesPreserved: reRun.every((event) => event.gates[0].kind === 'dev'),
    gateCountsStable: reRun.map((event) => `${event.id}=${event.gates.length}`),
  });

  // 변환 층위 — 순수 함수를 직접 부른다. 시동 타이밍과 무관하고 spy 보다 강하다
  // (호출 여부가 아니라 **결과**를 본다).
  const v2Input = [{ id: 'p', date: '2026-08-06', title: '순수', done: false, createdAt: 1, source: 'local', externalId: null }];
  const viaPureV3 = frameWindow.promoteEventsToV3(v2Input);
  const viaPureV4 = frameWindow.promoteEventsToV4(viaPureV3);
  collector.add('migration-v4/04-pure-functions', {
    v3PromotesRange: viaPureV3[0].startDate === '2026-08-06' && viaPureV3[0].endDate === '2026-08-06',
    v3KeepsLegacyDate: viaPureV3[0].date === '2026-08-06',
    v4MakesGate: viaPureV4[0].gates.length === 1 && viaPureV4[0].gates[0].kind === null,
    // 입력 배열을 in-place 변형하지 않는다.
    inputUnchanged: v2Input[0].gates === undefined,
  });

  // 호출 층위 — DD26의 **셋째 호출 자리**. 결과만 보면 우연히 맞은 경우를 통과시킨다.
  const spy = spyOn(frameWindow, 'deriveEventRange');
  try {
    const many = frameWindow.promoteEventsToV4([
      { id: 'a', date: '2026-08-01', title: 'a', createdAt: 1 },
      { id: 'b', startDate: '2026-08-02', endDate: '2026-08-05', title: 'b', createdAt: 2 },
    ]);
    assert(
      spy.calls >= many.length,
      'promoteEventsToV4가 각 이벤트에 deriveEventRange를 부르지 않았다 (DD26 셋째 호출 자리)'
    );
    collector.add('migration-v4/05-derive-call-site', {
      events: many.length,
      deriveCallsAtLeastEvents: spy.calls >= many.length,
    });
  } finally {
    spy.restore();
  }

  // **형제 키에도 같은 가드가 걸린다** (code-review HIGH).
  //
  // calendarEvents 는 배열이 아니면 승격을 멈추는데 calendarProjects 는 []로
  // 덮어썼다. 그러면 loadProjects()의 봉인이 발화할 기회를 잃고, 그 빈 목록을
  // 근거로 멀쩡한 참조가 전건 강등된다 — 손실이 두 겹이다.
  const corrupt = await loadApp({
    settingsVersion: 3,
    widgetType: 'calendar',
    mainWidgetEnabled: true,
    calendarEvents: [],
    calendarProjects: { not: 'an array' },
  });
  const corruptStored = await chrome.storage.local.get(['settingsVersion', 'calendarProjects']);
  collector.add('migration-v4/06-corrupt-projects-held', {
    // 승격하지 않는다 — 버전이 오르지 않는다.
    versionHeld: corruptStored.settingsVersion === 3,
    // 손상된 값이 그대로 남아 있다. []로 덮이지 않았다.
    projectsPreserved: !Array.isArray(corruptStored.calendarProjects),
    // 실패를 조용히 넘기지 않고 화면으로 말한다.
    noticeShown: (() => {
      const node = corrupt.document.getElementById('storageNotice');
      return Boolean(node && !node.hidden);
    })(),
  });
  assert(corruptStored.settingsVersion === 3, '손상된 calendarProjects 위로 v4 승격이 통과했다');
  assert(
    !Array.isArray(corruptStored.calendarProjects),
    'v4 마이그레이션이 손상된 프로젝트를 []로 덮어써 지웠다'
  );

  progress('calendar v4 migration cases 완료');
}

/**
 * v4 등가 판정 — 마이그레이션이 **마감 의미**와 **점유**를 바꾸지 않았는가 (DD15·DD3)
 *
 * `snapshot()`은 위젯 기하만 담으므로 마감 의미가 통째로 뒤집혀도 사각형은 움직이지
 * 않는다. 그 diff 는 DD3를 지키지 못한다 — 그래서 도메인 투영을 따로 만든다.
 *
 * **기준값은 렌더에서 뜨지 않고 계산한다.** `loadApp()`은 시동 마이그레이션이 끝난
 * 뒤에야 반환하므로 "마이그레이션 이전 렌더"는 Task 2 이후 **도달 불가능한 상태**이고,
 * 그것을 렌더로 뜨려는 설계는 두 투영이 **똑같이 틀린 채로** 맞아떨어져 버그를
 * 통과시킨다. 그래서 v3의 마감 규칙을 참조 구현으로 박아 둔다.
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runCalendarV4EquivalenceCases(collector) {
  // 날짜는 전부 todayKey 기준 상대값이다. 고정 날짜는 하네스를 돌리는 날에 따라
  // 같은 항목이 미래였다가 지연이 되어 케이스를 저절로 뒤집는다.
  const probe = await loadApp({ settingsVersion: 4, widgetType: 'calendar', mainWidgetEnabled: true, calendarEvents: [] });
  const todayKey = probe['__newTabApp'].calendarManager.todayKey;
  const shift = (n) => probe.shiftDateKey(todayKey, n);

  const fixtures = [
    // DD3-FIXTURE-WIDTH — **폭 있는 항목.** 이 한 줄이 DD3의 실질 판정이다: v3 데이터는
    // 전부 startDate === endDate 라 폭 없는 항목만으로는 DD3이 정반대로 구현돼도
    // 통과한다. 모든 관문을 읽는 구현이면 여기서 'overdue'가 나와 즉시 죽는다.
    { id: 'fx-1', startDate: shift(-3), endDate: shift(0), title: '폭 있음 · 오늘 마감' },
    // DD3-FIXTURE
    { id: 'fx-2', startDate: shift(-5), endDate: shift(-1), title: '지연' },
    // DD3-FIXTURE
    { id: 'fx-3', startDate: shift(0), endDate: shift(2), title: '진행 중' },
    // DD3-FIXTURE
    { id: 'fx-4', startDate: shift(0), endDate: shift(0), title: '오늘 하루' },
  ].map((f) => ({ ...f, date: f.startDate, done: false, createdAt: 1, updatedAt: 1, source: 'local', externalId: null }));

  // v3 상태로 씨를 뿌리고 시동 마이그레이션을 태운다.
  const frameWindow = await loadApp({
    settingsVersion: 3,
    widgetType: 'calendar',
    mainWidgetEnabled: true,
    searchEnabled: true,
    calendarEvents: fixtures,
  });
  const calendar = frameWindow['__newTabApp'].calendarManager;

  // 참조 구현 — v3의 마감 규칙 세 줄 그대로다 (newtab.js:2629-2631 원문).
  // 다섯 줄을 넘으면 그것은 판정자가 아니라 두 번째 구현이고 DD11이 금지한 것이다.
  const expectedByV3Rule = (event) => {
    if (event.endDate < todayKey) return 'overdue';
    if (event.endDate === todayKey) return 'today';
    if (event.endDate === frameWindow.shiftDateKey(todayKey, 1)) return 'soon';
    return '';
  };

  const after = calendar.getEvents().slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  const expected = fixtures.slice().sort((a, b) => (a.id < b.id ? -1 : 1)).map(expectedByV3Rule);
  const meaning = after.map((event) => calendar.getEventDueState(event));

  // 단언 1 — 의미. diff 가 아니라 **단언**이다: 재베이스라인해도 사라지지 않아야 한다.
  assert(
    JSON.stringify(meaning) === JSON.stringify(expected),
    'v4 마이그레이션이 마감 의미를 바꿨다 (after.meaning !== expectedByV3Rule)'
  );

  // 단언 2 — 점유. 이 플랜은 rebuildIndex()도 getEventsForDate()도 건드리지 않으므로
  // 점유도 같아야 한다. 실수로 함께 고치면 여기서 죽는다.
  const spanKeys = [];
  for (let offset = -7; offset <= 7; offset += 1) spanKeys.push(shift(offset));
  const bucketKeysBefore = [];
  const bucketKeysAfter = [];
  spanKeys.forEach((dateKey) => {
    fixtures.forEach((fixture) => {
      if (fixture.startDate <= dateKey && dateKey <= fixture.endDate) {
        bucketKeysBefore.push(`${dateKey}|${fixture.id}`);
      }
    });
    calendar.getEventsForDate(dateKey).forEach((event) => {
      bucketKeysAfter.push(`${dateKey}|${event.id}`);
    });
  });
  const setEq = (a, b) => a.length === b.length && a.slice().sort().join(',') === b.slice().sort().join(',');
  assert(setEq(bucketKeysAfter, bucketKeysBefore), 'v4 마이그레이션이 점유를 바꿨다');

  collector.add('v4-equivalence/01-meaning', {
    meaning,
    expected,
    equal: JSON.stringify(meaning) === JSON.stringify(expected),
    // 진단용이다. 단언하지 않는다 — 참조 구현이 배너 문구에는 답할 수 없고,
    // 배너는 마감 상태 다중집합의 순수 함수이므로 위 단언에서 이미 따라 나온다.
    summaryText: (() => {
      const node = frameWindow.document.querySelector('.calendar-summary');
      return node ? node.textContent : null;
    })(),
  });
  collector.add('v4-equivalence/02-occupancy', {
    before: bucketKeysBefore.length,
    afterCount: bucketKeysAfter.length,
    equal: setEq(bucketKeysAfter, bucketKeysBefore),
  });

  // DD3-FIXTURE — **다섯째 고정 입력: 같은 날짜의 이름 있는 관문 둘.**
  // 마이그레이션으로는 만들어지지 않는다(uniqueDates 가 접는다). 그래서 v4 이벤트로
  // 직접 세우고, v3 대응물이 없으므로 위 등가 단언의 입력 집합에는 넣지 않는다.
  const dualGateEvent = frameWindow.createCalendarEvent({
    id: 'fx-dual',
    title: '동점 관문 둘',
    gates: [
      { kind: 'dev', planned: shift(-1), actual: null, status: 'pending' },
      { kind: 'review', planned: shift(-1), actual: null, status: 'pending' },
    ],
    createdAt: 1,
  });
  assert(
    dualGateEvent !== null && dualGateEvent.gates.length === 2,
    'DD25: 같은 날짜의 이름 있는 관문 둘이 접혀 버렸다 — 접기가 너무 많이 접는다'
  );
  // 단언 3 — DD25의 동점 면제. getEventDueState 가 planned 하나만 읽으므로 어느 것을
  // 골라도 답이 같아야 한다. **뒤집기가 이 단언의 전부다**: 순서를 바꿔 답이 달라지면
  // 판정이 planned 말고 무언가를 함께 읽고 있다는 뜻이고, 그 순간 면제 근거가 사라진다.
  const reversed = { ...dualGateEvent, gates: dualGateEvent.gates.slice().reverse() };
  assert(calendar.getEventDueState(dualGateEvent) === 'overdue', 'DD25 동점 면제가 깨졌다');
  assert(
    calendar.getEventDueState(reversed) === calendar.getEventDueState(dualGateEvent),
    'DD25 동점 면제가 깨졌다 — 관문 순서가 마감 판정을 바꾼다'
  );
  collector.add('v4-equivalence/03-tie-exemption', {
    gates: dualGateEvent ? dualGateEvent.gates.length : 0,
    forward: calendar.getEventDueState(dualGateEvent),
    reversed: calendar.getEventDueState(reversed),
    orderIndependent: calendar.getEventDueState(reversed) === calendar.getEventDueState(dualGateEvent),
  });

  progress('calendar v4 equivalence cases 완료');
}

/**
 * 프로젝트 컬렉션 — 삭제 시 강등 / 기본값 / 가져오기 참조 무결성 (DD7·DD27·DD28)
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runCalendarProjectCases(collector) {
  const frameWindow = await loadApp({
    settingsVersion: 4,
    widgetType: 'calendar',
    mainWidgetEnabled: true,
    searchEnabled: true,
    calendarEvents: [],
    calendarProjects: [],
  });
  const calendar = frameWindow['__newTabApp'].calendarManager;
  const todayKey = calendar.todayKey;

  await calendar.addProject({ name: '프로젝트 A' });
  const projectId = calendar.projects[0].id;
  await calendar.setLastUsedProjectId(projectId);
  await calendar.addEvent({ startDate: todayKey, endDate: todayKey, title: '소속 있음', projectId });
  await calendar.addEvent({ startDate: todayKey, endDate: todayKey, title: '무소속' });

  const beforeDelete = {
    events: calendar.getEvents().length,
    defaultProject: calendar.defaultProjectId(),
  };

  // 두 경로(삭제·가져오기)가 **같은 함수**를 부르는지 본다 (DD24의 호출 층위).
  const reconcileSpy = spyOn(frameWindow, 'reconcileProjectRefs');
  let deleteCalls = 0;
  let importCalls = 0;
  try {
    await calendar.removeProject(projectId);
    deleteCalls = reconcileSpy.calls;

    const foreign = frameWindow.sanitizeImportedEvents([
      { startDate: todayKey, endDate: todayKey, title: '남의 파일 1', projectId: 'foreign-1' },
      { startDate: todayKey, endDate: todayKey, title: '남의 파일 2', projectId: 'foreign-2' },
    ]);
    await calendar.addProject({ name: '로컬 프로젝트' });
    const localId = calendar.projects[0].id;
    const before = reconcileSpy.calls;
    await calendar.replaceEvents(foreign);
    importCalls = reconcileSpy.calls - before;

    const afterImport = await chrome.storage.local.get(['calendarEvents', 'calendarProjects']);
    collector.add('project/02-import-refs', {
      // 전건이 무소속으로 내려앉되 **이벤트 수가 줄지 않는다** (DD7).
      importedCount: afterImport.calendarEvents.length,
      allDowngraded: afterImport.calendarEvents.every((event) => event.projectId === null),
      // replaceEvents()가 calendarProjects 를 건드리지 않는다는 사실이 이 단언으로 고정된다.
      localProjectsSurvived: afterImport.calendarProjects.length,
      localProjectStillThere: afterImport.calendarProjects.some((project) => project.id === localId),
    });
    assert(
      afterImport.calendarEvents.length === 2,
      '가져오기가 이벤트를 지웠다 — 강등만 해야 한다 (DD7)'
    );
  } finally {
    reconcileSpy.restore();
  }

  const afterDelete = await chrome.storage.local.get(['calendarEvents']);
  collector.add('project/01-delete-downgrades', {
    eventsBefore: beforeDelete.events,
    // 프로젝트를 지워도 이벤트는 살아 있고 참조만 내려간다 (DD7) — 재생 불가 데이터다.
    eventsAfter: afterDelete.calendarEvents.length,
    defaultBefore: beforeDelete.defaultProject === projectId,
    // 그 프로젝트를 지우면 기본값이 무소속으로 떨어진다 (UI8).
    defaultAfter: calendar.defaultProjectId(),
    bothPathsCallReconcile: deleteCalls >= 1 && importCalls >= 1,
  });
  assert(deleteCalls >= 1, '삭제 경로가 reconcileProjectRefs 를 부르지 않았다 (DD28)');
  assert(importCalls >= 1, '가져오기 경로가 reconcileProjectRefs 를 부르지 않았다 (DD28)');

  // DD27a — 목록을 읽지 못한 상태에서 프로젝트 쓰기가 잠긴다.
  const sealed = await loadApp({
    settingsVersion: 4,
    widgetType: 'calendar',
    mainWidgetEnabled: true,
    calendarEvents: [],
    // id 없는 행. 생성 게이트에 맡기면 새 id 를 달고 되살아나 봉인이 발화하지 않는다.
    calendarProjects: [{ name: 'id 없음' }],
  });
  const sealedCalendar = sealed['__newTabApp'].calendarManager;
  const storedBefore = JSON.stringify((await chrome.storage.local.get(['calendarProjects'])).calendarProjects);
  const writeBlocked = (await sealedCalendar.persistProjects([{ id: 'x', name: '새 프로젝트' }])) === false;
  const storedAfter = JSON.stringify((await chrome.storage.local.get(['calendarProjects'])).calendarProjects);
  collector.add('project/03-read-failure-seal', {
    projectsLoadFailed: sealedCalendar.projectsLoadFailed,
    writeBlocked,
    storageUntouched: storedBefore === storedAfter,
    noticeShown: (() => {
      const node = sealed.document.getElementById('storageNotice');
      return Boolean(node && !node.hidden && node.textContent.indexOf('프로젝트') !== -1);
    })(),
  });
  assert(sealedCalendar.projectsLoadFailed === true, '손상된 프로젝트 행을 읽고도 봉인이 서지 않았다 (DD27a)');
  assert(writeBlocked, '프로젝트 목록을 읽지 못한 상태에서 쓰기가 통과했다 (DD27a)');

  // **상한 절단도 "온전히 읽지 못한 것"이다** (code-review MEDIUM).
  //
  // dropped 와 같은 취급을 하지 않으면 51번째 이후 프로젝트가 조용히 사라진 채
  // 봉인이 서지 않고, 그 목록을 아는 프로젝트 전부로 믿은 reconcileProjectRefs()가
  // 그것을 가리키던 이벤트를 무소속으로 내린다.
  //
  // 51 은 MAX_PROJECTS(50) + 1 이다. 그 상수는 const 라 전역 객체에 붙지 않아
  // 여기서 읽을 수 없다 — 상수를 고치면 이 줄도 함께 고쳐야 한다.
  const overflowRows = [];
  for (let i = 0; i < 51; i += 1) overflowRows.push({ id: `p-${i}`, name: `프로젝트 ${i}` });

  const overflow = await loadApp({
    settingsVersion: 4,
    widgetType: 'calendar',
    mainWidgetEnabled: true,
    calendarEvents: [],
    calendarProjects: overflowRows,
  });
  const overflowCalendar = overflow['__newTabApp'].calendarManager;
  const overflowStoredBefore = JSON.stringify((await chrome.storage.local.get(['calendarProjects'])).calendarProjects);
  const overflowBlocked = (await overflowCalendar.persistProjects([{ id: 'x', name: '새 프로젝트' }])) === false;
  const overflowStoredAfter = JSON.stringify((await chrome.storage.local.get(['calendarProjects'])).calendarProjects);

  collector.add('project/04-truncation-seal', {
    loadedCount: overflowCalendar.projects.length,
    projectsLoadFailed: overflowCalendar.projectsLoadFailed,
    writeBlocked: overflowBlocked,
    storageUntouched: overflowStoredBefore === overflowStoredAfter,
  });
  assert(
    overflowCalendar.projectsLoadFailed === true,
    '상한 절단이 봉인을 세우지 않았다 — 잘린 프로젝트를 가리키던 이벤트가 강등된다'
  );
  assert(overflowBlocked, '상한 절단 상태에서 프로젝트 쓰기가 통과했다');

  progress('calendar project cases 완료');
}

/**
 * 관문 편집 — 호출 층위 + 결과 층위 (DD24·DD25·DD26·DD5a)
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runCalendarGateCases(collector) {
  const frameWindow = await loadApp({
    settingsVersion: 4,
    widgetType: 'calendar',
    mainWidgetEnabled: true,
    searchEnabled: true,
    calendarEvents: [],
    calendarProjects: [],
  });
  const calendar = frameWindow['__newTabApp'].calendarManager;
  const todayKey = calendar.todayKey;
  const shift = (n) => frameWindow.shiftDateKey(todayKey, n);

  await calendar.addEvent({ startDate: shift(1), endDate: shift(1), title: '관문 편집 대상' });
  const eventId = calendar.getEvents()[0].id;
  const gateOf = (index) => calendar.getEvents()[0].gates[index];

  // **호출 층위** — 셋 각각에 대해 deriveEventRange 호출 수가 1 이상인지 본다.
  // 결과만 보면 우연히 맞은 경우를 통과시킨다 (DD24).
  const perOp = {};
  for (const op of ['add', 'update', 'remove']) {
    const spy = spyOn(frameWindow, 'deriveEventRange');
    try {
      if (op === 'add') await calendar.addGate(eventId, { kind: 'dev', planned: shift(3), status: 'pending' });
      if (op === 'update') await calendar.updateGate(eventId, gateOf(0).id, { status: 'done', actual: shift(0) });
      if (op === 'remove') await calendar.removeGate(eventId, gateOf(1).id);
      perOp[op] = spy.calls;
      assert(spy.calls >= 1, `${op}Gate 가 deriveEventRange 를 부르지 않았다 (DD26 둘째 호출 자리)`);
    } finally {
      spy.restore();
    }
  }
  collector.add('gate/01-derive-call-sites', perOp);

  // **DD25의 집행이 실제로 여기서 일어나는가.** 편집기가 아니라 createCalendarEvent 가
  // 막는다는 것이 DD25의 결론이고, addGate 는 그 게이트를 **지나야** 한다.
  await calendar.addEvent({ startDate: shift(5), endDate: shift(5), title: 'DD25 대상' });
  const dd25Id = calendar.getEvents().find((event) => event.title === 'DD25 대상').id;
  const gatesOf = (id) => calendar.getEvents().find((event) => event.id === id).gates;

  const beforeAnon = gatesOf(dd25Id).length;
  await calendar.addGate(dd25Id, { kind: null, planned: shift(5), status: 'pending' });
  const afterAnon = gatesOf(dd25Id).length;

  await calendar.addGate(dd25Id, { kind: 'dev', planned: shift(5), status: 'pending' });
  await calendar.addGate(dd25Id, { kind: 'review', planned: shift(5), status: 'pending' });
  const afterNamed = gatesOf(dd25Id).length;

  collector.add('gate/02-dd25-folding', {
    // (a) 같은 날짜의 이름 없는 관문은 늘지 않는다
    anonymousFolded: afterAnon === beforeAnon,
    // (b) 같은 날짜의 이름 있는 관문 둘은 **둘 다** 늘어난다. (a)만 두면 이름 있는
    //     관문까지 접어 버리는 회귀가 통과한다.
    namedNotFolded: afterNamed === afterAnon + 2,
    counts: [beforeAnon, afterAnon, afterNamed],
  });
  assert(afterAnon === beforeAnon, 'DD25: 같은 날짜의 이름 없는 관문이 접히지 않았다');
  assert(afterNamed === afterAnon + 2, 'DD25: 이름 있는 관문까지 접혔다 — 접기가 너무 많이 접는다');

  // **마지막 관문은 지워지지 않는다** (DD5).
  await calendar.addEvent({ startDate: shift(7), endDate: shift(7), title: '관문 하나' });
  const singleId = calendar.getEvents().find((event) => event.title === '관문 하나').id;
  const singleGateId = gatesOf(singleId)[0].id;
  const storedBefore = JSON.stringify((await chrome.storage.local.get(['calendarEvents'])).calendarEvents);
  const removeRefused = (await calendar.removeGate(singleId, singleGateId)) === false;
  const storedAfter = JSON.stringify((await chrome.storage.local.get(['calendarEvents'])).calendarEvents);
  collector.add('gate/03-last-gate-kept', {
    removeRefused,
    storageUntouched: storedBefore === storedAfter,
    stillHasGate: gatesOf(singleId).length === 1,
  });
  assert(removeRefused, 'removeGate 가 마지막 관문을 지웠다 — 빈 관문 집합은 존재할 수 없다 (DD5)');
  assert(storedBefore === storedAfter, '마지막 관문 삭제 시도가 저장소를 건드렸다');

  // **done 파생의 세 분기** (DD5a). (c)가 빠지면 종단 관문 규칙으로 구현해도 (a)·(b)는 통과한다.
  await calendar.addEvent({ startDate: shift(9), endDate: shift(9), title: 'done 파생' });
  const doneId = calendar.getEvents().find((event) => event.title === 'done 파생').id;
  await calendar.addGate(doneId, { kind: 'prod', planned: shift(11), status: 'pending' });
  const branchA = calendar.getEvents().find((event) => event.id === doneId).done;

  for (const gate of gatesOf(doneId).slice()) {
    await calendar.updateGate(doneId, gate.id, { status: 'done', actual: shift(10) });
  }
  const branchB = calendar.getEvents().find((event) => event.id === doneId).done;

  for (const gate of gatesOf(doneId).slice()) {
    await calendar.updateGate(doneId, gate.id, { status: 'dropped' });
  }
  const branchC = calendar.getEvents().find((event) => event.id === doneId).done;

  collector.add('gate/04-done-derivation', { branchA, branchB, branchC });
  assert(branchA === false, 'DD5a (a): 살아 있는 관문 하나가 pending 인데 완료로 판정됐다');
  assert(branchB === true, 'DD5a (b): 살아 있는 관문이 전부 done 인데 미완료로 판정됐다');
  assert(branchC === true, 'DD5a (c): 관문이 전부 dropped 인데 완료로 떨어지지 않았다 — 범위를 줄인 작업이 영영 끝나지 않는다');

  // **파생 범위는 dropped 를 포함한다** (DD5a) — 계획은 남는다. 그리고 관문 하나를
  // 옮겨도 나머지는 움직이지 않는다 (UI6의 기계적 단언).
  await calendar.addEvent({ startDate: shift(13), endDate: shift(13), title: '범위 파생' });
  const rangeId = calendar.getEvents().find((event) => event.title === '범위 파생').id;
  await calendar.addGate(rangeId, { kind: 'stg', planned: shift(15), status: 'pending' });
  await calendar.addGate(rangeId, { kind: 'prod', planned: shift(17), status: 'pending' });
  const othersBefore = gatesOf(rangeId)
    .filter((gate) => gate.kind !== 'stg')
    .map((gate) => `${gate.kind}:${gate.planned}`)
    .sort();
  const stgId = gatesOf(rangeId).find((gate) => gate.kind === 'stg').id;
  await calendar.updateGate(rangeId, stgId, { planned: shift(16) });
  const othersAfter = gatesOf(rangeId)
    .filter((gate) => gate.kind !== 'stg')
    .map((gate) => `${gate.kind}:${gate.planned}`)
    .sort();

  const prodId = gatesOf(rangeId).find((gate) => gate.kind === 'prod').id;
  await calendar.updateGate(rangeId, prodId, { status: 'dropped' });
  const withDropped = calendar.getEvents().find((event) => event.id === rangeId);

  collector.add('gate/05-range-and-no-reflow', {
    // 관문 하나를 옮겨도 나머지는 그대로다 (UI6 — 자동 재배치를 하지 않는다).
    othersUnmoved: JSON.stringify(othersBefore) === JSON.stringify(othersAfter),
    movedTo: gatesOf(rangeId).find((gate) => gate.kind === 'stg').planned,
    // dropped 관문도 파생 범위에 남는다 — 계획은 남고 마감 판정에서만 빠진다.
    endDateKeepsDropped: withDropped.endDate === shift(17),
    dueStateIgnoresDropped: calendar.getEventDueState(withDropped),
  });
  assert(
    JSON.stringify(othersBefore) === JSON.stringify(othersAfter),
    'UI6: 관문 하나를 옮겼는데 다른 관문이 함께 움직였다'
  );
  assert(withDropped.endDate === shift(17), 'DD5a: dropped 관문이 파생 범위에서 빠졌다 — 계획은 남아야 한다');

  // **상한 위반은 기존 관문을 몰살하지 않는다** (code-review CRITICAL).
  //
  // normalizeGates 의 기준점이 입력에서 나오므로, 기존 관문보다 366일 이른 관문이
  // 하나 들어오면 기존 관문 전부가 상한 밖으로 밀려 조용히 사라졌고 addGate 는
  // 그것을 커밋하고 성공을 돌려줬다. 관문 날짜 칸에 min/max 가 없으므로 **연도
  // 오타 한 번**으로 도달한다. 이 케이스가 없으면 같은 회귀가 그대로 되돌아온다.
  await calendar.addEvent({ startDate: shift(20), endDate: shift(20), title: '상한 축출' });
  const capId = calendar.getEvents().find((event) => event.title === '상한 축출').id;
  await calendar.addGate(capId, { kind: 'prod', planned: shift(60), status: 'pending' });

  const capBefore = gatesOf(capId).map((gate) => gate.planned).slice().sort();
  const capStoredBefore = JSON.stringify((await chrome.storage.local.get(['calendarEvents'])).calendarEvents);

  // 앞뒤 **양쪽**을 잰다. 뒤만 재면 기준점이 움직이는 축(= 실제 회귀)이 빠진다.
  const pastRefused = (await calendar.addGate(capId, { kind: 'dev', planned: shift(-900), status: 'pending' })) === false;
  const futureRefused = (await calendar.addGate(capId, { kind: 'dev', planned: shift(900), status: 'pending' })) === false;

  const capAfter = gatesOf(capId).map((gate) => gate.planned).slice().sort();
  const capStoredAfter = JSON.stringify((await chrome.storage.local.get(['calendarEvents'])).calendarEvents);
  collector.add('gate/06-range-cap-refuses', {
    pastRefused,
    futureRefused,
    gatesUnchanged: JSON.stringify(capBefore) === JSON.stringify(capAfter),
    storageUntouched: capStoredBefore === capStoredAfter,
    counts: [capBefore.length, capAfter.length],
  });
  assert(pastRefused, '상한을 넘는 이른 관문이 거절되지 않았다 — 기존 관문이 조용히 사라진다');
  assert(futureRefused, '상한을 넘는 늦은 관문이 거절되지 않았다');
  assert(JSON.stringify(capBefore) === JSON.stringify(capAfter), '거절된 추가가 기존 관문을 바꿨다');
  assert(capStoredBefore === capStoredAfter, '거절된 추가가 저장소를 건드렸다');

  // **익명 관문 셋은 범위 둘로 재구성될 수 없다** (code-review HIGH).
  //
  // 편집기의 종류 기본값이 '이름 없음'이라 사용자가 직접 세운 관문도 전부
  // kind:null · pending · actual:null 이다. eventHasUserGateWork 가 그것을 거짓으로
  // 답하면 모달의 날짜 칸이 편집 가능하게 남고, **아무것도 고치지 않고 저장만
  // 눌러도** 관문이 [startDate, endDate] 둘로 재합성되어 가운데가 사라진다.
  await calendar.addEvent({ startDate: shift(30), endDate: shift(30), title: '익명 셋' });
  const anonId = calendar.getEvents().find((event) => event.title === '익명 셋').id;
  await calendar.addGate(anonId, { kind: null, planned: shift(35), status: 'pending' });
  await calendar.addGate(anonId, { kind: null, planned: shift(40), status: 'pending' });

  const anonEvent = calendar.getEvents().find((event) => event.id === anonId);
  const anonUntouched = anonEvent.gates.every(
    (gate) => gate.kind === null && gate.status === 'pending' && gate.actual === null
  );
  const anonDerived = frameWindow.eventHasUserGateWork(anonEvent);

  // 간편 편집(gates 키를 아예 넘기지 않는 경로)은 관문을 보존해야 한다.
  await calendar.updateEvent(anonId, {
    startDate: anonEvent.startDate,
    endDate: anonEvent.endDate,
    title: '익명 셋',
  });
  const afterPlainEdit = gatesOf(anonId).length;

  collector.add('gate/07-anonymous-three-kept', {
    gates: anonEvent.gates.length,
    allUntouched: anonUntouched,
    treatedAsDerived: anonDerived,
    gatesAfterPlainEdit: afterPlainEdit,
  });
  assert(anonEvent.gates.length === 3, '익명 관문 셋이 서지 않았다 — 이 케이스의 전제가 깨졌다');
  assert(anonUntouched, '전제가 깨졌다: 관문이 전부 이름 없는 pending 이어야 한다');
  assert(anonDerived, '익명 관문 셋인데 파생 범위로 보지 않는다 — 모달 저장이 가운데 관문을 지운다');
  assert(afterPlainEdit === 3, '간편 편집이 관문을 재구성해 가운데 관문을 지웠다');

  progress('calendar gate cases 완료');
}

/**
 * 범위 이벤트 — 월 경계 / 범위 상한 / 메모 절단 / 앞뒤 역전
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runRangeCases(collector) {
  const frameWindow = await loadApp({
    settingsVersion: 3,
    widgetType: 'calendar',
    mainWidgetEnabled: true,
    searchEnabled: true,
    calendarEvents: [],
  });
  const calendar = frameWindow['__newTabApp'].calendarManager;

  /**
   * 지정한 달을 그린 뒤 칩이 붙은 날짜를 모은다
   * @param {number} year
   * @param {number} month
   * @returns {string[]}
   */
  const chipDatesFor = (year, month) => {
    calendar.viewYear = year;
    calendar.viewMonth = month;
    calendar.render();
    return Array.from(frameWindow.document.querySelectorAll('.calendar-day'))
      .filter((cell) => cell.querySelector('.calendar-chip'))
      .map((cell) => cell.dataset.date)
      .sort();
  };

  // 월 경계를 넘는 범위 (1/28 ~ 2/3)
  await calendar.addEvent({ startDate: '2026-01-28', endDate: '2026-02-03', title: '월 경계 범위' });
  const january = chipDatesFor(2026, 0);
  const february = chipDatesFor(2026, 1);

  collector.add(
    'range/01-month-boundary',
    {
      januaryChipDates: january,
      februaryChipDates: february,
      // 1월 뷰와 2월 뷰 양쪽에서 보여야 한다
      visibleInBothMonths: january.length > 0 && february.length > 0,
      distinctDates: Array.from(new Set(january.concat(february))).sort(),
    },
    capturedErrors
  );

  // 범위 상한 — 366일을 넘기면 잘려서 저장된다
  await calendar.addEvent({ startDate: '2026-03-01', endDate: '2030-03-01', title: '과도한 범위' });
  const clamped = calendar.getEvents().find((event) => event.title === '과도한 범위');
  collector.add('range/02-max-span', {
    startDate: clamped ? clamped.startDate : null,
    endDate: clamped ? clamped.endDate : null,
    spanDays: clamped ? frameWindow.spanDays(clamped.startDate, clamped.endDate) : null,
  });

  // 메모 길이 절단
  await calendar.addEvent({
    startDate: '2026-03-05',
    endDate: '2026-03-05',
    title: '메모 절단',
    note: 'ㄱ'.repeat(2500),
  });
  const noted = calendar.getEvents().find((event) => event.title === '메모 절단');
  collector.add('range/03-note-truncated', {
    noteLength: noted ? noted.note.length : null,
    truncatedToMax: Boolean(noted && noted.note.length === 2000),
  });

  // 종료일이 시작일보다 빠르면 시작일로 접힌다
  await calendar.addEvent({ startDate: '2026-04-10', endDate: '2026-04-01', title: '역전 범위' });
  const reversed = calendar.getEvents().find((event) => event.title === '역전 범위');
  collector.add('range/04-reversed', {
    startDate: reversed ? reversed.startDate : null,
    endDate: reversed ? reversed.endDate : null,
    collapsedToStart: Boolean(reversed && reversed.startDate === reversed.endDate),
  });

  progress('range cases 완료');
}

/**
 * 요약 한 줄의 생명주기 — 셀 것이 없으면 노드 자체가 없어야 한다 (DD1)
 *
 * 날짜는 전부 오늘 기준 상대값으로 만든다. 고정 날짜를 쓰면 하네스를 돌리는 날에
 * 따라 같은 항목이 '미래'였다가 '지연'이 되어 케이스가 저절로 뒤집힌다.
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runSummaryCases(collector) {
  const frameWindow = await loadApp({
    settingsVersion: 3,
    widgetType: 'calendar',
    mainWidgetEnabled: true,
    searchEnabled: true,
    calendarEvents: [],
  });
  const doc = frameWindow.document;
  const calendar = frameWindow['__newTabApp'].calendarManager;

  const absentWhenEmpty = doc.querySelector('.calendar-summary') === null;

  // 먼 미래 항목만 있으면 여전히 셀 것이 없다
  const futureKey = frameWindow.shiftDateKey(calendar.todayKey, 30);
  await calendar.addEvent({ startDate: futureKey, endDate: futureKey, title: '먼 미래' });
  const absentWithFutureOnly = doc.querySelector('.calendar-summary') === null;

  // 오늘 마감 + 지연을 만들면 한 줄이 나타난다
  await calendar.addEvent({ startDate: calendar.todayKey, endDate: calendar.todayKey, title: '오늘 마감' });
  const overdueKey = frameWindow.shiftDateKey(calendar.todayKey, -3);
  await calendar.addEvent({ startDate: overdueKey, endDate: overdueKey, title: '지연 항목' });

  const withDue = doc.querySelector('.calendar-summary');

  // 전부 완료하면 다시 사라진다
  for (const event of calendar.getEvents().slice()) {
    if (!event.done) await calendar.toggleEvent(event.id);
  }

  collector.add(
    'summary/01-lifecycle',
    {
      absentWhenEmpty,
      absentWithFutureOnly,
      presentWhenDue: withDue !== null,
      dueText: withDue ? withDue.textContent : null,
      absentAfterAllDone: doc.querySelector('.calendar-summary') === null,
    },
    capturedErrors
  );

  progress('summary cases 완료');
}

/**
 * 날짜 키 헬퍼 테이블 테스트
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runDateKeyCases(collector) {
  const frameWindow = await loadApp({ settingsVersion: 2 });
  const { makeDateKey, parseDateKey } = frameWindow;

  const cases = [
    { label: '윤년 2/29', y: 2024, m: 1, d: 29, expect: '2024-02-29' },
    { label: '평년 3/1', y: 2026, m: 2, d: 1, expect: '2026-03-01' },
    { label: '월말 1/31', y: 2026, m: 0, d: 31, expect: '2026-01-31' },
    { label: '연말 12/31', y: 2026, m: 11, d: 31, expect: '2026-12-31' },
    { label: '연초 1/1', y: 2027, m: 0, d: 1, expect: '2027-01-01' },
    { label: 'DST 시작 부근 3/8', y: 2026, m: 2, d: 8, expect: '2026-03-08' },
    { label: 'DST 종료 부근 11/1', y: 2026, m: 10, d: 1, expect: '2026-11-01' },
  ];

  const results = cases.map((testCase) => {
    const key = makeDateKey(new Date(testCase.y, testCase.m, testCase.d));
    const roundTrip = makeDateKey(parseDateKey(key));
    return {
      label: testCase.label,
      key,
      expected: testCase.expect,
      pass: key === testCase.expect && roundTrip === testCase.expect,
    };
  });

  // UTC-음수 지역 재현: 'YYYY-MM-DD'를 new Date(문자열)로 파싱하면 하루가 밀린다.
  // parseDateKey는 로컬 자정으로 파싱하므로 밀리지 않아야 한다.
  const naiveParse = new Date('2026-08-06');
  results.push({
    label: 'parseDateKey가 new Date(문자열)의 UTC 밀림을 회피',
    key: makeDateKey(parseDateKey('2026-08-06')),
    expected: '2026-08-06',
    pass: makeDateKey(parseDateKey('2026-08-06')) === '2026-08-06',
    naiveResult: makeDateKey(naiveParse),
  });

  collector.add('datekey/table', results, capturedErrors);
  progress('date key cases 완료');
}

/**
 * 가져오기 정제 케이스 (prototype pollution / 잘못된 날짜 / 필드 화이트리스트)
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runSanitizeCases(collector) {
  const frameWindow = await loadApp({ settingsVersion: 2 });
  const { sanitizeImportedEvents } = frameWindow;

  // **탈락 항목을 이 배치에서 뺐다.** Task 1이 "검증 탈락이 하나라도 있으면 배치
  // 전체를 거절"로 바꿨으므로, 섞어 두면 이 케이스가 던져 죽는다. 이 키가 재던
  // 것(화이트리스트 복사·프로토타입 청결·비배열 거절)은 그대로 재고, 탈락 항목의
  // 처리는 아래 새 키 sanitize/batch-reject 가 진다.
  const malicious = JSON.parse(
    '[{"__proto__":{"polluted":1},"date":"2026-08-06","title":"정상","evil":"drop me"}]'
  );
  const sanitized = sanitizeImportedEvents(malicious);

  collector.add('sanitize/table', {
    kept: sanitized.length,
    keptTitles: sanitized.map((event) => event.title),
    keptKeys: sanitized.length > 0 ? Object.keys(sanitized[0]).sort().join(',') : '',
    prototypeClean: {}.polluted === undefined,
    rejectsNonArray: (() => {
      try {
        sanitizeImportedEvents({ nope: true });
        return false;
      } catch (_) {
        return true;
      }
    })(),
  });

  // v3 필드 — 거짓 date / 존재하지 않는 endDate / 알 수 없는 중요도 / v2 형식 혼재
  const v3Payload = JSON.parse(
    '[{"startDate":"2026-08-10","endDate":"2026-08-12","date":"1970-01-01","title":"거짓 date"},' +
      '{"startDate":"2026-08-01","endDate":"2026-08-32","title":"없는 endDate"},' +
      '{"startDate":"2026-09-01","endDate":"2026-09-02","title":"이상한 중요도","priority":"URGENT"},' +
      '{"startDate":"2026-09-10","endDate":"2026-09-11","title":"정상 중요도","priority":"high"},' +
      '{"date":"2026-10-05","title":"v2 형식"}]'
  );
  const v3Sanitized = sanitizeImportedEvents(v3Payload);
  const byTitle = (title) => v3Sanitized.find((event) => event.title === title);

  collector.add('sanitize/v3-fields', {
    kept: v3Sanitized.length,
    // date는 언제나 검증된 startDate에서 파생된다. 입력의 거짓 date를 따라가면
    // 인덱스가 엉뚱한 날짜에 이벤트를 밀어 넣어 화면에서 사라진다
    dateAlwaysDerivedFromStart: v3Sanitized.every((event) => event.date === event.startDate),
    liarDateRewritten: (() => {
      const event = byTitle('거짓 date');
      return Boolean(event && event.date === '2026-08-10');
    })(),
    // '2026-08-32'는 형식만 맞고 존재하지 않는 날이다. 왕복 검증이 걸러 startDate로 접힌다
    invalidEndDateCollapsed: (() => {
      const event = byTitle('없는 endDate');
      return Boolean(event && event.endDate === '2026-08-01');
    })(),
    priorities: v3Sanitized.map((event) => `${event.title}=${event.priority}`),
    v2Promoted: (() => {
      const event = byTitle('v2 형식');
      return Boolean(event && event.startDate === '2026-10-05' && event.endDate === '2026-10-05');
    })(),
    fields: v3Sanitized.length > 0 ? Object.keys(v3Sanitized[0]).sort().join(',') : '',
  });

  // **배치 전체 거절** (Task 1). 부분만 들여오면 사용자는 무엇이 빠졌는지 모른 채
  // "가져왔다"고 믿는다. 던지면 replaceEvents()에 도달하지 않으므로 저장소는
  // 손대지 않은 채 남는다.
  const rejects = (payload) => {
    try {
      sanitizeImportedEvents(payload);
      return false;
    } catch (_) {
      return true;
    }
  };
  collector.add('sanitize/batch-reject', {
    oneBadDateRejectsAll: rejects(
      JSON.parse('[{"date":"2026-08-06","title":"정상"},{"date":"2026-02-30","title":"존재하지 않는 날짜"}]')
    ),
    oneEmptyTitleRejectsAll: rejects(
      JSON.parse('[{"date":"2026-08-06","title":"정상"},{"date":"2026-08-07","title":""}]')
    ),
    allValidStillPasses: sanitizeImportedEvents(
      JSON.parse('[{"date":"2026-08-06","title":"a"},{"date":"2026-08-07","title":"b"}]')
    ).length,
  });

  // **봉투 화이트리스트** (Task 1). 아는 값 둘을 열거하고 나머지를 전부 거절한다.
  collector.add('sanitize/envelope', {
    bareArrayIsLegacy: sanitizeImportedEvents(JSON.parse('[{"date":"2026-08-06","title":"a"}]')).length,
    v4EnvelopeAccepted: sanitizeImportedEvents(
      JSON.parse('{"version":4,"events":[{"title":"a","gates":[{"planned":"2026-08-06"}]}]}')
    ).length,
    rejectsVersion3: rejects(JSON.parse('{"version":3,"events":[]}')),
    rejectsVersion999: rejects(JSON.parse('{"version":999,"events":[]}')),
    rejectsMissingVersion: rejects(JSON.parse('{"events":[]}')),
    // 엄격 비교다 — 문자열 "4"는 통과하지 못한다.
    rejectsStringVersion: rejects(JSON.parse('{"version":"4","events":[]}')),
    rejectsNonArrayEvents: rejects(JSON.parse('{"version":4,"events":"nope"}')),
    // v4 봉투인데 gates 가 없으면 레거시가 아니라 손상이다.
    rejectsV4WithoutGates: rejects(
      JSON.parse('{"version":4,"events":[{"startDate":"2026-08-06","title":"a"}]}')
    ),
  });

  // **관문 배열 안쪽의 prototype pollution** (Task 1 Validate).
  // 화이트리스트 복사는 gates 항목에도 같은 방식으로 걸린다.
  const gatePollution = sanitizeImportedEvents(
    JSON.parse(
      '{"version":4,"events":[{"title":"관문 오염","gates":[' +
        '{"__proto__":{"gatePolluted":1},"planned":"2026-08-06","kind":"dev","evil":"drop me"}]}]}'
    )
  );
  collector.add('sanitize/gate-pollution', {
    kept: gatePollution.length,
    gateKeys: gatePollution.length > 0 ? Object.keys(gatePollution[0].gates[0]).sort().join(',') : '',
    prototypeClean: {}.gatePolluted === undefined,
    // 목록 밖의 kind 와 status 는 조용히 기본값으로 떨어진다 (화이트리스트).
    unknownKindFallsBack: (() => {
      const out = sanitizeImportedEvents(
        JSON.parse('{"version":4,"events":[{"title":"x","gates":[{"planned":"2026-08-06","kind":"evil","status":"weird"}]}]}')
      );
      return out[0].gates[0].kind === null && out[0].gates[0].status === 'pending';
    })(),
  });

  progress('sanitize cases 완료');
}

/**
 * 스토리지 백엔드 선택 — 세 분기 전부
 *
 * `selectStorageBackend`는 최상위 순수 함수라 가짜 참조를 넣어 직접 부를 수 있다
 * (makeDateKey·migrateCalendarToV3를 부르는 것과 같은 방식). 확장 오리진에서
 * 실행되는 하네스가 확장이 아닌 분기까지 확인할 수 있는 유일한 방법이다.
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runStorageBackendCases(collector) {
  const frameWindow = await loadApp({});
  const select = frameWindow['selectStorageBackend'];

  const fakeChrome = { storage: { local: {} } };
  const fakeLocalStorage = {
    _v: /** @type {Record<string, string>} */ ({}),
    setItem(k, v) { this._v[k] = String(v); },
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._v, k) ? this._v[k] : null; },
    removeItem(k) { delete this._v[k]; },
  };
  const blockedLocalStorage = {
    setItem() { throw new Error('SecurityError: 접근 차단'); },
    getItem() { return null; },
    removeItem() {},
  };

  const extension = select({ chromeRef: fakeChrome, localStorageRef: fakeLocalStorage });
  const preview = select({ chromeRef: undefined, localStorageRef: fakeLocalStorage });
  const blocked = select({ chromeRef: undefined, localStorageRef: blockedLocalStorage });
  const nothing = select({});

  // 확장이 있으면 무조건 확장이다. 있는데 미리보기로 떨어지면 사용자 데이터가
  // 기대와 다른 곳에 쌓인다 (원칙 4).
  assert(extension === 'extension', `chrome.storage 존재 시 'extension'이어야 하는데 '${extension}'`);
  assert(preview === 'local-preview', `chrome 부재 + localStorage 가용 시 'local-preview'여야 하는데 '${preview}'`);
  // 존재 확인만으로는 부족하다. setItem이 던지는 환경을 가용으로 보면 안 된다.
  assert(blocked === 'none', `localStorage가 던지면 'none'이어야 하는데 '${blocked}'`);
  assert(nothing === 'none', `둘 다 없으면 'none'이어야 하는데 '${nothing}'`);

  // 실제 확장 오리진에서 돌고 있으므로 앱이 고른 값은 extension이어야 한다.
  const actual = frameWindow.document.body.dataset.storageBackend;
  assert(actual === 'extension', `확장 오리진에서 실제 백엔드가 'extension'이어야 하는데 '${actual}'`);

  collector.add('storage/backend-selection', {
    extension,
    preview,
    blocked,
    nothing,
    actual,
    noticeHidden: frameWindow.document.getElementById('storageNotice').hidden,
  }, capturedErrors);

  progress('storage backend cases 완료');
}

/**
 * 읽기 실패 시 기존 일정이 보존되는가 (데이터 소실 봉인)
 *
 * 손상된 저장값을 **시드하는 것만으로** 읽기 실패 경로에 들어간다. 모듈 평가 전
 * 훅이나 가짜 어댑터 주입이 필요 없다 — 하네스가 이미 하는 일이다.
 *
 * 예전 동작: loadEvents의 catch가 `this.events = []`를 정상으로 만들고,
 * 할 일을 하나 추가하면 `[한 건]`이 커밋되어 저장돼 있던 것이 전부 사라졌다.
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runLoadFailureCases(collector) {
  // 배열이 아닌 값 = 손상. createCalendarEvent가 걸러낼 수 있는 형태가 아니다.
  const corrupt = { broken: 'not an array' };
  const frameWindow = await loadApp({ widgetType: 'calendar', calendarEvents: corrupt, settingsVersion: 3 });
  const calendar = frameWindow['__newTabApp'].calendarManager;

  const flaggedAfterLoad = calendar.loadFailed === true;
  assert(flaggedAfterLoad, '손상된 calendarEvents를 읽으면 loadFailed가 서야 한다');

  const errorVisible = frameWindow.document.getElementById('calendarError').hidden === false;
  assert(errorVisible, '읽기 실패 시 오류 배너가 보여야 한다');

  // 쓰기가 막히는가
  const todayKey = frameWindow.makeDateKey(new Date());
  const addCommitted = await calendar.addEvent({ startDate: todayKey, endDate: todayKey, title: '차단되어야 함' });
  assert(addCommitted === false, '읽기 실패 상태에서 할 일 추가는 거절되어야 한다');

  // **저장소가 그대로인가** — 이 케이스의 존재 이유다.
  const afterAdd = await chrome.storage.local.get(['calendarEvents']);
  const untouched = JSON.stringify(afterAdd.calendarEvents) === JSON.stringify(corrupt);
  assert(untouched, '읽기 실패 상태의 쓰기가 저장소를 덮어써서는 안 된다 (데이터 소실)');

  // 내보내기도 막히는가 — 빈 파일을 백업이라 믿게 두지 않는다
  assert(calendar.canExport() === false, '읽기 실패 상태에서는 내보내기가 막혀야 한다');

  // 가져오기는 **통과해야** 한다. 읽기가 영구히 깨졌을 때 유일한 복구 수단이다.
  const recovered = await calendar.replaceEvents([
    // 생성 게이트의 기본값이 false 이므로(Task 1) v3 모양 입력에는 명시적으로 넘긴다.
    // 넘기지 않으면 null 이 만들어져 복구본 대신 빈 항목이 커밋된다.
    frameWindow.createCalendarEvent(
      { startDate: todayKey, endDate: todayKey, title: '복구본' },
      { allowLegacyGateSynthesis: true }
    ),
  ]);
  assert(recovered === true, '가져오기(전체 교체)는 loadFailed 잠금을 통과해야 한다');
  assert(calendar.loadFailed === false, '가져오기가 성공하면 잠금이 풀려야 한다');

  collector.add('storage/load-failure-preserves-data', {
    flaggedAfterLoad,
    errorVisible,
    addCommitted,
    untouched,
    recovered,
    clearedAfterRecovery: calendar.loadFailed === false,
  }, capturedErrors);

  progress('load failure cases 완료');
}

/**
 * 오류 배너가 자리를 먹지 않는가 (원래 버그)
 *
 * 배너는 하네스가 showError()를 직접 불러 띄운다 — 앱 인스턴스에 이미 접근하고
 * 있으므로(calendar.selectDate 등과 같은 방식) 별도 실패 주입 장치가 필요 없다.
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runErrorBannerGeometryCases(collector) {
  const frameWindow = await loadApp({ widgetType: 'calendar', settingsVersion: 3, mainWidgetEnabled: true });
  const doc = frameWindow.document;
  const calendar = frameWindow['__newTabApp'].calendarManager;

  const widget = doc.getElementById('calendarWidget');
  const month = doc.querySelector('.calendar-month');

  // 패널을 열어 입력 폼이 존재하는 상태로 만든다 (차폐 검사 대상)
  calendar.selectDate(frameWindow.makeDateKey(new Date()));
  await settle();

  const before = {
    widgetHeight: Math.round(widget.getBoundingClientRect().height),
    monthScroll: month.scrollHeight - month.clientHeight,
  };

  calendar.showError('스모크: 배너 기하 검사');
  await settle();

  const after = {
    widgetHeight: Math.round(widget.getBoundingClientRect().height),
    monthScroll: month.scrollHeight - month.clientHeight,
  };

  assert(
    before.widgetHeight === after.widgetHeight,
    `배너 표시가 밴드 높이를 바꾸면 안 된다 (${before.widgetHeight} → ${after.widgetHeight})`
  );
  assert(
    before.monthScroll === after.monthScroll,
    `배너 표시가 월 그리드에 스크롤을 만들면 안 된다 (${before.monthScroll} → ${after.monthScroll})`
  );

  // 입력 폼이 배너에 가려지지 않는가 — 저장에 실패한 순간 다시 입력할 창이다
  const input = doc.querySelector('.calendar-todo-input');
  const rect = input.getBoundingClientRect();
  const hit = doc.elementFromPoint(Math.round(rect.left + rect.width / 2), Math.round(rect.top + rect.height / 2));
  const inputReachable = Boolean(hit && (hit === input || input.contains(hit)));
  assert(inputReachable, '배너 표시 중에도 할 일 입력창이 포인터로 도달 가능해야 한다');

  calendar.hideError();
  await settle();

  collector.add('calendar/error-banner-geometry', {
    heightInvariant: before.widgetHeight === after.widgetHeight,
    monthScrollInvariant: before.monthScroll === after.monthScroll,
    inputReachable,
  }, capturedErrors);

  progress('error banner geometry cases 완료');
}

/* ──────────────────── 관문 점유 · 렌더 규칙 (M2b) ──────────────────── */

/**
 * 관문 점유(DD31) · 그리드-패널 일치(DD32) · 렌더 규칙 셋(Task 2)
 *
 * **이 함수가 담는 단언은 열이다** — 점유 다섯 · 그리드-패널 일치 둘 · 렌더 규칙 셋.
 * Task 2 의 셋이 여기 들어오는 이유는 같은 고정 입력을 재사용하기 때문이고, 함수를
 * 늘리면 존재·배선 검사와 Acceptance 의 수까지 함께 흔들린다. 점유 다섯만 쓰고 함수를
 * 닫으면 TASK2-RULE-n 표식 검사에서 죽는다.
 *
 * 고정 입력마다 프레임을 새로 띄운다 — 한 프레임에 다 넣으면 "1번 입력에서 점유가
 * 관문 둘로 줄었다" 와 "5번 입력에서 버킷 길이가 1이다" 가 서로를 부정한다.
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runCalendarOccupancyCases(collector) {
  // ── 헬퍼 ──────────────────────────────────────────────────────────────
  // setEq 는 이 파일에 이미 있지만 **다른 케이스 함수 안의 지역 const 다.**
  // isSubset 은 아예 없다. 없는 헬퍼를 부르는 단언은 돌지 않으므로 둘 다 여기 둔다.
  const setEq = (a, b) => a.length === b.length && a.slice().sort().join(',') === b.slice().sort().join(',');
  const isSubset = (a, b) => a.every((x) => b.includes(x));
  // MAX_CHIPS_PER_CELL 은 newtab.js 의 **const** 라 프레임 전역에 붙지 않는다
  // (function 선언과 달리 const 는 window 프로퍼티가 아니다). 값을 여기 복제하되
  // 드리프트는 Validation 2-d 가 원본 쪽을 고정해 잡는다.
  const CHIP_CAP = 2; // ← newtab.js: const MAX_CHIPS_PER_CELL = 2;
  const OVERDUE_LABEL = '지연'; // ← newtab.js: DUE_STATE_LABELS.overdue

  /** 빈 v4 저장소에서 달력 프레임을 새로 띄운다 */
  const freshCalendar = async () => {
    const frameWindow = await loadApp({
      settingsVersion: 4,
      widgetType: 'calendar',
      mainWidgetEnabled: true,
      searchEnabled: true,
      calendarEvents: [],
      calendarProjects: [],
    });
    return { frameWindow, calendar: frameWindow['__newTabApp'].calendarManager };
  };

  /**
   * 고정 입력의 관문이 전부 렌더 창 안에 들어오도록 창을 맞춘다.
   *
   * rebuildIndex() 는 창 밖 날짜를 버킷에 넣지 않으므로, 오늘이 그 달 1일이면서
   * 일요일이면 42칸 창이 정확히 오늘에서 시작해 today-3 이 창 밖으로 나가고
   * **옳은 구현에서도 1번이 깨진다.** 돌리는 날에 따라 결과가 갈리는 케이스는
   * 없느니만 못하므로 앞뒤 달까지 시도한 뒤, 그래도 안 들어오면 아래 전제 단언이
   * 케이스 결함이라고 말한다.
   * @returns {Set<string>} 렌더된 창의 날짜 집합
   */
  const focusWindowOn = (frameWindow, calendar, dates) => {
    const renderedDates = () =>
      new Set(Array.from(frameWindow.document.querySelectorAll('.calendar-day')).map((cell) => cell.dataset.date));
    const offsets = [0, -1, 1];
    let windowDates = renderedDates();
    for (let i = 0; i < offsets.length; i += 1) {
      const anchor = new Date(calendar.viewYear, calendar.viewMonth + offsets[i], 1);
      calendar.viewYear = anchor.getFullYear();
      calendar.viewMonth = anchor.getMonth();
      calendar.render();
      windowDates = renderedDates();
      if (dates.every((key) => windowDates.has(key))) return windowDates;
    }
    return windowDates;
  };

  /**
   * 인덱스와 화면에서 값을 뽑는다.
   *
   * **출처가 서로 다른 것이 요점이다** — 버킷 둘은 인덱스에서, 칩 개수는 렌더된
   * DOM 에서 나온다. 셋 다 인덱스에서 뽑으면 칩 단언이 "인덱스와 인덱스"를 비교하게
   * 되어 createChips() 가 옛 범위로 그려도 통과한다. 그리고 allGatePlannedDates 는
   * **이벤트의 관문**에서 나온다 — 인덱스에서 뽑으면 이 단언은 자기가 만든 기대값과
   * 자기를 비교한다.
   */
  const measure = (frameWindow, calendar) => {
    const bucketKeys = Array.from(calendar.eventsByDate.keys()).sort();
    const bucketSizesByDate = Object.fromEntries(
      Array.from(calendar.eventsByDate.entries()).map(([date, list]) => [date, list.length])
    );
    const chipCountsByDate = Object.fromEntries(
      Array.from(frameWindow.document.querySelectorAll('.calendar-day')).map((cell) => [
        cell.dataset.date,
        cell.querySelectorAll('.calendar-chip').length,
      ])
    );
    // dropped 관문도 포함한다 — DD31 이 계획을 남기므로 그 날짜도 점유된다.
    const allGatePlannedDates = Array.from(
      new Set(calendar.getEvents().flatMap((event) => event.gates.map((gate) => gate.planned)))
    ).sort();
    const legacyRangeDates = Array.from(
      new Set(
        calendar.getEvents().flatMap((event) => {
          const out = [];
          for (let d = event.startDate; d <= event.endDate; d = frameWindow.shiftDateKey(d, 1)) out.push(d);
          return out;
        })
      )
    ).sort();
    return { bucketKeys, bucketSizesByDate, chipCountsByDate, allGatePlannedDates, legacyRangeDates };
  };

  /** 어느 고정 입력에서나 참이어야 하는 점유 불변식 */
  const assertOccupancyInvariants = (label, m, windowDates) => {
    // 전제: 고정 입력의 관문이 전부 렌더 창 안인가. 메시지를 가르지 않으면 창
    // 가장자리에서 난 실패가 DD31 미구현으로 읽힌다.
    assert(
      m.allGatePlannedDates.every((d) => windowDates.has(d)),
      label + ': 고정 입력의 관문 날짜가 렌더 창 밖이다 — 구현 결함이 아니라 케이스 결함이다(오늘 날짜에 따라 갈린다)'
    );
    assert(setEq(m.bucketKeys, m.allGatePlannedDates), label + ': 점유가 관문 집합과 다르다');
    assert(isSubset(m.bucketKeys, m.legacyRangeDates), label + ': 관문에 없던 날을 점유했다');
    Object.keys(m.bucketSizesByDate).forEach((d) => {
      // 인덱스가 맞다는 것과 화면이 맞다는 것은 다른 주장이다. rebuildIndex() 만 옳게
      // 고치고 createChips() 가 옛 범위로 그리면 위 둘은 통과하고 여기서만 죽는다.
      assert(
        m.chipCountsByDate[d] === Math.min(m.bucketSizesByDate[d], CHIP_CAP),
        label + ': 그리드 칩이 인덱스와 어긋난다 — ' + d + ' (칩 ' + m.chipCountsByDate[d] + ' / 버킷 ' + m.bucketSizesByDate[d] + ')'
      );
    });
  };

  // ── 1번 — 폭 있는 항목의 사이 날짜가 비는가 (이 케이스의 반증자) ──────────
  {
    const { frameWindow, calendar } = await freshCalendar();
    const today = calendar.todayKey;
    const shift = (n) => frameWindow.shiftDateKey(today, n);
    const f1 = { gateA: shift(-3), gateB: today, gap: shift(-1) };
    await calendar.addEvent({ startDate: f1.gateA, endDate: f1.gateB, title: 'M2b 1번 관문 둘' }); // DD31-FIXTURE 1 — today-3·today 관문
    const windowDates = focusWindowOn(frameWindow, calendar, [f1.gateA, f1.gateB, f1.gap, today]);
    await settle();
    const m = measure(frameWindow, calendar);
    assertOccupancyInvariants('점유 1번', m, windowDates);

    // **개수가 아니라 날짜를 본다.** length === 2 만 보면 today-1·today 를 점유한
    // 잘못된 구현도 통과한다.
    assert(
      setEq(m.bucketKeys, [f1.gateA, f1.gateB]),
      '불연속 배치가 반영되지 않았다 — 4일 폭인데 점유가 관문 둘로 줄지 않았다'
    );

    // 그리드-패널 일치 (1) — 사이 날짜가 **양쪽 다** 비었는가
    const gapConsistent = (m.chipCountsByDate[f1.gap] || 0) === 0 && calendar.getEventsForDate(f1.gap).length === 0;
    assert(gapConsistent, '그리드와 패널이 today-1 에 다른 답을 낸다 — 둘 중 하나만 고쳤다(DD32)'); // DD32-CONSISTENCY-1

    // Task 2 규칙 1 — 패널 메타가 관문 날짜 열거인가. (a) 두 날짜를 담고
    // (b) 범위 구분자를 **안** 담는다. 옛 경로는 양 끝 날짜가 새 규칙과 똑같이
    // 나오므로 (a) 만으로는 갈리지 않는다 — 가르는 것은 구분자다.
    calendar.selectDate(f1.gateB);
    await settle();
    const meta1 = frameWindow.document.querySelector('.calendar-todo-meta').textContent;
    const rule1Ok =
      meta1.includes(frameWindow.formatShortDate(f1.gateA)) &&
      meta1.includes(frameWindow.formatShortDate(f1.gateB)) &&
      !meta1.includes(' – ');
    assert(rule1Ok, '패널 메타가 관문 날짜 열거가 아니라 연속 범위다'); // TASK2-RULE-1

    collector.add(
      'occupancy/01-gap-is-empty',
      {
        bucketKeys: m.bucketKeys,
        bucketSizesByDate: m.bucketSizesByDate,
        gapChipCount: m.chipCountsByDate[f1.gap] || 0,
        gapPanelCount: calendar.getEventsForDate(f1.gap).length,
        panelMetaHasRangeDash: meta1.includes(' – '),
      },
      capturedErrors
    );
  }

  // ── 2번 — 폭 없는 항목이 그대로인가 ────────────────────────────────────
  {
    const { frameWindow, calendar } = await freshCalendar();
    const today = calendar.todayKey;
    await calendar.addEvent({ startDate: today, endDate: today, title: 'M2b 2번 관문 하나' }); // DD31-FIXTURE 2 — today 관문 하나
    const windowDates = focusWindowOn(frameWindow, calendar, [today]);
    await settle();
    const m = measure(frameWindow, calendar);
    assertOccupancyInvariants('점유 2번', m, windowDates);
    assert(setEq(m.bucketKeys, [today]), '폭 없는 항목의 점유가 today 하나가 아니다');

    collector.add('occupancy/02-single-gate', {
      bucketKeys: m.bucketKeys,
      chipCount: m.chipCountsByDate[today],
    });
  }

  // ── 3번 — 키 목록과 버킷 길이가 다른 것임을 드러낸다 ────────────────────
  {
    const { frameWindow, calendar } = await freshCalendar();
    const today = calendar.todayKey;
    await calendar.addEvent({ startDate: today, endDate: today, title: 'M2b 3번 이벤트 A' }); // DD31-FIXTURE 3 — 같은 날 서로 다른 이벤트 둘
    await calendar.addEvent({ startDate: today, endDate: today, title: 'M2b 3번 이벤트 B' });
    const windowDates = focusWindowOn(frameWindow, calendar, [today]);
    await settle();
    const m = measure(frameWindow, calendar);
    assertOccupancyInvariants('점유 3번', m, windowDates);
    assert(m.bucketKeys.length === 1, '같은 날 이벤트 둘이 날짜 키를 둘 만들었다');
    assert(
      m.bucketSizesByDate[today] === 2,
      '서로 다른 이벤트 둘이 한 버킷에 둘로 서지 않았다 — 접기가 이벤트 경계를 넘었다'
    );

    collector.add('occupancy/03-two-events-one-date', {
      bucketKeys: m.bucketKeys,
      bucketSize: m.bucketSizesByDate[today],
      chipCount: m.chipCountsByDate[today],
    });
  }

  // ── 4번 — dropped 관문이 점유에 남는가 (계획은 남는다) ──────────────────
  {
    const { frameWindow, calendar } = await freshCalendar();
    const today = calendar.todayKey;
    const shift = (n) => frameWindow.shiftDateKey(today, n);
    const f4 = { droppedKey: shift(-1), liveKey: shift(1) };
    await calendar.addEvent({ startDate: f4.droppedKey, endDate: f4.liveKey, title: 'M2b 4번 범위축소' }); // DD31-FIXTURE 4 — today-1(dropped)·today+1
    const f4Event = calendar.getEvents()[0];
    const droppedGate = f4Event.gates.find((gate) => gate.planned === f4.droppedKey);
    await calendar.updateGate(f4Event.id, droppedGate.id, { status: 'dropped' });
    const windowDates = focusWindowOn(frameWindow, calendar, [f4.droppedKey, f4.liveKey, today]);
    await settle();
    const m = measure(frameWindow, calendar);
    assertOccupancyInvariants('점유 4번', m, windowDates);
    assert(
      setEq(m.bucketKeys, [f4.droppedKey, f4.liveKey]),
      'dropped 관문의 날짜가 점유에서 빠졌다 — 안 하기로 한 것과 애초에 없던 것은 다르다(DD31)'
    );

    collector.add('occupancy/04-dropped-keeps-cell', {
      bucketKeys: m.bucketKeys,
      droppedChipCount: m.chipCountsByDate[f4.droppedKey],
      droppedGateStatus: calendar.getEvents()[0].gates.find((gate) => gate.planned === f4.droppedKey).status,
    });
  }

  // ── 5번 — 같은 날 관문 둘이 한 이벤트를 두 번 점유하지 않는가 ───────────
  {
    const { frameWindow, calendar } = await freshCalendar();
    const today = calendar.todayKey;
    await calendar.addEvent({ startDate: today, endDate: today, title: 'M2b 5번 dev·review' }); // DD31-FIXTURE 5 — 같은 날 dev·review 관문, 이벤트 하나
    const f5Event = calendar.getEvents()[0];
    await calendar.addGate(f5Event.id, { kind: 'dev', planned: today, status: 'pending' });
    await calendar.addGate(f5Event.id, { kind: 'review', planned: today, status: 'pending' });
    // 익명 관문을 지워 DD25 가 허용하는 "같은 날 이름 있는 관문 둘" 만 남긴다.
    const anonymous = calendar.getEvents()[0].gates.find((gate) => gate.kind === null);
    await calendar.removeGate(f5Event.id, anonymous.id);
    const windowDates = focusWindowOn(frameWindow, calendar, [today]);
    await settle();
    const m = measure(frameWindow, calendar);
    assertOccupancyInvariants('점유 5번', m, windowDates);
    assert(
      calendar.getEvents()[0].gates.length === 2,
      '5번 고정 입력이 같은 날 관문 둘을 갖지 못했다 — 케이스 결함이다'
    );
    assert(m.bucketSizesByDate[today] === 1, '같은 날 관문 둘이 한 이벤트를 두 번 점유했다');

    // 그리드-패널 일치 (5) — 접힌 날이 **양쪽 다** 하나인가. 1번은 "둘 다 비었나"를,
    // 이쪽은 "둘 다 하나인가"를 묻는다. 접기 누락은 1번을 통과하고 여기서만 죽는다.
    const foldConsistent = m.chipCountsByDate[today] === 1 && calendar.getEventsForDate(today).length === 1;
    assert(foldConsistent, '그리드와 패널이 today 에 다른 개수를 낸다 — 이벤트별 접기가 빠졌다(DD31·DD32)'); // DD32-CONSISTENCY-5

    collector.add('occupancy/05-same-day-gates-folded', {
      gateCount: calendar.getEvents()[0].gates.length,
      bucketSize: m.bucketSizesByDate[today],
      chipCount: m.chipCountsByDate[today],
      panelCount: calendar.getEventsForDate(today).length,
    });
  }

  // ── 6·7·8번 — Task 2 렌더 규칙 2·3 ─────────────────────────────────────
  {
    const { frameWindow, calendar } = await freshCalendar();
    const today = calendar.todayKey;
    const shift = (n) => frameWindow.shiftDateKey(today, n);

    // f6 — 살아 있는 종단 관문이 지연(today-2)이고 그보다 늦은 관문이 dropped(today+2).
    const f6 = { liveKey: shift(-2), droppedKey: shift(2) };
    await calendar.addEvent({ startDate: f6.liveKey, endDate: f6.droppedKey, title: 'M2b 6번 지연+범위축소' });
    const f6Event = calendar.getEvents()[0];
    const f6Dropped = f6Event.gates.find((gate) => gate.planned === f6.droppedKey);
    await calendar.updateGate(f6Event.id, f6Dropped.id, { status: 'dropped' });

    // f7 — 프로젝트에 속한 이벤트. f8 — 무소속 이벤트. 날짜를 f6 과 겹치지 않게 둔다.
    const f7 = { projectName: 'M2b 스모크 프로젝트', keyA: shift(1), keyB: shift(3) };
    await calendar.addProject({ name: f7.projectName });
    const projectId = calendar.projects[0].id;
    await calendar.addEvent({ startDate: f7.keyA, endDate: f7.keyB, title: 'M2b 7번 프로젝트 소속', projectId });
    const f8 = { keyA: shift(-3), keyB: shift(-1) };
    await calendar.addEvent({ startDate: f8.keyA, endDate: f8.keyB, title: 'M2b 8번 무소속' });

    const windowDates = focusWindowOn(frameWindow, calendar, [
      f6.liveKey,
      f6.droppedKey,
      f7.keyA,
      f7.keyB,
      f8.keyA,
      f8.keyB,
      today,
    ]);
    await settle();
    const m = measure(frameWindow, calendar);
    assertOccupancyInvariants('렌더 규칙', m, windowDates);
    assert(
      calendar.getEventDueState(calendar.getEvents().find((event) => event.id === f6Event.id)) === 'overdue',
      '6번 고정 입력의 살아 있는 종단 관문이 지연이 아니다 — 케이스 결함이다'
    );

    // 규칙 2 — dropped 날짜에 마감 상태가 안 붙는다: 칩 · 셀 · aria-label 셋 다.
    // 칩이 **있으면서** is-due-* 가 없어야 한다 — 빈 셀은 이 단언을 거저 통과한다.
    const droppedCell = frameWindow.document.querySelector('.calendar-day[data-date="' + f6.droppedKey + '"]');
    const rule2Ok =
      droppedCell.querySelectorAll('.calendar-chip').length > 0 &&
      droppedCell.querySelectorAll('.calendar-chip[class*="is-due-"]').length === 0 &&
      !Array.from(droppedCell.classList).some((token) => token.startsWith('is-due-')) &&
      !(droppedCell.getAttribute('aria-label') || '').includes(OVERDUE_LABEL);
    assert(rule2Ok, 'dropped 관문 날짜에 지연 상태가 붙었다 — 칩/셀/aria-label 중 하나가 남았다'); // TASK2-RULE-2

    // 규칙 3 — 프로젝트 이름이 .calendar-todo-meta 의 **첫 조각**이고, 무소속에는 없다.
    calendar.selectDate(f7.keyA);
    await settle();
    const meta3 = frameWindow.document.querySelector('.calendar-todo-meta').textContent;
    calendar.selectDate(f8.keyA);
    await settle();
    const metaOrphan = frameWindow.document.querySelector('.calendar-todo-meta').textContent;
    const rule3Ok = meta3.startsWith(f7.projectName) && !metaOrphan.includes(f7.projectName);
    assert(rule3Ok, '프로젝트 이름이 메타의 첫 조각이 아니거나, 무소속 항목에 이름이 들어갔다'); // TASK2-RULE-3

    collector.add(
      'occupancy/06-render-rules',
      {
        droppedCellChipCount: droppedCell.querySelectorAll('.calendar-chip').length,
        droppedCellDueChipCount: droppedCell.querySelectorAll('.calendar-chip[class*="is-due-"]').length,
        droppedCellClasses: Array.from(droppedCell.classList).sort().join(' '),
        droppedCellAriaHasOverdue: (droppedCell.getAttribute('aria-label') || '').includes(OVERDUE_LABEL),
        projectMetaStartsWithName: meta3.startsWith(f7.projectName),
        orphanMetaHasProjectName: metaOrphan.includes(f7.projectName),
      },
      capturedErrors
    );
  }

  progress('calendar occupancy cases 완료');
}

/**
 * 첫 실행 온보딩 (DD13 · UI8)
 *
 * 여섯을 돌린다. 3번·4번·6번은 **셋 다 다른 것을 잡는다** — 3번은 CalendarManager
 * 쪽 실패, 4번은 SettingsManager 의 **읽기** 실패(loadSettings() 가 불렸으나 try 가
 * 끊긴다), 6번은 SettingsManager 의 **초기화** 실패(loadSettings() 가 아예 안 불린다).
 * @param {ReturnType<typeof createCollector>} collector
 */
async function runCalendarOnboardingCases(collector) {
  const BRIGHTNESS_PROBE = 37;
  const baseState = {
    settingsVersion: 4,
    widgetType: 'calendar',
    mainWidgetEnabled: true,
    searchEnabled: true,
    calendarEvents: [],
    calendarProjects: [],
    // loadSettings() 의 **마지막** 관찰 가능한 부수효과다(둘째 try 의 밝기 반영).
    // 이 값이 화면에 닿으면 그 메서드가 끝까지 돌았다는 뜻이고, 그다음에
    // Application.initialize() 의 온보딩 판정이 선다. "안 뜬다" 를 단언하려면
    // 판정이 이미 돌았다는 것을 알아야 하므로 이 신호가 필요하다.
    overlayBrightness: BRIGHTNESS_PROBE,
  };

  /** 온보딩 판정이 이미 섰음을 확정한 뒤 표면 노드를 돌려준다 */
  const settledOnboarding = async (frameWindow) => {
    await waitFor(
      () => frameWindow.document.getElementById('opacityValue').textContent === String(BRIGHTNESS_PROBE),
      'SettingsManager.loadSettings() 완주 (온보딩 판정 직전 신호)'
    );
    await settle();
    return frameWindow.document.getElementById('calendarOnboarding');
  };

  // ── 1번 — 프로젝트 0개 · 설정 읽기 정상 → 뜬다 ─────────────────────────
  const frame1 = await loadApp(baseState); // DD13-CASE 1 — 프로젝트 0개 · 설정 정상
  const onboarding1 = await settledOnboarding(frame1);
  assert(
    onboarding1.hidden === false,
    '프로젝트가 없는 첫 로드에서 온보딩이 뜨지 않았다 — 정상 경로가 성립하지 않으면 아래 2번도 성립하지 않는다'
  );

  // ── 2번 — 건너뛰기를 누르고 다시 초기화 → 안 뜬다 ──────────────────────
  frame1.document.getElementById('calendarOnboardingSkip').click(); // DD13-CASE 2 — 건너뛰기 뒤 재초기화
  await waitFor(
    () => frame1.document.getElementById('calendarOnboarding').hidden === true,
    '건너뛰기가 온보딩 표면을 닫는다'
  );
  const skippedFlagStored =
    (await chrome.storage.local.get(['calendarOnboardingSeen'])).calendarOnboardingSeen === true;
  assert(
    skippedFlagStored,
    '건너뛰기가 한 번뿐인 플래그를 쓰지 않았다 — 다음 초기화에서 다시 뜬다(UI8 위반)'
  );

  const frame2 = await loadApp(Object.assign({}, baseState, { calendarOnboardingSeen: true }));
  const onboarding2 = await settledOnboarding(frame2);
  assert(
    onboarding2.hidden === true,
    '건너뛴 사용자에게 온보딩이 다시 떴다 — 넷째 항이 판정식에 없거나 읽히지 않는다'
  );

  // ── 3번 — 프로젝트 읽기 실패 → 안 뜨고 플래그도 안 탄다 ────────────────
  const frame3 = await loadApp(Object.assign({}, baseState, { calendarProjects: { broken: 'not an array' } })); // DD13-CASE 3 — projectsLoadFailed
  const onboarding3 = await settledOnboarding(frame3);
  const app3 = frame3['__newTabApp'];
  assert(
    app3.calendarManager.projectsLoadFailed === true,
    '3번 고정 입력이 projectsLoadFailed 를 세우지 못했다 — 케이스 결함이다'
  );
  assert(onboarding3.hidden === true, '프로젝트 읽기 실패를 첫 실행으로 오인해 온보딩이 떴다');
  const flagAfter3 = (await chrome.storage.local.get(['calendarOnboardingSeen'])).calendarOnboardingSeen;
  assert(flagAfter3 !== true, '프로젝트 읽기 실패 상태에서 한 번뿐인 플래그가 탔다 — 그 상태는 첫 실행이 아니다');

  // ── 4번 — 설정 **읽기** 실패 → calendarSettingsLoaded 가 false ─────────
  //
  // 필드를 직접 false 로 대입해 세우지 않는다 — 그러면 "생성자 기본값이 있는가" 와
  // "실패 경로가 그 줄에 안 닿는가" 둘 다 검사에서 빠져 이 케이스가 자기가 잡아야 할
  // 것을 못 잡는다. 정상 부팅한 프레임에서 storage.get 을 던지게 만든 뒤 두 번째
  // 인스턴스를 세워 loadSettings() 를 **실제로** 실패시킨다.
  const frame4 = await loadApp(baseState); // DD13-CASE 4 — 설정 저장소 읽기 실패
  await settledOnboarding(frame4);
  const app4 = frame4['__newTabApp'];
  const localApi4 = frame4.chrome.storage.local;
  const originalGet4 = localApi4.get;
  let probe4 = null;
  try {
    localApi4.get = function failingGet(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      // 설정 읽기만 끊는다. 달력·프로젝트 읽기는 그대로 둬야 4번이 3번과 다른 것을 잡는다.
      if (list.indexOf('calendarOnboardingSeen') !== -1) {
        return Promise.reject(new Error('smoke: 설정 저장소 읽기 실패 주입'));
      }
      return originalGet4.call(localApi4, keys);
    };
    probe4 = new (app4.settingsManager.constructor)(
      app4.settingsManager.modal,
      app4.settingsManager.toggleBtn,
      app4.backgroundManager,
      app4.calendarManager
    );
    await probe4.initialize();
  } finally {
    localApi4.get = originalGet4;
  }
  assert(
    probe4.calendarSettingsLoaded === false,
    '설정 읽기가 실패했는데 calendarSettingsLoaded 가 false 가 아니다 — true 대입이 try 밖(catch/finally)에 있거나 생성자 기본값이 없다'
  );
  assert(probe4.calendarOnboardingSeen === false, '설정 읽기 실패 경로에서 calendarOnboardingSeen 이 false 가 아니다');
  const flagAfter4 = (await chrome.storage.local.get(['calendarOnboardingSeen'])).calendarOnboardingSeen;
  assert(flagAfter4 !== true, '설정 읽기 실패 상태에서 한 번뿐인 플래그가 탔다 — 그 상태는 첫 실행이 아니다');

  // ── 5번 — 온보딩이 떠 있는 동안 레이아웃이 안 움직인다 ──────────────────
  const frame5 = await loadApp(baseState); // DD13-CASE 5 — 온보딩 표시 중 밴드 기하
  const onboarding5 = await settledOnboarding(frame5);
  const doc5 = frame5.document;
  const widget5 = doc5.getElementById('calendarWidget');
  const month5 = doc5.querySelector('.calendar-month');
  assert(onboarding5.hidden === false, '5번 고정 입력에서 온보딩이 떠 있지 않다 — 케이스 결함이다');
  const shown = {
    widgetHeight: Math.round(widget5.getBoundingClientRect().height),
    monthScroll: month5.scrollHeight - month5.clientHeight,
  };
  onboarding5.hidden = true;
  await settle();
  const closed = {
    widgetHeight: Math.round(widget5.getBoundingClientRect().height),
    monthScroll: month5.scrollHeight - month5.clientHeight,
  };
  assert(
    shown.widgetHeight === closed.widgetHeight,
    '온보딩 표시가 밴드 높이를 바꾸면 안 된다 (' + shown.widgetHeight + ' → ' + closed.widgetHeight + ')'
  );
  assert(
    shown.monthScroll === closed.monthScroll,
    '온보딩 표시가 월 그리드에 스크롤을 만들면 안 된다 (' + shown.monthScroll + ' → ' + closed.monthScroll + ')'
  );

  // ── 6번 — 설정 DOM 요소 부재로 인한 조기 return ────────────────────────
  //
  // loadApp() 만으로는 세울 수 없는 자리다 — 그 함수는 부팅 끝에 SettingsManager 가
  // 조기 return 하지 *않았음*을 기다리고, 그 대기를 풀면 다른 모든 케이스의 전제가
  // 함께 약해진다. 대신 부팅은 정상으로 하고 그 프레임 안에서 두 번째 인스턴스를 세운다.
  const frame6 = await loadApp(baseState); // DD13-CASE 6 — 설정 DOM 부재로 조기 return
  await settledOnboarding(frame6);
  const app6 = frame6['__newTabApp'];
  frame6.document.getElementById('blurToggle').remove(); // 열둘 중 하나만 없어도 조기 return 이 탄다
  const probe6 = new (app6.settingsManager.constructor)(null, null, app6.backgroundManager, app6.calendarManager);
  await probe6.initialize();
  // **=== false 로 본다** — !probe6.calendarSettingsLoaded 로 보면 undefined 도 참이라
  // 이 케이스가 잡아야 할 바로 그 상태를 통과시킨다.
  assert(
    probe6.calendarSettingsLoaded === false,
    '조기 return 경로에서 calendarSettingsLoaded 가 false 가 아니다 — undefined 면 생성자 기본값이 없는 것이고, !undefined 가 참이라 온보딩이 매 로드마다 다시 뜬다'
  );
  assert(probe6.calendarOnboardingSeen === false, '조기 return 경로에서 calendarOnboardingSeen 이 false 가 아니다');
  // 요소를 되돌리지 않는다 — 다음 loadApp() 이 iframe 을 새로 띄우므로 되돌리는 줄은
  // 아무것도 지키지 않으면서 "요소가 없는 상태" 라는 이 케이스의 전제만 흐린다.
  // 같은 이유로 이 프레임에 대고 다른 케이스를 잇지 않는다.

  // ── 7번 — 이름을 넣고 만들기 → 프로젝트가 생기고 플래그가 탄다 ──────────
  //
  // 1~6번이 덮는 것은 **뜨는가 · 건너뛰면 다시 안 뜨는가** 뿐이라 만들기 경로
  // 전체가 어느 케이스에도 없었다. 그 경로가 죽으면 사용자는 한 번뿐인 안내를
  // 소모하고도 프로젝트를 얻지 못하며, 표면이 닫히므로 **그 사실조차 모른다.**
  const frame7 = await loadApp(baseState); // DD13-CASE 7 — 만들기 성공
  const onboarding7 = await settledOnboarding(frame7);
  assert(onboarding7.hidden === false, '7번 고정 입력에서 온보딩이 떠 있지 않다 — 케이스 결함이다');
  const CREATED_NAME = 'M2b 온보딩 프로젝트';
  frame7.document.getElementById('calendarOnboardingName').value = CREATED_NAME;
  // requestSubmit() 은 submit 이벤트를 **실제로** 발생시킨다(form.submit() 과 다르다).
  // 버튼을 click() 하지 않는 이유는 Enter 제출 경로도 같은 핸들러를 타기 때문이다.
  frame7.document.getElementById('calendarOnboardingForm').requestSubmit();
  // waitFor 의 타임아웃을 **던지게 두지 않는다.** 표면이 안 닫히는 것은 이 케이스가
  // 잡아야 할 결함이지 하네스 사고가 아니고, 던지면 뒤따르는 케이스 함수들이 통째로
  // 안 돌아 결함 하나가 스위트 절반을 가린다. 단언으로 내려 기록하고 계속 간다.
  let closed7 = false;
  try {
    await waitFor(
      () => frame7.document.getElementById('calendarOnboarding').hidden === true,
      '만들기 성공이 온보딩 표면을 닫는다'
    );
    closed7 = true;
  } catch (_) {
    closed7 = false;
  }
  assert(closed7, '만들기가 성공했는데 온보딩 표면이 닫히지 않았다');
  const created7 = frame7['__newTabApp'].calendarManager.projects;
  const createdOk = created7.length === 1 && created7[0].name === CREATED_NAME;
  assert(createdOk, '만들기가 프로젝트를 만들지 못했다 — 표면만 닫히고 목록은 비어 있다');
  const createdFlagStored =
    (await chrome.storage.local.get(['calendarOnboardingSeen'])).calendarOnboardingSeen === true;
  assert(createdFlagStored, '만들기 뒤 한 번뿐인 플래그가 타지 않았다 — 다음 초기화에서 안내가 다시 뜬다');

  // ── 8번 — 저장 실패 → 말하고 · 안 닫고 · 플래그를 안 태운다 ─────────────
  //
  // 셋을 **함께** 약속하는 자리다. 하나만 무너져도 약속은 깨진다: 안 말하면 원칙 4 를
  // 어기고, 닫으면 사용자가 만들었다고 믿고, 플래그가 타면 다시 볼 수 없는 안내를
  // 실패로 소모한다. 그래서 셋을 각각 본다.
  const frame8 = await loadApp(baseState); // DD13-CASE 8 — 만들기 실패
  const onboarding8 = await settledOnboarding(frame8);
  assert(onboarding8.hidden === false, '8번 고정 입력에서 온보딩이 떠 있지 않다 — 케이스 결함이다');
  const localApi8 = frame8.chrome.storage.local;
  const originalSet8 = localApi8.set;
  let errorShown8 = false;
  try {
    // 4번과 같은 관용구다 — backend 'extension' 에서 storage 어댑터는
    // chrome.storage.local **그 객체**를 그대로 돌려주므로, 메서드를 갈아끼우면
    // 앱이 진짜 저장 실패를 겪는다. 필드를 손으로 세우는 것과 다르다.
    localApi8.set = () => Promise.reject(new Error('smoke: 프로젝트 저장 실패 주입'));
    frame8.document.getElementById('calendarOnboardingName').value = 'M2b 실패 프로젝트';
    frame8.document.getElementById('calendarOnboardingForm').requestSubmit();
    await waitFor(
      () => frame8.document.getElementById('calendarOnboardingError').hidden === false,
      '저장 실패가 온보딩 오류 문구를 띄운다'
    );
    errorShown8 = true;
  } catch (_) {
    // 7번과 같은 이유로 삼킨다 — 아래 단언이 이 사실을 기록한다.
    errorShown8 = false;
  } finally {
    localApi8.set = originalSet8;
  }
  assert(errorShown8, '저장이 실패했는데 온보딩이 아무 말도 하지 않았다 (PRODUCT.md 원칙 4)');
  const stillOpen8 = frame8.document.getElementById('calendarOnboarding').hidden === false;
  assert(stillOpen8, '저장이 실패했는데 온보딩이 닫혔다 — 사용자는 만들었다고 믿는다');
  const noProject8 = frame8['__newTabApp'].calendarManager.projects.length === 0;
  assert(noProject8, '저장이 실패했는데 프로젝트가 목록에 남았다 — 저장소와 화면이 어긋난다');
  const flagAfter8 = (await chrome.storage.local.get(['calendarOnboardingSeen'])).calendarOnboardingSeen;
  assert(flagAfter8 !== true, '저장 실패에서 한 번뿐인 플래그가 탔다 — 다시 볼 수 없는 안내를 소모했다');

  collector.add(
    'onboarding/01-decision-matrix',
    {
      shownOnFirstRun: onboarding1.hidden === false,
      skippedFlagStored,
      hiddenAfterSkip: onboarding2.hidden === true,
      hiddenOnProjectsLoadFailed: onboarding3.hidden === true,
      flagUntouchedOnProjectsLoadFailed: flagAfter3 !== true,
      settingsLoadedFalseOnReadFailure: probe4.calendarSettingsLoaded === false,
      flagUntouchedOnSettingsReadFailure: flagAfter4 !== true,
      settingsLoadedFalseOnEarlyReturn: probe6.calendarSettingsLoaded === false,
      onboardingSeenFalseOnEarlyReturn: probe6.calendarOnboardingSeen === false,
      surfaceClosedOnCreate: closed7,
      projectCreatedOnSubmit: createdOk,
      flagStoredOnCreate: createdFlagStored,
      errorShownOnCreateFailure: errorShown8,
      stillOpenOnCreateFailure: stillOpen8,
      noProjectOnCreateFailure: noProject8,
      flagUntouchedOnCreateFailure: flagAfter8 !== true,
    },
    capturedErrors
  );
  collector.add('onboarding/02-geometry-invariant', {
    heightInvariant: shown.widgetHeight === closed.widgetHeight,
    monthScrollInvariant: shown.monthScroll === closed.monthScroll,
  });

  progress('calendar onboarding cases 완료');
}

/* ────────────────────────── 실행 / 비교 ────────────────────────── */

/**
 * @param {string} message
 */
function progress(message) {
  if (progressElement) progressElement.textContent = message;
}

/**
 * 전체 케이스 실행. 원래 스토리지는 반드시 복원한다.
 * @returns {Promise<Record<string, unknown>>}
 */
async function runAll() {
  const original = await chrome.storage.local.get(null);
  /**
   * 베이스라인을 **여기서** 떠 둔다.
   *
   * loadApp이 케이스마다 storage.clear()를 부르므로 BASELINE_KEY도 함께 지워진다.
   * finally에서 읽으면 이미 사라진 뒤라 복원이 no-op이 되고, 저장된 베이스라인이
   * 비교 한 번에 증발했다. 그러면 다음 비교는 이미 바뀐 코드에서 기준을 다시
   * 떠야 하고, 회귀가 새 기준으로 굳는다.
   */
  const baselineBackup = original[BASELINE_KEY];
  delete original[BASELINE_KEY];

  assertFailures = [];

  const collector = createCollector();
  try {
    // 시계는 81조합 스냅샷 그대로 — 이 경로는 이번 변경에서 diff 0이어야 한다 (UI4).
    await runPositionMatrix(collector, 'clock');
    // 달력은 위치가 없어졌다. 81건 스냅샷 대신 불변식 한 건으로 바뀐다.
    await runBandInvariance(collector);
    await runToggleMatrix(collector, 'clock');
    await runToggleMatrix(collector, 'calendar');
    await runDynamicCases(collector);
    await runMigrationCases(collector);
    await runCalendarV3MigrationCases(collector);
    // 등가 판정은 마이그레이션이 검증된 다음에만 의미가 있다.
    await runCalendarV4MigrationCases(collector);
    await runCalendarV4EquivalenceCases(collector);
    await runCalendarProjectCases(collector);
    await runCalendarGateCases(collector);
    // 점유 전환(DD31·DD32)과 렌더 규칙 셋(Task 2). 관문 CRUD 가 검증된 다음에 온다 —
    // 이 케이스들이 addGate/updateGate/removeGate 로 고정 입력을 세우기 때문이다.
    await runCalendarOccupancyCases(collector);
    // 온보딩은 점유 전환 뒤에 온다 (DD34) — 온보딩이 만드는 것은 프로젝트인데,
    // 프로젝트를 읽는 화면이 아직 적응되지 않은 자리에서 만들면 만들자마자 안 보인다.
    await runCalendarOnboardingCases(collector);
    await runRangeCases(collector);
    await runSummaryCases(collector);
    await runDateKeyCases(collector);
    await runSanitizeCases(collector);
    await runStorageBackendCases(collector);
    await runLoadFailureCases(collector);
    await runErrorBannerGeometryCases(collector);
  } finally {
    stage.src = 'about:blank';
    stage.style.width = '1280px';
    stage.style.height = '800px';
    await chrome.storage.local.clear();
    await chrome.storage.local.set(original);
    if (baselineBackup) await chrome.storage.local.set({ [BASELINE_KEY]: baselineBackup });
    progress('스토리지 원복 완료');
  }
  return collector.results;
}

/**
 * 결과 표 렌더링
 * @param {Record<string, unknown>} current
 * @param {Record<string, unknown>|null} baseline
 */
/**
 * 키 순서에 무관한 직렬화 — 비교 전용
 *
 * `chrome.storage.local` 은 값을 되돌려줄 때 객체 키를 알파벳순으로 정규화한다.
 * 베이스라인은 그 저장소를 거쳐 오고 현재 결과는 방금 만든 객체이므로, 순진한
 * `JSON.stringify` 비교는 **코드가 하나도 안 바뀌어도** 전 케이스를 "차이"로 답한다.
 * 실측했다 — 변경 전 트리에서 capture → compare 를 같은 프로필로 돌리면 118건 중
 * 117건이 차이로 뜨고 그중 87건은 값이 완전히 같다.
 *
 * 그 상태의 "차이 0" 은 참이 될 수 없는 판정이고, **없는 게이트와 구별되지 않는다.**
 * 그래서 비교만 정규화한다 — 저장되는 값도 내보내는 파일도 그대로다.
 *
 * 배열 순서는 **정렬하지 않는다.** 순서가 의미를 갖는 투영(관문 목록 · 승격 범위
 * 목록)이 있고, 그 순서가 바뀌는 것은 실제 회귀다.
 * @param {unknown} value
 * @returns {string}
 */
function stableStringify(value) {
  const canon = (node) => {
    if (Array.isArray(node)) return node.map(canon);
    if (node && typeof node === 'object') {
      /** @type {Record<string, unknown>} */
      const out = {};
      Object.keys(node)
        .sort()
        .forEach((key) => {
          out[key] = canon(node[key]);
        });
      return out;
    }
    return node;
  };
  return JSON.stringify(canon(value));
}

function renderResults(current, baseline) {
  if (!resultsBody || !summaryElement) return;
  resultsBody.textContent = '';

  const names = Array.from(new Set([...Object.keys(current), ...Object.keys(baseline || {})])).sort();
  let failCount = 0;
  let errorCount = 0;

  names.forEach((name) => {
    // 키 순서를 정규화해 비교한다 (위 stableStringify 머리말 참고).
    const currentJson = stableStringify(current[name] ?? null);
    const baselineJson = baseline ? stableStringify(baseline[name] ?? null) : null;

    const hasErrors = currentJson.includes('"errors"');
    if (hasErrors) errorCount += 1;

    let status = '기록';
    let statusClass = 'ok';
    if (baseline) {
      if (currentJson === baselineJson) {
        status = '동일';
      } else {
        status = '차이';
        statusClass = 'diff';
        failCount += 1;
      }
    }
    if (hasErrors) {
      status += ' + 오류';
      statusClass = 'diff';
    }

    const row = document.createElement('tr');
    if (statusClass === 'diff') row.className = 'row-fail';

    const nameCell = document.createElement('td');
    const nameCode = document.createElement('code');
    nameCode.textContent = name;
    nameCell.appendChild(nameCode);
    row.appendChild(nameCell);

    const statusCell = document.createElement('td');
    statusCell.className = statusClass;
    statusCell.textContent = status;
    row.appendChild(statusCell);

    const detailCell = document.createElement('td');
    const detailCode = document.createElement('code');
    detailCode.textContent =
      baseline && currentJson !== baselineJson ? `기준: ${baselineJson}\n현재: ${currentJson}` : currentJson;
    detailCell.appendChild(detailCode);
    row.appendChild(detailCell);

    resultsBody.appendChild(row);
  });

  // 단언 실패는 베이스라인과 무관하게 실패다. 베이스라인 캡처 모드에서도
  // 마찬가지다 — 잘못된 값을 새 기준으로 굳히는 것을 여기서 막는다.
  const assertCount = assertFailures.length;
  const passed = failCount === 0 && errorCount === 0 && assertCount === 0;
  summaryElement.className = passed ? 'pass' : 'fail';
  summaryElement.textContent = baseline
    ? `케이스 ${names.length}건 · 차이 ${failCount}건 · 오류 발생 케이스 ${errorCount}건 · 단언 실패 ${assertCount}건` +
      (passed ? ' → 회귀 없음' : ' → 확인 필요')
    : `베이스라인 ${names.length}건 캡처 완료` +
      (errorCount > 0 ? ` · 오류 발생 케이스 ${errorCount}건` : '') +
      (assertCount > 0 ? ` · 단언 실패 ${assertCount}건 (캡처된 값을 믿지 마세요)` : '');

  if (assertCount > 0) {
    const row = document.createElement('tr');
    row.className = 'row-fail';
    const nameCell = document.createElement('td');
    nameCell.appendChild(document.createElement('code')).textContent = '단언 실패';
    row.appendChild(nameCell);
    const statusCell = document.createElement('td');
    statusCell.className = 'diff';
    statusCell.textContent = `${assertCount}건`;
    row.appendChild(statusCell);
    const detailCell = document.createElement('td');
    detailCell.appendChild(document.createElement('code')).textContent = assertFailures.join('\n');
    row.appendChild(detailCell);
    resultsBody.insertBefore(row, resultsBody.firstChild);
  }
}

/**
 * 버튼 잠금/해제
 * @param {boolean} disabled
 */
function setControlsDisabled(disabled) {
  document.querySelectorAll('button').forEach((button) => {
    if (button instanceof HTMLButtonElement) button.disabled = disabled;
  });
}

document.getElementById('runBaseline')?.addEventListener('click', async () => {
  setControlsDisabled(true);
  try {
    const results = await runAll();
    // 두 키를 한 번에 커밋한다. 나누면 사이에서 죽었을 때 베이스라인만 남고
    // 그 실행이 깨끗했는지는 사라진 반쪽 상태가 된다.
    await chrome.storage.local.set({
      [BASELINE_KEY]: results,
      [BASELINE_META_KEY]: { assertFailures: assertFailures.length },
    });
    renderResults(results, null);
  } catch (error) {
    if (summaryElement) {
      summaryElement.className = 'fail';
      summaryElement.textContent = `하네스 실행 실패: ${error.message}`;
    }
  } finally {
    setControlsDisabled(false);
  }
});

document.getElementById('runCompare')?.addEventListener('click', async () => {
  setControlsDisabled(true);
  try {
    const stored = await chrome.storage.local.get([BASELINE_KEY]);
    if (!stored[BASELINE_KEY]) {
      if (summaryElement) {
        summaryElement.className = 'fail';
        summaryElement.textContent = '베이스라인이 없습니다. 리팩터링 이전 코드에서 먼저 캡처하세요.';
      }
      return;
    }
    const results = await runAll();
    renderResults(results, stored[BASELINE_KEY]);
  } catch (error) {
    if (summaryElement) {
      summaryElement.className = 'fail';
      summaryElement.textContent = `하네스 실행 실패: ${error.message}`;
    }
  } finally {
    setControlsDisabled(false);
  }
});

document.getElementById('clearBaseline')?.addEventListener('click', async () => {
  await chrome.storage.local.remove([BASELINE_KEY]);
  if (summaryElement) {
    summaryElement.className = '';
    summaryElement.textContent = '베이스라인 삭제됨';
  }
});

/**
 * 베이스라인 내보내기 — 앵커 검사가 실재하게 만드는 유일한 수단
 *
 * 베이스라인은 chrome.storage.local 안에만 있어 파일이 없다. 파일이 없으면
 * shasum -c가 "no such file"로 죽고, 그것은 실행될 수 없는 검사를 판정으로
 * 적어 둔 것과 같다.
 *
 * **봉투로 내린다** — meta.assertFailures가 베이스라인 옆에 함께 실린다.
 * 잡는 것은 "단언이 깨진 실행에서 베이스라인을 떴다" 하나이고, 손으로 고친
 * JSON은 잡지 못한다. 닫히지 않는 것과 비어 있는 것은 다르다.
 */
document.getElementById('exportBaseline')?.addEventListener('click', async () => {
  const stored = await chrome.storage.local.get([BASELINE_KEY, BASELINE_META_KEY]);
  if (!stored[BASELINE_KEY]) {
    if (summaryElement) {
      summaryElement.className = 'fail';
      summaryElement.textContent = '베이스라인이 없습니다. "베이스라인 캡처"를 먼저 누르세요.';
    }
    return;
  }

  const envelope = {
    meta: stored[BASELINE_META_KEY] || { assertFailures: null },
    baseline: stored[BASELINE_KEY],
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'work-calendar-m2.baseline.json';
  link.click();
  URL.revokeObjectURL(url);

  if (summaryElement) {
    const n = envelope.meta.assertFailures;
    summaryElement.className = n === 0 ? '' : 'fail';
    summaryElement.textContent =
      n === 0
        ? 'work-calendar-m2.baseline.json 내려받음 (단언 실패 0건)'
        : `work-calendar-m2.baseline.json 내려받음 — 단언 실패 ${n === null ? '수 미상' : n + '건'}. 이 파일을 앵커로 쓰지 마세요.`;
  }
});
