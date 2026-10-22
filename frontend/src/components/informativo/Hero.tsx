import { useEffect, useMemo, useRef, useState } from 'react';

import paisajePrincipal from '../../assets/parque-hero.jpg';
import accesoParque from '../../assets/diria-paisaje-1.jpg';
import rioDiria from '../../assets/diria-paisaje-2.jpg';
import bosqueDiria from '../../assets/diria-paisaje-3.jpg';
import cafeLocal from '../../assets/diria-paisaje-4.jpg';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  obtenerConfiguracionVisual,
  urlVisual,
  type ConfiguracionVisual,
} from '../../services/configuracionVisualService';

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
  const { language, t } = useLanguage();

  const [indiceActual, setIndiceActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [punteroSobreCarrusel, setPunteroSobreCarrusel] = useState(false);
  const [focoDentroCarrusel, setFocoDentroCarrusel] = useState(false);
  const [configuracionVisual, setConfiguracionVisual] =
    useState<ConfiguracionVisual | null>(null);

  const inicioArrastreX = useRef<number | null>(null);

  const interactuando = punteroSobreCarrusel || focoDentroCarrusel;

  const diapositivas = useMemo(() => {
    const imagenes = configuracionVisual?.heroImagenes?.filter(Boolean) ?? [];

    if (!imagenes.length) return DIAPOSITIVAS;

    return imagenes.map((imagen, indice) => ({
      imagen: urlVisual(imagen),
      alt:
        configuracionVisual?.heroLeyendas?.[indice] ||
        `Imagen ${indice + 1} del Parque Nacional Diriá`,
      nombre:
        configuracionVisual?.heroLeyendas?.[indice] ||
        `Paisaje del Diriá ${indice + 1}`,
    }));
  }, [configuracionVisual]);

  useEffect(() => {
    obtenerConfiguracionVisual()
      .then(setConfiguracionVisual)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const actualizar = (evento: Event) => {
      const configuracion = (
        evento as CustomEvent<ConfiguracionVisual>
      ).detail;

      if (configuracion) {
        setConfiguracionVisual(configuracion);
      }
    };

    window.addEventListener('configuracion-visual:actualizada', actualizar);

    return () => {
      window.removeEventListener(
        'configuracion-visual:actualizada',
        actualizar,
      );
    };
  }, []);

  useEffect(() => {
    setIndiceActual((actual) =>
      Math.min(actual, diapositivas.length - 1),
    );
  }, [diapositivas.length]);

  useEffect(() => {
    const movimientoReducido = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (pausado || interactuando || movimientoReducido) {
      return undefined;
    }

    const temporizador = window.setInterval(() => {
      setIndiceActual((actual) => (actual + 1) % diapositivas.length);
    }, INTERVALO_AUTOPLAY);

    return () => window.clearInterval(temporizador);
  }, [diapositivas.length, interactuando, pausado]);

  const mostrarAnterior = () => {
    setIndiceActual(
      (actual) => (actual - 1 + diapositivas.length) % diapositivas.length,
    );
  };

  const mostrarSiguiente = () => {
    setIndiceActual((actual) => (actual + 1) % diapositivas.length);
  };

  const registrarInicioArrastre = (posicionX: number) => {
    inicioArrastreX.current = posicionX;
  };

  const completarArrastre = (posicionX: number) => {
    const inicio = inicioArrastreX.current;
    inicioArrastreX.current = null;

    if (inicio === null || Math.abs(posicionX - inicio) < 42) return;

    if (posicionX < inicio) {
      mostrarSiguiente();
    } else {
      mostrarAnterior();
    }
  };

  return (
    <section
      id="inicio"
      className="relative isolate min-h-[520px] w-full overflow-hidden rounded-none bg-[#095540] text-white sm:min-h-[540px] lg:min-h-[560px]"
      aria-roledescription="carrusel"
      aria-label="Paisajes y experiencias del Parque Nacional Diriá"
      onMouseEnter={() => setPunteroSobreCarrusel(true)}
      onMouseLeave={() => setPunteroSobreCarrusel(false)}
      onPointerDown={(evento) => registrarInicioArrastre(evento.clientX)}
      onPointerUp={(evento) => completarArrastre(evento.clientX)}
      onPointerCancel={() => {
        inicioArrastreX.current = null;
      }}
      onFocusCapture={() => setFocoDentroCarrusel(true)}
      onBlurCapture={(evento) => {
        if (
          !evento.currentTarget.contains(
            evento.relatedTarget as Node | null,
          )
        ) {
          setFocoDentroCarrusel(false);
        }
      }}
    >
      {/* Imágenes del carrusel */}
      <div className="absolute inset-0">
        {diapositivas.map((diapositiva, index) => (
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

      {/* Capas de contraste para facilitar la lectura */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#063e30]/85 via-[#095540]/55 to-[#095540]/15"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 bg-gradient-to-t from-[#063e30]/70 via-transparent to-[#063e30]/20"
        aria-hidden="true"
      />

      <div
        className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#8dc63f]/15 blur-3xl"
        aria-hidden="true"
      />

      {/* Contenido principal */}
      <div className="relative z-10 flex min-h-[520px] w-full items-center px-6 pb-32 pt-28 sm:min-h-[540px] sm:px-10 sm:pb-32 sm:pt-32 lg:min-h-[560px] lg:px-14 lg:pb-36 lg:pt-36">
        <div className="w-full max-w-4xl">
          {/* Indicador de época sin emojis */}
<div className="mb-5">
  <span className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-wide text-white drop-shadow-md">
    {configuracionVisual?.epoca === 'lluviosa' ? (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0 text-[#8dc63f]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 15.5a4.5 4.5 0 0 1-.3-9A6 6 0 0 1 18.2 8a3.8 3.8 0 0 1-.7 7.5" />
        <path d="m9 17-1 3" />
        <path d="m14 17-1 3" />
        <path d="m19 17-1 3" />
      </svg>
    ) : (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0 text-[#8dc63f]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.42 1.42" />
        <path d="m17.65 17.65 1.42 1.42" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m4.93 19.07 1.42-1.42" />
        <path d="m17.65 6.35 1.42-1.42" />
      </svg>
    )}

    <span>
      {configuracionVisual?.epoca === 'lluviosa'
        ? 'Época lluviosa'
        : 'Época seca'}
    </span>
  </span>
</div>


          {/* Título en español */}
          <h1
            className={`sigtad-animate-in font-brand max-w-3xl text-3xl font-bold leading-tight tracking-[-0.035em] text-white md:text-4xl lg:text-5xl ${
              language === 'en' ? 'sr-only' : ''
            }`}
          >
            {configuracionVisual?.heroTitulo || (
              <>
                Uniendo la Conservación, la Comunidad
                <span className="block text-[#8dc63f]">
                  y el Desarrollo Sostenible en el Parque Nacional Diriá.
                </span>
              </>
            )}
          </h1>

          {/* Título en inglés */}
          {language === 'en' && (
            <h1 className="sigtad-animate-in font-brand max-w-3xl text-3xl font-bold leading-tight tracking-[-0.035em] text-white md:text-4xl lg:text-5xl">
              {t('hero.title')}
              <span className="block text-[#8dc63f]">
                {t('hero.titleAccent')}
              </span>
            </h1>
          )}

          {/* Descripción en español */}
          <p
            className={`sigtad-animate-in mt-5 max-w-2xl text-sm leading-7 text-white/90 sm:text-base sm:leading-8 lg:text-lg ${
              language === 'en' ? 'sr-only' : ''
            }`}
          >
            {configuracionVisual?.heroEslogan ||
              'Descubre el Parque Nacional Diriá y las experiencias, actividades y emprendimientos que nacen alrededor de este paisaje único.'}
          </p>

          {/* Descripción en inglés */}
          {language === 'en' && (
            <p className="sigtad-animate-in mt-5 max-w-2xl text-sm leading-7 text-white/90 sm:text-base sm:leading-8 lg:text-lg">
              {t('hero.description')}
            </p>
          )}
        </div>
      </div>

      {/* Información accesible de la diapositiva actual */}
      <p
        className="sr-only"
        aria-live={pausado || interactuando ? 'polite' : 'off'}
        aria-atomic="true"
      >
        Diapositiva {indiceActual + 1} de {diapositivas.length}:{' '}
        {diapositivas[indiceActual].nombre}
      </p>

      {/* Controles del carrusel */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-5 sm:pb-7">
        <div className="pointer-events-auto inline-flex max-w-full items-center gap-3 rounded-full border border-white/20 bg-emerald-950/75 px-3 py-2 shadow-xl backdrop-blur-xl sm:gap-4 sm:px-4">
          {/* Indicadores de imágenes */}
          <div
            className="flex items-center justify-center gap-0.5 sm:gap-1"
            role="group"
            aria-label={t('hero.selectImage')}
          >
            {diapositivas.map((diapositiva, index) => (
              <button
                key={diapositiva.nombre}
                type="button"
                onClick={() => setIndiceActual(index)}
                className="group flex h-7 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d823] focus-visible:ring-offset-1 focus-visible:ring-offset-[#095540]"
                aria-label={`${t('hero.showSlide')} ${index + 1}: ${diapositiva.nombre}`}
                aria-current={indiceActual === index ? 'true' : undefined}
              >
                <span
                  className={`h-2.5 rounded-full motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none ${
                    indiceActual === index
                      ? 'w-6 bg-[#d9d823]'
                      : 'w-2.5 bg-white/50 group-hover:bg-white'
                  }`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>

          <span
            className="h-5 w-px shrink-0 bg-white/25"
            aria-hidden="true"
          />

          {/* Pausar o reanudar el carrusel */}
          <button
            type="button"
            onClick={() => setPausado((valor) => !valor)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d823]"
            aria-label={pausado ? t('hero.resume') : t('hero.pause')}
            aria-pressed={pausado}
          >
            {pausado ? (
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
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
