import { useState, type FormEvent } from 'react';
import { api } from '../services/api';
import parqueImage from '../assets/parque-hero.jpg';

/* oxlint-disable react-hooks/rules-of-hooks -- Se conserva el nombre existente del componente. */

type Estado = 'idle' | 'cargando' | 'exito' | 'error';

interface CampoErrores {
  identificador?: string;
  password?: string;
}

type NombreRol = 'administrador' | 'asociado' | 'visitante' | 'super_admin';

interface LoginProps {
  onLogin: (rol: NombreRol) => void;
}

const esNombreRol = (rol: unknown): rol is NombreRol =>
  rol === 'administrador' || rol === 'asociado' || rol === 'visitante' || rol === 'super_admin';

const extraerRolDelToken = (): NombreRol | null => {
  const token = sessionStorage.getItem('token') ?? localStorage.getItem('token');

  if (!token) return null;

  try {
    const payloadCodificado = token.split('.')[1];
    if (!payloadCodificado) return null;

    const base64 = payloadCodificado
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payloadCodificado.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { rol?: unknown };

    return payload.rol === 'administrador' ||
      payload.rol === 'asociado' ||
      payload.rol === 'visitante' ||
      payload.rol === 'super_admin'
      ? payload.rol
      : null;
  } catch {
    return null;
  }
};


