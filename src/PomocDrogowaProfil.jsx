// src/PomocDrogowaProfil.jsx

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import './PomocDrogowaProfil.css'; // Upewnij się, że masz ten plik CSS

const towIcon = new L.Icon({
  iconUrl: '/icons/pomoc-drogowa.png',
  iconSize: [80, 120],
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

  // --- STANY DLA GALERII I LIGHTBOXA ---
  const [showLightbox, setShowLightbox] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newImages, setNewImages] = useState([]); // Przechowuje pliki do przesłania
  const [uploadingImages, setUploadingImages] = useState(false); // Stan ładowania plików
  // --- KONIEC STANÓW GALERII I LIGHTBOXA ---

  // --- NOWE STANY DLA EDYCJI DANYCH FIRMOWYCH (DODANE) ---
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editRoadsideStreet, setEditRoadsideStreet] = useState('');
  const [editRoadsideNumber, setEditRoadsideNumber] = useState('');
  const [editRoadsideCity, setEditRoadsideCity] = useState('');
  const [editRoadsidePhone, setEditRoadsidePhone] = useState('');
  // --- STAN DLA ZGODY NA PUBLICZNY PROFIL POMOCY DROGOWEJ ---
  const [consentPublicRoadsideProfile, setConsentPublicRoadsideProfile] = useState(false);
  // --- KONIEC NOWYCH STANÓW DANYCH FIRMOWYCH ---

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from('users_extended')
          .select('*') // Pobieramy wszystkie kolumny, w tym roadside_image_urls i roadside_description
          .eq('roadside_slug', slug)
          .eq('is_pomoc_drogowa', true)
          .single();

        if (error) throw error;

        // --- PARSOWANIE DANYCH JSON (dla image_urls i roadside_image_urls) ---
        if (typeof data.image_urls === 'string') {
          try { data.image_urls = JSON.parse(data.image_urls); } catch { data.image_urls = []; }
        } else if (!Array.isArray(data.image_urls)) {
          data.image_urls = [];
        }

        if (typeof data.roadside_image_urls === 'string') {
          try { data.roadside_image_urls = JSON.parse(data.roadside_image_urls); } catch { data.roadside_image_urls = []; }
        } else if (!Array.isArray(data.roadside_image_urls)) {
          data.roadside_image_urls = [];
        }
        // --- KONIEC PARSOWANIA ---

        setProfileData(data);
        setIsOwner(userData?.user?.id === data.id);

        // --- INICJALIZACJA STANÓW DANYMI Z PROFILU (NOWE) ---
        if (data) {
          setEditCompanyName(data.company_name || '');
          setEditRoadsideStreet(data.roadside_street || '');
          setEditRoadsideNumber(data.roadside_number || '');
          setEditRoadsideCity(data.roadside_city || '');
          setEditRoadsidePhone(data.roadside_phone || '');
          // Inicjalizuj stan zgody na podstawie danych z bazy (lub domyślnie, jeśli pole nie istnieje)
          setConsentPublicRoadsideProfile(data.has_accepted_roadside_public_terms || false); // Załóżmy, że masz takie pole w bazie
        }
        // --- KONIEC INICJALIZACJI ---

      } catch (error) {
        console.error("Błąd ładowania profilu pomocy drogowej:", error.message);
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  // Funkcja getFleetIcon (z PublicProfile)
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

  // --- FUNKCJE OBSŁUGUJĄCE ZDJĘCIA (BEZ ZMIAN) ---
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(`Plik ${file.name} jest za duży (max 5MB).`);
        return false;
      }
      return true;
    });

    if ((profileData.roadside_image_urls || []).length + newImages.length + validFiles.length > 5) {
      alert("Możesz mieć maksymalnie 5 zdjęć w galerii pomocy drogowej.");
      return;
    }
    setNewImages(prev => [...prev, ...validFiles]);
  };

  const handleRemoveNewImage = (indexToRemove) => {
    setNewImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleRemoveExistingImage = (indexToRemove) => {
    setProfileData(prev => {
      const updatedImageUrls = (prev.roadside_image_urls || []).filter((_, index) => index !== indexToRemove);
      return { ...prev, roadside_image_urls: updatedImageUrls };
    });
  };

  const handleSaveImages = async () => {
    setUploadingImages(true);
    let updatedImageUrls = [...(profileData.roadside_image_urls || [])];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== profileData.id) throw new Error("Brak autoryzacji do edycji.");

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
        .update({ roadside_image_urls: updatedImageUrls })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfileData(prev => ({ ...prev, roadside_image_urls: updatedImageUrls }));
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

  // --- FUNKCJE OBSŁUGUJĄCE LIGHTBOX (BEZ ZMIAN) ---
  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setShowLightbox(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    document.body.style.overflow = 'unset';
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      (prevIndex + 1) % profileData.roadside_image_urls.length
    );
  };

  const goToPrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      (prevIndex - 1 + profileData.roadside_image_urls.length) % profileData.roadside_image_urls.length
    );
  };
  // --- KONIEC FUNKCJI OBSŁUGUJĄCYCH LIGHTBOX ---

  // --- NOWA FUNKCJA DO ZAPISU GŁÓWNYCH DANYCH FIRMOWYCH (DODANA) ---
  const handleSaveMainInfo = async () => {
    if (!profileData) return;

    // Walidacja zgody
    if (!consentPublicRoadsideProfile) {
      alert('Aby zapisać dane profilu Pomocy Drogowej, musisz wyrazić zgodę na ich publiczne udostępnienie.');
      return;
    }

    setLoading(true); // Użyj isSavingMainInfo, jeśli wolisz bardziej granularny stan
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== profileData.id) throw new Error("Brak autoryzacji do edycji.");

      const updatePayload = {
        company_name: editCompanyName,
        roadside_street: editRoadsideStreet,
        roadside_number: editRoadsideNumber,
        roadside_city: editRoadsideCity,
        roadside_phone: editRoadsidePhone,
        has_accepted_roadside_public_terms: consentPublicRoadsideProfile, // Zapisz stan zgody w bazie
      };

      const { error } = await supabase
        .from('users_extended')
        .update(updatePayload)
        .eq('id', user.id);

      if (error) throw error;

      setProfileData(prev => ({ ...prev, ...updatePayload })); // Aktualizujemy lokalny stan
      setEditingSection(null); // Wyjdź z trybu edycji
      alert('Dane firmy zapisane pomyślnie!');
    } catch (error) {
      console.error('Błąd zapisu danych firmy:', error.message);
      alert(`❌ Błąd zapisu danych firmy: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  // --- KONIEC NOWEJ FUNKCJI ---


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

  const roadsideImageUrls = Array.isArray(profileData.roadside_image_urls) ? profileData.roadside_image_urls : [];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200">

          {/* Nagłówek główny i dane podstawowe (sekcja wizytówki) */}
          <div className="text-center mb-8 pb-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4"> {/* Dodane dla przycisku edycji */}
                {/* Tytuł profilu Pomocy Drogowej */}
                {editingSection === 'mainInfo' && isOwner ? (
                    <h1 className="text-4xl font-bold text-gray-800">Edycja danych firmy</h1>
                ) : (
                    <h1 className="text-4xl font-bold text-gray-800">{profileData.company_name || profileData.roadside_slug || 'Profil Pomocy Drogowej'}</h1>
                )}

                {/* Przycisk Edytuj/Zapisz dla danych głównych */}
                {isOwner && (
                    editingSection === 'mainInfo' ? (
                        // Przycisk "Zapisz" i "Anuluj" są w bloku edycji, więc tutaj tylko puste miejsce
                        null
                    ) : (
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-base font-semibold transition-colors duration-200"
                            onClick={() => setEditingSection('mainInfo')}
                        >
                            ✏ Edytuj
                        </button>
                    )
                )}
            </div>

            {/* --- SEKCJA EDYCJI/WYŚWIETLANIA DANYCH GŁÓWNYCH (ZMIENIONA) --- */}
            {editingSection === 'mainInfo' && isOwner ? (
                // Tryb edycji danych głównych
                <div className="space-y-4 text-left"> {/* text-left dla formularza */}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="company_name">Nazwa firmy:</label>
                        <input
                            type="text"
                            id="company_name"
                            value={editCompanyName}
                            onChange={(e) => setEditCompanyName(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Nazwa Twojej firmy"
                            disabled={!consentPublicRoadsideProfile} // Wyłącz, jeśli zgoda nie jest zaznaczona
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="roadside_street">Ulica:</label>
                        <input
                            type="text"
                            id="roadside_street"
                            value={editRoadsideStreet}
                            onChange={(e) => setEditRoadsideStreet(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Ulica"
                            disabled={!consentPublicRoadsideProfile} // Wyłącz, jeśli zgoda nie jest zaznaczona
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="w-1/3">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="roadside_number">Numer:</label>
                            <input
                                type="text"
                                id="roadside_number"
                                value={editRoadsideNumber}
                                onChange={(e) => setEditRoadsideNumber(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="Nr budynku"
                                disabled={!consentPublicRoadsideProfile} // Wyłącz, jeśli zgoda nie jest zaznaczona
                            />
                        </div>
                        <div className="w-2/3">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="roadside_city">Miasto:</label>
                            <input
                                type="text"
                                id="roadside_city"
                                value={editRoadsideCity}
                                onChange={(e) => setEditRoadsideCity(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="Miasto"
                                disabled={!consentPublicRoadsideProfile} // Wyłącz, jeśli zgoda nie jest zaznaczona
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="roadside_phone">Numer telefonu:</label>
                        <input
                            type="tel"
                            id="roadside_phone"
                            value={editRoadsidePhone}
                            onChange={(e) => setEditRoadsidePhone(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Numer telefonu"
                            disabled={!consentPublicRoadsideProfile} // Wyłącz, jeśli zgoda nie jest zaznaczona
                        />
                    </div>

                    {/* --- TUTAJ WSTAWIONY CHECKBOX ZGODY --- */}
                    <div className="form-field public-profile-consent">
                      <label htmlFor="consentPublicRoadsideProfile">
                        <input
                          type="checkbox"
                          id="consentPublicRoadsideProfile"
                          name="consentPublicRoadsideProfile"
                          checked={consentPublicRoadsideProfile}
                          onChange={(e) => setConsentPublicRoadsideProfile(e.target.checked)}
                          className="consent-checkbox"
                        />
                        Zgadzam się na publiczne udostępnienie danych mojego profilu Pomocy Drogowej (nazwa firmy, adres, numer telefonu) w celu świadczenia usług w serwisie.
                      </label>
                      <small style={{ marginTop: '5px', fontSize: '0.8em', color: '#666' }}>
                        Dane te będą widoczne dla innych użytkowników serwisu. Bez tej zgody Twój profil Pomocy Drogowej nie będzie publiczny.
                        Szczegóły przetwarzania danych znajdziesz w naszej <a href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer">Polityce Prywatności</a>.
                      </small>
                    </div>
                    {/* --- KONIEC CHECKBOXA ZGODY --- */}

                    <button
                        onClick={handleSaveMainInfo}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-base font-semibold transition-colors duration-200 w-full"
                        disabled={!consentPublicRoadsideProfile} // Wyłącz przycisk zapisu, jeśli zgoda nie jest zaznaczona
                    >
                        Zapisz dane firmy
                    </button>
                    <button
                        onClick={() => {
                            setEditingSection(null);
                            // Opcjonalnie zresetuj pola do wartości oryginalnych po anulowaniu
                            setEditCompanyName(profileData.company_name || '');
                            setEditRoadsideStreet(profileData.roadside_street || '');
                            setEditRoadsideNumber(profileData.roadside_number || '');
                            setEditRoadsideCity(profileData.roadside_city || '');
                            setEditRoadsidePhone(profileData.roadside_phone || '');
                            setConsentPublicRoadsideProfile(profileData.has_accepted_roadside_public_terms || false); // Zresetuj zgodę
                        }}
                        className="mt-2 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg text-base font-semibold transition-colors duration-200 w-full"
                    >
                        Anuluj
                    </button>
                </div>
            ) : (
                // Tryb wyświetlania danych głównych
                <>
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">{profileData.company_name || profileData.roadside_slug || 'Profil Pomocy Drogowej'}</h1>
                    <p className="text-gray-600 text-lg mb-1">
                        <strong>Adres:</strong> {profileData.roadside_street} {profileData.roadside_number}, {profileData.roadside_city}, {profileData.country || 'Polska'}
                    </p>
                    <p className="text-blue-600 text-xl font-semibold">
                        📞 {profileData.roadside_phone ? (
                            <a href={`tel:${profileData.roadside_phone}`} className="hover:underline">
                                {profileData.roadside_phone}
                            </a>
                        ) : 'Brak telefonu'}
                    </p>
                </>
            )}
          </div>

          {/* Sekcja Opisu Usługi Pomocy Drogowej (roadside_description) */}
          {profileData.roadside_description && (
            <div className="mb-8 pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">O naszych usługach</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {profileData.roadside_description}
              </p>
            </div>
          )}

          {/* Sekcja Mapy */}
          {profileData.latitude && profileData.longitude && (
            <div className="w-full h-[450px] rounded-xl overflow-hidden shadow-md border border-gray-200 mt-8">
              <MapContainer center={[profileData.latitude, profileData.longitude]} zoom={13} className="h-full w-full">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <Marker position={[profileData.latitude, profileData.longitude]} icon={towIcon} />
              </MapContainer>
            </div>
          )}

          {/* SEKCJA GALERII ZDJĘĆ - TAK JAK W PUBLICPROFILE.JSX - POD MAPĄ */}
          <div className="mb-8 mt-8"> {/* Dodany margines od góry, aby oddzielić od mapy */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Galeria zdjęć</h2>
              {isOwner && ( // Pokaż przycisk "Edytuj" tylko jeśli jest właścicielem
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-base font-semibold transition-colors duration-200"
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
                  <div className="flex flex-wrap gap-4 mt-4">
                    {newImages.map((file, index) => (
                      <div key={`new-${index}`} className="relative group overflow-hidden rounded-lg shadow-md aspect-w-1 aspect-h-1 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40">
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
                <div className="flex flex-wrap gap-4 mt-4">
                  {(profileData.roadside_image_urls || []).map((url, index) => (
                    <div key={`existing-${index}`} className="relative group overflow-hidden rounded-lg shadow-md aspect-w-1 aspect-h-1 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40">
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
                {(roadsideImageUrls.length > 0) ? (
                  <div className="flex flex-wrap gap-4">
                    {roadsideImageUrls.map((url, index) => (
                      <div
                        key={index}
                        className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 overflow-hidden rounded-lg shadow-md cursor-pointer transform transition-transform duration-200 hover:scale-105"
                        onClick={() => openLightbox(index)}
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

          {/* Lightbox dla zdjęć */}
          {showLightbox && profileData && profileData.roadside_image_urls && profileData.roadside_image_urls.length > 0 && (
            <div
              className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999] p-4"
              onClick={closeLightbox}
            >
              <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={closeLightbox}
                  className="absolute top-4 right-4 text-white text-3xl font-bold bg-gray-800 bg-opacity-70 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-100 transition-colors"
                >
                  &times;
                </button>

                <img
                  src={profileData.roadside_image_urls[currentImageIndex]}
                  alt={`Zdjęcie ${currentImageIndex + 1}`}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-xl"
                />

                {profileData.roadside_image_urls.length > 1 && (
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

        </div>
      </div>
    </>
  );
}