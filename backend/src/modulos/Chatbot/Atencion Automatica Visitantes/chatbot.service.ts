import { AppDataSource } from '../../../data-source';
import {
  ConversacionChatbot,
  EstadoConversacionChatbot,
} from '../../../models/ConversacionChatbot';

export class ChatbotService {
  private repo = AppDataSource.getRepository(ConversacionChatbot);

  async procesarPregunta(
    mensaje: string,
    usuarioId?: number,
  ) {
    const pregunta = mensaje.trim().toLowerCase();

    let respuesta = '';
    let estado = EstadoConversacionChatbot.RESUELTA;

    // ==========================================
    // SALUDO
    // ==========================================
    if (
      pregunta === 'hola' ||
      pregunta.includes('buenas') ||
      pregunta.includes('buenos días') ||
      pregunta.includes('buenos dias') ||
      pregunta.includes('buenas tardes') ||
      pregunta.includes('buenas noches')
    ) {
      respuesta =
        '¡Hola! Soy el asistente virtual de la Asociación Aliados del Parque Nacional Diriá. Puedo ayudarte con información general sobre la Asociación, el Parque Nacional Diriá y los servicios disponibles en el sistema.';
    }

    // ==========================================
    // ASOCIACIÓN
    // ==========================================
    else if (
      pregunta.includes('asociación') ||
      pregunta.includes('asociacion') ||
      pregunta.includes('aliados') ||
      pregunta.includes('quiénes son') ||
      pregunta.includes('quienes son') ||
      pregunta.includes('organización') ||
      pregunta.includes('organizacion')
    ) {
      respuesta =
        'La Asociación Aliados del Parque Nacional Diriá es una organización ubicada en Guanacaste que trabaja en conjunto con iniciativas relacionadas con el Parque Nacional Diriá y su entorno. A través del sistema se busca facilitar la información, promoción y gestión de diferentes actividades y servicios relacionados con la Asociación y el parque.';
    }

    // ==========================================
    // OBJETIVO DE LA ASOCIACIÓN
    // ==========================================
    else if (
      pregunta.includes('objetivo de la asociación') ||
      pregunta.includes('objetivo de la asociacion') ||
      pregunta.includes('qué hace la asociación') ||
      pregunta.includes('que hace la asociacion') ||
      pregunta.includes('función de la asociación') ||
      pregunta.includes('funcion de la asociacion') ||
      pregunta.includes('labor de la asociación') ||
      pregunta.includes('labor de la asociacion')
    ) {
      respuesta =
        'La Asociación busca apoyar la gestión y promoción de actividades relacionadas con el Parque Nacional Diriá, así como brindar un espacio para dar a conocer iniciativas y servicios vinculados con la comunidad y el entorno del parque.';
    }

    // ==========================================
    // UBICACIÓN
    // ==========================================
    else if (
      pregunta.includes('ubicación') ||
      pregunta.includes('ubicacion') ||
      pregunta.includes('dónde está') ||
      pregunta.includes('donde esta') ||
      pregunta.includes('dónde queda') ||
      pregunta.includes('donde queda') ||
      pregunta.includes('ubicado') ||
      pregunta.includes('ubicada')
    ) {
      respuesta =
        'El Parque Nacional Diriá se encuentra en la provincia de Guanacaste, en la zona de Santa Cruz, específicamente en el sector de Arado. En el sistema también puede consultar el mapa del parque para conocer su ubicación y obtener una referencia de cómo llegar.';
    }

    // ==========================================
    // CÓMO LLEGAR
    // ==========================================
    else if (
      pregunta.includes('cómo llegar') ||
      pregunta.includes('como llegar') ||
      pregunta.includes('cómo llego') ||
      pregunta.includes('como llego') ||
      pregunta.includes('ruta') ||
      pregunta.includes('dirección') ||
      pregunta.includes('direccion') ||
      pregunta.includes('camino')
    ) {
      respuesta =
        'Puede consultar el mapa disponible en el sistema para visualizar la ubicación del Parque Nacional Diriá y obtener una referencia de cómo llegar.';
    }

    // ==========================================
    // SERVICIOS DE LA ASOCIACIÓN
    // ==========================================
    else if (
      pregunta.includes('servicio') ||
      pregunta.includes('servicios') ||
      pregunta.includes('qué ofrece la asociación') ||
      pregunta.includes('que ofrece la asociacion') ||
      pregunta.includes('qué ofrece') ||
      pregunta.includes('que ofrece')
    ) {
      respuesta =
        'La plataforma de la Asociación permite consultar información general del Parque Nacional Diriá y ofrece diferentes servicios, como la publicación de eventos y capacitaciones, la promoción de emprendimientos de personas de la comunidad, la realización de reservas y el reporte de incidencias. También permite consultar información y novedades relacionadas con las actividades de la Asociación.';
    }

    // ==========================================
    // EMPRENDIMIENTOS
    // ==========================================
    else if (
      pregunta.includes('emprendimiento') ||
      pregunta.includes('emprendimientos') ||
      pregunta.includes('negocio') ||
      pregunta.includes('negocios') ||
      pregunta.includes('productos')
    ) {
      respuesta =
        'La plataforma permite dar visibilidad a emprendimientos de personas vinculadas con la comunidad y el entorno del Parque Nacional Diriá. Puede consultar los emprendimientos que se encuentren publicados en el sistema.';
    }

    // ==========================================
    // EVENTOS Y CAPACITACIONES
    // ==========================================
    else if (
      pregunta.includes('evento') ||
      pregunta.includes('eventos') ||
      pregunta.includes('capacitación') ||
      pregunta.includes('capacitacion') ||
      pregunta.includes('capacitaciones') ||
      pregunta.includes('actividad') ||
      pregunta.includes('actividades') ||
      pregunta.includes('taller') ||
      pregunta.includes('talleres')
    ) {
      respuesta =
        'La Asociación puede publicar eventos y capacitaciones para que las personas interesadas puedan consultar la información disponible y conocer las actividades que se realizan.';
    }

    // ==========================================
    // RESERVAS
    // ==========================================
    else if (
      pregunta.includes('reserva') ||
      pregunta.includes('reservas') ||
      pregunta.includes('reservar') ||
      pregunta.includes('cómo reservar') ||
      pregunta.includes('como reservar')
    ) {
      respuesta =
        'El sistema permite realizar reservas para los servicios o actividades que tengan esta opción habilitada. Puede consultar la sección de reservas para conocer las opciones disponibles.';
    }

    // ==========================================
    // INCIDENCIAS
    // ==========================================
    else if (
      pregunta.includes('incidencia') ||
      pregunta.includes('incidencias') ||
      pregunta.includes('reportar') ||
      pregunta.includes('reporte') ||
      pregunta.includes('problema') ||
      pregunta.includes('situación') ||
      pregunta.includes('situacion')
    ) {
      respuesta =
        'El sistema permite reportar incidencias relacionadas con el entorno del Parque Nacional Diriá. Puede utilizar esta función para informar sobre situaciones que requieran atención y proporcionar los detalles correspondientes.';
    }

    // ==========================================
    // INFORMACIÓN DEL PARQUE
    // ==========================================
    else if (
      pregunta.includes('parque nacional') ||
      pregunta.includes('qué es el parque') ||
      pregunta.includes('que es el parque') ||
      pregunta.includes('información del parque') ||
      pregunta.includes('informacion del parque') ||
      pregunta.includes('naturaleza') ||
      pregunta.includes('flora') ||
      pregunta.includes('fauna') ||
      pregunta.includes('animales') ||
      pregunta.includes('sendero') ||
      pregunta.includes('senderos')
    ) {
      respuesta =
        'El Parque Nacional Diriá es un área silvestre protegida ubicada en Guanacaste. El sistema permite consultar información general sobre el parque, sus actividades, servicios y otros contenidos relacionados con la Asociación Aliados del Parque Nacional Diriá.';
    }

    // ==========================================
    // CONTACTO
    // ==========================================
    else if (
      pregunta.includes('contacto') ||
      pregunta.includes('contactar') ||
      pregunta.includes('correo') ||
      pregunta.includes('email') ||
      pregunta.includes('teléfono') ||
      pregunta.includes('telefono') ||
      pregunta.includes('número') ||
      pregunta.includes('numero') ||
      pregunta.includes('comunicarme') ||
      pregunta.includes('cómo contacto') ||
      pregunta.includes('como contacto')
    ) {
      respuesta =
        'Puede comunicarse con la Asociación Aliados del Parque Nacional Diriá al número +506 8722 3373.';
    }

    // ==========================================
    // HABLAR CON ADMINISTRADOR
    // ==========================================
    else if (
      pregunta.includes('administrador') ||
      pregunta.includes('administradora') ||
      pregunta.includes('hablar con alguien') ||
      pregunta.includes('hablar con una persona') ||
      pregunta.includes('atención personalizada') ||
      pregunta.includes('atencion personalizada')
    ) {
      respuesta =
        'Claro. Puede comunicarse con un administrador de la Asociación mediante WhatsApp. Se enviará su consulta anterior para que el administrador conozca lo que necesita.';

      estado = EstadoConversacionChatbot.DERIVADA_ADMIN;
    }

    // ==========================================
    // DESPEDIDA
    // ==========================================
    else if (
      pregunta.includes('gracias') ||
      pregunta.includes('muchas gracias') ||
      pregunta.includes('adiós') ||
      pregunta.includes('adios')
    ) {
      respuesta =
        '¡Con mucho gusto! Gracias por utilizar el asistente virtual de la Asociación Aliados del Parque Nacional Diriá.';
    }

    // ==========================================
    // RESPUESTA POR DEFECTO
    // ==========================================
    else {
      respuesta =
        'No encontré una respuesta específica para esa consulta. Puedo ayudarte con información general sobre la Asociación Aliados del Parque Nacional Diriá, el parque, emprendimientos, eventos, capacitaciones, reservas, incidencias, ubicación y contacto.';
    }

    // ==========================================
    // GUARDAR CONVERSACIÓN
    // ==========================================
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

    return {
      respuesta,
      estado,
      conversacionId: conversacion.id,
    };
  }

  // ==========================================
  // GENERAR WHATSAPP
  // ==========================================
  generarEnlaceWhatsApp(consultaAnterior: string) {
    const texto =
      `Hola, necesito ayuda con esta consulta: "${consultaAnterior}"`;

    return {
      url: `https://wa.me/50687223373?text=${encodeURIComponent(texto)}`,
    };
  }
}