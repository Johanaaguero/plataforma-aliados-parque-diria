import { Request, Response } from 'express';
import {
  getBlockedAccounts as getBlockedAccountsService,
  unlockAccount as unlockAccountService,
} from './cuentasBloqueadas.service';
import { extraerIPDelRequest } from '../../Autenticación y seguridad de acceso al sistema/auditoria.service';

export const getBlockedAccounts = async (_req: Request, res: Response) => {
  try {
    const cuentas = await getBlockedAccountsService();

    return res.status(200).json({
      ok: true,
      message: 'Cuentas bloqueadas consultadas correctamente',
      data: cuentas,
    });
  } catch (error) {
    console.error('Error al consultar cuentas bloqueadas:', error);

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    });
  }
};

export const unlockAccount = async (req: Request, res: Response) => {
  try {
    const usuarioId = Number(req.params.id);

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'El ID del usuario no es válido',
      });
    }

    const resultado = await unlockAccountService({
      usuarioId,
      actorId: req.usuario!.id,
      ipAddress: extraerIPDelRequest(req),
      userAgent: req.headers['user-agent'] || null,
    });

    if (!resultado.ok) {
      return res.status(resultado.status).json({
        ok: false,
        message: resultado.message,
      });
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al desbloquear la cuenta:', error);

    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor',
    });
  }
};
