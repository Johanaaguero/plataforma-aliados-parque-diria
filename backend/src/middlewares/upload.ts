//para la foto del emprendimiento
import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
    }
  },
});