import { AppDataSource } from '../../../data-source';
import {
  Participantes,
  EstadoReserva,
} from '../../../models/Participantes';
import {
  Reserva,
  EstadoReserva as EstadoReservaNueva,
} from '../../../models/Reserva';
import {
  EventosCapacitaciones,
  EstadoEventoCapacitacion,
} from '../../../models/EventosCapacitaciones';
import { In } from 'typeorm';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { NotificacionService } from '../../Notificaciones/Crear notificaciones Reservas/NotificacionReservaService';

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
    throw errorReserva(
      'ValidationError',
      `El campo ${campo} es obligatorio.`,
    );
  }

  return valor.trim();
}

function obtenerFechaValida(
  valor: unknown,
  campo: string,
): { texto: string; fecha: Date } {
  const texto = textoRequerido(valor, campo);

  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);

  if (!coincidencia) {
    throw errorReserva(
      'ValidationError',
      `El campo ${campo} debe tener formato YYYY-MM-DD.`,
    );
  }

  const fecha = new Date(
    Number(coincidencia[1]),
    Number(coincidencia[2]) - 1,
    Number(coincidencia[3]),
  );

  if (
    fecha.getFullYear() !== Number(coincidencia[1]) ||
    fecha.getMonth() !== Number(coincidencia[2]) - 1 ||
    fecha.getDate() !== Number(coincidencia[3])
  ) {
    throw errorReserva(
      'ValidationError',
      `El campo ${campo} no es una fecha válida.`,
    );
  }

  return { texto, fecha };
}

function calcularEdad(fechaNacimiento: Date, hoy: Date): number {
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();

  const aunNoCumple =
    hoy.getMonth() < fechaNacimiento.getMonth() ||
    (hoy.getMonth() === fechaNacimiento.getMonth() &&
      hoy.getDate() < fechaNacimiento.getDate());

  if (aunNoCumple) {
    edad -= 1;
  }

  return edad;
}

function sufijoTicketActual(): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica', month: '2-digit', year: '2-digit',
  }).formatToParts(new Date());
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? '';
  return `${valor('month')}${valor('year')}`;
}

