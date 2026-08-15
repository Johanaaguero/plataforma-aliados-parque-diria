import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ErrorApi,
  restablecerContrasena,
} from '../services/recuperacionContrasena.service';
import './recuperacion.css';

type EstadoSolicitud = 'idle' | 'cargando' | 'exito' | 'error';

interface RequisitoPassword {
  id: string;
  texto: string;
  validar: (password: string) => boolean;
}

const REQUISITOS_PASSWORD: RequisitoPassword[] = [
  {
    id: 'longitud',
    texto: 'Al menos 8 caracteres',
    validar: (password) => password.length >= 8,
  },
  {
    id: 'minuscula',
    texto: 'Una letra minúscula',
    validar: (password) => /[a-z]/.test(password),
  },
  {
    id: 'mayuscula',
    texto: 'Una letra mayúscula',
    validar: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'numero',
    texto: 'Un número',
    validar: (password) => /[0-9]/.test(password),
  },
  {
    id: 'especial',
    texto: 'Un carácter especial',
    validar: (password) => /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password),
  },
];

const MENSAJE_EXITO = 'Tu contraseña fue actualizada correctamente.';
const MENSAJE_TOKEN_INVALIDO =
  'El enlace de recuperación es inválido, ya fue utilizado o ha expirado.';
const MENSAJES_PASSWORD_INVALIDA = new Set([
  'La contraseña debe tener al menos 8 caracteres',
  'La contraseña debe tener al menos una letra minúscula',
  'La contraseña debe tener al menos una letra mayúscula',
  'La contraseña debe tener al menos un número',
  'La contraseña debe tener al menos un carácter especial',
]);

