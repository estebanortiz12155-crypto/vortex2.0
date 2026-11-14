// Primera vez: bienvenida en 3 pasos y lista de primeros pasos
window.Inicio = (() => {
  const { esc } = UI;
  const $ = (s) => document.querySelector(s);
  const num = (x) => Number(x) || 0;
  const D = () => Biz.data();
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  const PROD = [
    ['Placa de reseñas Google (QR + NFC)', 450, 150, true], ['Folleto de reseñas con QR', 150, 45, true],
    ['Menú digital', 1500, 0, true], ['Página web', 2500, 300, true], ['Sistema dental de citas', 1500, 0, false],
  ];
  const MAT = [['Placa de acrílico 10×15', 'pza', 60, 5], ['Etiqueta NFC', 'pza', 12, 20], ['Papel fotográfico A4', 'hoja', 8, 10], ['Tinta (por impresión)', 'pza', 3.5, 30]];
  let paso = 1;

  function abrir() {
    const c = D().CFG, f = $('#fOnb');
    f.tu_nombre.value = c.tu_nombre || ''; f.empresa.value = c.empresa || 'Vortex'; f.telefono.value = c.telefono || ''; f.ciudad.value = c.ciudad || 'Tepic, Nayarit';
    f.meta.value = c.meta || 1000; f.meta_mes_negocios.value = c.meta_mes_negocios || 100; f.meta_mes_ventas.value = num(c.meta_mes_ventas) || 15000;
    const hay = D().P.length > 0;
    $('#onbProd').innerHTML = hay ? '<p class="muted small">Ya tienes productos cargados, este paso se salta.</p>'
      : PROD.map(([n, p, , on], i) => `<label class="onb-opt"><input type="checkbox" name="p${i}" ${on ? 'checked' : ''}><span>${esc(n)}</span><input type="number" name="pp${i}" value="${p}" min="0" step="1"></label>`).join('')
        + '<label class="chk" style="margin-top:10px"><input type="checkbox" name="mats" checked> Cargar también los materiales (acrílico, NFC, papel y tinta) con stock en 0</label>';
    ir(1); $('#dlgOnb').showModal();
  }
  function ir(n) {
    paso = n;
    document.querySelectorAll('#dlgOnb [data-paso]').forEach((p) => (p.hidden = +p.dataset.paso !== n));
    document.querySelectorAll('#onbDots i').forEach((d, i) => d.classList.toggle('on', i < n));
    $('#onbBack').style.visibility = n > 1 ? 'visible' : 'hidden';
    $('#onbNext').textContent = n === 3 ? '¡Listo, empezar!' : 'Siguiente';
  }
  async function siguiente() {
    const f = $('#fOnb');
    if (paso === 1 && !f.tu_nombre.value.trim()) { f.tu_nombre.focus(); return toast('Escribe tu nombre'); }
    if (paso < 3) return ir(paso + 1);
    const btn = $('#onbNext'); btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      const c = D().CFG;
      await DB.upsert('ajustes', { empresa: f.empresa.value.trim() || 'Vortex', tu_nombre: f.tu_nombre.value.trim(), telefono: f.telefono.value.trim() || null, ciudad: f.ciudad.value.trim() || null,
        firma: c.firma || f.tu_nombre.value.trim(), meta: Math.max(1, num(f.meta.value) || 1000), meta_mes_negocios: num(f.meta_mes_negocios.value), meta_mes_ventas: num(f.meta_mes_ventas.value),
        servicios: c.servicios?.length ? c.servicios : ['Menú digital', 'Página web', 'Placa de reseñas Google (QR + NFC)', 'Folleto de reseñas', 'Sistema de citas', 'Redes sociales'] });
      if (!D().P.length) {
        for (let i = 0; i < PROD.length; i++) if (f['p' + i]?.checked) await DB.add('productos', { nombre: PROD[i][0], precio: num(f['pp' + i].value), costo: PROD[i][2], costo_extra: PROD[i][2] });
        if (f.mats?.checked) for (const [nombre, unidad, costo, minimo] of MAT) await DB.add('insumos', { nombre, unidad, costo, stock: 0, minimo });
      }
      LS('vx-onb', 'ok'); $('#dlgOnb').close(); await Biz.reload(); render(); toast('¡Listo! Ya puedes empezar');
    } catch (e) { toast(e.message); }
    finally { btn.disabled = false; ir(3); }
  }

  // lista de primeros pasos (en Resumen y Negocios hasta que la quites)
  async function pasos() {
    const { N, V, CFG } = D();
    let qrs = 0, cots = 0; try { qrs = (await UI.api('/api/qrs')).qrs.length; } catch (e) { /* */ }
    try { cots = (await DB.list('cotizaciones', 'id')).length + Contratos.list().length; } catch (e) { /* */ }
    return [
      { ok: !!CFG.tu_nombre, t: 'Pon tus datos', d: 'Tu nombre, teléfono y metas', a: 'ajustes' },
      { ok: N.length > 0, t: 'Agrega tu primer negocio', d: 'A quién le vas a vender', a: 'negocio' },
      { ok: qrs > 0, t: 'Crea tus primeros QR', d: 'Un lote en blanco para imprimir', a: 'lote' },
      { ok: cots > 0, t: 'Manda una cotización o contrato', d: 'Con tu marca, por WhatsApp', a: 'cotizar' },
      { ok: V.length > 0, t: 'Registra tu primera venta', d: 'Y empieza a ver tu Caja', a: 'venta' },
      { ok: !!CFG.link_pago, t: 'Pon tu link de pago', d: 'Stripe o Mercado Pago, para cobrar con tarjeta', a: 'ajustes' },
    ];
  }
  async function render() {
    const els = ['#vxStart', '#vxStart2'].map($).filter(Boolean);
    if (LS('vx-pasos') === 'off') return els.forEach((e) => (e.innerHTML = ''));
    let P; try { await Biz.ensure(); P = await pasos(); } catch (e) { return; }
    const hechos = P.filter((p) => p.ok).length;
    if (hechos === P.length) return els.forEach((e) => (e.innerHTML = ''));
    const html = `<div class="card start"><div class="start-h"><div><h3 style="margin:0">Primeros pasos</h3><b>${hechos} de ${P.length} listos</b></div>
      <button class="btn sm" data-startoff>Ocultar</button></div><div class="prog"><i style="width:${(hechos / P.length) * 100}%"></i></div>
      <div class="start-g">${P.map((p) => `<button class="start-i ${p.ok ? 'ok' : ''}" data-start="${p.a}" ${p.ok ? 'disabled' : ''}><span class="ck">${p.ok ? '✓' : ''}</span><span><b>${p.t}</b><small>${p.d}</small></span></button>`).join('')}</div></div>`;
    els.forEach((e) => (e.innerHTML = html));
  }
  function accion(a) {
    if (a === 'ajustes') return LS('vx-onb') ? Vx.openAjustes() : abrir();
    if (a === 'negocio') { location.hash = '#negocios'; return setTimeout(() => $('#bizNew')?.click(), 300); }
    if (a === 'lote') return $('#loteBtn').click();
    if (a === 'cotizar') return Vx.openCotizacion();
    if (a === 'venta') return Biz.openVenta();
  }

  function wire() {
    $('#onbNext').onclick = siguiente;
    $('#onbBack').onclick = () => ir(Math.max(1, paso - 1));
    $('#onbSkip').onclick = () => { LS('vx-onb', 'skip'); $('#dlgOnb').close(); render(); };
    document.addEventListener('click', (e) => {
      const s = e.target.closest('[data-start]'); if (s) return accion(s.dataset.start);
      if (e.target.closest('[data-startoff]')) { LS('vx-pasos', 'off'); render(); }
    });
    window.addEventListener('hashchange', () => setTimeout(render, 400));
  }
  wire();
  // al entrar: si nunca has puesto tus datos, sale la bienvenida
  async function arrancar() {
    for (let i = 0; i < 40 && document.getElementById('app')?.hidden !== false; i++) await new Promise((r) => setTimeout(r, 250));
    try { await Biz.ensure(); } catch (e) { return; }
    if (!D().CFG.tu_nombre && !LS('vx-onb')) abrir();
    render();
  }
  arrancar();
  return { abrir, render };
})();
