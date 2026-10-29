import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import imagenParque from '../assets/parque-hero.jpg';

type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA';

interface Comunicado {
  id: number;
  titulo: string;
  contenido: string;
  prioridad: Prioridad;
  fechaPublicacion: string;
}

const vacio = { titulo: '', contenido: '', prioridad: 'MEDIA' as Prioridad };
const POR_PAGINA = 10;

const prioridades: { valor: Prioridad; etiqueta: string }[] = [
  { valor: 'ALTA', etiqueta: 'Alta' },
  { valor: 'MEDIA', etiqueta: 'Media' },
  { valor: 'BAJA', etiqueta: 'Baja' },
];

const estilosPrioridad: Record<Prioridad, string> = {
  ALTA: 'border-rose-200/80 bg-rose-50/90 text-rose-700 dark:border-rose-300/20 dark:bg-rose-400/10 dark:text-rose-200',
  MEDIA: 'border-amber-200/80 bg-amber-50/90 text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200',
  BAJA: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200',
};

function Icono({ nombre, className = 'h-5 w-5' }: { nombre: 'comunicado' | 'mas' | 'buscar' | 'calendario' | 'editar' | 'eliminar' | 'cerrar' | 'anterior' | 'siguiente' | 'prioridad'; className?: string }) {
  const comunes = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (nombre) {
    case 'comunicado':
      return <svg {...comunes}><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
    case 'mas':
      return <svg {...comunes}><path d="M12 5v14M5 12h14" /></svg>;
    case 'buscar':
      return <svg {...comunes}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></svg>;
    case 'calendario':
      return <svg {...comunes}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M7.5 3v4M16.5 3v4M3.5 10h17" /></svg>;
    case 'editar':
      return <svg {...comunes}><path d="m14 5 5 5M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z" /></svg>;
    case 'eliminar':
      return <svg {...comunes}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></svg>;
    case 'cerrar':
      return <svg {...comunes}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case 'anterior':
      return <svg {...comunes}><path d="m15 18-6-6 6-6" /></svg>;
    case 'siguiente':
      return <svg {...comunes}><path d="m9 18 6-6-6-6" /></svg>;
    case 'prioridad':
      return <svg {...comunes}><path d="M12 3 22 21H2L12 3Z" /><path d="M12 9v5M12 17h.01" /></svg>;
  }
}

