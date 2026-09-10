import { useEffect, useState } from 'react';

import logo from '../../assets/logo.png';

const CLAVE_SPLASH = 'sigtad:splash-visto';

export default function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(CLAVE_SPLASH) !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!visible) return;

    const temporizador = window.setTimeout(() => {
      try {
        sessionStorage.setItem(CLAVE_SPLASH, '1');
      } catch {
        // La presentación continúa aunque el navegador bloquee el almacenamiento.
      }
      setVisible(false);
    }, 1800);

    return () => window.clearTimeout(temporizador);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="sigtad-splash fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#073f31]" role="status" aria-label="Cargando Aliados del Parque Diriá">
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[#8dc63f]/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-[#00aeef]/15 blur-3xl" aria-hidden="true" />
      <div className="sigtad-splash-logo relative flex h-44 w-52 items-center justify-center rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-md sm:h-52 sm:w-64">
        <img src={logo} alt="Aliados del Parque Nacional Diriá" className="h-full w-full object-contain" />
      </div>
    </div>
  );
}