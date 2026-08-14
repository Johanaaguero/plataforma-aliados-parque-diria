import { useEffect, useMemo, useState } from 'react';
import './GestionRoles.css';

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
          resultado.message ?? 'No tiene permisos para realizar esta operación'
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
          resultado.message ?? 'No tiene permisos para realizar esta operación'
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
    <div className="gestion-roles-container">
      <div className="gestion-roles-header">
        <span className="gestion-roles-eyebrow">
          Gestión de usuarios
        </span>

        <h1>Gestión de Roles</h1>

        <p>
          Consulta los usuarios y el rol asignado a cada uno.
        </p>
      </div>

      <div className="gestion-roles-filtros">
        <div className="gestion-roles-campo">
          <label htmlFor="busqueda">Buscar usuario</label>

          <input
            id="busqueda"
            type="text"
            placeholder="Nombre, usuario o correo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="gestion-roles-campo">
          <label htmlFor="filtroRol">Filtrar por rol</label>

          <select
            id="filtroRol"
            value={filtroRol}
            onChange={(e) =>
              setFiltroRol(e.target.value as 'todos' | NombreRol)
            }
          >
            <option value="todos">Todos</option>
            <option value="administrador">Administrador</option>
            <option value="asociado">Asociado</option>
            <option value="visitante">Visitante</option>
          </select>
        </div>
      </div>

      {cargando && (
        <p className="gestion-roles-mensaje">
          Cargando usuarios...
        </p>
      )}

      {mensaje && (
        <p
          className={`gestion-roles-mensaje gestion-roles-mensaje--${tipoMensaje}`}
        >
          {mensaje}
        </p>
      )}

      {!cargando && (
        <div className="gestion-roles-tabla-contenedor">
          <table className="gestion-roles-tabla">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre completo</th>
                <th>Correo</th>
                <th>Rol actual</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>{usuario.nombreUsuario}</td>

                    <td>
                      {usuario.nombre} {usuario.apellidos}
                    </td>

                    <td>{usuario.correo}</td>

                    <td>{usuario.rol ?? 'Sin rol'}</td>

                    <td>
                      <button
                        type="button"
                        onClick={() => abrirCambioRol(usuario)}
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
          className="gestion-roles-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-cambio-rol"
        >
          <div className="gestion-roles-modal-contenido">
            <h2 id="titulo-cambio-rol">
              Cambiar rol
            </h2>

            <p>
              Usuario:{' '}
              <strong>{usuarioSeleccionado.nombreUsuario}</strong>
            </p>

            <label htmlFor="nuevoRol">
              Nuevo rol
            </label>

            <select
              id="nuevoRol"
              value={nuevoRol}
              onChange={(e) =>
                setNuevoRol(e.target.value as NombreRol)
              }
              disabled={guardando}
            >
              <option value="">Selecciona un rol</option>
              <option value="administrador">Administrador</option>
              <option value="asociado">Asociado</option>
              <option value="visitante">Visitante</option>
            </select>

            <div className="gestion-roles-modal-acciones">
              <button
                type="button"
                onClick={cerrarCambioRol}
                disabled={guardando}
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
