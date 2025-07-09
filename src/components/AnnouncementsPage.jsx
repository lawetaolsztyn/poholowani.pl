import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AnnouncementForm from './AnnouncementForm';
import AnnouncementChatSection from './AnnouncementChatSection';
import Modal from './Modal';
import { useAuth } from '../AuthContext';

import 'leaflet/dist/leaflet.css';
import './AnnouncementsPage.css';

const AnnouncementsPage = () => {
  const { announcementId } = useParams();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();

  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Stany dla filtrowania
  const [locationFromFilter, setLocationFromFilter] = useState('');
  const [locationToFilter, setLocationToFilter] = useState('');
  const [keywordsFilter, setKeywordsFilter] = useState('');
  const [budgetMinFilter, setBudgetMinFilter] = useState('');
  const [budgetMaxFilter, setBudgetMaxFilter] = useState('');
  const [weightMinFilter, setWeightMinFilter] = useState('');
  const [weightMaxFilter, setWeightMaxFilter] = useState('');
  const [radiusFilter, setRadiusFilter] = useState('');
  const [currentCoords, setCurrentCoords] = useState(null); // Do promienia wyszukiwania

  const [showForm, setShowForm] = useState(false); // Kontroluje widoczność modala formularza
  const [announcementToEdit, setAnnouncementToEdit] = useState(null); // Ogłoszenie do edycji
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteAnnouncementIds, setFavoriteAnnouncementIds] = useState([]);

  const resultsRef = useRef(null); // Referencja do przewijania

  const fetchFavorites = async (userId) => {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('announcement_id')
        .eq('user_id', userId);
      if (error) throw error;
      return data.map(fav => fav.announcement_id);
    } catch (err) {
      console.error('Błąd pobierania ulubionych:', err.message);
      return [];
    }
  };

  const handleToggleFavorite = async (announcementId) => {
    if (!currentUser) {
      alert('Musisz być zalogowany, aby dodawać ogłoszenia do ulubionych.');
      return;
    }

    const isCurrentlyFavorite = favoriteAnnouncementIds.includes(announcementId);
    try {
      if (isCurrentlyFavorite) {
        // Usuń z ulubionych
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('announcement_id', announcementId);
        if (error) throw error;
        setFavoriteAnnouncementIds(prev => prev.filter(id => id !== announcementId));
      } else {
        // Dodaj do ulubionych
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: currentUser.id, announcement_id });
        if (error) throw error;
        setFavoriteAnnouncementIds(prev => [...prev, announcementId]);
      }
    } catch (err) {
      console.error('Błąd zmiany statusu ulubionych:', err.message);
      alert('Nie udało się zmienić statusu ulubionych.');
    }
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    let query = supabase.from('announcements').select(`
      id, title, description, image_url, created_at,
      location_from_text, location_to_text,
      location_from_lat, location_from_lng,
      location_to_lat, location_to_lng,
      item_to_transport, weight_kg, budget_pln,
      user_id, contact_phone, contact_whatsapp, contact_messenger,
      profiles:user_id (id, full_name, company_name, role, is_premium, universal_contact_phone, profile_uses_whatsapp, profile_messenger_link)
    `, { count: 'exact' });

    if (showFavoritesOnly && currentUser) {
      const favorites = await fetchFavorites(currentUser.id);
      query = query.in('id', favorites);
    } else if (showFavoritesOnly && !currentUser) {
      // Jeśli użytkownik nie jest zalogowany i chce zobaczyć ulubione, nie pokazuj nic
      setAnnouncements([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    // Filtry tekstowe
    if (keywordsFilter) {
      query = query.or(`title.ilike.%${keywordsFilter}%,description.ilike.%${keywordsFilter}%,item_to_transport.ilike.%${keywordsFilter}%`);
    }
    if (locationFromFilter) {
      query = query.ilike('location_from_text', `%${locationFromFilter}%`);
    }
    if (locationToFilter) {
      query = query.ilike('location_to_text', `%${locationToFilter}%`);
    }

    // Filtry numeryczne (budżet, waga)
    if (budgetMinFilter) {
      query = query.gte('budget_pln', parseFloat(budgetMinFilter));
    }
    if (budgetMaxFilter) {
      query = query.lte('budget_pln', parseFloat(budgetMaxFilter));
    }
    if (weightMinFilter) {
      query = query.gte('weight_kg', parseFloat(weightMinFilter));
    }
    if (weightMaxFilter) {
      query = query.lte('weight_kg', parseFloat(weightMaxFilter));
    }

    // Filtr promienia (dla location_from_lat/lng)
    if (radiusFilter && currentCoords && currentCoords.latitude && currentCoords.longitude) {
      const distanceThresholdKm = parseFloat(radiusFilter);
      // To będzie wymagało funkcji PostGIS w Supabase
      // Przykładowe zapytanie (zakłada, że masz kolumnę geog o typie GEOGRAPHY(Point,4326))
      // query = query.rpc('nearby_announcements', {
      //   lat: currentCoords.latitude,
      //   lng: currentCoords.longitude,
      //   radius_km: distanceThresholdKm
      // });
      // Na razie pomijamy RPC, skupiamy się na podstawowych filtrach
      console.warn("Filtr promienia wymaga funkcji RPC PostGIS na Supabase.");
    }

    // Paginacja
    const from = page * limit;
    const to = from + limit - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    try {
      const { data, error, count } = await query;
      if (error) throw error;
      setAnnouncements(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Błąd ładowania ogłoszeń:', err.message);
      setError('Nie udało się załadować ogłoszeń: ' + err.message);
      setAnnouncements([]);
    } finally {
      setLoading(false);
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [page, showFavoritesOnly, currentUser,
    locationFromFilter, locationToFilter, keywordsFilter,
    budgetMinFilter, budgetMaxFilter, weightMinFilter, weightMaxFilter,
    radiusFilter, currentCoords // Dodano zależności filtrów
  ]);

  useEffect(() => {
    // Pobierz bieżącą lokalizację użytkownika (tylko raz)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Błąd pobierania bieżącej lokalizacji:", error.message);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, []);

  // Obsługa kliknięcia ogłoszenia (przekierowanie lub otwarcie szczegółów)
  const handleAnnouncementClick = (announcement) => {
    setSelectedAnnouncement(announcement);
    navigate(`/announcements/${announcement.id}`);
  };

  const handleBackToList = () => {
    setSelectedAnnouncement(null);
    navigate('/announcements');
  };

  const handleEditAnnouncement = (announcement) => {
    setAnnouncementToEdit(announcement);
    setShowForm(true);
  };

  const handleAnnouncementSuccess = async (updatedAnnouncementId) => {
    setShowForm(false); // Zamknij modal po sukcesie
    setAnnouncementToEdit(null); // Wyczyść stan edycji
    await fetchAnnouncements(); // Odśwież listę ogłoszeń

    if (updatedAnnouncementId) {
      // Jeśli edytowano, spróbuj ponownie wybrać to ogłoszenie
      const updated = announcements.find(a => a.id === updatedAnnouncementId);
      if (updated) {
        setSelectedAnnouncement(updated);
      }
    }
  };

  // Funckja do przekierowania na logowanie z intencją zadania pytania
  const handleAskQuestionRedirect = () => {
    localStorage.setItem('redirect_to_announce_details_id', selectedAnnouncement.id);
    navigate('/login');
    return true; // Zwróć true, aby zasygnalizować, że przekierowano
  };

  const totalPages = Math.ceil(totalCount / limit);
  const paginationButtons = [];
  for (let i = 0; i < totalPages; i++) {
    paginationButtons.push(
      <button key={i} onClick={() => setPage(i)} className={page === i ? 'active' : ''}>
        {i + 1}
      </button>
    );
  }

  // LINK DO GRUPY FACEBOOKA
  const facebookGroupLink = "https://www.facebook.com/groups/1278233000603384";

  if (announcementId && !selectedAnnouncement) {
    // Jeśli announcementId jest w URL, ale ogłoszenie nie jest jeszcze załadowane
    // Możesz tutaj dodać spinner lub komunikat "Ładowanie szczegółów ogłoszenia..."
    // Ten przypadek zostanie obsłużony, gdy fetchAnnouncements się zakończy i ustawi selectedAnnouncement
    return (
      <div className="announcements-page-container">
        <Navbar />
        <div className="announcements-content">
          <p>Ładowanie szczegółów ogłoszenia...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="announcements-page-container">
      <Navbar />
      <div className="announcements-content">
        {/* Panel boczny */}
        <div className="left-panel">
          <button className="add-announcement-button" onClick={() => {
            setShowForm(true);
            setAnnouncementToEdit(null); // Upewnij się, że tryb to dodawanie, nie edycja
          }}>
            Dodaj Nowe Ogłoszenie
          </button>
          <div className="filter-buttons">
            <button
              className={`filter-button ${showFavoritesOnly ? 'active' : ''}`}
              onClick={handleToggleFavoritesFilter}
            >
              {showFavoritesOnly ? 'Pokaż wszystkie ogłoszenia' : 'Pokaż tylko ulubione'}
            </button>
          </div>

          {/* NOWY BLOK: Link do grupy FB w panelu bocznym */}
          <div className="facebook-group-sidebar">
            <h4>Dołącz do Społeczności!</h4>
            <p>Bądź na bieżąco z nowymi ogłoszeniami, zadawaj pytania i dyskutuj z innymi użytkownikami.</p>
            <a href={facebookGroupLink} target="_blank" rel="noopener noreferrer" className="sidebar-facebook-link">
              <i className="fab fa-facebook-square"></i> Dołącz do grupy na FB
            </a>
          </div>
          {/* KONIEC NOWEGO BLOKU */}

          {/* Filtry wyszukiwania */}
          <div className="search-filters">
            <h3>Filtry:</h3>
            <div className="form-group">
              <label htmlFor="locationFromFilter">Skąd:</label>
              <input
                type="text"
                id="locationFromFilter"
                value={locationFromFilter}
                onChange={(e) => setLocationFromFilter(e.target.value)}
                placeholder="Np. Berlin"
              />
            </div>
            <div className="form-group">
              <label htmlFor="locationToFilter">Dokąd:</label>
              <input
                type="text"
                id="locationToFilter"
                value={locationToFilter}
                onChange={(e) => setLocationToFilter(e.target.value)}
                placeholder="Np. Warszawa"
              />
            </div>
            <div className="form-group">
              <label htmlFor="keywordsFilter">Słowa kluczowe:</label>
              <input
                type="text"
                id="keywordsFilter"
                value={keywordsFilter}
                onChange={(e) => setKeywordsFilter(e.target.value)}
                placeholder="Np. laweta, motocykl"
              />
            </div>
            <div className="form-group">
              <label htmlFor="budgetMinFilter">Budżet od (PLN):</label>
              <input
                type="number"
                id="budgetMinFilter"
                value={budgetMinFilter}
                onChange={(e) => setBudgetMinFilter(e.target.value)}
                placeholder="Min. budżet"
              />
            </div>
            <div className="form-group">
              <label htmlFor="budgetMaxFilter">Budżet do (PLN):</label>
              <input
                type="number"
                id="budgetMaxFilter"
                value={budgetMaxFilter}
                onChange={(e) => setBudgetMaxFilter(e.target.value)}
                placeholder="Max. budżet"
              />
            </div>
            <div className="form-group">
              <label htmlFor="weightMinFilter">Waga od (kg):</label>
              <input
                type="number"
                id="weightMinFilter"
                value={weightMinFilter}
                onChange={(e) => setWeightMinFilter(e.target.value)}
                placeholder="Min. waga"
              />
            </div>
            <div className="form-group">
              <label htmlFor="weightMaxFilter">Waga do (kg):</label>
              <input
                type="number"
                id="weightMaxFilter"
                value={weightMaxFilter}
                onChange={(e) => setWeightMaxFilter(e.target.value)}
                placeholder="Max. waga"
              />
            </div>
            <div className="form-group">
              <label htmlFor="radiusFilter">Promień od bieżącej lokalizacji (km):</label>
              <input
                type="number"
                id="radiusFilter"
                value={radiusFilter}
                onChange={(e) => setRadiusFilter(e.target.value)}
                placeholder="Np. 50"
                disabled={!currentCoords}
              />
              {!currentCoords && <small>Włącz geolokalizację w przeglądarce, aby użyć tego filtra.</small>}
            </div>
            <button onClick={fetchAnnouncements} className="apply-filters-button">Zastosuj filtry</button>
            <button onClick={() => {
              setLocationFromFilter('');
              setLocationToFilter('');
              setKeywordsFilter('');
              setBudgetMinFilter('');
              setBudgetMaxFilter('');
              setWeightMinFilter('');
              setWeightMaxFilter('');
              setRadiusFilter('');
              setPage(0); // Resetuj paginację
              // Po zresetowaniu filtrów, fetchAnnouncements zostanie wywołane przez useEffect
            }} className="reset-filters-button">Resetuj filtry</button>
          </div>
        </div>

        {/* Panel główny */}
        <div className="main-panel">
          {selectedAnnouncement ? (
            // Tryb szczegółów ogłoszenia
            <div className="announcement-details-view">
              <button onClick={handleBackToList} className="back-to-list-button">← Powrót do listy</button>
              <div className="details-card">
                <h2>{selectedAnnouncement.title}</h2>
                {selectedAnnouncement.image_url && (
                  <img src={selectedAnnouncement.image_url} alt={selectedAnnouncement.title} className="announcement-image" />
                )}
                <p><strong>Opis:</strong> {selectedAnnouncement.description}</p>
                <p><strong>Skąd:</strong> {selectedAnnouncement.location_from_text || 'Nie podano'}</p>
                <p><strong>Dokąd:</strong> {selectedAnnouncement.location_to_text || 'Nie podano'}</p>
                <p><strong>Co do przewiezienia:</strong> {selectedAnnouncement.item_to_transport || 'Nie podano'}</p>
                <p><strong>Waga:</strong> {selectedAnnouncement.weight_kg ? `${selectedAnnouncement.weight_kg} kg` : 'Nie podano'}</p>
                <p><strong>Budżet:</strong> {selectedAnnouncement.budget_pln ? `${selectedAnnouncement.budget_pln} PLN` : 'Nie podano'}</p>
                <p><strong>Data dodania:</strong> {new Date(selectedAnnouncement.created_at).toLocaleDateString()}</p>
                
                {selectedAnnouncement.profiles && (
                  <div className="announcement-user-info">
                    <h3>Kontakt z ogłoszeniodawcą:</h3>
                    <p>
                      <strong>{selectedAnnouncement.profiles.company_name || selectedAnnouncement.profiles.full_name || 'Użytkownik'}</strong>
                      {selectedAnnouncement.profiles.role && ` (${selectedAnnouncement.profiles.role === 'firma' ? 'Firma' : 'Klient'})`}
                    </p>
                    {selectedAnnouncement.contact_phone && (
                      <p>Telefon: <a href={`tel:${selectedAnnouncement.contact_phone}`}>{selectedAnnouncement.contact_phone}</a></p>
                    )}
                    {selectedAnnouncement.contact_whatsapp && (
                      <p>WhatsApp: <a href={`https://wa.me/${selectedAnnouncement.contact_whatsapp}`} target="_blank" rel="noopener noreferrer">Wyślij wiadomość</a></p>
                    )}
                    {selectedAnnouncement.contact_messenger && (
                      <p>Messenger: <a href={selectedAnnouncement.contact_messenger} target="_blank" rel="noopener noreferrer">Wyślij wiadomość</a></p>
                    )}
                  </div>
                )}
                
                {currentUser && currentUser.id === selectedAnnouncement.user_id && (
                  <div className="announcement-actions-owner">
                    <button onClick={() => handleEditAnnouncement(selectedAnnouncement)} className="edit-announcement-button">Edytuj ogłoszenie</button>
                  </div>
                )}
                
                {currentUser && selectedAnnouncement && (
                  <AnnouncementChatSection 
                    announcement={selectedAnnouncement} 
                    currentUserId={currentUser.id} 
                    userJwt={currentUser.access_token} // Przekazujemy JWT do ChatSection
                    onAskQuestionRedirect={handleAskQuestionRedirect}
                  />
                )}
              </div>
            </div>
          ) : (
            // Tryb listy ogłoszeń
            <div ref={resultsRef} className="announcements-list-view">
              <h2>Ogłoszenia ({totalCount})</h2>
              {loading && <p>Ładowanie ogłoszeń...</p>}
              {error && <p className="error-message">{error}</p>}
              {!loading && announcements.length === 0 && <p>Brak ogłoszeń spełniających kryteria.</p>}

              <div className="announcements-grid">
                {announcements.map((ann) => (
                  <div key={ann.id} className="announcement-card">
                    <div className="card-header">
                      <h4>{ann.title}</h4>
                      {currentUser && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); // Zapobiega otwarciu ogłoszenia
                            handleToggleFavorite(ann.id); 
                          }}
                          className={`favorite-button ${favoriteAnnouncementIds.includes(ann.id) ? 'favorited' : ''}`}
                        >
                          <i className={`fas fa-star ${favoriteAnnouncementIds.includes(ann.id) ? '' : 'far'}`}></i>
                        </button>
                      )}
                    </div>
                    {ann.image_url && <img src={ann.image_url} alt={ann.title} className="card-image" />}
                    <p className="card-description">{ann.description}</p>
                    <div className="card-details">
                      {ann.location_from_text && <p><strong>Skąd:</strong> {ann.location_from_text}</p>}
                      {ann.location_to_text && <p><strong>Dokąd:</strong> {ann.location_to_text}</p>}
                      {ann.budget_pln && <p><strong>Budżet:</strong> {ann.budget_pln} PLN</p>}
                      {ann.weight_kg && <p><strong>Waga:</strong> {ann.weight_kg} kg</p>}
                      <p className="card-meta">Dodano: {new Date(ann.created_at).toLocaleDateString()}</p>
                      <button onClick={() => handleAnnouncementClick(ann)} className="view-details-button">Zobacz szczegóły</button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button onClick={() => setPage(prev => Math.max(0, prev - 1))} disabled={page === 0}>Poprzednia</button>
                  {paginationButtons}
                  <button onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))} disabled={page === totalPages - 1}>Następna</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />

      {/* Modal do dodawania/edycji ogłoszenia */}
      <Modal 
        isOpen={showForm} 
        onClose={() => { 
          setShowForm(false); 
          setAnnouncementToEdit(null); // Zawsze resetuj, gdy zamykasz
        }} 
        title={announcementToEdit ? 'Edytuj Ogłoszenie' : 'Dodaj Nowe Ogłoszenie'}
      >
        <AnnouncementForm 
          onSuccess={handleAnnouncementSuccess} 
          announcementToEdit={announcementToEdit} 
        />
      </Modal>
    </div>
  );
};

export default AnnouncementsPage;