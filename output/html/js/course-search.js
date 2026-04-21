(function() {
    'use strict';

    // ========================================================================
    // COURSE SEARCH
    // ========================================================================
    //
    // Provides in-course search functionality with keyboard shortcuts,
    // fuzzy matching, and accessible navigation.
    //
    // Keyboard shortcuts:
    //   Ctrl+K / Cmd+K  - Open search
    //   /               - Open search (when not in input/textarea)
    //   Escape          - Close search
    //   Arrow Up/Down   - Navigate results
    //   Enter           - Go to selected result

    var searchIndex = null;
    var searchModal = null;
    var searchInput = null;
    var searchResults = null;
    var activeIndex = -1;
    var debounceTimer = null;

    // ========================================================================
    // INDEX LOADING
    // ========================================================================

    function loadSearchIndex(callback) {
        if (searchIndex) {
            callback(searchIndex);
            return;
        }

        var xhr = new XMLHttpRequest();
        // Try multiple paths for the search index
        var paths = ['js/search-index.json', 'html/js/search-index.json', '../js/search-index.json', '../html/js/search-index.json'];
        var pathIndex = 0;

        function tryNextPath() {
            if (pathIndex >= paths.length) {
                console.warn('Course search: Could not load search-index.json');
                callback([]);
                return;
            }

            xhr = new XMLHttpRequest();
            xhr.open('GET', paths[pathIndex], true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState !== 4) return;

                if (xhr.status === 200) {
                    try {
                        searchIndex = JSON.parse(xhr.responseText);
                        callback(searchIndex);
                    } catch (e) {
                        console.warn('Course search: Failed to parse search index', e);
                        callback([]);
                    }
                } else {
                    pathIndex++;
                    tryNextPath();
                }
            };
            xhr.send();
        }

        tryNextPath();
    }

    // ========================================================================
    // MODAL CREATION
    // ========================================================================

    function createSearchModal() {
        if (searchModal) return;

        var overlay = document.createElement('div');
        overlay.className = 'search-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Course search');
        overlay.setAttribute('aria-modal', 'true');

        overlay.innerHTML =
            '<div class="search-modal">' +
                '<div class="search-input-wrapper">' +
                    '<svg class="search-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<circle cx="11" cy="11" r="8"></circle>' +
                        '<line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
                    '</svg>' +
                    '<input type="text" class="search-input" placeholder="Search lessons..." autocomplete="off" />' +
                    '<button class="search-close-btn" aria-label="Close search">&times;</button>' +
                '</div>' +
                '<div class="search-results" role="listbox" aria-label="Search results"></div>' +
                '<div class="search-footer">' +
                    '<span class="search-hint"><kbd>&uarr;</kbd><kbd>&darr;</kbd> Navigate</span>' +
                    '<span class="search-hint"><kbd>Enter</kbd> Open</span>' +
                    '<span class="search-hint"><kbd>Esc</kbd> Close</span>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        searchModal = overlay;
        searchInput = overlay.querySelector('.search-input');
        searchResults = overlay.querySelector('.search-results');

        // Event listeners
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeSearch();
            }
        });

        overlay.querySelector('.search-close-btn').addEventListener('click', function() {
            closeSearch();
        });

        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                performSearch(searchInput.value.trim());
            }, 200);
        });

        searchInput.addEventListener('keydown', function(e) {
            handleSearchKeydown(e);
        });
    }

    // ========================================================================
    // SEARCH LOGIC
    // ========================================================================

    function performSearch(query) {
        if (!query) {
            searchResults.innerHTML = '<div class="search-empty">Type to search across all lessons...</div>';
            activeIndex = -1;
            return;
        }

        loadSearchIndex(function(index) {
            var words = query.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 0; });
            if (words.length === 0) {
                searchResults.innerHTML = '<div class="search-empty">Type to search across all lessons...</div>';
                activeIndex = -1;
                return;
            }

            // Score each entry
            var scored = [];
            for (var i = 0; i < index.length; i++) {
                var entry = index[i];
                var searchable = (entry.lessonTitle + ' ' + entry.sectionTitle + ' ' + entry.text).toLowerCase();
                var matchCount = 0;
                var allMatch = true;

                for (var w = 0; w < words.length; w++) {
                    if (searchable.indexOf(words[w]) === -1) {
                        allMatch = false;
                        break;
                    }
                    // Count total occurrences for ranking
                    var idx = 0;
                    while ((idx = searchable.indexOf(words[w], idx)) !== -1) {
                        matchCount++;
                        idx += words[w].length;
                    }
                }

                if (allMatch) {
                    scored.push({ entry: entry, score: matchCount });
                }
            }

            // Sort by score descending
            scored.sort(function(a, b) { return b.score - a.score; });

            // Limit to 10 results
            var results = scored.slice(0, 10);

            if (results.length === 0) {
                searchResults.innerHTML = '<div class="search-empty">No results found for &ldquo;' + escapeHtml(query) + '&rdquo;</div>';
                activeIndex = -1;
                return;
            }

            var html = '';
            for (var r = 0; r < results.length; r++) {
                var item = results[r].entry;
                var snippet = getSnippet(item.text, words[0]);

                html +=
                    '<div class="search-result-item" role="option" data-index="' + r + '" data-url="' + escapeHtml(item.url) + '#' + escapeHtml(item.sectionId) + '">' +
                        '<div class="search-result-title">' + escapeHtml(item.lessonTitle) +
                            (item.sectionTitle !== item.lessonTitle ? ' <span class="search-result-separator">&rsaquo;</span> ' + escapeHtml(item.sectionTitle) : '') +
                        '</div>' +
                        '<div class="search-result-snippet">' + snippet + '</div>' +
                    '</div>';
            }

            searchResults.innerHTML = html;
            activeIndex = -1;

            // Attach click handlers
            var items = searchResults.querySelectorAll('.search-result-item');
            for (var j = 0; j < items.length; j++) {
                (function(el) {
                    el.addEventListener('click', function() {
                        navigateToResult(el.getAttribute('data-url'));
                    });
                })(items[j]);
            }
        });
    }

    function getSnippet(text, word) {
        var lowerText = text.toLowerCase();
        var lowerWord = word.toLowerCase();
        var pos = lowerText.indexOf(lowerWord);

        if (pos === -1) {
            // Just return the beginning
            return escapeHtml(text.substring(0, 100)) + (text.length > 100 ? '...' : '');
        }

        var start = Math.max(0, pos - 50);
        var end = Math.min(text.length, pos + word.length + 50);
        var snippet = '';

        if (start > 0) snippet += '...';
        snippet += escapeHtml(text.substring(start, pos));
        snippet += '<mark>' + escapeHtml(text.substring(pos, pos + word.length)) + '</mark>';
        snippet += escapeHtml(text.substring(pos + word.length, end));
        if (end < text.length) snippet += '...';

        return snippet;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ========================================================================
    // NAVIGATION
    // ========================================================================

    function navigateToResult(url) {
        closeSearch();
        // Determine base path - if we are in a lessons/ subdirectory, go up
        var currentPath = window.location.pathname;
        if (currentPath.indexOf('/lessons/') !== -1) {
            // We're inside lessons/, navigate relative to parent
            window.location.href = '../' + url;
        } else {
            window.location.href = url;
        }
    }

    function handleSearchKeydown(e) {
        var items = searchResults.querySelectorAll('.search-result-item');
        var count = items.length;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, count - 1);
            updateActiveItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, -1);
            updateActiveItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < count) {
                navigateToResult(items[activeIndex].getAttribute('data-url'));
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeSearch();
        }
    }

    function updateActiveItem(items) {
        for (var i = 0; i < items.length; i++) {
            if (i === activeIndex) {
                items[i].classList.add('active');
                items[i].scrollIntoView({ block: 'nearest' });
            } else {
                items[i].classList.remove('active');
            }
        }
    }

    // ========================================================================
    // OPEN / CLOSE
    // ========================================================================

    function openSearch() {
        createSearchModal();
        searchModal.classList.add('visible');
        searchInput.value = '';
        searchResults.innerHTML = '<div class="search-empty">Type to search across all lessons...</div>';
        activeIndex = -1;

        // Focus input after a brief delay for transition
        setTimeout(function() {
            searchInput.focus();
        }, 50);
    }

    function closeSearch() {
        if (searchModal) {
            searchModal.classList.remove('visible');
        }
        activeIndex = -1;
    }

    function isSearchOpen() {
        return searchModal && searchModal.classList.contains('visible');
    }

    // ========================================================================
    // KEYBOARD SHORTCUTS
    // ========================================================================

    document.addEventListener('keydown', function(e) {
        // Ctrl+K / Cmd+K to open search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (isSearchOpen()) {
                closeSearch();
            } else {
                openSearch();
            }
            return;
        }

        // "/" key to open search (only when not typing in an input)
        if (e.key === '/' && !isSearchOpen()) {
            var tag = document.activeElement ? document.activeElement.tagName : '';
            if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && !document.activeElement.isContentEditable) {
                e.preventDefault();
                openSearch();
            }
        }
    });

    // Expose for programmatic use
    window.openCourseSearch = openSearch;
    window.closeCourseSearch = closeSearch;

})();
