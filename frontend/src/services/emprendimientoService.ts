import { api } from './api';

// ============================================================
// ESTADOS
// ============================================================

export type EstadoPublicacion =
  | 'borrador'
  | 'no_publicado'
  | 'publicado'
  | 'desactivado';

export type EstadoPublicacionSolicitado =
  | 'Borrador'
  | 'No Publicado'
  | 'Publicado'
  | 'Desactivado';

// ============================================================
// DTO CREAR
// ============================================================

export interface CrearEmprendimientoDto {
  nombre: string;
  descripcion?: string;
  categoriaId?: number;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  correoElectronico?: string;
  telefono?: string;
  imagen?: File | string;
  modo?: 'cambios' | 'borrador';
}

// ============================================================
// DTO ACTUALIZAR
// ============================================================

export interface ActualizarEmprendimientoDto {
  nombre?: string;
  descripcion?: string;
  categoriaId?: number;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  correoElectronico?: string;
  telefono?: string;
  imagen?: File | string;
  modo?: 'cambios' | 'borrador';
}

// ============================================================
// EMPRENDIMIENTO
// ============================================================

export interface Emprendimiento {
  id: number;

  nombre: string;

  descripcion?: string | null;

  categoria:
    | string
    | null
    | {
        id: number;
        nombre?: string;
        descripcion?: string | null;
      };

  asociadoId: number | null;

  direccion?: string | null;

  latitud: number | string | null;

  longitud: number | string | null;

  correoElectronico: string | null;

  telefono: string | null;

  estadoPublicacion: EstadoPublicacion;

  fechaPublicacion?: string | null;

  imagen?: string | null;

  fechaCreacion: string;

  fechaActualizacion: string;

  asociado?: {
    id: number;
    nombre?: string;
    correo?: string;
    correoElectronico?: string;
  } | null;
}

// ============================================================
// RESPUESTA CAMBIO PUBLICACIÓN
// ============================================================

export interface RespuestaCambioPublicacion {
  ok: true;

  message: string;

  data: {
    id: number;

    nombre: string;

    estadoPublicacion: EstadoPublicacion;

    fechaPublicacion: string | null;
  };
}

// ============================================================
// VALIDACIONES
// ============================================================

const esObjeto = (
  valor: unknown,
): valor is Record<string, unknown> =>
  typeof valor === 'object' &&
  valor !== null &&
  !Array.isArray(valor);

const esEstadoPublicacion = (
  valor: unknown,
): valor is EstadoPublicacion =>
  valor === 'borrador' ||
  valor === 'no_publicado' ||
  valor === 'publicado' ||
  valor === 'desactivado';

const esRespuestaCambioPublicacion = (
  valor: unknown,
): valor is RespuestaCambioPublicacion => {
  if (
    !esObjeto(valor) ||
    valor.ok !== true ||
    !esObjeto(valor.data)
  ) {
    return false;
  }

  return (
    typeof valor.message === 'string' &&
    typeof valor.data.id === 'number' &&
    typeof valor.data.nombre === 'string' &&
    esEstadoPublicacion(
      valor.data.estadoPublicacion,
    ) &&
    (
      typeof valor.data.fechaPublicacion ===
        'string' ||
      valor.data.fechaPublicacion === null
    )
  );
};

// ============================================================
// ESTADO FRONTEND -> BACKEND
// ============================================================

export function convertirEstadoASolicitado(
  estado: EstadoPublicacion,
): EstadoPublicacionSolicitado {
  switch (estado) {
    case 'borrador':
      return 'Borrador';

    case 'no_publicado':
      return 'No Publicado';

    case 'publicado':
      return 'Publicado';

    case 'desactivado':
      return 'Desactivado';

    default: {
      const estadoNunca: never =
        estado;

      throw new Error(
        `Estado de publicación no válido: ${estadoNunca}`,
      );
    }
  }
}

// ============================================================
// ESTADO BACKEND -> FRONTEND
// ============================================================

export function convertirEstadoDesdeBackend(
  estado: unknown,
): EstadoPublicacion {
  switch (estado) {
    case 'Borrador':
    case 'borrador':
      return 'borrador';

    case 'No Publicado':
    case 'no_publicado':
      return 'no_publicado';

    case 'Publicado':
    case 'publicado':
      return 'publicado';

    case 'Desactivado':
    case 'desactivado':
      return 'desactivado';

    default:
      throw new Error(
        `Estado de publicación desconocido: ${String(
          estado,
        )}`,
      );
  }
}

// ============================================================
// CREAR
// ============================================================

