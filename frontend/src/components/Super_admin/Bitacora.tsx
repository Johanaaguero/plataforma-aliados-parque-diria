import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/api';
import imagenParque from '../../assets/parque-hero.jpg';

interface UsuarioAuditoria {
  id: number;
  nombreUsuario: string;
  nombre: string;
  apellidos: string;
  correo: string;
}

interface RegistroBitacora {
  id: number | string;
  usuarioId: number | null;
  action: string;
  description: string | null;
  status: 'success' | 'failure' | 'blocked';
  details: string | null;
  createdAt: string;
  usuario: UsuarioAuditoria | null;
}

interface RespuestaBitacora {
  registros: RegistroBitacora[];
  accionesDisponibles?: string[];
  total: number;
  page: number;
  limit: number;
  totalPaginas: number;
}

const REGISTROS_POR_PAGINA = 10;
const ESTADOS_DISPONIBLES = [
  { value: 'success', label: 'Correcto' },
  { value: 'failure', label: 'Fallido' },
  { value: 'blocked', label: 'Bloqueado' },
];
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const FORMATEADOR_MES = new Intl.DateTimeFormat('es-CR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Costa_Rica',
});

interface OpcionFiltro {
  value: string;
  label: string;
}

function rellenarDosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

function obtenerMesActualCostaRica(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'America/Costa_Rica',
  }).formatToParts(new Date());
  const year = partes.find((parte) => parte.type === 'year')?.value;
  const month = partes.find((parte) => parte.type === 'month')?.value;

  return `${year}-${month}`;
}

function obtenerPeriodoMensual(periodo: string): {
  desde: string;
  hasta: string;
  etiqueta: string;
} {
  const [yearTexto, monthTexto] = periodo.split('-');
  const year = Number(yearTexto);
  const month = Number(monthTexto);
  const ultimoDia = new Date(year, month, 0).getDate();
  const desde = `${yearTexto}-${monthTexto}-01`;
  const hasta = `${yearTexto}-${monthTexto}-${rellenarDosDigitos(ultimoDia)}`;
  const etiqueta =
    FORMATEADOR_MES.format(new Date(year, month - 1, 1, 12))
      .replace(/^./, (letra) => letra.toUpperCase());

  return { desde, hasta, etiqueta };
}

function moverMes(periodo: string, desplazamiento: number): string {
  const [yearTexto, monthTexto] = periodo.split('-');
  const fecha = new Date(Number(yearTexto), Number(monthTexto) - 1 + desplazamiento, 1, 12);

  return `${fecha.getFullYear()}-${rellenarDosDigitos(fecha.getMonth() + 1)}`;
}

