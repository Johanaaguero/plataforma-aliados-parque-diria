import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';

type Estado = 'idle' | 'cargando' | 'exito' | 'error';

interface CampoErrores {
  nombreUsuario?: string;
  nombre?: string;
  apellidos?: string;
  correo?: string;
  telefono?: string;
  password?: string;
  confirmPassword?: string;
}
interface RegistroProps {
  onIrLogin: () => void;
}

interface RespuestaRegistro {
  ok?: boolean;
  message?: string;
}

const SEGUNDOS_REDIRECCION = 3;

function obtenerUrlBaseApi(): string | null {
  const urlConfigurada = import.meta.env.VITE_API_URL?.trim();

  return urlConfigurada ? urlConfigurada.replace(/\/+$/, '') : null;
}

export default function Registro({ onIrLogin }: RegistroProps) {  const [nombreUsuario, setNombreUsuario] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [mensaje, setMensaje] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');
  const [errores, setErrores] = useState<CampoErrores>({});
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);

  const validarCampos = (): CampoErrores => {
    const nuevosErrores: CampoErrores = {};

    if (!nombreUsuario.trim()) {
      nuevosErrores.nombreUsuario = 'Completa este campo';
    }

    if (!nombre.trim()) {
      nuevosErrores.nombre = 'Completa este campo';
    }

    if (!apellidos.trim()) {
      nuevosErrores.apellidos = 'Completa este campo';
    }

    if (!correo.trim()) {
      nuevosErrores.correo = 'Completa este campo';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      nuevosErrores.correo = 'Ingresa un correo válido';
    }

    if (!telefono.trim()) {
      nuevosErrores.telefono = 'Completa este campo';
    } else if (!/^\d{8}$/.test(telefono.trim())) {
      nuevosErrores.telefono = 'Debe tener 8 dígitos';
    }

    if (!password.trim()) {
      nuevosErrores.password = 'Completa este campo';
    }

    if (!confirmPassword.trim()) {
      nuevosErrores.confirmPassword = 'Confirma tu contraseña';
    } else if (password !== confirmPassword) {
      nuevosErrores.confirmPassword = 'Las contraseñas no coinciden';
    }

    return nuevosErrores;
  };

  const limpiarError = (campo: keyof CampoErrores) => {
    setErrores((prev) => {
      if (!prev[campo]) return prev;

      const copia = { ...prev };
      delete copia[campo];

      return copia;
    });
  };

  const handleCancelar = () => {
    setNombreUsuario('');
    setNombre('');
    setApellidos('');
    setCorreo('');
    setTelefono('');
    setPassword('');
    setConfirmPassword('');
    setErrores({});
    setMensaje('');
    setEstado('idle');
    setSegundosRestantes(null);
  };

 useEffect(() => {
  if (segundosRestantes === null) return;

  if (segundosRestantes === 0) {
    onIrLogin();
    return;
  }

  const temporizador = setTimeout(() => {
    setSegundosRestantes((prev) =>
      prev !== null ? prev - 1 : null
    );
  }, 1000);

  return () => clearTimeout(temporizador);
}, [segundosRestantes, onIrLogin]);
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nuevosErrores = validarCampos();
    setErrores(nuevosErrores);

    // Si existe algún error, no se envía el formulario
    if (Object.keys(nuevosErrores).length > 0) {
      setMensaje('');
      return;
    }

    setEstado('cargando');

    const urlBaseApi = obtenerUrlBaseApi();

    if (!urlBaseApi) {
      setMensaje('No se pudo configurar la conexión con el servidor');
      setEstado('error');
      return;
    }

    try {
      const respuesta = await fetch(
        `${urlBaseApi}/api/auth/register`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombreUsuario,
            nombre,
            apellidos,
            correo,
            telefono,
            password,
          }),
        },
      );

      let resultado: RespuestaRegistro;

      try {
        resultado = await respuesta.json() as RespuestaRegistro;
      } catch {
        setMensaje('El servidor devolvió una respuesta inesperada');
        setEstado('error');
        return;
      }

      if (!respuesta.ok || resultado.ok !== true) {
        setMensaje(
          resultado.message ?? 'No se pudo completar el registro'
        );
        setEstado('error');
        return;
      }

      setMensaje('Cuenta creada correctamente. Bienvenido/a.');
      setEstado('exito');
      setSegundosRestantes(SEGUNDOS_REDIRECCION);

      setNombreUsuario('');
      setNombre('');
      setApellidos('');
      setCorreo('');
      setTelefono('');
      setPassword('');
      setConfirmPassword('');

    } catch (error) {
      console.error(error);
      setMensaje('No se pudo conectar con el servidor');
      setEstado('error');
    }
  };

  return (
    <div className="registro-container">
      <form
        className="registro-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="registro-franja" aria-hidden="true" />

        <div className="registro-header">
          <span className="registro-eyebrow">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 2C7 2 3 6 3 11c0 5.5 6 10 9 11 3-1 9-5.5 9-11 0-5-4-9-9-9z"
                fill="currentColor"
              />
            </svg>

            Programa de visitantes
          </span>

          <h1>Crea tu cuenta</h1>

          <p>
            Regístrate para reservar tu ingreso al parque
          </p>
        </div>

        <div className="registro-campo">
          <label htmlFor="nombreUsuario">
            Nombre de usuario
          </label>

          <input
            id="nombreUsuario"
            type="text"
            className={
              errores.nombreUsuario
                ? 'campo-invalido'
                : ''
            }
            value={nombreUsuario}
            onChange={(e) => {
              setNombreUsuario(e.target.value);
              limpiarError('nombreUsuario');
            }}
            placeholder="Ej. Usuario123"
          />

          {errores.nombreUsuario && (
            <span className="campo-error">
              {errores.nombreUsuario}
            </span>
          )}
        </div>

        <div className="registro-fila">
          <div className="registro-campo">
            <label htmlFor="nombre">
              Nombre
            </label>

            <input
              id="nombre"
              type="text"
              className={
                errores.nombre
                  ? 'campo-invalido'
                  : ''
              }
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                limpiarError('nombre');
              }}
              placeholder="Nombre"
            />

            {errores.nombre && (
              <span className="campo-error">
                {errores.nombre}
              </span>
            )}
          </div>

          <div className="registro-campo">
            <label htmlFor="apellidos">
              Apellidos
            </label>

            <input
              id="apellidos"
              type="text"
              className={
                errores.apellidos
                  ? 'campo-invalido'
                  : ''
              }
              value={apellidos}
              onChange={(e) => {
                setApellidos(e.target.value);
                limpiarError('apellidos');
              }}
              placeholder="Apellidos"
            />

            {errores.apellidos && (
              <span className="campo-error">
                {errores.apellidos}
              </span>
            )}
          </div>
        </div>

        <div className="registro-campo">
          <label htmlFor="correo">
            Correo electrónico
          </label>

          <input
            id="correo"
            type="email"
            className={
              errores.correo
                ? 'campo-invalido'
                : ''
            }
            value={correo}
            onChange={(e) => {
              setCorreo(e.target.value);
              limpiarError('correo');
            }}
            placeholder="ejemplo@gmail.com"
          />

          {errores.correo && (
            <span className="campo-error">
              {errores.correo}
            </span>
          )}
        </div>

        <div className="registro-campo">
          <label htmlFor="telefono">
            Teléfono
          </label>

          <input
            id="telefono"
            type="tel"
            className={
              errores.telefono
                ? 'campo-invalido'
                : ''
            }
            value={telefono}
            onChange={(e) => {
              setTelefono(e.target.value);
              limpiarError('telefono');
            }}
            placeholder="8888 7777"
          />

          {errores.telefono && (
            <span className="campo-error">
              {errores.telefono}
            </span>
          )}
        </div>

        <div className="registro-campo">
          <label htmlFor="password">
            Contraseña
          </label>

          <input
            id="password"
            type="password"
            className={
              errores.password
                ? 'campo-invalido'
                : ''
            }
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              limpiarError('password');
            }}
            placeholder="Mínimo 8 caracteres"
          />

          {errores.password && (
            <span className="campo-error">
              {errores.password}
            </span>
          )}
        </div>

        {}
        <div className="registro-campo">
          <label htmlFor="confirmPassword">
            Confirmación de contraseña
          </label>

          <input
            id="confirmPassword"
            type="password"
            className={
              errores.confirmPassword
                ? 'campo-invalido'
                : ''
            }
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              limpiarError('confirmPassword');
            }}
            placeholder="Repite tu contraseña"
          />

          {errores.confirmPassword && (
            <span className="campo-error">
              {errores.confirmPassword}
            </span>
          )}
        </div>

        <div className="registro-acciones">
          <button
            type="button"
            className="registro-boton-secundario"
            onClick={handleCancelar}
            disabled={
              estado === 'cargando' ||
              segundosRestantes !== null
            }
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="registro-boton-primario"
            disabled={
              estado === 'cargando' ||
              segundosRestantes !== null
            }
          >
            {estado === 'cargando'
              ? 'Registrando...'
              : 'Registrarse'}
          </button>
        </div>

        {mensaje && (
          <p
            className={`registro-mensaje registro-mensaje--${estado}`}
          >
            <span
              className="registro-mensaje-icono"
              aria-hidden="true"
            >
              {estado === 'exito' ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12 3l9 16H3l9-16z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 10v4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="12"
                    cy="17"
                    r="1"
                    fill="currentColor"
                  />
                </svg>
              )}
            </span>

            {mensaje}
          </p>
        )}

        {segundosRestantes !== null && (
          <p className="registro-redireccion">
            Te llevaremos a iniciar sesión en{' '}
            {segundosRestantes}...
          </p>
        )}

        <p className="registro-login">
          ¿Ya tienes cuenta?{' '}
       <span
  className="registro-login-texto"
  onClick={onIrLogin}
>
  Inicia sesión
</span>
        </p>
      </form>
    </div>
  );
}
