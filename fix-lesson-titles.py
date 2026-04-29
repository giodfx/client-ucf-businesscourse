"""
Fix lesson titles across all 4 layers to match April 27 approved doc.

Source of truth: Feedback/April27/1 UCF-BusinessCourse-Content-Review-Updated.docx
"""
import io, sys, re, json, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pathlib import Path
from html import escape as html_escape

# Canonical titles per April 27 doc (EN), with parallel ES translations
# Format: {lesson_id: (EN_title, ES_title)}
CANONICAL = {
    'lesson-0-1': ('What To Expect And How To Use This Program', 'Qué Esperar y Cómo Usar Este Programa'),
    'lesson-1-1': ('Choosing Your U.S. Business Entity', 'Cómo Elegir Su Entidad Empresarial en EE.UU.'),
    'lesson-1-2': ('Registering with SunBiz — Step by Step', 'Cómo Registrarse en SunBiz — Paso a Paso'),
    'lesson-1-3': ('Banking Basics for International Founders', 'Aspectos Básicos de la Banca para Fundadores Internacionales'),
    'lesson-2-1': ('Federal and State Taxes — What You Actually Owe', 'Impuestos Federales y Estatales — Lo Que Realmente Debe'),
    'lesson-2-2': ('Sales Tax, Accounting, and Keeping the Books', 'Impuesto Sobre las Ventas, Contabilidad y Llevar los Libros'),
    'lesson-2-3': ('Banking Deep Dive — The Reality for International Founders', 'Banca a Profundidad — La Realidad para los Fundadores Internacionales'),
    'lesson-3-1': ('Intellectual Property — Protecting Your Ideas in the U.S.', 'Propiedad Intelectual — Cómo Proteger Sus Ideas en EE.UU.'),
    'lesson-3-2': ('Insurance and Risk Management', 'Seguros y Gestión de Riesgos'),
    'lesson-3-3': ('Contracts and When You Need a Lawyer', 'Contratos y Cuándo Necesita un Abogado'),
    'lesson-4-1': ('Your First U.S. Hire — Contractor vs. Employee', 'Su Primera Contratación en EE.UU. — Contratista vs. Empleado'),
    'lesson-4-2': ("Visa Pathways — What's Actually Realistic", 'Vías de Visa — Lo Que Realmente Es Realista'),
    'lesson-4-3': ('Payroll, Taxes, and Employer Obligations', 'Nómina, Impuestos y Obligaciones del Empleador'),
    'lesson-5-1': ('Adapting Your Product for the U.S.', 'Cómo Adaptar Su Producto para EE.UU.'),
    'lesson-5-2': ('Customer Acquisition and Selling to U.S. Companies', 'Adquisición de Clientes y Cómo Vender a Empresas en EE.UU.'),
    'lesson-6-1': ('Communication Styles — What Americans Actually Mean', 'Estilos de Comunicación — Lo Que Realmente Quieren Decir los Estadounidenses'),
    'lesson-6-2': ('Meetings, Networking, and Building Trust', 'Reuniones, Networking y Cómo Construir Confianza'),
    'lesson-6-3': ('Cultural Missteps That Cost Real Money', 'Errores Culturales Que Cuestan Dinero Real'),
    'lesson-7-1': ('Business Support Organizations Available to Help You', 'Organizaciones de Apoyo Empresarial Disponibles para Ayudarle'),
    'lesson-7-2': ('Central Florida — Why This Market Works for Founders', 'Florida Central — Por Qué Este Mercado Funciona para los Fundadores'),
    'lesson-7-3': ('Central Florida by the Numbers — (Data That Impacts Your Runway)', 'Florida Central en Cifras — (Datos Que Impactan Su Runway)'),
    'lesson-7-4': ('UCF BIP Programs: Your Next Step', 'Programas UCF BIP: Su Próximo Paso'),
    'lesson-8-1': ('Self-Assessment — Are You Ready?', 'Autoevaluación — ¿Está Listo?'),
    'lesson-8-2': ('Resource Downloads & Next Steps', 'Descargas de Recursos y Próximos Pasos'),
    'lesson-8-3': ('Next Steps: Your UCF BIP Pathway', 'Próximos Pasos: Su Camino con UCF BIP'),
}

# ──────────────────────────────────────────────────────────────────
# 1. Update generated/content-phase1-module*.json
# ──────────────────────────────────────────────────────────────────
print('=== Layer 1: generated/content-phase1-module*.json ===')
for path in sorted(glob.glob('generated/content-phase1-module*.json')):
    with open(path, encoding='utf-8') as f:
        d = json.load(f)
    changed = False
    for l in d.get('lessons', []):
        lid = l.get('lessonId')
        if lid in CANONICAL:
            new_en, new_es = CANONICAL[lid]
            if l.get('title') != new_en:
                print(f'  {lid}: "{l.get("title")}" -> "{new_en}"')
                l['title'] = new_en
                changed = True
            if 'titleEs' in l and l.get('titleEs') != new_es:
                l['titleEs'] = new_es
                changed = True
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(d, f, indent=2, ensure_ascii=False)
        print(f'  -> wrote {path}')

