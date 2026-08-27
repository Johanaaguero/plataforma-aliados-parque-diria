import { NextFunction, Request, Response } from 'express';

import { emprendimientoService } from './emprendimiento.service';

import { EstadoPublicacion } from '../../../models/Emprendimiento';

const ESTADOS_TEXTO: Record<string, EstadoPublicacion> = {
  Borrador: EstadoPublicacion.BORRADOR,
  'No Publicado': EstadoPublicacion.NO_PUBLICADO,
  Publicado: EstadoPublicacion.PUBLICADO,
  Desactivado: EstadoPublicacion.DESACTIVADO,
};


const convertirEstadoPublicacion = (
  valor: unknown,
): EstadoPublicacion | null => {
  if (typeof valor !== 'string') {
    return null;
  }

  if (
    Object.values(EstadoPublicacion).includes(
      valor as EstadoPublicacion,
    )
  ) {
    return valor as EstadoPublicacion;
  }

  return ESTADOS_TEXTO[valor] ?? null;
};

const obtenerArchivos = (
  archivos: Express.Multer.File[] | { [campo: string]: Express.Multer.File[] },
): Express.Multer.File[] =>
  (Array.isArray(archivos)
    ? archivos
    : Object.values(archivos).flat()
  ).filter((archivo) => archivo.fieldname === 'imagen' || archivo.fieldname === 'imagenes');


const validarActualizacion = (
  body: Record<string, unknown>,
): string | null => {

  if (!body || typeof body !== 'object') {
    return 'Los datos de actualización son inválidos';
  }

  // ==========================================================
  // NOMBRE
  // ==========================================================

  if (
    body.nombre !== undefined &&
    (
      typeof body.nombre !== 'string' ||
      body.nombre.trim() === ''
    )
  ) {
    return 'El nombre no puede estar vacío';
  }

  // ==========================================================
  // CATEGORÍA
  // ==========================================================

  if (
    body.categoriaId !== undefined &&
    body.categoriaId !== ''
  ) {
    const categoriaId = Number(body.categoriaId);

    if (
      !Number.isInteger(categoriaId) ||
      categoriaId <= 0
    ) {
      return 'La categoría seleccionada no es válida';
    }
  }

  // ==========================================================
  // LATITUD
  // ==========================================================

  if (
    body.latitud !== undefined &&
    body.latitud !== ''
  ) {
    const latitud = Number(body.latitud);

    if (Number.isNaN(latitud)) {
      return 'La latitud no es válida';
    }

    if (latitud < -90 || latitud > 90) {
      return 'La latitud debe estar entre -90 y 90';
    }
  }

  // ==========================================================
  // LONGITUD
  // ==========================================================

  if (
    body.longitud !== undefined &&
    body.longitud !== ''
  ) {
    const longitud = Number(body.longitud);

    if (Number.isNaN(longitud)) {
      return 'La longitud no es válida';
    }

    if (longitud < -180 || longitud > 180) {
      return 'La longitud debe estar entre -180 y 180';
    }
  }

  // ==========================================================
  // CORREO
  // ==========================================================

  if (
    body.correoElectronico !== undefined &&
    body.correoElectronico !== ''
  ) {
    if (
      typeof body.correoElectronico !== 'string'
    ) {
      return 'El correo electrónico no es válido';
    }

    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !correoValido.test(
        body.correoElectronico.trim(),
      )
    ) {
      return 'El correo electrónico no es válido';
    }
  }

  
  if (
    body.telefono !== undefined &&
    body.telefono !== ''
  ) {
    if (typeof body.telefono !== 'string') {
      return 'El teléfono no es válido';
    }

    if (body.telefono.trim().length < 8) {
      return 'El teléfono debe tener al menos 8 caracteres';
    }
  }

  return null;
};


export class EmprendimientoController {

