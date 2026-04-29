"""
ADA Round 1 — purely-additive, low-risk fixes.

Targets:
  1. Form labels — add aria-label to 6 form inputs flagged by Gate 4.1
  2. External link disclosure — append sr-only "(opens in new tab)" span to 12 links
  3. Decorative videos — add aria-hidden="true" to 2 videos in index.html (sceneVideo, transitionVideo)
  4. Table headers — add scope="col" to 3 <th> tags
  5. index.html — demote 1st <h1> (onboarding modal) to <h2> so only 1 h1 per page

All edits are additive (attribute additions or sr-only span appends). Nothing is removed.
"""
import io, sys, re, glob, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ─── 1. FORM LABELS — add aria-label to inputs missing accessible labels ──
FORM_LABELS = [
    ('output/lessons/index.html',     'obAgreeCheck',       'I have read and understand this disclaimer'),
    ('output/lessons/lesson-2-1.html', 'sim-profit-slider', 'Annual net profit'),
    ('output/lessons/lesson-3-2.html', 'sim-client-facing', 'Client-facing work'),
    ('output/lessons/lesson-3-2.html', 'sim-physical-space', 'Physical office or space'),
    ('output/lessons/lesson-4-3.html', 'sim-health',        'Include health insurance'),
]

print('=== Round 1 — ADA fixes ===\n')
print('1. Form labels')
for path, input_id, label in FORM_LABELS:
    if not os.path.exists(path):
        print(f'   MISSING: {path}')
        continue
    with open(path, encoding='utf-8') as f:
        html = f.read()
    # Match <input ... id="X" ...> and inject aria-label if not already present
    pat = re.compile(r'(<input\b[^>]*?\bid="' + re.escape(input_id) + r'"[^>]*?)(/?>)')
    def add_aria(m):
        tag = m.group(1)
        end = m.group(2)
        if 'aria-label=' in tag:
            return m.group(0)
        return f'{tag} aria-label="{label}"{end}'
    new_html, n = pat.subn(add_aria, html)
    if n > 0 and new_html != html:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print(f'   patched {path} #{input_id}')
    else:
        print(f'   skip   {path} #{input_id} (already labeled or not found)')

# ─── 2. EXTERNAL LINK DISCLOSURE — append sr-only span to <a target="_blank"> ──
print('\n2. External link disclosure')
SR_ONLY_SPAN = '<span class="sr-only"> (opens in a new tab)</span>'
pat_link = re.compile(r'(<a\b[^>]*?\btarget="_blank"[^>]*?>)(.*?)(</a>)', re.DOTALL)
fixed_count = 0
for path in sorted(glob.glob('output/lessons/lesson-*.html')) + ['output/lessons/index.html', 'output/lessons/resources.html']:
    if not os.path.exists(path): continue
    with open(path, encoding='utf-8') as f:
        html = f.read()
    def fix_link(m):
        global fixed_count
        opening, inner, closing = m.group(1), m.group(2), m.group(3)
        # Skip if already has sr-only disclosure inside or aria-label on the tag
        if 'sr-only' in inner or 'aria-label' in opening:
            return m.group(0)
        # Skip image-only links (no text content) — they need a different fix
        text_only = re.sub(r'<[^>]+>', '', inner).strip()
        if not text_only:
            return m.group(0)
        fixed_count += 1
        return f'{opening}{inner}{SR_ONLY_SPAN}{closing}'
    new_html = pat_link.sub(fix_link, html)
    if new_html != html:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_html)
print(f'   appended sr-only span to {fixed_count} external link(s)')

# ─── 3. DECORATIVE VIDEOS — add aria-hidden="true" to silent loop videos ──
print('\n3. Decorative videos in index.html')
idx_path = 'output/lessons/index.html'
with open(idx_path, encoding='utf-8') as f:
    html = f.read()

changes = 0
# sceneVideo (line ~93)
new_html = re.sub(
    r'(<video class="vd-layer vd-layer-video" id="sceneVideo")(?![^>]*aria-hidden)',
    r'\1 aria-hidden="true"',
    html
)
if new_html != html:
    changes += 1
    html = new_html
    print('   added aria-hidden to #sceneVideo')

# transition video (line ~311)
new_html = re.sub(
    r'(<video class="vd-transition-video" id="vdTransitionVideo")(?![^>]*aria-hidden)',
    r'\1 aria-hidden="true"',
    html
)
if new_html != html:
    changes += 1
    html = new_html
    print('   added aria-hidden to #vdTransitionVideo')

# ─── 5. INDEX.HTML — demote onboarding modal h1 to h2 ──
print('\n4. index.html: demote onboarding-modal h1 -> h2 (single h1 per page)')
new_html = html.replace(
    '<h1 class="ob-title">Welcome / Bienvenido</h1>',
    '<h2 class="ob-title">Welcome / Bienvenido</h2>'
)
if new_html != html:
    changes += 1
    html = new_html
    print('   demoted ob-title h1 -> h2')

if changes:
    with open(idx_path, 'w', encoding='utf-8') as f:
        f.write(html)

# ─── 4. TABLE HEADERS — add scope="col" to <th> missing scope ──
print('\n5. <th> scope attribute')
th_count = 0
for path in sorted(glob.glob('output/lessons/*.html')):
    with open(path, encoding='utf-8') as f:
        html = f.read()
    pat = re.compile(r'<th\b((?![^>]*\bscope=)[^>]*)>')
    new_html, n = pat.subn(lambda m: f'<th scope="col"{m.group(1)}>', html)
    if n > 0:
        th_count += n
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print(f'   {path}: {n} <th> patched')
print(f'   total <th> scope added: {th_count}')

# ─── 6. SR-ONLY CSS CLASS — ensure it's defined so the disclosure spans hide visually ──
print('\n6. Verify .sr-only CSS exists')
ax_css = 'output/lessons/css/accessibility.css'
if os.path.exists(ax_css):
    with open(ax_css, encoding='utf-8') as f:
        c = f.read()
    if '.sr-only' in c:
        print('   .sr-only already defined in accessibility.css ✓')
    else:
        print('   WARN: .sr-only missing — appending')
        with open(ax_css, 'a', encoding='utf-8') as f:
            f.write('\n\n/* Visually-hidden disclosure text for screen readers */\n.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}\n')

print('\nROUND 1 DONE')
