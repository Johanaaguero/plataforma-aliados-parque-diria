import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  CircleMarker,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SelectorUbicacionProps {
  latitud: number | null;
  longitud: number | null;
  onChange: (latitud: number, longitud: number) => void;
  disabled?: boolean;
}

const DEFAULT_LATITUD = 10.148;
const DEFAULT_LONGITUD = -85.452;
const DEFAULT_ZOOM = 17;

/**
 * Actualiza la posición del mapa cuando cambian
 * las coordenadas desde los inputs.
 */
function CentrarMapa({
  latitud,
  longitud,
}: {
  latitud: number | null;
  longitud: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (
      latitud !== null &&
      longitud !== null &&
      Number.isFinite(latitud) &&
      Number.isFinite(longitud)
    ) {
      map.setView([latitud, longitud], map.getZoom());
    }
  }, [latitud, longitud, map]);

  return null;
}

/**
 * Permite seleccionar una nueva ubicación haciendo
 * clic directamente sobre el mapa.
 */
function SeleccionMapa({
  disabled,
  onChange,
}: {
  disabled?: boolean;
  onChange: (latitud: number, longitud: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (disabled) {
        return;
      }

      onChange(
        Number(event.latlng.lat.toFixed(8)),
        Number(event.latlng.lng.toFixed(8)),
      );
    },
  });

  return null;
}

export function SelectorUbicacion({
  latitud,
  longitud,
  onChange,
  disabled = false,
}: SelectorUbicacionProps) {
  const [mostrarCalor, setMostrarCalor] = useState(false);
  const posicionValida =
    latitud !== null &&
    longitud !== null &&
    Number.isFinite(latitud) &&
    Number.isFinite(longitud);

  const posicion: [number, number] = posicionValida
    ? [latitud, longitud]
    : [DEFAULT_LATITUD, DEFAULT_LONGITUD];

  const marcador = L.divIcon({
    className: '',
    html: `
      <div style="
        font-size: 32px;
        line-height: 32px;
        transform: translate(-50%, -100%);
      ">
        📍
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setMostrarCalor((actual) => !actual)}
          aria-pressed={mostrarCalor}
          className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-xs font-bold text-emerald-800 shadow-lg backdrop-blur-md transition hover:bg-white dark:bg-slate-900/80 dark:text-emerald-200 dark:hover:bg-slate-900"
        >
          {mostrarCalor ? 'Ocultar mapa de calor' : 'Ver mapa de calor'}
        </button>
      </div>
      <div className="relative isolate overflow-hidden rounded-2xl border border-white/20 bg-slate-100 shadow-xl shadow-emerald-950/10 dark:bg-slate-900">
        <MapContainer
          center={posicion}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={!disabled}
          zoomControl={false}
          className="relative z-0 h-[280px] w-full sm:h-[350px]"
        >
          <ZoomControl position="topright" />
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          {mostrarCalor &&
            [
              [10.148, -85.452],
              [10.149, -85.451],
              [10.1475, -85.453],
              [10.15, -85.45],
            ].map(([puntoLat, puntoLng], indice) => (
              <CircleMarker
                key={`${puntoLat}-${puntoLng}`}
                center={[puntoLat, puntoLng]}
                radius={28 - indice * 3}
                pathOptions={{
                  color: indice < 2 ? '#ef4444' : '#f59e0b',
                  fillColor: indice < 2 ? '#ef4444' : '#22c55e',
                  fillOpacity: 0.25,
                  weight: 1,
                }}
              />
            ))}

          <CentrarMapa
            latitud={latitud}
            longitud={longitud}
          />

          <SeleccionMapa
            disabled={disabled}
            onChange={onChange}
          />

          {posicionValida && (
            <Marker
              position={posicion}
              icon={marcador}
              draggable={!disabled}
              eventHandlers={{
                dragend: (event) => {
                  if (disabled) {
                    return;
                  }

                  const marker =
                    event.target as L.Marker;

                  const nuevaPosicion =
                    marker.getLatLng();

                  onChange(
                    Number(
                      nuevaPosicion.lat.toFixed(8),
                    ),
                    Number(
                      nuevaPosicion.lng.toFixed(8),
                    ),
                  );
                },
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Ubicación seleccionada</strong>

                  <div className="mt-1">
                    Latitud: {posicion[0]}
                  </div>

                  <div>
                    Longitud: {posicion[1]}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

       {/*  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="latitud"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Latitud
          </label>

          <input
            id="latitud"
            type="number"
            step="any"
            value={latitud ?? ''}
            disabled={disabled}
            onChange={(event) => {
              const valor = event.target.value;

              if (valor === '') {
                onChange(
                  Number.NaN,
                  longitud ?? Number.NaN,
                );
                return;
              }

              onChange(
                Number(valor),
                longitud ?? Number.NaN,
              );
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="longitud"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Longitud
          </label>

          <input
            id="longitud"
            type="number"
            step="any"
            value={longitud ?? ''}
            disabled={disabled}
            onChange={(event) => {
              const valor = event.target.value;

              if (valor === '') {
                onChange(
                  latitud ?? Number.NaN,
                  Number.NaN,
                );
                return;
              }

              onChange(
                latitud ?? Number.NaN,
                Number(valor),
              );
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
          />
        </div>
      </div> */}

      <p className="text-sm text-slate-500">Haz clic en el mapa o arrastra el marcador para seleccionar la ubicación.</p>
    </div>
  );
}

export default SelectorUbicacion;
