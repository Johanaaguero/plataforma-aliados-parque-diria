import { AppDataSource } from '../../../data-source';
import {
  ConversacionChatbot,
  EstadoConversacionChatbot,
} from '../../../models/ConversacionChatbot';
import type { Repository } from 'typeorm';
import { emprendimientoService } from '../../Administración de emprendimientos/Registro de emprendimientos/emprendimiento.service';
import { EventosService } from '../../Gestión de Eventos y Capacitaciones/Visualización de Eventos y Capacitaciones/eventos.service';
import {
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
  obtenerCatalogoPublico(): Promise<Array<{ toPublic(): EmprendimientoPublicado }>>;
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

const RESPUESTAS_FAQ: Record<FaqId, string> = {
  ubicacion:
    'El Parque Nacional Diriá se encuentra en la provincia de Guanacaste, en la zona de Santa Cruz, específicamente en el sector de Arado. En el sistema también puede consultar el mapa del parque para conocer su ubicación y obtener una referencia de cómo llegar.',
  servicios:
    'La plataforma de la Asociación permite consultar información general del Parque Nacional Diriá y ofrece diferentes servicios, como la publicación de eventos y capacitaciones, la promoción de emprendimientos de personas de la comunidad, la realización de reservas y el reporte de incidencias. También permite consultar información y novedades relacionadas con las actividades de la Asociación.',
  emprendimientos:
    'La plataforma permite dar visibilidad a emprendimientos de personas vinculadas con la comunidad y el entorno del Parque Nacional Diriá. Puede consultar los emprendimientos que se encuentren publicados en el sistema.',
  eventos:
    'La Asociación puede publicar eventos y capacitaciones para que las personas interesadas puedan consultar la información disponible y conocer las actividades que se realizan.',
  reservas:
    'El sistema permite realizar reservas para los servicios o actividades que tengan esta opción habilitada. Puede consultar la sección de reservas para conocer las opciones disponibles.',
  incidencias:
    'El sistema permite reportar incidencias relacionadas con el entorno del Parque Nacional Diriá. Puede utilizar esta función para informar sobre situaciones que requieran atención y proporcionar los detalles correspondientes.',
  contacto:
    'Puede comunicarse con la Asociación Aliados del Parque Nacional Diriá al número +506 8722 3373.',
  informacion_parque:
    'El Parque Nacional Diriá es un área silvestre protegida ubicada en Guanacaste. El sistema permite consultar información general sobre el parque, sus actividades, servicios y otros contenidos relacionados con la Asociación Aliados del Parque Nacional Diriá.',
  asociacion:
    'La Asociación Aliados del Parque Nacional Diriá es una organización ubicada en Guanacaste que trabaja en conjunto con iniciativas relacionadas con el Parque Nacional Diriá y su entorno. A través del sistema se busca facilitar la información, promoción y gestión de diferentes actividades y servicios relacionados con la Asociación y el parque.',
  objetivo_asociacion:
    'La Asociación busca apoyar la gestión y promoción de actividades relacionadas con el Parque Nacional Diriá, así como brindar un espacio para dar a conocer iniciativas y servicios vinculados con la comunidad y el entorno del parque.',
  como_llegar:
    'Puede consultar el mapa disponible en el sistema para visualizar la ubicación del Parque Nacional Diriá y obtener una referencia de cómo llegar.',
};

const MENSAJE_NO_ENCONTRADO =
  'No encontré una respuesta específica para esa consulta. Puedo ayudarte con información general sobre la Asociación Aliados del Parque Nacional Diriá, el parque, emprendimientos, eventos, capacitaciones, reservas, incidencias, ubicación y contacto.';

const normalizarTexto = (texto: string) =>
  texto
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const limitarTexto = (texto: string | null | undefined, maximo: number) => {
  const limpio = texto?.trim();
  if (!limpio) return null;
  return limpio.length > maximo ? `${limpio.slice(0, maximo - 1)}...` : limpio;
};

const unirPartes = (partes: Array<string | null | undefined>) =>
  partes.filter((parte): parte is string => Boolean(parte?.trim())).join(', ');

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

const normalizarHoraEvento = (hora: string | null | undefined) => {
  const coincidencia = hora?.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!coincidencia) return '00:00:00';
  return `${coincidencia[1]}:${coincidencia[2]}:${coincidencia[3] ?? '00'}`;
};

