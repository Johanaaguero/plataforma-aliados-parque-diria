import { api } from './api';

export interface PerfilUsuario {
  id: number;
  nombreUsuario: string;
  nombre: string;
  apellidos: string;
  correo: string;
  correoVerificado: boolean;
  correoPendiente: string | null;
  telefono: string;
  telefonoVerificado: boolean;
  tieneFotoPerfil: boolean;
  fechaCreacion: string;
}

interface RespuestaPerfil {
  ok: boolean;
  data: PerfilUsuario;
}

export async function obtenerMiPerfil(): Promise<PerfilUsuario> {
  const respuesta = await api.solicitar<RespuestaPerfil>(
    '/users/profile',
    { method: 'GET' },
    { desempaquetarData: false },
  );
  return respuesta.data;
}

export async function actualizarMiPerfil(
  datos: Pick<PerfilUsuario, 'nombre' | 'apellidos' | 'telefono'>,
): Promise<PerfilUsuario> {
  const respuesta = await api.solicitar<RespuestaPerfil>(
    '/users/profile',
    { method: 'PATCH', body: JSON.stringify(datos) },
    { desempaquetarData: false },
  );
  return respuesta.data;
}

export async function solicitarCambioCorreo(
  correo: string,
  contrasenaActual: string,
): Promise<string> {
  const respuesta = await api.solicitar<{ message: string }>(
    '/users/profile/email',
    {
      method: 'POST',
      body: JSON.stringify({ correo, contrasenaActual }),
    },
    {
      desempaquetarData: false,
      notificarErrorAuth: false,
    },
  );
  return respuesta.message;
}

export async function confirmarCambioCorreo(token: string): Promise<string> {
  const respuesta = await api.solicitar<{ message: string }>(
    '/users/profile/email/confirm',
    {
      method: 'POST',
      body: JSON.stringify({ token }),
    },
    {
      incluirAuth: false,
      desempaquetarData: false,
    },
  );
  return respuesta.message;
}

export async function cambiarContrasena(
  contrasenaActual: string,
  contrasenaNueva: string,
  confirmacion: string,
): Promise<string> {
  const respuesta = await api.solicitar<{ message: string }>(
    '/users/profile/password',
    {
      method: 'PUT',
      body: JSON.stringify({
        contrasenaActual,
        contrasenaNueva,
        confirmacion,
      }),
    },
    {
      desempaquetarData: false,
      notificarErrorAuth: false,
    },
  );
  return respuesta.message;
}

export async function obtenerFotoPerfil(): Promise<Blob> {
  return api.solicitarBlob(
    '/users/profile/photo',
    { method: 'GET' },
    'No se pudo cargar la foto del perfil.',
  );
}

export async function guardarFotoPerfil(foto: File): Promise<void> {
  const datos = new FormData();
  datos.append('foto', foto);
  await api.solicitar(
    '/users/profile/photo',
    { method: 'POST', body: datos },
    {
      incluirContentType: false,
      desempaquetarData: false,
    },
  );
}

export async function eliminarFotoPerfil(): Promise<void> {
  await api.solicitar(
    '/users/profile/photo',
    { method: 'DELETE' },
    { desempaquetarData: false },
  );
}
