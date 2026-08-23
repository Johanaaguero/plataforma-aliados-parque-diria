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

  // Usuario asociado dueño del emprendimiento
  asociadoId?: number;
}

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
}

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
    !tieneTexto(emprendimiento.correoElectronico)
  ) {
    camposFaltantes.push('correo electrónico');
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

  async crear(
    dto: CrearEmprendimientoDto,
  ): Promise<Emprendimiento> {
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

    const existente =
      await emprendimientoRepository.findOneBy({
        nombre: dto.nombre,
      });

    if (existente) {
      throw new Error(
        'Ya existe un emprendimiento registrado con ese nombre',
      );
    }

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

    const emprendimiento =
      new Emprendimiento({
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        categoria,
        asociado,
        direccion: dto.direccion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        correoElectronico:
          dto.correoElectronico,
        telefono: dto.telefono,
        imagen: dto.imagen,

        // Todo nuevo emprendimiento inicia como borrador.
        estadoPublicacion:
          EstadoPublicacion.BORRADOR,
      });

    return await emprendimientoRepository.save(
      emprendimiento,
    );
  }

  // ============================================================
  // OBTENER TODOS
  // ============================================================

  async obtenerTodos(): Promise<Emprendimiento[]> {
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
    console.log('========== VISIBILIDAD ==========');
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
    //
    // El administrador puede ver absolutamente todos.
    //

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
    //
    // El asociado puede ver:
    //
    // 1. TODOS sus propios emprendimientos,
    //    sin importar su estado.
    //
    // 2. TODOS los emprendimientos publicados,
    //    sin importar quién los creó.
    //
    // Esto incluye emprendimientos con asociado_id NULL
    // siempre que estén PUBLICADOS.
    //

    consulta.where(
      '(asociado.id = :usuarioId) OR ' +
        '(emprendimiento.estado_publicacion = :publicado)',
      {
        usuarioId,
        publicado:
          EstadoPublicacion.PUBLICADO,
      },
    );

    // Si posteriormente se solicita un estado específico,
    // se aplica el filtro adicional.
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
      '========== VISIBILIDAD ASOCIADO ==========',
    );
    console.log('Usuario ID:', usuarioId);
    console.log('Rol:', rolUsuario);
    console.log('Estado:', estado);
    console.log(
      'Emprendimientos encontrados:',
      resultados.length,
    );

    resultados.forEach((emprendimiento) => {
      console.log({
        id: emprendimiento.id,
        nombre: emprendimiento.nombre,
        asociadoId:
          emprendimiento.asociado?.id ?? null,
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

    // Administrador puede verlo todo.
    if (rolUsuario === 'administrador') {
      return emprendimiento;
    }

    // El asociado puede ver siempre sus propios
    // emprendimientos, sin importar el estado.
    const esDueno =
      emprendimiento.asociado?.id === usuarioId;

    if (esDueno) {
      return emprendimiento;
    }

    // El asociado también puede ver cualquier
    // emprendimiento que esté publicado,
    // aunque no tenga asociado o pertenezca a otro usuario.
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
      emprendimiento.fechaPublicacion === null
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
  ): Promise<Emprendimiento> {
    const emprendimiento =
      await this.obtenerPorId(id);

    if (dto.categoriaId !== undefined) {
      const categoria =
        await categoriaRepository.findOneBy({
          id: dto.categoriaId,
        });

      if (!categoria) {
        throw new Error(
          'La categoría seleccionada no existe',
        );
      }

      emprendimiento.categoria =
        categoria;
    }

    if (
      dto.nombre !== undefined &&
      dto.nombre !== emprendimiento.nombre
    ) {
      const existente =
        await emprendimientoRepository.findOneBy({
          nombre: dto.nombre,
        });

      if (existente) {
        throw new Error(
          'Ya existe un emprendimiento registrado con ese nombre',
        );
      }

      emprendimiento.nombre =
        dto.nombre;
    }

    if (
      dto.descripcion !== undefined
    ) {
      emprendimiento.descripcion =
        dto.descripcion;
    }

    if (
      dto.direccion !== undefined
    ) {
      emprendimiento.direccion =
        dto.direccion;
    }

    if (
      dto.latitud !== undefined
    ) {
      emprendimiento.latitud =
        dto.latitud;
    }

    if (
      dto.longitud !== undefined
    ) {
      emprendimiento.longitud =
        dto.longitud;
    }

    if (
      dto.correoElectronico !== undefined
    ) {
      emprendimiento.correoElectronico =
        dto.correoElectronico;
    }

    if (
      dto.telefono !== undefined
    ) {
      emprendimiento.telefono =
        dto.telefono;
    }

    if (dto.imagen !== undefined) {
      emprendimiento.imagen =
        dto.imagen;
    }

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

    return await emprendimientoRepository.save(
      emprendimiento,
    );
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

export const emprendimientoService =
  new EmprendimientoService();