function formatearVisibleFecha(fechaISO: string): string {
  if (!fechaISO) return 'Todo el mes';
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio}`;
}

function fechaDesdeISO(fechaISO: string): Date | null {
  if (!fechaISO) return null;
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  if (![anio, mes, dia].every(Number.isFinite)) return null;
  return new Date(anio, mes - 1, dia);
}

function formatearISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = rellenarDosDigitos(fecha.getMonth() + 1);
  const dia = rellenarDosDigitos(fecha.getDate());
  return `${anio}-${mes}-${dia}`;
}

function compararISO(a: string, b: string): number {
  return a.localeCompare(b);
}

function esMismaFecha(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function obtenerMatrizDias(
  anio: number,
  mes: number,
): Array<{ fecha: Date; delMes: boolean }> {
  const primerDia = new Date(anio, mes, 1);
  const offset = (primerDia.getDay() + 6) % 7;
  const inicio = new Date(anio, mes, 1 - offset);
  const dias: Array<{ fecha: Date; delMes: boolean }> = [];

  for (let i = 0; i < 42; i += 1) {
    const fecha = new Date(inicio);
    fecha.setDate(inicio.getDate() + i);
    dias.push({ fecha, delMes: fecha.getMonth() === mes });
  }

  return dias;
}

function IconoCalendario() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

function Chevron({ direccion }: { direccion: 'izquierda' | 'derecha' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direccion === 'izquierda' ? 'm15 18-6-6 6-6' : 'm9 6 6 6-6 6'} />
    </svg>
  );
}

function FloatingPopover({
  abierto,
  anchorRef,
  onCerrar,
  ancho,
  altoEstimado,
  children,
}: {
  abierto: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onCerrar: () => void;
  ancho: number;
  altoEstimado: number;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [estilo, setEstilo] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!abierto) {
      setEstilo(null);
      return;
    }

    const actualizarPosicion = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const margen = 12;
      const separacion = 10;
      const rect = anchor.getBoundingClientRect();
      const anchoDisponible = window.innerWidth - margen * 2;
      const anchoPanel = Math.min(ancho, anchoDisponible);
      const altoPanel = panelRef.current?.offsetHeight || altoEstimado;
      const espacioAbajo = window.innerHeight - rect.bottom - separacion - margen;
      const espacioArriba = rect.top - separacion - margen;
      const abrirArriba = espacioAbajo < altoPanel && espacioArriba > espacioAbajo;
      const left = Math.min(
        Math.max(rect.left, margen),
        window.innerWidth - anchoPanel - margen,
      );
      const top = abrirArriba
        ? Math.max(margen, rect.top - altoPanel - separacion)
        : Math.min(rect.bottom + separacion, window.innerHeight - margen);

      setEstilo({
        left,
        top,
        width: anchoPanel,
        maxHeight: abrirArriba
          ? Math.max(220, espacioArriba)
          : Math.max(220, espacioAbajo),
      });
    };

    actualizarPosicion();
    window.addEventListener('resize', actualizarPosicion);
    window.addEventListener('scroll', actualizarPosicion, true);

    return () => {
      window.removeEventListener('resize', actualizarPosicion);
      window.removeEventListener('scroll', actualizarPosicion, true);
    };
  }, [abierto, altoEstimado, ancho, anchorRef]);

  useEffect(() => {
    if (!abierto) return undefined;

    const manejarPuntero = (event: PointerEvent) => {
      const objetivo = event.target as Node | null;

      if (
        objetivo &&
        (anchorRef.current?.contains(objetivo) || panelRef.current?.contains(objetivo))
      ) {
        return;
      }

      onCerrar();
    };

    const manejarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCerrar();
      }
    };

    document.addEventListener('pointerdown', manejarPuntero);
    document.addEventListener('keydown', manejarTecla);

    return () => {
      document.removeEventListener('pointerdown', manejarPuntero);
      document.removeEventListener('keydown', manejarTecla);
    };
  }, [abierto, anchorRef, onCerrar]);

  if (!abierto || !estilo) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[9999] overflow-y-auto overflow-x-hidden overscroll-contain rounded-[1.35rem] [scrollbar-gutter:stable]"
      style={estilo}
    >
      {children}
    </div>,
    document.body,
  );
}

function PanelCalendario({
  valorSeleccionado,
  onSeleccionar,
  onCerrar,
  min,
  max,
}: {
  valorSeleccionado: string;
  onSeleccionar: (fechaISO: string) => void;
  onCerrar: () => void;
  min: string;
  max: string;
}) {
  const hoy = new Date();
  const inicial = fechaDesdeISO(valorSeleccionado) ?? fechaDesdeISO(min) ?? hoy;
  const [mesVisible, setMesVisible] = useState(inicial.getMonth());
  const [anioVisible, setAnioVisible] = useState(inicial.getFullYear());
  const dias = obtenerMatrizDias(anioVisible, mesVisible);

  const irMesAnterior = () => {
    if (mesVisible === 0) {
      setMesVisible(11);
      setAnioVisible((anio) => anio - 1);
    } else {
      setMesVisible((mes) => mes - 1);
    }
  };

  const irMesSiguiente = () => {
    if (mesVisible === 11) {
      setMesVisible(0);
      setAnioVisible((anio) => anio + 1);
    } else {
      setMesVisible((mes) => mes + 1);
    }
  };

  return (
    <div
      className="w-full rounded-[1.35rem] border border-white/55 bg-white/[0.96] p-4 shadow-[0_26px_70px_rgba(7,63,49,0.22)] backdrop-blur-2xl dark:border-white/[0.10] dark:bg-[#0B3026]/[0.98] dark:shadow-[0_28px_80px_rgba(0,0,0,0.48)]"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={irMesAnterior}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#08743f] transition hover:bg-[#8DC63F]/15 dark:text-[#A8D66D] dark:hover:bg-white/[0.08]"
          aria-label="Mes anterior"
        >
          <Chevron direccion="izquierda" />
        </button>

        <span className="min-w-0 whitespace-nowrap text-center text-sm font-extrabold capitalize text-[#095540] dark:text-white">
          {MESES[mesVisible]} de {anioVisible}
        </span>

        <button
          type="button"
          onClick={irMesSiguiente}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#08743f] transition hover:bg-[#8DC63F]/15 dark:text-[#A8D66D] dark:hover:bg-white/[0.08]"
          aria-label="Mes siguiente"
        >
          <Chevron direccion="derecha" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#6D8378] dark:text-[#9CB3A8]">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="py-1">
            {dia}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {dias.map(({ fecha, delMes }, indice) => {
          const iso = formatearISO(fecha);
          const seleccionado = valorSeleccionado === iso;
          const esHoy = esMismaFecha(fecha, hoy);
          const fueraDeRango = compararISO(iso, min) < 0 || compararISO(iso, max) > 0;

          return (
            <button
              key={`${iso}-${indice}`}
              type="button"
              onClick={() => {
                if (!fueraDeRango) {
                  onSeleccionar(iso);
                  onCerrar();
                }
              }}
              disabled={fueraDeRango}
              className={`flex aspect-square min-h-10 w-full items-center justify-center rounded-xl text-sm font-bold transition ${
                !delMes ? 'text-slate-300 dark:text-slate-600' : 'text-[#304B40] dark:text-[#E8F8EC]'
              } ${
                seleccionado
                  ? 'bg-[#009444] text-white shadow-[0_10px_22px_rgba(0,148,68,0.24)] hover:bg-[#009444]'
                  : 'hover:bg-[#8DC63F]/16 dark:hover:bg-white/[0.08]'
              } ${
                esHoy && !seleccionado ? 'ring-2 ring-inset ring-[#00AEEF]/70' : ''
              } disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent`}
            >
              {fecha.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#DDE8E1] pt-3 text-sm font-bold dark:border-white/[0.10]">
        <button
          type="button"
          onClick={() => {
            onSeleccionar('');
            onCerrar();
          }}
          className="text-[#6D8378] transition hover:text-rose-600 dark:text-[#A6BAB1] dark:hover:text-rose-200"
        >
          Borrar
        </button>

        <button
          type="button"
          onClick={() => {
            const hoyISO = formatearISO(hoy);
            if (compararISO(hoyISO, min) >= 0 && compararISO(hoyISO, max) <= 0) {
              onSeleccionar(hoyISO);
            }
            onCerrar();
          }}
          className="text-[#08743f] transition hover:underline dark:text-[#A8D66D]"
        >
          Hoy
        </button>
      </div>
    </div>
  );
}

function CampoFechaBitacora({
  etiqueta,
  valor,
  abierto,
  onAbrir,
  onCerrar,
  className = '',
  children,
}: {
  etiqueta: string;
  valor: string;
  abierto: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
  className?: string;
  children: ReactNode;
}) {
  const botonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className={`relative ${className}`}>
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#5F766B] dark:text-[#A6BAB1]">
        {etiqueta}
      </label>

      <button
        ref={botonRef}
        type="button"
        onClick={onAbrir}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-[1rem] border bg-white/65 px-4 py-3 text-left text-sm font-semibold shadow-inner shadow-white/40 backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-200 dark:bg-[#09261E]/[0.58] dark:shadow-inner dark:shadow-black/20 ${
          abierto
            ? 'border-[#009444] bg-white/[0.82] ring-4 ring-[#009444]/[0.15] dark:border-[#8DC63F] dark:bg-[#0F3529]/[0.76]'
            : 'border-transparent text-[#304B40] hover:bg-white/[0.74] dark:border-white/[0.10] dark:text-[#F0FAF4] dark:hover:bg-[#0F3529]/[0.68]'
        }`}
      >
        <span className={valor ? 'text-[#304B40] dark:text-[#F0FAF4]' : 'text-[#82938B] dark:text-[#8EA69B]'}>
          {formatearVisibleFecha(valor)}
        </span>
        <span className="text-[#009444] dark:text-[#A8D66D]">
          <IconoCalendario />
        </span>
      </button>

      <FloatingPopover
        abierto={abierto}
        anchorRef={botonRef}
        onCerrar={onCerrar}
        ancho={416}
        altoEstimado={430}
      >
        {children}
      </FloatingPopover>
    </div>
  );
}

