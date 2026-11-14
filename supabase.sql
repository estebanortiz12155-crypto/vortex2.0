-- =====================================================================
-- QR Dinámicos · base de datos en Supabase
-- Cópialo completo en Supabase → SQL Editor → New query → Run.
-- Se puede correr varias veces sin borrar nada.
-- =====================================================================

-- Códigos cortos sin letras que se confunden (l, 1, o, 0, i)
create or replace function public.gen_codigo(n int) returns text
language sql volatile set search_path = public as $$
  select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, n)
$$;

create table if not exists public.qrs (
  id          integer generated always as identity primary key,
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug        text unique not null default public.gen_codigo(6),
  name        text not null,
  client      text,
  destination text,
  active      integer not null default 1,
  share_token text unique not null default public.gen_codigo(16),
  created_at  timestamptz not null default now()
);

create table if not exists public.scans (
  id      integer generated always as identity primary key,
  qr_id   integer not null references public.qrs(id) on delete cascade,
  ts      timestamptz not null default now(),
  os      text,
  country text,
  city    text,
  visitor text
);
-- Si las tablas ya existían de una versión anterior, se ponen al día sin borrar nada
alter table public.qrs add column if not exists owner uuid references auth.users(id) on delete cascade;
alter table public.qrs alter column owner set default auth.uid();
alter table public.qrs alter column slug set default public.gen_codigo(6);
alter table public.qrs alter column share_token set default public.gen_codigo(16);
alter table public.qrs alter column destination drop not null; -- un QR puede estar "sin liga" todavía
alter table public.scans add column if not exists os text;
alter table public.scans add column if not exists country text;
alter table public.scans add column if not exists city text;
alter table public.scans add column if not exists visitor text;

create index if not exists idx_scans_qr_ts on public.scans(qr_id, ts);
create index if not exists idx_qrs_owner on public.qrs(owner);

-- ---------------------------------------------------------------------
-- Seguridad: cada usuario solo ve y cambia sus propios QR.
-- Sin sesión iniciada no se puede leer nada de las tablas.
-- ---------------------------------------------------------------------
alter table public.qrs enable row level security;
alter table public.scans enable row level security;

drop policy if exists qrs_dueno on public.qrs;
create policy qrs_dueno on public.qrs for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

drop policy if exists scans_dueno on public.scans;
create policy scans_dueno on public.scans for select to authenticated
  using (exists (select 1 from public.qrs q where q.id = scans.qr_id and q.owner = (select auth.uid())));

-- ---------------------------------------------------------------------
-- Estadísticas (hora del centro de México). p_id nulo = todos tus QR.
-- ---------------------------------------------------------------------
create or replace function public._stats(p_id int) returns json
language sql stable set search_path = public as $$
  with s as (select * from scans where p_id is null or qr_id = p_id)
  select json_build_object(
    'total',    (select count(*) from s)::int,
    'unique',   (select count(distinct visitor) from s)::int,
    'last',     (select max(ts) from s),
    'week',     (select count(*) from s where ts >= now() - interval '7 days')::int,
    'prevWeek', (select count(*) from s where ts >= now() - interval '14 days' and ts < now() - interval '7 days')::int,
    'today',    (select count(*) from s where (ts at time zone 'America/Mexico_City')::date = (now() at time zone 'America/Mexico_City')::date)::int,
    'days',     coalesce((select json_agg(x order by x.d) from (
                  select to_char(ts at time zone 'America/Mexico_City', 'YYYY-MM-DD') as d, count(*)::int as c
                  from s where ts >= now() - interval '31 days' group by 1) x), '[]'),
    'os',       coalesce((select json_agg(x order by x.c desc) from (
                  select os, count(*)::int as c from s group by os) x), '[]'),
    'places',   coalesce((select json_agg(x order by x.c desc) from (
                  select city, country, count(*)::int as c from s group by city, country order by 3 desc limit 8) x), '[]'),
    'hours',    coalesce((select json_agg(x) from (
                  select extract(hour from ts at time zone 'America/Mexico_City')::int as h, count(*)::int as c from s group by 1) x), '[]'),
    'weekdays', coalesce((select json_agg(x) from (
                  select extract(dow from ts at time zone 'America/Mexico_City')::int as w, count(*)::int as c from s group by 1) x), '[]')
  )
