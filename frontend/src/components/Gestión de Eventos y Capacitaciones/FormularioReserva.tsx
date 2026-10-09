import { useEffect, useRef, useState, type FormEvent } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import es from 'react-phone-number-input/locale/es.json';
import type { EventoCapacitacion } from '../../services/eventosCapacitacionesService';
import {
  crearReserva,
  editarReserva,
  subirComprobanteReserva,
  type DatosReserva,
} from '../../services/inscripcionService';
import CountrySelectPersonalizado from '../CountrySelectPersonalizado';

interface FormularioReservaProps {
  evento: EventoCapacitacion;
  onClose: () => void;
  onSuccess: (cuposDisponibles: number | null) => void;
  reservaInicial?: DatosReserva;
}

type CampoReserva = keyof DatosReserva;
type ErroresReserva = Partial<Record<CampoReserva, string>>;

const camposIniciales: DatosReserva = {
  nombreCompleto: '',
  fechaNacimiento: '',
  tipoIdentificacion: 'cedula',
  numeroIdentificacion: '',
  correo: '',
  telefono: '',
};

const INPUT_CLASS =
  'mt-1 w-full rounded-xl border border-[#095540]/15 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#009444] focus:ring-4 focus:ring-[#009444]/15 disabled:cursor-not-allowed disabled:bg-slate-100';

const LABEL_CLASS = 'text-sm font-semibold text-[#095540]';

function fechaLocalValida(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;

  const [anio, mes, dia] = valor.split('-').map(Number);

  const fecha = new Date(anio, mes - 1, dia);

  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  return fecha;
}

function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date();

  let edad =
    hoy.getFullYear() -
    fechaNacimiento.getFullYear();

  if (
    hoy.getMonth() < fechaNacimiento.getMonth() ||
    (hoy.getMonth() === fechaNacimiento.getMonth() &&
      hoy.getDate() < fechaNacimiento.getDate())
  ) {
    edad -= 1;
  }

  return edad;
}

function validarIdentificacion(
  tipo: DatosReserva['tipoIdentificacion'],
  numero: string,
): boolean {
  if (tipo === 'cedula') {
    return /^\d{9}$/.test(numero);
  }

  if (tipo === 'dimex') {
    return /^\d{11,12}$/.test(numero);
  }

  return /^[A-Za-z0-9]{6,20}$/.test(numero);
}

