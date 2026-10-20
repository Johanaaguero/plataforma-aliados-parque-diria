import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

import { Reporte } from '../../../models/Reporte';

export type FormatoExportacion = 'pdf' | 'excel';

export interface ArchivoExportado {
  buffer: Buffer;
  contentType: string;
  extension: 'pdf' | 'xlsx';
}

type Fila = Record<string, unknown>;

const texto = (valor: unknown): string => {
  if (valor === null || valor === undefined || valor === '') return 'No aplica';
  if (typeof valor === 'object') {
    if (Array.isArray(valor)) return `${valor.length} registros`;
    return Object.entries(valor as Record<string, unknown>)
      .map(([clave, dato]) => `${clave}: ${texto(dato)}`)
      .join(' · ');
  }
  return String(valor);
};

const tituloTipo = (tipo: string): string => ({
  usuarios: 'Reporte de usuarios',
  reservas: 'Reporte de reservas',
  emprendimientos: 'Reporte de emprendimientos',
  eventos: 'Reporte de eventos y capacitaciones',
  incidencias: 'Reporte de incidencias',
}[tipo] ?? `Reporte de ${tipo}`);

type Metrica = { etiqueta: string; claves: string[]; estados?: string[] };

const metricasPorTipo: Record<string, Metrica[]> = {
  usuarios: [
    { etiqueta: 'TOTAL USUARIOS', claves: ['total'] },
    { etiqueta: 'ADMINISTRADORES', claves: ['administradores'], estados: ['administrador'] },
    { etiqueta: 'ASOCIADOS', claves: ['asociados'], estados: ['asociado'] },
    { etiqueta: 'VISITANTES', claves: ['visitantes'], estados: ['visitante'] },
    { etiqueta: 'SUPER ADMIN', claves: ['superAdmins', 'superAdministradores', 'superAdmin'], estados: ['super_admin', 'superadmin', 'super_administrador'] },
  ],
  reservas: [
    { etiqueta: 'TOTAL RESERVAS', claves: ['total', 'totalReservas'] },
    { etiqueta: 'PENDIENTES', claves: ['pendientes', 'pendiente'], estados: ['pendiente'] },
    { etiqueta: 'APROBADAS', claves: ['aprobadas', 'confirmadas', 'aprobada', 'confirmada'], estados: ['aprobada', 'aprobado', 'confirmada', 'confirmado'] },
    { etiqueta: 'RECHAZADAS', claves: ['rechazadas', 'rechazada'], estados: ['rechazada', 'rechazado'] },
  ],
  emprendimientos: [
    { etiqueta: 'TOTAL EMPRENDIMIENTOS', claves: ['total', 'totalEmprendimientos'] },
    { etiqueta: 'PUBLICADOS', claves: ['publicados', 'publicado'], estados: ['publicado'] },
    { etiqueta: 'BORRADORES', claves: ['borradores', 'borrador'], estados: ['borrador'] },
    { etiqueta: 'NO PUBLICADOS', claves: ['noPublicados', 'no_publicado'], estados: ['no_publicado'] },
  ],
  eventos: [
    { etiqueta: 'TOTAL ACTIVIDADES', claves: ['total', 'totalActividades'] },
    { etiqueta: 'EVENTOS', claves: ['eventos', 'evento'], estados: ['evento'] },
    { etiqueta: 'CAPACITACIONES', claves: ['capacitaciones', 'capacitacion'], estados: ['capacitacion'] },
    { etiqueta: 'PUBLICADAS', claves: ['publicados', 'publicadas'], estados: ['publicado', 'publicada'] },
  ],
  incidencias: [
    { etiqueta: 'TOTAL INCIDENCIAS', claves: ['total', 'totalIncidencias'] },
    { etiqueta: 'PENDIENTES', claves: ['pendientes', 'pendiente'], estados: ['pendiente'] },
    { etiqueta: 'EN PROCESO', claves: ['enProceso', 'en_proceso', 'proceso'], estados: ['en_proceso', 'enproceso'] },
    { etiqueta: 'RESUELTAS', claves: ['resueltas', 'resuelta'], estados: ['resuelta', 'resuelto'] },
  ],
};

