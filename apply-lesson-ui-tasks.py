#!/usr/bin/env python3
"""Apply UI Tasks 6-8 to all lesson HTML files.
- Task 6: Module location overlay on hero image
- Task 7: Module intro section below hero
- Task 8: Move 'Did You Know?' callout after video section
- Bonus: Update lesson tag text to new approved names
"""
import re, os, glob

BASE = r"g:\z-CUSTOM_DEV\CourseFuture\clients\UCF\BusinessCourse\output\lessons"

MODULES = {
    0: dict(label_en='Introduction', label_es='Introducción',
            name_en='Highway', name_es='La Autopista',
            desc_en='Get clear on what it actually takes to enter the U.S. market',
            desc_es='Entienda lo que realmente implica entrar al mercado de EE.UU.',
            tag_en='Highway', tag_es='La Autopista'),
    1: dict(label_en='Module 1', label_es='Módulo 1',
            name_en='Downtown', name_es='El Centro',
            desc_en='Learn how to structure, register, and open your U.S. business',
            desc_es='Aprenda a estructurar, registrar y abrir su negocio en EE.UU.',
            tag_en='Downtown', tag_es='El Centro'),
    2: dict(label_en='Module 2', label_es='Módulo 2',
            name_en='Financial District', name_es='El Distrito Financiero',
            desc_en='Learn how the U.S. tax and banking system works for your business',
            desc_es='Entienda cómo funciona el sistema fiscal y bancario de EE.UU.',
            tag_en='Financial District', tag_es='El Distrito Financiero'),
    3: dict(label_en='Module 3', label_es='Módulo 3',
            name_en='Space Center', name_es='El Centro Espacial',
            desc_en='Shield your business with the right IP, insurance, and contracts',
            desc_es='Proteja su negocio con la propiedad intelectual, seguros y contratos correctos',
            tag_en='Space Center', tag_es='El Centro Espacial'),
    4: dict(label_en='Module 4', label_es='Módulo 4',
            name_en='Theme Park', name_es='Los Parques Temáticos',
            desc_en='Build your U.S. team without costly legal and compliance mistakes',
            desc_es='Forme su equipo en EE.UU. sin cometer errores legales costosos',
            tag_en='Theme Park', tag_es='Los Parques Temáticos'),
    5: dict(label_en='Module 5', label_es='Módulo 5',
            name_en='Port', name_es='El Puerto',
            desc_en='Learn how to find, reach, and close your first U.S. customers',
            desc_es='Aprenda a encontrar, llegar y vender a sus primeros clientes en EE.UU.',
            tag_en='Port', tag_es='El Puerto'),
    6: dict(label_en='Module 6', label_es='Módulo 6',
            name_en='Beach', name_es='La Playa',
            desc_en='Discover how Americans communicate, negotiate, and make decisions',
            desc_es='Descubra cómo los americanos se comunican, negocian y deciden',
            tag_en='Beach', tag_es='La Playa'),
    7: dict(label_en='Module 7', label_es='Módulo 7',
            name_en='Natural Springs', name_es='Los Manantiales',
            desc_en='Connect with the free resources most international founders overlook',
            desc_es='Conéctese con los recursos gratuitos que la mayoría de los fundadores ignoran',
            tag_en='Natural Springs', tag_es='Los Manantiales'),
    8: dict(label_en='Module 8', label_es='Módulo 8',
            name_en='UCF Campus', name_es='El Campus UCF',
            desc_en='Assess your readiness and plan your next steps with UCF BIP',
            desc_es='Evalúe su preparación y planifique sus próximos pasos con UCF BIP',
            tag_en='UCF Campus', tag_es='El Campus UCF'),
}

