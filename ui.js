// Código compartido del navegador: estilos, API, generación de QR y gráficas
window.UI = (() => {
  const CSS = `
  :root{--bg:#f5f6f8;--card:#fff;--ink:#16181d;--muted:#6b7280;--line:#e5e7eb;--acc:#0f766e;--acc2:#e6f3f1;--red:#b91c1c}
  *{box-sizing:border-box}body{margin:0;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
  button,input,select{font:inherit}
  .btn{border:1px solid var(--line);background:#fff;color:var(--ink);padding:8px 14px;border-radius:8px;cursor:pointer;white-space:nowrap}
  .btn:hover{border-color:#cbd0d6}.btn.pri{background:var(--acc);border-color:var(--acc);color:#fff}.btn.pri:hover{filter:brightness(1.08)}
  .btn.sm{padding:5px 10px;font-size:13px}.btn.danger{color:var(--red)}
  .muted{color:var(--muted)}.small{font-size:13px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
  .kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
  .kpi b{display:block;font-size:26px;font-variant-numeric:tabular-nums;line-height:1.2}
  .kpi span{font-size:12px;color:var(--muted)}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
  h3{font-size:13px;font-weight:600;color:var(--muted);margin:0 0 10px;text-transform:uppercase;letter-spacing:.04em}
  .hbar{display:grid;grid-template-columns:minmax(90px,170px) 1fr 40px;gap:8px;align-items:center;padding:3px 4px;margin:2px -4px;font-size:13px;border-radius:6px}
  .hbar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .hbar.click{cursor:pointer}.hbar.click:hover{background:var(--acc2)}
  .kpis.five{grid-template-columns:repeat(5,1fr)}
  .kpi b i{font-style:normal;font-size:16px;color:var(--muted);font-weight:500}
  .kpi small{display:block;font-size:12px;margin-top:4px}.up{color:#047857}.down{color:var(--red)}
  .grid2+.grid2,.card+.grid2{margin-top:12px}
  .cols{display:flex;align-items:flex-end;gap:3px;border-bottom:1px solid var(--line);padding-top:16px;box-sizing:content-box}
  .col{flex:1;height:100%;display:flex;align-items:flex-end;min-width:0}
  .col i{display:block;width:100%;background:var(--acc);border-radius:3px 3px 0 0;position:relative}
  .col:hover i{background:#134e4a}
  .col .v{font-style:normal;position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:600}
  .xl{display:flex;gap:3px;margin-top:5px}
  .xl span{flex:1;min-width:0;display:flex;font-size:11px;color:var(--muted);white-space:nowrap}
  .tag{float:right;text-transform:none;letter-spacing:0;font-weight:600;color:var(--acc);background:var(--acc2);padding:1px 8px;border-radius:99px;font-size:12px}
  .hbar i{display:block;height:10px;border-radius:5px;background:var(--acc)}
  .hbar em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums}
  .empty{padding:24px;text-align:center;color:var(--muted)}
  @media(max-width:900px){.kpis.five{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:700px){.kpis,.kpis.five{grid-template-columns:repeat(2,1fr)}.grid2{grid-template-columns:1fr}}
  `;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  async function api(path, opts = {}) {
    const r = await fetch(path, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (r.status === 401 && !path.startsWith('/api/public')) {
      location.href = '/login';
      throw new Error('No autorizado');
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Error ' + r.status);
    return j;
  }

  const TZ = 'America/Mexico_City';
  const mxDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
  function fmtTs(ts) {
    if (!ts) return '—';
    const d = new Date(/[TZ]|[+-]\d\d(:?\d\d)?$/.test(ts) ? ts : ts.replace(' ', 'T') + 'Z');
    return d.toLocaleString('es-MX', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' });
  }
  const fmtN = (n) => Number(n || 0).toLocaleString('es-MX');

  // ---- QR ----
  function qrMatrix(text) {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    return q;
  }
  function qrSVG(text) {
    const q = qrMatrix(text);
    const n = q.getModuleCount();
    const M = 4;
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + M},${y + M}h1v1h-1z`;
    const s = n + M * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges"><rect width="${s}" height="${s}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  function qrPNG(text, label, size = 1200) {
    const q = qrMatrix(text);
    const n = q.getModuleCount();
    const cells = n + 8;
    const cell = Math.floor(size / cells);
    const w = cell * cells;
    const extra = label ? Math.round(w * 0.16) : 0;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = w + extra;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#000';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) g.fillRect((x + 4) * cell, (y + 4) * cell, cell, cell);
    if (label) {
      let fs = Math.round(w * 0.06);
      g.font = `600 ${fs}px system-ui, sans-serif`;
      while (g.measureText(label).width > w * 0.9 && fs > 12) {
        fs -= 2;
        g.font = `600 ${fs}px system-ui, sans-serif`;
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, w / 2, w + extra / 2 - cell * 1.5);
    }
    return c.toDataURL('image/png');
  }
  function download(href, filename) {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  const fileName = (s) =>
    String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'qr';

  // ---- Estadísticas ----
  const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const DOW_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const hLabel = (h) => (h % 12 || 12) + (h < 12 ? ' am' : ' pm');

  // Gráfica de columnas en HTML (el texto conserva su tamaño en cualquier pantalla)
  function colsSVG(items, { H = 170, every = 1 } = {}) {
    const max = Math.max(1, ...items.map((s) => s.c));
    let bars = '', labels = '';
    items.forEach((s, i) => {
      const pct = (s.c / max) * 100;
      const v = s.c && s.c === max ? `<b class="v">${fmtN(s.c)}</b>` : '';
      bars += `<div class="col" title="${esc(s.tip)}"><i style="height:${s.c ? Math.max(pct, 1.5) : 0}%">${v}</i></div>`;
      const last = i === items.length - 1;
      const show = s.label && (every === 1 || i % every === every - 1 || last);
      labels += `<span style="justify-content:${last && every > 1 ? 'flex-end' : 'center'}">${show ? s.label : ''}</span>`;
    });
    return `<div class="cols" style="height:${H - 22}px">${bars}</div><div class="xl">${labels}</div>`;
  }
  function daysSVG(days, H) {
    const map = Object.fromEntries(days.map((r) => [r.d, r.c]));
    const items = [];
    for (let i = 29; i >= 0; i--) {
      const d = mxDate(new Date(Date.now() - i * 864e5));
      const [, mm, dd] = d.split('-');
      items.push({ c: map[d] || 0, label: `${dd}/${mm}`, tip: `${dd}/${mm}: ${map[d] || 0} escaneos` });
    }
    return colsSVG(items, { every: 5, H });
  }
  function hoursSVG(hours) {
    const map = Object.fromEntries((hours || []).map((r) => [r.h, r.c]));
    const items = [...Array(24)].map((_, h) => ({ c: map[h] || 0, label: h % 6 === 0 ? hLabel(h) : '', tip: `${hLabel(h)}: ${map[h] || 0} escaneos` }));
    return colsSVG(items, { H: 150 });
  }
  function weekSVG(wd) {
    const map = Object.fromEntries((wd || []).map((r) => [r.w, r.c]));
    const items = [1, 2, 3, 4, 5, 6, 0].map((w) => ({ c: map[w] || 0, label: DOW[w], tip: `${DOW_L[w]}: ${map[w] || 0} escaneos` }));
    return colsSVG(items, { H: 150 });
  }
  const peak = (rows, key) => (rows && rows.length ? rows.reduce((a, b) => (b.c > a.c ? b : a))[key] : null);

  function hbars(rows, labelFn, attr) {
    if (!rows.length) return '<div class="muted small">Sin datos todavía</div>';
    const max = Math.max(1, ...rows.map((r) => r.c));
    return rows
      .map(
        (r) =>
          `<div class="hbar${attr ? ' click' : ''}" ${attr ? attr(r) : ''}><span title="${esc(labelFn(r))}">${esc(labelFn(r))}</span><i style="width:${Math.max(2, (r.c / max) * 100)}%"></i><em>${fmtN(r.c)}</em></div>`
      )
      .join('');
  }
  function trend(week, prev) {
    if (!prev) return week ? '<small class="up">Nuevo esta semana</small>' : '<small class="muted">Sin actividad</small>';
    const pct = Math.round(((week - prev) / prev) * 100);
    const cls = pct >= 0 ? 'up' : 'down';
    return `<small class="${cls}">${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs semana anterior</small>`;
  }
  const habits = (s) => {
    const h = peak(s.hours, 'h'), w = peak(s.weekdays, 'w');
    return [
      `<div class="card"><h3>Hora del día${h !== null ? ` <span class="tag">Pico: ${hLabel(h)}</span>` : ''}</h3>${hoursSVG(s.hours)}</div>`,
      `<div class="card"><h3>Día de la semana${w !== null ? ` <span class="tag">Mejor día: ${DOW_L[w]}</span>` : ''}</h3>${weekSVG(s.weekdays)}</div>`,
    ].join('');
  };
  const place = (r) => [r.city, r.country].filter(Boolean).join(', ') || 'Desconocida';

  function renderStats(el, s) {
    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><b>${fmtN(s.total)}</b><span>Escaneos totales</span></div>
        <div class="kpi"><b>${fmtN(s.unique)}</b><span>Personas distintas (aprox.)</span></div>
        <div class="kpi"><b>${fmtN(s.week)}</b><span>Últimos 7 días</span>${trend(s.week, s.prevWeek)}</div>
        <div class="kpi"><b>${fmtN(s.today)}</b><span>Hoy</span></div>
      </div>
      <div class="card"><h3>Escaneos por día · últimos 30 días</h3>${daysSVG(s.days)}</div>
      <div class="grid2">${habits(s)}</div>
      <div class="grid2">
        <div class="card"><h3>Dispositivo</h3>${hbars(s.os, (r) => r.os || 'Otro')}</div>
        <div class="card"><h3>Ubicación</h3>${hbars(s.places, place)}</div>
      </div>
      <p class="muted small" style="margin-top:10px">Último escaneo: ${fmtTs(s.last)}</p>`;
  }

  function renderOverview(el, o) {
    el.innerHTML = `
      <div class="kpis five">
        <div class="kpi"><b>${fmtN(o.total)}</b><span>Escaneos totales</span></div>
        <div class="kpi"><b>${fmtN(o.unique)}</b><span>Personas distintas (aprox.)</span></div>
        <div class="kpi"><b>${fmtN(o.week)}</b><span>Últimos 7 días</span>${trend(o.week, o.prevWeek)}</div>
        <div class="kpi"><b>${fmtN(o.today)}</b><span>Hoy</span></div>
        <div class="kpi"><b>${fmtN(o.activeCount)}<i>/${fmtN(o.qrCount)}</i></b><span>QR activos · ${fmtN(o.clientCount)} clientes</span></div>
      </div>
      <div class="card"><h3>Escaneos por día · todos los QR · últimos 30 días</h3>${daysSVG(o.days, 200)}</div>
      <div class="grid2">
        <div class="card"><h3>QR con más escaneos · 30 días</h3>${hbars(o.top, (r) => r.name + (r.client ? ' · ' + r.client : ''), (r) => `data-open="${r.id}"`)}</div>
        <div class="card"><h3>Escaneos por cliente</h3>${hbars(o.clients, (r) => r.client, (r) => `data-client="${esc(r.client)}"`)}</div>
      </div>
      <div class="grid2">${habits(o)}</div>
      <div class="grid2">
        <div class="card"><h3>Dispositivo</h3>${hbars(o.os, (r) => r.os || 'Otro')}</div>
        <div class="card"><h3>Ubicación</h3>${hbars(o.places, place)}</div>
      </div>
      <p class="muted small" style="margin-top:10px">Último escaneo: ${fmtTs(o.last)}</p>`;
  }

  return { esc, api, fmtTs, fmtN, qrSVG, qrPNG, download, fileName, renderStats, renderOverview };
})();
