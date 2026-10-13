import { Request, Response } from 'express';
import { categoriaEmprendimientoService } from './categoriaEmprendimiento.service';

export class CategoriaEmprendimientoController {
  async crear(req: Request, res: Response): Promise<Response> {
    try {
      const categoria = await categoriaEmprendimientoService.crear(req.body);

      return res.status(201).json(categoria.toPublic());
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo crear la categoría.';
      const estado = error instanceof Error && error.name === 'DuplicateCategoryError' ? 409 : 400;
      return res.status(estado).json({ mensaje });
    }
  }

  async obtenerTodas(req: Request, res: Response): Promise<Response> {
    try {
      const categorias = await categoriaEmprendimientoService.obtenerTodas();

      return res.status(200).json(categorias.map((c) => c.toPublic()));
    } catch (error: unknown) {
      return res.status(500).json({ mensaje: error instanceof Error ? error.message : 'No se pudieron obtener las categorías.' });
    }
  }
}

export const categoriaEmprendimientoController =
  new CategoriaEmprendimientoController();
