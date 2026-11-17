
import { AppDataSource } from '../../../data-source';
import {
  ConversacionChatbot,
  EstadoConversacionChatbot,
} from '../../../models/ConversacionChatbot';
import type { Repository } from 'typeorm';

import { emprendimientoService } from '../../Administración de emprendimientos/Registro de emprendimientos/emprendimiento.service';
import { EventosService } from '../../Gestión de Eventos y Capacitaciones/Visualización de Eventos y Capacitaciones/eventos.service';

import {
  FAQ_IDS,
  GeminiFaqClassifier,
  getSafeGeminiErrorMetadata,
  LocalFaqClassifier,
  shouldUseLocalFaqFallback,
  type FaqClassifier,
  type FaqId,
} from './geminiFaqClassifier.service';

type EmprendimientoPublicado = {
  nombre?: string | null | undefined;
  descripcion?: string | null | undefined;
  provincia?: string | null | undefined;
  canton?: string | null | undefined;
  distrito?: string | null | undefined;
  direccion?: string | null | undefined;
  telefono?: string | null | undefined;
};

type EventoPublicado = {
  nombre?: string | null | undefined;
  descripcion?: string | null | undefined;
  fecha?: string | null | undefined;
  hora?: string | null | undefined;
  lugar?: string | null | undefined;
  tipoActividad?: string | null | undefined;
  cuposDisponibles?: number | null | undefined;
};

interface ConsultasEmprendimientos {
  obtenerCatalogoPublico(): Promise<
    Array<{ toPublic(): EmprendimientoPublicado }>
  >;
}

interface ConsultasEventos {
  listar(filtros?: { pagina?: number }): Promise<{
    data: EventoPublicado[];
    paginacion: {
      pagina: number;
      totalPaginas: number;
    };
  }>;
}

interface ChatbotServiceDependencies {
  emprendimientos: ConsultasEmprendimientos;
  eventos: ConsultasEventos;
  obtenerFechaActual: () => Date;
}

// ======================================================
// RESPUESTAS GENERALES DEL CHATBOT
// ======================================================

