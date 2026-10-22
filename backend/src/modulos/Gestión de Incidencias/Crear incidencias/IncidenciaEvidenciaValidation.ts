import { TipoEvidenciaIncidencia } from '../../../models/IncidenciaEvidencia';

export const TAMANO_MAXIMO_EVIDENCIA_BYTES = 20 * 1024 * 1024;
export const MENSAJE_EVIDENCIA_EXCEDE_LIMITE =
  'El archivo supera el límite permitido de 20 MiB.';

export class ErrorValidacionEvidencia extends Error {
  readonly status: number;

  constructor(mensaje: string, status = 400) {
    super(mensaje);
    this.name = 'ErrorValidacionEvidencia';
    this.status = status;
  }
}

interface DatosArchivoEvidencia {
  archivo: Buffer;
  tipoMime: string;
  nombreArchivo?: string | null;
  tamanoBytes?: number | null;
  tipo: TipoEvidenciaIncidencia;
}

const formatosPermitidos: Record<
  TipoEvidenciaIncidencia,
  Record<string, { extensiones: string[]; firma: (archivo: Buffer) => boolean }>
> = {
  [TipoEvidenciaIncidencia.FOTO]: {
    'image/jpeg': {
      extensiones: ['.jpg', '.jpeg'],
      firma: (archivo) =>
        archivo.length >= 3 &&
        archivo[0] === 0xff &&
        archivo[1] === 0xd8 &&
        archivo[2] === 0xff,
    },
    'image/png': {
      extensiones: ['.png'],
      firma: (archivo) =>
        archivo.length >= 8 &&
        archivo.subarray(0, 8).equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        ),
    },
    'image/webp': {
      extensiones: ['.webp'],
      firma: (archivo) =>
        archivo.length >= 12 &&
        archivo.toString('ascii', 0, 4) === 'RIFF' &&
        archivo.toString('ascii', 8, 12) === 'WEBP',
    },
    'application/pdf': {
      extensiones: ['.pdf'],
      firma: (archivo) =>
        archivo.length >= 5 &&
        archivo.toString('ascii', 0, 5) === '%PDF-',
    },
  },
  [TipoEvidenciaIncidencia.VIDEO]: {
    'video/mp4': {
      extensiones: ['.mp4'],
      firma: (archivo) =>
        archivo.length >= 12 &&
        archivo.toString('ascii', 4, 8) === 'ftyp',
    },
    'video/webm': {
      extensiones: ['.webm'],
      firma: (archivo) =>
        archivo.length >= 4 &&
        archivo.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
    },
    'video/ogg': {
      extensiones: ['.ogv', '.ogg'],
      firma: (archivo) =>
        archivo.length >= 4 &&
        archivo.toString('ascii', 0, 4) === 'OggS',
    },
  },
};

export const validarArchivoEvidencia = (
  datos: DatosArchivoEvidencia,
): string | null => {
  if (datos.archivo.length > TAMANO_MAXIMO_EVIDENCIA_BYTES) {
    return MENSAJE_EVIDENCIA_EXCEDE_LIMITE;
  }

  const tipoMime = datos.tipoMime.trim().toLowerCase();
  const formato = formatosPermitidos[datos.tipo]?.[tipoMime];

  if (!formato) {
    return 'El tipo de archivo no está permitido para esta evidencia.';
  }

  if (datos.nombreArchivo) {
    const extension = datos.nombreArchivo
      .slice(datos.nombreArchivo.lastIndexOf('.'))
      .toLowerCase();

    if (!formato.extensiones.includes(extension)) {
      return 'La extensión del archivo no coincide con su tipo.';
    }
  }

  if (!formato.firma(datos.archivo)) {
    return 'El contenido del archivo no coincide con su tipo.';
  }

  if (
    datos.tamanoBytes !== undefined &&
    datos.tamanoBytes !== null &&
    datos.tamanoBytes !== datos.archivo.length
  ) {
    return 'El tamaño indicado no coincide con el archivo enviado.';
  }

  return null;
};

export const decodificarYValidarArchivoEvidencia = (
  datos: Omit<DatosArchivoEvidencia, 'archivo'> & { archivo: string },
): Buffer => {
  if (!datos.archivo.trim()) {
    throw new ErrorValidacionEvidencia('El archivo es obligatorio.');
  }

  let base64 = datos.archivo;
  if (base64.includes(',')) {
    const separador = base64.indexOf(',');
    const encabezado = base64.slice(0, separador);
    const tipoDeclarado = /^data:([^;,]+);base64$/i.exec(encabezado)?.[1];
    base64 = base64.slice(separador + 1);

    if (
      !tipoDeclarado ||
      tipoDeclarado.toLowerCase() !== datos.tipoMime.trim().toLowerCase()
    ) {
      throw new ErrorValidacionEvidencia('El archivo Base64 no es válido.');
    }
  }

  // Validación de Base64 sin expresiones regulares con grupos repetidos.
const longitudBase64 = base64.length;

const longitudValida = longitudBase64 % 4 === 0;

// El padding solo puede tener cero, uno o dos caracteres "=" al final.
const padding = base64.endsWith('==')
  ? 2
  : base64.endsWith('=')
    ? 1
    : 0;

const contenidoBase64 = base64.slice(0, longitudBase64 - padding);

const caracteresValidos =
  /^[A-Za-z0-9+/]*$/.test(contenidoBase64);

if (
  !longitudValida ||
  longitudBase64 === 0 ||
  !caracteresValidos
) {
  throw new ErrorValidacionEvidencia('El archivo Base64 no es válido.');
}

  const bytesEstimados =
    Math.floor((base64.length * 3) / 4) -
    (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  if (bytesEstimados > TAMANO_MAXIMO_EVIDENCIA_BYTES) {
    throw new ErrorValidacionEvidencia(
      MENSAJE_EVIDENCIA_EXCEDE_LIMITE,
      413,
    );
  }

  const archivo = Buffer.from(base64, 'base64');
  if (archivo.length === 0) {
    throw new ErrorValidacionEvidencia('El archivo no es válido.');
  }

  const errorValidacion = validarArchivoEvidencia({
    ...datos,
    archivo,
  });
  if (errorValidacion) {
    throw new ErrorValidacionEvidencia(
      errorValidacion,
      errorValidacion === MENSAJE_EVIDENCIA_EXCEDE_LIMITE ? 413 : 400,
    );
  }

  return archivo;
};
