// Contratos: sistema dental, página web, menú digital y placas. Folio consecutivo, Word y firma en línea.
window.Contratos = (() => {
  const { esc } = UI;
  const $ = (s) => document.querySelector(s);
  const num = (x) => Number(x) || 0;
  const D = () => Biz.data();
  const CD = ContratoDoc, folioTxt = CD.folioTxt;
  const linkFirma = (k) => `${location.origin}/f/${k.token}`;

  let K = [];
  async function load() { try { K = await DB.list('contratos', 'folio'); } catch (e) { K = []; } }
  function renderLista() {
    const el = $('#conList'); if (!el) return;
    const N = D().N;
    if (!K.length) { el.innerHTML = '<div class="muted small">Todavía no haces contratos. Usa <b>+ Contrato</b> o el botón Contrato en la ficha del negocio.</div>'; return; }
    el.innerHTML = `<table class="mini2"><thead><tr><th>Folio</th><th>Cliente</th><th class="hide-sm">Tipo</th><th style="text-align:right">Total</th><th>Estado</th><th></th></tr></thead><tbody>${
      K.map((k) => {
        const firm = k.estado === 'firmado';
        return `<tr><td><b>${folioTxt(k.folio)}</b><div class="muted small">${CD.fechaCorta(k.fecha)}</div></td><td>${esc(k.cliente)}<div class="muted small">${esc(N.find((n) => n.id === k.negocio_id)?.nombre || k.ciudad || '')}</div></td>
        <td class="hide-sm small">${esc((CD.TIPOS[k.tipo] || CD.TIPOS.dental).nombre)}</td><td style="text-align:right"><b>${fmtMoney(k.total)}</b>${num(k.anticipo) ? `<div class="muted small">anticipo ${fmtMoney(k.anticipo)}</div>` : ''}</td>
        <td><span class="pill" style="${firm ? 'background:#0596691a;color:#059669' : 'background:#2563eb1a;color:#2563eb'}">${firm ? (k.firmado_at ? 'Firmado en línea' : 'Firmado') : 'Por firmar'}</span></td>
        <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-kdoc="${k.id}">Word</button>${!firm ? ` <button class="btn sm" data-kwa="${k.id}">Mandar a firmar</button> <button class="btn sm" data-kcopy="${k.id}" title="Copiar link de firma">Link</button> <button class="btn sm pri" data-kfir="${k.id}">Firmado</button>` : ''}</td></tr>`;
      }).join('')}</tbody></table>`;
  }
  async function show() { await load(); renderLista(); }

  // ---------- formulario ----------
  function open(negocioId, tipo) {
    const { N } = D(), f = $('#fCon'); f.reset();
    f.tipo.innerHTML = Object.entries(CD.TIPOS).map(([k, t]) => `<option value="${k}">${t.nombre}</option>`).join('');
    f.negocio.innerHTML = '<option value="">— Sin ligar a un negocio —</option>' + [...N].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((n) => `<option value="${n.id}">${esc(n.nombre)}</option>`).join('');
    f.fecha.value = Biz.today(); f.ciudad.value = 'Tepic, Nayarit'; f.cantidad.value = 1; f.anticipo.value = 0; f.mensualidad.value = 0;
    const giro = N.find((x) => x.id === +negocioId)?.giro || '';
    f.tipo.value = tipo || (!negocioId || /dent/i.test(giro) ? 'dental' : /rest|taco|taquer|caf|comida|pizz|mariscos|bar/i.test(giro) ? 'menu' : 'web');
    setTipo();
    if (negocioId) { f.negocio.value = negocioId; fromNegocio(); }
    load().then(() => { $('#conFolio').textContent = folioTxt(Math.max(0, ...K.map((k) => k.folio)) + 1); preview(); });
    $('#dlgCon').showModal();
  }
  function setTipo() {
    const f = $('#fCon'), T = CD.TIPOS[f.tipo.value];
    f.total.value = T.precio * (f.tipo.value === 'placas' ? num(f.cantidad.value) || 1 : 1);
    $('#conCantBox').hidden = f.tipo.value !== 'placas';
    f.mensualidad.value = f.tipo.value === 'menu' ? 350 : 0;
    preview();
  }
  function fromNegocio() {
    const f = $('#fCon'), n = D().N.find((x) => x.id === +f.negocio.value); if (!n) return;
    if (n.contacto) { f.cliente.value = n.contacto; f.genero.value = generoDe(n.contacto); }
    if (num(n.valor_estimado)) f.total.value = num(n.valor_estimado);
    preview();
  }
  const generoDe = (s) => (/^(dr|lic|ing|sr|c\.?p)\b\.?/i.test(s.trim()) && !/^(dra|lic\.?da|inga|sra)\b/i.test(s.trim()) ? 'm' : 'f');
  function preview() {
    const f = $('#fCon'), t = num(f.total.value), sub = Math.round((t / 1.16) * 100) / 100, ant = Math.min(t, num(f.anticipo.value));
    if (document.activeElement === f.cliente) f.genero.value = generoDe(f.cliente.value);
    $('#conCalc').innerHTML = `Subtotal ${CD.m2(sub)} · IVA ${CD.m2(Math.round((t - sub) * 100) / 100)} · <b>Total ${CD.m2(t)}</b>` +
      (ant ? `<br>Anticipo ${CD.m2(ant)} · resto a la entrega ${CD.m2(t - ant)}` : '') + (num(f.mensualidad.value) ? `<br>Más ${CD.m2(f.mensualidad.value)} al mes` : '') +
      `<br><span class="muted small">${CD.totalLetra(t, APP.moneda)}</span>`;
  }
  async function save(e) {
    e.preventDefault();
    const f = e.target;
    if (!f.cliente.value.trim()) return toast('Pon el nombre del cliente');
    try {
      await load();
      const k = await DB.add('contratos', { folio: Math.max(0, ...K.map((x) => x.folio)) + 1, tipo: f.tipo.value, negocio_id: f.negocio.value ? +f.negocio.value : null,
        cliente: f.cliente.value.trim(), genero: f.genero.value, ciudad: f.ciudad.value.trim() || null, fecha: f.fecha.value, total: num(f.total.value),
        cantidad: f.tipo.value === 'placas' ? num(f.cantidad.value) || 1 : 1, anticipo: Math.min(num(f.total.value), num(f.anticipo.value)), mensualidad: num(f.mensualidad.value), estado: 'enviado' });
      // el negocio pasa a "Cerrado" (ya nada más falta la firma)
      const n = D().N.find((x) => x.id === k.negocio_id);
      if (n && !Biz.isClient(n)) { await DB.upd('negocios', n.id, { estado: 'cerrado', valor_estimado: num(k.total), contacto: n.contacto || k.cliente }); await Biz.reload(); }
      $('#dlgCon').close(); await show(); toast(`${folioTxt(k.folio)} creado`);
      if (f.que.value === 'wa' && n?.telefono) mandar(k); else await generar(k);
    } catch (err) { toast(err.message); }
  }
  function mandar(k) {
    const n = D().N.find((x) => x.id === k.negocio_id);
    if (!n?.telefono) { copiar(k); return toast('Este contrato no tiene negocio con teléfono. Te copié el link para que lo mandes tú.'); }
    Vx.wa(n, 'firma', { link: linkFirma(k), monto: fmtMoney(k.total), servicio: (CD.TIPOS[k.tipo] || CD.TIPOS.dental).nombre.toLowerCase() });
  }
  function copiar(k) { navigator.clipboard?.writeText(linkFirma(k)).then(() => toast('Link de firma copiado'), () => prompt('Copia el link', linkFirma(k))); }
  async function firmado(k) {
    if (!(await confirmar(`¿Marcar ${folioTxt(k.folio)} como firmado? Se registra la venta de ${fmtMoney(k.total)} en la Caja${num(k.anticipo) ? ` con ${fmtMoney(k.anticipo)} de anticipo` : ''}${num(k.mensualidad) ? ' y se da de alta el cobro mensual' : ''}.`, 'Firmado'))) return;
    await DB.upd('contratos', k.id, { estado: 'firmado' });
    await DB.add('ventas', { negocio_id: k.negocio_id, concepto: `${(CD.TIPOS[k.tipo] || CD.TIPOS.dental).nombre} · contrato ${folioTxt(k.folio)}`, cantidad: 1, precio_unit: num(k.total), costo_unit: 0, metodo: 'Transferencia', fecha: new Date().toISOString(), contrato_id: k.id, pagado: num(k.anticipo) });
    if (num(k.mensualidad)) await DB.add('suscripciones', { negocio_id: k.negocio_id, concepto: { web: 'Hosting y mantenimiento de página web', menu: 'Menú digital' }[k.tipo] || 'Mantenimiento del sistema', monto: num(k.mensualidad), costo: 0, dia_cobro: Math.min(28, +Biz.today().slice(8, 10)), activa: true, notas: 'Contrato ' + folioTxt(k.folio) });
    if (k.negocio_id) await DB.upd('negocios', k.negocio_id, { estado: 'cliente' });
    await Biz.reload(); await show(); toast('¡Contrato firmado y venta registrada!');
  }

  // ---------- el Word ----------
  async function lib() {
    if (window.docx) return window.docx;
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/docx@9.15.4/dist/index.iife.js'; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar el generador de Word')); document.head.appendChild(s); });
    return window.docx;
  }
  async function generar(k) {
    toast('Armando el contrato…');
    const X = await lib();
    const n = D().N.find((x) => x.id === k.negocio_id);
    const doc = CD.docx(X, k, D().CFG, { negocio: n?.nombre, moneda: APP.moneda });
    const blob = await X.Packer.toBlob(doc);
    const name = `Contrato ${folioTxt(k.folio)} ${k.cliente.replace(/[^\wÁÉÍÓÚÑáéíóúñ .-]/g, '')}${k.firma ? ' (firmado)' : ''}.docx`;
    if (window.deliverBlob) return window.deliverBlob(blob, name);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Contrato listo');
  }

  function wire() {
    $('#conNew').onclick = () => open();
    $('#fCon').onsubmit = save;
    $('#fCon').addEventListener('input', preview);
    $('#fCon').tipo.onchange = setTipo;
    $('#fCon').cantidad.oninput = () => { if ($('#fCon').tipo.value === 'placas') $('#fCon').total.value = CD.TIPOS.placas.precio * (num($('#fCon').cantidad.value) || 1); preview(); };
    $('#fCon').negocio.onchange = fromNegocio;
    $('#conList').onclick = (e) => {
      const g = (a) => e.target.closest(`[${a}]`)?.getAttribute(a), k = (id) => K.find((x) => x.id === +id);
      if (g('data-kdoc')) generar(k(g('data-kdoc')));
      if (g('data-kfir')) firmado(k(g('data-kfir')));
      if (g('data-kwa')) mandar(k(g('data-kwa')));
      if (g('data-kcopy')) copiar(k(g('data-kcopy')));
    };
  }
  wire();
  return { open, show, generar, totalLetra: (t) => CD.totalLetra(t, APP.moneda), list: () => K, load };
})();