function formatearFecha(fecha: string) {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return 'Fecha no disponible';
  return valor.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function normalizarTexto(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

export default function GestionComunicados() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [formulario, setFormulario] = useState(vacio);
  const [editando, setEditando] = useState<Comunicado | null>(null);
  const [modal, setModal] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [prioridadFiltro, setPrioridadFiltro] = useState<'TODAS' | Prioridad>('TODAS');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [comunicadoAEliminar, setComunicadoAEliminar] = useState<Comunicado | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [menuPrioridadAbierto, setMenuPrioridadAbierto] = useState(false);
  const [menuFiltroPrioridadAbierto, setMenuFiltroPrioridadAbierto] = useState(false);
  const menuPrioridadRef = useRef<HTMLDivElement>(null);
  const menuFiltroPrioridadRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLInputElement>(null);
  const contenidoRef = useRef<HTMLTextAreaElement>(null);
  const [errores, setErrores] = useState<{ titulo?: string; contenido?: string }>({});

  const cargar = async () => {
    setCargando(true);
    try {
      const datos = await api.solicitar<Comunicado[]>(
        '/comunicados',
        { method: 'GET' },
        { incluirAuth: true, mensajeError: 'No se pudieron cargar los comunicados.' },
      );
      setComunicados(Array.isArray(datos) ? datos : []);
      setMensaje('');
    } catch (error: unknown) {
      setMensaje(error instanceof Error ? error.message : 'No se pudieron cargar los comunicados.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  useEffect(() => {
    if (!modal) return;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const temporizador = window.setTimeout(() => tituloRef.current?.focus(), 80);
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setMenuPrioridadAbierto(false);
        setModal(false);
      }
    };
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.body.style.overflow = overflowPrevio;
      window.clearTimeout(temporizador);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [modal]);

  useEffect(() => {
    if (!comunicadoAEliminar) return;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !eliminando) setComunicadoAEliminar(null);
    };
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [comunicadoAEliminar, eliminando]);

  useEffect(() => {
    const cerrarMenusFuera = (evento: MouseEvent) => {
      const destino = evento.target as Node;
      if (menuPrioridadRef.current && !menuPrioridadRef.current.contains(destino)) {
        setMenuPrioridadAbierto(false);
      }
      if (menuFiltroPrioridadRef.current && !menuFiltroPrioridadRef.current.contains(destino)) {
        setMenuFiltroPrioridadAbierto(false);
      }
    };
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setMenuPrioridadAbierto(false);
        setMenuFiltroPrioridadAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrarMenusFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarMenusFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, []);

  const comunicadosFiltrados = useMemo(() => {
    const consulta = normalizarTexto(busqueda.trim());
    return comunicados.filter((comunicado) => {
      const coincideTexto = !consulta ||
        normalizarTexto(`${comunicado.titulo} ${comunicado.contenido}`).includes(consulta);
      const coincidePrioridad = prioridadFiltro === 'TODAS' || comunicado.prioridad === prioridadFiltro;
      return coincideTexto && coincidePrioridad;
    });
  }, [comunicados, busqueda, prioridadFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(comunicadosFiltrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const comunicadosVisibles = comunicadosFiltrados.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA,
  );

  const abrir = (comunicado?: Comunicado) => {
    setEditando(comunicado ?? null);
    setFormulario(comunicado
      ? { titulo: comunicado.titulo, contenido: comunicado.contenido, prioridad: comunicado.prioridad }
      : vacio);
    setMenuPrioridadAbierto(false);
    setMensaje('');
    setErrores({});
    setModal(true);
  };

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (guardando) return;
    const nuevosErrores: { titulo?: string; contenido?: string } = {};
    if (!formulario.titulo.trim()) nuevosErrores.titulo = 'Escribe un título para el comunicado.';
    if (!formulario.contenido.trim()) nuevosErrores.contenido = 'Escribe el contenido del comunicado.';
    if (nuevosErrores.titulo || nuevosErrores.contenido) {
      setErrores(nuevosErrores);
      (nuevosErrores.titulo ? tituloRef : contenidoRef).current?.focus();
      return;
    }
    setErrores({});
    setGuardando(true);
    setMensaje('');
    try {
      await api.solicitar<Comunicado>(
        editando ? `/comunicados/${editando.id}` : '/comunicados',
        { method: editando ? 'PUT' : 'POST', body: JSON.stringify(formulario) },
        { incluirAuth: true, mensajeError: 'No se pudo guardar el comunicado.' },
      );
      setModal(false);
      setPagina(1);
      await cargar();
    } catch (error: unknown) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo guardar el comunicado.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: number) => {
    if (eliminando) return;
    setEliminando(true);
    setMensaje('');
    try {
      await api.solicitar<void>(
        `/comunicados/${id}`,
        { method: 'DELETE' },
        { mensajeError: 'No se pudo eliminar el comunicado.' },
      );
      setComunicadoAEliminar(null);
      await cargar();
      setPagina((actual) => Math.min(actual, Math.max(1, Math.ceil((comunicadosFiltrados.length - 1) / POR_PAGINA))));
    } catch (error: unknown) {
      setComunicadoAEliminar(null);
      setMensaje(error instanceof Error ? error.message : 'No se pudo eliminar el comunicado.');
    } finally {
      setEliminando(false);
    }
  };

  const prioridadSeleccionada = prioridades.find((prioridad) => prioridad.valor === formulario.prioridad) ?? prioridades[1];

  return (
    <main className="relative isolate min-h-screen w-full overflow-x-clip font-['Montserrat',sans-serif] text-[#17382B] transition-colors duration-500 dark:text-[#EDF8F1]">
      {/* Fondo natural y luz ambiental compartidos con Bitácora y los dashboards. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <img
          src={imagenParque}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[14px] opacity-[0.32] saturate-[0.65] transition-[filter,opacity] duration-500 dark:opacity-[0.22] dark:brightness-[0.48] dark:saturate-[0.78]"
        />
        <div className="absolute inset-0 bg-[#EEF4EF]/76 backdrop-blur-[4px] transition-colors duration-500 dark:bg-[#071C16]/88" />
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-[#8DC63F]/10 blur-[130px] dark:bg-[#8DC63F]/[0.055]" />
        <div className="absolute -right-24 bottom-0 h-[430px] w-[430px] rounded-full bg-[#00AEEF]/[0.07] blur-[130px] dark:bg-[#00AEEF]/[0.04]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-4 pb-10 pt-5 sm:px-7 sm:pt-7 lg:px-10 lg:pt-8">
      <section className="overflow-hidden rounded-[2.4rem] border border-white/45 bg-white/[0.22] shadow-[0_24px_80px_rgba(7,63,49,0.07)] backdrop-blur-[32px] sm:rounded-[2.8rem] dark:border-white/10 dark:bg-[#0B3026]/[0.72] dark:shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
        <header className="relative overflow-hidden px-7 pb-6 pt-8 text-[#123D30] sm:px-10 sm:pb-6 sm:pt-10 lg:px-14 lg:pt-12 dark:text-[#F0FAF4]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#d9d823]/[0.18] blur-3xl dark:bg-[#D9D823]/[0.08]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-[#00AEEF]/[0.14] blur-3xl dark:bg-[#00AEEF]/[0.07]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="mt-0 max-w-[900px] text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-[4rem]">Comunicados oficiales</h1>
              <p className="mt-4 max-w-[800px] text-base font-normal leading-7 text-[#687E74] dark:text-[#A9BCB4] sm:text-lg">Gestiona los avisos y mantén la información importante organizada y accesible.</p>
              <div className="mt-5 flex items-center gap-2" aria-hidden="true">
                <span className="h-[3px] w-12 rounded-full bg-[#009444]" />
                <span className="h-[3px] w-8 rounded-full bg-[#8DC63F]" />
                <span className="h-[3px] w-5 rounded-full bg-[#D9D823]" />
                <span className="h-[3px] w-7 rounded-full bg-[#00AEEF]" />
              </div>
            </div>
            <button type="button" onClick={() => abrir()} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-white/30 bg-[#0b6849] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(11,104,73,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#095b40] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 active:scale-[0.98] dark:border-white/10 dark:bg-[#147451] dark:hover:bg-[#1a805d]">
              <Icono nombre="mas" className="h-5 w-5" />
              Nuevo comunicado
            </button>
          </div>
        </header>

        <div className="space-y-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
          {mensaje && !modal && (
            <div role="alert" className="flex items-start gap-3 rounded-[1.4rem] border border-red-200/70 bg-red-50/[0.75] px-5 py-4 text-sm text-red-800 shadow-sm backdrop-blur-xl dark:border-red-400/20 dark:bg-red-950/[0.35] dark:text-red-100">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 font-bold dark:bg-rose-300/15">!</span>
              <p className="flex-1 leading-6">{mensaje}</p>
              <button type="button" onClick={() => setMensaje('')} aria-label="Cerrar mensaje" className="rounded-lg p-1 hover:bg-rose-200/60 dark:hover:bg-rose-300/10"><Icono nombre="cerrar" className="h-4 w-4" /></button>
            </div>
          )}

          <section
            aria-labelledby="filtros-comunicados"
            className="relative z-20 rounded-[1.8rem] border border-white/55 bg-white/[0.28] p-5 shadow-[0_16px_42px_rgba(7,63,49,0.045)] backdrop-blur-2xl sm:p-7 lg:p-8 dark:border-white/10 dark:bg-[#09261E]/[0.42] dark:shadow-[0_18px_50px_rgba(0,0,0,0.20)]"
          >
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <h2 id="filtros-comunicados" className="text-2xl font-extrabold tracking-tight text-[#095540] dark:text-white">Listado de comunicados</h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 dark:text-emerald-100/60">Consulta, busca y administra los comunicados oficiales.</p>
              </div>
              <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-white/70 bg-white/55 px-3 py-1.5 text-[11px] font-semibold text-[#567168] shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-emerald-100/65">
                {prioridadFiltro === 'TODAS' ? 'Todas las prioridades' : `Prioridad ${prioridadFiltro.toLocaleLowerCase('es')}`}
              </span>
            </div>

            <div className="mt-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.42fr)] lg:gap-5">
              <label className="block min-w-0">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#60786d] dark:text-[#a8c0b3]">Buscar comunicado</span>
                <span className="relative block min-w-0">
                  <Icono nombre="buscar" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700/70 dark:text-emerald-200/65" />
                  <input
                    value={busqueda}
                    onChange={(evento) => { setBusqueda(evento.target.value); setPagina(1); }}
                    placeholder="Buscar por título o contenido..."
                    className="min-h-12 w-full min-w-0 rounded-[1rem] border border-white/70 bg-white/70 py-3 pl-11 pr-4 text-sm font-medium text-[#304B40] shadow-[0_4px_14px_rgba(7,63,49,0.035)] outline-none backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-[#82938B] focus-visible:border-[#009444]/60 focus-visible:bg-white/90 focus-visible:ring-4 focus-visible:ring-[#009444]/[0.12] dark:border-white/[0.10] dark:bg-[#09261E]/[0.58] dark:text-[#F0FAF4] dark:placeholder:text-[#8EA69B] dark:focus-visible:border-[#8DC63F]/60 dark:focus-visible:bg-[#0F3529]/[0.78]"
                  />
                </span>
              </label>

              <div className="relative min-w-0" ref={menuFiltroPrioridadRef}>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#60786d] dark:text-[#a8c0b3]">Filtrar por prioridad</span>
                <button
                  type="button"
                  onClick={() => setMenuFiltroPrioridadAbierto((abierto) => !abierto)}
                  aria-haspopup="listbox"
                  aria-expanded={menuFiltroPrioridadAbierto}
                  aria-label="Filtrar comunicados por prioridad"
                  className={`flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-[1rem] border bg-white/70 px-4 py-3 text-left text-sm font-semibold text-[#304B40] shadow-[0_4px_14px_rgba(7,63,49,0.035)] outline-none backdrop-blur-xl transition-[border-color,background-color,box-shadow] focus-visible:border-[#009444]/60 focus-visible:ring-4 focus-visible:ring-[#009444]/[0.12] dark:bg-[#09261E]/[0.58] dark:text-[#F0FAF4] dark:focus-visible:border-[#8DC63F]/60 ${menuFiltroPrioridadAbierto ? 'border-emerald-600/55 ring-2 ring-emerald-500/10 dark:border-emerald-300/40' : 'border-white/70 dark:border-white/[0.10]'}`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${prioridadFiltro === 'ALTA' ? 'bg-rose-500' : prioridadFiltro === 'MEDIA' ? 'bg-amber-500' : prioridadFiltro === 'BAJA' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className="truncate">{prioridadFiltro === 'TODAS' ? 'Todas las prioridades' : prioridades.find((opcion) => opcion.valor === prioridadFiltro)?.etiqueta ?? 'Todas las prioridades'}</span>
                  </span>
                  <svg className={`h-4 w-4 shrink-0 text-emerald-700 transition-transform duration-200 dark:text-emerald-200 ${menuFiltroPrioridadAbierto ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {menuFiltroPrioridadAbierto && (
                  <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-white/85 bg-white/95 p-1.5 shadow-[0_18px_42px_rgba(20,60,43,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#102e23]/[0.98]" role="listbox" aria-label="Prioridad del comunicado">
                    {([
                      { valor: 'TODAS' as const, etiqueta: 'Todas las prioridades', color: 'bg-slate-400' },
                      { valor: 'ALTA' as const, etiqueta: 'Alta', color: 'bg-rose-500' },
                      { valor: 'MEDIA' as const, etiqueta: 'Media', color: 'bg-amber-500' },
                      { valor: 'BAJA' as const, etiqueta: 'Baja', color: 'bg-emerald-500' },
                    ]).map((opcion) => (
                      <button
                        key={opcion.valor}
                        type="button"
                        role="option"
                        aria-selected={prioridadFiltro === opcion.valor}
                        onClick={() => {
                          setPrioridadFiltro(opcion.valor);
                          setPagina(1);
                          setMenuFiltroPrioridadAbierto(false);
                        }}
                        className={`flex min-h-10 w-full items-center justify-between rounded-xl px-3.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:focus-visible:ring-emerald-300/30 ${prioridadFiltro === opcion.valor ? 'bg-emerald-500/[0.09] font-semibold text-[#174b38] dark:bg-emerald-300/[0.10] dark:text-emerald-50' : 'text-slate-700 hover:bg-emerald-500/[0.07] dark:text-slate-200 dark:hover:bg-white/[0.07]'}`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${opcion.color}`} /><span className="truncate">{opcion.etiqueta}</span></span>
                        {prioridadFiltro === opcion.valor && <span className="ml-3 shrink-0 font-bold text-emerald-700 dark:text-emerald-200">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section aria-label="Comunicados publicados" className="relative z-10 overflow-hidden rounded-[1.9rem] border border-white/55 bg-white/[0.25] shadow-[0_18px_45px_rgba(7,63,49,0.045)] backdrop-blur-xl dark:border-white/10 dark:bg-[#09261E]/[0.42] dark:shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <div className="flex justify-end border-b border-white/45 px-5 py-3 text-xs font-medium text-slate-400 dark:border-white/[0.06] dark:text-emerald-100/45 sm:px-7">
              {busqueda.trim() && prioridadFiltro !== 'TODAS'
                ? `Búsqueda · Prioridad ${prioridadFiltro.toLocaleLowerCase('es')}`
                : busqueda.trim()
                  ? 'Resultados de búsqueda'
                  : prioridadFiltro !== 'TODAS'
                    ? `Prioridad ${prioridadFiltro.toLocaleLowerCase('es')}`
                    : 'Todas las publicaciones'}
            </div>
            <div className="flex flex-col gap-4 p-5 sm:p-6 lg:p-7">
            {cargando ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.8rem] border border-white/45 bg-white/[0.34] p-8 text-center shadow-[0_18px_50px_rgba(9,85,64,0.035)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]" role="status">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700 dark:border-emerald-900 dark:border-t-emerald-300" />
                <p className="mt-4 text-sm font-semibold text-emerald-900/70 dark:text-emerald-100/65">Cargando comunicados...</p>
              </div>
            ) : comunicadosFiltrados.length > 0 ? (
              <div className="flex min-h-[28rem] flex-col gap-4">
                <div className="min-h-[20rem] max-h-[65vh] flex-1 space-y-4 overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(11,104,73,0.35)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#0b6849]/30 [&::-webkit-scrollbar-track]:bg-transparent">
                {comunicadosVisibles.map((comunicado) => (
                  <article key={comunicado.id} className="group relative overflow-hidden rounded-[1.8rem] border border-white/40 bg-white/[0.34] p-5 shadow-[0_14px_38px_rgba(7,63,49,0.035)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.45] hover:shadow-[0_18px_45px_rgba(7,63,49,0.055)] sm:p-6 dark:border-white/[0.08] dark:bg-white/[0.045] dark:shadow-[0_14px_38px_rgba(0,0,0,0.18)] dark:hover:bg-white/[0.07] dark:hover:shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${estilosPrioridad[comunicado.prioridad]}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />{comunicado.prioridad === 'ALTA' ? 'Prioridad alta' : comunicado.prioridad === 'MEDIA' ? 'Prioridad media' : 'Prioridad baja'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-emerald-100/50"><Icono nombre="calendario" className="h-3.5 w-3.5" />{formatearFecha(comunicado.fechaPublicacion)}</span>
                        </div>
                        <h3 className="mt-3 break-words text-lg font-bold leading-snug text-[#164b3c] sm:text-xl dark:text-emerald-50">{comunicado.titulo}</h3>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600 dark:text-emerald-100/65">{comunicado.contenido}</p>
                      </div>
                      <div className="flex shrink-0 flex-row gap-2 sm:justify-end">
                        <button type="button" onClick={() => abrir(comunicado)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-800/10 bg-white/75 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15 dark:border-white/10 dark:bg-white/5 dark:text-emerald-100 dark:hover:bg-emerald-300/10"><Icono nombre="editar" className="h-4 w-4" />Editar</button>
                        <button type="button" onClick={() => setComunicadoAEliminar(comunicado)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/75 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/15 dark:border-rose-300/15 dark:bg-rose-300/[0.06] dark:text-rose-200 dark:hover:bg-rose-300/10"><Icono nombre="eliminar" className="h-4 w-4" />Eliminar</button>
                      </div>
                    </div>
                  </article>
                ))}

                </div>
                <nav aria-label="Paginación de comunicados" className="flex shrink-0 flex-col gap-3 rounded-[1.4rem] border border-white/45 bg-white/[0.32] px-4 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-xs text-slate-500 dark:text-emerald-100/55">Página <span className="font-bold text-emerald-900 dark:text-emerald-100">{paginaActual}</span> de <span className="font-bold text-emerald-900 dark:text-emerald-100">{totalPaginas}</span> <span className="ml-1 text-slate-400 dark:text-emerald-100/45">· 10 comunicados por página</span></p>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button type="button" disabled={paginaActual <= 1} onClick={() => setPagina((actual) => Math.max(1, actual - 1))} className="inline-flex h-10 items-center gap-1 rounded-xl border border-white/90 bg-white/75 px-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-emerald-100 dark:hover:bg-white/10"><Icono nombre="anterior" className="h-4 w-4" /><span>Anterior</span></button>
                    <button type="button" disabled={paginaActual >= totalPaginas} onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))} className="inline-flex h-10 items-center gap-1 rounded-xl border border-white/90 bg-white/75 px-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-emerald-100 dark:hover:bg-white/10"><span>Siguiente</span><Icono nombre="siguiente" className="h-4 w-4" /></button>
                  </div>
                </nav>
              </div>
            ) : (
              <div className="flex min-h-[19rem] flex-col items-center justify-center rounded-[1.8rem] border border-white/45 bg-white/[0.24] px-5 py-12 text-center shadow-[0_18px_45px_rgba(7,63,49,0.035)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/70 bg-emerald-100/75 text-emerald-800 shadow-sm dark:border-emerald-300/15 dark:bg-emerald-300/10 dark:text-emerald-200"><Icono nombre="comunicado" className="h-7 w-7" /></div>
                <h3 className="mt-5 text-lg font-bold text-[#15533f] dark:text-emerald-50">{busqueda.trim() || prioridadFiltro !== 'TODAS' ? 'No encontramos coincidencias' : 'Aún no hay comunicados'}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-emerald-100/55">{busqueda.trim() || prioridadFiltro !== 'TODAS' ? 'Prueba con otro término o cambia la prioridad seleccionada.' : 'Cuando publiques un comunicado, aparecerá aquí para que puedas administrarlo.'}</p>
                {busqueda.trim() || prioridadFiltro !== 'TODAS' ? (
                  <button type="button" onClick={() => { setBusqueda(''); setPrioridadFiltro('TODAS'); setPagina(1); }} className="mt-5 rounded-xl border border-emerald-800/10 bg-white/75 px-4 py-2.5 text-sm font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:text-emerald-100 dark:hover:bg-white/10">Limpiar filtros</button>
                ) : (
                  <button type="button" onClick={() => abrir()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#075b45] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(5,91,69,0.18)] transition hover:-translate-y-0.5 hover:bg-[#064d3b] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:bg-emerald-400/15 dark:text-emerald-50 dark:hover:bg-emerald-400/25"><Icono nombre="mas" className="h-4 w-4" />Crear primer comunicado</button>
                )}
              </div>
            )}
            </div>
          </section>
        </div>
      </section>
      </div>

      {modal && createPortal(
        <div className="fixed inset-0 z-[9000] flex items-center justify-center overflow-hidden overscroll-contain bg-[#071C16]/[0.58] p-3 font-['Montserrat',sans-serif] backdrop-blur-none sm:p-6 sm:backdrop-blur-[12px]" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setModal(false); }}>
          <form noValidate onSubmit={(evento) => void guardar(evento)} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto overscroll-y-contain rounded-[2rem] border border-white/45 bg-white/[0.96] p-5 shadow-[0_28px_100px_rgba(3,32,23,0.28)] [scrollbar-gutter:stable] sm:max-h-[calc(100dvh-3rem)] sm:overscroll-contain sm:bg-white/[0.93] sm:backdrop-blur-[32px] sm:p-8 dark:border-white/10 dark:bg-[#0B3026]/[0.98] sm:dark:bg-[#0B3026]/[0.96]">
            <div className="flex items-start justify-between gap-4 border-b border-emerald-900/10 pb-5 dark:border-white/10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700/75 dark:text-emerald-300/70">Comunicación institucional</p>
                <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#164b3c] dark:text-emerald-50">{editando ? 'Editar comunicado' : 'Nuevo comunicado'}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-emerald-100/55">Completa la información que se publicará para los usuarios.</p>
              </div>
              <button type="button" onClick={() => { setModal(false); setMenuPrioridadAbierto(false); }} aria-label="Cerrar formulario" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-900/10 bg-white/75 text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15 dark:border-white/10 dark:bg-white/5 dark:text-emerald-100 dark:hover:bg-rose-300/10"><Icono nombre="cerrar" /></button>
            </div>

            {mensaje && (
              <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-300/15 dark:bg-rose-300/10 dark:text-rose-100">{mensaje}</div>
            )}

            <label className="mt-6 block text-sm font-bold text-slate-700 dark:text-emerald-100/85">Título
              <input ref={tituloRef} required maxLength={180} value={formulario.titulo} onChange={(evento) => { setFormulario({ ...formulario, titulo: evento.target.value }); if (errores.titulo) setErrores((actuales) => ({ ...actuales, titulo: undefined })); }} placeholder="Escribe el título del comunicado" aria-invalid={Boolean(errores.titulo)} aria-describedby={errores.titulo ? 'error-titulo' : undefined} className={`mt-2 h-12 w-full rounded-xl border bg-white/80 px-4 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 dark:bg-white/[0.055] dark:text-emerald-50 dark:placeholder:text-emerald-100/35 ${errores.titulo ? 'border-rose-400/70 ring-4 ring-rose-500/10 dark:border-rose-300/40' : 'border-emerald-900/10 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10'}`} />
              {errores.titulo && (
                <span id="error-titulo" role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-200"><Icono nombre="prioridad" className="h-3.5 w-3.5 shrink-0" />{errores.titulo}</span>
              )}
            </label>

            <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-emerald-100/85">Contenido
              <textarea ref={contenidoRef} required rows={6} value={formulario.contenido} onChange={(evento) => { setFormulario({ ...formulario, contenido: evento.target.value }); if (errores.contenido) setErrores((actuales) => ({ ...actuales, contenido: undefined })); }} placeholder="Escribe aquí el mensaje que deseas comunicar..." aria-invalid={Boolean(errores.contenido)} aria-describedby={errores.contenido ? 'error-contenido' : undefined} className={`mt-2 max-h-56 w-full resize-none overflow-y-auto overscroll-contain rounded-xl border bg-white/80 px-4 py-3 text-sm font-normal leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 dark:bg-white/[0.055] dark:text-emerald-50 dark:placeholder:text-emerald-100/35 ${errores.contenido ? 'border-rose-400/70 ring-4 ring-rose-500/10 dark:border-rose-300/40' : 'border-emerald-900/10 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10'}`} />
              {errores.contenido && (
                <span id="error-contenido" role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-200"><Icono nombre="prioridad" className="h-3.5 w-3.5 shrink-0" />{errores.contenido}</span>
              )}
            </label>

            <div className="relative mt-5" ref={menuPrioridadRef}>
              <span className="block text-sm font-bold text-slate-700 dark:text-emerald-100/85">Prioridad</span>
              <button type="button" onClick={() => setMenuPrioridadAbierto((abierto) => !abierto)} aria-haspopup="listbox" aria-expanded={menuPrioridadAbierto} className="mt-2 flex h-12 w-full items-center justify-between rounded-xl border border-emerald-900/10 bg-white/80 px-4 text-left text-sm text-slate-700 shadow-sm outline-none transition hover:border-emerald-500/30 focus-visible:ring-4 focus-visible:ring-emerald-500/10 dark:border-white/10 dark:bg-white/[0.055] dark:text-emerald-50">
                <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${formulario.prioridad === 'ALTA' ? 'bg-rose-500' : formulario.prioridad === 'MEDIA' ? 'bg-amber-500' : 'bg-emerald-500'}`} />{prioridadSeleccionada.etiqueta}</span>
                <svg className={`h-4 w-4 text-emerald-700 transition-transform duration-200 dark:text-emerald-200 ${menuPrioridadAbierto ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {menuPrioridadAbierto && (
                <div className="absolute left-0 right-0 bottom-full z-[100] mb-2 overflow-hidden rounded-xl border border-white/90 bg-white/95 shadow-[0_16px_40px_rgba(20,60,43,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#102e23]/[0.98]" role="listbox" aria-label="Prioridad">
                  {prioridades.map((prioridad) => (
                    <button key={prioridad.valor} type="button" role="option" aria-selected={formulario.prioridad === prioridad.valor} onClick={() => { setFormulario({ ...formulario, prioridad: prioridad.valor }); setMenuPrioridadAbierto(false); }} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-emerald-50 focus:outline-none focus-visible:bg-emerald-50 dark:text-emerald-50 dark:hover:bg-white/10 dark:focus-visible:bg-white/10">
                      <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${prioridad.valor === 'ALTA' ? 'bg-rose-500' : prioridad.valor === 'MEDIA' ? 'bg-amber-500' : 'bg-emerald-500'}`} />{prioridad.etiqueta}</span>
                      {formulario.prioridad === prioridad.valor && <span className="font-bold text-emerald-700 dark:text-emerald-200">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-emerald-900/10 pt-5 sm:flex-row sm:justify-end dark:border-white/10">
              <button type="button" disabled={guardando} onClick={() => { setModal(false); setMenuPrioridadAbierto(false); }} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-900/10 bg-white/75 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-emerald-100 dark:hover:bg-white/10">Cancelar</button>
              <button type="submit" disabled={guardando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#075b45] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(5,91,69,0.18)] transition hover:bg-[#064d3b] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:cursor-wait disabled:opacity-60 dark:bg-emerald-400/15 dark:text-emerald-50 dark:hover:bg-emerald-400/25">
                {guardando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Publicar comunicado'}
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )}

      {comunicadoAEliminar && createPortal(
        <div
          className="fixed inset-0 z-[9100] flex items-center justify-center overflow-hidden overscroll-contain bg-[#071C16]/[0.58] p-3 font-['Montserrat',sans-serif] backdrop-blur-[12px] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-eliminar-comunicado"
          aria-describedby="detalle-eliminar-comunicado"
          onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !eliminando) setComunicadoAEliminar(null); }}
        >
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-[2rem] border border-white/45 bg-white/[0.93] p-6 shadow-[0_28px_100px_rgba(3,32,23,0.28)] backdrop-blur-[32px] sm:p-8 dark:border-white/10 dark:bg-[#0B3026]/[0.96]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200/80 bg-rose-50/80 text-rose-600 dark:border-rose-300/15 dark:bg-rose-300/10 dark:text-rose-200">
              <Icono nombre="eliminar" className="h-6 w-6" />
            </div>
            <h2 id="titulo-eliminar-comunicado" className="mt-5 text-2xl font-extrabold tracking-tight text-[#164b3c] dark:text-emerald-50">Eliminar comunicado</h2>
            <p id="detalle-eliminar-comunicado" className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-emerald-100/65">
              ¿Deseas eliminar <span className="font-bold text-[#164b3c] dark:text-emerald-50">“{comunicadoAEliminar.titulo}”</span>? Esta acción no se puede deshacer.
            </p>
            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-emerald-900/10 pt-5 sm:flex-row sm:justify-end dark:border-white/10">
              <button type="button" autoFocus disabled={eliminando} onClick={() => setComunicadoAEliminar(null)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-900/10 bg-white/75 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/15 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-emerald-100 dark:hover:bg-white/10">Cancelar</button>
              <button type="button" disabled={eliminando} onClick={() => void eliminar(comunicadoAEliminar.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(225,29,72,0.2)] transition hover:bg-rose-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 disabled:cursor-wait disabled:opacity-60">
                {eliminando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </main>
  );
}