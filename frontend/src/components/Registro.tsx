import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import es from 'react-phone-number-input/locale/es.json';
import CountrySelectPersonalizado from './CountrySelectPersonalizado';
import parqueImage from '../assets/parque-hero.jpg';
import logo from '../assets/logo.png';

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
  'mt-2 block w-full rounded-2xl border bg-white/90 px-4 py-3 text-[0.9375rem] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-4 motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-200 motion-reduce:transition-none';
const INPUT_DEFAULT_CLASS =
  'border-[#095540]/20 hover:border-[#095540]/45 focus-visible:border-[#009444] focus-visible:ring-[#009444]/25';
const INPUT_ERROR_CLASS =
  'border-[#D9D823] bg-[#D9D823]/10 focus-visible:border-[#D9D823] focus-visible:ring-[#D9D823]/30';
const LABEL_CLASS = 'text-sm font-semibold text-[#095540]';
const ERROR_CLASS = 'mt-2 flex items-center gap-2 text-xs font-semibold text-[#095540]';

// Clases Tailwind para "apagar" el estilo propio del input interno de
// react-phone-number-input y dejar que solo se vea el contenedor (INPUT_BASE_CLASS).
const PHONE_INPUT_INNER_CLASS =
  'flex items-center gap-2 ' +
  '[&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:border-0 ' +
  '[&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:p-0 [&_.PhoneInputInput]:text-[0.9375rem] ' +
  '[&_.PhoneInputInput]:text-slate-900 [&_.PhoneInputInput]:outline-none ' +
  '[&_.PhoneInputInput]:placeholder:text-slate-400 ' +
  '[&_.PhoneInputCountry]:mr-1 [&_.PhoneInputCountry]:shrink-0';

function obtenerUrlBaseApi(): string | null {
  const urlConfigurada = import.meta.env.VITE_API_URL?.trim();

  return urlConfigurada ? urlConfigurada.replace(/\/+$/, '') : null;
}