# SVG icons per module (48x48 viewBox, matching dashboard)
ICONS = {
    0: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 38l8-28h16l8 28"/><path d="M14 24h20"/><path d="M24 10v28"/><path d="M18 10h12"/><rect x="6" y="36" width="36" height="4" rx="2"/></svg>',
    1: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="18" width="10" height="22" rx="1"/><rect x="19" y="8" width="10" height="32" rx="1"/><rect x="32" y="14" width="10" height="26" rx="1"/><line x1="9" y1="24" x2="13" y2="24"/><line x1="9" y1="28" x2="13" y2="28"/><line x1="9" y1="32" x2="13" y2="32"/><line x1="22" y1="14" x2="26" y2="14"/><line x1="22" y1="18" x2="26" y2="18"/><line x1="22" y1="22" x2="26" y2="22"/><line x1="22" y1="26" x2="26" y2="26"/><line x1="22" y1="30" x2="26" y2="30"/><line x1="35" y1="20" x2="39" y2="20"/><line x1="35" y1="24" x2="39" y2="24"/><line x1="35" y1="28" x2="39" y2="28"/><line x1="4" y1="40" x2="44" y2="40"/></svg>',
    2: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 40V16l16-8 16 8v24"/><line x1="8" y1="16" x2="40" y2="16"/><rect x="14" y="20" width="6" height="8" rx="0.5"/><rect x="28" y="20" width="6" height="8" rx="0.5"/><rect x="20" y="32" width="8" height="8" rx="0.5"/><circle cx="24" cy="12" r="2"/><line x1="6" y1="40" x2="42" y2="40"/></svg>',
    3: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4l5 14h-10l5-14z"/><rect x="20" y="18" width="8" height="16" rx="1"/><path d="M16 34h16l-2 8H18l-2-8z"/><line x1="14" y1="26" x2="20" y2="24"/><line x1="34" y1="26" x2="28" y2="24"/><circle cx="24" cy="24" r="1.5"/><path d="M22 42h4"/></svg>',
    4: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="7"/><circle cx="32" cy="16" r="7"/><path d="M10 42v-4a6 6 0 016-6h16a6 6 0 016 6v4"/><line x1="24" y1="28" x2="24" y2="42"/></svg>',
    5: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6v16"/><circle cx="24" cy="24" r="3"/><path d="M24 27v6"/><path d="M12 36c0-6.63 5.37-12 12-12s12 5.37 12 12"/><line x1="8" y1="42" x2="40" y2="42"/><path d="M16 42v-3"/><path d="M32 42v-3"/></svg>',
    6: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M34 14c-4 0-7 2-10 6-3-4-6-6-10-6"/><path d="M24 6v18"/><path d="M24 24c-2 6-8 12-16 16h32c-8-4-14-10-16-16z"/><path d="M6 44c4-1 8-1 12 0s8 1 12 0 8-1 12 0"/></svg>',
    7: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4c-6 10-14 15-14 24a14 14 0 0028 0c0-9-8-14-14-24z"/><path d="M24 36a6 6 0 01-6-6c0-4 6-10 6-10s6 6 6 10a6 6 0 01-6 6z"/></svg>',
    8: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4L4 14l20 10 20-10L24 4z"/><path d="M4 34l20 10 20-10"/><path d="M4 24l20 10 20-10"/></svg>',
}


def extract_fun_fact(html):
    """Extract 'Did You Know?' callout block. Returns (block, cleaned_html) or (None, html)."""
    marker_idx = html.find('Did You Know?')
    if marker_idx == -1:
        return None, html

    # Find parent callout div
    start = html.rfind('<div class="rt-callout rt-callout--callout">', 0, marker_idx)
    if start == -1:
        start = html.rfind('<div class="rt-callout rt-callout--callout"', 0, marker_idx)
    if start == -1:
        return None, html

    # Count div depth to find matching close
    pos = start
    depth = 0
    while pos < len(html):
        next_open = html.find('<div', pos)
        next_close = html.find('</div>', pos)

        if next_close == -1:
            break

        if next_open != -1 and next_open < next_close:
            ch = html[next_open + 4] if next_open + 4 < len(html) else ''
            if ch in ' >\n\r\t/':
                depth += 1
            pos = next_open + 4
        else:
            depth -= 1
            if depth == 0:
                end = next_close + 6  # len('</div>')
                block = html[start:end]

                # Trim surrounding whitespace for clean removal
                rm_start = start
                while rm_start > 0 and html[rm_start - 1] in ' \t':
                    rm_start -= 1
                if rm_start > 0 and html[rm_start - 1] == '\n':
                    rm_start -= 1
                    if rm_start > 0 and html[rm_start - 1] == '\r':
                        rm_start -= 1

                rm_end = end
                while rm_end < len(html) and html[rm_end] in ' \t':
                    rm_end += 1
                if rm_end < len(html) and html[rm_end] == '\r':
                    rm_end += 1
                if rm_end < len(html) and html[rm_end] == '\n':
                    rm_end += 1

                cleaned = html[:rm_start] + html[rm_end:]
                return block, cleaned
            pos = next_close + 6

    return None, html


