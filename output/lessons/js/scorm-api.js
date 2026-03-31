/**
 * SCORM API Wrapper (1.2 + 2004 Auto-Detect)
 * Course Factory - Enhanced Version
 *
 * Provides a robust interface for SCORM communication with graceful
 * fallback to localStorage when running outside an LMS.
 * Auto-detects SCORM version (2004 vs 1.2) and uses correct API methods.
 *
 * Features:
 * - Auto-initialization on page load
 * - SCORM 2004 and 1.2 auto-detection
 * - localStorage fallback for standalone testing
 * - Error handling with detailed logging
 * - Visibility API support for mobile/tab switching
 * - Auto-commit on page unload
 */
(function(window) {
  'use strict';

  // ============================================================================
  // PRIVATE VARIABLES
  // ============================================================================

  var API = null;
  var initialized = false;
  var standalone = false;
  var scormVersion = null; // '2004' or '1.2', detected at init
  var debug = (window.location.search.indexOf('scorm_debug=1') !== -1); // Enable via ?scorm_debug=1
  var isUnloading = false; // Set true during page dismissal
  var isInIframe = (window !== window.top); // True when running inside an iframe (e.g., DLCS mode)

  // ============================================================================
  // PRIVATE FUNCTIONS
  // ============================================================================

  function log(message, data) {
    if (debug) {
      console.log('[SCORM]', message, data || '');
    }
  }

  function logError(message, data) {
    console.error('[SCORM Error]', message, data || '');
  }

  /**
   * Find the SCORM API in the window hierarchy
   * Searches up through parent frames (LMS typically provides API in parent)
   * Checks for SCORM 2004 API first, then falls back to SCORM 1.2
   */
  function findAPI(win) {
    var attempts = 0;
    var maxAttempts = 500; // Prevent infinite loops

    while (win && attempts < maxAttempts) {
      // Check for SCORM 2004 API first
      if (win.API_1484_11) {
        log('Found SCORM 2004 API');
        scormVersion = '2004';
        return win.API_1484_11;
      }

      // Check for SCORM 1.2 API
      if (win.API) {
        log('Found SCORM 1.2 API');
        scormVersion = '1.2';
        return win.API;
      }

      // Stop if we've reached the top
      if (win.parent === win) {
        break;
      }

      win = win.parent;
      attempts++;
    }

    // Also check opener window (for popup scenarios)
    if (window.opener && window.opener !== window) {
      var openerAPI = findAPI(window.opener);
      if (openerAPI) return openerAPI;
    }

    return null;
  }

  /**
   * Call an API method, using the correct name for the detected SCORM version
   */
  function apiCall(method2004, method12, param) {
    if (!API) return '';
    try {
      if (scormVersion === '2004') {
        return API[method2004](param);
      }
      return API[method12](param);
    } catch (e) {
      return '';
    }
  }

  /**
   * Get the last error from the LMS
   */
  function getLastError() {
    if (!API) return 0;
    try {
      var err = scormVersion === '2004'
        ? API.GetLastError()
        : API.LMSGetLastError();
      return parseInt(err, 10);
    } catch (e) {
      return 0;
    }
  }

  /**
   * Get error description from LMS
   */
  function getErrorString(errorCode) {
    if (!API) return '';
    try {
      return scormVersion === '2004'
        ? API.GetErrorString(errorCode)
        : API.LMSGetErrorString(errorCode);
    } catch (e) {
      return '';
    }
  }

  // ============================================================================
  // STORAGE FALLBACK (for standalone mode)
  // ============================================================================

  var storage = {
    prefix: 'cf_course_',

    get: function(key) {
      try {
        return localStorage.getItem(this.prefix + key) || '';
      } catch (e) {
        return '';
      }
    },

    set: function(key, value) {
      try {
        localStorage.setItem(this.prefix + key, String(value));
        return true;
      } catch (e) {
        return false;
      }
    },

    clear: function() {
      try {
        var keys = Object.keys(localStorage);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf(this.prefix) === 0) {
            localStorage.removeItem(keys[i]);
          }
        }
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  var SCORM = {
    version: '3.0.0',

    /**
     * Initialize SCORM communication
     * @returns {boolean} True if initialization successful
     */
    init: function() {
      if (initialized && !standalone) {
        log('Already initialized with LMS');
        return true;
      }

      API = findAPI(window);

      if (!API) {
        if (!initialized) {
          log('No LMS API found - starting in standalone mode');
          standalone = true;
          initialized = true;
          // In an iframe, the parent may set up the API asynchronously.
          // Poll for it for up to 15 seconds.
          if (isInIframe) {
            this._startRetry();
          }
        }
        return true;
      }

      // Check if the API is already initialized by reading its internal state.
      // In an iframe, the parent's scorm-again instance persists across lesson
      // navigations and may already be initialized from a previous page.
      // Reading .currentState is a direct property access — no API method call,
      // so scorm-again won't log any errors.
      //   currentState: 0 = not initialized, 1 = initialized, 2 = terminated
      if (API.currentState === 1 || (typeof API.isInitialized === 'function' && API.isInitialized())) {
        log('API already initialized — reusing existing session');
        var wasStandalonePre = standalone;
        initialized = true;
        standalone = false;
        this._stopRetry();
        if (wasStandalonePre) {
          this._migrateFromStorage();
        }
        return true;
      }

      try {
        var result = scormVersion === '2004'
          ? API.Initialize('')
          : API.LMSInitialize('');

        if (result === 'true' || result === true) {
          var wasStandalone = standalone;
          initialized = true;
          standalone = false;
          log('LMS Initialize successful (SCORM ' + scormVersion + ')');
          this._stopRetry();

          // Set initial status if not already set
          var statusElement = scormVersion === '2004'
            ? 'cmi.completion_status'
            : 'cmi.core.lesson_status';
          var currentStatus = this.getValue(statusElement);
          if (!currentStatus || currentStatus === 'not attempted' || currentStatus === 'unknown') {
            this.setValue(statusElement, 'incomplete');
          }

          // Migrate localStorage data to LMS if we were previously standalone
          if (wasStandalone) {
            this._migrateFromStorage();
          }

          this.commit();
          return true;
        } else {
          var error = getLastError();
          // SCORM 2004 error 103 = "Already Initialized"
          // SCORM 2004 error 104 = "Content Instance Terminated" (after Terminate)
          // SCORM 1.2 error 101 = "Already Initialized"
          // These happen in single-SCO packages when navigating between pages.
          var canReuse = (scormVersion === '2004' && (error === 103 || error === 104)) ||
                         (scormVersion === '1.2' && error === 101);

          if (canReuse) {
            log('Session reuse — Initialize returned error ' + error + ', testing API...');
            // Verify the API is actually responsive before trusting it
            var apiWorks = false;
            try {
              var testGet = scormVersion === '2004'
                ? API.GetValue('cmi.completion_status')
                : API.LMSGetValue('cmi.core.lesson_status');
              var testErr = parseInt(scormVersion === '2004'
                ? API.GetLastError() : API.LMSGetLastError(), 10);
              apiWorks = (testErr === 0 || testErr === 403); // 0=no error, 403=not initialized (but value returned)
              log('API test: value=' + testGet + ', error=' + testErr + ', usable=' + apiWorks);
            } catch (e) {
              log('API test threw exception:', e);
            }

            if (apiWorks) {
              log('Reusing active LMS connection (error ' + error + ')');
              initialized = true;
              standalone = false;
              return true;
            }
          }

          // Last resort: API found but Initialize failed — try to use it anyway
          // Some LMSes return false from Initialize but still accept SetValue
          if (!canReuse) {
            log('Initialize failed with unexpected error ' + error + ', testing API as fallback...');
            try {
              var fallbackTest = scormVersion === '2004'
                ? API.GetValue('cmi.learner_name')
                : API.LMSGetValue('cmi.core.student_name');
              var fallbackErr = parseInt(scormVersion === '2004'
                ? API.GetLastError() : API.LMSGetLastError(), 10);
              if (fallbackErr === 0 && fallbackTest) {
                log('API responds despite Initialize failure — using LMS connection');
                initialized = true;
                standalone = false;
                return true;
              }
            } catch (e) {}
          }

          logError('LMS Initialize failed — falling back to standalone', { error: error, message: getErrorString(error) });
          standalone = true;
          initialized = true;
          return true; // Still return true to allow course to function
        }
      } catch (e) {
        logError('Exception during LMS Initialize', e);
        standalone = true;
        initialized = true;
        return true;
      }
    },

    /**
     * Check if running in standalone mode (no LMS)
     * @returns {boolean}
     */
    isStandalone: function() {
      return standalone;
    },

    /**
     * Check if initialized
     * @returns {boolean}
     */
    isInitialized: function() {
      return initialized;
    },

    /**
     * Get the detected SCORM version
     * @returns {string} '2004', '1.2', or 'standalone'
     */
    getVersion: function() {
      return scormVersion || 'standalone';
    },

    /**
     * Enable/disable debug logging. Call SCORM.setDebug(true) from browser console.
     */
    setDebug: function(enabled) {
      debug = !!enabled;
      if (debug) {
        console.log('[SCORM] Debug enabled — standalone=' + standalone + ', version=' + scormVersion + ', initialized=' + initialized);
      }
    },

    /**
     * Get a value from the LMS
     * @param {string} element - SCORM data model element
     * @returns {string}
     */
    getValue: function(element) {
      if (!initialized) {
        log('Not initialized, cannot getValue');
        return '';
      }

      if (standalone) {
        return storage.get(element);
      }

      try {
        var value = scormVersion === '2004'
          ? API.GetValue(element)
          : API.LMSGetValue(element);
        var error = getLastError();
        if (error !== 0) {
          log('GetValue error for ' + element, { error: error, message: getErrorString(error) });
        }
        return value || '';
      } catch (e) {
        logError('Exception in getValue', e);
        return '';
      }
    },

    /**
     * Set a value in the LMS
     * @param {string} element - SCORM data model element
     * @param {string} value - Value to set
     * @returns {boolean}
     */
    setValue: function(element, value) {
      if (!initialized) {
        log('Not initialized, cannot setValue');
        return false;
      }

      if (standalone) {
        return storage.set(element, value);
      }

      try {
        var result = scormVersion === '2004'
          ? API.SetValue(element, String(value))
          : API.LMSSetValue(element, String(value));
        if (result !== 'true' && result !== true) {
          var error = getLastError();
          log('SetValue failed for ' + element, { error: error, message: getErrorString(error) });
          return false;
        }
        log('SetValue success', { element: element, value: value });
        return true;
      } catch (e) {
        logError('Exception in setValue', e);
        return false;
      }
    },

    /**
     * Commit data to LMS
     * @returns {boolean}
     */
    commit: function() {
      if (!initialized || standalone) {
        return true; // No commit needed in standalone
      }

      // In an iframe during page dismissal, skip the commit — it uses sync XHR
      // which Chrome blocks ("Synchronous XHR in page dismissal"). The parent
      // handles final persistence via navigator.sendBeacon().
      if (isUnloading && isInIframe) {
        log('Skipping commit during page unload (parent handles via sendBeacon)');
        return true;
      }

      try {
        var result = scormVersion === '2004'
          ? API.Commit('')
          : API.LMSCommit('');
        if (result !== 'true' && result !== true) {
          var error = getLastError();
          log('Commit failed', { error: error, message: getErrorString(error) });
          return false;
        }
        log('Commit successful');
        return true;
      } catch (e) {
        logError('Exception in commit', e);
        return false;
      }
    },

    /**
     * Terminate SCORM session
     * @returns {boolean}
     */
    finish: function() {
      if (!initialized) {
        return true;
      }

      if (standalone) {
        initialized = false;
        return true;
      }

      try {
        // Commit any pending data first
        this.commit();

        var result = scormVersion === '2004'
          ? API.Terminate('')
          : API.LMSFinish('');
        initialized = false;

        if (result !== 'true' && result !== true) {
          var error = getLastError();
          log('Finish/Terminate failed', { error: error, message: getErrorString(error) });
          return false;
        }
        log('Finish/Terminate successful');
        return true;
      } catch (e) {
        logError('Exception in finish/terminate', e);
        initialized = false;
        return false;
      }
    },

    // ========================================================================
    // CONVENIENCE METHODS
    // ========================================================================

    /**
     * Set completion/success status
     * SCORM 2004: sets cmi.completion_status and cmi.success_status separately
     * SCORM 1.2: sets cmi.core.lesson_status
     * @param {string} status - 'passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'
     */
    setStatus: function(status) {
      if (scormVersion === '2004') {
        if (status === 'passed' || status === 'failed') {
          this.setValue('cmi.success_status', status);
          this.setValue('cmi.completion_status', 'completed');
        } else if (status === 'completed' || status === 'incomplete' || status === 'not attempted') {
          this.setValue('cmi.completion_status', status);
        }
      } else {
        var validStatuses = ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'];
        if (validStatuses.indexOf(status) === -1) {
          logError('Invalid status', status);
          return false;
        }
        this.setValue('cmi.core.lesson_status', status);
      }
      this.commit();
      return true;
    },

    /**
     * Get current status
     * @returns {string}
     */
    getStatus: function() {
      if (scormVersion === '2004') {
        return this.getValue('cmi.completion_status');
      }
      return this.getValue('cmi.core.lesson_status');
    },

    /**
     * Set score (0-100)
     * SCORM 2004: also sets cmi.score.scaled (0-1)
     * @param {number} score - Score value (0-100)
     * @param {number} [min=0] - Minimum possible score
     * @param {number} [max=100] - Maximum possible score
     */
    setScore: function(score, min, max) {
      min = min || 0;
      max = max || 100;

      if (scormVersion === '2004') {
        this.setValue('cmi.score.raw', score);
        this.setValue('cmi.score.min', min);
        this.setValue('cmi.score.max', max);
        var scaled = (max - min) > 0 ? (score - min) / (max - min) : 0;
        this.setValue('cmi.score.scaled', scaled.toFixed(4));
      } else {
        this.setValue('cmi.core.score.raw', score);
        this.setValue('cmi.core.score.min', min);
        this.setValue('cmi.core.score.max', max);
      }
      this.commit();

      log('Score set', { raw: score, min: min, max: max });
      return true;
    },

    /**
     * Get current score
     * @returns {object} { raw, min, max }
     */
    getScore: function() {
      if (scormVersion === '2004') {
        return {
          raw: parseFloat(this.getValue('cmi.score.raw')) || 0,
          min: parseFloat(this.getValue('cmi.score.min')) || 0,
          max: parseFloat(this.getValue('cmi.score.max')) || 100,
          scaled: parseFloat(this.getValue('cmi.score.scaled')) || 0
        };
      }
      return {
        raw: parseFloat(this.getValue('cmi.core.score.raw')) || 0,
        min: parseFloat(this.getValue('cmi.core.score.min')) || 0,
        max: parseFloat(this.getValue('cmi.core.score.max')) || 100
      };
    },

    /**
     * Set bookmark/location
     * @param {string} location - Location string
     */
    setLocation: function(location) {
      var element = scormVersion === '2004' ? 'cmi.location' : 'cmi.core.lesson_location';
      return this.setValue(element, location);
    },

    /**
     * Get bookmark/location
     * @returns {string}
     */
    getLocation: function() {
      var element = scormVersion === '2004' ? 'cmi.location' : 'cmi.core.lesson_location';
      return this.getValue(element);
    },

    /**
     * Set suspend data (JSON serialized)
     * @param {object} data - Data object to store
     */
    setSuspendData: function(data) {
      try {
        var json = JSON.stringify(data);
        log('setSuspendData - JSON length:', json.length);

        var limit = scormVersion === '2004' ? 64000 : 4096;
        if (json.length > limit) {
          logError('Suspend data exceeds ' + limit + ' character limit', { length: json.length });
          return false;
        }
        var result = this.setValue('cmi.suspend_data', json);
        return result;
      } catch (e) {
        logError('Error serializing suspend data', e);
        return false;
      }
    },

    /**
     * Get suspend data (JSON parsed)
     * @returns {object|null}
     */
    getSuspendData: function() {
      var data = this.getValue('cmi.suspend_data');
      log('getSuspendData - raw data length:', data ? data.length : 0);

      if (!data) {
        log('getSuspendData - no data found');
        return null;
      }

      try {
        var parsed = JSON.parse(data);
        log('getSuspendData - parsed successfully');
        return parsed;
      } catch (e) {
        logError('Error parsing suspend data', e);
        return null;
      }
    },

    /**
     * Set session time
     * SCORM 2004: ISO 8601 duration (PT#H#M#S)
     * SCORM 1.2: HH:MM:SS format
     * @param {number} seconds - Time in seconds
     */
    setSessionTime: function(seconds) {
      var hours = Math.floor(seconds / 3600);
      var minutes = Math.floor((seconds % 3600) / 60);
      var secs = Math.floor(seconds % 60);

      var timeString;
      if (scormVersion === '2004') {
        // ISO 8601 duration format
        timeString = 'PT' + hours + 'H' + minutes + 'M' + secs + 'S';
      } else {
        // HHHH:MM:SS format for SCORM 1.2
        timeString =
          String(hours).padStart(2, '0') + ':' +
          String(minutes).padStart(2, '0') + ':' +
          String(secs).padStart(2, '0');
      }

      var element = scormVersion === '2004' ? 'cmi.session_time' : 'cmi.core.session_time';
      return this.setValue(element, timeString);
    },

    /**
     * Set progress measure (SCORM 2004 only)
     * @param {number} value - Progress value 0.0 to 1.0
     * @returns {boolean}
     */
    setProgressMeasure: function(value) {
      if (scormVersion === '2004') {
        return this.setValue('cmi.progress_measure', value.toFixed(4));
      }
      return true; // no-op for 1.2
    },

    /**
     * Get progress measure (SCORM 2004 only)
     * @returns {number} 0.0 to 1.0
     */
    getProgressMeasure: function() {
      if (scormVersion === '2004') {
        return parseFloat(this.getValue('cmi.progress_measure')) || 0;
      }
      return 0;
    },

    /**
     * Clear all stored data (standalone mode only)
     */
    clearData: function() {
      if (standalone) {
        return storage.clear();
      }
      return false;
    },

    /**
     * Enable debug logging
     */
    enableDebug: function() {
      debug = true;
      log('Debug mode enabled');
    },

    /**
     * Disable debug logging
     */
    disableDebug: function() {
      debug = false;
    },

    /**
     * Set storage prefix (for multi-course standalone)
     * @param {string} prefix - Storage key prefix
     */
    setStoragePrefix: function(prefix) {
      storage.prefix = prefix;
    },

    // ========================================================================
    // IFRAME / LATE-DETECTION SUPPORT
    // ========================================================================

    _retryTimer: null,
    _retryCount: 0,

    /**
     * Start polling for LMS API (called when initial detection fails in iframe).
     * The parent may set up the API asynchronously (e.g., loading scorm-again).
     */
    _startRetry: function() {
      var self = this;
      this._retryCount = 0;
      this._retryTimer = setInterval(function() {
        self._retryCount++;
        if (self._retryCount > 30) { // 30 × 500ms = 15 seconds
          self._stopRetry();
          log('LMS API retry exhausted — staying in standalone mode');
          return;
        }
        var found = findAPI(window);
        if (found) {
          log('LMS API found on retry #' + self._retryCount);
          self.init(); // Re-initialize with LMS
        }
      }, 500);
    },

    _stopRetry: function() {
      if (this._retryTimer) {
        clearInterval(this._retryTimer);
        this._retryTimer = null;
      }
    },

    /**
     * Migrate suspend_data and key fields from localStorage to LMS
     * after late API detection. Preserves progress tracked in standalone mode.
     */
    _migrateFromStorage: function() {
      try {
        var suspendData = storage.get('cmi.suspend_data');
        if (suspendData) {
          log('Migrating suspend_data from localStorage to LMS', { length: suspendData.length });
          this.setValue('cmi.suspend_data', suspendData);
        }
        var location12 = storage.get('cmi.core.lesson_location');
        var location04 = storage.get('cmi.location');
        if (location12) this.setValue('cmi.core.lesson_location', location12);
        if (location04) this.setValue('cmi.location', location04);
        var scoreRaw = storage.get('cmi.core.score.raw') || storage.get('cmi.score.raw');
        if (scoreRaw) {
          if (scormVersion === '2004') {
            this.setValue('cmi.score.raw', scoreRaw);
            this.setValue('cmi.score.min', storage.get('cmi.score.min') || '0');
            this.setValue('cmi.score.max', storage.get('cmi.score.max') || '100');
          } else {
            this.setValue('cmi.core.score.raw', scoreRaw);
            this.setValue('cmi.core.score.min', storage.get('cmi.core.score.min') || '0');
            this.setValue('cmi.core.score.max', storage.get('cmi.core.score.max') || '100');
          }
        }
        log('Migration from localStorage complete');
      } catch (e) {
        logError('Migration from localStorage failed', e);
      }
    },

    // ========================================================================
    // SCORM 2004 ADVANCED FEATURES
    // ========================================================================

    /**
     * Record a learner interaction (SCORM 2004 cmi.interactions)
     * No-op for SCORM 1.2
     * @param {object} data - Interaction data
     * @param {string} data.id - Unique interaction identifier
     * @param {string} data.type - 'choice', 'true-false', 'fill-in', 'matching', 'sequencing', etc.
     * @param {string} data.learnerResponse - The learner's response
     * @param {string} data.correctResponse - The correct response pattern
     * @param {string} data.result - 'correct', 'incorrect', 'unanticipated', 'neutral'
     * @param {string} [data.latency] - Time to respond in ISO 8601 (PT#H#M#S)
     * @param {number} [data.weighting] - Relative weight of this interaction
     * @param {string} [data.description] - Question text / description
     * @param {string} [data.objectiveId] - Linked objective ID
     */
    recordInteraction: function(data) {
      if (scormVersion !== '2004') return true; // no-op for 1.2

      var n = parseInt(this.getValue('cmi.interactions._count') || '0', 10);
      var prefix = 'cmi.interactions.' + n;

      this.setValue(prefix + '.id', data.id);
      this.setValue(prefix + '.type', data.type || 'choice');
      this.setValue(prefix + '.timestamp', new Date().toISOString());

      if (data.learnerResponse !== undefined) {
        this.setValue(prefix + '.learner_response', String(data.learnerResponse));
      }
      if (data.correctResponse !== undefined) {
        this.setValue(prefix + '.correct_responses.0.pattern', String(data.correctResponse));
      }
      if (data.result) {
        this.setValue(prefix + '.result', data.result);
      }
      if (data.latency) {
        this.setValue(prefix + '.latency', data.latency);
      }
      if (data.weighting !== undefined) {
        this.setValue(prefix + '.weighting', String(data.weighting));
      }
      if (data.description) {
        this.setValue(prefix + '.description', data.description);
      }
      if (data.objectiveId) {
        this.setValue(prefix + '.objectives.0.id', data.objectiveId);
      }

      this.commit();
      return true;
    },

    /**
     * Set a learning objective (SCORM 2004 cmi.objectives)
     * No-op for SCORM 1.2
     * @param {number} index - Objective index (0-based)
     * @param {object} data - Objective data
     * @param {string} data.id - Objective identifier
     * @param {string} [data.description] - Objective description text
     * @param {string} [data.status] - Completion status: 'completed', 'incomplete', 'not attempted'
     * @param {string} [data.successStatus] - Success status: 'passed', 'failed', 'unknown'
     * @param {number} [data.score] - Score 0-100 (will also set scaled 0-1)
     */
    setObjective: function(index, data) {
      if (scormVersion !== '2004') return true; // no-op for 1.2

      var prefix = 'cmi.objectives.' + index;
      this.setValue(prefix + '.id', data.id);

      if (data.description) {
        this.setValue(prefix + '.description', data.description);
      }
      if (data.status) {
        this.setValue(prefix + '.completion_status', data.status);
      }
      if (data.successStatus) {
        this.setValue(prefix + '.success_status', data.successStatus);
      }
      if (data.score !== undefined) {
        this.setValue(prefix + '.score.scaled', (data.score / 100).toFixed(4));
        this.setValue(prefix + '.score.raw', String(data.score));
        this.setValue(prefix + '.score.min', '0');
        this.setValue(prefix + '.score.max', '100');
      }

      return true;
    }
  };

  // ============================================================================
  // AUTO-INITIALIZATION AND CLEANUP
  // ============================================================================

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      SCORM.init();
    });
  } else {
    // DOM already ready
    SCORM.init();
  }

  // Auto-save on page unload: Commit only — do NOT Terminate.
  // In an iframe (DLCS mode), skip commit entirely — the parent handles final
  // persistence via navigator.sendBeacon(). scorm-again's LMSCommit uses sync XHR
  // which Chrome blocks during page dismissal.
  window.addEventListener('beforeunload', function() {
    isUnloading = true; // Flag checked by commit() to skip sync XHR in iframe
    if (initialized && !standalone && !isInIframe) {
      SCORM.commit();
    }
  });

  // Handle visibility change (mobile/tab switching).
  // In an iframe, skip this — the parent handles persistence via sendBeacon.
  if (!isInIframe) {
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden' && initialized) {
        SCORM.commit();
      }
    });
  }

  // Expose to global scope
  window.SCORM = SCORM;

})(window);
