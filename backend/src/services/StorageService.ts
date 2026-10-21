import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type ArchivoAlmacenado = { key: string; provider: string; sha256: string; sizeBytes: number };
export interface StorageService {
  put(buffer: Buffer, contentType: string): Promise<ArchivoAlmacenado>;
  get(key: string): Promise<{ body: NodeJS.ReadableStream; contentType?: string }>;
  delete(key: string): Promise<void>;
}

let storageParaPruebas: StorageService | undefined;

/** Solo para pruebas aisladas; producción siempre resuelve la configuración de entorno. */
export const establecerStoragePrivadoParaPruebas = (storage?: StorageService): void => {
  storageParaPruebas = storage;
};

const prefijo = 'payment-proofs';
const claveNueva = () => `${prefijo}/${new Date().getUTCFullYear()}/${String(new Date().getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}`;
const validarClave = (key: string) => key.startsWith(`${prefijo}/`) && !key.includes('..');

class LocalPrivateStorage implements StorageService {
  private readonly root = path.resolve(process.env.PRIVATE_STORAGE_PATH ?? path.join(process.cwd(), 'private-storage'));
  async put(buffer: Buffer, _contentType: string): Promise<ArchivoAlmacenado> {
    const key = claveNueva();
    const destino = path.resolve(this.root, key);
    if (!destino.startsWith(`${this.root}${path.sep}`)) throw new Error('Clave de almacenamiento inválida.');
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, buffer, { flag: 'wx' });
    return { key, provider: 'local', sizeBytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') };
  }
  async get(key: string) {
    if (!validarClave(key)) throw new Error('Clave de almacenamiento inválida.');
    const archivo = path.resolve(this.root, key);
    if (!archivo.startsWith(`${this.root}${path.sep}`)) throw new Error('Clave de almacenamiento inválida.');
    return { body: createReadStream(archivo) };
  }
  async delete(key: string): Promise<void> {
    if (!validarClave(key)) return;
    const archivo = path.resolve(this.root, key);
    if (archivo.startsWith(`${this.root}${path.sep}`)) await unlink(archivo).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
  }
}

export const obtenerStoragePrivado = (): StorageService => {
  if (storageParaPruebas) return storageParaPruebas;
  const proveedor = process.env.PRIVATE_STORAGE_PROVIDER ?? (process.env.NODE_ENV === 'production' ? 's3' : 'local');
  if (proveedor === 'local') return new LocalPrivateStorage();
  throw new Error(`Proveedor de almacenamiento no soportado: ${proveedor}. Los comprobantes nuevos se guardan en MySQL.`);
};

export const validarContenidoComprobante = (buffer: Buffer, mime: string): void => {
  const firma = buffer.subarray(0, 12);
  const valido = (mime === 'application/pdf' && firma.subarray(0, 5).toString() === '%PDF-')
    || (mime === 'image/png' && firma.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    || (mime === 'image/jpeg' && firma.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
    || (mime === 'image/webp' && firma.subarray(0, 4).toString() === 'RIFF' && firma.subarray(8, 12).toString() === 'WEBP');
  if (!valido) throw new Error('El contenido del comprobante no coincide con su tipo declarado.');
};

export const leerArchivoLocal = async (archivo: string) => readFile(archivo);