const esConsultaCapacitaciones = (mensaje: string) =>
  /\bcapacitacion(?:es)?\b/.test(normalizarTexto(mensaje));

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
      emprendimientos: deps.emprendimientos ?? emprendimientoService,
      eventos: deps.eventos ?? new EventosService(),
      obtenerFechaActual: deps.obtenerFechaActual ?? (() => new Date()),
    };
  }

  async procesarPregunta(mensaje: string, usuarioId?: number) {
    const pregunta = normalizarTexto(mensaje);
    let respuesta: string;
    let estado = EstadoConversacionChatbot.RESUELTA;

    if (
      pregunta === 'hola' ||
      pregunta.includes('buenas') ||
      pregunta.includes('buenos dias') ||
      pregunta.includes('buenas tardes') ||
      pregunta.includes('buenas noches')
    ) {
      respuesta =
        '¡Hola! Soy el asistente virtual de la Asociación Aliados del Parque Nacional Diriá. Puedo ayudarte con información general sobre la Asociación, el Parque Nacional Diriá y los servicios disponibles en el sistema.';
    } else if (
      pregunta.includes('administrador') ||
      pregunta.includes('administradora') ||
      pregunta.includes('hablar con alguien') ||
      pregunta.includes('hablar con una persona') ||
      pregunta.includes('atencion personalizada')
    ) {
      respuesta =
        'Claro. Puede comunicarse con un administrador de la Asociación mediante WhatsApp. Se enviará su consulta anterior para que el administrador conozca lo que necesita.';
      estado = EstadoConversacionChatbot.DERIVADA_ADMIN;
    } else if (
      pregunta.includes('gracias') ||
      pregunta.includes('muchas gracias') ||
      pregunta.includes('adios')
    ) {
      respuesta =
        '¡Con mucho gusto! Gracias por utilizar el asistente virtual de la Asociación Aliados del Parque Nacional Diriá.';
    } else {
      try {
        const faqId = await this.faqClassifier.classify(mensaje);
        respuesta = await this.responderPorCategoria(faqId, mensaje);
      } catch (error) {
        // Evita registrar errores del proveedor, que podrían incluir datos sensibles.
        console.warn(
          'Falló Gemini; se intenta la clasificación FAQ local.',
          getSafeGeminiErrorMetadata(error),
        );
        if (shouldUseLocalFaqFallback(error)) {
          const faqId = await this.localFaqClassifier.classify(mensaje);
          respuesta = await this.responderPorCategoria(faqId, mensaje);
        } else {
          respuesta = MENSAJE_NO_ENCONTRADO;
        }
      }
    }

    const conversacion = this.repo.create({
      usuario: usuarioId ? ({ id: usuarioId } as any) : null,
      administrador: null,
      mensajeUsuario: mensaje,
      respuestaChatbot: respuesta,
      estado,
    });

    await this.repo.save(conversacion);

    return {
      respuesta,
      estado,
      conversacionId: conversacion.id,
    };
  }

  generarEnlaceWhatsApp(consultaAnterior: string) {
    const texto =
      `Hola, necesito ayuda con esta consulta: "${consultaAnterior}"`;

    return {
      url: `https://wa.me/50687223373?text=${encodeURIComponent(texto)}`,
    };
  }

  private async responderPorCategoria(
    faqId: FaqId | null,
    mensaje: string,
  ): Promise<string> {
    if (faqId === 'emprendimientos') return this.responderEmprendimientos();
    if (faqId === 'eventos') {
      return this.responderEventos(
        esConsultaCapacitaciones(mensaje)
          ? {
              tipoActividad: 'capacitacion',
              encabezado: 'Estas son capacitaciones proximas publicadas:',
              mensajeVacio:
                'En este momento no hay capacitaciones proximas publicadas para mostrar.',
            }
          : undefined,
      );
    }
    if (faqId === 'reservas') return this.responderDisponibilidadActividades();
    return faqId ? RESPUESTAS_FAQ[faqId] : MENSAJE_NO_ENCONTRADO;
  }

  private async responderEmprendimientos(): Promise<string> {
    try {
      const emprendimientos =
        await this.deps.emprendimientos.obtenerCatalogoPublico();

      if (emprendimientos.length === 0) {
        return 'En este momento no hay emprendimientos publicados para mostrar.';
      }

      const resumen = emprendimientos
        .slice(0, 5)
        .map((emprendimiento, indice) => {
          const datos = emprendimiento.toPublic();
          const ubicacion = unirPartes([
            datos.distrito,
            datos.canton,
            datos.provincia,
            datos.direccion,
          ]);
          const descripcion = limitarTexto(datos.descripcion, 120);
          const contacto = datos.telefono ? ` Contacto: ${datos.telefono}.` : '';

          return [
            `${indice + 1}. ${datos.nombre ?? 'Emprendimiento sin nombre'}`,
            descripcion ? `: ${descripcion}` : '',
            ubicacion ? ` Ubicacion: ${ubicacion}.` : '',
            contacto,
          ].join('');
        })
        .join('\n');

      const adicional =
        emprendimientos.length > 5
          ? `\n\nHay ${emprendimientos.length - 5} emprendimiento(s) mas publicados en el catalogo.`
          : '';

      return `Estos son emprendimientos publicados disponibles:\n${resumen}${adicional}`;
    } catch {
      console.error('Error al consultar emprendimientos para chatbot.');
      return 'No pude consultar los emprendimientos publicados en este momento. Intentalo de nuevo mas tarde.';
    }
  }

  private async responderEventos(opciones?: {
    tipoActividad?: string;
    encabezado?: string;
    mensajeVacio?: string;
  }): Promise<string> {
    try {
      const eventosProximos = await this.obtenerEventosProximos(
        opciones?.tipoActividad
          ? { tipoActividad: opciones.tipoActividad }
          : undefined,
      );

      if (eventosProximos.length === 0) {
        return opciones?.mensajeVacio ??
          'En este momento no hay eventos o capacitaciones proximas publicadas para mostrar.';
      }

      const resumen = eventosProximos
        .slice(0, 5)
        .map((evento, indice) => {
          const descripcion = limitarTexto(evento.descripcion, 100);
          const cupos =
            evento.cuposDisponibles === null || evento.cuposDisponibles === undefined
              ? 'Cupos: sin limite publicado.'
              : `Cupos disponibles: ${evento.cuposDisponibles}.`;

          return [
            `${indice + 1}. ${evento.nombre ?? 'Actividad sin nombre'}`,
            evento.fecha ? ` - ${evento.fecha}` : '',
            evento.hora ? `, ${evento.hora}` : '',
            evento.lugar ? ` en ${evento.lugar}` : '',
            evento.tipoActividad ? ` (${evento.tipoActividad})` : '',
            descripcion ? `. ${descripcion}` : '',
            ` ${cupos}`,
          ].join('');
        })
        .join('\n');

      return `${opciones?.encabezado ?? 'Estos son eventos o capacitaciones proximas publicadas:'}\n${resumen}`;
    } catch {
      console.error('Error al consultar eventos para chatbot.');
      return 'No pude consultar los eventos o capacitaciones publicados en este momento. Intentalo de nuevo mas tarde.';
    }
  }

  private async responderDisponibilidadActividades(): Promise<string> {
    try {
      const actividadesDisponibles = (await this.obtenerEventosProximos())
        .filter((evento) =>
          evento.cuposDisponibles === null ||
          evento.cuposDisponibles === undefined ||
          evento.cuposDisponibles > 0,
        );

      if (actividadesDisponibles.length === 0) {
        return 'En este momento no hay actividades proximas con cupos disponibles para reservar.';
      }

      const resumen = actividadesDisponibles
        .slice(0, 5)
        .map((evento, indice) => {
          const cupos =
            evento.cuposDisponibles === null || evento.cuposDisponibles === undefined
              ? 'cupos sin limite publicado'
              : `${evento.cuposDisponibles} cupo(s) disponible(s)`;

          return [
            `${indice + 1}. ${evento.nombre ?? 'Actividad sin nombre'}`,
            evento.fecha ? ` - ${evento.fecha}` : '',
            evento.hora ? `, ${evento.hora}` : '',
            evento.lugar ? ` en ${evento.lugar}` : '',
            `: ${cupos}.`,
          ].join('');
        })
        .join('\n');

      return `Estas actividades proximas tienen disponibilidad para reserva:\n${resumen}`;
    } catch {
      console.error('Error al consultar disponibilidad para chatbot.');
      return 'No pude consultar la disponibilidad de actividades en este momento. Intentalo de nuevo mas tarde.';
    }
  }

  private async obtenerEventosProximos(filtros: {
    tipoActividad?: string;
  } = {}): Promise<EventoPublicado[]> {
    const ahora = obtenerFechaHoraSistema(this.deps.obtenerFechaActual());
    const eventosProximos: EventoPublicado[] = [];
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const resultado = await this.deps.eventos.listar({ pagina });
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
    } while (eventosProximos.length < 5 && pagina <= totalPaginas);

    return eventosProximos;
  }
}
