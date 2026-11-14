// Conecta el panel con Supabase: cada pantalla pide sus datos a las funciones de supabase.sql
(() => {
  const sb = supabase.createClient(QR_CONFIG.url, QR_CONFIG.key);
  window.SB = sb;
  const call = async (fn, args) => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw new Error(/JWT|permission denied/i.test(error.message) ? 'Tu sesión expiró. Vuelve a entrar.' : error.message);
    return data;
  };
  UI.api = async (path, opts = {}) => {
    const m = opts.method || 'GET', b = opts.body || {};
    let x;
    if (path === '/api/qrs' && m === 'GET') return { qrs: await call('qr_lista'), origin: location.origin };
    if (path === '/api/qrs' && m === 'POST')
      return { qr: await call('qr_crear', { p_name: b.name, p_client: b.client || null, p_destination: b.destination || null, p_slug: b.slug || null }) };
    if (path === '/api/overview') return await call('qr_resumen');
    if (path === '/api/qrs/lote' && m === 'POST') return { ids: await call('qr_crear_lote', { p_cantidad: b.cantidad, p_nombre: b.nombre || null }) };
    if ((x = path.match(/^\/api\/qrs\/(\d+)\/stats$/))) return { ...(await call('qr_detalle', { p_id: +x[1] })), origin: location.origin };
    if ((x = path.match(/^\/api\/qrs\/(\d+)$/)) && m === 'PATCH')
      return { qr: await call('qr_editar', { p_id: +x[1], p_name: b.name ?? null, p_client: b.client ?? null, p_destination: b.destination ?? null, p_active: b.active ?? null }) };
    if (x && m === 'DELETE') { await call('qr_borrar', { p_id: +x[1] }); return { ok: true }; }
    if ((x = path.match(/^\/api\/public\/([a-z0-9]+)$/))) return await call('qr_publico', { p_token: x[1] });
    throw new Error('Ruta no encontrada');
  };
})();

// Acceso directo a las tablas de negocios, productos, ventas, gastos y ajustes
window.DB = (() => {
  const ok = ({ data, error }) => {
    if (error) throw new Error(/JWT|permission denied/i.test(error.message) ? 'Tu sesión expiró. Vuelve a entrar.' : error.message);
    return data;
  };
  return {
    list: async (t, order = 'id', asc = false) => ok(await SB.from(t).select('*').order(order, { ascending: asc })),
    add: async (t, o) => ok(await SB.from(t).insert(o).select().single()),
    upd: async (t, id, o) => ok(await SB.from(t).update(o).eq('id', id).select().single()),
    del: async (t, id) => ok(await SB.from(t).delete().eq('id', id)),
    upsert: async (t, o) => ok(await SB.from(t).upsert(o).select().single()),
  };
})();

// Moneda del panel (MXN o USD, se cambia en Ajustes)
window.APP = { moneda: 'MXN' };
window.fmtMoney = (n, dec = 0) => (Number(n) || 0).toLocaleString(APP.moneda === 'USD' ? 'en-US' : 'es-MX',
  { style: 'currency', currency: APP.moneda, minimumFractionDigits: dec, maximumFractionDigits: dec });
