import { AppDataSource } from '../../../data-source';

import {
  Emprendimiento,
  EstadoPublicacion,
} from '../../../models/Emprendimiento';

import { ConsultaEmprendimiento } from '../../../models/ConsultaEmprendimiento';
import { CategoriaEmprendimiento } from '../../../models/CategoriaEmprendimiento';
import { Usuario } from '../../../models/Usuario';
import { EmprendimientoImagen } from '../../../models/EmprendimientoImagen';
import type { EntityManager } from 'typeorm';

// ============================================================
// NUEVO: SERVICIO DE NOTIFICACIONES DE EMPRENDIMIENTOS
// ============================================================
import { notificacionEmprendimientoService } from '../../Notificaciones/Crear notificaciones Emprendimientos/NotificacionEmprendimientoService';
import { registrarAuditoria } from '../../Autenticación y gestión de usuario/Autenticación y seguridad de acceso al sistema/auditoria.service';

const emprendimientoRepository =
  AppDataSource.getRepository(Emprendimiento);

const consultaEmprendimientoRepository =
  AppDataSource.getRepository(ConsultaEmprendimiento);

const categoriaRepository =
  AppDataSource.getRepository(CategoriaEmprendimiento);

const usuarioRepository =
  AppDataSource.getRepository(Usuario);

const imagenRepository =
  AppDataSource.getRepository(EmprendimientoImagen);

const registrarAuditoriaEmprendimiento = async (
  usuarioId: number,
  action: string,
  emprendimiento: Emprendimiento,
  details: Record<string, unknown>,
  manager?: EntityManager,
): Promise<void> => {
  await registrarAuditoria({
    usuarioId,
    action,
    description: `${action} del emprendimiento #${emprendimiento.id}`,
    status: 'success',
    details: JSON.stringify({
      emprendimientoId: emprendimiento.id,
      nombre: emprendimiento.nombre,
      ...details,
    }),
  }, manager);
};

// ============================================================
// DTO CREAR
// ============================================================

interface CrearEmprendimientoDto {
  nombre: string;
  descripcion?: string;
  categoriaId?: number;
  provincia?: string;
  canton?: string;
  distrito?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  correoElectronico?: string;
  telefono?: string;
  imagen?: Buffer;
  imagenes?: { buffer: Buffer; tipoMime: string }[];
  asociadoId?: number;

  // Estado explícito, si se utiliza
  estadoPublicacion?: EstadoPublicacion;

  // Modo utilizado por los botones del formulario
  modo?: 'cambios' | 'borrador';
}

// ============================================================
// DTO ACTUALIZAR
// ============================================================

interface ActualizarEmprendimientoDto {
  nombre?: string;
  descripcion?: string;
  categoriaId?: number;
  provincia?: string;
  canton?: string;
  distrito?: string;
  direccion?: string;
  latitud?: number | null;
  longitud?: number | null;
  correoElectronico?: string;
  telefono?: string;
  imagen?: Buffer;
  imagenes?: { buffer: Buffer; tipoMime: string }[];
  imagenesConservadas?: number[];
  portadaImagenId?: number;
  portadaNueva?: boolean;
  eliminarImagen?: boolean;

  // IMPORTANTE:
  // borrador = guardar como borrador
  // cambios = guardar cambios y dejar pendiente de publicación
  modo?: 'cambios' | 'borrador';
}

// ============================================================
// DTO UBICACIÓN
// ============================================================

interface ActualizarUbicacionDto {
  provincia: string;
  canton: string;
  distrito: string;
  direccion: string;
  latitud: number;
  longitud: number;
}

// ============================================================
// RESULTADO CAMBIO PUBLICACIÓN
// ============================================================

type ResultadoCambioPublicacion =
  | {
      ok: true;
      message: string;
      emprendimiento: Emprendimiento;
    }
  | {
      ok: false;
      status: 400 | 403 | 404;
      message: string;
      camposFaltantes?: string[];
    };

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

const tieneTexto = (
  valor: string | null | undefined,
): boolean => {
  return (
    typeof valor === 'string' &&
    valor.trim().length > 0
  );
};

const coordenadaValida = (
  valor: unknown,
  minimo: number,
  maximo: number,
): boolean => {
  if (
    valor === null ||
    valor === undefined ||
    (typeof valor === 'string' &&
      valor.trim().length === 0)
  ) {
    return false;
  }

  const numero = Number(valor);

  return (
    Number.isFinite(numero) &&
    numero >= minimo &&
    numero <= maximo
  );
};

// ============================================================
// CAMPOS FALTANTES
// ============================================================

