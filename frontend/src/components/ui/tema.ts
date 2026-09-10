export type PreferenciaTema = 'auto' | 'light' | 'dark';
export type Tema = 'light' | 'dark';

export const CLAVE_TEMA = 'sigtad:preferencia-tema';

export function leerPreferenciaTema(): PreferenciaTema {
  try {
    const preferencia = localStorage.getItem(CLAVE_TEMA);
    if (preferencia === 'light' || preferencia === 'dark') return preferencia;
  } catch {
    // La apariencia también funciona cuando el navegador bloquea el almacenamiento.
  }
  return 'auto';
}

export function resolverTema(preferencia: PreferenciaTema): Tema {
  if (preferencia !== 'auto') return preferencia;
  if (typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  }
  const hora = new Date().getHours();
  return hora >= 18 || hora < 6 ? 'dark' : 'light';
}

export function aplicarTema(preferencia: PreferenciaTema): Tema {
  const tema = resolverTema(preferencia);
  document.documentElement.dataset.theme = tema;
  document.documentElement.dataset.themePreference = preferencia;
  document.documentElement.style.colorScheme = tema;
  return tema;
}

export function guardarPreferenciaTema(preferencia: PreferenciaTema): void {
  try {
    localStorage.setItem(CLAVE_TEMA, preferencia);
  } catch {
    // Se mantiene la selección durante esta visita sin afectar la sesión del usuario.
  }
}
