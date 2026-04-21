/**
 * PodcastPlayer — Hearth Theme Multi-Character Podcast Player
 * "Keeper of the Flame" accessible audio player with transcript sync
 *
 * Features:
 * - Segment-based playback with auto-advance
 * - Clickable transcript with auto-scroll
 * - Play/pause, skip, volume, speed controls
 * - Full WCAG 2.1 AA keyboard & screen reader support
 * - Responsive design
 *
 * Usage:
 *   new PodcastPlayer('container-id', {
 *     episodeId: 'episode-1-1',
 *     title: 'A Story Before We Begin',
 *     subtitle: 'Module 1 — The Gathering Hall',
 *     audioBasePath: '../output/podcasts/episode-1-1/segments',
 *     fullAudioPath: '../output/podcasts/episode-1-1/episode-1-1-a-story-before-we-begin.wav',
 *     characters: [...],
 *     dialogue: [...]
 *   });
 */
(function () {
    'use strict';

    function PodcastPlayer(containerId, config) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('PodcastPlayer: Container not found:', containerId);
            return;
        }

        this.config = config;
        this.characters = {};
        this.segments = config.dialogue || [];
        this.currentIndex = -1;
        this.isPlaying = false;
        this.volume = 1;
        this.isMuted = false;
        this.speed = 1;
        this.audio = new Audio();
        this.segmentDurations = [];
        this.totalDuration = 0;
        this.cumulativeTimestamps = [];

        // Build character lookup
        (config.characters || []).forEach(function (c) {
            this.characters[c.id] = c;
        }.bind(this));

        this._render();
        this._bindEvents();
        this._preloadDurations();
    }

    /* ========================================================================
       RENDERING
       ======================================================================== */

    PodcastPlayer.prototype._render = function () {
        var html = '';

        // Toggle header
        html += '<button class="podcast-toggle" aria-expanded="false" aria-controls="podcast-content-' + this.config.episodeId + '" id="podcast-toggle-' + this.config.episodeId + '">';
        html += '  <span class="podcast-toggle-icon">' + this._svgMicrophone() + '</span>';
        html += '  <span class="podcast-toggle-text">';
        html += '    <span class="podcast-toggle-title">Keeper of the Flame Podcast</span>';
        html += '    <span class="podcast-toggle-subtitle">' + this._escapeHtml(this.config.subtitle || this.config.title) + '</span>';
        html += '  </span>';
        html += '  <span class="podcast-toggle-chevron">' + this._svgChevron() + '</span>';
        html += '</button>';

        // Content area
        html += '<div class="podcast-content" id="podcast-content-' + this.config.episodeId + '" role="region" aria-label="Podcast player">';

        // Controls bar
        html += this._renderControls();

        // Transcript
        html += this._renderTranscript();

        // Live region for screen readers
        html += '<div class="podcast-live-region" role="status" aria-live="polite" aria-atomic="true" id="podcast-sr-' + this.config.episodeId + '"></div>';

        html += '</div>';

        this.container.innerHTML = html;

        // Cache DOM refs
        this.els = {
            toggle: this.container.querySelector('.podcast-toggle'),
            content: this.container.querySelector('.podcast-content'),
            playBtn: this.container.querySelector('.podcast-btn--play'),
            prevBtn: this.container.querySelector('.podcast-btn--prev'),
            nextBtn: this.container.querySelector('.podcast-btn--next'),
            progressTrack: this.container.querySelector('.podcast-progress-track'),
            progressFill: this.container.querySelector('.podcast-progress-fill'),
            time: this.container.querySelector('.podcast-time'),
            volumeBtn: this.container.querySelector('.podcast-btn--volume'),
            volumeSlider: this.container.querySelector('.podcast-volume-slider'),
            speedBtn: this.container.querySelector('.podcast-speed-btn'),
            transcript: this.container.querySelector('.podcast-transcript'),
            segments: this.container.querySelectorAll('.podcast-segment'),
            liveRegion: this.container.querySelector('.podcast-live-region'),
            downloadBtn: this.container.querySelector('.podcast-btn--download')
        };
    };

    PodcastPlayer.prototype._renderControls = function () {
        var h = '';
        h += '<div class="podcast-controls">';

        // Previous
        h += '<button class="podcast-btn podcast-btn--skip podcast-btn--prev" aria-label="Previous segment" title="Previous segment">';
        h += this._svgPrev();
        h += '</button>';

        // Play/Pause
        h += '<button class="podcast-btn podcast-btn--play" aria-label="Play podcast" title="Play podcast">';
        h += this._svgPlay();
        h += '</button>';

        // Next
        h += '<button class="podcast-btn podcast-btn--skip podcast-btn--next" aria-label="Next segment" title="Next segment">';
        h += this._svgNext();
        h += '</button>';

        // Progress
        h += '<div class="podcast-progress">';
        h += '  <div class="podcast-progress-track" role="slider" aria-label="Playback progress" aria-valuemin="0" aria-valuemax="' + this.segments.length + '" aria-valuenow="0" aria-valuetext="Segment 0 of ' + this.segments.length + '" tabindex="0">';
        h += '    <div class="podcast-progress-fill"></div>';
        h += '  </div>';
        h += '  <span class="podcast-time">0:00 / --:--</span>';
        h += '</div>';

        // Volume
        h += '<div class="podcast-volume">';
        h += '  <button class="podcast-btn podcast-btn--volume" aria-label="Mute" title="Mute">';
        h += this._svgVolume();
        h += '  </button>';
        h += '  <input type="range" class="podcast-volume-slider" min="0" max="1" step="0.05" value="1" aria-label="Volume">';
        h += '</div>';

        // Speed (cycling button instead of <select> to avoid browser form styling)
        h += '<button class="podcast-btn podcast-speed-btn" aria-label="Playback speed: 1x" title="Playback speed">';
        h += '1x';
        h += '</button>';

        // Download
        if (this.config.fullAudioPath) {
            h += '<a class="podcast-btn podcast-btn--download" href="' + this._escapeHtml(this.config.fullAudioPath) + '" download aria-label="Download episode audio" title="Download episode">';
            h += this._svgDownload();
            h += '</a>';
        }

        h += '</div>';
        return h;
    };

    PodcastPlayer.prototype._renderTranscript = function () {
        var h = '<div class="podcast-transcript" role="log" aria-label="Podcast transcript" tabindex="0">';

        for (var i = 0; i < this.segments.length; i++) {
            var seg = this.segments[i];
            var char = this.characters[seg.characterId] || { id: 'unknown', name: 'Speaker' };
            var role = seg.characterId;
            var badge = char.name.charAt(0).toUpperCase();

            h += '<div class="podcast-segment" data-index="' + i + '" role="button" tabindex="0" ';
            h += 'aria-label="' + this._escapeHtml(char.name) + ': ' + this._escapeHtml(seg.text.substring(0, 60)) + '...">';

            h += '  <div class="podcast-speaker-badge podcast-speaker-badge--' + this._escapeHtml(role) + '">' + badge + '</div>';

            h += '  <div class="podcast-segment-content">';
            h += '    <span class="podcast-speaker-name podcast-speaker-name--' + this._escapeHtml(role) + '">';
            h += this._escapeHtml(char.name);
            h += '      <span class="podcast-now-playing">Now Playing</span>';
            h += '    </span>';
            h += '    <p class="podcast-segment-text">' + this._escapeHtml(seg.text) + '</p>';
            h += '  </div>';

            h += '</div>';
        }

        h += '</div>';
        return h;
    };

    /* ========================================================================
       EVENT BINDING
       ======================================================================== */

    PodcastPlayer.prototype._bindEvents = function () {
        var self = this;

        // Toggle expand/collapse
        this.els.toggle.addEventListener('click', function () {
            self._toggleExpand();
        });

        // Play/Pause
        this.els.playBtn.addEventListener('click', function () {
            self._togglePlay();
        });

        // Previous / Next
        this.els.prevBtn.addEventListener('click', function () {
            self._prevSegment();
        });

        this.els.nextBtn.addEventListener('click', function () {
            self._nextSegment();
        });

        // Progress bar click to seek
        this.els.progressTrack.addEventListener('click', function (e) {
            var rect = self.els.progressTrack.getBoundingClientRect();
            var pct = (e.clientX - rect.left) / rect.width;
            var idx = Math.floor(pct * self.segments.length);
            idx = Math.max(0, Math.min(idx, self.segments.length - 1));
            self._playSegment(idx);
        });

        // Progress bar keyboard
        this.els.progressTrack.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                self._nextSegment();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                self._prevSegment();
            }
        });

        // Volume
        if (this.els.volumeBtn) {
            this.els.volumeBtn.addEventListener('click', function () {
                self._toggleMute();
            });
        }

        if (this.els.volumeSlider) {
            this.els.volumeSlider.addEventListener('input', function () {
                self.volume = parseFloat(this.value);
                self.isMuted = self.volume === 0;
                self.audio.volume = self.volume;
                self._updateVolumeIcon();
            });
        }

        // Speed (cycling button)
        this.speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
        this.speedIndex = 2; // default 1x
        if (this.els.speedBtn) {
            this.els.speedBtn.addEventListener('click', function () {
                self.speedIndex = (self.speedIndex + 1) % self.speedOptions.length;
                self.speed = self.speedOptions[self.speedIndex];
                self.audio.playbackRate = self.speed;
                self.els.speedBtn.textContent = self.speed + 'x';
                self.els.speedBtn.setAttribute('aria-label', 'Playback speed: ' + self.speed + 'x');
            });
        }

        // Segment clicks
        this.els.segments.forEach(function (el) {
            el.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-index'), 10);
                self._playSegment(idx);
            });

            el.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    var idx = parseInt(this.getAttribute('data-index'), 10);
                    self._playSegment(idx);
                }
            });
        });

        // Audio events
        this.audio.addEventListener('ended', function () {
            self._onSegmentEnded();
        });

        this.audio.addEventListener('timeupdate', function () {
            self._onTimeUpdate();
        });

        this.audio.addEventListener('error', function () {
            console.error('PodcastPlayer: Audio error for segment', self.currentIndex);
            self._onSegmentEnded();
        });

        // Global keyboard shortcut (Space to play/pause when player focused)
        this.container.addEventListener('keydown', function (e) {
            if (e.key === ' ' && e.target === self.els.playBtn) {
                e.preventDefault();
                self._togglePlay();
            }
        });
    };

    /* ========================================================================
       PRELOAD SEGMENT DURATIONS
       ======================================================================== */

    PodcastPlayer.prototype._preloadDurations = function () {
        var self = this;
        var loaded = 0;
        var total = this.segments.length;
        this.segmentDurations = new Array(total).fill(0);
        this.cumulativeTimestamps = new Array(total).fill(0);

        // Estimate ~18 seconds per segment as fallback
        var estimatePerSegment = 18;
        this.totalDuration = total * estimatePerSegment;
        this._updateTime(0, this.totalDuration);

        // Try to get actual durations
        for (var i = 0; i < total; i++) {
            (function (idx) {
                var tempAudio = new Audio();
                tempAudio.preload = 'metadata';

                tempAudio.addEventListener('loadedmetadata', function () {
                    self.segmentDurations[idx] = tempAudio.duration;
                    loaded++;
                    if (loaded === total) {
                        self._calculateTimestamps();
                    }
                });

                tempAudio.addEventListener('error', function () {
                    self.segmentDurations[idx] = estimatePerSegment;
                    loaded++;
                    if (loaded === total) {
                        self._calculateTimestamps();
                    }
                });

                tempAudio.src = self._getSegmentUrl(idx);
            })(i);
        }
    };

    PodcastPlayer.prototype._calculateTimestamps = function () {
        var cumulative = 0;
        for (var i = 0; i < this.segmentDurations.length; i++) {
            this.cumulativeTimestamps[i] = cumulative;
            cumulative += this.segmentDurations[i];
            // Add silence between segments
            var silenceMs = (this.segments[i] && this.segments[i].silenceAfter) || 800;
            cumulative += silenceMs / 1000;
        }
        this.totalDuration = cumulative;
        this._updateTime(0, this.totalDuration);
    };

    /* ========================================================================
       PLAYBACK CONTROL
       ======================================================================== */

    PodcastPlayer.prototype._togglePlay = function () {
        if (this.isPlaying) {
            this._pause();
        } else {
            if (this.currentIndex < 0) {
                this._playSegment(0);
            } else {
                this._resume();
            }
        }
    };

    PodcastPlayer.prototype._playSegment = function (index) {
        if (index < 0 || index >= this.segments.length) return;

        this.currentIndex = index;
        this.audio.src = this._getSegmentUrl(index);
        this.audio.playbackRate = this.speed;
        this.audio.volume = this.isMuted ? 0 : this.volume;

        var self = this;
        this.audio.play().then(function () {
            self.isPlaying = true;
            self._updatePlayButton();
            self._updateActiveSegment();
            self._updateProgress();
            self._announceSegment();
        }).catch(function (err) {
            console.warn('PodcastPlayer: Play failed:', err.message);
        });
    };

    PodcastPlayer.prototype._pause = function () {
        this.audio.pause();
        this.isPlaying = false;
        this._updatePlayButton();
    };

    PodcastPlayer.prototype._resume = function () {
        var self = this;
        this.audio.play().then(function () {
            self.isPlaying = true;
            self._updatePlayButton();
        }).catch(function (err) {
            console.warn('PodcastPlayer: Resume failed:', err.message);
        });
    };

    PodcastPlayer.prototype._nextSegment = function () {
        if (this.currentIndex < this.segments.length - 1) {
            this._playSegment(this.currentIndex + 1);
        }
    };

    PodcastPlayer.prototype._prevSegment = function () {
        // If we're more than 3 seconds in, restart current segment
        if (this.audio.currentTime > 3 && this.currentIndex >= 0) {
            this._playSegment(this.currentIndex);
        } else if (this.currentIndex > 0) {
            this._playSegment(this.currentIndex - 1);
        }
    };

    PodcastPlayer.prototype._onSegmentEnded = function () {
        if (this.currentIndex < this.segments.length - 1) {
            // Add inter-segment pause
            var silenceMs = (this.segments[this.currentIndex] && this.segments[this.currentIndex].silenceAfter) || 800;
            var self = this;
            setTimeout(function () {
                if (self.isPlaying) {
                    self._playSegment(self.currentIndex + 1);
                }
            }, silenceMs / this.speed);
        } else {
            // End of podcast
            this.isPlaying = false;
            this._updatePlayButton();
            this._announce('Podcast episode complete.');
        }
    };

    PodcastPlayer.prototype._onTimeUpdate = function () {
        this._updateProgress();
    };

    /* ========================================================================
       VOLUME
       ======================================================================== */

    PodcastPlayer.prototype._toggleMute = function () {
        this.isMuted = !this.isMuted;
        this.audio.volume = this.isMuted ? 0 : this.volume;
        this._updateVolumeIcon();

        if (this.els.volumeSlider) {
            this.els.volumeSlider.value = this.isMuted ? 0 : this.volume;
        }
    };

    PodcastPlayer.prototype._updateVolumeIcon = function () {
        if (!this.els.volumeBtn) return;

        var label = this.isMuted ? 'Unmute' : 'Mute';
        this.els.volumeBtn.setAttribute('aria-label', label);
        this.els.volumeBtn.setAttribute('title', label);

        if (this.isMuted || this.volume === 0) {
            this.els.volumeBtn.innerHTML = this._svgVolumeMuted();
        } else {
            this.els.volumeBtn.innerHTML = this._svgVolume();
        }
    };

    /* ========================================================================
       UI UPDATES
       ======================================================================== */

    PodcastPlayer.prototype._toggleExpand = function () {
        var expanded = this.els.toggle.getAttribute('aria-expanded') === 'true';
        this.els.toggle.setAttribute('aria-expanded', !expanded);

        if (expanded) {
            this.els.content.classList.remove('expanded');
        } else {
            this.els.content.classList.add('expanded');
        }
    };

    PodcastPlayer.prototype._updatePlayButton = function () {
        if (this.isPlaying) {
            this.els.playBtn.innerHTML = this._svgPause();
            this.els.playBtn.setAttribute('aria-label', 'Pause podcast');
            this.els.playBtn.setAttribute('title', 'Pause podcast');
        } else {
            this.els.playBtn.innerHTML = this._svgPlay();
            this.els.playBtn.setAttribute('aria-label', 'Play podcast');
            this.els.playBtn.setAttribute('title', 'Play podcast');
        }
    };

    PodcastPlayer.prototype._updateActiveSegment = function () {
        var self = this;
        this.els.segments.forEach(function (el, idx) {
            if (idx === self.currentIndex) {
                el.classList.add('active');
                // Auto-scroll into view
                self._scrollToSegment(el);
            } else {
                el.classList.remove('active');
            }
        });
    };

    PodcastPlayer.prototype._scrollToSegment = function (el) {
        if (!this.els.transcript) return;

        var container = this.els.transcript;
        var elTop = el.offsetTop - container.offsetTop;
        var elBottom = elTop + el.offsetHeight;
        var scrollTop = container.scrollTop;
        var containerHeight = container.clientHeight;

        // If element is not visible, scroll to center it
        if (elTop < scrollTop || elBottom > scrollTop + containerHeight) {
            container.scrollTo({
                top: elTop - containerHeight / 3,
                behavior: 'smooth'
            });
        }
    };

    PodcastPlayer.prototype._updateProgress = function () {
        if (this.currentIndex < 0) return;

        // Calculate cumulative position
        var elapsed = this.cumulativeTimestamps[this.currentIndex] || 0;
        elapsed += this.audio.currentTime || 0;

        var pct = this.totalDuration > 0 ? (elapsed / this.totalDuration) * 100 : 0;
        pct = Math.min(pct, 100);

        this.els.progressFill.style.width = pct + '%';

        // Update time display
        this._updateTime(elapsed, this.totalDuration);

        // Update ARIA
        this.els.progressTrack.setAttribute('aria-valuenow', this.currentIndex + 1);
        this.els.progressTrack.setAttribute('aria-valuetext',
            'Segment ' + (this.currentIndex + 1) + ' of ' + this.segments.length +
            ', ' + this._formatTime(elapsed) + ' elapsed');
    };

    PodcastPlayer.prototype._updateTime = function (current, total) {
        if (this.els.time) {
            this.els.time.textContent = this._formatTime(current) + ' / ' + this._formatTime(total);
        }
    };

    /* ========================================================================
       ACCESSIBILITY
       ======================================================================== */

    PodcastPlayer.prototype._announceSegment = function () {
        if (this.currentIndex < 0) return;
        var seg = this.segments[this.currentIndex];
        var char = this.characters[seg.characterId] || { name: 'Speaker' };
        this._announce('Now playing: ' + char.name + '. Segment ' + (this.currentIndex + 1) + ' of ' + this.segments.length + '.');
    };

    PodcastPlayer.prototype._announce = function (text) {
        if (this.els.liveRegion) {
            this.els.liveRegion.textContent = text;
        }
    };

    /* ========================================================================
       HELPERS
       ======================================================================== */

    PodcastPlayer.prototype._getSegmentUrl = function (index) {
        var lineNum = String(index + 1).padStart(3, '0');
        var ext = (this.config.audioExt || 'mp3');
        return (this.config.audioBasePath || '') + '/line-' + lineNum + '.' + ext;
    };

    PodcastPlayer.prototype._formatTime = function (seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    };

    PodcastPlayer.prototype._escapeHtml = function (text) {
        var div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    };

    /* ========================================================================
       SVG ICONS
       ======================================================================== */

    PodcastPlayer.prototype._svgMicrophone = function () {
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>';
    };

    PodcastPlayer.prototype._svgChevron = function () {
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="6 9 12 15 18 9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    };

    PodcastPlayer.prototype._svgPlay = function () {
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"/></svg>';
    };

    PodcastPlayer.prototype._svgPause = function () {
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    };

    PodcastPlayer.prototype._svgPrev = function () {
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>';
    };

    PodcastPlayer.prototype._svgNext = function () {
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';
    };

    PodcastPlayer.prototype._svgVolume = function () {
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/></svg>';
    };

    PodcastPlayer.prototype._svgVolumeMuted = function () {
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/></svg>';
    };

    PodcastPlayer.prototype._svgDownload = function () {
        return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/></svg>';
    };

    // Export globally
    window.PodcastPlayer = PodcastPlayer;
})();