const obtenerCamposFaltantes = (
  emprendimiento: Emprendimiento,
): string[] => {
  const camposFaltantes: string[] = [];

  if (!tieneTexto(emprendimiento.nombre)) {
    camposFaltantes.push('nombre');
  }

  if (!tieneTexto(emprendimiento.descripcion)) {
    camposFaltantes.push('descripción');
  }

  if (!emprendimiento.categoria?.id) {
    camposFaltantes.push('categoría');
  }

  if (
    !Buffer.isBuffer(emprendimiento.imagen) ||
    emprendimiento.imagen.length === 0
  ) {
    camposFaltantes.push('imagen o logotipo');
  }

  if (
    !tieneTexto(
      emprendimiento.correoElectronico,
    )
  ) {
    camposFaltantes.push(
      'correo electrónico',
    );
  }

  if (!tieneTexto(emprendimiento.telefono)) {
    camposFaltantes.push('teléfono');
  }

  if (
    !coordenadaValida(
      emprendimiento.latitud,
      -90,
      90,
    )
  ) {
    camposFaltantes.push('latitud');
  }

  if (
    !coordenadaValida(
      emprendimiento.longitud,
      -180,
      180,
    )
  ) {
    camposFaltantes.push('longitud');
  }

  return camposFaltantes;
};

// ============================================================
// TRANSICIONES DE ESTADO
// ============================================================

interface DefinicionTransicion {
  roles: string[];
  requiereCompletitud: boolean;
  mensaje: string;
}

const clave = (
  origen: EstadoPublicacion,
  destino: EstadoPublicacion,
): string => `${origen}->${destino}`;

const TRANSICIONES: Record<
  string,
  DefinicionTransicion
> = {
  [clave(
    EstadoPublicacion.BORRADOR,
    EstadoPublicacion.NO_PUBLICADO,
  )]: {
    roles: ['administrador', 'asociado'],
    requiereCompletitud: true,
    mensaje:
      'Emprendimiento enviado y pendiente de publicación.',
  },

  [clave(
    EstadoPublicacion.NO_PUBLICADO,
    EstadoPublicacion.PUBLICADO,
  )]: {
    roles: ['administrador'],
    requiereCompletitud: true,
    mensaje:
      'Emprendimiento publicado correctamente.',
  },

  [clave(
    EstadoPublicacion.PUBLICADO,
    EstadoPublicacion.NO_PUBLICADO,
  )]: {
    roles: ['administrador'],
    requiereCompletitud: false,
    mensaje:
      'Emprendimiento ocultado correctamente.',
  },

  [clave(
    EstadoPublicacion.NO_PUBLICADO,
    EstadoPublicacion.DESACTIVADO,
  )]: {
    roles: ['administrador', 'asociado'],
    requiereCompletitud: false,
    mensaje:
      'Emprendimiento desactivado correctamente.',
  },

  [clave(
    EstadoPublicacion.PUBLICADO,
    EstadoPublicacion.DESACTIVADO,
  )]: {
    roles: ['administrador', 'asociado'],
    requiereCompletitud: false,
    mensaje:
      'Emprendimiento desactivado correctamente.',
  },

  [clave(
    EstadoPublicacion.DESACTIVADO,
    EstadoPublicacion.NO_PUBLICADO,
  )]: {
    roles: ['administrador', 'asociado'],
    requiereCompletitud: false,
    mensaje:
      'Emprendimiento reactivado y pendiente de publicación.',
  },
};

// ============================================================
// SERVICE
// ============================================================

export class EmprendimientoService {

  // ============================================================
  // BUSCAR POR ID
  // ============================================================

  private async buscarPorId(
    id: number,
    manager?: EntityManager,
  ): Promise<Emprendimiento | null> {
    const repository =
      manager?.getRepository(Emprendimiento) ??
      emprendimientoRepository;

    return repository.findOne({
      where: { id },
      relations: {
        categoria: true,
        asociado: true,
        imagenes: true,
      },
    });
  }

  // ============================================================
  // CREAR
  // ============================================================

