// src/PomocDrogowaProfil.jsx

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import './PomocDrogowaProfil.css';

const towIcon = new L.Icon({
  iconUrl: '/icons/pomoc-drogowa.png',
  iconSize: [90, 120],
  iconAnchor: [45, 120],
  popupAnchor: [0, -120],
  className: 'custom-marker-icon'
});

export default function PomocDrogowaProfil() {
  const { slug } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false); // Potrzebne do trybu edycji
  const [editingSection, setEditingSection] = useState(null); // Nowy stan do zarządzania sekcjami edycji
  
  // --- NOWE STANY DLA GALERII I LIGHTBOXA ---
  const [showLightbox, setShowLightbox] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newImages, setNewImages] = useState([]); // Przechowuje pliki do przesłania
  const [uploadingImages, setUploadingImages] = useState(false); // Stan ładowania plików
  // --- KONIEC NOWYCH STANÓW ---

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser(); // Pobieramy info o zalogowanym użytkowniku
        const { data, error } = await supabase
          .from('users_extended')
          .select('*') // Pobieramy wszystkie kolumny, w tym image_urls, roadside_description
          .eq('roadside_slug', slug)
          .eq('is_pomoc_drogowa', true)
          .single();

        if (error) throw error;

        // --- PARSOWANIE DANYCH JSON (jak w PublicProfile.jsx) ---
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
        // --- KONIEC PARSOWANIA ---

        setProfileData(data);
        setIsOwner(userData?.user?.id === data.id); // Sprawdzamy, czy zalogowany użytkownik jest właścicielem profilu
      } catch (error) {
        console.error("Błąd ładowania profilu pomocy drogowej:", error.message);
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  // Funkcja getFleetIcon (tak jak w PublicProfile)
  const getFleetIcon = (type) => {
    switch (type) {
      case 'auto osobowe': return '🚗';
      case 'bus': return '🚌';
      case 'autolaweta': return '🛻';
      case 'przyczepa towarowa': return '🚛';
      case 'przyczepa laweta': return '🚜';
      case 'przyczepa laweta podwójna': return '🚚';
      case 'pojazd ciężarowy': return '🚚';
      case 'naczepa ciężarowa': return '🚛';
      case 'przyczepa ciężarowa': return '🚛';
      case 'dostawczak': return '🚌';
      default: return '❓';
    }
  };

  // --- FUNKCJE OBSŁUGUJĄCE ZDJĘCIA (SKOPIOWANE Z PublicProfile.jsx) ---
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(`Plik ${file.name} jest za duży (max 5MB).`);
        return false;
      }
      return true;
    });

    if ((profileData.image_urls || []).length + newImages.length + validFiles.length > 5) {
      alert("Możesz mieć maksymalnie 5 zdjęć w galerii.");
      return;
    }
    setNewImages(prev => [...prev, ...validFiles]);
  };

  const handleRemoveNewImage = (indexToRemove) => {
    setNewImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleRemoveExistingImage = (indexToRemove) => {
    setProfileData(prev => {
      const updatedImageUrls = prev.image_urls.filter((_, index) => index !== indexToRemove);
      return { ...prev, image_urls: updatedImageUrls };
    });
  };

  const handleSaveImages = async () => {
    setUploadingImages(true);
    let updatedImageUrls = [...(profileData.image_urls || [])]; // Użyj profileData zamiast profile

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== profileData.id) throw new Error("Brak autoryzacji do edycji."); // Użyj profileData.id

      for (const file of newImages) {
        const formData = new FormData();
        formData.append('userId', user.id);
        formData.append('file', file);

        const response = await fetch('https://serwer2595576.home.pl/upload.php', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        if (result.success) {
          updatedImageUrls.push(result.url);
        } else {
          throw new Error(result.error || 'Upload error');
        }
      }

      const { error: updateError } = await supabase
        .from('users_extended')
        .update({ image_urls: updatedImageUrls })
        .eq('id', user.id); // Upewnij się, że aktualizujesz właściwy profil

      if (updateError) throw updateError;

      setProfileData(prev => ({ ...prev, image_urls: updatedImageUrls }));
      setNewImages([]);
      setEditingSection(null);
      alert('Zdjęcia zapisane pomyślnie!');
    } catch (error) {
      console.error('Błąd zapisu zdjęć:', error.message);
      alert(`❌ Błąd zapisu zdjęć: ${error.message}`);
    } finally {
      setUploadingImages(false);
    }
  };
  // --- KONIEC FUNKCJI OBSŁUGUJĄCYCH ZDJĘCIA ---

  // --- FUNKCJE OBSŁUGUJĄCE LIGHTBOX (SKOPIOWANE Z PublicProfile.jsx) ---
  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setShowLightbox(true);
    document.body.style.overflow = 'hidden'; // Zablokuj scrollowanie strony
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    document.body.style.overflow = 'unset'; // Odblokuj scrollowanie
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      (prevIndex + 1) % profileData.image_urls.length
    );
  };

  const goToPrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      (prevIndex - 1 + profileData.image_urls.length) % profileData.image_urls.length
    );
  };
  // --- KONIEC FUNKCJI OBSŁUGUJĄCYCH LIGHTBOX ---


  if (loading) {
    return (
      <>
        <Navbar />
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
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl text-red-600">❌ Nie znaleziono profilu pomocy drogowej lub jest nieaktywny.</p>
        </div>
      </>
    );
  }

  const imageUrls = Array.isArray(profileData.image_urls) ? profileData.image_urls : [];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200">
          
          {/* Nagłówek główny i dane podstawowe (sekcja wizytówki) */}
          <div className="text-center mb-8 pb-4 border-b border-gray-200">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">{profileData.company_name || profileData.roadside_slug || 'Profil Pomocy Drogowej'}</h1>
            <p className="text-gray-600 text-lg mb-1">
              <strong>Adres:</strong> {profileData.roadside_street} {profileData.roadside_number}, {profileData.roadside_city}, {profileData.country || 'Polska'}
            </p>
            <p className="text-blue-600 text-xl font-semibold">📞 {profileData.roadside_phone || 'Brak telefonu'}</p>
          </div>

          {/* Sekcja Opisu Usługi Pomocy Drogowej */}
          {profileData.roadside_description && (
            <div className="mb-8 pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">O naszych usługach</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {profileData.roadside_description}
              </p>
            </div>
          )}

          {/* Sekcja Pojazdy we flocie (włączona) */}
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

          {/* Sekcja Najczęstsze trasy (włączona) */}
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

          {/* Sekcja Galerii zdjęć (włączona) */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Galeria zdjęć</h2>
              {isOwner && ( // Pokaż przycisk "Edytuj" tylko jeśli jest właścicielem
                <button
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                  onClick={() => setEditingSection('images')}
                >
                  ✏ Edytuj
                </button>
              )}
            </div>

            {editingSection === 'images' && isOwner ? (
              // Tryb edycji zdjęć (dla właściciela)
              <div className="space-y-4">
                <p className="text-gray-600">Dodaj do 5 zdjęć (JPG, PNG). Maksymalny rozmiar 5MB na zdjęcie.</p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg, image/png"
                  onChange={handleImageUpload}
                  className="w-full p-2 border rounded-lg"
                />
                {newImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                    {newImages.map((file, index) => (
                      <div key={`new-${index}`} className="relative group overflow-hidden rounded-lg shadow-md aspect-w-1 aspect-h-1 w-full">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Nowe zdjęcie ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleRemoveNewImage(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Istniejące zdjęcia */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                  {(profileData.image_urls || []).map((url, index) => (
                    <div key={`existing-${index}`} className="relative group overflow-hidden rounded-lg shadow-md aspect-w-1 aspect-h-1 w-full">
                      <img
                        src={url}
                        alt={`Zdjęcie ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveExistingImage(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveImages}
                  disabled={uploadingImages}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg w-full text-lg font-semibold transition-colors duration-200"
                >
                  {uploadingImages ? 'Zapisywanie zdjęć...' : 'Zapisz zdjęcia'}
                </button>
                <button
                  onClick={() => {
                    setEditingSection(null);
                    setNewImages([]); // Czyścimy nowe zdjęcia po anulowaniu
                  }}
                  className="mt-2 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg w-full text-lg font-semibold transition-colors duration-200"
                >
                  Anuluj
                </button>
              </div>
            ) : (
              // Tryb wyświetlania zdjęć (dla wszystkich)
              <div>
                {(imageUrls.length > 0) ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imageUrls.map((url, index) => (
                      <div
                        key={index}
                        className="w-full h-auto aspect-square overflow-hidden rounded-lg shadow-md cursor-pointer transform transition-transform duration-200 hover:scale-105"
                        onClick={() => openLightbox(index)} // Otwieranie lightboxa
                      >
                        <img src={url} alt={`Galeria ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Brak zdjęć w galerii.</p>
                )}
              </div>
            )}
          </div>

          {/* Lightbox dla zdjęć (włączony) */}
          {showLightbox && profileData && profileData.image_urls && profileData.image_urls.length > 0 && (
            <div
              className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
              onClick={closeLightbox} // Kliknięcie poza obrazem zamyka lightbox
            >
              <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}> {/* Zapobieganie zamknięciu przy kliknięciu na obraz */}
                <button
                  onClick={closeLightbox}
                  className="absolute top-4 right-4 text-white text-3xl font-bold bg-gray-800 bg-opacity-70 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-100 transition-colors"
                >
                  &times;
                </button>

                <img
                  src={profileData.image_urls[currentImageIndex]}
                  alt={`Zdjęcie ${currentImageIndex + 1}`}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-xl"
                />

                {profileData.image_urls.length > 1 && (
                  <>
                    <button
                      onClick={goToPrevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-5xl bg-gray-800 bg-opacity-70 rounded-full w-14 h-14 flex items-center justify-center hover:bg-opacity-100 transition-colors"
                    >
                      &larr;
                    </button>
                    <button
                      onClick={goToNextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-5xl bg-gray-800 bg-opacity-70 rounded-full w-14 h-14 flex items-center justify-center hover:bg-opacity-100 transition-colors"
                    >
                      &rarr;
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Sekcja Mapy */}
          {profileData.latitude && profileData.longitude && (
            <div className="w-full h-[450px] rounded-xl overflow-hidden shadow-md border border-gray-200 mt-8"> {/* Dodany margines od góry */}
              <MapContainer center={[profileData.latitude, profileData.longitude]} zoom={13} className="h-full w-full">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <Marker position={[profileData.latitude, profileData.longitude]} icon={towIcon} />
              </MapContainer>
            </div>
          )}
        </div>
      </div>
    </>
  );
}