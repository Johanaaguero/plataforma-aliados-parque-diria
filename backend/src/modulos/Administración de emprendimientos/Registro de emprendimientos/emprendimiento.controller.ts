import { NextFunction, Request, Response } from 'express';
import { emprendimientoService } from './emprendimiento.service';
import { EstadoPublicacion } from '../../../models/Emprendimiento';

const convertirEstadoPublicacion = (
  valor: unknown,
): EstadoPublicacion | null => {
  if (
    valor === 'Publicado' ||
    valor === EstadoPublicacion.PUBLICADO
  ) {
    return EstadoPublicacion.PUBLICADO;
  }

  if (
    valor === 'No Publicado' ||
    valor === EstadoPublicacion.NO_PUBLICADO
  ) {
    return EstadoPublicacion.NO_PUBLICADO;
  }

  return null;
};

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

  async obtenerTodos(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { estado } = req.query;

      let emprendimientos;

      if (estado) {
        const estadoPublicacion = convertirEstadoPublicacion(estado);

        if (!estadoPublicacion) {
          return res.status(400).json({
            ok: false,
            message:
              'El estado de publicación debe ser Publicado o No Publicado',
          });
        }

        emprendimientos =
          await emprendimientoService.obtenerPorEstado(estadoPublicacion);
      } else {
        emprendimientos = await emprendimientoService.obtenerTodos();
      }

      return res.status(200).json(
        emprendimientos.map((e) => e.toPublic())
      );
    } catch (error: unknown) {
      next(error);
    }
  }

  async obtenerCatalogoPublico(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const emprendimientos =
        await emprendimientoService.obtenerCatalogoPublico();

      return res.status(200).json(
        emprendimientos.map((emprendimiento) =>
          emprendimiento.toPublic(),
        ),
      );
    } catch (error: unknown) {
      next(error);
    }
  }

  async cambiarPublicacion(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          ok: false,
          message: 'El ID del emprendimiento no es válido',
        });
      }

      const cuerpo = req.body as Record<string, unknown> | undefined;
      const estadoSolicitado =
        cuerpo?.estadoPublicacion ?? cuerpo?.estado;
      const nuevoEstado = convertirEstadoPublicacion(estadoSolicitado);

      if (!nuevoEstado) {
        return res.status(400).json({
          ok: false,
          message:
            'El estado de publicación debe ser Publicado o No Publicado',
        });
      }

      const resultado = await emprendimientoService.cambiarPublicacion(
        id,
        nuevoEstado,
      );

      if (!resultado.ok) {
        return res.status(resultado.status).json({
          ok: false,
          message: resultado.message,
          ...(resultado.camposFaltantes
            ? { camposFaltantes: resultado.camposFaltantes }
            : {}),
        });
      }

      return res.status(200).json({
        ok: true,
        message: resultado.message,
        data: {
          id: resultado.emprendimiento.id,
          nombre: resultado.emprendimiento.nombre,
          estadoPublicacion:
            resultado.emprendimiento.estadoPublicacion,
          fechaPublicacion:
            resultado.emprendimiento.fechaPublicacion,
        },
      });
    } catch (error: unknown) {
      next(error);
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
      const cuerpo = req.body as Record<string, unknown> | undefined;

      if (
        cuerpo &&
        ('estadoPublicacion' in cuerpo || 'estado' in cuerpo)
      ) {
        return res.status(400).json({
          ok: false,
          message:
            'El estado de publicación solo puede cambiarse mediante el endpoint de publicación',
        });
      }

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
