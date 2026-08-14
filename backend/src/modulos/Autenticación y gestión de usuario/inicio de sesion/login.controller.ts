import { Request, Response } from 'express';
import { loginUser } from './login.service';

export const login = async (req: Request, res: Response) => {
  try {
    const { identificador, password } = req.body;

    if (!identificador?.trim() || !password?.trim()) {
      return res.status(400).json({ ok: false, message: 'Faltan campos requeridos' });
    }

    const resultado = await loginUser({
      identificador: identificador.trim(),
      password,
    });

    if (!resultado.ok) {
      return res.status(401).json(resultado);
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error en controller login:', error);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};