import { useState } from 'react';
import { descargarArchivo, exportarReporte } from '../../services/reportesApi';

type FormatoExportacion = 'pdf' | 'excel';

interface BotonesExportarReporteProps {
  reporteId: number | null;
  nombreReporte: string;
  tieneDatos: boolean;
}

const normalizarNombre = (valor: string): string =>
  valor
    .trim()
    .replace(/[^a-zA-Z0-9áéíóúñü]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'Reporte';

export default function BotonesExportarReporte({
  reporteId,
  nombreReporte,
}: BotonesExportarReporteProps) {
  const [isExporting, setIsExporting] = useState<FormatoExportacion | null>(null);
  const [exportado, setExportado] = useState<FormatoExportacion | null>(null);
  const [error, setError] = useState('');

  if (!reporteId) return null;

  const exportar = async (formato: FormatoExportacion): Promise<void> => {
    if (isExporting) return;
    setIsExporting(formato);
    setError('');
    try {
      const archivo = await exportarReporte(reporteId, formato);
      const extension = formato === 'pdf' ? 'pdf' : 'xlsx';
      const fecha = new Date().toISOString().slice(0, 10);
      descargarArchivo(
        archivo,
        `Reporte_${normalizarNombre(nombreReporte)}_${fecha}.${extension}`,
      );
      setExportado(formato);
      window.setTimeout(() => setExportado(null), 2500);
    } catch (errorSolicitud) {
      console.error('Error al exportar reporte:', errorSolicitud);
      setError(
        errorSolicitud instanceof Error
          ? errorSolicitud.message
          : 'No fue posible exportar el reporte.',
      );
      setExportado(null);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      <button
        type="button"
        disabled={isExporting !== null}
        onClick={() => exportar('pdf')}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-2.5 text-xs font-bold text-red-700 shadow-sm backdrop-blur-md transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
      >
        {isExporting === 'pdf' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {isExporting === 'pdf' ? 'Exportando...' : exportado === 'pdf' ? 'Exportado ✓' : 'Exportar PDF'}
      </button>
      <button
        type="button"
        disabled={isExporting !== null}
        onClick={() => exportar('excel')}
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur-md transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
      >
        {isExporting === 'excel' && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {isExporting === 'excel' ? 'Exportando...' : exportado === 'excel' ? 'Exportado ✓' : 'Exportar Excel'}
      </button>
      {error && <p className="basis-full text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
    </div>
  );
}
