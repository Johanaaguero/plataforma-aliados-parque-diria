import logo from '../../assets/logo.png';

type RedSocial = 'Facebook' | 'Instagram' | 'WhatsApp' | 'TikTok';

function IconoRedSocial({ red }: { red: RedSocial }) {
  if (red === 'Facebook') {
    return <path d="M13.5 21v-8h2.8l.4-3h-3.2V8.1c0-.9.3-1.5 1.6-1.5H17V3.9c-.4-.1-1.3-.2-2.4-.2-2.4 0-4.1 1.5-4.1 4.2V10H7.8v3h2.7v8h3Z" />;
  }

  if (red === 'Instagram') {
    return <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.3" cy="6.8" r=".8" fill="currentColor" /></>;
  }

  if (red === 'WhatsApp') {
    return <><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.5Z" /><path d="M9 8.5c.2-.5.5-.5.8-.4l.8 1.8c.1.3 0 .5-.2.7l-.4.5c.5 1 1.3 1.8 2.4 2.3l.5-.5c.2-.2.4-.2.7-.1l1.7.8c.2.2.2.6-.1.8-.6.5-1.3.7-2 .5-2.7-.8-4.7-2.8-5.5-5.4-.2-.6 0-1.3.5-1.8Z" /></>;
  }

  return <path d="M14.5 3.5c.9 1.3 1.5 2.9 1.4 4.6a5.5 5.5 0 0 1 3.6 1.8v3.3a8 8 0 0 1-3.6 1.5v4.8c0 1.2-.9 2.2-2.1 2.2h-3.1v-6.3h-2V12h2v-1.6c0-2.6 1.6-4.3 4-4.3h1.6v3h-1c-.6 0-.8.3-.8.8V12h1.8l-.3 3h-1.5V3.5Z" />;
}

function Footer() {
  const claseEnlace =
    'w-fit rounded text-sm text-white/75 motion-safe:transition motion-safe:duration-200 hover:text-[#d9d823] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-4 focus-visible:ring-offset-[#095540]';

  return (
    <footer className="relative mt-14 overflow-visible bg-emerald-900 text-white transition-colors duration-500 ease-in-out dark:bg-black dark:text-emerald-100">
      <svg className="pointer-events-none absolute inset-x-0 -top-14 -mb-1 block h-14 w-full leading-none drop-shadow-[0_-4px_12px_rgba(16,185,129,0.1)] transition-colors duration-500 ease-in-out dark:drop-shadow-[0_-4px_12px_rgba(16,185,129,0.2)]" viewBox="0 0 1440 56" preserveAspectRatio="none" aria-hidden="true">
        <path className="fill-emerald-900 transition-colors duration-500 ease-in-out dark:fill-black" d="M0 28C160 2 280 2 440 28s280 26 440 0 280-26 560 0v28H0Z" />
        <path className="fill-none stroke-emerald-500/20 transition-colors duration-500 ease-in-out dark:stroke-emerald-400/40" d="M0 28C160 2 280 2 440 28s280 26 440 0 280-26 560 0" stroke="currentColor" strokeWidth="1" />
      </svg>
      <div
        className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8dc63f]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="sigtad-animate-in relative mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-8 sm:py-16 md:grid-cols-2 lg:grid-cols-[1.25fr_0.75fr_0.75fr] lg:gap-16">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5">
              <img
                src={logo}
                alt=""
                className="h-full w-full object-contain"
              />
            </span>
            <div>
              <p className="font-brand font-bold text-white">Aliados del Parque</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[#8dc63f]">
                Parque Nacional Diriá
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-7 text-white/70 sm:text-base">
            Sistema de Gestión Turística y Administrativa que conecta el Parque
            Nacional Diriá con sus aliados y comunidades.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.17em] text-[#d9d823]">
            Explora
          </h2>
          <nav className="mt-5 flex flex-col gap-3" aria-label="Enlaces del pie de página">
            <a href="#inicio" className={claseEnlace}>
              Inicio
            </a>
            <a href="#sobre-parque" className={claseEnlace} data-sigtad-about>
              Sobre el parque
            </a>
            <a href="#atractivos" className={claseEnlace}>
              Experiencias
            </a>
            <a href="#emprendimientos" className={claseEnlace}>
              Emprendimientos
            </a>
            <a href="#eventos" className={claseEnlace}>
              Eventos y Capacitaciones
            </a>
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.17em] text-[#d9d823]">
            Territorio
          </h2>
          <div className="mt-5 space-y-2 text-sm leading-6 text-white/75">
            <p>Parque Nacional Diriá</p>
            <p>Guanacaste, Costa Rica</p>
            <p>Aliados del Parque</p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.17em] text-[#d9d823]">
            Comunidad
          </h2>
          <div className="mt-5 flex flex-wrap gap-3" aria-label="Redes sociales">
            {(['Facebook', 'Instagram', 'WhatsApp', 'TikTok'] as const).map((red) => (
              <a
                key={red}
                href="#"
                aria-label={red}
                title={red}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/85 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d9d823]/60 hover:bg-[#d9d823]/15 hover:text-[#d9d823] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <IconoRedSocial red={red} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 pr-20 text-left text-xs text-white/55 sm:px-8 sm:pr-24 md:flex-row md:items-center md:justify-between lg:pr-52">
          <p>© 2026 Sistema SIGTAD. Todos los derechos reservados.</p>
          <p>Parque, comunidad y turismo responsable.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
