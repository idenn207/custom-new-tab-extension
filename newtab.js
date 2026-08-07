// @ts-check
'use strict';

/**
 * 파일 위치: /my-newtab-extension/newtab.js
 * 파일명: newtab.js
 * 용도: New Tab 페이지의 동적 기능 구현
 * 기능: 시계, 달력, 검색, 즐겨찾기(고정 기능 포함), 이미지 관리, 설정
 * 책임: UI 상호작용 및 비즈니스 로직 처리 (단일 책임 원칙 준수)
 */

/** 설정 스키마 버전. 마이그레이션 멱등성 마커 */
const SETTINGS_VERSION = 2;

/** 이벤트 제목 최대 길이 */
const MAX_TITLE_LENGTH = 500;

/** 가져오기 시 허용하는 최대 이벤트 수 */
const MAX_IMPORT_EVENTS = 5000;

/** 'YYYY-MM-DD' 날짜 키 형식 */
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 요일 라벨 (일~토) */
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * @typedef {Object} CalendarEvent
 * @property {string} id          - crypto.randomUUID()
 * @property {string} date        - 'YYYY-MM-DD' (로컬 타임존 기준). makeDateKey()로만 생성
 * @property {string} title       - 사용자 입력. 렌더는 반드시 textContent
 * @property {boolean} done
 * @property {number} createdAt   - Date.now()
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
 * @returns {Promise<void>}
 */
