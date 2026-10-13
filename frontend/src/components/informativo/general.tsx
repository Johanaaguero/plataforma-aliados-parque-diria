import { useEffect, useState } from 'react';

import parque1 from '../../assets/diria-paisaje-1.jpg';
import parque2 from '../../assets/diria-paisaje-2.jpg';
import parque3 from '../../assets/diria-paisaje-3.jpg';
import parque4 from '../../assets/diria-paisaje-4.jpg';
import { CONTENIDO_PARQUE } from './contenidoParque';
import ScrollReveal from '../ui/ScrollReveal';
import { obtenerConfiguracionVisual, urlVisual, type ConfiguracionVisual } from '../../services/configuracionVisualService';

const IMAGENES_PARQUE = [
  {
    src: parque1,
    alt: 'Entrada al Parque Nacional Diriá rodeada de vegetación',
  },
  {
    src: parque2,
    alt: 'Poza natural entre las rocas del Parque Nacional Diriá',
  },
  {
    src: parque3,
    alt: 'Vista aérea del bosque y las comunidades alrededor del Diriá',
  },
  {
    src: parque4,
    alt: 'Café maduro cultivado por comunidades cercanas al Diriá',
  },
] as const;

const MODULOS = [
  {
    id: 'atractivos',
    titulo: 'Experiencias',
    categoria: 'Explorar',
    descripcion: 'Senderos, paisajes y encuentros con la riqueza natural del Diriá.',
    imagen: parque2,
    alt: 'Poza natural rodeada por el bosque',
  },
  {
    id: 'emprendimientos',
    titulo: 'Emprendimientos',
    categoria: 'Comunidad',
    descripcion: 'Propuestas locales creadas por los aliados de nuestras comunidades.',
    imagen: parque4,
    alt: 'Frutos de café producidos en la zona',
  },
  {
    id: 'eventos',
    titulo: 'Eventos',
    categoria: 'Encontrarnos',
    descripcion: 'Actividades que conectan a visitantes, naturaleza y comunidad.',
    imagen: parque1,
    alt: 'Acceso principal al Parque Nacional Diriá',
  },
  {
    id: 'capacitaciones',
    titulo: 'Capacitaciones',
    categoria: 'Crecer',
    descripcion: 'Conocimiento que fortalece el turismo rural y el trabajo colaborativo.',
    imagen: parque3,
    alt: 'Comunidades y terrenos productivos entre el bosque',
  },
] as const;

