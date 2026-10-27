import { useEffect, useState, type MouseEventHandler } from 'react';
import { cargarArchivoEvidencia } from '../../services/incidenciaServices';

interface EvidenciaMediaProps {
  evidenciaId: number;
  tipo: 'foto' | 'video';
  alt: string;
  className: string;
  controls?: boolean;
  muted?: boolean;
  abrirEnlace?: boolean;
  textoEnlace?: string;
  claseEnlace?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export default function EvidenciaMedia({
  evidenciaId,
  tipo,
  alt,
  className,
  controls = false,
  muted = false,
  abrirEnlace = false,
  textoEnlace,
  claseEnlace,
  onClick,
}: EvidenciaMediaProps) {
  const token =
    sessionStorage.getItem('token') ??
    localStorage.getItem('token');
  const [archivoCargado, setArchivoCargado] = useState<{
    evidenciaId: number;
    url: string;
  } | null>(null);
  const [evidenciaConError, setEvidenciaConError] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const controlador = new AbortController();
    let urlTemporal: string | null = null;

    void cargarArchivoEvidencia(evidenciaId, controlador.signal)
      .then((archivo) => {
        if (controlador.signal.aborted) {
          return;
        }

        setEvidenciaConError(null);
        urlTemporal = URL.createObjectURL(archivo);
        setArchivoCargado({ evidenciaId, url: urlTemporal });
      })
      .catch(() => {
        if (!controlador.signal.aborted) {
          setEvidenciaConError(evidenciaId);
        }
      });

    return () => {
      controlador.abort();
      if (urlTemporal) {
        URL.revokeObjectURL(urlTemporal);
      }
    };
  }, [evidenciaId, token]);

  const url =
    archivoCargado?.evidenciaId === evidenciaId
      ? archivoCargado.url
      : null;
  const error = evidenciaConError === evidenciaId;

  const contenido = url
    ? tipo === 'video'
      ? (
          <video
            src={url}
            controls={controls}
            muted={muted}
            playsInline
            className={className}
          />
        )
      : <img src={url} alt={alt} className={className} />
    : null;

  if (abrirEnlace) {
    return (
      <a
        href={url ?? undefined}
        target={url ? '_blank' : undefined}
        rel={url ? 'noopener noreferrer' : undefined}
        onClick={onClick}
        aria-disabled={!url}
        className={claseEnlace}
      >
        {url
          ? (
              <>
                {contenido}
                {textoEnlace && (
                  <span className="mt-2 inline-flex text-sm font-bold text-[#009444] hover:underline dark:text-[#a9d779]">
                    {textoEnlace}
                  </span>
                )}
              </>
            )
          : error
            ? 'Evidencia no disponible'
            : 'Cargando evidencia...'}
      </a>
    );
  }

  if (!contenido) {
    return (
      <div
        className={`${className} flex items-center justify-center text-center text-xs text-slate-500`}
        role={error ? 'status' : undefined}
      >
        {error
          ? 'Evidencia no disponible'
          : 'Cargando evidencia...'}
      </div>
    );
  }

  return contenido;
}
