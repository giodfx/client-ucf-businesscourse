import os, re, glob, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

COMMON = 'xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'

LUCIDE = {
    'shield-alert':   f'<svg {COMMON}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
    'triangle-alert': f'<svg {COMMON}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    'wallet':         f'<svg {COMMON}><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>',
    'users':          f'<svg {COMMON}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    'info':           f'<svg {COMMON}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
}

# legacy_variant -> (canonical_variant, icon_key)
RENAMES = {
    'theme-reduce-risk':         ('reduce-risk',      'shield-alert'),
    'theme-common-mistakes':     ('common-mistake',   'triangle-alert'),
    'theme-avoid-mistakes':      ('common-mistake',   'triangle-alert'),
    'common-mistakes-repeating': ('common-mistake',   'triangle-alert'),
    'common-mistake':            ('common-mistake',   'triangle-alert'),
    'theme-understand-culture':  ('cultural-insight', 'users'),
    'latam-supplement':          ('cultural-insight', 'users'),
    'watch-money-costs':         ('watch-money',      'wallet'),
    'before-you-spend':          ('watch-money',      'wallet'),
    'reality-check':             ('reality-check',    'info'),
    'fun-fact':                  ('fun-fact',         None),
}

# ─── Phase 1: content JSONs ───────────────────────────────────
print('=== Phase 1: content JSONs ===')
content_changes = 0
for path in glob.glob('generated/content-phase1-module*.json'):
    with open(path, encoding='utf-8') as f:
        text = f.read()
    original = text
    for old, (new, _) in RENAMES.items():
        if old != new:
            text = text.replace(f'"variant": "{old}"', f'"variant": "{new}"')
    if text != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        content_changes += 1
print(f'  Updated {content_changes} content JSON file(s)')

all_variants = {}
for path in glob.glob('generated/content-phase1-module*.json'):
    with open(path, encoding='utf-8') as f:
        for m in re.finditer(r'"variant":\s*"([^"]+)"', f.read()):
            all_variants[m.group(1)] = all_variants.get(m.group(1), 0) + 1
print(f'  Variants now: {sorted(all_variants.items(), key=lambda x: -x[1])}')

# ─── Phase 2: HTML output ─────────────────────────────────────
print()
print('=== Phase 2: lesson HTMLs ===')
html_files = sorted(glob.glob('output/lessons/lesson-*.html'))
files_changed = 0
class_renames = [0]
icon_replacements = [0]

CALLOUT_RE = re.compile(
    r'(<div class="rt-callout rt-callout--)([a-z-]+)("[^>]*>\s*<span class="rt-callout-icon"[^>]*>)(.+?)(</span>)',
    re.DOTALL
)

for path in html_files:
    with open(path, encoding='utf-8') as f:
        html = f.read()

    def repl(m):
        prefix1, old_cls, mid, old_icon, end = m.groups()
        if old_cls not in RENAMES:
            return m.group(0)
        new_cls, icon_key = RENAMES[old_cls]
        new_icon = LUCIDE[icon_key] if icon_key else old_icon
        if old_cls != new_cls:
            class_renames[0] += 1
        if icon_key and old_icon.strip() != new_icon.strip():
            icon_replacements[0] += 1
        return prefix1 + new_cls + mid + new_icon + end

    new_html = CALLOUT_RE.sub(repl, html)
    if new_html != html:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        files_changed += 1

print(f'  Files changed: {files_changed}/{len(html_files)}')
print(f'  Class renames: {class_renames[0]}')
print(f'  Icon updates : {icon_replacements[0]}')

leftover_re = re.compile(r'rt-callout--(theme-[a-z-]+|common-mistakes-repeating|latam-supplement|watch-money-costs|before-you-spend)')
leftovers = {}
for path in html_files:
    for m in leftover_re.finditer(open(path, encoding='utf-8').read()):
        leftovers[m.group(1)] = leftovers.get(m.group(1), 0) + 1
if leftovers:
    print(f'  WARN — legacy classes still present: {leftovers}')
else:
    print('  OK — no legacy classes remain in HTML')

# ─── Phase 3: generator script ────────────────────────────────
print()
print('=== Phase 3: generator script ===')
gen_path = '../../../scripts/course-factory/generate-html-ucf-roadtrip.ts'
with open(gen_path, encoding='utf-8') as f:
    gen = f.read()

old_iconmap = """  const iconMap: Record<string, string> = {
    'common-mistake': '&#9888;',
    'reality-check': '&#128269;',
    'before-you-spend': '&#128176;',
    'theme-reduce-risk': '&#128737;',
    'theme-watch-money': '&#128178;',
    'fun-fact': '&#127793;',
    'info': '&#8505;',
    'warning': '&#9888;',
    'tip': '&#128161;',
  };"""

# Build TS literal — escape backticks/dollars in SVG strings
def ts_lit(s):
    return s.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

new_iconmap = (
    "  // Unified callout taxonomy (6 canonical variants) — line-style Lucide SVGs.\n"
    "  // Legacy variants (theme-*, common-mistakes-repeating, latam-supplement,\n"
    "  // watch-money-costs, before-you-spend) are aliased to canonical names.\n"
    "  const lucide = {\n"
    f"    shieldAlert: `{ts_lit(LUCIDE['shield-alert'])}`,\n"
    f"    triangleAlert: `{ts_lit(LUCIDE['triangle-alert'])}`,\n"
    f"    wallet: `{ts_lit(LUCIDE['wallet'])}`,\n"
    f"    users: `{ts_lit(LUCIDE['users'])}`,\n"
    f"    info: `{ts_lit(LUCIDE['info'])}`,\n"
    "  };\n"
    "  const VARIANT_ALIASES: Record<string, string> = {\n"
    "    'theme-reduce-risk': 'reduce-risk',\n"
    "    'theme-common-mistakes': 'common-mistake',\n"
    "    'theme-avoid-mistakes': 'common-mistake',\n"
    "    'common-mistakes-repeating': 'common-mistake',\n"
    "    'theme-understand-culture': 'cultural-insight',\n"
    "    'latam-supplement': 'cultural-insight',\n"
    "    'watch-money-costs': 'watch-money',\n"
    "    'before-you-spend': 'watch-money',\n"
    "    'theme-watch-money': 'watch-money',\n"
    "  };\n"
    "  const iconMap: Record<string, string> = {\n"
    "    'reduce-risk':      lucide.shieldAlert,\n"
    "    'common-mistake':   lucide.triangleAlert,\n"
    "    'watch-money':      lucide.wallet,\n"
    "    'cultural-insight': lucide.users,\n"
    "    'reality-check':    lucide.info,\n"
    "    'fun-fact':         '&#127793;',\n"
    "    'info':             lucide.info,\n"
    "    'warning':          lucide.triangleAlert,\n"
    "    'tip':              lucide.info,\n"
    "  };"
)

if old_iconmap in gen:
    gen = gen.replace(old_iconmap, new_iconmap)
    gen = gen.replace(
        "  const fallbackIcon = iconMap[variant] || iconMap['info'];",
        "  const canonicalVariant = VARIANT_ALIASES[variant] || variant;\n"
        "  const fallbackIcon = iconMap[canonicalVariant] || iconMap['info'];"
    )
    gen = gen.replace(
        '<div class="rt-callout rt-callout--${variant}">',
        '<div class="rt-callout rt-callout--${canonicalVariant}">'
    )
    with open(gen_path, 'w', encoding='utf-8') as f:
        f.write(gen)
    print('  Generator updated (iconMap + alias map + canonical class output)')
else:
    print('  WARN: generator iconMap not found exactly; manual review needed')
