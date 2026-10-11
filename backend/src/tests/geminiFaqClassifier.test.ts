import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  GoogleGenAI,
  type GoogleGenAIOptions,
} from '@google/genai';
import {
  getSafeGeminiErrorMetadata,
  GeminiFaqClassifier,
  LocalFaqClassifier,
  shouldUseLocalFaqFallback,
  type FaqId,
} from '../modulos/Chatbot/Atencion Automatica Visitantes/geminiFaqClassifier.service';

type GeminiClient = Pick<GoogleGenAI, 'models'>;
type GenerateContentRequest = Parameters<
  GeminiClient['models']['generateContent']
>[0];
type GenerateContentResponse = Awaited<
  ReturnType<GeminiClient['models']['generateContent']>
>;

const conClaveDePrueba = async <T>(ejecutar: () => Promise<T>): Promise<T> => {
  const claveAnterior = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'mock-api-key-for-unit-test';

  try {
    return await ejecutar();
  } finally {
    if (claveAnterior === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = claveAnterior;
    }
  }
};

const crearClasificadorSimulado = (
  salida: string | null,
  error?: Error | Error[],
) => {
  let opcionesCapturadas: GoogleGenAIOptions | undefined;
  let solicitudCapturada: GenerateContentRequest | undefined;
  let llamadas = 0;
  const cliente = {
    models: {
      generateContent: async (solicitud: GenerateContentRequest) => {
        llamadas++;
        solicitudCapturada = solicitud;
        if (Array.isArray(error)) {
          const errorActual = error[llamadas - 1];
          if (errorActual) throw errorActual;
        } else if (error) throw error;
        return { text: salida } as GenerateContentResponse;
      },
    },
  } as unknown as GeminiClient;

  const clasificador = new GeminiFaqClassifier((opciones) => {
    opcionesCapturadas = opciones;
    return cliente;
  });

  return {
    clasificador,
    get opciones() {
      return opcionesCapturadas;
    },
    get solicitud() {
      return solicitudCapturada;
    },
    get llamadas() {
      return llamadas;
    },
  };
};

