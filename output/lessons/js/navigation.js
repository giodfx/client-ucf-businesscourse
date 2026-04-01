/**
 * Navigation JavaScript - Shared across all course templates
 *
 * This file contains:
 * - Sidebar toggle (desktop and mobile)
 * - Module/week expand/collapse
 * - Progress tracking localStorage
 * - Theme toggle
 *
 * Include this in all generated course HTML files.
 */

(function() {
    'use strict';

    // ========================================================================
    // DESKTOP SIDEBAR TOGGLE
    // ========================================================================

    window.toggleDesktopSidebar = function() {
        const body = document.body;
        body.classList.toggle('sidebar-hidden');

        // Save preference to localStorage
        const isHidden = body.classList.contains('sidebar-hidden');
        localStorage.setItem('sidebarHidden', isHidden.toString());
    };

    // ========================================================================
    // MOBILE MENU TOGGLE
    // ========================================================================

    window.toggleMobileMenu = function() {
        const sidebar = document.querySelector('.sidebar, .lesson-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }

        // Toggle hamburger animation
        const hamburger = document.querySelector('.hamburger');
        if (hamburger) {
            hamburger.classList.toggle('active');
        }

        // Prevent body scroll when menu is open
        document.body.classList.toggle('menu-open');
    };

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        const sidebar = document.querySelector('.sidebar.active, .lesson-sidebar.active');
        const menuToggle = document.querySelector('.mobile-menu-toggle');

        if (sidebar && !sidebar.contains(e.target) && !menuToggle?.contains(e.target)) {
            sidebar.classList.remove('active');
            document.body.classList.remove('menu-open');
            const hamburger = document.querySelector('.hamburger');
            if (hamburger) {
                hamburger.classList.remove('active');
            }
        }
    });

    // ========================================================================
    // MODULE/WEEK EXPAND/COLLAPSE
    // ========================================================================

    window.toggleSidebarModule = function(moduleNum) {
        const module = document.querySelector(`[data-module="${moduleNum}"]`);
        if (!module) return;

        const lessons = document.getElementById(`nav-module-${moduleNum}`);
        const trigger = module.querySelector('.nav-module-trigger, .week-toggle');

        if (!lessons || !trigger) return;

        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            // Collapse
            lessons.style.maxHeight = '0px';
            lessons.style.opacity = '0';
            lessons.classList.remove('expanded');
            trigger.setAttribute('aria-expanded', 'false');
            module.classList.remove('active', 'expanded');
        } else {
            // Expand
            lessons.style.maxHeight = lessons.scrollHeight + 'px';
            lessons.style.opacity = '1';
            lessons.classList.add('expanded');
            trigger.setAttribute('aria-expanded', 'true');
            module.classList.add('active', 'expanded');
        }

        // Save expanded state
        saveExpandedModules();
    };

    // Toggle week (alias for module toggle)
    window.toggleWeek = function(weekNum) {
        const weekItem = document.querySelector(`.week-item[data-week="${weekNum}"]`);
        if (!weekItem) return;

        const moduleList = weekItem.querySelector('.module-list');
        if (!moduleList) return;

        const isExpanded = weekItem.classList.contains('expanded');

        if (isExpanded) {
            weekItem.classList.remove('expanded');
            moduleList.hidden = true;
        } else {
            weekItem.classList.add('expanded');
            moduleList.hidden = false;
        }
    };

    // ========================================================================
    // EXPANDED STATE PERSISTENCE
    // ========================================================================

    function saveExpandedModules() {
        const expandedModules = [];
        document.querySelectorAll('.nav-module.active, .nav-module.expanded').forEach(module => {
            const moduleNum = module.dataset.module;
            if (moduleNum) {
                expandedModules.push(moduleNum);
            }
        });
        localStorage.setItem('expandedModules', JSON.stringify(expandedModules));
    }

    function restoreExpandedModules() {
        const stored = localStorage.getItem('expandedModules');
        if (!stored) return;

        try {
            const expandedModules = JSON.parse(stored);
            expandedModules.forEach(moduleNum => {
                const module = document.querySelector(`[data-module="${moduleNum}"]`);
                const lessons = document.getElementById(`nav-module-${moduleNum}`);
                const trigger = module?.querySelector('.nav-module-trigger, .week-toggle');

                if (module && lessons && trigger) {
                    lessons.style.maxHeight = lessons.scrollHeight + 'px';
                    lessons.style.opacity = '1';
                    lessons.classList.add('expanded');
                    trigger.setAttribute('aria-expanded', 'true');
                    module.classList.add('active', 'expanded');
                }
            });
        } catch (e) {
            console.warn('Could not restore expanded modules:', e);
        }
    }

    // ========================================================================
    // THEME TOGGLE (Light/Dark Mode)
    // ========================================================================

    /**
     * Get the base theme from the HTML element or default
     * Base themes: default, government, corporate, education, healthcare, high-contrast
     */
    function getBaseTheme() {
        return document.documentElement.dataset.baseTheme || 'default';
    }

    /**
     * Check if current theme is dark mode
     */
    function isDarkMode() {
        const theme = document.documentElement.getAttribute('data-theme') || '';
        return theme.endsWith('-dark') || theme === 'dark';
    }

    /**
     * Get the theme name for a given mode
     * @param {string} baseTheme - The base theme (e.g., 'government')
     * @param {boolean} dark - Whether to use dark mode
     */
    function getThemeName(baseTheme, dark) {
        if (baseTheme === 'default' || !baseTheme) {
            return dark ? 'dark' : 'light';
        }
        return dark ? `${baseTheme}-dark` : baseTheme;
    }

    /**
     * Toggle between light and dark mode for the current base theme
     */
    window.toggleTheme = function() {
        const baseTheme = getBaseTheme();
        const currentlyDark = isDarkMode();
        const newTheme = getThemeName(baseTheme, !currentlyDark);

        document.documentElement.setAttribute('data-theme', newTheme);
        var modeStr = currentlyDark ? 'light' : 'dark';
        localStorage.setItem('theme-mode', modeStr);
        localStorage.setItem('vd-theme', modeStr);

        // Update toggle button
        updateThemeToggleButton(!currentlyDark);
    };

    /**
     * Set the theme to a specific mode
     * @param {boolean} dark - Whether to use dark mode
     */
    window.setThemeMode = function(dark) {
        const baseTheme = getBaseTheme();
        const newTheme = getThemeName(baseTheme, dark);

        document.documentElement.setAttribute('data-theme', newTheme);
        var modeStr = dark ? 'dark' : 'light';
        localStorage.setItem('theme-mode', modeStr);
        localStorage.setItem('vd-theme', modeStr);

        updateThemeToggleButton(dark);
    };

    /**
     * Update the theme toggle button appearance
     */
    function updateThemeToggleButton(isDark) {
        // Update all toggle buttons (dashboard + injected lesson toggle)
        document.querySelectorAll('.theme-toggle-btn, .vd-theme-toggle').forEach(function(toggleBtn) {
            var sunIcon = toggleBtn.querySelector('.theme-icon-sun, .vd-theme-icon--sun');
            var moonIcon = toggleBtn.querySelector('.theme-icon-moon, .vd-theme-icon--moon');
            var label = toggleBtn.querySelector('.theme-toggle-label');

            if (isDark) {
                toggleBtn.setAttribute('aria-pressed', 'true');
                toggleBtn.classList.add('dark-mode');
                toggleBtn.classList.remove('light-mode');
                if (sunIcon) sunIcon.style.display = 'block';
                if (moonIcon) moonIcon.style.display = 'none';
                if (label) label.textContent = 'Light Mode';
            } else {
                toggleBtn.setAttribute('aria-pressed', 'false');
                toggleBtn.classList.remove('dark-mode');
                toggleBtn.classList.add('light-mode');
                if (sunIcon) sunIcon.style.display = 'none';
                if (moonIcon) moonIcon.style.display = 'block';
                if (label) label.textContent = 'Dark Mode';
            }
        });
    }

    /**
     * Restore theme from localStorage or system preference
     */
    function restoreTheme() {
        const baseTheme = getBaseTheme();
        const savedMode = localStorage.getItem('theme-mode') || localStorage.getItem('vd-theme');

        let useDark;
        if (savedMode) {
            useDark = savedMode === 'dark';
        } else {
            // Check system preference
            useDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        const themeName = getThemeName(baseTheme, useDark);
        document.documentElement.setAttribute('data-theme', themeName);

        // Update button state after DOM is ready
        setTimeout(() => updateThemeToggleButton(useDark), 0);
    }

    // Listen for system preference changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            // Only auto-switch if user hasn't set a preference
            if (!localStorage.getItem('theme-mode')) {
                setThemeMode(e.matches);
            }
        });
    }

    // ========================================================================
    // SIDEBAR STATE PERSISTENCE
    // ========================================================================

    function restoreSidebarState() {
        const sidebarHidden = localStorage.getItem('sidebarHidden') === 'true';
        if (sidebarHidden) {
            document.body.classList.add('sidebar-hidden');
        }
    }

    // ========================================================================
    // ACTIVE LESSON HIGHLIGHTING
    // ========================================================================

    function highlightActiveLesson() {
        // Get current page filename
        const currentPath = window.location.pathname;
        const currentFile = currentPath.substring(currentPath.lastIndexOf('/') + 1);

        // Find and mark the active lesson link
        document.querySelectorAll('.nav-lesson-link').forEach(link => {
            const linkHref = link.getAttribute('href');
            if (linkHref && linkHref.includes(currentFile)) {
                link.classList.add('current');

                // Expand the parent module
                const parentModule = link.closest('.nav-module, [data-module]');
                if (parentModule) {
                    const moduleNum = parentModule.dataset.module;
                    const lessons = document.getElementById(`nav-module-${moduleNum}`);
                    const trigger = parentModule.querySelector('.nav-module-trigger, .week-toggle');

                    if (lessons && trigger) {
                        lessons.style.maxHeight = lessons.scrollHeight + 'px';
                        lessons.style.opacity = '1';
                        lessons.classList.add('expanded');
                        trigger.setAttribute('aria-expanded', 'true');
                        parentModule.classList.add('active', 'expanded');
                    }
                }
            }
        });
    }

    // ========================================================================
    // SCROLL PROGRESS INDICATOR
    // ========================================================================

    function initScrollProgress() {
        const progressBar = document.querySelector('.lesson-progress-fill');
        if (!progressBar) return;

        window.addEventListener('scroll', function() {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = scrolled + '%';
        });
    }

    // ========================================================================
    // KEYBOARD NAVIGATION
    // ========================================================================

    document.addEventListener('keydown', function(e) {
        // ESC to close mobile menu
        if (e.key === 'Escape') {
            const sidebar = document.querySelector('.sidebar.active, .lesson-sidebar.active');
            if (sidebar) {
                sidebar.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        }

        // Toggle sidebar with Ctrl+B (or Cmd+B on Mac)
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            toggleDesktopSidebar();
        }
    });

    // ========================================================================
    // ADAPTIVE QUIZ BRANCHING
    // ========================================================================

    function checkForFailedPrerequisites() {
        try {
            var results = JSON.parse(localStorage.getItem('quizResults') || '{}');
            var currentPath = window.location.pathname;
            var currentFile = currentPath.substring(currentPath.lastIndexOf('/') + 1).replace('.html', '');

            // Parse lesson number to find previous lesson
            var match = currentFile.match(/lesson-(\d+)-(\d+)/);
            if (!match) return;

            var moduleNum = parseInt(match[1]);
            var lessonNum = parseInt(match[2]);

            // Check if previous lesson quiz was failed
            var prevLessonId;
            if (lessonNum > 1) {
                prevLessonId = 'lesson-' + moduleNum + '-' + (lessonNum - 1) + '.html';
            } else if (moduleNum > 1) {
                // Last lesson of previous module - find it from sidebar
                var prevModuleLessons = document.querySelectorAll('[data-module="' + (moduleNum - 1) + '"] .nav-lesson-link');
                if (prevModuleLessons.length > 0) {
                    var lastLink = prevModuleLessons[prevModuleLessons.length - 1].getAttribute('href');
                    prevLessonId = lastLink;
                }
            }

            if (prevLessonId && results[prevLessonId] && !results[prevLessonId].passed) {
                showReviewBanner(prevLessonId, results[prevLessonId]);
            }
        } catch(e) { /* ignore */ }
    }

    function showReviewBanner(lessonId, quizResult) {
        // Find lesson name from sidebar
        var lessonName = 'the previous lesson';
        var lessonLink = document.querySelector('a[href*="' + lessonId.replace('.html', '') + '"]');
        if (lessonLink) {
            lessonName = lessonLink.textContent.trim();
        }

        var banner = document.createElement('div');
        banner.className = 'review-banner';
        banner.setAttribute('role', 'alert');
        banner.innerHTML =
            '<div class="review-banner-content">' +
                '<span class="review-banner-icon">&#x1F4DD;</span>' +
                '<span class="review-banner-text">You scored ' + quizResult.score + '% on <strong>' + lessonName + '</strong>. Consider reviewing before continuing.</span>' +
                '<a href="' + lessonId + '" class="review-banner-link">Review Lesson</a>' +
                '<button class="review-banner-dismiss" onclick="this.closest(\'.review-banner\').remove()" aria-label="Dismiss">&times;</button>' +
            '</div>';

        // Insert at top of main content
        var mainContent = document.querySelector('.lesson-content, .main-content, main');
        if (mainContent) {
            mainContent.insertBefore(banner, mainContent.firstChild);
        }
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Inject language + theme controls into the hero banner
     */
    function injectThemeToggle() {
        // Skip if on index page (has its own toggle)
        if (document.querySelector('.vd-theme-toggle')) return;

        var hero = document.querySelector('.rt-landscape-hero');
        if (!hero) return;

        // Create controls container overlaying the hero top-right
        var controls = document.createElement('div');
        controls.className = 'rt-hero-controls';

        // Move language switch from header row into hero
        var langSwitch = document.querySelector('.rt-lang-switch');
        if (langSwitch) {
            controls.appendChild(langSwitch);
        } else {
            // If lang mount exists but switch hasn't rendered yet, move the mount
            var langMount = document.getElementById('rt-lang-mount');
            if (langMount && langMount.parentNode) {
                controls.appendChild(langMount);
            }
        }

        // Create theme toggle
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-toggle-btn rt-theme-toggle';
        btn.setAttribute('aria-label', 'Toggle light/dark theme');
        btn.innerHTML =
            '<svg class="theme-icon-sun" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">' +
            '<circle cx="12" cy="12" r="5"/>' +
            '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
            '<line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>' +
            '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>' +
            '<line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>' +
            '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>' +
            '</g></svg>' +
            '<svg class="theme-icon-moon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">' +
            '<path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>' +
            '</svg>';
        btn.addEventListener('click', function() { window.toggleTheme(); });
        controls.appendChild(btn);

        hero.appendChild(controls);

        // Set initial icon state
        var dark = isDarkMode();
        var sun = btn.querySelector('.theme-icon-sun');
        var moon = btn.querySelector('.theme-icon-moon');
        btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
        if (sun) sun.style.display = dark ? 'block' : 'none';
        if (moon) moon.style.display = dark ? 'none' : 'block';
    }

    function init() {
        restoreTheme();
        injectThemeToggle();
        restoreSidebarState();
        highlightActiveLesson();
        restoreExpandedModules();
        initScrollProgress();

        // Collapse all non-active modules initially
        document.querySelectorAll('.nav-module:not(.active), [data-module]:not(.active)').forEach(module => {
            const moduleNum = module.dataset.module;
            const lessons = document.getElementById(`nav-module-${moduleNum}`);
            if (lessons && !lessons.classList.contains('expanded')) {
                lessons.style.maxHeight = '0px';
                lessons.style.opacity = '0';
            }
        });

        // Check for failed prerequisite quizzes and show review banner
        checkForFailedPrerequisites();

        // Listen for lesson completion events
        document.addEventListener('quiz-completed', function(e) {
            if (e.detail && e.detail.passed) {
                // Store quiz result for adaptive branching
                try {
                    var results = JSON.parse(localStorage.getItem('quizResults') || '{}');
                    var lessonId = document.body.dataset.lessonId || window.location.pathname.split('/').pop();
                    results[lessonId] = {
                        score: e.detail.percentage,
                        passed: e.detail.passed,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('quizResults', JSON.stringify(results));
                } catch(err) { /* ignore storage errors */ }
            }
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
