import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */

// Define VITE_API_URL en tu .env (ej: VITE_API_URL=https://api.tudominio.com)
// Si usas Create React App cambia a process.env.REACT_APP_API_URL
const API_URL: string =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

const TIMEOUT_MS = 25_000;
const MAX_CARACTERES = 500;

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

interface Mensaje {
  id: number;
  texto: string;
  tipo: 'bot' | 'usuario';
  hora: Date;
  whatsappUrl?: string;
  error?: boolean;
}

interface RespuestaChatbot {
  respuesta: string;
  estado: string;
  conversacionId: number;
  whatsapp: { url: string } | null;
}

/* ------------------------------------------------------------------ */
/* Íconos (SVG inline, sin dependencias)                               */
/* ------------------------------------------------------------------ */

const Icono = ({
  children,
  className = 'h-5 w-5',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const IconoBot = ({ className }: { className?: string }) => (
  <Icono className={className}>
    <rect x="4" y="8" width="16" height="12" rx="3.5" />
    <path d="M12 8V5" />
    <circle cx="12" cy="3.8" r="1.2" />
    <path d="M2 13v3M22 13v3" />
    <circle cx="9" cy="13.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13.5" r="1" fill="currentColor" stroke="none" />
    <path d="M9.5 17h5" />
  </Icono>
);
const IconoCerrar = ({ className }: { className?: string }) => (
  <Icono className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icono>
);
const IconoReiniciar = ({ className }: { className?: string }) => (
  <Icono className={className}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Icono>
);
const IconoEnviar = ({ className }: { className?: string }) => (
  <Icono className={className}>
    <path d="m22 2-7 20-4-9-9-4 20-7Z" />
    <path d="M22 2 11 13" />
  </Icono>
);
const IconoUbicacion = ({ className }: { className?: string }) => (
  <Icono className={className}>
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icono>
);
const IconoServicios = ({ className }: { className?: string }) => (
  <Icono className={className}>
    <path d="m3 20 6-11 4 6 3-4 5 9H3Z" />
    <circle cx="17" cy="6" r="2" />
  </Icono>
);
const IconoTelefono = ({ className }: { className?: string }) => (
  <Icono className={className}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  </Icono>
);
const IconoPersona = ({ className }: { className?: string }) => (
  <Icono className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icono>
);
const IconoWhatsApp = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1a8 8 0 0 1-2.3-1.4 8.6 8.6 0 0 1-1.6-2c-.2-.3 0-.4.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.4-.5-.6-.5h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.3c0 1.3.9 2.600 1.100 2.800.1.2 1.900 2.900 4.600 4.100 1.700.7 2.300.8 3.200.7.500-.1 1.700-.7 1.900-1.400.2-.7.2-1.200.2-1.400-.1-.1-.3-.2-.6-.3ZM12 2a10 10 0 0 0-8.500 15.200L2 22l4.900-1.400A10 10 0 1 0 12 2Z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Datos                                                               */
/* ------------------------------------------------------------------ */

const OPCIONES = [
  {
    texto: 'Ubicación',
    detalle: 'Cómo llegar al parque',
    pregunta: '¿Dónde está ubicado el Parque Nacional Diriá?',
    Icono: IconoUbicacion,
  },
 
  {
    texto: 'Servicios y actividades',
    detalle: 'Qué puedes hacer en tu visita',
    pregunta: '¿Qué servicios y actividades ofrecen?',
    Icono: IconoServicios,
  },
  {
    texto: 'Contacto',
    detalle: 'Teléfonos y correo',
    pregunta: '¿Cómo puedo comunicarme con ustedes?',
    Icono: IconoTelefono,
  },
  {
    texto: 'Hablar con un administrador',
    detalle: 'Te conectamos por WhatsApp',
    pregunta: 'Quiero hablar con un administrador',
    Icono: IconoPersona,
  },
];

const BIENVENIDA = (): Mensaje[] => [
  {
    id: 1,
    tipo: 'bot',
    hora: new Date(),
    texto:
      'Bienvenido a SIGTAD. Soy el asistente virtual del Parque Nacional Diriá.',
  },
  {
    id: 2,
    tipo: 'bot',
    hora: new Date(),
    texto:
      '¿En qué puedo ayudarte? Elige una opción o escribe tu pregunta.',
  },
];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const formatearHora = (fecha: Date) =>
  fecha.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });

// Convierte URLs dentro del texto en enlaces clicables
const conEnlaces = (texto: string, esUsuario: boolean): ReactNode[] => {
  const partes = texto.split(/(https?:\/\/[^\s]+)/g);
  return partes.map((parte, i) =>
    /^https?:\/\//.test(parte) ? (
      <a
        key={i}
        href={parte}
        target="_blank"
        rel="noopener noreferrer"
        className={`break-all underline underline-offset-2 ${
          esUsuario ? 'text-white' : 'text-emerald-700 hover:text-emerald-900'
        }`}
      >
        {parte}
      </a>
    ) : (
      <span key={i}>{parte}</span>
    )
  );
};

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