  async crear(
    dto: CrearEmprendimientoDto,
    usuarioId: number,
    rolUsuario: string,
    manager?: EntityManager,
  ): Promise<Emprendimiento> {
    if (!manager) {
      return AppDataSource.transaction((transactionManager) =>
        this.crear(dto, usuarioId, rolUsuario, transactionManager),
      );
    }

    const emprendimientoRepository =
      manager.getRepository(Emprendimiento);
    const imagenRepository =
      manager.getRepository(EmprendimientoImagen);
    const categoriaRepository =
      manager.getRepository(CategoriaEmprendimiento);
    const usuarioRepository =
      manager.getRepository(Usuario);

    // ============================================================
    // NUEVO: OBTENER USUARIO QUE REALMENTE ESTÁ CREANDO
    // ============================================================

    const usuarioCreador =
      await usuarioRepository.findOne({
        where: { id: Number(usuarioId) },
        relations: {
          rol: true,
        },
      });

    if (!usuarioCreador) {
      throw new Error(
        'No fue posible identificar al usuario que registra el emprendimiento',
      );
    }

    // ============================================================
    // CATEGORÍA
    // ============================================================

    let categoria:
      | CategoriaEmprendimiento
      | undefined;

    if (dto.categoriaId !== undefined) {
      categoria =
        (await categoriaRepository.findOneBy({
          id: dto.categoriaId,
        })) ?? undefined;

      if (!categoria) {
        throw new Error(
          'La categoría seleccionada no existe',
        );
      }
    }

    // ============================================================
    // VALIDAR NOMBRE DUPLICADO
    // ============================================================

    const existente =
      await emprendimientoRepository.findOneBy({
        nombre: dto.nombre,
      });

    if (existente) {
      throw new Error(
        'Ya existe un emprendimiento registrado con ese nombre',
      );
    }

    // ============================================================
    // ASOCIADO
    // ============================================================

    let asociado: Usuario | undefined;

    if (dto.asociadoId !== undefined) {
      asociado =
        (await usuarioRepository.findOneBy({
          id: dto.asociadoId,
        })) ?? undefined;

      if (!asociado) {
        throw new Error(
          'El usuario asociado no existe',
        );
      }
    }

    // ============================================================
    // DETERMINAR ESTADO INICIAL
    // ============================================================

    let estadoInicial: EstadoPublicacion;

    if (dto.modo === 'borrador') {
      estadoInicial =
        EstadoPublicacion.BORRADOR;
    } else if (dto.modo === 'cambios') {
      estadoInicial =
        EstadoPublicacion.NO_PUBLICADO;
    } else if (dto.estadoPublicacion !== undefined) {
      estadoInicial =
        dto.estadoPublicacion;
    } else {
      // Por seguridad, si no se especifica nada
      estadoInicial =
        EstadoPublicacion.NO_PUBLICADO;
    }

    // ============================================================
    // CREAR EMPRENDIMIENTO
    // ============================================================

    const emprendimiento = new Emprendimiento({
      nombre: dto.nombre,

      ...(dto.descripcion !== undefined
        ? { descripcion: dto.descripcion }
        : {}),

      ...(categoria !== undefined
        ? { categoria }
        : {}),

      ...(asociado !== undefined
        ? { asociado }
        : {}),

      ...(dto.provincia !== undefined
        ? { provincia: dto.provincia }
        : {}),

      ...(dto.canton !== undefined
        ? { canton: dto.canton }
        : {}),

      ...(dto.distrito !== undefined
        ? { distrito: dto.distrito }
        : {}),

      ...(dto.direccion !== undefined
        ? { direccion: dto.direccion }
        : {}),

      ...(dto.latitud !== undefined
        ? { latitud: dto.latitud }
        : {}),

      ...(dto.longitud !== undefined
        ? { longitud: dto.longitud }
        : {}),

      ...(dto.correoElectronico !== undefined
        ? {
            correoElectronico:
              dto.correoElectronico,
          }
        : {}),

      ...(dto.telefono !== undefined
        ? { telefono: dto.telefono }
        : {}),

      ...(dto.imagen !== undefined
        ? { imagen: dto.imagen }
        : {}),

      estadoPublicacion: estadoInicial,
    });

    // ============================================================
    // GUARDAR
    // ============================================================

    const guardado =
      await emprendimientoRepository.save(
        emprendimiento,
      );

    if (dto.imagenes?.length) {
      await imagenRepository.save(
        dto.imagenes.map(
          (imagen, indice) =>
            imagenRepository.create({
              emprendimiento: guardado,
              imagen: imagen.buffer,
              tipoMime: imagen.tipoMime,
              esPortada: indice === 0,
            }),
        ),
      );
    }

    // ============================================================
    // NUEVO: NOTIFICAR AL ADMINISTRADOR SI LO CREÓ UN ASOCIADO
    // ============================================================

    if (
      usuarioCreador.rol?.nombre ===
      'asociado'
    ) {
      await notificacionEmprendimientoService
        .notificarNuevoEmprendimientoAlAdministrador(
          guardado,
          usuarioCreador,
          manager,
        );
    }

    // ============================================================
    // NUEVO: NOTIFICAR A VISITANTES SI NACE PUBLICADO
    // ============================================================

    if (
      guardado.estadoPublicacion ===
      EstadoPublicacion.PUBLICADO
    ) {
      await notificacionEmprendimientoService
        .notificarNuevoEmprendimientoAVisitantes(
          guardado,
          manager,
        );
    }

    await registrarAuditoriaEmprendimiento(
      usuarioId,
      'CREAR_EMPRENDIMIENTO',
      guardado,
      {
        estadoPublicacion: guardado.estadoPublicacion,
        asociadoId: guardado.asociado?.id ?? dto.asociadoId ?? null,
        categoriaId: guardado.categoria?.id ?? dto.categoriaId ?? null,
      },
      manager,
    );

    return guardado;
  }

