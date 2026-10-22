import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { describe, test } from 'node:test';

import { Reporte, TipoReporte } from '../models/Reporte';
import { ReporteExportService } from '../modulos/Reportes y Estadisticas/Generar reporte/ReporteExportService';

const obtenerTextoPdf = (buffer: Buffer): string => {
  const pdf = buffer.toString('latin1');
  const textos: string[] = [];
  const expresionStream = /stream\r?\n/g;
  let coincidencia: RegExpExecArray | null;

  while ((coincidencia = expresionStream.exec(pdf)) !== null) {
    const inicio = expresionStream.lastIndex;
    const fin = pdf.indexOf('\nendstream', inicio);
    if (fin < 0) break;

    const inicioObjeto = pdf.lastIndexOf(' obj', coincidencia.index);
    const diccionario = pdf.slice(inicioObjeto, coincidencia.index);
    if (diccionario.includes('/FlateDecode')) {
      const contenido = Buffer.from(
        pdf.slice(inicio, fin).replace(/\r$/, ''),
        'latin1',
      );
      const contenidoDescomprimido = inflateSync(contenido).toString('latin1');
      const fragmentosTexto = Array.from(
        contenidoDescomprimido.matchAll(/<([0-9a-f]+)>/gi),
        ([, hexadecimal]) =>
          hexadecimal
            ? Buffer.from(hexadecimal, 'hex').toString('latin1')
            : '',
      );
      textos.push(fragmentosTexto.join(''));
    }

    expresionStream.lastIndex = fin + '\nendstream'.length;
  }

  return textos.join('\n');
};

const crearReporte = (): Reporte => {
  const reporte = new Reporte({
    numeroReporte: 'REP-TEST-000001',
    tipoReporte: TipoReporte.INCIDENCIAS,
    usuarioGeneroId: 1,
  });
  reporte.fechaGeneracion = new Date('2026-10-19T12:00:00');
  return reporte;
};

describe('exportación PDF de incidencias', () => {
  test('presenta código, estados, coordenadas y período legibles', async () => {
    const estados: Array<[string, string]> = [
      ['pendiente', 'Pendiente'],
      ['en_revision', 'En revisión'],
      ['en_proceso', 'En proceso'],
      ['resuelta', 'Resuelta'],
      ['rechazada', 'Rechazada'],
      ['cerrada', 'Cerrada'],
      ['estado_desconocido', 'estado_desconocido'],
    ];
    const codigos = [
      '#INC-00271026',
      '00011026',
      '00040926',
      '00030926',
      '00020926',
      'INC-00051026',
      '#inc-00061026',
      'folio-7',
    ];
    const detalleIncidencias = codigos.map((codigo, indice) => ({
      codigo,
      estado: estados[indice % estados.length]?.[0] ?? 'estado_desconocido',
      titulo: `Incidencia de prueba ${indice + 1}`,
      latitud: indice === 0 ? 10.150736 : null,
      longitud: indice === 0 ? -85.450005 : null,
    }));
    const exportacion = await new ReporteExportService().exportar(
      crearReporte(),
      {
        fechaInicio: '2026-09-20',
        fechaFin: '2026-10-19',
        totalIncidencias: detalleIncidencias.length,
        detalleIncidencias,
      },
      'pdf',
    );

    assert.equal(exportacion.contentType, 'application/pdf');
    assert.equal(exportacion.buffer.subarray(0, 5).toString(), '%PDF-');
    const textoPdf = obtenerTextoPdf(exportacion.buffer);

    for (const [estado, etiqueta] of estados) {
      assert.ok(textoPdf.includes(etiqueta), `Falta etiqueta de estado: ${etiqueta}`);
    }
    for (const codigo of [
      '#INC-00271026',
      '#INC-00011026',
      '#INC-00040926',
      '#INC-00030926',
      '#INC-00020926',
      '#INC-00051026',
      '#INC-00061026',
      'folio-7',
    ]) {
      assert.ok(textoPdf.includes(codigo), `Falta código presentado: ${codigo}`);
    }
    assert.ok(textoPdf.includes('Código de incidencia'));
    assert.ok(textoPdf.includes('20/09/2026 al 19/10/2026'));
    assert.ok(textoPdf.includes('10.150736'));
    assert.ok(textoPdf.includes('-85.450005'));
    assert.ok(textoPdf.includes('No disponible'));
    assert.ok(!textoPdf.includes('fechaInicio'));
    assert.ok(!textoPdf.includes('fechaFin'));
  });

  test('genera PDF informativo cuando el reporte no tiene incidencias', async () => {
    const exportacion = await new ReporteExportService().exportar(
      crearReporte(),
      { detalleIncidencias: [] },
      'pdf',
    );

    assert.equal(exportacion.buffer.subarray(0, 5).toString(), '%PDF-');
    assert.ok(obtenerTextoPdf(exportacion.buffer).includes('No se encontraron incidencias'));
  });
});
