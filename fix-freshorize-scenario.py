"""
Convert Freshorize case study from flat text → engaging interactive scenario.
Restructure lesson-7-4 'Success Stories' section into 3 blocks:
  1. text-7-4-cs        : tight intro (Freshorize at the crossroads)
  2. scenario-7-4-cs    : "Step Into Freshorize's Shoes" — 4-choice decision
  3. text-7-4-cs-results: reveal of Freshorize's results + Key Takeaway

Updates: generated/content-phase1-module7.json + phase1-lessons/lesson-7-4*.json + output/lessons/lesson-7-4.html
"""
import io, sys, json, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from html import escape as h_escape

# ─── Block 1: Tight intro ────────────────────────────────────────────
INTRO_EN = (
'<p>International founders have used UCF BIP to launch and grow U.S. operations across a range of industries. '
'Here is a recent graduate of the UCF BIP Soft Landing Program facing a familiar crossroads:</p>'
'<h3>Case Study: Freshorize</h3>'
'<p><strong>Founded:</strong> 2002 &nbsp;·&nbsp; '
'<strong>Industry:</strong> Airline hygiene &amp; wellbeing products &nbsp;·&nbsp; '
'<strong>Products:</strong> Hand soaps, lotions, sanitizers, aircraft interior cleaners, wellbeing line</p>'
'<p>Freshorize had strong success in Europe but hit a ceiling. The EU airline supply market was mature and saturated, '
'meaningful growth was stalling, and the largest opportunities sat with U.S. carriers. The problem: no U.S. customers, '
'no procurement track record with American airlines, and no warm introductions. They needed a way in.</p>'
)
INTRO_ES = (
'<p>Los fundadores internacionales han utilizado UCF BIP para lanzar y crecer sus operaciones en EE.UU. en una variedad de industrias. '
'Aquí presentamos a un graduado reciente del Programa Soft Landing de UCF BIP enfrentando una encrucijada conocida:</p>'
'<h3>Caso de Estudio: Freshorize</h3>'
'<p><strong>Fundada:</strong> 2002 &nbsp;·&nbsp; '
'<strong>Industria:</strong> Productos de higiene y bienestar para aerolíneas &nbsp;·&nbsp; '
'<strong>Productos:</strong> Jabones de manos, lociones, desinfectantes, limpiadores de interiores de aeronaves, línea de bienestar</p>'
'<p>Freshorize tenía un fuerte éxito en Europa pero llegó a un techo. El mercado europeo de suministros para aerolíneas estaba maduro y saturado, '
'el crecimiento significativo se estancaba, y las mayores oportunidades estaban con las aerolíneas estadounidenses. El problema: ningún cliente en EE.UU., '
'ningún historial de adquisiciones con aerolíneas americanas, y ninguna introducción de confianza. Necesitaban una forma de entrar.</p>'
)

