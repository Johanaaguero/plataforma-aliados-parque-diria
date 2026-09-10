import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Casona / puesto de guardaparques, OSM way 402781690:
// https://mapcarta.com/W402781690
// Acceso por Arado: https://www.sinac.go.cr/ES/ac/act/pndiria/Paginas/default.aspx
const UBICACION_PARQUE: [number, number] = [10.17288, -85.59401];
const INDICACIONES_PARQUE =
  'https://www.google.com/maps/dir/?api=1&destination=10.17288%2C-85.59401';
const INFORMACION_PARQUE =
  'https://www.sinac.go.cr/ES/ac/act/pndiria/Paginas/default.aspx';

const marcadorParque = L.divIcon({
  className: '',
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="40" height="48" aria-hidden="true">
    <path d="M20 46S3 30 3 20a17 17 0 0 1 34 0c0 10-17 26-17 26Z" fill="#095540" stroke="#ffffff" stroke-width="2.5" />
    <circle cx="20" cy="20" r="8" fill="#8dc63f" />
    <path d="m16 20 3 3 6-7" fill="none" stroke="#095540" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" />
  </svg>`,
  iconSize: [40, 48],
  iconAnchor: [20, 46],
  popupAnchor: [0, -42],
});

function MapaParque() {
  return (
    <section
      id="ubicacion-parque"
      aria-labelledby="titulo-mapa-parque"
      className="relative scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="sigtad-glass mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] lg:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
          <span className="sigtad-heading mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8dc63f]/15">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <p className="sigtad-heading text-xs font-bold uppercase tracking-[0.2em] sm:text-sm">
            Visítanos
          </p>
          <h2
            id="titulo-mapa-parque"
            className="sigtad-heading mt-4 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl"
          >
            Encuentra tu camino al Diriá.
          </h2>
          <p className="sigtad-muted mt-5 text-base leading-7">
            Estamos en Santa Cruz, Guanacaste. El acceso al parque se realiza
            por la comunidad de Arado, siguiendo el camino hacia la casona del
            Parque Nacional Diriá.
          </p>
          <div className="mt-7 flex flex-col items-start gap-4">
            <a
              href={INDICACIONES_PARQUE}
              target="_blank"
              rel="noopener noreferrer"
              className="sigtad-button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold sm:w-auto"
            >
              Cómo llegar
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
              <span className="sr-only"> (abre Google Maps en otra pestaña)</span>
            </a>
            <a
              href={INFORMACION_PARQUE}
              target="_blank"
              rel="noopener noreferrer"
              className="sigtad-heading inline-flex min-h-11 items-center text-sm font-semibold underline decoration-current/40 underline-offset-4 hover:decoration-current"
            >
              Información del parque en SINAC
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </div>
        </div>

        <div
          className="sigtad-map relative isolate min-w-0 overflow-hidden"
          role="region"
          aria-label="Mapa interactivo de la ubicación del Parque Nacional Diriá"
        >
          <MapContainer
            center={UBICACION_PARQUE}
            zoom={13}
            scrollWheelZoom={false}
            className="relative z-0 h-80 w-full sm:h-[420px] lg:h-full lg:min-h-[480px]"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker
              position={UBICACION_PARQUE}
              icon={marcadorParque}
              title="Casona del Parque Nacional Diriá"
              alt="Ubicación de la casona del Parque Nacional Diriá"
            >
              <Popup>
                <div className="text-sm leading-6">
                  <strong>Casona del Parque Nacional Diriá</strong>
                  <p className="sigtad-muted">Santa Cruz, Guanacaste, Costa Rica.</p>
                  <a
                    href={INDICACIONES_PARQUE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-4"
                  >
                    Ver indicaciones
                    <span className="sr-only"> (abre Google Maps en otra pestaña)</span>
                  </a>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </section>
  );
}

export default MapaParque;
