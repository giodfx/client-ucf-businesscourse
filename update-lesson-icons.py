#!/usr/bin/env python3
"""Replace inline SVG icons in all lesson HTML files with professional SVG img references."""

import re
import os
import glob

LESSONS_DIR = os.path.join(os.path.dirname(__file__), 'output', 'lessons')

# Module index -> SVG filename mapping
ICON_MAP = {
    '0': 'start_here.svg',
    '1': 'downtown.svg',
    '2': 'financial.svg',
    '3': 'space_center.svg',
    '4': 'theme_park.svg',
    '5': 'port.svg',
    '6': 'beach.svg',
    '7': 'springs.svg',
    '8': 'ucf.svg',
}

def get_module_index(html):
    """Extract data-module-index from <body> tag."""
    m = re.search(r'data-module-index="(\d+)"', html)
    return m.group(1) if m else None

def replace_hero_icon(html, svg_file):
    """Replace inline SVG or existing <img> inside .rt-hero-module-icon with <img> tag."""
    # Match SVG or existing img tag
    pattern = r'(<span class="rt-hero-module-icon" aria-hidden="true">)(?:<svg[^>]*>.*?</svg>|<img[^>]*>)(</span>)'
    replacement = rf'\1<img src="images/Icons/{svg_file}" alt="" width="24" height="24">\2'
    return re.sub(pattern, replacement, html, flags=re.DOTALL)

def replace_sidebar_icon(html, svg_file):
    """Replace inline SVG or existing <img> inside .rt-route-icon with <img> tag."""
    pattern = r'(<div class="rt-route-icon"[^>]*>)\s*(?:<svg[^>]*>.*?</svg>|<img[^>]*>)\s*(</div>)'
    replacement = rf'\1\n            <img src="images/Icons/{svg_file}" alt="" width="16" height="16">\n          \2'
    return re.sub(pattern, replacement, html, flags=re.DOTALL)

def replace_module_intro_icon(html, svg_file):
    """Replace inline SVG or existing <img> inside .rt-module-intro-icon with <img> tag."""
    pattern = r'(<span class="rt-module-intro-icon" aria-hidden="true">)(?:<svg[^>]*>.*?</svg>|<img[^>]*>)(</span>)'
    replacement = rf'\1<img src="images/Icons/{svg_file}" alt="" width="48" height="48">\2'
    return re.sub(pattern, replacement, html, flags=re.DOTALL)

def process_lesson(filepath):
    """Process a single lesson HTML file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    mod_idx = get_module_index(html)
    if mod_idx is None:
        print(f"  SKIP {os.path.basename(filepath)} — no data-module-index")
        return False

    svg_file = ICON_MAP.get(mod_idx)
    if svg_file is None:
        print(f"  SKIP {os.path.basename(filepath)} — unknown module index {mod_idx}")
        return False

    original = html

    # Replace hero icon
    html = replace_hero_icon(html, svg_file)

    # Replace sidebar icon
    html = replace_sidebar_icon(html, svg_file)

    # Replace module intro icon
    html = replace_module_intro_icon(html, svg_file)

    if html == original:
        print(f"  NOCHANGE {os.path.basename(filepath)} (module {mod_idx})")
        return False

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"  UPDATED {os.path.basename(filepath)} -> {svg_file} (module {mod_idx})")
    return True

def main():
    lesson_files = sorted(glob.glob(os.path.join(LESSONS_DIR, 'lesson-*.html')))
    print(f"Found {len(lesson_files)} lesson files\n")

    updated = 0
    for filepath in lesson_files:
        if process_lesson(filepath):
            updated += 1

    print(f"\nDone: {updated}/{len(lesson_files)} files updated")

if __name__ == '__main__':
    main()
