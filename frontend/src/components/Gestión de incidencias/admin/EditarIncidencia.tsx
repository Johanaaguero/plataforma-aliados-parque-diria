import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ReactNode } from 'react';

import type {
  CategoriaIncidencia,
  EstadoIncidencia,
  Incidencia,
  PrioridadIncidencia,
} from '../../../services/incidenciaServices';

import {
  actualizarIncidenciaAdministrativa,
  urlArchivoEvidencia,
} from '../../../services/incidenciaServices';

import parqueHero from '../../../assets/parque-hero.jpg';

interface EditarIncidenciaProps {
  incidencia: Incidencia;
  onCancelar: () => void;
  onGuardar: (incidencia: Incidencia) => void;
}

type EstadoGuardado =
  | 'inicial'
  | 'guardando'
  | 'exito'
  | 'error';

type EvidenciaIncidencia =
  Incidencia['evidencias'][number];

/* =========================================================
   OPCIONES
========================================================= */

const opcionesCategoria: CategoriaIncidencia[] = [
  'seguridad',
  'incendio',
  'flora_fauna',
  'ambiental',
  'infraestructura',
  'senderos',
  'servicios',
  'otro',
];

const opcionesPrioridad: PrioridadIncidencia[] = [
  'baja',
  'media',
  'alta',
  'critica',
];

const etiquetasEstado: Record<EstadoIncidencia, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
  rechazada: 'Rechazada',
  cerrada: 'Cerrada',
};

const etiquetasCategoria: Record<CategoriaIncidencia, string> = {
  seguridad: 'Seguridad',
  incendio: 'Incendio',
  flora_fauna: 'Flora y fauna',
  ambiental: 'Ambiental',
  infraestructura: 'Infraestructura',
  senderos: 'Senderos',
  servicios: 'Servicios',
  otro: 'Otro',
};

const etiquetasPrioridad: Record<PrioridadIncidencia, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
};

/* =========================================================
   COLORES INSTITUCIONALES
========================================================= */

const clasesEstado: Record<EstadoIncidencia, string> = {
  pendiente:
    'bg-[#F3F4D8] text-[#68731F] dark:bg-[#45491B] dark:text-[#E2E68A]',
  en_revision:
    'bg-[#E4F3F7] text-[#187E9B] dark:bg-[#123D48] dark:text-[#8DD7E9]',
  en_proceso:
    'bg-[#E2F1E9] text-[#237B4C] dark:bg-[#173F2F] dark:text-[#9AD5B2]',
  resuelta:
    'bg-[#E8F2DE] text-[#5E812E] dark:bg-[#344B24] dark:text-[#B9D98E]',
  rechazada:
    'bg-[#F5E5E2] text-[#A64E45] dark:bg-[#4A2925] dark:text-[#E8A9A0]',
  cerrada:
    'bg-[#EDF0ED] text-[#63736B] dark:bg-[#303C37] dark:text-[#B4C1BB]',
};

const clasesPrioridad: Record<PrioridadIncidencia, string> = {
  baja:
    'bg-[#EDF0ED] text-[#63736B] dark:bg-[#303C37] dark:text-[#B4C1BB]',
  media:
    'bg-[#E8F2DE] text-[#5E812E] dark:bg-[#344B24] dark:text-[#B9D98E]',
  alta:
    'bg-[#F3F4D8] text-[#72771D] dark:bg-[#45491B] dark:text-[#E2E68A]',
  critica:
    'bg-[#F5E5E2] text-[#A64E45] dark:bg-[#4A2925] dark:text-[#E8A9A0]',
};

