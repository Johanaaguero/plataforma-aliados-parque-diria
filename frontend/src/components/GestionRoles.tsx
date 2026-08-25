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

  const estilosAnimacion = `
    @keyframes gestionRolesEntrada {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `;

  return (
    <>
      <style>{estilosAnimacion}</style>

      <div
        className="min-h-screen px-6 pb-[60px] pt-12 text-[#17372c] [background:radial-gradient(circle_at_top_left,rgba(141,198,63,0.12),transparent_28%),linear-gradient(180deg,#fbfdfb_0%,#f6faf7_100%)]"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="mx-auto mb-[30px] max-w-[1100px]">
          <span className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-[#009444]/[0.08] px-3 py-[7px] text-[13px] font-bold tracking-[0.04em] text-[#009444]">
            Gestión de usuarios
          </span>

          <h1 className="m-0 text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[#095540]">
            Gestión de Roles
          </h1>

          <p className="mt-3 max-w-[700px] text-[15px] font-medium leading-[1.7] text-[#6b7d75]">
            Consulta los usuarios y el rol asignado a cada uno.
          </p>
        </div>

        <div className="mx-auto mb-[22px] grid max-w-[1100px] gap-4 rounded-2xl border border-[#e2ebe5] bg-white p-[18px] shadow-[0_18px_45px_rgba(9,85,64,0.08)] md:grid-cols-[minmax(240px,1fr)_220px]">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="busqueda"
              className="text-[13px] font-bold text-[#095540]"
            >
              Buscar usuario
            </label>

            <input
              id="busqueda"
              type="text"
              placeholder="Nombre, usuario o correo"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="min-h-[44px] w-full box-border rounded-[10px] border border-[#e2ebe5] bg-[#fbfdfb] px-[14px] text-sm font-medium text-[#17372c] transition duration-200 placeholder:text-[#9aa8a1] focus:border-[#009444] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#009444]/10"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="filtroRol"
              className="text-[13px] font-bold text-[#095540]"
            >
              Filtrar por rol
            </label>

            <select
              id="filtroRol"
              value={filtroRol}
              onChange={(e) =>
                setFiltroRol(e.target.value as 'todos' | NombreRol)
              }
              className="min-h-[44px] w-full box-border rounded-[10px] border border-[#e2ebe5] bg-[#fbfdfb] px-[14px] text-sm font-medium text-[#17372c] transition duration-200 focus:border-[#009444] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#009444]/10"
            >
              <option value="todos">Todos</option>
              <option value="administrador">Administrador</option>
              <option value="asociado">Asociado</option>
              <option value="visitante">Visitante</option>
            </select>
          </div>
        </div>

        {cargando && (
          <p className="mx-auto my-4 max-w-[1100px] rounded-xl border border-[#009444]/[0.15] bg-[#009444]/[0.09] px-4 py-[13px] text-center text-sm font-bold text-[#009444]">
            Cargando usuarios...
          </p>
        )}

        {mensaje && (
          <p
            className={`mx-auto my-4 max-w-[1100px] rounded-xl border px-4 py-[13px] text-center text-sm font-bold ${
              tipoMensaje === 'exito'
                ? 'border-[#009444]/[0.15] bg-[#009444]/[0.09] text-[#009444]'
                : 'border-[#d9d623]/[0.25] bg-[#d9d623]/[0.13] text-[#6c6800]'
            }`}
          >
            {mensaje}
          </p>
        )}

        {!cargando && (
          <div className="mx-auto max-w-[1100px] overflow-x-auto rounded-[18px] border border-[#e2ebe5] bg-white shadow-[0_18px_45px_rgba(9,85,64,0.08)]">
            <table className="w-full min-w-[760px] border-collapse md:min-w-full">
              <thead className="bg-gradient-to-r from-[#095540] to-[#009444]">
                <tr>
                  <th className="px-[18px] py-4 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-white">
                    Usuario
                  </th>

                  <th className="px-[18px] py-4 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-white">
                    Nombre completo
                  </th>

                  <th className="px-[18px] py-4 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-white">
                    Correo
                  </th>

                  <th className="px-[18px] py-4 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-white">
                    Rol actual
                  </th>

                  <th className="px-[18px] py-4 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-white">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-[18px] py-4 text-sm font-medium text-[#17372c]"
                    >
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="transition-colors duration-200 hover:bg-[#f8fcf9]"
                    >
                      <td className="border-b border-[#edf2ee] px-[18px] py-4 text-sm font-bold text-[#095540]">
                        {usuario.nombreUsuario}
                      </td>

                      <td className="border-b border-[#edf2ee] px-[18px] py-4 text-sm font-medium text-[#17372c]">
                        {usuario.nombre} {usuario.apellidos}
                      </td>

                      <td className="border-b border-[#edf2ee] px-[18px] py-4 text-sm font-medium text-[#17372c]">
                        {usuario.correo}
                      </td>

                      <td className="border-b border-[#edf2ee] px-[18px] py-4 text-sm font-medium text-[#17372c]">
                        {usuario.rol ?? 'Sin rol'}
                      </td>

                      <td className="border-b border-[#edf2ee] px-[18px] py-4 text-sm font-medium text-[#17372c]">
                        <button
                          type="button"
                          onClick={() => abrirCambioRol(usuario)}
                          className="rounded-[9px] border border-[#009444]/[0.18] bg-[#009444]/[0.08] px-[13px] py-[9px] text-[13px] font-bold text-[#009444] transition duration-200 hover:-translate-y-[1px] hover:bg-[#009444] hover:text-white disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
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
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#095540]/50 p-5 backdrop-blur-[5px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cambio-rol"
          >
            <div
              className="w-full max-w-[440px] rounded-[20px] border border-white/50 bg-white p-[30px] shadow-[0_25px_70px_rgba(9,85,64,0.2)] animate-[gestionRolesEntrada_0.2s_ease-out]"
            >
              <h2
                id="titulo-cambio-rol"
                className="m-0 mb-2.5 text-[24px] font-bold text-[#095540]"
              >
                Cambiar rol
              </h2>

              <p className="mb-5 text-sm leading-[1.7] text-[#6b7d75]">
                Usuario:{' '}
                <strong className="font-bold text-[#095540]">
                  {usuarioSeleccionado.nombreUsuario}
                </strong>
              </p>

              <label
                htmlFor="nuevoRol"
                className="mb-2 block text-[13px] font-bold text-[#095540]"
              >
                Nuevo rol
              </label>

              <select
                id="nuevoRol"
                value={nuevoRol}
                onChange={(e) =>
                  setNuevoRol(e.target.value as NombreRol)
                }
                disabled={guardando}
                className="min-h-[44px] w-full box-border rounded-[10px] border border-[#e2ebe5] bg-[#fbfdfb] px-[14px] text-sm font-medium text-[#17372c] transition duration-200 focus:border-[#009444] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#009444]/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Selecciona un rol</option>
                <option value="administrador">Administrador</option>
                <option value="asociado">Asociado</option>
                <option value="visitante">Visitante</option>
              </select>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={cerrarCambioRol}
                  disabled={guardando}
                  className="min-h-[42px] rounded-[9px] border border-[#e2ebe5] bg-[#f7faf8] px-4 text-[13px] font-bold text-[#17372c] transition duration-200 hover:bg-[#edf5ef] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarCambioRol}
                  disabled={guardando || !nuevoRol}
                  className="min-h-[42px] rounded-[9px] border border-[#009444] bg-[#009444] px-4 text-[13px] font-bold text-white transition duration-200 hover:border-[#095540] hover:bg-[#095540] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarConfirmacion && usuarioSeleccionado && nuevoRol && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#095540]/50 p-5 backdrop-blur-[5px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmacion-rol"
          >
            <div
              className="w-full max-w-[440px] rounded-[20px] border border-white/50 bg-white p-[30px] shadow-[0_25px_70px_rgba(9,85,64,0.2)] animate-[gestionRolesEntrada_0.2s_ease-out]"
            >
              <h2
                id="titulo-confirmacion-rol"
                className="m-0 mb-2.5 text-[24px] font-bold text-[#095540]"
              >
                Confirmar cambio de rol
              </h2>

              <p className="mb-5 text-sm leading-[1.7] text-[#6b7d75]">
                ¿Deseas cambiar a{' '}
                <strong className="font-bold text-[#095540]">
                  {usuarioSeleccionado.nombreUsuario}
                </strong>{' '}
                del rol{' '}
                <strong className="font-bold text-[#095540]">
                  {usuarioSeleccionado.rol}
                </strong>{' '}
                al rol{' '}
                <strong className="font-bold text-[#095540]">
                  {nuevoRol}
                </strong>
                ?
              </p>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacion(false)}
                  disabled={guardando}
                  className="min-h-[42px] rounded-[9px] border border-[#e2ebe5] bg-[#f7faf8] px-4 text-[13px] font-bold text-[#17372c] transition duration-200 hover:bg-[#edf5ef] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => void actualizarRol()}
                  disabled={guardando}
                  className="min-h-[42px] rounded-[9px] border border-[#009444] bg-[#009444] px-4 text-[13px] font-bold text-white transition duration-200 hover:border-[#095540] hover:bg-[#095540] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando ? 'Guardando...' : 'Confirmar cambio'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}