// src/PomocDrogowaProfil.jsx

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
// Upewnij się, że masz ten plik CSS, nawet jeśli jest na razie pusty
import './PomocDrogowaProfil.css'; 

const towIcon = new L.Icon({
  iconUrl: '/icons/pomoc-drogowa.png', // bardziej kontrastowa ikona
  iconSize: [90, 120], // większy rozmiar dla lepszej widoczności
  iconAnchor: [45, 120],
  popupAnchor: [0, -120],
  className: 'custom-marker-icon' // można dodać własne style jeśli potrzeba
});

export default function PomocDrogowaProfil() {
  const { slug } = useParams();
  const [profileData, setProfileData] = useState(null); // Zmieniono nazwę stanu dla jasności
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users_extended')
          .select('*') // Pobieramy wszystkie kolumny, w tym roadside_description
          .eq('roadside_slug', slug)
          .eq('is_pomoc_drogowa', true)
          .single();

        if (error) throw error;

        // Tutaj dodasz parsowanie innych pól JSON, jeśli je masz (jak flota, zdjęcia, trasy),
        // tak jak to było w rozbudowanej wersji PublicProfile.jsx, aby je wyświetlić.
        // Na potrzeby tej wersji, te pola mogą być nieużywane, ale parsowanie nie zaszkodzi.
        if (typeof data.fleet_flags === 'string') {
          try { data.fleet_flags = JSON.parse(data.fleet_flags); } catch { data.fleet_flags = []; }
        } else if (!Array.isArray(data.fleet_flags)) {
          data.fleet_flags = [];
        }

        if (typeof data.image_urls === 'string') {
          try { data.image_urls = JSON.parse(data.image_urls); } catch { data.image_urls = []; }
        } else if (!Array.isArray(data.image_urls)) {
          data.image_urls = [];
        }

        if (typeof data.routes === 'string') {
          try { data.routes = JSON.parse(data.routes); } catch { data.routes = []; }
        } else if (!Array.isArray(data.routes)) {
          data.routes = [];
        }

        setProfileData(data);
      } catch (error) {
        console.error("Błąd ładowania profilu pomocy drogowej:", error.message);
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <>
        <Navbar />
        {/* Centrowanie komunikatu ładowania z Tailwind CSS */}
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl text-gray-700">⏳ Ładowanie profilu...</p>
        </div>
      </>
    );
  }

  if (!profileData) {
    return (
      <>
        <Navbar />
        {/* Centrowanie komunikatu o błędzie z Tailwind CSS */}
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl text-red-600">❌ Nie znaleziono profilu pomocy drogowej lub jest nieaktywny.</p>
        </div>
      </>
    );
  }

  // Upewniamy się, że profileData.image_urls jest tablicą
  const imageUrls = Array.isArray(profileData.image_urls) ? profileData.image_urls : [];


  return (
    <>
      <Navbar />
      {/* Główny kontener strony z tłem i paddingiem pionowym */}
      <div className="min-h-screen bg-gray-100 py-8">
        {/* Kontener dla całego profilu, z cieniem, zaokrągleniami, wyśrodkowaniem i paddingiem */}
        <div className="container mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200">
          
          {/* Nagłówek główny i dane podstawowe (sekcja wizytówki) */}
          <div className="text-center mb-8 pb-4 border-b border-gray-200">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🚨 {profileData.company_name || profileData.roadside_slug || 'Profil Pomocy Drogowej'}</h1>
            <p className="text-gray-600 text-lg mb-1">
              <strong>Adres:</strong> {profileData.roadside_street} {profileData.roadside_number}, {profileData.roadside_city}, {profileData.country || 'Polska'}
            </p>
            <p className="text-blue-600 text-xl font-semibold">📞 {profileData.roadside_phone || 'Brak telefonu'}</p>
          </div>

          {/* Sekcja Opisu Usługi Pomocy Drogowej */}
          {profileData.roadside_description && ( // Wyświetl tylko jeśli opis istnieje
            <div className="mb-8 pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">O naszych usługach</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {profileData.roadside_description}
              </p>
            </div>
          )}

          {/* Sekcja Mapy */}
          {profileData.latitude && profileData.longitude && (
            <div className="w-full h-[400px] rounded-xl overflow-hidden shadow-md border border-gray-200">
              <MapContainer center={[profileData.latitude, profileData.longitude]} zoom={13} className="h-full w-full">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <Marker position={[profileData.latitude, profileData.longitude]} icon={towIcon} />
              </MapContainer>
            </div>
          )}

          {/* Tutaj możesz dodać inne sekcje, takie jak flota, trasy, galeria, jeśli chcesz rozbudować ten profil: */}
          {/*
          // PRZYKŁAD: Sekcja Pojazdy we flocie
          {profileData.fleet_flags && profileData.fleet_flags.length > 0 && (
            <div className="mb-8 pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Nasza flota</h2>
              <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {profileData.fleet_flags.map((flag, index) => (
                  <li key={index} className="flex items-center text-gray-700 text-lg">
                    {getFleetIcon(flag)} <span className="ml-2">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          // PRZYKŁAD: Sekcja Najczęstsze trasy
          {profileData.routes && profileData.routes.length > 0 && (
            <div className="mb-8 pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Najczęstsze trasy</h2>
              <ul className="list-disc list-inside p-0 m-0">
                {profileData.routes.map((route, index) => (
                  <li key={index} className="text-gray-700 mb-1 text-lg">{route}</li>
                ))}
              </ul>
            </div>
          )}

          // PRZYKŁAD: Sekcja Galerii zdjęć
          {imageUrls.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-3 border-b pb-2">Galeria</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className="w-full h-auto aspect-square overflow-hidden rounded-lg shadow-md cursor-pointer transform transition-transform duration-200 hover:scale-105"
                    // onClick={() => openLightbox(index)} // Dodaj logikę lightboxa jeśli chcesz
                  >
                    <img src={url} alt={`Galeria ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
          */}

        </div>
      </div>
    </>
  );
}