  // ============================================================
  // OBTENER TODOS
  // ============================================================

  async obtenerTodos(): Promise<
    Emprendimiento[]
  > {
    return await emprendimientoRepository.find({
      relations: {
        categoria: true,
        asociado: true,
      },
      order: {
        fechaCreacion: 'DESC',
      },
    });
  }

  // ============================================================
  // VISIBILIDAD POR USUARIO
  // ============================================================

  async obtenerVisiblesParaUsuario(
    usuarioId: number,
    rolUsuario: string,
    estado?: EstadoPublicacion,
  ): Promise<Emprendimiento[]> {

    console.log(
      '========== VISIBILIDAD ==========',
    );

    console.log('Usuario ID:', usuarioId);
    console.log('Rol:', rolUsuario);
    console.log('Estado:', estado);

    const consulta =
      emprendimientoRepository
        .createQueryBuilder('emprendimiento')
        .leftJoinAndSelect(
          'emprendimiento.categoria',
          'categoria',
        )
        .leftJoinAndSelect(
          'emprendimiento.asociado',
          'asociado',
        )
        .orderBy(
          'emprendimiento.fechaCreacion',
          'DESC',
        );

    // ========================================================
    // ADMINISTRADOR
    // ========================================================

    if (rolUsuario === 'administrador') {
      if (estado) {
        consulta.andWhere(
          'emprendimiento.estado_publicacion = :estado',
          {
            estado,
          },
        );
      }

      const resultados =
        await consulta.getMany();

      console.log(
        'Emprendimientos encontrados:',
        resultados.length,
      );

      return resultados;
    }

    // ========================================================
    // ASOCIADO
    // ========================================================

    consulta.where(
      '(asociado.id = :usuarioId) OR ' +
        '(emprendimiento.estado_publicacion = :publicado)',
      {
        usuarioId,
        publicado:
          EstadoPublicacion.PUBLICADO,
      },
    );

    if (estado) {
      consulta.andWhere(
        'emprendimiento.estado_publicacion = :estado',
        {
          estado,
        },
      );
    }

    const resultados =
      await consulta.getMany();

    console.log(
      'Emprendimientos encontrados:',
      resultados.length,
    );

    resultados.forEach((emprendimiento) => {
      console.log({
        id: emprendimiento.id,
        nombre: emprendimiento.nombre,
        asociadoId:
          emprendimiento.asociado?.id ??
          null,
        estado:
          emprendimiento.estadoPublicacion,
      });
    });

    console.log(
      '===========================================',
    );

    return resultados;
  }

  // ============================================================
  // OBTENER UNO SEGÚN VISIBILIDAD
  // ============================================================

  async obtenerVisiblePorId(
    id: number,
    usuarioId: number,
    rolUsuario: string,
  ): Promise<Emprendimiento | null> {

    const emprendimiento =
      await this.buscarPorId(id);

    if (!emprendimiento) {
      return null;
    }

    // ========================================================
    // ADMINISTRADOR
    // ========================================================

    if (rolUsuario === 'administrador') {
      return emprendimiento;
    }

    // ========================================================
    // ASOCIADO
    // ========================================================

    const usuarioIdNumero =
      Number(usuarioId);

    const asociadoIdNumero =
      emprendimiento.asociado?.id !==
        undefined &&
      emprendimiento.asociado?.id !== null
        ? Number(
            emprendimiento.asociado.id,
          )
        : null;

    const esDueno =
      asociadoIdNumero !== null &&
      asociadoIdNumero === usuarioIdNumero;

    if (esDueno) {
      return emprendimiento;
    }

    // Un asociado puede consultar emprendimientos
    // de otros asociados únicamente si están publicados.

    const esPublicado =
      emprendimiento.estadoPublicacion ===
      EstadoPublicacion.PUBLICADO;

    if (esPublicado) {
      return emprendimiento;
    }

    return null;
  }

