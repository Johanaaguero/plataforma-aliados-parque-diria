import { Request, Response } from 'express';
import { emprendimientoService } from './emprendimiento.service';
import { EstadoPublicacion } from '../../../models/Emprendimiento';

export class EmprendimientoController {
  async crear(req: Request, res: Response): Promise<Response> {
    try {
      const dto = {
        nombre: req.body.nombre,
        descripcion: req.body.descripcion || undefined,
        categoriaId: Number(req.body.categoriaId),
        direccion: req.body.direccion || undefined,
        latitud: Number(req.body.latitud),
        longitud: Number(req.body.longitud),
        correoElectronico: req.body.correoElectronico,
        telefono: req.body.telefono,
        ...(req.file?.buffer !== undefined
          ? { imagen: req.file.buffer }
          : {}),
      };

      const emprendimiento = await emprendimientoService.crear(dto);

      return res.status(201).json(emprendimiento.toPublic());
    } catch (error: any) {
      return res.status(400).json({ mensaje: error.message });
    }
  }

  async obtenerTodos(req: Request, res: Response): Promise<Response> {
    try {
      const { estado } = req.query;

      let emprendimientos;

      if (estado) {
        const estadoString = String(estado).toLowerCase() as EstadoPublicacion;
        emprendimientos =
          await emprendimientoService.obtenerPorEstado(estadoString);
      } else {
        emprendimientos = await emprendimientoService.obtenerTodos();
      }

      return res.status(200).json(
        emprendimientos.map((e) => e.toPublic())
      );
    } catch (error: any) {
      return res.status(500).json({ mensaje: error.message });
    }
  }

  async obtenerPorId(req: Request, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.id);

      const emprendimiento =
        await emprendimientoService.obtenerPorId(id);

      return res.status(200).json(emprendimiento.toPublic());
    } catch (error: any) {
      return res.status(404).json({ mensaje: error.message });
    }
  }

  async actualizar(req: Request, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.id);

      const dto = {
        ...req.body,
        ...(req.body.categoriaId !== undefined
          ? { categoriaId: Number(req.body.categoriaId) }
          : {}),
        ...(req.body.latitud !== undefined
          ? { latitud: Number(req.body.latitud) }
          : {}),
        ...(req.body.longitud !== undefined
          ? { longitud: Number(req.body.longitud) }
          : {}),
        ...(req.file?.buffer !== undefined
          ? { imagen: req.file.buffer }
          : {}),
      };

      const emprendimiento =
        await emprendimientoService.actualizar(id, dto);

      return res.status(200).json(emprendimiento.toPublic());
    } catch (error: any) {
      return res.status(400).json({ mensaje: error.message });
    }
  }

  async eliminar(req: Request, res: Response): Promise<Response> {
    try {
      const id = Number(req.params.id);

      await emprendimientoService.eliminar(id);

      return res.status(204).send();
    } catch (error: any) {
      return res.status(404).json({ mensaje: error.message });
    }
  }
}

export const emprendimientoController =
  new EmprendimientoController();