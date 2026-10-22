import { Router } from 'express';
import { ChatbotController } from './chatbot.controller';

const router = Router();

const controller = new ChatbotController();

router.post('/', (req, res) =>
  controller.procesarPregunta(req, res),
);

export default router;