const normalizar = (valor: unknown): string =>
  String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
    .trim();

const CONTENEDORES_METRICAS = ['resumen', 'estadisticas', 'totales', 'porEstado', 'informacionGeneral'];

const buscarClave = (contenido: Record<string, unknown>, claves: string[]): unknown => {
  const niveles = [
    contenido,
    ...CONTENEDORES_METRICAS.map((contenedor) => contenido[contenedor]).filter(esObjeto),
  ];
  for (const nivel of niveles) {
    for (const clave of claves) {
      if (nivel[clave] !== undefined && nivel[clave] !== null) return nivel[clave];
    }
  }
  return undefined;
};

const metricasDelReporte = (tipo: string, contenido: Record<string, unknown>): Array<[string, unknown]> => {
  const filas = filasDeContenido(contenido);
  return (metricasPorTipo[tipo] ?? []).map(({ etiqueta, claves, estados }): [string, unknown] => {
    const directo = buscarClave(contenido, claves);
    if (directo !== undefined) return [etiqueta, directo];
    if (estados) {
      return [
        etiqueta,
        filas.filter((fila) =>
          [fila.estado, fila.tipo, fila.tipoActividad, fila.rol].some((valor) => estados.includes(normalizar(valor))),
        ).length,
      ];
    }
    return [etiqueta, filas.length];
  });
};

const fechaLegible = (valor: unknown): string | null => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return null;

  const [anio, mes, dia] = valor.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
};

