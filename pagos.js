// Anticipos, saldos por cobrar, abonos y recibos de pago
window.Pagos = (() => {
  const { esc } = UI;
  const $ = (s) => document.querySelector(s);
  const num = (x) => Number(x) || 0;
  const D = () => Biz.data();
  const money = (n) => fmtMoney(n, 0), money2 = (n) => fmtMoney(n, 2);
  const L = (es, en) => (D().CFG.idioma === 'en' ? en : es);
  const total = (v) => Biz.vTotal(v);
  const pagado = (v) => (v.pagado == null ? total(v) : Math.min(total(v), num(v.pagado)));
  const saldo = (v) => Math.round((total(v) - pagado(v)) * 100) / 100;
  const deben = () => D().V.filter((v) => saldo(v) > 0.005);
  const recFolio = (v) => 'REC-' + String(v.id).padStart(5, '0');

  // ---------- pedir un monto (anticipo, abono) ----------
  let pedirRes = null;
  function pedir({ titulo, texto, monto, max, boton = 'Guardar' }) {
    const f = $('#fPedir'); f.reset();
    $('#pedTitle').textContent = titulo; $('#pedText').innerHTML = texto || '';
    f.monto.value = monto ?? ''; f.monto.max = max ?? ''; f.fecha.value = Biz.today(); $('#pedOk').textContent = boton;
    $('#dlgPedir').showModal(); setTimeout(() => f.monto.select(), 50);
    return new Promise((res) => { pedirRes = res; });
  }

  // ---------- lo que te deben (en la Caja) ----------
  function render() {
    const el = $('#cajaDeben'); if (!el) return;
    const L2 = deben().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const tot = L2.reduce((a, v) => a + saldo(v), 0);
    $('#debenTot').textContent = tot ? `· ${money(tot)}` : '';
    if (!L2.length) { el.innerHTML = '<div class="muted small">Nadie te debe. Cuando registres un anticipo o una venta a crédito aparece aquí.</div>'; return; }
    const N = D().N;
    el.innerHTML = `<table class="mini2"><thead><tr><th>Cliente</th><th class="hide-sm">Concepto</th><th style="text-align:right">Total</th><th style="text-align:right">Pagado</th><th style="text-align:right">Debe</th><th></th></tr></thead><tbody>${
      L2.map((v) => { const n = N.find((x) => x.id === v.negocio_id), dias = Math.floor((Date.now() - new Date(v.fecha)) / 864e5);
        return `<tr><td><div class="name">${esc(n?.nombre || '—')}</div><div class="muted small">hace ${dias} día${dias === 1 ? '' : 's'}</div></td><td class="hide-sm small">${esc(v.concepto)}</td>
        <td style="text-align:right">${money(total(v))}</td><td style="text-align:right">${money(pagado(v))}</td><td style="text-align:right"><b class="down">${money(saldo(v))}</b></td>
        <td style="text-align:right;white-space:nowrap"><button class="btn sm pri" data-abonar="${v.id}">Abonar</button> ${n?.telefono ? `<button class="btn sm" data-recsaldo="${v.id}">Recordar</button> ` : ''}<button class="btn sm" data-recibo="${v.id}">Recibo</button></td></tr>`; }).join('')}</tbody></table>`;
  }

  async function abonar(v) {
    const s = saldo(v), n = D().N.find((x) => x.id === v.negocio_id);
    const r = await pedir({ titulo: 'Registrar abono', texto: `${esc(n?.nombre || '')} debe <b>${money2(s)}</b> de ${esc(v.concepto)}`, monto: s, max: s, boton: 'Guardar y hacer recibo' });
    if (!r) return;
    const m = Math.min(s, r.monto);
    try {
      const prev = await DB.list('abonos', 'folio').catch(() => []);
      await DB.add('abonos', { folio: Math.max(0, ...prev.map((a) => a.folio)) + 1, venta_id: v.id, negocio_id: v.negocio_id, monto: m, metodo: r.metodo, fecha: r.fecha, concepto: v.concepto });
      await DB.upd('ventas', v.id, { pagado: Math.round((pagado(v) + m) * 100) / 100 });
      await Biz.reload(); Biz.showCaja();
      toast(m >= s ? '¡Quedó liquidado!' : `Abono registrado · todavía debe ${money(s - m)}`);
      recibo(D().V.find((x) => x.id === v.id), m);
    } catch (e) { toast(e.message); }
  }
  function recordar(v) {
    const n = D().N.find((x) => x.id === v.negocio_id), link = D().CFG.link_pago;
    Vx.wa(n, 'saldo', { monto: money(saldo(v)), servicio: v.concepto, pago: link ? L('Puede pagar aquí', 'You can pay here') + ' ' + link : '' });
  }

  // ---------- recibo en PDF ----------
  async function recibo(v, esteAbono) {
    const { jsPDF } = window.jspdf, pdf = new jsPDF({ unit: 'mm', format: 'letter' });
    const n = D().N.find((x) => x.id === v.negocio_id) || {}, c = D().CFG;
    let ab = []; try { ab = (await DB.list('abonos', 'fecha', true)).filter((a) => a.venta_id === v.id); } catch (e) { /* sin tabla */ }
    const recibido = esteAbono ?? (ab.length ? num(ab[ab.length - 1].monto) : pagado(v));
    Vx.pdfHeader(pdf, L('RECIBO DE PAGO', 'PAYMENT RECEIPT'), [recFolio(v) + (ab.length ? '-' + ab.length : ''), L('Fecha ', 'Date ') + Biz.fmtDay(Biz.today())]);
    let y = 52;
    pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.text(L('RECIBIMOS DE', 'RECEIVED FROM'), 16, y);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.setTextColor(17, 24, 39); pdf.text(n.nombre || n.contacto || '—', 16, y + 7); pdf.setFont('helvetica', 'normal');
    y += 20;
    pdf.setFillColor(236, 253, 245); pdf.roundedRect(16, y, 184, 26, 3, 3, 'F');
    pdf.setFontSize(9); pdf.setTextColor(6, 95, 70); pdf.text(L('LA CANTIDAD DE', 'THE AMOUNT OF'), 22, y + 8);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.text(money2(recibido) + (APP.moneda === 'USD' ? ' USD' : ''), 22, y + 19); pdf.setFont('helvetica', 'normal');
    if (c.idioma !== 'en') { pdf.setFontSize(8.5); pdf.text(ContratoDoc.totalLetra(recibido, APP.moneda), 196, y + 19, { align: 'right' }); }
    y += 36;
    const row = (l, val, bold) => { pdf.setFontSize(10); pdf.setTextColor(107, 114, 128); pdf.text(l, 16, y); pdf.setTextColor(17, 24, 39); if (bold) pdf.setFont('helvetica', 'bold'); pdf.text(val, 200, y, { align: 'right' }); pdf.setFont('helvetica', 'normal'); pdf.setDrawColor(229, 231, 235); pdf.line(16, y + 3, 200, y + 3); y += 10; };
    row(L('Por concepto de', 'For'), pdf.splitTextToSize(v.concepto, 120)[0]);
    row(L('Forma de pago', 'Payment method'), (esteAbono != null ? ab[ab.length - 1]?.metodo : v.metodo) || v.metodo || '—');
    row(L('Total del servicio', 'Service total'), money2(total(v)));
    row(L('Pagado a la fecha', 'Paid to date'), money2(pagado(v)));
    row(L('Saldo pendiente', 'Balance due'), saldo(v) > 0 ? money2(saldo(v)) : L('Liquidado', 'Paid in full'), true);
    if (ab.length > 1) {
      y += 6; pdf.setFontSize(9); pdf.setTextColor(107, 114, 128); pdf.text(L('PAGOS', 'PAYMENTS'), 16, y); y += 6;
      pdf.setFontSize(9.5); pdf.setTextColor(55, 65, 81);
      ab.forEach((a) => { pdf.text(`${Biz.fmtDay(Biz.dayOf(a.fecha))} · ${a.metodo || ''}`, 16, y); pdf.text(money2(a.monto), 200, y, { align: 'right' }); y += 5.5; });
    }
    if (saldo(v) > 0 && c.link_pago) { y += 8; pdf.setFontSize(9.5); pdf.setTextColor(107, 114, 128); pdf.text(L('Paga el saldo en línea', 'Pay the balance online'), 16, y); pdf.setTextColor(37, 99, 235); pdf.textWithLink(c.link_pago, 16, y + 5, { url: c.link_pago }); }
    // firma
    pdf.setDrawColor(156, 163, 175); pdf.line(130, 236, 200, 236); pdf.setFontSize(9); pdf.setTextColor(75, 85, 99);
    pdf.text(c.firma || c.tu_nombre || c.empresa || 'Vortex', 165, 241, { align: 'center' }); pdf.text(L('Recibí', 'Received by'), 165, 246, { align: 'center' });
    Vx.pdfFooter(pdf);
    Labels.deliver(pdf, `${recFolio(v)}-${UI.fileName(n.nombre || 'recibo')}.pdf`);
    if (n.telefono) setTimeout(() => Vx.wa(n, 'recibo', { monto: money(recibido), saldo: saldo(v) > 0 ? L(`Queda un saldo de ${money(saldo(v))}.`, `Remaining balance ${money(saldo(v))}.`) : L('Su cuenta quedó liquidada.', 'Your account is paid in full.') }), 900);
  }

  function wire() {
    $('#fPedir').onsubmit = (e) => { e.preventDefault(); const f = e.target; const m = num(f.monto.value); if (m <= 0) return toast('Pon el monto'); $('#dlgPedir').close(); const r = pedirRes; pedirRes = null; r && r({ monto: m, metodo: f.metodo.value, fecha: new Date(f.fecha.value + 'T12:00:00').toISOString() }); };
    $('#dlgPedir').addEventListener('close', () => { if (pedirRes) { const r = pedirRes; pedirRes = null; r(null); } });
    document.addEventListener('click', (e) => {
      const g = (a) => e.target.closest(`[${a}]`)?.getAttribute(a), v = (id) => D().V.find((x) => x.id === +id);
      if (g('data-abonar')) abonar(v(g('data-abonar')));
      else if (g('data-recibo')) recibo(v(g('data-recibo')));
      else if (g('data-recsaldo')) recordar(v(g('data-recsaldo')));
    });
  }
  wire();
  return { render, pedir, saldo, pagado, deben, recibo, abonar };
})();
