
import { AppDataSource } from '../../data-source';
import {
  Comunicado,
  PrioridadComunicado,
} from '../../models/Comunicado';
import {
  Notificacion,
  TipoNotificacion,
} from '../../models/Notificacion';
import { Usuario } from '../../models/Usuario';

const repo = AppDataSource.getRepository(Comunicado);
const notificacionesRepo =
  AppDataSource.getRepository(Notificacion);
const usuariosRepo = AppDataSource.getRepository(Usuario);

const construirMensajeNotificacion = (
  comunicado: Comunicado,
): string => {
  const contenido = comunicado.contenido.trim();

  return `Prioridad: ${comunicado.prioridad}\n${contenido}`;
};

// Construye una respuesta pública sin datos privados del usuario.
const respuestaPublica = (comunicado: Comunicado) => ({
  id: comunicado.id,
  titulo: comunicado.titulo,
  contenido: comunicado.contenido,
  prioridad: comunicado.prioridad,
  fechaPublicacion: comunicado.fechaPublicacion,
  creadoPor: comunicado.creadoPor
    ? {
        nombre: comunicado.creadoPor.nombre,
        apellidos: comunicado.creadoPor.apellidos,
      }
    : undefined,
});

// Listar comunicados públicamente, sin exponer datos privados.
export const listar = async () => {
  const comunicados = await repo.find({
    relations: { creadoPor: true },
    order: { fechaPublicacion: 'DESC' },
  });

  return comunicados.map(respuestaPublica);
};

export const crear = async (datos: {
  titulo: string;
  contenido: string;
  prioridad: PrioridadComunicado;
  creadoPorId: number;
}) => {
  const comunicado = await repo.save(
    repo.create({
      ...datos,
      titulo: datos.titulo.trim(),
      contenido: datos.contenido.trim(),
    }),
  );

  const usuarios = await usuariosRepo.find({
    select: { id: true },
  });

  if (usuarios.length) {
    await notificacionesRepo.save(
      usuarios.map((usuario) =>
        notificacionesRepo.create({
          usuarioId: usuario.id,
          tipo: TipoNotificacion.NUEVO_COMUNICADO,
          titulo: comunicado.titulo,
          mensaje: construirMensajeNotificacion(comunicado),
          leida: false,
          referenciaId: comunicado.id,
          referenciaTipo: 'comunicado',
        }),
      ),
    );
  }

  // Recargar la relación para devolver solo campos públicos.
  const comunicadoCompleto = await repo.findOne({
    where: { id: comunicado.id },
    relations: { creadoPor: true },
  });

  if (!comunicadoCompleto) {
    throw new Error('No se pudo recuperar el comunicado creado');
  }

  return respuestaPublica(comunicadoCompleto);
};

export const editar = async (
  id: number,
  datos: Partial<
    Pick<Comunicado, 'titulo' | 'contenido' | 'prioridad'>
  >,
) => {
  const comunicado = await repo.findOne({
    where: { id },
    relations: { creadoPor: true },
  });

  if (!comunicado) {
    throw new Error('No encontrado');
  }

  if (datos.titulo !== undefined) {
    comunicado.titulo = datos.titulo.trim();
  }

  if (datos.contenido !== undefined) {
    comunicado.contenido = datos.contenido.trim();
  }

  if (datos.prioridad !== undefined) {
    comunicado.prioridad = datos.prioridad;
  }

  const actualizado = await repo.save(comunicado);

  const comunicadoCompleto = await repo.findOne({
    where: { id: actualizado.id },
    relations: { creadoPor: true },
  });

  if (!comunicadoCompleto) {
    throw new Error('No se pudo recuperar el comunicado actualizado');
  }

  return respuestaPublica(comunicadoCompleto);
};

export const eliminar = async (id: number) => {
  const comunicado = await repo.findOneBy({ id });

  if (!comunicado) {
    throw new Error('No encontrado');
  }

  await repo.remove(comunicado);
};