  // ============================================================
  // OBTENER POR ID
  // ============================================================

  async obtenerPorId(
    id: number,
    manager?: EntityManager,
  ): Promise<Emprendimiento> {

    const emprendimiento =
      await this.buscarPorId(id, manager);

    if (!emprendimiento) {
      throw new Error(
        'Emprendimiento no encontrado',
      );
    }

    return emprendimiento;
  }

  // ============================================================
  // REGISTRAR CONSULTA
  // ============================================================

  async registrarConsulta(
    id: number,
    usuarioId?: number,
  ): Promise<ConsultaEmprendimiento> {

    const emprendimiento =
      await this.buscarPorId(id);

    if (
      !emprendimiento ||
      emprendimiento.estadoPublicacion !==
        EstadoPublicacion.PUBLICADO
    ) {
      throw new Error(
        'Emprendimiento no encontrado',
      );
    }

    const consulta =
      consultaEmprendimientoRepository.create({
        emprendimientoId:
          emprendimiento.id,
        usuarioId: usuarioId ?? null,
      });

    return consultaEmprendimientoRepository.save(
      consulta,
    );
  }

  // ============================================================
  // OBTENER POR ESTADO
  // ============================================================

  async obtenerPorEstado(
    estado: EstadoPublicacion,
  ): Promise<Emprendimiento[]> {

    return await emprendimientoRepository.find({
      where: {
        estadoPublicacion: estado,
      },

      relations: {
        categoria: true,
        asociado: true,
      },

      order: {
        fechaCreacion: 'DESC',
      },
    });
  }

  // ============================================================
  // CATÁLOGO PÚBLICO
  // ============================================================

  async obtenerCatalogoPublico(): Promise<
    Emprendimiento[]
  > {

    return this.obtenerPorEstado(
      EstadoPublicacion.PUBLICADO,
    );
  }

  // ============================================================
  // CAMBIAR PUBLICACIÓN
  // ============================================================

  async cambiarPublicacion(
    id: number,
    nuevoEstado: EstadoPublicacion,
    rolUsuario: string,
    usuarioId: number,
    manager?: EntityManager,
  ): Promise<ResultadoCambioPublicacion> {
    if (!manager) {
      return AppDataSource.transaction((transactionManager) =>
        this.cambiarPublicacion(
          id,
          nuevoEstado,
          rolUsuario,
          usuarioId,
          transactionManager,
        ),
      );
    }

    const emprendimientoRepository =
      manager.getRepository(Emprendimiento);

    const emprendimiento =
      await this.buscarPorId(id, manager);

    if (!emprendimiento) {
      return {
        ok: false,
        status: 404,
        message:
          'Emprendimiento no encontrado',
      };
    }

    const estadoActual =
      emprendimiento.estadoPublicacion;

    if (estadoActual === nuevoEstado) {
      return {
        ok: false,
        status: 400,
        message:
          `El emprendimiento ya se encuentra en estado "${nuevoEstado}"`,
      };
    }

    const transicion =
      TRANSICIONES[
        clave(
          estadoActual,
          nuevoEstado,
        )
      ];

    if (!transicion) {
      return {
        ok: false,
        status: 400,
        message:
          `No es posible cambiar de "${estadoActual}" a "${nuevoEstado}" directamente`,
      };
    }

    if (
      !transicion.roles.includes(
        rolUsuario,
      )
    ) {
      return {
        ok: false,
        status: 403,
        message:
          'No tiene permisos para realizar esta transición de estado',
      };
    }

    if (
      transicion.requiereCompletitud
    ) {
      const camposFaltantes =
        obtenerCamposFaltantes(
          emprendimiento,
        );

      if (
        camposFaltantes.length > 0
      ) {
        return {
          ok: false,
          status: 400,
          message:
            'El emprendimiento no tiene toda la información requerida para esta acción',
          camposFaltantes,
        };
      }
    }

    if (
      nuevoEstado ===
        EstadoPublicacion.PUBLICADO &&
      emprendimiento.fechaPublicacion ===
        null
    ) {
      emprendimiento.fechaPublicacion =
        new Date();
    }

    emprendimiento.estadoPublicacion =
      nuevoEstado;

    const emprendimientoActualizado =
      await emprendimientoRepository.save(
        emprendimiento,
      );

    // ============================================================
    // NUEVO: NOTIFICAR A VISITANTES AL PUBLICAR
    // ============================================================

    if (
      estadoActual !==
        EstadoPublicacion.PUBLICADO &&
      nuevoEstado ===
        EstadoPublicacion.PUBLICADO
    ) {
      await notificacionEmprendimientoService
        .notificarNuevoEmprendimientoAVisitantes(
          emprendimientoActualizado,
          manager,
        );
    }

    if (estadoActual !== nuevoEstado) {
  let titulo = '';
  let mensaje = '';

  if (nuevoEstado === EstadoPublicacion.PUBLICADO) {
    titulo = 'Tu emprendimiento ha sido publicado';
    mensaje = `El administrador ha publicado tu emprendimiento "${emprendimientoActualizado.nombre}".`;
  } else if (nuevoEstado === EstadoPublicacion.NO_PUBLICADO) {
    titulo = 'Tu emprendimiento ha sido despublicado';
    mensaje = `El administrador ha despublicado tu emprendimiento "${emprendimientoActualizado.nombre}".`;
  } else if (nuevoEstado === EstadoPublicacion.DESACTIVADO) {
    titulo = 'Tu emprendimiento ha sido desactivado';
    mensaje = `El administrador ha desactivado tu emprendimiento "${emprendimientoActualizado.nombre}".`;
  }

  if (titulo && mensaje) {
    await notificacionEmprendimientoService
      .notificarGestionEmprendimientoAlAsociado(
        emprendimientoActualizado,
        titulo,
        mensaje,
        manager,
      );
  }
}

    await registrarAuditoriaEmprendimiento(
      usuarioId,
      'CAMBIAR_ESTADO_EMPRENDIMIENTO',
      emprendimientoActualizado,
      {
        estadoAnterior: estadoActual,
        estadoNuevo: nuevoEstado,
      },
      manager,
    );

    return {
      ok: true,
      message: transicion.mensaje,
      emprendimiento:
        emprendimientoActualizado,
    };
  }