  async crear(
    req: Request,
    res: Response,
  ): Promise<Response> {

    try {

      const rolUsuario = req.usuario?.rol;

  
      const modo = req.body.modo;

      if (
        modo !== undefined &&
        modo !== 'borrador' &&
        modo !== 'cambios'
      ) {
        return res.status(400).json({
          ok: false,
          message:
            'El modo de guardado debe ser "borrador" o "cambios"',
        });
      }

 
      let estadoPublicacion:
        | EstadoPublicacion
        | undefined;

      if (
        req.body.estadoPublicacion !== undefined
      ) {

        const estadoConvertido =
          convertirEstadoPublicacion(
            req.body.estadoPublicacion,
          );

        if (!estadoConvertido) {
          return res.status(400).json({
            ok: false,
            message:
              'El estado de publicación no es válido',
          });
        }

        estadoPublicacion =
          estadoConvertido;
      }

      const archivos = req.files
        ? obtenerArchivos(req.files)
        : [];

      const dto = {

        nombre:
          req.body.nombre,

        descripcion:
          req.body.descripcion ||
          undefined,

        ...(req.body.categoriaId !== undefined &&
        req.body.categoriaId !== ''
          ? {
              categoriaId: Number(
                req.body.categoriaId,
              ),
            }
          : {}),

          provincia:
  req.body.provincia ||
  undefined,

canton:
  req.body.canton ||
  undefined,

distrito:
  req.body.distrito ||
  undefined,


        direccion:
          req.body.direccion ||
          undefined,


        ...(req.body.latitud !== undefined &&
        req.body.latitud !== ''
          ? {
              latitud: Number(
                req.body.latitud,
              ),
            }
          : {}),

        ...(req.body.longitud !== undefined &&
        req.body.longitud !== ''
          ? {
              longitud: Number(
                req.body.longitud,
              ),
            }
          : {}),

        correoElectronico:
          req.body.correoElectronico ||
          undefined,

        telefono:
          req.body.telefono ||
          undefined,

          ...(archivos.length > 0
          ? {
              imagen: archivos[0]!.buffer,
            imagenes: archivos.map((archivo) => ({
                buffer: archivo.buffer,
                tipoMime: archivo.mimetype,
              })),
            }
          : {}),

        // ======================================================
        // MODO
        // ======================================================

        ...(modo !== undefined
          ? {
              modo,
            }
          : {}),

        // ======================================================
        // ESTADO
        // ======================================================

        ...(estadoPublicacion !== undefined
          ? {
              estadoPublicacion,
            }
          : {}),

        // ======================================================
        // DUEÑO
        // ======================================================

        ...(rolUsuario === 'asociado' &&
        req.usuario?.id !== undefined
          ? {
              asociadoId:
                req.usuario.id,
            }
          : {}),
      };

      // ========================================================
      // CREAR
      // ========================================================

      const emprendimiento =
        await emprendimientoService.crear(
          dto,
        );

      return res
        .status(201)
        .json(
          emprendimiento.toPublic(),
        );

    } catch (error: any) {

      return res.status(400).json({
        ok: false,
        mensaje: error.message,
      });
    }
  }

  // ============================================================
  // LISTADOS
  // ============================================================

