"""
ADA Round 2 — heading hierarchy + proper <label for> elements.

Targets:
  1. Heading hierarchy — promote h4 → h3 in lesson body where they follow h2 with no h3 between.
     Across all 25 lesson HTML files. Skip h4s inside specific component contexts (none currently identified).
  2. Form labels — add explicit <label for="X"> wrapper or visually-hidden <label> for 6 inputs.

All edits are surgical and preserve content.
"""
import io, sys, re, glob, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ─── 1. HEADING HIERARCHY — h4 → h3 promotion ───
print('=== Round 2 ADA fixes ===\n')
print('1. Heading hierarchy: promote h4 -> h3 where missing intermediate h3')

def promote_h4_to_h3(html):
    """Walk headings in document order; promote h4 to h3 when following h2 with no h3 sibling yet,
       OR when the parent context expects h3 (e.g., after another converted h3)."""
    # Find all h2/h3/h4 tags in order
    pat = re.compile(r'<(h[234])\b([^>]*)>(.*?)</\1>', re.IGNORECASE | re.DOTALL)

    matches = list(pat.finditer(html))
    last_real_level = 1  # start with h1 implicit
    last_h2_pos = -1
    saw_h3_under_current_h2 = False

    # Build replacement plan: list of (start, end, new_tag)
    edits = []
    for m in matches:
        tag = m.group(1).lower()
        level = int(tag[1])
        if level == 2:
            saw_h3_under_current_h2 = False
            last_h2_pos = m.start()
        elif level == 3:
            saw_h3_under_current_h2 = True
        elif level == 4:
            # If we haven't seen an h3 since the last h2, promote h4 to h3
            if last_h2_pos >= 0 and not saw_h3_under_current_h2:
                edits.append((m.start(), m.end(), m.group(2), m.group(3)))
                saw_h3_under_current_h2 = True  # Now we have an h3 (the promoted one)

    # Apply edits in reverse to avoid offset shifts
    for start, end, attrs, content in reversed(edits):
        replacement = f'<h3{attrs}>{content}</h3>'
        html = html[:start] + replacement + html[end:]

    return html, len(edits)

total_promotions = 0
for path in sorted(glob.glob('output/lessons/lesson-*.html')):
    with open(path, encoding='utf-8') as f:
        html = f.read()
    new_html, n = promote_h4_to_h3(html)
    if n > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print(f'   {os.path.basename(path)}: promoted {n} <h4> -> <h3>')
        total_promotions += n
print(f'   total: {total_promotions} promotions')

# ─── 2. FORM LABELS — add explicit <label for="X"> ───
print('\n2. Form labels — add explicit <label for>')

# Strategy per input:
#  - obAgreeCheck: already inside <label class="ob-checkbox-wrap">. Add for="obAgreeCheck" to the outer label.
#  - sim-profit-slider: needs a NEW visually-hidden <label> immediately before the slider.
#  - sim-client-facing, sim-physical-space, sim-health: each is inside <label class="rt-sim-toggle">.
#    Add for="X" to that label. The wrapping label currently lacks for attr.
#  - searchInput: inside <div class="resources-search-box">. Add a visually-hidden <label> sibling.

LABEL_PATCHES = [
    # (path, find pattern, replacement)
    ('output/lessons/index.html',
     '<label class="ob-checkbox-wrap" id="obCheckWrap">',
     '<label class="ob-checkbox-wrap" id="obCheckWrap" for="obAgreeCheck">'),
    ('output/lessons/lesson-3-2.html',
     '<label class="rt-sim-toggle">\n          <input type="checkbox" id="sim-client-facing"',
     '<label class="rt-sim-toggle" for="sim-client-facing">\n          <input type="checkbox" id="sim-client-facing"'),
    ('output/lessons/lesson-3-2.html',
     '<label class="rt-sim-toggle">\n          <input type="checkbox" id="sim-physical-space"',
     '<label class="rt-sim-toggle" for="sim-physical-space">\n          <input type="checkbox" id="sim-physical-space"'),
    ('output/lessons/lesson-4-3.html',
     '<label class="rt-sim-toggle">\n          <input type="checkbox" id="sim-health"',
     '<label class="rt-sim-toggle" for="sim-health">\n          <input type="checkbox" id="sim-health"'),
]

# Plus a couple that need a NEW <label> inserted before the input
INSERT_LABEL = [
    ('output/lessons/lesson-2-1.html',
     '<input class="rt-sim-slider" id="sim-profit-slider"',
     '<label for="sim-profit-slider" class="sr-only" data-es="Control deslizante de ganancia anual">Annual profit slider</label>\n        <input class="rt-sim-slider" id="sim-profit-slider"'),
    ('output/lessons/resources.html',
     '<input type="search" id="searchInput"',
     '<label for="searchInput" class="sr-only" data-es="Buscar recursos">Search resources</label>\n                <input type="search" id="searchInput"'),
]

for path, find, repl in LABEL_PATCHES:
    if not os.path.exists(path): continue
    with open(path, encoding='utf-8') as f:
        html = f.read()
    if find in html:
        new_html = html.replace(find, repl, 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print(f'   {path}: added for= to wrapping label')
    else:
        print(f'   {path}: pattern not found (already patched?)')

for path, find, repl in INSERT_LABEL:
    if not os.path.exists(path): continue
    with open(path, encoding='utf-8') as f:
        html = f.read()
    if 'for="' + find.split('id="')[1].split('"')[0] + '"' not in html and find in html:
        new_html = html.replace(find, repl, 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print(f'   {path}: inserted new <label for> sibling')
    else:
        print(f'   {path}: skip (label already exists or pattern not found)')

print('\nROUND 2 DONE')
