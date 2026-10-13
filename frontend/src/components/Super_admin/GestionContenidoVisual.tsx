import { useEffect, useState } from 'react';

import {
  actualizarConfiguracionVisual,
  obtenerConfiguracionVisual,
  urlVisual,
} from '../../services/configuracionVisualService';

type ImagenEditable = { id: string; url: string; archivo?: File };

const MAXIMO_IMAGENES = 8;
const MAXIMO_BYTES = 5 * 1024 * 1024;

const crearImagenesExistentes = (urls: string[] | null | undefined): ImagenEditable[] =>
  (urls ?? []).filter(Boolean).map((url) => ({ id: `url-${url}`, url }));

const mover = <T,>(elementos: T[], indice: number, direccion: -1 | 1): T[] => {
  const destino = indice + direccion;
  if (destino < 0 || destino >= elementos.length) return elementos;
  const copia = [...elementos];
  [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
  return copia;
};

export default function GestionContenidoVisual() {
  const [epoca, setEpoca] = useState<'seca' | 'lluviosa'>('seca');
  const [titulo, setTitulo] = useState('');
  const [eslogan, setEslogan] = useState('');
  const [leyendas, setLeyendas] = useState<string[]>([]);
  const [hero, setHero] = useState<ImagenEditable[]>([]);
  const [sobre, setSobre] = useState<ImagenEditable | null>(null);
  const [galeria, setGaleria] = useState<ImagenEditable[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'guardando' | 'error'>('cargando');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let activo = true;
    obtenerConfiguracionVisual()
      .then((datos) => {
        if (!activo) return;
        setEpoca(datos.epoca);
        setTitulo(datos.heroTitulo ?? '');
        setEslogan(datos.heroEslogan ?? '');
        setLeyendas(datos.heroLeyendas ?? []);
        setHero(crearImagenesExistentes(datos.heroImagenes));
        setGaleria(crearImagenesExistentes(datos.galeriaImagenes));
        setSobre(datos.sobreImagen ? { id: `url-${datos.sobreImagen}`, url: datos.sobreImagen } : null);
        setEstado('listo');
      })
      .catch((error: unknown) => {
        if (!activo) return;
        setEstado('error');
        setMensaje(error instanceof Error ? error.message : 'No se pudo cargar la configuración visual.');
      });
    return () => { activo = false; };
  }, []);

  const seleccionarImagenes = (
    archivos: FileList | null,
    actuales: ImagenEditable[],
    asignar: (imagenes: ImagenEditable[]) => void,
  ) => {
    const validos = Array.from(archivos ?? []).filter((archivo) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) && archivo.size <= MAXIMO_BYTES,
    );
    if (validos.length !== (archivos?.length ?? 0)) {
      setMensaje('Solo se permiten imágenes JPG, PNG o WEBP de hasta 5 MB.');
    }
    const disponibles = MAXIMO_IMAGENES - actuales.length;
    asignar([...actuales, ...validos.slice(0, disponibles).map((archivo, indice) => ({
      id: `archivo-${archivo.name}-${archivo.lastModified}-${indice}`,
      url: URL.createObjectURL(archivo),
      archivo,
    }))]);
  };

  const construirOrden = (imagenes: ImagenEditable[]) => {
    let indiceArchivo = 0;
    return imagenes.map((imagen) => imagen.archivo
      ? { archivo: indiceArchivo++ }
      : { url: imagen.url });
  };

  const guardar = async () => {
    setEstado('guardando');
    setMensaje('');
    try {
      const datos = new FormData();
      datos.append('epoca', epoca);
      datos.append('heroTitulo', titulo);
      datos.append('heroEslogan', eslogan);
      datos.append('leyendas', JSON.stringify(leyendas.map((texto) => texto.trim())));
      datos.append('heroImagenes', JSON.stringify(hero.filter((imagen) => !imagen.archivo).map((imagen) => imagen.url)));
      datos.append('heroOrden', JSON.stringify(construirOrden(hero)));
      datos.append('galeriaImagenes', JSON.stringify(galeria.filter((imagen) => !imagen.archivo).map((imagen) => imagen.url)));
      datos.append('galeriaOrden', JSON.stringify(construirOrden(galeria)));
      datos.append('sobreImagen', sobre?.archivo ? '' : (sobre?.url ?? ''));
      hero.forEach((imagen) => { if (imagen.archivo) datos.append('heroArchivos', imagen.archivo); });
      galeria.forEach((imagen) => { if (imagen.archivo) datos.append('galeriaArchivos', imagen.archivo); });
      if (sobre?.archivo) datos.append('sobreArchivo', sobre.archivo);

      const actualizada = await actualizarConfiguracionVisual(datos);
      setHero(crearImagenesExistentes(actualizada.heroImagenes));
      setGaleria(crearImagenesExistentes(actualizada.galeriaImagenes));
      setSobre(actualizada.sobreImagen ? { id: `url-${actualizada.sobreImagen}`, url: actualizada.sobreImagen } : null);
      setLeyendas(actualizada.heroLeyendas ?? []);
      setTitulo(actualizada.heroTitulo ?? '');
      setEslogan(actualizada.heroEslogan ?? '');
      setEstado('listo');
      setMensaje('Contenido visual guardado correctamente.');
      window.dispatchEvent(new CustomEvent('configuracion-visual:actualizada', { detail: actualizada }));
    } catch (error: unknown) {
      setEstado('error');
      setMensaje(error instanceof Error ? error.message : 'No se pudo guardar la configuración visual.');
    }
  };

  const renderGaleria = (
    tituloBloque: string,
    descripcion: string,
    imagenes: ImagenEditable[],
    asignar: (imagenes: ImagenEditable[]) => void,
    etiquetaInput: string,
  ) => (
    <section className="rounded-3xl border border-white/20 bg-white/55 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold text-emerald-950 dark:text-white">{tituloBloque}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{descripcion}</p></div>
        <label className="cursor-pointer rounded-xl border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-600/20 dark:text-emerald-200">
          Añadir imágenes
          <input aria-label={etiquetaInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => { seleccionarImagenes(event.target.files, imagenes, asignar); event.currentTarget.value = ''; }} />
        </label>
      </div>
      {imagenes.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-white/15 dark:text-slate-300">No hay imágenes configuradas todavía.</p> : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {imagenes.map((imagen, indice) => <article key={imagen.id} className="overflow-hidden rounded-2xl border border-white/30 bg-white/60 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <img src={imagen.archivo ? imagen.url : urlVisual(imagen.url)} alt={`Vista previa ${indice + 1}`} className="h-28 w-full object-cover" />
            <div className="flex items-center justify-between gap-1 p-2">
              <button type="button" aria-label="Mover a la izquierda" disabled={indice === 0} onClick={() => asignar(mover(imagenes, indice, -1))} className="rounded-lg px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-white/10">‹</button>
              <button type="button" aria-label="Eliminar imagen" onClick={() => asignar(imagenes.filter((item) => item.id !== imagen.id))} className="rounded-lg bg-rose-500/10 px-2 py-1 text-sm font-bold text-rose-700 hover:bg-rose-500/20 dark:text-rose-200">×</button>
              <button type="button" aria-label="Mover a la derecha" disabled={indice === imagenes.length - 1} onClick={() => asignar(mover(imagenes, indice, 1))} className="rounded-lg px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-white/10">›</button>
            </div>
          </article>)}
        </div>
      )}
    </section>
  );

  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
    <section className="rounded-[2rem] border border-white/20 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-600">Superadministración</p>
      <h1 className="mt-2 text-3xl font-black text-emerald-950 dark:text-white">Gestión de Contenido Visual y Temporadas</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Controla el carrusel, las imágenes de portada, textos y la temporada visible en Inicio.</p>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {(['seca', 'lluviosa'] as const).map((opcion) => <button key={opcion} type="button" onClick={() => setEpoca(opcion)} className={`rounded-2xl border p-5 text-left transition ${epoca === opcion ? (opcion === 'seca' ? 'border-amber-400 bg-amber-400/15 ring-2 ring-amber-400/20' : 'border-sky-400 bg-sky-400/15 ring-2 ring-sky-400/20') : 'border-slate-200 bg-white/40 dark:border-slate-700 dark:bg-white/5'}`}><span className="text-3xl">{opcion === 'seca' ? '☀️' : '💧'}</span><p className="mt-2 font-bold text-slate-900 dark:text-white">Época {opcion}</p></button>)}
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-800 dark:text-white">Título principal<input value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength={180} className="mt-1 w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-950/40 dark:text-white" /></label>
        <label className="text-sm font-bold text-slate-800 dark:text-white">Eslogan descriptivo<input value={eslogan} onChange={(event) => setEslogan(event.target.value)} maxLength={280} className="mt-1 w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-950/40 dark:text-white" /></label>
      </div>

      <div className="mt-7 space-y-4">
        {renderGaleria('Carrusel principal', 'Reordena, elimina o agrega fotografías para el Hero.', hero, setHero, 'Añadir imágenes al carrusel')}
        <section className="rounded-3xl border border-white/20 bg-white/55 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45"><h2 className="text-lg font-bold text-emerald-950 dark:text-white">Leyendas del carrusel</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{Array.from({ length: Math.max(hero.length, 1) }).map((_, indice) => <label key={hero[indice]?.id ?? indice} className="text-sm font-bold text-slate-800 dark:text-white">Leyenda {indice + 1}<input value={leyendas[indice] ?? ''} onChange={(event) => setLeyendas((actuales) => { const siguiente = [...actuales]; siguiente[indice] = event.target.value; return siguiente; })} maxLength={150} className="mt-1 w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-950/40 dark:text-white" /></label>)}</div></section>

        <section className="rounded-3xl border border-white/20 bg-white/55 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-emerald-950 dark:text-white">Conoce quiénes somos y el parque</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Imagen principal de la reseña institucional.</p></div><label className="cursor-pointer rounded-xl border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-600/20 dark:text-emerald-200">Reemplazar imagen<input aria-label="Reemplazar imagen de quiénes somos" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const archivo = event.target.files?.[0]; if (archivo && archivo.size <= MAXIMO_BYTES && ['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) setSobre({ id: `archivo-sobre-${archivo.name}-${archivo.lastModified}`, url: URL.createObjectURL(archivo), archivo }); else if (archivo) setMensaje('Solo se permiten imágenes JPG, PNG o WEBP de hasta 5 MB.'); event.currentTarget.value = ''; }} /></label></div>{sobre ? <div className="mt-4 max-w-sm overflow-hidden rounded-2xl border border-white/30 bg-white/60"><img src={sobre.archivo ? sobre.url : urlVisual(sobre.url)} alt="Vista previa de quiénes somos" className="h-40 w-full object-cover" /><button type="button" onClick={() => setSobre(null)} className="m-2 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-200">Eliminar imagen</button></div> : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-white/15 dark:text-slate-300">Se usará la imagen institucional predeterminada hasta que subas una.</p>}</section>

        {renderGaleria('Banners y fotos secundarias', 'Controla la galería y las imágenes de las tarjetas visuales de la portada.', galeria, setGaleria, 'Añadir imágenes secundarias')}
      </div>

      {mensaje && <p role="status" className={`mt-5 rounded-xl px-4 py-3 text-sm ${estado === 'error' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-200' : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-100'}`}>{mensaje}</p>}
      <button type="button" disabled={estado === 'guardando' || estado === 'cargando'} onClick={() => void guardar()} className="mt-6 rounded-full bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-600 disabled:opacity-60">{estado === 'guardando' ? 'Guardando…' : 'Guardar contenido visual'}</button>
    </section>
  </div>;
}
