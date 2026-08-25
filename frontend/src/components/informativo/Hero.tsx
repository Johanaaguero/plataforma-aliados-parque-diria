import { useEffect, useState } from 'react';

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

  return (
    <section
      id="inicio"
      className="relative isolate min-h-[720px] overflow-hidden bg-[#073f31] text-white sm:min-h-[760px] lg:min-h-[820px]"
      aria-roledescription="carrusel"
      aria-label="Paisajes y experiencias del Parque Nacional Diriá"
      onMouseEnter={() => setPunteroSobreCarrusel(true)}
      onMouseLeave={() => setPunteroSobreCarrusel(false)}
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
            className={`absolute inset-0 h-full w-full object-cover motion-safe:transition-[opacity,transform] motion-safe:duration-700 motion-safe:ease-out motion-reduce:transform-none motion-reduce:transition-none ${
              indiceActual === index
                ? 'scale-100 opacity-100'
                : 'scale-[1.025] opacity-0'
            }`}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 bg-gradient-to-r from-[#052f25]/95 via-[#073f31]/70 to-[#073f31]/20"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#052f25]/80 via-transparent to-[#052f25]/25"
        aria-hidden="true"
      />
      <div
        className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#8dc63f]/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-[720px] w-full max-w-7xl items-center px-4 pb-32 pt-32 sm:min-h-[760px] sm:px-6 sm:pb-36 sm:pt-36 lg:min-h-[820px] lg:px-8">
        <div className="max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d9d823] shadow-sm backdrop-blur-md sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-[#8dc63f]" aria-hidden="true" />
            Guanacaste, Costa Rica
          </div>

          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Naturaleza que inspira,
            <span className="block text-[#bde56d]">comunidades que conectan.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8 lg:text-xl">
            Descubre el Parque Nacional Diriá y las experiencias, actividades y
            emprendimientos que nacen alrededor de este paisaje único.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <a
              href="#atractivos"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#8dc63f] px-6 py-3 text-sm font-bold text-[#073f31] shadow-lg shadow-black/15 motion-safe:transition motion-safe:duration-300 motion-safe:ease-out hover:bg-[#b2db68] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d823]/55 motion-safe:hover:-translate-y-0.5 motion-reduce:transform-none sm:text-base"
            >
              Explorar el parque
              <span aria-hidden="true">→</span>
            </a>

            <a
              href="#eventos"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/50 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm motion-safe:transition motion-safe:duration-300 hover:border-white hover:bg-white hover:text-[#073f31] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:text-base"
            >
              Ver eventos
            </a>
          </div>
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

      <div className="absolute bottom-5 left-1/2 z-20 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-[#052f25]/65 p-1.5 shadow-xl backdrop-blur-md sm:bottom-7 sm:gap-2">
        <button
          type="button"
          onClick={mostrarAnterior}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white motion-safe:transition motion-safe:duration-200 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d823]"
          aria-label="Mostrar imagen anterior"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div
          className="flex items-center gap-0.5 px-1"
          role="group"
          aria-label="Seleccionar imagen"
        >
          {DIAPOSITIVAS.map((diapositiva, index) => (
            <button
              key={diapositiva.nombre}
              type="button"
              onClick={() => setIndiceActual(index)}
              className="group flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d823] focus-visible:ring-offset-1 focus-visible:ring-offset-[#073f31]"
              aria-label={`Mostrar diapositiva ${index + 1}: ${diapositiva.nombre}`}
              aria-current={indiceActual === index ? 'true' : undefined}
            >
              <span
                className={`h-2.5 rounded-full motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none ${
                  indiceActual === index
                    ? 'w-5 bg-[#d9d823]'
                    : 'w-2.5 bg-white/55 group-hover:bg-white'
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setPausado((valor) => !valor)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white motion-safe:transition motion-safe:duration-200 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d823]"
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

        <button
          type="button"
          onClick={mostrarSiguiente}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white motion-safe:transition motion-safe:duration-200 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d823]"
          aria-label="Mostrar imagen siguiente"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </section>
  );
}

export default Hero;
