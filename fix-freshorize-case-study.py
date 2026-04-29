"""
Replace Success Stories placeholder with Freshorize case study.
Updates: generated/content-phase1-module7.json + phase1-lessons/lesson-7-4*.json
         + output/lessons/lesson-7-4.html
"""
import io, sys, json, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from html import escape as h_escape

NEW_EN_HTML = (
'<p>International founders have used UCF BIP to launch and grow U.S. operations across a range of industries. '
'Here is a recent graduate of the UCF BIP Soft Landing Program:</p>'
'<h3>Case Study: Freshorize</h3>'
'<p><strong>Founded:</strong> 2002 &nbsp;·&nbsp; '
'<strong>Industry:</strong> Airline hygiene &amp; wellbeing products &nbsp;·&nbsp; '
'<strong>Products:</strong> Hand soaps, lotions, sanitizers, aircraft interior cleaners, wellbeing line</p>'
'<h4>The Challenge</h4>'
'<p>Freshorize had strong success in Europe but faced a major constraint:</p>'
'<ul>'
'<li>Market was mature and saturated</li>'
'<li>Limited room for meaningful growth</li>'
'<li>Needed access to large U.S. airline customers</li>'
'<li>Lacked local market entry pathways and relationships</li>'
'</ul>'
'<h4>The Opportunity</h4>'
'<p>Freshorize joined the UCF Soft Landing Program to:</p>'
'<ul>'
'<li>Enter the U.S. aviation market strategically</li>'
'<li>Build credibility with major airline buyers</li>'
'<li>Access structured market entry support and networks</li>'
'<li>Position for large-scale procurement opportunities</li>'
'</ul>'
'<h4>What Changed</h4>'
'<p>With support from the program, Freshorize:</p>'
'<ul>'
'<li>Gained market access and introductions to key decision-makers</li>'
'<li>Refined positioning for U.S. airline procurement standards</li>'
'<li>Navigated early-stage trust barriers in a new market</li>'
'<li>Leveraged incubation support to accelerate business development</li>'
'</ul>'
'<h4>Results</h4>'
'<ul>'
'<li>Secured contracts with major U.S. airlines including Delta Air Lines and United Airlines</li>'
'<li>Successfully expanded from a Europe-centric business into the U.S. aviation market</li>'
'<li>Established a scalable growth pathway beyond its original geography</li>'
'<li>Recently graduated from the UCF BIP Soft Landing Program</li>'
'</ul>'
'<blockquote><p><strong>Key Takeaway:</strong> International growth is not just about having a strong product, '
'it\'s about access, credibility, and the right entry system. The UCF BIP Soft Landing Program provided '
'the bridge from "proven in Europe" to "trusted in the U.S. market."</p></blockquote>'
)

NEW_ES_HTML = (
'<p>Los fundadores internacionales han utilizado UCF BIP para lanzar y crecer sus operaciones en EE.UU. '
'en una variedad de industrias. Aquí presentamos a un graduado reciente del Programa Soft Landing de UCF BIP:</p>'
'<h3>Caso de Estudio: Freshorize</h3>'
'<p><strong>Fundada:</strong> 2002 &nbsp;·&nbsp; '
'<strong>Industria:</strong> Productos de higiene y bienestar para aerolíneas &nbsp;·&nbsp; '
'<strong>Productos:</strong> Jabones de manos, lociones, desinfectantes, limpiadores de interiores '
'de aeronaves, línea de bienestar</p>'
'<h4>El Desafío</h4>'
'<p>Freshorize había tenido un fuerte éxito en Europa, pero enfrentaba una restricción importante:</p>'
'<ul>'
'<li>El mercado estaba maduro y saturado</li>'
'<li>Espacio limitado para un crecimiento significativo</li>'
'<li>Necesitaba acceso a grandes aerolíneas estadounidenses</li>'
'<li>Carecía de vías locales de entrada al mercado y de relaciones</li>'
'</ul>'
'<h4>La Oportunidad</h4>'
'<p>Freshorize se unió al Programa Soft Landing de UCF para:</p>'
'<ul>'
'<li>Entrar estratégicamente al mercado de aviación de EE.UU.</li>'
'<li>Construir credibilidad con compradores de grandes aerolíneas</li>'
'<li>Acceder a apoyo estructurado de entrada al mercado y a redes de contactos</li>'
'<li>Posicionarse para oportunidades de adquisición a gran escala</li>'
'</ul>'
'<h4>Lo Que Cambió</h4>'
'<p>Con el apoyo del programa, Freshorize:</p>'
'<ul>'
'<li>Obtuvo acceso al mercado e introducciones a tomadores de decisiones clave</li>'
'<li>Refinó su posicionamiento para los estándares de adquisición de aerolíneas estadounidenses</li>'
'<li>Navegó las barreras de confianza en sus etapas iniciales en un nuevo mercado</li>'
'<li>Aprovechó el apoyo de incubación para acelerar el desarrollo de negocios</li>'
'</ul>'
'<h4>Resultados</h4>'
'<ul>'
'<li>Aseguró contratos con grandes aerolíneas estadounidenses, incluyendo Delta Air Lines y United Airlines</li>'
'<li>Expandió con éxito su negocio centrado en Europa al mercado de aviación de EE.UU.</li>'
'<li>Estableció una vía de crecimiento escalable más allá de su geografía original</li>'
'<li>Recientemente se graduó del Programa Soft Landing de UCF BIP</li>'
'</ul>'
'<blockquote><p><strong>Conclusión Clave:</strong> El crecimiento internacional no se trata sólo de '
'tener un producto sólido, se trata de acceso, credibilidad y el sistema de entrada adecuado. '
'El Programa Soft Landing de UCF BIP fue el puente entre "comprobado en Europa" y '
'"confiado en el mercado de EE.UU.".</p></blockquote>'
)

