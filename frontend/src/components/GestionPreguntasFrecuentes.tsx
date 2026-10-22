import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../services/api';
import imagenParque from '../assets/parque-hero.jpg';

interface PreguntaFrecuente {
  id: number;
  pregunta: string;
  respuesta: string;
  palabrasClave: string[];
  publicada: boolean;
}

interface FormularioPregunta {
  pregunta: string;
  respuesta: string;
  publicada: boolean;
}

const formularioVacio: FormularioPregunta = {
  pregunta: '',
  respuesta: '',
  publicada: false,
};

const PREGUNTAS_POR_PAGINA = 10;

const opcionesApi = {
  incluirAuth: true,
  mensajeError: 'No se pudieron cargar las preguntas frecuentes.',
};

export default function GestionPreguntasFrecuentes() {
  const [preguntas, setPreguntas] = useState<PreguntaFrecuente[]>([]);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [editando, setEditando] = useState<PreguntaFrecuente | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const resultado = await api.solicitar<PreguntaFrecuente[]>(
        '/preguntas-frecuentes/administracion',
        { method: 'GET' },
        opcionesApi,
      );
      setPreguntas(resultado);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : opcionesApi.mensajeError);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const abrirFormulario = (pregunta?: PreguntaFrecuente) => {
    setEditando(pregunta ?? null);
    setFormulario(
      pregunta
        ? {
            pregunta: pregunta.pregunta,
            respuesta: pregunta.respuesta,
            publicada: pregunta.publicada,
          }
        : formularioVacio,
    );
    setMensaje('');
    setModalAbierto(true);
  };

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setGuardando(true);
    setMensaje('');
    try {
      await api.solicitar<PreguntaFrecuente>(
        editando ? `/preguntas-frecuentes/${editando.id}` : '/preguntas-frecuentes',
        {
          method: editando ? 'PUT' : 'POST',
          body: JSON.stringify({
            pregunta: formulario.pregunta,
            respuesta: formulario.respuesta,
            publicada: formulario.publicada,
          }),
        },
        { incluirAuth: true, mensajeError: 'No se pudo guardar la pregunta frecuente.' },
      );
      setModalAbierto(false);
      await cargar();
    } catch (error) {
      setMensaje(
        error instanceof Error ? error.message : 'No se pudo guardar la pregunta frecuente.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPublicacion = async (pregunta: PreguntaFrecuente) => {
    setMensaje('');
    try {
      await api.solicitar<PreguntaFrecuente>(
        `/preguntas-frecuentes/${pregunta.id}/publicacion`,
        { method: 'PATCH', body: JSON.stringify({ publicada: !pregunta.publicada }) },
        { incluirAuth: true, mensajeError: 'No se pudo cambiar la publicación.' },
      );
      await cargar();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo cambiar la publicación.');
    }
  };

  const eliminar = async (pregunta: PreguntaFrecuente) => {
    if (!window.confirm(`¿Eliminar la pregunta “${pregunta.pregunta}”?`)) return;
    setMensaje('');
    try {
      await api.solicitar<void>(
        `/preguntas-frecuentes/${pregunta.id}`,
        { method: 'DELETE' },
        { incluirAuth: true, mensajeError: 'No se pudo eliminar la pregunta frecuente.' },
      );
      await cargar();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo eliminar la pregunta frecuente.');
    }
  };

  const preguntasFiltradas = preguntas.filter((pregunta) => {
    const consulta = busqueda.trim().toLocaleLowerCase('es');
    return !consulta || `${pregunta.pregunta} ${pregunta.respuesta}`.toLocaleLowerCase('es').includes(consulta);
  });
  const totalPaginas = Math.max(1, Math.ceil(preguntasFiltradas.length / PREGUNTAS_POR_PAGINA));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const preguntasPaginadas = preguntasFiltradas.slice(
    (paginaSegura - 1) * PREGUNTAS_POR_PAGINA,
    paginaSegura * PREGUNTAS_POR_PAGINA,
  );

  useEffect(() => {
    setPaginaActual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  return (
    <main className="relative isolate min-h-screen w-full overflow-x-clip font-brand text-[#173d2e] dark:text-[#edf8f1]">
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
      <section className="relative overflow-visible rounded-[2.4rem] border border-white/45 bg-white/[0.22] shadow-[0_24px_80px_rgba(7,63,49,0.07)] backdrop-blur-[32px] sm:rounded-[2.8rem] dark:border-white/10 dark:bg-[#0B3026]/[0.72] dark:shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#8dc63f]/10 blur-3xl" />
          <div className="absolute left-[38%] top-0 h-44 w-64 rounded-full bg-[#00AEEF]/[0.08] blur-3xl" />
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
        </div>

        <div className="p-5 sm:p-7 lg:p-9">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/65 text-[#0b6849] shadow-[0_10px_26px_rgba(11,104,73,0.09)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:text-[#86dfb6]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 18h.01M9.1 9a3 3 0 1 1 5.2 2c-1.2 1-2.3 1.5-2.3 3" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#43856d] dark:text-[#8bc8ae] sm:text-[11px]">Centro de ayuda</p>
                  <h1 className="mt-1 text-3xl font-black tracking-[-0.045em] text-[#123d2e] dark:text-white sm:text-4xl lg:text-[clamp(2.2rem,3.4vw,3.15rem)]">
                    Preguntas frecuentes
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#647b70] dark:text-[#b8cec2] sm:text-base">
                    Organiza las respuestas que ayudan a los visitantes a resolver sus dudas.
                  </p>
                  <div className="mt-4 flex gap-2" aria-hidden="true">
                    <span className="h-1.5 w-12 rounded-full bg-[#009443]" />
                    <span className="h-1.5 w-7 rounded-full bg-[#8dc63f]" />
                    <span className="h-1.5 w-5 rounded-full bg-[#d9d823]" />
                    <span className="h-1.5 w-7 rounded-full bg-[#00AEEF]" />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => abrirFormulario()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#0b6849]/10 bg-[#0b6849] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(11,104,73,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#09583f] hover:shadow-[0_16px_32px_rgba(11,104,73,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] focus-visible:ring-offset-2 focus-visible:ring-offset-white/50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Nueva pregunta
            </button>
          </header>

          {mensaje && !modalAbierto && (
            <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200/80 bg-red-50/85 px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-300/15 dark:bg-red-950/30 dark:text-red-200">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
              <span>{mensaje}</span>
            </div>
          )}

          {/* Panel independiente de título y búsqueda, siguiendo la distribución de Comunicados. */}
          <section
            aria-label="Herramientas de preguntas frecuentes"
            className="mt-8 rounded-[1.9rem] border border-white/55 bg-white/[0.25] shadow-[0_18px_45px_rgba(7,63,49,0.045)] backdrop-blur-xl dark:border-white/10 dark:bg-[#09261E]/[0.42] dark:shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
          >
            <div className="p-5 sm:p-7">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#43856d] dark:text-[#8bc8ae]">Base de conocimiento</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#174c38] dark:text-[#e8f7ee] sm:text-[1.7rem]">Listado de preguntas</h2>
                <p className="mt-1 text-sm text-[#71847a] dark:text-[#aebfb5]">Administra las respuestas que orientan a los visitantes.</p>
              </div>

              <div className="mt-6 max-w-3xl">
                <label className="block w-full">
                  <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#648074] dark:text-[#a9c1b4]">Buscar pregunta</span>
                  <span className="relative block">
                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700/70 dark:text-emerald-200/65" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></svg>
                    <input
                      value={busqueda}
                      onChange={(evento) => { setBusqueda(evento.target.value); setPaginaActual(1); }}
                      placeholder="Buscar por pregunta o respuesta..."
                      aria-label="Buscar por pregunta o respuesta"
                      className="min-h-12 w-full rounded-[1rem] border border-white/30 bg-white/65 py-3 pl-12 pr-4 text-sm font-semibold text-[#304B40] shadow-inner shadow-white/40 outline-none backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-[#82938B] focus-visible:border-[#009444] focus-visible:bg-white/[0.78] focus-visible:ring-4 focus-visible:ring-[#009444]/[0.15] dark:border-white/[0.10] dark:bg-[#09261E]/[0.58] dark:text-[#F0FAF4] dark:placeholder:text-[#8EA69B] dark:shadow-inner dark:shadow-black/20 dark:focus-visible:border-[#8DC63F] dark:focus-visible:bg-[#0F3529]/[0.72]"
                    />
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* El listado se presenta en un panel separado. */}
          <section className="mt-7 overflow-hidden rounded-[1.9rem] border border-white/55 bg-white/[0.25] shadow-[0_18px_45px_rgba(7,63,49,0.045)] backdrop-blur-xl dark:border-white/10 dark:bg-[#09261E]/[0.42] dark:shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            {cargando ? (
              <div className="custom-scrollbar h-[min(60dvh,640px)] min-h-[220px] space-y-3 overflow-y-auto p-5 sm:p-6 lg:p-7" aria-live="polite" aria-label="Cargando preguntas frecuentes">
                {Array.from({ length: PREGUNTAS_POR_PAGINA }, (_, elemento) => (
                  <div key={elemento} className="animate-pulse rounded-3xl border border-white/60 bg-white/45 p-5 dark:border-white/[0.08] dark:bg-white/[0.035]">
                    <div className="h-4 w-24 rounded-full bg-[#0b6849]/10 dark:bg-white/10" />
                    <div className="mt-4 h-5 w-2/3 rounded-lg bg-[#0b6849]/10 dark:bg-white/10" />
                    <div className="mt-3 h-4 w-full rounded-lg bg-[#0b6849]/[0.07] dark:bg-white/[0.07]" />
                    <div className="mt-2 h-4 w-4/5 rounded-lg bg-[#0b6849]/[0.07] dark:bg-white/[0.07]" />
                  </div>
                ))}
              </div>
            ) : preguntasFiltradas.length > 0 ? (
              <div className="custom-scrollbar h-[min(60dvh,640px)] min-h-[220px] overflow-y-auto p-5 sm:p-6 lg:p-7">
                <div className="grid gap-4">
                  {preguntasPaginadas.map((pregunta) => (
                    <article
                      key={pregunta.id}
                      className="group relative overflow-hidden rounded-[1.65rem] border border-white/65 bg-white/55 p-5 shadow-[0_12px_34px_rgba(11,58,39,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/90 hover:bg-white/70 hover:shadow-[0_18px_42px_rgba(11,58,39,0.09)] dark:border-white/[0.09] dark:bg-white/[0.045] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.065] sm:p-6"
                    >
                      <div className={`absolute inset-y-0 left-0 w-1 transition-opacity ${pregunta.publicada ? 'bg-[#009443]' : 'bg-[#d9a514]'}`} />
                      <div className="flex min-w-0 flex-col gap-5 pl-1 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${pregunta.publicada ? 'border-emerald-200/80 bg-emerald-50/80 text-[#087343] dark:border-emerald-300/15 dark:bg-emerald-300/[0.08] dark:text-[#8de2b6]' : 'border-amber-200/80 bg-amber-50/80 text-[#946a0d] dark:border-amber-300/15 dark:bg-amber-300/[0.07] dark:text-[#edd17b]'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${pregunta.publicada ? 'bg-[#009443]' : 'bg-[#d9a514]'}`} />
                              {pregunta.publicada ? 'Publicada' : 'Borrador'}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b9b92] dark:text-[#90a99b]">Pregunta frecuente</span>
                          </div>
                          <h3 className="mt-3 break-words text-lg font-extrabold leading-snug text-[#173d2e] dark:text-[#ebf8f0] sm:text-xl">
                            {pregunta.pregunta}
                          </h3>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#62786d] dark:text-[#b9cec2]">
                            {pregunta.respuesta}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[220px] sm:justify-end">
                          <button
                            type="button"
                            onClick={() => abrirFormulario(pregunta)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/80 bg-white/65 px-3.5 py-2.5 text-xs font-bold text-[#315c49] shadow-sm transition hover:border-[#009443]/20 hover:bg-white hover:text-[#087343] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#d4e9dc] dark:hover:bg-white/10"
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" /></svg>
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void cambiarPublicacion(pregunta)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] ${pregunta.publicada ? 'border-amber-200/80 bg-amber-50/75 text-[#8a650e] hover:bg-amber-100/90 dark:border-amber-300/15 dark:bg-amber-300/[0.07] dark:text-[#edd17b] dark:hover:bg-amber-300/[0.13]' : 'border-emerald-200/80 bg-emerald-50/75 text-[#087343] hover:bg-emerald-100/90 dark:border-emerald-300/15 dark:bg-emerald-300/[0.07] dark:text-[#8de2b6] dark:hover:bg-emerald-300/[0.13]'}`}
                          >
                            {pregunta.publicada ? 'Retirar' : 'Publicar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void eliminar(pregunta)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200/75 bg-red-50/75 px-3.5 py-2.5 text-xs font-bold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-100 dark:border-red-300/15 dark:bg-red-300/[0.06] dark:text-red-300 dark:hover:bg-red-300/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" /></svg>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[min(60dvh,640px)] min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/70 bg-emerald-50/80 text-[#087343] shadow-[0_10px_25px_rgba(11,104,73,0.07)] dark:border-emerald-300/15 dark:bg-emerald-300/[0.07] dark:text-[#8de2b6]">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 9h6M9 13h4" /><path d="M7 3.8h10A2.2 2.2 0 0 1 19.2 6v12a2.2 2.2 0 0 1-2.2 2.2H7A2.2 2.2 0 0 1 4.8 18V6A2.2 2.2 0 0 1 7 3.8Z" /></svg>
                </span>
                <h3 className="mt-5 text-lg font-extrabold text-[#174c38] dark:text-[#e8f7ee]">{busqueda.trim() ? 'No encontramos coincidencias' : 'Todavía no hay preguntas frecuentes'}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#71877b] dark:text-[#aebfb5]">
                  {busqueda.trim() ? 'Prueba con otro término para encontrar una pregunta o respuesta.' : 'Crea la primera pregunta con su respuesta y decide cuándo estará publicada para los visitantes.'}
                </p>
                {busqueda.trim() ? (
                  <button type="button" onClick={() => { setBusqueda(''); setPaginaActual(1); }} className="mt-5 rounded-xl border border-emerald-800/10 bg-white/75 px-4 py-2.5 text-sm font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:text-emerald-100 dark:hover:bg-white/10">Limpiar búsqueda</button>
                ) : (
                  <button
                    type="button"
                    onClick={() => abrirFormulario()}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#0b6849] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(11,104,73,0.19)] transition hover:-translate-y-0.5 hover:bg-[#09583f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00AEEF] focus-visible:ring-offset-2"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                    Crear primera pregunta
                  </button>
                )}
              </div>
            )}

            {!cargando && preguntas.length > 0 && (
              <nav
                aria-label="Paginación de preguntas frecuentes"
                className="mt-4 flex flex-col gap-3 rounded-[1.4rem] border border-white/45 bg-white/[0.32] px-4 py-4 text-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[0.04]"
              >
                <p className="text-xs font-semibold text-[#52675e] dark:text-[#B9CBC0]">
                  Página <span className="font-extrabold text-[#095540] dark:text-[#E8F8EC]">{paginaSegura}</span> de{' '}
                  <span className="font-extrabold text-[#095540] dark:text-[#E8F8EC]">{totalPaginas}</span>
                </p>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
                    disabled={paginaSegura === 1}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/30 bg-white/80 px-3 text-[11px] font-bold text-slate-600 shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 sm:px-4 sm:text-xs dark:border-white/10 dark:bg-[#071C16]/[0.62] dark:text-[#DDEBE5] dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)] dark:hover:bg-[#12372B]"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))}
                    disabled={paginaSegura === totalPaginas}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/30 bg-white/80 px-3 text-[11px] font-bold text-slate-600 shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 sm:px-4 sm:text-xs dark:border-white/10 dark:bg-[#071C16]/[0.62] dark:text-[#DDEBE5] dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)] dark:hover:bg-[#12372B]"
                  >
                    Siguiente
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </nav>
            )}
          </section>

          <footer className="mt-7 flex flex-col gap-2 border-t border-[#173d2e]/10 pt-5 text-xs text-[#7c8f84] dark:border-white/[0.09] dark:text-[#9eb5a8] sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#009443]" /> Gestión de preguntas y respuestas</span>
            <span className="font-semibold tracking-wide">Aliados del Parque Nacional Diriá</span>
          </footer>
        </div>
      </section>

      {modalAbierto && (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-[#08271c]/45 p-3 backdrop-blur-md sm:p-5">
          <form
            onSubmit={(evento) => void guardar(evento)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-pregunta"
            className="my-auto max-h-[min(92dvh,850px)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/65 bg-[#f8fcf9]/95 p-5 shadow-[0_30px_100px_rgba(4,35,23,0.28)] backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[#102d21]/95 sm:rounded-[2rem] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#173d2e]/10 pb-5 dark:border-white/[0.09]">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#43856d] dark:text-[#8bc8ae]">Base de conocimiento</p>
                <h2 id="titulo-modal-pregunta" className="mt-1 text-xl font-extrabold tracking-tight text-[#174c38] dark:text-white sm:text-2xl">
                  {editando ? 'Editar pregunta frecuente' : 'Crear pregunta frecuente'}
                </h2>
                <p className="mt-1 text-sm text-[#71847a] dark:text-[#aebfb5]">Completa la pregunta y su respuesta.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                aria-label="Cerrar formulario"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/65 text-xl text-[#315c49] shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-[#d4e9dc] dark:hover:bg-white/10"
              >
                ×
              </button>
            </div>

            <label className="mt-5 block text-sm font-bold text-[#315747] dark:text-[#d9ebe0]">
              Pregunta
              <input
                required
                maxLength={1000}
                value={formulario.pregunta}
                onChange={(evento) => setFormulario({ ...formulario, pregunta: evento.target.value })}
                placeholder="Escribe la pregunta frecuente..."
                className="mt-2 w-full rounded-2xl border border-[#173d2e]/10 bg-white/75 px-4 py-3 text-sm text-[#173d2e] shadow-sm outline-none transition placeholder:text-[#9aaba1] focus:border-[#009443]/35 focus:ring-4 focus:ring-[#009443]/[0.09] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-[#8da79a] dark:focus:border-[#72d2a4]/35 dark:focus:ring-[#72d2a4]/[0.08]"
              />
            </label>

            <label className="mt-4 block text-sm font-bold text-[#315747] dark:text-[#d9ebe0]">
              Respuesta
              <textarea
                required
                rows={5}
                value={formulario.respuesta}
                onChange={(evento) => setFormulario({ ...formulario, respuesta: evento.target.value })}
                placeholder="Escribe una respuesta clara y útil..."
                className="mt-2 w-full resize-y rounded-2xl border border-[#173d2e]/10 bg-white/75 px-4 py-3 text-sm leading-6 text-[#173d2e] shadow-sm outline-none transition placeholder:text-[#9aaba1] focus:border-[#009443]/35 focus:ring-4 focus:ring-[#009443]/[0.09] dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-[#8da79a] dark:focus:border-[#72d2a4]/35 dark:focus:ring-[#72d2a4]/[0.08]"
              />
            </label>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200/65 bg-emerald-50/65 p-4 text-sm text-[#315747] transition hover:bg-emerald-50 dark:border-emerald-300/15 dark:bg-emerald-300/[0.05] dark:text-[#d9ebe0] dark:hover:bg-emerald-300/[0.08]">
              <input
                type="checkbox"
                checked={formulario.publicada}
                onChange={(evento) => setFormulario({ ...formulario, publicada: evento.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#0b6849]"
              />
              <span>
                <span className="block font-bold">Publicada para visitantes</span>
                <span className="mt-1 block text-xs leading-5 text-[#71877b] dark:text-[#aebfb5]">Activa esta opción para que la pregunta quede publicada al guardar.</span>
              </span>
            </label>

            {mensaje && (
              <p role="alert" className="mt-4 rounded-xl border border-red-200/80 bg-red-50/85 px-4 py-3 text-sm text-red-800 dark:border-red-300/15 dark:bg-red-950/30 dark:text-red-200">{mensaje}</p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#173d2e]/10 pt-5 dark:border-white/[0.09] sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="rounded-2xl border border-[#173d2e]/15 bg-white/55 px-5 py-3 text-sm font-bold text-[#456556] transition hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-[#d4e9dc] dark:hover:bg-white/[0.08]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0b6849] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(11,104,73,0.18)] transition hover:bg-[#09583f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {guardando ? 'Guardando…' : formulario.publicada ? 'Guardar y publicar' : 'Guardar borrador'}
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </main>
  );
}
