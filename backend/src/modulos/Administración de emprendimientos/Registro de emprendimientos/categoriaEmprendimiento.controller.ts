import { Request, Response } from 'express';
import { categoriaEmprendimientoService } from './categoriaEmprendimiento.service';

export class CategoriaEmprendimientoController {
  async crear(req: Request, res: Response): Promise<Response> {
    try {
      const categoria = await categoriaEmprendimientoService.crear(req.body);

      return res.status(201).json(categoria.toPublic());
    } catch (error: any) {
      return res.status(400).json({ mensaje: error.message });
    }
  }

  async obtenerTodas(req: Request, res: Response): Promise<Response> {
    try {
      const categorias = await categoriaEmprendimientoService.obtenerTodas();

      return res.status(200).json(categorias.map((c) => c.toPublic()));
    } catch (error: any) {
      return res.status(500).json({ mensaje: error.message });
    }
  }
}

export const categoriaEmprendimientoController =
  new CategoriaEmprendimientoController();