import { Request, Response } from 'express';
import { loginUser } from './login.service';
import { logoutUser } from './logout.service';
import { extraerIPDelRequest } from '../auditoria.service';

// Implementado por: Dallane
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