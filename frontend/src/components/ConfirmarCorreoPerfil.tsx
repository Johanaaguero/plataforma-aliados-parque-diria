import { useEffect, useState } from 'react';
import { confirmarCambioCorreo } from '../services/perfilService';

export default function ConfirmarCorreoPerfil() {
  const [estado, setEstado] = useState<'cargando' | 'exito' | 'error'>('cargando');
  const [mensaje, setMensaje] = useState('Verificando el enlace…');

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get('token');
    window.history.replaceState({}, '', window.location.pathname);

    if (!token) {
      setEstado('error');
      setMensaje('El enlace de verificación no contiene un código válido.');
      return;
    }

    void confirmarCambioCorreo(token)
      .then((respuesta) => {
        setEstado('exito');
        setMensaje(respuesta);
      })
      .catch((error: unknown) => {
        setEstado('error');
        setMensaje(
          error instanceof Error
            ? error.message
            : 'No se pudo confirmar el correo.',
        );
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f3faf5,#e7f2eb)] px-4 py-10 dark:bg-[linear-gradient(180deg,#101d1a,#172923)]">
      <section
        className="w-full max-w-lg rounded-3xl border border-white/65 bg-white/75 p-7 text-center shadow-[0_20px_55px_rgba(16,75,52,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#17372c]/80 sm:p-10"
        aria-live="polite"
      >
        <h1 className="text-2xl font-bold text-emerald-950 dark:text-white">
          Confirmación de correo
        </h1>
        <p
          className={`mt-4 text-sm leading-6 ${
            estado === 'error'
              ? 'text-red-700 dark:text-red-200'
              : 'text-emerald-900 dark:text-emerald-100'
          }`}
          role={estado === 'error' ? 'alert' : 'status'}
        >
          {mensaje}
        </p>
        {estado !== 'cargando' && (
          <a
            href="/"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#08734f] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#096347] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            Volver a Aliados Diriá
          </a>
        )}
      </section>
    </main>
  );
}
