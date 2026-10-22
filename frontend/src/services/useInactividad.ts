import { useEffect, useRef } from 'react';
import { api } from './api';

interface UseInactividadProps {
  activo: boolean;
  tiempoInactividad?: number;
  onLogout: () => void;
}

export const useInactividad = ({
  activo,
  tiempoInactividad = 15 * 60 * 1000,
  onLogout,
}: UseInactividadProps) => {
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLogoutRef = useRef(onLogout);
  const cerrandoSesionRef = useRef(false);

  // Mantiene la última función de cierre sin reiniciar el temporizador.
  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  useEffect(() => {
    if (!activo) {
      if (temporizador.current !== null) {
        clearTimeout(temporizador.current);
        temporizador.current = null;
      }

      cerrandoSesionRef.current = false;
      return;
    }

    const reiniciarTemporizador = () => {
      if (cerrandoSesionRef.current) return;

      if (temporizador.current !== null) {
        clearTimeout(temporizador.current);
      }

      temporizador.current = setTimeout(() => {
        if (cerrandoSesionRef.current) return;

        cerrandoSesionRef.current = true;
        temporizador.current = null;

        // Ejecuta el cierre visual sin esperar al servidor.
        onLogoutRef.current();

        // Invalida la sesión en el servidor y limpia el token.
        void api.logout();
      }, tiempoInactividad);
    };

    const eventos = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];

    eventos.forEach((evento) => {
      window.addEventListener(evento, reiniciarTemporizador);
    });

    reiniciarTemporizador();

    return () => {
      if (temporizador.current !== null) {
        clearTimeout(temporizador.current);
        temporizador.current = null;
      }

      eventos.forEach((evento) => {
        window.removeEventListener(evento, reiniciarTemporizador);
      });
    };
  }, [activo, tiempoInactividad]);
};