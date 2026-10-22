import { useEffect, useMemo, useRef, useState } from 'react';
import MapaUbicacion from './MapaUbicacion'; 
import ScrollReveal from './ui/ScrollReveal';
   import { createPortal } from 'react-dom';
import {
  cambiarEstadoPublicacion,
  obtenerCatalogoPublicado,
  obtenerEmprendimientosAdministrativos,
  eliminarEmprendimiento,
  obtenerEmprendimientoPorId,
  obtenerDetalleCatalogoPublicado,
  registrarConsultaEmprendimiento,
  type Emprendimiento,
  type EstadoPublicacion,
  type EstadoPublicacionSolicitado,
} from '../services/emprendimientoService';

type NombreRol = 'administrador' | 'asociado' | 'visitante';

interface Props {
  rolAutenticado: NombreRol | null;
  usuarioId?: number | null;
  onRegistrar?: () => void;
  onRegistrarCategoria?: () => void;
  onEditar?: (emprendimiento: Emprendimiento) => void;
  contexto?: 'publico' | 'administrativo';
  soloMios?: boolean;
}


interface MensajeAccion {
  tipo: 'exito' | 'error';
  texto: string;
}

type FiltroEstado = 'todos' | EstadoPublicacion;

interface TransicionDisponible {
  estado: EstadoPublicacionSolicitado;
  accion: 'publicar' | 'ocultar' | 'activar' | 'desactivar' | 'enviar';
  texto: string;
}

const obtenerMensajeError = (
  error: unknown,
  mensajePredeterminado: string,
): string =>
  error instanceof Error && error.message.trim()
    ? error.message
    : mensajePredeterminado;

const obtenerMensajeAutorizacion = (event: Event): string => {
  const detalle = (event as CustomEvent<unknown>).detail;

  if (
    typeof detalle === 'object' &&
    detalle !== null &&
    'message' in detalle &&
    typeof detalle.message === 'string' &&
    detalle.message.trim()
  ) {
    return detalle.message;
  }

  return event.type === 'auth:forbidden'
    ? 'No tienes permisos para realizar esta operación.'
    : 'Tu sesión no está disponible. Inicia sesión nuevamente.';
};

const obtenerNombreCategoria = (
  categoria: Emprendimiento['categoria'],
): string | null => {
  if (!categoria) return null;
  if (typeof categoria === 'string') return categoria;
  if (
    typeof categoria === 'object' &&
    'nombre' in categoria &&
    typeof categoria.nombre === 'string'
  ) {
    return categoria.nombre;
  }
  return null;
};

const obtenerUbicacion = (
  emprendimiento: Emprendimiento,
): string | null => {
  if (emprendimiento.direccion?.trim()) {
    return emprendimiento.direccion;
  }

  if (
    emprendimiento.latitud !== null &&
    emprendimiento.latitud !== undefined &&
    emprendimiento.longitud !== null &&
    emprendimiento.longitud !== undefined
  ) {
    return `Coordenadas: ${emprendimiento.latitud}, ${emprendimiento.longitud}`;
  }

  return null;
};



const abrirWhatsApp = (telefono: string) => {
  const numero = telefono.replace(/\D/g, '');

  if (!numero) return;

  const numeroWhatsApp = numero.startsWith('506')
    ? numero
    : `506${numero}`;

  window.open(
    `https://wa.me/${numeroWhatsApp}`,
    '_blank',
    'noopener,noreferrer',
  );
};


const obtenerTransicionesDisponibles = (
  estado: EstadoPublicacion,
): TransicionDisponible[] => {
  switch (estado) {
   
    case 'no_publicado':
      return [
        {
          estado: 'Publicado',
          accion: 'publicar',
          texto: 'Publicar',
        },
      ];
    case 'publicado':
      return [
        {
          estado: 'No Publicado',
          accion: 'ocultar',
          texto: 'Despublicar',
        },
      ];
    case 'desactivado':
      return [
        {
          estado: 'No Publicado',
          accion: 'activar',
          texto: 'Activar',
        },
      ];
    default:
      return [];
  }
};

