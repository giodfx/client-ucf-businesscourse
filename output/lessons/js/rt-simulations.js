/* ===== Founder's Road Trip — Interactive Simulation Tools ===== */
(function() {
  'use strict';

  // ── Utilities ──────────────────────────────────────────────────
  function fmt(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function fmtPct(n) {
    return n.toFixed(1) + '%';
  }
  function t(en, es) {
    return (window.rtLanguage || 'en') === 'es' ? es : en;
  }
  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function $$(sel, ctx) {
    return (ctx || document).querySelectorAll(sel);
  }

  // ── localStorage persistence ───────────────────────────────────
  function saveSim(id, data) {
    try { localStorage.setItem('rt-sim-' + id, JSON.stringify(data)); } catch(e) {}
  }
  function loadSim(id) {
    try { return JSON.parse(localStorage.getItem('rt-sim-' + id) || 'null'); } catch(e) { return null; }
  }

  // ════════════════════════════════════════════════════════════════
  // SIM 1: Employee Cost Calculator (lesson-4-3)
  // ════════════════════════════════════════════════════════════════

  var WORKERS_COMP_RATES = {
    general:      1.00,
    construction: 5.00,
    healthcare:   2.50,
    technology:   0.50,
    retail:       1.50
  };

  var INDUSTRY_LABELS = {
    general:      { en: 'General / Office',     es: 'General / Oficina' },
    construction: { en: 'Construction',          es: 'Construcción' },
    healthcare:   { en: 'Healthcare',            es: 'Salud' },
    technology:   { en: 'Technology',            es: 'Tecnología' },
    retail:       { en: 'Retail / Hospitality',  es: 'Comercio / Hostelería' }
  };

  function calcEmployee(salary, industry, includeHealth) {
    var fica = salary * 0.0765;
    var futa = Math.min(salary, 7000) * 0.06;
    var suta = Math.min(salary, 7000) * 0.027;
    var wcRate = WORKERS_COMP_RATES[industry] || 1.0;
    var wc = (salary / 100) * wcRate;
    var health = includeHealth ? 7000 : 0;
    var extras = fica + futa + suta + wc + health;
    var total = salary + extras;
    var multiplier = total / salary;
    return {
      salary: salary,
      fica: fica,
      futa: futa,
      suta: suta,
      wc: wc,
      health: health,
      extras: extras,
      total: total,
      multiplier: multiplier
    };
  }

  function renderEmployeeResults(simId) {
    var container = document.getElementById(simId);
    if (!container) return;
    var salaryInput = $('#sim-salary', container);
    var industrySelect = $('#sim-industry', container);
    var healthToggle = $('#sim-health', container);
    var resultsDiv = $('#sim-results-' + simId, container);
    if (!salaryInput || !industrySelect || !resultsDiv) return;

    var salary = parseFloat(salaryInput.value) || 60000;
    var industryRaw = industrySelect.value;
    var industryMap = { 'general': 'general', 'construction': 'construction', 'healthcare': 'healthcare', 'tech': 'technology', 'technology': 'technology', 'retail': 'retail' };
    var industry = industryMap[industryRaw.toLowerCase()] || industryRaw.toLowerCase();
    var includeHealth = healthToggle ? healthToggle.checked : false;
    var r = calcEmployee(salary, industry, includeHealth);

    // Save state
    saveSim(simId, { salary: salary, industry: industry, health: includeHealth });

    // Build results HTML
    var rows = [
      { label: t('Base Salary', 'Salario Base'), value: fmt(r.salary), color: '#1A3A5C' },
      { label: t('FICA (7.65%)', 'FICA (7,65%)'), value: fmt(r.fica), color: '#2C5F8A' },
      { label: t('FUTA', 'FUTA'), value: fmt(r.futa), color: '#E8A838' },
      { label: t('FL SUTA (Reemployment)', 'FL SUTA (Reempleo)'), value: fmt(r.suta), color: '#F5C842' },
      { label: t("Workers' Comp", 'Comp. Laboral') + ' (' + t(INDUSTRY_LABELS[industry].en, INDUSTRY_LABELS[industry].es) + ')', value: fmt(r.wc), color: '#D4622B' }
    ];
    if (includeHealth) {
      rows.push({ label: t('Health Insurance', 'Seguro de Salud'), value: fmt(r.health), color: '#48B07A' });
    }

    var html = '';

    // Stacked bar visualization
    var maxH = 200;
    var salH = Math.round((r.salary / r.total) * maxH);
    var ficaH = Math.max(2, Math.round((r.fica / r.total) * maxH));
    var futaH = Math.max(1, Math.round((r.futa / r.total) * maxH));
    var sutaH = Math.max(1, Math.round((r.suta / r.total) * maxH));
    var wcH = Math.max(2, Math.round((r.wc / r.total) * maxH));
    var healthH = includeHealth ? Math.max(2, Math.round((r.health / r.total) * maxH)) : 0;

    html += '<div class="rt-sim-viz">';
    html += '<div class="rt-sim-bar-wrap">';
    html += '<div class="rt-sim-bar" style="height:' + maxH + 'px">';
    html += '<div class="rt-sim-bar-seg" style="height:' + salH + 'px;background:#1A3A5C"><span>' + t('Salary', 'Salario') + '<br>' + fmt(r.salary) + '</span></div>';
    html += '<div class="rt-sim-bar-seg" style="height:' + ficaH + 'px;background:#2C5F8A"></div>';
    html += '<div class="rt-sim-bar-seg" style="height:' + futaH + 'px;background:#E8A838"></div>';
    html += '<div class="rt-sim-bar-seg" style="height:' + sutaH + 'px;background:#F5C842"></div>';
    html += '<div class="rt-sim-bar-seg" style="height:' + wcH + 'px;background:#D4622B"></div>';
    if (includeHealth) {
      html += '<div class="rt-sim-bar-seg" style="height:' + healthH + 'px;background:#48B07A"></div>';
    }
    html += '</div>';
    html += '<div class="rt-sim-bar-label">' + fmt(r.total) + '</div>';
    html += '<div class="rt-sim-bar-sub">' + fmtPct((r.multiplier - 1) * 100) + ' ' + t('over salary', 'sobre salario') + '</div>';
    html += '</div>';

    // Legend
    html += '<div class="rt-sim-legend">';
    for (var i = 0; i < rows.length; i++) {
      html += '<div class="rt-sim-legend-row">';
      html += '<span class="rt-sim-legend-dot" style="background:' + rows[i].color + '"></span>';
      html += '<span class="rt-sim-legend-label">' + rows[i].label + '</span>';
      html += '<span class="rt-sim-legend-value">' + rows[i].value + '</span>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';

    // Total row
    html += '<div class="rt-sim-total">';
    html += '<div class="rt-sim-total-row">';
    html += '<span>' + t('Total Employee Cost', 'Costo Total del Empleado') + '</span>';
    html += '<span class="rt-sim-total-value">' + fmt(r.total) + '</span>';
    html += '</div>';
    html += '<div class="rt-sim-total-row rt-sim-total-sub">';
    html += '<span>' + t('Cost Multiplier', 'Multiplicador de Costo') + '</span>';
    html += '<span class="rt-sim-total-multiplier">' + r.multiplier.toFixed(2) + 'x</span>';
    html += '</div>';
    html += '</div>';

    // Insight
    html += '<div class="rt-sim-insight">';
    html += '<strong>' + t('Budget', 'Presupueste') + ' ' + r.multiplier.toFixed(2) + 'x</strong> ';
    html += t('the base salary for your true hiring cost.', 'del salario base para su costo real de contratación.');
    html += '</div>';

    resultsDiv.innerHTML = html;
    resultsDiv.hidden = false;
  }

  window.simCalcEmployee = function(simId) {
    renderEmployeeResults(simId || 'sim-employee-cost');
  };

  // ════════════════════════════════════════════════════════════════
  // SIM 2: Tax Entity Comparison Calculator (lesson-2-1)
  // ════════════════════════════════════════════════════════════════

  var TAX_BRACKETS_2024 = [
    { min: 0,       max: 11600,  rate: 0.10 },
    { min: 11600,   max: 47150,  rate: 0.12 },
    { min: 47150,   max: 100525, rate: 0.22 },
    { min: 100525,  max: 191950, rate: 0.24 },
    { min: 191950,  max: 243725, rate: 0.32 },
    { min: 243725,  max: 609350, rate: 0.35 },
    { min: 609350,  max: Infinity, rate: 0.37 }
  ];

  function calcFederalIncomeTax(taxableIncome) {
    var tax = 0;
    for (var i = 0; i < TAX_BRACKETS_2024.length; i++) {
      var b = TAX_BRACKETS_2024[i];
      if (taxableIncome <= b.min) break;
      var taxable = Math.min(taxableIncome, b.max) - b.min;
      tax += taxable * b.rate;
    }
    return tax;
  }

  function calcTaxEntity(entityType, netProfit) {
    var result = { entityType: entityType, netProfit: netProfit };

    if (entityType === 'llc') {
      // Single-member LLC: pass-through, self-employment tax
      var seBase = netProfit * 0.9235;
      var seTax = seBase * 0.153;
      var seDeduction = seTax * 0.5;
      var taxableIncome = netProfit - seDeduction;
      var incomeTax = calcFederalIncomeTax(taxableIncome);
      result.seTax = seTax;
      result.incomeTax = incomeTax;
      result.totalTax = seTax + incomeTax;
      result.effectiveRate = (result.totalTax / netProfit) * 100;
      result.quarterly = result.totalTax / 4;
      result.label = t('Single-Member LLC', 'LLC de Un Solo Miembro');
    }
    else if (entityType === 'ccorp') {
      // C-Corp: 21% flat corporate tax, then dividend tax on distribution
      var corpTax = netProfit * 0.21;
      var afterCorpTax = netProfit - corpTax;
      // Assume owner takes all as qualified dividends (15% rate for most brackets)
      var dividendTax = afterCorpTax * 0.15;
      result.corpTax = corpTax;
      result.dividendTax = dividendTax;
      result.totalTax = corpTax + dividendTax;
      result.effectiveRate = (result.totalTax / netProfit) * 100;
      result.quarterly = corpTax / 4; // Corp estimated payments
      result.label = t('C-Corporation', 'Corporación C');
    }
    else if (entityType === 'scorp') {
      // S-Corp: reasonable salary (60%), SE tax on salary only, rest as distribution
      var salary = netProfit * 0.6;
      var distribution = netProfit * 0.4;
      var seOnSalary = salary * 0.0765 * 2; // employer + employee FICA
      var taxableS = netProfit - (seOnSalary * 0.5);
      var incomeTaxS = calcFederalIncomeTax(taxableS);
      result.seTax = seOnSalary;
      result.incomeTax = incomeTaxS;
      result.totalTax = seOnSalary + incomeTaxS;
      result.effectiveRate = (result.totalTax / netProfit) * 100;
      result.quarterly = result.totalTax / 4;
      result.salary = salary;
      result.distribution = distribution;
      result.label = t('S-Corporation', 'Corporación S');
      result.warning = t(
        'S-Corp election is NOT available to non-resident aliens.',
        'La elección de S-Corp NO está disponible para extranjeros no residentes.'
      );
    }

    result.stateTax = 0; // Florida = 0% state income tax
    return result;
  }

  function renderTaxResults(simId) {
    var container = document.getElementById(simId);
    if (!container) return;
    var profitInput = $('#sim-profit', container);
    var entityRadios = $$('input[name="sim-entity-type"]', container);
    var resultsDiv = $('#sim-results-' + simId, container);
    if (!profitInput || !resultsDiv) return;

    var profit = parseFloat(profitInput.value) || 80000;
    var entity = 'llc';
    entityRadios.forEach(function(r) { if (r.checked) entity = r.value; });
    // Normalize radio values from generator slugs to internal keys
    var entityMap = { 'single-member-llc': 'llc', 'c-corp': 'ccorp', 's-corp': 'scorp' };
    entity = entityMap[entity] || entity;

    saveSim(simId, { profit: profit, entity: entity });
    var r = calcTaxEntity(entity, profit);

    var html = '<div class="rt-sim-result-header">' + r.label + '</div>';

    if (r.warning) {
      html += '<div class="rt-sim-warning">' + r.warning + '</div>';
    }

    html += '<div class="rt-sim-result-rows">';

    if (entity === 'llc') {
      html += simRow(t('Federal Income Tax', 'Impuesto Federal'), fmt(r.incomeTax));
      html += simRow(t('Self-Employment Tax (15.3%)', 'Impuesto de Autoempleo (15.3%)'), fmt(r.seTax));
    } else if (entity === 'ccorp') {
      html += simRow(t('Corporate Tax (21%)', 'Impuesto Corporativo (21%)'), fmt(r.corpTax));
      html += simRow(t('Dividend Tax (15%)', 'Impuesto sobre Dividendos (15%)'), fmt(r.dividendTax));
    } else if (entity === 'scorp') {
      html += simRow(t('Reasonable Salary (60%)', 'Salario Razonable (60%)'), fmt(r.salary));
      html += simRow(t('FICA on Salary', 'FICA sobre Salario'), fmt(r.seTax));
      html += simRow(t('Federal Income Tax', 'Impuesto Federal'), fmt(r.incomeTax));
    }

    html += simRow(t('Florida State Tax', 'Impuesto Estatal de Florida'), fmt(0) + ' <span class="rt-sim-highlight">' + t('(0% — your advantage!)', '(0% — ¡su ventaja!)') + '</span>');
    html += '</div>';

    html += '<div class="rt-sim-total">';
    html += '<div class="rt-sim-total-row">';
    html += '<span>' + t('Total Tax Burden', 'Carga Fiscal Total') + '</span>';
    html += '<span class="rt-sim-total-value">' + fmt(r.totalTax) + '</span>';
    html += '</div>';
    html += '<div class="rt-sim-total-row rt-sim-total-sub">';
    html += '<span>' + t('Effective Rate', 'Tasa Efectiva') + '</span>';
    html += '<span class="rt-sim-total-multiplier">' + fmtPct(r.effectiveRate) + '</span>';
    html += '</div>';
    html += '<div class="rt-sim-total-row rt-sim-total-sub">';
    html += '<span>' + t('Quarterly Estimated Payment', 'Pago Estimado Trimestral') + '</span>';
    html += '<span class="rt-sim-total-multiplier">' + fmt(r.quarterly) + '</span>';
    html += '</div>';
    html += '</div>';

    html += '<div class="rt-sim-insight">';
    html += t('Estimated quarterly payments are due: April 15, June 15, Sept 15, Jan 15. Missing a payment triggers IRS penalties.',
              'Los pagos trimestrales estimados vencen: 15 de abril, 15 de junio, 15 de sept, 15 de enero. No pagar genera multas del IRS.');
    html += '</div>';

    html += '<div class="rt-sim-disclaimer">' +
      t('This is an educational estimate, not tax advice. Consult a CPA for your specific situation.',
        'Esta es una estimación educativa, no asesoría fiscal. Consulte a un contador para su situación específica.') +
      '</div>';

    resultsDiv.innerHTML = html;
    resultsDiv.hidden = false;
  }

  window.simCalcTax = function(simId) {
    renderTaxResults(simId || 'sim-tax-entity');
  };

  // ════════════════════════════════════════════════════════════════
  // SIM 3: Sales Tax Scenario Simulator (lesson-2-2)
  // ════════════════════════════════════════════════════════════════

  var COUNTY_SURTAX = {
    orange:   { rate: 0.005, en: 'Orange County', es: 'Condado de Orange' },
    seminole: { rate: 0.01,  en: 'Seminole County', es: 'Condado de Seminole' },
    osceola:  { rate: 0.015, en: 'Osceola County', es: 'Condado de Osceola' },
    brevard:  { rate: 0.01,  en: 'Brevard County', es: 'Condado de Brevard' },
    volusia:  { rate: 0.005, en: 'Volusia County', es: 'Condado de Volusia' },
    lake:     { rate: 0.01,  en: 'Lake County', es: 'Condado de Lake' }
  };

  var PRODUCT_TAXABILITY = {
    physical:  { taxable: true,  label: { en: 'Physical Goods', es: 'Bienes Físicos' }, note: '' },
    digital:   { taxable: true,  label: { en: 'Digital Products', es: 'Productos Digitales' }, note: { en: 'Most digital goods taxable in FL since 2024', es: 'La mayoría de bienes digitales gravables en FL desde 2024' } },
    saas:      { taxable: false, label: { en: 'SaaS / Cloud Software', es: 'SaaS / Software en la Nube' }, note: { en: 'Generally NOT taxable in Florida (remote access = not tangible)', es: 'Generalmente NO gravable en Florida (acceso remoto = no tangible)' } },
    services:  { taxable: false, label: { en: 'Professional Services', es: 'Servicios Profesionales' }, note: { en: 'Services are generally exempt from FL sales tax', es: 'Los servicios generalmente están exentos del impuesto de ventas de FL' } },
    food:      { taxable: false, label: { en: 'Groceries / Unprepared Food', es: 'Comestibles / Alimentos sin Preparar' }, note: { en: 'Most grocery items exempt; prepared food IS taxable', es: 'La mayoría de comestibles exentos; comida preparada SÍ es gravable' } }
  };

  function renderSalesTaxResults(simId) {
    var container = document.getElementById(simId);
    if (!container) return;
    var productSelect = $('#sim-product-type', container);
    var countySelect = $('#sim-county', container);
    var revenueInput = $('#sim-monthly-revenue', container);
    var resultsDiv = $('#sim-results-' + simId, container);
    if (!productSelect || !countySelect || !revenueInput || !resultsDiv) return;

    var product = productSelect.value;
    var county = countySelect.value;
    var revenue = parseFloat(revenueInput.value) || 10000;
    var pInfo = PRODUCT_TAXABILITY[product];
    var cInfo = COUNTY_SURTAX[county];

    saveSim(simId, { product: product, county: county, revenue: revenue });

    var html = '';
    var totalRate = 0.06 + (cInfo ? cInfo.rate : 0);

    // Taxability check
    html += '<div class="rt-sim-result-header">';
    if (pInfo.taxable) {
      html += '<span class="rt-sim-badge-yes">' + t('TAXABLE', 'GRAVABLE') + '</span>';
    } else {
      html += '<span class="rt-sim-badge-no">' + t('NOT TAXABLE', 'NO GRAVABLE') + '</span>';
    }
    html += ' ' + t(pInfo.label.en, pInfo.label.es);
    html += '</div>';

    if (pInfo.note) {
      var noteText = typeof pInfo.note === 'object' ? t(pInfo.note.en, pInfo.note.es) : pInfo.note;
      if (noteText) html += '<div class="rt-sim-note">' + noteText + '</div>';
    }

    if (pInfo.taxable) {
      var monthlyTax = revenue * totalRate;
      var annualTax = monthlyTax * 12;

      html += '<div class="rt-sim-result-rows">';
      html += simRow(t('Florida Base Rate', 'Tasa Base de Florida'), '6.0%');
      html += simRow(t(cInfo.en, cInfo.es) + ' ' + t('Surtax', 'Sobretasa'), fmtPct(cInfo.rate * 100));
      html += simRow(t('Total Rate', 'Tasa Total'), fmtPct(totalRate * 100));
      html += simRow(t('Monthly Tax on', 'Impuesto Mensual sobre') + ' ' + fmt(revenue), fmt(monthlyTax));
      html += simRow(t('Annual Tax', 'Impuesto Anual'), fmt(annualTax));
      html += '</div>';

      // Penalty scenario
      var monthsUnregistered = 3;
      var penaltyBase = revenue * monthsUnregistered * totalRate;
      var latePenalty = penaltyBase * 0.10;
      var interest = penaltyBase * 0.12 * (monthsUnregistered / 12);
      var totalPenalty = penaltyBase + latePenalty + interest + 50;

      html += '<div class="rt-sim-penalty">';
      html += '<div class="rt-sim-penalty-title">' + t('What If You Forget to Register?', '¿Qué Pasa si Olvida Registrarse?') + '</div>';
      html += '<p>' + t(
        'Scenario: You sell for ' + monthsUnregistered + ' months without registering for sales tax collection.',
        'Escenario: Usted vende por ' + monthsUnregistered + ' meses sin registrarse para la recaudación del impuesto de ventas.'
      ) + '</p>';
      html += simRow(t('Tax Owed', 'Impuesto Adeudado'), fmt(penaltyBase));
      html += simRow(t('Late Filing Penalty (10%)', 'Multa por Presentación Tardía (10%)'), fmt(latePenalty));
      html += simRow(t('Interest', 'Intereses'), fmt(interest));
      html += simRow(t('Registration Penalty', 'Multa por No Registro'), '$50');
      html += '<div class="rt-sim-total"><div class="rt-sim-total-row"><span>' +
        t('Total You Owe', 'Total que Debe') +
        '</span><span class="rt-sim-total-value rt-sim-total-danger">' + fmt(totalPenalty) + '</span></div></div>';
      html += '</div>';
    }

    resultsDiv.innerHTML = html;
    resultsDiv.hidden = false;
  }

  window.simCalcSalesTax = function(simId) {
    renderSalesTaxResults(simId || 'sim-sales-tax');
  };

  // ════════════════════════════════════════════════════════════════
  // SIM 4: Location Decision Weighted Scorer (lesson-7-4)
  // ════════════════════════════════════════════════════════════════

  var CITY_SCORES = {
    'central-fl': { en: 'Florida Central', es: 'Florida Central', scores: [4, 3, 4, 2, 4, 4] },
    'miami':      { en: 'Miami',           es: 'Miami',           scores: [2, 3, 5, 3, 3, 4] },
    'nyc':        { en: 'New York City',   es: 'Nueva York',      scores: [1, 5, 3, 4, 2, 5] },
    'austin':     { en: 'Austin',          es: 'Austin',          scores: [3, 4, 2, 4, 4, 4] },
    'sv':         { en: 'Silicon Valley',  es: 'Silicon Valley',  scores: [1, 5, 2, 5, 3, 5] }
  };

  var CRITERIA_LABELS = [
    { en: 'Cost of Living',        es: 'Costo de Vida' },
    { en: 'Tech Talent Pool',      es: 'Talento Tecnológico' },
    { en: 'LATAM Connectivity',    es: 'Conectividad LATAM' },
    { en: 'VC / Funding Access',   es: 'Acceso a Capital de Riesgo' },
    { en: 'Quality of Life',       es: 'Calidad de Vida' },
    { en: 'Business Infrastructure', es: 'Infraestructura de Negocios' }
  ];

  function renderLocationResults(simId) {
    var container = document.getElementById(simId);
    if (!container) return;
    var resultsDiv = $('#sim-results-' + simId, container);
    if (!resultsDiv) return;

    var weights = [];
    var saveData = {};
    for (var i = 0; i < 6; i++) {
      var slider = $('#sim-weight-' + i, container);
      var val = slider ? parseInt(slider.value) : 3;
      weights.push(val);
      saveData['w' + i] = val;
      // Update displayed value
      var valDisplay = $('#sim-weight-val-' + i, container);
      if (valDisplay) valDisplay.textContent = val;
    }
    saveSim(simId, saveData);

    // Calculate weighted scores
    var cityResults = [];
    var maxPossible = 0;
    for (var j = 0; j < weights.length; j++) maxPossible += weights[j] * 5;

    for (var cityId in CITY_SCORES) {
      var city = CITY_SCORES[cityId];
      var score = 0;
      for (var k = 0; k < weights.length; k++) {
        score += weights[k] * city.scores[k];
      }
      cityResults.push({ id: cityId, label: t(city.en, city.es), score: score, pct: maxPossible > 0 ? (score / maxPossible) * 100 : 0 });
    }

    // Sort descending
    cityResults.sort(function(a, b) { return b.score - a.score; });

    var html = '';
    var topCity = cityResults[0];

    // Bar chart
    html += '<div class="rt-sim-bars">';
    for (var m = 0; m < cityResults.length; m++) {
      var c = cityResults[m];
      var isTop = m === 0;
      var barWidth = maxPossible > 0 ? (c.score / maxPossible) * 100 : 0;
      html += '<div class="rt-sim-bar-row' + (isTop ? ' rt-sim-bar-top' : '') + '">';
      html += '<span class="rt-sim-bar-city">' + c.label + '</span>';
      html += '<div class="rt-sim-bar-track">';
      html += '<div class="rt-sim-bar-fill" style="width:' + barWidth + '%"></div>';
      html += '</div>';
      html += '<span class="rt-sim-bar-score">' + c.score + ' <small>(' + Math.round(c.pct) + '%)</small></span>';
      html += '</div>';
    }
    html += '</div>';

    // Recommendation
    html += '<div class="rt-sim-insight">';
    html += '<strong>' + t('Based on your priorities:', 'Según sus prioridades:') + '</strong> ';
    html += topCity.label + ' ' + t('scores highest with', 'obtiene la mayor puntuación con') + ' ' + Math.round(topCity.pct) + '% ' + t('of maximum possible score.', 'de la puntuación máxima posible.');
    html += '</div>';

    resultsDiv.innerHTML = html;
    resultsDiv.hidden = false;
  }

  window.simCalcLocation = function(simId) {
    renderLocationResults(simId || 'sim-location');
  };

  // ════════════════════════════════════════════════════════════════
  // SIM 5: Entity Type Decision Tree (lesson-1-1)
  // ════════════════════════════════════════════════════════════════

  var DECISION_TREE = [
    { q: { en: 'Do you plan to raise venture capital or bring on equity investors in the next 18 months?', es: '¿Planea recaudar capital de riesgo o traer inversionistas de capital en los próximos 18 meses?' } },
    { q: { en: 'Are you a U.S. citizen or permanent resident?', es: '¿Es usted ciudadano estadounidense o residente permanente?' } },
    { q: { en: 'Will you have multiple co-owners or partners?', es: '¿Tendrá múltiples co-propietarios o socios?' } },
    { q: { en: 'Is simplicity and low formation cost your top priority?', es: '¿La simplicidad y el bajo costo de formación son su prioridad principal?' } }
  ];

  function getEntityRecommendation(answers) {
    // Q0: VC investors? YES = C-Corp
    if (answers[0]) {
      return {
        entity: t('C-Corporation', 'Corporación C'),
        reason: t(
          'Investors require C-Corp structure for preferred stock, SAFEs, and standard VC terms.',
          'Los inversionistas requieren estructura C-Corp para acciones preferentes, SAFEs y términos estándar de capital de riesgo.'
        ),
        cost: '$200 – $800',
        convertNote: ''
      };
    }
    // Q1: US citizen? YES = S-Corp option available
    if (answers[1]) {
      // Q2: Multiple owners?
      if (answers[2]) {
        return {
          entity: t('Multi-Member LLC (or S-Corp election)', 'LLC Multi-Miembro (o elección S-Corp)'),
          reason: t(
            'Multiple owners benefit from LLC flexibility. Consider S-Corp election once profits exceed $50K for payroll tax savings.',
            'Múltiples propietarios se benefician de la flexibilidad de LLC. Considere la elección S-Corp una vez que las ganancias excedan $50K para ahorros en impuestos de nómina.'
          ),
          cost: '$125 – $500',
          convertNote: t('Converting to S-Corp later is free (IRS Form 2553).', 'Convertir a S-Corp después es gratis (Formulario IRS 2553).')
        };
      }
      // Single owner US citizen
      if (answers[3]) {
        return {
          entity: t('Single-Member Florida LLC', 'LLC de Un Solo Miembro en Florida'),
          reason: t(
            'Simplest and cheapest option. Form on SunBiz.org for $125. Full liability protection, pass-through taxation.',
            'Opción más simple y económica. Forme en SunBiz.org por $125. Protección total de responsabilidad, tributación pass-through.'
          ),
          cost: '$125',
          convertNote: t('You can convert to C-Corp later if needed ($500–$2,000).', 'Puede convertir a C-Corp después si es necesario ($500–$2,000).')
        };
      }
      return {
        entity: t('Single-Member LLC with future S-Corp election', 'LLC de Un Solo Miembro con futura elección S-Corp'),
        reason: t(
          'Start with an LLC for simplicity, then elect S-Corp status when profits justify the payroll tax savings.',
          'Comience con una LLC por simplicidad, luego elija estatus S-Corp cuando las ganancias justifiquen los ahorros en impuestos de nómina.'
        ),
        cost: '$125 – $300',
        convertNote: ''
      };
    }
    // Not US citizen — S-Corp NOT available
    if (answers[3]) {
      return {
        entity: t('Single-Member Florida LLC', 'LLC de Un Solo Miembro en Florida'),
        reason: t(
          'As a non-resident, S-Corp is not available to you. LLC is the simplest option with full liability protection.',
          'Como no residente, S-Corp no está disponible para usted. LLC es la opción más simple con protección total de responsabilidad.'
        ),
        cost: '$125',
        convertNote: t('S-Corp election requires U.S. residency. If your status changes, you can elect later.', 'La elección S-Corp requiere residencia en EE.UU. Si su estatus cambia, puede elegir después.')
      };
    }
    return {
      entity: t('Florida LLC', 'LLC de Florida'),
      reason: t(
        'LLC provides flexibility, liability protection, and pass-through taxation. Ideal starting point for international founders.',
        'LLC proporciona flexibilidad, protección de responsabilidad y tributación pass-through. Punto de partida ideal para fundadores internacionales.'
      ),
      cost: '$125 – $500',
      convertNote: t('Converting to C-Corp later costs $500–$2,000 in legal fees.', 'Convertir a C-Corp después cuesta $500–$2,000 en honorarios legales.')
    };
  }

  window.simTreeNext = function(simId, questionIdx, answer) {
    var container = document.getElementById(simId);
    if (!container) return;

    // Store answer
    if (!container._answers) container._answers = [];
    container._answers[questionIdx] = answer;

    // Mark selected button
    var stepDiv = $('#sim-tree-q' + questionIdx, container);
    if (stepDiv) {
      var btns = $$('.rt-sim-tree-btn', stepDiv);
      btns.forEach(function(b) {
        b.classList.remove('rt-sim-tree-btn--selected');
        b.disabled = true;
      });
      btns[answer ? 0 : 1].classList.add('rt-sim-tree-btn--selected');
    }

    var nextQ = questionIdx + 1;

    // Check if we can short-circuit
    var canShortCircuit = false;
    if (questionIdx === 0 && answer === true) canShortCircuit = true; // VC = always C-Corp

    if (nextQ < DECISION_TREE.length && !canShortCircuit) {
      // Show next question
      var nextDiv = $('#sim-tree-q' + nextQ, container);
      if (nextDiv) {
        nextDiv.hidden = false;
        nextDiv.classList.add('rt-sim-fadeIn');
      }
    } else {
      // Show result
      var rec = getEntityRecommendation(container._answers);
      var resultsDiv = $('#sim-results-' + simId, container);
      if (!resultsDiv) return;

      var html = '<div class="rt-sim-tree-result">';
      html += '<div class="rt-sim-tree-rec-label">' + t('Recommended Entity', 'Entidad Recomendada') + '</div>';
      html += '<div class="rt-sim-tree-rec-entity">' + rec.entity + '</div>';
      html += '<div class="rt-sim-tree-rec-reason">' + rec.reason + '</div>';
      html += '<div class="rt-sim-result-rows">';
      html += simRow(t('Estimated Formation Cost', 'Costo Estimado de Formación'), rec.cost);
      if (rec.convertNote) {
        html += '<div class="rt-sim-note">' + rec.convertNote + '</div>';
      }
      html += '</div>';
      html += '<div class="rt-sim-disclaimer">' +
        t('This recommendation is educational. Consult a business attorney before forming your entity.',
          'Esta recomendación es educativa. Consulte a un abogado de negocios antes de formar su entidad.') +
        '</div>';
      html += '</div>';

      resultsDiv.innerHTML = html;
      resultsDiv.hidden = false;
      resultsDiv.classList.add('rt-sim-fadeIn');

      saveSim(simId, { answers: container._answers });
    }
  };

  window.simTreeReset = function(simId) {
    var container = document.getElementById(simId);
    if (!container) return;
    container._answers = [];
    var questions = $$('.rt-sim-tree-step', container);
    questions.forEach(function(q, i) {
      if (i === 0) { q.hidden = false; } else { q.hidden = true; }
      q.classList.remove('rt-sim-fadeIn');
      var btns = $$('.rt-sim-tree-btn', q);
      btns.forEach(function(b) { b.disabled = false; b.classList.remove('rt-sim-tree-btn--selected'); });
    });
    var resultsDiv = $('#sim-results-' + simId, container);
    if (resultsDiv) { resultsDiv.hidden = true; resultsDiv.innerHTML = ''; }
  };

  // ════════════════════════════════════════════════════════════════
  // SIM 6: Insurance Portfolio Builder (lesson-3-2)
  // ════════════════════════════════════════════════════════════════

  function renderInsuranceResults(simId) {
    var container = document.getElementById(simId);
    if (!container) return;
    var bizType = $('#sim-biz-type', container);
    var empCount = $('#sim-emp-count', container);
    var clientFacing = $('#sim-client-facing', container);
    var physicalSpace = $('#sim-physical-space', container);
    var resultsDiv = $('#sim-results-' + simId, container);
    if (!bizType || !resultsDiv) return;

    var bizRaw = bizType.value;
    var bizMap = { 'professional services': 'services', 'professional-services': 'services', 'technology / saas': 'tech', 'technology---saas': 'tech', 'food & beverage': 'food', 'food---beverage': 'food', 'food-&-beverage': 'food', 'general / other': 'other', 'general---other': 'other', 'general-/-other': 'other' };
    var biz = bizMap[bizRaw.toLowerCase()] || bizRaw.toLowerCase();
    var emps = parseInt(empCount.value) || 0;
    var isClientFacing = clientFacing ? clientFacing.checked : false;
    var hasSpace = physicalSpace ? physicalSpace.checked : false;

    saveSim(simId, { biz: biz, emps: emps, client: isClientFacing, space: hasSpace });

    var policies = [];

    // General Liability — always
    policies.push({
      name: t('General Liability', 'Responsabilidad General'),
      tag: t('REQUIRED', 'REQUERIDO'),
      tagClass: 'required',
      range: '$400 – $800' + t('/year', '/año'),
      reason: t('Covers bodily injury and property damage claims.', 'Cubre reclamos por lesiones corporales y daños a la propiedad.')
    });

    // Workers Comp — if 4+ employees in FL
    if (emps >= 4) {
      policies.push({
        name: t("Workers' Compensation", 'Compensación Laboral'),
        tag: t('REQUIRED (FL law: 4+ employees)', 'REQUERIDO (ley FL: 4+ empleados)'),
        tagClass: 'required',
        range: '$500 – $2,000' + t('/year', '/año'),
        reason: t('Mandatory in Florida with 4 or more employees.', 'Obligatorio en Florida con 4 o más empleados.')
      });
    } else if (emps > 0) {
      policies.push({
        name: t("Workers' Compensation", 'Compensación Laboral'),
        tag: t('RECOMMENDED', 'RECOMENDADO'),
        tagClass: 'recommended',
        range: '$500 – $1,500' + t('/year', '/año'),
        reason: t('Not yet required at your employee count, but recommended.', 'Aún no requerido con su número de empleados, pero recomendado.')
      });
    }

    // E&O / Professional Liability
    if (biz === 'services' || biz === 'tech' || isClientFacing) {
      policies.push({
        name: t('Professional Liability (E&O)', 'Responsabilidad Profesional (E&O)'),
        tag: t('RECOMMENDED', 'RECOMENDADO'),
        tagClass: 'recommended',
        range: '$500 – $2,500' + t('/year', '/año'),
        reason: t('Protects against claims of professional errors or negligence.', 'Protege contra reclamos de errores profesionales o negligencia.')
      });
    }

    // Cyber Liability
    if (biz === 'tech') {
      policies.push({
        name: t('Cyber Liability', 'Responsabilidad Cibernética'),
        tag: t('RECOMMENDED', 'RECOMENDADO'),
        tagClass: 'recommended',
        range: '$500 – $1,000' + t('/year', '/año'),
        reason: t('Covers data breaches, ransomware, and cyber incidents.', 'Cubre violaciones de datos, ransomware e incidentes cibernéticos.')
      });
    }

    // Product Liability
    if (biz === 'retail' || biz === 'food') {
      policies.push({
        name: t('Product Liability', 'Responsabilidad por Producto'),
        tag: t('RECOMMENDED', 'RECOMENDADO'),
        tagClass: 'recommended',
        range: '$300 – $1,200' + t('/year', '/año'),
        reason: t('Covers claims from defective or harmful products.', 'Cubre reclamos por productos defectuosos o dañinos.')
      });
    }

    // Commercial Property
    if (hasSpace) {
      policies.push({
        name: t('Commercial Property', 'Propiedad Comercial'),
        tag: t('RECOMMENDED', 'RECOMENDADO'),
        tagClass: 'recommended',
        range: '$500 – $1,500' + t('/year', '/año'),
        reason: t('Covers damage to your office or equipment.', 'Cubre daños a su oficina o equipo.')
      });
    }

    var html = '<div class="rt-sim-insurance-stack">';
    for (var i = 0; i < policies.length; i++) {
      var p = policies[i];
      html += '<div class="rt-sim-insurance-card">';
      html += '<div class="rt-sim-insurance-header">';
      html += '<span class="rt-sim-insurance-name">' + p.name + '</span>';
      html += '<span class="rt-sim-insurance-tag rt-sim-tag--' + p.tagClass + '">' + p.tag + '</span>';
      html += '</div>';
      html += '<div class="rt-sim-insurance-body">';
      html += '<span class="rt-sim-insurance-range">' + p.range + '</span>';
      html += '<span class="rt-sim-insurance-reason">' + p.reason + '</span>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';

    html += '<div class="rt-sim-insight">';
    html += '<strong>' + policies.length + ' ' + t('policies recommended', 'pólizas recomendadas') + '</strong> ' +
      t('for your business profile.', 'para su perfil de negocio.');
    html += '</div>';

    resultsDiv.innerHTML = html;
    resultsDiv.hidden = false;
  }

  window.simCalcInsurance = function(simId) {
    renderInsuranceResults(simId || 'sim-insurance');
  };

  // ════════════════════════════════════════════════════════════════
  // SIM 8: Hiring Cost Calculator (lesson-4-1)
  // ════════════════════════════════════════════════════════════════

  var HIRING_ROLES = [
    { en: 'Software Developer (Entry)', es: 'Desarrollador de Software (Inicial)', salaryLow: 55000, salaryHigh: 70000, contractorRate: 75 },
    { en: 'Marketing Coordinator', es: 'Coordinador de Marketing', salaryLow: 38000, salaryHigh: 48000, contractorRate: 45 },
    { en: 'Accountant / Bookkeeper', es: 'Contador / Tenedor de Libros', salaryLow: 42000, salaryHigh: 55000, contractorRate: 55 },
    { en: 'Customer Support Rep', es: 'Rep. de Soporte al Cliente', salaryLow: 32000, salaryHigh: 40000, contractorRate: 25 },
    { en: 'Operations Manager', es: 'Gerente de Operaciones', salaryLow: 50000, salaryHigh: 68000, contractorRate: 85 },
    { en: 'Graphic Designer', es: 'Diseñador Gráfico', salaryLow: 40000, salaryHigh: 52000, contractorRate: 60 }
  ];

  function renderHiringResults(simId) {
    var container = document.getElementById(simId);
    if (!container) return;
    var roleSelect = $('#sim-hire-role', container);
    var hoursInput = $('#sim-hire-hours', container);
    var overheadInput = $('#sim-hire-overhead', container);
    var resultsDiv = $('#sim-results-' + simId, container);
    if (!roleSelect || !resultsDiv) return;

    var roleIdx = parseInt(roleSelect.value);
    var weeklyHours = parseInt(hoursInput ? hoursInput.value : 20) || 20;
    var overheadPct = parseInt(overheadInput ? overheadInput.value : 25) || 25;
    var role = HIRING_ROLES[roleIdx] || HIRING_ROLES[0];

    saveSim(simId, { role: roleIdx, hours: weeklyHours, overhead: overheadPct });

    var salaryMid = Math.round((role.salaryLow + role.salaryHigh) / 2);
    var multiplier = 1 + overheadPct / 100;
    var trueCost = Math.round(salaryMid * multiplier);
    var annualHours = weeklyHours * 52;
    var contractorCost = role.contractorRate * annualHours;
    var savings = contractorCost - trueCost;
    var sixMonthEmp = Math.round(trueCost / 2);
    var sixMonthCon = Math.round(contractorCost / 2);
    var sixMonthDiff = sixMonthCon - sixMonthEmp;
    var betterChoice = sixMonthDiff > 0 ? 'employee' : 'contractor';

    var html = '<div class="rt-sim-hire-results">';

    // Side-by-side comparison cards
    html += '<div class="rt-sim-hire-compare">';

    // Employee card
    html += '<div class="rt-sim-hire-card rt-sim-hire-card--emp">';
    html += '<div class="rt-sim-hire-card-header">' + t('Full-Time Employee', 'Empleado Tiempo Completo') + '</div>';
    html += '<div class="rt-sim-hire-card-role">' + t(role.en, role.es) + '</div>';
    html += '<div class="rt-sim-hire-card-row"><span>' + t('Base Salary', 'Salario Base') + '</span><span>$' + fmtK(salaryMid) + t('/yr', '/año') + '</span></div>';
    html += '<div class="rt-sim-hire-card-row"><span>' + t('Overhead', 'Sobrecosto') + ' (' + overheadPct + '%)</span><span>+$' + fmtK(Math.round(salaryMid * overheadPct / 100)) + '</span></div>';
    html += '<div class="rt-sim-hire-card-total"><span>' + t('True Annual Cost', 'Costo Anual Real') + '</span><span>$' + fmtK(trueCost) + '</span></div>';
    html += '<div class="rt-sim-hire-card-six"><span>' + t('First 6 Months', 'Primeros 6 Meses') + '</span><span>$' + fmtK(sixMonthEmp) + '</span></div>';
    html += '</div>';

    // Contractor card
    html += '<div class="rt-sim-hire-card rt-sim-hire-card--con">';
    html += '<div class="rt-sim-hire-card-header">' + t('Contractor', 'Contratista') + '</div>';
    html += '<div class="rt-sim-hire-card-role">' + t(role.en, role.es) + '</div>';
    html += '<div class="rt-sim-hire-card-row"><span>' + t('Hourly Rate', 'Tarifa por Hora') + '</span><span>$' + role.contractorRate + t('/hr', '/hora') + '</span></div>';
    html += '<div class="rt-sim-hire-card-row"><span>' + weeklyHours + ' ' + t('hrs/week', 'hrs/sem') + ' × 52 ' + t('weeks', 'sem') + '</span><span>' + fmtK(annualHours) + ' ' + t('hrs', 'hrs') + '</span></div>';
    html += '<div class="rt-sim-hire-card-total"><span>' + t('Annual Cost', 'Costo Anual') + '</span><span>$' + fmtK(contractorCost) + '</span></div>';
    html += '<div class="rt-sim-hire-card-six"><span>' + t('First 6 Months', 'Primeros 6 Meses') + '</span><span>$' + fmtK(sixMonthCon) + '</span></div>';
    html += '</div>';

    html += '</div>'; // end compare

    // Verdict
    html += '<div class="rt-sim-insight">';
    if (betterChoice === 'employee') {
      html += '<strong>' + t('Employee saves you', 'El empleado le ahorra') + ' $' + fmtK(Math.abs(sixMonthDiff)) + ' ' + t('in the first 6 months', 'en los primeros 6 meses') + '</strong>';
      html += '<p>' + t('At ' + weeklyHours + ' hours/week, a full-time employee is more cost-effective. You also get dedicated availability, team integration, and easier IP control.', 'A ' + weeklyHours + ' horas/semana, un empleado a tiempo completo es más rentable. También obtiene disponibilidad dedicada, integración al equipo y mejor control de propiedad intelectual.') + '</p>';
    } else {
      html += '<strong>' + t('Contractor saves you', 'El contratista le ahorra') + ' $' + fmtK(Math.abs(sixMonthDiff)) + ' ' + t('in the first 6 months', 'en los primeros 6 meses') + '</strong>';
      html += '<p>' + t('At ' + weeklyHours + ' hours/week, a contractor is cheaper — ideal for project-based work. But watch for misclassification risk if the role becomes full-time.', 'A ' + weeklyHours + ' horas/semana, un contratista es más económico — ideal para trabajo basado en proyectos. Pero cuidado con el riesgo de clasificación incorrecta si el rol se vuelve a tiempo completo.') + '</p>';
    }
    html += '</div>';

    html += '</div>';
    resultsDiv.innerHTML = html;
    resultsDiv.hidden = false;
  }

  function fmtK(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  window.simCalcHiring = function(simId) {
    renderHiringResults(simId || 'sim-hiring');
  };

  // ════════════════════════════════════════════════════════════════
  // SIM 7: Readiness Self-Assessment (lesson-8-1)
  // ════════════════════════════════════════════════════════════════

  var READINESS_DIMENSIONS = [
    { en: 'Legal & Entity', es: 'Legal y Entidad', module: 1 },
    { en: 'Tax & Financial', es: 'Impuestos y Finanzas', module: 2 },
    { en: 'Risk & Insurance', es: 'Riesgo y Seguros', module: 3 },
    { en: 'Team & HR', es: 'Equipo y RRHH', module: 4 },
    { en: 'Market Adaptation', es: 'Adaptación al Mercado', module: 5 },
    { en: 'Business Culture', es: 'Cultura de Negocios', module: 6 },
    { en: 'Local Ecosystem', es: 'Ecosistema Local', module: 7 }
  ];

  function renderRadarChart(scores) {
    var cx = 150, cy = 150, r = 120;
    var n = scores.length;
    var angleStep = (2 * Math.PI) / n;
    var startAngle = -Math.PI / 2;

    var svg = '<svg viewBox="0 0 300 300" class="rt-sim-radar-svg">';

    // Grid rings
    for (var ring = 1; ring <= 5; ring++) {
      var ringR = (ring / 5) * r;
      var ringPoints = [];
      for (var i = 0; i < n; i++) {
        var angle = startAngle + i * angleStep;
        ringPoints.push((cx + ringR * Math.cos(angle)).toFixed(1) + ',' + (cy + ringR * Math.sin(angle)).toFixed(1));
      }
      svg += '<polygon points="' + ringPoints.join(' ') + '" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>';
    }

    // Axis lines
    for (var j = 0; j < n; j++) {
      var angle2 = startAngle + j * angleStep;
      var x2 = cx + r * Math.cos(angle2);
      var y2 = cy + r * Math.sin(angle2);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>';
    }

    // Data polygon
    var dataPoints = [];
    for (var k = 0; k < n; k++) {
      var angle3 = startAngle + k * angleStep;
      var dataR = (scores[k] / 5) * r;
      dataPoints.push((cx + dataR * Math.cos(angle3)).toFixed(1) + ',' + (cy + dataR * Math.sin(angle3)).toFixed(1));
    }
    svg += '<polygon points="' + dataPoints.join(' ') + '" fill="rgba(245,166,35,0.15)" stroke="var(--rt-accent)" stroke-width="2"/>';

    // Data dots + labels
    for (var m = 0; m < n; m++) {
      var angle4 = startAngle + m * angleStep;
      var dotR = (scores[m] / 5) * r;
      var dotX = cx + dotR * Math.cos(angle4);
      var dotY = cy + dotR * Math.sin(angle4);
      svg += '<circle cx="' + dotX.toFixed(1) + '" cy="' + dotY.toFixed(1) + '" r="4" fill="var(--rt-accent)"/>';

      // Label
      var labelR = r + 18;
      var lx = cx + labelR * Math.cos(angle4);
      var ly = cy + labelR * Math.sin(angle4);
      var anchor = Math.abs(Math.cos(angle4)) < 0.1 ? 'middle' : (Math.cos(angle4) > 0 ? 'start' : 'end');
      svg += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anchor + '" fill="rgba(255,255,255,0.6)" font-size="10" font-family="var(--rt-font-heading)" dominant-baseline="middle">' + t(READINESS_DIMENSIONS[m].en, READINESS_DIMENSIONS[m].es) + '</text>';
    }

    svg += '</svg>';
    return svg;
  }

  function renderReadinessResults(simId) {
    var container = document.getElementById(simId);
    if (!container) return;
    var resultsDiv = $('#sim-results-' + simId, container);
    if (!resultsDiv) return;

    var scores = [];
    var saveData = {};
    for (var i = 0; i < 7; i++) {
      var slider = $('#sim-readiness-' + i, container);
      var val = slider ? parseInt(slider.value) : 3;
      scores.push(val);
      saveData['d' + i] = val;
      var valDisplay = $('#sim-readiness-val-' + i, container);
      if (valDisplay) valDisplay.textContent = val;
    }
    saveSim(simId, saveData);

    var avg = scores.reduce(function(a, b) { return a + b; }, 0) / scores.length;

    var html = '';

    // Radar chart
    html += '<div class="rt-sim-radar-wrap">' + renderRadarChart(scores) + '</div>';

    // Overall score
    var scoreColor = avg >= 4 ? '#48B07A' : (avg >= 3 ? '#E8A838' : '#D4622B');
    html += '<div class="rt-sim-readiness-score">';
    html += '<span class="rt-sim-readiness-num" style="color:' + scoreColor + '">' + avg.toFixed(1) + '</span>';
    html += '<span class="rt-sim-readiness-max">/ 5.0</span>';
    html += '<span class="rt-sim-readiness-label">' + t('Overall Readiness', 'Preparación General') + '</span>';
    html += '</div>';

    // Per-dimension recommendations (sort by lowest score)
    var dimScores = scores.map(function(s, idx) { return { score: s, dim: READINESS_DIMENSIONS[idx] }; });
    dimScores.sort(function(a, b) { return a.score - b.score; });

    html += '<div class="rt-sim-readiness-recs">';
    html += '<div class="rt-sim-result-header">' + t('Your Priority Areas', 'Sus Áreas Prioritarias') + '</div>';
    for (var j = 0; j < dimScores.length; j++) {
      var d = dimScores[j];
      var dimColor = d.score >= 4 ? '#48B07A' : (d.score >= 3 ? '#E8A838' : '#D4622B');
      var rec = '';
      if (d.score <= 2) {
        rec = t('Revisit Module ' + d.dim.module + ' before proceeding.', 'Revise el Módulo ' + d.dim.module + ' antes de continuar.');
      } else if (d.score === 3) {
        rec = t('Review key sections in Module ' + d.dim.module + '.', 'Revise las secciones clave del Módulo ' + d.dim.module + '.');
      } else {
        rec = t('Well prepared in this area.', 'Bien preparado en esta área.');
      }
      html += '<div class="rt-sim-readiness-dim">';
      html += '<span class="rt-sim-readiness-dot" style="background:' + dimColor + '">' + d.score + '</span>';
      html += '<span class="rt-sim-readiness-dim-label">' + t(d.dim.en, d.dim.es) + '</span>';
      html += '<span class="rt-sim-readiness-dim-rec">' + rec + '</span>';
      html += '</div>';
    }
    html += '</div>';

    resultsDiv.innerHTML = html;
    resultsDiv.hidden = false;
  }

  window.simCalcReadiness = function(simId) {
    renderReadinessResults(simId || 'sim-readiness');
  };

  // ════════════════════════════════════════════════════════════════
  // Shared helper: result row
  // ════════════════════════════════════════════════════════════════
  function simRow(label, value) {
    return '<div class="rt-sim-result-row"><span class="rt-sim-result-label">' + label + '</span><span class="rt-sim-result-value">' + value + '</span></div>';
  }

  // ════════════════════════════════════════════════════════════════
  // Shared: Reset any simulation
  // ════════════════════════════════════════════════════════════════
  window.simReset = function(simId) {
    var container = document.getElementById(simId);
    if (!container) return;
    var resultsDiv = $('#sim-results-' + simId, container);
    if (resultsDiv) { resultsDiv.hidden = true; resultsDiv.innerHTML = ''; }
    localStorage.removeItem('rt-sim-' + simId);

    // Reset tree if applicable
    if (container._answers) {
      window.simTreeReset(simId);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // Init: restore saved state on DOMContentLoaded
  // ════════════════════════════════════════════════════════════════
  function initSimulations() {
    // Employee cost calculator — restore saved state then auto-calculate
    var c43 = document.getElementById('sim-employee-cost');
    if (c43) {
      var saved43 = loadSim('sim-employee-cost');
      if (saved43) {
        if (saved43.salary) { var s = $('#sim-salary', c43); if (s) s.value = saved43.salary; }
        if (saved43.industry) { var ind = $('#sim-industry', c43); if (ind) ind.value = saved43.industry; }
        if (saved43.health !== undefined) { var h = $('#sim-health', c43); if (h) h.checked = saved43.health; }
      }
      renderEmployeeResults('sim-employee-cost');
    }

    // Tax entity calculator
    var c21 = document.getElementById('sim-tax-entity');
    if (c21) {
      var saved21 = loadSim('sim-tax-entity');
      if (saved21) {
        if (saved21.profit) { var p = $('#sim-profit', c21); if (p) p.value = saved21.profit; }
        if (saved21.entity) {
          var radio = $('input[name="sim-entity-type"][value="' + saved21.entity + '"]', c21);
          if (radio) radio.checked = true;
        }
      }
      renderTaxResults('sim-tax-entity');
    }

    // Sales tax simulator
    var c22 = document.getElementById('sim-sales-tax');
    if (c22) {
      var saved22 = loadSim('sim-sales-tax');
      if (saved22) {
        if (saved22.product) { var pt = $('#sim-product-type', c22); if (pt) pt.value = saved22.product; }
        if (saved22.county) { var ct = $('#sim-county', c22); if (ct) ct.value = saved22.county; }
        if (saved22.revenue) { var rv = $('#sim-monthly-revenue', c22); if (rv) rv.value = saved22.revenue; }
      }
      renderSalesTaxResults('sim-sales-tax');
    }

    // Location scorer
    var c74 = document.getElementById('sim-location');
    if (c74) {
      var saved74 = loadSim('sim-location');
      if (saved74) {
        for (var i = 0; i < 6; i++) {
          if (saved74['w' + i] !== undefined) {
            var sl = $('#sim-weight-' + i, c74);
            if (sl) sl.value = saved74['w' + i];
          }
        }
      }
      renderLocationResults('sim-location');
    }

    // Insurance builder
    var c32 = document.getElementById('sim-insurance');
    if (c32) {
      var saved32 = loadSim('sim-insurance');
      if (saved32) {
        if (saved32.biz) { var bt = $('#sim-biz-type', c32); if (bt) bt.value = saved32.biz; }
        if (saved32.emps !== undefined) { var ec = $('#sim-emp-count', c32); if (ec) ec.value = saved32.emps; }
        if (saved32.client !== undefined) { var cf = $('#sim-client-facing', c32); if (cf) cf.checked = saved32.client; }
        if (saved32.space !== undefined) { var ps = $('#sim-physical-space', c32); if (ps) ps.checked = saved32.space; }
      }
      renderInsuranceResults('sim-insurance');
    }

    // Hiring cost calculator
    var c41 = document.getElementById('sim-hiring');
    if (c41) {
      var saved41 = loadSim('sim-hiring');
      if (saved41) {
        if (saved41.role !== undefined) { var hr = $('#sim-hire-role', c41); if (hr) hr.value = saved41.role; }
        if (saved41.hours !== undefined) { var hh = $('#sim-hire-hours', c41); if (hh) hh.value = saved41.hours; }
        if (saved41.overhead !== undefined) { var ho = $('#sim-hire-overhead', c41); if (ho) ho.value = saved41.overhead; }
      }
      renderHiringResults('sim-hiring');
    }

    // Readiness assessment
    var c81 = document.getElementById('sim-readiness');
    if (c81) {
      var saved81 = loadSim('sim-readiness');
      if (saved81) {
        for (var j = 0; j < 7; j++) {
          if (saved81['d' + j] !== undefined) {
            var rd = $('#sim-readiness-' + j, c81);
            if (rd) rd.value = saved81['d' + j];
          }
        }
      }
      renderReadinessResults('sim-readiness');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimulations);
  } else {
    initSimulations();
  }
})();
