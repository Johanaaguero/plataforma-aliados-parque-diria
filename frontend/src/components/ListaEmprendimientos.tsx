import { useEffect, useState } from 'react';
import {
  obtenerEmprendimientos,
  type Emprendimiento,
} from '../services/emprendimientoService';

type NombreRol = 'administrador' | 'asociado' | 'visitante';

interface Props {
  rolAutenticado: NombreRol | null;
  onRegistrar?: () => void;
  onRegistrarCategoria?: () => void;
}

type EstadoEmprendimiento =
  | 'pendiente'
  | 'publicado'
  | 'rechazado';

function ListaEmprendimientos({
  rolAutenticado,
  onRegistrar,
  onRegistrarCategoria,
}: Props) {
  const [emprendimientos, setEmprendimientos] = useState<
    Emprendimiento[]
  >([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const esAdministrador =
    rolAutenticado === 'administrador';

  const esAsociado =
    rolAutenticado === 'asociado';

  const puedeRegistrar =
    esAdministrador || esAsociado;

  // ============================================================
  // CARGAR EMPRENDIMIENTOS
  // ============================================================

  useEffect(() => {
    const cargarEmprendimientos = async () => {
      try {
        setCargando(true);
        setError(null);

        let data: Emprendimiento[];

        if (
          rolAutenticado === 'administrador' ||
          rolAutenticado === 'asociado'
        ) {
          data = await obtenerEmprendimientos();
        } else {
          data = await obtenerEmprendimientos('publicado');
        }

        setEmprendimientos(data);
      } catch (err: any) {
        setError(
          err.message ||
            'No se pudieron cargar los emprendimientos'
        );
      } finally {
        setCargando(false);
      }
    };

    void cargarEmprendimientos();
  }, [rolAutenticado]);

  // ============================================================
  // CAMBIAR ESTADO
  // ============================================================

  const cambiarEstado = (
    id: number,
    nuevoEstado: EstadoEmprendimiento
  ) => {
    if (!esAdministrador) {
      return;
    }

    setEmprendimientos((actuales) =>
      actuales.map((emprendimiento) =>
        emprendimiento.id === id
          ? {
              ...emprendimiento,
              estadoPublicacion: nuevoEstado,
            }
          : emprendimiento
      )
    );
  };

  // ============================================================
  // ESTILOS DE ESTADO
  // ============================================================

  const obtenerEstiloEstado = (estado: string) => {
    switch (estado) {
      case 'publicado':
        return {
          fondo: 'bg-emerald-50',
          texto: 'text-emerald-700',
          borde: 'border-emerald-200',
          punto: 'bg-emerald-500',
          etiqueta: 'Publicado',
        };

      case 'rechazado':
        return {
          fondo: 'bg-red-50',
          texto: 'text-red-700',
          borde: 'border-red-200',
          punto: 'bg-red-500',
          etiqueta: 'Rechazado',
        };

      case 'pendiente':
      default:
        return {
          fondo: 'bg-amber-50',
          texto: 'text-amber-700',
          borde: 'border-amber-200',
          punto: 'bg-amber-500',
          etiqueta: 'Pendiente',
        };
    }
  };

  // ============================================================
  // CANTIDADES
  // ============================================================

  const cantidadPendientes = emprendimientos.filter(
    (e) => e.estadoPublicacion === 'pendiente'
  ).length;

  const cantidadPublicados = emprendimientos.filter(
    (e) => e.estadoPublicacion === 'publicado'
  ).length;

  const cantidadRechazados = emprendimientos.filter(
    (e) => e.estadoPublicacion === 'rechazado'
  ).length;

  // ============================================================
  // CARGANDO
  // ============================================================

  if (cargando) {
    return (
      <section className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />
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

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <section className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              No se pudieron cargar los emprendimientos
            </h2>
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">

       {/* ENCABEZADO */}
<div className="mb-10 overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-800 px-7 py-8 text-white shadow-lg sm:px-10">
  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

    <div className="max-w-3xl">
      
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-100">
        <span className="h-2 w-2 rounded-full bg-emerald-300" />

        {esAdministrador
          ? 'Panel de administración'
          : esAsociado
            ? 'Panel de asociado'
            : 'Comunidad Diriá'}
      </div>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Emprendimientos locales
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
        {esAdministrador
          ? 'Administre los emprendimientos registrados y gestione su estado de publicación.'
          : esAsociado
            ? 'Consultá y registrá emprendimientos de la comunidad. El estado de publicación es gestionado por los administradores.'
            : 'Conocé los emprendimientos publicados de la comunidad alrededor del Parque Nacional Diriá.'}
      </p>
    </div>

    {/* ============================================================
        BOTONES DE REGISTRO
    ============================================================ */}

    <div className="flex flex-col gap-3 sm:flex-row">

      {/* ============================================================
          REGISTRAR CATEGORÍA
          SOLO ADMINISTRADOR
      ============================================================ */}

      {esAdministrador && onRegistrarCategoria && (
        <button
          type="button"
          onClick={onRegistrarCategoria}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-lg"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>

          Registrar categoría
        </button>
      )}

      {/* ============================================================
          REGISTRAR EMPRENDIMIENTO
          ADMINISTRADOR + ASOCIADO
      ============================================================ */}

      {puedeRegistrar && onRegistrar && (
        <button
          type="button"
          onClick={onRegistrar}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-900 shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-lg"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>

          Registrar emprendimiento
        </button>
      )}

    </div>

  </div>
</div>

        {/* INFORMACIÓN PARA ASOCIADO */}
        {esAsociado && (
          <div className="mb-8 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Gestión de emprendimientos
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Podés registrar nuevos emprendimientos y consultar todos los emprendimientos registrados. El cambio de estado corresponde exclusivamente al administrador.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* INFORMACIÓN PARA VISITANTES */}
        {!rolAutenticado && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.25 functioning-card-pattern..." />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.25a.75.75 0 01-.75-.75V6.108c0-.28.16-.531.413-.647l8.25-3.75a.75.75 0 01.674 0l8.25 3.75c.253.116.413.367.413.647V20.25a.75.75 0 01-.75.75H13.5z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Emprendimientos publicados
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Estos son los emprendimientos actualmente disponibles para el público.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* RESUMEN ADMINISTRATIVO */}
        {esAdministrador && emprendimientos.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* TOTAL */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total registrados</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{emprendimientos.length}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75V12zm0 5.25h.007v.008H3.75v-.008z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* PENDIENTES */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Pendientes</p>
                  <p className="mt-1 text-3xl font-bold text-amber-900">{cantidadPendientes}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* PUBLICADOS */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Publicados</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-900">{cantidadPublicados}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* RECHAZADOS */}
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Rechazados</p>
                  <p className="mt-1 text-3xl font-bold text-red-900">{cantidadRechazados}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SIN EMPRENDIMIENTOS */}
        {emprendimientos.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.008v.008H6.75V6.75zm0 3h.008v.008H6.75V9.75zm0 3h.008v.008H6.75v-.008zm0 3h.008v.008H6.75v-.008zm0 3h.008v.008H6.75v-.008zm3.75-12h.008v.008h-.008V6.75zm0 3h.008v.008h-.008V9.75zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {esAdministrador
                ? 'No hay emprendimientos registrados'
                : esAsociado
                  ? 'No hay emprendimientos registrados'
                  : 'No hay emprendimientos publicados'}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
              {esAdministrador
                ? 'Comience registrando el primer emprendimiento de la comunidad.'
                : esAsociado
                  ? 'Podés registrar el primer emprendimiento de la comunidad.'
                  : 'Actualmente no hay emprendimientos publicados para mostrar.'}
            </p>
            {puedeRegistrar && onRegistrar && (
              <button
                type="button"
                onClick={onRegistrar}
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Registrar primer emprendimiento
              </button>
            )}
          </div>
        )}

        {/* TARJETAS DE EMPRENDIMIENTO */}
        {emprendimientos.length > 0 && (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
            {emprendimientos.map((emprendimiento) => {
              const estiloEstado = obtenerEstiloEstado(
                emprendimiento.estadoPublicacion
              );

              return (
                <article
                  key={emprendimiento.id}
                  className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* IMAGEN O PLACEHOLDER */}
                  <div className="relative h-56 overflow-hidden bg-slate-100">
                    {emprendimiento.imagen ? (
                      <img
                        src={emprendimiento.imagen}
                        alt={emprendimiento.nombre}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                    )}

                    {/* INSIGNIA DE ESTADO */}
                    <div className="absolute left-4 top-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm ${estiloEstado.fondo} ${estiloEstado.texto} ${estiloEstado.borde}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${estiloEstado.punto}`} />
                        {estiloEstado.etiqueta}
                      </span>
                    </div>
                  </div>

                  {/* CONTENIDO */}
                  <div className="p-6">
                    {emprendimiento.categoria && (
                      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                        {emprendimiento.categoria}
                      </span>
                    )}

                    <h2 className="mt-3 text-xl font-bold text-slate-900">
                      {emprendimiento.nombre}
                    </h2>

                    {emprendimiento.descripcion && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {emprendimiento.descripcion}
                      </p>
                    )}

                    {/* DATOS DE CONTACTO */}
                    <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                      {emprendimiento.direccion && (
                        <div className="flex items-start gap-3 text-sm text-slate-600">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          <span>{emprendimiento.direccion}</span>
                        </div>
                      )}

                      {emprendimiento.telefono && (
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.826-1.07-5.02-3.264-6.09-6.09l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                          <span>{emprendimiento.telefono}</span>
                        </div>
                      )}

                      {emprendimiento.correoElectronico && (
                        <div className="flex items-start gap-3 break-all text-sm text-slate-600">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                          <span>{emprendimiento.correoElectronico}</span>
                        </div>
                      )}
                    </div>

                    {/* PANEL DE ESTADO ASOCIADO */}
                    {esAsociado && (
                      <div className={`mt-6 rounded-2xl border p-4 ${estiloEstado.fondo} ${estiloEstado.borde}`}>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${estiloEstado.punto} text-white`}>
                            {estiloEstado.etiqueta === 'Publicado' ? (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            ) : estiloEstado.etiqueta === 'Rechazado' ? (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5" /></svg>
                            )}
                          </div>
                          <div>
                            <p className={`text-xs font-semibold uppercase tracking-wide ${estiloEstado.texto}`}>
                              Estado actual
                            </p>
                            <p className={`text-sm font-bold ${estiloEstado.texto}`}>
                              {estiloEstado.etiqueta}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CONTROLES ADMINISTRADOR */}
                    {esAdministrador && (
                      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3">
                          <p className="text-sm font-bold text-slate-800">
                            Estado de publicación
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Solo el administrador puede modificar este estado.
                          </p>
                        </div>

                        <select
                          value={emprendimiento.estadoPublicacion}
                          onChange={(e) =>
                            cambiarEstado(
                              emprendimiento.id,
                              e.target.value as EstadoEmprendimiento
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        >
                          <option value="pendiente">Pendiente de revisión</option>
                          <option value="publicado">Publicado</option>
                          <option value="rechazado">Rechazado</option>
                        </select>

                        <p className="mt-2 text-xs text-slate-400">
                          El cambio es visual y todavía no se guarda en la base de datos.
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default ListaEmprendimientos;