export default function RestablecerContrasena() {
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get('token')?.trim() ?? '',
    [],
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [estado, setEstado] = useState<EstadoSolicitud>('idle');
  const [mensaje, setMensaje] = useState('');
  const solicitudEnCurso = useRef(false);

  const tokenAusente = !token;
  const requisitos = REQUISITOS_PASSWORD.map((requisito) => ({
    ...requisito,
    cumplido: requisito.validar(newPassword),
  }));
  const passwordValida = requisitos.every((requisito) => requisito.cumplido);
  const confirmacionIngresada = confirmPassword.length > 0;
  const passwordsCoinciden =
    confirmacionIngresada && newPassword === confirmPassword;
  const formularioValido =
    !tokenAusente && passwordValida && passwordsCoinciden;
  const formularioDeshabilitado =
    tokenAusente || estado === 'cargando' || estado === 'exito';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      solicitudEnCurso.current ||
      !formularioValido ||
      formularioDeshabilitado
    ) {
      return;
    }

    solicitudEnCurso.current = true;
    setEstado('cargando');
    setMensaje('');

    try {
      await restablecerContrasena(token, newPassword);
      setEstado('exito');
      setMensaje(MENSAJE_EXITO);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setEstado('error');

      if (error instanceof ErrorApi && error.status === 400) {
        setMensaje(
          MENSAJES_PASSWORD_INVALIDA.has(error.message)
            ? error.message
            : MENSAJE_TOKEN_INVALIDO,
        );
      } else {
        setMensaje(
          'No se pudo actualizar la contraseña. Revisa tu conexión e inténtalo de nuevo.',
        );
      }
    } finally {
      solicitudEnCurso.current = false;
    }
  };

  return (
    <main className="registro-container recuperacion-container">
      <form
        className="registro-form recuperacion-form recuperacion-form--restablecer"
        noValidate
        onSubmit={handleSubmit}
        aria-busy={estado === 'cargando'}
        aria-labelledby="restablecer-titulo"
      >
        <div className="registro-franja" aria-hidden="true" />

        <header className="registro-header">
          <span className="registro-eyebrow">Aliados del Parque</span>
          <h1 id="restablecer-titulo">Restablecer contraseña</h1>
          <p>
            Crea una contraseña nueva y segura para volver a ingresar a tu
            cuenta.
          </p>
        </header>

        {tokenAusente && (
          <div
            className="registro-mensaje registro-mensaje--error recuperacion-mensaje"
            role="alert"
          >
            Este enlace no incluye un token de recuperación válido. Solicita
            uno nuevo para continuar.
          </div>
        )}

        <fieldset
          className="recuperacion-fieldset"
          disabled={formularioDeshabilitado}
        >
          <legend className="recuperacion-sr-only">
            Define tu nueva contraseña
          </legend>

          <div className="registro-campo">
            <label htmlFor="new-password">Nueva contraseña</label>
            <div className="recuperacion-password-control">
              <input
                id="new-password"
                type={mostrarPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={newPassword}
                aria-invalid={newPassword.length > 0 && !passwordValida}
                aria-describedby="password-requisitos"
                onChange={(event) => {
                  setNewPassword(event.target.value);
                }}
                placeholder="Escribe tu nueva contraseña"
              />
              <button
                type="button"
                className="recuperacion-mostrar-password"
                onClick={() => setMostrarPassword((valor) => !valor)}
                aria-label={
                  mostrarPassword
                    ? 'Ocultar nueva contraseña'
                    : 'Mostrar nueva contraseña'
                }
                aria-pressed={mostrarPassword}
              >
                {mostrarPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <div
            id="password-requisitos"
            className="recuperacion-requisitos"
            aria-live="polite"
          >
            <p>Tu contraseña debe incluir:</p>
            <ul>
              {requisitos.map((requisito) => (
                <li
                  key={requisito.id}
                  className={
                    requisito.cumplido
                      ? 'recuperacion-requisito recuperacion-requisito--cumplido'
                      : 'recuperacion-requisito'
                  }
                >
                  <span className="recuperacion-sr-only">
                    {requisito.cumplido ? 'Cumplido: ' : 'Pendiente: '}
                  </span>
                  <span aria-hidden="true">
                    {requisito.cumplido ? '✓' : '○'}
                  </span>
                  {requisito.texto}
                </li>
              ))}
            </ul>
          </div>

          <div className="registro-campo">
            <label htmlFor="confirm-password">
              Confirmar nueva contraseña
            </label>
            <div className="recuperacion-password-control">
              <input
                id="confirm-password"
                type={mostrarConfirmacion ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                className={
                  confirmacionIngresada && !passwordsCoinciden
                    ? 'campo-invalido'
                    : ''
                }
                aria-invalid={
                  confirmacionIngresada && !passwordsCoinciden
                }
                aria-describedby={
                  confirmacionIngresada && !passwordsCoinciden
                    ? 'confirm-password-error'
                    : undefined
                }
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                }}
                placeholder="Repite tu nueva contraseña"
              />
              <button
                type="button"
                className="recuperacion-mostrar-password"
                onClick={() => setMostrarConfirmacion((valor) => !valor)}
                aria-label={
                  mostrarConfirmacion
                    ? 'Ocultar confirmación de contraseña'
                    : 'Mostrar confirmación de contraseña'
                }
                aria-pressed={mostrarConfirmacion}
              >
                {mostrarConfirmacion ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {confirmacionIngresada && !passwordsCoinciden && (
              <span
                id="confirm-password-error"
                className="campo-error"
                role="alert"
              >
                Las contraseñas no coinciden
              </span>
            )}
          </div>

          <div className="registro-acciones">
            <button
              type="submit"
              className="registro-boton-primario"
              disabled={!formularioValido || estado === 'cargando'}
            >
              {estado === 'cargando'
                ? 'Guardando contraseña...'
                : 'Guardar nueva contraseña'}
            </button>
          </div>
        </fieldset>

        {mensaje && (
          <p
            className={
              estado === 'exito'
                ? 'registro-mensaje registro-mensaje--exito recuperacion-mensaje'
                : 'registro-mensaje registro-mensaje--error recuperacion-mensaje'
            }
            role={estado === 'error' ? 'alert' : 'status'}
            aria-live={estado === 'error' ? 'assertive' : 'polite'}
          >
            {mensaje}
          </p>
        )}

        <nav className="recuperacion-enlaces" aria-label="Opciones de acceso">
          {tokenAusente || estado === 'error' ? (
            <a href="/recuperar-contrasena" className="recuperacion-enlace">
              Solicitar un nuevo enlace
            </a>
          ) : null}
          <a
            href="/login"
            className={
              estado === 'exito'
                ? 'registro-boton-primario recuperacion-enlace-boton'
                : 'recuperacion-enlace'
            }
          >
            {estado === 'exito' ? 'Iniciar sesión' : '← Volver a Iniciar sesión'}
          </a>
        </nav>
      </form>
    </main>
  );
}
