// Inventario: materiales (stock y costo) y de qué está hecho cada producto
window.Inv = (() => {
  const { esc, fmtN } = UI;
  const $ = (s) => document.querySelector(s);
  const num = (x) => Number(x) || 0;
  const money = (n) => fmtMoney(n, 0);
  const money2 = (n) => fmtMoney(n, 2);
  const qty = (n) => (Math.round(num(n) * 1000) / 1000).toLocaleString('es-MX');
  const UNIDADES = ['pza', 'hoja', 'm', 'cm', 'ml', 'g', 'hr', 'servicio'];

  let I = [], R = [], P = [];
  async function load() {
    [I, R, P] = await Promise.all([DB.list('insumos', 'nombre', true), DB.list('receta', 'id', true), DB.list('productos', 'id', true)]);
  }
  const insumo = (id) => I.find((x) => x.id === id);
  const lines = (pid) => R.filter((r) => r.producto_id === pid);
  const matCost = (pid) => lines(pid).reduce((a, r) => a + num(r.cantidad) * num(insumo(r.insumo_id)?.costo), 0);
  const prodCost = (p) => matCost(p.id) + num(p.costo_extra);
  // cuántas piezas puedes hacer con el stock actual
  const canMake = (pid) => {
    const ls = lines(pid).filter((r) => num(r.cantidad) > 0);
    if (!ls.length) return null;
    return Math.max(0, Math.min(...ls.map((r) => Math.floor(num(insumo(r.insumo_id)?.stock) / num(r.cantidad)))));
  };
  const low = (i) => num(i.stock) <= num(i.minimo);
  // historial de stock (si la tabla aún no existe, no truena)
  async function logMov(insumo_id, tipo, cantidad, stock_final, motivo) {
    try { await DB.add('movimientos', { insumo_id, tipo, cantidad: Math.round(cantidad * 1000) / 1000, stock_final, motivo: motivo || null, fecha: new Date().toISOString() }); } catch (e) { /* tabla pendiente */ }
  }

  // =====================================================================
  function render() {
    const valor = I.reduce((a, i) => a + num(i.stock) * num(i.costo), 0);
    const bajos = I.filter(low);
    const margins = P.filter((p) => num(p.precio) > 0).map((p) => (num(p.precio) - prodCost(p)) / num(p.precio));
    $('#invKpis').innerHTML = `
      <div class="kpi"><b>${money(valor)}</b><span>Valor de tu inventario</span></div>
      <div class="kpi"><b class="${bajos.length ? 'down' : ''}">${fmtN(bajos.length)}</b><span>Materiales por acabarse</span>${bajos.length ? `<small class="down">${esc(bajos.slice(0, 3).map((i) => i.nombre).join(', '))}${bajos.length > 3 ? '…' : ''}</small>` : '<small class="up">Todo en orden</small>'}</div>
      <div class="kpi"><b>${fmtN(P.length)}</b><span>Productos</span></div>
      <div class="kpi"><b>${margins.length ? Math.round((margins.reduce((a, b) => a + b, 0) / margins.length) * 100) : 0}%</b><span>Margen promedio</span></div>`;

    // productos
    $('#invProd').innerHTML = P.length ? `<table><thead><tr><th>Producto</th><th style="text-align:right">Te cuesta</th><th style="text-align:right">Lo vendes en</th><th style="text-align:right">Ganas</th><th class="hide-sm" style="text-align:right">Alcanza para</th><th></th></tr></thead><tbody>${
      P.map((p) => {
        const c = prodCost(p), g = num(p.precio) - c, m = num(p.precio) ? (g / num(p.precio)) * 100 : 0, mk = canMake(p.id);
        const parts = lines(p.id).map((r) => `${qty(r.cantidad)} ${esc(insumo(r.insumo_id)?.unidad || '')} ${esc(insumo(r.insumo_id)?.nombre || '?')}`);
        if (num(p.costo_extra)) parts.push(`otros ${money2(p.costo_extra)}`);
        return `<tr class="row" data-prod="${p.id}"><td><div class="name">${esc(p.nombre)}</div><div class="muted small">${parts.join(' + ') || 'Sin costos todavía · toca para agregarlos'}</div></td>
          <td style="text-align:right">${money2(c)}</td><td style="text-align:right">${money2(p.precio)}</td>
          <td style="text-align:right"><b class="${g >= 0 ? 'up' : 'down'}">${money2(g)}</b><div class="muted small">${m.toFixed(0)}%</div></td>
          <td class="hide-sm" style="text-align:right">${mk == null ? '<span class="muted">—</span>' : `<b class="${mk === 0 ? 'down' : ''}">${fmtN(mk)}</b> <span class="muted small">pzas</span>`}</td>
          <td style="text-align:right"><button class="btn sm">Editar</button></td></tr>`;
      }).join('')}</tbody></table>` : '<div class="empty small">Agrega tus productos (placa, folleto, menú digital, página web…) con <b>+ Producto</b>.</div>';

    // materiales
    $('#invIns').innerHTML = I.length ? `<table class="ins"><thead><tr><th>Material</th><th>Unidad</th><th>Costo c/u</th><th>Stock</th><th class="hide-sm">Avísame con</th><th class="hide-sm" style="text-align:right">Valor</th><th></th></tr></thead><tbody>${
      I.map((i) => `<tr data-ins="${i.id}" class="${low(i) ? 'lowrow' : ''}">
        <td><input name="nombre" value="${esc(i.nombre)}"></td>
        <td><select name="unidad">${[...new Set([...UNIDADES, i.unidad])].map((u) => `<option ${u === i.unidad ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></td>
        <td><input name="costo" type="number" step="0.01" min="0" value="${num(i.costo)}"></td>
        <td><input name="stock" type="number" step="any" value="${num(i.stock)}" class="${low(i) ? 'lowin' : ''}"></td>
        <td class="hide-sm"><input name="minimo" type="number" step="any" min="0" value="${num(i.minimo)}"></td>
        <td class="hide-sm" style="text-align:right;white-space:nowrap">${money(num(i.stock) * num(i.costo))}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-mov="${i.id}">Mover stock</button> <button class="btn sm" data-hist="${i.id}" title="Historial">Historial</button> <button class="btn sm" data-delins="${i.id}" title="Borrar">✕</button></td></tr>`).join('')}</tbody></table>`
      : '<div class="empty small">Agrega tus materiales con <b>+ Material</b>: placas, etiquetas NFC, papel fotográfico, tinta…</div>';    window.Compras?.render(I);
  }

  // ---------- materiales ----------
  async function addInsumo() {
    await DB.add('insumos', { nombre: 'Nuevo material', unidad: 'pza', costo: 0, stock: 0, minimo: 0 });
    await refresh();
    const inp = document.querySelector('#invIns tr[data-ins]:last-child input[name=nombre]');
    // ordenados por nombre: buscar el nuevo
    const row = [...document.querySelectorAll('#invIns input[name=nombre]')].find((x) => x.value === 'Nuevo material') || inp;
    if (row) { row.focus(); row.select(); }
  }
  async function saveInsField(e) {
    const tr = e.target.closest('[data-ins]'); if (!tr || !e.target.name) return;
    const v = e.target.type === 'number' ? num(e.target.value) : e.target.value.trim() || 'Material';
    try {
      const antes = insumo(+tr.dataset.ins);
      await DB.upd('insumos', +tr.dataset.ins, { [e.target.name]: v });
      if (e.target.name === 'stock' && antes && v !== num(antes.stock)) await logMov(antes.id, 'edicion', v - num(antes.stock), v, 'Editado en la tabla');
      // si cambió el costo de un material, se actualiza el costo de los productos que lo usan
      if (e.target.name === 'costo') { await load(); await syncCosts(R.filter((r) => r.insumo_id === +tr.dataset.ins).map((r) => r.producto_id)); }
      await refresh(); toast('Guardado');
    } catch (err) { toast(err.message); }
  }
  async function syncCosts(pids) {
    for (const pid of [...new Set(pids)]) { const p = P.find((x) => x.id === pid); if (p) await DB.upd('productos', pid, { costo: Math.round(prodCost(p) * 100) / 100 }); }
  }

  // mover stock: entrada (compra), salida (uso, merma, regalo) o conteo (lo que tienes de verdad)
  let movTipo = 'entrada';
  function openEntrada(id, tipo = 'entrada') {
    const f = $('#fEntrada'); f.reset();
    f.insumo.innerHTML = I.map((i) => `<option value="${i.id}">${esc(i.nombre)} (${esc(i.unidad)})</option>`).join('');
    if (id) f.insumo.value = id;
    setTipo(tipo); fillEntrada(); $('#dlgEntrada').showModal();
  }
  function setTipo(t) {
    movTipo = t;
    document.querySelectorAll('#movTipo button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    const f = $('#fEntrada');
    $('#movCostoBox').hidden = $('#movGastoBox').hidden = t !== 'entrada';
    $('#movCantLbl').textContent = { entrada: 'Cuánto entró', salida: 'Cuánto salió', conteo: 'Cuánto tienes de verdad' }[t];
    f.motivo.placeholder = { entrada: 'Ej. Compra en papelería', salida: 'Ej. Se dañó, muestra para cliente, uso interno', conteo: 'Ej. Conteo de fin de mes' }[t];
    $('#movOk').textContent = { entrada: 'Guardar entrada', salida: 'Guardar salida', conteo: 'Guardar conteo' }[t];
    fillEntrada();
  }
  function fillEntrada() {
    const f = $('#fEntrada'), i = insumo(+f.insumo.value);
    if (i) { f.costo.value = num(i.costo); document.querySelectorAll('.entUnidad').forEach((x) => (x.textContent = i.unidad)); $('#movActual').textContent = `${qty(i.stock)} ${i.unidad}`; }
    entTotal();
  }
  function entTotal() {
    const f = $('#fEntrada'), i = insumo(+f.insumo.value), c = num(f.cantidad.value);
    if (!i) return;
    const nuevo = movTipo === 'entrada' ? num(i.stock) + c : movTipo === 'salida' ? num(i.stock) - c : c;
    $('#entTotal').innerHTML = `Queda en <b>${qty(nuevo)} ${esc(i.unidad)}</b>` + (movTipo === 'entrada' ? ` · compra de <b>${money2(c * num(f.costo.value))}</b>` : movTipo === 'salida' ? ` · pierdes <b>${money2(c * num(i.costo))}</b>` : '');
  }
  async function saveEntrada(e) {
    e.preventDefault();
    const f = e.target, i = insumo(+f.insumo.value), c = num(f.cantidad.value), cu = num(f.costo.value), motivo = f.motivo.value.trim();
    if (!i || c < 0 || (c === 0 && movTipo !== 'conteo')) return toast('Pon la cantidad');
    const nuevo = Math.round((movTipo === 'entrada' ? num(i.stock) + c : movTipo === 'salida' ? num(i.stock) - c : c) * 1000) / 1000;
    if (nuevo < 0 && !(await confirmar(`Te quedaría el stock en ${qty(nuevo)}. ¿Guardar de todos modos?`, 'Guardar'))) return;
    try {
      await DB.upd('insumos', i.id, movTipo === 'entrada' ? { stock: nuevo, costo: cu } : { stock: nuevo });
      await logMov(i.id, movTipo, nuevo - num(i.stock), nuevo, motivo);
      if (movTipo === 'entrada' && f.gasto.checked && c * cu > 0) await DB.add('gastos', { concepto: `Compra: ${i.nombre} ×${qty(c)}`, categoria: 'Materiales', monto: Math.round(c * cu * 100) / 100, fecha: new Date().toISOString() });
      if (movTipo === 'entrada' && cu !== num(i.costo)) { await load(); await syncCosts(R.filter((r) => r.insumo_id === i.id).map((r) => r.producto_id)); }
      $('#dlgEntrada').close(); await refresh(); window.Biz?.invalidate?.();
      toast({ entrada: `Entraron ${qty(c)} ${i.unidad} de ${i.nombre}`, salida: `Salieron ${qty(c)} ${i.unidad} de ${i.nombre}`, conteo: `${i.nombre} quedó en ${qty(nuevo)} ${i.unidad}` }[movTipo]);
    } catch (err) { toast(err.message); }
  }
  // historial de un material
  const MOVL = { entrada: 'Entrada', salida: 'Salida', conteo: 'Conteo', venta: 'Venta', edicion: 'Editado', devolucion: 'Devolución' };
  async function openHist(id) {
    const i = insumo(id);
    $('#histTitle').textContent = `Historial · ${i.nombre}`;
    $('#histBody').innerHTML = '<p class="muted">Cargando…</p>'; $('#dlgHist').showModal();
    let M = [];
    try { M = (await DB.list('movimientos', 'fecha')).filter((m) => m.insumo_id === id); } catch (e) { $('#histBody').innerHTML = '<p class="muted">Corre otra vez supabase.sql para activar el historial.</p>'; return; }
    if (!M.length) { $('#histBody').innerHTML = '<p class="muted">Todavía no hay movimientos de este material.</p>'; return; }
    const sal = M.filter((m) => m.cantidad < 0 && m.tipo !== 'conteo' && m.tipo !== 'edicion');
    const hace30 = Date.now() - 30 * 864e5, uso30 = -sal.filter((m) => new Date(m.fecha) > hace30).reduce((a, m) => a + num(m.cantidad), 0);
    const dias = uso30 > 0 ? Math.floor(num(i.stock) / (uso30 / 30)) : null;
    $('#histBody').innerHTML = `<div class="hoy" style="margin-bottom:10px">Usaste <b>${qty(uso30)} ${esc(i.unidad)}</b> en los últimos 30 días${dias != null ? ` · te alcanza para unos <b>${dias} días</b>` : ''}</div>
      <table class="mini2"><thead><tr><th>Fecha</th><th>Tipo</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Quedó</th><th>Motivo</th></tr></thead><tbody>${
      M.map((m) => `<tr><td class="small">${Biz.fmtDay(Biz.dayOf(m.fecha))}</td><td>${MOVL[m.tipo] || esc(m.tipo)}</td>
        <td style="text-align:right" class="${m.cantidad >= 0 ? 'up' : 'down'}">${m.cantidad >= 0 ? '+' : ''}${qty(m.cantidad)}</td>
        <td style="text-align:right">${m.stock_final == null ? '—' : qty(m.stock_final)}</td><td class="small muted">${esc(m.motivo || '')}</td></tr>`).join('')}</tbody></table>`;
  }

  // ---------- productos: precio y de qué están hechos ----------
  let editP = null, draft = [];
  function openProducto(p) {
    editP = p || null;
    const f = $('#fProd'); f.reset();
    $('#prodTitle').textContent = p ? 'Editar producto' : 'Nuevo producto';
    f.nombre.value = p?.nombre || ''; f.precio.value = p ? num(p.precio) : ''; f.extra.value = p ? num(p.costo_extra) : 0;
    draft = p ? lines(p.id).map((r) => ({ insumo_id: r.insumo_id, cantidad: num(r.cantidad) })) : [];
    $('#prodDel').hidden = !p;
    renderDraft(); $('#dlgProducto').showModal();
  }
  function renderDraft() {
    $('#recRows').innerHTML = draft.length ? draft.map((d, k) => {
      const i = insumo(d.insumo_id);
      return `<tr data-k="${k}"><td><select name="insumo">${I.map((x) => `<option value="${x.id}" ${x.id === d.insumo_id ? 'selected' : ''}>${esc(x.nombre)} · ${money2(x.costo)}/${esc(x.unidad)}</option>`).join('')}</select></td>
        <td><input name="cantidad" type="number" step="any" min="0" value="${d.cantidad}"></td>
        <td style="text-align:right;white-space:nowrap">${money2(d.cantidad * num(i?.costo))}</td>
        <td><button type="button" class="btn sm" data-rmk="${k}">✕</button></td></tr>`;
    }).join('') : `<tr><td colspan="4" class="muted small" style="padding:10px">${I.length ? 'Agrega los materiales que lleva (ej. 1 placa, 1 etiqueta NFC, 1 sticker).' : 'Primero agrega materiales en la tabla de Materiales.'}</td></tr>`;
    prodTotals();
  }
  function prodTotals() {
    const f = $('#fProd');
    const mat = draft.reduce((a, d) => a + d.cantidad * num(insumo(d.insumo_id)?.costo), 0);
    const c = mat + num(f.extra.value), pr = num(f.precio.value), g = pr - c;
    $('#prodTot').innerHTML = `Materiales ${money2(mat)} + otros ${money2(f.extra.value)} = <b>te cuesta ${money2(c)}</b> · ganas <b class="${g >= 0 ? 'up' : 'down'}">${money2(g)}</b>${pr ? ` (${((g / pr) * 100).toFixed(0)}%)` : ''}`;
  }
  async function saveProducto(e) {
    e.preventDefault();
    const f = e.target, btn = $('#prodSave'); btn.disabled = true;
    try {
      const nombre = f.nombre.value.trim(); if (!nombre) throw new Error('Ponle nombre al producto.');
      const mat = draft.reduce((a, d) => a + d.cantidad * num(insumo(d.insumo_id)?.costo), 0);
      const o = { nombre, precio: num(f.precio.value), costo_extra: num(f.extra.value), costo: Math.round((mat + num(f.extra.value)) * 100) / 100 };
      const p = editP ? await DB.upd('productos', editP.id, o) : await DB.add('productos', o);
      // reemplaza la lista de materiales
      for (const r of lines(p.id)) await DB.del('receta', r.id);
      for (const d of draft.filter((d) => d.insumo_id && d.cantidad > 0)) await DB.add('receta', { producto_id: p.id, insumo_id: d.insumo_id, cantidad: d.cantidad });
      $('#dlgProducto').close(); await refresh(); window.Biz?.invalidate?.(); toast('Producto guardado');
    } catch (err) { toast(err.message); }
    finally { btn.disabled = false; }
  }

  // ---------- al vender: se descuenta el material del stock ----------
  async function applyStock(productoId, cantidad, sign = -1, motivo) {
    if (!productoId) return;
    const [ins, rec] = await Promise.all([DB.list('insumos', 'id', true), DB.list('receta', 'id', true)]);
    const msgs = [];
    for (const r of rec.filter((x) => x.producto_id === productoId)) {
      const i = ins.find((x) => x.id === r.insumo_id); if (!i) continue;
      const nuevo = Math.round((num(i.stock) + sign * num(r.cantidad) * num(cantidad)) * 1000) / 1000;
      await DB.upd('insumos', i.id, { stock: nuevo });
      await logMov(i.id, sign < 0 ? 'venta' : 'devolucion', nuevo - num(i.stock), nuevo, motivo || null);
      if (sign < 0 && nuevo <= num(i.minimo)) msgs.push(`${i.nombre}: quedan ${qty(nuevo)}`);
    }
    loadedOnce = false;
    if (msgs.length) setTimeout(() => toast('Por acabarse · ' + msgs.join(' · ')), 1900);
  }

  // ---------- eventos ----------
  let loadedOnce = false;
  async function refresh() { await load(); loadedOnce = true; if ($('[data-view=inventario]').classList.contains('on')) render(); }
  function wire() {
    $('#invAddIns').onclick = addInsumo;
    $('#invAddProd').onclick = () => openProducto();
    $('#invEntrada').onclick = () => (I.length ? openEntrada() : toast('Primero agrega un material'));
    $('#invIns').addEventListener('change', saveInsField);
    $('#invIns').onclick = async (e) => {
      const en = e.target.closest('[data-mov]'); if (en) return openEntrada(+en.dataset.mov);
      const hi = e.target.closest('[data-hist]'); if (hi) return openHist(+hi.dataset.hist);
      const d = e.target.closest('[data-delins]'); if (!d) return;
      const i = insumo(+d.dataset.delins);
      if (!(await confirmar(`¿Borrar "${i.nombre}"? Se quita también de los productos que lo usan.`))) return;
      const pids = R.filter((r) => r.insumo_id === i.id).map((r) => r.producto_id);
      await DB.del('insumos', i.id); await load(); await syncCosts(pids); await refresh(); window.Biz?.invalidate?.();
    };
    $('#invProd').onclick = (e) => { const r = e.target.closest('[data-prod]'); if (r) openProducto(P.find((p) => p.id === +r.dataset.prod)); };
    $('#fEntrada').insumo.onchange = fillEntrada;
    $('#fEntrada').addEventListener('input', entTotal);
    $('#fEntrada').onsubmit = saveEntrada;
    $('#movTipo').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) setTipo(b.dataset.t); };
    $('#recAdd').onclick = () => { if (!I.length) return toast('Primero agrega materiales'); draft.push({ insumo_id: I[0].id, cantidad: 1 }); renderDraft(); };
    $('#recRows').addEventListener('change', (e) => {
      const tr = e.target.closest('[data-k]'); if (!tr) return; const d = draft[+tr.dataset.k];
      if (e.target.name === 'insumo') d.insumo_id = +e.target.value; else d.cantidad = num(e.target.value);
      renderDraft();
    });
    $('#recRows').onclick = (e) => { const b = e.target.closest('[data-rmk]'); if (b) { draft.splice(+b.dataset.rmk, 1); renderDraft(); } };
    $('#fProd').addEventListener('input', prodTotals);
    $('#fProd').onsubmit = saveProducto;
    $('#prodDel').onclick = async () => {
      if (!editP || !(await confirmar(`¿Borrar "${editP.nombre}"? Las ventas que ya registraste no cambian.`))) return;
      await DB.del('productos', editP.id); $('#dlgProducto').close(); await refresh(); window.Biz?.invalidate?.();
    };
  }
  wire();

  return {
    async show() {
      try { await load(); loadedOnce = true; render(); }
      catch (e) { $('#invProd').innerHTML = `<div class="card empty">${esc(e.message)}</div>`; }
    },
    applyStock,
  };
})();
