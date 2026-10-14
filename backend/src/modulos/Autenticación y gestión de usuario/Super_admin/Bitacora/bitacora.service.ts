import { AppDataSource } from '../../../../data-source';
import { AuditLog } from '../../../../models/AuditLog';
import { HistorialCambioRol } from '../../../../models/HistorialCambioRol';
import { Brackets } from 'typeorm';

const LIMITE_PREDETERMINADO = 10;
const LIMITE_MAXIMO = 50;
const ESTADOS_PERMITIDOS = ['success', 'failure', 'blocked'] as const;
type EstadoBitacora = (typeof ESTADOS_PERMITIDOS)[number];

export class BitacoraValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BitacoraValidationError';
  }
}

export interface FiltrosBitacora {
  page?: number;
  limit?: number;
  action?: string;
  status?: EstadoBitacora;
  usuarioId?: number;
  desde?: Date;
  hasta?: Date;
  busqueda?: string;
}

const mapearRegistro = (registro: AuditLog) => ({
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
});

export const obtenerBitacora = async (filtros: FiltrosBitacora = {}) => {
  const auditRepository = AppDataSource.getRepository(AuditLog);
  const historialRepository = AppDataSource.getRepository(HistorialCambioRol);
  const page = filtros.page ?? 1;
  const limit = filtros.limit ?? LIMITE_PREDETERMINADO;
  const skip = (page - 1) * limit;

  const consulta = auditRepository
    .createQueryBuilder('auditLog')
    .leftJoin('auditLog.usuario', 'usuario')
    .addSelect([
      'usuario.id',
      'usuario.nombreUsuario',
      'usuario.nombre',
      'usuario.apellidos',
      'usuario.correo',
    ]);

  if (filtros.action) {
    consulta.andWhere('auditLog.action = :action', {
      action: filtros.action,
    });
  }

  if (filtros.status) {
    consulta.andWhere('auditLog.status = :status', {
      status: filtros.status,
    });
  }

  if (filtros.usuarioId !== undefined) {
    consulta.andWhere('auditLog.usuarioId = :usuarioId', {
      usuarioId: filtros.usuarioId,
    });
  }

  if (filtros.desde) {
    consulta.andWhere('auditLog.createdAt >= :desde', {
      desde: filtros.desde,
    });
  }

  if (filtros.hasta) {
    consulta.andWhere('auditLog.createdAt <= :hasta', {
      hasta: filtros.hasta,
    });
  }

  if (filtros.busqueda) {
    const busqueda = `%${filtros.busqueda}%`;
    consulta.andWhere(
      new Brackets((subconsulta) => {
        subconsulta
          .where('auditLog.action LIKE :busqueda', { busqueda })
          .orWhere('auditLog.description LIKE :busqueda', { busqueda })
          .orWhere('auditLog.details LIKE :busqueda', { busqueda })
          .orWhere('usuario.nombreUsuario LIKE :busqueda', { busqueda })
          .orWhere('usuario.nombre LIKE :busqueda', { busqueda })
          .orWhere('usuario.apellidos LIKE :busqueda', { busqueda })
          .orWhere('usuario.correo LIKE :busqueda', { busqueda });
      }),
    );
  }

  const [registrosAuditoria, totalAuditoria] = await consulta
    .orderBy('auditLog.createdAt', 'DESC')
    .addOrderBy('auditLog.id', 'DESC')
    .take(skip + limit)
    .getManyAndCount();

  let registrosHistorial: Array<{
    id: string;
    usuarioId: number;
    action: string;
    description: string;
    status: 'success';
    details: string;
    createdAt: Date;
    usuario: {
      id: number;
      nombreUsuario: string;
      nombre: string;
      apellidos: string;
      correo: string;
    };
  }> = [];
  let totalHistorial = 0;

  if (
    (!filtros.action || filtros.action === 'CAMBIO_ROL') &&
    (!filtros.status || filtros.status === 'success')
  ) {
    const historial = historialRepository
      .createQueryBuilder('historial')
      .innerJoin('historial.actor', 'actor')
      .addSelect([
        'actor.id',
        'actor.nombreUsuario',
        'actor.nombre',
        'actor.apellidos',
        'actor.correo',
      ])
      .innerJoin('historial.usuarioAfectado', 'afectado')
      .addSelect([
        'afectado.id',
        'afectado.nombreUsuario',
        'afectado.nombre',
        'afectado.apellidos',
      ])
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM audit_logs auditRol
          WHERE auditRol.action = 'CAMBIO_ROL'
            AND JSON_VALID(auditRol.details) = 1
            AND JSON_UNQUOTE(JSON_EXTRACT(auditRol.details, '$.actorId')) = CAST(historial.actor_id AS CHAR)
            AND JSON_UNQUOTE(JSON_EXTRACT(auditRol.details, '$.usuarioAfectadoId')) = CAST(historial.usuario_afectado_id AS CHAR)
            AND JSON_UNQUOTE(JSON_EXTRACT(auditRol.details, '$.rolAnterior')) = historial.rol_anterior
            AND JSON_UNQUOTE(JSON_EXTRACT(auditRol.details, '$.rolNuevo')) = historial.rol_nuevo
            AND ABS(TIMESTAMPDIFF(MICROSECOND, auditRol.created_at, historial.fecha_cambio)) <= 5000000
        )`,
      );

    if (filtros.usuarioId !== undefined) {
      historial.andWhere('historial.actorId = :usuarioId', {
        usuarioId: filtros.usuarioId,
      });
    }

    if (filtros.desde) {
      historial.andWhere('historial.fechaCambio >= :desde', {
        desde: filtros.desde,
      });
    }

    if (filtros.hasta) {
      historial.andWhere('historial.fechaCambio <= :hasta', {
        hasta: filtros.hasta,
      });
    }

    if (filtros.busqueda) {
      const busqueda = `%${filtros.busqueda}%`;
      historial.andWhere(
        new Brackets((subconsulta) => {
          subconsulta
            .where("'CAMBIO_ROL' LIKE :busqueda", { busqueda })
            .orWhere('actor.nombreUsuario LIKE :busqueda', { busqueda })
            .orWhere('actor.nombre LIKE :busqueda', { busqueda })
            .orWhere('actor.apellidos LIKE :busqueda', { busqueda })
            .orWhere('afectado.nombreUsuario LIKE :busqueda', { busqueda })
            .orWhere('afectado.nombre LIKE :busqueda', { busqueda })
            .orWhere('afectado.apellidos LIKE :busqueda', { busqueda })
            .orWhere('CAST(actor.id AS CHAR) LIKE :busqueda', { busqueda })
            .orWhere('CAST(afectado.id AS CHAR) LIKE :busqueda', { busqueda })
            .orWhere('historial.rolAnterior LIKE :busqueda', { busqueda })
            .orWhere('historial.rolNuevo LIKE :busqueda', { busqueda });
        }),
      );
    }

    const [eventosHistorial, totalEventosHistorial] = await historial
      .orderBy('historial.fechaCambio', 'DESC')
      .addOrderBy('historial.id', 'DESC')
      .take(skip + limit)
      .getManyAndCount();

    totalHistorial = totalEventosHistorial;
    registrosHistorial = eventosHistorial.map((evento) => {
      const actor = evento.actor;
      const afectado = evento.usuarioAfectado;

      return {
        id: `historial-${evento.id}`,
        usuarioId: actor.id,
        action: 'CAMBIO_ROL',
        description: `Cambio de rol de ${afectado.nombreUsuario} (ID ${afectado.id}), realizado por ${actor.nombreUsuario} (ID ${actor.id}): de ${evento.rolAnterior} a ${evento.rolNuevo}`,
        status: 'success',
        details: JSON.stringify({
          actorId: actor.id,
          actorNombreUsuario: actor.nombreUsuario,
          actorNombreCompleto: `${actor.nombre} ${actor.apellidos}`.trim(),
          usuarioAfectadoId: afectado.id,
          usuarioAfectadoNombreUsuario: afectado.nombreUsuario,
          usuarioAfectadoNombreCompleto:
            `${afectado.nombre} ${afectado.apellidos}`.trim(),
          rolAnterior: evento.rolAnterior,
          rolNuevo: evento.rolNuevo,
          origen: 'historial_cambio_roles',
        }),
        createdAt: evento.fechaCambio,
        usuario: {
          id: actor.id,
          nombreUsuario: actor.nombreUsuario,
          nombre: actor.nombre,
          apellidos: actor.apellidos,
          correo: actor.correo,
        },
      };
    });
  }

  const registrosCombinados = [
    ...registrosAuditoria.map(mapearRegistro),
    ...registrosHistorial,
  ]
    .sort((a, b) => {
      const fechaDiferencia =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (fechaDiferencia !== 0) return fechaDiferencia;

      const idA = Number(String(a.id).replace(/^historial-/, ''));
      const idB = Number(String(b.id).replace(/^historial-/, ''));
      return idB - idA;
    })
    .slice(skip, skip + limit);
  const total = totalAuditoria + totalHistorial;

  const accionesDisponibles = await auditRepository
    .createQueryBuilder('auditLog')
    .select('DISTINCT auditLog.action', 'action')
    .orderBy('auditLog.action', 'ASC')
    .getRawMany<{ action: string }>();
  const totalHistorialDisponible = await historialRepository
    .createQueryBuilder('historial')
    .andWhere(
      `NOT EXISTS (
        SELECT 1
        FROM audit_logs auditRol
        WHERE auditRol.action = 'CAMBIO_ROL'
          AND JSON_VALID(auditRol.details) = 1
          AND JSON_UNQUOTE(JSON_EXTRACT(auditRol.details, '$.actorId')) = CAST(historial.actor_id AS CHAR)
          AND JSON_UNQUOTE(JSON_EXTRACT(auditRol.details, '$.usuarioAfectadoId')) = CAST(historial.usuario_afectado_id AS CHAR)
          AND JSON_UNQUOTE(JSON_EXTRACT(auditRol.details, '$.rolAnterior')) = historial.rol_anterior
          AND JSON_UNQUOTE(JSON_EXTRACT(auditRol.details, '$.rolNuevo')) = historial.rol_nuevo
          AND ABS(TIMESTAMPDIFF(MICROSECOND, auditRol.created_at, historial.fecha_cambio)) <= 5000000
      )`,
    )
    .getCount();

  if (
    totalHistorialDisponible > 0 &&
    !accionesDisponibles.some((item) => item.action === 'CAMBIO_ROL')
  ) {
    accionesDisponibles.push({ action: 'CAMBIO_ROL' });
  }
  accionesDisponibles.sort((a, b) => a.action.localeCompare(b.action));

  const totalPaginas = Math.max(1, Math.ceil(total / limit));

  return {
    registros: registrosCombinados,
    accionesDisponibles: accionesDisponibles.map((item) => item.action),
    total,
    page,
    limit,
    totalPaginas,
  };
};

export const normalizarFiltrosBitacora = (
  query: Record<string, unknown>,
): FiltrosBitacora => {
  const page = leerEnteroPositivo(query.page, 'page') ?? 1;
  const limitSinTope = leerEnteroPositivo(query.limit, 'limit') ?? LIMITE_PREDETERMINADO;
  const limit = Math.min(limitSinTope, LIMITE_MAXIMO);
  const action = leerTexto(query.action);
  const status = leerTexto(query.status);
  const usuarioId = leerEnteroPositivo(query.usuarioId, 'usuarioId');
  const desde = leerFecha(query.desde, 'desde', false);
  const hasta = leerFecha(query.hasta, 'hasta', true);
  const busqueda = leerTexto(query.busqueda);

  if (
    status &&
    !ESTADOS_PERMITIDOS.includes(status as EstadoBitacora)
  ) {
    throw new BitacoraValidationError(
      `El estado debe ser uno de: ${ESTADOS_PERMITIDOS.join(', ')}.`,
    );
  }

  if (desde && hasta && desde > hasta) {
    throw new BitacoraValidationError('El rango de fechas no es valido: desde no puede ser mayor que hasta.');
  }

  const filtros: FiltrosBitacora = {
    page,
    limit,
  };

  if (action !== undefined) filtros.action = action;
  if (status !== undefined) {
    filtros.status = status as EstadoBitacora;
  }
  if (usuarioId !== undefined) filtros.usuarioId = usuarioId;
  if (desde !== undefined) filtros.desde = desde;
  if (hasta !== undefined) filtros.hasta = hasta;
  if (busqueda !== undefined) filtros.busqueda = busqueda;

  return filtros;
};

const leerTexto = (valor: unknown): string | undefined => {
  if (typeof valor !== 'string') return undefined;
  const texto = valor.trim();
  return texto ? texto : undefined;
};

const leerEnteroPositivo = (
  valor: unknown,
  nombre: string,
): number | undefined => {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)) {
    throw new BitacoraValidationError(`El parametro ${nombre} debe ser un entero positivo.`);
  }

  const numero = Number(valor);
  if (!Number.isSafeInteger(numero)) {
    throw new BitacoraValidationError(`El parametro ${nombre} no es valido.`);
  }

  return numero;
};

const leerFecha = (
  valor: unknown,
  nombre: string,
  finalDelDia: boolean,
): Date | undefined => {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new BitacoraValidationError(`El parametro ${nombre} debe ser una fecha valida.`);
  }

  const texto = valor.trim();
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(texto)
    ? new Date(`${texto}T${finalDelDia ? '23:59:59.999' : '00:00:00.000'}-06:00`)
    : new Date(texto);

  if (Number.isNaN(fecha.getTime())) {
    throw new BitacoraValidationError(`El parametro ${nombre} debe ser una fecha valida.`);
  }

  return fecha;
};