const clasesCategoria: Record<CategoriaIncidencia, string> = {
  seguridad:
    'bg-[#E2F1E9] text-[#237B4C] dark:bg-[#173F2F] dark:text-[#9AD5B2]',
  incendio:
    'bg-[#F5E5E2] text-[#A64E45] dark:bg-[#4A2925] dark:text-[#E8A9A0]',
  flora_fauna:
    'bg-[#E8F2DE] text-[#5E812E] dark:bg-[#344B24] dark:text-[#B9D98E]',
  ambiental:
    'bg-[#E2F1E9] text-[#237B4C] dark:bg-[#173F2F] dark:text-[#9AD5B2]',
  infraestructura:
    'bg-[#E4F3F7] text-[#187E9B] dark:bg-[#123D48] dark:text-[#8DD7E9]',
  senderos:
    'bg-[#E8F2DE] text-[#5E812E] dark:bg-[#344B24] dark:text-[#B9D98E]',
  servicios:
    'bg-[#E4F3F7] text-[#187E9B] dark:bg-[#123D48] dark:text-[#8DD7E9]',
  otro:
    'bg-[#E4F3F7] text-[#187E9B] dark:bg-[#123D48] dark:text-[#8DD7E9]',
};

/* =========================================================
   ICONO
========================================================= */

