"""
Round 2 of Spanish translations — handles resource-guide.html and
resource-worksheet.html which have unique content not covered by Round 1.
"""
import io, sys, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from bs4 import BeautifulSoup, NavigableString

T = {
    # ─── resource-guide.html ───
    "Business Advising & Mentorship": "Asesoría y Mentoría Empresarial",
    "Free one-on-one business consulting, market research, financial analysis, and access to government contracting support. Largest small business support network in Florida.":
        "Consultoría empresarial gratuita uno a uno, investigación de mercado, análisis financiero y acceso a apoyo para contratación gubernamental. La red de apoyo a pequeñas empresas más grande de Florida.",
    "Free mentorship from retired business executives and entrepreneurs. One-on-one mentoring, workshops, and webinars covering all aspects of starting and growing a business.":
        "Mentoría gratuita de ejecutivos y empresarios jubilados. Mentoría uno a uno, talleres y seminarios web sobre todos los aspectos de iniciar y hacer crecer un negocio.",
    "One of the largest university-based incubation programs in the U.S. Offers below-market office space, mentorship, networking events, and access to UCF research resources.":
        "Uno de los programas de incubación universitarios más grandes de EE.UU. Ofrece espacio de oficina por debajo del precio de mercado, mentoría, eventos de networking y acceso a recursos de investigación de UCF.",
    "Bilingual (English/Spanish) business development for Hispanic entrepreneurs. Free training, mentoring, and access to capital programs.":
        "Desarrollo empresarial bilingüe (inglés/español) para empresarios hispanos. Capacitación, mentoría y acceso a programas de capital, todo gratuito.",

    "Incubators & Accelerators": "Incubadoras y Aceleradoras",
    "Startup accelerator in downtown Orlando. Offers mentored accelerator programs, seed funding opportunities, and coworking space for early-stage tech companies.":
        "Aceleradora de startups en el centro de Orlando. Ofrece programas de aceleración con mentoría, oportunidades de financiamiento semilla y espacio de coworking para empresas tecnológicas en etapa temprana.",
    "Adjacent to UCF, one of the top 10 largest research parks in the U.S. Home to 120+ companies in defense, simulation, optics, and technology sectors.":
        "Adyacente a UCF, uno de los 10 parques de investigación más grandes de EE.UU. Hogar de más de 120 empresas en defensa, simulación, óptica y tecnología.",
    "Advanced manufacturing and technology district focused on smart sensors, photonics, and BRIDG semiconductor fabrication. Growing hub for deeptech startups.":
        "Distrito de manufactura avanzada y tecnología enfocado en sensores inteligentes, fotónica y fabricación de semiconductores BRIDG. Hub creciente para startups de deeptech.",

    "Government Programs": "Programas Gubernamentales",
    "Federal programs including SBA-backed loans (7(a), microloans), disaster assistance, and government contracting set-asides for small businesses.":
        "Programas federales que incluyen préstamos respaldados por la SBA (7(a), microcréditos), asistencia ante desastres y reservas de contratación gubernamental para pequeñas empresas.",
    "State economic development organization. Offers international trade assistance, export counseling, and connects international companies with Florida resources.":
        "Organización estatal de desarrollo económico. Ofrece asistencia de comercio internacional, asesoría de exportación y conecta empresas internacionales con recursos de Florida.",
    "Regional economic development group covering 8 Central Florida counties. Provides relocation support, site selection assistance, workforce data, and industry connections.":
        "Grupo regional de desarrollo económico que cubre 8 condados de Florida Central. Brinda apoyo de reubicación, asistencia para selección de sitios, datos sobre fuerza laboral y conexiones industriales.",

    "Legal & Formation Services": "Servicios Legales y de Formación",
    "Official state portal for registering LLCs, corporations, and fictitious names (DBAs). Search existing business names and file formation documents online.":
        "Portal oficial del estado para registrar LLC, corporaciones y nombres ficticios (DBA). Busque nombres comerciales existentes y presente documentos de formación en línea.",
    "Find a vetted Florida-licensed business attorney through the state bar's official referral service. Initial consultations often available at reduced rates.":
        "Encuentre un abogado empresarial autorizado en Florida a través del servicio oficial de referencia del colegio de abogados estatal. A menudo hay consultas iniciales con tarifas reducidas.",
    "Apply for your federal Employer Identification Number (EIN) online for free. Required for opening bank accounts, hiring employees, and filing taxes.":
        "Solicite gratis en línea su Número de Identificación de Empleador federal (EIN). Requerido para abrir cuentas bancarias, contratar empleados y presentar impuestos.",

    "Banking & Financial Services": "Servicios Bancarios y Financieros",
    "Online business banking designed for startups and international founders. No minimum balance, no monthly fees, remote account opening with foreign passport.":
        "Banca empresarial en línea diseñada para startups y fundadores internacionales. Sin saldo mínimo, sin cargos mensuales, apertura remota de cuentas con pasaporte extranjero.",
    "Free business banking with built-in accounting integrations. Offers multiple checking accounts for budgeting and automatic profit allocation.":
        "Banca empresarial gratuita con integraciones contables incorporadas. Ofrece múltiples cuentas de cheques para presupuesto y asignación automática de ganancias.",
    "All-in-one formation bundle: Delaware C-Corp incorporation, EIN, bank account (Mercury or SVB), Stripe payment processing, and legal templates. Popular with international founders.":
        "Paquete todo en uno de formación: incorporación C-Corp en Delaware, EIN, cuenta bancaria (Mercury o SVB), procesamiento de pagos de Stripe y plantillas legales. Popular entre fundadores internacionales.",
    "Most popular small business accounting software. Tracks income/expenses, generates invoices, runs payroll, and produces reports your CPA needs at tax time.":
        "Software de contabilidad para pequeñas empresas más popular. Registra ingresos/gastos, genera facturas, ejecuta nómina y produce los reportes que su CPA necesita en época de impuestos.",

    "Visas & Immigration": "Visas e Inmigración",
    "Official U.S. Citizenship and Immigration Services. Visa information, application filing, case status tracking, and policy updates.":
        "Servicios de Ciudadanía e Inmigración de EE.UU. oficiales. Información de visas, presentación de solicitudes, seguimiento del estatus de casos y actualizaciones de políticas.",
    "Immigration application assistance with attorney review. Simplifies the visa and green card application process for entrepreneurs.":
        "Asistencia con solicitudes de inmigración con revisión de abogados. Simplifica el proceso de solicitud de visas y green card para empresarios.",
    "Find a qualified immigration attorney through the American Immigration Lawyers Association directory. Filter by location and specialization.":
        "Encuentre un abogado de inmigración calificado a través del directorio de la Asociación Americana de Abogados de Inmigración. Filtre por ubicación y especialización.",
    "International immigration law firm specializing in business immigration. Offices worldwide, experienced with E-2, L-1, O-1, and EB-5 visa categories.":
        "Firma internacional de derecho migratorio especializada en inmigración empresarial. Oficinas en todo el mundo, con experiencia en categorías de visa E-2, L-1, O-1 y EB-5.",

    "Networking & Community": "Networking y Comunidad",
    "Central Florida's tech community hub. Monthly events, job board, and startup showcases connecting entrepreneurs with the local tech ecosystem.":
        "Hub de la comunidad tecnológica de Florida Central. Eventos mensuales, bolsa de trabajo y exhibiciones de startups que conectan empresarios con el ecosistema tecnológico local.",
    "Networking, advocacy, and business development for Hispanic entrepreneurs. Regular mixers, workshops, and annual business expo.":
        "Networking, defensa y desarrollo empresarial para empresarios hispanos. Mezclas regulares, talleres y expo de negocios anual.",
    "Largest business organization in Central Florida. Networking events, legislative advocacy, and connections to the broader business community.":
        "Organización empresarial más grande de Florida Central. Eventos de networking, defensa legislativa y conexiones con la comunidad empresarial más amplia.",
    "Free weekly event where two entrepreneurs present their startups to a supportive audience. Great for practicing your pitch and getting honest feedback.":
        "Evento semanal gratuito donde dos empresarios presentan sus startups ante una audiencia que los apoya. Excelente para practicar su pitch y recibir retroalimentación honesta.",

    # Tags
    "Free": "Gratis",
    "Bilingual": "Bilingüe",
    "Incubator": "Incubadora",
    "Accelerator": "Aceleradora",
    "Tech/Defense": "Tecnología/Defensa",
    "DeepTech": "DeepTech",
    "Government": "Gobierno",
    "Referral": "Referencia",
    "International-Friendly": "Amigable con Internacionales",
    "Accounting": "Contabilidad",
    "Paid Service": "Servicio Pagado",
    "Tech": "Tecnología",
    "General": "General",
    "Weekly": "Semanal",

    # Footer text variants
    "Contact information current as of 2025. Verify details directly with each organization before visiting.":
        "Información de contacto vigente al 2025. Verifique los detalles directamente con cada organización antes de visitar.",
    "This is a self-assessment tool, not professional advice. Bring your results to your 1:1 meeting with UCF BIP for personalized guidance.":
        "Esta es una herramienta de autoevaluación, no asesoría profesional. Lleve sus resultados a su sesión personalizada con UCF BIP para orientación adaptada a su caso.",

    # ─── resource-worksheet.html ───
    "Structured go/no-go framework • Score yourself honestly across 5 dimensions":
        "Marco estructurado de avanzar/esperar • Calificúese honestamente en 5 dimensiones",
    "Your Expansion Readiness Score": "Su Puntaje de Preparación para Expandirse",
    "out of 25": "de 25",
    "Your Notes & Action Items": "Sus Notas y Acciones",

    # Dimension titles
    "Market Fit": "Ajuste al Mercado",
    "Financial Readiness": "Preparación Financiera",
    "Legal Readiness": "Preparación Legal",
    "Operations": "Operaciones",
    "Timing": "Momento Oportuno",

    # Scale labels for Market Fit (dim 0)
    "No validation": "Sin validación",
    "Some research": "Algo de investigación",
    "Early signals": "Señales tempranas",
    "Validated": "Validado",
    "Proven demand": "Demanda comprobada",
    # Financial (dim 1)
    "Underfunded": "Subfinanciado",
    "Tight": "Ajustado",
    "6-month runway": "6 meses de margen",
    "12-month runway": "12 meses de margen",
    "Well-capitalized": "Bien capitalizado",
    # Legal (dim 2)
    "No plan": "Sin plan",
    "Researching": "Investigando",
    "Entity chosen": "Entidad elegida",
    "Formed": "Constituido",
    "Fully compliant": "Plenamente en regla",
    # Operations (dim 3)
    "No presence": "Sin presencia",
    "Remote only": "Solo remoto",
    "Hybrid ready": "Híbrido listo",
    "Team in place": "Equipo establecido",
    "Fully operational": "Plenamente operativo",
    # Timing (dim 4)
    "Poor timing": "Mal momento",
    "Uncertain": "Incierto",
    "Reasonable": "Razonable",
    "Good window": "Buena ventana",
    "Perfect timing": "Momento perfecto",

    # Criteria descriptions — Market Fit
    "No research on U.S. market. Assuming home-market success will transfer directly.":
        "Sin investigación del mercado estadounidense. Asumir que el éxito en el mercado de origen se transferirá directamente.",
    "Desk research done. Identified potential competitors. No U.S. customer conversations.":
        "Investigación de escritorio realizada. Competidores potenciales identificados. Sin conversaciones con clientes estadounidenses.",
    "Talked to 5+ potential U.S. customers. Some interest but no commitments.":
        "Habló con 5 o más clientes potenciales en EE.UU. Algo de interés pero sin compromisos.",
    "Pilot customers or LOIs from U.S. buyers. Clear value proposition adapted for market.":
        "Clientes piloto o cartas de intención de compradores estadounidenses. Propuesta de valor clara adaptada al mercado.",
    "Active paying U.S. customers. Product-market fit validated with real revenue.":
        "Clientes estadounidenses pagando activamente. Ajuste producto-mercado validado con ingresos reales.",

    # Criteria — Financial
    "No dedicated budget for U.S. expansion. Would need to fund from operations month-to-month.":
        "Sin presupuesto dedicado para la expansión a EE.UU. Tendría que financiarlo mes a mes con operaciones.",
    "Less than 3 months of U.S. operating costs available. No contingency buffer.":
        "Menos de 3 meses de costos operativos en EE.UU. disponibles. Sin colchón de contingencia.",
    "6 months of U.S. operating costs funded. Home market covers overhead.":
        "6 meses de costos operativos en EE.UU. financiados. El mercado de origen cubre los gastos generales.",
    "12+ months runway. Budget for legal, marketing, and hiring. Home business stable.":
        "12 meses o más de margen. Presupuesto para temas legales, marketing y contratación. Negocio de origen estable.",
    "Fully funded with investment or strong revenue. Can sustain U.S. ops independently.":
        "Plenamente financiado con inversión o ingresos sólidos. Puede sostener las operaciones en EE.UU. de forma independiente.",

    # Criteria — Legal
    "No understanding of U.S. entity types, visa requirements, or regulatory landscape.":
        "Sin entender los tipos de entidad de EE.UU., los requisitos de visa o el entorno regulatorio.",
    "Know entity options (LLC/C-Corp). Haven't consulted attorney or started formation.":
        "Conoce las opciones de entidad (LLC/C-Corp). No ha consultado a un abogado ni iniciado la formación.",
    "Entity type selected. Immigration pathway identified. Attorney engagement in progress.":
        "Tipo de entidad seleccionado. Camino migratorio identificado. Contratación de abogado en proceso.",
    "U.S. entity formed. EIN obtained. Visa application filed or approved. Tax advisor engaged.":
        "Entidad en EE.UU. constituida. EIN obtenido. Solicitud de visa presentada o aprobada. Asesor fiscal contratado.",
    "Fully incorporated, compliant, insured, and visa-approved. Operating agreement signed.":
        "Plenamente incorporado, en regla, asegurado y con visa aprobada. Acuerdo operativo firmado.",

    # Criteria — Operations
    "No U.S. contacts, infrastructure, or plan for physical/virtual presence.":
        "Sin contactos en EE.UU., infraestructura o plan para presencia física/virtual.",
    "Can operate remotely from home country. No U.S.-based team or workspace.":
        "Puede operar de forma remota desde el país de origen. Sin equipo o espacio de trabajo en EE.UU.",
    "Coworking or virtual office secured. Can handle U.S. time zones. Some local contacts.":
        "Coworking u oficina virtual asegurada. Puede manejar los husos horarios de EE.UU. Algunos contactos locales.",
    "U.S.-based team member or partner. Workspace secured. Supply chain identified.":
        "Miembro del equipo o socio basado en EE.UU. Espacio de trabajo asegurado. Cadena de suministro identificada.",
    "Full U.S. operations running. Team hired. Systems, vendors, and workspace in place.":
        "Operaciones completas funcionando en EE.UU. Equipo contratado. Sistemas, proveedores y espacio de trabajo establecidos.",

    # Criteria — Timing
    "Home business is unstable. Personal circumstances make relocation impossible now.":
        "El negocio en el país de origen es inestable. Las circunstancias personales hacen imposible la reubicación ahora.",
    "Home market needs attention. U.S. market is interesting but no urgency or window.":
        "El mercado de origen necesita atención. El mercado estadounidense es interesante pero no hay urgencia ni ventana.",
    "Home business is stable. U.S. market opportunity exists. No blocking personal factors.":
        "El negocio en el país de origen es estable. Existe la oportunidad del mercado estadounidense. Sin factores personales bloqueantes.",
    "Market window is open. Competitive timing is good. Personal situation supports the move.":
        "La ventana del mercado está abierta. El momento competitivo es bueno. La situación personal apoya el movimiento.",
    "Clear market window, partner/customer pulling you in, home ops self-sustaining.":
        "Ventana de mercado clara, un socio/cliente lo está atrayendo, operaciones de origen autosostenibles.",
}

def add_data_es(soup):
    count = 0
    for el in soup.find_all(True):
        if el.has_attr('data-es') or el.has_attr('data-es-html'):
            continue
        children = [c for c in el.children if not (isinstance(c, NavigableString) and not str(c).strip())]
        if len(children) == 1 and isinstance(children[0], NavigableString):
            txt = str(children[0]).strip()
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
    n = add_data_es(soup)
    print(f'  +{n} more data-es')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(str(soup))

for fname in ['resource-guide.html', 'resource-worksheet.html', 'resource-checklist.html', 'resource-roadmap.html']:
    p = f'output/lessons/resources/{fname}'
    if os.path.exists(p):
        patch_file(p)

print('\nDONE')
