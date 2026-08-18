import { useEffect, useState } from 'react';
import {
  obtenerEmprendimientos,
  type Emprendimiento,
} from '../services/emprendimientoService';

interface Props {
  esAdministrador?: boolean;
  onRegistrar?: () => void;
}

function ListaEmprendimientos({
  esAdministrador = false,
  onRegistrar,
}: Props) {
  const [emprendimientos, setEmprendimientos] = useState<Emprendimiento[]>(
    []
  );

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarEmprendimientos = async () => {
      try {
        setCargando(true);
        setError(null);

        // Usuario normal:
        // solamente emprendimientos publicados.
        //
        // Administrador:
        // todos los emprendimientos, incluyendo pendientes.
        const data = esAdministrador
          ? await obtenerEmprendimientos()
          : await obtenerEmprendimientos('publicado');

        setEmprendimientos(data);
      } catch (err: any) {
        setError(
          err.message || 'No se pudieron cargar los emprendimientos'
        );
      } finally {
        setCargando(false);
      }
    };

    void cargarEmprendimientos();
  }, [esAdministrador]);

  if (cargando) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />
            <p className="text-gray-500">
              Cargando emprendimientos...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">
            No se pudieron cargar los emprendimientos
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-7xl">

        {/* ENCABEZADO */}
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-green-700">
              Asociados del Parque Nacional Diriá
            </p>

            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Emprendimientos locales
            </h1>

            <p className="mt-3 max-w-2xl text-gray-600">
              Conocé los emprendimientos que forman parte de la comunidad
              alrededor del Parque Nacional Diriá.
            </p>
          </div>

          {/* ESTE BOTÓN SOLO LO VE EL ADMINISTRADOR */}
          {esAdministrador && onRegistrar && (
            <button
              type="button"
              onClick={onRegistrar}
              className="rounded-xl bg-green-800 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              + Registrar emprendimiento
            </button>
          )}
        </div>

        {/* SIN EMPRENDIMIENTOS */}
        {emprendimientos.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <span className="text-3xl">🌿</span>
            </div>

            <h2 className="text-xl font-semibold text-gray-800">
              {esAdministrador
                ? 'No hay emprendimientos registrados'
                : 'Aún no hay emprendimientos disponibles'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-gray-500">
              {esAdministrador
                ? 'Todavía no se han registrado emprendimientos en el sistema.'
                : 'Pronto podrás conocer los emprendimientos disponibles de nuestra comunidad.'}
            </p>

            {esAdministrador && onRegistrar && (
              <button
                type="button"
                onClick={onRegistrar}
                className="mt-6 rounded-xl bg-green-800 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
              >
                Registrar el primer emprendimiento
              </button>
            )}
          </div>
        )}

        {/* TARJETAS */}
        {emprendimientos.length > 0 && (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {emprendimientos.map((emprendimiento) => (
              <article
                key={emprendimiento.id}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* IMAGEN */}
                <div className="relative h-52 overflow-hidden bg-gradient-to-br from-green-100 to-green-50">
                  {emprendimiento.imagen ? (
                    <img
                      src={emprendimiento.imagen}
                      alt={emprendimiento.nombre}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-6xl">🌿</span>
                    </div>
                  )}

                  {/* ESTADO */}
                  {esAdministrador && (
                    <span
                      className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                        emprendimiento.estadoPublicacion === 'publicado'
                          ? 'bg-green-100 text-green-800'
                          : emprendimiento.estadoPublicacion === 'pendiente'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {emprendimiento.estadoPublicacion}
                    </span>
                  )}
                </div>

                {/* INFORMACIÓN */}
                <div className="p-6">
                  {emprendimiento.categoria && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      {emprendimiento.categoria}
                    </span>
                  )}

                  <h2 className="mt-2 text-xl font-bold text-gray-900">
                    {emprendimiento.nombre}
                  </h2>

                  {emprendimiento.descripcion && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                      {emprendimiento.descripcion}
                    </p>
                  )}

                  <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
                    {emprendimiento.direccion && (
                      <p className="flex gap-2 text-sm text-gray-600">
                        <span>📍</span>
                        <span>{emprendimiento.direccion}</span>
                      </p>
                    )}

                    {emprendimiento.telefono && (
                      <p className="flex gap-2 text-sm text-gray-600">
                        <span>📞</span>
                        <span>{emprendimiento.telefono}</span>
                      </p>
                    )}

                    {emprendimiento.correoElectronico && (
                      <p className="flex gap-2 break-all text-sm text-gray-600">
                        <span>✉️</span>
                        <span>{emprendimiento.correoElectronico}</span>
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ListaEmprendimientos;