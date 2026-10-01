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
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
};

const tituloTipo = (tipo: string): string => `Reporte de ${tipo}`;

const filasDeContenido = (contenido: Record<string, unknown>): Fila[] => {
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
      documento.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff')
        .text(contenido.nombre ? texto(contenido.nombre) : tituloTipo(reporte.tipoReporte), 42, 82);
      documento.font('Helvetica').fontSize(8).fillColor('#d1fae5')
        .text(`EMISIÓN  ${reporte.fechaGeneracion.toLocaleString('es-CR')}`, 370, 38, { width: 184, align: 'right' })
        .text(`TIPO  ${reporte.tipoReporte.toUpperCase()}`, 370, 53, { width: 184, align: 'right' })
        .text(`RANGO  ${texto(contenido.periodoTexto ?? contenido.periodo)}`, 370, 68, { width: 184, align: 'right' });

      documento.y = 146;
      documento.font('Helvetica-Bold').fontSize(11).fillColor('#064e3b').text('Resumen del reporte');
      const metricas: Array<[string, unknown]> = [
        ['TOTAL USUARIOS', contenido.total],
        ['ADMINISTRADORES', contenido.administradores],
        ['ASOCIADOS', contenido.asociados],
        ['VISITANTES', contenido.visitantes],
      ];
      metricas.forEach(([etiqueta, valor], indice) => {
        const x = 42 + indice * 128;
        documento.roundedRect(x, 169, 116, 66, 9).fill('#ecfdf5');
        documento.roundedRect(x, 169, 116, 66, 9).lineWidth(1).strokeColor('#a7f3d0').stroke();
        documento.font('Helvetica-Bold').fontSize(7).fillColor('#047857').text(etiqueta, x + 11, 181, { width: 94 });
        documento.fontSize(22).fillColor('#064e3b').text(texto(valor ?? 0), x + 11, 198, { width: 94 });
      });

      documento.font('Helvetica-Bold').fontSize(11).fillColor('#064e3b').text('Filtros aplicados', 42, 255);
      const filtros = Object.entries(contenido).filter(([clave, valor]) =>
        ['periodo', 'periodoTexto', 'fechaInicio', 'fechaFin'].includes(clave) && !Array.isArray(valor),
      );
      documento.font('Helvetica').fontSize(8).fillColor('#475569')
        .text(filtros.map(([clave, valor]) => `${clave}: ${texto(valor)}`).join('   ·   ') || 'Sin filtros adicionales', 42, 272, { width: ancho });
      const filas = filasDeContenido(contenido);
      if (filas.length > 0) {
        const columnas = Object.keys(filas[0] ?? {}).slice(0, 5);
        const etiquetas = columnas.map((columna) => columna.replace(/([A-Z])/g, ' $1').toUpperCase());
        const inicioTabla = 305;
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
            const valor = texto(fila[columna]);
            const x = 48 + columnaIndice * anchoColumna;
            if (columna.toLowerCase() === 'rol') {
              const color = valor === 'administrador' ? '#047857' : valor === 'asociado' ? '#2563eb' : '#7c3aed';
              documento.roundedRect(x, y + 6, Math.min(anchoColumna - 10, 58), 12, 6).fill(color);
              documento.font('Helvetica-Bold').fontSize(6).fillColor('#ffffff').text(valor.toUpperCase(), x + 5, y + 9, { width: 48 });
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
    const hoja = libro.addWorksheet('Reporte');
    hoja.addRow([contenido.nombre ? texto(contenido.nombre) : tituloTipo(reporte.tipoReporte)]);
    hoja.addRow(['Tipo', reporte.tipoReporte, 'Fecha de creación', reporte.fechaGeneracion.toLocaleString('es-CR')]);
    hoja.addRow([]);
    hoja.addRow(['Resumen']);
    resumen(contenido).forEach(([clave, valor]) => hoja.addRow([clave, valor]));
    const filas = filasDeContenido(contenido);
    if (filas.length > 0) {
      hoja.addRow([]);
      const columnas = Object.keys(filas[0] ?? {});
      hoja.addRow(columnas);
      filas.forEach((fila) => hoja.addRow(columnas.map((columna) => texto(fila[columna]))));
    }
    hoja.columns.forEach((columna) => { columna.width = 22; });
    const datos = await libro.xlsx.writeBuffer();
    return { buffer: Buffer.from(datos), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' };
  }
}
