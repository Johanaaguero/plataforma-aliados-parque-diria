import { Request } from 'express';
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../../../data-source';
import { AuditLog } from '../../../models/AuditLog';


interface AuditLogInput {
  usuarioId?: number | null;
  action: string;
  description?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  status: 'success' | 'failure' | 'blocked';
  details?: string;
}

export const registrarAuditoria = async (
  input: AuditLogInput,
  manager?: EntityManager,
): Promise<void> => {
  try {
    const repo = manager
      ? manager.getRepository(AuditLog)
      : AppDataSource.getRepository(AuditLog);

    const auditLog = repo.create({
      usuarioId: input.usuarioId || null,
      action: input.action,
      description: input.description || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      status: input.status,
      details: input.details || null,
    });

    await repo.save(auditLog);
  } catch (error) {
    console.warn('Error al registrar auditoría:', error);

    if (manager) {
      throw error;
    }
  }
};

export const obtenerAuditoriasPorUsuario = async (usuarioId: number) => {
  try {
    const repo = AppDataSource.getRepository(AuditLog);

    return await repo.find({
      where: { usuarioId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  } catch (error) {
    console.error('Error al obtener auditorías:', error);
    return [];
  }
};

export const obtenerAuditoriasPorAccion = async (action: string) => {
  try {
    const repo = AppDataSource.getRepository(AuditLog);

    return await repo.find({
      where: { action },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  } catch (error) {
    console.error('Error al obtener auditorías:', error);
    return [];
  }
};

export const extraerIPDelRequest = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
};
