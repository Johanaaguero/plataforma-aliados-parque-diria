import { Router } from 'express';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import { AppDataSource } from '../../data-source';
import { ConfiguracionVisual, EpocaParque } from '../../models/ConfiguracionVisual';
import { verificarToken } from '../../middlewares/auth.middleware';
import { autorizarRoles } from '../../middlewares/authorization.middleware';
import { upload } from '../../middlewares/upload';

const router = Router();
const repo = () => AppDataSource.getRepository(ConfiguracionVisual);
const LIMITE_IMAGENES = 8;

const obtener = async () => {
  let configuracion = await repo().findOneBy({ id: 1 });
  if (!configuracion) {
    configuracion = await repo().save(repo().create({ id: 1, epoca: 'seca', heroImagenes: [], heroLeyendas: [], galeriaImagenes: [] }));
  }
  return configuracion;
};

const leerLista = (valor: unknown, campo: string): string[] | undefined => {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string') throw new Error(`El campo ${campo} no es válido.`);
  const lista: unknown = JSON.parse(valor);
  if (!Array.isArray(lista) || lista.some((item) => typeof item !== 'string')) throw new Error(`El campo ${campo} no es válido.`);
  return lista.map((item) => item.trim()).filter(Boolean).slice(0, LIMITE_IMAGENES);
};

const leerTexto = (valor: unknown, limite: number, campo: string): string | null | undefined => {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string') throw new Error(`El campo ${campo} no es válido.`);
  return valor.trim().slice(0, limite) || null;
};

type ItemOrdenImagen = { url?: string; archivo?: number };

const leerOrden = (valor: unknown, campo: string): ItemOrdenImagen[] | undefined => {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string') throw new Error(`El campo ${campo} no es válido.`);
  const orden: unknown = JSON.parse(valor);
  if (!Array.isArray(orden) || orden.some((item) => !item || typeof item !== 'object')) throw new Error(`El campo ${campo} no es válido.`);
  return orden.slice(0, LIMITE_IMAGENES).map((item) => {
    const valorItem = item as Record<string, unknown>;
    if (typeof valorItem.url === 'string') return { url: valorItem.url };
    if (typeof valorItem.archivo === 'number' && Number.isInteger(valorItem.archivo) && valorItem.archivo >= 0) return { archivo: valorItem.archivo };
    throw new Error(`El campo ${campo} no es válido.`);
  });
};

const ordenarImagenes = (existentes: string[], nuevas: string[], orden?: ItemOrdenImagen[]): string[] => {
  if (!orden) return [...existentes, ...nuevas].slice(0, LIMITE_IMAGENES);
  const permitidas = new Set(existentes);
  const resultado = orden.flatMap((item): string[] => {
    if (item.url && permitidas.has(item.url)) return [item.url];
    const nueva = item.archivo === undefined ? undefined : nuevas[item.archivo];
    return nueva ? [nueva] : [];
  });
  return [...new Set(resultado)].slice(0, LIMITE_IMAGENES);
};

const guardarArchivos = async (archivos: Express.Multer.File[]): Promise<string[]> => {
  if (!archivos.length) return [];
  const directorio = path.join(process.cwd(), 'uploads', 'configuracion-visual');
  await mkdir(directorio, { recursive: true });
  return Promise.all(archivos.map(async (archivo) => {
    const extension = archivo.mimetype === 'image/png' ? 'png' : archivo.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const nombre = `inicio-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;
    await writeFile(path.join(directorio, nombre), archivo.buffer);
    return `/uploads/configuracion-visual/${nombre}`;
  }));
};

router.get('/', async (_req, res) => {
  try {
    return res.status(200).json(await obtener());
  } catch (error) {
    console.error('No se pudo obtener la configuración visual:', error);
    return res.status(500).json({ message: 'No se pudo obtener la configuración visual.' });
  }
});

router.patch(
  '/',
  verificarToken,
  autorizarRoles('super_admin', 'superadministrador'),
  upload.fields([
    { name: 'imagenes', maxCount: 5 },
    { name: 'heroArchivos', maxCount: LIMITE_IMAGENES },
    { name: 'sobreArchivo', maxCount: 1 },
    { name: 'galeriaArchivos', maxCount: LIMITE_IMAGENES },
  ]),
  async (req, res) => {
    try {
      const configuracion = await obtener();
      const epoca = req.body?.epoca;
      if (epoca !== undefined) {
        if (epoca !== 'seca' && epoca !== 'lluviosa') return res.status(400).json({ message: 'La época no es válida.' });
        configuracion.epoca = epoca as EpocaParque;
      }

      const heroImagenes = leerLista(req.body?.heroImagenes, 'heroImagenes');
      const heroLeyendas = leerLista(req.body?.leyendas, 'leyendas');
      const galeriaImagenes = leerLista(req.body?.galeriaImagenes, 'galeriaImagenes');
      const heroOrden = leerOrden(req.body?.heroOrden, 'heroOrden');
      const galeriaOrden = leerOrden(req.body?.galeriaOrden, 'galeriaOrden');
      const heroTitulo = leerTexto(req.body?.heroTitulo, 180, 'heroTitulo');
      const heroEslogan = leerTexto(req.body?.heroEslogan, 280, 'heroEslogan');
      const sobreImagen = leerTexto(req.body?.sobreImagen, 500, 'sobreImagen');
      const archivos = (req.files ?? {}) as Record<string, Express.Multer.File[]>;

      const nuevasHero = await guardarArchivos([...(archivos.heroArchivos ?? []), ...(archivos.imagenes ?? [])]);
      const nuevasGaleria = await guardarArchivos(archivos.galeriaArchivos ?? []);
      const nuevaSobre = (await guardarArchivos(archivos.sobreArchivo ?? []))[0];

      if (heroImagenes !== undefined || nuevasHero.length) configuracion.heroImagenes = ordenarImagenes(heroImagenes ?? configuracion.heroImagenes ?? [], nuevasHero, heroOrden);
      if (galeriaImagenes !== undefined || nuevasGaleria.length) configuracion.galeriaImagenes = ordenarImagenes(galeriaImagenes ?? configuracion.galeriaImagenes ?? [], nuevasGaleria, galeriaOrden);
      if (heroLeyendas !== undefined) configuracion.heroLeyendas = heroLeyendas.slice(0, LIMITE_IMAGENES);
      if (heroTitulo !== undefined) configuracion.heroTitulo = heroTitulo;
      if (heroEslogan !== undefined) configuracion.heroEslogan = heroEslogan;
      if (sobreImagen !== undefined || nuevaSobre) configuracion.sobreImagen = nuevaSobre ?? sobreImagen ?? null;

      return res.status(200).json(await repo().save(configuracion));
    } catch (error) {
      console.error('No se pudo actualizar la configuración visual:', error);
      return res.status(400).json({ message: error instanceof Error ? error.message : 'No se pudo actualizar la configuración visual.' });
    }
  },
);

export default router;
