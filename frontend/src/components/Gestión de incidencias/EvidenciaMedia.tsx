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

interface ArchivoEvidencia {
  evidenciaId: number;
  url: string;
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
  const [archivo, setArchivo] = useState<ArchivoEvidencia | null>(null);
  const [errorId, setErrorId] = useState<number | null>(null);
  const [cargandoId, setCargandoId] = useState<number | null>(evidenciaId);

  useEffect(() => {
    const controlador = new AbortController();
    let activo = true;
    let urlCreada: string | null = null;

    setArchivo(null);
    setErrorId(null);
    setCargandoId(evidenciaId);

    const cargar = async () => {
      try {
        const blob = await cargarArchivoEvidencia(
          evidenciaId,
          controlador.signal,
        );

        if (!activo || controlador.signal.aborted) {
          return;
        }

        const tipoMime = blob.type.toLowerCase();

        const tipoValido =
          tipo === 'foto'
            ? tipoMime.startsWith('image/')
            : tipoMime.startsWith('video/');

        if (!blob.size || !tipoValido) {
          throw new Error(
            'El archivo recibido no corresponde al tipo de evidencia.',
          );
        }

        urlCreada = URL.createObjectURL(blob);

        setArchivo({
          evidenciaId,
          url: urlCreada,
        });
        setCargandoId(null);
      } catch {
        if (!activo || controlador.signal.aborted) {
          return;
        }

        setArchivo(null);
        setErrorId(evidenciaId);
        setCargandoId(null);
      }
    };

    void cargar();

    return () => {
      activo = false;
      controlador.abort();

      if (urlCreada) {
        URL.revokeObjectURL(urlCreada);
      }
    };
  }, [evidenciaId, tipo]);

  const url =
    archivo?.evidenciaId === evidenciaId
      ? archivo.url
      : null;

  const error = errorId === evidenciaId;
  const cargando = cargandoId === evidenciaId;

  const manejarErrorArchivo = () => {
    setErrorId(evidenciaId);
    setArchivo((actual) =>
      actual?.evidenciaId === evidenciaId ? null : actual,
    );
  };

  const contenido = url
    ? tipo === 'video'
      ? (
          <video
            src={url}
            controls={controls}
            muted={muted}
            playsInline
            preload="metadata"
            className={className}
            onError={manejarErrorArchivo}
          />
        )
      : (
          <img
            src={url}
            alt={alt}
            loading="eager"
            decoding="async"
            className={className}
            onError={manejarErrorArchivo}
          />
        )
    : null;

  if (abrirEnlace) {
    return (
      <a
        href={url ?? undefined}
        target={url ? '_blank' : undefined}
        rel={url ? 'noopener noreferrer' : undefined}
        onClick={url ? onClick : undefined}
        aria-disabled={!url}
        className={claseEnlace}
      >
        {contenido}

        {!url && (
          <span
            className="flex min-h-24 items-center justify-center p-3 text-sm text-slate-500"
            role={error ? 'status' : undefined}
          >
            {error
              ? 'Evidencia no disponible'
              : cargando
                ? 'Cargando evidencia...'
                : 'Preparando evidencia...'}
          </span>
        )}

        {url && textoEnlace && (
          <span className="mt-2 inline-flex text-sm font-bold text-[#009444] hover:underline dark:text-[#a9d779]">
            {textoEnlace}
          </span>
        )}
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
          : cargando
            ? 'Cargando evidencia...'
            : 'Preparando evidencia...'}
      </div>
    );
  }

  return contenido;
}