const fechaHoraCostaRica = (valor: unknown): string => {
  const fecha = valor instanceof Date
    ? valor
    : typeof valor === 'string'
      ? new Date(valor)
      : null;

  if (!fecha || Number.isNaN(fecha.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(fecha);
};

const periodoLegible = (contenido: Record<string, unknown>): string => {
  if (typeof contenido.periodoTexto === 'string' && contenido.periodoTexto.trim()) {
    return contenido.periodoTexto;
  }

  const periodo = contenido.periodo;
  const rango = periodo && typeof periodo === 'object' && !Array.isArray(periodo)
    ? periodo as Record<string, unknown>
    : {};
  const inicio = fechaLegible(contenido.fechaInicio ?? rango.fechaInicio);
  const fin = fechaLegible(contenido.fechaFin ?? rango.fechaFin);

  if (inicio && fin) return `Desde: ${inicio}  Hasta: ${fin}`;
  if (inicio) return `Desde: ${inicio}`;
  if (fin) return `Hasta: ${fin}`;
  return 'Histórico Completo (Todas las fechas)';
};

const periodoEventosLegible = (contenido: Record<string, unknown>): string => {
  if (typeof contenido.periodoTexto === 'string' && contenido.periodoTexto.trim()) {
    return contenido.periodoTexto;
  }

  const periodo = contenido.periodo;
  const rango = periodo && typeof periodo === 'object' && !Array.isArray(periodo)
    ? periodo as Record<string, unknown>
    : {};
  const inicio = fechaLegible(contenido.fechaInicio ?? rango.fechaInicio);
  const fin = fechaLegible(contenido.fechaFin ?? rango.fechaFin);

  if (inicio && fin) return `${inicio} - ${fin}`;
  if (inicio) return `Desde: ${inicio}`;
  if (fin) return `Hasta: ${fin}`;
  return 'Todas las fechas';
};

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const filtrosPdfLegibles = (
  tipo: string,
  contenido: Record<string, unknown>,
): Array<[string, string]> | null => {
  if (tipo !== 'eventos' && tipo !== 'emprendimientos') return null;

  const informacionGeneral = esObjeto(contenido.informacionGeneral)
    ? contenido.informacionGeneral
    : {};
  const filtros = esObjeto(contenido.filtros)
    ? contenido.filtros
    : esObjeto(informacionGeneral.filtros)
      ? informacionGeneral.filtros
      : {};
  const periodo = contenido.periodo;
  const rango = esObjeto(periodo) ? periodo : {};
  const fechaInicio = contenido.fechaInicio ?? filtros.fechaInicio ?? rango.fechaInicio;
  const fechaFin = contenido.fechaFin ?? filtros.fechaFin ?? rango.fechaFin;
  const filas: Array<[string, string]> = [];

  if (tipo === 'eventos') {
    const inicio = fechaLegible(fechaInicio);
    const fin = fechaLegible(fechaFin);
    const periodoValor = inicio || fin
      ? periodoEventosLegible(contenido)
      : 'Todas las fechas';
    filas.push(['Período', periodoValor]);
  } else {
    const nombresPeriodo: Record<string, string> = {
      hoy: 'Hoy',
      '7dias': 'Últimos 7 días',
      '30dias': 'Últimos 30 días',
      mes: 'Este mes',
      personalizado: 'Personalizado',
    };
    const periodoNombre = typeof periodo === 'string'
      ? nombresPeriodo[periodo] ?? periodo
      : esObjeto(periodo)
        ? periodoEventosLegible(contenido)
        : '';
    if (periodoNombre) filas.push(['Período', periodoNombre]);

    if (periodo === 'personalizado') {
      const inicio = fechaLegible(fechaInicio);
      const fin = fechaLegible(fechaFin);
      if (inicio) filas.push(['Fecha de inicio', inicio]);
      if (fin) filas.push(['Fecha de fin', fin]);
    }

    const emprendimientoId = filtros.emprendimientoId ?? contenido.emprendimientoId;
    const categoriaId = filtros.categoriaId ?? contenido.categoriaId;
    if (emprendimientoId !== null && emprendimientoId !== undefined && emprendimientoId !== '') {
      filas.push(['Emprendimiento (ID)', String(emprendimientoId)]);
    }
    if (categoriaId !== null && categoriaId !== undefined && categoriaId !== '') {
      filas.push(['Categoría (ID)', String(categoriaId)]);
    }
  }

  if (tipo === 'eventos') {
    const temporada = filtros.temporada;
    if (temporada === 'seca' || temporada === 'lluviosa') {
      filas.push(['Temporada', temporada === 'seca' ? 'Temporada seca' : 'Temporada lluviosa']);
    }

    const tipoActividad = filtros.tipoActividad;
    if (tipoActividad === 'evento' || tipoActividad === 'capacitacion') {
      filas.push(['Tipo de actividad', tipoActividad === 'evento' ? 'Evento' : 'Capacitación']);
    }
  }

  return filas;
};

const filasDeContenido = (contenido: Record<string, unknown>): Fila[] => {
  const coleccionesPreferidas = [
    'detalleActividades',
    'detalleReservas',
    'detalleIncidencias',
    'usuarios',
    'reservas',
    'incidencias',
  ];
  const preferida = coleccionesPreferidas
    .map((clave) => contenido[clave])
    .find((valor): valor is Fila[] =>
      Array.isArray(valor) && valor.every((fila) => typeof fila === 'object' && fila !== null),
    );

  if (preferida) return preferida;

  const coleccion = Object.values(contenido).find((valor): valor is Fila[] =>
    Array.isArray(valor) && valor.every((fila) => typeof fila === 'object' && fila !== null),
  );
  return coleccion ?? [];
};

const resumen = (contenido: Record<string, unknown>): Array<[string, string]> =>
  Object.entries(contenido)
    .filter(([, valor]) => !Array.isArray(valor) && typeof valor !== 'object')
    .map(([clave, valor]) => [clave, texto(valor)]);

export class ReporteExportService {
  async exportar(reporte: Reporte, contenido: Record<string, unknown> | null, formato: FormatoExportacion): Promise<ArchivoExportado> {
    if (!contenido || Object.keys(contenido).length === 0) {
      throw new Error('El reporte no contiene datos para exportar. Genere y guarde el reporte nuevamente.');
    }

    return formato === 'pdf'
      ? this.generarPdf(reporte, contenido)
      : this.generarExcel(reporte, contenido);
  }

  private generarPdf(reporte: Reporte, contenido: Record<string, unknown>): Promise<ArchivoExportado> {
    return new Promise((resolve, reject) => {
      const documento = new PDFDocument({ margin: 42, size: 'A4', bufferPages: true });
      const partes: Buffer[] = [];
      documento.on('data', (parte: Buffer) => partes.push(parte));
      documento.on('error', reject);
      documento.on('end', () => resolve({ buffer: Buffer.concat(partes), contentType: 'application/pdf', extension: 'pdf' }));

      const ancho = documento.page.width - 84;
      documento.rect(0, 0, documento.page.width, 122).fill('#064e3b');
      documento.fillColor('#ffffff').font('Helvetica-Bold').fontSize(19)
        .text('Plataforma SIGTAD', 42, 33);
      documento.font('Helvetica').fontSize(10).fillColor('#d1fae5')
        .text('Parque Nacional Diría · Reporte Estadístico', 42, 58);
      documento.rect(42, 52, 280, 16).fill('#064e3b');
      documento.font('Helvetica').fontSize(10).fillColor('#d1fae5')
        .text('Parque Nacional Diriá · Reporte Estadístico', 42, 58);
      documento.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff')
        .text(contenido.nombre ? texto(contenido.nombre) : tituloTipo(reporte.tipoReporte), 42, 82);
      documento.font('Helvetica').fontSize(8).fillColor('#d1fae5')
        .text(`Fecha de generación  ${reporte.fechaGeneracion.toLocaleString('es-CR')}`, 330, 38, { width: 224, align: 'right' })
        .text(`TIPO  ${reporte.tipoReporte.toUpperCase()}`, 370, 53, { width: 184, align: 'right' })
        .text(`RANGO  ${reporte.tipoReporte === 'eventos' ? periodoEventosLegible(contenido) : periodoLegible(contenido)}`, 370, 68, { width: 184, align: 'right' });
      documento.rect(330, 34, 224, 14).fill('#064e3b');
      documento.font('Helvetica').fontSize(8).fillColor('#d1fae5')
        .text(`Fecha de generación  ${reporte.fechaGeneracion.toLocaleString('es-CR')}`, 330, 38, { width: 224, align: 'right' });

      documento.y = 146;
      documento.font('Helvetica-Bold').fontSize(11).fillColor('#064e3b').text('Resumen del reporte');
      const metricas = metricasDelReporte(reporte.tipoReporte, contenido);
      const tarjetasMuchas = metricas.length > 4;
      const anchoTarjeta = tarjetasMuchas ? (ancho - 8 * (metricas.length - 1)) / metricas.length : 116;
      const pasoTarjeta = tarjetasMuchas ? anchoTarjeta + 8 : 128;
      metricas.forEach(([etiqueta, valor], indice) => {
        const x = 42 + indice * pasoTarjeta;
        documento.roundedRect(x, 169, anchoTarjeta, 66, 9).fill('#ecfdf5');
        documento.roundedRect(x, 169, anchoTarjeta, 66, 9).lineWidth(1).strokeColor('#a7f3d0').stroke();
        documento.font('Helvetica-Bold').fontSize(7).fillColor('#047857').text(etiqueta, x + 11, 181, { width: anchoTarjeta - 22 });
        documento.fontSize(22).fillColor('#064e3b').text(texto(valor ?? 0), x + 11, 198, { width: anchoTarjeta - 22 });
      });

      documento.font('Helvetica-Bold').fontSize(11).fillColor('#064e3b').text('Filtros aplicados', 42, 255);
      const filtrosLegibles = filtrosPdfLegibles(reporte.tipoReporte, contenido);
      let inicioTabla = 305;
      if (filtrosLegibles) {
        const filasFiltros = Math.ceil(filtrosLegibles.length / 2);
        filtrosLegibles.forEach(([etiqueta, valor], indice) => {
          const columna = indice % 2;
          const fila = Math.floor(indice / 2);
          const x = columna === 0 ? 42 : 310;
          const y = 272 + fila * 16;
          const anchoColumna = columna === 0 ? 250 : 244;
          documento.font('Helvetica-Bold').fontSize(8).fillColor('#334155')
            .text(`${etiqueta}:`, x, y, { lineBreak: false });
          const anchoEtiqueta = documento.widthOfString(`${etiqueta}: `);
          documento.font('Helvetica').fontSize(8).fillColor('#475569')
            .text(valor, x + anchoEtiqueta, y, { width: anchoColumna - anchoEtiqueta, lineBreak: false });
        });
        inicioTabla = Math.max(inicioTabla, 272 + filasFiltros * 16 + 22);
      } else {
        documento.font('Helvetica').fontSize(8).fillColor('#475569')
          .text(`Período: ${periodoLegible(contenido)}`, 42, 272, { width: ancho });
      }
      const emprendimientos = contenido.emprendimientos;
      const filas = reporte.tipoReporte === 'emprendimientos'
        ? Array.isArray(emprendimientos) &&
          emprendimientos.every((fila): fila is Fila =>
            typeof fila === 'object' && fila !== null,
          )
          ? emprendimientos
          : []
        : filasDeContenido(contenido);
      if (filas.length > 0) {
        const columnasDetalle = Object.keys(filas[0] ?? {})
          .filter((columna) =>
            reporte.tipoReporte !== 'emprendimientos' ||
            columna.toLowerCase() !== 'id',
          )
          .slice(0, 5);
        const columnas = reporte.tipoReporte === 'eventos' &&
          filas.some((fila) => 'temporada' in fila) &&
          !columnasDetalle.includes('temporada')
          ? [...columnasDetalle, 'temporada']
          : columnasDetalle;
        const etiquetas = columnas.map((columna) => columna.replace(/([A-Z])/g, ' $1').toUpperCase());
        const anchoColumna = ancho / columnas.length;
        documento.font('Helvetica-Bold').fontSize(11).fillColor('#064e3b').text('Datos detallados', 42, inicioTabla - 22);
        documento.rect(42, inicioTabla, ancho, 25).fill('#047857');
        etiquetas.forEach((etiqueta, indice) => documento.fontSize(7).fillColor('#ffffff')
          .text(etiqueta, 48 + indice * anchoColumna, inicioTabla + 9, { width: anchoColumna - 10 }));
        let y = inicioTabla + 25;
        filas.slice(0, 18).forEach((fila, indice) => {
          documento.rect(42, y, ancho, 24).fill(indice % 2 === 0 ? '#ffffff' : '#f9fafb');
          documento.moveTo(42, y + 24).lineTo(42 + ancho, y + 24).strokeColor('#e5e7eb').stroke();
          columnas.forEach((columna, columnaIndice) => {
            const valor = reporte.tipoReporte === 'emprendimientos' &&
              columna === 'fechaCreacion'
              ? fechaHoraCostaRica(fila[columna])
              : texto(fila[columna]);
            const x = 48 + columnaIndice * anchoColumna;
            if (reporte.tipoReporte === 'emprendimientos' && columna === 'estado') {
              const estado = fila[columna];
              const etiquetasEstado: Record<string, { texto: string; fondo: string; color: string }> = {
                publicado: { texto: 'Publicado', fondo: '#dcfce7', color: '#166534' },
                no_publicado: { texto: 'No publicado', fondo: '#fef3c7', color: '#92400e' },
              };
              const presentacion = typeof estado === 'string'
                ? etiquetasEstado[estado]
                : undefined;
              if (presentacion) {
                documento.roundedRect(x, y + 6, Math.min(anchoColumna - 10, 72), 12, 6)
                  .fill(presentacion.fondo);
                documento.font('Helvetica-Bold').fontSize(6).fillColor(presentacion.color)
                  .text(presentacion.texto, x + 5, y + 9, { width: 62 });
              } else {
                documento.font('Helvetica').fontSize(7).fillColor('#334155')
                  .text(valor, x, y + 9, { width: anchoColumna - 10, ellipsis: true });
              }
            } else if (columna === 'temporada' && reporte.tipoReporte === 'eventos' && (valor === 'seca' || valor === 'lluviosa')) {
              const color = valor === 'seca' ? '#f59e0b' : '#0ea5e9';
              if (valor === 'seca') {
                documento.fillColor(color).circle(x + 5, y + 12, 2.5).fill();
                documento.strokeColor(color).lineWidth(0.8);
                for (let rayo = 0; rayo < 8; rayo += 1) {
                  const angulo = (rayo * Math.PI) / 4;
                  documento.moveTo(x + 5 + Math.cos(angulo) * 4, y + 12 + Math.sin(angulo) * 4)
                    .lineTo(x + 5 + Math.cos(angulo) * 5.5, y + 12 + Math.sin(angulo) * 5.5)
                    .stroke();
                }
              } else {
                documento.fillColor(color)
                  .moveTo(x + 5, y + 5)
                  .bezierCurveTo(x + 3.5, y + 7.5, x + 1.5, y + 10, x + 1.5, y + 12)
                  .bezierCurveTo(x + 1.5, y + 14.2, x + 3.1, y + 16, x + 5, y + 16)
                  .bezierCurveTo(x + 6.9, y + 16, x + 8.5, y + 14.2, x + 8.5, y + 12)
                  .bezierCurveTo(x + 8.5, y + 10, x + 6.5, y + 7.5, x + 5, y + 5)
                  .fill();
              }
              documento.font('Helvetica').fontSize(7).fillColor('#334155')
                .text(valor, x + 14, y + 9, { width: anchoColumna - 24, ellipsis: true });
            } else if (columna.toLowerCase() === 'rol') {
              const color = valor === 'administrador' ? '#047857' : valor === 'super_admin' ? '#d97706' : valor === 'asociado' ? '#2563eb' : '#7c3aed';
              documento.roundedRect(x, y + 6, Math.min(anchoColumna - 10, 58), 12, 6).fill(color);
              documento.font('Helvetica-Bold').fontSize(6).fillColor('#ffffff').text(valor === 'super_admin' ? 'SUPER ADMIN' : valor.toUpperCase(), x + 5, y + 9, { width: 48 });
            } else {
              documento.font('Helvetica').fontSize(7).fillColor('#334155').text(valor, x, y + 9, { width: anchoColumna - 10, ellipsis: true });
            }
          });
          y += 24;
        });
      }
      const paginas = documento.bufferedPageRange();
      for (let pagina = 0; pagina < paginas.count; pagina += 1) {
        documento.switchToPage(pagina);
        documento.moveTo(42, 795).lineTo(553, 795).strokeColor('#a7f3d0').stroke();
        documento.font('Helvetica').fontSize(7).fillColor('#64748b')
          .text(`Documento generado automáticamente por la Plataforma Web Aliados Parque Nacional Diría - Página ${pagina + 1} de ${paginas.count}`, 42, 803, { width: ancho, align: 'center' });
      }
      documento.end();
    });
  }

private async generarExcel(reporte: Reporte, contenido: Record<string, unknown>): Promise<ArchivoExportado> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Reporte', {
    views: [{ showGridLines: false }],
  });

  const verdeOscuro = 'FF064E3B';
  const verde = 'FF047857';
  const verdeClaro = 'FFECFDF5';
  const borde = { style: 'thin' as const, color: { argb: 'FFE5E7EB' } };

  const ultimaColumna = 6;

  // Título
  hoja.mergeCells(1, 1, 1, ultimaColumna);
  const titulo = hoja.getCell('A1');
  titulo.value = contenido.nombre ? texto(contenido.nombre) : tituloTipo(reporte.tipoReporte);
  titulo.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: verdeOscuro } };
  titulo.alignment = { vertical: 'middle', indent: 1 };
  hoja.getRow(1).height = 30;

  // Datos generales
  const datosGenerales: Array<[string, string]> = [
    ['Tipo', reporte.tipoReporte.toUpperCase()],
    ['Fecha de generación', fechaHoraCostaRica(reporte.fechaGeneracion)],
    ['Rango', reporte.tipoReporte === 'eventos' ? periodoEventosLegible(contenido) : periodoLegible(contenido)],
  ];
  datosGenerales.forEach(([etiqueta, valor], i) => {
    const fila = hoja.getRow(3 + i);
    fila.getCell(1).value = etiqueta;
    fila.getCell(1).font = { bold: true, color: { argb: 'FF334155' } };
    fila.getCell(2).value = valor;
  });

  // Resumen (mismas métricas que el PDF)
  let filaActual = 7;
  hoja.getCell(filaActual, 1).value = 'Resumen del reporte';
  hoja.getCell(filaActual, 1).font = { bold: true, size: 12, color: { argb: verdeOscuro } };
  filaActual += 1;

  metricasDelReporte(reporte.tipoReporte, contenido).forEach(([etiqueta, valor]) => {
    const celdaEtiqueta = hoja.getCell(filaActual, 1);
    const celdaValor = hoja.getCell(filaActual, 2);
    celdaEtiqueta.value = etiqueta;
    celdaEtiqueta.font = { bold: true, color: { argb: 'FF047857' } };
    celdaEtiqueta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: verdeClaro } };
    celdaValor.value = typeof valor === 'number' ? valor : Number(valor) || texto(valor);
    celdaValor.font = { bold: true, color: { argb: verdeOscuro } };
    celdaValor.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: verdeClaro } };
    celdaValor.alignment = { horizontal: 'left' };
    filaActual += 1;
  });

  // Tabla de detalle
  const filas = reporte.tipoReporte === 'emprendimientos' && Array.isArray(contenido.emprendimientos)
    ? (contenido.emprendimientos as Fila[])
    : filasDeContenido(contenido);

  if (filas.length > 0) {
    filaActual += 1;
    hoja.getCell(filaActual, 1).value = 'Datos detallados';
    hoja.getCell(filaActual, 1).font = { bold: true, size: 12, color: { argb: verdeOscuro } };
    filaActual += 1;

    const columnas = Object.keys(filas[0] ?? {});
    const filaEncabezado = hoja.getRow(filaActual);
    columnas.forEach((columna, i) => {
      const celda = filaEncabezado.getCell(i + 1);
      celda.value = columna.replace(/([A-Z])/g, ' $1').toUpperCase();
      celda.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: verde } };
      celda.alignment = { vertical: 'middle' };
    });
    filaEncabezado.height = 22;
    const filaEncabezadoNumero = filaActual;
    filaActual += 1;

    filas.forEach((fila, indice) => {
      const filaExcel = hoja.getRow(filaActual);
      columnas.forEach((columna, i) => {
        const valor = fila[columna];
        const celda = filaExcel.getCell(i + 1);
        const esFecha = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor);
        celda.value = esFecha
          ? fechaHoraCostaRica(valor)
          : columna === 'rol' && valor === 'super_admin'
            ? 'super administrador'
            : (typeof valor === 'number' ? valor : texto(valor));
        celda.alignment = { vertical: 'middle', horizontal: 'left' };
        celda.border = { bottom: borde };
        if (indice % 2 === 1) {
          celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
      });
      filaActual += 1;
    });

    hoja.autoFilter = {
      from: { row: filaEncabezadoNumero, column: 1 },
      to: { row: filaEncabezadoNumero, column: columnas.length },
    };

    // Ancho según el contenido
    columnas.forEach((columna, i) => {
      const mayor = Math.max(
        columna.length + 2,
        ...filas.map((fila) => {
          const v = fila[columna];
          return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? 22 : texto(v).length;
        }),
      );
      hoja.getColumn(i + 1).width = Math.min(Math.max(mayor + 2, 14), 40);
    });
  } else {
    hoja.getColumn(1).width = 26;
    hoja.getColumn(2).width = 28;
  }

  const datos = await libro.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(datos),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
  };
}
}