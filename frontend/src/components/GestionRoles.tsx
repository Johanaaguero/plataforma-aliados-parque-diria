import { useEffect, useMemo, useState } from 'react';

type NombreRol = 'administrador' | 'asociado' | 'visitante';

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
  const [filtroRol, setFiltroRol] = useState<'todos' | NombreRol>('todos');

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | ''>('');

  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState<UsuarioRol | null>(null);

  const [nuevoRol, setNuevoRol] = useState<NombreRol | ''>('');
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

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

      const coincideRol =
        filtroRol === 'todos' || usuario.rol === filtroRol;

      return coincideBusqueda && coincideRol;
    });
  }, [usuarios, busqueda, filtroRol]);

  const abrirCambioRol = (usuario: UsuarioRol) => {
    setUsuarioSeleccionado(usuario);
    setNuevoRol(usuario.rol ?? '');
    setMensaje('');
    setTipoMensaje('');
    setMostrarConfirmacion(false);
  };

  const cerrarCambioRol = () => {
    if (guardando) return;

    setUsuarioSeleccionado(null);
    setNuevoRol('');
    setMostrarConfirmacion(false);
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
    setMostrarConfirmacion(true);
  };

  const actualizarRol = async () => {
    if (!usuarioSeleccionado || !nuevoRol) {
      setMensaje('Selecciona un rol válido');
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
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      setMensaje('No se pudo conectar con el servidor');
      setTipoMensaje('error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fbfdf8] via-[#f4f8f0] to-[#edf5e8] px-4 py-10 font-sans text-slate-800 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto mb-8 max-w-6xl sm:mb-10">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8dc63f]/30 bg-[#8dc63f]/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#095540]">
          Gestión de usuarios
        </span>

        <h1 className="text-3xl font-extrabold tracking-tight text-[#073f31] sm:text-4xl lg:text-5xl">Gestión de Roles</h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
          Consulta los usuarios y el rol asignado a cada uno.
        </p>
      </div>

      <div className="mx-auto mb-6 grid max-w-6xl grid-cols-1 gap-5 rounded-3xl border border-[#dce8d7] bg-white/90 p-5 shadow-[0_18px_45px_rgba(9,85,64,0.08)] backdrop-blur-sm md:grid-cols-[minmax(0,1fr)_14rem] md:p-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-[#095540]" htmlFor="busqueda">Buscar usuario</label>

          <input
            id="busqueda"
            type="text"
            placeholder="Nombre, usuario o correo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-[#dce8d7] bg-[#fbfdf9] px-4 text-sm font-medium text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-[#8dc63f]/70 focus-visible:border-[#009444] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#009444]/10 motion-reduce:transition-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-[#095540]" htmlFor="filtroRol">Filtrar por rol</label>

          <select
            id="filtroRol"
            value={filtroRol}
            onChange={(e) =>
              setFiltroRol(e.target.value as 'todos' | NombreRol)
            }
            className="min-h-11 w-full rounded-xl border border-[#dce8d7] bg-[#fbfdf9] px-4 text-sm font-medium text-slate-800 outline-none transition duration-200 hover:border-[#8dc63f]/70 focus-visible:border-[#009444] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#009444]/10 motion-reduce:transition-none"
          >
            <option value="todos">Todos</option>
            <option value="administrador">Administrador</option>
            <option value="asociado">Asociado</option>
            <option value="visitante">Visitante</option>
          </select>
        </div>
      </div>

      {cargando && (
        <p className="mx-auto my-4 max-w-6xl rounded-2xl border border-[#dce8d7] bg-white px-4 py-3 text-center text-sm font-bold text-[#095540] shadow-sm" role="status">
          Cargando usuarios...
        </p>
      )}

      {mensaje && (
        <p
          className={`mx-auto my-4 max-w-6xl rounded-2xl border px-4 py-3 text-center text-sm font-bold ${
            tipoMensaje === 'exito'
              ? 'border-[#009444]/20 bg-[#009444]/10 text-[#095540]'
              : 'border-amber-300/70 bg-amber-50 text-amber-900'
          }`}
          role={tipoMensaje === 'error' ? 'alert' : 'status'}
        >
          {mensaje}
        </p>
      )}

      {!cargando && (
        <div
          className="mx-auto max-w-6xl overflow-x-auto rounded-3xl border border-[#dce8d7] bg-white shadow-[0_18px_45px_rgba(9,85,64,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/15"
          role="region"
          aria-label="Usuarios y roles asignados"
          tabIndex={0}
        >
          <table className="w-full min-w-[760px] border-collapse">
            <caption className="sr-only">Usuarios y roles asignados</caption>
            <thead className="bg-gradient-to-r from-[#073f31] via-[#095540] to-[#08743f]">
              <tr className="text-left text-xs font-bold uppercase tracking-[0.1em] text-white [&>th]:px-5 [&>th]:py-4 sm:[&>th]:px-6">
                <th>Usuario</th>
                <th>Nombre completo</th>
                <th>Correo</th>
                <th>Rol actual</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#e7eee3]">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-sm font-medium text-slate-500" colSpan={5}>
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr className="transition-colors duration-200 hover:bg-[#f5faf2] motion-reduce:transition-none [&>td]:px-5 [&>td]:py-4 sm:[&>td]:px-6" key={usuario.id}>
                    <td className="font-bold text-[#095540]">{usuario.nombreUsuario}</td>

                    <td className="text-sm font-medium text-slate-700">
                      {usuario.nombre} {usuario.apellidos}
                    </td>

                    <td className="text-sm text-slate-600">{usuario.correo}</td>

                    <td>
                      <span className="inline-flex rounded-full border border-[#8dc63f]/25 bg-[#8dc63f]/10 px-3 py-1 text-xs font-bold capitalize text-[#095540]">
                        {usuario.rol ?? 'Sin rol'}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() => abrirCambioRol(usuario)}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#009444]/20 bg-[#009444]/10 px-4 text-xs font-bold text-[#08743f] transition duration-200 motion-safe:hover:-translate-y-0.5 hover:border-[#009444] hover:bg-[#009444] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#009444]/20 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none"
                      >
                        Cambiar rol
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {usuarioSeleccionado && !mostrarConfirmacion && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#062e25]/65 p-4 backdrop-blur-sm transition-opacity duration-200 starting:opacity-0 motion-reduce:transition-none sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-cambio-rol"
        >
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/60 bg-white p-6 shadow-[0_25px_70px_rgba(9,85,64,0.25)] transition duration-200 ease-out starting:translate-y-2 starting:scale-[0.98] starting:opacity-0 motion-reduce:transform-none motion-reduce:transition-none sm:p-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-[#073f31]" id="titulo-cambio-rol">
              Cambiar rol
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600 [&_strong]:font-bold [&_strong]:text-[#095540]">
              Usuario:{' '}
              <strong>{usuarioSeleccionado.nombreUsuario}</strong>
            </p>

            <label className="mt-6 block text-sm font-bold text-[#095540]" htmlFor="nuevoRol">
              Nuevo rol
            </label>

            <select
              id="nuevoRol"
              autoFocus
              value={nuevoRol}
              onChange={(e) =>
                setNuevoRol(e.target.value as NombreRol)
              }
              disabled={guardando}
              className="mt-2 min-h-11 w-full rounded-xl border border-[#dce8d7] bg-[#fbfdf9] px-4 text-sm font-medium text-slate-800 outline-none transition duration-200 hover:border-[#8dc63f]/70 focus-visible:border-[#009444] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#009444]/10 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            >
              <option value="">Selecciona un rol</option>
              <option value="administrador">Administrador</option>
              <option value="asociado">Asociado</option>
              <option value="visitante">Visitante</option>
            </select>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarCambioRol}
                disabled={guardando}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition duration-200 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarCambioRol}
                disabled={guardando || !nuevoRol}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarConfirmacion && usuarioSeleccionado && nuevoRol && (
        <div
          className="gestion-roles-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-confirmacion-rol"
        >
          <div className="gestion-roles-modal-contenido">
            <h2 id="titulo-confirmacion-rol">
              Confirmar cambio de rol
            </h2>

            <p>
              ¿Deseas cambiar a{' '}
              <strong>{usuarioSeleccionado.nombreUsuario}</strong>{' '}
              del rol <strong>{usuarioSeleccionado.rol}</strong> al rol{' '}
              <strong>{nuevoRol}</strong>?
            </p>

            <div className="gestion-roles-modal-acciones">
              <button
                type="button"
                onClick={() => setMostrarConfirmacion(false)}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void actualizarRol()}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Confirmar cambio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}