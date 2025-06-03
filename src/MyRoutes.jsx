import EditRouteModal from './EditRouteModal';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';

const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res;
    } catch (err) {
      console.warn(`⚠️ Próba ${i + 1} nie powiodła się:`, err.message);
      if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('❌ fetchWithRetry: wszystkie próby nie powiodły się');
};

export default function MyRoutes() {
  const [routes, setRoutes] = useState([]);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [userId, setUserId] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;
      setUserId(uid);

      if (!uid) return;

      const { data, error } = await supabase
        .from('routes')
        .select('id, geojson, from_city, to_city, date, vehicle_type, passenger_count, load_capacity, phone, messenger_link')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (!error) {
        setRoutes(data);
      } else {
        console.error('❌ Błąd ładowania tras:', error.message);
      }
    };

    load();
  }, []);

  const handleDelete = async (routeId) => {
    const confirm = window.confirm('Czy na pewno chcesz usunąć tę trasę?');
    if (!confirm) return;

    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('id', routeId);

    if (error) {
      console.error('❌ Błąd usuwania trasy:', error.message);
      alert('❌ Nie udało się usunąć trasy.');
    } else {
      setRoutes((prev) => prev.filter((r) => r.id !== routeId));
    }
  };

  const handleSave = async (updatedData) => {
    if (!updatedData?.id) {
      console.error('Brak ID trasy do aktualizacji.');
      return;
    }

    const apiKey = import.meta.env.VITE_ORS_API_KEY;

    const geocode = async (place) => {
      const res = await fetchWithRetry(`https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(place)}&size=1`);
      const data = await res.json();
      return data.features[0]?.geometry.coordinates;
    };

    const getRouteGeoJSON = async (from, to, via) => {
      const fromCoords = await geocode(from);
      const toCoords = await geocode(to);
      const viaCoords = via ? await geocode(via) : null;

      if (!fromCoords || !toCoords) {
        throw new Error('Nie znaleziono współrzędnych dla podanych miejscowości.');
      }

      const coordinates = viaCoords ? [fromCoords, viaCoords, toCoords] : [fromCoords, toCoords];

      const response = await fetchWithRetry('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coordinates })
      });

      return await response.json();
    };

    try {
      const geojson = await getRouteGeoJSON(updatedData.from_city, updatedData.to_city, updatedData.via);

      const { error } = await supabase
        .from('routes')
        .update({
          from_city: updatedData.from_city,
          to_city: updatedData.to_city,
          via: updatedData.via || null,
          date: updatedData.date,
          vehicle_type: updatedData.vehicle_type,
          passenger_count: updatedData.passenger_count,
          load_capacity: updatedData.load_capacity,
          phone: updatedData.phone,
          messenger_link: updatedData.messenger_link,
          geojson: geojson
        })
        .eq('id', updatedData.id);

      if (error) {
        console.error('❌ Błąd zapisu zmian:', error.message);
        alert('❌ Nie udało się zapisać zmian.');
      } else {
        alert('✅ Trasa została zaktualizowana.');
        setEditingRoute(null);

        const { data: user } = await supabase.auth.getUser();
        if (user?.user?.id) {
          const { data, error: reloadError } = await supabase
            .from('routes')
            .select('id, geojson, from_city, to_city, date, vehicle_type, passenger_count, load_capacity, phone, messenger_link')
            .eq('user_id', user.user.id)
            .order('created_at', { ascending: false });

          if (!reloadError) {
            setRoutes(data);
          }
        }
      }
    } catch (e) {
      console.error('❌ Błąd:', e.message);
      alert('❌ Błąd podczas pobierania trasy: ' + e.message);
    }
  };

  return (
    <div
      style={{
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'flex-start' }}>
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
              width: 'calc(30% - 20px)',
              maxWidth: '300px',
              minWidth: '260px',
              flex: '1 1 auto',
              boxShadow: hoveredIndex === idx ? '0 0 10px red' : '0 0 5px rgba(0,0,0,0.1)',
              position: 'relative',
              transition: 'box-shadow 0.3s ease',
            }}
          >
            <strong>{r.from_city} → {r.to_city}</strong><br />
            🗓️ {r.date}<br />
            🚚 {r.vehicle_type === 'laweta' ? '🚛 Laweta' : '🚌 Bus'}<br />
            🧝 {r.passenger_count || '-'}<br />
            ⚖️ {r.load_capacity || '-'} kg<br />
            📞 {r.phone || '-'}<br />
            💬 {r.messenger_link ? (
              <a href={r.messenger_link} target="_blank" rel="noopener noreferrer">Messenger</a>
            ) : '-'}

            {hoveredIndex === idx && (
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                display: 'flex',
                gap: '10px',
              }}>
                <button style={btnStyle} onClick={() => handleDelete(r.id)}>🗑️ Usuń</button>
                <button style={btnStyle} onClick={() => setEditingRoute(r)}>✏️ Edytuj</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ height: '600px', marginTop: '30px' }}>
        <MapContainer
          center={[52.0, 19.0]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
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

      {editingRoute && (
        <EditRouteModal
          route={editingRoute}
          onClose={() => setEditingRoute(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

const btnStyle = {
  padding: '4px 10px',
  fontSize: '0.9rem',
  backgroundColor: '#3182ce',
  color: '#fff',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
};
