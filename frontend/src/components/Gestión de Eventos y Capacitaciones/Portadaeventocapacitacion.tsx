import { useEffect, useState } from 'react';

interface ImagenMeta {
  id: number;
  tipoMime: string;
  nombreArchivo?: string | null;
  tamanoBytes?: number | null;
  fechaCreacion?: string;
  eventoCapacitacionId?: number;
}

interface PortadaEventoCapacitacionProps {
  eventoId: number;
  urlBaseApi: string;
  colorAcento?: string;
}

export default function PortadaEventoCapacitacion({
  eventoId,
  urlBaseApi,
  colorAcento = '#095540',
}: PortadaEventoCapacitacionProps) {
  const [imagenes, setImagenes] = useState<ImagenMeta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [imagenActual, setImagenActual] = useState(0);

  useEffect(() => {
    let cancelado = false;

    async function cargarImagenes() {
      try {
        setCargando(true);

        const respuesta = await fetch(
          `${urlBaseApi}/api/eventos-capacitaciones/${eventoId}/imagenes`,
          {
            headers: {
              Accept: 'application/json',
            },
          },
        );

        if (!respuesta.ok) {
          throw new Error('No se pudieron obtener las imágenes');
        }

        const datos = (await respuesta.json()) as ImagenMeta[];

        if (!cancelado) {
          setImagenes(datos);
          setImagenActual(0);
        }
      } catch (error) {
        console.error('Error cargando imágenes:', error);

        if (!cancelado) {
          setImagenes([]);
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    cargarImagenes();

    return () => {
      cancelado = true;
    };
  }, [eventoId, urlBaseApi]);

  const obtenerUrlImagen = (imagenId: number) => {
    return `${urlBaseApi}/api/eventos-capacitaciones/imagenes/${imagenId}`;
  };

  const siguienteImagen = () => {
    if (imagenes.length <= 1) return;

    setImagenActual((actual) =>
      actual === imagenes.length - 1 ? 0 : actual + 1,
    );
  };

  const anteriorImagen = () => {
    if (imagenes.length <= 1) return;

    setImagenActual((actual) =>
      actual === 0 ? imagenes.length - 1 : actual - 1,
    );
  };

  if (cargando) {
    return (
      <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-slate-200/60">
        <div className="absolute inset-0 animate-pulse bg-white/30" />
      </div>
    );
  }

  if (imagenes.length === 0) {
    return (
      <div className="flex h-44 w-full items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-50/60 p-6 text-center">
        <p className="text-xs font-medium text-slate-400">
          Sin fotografías disponibles
        </p>
      </div>
    );
  }

  const imagenSeleccionada = imagenes[imagenActual];

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">

      {/* =====================================================
          FOTO PRINCIPAL
          ===================================================== */}
      <div className="group relative h-44 w-full overflow-hidden bg-slate-100">

        <img
          src={obtenerUrlImagen(imagenSeleccionada.id)}
          alt={
            imagenSeleccionada.nombreArchivo ??
            `Fotografía ${imagenActual + 1}`
          }
          loading="lazy"
          decoding="async"
          className="h-full w-full rounded-2xl object-cover"
        />

        {/* Degradado sutil */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"
          aria-hidden="true"
        />

        {/* Contador */}
        <div className="absolute right-3.5 top-3.5">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur-xl">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="3"
              />
              <circle
                cx="8.5"
                cy="8.5"
                r="1.5"
              />
              <path d="M21 15l-5-5L5 21" />
            </svg>

            {imagenActual + 1} / {imagenes.length}
          </div>
        </div>

        {/* Texto inferior */}
        <div className="pointer-events-none absolute bottom-3.5 left-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/65">
            Fotografías
          </p>

          <p className="mt-0.5 text-xs font-semibold text-white">
            {imagenes.length}{' '}
            {imagenes.length === 1 ? 'fotografía' : 'fotografías'}
          </p>
        </div>

        {/* Flecha izquierda sobre imagen */}
        {imagenes.length > 1 && (
          <button
            type="button"
            onClick={anteriorImagen}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white/90 opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 hover:bg-black/40 focus-visible:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Fotografía anterior"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M15 18l-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {/* Flecha derecha sobre imagen */}
        {imagenes.length > 1 && (
          <button
            type="button"
            onClick={siguienteImagen}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white/90 opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 hover:bg-black/40 focus-visible:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Fotografía siguiente"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M9 18l6-6-6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* =====================================================
          CARRUSEL DE MINIATURAS
          ===================================================== */}
      {imagenes.length > 1 && (
        <div className="border-t border-slate-200/70 bg-white px-3 py-3">

          <div className="flex items-center gap-2">

            {/* Botón anterior */}
            <button
              type="button"
              onClick={anteriorImagen}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-200 hover:border-[#095540]/30 hover:bg-[#095540]/5 hover:text-[#095540] focus:outline-none focus:ring-2 focus:ring-[#8DC63F]/40"
              aria-label="Fotografía anterior"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M15 18l-6-6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Miniaturas */}
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin">

                {imagenes.map((imagen, indice) => {
                  const seleccionada = indice === imagenActual;

                  return (
                    <button
                      key={imagen.id}
                      type="button"
                      onClick={() => setImagenActual(indice)}
                      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 outline-none ${
                        seleccionada
                          ? 'opacity-100 shadow-sm'
                          : 'border-transparent opacity-50 hover:opacity-90'
                      }`}
                      style={
                        seleccionada
                          ? {
                              borderColor: colorAcento,
                            }
                          : undefined
                      }
                      aria-label={`Mostrar fotografía ${indice + 1}`}
                      aria-current={
                        seleccionada ? 'true' : undefined
                      }
                    >
                      <img
                        src={obtenerUrlImagen(imagen.id)}
                        alt=""
                        className="h-full w-full object-cover"
                      />

                      {/* Número */}
                      <span
                        className={`absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[8px] font-semibold text-white backdrop-blur-sm ${
                          seleccionada ? 'opacity-100' : 'opacity-80'
                        }`}
                      >
                        {indice + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Botón siguiente */}
            <button
              type="button"
              onClick={siguienteImagen}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-200 hover:border-[#095540]/30 hover:bg-[#095540]/5 hover:text-[#095540] focus:outline-none focus:ring-2 focus:ring-[#8DC63F]/40"
              aria-label="Fotografía siguiente"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M9 18l6-6-6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

          </div>

          {/* Indicador inferior */}
          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: colorAcento,
              }}
            />

            <span className="text-[9px] font-medium text-slate-400">
              {imagenActual + 1} de {imagenes.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
