import logo from '../../assets/logo.png';

function Footer() {
  const claseEnlace =
    'w-fit rounded text-sm text-white/75 motion-safe:transition motion-safe:duration-200 hover:text-[#d9d823] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f] focus-visible:ring-offset-4 focus-visible:ring-offset-[#095540]';

  return (
    <footer className="relative overflow-hidden rounded-t-[2.5rem] bg-[#095540] text-white sm:rounded-t-[3.5rem]">
      <div
        className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8dc63f]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-8 sm:py-16 md:grid-cols-2 lg:grid-cols-[1.25fr_0.75fr_0.75fr] lg:gap-16">
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
            <a href="#sobre-parque" className={claseEnlace}>
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
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 pr-20 text-left text-xs text-white/55 sm:px-8 sm:pr-24 md:flex-row md:items-center md:justify-between lg:pr-52">
          <p>© 2026 Sistema SIGTAD. Todos los derechos reservados.</p>
          <p>Parque, comunidad y turismo responsable.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
