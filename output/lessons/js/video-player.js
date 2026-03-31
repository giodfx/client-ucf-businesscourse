/**
 * VideoPlayer - Scene-based video player with audio narration
 *
 * Features:
 * - Scene-based slideshow with images and audio narration
 * - Ken Burns zoom animation on images
 * - Full controls: play/pause, prev/next, volume, CC toggle, fullscreen
 * - Caption/subtitle support
 * - Preview thumbnail before playing
 * - Proper pause/resume with scene timing tracking
 * - Template-based slide layouts
 *
 * Usage:
 *   new VideoPlayer('container', {
 *     scenes: LESSON_VIDEO_DATA['video-1-1-intro'],
 *     title: 'Your Mission Continues',
 *     basePath: '../',
 *     showPreview: true
 *   });
 */
class VideoPlayer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`VideoPlayer: Container #${containerId} not found`);
      return;
    }

    this.videoId = options.videoId;
    this.title = options.title || 'Video';
    this.autoplay = options.autoplay || false;
    this.onComplete = options.onComplete || null;
    this.basePath = options.basePath ?? '../';
    this.inlineScenes = options.scenes || null;
    this.showPreview = options.showPreview ?? true;

    this.scenes = [];
    this.currentSceneIndex = 0;
    this.isPlaying = false;
    this.audio = null;
    this.volume = 1;
    this.isMuted = false;
    this.showCaptions = false;
    this.isFullscreen = false;
    this.hasStarted = false;

    // Scene timing tracking for proper pause/resume
    this.sceneTimer = null;
    this.progressInterval = null;
    this.sceneStartTime = 0;
    this.sceneElapsed = 0;

    // CourseTracker integration
    this._viewedScenes = new Set();
    this._watchTimeInterval = null;
    this._containerNum = this._detectContainerNum();

    this.init();
  }

  _detectContainerNum() {
    var el = document.querySelector('[data-container]') || document.querySelector('[data-week]');
    if (el) return parseInt(el.dataset.container || el.dataset.week, 10) || 1;
    var match = window.location.pathname.match(/lesson-(\d+)-/);
    if (match) return parseInt(match[1], 10);
    return 1;
  }

  _trackScene(index) {
    if (!window.CourseTracker || typeof window.CourseTracker.recordVideoScene !== 'function') return;
    if (!this._viewedScenes.has(index)) {
      this._viewedScenes.add(index);
      window.CourseTracker.recordVideoScene(this._containerNum, index, this.scenes.length);
    }
  }

  _startWatchTimeTracking() {
    this._stopWatchTimeTracking();
    if (!window.CourseTracker || typeof window.CourseTracker.recordVideoTime !== 'function') return;
    var self = this;
    this._watchTimeInterval = setInterval(function() {
      if (self.isPlaying) {
        window.CourseTracker.recordVideoTime(self._containerNum, 30);
      }
    }, 30000);
  }

  _stopWatchTimeTracking() {
    if (this._watchTimeInterval) {
      clearInterval(this._watchTimeInterval);
      this._watchTimeInterval = null;
    }
  }

  async init() {
    this.render();

    if (this.inlineScenes) {
      this.scenes = this.inlineScenes;
      this.totalDuration = this.scenes.reduce((sum, s) => sum + (s.duration || 10), 0);
      this.hideLoading();

      if (this.showPreview && !this.autoplay) {
        this.showPreviewThumbnail();
      } else {
        this.loadScene(0);
        if (this.autoplay) {
          setTimeout(() => this.play(), 500);
        }
      }
    } else if (this.videoId) {
      await this.loadVideoData();
    } else {
      this.showError('No video data provided');
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="video-player">
        <div class="video-player__display">
          <div class="video-player__loading">Loading...</div>
        </div>

        <div class="video-player__caption-overlay hidden">
          <p class="video-player__caption-text"></p>
        </div>

        <div class="video-player__controls">
          <div class="video-player__controls-row">
            <div class="video-player__progress">
              <div class="video-player__progress-bar">
                <div class="video-player__progress-fill"></div>
              </div>
            </div>
          </div>

          <div class="video-player__controls-row">
            <button class="video-player__btn video-player__btn--play" title="Play/Pause">
              <svg class="icon-play" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg class="icon-pause" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="display: none;">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>

            <button class="video-player__btn video-player__btn--prev" title="Previous">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <button class="video-player__btn video-player__btn--next" title="Next">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>

            <span class="video-player__time">0:00 / 0:00</span>

            <span class="video-player__scene-counter">1 / 1</span>

            <div class="video-player__volume-control">
              <button class="video-player__btn video-player__btn--volume" title="Volume">
                <svg class="icon-volume-on" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                <svg class="icon-volume-off" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display: none;">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              </button>
              <input type="range" class="video-player__volume-slider" min="0" max="1" step="0.1" value="1">
            </div>

            <button class="video-player__btn video-player__btn--cc" title="Captions">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>
              </svg>
            </button>

            <button class="video-player__btn video-player__btn--fullscreen" title="Fullscreen">
              <svg class="icon-fullscreen" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
              <svg class="icon-fullscreen-exit" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display: none;">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              </svg>
            </button>

            <button class="video-player__btn video-player__btn--info" title="Image Description (Accessibility)">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="video-player__info-panel hidden">
          <div class="video-player__info-label">IMAGE DESCRIPTION</div>
          <p class="video-player__info-text"></p>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const playBtn = this.container.querySelector('.video-player__btn--play');
    const prevBtn = this.container.querySelector('.video-player__btn--prev');
    const nextBtn = this.container.querySelector('.video-player__btn--next');
    const progressBar = this.container.querySelector('.video-player__progress-bar');
    const volumeBtn = this.container.querySelector('.video-player__btn--volume');
    const volumeSlider = this.container.querySelector('.video-player__volume-slider');
    const ccBtn = this.container.querySelector('.video-player__btn--cc');
    const fullscreenBtn = this.container.querySelector('.video-player__btn--fullscreen');
    const display = this.container.querySelector('.video-player__display');

    const infoBtn = this.container.querySelector('.video-player__btn--info');

    playBtn?.addEventListener('click', () => this.togglePlay());
    prevBtn?.addEventListener('click', () => this.prevScene());
    nextBtn?.addEventListener('click', () => this.nextScene());
    progressBar?.addEventListener('click', (e) => this.seekToPosition(e));
    volumeBtn?.addEventListener('click', () => this.toggleMute());
    volumeSlider?.addEventListener('input', (e) => this.setVolume(e.target.value));
    ccBtn?.addEventListener('click', () => this.toggleCaptions());
    fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
    infoBtn?.addEventListener('click', () => this.toggleInfoPanel());
    display?.addEventListener('click', () => this.handleDisplayClick());

    // Keyboard shortcuts
    this.container.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Fullscreen change event
    document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
  }

  handleDisplayClick() {
    if (!this.hasStarted) {
      this.startPlayback();
    } else {
      this.togglePlay();
    }
  }

  handleKeydown(e) {
    switch(e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'ArrowLeft':
        this.prevScene();
        break;
      case 'ArrowRight':
        this.nextScene();
        break;
      case 'm':
        this.toggleMute();
        break;
      case 'c':
        this.toggleCaptions();
        break;
      case 'f':
        this.toggleFullscreen();
        break;
    }
  }

  async loadVideoData() {
    try {
      const jsonPath = this.basePath + 'videos/video-data.json';
      const response = await fetch(jsonPath);
      const data = await response.json();

      const video = data.videos.find(v => v.videoId === this.videoId);
      if (!video) {
        this.showError(`Video "${this.videoId}" not found`);
        return;
      }

      this.scenes = video.scenes;
      this.title = video.title;
      this.totalDuration = video.totalDuration;

      this.hideLoading();

      if (this.showPreview && !this.autoplay) {
        this.showPreviewThumbnail();
      } else {
        this.loadScene(0);
        if (this.autoplay) {
          setTimeout(() => this.play(), 500);
        }
      }
    } catch (error) {
      console.error('VideoPlayer: Failed to load video data', error);
      this.showError('Failed to load video');
    }
  }

  showPreviewThumbnail() {
    if (this.scenes.length === 0) return;

    const scene = this.scenes[0];
    const imageSrc = this.basePath + scene.imageUrl;
    const display = this.container.querySelector('.video-player__display');

    display.innerHTML = `
      <img src="${imageSrc}" alt="${scene.visualDescription || ''}" class="video-player__image video-player__image--preview">
      <div class="video-player__preview-overlay">
        <button class="video-player__big-play" aria-label="Play video">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
        <div class="video-player__preview-title">${this.title}</div>
        <div class="video-player__preview-duration">${this.formatTime(this.totalDuration)}</div>
      </div>
    `;

    const bigPlayBtn = display.querySelector('.video-player__big-play');
    bigPlayBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startPlayback();
    });

    // Update scene counter
    const counter = this.container.querySelector('.video-player__scene-counter');
    if (counter) counter.textContent = `1 / ${this.scenes.length}`;
  }

  startPlayback() {
    this.hasStarted = true;
    this.sceneElapsed = 0;
    this.loadScene(0);
    this.play();
  }

  /**
   * Calculate progressive reveal times for bullet items.
   * Distributes bullets evenly across the scene duration with a start delay
   * and end buffer so the heading appears first and last bullet has time to read.
   *
   * If scene.bulletTimings is provided (array of seconds), uses those instead.
   */
  _calcBulletTimings(scene) {
    const bullets = scene.bullets || [];
    if (bullets.length === 0) return [];

    // Use explicit timings if provided by the scene data
    if (scene.bulletTimings && scene.bulletTimings.length === bullets.length) {
      return scene.bulletTimings;
    }

    const duration = scene.duration || 10;
    const n = bullets.length;
    const startDelay = Math.min(5, duration * 0.30);  // 30% of scene for intro context
    const endBuffer = Math.max(1.5, duration * 0.10);  // last bullet gets time to be read
    const window = duration - startDelay - endBuffer;

    if (n === 1) return [startDelay];

    return bullets.map((_, i) => {
      return parseFloat((startDelay + (i / (n - 1)) * window).toFixed(1));
    });
  }

  /**
   * Render bullet list with progressive reveal data-at attributes
   */
  _renderBullets(bullets, timings, listClass = 'split-bullets') {
    if (bullets.length === 0) return '';
    return `
      <ul class="${listClass}">
        ${bullets.map((b, i) => `<li class="bullet-reveal" data-at="${timings[i]}">${b}</li>`).join('')}
      </ul>
    `;
  }

  /**
   * Render stat items with progressive reveal
   */
  _renderStats(bullets, timings) {
    if (bullets.length === 0) return '';
    return `
      <div class="stats-items">
        ${bullets.map((b, i) => `<div class="stat-item stat-reveal" data-at="${timings[i]}"><span class="stat-icon">✓</span>${b}</div>`).join('')}
      </div>
    `;
  }

  renderTemplate(scene) {
    const template = scene.templateName || scene.template || 'default';
    const heading = scene.heading || '';
    const bullets = scene.bullets || [];
    const timings = this._calcBulletTimings(scene);
    const headingAt = Math.min(0.5, (scene.duration || 10) * 0.05).toFixed(1);

    switch (template) {
      case 'intro':
        return `
          <div class="slide-template template-intro">
            <div class="intro-content">
              <h1 class="intro-title">${heading}</h1>
              <div class="intro-accent"></div>
            </div>
          </div>
        `;

      case 'quote':
      case 'quote-floating':
        return `
          <div class="slide-template template-quote">
            <div class="quote-card">
              <div class="quote-mark">"</div>
              <blockquote class="quote-text">${heading}</blockquote>
              <div class="quote-mark quote-mark-end">"</div>
            </div>
          </div>
        `;

      case 'split-left':
        return `
          <div class="slide-template template-split-left">
            <div class="split-image"></div>
            <div class="split-content">
              <h2 class="split-heading heading-reveal" data-at="${headingAt}">${heading}</h2>
              ${this._renderBullets(bullets, timings)}
            </div>
          </div>
        `;

      case 'split-right':
        return `
          <div class="slide-template template-split-right">
            <div class="split-content">
              <h2 class="split-heading heading-reveal" data-at="${headingAt}">${heading}</h2>
              ${this._renderBullets(bullets, timings)}
            </div>
            <div class="split-image"></div>
          </div>
        `;

      case 'stats':
        return `
          <div class="slide-template template-stats">
            <div class="stats-card">
              <h2 class="stats-heading heading-reveal" data-at="${headingAt}">${heading}</h2>
              ${this._renderStats(bullets, timings)}
            </div>
          </div>
        `;

      case 'diagonal':
      case 'diagonal-badge':
        return `
          <div class="slide-template template-badge">
            <div class="badge-diagonal"></div>
            <div class="badge-content">
              <h2 class="badge-heading">${heading}</h2>
              ${template === 'diagonal-badge' ? '<div class="badge-arrow">→</div>' : ''}
            </div>
          </div>
        `;

      default:
        return `
          <div class="slide-template template-default">
            <div class="slide-content">
              <h2>${heading}</h2>
              ${bullets.length > 0 ? `
                <ul class="slide-bullets">
                  ${bullets.map((b, i) => `<li class="bullet-reveal" data-at="${timings[i]}">${b}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          </div>
        `;
    }
  }

  loadScene(index, preserveElapsed = false) {
    if (index < 0 || index >= this.scenes.length) return;

    this.currentSceneIndex = index;
    // Only reset elapsed time if not preserving (e.g., when seeking to a specific position)
    if (!preserveElapsed) {
      this.sceneElapsed = 0;
    }
    const scene = this.scenes[index];
    const display = this.container.querySelector('.video-player__display');

    // Use templateHTML if available (rich Tailwind templates), otherwise fall back to renderTemplate
    if (scene.templateHTML) {
      // Use the pre-rendered rich template with Tailwind classes
      // Fix image paths by prepending basePath
      let html = scene.templateHTML;
      html = html.replace(/src="videos\//g, `src="${this.basePath}videos/`);
      html = html.replace(/src='videos\//g, `src='${this.basePath}videos/`);
      // Add 'active' class to video-slide for visibility
      html = html.replace(/class="([^"]*video-slide[^"]*)"/g, 'class="$1 active"');
      display.innerHTML = html;
    } else {
      // Fall back to simple template rendering
      const imageSrc = this.basePath + scene.imageUrl;
      display.innerHTML = `
        <div class="video-slide active" style="background-image: url('${imageSrc}'); background-size: cover; background-position: center; position: absolute; inset: 0;">
          ${this.renderTemplate(scene)}
        </div>
      `;
    }

    // Track scene view
    this._trackScene(index);

    // Update caption
    const captionText = this.container.querySelector('.video-player__caption-text');
    if (captionText) captionText.textContent = scene.narration;

    // Update scene counter
    const counter = this.container.querySelector('.video-player__scene-counter');
    if (counter) counter.textContent = `${index + 1} / ${this.scenes.length}`;

    // Update time display
    this.updateTimeDisplay();

    // Update info panel if visible
    if (this.showInfoPanel) {
      this.updateInfoPanel();
    }

    // Load audio
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }

    const audioSrc = this.basePath + scene.audioUrl;
    this.audio = new Audio(audioSrc);
    this.audio.volume = this.isMuted ? 0 : this.volume;

    // Audio ended event - advance to next scene
    this.audio.addEventListener('ended', () => {
      if (this.currentSceneIndex < this.scenes.length - 1) {
        // Small buffer for smooth transition
        setTimeout(() => {
          if (this.isPlaying) {
            this.loadScene(this.currentSceneIndex + 1);
            this.play();
          }
        }, 500);
      } else {
        // Last scene ended
        this.isPlaying = false;
        this.updatePlayButton();
        if (this.onComplete) {
          this.onComplete();
        }
      }
    });
  }

  play() {
    if (!this.audio || this.scenes.length === 0) return;

    this.isPlaying = true;
    this.hasStarted = true;  // Mark as started when play is called
    this.sceneStartTime = Date.now() - (this.sceneElapsed * 1000);

    this.audio.play().catch(err => {
      console.warn('Autoplay blocked:', err);
      this.isPlaying = false;
      this.updatePlayButton();
    });

    this.updatePlayButton();
    this.startProgressUpdater();
    this._startWatchTimeTracking();

    // Add Ken Burns effect to current image
    const slide = this.container.querySelector('.video-slide');
    if (slide) slide.style.animation = 'kenburns 20s ease-in-out forwards';
  }

  pause() {
    if (!this.audio) return;

    this.isPlaying = false;
    this.sceneElapsed = (Date.now() - this.sceneStartTime) / 1000;
    this.audio.pause();
    this.updatePlayButton();
    this.stopProgressUpdater();
    this._stopWatchTimeTracking();

    // Pause Ken Burns effect
    const slide = this.container.querySelector('.video-slide');
    if (slide) slide.style.animationPlayState = 'paused';
  }

  togglePlay() {
    if (!this.hasStarted) {
      this.startPlayback();
    } else if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  startProgressUpdater() {
    this.stopProgressUpdater();
    this.progressInterval = setInterval(() => {
      if (this.isPlaying) {
        this.sceneElapsed = (Date.now() - this.sceneStartTime) / 1000;
        this.updateProgress();
        this._updateBulletReveals();
      }
    }, 100);
  }

  /**
   * Toggle .revealed class on bullet-reveal / stat-reveal / heading-reveal elements
   * based on sceneElapsed vs their data-at attribute (scene-relative seconds).
   */
  _updateBulletReveals() {
    const items = this.container.querySelectorAll('[data-at]');
    for (let i = 0; i < items.length; i++) {
      const at = parseFloat(items[i].getAttribute('data-at'));
      items[i].classList.toggle('revealed', this.sceneElapsed >= at);
    }
  }

  stopProgressUpdater() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  nextScene() {
    if (this.currentSceneIndex < this.scenes.length - 1) {
      this.loadScene(this.currentSceneIndex + 1);
      if (this.isPlaying) {
        this.play();
      }
    }
  }

  prevScene() {
    if (this.currentSceneIndex > 0) {
      this.loadScene(this.currentSceneIndex - 1);
      if (this.isPlaying) {
        this.play();
      }
    }
  }

  // Volume controls
  setVolume(value) {
    this.volume = parseFloat(value);
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
    this.updateVolumeIcon();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
    this.updateVolumeIcon();
  }

  updateVolumeIcon() {
    const volumeOn = this.container.querySelector('.icon-volume-on');
    const volumeOff = this.container.querySelector('.icon-volume-off');

    if (this.isMuted || this.volume === 0) {
      volumeOn.style.display = 'none';
      volumeOff.style.display = 'block';
    } else {
      volumeOn.style.display = 'block';
      volumeOff.style.display = 'none';
    }
  }

  // Captions
  toggleCaptions() {
    this.showCaptions = !this.showCaptions;
    const captionOverlay = this.container.querySelector('.video-player__caption-overlay');
    const ccBtn = this.container.querySelector('.video-player__btn--cc');

    if (this.showCaptions) {
      captionOverlay?.classList.remove('hidden');
      ccBtn?.classList.add('active');
    } else {
      captionOverlay?.classList.add('hidden');
      ccBtn?.classList.remove('active');
    }
  }

  // Info Panel (Accessibility - Image Description)
  toggleInfoPanel() {
    this.showInfoPanel = !this.showInfoPanel;
    const infoPanel = this.container.querySelector('.video-player__info-panel');
    const infoBtn = this.container.querySelector('.video-player__btn--info');

    if (this.showInfoPanel) {
      infoPanel?.classList.remove('hidden');
      infoBtn?.classList.add('active');
      this.updateInfoPanel();
    } else {
      infoPanel?.classList.add('hidden');
      infoBtn?.classList.remove('active');
    }
  }

  updateInfoPanel() {
    const infoText = this.container.querySelector('.video-player__info-text');
    const scene = this.scenes[this.currentSceneIndex];
    if (infoText && scene) {
      infoText.textContent = scene.visualDescription || 'No image description available.';
    }
  }

  // Fullscreen
  toggleFullscreen() {
    const player = this.container.querySelector('.video-player');

    if (!document.fullscreenElement) {
      player?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
    const fullscreenIcon = this.container.querySelector('.icon-fullscreen');
    const exitIcon = this.container.querySelector('.icon-fullscreen-exit');

    if (this.isFullscreen) {
      fullscreenIcon.style.display = 'none';
      exitIcon.style.display = 'block';
    } else {
      fullscreenIcon.style.display = 'block';
      exitIcon.style.display = 'none';
    }
  }

  updateProgress() {
    const progressFill = this.container.querySelector('.video-player__progress-fill');

    // Calculate total progress across all scenes
    const totalDuration = this.scenes.reduce((sum, s) => sum + (s.duration || 10), 0);

    let currentTime = 0;
    for (let i = 0; i < this.currentSceneIndex; i++) {
      currentTime += this.scenes[i].duration || 10;
    }
    currentTime += Math.min(this.sceneElapsed, this.scenes[this.currentSceneIndex]?.duration || 10);

    const percent = (currentTime / totalDuration) * 100;
    if (progressFill) progressFill.style.width = `${percent}%`;

    // Update time display
    const timeDisplay = this.container.querySelector('.video-player__time');
    if (timeDisplay) {
      timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(totalDuration)}`;
    }
  }

  seekToPosition(e) {
    const progressBar = this.container.querySelector('.video-player__progress-bar');
    if (!progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const totalDuration = this.scenes.reduce((sum, s) => sum + (s.duration || 10), 0);
    const targetTime = percent * totalDuration;

    // Find which scene and position
    let cumulative = 0;
    for (let i = 0; i < this.scenes.length; i++) {
      const sceneDuration = this.scenes[i].duration || 10;
      if (cumulative + sceneDuration > targetTime) {
        const wasPlaying = this.isPlaying;
        this.loadScene(i);
        this.sceneElapsed = targetTime - cumulative;

        // Immediately update bullet reveals for the seek position
        this._updateBulletReveals();

        if (wasPlaying) {
          this.play();
          // Seek audio to appropriate position
          if (this.audio && this.audio.duration) {
            this.audio.currentTime = this.sceneElapsed;
          }
        }
        break;
      }
      cumulative += sceneDuration;
    }
  }

  updateTimeDisplay() {
    const totalDuration = this.scenes.reduce((sum, s) => sum + (s.duration || 10), 0);

    let currentTime = 0;
    for (let i = 0; i < this.currentSceneIndex; i++) {
      currentTime += this.scenes[i].duration || 10;
    }

    const timeDisplay = this.container.querySelector('.video-player__time');
    if (timeDisplay) {
      timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(totalDuration)}`;
    }
  }

  updatePlayButton() {
    const playIcon = this.container.querySelector('.icon-play');
    const pauseIcon = this.container.querySelector('.icon-pause');

    if (this.isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  hideLoading() {
    const loading = this.container.querySelector('.video-player__loading');
    if (loading) loading.style.display = 'none';
  }

  showError(message) {
    const display = this.container.querySelector('.video-player__display');
    display.innerHTML = `
      <div class="video-player__error">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p>${message}</p>
      </div>
    `;
  }

  destroy() {
    this.pause();
    this.stopProgressUpdater();
    this._stopWatchTimeTracking();
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.container.innerHTML = '';
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoPlayer;
}

// ============================================================================
// AUTO-INIT: Inline .video-player-section controls
// Handles templates where scenes + controls are pre-rendered in HTML
// (e.g., generate-diplomado-html.ts output)
// ============================================================================
(function() {
  'use strict';

  document.querySelectorAll('.video-player-section').forEach(function(section) {
    var scenes = Array.from(section.querySelectorAll('.video-scene'));
    if (scenes.length === 0) return;

    var currentIndex = 0;
    var isPlaying = false;
    var currentAudio = null;
    var volume = 1;
    var isMuted = false;

    // Controls
    var playBtn = section.querySelector('.video-play-pause');
    var prevBtn = section.querySelector('.video-prev');
    var nextBtn = section.querySelector('.video-next');
    var progressFill = section.querySelector('.progress-fill');
    var progressText = section.querySelector('.progress-text');
    var volumeBtn = section.querySelector('.video-volume-btn');
    var volumeSlider = section.querySelector('.video-volume-slider');
    var ccBtn = section.querySelector('.video-cc');
    var fullscreenBtn = section.querySelector('.video-fullscreen');
    var captionEl = section.querySelector('.video-caption');
    var captionText = section.querySelector('.video-caption-text');

    function showScene(index) {
      if (index < 0 || index >= scenes.length) return;
      if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
      scenes.forEach(function(s) { s.classList.remove('active'); });
      scenes[index].classList.add('active');
      currentIndex = index;

      if (progressText) progressText.textContent = 'Scene ' + (index + 1) + ' of ' + scenes.length;
      if (progressFill) progressFill.style.width = ((index + 1) / scenes.length * 100) + '%';
      if (prevBtn) prevBtn.disabled = (index === 0);
      if (nextBtn) nextBtn.disabled = (index === scenes.length - 1);

      currentAudio = scenes[index].querySelector('.scene-audio');
      if (captionText && scenes[index].dataset.script) {
        captionText.textContent = scenes[index].dataset.script;
      }

      if (isPlaying && currentAudio) {
        currentAudio.volume = isMuted ? 0 : volume;
        currentAudio.play().catch(function() {});
      }
    }

    function play() {
      if (!currentAudio) return;
      isPlaying = true;
      currentAudio.volume = isMuted ? 0 : volume;
      currentAudio.play().catch(function() { isPlaying = false; updatePlayIcon(); });
      updatePlayIcon();
    }

    function pause() {
      isPlaying = false;
      if (currentAudio) currentAudio.pause();
      updatePlayIcon();
    }

    function updatePlayIcon() {
      if (!playBtn) return;
      var iconPlay = playBtn.querySelector('.icon-play');
      var iconPause = playBtn.querySelector('.icon-pause');
      if (isPlaying) {
        if (iconPlay) iconPlay.style.display = 'none';
        if (iconPause) iconPause.style.display = 'block';
      } else {
        if (iconPlay) iconPlay.style.display = 'block';
        if (iconPause) iconPause.style.display = 'none';
      }
    }

    // Auto-advance when audio ends
    scenes.forEach(function(scene, idx) {
      var audio = scene.querySelector('.scene-audio');
      if (!audio) return;
      audio.addEventListener('ended', function() {
        if (isPlaying && idx < scenes.length - 1) {
          setTimeout(function() { showScene(idx + 1); }, 500);
        } else if (idx === scenes.length - 1) {
          isPlaying = false;
          updatePlayIcon();
        }
      });
    });

    // Button handlers
    if (playBtn) playBtn.addEventListener('click', function() { if (isPlaying) pause(); else play(); });
    if (prevBtn) prevBtn.addEventListener('click', function() { showScene(currentIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { showScene(currentIndex + 1); });

    // Volume
    if (volumeBtn) {
      volumeBtn.addEventListener('click', function() {
        isMuted = !isMuted;
        if (currentAudio) currentAudio.volume = isMuted ? 0 : volume;
        var iconOn = volumeBtn.querySelector('.icon-volume-on');
        var iconOff = volumeBtn.querySelector('.icon-volume-off');
        if (isMuted) { if (iconOn) iconOn.style.display = 'none'; if (iconOff) iconOff.style.display = 'block'; }
        else { if (iconOn) iconOn.style.display = 'block'; if (iconOff) iconOff.style.display = 'none'; }
      });
    }
    if (volumeSlider) {
      volumeSlider.addEventListener('input', function() {
        volume = parseFloat(this.value);
        if (currentAudio) currentAudio.volume = isMuted ? 0 : volume;
      });
    }

    // Captions toggle
    if (ccBtn) {
      var showCaptions = false;
      ccBtn.addEventListener('click', function() {
        showCaptions = !showCaptions;
        if (captionEl) captionEl.classList.toggle('hidden', !showCaptions);
        ccBtn.classList.toggle('active', showCaptions);
      });
    }

    // Fullscreen
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', function() {
        var container = section.querySelector('.video-container') || section;
        if (!document.fullscreenElement) { container.requestFullscreen && container.requestFullscreen(); }
        else { document.exitFullscreen && document.exitFullscreen(); }
      });
      document.addEventListener('fullscreenchange', function() {
        var iconFs = fullscreenBtn.querySelector('.icon-fullscreen');
        var iconExit = fullscreenBtn.querySelector('.icon-fullscreen-exit');
        if (document.fullscreenElement) { if (iconFs) iconFs.style.display = 'none'; if (iconExit) iconExit.style.display = 'block'; }
        else { if (iconFs) iconFs.style.display = 'block'; if (iconExit) iconExit.style.display = 'none'; }
      });
    }

    // Click on video display area to play/pause
    var scenesContainer = section.querySelector('.video-scenes');
    if (scenesContainer) {
      scenesContainer.addEventListener('click', function() { if (isPlaying) pause(); else play(); });
    }

    // Initialize first scene
    showScene(0);
  });
})();
