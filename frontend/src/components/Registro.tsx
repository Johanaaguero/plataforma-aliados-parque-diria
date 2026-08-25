import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import parqueImage from '../assets/parque-hero.jpg';

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

const INPUT_BASE_CLASS =
  'mt-2 block w-full rounded-2xl border bg-white/95 px-4 py-3 text-[0.9375rem] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-4 motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-200 motion-reduce:transition-none';
const INPUT_DEFAULT_CLASS =
  'border-emerald-950/15 hover:border-emerald-800/40 focus-visible:border-[#16845f] focus-visible:ring-[#8dc63f]/25';
const INPUT_ERROR_CLASS =
  'border-red-500 bg-red-50/40 focus-visible:border-red-600 focus-visible:ring-red-200/70';
const LABEL_CLASS = 'text-sm font-semibold text-[#183c2f]';
const ERROR_CLASS = 'mt-2 flex items-center gap-2 text-xs font-medium text-red-700';

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
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b3b2e] px-4 py-20 font-sans sm:px-6 lg:px-8">
      <img
        src={parqueImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-30 h-full w-full object-cover object-center"
      />
      <div
        className="absolute inset-0 -z-20 bg-gradient-to-br from-[#06251d]/92 via-[#0a4938]/78 to-[#132f25]/92"
        aria-hidden="true"
      />
      <div
        className="absolute -right-28 top-1/4 -z-10 h-80 w-80 rounded-full bg-[#8dc63f]/20 blur-3xl"
        aria-hidden="true"
      />

      <form
        className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/70 bg-[#fffef9]/95 p-6 pt-9 shadow-[0_28px_80px_rgba(3,30,22,0.4)] backdrop-blur-xl motion-safe:transition-[transform,box-shadow] motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none sm:p-9 sm:pt-11"
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
            <svg
              className="h-3.5 w-3.5"
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

          <h1 className="text-3xl font-bold tracking-tight text-[#123a2c] sm:text-[2rem]">
            Crea tu cuenta
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Regístrate para reservar tu ingreso al parque
          </p>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="nombreUsuario">
            Nombre de usuario
          </label>

          <input
            id="nombreUsuario"
            type="text"
            className={
              errores.nombreUsuario
                ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
            }
            value={nombreUsuario}
            aria-invalid={Boolean(errores.nombreUsuario)}
            aria-describedby={
              errores.nombreUsuario ? 'nombreUsuario-error' : undefined
            }
            onChange={(e) => {
              setNombreUsuario(e.target.value);
              limpiarError('nombreUsuario');
            }}
            placeholder="Ej. Usuario123"
          />

          {errores.nombreUsuario && (
            <span id="nombreUsuario-error" className={ERROR_CLASS} role="alert">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
              {errores.nombreUsuario}
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="nombre">
              Nombre
            </label>

            <input
              id="nombre"
              type="text"
              className={
                errores.nombre
                  ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                  : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
              }
              value={nombre}
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={errores.nombre ? 'nombre-error' : undefined}
              onChange={(e) => {
                setNombre(e.target.value);
                limpiarError('nombre');
              }}
              placeholder="Nombre"
            />

            {errores.nombre && (
              <span id="nombre-error" className={ERROR_CLASS} role="alert">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
                {errores.nombre}
              </span>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="apellidos">
              Apellidos
            </label>

            <input
              id="apellidos"
              type="text"
              className={
                errores.apellidos
                  ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                  : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
              }
              value={apellidos}
              aria-invalid={Boolean(errores.apellidos)}
              aria-describedby={errores.apellidos ? 'apellidos-error' : undefined}
              onChange={(e) => {
                setApellidos(e.target.value);
                limpiarError('apellidos');
              }}
              placeholder="Apellidos"
            />

            {errores.apellidos && (
              <span id="apellidos-error" className={ERROR_CLASS} role="alert">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
                {errores.apellidos}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="correo">
              Correo electrónico
            </label>

            <input
              id="correo"
              type="email"
              className={
                errores.correo
                  ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                  : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
              }
              value={correo}
              aria-invalid={Boolean(errores.correo)}
              aria-describedby={errores.correo ? 'correo-error' : undefined}
              onChange={(e) => {
                setCorreo(e.target.value);
                limpiarError('correo');
              }}
              placeholder="ejemplo@gmail.com"
            />

            {errores.correo && (
              <span id="correo-error" className={ERROR_CLASS} role="alert">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
                {errores.correo}
              </span>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="telefono">
              Teléfono
            </label>

            <input
              id="telefono"
              type="tel"
              className={
                errores.telefono
                  ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                  : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
              }
              value={telefono}
              aria-invalid={Boolean(errores.telefono)}
              aria-describedby={errores.telefono ? 'telefono-error' : undefined}
              onChange={(e) => {
                setTelefono(e.target.value);
                limpiarError('telefono');
              }}
              placeholder="8888 7777"
            />

            {errores.telefono && (
              <span id="telefono-error" className={ERROR_CLASS} role="alert">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
                {errores.telefono}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS} htmlFor="password">
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              className={
                errores.password
                  ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                  : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
              }
              value={password}
              aria-invalid={Boolean(errores.password)}
              aria-describedby={errores.password ? 'registro-password-error' : undefined}
              onChange={(e) => {
                setPassword(e.target.value);
                limpiarError('password');
              }}
              placeholder="Mínimo 8 caracteres"
            />

            {errores.password && (
              <span id="registro-password-error" className={ERROR_CLASS} role="alert">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
                {errores.password}
              </span>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="confirmPassword">
              Confirmación de contraseña
            </label>

            <input
              id="confirmPassword"
              type="password"
              className={
                errores.confirmPassword
                  ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}`
                  : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
              }
              value={confirmPassword}
              aria-invalid={Boolean(errores.confirmPassword)}
              aria-describedby={
                errores.confirmPassword ? 'confirmPassword-error' : undefined
              }
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                limpiarError('confirmPassword');
              }}
              placeholder="Repite tu contraseña"
            />

            {errores.confirmPassword && (
              <span id="confirmPassword-error" className={ERROR_CLASS} role="alert">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
                {errores.confirmPassword}
              </span>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-emerald-950/15 bg-white px-5 py-3 text-sm font-bold text-[#184332] outline-none motion-safe:hover:-translate-y-0.5 hover:border-[#0b6246]/40 hover:bg-emerald-50 focus-visible:ring-4 focus-visible:ring-[#8dc63f]/30 focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 motion-safe:transition-[transform,background-color,border-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transform-none motion-reduce:transition-none"
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
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#0b6246] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(11,98,70,0.24)] outline-none motion-safe:hover:-translate-y-0.5 hover:bg-[#084c37] hover:shadow-[0_14px_30px_rgba(11,98,70,0.3)] focus-visible:ring-4 focus-visible:ring-[#8dc63f]/40 focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-emerald-900/45 disabled:shadow-none motion-safe:transition-[transform,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transform-none motion-reduce:transition-none"
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
            className={`mt-5 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium leading-5 ${
              estado === 'exito'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
            role={estado === 'error' ? 'alert' : 'status'}
            aria-live={estado === 'error' ? 'assertive' : 'polite'}
          >
            <span
              className="mt-0.5 inline-flex shrink-0"
              aria-hidden="true"
            >
              {estado === 'exito' ? (
                <svg
                  className="h-4 w-4"
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
                  className="h-4 w-4"
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
          <p className="mt-3 text-center text-xs font-medium text-slate-500">
            Te llevaremos a iniciar sesión en{' '}
            {segundosRestantes}...
          </p>
        )}

        <p className="mt-7 border-t border-emerald-950/10 pt-5 text-center text-sm text-slate-600">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            className="rounded-md font-bold text-[#0b6246] underline-offset-4 outline-none hover:text-[#073f31] hover:underline focus-visible:ring-2 focus-visible:ring-[#16845f] focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none"
            onClick={onIrLogin}
          >
            Inicia sesión
          </button>
        </p>
      </form>
    </div>
  );
}
