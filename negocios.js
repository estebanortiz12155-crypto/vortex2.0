// Negocios (mapa, meta, servicios) y Caja (ventas, gastos, productos, estadísticas)
window.Biz = (() => {
  const { esc, fmtN } = UI;
  const $ = (s) => document.querySelector(s);
  const TZ = 'America/Mexico_City';
  const CENTRO = [21.5042, -104.8946]; // Tepic

  const money = (n) => fmtMoney(n, 0);
  const money2 = (n) => fmtMoney(n, 2);
  const dayOf = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ts));
  const today = () => dayOf(Date.now());
  const fmtDay = (d) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y.slice(2)}`; };
  // fecha de un <input type=date> → mediodía en México, para que nunca caiga en otro día
  const dateToTs = (d) => (d ? `${d}T12:00:00-06:00` : new Date().toISOString());

  const ST = {
    contactado: { l: 'Contactado', c: '#2563eb', d: 'Ya les hablaste o los visitaste' },
    negociando: { l: 'Negociando', c: '#d97706', d: 'Les mandaste propuesta o precio' },
    cerrado: { l: 'Cerrado', c: '#7c3aed', d: 'Dijeron que sí, falta cobrar o entregar' },
    cliente: { l: 'Cliente', c: '#059669' },
    perdido: { l: 'Perdido', c: '#dc2626', d: 'No les interesó por ahora' },
  };
  const PIPE = ['contactado', 'negociando', 'cerrado'];
  const stOf = (n) => (ST[n.estado] ? n.estado : 'contactado');
  const CATS = ['Materiales', 'Impresión', 'Transporte', 'Publicidad', 'Software', 'Comida', 'Otro'];
  const DEF = { meta: 1000, servicios: ['Menú digital', 'Página web', 'Placa de reseñas Google (QR + NFC)', 'Folleto de reseñas', 'Sistema de citas', 'Redes sociales'] };

  let N = [], P = [], V = [], G = [], CFG = { ...DEF }, loaded = null;
  const num = (x) => Number(x) || 0;
  const vTotal = (v) => num(v.cantidad) * num(v.precio_unit);
  const vCosto = (v) => num(v.cantidad) * num(v.costo_unit);

  async function load() {
    const [n, p, v, g, a] = await Promise.all([
      DB.list('negocios', 'created_at'), DB.list('productos', 'id', true), DB.list('ventas', 'fecha'),
      DB.list('gastos', 'fecha'), DB.list('ajustes', 'meta'),
    ]);
    N = n; P = p; V = v; G = g;
    const aj = a[0] || {};
    CFG = { ...aj, meta: aj.meta || 1000, servicios: aj.servicios?.length ? aj.servicios : DEF.servicios,
      vendedores: Array.isArray(aj.vendedores) ? aj.vendedores : [], empresa: aj.empresa || 'Vortex' };
    APP.moneda = aj.moneda || 'MXN';
  }
  const ensure = () => (loaded ||= load().catch((e) => { loaded = null; throw e; }));
  const reload = async () => { loaded = load(); await loaded; renderAll(); };

  // ---------- Gráficas (HTML, mismo estilo que el resto del panel) ----------
  function cols(items, { H = 160, every = 1, color = 'var(--acc)', fmt = fmtN } = {}) {
    const max = Math.max(1, ...items.map((s) => s.c));
    const bars = items.map((s) => `<div class="col" title="${esc(s.tip || '')}"><i style="height:${s.c ? Math.max((s.c / max) * 100, 1.5) : 0}%;background:${color}">${s.c && s.c === max ? `<b class="v">${fmt(s.c)}</b>` : ''}</i></div>`).join('');
    const labels = items.map((s, i) => `<span style="justify-content:${i === items.length - 1 && every > 1 ? 'flex-end' : 'center'}">${s.label && (every === 1 || i % every === every - 1 || i === items.length - 1) ? s.label : ''}</span>`).join('');
    return `<div class="cols" style="height:${H - 22}px">${bars}</div><div class="xl">${labels}</div>`;
  }
  function dual(items, H = 180) {
    const max = Math.max(1, ...items.flatMap((s) => [s.a, s.b]));
    const bars = items.map((s) => `<div class="col2" title="${esc(s.tip)}"><i style="height:${s.a ? Math.max((s.a / max) * 100, 1.5) : 0}%" class="a"></i><i style="height:${s.b ? Math.max((s.b / max) * 100, 1.5) : 0}%" class="b"></i></div>`).join('');
    const labels = items.map((s, i) => `<span style="justify-content:${i === items.length - 1 ? 'flex-end' : 'center'}">${i % 5 === 4 || i === items.length - 1 ? s.label : ''}</span>`).join('');
    return `<div class="legend"><span><i class="a"></i>Ingresos</span><span><i class="b"></i>Gastos</span></div><div class="cols" style="height:${H - 22}px">${bars}</div><div class="xl">${labels}</div>`;
  }
  function hbars(rows, fmt = fmtN) {
    if (!rows.length) return '<div class="muted small">Sin datos todavía</div>';
    const max = Math.max(1, ...rows.map((r) => r.c));
    return rows.map((r) => `<div class="hbar"><span title="${esc(r.label)}">${r.dot ? `<i class="dot" style="background:${r.dot}"></i> ` : ''}${esc(r.label)}</span><i style="width:${Math.max(2, (r.c / max) * 100)}%;${r.dot ? 'background:' + r.dot : ''}"></i><em>${fmt(r.c)}</em></div>`).join('');
  }
  const last30 = () => [...Array(30)].map((_, i) => dayOf(Date.now() - (29 - i) * 864e5));

  // =====================================================================
  // NEGOCIOS
  // =====================================================================
  let map, layer, mapReady = false;
  function initMap() {
    if (mapReady || !window.L) return;
    map = L.map('bizMap').setView(CENTRO, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    layer = L.layerGroup().addTo(map);
    $('#bizMap').addEventListener('click', (e) => { const b = e.target.closest('[data-biz]'); if (b) openBiz(+b.dataset.biz); });
    mapReady = true;
  }
  const soldTo = (id) => V.filter((v) => v.negocio_id === id);

  const soldTo2 = (id) => V.filter((v) => v.negocio_id === id);
  const isClient = (n) => n.estado === 'cliente' || soldTo2(n.id).length > 0;
  let tab = 'embudo', showLost = false, hidden = new Set(), fitted = false;
  const daysSince = (ts) => { const d = Math.floor((Date.now() - new Date(ts || Date.now())) / 864e5); return d <= 0 ? 'hoy' : d === 1 ? 'hace 1 día' : `hace ${d} días`; };
  const match = (n, q) => !q || [n.nombre, n.giro, n.telefono, n.direccion, (n.servicios || []).join(' ')].join(' ').toLowerCase().includes(q);

  function renderNegocios() {
    const total = N.length, clientes = N.filter(isClient).length;
    const pipe = N.filter((n) => !isClient(n) && PIPE.includes(stOf(n)));
    const pct = Math.min(100, (total / CFG.meta) * 100);
    $('#bizKpis').innerHTML = `
      <div class="kpi meta"><b>${fmtN(total)}<i> / ${fmtN(CFG.meta)}</i></b><span>Negocios alcanzados · meta</span>
        <div class="prog"><i style="width:${pct}%"></i></div><small class="muted">${pct.toFixed(1)}% · faltan ${fmtN(Math.max(0, CFG.meta - total))}</small></div>
      <div class="kpi"><b>${fmtN(pipe.length)}</b><span>En el embudo</span><small class="muted">${money(pipe.reduce((a, x) => a + num(x.valor_estimado), 0))} en juego</small></div>
      <div class="kpi"><b>${fmtN(clientes)}</b><span>Clientes</span><small class="muted">${total ? Math.round((clientes / total) * 100) : 0}% de conversión</small></div>
      <div class="kpi"><b>${money(V.filter((v) => v.negocio_id).reduce((a, v) => a + vTotal(v), 0))}</b><span>Vendido a clientes</span></div>`;
    $('#bizMetas').innerHTML = Vx.metasHTML();
    document.querySelectorAll('#bizTabs [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    document.querySelectorAll('[data-bizpane]').forEach((p) => (p.hidden = p.dataset.bizpane !== tab));
    $('#tabCount').textContent = pipe.length; $('#tabCli').textContent = clientes;
    if (tab === 'embudo') renderKanban();
    if (tab === 'clientes') renderClientes();
    if (tab === 'mapa') renderMapa();
    if (tab === 'agenda') Agenda.render();
    const ag = Agenda.pendientes(); $('#tabAg').textContent = ag || ''; 
  }

  // ---- embudo (columnas) ----
  function renderKanban() {
    const q = $('#bizQ').value.trim().toLowerCase();
    const rows = N.filter((n) => !isClient(n) && match(n, q));
    const lanes = showLost ? [...PIPE, 'perdido'] : PIPE;
    $('#kanban').className = 'kanban' + (showLost ? ' four' : '');
    $('#kanban').innerHTML = lanes.map((k) => {
      const items = rows.filter((n) => stOf(n) === k).sort((a, b) => (a.proximo || '9') < (b.proximo || '9') ? -1 : 1);
      const s = ST[k];
      return `<div class="lane" data-lane="${k}">
        <div class="lane-h" style="border-top-color:${s.c}"><div><b>${s.l}</b> <span class="cnt">${items.length}</span></div>
          <em>${money(items.reduce((a, x) => a + num(x.valor_estimado), 0))}</em><div class="muted small">${s.d}</div></div>
        <div class="lane-b">${items.map(card).join('') || '<div class="lane-empty">Arrastra un negocio aquí</div>'}</div></div>`;
    }).join('');
    $('#lostToggle').textContent = showLost ? 'Ocultar perdidos' : `Ver perdidos (${N.filter((n) => !isClient(n) && n.estado === 'perdido').length})`;
  }
  function card(n) {
    const k = stOf(n), i = PIPE.indexOf(k), t = today();
    let seg = '';
    if (n.proximo) {
      const cls = n.proximo < t ? 'late' : n.proximo === t ? 'now' : '';
      seg = `<div class="seg-badge ${cls}">${n.proximo < t ? 'Seguimiento atrasado · ' : n.proximo === t ? 'Hoy toca seguimiento' : 'Seguimiento · '}${n.proximo === t ? '' : fmtDay(n.proximo)}</div>`;
    }
    return `<div class="kcard" draggable="true" data-biz="${n.id}">
      <div class="kc-top"><b>${esc(n.nombre)}</b>${num(n.valor_estimado) ? `<span class="kc-val">${money(n.valor_estimado)}</span>` : ''}</div>
      <div class="muted small">${esc(n.giro || '')}${n.giro ? ' · ' : ''}${daysSince(n.estado_desde || n.created_at)}</div>
      ${seg}
      ${(n.servicios || []).length ? `<div class="tags" style="margin-top:6px">${n.servicios.slice(0, 3).map((x) => `<span class="tag2">${esc(x)}</span>`).join('')}${n.servicios.length > 3 ? `<span class="tag2">+${n.servicios.length - 3}</span>` : ''}</div>` : ''}
      <div class="kc-foot">
        ${n.telefono ? `<button class="kc-wa" data-wa="${n.id}" title="Mandar WhatsApp">WhatsApp</button>` : '<span></span>'}
        <span class="kc-acts">
          ${i > 0 ? `<button class="btn sm" data-move="${n.id}:${PIPE[i - 1]}" title="Paso anterior">←</button>` : ''}
          ${k === 'perdido' ? `<button class="btn sm" data-move="${n.id}:contactado">Reactivar</button>` : ''}
          ${i >= 0 && i < PIPE.length - 1 ? `<button class="btn sm pri" data-move="${n.id}:${PIPE[i + 1]}" title="Siguiente paso">${ST[PIPE[i + 1]].l} →</button>` : ''}
          ${k === 'cerrado' ? `<button class="btn sm pri" data-sell="${n.id}">Registrar venta →</button>` : ''}
        </span></div></div>`;
  }
  async function moveTo(id, estado) {
    const n = N.find((x) => x.id === id); if (!n || n.estado === estado) return;
    const prev = n.estado; n.estado = estado; n.estado_desde = new Date().toISOString(); renderNegocios();
    try { await DB.upd('negocios', id, { estado }); toast(`${n.nombre} → ${ST[estado].l}`); }
    catch (e) { n.estado = prev; renderNegocios(); toast(e.message); }
  }

  // ---- clientes ----
  function renderClientes() {
    const q = $('#cliQ').value.trim().toLowerCase();
    const rows = N.filter((n) => isClient(n) && match(n, q)).map((n) => {
      const vs = soldTo2(n.id);
      return { n, vs, tot: vs.reduce((a, v) => a + vTotal(v), 0), last: vs.reduce((m, v) => (!m || v.fecha > m ? v.fecha : m), null) };
    }).sort((a, b) => b.tot - a.tot);
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!rows.length) { $('#cliList').innerHTML = '<div class="card empty">Cuando le registres una venta a un negocio, aparece aquí como cliente.</div>'; return; }
    $('#cliList').innerHTML = `<table><thead><tr><th>Cliente</th><th>Le has vendido</th><th class="hide-sm">Puedes ofrecerle</th><th style="text-align:right">Total</th><th class="hide-sm">Última compra</th><th></th></tr></thead><tbody>${
      rows.map(({ n, vs, tot, last }) => {
        const bought = [...new Set(vs.map((v) => v.concepto))];
        const bn = bought.map(norm);
        const offer = CFG.servicios.filter((s) => !bn.some((b) => b.includes(norm(s)) || norm(s).includes(b))).slice(0, 3);
        return `<tr class="row" data-biz="${n.id}"><td><div class="name">${esc(n.nombre)}</div><div class="muted small">${esc(n.giro || '')}${n.telefono ? ` · <a class="wa" href="${waLink(n.telefono)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div></td>
          <td><div class="tags">${bought.map((b) => `<span class="tag2 done">✓ ${esc(b)}</span>`).join('') || '<span class="muted small">—</span>'}</div></td>
          <td class="hide-sm"><div class="tags">${offer.map((s) => `<span class="tag2">${esc(s)}</span>`).join('')}</div></td>
          <td style="text-align:right"><b>${money(tot)}</b><div class="muted small">${vs.length} compra${vs.length === 1 ? '' : 's'}</div></td>
          <td class="hide-sm small">${last ? fmtDay(dayOf(last)) : '—'}</td>
          <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-rep="${n.id}">Reporte</button>${n.telefono ? ` <button class="btn sm" data-repwa="${n.id}">Mandar</button>` : ''}</td></tr>`;
      }).join('')}</tbody></table>`;
  }

  // ---- mapa y estadísticas ----
  function renderMapa() {
    initMap();
    const byState = Object.entries(ST).map(([k, s]) => ({ label: s.l, c: N.filter((n) => (k === 'cliente' ? isClient(n) : !isClient(n) && stOf(n) === k)).length, dot: s.c }));
    $('#bizStates').innerHTML = hbars(byState);
    const weeks = [...Array(12)].map((_, i) => {
      const end = Date.now() - (11 - i) * 7 * 864e5, start = end - 7 * 864e5;
      const c = N.filter((n) => { const t = new Date(n.created_at).getTime(); return t > start && t <= end; }).length;
      return { c, label: i === 11 ? 'Esta' : i % 3 === 2 ? fmtDay(dayOf(end)).slice(0, 5) : '', tip: `Semana al ${fmtDay(dayOf(end))}: ${c}` };
    });
    $('#bizWeeks').innerHTML = cols(weeks, { H: 150 });
    const colorOf = (n) => (isClient(n) ? ST.cliente.c : ST[stOf(n)].c);
    const keyOf = (n) => (isClient(n) ? 'cliente' : stOf(n));
    if (mapReady) {
      layer.clearLayers();
      const pts = [];
      N.filter((n) => n.lat != null && n.lng != null && !hidden.has(keyOf(n))).forEach((n) => {
        pts.push([n.lat, n.lng]);
        L.circleMarker([n.lat, n.lng], { radius: 8, color: '#fff', weight: 2, fillColor: colorOf(n), fillOpacity: 1 })
          .bindPopup(`<b>${esc(n.nombre)}</b><br><span class="muted">${esc(n.giro || '')}</span><br><button class="btn sm" data-biz="${n.id}" style="margin-top:6px">Ver negocio</button>`)
          .addTo(layer);
      });
      setTimeout(() => { map.invalidateSize(); if (pts.length && !fitted) { map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 }); fitted = true; } }, 60);
    }
    $('#bizChips').innerHTML = Object.entries(ST).map(([k, s]) =>
      `<button class="chip ${hidden.has(k) ? 'off' : ''}" data-st="${k}"><i style="background:${s.c}"></i>${s.l} <b>${N.filter((n) => keyOf(n) === k).length}</b></button>`).join('');
  }
  const waLink = (t) => { let d = String(t).replace(/\D/g, ''); if (d.length === 10) d = '52' + d; return 'https://wa.me/' + d; };

  // ---- detalle de un negocio ----
  let curBiz = null;
  function openBiz(id) {
    const n = N.find((x) => x.id === id); if (!n) return;
    curBiz = n;
    const vs = soldTo(n.id), tot = vs.reduce((a, v) => a + vTotal(v), 0), gan = vs.reduce((a, v) => a + vTotal(v) - vCosto(v), 0);
    const s = isClient(n) ? ST.cliente : ST[stOf(n)];
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const soldC = vs.map((v) => norm(v.concepto));
    const sold = { has: (s) => soldC.some((c) => c && (c.includes(norm(s)) || norm(s).includes(c))) };
    $('#bdTitle').textContent = n.nombre;
    $('#bdBody').innerHTML = `
      <div class="bd-grid">
        <div>
          <p style="margin:0 0 6px"><span class="pill" style="background:${s.c}1a;color:${s.c}">${s.l}</span> <span class="muted small">${esc(n.giro || '')}</span></p>
          ${n.direccion ? `<p class="small" style="margin:4px 0">${esc(n.direccion)}</p>` : ''}
          ${num(n.valor_estimado) || n.proximo ? `<p class="small" style="margin:4px 0">${num(n.valor_estimado) ? `Valor estimado <b>${money(n.valor_estimado)}</b>` : ''}${num(n.valor_estimado) && n.proximo ? ' · ' : ''}${n.proximo ? `Próximo seguimiento <b>${fmtDay(n.proximo)}</b>` : ''}</p>` : ''}
          <div class="acts">
            ${n.telefono ? `<button class="btn sm" data-dwa>WhatsApp ${esc(n.telefono)}</button><a class="btn sm" href="tel:${esc(n.telefono)}">Llamar</a>` : ''}
            <button class="btn sm" data-dcot>Cotizar</button>
            <button class="btn sm" data-dcon>Contrato</button>
            ${isClient(n) ? '<button class="btn sm" data-drep>Reporte del mes</button>' : ''}
            <button class="btn sm" data-dportal>Portal del cliente</button>
            ${n.lat != null ? `<a class="btn sm" href="https://www.google.com/maps/dir/?api=1&destination=${n.lat},${n.lng}" target="_blank" rel="noopener">Cómo llegar</a>` : ''}
          </div>
          <div class="kpis two" style="margin-top:12px">
            <div class="kpi"><b>${money(tot)}</b><span>Le has vendido</span></div>
            <div class="kpi"><b>${money(gan)}</b><span>Ganancia</span></div>
          </div>
          <h3 style="margin-top:14px">Servicios que le puedes ofrecer</h3>
          <div class="tags">${(n.servicios || []).map((x) => `<span class="tag2 ${sold.has(x) ? 'done' : ''}">${sold.has(x) ? '✓ ' : ''}${esc(x)}</span>`).join('') || '<span class="muted small">Ninguno marcado. Edítalo para elegir.</span>'}</div>
          ${n.notas ? `<h3 style="margin-top:14px">Notas</h3><p class="small" style="white-space:pre-wrap;margin:0">${esc(n.notas)}</p>` : ''}
        </div>
        <div>
          <h3>Ventas a este negocio</h3>
          ${vs.length ? `<div class="mini">${vs.map((v) => `<div><span>${fmtDay(dayOf(v.fecha))} · ${esc(v.concepto)}${num(v.cantidad) !== 1 ? ' ×' + num(v.cantidad) : ''}</span><b>${money(vTotal(v))}</b></div>`).join('')}</div>` : '<div class="muted small">Todavía no le vendes nada.</div>'}
        </div>
      </div>`;
    $('#dlgBizDetail').showModal();
  }

  // ---- crear / editar negocio ----
  let editBiz = null, pickMap, pickMarker;
  function openBizForm(n) {
    editBiz = n || null;
    const f = $('#fBiz'); f.reset(); $('#bizErr').hidden = true;
    $('#bizFormTitle').textContent = n ? 'Editar negocio' : 'Nuevo negocio';
    f.vendedor.innerHTML = Vx.vendOptions(n?.vendedor);
    $('#bizServ').innerHTML = CFG.servicios.map((s) => `<label class="chk"><input type="checkbox" value="${esc(s)}" ${n?.servicios?.includes(s) ? 'checked' : ''}> ${esc(s)}</label>`).join('');
    if (n) { for (const k of ['nombre', 'giro', 'telefono', 'contacto', 'direccion', 'notas', 'proximo']) f[k].value = n[k] || ''; f.estado.value = stOf(n) === 'contactado' && n.estado === 'cliente' ? 'cliente' : n.estado in ST ? n.estado : 'contactado'; f.valor.value = num(n.valor_estimado) || ''; }
    f.lat.value = n?.lat ?? ''; f.lng.value = n?.lng ?? '';
    $('#bizDel').hidden = !n;
    $('#dlgBiz').showModal();
    setTimeout(() => {
      if (!window.L) return;
      if (!pickMap) {
        pickMap = L.map('bizPick').setView(CENTRO, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(pickMap);
        pickMap.on('click', (e) => setPick(e.latlng.lat, e.latlng.lng));
      }
      pickMap.invalidateSize();
      if (pickMarker) { pickMarker.remove(); pickMarker = null; }
      if (n?.lat != null) { setPick(n.lat, n.lng); pickMap.setView([n.lat, n.lng], 16); }
      else pickMap.setView(mapReady ? map.getCenter() : CENTRO, mapReady ? map.getZoom() : 13);
    }, 60);
  }
  function setPick(lat, lng) {
    const f = $('#fBiz'); f.lat.value = lat.toFixed(6); f.lng.value = lng.toFixed(6);
    if (pickMarker) pickMarker.setLatLng([lat, lng]); else pickMarker = L.marker([lat, lng]).addTo(pickMap);
    $('#pickInfo').textContent = 'Ubicación marcada ✓';
  }
  async function saveBiz(e) {
    e.preventDefault();
    const f = e.target, btn = $('#bizSave'); btn.disabled = true;
    const o = {
      nombre: f.nombre.value.trim(), giro: f.giro.value.trim() || null, telefono: f.telefono.value.trim() || null,
      direccion: f.direccion.value.trim() || null, contacto: f.contacto.value.trim() || null, estado: f.estado.value, notas: f.notas.value.trim() || null,
      valor_estimado: num(f.valor.value), proximo: f.proximo.value || null, vendedor: f.vendedor.value || null,
      lat: f.lat.value ? +f.lat.value : null, lng: f.lng.value ? +f.lng.value : null,
      servicios: [...document.querySelectorAll('#bizServ input:checked')].map((x) => x.value),
    };
    try {
      if (!o.nombre) throw new Error('Ponle nombre al negocio.');
      const r = editBiz ? await DB.upd('negocios', editBiz.id, o) : await DB.add('negocios', o);
      $('#dlgBiz').close(); await reload(); toast(editBiz ? 'Negocio actualizado' : 'Negocio agregado');
      openBiz(r.id);
    } catch (err) { $('#bizErr').textContent = err.message; $('#bizErr').hidden = false; }
    finally { btn.disabled = false; }
  }

  // =====================================================================
  // CAJA
  // =====================================================================
  let period = 'mes';
  function inPeriod(ts) {
    const d = dayOf(ts), t = today();
    if (period === 'hoy') return d === t;
    if (period === 'semana') return d > dayOf(Date.now() - 7 * 864e5);
    if (period === 'mes') return d.slice(0, 7) === t.slice(0, 7);
    if (period === 'anio') return d.slice(0, 4) === t.slice(0, 4);
    return true;
  }
  const PERIOD_L = { hoy: 'hoy', semana: 'últimos 7 días', mes: 'este mes', anio: 'este año', todo: 'en total' };

  function renderCaja() {
    const t = today();
    const vh = V.filter((v) => dayOf(v.fecha) === t), gh = G.filter((g) => dayOf(g.fecha) === t);
    const fh = vh.reduce((a, v) => a + vTotal(v), 0), uh = vh.reduce((a, v) => a + vTotal(v) - vCosto(v), 0) - gh.reduce((a, g) => a + num(g.monto), 0);
    $('#cajaHoy').innerHTML = `<b>Hoy</b> facturaste <b>${money(fh)}</b> en ${vh.length} venta${vh.length === 1 ? '' : 's'} · ${uh >= 0 ? 'ganancia' : 'pérdida'} del día <b class="${uh >= 0 ? 'up' : 'down'}">${money(Math.abs(uh))}</b>${gh.length ? ` · gastaste ${money(gh.reduce((a, g) => a + num(g.monto), 0))}` : ''}${Pagos.deben().length ? ` · te deben <b class="down">${money(Pagos.deben().reduce((a, v) => a + Pagos.saldo(v), 0))}</b>` : ''}`;

    $('#cajaMetas').innerHTML = Vx.metasHTML();
    Pagos.render();
    const vp = V.filter((v) => inPeriod(v.fecha)), gp = G.filter((g) => inPeriod(g.fecha));
    $('#cajaCom').innerHTML = Vx.comisionesHTML(vp);
    const ing = vp.reduce((a, v) => a + vTotal(v), 0), cos = vp.reduce((a, v) => a + vCosto(v), 0), gas = gp.reduce((a, g) => a + num(g.monto), 0);
    const util = ing - cos - gas, margen = ing ? ((ing - cos) / ing) * 100 : 0;
    $('#cajaKpis').innerHTML = `
      <div class="kpi"><b>${money(ing)}</b><span>Facturado ${PERIOD_L[period]}</span></div>
      <div class="kpi"><b>${money(cos)}</b><span>Costo de lo vendido</span></div>
      <div class="kpi"><b>${money(gas)}</b><span>Gastos</span></div>
      <div class="kpi"><b class="${util >= 0 ? 'up' : 'down'}">${money(util)}</b><span>Utilidad</span><small class="muted">Margen en productos ${margen.toFixed(0)}%</small></div>
      <div class="kpi"><b>${fmtN(vp.length)}</b><span>Ventas · ticket ${money(vp.length ? ing / vp.length : 0)}</span></div>`;

    const days = last30().map((d) => {
      const a = V.filter((v) => dayOf(v.fecha) === d).reduce((s, v) => s + vTotal(v), 0);
      const b = G.filter((g) => dayOf(g.fecha) === d).reduce((s, g) => s + num(g.monto), 0);
      return { a, b, label: fmtDay(d).slice(0, 5), tip: `${fmtDay(d)}: ingresos ${money(a)} · gastos ${money(b)}` };
    });
    $('#cajaDias').innerHTML = dual(days);

    const byProd = {}; vp.forEach((v) => { byProd[v.concepto] = (byProd[v.concepto] || 0) + vTotal(v); });
    $('#cajaProd').innerHTML = hbars(Object.entries(byProd).map(([label, c]) => ({ label, c })).sort((a, b) => b.c - a.c).slice(0, 8), money);
    const byCat = {}; gp.forEach((g) => { byCat[g.categoria || 'Otro'] = (byCat[g.categoria || 'Otro'] || 0) + num(g.monto); });
    $('#cajaCat').innerHTML = hbars(Object.entries(byCat).map(([label, c]) => ({ label, c, dot: '#dc2626' })).sort((a, b) => b.c - a.c), money);

    // acumulado del año por mes
    const y = t.slice(0, 4);
    const months = [...Array(12)].map((_, i) => {
      const m = `${y}-${String(i + 1).padStart(2, '0')}`;
      const c = V.filter((v) => dayOf(v.fecha).slice(0, 7) === m).reduce((s, v) => s + vTotal(v), 0);
      return { c, label: ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i], tip: `${m}: ${money(c)}` };
    });
    $('#cajaMeses').innerHTML = cols(months, { H: 150, fmt: money });

    // movimientos
    const mov = [
      ...vp.map((v) => ({ t: 'v', id: v.id, fecha: v.fecha, txt: v.concepto + (num(v.cantidad) !== 1 ? ' ×' + num(v.cantidad) : ''), sub: N.find((n) => n.id === v.negocio_id)?.nombre || (v.metodo || ''), monto: vTotal(v), gan: vTotal(v) - vCosto(v) })),
      ...gp.map((g) => ({ t: 'g', id: g.id, fecha: g.fecha, txt: g.concepto, sub: g.categoria || '', monto: -num(g.monto) })),
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    $('#cajaMov').innerHTML = mov.length ? `<table><thead><tr><th>Fecha</th><th>Concepto</th><th style="text-align:right">Monto</th><th class="hide-sm" style="text-align:right">Ganancia</th><th></th></tr></thead><tbody>${
      mov.map((m) => `<tr><td class="small">${fmtDay(dayOf(m.fecha))}</td>
        <td><div class="name">${esc(m.txt)}</div><div class="muted small">${m.t === 'v' ? 'Venta' : 'Gasto'}${m.sub ? ' · ' + esc(m.sub) : ''}</div></td>
        <td style="text-align:right"><b class="${m.monto >= 0 ? 'up' : 'down'}">${m.monto >= 0 ? '+' : '−'}${money(Math.abs(m.monto))}</b></td>
        <td class="hide-sm" style="text-align:right">${m.t === 'v' ? money(m.gan) : ''}</td>
        <td style="text-align:right;white-space:nowrap">${m.t === 'v' ? `<button class="btn sm" data-recibo="${m.id}">Recibo</button> ` : ''}<button class="btn sm" data-delmov="${m.t}:${m.id}" title="Borrar">✕</button></td></tr>`).join('')}</tbody></table>`
      : `<div class="card empty">Sin movimientos ${PERIOD_L[period]}.</div>`;
  }

  // ---- venta ----
  function openVenta(negocioId) {
    const f = $('#fVenta'); f.reset(); $('#ventaErr').hidden = true;
    f.negocio.innerHTML = '<option value="">— Sin negocio —</option>' + [...N].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((n) => `<option value="${n.id}">${esc(n.nombre)}</option>`).join('');
    f.producto.innerHTML = '<option value="">— Otro concepto —</option>' + P.map((p) => `<option value="${p.id}">${esc(p.nombre)} · ${money2(p.precio)}</option>`).join('');
    if (negocioId) f.negocio.value = negocioId;
    f.vendedor.innerHTML = Vx.vendOptions(N.find((x) => x.id === +negocioId)?.vendedor);
    f.fecha.value = today(); f.cantidad.value = 1;
    if (P.length) { f.producto.value = P[0].id; fillProd(); }
    $('#dlgVenta').showModal();
  }
  function fillProd() {
    const f = $('#fVenta'), p = P.find((x) => x.id == f.producto.value);
    if (p) { f.concepto.value = p.nombre; f.precio.value = num(p.precio); f.costo.value = num(p.costo); }
    ventaTotal();
  }
  function ventaTotal() {
    const f = $('#fVenta'), c = num(f.cantidad.value), pr = num(f.precio.value), co = num(f.costo.value);
    $('#ventaTot').innerHTML = `Total <b>${money2(c * pr)}</b> · ganancia <b class="${pr >= co ? 'up' : 'down'}">${money2(c * (pr - co))}</b>`;
  }
  async function saveVenta(e) {
    e.preventDefault();
    const f = e.target, btn = $('#ventaSave'); btn.disabled = true;
    try {
      const o = {
        negocio_id: f.negocio.value ? +f.negocio.value : null, producto_id: f.producto.value ? +f.producto.value : null,
        concepto: f.concepto.value.trim(), cantidad: num(f.cantidad.value) || 1, precio_unit: num(f.precio.value),
        costo_unit: num(f.costo.value), metodo: f.metodo.value, fecha: dateToTs(f.fecha.value), vendedor: f.vendedor.value || null,
      };
      // si no pagó todo, queda el saldo en "Te deben"
      if (f.pagado.value !== '' && num(f.pagado.value) < o.cantidad * o.precio_unit) o.pagado = Math.max(0, num(f.pagado.value));
      if (!o.concepto) throw new Error('Escribe qué vendiste.');
      await DB.add('ventas', o);
      // se descuenta del stock el material que lleva el producto
      await Inv.applyStock(o.producto_id, o.cantidad, -1);
      // si le vendiste, ya es cliente
      const n = N.find((x) => x.id === o.negocio_id);
      if (n && n.estado !== 'cliente') await DB.upd('negocios', n.id, { estado: 'cliente' });
      $('#dlgVenta').close(); await reload(); toast('Venta registrada');
    } catch (err) { $('#ventaErr').textContent = err.message; $('#ventaErr').hidden = false; }
    finally { btn.disabled = false; }
  }

  // ---- gasto ----
  function openGasto() {
    const f = $('#fGasto'); f.reset(); $('#gastoErr').hidden = true;
    f.categoria.innerHTML = CATS.map((c) => `<option>${c}</option>`).join('');
    f.fecha.value = today();
    $('#dlgGasto').showModal();
  }
  async function saveGasto(e) {
    e.preventDefault();
    const f = e.target, btn = $('#gastoSave'); btn.disabled = true;
    try {
      const o = { concepto: f.concepto.value.trim(), categoria: f.categoria.value, monto: num(f.monto.value), fecha: dateToTs(f.fecha.value) };
      if (!o.concepto || !o.monto) throw new Error('Pon el concepto y el monto.');
      await DB.add('gastos', o);
      $('#dlgGasto').close(); await reload(); toast('Gasto registrado');
    } catch (err) { $('#gastoErr').textContent = err.message; $('#gastoErr').hidden = false; }
    finally { btn.disabled = false; }
  }

  // ---------- eventos ----------
  function renderAll() {
    if ($('[data-view=negocios]').classList.contains('on')) renderNegocios();
    if ($('[data-view=caja]').classList.contains('on')) renderCaja();
  }
  function wire() {
    $('#bizNew').onclick = () => openBizForm();
    $('#bizAjustes').onclick = () => Vx.openAjustes();
    $('#bizQ').oninput = renderKanban; $('#cliQ').oninput = renderClientes;
    $('#bizTabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; renderNegocios(); } };
    $('#lostToggle').onclick = () => { showLost = !showLost; renderKanban(); };
    $('#cliList').onclick = (e) => {
      if (e.target.closest('a')) return;
      const rp = e.target.closest('[data-rep]'); if (rp) return Vx.reporte(N.find((x) => x.id === +rp.dataset.rep));
      const rw = e.target.closest('[data-repwa]'); if (rw) return Vx.reporte(N.find((x) => x.id === +rw.dataset.repwa), 'wa');
      const r = e.target.closest('[data-biz]'); if (r) openBiz(+r.dataset.biz);
    };
    $('#bizChips').onclick = (e) => { const b = e.target.closest('[data-st]'); if (!b) return; hidden.has(b.dataset.st) ? hidden.delete(b.dataset.st) : hidden.add(b.dataset.st); renderMapa(); };
    const kb = $('#kanban');
    kb.onclick = (e) => {
      if (e.target.closest('a')) return;
      const mv = e.target.closest('[data-move]'); if (mv) { const [id, st] = mv.dataset.move.split(':'); return moveTo(+id, st); }
      const sl = e.target.closest('[data-sell]'); if (sl) return openVenta(+sl.dataset.sell);
      const w = e.target.closest('[data-wa]'); if (w) { const nn = N.find((x) => x.id === +w.dataset.wa); return Vx.wa(nn, { contactado: 'contacto', negociando: 'seguimiento', cerrado: 'propuesta' }[stOf(nn)] || 'contacto'); }
      const c = e.target.closest('[data-biz]'); if (c) openBiz(+c.dataset.biz);
    };
    kb.addEventListener('dragstart', (e) => { const c = e.target.closest('.kcard'); if (c) { e.dataTransfer.setData('text/plain', c.dataset.biz); c.classList.add('dragging'); } });
    kb.addEventListener('dragend', (e) => { e.target.closest?.('.kcard')?.classList.remove('dragging'); document.querySelectorAll('.lane.over').forEach((l) => l.classList.remove('over')); });
    kb.addEventListener('dragover', (e) => { const l = e.target.closest('.lane'); if (!l) return; e.preventDefault(); document.querySelectorAll('.lane.over').forEach((x) => x !== l && x.classList.remove('over')); l.classList.add('over'); });
    kb.addEventListener('drop', (e) => { const l = e.target.closest('.lane'); if (!l) return; e.preventDefault(); l.classList.remove('over'); const id = +e.dataTransfer.getData('text/plain'); if (id) moveTo(id, l.dataset.lane); });
    $('#fBiz').onsubmit = saveBiz;
    $('#bizMe').onclick = () => navigator.geolocation?.getCurrentPosition(
      (p) => { setPick(p.coords.latitude, p.coords.longitude); pickMap.setView([p.coords.latitude, p.coords.longitude], 17); },
      () => toast('No se pudo obtener tu ubicación'), { enableHighAccuracy: true, timeout: 10000 });
    $('#bizDel').onclick = async () => {
      if (!editBiz) return;
      if (!(await confirmar(`¿Borrar "${editBiz.nombre}"? Sus ventas se quedan en la caja.`))) return;
      await DB.del('negocios', editBiz.id); $('#dlgBiz').close(); await reload(); toast('Negocio borrado');
    };
    $('#bdEdit').onclick = () => { $('#dlgBizDetail').close(); openBizForm(curBiz); };
    $('#bdBody').onclick = (e) => {
      if (e.target.closest('[data-dwa]')) { $('#dlgBizDetail').close(); Vx.wa(curBiz, isClient(curBiz) ? 'gracias' : 'seguimiento'); }
      if (e.target.closest('[data-dcot]')) { $('#dlgBizDetail').close(); Vx.openCotizacion(curBiz.id); }
      if (e.target.closest('[data-dcon]')) { $('#dlgBizDetail').close(); Contratos.open(curBiz.id); }
      if (e.target.closest('[data-drep]')) Vx.reporte(curBiz);
      if (e.target.closest('[data-dportal]')) Vx.portal(curBiz);
    };
    $('#bdVenta').onclick = () => { $('#dlgBizDetail').close(); openVenta(curBiz.id); };

    $('#cajaPeriod').onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b) return; period = b.dataset.p; document.querySelectorAll('#cajaPeriod [data-p]').forEach((x) => x.classList.toggle('on', x === b)); renderCaja(); };
    $('#cajaVenta').onclick = () => openVenta();
    $('#cajaGasto').onclick = openGasto;
    $('#cajaProductos').onclick = () => go('inventario');
    $('#cajaMov').onclick = async (e) => {
      const b = e.target.closest('[data-delmov]'); if (!b) return;
      const [t, id] = b.dataset.delmov.split(':');
      if (!(await confirmar(t === 'v' ? '¿Borrar esta venta?' : '¿Borrar este gasto?'))) return;
      if (t === 'v') { const v = V.find((x) => x.id === +id); if (v) await Inv.applyStock(v.producto_id, v.cantidad, +1); }
      await DB.del(t === 'v' ? 'ventas' : 'gastos', +id); await reload(); toast(t === 'v' ? 'Venta borrada (el material regresó al stock)' : 'Borrado');
    };
    $('#fVenta').onsubmit = saveVenta;
    $('#fVenta').producto.onchange = fillProd;
    $('#fVenta').addEventListener('input', ventaTotal);
    $('#fGasto').onsubmit = saveGasto;
  }
  // confirmación dentro de la página
  function confirmar(msg, ok = 'Borrar') {
    return new Promise((res) => {
      const d = $('#dlgConfirm'); $('#cfMsg').textContent = msg;
      $('#cfOk').textContent = ok; $('#cfOk').style.background = $('#cfOk').style.borderColor = ok === 'Borrar' ? '#b91c1c' : '';
      $('#cfOk').onclick = () => { d.close(); res(true); }; $('#cfNo').onclick = () => { d.close(); res(false); };
      d.showModal();
    });
  }
  wire();
  window.confirmar = confirmar;

  const fail = (el) => (e) => { $(el).innerHTML = `<div class="card empty">${esc(e.message)}</div>`; };
  return {
    async showNegocios() {
      try { await ensure(); renderNegocios(); }
      catch (e) { fail('#kanban')(e); }
    },
    invalidate() { loaded = null; },
    // para cotizaciones, cobros, reportes y metas
    data: () => ({ N, P, V, G, CFG }),
    ensure, reload, openVenta, openBiz, isClient: (n) => isClient(n), ST, today, dayOf, fmtDay,
    vTotal, vCosto,
    async showCaja() { try { await ensure(); renderCaja(); } catch (e) { fail('#cajaMov')(e); } },
  };
})();
