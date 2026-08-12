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

  const malicious = JSON.parse(
    '[{"__proto__":{"polluted":1},"date":"2026-08-06","title":"정상","evil":"drop me"},' +
      '{"date":"2026-02-30","title":"존재하지 않는 날짜"},' +
      '{"date":"bad","title":"형식 오류"},' +
      '{"date":"2026-08-07","title":""}]'
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
    frameWindow.createCalendarEvent({ startDate: todayKey, endDate: todayKey, title: '복구본' }),
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
function renderResults(current, baseline) {
  if (!resultsBody || !summaryElement) return;
  resultsBody.textContent = '';

  const names = Array.from(new Set([...Object.keys(current), ...Object.keys(baseline || {})])).sort();
  let failCount = 0;
  let errorCount = 0;

  names.forEach((name) => {
    const currentJson = JSON.stringify(current[name] ?? null);
    const baselineJson = baseline ? JSON.stringify(baseline[name] ?? null) : null;

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
    await chrome.storage.local.set({ [BASELINE_KEY]: results });
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
