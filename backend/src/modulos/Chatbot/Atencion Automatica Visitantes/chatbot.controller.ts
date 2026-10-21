import { Request, Response } from 'express';
import { ChatbotService } from './chatbot.service';

export class ChatbotController {
  private service = new ChatbotService();

  async procesarPregunta(req: Request, res: Response) {
    try {
      const { mensaje, consultaAnterior, faqId } = req.body;

      if (!mensaje || typeof mensaje !== 'string') {
        return res.status(400).json({
          mensaje: 'Debe enviar una pregunta válida.',
        });
      }

      const usuarioId = (req as any).usuario?.id;

      const resultado = await this.service.procesarPregunta(
        mensaje,
        usuarioId,
        typeof faqId === 'string' ? faqId : undefined,
      );

      let whatsapp = null;

      if (resultado.estado === 'DERIVADA_ADMIN') {
        whatsapp = this.service.generarEnlaceWhatsApp(
          consultaAnterior || mensaje,
        );
      }

      return res.status(200).json({
        respuesta: resultado.respuesta,
        estado: resultado.estado,
        conversacionId: resultado.conversacionId,
        whatsapp,
        fallbackActivado: resultado.fallbackActivado,
      });
    } catch (error) {
      console.error('Error en chatbot:', error);

      return res.status(500).json({
        mensaje: 'Ocurrió un error al procesar la consulta.',
      });
    }
  }
}