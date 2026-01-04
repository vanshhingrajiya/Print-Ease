import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const DEFAULT_CENTER = [23.0225, 72.5714]; // Ahmedabad
const DEFAULT_ZOOM = 12;
const LOCATION_ZOOM = 16;

function ClickHandler({ isEditing, onSelect }) {
  useMapEvents({
    click(e) {
      if (!isEditing) return;
      onSelect(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function LocationSection({
  lat,
  lng,
  isEditing,
  onChange
}) {
  const hasLocation = lat != null && lng != null;

  const center = hasLocation ? [lat, lng] : DEFAULT_CENTER;
  const zoom = hasLocation ? LOCATION_ZOOM : DEFAULT_ZOOM;

  return (
    <div className="space-y-4">
      <div className="h-[320px] rounded border overflow-hidden">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          dragging={isEditing}
          doubleClickZoom={false}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          <ClickHandler
            isEditing={isEditing}
            onSelect={(lat, lng) => onChange(lat, lng)}
          />

          {hasLocation && (
            <Marker
              position={[lat, lng]}
              draggable={isEditing}
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng();
                  onChange(pos.lat, pos.lng);
                }
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-gray-500">
        {isEditing
          ? 'Click on map or drag marker to change location'
          : 'Click Edit to update shop location'}
      </p>
    </div>
  );
}