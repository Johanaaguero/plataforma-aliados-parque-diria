import assert from 'node:assert/strict';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';
import type { Repository } from 'typeorm';
import type { FaqId } from '../modulos/Chatbot/Atencion Automatica Visitantes/geminiFaqClassifier.service';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

// These unit tests inject a repository and a classifier; they do not call MySQL or Gemini.
process.env.DB_HOST ??= '127.0.0.1';
process.env.DB_PORT ??= '3306';
process.env.DB_USERNAME ??= 'chatbot_test';
process.env.DB_PASSWORD ??= 'chatbot_test';
process.env.DB_DATABASE ??= 'chatbot_test';

type Conversacion = InstanceType<
  typeof import('../models/ConversacionChatbot').ConversacionChatbot
>;

const crearServicio = async (
  classify: (message: string) => Promise<FaqId | null> = async () => null,
) => {
  const { ChatbotService } = await import(
    '../modulos/Chatbot/Atencion Automatica Visitantes/chatbot.service'
  );
  const guardadas: Array<Record<string, unknown>> = [];
  const repositorio = {
    create: (datos: Partial<Conversacion>) => datos,
    save: async (datos: Partial<Conversacion>) => {
      Object.assign(datos, { id: guardadas.length + 1 });
      guardadas.push(datos as Record<string, unknown>);
      return datos;
    },
  } as Repository<Conversacion>;

  return { servicio: new ChatbotService(repositorio, { classify }), guardadas };
};