function ListaEmprendimientos({
  rolAutenticado,
  usuarioId,
  onRegistrar,
  onRegistrarCategoria,
  onEditar,
  contexto = 'publico',
  soloMios = false,
}: Props) {
  const [emprendimientos, setEmprendimientos] = useState<Emprendimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeAccion, setMensajeAccion] = useState<MensajeAccion | null>(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [busquedaTexto, setBusquedaTexto] = useState('');

  const [emprendimientoSeleccionado, setEmprendimientoSeleccionado] =
    useState<Emprendimiento | null>(null);
  const [detalleSeleccionado, setDetalleSeleccionado] =
    useState<Emprendimiento | null>(null);
  const [imagenDetalle, setImagenDetalle] = useState(0);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [transicionSeleccionada, setTransicionSeleccionada] =
    useState<TransicionDisponible | null>(null);
  const [idProcesando, setIdProcesando] = useState<number | null>(null);

  const operacionEnCurso = useRef(false);
  const detalleEnCargaRef = useRef<number | null>(null);
  const botonQueAbrioModal = useRef<HTMLButtonElement | null>(null);
  const dialogoConfirmacion = useRef<HTMLDivElement | null>(null);
  const carruselEmprendimientos = useRef<HTMLDivElement | null>(null);
  const cargaActivaRef = useRef<AbortController | null>(null);
  const [emprendimientoAEliminar, setEmprendimientoAEliminar] =
    useState<Emprendimiento | null>(null);

  const [eliminando, setEliminando] = useState(false);
  const [errorEliminacion, setErrorEliminacion] = useState<string | null>(null);

  const esContextoAdministrativo = contexto === 'administrativo';
const esAdministrador =
  esContextoAdministrativo && rolAutenticado === 'administrador';
const esAsociado = rolAutenticado === 'asociado';

// El asociado solo entra a gestión cuando está en "Mis emprendimientos"
const verSoloMios = esAsociado && soloMios;

const esGestionAdministrativa =
  esContextoAdministrativo || esAdministrador || verSoloMios;
const esCatalogoPublico = !esGestionAdministrativa;
const puedeRegistrar = esAdministrador || verSoloMios;

const esPropietario = (emprendimiento: Emprendimiento) =>
  esAsociado && usuarioId !== null && emprendimiento.asociadoId === usuarioId;

const puedeEditarEmprendimiento = (emprendimiento: Emprendimiento) =>
  esAdministrador || (verSoloMios && esPropietario(emprendimiento));
  const abrirDetalle = async (emprendimiento: Emprendimiento) => {
    if (detalleEnCargaRef.current === emprendimiento.id) {
      return;
    }

    detalleEnCargaRef.current = emprendimiento.id;
    setCargandoDetalle(true);
    setImagenDetalle(0);
    try {
      const detalle = esCatalogoPublico
        ? await obtenerDetalleCatalogoPublicado(emprendimiento.id)
        : await obtenerEmprendimientoPorId(emprendimiento.id);

      if (esCatalogoPublico) {
        try {
          await registrarConsultaEmprendimiento(emprendimiento.id);
        } catch (error) {
          console.warn(
            'No se pudo registrar la consulta del emprendimiento:',
            error,
          );
        }
      }

      setDetalleSeleccionado(detalle);
    } catch (err: unknown) {
      setMensajeAccion({
        tipo: 'error',
        texto: obtenerMensajeError(err, 'No se pudo cargar el detalle del emprendimiento.'),
      });
    } finally {
      detalleEnCargaRef.current = null;
      setCargandoDetalle(false);
    }
  };

  useEffect(() => {
    const mostrarErrorAutorizacion = (event: Event) => {
      setMensajeAccion({
        tipo: 'error',
        texto: obtenerMensajeAutorizacion(event),
      });
      setEmprendimientoSeleccionado(null);
      setTransicionSeleccionada(null);
    };

    window.addEventListener('auth:unauthorized', mostrarErrorAutorizacion);
    window.addEventListener('auth:forbidden', mostrarErrorAutorizacion);

    return () => {
      window.removeEventListener('auth:unauthorized', mostrarErrorAutorizacion);
      window.removeEventListener('auth:forbidden', mostrarErrorAutorizacion);
    };
  }, []);

  useEffect(() => {
    let componenteActivo = true;
    let controlador: AbortController | null = null;

    const cargarEmprendimientos = async () => {
      cargaActivaRef.current?.abort();
      controlador = new AbortController();
      cargaActivaRef.current = controlador;

      try {
        setCargando(true);
        setError(null);
        setEmprendimientoSeleccionado(null);
        setTransicionSeleccionada(null);

        let data: Emprendimiento[];

      if (esGestionAdministrativa) {
  data = await obtenerEmprendimientosAdministrativos(
    undefined,
    controlador.signal,
  );

  if (verSoloMios) {
    data = data.filter(
      (emprendimiento) => emprendimiento.asociadoId === usuarioId,
    );
  }
} else {
  data = await obtenerCatalogoPublicado(controlador.signal);
}

        if (componenteActivo && !controlador.signal.aborted) {
          setEmprendimientos(data);
        }
      } catch (err: unknown) {
        if (controlador.signal.aborted) return;

        if (componenteActivo) {
          setError(
            obtenerMensajeError(err, 'No se pudieron cargar los emprendimientos'),
          );
        }
      } finally {
        if (componenteActivo && !controlador.signal.aborted) {
          setCargando(false);
        }
      }
    };

    void cargarEmprendimientos();

    return () => {
      componenteActivo = false;
      controlador?.abort();
    };
}, [esGestionAdministrativa, rolAutenticado, verSoloMios, usuarioId]);

  const abrirConfirmacion = (
    emprendimiento: Emprendimiento,
    transicion: TransicionDisponible,
    boton: HTMLButtonElement,
  ) => {
    if (!esAdministrador || operacionEnCurso.current) return;

    botonQueAbrioModal.current = boton;
    setMensajeAccion(null);
    setEmprendimientoSeleccionado(emprendimiento);
    setTransicionSeleccionada(transicion);
  };

  const cerrarConfirmacion = () => {
    if (operacionEnCurso.current) return;
    setEmprendimientoSeleccionado(null);
    setTransicionSeleccionada(null);
  };

  const confirmarCambioPublicacion = async () => {
    if (
      !esAdministrador ||
      !emprendimientoSeleccionado ||
      !transicionSeleccionada ||
      operacionEnCurso.current
    ) {
      return;
    }

    const emprendimiento = emprendimientoSeleccionado;
    const transicion = transicionSeleccionada;

    operacionEnCurso.current = true;
    setIdProcesando(emprendimiento.id);
    setMensajeAccion(null);

    try {
      const resultado = await cambiarEstadoPublicacion(
        emprendimiento.id,
        transicion.estado,
      );

      setEmprendimientos((actuales) =>
        actuales.map((item) =>
          item.id === emprendimiento.id
            ? {
                ...item,
                estadoPublicacion: resultado.data.estadoPublicacion,
                fechaPublicacion: resultado.data.fechaPublicacion,
              }
            : item,
        ),
      );

      setMensajeAccion({
        tipo: 'exito',
        texto:
          transicion.accion === 'publicar'
            ? 'Emprendimiento publicado correctamente.'
            : transicion.accion === 'ocultar'
              ? 'Emprendimiento despublicado correctamente.'
              : resultado.message ||
                'El emprendimiento fue actualizado correctamente.',
      });
      setEmprendimientoSeleccionado(null);
      setTransicionSeleccionada(null);
    } catch (err: unknown) {
      setMensajeAccion({
        tipo: 'error',
        texto: obtenerMensajeError(
          err,
          'No se pudo actualizar el estado del emprendimiento.',
        ),
      });
      setEmprendimientoSeleccionado(null);
      setTransicionSeleccionada(null);
    } finally {
      operacionEnCurso.current = false;
      setIdProcesando(null);
    }
  };

  useEffect(() => {
    if (!emprendimientoSeleccionado) return;

    const manejarTeclado = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !operacionEnCurso.current) {
        setEmprendimientoSeleccionado(null);
        setTransicionSeleccionada(null);
        return;
      }

      if (event.key !== 'Tab') return;

      const dialogo = dialogoConfirmacion.current;
      if (!dialogo) return;

      const elementosEnfocables = Array.from(
        dialogo.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (elementosEnfocables.length === 0) {
        event.preventDefault();
        dialogo.focus();
        return;
      }

      const primero = elementosEnfocables[0];
      const ultimo = elementosEnfocables[elementosEnfocables.length - 1];
      const focoActual = document.activeElement;

      if (event.shiftKey && (focoActual === primero || !dialogo.contains(focoActual))) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (focoActual === ultimo || !dialogo.contains(focoActual))) {
        event.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', manejarTeclado);

    return () => {
      document.removeEventListener('keydown', manejarTeclado);
      botonQueAbrioModal.current?.focus();
      botonQueAbrioModal.current = null;
    };
  }, [emprendimientoSeleccionado]);

  useEffect(() => {
    if (!detalleSeleccionado) return;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetalleSeleccionado(null);
    };
    document.addEventListener('keydown', cerrarConEscape);
    return () => document.removeEventListener('keydown', cerrarConEscape);
  }, [detalleSeleccionado]);
