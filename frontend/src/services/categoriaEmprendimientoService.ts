export interface CategoriaEmprendimiento {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface CrearCategoriaDto {
  nombre: string;
  descripcion?: string;
}

const BASE_URL = 'http://localhost:3000/api/categorias-emprendimientos';

export async function obtenerCategorias(): Promise<CategoriaEmprendimiento[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error('No se pudieron cargar las categorías');
  return res.json();
}

export async function crearCategoria(dto: CrearCategoriaDto): Promise<CategoriaEmprendimiento> {
  const token = sessionStorage.getItem('token') ?? localStorage.getItem('token');
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.mensaje || 'No se pudo crear la categoría');
  }
  return res.json();
}
