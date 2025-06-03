import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function TestMapView() {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [routes, setRoutes] = useState([
    {
      id: 1,
      from_city: 'Olsztyn',
      to_city: 'Poznań',
      date: '2025-05-14',
      vehicle_type: 'laweta',
      passenger_count: '2',
      load_capacity: '1000',
      phone: '123456789',
      messenger_link: 'https://m.me/test',
      geojson: {
        features: [{
          geometry: {
            coordinates: [
              [20.4942, 53.7784], // Olsztyn
              [16.9252, 52.4064], // Poznań
            ]
          }
        }]
      }
    }
  ]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Testowa strona z mapą</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {routes.map((r, idx) => (
          <div
            key={r.id}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: '10px',
              padding: '15px',
              width: '300px',
              boxShadow: hoveredIndex === idx ? '0 0 10px red' : '0 0 5px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
          >
            <strong>{r.from_city} → {r.to_city}</strong><br />
            🗓️ {r.date}<br />
            🚚 {r.vehicle_type}<br />
            🧍 {r.passenger_count}<br />
            ⚖️ {r.load_capacity} kg<br />
            📞 {r.phone}<br />
            💬 <a href={r.messenger_link} target="_blank">Messenger</a>
          </div>
        ))}
      </div>

      <MapContainer
        center={[52.0, 19.0]}
        zoom={6}
        style={{ height: '800px', width: '100%', marginTop: '40px' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {routes.map((r, idx) => (
          <Polyline
            key={r.id}
            positions={r.geojson.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])}
            pathOptions={{
              color: hoveredIndex === idx ? 'red' : 'blue',
              weight: hoveredIndex === idx ? 6 : 4,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
