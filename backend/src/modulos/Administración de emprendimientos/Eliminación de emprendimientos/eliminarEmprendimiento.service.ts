import { AppDataSource } from '../../../data-source';
import { Emprendimiento } from '../../../models/Emprendimiento';
import { registrarAuditoria } from '../../Autenticación y gestión de usuario/Autenticación y seguridad de acceso al sistema/auditoria.service';

interface ErrorServicio {
  statusCode: number;
  message: string;
}

export const eliminarEmprendimiento = async (
  id: number,
  usuarioId: number,
): Promise<void> => {
  if (!Number.isInteger(id) || id <= 0) {
    const error: ErrorServicio = {
      statusCode: 400,
      message: 'El ID del emprendimiento no es válido.',
    };

    throw error;
  }

  await AppDataSource.transaction(async (manager) => {
    const emprendimientoRepository =
      manager.getRepository(Emprendimiento);
    const emprendimiento = await emprendimientoRepository.findOne({
      where: { id },
    });

    if (!emprendimiento) {
      const error: ErrorServicio = {
        statusCode: 404,
        message: 'El emprendimiento no fue encontrado.',
      };

      throw error;
    }

    const estadoAnterior = emprendimiento.estadoPublicacion;

    await emprendimientoRepository.remove(emprendimiento);

    await registrarAuditoria({
      usuarioId,
      action: 'ELIMINAR_EMPRENDIMIENTO',
      description: `Eliminacion del emprendimiento #${id}`,
      status: 'success',
      details: JSON.stringify({
        emprendimientoId: id,
        nombre: emprendimiento.nombre,
        estadoAnterior,
      }),
    }, manager);
  });
};