def find_video_end(html):
    """Find position right after </section> closing the video section."""
    idx = html.find('class="video-section"')
    if idx == -1:
        idx = html.find('class="video-placeholder"')
    if idx == -1:
        return -1
    end = html.find('</section>', idx)
    return end + 10 if end != -1 else -1


def process(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    original = html
    m = re.search(r'data-module-index="(\d+)"', html)
    if not m:
        print(f"  SKIP: no module index in {os.path.basename(filepath)}")
        return

    mod_idx = int(m.group(1))
    mod = MODULES[mod_idx]
    icon = ICONS[mod_idx]
    lesson = os.path.basename(filepath).replace('.html', '')

    gm = re.search(r'--hero-gradient:\s*([^"]+)', html)
    gradient = gm.group(1).strip().rstrip(';').strip() if gm else 'linear-gradient(135deg, #1e3a5f, #0f2440)'

    changes = []

    # === Task 6: Hero module label ===
    if 'rt-hero-module-label' not in html:
        target = '    <div class="rt-hero-drips">'
        replacement = (
            f'    <div class="rt-hero-module-label">\n'
            f'      <span class="rt-hero-module-icon" aria-hidden="true">{icon}</span>\n'
            f'      <span data-es="{mod["name_es"].upper()}">{mod["name_en"].upper()}</span>\n'
            f'    </div>\n'
            f'    <div class="rt-hero-drips">'
        )
        if target in html:
            html = html.replace(target, replacement, 1)
            changes.append('T6')

    # === Task 7: Module intro section ===
    if 'rt-module-intro' not in html:
        target = '\n  <div class="rt-lesson-layout">'
        replacement = (
            f'\n  <div class="rt-module-intro" style="--mi-gradient: {gradient}">\n'
            f'    <div class="rt-module-intro-text">\n'
            f'      <span class="rt-module-intro-label" data-es="{mod["label_es"]}">{mod["label_en"]}</span>\n'
            f'      <span class="rt-module-intro-name" data-es="{mod["name_es"]}">{mod["name_en"]}</span>\n'
            f'    </div>\n'
            f'    <p class="rt-module-intro-desc" data-es="{mod["desc_es"]}">{mod["desc_en"]}</p>\n'
            f'    <span class="rt-module-intro-icon" aria-hidden="true">{icon}</span>\n'
            f'  </div>\n'
            f'\n  <div class="rt-lesson-layout">'
        )
        if target in html:
            html = html.replace(target, replacement, 1)
            changes.append('T7')

    # === Task 8: Move fun-fact after video ===
    fun_fact, html_clean = extract_fun_fact(html)
    if fun_fact:
        video_end = find_video_end(html_clean)
        if video_end != -1:
            html = html_clean[:video_end] + '\n\n' + fun_fact + '\n' + html_clean[video_end:]
            changes.append('T8')
        # else: no video section, keep fun-fact in original position (html unchanged)

    # === Update lesson tag text ===
    tag_pat = re.compile(r'(<span class="rt-lesson-tag"[^>]*>)[^<]*(</span>)')
    def tag_repl(m):
        attrs = m.group(1)
        if 'data-es=' not in attrs:
            attrs = attrs.replace('>', f' data-es="{mod["tag_es"]}">', 1)
        else:
            # Update existing data-es value
            attrs = re.sub(r'data-es="[^"]*"', f'data-es="{mod["tag_es"]}"', attrs)
        return attrs + mod['tag_en'] + m.group(2)
    html_new = tag_pat.sub(tag_repl, html, count=1)
    if html_new != html:
        html = html_new
        changes.append('tag')

    if html != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"  {lesson}: {', '.join(changes)}")
    else:
        print(f"  {lesson}: no changes")


def main():
    files = sorted(glob.glob(os.path.join(BASE, 'lesson-*.html')))
    print(f"Processing {len(files)} lesson files...")
    for f in files:
        process(f)
    print("\nDone! All tasks applied.")


if __name__ == '__main__':
    main()
