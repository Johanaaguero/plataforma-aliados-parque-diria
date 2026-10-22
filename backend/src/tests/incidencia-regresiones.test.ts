import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { TipoEvidenciaIncidencia } from '../models/IncidenciaEvidencia';
import {
  TAMANO_MAXIMO_EVIDENCIA_BYTES,
  MENSAJE_EVIDENCIA_EXCEDE_LIMITE,
  decodificarYValidarArchivoEvidencia,
  validarArchivoEvidencia,
} from '../modulos/Gestión de Incidencias/Crear incidencias/IncidenciaEvidenciaValidation';
import { validarContactoAnonimo } from '../modulos/Gestión de Incidencias/Crear incidencias/ContactoAnonimo';
import {
  ejecutarConBloqueoCodigoIncidencia,
  type ConexionBloqueoCodigo,
} from '../modulos/Gestión de Incidencias/Crear incidencias/IncidenciaCodeLock';

describe('validación de evidencia de incidencia', () => {
  const pngValido = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  test('acepta imágenes PNG válidas dentro del límite', () => {
    assert.equal(
      validarArchivoEvidencia({
        archivo: pngValido,
        tipoMime: 'image/png',
        nombreArchivo: 'evidencia.png',
        tamanoBytes: pngValido.length,
        tipo: TipoEvidenciaIncidencia.FOTO,
      }),
      null,
    );
  });

  test('rechaza archivos por encima del límite permitido', () => {
    assert.equal(
      validarArchivoEvidencia({
        archivo: Buffer.alloc(TAMANO_MAXIMO_EVIDENCIA_BYTES + 1),
        tipoMime: 'image/png',
        nombreArchivo: 'evidencia.png',
        tipo: TipoEvidenciaIncidencia.FOTO,
      }),
      MENSAJE_EVIDENCIA_EXCEDE_LIMITE,
    );
  });

  test('rechaza extensiones y contenido que no coinciden con el MIME', () => {
    assert.equal(
      validarArchivoEvidencia({
        archivo: pngValido,
        tipoMime: 'image/png',
        nombreArchivo: 'evidencia.jpg',
        tipo: TipoEvidenciaIncidencia.FOTO,
      }),
      'La extensión del archivo no coincide con su tipo.',
    );
    assert.equal(
      validarArchivoEvidencia({
        archivo: Buffer.from('not-an-image'),
        tipoMime: 'image/png',
        nombreArchivo: 'evidencia.png',
        tipo: TipoEvidenciaIncidencia.FOTO,
      }),
      'El contenido del archivo no coincide con su tipo.',
    );
  });

  test('decodifica el Data URL y valida que su MIME coincida con el contenido', () => {
    const dataUrl = `data:image/png;base64,${pngValido.toString('base64')}`;
    assert.deepEqual(
      decodificarYValidarArchivoEvidencia({
        archivo: dataUrl,
        tipoMime: 'image/png',
        nombreArchivo: 'evidencia.png',
        tamanoBytes: pngValido.length,
        tipo: TipoEvidenciaIncidencia.FOTO,
      }),
      pngValido,
    );

    assert.throws(
      () =>
        decodificarYValidarArchivoEvidencia({
          archivo: dataUrl,
          tipoMime: 'image/jpeg',
          nombreArchivo: 'evidencia.png',
          tamanoBytes: pngValido.length,
          tipo: TipoEvidenciaIncidencia.FOTO,
        }),
      /archivo Base64 no es válido/,
    );
  });
});

describe('validación del contacto anónimo', () => {
  test('rechaza nombre vacío, teléfono vacío y datos solo con espacios', () => {
    for (const contacto of [
      { nombre: '', telefono: '+50688887777' },
      { nombre: '   ', telefono: '+50688887777' },
      { nombre: 'Persona QA', telefono: '' },
      { nombre: 'Persona QA', telefono: '   ' },
    ]) {
      assert.notEqual(validarContactoAnonimo(contacto), null);
    }
  });

  test('acepta un número válido de Costa Rica', () => {
    assert.equal(
      validarContactoAnonimo({
        nombre: 'Persona QA',
        telefono: '+506 8888 7777',
      }),
      null,
    );
  });
});

describe('serialización de códigos de incidencia concurrentes', () => {
  test('serializa solicitudes concurrentes y produce códigos únicos', async () => {
    let bloqueoOcupado = false;
    const cola: Array<() => void> = [];
    const codigosGuardados: string[] = [];

    const crearConexion = (): ConexionBloqueoCodigo<undefined> => ({
      manager: undefined,
      async connect() {},
      async query<T>(sql: string): Promise<T> {
        if (sql.includes('GET_LOCK')) {
          if (bloqueoOcupado) {
            await new Promise<void>((resolve) => cola.push(resolve));
          }
          bloqueoOcupado = true;
          return [{ bloqueo_adquirido: 1 }] as T;
        }
        bloqueoOcupado = false;
        cola.shift()?.();
        return [{ bloqueo_liberado: 1 }] as T;
      },
      async release() {},
    });

    const crearBajoBloqueo = () =>
      ejecutarConBloqueoCodigoIncidencia(
        crearConexion,
        async () => {
          const secuencia =
            codigosGuardados.length + 1;
          await new Promise((resolve) => setTimeout(resolve, 5));
          const codigo = `#INC-${String(secuencia).padStart(4, '0')}1026`;
          codigosGuardados.push(codigo);
          return codigo;
        },
      );

    const codigos = await Promise.all([
      crearBajoBloqueo(),
      crearBajoBloqueo(),
      crearBajoBloqueo(),
    ]);

    assert.equal(new Set(codigos).size, 3);
    assert.deepEqual(
      [...codigos].sort(),
      [...codigosGuardados].sort(),
    );
  });

  test('libera la conexión cuando falla la operación protegida', async () => {
    let bloqueoOcupado = false;
    let conexionLiberada = false;
    const conexion: ConexionBloqueoCodigo<undefined> = {
      manager: undefined,
      async connect() {},
      async query<T>(sql: string): Promise<T> {
        if (sql.includes('GET_LOCK')) {
          bloqueoOcupado = true;
          return [{ bloqueo_adquirido: 1 }] as T;
        }
        bloqueoOcupado = false;
        return [{ bloqueo_liberado: 1 }] as T;
      },
      async release() {
        conexionLiberada = true;
      },
    };

    await assert.rejects(
      ejecutarConBloqueoCodigoIncidencia(
        () => conexion,
        async () => {
          throw new Error('fallo de guardado simulado');
        },
      ),
      /fallo de guardado simulado/,
    );

    assert.equal(bloqueoOcupado, false);
    assert.equal(conexionLiberada, true);
  });

  test('no ejecuta la creación si no puede adquirir el bloqueo', async () => {
    let conexionLiberada = false;
    let operacionEjecutada = false;
    const conexion: ConexionBloqueoCodigo<undefined> = {
      manager: undefined,
      async connect() {},
      async query<T>(): Promise<T> {
        return [{ bloqueo_adquirido: 0 }] as T;
      },
      async release() {
        conexionLiberada = true;
      },
    };

    await assert.rejects(
      ejecutarConBloqueoCodigoIncidencia(
        () => conexion,
        async () => {
          operacionEjecutada = true;
          return 'no debe ejecutarse';
        },
      ),
      /No fue posible reservar un código de incidencia/,
    );

    assert.equal(operacionEjecutada, false);
    assert.equal(conexionLiberada, true);
  });
});
