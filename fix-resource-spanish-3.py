"""
Round 3 — handle mixed-content elements (text + child tags) via data-es-html.
Focus: visible content paragraphs and step descriptions in roadmap/worksheet/guide.
Also: H2 numbered module headers in checklist that have <span> + text.
"""
import io, sys, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from bs4 import BeautifulSoup, NavigableString

# Mixed-content translations: HTML in, HTML out
# Each entry maps EN HTML (inner HTML of an element) -> ES HTML
TH = {
    # ── checklist: H2 numbered headers (span + text) ──
    '<span class="num">1</span> Legal Foundation':
        '<span class="num">1</span> Fundamentos Legales',
    '<span class="num">2</span> Tax &amp; Financial Compliance':
        '<span class="num">2</span> Cumplimiento Fiscal y Financiero',
    '<span class="num">3</span> Risk &amp; Insurance':
        '<span class="num">3</span> Riesgo y Seguros',
    '<span class="num">4</span> Team &amp; HR':
        '<span class="num">4</span> Equipo y Recursos Humanos',
    '<span class="num">5</span> Market Entry &amp; Sales':
        '<span class="num">5</span> Entrada al Mercado y Ventas',
    '<span class="num">6</span> Business Culture &amp; Communication':
        '<span class="num">6</span> Cultura Empresarial y Comunicación',
    '<span class="num">7</span> Florida Ecosystem &amp; Networking':
        '<span class="num">7</span> Ecosistema de Florida y Networking',

    # ── worksheet intro paragraphs ──
    'This is your honest self-assessment before committing to U.S. market entry. Score each dimension from <strong>1 (Not Ready)</strong> to <strong>5 (Fully Ready)</strong>. There are no wrong answers — a low score tells you what to strengthen before entering, not that you should give up.':
        'Esta es su autoevaluación honesta antes de comprometerse con la entrada al mercado estadounidense. Califique cada dimensión de <strong>1 (No Listo)</strong> a <strong>5 (Plenamente Listo)</strong>. No hay respuestas incorrectas: una calificación baja le dice qué fortalecer antes de entrar, no que deba renunciar.',
    'A founder from Colombia scored 2/5 on financial readiness, spent four months strengthening home-market revenue, re-scored at 4, and entered the U.S. with a much stronger foundation.':
        'Un fundador de Colombia obtuvo 2/5 en preparación financiera, pasó cuatro meses fortaleciendo los ingresos en su mercado de origen, volvió a calificarse en 4 y entró a EE.UU. con una base mucho más sólida.',

    # ── guide subtitle ──
    'Directory of organizations, contacts, and programs for international founders in Central Florida':
        'Directorio de organizaciones, contactos y programas para fundadores internacionales en Florida Central',
    'Print / Save as PDF': 'Imprimir / Guardar como PDF',  # covered by data-es already, fallback
}

# Plain text translations specific to Round 3
T = {
    'Directory of organizations, contacts, and programs for international founders in Central Florida':
        'Directorio de organizaciones, contactos y programas para fundadores internacionales en Florida Central',
}

def patch_file(path):
    print(f'\n=== {os.path.basename(path)} ===')
    with open(path, encoding='utf-8') as f:
        html = f.read()
    soup = BeautifulSoup(html, 'html.parser')
    n_html = 0
    n_text = 0

    # Pass 1: data-es-html for mixed content
    for el in soup.find_all(True):
        if el.has_attr('data-es-html') or el.has_attr('data-es'):
            continue
        # Get inner HTML
        inner = el.decode_contents().strip()
        if inner in TH:
            el['data-es-html'] = TH[inner]
            n_html += 1

    # Pass 2: data-es for any new pure-text matches
    for el in soup.find_all(True):
        if el.has_attr('data-es') or el.has_attr('data-es-html'):
            continue
        children = [c for c in el.children if not (isinstance(c, NavigableString) and not str(c).strip())]
        if len(children) == 1 and isinstance(children[0], NavigableString):
            txt = str(children[0]).strip()
            if txt in T:
                el['data-es'] = T[txt]
                n_text += 1

    print(f'  +{n_html} data-es-html, +{n_text} data-es')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(str(soup))

for fname in ['resource-checklist.html', 'resource-worksheet.html', 'resource-guide.html']:
    p = f'output/lessons/resources/{fname}'
    if os.path.exists(p):
        patch_file(p)

print('\nDONE')
