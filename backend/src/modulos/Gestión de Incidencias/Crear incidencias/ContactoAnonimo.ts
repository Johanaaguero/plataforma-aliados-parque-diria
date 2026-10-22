import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface ContactoAnonimo {
  nombre: unknown;
  telefono: unknown;
}

export const validarContactoAnonimo = (
  contacto: ContactoAnonimo,
): string | null => {
  if (typeof contacto.nombre !== 'string' || !contacto.nombre.trim()) {
    return 'El nombre de contacto es obligatorio para un reporte anónimo.';
  }

  if (contacto.nombre.trim().length > 150) {
    return 'El nombre de contacto no puede superar 150 caracteres.';
  }

  if (
    typeof contacto.telefono !== 'string' ||
    !contacto.telefono.trim()
  ) {
    return 'El teléfono de contacto es obligatorio para un reporte anónimo.';
  }

  const telefono = contacto.telefono.trim();
  if (telefono.length > 30) {
    return 'El teléfono de contacto no puede superar 30 caracteres.';
  }

  const numero = parsePhoneNumberFromString(telefono, 'CR');
  if (!numero?.isValid() || numero.country !== 'CR') {
    return 'Ingrese un número telefónico válido de Costa Rica.';
  }

  return null;
};
