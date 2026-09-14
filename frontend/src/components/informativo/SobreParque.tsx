import { useEffect, useRef } from 'react';

import { FOTOS_PARQUE } from './contenidoParque';

const DESARROLLADORES = [
  'Wayner Díaz Mora',
  'Johana Agüero Serrano',
  'Dallane Blandón Cubillo',
  'Wilmer Pérez Hernández',
  'Wendolin Valverde Zúñiga',
] as const;

export default function SobreParque() {
  const dialogoRef = useRef<HTMLDialogElement | null>(null);
  const disparadorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (!dialogo) return;

    let restaurarScroll: (() => void) | null = null;

    function abrirDesdeNavegacion(evento: MouseEvent) {
      const objetivo = evento.target;
      if (!(objetivo instanceof Element)) return;

      const disparador = objetivo.closest<HTMLElement>('[data-sigtad-about]');
      if (!disparador || !dialogo || dialogo.open) return;

      evento.preventDefault();
      disparadorRef.current = disparador;

      // El bloqueo pertenece a esta vista; los demás modales conservan su estilo en body.
      const raiz = document.documentElement;
      const overflowAnterior = raiz.style.overflow;
      raiz.style.overflow = 'hidden';
      restaurarScroll = () => {
        if (raiz.style.overflow === 'hidden') raiz.style.overflow = overflowAnterior;
      };

      document.title = 'Sobre el Parque | Aliados Diriá';
      dialogo.showModal();
    }

    function alCerrar() {
      restaurarScroll?.();
      restaurarScroll = null;
      document.title = 'Inicio | Aliados Diriá';

      const disparador = disparadorRef.current;
      const destino = disparador?.isConnected
        ? disparador
        : document.querySelector<HTMLElement>('button[aria-controls="menu-principal-movil"]')
          ?? document.querySelector<HTMLElement>('button[aria-label="Ir al inicio"]');

      destino?.focus({ preventScroll: true });
      disparadorRef.current = null;
    }

    document.addEventListener('click', abrirDesdeNavegacion);
    dialogo.addEventListener('close', alCerrar);

    return () => {
      document.removeEventListener('click', abrirDesdeNavegacion);
      dialogo.removeEventListener('close', alCerrar);
      if (dialogo.open) dialogo.close();
      restaurarScroll?.();
    };
  }, []);

  return (
    <dialog
      ref={dialogoRef}
      className="sigtad-about sigtad-glass m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-6xl overflow-y-auto rounded-3xl border border-white/70 p-0 shadow-2xl"
      aria-labelledby="titulo-sobre-parque"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) evento.currentTarget.close();
      }}
    >
      <div className="p-5 sm:p-8 lg:p-10">
        <header className="flex items-start justify-between gap-4 border-b border-[#095540]/10 pb-5 sm:pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#009444]">
              Parque Nacional Diriá
            </p>
            <h2 id="titulo-sobre-parque" className="sigtad-heading mt-2 font-brand text-3xl font-bold text-[#095540] sm:text-4xl">
              Aliados del Parque Diriá
            </h2>
          </div>
          <button
            type="button"
            autoFocus
            onClick={() => dialogoRef.current?.close()}
            className="sigtad-button-secondary flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-[#095540]/15 bg-white/75 px-3 text-xl text-[#095540] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444] focus-visible:ring-offset-2"
            aria-label="Cerrar información del parque"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="grid items-start gap-7 pt-6 sm:pt-8 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
          <div className="grid grid-cols-2 gap-3" aria-label="Paisajes del Parque Nacional Diriá">
            {FOTOS_PARQUE.map((foto, indice) => (
              <img
                key={foto.src}
                src={foto.src}
                alt={foto.alt}
                loading="lazy"
                decoding="async"
                className={indice === 0
                  ? 'col-span-2 aspect-[16/10] w-full rounded-2xl object-cover'
                  : indice === FOTOS_PARQUE.length - 1
                    ? 'col-span-2 aspect-[3/1] w-full rounded-2xl object-cover'
                    : 'aspect-[4/3] w-full rounded-2xl object-cover'}
              />
            ))}
          </div>

          <section aria-labelledby="subtitulo-sobre-parque">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#009444]">
              Antecedentes
            </p>
            <h3 id="subtitulo-sobre-parque" className="sigtad-heading mt-4 font-brand text-2xl font-bold leading-tight text-[#095540] sm:text-3xl">
              Asociación Aliados del Parque Nacional Diriá
            </h3>
            <div className="my-4 rounded-xl border border-dashed border-[#095540]/25 p-8 text-center text-sm font-semibold text-[#587267]">
              Espacio para Imagen
            </div>
            <p className="sigtad-muted mt-5 text-base leading-7 text-slate-600">
              En mayo del 2018 un grupo de personas de Santa Cruz, de la empresa privada, instituciones públicas y organizaciones no gubernamentales, decidimos reunirnos con la idea de desarrollar una estrategia para el rescate cultural de la ciudad, y la promoción del Parque Nacional Diriá como destino turístico. El objetivo consistía en atraer el turismo de playa hacia la ciudad de Santa Cruz, combinando su folklore y cultura, con atractivos de naturaleza, en este caso el Parque Nacional Diriá, para la reactivación económica del cantón.
            </p>
            <p className="sigtad-muted mt-4 text-base leading-7 text-slate-600">
              Nuestros planes se vieron interrumpidos abruptamente por la pandemia. Sin embargo, ya estábamos organizados como “Comisión Pro Parque Nacional Diriá” y aplicamos para obtener fondos de Costa Rica Por Siempre a través de la Fundación para el Equilibrio entre la Conservación y el Desarrollo (FUNDECODES) para continuar desarrollando la estrategia. Costa Rica Por Siempre es una Organización No Gubernamental (ONG) que administra los fondos del I y II Canje de Deuda por Naturaleza, un convenio entre EEUU y Costa Rica que promueve la conservación.
            </p>
            <div className="my-4 rounded-xl border border-dashed border-[#095540]/25 p-8 text-center text-sm font-semibold text-[#587267]">
              Espacio para Imagen
            </div>
            <p className="sigtad-muted mt-4 text-base leading-7 text-slate-600">
              El proyecto fue aprobado, y durante el 2021, 2022 y 2023 recorrimos las comunidades en el área de amortiguamiento del Parque Nacional Diriá, reconociendo los posibles emprendimientos de turismo rural que podrían integrarse al grupo, y recibimos capacitación en diferentes temas. Durante el Taller de Planificación Estratégica impartido por el Centro Científico Tropical, se identificó la necesidad de tener una figura legal que representara al grupo, y de ahí surgió la idea de conformar una Asociación que fortaleciera al Parque, trabajando de la mano con las comunidades aledañas, para reactivar de esta manera la economía en esos sectores, en los cantones de Santa Cruz y Nicoya.
            </p>
          </section>
        </div>

        <section className="mt-10 rounded-3xl border border-white/70 bg-white/45 p-5 shadow-[0_16px_45px_rgba(7,63,49,0.1)] backdrop-blur-xl sm:mt-12 sm:p-8" aria-labelledby="titulo-equipo-desarrollo">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#009444]">SIGTAD</p>
            <h3 id="titulo-equipo-desarrollo" className="sigtad-heading mt-2 font-brand text-2xl font-bold sm:text-3xl">
              Equipo de Desarrollo
            </h3>
          </div>
          <div className="mt-7 grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {DESARROLLADORES.map((nombre) => (
              <div key={nombre} className="text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#095540]/25 bg-white/55 text-xs font-semibold text-[#587267]">
                  Foto
                </div>
                <p className="mt-3 text-sm font-bold leading-5 text-[#095540]">{nombre}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </dialog>
  );
}
