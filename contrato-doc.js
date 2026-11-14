// Texto de los contratos (uno por tipo de servicio). Lo usa el panel para el Word y la página de firma para mostrarlo.
// En los textos, **así** va en negritas y {C} es "LA CLIENTE" o "EL CLIENTE".
window.ContratoDoc = (() => {
  const num = (x) => Number(x) || 0;
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const folioTxt = (n) => 'WEB-COM-' + String(n).padStart(4, '0');
  const fechaCorta = (d) => `${String(d).slice(8, 10)}/${String(d).slice(5, 7)}/${String(d).slice(0, 4)}`;
  const fechaLarga = (d) => `${+String(d).slice(8, 10)} de ${MESES[+String(d).slice(5, 7) - 1]} de ${String(d).slice(0, 4)}`;
  const m2 = (n) => '$' + num(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ---------- cantidad con letra ----------
  const U = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const DEC = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const cientos = (n) => { if (n === 100) return 'CIEN'; const c = Math.floor(n / 100), r = n % 100; const dd = r < 30 ? U[r] : DEC[Math.floor(r / 10)] + (r % 10 ? ' Y ' + U[r % 10] : ''); return [CEN[c], dd].filter(Boolean).join(' '); };
  function letras(n) {
    n = Math.floor(n); if (n === 0) return 'CERO';
    const mill = Math.floor(n / 1e6), miles = Math.floor((n % 1e6) / 1000), resto = n % 1000, out = [];
    if (mill) out.push(mill === 1 ? 'UN MILLÓN' : letras(mill) + ' MILLONES');
    if (miles) out.push(miles === 1 ? 'MIL' : cientos(miles) + ' MIL');
    if (resto) out.push(cientos(resto));
    return out.join(' ');
  }
  function totalLetra(t, moneda = 'MXN') {
    const usd = moneda === 'USD', ent = Math.floor(num(t) + 1e-9), cent = Math.round((num(t) - ent) * 100);
    const txt = letras(ent), de = /MILLÓN$|MILLONES$/.test(txt) ? ' DE' : '';
    return `${txt}${de} ${usd ? (ent === 1 ? 'DÓLAR' : 'DÓLARES') : (ent === 1 ? 'PESO' : 'PESOS')} ${String(cent).padStart(2, '0')}/100 ${usd ? 'USD' : 'M.N.'}`;
  }

  // ---------- los cuatro contratos ----------
  const TIPOS = {
    dental: {
      nombre: 'Sistema dental', titulo: 'SISTEMA DENTAL DE AGENDA Y ADMINISTRACIÓN', clave: 'SDA-01', unidad: 'PAQ', dias: 7, precio: 1500,
      concepto: 'Sistema dental de agenda y administración para el consultorio. Incluye página web del consultorio con agenda de citas en línea, confirmación de citas por WhatsApp, link de citas con código QR, panel del consultorio, calendario por día y por semana, expediente clínico digital con odontograma, control de citas, informes de ingresos, programa de lealtad, versión para celular, hosting, base de datos, certificado SSL, capacitación, mantenimiento y soporte técnico 24/7.',
      declara: (fem, ciudad) => `Que es ${fem ? 'médica cirujana dentista' : 'médico cirujano dentista'} con consultorio en ${ciudad}, que es su voluntad contratar el sistema descrito en este contrato y que conoce y acepta su alcance, precio y condiciones.`,
      objeto: 'un sistema dental de agenda y administración en línea',
      incluye: ['Página web del consultorio con agenda de citas en línea, el paciente elige tratamiento, día y hora y aparta su cita en tres pasos, con confirmación por WhatsApp.',
        'Panel del consultorio con cobrado del día, citas por confirmar y la agenda de cada doctor en una sola pantalla.',
        'Calendario por día y por semana, con todo el equipo en columnas.',
        'Expediente clínico digital con antecedentes, alergias, odontograma interactivo y notas de cada visita.',
        'Control de cada cita (marcar pagada, enviar recordatorio, mover o cancelar) e informes de ingresos por tratamiento y por doctor.',
        'Programa de lealtad con tarjeta de sellos automática y link de citas con código QR para Instagram, Google Maps o el mostrador.',
        'Versión para celular, hosting, base de datos, certificado de seguridad SSL, configuración inicial y capacitación al personal.'],
      info: 'la información del consultorio (tratamientos, precios, horarios, doctores, logo y fotos)',
      datos: true,
      garantia: ['Soporte 24/7, atención de reportes, dudas y fallas las 24 horas, los 7 días de la semana.',
        'Restablecimiento inmediato y sin costo del sistema ante cualquier caída por fallas del hosting, servidor o programación.',
        'Corrección sin costo de cualquier error de funcionamiento en la página, agenda, panel, expediente, recordatorios, informes o tarjeta de lealtad.',
        'Respaldos periódicos de toda la información, con restauración sin costo en caso de pérdida.',
        'Mantenimiento, actualizaciones de seguridad y renovación del certificado SSL sin costo.',
        'Capacitación adicional al personal del consultorio cuando lo requiera, sin costo.'],
    },
    web: {
      nombre: 'Página web', titulo: 'PÁGINA WEB PROFESIONAL', clave: 'WEB-01', unidad: 'PAQ', dias: 10, precio: 2500,
      concepto: 'Página web profesional para el negocio. Incluye diseño a la medida con hasta 5 secciones, versión para celular, dominio .com o .com.mx por un año, hosting, certificado SSL, botón de WhatsApp, formulario de contacto, mapa de Google, optimización básica para buscadores, alta o mejora del perfil de Google y dos rondas de cambios.',
      declara: (fem, ciudad, negocio) => `Que es ${fem ? 'propietaria o representante' : 'propietario o representante'} del negocio ${negocio || 'que se indica en este contrato'}, ubicado en ${ciudad}, que es su voluntad contratar la página web descrita en este contrato y que conoce y acepta su alcance, precio y condiciones.`,
      objeto: 'una página web profesional para su negocio',
      incluye: ['Diseño a la medida con hasta 5 secciones (por ejemplo inicio, servicios, galería, opiniones y contacto).',
        'Versión para celular y computadora.',
        'Dominio .com o .com.mx a nombre de {C} por el primer año, hosting y certificado de seguridad SSL.',
        'Botón de WhatsApp, formulario de contacto y mapa de Google con la ubicación.',
        'Optimización básica para aparecer en Google y alta o mejora del perfil de Google del negocio.',
        'Dos rondas de cambios sin costo antes de la entrega final.'],
      info: 'los textos, el logo, las fotos y los datos del negocio',
      garantia: ['Corrección sin costo de cualquier error de funcionamiento de la página.',
        'Restablecimiento sin costo de la página ante caídas del hosting o del servidor.',
        'Renovación del certificado SSL y actualizaciones de seguridad mientras el servicio esté activo.',
        'Atención de dudas y reportes por WhatsApp en horario de lunes a sábado.'],
    },
    menu: {
      nombre: 'Menú digital', titulo: 'MENÚ DIGITAL CON CÓDIGO QR', clave: 'MEN-01', unidad: 'PAQ', dias: 5, precio: 1500,
      concepto: 'Menú digital para el negocio. Incluye menú en línea con categorías, fotos y precios, código QR para mesas y mostrador, botón para pedir por WhatsApp, versión para celular, hosting, cambios de precios y platillos sin costo y estadísticas de visitas.',
      declara: (fem, ciudad, negocio) => `Que es ${fem ? 'propietaria o representante' : 'propietario o representante'} del negocio ${negocio || 'que se indica en este contrato'}, ubicado en ${ciudad}, que es su voluntad contratar el menú digital descrito en este contrato y que conoce y acepta su alcance, precio y condiciones.`,
      objeto: 'un menú digital en línea con código QR',
      incluye: ['Menú en línea con categorías, fotos, descripciones y precios de cada platillo o producto.',
        'Código QR para mesas, mostrador y redes sociales, que no cambia aunque se actualice el menú.',
        'Botón para pedir o reservar por WhatsApp.',
        'Versión para celular, hosting y certificado de seguridad SSL.',
        'Cambios de precios, platillos y promociones sin costo, solicitados por WhatsApp.',
        'Estadísticas de cuántas personas ven el menú.'],
      info: 'la lista de platillos o productos con sus precios, el logo y las fotos',
      garantia: ['Corrección sin costo de cualquier error de funcionamiento del menú.',
        'Restablecimiento sin costo ante caídas del hosting o del servidor.',
        'Actualización de precios y platillos en un máximo de 48 horas después de solicitarla.',
        'Reposición del código QR impreso si se daña, al costo del material.'],
    },
    placas: {
      nombre: 'Placas de reseñas', titulo: 'PLACAS DE RESEÑAS DE GOOGLE CON QR Y NFC', clave: 'PLA-01', unidad: 'PZA', dias: 5, precio: 450,
      concepto: 'Placa de reseñas de Google con código QR dinámico y chip NFC. Al escanearla o acercar el celular, el cliente llega directo a dejar su reseña. Incluye diseño con el logo del negocio, configuración del enlace, estadísticas de escaneos y cambio del enlace sin reimprimir.',
      declara: (fem, ciudad, negocio) => `Que es ${fem ? 'propietaria o representante' : 'propietario o representante'} del negocio ${negocio || 'que se indica en este contrato'}, ubicado en ${ciudad}, que es su voluntad adquirir las placas descritas en este contrato y que conoce y acepta su alcance, precio y condiciones.`,
      objeto: 'placas de reseñas de Google con código QR dinámico y chip NFC',
      incluye: ['Placas impresas con el diseño y logo del negocio.',
        'Código QR dinámico y chip NFC configurados para abrir directo la página de reseñas de Google del negocio.',
        'Estadísticas de escaneos que {C} puede consultar en línea.',
        'Cambio del enlace de destino sin costo y sin reimprimir la placa.'],
      info: 'el logo del negocio y el acceso o enlace a su perfil de Google',
      garantia: ['Reposición sin costo de cualquier placa con defecto de fabricación durante los primeros 30 días.',
        'Reconfiguración sin costo del QR o del chip NFC cuando lo solicite {C}.',
        'Atención de dudas por WhatsApp en horario de lunes a sábado.'],
    },
  };

  // ---------- el contrato armado como bloques ----------
  // k = fila de contratos, cfg = ajustes, extra = { negocio, moneda }
  function modelo(k, cfg = {}, extra = {}) {
    const T = TIPOS[k.tipo] || TIPOS.dental;
    const fem = k.genero !== 'm', LC = fem ? 'LA CLIENTE' : 'EL CLIENTE', Q = `"${LC}"`;
    const sub = (s) => s.replace(/\{C\}/g, Q);
    const EMP = cfg.empresa || 'Vortex', FIRMA = cfg.firma || cfg.tu_nombre || '', CIU = cfg.ciudad || cfg.ciudad_empresa || 'Puerto Vallarta, Jalisco';
    const [ciuNom, est] = CIU.split(',').map((s) => s.trim()), estado = est || ciuNom;
    const MON = (extra.moneda || cfg.moneda) === 'USD' ? 'USD' : 'MXN';
    const total = num(k.total), imp = Math.round((total / 1.16) * 100) / 100, iva = Math.round((total - imp) * 100) / 100;
    const ant = Math.min(total, num(k.anticipo)), resto = Math.round((total - ant) * 100) / 100, mens = num(k.mensualidad);
    const contacto = [cfg.telefono ? 'teléfono ' + cfg.telefono : null, cfg.correo ? 'correo ' + cfg.correo : null].filter(Boolean).join(' y ');
    const L = [];
    const H = (t) => L.push({ t: 'h', v: t }), P = (v) => L.push({ t: 'p', v: sub(v) }), B = (v) => L.push({ t: 'b', v: sub(v) }), BAN = (v) => L.push({ t: 'banner', v });
    P(`Contrato de prestación de servicios que celebran, por una parte, **${EMP.toUpperCase()}**${FIRMA ? `, representada en este acto por **${FIRMA}**, en su carácter de Director General` : ''}, a quien en lo sucesivo se le denominará "EL PRESTADOR", y por la otra parte, **${k.cliente}**, a quien en lo sucesivo se le denominará ${Q}, y en conjunto "LAS PARTES", al tenor de las siguientes declaraciones y cláusulas.`);
    BAN('DECLARACIONES');
    P('**I. Declara "EL PRESTADOR"**');
    B(`Que opera bajo la denominación comercial ${EMP}, con domicilio en ${CIU}${contacto ? ', ' + contacto : ''}.`);
    B('Que cuenta con la capacidad técnica para desarrollar, implementar y mantener el servicio objeto de este contrato.');
    P(`**II. Declara ${Q}**`);
    B(T.declara(fem, k.ciudad || '', extra.negocio));
    P('**III. Declaran "LAS PARTES"**');
    P('Que se reconocen mutuamente la capacidad legal con que se ostentan y que es su voluntad obligarse conforme a las siguientes cláusulas.');
    BAN('CLÁUSULAS');
    H('PRIMERA. OBJETO DEL CONTRATO.');
    P(`"EL PRESTADOR" se obliga a desarrollar, configurar, entregar y mantener para ${Q} ${T.objeto}, que comprende lo siguiente.`);
    T.incluye.forEach(B);
    H('SEGUNDA. PRECIO Y FORMA DE PAGO.');
    P(ant > 0
      ? `${Q} pagará a "EL PRESTADOR" la cantidad total de ${m2(total)} ${MON} (${totalLetra(total, MON)}), IVA incluido, de la siguiente forma. Un anticipo de ${m2(ant)} ${MON} a la firma de este contrato y el resto, ${m2(resto)} ${MON}, contra la entrega del servicio funcionando. El desglose es el siguiente.`
      : `${Q} pagará a "EL PRESTADOR" la cantidad de ${m2(total)} ${MON} (${totalLetra(total, MON)}), IVA incluido, en una sola exhibición contra la entrega del servicio funcionando, conforme al siguiente desglose.`);
    L.push({ t: 'precio' });
    H(mens > 0 ? 'TERCERA. MENSUALIDAD.' : 'TERCERA. SIN MENSUALIDAD.');
    P(mens > 0
      ? `Además del pago anterior, ${Q} pagará una mensualidad de ${m2(mens)} ${MON} que cubre el hosting, el mantenimiento, la seguridad y el soporte técnico. Se paga dentro de los primeros 5 días de cada mes y ${Q} puede cancelarla en cualquier momento con aviso de 30 días, sin penalización.`
      : '"EL PRESTADOR" no cobrará mensualidad, cuota periódica ni cargo recurrente alguno por el servicio descrito. Lo necesario para su funcionamiento queda cubierto por el pago señalado en la cláusula Segunda' + (k.tipo === 'web' ? ', con excepción de la renovación anual del dominio y el hosting a partir del segundo año, que se cobrará al costo previo aviso.' : '.'));
    H('CUARTA. PLAZO DE ENTREGA Y CAPACITACIÓN.');
    P(`"EL PRESTADOR" entregará el servicio funcionando en un plazo de ${T.dias} días naturales contados a partir de que ${Q} le proporcione ${T.info}.`);
    P(`Al momento de la entrega, "EL PRESTADOR" explicará sin costo a ${Q} y a su personal cómo usar el servicio, de forma presencial o en línea.`);
    if (T.datos) {
      H('QUINTA. PROPIEDAD DE LA BASE DE DATOS Y RESPALDO DE INFORMACIÓN.');
      P(`La base de datos del sistema y toda la información registrada en ella (pacientes, citas, expedientes clínicos, cobros e informes) es propiedad exclusiva de ${Q}. "EL PRESTADOR" únicamente la resguarda para operar el sistema.`);
      P(`En cualquier momento, y en especial si ${Q} decide dejar de utilizar el sistema, podrá solicitar a "EL PRESTADOR" un respaldo completo (backup) de todos sus datos y los de sus pacientes. "EL PRESTADOR" se obliga a entregarlo sin costo, en un formato de uso común (por ejemplo Excel o CSV), en un plazo máximo de 5 días naturales a partir de la solicitud, y a no conservar, usar ni compartir dicha información una vez entregada, salvo que ${Q} indique lo contrario.`);
    } else {
      H('QUINTA. PROPIEDAD DEL CONTENIDO.');
      P(`Los textos, fotos, logotipos, dominio y datos del negocio son propiedad de ${Q}. Si ${Q} decide dejar el servicio, "EL PRESTADOR" le entregará sin costo sus archivos y el control del dominio en un plazo máximo de 5 días naturales.`);
    }
    H('SEXTA. CONFIDENCIALIDAD.');
    P(`"EL PRESTADOR" se obliga a mantener en estricta confidencialidad la información de ${Q}, a no utilizarla para fines distintos a la prestación del servicio y a no compartirla con terceros, salvo requerimiento de autoridad competente.`);
    H(`SÉPTIMA. SOPORTE Y GARANTÍA A FAVOR DE ${LC}.`);
    P(`"EL PRESTADOR" otorga a favor de ${Q} una garantía sin costo adicional, que comprende lo siguiente.`);
    T.garantia.forEach(B);
    P(`La garantía no aplica a daños causados intencionalmente por terceros ajenos a ${EMP}.`);
    H('OCTAVA. TERMINACIÓN.');
    P(`${Q} podrá dar por terminado el servicio en cualquier momento, sin penalización alguna, dando aviso a "EL PRESTADOR"${T.datos ? ', quien deberá entregarle el respaldo de su información conforme a la cláusula Quinta' : ''}. Los pagos ya realizados por trabajo entregado no son reembolsables.`);
    H('NOVENA. FIRMA ELECTRÓNICA.');
    P('LAS PARTES aceptan que este contrato puede firmarse de forma autógrafa o electrónica, desde el enlace que "EL PRESTADOR" envíe a ' + Q + ', y que ambas formas tienen la misma validez.');
    H('DÉCIMA. LEY APLICABLE Y JURISDICCIÓN.');
    P(`Para la interpretación y cumplimiento de este contrato, LAS PARTES se someten a las leyes del Estado de ${estado} y a los tribunales competentes de ${CIU}, renunciando a cualquier otro fuero que pudiera corresponderles.`);
    P(`Leído que fue el presente contrato y enteradas LAS PARTES de su contenido y alcance legal, lo firman de conformidad en ${CIU}, el ${fechaLarga(k.fecha)}.`);
    return {
      T, LC, EMP, FIRMA, CIU, MON, folio: folioTxt(k.folio), lineas: L,
      titulo: 'CONTRATO DE PRESTACIÓN DE SERVICIOS', subtitulo: `${T.titulo} — CONTRATO No. ${String(k.folio).padStart(4, '0')}`,
      precio: { imp, iva, total, ant, resto, mens },
    };
  }

  // ---------- versión HTML (página de firma) ----------
  const escH = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const boldH = (s) => escH(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  function html(k, cfg, extra) {
    const M = modelo(k, cfg, extra), p = M.precio;
    let out = `<h2 class="ct">${M.titulo}</h2><p class="cs">${escH(M.subtitulo)}</p>`, ul = false;
    const close = () => { if (ul) { out += '</ul>'; ul = false; } };
    for (const l of M.lineas) {
      if (l.t === 'b') { if (!ul) { out += '<ul>'; ul = true; } out += `<li>${boldH(l.v)}</li>`; continue; }
      close();
      if (l.t === 'banner') out += `<div class="ban">${escH(l.v)}</div>`;
      else if (l.t === 'h') out += `<h3>${escH(l.v)}</h3>`;
      else if (l.t === 'p') out += `<p>${boldH(l.v)}</p>`;
      else if (l.t === 'precio') out += `<table class="pt"><tr><td>${escH(M.T.concepto)}</td></tr></table>
        <table class="ft"><tr><td>Subtotal (sin IVA)</td><td>${m2(p.imp)} ${M.MON}</td></tr><tr><td>IVA (16%)</td><td>${m2(p.iva)} ${M.MON}</td></tr>
        <tr class="tot"><td>TOTAL CON IVA</td><td>${m2(p.total)} ${M.MON}</td></tr>${p.ant ? `<tr><td>Anticipo a la firma</td><td>${m2(p.ant)}</td></tr><tr><td>Resto a la entrega</td><td>${m2(p.resto)}</td></tr>` : ''}
        ${p.mens ? `<tr><td>Mensualidad</td><td>${m2(p.mens)}</td></tr>` : ''}</table>`;
    }
    close();
    return out;
  }

  // ---------- versión Word ----------
  function dataUrlBytes(d) { const b = atob(d.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function docx(X, k, cfg, extra = {}) {
    const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType, Header, Footer, PageNumber, TabStopType, VerticalAlign, LevelFormat, ImageRun } = X;
    const M = modelo(k, cfg, extra), p = M.precio, T = M.T;
    const NAVY = '1B3B63', BAND = 'DCE6F1', GRAY = 'F2F2F2', TOTALBG = 'E4E9F0', CW = 10512;
    const NO = { style: BorderStyle.NONE }, noBorder = { top: NO, bottom: NO, left: NO, right: NO }, NB = { ...noBorder, insideHorizontal: NO, insideVertical: NO };
    const tb = { style: BorderStyle.SINGLE, size: 2, color: 'D9D9D9' }, cb = { top: tb, bottom: tb, left: tb, right: tb };
    const R = (text, o = {}) => new TextRun({ text, font: 'Calibri', size: 20, ...o });
    const runs = (s) => String(s).split(/(\*\*.+?\*\*)/).filter(Boolean).map((x) => (x.startsWith('**') ? R(x.slice(2, -2), { bold: true }) : R(x)));
    const cell = (children, { width, shading, borders = noBorder, valign = VerticalAlign.CENTER, margins, span } = {}) => new TableCell({ width: { size: width, type: WidthType.DXA }, columnSpan: span, shading: shading ? { type: ShadingType.CLEAR, fill: shading } : undefined, borders, verticalAlign: valign, margins: margins || { top: 60, bottom: 60, left: 80, right: 80 }, children });
    const spacer = (h = 120) => new Paragraph({ spacing: { after: h }, children: [] });
    const banner = (t) => new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW], rows: [new TableRow({ children: [cell([new Paragraph({ children: [R(t, { bold: true, color: 'FFFFFF', size: 22 })] })], { width: CW, shading: NAVY, margins: { top: 80, bottom: 80, left: 120, right: 120 } })] })] });
    const EMPU = M.EMP.toUpperCase();
    const contactLines = [cfg.telefono ? 'Tel. ' + cfg.telefono : null, cfg.correo, M.CIU].filter(Boolean);
    const header = new Header({ children: [new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [6500, 4012], borders: { ...NB, bottom: { style: BorderStyle.SINGLE, size: 20, color: NAVY } }, rows: [new TableRow({ children: [
      cell([new Table({ width: { size: 6500, type: WidthType.DXA }, columnWidths: [650, 5850], borders: NB, rows: [new TableRow({ children: [
        cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [R(EMPU[0], { bold: true, color: 'FFFFFF', size: 32 })] })], { width: 650, shading: NAVY, margins: { top: 200, bottom: 200, left: 0, right: 0 } }),
        cell([new Paragraph({ children: [R(EMPU, { bold: true, color: NAVY, size: 27 })] })], { width: 5850 })] })] })], { width: 6500 }),
      cell(contactLines.map((t, i) => new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: i === contactLines.length - 1 ? 0 : 20 }, children: [R(t, { color: '444444', size: 15 })] })), { width: 4012, valign: VerticalAlign.BOTTOM }),
    ] })] })] });
    const footer = new Footer({ children: [new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } }, tabStops: [{ type: TabStopType.RIGHT, position: CW }], children: [R(`${M.EMP} · ${M.CIU}`, { size: 14, color: '888888' }), R('\tPágina ', { size: 14, color: '888888' }), new TextRun({ children: [PageNumber.CURRENT], size: 14, color: '888888', font: 'Calibri' })] })] });
    const lv = (l, v) => cell([new Paragraph({ spacing: { after: 20 }, children: [R(l, { bold: true, color: NAVY, size: 15 })] }), new Paragraph({ children: [R(v)] })], { width: 5256, shading: GRAY });
    const datos = new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [5256, 5256], rows: [
      new TableRow({ children: [lv('FOLIO', M.folio), lv('FECHA', fechaCorta(k.fecha))] }),
      new TableRow({ children: [lv('NOMBRE DEL CLIENTE', k.cliente), lv('UBICACIÓN DEL PROYECTO', String(k.ciudad || '').toUpperCase())] })] });
    const cw = [520, 841, 4736, 841, 946, 1156, 1472];
    const cant = num(k.cantidad) || 1, pu = Math.round((p.imp / cant) * 100) / 100;
    const priceTable = new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: cw, rows: [
      new TableRow({ tableHeader: true, children: ['No.', 'Clave', 'Concepto', 'Unidad', 'Cant.', 'P.U.', 'Importe'].map((t, i) => cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [R(t, { bold: true, color: 'FFFFFF', size: 18 })] })], { width: cw[i], shading: NAVY, borders: cb })) }),
      new TableRow({ children: [cell([new Paragraph({ children: [R('1. ' + T.nombre.toUpperCase(), { bold: true, color: NAVY, size: 18 })] })], { width: CW, span: 7, shading: BAND, borders: cb })] }),
      new TableRow({ cantSplit: true, children: [['1'], [T.clave], [T.concepto, AlignmentType.LEFT], [T.unidad], [cant.toFixed(2)], [m2(pu)], [m2(p.imp), undefined, true]].map(([t, a = AlignmentType.CENTER, b], i) => cell([new Paragraph({ alignment: a, children: [R(t, { size: 16, bold: b })] })], { width: cw[i], borders: cb })) })] });
    const fr = (l, v, o = {}) => new TableRow({ cantSplit: true, children: [cell([new Paragraph({ keepNext: true, alignment: AlignmentType.RIGHT, children: [R(l, { bold: o.b, size: o.big ? 22 : 20 })] })], { width: 3500 }), cell([new Paragraph({ keepNext: true, alignment: AlignmentType.RIGHT, children: [R(v, { bold: o.b, size: o.big ? 22 : 20 })] })], { width: 2000, shading: o.bg || GRAY })] });
    const fiscal = new Table({ width: { size: 5500, type: WidthType.DXA }, columnWidths: [3500, 2000], alignment: AlignmentType.RIGHT, rows: [fr('Subtotal (sin IVA)', `${m2(p.imp)} ${M.MON}`), fr('IVA (16%)', `${m2(p.iva)} ${M.MON}`), fr('TOTAL CON IVA', `${m2(p.total)} ${M.MON}`, { b: true, bg: TOTALBG, big: true })] });
    const pw = [3504, 3504, 3504];
    const payRows = p.ant ? [['PRECIO TOTAL', 'ANTICIPO A LA FIRMA', 'RESTO A LA ENTREGA'], [m2(p.total), m2(p.ant), m2(p.resto)], ['100%', Math.round((p.ant / p.total) * 100) + '%', Math.round((p.resto / p.total) * 100) + '%']]
      : [['PRECIO TOTAL', 'PAGO ÚNICO A LA ENTREGA', 'MENSUALIDAD'], [m2(p.total), m2(p.total), p.mens ? m2(p.mens) : '$0.00 — SIN COSTO'], ['100%', '100%', p.mens ? 'MENSUAL' : 'NO APLICA']];
    const pay = new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: pw, rows: payRows.map((r, ri) => new TableRow({ children: r.map((t, i) => cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [R(t, ri === 0 ? { bold: true, color: 'FFFFFF', size: 17 } : ri === 1 ? { bold: true } : { size: 18 })] })], { width: pw[i], borders: cb, shading: ri === 0 ? NAVY : ri === 2 ? GRAY : undefined })) })) });
    const body = [spacer(100),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [R(M.titulo, { bold: true, color: NAVY, size: 32 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [R(M.subtitulo, { color: '666666', size: 17 })] }),
      datos, spacer(160)];
    for (const l of M.lineas) {
      if (l.t === 'banner') body.push(banner(l.v), spacer(80));
      else if (l.t === 'h') body.push(new Paragraph({ keepNext: true, spacing: { before: 200, after: 100 }, children: [R(l.v, { bold: true, color: NAVY, size: 21 })] }));
      else if (l.t === 'p') body.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 160 }, children: runs(l.v) }));
      else if (l.t === 'b') body.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 100 }, children: runs(l.v) }));
      else if (l.t === 'precio') body.push(priceTable, spacer(120), fiscal, spacer(160), pay, spacer(120));
    }
    // firmas (con la firma electrónica si ya firmó)
    const sigLine = (img) => img
      ? new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 0 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' } }, children: [new ImageRun({ type: 'png', data: dataUrlBytes(img), transformation: { width: 180, height: 70 } })] })
      : new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' } }, spacing: { before: 600, after: 0 }, children: [R(' ')] });
    const sigCell = (img, lines, w) => cell([sigLine(img), ...lines.filter(Boolean).map((t, i) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: i === 0 ? 60 : 0 }, children: [R(t, { size: i === 3 ? 14 : 18, bold: i === 0, color: i === 3 ? '0F766E' : undefined })] }))], { width: w });
    const firmado = k.firma ? `Firmado electrónicamente por ${k.firma_nombre || k.cliente} el ${new Date(k.firmado_at).toLocaleString('es-MX')}` : null;
    body.push(spacer(400), new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [5256, 5256], rows: [new TableRow({ cantSplit: true, children: [sigCell(null, ['EL PRESTADOR', M.FIRMA, M.EMP], 5256), sigCell(k.firma, [M.LC, k.cliente, 'Contratante', firmado], 5256)] })] }));
    return new Document({ styles: { default: { document: { run: { font: 'Calibri' } } } }, numbering: { config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] }] },
      sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 864, bottom: 864, left: 864, right: 864 } } }, headers: { default: header }, footers: { default: footer }, children: body }] });
  }

  return { TIPOS, modelo, html, docx, totalLetra, folioTxt, fechaCorta, fechaLarga, m2 };
})();
