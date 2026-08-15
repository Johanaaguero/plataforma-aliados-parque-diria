import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ErrorApi,
  ErrorConexion,
  solicitarRecuperacionContrasena,
} from '../services/recuperacionContrasena.service';
import './recuperacion.css';

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
    <main className="registro-container recuperacion-container">
      <form
        className="registro-form recuperacion-form"
        noValidate
        onSubmit={handleSubmit}
        aria-busy={estado === 'cargando'}
        aria-labelledby="recuperar-titulo"
      >
        <div className="registro-franja" aria-hidden="true" />

        <header className="registro-header">
          <span className="registro-eyebrow">Aliados del Parque</span>
          <h1 id="recuperar-titulo">Recuperar contraseña</h1>
          <p>
            Escribe el correo asociado a tu cuenta y te enviaremos un enlace
            para crear una nueva contraseña.
          </p>
        </header>

        <div className="registro-campo">
          <label htmlFor="correo-recuperacion">Correo electrónico</label>
          <input
            id="correo-recuperacion"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={correo}
            className={errorCorreo ? 'campo-invalido' : ''}
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
            className="recuperacion-ayuda"
          >
            Recibirás las instrucciones en este correo si la cuenta está
            registrada.
          </span>
          {errorCorreo && (
            <span
              id="correo-recuperacion-error"
              className="campo-error"
              role="alert"
            >
              {errorCorreo}
            </span>
          )}
        </div>

        <div className="registro-acciones">
          <button
            type="submit"
            className="registro-boton-primario"
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
                ? 'registro-mensaje registro-mensaje--exito recuperacion-mensaje'
                : 'registro-mensaje registro-mensaje--error recuperacion-mensaje'
            }
            role={estado === 'error' ? 'alert' : 'status'}
            aria-live={estado === 'error' ? 'assertive' : 'polite'}
          >
            {mensaje}
          </p>
        )}

        <p className="recuperacion-volver">
          <a href="/login" className="recuperacion-enlace">
            ← Volver a Iniciar sesión
          </a>
        </p>
      </form>
    </main>
  );
}