const RESPUESTAS_FAQ: Record<FaqId, string> = {
  ubicacion: [
    '📍 UBICACIÓN DEL PARQUE NACIONAL DIRIÁ',
    '',
    'El Parque Nacional Diriá se encuentra en la provincia de Guanacaste, en la zona de Santa Cruz, específicamente en el sector de Arado.',
    '',
    '🗺️ Puedes consultar el mapa disponible en nuestra plataforma para visualizar su ubicación y obtener una referencia de cómo llegar.',
    '',
    '🌿 ¡Te invitamos a conocer y disfrutar de este espacio natural!',
  ].join('\n'),

  servicios: [
    '🌿 SERVICIOS DISPONIBLES',
    '',
    'La plataforma de la Asociación Aliados del Parque Nacional Diriá permite consultar información y acceder a diferentes funcionalidades:',
    '',
    '🏪 Emprendimientos: conoce los productos y servicios ofrecidos por los asociados.',
    '',
    '🎉 Eventos y capacitaciones: consulta las actividades publicadas por la Asociación.',
    '',
    '📅 Reservas: revisa las actividades que tienen disponibilidad para reservar.',
    '',
    '🚨 Reporte de incidencias: informa sobre situaciones relacionadas con el entorno del parque.',
    '',
    '📢 Información y novedades: consulta contenidos relacionados con la Asociación y el Parque Nacional Diriá.',
    '',
    '💚 ¡Estamos aquí para ayudarte!',
  ].join('\n'),

  emprendimientos: [
    '🏪 EMPRENDIMIENTOS DE LA COMUNIDAD',
    '',
    'A través de nuestra plataforma puedes conocer los emprendimientos publicados por los asociados.',
    '',
    'Encontrarás información sobre sus servicios, ubicación y medios de contacto.',
    '',
    '🤝 ¡Apoya el talento y los servicios de nuestra comunidad!',
  ].join('\n'),

  eventos: [
    '🎉 EVENTOS Y CAPACITACIONES',
    '',
    'La Asociación publica eventos y capacitaciones para que las personas interesadas puedan conocer y participar en las actividades disponibles.',
    '',
    '📅 Puedes consultar las próximas actividades publicadas directamente desde este asistente.',
    '',
    '🌿 ¡Te invitamos a participar!',
  ].join('\n'),

  reservas: [
    '📅 RESERVAS Y ACTIVIDADES',
    '',
    'La plataforma permite consultar las actividades que tienen habilitada la opción de reserva.',
    '',
    '👥 Puedes conocer las actividades disponibles y verificar si cuentan con cupos.',
    '',
    'ℹ️ La disponibilidad depende de la información publicada por la Asociación.',
    '',
    '💚 ¡Consulta las actividades disponibles!',
  ].join('\n'),

  incidencias: [
    '🚨 REPORTE DE INCIDENCIAS',
    '',
    'La plataforma permite reportar situaciones que requieran atención en el entorno del Parque Nacional Diriá.',
    '',
    'Puedes utilizar esta funcionalidad para informar sobre situaciones relacionadas con:',
    '',
    '🔥 Incendios.',
    '🌱 Flora y fauna.',
    '🌎 Situaciones ambientales.',
    '🏗️ Infraestructura.',
    '🥾 Senderos.',
    '🛠️ Servicios.',
    '⚠️ Otras situaciones que requieran atención.',
    '',
    '📝 Recuerda proporcionar los detalles necesarios para facilitar la atención del reporte.',
  ].join('\n'),

  contacto: [
    '📞 CONTACTO DE LA ASOCIACIÓN',
    '',
    '¿Necesitas más información o deseas recibir atención personalizada?',
    '',
    'Puedes comunicarte con la Asociación Aliados del Parque Nacional Diriá.',
    '',
    '📱 WhatsApp: +506 8722-3373',
    '',
    '🤝 ¡Con gusto te brindaremos atención!',
  ].join('\n'),

  informacion_parque: [
    '🌿 PARQUE NACIONAL DIRIÁ',
    '',
    'El Parque Nacional Diriá es un área silvestre protegida ubicada en la provincia de Guanacaste.',
    '',
    'Este espacio forma parte del entorno natural y de las iniciativas que promueve la Asociación Aliados del Parque Nacional Diriá.',
    '',
    '🗺️ En nuestra plataforma puedes consultar información general sobre el parque, su ubicación, actividades y servicios relacionados.',
    '',
    '💚 ¡Contribuyamos juntos al conocimiento y protección de nuestro entorno natural!',
  ].join('\n'),

  asociacion: [
    '🤝 ASOCIACIÓN ALIADOS DEL PARQUE NACIONAL DIRIÁ',
    '',
    'La Asociación Aliados del Parque Nacional Diriá es una organización ubicada en Guanacaste que trabaja en conjunto con iniciativas relacionadas con el Parque Nacional Diriá y su entorno.',
    '',
    'A través de nuestra plataforma se busca facilitar:',
    '',
    '🏪 La promoción de emprendimientos.',
    '🎉 La divulgación de eventos y capacitaciones.',
    '📢 La publicación de información.',
    '🌿 La gestión de actividades relacionadas con el parque.',
    '',
    '💚 ¡Gracias por tu interés en nuestra Asociación!',
  ].join('\n'),

  objetivo_asociacion: [
    '🎯 OBJETIVO DE LA ASOCIACIÓN',
    '',
    'La Asociación busca apoyar la gestión y promoción de actividades relacionadas con el Parque Nacional Diriá.',
    '',
    'También procura brindar un espacio para dar a conocer iniciativas, emprendimientos y servicios vinculados con la comunidad y el entorno del parque.',
    '',
    '🤝 ¡Trabajamos para fortalecer la participación y colaboración de la comunidad!',
  ].join('\n'),

  como_llegar: [
    '🗺️ ¿CÓMO LLEGAR AL PARQUE NACIONAL DIRIÁ?',
    '',
    'El Parque Nacional Diriá se encuentra en el sector de Arado, en Santa Cruz, Guanacaste.',
    '',
    '📍 Puedes consultar el mapa disponible en nuestra plataforma para visualizar su ubicación y obtener una referencia del recorrido.',
    '',
    '🌿 ¡Esperamos que disfrutes tu visita!',
  ].join('\n'),
};

// ======================================================
// MENSAJES GENERALES
// ======================================================

const MENSAJE_DERIVACION_ADMIN = [
  '🤝 ATENCIÓN PERSONALIZADA',
  '',
  'No cuento con información suficiente para responder esa consulta.',
  '',
  'Para recibir ayuda personalizada, te invitamos a comunicarte con un administrador de la Asociación Aliados del Parque Nacional Diriá mediante WhatsApp.',
  '',
  '📱 Presiona el botón de WhatsApp para enviar tu consulta.',
].join('\n');

