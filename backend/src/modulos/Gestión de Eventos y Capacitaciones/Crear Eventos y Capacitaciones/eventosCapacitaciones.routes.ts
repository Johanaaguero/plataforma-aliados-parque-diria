import { Router } from 'express';
import { EventosCapacitacionesController } from './eventosCapacitaciones.controller';

const router = Router();
const controller = new EventosCapacitacionesController();

// POST /eventos-capacitaciones
router.post('/', (req, res) => controller.create(req, res));

// GET /eventos-capacitaciones
router.get('/', (req, res) => controller.findAll(req, res));

// PUT /eventos-capacitaciones/:id
router.put('/:id', (req, res) => controller.update(req, res));

// DELETE /eventos-capacitaciones/:id
router.delete('/:id', (req, res) => controller.remove(req, res));

// POST /eventos-capacitaciones/:id/imagenes
// body JSON: { "imagenBase64": "...", "tipoMime": "image/png", "nombreArchivo": "foto.png" }
router.post('/:id/imagenes', (req, res) => controller.uploadImagen(req, res));

// GET /eventos-capacitaciones/:id/imagenes  (lista metadatos, sin el binario)
router.get('/:id/imagenes', (req, res) => controller.getImagenes(req, res));

// GET /eventos-capacitaciones/imagenes/:imagenId  (sirve el binario crudo, para <img src="...">)
router.get('/imagenes/:imagenId', (req, res) => controller.getImagen(req, res));

// GET /eventos-capacitaciones/imagenes/:imagenId/base64  (la misma imagen envuelta en JSON)
router.get('/imagenes/:imagenId/base64', (req, res) => controller.getImagenBase64(req, res));

// DELETE /eventos-capacitaciones/imagenes/:imagenId
router.delete('/imagenes/:imagenId', (req, res) => controller.removeImagen(req, res));

export default router;