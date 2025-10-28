// @ts-check
'use strict';

/**
 * 파일 위치: /my-newtab-extension/newtab.js
 * 파일명: newtab.js
 * 용도: New Tab 페이지의 동적 기능 구현
 * 기능: 시계 업데이트, 검색, 즐겨찾기 관리, 시간대별 배경 이미지 변경
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

    // 시간 표시
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    this.timeElement.textContent = `${hours}:${minutes}:${seconds}`;

    // 날짜 표시
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
 * 책임: 랜덤 배경 이미지 로드 및 표시 (로컬 이미지 + 사용자 업로드 이미지)
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
  }

  /**
   * 배경 이미지 초기화
   */
  async initialize() {
    await this.loadUploadedImages();
    await this.loadRandomBackground();
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
   * 랜덤 배경 이미지 로드 (로컬 이미지 + 업로드 이미지)
   */
  async loadRandomBackground() {
    try {
      const allImages = await this.getAllImages();

      if (allImages.length === 0) {
        console.warn('No images available');
        this.setFallbackBackground();
        return;
      }

      // 랜덤 이미지 선택
      const randomImage = allImages[Math.floor(Math.random() * allImages.length)];
      this.backgroundElement.style.backgroundImage = `url('${randomImage}')`;
    } catch (error) {
      console.error('Failed to load background image:', error);
      this.setFallbackBackground();
    }
  }

  /**
   * 모든 이미지 목록 가져오기 (로컬 + 업로드)
   * @returns {Promise<string[]>}
   */
  async getAllImages() {
    const localImages = this.getLocalImageList();
    return [...this.uploadedImages, ...localImages];
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
 * 책임: 즐겨찾기 CRUD 작업 및 로컬 저장소 관리
 */
class BookmarkManager {
  /**
   * @param {HTMLElement} bookmarksList - 즐겨찾기 목록 요소
   * @param {HTMLElement} addBtn - 추가 버튼 요소
   * @param {HTMLElement} modal - 모달 요소
   */
  constructor(bookmarksList, addBtn, modal) {
    this.bookmarksList = bookmarksList;
    this.addBtn = addBtn;
    this.modal = modal;
    /** @type {Array<{name: string, url: string}>} */
    this.bookmarks = [];
  }

  /**
   * 즐겨찾기 기능 초기화
   */
  async initialize() {
    await this.loadBookmarks();
    this.renderBookmarks();
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
   * @returns {Array<{name: string, url: string}>}
   */
  getDefaultBookmarks() {
    return [
      { name: 'Google', url: 'https://www.google.com' },
      { name: 'YouTube', url: 'https://www.youtube.com' },
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
   * 즐겨찾기 렌더링
   */
  renderBookmarks() {
    this.bookmarksList.innerHTML = '';

    this.bookmarks.forEach((bookmark, index) => {
      const item = this.createBookmarkElement(bookmark, index);
      this.bookmarksList.appendChild(item);
    });
  }

  /**
   * 즐겨찾기 요소 생성
   * @param {{name: string, url: string}} bookmark - 즐겨찾기 데이터
   * @param {number} index - 인덱스
   * @returns {HTMLElement}
   */
  createBookmarkElement(bookmark, index) {
    const item = document.createElement('a');
    item.className = 'bookmark-item';
    item.href = bookmark.url;
    item.target = '_blank';

    const icon = document.createElement('img');
    icon.className = 'bookmark-icon';
    icon.src = `https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=32`;
    icon.alt = bookmark.name;
    icon.onerror = () => {
      icon.src =
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>';
    };

    const name = document.createElement('span');
    name.className = 'bookmark-name';
    name.textContent = bookmark.name;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'bookmark-delete';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = (e) => {
      e.preventDefault();
      this.deleteBookmark(index);
    };

    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(deleteBtn);

    return item;
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
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

    this.bookmarks.push({ name, url });
    await this.saveBookmarks();
    this.renderBookmarks();
    this.closeModal();
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
    }
  }
}

/**
 * 이미지 관리 클래스
 * 책임: 이미지 업로드, 삭제, 렌더링 관리
 */
class ImageManager {
  /**
   * @param {HTMLElement} modal - 이미지 관리 모달
   * @param {HTMLElement} manageBtn - 이미지 관리 버튼
   * @param {BackgroundManager} backgroundManager - 배경 관리자
   */
  constructor(modal, manageBtn, backgroundManager) {
    this.modal = modal;
    this.manageBtn = manageBtn;
    this.backgroundManager = backgroundManager;
    this.uploadArea = null;
    this.imageUpload = null;
    this.imagesGrid = null;
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
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
    // 이미지 관리 버튼
    this.manageBtn.addEventListener('click', () => this.openModal());

    // 닫기 버튼
    const closeBtn = document.getElementById('closeImagesBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    // 모달 배경 클릭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
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
   * 모달 열기
   */
  openModal() {
    this.modal.classList.add('active');
    this.renderImages();
  }

  /**
   * 모달 닫기
   */
  closeModal() {
    this.modal.classList.remove('active');
  }

  /**
   * 파일 선택 처리
   * @param {Event} event
   */
  handleFileSelect(event) {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.files) {
      this.handleFiles(Array.from(target.files));
      target.value = ''; // 같은 파일 재선택 가능하도록
    }
  }

  /**
   * 파일 처리
   * @param {File[]} files
   */
  async handleFiles(files) {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    for (const file of imageFiles) {
      // 파일 크기 체크
      if (file.size > this.maxFileSize) {
        alert(`${file.name}은(는) 너무 큽니다. 5MB 이하의 이미지만 업로드 가능합니다.`);
        continue;
      }

      try {
        const imageData = await this.readFileAsDataURL(file);
        await this.backgroundManager.addImage(imageData);
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert(`${file.name} 업로드에 실패했습니다.`);
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

    const info = document.createElement('div');
    info.className = 'image-info';

    const size = document.createElement('div');
    size.className = 'image-size';
    size.textContent = this.formatFileSize(imageData.length);

    info.appendChild(size);
    item.appendChild(img);
    item.appendChild(deleteBtn);
    item.appendChild(info);

    // 이미지 클릭 시 미리보기
    item.onclick = () => {
      this.backgroundManager.backgroundElement.style.backgroundImage = `url('${imageData}')`;
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

  /**
   * 파일 크기 포맷팅
   * @param {number} bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
  }

  /**
   * 애플리케이션 초기화
   */
  initialize() {
    // DOM 요소 가져오기
    const timeElement = document.getElementById('time');
    const dateElement = document.getElementById('date');
    const backgroundElement = document.getElementById('backgroundLayer');
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const bookmarksList = document.getElementById('bookmarksList');
    const addBookmarkBtn = document.getElementById('addBookmarkBtn');
    const bookmarkModal = document.getElementById('addBookmarkModal');
    const manageImagesBtn = document.getElementById('manageImagesBtn');
    const imagesModal = document.getElementById('manageImagesModal');

    // 요소 검증
    if (
      !timeElement ||
      !dateElement ||
      !backgroundElement ||
      !(searchForm instanceof HTMLFormElement) ||
      !(searchInput instanceof HTMLInputElement) ||
      !bookmarksList ||
      !addBookmarkBtn ||
      !bookmarkModal ||
      !manageImagesBtn ||
      !imagesModal
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

    this.bookmarkManager = new BookmarkManager(bookmarksList, addBookmarkBtn, bookmarkModal);
    this.bookmarkManager.initialize();

    this.imageManager = new ImageManager(imagesModal, manageImagesBtn, this.backgroundManager);
    this.imageManager.initialize();
  }
}

// DOM 로드 완료 후 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  app.initialize();
});