function SelectorMesBitacora({
  periodo,
  abierto,
  onAbrir,
  onCerrar,
  children,
}: {
  periodo: string;
  abierto: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
  children: ReactNode;
}) {
  const periodoInfo = obtenerPeriodoMensual(periodo);
  const botonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="min-w-0 flex-1 sm:min-w-[18rem] lg:min-w-[21rem]">
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#5F766B] dark:text-[#A6BAB1]">
        Mes
      </label>

      <button
        ref={botonRef}
        type="button"
        onClick={onAbrir}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-[1rem] border bg-white/70 px-4 py-3 text-left text-sm font-extrabold shadow-inner shadow-white/40 backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-200 dark:bg-[#09261E]/[0.62] dark:shadow-inner dark:shadow-black/20 ${
          abierto
            ? 'border-[#009444] bg-white/[0.84] ring-4 ring-[#009444]/[0.15] dark:border-[#8DC63F] dark:bg-[#0F3529]/[0.76]'
            : 'border-transparent text-[#304B40] hover:bg-white/[0.78] dark:border-white/[0.10] dark:text-[#F0FAF4] dark:hover:bg-[#0F3529]/[0.68]'
        }`}
      >
        <span className="min-w-0 truncate">{periodoInfo.etiqueta}</span>
        <span className="shrink-0 text-[#009444] dark:text-[#A8D66D]">
          <IconoCalendario />
        </span>
      </button>

      <FloatingPopover
        abierto={abierto}
        anchorRef={botonRef}
        onCerrar={onCerrar}
        ancho={480}
        altoEstimado={330}
      >
        {children}
      </FloatingPopover>
    </div>
  );
}

function PanelMes({
  periodo,
  onSeleccionar,
  onCerrar,
}: {
  periodo: string;
  onSeleccionar: (periodo: string) => void;
  onCerrar: () => void;
}) {
  const [anioVisible, setAnioVisible] = useState(Number(periodo.slice(0, 4)));
  const mesSeleccionado = Number(periodo.slice(5, 7)) - 1;

  return (
    <div className="w-full rounded-[1.35rem] border border-white/55 bg-white/[0.96] p-4 shadow-[0_26px_70px_rgba(7,63,49,0.22)] backdrop-blur-2xl dark:border-white/[0.10] dark:bg-[#0B3026]/[0.98] dark:shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setAnioVisible((anio) => anio - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#08743f] transition hover:bg-[#8DC63F]/15 dark:text-[#A8D66D] dark:hover:bg-white/[0.08]"
          aria-label="Año anterior"
        >
          <Chevron direccion="izquierda" />
        </button>

        <span className="text-base font-extrabold text-[#095540] dark:text-white">
          {anioVisible}
        </span>

        <button
          type="button"
          onClick={() => setAnioVisible((anio) => anio + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#08743f] transition hover:bg-[#8DC63F]/15 dark:text-[#A8D66D] dark:hover:bg-white/[0.08]"
          aria-label="Año siguiente"
        >
          <Chevron direccion="derecha" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MESES.map((mes, indice) => {
          const valor = `${anioVisible}-${rellenarDosDigitos(indice + 1)}`;
          const seleccionado = anioVisible === Number(periodo.slice(0, 4)) && indice === mesSeleccionado;

          return (
            <button
              key={mes}
              type="button"
              onClick={() => {
                onSeleccionar(valor);
                onCerrar();
              }}
              className={`rounded-xl px-3 py-3 text-sm font-bold capitalize transition ${
                seleccionado
                  ? 'bg-[#009444] text-white shadow-[0_10px_22px_rgba(0,148,68,0.24)]'
                  : 'bg-white/[0.48] text-[#304B40] hover:bg-[#8DC63F]/16 dark:bg-white/[0.05] dark:text-[#E8F8EC] dark:hover:bg-white/[0.10]'
              }`}
            >
              {mes}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FiltroDesplegable({
  id,
  etiqueta,
  valor,
  opciones,
  abierto,
  deshabilitado,
  onAbrir,
  onCerrar,
  onSeleccionar,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  opciones: OpcionFiltro[];
  abierto: boolean;
  deshabilitado: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
  onSeleccionar: (valor: string) => void;
}) {
  const botonRef = useRef<HTMLButtonElement | null>(null);
  const opcionSeleccionada =
    opciones.find((opcion) => opcion.value === valor) ?? opciones[0];

  return (
    <div className="relative">
      <label
        id={`${id}-label`}
        className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#5F766B] dark:text-[#A6BAB1]"
      >
        {etiqueta}
      </label>

      <button
        ref={botonRef}
        id={id}
        type="button"
        aria-labelledby={`${id}-label ${id}`}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        disabled={deshabilitado}
        onClick={onAbrir}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-[1rem] border bg-white/65 px-4 py-3 text-left text-sm font-semibold shadow-inner shadow-white/40 backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-200 dark:bg-[#09261E]/[0.58] dark:shadow-inner dark:shadow-black/20 ${
          abierto
            ? 'border-[#009444] bg-white/[0.82] ring-4 ring-[#009444]/[0.15] dark:border-[#8DC63F] dark:bg-[#0F3529]/[0.76]'
            : 'border-transparent text-[#304B40] hover:bg-white/[0.74] dark:border-white/[0.10] dark:text-[#F0FAF4] dark:hover:bg-[#0F3529]/[0.68]'
        } disabled:cursor-wait disabled:opacity-60`}
      >
        <span className="min-w-0 truncate">
          {opcionSeleccionada?.label ?? 'No disponible'}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-[#829188] transition-transform dark:text-[#a9beb2] ${
            abierto ? 'rotate-180' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <FloatingPopover
        abierto={abierto}
        anchorRef={botonRef}
        onCerrar={onCerrar}
        ancho={320}
        altoEstimado={300}
      >
        <div
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="max-h-[18rem] w-full overflow-y-auto rounded-[1.2rem] border border-white/55 bg-white/[0.96] p-2 shadow-[0_24px_68px_rgba(7,63,49,0.22)] backdrop-blur-2xl dark:border-white/[0.10] dark:bg-[#0B3026]/[0.98] dark:shadow-[0_26px_74px_rgba(0,0,0,0.48)]"
        >
          {opciones.map((opcion) => {
            const seleccionado = opcion.value === valor;

            return (
              <button
                key={opcion.value}
                type="button"
                role="option"
                aria-selected={seleccionado}
                onClick={() => {
                  onSeleccionar(opcion.value);
                  onCerrar();
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-[0.95rem] px-3 py-2.5 text-left text-sm font-bold transition ${
                  seleccionado
                    ? 'bg-[#009444] text-white shadow-[0_10px_22px_rgba(0,148,68,0.22)]'
                    : 'text-[#304B40] hover:bg-[#8DC63F]/16 dark:text-[#E8F8EC] dark:hover:bg-white/[0.08]'
                }`}
              >
                <span className="min-w-0 break-words">{opcion.label}</span>
                {seleccionado && (
                  <span className="shrink-0 text-xs font-extrabold">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </FloatingPopover>
    </div>
  );
}

function obtenerEstadoHttp(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return 'No disponible';
  }

  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha);
}

function formatearAccion(accion: string): string {
  const acciones: Record<string, string> = {
    LOGIN_ATTEMPT: 'Intento de inicio de sesión',
    LOGIN_SUCCESS: 'Inicio de sesión',
    LOGIN_FAILED: 'Inicio de sesión fallido',
    LOGIN_FAILED_BLOCKED: 'Bloqueo de cuenta tras intentos fallidos',
    LOGIN_BLOCKED: 'Intento de acceso a cuenta bloqueada',
    SESSION_TIMEOUT: 'Sesión finalizada por tiempo',
    ACCOUNT_UNLOCKED: 'Desbloqueo de cuenta',
    CAMBIO_ROL: 'Cambio de rol de usuario',
    CREAR: 'Creación',
    MODIFICAR: 'Modificación',
    ELIMINAR: 'Eliminación',
    PUBLICAR: 'Publicación',
    CREAR_EMPRENDIMIENTO: 'Creación de emprendimiento',
    ACTUALIZAR_EMPRENDIMIENTO: 'Actualización de emprendimiento',
    CAMBIAR_ESTADO_EMPRENDIMIENTO: 'Cambio de estado de emprendimiento',
    ELIMINAR_EMPRENDIMIENTO: 'Eliminación de emprendimiento',
    CREAR_EVENTO_CAPACITACION: 'Creación de evento o capacitación',
    ACTUALIZAR_EVENTO_CAPACITACION: 'Actualización de evento o capacitación',
    ELIMINAR_EVENTO_CAPACITACION: 'Eliminación de evento o capacitación',
    CAMBIAR_ESTADO_EVENTO_CAPACITACION:
      'Cambio de estado de evento o capacitación',
    CREAR_RESERVA_EVENTO_CAPACITACION:
      'Creación de reserva para evento o capacitación',
    ACTUALIZAR_RESERVA_EVENTO_CAPACITACION:
      'Actualización de reserva para evento o capacitación',
    CAMBIAR_ESTADO_RESERVA_EVENTO_CAPACITACION:
      'Cambio de estado de reserva para evento o capacitación',
    CANCELAR_RESERVA_EVENTO_CAPACITACION:
      'Cancelación de reserva para evento o capacitación',
    CREAR_INSCRIPCION_EVENTO_CAPACITACION:
      'Inscripción a evento o capacitación',
    CANCELAR_INSCRIPCION_EVENTO_CAPACITACION:
      'Cancelación de inscripción a evento o capacitación',
    REGISTRAR_DATOS_DEVOLUCION_RESERVA:
      'Registro de datos de devolución de reserva',
  };

  const etiqueta = acciones[accion];
  if (etiqueta) return etiqueta;

  const respaldo = accion
    .replace(/[_\s]+/g, ' ')
    .trim()
    .toLocaleLowerCase('es-CR')
    .replace(/^./u, (letra) => letra.toLocaleUpperCase('es-CR'));

  return respaldo || 'Acción sin identificar';
}

function obtenerInformacion(registro: RegistroBitacora): string {
  if (!registro.details) {
    return registro.description ?? 'Sin información adicional';
  }

  try {
    const detalles: unknown = JSON.parse(registro.details);

    if (detalles && typeof detalles === 'object' && !Array.isArray(detalles)) {
      const partes = Object.entries(detalles as Record<string, unknown>)
        .filter(([, valor]) => valor !== null && valor !== undefined)
        .map(([clave, valor]) => {
          const nombreCampo = clave
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (letra) => letra.toUpperCase());
          const valorTexto =
            typeof valor === 'object' ? JSON.stringify(valor) : String(valor);

          return `${nombreCampo}: ${valorTexto}`;
        });

      return partes.length
        ? partes.join(' · ')
        : registro.description ?? 'Sin información adicional';
    }

    return registro.description ?? 'Sin información adicional';
  } catch {
    return registro.details;
  }
}

function textoEstado(estado: RegistroBitacora['status']): string {
  switch (estado) {
    case 'success':
      return 'Correcto';
    case 'failure':
      return 'Fallido';
    case 'blocked':
      return 'Bloqueado';
    default:
      return 'No disponible';
  }
}

function estiloEstado(estado: RegistroBitacora['status']): string {
  switch (estado) {
    case 'success':
      return 'border-[#009444]/20 bg-[#009444]/10 text-[#08743f] dark:border-[#8DC63F]/20 dark:bg-[#009444]/[0.16] dark:text-[#D8F7E3]';
    case 'failure':
      return 'border-rose-300/40 bg-rose-100/65 text-rose-700 dark:border-rose-300/20 dark:bg-rose-400/10 dark:text-rose-200';
    case 'blocked':
      return 'border-[#D9D823]/40 bg-[#D9D823]/15 text-[#6e6c00] dark:border-[#D9D823]/25 dark:bg-[#D9D823]/10 dark:text-[#F1EF8B]';
    default:
      return 'border-white/40 bg-white/40 text-[#52675e] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#DDEBE5]';
  }
}

export default function Bitacora() {
  const [registros, setRegistros] = useState<RegistroBitacora[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [accion, setAccion] = useState('TODAS');
  const [estado, setEstado] = useState('TODOS');
  const [periodoMensual, setPeriodoMensual] = useState(
    obtenerMesActualCostaRica,
  );
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [calendarioAbierto, setCalendarioAbierto] = useState<
    'mes' | 'desde' | 'hasta' | null
  >(null);
  const [filtroAbierto, setFiltroAbierto] = useState<
    'accion' | 'estado' | null
  >(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [accionesDisponibles, setAccionesDisponibles] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const solicitudBitacoraRef = useRef(0);
  const periodoConsultado = obtenerPeriodoMensual(periodoMensual);
  const desdeAplicado =
    fechaDesde &&
    compararISO(fechaDesde, periodoConsultado.desde) >= 0 &&
    compararISO(fechaDesde, periodoConsultado.hasta) <= 0
      ? fechaDesde
      : periodoConsultado.desde;
  const hastaAplicado =
    fechaHasta &&
    compararISO(fechaHasta, periodoConsultado.desde) >= 0 &&
    compararISO(fechaHasta, periodoConsultado.hasta) <= 0
      ? fechaHasta
      : periodoConsultado.hasta;
  const opcionesAccion: OpcionFiltro[] = [
    { value: 'TODAS', label: 'Todas las acciones' },
    ...accionesDisponibles.map((item) => ({
      value: item,
      label: formatearAccion(item),
    })),
  ];
  const opcionesEstado: OpcionFiltro[] = [
    { value: 'TODOS', label: 'Todos' },
    ...ESTADOS_DISPONIBLES,
  ];

  const actualizarBusqueda = (valor: string) => {
    setBusqueda(valor);
    setPaginaActual(1);
  };

  const actualizarAccion = (valor: string) => {
    setAccion(valor);
    setPaginaActual(1);
    setFiltroAbierto(null);
  };

  const actualizarEstado = (valor: string) => {
    setEstado(valor);
    setPaginaActual(1);
    setFiltroAbierto(null);
  };

  const actualizarPeriodoMensual = (valor: string) => {
    setPeriodoMensual(valor);
    setPaginaActual(1);
  };

  const actualizarFechaDesde = (valor: string) => {
    setFechaDesde(valor);
    setPaginaActual(1);
  };

  const actualizarFechaHasta = (valor: string) => {
    setFechaHasta(valor);
    setPaginaActual(1);
  };

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setBusquedaAplicada(busqueda.trim());
    }, 300);

    return () => window.clearTimeout(temporizador);
  }, [busqueda]);

  useEffect(() => {
    setFechaDesde((valor) =>
      valor &&
      (compararISO(valor, periodoConsultado.desde) < 0 ||
        compararISO(valor, periodoConsultado.hasta) > 0)
        ? ''
        : valor,
    );
    setFechaHasta((valor) =>
      valor &&
      (compararISO(valor, periodoConsultado.desde) < 0 ||
        compararISO(valor, periodoConsultado.hasta) > 0)
        ? ''
        : valor,
    );
  }, [periodoConsultado.desde, periodoConsultado.hasta]);

  useEffect(() => {
    let componenteActivo = true;
    const idSolicitud = solicitudBitacoraRef.current + 1;
    solicitudBitacoraRef.current = idSolicitud;

    async function cargarBitacora() {
      setCargando(true);
      setError('');

      try {
        const parametros = new URLSearchParams({
          page: String(paginaActual),
          limit: String(REGISTROS_POR_PAGINA),
        });

        if (busquedaAplicada) parametros.set('busqueda', busquedaAplicada);
        if (accion !== 'TODAS') parametros.set('action', accion);
        if (estado !== 'TODOS') parametros.set('status', estado);
        parametros.set('desde', desdeAplicado);
        parametros.set('hasta', hastaAplicado);

        const respuesta = await api.solicitar<RespuestaBitacora>(
          `/admin/bitacora?${parametros.toString()}`,
          { method: 'GET' },
          {
            desempaquetarData: false,
            mensajeError: 'No se pudo cargar la bitacora.',
          },
        );

        if (!Array.isArray(respuesta.registros)) {
          throw new Error('La respuesta de la bitacora no es valida.');
        }

        if (
          componenteActivo &&
          solicitudBitacoraRef.current === idSolicitud
        ) {
          setRegistros(respuesta.registros);
          setTotalRegistros(respuesta.total);
          setTotalPaginas(Math.max(1, respuesta.totalPaginas));
          setAccionesDisponibles(
            Array.isArray(respuesta.accionesDisponibles)
              ? respuesta.accionesDisponibles
              : [],
          );
        }
      } catch (errorSolicitud: unknown) {
        if (
          !componenteActivo ||
          solicitudBitacoraRef.current !== idSolicitud
        ) {
          return;
        }

        const status = obtenerEstadoHttp(errorSolicitud);
        setError(
          status === 401
            ? 'Debes iniciar sesion para consultar la bitacora.'
            : status === 403
              ? 'No tienes permisos para consultar la bitacora.'
              : errorSolicitud instanceof Error
                ? errorSolicitud.message
                : 'No se pudo cargar la bitacora.',
        );
      } finally {
        if (
          componenteActivo &&
          solicitudBitacoraRef.current === idSolicitud
        ) {
          setCargando(false);
        }
      }
    }

    void cargarBitacora();

    return () => {
      componenteActivo = false;
    };
  }, [
    accion,
    busquedaAplicada,
    estado,
    paginaActual,
    desdeAplicado,
    hastaAplicado,
  ]);

  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const indiceInicio = (paginaSegura - 1) * REGISTROS_POR_PAGINA;
  const rangoInicio = totalRegistros ? indiceInicio + 1 : 0;
  const rangoFin = Math.min(
    indiceInicio + REGISTROS_POR_PAGINA,
    totalRegistros,
  );
  useEffect(() => {
    setPaginaActual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);
  const claseBotonPagina =
    'inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-white/30 bg-white/80 px-4 text-xs font-bold text-slate-600 shadow-lg backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 dark:border-white/10 dark:bg-[#071C16]/[0.62] dark:text-[#DDEBE5] dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)] dark:hover:bg-[#12372B]';

  return (
    <main className="relative isolate min-h-screen w-full overflow-x-clip font-['Montserrat',sans-serif] text-[#17382B] transition-colors duration-500 dark:text-[#EDF8F1]">
      {/* El fondo usa los mismos elementos visuales que Cuentas Bloqueadas. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src={imagenParque}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[14px] opacity-[0.32] saturate-[0.65] transition-[filter,opacity] duration-500 dark:opacity-[0.22] dark:brightness-[0.48] dark:saturate-[0.78]"
        />
        <div className="absolute inset-0 bg-[#EEF4EF]/76 backdrop-blur-[4px] transition-colors duration-500 dark:bg-[#071C16]/88" />
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-[#8DC63F]/10 blur-[130px] dark:bg-[#8DC63F]/[0.055]" />
        <div className="absolute -right-24 bottom-0 h-[430px] w-[430px] rounded-full bg-[#00AEEF]/[0.07] blur-[130px] dark:bg-[#00AEEF]/[0.04]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-4 pb-10 pt-5 sm:px-7 sm:pt-7 lg:px-10 lg:pt-8">
        <section className="overflow-visible rounded-[2.4rem] border border-white/45 bg-white/[0.22] shadow-[0_24px_80px_rgba(7,63,49,0.07)] backdrop-blur-[32px] sm:rounded-[2.8rem] dark:border-white/10 dark:bg-[#0B3026]/[0.72] dark:shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
          {/* ENCABEZADO: misma tipografía, escala, espaciado y líneas decorativas. */}
          <header className="relative overflow-hidden px-7 pb-6 pt-8 text-[#123D30] sm:px-10 sm:pb-6 sm:pt-10 lg:px-14 lg:pt-12 dark:text-[#F0FAF4]">
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#d9d823]/[0.18] blur-3xl dark:bg-[#D9D823]/[0.08]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-[#00AEEF]/[0.14] blur-3xl dark:bg-[#00AEEF]/[0.07]"
              aria-hidden="true"
            />

            <div className="relative">
              <h1 className="text-5xl font-bold leading-[0.96] tracking-[-0.025em] sm:text-6xl lg:text-[4.15rem]">
                Bitácora administrativa
              </h1>
              <p className="mt-4 max-w-[800px] text-base font-normal leading-7 text-[#687E74] dark:text-[#A9BCB4] sm:text-lg">
                Consulta las actividades registradas y revisa las acciones realizadas en el sistema.
              </p>
              <div className="mt-5 flex items-center gap-2" aria-hidden="true">
                <span className="h-[3px] w-12 rounded-full bg-[#009444]" />
                <span className="h-[3px] w-8 rounded-full bg-[#8DC63F]" />
                <span className="h-[3px] w-5 rounded-full bg-[#D9D823]" />
                <span className="h-[3px] w-7 rounded-full bg-[#00AEEF]" />
              </div>
            </div>
          </header>

          {/* BÚSQUEDA Y FILTRO: misma superficie translúcida que el buscador original. */}
          <section
            className="relative z-40 mx-5 mb-7 overflow-visible rounded-[1.8rem] border border-white/45 bg-white/[0.32] p-5 shadow-[0_12px_38px_rgba(7,63,49,0.025)] backdrop-blur-2xl sm:mx-8 sm:p-6 lg:mx-12 lg:p-6 dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_12px_38px_rgba(0,0,0,0.18)]"
            aria-label="Filtros de la bitácora"
          >
            <div className="mb-5 grid gap-4 rounded-[1.4rem] border border-white/45 bg-white/[0.24] p-4 shadow-inner shadow-white/30 backdrop-blur-xl lg:grid-cols-[minmax(220px,0.45fr)_minmax(0,1fr)] lg:items-start dark:border-white/[0.08] dark:bg-[#071C16]/[0.28] dark:shadow-black/10">
              <div className="rounded-[1.15rem] border border-white/45 bg-white/[0.28] px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5F766B] dark:text-[#A6BAB1]">
                  Periodo consultado
                </p>
                <p className="mt-1 text-lg font-extrabold text-[#095540] dark:text-white">
                  {periodoConsultado.etiqueta}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#6b7a72] dark:text-emerald-100/[0.72]">
                  Del {periodoConsultado.desde} al {periodoConsultado.hasta}
                </p>
              </div>

              <div className="min-w-0">
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
                  <SelectorMesBitacora
                    periodo={periodoMensual}
                    abierto={calendarioAbierto === 'mes'}
                    onAbrir={() =>
                      setCalendarioAbierto((actual) => {
                        setFiltroAbierto(null);
                        return actual === 'mes' ? null : 'mes';
                      })
                    }
                    onCerrar={() => setCalendarioAbierto(null)}
                  >
                    <PanelMes
                      periodo={periodoMensual}
                      onSeleccionar={actualizarPeriodoMensual}
                      onCerrar={() => setCalendarioAbierto(null)}
                    />
                  </SelectorMesBitacora>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        actualizarPeriodoMensual(moverMes(periodoMensual, -1))
                      }
                      disabled={cargando}
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/70 px-4 text-xs font-bold text-[#304B40] shadow-lg backdrop-blur-xl transition-all duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-[#09261E]/[0.62] dark:text-[#F0FAF4] dark:hover:bg-[#12372B]"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        actualizarPeriodoMensual(moverMes(periodoMensual, 1))
                      }
                      disabled={cargando}
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/70 px-4 text-xs font-bold text-[#304B40] shadow-lg backdrop-blur-xl transition-all duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8DC63F]/20 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-[#09261E]/[0.62] dark:text-[#F0FAF4] dark:hover:bg-[#12372B]"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.7fr)_minmax(180px,0.55fr)_minmax(180px,0.55fr)_minmax(180px,0.55fr)]">
              <div>
                <label
                  htmlFor="busqueda-bitacora"
                  className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#5F766B] dark:text-[#A6BAB1]"
                >
                  Buscar actividad
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829188] dark:text-[#a9beb2]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z"
                    />
                  </svg>
                  <input
                    id="busqueda-bitacora"
                    type="search"
                    value={busqueda}
                    onChange={(event) => actualizarBusqueda(event.target.value)}
                    placeholder="Busca por usuario, acción o información"
                    className="min-h-12 w-full rounded-[1rem] border border-transparent bg-white/65 py-3 pl-11 pr-4 text-sm font-semibold text-[#304B40] outline-none placeholder:text-[#82938B] shadow-inner shadow-white/40 backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-200 focus-visible:border-[#009444] focus-visible:bg-white/[0.78] focus-visible:ring-4 focus-visible:ring-[#009444]/[0.15] dark:border-white/[0.10] dark:bg-[#09261E]/[0.58] dark:text-[#F0FAF4] dark:placeholder:text-[#8EA69B] dark:shadow-inner dark:shadow-black/20 dark:focus-visible:border-[#8DC63F] dark:focus-visible:bg-[#0F3529]/[0.72]"
                  />
                </div>
              </div>

              <FiltroDesplegable
                id="filtro-accion-bitacora"
                etiqueta="Filtrar por acción"
                valor={accion}
                opciones={opcionesAccion}
                abierto={filtroAbierto === 'accion'}
                deshabilitado={cargando && accionesDisponibles.length === 0}
                onAbrir={() => {
                  setCalendarioAbierto(null);
                  setFiltroAbierto((actual) =>
                    actual === 'accion' ? null : 'accion',
                  );
                }}
                onCerrar={() => setFiltroAbierto(null)}
                onSeleccionar={actualizarAccion}
              />

              <FiltroDesplegable
                id="filtro-estado-bitacora"
                etiqueta="Estado"
                valor={estado}
                opciones={opcionesEstado}
                abierto={filtroAbierto === 'estado'}
                deshabilitado={false}
                onAbrir={() => {
                  setCalendarioAbierto(null);
                  setFiltroAbierto((actual) =>
                    actual === 'estado' ? null : 'estado',
                  );
                }}
                onCerrar={() => setFiltroAbierto(null)}
                onSeleccionar={actualizarEstado}
              />

              <CampoFechaBitacora
                etiqueta="Desde"
                valor={fechaDesde}
                abierto={calendarioAbierto === 'desde'}
                onAbrir={() =>
                  setCalendarioAbierto((actual) => {
                    setFiltroAbierto(null);
                    return actual === 'desde' ? null : 'desde';
                  })
                }
                onCerrar={() => setCalendarioAbierto(null)}
              >
                <PanelCalendario
                  valorSeleccionado={fechaDesde}
                  min={periodoConsultado.desde}
                  max={fechaHasta || periodoConsultado.hasta}
                  onSeleccionar={actualizarFechaDesde}
                  onCerrar={() => setCalendarioAbierto(null)}
                />
              </CampoFechaBitacora>

              <CampoFechaBitacora
                etiqueta="Hasta"
                valor={fechaHasta}
                abierto={calendarioAbierto === 'hasta'}
                onAbrir={() =>
                  setCalendarioAbierto((actual) => {
                    setFiltroAbierto(null);
                    return actual === 'hasta' ? null : 'hasta';
                  })
                }
                onCerrar={() => setCalendarioAbierto(null)}
              >
                <PanelCalendario
                  valorSeleccionado={fechaHasta}
                  min={fechaDesde || periodoConsultado.desde}
                  max={periodoConsultado.hasta}
                  onSeleccionar={actualizarFechaHasta}
                  onCerrar={() => setCalendarioAbierto(null)}
                />
              </CampoFechaBitacora>
            </div>
          </section>

          {error && (
            <div
              className="mx-5 mb-6 rounded-[1.4rem] border border-red-200/70 bg-red-50/[0.75] px-5 py-4 shadow-sm backdrop-blur-xl sm:mx-8 lg:mx-12 dark:border-red-400/20 dark:bg-red-950/[0.35]"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-700 dark:bg-red-500/15 dark:text-red-200">
                  !
                </span>
                <p className="pt-1.5 text-sm font-bold text-red-800 dark:text-red-100">
                  {error}
                </p>
              </div>
            </div>
          )}

          {cargando ? (
            <div className="mx-5 mb-7 rounded-[1.8rem] border border-white/45 bg-white/[0.34] p-10 text-center shadow-[0_18px_50px_rgba(9,85,64,0.035)] backdrop-blur-xl sm:mx-8 lg:mx-14 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-[#009444] dark:border-emerald-400/15 dark:border-t-[#8DC63F]" />
              <p className="text-sm font-bold text-[#095540] dark:text-emerald-100">
                Cargando bitácora...
              </p>
            </div>
          ) : registros.length === 0 ? (
            <div className="mx-5 mb-7 rounded-[1.8rem] border border-white/45 bg-white/[0.24] p-10 text-center shadow-[0_18px_45px_rgba(7,63,49,0.035)] backdrop-blur-2xl sm:mx-8 sm:p-14 lg:mx-14 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#8DC63F]/10 text-[#64842F] dark:bg-[#8DC63F]/10 dark:text-[#A8D66D]">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.7"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9 12.75 2.25 2.25L15 9.75m6.75 2.25a9.75 9.75 0 1 1-19.5 0 9.75 9.75 0 0 1 19.5 0z"
                  />
                </svg>
              </div>
              <h2 className="mt-5 text-xl font-extrabold tracking-tight text-[#095540] dark:text-white">
                No hay registros para {periodoConsultado.etiqueta}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b7a72] dark:text-emerald-100/[0.72]">
                No hay actividades que coincidan con el periodo mensual y los filtros seleccionados.
              </p>
            </div>
          ) : (
            <section className="relative z-10 mx-5 mb-7 overflow-hidden rounded-[1.9rem] border border-white/55 bg-white/[0.25] shadow-[0_18px_45px_rgba(7,63,49,0.045)] backdrop-blur-xl sm:mx-8 lg:mx-12 dark:border-white/10 dark:bg-[#09261E]/[0.42] dark:shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
              <div className="flex flex-col gap-3 border-b border-white/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-white/[0.07]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8dc63f] dark:text-[#A8D66D]">
                    Auditoría del sistema
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#073f31] dark:text-white">
                    Actividad registrada
                  </h2>
                </div>
                <span className="inline-flex w-fit rounded-full border border-[#00AEEF]/20 bg-[#00AEEF]/10 px-3 py-1.5 text-xs font-bold text-[#0087BA] dark:border-[#00AEEF]/25 dark:bg-[#00AEEF]/[0.12] dark:text-[#BCEEFF]">
                  {totalRegistros}{' '}
                  {totalRegistros === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              <div className="custom-scrollbar grid max-h-[calc(100vh-260px)] gap-4 overflow-y-auto overscroll-contain p-5 pr-2 [scrollbar-gutter:stable] sm:p-6 sm:pr-2 lg:p-7 lg:pr-2 dark:[scrollbar-color:rgba(141,198,63,0.35)_transparent]">
                {registros.map((registro) => {
                  const usuario = registro.usuario;
                  const nombreUsuario =
                    usuario?.nombreUsuario ?? 'Usuario no disponible';
                  const nombreCompleto = usuario
                    ? `${usuario.nombre} ${usuario.apellidos}`.trim()
                    : '';

                  return (
                    <article
                      key={registro.id}
                      className="group relative overflow-hidden rounded-[1.8rem] border border-white/40 bg-white/[0.34] shadow-[0_14px_38px_rgba(7,63,49,0.035)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.45] hover:shadow-[0_18px_45px_rgba(7,63,49,0.055)] sm:p-6 dark:border-white/[0.08] dark:bg-white/[0.045] dark:shadow-[0_14px_38px_rgba(0,0,0,0.18)] dark:hover:bg-white/[0.07] dark:hover:shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
                    >
                      <div
                        className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-[#00AEEF]/10 blur-2xl transition-transform duration-500 group-hover:scale-110"
                        aria-hidden="true"
                      />

                      <div className="relative z-10 p-5 sm:p-0">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d9d823]/[0.24] to-[#8dc63f]/[0.24] text-base font-extrabold text-[#095540] ring-1 ring-[#8dc63f]/[0.24] dark:from-[#D9D823]/[0.12] dark:to-[#8DC63F]/[0.14] dark:text-[#E8F8EC] dark:ring-[#8DC63F]/20">
                              {nombreUsuario.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="break-words text-lg font-extrabold tracking-tight text-[#095540] dark:text-white">
                                  {nombreUsuario}
                                </h3>
                                <span className="inline-flex rounded-full border border-[#00AEEF]/20 bg-[#00AEEF]/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#187E9B] dark:border-[#00AEEF]/25 dark:bg-[#00AEEF]/[0.10] dark:text-[#69D8F7]">
                                  ID #{registro.id}
                                </span>
                              </div>

                              {nombreCompleto && (
                                <p className="mt-1 text-sm font-medium text-[#52675e] dark:text-emerald-100/[0.72]">
                                  {nombreCompleto}
                                </p>
                              )}

                              {usuario?.correo && (
                                <div className="mt-2 flex min-w-0 items-start gap-2 text-sm font-medium text-[#52675e] dark:text-emerald-100/[0.72]">
                                  <svg
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[#00AEEF]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.8"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M21.75 6.75v10.5A2.25 2.25 0 0 1 19.5 19.5h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-9.75 6.75L2.25 6.75"
                                    />
                                  </svg>
                                  <span className="min-w-0 break-words">
                                    {usuario.correo}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 lg:max-w-[45%] lg:justify-end">
                            <span className="inline-flex items-center rounded-full border border-[#8dc63f]/30 bg-[#8dc63f]/[0.12] px-3 py-1.5 text-xs font-bold text-[#568000] dark:border-[#8DC63F]/25 dark:bg-[#8DC63F]/[0.10] dark:text-[#C9F6D8]">
                              {formatearAccion(registro.action)}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${estiloEstado(registro.status)}`}
                            >
                              {textoEstado(registro.status)}
                            </span>
                          </div>
                        </div>

                        <div className="relative z-10 mt-5 grid gap-3 border-t border-white/35 pt-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-white/10">
                          <div className="rounded-2xl border border-white/60 bg-white/[0.42] p-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#071C16]/[0.36]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#829188] dark:text-[#a9beb2]">
                              Acción realizada
                            </p>
                            <p className="mt-1.5 break-words text-sm font-semibold leading-6 text-[#304B40] dark:text-white">
                              {registro.description ?? 'Sin descripción'}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/60 bg-white/[0.42] p-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#071C16]/[0.36]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#829188] dark:text-[#a9beb2]">
                              Información adicional
                            </p>
                            <p className="mt-1.5 break-words text-sm font-medium leading-6 text-[#52675e] dark:text-emerald-100/80">
                              {obtenerInformacion(registro)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/60 bg-white/[0.42] p-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#071C16]/[0.36]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#829188] dark:text-[#a9beb2]">
                              Fecha y hora
                            </p>
                            <time
                              dateTime={registro.createdAt}
                              className="mt-1.5 block text-sm font-semibold leading-6 text-[#304B40] dark:text-white"
                            >
                              {formatearFecha(registro.createdAt)}
                            </time>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-white/60 px-5 py-4 text-sm font-semibold text-[#52675e] sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-white/[0.08] dark:text-[#B9CBC0]">
                <p>
                  Mostrando {rangoInicio}–{rangoFin} de {totalRegistros}
                </p>

                {totalPaginas > 1 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setPaginaActual((pagina) => Math.max(1, pagina - 1))
                      }
                      disabled={paginaSegura === 1}
                      className={claseBotonPagina}
                    >
                      Anterior
                    </button>

                    <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-[#8DC63F]/25 bg-white/70 px-4 text-sm font-extrabold text-[#095540] shadow-inner shadow-white/40 backdrop-blur-xl dark:border-[#8DC63F]/20 dark:bg-[#09261E]/[0.62] dark:text-[#E8F8EC]">
                      {paginaSegura}
                    </span>

                    <span className="text-xs font-bold text-[#52675e] dark:text-[#B9CBC0]">
                      de {totalPaginas}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setPaginaActual((pagina) =>
                          Math.min(totalPaginas, pagina + 1),
                        )
                      }
                      disabled={paginaSegura === totalPaginas}
                      className={claseBotonPagina}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          <footer className="border-t border-white/20 px-7 py-5 sm:px-10 lg:px-14 dark:border-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] font-semibold text-[#7D9086] dark:text-[#81968D]">
                Seguridad y administración · Aliados del Parque Nacional Diriá
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold tracking-[0.12em]">
                <span className="text-[#009444]">Guanacaste</span>
                <span className="text-[#00AEEF]">Costa Rica</span>
                <span className="text-[#D9D823]">Parque Nacional Diriá</span>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
