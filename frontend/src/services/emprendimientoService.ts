import { api } from './api';

export type EstadoPublicacion = 'publicado' | 'no_publicado';

export type EstadoPublicacionSolicitado =
  | 'Publicado'
  | 'No Publicado';

export interface CrearEmprendimientoDto {
  nombre: string;
  descripcion?: string;
  categoriaId: number;
  direccion?: string;
  latitud: number;
  longitud: number;
  correoElectronico: string;
  telefono: string;
  imagen?: File | string;
}

export interface Emprendimiento {
  id: number;
  nombre: string;
  descripcion?: string | null;
  categoria: string | null;
  direccion?: string | null;
  latitud: number | string;
  longitud: number | string;
  correoElectronico: string;
  telefono: string;
  estadoPublicacion: EstadoPublicacion;
  fechaPublicacion?: string | null;
  imagen?: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
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

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const esEstadoPublicacion = (
  valor: unknown,
): valor is EstadoPublicacion =>
  valor === 'publicado' || valor === 'no_publicado';

const esRespuestaCambioPublicacion = (
  valor: unknown,
): valor is RespuestaCambioPublicacion => {
  if (!esObjeto(valor) || valor.ok !== true || !esObjeto(valor.data)) {
    return false;
  }

  return (
    typeof valor.message === 'string' &&
    typeof valor.data.id === 'number' &&
    typeof valor.data.nombre === 'string' &&
    esEstadoPublicacion(valor.data.estadoPublicacion) &&
    (typeof valor.data.fechaPublicacion === 'string' ||
      valor.data.fechaPublicacion === null)
  );
};

/**
 * Crea un nuevo emprendimiento.
 * Soporta tanto un objeto DTO (JSON) como un objeto FormData (multipart/form-data).
 */
export async function crearEmprendimiento(
  datos: FormData | CrearEmprendimientoDto,
): Promise<Emprendimiento> {
  const esFormData = datos instanceof FormData;

  return api.solicitar<Emprendimiento>(
    '/emprendimientos',
    {
      method: 'POST',
      body: esFormData ? datos : JSON.stringify(datos),
    },
    {
      incluirAuth: false,
      incluirContentType: !esFormData,
      desempaquetarData: false,
      mensajeError: 'No se pudo registrar el emprendimiento',
    },
  );
}

export async function obtenerCatalogoPublicado(): Promise<
  Emprendimiento[]
> {
  const datos = await api.solicitar<unknown>(
    '/emprendimientos/catalogo',
    { method: 'GET' },
    {
      incluirAuth: false,
      desempaquetarData: false,
      mensajeError:
        'No se pudieron cargar los emprendimientos publicados',
    },
  );

  if (!Array.isArray(datos)) {
    throw new Error('No se pudieron cargar los emprendimientos publicados');
  }

  return datos as Emprendimiento[];
}

export async function obtenerEmprendimientosAdministrativos(
  estado?: EstadoPublicacion,
): Promise<Emprendimiento[]> {
  const ruta = estado
    ? `/emprendimientos?estado=${encodeURIComponent(estado)}`
    : '/emprendimientos';
  const datos = await api.solicitar<unknown>(
    ruta,
    { method: 'GET' },
    {
      incluirAuth: true,
      desempaquetarData: false,
      mensajeError: 'No se pudieron cargar los emprendimientos',
    },
  );

  if (!Array.isArray(datos)) {
    throw new Error('No se pudieron cargar los emprendimientos');
  }

  return datos as Emprendimiento[];
}

/**
 * Conserva la función existente y dirige cada consulta al endpoint seguro
 * correspondiente.
 */
export async function obtenerEmprendimientos(
  estado?: EstadoPublicacion,
): Promise<Emprendimiento[]> {
  if (estado === 'publicado') {
    return obtenerCatalogoPublicado();
  }

  return obtenerEmprendimientosAdministrativos(estado);
}

export async function cambiarEstadoPublicacion(
  id: number,
  estadoPublicacion: EstadoPublicacionSolicitado,
): Promise<RespuestaCambioPublicacion> {
  const respuesta = await api.solicitar<unknown>(
    `/emprendimientos/${id}/publicacion`,
    {
      method: 'PATCH',
      body: JSON.stringify({ estadoPublicacion }),
    },
    {
      incluirAuth: true,
      desempaquetarData: false,
      mensajeError:
        'No se pudo actualizar el estado del emprendimiento.',
    },
  );

  if (!esRespuestaCambioPublicacion(respuesta)) {
    throw new Error('No se pudo actualizar el estado del emprendimiento.');
  }

  return respuesta;
}
