import { useEffect, useRef, useState } from 'react';

import paisajePrincipal from '../../assets/parque-hero.jpg';
import accesoParque from '../../assets/diria-paisaje-1.jpg';
import rioDiria from '../../assets/diria-paisaje-2.jpg';
import bosqueDiria from '../../assets/diria-paisaje-3.jpg';
import cafeLocal from '../../assets/diria-paisaje-4.jpg';

const DIAPOSITIVAS = [
  {
    imagen: paisajePrincipal,
    alt: 'Vista aérea de las montañas y el bosque del Parque Nacional Diriá',
    nombre: 'Paisajes del Diriá',
  },
  {
    imagen: accesoParque,
    alt: 'Entrada rodeada de bosque al Parque Nacional Diriá',
    nombre: 'Un parque por descubrir',
  },
  {
    imagen: rioDiria,
    alt: 'Poza de agua cristalina entre las rocas y el bosque del Diriá',
    nombre: 'Agua y bosque vivo',
  },
  {
    imagen: bosqueDiria,
    alt: 'Bosque y terrenos de las comunidades alrededor del Diriá',
    nombre: 'Comunidades entre montañas',
  },
  {
    imagen: cafeLocal,
    alt: 'Frutos maduros de café cultivados en la zona del Diriá',
    nombre: 'Sabores de nuestra tierra',
  },
] as const;

const INTERVALO_AUTOPLAY = 6000;

function Hero() {
  const [indiceActual, setIndiceActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [punteroSobreCarrusel, setPunteroSobreCarrusel] = useState(false);
  const [focoDentroCarrusel, setFocoDentroCarrusel] = useState(false);
  const inicioArrastreX = useRef<number | null>(null);
  const interactuando = punteroSobreCarrusel || focoDentroCarrusel;

  useEffect(() => {
    const movimientoReducido = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (pausado || interactuando || movimientoReducido) {
      return undefined;
    }

    const temporizador = window.setInterval(() => {
      setIndiceActual((actual) => (actual + 1) % DIAPOSITIVAS.length);
    }, INTERVALO_AUTOPLAY);

    return () => window.clearInterval(temporizador);
  }, [interactuando, pausado]);

  const mostrarAnterior = () => {
    setIndiceActual(
      (actual) =>
        (actual - 1 + DIAPOSITIVAS.length) % DIAPOSITIVAS.length,
    );
  };

  const mostrarSiguiente = () => {
    setIndiceActual((actual) => (actual + 1) % DIAPOSITIVAS.length);
  };

  const registrarInicioArrastre = (posicionX: number) => {
    inicioArrastreX.current = posicionX;
  };

  const completarArrastre = (posicionX: number) => {
    const inicio = inicioArrastreX.current;
    inicioArrastreX.current = null;
    if (inicio === null || Math.abs(posicionX - inicio) < 42) return;
    if (posicionX < inicio) mostrarSiguiente();
    else mostrarAnterior();
  };

  return (
    <section
      id="inicio"
      className="relative isolate w-screen min-h-[480px] overflow-hidden rounded-none bg-[#095540] text-white sm:min-h-[500px] lg:min-h-[540px] lg:max-h-[540px]"
      aria-roledescription="carrusel"
      aria-label="Paisajes y experiencias del Parque Nacional Diriá"
      onMouseEnter={() => setPunteroSobreCarrusel(true)}
      onMouseLeave={() => setPunteroSobreCarrusel(false)}
      onPointerDown={(evento) => registrarInicioArrastre(evento.clientX)}
      onPointerUp={(evento) => completarArrastre(evento.clientX)}
      onPointerCancel={() => { inicioArrastreX.current = null; }}
      onFocusCapture={() => setFocoDentroCarrusel(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocoDentroCarrusel(false);
        }
      }}
    >
      <div className="absolute inset-0">
        {DIAPOSITIVAS.map((diapositiva, index) => (
          <img
            key={diapositiva.imagen}
            src={diapositiva.imagen}
            alt={indiceActual === index ? diapositiva.alt : ''}
            aria-hidden={indiceActual !== index}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'low'}
            decoding="async"
            className={`absolute inset-0 h-full w-full rounded-none object-cover object-center motion-safe:transition-[opacity,transform,filter] motion-safe:duration-[800ms] motion-safe:ease-out motion-reduce:transform-none motion-reduce:transition-none ${
              indiceActual === index
                ? 'scale-100 opacity-100 blur-0'
                : 'scale-105 opacity-0 blur-[4px]'
            }`}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 bg-gradient-to-r from-[#095540]/78 via-[#095540]/45 to-[#095540]/10"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#095540]/55 via-transparent to-[#095540]/10"
        aria-hidden="true"
      />
      <div
        className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#8dc63f]/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[480px] w-full items-center px-6 pb-20 pt-28 sm:min-h-[500px] sm:px-10 sm:pb-24 sm:pt-32 md:pt-36 lg:min-h-[540px] lg:px-14 lg:pb-24 lg:pt-36">
        <div className="max-w-4xl">
          <h1 className="sigtad-animate-in font-brand max-w-3xl text-3xl font-bold leading-tight tracking-[-0.035em] text-white md:text-4xl lg:text-5xl">
            Uniendo la Conservación, la Comunidad
            <span className="block text-[#8dc63f]">y el Desarrollo Sostenible en el Parque Nacional Diriá.</span>
          </h1>

          <p className="sigtad-animate-in mt-4 max-w-2xl text-sm leading-6 text-white/85 sm:text-base sm:leading-7 lg:text-lg">
            Descubre el Parque Nacional Diriá y las experiencias, actividades y
            emprendimientos que nacen alrededor de este paisaje único.
          </p>
        </div>
      </div>

      <p
        className="sr-only"
        aria-live={pausado || interactuando ? 'polite' : 'off'}
        aria-atomic="true"
      >
        Diapositiva {indiceActual + 1} de {DIAPOSITIVAS.length}:{' '}
        {DIAPOSITIVAS[indiceActual].nombre}
      </p>

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-between px-3 sm:px-6">
        <div className="pointer-events-auto absolute bottom-7 left-1/2 inline-flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/15 bg-emerald-950/60 px-4 py-2 shadow-lg backdrop-blur-md dark:bg-slate-900/70 sm:bottom-9">
          <div
            className="flex items-center justify-center gap-1"
            role="group"
            aria-label="Seleccionar imagen"
          >
            {DIAPOSITIVAS.map((diapositiva, index) => (
            <button
              key={diapositiva.nombre}
              type="button"
              onClick={() => setIndiceActual(index)}
              className="group flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d823] focus-visible:ring-offset-1 focus-visible:ring-offset-[#095540]"
              aria-label={`Mostrar diapositiva ${index + 1}: ${diapositiva.nombre}`}
              aria-current={indiceActual === index ? 'true' : undefined}
            >
              <span
                className={`h-2.5 rounded-full motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none ${
                  indiceActual === index
                    ? 'w-6 bg-yellow-400'
                    : 'w-2.5 bg-white/40 group-hover:bg-white'
                }`}
                aria-hidden="true"
              />
            </button>
            ))}
          </div>

          <span className="h-4 w-px bg-white/20" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setPausado((valor) => !valor)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d823]"
            aria-label={pausado ? 'Reanudar carrusel' : 'Pausar carrusel'}
            aria-pressed={pausado}
          >
            {pausado ? (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
            )}
          </button>
        </div>

      </div>
    </section>
  );
}

export default Hero;