describe('ChatbotService: intenciones estáticas y persistencia', () => {
  const categorias: Array<{
    id: FaqId;
    consulta: string;
    respuestaIncluye: RegExp;
  }> = [
    { id: 'ubicacion', consulta: '¿En qué provincia queda?', respuestaIncluye: /Guanacaste/ },
    { id: 'servicios', consulta: '¿Qué opciones ofrece el sistema?', respuestaIncluye: /publicación de eventos/ },
    { id: 'emprendimientos', consulta: '¿Dónde veo los negocios locales?', respuestaIncluye: /dar visibilidad/ },
    { id: 'eventos', consulta: '¿Hay talleres o actividades?', respuestaIncluye: /publicar eventos/ },
    { id: 'reservas', consulta: '¿Puedo apartar una actividad?', respuestaIncluye: /realizar reservas/ },
    { id: 'incidencias', consulta: 'Quiero reportar un problema ambiental', respuestaIncluye: /reportar incidencias/ },
    { id: 'contacto', consulta: '¿Cómo los localizo?', respuestaIncluye: /\+506 8722 3373/ },
    { id: 'informacion_parque', consulta: 'Cuéntame sobre la fauna del parque', respuestaIncluye: /silvestre protegida/ },
    { id: 'asociacion', consulta: '¿Quiénes son ustedes?', respuestaIncluye: /organización ubicada/ },
    { id: 'objetivo_asociacion', consulta: '¿Cuál es la labor de la Asociación?', respuestaIncluye: /apoyar la gestión/ },
    { id: 'como_llegar', consulta: '¿Cuál camino tomo para llegar?', respuestaIncluye: /mapa disponible/ },
  ];

  for (const categoria of categorias) {
    test(`responde con el texto aprobado para ${categoria.id}`, async () => {
      const consultasClasificadas: string[] = [];
      const { servicio, guardadas } = await crearServicio(async (message) => {
        consultasClasificadas.push(message);
        return categoria.id;
      });

      const resultado = await servicio.procesarPregunta(categoria.consulta, 42);

      assert.match(resultado.respuesta, categoria.respuestaIncluye);
      assert.deepEqual(consultasClasificadas, [categoria.consulta]);
      assert.equal(resultado.estado, 'RESUELTA');
      assert.equal(resultado.conversacionId, 1);
      assert.equal(guardadas.length, 1);
      assert.equal(guardadas[0]?.mensajeUsuario, categoria.consulta);
      assert.equal(guardadas[0]?.respuestaChatbot, resultado.respuesta);
      assert.equal((guardadas[0]?.usuario as { id: number }).id, 42);
    });
  }

  test('mantiene la respuesta alternativa cuando no hay categoría', async () => {
    const { servicio, guardadas } = await crearServicio(async () => null);

    const resultado = await servicio.procesarPregunta('¿Cuál es el horario?');

    assert.match(resultado.respuesta, /No encontré/);
    assert.equal(guardadas.length, 1);
    assert.equal(guardadas[0]?.respuestaChatbot, resultado.respuesta);
  });

  test('usa el clasificador local cuando Gemini alcanza la cuota', async () => {
    let llamadasGemini = 0;
    const { servicio } = await crearServicio(async () => {
      llamadasGemini++;
      throw Object.assign(new Error('consulta privada y credencial'), {
        name: 'ApiError',
        status: 429,
        code: 'RESOURCE_EXHAUSTED',
        headers: { authorization: 'no-debe-registrarse' },
      });
    });

    const registros: unknown[][] = [];
    const consoleWarnOriginal = console.warn;
    console.warn = (...args: unknown[]) => registros.push(args);

    let resultado: Awaited<ReturnType<typeof servicio.procesarPregunta>>;
    try {
      resultado = await servicio.procesarPregunta(
        '¿Qué emprendimientos hay en el parque?',
      );
    } finally {
      console.warn = consoleWarnOriginal;
    }

    assert.match(resultado.respuesta, /dar visibilidad/);
    assert.equal(llamadasGemini, 1);
    assert.doesNotMatch(resultado.respuesta, /detalle privado/);
    assert.deepEqual(registros, [
      [
        'Falló Gemini; se intenta la clasificación FAQ local.',
        {
          errorType: 'ApiError',
          httpStatus: 429,
          errorCode: 'RESOURCE_EXHAUSTED',
        },
      ],
    ]);
    assert.doesNotMatch(JSON.stringify(registros), /credencial|authorization|privada/);
  });

  test('usa FAQ local ante 503 para una pregunta de ubicacion', async () => {
    let llamadasGemini = 0;
    const { servicio } = await crearServicio(async () => {
      llamadasGemini++;
      throw Object.assign(new Error('unavailable'), { status: 503 });
    });
    const original = console.warn;
    console.warn = () => undefined;
    try {
      const respuesta = await servicio.procesarPregunta(
        'Donde esta ubicado el Parque Nacional Diria?',
      );
      assert.match(respuesta.respuesta, /Guanacaste/);
      assert.equal(llamadasGemini, 1);
    } finally {
      console.warn = original;
    }
  });

  test('usa FAQ local ante timeout y devuelve una respuesta valida', async () => {
    let llamadasGemini = 0;
    const { servicio } = await crearServicio(async () => {
      llamadasGemini++;
      throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    });
    const original = console.warn;
    console.warn = () => undefined;
    try {
      const respuesta = await servicio.procesarPregunta('Que animales hay en el parque?');
      assert.match(respuesta.respuesta, /silvestre protegida/);
      assert.equal(llamadasGemini, 1);
    } finally {
      console.warn = original;
    }
  });

  test('devuelve respuesta general si Gemini falla y la pregunta no se reconoce localmente', async () => {
    let llamadasGemini = 0;
    const { servicio } = await crearServicio(async () => {
      llamadasGemini++;
      throw Object.assign(new Error('rate limited'), { status: 429 });
    });
    const original = console.warn;
    console.warn = () => undefined;
    try {
      const respuesta = await servicio.procesarPregunta('Cual es el horario de hoy?');
      assert.match(respuesta.respuesta, /No encontr/);
      assert.equal(llamadasGemini, 1);
    } finally {
      console.warn = original;
    }
  });

  test('conserva saludos y despedidas como respuestas deterministas', async () => {
    let llamadasClasificador = 0;
    const { servicio } = await crearServicio(async () => {
      llamadasClasificador++;
      return null;
    });

    const saludo = await servicio.procesarPregunta('¡BUENOS DÍAS!');
    const despedida = await servicio.procesarPregunta('Adiós');

    assert.match(saludo.respuesta, /¡Hola!/);
    assert.match(despedida.respuesta, /Con mucho gusto/);
    assert.equal(llamadasClasificador, 0);
  });

  test('deriva al administrador sin llamar a Gemini y conserva WhatsApp', async () => {
    let llamadasClasificador = 0;
    const { servicio, guardadas } = await crearServicio(async () => {
      llamadasClasificador++;
      return null;
    });

    const resultado = await servicio.procesarPregunta(
      'Quiero hablar con una persona administradora',
    );

    assert.equal(resultado.estado, 'DERIVADA_ADMIN');
    assert.match(resultado.respuesta, /WhatsApp/);
    assert.equal(guardadas[0]?.estado, 'DERIVADA_ADMIN');
    assert.equal(llamadasClasificador, 0);
    assert.match(
      servicio.generarEnlaceWhatsApp('consulta anterior').url,
      /^https:\/\/wa\.me\//,
    );
  });
});
