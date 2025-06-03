// src/components/PublicProfile.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Upewnij się, że ścieżka do supabaseClient jest poprawna
import Navbar from './Navbar'; // Poprawiona ścieżka importu

// Opcje typów floty
const fleetOptions = [
  'auto osobowe', 'bus', 'autolaweta', 'przyczepa towarowa', 'przyczepa laweta',
  'przyczepa laweta podwójna', 'pojazd ciężarowy', 'naczepa ciężarowa', 'przyczepa ciężarowa', 'dostawczak'
];

// Funkcja pomocnicza do pobierania ikon pojazdów
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

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newImages, setNewImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser(); // Pobieramy info o zalogowanym użytkowniku
        const { data, error } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        // Parsowanie stringów JSON na tablice
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

        setProfile(data);
        setIsOwner(userData?.user?.id === id); // Sprawdzamy, czy zalogowany użytkownik jest właścicielem profilu
      } catch (error) {
        console.error("Błąd ładowania profilu:", error.message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [id]);

  const handleSave = async (field, value) => {
    if (!profile) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== id) throw new Error("Brak autoryzacji do edycji.");

      let updatePayload = {};

      if (field === 'firm') {
        updatePayload = {
          nip: profile.nip,
          phone: profile.phone,
          street: profile.street,
          building_number: profile.building_number,
          postal_code: profile.postal_code,
          city: profile.city,
          country: profile.country, // Dodaj country, jeśli jest w profilu
        };
      } else {
        updatePayload = { [field]: Array.isArray(value) ? JSON.stringify(value) : value };
      }

      const { error } = await supabase
        .from('users_extended')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, [field]: value })); // Aktualizujemy stan lokalny tablicą (nie stringiem)
      setEditingSection(null);
      alert('Dane zapisane pomyślnie!');
    } catch (error) {
      console.error(`Błąd zapisu ${field}:`, error.message);
      alert(`❌ Błąd zapisu ${field}: ${error.message}`);
    }
  };

  // --- Funkcje do obsługi edycji poszczególnych pól ---
  const handleDescriptionChange = (e) => {
    setProfile(prev => ({ ...prev, description: e.target.value }));
  };

  const handleFleetChange = (flag) => {
    setProfile(prev => {
      const currentFlags = new Set(prev.fleet_flags || []);
      if (currentFlags.has(flag)) {
        currentFlags.delete(flag);
      } else {
        currentFlags.add(flag);
      }
      return { ...prev, fleet_flags: Array.from(currentFlags) };
    });
  };

  const handleRouteChange = (index, value) => {
    setProfile(prev => {
      const updatedRoutes = [...(prev.routes || [])];
      updatedRoutes[index] = value;
      return { ...prev, routes: updatedRoutes };
    });
  };

  const addRouteField = () => {
    setProfile(prev => ({ ...prev, routes: [...(prev.routes || []), ''] }));
  };

  // --- Funkcje do obsługi zdjęć ---

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert(`Plik ${file.name} jest za duży (max 5MB).`);
        return false;
      }
      return true;
    });

    if ((profile.image_urls || []).length + newImages.length + validFiles.length > 5) {
      alert("Możesz mieć maksymalnie 5 zdjęć w galerii.");
      return;
    }
    setNewImages(prev => [...prev, ...validFiles]);
  };

  const handleRemoveNewImage = (indexToRemove) => {
    setNewImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleRemoveExistingImage = (indexToRemove) => {
    setProfile(prev => {
      const updatedImageUrls = prev.image_urls.filter((_, index) => index !== indexToRemove);
      return { ...prev, image_urls: updatedImageUrls };
    });
  };

  const handleSaveImages = async () => {
    setUploadingImages(true);
    let updatedImageUrls = [...(profile.image_urls || [])];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== id) throw new Error("Brak autoryzacji do edycji.");

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
  .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, image_urls: updatedImageUrls }));
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

  // --- Funkcje do obsługi Lightboxa ---
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
      (prevIndex + 1) % profile.image_urls.length
    );
  };

  const goToPrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      (prevIndex - 1 + profile.image_urls.length) % profile.image_urls.length
    );
  };


  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-8 text-center text-gray-700">Ładowanie profilu...</div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-8 text-center text-red-600">Profil nie został znaleziony.</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 py-8"> {/* Dodany padding i tło */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 mx-auto max-w-4xl border border-gray-200">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-800">{profile.company_name || profile.full_name || 'Profil użytkownika'}</h1>
          </div>

          <div className="text-gray-700 text-lg leading-loose mb-4">
            {profile.account_type === 'company' && (
              <>
                <p><strong>NIP:</strong> {profile.nip || 'Brak danych'}</p>
<p><strong>Telefon:</strong>{' '}
  <span dangerouslySetInnerHTML={{ __html: (profile.phone || '').replace(/./g, (c) => `&#${c.charCodeAt(0)};`) }} />
</p>              </>
            )}
            {profile.full_name && <p><strong>Osoba kontaktowa:</strong> {profile.full_name}</p>}
            <p><strong>Adres:</strong> {profile.street} {profile.building_number}, {profile.postal_code} {profile.city}, {profile.country}</p>
          </div>
        </div>

        {/* Sekcja Opisu */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 mx-auto max-w-4xl border border-gray-200">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Opis firmy</h2>
            {isOwner && (
              <button
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                onClick={() => setEditingSection('description')}
              >
                ✏ Edytuj
              </button>
            )}
          </div>
          {editingSection === 'description' && isOwner ? (
            <div className="space-y-4">
              <textarea
                value={profile.description || ''}
                onChange={handleDescriptionChange}
                className="w-full p-3 border rounded-lg resize-y min-h-[100px]"
                placeholder="Dodaj opis swojej firmy, doświadczenie, specjalizacje..."
              ></textarea>
              <button
                onClick={() => handleSave('description', profile.description)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg w-full text-lg font-semibold transition-colors duration-200"
              >
                Zapisz opis
              </button>
              <button
                onClick={() => setEditingSection(null)}
                className="mt-2 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg w-full text-lg font-semibold transition-colors duration-200"
              >
                Anuluj
              </button>
            </div>
          ) : (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.description || 'Brak opisu.'}</p>
          )}
        </div>

        {/* Pojazdy we flocie */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 mx-auto max-w-4xl border border-gray-200">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Pojazdy we flocie</h2>
            {isOwner && (
              <button
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                onClick={() => setEditingSection('fleet')}
              >
                ✏ Edytuj
              </button>
            )}
          </div>
          {editingSection === 'fleet' && isOwner ? (
            <div className="space-y-2">
              {fleetOptions.map(option => (
                <div key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`fleet-${option}`}
                    checked={(profile.fleet_flags || []).includes(option)}
                    onChange={() => handleFleetChange(option)}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded"
                  />
                  <label htmlFor={`fleet-${option}`} className="ml-2 text-gray-700 cursor-pointer">
                    {getFleetIcon(option)} <span className="ml-2">{option}</span>
                  </label>
                </div>
              ))}
              <button
                onClick={() => handleSave('fleet_flags', profile.fleet_flags)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg w-full text-lg font-semibold transition-colors duration-200"
              >
                Zapisz flotę
              </button>
              <button
                onClick={() => setEditingSection(null)}
                className="mt-2 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg w-full text-lg font-semibold transition-colors duration-200"
              >
                Anuluj
              </button>
            </div>
          ) : (
            (profile.fleet_flags && profile.fleet_flags.length > 0) ? (
              <ul className="list-none p-0 m-0">
                {profile.fleet_flags.map((flag, index) => (
                  <li key={index} className="flex items-center text-gray-700 mb-2 text-lg">
                    {getFleetIcon(flag)} <span className="ml-2">{flag}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">Brak danych o flocie.</p>
            )
          )}
        </div>

        {/* Najczęstsze trasy */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 mx-auto max-w-4xl border border-gray-200">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Najczęstsze trasy</h2>
            {isOwner && (
              <button
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                onClick={() => setEditingSection('routes')}
              >
                ✏ Edytuj
              </button>
            )}
          </div>
          {editingSection === 'routes' && isOwner ? (
            <div className="space-y-2">
              {(profile.routes || []).map((route, index) => (
                <input
                  key={index}
                  type="text"
                  value={route}
                  onChange={(e) => handleRouteChange(index, e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  placeholder={`Trasa ${index + 1} (np. Warszawa - Kraków)`}
                />
              ))}
              {(profile.routes || []).length < 5 && (
                <button
                  onClick={addRouteField}
                  className="text-blue-600 hover:text-blue-800 text-sm mt-2 font-medium transition-colors duration-200"
                >
                  ➕ Dodaj pole trasy
                </button>
              )}
              <button
                onClick={() => handleSave('routes', profile.routes)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg w-full text-lg font-semibold transition-colors duration-200"
              >
                Zapisz trasy
              </button>
              <button
                onClick={() => setEditingSection(null)}
                className="mt-2 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg w-full text-lg font-semibold transition-colors duration-200"
              >
                Anuluj
              </button>
            </div>
          ) : (
            (profile.routes && profile.routes.length > 0) ? (
              <ul className="list-disc list-inside p-0 m-0">
                {profile.routes.map((route, index) => (
                  <li key={index} className="text-gray-700 mb-1">{route}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">Brak zdefiniowanych tras.</p>
            )
          )}
        </div>

        {/* Sekcja Galerii zdjęć */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 mx-auto max-w-4xl border border-gray-200">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Galeria zdjęć</h2>
            {isOwner && (
              <button
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                onClick={() => setEditingSection('images')}
              >
                ✏ Edytuj
              </button>
            )}
          </div>

          {editingSection === 'images' && isOwner ? (
            // Tryb edycji zdjęć
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
                {(profile.image_urls || []).map((url, index) => (
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
              {(profile.image_urls && profile.image_urls.length > 0) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {profile.image_urls.map((url, index) => (
                    <div
                      key={index}
                      // Ustawienie stałego rozmiaru kwadratu i obiekt-fit
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
        {showLightbox && profile && profile.image_urls && profile.image_urls.length > 0 && (
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
                src={profile.image_urls[currentImageIndex]}
                alt={`Zdjęcie ${currentImageIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-xl"
              />

              {profile.image_urls.length > 1 && (
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
      </div> {/* Zamykający div dla min-h-screen container */}
    </>
  );
}