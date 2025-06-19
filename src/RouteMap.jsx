import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function FitBounds({ routeData }) {
  const map = useMap();

  if (routeData) {
    const coords = routeData.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const bounds = coords.length > 1 ? coords : [coords[0], coords[0]];
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  return null;
}

export default function RouteMap({ routeData }) {
  return (
    <MapContainer
      center={[52.0, 19.0]}
      zoom={6}
      style={{ height: '600px', width: '100%', marginTop: '30px' }}
      gestureHandling={true}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {routeData && (
        <>
          <Polyline
            positions={routeData.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])}
            pathOptions={{ color: 'blue', weight: 5 }}
          />
          <FitBounds routeData={routeData} />
        </>
      )}
    </MapContainer>
  );
}
