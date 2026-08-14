import { useState } from 'react';
import type { FormEvent } from 'react';

type Estado = 'idle' | 'cargando' | 'exito' | 'error';

interface CampoErrores {
  identificador?: string;
  password?: string;
}

export default function login() {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [recordarSesion, setRecordarSesion] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [mensaje, setMensaje] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');
  const [errores, setErrores] = useState<CampoErrores>({});

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

    try {
      const respuesta = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identificador, password }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setMensaje(resultado.message ?? 'No se pudo iniciar sesión');
        setEstado('error');
        return;
      }

      if (recordarSesion) {
        localStorage.setItem('token', resultado.token);
      } else {
        sessionStorage.setItem('token', resultado.token);
      }

      setMensaje('Inicio de sesión exitoso');
      setEstado('exito');

      console.log('Rol del usuario:', resultado.usuario.rol.nombre);
      // Cuando exista el router, acá se redirige según el rol

    } catch (error) {
      console.error(error);
      setMensaje('No se pudo conectar con el servidor');
      setEstado('error');
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
            />
            <button
              type="button"
              onClick={() => setMostrarPassword((prev) => !prev)}
              style={{ position: 'absolute', right: 8, top: 8 }}
            >
              {mostrarPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {errores.password && (
            <span className="campo-error">{errores.password}</span>
          )}
        </div>

        <div className="registro-campo">
          <label>
            <input
              type="checkbox"
              checked={recordarSesion}
              onChange={(e) => setRecordarSesion(e.target.checked)}
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
          <p className={`registro-mensaje registro-mensaje--${estado}`}>
            {mensaje}
          </p>
        )}
      </form>
    </div>
  );
}