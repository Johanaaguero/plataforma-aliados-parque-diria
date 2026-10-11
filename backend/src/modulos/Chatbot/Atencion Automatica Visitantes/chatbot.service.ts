import { AppDataSource } from '../../../data-source';
import {
  ConversacionChatbot,
  EstadoConversacionChatbot,
} from '../../../models/ConversacionChatbot';
import type { Repository } from 'typeorm';
import {
  GeminiFaqClassifier,
  getSafeGeminiErrorMetadata,
  LocalFaqClassifier,
  shouldUseLocalFaqFallback,
  type FaqClassifier,
  type FaqId,
} from './geminiFaqClassifier.service';

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

export class ChatbotService {
  private repo: Repository<ConversacionChatbot>;
  private faqClassifier: FaqClassifier;
  private localFaqClassifier = new LocalFaqClassifier();

  constructor(
    repository?: Repository<ConversacionChatbot>,
    faqClassifier: FaqClassifier = new GeminiFaqClassifier(),
  ) {
    this.repo =
      repository ??
      AppDataSource.getRepository(ConversacionChatbot);
    this.faqClassifier = faqClassifier;
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
        respuesta = faqId
          ? RESPUESTAS_FAQ[faqId]
          : MENSAJE_NO_ENCONTRADO;
      } catch (error) {
        // Evita registrar errores del proveedor, que podrían incluir datos sensibles.
        console.warn(
          'Falló Gemini; se intenta la clasificación FAQ local.',
          getSafeGeminiErrorMetadata(error),
        );
        if (shouldUseLocalFaqFallback(error)) {
          const faqId = await this.localFaqClassifier.classify(mensaje);
          respuesta = faqId ? RESPUESTAS_FAQ[faqId] : MENSAJE_NO_ENCONTRADO;
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
}
