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

  useEffect(() => {
    if (!activo) {
      if (temporizador.current) {
        clearTimeout(temporizador.current);
        temporizador.current = null;
      }

      return;
    }

    const cerrarPorInactividad = async () => {
      try {
        await api.logout();
      } finally {
        onLogout();
      }
    };

    const reiniciarTemporizador = () => {
      if (temporizador.current) {
        clearTimeout(temporizador.current);
      }

      temporizador.current = setTimeout(() => {
        void cerrarPorInactividad();
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
      if (temporizador.current) {
        clearTimeout(temporizador.current);
      }

      eventos.forEach((evento) => {
        window.removeEventListener(evento, reiniciarTemporizador);
      });
    };
  }, [activo, tiempoInactividad, onLogout]);
};