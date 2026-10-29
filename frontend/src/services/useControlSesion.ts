import { useEffect, useRef } from 'react';
import { api, notificarErrorAuth } from './api';

// Cada cuánto avisa la pestaña al servidor que sigue abierta.
// El servidor da la sesión por cerrada si pasan 150 s sin avisos.
const INTERVALO_LATIDO_MS = 25 * 1000;

const CLAVE_PESTANA_ACTIVA = 'aliados:pestana-activa';

interface Opciones {
  activo: boolean;
  /**
   * Se llama cuando otra pestaña (por ejemplo, una duplicada) tomó la
   * misma sesión. Esta pestaña debe cerrarse SIN llamar a logout en el
   * servidor, porque la sesión sigue viva en la pestaña nueva.
   */
  onPestanaReemplazada: () => void;
}

const obtenerToken = (): string | null =>
  sessionStorage.getItem('token') ?? localStorage.getItem('token');

const obtenerJti = (token: string): string | null => {
  try {
    const carga = token.split('.')[1];

    if (!carga) return null;

    const base64 = carga.replace(/-/g, '+').replace(/_/g, '/');
    const datos = JSON.parse(atob(base64)) as { jti?: unknown };

    return typeof datos.jti === 'string' ? datos.jti : null;
  } catch {
    return null;
  }
};

const generarIdInstancia = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * Mientras haya una sesión iniciada:
 *  1. Envía un latido periódico, para que el servidor sepa que la pestaña
 *     sigue abierta. Si la pestaña se cierra, los latidos paran y la sesión
 *     se libera sola.
 *  2. Al descargarse la página (cerrar o refrescar) avisa al servidor, que
 *     abre una ventana de gracia: un refresh la reanuda con su primer latido.
 *  3. Solo deja una pestaña activa por sesión: si se duplica la pestaña,
 *     la nueva reemplaza a la anterior.
 */
export const useControlSesion = ({
  activo,
  onPestanaReemplazada,
}: Opciones): void => {
  const alReemplazarRef = useRef(onPestanaReemplazada);

  useEffect(() => {
    alReemplazarRef.current = onPestanaReemplazada;
  }, [onPestanaReemplazada]);

  useEffect(() => {
    if (!activo) return;

    // Sesiones guardadas antes con "Recordar sesión" quedaban en
    // localStorage y sobrevivían al cierre de la pestaña. Se pasan a
    // sessionStorage para que desde ahora mueran con la pestaña.
    try {
      const tokenAntiguo = localStorage.getItem('token');

      if (tokenAntiguo) {
        if (!sessionStorage.getItem('token')) {
          sessionStorage.setItem('token', tokenAntiguo);
        }

        localStorage.removeItem('token');
      }
    } catch {
      // Sin acceso a localStorage: no es crítico.
    }

    const tokenInicial = obtenerToken();
    const jti = tokenInicial ? obtenerJti(tokenInicial) : null;
    const idInstancia = generarIdInstancia();
    let terminado = false;

    // --- Una sola pestaña por sesión ---------------------------------
    // Esta pestaña se anuncia como la activa para su sesión (jti). Las
    // demás pestañas con la MISMA sesión lo ven por el evento "storage"
    // y se cierran. Pestañas con otra sesión (otro usuario) lo ignoran.
    if (jti) {
      try {
        localStorage.setItem(
          CLAVE_PESTANA_ACTIVA,
          JSON.stringify({ jti, id: idInstancia }),
        );
      } catch {
        // Modo privado o sin almacenamiento: se omite esta protección.
      }
    }

    const alCambiarAlmacenamiento = (evento: StorageEvent) => {
      if (evento.key !== CLAVE_PESTANA_ACTIVA || !evento.newValue || !jti) {
        return;
      }

      try {
        const otra = JSON.parse(evento.newValue) as {
          jti?: string;
          id?: string;
        };

        if (otra.jti === jti && otra.id !== idInstancia) {
          terminado = true;
          // Esta pestaña ya no debe volver a restaurar la sesión.
          sessionStorage.removeItem('token');
          alReemplazarRef.current();
        }
      } catch {
        // Valor ilegible: se ignora.
      }
    };

    // --- Latido ------------------------------------------------------
    const enviarLatido = async () => {
      const token = obtenerToken();

      if (!token || terminado) return;

      try {
        const respuesta = await fetch(api.url('/auth/session/heartbeat'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (respuesta.status === 401 && !terminado) {
          const datos = (await respuesta.json().catch(() => null)) as {
            code?: string;
            message?: string;
          } | null;

          notificarErrorAuth({
            code: datos?.code ?? 'SESSION_INVALIDATED',
            message:
              datos?.message ??
              'Esta sesión ya no está activa. Inicia sesión nuevamente.',
            status: 401,
          });
        }
      } catch {
        // Sin conexión o servidor caído: se reintenta en el siguiente ciclo.
      }
    };

    // --- Aviso de cierre ---------------------------------------------
    // Se envía como text/plain y sin credenciales para que sea una
    // petición simple (sin preflight) y alcance a salir mientras la
    // página se descarga. El servidor no cierra la sesión al recibirlo:
    // solo abre unos segundos de gracia para que un refresh la reanude.
    const avisarCierre = () => {
      const token = obtenerToken();

      if (!token || terminado) return;

      try {
        void fetch(api.url('/auth/session/closing'), {
          method: 'POST',
          keepalive: true,
          credentials: 'omit',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({ token }),
        }).catch(() => undefined);
      } catch {
        // Si no sale, el servidor igual libera la sesión por falta de latidos.
      }
    };

    const alVolverAVer = () => {
      if (document.visibilityState === 'visible') void enviarLatido();
    };

    // Al volver desde la caché de navegación (botón atrás) se reanuda.
    const alMostrarPagina = (evento: PageTransitionEvent) => {
      if (evento.persisted) void enviarLatido();
    };

    void enviarLatido(); // reanuda de inmediato tras un refresh
    const temporizador = window.setInterval(
      () => void enviarLatido(),
      INTERVALO_LATIDO_MS,
    );

    window.addEventListener('storage', alCambiarAlmacenamiento);
    window.addEventListener('pagehide', avisarCierre);
    window.addEventListener('pageshow', alMostrarPagina);
    document.addEventListener('visibilitychange', alVolverAVer);

    return () => {
      terminado = true;
      window.clearInterval(temporizador);
      window.removeEventListener('storage', alCambiarAlmacenamiento);
      window.removeEventListener('pagehide', avisarCierre);
      window.removeEventListener('pageshow', alMostrarPagina);
      document.removeEventListener('visibilitychange', alVolverAVer);
    };
  }, [activo]);
};