  // ============================================================
  // ACTUALIZAR UBICACIÓN
  // ============================================================

  async actualizarUbicacion(
    id: number,
    dto: ActualizarUbicacionDto,
  ): Promise<Emprendimiento> {

    const emprendimiento =
      await this.obtenerPorId(id);

    if (!tieneTexto(dto.provincia)) {
      throw new Error(
        'La provincia es obligatoria',
      );
    }

    if (!tieneTexto(dto.canton)) {
      throw new Error(
        'El cantón es obligatorio',
      );
    }

    if (!tieneTexto(dto.distrito)) {
      throw new Error(
        'El distrito es obligatorio',
      );
    }

    if (!tieneTexto(dto.direccion)) {
      throw new Error(
        'La dirección es obligatoria',
      );
    }

    if (
      !coordenadaValida(
        dto.latitud,
        -90,
        90,
      )
    ) {
      throw new Error(
        'La latitud debe estar entre -90 y 90',
      );
    }

    if (
      !coordenadaValida(
        dto.longitud,
        -180,
        180,
      )
    ) {
      throw new Error(
        'La longitud debe estar entre -180 y 180',
      );
    }

    emprendimiento.provincia =
      dto.provincia.trim();

    emprendimiento.canton =
      dto.canton.trim();

    emprendimiento.distrito =
      dto.distrito.trim();

    emprendimiento.direccion =
      dto.direccion.trim();

    emprendimiento.latitud =
      dto.latitud;

    emprendimiento.longitud =
      dto.longitud;

    return await emprendimientoRepository.save(
      emprendimiento,
    );
  }

  // ============================================================
  // ACTUALIZAR
  // ============================================================

