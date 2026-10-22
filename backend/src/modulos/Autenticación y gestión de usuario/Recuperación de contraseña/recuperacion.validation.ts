export const MENSAJE_SOLICITUD_RECUPERACION =
  'Si el correo está registrado, recibirás las instrucciones para recuperar tu contraseña.';

export const MENSAJE_TOKEN_INVALIDO =
  'El enlace de recuperación es inválido, ya fue utilizado o ha expirado.';

export function normalizarCorreo(correo: string): string {
  return correo.trim().replace(/[<>]/g, '');
}

export function validarCorreo(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

export function validarPassword(password: string): string | null {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }

  if (!/[a-z]/.test(password)) {
    return 'La contraseña debe tener al menos una letra minúscula';
  }

  if (!/[A-Z]/.test(password)) {
    return 'La contraseña debe tener al menos una letra mayúscula';
  }

  if (!/[0-9]/.test(password)) {
    return 'La contraseña debe tener al menos un número';
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password)) {
    return 'La contraseña debe tener al menos un carácter especial';
  }

  return null;
}

export function validarFormatoToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}