export default function FormularioReserva({
  evento,
  onClose,
  onSuccess,
  reservaInicial,
}: FormularioReservaProps) {
  const [formulario, setFormulario] = useState<DatosReserva>(
    reservaInicial ?? camposIniciales,
  );

  const [errores, setErrores] =
    useState<ErroresReserva>({});

  const [enviando, setEnviando] =
    useState(false);

  const [mensajeError, setMensajeError] =
    useState<string | null>(null);

  const [enviado, setEnviado] =
    useState(false);
  const [comprobante, setComprobante] = useState<File | null>(null);

  const primerCampoRef =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    primerCampoRef.current?.focus();
  }, []);

  function actualizarCampo(
    campo: CampoReserva,
    valor: string,
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));

    setErrores((actuales) => {
      if (!actuales[campo]) return actuales;

      const siguientes = {
        ...actuales,
      };

      delete siguientes[campo];

      return siguientes;
    });

    setMensajeError(null);
  }

  function validar(): ErroresReserva {
    const siguientes: ErroresReserva = {};

    const fechaNacimiento =
      fechaLocalValida(
        formulario.fechaNacimiento,
      );

    if (!formulario.nombreCompleto.trim()) {
      siguientes.nombreCompleto =
        'Completa este campo.';
    }

    if (!fechaNacimiento) {
      siguientes.fechaNacimiento =
        'Ingresa una fecha válida.';
    } else if (fechaNacimiento > new Date()) {
      siguientes.fechaNacimiento =
        'La fecha no puede estar en el futuro.';
    }

    if (!formulario.numeroIdentificacion.trim()) {
      siguientes.numeroIdentificacion =
        'Completa este campo.';
    } else if (
      !validarIdentificacion(
        formulario.tipoIdentificacion,
        formulario.numeroIdentificacion.trim(),
      )
    ) {
      siguientes.numeroIdentificacion =
        'El número no coincide con el tipo seleccionado.';
    }

    if (!formulario.correo.trim()) {
      siguientes.correo =
        'Completa este campo.';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formulario.correo.trim(),
      )
    ) {
      siguientes.correo =
        'Ingresa un correo válido.';
    }

    if (
      !formulario.telefono ||
      !isValidPhoneNumber(formulario.telefono)
    ) {
      siguientes.telefono =
        'Ingresa un teléfono internacional válido.';
    }

    if (fechaNacimiento) {
      const edad =
        calcularEdad(fechaNacimiento);

      if (
        evento.edadMinima !== null &&
        edad < evento.edadMinima
      ) {
        siguientes.fechaNacimiento =
          `La edad mínima para esta actividad es ${evento.edadMinima} años.`;
      }

      if (
        evento.edadMaxima !== null &&
        edad > evento.edadMaxima
      ) {
        siguientes.fechaNacimiento =
          `La edad máxima para esta actividad es ${evento.edadMaxima} años.`;
      }
    }

    return siguientes;
  }

  async function manejarEnvio(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const siguientes = validar();

    setErrores(siguientes);

    if (Object.keys(siguientes).length > 0) {
      return;
    }

    if (evento.esPago && !reservaInicial && !comprobante) {
      setMensajeError('Adjunta el comprobante de pago para completar la pre-reserva.');
      return;
    }

    setEnviando(true);
    setMensajeError(null);

    try {
      const resultado = reservaInicial
        ? await editarReserva(
            evento.id,
            formulario,
          )
        : await crearReserva(
            evento.id,
            formulario,
          );

      if (evento.esPago && !reservaInicial && comprobante) {
        await subirComprobanteReserva(resultado.id, comprobante);
      }

      setEnviado(true);

      onSuccess(
        resultado.cuposDisponibles,
      );
    } catch (error) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : reservaInicial
            ? 'No se pudo actualizar la reserva.'
            : 'No se pudo enviar la solicitud.',
      );
    } finally {
      setEnviando(false);
    }
  }

  function mensajeCampo(
    campo: CampoReserva,
  ) {
    return errores[campo] ? (
      <p
        className="mt-1 text-xs font-semibold text-red-700"
        role="alert"
      >
        {errores[campo]}
      </p>
    ) : null;
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#052f25]/75 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-formulario-reserva"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !enviando
        ) {
          onClose();
        }
      }}
    >
      <form
        className="custom-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#095540]/10 bg-white p-5 shadow-2xl sm:p-7"
        noValidate
        onSubmit={manejarEnvio}
        aria-busy={enviando}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#009444]">
              {reservaInicial
                ? 'Editar reserva'
                : 'Solicitud de inscripción'}
            </p>

            <h2
              id="titulo-formulario-reserva"
              className="mt-1 font-brand text-2xl font-bold text-[#095540]"
            >
              {reservaInicial
                ? 'Edita tus datos'
                : 'Completa tus datos'}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {evento.nombre ??
                'Actividad seleccionada'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            aria-label="Cerrar formulario"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-[#095540] hover:bg-[#8DC63F]/15 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {enviado ? (
          <div className="space-y-5">
            <p
              className="rounded-xl border border-[#8DC63F]/40 bg-[#8DC63F]/10 px-4 py-3 text-sm font-semibold text-[#095540]"
              role="status"
            >
              {reservaInicial
                ? 'Reserva actualizada correctamente.'
                : 'Solicitud de inscripción enviada correctamente. Estado: Pendiente.'}
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-[#095540] px-4 py-3 text-sm font-bold text-white hover:bg-[#009444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009444]"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            {mensajeError && (
              <p
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                role="alert"
              >
                {mensajeError}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className={LABEL_CLASS}>
                  Nombre completo
                </span>

                <input
                  ref={primerCampoRef}
                  className={INPUT_CLASS}
                  value={formulario.nombreCompleto}
                  onChange={(event) =>
                    actualizarCampo(
                      'nombreCompleto',
                      event.target.value,
                    )
                  }
                  disabled={enviando}
                  autoComplete="name"
                />

                {mensajeCampo(
                  'nombreCompleto',
                )}
              </label>

              <label>
                <span className={LABEL_CLASS}>
                  Fecha de nacimiento
                </span>

                <input
                  type="date"
                  className={INPUT_CLASS}
                  value={
                    formulario.fechaNacimiento
                  }
                  onChange={(event) =>
                    actualizarCampo(
                      'fechaNacimiento',
                      event.target.value,
                    )
                  }
                  disabled={enviando}
                />

                {mensajeCampo(
                  'fechaNacimiento',
                )}
              </label>

              <label>
                <span className={LABEL_CLASS}>
                  Tipo de identificación
                </span>

                <select
                  className={INPUT_CLASS}
                  value={
                    formulario.tipoIdentificacion
                  }
                  onChange={(event) =>
                    actualizarCampo(
                      'tipoIdentificacion',
                      event.target.value,
                    )
                  }
                  disabled={enviando}
                >
                  <option value="cedula">
                    Cédula de identidad
                  </option>

                  <option value="dimex">
                    DIMEX
                  </option>

                  <option value="pasaporte">
                    Pasaporte
                  </option>
                </select>
              </label>

              <label>
                <span className={LABEL_CLASS}>
                  Número de identificación
                </span>

                <input
                  className={INPUT_CLASS}
                  value={
                    formulario.numeroIdentificacion
                  }
                  onChange={(event) =>
                    actualizarCampo(
                      'numeroIdentificacion',
                      event.target.value,
                    )
                  }
                  disabled={enviando}
                  autoComplete="off"
                />

                {mensajeCampo(
                  'numeroIdentificacion',
                )}
              </label>

              <label>
                <span className={LABEL_CLASS}>
                  Correo electrónico
                </span>

                <input
                  type="email"
                  className={INPUT_CLASS}
                  value={formulario.correo}
                  onChange={(event) =>
                    actualizarCampo(
                      'correo',
                      event.target.value,
                    )
                  }
                  disabled={enviando}
                  autoComplete="email"
                />

                {mensajeCampo('correo')}
              </label>

              <label>
                <span className={LABEL_CLASS}>
                  Teléfono
                </span>

                <PhoneInput
                  international
                  defaultCountry="CR"
                  labels={es}
                  countrySelectComponent={
                    CountrySelectPersonalizado
                  }
                  value={
                    formulario.telefono ||
                    undefined
                  }
                  onChange={(valor) =>
                    actualizarCampo(
                      'telefono',
                      valor ?? '',
                    )
                  }
                  disabled={enviando}
                  aria-invalid={Boolean(
                    errores.telefono,
                  )}
                  className={INPUT_CLASS}
                  placeholder="8888 7777"
                />

                {mensajeCampo('telefono')}
              </label>
            </div>

            {evento.esPago && !reservaInicial && (
              <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm font-bold text-sky-900">
                  Actividad de pago — ₡{(evento.precio ?? 0).toLocaleString('es-CR')}
                </p>
                <p className="mt-1 text-xs text-sky-800">Adjunta una imagen JPG, PNG o WEBP de tu comprobante de transferencia/SINPE. La pre-reserva vence en 24 horas si no se adjunta.</p>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-3 block w-full text-sm" disabled={enviando} onChange={(event) => setComprobante(event.target.files?.[0] ?? null)} />
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={enviando}
                className="rounded-xl border border-[#095540]/20 px-5 py-3 text-sm font-bold text-[#095540] hover:bg-[#095540]/5 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={enviando}
                className="rounded-xl bg-[#095540] px-5 py-3 text-sm font-bold text-white hover:bg-[#009444] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enviando
                  ? reservaInicial
                    ? 'Guardando cambios...'
                    : 'Enviando solicitud...'
                  : reservaInicial
                    ? 'Guardar cambios'
                    : 'Enviar solicitud'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
