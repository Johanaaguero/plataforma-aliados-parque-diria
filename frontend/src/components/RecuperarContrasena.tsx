import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ErrorApi,
  ErrorConexion,
  solicitarRecuperacionContrasena,
} from '../services/recuperacionContrasena.service';
import parqueImage from '../assets/parque-hero.jpg';

type EstadoSolicitud = 'idle' | 'cargando' | 'exito' | 'error';

const MENSAJE_CONFIRMACION =
  'Si el correo está registrado, recibirás las instrucciones para recuperar tu contraseña.';
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState('');
  const [errorCorreo, setErrorCorreo] = useState('');
  const [estado, setEstado] = useState<EstadoSolicitud>('idle');
  const [mensaje, setMensaje] = useState('');
  const solicitudEnCurso = useRef(false);

  const validarCorreo = (): string => {
    if (!correo.trim()) {
      return 'Ingresa tu correo electrónico';
    }

    if (!CORREO_REGEX.test(correo.trim())) {
      return 'Ingresa un correo electrónico válido';
    }

    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (solicitudEnCurso.current) {
      return;
    }

    const nuevoError = validarCorreo();
    setErrorCorreo(nuevoError);

    if (nuevoError) {
      setEstado('idle');
      setMensaje('');
      return;
    }

    solicitudEnCurso.current = true;
    setEstado('cargando');
    setMensaje('');

    try {
      await solicitarRecuperacionContrasena(correo.trim());
      setEstado('exito');
      setMensaje(MENSAJE_CONFIRMACION);
    } catch (error) {
      setEstado('error');

      if (error instanceof ErrorApi) {
        setMensaje(error.message);
      } else if (error instanceof ErrorConexion) {
        setMensaje('Sin conexión con el servidor. Inténtalo de nuevo.');
      } else {
        setMensaje('No se pudo configurar la conexión con el servidor.');
      }
    } finally {
      solicitudEnCurso.current = false;
    }
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#0b3b2e] px-4 py-24 font-sans sm:px-6 lg:px-8">
      <img
        src={parqueImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-30 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0 -z-20 bg-gradient-to-br from-[#06251d]/90 via-[#0a4938]/76 to-[#132f25]/90"
        aria-hidden="true"
      />
      <div
        className="absolute -right-24 top-1/4 -z-10 h-72 w-72 rounded-full bg-[#8dc63f]/20 blur-3xl"
        aria-hidden="true"
      />

      <form
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-[#fffef9]/95 p-6 pt-9 shadow-[0_28px_80px_rgba(3,30,22,0.38)] backdrop-blur-xl motion-safe:transition-[transform,box-shadow] motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none sm:p-9 sm:pt-11"
        noValidate
        onSubmit={handleSubmit}
        aria-busy={estado === 'cargando'}
        aria-labelledby="recuperar-titulo"
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#0b4d3a] via-[#36a269] to-[#a8d84e]"
          aria-hidden="true"
        />

        <header className="mb-7 text-left">
          <span className="mb-3 inline-flex items-center rounded-full border border-[#8dc63f]/35 bg-[#eaf5d9] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#174d35]">
            Aliados del Parque
          </span>
          <h1
            id="recuperar-titulo"
            className="text-3xl font-bold tracking-tight text-[#123a2c] sm:text-[2rem]"
          >
            Recuperar contraseña
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Escribe el correo asociado a tu cuenta y te enviaremos un enlace
            para crear una nueva contraseña.
          </p>
        </header>

        <div>
          <label
            className="text-sm font-semibold text-[#183c2f]"
            htmlFor="correo-recuperacion"
          >
            Correo electrónico
          </label>
          <input
            id="correo-recuperacion"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={correo}
            className={`mt-2 block w-full rounded-2xl border bg-white/95 px-4 py-3 text-[0.9375rem] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-200 motion-reduce:transition-none ${
              errorCorreo
                ? 'border-red-500 bg-red-50/40 focus-visible:border-red-600 focus-visible:ring-red-200/70'
                : 'border-emerald-950/15 hover:border-emerald-800/40 focus-visible:border-[#16845f] focus-visible:ring-[#8dc63f]/25'
            }`}
            aria-invalid={Boolean(errorCorreo)}
            aria-describedby={
              errorCorreo
                ? 'correo-recuperacion-ayuda correo-recuperacion-error'
                : 'correo-recuperacion-ayuda'
            }
            onChange={(event) => {
              setCorreo(event.target.value);
              setErrorCorreo('');

              if (estado !== 'cargando') {
                setEstado('idle');
                setMensaje('');
              }
            }}
            placeholder="correo@ejemplo.com"
          />
          <span
            id="correo-recuperacion-ayuda"
            className="mt-2 block text-xs leading-5 text-slate-500"
          >
            Recibirás las instrucciones en este correo si la cuenta está
            registrada.
          </span>
          {errorCorreo && (
            <span
              id="correo-recuperacion-error"
              className="mt-2 flex items-center gap-2 text-xs font-medium text-red-700"
              role="alert"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
              {errorCorreo}
            </span>
          )}
        </div>

        <div className="mt-7">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0b6246] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(11,98,70,0.24)] outline-none motion-safe:hover:-translate-y-0.5 hover:bg-[#084c37] hover:shadow-[0_14px_30px_rgba(11,98,70,0.3)] focus-visible:ring-4 focus-visible:ring-[#8dc63f]/40 focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-emerald-900/45 disabled:shadow-none motion-safe:transition-[transform,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transform-none motion-reduce:transition-none"
            disabled={estado === 'cargando' || estado === 'exito'}
          >
            {estado === 'cargando'
              ? 'Enviando solicitud...'
              : 'Enviar instrucciones'}
          </button>
        </div>

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

        <p className="mt-6 text-center text-sm">
          <a
            href="/login"
            className="rounded-md font-bold text-[#0b6246] underline-offset-4 outline-none hover:text-[#073f31] hover:underline focus-visible:ring-2 focus-visible:ring-[#16845f] focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none"
          >
            ← Volver a Iniciar sesión
          </a>
        </p>
      </form>
    </main>
  );
}