  async obtenerTodos(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {

    try {

      const { estado } = req.query;

      let estadoPublicacion:
        | EstadoPublicacion
        | undefined;

      if (estado) {

        const convertido =
          convertirEstadoPublicacion(
            estado,
          );

        if (!convertido) {
          return res.status(400).json({
            ok: false,
            message:
              'El estado de publicación debe ser Borrador, No Publicado, Publicado o Desactivado',
          });
        }

        estadoPublicacion =
          convertido;
      }

      const usuarioId =
        req.usuario?.id;

      const rolUsuario =
        req.usuario?.rol;

      if (!usuarioId || !rolUsuario) {
        return res.status(401).json({
          ok: false,
          message:
            'Usuario autenticado no encontrado',
        });
      }

      const emprendimientos =
        await emprendimientoService.obtenerVisiblesParaUsuario(
          usuarioId,
          rolUsuario,
          estadoPublicacion,
        );

      // ========================================================
      // ADMINISTRADOR
      // ========================================================

      if (
        rolUsuario === 'administrador'
      ) {

        const respuesta =
          emprendimientos.map(
            (emprendimiento) => ({

              id:
                emprendimiento.id,

              nombre:
                emprendimiento.nombre,

              descripcion:
                emprendimiento.descripcion,

              categoria:
                emprendimiento.categoria
                  ? emprendimiento.categoria.nombre
                  : null,

              categoriaId:
                emprendimiento.categoria?.id ??
                null,

              asociadoId:
                emprendimiento.asociado?.id ??
                null,

              asociado:
                emprendimiento.asociado
                  ? {
                      id:
                        emprendimiento.asociado.id,

                      nombre:
                        emprendimiento.asociado.nombre ??
                        null,

                      correo:
                        emprendimiento.asociado.correo ??
                        null,
                    }
                  : null,

              direccion:
                emprendimiento.direccion,
                provincia:
  emprendimiento.provincia,

canton:
  emprendimiento.canton,

distrito:
  emprendimiento.distrito,

              latitud:
                emprendimiento.latitud,

              longitud:
                emprendimiento.longitud,

              correoElectronico:
                emprendimiento.correoElectronico,

              telefono:
                emprendimiento.telefono,

              estadoPublicacion:
                emprendimiento.estadoPublicacion,

              fechaPublicacion:
                emprendimiento.fechaPublicacion,

              imagen:
                emprendimiento.imagen
                  ? `data:image/jpeg;base64,${emprendimiento.imagen.toString(
                      'base64',
                    )}`
                  : null,

                  imagenes: emprendimiento.toPublic().imagenes,

              fechaCreacion:
                emprendimiento.fechaCreacion,

              fechaActualizacion:
                emprendimiento.fechaActualizacion,
            }),
          );

        return res
          .status(200)
          .json(respuesta);
      }

      // ========================================================
      // ASOCIADO
      // ========================================================

      return res
        .status(200)
        .json(
          emprendimientos.map(
            (emprendimiento) =>
              emprendimiento.toPublic(false),
          ),
        );

    } catch (error: unknown) {

      next(error);
    }
  }

  // ============================================================
  // CATÁLOGO PÚBLICO
  // ============================================================

  async obtenerCatalogoPublico(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {

    try {

      const emprendimientos =
        await emprendimientoService.obtenerCatalogoPublico();

      return res
        .status(200)
        .json(
          emprendimientos.map(
            (emprendimiento) =>
              emprendimiento.toPublic(),
          ),
        );

    } catch (error: unknown) {

      next(error);
    }
  }

  async obtenerDetalleCatalogoPublico(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const id = Number(req.params.id);
      const emprendimiento = await emprendimientoService.obtenerPorId(id);

      if (emprendimiento.estadoPublicacion !== EstadoPublicacion.PUBLICADO) {
        return res.status(404).json({ mensaje: 'Emprendimiento no encontrado' });
      }

      return res.status(200).json(emprendimiento.toPublic());
    } catch (error: unknown) {
      next(error);
    }
  }

  // ============================================================
  // CAMBIO DE ESTADO
  // ============================================================

  async cambiarPublicacion(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {

    try {

      const id =
        Number(req.params.id);

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            'El ID del emprendimiento no es válido',
        });
      }

      const rolUsuario =
        req.usuario?.rol;

      if (!rolUsuario) {
        return res.status(401).json({
          ok: false,
          message:
            'Usuario autenticado no encontrado',
        });
      }

      const cuerpo =
        req.body as
          | Record<string, unknown>
          | undefined;

      const estadoSolicitado =
        cuerpo?.estadoPublicacion ??
        cuerpo?.estado;

      const nuevoEstado =
        convertirEstadoPublicacion(
          estadoSolicitado,
        );

      if (!nuevoEstado) {
        return res.status(400).json({
          ok: false,
          message:
            'El estado de publicación debe ser Borrador, No Publicado, Publicado o Desactivado',
        });
      }

      const resultado =
        await emprendimientoService.cambiarPublicacion(
          id,
          nuevoEstado,
          rolUsuario,
        );

      if (!resultado.ok) {

        return res
          .status(resultado.status)
          .json({
            ok: false,
            message:
              resultado.message,

            ...(resultado.camposFaltantes
              ? {
                  camposFaltantes:
                    resultado.camposFaltantes,
                }
              : {}),
          });
      }

      return res.status(200).json({
        ok: true,
        message:
          resultado.message,

        data: {

          id:
            resultado.emprendimiento.id,

          nombre:
            resultado.emprendimiento.nombre,

          estadoPublicacion:
            resultado.emprendimiento
              .estadoPublicacion,

          fechaPublicacion:
            resultado.emprendimiento
              .fechaPublicacion,
        },
      });

    } catch (error: unknown) {

      next(error);
    }
  }

  // ============================================================
  // OBTENER POR ID
  // ============================================================

  async obtenerPorId(
    req: Request,
    res: Response,
  ): Promise<Response> {

    try {

      const id =
        Number(req.params.id);

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'El ID del emprendimiento no es válido',
        });
      }

      const usuarioId =
        req.usuario?.id;

      const rolUsuario =
        req.usuario?.rol;

      // ========================================================
      // USUARIO AUTENTICADO
      // ========================================================

      if (
        usuarioId &&
        rolUsuario
      ) {

        const emprendimiento =
          await emprendimientoService.obtenerVisiblePorId(
            id,
            usuarioId,
            rolUsuario,
          );

        if (!emprendimiento) {
          return res.status(404).json({
            mensaje:
              'Emprendimiento no encontrado',
          });
        }

        // ======================================================
        // ADMINISTRADOR
        // ======================================================

        if (
          rolUsuario === 'administrador'
        ) {

          return res.status(200).json({

            id:
              emprendimiento.id,

            nombre:
              emprendimiento.nombre,

            descripcion:
              emprendimiento.descripcion,

            categoria:
              emprendimiento.categoria
                ? emprendimiento.categoria.nombre
                : null,

            categoriaId:
              emprendimiento.categoria?.id ??
              null,

            asociadoId:
              emprendimiento.asociado?.id ??
              null,

            asociado:
              emprendimiento.asociado
                ? {

                    id:
                      emprendimiento.asociado.id,

                    nombre:
                      emprendimiento.asociado.nombre ??
                      null,

                    correo:
                      emprendimiento.asociado.correo ??
                      null,
                  }
                : null,

            direccion:
              emprendimiento.direccion,

              provincia:
  emprendimiento.provincia,

canton:
  emprendimiento.canton,

distrito:
  emprendimiento.distrito,

            latitud:
              emprendimiento.latitud,

            longitud:
              emprendimiento.longitud,

            correoElectronico:
              emprendimiento.correoElectronico,

            telefono:
              emprendimiento.telefono,

            estadoPublicacion:
              emprendimiento.estadoPublicacion,

            fechaPublicacion:
              emprendimiento.fechaPublicacion,

            imagen:
              emprendimiento.imagen
                ? `data:image/jpeg;base64,${emprendimiento.imagen.toString(
                    'base64',
                  )}`
                : null,

              imagenes: emprendimiento.toPublic().imagenes,

            fechaCreacion:
              emprendimiento.fechaCreacion,

            fechaActualizacion:
              emprendimiento.fechaActualizacion,
          });
        }

        // ======================================================
        // ASOCIADO
        // ======================================================

        return res
          .status(200)
          .json(
            emprendimiento.toPublic(),
          );
      }

      // ========================================================
      // VISITANTE
      // ========================================================

      const emprendimiento =
        await emprendimientoService.obtenerPorId(
          id,
        );

      if (
        emprendimiento.estadoPublicacion !==
        EstadoPublicacion.PUBLICADO
      ) {
        return res.status(404).json({
          mensaje:
            'Emprendimiento no encontrado',
        });
      }

      return res
        .status(200)
        .json(
          emprendimiento.toPublic(),
        );

    } catch (error: any) {

      return res.status(404).json({
        mensaje:
          error.message,
      });
    }
  }

  // ============================================================
  // ACTUALIZAR
  // ============================================================

 

