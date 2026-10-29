import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  actualizarMiPerfil,
  cambiarContrasena,
  eliminarFotoPerfil,
  guardarFotoPerfil,
  obtenerFotoPerfil,
  obtenerMiPerfil,
  solicitarCambioCorreo,
  type PerfilUsuario,
} from '../services/perfilService';

interface GestionPerfilProps {
  onSesionRevocada: () => void;
}

const tarjeta =
  'rounded-3xl border border-white/65 bg-white/70 p-5 shadow-[0_20px_55px_rgba(16,75,52,0.12),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl dark:border-white/10 dark:bg-[#17372c]/75 dark:shadow-[0_22px_55px_rgba(0,0,0,0.24)] sm:p-7';
const campo =
  'min-h-12 w-full rounded-2xl border border-emerald-900/15 bg-white/75 px-4 py-3 text-base text-emerald-950 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 dark:border-white/15 dark:bg-[#10271f]/75 dark:text-white dark:placeholder:text-white/40';
const boton =
  'inline-flex min-h-12 items-center justify-center rounded-full bg-[#08734f] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(8,115,79,0.23)] transition hover:-translate-y-0.5 hover:bg-[#096347] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transform-none';

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export default function GestionPerfil({ onSesionRevocada }: GestionPerfilProps) {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [guardandoCorreo, setGuardandoCorreo] = useState(false);
  const [guardandoContrasena, setGuardandoContrasena] = useState(false);
  const [guardandoFoto, setGuardandoFoto] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correoNuevo, setCorreoNuevo] = useState('');
  const [contrasenaCorreo, setContrasenaCorreo] = useState('');
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [fotoTemporal, setFotoTemporal] = useState<string | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const temporizadorSesionRef = useRef<number | null>(null);

  const cargarPerfil = async () => {
    setError('');
    setCargando(true);
    try {
      const datos = await obtenerMiPerfil();
      setPerfil(datos);
      setNombre(datos.nombre);
      setApellidos(datos.apellidos);
      setTelefono(datos.telefono);

      if (datos.tieneFotoPerfil) {
        const blob = await obtenerFotoPerfil();
        const nuevaUrl = URL.createObjectURL(blob);
        setFotoUrl(nuevaUrl);
      } else {
        setFotoUrl(null);
      }
    } catch (cargaError) {
      setError(mensajeDeError(cargaError));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarPerfil();
    // Load only when this screen mounts; later refreshes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (fotoUrl) URL.revokeObjectURL(fotoUrl);
    },
    [fotoUrl],
  );

  useEffect(
    () => () => {
      if (fotoTemporal) URL.revokeObjectURL(fotoTemporal);
    },
    [fotoTemporal],
  );

  const guardarDatos = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');
    setMensaje('');
    setGuardandoPerfil(true);
    try {
      const datos = await actualizarMiPerfil({ nombre, apellidos, telefono });
      setPerfil(datos);
      setMensaje('Tus datos personales se guardaron correctamente.');
    } catch (guardarError) {
      setError(mensajeDeError(guardarError));
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const pedirCambioCorreo = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');
    setMensaje('');
    setGuardandoCorreo(true);
    try {
      const confirmacionEnvio = await solicitarCambioCorreo(
        correoNuevo.trim(),
        contrasenaCorreo,
      );
      setPerfil((actual) =>
        actual ? { ...actual, correoPendiente: correoNuevo.trim().toLowerCase() } : actual,
      );
      setContrasenaCorreo('');
      setMensaje(confirmacionEnvio);
    } catch (solicitudError) {
      setError(mensajeDeError(solicitudError));
    } finally {
      setGuardandoCorreo(false);
    }
  };

  const actualizarContrasena = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');
    setMensaje('');
    setGuardandoContrasena(true);
    try {
      const respuesta = await cambiarContrasena(
        contrasenaActual,
        contrasenaNueva,
        confirmacion,
      );
      setContrasenaActual('');
      setContrasenaNueva('');
      setConfirmacion('');
      setMensaje(respuesta);
      temporizadorSesionRef.current = window.setTimeout(
        onSesionRevocada,
        1800,
      );
    } catch (cambioError) {
      setError(mensajeDeError(cambioError));
      setGuardandoContrasena(false);
    }
  };

  const seleccionarFoto = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError('');
    setMensaje('');

    if (archivo.size > 4 * 1024 * 1024) {
      setError('La imagen debe pesar 4 MB o menos.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      setError('Selecciona una imagen JPEG, PNG o WebP.');
      return;
    }

    const urlTemporal = URL.createObjectURL(archivo);
    setFotoTemporal(urlTemporal);
    setGuardandoFoto(true);
    try {
      await guardarFotoPerfil(archivo);
      setMensaje('Foto de perfil actualizada.');
      window.dispatchEvent(new Event('perfil-foto-actualizada'));
      await cargarPerfil();
    } catch (fotoError) {
      setError(mensajeDeError(fotoError));
    } finally {
      setGuardandoFoto(false);
      setFotoTemporal(null);
      if (archivoRef.current) archivoRef.current.value = '';
    }
  };

  const quitarFoto = async () => {
    setError('');
    setMensaje('');
    setGuardandoFoto(true);
    try {
      await eliminarFotoPerfil();
      setPerfil((actual) =>
        actual ? { ...actual, tieneFotoPerfil: false } : actual,
      );
      setFotoUrl(null);
      window.dispatchEvent(new Event('perfil-foto-actualizada'));
      setMensaje('Se restauró la imagen predeterminada.');
    } catch (fotoError) {
      setError(mensajeDeError(fotoError));
    } finally {
      setGuardandoFoto(false);
    }
  };

  if (cargando && !perfil) {
    return (
      <section className="mx-auto min-h-[65vh] max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-center text-emerald-900 dark:text-emerald-100" role="status">
          Cargando tu perfil…
        </p>
      </section>
    );
  }

  if (!perfil) {
    return (
      <section className="mx-auto min-h-[65vh] max-w-5xl px-4 py-12 sm:px-6">
        <div className={tarjeta} role="alert">
          <p className="text-red-700 dark:text-red-200">{error || 'No se pudo cargar el perfil.'}</p>
          <button type="button" className={`${boton} mt-5`} onClick={() => void cargarPerfil()}>
            Volver a intentar
          </button>
        </div>
      </section>
    );
  }

  const fotoMostrada = fotoTemporal ?? fotoUrl;

  return (
    <section className="min-h-[70vh] bg-[radial-gradient(ellipse_at_15%_0%,rgba(88,214,165,0.12),transparent_38%),linear-gradient(180deg,#f3faf5,#e7f2eb)] px-4 pb-10 pt-28 dark:bg-[radial-gradient(ellipse_at_15%_0%,rgba(88,214,165,0.08),transparent_38%),linear-gradient(180deg,#101d1a,#172923)] sm:px-6 sm:pb-14 sm:pt-32">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Cuenta personal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950 dark:text-white sm:text-4xl">
            Mi perfil
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-950/70 dark:text-emerald-100/70">
            Administra tus datos y credenciales. Los permisos y el rol de tu cuenta no se pueden cambiar desde aquí.
          </p>
        </header>

        {(error || mensaje) && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? 'border-red-300 bg-red-50/90 text-red-800 dark:border-red-300/25 dark:bg-red-950/30 dark:text-red-100'
                : 'border-emerald-700/20 bg-emerald-50/90 text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-950/30 dark:text-emerald-100'
            }`}
            role={error ? 'alert' : 'status'}
            aria-live="polite"
          >
            {error || mensaje}
          </div>
        )}

        <div className="grid gap-5">
          <section className={tarjeta} aria-labelledby="perfil-foto-titulo">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-900/10 bg-emerald-100/70 text-3xl font-bold text-emerald-800 shadow-inner dark:border-white/10 dark:bg-emerald-900/40 dark:text-emerald-100">
                {fotoMostrada ? (
                  <img src={fotoMostrada} alt="Vista previa de foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  (perfil.nombre[0] ?? perfil.nombreUsuario[0] ?? 'U').toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="perfil-foto-titulo" className="text-lg font-bold text-emerald-950 dark:text-white">
                  Foto de perfil
                </h2>
                <p className="mt-1 text-sm text-emerald-950/65 dark:text-emerald-100/65">
                  JPEG, PNG o WebP; hasta 4 MB. Se optimiza de forma privada antes de guardarla.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <input
                    ref={archivoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(evento) => void seleccionarFoto(evento.target.files?.[0])}
                    aria-label="Seleccionar foto de perfil"
                  />
                  <button type="button" className={boton} disabled={guardandoFoto} onClick={() => archivoRef.current?.click()}>
                    {guardandoFoto ? 'Guardando…' : 'Cambiar foto'}
                  </button>
                  {perfil.tieneFotoPerfil && (
                    <button
                      type="button"
                      className="min-h-12 rounded-full border border-emerald-900/20 px-5 py-3 text-sm font-bold text-emerald-900 transition hover:bg-white/60 disabled:opacity-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                      disabled={guardandoFoto}
                      onClick={() => void quitarFoto()}
                    >
                      Eliminar foto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className={tarjeta} aria-labelledby="perfil-datos-titulo">
            <div className="mb-5">
              <h2 id="perfil-datos-titulo" className="text-lg font-bold text-emerald-950 dark:text-white">
                Datos personales
              </h2>
              <p className="mt-1 text-sm text-emerald-950/65 dark:text-emerald-100/65">
                Nombre de usuario: <span className="font-semibold">{perfil.nombreUsuario}</span>
              </p>
            </div>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(evento) => void guardarDatos(evento)}>
              <label className="grid gap-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                Nombre
                <input className={campo} maxLength={100} required value={nombre} onChange={(evento) => setNombre(evento.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                Apellidos
                <input className={campo} maxLength={100} required value={apellidos} onChange={(evento) => setApellidos(evento.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100 sm:col-span-2">
                Teléfono
                <input className={campo} type="tel" autoComplete="tel" maxLength={20} required value={telefono} onChange={(evento) => setTelefono(evento.target.value)} />
                <span className="text-xs font-normal">
                  {perfil.telefonoVerificado ? 'Verificado' : 'No verificado; la plataforma no tiene verificación por SMS.'}
                </span>
              </label>
              <div className="sm:col-span-2">
                <button className={boton} type="submit" disabled={guardandoPerfil}>
                  {guardandoPerfil ? 'Guardando…' : 'Guardar datos'}
                </button>
              </div>
            </form>
          </section>

          <section className={tarjeta} aria-labelledby="perfil-correo-titulo">
            <h2 id="perfil-correo-titulo" className="text-lg font-bold text-emerald-950 dark:text-white">
              Correo electrónico
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="break-all font-semibold text-emerald-950 dark:text-emerald-100">{perfil.correo}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${perfil.correoVerificado ? 'bg-emerald-700/10 text-emerald-800 dark:text-emerald-200' : 'bg-amber-500/15 text-amber-800 dark:text-amber-200'}`}>
                {perfil.correoVerificado ? 'Verificado' : 'No verificado'}
              </span>
            </div>
            {perfil.correoPendiente && (
              <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                Pendiente de confirmar: {perfil.correoPendiente}
              </p>
            )}
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(evento) => void pedirCambioCorreo(evento)}>
              <label className="grid gap-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                Nuevo correo
                <input className={campo} type="email" autoComplete="email" maxLength={150} required value={correoNuevo} onChange={(evento) => setCorreoNuevo(evento.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                Confirma tu contraseña actual
                <input className={campo} type="password" autoComplete="current-password" required value={contrasenaCorreo} onChange={(evento) => setContrasenaCorreo(evento.target.value)} />
              </label>
              <div className="sm:col-span-2">
                <button className={boton} type="submit" disabled={guardandoCorreo}>
                  {guardandoCorreo ? 'Enviando…' : 'Solicitar cambio de correo'}
                </button>
              </div>
            </form>
          </section>

          <section className={tarjeta} aria-labelledby="perfil-password-titulo">
            <h2 id="perfil-password-titulo" className="text-lg font-bold text-emerald-950 dark:text-white">
              Cambiar contraseña
            </h2>
            <p className="mt-1 text-sm text-emerald-950/65 dark:text-emerald-100/65">
              Debe tener al menos 8 caracteres, mayúscula, minúscula, número y símbolo. Al cambiarla, se cerrará esta sesión.
            </p>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(evento) => void actualizarContrasena(evento)}>
              <label className="grid gap-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100 sm:col-span-2">
                Contraseña actual
                <input className={campo} type="password" autoComplete="current-password" required value={contrasenaActual} onChange={(evento) => setContrasenaActual(evento.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                Nueva contraseña
                <input className={campo} type="password" autoComplete="new-password" minLength={8} required value={contrasenaNueva} onChange={(evento) => setContrasenaNueva(evento.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                Confirmar nueva contraseña
                <input className={campo} type="password" autoComplete="new-password" minLength={8} required value={confirmacion} onChange={(evento) => setConfirmacion(evento.target.value)} />
              </label>
              <div className="sm:col-span-2">
                <button className={boton} type="submit" disabled={guardandoContrasena}>
                  {guardandoContrasena ? 'Actualizando…' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </section>
  );
}
