"""
Add Spanish translations to the 4 resource HTML files via data-es attributes.

Each file currently has 0 data-es attributes (English only). After this pass:
  - Every translatable text element gets data-es="..." with the Spanish version
  - rt-language.js is loaded at end of body so the swap works
  - Page <title> stays English; document.title is updated by JS at runtime

Architecture: walk the parsed HTML with BeautifulSoup, look up each leaf text
in the translations dict, and add data-es to the parent element. Compound
content (mixed children) gets data-es-html on the parent.
"""
import io, sys, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from bs4 import BeautifulSoup, NavigableString

# ─── Shared translation dict — covers all 4 resource files ──────────────
T = {
    # ── Common header / footer / UI ──
    "UCF Business Incubation Program — Market Readiness Course":
        "Programa de Incubación de Empresas de UCF — Curso de Preparación para el Mercado",
    "Print / Save as PDF":
        "Imprimir / Guardar como PDF",
    "This checklist is for educational reference. Consult qualified professionals for legal, tax, and immigration advice.":
        "Esta lista de verificación es de referencia educativa. Consulte a profesionales calificados para asesoría legal, fiscal y migratoria.",
    "Timelines are estimates. Consult qualified professionals for legal, tax, and immigration guidance.":
        "Los plazos son estimaciones. Consulte a profesionales calificados para orientación legal, fiscal y migratoria.",

    # ── resource-checklist.html ──
    "U.S. Market Entry Checklist":
        "Lista de Verificación para Entrada al Mercado de EE.UU.",
    "Module-by-module action items • Check items as you complete them":
        "Lista de acciones módulo por módulo • Marque cada elemento al completarlo",

    # Module 1
    "Legal Foundation": "Fundamentos Legales",
    "Choose entity type (LLC, C-Corp, or S-Corp) based on visa and investment plans":
        "Elegir tipo de entidad (LLC, C-Corp o S-Corp) según planes de visa e inversión",
    "Register with Florida Division of Corporations (SunBiz.org)":
        "Registrarse con la División de Corporaciones de Florida (SunBiz.org)",
    "Obtain federal Employer Identification Number (EIN) from IRS":
        "Obtener Número de Identificación de Empleador federal (EIN) del IRS",
    "Designate a registered agent with a Florida street address":
        "Designar un agente registrado con dirección física en Florida",
    "Draft operating agreement (LLC) or corporate bylaws (Corp)":
        "Redactar acuerdo operativo (LLC) o estatutos corporativos (Corp)",
    "Obtain local business tax receipt (county/city license)":
        "Obtener recibo local de impuestos de negocio (licencia de condado/ciudad)",

    # Module 2
    "Tax & Financial Compliance": "Cumplimiento Fiscal y Financiero",
    "Open a U.S. business bank account (Mercury, Relay, or local bank)":
        "Abrir una cuenta bancaria comercial en EE.UU. (Mercury, Relay o banco local)",
    "Apply for Florida sales tax permit (if selling taxable goods/services)":
        "Solicitar permiso de impuesto sobre ventas de Florida (si vende bienes/servicios gravables)",
    "Set up quarterly estimated federal tax payments (Form 1040-ES or 1120)":
        "Configurar pagos trimestrales estimados de impuestos federales (Formulario 1040-ES o 1120)",
    "Choose and set up accounting software (QuickBooks Online recommended)":
        "Elegir y configurar software de contabilidad (QuickBooks Online recomendado)",
    "Hire a CPA experienced with international-owned U.S. businesses":
        "Contratar un CPA con experiencia en negocios estadounidenses de propiedad internacional",
    "Understand FBAR/FATCA reporting obligations if applicable":
        "Comprender las obligaciones de reporte FBAR/FATCA si aplica",

    # Module 3
    "Risk & Insurance": "Riesgo y Seguros",
    "Obtain General Liability (GL) insurance — required for most businesses":
        "Obtener seguro de Responsabilidad General (GL), requerido para la mayoría de los negocios",
    "Evaluate Workers' Compensation requirements (mandatory at 4+ employees in FL)":
        "Evaluar requisitos de Compensación al Trabajador (obligatorio con 4+ empleados en FL)",
    "Consider Professional Liability / E&O insurance (if service-based)":
        "Considerar seguro de Responsabilidad Profesional / E&O (si es basado en servicios)",
    "Register trademarks with USPTO for brand protection":
        "Registrar marcas con la USPTO para protección de marca",
    "Evaluate cyber liability insurance (if handling customer data)":
        "Evaluar seguro de responsabilidad cibernética (si maneja datos de clientes)",

    # Module 4
    "Team & HR": "Equipo y Recursos Humanos",
    "Understand Florida at-will employment and federal labor law basics":
        "Comprender el empleo a voluntad de Florida y los fundamentos de la ley laboral federal",
    "Set up payroll processing (Gusto, ADP, or similar)":
        "Configurar procesamiento de nómina (Gusto, ADP o similar)",
    "Create I-9 verification process for new hires":
        "Crear proceso de verificación I-9 para nuevas contrataciones",
    "Draft employee handbook with key policies":
        "Redactar manual del empleado con políticas clave",
    "Research contractor vs. employee classification rules":
        "Investigar reglas de clasificación contratista vs. empleado",

    # Module 5
    "Market Entry & Sales": "Entrada al Mercado y Ventas",
    "Validate product-market fit for the U.S. audience":
        "Validar el ajuste producto-mercado para la audiencia estadounidense",
    "Adapt pricing strategy for U.S. market expectations":
        "Adaptar la estrategia de precios a las expectativas del mercado estadounidense",
    "Build or localize website for U.S. customers":
        "Construir o localizar sitio web para clientes estadounidenses",
    "Set up payment processing (Stripe, Square, etc.)":
        "Configurar procesamiento de pagos (Stripe, Square, etc.)",
    "Identify initial sales channels and distribution strategy":
        "Identificar canales iniciales de venta y estrategia de distribución",

    # Module 6
    "Business Culture & Communication": "Cultura Empresarial y Comunicación",
    "Study U.S. business communication norms (directness, punctuality, follow-up)":
        "Estudiar normas de comunicación empresarial de EE.UU. (franqueza, puntualidad, seguimiento)",
    "Understand American negotiation and contract practices":
        "Comprender prácticas estadounidenses de negociación y contratos",
    "Prepare a U.S.-style elevator pitch and business introduction":
        "Preparar un elevator pitch estilo estadounidense y presentación de negocio",

    # Module 7
    "Florida Ecosystem & Networking": "Ecosistema de Florida y Networking",
    "Schedule intake with Florida SBDC at UCF (free consulting)":
        "Programar consulta inicial con el Florida SBDC en UCF (consultoría gratuita)",
    "Register with SCORE Orlando for free mentorship":
        "Registrarse con SCORE Orlando para mentoría gratuita",
    "Apply to UCF Business Incubation Program":
        "Postularse al Programa de Incubación de Empresas de UCF",
    "Attend at least 2 local networking events per month":
        "Asistir a por lo menos 2 eventos locales de networking al mes",
    "Research coworking/office space options in Central Florida":
        "Investigar opciones de coworking/oficina en Florida Central",

    # Badge labels
    "High": "Alta",
    "Med": "Media",
    "Low": "Baja",

    # Time labels
    "Month 1": "Mes 1",
    "Month 2": "Mes 2",
    "Month 3": "Mes 3",
    "Month 1–2": "Mes 1–2",
    "Month 2–3": "Mes 2–3",
    "Month 3–6": "Mes 3–6",
    "Pre-arrival": "Antes de llegar",
    "Ongoing": "Continuo",

    # ── resource-roadmap.html ──
    "Florida Setup Roadmap": "Hoja de Ruta para Establecerse en Florida",
    "Step-by-step sequence from entity formation to fully operational":
        "Secuencia paso a paso desde la formación de la entidad hasta operación completa",
    "Remote": "Remoto",
    "In-Person": "Presencial",
    "Either": "Cualquiera",
    "Phase 1": "Fase 1",
    "Phase 2": "Fase 2",
    "Phase 3": "Fase 3",
    "Phase 4": "Fase 4",
    "Pre-Arrival Preparation": "Preparación Previa a la Llegada",
    "Entity Formation & Registration": "Formación y Registro de la Entidad",
    "Financial Infrastructure": "Infraestructura Financiera",
    "Operational Readiness": "Preparación Operativa",
    "2–4 weeks before arrival": "2–4 semanas antes de llegar",
    "Week 1–2 after decision": "Semana 1–2 después de la decisión",
    "Week 2–4": "Semana 2–4",

    # ── resource-guide.html ──
    "Central Florida Resource Guide": "Guía de Recursos de Florida Central",
    "Trusted organizations for international founders launching in Central Florida":
        "Organizaciones confiables para fundadores internacionales que lanzan en Florida Central",

    # ── resource-worksheet.html ──
    "Expansion Decision Worksheet": "Hoja de Decisión de Expansión",
    "Self-assessment to determine if U.S. expansion is the right next step for your business":
        "Autoevaluación para determinar si la expansión a EE.UU. es el próximo paso correcto para su negocio",
}