# ─── Block 2: Scenario ────────────────────────────────────────────────
SCENARIO_BLOCK = {
    "type": "scenario",
    "id": "scenario-7-4-freshorize",
    "title": "Step Into Freshorize's Shoes",
    "titleEs": "Póngase en los Zapatos de Freshorize",
    "description": (
        "It's 2020. You run Freshorize — a European airline hygiene company founded in 2002. "
        "Your products are strong, your European brand is solid, but the EU market is saturated and growth has stalled. "
        "You want into the U.S. aviation market where the largest airlines are, but you have no U.S. customers, "
        "no procurement track record with American airlines, and no warm introductions. What is your next move?"
    ),
    "descriptionEs": (
        "Es 2020. Usted dirige Freshorize, una empresa europea de higiene para aerolíneas fundada en 2002. "
        "Sus productos son sólidos, su marca europea es firme, pero el mercado europeo está saturado y el crecimiento se ha estancado. "
        "Quiere entrar al mercado de aviación de EE.UU. donde están las aerolíneas más grandes, pero no tiene clientes en EE.UU., "
        "ningún historial de adquisiciones con aerolíneas americanas, ni introducciones de confianza. ¿Cuál es su próximo paso?"
    ),
    "paths": [
        {
            "label": "Join a structured U.S. market entry program with airline industry connections, even though it means time and a learning curve",
            "labelEs": "Unirse a un programa estructurado de entrada al mercado de EE.UU. con conexiones en la industria aérea, aunque implique tiempo y una curva de aprendizaje",
            "outcome": (
                "Correct. This is what Freshorize chose. They joined the UCF BIP Soft Landing Program in Orlando. "
                "Why it worked: airline procurement teams do not take meetings with unknown international suppliers, "
                "they need warm introductions and credibility signals like compliance, traceability, and supplier history. "
                "The program provided the network access and the procurement-readiness coaching needed to clear those gates. "
                "Outcome: contracts with Delta Air Lines and United Airlines, plus a scalable U.S. growth pathway."
            ),
            "outcomeEs": (
                "Correcto. Esto es lo que Freshorize eligió. Se unieron al Programa Soft Landing de UCF BIP en Orlando. "
                "Por qué funcionó: los equipos de adquisiciones de aerolíneas no toman reuniones con proveedores internacionales desconocidos, "
                "necesitan introducciones de confianza y señales de credibilidad como cumplimiento, trazabilidad e historial de proveedor. "
                "El programa les brindó el acceso a la red y la preparación para adquisiciones que necesitaban para superar esas barreras. "
                "Resultado: contratos con Delta Air Lines y United Airlines, además de un camino de crecimiento escalable en EE.UU."
            ),
            "isRecommended": True,
        },
        {
            "label": "Hire a U.S.-based salesperson and run direct outreach to airline procurement teams",
            "labelEs": "Contratar a un vendedor con base en EE.UU. y hacer alcance directo a los equipos de adquisiciones de aerolíneas",
            "outcome": (
                "This is what most international founders try first, and it usually stalls. Airline buyers receive hundreds of cold outreach attempts. "
                "Without warm introductions through industry channels, even a strong U.S. salesperson would spend 12 to 18 months before securing meetings, "
                "often without ever closing a contract. Direct outreach without credibility signals does not work in regulated procurement environments. "
                "The cost of the failed strategy is rarely just the salesperson's salary, it is the lost market window."
            ),
            "outcomeEs": (
                "Esto es lo que la mayoría de los fundadores internacionales intentan primero, y suele estancarse. Los compradores de aerolíneas reciben cientos de intentos de contacto en frío. "
                "Sin introducciones de confianza a través de canales de la industria, incluso un vendedor sólido en EE.UU. pasaría de 12 a 18 meses antes de conseguir reuniones, "
                "a menudo sin cerrar nunca un contrato. El alcance directo sin señales de credibilidad no funciona en entornos de adquisiciones reguladas. "
                "El costo de la estrategia fallida rara vez es sólo el salario del vendedor, es la ventana de mercado perdida."
            ),
            "isRecommended": False,
        },
        {
            "label": "Lower prices significantly to undercut U.S. incumbents and win on cost",
            "labelEs": "Bajar los precios significativamente para superar a los competidores establecidos en EE.UU. y ganar por costo",
            "outcome": (
                "This is a common instinct but a poor fit for the airline category. U.S. airline procurement decisions weight compliance, traceability, "
                "and supplier reliability over price. Aggressive lower pricing in this market often signals 'lower quality' or 'unstable supplier' to buyers. "
                "Established suppliers will also match aggressive pricing if needed, and they are protected by long-term procurement contracts and switching costs. "
                "Pricing as the entry strategy in regulated B2B sectors typically fails to produce a sustainable position."
            ),
            "outcomeEs": (
                "Este es un instinto común pero un mal ajuste para la categoría de aerolíneas. Las decisiones de adquisiciones de aerolíneas estadounidenses ponderan cumplimiento, trazabilidad "
                "y confiabilidad del proveedor por encima del precio. Precios bajos agresivos en este mercado a menudo señalan 'menor calidad' o 'proveedor inestable' a los compradores. "
                "Los proveedores establecidos también igualarán precios agresivos si es necesario, y están protegidos por contratos de adquisición a largo plazo y costos de cambio. "
                "El precio como estrategia de entrada en sectores B2B regulados típicamente no produce una posición sostenible."
            ),
            "isRecommended": False,
        },
        {
            "label": "Stay in Europe and pivot to a different product category to reignite growth at home",
            "labelEs": "Permanecer en Europa y pivotar a una categoría de producto diferente para reactivar el crecimiento en casa",
            "outcome": (
                "This avoids the U.S. challenge entirely, but it does not solve the underlying problem: a saturated home market with no clear growth ceiling. "
                "Pivoting product categories is a legitimate strategy in some cases, but it does not address geographic concentration risk. "
                "Freshorize's products were strong, the constraint was geography, not the product itself. "
                "The U.S. market represents the largest airline procurement opportunity globally, and avoiding it leaves significant value on the table."
            ),
            "outcomeEs": (
                "Esto evita el desafío de EE.UU. por completo, pero no resuelve el problema subyacente: un mercado local saturado sin un techo de crecimiento claro. "
                "Pivotar a categorías de producto es una estrategia legítima en algunos casos, pero no aborda el riesgo de concentración geográfica. "
                "Los productos de Freshorize eran sólidos, la restricción era la geografía, no el producto en sí. "
                "El mercado de EE.UU. representa la mayor oportunidad de adquisiciones de aerolíneas a nivel mundial, y evitarlo deja un valor significativo sobre la mesa."
            ),
            "isRecommended": False,
        },
    ],
}

