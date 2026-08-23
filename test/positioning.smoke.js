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
