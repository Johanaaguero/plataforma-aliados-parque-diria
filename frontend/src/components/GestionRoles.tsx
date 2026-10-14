import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
type NombreRol =
  | 'super_admin'
  | 'administrador'
  | 'asociado'
  | 'visitante';
type FiltroRol =
  | 'todos'
  | 'superadmin'
  | NombreRol;

type PosicionPanelFlotante = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

/** Calcula una posición flotante que evita el recorte por overflow de los contenedores. */
function calcularPosicionPanel(
  ancla: HTMLElement | null,
  alturaPreferida = 360,
): PosicionPanelFlotante | null {
  if (!ancla || typeof window === 'undefined') return null;

  const rect = ancla.getBoundingClientRect();
  const margen = 12;
  const espacioAbajo = Math.max(0, window.innerHeight - rect.bottom - margen * 2);
  const espacioArriba = Math.max(0, rect.top - margen * 2);
  const alturaDeseada = Math.min(alturaPreferida, Math.floor(window.innerHeight * 0.66));
  const abrirArriba =
    espacioAbajo < Math.min(alturaDeseada, 220) && espacioArriba > espacioAbajo;
  const espacioDisponible = abrirArriba ? espacioArriba : espacioAbajo;
  const maxHeight = Math.max(100, Math.min(alturaDeseada, espacioDisponible || alturaDeseada));
  const width = Math.min(Math.max(rect.width, 240), window.innerWidth - margen * 2);
  const left = Math.max(margen, Math.min(rect.left, window.innerWidth - width - margen));
  const top = abrirArriba
    ? Math.max(margen, rect.top - maxHeight - 8)
    : Math.min(rect.bottom + 8, window.innerHeight - maxHeight - margen);

  return { top, left, width, maxHeight };
}

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
  const filtroRolTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filtroRolPanelRef = useRef<HTMLDivElement | null>(null);
  const selectorRolTriggerRef = useRef<HTMLButtonElement | null>(null);
  const selectorRolPanelRef = useRef<HTMLDivElement | null>(null);
  const [posicionFiltroRol, setPosicionFiltroRol] = useState<PosicionPanelFlotante | null>(null);
  const [posicionSelectorRol, setPosicionSelectorRol] = useState<PosicionPanelFlotante | null>(null);

  const alternarFiltroRol = () => {
    if (mostrarFiltroRol) {
      setMostrarFiltroRol(false);
      return;
    }
    setMostrarSelectorRol(false);
    setPosicionFiltroRol(calcularPosicionPanel(filtroRolTriggerRef.current, 360));
    setMostrarFiltroRol(true);
  };

  const alternarSelectorRol = () => {
    if (guardando) return;
    if (mostrarSelectorRol) {
      setMostrarSelectorRol(false);
      return;
    }
    setMostrarFiltroRol(false);
    setPosicionSelectorRol(calcularPosicionPanel(selectorRolTriggerRef.current, 320));
    setMostrarSelectorRol(true);
  };

  // Mantiene los paneles ligados a su botón, y los cierra al pulsar fuera o usar Escape.
  useEffect(() => {
    if (!mostrarFiltroRol && !mostrarSelectorRol) return;

    const reposicionar = () => {
      if (mostrarFiltroRol) {
        setPosicionFiltroRol(calcularPosicionPanel(filtroRolTriggerRef.current, 360));
      }
      if (mostrarSelectorRol) {
        setPosicionSelectorRol(calcularPosicionPanel(selectorRolTriggerRef.current, 320));
      }
    };

    const cerrarFuera = (evento: PointerEvent) => {
      const objetivo = evento.target;
      if (!(objetivo instanceof Node)) return;
      if (
        mostrarFiltroRol &&
        !filtroRolTriggerRef.current?.contains(objetivo) &&
        !filtroRolPanelRef.current?.contains(objetivo)
      ) {
        setMostrarFiltroRol(false);
      }
      if (
        mostrarSelectorRol &&
        !selectorRolTriggerRef.current?.contains(objetivo) &&
        !selectorRolPanelRef.current?.contains(objetivo)
      ) {
        setMostrarSelectorRol(false);
      }
    };

    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setMostrarFiltroRol(false);
        setMostrarSelectorRol(false);
      }
    };

    window.addEventListener('resize', reposicionar);
    window.addEventListener('scroll', reposicionar, true);
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      window.removeEventListener('resize', reposicionar);
      window.removeEventListener('scroll', reposicionar, true);
      document.removeEventListener('pointerdown', cerrarFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [mostrarFiltroRol, mostrarSelectorRol]);
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
  const indiceInicio =
    usuariosFiltrados.length === 0
      ? 0
      : (paginaSegura - 1) * tamanoPagina + 1;
  const indiceFin = Math.min(paginaSegura * tamanoPagina, usuariosFiltrados.length);
  const usuariosPaginados = usuariosFiltrados.slice(
    (paginaSegura - 1) * tamanoPagina,
    paginaSegura * tamanoPagina,
  );
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroRol]);
  useEffect(() => {
    setPaginaActual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);
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
  const tarjetasResumen = [
    {
      etiqueta: 'Usuarios registrados',
      cantidad: usuarios.length,
      descripcion: 'Total de cuentas',
      abreviatura: 'US',
      color: 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200',
      acento: 'bg-sky-500',
    },
    {
      etiqueta: 'Super Admin',
      cantidad: cantidadSuperAdministradores,
      descripcion: 'Control del sistema',
      abreviatura: 'SA',
      color: 'bg-emerald-900/10 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200',
      acento: 'bg-emerald-900',
    },
    {
      etiqueta: 'Administradores',
      cantidad: cantidadAdministradores,
      descripcion: 'Gestión administrativa',
      abreviatura: 'AD',
      color: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
      acento: 'bg-emerald-500',
    },
    {
      etiqueta: 'Asociados',
      cantidad: cantidadAsociados,
      descripcion: 'Emprendedores asociados',
      abreviatura: 'AS',
      color: 'bg-lime-500/15 text-lime-800 dark:bg-lime-400/15 dark:text-lime-200',
      acento: 'bg-lime-500',
    },
    {
      etiqueta: 'Visitantes',
      cantidad: cantidadVisitantes,
      descripcion: 'Acceso de consulta',
      abreviatura: 'VI',
      color: 'bg-yellow-500/15 text-yellow-800 dark:bg-yellow-400/15 dark:text-yellow-100',
      acento: 'bg-yellow-500',
    },
  ];

  return (
    <section className="relative isolate min-h-screen w-full overflow-x-clip font-['Montserrat',sans-serif] text-[#17382B] transition-colors duration-500 dark:text-[#EDF8F1]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,174,239,0.13),transparent_34%),radial-gradient(circle_at_top_right,rgba(217,216,35,0.15),transparent_30%),linear-gradient(135deg,rgba(238,244,239,0.96),rgba(255,255,255,0.72))] dark:bg-[radial-gradient(circle_at_top_left,rgba(0,174,239,0.13),transparent_34%),radial-gradient(circle_at_top_right,rgba(141,198,63,0.12),transparent_30%),linear-gradient(135deg,rgba(7,28,20,0.97),rgba(13,43,32,0.84))]" />
        <div className="absolute -left-28 top-10 h-[380px] w-[380px] rounded-full bg-[#8dc63f]/10 blur-[120px] dark:bg-[#8dc63f]/[0.055]" />
        <div className="absolute -right-24 bottom-0 h-[420px] w-[420px] rounded-full bg-[#00AEEF]/[0.07] blur-[130px] dark:bg-[#00AEEF]/[0.04]" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-4 pb-10 pt-5 sm:px-7 sm:pt-7 lg:px-10 lg:pt-8">
        {/* ENCABEZADO */}
        <div className="relative mb-7 overflow-hidden rounded-[2rem] border border-white/55 bg-white/[0.34] px-6 py-8 text-[#073f31] shadow-[0_30px_90px_rgba(11,58,39,0.10)] backdrop-blur-[30px] sm:px-9 sm:py-10 lg:px-12 lg:py-11 dark:border-white/[0.10] dark:bg-[#0d2b20]/[0.52] dark:text-white">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#8dc63f]/15 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-[#00AEEF]/[0.08] blur-3xl"
            aria-hidden="true"
          />
          <div className="relative">
            <h1 className="text-4xl font-bold leading-[0.98] tracking-[-0.025em] sm:text-5xl lg:text-[3.5rem]">
              Gestión de Roles
            </h1>
            <p className="mt-4 max-w-[800px] text-sm font-normal leading-7 text-[#687E74] dark:text-[#A9BCB4] sm:text-base">
              Administra los accesos de la plataforma y consulta el rol asignado a cada usuario.
            </p>
          </div>
        </div>

        {/* RESUMEN DE USUARIOS POR ROL */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:mb-8 xl:grid-cols-5 xl:gap-4">
          {tarjetasResumen.map((tarjeta) => (
            <article
              key={tarjeta.etiqueta}
              className="group relative isolate overflow-hidden rounded-[1.65rem] border border-white/55 bg-white/[0.42] p-4 shadow-[0_18px_48px_rgba(7,63,49,0.055)] backdrop-blur-[28px] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.52] hover:shadow-[0_22px_55px_rgba(7,63,49,0.09)] sm:p-5 dark:border-white/[0.08] dark:bg-[#0d2b20]/[0.48] dark:shadow-[0_14px_38px_rgba(0,0,0,0.18)] dark:hover:bg-white/[0.07]"
            >
              <span className={`absolute inset-x-0 top-0 h-1 ${tarjeta.acento}`} aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.11em] text-slate-500 dark:text-slate-400">
                    {tarjeta.etiqueta}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#073f31] dark:text-white">
                    {tarjeta.cantidad}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {tarjeta.descripcion}
                  </p>
                </div>
                <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-extrabold tracking-wide ${tarjeta.color}`}>
                  {tarjeta.abreviatura}
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* BUSCADOR Y FILTROS */}
        <div className="relative z-20 mb-6 rounded-[1.8rem] border border-white/45 bg-white/[0.32] p-5 shadow-[0_12px_38px_rgba(7,63,49,0.035)] backdrop-blur-2xl sm:mb-8 sm:p-6 dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_12px_38px_rgba(0,0,0,0.18)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* BUSCADOR */}
            <div className="flex-1">
              <label
                className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#095540] dark:text-emerald-200"
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
                  className="min-h-12 w-full rounded-[1rem] border border-white/45 bg-white/[0.56] py-3 pl-10 pr-4 text-sm font-semibold text-[#304B40] outline-none placeholder:text-[#82938B] shadow-inner shadow-white/40 backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-200 focus-visible:border-[#009444] focus-visible:bg-white/[0.78] focus-visible:ring-4 focus-visible:ring-[#009444]/[0.15] dark:border-white/[0.10] dark:!bg-[#09261E]/[0.58] dark:text-[#F0FAF4] dark:placeholder:text-[#8EA69B] dark:shadow-inner dark:shadow-black/20 dark:focus-visible:border-[#8DC63F] dark:focus-visible:bg-[#0F3529]/[0.72]"
                />
              </div>
            </div>
            {/* FILTRO POR ROL */}
            <div className="relative z-50 w-full md:w-[270px] md:min-w-[250px] md:flex-none">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#095540] dark:text-emerald-200">
                Filtrar por
              </span>
              <button
                ref={filtroRolTriggerRef}
                type="button"
                onClick={alternarFiltroRol}
                aria-expanded={mostrarFiltroRol}
                aria-haspopup="listbox"
                className="group flex min-h-12 w-full items-center justify-between gap-4 rounded-[1rem] border border-white/45 bg-white/[0.56] px-4 text-left shadow-inner shadow-white/40 backdrop-blur-xl transition-all duration-200 hover:border-[#009444]/55 hover:bg-white/[0.76] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/[0.15] dark:border-white/[0.10] dark:!bg-[#09261E]/[0.58] dark:shadow-black/20 dark:hover:bg-[#0F3529]/[0.72]"
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
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${mostrarFiltroRol
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
              {mostrarFiltroRol && posicionFiltroRol && typeof document !== 'undefined' && createPortal(
                (
                  <div
                    ref={filtroRolPanelRef}
                    style={{ position: 'fixed', top: posicionFiltroRol.top, left: posicionFiltroRol.left, width: posicionFiltroRol.width, maxHeight: posicionFiltroRol.maxHeight }}
                    className="z-[9999] overflow-y-auto overscroll-contain rounded-[1.35rem] border border-white/55 bg-[#F7FAF6]/[0.97] p-2 font-['Montserrat',sans-serif] text-[#304B40] shadow-[0_24px_70px_rgba(7,63,49,0.22)] ring-1 ring-[#095540]/[0.08] backdrop-blur-[30px] [scrollbar-width:thin] [scrollbar-color:rgba(9,85,64,0.28)_transparent] dark:border-white/[0.12] dark:bg-[#0B3026]/[0.97] dark:shadow-[0_26px_75px_rgba(0,0,0,0.42)] dark:ring-white/[0.05] dark:[scrollbar-color:rgba(141,198,63,0.35)_transparent]"
                    role="listbox"
                    aria-label="Filtrar usuarios por rol"
                  >
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroRol('todos');
                      setMostrarFiltroRol(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#009444]/45 ${filtroRol === 'todos'
                        ? 'bg-[#009444]/[0.12] text-[#08743f] dark:bg-[#8dc63f]/[0.14] dark:text-[#D8F7E3]'
                        : 'text-slate-600 hover:bg-[#009444]/[0.08] hover:text-[#095540] dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white'
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
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#009444]/45 ${filtroRol === 'superadmin'
                        ? 'bg-[#095540]/[0.10] text-[#095540] dark:bg-[#8dc63f]/[0.14] dark:text-[#D8F7E3]'
                        : 'text-slate-600 hover:bg-[#009444]/[0.08] hover:text-[#095540] dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white'
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
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#009444]/45 ${filtroRol === 'administrador'
                        ? 'bg-[#009444]/[0.12] text-[#08743f] dark:bg-[#8dc63f]/[0.14] dark:text-[#D8F7E3]'
                        : 'text-slate-600 hover:bg-[#009444]/[0.08] hover:text-[#095540] dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white'
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
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#009444]/45 ${filtroRol === 'asociado'
                        ? 'bg-[#8dc63f]/[0.16] text-[#567d16] dark:bg-[#8dc63f]/[0.14] dark:text-lime-100'
                        : 'text-slate-600 hover:bg-[#8dc63f]/[0.08] hover:text-[#095540] dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white'
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
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#009444]/45 ${filtroRol === 'visitante'
                        ? 'bg-[#d9d823]/[0.18] text-[#6e6c00] dark:bg-[#d9d823]/[0.12] dark:text-[#F1EF8B]'
                        : 'text-slate-600 hover:bg-[#d9d823]/[0.08] hover:text-[#095540] dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white'
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
                ),
                document.body
              )}
            </div>
          </div>
        </div>
        {/* CARGANDO */}
        {cargando && (
          <div className="relative z-0 mb-6 rounded-[1.7rem] border border-white/50 bg-white/[0.42] p-8 text-center shadow-[0_18px_50px_rgba(7,63,49,0.06)] backdrop-blur-[28px] dark:border-white/[0.08] dark:bg-[#0B3026]/[0.62]">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-800" />
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Cargando usuarios...
            </p>
          </div>
        )}
        {/* MENSAJE */}
        {mensaje && (
          <div
            className={`relative z-0 mb-6 rounded-[1.5rem] border p-4 shadow-sm backdrop-blur-xl ${tipoMensaje === 'exito'
                ? 'border-[#009444]/20 bg-[#009444]/[0.10] dark:border-[#009444]/25 dark:bg-[#009444]/[0.12]'
                : 'border-rose-300/40 bg-rose-50/[0.88] dark:border-rose-300/20 dark:bg-rose-950/[0.55]'
              }`}
            role={tipoMensaje === 'error' ? 'alert' : 'status'}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${tipoMensaje === 'exito'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200'
                  }`}
              >
                {tipoMensaje === 'exito' ? '✓' : '!'}
              </div>
              <p
                className={`pt-1 text-sm font-semibold ${tipoMensaje === 'exito'
                    ? 'text-emerald-900 dark:text-emerald-100'
                    : 'text-rose-900 dark:text-rose-100'
                  }`}
              >
                {mensaje}
              </p>
            </div>
          </div>
        )}
        {/* TABLA */}
        {!cargando && (
          <div className="relative z-0 flex max-h-[min(72dvh,900px)] min-h-0 flex-col overflow-hidden rounded-[1.9rem] border border-white/55 bg-white/[0.44] shadow-[0_18px_50px_rgba(9,85,64,0.09)] backdrop-blur-[30px] dark:border-white/[0.08] dark:bg-[#0B3026]/[0.70] dark:shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <div className="flex shrink-0 flex-col gap-3 border-b border-white/55 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-white/[0.08]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#699d27] dark:text-lime-300">
                  Usuarios registrados
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#073f31] dark:text-white">
                  Usuarios y roles
                </h2>
              </div>
              <span className="inline-flex w-fit rounded-full border border-[#00AEEF]/20 bg-[#00AEEF]/10 px-3 py-1.5 text-xs font-bold text-[#0087BA] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
                Mostrando {usuariosPaginados.length} de {usuariosFiltrados.length}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-color:rgba(9,85,64,0.28)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#0b6849]/25 [&::-webkit-scrollbar-track]:bg-transparent">
              <table className="w-full min-w-[760px] border-collapse">
                <caption className="sr-only">
                  Usuarios y roles asignados
                </caption>
                <thead className="sticky top-0 z-10 border-b border-[#DCE8E1] bg-[#FAFCFA]/[0.97] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#102D25]/[0.97]">
                  <tr className="text-left text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#5B7468] dark:text-[#B7CCC2]">
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
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
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
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
                          className="group transition-colors duration-200 hover:bg-white/[0.44] dark:hover:bg-white/[0.055]"
                        >
                          <td className="px-5 py-5 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#009444]/10 to-[#8dc63f]/20 text-sm font-extrabold text-[#095540] ring-1 ring-emerald-100">
                                {usuario.nombre
                                  ?.charAt(0)
                                  ?.toUpperCase() ?? '?'}
                              </div>
                              <div>
                                <p className="font-bold text-[#095540] dark:text-emerald-200">
                                  {usuario.nombreUsuario}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-5 sm:px-6">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {usuario.nombre}{' '}
                              {usuario.apellidos}
                            </p>
                          </td>
                          <td className="px-5 py-5 sm:px-6">
                            <p className="max-w-[250px] truncate text-sm text-slate-600 dark:text-slate-300">
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
                                className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/45 bg-white/[0.50] px-4 text-xs font-bold text-[#08743f] shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#009444]/55 hover:bg-[#009444] hover:text-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/[0.20] dark:border-white/10 dark:bg-white/[0.07] dark:text-emerald-100 dark:hover:bg-[#009444]"
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
            <div className="flex shrink-0 flex-col gap-3 border-t border-white/60 px-5 py-4 text-sm font-semibold text-[#52675e] sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-white/[0.08] dark:text-[#B9CBC0]">
              <p className="text-xs sm:text-sm">
                Mostrando {indiceInicio}–{indiceFin} de {usuariosFiltrados.length} usuarios
              </p>

              {usuariosFiltrados.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPaginaActual((pagina) => Math.max(1, pagina - 1))
                    }
                    disabled={totalPaginas <= 1 || paginaSegura === 1}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/30 bg-white/80 px-3 text-[11px] font-bold text-slate-600 shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 sm:px-4 sm:text-xs dark:border-white/10 dark:bg-[#071C16]/[0.62] dark:text-[#DDEBE5] dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)] dark:hover:bg-[#12372B]"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    Anterior
                  </button>

                  <span className="inline-flex h-11 items-center justify-center rounded-full border border-[#8DC63F]/25 bg-white/70 px-3 text-xs font-extrabold text-[#095540] shadow-inner shadow-white/40 backdrop-blur-xl dark:border-[#8DC63F]/20 dark:bg-[#09261E]/[0.62] dark:text-[#E8F8EC]">
                    {paginaSegura}
                    <span className="mx-1 opacity-60">de</span>
                    {totalPaginas}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPaginaActual((pagina) =>
                        Math.min(totalPaginas, pagina + 1),
                      )
                    }
                    disabled={totalPaginas <= 1 || paginaSegura === totalPaginas}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/30 bg-white/80 px-3 text-[11px] font-bold text-slate-600 shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 sm:px-4 sm:text-xs dark:border-white/10 dark:bg-[#071C16]/[0.62] dark:text-[#DDEBE5] dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)] dark:hover:bg-[#12372B]"
                  >
                    Siguiente
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* MODAL CAMBIAR ROL */}
      {usuarioSeleccionado && !mostrarConfirmacion && (
        <div
          className="fixed inset-0 z-[1000] flex min-h-dvh items-center justify-center overflow-y-auto bg-[linear-gradient(135deg,rgba(9,36,28,0.18),rgba(9,85,64,0.12))] p-4 py-8 backdrop-blur-[5px] dark:bg-[linear-gradient(135deg,rgba(3,15,12,0.58),rgba(9,42,32,0.48))] sm:py-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-cambio-rol"
        >
          <div className="my-auto w-full max-w-md overflow-visible rounded-[2rem] border border-[#095540]/10 bg-[#f7fbf7]/78 font-['Montserrat',sans-serif] text-[#123D30] shadow-[0_28px_80px_rgba(7,63,49,0.18)] backdrop-blur-2xl dark:border-white/[0.10] dark:bg-[#0B3026]/88 dark:text-white dark:shadow-[0_30px_88px_rgba(0,0,0,0.42)]">
            {/* HEADER MODAL */}
            <div className="relative px-6 pb-4 pt-6 text-[#123D30] sm:px-7 sm:pt-7 dark:text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="inline-flex rounded-full bg-[#009444]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#08743f] dark:bg-[#8DC63F]/10 dark:text-[#A8D66D]">
                    Gestión de usuarios
                  </p>
                  <h2
                    id="titulo-cambio-rol"
                    className="mt-3 text-2xl font-extrabold tracking-tight text-[#123D30] dark:text-white"
                  >
                    Cambiar rol
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={cerrarCambioRol}
                  disabled={guardando}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/58 text-[#52675e] shadow-sm backdrop-blur-xl transition hover:bg-white hover:text-[#095540] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.08] dark:text-[#DDEBE5] dark:hover:bg-white/[0.14] dark:hover:text-white"
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
            <div className="px-6 pb-6 pt-2 sm:px-7 sm:pb-7">
              <div className="rounded-[1.5rem] border border-white/45 bg-white/46 p-4 shadow-[0_12px_34px_rgba(7,63,49,0.055)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#071C16]/38 dark:shadow-[0_12px_34px_rgba(0,0,0,0.18)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#08743f] dark:text-[#A8D66D]">
                  Usuario seleccionado
                </p>
                <p className="mt-2 break-words text-lg font-extrabold text-[#073f31] dark:text-white">
                  {usuarioSeleccionado.nombreUsuario}
                </p>
                <p className="mt-1 break-words text-sm font-medium text-[#6F8379] dark:text-slate-300">
                  {usuarioSeleccionado.nombre}{' '}
                  {usuarioSeleccionado.apellidos}
                </p>
              </div>
              <label
                className="mt-5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#08743f] dark:text-[#A8D66D]"
                htmlFor="nuevoRol"
              >
                Nuevo rol
              </label>
              {/* SELECTOR VISUAL DE ROL */}
              <div className="relative mt-2">
                <button
                  ref={selectorRolTriggerRef}
                  id="nuevoRol"
                  type="button"
                  onClick={alternarSelectorRol}
                  disabled={guardando}
                  className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-[1.25rem] border border-[#095540]/10 bg-white/46 px-4 text-left shadow-[0_12px_34px_rgba(7,63,49,0.055)] backdrop-blur-xl transition-all duration-200 hover:border-[#095540]/20 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:!bg-[#071C16]/38 dark:shadow-[0_12px_34px_rgba(0,0,0,0.18)] dark:hover:bg-white/[0.08]"
                  aria-haspopup="listbox"
                  aria-expanded={mostrarSelectorRol}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {nuevoRol ? (
                      <>
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${nuevoRol === 'administrador'
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
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6F8379] dark:text-slate-300">
                            Rol seleccionado
                          </p>
                          <p
                            className={`truncate text-sm font-extrabold ${nuevoRol === 'administrador'
                                ? 'text-[#08743f] dark:text-emerald-300'
                                : nuevoRol === 'asociado'
                                  ? 'text-[#567d16] dark:text-lime-300'
                                  : 'text-[#6e6c00] dark:text-yellow-200'
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
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6F8379] dark:text-slate-300">
                            Selección
                          </p>
                          <p className="text-sm font-bold text-[#52675e] dark:text-slate-300">
                            Selecciona un rol
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <svg
                    className={`h-5 w-5 shrink-0 text-[#6F8379] transition-transform duration-200 dark:text-slate-300 ${mostrarSelectorRol
                        ? 'rotate-180 text-[#009444] dark:text-[#A8D66D]'
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
                {mostrarSelectorRol && posicionSelectorRol && typeof document !== 'undefined' && createPortal(
                  (
                    <div
                      ref={selectorRolPanelRef}
                      style={{ position: 'fixed', top: posicionSelectorRol.top, left: posicionSelectorRol.left, width: posicionSelectorRol.width, maxHeight: posicionSelectorRol.maxHeight }}
                      className="z-[1200] overflow-y-auto overscroll-contain rounded-[1.35rem] border border-white/55 bg-[#F7FAF6]/[0.97] p-2 font-['Montserrat',sans-serif] text-[#304B40] shadow-[0_24px_70px_rgba(7,63,49,0.22)] ring-1 ring-[#095540]/[0.08] backdrop-blur-[30px] [scrollbar-width:thin] [scrollbar-color:rgba(9,85,64,0.28)_transparent] dark:border-white/[0.12] dark:bg-[#0B3026]/[0.98] dark:shadow-[0_26px_75px_rgba(0,0,0,0.46)] dark:ring-white/[0.05] dark:[scrollbar-color:rgba(141,198,63,0.35)_transparent]"
                      role="listbox"
                      aria-label="Seleccionar nuevo rol"
                    >
                    {/* ADMINISTRADOR */}
                    <button
                      type="button"
                      onClick={() => {
                        setNuevoRol('administrador');
                        setMostrarSelectorRol(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#009444]/45 ${nuevoRol === 'administrador'
                          ? 'bg-[#009444]/[0.12] ring-1 ring-[#009444]/[0.10]'
                          : 'hover:bg-[#009444]/[0.07] dark:hover:bg-white/[0.06]'
                        }`}
                      role="option"
                      aria-selected={
                        nuevoRol === 'administrador'
                      }
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#009444]/10 text-[#08743f] dark:bg-[#009444]/[0.18] dark:text-emerald-200">
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
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-[#08743f] dark:text-emerald-300">
                          Administrador
                        </p>
                        <p className="text-xs text-[#6F8379] dark:text-slate-300">
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
                      className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#009444]/45 ${nuevoRol === 'asociado'
                          ? 'bg-[#8dc63f]/[0.16] ring-1 ring-[#8dc63f]/[0.14]'
                          : 'hover:bg-[#8dc63f]/[0.08] dark:hover:bg-white/[0.06]'
                        }`}
                      role="option"
                      aria-selected={
                        nuevoRol === 'asociado'
                      }
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8dc63f]/15 text-[#567d16] dark:bg-[#8dc63f]/[0.15] dark:text-lime-200">
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
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-[#567d16] dark:text-lime-300">
                          Asociado
                        </p>
                        <p className="text-xs text-[#6F8379] dark:text-slate-300">
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
                      className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#009444]/45 ${nuevoRol === 'visitante'
                          ? 'bg-[#d9d823]/[0.18] ring-1 ring-[#d9d823]/[0.16]'
                          : 'hover:bg-[#d9d823]/[0.08] dark:hover:bg-white/[0.06]'
                        }`}
                      role="option"
                      aria-selected={
                        nuevoRol === 'visitante'
                      }
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d9d823]/20 text-[#6e6c00] dark:bg-[#d9d823]/[0.16] dark:text-yellow-100">
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
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-[#6e6c00] dark:text-yellow-200">
                          Visitante
                        </p>
                        <p className="text-xs text-[#6F8379] dark:text-slate-300">
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
                  ),
                  document.body
                )}
              </div>
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarCambioRol}
                  disabled={guardando}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white/72 px-5 text-sm font-bold text-[#095540] shadow-[0_8px_24px_rgba(7,63,49,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_30px_rgba(7,63,49,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:min-w-32 dark:border dark:border-white/10 dark:bg-white/[0.075] dark:text-[#DDEBE5] dark:hover:bg-white/[0.12]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarCambioRol}
                  disabled={guardando || !nuevoRol}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#095540] px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(9,85,64,0.20)] transition hover:-translate-y-0.5 hover:bg-[#08743f] hover:shadow-[0_16px_34px_rgba(9,85,64,0.24)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/24 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:min-w-36 dark:bg-[#147A5D] dark:hover:bg-[#1A946F] dark:disabled:bg-[#34483F]"
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
            className="fixed inset-0 z-[1100] flex min-h-dvh items-center justify-center overflow-y-auto bg-[linear-gradient(135deg,rgba(9,36,28,0.18),rgba(9,85,64,0.12))] p-4 py-8 backdrop-blur-[5px] dark:bg-[linear-gradient(135deg,rgba(3,15,12,0.58),rgba(9,42,32,0.48))]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmacion-rol"
          >
            <div className="my-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-[#095540]/10 bg-[#f7fbf7]/92 font-['Montserrat',sans-serif] text-[#123D30] shadow-[0_28px_80px_rgba(7,63,49,0.18)] backdrop-blur-2xl dark:border-white/[0.10] dark:bg-[#0B3026]/95 dark:text-white dark:shadow-[0_30px_88px_rgba(0,0,0,0.42)]">
              <div className="px-6 pb-4 pt-6 sm:px-7 sm:pt-7">
                <p className="inline-flex rounded-full bg-[#009444]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#08743f] dark:bg-[#8DC63F]/10 dark:text-[#A8D66D]">
                  Confirmación
                </p>
                <h2
                  id="titulo-confirmacion-rol"
                  className="mt-3 text-2xl font-extrabold tracking-tight text-[#123D30] dark:text-white"
                >
                  Confirmar cambio de rol
                </h2>
              </div>
              <div className="px-6 pb-6 pt-2 sm:px-7 sm:pb-7">
                <div className="rounded-[1.5rem] border border-white/50 bg-white/55 p-4 shadow-[0_12px_34px_rgba(7,63,49,0.055)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#071C16]/45 dark:shadow-[0_12px_34px_rgba(0,0,0,0.18)]">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#009444]/10 font-bold text-[#08743f] dark:bg-[#8DC63F]/[0.14] dark:text-[#A8D66D]">
                      !
                    </div>
                    <p className="min-w-0 break-words text-sm leading-6 text-[#52675e] dark:text-slate-200">
                      ¿Deseas cambiar a{' '}
                      <strong className="font-extrabold text-[#123D30] dark:text-white">
                        {usuarioSeleccionado.nombreUsuario}
                      </strong>{' '}
                      del rol{' '}
                      <strong className="font-extrabold text-[#123D30] dark:text-white">
                        {obtenerNombreRol(
                          usuarioSeleccionado.rol ?? ''
                        )}
                      </strong>{' '}
                      al rol{' '}
                      <strong className="font-extrabold text-[#123D30] dark:text-white">
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
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white/72 px-5 text-sm font-bold text-[#095540] shadow-[0_8px_24px_rgba(7,63,49,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_30px_rgba(7,63,49,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:min-w-32 sm:w-auto dark:border dark:border-white/10 dark:bg-white/[0.075] dark:text-[#DDEBE5] dark:hover:bg-white/[0.12]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void actualizarRol()}
                    disabled={guardando}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#095540] px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(9,85,64,0.20)] transition hover:-translate-y-0.5 hover:bg-[#08743f] hover:shadow-[0_16px_34px_rgba(9,85,64,0.24)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/24 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:min-w-36 sm:w-auto dark:bg-[#147A5D] dark:hover:bg-[#1A946F] dark:disabled:bg-[#34483F]"
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