# ─── Block 3: Reveal — Results + Key Takeaway ────────────────────────
RESULTS_EN = (
'<h3>What Freshorize Actually Did, and What It Yielded</h3>'
'<p>Freshorize chose the program path. With UCF BIP support, they:</p>'
'<ul>'
'<li>Refined positioning and supplier credentials for U.S. airline procurement standards</li>'
'<li>Got warm introductions to procurement decision-makers at major U.S. carriers</li>'
'<li>Navigated early-stage trust barriers without burning through capital on cold outreach</li>'
'<li>Built a repeatable sales motion, not a one-off win</li>'
'</ul>'
'<p>The results:</p>'
'<ul>'
'<li>Secured contracts with major U.S. airlines including <strong>Delta Air Lines</strong> and <strong>United Airlines</strong></li>'
'<li>Successfully expanded from a Europe-centric business into the U.S. aviation market</li>'
'<li>Established a scalable growth pathway beyond their original geography</li>'
'<li>Recently graduated from the UCF BIP Soft Landing Program</li>'
'</ul>'
'<blockquote><p><strong>Key Takeaway:</strong> International growth is not just about having a strong product, '
'it is about access, credibility, and the right entry system. The UCF BIP Soft Landing Program provided '
'the bridge from "proven in Europe" to "trusted in the U.S. market."</p></blockquote>'
)
RESULTS_ES = (
'<h3>Lo Que Freshorize Realmente Hizo, y Lo Que Logró</h3>'
'<p>Freshorize eligió la opción del programa. Con el apoyo de UCF BIP:</p>'
'<ul>'
'<li>Refinaron su posicionamiento y credenciales de proveedor para los estándares de adquisición de aerolíneas estadounidenses</li>'
'<li>Obtuvieron introducciones de confianza con tomadores de decisiones de adquisiciones en grandes aerolíneas de EE.UU.</li>'
'<li>Navegaron las barreras de confianza en sus etapas iniciales sin agotar capital en alcance en frío</li>'
'<li>Construyeron un proceso de ventas repetible, no una victoria única</li>'
'</ul>'
'<p>Los resultados:</p>'
'<ul>'
'<li>Aseguraron contratos con grandes aerolíneas estadounidenses, incluyendo <strong>Delta Air Lines</strong> y <strong>United Airlines</strong></li>'
'<li>Expandieron con éxito su negocio centrado en Europa al mercado de aviación de EE.UU.</li>'
'<li>Establecieron una vía de crecimiento escalable más allá de su geografía original</li>'
'<li>Recientemente se graduaron del Programa Soft Landing de UCF BIP</li>'
'</ul>'
'<blockquote><p><strong>Conclusión Clave:</strong> El crecimiento internacional no se trata sólo de tener un producto sólido, '
'se trata de acceso, credibilidad y el sistema de entrada adecuado. El Programa Soft Landing de UCF BIP fue '
'el puente entre "comprobado en Europa" y "confiado en el mercado de EE.UU.".</p></blockquote>'
)

# Build content JSON blocks
def build_intro_block():
    return {
        "type": "text",
        "id": "text-7-4-cs",
        "title": "Success Stories: Companies That Benefited from UCF BIP",
        "content": INTRO_EN,
        "wordCount": len(re.sub(r'<[^>]+>', ' ', INTRO_EN).split()),
    }

def build_results_block():
    return {
        "type": "text",
        "id": "text-7-4-cs-results",
        "title": "What Freshorize Actually Did, and What It Yielded",
        "content": RESULTS_EN,
        "wordCount": len(re.sub(r'<[^>]+>', ' ', RESULTS_EN).split()),
    }

# ─── Layer 1: generated/content-phase1-module7.json ───
print('=== Layer 1: generated/content-phase1-module7.json ===')
for path in ['generated/content-phase1-module7.json', 'generated/content-phase1-module-7.json']:
    try:
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
    except FileNotFoundError:
        continue
    for l in d.get('lessons', []):
        if l.get('lessonId') != 'lesson-7-4': continue
        blocks = l.get('contentBlocks', [])
        # Find existing text-7-4-cs block index
        cs_idx = None
        for i, b in enumerate(blocks):
            if b.get('id') == 'text-7-4-cs':
                cs_idx = i
                break
        if cs_idx is None:
            print(f'  WARN: text-7-4-cs not found in {path}')
            continue
        # Replace text-7-4-cs with intro, insert scenario + results after
        blocks[cs_idx] = build_intro_block()
        # Remove any existing scenario-7-4-freshorize / text-7-4-cs-results to avoid duplicates
        blocks = [b for b in blocks if b.get('id') not in ('scenario-7-4-freshorize', 'text-7-4-cs-results')]
        # Re-find cs_idx after possible removals
        for i, b in enumerate(blocks):
            if b.get('id') == 'text-7-4-cs':
                cs_idx = i
                break
        blocks.insert(cs_idx + 1, SCENARIO_BLOCK)
        blocks.insert(cs_idx + 2, build_results_block())
        l['contentBlocks'] = blocks
        print(f'  {path}: replaced text-7-4-cs + added scenario + results block')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

