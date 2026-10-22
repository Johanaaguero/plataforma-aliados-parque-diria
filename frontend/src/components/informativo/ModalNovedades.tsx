import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

type Categoria = 'incidencias' | 'emprendimientos' | 'eventos' | 'comunicados';
interface Novedad { id: string | number; titulo: string; descripcion: string; fecha: string | null; imagen: string | null; categoria: Categoria; }
const categorias: { id: Categoria; etiqueta: string }[] = [{ id: 'incidencias', etiqueta: 'Afectación pública' }, { id: 'emprendimientos', etiqueta: 'Emprendimientos' }, { id: 'eventos', etiqueta: 'Eventos' }, { id: 'comunicados', etiqueta: 'Comunicados' }];
const texto = (valor: unknown) => typeof valor === 'string' ? valor : '';
const arreglo = (valor: unknown): Record<string, unknown>[] => { if (Array.isArray(valor)) return valor.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object'); if (valor && typeof valor === 'object') { const x = valor as Record<string, unknown>; return arreglo(x.data ?? x.incidencias ?? x.emprendimientos ?? x.eventos ?? x.comunicados); } return []; };
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

const cargarImagenesEvento = async (
  evento: Record<string, any>,
): Promise<Record<string, any>> => {
  if (evento.imagenes?.length || evento.id === undefined || evento.id === null) {
    return evento;
  }

  try {
    const respuesta = await fetch(
      `${apiUrl.replace(/\/$/, '')}/api/eventos-capacitaciones/${encodeURIComponent(String(evento.id))}/imagenes`,
    );
    const imagenes: unknown = await respuesta.json();

    return respuesta.ok && Array.isArray(imagenes)
      ? { ...evento, imagenes }
      : evento;
  } catch {
    return evento;
  }
};

export function obtenerUrlImagen(item: Record<string, any>, categoria: Categoria): string | null {
  if (categoria === 'incidencias') return null;

  const imagenEvento = item.imagenes?.[0];
  const imagenEmprendimiento = item.imagenes?.find((imagen: Record<string, unknown>) => imagen.esPortada)?.imagen ?? item.imagenes?.[0]?.imagen;
  const imagen = [
    categoria === 'eventos' ? imagenEvento?.imagen : null,
    categoria === 'eventos' && imagenEvento?.id ? `/api/eventos-capacitaciones/imagenes/${imagenEvento.id}` : null,
    categoria === 'emprendimientos' ? imagenEmprendimiento : null,
    item.imagen_url, item.fotoUrl, item.imagenUrl, item.bannerUrl, item.foto, item.imagen, item.urlImagen,
    item.adjunto, item.adjuntos?.[0], item.archivos?.[0]?.ruta, item.archivos?.[0]?.url,
  ].find((valor) => typeof valor === 'string' && valor.trim());
  if (typeof imagen !== 'string') return null;
  if (/^https?:\/\//i.test(imagen) || imagen.startsWith('data:')) return imagen;
  return `${apiUrl.replace(/\/$/, '')}/${imagen.replace(/^\/+/, '')}`;
}

function Icono({ categoria }: { categoria: Categoria }) { const rutas: Record<Categoria, string> = { incidencias: 'M12 3 2.8 20h18.4L12 3ZM12 9v5m0 3h.01', emprendimientos: 'M4 20h16M6 20V9l6-5 6 5v11M9 20v-5h6v5', eventos: 'M4 6h16v14H4zM8 3v6m8-6v6M4 10h16', comunicados: 'M4 11v2h3l5 4V7L7 11H4Zm11-2c1.2 1 1.2 5 0 6' }; return <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d={rutas[categoria]} /></svg>; }

export default function ModalNovedades({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState<Categoria>('incidencias'); const [items, setItems] = useState<Novedad[]>([]); const [cargando, setCargando] = useState(false); const [fallidas, setFallidas] = useState<Record<string, boolean>>({});
  useEffect(() => { if (!abierto) return; const rutas: Record<Categoria, string> = { incidencias: '/incidencias', emprendimientos: '/emprendimientos/catalogo', eventos: '/eventos', comunicados: '/comunicados' }; let activo = true; setCargando(true); setFallidas({}); void api.solicitar<unknown>(rutas[categoria], { method: 'GET' }, { incluirAuth: false, desempaquetarData: false }).then(async (respuesta) => { let datos = arreglo(respuesta).filter((x) => categoria !== 'incidencias' || x.esPublica === true || x.es_publica === true); if (categoria === 'eventos') datos = await Promise.all(datos.map(cargarImagenesEvento)); const novedades = datos.map((x) => ({ id: typeof x.id === 'number' || typeof x.id === 'string' ? x.id : crypto.randomUUID(), titulo: texto(x.titulo) || texto(x.nombre) || 'Novedad del Parque', descripcion: texto(x.descripcion) || texto(x.contenido) || 'Información disponible próximamente.', fecha: texto(x.fecha) || texto(x.fechaRegistro) || texto(x.fechaInicio) || null, imagen: obtenerUrlImagen(x, categoria), categoria })); if (activo) setItems(novedades); }).catch(() => { if (activo) setItems([]); }).finally(() => { if (activo) setCargando(false); }); return () => { activo = false; }; }, [abierto, categoria]);
  const abrirNovedad = (item: Novedad) => {
    if (item.categoria !== 'eventos' && item.categoria !== 'emprendimientos') return;
    onCerrar();
    const esEvento = item.categoria === 'eventos';
    const parametro = esEvento ? 'eventoId' : 'emprendimientoId';
    navigate(`/?${parametro}=${encodeURIComponent(String(item.id))}`, {
      state: { seccionPublica: esEvento ? 'eventos' : 'emprendimientos' },
    });
  };
  if (!abierto) return null;

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-emerald-950/45 p-4 backdrop-blur-md" onMouseDown={onCerrar}><section className="max-h-[85vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/20 bg-white/80 text-slate-900 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90 dark:text-white" onMouseDown={(e) => e.stopPropagation()}><header className="flex items-center justify-between p-6"><h2 className="text-2xl font-bold text-emerald-950 dark:text-white">Novedades y Noticias del Parque</h2><button type="button" onClick={onCerrar} aria-label="Cerrar novedades" className="flex h-8 w-8 items-center justify-center rounded-full border border-black/5 bg-gray-200/50 text-lg text-gray-700 transition-all hover:bg-gray-300/80 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">×</button></header><nav className="flex gap-2 overflow-x-auto px-6">{categorias.map((opcion) => <button key={opcion.id} type="button" onClick={() => setCategoria(opcion.id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${categoria === opcion.id ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-900 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'}`}>{opcion.etiqueta}</button>)}</nav><div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2 lg:grid-cols-3">{cargando && <p className="col-span-full text-center">Cargando novedades…</p>}{items.map((item) => { const esComunicado = item.categoria === 'comunicados'; const esInteractiva = item.categoria === 'eventos' || item.categoria === 'emprendimientos'; return <article key={item.id} role={esInteractiva ? 'button' : undefined} tabIndex={esInteractiva ? 0 : undefined} onClick={() => abrirNovedad(item)} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && esInteractiva) { event.preventDefault(); abrirNovedad(item); } }} className={esComunicado ? 'rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/80' : 'cursor-pointer overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-lg backdrop-blur-md transition-transform hover:scale-[1.02] dark:bg-white/10'}>{!esComunicado && (item.imagen && !fallidas[String(item.id)] ? <img src={item.imagen} alt={item.titulo} onError={() => setFallidas((actual) => ({ ...actual, [String(item.id)]: true }))} className="h-44 w-full rounded-t-xl object-cover" /> : <div className="grid h-44 place-items-center bg-gradient-to-br from-emerald-500 via-emerald-700 to-teal-900"><Icono categoria={item.categoria} /></div>)}<div className={esComunicado ? '' : 'p-5'}><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">{esComunicado ? 'Comunicados' : categorias.find((x) => x.id === item.categoria)?.etiqueta}</span><h3 className={esComunicado ? 'mb-2 mt-3 text-lg font-bold text-slate-800 dark:text-white' : 'mt-3 font-bold text-emerald-950 dark:text-white'}>{item.titulo}</h3><p className={esComunicado ? 'whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300' : 'mt-2 text-sm text-emerald-900/75 dark:text-white/70'}>{item.descripcion}</p></div></article>; })}</div></section></div>;
}