describe('GeminiFaqClassifier con SDK simulado', () => {
  test('clasifica variaciones comunes con reglas locales y devuelve null si no hay coincidencia', async () => {
    const local = new LocalFaqClassifier();
    const ejemplos: Array<[string, FaqId]> = [
      ['¿En qué provincia está?', 'ubicacion'],
      ['¿Por dónde se va y cuánto dura la ruta?', 'como_llegar'],
      ['¿Qué ofrece la plataforma?', 'servicios'],
      ['Busco negocios y artesanías locales', 'emprendimientos'],
      ['¿Tienen talleres o charlas?', 'eventos'],
      ['Quiero apartar un cupo', 'reservas'],
      ['¿Dónde reporto la basura?', 'incidencias'],
      ['¿Cómo los contacto por teléfono?', 'contacto'],
      ['¿Hay senderos y animales?', 'informacion_parque'],
      ['¿Quiénes son los Aliados?', 'asociacion'],
      ['¿Cuál es la misión de la asociación?', 'objetivo_asociacion'],
    ];
    for (const [consulta, id] of ejemplos) assert.equal(await local.classify(consulta), id);
    assert.equal(await local.classify('¿Cuál es el horario de hoy?'), null);
  });

  test('reconoce solo 429, 503 y errores de timeout para activar el respaldo', () => {
    assert.equal(shouldUseLocalFaqFallback({ status: 429 }), true);
    assert.equal(shouldUseLocalFaqFallback({ status: 503 }), true);
    assert.equal(shouldUseLocalFaqFallback(Object.assign(new Error(), { name: 'TimeoutError' })), true);
    assert.equal(shouldUseLocalFaqFallback({ status: 401 }), false);
  });

  test('usa timeout acotado y valida una categoría permitida', async () => {
    await conClaveDePrueba(async () => {
      const sdk = crearClasificadorSimulado(
        JSON.stringify({ faqId: 'emprendimientos' satisfies FaqId }),
      );

      const resultado = await sdk.clasificador.classify(
        '¿Qué emprendimientos hay?',
      );

      assert.equal(sdk.opciones?.httpOptions?.timeout, 12_000);
      assert.equal(sdk.opciones?.httpOptions?.retryOptions?.attempts, 1);
      assert.equal(sdk.solicitud?.model, 'gemini-3.8-flash');
      assert.equal(resultado, 'emprendimientos');
    });
  });

  test('reintenta un 503 una sola vez y acepta el segundo resultado', async () => {
    await conClaveDePrueba(async () => {
      const sdk = crearClasificadorSimulado(
        '{"faqId":"eventos"}',
        [Object.assign(new Error('temporal'), { status: 503 })],
      );

      assert.equal(await sdk.clasificador.classify('consulta'), 'eventos');
      assert.equal(sdk.llamadas, 2);
    });
  });

  test('limita a dos intentos y registra de forma segura el 503 final', async () => {
    await conClaveDePrueba(async () => {
      const error503 = () => Object.assign(new Error('privado'), { name: 'ApiError', status: 503 });
      const sdk = crearClasificadorSimulado(null, [error503(), error503(), error503()]);
      const registros: unknown[][] = [];
      const consoleErrorOriginal = console.error;
      console.error = (...args: unknown[]) => registros.push(args);

      try {
        await assert.rejects(sdk.clasificador.classify('consulta'));
      } finally {
        console.error = consoleErrorOriginal;
      }

      assert.equal(sdk.llamadas, 2);
      assert.deepEqual(registros, [['Gemini API request failed', { diagnostic: 'http_error', errorType: 'ApiError', httpStatus: 503 }]]);
      assert.doesNotMatch(JSON.stringify(registros), /privado|consulta/);
    });
  });

  test('no reintenta errores que no sean 503', async () => {
    await conClaveDePrueba(async () => {
      const sdk = crearClasificadorSimulado(null, Object.assign(new Error('auth'), { status: 401 }));
      const consoleErrorOriginal = console.error;
      console.error = () => undefined;
      try {
        await assert.rejects(sdk.clasificador.classify('consulta'));
      } finally {
        console.error = consoleErrorOriginal;
      }
      assert.equal(sdk.llamadas, 1);
    });
  });

  test('convierte la categoría ninguna en falta de coincidencia', async () => {
    await conClaveDePrueba(async () => {
      const sdk = crearClasificadorSimulado('{"faqId":"ninguna"}');
      const registros: unknown[][] = [];
      const infoOriginal = console.info;
      console.info = (...args: unknown[]) => registros.push(args);

      try {
        assert.equal(await sdk.clasificador.classify('¿Cuál es el horario?'), null);
      } finally {
        console.info = infoOriginal;
      }
      assert.deepEqual(registros, [['Gemini classification diagnostic', { outcome: 'none' }]]);
    });
  });

  test('rechaza identificadores no permitidos y JSON inválido', async () => {
    await conClaveDePrueba(async () => {
      const idNoPermitido = crearClasificadorSimulado(
        '{"faqId":"respuesta_inventada"}',
      );
      const jsonInvalido = crearClasificadorSimulado('esto no es JSON');
      const registros: unknown[][] = [];
      const infoOriginal = console.info;
      console.info = (...args: unknown[]) => registros.push(args);

      try {
        assert.equal(await idNoPermitido.clasificador.classify('consulta privada'), null);
        assert.equal(await jsonInvalido.clasificador.classify('consulta privada'), null);
      } finally {
        console.info = infoOriginal;
      }
      assert.deepEqual(registros, [
        ['Gemini classification diagnostic', { outcome: 'invalid_identifier' }],
        ['Gemini classification diagnostic', { outcome: 'format_error' }],
      ]);
      assert.doesNotMatch(JSON.stringify(registros), /respuesta_inventada|consulta privada/);
    });
  });

  test('omite valores que coincidan con la clave del entorno al sanitizar errores', async () => {
    await conClaveDePrueba(async () => {
      const claveDePrueba = process.env.GEMINI_API_KEY;
      const metadata = getSafeGeminiErrorMetadata(
        Object.assign(new Error('no registrar'), {
          name: claveDePrueba,
          code: claveDePrueba,
        }),
      );

      assert.deepEqual(metadata, { errorType: 'UnknownError' });
      assert.doesNotMatch(JSON.stringify(metadata), /mock-api-key-for-unit-test/);
    });
  });

  test('propaga errores del SDK para que el servicio use su respuesta alternativa', async () => {
    await conClaveDePrueba(async () => {
      const sdk = crearClasificadorSimulado(
        null,
        Object.assign(new Error('mensaje privado con credencial'), {
          name: 'ApiError',
          status: 503,
          code: 'UNAVAILABLE',
          headers: { authorization: 'no-debe-registrarse' },
        }),
      );
      const registros: unknown[][] = [];
      const consoleErrorOriginal = console.error;
      console.error = (...args: unknown[]) => registros.push(args);

      try {
        await assert.rejects(sdk.clasificador.classify('consulta privada'));
      } finally {
        console.error = consoleErrorOriginal;
      }

      assert.deepEqual(registros, [
        [
          'Gemini API request failed',
          {
            diagnostic: 'http_error',
            errorType: 'ApiError',
            httpStatus: 503,
            errorCode: 'UNAVAILABLE',
          },
        ],
      ]);
      assert.doesNotMatch(
        JSON.stringify(registros),
        /mensaje privado|credencial|authorization|consulta privada/,
      );
    });
  });
});