useEffect(() => {
  if (!mensajeAccion) return;

  const temporizador = window.setTimeout(() => {
    setMensajeAccion(null);
  }, 4000);

  return () => {
    window.clearTimeout(temporizador);
  };
}, [mensajeAccion]);

  useEffect(() => {
    if (idProcesando !== null && emprendimientoSeleccionado) {
      dialogoConfirmacion.current?.focus();
    }
  }, [emprendimientoSeleccionado, idProcesando]);

  const confirmarEliminacion = async () => {
    if (
      !emprendimientoAEliminar ||
      !esAdministrador
    ) return;

    try {
      setEliminando(true);
      setErrorEliminacion(null);

      await eliminarEmprendimiento(emprendimientoAEliminar.id);

      setEmprendimientos((actuales) =>
        actuales.filter((e) => e.id !== emprendimientoAEliminar.id),
      );

      setMensajeAccion({
        tipo: 'exito',
        texto: 'Emprendimiento eliminado correctamente.',
      });
      setEmprendimientoAEliminar(null);
    } catch (err: unknown) {
      setErrorEliminacion(
        obtenerMensajeError(err, 'No se pudo eliminar el emprendimiento.'),
      );
    } finally {
      setEliminando(false);
    }
  };

  const obtenerEstiloEstado = (estado: EstadoPublicacion) => {
    switch (estado) {
      case 'publicado':
        return {
          fondo: 'bg-emerald-500/10 dark:bg-emerald-400/15',
          texto: 'text-emerald-800 dark:text-emerald-200',
          borde: 'border-emerald-500/25 dark:border-emerald-300/20',
          punto: 'bg-[#009444]',
          etiqueta: 'Publicado',
        };
      case 'no_publicado':
        return {
          fondo: 'bg-amber-500/10 dark:bg-amber-400/15',
          texto: 'text-amber-800 dark:text-amber-200',
          borde: 'border-amber-500/25 dark:border-amber-300/20',
          punto: 'bg-amber-500',
          etiqueta: 'No Publicado',
        };
      case 'borrador':
        return {
          fondo: 'bg-slate-500/10 dark:bg-slate-400/15',
          texto: 'text-slate-700 dark:text-slate-200',
          borde: 'border-slate-500/20 dark:border-slate-300/20',
          punto: 'bg-slate-500',
          etiqueta: 'Borrador',
        };
      case 'desactivado':
        return {
          fondo: 'bg-rose-500/10 dark:bg-rose-400/15',
          texto: 'text-rose-800 dark:text-rose-200',
          borde: 'border-rose-500/25 dark:border-rose-300/20',
          punto: 'bg-rose-500',
          etiqueta: 'Desactivado',
        };
      default:
        return {
          fondo: 'bg-slate-100',
          texto: 'text-slate-700',
          borde: 'border-slate-200',
          punto: 'bg-slate-400',
          etiqueta: 'Desconocido',
        };
    }
  };

  // Contadores para filtros
  const cantidadBorradores = emprendimientos.filter(
    (e) => e.estadoPublicacion === 'borrador',
  ).length;
  const cantidadNoPublicados = emprendimientos.filter(
    (e) => e.estadoPublicacion === 'no_publicado',
  ).length;
  const cantidadPublicados = emprendimientos.filter(
    (e) => e.estadoPublicacion === 'publicado',
  ).length;
  const cantidadDesactivados = emprendimientos.filter(
    (e) => e.estadoPublicacion === 'desactivado',
  ).length;

  const emprendimientosFiltrados = useMemo(() => {
    return emprendimientos.filter((item) => {
      const coincideEstado =
        filtroEstado === 'todos' || item.estadoPublicacion === filtroEstado;
      const coincideTexto =
        item.nombre.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
        (item.descripcion &&
          item.descripcion.toLowerCase().includes(busquedaTexto.toLowerCase()));
      return coincideEstado && coincideTexto;
    });
  }, [emprendimientos, filtroEstado, busquedaTexto]);

  if (cargando) {
    return (
      <section className="min-h-screen bg-[#f5f7f1] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-emerald-100 border-t-emerald-800 motion-safe:animate-spin motion-reduce:animate-none" />
              <h2 className="text-lg font-semibold text-slate-800">
                Cargando emprendimientos
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Estamos preparando la información...
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-[#f5f7f1] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-[#fffef9] p-8 text-center shadow-[0_18px_50px_rgba(20,83,45,0.08)]" role="alert">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              No se pudieron cargar los emprendimientos
            </h2>
            <p className="mt-3 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen overflow-x-clip bg-[#f5f7f1] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        {!esCatalogoPublico && (
        <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/70 bg-white/50 px-5 py-8 text-[#073f31] shadow-[0_16px_44px_rgba(9,85,64,0.08)] backdrop-blur-xl sm:px-10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#8dc63f]/15 blur-3xl" aria-hidden="true" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8dc63f]/35 bg-[#8dc63f]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#095540] backdrop-blur-md dark:text-[#c8ee8d]">
                <span className="h-2 w-2 rounded-full bg-[#d9d823] motion-safe:animate-pulse motion-reduce:animate-none" />
                {esAdministrador
                  ? 'Panel de administración'
                  : esAsociado
                  ? 'Panel de asociado'
                  : 'Comunidad Diriá'}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Emprendimientos locales
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                {esAdministrador
                  ? 'Administre los emprendimientos registrados y gestione su estado de publicación.'
                  : esAsociado
                  ? 'Consultá y registrá emprendimientos de la comunidad. El estado de publicación es gestionado por los administradores.'
                  : 'Conocé las propuestas de la comunidad alrededor del Parque Nacional Diriá.'}
              </p>
            </div>

            <div className="relative flex flex-col gap-3 min-[430px]:flex-row min-[430px]:flex-wrap min-[430px]:items-center">
              {esAdministrador && onRegistrarCategoria && (
                <button
                  type="button"
                  onClick={onRegistrarCategoria}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#095540]/20 bg-white/50 px-4 py-2.5 text-sm font-semibold text-[#095540] shadow-sm backdrop-blur-sm motion-safe:transition-all motion-safe:duration-200 hover:bg-white/80 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] motion-reduce:transform-none dark:border-white/15 dark:bg-white/10 dark:text-white"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Registrar categoría
                </button>
              )}

              {puedeRegistrar && onRegistrar && (
                <button
                  type="button"
                  onClick={onRegistrar}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#095540] px-5 py-2.5 text-sm font-bold text-white shadow-md motion-safe:transition-all motion-safe:duration-200 hover:bg-[#08743f] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] motion-reduce:transform-none"
                >
                  <svg
                    className="h-4 w-4 text-emerald-800"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Registrar emprendimiento
                </button>
              )}
            </div>
          </div>
        </div>
        )}

        {esCatalogoPublico && (
          <header className="relative mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="relative">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8DC63F]/40 bg-[#8DC63F]/10 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-[#8DC63F]" />
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#095540]">
                  Comunidad Diriá
                </span>
              </div>
              <h1 className="font-brand text-3xl font-bold tracking-tight text-[#095540] sm:text-4xl">
                Emprendimientos locales
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Propuestas de la comunidad alrededor del Parque Nacional Diriá.
              </p>
            </div>
          </header>
        )}

        {/* MENSAJE DE ACCIÓN */}
        {mensajeAccion &&
          createPortal(
            <div
              className="fixed right-4 top-4 z-[10001] w-[calc(100%-2rem)] max-w-md motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out motion-reduce:transition-none"
              role={mensajeAccion.tipo === 'error' ? 'alert' : 'status'}
              aria-live="polite"
            >
              <div
                className={`flex items-start gap-3 rounded-2xl border bg-[#fffef9] p-4 shadow-xl ${
                  mensajeAccion.tipo === 'exito'
                    ? 'border-emerald-200'
                    : 'border-rose-200'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                    mensajeAccion.tipo === 'exito'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {mensajeAccion.tipo === 'exito' ? '✓' : '⚠'}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <p
                    className={`text-sm font-bold ${
                      mensajeAccion.tipo === 'exito'
                        ? 'text-emerald-900'
                        : 'text-rose-900'
                    }`}
                  >
                    {mensajeAccion.texto}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMensajeAccion(null)}
                  className="shrink-0 rounded-lg p-1 text-stone-400 motion-safe:transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                  aria-label="Cerrar notificación"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            </div>,
            document.body,
          )}



        {/* BUSCADOR Y FILTROS INTERACTIVOS TIPO TAB */}
        <div className="mb-8 space-y-4 rounded-3xl border border-[#095540]/10 bg-white p-4 shadow-[0_12px_35px_rgba(9,85,64,0.07)] sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Buscador de texto */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
                />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                className="w-full rounded-2xl border border-[#095540]/15 bg-[#f7faf5] py-3 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none motion-safe:transition-[border-color,background-color,box-shadow] motion-safe:duration-200 focus-visible:border-[#009444] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#009444]/15"
              />
            </div>

            {/* Contador de resultados */}
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mostrando {emprendimientosFiltrados.length} de {emprendimientos.length}
            </div>
          </div>

          {/* Filtros de estado estilo Pills */}
          {esAdministrador && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setFiltroEstado('todos')}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 ${
                  filtroEstado === 'todos'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                Todos
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    filtroEstado === 'todos'
                      ? 'bg-slate-800 text-slate-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {emprendimientos.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado('publicado')}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                  filtroEstado === 'publicado'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80'
                }`}
              >
                Publicados
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    filtroEstado === 'publicado'
                      ? 'bg-emerald-800 text-emerald-100'
                      : 'bg-emerald-200/60 text-emerald-900'
                  }`}
                >
                  {cantidadPublicados}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado('no_publicado')}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 ${
                  filtroEstado === 'no_publicado'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100/80'
                }`}
              >
                No publicados
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    filtroEstado === 'no_publicado'
                      ? 'bg-amber-700 text-amber-100'
                      : 'bg-amber-200/60 text-amber-900'
                  }`}
                >
                  {cantidadNoPublicados}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado('borrador')}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 ${
                  filtroEstado === 'borrador'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                }`}
              >
                Borradores
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    filtroEstado === 'borrador'
                      ? 'bg-slate-800 text-slate-200'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {cantidadBorradores}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado('desactivado')}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2 ${
                  filtroEstado === 'desactivado'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100/80'
                }`}
              >
                Desactivados
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    filtroEstado === 'desactivado'
                      ? 'bg-rose-800 text-rose-100'
                      : 'bg-rose-200/60 text-rose-900'
                  }`}
                >
                  {cantidadDesactivados}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ESTADO VACÍO */}
        {emprendimientosFiltrados.length === 0 && (
          <div className="rounded-[2rem] border border-stone-200 bg-[#fffef9] px-5 py-16 text-center shadow-sm sm:px-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              No se encontraron emprendimientos
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {busquedaTexto || filtroEstado !== 'todos'
                ? 'Intente cambiando el término de búsqueda o ajustando los filtros seleccionados.'
                : 'Aún no hay emprendimientos registrados en esta sección.'}
            </p>

            {puedeRegistrar && onRegistrar && emprendimientos.length === 0 && (
              <button
                type="button"
                onClick={onRegistrar}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 motion-reduce:transform-none"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Registrar primer emprendimiento
              </button>
            )}
          </div>
        )}

       
{/* TARJETAS DE EMPRENDIMIENTO */}
{emprendimientosFiltrados.length > 0 && (
  <ScrollReveal className="relative">
    <div className="mb-3 flex items-center justify-end gap-2 sm:mb-4">
      <button
        type="button"
        onClick={() => carruselEmprendimientos.current?.scrollBy({ left: -360, behavior: 'smooth' })}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-emerald-950/60 text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-emerald-600/30 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] dark:bg-slate-900/80"
        aria-label="Ver emprendimientos anteriores"
        title="Anterior"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
          <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => carruselEmprendimientos.current?.scrollBy({ left: 360, behavior: 'smooth' })}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-emerald-950/60 text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-emerald-600/30 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] dark:bg-slate-900/80"
        aria-label="Ver más emprendimientos"
        title="Siguiente"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
          <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>

    <div
      ref={carruselEmprendimientos}
      className="flex items-stretch gap-6 overflow-x-auto scroll-smooth px-2 py-4 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
    {emprendimientosFiltrados.map((emprendimiento) => {
      const estiloEstado = obtenerEstiloEstado(
        emprendimiento.estadoPublicacion,
      );

      const ubicacion = obtenerUbicacion(emprendimiento);

      const nombreCategoria = obtenerNombreCategoria(
        emprendimiento.categoria,
      );

      const estaPublicado =
        emprendimiento.estadoPublicacion === 'publicado';

      const estaProcesando = idProcesando === emprendimiento.id;

      const transicionesDisponibles = obtenerTransicionesDisponibles(
        emprendimiento.estadoPublicacion,
      );

      const puedeEditar =
        puedeEditarEmprendimiento(emprendimiento);

      return (
        <article
          key={emprendimiento.id}
          onClick={() => { void abrirDetalle(emprendimiento); }}
          onKeyDown={(event) => {
            if (esCatalogoPublico && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              void abrirDetalle(emprendimiento);
            }
          }}
          role={esCatalogoPublico ? 'button' : undefined}
          tabIndex={esCatalogoPublico ? 0 : undefined}
          className="
            sigtad-image-reveal group flex min-h-[580px] w-[420px] shrink-0 cursor-pointer snap-center flex-col overflow-hidden sm:w-[480px] md:w-[520px]
            rounded-[1.75rem]
            border border-[#095540]/10
            bg-white/85 backdrop-blur-md dark:bg-emerald-950/80
            shadow-[0_8px_28px_rgba(9,85,64,0.07)]
            motion-safe:transition-all motion-safe:duration-300
            motion-safe:hover:-translate-y-1
            hover:border-[#8DC63F]/60
            hover:shadow-[0_20px_50px_rgba(9,85,64,0.13)]
            motion-reduce:transform-none motion-reduce:transition-none
          "
        >
          {/* =========================
              IMAGEN / PORTADA
          ========================== */}
          <div className="relative h-40 w-full shrink-0 overflow-hidden bg-stone-100 sm:h-44">
            {emprendimiento.imagen ? (
              <img
                src={emprendimiento.imagen}
                alt={emprendimiento.nombre}
                loading="lazy"
                className="
                  h-full w-full object-cover
                  motion-safe:transition-transform motion-safe:duration-700
                  motion-safe:ease-out
                  motion-safe:group-hover:scale-[1.03]
                  motion-reduce:transform-none motion-reduce:transition-none
                "
              />
            ) : (
              <div className="relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-100">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-100/60 blur-2xl" />
                <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-emerald-50 blur-2xl" />

                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-100 bg-white/80 text-emerald-300 shadow-sm backdrop-blur">
                  <svg
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.4"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/5 to-transparent" />

            {/* Estado */}
            <div className="absolute left-4 top-4">
              {esAdministrador && transicionesDisponibles.length > 0 ? (
                <details className="relative" onClick={(event) => event.stopPropagation()}>
                  <summary
                    className={`
                      inline-flex cursor-pointer list-none items-center gap-2
                      rounded-full border px-3 py-1.5 text-[11px] font-bold
                      shadow-lg backdrop-blur-md transition hover:brightness-110
                      ${estiloEstado.fondo} ${estiloEstado.texto} ${estiloEstado.borde}
                    `}
                  >
                    <span className={`h-2 w-2 rounded-full ${estiloEstado.punto}`} />
                    {estiloEstado.etiqueta}
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="sigtad-menu-reveal absolute left-0 top-full z-40 mt-2 min-w-44 rounded-xl border border-white/25 bg-emerald-950/95 p-1.5 text-white shadow-xl backdrop-blur-md">
                    {transicionesDisponibles.map((transicion) => (
                      <button
                        key={transicion.estado}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          abrirConfirmacion(emprendimiento, transicion, event.currentTarget);
                        }}
                        disabled={idProcesando !== null || eliminando}
                        className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {transicion.texto}
                      </button>
                    ))}
                  </div>
                </details>
              ) : (
                <span
                  className={`
                    inline-flex items-center gap-2 rounded-full border px-3 py-1.5
                    text-[11px] font-bold shadow-lg backdrop-blur-md
                    ${estiloEstado.fondo} ${estiloEstado.texto} ${estiloEstado.borde}
                  `}
                >
                  <span className={`h-2 w-2 rounded-full ${estiloEstado.punto}`} />
                  {estiloEstado.etiqueta}
                </span>
              )}
            </div>

            {/* Categoría */}
            {nombreCategoria && (
              <div className="absolute bottom-4 left-4 max-w-[calc(100%-5rem)]">
                <span className="inline-flex max-w-full items-center truncate rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md">
                  {nombreCategoria}
                </span>
              </div>
            )}

            {/* Indicador público */}
            {estaPublicado && !esAdministrador && (
              <div className="absolute bottom-4 right-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-md">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.01 9.964 7.178.07.21.07.434 0 .644C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.01-9.964-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </span>
              </div>
            )}
          </div>

          {/* =========================
              CONTENIDO
          ========================== */}
<div className="flex flex-col p-4">
              {/* Título */}
            <div className="min-h-0">
<h2 className="line-clamp-2 min-h-[3rem] shrink-0 text-base font-bold leading-6 text-[#095540] transition-colors duration-200 group-hover:text-[#009444]">                {emprendimiento.nombre}
              </h2>

              {emprendimiento.descripcion && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
                  {emprendimiento.descripcion}
                </p>
              )}
            </div>

            {/* Información */}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              {ubicacion && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.8"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Ubicación
                    </p>

                    <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-700">
                      {ubicacion}
                    </p>
                  </div>
                </div>
              )}

             {emprendimiento.telefono && (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      abrirWhatsApp(emprendimiento.telefono!);
    }}
    className="group/telefono flex w-full items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2"
    aria-label={`Contactar por WhatsApp al ${emprendimiento.telefono}`}
  >
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 motion-safe:transition-colors motion-safe:duration-200 group-hover/telefono:bg-emerald-50 group-hover/telefono:text-emerald-700">
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.8"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.826-1.07-5.02-3.264-6.09-6.09l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
        />
      </svg>
    </div>

    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        WhatsApp
      </p>

      <p className="mt-0.5 truncate text-xs font-semibold text-emerald-700 underline-offset-2 group-hover/telefono:underline">
        {emprendimiento.telefono}
      </p>
    </div>
  </button>
)}

              {emprendimiento.correoElectronico && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.8"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
              
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Correo
                    </p>

                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">
                      {emprendimiento.correoElectronico}
                    </p>
                  </div>
                </div>
                
              )}
              
            </div>
          </div>


          {/* =========================
    MAPA DE UBICACIÓN
========================== */}
<div className="mt-3 border-t border-slate-100 px-4 pt-3">
  <div className="mb-2 flex items-center gap-2">
    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.8"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
        />
      </svg>
    </div>

    <div>
    
<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
  Ubicación en el mapa
</p>

<p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
  Ver mapa en el detalle
</p>

    </div>
  </div>

<div className="relative flex h-20 items-center justify-center overflow-hidden rounded-2xl border border-emerald-900/10 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(209,250,229,0.72))] shadow-inner dark:border-emerald-300/15 dark:bg-[linear-gradient(135deg,rgba(6,45,35,0.98),rgba(8,70,52,0.95))]">
  <div
    className="absolute inset-0 opacity-40 dark:opacity-30 [background-image:linear-gradient(rgba(5,150,105,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(5,150,105,.18)_1px,transparent_1px)] dark:[background-image:linear-gradient(rgba(110,231,183,.15)_1px,transparent_1px),linear-gradient(90deg,rgba(110,231,183,.15)_1px,transparent_1px)] [background-size:18px_18px]"
    aria-hidden="true"
  />

  <span className="relative inline-flex items-center gap-2 rounded-full border border-emerald-700/15 bg-white/75 px-3 py-1.5 text-xs font-bold text-emerald-900 backdrop-blur-sm dark:border-emerald-300/20 dark:bg-emerald-950/90 dark:text-emerald-100">
    <svg
      className="h-4 w-4 text-emerald-700 dark:text-emerald-300"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s7.5-5.646 7.5-12a7.5 7.5 0 1 0-15 0c0 6.354 7.5 12 7.5 12Z"
      />
      <circle cx="12" cy="9" r="2.25" />
    </svg>
    Ver mapa en el detalle
  </span>
</div>
</div> {/* Cierre del contenedor MAPA DE UBICACIÓN */}





          {/* =========================
              ACCIONES
          ========================== */}
          {(esAdministrador || (puedeEditar && onEditar)) && (
<div className="mt-auto border-t border-slate-100 bg-slate-50/70 p-4">              {esAdministrador && (
                <div className="space-y-2.5">
                  {transicionesDisponibles.map((transicion) => {
                    const esEstaTransicionProcesando =
                      estaProcesando &&
                      transicionSeleccionada?.estado === transicion.estado;

                    const estiloBoton =
                      transicion.accion === 'publicar'
                        ? 'bg-emerald-800 text-white shadow-sm hover:bg-emerald-900 focus-visible:ring-emerald-700'
                        : transicion.accion === 'ocultar'
                        ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 focus-visible:ring-amber-500'
                        : transicion.accion === 'desactivar'
                        ? 'border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 focus-visible:ring-rose-500'
                        : 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 focus-visible:ring-emerald-500';

                    return (
                      <button
                        key={transicion.estado}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          abrirConfirmacion(
                            emprendimiento,
                            transicion,
                            event.currentTarget,
                          );
                        }}
                        disabled={
                          idProcesando !== null || eliminando
                        }
                        aria-haspopup="dialog"
                        aria-busy={esEstaTransicionProcesando}
                        aria-label={`${transicion.texto} - ${emprendimiento.nombre}`}
                        className={`
                          flex w-full items-center justify-center gap-2
                          rounded-xl px-4 py-2.5
                          text-xs font-bold
                          motion-safe:transition-all motion-safe:duration-200
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-offset-2
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                          ${estiloBoton}
                        `}
                      >
                        {esEstaTransicionProcesando ? (
                          <>
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin motion-reduce:animate-none" />
                            Actualizando...
                          </>
                        ) : (
                          <>
                            {transicion.accion === 'publicar' && (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.75l4.5 4.5L19 7.75" />
                              </svg>
                            )}
                            {transicion.accion === 'ocultar' && (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12l6-6m-6 6l6 6" />
                              </svg>
                            )}
                            {transicion.accion === 'desactivar' && (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.36 6.64a9 9 0 11-12.73 0M12 3v9" />
                              </svg>
                            )}
                            {(transicion.accion === 'activar' || transicion.accion === 'enviar') && (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            )}

                            {transicion.texto}
                          </>
                        )}
                      </button>
                    );
                  })}

                  <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:grid-cols-1 md:grid-cols-2">
                    {puedeEditar && onEditar && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (
                            idProcesando !== null ||
                            eliminando
                          )
                            return;

                          onEditar(emprendimiento);
                        }}
                        disabled={
                          idProcesando !== null || eliminando
                        }
                        className="
                          inline-flex items-center justify-center gap-2
                          rounded-xl
                          border border-slate-200
                          bg-white
                          px-3 py-2.5
                          text-xs font-bold text-slate-700
                          shadow-sm
                          motion-safe:transition-colors motion-safe:duration-200
                          hover:border-slate-300
                          hover:bg-slate-50
                          hover:text-slate-900
                          focus-visible:outline-none
                          focus-visible:ring-2 focus-visible:ring-slate-400
                          focus-visible:ring-offset-2
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                          />
                        </svg>
                        Editar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setErrorEliminacion(null);
                        setMensajeAccion(null);
                        setEmprendimientoAEliminar(
                          emprendimiento,
                        );
                      }}
                      disabled={
                        eliminando || idProcesando !== null
                      }
                      className="
                        inline-flex items-center justify-center gap-2
                        rounded-xl
                        border border-rose-200
                        bg-white
                        px-3 py-2.5
                        text-xs font-bold text-rose-700
                        motion-safe:transition-colors motion-safe:duration-200
                        hover:border-rose-300
                        hover:bg-rose-50
                        hover:text-rose-800
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-rose-400
                        focus-visible:ring-offset-2
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </div>
              )}

              {!esAdministrador && puedeEditar && onEditar && (
                <div>
                  <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (
                      idProcesando !== null ||
                      eliminando
                    )
                      return;

                    onEditar(emprendimiento);
                  }}
                  disabled={
                    idProcesando !== null || eliminando
                  }
                  className="
                    flex w-full items-center justify-center gap-2
                    rounded-xl
                    border border-emerald-200
                    bg-white
                    px-4 py-2.5
                    text-xs font-bold text-emerald-800
                    shadow-sm
                    motion-safe:transition-colors motion-safe:duration-200
                    hover:border-emerald-300
                    hover:bg-emerald-50
                    hover:text-emerald-900
                    focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-emerald-500
                    focus-visible:ring-offset-2
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                  >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                    />
                  </svg>

                  Editar emprendimiento
                  </button>
                </div>
              )}
            </div>
          )}
        </article>
      );
    })}
    </div>
  </ScrollReveal>
)}



        {/* MODAL CAMBIO ESTADO */}
        {cargandoDetalle &&
    createPortal(
      <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-[#052f25]/60 p-4 backdrop-blur-sm" role="status" aria-live="polite">
        <div className="rounded-2xl bg-white/95 px-5 py-4 text-sm font-semibold text-[#095540] shadow-xl">Cargando detalle...</div>
      </div>,
      document.body,
    )}

      {detalleSeleccionado && (() => {
  const imagenes = detalleSeleccionado.imagenes?.length
    ? detalleSeleccionado.imagenes
    : detalleSeleccionado.imagen
      ? [{ id: 0, imagen: detalleSeleccionado.imagen, esPortada: true }]
      : [];
  const indice = Math.min(imagenDetalle, Math.max(imagenes.length - 1, 0));
  const imagenActual = imagenes[indice];
  const ubicacionDetalle = obtenerUbicacion(detalleSeleccionado);
 
  // Se monta en <body> para quedar por encima del navbar y fijo en pantalla.
  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center overscroll-contain bg-[#052f25]/70 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-detalle-emprendimiento"
      onClick={() => setDetalleSeleccionado(null)}
    >
      {/* Tarjeta fija: no se mueve, solo se desplaza el cuerpo */}
      <div
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-[#fffef9] text-slate-800 shadow-[0_24px_70px_rgba(5,47,37,0.3)] sm:max-h-[calc(100dvh-3rem)] dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Encabezado fijo */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#095540]/10 px-6 py-4 sm:px-8 sm:py-5 dark:border-white/10">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#009444]">Detalle del emprendimiento</p>
            <h2 id="titulo-detalle-emprendimiento" className="mt-1 break-words font-brand text-xl font-bold text-[#095540] sm:text-2xl">{detalleSeleccionado.nombre}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setDetalleSeleccionado(null)} className="rounded-full p-2 text-[#095540] hover:bg-[#8DC63F]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444]" aria-label="Cerrar detalles">×</button>
          </div>
        </div>
 
        {/* Cuerpo: lo único que se desplaza */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
          <div className="space-y-5">
            {imagenActual && (
              <div>
                <img src={imagenActual.imagen} alt={detalleSeleccionado.nombre} className="h-56 w-full rounded-2xl object-cover shadow-md sm:h-64" />
                {imagenes.length > 1 && <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setImagenDetalle((actual) => (actual - 1 + imagenes.length) % imagenes.length)} className="rounded-xl border border-[#095540]/15 bg-white px-3 py-2 text-xs font-bold text-[#095540] hover:bg-[#8DC63F]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444]" aria-label="Ver imagen anterior">Anterior</button>
                  {imagenes.map((imagen, indiceMiniatura) => <button key={imagen.id || imagen.imagen} type="button" onClick={() => setImagenDetalle(indiceMiniatura)} className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${indiceMiniatura === indice ? 'border-[#009444]' : 'border-transparent'}`} aria-label={`Ver imagen ${indiceMiniatura + 1}`}><img src={imagen.imagen} alt="" className="h-full w-full object-cover" /></button>)}
                  <button type="button" onClick={() => setImagenDetalle((actual) => (actual + 1) % imagenes.length)} className="rounded-xl border border-[#095540]/15 bg-white px-3 py-2 text-xs font-bold text-[#095540] hover:bg-[#8DC63F]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444]" aria-label="Ver imagen siguiente">Siguiente</button>
                </div>}
                <div className="mt-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#009444]">Ubicación en el mapa</p>
                  <MapaUbicacion latitud={detalleSeleccionado.latitud} longitud={detalleSeleccionado.longitud} nombre={detalleSeleccionado.nombre} />
                </div>
              </div>
            )}
            {!imagenActual && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#009444]">Ubicación en el mapa</p>
                <MapaUbicacion latitud={detalleSeleccionado.latitud} longitud={detalleSeleccionado.longitud} nombre={detalleSeleccionado.nombre} />
              </div>
            )}
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              {detalleSeleccionado.descripcion && <p className="sm:col-span-2 text-sm leading-6 text-slate-600">{detalleSeleccionado.descripcion}</p>}
              {ubicacionDetalle && <p className="text-sm text-slate-700 dark:text-slate-200"><strong className="block text-xs uppercase tracking-wider text-slate-400">Ubicación</strong>{ubicacionDetalle}</p>}
              {/* {detalleSeleccionado.direccion && <p className="text-sm text-slate-700"><strong className="block text-xs uppercase tracking-wider text-slate-400">Ubicación</strong>{detalleSeleccionado.direccion}</p>} */}
              {detalleSeleccionado.telefono && (
                <button
                  type="button"
                  onClick={() => abrirWhatsApp(detalleSeleccionado.telefono!)}
                  className="rounded-lg text-left text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2"
                  aria-label={`Contactar por WhatsApp al ${detalleSeleccionado.telefono}`}
                >
                  <strong className="block text-xs uppercase tracking-wider text-slate-400">
                    WhatsApp
                  </strong>
 
                  <span className="font-semibold text-emerald-700 underline-offset-2 hover:underline">
                    {detalleSeleccionado.telefono}
                  </span>
                </button>
              )}
              {detalleSeleccionado.correoElectronico && <p className="text-sm text-slate-700"><strong className="block text-xs uppercase tracking-wider text-slate-400">Correo</strong>{detalleSeleccionado.correoElectronico}</p>}
             
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
})()}


        {emprendimientoSeleccionado && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-emerald-950/65 p-4 backdrop-blur-sm starting:opacity-0 motion-safe:transition-opacity motion-safe:duration-200 motion-reduce:backdrop-blur-none"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) cerrarConfirmacion();
            }}
          >
            <div
              ref={dialogoConfirmacion}
              className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/60 bg-[#fffef9] p-6 shadow-2xl starting:scale-[0.98] starting:opacity-0 motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-reduce:transform-none sm:p-7"
              role="dialog"
              tabIndex={-1}
              aria-busy={idProcesando !== null}
              aria-modal="true"
              aria-labelledby="titulo-confirmacion-publicacion"
              aria-describedby="detalle-confirmacion-publicacion"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0Z" />
                </svg>
              </div>

              <h2 id="titulo-confirmacion-publicacion" className="text-xl font-bold text-slate-900">
                Confirmar cambio de estado
              </h2>

              <p id="detalle-confirmacion-publicacion" className="mt-2 text-sm leading-relaxed text-slate-600">
                ¿Deseas{' '}
                <strong className="text-slate-900">
                  {transicionSeleccionada?.texto.toLowerCase()}
                </strong>{' '}
                el emprendimiento{' '}
               <strong className="text-slate-900">
  {emprendimientoSeleccionado.nombre}
</strong>
                ?
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  autoFocus
                  onClick={cerrarConfirmacion}
                  disabled={idProcesando !== null}
                  className="flex-1 rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 motion-safe:transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => void confirmarCambioPublicacion()}
                  disabled={idProcesando !== null}
                  className="flex-1 rounded-2xl bg-emerald-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm motion-safe:transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {idProcesando !== null ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ELIMINAR */}
        {emprendimientoAEliminar && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-emerald-950/65 p-4 backdrop-blur-sm starting:opacity-0 motion-safe:transition-opacity motion-safe:duration-200 motion-reduce:backdrop-blur-none"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !eliminando) setEmprendimientoAEliminar(null);
            }}
          >
            <div
              className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/60 bg-[#fffef9] p-6 shadow-2xl starting:scale-[0.98] starting:opacity-0 motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-reduce:transform-none sm:p-7"
              role="dialog"
              tabIndex={-1}
              aria-busy={eliminando}
              aria-modal="true"
              aria-labelledby="titulo-eliminar-emprendimiento"
              aria-describedby="detalle-eliminar-emprendimiento"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
              </div>

              <h2 id="titulo-eliminar-emprendimiento" className="text-xl font-bold text-stone-900">
                Eliminar emprendimiento
              </h2>

              <p id="detalle-eliminar-emprendimiento" className="mt-2 text-sm leading-relaxed text-stone-600">
                ¿Estás seguro de que deseas eliminar{' '}
                <strong className="text-slate-900">
                  {emprendimientoAEliminar.nombre}
                </strong>
                ? Esta acción es irreversible.
              </p>

              {errorEliminacion && (
                <p
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800"
                  role="alert"
                  aria-live="assertive"
                >
                  {errorEliminacion}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setEmprendimientoAEliminar(null)}
                  disabled={eliminando}
                  className="flex-1 rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 motion-safe:transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => void confirmarEliminacion()}
                  disabled={eliminando}
                  className="flex-1 rounded-2xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm motion-safe:transition-colors hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {eliminando ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ListaEmprendimientos;
