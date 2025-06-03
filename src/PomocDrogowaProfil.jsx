// src/PomocDrogowaProfil.jsx

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';

const towIcon = new L.Icon({
  iconUrl: '/icons/pomoc-drogowa.png', // bardziej kontrastowa ikona
 iconSize: [90, 120], // większy rozmiar dla lepszej widoczności
  iconAnchor: [45, 120],
  popupAnchor: [0, -120],
  className: 'custom-marker-icon' // można dodać własne style jeśli potrzeba
});

export default function PomocDrogowaProfil() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('users_extended')
        .select('*')
        .eq('roadside_slug', slug)
        .eq('is_pomoc_drogowa', true)
        .single();

      if (!error) setData(data);
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  if (loading) return <p style={{ padding: '20px' }}>⏳ Ładowanie profilu...</p>;
  if (!data) return <p style={{ padding: '20px', color: 'red' }}>❌ Nie znaleziono pomocy drogowej.</p>;

  return (
    <>
      <Navbar />
      <div style={containerStyle}>
        <h1>🚨 {data.roadside_slug}</h1>
        <p><strong>📍 Adres:</strong> {data.roadside_street} {data.roadside_number}, {data.roadside_city}</p>
        <p><strong>📞 Telefon:</strong> {data.roadside_phone}</p>
        {data.latitude && data.longitude && (
          <div style={{ height: '400px', marginTop: '30px' }}>
            <MapContainer center={[data.latitude, data.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <Marker position={[data.latitude, data.longitude]} icon={towIcon} />
            </MapContainer>
          </div>
        )}
      </div>
    </>
  );
}

const containerStyle = {
  maxWidth: '700px',
  margin: '30px auto',
  padding: '30px',
  backgroundColor: '#fff',
  borderRadius: '12px',
  boxShadow: '0 0 15px rgba(0,0,0,0.1)'
};