function Icon({
  children,
  className = 'h-5 w-5',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* =========================================================
   CHIP
========================================================= */

function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[11px] font-bold leading-none tracking-[0.01em] [font-family:'Montserrat',sans-serif] shadow-[0_5px_16px_rgba(9,85,64,0.04)] ${className}`}
    >
      {children}
    </span>
  );
}

/* =========================================================
   INFO CARD
========================================================= */

function InfoItem({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/60 bg-white/28 px-4 py-3.5 shadow-[0_7px_20px_rgba(9,85,64,0.025)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_7px_20px_rgba(0,0,0,0.12)]">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#788B82] dark:text-[#8FA69C]">
        {etiqueta}
      </p>

      <div className="mt-1.5 text-sm font-semibold leading-6 text-[#264D3D] dark:text-[#D7E6E0]">
        {valor}
      </div>
    </div>
  );
}

/* =========================================================
   SELECT ADMINISTRATIVO
========================================================= */

function SelectAdministrativo<T extends string>({
  etiqueta,
  valor,
  opciones,
  etiquetas,
  onChange,
  disabled = false,
}: {
  etiqueta: string;
  valor: T;
  opciones: T[];
  etiquetas: Record<T, string>;
  onChange: (valor: T) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#60776C] dark:text-[#9AAEA6]">
        {etiqueta}
      </span>

      <select
        value={valor}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value as T);
        }}
        className="mt-2 h-12 w-full rounded-[1rem] border border-white/70 bg-white/58 px-4 text-sm font-semibold text-[#304B40] shadow-[0_7px_20px_rgba(7,63,49,0.035)] backdrop-blur-xl outline-none transition-all duration-200 hover:bg-white/75 focus:border-[#8DC63F]/65 focus:bg-white/75 focus:ring-4 focus:ring-[#8DC63F]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#102B23]/80 dark:text-[#D9E8E2] dark:hover:bg-[#15382E] dark:focus:border-[#8DC63F]/60 dark:focus:bg-[#15382E] dark:disabled:bg-[#17261F] dark:disabled:text-[#73877E]"
      >
        {opciones.map((opcion) => (
          <option key={opcion} value={opcion}>
            {etiquetas[opcion]}
          </option>
        ))}
      </select>
    </label>
  );
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function EditarIncidencia({
  incidencia,
  onCancelar,
  onGuardar,
}: EditarIncidenciaProps) {
  const incidenciaNoGestionable =
    incidencia.estado === 'resuelta' ||
    incidencia.estado === 'cerrada';

  const [categoria, setCategoria] =
    useState<CategoriaIncidencia>(incidencia.categoria);

  const [prioridad, setPrioridad] =
    useState<PrioridadIncidencia>(incidencia.prioridad);

  const [observacionesAdmin, setObservacionesAdmin] =
    useState(incidencia.observacionesAdmin ?? '');

  const [ultimaActualizacion, setUltimaActualizacion] =
    useState(incidencia.fechaActualizacion);

  const [actualizadoPor, setActualizadoPor] =
    useState(incidencia.adminActualiza);

  const [estadoGuardado, setEstadoGuardado] =
    useState<EstadoGuardado>('inicial');

  const [mensajeError, setMensajeError] =
    useState<string | null>(null);

  const [cambiosGuardados, setCambiosGuardados] =
    useState(false);

  const [evidenciaAmpliada, setEvidenciaAmpliada] =
    useState<EvidenciaIncidencia | null>(null);

  const carruselEvidenciasRef =
    useRef<HTMLDivElement | null>(null);

  const [puedeRetrocederEvidencias, setPuedeRetrocederEvidencias] =
    useState(false);

  const [puedeAvanzarEvidencias, setPuedeAvanzarEvidencias] =
    useState(false);

  const actualizarNavegacionEvidencias = () => {
    const carrusel = carruselEvidenciasRef.current;

    if (!carrusel) {
      setPuedeRetrocederEvidencias(false);
      setPuedeAvanzarEvidencias(false);
      return;
    }

    const margen = 2;

    const hayDesborde =
      carrusel.scrollWidth >
      carrusel.clientWidth + margen;

    setPuedeRetrocederEvidencias(
      hayDesborde &&
        carrusel.scrollLeft > margen,
    );

    setPuedeAvanzarEvidencias(
      hayDesborde &&
        carrusel.scrollLeft + carrusel.clientWidth <
          carrusel.scrollWidth - margen,
    );
  };

  const desplazarEvidencias = (
    direccion: -1 | 1,
  ) => {
    const carrusel =
      carruselEvidenciasRef.current;

    if (!carrusel) {
      return;
    }

    carrusel.scrollBy({
      left:
        direccion *
        carrusel.clientWidth *
        0.85,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    actualizarNavegacionEvidencias();

    window.addEventListener(
      'resize',
      actualizarNavegacionEvidencias,
    );

    return () => {
      window.removeEventListener(
        'resize',
        actualizarNavegacionEvidencias,
      );
    };
  }, [incidencia.evidencias.length]);

  useEffect(() => {
    setUltimaActualizacion(
      incidencia.fechaActualizacion,
    );

    setActualizadoPor(
      incidencia.adminActualiza,
    );
  }, [
    incidencia.adminActualiza,
    incidencia.fechaActualizacion,
  ]);

  /* =======================================================
     FECHAS
  ======================================================= */

  const fechaRegistro = useMemo(
    () =>
      new Date(
        incidencia.fechaRegistro,
      ).toLocaleDateString('es-CR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [incidencia.fechaRegistro],
  );

  const fechaActualizacion = useMemo(() => {
    if (!ultimaActualizacion) {
      return 'Sin actualizaciones';
    }

    return new Intl.DateTimeFormat('es-CR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Costa_Rica',
    }).format(new Date(ultimaActualizacion));
  }, [ultimaActualizacion]);

  /* =======================================================
     GUARDAR
  ======================================================= */

  const guardarCambios = async () => {
    setMensajeError(null);

    if (incidenciaNoGestionable) {
      setEstadoGuardado('error');

      setMensajeError(
        'Esta incidencia ya no puede ser gestionada porque está resuelta o cerrada.',
      );

      return;
    }

    if (cambiosGuardados) {
      return;
    }

    if (
      !opcionesCategoria.includes(categoria) ||
      !opcionesPrioridad.includes(prioridad)
    ) {
      setEstadoGuardado('error');

      setMensajeError(
        'Revisa los valores seleccionados antes de guardar.',
      );

      return;
    }

    setEstadoGuardado('guardando');

    try {
      const incidenciaActualizada =
        await actualizarIncidenciaAdministrativa(
          incidencia.id,
          {
            categoria,
            prioridad,
            observacionesAdmin:
              observacionesAdmin.trim() || null,
          },
        );

      setCategoria(
        incidenciaActualizada.categoria,
      );

      setPrioridad(
        incidenciaActualizada.prioridad,
      );

      setObservacionesAdmin(
        incidenciaActualizada.observacionesAdmin ??
          '',
      );

      const incidenciaParaGuardar: Incidencia = {
        ...incidencia,
        ...incidenciaActualizada,
        evidencias:
          incidenciaActualizada.evidencias ??
          incidencia.evidencias,
      };

      setUltimaActualizacion(
        incidenciaParaGuardar.fechaActualizacion,
      );

      setActualizadoPor(
        incidenciaParaGuardar.adminActualiza,
      );

      onGuardar(incidenciaParaGuardar);

      /*
       * Se marca como guardado antes de cerrar
       * para evitar cualquier segundo guardado.
       */
      setCambiosGuardados(true);
      setEstadoGuardado('exito');

      /*
       * Se mantiene unos milisegundos para que
       * el usuario pueda ver el mensaje.
       */
      setTimeout(() => {
        onCancelar();
      }, 800);
    } catch (error) {
      setEstadoGuardado('error');

      setMensajeError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la incidencia. Inténtalo nuevamente.',
      );
    }
  };

  const guardando =
    estadoGuardado === 'guardando';

  const formularioBloqueado =
    guardando ||
    cambiosGuardados ||
    incidenciaNoGestionable;

  /* =======================================================
     VISTA
  ======================================================= */

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden text-[#17382B] dark:text-[#E8F3EE] [font-family:'Montserrat',sans-serif]">

      {/* =====================================================
          FONDO
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src={parqueHero}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[14px] opacity-[0.30] saturate-[0.65] dark:opacity-[0.15]"
        />

        <div className="absolute inset-0 bg-[#EEF4EF]/78 backdrop-blur-[4px] dark:bg-[#071C16]/90" />

        <div className="absolute -left-32 top-0 h-[430px] w-[430px] rounded-full bg-[#8DC63F]/10 blur-[130px] dark:bg-[#8DC63F]/[0.06]" />

        <div className="absolute -right-24 bottom-0 h-[450px] w-[450px] rounded-full bg-[#00AEEF]/7 blur-[130px] dark:bg-[#00AEEF]/[0.04]" />
      </div>

      {/* =====================================================
          CONTENIDO
      ===================================================== */}

      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-7 sm:pt-7 lg:px-10 lg:pt-9">

        <section className="overflow-hidden rounded-[2.6rem] border border-white/60 bg-white/25 shadow-[0_28px_80px_rgba(7,63,49,0.10)] backdrop-blur-[28px] dark:border-white/10 dark:bg-[#0B3026]/80 dark:shadow-[0_28px_80px_rgba(0,0,0,0.30)] sm:rounded-[3rem]">

          {/* =================================================
              CABECERA
          ================================================= */}

          <header className="px-7 pb-6 pt-7 sm:px-10 sm:pb-7 sm:pt-9 lg:px-14 lg:pt-11">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

              <div className="max-w-[820px]">

                <h1 className="text-3xl font-bold leading-[1] tracking-[-0.025em] text-[#123D30] dark:text-white sm:text-4xl lg:text-[3.2rem]">
                  Editar incidencia
                </h1>

                <p className="mt-3 max-w-[760px] text-sm leading-7 text-[#687E74] dark:text-[#A9BCB4] sm:text-base">
                  Revisa la información registrada y actualiza
                  únicamente los datos administrativos necesarios.
                </p>

              </div>

              <div className="w-fit rounded-[1.35rem] bg-white/35 px-5 py-4 shadow-[0_8px_24px_rgba(9,85,64,0.035)] backdrop-blur-xl dark:border dark:border-white/10 dark:bg-white/5 lg:min-w-[150px]">

                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7A8C83] dark:text-[#91A59D]">
                  ID de incidencia
                </p>

                <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#095540] dark:text-[#8DC63F]">
                  #{incidencia.id}
                </p>

              </div>

            </div>

          </header>

          {/* =================================================
              EVIDENCIAS
          ================================================= */}

          <section className="border-t border-white/30 px-7 pb-7 pt-7 dark:border-white/10 sm:px-10 lg:px-14">

            <div className="flex items-center justify-between gap-4">

              <div>

                <h2 className="text-xl font-bold tracking-[-0.02em] text-[#174D3B] dark:text-[#DDEBE5]">
                  Evidencias de la incidencia
                </h2>

              </div>

              <span className="rounded-full bg-white/40 px-3.5 py-2 text-[10px] font-bold text-[#63776E] shadow-[0_5px_16px_rgba(9,85,64,0.03)] dark:bg-white/5 dark:text-[#A2B5AD]">
                {incidencia.evidencias.length}{' '}
                {incidencia.evidencias.length === 1
                  ? 'archivo'
                  : 'archivos'}
              </span>

            </div>

            {incidencia.evidencias.length === 0 ? (

              <div className="mt-5 rounded-[1.5rem] border border-white/55 bg-white/25 px-5 py-6 text-sm font-medium text-[#74867E] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:text-[#93A69E]">
                Esta incidencia no tiene evidencias adjuntas.
              </div>

            ) : (

              <div className="relative mt-5">

                {puedeRetrocederEvidencias && (
                  <button
                    type="button"
                    onClick={() =>
                      desplazarEvidencias(-1)
                    }
                    className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/65 bg-white/80 text-[#174D3B] shadow-[0_10px_24px_rgba(9,85,64,0.12)] backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-[#163B30]/90 dark:text-[#D9E8E2] dark:hover:bg-[#1C493A]"
                    aria-label="Ver evidencias anteriores"
                  >
                    <Icon className="h-4 w-4">
                      <path d="m15 18-6-6 6-6" />
                    </Icon>
                  </button>
                )}

                {puedeAvanzarEvidencias && (
                  <button
                    type="button"
                    onClick={() =>
                      desplazarEvidencias(1)
                    }
                    className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/65 bg-white/80 text-[#174D3B] shadow-[0_10px_24px_rgba(9,85,64,0.12)] backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-[#163B30]/90 dark:text-[#D9E8E2] dark:hover:bg-[#1C493A]"
                    aria-label="Ver más evidencias"
                  >
                    <Icon className="h-4 w-4">
                      <path d="m9 18 6-6-6-6" />
                    </Icon>
                  </button>
                )}

                <div
                  ref={carruselEvidenciasRef}
                  onScroll={
                    actualizarNavegacionEvidencias
                  }
                  className="flex snap-x gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {incidencia.evidencias.map(
                    (evidencia) => {
                      const url =
                        urlArchivoEvidencia(
                          evidencia.id,
                        );

                      return (
                        <div
                          key={evidencia.id}
                          className="w-[82%] shrink-0 snap-start overflow-hidden rounded-[1.5rem] border border-white/55 bg-white/26 shadow-[0_8px_24px_rgba(9,85,64,0.035)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_8px_24px_rgba(0,0,0,0.18)] sm:w-[calc((100%_-_1rem)/2)] lg:w-[calc((100%_-_2rem)/3)]"
                        >

                          {evidencia.tipo === 'foto' ? (

                            <button
                              type="button"
                              onClick={() =>
                                setEvidenciaAmpliada(
                                  evidencia,
                                )
                              }
                              className="block w-full text-left"
                              aria-label="Ver evidencia ampliada"
                            >
                              <div className="relative overflow-hidden">

                                <img
                                  src={url}
                                  alt={
                                    evidencia.nombreArchivo ??
                                    'Evidencia de la incidencia'
                                  }
                                  className="h-48 w-full object-cover"
                                />

                                <div className="absolute bottom-3 left-3 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-[#345748] backdrop-blur-xl dark:bg-[#102B23]/90 dark:text-[#D8E8E1]">
                                  Ver imagen
                                </div>

                              </div>
                            </button>

                          ) : (

                            <div>

                              <video
                                src={url}
                                controls
                                className="h-48 w-full object-cover"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  setEvidenciaAmpliada(
                                    evidencia,
                                  )
                                }
                                className="w-full border-t border-white/40 px-4 py-3 text-xs font-bold text-[#4E665B] transition hover:bg-white/20 dark:border-white/10 dark:text-[#AFC2B9] dark:hover:bg-white/5"
                              >
                                Ver ampliado
                              </button>

                            </div>

                          )}

                        </div>
                      );
                    },
                  )}
                </div>

              </div>
            )}

          </section>

          {/* =================================================
              CONTENIDO PRINCIPAL
          ================================================= */}

          <div className="grid gap-6 border-t border-white/30 px-7 pb-8 pt-7 dark:border-white/10 lg:grid-cols-[1.2fr_0.8fr] sm:px-10 lg:px-14">

            {/* =================================================
                INFORMACIÓN ACTUAL
            ================================================= */}

            <section>

              <div className="rounded-[1.9rem] border border-white/55 bg-white/24 p-6 shadow-[0_12px_32px_rgba(9,85,64,0.035)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.035] dark:shadow-[0_12px_32px_rgba(0,0,0,0.16)] lg:p-7">

                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#00AEEF]">
                  Información registrada
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-[-0.025em] text-[#174D3B] dark:text-[#E0ECE7]">
                  Información actual
                </h2>

                <p className="mt-2 max-w-[700px] text-sm leading-6 text-[#73867D] dark:text-[#9BAEA7]">
                  Revisa el reporte original antes de aplicar
                  cambios administrativos.
                </p>

                <div className="mt-6 space-y-4">

                  <InfoItem
                    etiqueta="Título"
                    valor={incidencia.titulo}
                  />

                  <InfoItem
                    etiqueta="Descripción"
                    valor={incidencia.descripcion}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">

                    <InfoItem
                      etiqueta="Categoría actual"
                      valor={
                        <Chip
                          className={
                            clasesCategoria[
                              incidencia.categoria
                            ]
                          }
                        >
                          {
                            etiquetasCategoria[
                              incidencia.categoria
                            ]
                          }
                        </Chip>
                      }
                    />

                    <InfoItem
                      etiqueta="Prioridad actual"
                      valor={
                        <Chip
                          className={
                            clasesPrioridad[
                              incidencia.prioridad
                            ]
                          }
                        >
                          {
                            etiquetasPrioridad[
                              incidencia.prioridad
                            ]
                          }
                        </Chip>
                      }
                    />

                    <InfoItem
                      etiqueta="Estado actual"
                      valor={
                        <Chip
                          className={
                            clasesEstado[
                              incidencia.estado
                            ]
                          }
                        >
                          {
                            etiquetasEstado[
                              incidencia.estado
                            ]
                          }
                        </Chip>
                      }
                    />

                    <InfoItem
                      etiqueta="Fecha de registro"
                      valor={fechaRegistro}
                    />

                    <InfoItem
                      etiqueta="Última actualización"
                      valor={fechaActualizacion}
                    />

                    <InfoItem
                      etiqueta="Actualizado por"
                      valor={
                        actualizadoPor?.nombre ??
                        'Sin actualización administrativa'
                      }
                    />

                  </div>

                  <InfoItem
                    etiqueta="Usuario que reportó"
                    valor={
                      incidencia.usuarioReporta?.nombre ??
                      (incidencia.nombreContacto
                        ? `Reporte anónimo (Contacto: ${incidencia.nombreContacto} - Tel: ${incidencia.telefonoContacto ?? 'No indicado'})`
                        : 'Reporte anónimo')
                    }
                  />

                  <InfoItem
                    etiqueta="Observación administrativa actual"
                    valor={
                      incidencia.observacionesAdmin ??
                      'Sin observaciones administrativas'
                    }
                  />

                </div>

              </div>

            </section>

            {/* =================================================
                CAMBIOS
            ================================================= */}

            <aside>

              <div className="rounded-[1.9rem] border border-white/55 bg-white/30 p-6 shadow-[0_12px_32px_rgba(9,85,64,0.045)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.035] dark:shadow-[0_12px_32px_rgba(0,0,0,0.18)] lg:p-7">

                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#00AEEF]">
                  Administración
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-[-0.025em] text-[#174D3B] dark:text-[#E0ECE7]">
                  Cambios administrativos
                </h2>

                {incidenciaNoGestionable && (
                  <div className="mt-5 rounded-[1.25rem] border border-[#D9E6D0] bg-[#F1F7EC] px-4 py-4 text-sm leading-6 text-[#527A38] dark:border-[#456B55] dark:bg-[#173B2E] dark:text-[#B9DFAF]">

                    <p className="font-bold">
                      Incidencia{' '}
                      {incidencia.estado ===
                      'resuelta'
                        ? 'resuelta'
                        : 'cerrada'}
                    </p>

                    <p className="mt-1">
                      Esta incidencia ya no puede ser gestionada
                      ni modificada administrativamente.
                    </p>

                  </div>
                )}

                {cambiosGuardados &&
                  !incidenciaNoGestionable && (
                    <div className="mt-5 rounded-[1.25rem] border border-[#B8D99F] bg-[#E8F2DE] px-4 py-4 text-sm leading-6 text-[#527A38] dark:border-[#456B55] dark:bg-[#173B2E] dark:text-[#B9DFAF]">

                      <p className="font-bold">
                        Cambios guardados correctamente
                      </p>

                      <p className="mt-1">
                        La incidencia ya fue actualizada y
                        no puede modificarse nuevamente desde
                        este formulario.
                      </p>

                    </div>
                  )}

                <p className="mt-2 text-sm leading-6 text-[#73867D] dark:text-[#9BAEA7]">
                  Actualiza los valores que forman parte
                  del seguimiento administrativo.
                </p>

                {incidencia.conformidadUsuario ===
                  'no_satisfecho' && (
                  <div className="mt-5 rounded-[1.25rem] border border-orange-300 bg-orange-50/90 p-4 shadow-sm dark:border-orange-900/70 dark:bg-orange-950/40">

                    <p className="font-bold text-orange-800 dark:text-orange-300">
                      El usuario no está satisfecho con la solución
                    </p>

                    {incidencia.observacionesUsuario && (
                      <p className="mt-2 text-sm leading-6 text-orange-700 dark:text-orange-200">
                        <span className="font-semibold">
                          Observación del usuario:
                        </span>{' '}
                        {
                          incidencia.observacionesUsuario
                        }
                      </p>
                    )}

                  </div>
                )}

                <div className="mt-6 space-y-5">

                  <SelectAdministrativo
                    etiqueta="Categoría"
                    valor={categoria}
                    opciones={opcionesCategoria}
                    etiquetas={etiquetasCategoria}
                    onChange={setCategoria}
                    disabled={formularioBloqueado}
                  />

                  <SelectAdministrativo
                    etiqueta="Prioridad"
                    valor={prioridad}
                    opciones={opcionesPrioridad}
                    etiquetas={etiquetasPrioridad}
                    onChange={setPrioridad}
                    disabled={formularioBloqueado}
                  />

                  <label className="block">

                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#60776C] dark:text-[#9AAEA6]">
                      Observaciones de seguimiento
                    </span>

                    <textarea
                      value={observacionesAdmin}
                      onChange={(event) =>
                        setObservacionesAdmin(
                          event.target.value,
                        )
                      }
                      disabled={formularioBloqueado}
                      rows={5}
                      placeholder="Describe el seguimiento administrativo..."
                      className="mt-2 w-full resize-none rounded-[1rem] border border-white/70 bg-white/55 px-4 py-3.5 text-sm font-medium leading-6 text-[#304B40] shadow-[0_7px_20px_rgba(7,63,49,0.03)] backdrop-blur-xl outline-none transition-all duration-200 placeholder:text-[#9AA9A2] focus:border-[#8DC63F]/60 focus:bg-white/70 focus:ring-4 focus:ring-[#8DC63F]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#102B23]/80 dark:text-[#D9E8E2] dark:placeholder:text-[#70847B] dark:focus:border-[#8DC63F]/60 dark:focus:bg-[#15382E] dark:disabled:bg-[#17261F] dark:disabled:text-[#73877E]"
                    />

                  </label>

                </div>

                {/* =================================================
                    ÉXITO
                ================================================= */}

                {estadoGuardado === 'exito' && (
                  <div className="mt-5 rounded-[1.2rem] border border-[#B8D99F] bg-[#E8F2DE] px-4 py-3.5 text-sm font-semibold text-[#527A38] dark:border-[#456B55] dark:bg-[#173B2E] dark:text-[#B9DFAF]">
                    Cambios guardados correctamente. La incidencia ya no puede modificarse desde este formulario.
                  </div>
                )}

                {/* =================================================
                    ERROR
                ================================================= */}

                {estadoGuardado === 'error' && (
                  <div className="mt-5 rounded-[1.2rem] bg-[#F5E5E2] px-4 py-3.5 text-sm font-semibold text-[#A64E45] dark:border dark:border-[#713E3A] dark:bg-[#3A211E] dark:text-[#F0B5AC]">
                    {mensajeError ??
                      'No se pudo guardar la incidencia. Inténtalo nuevamente.'}
                  </div>
                )}

                {/* =================================================
                    ACCIONES
                ================================================= */}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={onCancelar}
                    disabled={guardando}
                    className="inline-flex items-center justify-center rounded-full bg-white/45 px-5 py-3 text-sm font-semibold text-[#60756B] shadow-[0_7px_20px_rgba(9,85,64,0.03)] backdrop-blur-xl transition-all duration-200 hover:bg-white/65 disabled:cursor-not-allowed disabled:opacity-60 dark:border dark:border-white/10 dark:bg-white/5 dark:text-[#AFC0B9] dark:hover:bg-white/10"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={guardarCambios}
                    disabled={formularioBloqueado}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#095540] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(9,85,64,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#009444] hover:shadow-[0_16px_32px_rgba(0,148,68,0.18)] disabled:cursor-not-allowed disabled:bg-[#52665E] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none dark:bg-[#147A5D] dark:hover:bg-[#1A946F] dark:disabled:bg-[#34483F]"
                  >

                    {guardando && (
                      <Icon className="h-4 w-4 animate-spin">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          strokeDasharray="32"
                        />
                      </Icon>
                    )}

                    {guardando
                      ? 'Guardando...'
                      : cambiosGuardados
                        ? 'Cambios guardados'
                        : 'Guardar cambios'}

                  </button>

                </div>

              </div>

            </aside>

          </div>

          {/* =================================================
              PIE
          ================================================= */}

          <footer className="border-t border-white/20 px-7 py-5 dark:border-white/10 sm:px-10 lg:px-14">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-[10px] font-semibold text-[#7D9086] dark:text-[#81968D]">
                Gestión administrativa · Aliados del Parque Nacional Diriá
              </p>

              <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold tracking-[0.12em]">

                <span className="text-[#009444]">
                  Guanacaste
                </span>

                <span className="text-[#00AEEF]">
                  Costa Rica
                </span>

                <span className="text-[#D9D823]">
                  Parque Nacional Diriá
                </span>

              </div>

            </div>

          </footer>

        </section>

      </div>

      {/* =====================================================
          EVIDENCIA AMPLIADA
      ===================================================== */}

      {evidenciaAmpliada && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#09241C]/75 p-4 backdrop-blur-md dark:bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label="Evidencia ampliada"
        >

          <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/20 bg-[#0B3026]/80 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.30)] backdrop-blur-2xl">

            <button
              type="button"
              onClick={() =>
                setEvidenciaAmpliada(null)
              }
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-[#304B40] shadow-lg transition hover:bg-white dark:bg-[#163B30] dark:text-[#D9E8E2] dark:hover:bg-[#1D4A3B]"
            >
              Cerrar
            </button>

            {evidenciaAmpliada.tipo === 'foto' ? (

              <img
                src={urlArchivoEvidencia(
                  evidenciaAmpliada.id,
                )}
                alt={
                  evidenciaAmpliada.nombreArchivo ??
                  'Evidencia de la incidencia'
                }
                className="max-h-[80vh] w-full rounded-[1.3rem] object-contain"
              />

            ) : (

              <video
                src={urlArchivoEvidencia(
                  evidenciaAmpliada.id,
                )}
                controls
                className="max-h-[80vh] w-full rounded-[1.3rem]"
              />

            )}

          </div>

        </div>
      )}

    </main>
  );
}