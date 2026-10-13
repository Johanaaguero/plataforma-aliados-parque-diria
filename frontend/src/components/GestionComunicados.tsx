import { useEffect, useRef, useState, type FormEvent } from 'react';

import { api } from '../services/api';

type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA';

interface Comunicado {
  id: number;
  titulo: string;
  contenido: string;
  prioridad: Prioridad;
  fechaPublicacion: string;
}

const vacio = { titulo: '', contenido: '', prioridad: 'MEDIA' as Prioridad };

const prioridades: { valor: Prioridad; etiqueta: string }[] = [
  { valor: 'ALTA', etiqueta: 'Alta' },
  { valor: 'MEDIA', etiqueta: 'Media' },
  { valor: 'BAJA', etiqueta: 'Baja' },
];

export default function GestionComunicados() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [formulario, setFormulario] = useState(vacio);
  const [editando, setEditando] = useState<Comunicado | null>(null);
  const [modal, setModal] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [menuPrioridadAbierto, setMenuPrioridadAbierto] = useState(false);
  const menuPrioridadRef = useRef<HTMLDivElement>(null);

  const cargar = () =>
    api
      .solicitar<Comunicado[]>(
        '/comunicados',
        { method: 'GET' },
        {
          incluirAuth: true,
          mensajeError: 'No se pudieron cargar los comunicados.',
        },
      )
      .then(setComunicados)
      .catch((error: unknown) =>
        setMensaje(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los comunicados.',
        ),
      );

  useEffect(() => {
    void cargar();
  }, []);

  useEffect(() => {
    const cerrarMenu = (evento: MouseEvent) => {
      if (
        menuPrioridadRef.current &&
        !menuPrioridadRef.current.contains(evento.target as Node)
      ) {
        setMenuPrioridadAbierto(false);
      }
    };

    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuPrioridadAbierto(false);
    };

    document.addEventListener('mousedown', cerrarMenu);
    document.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.removeEventListener('mousedown', cerrarMenu);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, []);

  const abrir = (comunicado?: Comunicado) => {
    setEditando(comunicado ?? null);
    setFormulario(
      comunicado
        ? {
            titulo: comunicado.titulo,
            contenido: comunicado.contenido,
            prioridad: comunicado.prioridad,
          }
        : vacio,
    );
    setMenuPrioridadAbierto(false);
    setMensaje('');
    setModal(true);
  };

  const guardar = async (evento: FormEvent) => {
    evento.preventDefault();

    try {
      await api.solicitar<Comunicado>(
        editando ? `/comunicados/${editando.id}` : '/comunicados',
        {
          method: editando ? 'PUT' : 'POST',
          body: JSON.stringify(formulario),
        },
        { incluirAuth: true, mensajeError: 'No se pudo guardar el comunicado.' },
      );
      setModal(false);
      await cargar();
    } catch (error) {
      setMensaje(
        error instanceof Error ? error.message : 'No se pudo guardar el comunicado.',
      );
    }
  };

  const eliminar = async (id: number) => {
    if (!window.confirm('¿Eliminar este comunicado?')) return;

    try {
      await api.solicitar<void>(
        `/comunicados/${id}`,
        { method: 'DELETE' },
        { mensajeError: 'No se pudo eliminar el comunicado.' },
      );
      await cargar();
    } catch (error) {
      setMensaje(
        error instanceof Error ? error.message : 'No se pudo eliminar el comunicado.',
      );
    }
  };

  const prioridadSeleccionada =
    prioridades.find((prioridad) => prioridad.valor === formulario.prioridad) ??
    prioridades[1];

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#edf7f0] via-white to-emerald-100/70 px-4 py-20 text-emerald-950 dark:from-[#09281f] dark:via-[#0d3528] dark:to-[#124432] dark:text-white">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-white/60 bg-white/55 p-6 shadow-[0_24px_70px_rgba(5,84,64,.15)] backdrop-blur-md sm:p-9 dark:border-white/10 dark:bg-white/10">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-600">Administración</p>
            <h1 className="mt-1 text-3xl font-bold">Comunicados oficiales</h1>
          </div>
          <button type="button" onClick={() => abrir()} className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800">Nuevo comunicado</button>
        </header>

        {mensaje && <p className="mt-5 rounded-2xl bg-red-100/70 px-4 py-3 text-sm text-red-800">{mensaje}</p>}

        <div className="mt-7 grid gap-4">
          {comunicados.map((comunicado) => (
            <article key={comunicado.id} className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-[0_10px_28px_rgba(5,84,64,.08)] backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">{comunicado.prioridad}</span>
                  <h2 className="mt-3 text-lg font-bold">{comunicado.titulo}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900/75 dark:text-emerald-100/75">{comunicado.contenido}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => abrir(comunicado)} className="h-fit rounded-full bg-white/70 px-4 py-2 text-xs font-bold text-emerald-800 shadow-sm dark:bg-white/10 dark:text-emerald-100">Editar</button>
                  <button type="button" onClick={() => void eliminar(comunicado.id)} className="h-fit rounded-full bg-red-100/80 px-4 py-2 text-xs font-bold text-red-700">Eliminar</button>
                </div>
              </div>
            </article>
          ))}
          {!comunicados.length && <p className="py-12 text-center text-sm text-emerald-800/70">No hay comunicados oficiales.</p>}
        </div>
      </section>

      {modal && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-emerald-950/45 p-4 backdrop-blur-md">
          <form onSubmit={(evento) => void guardar(evento)} className="w-full max-w-xl rounded-[2rem] border border-white/60 bg-white/75 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-emerald-950/85">
            <div className="flex justify-between gap-4">
              <h2 className="text-xl font-bold">{editando ? 'Editar comunicado' : 'Nuevo comunicado'}</h2>
              <button type="button" onClick={() => setModal(false)} className="text-xl" aria-label="Cerrar">×</button>
            </div>

            <label className="mt-5 block text-sm font-semibold">Título
              <input required value={formulario.titulo} onChange={(evento) => setFormulario({ ...formulario, titulo: evento.target.value })} className="mt-2 w-full rounded-2xl border border-emerald-900/10 bg-white/60 px-4 py-3 outline-none backdrop-blur-md focus:ring-2 focus:ring-emerald-500" />
            </label>

            <label className="mt-4 block text-sm font-semibold">Contenido
              <textarea required rows={6} value={formulario.contenido} onChange={(evento) => setFormulario({ ...formulario, contenido: evento.target.value })} className="mt-2 w-full rounded-2xl border border-emerald-900/10 bg-white/60 px-4 py-3 outline-none backdrop-blur-md focus:ring-2 focus:ring-emerald-500" />
            </label>

            <div className="relative mt-4" ref={menuPrioridadRef}>
              <span className="block text-sm font-semibold">Prioridad</span>
              <button
                type="button"
                onClick={() => setMenuPrioridadAbierto((abierto) => !abierto)}
                aria-haspopup="listbox"
                aria-expanded={menuPrioridadAbierto}
                className="relative mt-2 flex w-full items-center justify-between rounded-2xl border border-emerald-500/30 bg-white/70 px-4 py-2.5 text-slate-800 shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:bg-slate-900/70 dark:text-slate-100"
              >
                {prioridadSeleccionada.etiqueta}
                <svg className={`h-4 w-4 text-emerald-700 transition-transform duration-200 dark:text-emerald-300 ${menuPrioridadAbierto ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>

              {menuPrioridadAbierto && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90" role="listbox" aria-label="Prioridad">
                  {prioridades.map((prioridad) => (
                    <button
                      key={prioridad.valor}
                      type="button"
                      role="option"
                      aria-selected={formulario.prioridad === prioridad.valor}
                      onClick={() => {
                        setFormulario({ ...formulario, prioridad: prioridad.valor });
                        setMenuPrioridadAbierto(false);
                      }}
                      className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-sm text-slate-700 transition-all hover:bg-emerald-500/20 hover:text-emerald-900 dark:text-slate-200 dark:hover:text-white"
                    >
                      {prioridad.etiqueta}
                      {formulario.prioridad === prioridad.valor && <span className="text-emerald-600 dark:text-emerald-300">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="mt-6 rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white">Guardar comunicado</button>
          </form>
        </div>
      )}
    </main>
  );
}