# Word count for content JSON metadata
new_word_count = len(re.sub(r'<[^>]+>', ' ', NEW_EN_HTML).split())

# ─── Layer 1: generated/content-phase1-module7.json ───
print('=== Layer 1: generated/content-phase1-module7.json ===')
for path in ['generated/content-phase1-module7.json', 'generated/content-phase1-module-7.json']:
    try:
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
    except FileNotFoundError:
        continue
    found = False
    for l in d.get('lessons', []):
        if l.get('lessonId') != 'lesson-7-4': continue
        for b in l.get('contentBlocks', []):
            if b.get('id') == 'text-7-4-cs':
                b['content'] = NEW_EN_HTML
                b['wordCount'] = new_word_count
                found = True
                print(f'  patched {path} -> text-7-4-cs (wc={new_word_count})')
    if found:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(d, f, indent=2, ensure_ascii=False)

# ─── Layer 2: phase1-lessons/lesson-7-4.json + -es.json ───
print('\n=== Layer 2: phase1-lessons/lesson-7-4*.json ===')
import os
for path, html_to_set in [
    ('phase1-lessons/lesson-7-4.json', NEW_EN_HTML),
    ('phase1-lessons/lesson-7-4-es.json', NEW_ES_HTML),
]:
    if not os.path.exists(path): continue
    with open(path, encoding='utf-8') as f:
        d = json.load(f)
    blocks = d.get('contentBlocks') or d.get('blocks') or d.get('sections') or []
    patched = False
    for b in blocks:
        if b.get('id') == 'text-7-4-cs':
            b['content'] = html_to_set
            patched = True
    if patched:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(d, f, indent=2, ensure_ascii=False)
        print(f'  patched {path}')
    else:
        print(f'  no text-7-4-cs block found in {path}')

# ─── Layer 3: output/lessons/lesson-7-4.html ───
print('\n=== Layer 3: output/lessons/lesson-7-4.html ===')
with open('output/lessons/lesson-7-4.html', encoding='utf-8') as f:
    html = f.read()

# Block format:
#   <div data-es-html="ENCODED-ES-HTML">
#   <p>EN HTML wrapped in extra <p>...</p></p>
#   </div>
# We need to find the specific div that contains "PENDING: Brian to provide" and replace.
# The div opens with `<div data-es-html="..."` and ends with `</div>` before the next block.

# Build regex: find the div whose data-es-html contains the placeholder Spanish marker
# (we anchored on "PENDIENTE" to avoid touching other blocks)
pattern = re.compile(
    r'<div data-es-html="[^"]*PENDIENTE[^"]*"[^>]*>'
    r'.*?'
    r'</div>',
    re.DOTALL
)
m = pattern.search(html)
if not m:
    print('  ERROR: could not find target div')
    sys.exit(1)
print(f'  found block at offset {m.start()}, replacing {m.end()-m.start()} chars')

# Build replacement - use html.escape with quote=True to encode quotes
es_attr = h_escape(NEW_ES_HTML, quote=True)
replacement = f'<div data-es-html="{es_attr}">{NEW_EN_HTML}</div>'

new_html = html[:m.start()] + replacement + html[m.end():]
with open('output/lessons/lesson-7-4.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
print('  patched lesson-7-4.html')

print('\nDONE')
