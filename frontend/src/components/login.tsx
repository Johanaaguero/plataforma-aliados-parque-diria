import { useState, type FormEvent } from 'react';
import { api } from '../services/api';

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
    <div className="registro-container">
      <form className="registro-form" noValidate onSubmit={handleSubmit}>
        <div className="registro-franja" aria-hidden="true" />

        <div className="registro-header">
          <span className="registro-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2C7 2 3 6 3 11c0 5.5 6 10 9 11 3-1 9-5.5 9-11 0-5-4-9-9-9z"
                fill="currentColor"
              />
            </svg>
            Programa de visitantes
          </span>

          <h1>Iniciar sesión</h1>
          <p>Ingresa con tu cuenta para continuar</p>
        </div>

        <div className="registro-campo">
          <label htmlFor="identificador">Correo o nombre de usuario</label>
          <input
            id="identificador"
            type="text"
            className={errores.identificador ? 'campo-invalido' : ''}
            value={identificador}
            onChange={(e) => {
              setIdentificador(e.target.value);
              limpiarError('identificador');
            }}
            placeholder="correo@ejemplo.com o usuario123"
            disabled={estado === 'cargando'}
          />
          {errores.identificador && (
            <span className="campo-error">{errores.identificador}</span>
          )}
        </div>

        <div className="registro-campo">
          <label htmlFor="password">Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={mostrarPassword ? 'text' : 'password'}
              className={errores.password ? 'campo-invalido' : ''}
              value={password}
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
              style={{ position: 'absolute', right: 8, top: 8 }}
              disabled={estado === 'cargando'}
            >
              {mostrarPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {errores.password && (
            <span className="campo-error">{errores.password}</span>
          )}
        </div>

        <p style={{ marginTop: 8, textAlign: 'right', fontSize: 13 }}>
          <a
            href="/recuperar-contrasena"
            className="registro-login-texto"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </p>

        <div className="registro-campo">
          <label>
            <input
              type="checkbox"
              checked={recordarSesion}
              onChange={(e) => setRecordarSesion(e.target.checked)}
              disabled={estado === 'cargando'}
            />
            {' '}Recordar sesión
          </label>
        </div>

        <div className="registro-acciones">
          <button
            type="submit"
            className="registro-boton-primario"
            disabled={estado === 'cargando'}
          >
            {estado === 'cargando' ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </div>

        {mensaje && (
          <div>
            <p className={`registro-mensaje registro-mensaje--${estado}`}>
              {mensaje}
            </p>
            {codigoError && (
              <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                Código: {codigoError}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
