import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function FitBounds({ routeData }) {
  const map = useMap();

  // Dodatkowe sprawdzenia, czy routeData.features istnieje i ma elementy
  if (routeData && routeData.features && routeData.features.length > 0) {
    const coords = routeData.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    // Jeśli jest tylko jeden punkt (np. z jakiegoś powodu trasa to pojedynczy punkt),
    // fitBounds potrzebuje co najmniej dwóch punktów, aby stworzyć "bounds".
    // W przeciwnym razie, ustaw po prostu ten sam punkt dwukrotnie.
    const bounds = coords.length > 1 ? coords : [coords[0], coords[0]];
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  return null;
}

export default function RouteMap({ routeData }) {
  // Dodatkowe sprawdzenia przed renderowaniem Polyline i FitBounds
  const hasValidRouteData = routeData && routeData.features && routeData.features.length > 0 && routeData.features[0].geometry;

  return (
    <MapContainer
      center={[52.0, 19.0]}
      zoom={6}
      style={{ height: '600px', width: '100%', marginTop: '30px' }}
      gestureHandling={true}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {hasValidRouteData && ( // Renderuj tylko jeśli dane trasy są poprawne
        <>
          <Polyline
            positions={routeData.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])}
            pathOptions={{ color: 'blue', weight: 5 }}
          />
          <FitBounds routeData={routeData} />
        </>
      )}
      {!hasValidRouteData && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, color: '#555', fontSize: '1.2em', textAlign: 'center', padding: '20px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          Brak danych trasy do wyświetlenia. Uzupełnij formularz i zapisz trasę.
        </div>
      )}
    </MapContainer>
  );
}