$$;

-- Lista de tus QR con sus conteos
create or replace function public.qr_lista() returns json
language sql stable set search_path = public as $$
  select coalesce(json_agg(x order by x.created_at desc, x.id desc), '[]') from (
    select q.*,
      (select count(*) from scans s where s.qr_id = q.id)::int as total,
      (select count(*) from scans s where s.qr_id = q.id and s.ts >= now() - interval '7 days')::int as week,
      (select max(ts) from scans s where s.qr_id = q.id) as last
    from qrs q
  ) x
$$;

create or replace function public.qr_crear(p_name text, p_client text, p_destination text, p_slug text default null)
returns json language plpgsql set search_path = public as $$
declare
  r qrs;
  v_slug text := lower(nullif(trim(coalesce(p_slug, '')), ''));
begin
  if auth.uid() is null then raise exception 'Inicia sesión de nuevo.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Ponle un nombre al QR.'; end if;
  if coalesce(trim(p_destination), '') <> '' and trim(p_destination) !~* '^https?://\S+$' then
    raise exception 'El destino debe ser un link válido (https://...).';
  end if;
  if v_slug is not null and v_slug !~ '^[a-z0-9-]{3,40}$' then
    raise exception 'El código corto solo puede tener letras, números y guiones (3 a 40).';
  end if;
  loop
    begin
      insert into qrs (name, client, destination, slug)
      values (trim(p_name), nullif(trim(coalesce(p_client, '')), ''), nullif(trim(coalesce(p_destination, '')), ''), coalesce(v_slug, gen_codigo(6)))
      returning * into r;
      return row_to_json(r);
    exception when unique_violation then
      if v_slug is not null then raise exception 'Ese código corto ya está en uso.'; end if;
    end;
  end loop;
end $$;

-- Lote de QR en blanco (sin liga): "Folleto 001", "Folleto 002"...
create or replace function public.qr_crear_lote(p_cantidad int, p_nombre text default 'Folleto')
returns json language plpgsql set search_path = public as $$
declare
  base text := coalesce(nullif(trim(p_nombre), ''), 'Folleto');
  n int; ids int[] := '{}'; r qrs;
begin
  if auth.uid() is null then raise exception 'Inicia sesión de nuevo.'; end if;
  if p_cantidad is null or p_cantidad < 1 or p_cantidad > 60 then raise exception 'Pon una cantidad de 1 a 60.'; end if;
  select coalesce(max(substr(name, length(base) + 2)::int), 0) into n from qrs
  where left(name, length(base) + 1) = base || ' ' and substr(name, length(base) + 2) ~ '^[0-9]{1,6}$';
  for i in 1..p_cantidad loop
    loop
      begin
        insert into qrs (name) values (base || ' ' || lpad((n + i)::text, 3, '0')) returning * into r;
        exit;
      exception when unique_violation then null; -- choque de código corto: intenta otro
      end;
    end loop;
    ids := ids || r.id;
  end loop;
  return to_json(ids);
end $$;

create or replace function public.qr_editar(p_id int, p_name text default null, p_client text default null,
                                            p_destination text default null, p_active boolean default null)
returns json language plpgsql set search_path = public as $$
declare r qrs;
begin
  if p_name is not null and trim(p_name) = '' then raise exception 'Ponle un nombre al QR.'; end if;
  if coalesce(trim(p_destination), '') <> '' and trim(p_destination) !~* '^https?://\S+$' then
    raise exception 'El destino debe ser un link válido (https://...).';
  end if;
  update qrs set
    name        = coalesce(trim(p_name), name),
    client      = case when p_client is null then client else nullif(trim(p_client), '') end,
    destination = case when p_destination is null then destination else nullif(trim(p_destination), '') end,
    active      = case when p_active is null then active when p_active then 1 else 0 end
  where id = p_id
  returning * into r;
  if r.id is null then raise exception 'Ese QR no existe.'; end if;
  return row_to_json(r);
end $$;

create or replace function public.qr_borrar(p_id int) returns void
language sql set search_path = public as $$
  delete from qrs where id = p_id
