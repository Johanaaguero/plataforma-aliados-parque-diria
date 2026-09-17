import { AppDataSource } from '../../../data-source';
import { Participantes, EstadoReserva } from '../../../models/Participantes';
import { Reserva, EstadoReserva as EstadoReservaNueva } from '../../../models/Reserva';
import { EventosCapacitaciones, EstadoEventoCapacitacion } from '../../../models/EventosCapacitaciones';
import { In } from 'typeorm';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface DatosReserva {
  nombreCompleto: unknown;
  fechaNacimiento: unknown;
  tipoIdentificacion: unknown;
  numeroIdentificacion: unknown;
  correo: unknown;
  telefono: unknown;
}

type TipoIdentificacion = 'cedula' | 'dimex' | 'pasaporte';

function errorReserva(nombre: string, mensaje: string): Error {
  const error = new Error(mensaje);
  error.name = nombre;
  return error;
}

function textoRequerido(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw errorReserva('ValidationError', `El campo ${campo} es obligatorio.`);
  }

  return valor.trim();
}

function obtenerFechaValida(valor: unknown, campo: string): { texto: string; fecha: Date } {
  const texto = textoRequerido(valor, campo);
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);

  if (!coincidencia) {
    throw errorReserva('ValidationError', `El campo ${campo} debe tener formato YYYY-MM-DD.`);
  }

  const fecha = new Date(Number(coincidencia[1]), Number(coincidencia[2]) - 1, Number(coincidencia[3]));

  if (
    fecha.getFullYear() !== Number(coincidencia[1]) ||
    fecha.getMonth() !== Number(coincidencia[2]) - 1 ||
    fecha.getDate() !== Number(coincidencia[3])
  ) {
    throw errorReserva('ValidationError', `El campo ${campo} no es una fecha válida.`);
  }

  return { texto, fecha };
}

function calcularEdad(fechaNacimiento: Date, hoy: Date): number {
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < fechaNacimiento.getMonth() ||
    (hoy.getMonth() === fechaNacimiento.getMonth() && hoy.getDate() < fechaNacimiento.getDate());

  if (aunNoCumple) edad -= 1;
  return edad;
}

