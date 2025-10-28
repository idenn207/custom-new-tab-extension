// @ts-check
'use strict';

/**
 * 파일 위치: /my-newtab-extension/newtab.js
 * 파일명: newtab.js
 * 용도: New Tab 페이지의 동적 기능 구현
 * 기능: 시계, 검색, 즐겨찾기(고정 기능 포함), 이미지 관리, 설정
 * 책임: UI 상호작용 및 비즈니스 로직 처리 (단일 책임 원칙 준수)
 */

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
 * 설정 관리 클래스
 * 책임: 설정 UI 및 설정 저장/로드 (blur, overlay opacity)
 */
class SettingsManager {
  /**
   * @param {HTMLElement} modal - 설정 모달
   * @param {HTMLElement} toggleBtn - 토글 버튼
   * @param {BackgroundManager} backgroundManager - 배경 관리자
   */
  constructor(modal, toggleBtn, backgroundManager) {
    this.modal = modal;
    this.toggleBtn = toggleBtn;
    this.backgroundManager = backgroundManager;
    this.randomToggle = null;
    this.clockToggle = null;
    this.searchToggle = null;
    this.blurToggle = null;
    this.opacitySlider = null;
    this.overlayElement = null;
    this.clockElement = null;
    this.searchElement = null;
    this.clockPositionGrid = null;
    this.searchPositionGrid = null;
    this.clockPosition = 'center-center';
    this.searchPosition = 'center-center';
  }

