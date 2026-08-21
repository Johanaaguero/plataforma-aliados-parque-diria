import { api } from './api';

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
  descripcion?: string;
  categoria: string | null;
  direccion?: string;
  latitud: number;
  longitud: number;
  correoElectronico: string;
  telefono: string;
  estadoPublicacion: string;
  imagen?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

const BASE_URL = 'http://localhost:3000/api/emprendimientos';

/**
 * Crea un nuevo emprendimiento.
 * Soporta tanto un objeto DTO (JSON) como un objeto FormData (multipart/form-data).
 */
export async function crearEmprendimiento(
  datos: FormData | CrearEmprendimientoDto
): Promise<Emprendimiento> {
  const esFormData = datos instanceof FormData;

  const res = await fetch(BASE_URL, {
    method: 'POST',
    // Si se envía FormData, el navegador asigna 'multipart/form-data' con el boundary automáticamente.
    headers: esFormData
      ? {}
      : {
          'Content-Type': 'application/json',
        },
    body: esFormData ? datos : JSON.stringify(datos),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);

    throw new Error(
      errorData?.mensaje || 'No se pudo registrar el emprendimiento'
    );
  }

  return res.json();
}

/**
 * Obtiene los emprendimientos.
 *
 * Si se envía un estado, el backend devuelve únicamente
 * los emprendimientos con ese estado.
 */
export async function obtenerEmprendimientos(
  estado?: string
): Promise<Emprendimiento[]> {
  const url = estado
    ? `${BASE_URL}?estado=${encodeURIComponent(estado)}`
    : BASE_URL;

  const res = await fetch(url);

  if (!res.ok) {
    const data = await res.json().catch(() => null);

    throw new Error(
      data?.mensaje || 'No se pudieron cargar los emprendimientos'
    );
  }

  return res.json();
  
}

  //Elimina un emprendimiento por su ID.
 
  export async function eliminarEmprendimiento(id: number): Promise<void> {
    await api.eliminar(`/emprendimientos/${id}`);
}