async function generarNumeroTicket(manager: import('typeorm').EntityManager): Promise<string> {
  const sufijo = sufijoTicketActual();
  const patron = `%${sufijo}`;
  const [reserva, participante] = await Promise.all([
    manager.getRepository(Reserva).createQueryBuilder('reserva').select('MAX(CAST(SUBSTRING(reserva.numero_ticket, 6, 4) AS UNSIGNED))', 'ultimo').where('reserva.numero_ticket LIKE :patron', { patron }).getRawOne<{ ultimo: string | null }>(),
    manager.getRepository(Participantes).createQueryBuilder('participante').select('MAX(CAST(SUBSTRING(participante.numero_ticket, 6, 4) AS UNSIGNED))', 'ultimo').where('participante.numero_ticket LIKE :patron', { patron }).getRawOne<{ ultimo: string | null }>(),
  ]);
  const consecutivo = Math.max(Number(reserva?.ultimo ?? 0), Number(participante?.ultimo ?? 0)) + 1;
  if (consecutivo > 9999) throw errorReserva('TicketLimitError', 'Se alcanzó el límite mensual de tickets.');
  return `#TKT-${String(consecutivo).padStart(4, '0')}${sufijo}`;
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
  const nombreCompleto = textoRequerido(
    datos.nombreCompleto,
    'nombreCompleto',
  );

  const fechaNacimiento = obtenerFechaValida(
    datos.fechaNacimiento,
    'fechaNacimiento',
  );

  const tipoIdentificacion = textoRequerido(
    datos.tipoIdentificacion,
    'tipoIdentificacion',
  );

  const numeroIdentificacion = textoRequerido(
    datos.numeroIdentificacion,
    'numeroIdentificacion',
  );

  const correo = textoRequerido(datos.correo, 'correo');

  const telefono = textoRequerido(datos.telefono, 'telefono');

  if (nombreCompleto.length < 3) {
    throw errorReserva(
      'ValidationError',
      'Los datos personales no son válidos.',
    );
  }

  if (!['cedula', 'dimex', 'pasaporte'].includes(tipoIdentificacion)) {
    throw errorReserva(
      'ValidationError',
      'El tipo de identificación no es válido.',
    );
  }

  const patronesIdentificacion: Record<TipoIdentificacion, RegExp> = {
    cedula: /^\d{9}$/,
    dimex: /^\d{11,12}$/,
    pasaporte: /^[A-Za-z0-9]{6,20}$/,
  };

  if (
    !patronesIdentificacion[tipoIdentificacion as TipoIdentificacion].test(
      numeroIdentificacion,
    )
  ) {
    throw errorReserva(
      'ValidationError',
      'El número de identificación no es válido.',
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw errorReserva('ValidationError', 'El correo no es válido.');
  }

  const numeroTelefono = parsePhoneNumberFromString(telefono);

  if (!telefono.startsWith('+') || !numeroTelefono?.isValid()) {
    throw errorReserva(
      'ValidationError',
      'El teléfono internacional no es válido.',
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (fechaNacimiento.fecha > hoy) {
    throw errorReserva(
      'ValidationError',
      'La fecha de nacimiento no puede estar en el futuro.',
    );
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

export class InscripcionService {
  // Corrección 1: la propiedad debe declararse en la clase
  constructor(
    private readonly notificacionService: NotificacionService = new NotificacionService(),
  ) {}

  async consultarReserva(
    usuarioId: number,
    eventoCapacitacionId: number,
  ): Promise<{
    existe: boolean;
    estado: EstadoReservaNueva | null;
    reserva: Reserva | null;
  }> {
    const reserva = await AppDataSource.getRepository(Reserva).findOne({
      where: { usuarioId, eventoCapacitacionId },
    });

    return {
      existe: Boolean(reserva),
      estado: reserva?.estado ?? null,
      reserva: reserva ?? null,
    };
  }

  async crearReserva(
    usuarioId: number,
    eventoCapacitacionId: number,
    datos: DatosReserva,
  ): Promise<{
    reserva: Reserva;
    cuposDisponibles: number;
  }> {
    return AppDataSource.transaction(async (manager) => {
      const eventosRepo = manager.getRepository(EventosCapacitaciones);
      const reservasRepo = manager.getRepository(Reserva);

      const evento = await eventosRepo
        .createQueryBuilder('evento')
        .setLock('pessimistic_write')
        .where('evento.id = :id', { id: eventoCapacitacionId })
        .getOne();

      if (!evento) {
        throw errorReserva(
          'EventNotFoundError',
          'El evento o capacitación no existe.',
        );
      }

      if (evento.estado !== EstadoEventoCapacitacion.PUBLICADO) {
        throw errorReserva(
          'EventNotPublishedError',
          'El evento o capacitación no está publicado.',
        );
      }

      const fechaEvento = obtenerFechaValida(
        evento.fecha,
        'fecha del evento',
      ).fecha;

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaEvento < hoy) {
        throw errorReserva(
          'EventDatePassedError',
          'La fecha del evento ya pasó.',
        );
      }

      const datosValidados = validarDatosReserva(datos);

      if (
        (evento.edadMinima !== null &&
          datosValidados.edad < evento.edadMinima) ||
        (evento.edadMaxima !== null &&
          datosValidados.edad > evento.edadMaxima)
      ) {
        throw errorReserva(
          'AgeNotAllowedError',
          'La edad no está permitida para este evento.',
        );
      }

      if (evento.cuposDisponibles === null || evento.cuposDisponibles <= 0) {
        throw errorReserva(
          'CapacityError',
          'No hay cupos disponibles para este evento o capacitación.',
        );
      }

      const reservaExistente = await reservasRepo.findOne({
        where: { usuarioId, eventoCapacitacionId },
      });

      if (
        reservaExistente &&
        [
          EstadoReservaNueva.PENDIENTE,
          EstadoReservaNueva.APROBADA,
        ].includes(reservaExistente.estado)
      ) {
        throw errorReserva(
          'ReservationAlreadyExistsError',
          'El usuario ya tiene una reserva activa para este evento.',
        );
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
            comprobanteUrl: null,
            motivoRechazo: null,
            fechaExpiracionPreReserva: evento.esPago ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
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
            numeroTicket: await generarNumeroTicket(manager),
            fechaExpiracionPreReserva: evento.esPago ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
          });

      // Corrección 2: una sola resta (antes estaba duplicada)
      evento.cuposDisponibles -= 1;

      const reservaGuardada = await reservasRepo.save(reserva);

      await eventosRepo.save(evento);

      await this.notificacionService.notificarReserva(
        manager,
        reservaGuardada,
        evento,
      );

      return {
        reserva: reservaGuardada,
        cuposDisponibles: evento.cuposDisponibles,
      };
    });
  }

  async editarReserva(
    usuarioId: number,
    eventoCapacitacionId: number,
    datos: DatosReserva,
  ): Promise<{
    reserva: Reserva;
    cuposDisponibles: number | null;
  }> {
    return AppDataSource.transaction(async (manager) => {
      const eventosRepo = manager.getRepository(EventosCapacitaciones);
      const reservasRepo = manager.getRepository(Reserva);

      // 1. Buscar el evento/capacitación
      const evento = await eventosRepo.findOne({
        where: { id: eventoCapacitacionId },
      });

      if (!evento) {
        throw errorReserva(
          'EventNotFoundError',
          'El evento o capacitación no existe.',
        );
      }

      // 2. Verificar que la fecha del evento no haya pasado
      const fechaEvento = obtenerFechaValida(
        evento.fecha,
        'fecha del evento',
      ).fecha;

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaEvento < hoy) {
        throw errorReserva(
          'EventDatePassedError',
          'No se puede editar la reserva porque la fecha del evento ya pasó.',
        );
      }

      // 3. Buscar la reserva del usuario
      const reserva = await reservasRepo.findOne({
        where: { usuarioId, eventoCapacitacionId },
      });

      if (!reserva) {
        throw errorReserva(
          'NotFoundError',
          'No se encontró una reserva para este evento o capacitación.',
        );
      }

      // 4. Verificar que esté pendiente
      if (reserva.estado !== EstadoReservaNueva.PENDIENTE) {
        throw errorReserva(
          'ReservationNotEditableError',
          'La reserva no se puede editar porque ya no se encuentra en estado pendiente.',
        );
      }

      // 5. Validar los nuevos datos
      const datosValidados = validarDatosReserva(datos);

      // 6. Verificar restricciones de edad
      if (
        (evento.edadMinima !== null &&
          datosValidados.edad < evento.edadMinima) ||
        (evento.edadMaxima !== null &&
          datosValidados.edad > evento.edadMaxima)
      ) {
        throw errorReserva(
          'AgeNotAllowedError',
          'La edad no está permitida para este evento.',
        );
      }

      // 7. Actualizar solamente los datos editables
      Object.assign(reserva, {
        nombreCompleto: datosValidados.nombreCompleto,
        fechaNacimiento: datosValidados.fechaNacimiento,
        tipoIdentificacion: datosValidados.tipoIdentificacion,
        numeroIdentificacion: datosValidados.numeroIdentificacion,
        correo: datosValidados.correo,
        telefono: datosValidados.telefono,
      });

      // 8. Guardar la reserva
      const reservaGuardada = await reservasRepo.save(reserva);

      return {
        reserva: reservaGuardada,
        cuposDisponibles: evento.cuposDisponibles ?? null,
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
    return await AppDataSource.transaction(async (manager) => {
      const eventosRepo = manager.getRepository(EventosCapacitaciones);
      const participantesRepo = manager.getRepository(Participantes);

      const evento = await eventosRepo
        .createQueryBuilder('evento')
        .setLock('pessimistic_write')
        .where('evento.id = :id', { id: eventoCapacitacionId })
        .getOne();

      if (!evento) {
        throw errorReserva(
          'NotFoundError',
          'El evento o capacitación no existe.',
        );
      }

      if (evento.estado !== 'publicado') {
        throw errorReserva(
          'ValidationError',
          'El evento o capacitación no está disponible para inscripción.',
        );
      }

      const inscripcionExistente = await participantesRepo.findOne({
        where: { usuarioId, eventoCapacitacionId },
      });

      if (
        inscripcionExistente &&
        inscripcionExistente.estado !== EstadoReserva.CANCELADA
      ) {
        throw errorReserva(
          'DuplicateRegistrationError',
          'El usuario ya está inscrito en este evento o capacitación.',
        );
      }

      let cuposAntesDeInscripcion: number | null = null;

      if (evento.cupoMaximo !== null) {
        const inscritos = await participantesRepo.count({
          where: {
            eventoCapacitacionId,
            estado: In([EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA]),
          },
        });

        const cuposDisponibles =
          evento.cuposDisponibles ??
          Math.max(evento.cupoMaximo - inscritos, 0);

        cuposAntesDeInscripcion = cuposDisponibles;

        if (cuposDisponibles <= 0) {
          throw errorReserva(
            'CapacityError',
            'No hay cupos disponibles para este evento o capacitación.',
          );
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
            numeroTicket: await generarNumeroTicket(manager),
          });

      const participanteGuardado = await participantesRepo.save(participante);

      const cuposDisponibles =
        evento.cupoMaximo === null
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
    });
  }
}
