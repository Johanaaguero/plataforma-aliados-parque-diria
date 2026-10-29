import { useCallback, useRef, useState } from 'react';

import type { Notificacion } from '../services/notificacionesService';

function usuarioActualId(): number | null {
  const token =
    sessionStorage.getItem('token') ?? localStorage.getItem('token');

  if (!token) return null;

  try {
    const segmento = token.split('.')[1];
    if (!segmento) return null;
    const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/');
    const base64ConPadding = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const payload = JSON.parse(
      atob(base64ConPadding),
    ) as Record<string, unknown>;
    const id = Number(
      payload.id ?? payload.usuarioId ?? payload.userId ?? payload.sub,
    );

    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function leerCursor(clave: string): number | null {
  try {
    const valor = Number(localStorage.getItem(clave));
    return Number.isFinite(valor) && valor >= 0 ? valor : null;
  } catch {
    return null;
  }
}

function guardarCursor(clave: string, id: number): void {
  try {
    localStorage.setItem(clave, String(id));
  } catch {
    // El cursor en memoria sigue evitando duplicados durante esta sesión.
  }
}

export default function useNotificacionToast() {
  const [notificacionesToast, setNotificacionesToast] = useState<Notificacion[]>([]);
  const notificacionesRef = useRef<Notificacion[]>([]);
  const cursorRef = useRef<{
    usuarioId: number;
    clave: string;
    ultimoId: number;
    inicializado: boolean;
  } | null>(null);

  const procesarNotificaciones = useCallback((notificaciones: Notificacion[]) => {
    const usuarioId = usuarioActualId();
    if (usuarioId === null) return;

    let cursor = cursorRef.current;
    if (!cursor || cursor.usuarioId !== usuarioId) {
      if (cursor && cursor.usuarioId !== usuarioId) {
        notificacionesRef.current = [];
        setNotificacionesToast([]);
      }

      const clave = `notificaciones-toast-cursor:${usuarioId}`;
      const guardado = leerCursor(clave);
      cursor = {
        usuarioId,
        clave,
        ultimoId: guardado ?? 0,
        inicializado: guardado !== null,
      };
      cursorRef.current = cursor;
    }

    const ordenadas = [...notificaciones].sort((a, b) => a.id - b.id);
    const maximoId = ordenadas.reduce(
      (maximo, notificacion) => Math.max(maximo, notificacion.id),
      0,
    );

    // La primera consulta establece el punto de partida y omite avisos antiguos.
    if (!cursor.inicializado) {
      cursor.ultimoId = maximoId;
      cursor.inicializado = true;
      guardarCursor(cursor.clave, maximoId);
      return;
    }

    const nuevas = ordenadas.filter(
      (notificacion) => notificacion.id > cursor.ultimoId,
    );

    if (maximoId > cursor.ultimoId) {
      cursor.ultimoId = maximoId;
      guardarCursor(cursor.clave, maximoId);
    }

    if (nuevas.length === 0) return;

    const idsExistentes = new Set(notificacionesRef.current.map(({ id }) => id));
    const agregadas = nuevas.filter(({ id }) => !idsExistentes.has(id));
    if (agregadas.length === 0) return;

    notificacionesRef.current = [...notificacionesRef.current, ...agregadas];
    setNotificacionesToast(notificacionesRef.current);
  }, []);

  const cerrarTodas = useCallback(() => {
    notificacionesRef.current = [];
    setNotificacionesToast([]);
  }, []);

  return { notificacionesToast, procesarNotificaciones, cerrarTodas };
}