export async function crearEmprendimiento(
  datos:
    | FormData
    | CrearEmprendimientoDto,
): Promise<Emprendimiento> {
  const esFormData =
    datos instanceof FormData;

  return api.solicitar<Emprendimiento>(
    '/emprendimientos',
    {
      method: 'POST',

      body: esFormData
        ? datos
        : JSON.stringify(datos),
    },
    {
      incluirAuth: true,

      incluirContentType:
        !esFormData,

      desempaquetarData: false,

      mensajeError:
        'No se pudo registrar el emprendimiento',
    },
  );
}

// ============================================================
// CATÁLOGO PÚBLICO
// ============================================================

export async function obtenerCatalogoPublicado(): Promise<
  Emprendimiento[]
> {
  const datos =
    await api.solicitar<unknown>(
      '/emprendimientos/catalogo',
      {
        method: 'GET',
      },
      {
        incluirAuth: false,

        desempaquetarData: false,

        mensajeError:
          'No se pudieron cargar los emprendimientos publicados',
      },
    );

  if (!Array.isArray(datos)) {
    throw new Error(
      'No se pudieron cargar los emprendimientos publicados',
    );
  }

  return datos as Emprendimiento[];
}

// ============================================================
// ADMINISTRATIVOS
// ============================================================

export async function obtenerEmprendimientosAdministrativos(
  estado?: EstadoPublicacion,
): Promise<Emprendimiento[]> {
  const ruta = estado
    ? `/emprendimientos?estado=${encodeURIComponent(
        estado,
      )}`
    : '/emprendimientos';

  const datos =
    await api.solicitar<unknown>(
      ruta,
      {
        method: 'GET',
      },
      {
        incluirAuth: true,

        desempaquetarData: false,

        mensajeError:
          'No se pudieron cargar los emprendimientos',
      },
    );

  if (!Array.isArray(datos)) {
    throw new Error(
      'No se pudieron cargar los emprendimientos',
    );
  }

  return datos as Emprendimiento[];
}

// ============================================================
// OBTENER EMPRENDIMIENTOS
// ============================================================

export async function obtenerEmprendimientos(
  estado?: EstadoPublicacion,
): Promise<Emprendimiento[]> {
  if (estado === 'publicado') {
    return obtenerCatalogoPublicado();
  }

  return obtenerEmprendimientosAdministrativos(
    estado,
  );
}

// ============================================================
// CAMBIAR ESTADO
// ============================================================

export async function cambiarEstadoPublicacion(
  id: number,
  estadoPublicacion: EstadoPublicacionSolicitado,
): Promise<RespuestaCambioPublicacion> {
  const respuesta =
    await api.solicitar<unknown>(
      `/emprendimientos/${id}/publicacion`,
      {
        method: 'PATCH',

        body: JSON.stringify({
          estadoPublicacion,
        }),
      },
      {
        incluirAuth: true,

        incluirContentType: true,

        desempaquetarData: false,

        mensajeError:
          'No se pudo actualizar el estado del emprendimiento.',
      },
    );

  if (
    !esRespuestaCambioPublicacion(
      respuesta,
    )
  ) {
    throw new Error(
      'No se pudo actualizar el estado del emprendimiento.',
    );
  }

  return respuesta;
}

// ============================================================
// ELIMINAR
// ============================================================

export async function eliminarEmprendimiento(
  id: number,
): Promise<void> {
  await api.eliminar(
    `/emprendimientos/${id}`,
  );
}

// ============================================================
// OBTENER POR ID
// ============================================================

export async function obtenerEmprendimientoPorId(
  id: number,
): Promise<Emprendimiento> {
  return api.solicitar<Emprendimiento>(
    `/emprendimientos/${id}`,
    {
      method: 'GET',
    },
    {
      incluirAuth: true,

      desempaquetarData: false,

      mensajeError:
        'No se pudo cargar el emprendimiento',
    },
  );
}

// ============================================================
// ACTUALIZAR
// ============================================================

export async function actualizarEmprendimiento(
  id: number,
  datos:
    | FormData
    | Partial<ActualizarEmprendimientoDto>,
): Promise<Emprendimiento> {
  const esFormData =
    datos instanceof FormData;

  return api.solicitar<Emprendimiento>(
    `/emprendimientos/${id}`,
    {
      method: 'PUT',

      body: esFormData
        ? datos
        : JSON.stringify(datos),
    },
    {
      incluirAuth: true,

      incluirContentType:
        !esFormData,

      desempaquetarData: false,

      mensajeError:
        'No se pudo actualizar el emprendimiento',
    },
  );
}