const Chatbot = () => {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>(BIENVENIDA);

  // NUEVO: guarda la última consulta normal del usuario
  const [ultimaConsulta, setUltimaConsulta] = useState('');

  const contadorId = useRef(100);
  const conversacionId = useRef<number | null>(null);
  const controlador = useRef<AbortController | null>(null);
  const finMensajes = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hayConversacion = mensajes.some((m) => m.tipo === 'usuario');

  /* Scroll automático al último mensaje */
  useEffect(() => {
    finMensajes.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajes, cargando, abierto]);

  /* Foco en el input al abrir */
  useEffect(() => {
    if (abierto) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [abierto]);

  /* Cerrar con Escape */
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [abierto]);

  /* Cancelar petición pendiente al desmontar */
  useEffect(() => () => controlador.current?.abort(), []);

  const agregarMensaje = useCallback(
    (m: Omit<Mensaje, 'id' | 'hora'>) =>
      setMensajes((prev) => [
        ...prev,
        { ...m, id: ++contadorId.current, hora: new Date() },
      ]),
    []
  );

  const enviarMensaje = async (preguntaPersonalizada?: string) => {
    const texto = (preguntaPersonalizada ?? mensaje).trim().slice(0, MAX_CARACTERES);
    if (!texto || cargando) return;

    // NUEVO: determinar si el mensaje solicita hablar con un administrador
    const preguntaMinuscula = texto.toLowerCase();

    const esSolicitudAdministrador =
      preguntaMinuscula.includes('administrador') ||
      preguntaMinuscula.includes('administradora') ||
      preguntaMinuscula.includes('hablar con alguien') ||
      preguntaMinuscula.includes('hablar con una persona') ||
      preguntaMinuscula.includes('atención personalizada') ||
      preguntaMinuscula.includes('atencion personalizada');

    // NUEVO: solamente guardar como última consulta si NO es la solicitud de administrador
    if (!esSolicitudAdministrador) {
      setUltimaConsulta(texto);
    }

    agregarMensaje({ tipo: 'usuario', texto });
    setMensaje('');
    setCargando(true);

    const ctrl = new AbortController();
    controlador.current = ctrl;
    const temporizador = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${API_URL}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: texto,

          // NUEVO: enviar la consulta anterior cuando solicita administrador
          consultaAnterior: esSolicitudAdministrador
            ? ultimaConsulta
            : '',

          ...(conversacionId.current
            ? { conversacionId: conversacionId.current }
            : {}),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const datos: RespuestaChatbot = await res.json();

      if (datos.conversacionId) conversacionId.current = datos.conversacionId;

      agregarMensaje({
        tipo: 'bot',
        texto: datos.respuesta,
        whatsappUrl: datos.whatsapp?.url ?? undefined,
      });
    } catch (error) {
      const agotado = error instanceof DOMException && error.name === 'AbortError';
      console.error('Error en chatbot:', error);

      agregarMensaje({
        tipo: 'bot',
        error: true,
        texto: agotado
          ? 'La consulta tardó demasiado. Revisa tu conexión e inténtalo de nuevo.'
          : 'No pude procesar tu consulta. Inténtalo de nuevo en unos minutos.',
      });
    } finally {
      clearTimeout(temporizador);
      setCargando(false);
      inputRef.current?.focus();
    }
  };

  const manejarTecla = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  const reiniciar = () => {
    controlador.current?.abort();
    conversacionId.current = null;
    setUltimaConsulta('');
    setCargando(false);
    setMensaje('');
    setMensajes(BIENVENIDA());
  };

  return (
    <>
      {/* ---------------- BOTÓN FLOTANTE ---------------- */}
      <button
        onClick={() => setAbierto(true)}
        aria-label="Abrir asistente virtual"
        aria-expanded={abierto}
        title="Asistente virtual"
        className={`
          fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center
          rounded-full bg-emerald-800 text-white
          shadow-lg shadow-emerald-900/30
          transition-all duration-300
          hover:scale-105 hover:bg-emerald-900
          focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300
          ${abierto ? 'pointer-events-none scale-75 opacity-0' : 'scale-100 opacity-100'}
        `}
      >
        <IconoBot className="h-7 w-7" />
        <span className="absolute right-0.5 top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-emerald-800 bg-amber-400" />
        </span>
      </button>

      {/* ---------------- VENTANA DEL CHAT ---------------- */}
      <section
        role="dialog"
        aria-label="Asistente virtual del Parque Nacional Diriá"
        aria-hidden={!abierto}
        className={`
          fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-emerald-800/20 bg-white/65 shadow-2xl shadow-emerald-950/15 backdrop-blur-2xl
          transition-all duration-300 ease-out origin-bottom-right
          inset-0 sm:inset-auto sm:bottom-5 sm:right-5
          sm:h-[500px] sm:max-h-[calc(100vh-40px)] sm:w-[340px]
          sm:rounded-2xl sm:ring-1 sm:ring-white/60
          ${
            abierto
              ? 'translate-y-0 scale-100 opacity-100'
              : 'invisible pointer-events-none translate-y-4 scale-95 opacity-0'
          }
        `}
      >
        {/* Encabezado */}
        <header className="flex items-center justify-between border-b border-white/15 bg-emerald-900/80 px-5 py-4 text-white backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-800 ring-1 ring-emerald-600">
              <IconoBot className="h-7 w-7 text-emerald-100" />
            </div>
            <div className="leading-tight">
              <h2 className="text-[15px] font-semibold">Asistente Diriá</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Aliados del Parque Nacional Diriá
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={reiniciar}
              disabled={!hayConversacion}
              aria-label="Reiniciar conversación"
              title="Reiniciar conversación"
              className="rounded-full p-2 text-emerald-100 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconoReiniciar className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={() => setAbierto(false)}
              aria-label="Cerrar asistente"
              className="rounded-full p-2 text-emerald-100 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <IconoCerrar className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Mensajes */}
        <div
          role="log"
          aria-live="polite"
          className="flex-1 space-y-4 overflow-y-auto bg-stone-50/70 px-4 py-5 backdrop-blur-md"
        >
          {mensajes.map((m) => {
            const esUsuario = m.tipo === 'usuario';
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${esUsuario ? 'justify-end' : 'justify-start'}`}
              >
                {!esUsuario && (
                  <div className="mb-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                    <IconoBot className="h-7 w-7" />
                  </div>
                )}

                <div className={`flex max-w-[80%] flex-col ${esUsuario ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`
                      whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed
                      ${
                        esUsuario
                          ? 'rounded-br-sm bg-emerald-700 text-white'
                          : m.error
                          ? 'rounded-bl-sm border border-red-200 bg-red-50 text-red-800'
                          : 'rounded-bl-sm border border-white/70 bg-white/65 text-stone-800 shadow-sm backdrop-blur-md'
                      }
                    `}
                  >
                    {conEnlaces(m.texto, esUsuario)}
                  </div>

                  {m.whatsappUrl && (
                    <a
                      href={m.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe5a] focus:outline-none focus-visible:ring-4 focus-visible:ring-green-200"
                    >
                      <IconoWhatsApp className="h-5 w-5" />
                      Continuar por WhatsApp
                    </a>
                  )}

                  <span className="mt-1 px-1 text-[11px] text-stone-400">
                    {formatearHora(m.hora)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Indicador de escritura */}
          {cargando && (
            <div className="flex items-end gap-2" aria-label="El asistente está escribiendo">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <IconoBot className="h-7 w-7" />
              </div>
              <div className="rounded-2xl rounded-bl-sm border border-stone-200 bg-white px-4 py-3.5">
                <div className="flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 motion-reduce:animate-none"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Opciones rápidas (solo antes de la primera pregunta) */}
          {!hayConversacion && !cargando && (
            <div className="space-y-2 pt-1">
              <p className="px-1 text-xs font-medium text-stone-500">
                Preguntas frecuentes
              </p>
              {OPCIONES.map(({ texto, detalle, pregunta, Icono: Ico }) => (
                <button
                  key={texto}
                  onClick={() => enviarMensaje(pregunta)}
                  className="
                    group flex w-full items-center gap-3 rounded-xl
                    border border-white/70 bg-white/60 px-3.5 py-3 text-left shadow-sm backdrop-blur-md
                    transition
                    hover:border-emerald-400/60 hover:bg-emerald-50/70
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
                  "
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
                    <Ico className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-stone-800">
                      {texto}
                    </span>
                    <span className="block truncate text-xs text-stone-500">
                      {detalle}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div ref={finMensajes} />
        </div>

        {/* Entrada de texto */}
        <div className="border-t border-white/60 bg-white/55 p-3 backdrop-blur-xl">
          <div
            className="
              flex items-center gap-2 rounded-xl border border-white/70 bg-white/65 backdrop-blur-md
              py-1.5 pl-3.5 pr-1.5 transition
              focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100
            "
          >
            <input
              ref={inputRef}
              type="text"
              value={mensaje}
              maxLength={MAX_CARACTERES}
              onChange={(e) => setMensaje(e.target.value)}
              onKeyDown={manejarTecla}
              disabled={cargando}
              placeholder="Escribe tu pregunta…"
              aria-label="Escribe tu pregunta"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-stone-800 outline-none placeholder:text-stone-400 disabled:opacity-60"
            />
            <button
              onClick={() => enviarMensaje()}
              disabled={!mensaje.trim() || cargando}
              aria-label="Enviar mensaje"
              className="
                flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                bg-emerald-700 text-white transition
                hover:bg-emerald-800
                focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
                disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400
              "
            >
              <IconoEnviar className="h-[18px] w-[18px]" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-stone-400">
            Las respuestas son automáticas. Para casos especiales, pide hablar con un administrador.
          </p>
        </div>
      </section>
    </>
  );
};

export default Chatbot;
