import { Request, Response } from 'express';
import { loginUser } from './login.service';
import { logoutUser } from './logout.service';
import { marcarCierrePendiente, registrarLatido } from './sesion-latido.service';
import { extraerIPDelRequest } from '../Autenticación y seguridad de acceso al sistema/auditoria.service';

export const login = async (req: Request, res: Response) => {
  try {
    const { identificador, password } = req.body;

    if (!identificador?.trim() || !password?.trim()) {
      return res.status(400).json({ ok: false, code: 'MISSING_FIELDS', message: 'Faltan campos requeridos' });
    }

    const ipAddress = extraerIPDelRequest(req);
    const userAgent = (req.headers['user-agent'] as string | undefined) || undefined;

    const resultado = await loginUser({
      identificador: identificador.trim(),
      password,
      ipAddress,
      userAgent,
    });

    if (!resultado.ok) {
      return res.status(401).json(resultado);
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error en controller login:', error);
    return res.status(500).json({ ok: false, code: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, code: 'TOKEN_NOT_PROVIDED', message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ ok: false, code: 'TOKEN_NOT_PROVIDED', message: 'Token no proporcionado' });
    }

    const resultado = await logoutUser(token, 'logout');

    if (!resultado.ok) {
      return res.status(400).json(resultado);
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error en controller logout:', error);
    return res.status(500).json({ ok: false, code: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
  }
};

// El navegador avisa cada ~25 s que la pestaña sigue abierta.
export const latido = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : undefined;

    if (!token) {
      return res.status(401).json({ ok: false, code: 'TOKEN_NOT_PROVIDED', message: 'Se requiere inicio de sesión' });
    }

    const resultado = await registrarLatido(token);

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        ok: false,
        code: resultado.code,
        message: resultado.message,
      });
    }

    return res.status(204).end();
  } catch (error) {
    console.error('Error en controller latido:', error);
    return res.status(500).json({ ok: false, code: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
  }
};

// La página avisa que se está descargando (cerrar pestaña o refrescar).
// Llega como text/plain (petición simple, sin preflight) porque se envía
// mientras la página se cierra; el token viaja en el cuerpo.
export const cierrePendiente = async (req: Request, res: Response) => {
  try {
    let token: unknown;

    if (typeof req.body === 'string') {
      try {
        token = (JSON.parse(req.body) as { token?: unknown }).token;
      } catch {
        token = undefined;
      }
    } else {
      token = req.body?.token;
    }

    if (typeof token !== 'string' || !token) {
      return res.status(400).json({ ok: false, code: 'TOKEN_NOT_PROVIDED', message: 'Token no proporcionado' });
    }

    const resultado = await marcarCierrePendiente(token);

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        ok: false,
        code: resultado.code,
        message: resultado.message,
      });
    }

    return res.status(204).end();
  } catch (error) {
    console.error('Error en controller cierrePendiente:', error);
    return res.status(500).json({ ok: false, code: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
  }
};