$$;

create or replace function public.qr_detalle(p_id int) returns json
language plpgsql stable set search_path = public as $$
declare q json;
begin
  select row_to_json(x) into q from qrs x where x.id = p_id;
  if q is null then raise exception 'Ese QR no existe.'; end if;
  return json_build_object('qr', q, 'stats', _stats(p_id));
end $$;

create or replace function public.qr_resumen() returns json
language sql stable set search_path = public as $$
  select (_stats(null)::jsonb || jsonb_build_object(
    'qrCount',     (select count(*) from qrs)::int,
    'activeCount', (select coalesce(sum(active), 0) from qrs)::int,
    'clientCount', (select count(distinct client) from qrs)::int,
    'clients', coalesce((select jsonb_agg(x order by x.c desc) from (
        select coalesce(q.client, 'Sin cliente') as client, count(s.id)::int as c, count(distinct q.id)::int as qrs
        from qrs q left join scans s on s.qr_id = q.id group by 1) x), '[]'),
    'top', coalesce((select jsonb_agg(x order by x.c desc) from (
        select q.id, q.name, q.client, count(s.id)::int as c from qrs q
        left join scans s on s.qr_id = q.id and s.ts >= now() - interval '30 days'
        group by q.id order by 4 desc limit 6) x), '[]')
  ))::json
$$;

-- ---------------------------------------------------------------------
-- Funciones públicas (las usa cualquiera, sin sesión)
-- ---------------------------------------------------------------------

-- Al escanear: registra el escaneo y regresa a dónde mandar a la persona
create or replace function public.registrar_escaneo(p_slug text, p_os text default null, p_city text default null,
                                                    p_country text default null, p_visitor text default null)
returns json language plpgsql security definer set search_path = public as $$
declare q record;
begin
  select id, name, destination, active into q from qrs where slug = lower(trim(p_slug));
  if q.id is null then return json_build_object('estado', 'no_existe'); end if;
  if q.active = 0 then return json_build_object('estado', 'pausa'); end if;
  insert into scans (qr_id, os, city, country, visitor)
  values (q.id, left(p_os, 30), left(p_city, 60), left(p_country, 10), left(p_visitor, 40));
  if q.destination is null then return json_build_object('estado', 'sin_liga', 'folio', q.name); end if;
  return json_build_object('estado', 'ok', 'destino', q.destination);
end $$;