# ─── Layer 2: phase1-lessons overlays ───
print('\n=== Layer 2: phase1-lessons/lesson-7-4*.json ===')
import os
for path, intro_html, results_html in [
    ('phase1-lessons/lesson-7-4.json', INTRO_EN, RESULTS_EN),
    ('phase1-lessons/lesson-7-4-es.json', INTRO_ES, RESULTS_ES),
]:
    if not os.path.exists(path): continue
    with open(path, encoding='utf-8') as f:
        d = json.load(f)
    blocks = d.get('contentBlocks') or d.get('blocks') or d.get('sections') or []
    for b in blocks:
        if b.get('id') == 'text-7-4-cs':
            b['content'] = intro_html
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
    print(f'  patched {path}')

# ─── Layer 3: output/lessons/lesson-7-4.html ────
print('\n=== Layer 3: output/lessons/lesson-7-4.html ===')
with open('output/lessons/lesson-7-4.html', encoding='utf-8') as f:
    html = f.read()

# Find current div containing the case study (anchored on "Freshorize" since the placeholders are gone)
# Pattern: from `<h2 data-es="Casos de Éxito ...">Success Stories...</h2>` to the closing `</div>` of its data-es-html sibling
# Better: find the h2, then the next div with data-es-html, then close.

# Locate the h2
m_h2 = re.search(r'<h2 data-es="Casos de Éxito[^"]*"[^>]*>Success Stories[^<]*</h2>', html)
assert m_h2, 'could not find Success Stories h2'

# The wrapper div with data-es-html that follows it (single line in this lesson)
m_div = re.search(r'<div data-es-html="[^"]*"[^>]*>.*?</div>', html[m_h2.end():], re.DOTALL)
assert m_div, 'could not find following div'

start = m_h2.start()
end = m_h2.end() + m_div.end()
print(f'  replacing offset {start}..{end} ({end-start} chars)')

# Build replacement HTML
def esc_attr(s):
    return h_escape(s, quote=True)

def render_intro():
    return (
        f'<h2 data-es="Casos de Éxito: Empresas Que Se Beneficiaron de UCF BIP">Success Stories: Companies That Benefited from UCF BIP</h2>\n'
        f'<div data-es-html="{esc_attr(INTRO_ES)}">{INTRO_EN}</div>\n'
    )

def render_scenario():
    sb = SCENARIO_BLOCK
    sid = 'branch-' + sb['id']
    out = []
    out.append(f'<div class="rt-scenario" data-scenario-id="{sid}">')
    out.append(f'  <h3 data-es="{esc_attr(sb["titleEs"])}">{sb["title"]}</h3>')
    out.append(f'  <div class="rt-scenario-context"><p data-es="{esc_attr(sb["descriptionEs"])}">{sb["description"]}</p></div>')
    out.append(f'  <div class="rt-scenario-choices">')
    for i, p in enumerate(sb['paths']):
        is_good = 'true' if p.get('isRecommended') else 'false'
        out.append(
            f'    <button class="scenario-choice" onclick="makeBranchingChoice(\'{sid}\', {i})" '
            f'data-outcome="{esc_attr(p["outcome"])}" '
            f'data-outcome-es="{esc_attr(p["outcomeEs"])}" '
            f'data-is-good="{is_good}" data-is-end="true">'
        )
        out.append(f'      <strong data-es="{esc_attr(p["labelEs"])}">{p["label"]}</strong>')
        out.append(f'    </button>')
    out.append(f'  </div>')
    out.append(f'  <div class="scenario-feedback" id="{sid}-feedback" aria-live="polite" role="status"></div>')
    out.append(f'</div>')
    return '\n'.join(out) + '\n'

def render_results():
    return f'<div data-es-html="{esc_attr(RESULTS_ES)}">{RESULTS_EN}</div>\n'

replacement = render_intro() + render_scenario() + render_results()

new_html = html[:start] + replacement + html[end:]
with open('output/lessons/lesson-7-4.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

# Sanity report
print('  patched lesson-7-4.html')
print(f'  intro:    {len(INTRO_EN)} chars')
print(f'  scenario: 4 paths, 1 recommended')
print(f'  results:  {len(RESULTS_EN)} chars')

print('\nDONE')