async function migrateSettingsToV2() {
  try {
    const stored = await chrome.storage.local.get([
      'settingsVersion',
      'mainWidgetEnabled',
      'mainWidgetPosition',
      'clockEnabled',
      'clockPosition',
    ]);

    if ((stored.settingsVersion ?? 1) >= SETTINGS_VERSION) return;

    await chrome.storage.local.set({
      mainWidgetEnabled: stored.mainWidgetEnabled ?? stored.clockEnabled !== false,
      mainWidgetPosition: stored.mainWidgetPosition ?? (stored.clockPosition || 'center-center'),
      settingsVersion: SETTINGS_VERSION,
    });
  } catch (error) {
    console.error('Failed to migrate settings:', error);
  }
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

  raw.forEach((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;

    const date = typeof item.date === 'string' ? item.date : '';
    if (!DATE_KEY_PATTERN.test(date)) return;
    // 왕복 검증 — '2026-02-30' 같은 존재하지 않는 날짜를 거른다
    if (makeDateKey(parseDateKey(date)) !== date) return;

    const title = String(item.title ?? '').slice(0, MAX_TITLE_LENGTH).trim();
    if (!title) return;

    let id = typeof item.id === 'string' && item.id ? item.id : '';
    if (!id || usedIds.has(id)) id = crypto.randomUUID();
    usedIds.add(id);

    sanitized.push({
      id,
      date,
      title,
      done: item.done === true,
      createdAt: Number.isFinite(item.createdAt) ? Number(item.createdAt) : Date.now(),
      source: 'local',
      externalId: typeof item.externalId === 'string' ? item.externalId : null,
    });
  });

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
      const result = await chrome.storage.local.get(['uploadedImages']);
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
      const result = await chrome.storage.local.get(['isRandomMode', 'fixedImage']);
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
      await chrome.storage.local.set({ uploadedImages: this.uploadedImages });
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
      await chrome.storage.local.set({
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
      const result = await chrome.storage.local.get(['bookmarks']);
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
      await chrome.storage.local.set({ bookmarks: this.bookmarks });
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
    deleteBtn.textContent = '×';
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
    deleteBtn.textContent = '×';
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

    /** @type {Map<string, CalendarEvent[]>} 날짜 키 → 이벤트 목록 */
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

    await this.loadEvents();
    this.render();
    this.setupEventListeners();
    this.startRolloverWatch();
  }

  /**
   * 이벤트 목록 로드
   */
  async loadEvents() {
    try {
      const result = await chrome.storage.local.get(['calendarEvents']);
      this.events = Array.isArray(result.calendarEvents) ? result.calendarEvents : [];
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      this.events = [];
    }
    this.rebuildIndex();
  }

  /**
   * 날짜별 이벤트 인덱스 재구성 (커밋 시점에만 호출)
   */
  rebuildIndex() {
    this.eventsByDate = new Map();
    this.events.forEach((event) => {
      const bucket = this.eventsByDate.get(event.date);
      if (bucket) {
        bucket.push(event);
      } else {
        this.eventsByDate.set(event.date, [event]);
      }
    });
  }

  /**
   * 이벤트 영속화 — 스냅샷 기반 상태 머신
   *
   * 성공해야만 메모리/인덱스/DOM을 커밋한다. 실패 시 아무것도 건드리지 않으므로
   * 롤백이 자동으로 성립한다. pending 중에는 새 편집을 차단해 재시도가 엉뚱한
   * 스냅샷을 커밋하는 것을 막는다.
   *
   * @param {CalendarEvent[]} nextEvents - 새 배열 (기존 배열 in-place 변형 금지)
   * @returns {Promise<boolean>} 커밋 성공 여부
   */
  async persistEvents(nextEvents) {
    if (this.pending) return false;

    const opToken = ++this.opSeq;
    this.pending = { nextEvents, opToken };
    this.setPendingState(true);

    try {
      await chrome.storage.local.set({ calendarEvents: nextEvents });
      if (opToken !== this.opSeq) return false;

      this.events = nextEvents;
      this.rebuildIndex();
      this.pending = null;
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
  }

  /**
   * 오류 배너 숨김
   */
  hideError() {
    if (!this.errorElement) return;
    this.errorElement.hidden = true;
  }

  /**
   * 할 일 추가
   * @param {string} dateKey
   * @param {string} title
   */
  async addEvent(dateKey, title) {
    const trimmed = title.trim().slice(0, MAX_TITLE_LENGTH);
    if (!trimmed) return;

    const nextEvents = this.events.concat({
      id: crypto.randomUUID(),
      date: dateKey,
      title: trimmed,
      done: false,
      createdAt: Date.now(),
      source: 'local',
      externalId: null,
    });
    await this.persistEvents(nextEvents);
  }

  /**
   * 할 일 완료 토글
   * @param {string} id
   */
  async toggleEvent(id) {
    const nextEvents = this.events.map((event) => (event.id === id ? { ...event, done: !event.done } : event));
    await this.persistEvents(nextEvents);
  }

  /**
   * 할 일 삭제
   * @param {string} id
   */
  async deleteEvent(id) {
    const nextEvents = this.events.filter((event) => event.id !== id);
    await this.persistEvents(nextEvents);
  }

  /**
   * 전체 이벤트 교체 (가져오기)
   * @param {CalendarEvent[]} nextEvents
   * @returns {Promise<boolean>}
   */
  async replaceEvents(nextEvents) {
    return this.persistEvents(nextEvents);
  }

  /**
   * 현재 이벤트 목록 반환 (내보내기용)
   * @returns {CalendarEvent[]}
   */
  getEvents() {
    return this.events;
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
      });
    }

    // 할 일 추가 폼
    if (this.todoFormElement) {
      this.todoFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!(this.todoInputElement instanceof HTMLInputElement) || !this.selectedKey) return;
        const value = this.todoInputElement.value;
        this.todoInputElement.value = '';
        await this.addEvent(this.selectedKey, value);
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
      this.errorRetryButton.addEventListener('click', () => this.retryPersist());
    }

    // Esc로 패널 닫기
    this.root.addEventListener('keydown', (e) => {
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

    // 다른 달로 넘어가면 뷰를 따라 이동
    if (current.getFullYear() !== this.viewYear || current.getMonth() !== this.viewMonth) {
      this.viewYear = current.getFullYear();
      this.viewMonth = current.getMonth();
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
   * 마감 상태 판정
   * @param {string} dateKey
   * @param {boolean} allDone - 해당 날짜 이벤트가 전부 완료인지
   * @returns {string} '' | 'overdue' | 'today' | 'soon'
   */
  getDueState(dateKey, allDone) {
    if (allDone) return '';
    if (dateKey < this.todayKey) return 'overdue';
    if (dateKey === this.todayKey) return 'today';

    const tomorrow = parseDateKey(this.todayKey);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateKey === makeDateKey(tomorrow)) return 'soon';
    return '';
  }

  /**
   * 전체 렌더링
   */
  render() {
    this.renderTitle();
    this.renderGrid();
    this.renderPanel();
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
    const dueState = this.getDueState(dateKey, dayEvents.length > 0 && pendingCount === 0);

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
    // is-due-* 는 '오늘 날짜'를 뜻하는 is-today와 별도 네임스페이스다
    if (dueState) cell.classList.add(`is-due-${dueState}`);
    cell.setAttribute('aria-selected', dateKey === this.selectedKey ? 'true' : 'false');

    const weekday = WEEKDAY_LABELS[cellDate.getDay()];
    const countLabel = dayEvents.length > 0 ? `, 할 일 ${dayEvents.length}개` : '';
    cell.setAttribute(
      'aria-label',
      `${cellDate.getMonth() + 1}월 ${cellDate.getDate()}일 ${weekday}요일${countLabel}`
    );

    const number = document.createElement('span');
    number.className = 'calendar-day-num';
    number.textContent = String(cellDate.getDate());
    cell.appendChild(number);

    if (dayEvents.length > 0) {
      cell.appendChild(this.createDots(dayEvents));
    }

    return cell;
  }

  /**
   * 이벤트 인디케이터 (dot 최대 3 + +N)
   * @param {CalendarEvent[]} dayEvents
   * @returns {HTMLElement}
   */
  createDots(dayEvents) {
    const dots = document.createElement('span');
    dots.className = 'calendar-dots';
    dots.setAttribute('aria-hidden', 'true');

    dayEvents.slice(0, 3).forEach((event) => {
      const dot = document.createElement('span');
      dot.className = event.done ? 'calendar-dot is-done' : 'calendar-dot';
      dots.appendChild(dot);
    });

    if (dayEvents.length > 3) {
      const more = document.createElement('span');
      more.className = 'calendar-dot-more';
      more.textContent = `+${dayEvents.length - 3}`;
      dots.appendChild(more);
    }

    return dots;
  }

  /**
   * 할 일 패널 렌더링
   */
  renderPanel() {
    if (!this.panelElement || !this.panelTitleElement || !this.todoListElement) return;

    if (!this.selectedKey) {
      this.panelElement.hidden = true;
      return;
    }
    this.panelElement.hidden = false;

    const selected = parseDateKey(this.selectedKey);
    const weekday = WEEKDAY_LABELS[selected.getDay()];
    this.panelTitleElement.textContent = `${selected.getMonth() + 1}월 ${selected.getDate()}일 (${weekday})`;

    this.todoListElement.textContent = '';
    const dayEvents = this.eventsByDate.get(this.selectedKey) || [];

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

    const title = document.createElement('span');
    title.className = 'calendar-todo-title';
    title.textContent = event.title;
    item.appendChild(title);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'calendar-todo-delete';
    remove.dataset.todoAction = 'delete';
    remove.setAttribute('aria-label', `${event.title} 삭제`);
    remove.textContent = '×';
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
      const result = await chrome.storage.local.get([
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
      const result = await chrome.storage.local.get(['blurEnabled', 'overlayBrightness']);

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
      await chrome.storage.local.set({ blurEnabled: enabled });
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
      await chrome.storage.local.set({ overlayBrightness: brightness });
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
      element.style.display = enabled && element === active ? 'block' : 'none';
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
      await chrome.storage.local.set({ mainWidgetEnabled: enabled });
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
      await chrome.storage.local.set({ widgetType: type });
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
      await chrome.storage.local.set({ searchEnabled: enabled });
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
      widget.classList.remove('collision-compact');

      if (this.widgetType !== 'calendar' || !this.isWidgetEnabled() || !this.isSearchEnabled()) return;

      const widgetRect = widget.getBoundingClientRect();
      const searchRect = this.searchElement.getBoundingClientRect();

      const intersects = !(
        widgetRect.right <= searchRect.left ||
        widgetRect.left >= searchRect.right ||
        widgetRect.bottom <= searchRect.top ||
        widgetRect.top >= searchRect.bottom
      );
      const outOfViewport =
        widgetRect.top < 0 ||
        widgetRect.left < 0 ||
        widgetRect.bottom > window.innerHeight ||
        widgetRect.right > window.innerWidth;

      if (intersects || outOfViewport) {
        widget.classList.add('collision-compact');
      }
    } finally {
      this.isMeasuringCollision = false;
    }
  }

  /**
   * 검색창 너비를 활성 위젯 너비에 맞춤
   */
  async matchSearchWidthToWidget() {
    const widget = this.getActiveWidgetElement();
    if (!widget || !this.searchElement) return;

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
      await chrome.storage.local.set({ searchWidthByWidget: this.searchWidthByWidget });
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
    const cached = this.searchWidthByWidget[this.widgetType];
    if (typeof cached === 'number' && cached > 0) return cached;

    if (this.widgetType !== 'clock') return null;

    try {
      const result = await chrome.storage.local.get(['searchWidth']);
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

    if (!widgetEnabled || !searchEnabled) return;
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
    if (widgetPositionSetting) {
      const widgetGrid = this.widgetPositionGrid;
      if (widgetEnabled) {
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
      await chrome.storage.local.set({
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
    await migrateSettingsToV2();

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
