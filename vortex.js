// Vortex: plantillas de WhatsApp, cotizaciones, cobros mensuales, reportes, metas y vendedores
window.Vx = (() => {
  const { esc, fmtN } = UI;
  const $ = (s) => document.querySelector(s);
  const num = (x) => Number(x) || 0;
  const money = (n) => fmtMoney(n, 0), money2 = (n) => fmtMoney(n, 2);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const D = () => Biz.data();
  const EN = () => D().CFG.idioma === 'en', L = (es, en) => (EN() ? en : es);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mesActual = () => Biz.today().slice(0, 7);
  const mesNombre = (ym) => `${(EN() ? MONTHS : MESES)[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
  const waNum = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 10) d = (APP.moneda === 'USD' ? '1' : '52') + d; return d; };

  // =====================================================================
  // 1. Mensajes de WhatsApp listos (se editan en Ajustes)
  // =====================================================================
  const PLANT = {
    contacto: { l: 'Primer contacto', t: 'Hola, ¿qué tal? Soy {yo} de {empresa}. Ayudamos a negocios como {negocio} a conseguir más clientes con menú digital, página web y placas para reseñas de Google. ¿Le puedo mandar unos ejemplos?' },
    seguimiento: { l: 'Seguimiento', t: 'Hola, ¿cómo está? Le escribe {yo} de {empresa}. Quería saber si pudo ver lo que le mandé para {negocio}. Quedo al pendiente de cualquier duda.' },
    propuesta: { l: 'Propuesta', t: 'Hola, le comparto la cotización para {negocio} por {monto}. Incluye {servicios}. Si le parece bien, la arrancamos esta misma semana.' },
    gracias: { l: 'Gracias por tu compra', t: 'Muchas gracias por su confianza. Ya quedó listo lo de {negocio}. Cualquier cosa que necesite aquí estoy, y si nos deja una reseña nos ayuda muchísimo.' },
    cobro: { l: 'Recordatorio de pago', t: 'Hola, ¿qué tal? Le recuerdo que su mensualidad de {servicio} por {monto} vence el día {dia}. {pago} Muchas gracias.' },
    portal: { l: 'Portal del cliente', t: 'Hola, le comparto su portal de {empresa}. Ahí puede ver los escaneos de sus códigos, sus pagos y sus contratos cuando quiera {link}' },
    saldo: { l: 'Saldo pendiente', t: 'Hola, ¿qué tal? Le recuerdo que queda pendiente un saldo de {monto} de {servicio}. {pago} Muchas gracias.' },
    firma: { l: 'Contrato para firmar', t: 'Hola, le comparto el contrato de {servicio} por {monto}. Lo puede leer y firmar desde su celular en este link {link}' },
    recibo: { l: 'Recibo de pago', t: 'Hola, muchas gracias por su pago de {monto}. Le comparto su recibo. {saldo}' },
    reporte: { l: 'Reporte del mes', t: 'Hola, le comparto el reporte de {mes} de {negocio}. Su código tuvo {escaneos} escaneos este mes. Aquí puede ver los detalles cuando quiera {link}' },
  };
  const PLANT_EN = {
    contacto: 'Hi, this is {yo} from {empresa}. We help businesses like {negocio} get more customers with digital menus, websites and Google review plaques. Can I send you a few examples?',
    seguimiento: 'Hi, {yo} from {empresa} here. I wanted to check if you had a chance to look at what I sent for {negocio}. Happy to answer any questions.',
    propuesta: 'Hi, here is the quote for {negocio} for {monto}. It includes {servicios}. If it works for you, we can start this week.',
    gracias: 'Thank you so much for your trust. Everything for {negocio} is ready. If you need anything I am here, and a review would help us a lot.',
    cobro: 'Hi, just a friendly reminder that your monthly {servicio} payment of {monto} is due on day {dia}. {pago} Thank you.',
    reporte: 'Hi, here is the {mes} report for {negocio}. Your code was scanned {escaneos} times this month. You can see the details anytime here {link}',
    firma: 'Hi, here is the {servicio} contract for {monto}. You can read and sign it from your phone here {link}',
    recibo: 'Hi, thank you for your payment of {monto}. Here is your receipt. {saldo}',
    saldo: 'Hi, just a reminder that there is a pending balance of {monto} for {servicio}. {pago} Thank you.',
    portal: 'Hi, here is your {empresa} portal. You can check your code scans, payments and contracts anytime {link}',
  };
  const plantillas = () => { const p = D().CFG.plantillas || {}, en = EN(); return Object.fromEntries(Object.entries(PLANT).map(([k, v]) => [k, { l: v.l, t: (en ? p['en_' + k] || PLANT_EN[k] : p[k]) || v.t }])); };
  function fill(t, vars) {
    const c = D().CFG;
    const all = { yo: c.tu_nombre || '', empresa: c.empresa || 'Vortex', ...vars };
    return t.replace(/\{(\w+)\}/g, (_, k) => (all[k] ?? '')).replace(/Soy\s+de /, 'Le escribo de ').replace(/escribe\s+de /, 'escribe el equipo de ').replace(/this is\s+from /, 'this is the team at ').replace(/^Hi,\s+from /, 'Hi, the team at ').replace(/\s{2,}/g, ' ').trim();
  }
  let waCtx = null;
  function wa(negocio, key = 'contacto', vars = {}) {
    if (!negocio?.telefono) return toast('Este negocio no tiene teléfono');
    waCtx = { negocio, vars: { negocio: negocio.nombre, servicios: (negocio.servicios || []).join(', '), monto: negocio.valor_estimado ? money(negocio.valor_estimado) : '', ...vars } };
    const P = plantillas();
    $('#waTabs').innerHTML = Object.entries(P).map(([k, v]) => `<button type="button" data-k="${k}" class="${k === key ? 'on' : ''}">${v.l}</button>`).join('');
    $('#waTo').textContent = `${negocio.nombre} · ${negocio.telefono}`;
    $('#waText').value = fill(P[key].t, waCtx.vars);
    $('#dlgWa').showModal();
  }
  function waOpen() {
    window.open(`https://wa.me/${waNum(waCtx.negocio.telefono)}?text=${encodeURIComponent($('#waText').value)}`, '_blank', 'noopener');
    $('#dlgWa').close();
  }

  // =====================================================================
  // Ajustes: empresa, moneda, metas, servicios, vendedores, plantillas
  // =====================================================================
  function openAjustes() {
    const c = D().CFG, f = $('#fAj');
    f.empresa.value = c.empresa || 'Vortex'; f.tu_nombre.value = c.tu_nombre || ''; f.telefono.value = c.telefono || ''; f.correo.value = c.correo || ''; f.ciudad.value = c.ciudad || ''; f.firma.value = c.firma || '';
    f.moneda.value = APP.moneda; f.idioma.value = c.idioma || 'es'; f.link_pago.value = c.link_pago || ''; f.meta.value = c.meta || 1000; f.meta_mes_negocios.value = c.meta_mes_negocios ?? 100; f.meta_mes_ventas.value = num(c.meta_mes_ventas) || '';
    f.servicios.value = (c.servicios || []).join('\n');
    f.vendedores.value = (c.vendedores || []).map((v) => `${v.nombre}, ${num(v.comision)}`).join('\n');
    const P = plantillas();
    $('#ajPlant').innerHTML = Object.entries(P).map(([k, v]) => `<div class="field"><label>${v.l}</label><textarea name="pl_${k}" rows="3">${esc(v.t)}</textarea></div>`).join('');
    $('#dlgAj').showModal();
  }
  async function saveAjustes(e) {
    e.preventDefault();
    const f = e.target;
    const en = f.idioma.value === 'en', plant = { ...(D().CFG.plantillas || {}) };
    for (const k of Object.keys(PLANT)) { const v = f['pl_' + k].value.trim(), key = (EN() ? 'en_' : '') + k, def = EN() ? PLANT_EN[k] : PLANT[k].t; if (v && v !== def) plant[key] = v; else delete plant[key]; }
    const vendedores = f.vendedores.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = l.match(/^(.*?)[,\s]+(\d+(?:\.\d+)?)\s*%?$/); return m ? { nombre: m[1].trim(), comision: +m[2] } : { nombre: l, comision: 0 };
    });
    const o = {
      empresa: f.empresa.value.trim() || 'Vortex', tu_nombre: f.tu_nombre.value.trim() || null, telefono: f.telefono.value.trim() || null, correo: f.correo.value.trim() || null, ciudad: f.ciudad.value.trim() || null, firma: f.firma.value.trim() || null,
      moneda: f.moneda.value, idioma: f.idioma.value, link_pago: /^https:\/\//i.test(f.link_pago.value.trim()) ? f.link_pago.value.trim() : null, meta: Math.max(1, +f.meta.value || 1000), meta_mes_negocios: Math.max(0, +f.meta_mes_negocios.value || 0), meta_mes_ventas: num(f.meta_mes_ventas.value),
      servicios: f.servicios.value.split('\n').map((s) => s.trim()).filter(Boolean), vendedores, plantillas: plant,
    };
    try { await DB.upsert('ajustes', o); $('#dlgAj').close(); await Biz.reload(); refreshCurrent(); toast('Ajustes guardados'); }
    catch (err) { toast(err.message); }
  }
  const vendOptions = (sel) => '<option value="">— Yo —</option>' + (D().CFG.vendedores || []).map((v) => `<option ${v.nombre === sel ? 'selected' : ''}>${esc(v.nombre)}</option>`).join('');

  // =====================================================================
  // 2. Metas del mes
  // =====================================================================
  function metaNegocios() {
    const { N, CFG } = D(), m = mesActual();
    const n = N.filter((x) => Biz.dayOf(x.created_at).slice(0, 7) === m).length, meta = num(CFG.meta_mes_negocios);
    return { n, meta, pct: meta ? Math.min(100, (n / meta) * 100) : 0 };
  }
  function metaVentas() {
    const { V, CFG } = D(), m = mesActual();
    const v = V.filter((x) => Biz.dayOf(x.fecha).slice(0, 7) === m).reduce((a, x) => a + Biz.vTotal(x), 0), meta = num(CFG.meta_mes_ventas);
    // días que faltan del mes
    const [y, mo] = m.split('-').map(Number), dias = new Date(y, mo, 0).getDate(), hoy = +Biz.today().slice(8, 10);
    return { v, meta, pct: meta ? Math.min(100, (v / meta) * 100) : 0, faltan: Math.max(0, meta - v), diasRest: dias - hoy + 1 };
  }
  function metasHTML() {
    const a = metaNegocios(), b = metaVentas(), mes = mesNombre(mesActual());
    const bar = (pct, color) => `<div class="prog"><i style="width:${pct}%;background:${color}"></i></div>`;
    return `<div class="metas card">
      <div><h3>Meta de ${mes} · negocios nuevos</h3><b>${fmtN(a.n)}</b><span class="muted"> de ${fmtN(a.meta)}</span>${bar(a.pct, 'var(--acc)')}
        <small class="muted">${a.meta ? (a.n >= a.meta ? '¡Meta cumplida!' : `Te faltan ${fmtN(a.meta - a.n)}`) : 'Ponla en Ajustes'}</small></div>
      <div><h3>Meta de ${mes} · ventas</h3><b>${money(b.v)}</b><span class="muted"> de ${b.meta ? money(b.meta) : '—'}</span>${bar(b.pct, '#7c3aed')}
        <small class="muted">${b.meta ? (b.v >= b.meta ? '¡Meta cumplida!' : `Te faltan ${money(b.faltan)} · ${money(b.faltan / Math.max(1, b.diasRest))} por día`) : 'Ponla en Ajustes'}</small></div>
    </div>`;
  }

  // =====================================================================
  // 3. Vendedores y comisiones (dentro de la Caja)
  // =====================================================================
  function comisionesHTML(ventas) {
    const vs = D().CFG.vendedores || [];
    if (!vs.length) return '<div class="muted small">Agrega vendedores y su % de comisión en Ajustes.</div>';
    const rows = [{ nombre: 'Yo', comision: 0 }, ...vs].map((v) => {
      const mine = ventas.filter((x) => (x.vendedor || 'Yo') === v.nombre || (v.nombre === 'Yo' && !x.vendedor));
      const tot = mine.reduce((a, x) => a + Biz.vTotal(x), 0);
      return { ...v, tot, n: mine.length, com: (tot * num(v.comision)) / 100 };
    }).filter((r) => r.n || r.nombre !== 'Yo');
    return `<table class="mini2"><thead><tr><th>Vendedor</th><th style="text-align:right">Ventas</th><th style="text-align:right">Vendido</th><th style="text-align:right">Comisión</th></tr></thead><tbody>${
      rows.map((r) => `<tr><td>${esc(r.nombre)} <span class="muted small">${r.comision ? r.comision + '%' : ''}</span></td><td style="text-align:right">${r.n}</td><td style="text-align:right">${money(r.tot)}</td><td style="text-align:right"><b>${money(r.com)}</b></td></tr>`).join('')}</tbody></table>`;
  }

  // =====================================================================
  // 4. Cotizaciones con tu marca
  // =====================================================================
  let Q = [];
  const QST = { enviada: { l: 'Enviada', c: '#2563eb' }, aceptada: { l: 'Aceptada', c: '#059669' }, rechazada: { l: 'Rechazada', c: '#dc2626' } };
  const folioTxt = (f) => 'COT-' + String(f).padStart(4, '0');
  async function loadQ() { Q = await DB.list('cotizaciones', 'folio'); }
  async function showCotizaciones() {
    try { await Biz.ensure(); await loadQ(); renderQ(); } catch (e) { $('#cotList').innerHTML = `<div class="card empty">${esc(e.message)}</div>`; }
  }
  function renderQ() {
    const { N } = D();
    const sum = (st) => Q.filter((q) => q.estado === st).reduce((a, q) => a + num(q.total), 0);
    const dec = Q.filter((q) => q.estado !== 'enviada').length, ac = Q.filter((q) => q.estado === 'aceptada').length;
    $('#cotKpis').innerHTML = `
      <div class="kpi"><b>${fmtN(Q.filter((q) => q.estado === 'enviada').length)}</b><span>Esperando respuesta</span><small class="muted">${money(sum('enviada'))}</small></div>
      <div class="kpi"><b>${fmtN(ac)}</b><span>Aceptadas</span><small class="muted">${money(sum('aceptada'))}</small></div>
      <div class="kpi"><b>${dec ? Math.round((ac / dec) * 100) : 0}%</b><span>Tasa de cierre</span></div>
      <div class="kpi"><b>${money(Q.length ? Q.reduce((a, q) => a + num(q.total), 0) / Q.length : 0)}</b><span>Cotización promedio</span></div>`;
    if (!Q.length) { $('#cotList').innerHTML = '<div class="card empty">Todavía no haces cotizaciones. Crea la primera con <b>+ Cotización</b> o desde la tarjeta de un negocio.</div>'; return; }
    $('#cotList').innerHTML = `<table><thead><tr><th>Folio</th><th>Negocio</th><th class="hide-sm">Fecha</th><th style="text-align:right">Total</th><th>Estado</th><th></th></tr></thead><tbody>${
      Q.map((q) => {
        const n = N.find((x) => x.id === q.negocio_id), s = QST[q.estado] || QST.enviada;
        const venc = q.estado === 'enviada' && Date.now() > new Date(q.fecha).getTime() + q.vigencia * 864e5;
        return `<tr><td><b>${folioTxt(q.folio)}</b></td><td>${esc(n?.nombre || '—')}<div class="muted small">${(q.items || []).map((i) => esc(i.concepto)).join(', ')}</div></td>
          <td class="hide-sm small">${Biz.fmtDay(Biz.dayOf(q.fecha))}${venc ? ' <span class="down small">vencida</span>' : ''}</td>
          <td style="text-align:right"><b>${money(q.total)}</b></td>
          <td><span class="pill" style="background:${s.c}1a;color:${s.c}">${s.l}</span></td>
          <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-qpdf="${q.id}">PDF</button> <button class="btn sm" data-qwa="${q.id}">WhatsApp</button>
            ${q.estado === 'enviada' ? `<button class="btn sm pri" data-qok="${q.id}">Aceptada</button> <button class="btn sm" data-qno="${q.id}">✕</button>` : ''}</td></tr>`;
      }).join('')}</tbody></table>`;
  }

  let qDraft = [];
  function openCotizacion(negocioId) {
    const { N, P } = D(), f = $('#fCot'); f.reset();
    f.negocio.innerHTML = '<option value="">— Elige negocio —</option>' + [...N].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((n) => `<option value="${n.id}">${esc(n.nombre)}</option>`).join('');
    if (negocioId) f.negocio.value = negocioId;
    f.vendedor.innerHTML = vendOptions(N.find((x) => x.id === +negocioId)?.vendedor);
    f.vigencia.value = 15;
    qDraft = P.length ? [{ producto_id: P[0].id, concepto: P[0].nombre, cantidad: 1, precio: num(P[0].precio) }] : [{ producto_id: null, concepto: '', cantidad: 1, precio: 0 }];
    renderDraft(); $('#dlgCot').showModal();
  }
  function renderDraft() {
    const { P } = D();
    $('#cotRows').innerHTML = qDraft.map((d, k) => `<tr data-k="${k}">
      <td><select name="prod"><option value="">Otro…</option>${P.map((p) => `<option value="${p.id}" ${p.id === d.producto_id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>
        <input name="concepto" value="${esc(d.concepto)}" placeholder="Descripción" style="margin-top:4px"></td>
      <td><input name="cantidad" type="number" min="0.01" step="any" value="${d.cantidad}"></td>
      <td><input name="precio" type="number" min="0" step="0.01" value="${d.precio}"></td>
      <td style="text-align:right;white-space:nowrap">${money2(d.cantidad * d.precio)}</td>
      <td><button type="button" class="btn sm" data-rm="${k}">✕</button></td></tr>`).join('');
    $('#cotTot').innerHTML = `Total <b>${money2(qDraft.reduce((a, d) => a + d.cantidad * d.precio, 0))}</b>`;
  }
  async function saveCot(e) {
    e.preventDefault();
    const f = e.target, items = qDraft.filter((d) => d.concepto.trim() && d.cantidad > 0);
    if (!f.negocio.value) return toast('Elige el negocio');
    if (!items.length) return toast('Agrega al menos un concepto');
    const total = Math.round(items.reduce((a, d) => a + d.cantidad * d.precio, 0) * 100) / 100;
    try {
      await loadQ();
      const q = await DB.add('cotizaciones', { folio: Math.max(0, ...Q.map((x) => x.folio)) + 1, negocio_id: +f.negocio.value, items, total, estado: 'enviada', fecha: new Date().toISOString(), vigencia: +f.vigencia.value || 15, notas: f.notas.value.trim() || null, vendedor: f.vendedor.value || null });
      // el negocio pasa a "Negociando" con el valor de la cotización
      const n = D().N.find((x) => x.id === +f.negocio.value);
      if (n && !Biz.isClient(n) && ['contactado', 'perdido', undefined, null].includes(n.estado)) await DB.upd('negocios', n.id, { estado: 'negociando', valor_estimado: total });
      else if (n && !Biz.isClient(n)) await DB.upd('negocios', n.id, { valor_estimado: total });
      $('#dlgCot').close(); await Biz.reload(); await loadQ(); refreshCurrent(); toast(`${folioTxt(q.folio)} creada`);
      pdfCot(q);
    } catch (err) { toast(err.message); }
  }
  async function aceptarCot(q) {
    const r = await Pagos.pedir({ titulo: `Aceptar ${folioTxt(q.folio)}`, texto: `Se registran las ventas en la Caja (${money2(q.total)}), se descuenta el material y el negocio pasa a cliente.<br>¿Cuánto te pagaron ya? Si fue todo, déjalo así. Si fue anticipo, cámbialo y el resto queda en <b>Te deben</b>.`, monto: num(q.total), max: num(q.total), boton: 'Aceptar cotización' });
    if (!r) return;
    let resta = r.monto;
    const { P } = D();
    for (const it of q.items || []) {
      const p = P.find((x) => x.id === it.producto_id);
      const imp = num(it.cantidad) * num(it.precio), pag = Math.min(imp, resta); resta -= pag;
      await DB.add('ventas', { negocio_id: q.negocio_id, producto_id: it.producto_id || null, concepto: it.concepto, cantidad: num(it.cantidad), precio_unit: num(it.precio), costo_unit: p ? num(p.costo) : 0, metodo: r.metodo, fecha: new Date().toISOString(), vendedor: q.vendedor || null, cotizacion_id: q.id, ...(pag < imp ? { pagado: pag } : {}) });
      if (it.producto_id) await Inv.applyStock(it.producto_id, num(it.cantidad), -1, `Cotización ${folioTxt(q.folio)}`);
    }
    await DB.upd('cotizaciones', q.id, { estado: 'aceptada' });
    if (q.negocio_id) await DB.upd('negocios', q.negocio_id, { estado: 'cliente' });
    await Biz.reload(); await loadQ(); refreshCurrent(); toast('¡Venta cerrada!');
  }

  // PDF de la cotización
  function pdfHeader(pdf, titulo, sub) {
    const c = D().CFG, W = 215.9;
    pdf.setFillColor(17, 24, 39); pdf.rect(0, 0, W, 34, 'F');
    pdf.setTextColor(255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.text((c.empresa || 'Vortex').toUpperCase(), 16, 17);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(180, 190, 205); pdf.text(L('Menús digitales · Páginas web · Reseñas de Google', 'Digital menus · Websites · Google reviews'), 16, 24);
    pdf.setTextColor(255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.text(titulo, W - 16, 15, { align: 'right' });
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(200, 210, 220); sub.forEach((s, i) => pdf.text(s, W - 16, 21 + i * 5, { align: 'right' }));
    pdf.setTextColor(17, 24, 39);
  }
  function pdfFooter(pdf) {
    const c = D().CFG, contacto = [c.tu_nombre, c.telefono, c.correo].filter(Boolean).join('  ·  ');
    pdf.setDrawColor(229, 231, 235); pdf.line(16, 262, 200, 262);
    pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.text(contacto || (c.empresa || 'Vortex'), 107.95, 268, { align: 'center' });
  }
  function pdfCot(q) {
    const { jsPDF } = window.jspdf, pdf = new jsPDF({ unit: 'mm', format: 'letter' });
    const n = D().N.find((x) => x.id === q.negocio_id) || {};
    const vence = new Date(new Date(q.fecha).getTime() + q.vigencia * 864e5);
    pdfHeader(pdf, L('COTIZACIÓN', 'QUOTE'), [folioTxt(q.folio), L('Fecha ', 'Date ') + Biz.fmtDay(Biz.dayOf(q.fecha)), L('Válida hasta ', 'Valid until ') + Biz.fmtDay(Biz.dayOf(vence))]);
    let y = 48;
    pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.text(L('PARA', 'TO'), 16, y);
    pdf.setFontSize(14); pdf.setTextColor(17, 24, 39); pdf.setFont('helvetica', 'bold'); pdf.text(n.nombre || '', 16, y + 7);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(75, 85, 99);
    pdf.text([n.giro, n.telefono, n.direccion].filter(Boolean).join('  ·  '), 16, y + 13);
    y += 26;
    pdf.setFillColor(243, 244, 246); pdf.rect(16, y, 184, 9, 'F');
    pdf.setFontSize(9); pdf.setTextColor(75, 85, 99); pdf.setFont('helvetica', 'bold');
    pdf.text(L('CONCEPTO', 'ITEM'), 19, y + 6); pdf.text(L('CANT.', 'QTY'), 128, y + 6, { align: 'right' }); pdf.text(L('PRECIO', 'PRICE'), 160, y + 6, { align: 'right' }); pdf.text(L('IMPORTE', 'AMOUNT'), 197, y + 6, { align: 'right' });
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 24, 39); pdf.setFontSize(10);
    y += 9;
    for (const it of q.items || []) {
      const lines = pdf.splitTextToSize(it.concepto, 95);
      pdf.text(lines, 19, y + 7);
      pdf.text(String(num(it.cantidad)), 128, y + 7, { align: 'right' });
      pdf.text(money2(it.precio), 160, y + 7, { align: 'right' });
      pdf.text(money2(num(it.cantidad) * num(it.precio)), 197, y + 7, { align: 'right' });
      y += 5 + lines.length * 5; pdf.setDrawColor(229, 231, 235); pdf.line(16, y + 2, 200, y + 2); y += 2;
    }
    y += 8;
    pdf.setFillColor(17, 24, 39); pdf.rect(130, y, 70, 14, 'F');
    pdf.setTextColor(255); pdf.setFontSize(10); pdf.text('TOTAL', 135, y + 9); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14);
    pdf.text(money2(q.total) + (APP.moneda === 'USD' ? ' USD' : ''), 196, y + 9.5, { align: 'right' });
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 24, 39);
    y += 26;
    if (q.notas) { pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.text(L('NOTAS', 'NOTES'), 16, y); pdf.setTextColor(55, 65, 81); pdf.setFontSize(10); pdf.text(pdf.splitTextToSize(q.notas, 184), 16, y + 6); }
    pdfFooter(pdf);
    Labels.deliver(pdf, `${folioTxt(q.folio)}-${UI.fileName(n.nombre || 'cotizacion')}.pdf`);
  }

  // =====================================================================
  // 5. Cobros mensuales (menú digital, hosting, mantenimiento…)
  // =====================================================================
  let S = [];
  async function showCobros() {
    try { await Biz.ensure(); S = await DB.list('suscripciones', 'id', true); renderCobros(); }
    catch (e) { $('#cobList').innerHTML = `<div class="card empty">${esc(e.message)}</div>`; }
  }
  function estadoMes(s) {
    const m = mesActual(), pagado = D().V.some((v) => v.suscripcion_id === s.id && v.periodo === m);
    if (pagado) return { k: 'pagado', l: 'Pagado', c: '#059669' };
    const hoy = +Biz.today().slice(8, 10);
    if (hoy > s.dia_cobro) return { k: 'atrasado', l: 'Atrasado', c: '#dc2626' };
    if (s.dia_cobro - hoy <= 3) return { k: 'pronto', l: `Cobra el ${s.dia_cobro}`, c: '#d97706' };
    return { k: 'pendiente', l: `Cobra el ${s.dia_cobro}`, c: '#6b7280' };
  }
  function renderCobros() {
    const { N } = D(), act = S.filter((s) => s.activa), m = mesActual();
    const mrr = act.reduce((a, s) => a + num(s.monto), 0), costo = act.reduce((a, s) => a + num(s.costo), 0);
    const cobrado = D().V.filter((v) => v.suscripcion_id && v.periodo === m).reduce((a, v) => a + Biz.vTotal(v), 0);
    const porCobrar = act.filter((s) => estadoMes(s).k !== 'pagado').reduce((a, s) => a + num(s.monto), 0);
    const hoy = Biz.today(), en30 = Biz.dayOf(Date.now() + 30 * 864e5);
    const renov = S.filter((s) => s.renovacion && s.renovacion <= en30);
    $('#cobKpis').innerHTML = `
      <div class="kpi"><b>${money(mrr)}</b><span>Ingreso mensual fijo</span><small class="muted">${act.length} cliente${act.length === 1 ? '' : 's'} · te quedan ${money(mrr - costo)}</small></div>
      <div class="kpi"><b class="up">${money(cobrado)}</b><span>Cobrado en ${mesNombre(m).split(' ')[0]}</span></div>
      <div class="kpi"><b class="${porCobrar ? 'down' : ''}">${money(porCobrar)}</b><span>Por cobrar este mes</span></div>
      <div class="kpi"><b class="${renov.length ? 'down' : ''}">${renov.length}</b><span>Renovaciones en 30 días</span><small class="muted">${renov.map((s) => esc(s.concepto)).slice(0, 2).join(', ') || 'Ninguna'}</small></div>`;
    if (!S.length) { $('#cobList').innerHTML = '<div class="card empty">Registra aquí lo que cobras cada mes: menú digital, hosting de la página, mantenimiento… Usa <b>+ Cobro mensual</b>.</div>'; return; }
    $('#cobList').innerHTML = `<table><thead><tr><th>Cliente</th><th>Servicio</th><th style="text-align:right">Mensual</th><th>Este mes</th><th class="hide-sm">Renovación</th><th></th></tr></thead><tbody>${
      [...S].sort((a, b) => b.activa - a.activa || a.dia_cobro - b.dia_cobro).map((s) => {
        const n = N.find((x) => x.id === s.negocio_id), e = s.activa ? estadoMes(s) : { k: 'off', l: 'Pausado', c: '#9ca3af' };
        const rv = s.renovacion ? `<span class="${s.renovacion < hoy ? 'down' : s.renovacion <= en30 ? 'warn-t' : 'muted'} small">${Biz.fmtDay(s.renovacion)}</span>` : '<span class="muted small">—</span>';
        return `<tr data-sus="${s.id}"><td><div class="name">${esc(n?.nombre || '—')}</div></td><td>${esc(s.concepto)}<div class="muted small">te cuesta ${money(s.costo)}/mes</div></td>
          <td style="text-align:right"><b>${money(s.monto)}</b></td>
          <td><span class="pill" style="background:${e.c}1a;color:${e.c}">${e.l}</span></td><td class="hide-sm">${rv}</td>
          <td style="text-align:right;white-space:nowrap">${s.activa && e.k !== 'pagado' ? `<button class="btn sm pri" data-cobrar="${s.id}">Cobrar</button> <button class="btn sm" data-recordar="${s.id}">Recordar</button>` : ''} <button class="btn sm" data-editsus="${s.id}">Editar</button></td></tr>`;
      }).join('')}</tbody></table>`;
  }
  let editS = null;
  function openSus(s) {
    editS = s || null;
    const { N } = D(), f = $('#fSus'); f.reset();
    f.negocio.innerHTML = '<option value="">— Elige cliente —</option>' + [...N].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((n) => `<option value="${n.id}">${esc(n.nombre)}</option>`).join('');
    if (s) { f.negocio.value = s.negocio_id || ''; f.concepto.value = s.concepto; f.monto.value = num(s.monto); f.costo.value = num(s.costo); f.dia.value = s.dia_cobro; f.renovacion.value = s.renovacion || ''; f.link_pago.value = s.link_pago || ''; f.activa.checked = s.activa; f.notas.value = s.notas || ''; }
    else { f.dia.value = Math.min(28, +Biz.today().slice(8, 10)); f.activa.checked = true; }
    $('#susTitle').textContent = s ? 'Editar cobro mensual' : 'Nuevo cobro mensual';
    $('#susDel').hidden = !s; $('#dlgSus').showModal();
  }
  async function saveSus(e) {
    e.preventDefault();
    const f = e.target;
    const o = { negocio_id: f.negocio.value ? +f.negocio.value : null, concepto: f.concepto.value.trim(), monto: num(f.monto.value), costo: num(f.costo.value),
      dia_cobro: Math.min(28, Math.max(1, +f.dia.value || 1)), renovacion: f.renovacion.value || null, activa: f.activa.checked, notas: f.notas.value.trim() || null, link_pago: /^https:\/\//i.test(f.link_pago.value.trim()) ? f.link_pago.value.trim() : null };
    if (!o.concepto || !o.monto) return toast('Pon el servicio y cuánto cobras');
    try { editS ? await DB.upd('suscripciones', editS.id, o) : await DB.add('suscripciones', o); $('#dlgSus').close(); await showCobros(); toast('Guardado'); }
    catch (err) { toast(err.message); }
  }
  async function cobrar(s) {
    const m = mesActual(), n = D().N.find((x) => x.id === s.negocio_id);
    if (!(await confirmar(`¿Registrar el pago de ${n?.nombre || ''} por ${money(s.monto)} (${mesNombre(m)})?`, 'Registrar pago'))) return;
    await DB.add('ventas', { negocio_id: s.negocio_id, concepto: `Mensualidad ${s.concepto} · ${mesNombre(m)}`, cantidad: 1, precio_unit: num(s.monto), costo_unit: num(s.costo), metodo: 'Transferencia', fecha: new Date().toISOString(), suscripcion_id: s.id, periodo: m, vendedor: n?.vendedor || null });
    if (n && n.estado !== 'cliente') await DB.upd('negocios', n.id, { estado: 'cliente' });
    await Biz.reload(); renderCobros(); toast('Pago registrado en la Caja');
  }

  // =====================================================================
  // 6. Reporte mensual para el cliente (escaneos de sus QR)
  // =====================================================================
  async function reporte(n, modo = 'pdf') {
    if (modo === 'pdf') toast('Armando el reporte…');
    const norm = (s) => String(s || '').trim().toLowerCase();
    const { qrs } = await UI.api('/api/qrs');
    const mine = qrs.filter((q) => norm(q.client) === norm(n.nombre));
    if (!mine.length) return toast(`No hay QR con el cliente "${n.nombre}". Ponle ese mismo nombre de cliente al QR.`);
    const det = await Promise.all(mine.map((q) => UI.api('/api/qrs/' + q.id + '/stats')));
    const m = mesActual(), [y, mo] = m.split('-').map(Number), prev = `${mo === 1 ? y - 1 : y}-${String(mo === 1 ? 12 : mo - 1).padStart(2, '0')}`;
    const byDay = {}; let total = 0, prevTot = 0;
    det.forEach(({ stats }) => (stats.days || []).forEach((d) => { if (d.d.startsWith(m)) { byDay[d.d] = (byDay[d.d] || 0) + d.c; total += d.c; } if (d.d.startsWith(prev)) prevTot += d.c; }));
    const allTime = det.reduce((a, r) => a + r.stats.total, 0);
    const link = location.origin + '/s/' + mine[0].share_token;
    if (modo === 'wa') return wa(n, 'reporte', { mes: mesNombre(m), escaneos: fmtN(total), link });

    const { jsPDF } = window.jspdf, pdf = new jsPDF({ unit: 'mm', format: 'letter' });
    pdfHeader(pdf, L('REPORTE MENSUAL', 'MONTHLY REPORT'), [mesNombre(m).replace(/^./, (c) => c.toUpperCase()), L('Generado ', 'Generated ') + Biz.fmtDay(Biz.today())]);
    pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.text(L('CLIENTE', 'CLIENT'), 16, 48);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(17, 24, 39); pdf.text(n.nombre, 16, 56); pdf.setFont('helvetica', 'normal');
    const kpi = (x, label, val, sub) => { pdf.setFillColor(243, 244, 246); pdf.roundedRect(x, 64, 58, 30, 3, 3, 'F'); pdf.setFontSize(20); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 24, 39); pdf.text(val, x + 6, 79); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.text(label, x + 6, 86); if (sub) pdf.text(sub, x + 6, 91); };
    const dif = prevTot ? Math.round(((total - prevTot) / prevTot) * 100) : null;
    kpi(16, L('Escaneos este mes', 'Scans this month'), fmtN(total), dif == null ? '' : `${dif >= 0 ? '+' : ''}${dif}% ${L('vs mes anterior', 'vs last month')}`);
    kpi(79, L('Escaneos el mes anterior', 'Scans last month'), fmtN(prevTot), '');
    kpi(142, L('Escaneos en total', 'Total scans'), fmtN(allTime), `${mine.length} ${L('código', 'code')}${mine.length === 1 ? '' : 's'}`);
    // gráfica por día
    const dias = new Date(y, mo, 0).getDate(), max = Math.max(1, ...Object.values(byDay));
    pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.text(L('ESCANEOS POR DÍA', 'SCANS PER DAY'), 16, 108);
    const gx = 16, gy = 112, gw = 184, gh = 50, bw = gw / dias;
    pdf.setDrawColor(229, 231, 235); pdf.line(gx, gy + gh, gx + gw, gy + gh);
    for (let d = 1; d <= dias; d++) {
      const c = byDay[`${m}-${String(d).padStart(2, '0')}`] || 0, h = (c / max) * (gh - 6);
      if (c) { pdf.setFillColor(15, 118, 110); pdf.rect(gx + (d - 1) * bw + 0.6, gy + gh - h, bw - 1.2, h, 'F'); }
      if (d === 1 || d % 5 === 0) { pdf.setFontSize(7); pdf.setTextColor(107, 114, 128); pdf.text(String(d), gx + (d - 0.5) * bw, gy + gh + 4, { align: 'center' }); }
    }
    // códigos
    let yy = 180; pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.text(L('TUS CÓDIGOS', 'YOUR CODES'), 16, yy); yy += 6;
    pdf.setFontSize(10); pdf.setTextColor(17, 24, 39);
    det.forEach(({ qr, stats }) => { const mc = (stats.days || []).filter((d) => d.d.startsWith(m)).reduce((a, d) => a + d.c, 0); pdf.text(qr.name, 16, yy); pdf.text(`${fmtN(mc)} ${L('este mes', 'this month')} · ${fmtN(stats.total)} ${L('en total', 'total')}`, 200, yy, { align: 'right' }); yy += 6; });
    yy += 6; pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.text(L('Estadísticas en vivo', 'Live stats'), 16, yy); pdf.setTextColor(37, 99, 235); pdf.textWithLink(link, 16, yy + 5, { url: link });
    pdfFooter(pdf);
    Labels.deliver(pdf, `reporte-${UI.fileName(n.nombre)}-${m}.pdf`);
  }

  // portal del cliente
  async function portal(n) {
    let tk = n.portal_token;
    if (!tk) { tk = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''); await DB.upd('negocios', n.id, { portal_token: tk }); await Biz.reload(); }
    const link = `${location.origin}/c/${tk}`;
    if (n.telefono) return wa(n, 'portal', { link });
    navigator.clipboard?.writeText(link).then(() => toast('Link del portal copiado'), () => prompt('Copia el link', link));
  }

  // ---------- eventos ----------
  function refreshCurrent() {
    const v = (location.hash || '#resumen').slice(1);
    if (v === 'negocios') Biz.showNegocios(); if (v === 'caja') Biz.showCaja();
    if (v === 'cotizaciones') { showCotizaciones(); Contratos.show(); } if (v === 'cobros') showCobros();
  }
  function wire() {
    $('#waTabs').onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; document.querySelectorAll('#waTabs button').forEach((x) => x.classList.toggle('on', x === b)); $('#waText').value = fill(plantillas()[b.dataset.k].t, waCtx.vars); };
    $('#waGo').onclick = waOpen;
    $('#fAj').onsubmit = saveAjustes;
    $('#cotNew').onclick = () => openCotizacion();
    $('#fCot').onsubmit = saveCot;
    $('#fCot').negocio.onchange = (e) => { $('#fCot').vendedor.innerHTML = vendOptions(D().N.find((x) => x.id === +e.target.value)?.vendedor); };
    $('#cotAdd').onclick = () => { qDraft.push({ producto_id: null, concepto: '', cantidad: 1, precio: 0 }); renderDraft(); };
    $('#cotRows').addEventListener('change', (e) => {
      const tr = e.target.closest('[data-k]'); if (!tr) return; const d = qDraft[+tr.dataset.k];
      if (e.target.name === 'prod') { const p = D().P.find((x) => x.id === +e.target.value); d.producto_id = p ? p.id : null; if (p) { d.concepto = p.nombre; d.precio = num(p.precio); } }
      else if (e.target.name === 'concepto') d.concepto = e.target.value;
      else d[e.target.name] = num(e.target.value);
      renderDraft();
    });
    $('#cotRows').onclick = (e) => { const b = e.target.closest('[data-rm]'); if (b) { qDraft.splice(+b.dataset.rm, 1); renderDraft(); } };
    $('#cotList').onclick = async (e) => {
      const g = (a) => e.target.closest(`[${a}]`)?.getAttribute(a);
      const q = (id) => Q.find((x) => x.id === +id);
      if (g('data-qpdf')) pdfCot(q(g('data-qpdf')));
      if (g('data-qwa')) { const c = q(g('data-qwa')), n = D().N.find((x) => x.id === c.negocio_id); wa(n, 'propuesta', { monto: money(c.total), servicios: (c.items || []).map((i) => i.concepto).join(', ') }); }
      if (g('data-qok')) aceptarCot(q(g('data-qok')));
      if (g('data-qno') && (await confirmar('¿Marcar como rechazada?', 'Rechazada'))) { await DB.upd('cotizaciones', +g('data-qno'), { estado: 'rechazada' }); await loadQ(); renderQ(); }
    };
    $('#susNew').onclick = () => openSus();
    $('#fSus').onsubmit = saveSus;
    $('#susDel').onclick = async () => { if (editS && (await confirmar('¿Borrar este cobro mensual? Los pagos ya registrados se quedan en la Caja.'))) { await DB.del('suscripciones', editS.id); $('#dlgSus').close(); showCobros(); } };
    $('#cobList').onclick = (e) => {
      const g = (a) => e.target.closest(`[${a}]`)?.getAttribute(a), s = (id) => S.find((x) => x.id === +id);
      if (g('data-cobrar')) cobrar(s(g('data-cobrar')));
      if (g('data-editsus')) openSus(s(g('data-editsus')));
      if (g('data-recordar')) { const x = s(g('data-recordar')); const lp = x.link_pago || D().CFG.link_pago; wa(D().N.find((n) => n.id === x.negocio_id), 'cobro', { servicio: x.concepto, monto: money(x.monto), dia: x.dia_cobro, pago: lp ? L('Puede pagar aquí', 'You can pay here') + ' ' + lp : L('Puede pagar por transferencia o en efectivo.', '') }); }
    };
  }
  wire();

  return { portal, pdfHeader, pdfFooter, wa, openAjustes, openCotizacion, showCotizaciones, showCobros, reporte, metasHTML, comisionesHTML, vendOptions, refreshCurrent };
})();
