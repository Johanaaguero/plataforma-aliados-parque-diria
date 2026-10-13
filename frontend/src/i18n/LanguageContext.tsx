import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Language = 'es' | 'en';

const STORAGE_KEY = 'sigtad.language';

const translations = {
  es: {
    'nav.home': 'Inicio',
    'nav.businesses': 'Emprendimientos',
    'nav.events': 'Eventos y capacitaciones',
    'nav.reportIncident': 'Reportar incidencia',
    'nav.notifications': 'Notificaciones',
    'nav.login': 'Iniciar sesión',
    'nav.logout': 'Cerrar sesión',
    'nav.controlPanel': 'Panel de control',
    'nav.myBookings': 'Mis reservas',
    'nav.myIncidents': 'Mis incidencias',
    'nav.myEvents': 'Mis eventos y capacitaciones',
    'nav.myBusinesses': 'Mis emprendimientos',
    'nav.language': 'Idioma',
    'hero.title': 'Uniendo la Conservación, la Comunidad',
    'hero.titleAccent': 'y el Desarrollo Sostenible en el Parque Nacional Diriá.',
    'hero.description': 'Descubre el Parque Nacional Diriá y las experiencias, actividades y emprendimientos que nacen alrededor de este paisaje único.',
    'hero.selectImage': 'Seleccionar imagen',
    'hero.slide': 'Diapositiva',
    'hero.of': 'de',
    'hero.showSlide': 'Mostrar diapositiva',
    'hero.pause': 'Pausar carrusel',
    'hero.resume': 'Reanudar carrusel',
    'footer.description': 'Sistema de Gestión Turística y Administrativa que conecta el Parque Nacional Diriá con sus aliados y comunidades.',
    'footer.explore': 'Explora',
    'footer.aboutPark': 'Sobre el parque',
    'footer.experiences': 'Experiencias',
    'footer.territory': 'Territorio',
    'footer.community': 'Comunidad',
    'footer.rights': 'Todos los derechos reservados.',
    'footer.partners': 'Aliados del Parque',
    'footer.tagline': 'Parque, comunidad y turismo responsable.',
    'incident.scope': 'Este módulo está destinado exclusivamente al reporte y seguimiento comunitario o de infraestructura del parque.',
    'incident.emergency': 'ATENCIÓN: Este canal NO es un servicio de atención de emergencias. En caso de riesgo o emergencia real, llame directamente al 911.',
    'incident.title': 'Registrar incidencia',
    'incident.description': 'Complete el formulario para notificar un evento en el parque.',
    'incident.close': 'Cerrar formulario',
    'incident.note': 'Nota aclaratoria:',
  },
  en: {
    'nav.home': 'Home',
    'nav.businesses': 'Businesses',
    'nav.events': 'Events and training',
    'nav.reportIncident': 'Report an incident',
    'nav.notifications': 'Notifications',
    'nav.login': 'Sign in',
    'nav.logout': 'Sign out',
    'nav.controlPanel': 'Control panel',
    'nav.myBookings': 'My bookings',
    'nav.myIncidents': 'My incidents',
    'nav.myEvents': 'My events and training',
    'nav.myBusinesses': 'My businesses',
    'nav.language': 'Language',
    'hero.title': 'Connecting Conservation and Community',
    'hero.titleAccent': 'with Sustainable Development in Diriá National Park.',
    'hero.description': 'Discover Diriá National Park and the experiences, activities and local businesses that grow around this unique landscape.',
    'hero.selectImage': 'Select image',
    'hero.slide': 'Slide',
    'hero.of': 'of',
    'hero.showSlide': 'Show slide',
    'hero.pause': 'Pause carousel',
    'hero.resume': 'Resume carousel',
    'footer.description': 'Tourism and Administrative Management System connecting Diriá National Park with its partners and communities.',
    'footer.explore': 'Explore',
    'footer.aboutPark': 'About the park',
    'footer.experiences': 'Experiences',
    'footer.territory': 'Territory',
    'footer.community': 'Community',
    'footer.rights': 'All rights reserved.',
    'footer.partners': 'Park Partners',
    'footer.tagline': 'Park, community and responsible tourism.',
    'incident.scope': 'This module is intended exclusively for community or park infrastructure reporting and follow-up.',
    'incident.emergency': 'WARNING: This channel is NOT an emergency service. In case of real danger or an emergency, call 911 directly.',
    'incident.title': 'Report an incident',
    'incident.description': 'Complete the form to report an event in the park.',
    'incident.close': 'Close form',
    'incident.note': 'Important notice:',
  },
} as const;

type TranslationKey = keyof (typeof translations)['es'];

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const readStoredLanguage = (): Language => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'en' ? 'en' : 'es';
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => translations[language][key],
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
