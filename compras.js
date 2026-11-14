// Lista de compras automática y proveedores con sus precios
window.Compras = (() => {
  const { esc } = UI;
  const $ = (s) => document.querySelector(s);
  const num = (x) => Number(x) || 0;
  const money2 = (n) => fmtMoney(n, 2);
  const qty = (n) => (Math.round(num(n) * 1000) / 1000).toLocaleString('es-MX');
  let PV = [], PR = [], M = [], I = [], lista = [];

  async function load() {
    [PV, PR, M] = await Promise.all([
      DB.list('proveedores', 'nombre', true).catch(() => []),
      DB.list('precios_prov', 'id', true).catch(() => []),
      DB.list('movimientos', 'fecha').catch(() => []),
    ]);
  }
  // cuánto usaste en 30 días (ventas y salidas)
  const uso30 = (id) => { const h = Date.now() - 30 * 864e5; return -M.filter((m) => m.insumo_id === id && num(m.cantidad) < 0 && ['venta', 'salida'].includes(m.tipo) && new Date(m.fecha) > h).reduce((a, m) => a + num(m.cantidad), 0); };
  const precios = (id) => PR.filter((p) => p.insumo_id === id && PV.some((v) => v.id === p.proveedor_id)).sort((a, b) => num(a.precio) - num(b.precio));
  const prov = (id) => PV.find((v) => v.id === id);

  async function render(insumos) {
    I = insumos; await load();
    // qué comprar: lo que está en el mínimo o que no te alcanza para 2 semanas
    lista = I.map((i) => {
      const u = uso30(i.id), diario = u / 30, dias = diario > 0 ? num(i.stock) / diario : Infinity;
      if (!(num(i.stock) <= num(i.minimo) || dias < 14)) return null;
      const meta = Math.max(num(i.minimo) * 2, Math.ceil(diario * 30));
      const pedir = Math.max(1, Math.ceil(meta - num(i.stock)));
      const best = precios(i.id)[0];
      return { i, pedir, dias, prov: best ? best.proveedor_id : null, precio: best ? num(best.precio) : num(i.costo) };
    }).filter(Boolean);
    renderLista(); renderProv();
  }
  function renderLista() {
    const el = $('#invCompras'); if (!el) return;
    if (!lista.length) { el.innerHTML = '<div class="muted small">Todo bien, no te falta nada. Aquí aparece lo que está en el mínimo o que no te alcanza para dos semanas.</div>'; return; }
    const tot = lista.reduce((a, l) => a + l.pedir * l.precio, 0);
    el.innerHTML = `<table class="mini2 compras"><thead><tr><th>Material</th><th style="text-align:right">Tienes</th><th>Pedir</th><th>Con</th><th style="text-align:right">Costo</th><th></th></tr></thead><tbody>${
      lista.map((l, k) => { const ps = precios(l.i.id);
        return `<tr data-k="${k}"><td><div class="name">${esc(l.i.nombre)}</div><div class="muted small">${l.dias === Infinity ? 'en el mínimo' : `te alcanza ${Math.floor(l.dias)} días`}</div></td>
        <td style="text-align:right">${qty(l.i.stock)} <span class="muted small">${esc(l.i.unidad)}</span></td>
        <td><input name="pedir" type="number" min="1" step="any" value="${l.pedir}" style="width:80px"></td>
        <td><select name="prov"><option value="">${ps.length ? 'Sin proveedor' : 'Sin precios'}</option>${ps.map((p) => `<option value="${p.proveedor_id}" ${p.proveedor_id === l.prov ? 'selected' : ''}>${esc(prov(p.proveedor_id).nombre)} · ${money2(p.precio)}</option>`).join('')}</select></td>
        <td style="text-align:right"><b>${money2(l.pedir * l.precio)}</b></td>
        <td style="text-align:right"><button class="btn sm" data-comprado="${k}">Ya lo compré</button></td></tr>`; }).join('')}</tbody></table>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px"><span>Total aproximado <b>${money2(tot)}</b></span>
        <span>${[...new Set(lista.map((l) => l.prov).filter(Boolean))].map((id) => prov(id)?.telefono ? `<button class="btn sm" data-pedido="${id}">Pedir a ${esc(prov(id).nombre)} por WhatsApp</button>` : '').join(' ')}</span></div>`;
  }
  function pedidoWA(provId) {
    const p = prov(provId), items = lista.filter((l) => l.prov === provId);
    const t = `Hola, buen día. Le quiero pedir lo siguiente, ${items.map((l) => `${qty(l.pedir)} ${l.i.unidad} de ${l.i.nombre}`).join(', ')}. ¿Me confirma si lo tiene y el total? Muchas gracias.`;
    let d = String(p.telefono).replace(/\D/g, ''); if (d.length === 10) d = '52' + d;
    window.open(`https://wa.me/${d}?text=${encodeURIComponent(t)}`, '_blank', 'noopener');
  }
  async function comprado(k) {
    const l = lista[k], p = prov(l.prov);
    if (!(await confirmar(`¿Registrar la compra de ${qty(l.pedir)} ${l.i.unidad} de ${l.i.nombre} por ${money2(l.pedir * l.precio)}${p ? ' con ' + p.nombre : ''}? Se suma al stock y se anota el gasto.`, 'Registrar compra'))) return;
    const nuevo = Math.round((num(l.i.stock) + l.pedir) * 1000) / 1000;
    await DB.upd('insumos', l.i.id, { stock: nuevo, costo: l.precio });
    try { await DB.add('movimientos', { insumo_id: l.i.id, tipo: 'entrada', cantidad: l.pedir, stock_final: nuevo, motivo: 'Compra' + (p ? ' a ' + p.nombre : ''), fecha: new Date().toISOString() }); } catch (e) { /* */ }
    await DB.add('gastos', { concepto: `Compra: ${l.i.nombre} ×${qty(l.pedir)}${p ? ' · ' + p.nombre : ''}`, categoria: 'Materiales', monto: Math.round(l.pedir * l.precio * 100) / 100, fecha: new Date().toISOString() });
    window.Biz?.invalidate?.(); await Inv.show(); toast(`Entraron ${qty(l.pedir)} ${l.i.unidad} de ${l.i.nombre}`);
  }

  // ---------- proveedores ----------
  function renderProv() {
    const el = $('#invProv'); if (!el) return;
    if (!PV.length) { el.innerHTML = '<div class="muted small">Agrega a quién le compras y a cuánto te da cada material. La lista de compras escoge al más barato.</div>'; return; }
    el.innerHTML = `<table class="mini2"><thead><tr><th>Proveedor</th><th>Te vende</th><th></th></tr></thead><tbody>${
      PV.map((v) => { const ps = PR.filter((p) => p.proveedor_id === v.id);
        const lo = ps.filter((p) => precios(p.insumo_id)[0]?.id === p.id).length;
        return `<tr><td><div class="name">${esc(v.nombre)}</div><div class="muted small">${esc(v.telefono || '')}${v.notas ? ' · ' + esc(v.notas) : ''}</div></td>
          <td class="small">${ps.map((p) => `${esc(I.find((i) => i.id === p.insumo_id)?.nombre || '?')} ${money2(p.precio)}`).join(' · ') || '<span class="muted">Sin precios</span>'}${lo ? `<div class="up small">El más barato en ${lo}</div>` : ''}</td>
          <td style="text-align:right"><button class="btn sm" data-editprov="${v.id}">Editar</button></td></tr>`; }).join('')}</tbody></table>`;
  }
  let editV = null;
  function openProv(v) {
    editV = v || null; const f = $('#fProv'); f.reset();
    if (v) { f.nombre.value = v.nombre; f.telefono.value = v.telefono || ''; f.notas.value = v.notas || ''; }
    $('#provTitle').textContent = v ? 'Editar proveedor' : 'Nuevo proveedor'; $('#provDel').hidden = !v;
    $('#provPrecios').innerHTML = I.length ? I.map((i) => { const p = v && PR.find((x) => x.proveedor_id === v.id && x.insumo_id === i.id);
      return `<div class="pp"><span>${esc(i.nombre)} <span class="muted small">por ${esc(i.unidad)} · tú lo tienes a ${money2(i.costo)}</span></span><input data-ins="${i.id}" type="number" min="0" step="0.01" placeholder="No lo vende" value="${p ? num(p.precio) : ''}"></div>`; }).join('')
      : '<p class="muted small">Primero agrega tus materiales.</p>';
    $('#dlgProv').showModal();
  }
  async function saveProv(e) {
    e.preventDefault(); const f = e.target;
    const o = { nombre: f.nombre.value.trim(), telefono: f.telefono.value.trim() || null, notas: f.notas.value.trim() || null };
    if (!o.nombre) return toast('Pon el nombre');
    try {
      const v = editV ? (await DB.upd('proveedores', editV.id, o), editV) : await DB.add('proveedores', o);
      for (const inp of document.querySelectorAll('#provPrecios [data-ins]')) {
        const iid = +inp.dataset.ins, old = PR.find((x) => x.proveedor_id === v.id && x.insumo_id === iid);
        if (inp.value === '') { if (old) await DB.del('precios_prov', old.id); }
        else if (!old) await DB.add('precios_prov', { proveedor_id: v.id, insumo_id: iid, precio: num(inp.value) });
        else if (num(old.precio) !== num(inp.value)) await DB.upd('precios_prov', old.id, { precio: num(inp.value) });
      }
      $('#dlgProv').close(); await render(I); toast('Proveedor guardado');
    } catch (err) { toast(err.message); }
  }

  function wire() {
    $('#invAddProv').onclick = () => openProv();
    $('#fProv').onsubmit = saveProv;
    $('#provDel').onclick = async () => { if (editV && (await confirmar(`¿Borrar a ${editV.nombre}?`))) { await DB.del('proveedores', editV.id); $('#dlgProv').close(); render(I); } };
    $('#invProv').onclick = (e) => { const b = e.target.closest('[data-editprov]'); if (b) openProv(PV.find((v) => v.id === +b.dataset.editprov)); };
    $('#invCompras').addEventListener('change', (e) => {
      const tr = e.target.closest('[data-k]'); if (!tr) return; const l = lista[+tr.dataset.k];
      if (e.target.name === 'pedir') l.pedir = Math.max(0, num(e.target.value));
      if (e.target.name === 'prov') { l.prov = e.target.value ? +e.target.value : null; const p = precios(l.i.id).find((x) => x.proveedor_id === l.prov); l.precio = p ? num(p.precio) : num(l.i.costo); }
      renderLista();
    });
    $('#invCompras').onclick = (e) => {
      const c = e.target.closest('[data-comprado]'); if (c) return comprado(+c.dataset.comprado);
      const p = e.target.closest('[data-pedido]'); if (p) pedidoWA(+p.dataset.pedido);
    };
  }
  wire();
  return { render };
})();
