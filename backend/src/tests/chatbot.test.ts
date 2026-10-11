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
  deps: Record<string, unknown> = {},
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

  const dependencias = {
    emprendimientos: {
      obtenerCatalogoPublico: async () => [],
    },
    eventos: {
      listar: async () => ({
        data: [],
        paginacion: { pagina: 1, totalPaginas: 0 },
      }),
    },
    obtenerFechaActual: () => new Date('2099-01-01T00:00:00.000Z'),
    ...deps,
  };

  return {
    servicio: new ChatbotService(repositorio, { classify }, dependencias as any),
    guardadas,
  };
};

describe('ChatbotService: intenciones estáticas y persistencia', () => {
  const categorias: Array<{
    id: FaqId;
    consulta: string;
    respuestaIncluye: RegExp;
  }> = [
    { id: 'ubicacion', consulta: '¿En qué provincia queda?', respuestaIncluye: /Guanacaste/ },
    { id: 'servicios', consulta: '¿Qué opciones ofrece el sistema?', respuestaIncluye: /publicación de eventos/ },
    { id: 'reservas', consulta: '¿Puedo apartar una actividad?', respuestaIncluye: /no hay actividades proximas/i },
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

  test('responde emprendimientos con datos reales del servicio reutilizado', async () => {
    const { servicio, guardadas } = await crearServicio(
      async () => 'emprendimientos',
      {
        emprendimientos: {
          obtenerCatalogoPublico: async () => [
            {
              toPublic: () => ({
                nombre: 'Cafeteria Diria',
                descripcion: 'Cafe y productos locales preparados por la comunidad.',
                distrito: 'Arado',
                canton: 'Santa Cruz',
                provincia: 'Guanacaste',
                direccion: 'Entrada principal',
                telefono: '+50681112222',
              }),
            },
          ],
        },
      },
    );

    const resultado = await servicio.procesarPregunta('Que emprendimientos hay?');

    assert.match(resultado.respuesta, /Cafeteria Diria/);
    assert.match(resultado.respuesta, /Arado, Santa Cruz, Guanacaste/);
    assert.match(resultado.respuesta, /\+50681112222/);
    assert.equal(guardadas[0]?.respuestaChatbot, resultado.respuesta);
  });

  test('responde mensaje especifico cuando no hay emprendimientos publicados', async () => {
    const { servicio } = await crearServicio(async () => 'emprendimientos');

    const resultado = await servicio.procesarPregunta('Negocios locales');

    assert.match(resultado.respuesta, /no hay emprendimientos publicados/i);
  });

  test('responde eventos proximos publicados y omite eventos pasados', async () => {
    const paginasConsultadas: number[] = [];
    const { servicio } = await crearServicio(
      async () => 'eventos',
      {
        obtenerFechaActual: () => new Date('2099-01-10T00:00:00.000Z'),
        eventos: {
          listar: async ({ pagina = 1 }: { pagina?: number } = {}) => {
            paginasConsultadas.push(pagina);
            return {
              data: pagina === 1
                ? [
                    {
                      nombre: 'Actividad pasada',
                      descripcion: 'No debe mostrarse.',
                      fecha: '2099-01-09',
                      hora: '08:00:00',
                      lugar: 'Sendero',
                      tipoActividad: 'evento',
                      cuposDisponibles: 3,
                    },
                    {
                      nombre: 'Taller de guias',
                      descripcion: 'Capacitacion comunitaria.',
                      fecha: '2099-01-12',
                      hora: '10:00:00',
                      lugar: 'Centro de visitantes',
                      tipoActividad: 'capacitacion',
                      cuposDisponibles: 12,
                      esPago: false,
                    },
                  ]
                : [],
              paginacion: { pagina, totalPaginas: 1 },
            };
          },
        },
      },
    );

    const resultado = await servicio.procesarPregunta('Hay eventos proximos?');

    assert.match(resultado.respuesta, /Taller de guias/);
    assert.match(resultado.respuesta, /2099-01-12/);
    assert.match(resultado.respuesta, /Cupos disponibles: 12/);
    assert.doesNotMatch(resultado.respuesta, /Costo|Gratuito|precio|pago/i);
    assert.doesNotMatch(resultado.respuesta, /Actividad pasada/);
    assert.deepEqual(paginasConsultadas, [1]);
  });

  test('busca mas paginas de eventos hasta encontrar proximos', async () => {
    const paginasConsultadas: number[] = [];
    const { servicio } = await crearServicio(
      async () => 'eventos',
      {
        obtenerFechaActual: () => new Date('2099-01-10T00:00:00.000Z'),
        eventos: {
          listar: async ({ pagina = 1 }: { pagina?: number } = {}) => {
            paginasConsultadas.push(pagina);
            return {
              data: pagina === 1
                ? [{ nombre: 'Pasado', fecha: '2099-01-01' }]
                : [{ nombre: 'Feria ambiental', fecha: '2099-01-20' }],
              paginacion: { pagina, totalPaginas: 2 },
            };
          },
        },
      },
    );

    const resultado = await servicio.procesarPregunta('Actividades publicadas');

    assert.match(resultado.respuesta, /Feria ambiental/);
    assert.doesNotMatch(resultado.respuesta, /Pasado/);
    assert.deepEqual(paginasConsultadas, [1, 2]);
  });

  test('excluye actividades de hoy cuya hora ya paso', async () => {
    const { servicio } = await crearServicio(
      async () => 'eventos',
      {
        obtenerFechaActual: () => new Date('2026-10-11T16:00:00.000Z'),
        eventos: {
          listar: async () => ({
            data: [
              {
                nombre: 'Caminata vencida',
                fecha: '2026-10-11',
                hora: '09:00:00',
                tipoActividad: 'evento',
                cuposDisponibles: 10,
              },
              {
                nombre: 'Caminata futura',
                fecha: '2026-10-11',
                hora: '11:00:00',
                tipoActividad: 'evento',
                cuposDisponibles: 8,
              },
            ],
            paginacion: { pagina: 1, totalPaginas: 1 },
          }),
        },
      },
    );

    const resultado = await servicio.procesarPregunta('Hay eventos proximos?');

    assert.match(resultado.respuesta, /Caminata futura/);
    assert.doesNotMatch(resultado.respuesta, /Caminata vencida/);
  });

  test('responde mensaje especifico cuando no hay eventos proximos', async () => {
    const { servicio } = await crearServicio(async () => 'eventos');

    const resultado = await servicio.procesarPregunta('Eventos');

    assert.match(resultado.respuesta, /no hay eventos o capacitaciones proximas/i);
  });

  test('no comunica costos aunque la consulta pregunte por el costo de una actividad', async () => {
    const { servicio } = await crearServicio(
      async () => 'eventos',
      {
        obtenerFechaActual: () => new Date('2099-01-10T00:00:00.000Z'),
        eventos: {
          listar: async () => ({
            data: [
              {
                nombre: 'Caminata guiada',
                fecha: '2099-01-11',
                hora: '07:30:00',
                lugar: 'Sector Arado',
                tipoActividad: 'evento',
                cuposDisponibles: 4,
                esPago: true,
                precio: 7500,
              },
            ],
            paginacion: { pagina: 1, totalPaginas: 1 },
          }),
        },
      },
    );

    const resultado = await servicio.procesarPregunta(
      'Cuanto cuesta la caminata guiada?',
    );

    assert.match(resultado.respuesta, /Caminata guiada/);
    assert.match(resultado.respuesta, /2099-01-11/);
    assert.match(resultado.respuesta, /Cupos disponibles: 4/);
    assert.doesNotMatch(resultado.respuesta, /Costo|7500|precio|pago|Gratuito/i);
  });

  test('responde disponibilidad de actividades con cupos existentes', async () => {
    const { servicio, guardadas } = await crearServicio(
      async () => 'reservas',
      {
        obtenerFechaActual: () => new Date('2099-01-10T00:00:00.000Z'),
        eventos: {
          listar: async () => ({
            data: [
              {
                nombre: 'Caminata guiada',
                fecha: '2099-01-11',
                hora: '07:30:00',
                lugar: 'Sector Arado',
                cuposDisponibles: 4,
                esPago: true,
                precio: 5000,
              },
              {
                nombre: 'Taller lleno',
                fecha: '2099-01-12',
                cuposDisponibles: 0,
              },
            ],
            paginacion: { pagina: 1, totalPaginas: 1 },
          }),
        },
      },
    );

    const resultado = await servicio.procesarPregunta('Hay cupos disponibles?');

    assert.match(resultado.respuesta, /Caminata guiada/);
    assert.match(resultado.respuesta, /4 cupo\(s\) disponible\(s\)/);
    assert.doesNotMatch(resultado.respuesta, /Costo|5000|precio|pago/i);
    assert.doesNotMatch(resultado.respuesta, /Taller lleno/);
    assert.equal(guardadas[0]?.respuestaChatbot, resultado.respuesta);
  });

  test('mantiene actividades futuras con cupos disponibles', async () => {
    const { servicio } = await crearServicio(
      async () => 'reservas',
      {
        obtenerFechaActual: () => new Date('2026-10-11T16:00:00.000Z'),
        eventos: {
          listar: async () => ({
            data: [
              {
                nombre: 'Caminata vencida',
                fecha: '2026-10-11',
                hora: '09:00:00',
                cuposDisponibles: 6,
              },
              {
                nombre: 'Caminata con cupos',
                fecha: '2026-10-11',
                hora: '11:00:00',
                cuposDisponibles: 5,
              },
            ],
            paginacion: { pagina: 1, totalPaginas: 1 },
          }),
        },
      },
    );

    const resultado = await servicio.procesarPregunta('Hay cupos disponibles?');

    assert.match(resultado.respuesta, /Caminata con cupos/);
    assert.match(resultado.respuesta, /5 cupo\(s\) disponible\(s\)/);
    assert.doesNotMatch(resultado.respuesta, /Caminata vencida/);
  });

  test('responde ausencia cuando no hay actividades con cupos disponibles', async () => {
    const { servicio } = await crearServicio(
      async () => 'reservas',
      {
        obtenerFechaActual: () => new Date('2099-01-10T00:00:00.000Z'),
        eventos: {
          listar: async () => ({
            data: [
              {
                nombre: 'Actividad agotada',
                fecha: '2099-01-11',
                cuposDisponibles: 0,
              },
            ],
            paginacion: { pagina: 1, totalPaginas: 1 },
          }),
        },
      },
    );

    const resultado = await servicio.procesarPregunta('Disponibilidad');

    assert.match(resultado.respuesta, /no hay actividades proximas con cupos disponibles/i);
  });

  test('filtra capacitaciones cuando la consulta pide capacitaciones', async () => {
    const { servicio } = await crearServicio(
      async () => 'eventos',
      {
        obtenerFechaActual: () => new Date('2026-10-11T16:00:00.000Z'),
        eventos: {
          listar: async () => ({
            data: [
              {
                nombre: 'Caminata guiada',
                fecha: '2026-10-12',
                hora: '08:00:00',
                tipoActividad: 'evento',
                cuposDisponibles: 12,
              },
              {
                nombre: 'Capacitacion ambiental',
                fecha: '2026-10-12',
                hora: '10:00:00',
                tipoActividad: 'capacitacion',
                cuposDisponibles: 20,
                esPago: true,
              },
            ],
            paginacion: { pagina: 1, totalPaginas: 1 },
          }),
        },
      },
    );

    const resultado = await servicio.procesarPregunta(
      'Hay capacitaciones programadas proximamente?',
    );

    assert.match(resultado.respuesta, /capacitaciones proximas publicadas/i);
    assert.match(resultado.respuesta, /Capacitacion ambiental/);
    assert.doesNotMatch(resultado.respuesta, /Costo|precio|pago|consultarse/i);
    assert.doesNotMatch(resultado.respuesta, /Caminata guiada/);
  });

  test('responde mensaje especifico cuando no hay capacitaciones futuras', async () => {
    const { servicio } = await crearServicio(
      async () => 'eventos',
      {
        obtenerFechaActual: () => new Date('2026-10-11T16:00:00.000Z'),
        eventos: {
          listar: async () => ({
            data: [
              {
                nombre: 'Caminata guiada',
                fecha: '2026-10-12',
                hora: '08:00:00',
                tipoActividad: 'evento',
                cuposDisponibles: 12,
              },
            ],
            paginacion: { pagina: 1, totalPaginas: 1 },
          }),
        },
      },
    );

    const resultado = await servicio.procesarPregunta(
      'Hay capacitaciones programadas proximamente?',
    );

    assert.match(resultado.respuesta, /no hay capacitaciones proximas/i);
    assert.doesNotMatch(resultado.respuesta, /Caminata guiada/);
  });

  test('maneja errores al consultar disponibilidad sin exponer detalles internos', async () => {
    const { servicio, guardadas } = await crearServicio(
      async () => 'reservas',
      {
        eventos: {
          listar: async () => {
            throw new Error('correo privado de reserva');
          },
        },
      },
    );
    const original = console.error;
    console.error = () => undefined;

    try {
      const resultado = await servicio.procesarPregunta('Quiero reservar');

      assert.match(resultado.respuesta, /No pude consultar la disponibilidad/i);
      assert.doesNotMatch(resultado.respuesta, /correo privado/);
      assert.equal(guardadas[0]?.respuestaChatbot, resultado.respuesta);
    } finally {
      console.error = original;
    }
  });

  test('maneja errores al consultar datos dinamicos sin romper la persistencia', async () => {
    const { servicio, guardadas } = await crearServicio(
      async () => 'eventos',
      {
        eventos: {
          listar: async () => {
            throw new Error('detalle privado de base de datos');
          },
        },
      },
    );
    const original = console.error;
    console.error = () => undefined;

    try {
      const resultado = await servicio.procesarPregunta('Eventos publicados');

      assert.match(resultado.respuesta, /No pude consultar los eventos/i);
      assert.doesNotMatch(resultado.respuesta, /detalle privado/);
      assert.equal(guardadas[0]?.respuestaChatbot, resultado.respuesta);
    } finally {
      console.error = original;
    }
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

    assert.match(resultado.respuesta, /no hay emprendimientos publicados/i);
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
