import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { DataSource } from 'typeorm';
import { ComprobantePago } from '../models/ComprobantePago';
import { Reserva } from '../models/Reserva';
import {
  leerArchivoLocal,
  validarContenidoComprobante,
} from '../services/StorageService';

const tipos: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

interface OpcionesMigracion {
  dataSource: DataSource;
  directorioLegado: string;
  aplicar: boolean;
  confirmar?: boolean;
}

export async function migrarComprobantesHistoricos(
  opciones: OpcionesMigracion,
) {
  const { dataSource, aplicar, confirmar } = opciones;
  const directorio = path.resolve(opciones.directorioLegado);

  if (!dataSource.isInitialized) {
    throw new Error('La conexion de prueba no esta inicializada.');
  }

  if (aplicar && confirmar !== true) {
    throw new Error('La importacion requiere confirmacion explicita.');
  }

  const reservas = await dataSource
    .getRepository(Reserva)
    .createQueryBuilder('r')
    .where('r.comprobanteUrl IS NOT NULL')
    .getMany();

  const repo = dataSource.getRepository(ComprobantePago);
  const resultado = {
    existentes: 0,
    migrados: 0,
    simulados: 0,
    incidencias: 0,
  };

  for (const reserva of reservas) {
    try {
      if (await repo.existsBy({ reservaId: reserva.id })) {
        resultado.existentes++;
        continue;
      }

      const nombre = path.basename(reserva.comprobanteUrl!);
      const archivo = path.resolve(directorio, nombre);

      if (!archivo.startsWith(`${directorio}${path.sep}`)) {
        throw new Error('Ruta de archivo invalida.');
      }

      const mime = tipos[path.extname(archivo).toLowerCase()];
      if (!mime) throw new Error('Extension no admitida.');

      const contenido = await leerArchivoLocal(archivo);
      validarContenidoComprobante(contenido, mime);

      const info = await stat(archivo);
      if (info.size !== contenido.length) {
        throw new Error('El tamano del archivo no coincide.');
      }

      const sha256 = createHash('sha256')
        .update(contenido)
        .digest('hex');

      if (!aplicar) {
        resultado.simulados++;
        console.log(
          `SIMULACION reserva=${reserva.id} bytes=${info.size} sha256=${sha256}`,
        );
        continue;
      }

      await repo.save(
        repo.create({
          reservaId: reserva.id,
          usuarioId: reserva.usuarioId,
          storageKey: null,
          contenido,
          originalFilename: nombre,
          contentType: mime,
          sizeBytes: info.size,
          sha256,
          storageProvider: 'mysql',
        }),
      );

      const guardado = await repo.findOneByOrFail({
        reservaId: reserva.id,
      });

      if (
        !guardado.contenido ||
        guardado.sizeBytes !== info.size ||
        guardado.sha256 !== sha256 ||
        !Buffer.from(guardado.contenido).equals(contenido)
      ) {
        throw new Error('No coincide el archivo guardado en MySQL.');
      }

      resultado.migrados++;
    } catch (error) {
      resultado.incidencias++;
      console.error(
        `Reserva ${reserva.id}:`,
        error instanceof Error ? error.message : 'Error desconocido',
      );
    }
  }

  console.log(
    `Resultado: existentes=${resultado.existentes}, ` +
      `migrados=${resultado.migrados}, simulados=${resultado.simulados}, ` +
      `incidencias=${resultado.incidencias}. ` +
      'No se eliminaron archivos locales.',
  );

  return resultado;
}

async function main(): Promise<void> {
  const aplicar = process.argv.includes('--apply');
  const confirmar = process.env.MIGRAR_COMPROBANTES_CONFIRMO === 'si';

  if (aplicar && !confirmar) {
    throw new Error(
      'Para importar se requiere --apply y MIGRAR_COMPROBANTES_CONFIRMO=si.',
    );
  }

  // Cargar la conexion solo cuando se ejecuta el comando normal.
  const { AppDataSource } = await import('../data-source');

  try {
    await AppDataSource.initialize();

    await migrarComprobantesHistoricos({
      dataSource: AppDataSource,
      directorioLegado:
        process.env.COMPROBANTES_LEGACY_DIR ??
        path.join(process.cwd(), 'uploads', 'comprobantes'),
      aplicar,
      confirmar,
    });
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}