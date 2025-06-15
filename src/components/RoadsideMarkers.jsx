// src/components/RoadsideMarkers.jsx

import { useEffect, useState, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

// ✅ Funkcja pomocnicza do obliczania odległości między dwoma punktami (pozostaje bez zmian)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- FUNKCJA DEBOUNCE (DODANA) ---
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};
// --- KONIEC FUNKCJI DEBOUNCE ---

const towIcon = new L.Icon({
  iconUrl: '/icons/pomoc-drogowa.png',
  iconSize: [60, 100], // Twoje preferowane rozmiary
  iconAnchor: [25, 80], // Twoje preferowane zakotwiczenie
  popupAnchor: [0, -110], // Twoje preferowane zakotwiczenie popupa
  className: 'custom-marker-icon'
});

export default function RoadsideMarkers() {
  const [markers, setMarkers] = useState([]);
  const popupRefs = useRef({});
  const hoverTimeout = useRef(null);
  const map = useMap();

  useEffect(() => {
    const fetchMarkers = async () => {
      // Pobieranie granic widocznego obszaru mapy
      const bounds = map.getBounds();
      const northEast = bounds.getNorthEast(); // Górny prawy róg (lat, lng)
      const southWest = bounds.getSouthWest(); // Dolny lewy róg (lat, lng)

      const { data, error } = await supabase
        .from('users_extended')
        .select('*')
        .eq('is_pomoc_drogowa', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        // Filtrowanie po widocznych granicach mapy na poziomie Supabase (PostgreSQL)
        .gte('latitude', southWest.lat)    // latitude >= południowa granica
        .lte('latitude', northEast.lat)    // latitude <= północna granica
        .gte('longitude', southWest.lng)   // longitude >= zachodnia granica
        .lte('longitude', northEast.lng);  // longitude <= wschodnia granica


      if (!error) {
        // Po pobraniu z Supabase, filtrujemy dalej po Twoim zasięgu 50 km od centrum
        const center = map.getCenter();
        const filtered = data.filter((item) => {
          const distance = getDistanceFromLatLonInKm(
            center.lat,
            center.lng,
            item.latitude,
            item.longitude
          );
          return distance <= 50; // Twój oryginalny filtr 50 km
        });
        setMarkers(filtered);
      } else {
        console.error("Błąd pobierania markerów pomocy drogowej:", error.message);
      }
    };

    // Stworzenie funkcji z debouncingiem
    const debouncedFetchMarkers = debounce(fetchMarkers, 500); // Opóźnienie 500ms

    // Wywołaj raz przy pierwszym załadowaniu komponentu
    fetchMarkers();

    // Nasłuchiwanie na koniec ruchu mapy z debouncingiem
    map.on('moveend', debouncedFetchMarkers);
    return () => {
      map.off('moveend', debouncedFetchMarkers);
    };
  }, [map]); // Zależność tylko od obiektu mapy, aby efekt nie uruchamiał się niepotrzebnie


  const handleMouseOver = (id) => {
    clearTimeout(hoverTimeout.current);
    const popup = popupRefs.current[id];
    if (popup) popup.openOn(map);
  };

  const handleMouseOut = (id) => {
    hoverTimeout.current = setTimeout(() => {
      const popup = popupRefs.current[id];
      if (popup) map.closePopup(popup);
    }, 2000);
  };

  return (
    <>
      {markers.map((item) => (
        <Marker
          key={item.id}
          position={[item.latitude, item.longitude]}
          icon={towIcon}
          eventHandlers={{
            mouseover: () => handleMouseOver(item.id),
            mouseout: () => handleMouseOut(item.id)
          }}
        >
          <Popup
            ref={(ref) => {
              if (ref) popupRefs.current[item.id] = ref._source._popup;
            }}
            autoPan={true}
            autoClose={false}
            closeOnClick={false}
            closeButton={true}
          >
            <div style={{ pointerEvents: 'auto' }}>
              <strong style={{ fontSize: '16px', lineHeight: '1.6' }}>🚨 POMOC DROGOWA</strong><br />
              {/* Ulepszony popup: nazwa firmy, adres, klikalny telefon */}
              <span style={{ fontSize: '14px', lineHeight: '1.5' }}>{item.company_name || item.roadside_slug}</span><br />
              <span style={{ fontSize: '14px', lineHeight: '1.5' }}>{item.roadside_street} {item.roadside_number}, {item.roadside_city}</span><br />
              <span style={{ fontSize: '14px', lineHeight: '1.5' }}>
                📞 <a href={`tel:${item.roadside_phone}`} style={{ color: '#007bff', textDecoration: 'underline' }}>
                  {item.roadside_phone}
                </a>
              </span><br />
              <Link
                to={`/pomoc-drogowa/${item.roadside_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '14px', lineHeight: '1.5', color: '#007bff', textDecoration: 'underline' }}
              >
                👉 Zobacz stronę firmową
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}