-- Página de estadísticas de solo lectura para tu cliente
create or replace function public.qr_publico(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare q record;
begin
  select id, name, client, created_at into q from qrs where share_token = p_token;
  if q.id is null then raise exception 'No existe'; end if;
  return json_build_object('qr', json_build_object('name', q.name, 'client', q.client, 'created_at', q.created_at),
                           'stats', _stats(q.id));
end $$;

-- Permisos: lo público solo puede escanear y ver estadísticas compartidas
revoke execute on function public.gen_codigo(int), public._stats(int), public.qr_lista(),
  public.qr_crear(text, text, text, text), public.qr_crear_lote(int, text), public.qr_editar(int, text, text, text, boolean),
  public.qr_borrar(int), public.qr_detalle(int), public.qr_resumen() from public, anon;
grant execute on function public.gen_codigo(int), public._stats(int), public.qr_lista(),
  public.qr_crear(text, text, text, text), public.qr_crear_lote(int, text), public.qr_editar(int, text, text, text, boolean),
  public.qr_borrar(int), public.qr_detalle(int), public.qr_resumen() to authenticated;
grant execute on function public.registrar_escaneo(text, text, text, text, text), public.qr_publico(text) to anon, authenticated;

-- =====================================================================
-- Negocios (a quiénes has llegado), productos, ventas, gastos y ajustes
-- =====================================================================
create table if not exists public.negocios (
  id         integer generated always as identity primary key,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre     text not null,
  giro       text,
  telefono   text,
  direccion  text,
  lat        double precision,
  lng        double precision,
  estado     text not null default 'prospecto',
  servicios  text[] not null default '{}',
  notas      text,
  created_at timestamptz not null default now()
);

create table if not exists public.productos (
  id         integer generated always as identity primary key,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre     text not null,
  costo      numeric(12,2) not null default 0,
  precio     numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ventas (
  id          integer generated always as identity primary key,
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha       timestamptz not null default now(),
  negocio_id  integer references public.negocios(id) on delete set null,
  producto_id integer references public.productos(id) on delete set null,
  concepto    text not null,
  cantidad    numeric(10,2) not null default 1,
  precio_unit numeric(12,2) not null default 0,
  costo_unit  numeric(12,2) not null default 0,
  metodo      text,
  notas       text
);

create table if not exists public.gastos (
  id        integer generated always as identity primary key,
  owner     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha     timestamptz not null default now(),
  concepto  text not null,
  categoria text,
  monto     numeric(12,2) not null default 0,
  notas     text
);

create table if not exists public.ajustes (
  owner     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  meta      integer not null default 1000,
  servicios text[] not null default array['Placa de reseñas Google','Folleto con QR y NFC','Página web','Sistema de citas','Redes sociales','Menú digital con QR']
);

-- Inventario: materiales (insumos) con su costo y stock, y de qué está hecho cada producto
create table if not exists public.insumos (
  id         integer generated always as identity primary key,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre     text not null,
  unidad     text not null default 'pza',
  costo      numeric(12,2) not null default 0,
  stock      numeric(12,2) not null default 0,
  minimo     numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.receta (
  id          integer generated always as identity primary key,
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  producto_id integer not null references public.productos(id) on delete cascade,
  insumo_id   integer not null references public.insumos(id) on delete cascade,
  cantidad    numeric(12,3) not null default 1
);
create index if not exists idx_receta_producto on public.receta(producto_id);

-- Costo de mano de obra u otros (lo que no es material). El costo total = materiales + esto.
alter table public.productos add column if not exists costo_extra numeric(12,2) not null default 0;
-- Productos de antes (sin materiales): su costo pasa a "otros costos" para no perderlo
update public.productos p set costo_extra = p.costo
  where p.costo_extra = 0 and p.costo > 0 and not exists (select 1 from public.receta r where r.producto_id = p.id);

create index if not exists idx_ventas_fecha on public.ventas(owner, fecha);
create index if not exists idx_gastos_fecha on public.gastos(owner, fecha);

-- Cada usuario solo ve y cambia lo suyo; sin sesión no se ve nada
do $$
declare t text;
begin
  foreach t in array array['negocios','productos','ventas','gastos','ajustes','insumos','receta'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_dueno', t);
    execute format('create policy %I on public.%I for all to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()))', t || '_dueno', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- =====================================================================
-- Embudo de ventas (Vortex): Contactado → Negociando → Cerrado → Cliente
-- =====================================================================
alter table public.negocios add column if not exists valor_estimado numeric(12,2) not null default 0;
alter table public.negocios add column if not exists proximo date;            -- próximo seguimiento
alter table public.negocios add column if not exists estado_desde timestamptz not null default now();
alter table public.negocios alter column estado set default 'contactado';

-- Estados de la versión anterior → pasos nuevos (no afecta a los que ya están al día)
update public.negocios set estado = case estado
  when 'prospecto' then 'contactado' when 'visitado' then 'contactado'
  when 'interesado' then 'negociando' when 'no_interesado' then 'perdido' else estado end
where estado in ('prospecto', 'visitado', 'interesado', 'no_interesado');

-- Guarda desde cuándo está en su paso actual
create or replace function public.negocio_estado_desde() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.estado is distinct from old.estado then new.estado_desde := now(); end if;
  return new;
end $$;
drop trigger if exists trg_negocio_estado on public.negocios;
create trigger trg_negocio_estado before update on public.negocios
  for each row execute function public.negocio_estado_desde();

-- Servicios de Vortex para cuentas nuevas
alter table public.ajustes alter column servicios set default
  array['Menú digital','Página web','Placa de reseñas Google (QR + NFC)','Folleto de reseñas','Sistema de citas','Redes sociales'];

-- =====================================================================
-- Cotizaciones, cobros mensuales, plantillas de WhatsApp, metas y vendedores
-- =====================================================================
alter table public.ajustes add column if not exists empresa text not null default 'Vortex';
alter table public.ajustes add column if not exists tu_nombre text;
alter table public.ajustes add column if not exists telefono text;
alter table public.ajustes add column if not exists correo text;
alter table public.ajustes add column if not exists moneda text not null default 'MXN';
alter table public.ajustes add column if not exists meta_mes_negocios integer not null default 100;
alter table public.ajustes add column if not exists meta_mes_ventas numeric(12,2) not null default 0;
alter table public.ajustes add column if not exists plantillas jsonb;
alter table public.ajustes add column if not exists vendedores jsonb not null default '[]';

alter table public.negocios add column if not exists vendedor text;
alter table public.ventas add column if not exists vendedor text;
alter table public.ventas add column if not exists suscripcion_id integer;
alter table public.ventas add column if not exists periodo text;          -- 'AAAA-MM' de una mensualidad
alter table public.ventas add column if not exists cotizacion_id integer;

create table if not exists public.cotizaciones (
  id         integer generated always as identity primary key,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  folio      integer not null,
  negocio_id integer references public.negocios(id) on delete set null,
  fecha      timestamptz not null default now(),
  items      jsonb not null default '[]',   -- [{concepto, cantidad, precio, producto_id}]
  total      numeric(12,2) not null default 0,
  vigencia   integer not null default 15,   -- días
  notas      text,
  estado     text not null default 'enviada', -- enviada | aceptada | rechazada
  vendedor   text
);

create table if not exists public.suscripciones (
  id         integer generated always as identity primary key,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  negocio_id integer references public.negocios(id) on delete set null,
  concepto   text not null,
  monto      numeric(12,2) not null default 0,
  costo      numeric(12,2) not null default 0, -- lo que te cuesta a ti cada mes (hosting, etc.)
  dia_cobro  integer not null default 1 check (dia_cobro between 1 and 28),
  renovacion date,                              -- ej. vence el dominio
  activa     boolean not null default true,
  notas      text,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['cotizaciones','suscripciones'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_dueno', t);
    execute format('create policy %I on public.%I for all to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()))', t || '_dueno', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- =====================================================================
-- Contratos y movimientos de stock
-- =====================================================================
alter table public.ajustes add column if not exists ciudad text default 'Puerto Vallarta, Jalisco';
alter table public.ajustes add column if not exists firma text;  -- ej. "Ing. Esteban Ortiz Domínguez"

create table if not exists public.contratos (
  id         integer generated always as identity primary key,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  folio      integer not null,
  negocio_id integer references public.negocios(id) on delete set null,
  cliente    text not null,
  genero     text not null default 'f',      -- f = "LA CLIENTE", m = "EL CLIENTE"
  ciudad     text,
  fecha      date not null default current_date,
  total      numeric(12,2) not null default 0,
  estado     text not null default 'enviado', -- enviado | firmado
  created_at timestamptz not null default now()
);

create table if not exists public.movimientos (
  id          integer generated always as identity primary key,
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  insumo_id   integer references public.insumos(id) on delete cascade,
  fecha       timestamptz not null default now(),
  tipo        text not null,                  -- entrada | salida | conteo | venta | edicion
  cantidad    numeric(12,3) not null default 0, -- + entra, - sale
  stock_final numeric(12,3),
  motivo      text
);

do $$
declare t text;
begin
  foreach t in array array['contratos','movimientos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_dueno', t);
    execute format('create policy %I on public.%I for all to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()))', t || '_dueno', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- =====================================================================
-- Tipos de contrato, firma en línea, anticipos, abonos, proveedores,
-- portal del cliente, idioma y link de pago
-- =====================================================================
alter table public.contratos add column if not exists tipo text not null default 'dental'; -- dental | web | menu | placas
alter table public.contratos add column if not exists token text;
update public.contratos set token = public.gen_codigo(20) where token is null;
alter table public.contratos alter column token set default public.gen_codigo(20);
create unique index if not exists contratos_token on public.contratos(token);
alter table public.contratos add column if not exists anticipo numeric(12,2) not null default 0;
alter table public.contratos add column if not exists mensualidad numeric(12,2) not null default 0;
alter table public.contratos add column if not exists cantidad numeric(12,2) not null default 1;
alter table public.contratos add column if not exists firma text;           -- imagen de la firma (data:image/png)
alter table public.contratos add column if not exists firma_nombre text;
alter table public.contratos add column if not exists firmado_at timestamptz;

alter table public.ventas add column if not exists pagado numeric(12,2);   -- vacío = pagada completa
alter table public.ventas add column if not exists contrato_id integer references public.contratos(id) on delete set null;

alter table public.negocios add column if not exists portal_token text;
update public.negocios set portal_token = public.gen_codigo(16) where portal_token is null;
alter table public.negocios alter column portal_token set default public.gen_codigo(16);
create unique index if not exists negocios_portal on public.negocios(portal_token);
alter table public.negocios add column if not exists contacto text;        -- ej. "Dra. Edith Montero"

alter table public.ajustes add column if not exists idioma text not null default 'es';  -- idioma de lo que ven tus clientes
alter table public.ajustes add column if not exists link_pago text;                     -- Stripe / Mercado Pago payment link
alter table public.suscripciones add column if not exists link_pago text;

create table if not exists public.abonos (
  id         integer generated always as identity primary key,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  folio      integer not null default 0,
  venta_id   integer references public.ventas(id) on delete cascade,
  negocio_id integer references public.negocios(id) on delete set null,
  fecha      timestamptz not null default now(),
  monto      numeric(12,2) not null,
  metodo     text,
  concepto   text
);

create table if not exists public.proveedores (
  id         integer generated always as identity primary key,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre     text not null,
  telefono   text,
  notas      text,
  created_at timestamptz not null default now()
);

create table if not exists public.precios_prov (
  id           integer generated always as identity primary key,
  owner        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  proveedor_id integer not null references public.proveedores(id) on delete cascade,
  insumo_id    integer not null references public.insumos(id) on delete cascade,
  precio       numeric(12,2) not null default 0,
  unique (proveedor_id, insumo_id)
);

do $$
declare t text;
begin
  foreach t in array array['abonos','proveedores','precios_prov'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_dueno', t);
    execute format('create policy %I on public.%I for all to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()))', t || '_dueno', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------- Firma en línea: lo que ve tu cliente en /f/token ----------
create or replace function public.contrato_publico(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare c record; a record;
begin
  if coalesce(length(p_token), 0) < 12 then raise exception 'No existe'; end if;
  select * into c from contratos where token = p_token;
  if c.id is null then raise exception 'No existe'; end if;
  select empresa, telefono, correo, ciudad, firma, moneda, idioma into a from ajustes where owner = c.owner;
  return json_build_object('folio', c.folio, 'tipo', c.tipo, 'cliente', c.cliente, 'genero', c.genero, 'ciudad', c.ciudad,
    'fecha', c.fecha, 'total', c.total, 'anticipo', c.anticipo, 'mensualidad', c.mensualidad, 'estado', c.estado,
    'firmado_at', c.firmado_at, 'firma_nombre', c.firma_nombre, 'cantidad', c.cantidad, 'negocio', (select nombre from negocios where id = c.negocio_id),
    'empresa', coalesce(a.empresa, 'Vortex'), 'telefono', a.telefono, 'correo', a.correo, 'ciudad_empresa', a.ciudad,
    'firma_empresa', a.firma, 'moneda', coalesce(a.moneda, 'MXN'), 'idioma', coalesce(a.idioma, 'es'));
end $$;

create or replace function public.contrato_firmar(p_token text, p_nombre text, p_firma text) returns json
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if coalesce(length(p_token), 0) < 12 then raise exception 'No existe'; end if;
  if coalesce(length(trim(p_nombre)), 0) < 3 then raise exception 'Escribe tu nombre completo'; end if;
  if p_firma is null or p_firma not like 'data:image/png;base64,%' or length(p_firma) > 400000 then raise exception 'Firma no válida'; end if;
  select * into c from contratos where token = p_token for update;
  if c.id is null then raise exception 'No existe'; end if;
  if c.firmado_at is not null then raise exception 'Este contrato ya está firmado'; end if;
  update contratos set firma = p_firma, firma_nombre = left(trim(p_nombre), 120), firmado_at = now(), estado = 'firmado' where id = c.id;
  -- se registra la venta en tu Caja (con el anticipo si lo hubo)
  if not exists (select 1 from ventas where contrato_id = c.id) then
    insert into ventas (owner, fecha, negocio_id, concepto, cantidad, precio_unit, costo_unit, metodo, contrato_id, pagado)
    values (c.owner, now(), c.negocio_id, 'Contrato WEB-COM-' || lpad(c.folio::text, 4, '0'), 1, c.total, 0, 'Transferencia', c.id, c.anticipo);
  end if;
  -- si lleva mensualidad, se da de alta el cobro mensual
  if c.mensualidad > 0 and not exists (select 1 from suscripciones where owner = c.owner and negocio_id is not distinct from c.negocio_id and notas = 'Contrato WEB-COM-' || lpad(c.folio::text, 4, '0')) then
    insert into suscripciones (owner, negocio_id, concepto, monto, costo, dia_cobro, activa, notas)
    values (c.owner, c.negocio_id, case c.tipo when 'web' then 'Hosting y mantenimiento de página web' when 'menu' then 'Menú digital' else 'Mantenimiento del sistema' end,
            c.mensualidad, 0, least(28, extract(day from now())::int), true, 'Contrato WEB-COM-' || lpad(c.folio::text, 4, '0'));
  end if;
  if c.negocio_id is not null then update negocios set estado = 'cliente' where id = c.negocio_id; end if;
  return json_build_object('ok', true);
end $$;

-- ---------- Portal del cliente en /c/token ----------
create or replace function public.portal_publico(p_token text) returns json
language plpgsql stable security definer set search_path = public as $$
declare n record; a record; mes text := to_char(now() at time zone 'America/Mexico_City', 'YYYY-MM');
begin
  if coalesce(length(p_token), 0) < 12 then raise exception 'No existe'; end if;
  select * into n from negocios where portal_token = p_token;
  if n.id is null then raise exception 'No existe'; end if;
  select empresa, telefono, correo, moneda, idioma, link_pago into a from ajustes where owner = n.owner;
  return json_build_object(
    'negocio', n.nombre, 'empresa', coalesce(a.empresa, 'Vortex'), 'telefono', a.telefono, 'correo', a.correo,
    'moneda', coalesce(a.moneda, 'MXN'), 'idioma', coalesce(a.idioma, 'es'), 'link_pago', a.link_pago,
    'qrs', coalesce((select json_agg(json_build_object('name', q.name, 'share_token', q.share_token,
        'total', (select count(*) from scans s where s.qr_id = q.id),
        'mes', (select count(*) from scans s where s.qr_id = q.id and to_char(s.ts at time zone 'America/Mexico_City', 'YYYY-MM') = mes)) order by q.id)
      from qrs q where q.owner = n.owner and lower(trim(q.client)) = lower(trim(n.nombre))), '[]'::json),
    'compras', coalesce((select json_agg(json_build_object('fecha', v.fecha, 'concepto', v.concepto, 'total', v.cantidad * v.precio_unit,
        'pagado', coalesce(v.pagado, v.cantidad * v.precio_unit)) order by v.fecha desc)
      from ventas v where v.negocio_id = n.id and v.suscripcion_id is null), '[]'::json),
    'mensualidades', coalesce((select json_agg(json_build_object('concepto', s.concepto, 'monto', s.monto, 'dia', s.dia_cobro,
        'link_pago', coalesce(s.link_pago, a.link_pago),
        'pagado', exists (select 1 from ventas v where v.suscripcion_id = s.id and v.periodo = mes)))
      from suscripciones s where s.negocio_id = n.id and s.activa), '[]'::json),
    'contratos', coalesce((select json_agg(json_build_object('folio', c.folio, 'tipo', c.tipo, 'total', c.total, 'token', c.token,
        'firmado', c.firmado_at is not null or c.estado = 'firmado') order by c.folio desc)
      from contratos c where c.negocio_id = n.id), '[]'::json));
end $$;

revoke execute on function public.contrato_publico(text), public.contrato_firmar(text, text, text), public.portal_publico(text) from public;
grant execute on function public.contrato_publico(text), public.contrato_firmar(text, text, text), public.portal_publico(text) to anon, authenticated;
