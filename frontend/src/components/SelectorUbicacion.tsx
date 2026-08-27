import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { useEffect } from 'react';
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
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <MapContainer
          center={posicion}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={!disabled}
          className="h-[350px] w-full"
        >
         <TileLayer
  attribution='&copy; OpenStreetMap contributors'
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>

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

      <p className="text-sm text-slate-500">
        Puedes hacer clic en el mapa, mover el marcador o
        ingresar manualmente las coordenadas.
      </p>
    </div>
  );
}

export default SelectorUbicacion;