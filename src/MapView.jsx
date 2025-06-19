import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let mapInstance = null;

function MapView({ routeData }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapInstance) {
      mapInstance.remove();
    }

    const map = L.map('main-map').setView([52, 10], 5);
    mapInstance = map;
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Dodaj logowanie
    console.log('DANE TRASY:', routeData);

    // Jeśli są dane trasy — rysujemy
   if (routeData && routeData.features && routeData.features[0]) {
  const coords = routeData.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      const routeLine = L.polyline(coords, {
        color: 'blue',
        weight: 5
      }).addTo(map);

      map.fitBounds(routeLine.getBounds());
    }
  }, [routeData]);

  return <div id="main-map" style={{ width: '100%', height: '100%' }}></div>;
}

export default MapView;
