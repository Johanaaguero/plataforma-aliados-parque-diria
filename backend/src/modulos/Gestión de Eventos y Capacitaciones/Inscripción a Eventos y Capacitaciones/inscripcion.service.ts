import { AppDataSource } from '../../../data-source';
import { Participantes } from '../../../models/Participantes';
import { EventosCapacitaciones } from '../../../models/EventosCapacitaciones';



/**
 * Registra a un usuario en un evento o capacitación.
 *
 * El proceso se ejecuta dentro de una transacción para garantizar
 * la integridad de la inscripción y evitar que se exceda el cupo
 * disponible cuando existen solicitudes concurrentes.
 *
 * Validaciones realizadas:
 * - Verifica que el evento o capacitación exista.
 * - Verifica que se encuentre publicado.
 * - Verifica que el usuario no esté inscrito previamente.
 * - Verifica la disponibilidad de cupos.
 * - Registra la inscripción en la tabla participantes.
 *
 * @param usuarioId Identificador del usuario que desea inscribirse.
 * @param eventoCapacitacionId Identificador del evento o capacitación.
 * @returns El registro de la inscripción creada.
 *
 * @throws NotFoundError Si el evento o capacitación no existe.
 * @throws ValidationError Si el evento no está disponible para inscripción.
 * @throws DuplicateRegistrationError Si el usuario ya está inscrito.
 * @throws CapacityError Si no existen cupos disponibles.
 */


export class InscripcionService {
  async inscribir(
    usuarioId: number,
    eventoCapacitacionId: number,
  ): Promise<{
    participante: Participantes;
    cuposDisponibles: number | null;
  }> {
    return await AppDataSource.transaction(
      async (manager) => {
        const eventosRepo =
          manager.getRepository(EventosCapacitaciones);

        const participantesRepo =
          manager.getRepository(Participantes);

        const evento = await eventosRepo
          .createQueryBuilder('evento')
          .setLock('pessimistic_write')
          .where('evento.id = :id', {
            id: eventoCapacitacionId,
          })
          .getOne();

        if (!evento) {
          const error = new Error(
            'El evento o capacitación no existe.',
          );
          error.name = 'NotFoundError';
          throw error;
        }

        if (evento.estado !== 'publicado') {
          const error = new Error(
            'El evento o capacitación no está disponible para inscripción.',
          );
          error.name = 'ValidationError';
          throw error;
        }

        const inscripcionExistente =
          await participantesRepo.findOne({
            where: {
              usuarioId,
              eventoCapacitacionId,
            },
          });

        if (inscripcionExistente) {
          const error = new Error(
            'El usuario ya está inscrito en este evento o capacitación.',
          );
          error.name = 'DuplicateRegistrationError';
          throw error;
        }

        if (evento.cupoMaximo !== null) {
          const inscritos = await participantesRepo.count({
            where: {
              eventoCapacitacionId,
            },
          });

          if (inscritos >= evento.cupoMaximo) {
            const error = new Error(
              'No hay cupos disponibles para este evento o capacitación.',
            );
            error.name = 'CapacityError';
            throw error;
          }
        }

        const participante = participantesRepo.create({
          usuarioId,
          eventoCapacitacionId,
        });

        const participanteGuardado = await participantesRepo.save(participante);

        const inscritosActualizados = await participantesRepo.count({
          where: {
            eventoCapacitacionId,
          },
        });

        const cuposDisponibles =
          evento.cupoMaximo === null
            ? null
            : Math.max(evento.cupoMaximo - inscritosActualizados, 0);

        return {
          participante: participanteGuardado,
          cuposDisponibles,
        };
      },
    );
  }
}
