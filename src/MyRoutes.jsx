import EditRouteModal from './EditRouteModal';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Upewnij się, że jest zaimportowane, jeśli nie było
import './MyRoutes.css'; // Importujemy nowy plik CSS

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

    // !!! Usuwamy lub NIE wywołujemy już funkcji geocode, która używała ORS !!!
    // const geocode = async (place) => { ... };

    const getRouteGeoJSON = async (fromLabel, fromCoords, toLabel, toCoords, viaLabel, viaCoords) => {
        if (!fromCoords || !toCoords) {
            throw new Error('Nie znaleziono współrzędnych dla podanych miejscowości.');
        }

        let coordinates = [fromCoords];
        if (viaCoords) {
            coordinates.push(viaCoords);
        }
        coordinates.push(toCoords);

        // Zapytanie do OpenRouteService o trasę - DODAJEMY instructions: false i geometry_simplify: true
        const response = await fetchWithRetry('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                coordinates: coordinates,
                instructions: false, // <-- DODANE
                geometry_simplify: true // <-- DODANE (opcjonalnie, ale zalecane)
            })
        });

        return await response.json();
    };

    try {
        // Teraz updatedData musi zawierać coords dla from_city, to_city i via (jeśli istnieje)
        const geojson = await getRouteGeoJSON(
            updatedData.from_city_label, // Nowa zmienna dla etykiety
            updatedData.from_city_coords, // Nowa zmienna dla koordynat
            updatedData.to_city_label,
            updatedData.to_city_coords,
            updatedData.via_label,
            updatedData.via_coords
        );

        const { error } = await supabase
            .from('routes')
            .update({
                from_city: updatedData.from_city_label, // Zapisujemy etykietę
                to_city: updatedData.to_city_label,
                via: updatedData.via_label || null,
                date: updatedData.date,
                vehicle_type: updatedData.vehicle_type,
                passenger_count: updatedData.passenger_count,
                load_capacity: updatedData.load_capacity,
                phone: updatedData.phone,
                messenger_link: updatedData.messenger_link,
                geojson: geojson // Nowy geojson
            })
            .eq('id', updatedData.id);

        if (error) {
            console.error('❌ Błąd zapisu zmian:', error.message);
            alert('❌ Nie udało się zapisać zmian.');
        } else {
            alert('✅ Trasa została zaktualizowana.');
            setEditingRoute(null);

            // Odświeżamy trasy z bazy, aby pobrać nowo wygenerowany geojson
            const { data: user } = await supabase.auth.getUser();
            if (user?.user?.id) {
                const { data, error: reloadError } = await supabase
                    .from('routes')
                    .select('id, geojson, from_city, to_city, date, vehicle_type, passenger_count, load_capacity, phone, messenger_link, via') // Dodaj 'via' do selecta
                    .eq('user_id', user.user.id)
                    .order('created_at', { ascending: false });

                if (!reloadError) {
                    setRoutes(data);
                }
            }
        }
    } catch (e) {
        console.error('❌ Błąd podczas aktualizacji trasy:', e.message);
        alert('❌ Wystąpił błąd podczas aktualizacji trasy: ' + e.message);
    }
};

  return (
    <div className="my-routes-container"> {/* Dodana klasa */}
      <div className="routes-grid"> {/* Nowa klasa do siatki kart */}
        {routes.map((r, idx) => (
          <div
            key={r.id}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="route-card" /* Nowa klasa dla pojedynczej karty */
            style={{ boxShadow: hoveredIndex === idx ? '0 0 10px red' : '0 0 5px rgba(0,0,0,0.1)' }}
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
              <div className="card-buttons-container"> {/* Nowa klasa dla kontenera przycisków */}
                <button className="card-button delete-button" onClick={() => handleDelete(r.id)}>🗑️ Usuń</button> {/* Nowe klasy */}
                <button className="card-button edit-button" onClick={() => setEditingRoute(r)}>✏️ Edytuj</button> {/* Nowe klasy */}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="my-routes-map-container"> {/* Nowa klasa dla kontenera mapy */}
        <MapContainer
          center={[52.0, 19.0]}
          zoom={6}
          className="my-routes-map" /* Nowa klasa dla mapy */
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {routes.map((r, idx) => (
            r.geojson && r.geojson.features && r.geojson.features[0] && ( /* Sprawdź, czy geojson istnieje i ma cechy */
              <Polyline
                key={r.id}
                positions={r.geojson.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])}
                pathOptions={{
                  color: hoveredIndex === idx ? 'red' : 'blue',
                  weight: hoveredIndex === idx ? 6 : 4,
                }}
              />
            )
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