function validarDatosReserva(datos: DatosReserva): {
  nombreCompleto: string;
  fechaNacimiento: string;
  tipoIdentificacion: TipoIdentificacion;
  numeroIdentificacion: string;
  correo: string;
  telefono: string;
  edad: number;
} {
  const nombreCompleto = textoRequerido(datos.nombreCompleto, 'nombreCompleto');
  const fechaNacimiento = obtenerFechaValida(datos.fechaNacimiento, 'fechaNacimiento');
  const tipoIdentificacion = textoRequerido(datos.tipoIdentificacion, 'tipoIdentificacion');
  const numeroIdentificacion = textoRequerido(datos.numeroIdentificacion, 'numeroIdentificacion');
  const correo = textoRequerido(datos.correo, 'correo');
  const telefono = textoRequerido(datos.telefono, 'telefono');

  if (nombreCompleto.length < 3) {
    throw errorReserva('ValidationError', 'Los datos personales no son válidos.');
  }

  if (!['cedula', 'dimex', 'pasaporte'].includes(tipoIdentificacion)) {
    throw errorReserva('ValidationError', 'El tipo de identificación no es válido.');
  }

  const patronesIdentificacion: Record<TipoIdentificacion, RegExp> = {
    cedula: /^\d{9}$/,
    dimex: /^\d{11,12}$/,
    pasaporte: /^[A-Za-z0-9]{6,20}$/,
  };

  if (!patronesIdentificacion[tipoIdentificacion as TipoIdentificacion].test(numeroIdentificacion)) {
    throw errorReserva('ValidationError', 'El número de identificación no es válido.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw errorReserva('ValidationError', 'El correo no es válido.');
  }

  const numeroTelefono = parsePhoneNumberFromString(telefono);
  if (!telefono.startsWith('+') || !numeroTelefono?.isValid()) {
    throw errorReserva('ValidationError', 'El teléfono internacional no es válido.');
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fechaNacimiento.fecha > hoy) {
    throw errorReserva('ValidationError', 'La fecha de nacimiento no puede estar en el futuro.');
  }

  return {
    nombreCompleto,
    fechaNacimiento: fechaNacimiento.texto,
    tipoIdentificacion: tipoIdentificacion as TipoIdentificacion,
    numeroIdentificacion,
    correo,
    telefono,
    edad: calcularEdad(fechaNacimiento.fecha, hoy),
  };
}


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
  async consultarReserva(
    usuarioId: number,
    eventoCapacitacionId: number,
  ): Promise<{ existe: boolean; estado: EstadoReservaNueva | null }> {
    const reserva = await AppDataSource.getRepository(Reserva).findOne({
      select: {
        estado: true,
      },
      where: { usuarioId, eventoCapacitacionId },
    });

    return {
      existe: Boolean(reserva),
      estado: reserva?.estado ?? null,
    };
  }

  async crearReserva(
    usuarioId: number,
    eventoCapacitacionId: number,
    datos: DatosReserva,
  ): Promise<{ reserva: Reserva; cuposDisponibles: number }> {
    return AppDataSource.transaction(async (manager) => {
      const eventosRepo = manager.getRepository(EventosCapacitaciones);
      const reservasRepo = manager.getRepository(Reserva);

      const evento = await eventosRepo
        .createQueryBuilder('evento')
        .setLock('pessimistic_write')
        .where('evento.id = :id', { id: eventoCapacitacionId })
        .getOne();

      if (!evento) {
        throw errorReserva('EventNotFoundError', 'El evento o capacitación no existe.');
      }

      if (evento.estado !== EstadoEventoCapacitacion.PUBLICADO) {
        throw errorReserva('EventNotPublishedError', 'El evento o capacitación no está publicado.');
      }

      const fechaEvento = obtenerFechaValida(evento.fecha, 'fecha del evento').fecha;
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fechaEvento < hoy) {
        throw errorReserva('EventDatePassedError', 'La fecha del evento ya pasó.');
      }

      const datosValidados = validarDatosReserva(datos);
      if (
        (evento.edadMinima !== null && datosValidados.edad < evento.edadMinima) ||
        (evento.edadMaxima !== null && datosValidados.edad > evento.edadMaxima)
      ) {
        throw errorReserva('AgeNotAllowedError', 'La edad no está permitida para este evento.');
      }

      if (evento.cuposDisponibles === null || evento.cuposDisponibles <= 0) {
        throw errorReserva('CapacityError', 'No hay cupos disponibles para este evento o capacitación.');
      }

      const reservaExistente = await reservasRepo.findOne({
        where: { usuarioId, eventoCapacitacionId },
      });

      if (
        reservaExistente &&
        [EstadoReservaNueva.PENDIENTE, EstadoReservaNueva.APROBADA].includes(reservaExistente.estado)
      ) {
        throw errorReserva('ReservationAlreadyExistsError', 'El usuario ya tiene una reserva activa para este evento.');
      }

      const reserva = reservaExistente
        ? Object.assign(reservaExistente, {
            nombreCompleto: datosValidados.nombreCompleto,
            fechaNacimiento: datosValidados.fechaNacimiento,
            tipoIdentificacion: datosValidados.tipoIdentificacion,
            numeroIdentificacion: datosValidados.numeroIdentificacion,
            correo: datosValidados.correo,
            telefono: datosValidados.telefono,
            estado: EstadoReservaNueva.PENDIENTE,
          })
        : reservasRepo.create({
            usuarioId,
            eventoCapacitacionId,
            nombreCompleto: datosValidados.nombreCompleto,
            fechaNacimiento: datosValidados.fechaNacimiento,
            tipoIdentificacion: datosValidados.tipoIdentificacion,
            numeroIdentificacion: datosValidados.numeroIdentificacion,
            correo: datosValidados.correo,
            telefono: datosValidados.telefono,
            estado: EstadoReservaNueva.PENDIENTE,
          });

      evento.cuposDisponibles -= 1;
      const reservaGuardada = await reservasRepo.save(reserva);
      await eventosRepo.save(evento);

      return {
        reserva: reservaGuardada,
        cuposDisponibles: evento.cuposDisponibles,
      };
    });
  }

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

        if (
          inscripcionExistente &&
          inscripcionExistente.estado !== EstadoReserva.CANCELADA
        ) {
          const error = new Error(
            'El usuario ya está inscrito en este evento o capacitación.',
          );
          error.name = 'DuplicateRegistrationError';
          throw error;
        }

        let cuposAntesDeInscripcion: number | null = null;

        if (evento.cupoMaximo !== null) {
          const inscritos = await participantesRepo.count({
            where: {
              eventoCapacitacionId,
              estado: In([EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA]),
            },
          });
          const cuposDisponibles = evento.cuposDisponibles ?? Math.max(evento.cupoMaximo - inscritos, 0);
          cuposAntesDeInscripcion = cuposDisponibles;

          if (cuposDisponibles <= 0) {
            const error = new Error(
              'No hay cupos disponibles para este evento o capacitación.',
            );
            error.name = 'CapacityError';
            throw error;
          }
        }

        const participante = inscripcionExistente
          ? Object.assign(inscripcionExistente, {
              estado: EstadoReserva.CONFIRMADA,
              fechaCancelacion: null,
            })
          : participantesRepo.create({
              usuarioId,
              eventoCapacitacionId,
              estado: EstadoReserva.CONFIRMADA,
            });

        const participanteGuardado = await participantesRepo.save(participante);

        const cuposDisponibles = evento.cupoMaximo === null
          ? null
          : Math.max((cuposAntesDeInscripcion ?? 0) - 1, 0);

        if (evento.cupoMaximo !== null) {
          evento.cuposDisponibles = cuposDisponibles;
          await eventosRepo.save(evento);
        }

        return {
          participante: participanteGuardado,
          cuposDisponibles,
        };
      },
    );
  }
}
