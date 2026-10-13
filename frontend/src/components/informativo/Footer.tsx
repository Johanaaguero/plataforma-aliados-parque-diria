import logo from '../../assets/logo.png';
import { useLanguage } from '../../i18n/LanguageContext';

const redes = ['Facebook', 'Instagram', 'WhatsApp', 'TikTok'] as const;

function Footer() {
  const { t } = useLanguage();
  const enlace = 'w-fit rounded text-sm text-white/75 transition-colors hover:text-[#d9d823] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc63f]';

  return (
    <footer className="sigtad-footer relative mt-20 w-full overflow-x-clip pb-4 pt-12 text-white transition-colors duration-300">
      <svg className="pointer-events-none absolute inset-x-0 -top-12 h-14 w-full" viewBox="0 0 1440 56" preserveAspectRatio="none" aria-hidden="true">
        <path className="sigtad-footer-wave transition-colors duration-300" d="M0 28C160 2 280 2 440 28s280 26 440 0 280-26 560 0v28H0Z" />
      </svg>
      <div className="pointer-events-none absolute -left-20 top-8 h-48 w-72 rotate-[-8deg] rounded-[55%] bg-[#8dc63f]/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-3 h-56 w-80 rotate-[12deg] rounded-[55%] bg-emerald-300/10 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-6 md:px-12">
        <div className="mb-6 grid gap-8 py-2 md:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1"><img src={logo} alt="Aliados del Parque Nacional Diriá" className="h-full w-full object-contain" /></span>
              <div><p className="font-brand text-base font-bold">{t('footer.partners')}</p><p className="text-[10px] uppercase tracking-[.16em] text-[#8dc63f]">Parque Nacional Diriá</p></div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">{t('footer.description')}</p>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[.17em] text-amber-400">{t('footer.explore')}</h2>
            <nav className="flex flex-col gap-2" aria-label={t('footer.explore')}>
              <a href="#inicio" className={enlace}>{t('nav.home')}</a><a href="#sobre-parque" className={enlace} data-sigtad-about>{t('footer.aboutPark')}</a><a href="#atractivos" className={enlace}>{t('footer.experiences')}</a><a href="#emprendimientos" className={enlace}>{t('nav.businesses')}</a><a href="#eventos" className={enlace}>{t('nav.events')}</a>
            </nav>
          </div>
          <div><h2 className="mb-3 text-sm font-semibold uppercase tracking-[.17em] text-amber-400">{t('footer.territory')}</h2><div className="space-y-2 text-sm text-white/75"><p>Parque Nacional Diriá</p><p>Guanacaste, Costa Rica</p><p>{t('footer.partners')}</p></div></div>
          <div><h2 className="mb-3 text-sm font-semibold uppercase tracking-[.17em] text-amber-400">{t('footer.community')}</h2><div className="flex flex-wrap gap-2.5" aria-label={t('footer.community')}>{redes.map((red) => <a key={red} href="#" aria-label={red} title={red} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/85 transition hover:border-[#d9d823]/60 hover:text-[#d9d823]"><span className="text-xs font-bold">{red[0]}</span></a>)}</div></div>
        </div>
        <div className="flex flex-col gap-2 border-t border-white/10 pb-2 pt-4 text-xs text-emerald-100/70 sm:flex-row sm:justify-between"><p>© 2026 Sistema SIGTAD. {t('footer.rights')}</p><p>{t('footer.tagline')}</p></div>
      </div>
    </footer>
  );
}

export default Footer;