  /**
   * 설정 기능 초기화
   */
  initialize() {
    this.randomToggle = document.getElementById('randomImageToggle');
    this.clockToggle = document.getElementById('clockToggle');
    this.searchToggle = document.getElementById('searchToggle');
    this.blurToggle = document.getElementById('blurToggle');
    this.opacitySlider = document.getElementById('opacitySlider');
    this.overlayElement = document.querySelector('.overlay');
    this.clockElement = document.getElementById('clock');
    this.searchElement = document.querySelector('.search-container');
    this.clockPositionGrid = document.getElementById('clockPositionGrid');
    this.searchPositionGrid = document.getElementById('searchPositionGrid');

    if (
      !this.randomToggle ||
      !this.clockToggle ||
      !this.searchToggle ||
      !this.blurToggle ||
      !this.opacitySlider ||
      !this.overlayElement ||
      !this.clockElement ||
      !this.searchElement ||
      !this.clockPositionGrid ||
      !this.searchPositionGrid
    ) {
      console.error('Settings elements not found');
      return;
    }

    this.setupEventListeners();
    this.loadSettings();
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

    // 시계 토글
    if (this.clockToggle instanceof HTMLInputElement) {
      this.clockToggle.addEventListener('change', () => this.handleClockToggle());
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

    // 시계 위치 그리드
    if (this.clockPositionGrid) {
      this.clockPositionGrid.addEventListener('click', (e) => {
        const target = e.target;
        if (target instanceof HTMLElement && target.classList.contains('position-cell')) {
          const position = target.dataset.position;
          if (position) {
            this.handleClockPositionChange(position);
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
      const result = await chrome.storage.local.get(['clockEnabled', 'searchEnabled', 'clockPosition', 'searchPosition']);
      const clockEnabled = result.clockEnabled !== false; // 기본값 true
      const searchEnabled = result.searchEnabled !== false; // 기본값 true
      this.clockPosition = result.clockPosition || 'center-center';
      this.searchPosition = result.searchPosition || 'center-center';

      if (this.clockToggle instanceof HTMLInputElement) {
        this.clockToggle.checked = clockEnabled;
      }

      if (this.searchToggle instanceof HTMLInputElement) {
        this.searchToggle.checked = searchEnabled;
      }

      this.applyClockSetting(clockEnabled);
      this.applySearchSetting(searchEnabled);
      this.applyClockPosition(this.clockPosition);
      this.applySearchPosition(this.searchPosition);
      this.updatePositionGrids();
      this.updatePositionSettingsVisibility();

      // 초기 로드 시 즉시 오프셋 적용
      this.applyInitialOverlap(clockEnabled, searchEnabled);
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
   * 시계 토글 처리
   */
  async handleClockToggle() {
    if (this.clockToggle instanceof HTMLInputElement) {
      this.enableTransitions();
      const clockEnabled = this.clockToggle.checked;
      await this.saveClockSetting(clockEnabled);
      this.applyClockSetting(clockEnabled);
      this.updatePositionSettingsVisibility();

      // requestAnimationFrame으로 렌더링 후 겹침 확인
      requestAnimationFrame(() => {
        this.checkOverlap();
      });
    }
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

      // requestAnimationFrame으로 렌더링 후 겹침 확인
      requestAnimationFrame(() => {
        this.checkOverlap();
      });
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
   * 시계 설정 적용
   * @param {boolean} enabled
   */
  applyClockSetting(enabled) {
    if (this.clockElement) {
      if (enabled) {
        this.clockElement.style.display = 'block';
      } else {
        this.clockElement.style.display = 'none';
      }
    }
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
   * 시계 설정 저장
   * @param {boolean} enabled
   */
  async saveClockSetting(enabled) {
    try {
      await chrome.storage.local.set({ clockEnabled: enabled });
    } catch (error) {
      console.error('Failed to save clock setting:', error);
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
   * 시계 위치 변경 처리
   * @param {string} position
   */
  async handleClockPositionChange(position) {
    this.enableTransitions();
    this.clockPosition = position;
    await this.savePositionSettings();
    this.applyClockPosition(position);
    this.updatePositionGrids();

    // requestAnimationFrame으로 렌더링 후 겹침 확인
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.checkOverlap();
      });
    });
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

    // requestAnimationFrame으로 렌더링 후 겹침 확인
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.checkOverlap();
      });
    });
  }

  /**
   * 시계 위치 적용
   * @param {string} position
   */
  applyClockPosition(position) {
    if (this.clockElement) {
      // 인라인 스타일 초기화 (애니메이션을 위해)
      this.clockElement.style.top = '';
      this.clockElement.style.bottom = '';
      this.clockElement.style.left = '';
      this.clockElement.style.right = '';

      // transition 클래스 유지 여부 확인
      const hasTransition = this.clockElement.classList.contains('enable-transition');

      // 모든 위치 클래스 제거
      this.clockElement.className = 'clock';

      // transition 클래스 복원
      if (hasTransition) {
        this.clockElement.classList.add('enable-transition');
      }

      // 새 위치 클래스 추가
      this.clockElement.classList.add(`position-${position}`);
    }
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

      // transition 클래스 유지 여부 확인
      const hasTransition = this.searchElement.classList.contains('enable-transition');

      // 모든 위치 클래스 제거
      this.searchElement.className = 'search-container';

      // transition 클래스 복원
      if (hasTransition) {
        this.searchElement.classList.add('enable-transition');
      }

      // 새 위치 클래스 추가
      this.searchElement.classList.add(`position-${position}`);
    }

    // 고정 즐겨찾기 숨김 처리 (비활성화)
    // this.updatePinnedBookmarksVisibility(position);
  }

  /**
   * 위치 그리드 업데이트
   */
  updatePositionGrids() {
    // 시계 위치 그리드
    if (this.clockPositionGrid) {
      const cells = this.clockPositionGrid.querySelectorAll('.position-cell');
      cells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          if (cell.dataset.position === this.clockPosition) {
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
   * 겹침 확인 및 조정
   */
  async checkOverlap() {
    if (!this.clockElement || !this.searchElement) return;

    const clockEnabled = this.clockToggle instanceof HTMLInputElement ? this.clockToggle.checked : true;
    const searchEnabled = this.searchToggle instanceof HTMLInputElement ? this.searchToggle.checked : true;

    // 둘 다 비활성화면 오프셋 제거
    if (!clockEnabled && !searchEnabled) {
      this.clockElement.classList.remove('overlap-offset');
      this.searchElement.classList.remove('overlap-offset');
      this.searchElement.style.width = '';
      return;
    }

    // 시계만 활성화
    if (clockEnabled && !searchEnabled) {
      this.clockElement.classList.remove('overlap-offset');
      this.searchElement.classList.remove('overlap-offset');
      this.searchElement.style.width = '';
      return;
    }

    // 검색창만 활성화
    if (!clockEnabled && searchEnabled) {
      this.clockElement.classList.remove('overlap-offset');
      this.searchElement.classList.remove('overlap-offset');
      this.searchElement.style.width = '';
      return;
    }

    // 둘 다 활성화된 경우 겹침 검사
    const isSamePosition = this.clockPosition === this.searchPosition;

    // 같은 위치일 때 오프셋 적용
    if (isSamePosition) {
      this.clockElement.classList.add('overlap-offset');
      this.searchElement.classList.add('overlap-offset');

      // 시계 너비를 계산하여 검색창 너비 설정 및 저장
      await this.matchSearchWidthToClock();

      // 왼쪽/오른쪽 정렬 적용
      this.applyAlignment();
    } else {
      this.clockElement.classList.remove('overlap-offset');
      this.searchElement.classList.remove('overlap-offset');
      this.searchElement.style.width = '';
      this.searchElement.style.textAlign = '';
    }
  }

  /**
   * 검색창 너비를 시계 너비에 맞춤
   */
  async matchSearchWidthToClock() {
    if (!this.clockElement || !this.searchElement) return;

    // 시계의 실제 너비 계산
    const clockWidth = this.clockElement.offsetWidth;

    if (clockWidth > 0) {
      // 검색창의 패딩을 고려하여 너비 설정
      this.searchElement.style.width = `${clockWidth}px`;
      this.searchElement.style.maxWidth = `${clockWidth}px`;

      // 계산된 너비 저장
      await this.saveSearchWidth(clockWidth);
    }
  }

  /**
   * 검색창 너비 저장
   * @param {number} width
   */
  async saveSearchWidth(width) {
    try {
      await chrome.storage.local.set({ searchWidth: width });
    } catch (error) {
      console.error('Failed to save search width:', error);
    }
  }

  /**
   * 검색창 너비 불러오기
   * @returns {Promise<number|null>}
   */
  async loadSearchWidth() {
    try {
      const result = await chrome.storage.local.get(['searchWidth']);
      return result.searchWidth || null;
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
   * @param {boolean} clockEnabled
   * @param {boolean} searchEnabled
   */
  async applyInitialOverlap(clockEnabled, searchEnabled) {
    if (!this.clockElement || !this.searchElement) return;

    // 둘 다 비활성화면 오프셋 제거
    if (!clockEnabled || !searchEnabled) {
      return;
    }

    // 같은 위치인지 확인
    const isSamePosition = this.clockPosition === this.searchPosition;

    if (isSamePosition) {
      // 즉시 오프셋 클래스 적용
      this.clockElement.classList.add('overlap-offset');
      this.searchElement.classList.add('overlap-offset');

      // 정렬 적용
      this.applyAlignment();

      // 저장된 너비 불러오기
      const savedWidth = await this.loadSearchWidth();

      if (savedWidth) {
        // 저장된 너비가 있으면 즉시 적용
        this.searchElement.style.width = `${savedWidth}px`;
        this.searchElement.style.maxWidth = `${savedWidth}px`;
      }

      // requestAnimationFrame으로 렌더링 후 실제 너비 재계산 및 저장
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.matchSearchWidthToClock();
        });
      });
    }
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
    const clockPositionSetting = document.getElementById('clockPositionSetting');
    const searchPositionSetting = document.getElementById('searchPositionSetting');

    const clockEnabled = this.clockToggle instanceof HTMLInputElement ? this.clockToggle.checked : true;
    const searchEnabled = this.searchToggle instanceof HTMLInputElement ? this.searchToggle.checked : true;

    // 시계 위치 설정 표시/숨김
    if (clockPositionSetting) {
      const clockGrid = this.clockPositionGrid;
      if (clockEnabled) {
        clockPositionSetting.style.display = 'flex';
        if (clockGrid) clockGrid.style.display = 'grid';
      } else {
        clockPositionSetting.style.display = 'none';
        if (clockGrid) clockGrid.style.display = 'none';
      }
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
      await chrome.storage.local.set({
        clockPosition: this.clockPosition,
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
    // 애니메이션 클래스가 없으면 추가
    if (this.clockElement && !this.clockElement.classList.contains('enable-transition')) {
      this.clockElement.classList.add('enable-transition');
    }
    if (this.searchElement && !this.searchElement.classList.contains('enable-transition')) {
      this.searchElement.classList.add('enable-transition');
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
    this.settingsManager = null;
  }

  /**
   * 애플리케이션 초기화
   */
  initialize() {
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

    // 요소 검증
    if (
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

    this.settingsManager = new SettingsManager(settingsModal, settingsToggle, this.backgroundManager);
    this.settingsManager.initialize();
  }
}

// DOM 로드 완료 후 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  app.initialize();
});