async actualizarUbicacion(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'El ID del emprendimiento no es válido',
      });
    }

    const dto = {
      provincia: String(req.body.provincia ?? '').trim(),
      canton: String(req.body.canton ?? '').trim(),
      distrito: String(req.body.distrito ?? '').trim(),
      direccion: String(req.body.direccion ?? '').trim(),
      latitud: Number(req.body.latitud),
      longitud: Number(req.body.longitud),
    };

    const emprendimiento =
      await emprendimientoService.actualizarUbicacion(id, dto);

    return res.status(200).json({
      ok: true,
      message: 'Ubicación actualizada correctamente',
      data: emprendimiento.toPublic(),
    });
  } catch (error: any) {
    return res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
}

  async actualizar(req: Request, res: Response): Promise<Response> {
    try {

      const id =
        Number(req.params.id);

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            'El ID del emprendimiento no es válido',
        });
      }

      // ========================================================
      // USUARIO AUTENTICADO
      // ========================================================

      const usuarioId =
        req.usuario?.id;

      const rolUsuario =
        req.usuario?.rol;

      if (
        !usuarioId ||
        !rolUsuario
      ) {
        return res.status(401).json({
          ok: false,
          message:
            'Usuario autenticado no encontrado',
        });
      }

      // ========================================================
      // VALIDAR DATOS
      // ========================================================

      const errorValidacion =
        validarActualizacion(
          req.body as Record<string, unknown>,
        );

      if (errorValidacion) {
        return res.status(400).json({
          ok: false,
          mensaje:
            errorValidacion,
        });
      }

      const cuerpo =
        req.body as Record<string, unknown>;

      // ========================================================
      // VALIDAR MODO
      // ========================================================

      if (
        cuerpo.modo !== undefined &&
        cuerpo.modo !== 'borrador' &&
        cuerpo.modo !== 'cambios'
      ) {
        return res.status(400).json({
          ok: false,
          message:
            'El modo de guardado debe ser "borrador" o "cambios"',
        });
      }

      // ========================================================
      // EL ESTADO NO SE CAMBIA DIRECTAMENTE AQUÍ
      // ========================================================
      //
      // El estado se determina mediante "modo":
      //
      // borrador -> BORRADOR
      // cambios  -> NO_PUBLICADO
      //
      // Los cambios de publicación siguen utilizando
      // cambiarPublicacion().
      //
      // ========================================================

      if (
        'estadoPublicacion' in cuerpo ||
        'estado' in cuerpo
      ) {
        return res.status(400).json({
          ok: false,
          message:
            'El estado de publicación solo puede cambiarse mediante el modo de guardado o el endpoint de publicación',
        });
      }

      // ========================================================
      // CONSTRUIR DTO
      // ========================================================

      const archivos = req.files
        ? obtenerArchivos(req.files)
        : [];

      const dto = {
        ...req.body,

  ...(req.body.categoriaId !== undefined &&
  req.body.categoriaId !== ''
    ? {
        categoriaId: Number(req.body.categoriaId),
      }
    : {}),

        ...(typeof req.body.imagenesConservadas === 'string'
          ? { imagenesConservadas: JSON.parse(req.body.imagenesConservadas) as number[] }
          : {}),

        ...(req.body.portadaImagenId !== undefined && req.body.portadaImagenId !== ''
          ? { portadaImagenId: Number(req.body.portadaImagenId) }
          : {}),

        ...(req.body.portadaNueva === 'true'
          ? { portadaNueva: true }
          : {}),

        ...(req.body.eliminarImagen === 'true'
          ? { eliminarImagen: true }
          : {}),

        ...(req.body.categoriaId !== undefined &&
        req.body.categoriaId !== ''
          ? {
              categoriaId:
                Number(
                  req.body.categoriaId,
                ),
            }
          : {}),

        ...(req.body.latitud !== undefined &&
        req.body.latitud !== ''
          ? {
              latitud:
                Number(
                  req.body.latitud,
                ),
            }
          : {}),

        ...(req.body.longitud !== undefined &&
        req.body.longitud !== ''
          ? {
              longitud:
                Number(
                  req.body.longitud,
                ),
            }
          : {}),

          ...(archivos.length > 0
          ? {
              imagen: archivos[0]!.buffer,
            imagenes: archivos.map((archivo) => ({
                buffer: archivo.buffer,
                tipoMime: archivo.mimetype,
              })),
            }
          : {}),
      

  ...(req.file?.buffer !== undefined
    ? {
        imagen: req.file.buffer,
      }
    : {}),
};
      // ========================================================
      // ACTUALIZAR
      // ========================================================

      const emprendimiento =
        await emprendimientoService.actualizar(
          id,
          dto,
          usuarioId,
          rolUsuario,
        );

      return res
        .status(200)
        .json(
          emprendimiento.toPublic(),
        );

    } catch (error: any) {

      const status =
        error.status ?? 400;

      return res
        .status(status)
        .json({
          ok: false,
          mensaje:
            error.message,
        });
    }
  }

  // ============================================================
  // ELIMINAR
  // ============================================================

  async eliminar(
    req: Request,
    res: Response,
  ): Promise<Response> {

    try {

      const id =
        Number(req.params.id);

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'El ID del emprendimiento no es válido',
        });
      }

      await emprendimientoService.eliminar(
        id,
      );

      return res
        .status(204)
        .send();

    } catch (error: any) {

      return res.status(404).json({
        mensaje:
          error.message,
      });
    }
  }
}


export const emprendimientoController =
  new EmprendimientoController();