function Informativo() {
  const [imagenActual, setImagenActual] = useState(0);
  const [moduloSeleccionado, setModuloSeleccionado] = useState<(typeof MODULOS)[number] | null>(null);
  const [configuracionVisual, setConfiguracionVisual] = useState<ConfiguracionVisual | null>(null);
  const imagenesParque = configuracionVisual?.sobreImagen
    ? [
      { src: urlVisual(configuracionVisual.sobreImagen), alt: 'Imagen institucional del Parque Nacional Diriá' },
      ...(configuracionVisual.galeriaImagenes ?? []).map((src, indice) => ({ src: urlVisual(src), alt: `Imagen secundaria ${indice + 1} del Parque Nacional Diriá` })),
    ]
    : configuracionVisual?.galeriaImagenes?.length
      ? configuracionVisual.galeriaImagenes.map((src, indice) => ({ src: urlVisual(src), alt: `Imagen secundaria ${indice + 1} del Parque Nacional Diriá` }))
      : IMAGENES_PARQUE;
  const modulos = MODULOS.map((modulo, indice) => ({
    ...modulo,
    imagen: configuracionVisual?.galeriaImagenes?.[indice]
      ? urlVisual(configuracionVisual.galeriaImagenes[indice])
      : modulo.imagen,
  }));

  useEffect(() => { obtenerConfiguracionVisual().then(setConfiguracionVisual).catch(() => undefined); }, []);

  useEffect(() => {
    const actualizar = (evento: Event) => {
      const configuracion = (evento as CustomEvent<ConfiguracionVisual>).detail;
      if (configuracion) setConfiguracionVisual(configuracion);
    };
    window.addEventListener('configuracion-visual:actualizada', actualizar);
    return () => window.removeEventListener('configuracion-visual:actualizada', actualizar);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const intervalo = window.setInterval(() => {
      setImagenActual((actual) => (actual + 1) % imagenesParque.length);
    }, 4000);

    return () => window.clearInterval(intervalo);
  }, [imagenesParque.length]);

  return (
    <section
      id="sobre-parque"
      className="relative scroll-mt-28 overflow-hidden bg-stone-50 px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28"
    >
      <div
        className="absolute -right-28 top-16 h-72 w-72 rounded-full bg-[#8dc63f]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl">
        <ScrollReveal className="grid grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2">
            <div className="sigtad-image-reveal relative h-[400px] w-full overflow-hidden rounded-3xl bg-[#095540] shadow-xl md:h-[480px]">
            {imagenesParque.map((imagen, index) => (
              <img
                key={imagen.src}
                src={imagen.src}
                alt={imagenActual === index ? imagen.alt : ''}
                aria-hidden={imagenActual !== index}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover motion-safe:transition-[opacity,transform] motion-safe:duration-700 motion-safe:ease-out motion-reduce:transform-none motion-reduce:transition-none ${
                  imagenActual === index
                    ? 'scale-100 opacity-100'
                    : 'scale-[1.025] opacity-0'
                }`}
              />
            ))}

            <div
              className="absolute inset-0 bg-gradient-to-t from-[#095540]/65 via-transparent to-transparent"
              aria-hidden="true"
            />

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
              <div className="rounded-2xl border border-white/20 bg-[#095540]/55 px-4 py-3 text-white backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d9d823]">
                  Paisaje vivo
                </p>
                <p className="mt-1 text-sm font-semibold sm:text-base">
                  Parque Nacional Diriá
                </p>
              </div>

              <div
                className="flex gap-0.5 rounded-full border border-white/20 bg-[#095540]/55 p-1.5 backdrop-blur-md"
                role="group"
                aria-label="Seleccionar imagen del parque"
              >
                {imagenesParque.map((imagen, index) => (
                  <button
                    key={imagen.src}
                    type="button"
                    onClick={() => setImagenActual(index)}
                    className="group flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d823]"
                    aria-label={`Ver imagen ${index + 1}: ${imagen.alt}`}
                    aria-current={imagenActual === index ? 'true' : undefined}
                  >
                    <span
                      className={`h-2.5 rounded-full motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none ${
                        imagenActual === index
                          ? 'w-5 bg-[#d9d823]'
                          : 'w-2.5 bg-white/55 group-hover:bg-white'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="order-first md:order-none">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#009444] sm:text-sm">
              Conoce quiénes somos y el parque
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-emerald-950 dark:text-white md:text-4xl">
              Un refugio natural conectado con su comunidad.
            </h2>
            <p className="mt-6 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {CONTENIDO_PARQUE.descripcion}
            </p>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {CONTENIDO_PARQUE.comunidad}
            </p>

            <div className="mt-6 rounded-[1.5rem] border border-white/30 bg-white/70 p-5 shadow-[0_12px_34px_rgba(7,63,49,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#009444] dark:text-[#8dc63f]">
                Asociación Aliados del Parque Nacional Diriá
              </p>
              <h3 className="mt-2 text-xl font-bold text-[#095540] dark:text-white">
                Aliados que conservan y hacen comunidad.
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                La Asociación Aliados del Parque Nacional Diriá impulsa el turismo rural, la conservación comunitaria y oportunidades sostenibles para las familias cercanas al parque.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-3 rounded-[1.5rem] border border-[#095540]/15 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#8dc63f]/15 text-[#095540]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M12 21c5-3.2 8-7.1 8-11a8 8 0 0 0-16 0c0 3.9 3 7.8 8 11Z" />
                  <path d="M8 13c4 0 7-2.5 8-6-4 0-7 2.5-8 6Z" />
                </svg>
              </span>
              <p className="text-sm font-semibold leading-6 text-slate-700 sm:text-base">
                {CONTENIDO_PARQUE.mensaje}
              </p>
            </div>
          </div>
        </ScrollReveal>

        <div className="pt-24 sm:pt-28">
          <ScrollReveal className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#009444] sm:text-sm">
              Vive el territorio
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-[#095540] sm:text-4xl lg:text-5xl">
              Hay mucho por descubrir alrededor del Diriá
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Conoce las distintas formas en que el parque y sus comunidades se
              encuentran, crecen y comparten su identidad.
            </p>
          </ScrollReveal>

          <ScrollReveal stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
            {modulos.map((modulo) => (
              <article
                id={modulo.id}
                key={modulo.id}
                role="button"
                tabIndex={0}
                onClick={() => setModuloSeleccionado(modulo)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setModuloSeleccionado(modulo); } }}
                className="sigtad-image-reveal group relative isolate min-h-[390px] cursor-pointer scroll-mt-28 overflow-hidden rounded-[1.75rem] bg-[#095540] shadow-[0_14px_35px_rgba(9,85,64,0.12)] motion-safe:transition motion-safe:duration-500 motion-safe:ease-out hover:shadow-[0_22px_50px_rgba(9,85,64,0.2)] motion-safe:hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8dc63f]/60 motion-reduce:transform-none"
              >
                <img
                  src={modulo.imagen}
                  alt={modulo.alt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.035] motion-reduce:transform-none"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#095540]/95 via-[#095540]/35 to-black/10"
                  aria-hidden="true"
                />

                <div className="relative flex min-h-[390px] flex-col justify-between p-5 sm:p-6">
                  <span className="w-fit rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    {modulo.categoria}
                  </span>

                  <div>
                    <h3 className="font-brand text-2xl font-bold tracking-[-0.02em] text-white">
                      {modulo.titulo}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/80">
                      {modulo.descripcion}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </ScrollReveal>
        </div>

        {moduloSeleccionado && (
          <div className="fixed inset-0 z-[80] flex items-end bg-emerald-950/50 p-4 backdrop-blur-md sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="detalle-territorio" onMouseDown={() => setModuloSeleccionado(null)}>
            <section className="w-full max-w-lg rounded-[2rem] border border-white/40 bg-white/85 p-6 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/85" onMouseDown={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#009444]">{moduloSeleccionado.categoria}</p><h3 id="detalle-territorio" className="mt-2 text-2xl font-bold text-[#095540] dark:text-white">{moduloSeleccionado.titulo}</h3></div>
                <button type="button" onClick={() => setModuloSeleccionado(null)} className="grid h-10 w-10 place-items-center rounded-full border border-[#095540]/15 bg-white/50 text-xl text-[#095540] backdrop-blur-md dark:bg-white/10 dark:text-white" aria-label="Cerrar detalle">×</button>
              </div>
              <img src={moduloSeleccionado.imagen} alt={moduloSeleccionado.alt} className="mt-5 h-48 w-full rounded-2xl object-cover" />
              <p className="mt-5 text-base leading-7 text-slate-700 dark:text-slate-200">{moduloSeleccionado.descripcion}</p>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

export default Informativo;
