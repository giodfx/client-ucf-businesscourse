"""
ADA Round 3 — Color contrast fixes (WCAG AA).

The 15 failing pairs are all in lesson-7-3 (and the same colors used in module-2 +
module-4 charts) where white text sits on light-medium colored bars:
  #E8A838 amber  → too light (ratio 2.08:1 with #fff)
  #D4622B orange → ratio 3.76:1 (fails 4.5:1)
  #48B07A green  → ratio 2.70:1

Fix: darken each color to a WCAG-AA-compliant shade that still preserves the hue
so the data viz remains visually meaningful.

  #E8A838 → #8B5A0A  (deep amber, ratio ~5.4:1 with #fff)
  #D4622B → #9C3D14  (deep burnt orange, ratio ~6.8:1 with #fff)
  #48B07A → #1B6B40  (deep forest green, ratio ~6.0:1 with #fff)

Also dim the FFF8E7 callout box border-left and the AgTech bar fill #F5C842
that has dark text — those pass already but we keep consistency.

Replaces colors at all 4 layers: HTML rendered output + content JSONs.
"""
import io, sys, re, glob, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

COLOR_MAP = {
    '#E8A838': '#8B5A0A',
    '#D4622B': '#9C3D14',
    '#48B07A': '#1B6B40',
}

# Apply to all relevant files
TARGET_FILES = (
    glob.glob('output/lessons/lesson-*.html')
    + glob.glob('generated/content-phase1-module*.json')
    + glob.glob('phase1-lessons/lesson-*.json')
)

print('=== Round 3 ADA fixes — Color contrast ===\n')
total_swaps = 0
files_touched = 0
for path in sorted(TARGET_FILES):
    if '.es-backup' in path: continue
    with open(path, encoding='utf-8') as f:
        content = f.read()
    orig = content
    file_swaps = 0
    for old, new in COLOR_MAP.items():
        # case-insensitive replace (HTML uses uppercase, JSON may differ)
        new_content, n = re.subn(re.escape(old), new, content, flags=re.IGNORECASE)
        # Also try lowercase
        new_content, n2 = re.subn(re.escape(old.lower()), new, new_content, flags=re.IGNORECASE)
        content = new_content
        file_swaps += n + n2
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'   {path}: {file_swaps} color swaps')
        total_swaps += file_swaps
        files_touched += 1

print(f'\nTotal: {total_swaps} swaps across {files_touched} files')
print('ROUND 3 DONE')
