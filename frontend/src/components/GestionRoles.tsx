import { useEffect, useMemo, useState } from 'react';

type NombreRol =
  | 'super_admin'
  | 'administrador'
  | 'asociado'
  | 'visitante';

type FiltroRol =
  | 'todos'
  | 'superadmin'
  | NombreRol;

interface UsuarioRol {
  id: number;
  nombreUsuario: string;
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  rol: NombreRol | null;
}

const obtenerToken = () =>
  sessionStorage.getItem('token') ?? localStorage.getItem('token');

const limpiarToken = () => {
  sessionStorage.removeItem('token');
  localStorage.removeItem('token');
};

export default function GestionRoles() {
  const [usuarios, setUsuarios] = useState<UsuarioRol[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<FiltroRol>('todos');
  const [mostrarFiltroRol, setMostrarFiltroRol] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | ''>('');
  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState<UsuarioRol | null>(null);
  const [nuevoRol, setNuevoRol] = useState<NombreRol | ''>('');
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);

  const [mostrarSelectorRol, setMostrarSelectorRol] = useState(false);

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      setMensaje('');
      setTipoMensaje('');

      const token = obtenerToken();

      if (!token) {
        setMensaje('La sesión no está disponible');
        setTipoMensaje('error');
        return;
      }

      const respuesta = await fetch(
        'http://localhost:3000/api/users/roles',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const resultado = await respuesta.json();

      if (respuesta.status === 401) {
        limpiarToken();
        setMensaje('La sesión expiró o no es válida');
        setTipoMensaje('error');
        return;
      }

      if (respuesta.status === 403) {
        setMensaje(
          resultado.message ??
            'No tiene permisos para realizar esta operación'
        );
        setTipoMensaje('error');
        return;
      }

      if (!respuesta.ok) {
        throw new Error(
          resultado.message ?? 'No se pudieron cargar los usuarios'
        );
      }

      setUsuarios(resultado.data ?? []);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setMensaje('No se pudieron cargar los usuarios');
      setTipoMensaje('error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarUsuarios();
  }, []);

  const esSuperAdministrador = (usuario: UsuarioRol) =>
    usuario.rol === 'super_admin';

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const nombreCompleto = `${usuario.nombre} ${usuario.apellidos}`
        .trim()
        .toLowerCase();

      const coincideBusqueda =
        !texto ||
        usuario.nombreUsuario.toLowerCase().includes(texto) ||
        usuario.nombre.toLowerCase().includes(texto) ||
        usuario.apellidos.toLowerCase().includes(texto) ||
        nombreCompleto.includes(texto) ||
        usuario.correo.toLowerCase().includes(texto);

      let coincideRol = true;

      if (filtroRol === 'superadmin') {
        coincideRol = esSuperAdministrador(usuario);
      } else if (filtroRol !== 'todos') {
        coincideRol = usuario.rol === filtroRol;
      }

      return coincideBusqueda && coincideRol;
    });
  }, [usuarios, busqueda, filtroRol]);

  const tamanoPagina = 10;
  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / tamanoPagina));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const usuariosPaginados = usuariosFiltrados.slice(
    (paginaSegura - 1) * tamanoPagina,
    paginaSegura * tamanoPagina,
  );

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroRol]);

  const cantidadSuperAdministradores = usuarios.filter(
    (usuario) => esSuperAdministrador(usuario)
  ).length;

  const cantidadAdministradores = usuarios.filter(
    (usuario) => usuario.rol === 'administrador'
  ).length;

  const cantidadAsociados = usuarios.filter(
    (usuario) => usuario.rol === 'asociado'
  ).length;

  const cantidadVisitantes = usuarios.filter(
    (usuario) => usuario.rol === 'visitante'
  ).length;

  const abrirCambioRol = (usuario: UsuarioRol) => {
    if (esSuperAdministrador(usuario)) {
      return;
    }

    setUsuarioSeleccionado(usuario);
    setNuevoRol(usuario.rol ?? '');
    setMensaje('');
    setTipoMensaje('');
    setMostrarConfirmacion(false);
    setMostrarSelectorRol(false);
  };

  const cerrarCambioRol = () => {
    if (guardando) return;

    setUsuarioSeleccionado(null);
    setNuevoRol('');
    setMostrarConfirmacion(false);
    setMostrarSelectorRol(false);
  };

  const confirmarCambioRol = () => {
    if (!usuarioSeleccionado || !nuevoRol) {
      setMensaje('Selecciona un rol válido');
      setTipoMensaje('error');
      return;
    }

    if (nuevoRol === usuarioSeleccionado.rol) {
      setMensaje('El usuario ya tiene ese rol');
      setTipoMensaje('error');
      return;
    }

    setMensaje('');
    setTipoMensaje('');
    setMostrarSelectorRol(false);
    setMostrarConfirmacion(true);
  };

  const actualizarRol = async () => {
    if (!usuarioSeleccionado || !nuevoRol) {
      setMensaje('Selecciona un rol válido');
      setTipoMensaje('error');
      return;
    }

    if (esSuperAdministrador(usuarioSeleccionado)) {
      setMensaje('El Super Administrador no puede cambiar de rol.');
      setTipoMensaje('error');
      return;
    }

    try {
      setGuardando(true);
      setMensaje('');
      setTipoMensaje('');

      const token = obtenerToken();

      if (!token) {
        setMensaje('La sesión no está disponible');
        setTipoMensaje('error');
        return;
      }

      const respuesta = await fetch(
        `http://localhost:3000/api/users/${usuarioSeleccionado.id}/role`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rol: nuevoRol,
          }),
        }
      );

      const resultado = await respuesta.json();

      if (respuesta.status === 401) {
        limpiarToken();
        setMensaje('La sesión expiró o no es válida');
        setTipoMensaje('error');
        return;
      }

      if (respuesta.status === 403) {
        setMensaje(
          resultado.message ??
            'No tiene permisos para realizar esta operación'
        );
        setTipoMensaje('error');
        return;
      }

      if (!respuesta.ok) {
        setMensaje(
          resultado.message ?? 'No se pudo actualizar el rol'
        );
        setTipoMensaje('error');
        return;
      }

      setUsuarios((usuariosActuales) =>
        usuariosActuales.map((usuario) =>
          usuario.id === usuarioSeleccionado.id
            ? {
                ...usuario,
                rol: resultado.data?.rolNuevo ?? nuevoRol,
              }
            : usuario
        )
      );

      setMensaje('Rol actualizado correctamente');
      setTipoMensaje('exito');
      setUsuarioSeleccionado(null);
      setNuevoRol('');
      setMostrarConfirmacion(false);
      setMostrarSelectorRol(false);
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      setMensaje('No se pudo conectar con el servidor');
      setTipoMensaje('error');
    } finally {
      setGuardando(false);
    }
  };

  const obtenerEstiloRol = (rol: NombreRol | null) => {
    switch (rol) {
      case 'administrador':
        return {
          clase:
            'border-[#009444]/25 bg-[#009444]/10 text-[#095540]',
          punto: 'bg-[#009444]',
          texto: 'Administrador',
        };

      case 'asociado':
        return {
          clase:
            'border-[#8dc63f]/35 bg-[#8dc63f]/15 text-[#567d16]',
          punto: 'bg-[#8dc63f]',
          texto: 'Asociado',
        };

      case 'visitante':
        return {
          clase:
            'border-[#d9d823]/45 bg-[#d9d823]/15 text-[#6e6c00]',
          punto: 'bg-[#d9d823]',
          texto: 'Visitante',
        };

      default:
        return {
          clase:
            'border-slate-200 bg-slate-50 text-slate-600',
          punto: 'bg-slate-400',
          texto: 'Sin rol',
        };
    }
  };

  const obtenerNombreRol = (rol: NombreRol | '') => {
    switch (rol) {
      case 'administrador':
        return 'Administrador';
      case 'asociado':
        return 'Asociado';
      case 'visitante':
        return 'Visitante';
      default:
        return 'Selecciona un rol';
    }
  };

  const nombreFiltroActual = () => {
    switch (filtroRol) {
      case 'superadmin':
        return 'Super Admin';
      case 'administrador':
        return 'Administradores';
      case 'asociado':
        return 'Asociados';
      case 'visitante':
        return 'Visitantes';
      default:
        return 'Todos los usuarios';
    }
  };

  return (
    <section className="min-h-screen overflow-x-clip bg-[#f5f7f1] px-4 py-8 font-sans sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* ENCABEZADO */}
        <div className="relative z-10 mb-8 overflow-hidden rounded-3xl border border-white/20 bg-white/70 px-5 py-8 text-[#073f31] shadow-lg shadow-black/5 backdrop-blur-md sm:px-10 dark:border-white/10 dark:bg-emerald-950/40 dark:text-white">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#8dc63f]/15 blur-3xl"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-[#00AEEF]/[0.08] blur-3xl"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8dc63f]/35 bg-[#8dc63f]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#095540] backdrop-blur-md dark:text-[#c8ee8d]">
              <span className="h-2 w-2 rounded-full bg-[#d9d823]" />
              Gestión de usuarios
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Gestión de Roles
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              Consulta los usuarios y el rol asignado a cada uno.
            </p>
          </div>
        </div>

        {/* BUSCADOR Y FILTROS */}
        <div className="relative z-40 mb-8 rounded-3xl border border-[#095540]/10 bg-white p-4 shadow-[0_12px_35px_rgba(9,85,64,0.07)] sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">

            {/* BUSCADOR */}
            <div className="flex-1">
              <label
                className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#095540]"
                htmlFor="busqueda"
              >
                Buscar usuario
              </label>

              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
                  />
                </svg>

                <input
                  id="busqueda"
                  type="text"
                  placeholder="Nombre, usuario o correo"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full rounded-2xl border border-[#095540]/15 bg-[#f7faf5] py-3 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-slate-400 focus-visible:border-[#009444] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#009444]/15"
                />
              </div>
            </div>

            {/* FILTRO POR ROL */}
            <div className="relative z-50 w-full md:w-auto md:min-w-[250px]">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#095540]">
                Filtrar por
              </span>

              <button
                type="button"
                onClick={() =>
                  setMostrarFiltroRol((actual) => !actual)
                }
                aria-expanded={mostrarFiltroRol}
                aria-haspopup="listbox"
                className="group flex min-h-[50px] w-full items-center justify-between gap-4 rounded-2xl border border-[#095540]/15 bg-[#f7faf5] px-4 text-left shadow-sm transition-all duration-200 hover:border-[#009444]/40 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/15"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#009444]/10 text-[#08743f] transition-colors group-hover:bg-[#009444]/15">
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
                        d="M3 5.25h18M6.75 12h10.5M10.5 18h3"
                      />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Rol
                    </p>

                    <p className="truncate text-sm font-bold text-[#095540]">
                      {nombreFiltroActual()}
                    </p>
                  </div>
                </div>

                <svg
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                    mostrarFiltroRol
                      ? 'rotate-180 text-[#009444]'
                      : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m6 9 6 6 6-6"
                  />
                </svg>
              </button>

              {mostrarFiltroRol && (
                <div
                  className="absolute left-0 top-full z-[9999] mt-2 w-full overflow-hidden rounded-2xl border border-[#095540]/10 bg-white p-1.5 shadow-[0_20px_50px_rgba(9,85,64,0.20)]"
                  role="listbox"
                  aria-label="Filtrar usuarios por rol"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroRol('todos');
                      setMostrarFiltroRol(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition-all duration-150 ${
                      filtroRol === 'todos'
                        ? 'bg-[#00AEEF]/10 text-[#0087BA]'
                        : 'text-slate-600 hover:bg-[#f5f8f3] hover:text-[#095540]'
                    }`}
                    role="option"
                    aria-selected={filtroRol === 'todos'}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00AEEF]/10">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#00AEEF]" />
                      </span>

                      <span className="text-sm font-semibold">
                        Todos los usuarios
                      </span>
                    </div>

                    <span className="rounded-full bg-[#00AEEF]/10 px-2 py-1 text-[10px] font-bold text-[#0087BA]">
                      {usuarios.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFiltroRol('superadmin');
                      setMostrarFiltroRol(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition-all duration-150 ${
                      filtroRol === 'superadmin'
                        ? 'bg-[#095540]/10 text-[#095540]'
                        : 'text-slate-600 hover:bg-[#f5f8f3] hover:text-[#095540]'
                    }`}
                    role="option"
                    aria-selected={filtroRol === 'superadmin'}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#095540]/10">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#095540]" />
                      </span>

                      <span className="text-sm font-semibold">
                        Super Admin
                      </span>
                    </div>

                    <span className="rounded-full bg-[#095540]/10 px-2 py-1 text-[10px] font-bold text-[#095540]">
                      {cantidadSuperAdministradores}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFiltroRol('administrador');
                      setMostrarFiltroRol(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition-all duration-150 ${
                      filtroRol === 'administrador'
                        ? 'bg-[#009444]/10 text-[#08743f]'
                        : 'text-slate-600 hover:bg-[#f5f8f3] hover:text-[#095540]'
                    }`}
                    role="option"
                    aria-selected={filtroRol === 'administrador'}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#009444]/10">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#009444]" />
                      </span>

                      <span className="text-sm font-semibold">
                        Administradores
                      </span>
                    </div>

                    <span className="rounded-full bg-[#009444]/10 px-2 py-1 text-[10px] font-bold text-[#08743f]">
                      {cantidadAdministradores}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFiltroRol('asociado');
                      setMostrarFiltroRol(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition-all duration-150 ${
                      filtroRol === 'asociado'
                        ? 'bg-[#8dc63f]/15 text-[#567d16]'
                        : 'text-slate-600 hover:bg-[#f5f8f3] hover:text-[#095540]'
                    }`}
                    role="option"
                    aria-selected={filtroRol === 'asociado'}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8dc63f]/15">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#8dc63f]" />
                      </span>

                      <span className="text-sm font-semibold">
                        Asociados
                      </span>
                    </div>

                    <span className="rounded-full bg-[#8dc63f]/15 px-2 py-1 text-[10px] font-bold text-[#567d16]">
                      {cantidadAsociados}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFiltroRol('visitante');
                      setMostrarFiltroRol(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition-all duration-150 ${
                      filtroRol === 'visitante'
                        ? 'bg-[#d9d823]/15 text-[#6e6c00]'
                        : 'text-slate-600 hover:bg-[#f5f8f3] hover:text-[#095540]'
                    }`}
                    role="option"
                    aria-selected={filtroRol === 'visitante'}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d9d823]/15">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#d9d823]" />
                      </span>

                      <span className="text-sm font-semibold">
                        Visitantes
                      </span>
                    </div>

                    <span className="rounded-full bg-[#d9d823]/20 px-2 py-1 text-[10px] font-bold text-[#6e6c00]">
                      {cantidadVisitantes}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARGANDO */}
        {cargando && (
          <div className="relative z-0 mb-6 rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-800" />

            <p className="text-sm font-semibold text-emerald-900">
              Cargando usuarios...
            </p>
          </div>
        )}

        {/* MENSAJE */}
        {mensaje && (
          <div
            className={`relative z-0 mb-6 rounded-3xl border p-4 shadow-sm ${
              tipoMensaje === 'exito'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
            }`}
            role={tipoMensaje === 'error' ? 'alert' : 'status'}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  tipoMensaje === 'exito'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {tipoMensaje === 'exito' ? '✓' : '!'}
              </div>

              <p
                className={`pt-1 text-sm font-semibold ${
                  tipoMensaje === 'exito'
                    ? 'text-emerald-900'
                    : 'text-rose-900'
                }`}
              >
                {mensaje}
              </p>
            </div>
          </div>
        )}

        {/* TABLA */}
        {!cargando && (
          <div className="relative z-0 overflow-hidden rounded-[2rem] border border-[#095540]/10 bg-white shadow-[0_18px_50px_rgba(9,85,64,0.09)]">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8dc63f]">
                  Usuarios registrados
                </p>

                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#073f31]">
                  Usuarios y roles
                </h2>
              </div>

              <span className="inline-flex w-fit rounded-full border border-[#00AEEF]/20 bg-[#00AEEF]/10 px-3 py-1.5 text-xs font-bold text-[#0087BA]">
                Mostrando {usuariosPaginados.length} de {usuariosFiltrados.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <caption className="sr-only">
                  Usuarios y roles asignados
                </caption>

                <thead className="bg-gradient-to-r from-[#073f31] via-[#095540] to-[#08743f]">
                  <tr className="text-left text-xs font-bold uppercase tracking-[0.1em] text-white">
                    <th className="px-5 py-4 sm:px-6">
                      Usuario
                    </th>

                    <th className="px-5 py-4 sm:px-6">
                      Nombre completo
                    </th>

                    <th className="px-5 py-4 sm:px-6">
                      Correo
                    </th>

                    <th className="px-5 py-4 sm:px-6">
                      Rol actual
                    </th>

                    <th className="px-5 py-4 sm:px-6">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {usuariosFiltrados.length === 0 ? (
                    <tr>
                      <td
                        className="px-6 py-14 text-center"
                        colSpan={5}
                      >
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00AEEF]/10 text-[#0087BA]">
                          <svg
                            className="h-7 w-7"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.6"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 19.125a6.75 6.75 0 00-13.5 0m6.75-6.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
                            />
                          </svg>
                        </div>

                        <h3 className="mt-4 text-base font-bold text-slate-800">
                          No se encontraron usuarios
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Prueba con otro nombre, correo o rol.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    usuariosPaginados.map((usuario) => {
                      const estiloRol =
                        obtenerEstiloRol(usuario.rol);

                      const esSuperAdmin =
                        esSuperAdministrador(usuario);

                      return (
                        <tr
                          key={usuario.id}
                          className="group transition-colors duration-200 hover:bg-[#f7faf5]"
                        >
                          <td className="px-5 py-5 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#009444]/10 to-[#8dc63f]/20 text-sm font-extrabold text-[#095540] ring-1 ring-emerald-100">
                                {usuario.nombre
                                  ?.charAt(0)
                                  ?.toUpperCase() ?? '?'}
                              </div>

                              <div>
                                <p className="font-bold text-[#095540]">
                                  {usuario.nombreUsuario}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-5 sm:px-6">
                            <p className="text-sm font-semibold text-slate-700">
                              {usuario.nombre}{' '}
                              {usuario.apellidos}
                            </p>
                          </td>

                          <td className="px-5 py-5 sm:px-6">
                            <p className="max-w-[250px] truncate text-sm text-slate-600">
                              {usuario.correo}
                            </p>
                          </td>

                          <td className="px-5 py-5 sm:px-6">
                            {esSuperAdmin ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-[#095540]/20 bg-[#095540]/10 px-3 py-1.5 text-xs font-bold text-[#095540]">
                                <span className="h-2 w-2 rounded-full bg-[#095540]" />
                                Super Admin
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${estiloRol.clase}`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${estiloRol.punto}`}
                                />
                                {estiloRol.texto}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-5 sm:px-6">
                            {esSuperAdmin ? (
                              <span className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 text-xs font-bold text-slate-400">
                                No disponible
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirCambioRol(usuario)
                                }
                                className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#009444]/20 bg-[#009444]/10 px-4 text-xs font-bold text-[#08743f] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#009444] hover:bg-[#009444] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/20"
                              >
                                Cambiar rol
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {usuariosFiltrados.length > tamanoPagina && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm sm:px-7">
                <span className="text-slate-500">Página {paginaSegura} de {totalPaginas}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))} disabled={paginaSegura === 1} className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
                  <button type="button" onClick={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))} disabled={paginaSegura === totalPaginas} className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL CAMBIAR ROL */}
      {usuarioSeleccionado && !mostrarConfirmacion && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-[#062e25]/65 p-4 py-8 backdrop-blur-sm sm:py-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-cambio-rol"
        >
          <div className="my-auto w-full max-w-md overflow-visible rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_80px_rgba(9,85,64,0.25)]">

            {/* HEADER MODAL */}
            <div className="rounded-t-[2rem] bg-gradient-to-br from-[#095540] to-[#009444] px-6 py-6 text-white sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                    Gestión de usuarios
                  </p>

                  <h2
                    id="titulo-cambio-rol"
                    className="mt-1 text-2xl font-extrabold tracking-tight"
                  >
                    Cambiar rol
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={cerrarCambioRol}
                  disabled={guardando}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 6l12 12M18 6L6 18"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* CONTENIDO */}
            <div className="p-6 sm:p-8">
              <div className="rounded-2xl border border-[#8dc63f]/25 bg-[#8dc63f]/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#567d16]">
                  Usuario seleccionado
                </p>

                <p className="mt-1 text-base font-extrabold text-[#073f31]">
                  {usuarioSeleccionado.nombreUsuario}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {usuarioSeleccionado.nombre}{' '}
                  {usuarioSeleccionado.apellidos}
                </p>
              </div>

              <label
                className="mt-6 block text-sm font-bold text-[#095540]"
                htmlFor="nuevoRol"
              >
                Nuevo rol
              </label>

              {/* SELECTOR VISUAL DE ROL */}
              <div className="relative mt-2">
                <button
                  id="nuevoRol"
                  type="button"
                  onClick={() =>
                    !guardando &&
                    setMostrarSelectorRol(
                      (actual) => !actual
                    )
                  }
                  disabled={guardando}
                  className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-[#095540]/15 bg-[#f7faf5] px-4 text-left shadow-sm transition-all duration-200 hover:border-[#009444]/40 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/15 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-haspopup="listbox"
                  aria-expanded={mostrarSelectorRol}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {nuevoRol ? (
                      <>
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            nuevoRol === 'administrador'
                              ? 'bg-[#009444]/10 text-[#08743f]'
                              : nuevoRol === 'asociado'
                                ? 'bg-[#8dc63f]/15 text-[#567d16]'
                                : 'bg-[#d9d823]/20 text-[#6e6c00]'
                          }`}
                        >
                          {nuevoRol === 'administrador' && (
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.8"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z"
                              />
                            </svg>
                          )}

                          {nuevoRol === 'asociado' && (
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.8"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m6-10a4 4 0 100-8 4 4 0 000 8zm8-3v6m3-3h-6"
                              />
                            </svg>
                          )}

                          {nuevoRol === 'visitante' && (
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.8"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 19.125a6.75 6.75 0 00-13.5 0M8.25 12.375a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zm7.5-3.75h5.25m-2.625-2.625v5.25"
                              />
                            </svg>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Rol seleccionado
                          </p>

                          <p
                            className={`truncate text-sm font-extrabold ${
                              nuevoRol === 'administrador'
                                ? 'text-[#08743f]'
                                : nuevoRol === 'asociado'
                                  ? 'text-[#567d16]'
                                  : 'text-[#6e6c00]'
                            }`}
                          >
                            {obtenerNombreRol(nuevoRol)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.8"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6v12m6-6H6"
                            />
                          </svg>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Selección
                          </p>

                          <p className="text-sm font-bold text-slate-500">
                            Selecciona un rol
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <svg
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                      mostrarSelectorRol
                        ? 'rotate-180 text-[#009444]'
                        : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m6 9 6 6 6-6"
                    />
                  </svg>
                </button>

                {/* OPCIONES DEL ROL */}
                {mostrarSelectorRol && (
                  <div
                    className="absolute left-0 top-full z-[1200] mt-2 w-full overflow-hidden rounded-2xl border border-[#095540]/10 bg-white p-2 shadow-[0_20px_50px_rgba(9,85,64,0.20)]"
                    role="listbox"
                  >
                    {/* ADMINISTRADOR */}
                    <button
                      type="button"
                      onClick={() => {
                        setNuevoRol('administrador');
                        setMostrarSelectorRol(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 ${
                        nuevoRol === 'administrador'
                          ? 'bg-[#009444]/10'
                          : 'hover:bg-[#f5faf7]'
                      }`}
                      role="option"
                      aria-selected={
                        nuevoRol === 'administrador'
                      }
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#009444]/10 text-[#08743f]">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.8"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z"
                          />
                        </svg>
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-extrabold text-[#08743f]">
                          Administrador
                        </p>

                        <p className="text-xs text-slate-400">
                          Gestiona usuarios y el sistema
                        </p>
                      </div>

                      {nuevoRol === 'administrador' && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#009444]/10 text-[#08743f]">
                          ✓
                        </span>
                      )}
                    </button>

                    {/* ASOCIADO */}
                    <button
                      type="button"
                      onClick={() => {
                        setNuevoRol('asociado');
                        setMostrarSelectorRol(false);
                      }}
                      className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 ${
                        nuevoRol === 'asociado'
                          ? 'bg-[#8dc63f]/15'
                          : 'hover:bg-[#f7faf2]'
                      }`}
                      role="option"
                      aria-selected={
                        nuevoRol === 'asociado'
                      }
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8dc63f]/15 text-[#567d16]">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.8"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m6-10a4 4 0 100-8 4 4 0 000 8zm8-3v6m3-3h-6"
                          />
                        </svg>
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-extrabold text-[#567d16]">
                          Asociado
                        </p>

                        <p className="text-xs text-slate-400">
                          Administra emprendimientos y actividades
                        </p>
                      </div>

                      {nuevoRol === 'asociado' && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8dc63f]/20 text-[#567d16]">
                          ✓
                        </span>
                      )}
                    </button>

                    {/* VISITANTE */}
                    <button
                      type="button"
                      onClick={() => {
                        setNuevoRol('visitante');
                        setMostrarSelectorRol(false);
                      }}
                      className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 ${
                        nuevoRol === 'visitante'
                          ? 'bg-[#d9d823]/15'
                          : 'hover:bg-[#fffef0]'
                      }`}
                      role="option"
                      aria-selected={
                        nuevoRol === 'visitante'
                      }
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d9d823]/20 text-[#6e6c00]">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.8"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 19.125a6.75 6.75 0 00-13.5 0M8.25 12.375a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zm7.5-3.75h5.25m-2.625-2.625v5.25"
                          />
                        </svg>
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-extrabold text-[#6e6c00]">
                          Visitante
                        </p>

                        <p className="text-xs text-slate-400">
                          Consulta información del parque
                        </p>
                      </div>

                      {nuevoRol === 'visitante' && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9d823]/25 text-[#6e6c00]">
                          ✓
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarCambioRol}
                  disabled={guardando}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarCambioRol}
                  disabled={guardando || !nuevoRol}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#d9d823] px-5 text-sm font-extrabold text-emerald-950 shadow-sm transition hover:bg-[#e5e55d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {mostrarConfirmacion &&
        usuarioSeleccionado &&
        nuevoRol && (
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#062e25]/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmacion-rol"
          >
            <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_80px_rgba(9,85,64,0.28)]">
              <div className="bg-gradient-to-br from-[#095540] to-[#009444] px-6 py-6 text-white sm:px-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                  Confirmación
                </p>

                <h2
                  id="titulo-confirmacion-rol"
                  className="mt-1 text-2xl font-extrabold tracking-tight"
                >
                  Confirmar cambio de rol
                </h2>
              </div>

              <div className="p-6 sm:p-8">
                <div className="rounded-2xl border border-[#d9d823]/40 bg-[#d9d823]/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9d823]/25 font-bold text-[#6e6c00]">
                      !
                    </div>

                    <p className="text-sm leading-6 text-[#5f5b00]">
                      ¿Deseas cambiar a{' '}
                      <strong>
                        {usuarioSeleccionado.nombreUsuario}
                      </strong>{' '}
                      del rol{' '}
                      <strong>
                        {obtenerNombreRol(
                          usuarioSeleccionado.rol ?? ''
                        )}
                      </strong>{' '}
                      al rol{' '}
                      <strong>
                        {obtenerNombreRol(nuevoRol)}
                      </strong>
                      ?
                    </p>
                  </div>
                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setMostrarConfirmacion(false)
                    }
                    disabled={guardando}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => void actualizarRol()}
                    disabled={guardando}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#095540] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#073f31] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {guardando
                      ? 'Guardando...'
                      : 'Confirmar cambio'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}
