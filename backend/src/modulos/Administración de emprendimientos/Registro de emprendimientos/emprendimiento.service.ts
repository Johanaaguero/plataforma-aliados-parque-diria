import { AppDataSource } from '../../../data-source';

import {
  Emprendimiento,
  EstadoPublicacion,
} from '../../../models/Emprendimiento';

import { CategoriaEmprendimiento } from '../../../models/CategoriaEmprendimiento';

import { Usuario } from '../../../models/Usuario';

const emprendimientoRepository =
  AppDataSource.getRepository(Emprendimiento);

const categoriaRepository =
  AppDataSource.getRepository(CategoriaEmprendimiento);

const usuarioRepository =
  AppDataSource.getRepository(Usuario);

// ============================================================
// DTO CREAR
// ============================================================

interface CrearEmprendimientoDto {
  nombre: string;
  descripcion?: string;
  categoriaId?: number;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  correoElectronico?: string;
  telefono?: string;
  imagen?: Buffer;
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
  direccion?: string;
  latitud?: number;
  longitud?: number;
  correoElectronico?: string;
  telefono?: string;
  imagen?: Buffer;

  // IMPORTANTE:
  // borrador = guardar como borrador
  // cambios = guardar cambios y dejar pendiente de publicación
  modo?: 'cambios' | 'borrador';
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
  ): Promise<Emprendimiento | null> {
    return emprendimientoRepository.findOne({
      where: { id },

      relations: {
        categoria: true,
        asociado: true,
      },
    });
  }

  // ============================================================
  // CREAR
  // ============================================================

  // ============================================================
// CREAR
// ============================================================

async crear(
  dto: CrearEmprendimientoDto,
): Promise<Emprendimiento> {

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

  const emprendimiento =
    new Emprendimiento({

      nombre: dto.nombre,

      descripcion:
        dto.descripcion,

      categoria,

      asociado,

      direccion:
        dto.direccion,

      latitud:
        dto.latitud,

      longitud:
        dto.longitud,

      correoElectronico:
        dto.correoElectronico,

      telefono:
        dto.telefono,

      imagen:
        dto.imagen,

      estadoPublicacion:
        estadoInicial,
    });

  // ============================================================
  // GUARDAR
  // ============================================================

  return await emprendimientoRepository.save(
    emprendimiento,
  );
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
  ): Promise<Emprendimiento> {
    const emprendimiento =
      await this.buscarPorId(id);

    if (!emprendimiento) {
      throw new Error(
        'Emprendimiento no encontrado',
      );
    }

    return emprendimiento;
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
  ): Promise<ResultadoCambioPublicacion> {
    const emprendimiento =
      await this.buscarPorId(id);

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

    return {
      ok: true,
      message: transicion.mensaje,
      emprendimiento:
        emprendimientoActualizado,
    };
  }

  // ============================================================
  // ACTUALIZAR
  // ============================================================

  async actualizar(
    id: number,
    dto: ActualizarEmprendimientoDto,
    usuarioId: number,
    rolUsuario: string,
  ): Promise<Emprendimiento> {
    const emprendimiento =
      await this.obtenerPorId(id);

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

    // ========================================================
    // DEVOLVER CON RELACIONES ACTUALIZADAS
    // ========================================================

    const resultado =
      await this.buscarPorId(
        actualizado.id,
      );

    if (!resultado) {
      throw new Error(
        'No fue posible recuperar el emprendimiento actualizado',
      );
    }

    return resultado;
  }

  // ============================================================
  // ELIMINAR
  // ============================================================

  async eliminar(
    id: number,
  ): Promise<void> {
    const emprendimiento =
      await this.obtenerPorId(id);

    await emprendimientoRepository.remove(
      emprendimiento,
    );
  }
}

// ============================================================
// EXPORTAR SERVICE
// ============================================================

export const emprendimientoService =
  new EmprendimientoService();