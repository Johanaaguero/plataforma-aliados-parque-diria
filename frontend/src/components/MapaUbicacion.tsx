import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapaUbicacionProps {
  latitud: number | string | null | undefined;
  longitud: number | string | null | undefined;
  nombre?: string;
}

const DEFAULT_ZOOM = 16;

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

function MapaUbicacion({
  latitud,
  longitud,
  nombre,
}: MapaUbicacionProps) {
  const lat = Number(latitud);
  const lng = Number(longitud);

  const coordenadasValidas =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  if (!coordenadasValidas) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <p className="px-4 text-center text-xs font-medium text-slate-500">
          Ubicación no disponible
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <MapContainer
        center={[lat, lng]}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        dragging={true}
        doubleClickZoom={true}
        touchZoom={true}
        zoomControl={true}
        className="relative z-0 h-56 w-full"
      >
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{y}/{x}{r}.png"
        />

        <Marker position={[lat, lng]} icon={marcador}>
          <Popup>
            <div className="text-sm">
              <strong>
                {nombre || 'Ubicación del emprendimiento'}
              </strong>

              <div className="mt-1 text-xs text-slate-600">
                Latitud: {lat}
              </div>

              <div className="text-xs text-slate-600">
                Longitud: {lng}
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapaUbicacion;
