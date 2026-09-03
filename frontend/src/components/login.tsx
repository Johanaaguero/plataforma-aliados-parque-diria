import { useState, type FormEvent } from 'react';
import { api } from '../services/api';
import parqueImage from '../assets/parque-hero.jpg';
import logo from '../assets/logo.png';

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
    <div className="relative isolate min-h-screen overflow-hidden bg-[#095540] px-4 py-24 font-sans sm:px-6 sm:py-28 lg:px-8 lg:py-20">
      <img
        src={parqueImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-30 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0 -z-20 bg-gradient-to-r from-[#095540]/88 via-[#095540]/58 to-black/55"
        aria-hidden="true"
      />
      <div
        className="absolute -left-24 top-1/4 -z-10 h-72 w-72 rounded-full bg-[#8DC63F]/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -right-20 bottom-12 -z-10 h-64 w-64 rounded-full bg-[#00AEEF]/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 lg:min-h-[calc(100vh-10rem)] lg:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)] lg:gap-16">
        <aside className="hidden max-w-xl lg:flex lg:flex-col lg:items-start lg:justify-center" aria-label="Aliados del Parque">
          <div className="rounded-[2rem] border border-white/55 bg-white/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <img
              src={logo}
              alt="Logo de Aliados del Parque Nacional Diriá"
              className="h-auto w-56"
            />
          </div>
          <p className="mt-8 max-w-lg font-brand text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-lg xl:text-5xl">
            Naturaleza que inspira, comunidades que conectan.
          </p>
        </aside>

        <form
        className="relative w-full max-w-lg justify-self-center overflow-hidden rounded-[2rem] border border-white/65 bg-white/84 p-6 pt-9 shadow-[0_30px_90px_rgba(0,0,0,0.3)] backdrop-blur-2xl motion-safe:transition-[transform,box-shadow] motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none sm:p-8 sm:pt-11 lg:justify-self-end"
        noValidate
        onSubmit={handleSubmit}
        aria-busy={estado === 'cargando'}
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#095540] via-[#009444] to-[#8DC63F]"
          aria-hidden="true"
        />

        <div className="mb-6 flex justify-center lg:hidden">
          <div className="rounded-2xl border border-[#095540]/10 bg-white/90 p-3 shadow-sm">
            <img
              src={logo}
              alt="Logo de Aliados del Parque Nacional Diriá"
              className="h-auto w-32"
            />
          </div>
        </div>

        <div className="mb-7 text-left">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8DC63F]/50 bg-[#8DC63F]/18 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#095540]">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2C7 2 3 6 3 11c0 5.5 6 10 9 11 3-1 9-5.5 9-11 0-5-4-9-9-9z"
                fill="currentColor"
              />
            </svg>
            Programa de visitantes
          </span>

          <h1 className="font-brand text-3xl font-bold tracking-tight text-[#095540] sm:text-[2rem]">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ingresa con tu cuenta para continuar
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold text-[#095540]" htmlFor="identificador">
            Correo o nombre de usuario
          </label>
          <input
            id="identificador"
            type="text"
            className={`mt-2 block w-full rounded-2xl border bg-white/90 px-4 py-3 text-[0.9375rem] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-200 motion-reduce:transition-none ${
              errores.identificador
                ? 'border-[#D9D823] bg-[#D9D823]/10 focus-visible:border-[#D9D823] focus-visible:ring-[#D9D823]/30'
                : 'border-[#095540]/20 hover:border-[#095540]/45 focus-visible:border-[#009444] focus-visible:ring-[#009444]/25'
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
              className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#095540]"
              role="alert"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
              {errores.identificador}
            </span>
          )}
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold text-[#095540]" htmlFor="password">
            Contraseña
          </label>
          <div className="relative mt-2">
            <input
              id="password"
              type={mostrarPassword ? 'text' : 'password'}
              className={`block w-full rounded-2xl border bg-white/90 px-4 py-3 pr-24 text-[0.9375rem] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-200 motion-reduce:transition-none ${
                errores.password
                  ? 'border-[#D9D823] bg-[#D9D823]/10 focus-visible:border-[#D9D823] focus-visible:ring-[#D9D823]/30'
                  : 'border-[#095540]/20 hover:border-[#095540]/45 focus-visible:border-[#009444] focus-visible:ring-[#009444]/25'
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
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-bold text-[#095540] outline-none hover:bg-[#8DC63F]/18 focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none"
              disabled={estado === 'cargando'}
            >
              {mostrarPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {errores.password && (
            <span
              id="password-error"
              className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#095540]"
              role="alert"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
              {errores.password}
            </span>
          )}
        </div>

        <p className="mt-3 text-right text-xs sm:text-sm">
          <a
            href="/recuperar-contrasena"
            className="rounded-md font-semibold text-[#095540] underline-offset-4 outline-none hover:text-[#009444] hover:underline focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </p>

        <div className="mt-5">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#095540]/30 accent-[#009444] outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#095540] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(9,85,64,0.28)] outline-none hover:bg-[#009444] hover:shadow-[0_14px_30px_rgba(0,148,68,0.3)] focus-visible:ring-4 focus-visible:ring-[#8DC63F]/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#095540]/45 disabled:shadow-none motion-safe:transition-[transform,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
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
                  ? 'border-[#009444]/30 bg-[#009444]/10 text-[#095540]'
                  : 'border-[#D9D823]/70 bg-[#D9D823]/15 text-black'
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
    </div>
  );
}