import { api } from './api';

/**
 * Estados reales utilizados por el backend.
 */
export type EstadoPublicacion =
  | 'borrador'
  | 'no_publicado'
  | 'publicado'
  | 'desactivado';

/**
 * Estados que puede recibir el endpoint PATCH.
 */
export type EstadoPublicacionSolicitado =
  | 'Borrador'
  | 'No Publicado'
  | 'Publicado'
  | 'Desactivado';

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
}

export interface Emprendimiento {
  id: number;
  nombre: string;
  descripcion?: string | null;

  /**
   * El backend devuelve la categoría como objeto en algunos casos
   * y como información pública en otros.
   */
  categoria:
    | string
    | null
    | {
        id: number;
        nombre?: string;
        descripcion?: string | null;
      };

  direccion?: string | null;

  latitud: number | string | null;
  longitud: number | string | null;

  correoElectronico: string | null;
  telefono: string | null;

  estadoPublicacion: EstadoPublicacion;

  fechaPublicacion?: string | null;

  /**
   * El backend puede devolver la imagen como string/base64
   * cuando se transforma mediante toPublic().
   */
  imagen?: string | null;

  fechaCreacion: string;
  fechaActualizacion: string;

  /**
   * Información adicional que puede venir en la respuesta interna
   * del administrador.
   */
  asociado?: {
    id: number;
    nombre?: string;
    correoElectronico?: string;
  } | null;
}

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
    esEstadoPublicacion(valor.data.estadoPublicacion) &&
    (
      typeof valor.data.fechaPublicacion === 'string' ||
      valor.data.fechaPublicacion === null
    )
  );
};

/**
 * Crea un nuevo emprendimiento.
 *
 * Soporta:
 * - JSON
 * - FormData para enviar imágenes
 *
 * El backend asigna automáticamente el asociado autenticado
 * cuando el usuario tiene rol "asociado".
 */
export async function crearEmprendimiento(
  datos: FormData | CrearEmprendimientoDto,
): Promise<Emprendimiento> {
  const esFormData = datos instanceof FormData;

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
      incluirContentType: !esFormData,
      desempaquetarData: false,
      mensajeError:
        'No se pudo registrar el emprendimiento',
    },
  );
}

/**
 * Obtiene únicamente los emprendimientos PUBLICADOS.
 *
 * Endpoint público, no necesita autenticación.
 *
 * GET /emprendimientos/catalogo
 */
export async function obtenerCatalogoPublicado(): Promise<
  Emprendimiento[]
> {
  const datos = await api.solicitar<unknown>(
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

/**
 * Obtiene los emprendimientos visibles para el usuario autenticado.
 *
 * Administrador:
 *   - ve todos.
 *
 * Asociado:
 *   - ve los propios en cualquier estado.
 *   - ve publicados de otros asociados.
 *
 * También permite filtrar por estado.
 */
export async function obtenerEmprendimientosAdministrativos(
  estado?: EstadoPublicacion,
): Promise<Emprendimiento[]> {
  const ruta = estado
    ? `/emprendimientos?estado=${encodeURIComponent(estado)}`
    : '/emprendimientos';

  const datos = await api.solicitar<unknown>(
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

/**
 * Conserva la función general existente.
 *
 * Si se solicita "publicado", utiliza el catálogo público.
 * Para cualquier otro estado consulta el endpoint autenticado.
 */
export async function obtenerEmprendimientos(
  estado?: EstadoPublicacion,
): Promise<Emprendimiento[]> {
  if (estado === 'publicado') {
    return obtenerCatalogoPublicado();
  }

  return obtenerEmprendimientosAdministrativos(estado);
}

/**
 * Cambia el estado de publicación.
 *
 * Transiciones permitidas por el backend:
 *
 * Borrador -> No Publicado
 * No Publicado -> Publicado
 * Publicado -> No Publicado
 * No Publicado -> Desactivado
 * Publicado -> Desactivado
 * Desactivado -> No Publicado
 *
 * Los permisos los valida el backend según el rol.
 */
export async function cambiarEstadoPublicacion(
  id: number,
  estadoPublicacion: EstadoPublicacionSolicitado,
): Promise<RespuestaCambioPublicacion> {
  const respuesta = await api.solicitar<unknown>(
    `/emprendimientos/${id}/publicacion`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        estadoPublicacion,
      }),
    },
    {
      incluirAuth: true,
      desempaquetarData: false,
      mensajeError:
        'No se pudo actualizar el estado del emprendimiento.',
    },
  );

  if (!esRespuestaCambioPublicacion(respuesta)) {
    throw new Error(
      'No se pudo actualizar el estado del emprendimiento.',
    );
  }

  return respuesta;
}

/**
 * Elimina un emprendimiento.
 *
 * El backend responde 204 cuando se elimina correctamente.
 */
export async function eliminarEmprendimiento(
  id: number,
): Promise<void> {
  await api.eliminar(`/emprendimientos/${id}`);
}