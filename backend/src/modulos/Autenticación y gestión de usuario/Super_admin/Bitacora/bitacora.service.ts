import { AppDataSource } from '../../../../data-source';
import { AuditLog } from '../../../../models/AuditLog';

export const obtenerBitacora = async () => {
  const auditRepository = AppDataSource.getRepository(AuditLog);

  const registros = await auditRepository.find({
    relations: {
      usuario: true,
    },
    order: {
      createdAt: 'DESC',
    },
    take: 100,
  });

  return registros.map((registro) => ({
    id: registro.id,
    usuarioId: registro.usuarioId,
    action: registro.action,
    description: registro.description,
    status: registro.status,
    details: registro.details,
    createdAt: registro.createdAt,
    usuario: registro.usuario
      ? {
          id: registro.usuario.id,
          nombreUsuario: registro.usuario.nombreUsuario,
          nombre: registro.usuario.nombre,
          apellidos: registro.usuario.apellidos,
          correo: registro.usuario.correo,
        }
      : null,
  }));
};