import { Request, Response, NextFunction } from 'express';
import { registerUser } from './autenticacion.service';

function validarPassword(password: string): string | null {
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

function validarTelefono(telefono: string): boolean {
  return /^\d{8}$/.test(telefono.trim());
}

function validarNombreUsuario(nombreUsuario: string): string | null {
  const limpio = nombreUsuario.trim();

  if (limpio.length < 3) {
    return 'El nombre de usuario debe tener al menos 3 caracteres';
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(limpio)) {
    return 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos';
  }

  return null;
}


function sanitizarTexto(texto: string): string {
  return texto
    .trim()
    .replace(/[<>]/g, '');
}

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      nombreUsuario,
      nombre,
      apellidos,
      correo,
      telefono,
      password,
    } = req.body;

    // 1. Validar que no falten campos obligatorios
    if (
      !nombreUsuario?.trim() ||
      !nombre?.trim() ||
      !apellidos?.trim() ||
      !correo?.trim() ||
      !telefono?.trim() ||
      !password?.trim()
    ) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan campos requeridos',
      });
    }

    // 2. Validar formato del nombre de usuario
    const errorNombreUsuario = validarNombreUsuario(nombreUsuario);

    if (errorNombreUsuario) {
      return res.status(400).json({
        ok: false,
        message: errorNombreUsuario,
      });
    }

    // 3. Validar correo
    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

    if (!correoValido) {
      return res.status(400).json({
        ok: false,
        message: 'El correo no tiene un formato válido',
      });
    }

    // 4. Validar teléfono
    if (!validarTelefono(telefono)) {
      return res.status(400).json({
        ok: false,
        message: 'El teléfono debe contener exactamente 8 dígitos',
      });
    }

    // 5. Validar contraseña
    const errorPassword = validarPassword(password);

    if (errorPassword) {
      return res.status(400).json({
        ok: false,
        message: errorPassword,
      });
    }

   
    const datosSanitizados = {
      nombreUsuario: sanitizarTexto(nombreUsuario),
      nombre: sanitizarTexto(nombre),
      apellidos: sanitizarTexto(apellidos),
      correo: sanitizarTexto(correo),
      telefono: sanitizarTexto(telefono),
      password,
    };

    // 6. Enviar datos al servicio
    // El servicio asignará automáticamente el rol "visitante"
    const resultado = await registerUser(datosSanitizados);

    if (!resultado.ok) {
      return res.status(409).json(resultado);
    }

    return res.status(201).json(resultado);
  } catch (error) {
    // El error pasa al middleware 
    next(error);
  }
};