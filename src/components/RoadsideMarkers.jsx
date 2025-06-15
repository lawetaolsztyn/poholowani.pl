// src/components/RoadsideMarkers.jsx

import { useEffect, useState, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

// ✅ Funkcja pomocnicza do obliczania odległości między dwoma punktami
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

const towIcon = new L.Icon({
  iconUrl: '/icons/pomoc-drogowa.png',
  iconSize: [70, 110],
  iconAnchor: [35, 90],
  popupAnchor: [0, -110],
  className: 'custom-marker-icon'
});

export default function RoadsideMarkers() {
  const [markers, setMarkers] = useState([]);
  const popupRefs = useRef({});
  const hoverTimeout = useRef(null);
  const map = useMap();

 useEffect(() => {
  const fetchMarkers = async () => {
    const { data, error } = await supabase
      .from('users_extended')
      .select('*')
      .eq('is_pomoc_drogowa', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (!error) {
      const center = map.getCenter();
      const filtered = data.filter((item) => {
        const distance = getDistanceFromLatLonInKm(
          center.lat,
          center.lng,
          item.latitude,
          item.longitude
        );
        return distance <= 50;
      });
      setMarkers(filtered);
    }
  };

  fetchMarkers();

  const onMove = () => {
    fetchMarkers();
  };

  map.on('moveend', onMove);
  return () => {
    map.off('moveend', onMove);
  };
}, [map]);


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
<span style={{ fontSize: '14px', lineHeight: '1.5' }}>{item.company_name || item.roadside_slug}</span><br /> {/* Może nazwa firmy zamiast sluga */}
<span style={{ fontSize: '14px', lineHeight: '1.5' }}>{item.roadside_street} {item.roadside_number}, {item.roadside_city}</span><br />
<span style={{ fontSize: '14px', lineHeight: '1.5' }}>📞 <a href={`tel:${item.roadside_phone}`} style={{ color: '#007bff', textDecoration: 'underline' }}>{item.roadside_phone}</a></span><br />
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
