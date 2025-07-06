// src/components/AnnouncementsPage.jsx (CAŁY PLIK)

import React, { useState, useEffect, useCallback } from 'react'; // Dodano useCallback
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx'; 

import AnnouncementForm from './AnnouncementForm';
import './AnnouncementsPage.css'; // Twój plik CSS
import Navbar from './Navbar';
import Footer from './Footer'; // Dodano import Footer, jeśli go używasz
import LocationAutocomplete from './LocationAutocomplete';
import Modal from './Modal';
import AnnouncementChatSection from './AnnouncementChatSection';

// Importy ikon serduszka (dla karty ogłoszenia)
import { FaRegHeart, FaHeart } from 'react-icons/fa'; // FaRegHeart to obrys, FaHeart to wypełnione
// Importy ikon dla przycisku filtrowania (dla filtra "Ulubione")
import { FaStar, FaRegStar } from 'react-icons/fa'; // FaStar to wypełniona gwiazdka, FaRegStar to obrys


export default function AnnouncementsPage() {
  const navigate = useNavigate();
  // PRAWIDŁOWE POBRANIE 'loading' Z useAuth JAKO 'authLoading'
  const { currentUser, userRole, loading: authLoading } = useAuth(); 
  const [userJwt, setUserJwt] = useState(''); // JWT dla API Workera

  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [errorAnnouncements, setErrorAnnouncements] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  
  // NOWE STANY DLA ULUBIONYCH
  const [favoriteAnnouncementIds, setFavoriteAnnouncementIds] = useState(new Set()); // Zbiór ID ulubionych
  const [loadingFavorites, setLoadingFavorites] = useState(false); // Stan ładowania operacji na ulubionych
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false); // Stan dla filtra "Pokaż tylko ulubione"


  // STANY DLA FILTROWANIA (Twoje oryginalne stany)
  const [filterFrom, setFilterFrom] = useState({ label: '', coords: null });
  const [filterTo, setFilterTo] = useState({ label: '', coords: null });
  const [filterRadiusKm, setFilterRadiusKm] = useState(50);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterBudgetMin, setFilterBudgetMin] = useState('');
  const [filterBudgetMax, setFilterBudgetMax] = useState('');
  const [filterWeightMin, setFilterWeightMin] = useState('');
  const [filterWeightMax, setFilterWeightMax] = useState('');

  // STANY DLA PAGINACJI (Twoje oryginalne stany)
  const [currentPage, setCurrentPage] = useState(1);
  const [announcementsPerPage] = useState(20);
  const [totalAnnouncementsCount, setTotalAnnouncementsCount] = useState(0);

  // Pobranie JWT z supabase.auth.getSession() - potrzebne dla AnnouncementChatSection
  useEffect(() => {
    const fetchJwt = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Błąd pobierania JWT:", error.message);
      } else {
        setUserJwt(data?.session?.access_token || '');
      }
    };
    fetchJwt();
  }, []);


  // === FUNKCJE ULUBIONYCH ===

  // Funkcja do pobierania ID ulubionych ogłoszeń użytkownika
  const fetchFavorites = useCallback(async () => {
    if (!currentUser || !currentUser.id) {
      setFavoriteAnnouncementIds(new Set()); // Wyczyść, jeśli użytkownik wylogowany
      return;
    }
    setLoadingFavorites(true);
    try {
      const { data, error } = await supabase
        .from('user_favorite_announcements')
        .select('announcement_id')
        .eq('user_id', currentUser.id);

      if (error) {
        console.error("Błąd pobierania ulubionych ogłoszeń:", error.message);
      } else {
        const favoritedIds = new Set(data.map(fav => fav.announcement_id));
        setFavoriteAnnouncementIds(favoritedIds);
      }
    } catch (err) {
      console.error("Ogólny błąd fetchFavorites:", err.message);
    } finally {
      setLoadingFavorites(false);
    }
  }, [currentUser]); // Zależy od currentUser

  // Efekt do ładowania ulubionych ogłoszeń przy zmianie użytkownika
  useEffect(() => {
    fetchFavorites();

    // Opcjonalnie: Subskrypcja Realtime na zmiany w ulubionych ogłoszeniach
    // aby serduszka aktualizowały się na żywo
    let favoritesChannel;
    if (currentUser && currentUser.id) {
      favoritesChannel = supabase
        .channel(`favorites:${currentUser.id}`)
        .on('postgres_changes', {
          event: '*', // INSERT, DELETE, UPDATE (w przypadku problemów z usuwaniem)
          schema: 'public',
          table: 'user_favorite_announcements',
          filter: `user_id=eq.${currentUser.id}`
        }, payload => {
          console.log('Realtime favorite update!', payload);
          fetchFavorites(); // Odśwież listę ulubionych ID
        })
        .subscribe();
    }

    return () => {
      if (favoritesChannel) {
        supabase.removeChannel(favoritesChannel);
      }
    };
  }, [currentUser, fetchFavorites]); // Zależności: currentUser i fetchFavorites

  // Funkcja odpowiedzialna za dodawanie/usuwanie ogłoszeń z ulubionych
  const handleToggleFavorite = async (announcementId, e) => {
    e.stopPropagation(); // Zapobiega wywołaniu click na karcie ogłoszenia
    if (!currentUser) {
      alert('Musisz być zalogowany, aby dodać ogłoszenie do ulubionych!');
      return;
    }

    setLoadingFavorites(true);
    const isCurrentlyFavorite = favoriteAnnouncementIds.has(announcementId);

    try {
      if (isCurrentlyFavorite) {
        // Usuń z ulubionych
        const { error } = await supabase
          .from('user_favorite_announcements')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('announcement_id', announcementId);

        if (error) throw error;
        // Zaktualizuj stan lokalnie
        setFavoriteAnnouncementIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(announcementId);
          return newSet;
        });
      } else {
        // Dodaj do ulubionych
        const { error } = await supabase
          .from('user_favorite_announcements')
          .insert({
            user_id: currentUser.id,
            announcement_id: announcementId
          });

        if (error) throw error;
        // Zaktualizuj stan lokalnie
        setFavoriteAnnouncementIds(prev => {
          const newSet = new Set(prev);
          newSet.add(announcementId);
          return newSet;
        });
      }
      // Po zmianie statusu ulubionych, odśwież listę ogłoszeń, jeśli filtr jest włączony
      if (showOnlyFavorites) {
        fetchAnnouncements(); // Aby usunięte ogłoszenie zniknęło z widoku
      }
    } catch (err) {
      console.error("Błąd toggle ulubionych:", err.message);
      alert('Wystąpił błąd podczas aktualizacji ulubionych: ' + err.message);
    } finally {
      setLoadingFavorites(false);
    }
  };

  // Funkcja do przełączania filtra "Pokaż tylko ulubione"
  const handleToggleShowOnlyFavorites = () => {
    if (!currentUser) {
      alert('Musisz być zalogowany, aby filtrować ulubione ogłoszenia!');
      return;
    }
    setShowOnlyFavorites(prev => !prev);
    setCurrentPage(1); // Resetuj paginację przy zmianie filtra
  };


  // === GŁÓWNA FUNKCJA POBIERANIA OGŁOSZEŃ (zmodyfikowana o filtr ulubionych) ===
  const fetchAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    setErrorAnnouncements(null);

    let data, error, count;
    const startIndex = (currentPage - 1) * announcementsPerPage;
    const endIndex = startIndex + announcementsPerPage - 1;

    const isRadiusFilterActive = filterFrom.coords && filterRadiusKm > 0;

    // Pobierz ogłoszenia RPC z filtrem promienia LUB zapytaj bezpośrednio z tabeli
    if (isRadiusFilterActive) {
      const fromLng = filterFrom.coords[0];
      const fromLat = filterFrom.coords[1];

      ({ data, error } = await supabase.rpc('get_announcements_in_radius', {
        center_lat: fromLat,
        center_lng: fromLng,
        radius_meters: filterRadiusKm * 1000
      }));

      if (error) {
        console.error('Błąd wywołania funkcji RPC get_announcements_in_radius:', error.message);
        setErrorAnnouncements('Błąd filtrowania po promieniu: ' + error.message);
        setLoadingAnnouncements(false);
        return;
      }

      let filteredData = data;

      // ZASTOSOWANIE FILTRA "POKAŻ TYLKO ULUBIONE" DLA RPC (po stronie klienta)
      if (showOnlyFavorites && currentUser) {
        filteredData = filteredData.filter(ann => favoriteAnnouncementIds.has(ann.id));
      }
      
      // ... (pozostałe Twoje oryginalne filtry dla danych z RPC) ...
      if (filterTo.label) {
        filteredData = filteredData.filter(ann => 
          ann.location_to_text && ann.location_to_text.toLowerCase().includes(filterTo.label.toLowerCase())
        );
      }
      if (filterKeyword) {
        const keywordLower = filterKeyword.toLowerCase();
        filteredData = filteredData.filter(ann => 
          (ann.title && ann.title.toLowerCase().includes(keywordLower)) ||
          (ann.description && ann.description.toLowerCase().includes(keywordLower))
        );
      }
      if (filterBudgetMin) {
        filteredData = filteredData.filter(ann => ann.budget_pln && ann.budget_pln >= parseFloat(filterBudgetMin));
      }
      if (filterBudgetMax) {
        filteredData = filteredData.filter(ann => ann.budget_pln && ann.budget_pln <= parseFloat(filterBudgetMax));
      }
      if (filterWeightMin) {
        filteredData = filteredData.filter(ann => ann.weight_kg && ann.weight_kg >= parseFloat(filterWeightMin));
      }
      if (filterWeightMax) {
        filteredData = filteredData.filter(ann => ann.weight_kg && ann.weight_kg <= parseFloat(filterWeightMax));
      }
      
      filteredData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setTotalAnnouncementsCount(filteredData.length);
      setAnnouncements(filteredData.slice(startIndex, endIndex + 1));

    } else { // BEZ FILTRA PROMIENIA - zapytanie bezpośrednio do tabeli
      let query = supabase.from('announcements')
        .select(`*, user:user_id(full_name, company_name, email, role)`, { count: 'exact' }); // Dodano join na user_id

      // ZASTOSOWANIE FILTRA "POKAŻ TYLKO ULUBIONE" DLA ZAPYTANIA BEZPOŚREDNIEGO (po stronie Supabase)
      if (showOnlyFavorites && currentUser) {
        // Użyj już pobranych ulubionych ID
        query = query.in('id', Array.from(favoriteAnnouncementIds)); 
      }
      
      // ... (pozostałe Twoje oryginalne filtry dla bezpośredniego zapytania) ...
      if (filterTo.label) {
        query = query.ilike('location_to_text', `%${filterTo.label}%`);
      }
      if (filterKeyword) {
        query = query.or(`title.ilike.%${filterKeyword}%,description.ilike.%${filterKeyword}%`);
      }
      if (filterBudgetMin) {
        query = query.gte('budget_pln', parseFloat(filterBudgetMin));
      }
      if (filterBudgetMax) {
        query = query.lte('budget_pln', parseFloat(filterBudgetMax));
      }
      if (filterWeightMin) {
        query = query.gte('weight_kg', parseFloat(filterWeightMin));
      }
      if (filterWeightMax) {
        query = query.lte('weight_kg', parseFloat(filterWeightMax));
      }

      query = query.order('created_at', { ascending: false })
        .range(startIndex, endIndex);

      ({ data, error, count } = await query);

      if (error) {
        console.error('Błąd ładowania ogłoszeń:', error.message);
        setErrorAnnouncements('Nie udało się załadować ogłoszeń: ' + error.message);
        setLoadingAnnouncements(false);
        return;
      }
      setAnnouncements(data);
      setTotalAnnouncementsCount(count);
    }

    setLoadingAnnouncements(false);
  }, [filterFrom, filterTo, filterKeyword, filterBudgetMin, filterBudgetMax, filterWeightMin, filterWeightMax, filterRadiusKm, currentPage, showOnlyFavorites, currentUser, favoriteAnnouncementIds, announcementsPerPage]); // Dodano zależności do filtra ulubionych i paginacji

  // Efekt do ładowania ogłoszeń przy zmianie filtra/sortowania/paginacji/ulubionych
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchAnnouncements();
    }, 300); // Małe opóźnienie dla debounce filtrów

    return () => {
      clearTimeout(handler);
    };
  }, [fetchAnnouncements]); // Zależność od memoizowanej funkcji

  useEffect(() => {
    if (currentUser) {
      const redirectToAnnounceForm = localStorage.getItem('redirect_to_announce_form');
      const redirectToAnnounceDetailsId = localStorage.getItem('redirect_to_announce_details_id');

      if (redirectToAnnounceForm === 'true') {
        localStorage.removeItem('redirect_to_announce_form');
        setShowForm(true);
        setSelectedAnnouncement(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (redirectToAnnounceDetailsId) {
        localStorage.removeItem('redirect_to_announce_details_id');
        // Tutaj można by obsłużyć otwarcie konkretnego ogłoszenia po zalogowaniu
        navigate(`/announcements/${redirectToAnnounceDetailsId}`); // Przekierowanie do szczegółów ogłoszenia
      }
    } else {
      setShowForm(false);
      setSelectedAnnouncement(null);
    }
  }, [currentUser, navigate]); // Dodano navigate do zależności

  const handleAnnouncementSuccess = () => {
    console.log('Ogłoszenie dodane pomyślnie!');
    fetchAnnouncements();
    setShowForm(false);
  };

  const handleOpenForm = () => {
    if (authLoading) { 
      alert('Sprawdzanie statusu logowania...');
      return;
    }
    if (!currentUser) { 
      alert('Musisz być zalogowany, aby dodać ogłoszenie. Zostaniesz przekierowany do strony logowania.');
      localStorage.setItem('redirect_to_announce_form', 'true');
      navigate('/login');
      return;
    }
    setShowForm(true);
    setSelectedAnnouncement(null);
  };

  const handleViewDetails = (announcement) => {
    setSelectedAnnouncement(announcement);
    setShowForm(false);
  };

  const handleBackToList = () => {
    setSelectedAnnouncement(null);
  };

  const handleAskQuestionRedirect = () => {
    if (authLoading) {
      alert('Sprawdzanie statusu logowania...');
      return true;
    }
    if (!currentUser) {
      alert('Musisz być zalogowany, aby zadać pytanie. Zostaniesz przekierowany do strony logowania.');
      localStorage.setItem('redirect_to_announce_details_id', selectedAnnouncement.id);
      navigate('/login');
      return true;
    }
    return false;
  };


  const handleClearFilters = () => {
    setFilterFrom({ label: '', coords: null });
    setFilterTo({ label: '', coords: null });
    setFilterRadiusKm(50);
    setFilterKeyword('');
    setFilterBudgetMin('');
    setFilterBudgetMax('');
    setFilterWeightMin('');
    setFilterWeightMax('');
    setCurrentPage(1);
    setShowOnlyFavorites(false); // Również wyczyść filtr ulubionych
  };

  const totalPages = Math.ceil(totalAnnouncementsCount / announcementsPerPage);

  const goToPage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) {
      return;
    }
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`pagination-button ${currentPage === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };


  return (
    <React.Fragment>
      <Navbar />
      <div className="announcements-page-container">
        {/* LEWA KOLUMNA - FILTRY I PRZYCISKI */}
        <div className="left-panel">
          {/* Przycisk "Dodaj Nowe Ogłoszenie" */}
          {!showForm && !selectedAnnouncement && (
            <button className="add-announcement-button" onClick={handleOpenForm}>
              Dodaj Nowe Ogłoszenie
            </button>
          )}

          {/* NOWY PRZYCISK FILTRA: Pokaż tylko ulubione */}
          {currentUser && ( // Pokaż przycisk tylko dla zalogowanych
            <button
              className={`favorite-filter-button ${showOnlyFavorites ? 'active' : ''}`}
              onClick={handleToggleShowOnlyFavorites}
              disabled={loadingAnnouncements || loadingFavorites} // Wyłącz podczas ładowania ogłoszeń lub ulubionych
            >
              {showOnlyFavorites ? (
                <>
                  <FaStar style={{ marginRight: '8px', color: 'gold' }} /> Pokaż wszystkie
                </>
              ) : (
                <>
                  <FaRegStar style={{ marginRight: '8px' }} /> Pokaż tylko ulubione
                </>
              )}
            </button>
          )}

          {showForm && (
            <>
              <h3 className="form-header">Dodaj Nowe Ogłoszenie</h3>
              <AnnouncementForm onSuccess={handleAnnouncementSuccess} />
              <button className="back-button" onClick={() => setShowForm(false)}>
                ← Wróć
              </button>
            </>
          )}

          {/* MIEJSCE NA FILTRY WYSZUKIWANIA (Twoje oryginalne filtry) */}
          {!showForm && !selectedAnnouncement && (
              <div className="search-filter-section">
                <h3>Filtruj Ogłoszenia</h3>
                <div className="filter-group">
                    <label htmlFor="filterFrom">Skąd:</label>
                    <LocationAutocomplete
                        value={filterFrom.label}
                        onSelectLocation={(label, sug) => setFilterFrom({ label, coords: sug.geometry.coordinates })}
                        placeholder="Miasto początkowe"
                        className="filter-input"
                        searchType="city"
                    />
                </div>
                {/* SUWAK PROMIENIA - ZAWSZE WIDOCZNY */}
                <div className="filter-group">
                    <label htmlFor="filterRadius">Promień: {filterRadiusKm} km</label>
                    <input
                        type="range"
                        id="filterRadius"
                        min="5"
                        max="500"
                        step="5"
                        value={filterRadiusKm}
                        onChange={(e) => setFilterRadiusKm(parseInt(e.target.value))}
                        className="filter-slider"
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="filterTo">
    Dokąd: <span className="optional-text">(Opcjonalnie)</span> 
    </label>
                    <LocationAutocomplete
                        value={filterTo.label}
                        onSelectLocation={(label, sug) => setFilterTo({ label, coords: sug.geometry.coordinates })}
                        placeholder="Miasto docelowe"
                        className="filter-input"
                        searchType="city"
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="filterKeyword">Słowo kluczowe / Opis:</label>
                    <input
                        type="text"
                        id="filterKeyword"
                        value={filterKeyword}
                        onChange={(e) => setFilterKeyword(e.target.value)}
                        placeholder="Np. auto, meble, pilne"
                        className="filter-input"
                    />
                </div>
                {/* POLA ZAKRESU - BUDŻET */}
                <div className="filter-group">
                    <label>Budżet (PLN):</label>
                    <div className="range-inputs">
                        <input
                            type="number"
                            value={filterBudgetMin}
                            onChange={(e) => setFilterBudgetMin(e.target.value)}
                            placeholder="Min."
                            className="filter-input-range"
                        />
                        <span>-</span>
                        <input
                            type="number"
                            value={filterBudgetMax}
                            onChange={(e) => setFilterBudgetMax(e.target.value)}
                            placeholder="Max."
                            className="filter-input-range"
                        />
                    </div>
                </div>
                {/* POLA ZAKRESU - WAGA */}
                <div className="filter-group">
                    <label>Waga (kg):</label>
                    <div className="range-inputs">
                        <input
                            type="number"
                            value={filterWeightMin}
                            onChange={(e) => setFilterWeightMin(e.target.value)}
                            placeholder="Min."
                            className="filter-input-range"
                        />
                        <span>-</span>
                        <input
                            type="number"
                            value={filterWeightMax}
                            onChange={(e) => setFilterWeightMax(e.target.value)}
                            placeholder="Max."
                            className="filter-input-range"
                        />
                    </div>
                </div>
                <button onClick={fetchAnnouncements} className="filter-button">Szukaj</button>
                <button onClick={handleClearFilters} className="clear-filter-button">Wyczyść filtry</button>
              </div>
          )}

          {/* Przyciski w lewej kolumnie, gdy widok szczegółów jest aktywny */}
          {selectedAnnouncement && (
            <div className="announcement-detail-buttons">
              <button className="add-announcement-button-side" onClick={handleOpenForm}>
                Dodaj Ogłoszenie
              </button>
              <button className="back-button-side" onClick={handleBackToList}>
                ← Wróć do listy
              </button>
            </div>
          )}
        </div>

        {/* PRAWA KOLUMNA - LISTA OGŁOSZEŃ LUB SZCZEGÓŁY */}
        <div className="main-content-area">
          {selectedAnnouncement ? (
            // WIDOK SZCZEGÓŁÓW JEDNEGO OGŁOSZENIA
            <div className="full-announcement-details-card">
              <h3>Szczegóły Ogłoszenia</h3>
              <h4>{selectedAnnouncement.title}</h4>
              {selectedAnnouncement.image_url && (
                <img src={selectedAnnouncement.image_url} alt={selectedAnnouncement.title} className="announcement-details-image-full" />
              )}
              <p><strong>Opis:</strong> {selectedAnnouncement.description}</p>
              {selectedAnnouncement.location_from_text && selectedAnnouncement.location_to_text && (
                <p><strong>Trasa:</strong> {selectedAnnouncement.location_from_text} &#8594; {selectedAnnouncement.location_to_text}</p>
              )}
              {!selectedAnnouncement.location_from_text && !selectedAnnouncement.location_to_text && (
                <p className="no-route-info">Brak podanej trasy, sprawdź opis.</p>
              )}
              {selectedAnnouncement.item_to_transport && <p><strong>Do przewiezienia:</strong> {selectedAnnouncement.item_to_transport}</p>}
              {selectedAnnouncement.weight_kg && <p><strong>Waga:</strong> {selectedAnnouncement.weight_kg} kg</p>}
              {selectedAnnouncement.budget_pln && <p><strong>Budżet:</strong> {selectedAnnouncement.budget_pln} PLN</p>}
              <p className="posted-at">Dodano: {new Date(selectedAnnouncement.created_at).toLocaleString()}</p>

              <div className="contact-info-details">
                <p><strong>Kontakt:</strong></p>
                <a href={`tel:${selectedAnnouncement.contact_phone}`} className="contact-button phone-button">📞 {selectedAnnouncement.contact_phone}</a>
                {selectedAnnouncement.contact_whatsapp && (
                  <a href={`https://wa.me/${selectedAnnouncement.contact_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="contact-button whatsapp-button">
                    WhatsApp
                  </a>
                )}
                {selectedAnnouncement.contact_messenger && (
                  <a href={selectedAnnouncement.contact_messenger} target="_blank" rel="noopener noreferrer" className="contact-button messenger-button">
                    Messenger
                  </a>
                )}
              </div>
              
              <AnnouncementChatSection
                announcement={selectedAnnouncement}
                currentUserId={currentUser?.id}
                userJwt={userJwt}
                onAskQuestionRedirect={handleAskQuestionRedirect}
              />

            </div>
          ) : (
            // WIDOK LISTY OGŁOSZEŃ
            <>
              <h2>Aktualne Ogłoszenia</h2>

              {loadingAnnouncements && <p className="loading-message">Ładowanie ogłoszeń...</p>}
              {errorAnnouncements && <p className="error-message-list">{errorAnnouncements}</p>}
              
              {!loadingAnnouncements && announcements.length === 0 && showOnlyFavorites ? (
                <p className="no-announcements-message">Brak ulubionych ogłoszeń.</p>
              ) : !loadingAnnouncements && announcements.length === 0 ? (
                <p className="no-announcements-message">Brak aktualnych ogłoszeń. Bądź pierwszy!</p>
              ) : (
<div className="announcements-list-single-column">
                {announcements.map((announcement) => (
                    <div key={announcement.id} className="announcement-card-wide"> {/* Zmieniono z announcement-card-wide na inną klasę dla grida? Sprawdź CSS! */}
                      {/* Przycisk ulubionych (serduszko) */}
                      {currentUser && ( // Pokaż serduszko tylko dla zalogowanych użytkowników
                        <button
                          onClick={(e) => handleToggleFavorite(announcement.id, e)}
                          className="favorite-button"
                          disabled={loadingFavorites}
                          title={favoriteAnnouncementIds.has(announcement.id) ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                        >
                          {favoriteAnnouncementIds.has(announcement.id) ? (
                            <FaHeart style={{ color: 'red' }} /> // Wypełnione serce (czerwone)
                          ) : (
                            <FaRegHeart style={{ color: 'gray' }} /> // Pusty obrys (szary)
                          )}
                        </button>
                      )}

                      <div className="card-header">
                        <h3>{announcement.title}</h3>
                        <p className="posted-at">Dodano: {new Date(announcement.created_at).toLocaleString()}</p>
                      </div>
                      {announcement.image_url && (
                        <img src={announcement.image_url} alt={announcement.title} className="announcement-image-preview" />
                      )}
                      <p><strong>Opis:</strong> {announcement.description.length > 250 ? announcement.description.substring(0, 250) + '...' : announcement.description}</p>
                      {announcement.location_from_text && announcement.location_to_text && (
                        <p><strong>Trasa:</strong> {announcement.location_from_text} &#8594; {announcement.location_to_text}</p>
                      )}
                      {!announcement.location_from_text && !announcement.location_to_text && (
                        <p className="no-route-info">Brak podanej trasy, sprawdź opis.</p>
                      )}
                      <div className="card-meta">
                        {announcement.item_to_transport && <span><strong>Co:</strong> {announcement.item_to_transport}</span>}
                        {announcement.weight_kg && <span><strong>Waga:</strong> {announcement.weight_kg} kg</span>}
                        {announcement.budget_pln && <span><strong>Budżet:</strong> {announcement.budget_pln} PLN</span>}
                      </div>
                      
                      <button className="view-details-button" onClick={() => handleViewDetails(announcement)}>
                        Zobacz szczegóły
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-button"
                  >
                    Poprzednia
                  </button>
                  {getPaginationButtons()}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-button"
                  >
                    Następna
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* MODAL FORMULARZA OGŁOSZEŃ */}
      <Modal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        title="Dodaj Nowe Ogłoszenie"
      >
        <AnnouncementForm onSuccess={handleAnnouncementSuccess} />
      </Modal>

      <Footer />
    </React.Fragment>
  );
}