# ──────────────────────────────────────────────────────────────────
# 2. Update blueprint.json
# ──────────────────────────────────────────────────────────────────
print('\n=== Layer 2: blueprint.json ===')
with open('blueprint.json', encoding='utf-8') as f:
    bp = json.load(f)
def walk(obj):
    if isinstance(obj, dict):
        if 'id' in obj and obj['id'] in CANONICAL and 'title' in obj:
            new = CANONICAL[obj['id']][0]
            if obj['title'] != new:
                print(f'  {obj["id"]}: "{obj["title"]}" -> "{new}"')
                obj['title'] = new
        for v in obj.values():
            walk(v)
    elif isinstance(obj, list):
        for x in obj:
            walk(x)
walk(bp)
with open('blueprint.json', 'w', encoding='utf-8') as f:
    json.dump(bp, f, indent=2, ensure_ascii=False)
print('  -> wrote blueprint.json')

# Also try blueprint-v1-content-pure.json
for bp_path in ['blueprint-v1-content-pure.json']:
    if Path(bp_path).exists():
        with open(bp_path, encoding='utf-8') as f:
            bp = json.load(f)
        walk(bp)
        with open(bp_path, 'w', encoding='utf-8') as f:
            json.dump(bp, f, indent=2, ensure_ascii=False)
        print(f'  -> wrote {bp_path}')

# ──────────────────────────────────────────────────────────────────
# 3. Update output/lessons/lesson-*.html (H1 + sidebar + <title>)
# ──────────────────────────────────────────────────────────────────
print('\n=== Layer 3: output/lessons/lesson-*.html ===')
sidebar_pat = re.compile(
    r'(<li class="rt-route-stop[^"]*" data-lesson-id="(lesson-\d+-\d+)">\s*'
    r'<span class="rt-stop-dot"[^>]*></span>\s*'
    r'<a href="[^"]+" class="rt-stop-link[^"]*"[^>]*>)([^<]+)(</a>)'
)
h1_pat = re.compile(
    r'(<h1 class="rt-lesson-title"[^>]*?data-es=)"([^"]*)"([^>]*>)([^<]+)(</h1>)'
)
title_pat = re.compile(r'(<title>)([^<]+)( - U\.S\. Market Readiness Program</title>)')

mod_intro_h2_pat = re.compile(
    r'(<h2 class="rt-module-intro-title"[^>]*?data-es=)"([^"]*)"([^>]*>)([^<]+)(</h2>)'
)

for path in sorted(glob.glob('output/lessons/lesson-*.html')):
    lid = Path(path).stem
    if lid not in CANONICAL:
        continue
    new_en, new_es = CANONICAL[lid]
    with open(path, encoding='utf-8') as f:
        html = f.read()
    orig = html

    # 3a. H1 of THIS lesson
    def fix_h1(m):
        return f'{m.group(1)}"{new_es}"{m.group(3)}{new_en}{m.group(5)}'
    html = h1_pat.sub(fix_h1, html, count=1)

    # 3b. <title> tag
    def fix_title(m):
        return f'{m.group(1)}{new_en}{m.group(3)}'
    html = title_pat.sub(fix_title, html, count=1)

    # 3c. Sidebar — fix EVERY rt-stop-link in this file (for all sibling lessons)
    def fix_sidebar(m):
        sib_lid = m.group(2)
        if sib_lid in CANONICAL:
            sib_en = CANONICAL[sib_lid][0]
            return f'{m.group(1)}{html_escape(sib_en, quote=False)}{m.group(4)}'
        return m.group(0)
    html = sidebar_pat.sub(fix_sidebar, html)

    if html != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'  patched {lid}')

# ──────────────────────────────────────────────────────────────────
# 4. Update phase1-lessons/lesson-*.json (Spanish overlays + base)
# ──────────────────────────────────────────────────────────────────
print('\n=== Layer 4: phase1-lessons/*.json ===')
for path in sorted(glob.glob('phase1-lessons/*.json')):
    name = Path(path).stem
    is_es = name.endswith('-es')
    lid = name[:-3] if is_es else name
    if lid not in CANONICAL:
        continue
    new_en, new_es = CANONICAL[lid]
    new_title = new_es if is_es else new_en
    try:
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
    except Exception:
        continue
    if 'title' in d and d['title'] != new_title:
        d['title'] = new_title
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(d, f, indent=2, ensure_ascii=False)
        print(f'  patched {name}: title -> "{new_title}"')

print('\nDONE')