  async actualizar(
    id: number,
    dto: ActualizarEmprendimientoDto,
    usuarioId: number,
    rolUsuario: string,
    manager?: EntityManager,
  ): Promise<Emprendimiento> {
    if (!manager) {
      return AppDataSource.transaction((transactionManager) =>
        this.actualizar(
          id,
          dto,
          usuarioId,
          rolUsuario,
          transactionManager,
        ),
      );
    }

    const emprendimientoRepository =
      manager.getRepository(Emprendimiento);
    const categoriaRepository =
      manager.getRepository(CategoriaEmprendimiento);
    const imagenRepository =
      manager.getRepository(EmprendimientoImagen);

    const emprendimiento =
      await this.obtenerPorId(id, manager);

    // ============================================================
    // NUEVO: GUARDAR ESTADO ANTERIOR PARA NOTIFICACIONES
    // ============================================================

    const estadoAnterior =
      emprendimiento.estadoPublicacion;

    // ========================================================
    // NORMALIZAR IDS
    // ========================================================

    const usuarioIdNumero =
      Number(usuarioId);

    const asociadoIdNumero =
      emprendimiento.asociado?.id
        ? Number(
            emprendimiento.asociado.id,
          )
        : null;

    // ========================================================
    // VALIDAR PROPIETARIO
    // ========================================================

    if (rolUsuario !== 'administrador') {
      const esDueno =
        asociadoIdNumero !== null &&
        asociadoIdNumero ===
          usuarioIdNumero;

      if (!esDueno) {
        const error: any =
          new Error(
            'Este emprendimiento pertenece a otro asociado.',
          );

        error.status = 403;

        throw error;
      }
    }

    // ========================================================
    // CATEGORÍA
    // ========================================================

    if (dto.categoriaId !== undefined) {
      const categoria =
        await categoriaRepository.findOneBy({
          id: Number(dto.categoriaId),
        });

      if (!categoria) {
        throw new Error(
          'La categoría seleccionada no existe',
        );
      }

      emprendimiento.categoria =
        categoria;
    }

    // ========================================================
    // NOMBRE
    // ========================================================

    if (
      dto.nombre !== undefined &&
      dto.nombre.trim() !== '' &&
      dto.nombre !== emprendimiento.nombre
    ) {
      const existente =
        await emprendimientoRepository.findOneBy({
          nombre: dto.nombre,
        });

      if (
        existente &&
        existente.id !== emprendimiento.id
      ) {
        throw new Error(
          'Ya existe un emprendimiento registrado con ese nombre',
        );
      }

      emprendimiento.nombre =
        dto.nombre;
    }

    // ========================================================
    // DESCRIPCIÓN
    // ========================================================

    if (dto.descripcion !== undefined) {
      emprendimiento.descripcion =
        dto.descripcion;
    }

    // ========================================================
    // DIRECCIÓN
    // ========================================================

    if (dto.direccion !== undefined) {
      emprendimiento.direccion =
        dto.direccion;
    }

    // ========================================================
    // PROVINCIA
    // ========================================================

    if (dto.provincia !== undefined) {
      emprendimiento.provincia =
        dto.provincia.trim();
    }

    // ========================================================
    // CANTÓN
    // ========================================================

    if (dto.canton !== undefined) {
      emprendimiento.canton =
        dto.canton.trim();
    }

    // ========================================================
    // DISTRITO
    // ========================================================

    if (dto.distrito !== undefined) {
      emprendimiento.distrito =
        dto.distrito.trim();
    }

    // ========================================================
    // LATITUD
    // ========================================================

    if (dto.latitud !== undefined) {
      emprendimiento.latitud =
        Number(dto.latitud);
    }

    // ========================================================
    // LONGITUD
    // ========================================================

    if (dto.longitud !== undefined) {
      emprendimiento.longitud =
        Number(dto.longitud);
    }

    // ========================================================
    // CORREO
    // ========================================================

    if (
      dto.correoElectronico !==
      undefined
    ) {
      emprendimiento.correoElectronico =
        dto.correoElectronico;
    }

    // ========================================================
    // TELÉFONO
    // ========================================================

    if (dto.telefono !== undefined) {
      emprendimiento.telefono =
        dto.telefono;
    }

    // ========================================================
    // IMAGEN
    // ========================================================

    if (dto.imagen !== undefined) {
      emprendimiento.imagen =
        dto.imagen;
    }

    if (dto.eliminarImagen) {
      delete emprendimiento.imagen;
    }

    if (
      dto.imagenesConservadas !==
      undefined
    ) {
      const conservadas = new Set(
        dto.imagenesConservadas,
      );

      const imagenesActuales =
        emprendimiento.imagenes ?? [];

      await imagenRepository.remove(
        imagenesActuales.filter(
          (imagen) =>
            !conservadas.has(imagen.id),
        ),
      );
    }

    let imagenesNuevas:
      EmprendimientoImagen[] = [];

    if (dto.imagenes?.length) {
      imagenesNuevas =
        await imagenRepository.save(
          dto.imagenes.map(
            (imagen) =>
              imagenRepository.create({
                emprendimiento,
                imagen: imagen.buffer,
                tipoMime: imagen.tipoMime,
                esPortada: false,
              }),
          ),
        );
    }

    // ========================================================
    // ESTADO SEGÚN MODO DE GUARDADO
    // ========================================================

    if (dto.modo === 'borrador') {
      emprendimiento.estadoPublicacion =
        EstadoPublicacion.BORRADOR;
    }

    if (dto.modo === 'cambios') {
      emprendimiento.estadoPublicacion =
        EstadoPublicacion.NO_PUBLICADO;
    }

    // ========================================================
    // VALIDAR EMPRENDIMIENTO PUBLICADO
    // ========================================================

    /*
     * Solamente validamos completitud si después
     * de la actualización el emprendimiento queda PUBLICADO.
     *
     * Esto permite guardar un formulario incompleto
     * como BORRADOR.
     */

    if (
      emprendimiento.estadoPublicacion ===
      EstadoPublicacion.PUBLICADO
    ) {
      const camposFaltantes =
        obtenerCamposFaltantes(
          emprendimiento,
        );

      if (
        camposFaltantes.length > 0
      ) {
        throw new Error(
          `Un emprendimiento publicado debe conservar toda la información requerida: ${camposFaltantes.join(', ')}`,
        );
      }
    }

    // ========================================================
    // GUARDAR
    // ========================================================

    const actualizado =
      await emprendimientoRepository.save(
        emprendimiento,
      );

    if (
      dto.portadaImagenId !== undefined
    ) {
      const imagenes =
        await imagenRepository.find({
          where: {
            emprendimiento: {
              id: actualizado.id,
            },
          },
        });

      await imagenRepository.save(
        imagenes.map((imagen) => ({
          ...imagen,
          esPortada:
            imagen.id ===
            dto.portadaImagenId,
        })),
      );

      const portada =
        imagenes.find(
          (imagen) =>
            imagen.id ===
            dto.portadaImagenId,
        );

      if (portada) {
        actualizado.imagen =
          portada.imagen;
      }
    }

    if (
      dto.portadaNueva &&
      imagenesNuevas.length > 0
    ) {
      const imagenes =
        await imagenRepository.find({
          where: {
            emprendimiento: {
              id: actualizado.id,
            },
          },
        });

      await imagenRepository.save(
        imagenes.map((imagen) => ({
          ...imagen,
          esPortada:
            imagen.id ===
            imagenesNuevas[0]!.id,
        })),
      );

      actualizado.imagen =
        imagenesNuevas[0]!.imagen;
    }

    // ========================================================
    // DEVOLVER CON RELACIONES ACTUALIZADAS
    // ========================================================

    const resultado =
      await this.buscarPorId(
        actualizado.id,
        manager,
      );

    if (!resultado) {
      throw new Error(
        'No fue posible recuperar el emprendimiento actualizado',
      );
    }

    // ============================================================
    // NUEVO: NOTIFICAR SI LA ACTUALIZACIÓN LO DEJÓ PUBLICADO
    // ============================================================

    if (
      estadoAnterior !==
        EstadoPublicacion.PUBLICADO &&
      resultado.estadoPublicacion ===
        EstadoPublicacion.PUBLICADO
    ) {
      await notificacionEmprendimientoService
        .notificarNuevoEmprendimientoAVisitantes(
          resultado,
          manager,
        );
    }

  if (rolUsuario === 'administrador') {
  await notificacionEmprendimientoService
    .notificarGestionEmprendimientoAlAsociado(
      resultado,
      'Tu emprendimiento ha sido actualizado',
      `El administrador ha actualizado tu emprendimiento "${resultado.nombre}".`,
      manager,
    );
}

    await registrarAuditoriaEmprendimiento(
      usuarioIdNumero,
      'ACTUALIZAR_EMPRENDIMIENTO',
      resultado,
      {
        estadoAnterior,
        estadoNuevo: resultado.estadoPublicacion,
        camposActualizados: Object.keys(dto).filter(
          (campo) =>
            ![
              'imagen',
              'imagenes',
              'imagenesConservadas',
              'portadaNueva',
            ].includes(campo),
        ),
      },
      manager,
    );

    return resultado;
  }

  // ============================================================
  // ELIMINAR
  // ============================================================

  async eliminar(
    id: number,
    usuarioId: number,
    manager?: EntityManager,
  ): Promise<void> {
    if (!manager) {
      return AppDataSource.transaction((transactionManager) =>
        this.eliminar(id, usuarioId, transactionManager),
      );
    }

    const emprendimientoRepository =
      manager.getRepository(Emprendimiento);

    const emprendimiento =
      await this.obtenerPorId(id, manager);
    const estadoAnterior =
      emprendimiento.estadoPublicacion;

    await emprendimientoRepository.remove(
      emprendimiento,
    );

    await registrarAuditoriaEmprendimiento(
      usuarioId,
      'ELIMINAR_EMPRENDIMIENTO',
      emprendimiento,
      {
        estadoAnterior,
      },
      manager,
    );
  }
}

// ============================================================
// EXPORTAR SERVICE
// ============================================================

export const emprendimientoService =
  new EmprendimientoService();
