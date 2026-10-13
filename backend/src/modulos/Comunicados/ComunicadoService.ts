import { AppDataSource } from '../../data-source';
import { Comunicado, PrioridadComunicado } from '../../models/Comunicado';
import { Notificacion, TipoNotificacion } from '../../models/Notificacion';
import { Usuario } from '../../models/Usuario';

const repo = AppDataSource.getRepository(Comunicado);
const notificacionesRepo = AppDataSource.getRepository(Notificacion);
const usuariosRepo = AppDataSource.getRepository(Usuario);

const construirMensajeNotificacion = (comunicado: Comunicado): string => {
  const contenido = comunicado.contenido.trim();
  return `Prioridad: ${comunicado.prioridad}\n${contenido}`;
};

export const listar = () => repo.find({
  relations: { creadoPor: true },
  order: { fechaPublicacion: 'DESC' },
});

export const crear = async (datos: {
  titulo: string;
  contenido: string;
  prioridad: PrioridadComunicado;
  creadoPorId: number;
}) => {
  const comunicado = await repo.save(repo.create({
    ...datos,
    titulo: datos.titulo.trim(),
    contenido: datos.contenido.trim(),
  }));

  const usuarios = await usuariosRepo.find({ select: { id: true } });

  if (usuarios.length) {
    await notificacionesRepo.save(
      usuarios.map((usuario) => notificacionesRepo.create({
        usuarioId: usuario.id,
        tipo: TipoNotificacion.NUEVO_COMUNICADO,
        titulo: comunicado.titulo,
        mensaje: construirMensajeNotificacion(comunicado),
        leida: false,
        referenciaId: comunicado.id,
        referenciaTipo: 'comunicado',
      })),
    );
  }

  return comunicado;
};

export const editar = async (
  id: number,
  datos: Partial<Pick<Comunicado, 'titulo' | 'contenido' | 'prioridad'>>,
) => {
  const comunicado = await repo.findOneBy({ id });
  if (!comunicado) throw new Error('No encontrado');

  Object.assign(comunicado, datos);
  return repo.save(comunicado);
};

export const eliminar = async (id: number) => {
  const comunicado = await repo.findOneBy({ id });
  if (!comunicado) throw new Error('No encontrado');

  await repo.remove(comunicado);
};
