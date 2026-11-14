// Agenda de visitas: a quién ver hoy, atrasados y la ruta en el mapa
window.Agenda = (() => {
  const { esc } = UI;
  const $ = (s) => document.querySelector(s);
  const D = () => Biz.data();
  const ST = () => Biz.ST;
  let map, layer;
  const sumar = (d, n) => Biz.dayOf(new Date(d + 'T12:00:00').getTime() + n * 864e5);

  function grupos() {
    const hoy = Biz.today(), en7 = sumar(hoy, 7);
    const N = D().N.filter((n) => n.proximo && n.estado !== 'perdido').map((n) => (String(n.proximo).length > 10 ? { ...n, proximo: String(n.proximo).slice(0, 10) } : n));
    return {
      atrasados: N.filter((n) => n.proximo < hoy).sort((a, b) => a.proximo.localeCompare(b.proximo)),
      hoy: N.filter((n) => n.proximo === hoy),
      semana: N.filter((n) => n.proximo > hoy && n.proximo <= en7).sort((a, b) => a.proximo.localeCompare(b.proximo)),
    };
  }
  const pendientes = () => { const g = grupos(); return g.atrasados.length + g.hoy.length; };

  // ordena las visitas por cercanía (la más cercana a la anterior)
  function ruta(list) {
    const pts = list.filter((n) => n.lat && n.lng); if (pts.length < 2) return pts;
    const out = [pts.shift()];
    while (pts.length) {
      const a = out[out.length - 1]; let bi = 0, bd = Infinity;
      pts.forEach((p, i) => { const d = (p.lat - a.lat) ** 2 + (p.lng - a.lng) ** 2; if (d < bd) { bd = d; bi = i; } });
      out.push(pts.splice(bi, 1)[0]);
    }
    return out;
  }

  function fila(n, orden) {
    const st = ST()[n.estado] || { l: n.estado, c: '#6b7280' };
    const atras = n.proximo < Biz.today() ? Math.round((Date.now() - new Date(n.proximo + 'T12:00:00')) / 864e5) : 0;
    return `<div class="agrow" data-agid="${n.id}">
      <div class="agnum">${orden ?? ''}</div>
      <div style="flex:1;min-width:0"><div class="name">${esc(n.nombre)}</div>
        <div class="muted small">${esc(n.giro || '')}${n.direccion ? ' · ' + esc(n.direccion) : ''}</div>
        <div class="small"><span class="pill" style="background:${st.c}1a;color:${st.c}">${esc(st.l)}</span> ${atras ? `<span class="down small">${atras} día${atras === 1 ? '' : 's'} tarde</span>` : n.proximo === Biz.today() ? '' : `<span class="muted small">${Biz.fmtDay(n.proximo)}</span>`}
        ${n.notas ? `<span class="muted small"> · ${esc(n.notas).slice(0, 80)}</span>` : ''}</div></div>
      <div class="agbtns">${n.telefono ? `<button class="btn sm" data-agwa="${n.id}">WhatsApp</button><a class="btn sm" href="tel:${esc(n.telefono)}">Llamar</a>` : ''}
        ${n.lat ? `<a class="btn sm" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${n.lat},${n.lng}">Cómo llegar</a>` : ''}
        <button class="btn sm" data-agmas="${n.id}:1">Mañana</button><button class="btn sm" data-agmas="${n.id}:7">En 1 semana</button><button class="btn sm pri" data-aghecho="${n.id}">Hecho</button></div></div>`;
  }

  function render() {
    const g = grupos(), hoyList = [...g.atrasados, ...g.hoy], r = ruta(hoyList);
    const ord = new Map(r.map((n, i) => [n.id, i + 1]));
    const sec = (t, list, empty) => `<h3 style="margin:14px 0 8px">${t} <span class="muted">${list.length}</span></h3>${list.length ? list.map((n) => fila(n, ord.get(n.id))).join('') : `<div class="muted small">${empty}</div>`}`;
    $('#agList').innerHTML = sec('Atrasados', g.atrasados, 'Nada atrasado, bien.') + sec('Hoy', g.hoy, 'No tienes visitas para hoy. Ponle fecha de seguimiento a tus prospectos.') + sec('Próximos 7 días', g.semana, 'Nada en la semana.');
    const gm = r.length ? `https://www.google.com/maps/dir/?api=1&destination=${r[r.length - 1].lat},${r[r.length - 1].lng}${r.length > 1 ? '&waypoints=' + r.slice(0, -1).slice(0, 9).map((n) => `${n.lat},${n.lng}`).join('|') : ''}` : '';
    $('#agRuta').innerHTML = r.length ? `<b>${r.length} parada${r.length === 1 ? '' : 's'}</b> en orden de cercanía · <a class="btn sm pri" target="_blank" rel="noopener" href="${gm}">Abrir ruta en Google Maps</a>` : '<span class="muted small">Los negocios con ubicación aparecen aquí en orden para que hagas tu ruta.</span>';
    // mapa
    if (!window.L) return;
    if (!map) { map = L.map('agMap').setView([21.505, -104.895], 13); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map); layer = L.layerGroup().addTo(map); }
    layer.clearLayers();
    r.forEach((n, i) => L.marker([n.lat, n.lng], { icon: L.divIcon({ className: '', html: `<div class="agpin">${i + 1}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }) }).bindPopup(`<b>${esc(n.nombre)}</b><br>${esc(n.giro || '')}`).addTo(layer));
    if (r.length > 1) L.polyline(r.map((n) => [n.lat, n.lng]), { color: '#0f766e', weight: 3, dashArray: '6 6' }).addTo(layer);
    setTimeout(() => { map.invalidateSize(); if (r.length) map.fitBounds(L.latLngBounds(r.map((n) => [n.lat, n.lng])).pad(0.25), { maxZoom: 16 }); }, 60);
  }

  async function mover(id, dias) { await DB.upd('negocios', id, { proximo: sumar(Biz.today(), dias) }); await Biz.reload(); Biz.showNegocios(); toast(dias === 1 ? 'Lo pasé a mañana' : 'Lo pasé a la próxima semana'); }
  async function hecho(id) {
    const n = D().N.find((x) => x.id === id);
    // si estaba en contactado, pasa a negociando
    await DB.upd('negocios', id, { proximo: null, ...(n.estado === 'contactado' ? { estado: 'negociando' } : {}) });
    await Biz.reload(); Biz.showNegocios(); toast('Visita hecha');
  }
  document.addEventListener('click', (e) => {
    const g = (a) => e.target.closest(`[${a}]`)?.getAttribute(a);
    if (g('data-agwa')) { const n = D().N.find((x) => x.id === +g('data-agwa')); Vx.wa(n, Biz.isClient(n) ? 'gracias' : n.estado === 'contactado' ? 'contacto' : 'seguimiento'); }
    else if (g('data-agmas')) { const [id, d] = g('data-agmas').split(':').map(Number); mover(id, d); }
    else if (g('data-aghecho')) hecho(+g('data-aghecho'));
  });
  return { render, pendientes };
})();
