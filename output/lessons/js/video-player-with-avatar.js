/**
 * VideoPlayer with Avatar Video Background
 *
 * Enhanced version that supports:
 * - Avatar video playing in background (instead of static images)
 * - HTML overlays timed to video playback
 * - All standard video controls
 * - WYSIWYG - What you see is what you get (no burning needed!)
 *
 * Usage:
 *   new VideoPlayerWithAvatar('container', {
 *     videoUrl: 'videos/avatar-female7.mp4',
 *     overlays: [...],  // From overlay config
 *     theme: {...}       // Theme for overlay styling
 *   });
 */
class VideoPlayerWithAvatar {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`VideoPlayer: Container #${containerId} not found`);
      return;
    }

    this.videoUrl = options.videoUrl;
    this.overlays = options.overlays || [];
    this.theme = options.theme || this.getDefaultTheme();
    this.title = options.title || 'Video';
    this.autoplay = options.autoplay || false;
    this.onComplete = options.onComplete || null;

    this.video = null;
    this.isPlaying = false;
    this.volume = 1;
    this.isMuted = false;
    this.showCaptions = false;
    this.isFullscreen = false;
    this.hasStarted = false;

    // Overlay tracking
    this.overlayElements = [];
    this.activeOverlays = new Set();

    this.init();
  }

  getDefaultTheme() {
    return {
      name: 'Default',
      colors: {
        primary: '#2563eb',
        secondary: '#10b981',
        accent: '#f59e0b',
        background: '#ffffff',
        text: '#1f2937'
      },
      fonts: {
        heading: 'Inter, system-ui, sans-serif',
        body: 'Inter, system-ui, sans-serif'
      },
      borderRadius: 12,
      shadowIntensity: 0.2
    };
  }

  init() {
    this.render();
    this.createOverlays();
    this.bindEvents();

    if (this.autoplay) {
      setTimeout(() => this.play(), 500);
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="video-player-avatar">
        <div class="video-player-avatar__display">
          <video class="video-player-avatar__video" ${this.autoplay ? 'autoplay' : ''}>
            <source src="${this.videoUrl}" type="video/mp4">
          </video>

          <div class="video-player-avatar__overlays"></div>

          ${!this.autoplay ? `
            <div class="video-player-avatar__preview">
              <button class="video-player-avatar__big-play" aria-label="Play video">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
              <div class="video-player-avatar__preview-title">${this.title}</div>
            </div>
          ` : ''}
        </div>

        <div class="video-player-avatar__controls">
          <div class="video-player-avatar__progress">
            <div class="video-player-avatar__progress-bar">
              <div class="video-player-avatar__progress-fill"></div>
            </div>
          </div>

          <div class="video-player-avatar__controls-row">
            <button class="video-player-avatar__btn video-player-avatar__btn--play" title="Play/Pause">
              <svg class="icon-play" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg class="icon-pause" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="display: none;">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>

            <span class="video-player-avatar__time">0:00 / 0:00</span>

            <div class="video-player-avatar__volume-control">
              <button class="video-player-avatar__btn video-player-avatar__btn--volume" title="Volume">
                <svg class="icon-volume-on" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                <svg class="icon-volume-off" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display: none;">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              </button>
              <input type="range" class="video-player-avatar__volume-slider" min="0" max="1" step="0.1" value="1">
            </div>

            <button class="video-player-avatar__btn video-player-avatar__btn--fullscreen" title="Fullscreen">
              <svg class="icon-fullscreen" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
              <svg class="icon-fullscreen-exit" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display: none;">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>
        .video-player-avatar {
          position: relative;
          width: 100%;
          max-width: 1920px;
          margin: 0 auto;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
        }

        .video-player-avatar__display {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          background: #000;
        }

        .video-player-avatar__video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-player-avatar__overlays {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .overlay-item {
          position: absolute;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .overlay-item.active {
          opacity: 1;
        }

        .video-player-avatar__preview {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          cursor: pointer;
        }

        .video-player-avatar__big-play {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .video-player-avatar__big-play:hover {
          background: white;
          transform: scale(1.1);
        }

        .video-player-avatar__preview-title {
          margin-top: 20px;
          color: white;
          font-size: 24px;
          font-weight: 600;
        }

        .video-player-avatar__controls {
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          padding: 20px;
        }

        .video-player-avatar__progress {
          margin-bottom: 10px;
        }

        .video-player-avatar__progress-bar {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
          cursor: pointer;
          overflow: hidden;
        }

        .video-player-avatar__progress-fill {
          height: 100%;
          background: ${this.theme.colors.primary};
          width: 0%;
          transition: width 0.1s linear;
        }

        .video-player-avatar__controls-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .video-player-avatar__btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 5px;
          display: flex;
          align-items: center;
          transition: opacity 0.2s;
        }

        .video-player-avatar__btn:hover {
          opacity: 0.7;
        }

        .video-player-avatar__time {
          color: white;
          font-size: 14px;
          font-family: monospace;
        }

        .video-player-avatar__volume-control {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-left: auto;
        }

        .video-player-avatar__volume-slider {
          width: 80px;
        }

        /* Overlay styles matching overlay-renderer-browser.js */
        .overlay-title, .overlay-text {
          padding: 15px 30px;
          border-radius: ${this.theme.borderRadius}px;
          font-family: ${this.theme.fonts.heading};
          font-weight: 700;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          display: inline-block;
        }

        .overlay-statistic {
          padding: 20px 30px;
          border-radius: ${this.theme.borderRadius}px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          display: inline-block;
        }

        .overlay-statistic .stat-value {
          font-size: 48px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 5px;
        }

        .overlay-statistic .stat-label {
          font-size: 18px;
          font-weight: 500;
          opacity: 0.9;
        }
      </style>
    `;

    this.video = this.container.querySelector('.video-player-avatar__video');
  }

  createOverlays() {
    const overlaysContainer = this.container.querySelector('.video-player-avatar__overlays');

    // Load overlay-renderer-browser.js if not already loaded
    if (typeof OverlayRenderer === 'undefined') {
      console.error('OverlayRenderer not found. Make sure overlay-renderer-browser.js is loaded first.');
      return;
    }

    const renderer = new OverlayRenderer();

    this.overlays.forEach((overlay, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'overlay-item';
      wrapper.dataset.index = index;
      wrapper.dataset.start = overlay.startTime;
      wrapper.dataset.end = overlay.endTime;

      // Render overlay HTML
      const html = renderer.render(overlay);
      wrapper.innerHTML = html;

      // Apply positioning
      this.applyOverlayPosition(wrapper, overlay);

      overlaysContainer.appendChild(wrapper);
      this.overlayElements.push(wrapper);
    });
  }

  applyOverlayPosition(wrapper, overlay) {
    const pos = overlay.position;

    if (pos.x === 'center') {
      wrapper.style.left = '50%';
      wrapper.style.transform = 'translateX(-50%)';
    } else if (pos.x === 'left') {
      wrapper.style.left = '5%';
    } else if (pos.x === 'right') {
      wrapper.style.right = '5%';
    } else {
      wrapper.style.left = pos.x + 'px';
    }

    if (pos.y === 'bottom') {
      wrapper.style.bottom = '8%';
    } else if (pos.y === 'top') {
      wrapper.style.top = '5%';
    } else {
      wrapper.style.top = pos.y + 'px';
    }

    // Apply scale if present
    if (overlay.style && overlay.style.scale) {
      const transform = wrapper.style.transform || '';
      wrapper.style.transform = transform + ` scale(${overlay.style.scale})`;
    }
  }

  bindEvents() {
    const playBtn = this.container.querySelector('.video-player-avatar__btn--play');
    const volumeBtn = this.container.querySelector('.video-player-avatar__btn--volume');
    const volumeSlider = this.container.querySelector('.video-player-avatar__volume-slider');
    const fullscreenBtn = this.container.querySelector('.video-player-avatar__btn--fullscreen');
    const progressBar = this.container.querySelector('.video-player-avatar__progress-bar');
    const bigPlayBtn = this.container.querySelector('.video-player-avatar__big-play');
    const preview = this.container.querySelector('.video-player-avatar__preview');

    playBtn?.addEventListener('click', () => this.togglePlay());
    volumeBtn?.addEventListener('click', () => this.toggleMute());
    volumeSlider?.addEventListener('input', (e) => this.setVolume(e.target.value));
    fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
    progressBar?.addEventListener('click', (e) => this.seekToPosition(e));
    bigPlayBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startPlayback();
    });
    preview?.addEventListener('click', () => this.startPlayback());

    // Video events
    this.video.addEventListener('timeupdate', () => this.updateOverlays());
    this.video.addEventListener('play', () => this.onVideoPlay());
    this.video.addEventListener('pause', () => this.onVideoPause());
    this.video.addEventListener('ended', () => this.onVideoEnded());
    this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());

    // Keyboard shortcuts
    this.container.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Fullscreen change
    document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
  }

  startPlayback() {
    const preview = this.container.querySelector('.video-player-avatar__preview');
    if (preview) {
      preview.style.display = 'none';
    }
    this.hasStarted = true;
    this.play();
  }

  play() {
    this.video.play().catch(err => {
      console.warn('Autoplay blocked:', err);
    });
  }

  pause() {
    this.video.pause();
  }

  togglePlay() {
    if (!this.hasStarted) {
      this.startPlayback();
    } else if (this.video.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  onVideoPlay() {
    this.isPlaying = true;
    this.updatePlayButton();
  }

  onVideoPause() {
    this.isPlaying = false;
    this.updatePlayButton();
  }

  onVideoEnded() {
    this.isPlaying = false;
    this.updatePlayButton();
    if (this.onComplete) {
      this.onComplete();
    }
  }

  onVideoLoaded() {
    this.updateTimeDisplay();
  }

  updateOverlays() {
    const currentTime = this.video.currentTime;

    this.overlayElements.forEach((element) => {
      const start = parseFloat(element.dataset.start);
      const end = parseFloat(element.dataset.end);

      if (currentTime >= start && currentTime <= end) {
        if (!this.activeOverlays.has(element)) {
          element.classList.add('active');
          this.activeOverlays.add(element);
        }
      } else {
        if (this.activeOverlays.has(element)) {
          element.classList.remove('active');
          this.activeOverlays.delete(element);
        }
      }
    });

    this.updateProgress();
    this.updateTimeDisplay();
  }

  updateProgress() {
    const progressFill = this.container.querySelector('.video-player-avatar__progress-fill');
    if (progressFill && this.video.duration) {
      const percent = (this.video.currentTime / this.video.duration) * 100;
      progressFill.style.width = `${percent}%`;
    }
  }

  updateTimeDisplay() {
    const timeDisplay = this.container.querySelector('.video-player-avatar__time');
    if (timeDisplay && this.video.duration) {
      timeDisplay.textContent = `${this.formatTime(this.video.currentTime)} / ${this.formatTime(this.video.duration)}`;
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

  setVolume(value) {
    this.volume = parseFloat(value);
    this.video.volume = this.volume;
    this.updateVolumeIcon();
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
    this.isMuted = this.video.muted;
    this.updateVolumeIcon();
  }

  updateVolumeIcon() {
    const volumeOn = this.container.querySelector('.icon-volume-on');
    const volumeOff = this.container.querySelector('.icon-volume-off');

    if (this.video.muted || this.video.volume === 0) {
      volumeOn.style.display = 'none';
      volumeOff.style.display = 'block';
    } else {
      volumeOn.style.display = 'block';
      volumeOff.style.display = 'none';
    }
  }

  toggleFullscreen() {
    const player = this.container.querySelector('.video-player-avatar');

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

  seekToPosition(e) {
    const progressBar = this.container.querySelector('.video-player-avatar__progress-bar');
    if (!progressBar || !this.video.duration) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    this.video.currentTime = percent * this.video.duration;
  }

  handleKeydown(e) {
    switch(e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'ArrowLeft':
        this.video.currentTime = Math.max(0, this.video.currentTime - 5);
        break;
      case 'ArrowRight':
        this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 5);
        break;
      case 'm':
        this.toggleMute();
        break;
      case 'f':
        this.toggleFullscreen();
        break;
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  destroy() {
    this.pause();
    this.video = null;
    this.container.innerHTML = '';
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoPlayerWithAvatar;
}