const MENSAJE_ERROR_GENERAL = [
  '⚠️ NO FUE POSIBLE COMPLETAR LA CONSULTA',
  '',
  'En este momento no puedo procesar tu solicitud correctamente.',
  '',
  'Por favor, inténtalo nuevamente más tarde o comunícate con un administrador mediante WhatsApp.',
].join('\n');

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

const normalizarTexto = (texto: string) =>
  texto
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const limitarTexto = (
  texto: string | null | undefined,
  maximo: number,
) => {
  const limpio = texto?.trim();

  if (!limpio) return null;

  return limpio.length > maximo
    ? `${limpio.slice(0, maximo - 1)}...`
    : limpio;
};

const unirPartes = (
  partes: Array<string | null | undefined>,
) =>
  partes
    .filter((parte): parte is string => Boolean(parte?.trim()))
    .join(', ');

const ZONA_HORARIA_SISTEMA = 'America/Costa_Rica';

const formateadorFechaHoraSistema = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA_SISTEMA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const obtenerFechaHoraSistema = (fecha: Date) => {
  const partes = Object.fromEntries(
    formateadorFechaHoraSistema
      .formatToParts(fecha)
      .map((parte) => [parte.type, parte.value]),
  );

  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`;
};

const normalizarHoraEvento = (
  hora: string | null | undefined,
) => {
  const coincidencia = hora?.match(
    /^(\d{2}):(\d{2})(?::(\d{2}))?/,
  );

  if (!coincidencia) return '00:00:00';

  return `${coincidencia[1]}:${coincidencia[2]}:${coincidencia[3] ?? '00'}`;
};

const esConsultaCapacitaciones = (mensaje: string) =>
  /\bcapacitacion(?:es)?\b/.test(normalizarTexto(mensaje));

// ======================================================
// SERVICIO PRINCIPAL DEL CHATBOT
// ======================================================

export class ChatbotService {
  private repo: Repository<ConversacionChatbot>;

  private faqClassifier: FaqClassifier;

  private localFaqClassifier = new LocalFaqClassifier();

  private deps: ChatbotServiceDependencies;

  constructor(
    repository?: Repository<ConversacionChatbot>,
    faqClassifier: FaqClassifier = new GeminiFaqClassifier(),
    deps: Partial<ChatbotServiceDependencies> = {},
  ) {
    this.repo =
      repository ??
      AppDataSource.getRepository(ConversacionChatbot);

    this.faqClassifier = faqClassifier;

    this.deps = {
      emprendimientos:
        deps.emprendimientos ?? emprendimientoService,

      eventos:
        deps.eventos ?? new EventosService(),

      obtenerFechaActual:
        deps.obtenerFechaActual ?? (() => new Date()),
    };
  }

  // ====================================================
  // PROCESAR PREGUNTAS
  // ====================================================

  async procesarPregunta(
    mensaje: string,
    usuarioId?: number,
    faqSeleccionada?: string,
  ) {
    const inicio = Date.now();

    const pregunta = normalizarTexto(mensaje);

    let respuesta: string;

    let estado = EstadoConversacionChatbot.RESUELTA;

    let fallbackActivado = false;

    let errorType: string | undefined;

    // Saludo inicial.
    if (
      pregunta === 'hola' ||
      pregunta.includes('buenas') ||
      pregunta.includes('buenos dias') ||
      pregunta.includes('buenas tardes') ||
      pregunta.includes('buenas noches')
    ) {
      respuesta = [
        '👋 ¡HOLA! BIENVENIDO/A',
        '',
        'Soy el asistente virtual de la Asociación Aliados del Parque Nacional Diriá.',
        '',
        '🌿 Estoy aquí para ayudarte con información sobre el parque, la Asociación y los servicios disponibles en nuestra plataforma.',
        '',
        'Puedes preguntarme sobre:',
        '',
        '📍 Ubicación del parque.',
        '🏪 Emprendimientos.',
        '🎉 Eventos y capacitaciones.',
        '📅 Reservas.',
        '🌿 Servicios e información general.',
        '📞 Contacto con la Asociación.',
        '',
        '💚 ¡Será un gusto ayudarte!',
      ].join('\n');

    // Solicitud para contactar a un administrador.
    } else if (
      pregunta.includes('administrador') ||
      pregunta.includes('administradora') ||
      pregunta.includes('hablar con alguien') ||
      pregunta.includes('hablar con una persona') ||
      pregunta.includes('atencion personalizada')
    ) {
      respuesta = [
        '🤝 CONTACTAR CON UN ADMINISTRADOR',
        '',
        '¡Claro que sí!',
        '',
        'Puedes comunicarte directamente con un administrador de la Asociación mediante WhatsApp.',
        '',
        '📱 Presiona el botón de WhatsApp para enviar tu consulta.',
        '',
        '💬 Se enviará tu consulta anterior para que el administrador conozca lo que necesitas.',
      ].join('\n');

      estado = EstadoConversacionChatbot.DERIVADA_ADMIN;

    // Agradecimientos y despedidas.
    } else if (
      pregunta.includes('gracias') ||
      pregunta.includes('muchas gracias') ||
      pregunta.includes('adios')
    ) {
      respuesta = [
        '💚 ¡CON MUCHO GUSTO!',
        '',
        'Gracias por utilizar el asistente virtual de la Asociación Aliados del Parque Nacional Diriá.',
        '',
        '🌿 Esperamos que la información haya sido de utilidad.',
        '',
        '👋 ¡Estamos aquí para ayudarte cuando lo necesites!',
      ].join('\n');

    } else {
      // Primero se intenta identificar la categoría localmente.
      const faqIdSeleccionada = FAQ_IDS.find(
        (id) => id === faqSeleccionada,
      );

      const faqLocal =
        faqIdSeleccionada ??
        (await this.localFaqClassifier.classify(mensaje));

      if (faqLocal) {
        respuesta = await this.responderPorCategoria(
          faqLocal,
          mensaje,
        );

      } else {
        // Si el clasificador local no reconoce la pregunta,
        // se intenta utilizar Gemini.
        try {
          const faqId =
            await this.faqClassifier.classify(mensaje);

          if (faqId) {
            respuesta = await this.responderPorCategoria(
              faqId,
              mensaje,
            );
          } else {
            respuesta = MENSAJE_DERIVACION_ADMIN;

            estado =
              EstadoConversacionChatbot.DERIVADA_ADMIN;
          }

        } catch (error) {
          const metadata =
            getSafeGeminiErrorMetadata(error);

          errorType = metadata.errorType;

          fallbackActivado =
            shouldUseLocalFaqFallback(error);

          console.warn(
            'Gemini classification failed',
            metadata,
          );

          if (fallbackActivado) {
            // Si Gemini falla, se vuelve a intentar
            // con el clasificador local.
            const faqId =
              await this.localFaqClassifier.classify(mensaje);

            if (faqId) {
              respuesta = await this.responderPorCategoria(
                faqId,
                mensaje,
              );
            } else {
              respuesta = MENSAJE_DERIVACION_ADMIN;

              estado =
                EstadoConversacionChatbot.DERIVADA_ADMIN;
            }

          } else {
            respuesta = MENSAJE_DERIVACION_ADMIN;

            estado =
              EstadoConversacionChatbot.DERIVADA_ADMIN;
          }
        }
      }
    }

    // Guardar la conversación en la base de datos.
    const conversacion = this.repo.create({
      usuario: usuarioId
        ? ({ id: usuarioId } as any)
        : null,

      administrador: null,

      mensajeUsuario: mensaje,

      respuestaChatbot: respuesta,

      estado,
    });

    await this.repo.save(conversacion);

    console.info('Chatbot request completed', {
      durationMs: Date.now() - inicio,
      errorType,
      fallbackActivated: fallbackActivado,
    });

    return {
      respuesta,
      estado,
      conversacionId: conversacion.id,
      fallbackActivado,
    };
  }

  // ====================================================
  // ENLACE DE WHATSAPP
  // ====================================================

  generarEnlaceWhatsApp(consultaAnterior: string) {
    const texto =
      `Hola, necesito ayuda con esta consulta: "${consultaAnterior}"`;

    return {
      url: `https://wa.me/50687223373?text=${encodeURIComponent(texto)}`,
    };
  }

  // ====================================================
  // SELECCIONAR RESPUESTA SEGÚN LA CATEGORÍA
  // ====================================================

  private async responderPorCategoria(
    faqId: FaqId | null,
    mensaje: string,
  ): Promise<string> {
    if (faqId === 'emprendimientos') {
      return this.responderEmprendimientos();
    }

    if (faqId === 'eventos') {
      return this.responderEventos(
        esConsultaCapacitaciones(mensaje)
          ? {
              tipoActividad: 'capacitacion',

              encabezado:
                '🎓 PRÓXIMAS CAPACITACIONES',

              mensajeVacio:
                '🎓 CAPACITACIONES\n\nActualmente no hay capacitaciones próximas publicadas. ¡Te invitamos a consultar nuevamente más adelante!',
            }
          : undefined,
      );
    }

    if (faqId === 'reservas') {
      return this.responderDisponibilidadActividades();
    }

    return faqId
      ? RESPUESTAS_FAQ[faqId]
      : MENSAJE_DERIVACION_ADMIN;
  }

  // ====================================================
  // CONSULTAR EMPRENDIMIENTOS PUBLICADOS
  // ====================================================

  private async responderEmprendimientos(): Promise<string> {
    try {
      const emprendimientos =
        await this.deps.emprendimientos.obtenerCatalogoPublico();

      if (emprendimientos.length === 0) {
        return [
          '🏪 EMPRENDIMIENTOS DISPONIBLES',
          '',
          'Actualmente no hay emprendimientos publicados.',
          '',
          '💚 ¡Te invitamos a consultar nuevamente más adelante!',
        ].join('\n');
      }

      const resumen = emprendimientos
        .slice(0, 5)
        .map((emprendimiento, indice) => {
          const datos = emprendimiento.toPublic();

          const ubicacion = unirPartes([
            datos.direccion,
            datos.distrito,
            datos.canton,
            datos.provincia,
          ]);

          const descripcion = limitarTexto(
            datos.descripcion,
            150,
          );

          const contacto = datos.telefono
            ? `📞 Contacto: ${datos.telefono}`
            : '📞 Contacto: No disponible';

          return [
            `${indice + 1}. 🏪 ${datos.nombre ?? 'Emprendimiento sin nombre'}`,
            '',
            descripcion
              ? `📝 Descripción: ${descripcion}`
              : '',
            ubicacion
              ? `📍 Ubicación: ${ubicacion}`
              : '',
            contacto,
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n\n────────────────────\n\n');

      const adicional =
        emprendimientos.length > 5
          ? `\n\nℹ️ Hay ${emprendimientos.length - 5} emprendimiento(s) más publicados en nuestro catálogo.`
          : '';

      return [
        '🏪 EMPRENDIMIENTOS DISPONIBLES',
        '',
        'Conoce los emprendimientos publicados por nuestros asociados:',
        '',
        resumen,
        adicional,
        '',
        '🤝 ¡Apoya el talento y los servicios de nuestra comunidad!',
      ].join('\n');

    } catch {
      console.error(
        'Error al consultar emprendimientos para chatbot.',
      );

      return [
        '⚠️ CONSULTA DE EMPRENDIMIENTOS',
        '',
        'En este momento no fue posible consultar los emprendimientos publicados.',
        '',
        'Por favor, inténtalo nuevamente más tarde.',
      ].join('\n');
    }
  }

  // ====================================================
  // CONSULTAR EVENTOS Y CAPACITACIONES
  // ====================================================

  private async responderEventos(opciones?: {
    tipoActividad?: string;
    encabezado?: string;
    mensajeVacio?: string;
  }): Promise<string> {
    try {
      const eventosProximos =
        await this.obtenerEventosProximos(
          opciones?.tipoActividad
            ? {
                tipoActividad: opciones.tipoActividad,
              }
            : undefined,
        );

      if (eventosProximos.length === 0) {
        return (
          opciones?.mensajeVacio ??
          [
            '🎉 EVENTOS Y CAPACITACIONES',
            '',
            'Actualmente no hay eventos o capacitaciones próximos publicados.',
            '',
            '💚 ¡Te invitamos a consultar nuevamente más adelante!',
          ].join('\n')
        );
      }

      const resumen = eventosProximos
        .slice(0, 5)
        .map((evento, indice) => {
          const descripcion = limitarTexto(
            evento.descripcion,
            150,
          );

          const cupos =
            evento.cuposDisponibles === null ||
            evento.cuposDisponibles === undefined
              ? '👥 Cupos: Sin límite publicado'
              : `👥 Cupos disponibles: ${evento.cuposDisponibles}`;

          return [
            `${indice + 1}. 🎉 ${evento.nombre ?? 'Actividad sin nombre'}`,
            '',
            evento.fecha
              ? `📅 Fecha: ${evento.fecha}`
              : '',
            evento.hora
              ? `🕒 Hora: ${evento.hora}`
              : '',
            evento.lugar
              ? `📍 Lugar: ${evento.lugar}`
              : '',
            evento.tipoActividad
              ? `🏷️ Tipo: ${evento.tipoActividad}`
              : '',
            descripcion
              ? `📝 Descripción: ${descripcion}`
              : '',
            cupos,
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n\n────────────────────\n\n');

      return [
        opciones?.encabezado ??
          '🎉 PRÓXIMOS EVENTOS Y ACTIVIDADES',
        '',
        'Conoce las próximas actividades publicadas por la Asociación:',
        '',
        resumen,
        '',
        '💚 ¡Te esperamos!',
      ].join('\n');

    } catch {
      console.error(
        'Error al consultar eventos para chatbot.',
      );

      return [
        '⚠️ CONSULTA DE EVENTOS',
        '',
        'En este momento no fue posible consultar los eventos o capacitaciones publicados.',
        '',
        'Por favor, inténtalo nuevamente más tarde.',
      ].join('\n');
    }
  }

  // ====================================================
  // CONSULTAR DISPONIBILIDAD PARA RESERVAS
  // ====================================================

  private async responderDisponibilidadActividades(): Promise<string> {
    try {
      const actividadesDisponibles = (
        await this.obtenerEventosProximos()
      ).filter(
        (evento) =>
          evento.cuposDisponibles === null ||
          evento.cuposDisponibles === undefined ||
          evento.cuposDisponibles > 0,
      );

      if (actividadesDisponibles.length === 0) {
        return [
          '📅 ACTIVIDADES DISPONIBLES PARA RESERVAR',
          '',
          'Actualmente no hay actividades próximas con cupos disponibles para reservar.',
          '',
          '💚 Te invitamos a consultar nuevamente más adelante.',
        ].join('\n');
      }

      const resumen = actividadesDisponibles
        .slice(0, 5)
        .map((evento, indice) => {
          const cupos =
            evento.cuposDisponibles === null ||
            evento.cuposDisponibles === undefined
              ? 'Sin límite de cupos publicado'
              : `${evento.cuposDisponibles} cupo(s) disponible(s)`;

          return [
            `${indice + 1}. 📅 ${evento.nombre ?? 'Actividad sin nombre'}`,
            '',
            evento.fecha
              ? `🗓️ Fecha: ${evento.fecha}`
              : '',
            evento.hora
              ? `🕒 Hora: ${evento.hora}`
              : '',
            evento.lugar
              ? `📍 Lugar: ${evento.lugar}`
              : '',
            `👥 Disponibilidad: ${cupos}`,
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n\n────────────────────\n\n');

      return [
        '📅 ACTIVIDADES DISPONIBLES PARA RESERVAR',
        '',
        'Estas son las actividades próximas que actualmente cuentan con disponibilidad:',
        '',
        resumen,
        '',
        'ℹ️ La disponibilidad puede cambiar según las reservas realizadas.',
        '',
        '🤝 ¡Gracias por tu interés!',
      ].join('\n');

    } catch {
      console.error(
        'Error al consultar disponibilidad para chatbot.',
      );

      return [
        '⚠️ CONSULTA DE RESERVAS',
        '',
        'En este momento no fue posible consultar la disponibilidad de las actividades.',
        '',
        'Por favor, inténtalo nuevamente más tarde.',
      ].join('\n');
    }
  }

  // ====================================================
  // OBTENER EVENTOS QUE TODAVÍA NO HAN OCURRIDO
  // ====================================================

  private async obtenerEventosProximos(
    filtros: {
      tipoActividad?: string;
    } = {},
  ): Promise<EventoPublicado[]> {
    const ahora = obtenerFechaHoraSistema(
      this.deps.obtenerFechaActual(),
    );

    const eventosProximos: EventoPublicado[] = [];

    let pagina = 1;

    let totalPaginas = 1;

    do {
      const resultado =
        await this.deps.eventos.listar({ pagina });

      eventosProximos.push(
        ...resultado.data.filter(
          (evento) =>
            typeof evento.fecha === 'string' &&
            `${evento.fecha}T${normalizarHoraEvento(evento.hora)}` >= ahora &&
            (!filtros.tipoActividad ||
              evento.tipoActividad === filtros.tipoActividad),
        ),
      );

      totalPaginas = resultado.paginacion.totalPaginas;

      pagina += 1;

    } while (
      eventosProximos.length < 5 &&
      pagina <= totalPaginas
    );

    return eventosProximos;
  }
}
