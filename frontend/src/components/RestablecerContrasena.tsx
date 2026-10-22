import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ErrorApi,
  restablecerContrasena,
} from '../services/recuperacionContrasena.service';
import parqueImage from '../assets/parque-hero.jpg';

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

const PASSWORD_INPUT_CLASS =
  'block w-full rounded-2xl border border-emerald-950/15 bg-white/95 px-4 py-3 pr-24 text-[0.9375rem] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 hover:border-emerald-800/40 focus-visible:border-[#16845f] focus-visible:ring-4 focus-visible:ring-[#8dc63f]/25 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-200 motion-reduce:transition-none';
const PASSWORD_TOGGLE_CLASS =
  'absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-bold text-[#0b6246] outline-none hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-[#16845f] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none';

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
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#095540] px-4 py-24 font-sans sm:px-6 lg:px-8">
      <img
        src={parqueImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-30 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0 -z-20 bg-gradient-to-br from-[#095540]/90 via-[#095540]/76 to-black/60"
        aria-hidden="true"
      />
      <div
        className="absolute -left-24 top-1/3 -z-10 h-72 w-72 rounded-full bg-[#8dc63f]/20 blur-3xl"
        aria-hidden="true"
      />

      <form
        className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/70 bg-[#fffef9]/95 p-6 pt-9 shadow-[0_28px_80px_rgba(3,30,22,0.38)] backdrop-blur-xl motion-safe:transition-[transform,box-shadow] motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none sm:p-9 sm:pt-11"
        noValidate
        onSubmit={handleSubmit}
        aria-busy={estado === 'cargando'}
        aria-labelledby="restablecer-titulo"
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#095540] via-[#009444] to-[#8DC63F]"
          aria-hidden="true"
        />

        <header className="mb-7 text-left">
          <span className="mb-3 inline-flex items-center rounded-full border border-[#8dc63f]/35 bg-[#eaf5d9] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#174d35]">
            Aliados del Parque
          </span>
          <h1
            id="restablecer-titulo"
            className="font-brand text-3xl font-bold tracking-tight text-[#095540] sm:text-[2rem]"
          >
            Restablecer contraseña
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Crea una contraseña nueva y segura para volver a ingresar a tu
            cuenta.
          </p>
        </header>

        {tokenAusente && (
          <div
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-800"
            role="alert"
          >
            Este enlace no incluye un token de recuperación válido. Solicita
            uno nuevo para continuar.
          </div>
        )}

        <fieldset
          className="min-w-0 border-0 p-0 disabled:opacity-70"
          disabled={formularioDeshabilitado}
        >
          <legend className="sr-only">
            Define tu nueva contraseña
          </legend>

          <div>
            <label
              className="text-sm font-semibold text-[#183c2f]"
              htmlFor="new-password"
            >
              Nueva contraseña
            </label>
            <div className="relative mt-2">
              <input
                id="new-password"
                type={mostrarPassword ? 'text' : 'password'}
                className={PASSWORD_INPUT_CLASS}
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
                className={PASSWORD_TOGGLE_CLASS}
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
            className="mt-4 rounded-2xl border border-emerald-950/10 bg-[#edf6df]/70 p-4"
            aria-live="polite"
          >
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#244a38]">
              Tu contraseña debe incluir:
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-x-4">
              {requisitos.map((requisito) => (
                <li
                  key={requisito.id}
                  className={`flex items-center gap-2 text-xs leading-5 ${
                    requisito.cumplido
                      ? 'font-semibold text-[#0b6246]'
                      : 'text-slate-500'
                  }`}
                >
                  <span className="sr-only">
                    {requisito.cumplido ? 'Cumplido: ' : 'Pendiente: '}
                  </span>
                  <span
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.7rem] ${
                      requisito.cumplido
                        ? 'border-[#0b6246] bg-[#0b6246] text-white'
                        : 'border-slate-300 bg-white/80 text-slate-400'
                    }`}
                    aria-hidden="true"
                  >
                    {requisito.cumplido ? '✓' : '○'}
                  </span>
                  {requisito.texto}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <label
              className="text-sm font-semibold text-[#183c2f]"
              htmlFor="confirm-password"
            >
              Confirmar nueva contraseña
            </label>
            <div className="relative mt-2">
              <input
                id="confirm-password"
                type={mostrarConfirmacion ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                className={
                  confirmacionIngresada && !passwordsCoinciden
                    ? 'block w-full rounded-2xl border border-red-500 bg-red-50/40 px-4 py-3 pr-24 text-[0.9375rem] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:border-red-600 focus-visible:ring-4 focus-visible:ring-red-200/70 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-200 motion-reduce:transition-none'
                    : PASSWORD_INPUT_CLASS
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
                className={PASSWORD_TOGGLE_CLASS}
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
                className="mt-2 flex items-center gap-2 text-xs font-medium text-red-700"
                role="alert"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
                Las contraseñas no coinciden
              </span>
            )}
          </div>

          <div className="mt-7">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0b6246] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(11,98,70,0.24)] outline-none motion-safe:hover:-translate-y-0.5 hover:bg-[#084c37] hover:shadow-[0_14px_30px_rgba(11,98,70,0.3)] focus-visible:ring-4 focus-visible:ring-[#8dc63f]/40 focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-emerald-900/45 disabled:shadow-none motion-safe:transition-[transform,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transform-none motion-reduce:transition-none"
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
                ? 'mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-800'
                : 'mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-800'
            }
            role={estado === 'error' ? 'alert' : 'status'}
            aria-live={estado === 'error' ? 'assertive' : 'polite'}
          >
            {mensaje}
          </p>
        )}

        <nav
          className="mt-6 flex flex-col items-center justify-center gap-3 text-center text-sm sm:flex-row sm:gap-5"
          aria-label="Opciones de acceso"
        >
          {tokenAusente || estado === 'error' ? (
            <a
              href="/recuperar-contrasena"
              className="rounded-md font-bold text-[#0b6246] underline-offset-4 outline-none hover:text-[#073f31] hover:underline focus-visible:ring-2 focus-visible:ring-[#16845f] focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none"
            >
              Solicitar un nuevo enlace
            </a>
          ) : null}
          <a
            href="/login"
            className={
              estado === 'exito'
                ? 'inline-flex items-center justify-center rounded-2xl bg-[#0b6246] px-5 py-3 font-bold text-white shadow-[0_10px_24px_rgba(11,98,70,0.24)] outline-none motion-safe:hover:-translate-y-0.5 hover:bg-[#084c37] focus-visible:ring-4 focus-visible:ring-[#8dc63f]/40 focus-visible:ring-offset-2 motion-safe:transition-[transform,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transform-none motion-reduce:transition-none'
                : 'rounded-md font-bold text-[#0b6246] underline-offset-4 outline-none hover:text-[#073f31] hover:underline focus-visible:ring-2 focus-visible:ring-[#16845f] focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none'
            }
          >
            {estado === 'exito' ? 'Iniciar sesión' : '← Volver a Iniciar sesión'}
          </a>
        </nav>
      </form>
    </main>
  );
}