export default function Registro({ onIrLogin }: RegistroProps) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState<string | undefined>(undefined); // formato E.164, ej. +50688887777
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

    if (!telefono) {
      nuevosErrores.telefono = 'Completa este campo';
    } else if (!isValidPhoneNumber(telefono)) {
      nuevosErrores.telefono = 'El número de teléfono no es válido';
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
    setTelefono(undefined);
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
      setSegundosRestantes((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(temporizador);
  }, [segundosRestantes, onIrLogin]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nuevosErrores = validarCampos();
    setErrores(nuevosErrores);

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
      const respuesta = await fetch(`${urlBaseApi}/api/auth/register`, {
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
          telefono, // ya viene en formato +506....
          password,
        }),
      });

      let resultado: RespuestaRegistro;

      try {
        resultado = (await respuesta.json()) as RespuestaRegistro;
      } catch {
        setMensaje('El servidor devolvió una respuesta inesperada');
        setEstado('error');
        return;
      }

      if (!respuesta.ok || resultado.ok !== true) {
        setMensaje(resultado.message ?? 'No se pudo completar el registro');
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
      setTelefono(undefined);
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      setMensaje('No se pudo conectar con el servidor');
      setEstado('error');
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
        className="absolute inset-0 -z-20 bg-gradient-to-r from-[#095540]/90 via-[#095540]/62 to-black/58"
        aria-hidden="true"
      />
      <div
        className="absolute -left-28 top-1/4 -z-10 h-80 w-80 rounded-full bg-[#8DC63F]/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -right-20 bottom-16 -z-10 h-72 w-72 rounded-full bg-[#00AEEF]/14 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid w-full max-w-7xl items-start gap-10 lg:grid-cols-[minmax(17rem,0.7fr)_minmax(0,1.3fr)] lg:gap-14">
        <aside className="hidden max-w-lg lg:sticky lg:top-28 lg:flex lg:flex-col lg:items-start lg:pt-8" aria-label="Aliados del Parque">
          <div className="rounded-[2rem] border border-white/55 bg-white/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <img src={logo} alt="Logo de Aliados del Parque Nacional Diriá" className="h-auto w-52" />
          </div>
          <p className="mt-8 font-brand text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-lg xl:text-5xl">
            Naturaleza que inspira, comunidades que conectan.
          </p>
        </aside>

        <form
          className="relative w-full max-w-3xl justify-self-center overflow-hidden rounded-[2rem] border border-white/65 bg-white/86 p-6 pt-9 shadow-[0_30px_90px_rgba(0,0,0,0.3)] backdrop-blur-2xl motion-safe:transition-[transform,box-shadow] motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none sm:p-9 sm:pt-11 lg:justify-self-end"
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
              <img src={logo} alt="Logo de Aliados del Parque Nacional Diriá" className="h-auto w-32" />
            </div>
          </div>

          <div className="mb-7 text-left">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8DC63F]/50 bg-[#8DC63F]/18 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#095540]">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C7 2 3 6 3 11c0 5.5 6 10 9 11 3-1 9-5.5 9-11 0-5-4-9-9-9z" fill="currentColor" />
              </svg>
              Programa de visitantes
            </span>

            <h1 className="font-brand text-3xl font-bold tracking-tight text-[#095540] sm:text-[2rem]">Crea tu cuenta</h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">Regístrate para reservar tu ingreso al parque</p>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="nombreUsuario">
              Nombre de usuario
            </label>

            <input
              id="nombreUsuario"
              type="text"
              className={
                errores.nombreUsuario ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
              }
              value={nombreUsuario}
              aria-invalid={Boolean(errores.nombreUsuario)}
              aria-describedby={errores.nombreUsuario ? 'nombreUsuario-error' : undefined}
              onChange={(e) => {
                setNombreUsuario(e.target.value);
                limpiarError('nombreUsuario');
              }}
              placeholder="Ej. Usuario123"
            />

            {errores.nombreUsuario && (
              <span id="nombreUsuario-error" className={ERROR_CLASS} role="alert">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
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
                className={errores.nombre ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`}
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
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
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
                  errores.apellidos ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
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
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
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
                className={errores.correo ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`}
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
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
                  {errores.correo}
                </span>
              )}
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="telefono">
                Teléfono
              </label>

              <PhoneInput
                id="telefono"
                international
                defaultCountry="CR"
                labels={es}
                countrySelectComponent={CountrySelectPersonalizado}
                value={telefono}
                onChange={(valor) => {
                  setTelefono(valor);
                  limpiarError('telefono');
                }}
                aria-invalid={Boolean(errores.telefono)}
                aria-describedby={errores.telefono ? 'telefono-error' : undefined}
                placeholder="8888 7777"
                className={
                  errores.telefono
                    ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS} ${PHONE_INPUT_INNER_CLASS}`
                    : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS} ${PHONE_INPUT_INNER_CLASS}`
                }
              />

              {errores.telefono && (
                <span id="telefono-error" className={ERROR_CLASS} role="alert">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
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
                  errores.password ? `${INPUT_BASE_CLASS} ${INPUT_ERROR_CLASS}` : `${INPUT_BASE_CLASS} ${INPUT_DEFAULT_CLASS}`
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
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
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
                aria-describedby={errores.confirmPassword ? 'confirmPassword-error' : undefined}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  limpiarError('confirmPassword');
                }}
                placeholder="Repite tu contraseña"
              />

              {errores.confirmPassword && (
                <span id="confirmPassword-error" className={ERROR_CLASS} role="alert">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9D823]" aria-hidden="true" />
                  {errores.confirmPassword}
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-[#095540]/20 bg-white/90 px-5 py-3 text-sm font-bold text-[#095540] outline-none hover:border-[#009444]/45 hover:bg-[#8DC63F]/12 focus-visible:ring-4 focus-visible:ring-[#009444]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 motion-safe:transition-[transform,background-color,border-color] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
              onClick={handleCancelar}
              disabled={estado === 'cargando' || segundosRestantes !== null}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#8DC63F] px-5 py-3 text-sm font-bold text-[#095540] shadow-[0_10px_24px_rgba(141,198,63,0.24)] outline-none hover:bg-[#009444] hover:text-white hover:shadow-[0_14px_30px_rgba(0,148,68,0.3)] focus-visible:ring-4 focus-visible:ring-[#8DC63F]/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#8DC63F]/45 disabled:text-[#095540]/60 disabled:shadow-none motion-safe:transition-[transform,background-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
              disabled={estado === 'cargando' || segundosRestantes !== null}
            >
              {estado === 'cargando' ? 'Registrando...' : 'Registrarse'}
            </button>
          </div>

          {mensaje && (
            <p
              className={`mt-5 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium leading-5 ${
                estado === 'exito' ? 'border-[#009444]/30 bg-[#009444]/10 text-[#095540]' : 'border-[#D9D823]/70 bg-[#D9D823]/15 text-black'
              }`}
              role={estado === 'error' ? 'alert' : 'status'}
              aria-live={estado === 'error' ? 'assertive' : 'polite'}
            >
              <span className="mt-0.5 inline-flex shrink-0" aria-hidden="true">
                {estado === 'exito' ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3l9 16H3l9-16z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M12 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="17" r="1" fill="currentColor" />
                  </svg>
                )}
              </span>

              {mensaje}
            </p>
          )}

          {segundosRestantes !== null && (
            <p className="mt-3 text-center text-xs font-medium text-slate-500">
              Te llevaremos a iniciar sesión en {segundosRestantes}...
            </p>
          )}

          <p className="mt-7 border-t border-[#095540]/12 pt-5 text-center text-sm text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <button
              type="button"
              className="rounded-md font-bold text-[#095540] underline-offset-4 outline-none hover:text-[#009444] hover:underline focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none"
              onClick={onIrLogin}
            >
              Inicia sesión
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}