import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

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
      <TileLayer
        url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`}
        attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        tileSize={512}
        zoomOffset={-1}
      />
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