export default function login({ onLogin }: LoginProps) {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [recordarSesion, setRecordarSesion] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [mensaje, setMensaje] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');
  const [errores, setErrores] = useState<CampoErrores>({});
  const [codigoError, setCodigoError] = useState<string | null>(null);

  const validarCampos = (): CampoErrores => {
    const nuevosErrores: CampoErrores = {};

    if (!identificador.trim()) {
      nuevosErrores.identificador = 'Completa este campo';
    }

    if (!password.trim()) {
      nuevosErrores.password = 'Completa este campo';
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nuevosErrores = validarCampos();
    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      setMensaje('');
      return;
    }

    setEstado('cargando');
    setCodigoError(null);

    try {
      const resultado = await api.login(identificador.trim(), password);

      if (recordarSesion) {
        localStorage.setItem('token', resultado.token);
      } else {
        sessionStorage.setItem('token', resultado.token);
      }

      setMensaje('Inicio de sesión exitoso');
      setEstado('exito');

      const rolNuevo = extraerRolDelToken();
      if (esNombreRol(rolNuevo)) {
        onLogin(rolNuevo);
      }
    } catch (error: unknown) {
      const apiError = error as { code?: string; message?: string };
      setCodigoError(apiError.code || 'UNKNOWN_ERROR');
      setMensaje(apiError.message || 'No se pudo conectar con el servidor');
      setEstado('error');
      console.error('Error en login:', error);
    }
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#0b3b2e] px-4 py-20 font-sans sm:px-6 lg:px-8">
      <img
        src={parqueImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-30 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0 -z-20 bg-gradient-to-br from-[#06251d]/90 via-[#0a4938]/75 to-[#132f25]/90"
        aria-hidden="true"
      />
      <div
        className="absolute -left-24 top-1/4 -z-10 h-72 w-72 rounded-full bg-[#8dc63f]/20 blur-3xl"
        aria-hidden="true"
      />

      <form
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-[#fffef9]/95 p-6 pt-9 shadow-[0_28px_80px_rgba(3,30,22,0.38)] backdrop-blur-xl motion-safe:transition-[transform,box-shadow] motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none sm:p-8 sm:pt-11"
        noValidate
        onSubmit={handleSubmit}
        aria-busy={estado === 'cargando'}
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#0b4d3a] via-[#36a269] to-[#a8d84e]"
          aria-hidden="true"
        />

        <div className="mb-7 text-left">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8dc63f]/35 bg-[#eaf5d9] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#174d35]">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2C7 2 3 6 3 11c0 5.5 6 10 9 11 3-1 9-5.5 9-11 0-5-4-9-9-9z"
                fill="currentColor"
              />
            </svg>
            Programa de visitantes
          </span>

          <h1 className="text-3xl font-bold tracking-tight text-[#123a2c] sm:text-[2rem]">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ingresa con tu cuenta para continuar
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold text-[#183c2f]" htmlFor="identificador">
            Correo o nombre de usuario
          </label>
          <input
            id="identificador"
            type="text"
            className={`mt-2 block w-full rounded-2xl border bg-white/95 px-4 py-3 text-[0.9375rem] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-200 motion-reduce:transition-none ${
              errores.identificador
                ? 'border-red-500 focus-visible:border-red-600 focus-visible:ring-red-200/70'
                : 'border-emerald-950/15 hover:border-emerald-800/40 focus-visible:border-[#16845f] focus-visible:ring-[#8dc63f]/25'
            }`}
            value={identificador}
            aria-invalid={Boolean(errores.identificador)}
            aria-describedby={
              errores.identificador ? 'identificador-error' : undefined
            }
            onChange={(e) => {
              setIdentificador(e.target.value);
              limpiarError('identificador');
            }}
            placeholder="correo@ejemplo.com o usuario123"
            disabled={estado === 'cargando'}
          />
          {errores.identificador && (
            <span
              id="identificador-error"
              className="mt-2 flex items-center gap-2 text-xs font-medium text-red-700"
              role="alert"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
              {errores.identificador}
            </span>
          )}
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold text-[#183c2f]" htmlFor="password">
            Contraseña
          </label>
          <div className="relative mt-2">
            <input
              id="password"
              type={mostrarPassword ? 'text' : 'password'}
              className={`block w-full rounded-2xl border bg-white/95 px-4 py-3 pr-24 text-[0.9375rem] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-200 motion-reduce:transition-none ${
                errores.password
                  ? 'border-red-500 focus-visible:border-red-600 focus-visible:ring-red-200/70'
                  : 'border-emerald-950/15 hover:border-emerald-800/40 focus-visible:border-[#16845f] focus-visible:ring-[#8dc63f]/25'
              }`}
              value={password}
              aria-invalid={Boolean(errores.password)}
              aria-describedby={errores.password ? 'password-error' : undefined}
              onChange={(e) => {
                setPassword(e.target.value);
                limpiarError('password');
              }}
              placeholder="Tu contraseña"
              disabled={estado === 'cargando'}
            />
            <button
              type="button"
              onClick={() => setMostrarPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-bold text-[#0b6246] outline-none hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-[#16845f] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none"
              disabled={estado === 'cargando'}
            >
              {mostrarPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {errores.password && (
            <span
              id="password-error"
              className="mt-2 flex items-center gap-2 text-xs font-medium text-red-700"
              role="alert"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
              {errores.password}
            </span>
          )}
        </div>

        <p className="mt-3 text-right text-xs sm:text-sm">
          <a
            href="/recuperar-contrasena"
            className="rounded-md font-semibold text-[#0b6246] underline-offset-4 outline-none hover:text-[#073f31] hover:underline focus-visible:ring-2 focus-visible:ring-[#16845f] focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </p>

        <div className="mt-5">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-emerald-950/25 accent-[#0b6246] outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              checked={recordarSesion}
              onChange={(e) => setRecordarSesion(e.target.checked)}
              disabled={estado === 'cargando'}
            />
            Recordar sesión
          </label>
        </div>

        <div className="mt-7">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0b6246] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(11,98,70,0.24)] outline-none motion-safe:hover:-translate-y-0.5 hover:bg-[#084c37] hover:shadow-[0_14px_30px_rgba(11,98,70,0.3)] focus-visible:ring-4 focus-visible:ring-[#8dc63f]/40 focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-emerald-900/45 disabled:shadow-none motion-safe:transition-[transform,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transform-none motion-reduce:transition-none"
            disabled={estado === 'cargando'}
          >
            {estado === 'cargando' ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </div>

        {mensaje && (
          <div className="mt-5">
            <p
              className={`rounded-2xl border px-4 py-3 text-sm font-medium leading-5 ${
                estado === 'exito'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
              role={estado === 'error' ? 'alert' : 'status'}
              aria-live={estado === 'error' ? 'assertive' : 'polite'}
            >
              {mensaje}
            </p>
            {codigoError && (
              <p className="mt-1.5 px-1 text-xs text-slate-500">
                Código: {codigoError}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