# Phrases that contain mixed HTML (use data-es-html on parent)
TH = {
    # Will populate per-file as needed
}

def add_data_es(soup):
    """Walk all elements; when an element's only-child text matches T, add data-es."""
    count = 0
    for el in soup.find_all(True):
        if el.has_attr('data-es') or el.has_attr('data-es-html'):
            continue
        # Only consider elements whose direct content is a single text node
        children = [c for c in el.children if not (isinstance(c, NavigableString) and not str(c).strip())]
        if len(children) == 1 and isinstance(children[0], NavigableString):
            txt = str(children[0]).strip()
            # Normalize entities — &mdash; -> em-dash etc — for lookup
            normalized = (txt
                          .replace('\u2013', '–')
                          .replace('\u2014', '—')
                          .replace('\u00a0', ' '))
            if normalized in T:
                el['data-es'] = T[normalized]
                count += 1
            elif txt in T:
                el['data-es'] = T[txt]
                count += 1
    return count

def patch_file(path):
    print(f'\n=== {os.path.basename(path)} ===')
    with open(path, encoding='utf-8') as f:
        html = f.read()
    soup = BeautifulSoup(html, 'html.parser')

    # Add data-es to leaf-text elements
    n = add_data_es(soup)
    print(f'  data-es added to {n} elements')

    # Inject rt-language.js if not already present
    has_lang_script = bool(soup.find('script', src=lambda s: s and 'rt-language.js' in s))
    if not has_lang_script:
        body = soup.find('body')
        if body:
            new_script = soup.new_tag('script', src='../js/rt-language.js')
            body.append(new_script)
            print(f'  added <script src="../js/rt-language.js">')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f'  wrote {path}')

# Process all 4 files
for fname in ['resource-checklist.html', 'resource-roadmap.html', 'resource-guide.html', 'resource-worksheet.html']:
    p = f'output/lessons/resources/{fname}'
    if os.path.exists(p):
        patch_file(p)
    else:
        print(f'(skip) {p} not found')

print('\nDONE')
