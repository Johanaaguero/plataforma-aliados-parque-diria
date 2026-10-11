import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../services/api';

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

  useEffect(() => { void cargar(); }, []);

  const abrirFormulario = (pregunta?: PreguntaFrecuente) => {
    setEditando(pregunta ?? null);
    setFormulario(pregunta
      ? { pregunta: pregunta.pregunta, respuesta: pregunta.respuesta, publicada: pregunta.publicada }
      : formularioVacio);
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
          body: JSON.stringify({ pregunta: formulario.pregunta, respuesta: formulario.respuesta, publicada: formulario.publicada }),
        },
        { incluirAuth: true, mensajeError: 'No se pudo guardar la pregunta frecuente.' },
      );
      setModalAbierto(false);
      await cargar();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo guardar la pregunta frecuente.');
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

  return (
    <div className="min-h-full px-4 py-8 text-emerald-950 dark:text-white">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-white/60 bg-white/55 p-6 shadow-[0_24px_70px_rgba(5,84,64,.15)] backdrop-blur-md sm:p-9 dark:border-white/10 dark:bg-white/10">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-600">Administración</p>
            <h1 className="mt-1 text-3xl font-bold">Preguntas frecuentes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-900/70 dark:text-emerald-100/70">Guarda preguntas como borrador y publícalas cuando estén listas para los visitantes.</p>
          </div>
          <button type="button" onClick={() => abrirFormulario()} className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800">Nueva pregunta</button>
        </header>

        {mensaje && <p role="alert" className="mt-5 rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-800">{mensaje}</p>}
        {cargando ? <p className="py-12 text-center text-sm">Cargando preguntas frecuentes…</p> : (
          <div className="mt-7 grid gap-4">
            {preguntas.map((pregunta) => (
              <article key={pregunta.id} className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-[0_10px_28px_rgba(5,84,64,.08)] backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div className="min-w-0">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${pregunta.publicada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{pregunta.publicada ? 'Publicada' : 'Borrador'}</span>
                    <h2 className="mt-3 text-lg font-bold">{pregunta.pregunta}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900/75 dark:text-emerald-100/75">{pregunta.respuesta}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-start gap-2">
                    <button type="button" onClick={() => abrirFormulario(pregunta)} className="rounded-full bg-white/80 px-4 py-2 text-xs font-bold text-emerald-800 shadow-sm dark:bg-white/10 dark:text-emerald-100">Editar</button>
                    <button type="button" onClick={() => void cambiarPublicacion(pregunta)} className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-900">{pregunta.publicada ? 'Retirar' : 'Publicar'}</button>
                    <button type="button" onClick={() => void eliminar(pregunta)} className="rounded-full bg-red-100/80 px-4 py-2 text-xs font-bold text-red-700">Eliminar</button>
                  </div>
                </div>
              </article>
            ))}
            {!preguntas.length && <p className="py-12 text-center text-sm text-emerald-800/70">Todavía no hay preguntas frecuentes.</p>}
          </div>
        )}
      </section>

      {modalAbierto && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-emerald-950/45 p-4 backdrop-blur-md">
          <form onSubmit={(evento) => void guardar(evento)} className="w-full max-w-xl rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-emerald-950/90">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-600">{editando ? 'Editar contenido' : 'Nueva entrada'}</p><h2 className="mt-1 text-xl font-bold">{editando ? 'Pregunta frecuente' : 'Crear pregunta frecuente'}</h2></div>
              <button type="button" onClick={() => setModalAbierto(false)} aria-label="Cerrar" className="rounded-full px-3 py-1 text-2xl leading-none text-emerald-900/70 dark:text-white">×</button>
            </div>
            <label className="mt-5 block text-sm font-semibold">Pregunta<input required maxLength={1000} value={formulario.pregunta} onChange={(evento) => setFormulario({ ...formulario, pregunta: evento.target.value })} className="mt-2 w-full rounded-2xl border border-emerald-900/10 bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-white/10" /></label>
            <label className="mt-4 block text-sm font-semibold">Respuesta<textarea required rows={5} value={formulario.respuesta} onChange={(evento) => setFormulario({ ...formulario, respuesta: evento.target.value })} className="mt-2 w-full resize-y rounded-2xl border border-emerald-900/10 bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-white/10" /></label>
            <label className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50/80 p-4 text-sm font-semibold dark:bg-white/5"><input type="checkbox" checked={formulario.publicada} onChange={(evento) => setFormulario({ ...formulario, publicada: evento.target.checked })} className="h-4 w-4 accent-emerald-700" />Publicada para visitantes</label>
            {mensaje && <p role="alert" className="mt-4 text-sm text-red-700">{mensaje}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setModalAbierto(false)} className="rounded-full border border-emerald-900/15 px-5 py-3 text-sm font-semibold">Cancelar</button>
              <button disabled={guardando} className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{guardando ? 'Guardando…' : formulario.publicada ? 'Guardar y publicar' : 'Guardar borrador'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
