import type { NextFunction, Request, Response } from 'express';
import { Temporada, TipoActividad } from '../../../models/EventosCapacitaciones';
import { EventosService, LIMITE_EVENTOS } from './eventos.service';

const service = new EventosService();

export class EventosController {
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      
      if (Object.keys(req.query).some((clave) =>
        /^(buscar|temporada|tipoActividad|pagina)\[/.test(clave),
      )) {
        return res.status(400).json({
          ok: false,
          message: 'Los filtros deben ser valores simples y no compuestos.',
        });
      }

      const { buscar, temporada, tipoActividad, pagina: paginaQuery } = req.query;

      if (
        buscar !== undefined &&
        (typeof buscar !== 'string' || buscar.trim().length > 150)
      ) {
        return res.status(400).json({
          ok: false,
          message: 'La búsqueda debe ser un texto de hasta 150 caracteres.',
        });
      }

      if (
        temporada !== undefined &&
        (typeof temporada !== 'string' ||
          !Object.values(Temporada).includes(temporada as Temporada))
      ) {
        return res.status(400).json({
          ok: false,
          message: 'La temporada debe ser seca o lluviosa.',
        });
      }

      if (
        tipoActividad !== undefined &&
        (typeof tipoActividad !== 'string' ||
          !Object.values(TipoActividad).includes(tipoActividad as TipoActividad))
      ) {
        return res.status(400).json({
          ok: false,
          message: 'El tipo de actividad debe ser evento o capacitacion.',
        });
      }

      const pagina = paginaQuery === undefined
        ? 1
        : typeof paginaQuery === 'string'
          ? Number(paginaQuery)
          : Number.NaN;

      if (
        (paginaQuery !== undefined &&
          (typeof paginaQuery !== 'string' || !/^[1-9]\d*$/.test(paginaQuery))) ||
        !Number.isSafeInteger(pagina) ||
        !Number.isSafeInteger((pagina - 1) * LIMITE_EVENTOS)
      ) {
        return res.status(400).json({
          ok: false,
          message: 'La página debe ser un número entero positivo válido.',
        });
      }

      const resultado = await service.listar({
        ...(typeof buscar === 'string' ? { buscar: buscar.trim() } : {}),
        ...(temporada !== undefined ? { temporada: temporada as Temporada } : {}),
        ...(tipoActividad !== undefined
          ? { tipoActividad: tipoActividad as TipoActividad }
          : {}),
        pagina,
      });

      return res.status(200).json({ ok: true, ...resultado });
    } catch (error) {
      return next(error);
    }
  }

  async obtenerDetalle(req: Request, res: Response, next: NextFunction) {
    try {
      const idQuery = req.params.id;

      if (
        typeof idQuery !== 'string' ||
        !/^[1-9]\d*$/.test(idQuery) ||
        !Number.isSafeInteger(Number(idQuery))
      ) {
        return res.status(400).json({
          ok: false,
          message: 'El id debe ser un número entero positivo.',
        });
      }

      const evento = await service.obtenerDetalle(Number(idQuery));

      return res.status(200).json({ ok: true, data: evento });
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFoundError') {
        return res.status(404).json({ ok: false, message: error.message });
      }

      return next(error);
    }
  }
}
