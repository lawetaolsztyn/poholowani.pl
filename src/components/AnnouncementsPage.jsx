// src/components/AnnouncementsPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

import AnnouncementForm from './AnnouncementForm';
import './AnnouncementsPage.css';
import Navbar from './Navbar';
import LocationAutocomplete from './LocationAutocomplete'; // Importuj LocationAutocomplete do filtra

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [errorAnnouncements, setErrorAnnouncements] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // NOWE STANY DLA FILTROWANIA
  const [filterFrom, setFilterFrom] = useState({ label: '', coords: null });
  const [filterTo, setFilterTo] = useState({ label: '', coords: null });
  const [filterItem, setFilterItem] = useState('');
  const [filterBudgetMin, setFilterBudgetMin] = useState('');
  const [filterBudgetMax, setFilterBudgetMax] = useState('');
  const [filterWeightMin, setFilterWeightMin] = useState('');
  const [filterWeightMax, setFilterWeightMax] = useState('');

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    setErrorAnnouncements(null);

    let query = supabase.from('announcements').select('*');

    // DODAJ LOGIKĘ FILTROWANIA DO ZAPYTANIA SUPABASE
    if (filterFrom.label) {
      // Filtracja po tekście, np. 'contains' lub 'ilike' (case-insensitive LIKE)
      query = query.ilike('location_from_text', `%${filterFrom.label}%`);
    }
    if (filterTo.label) {
      query = query.ilike('location_to_text', `%${filterTo.label}%`);
    }
    if (filterItem) {
      query = query.ilike('item_to_transport', `%${filterItem}%`);
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

    query = query.order('created_at', { ascending: false });

    try {
      const { data, error } = await query; // Wykonaj zapytanie z filtrami

      if (error) {
        throw error;
      }
      setAnnouncements(data);
    } catch (err) {
      console.error('Błąd ładowania ogłoszeń:', err);
      setErrorAnnouncements('Nie udało się załadować ogłoszeń: ' + err.message);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  // Uruchom ładowanie ogłoszeń przy pierwszym renderowaniu i ZMIANIE FILTRÓW
  useEffect(() => {
    fetchAnnouncements();
  }, [filterFrom, filterTo, filterItem, filterBudgetMin, filterBudgetMax, filterWeightMin, filterWeightMax]); // Zależności dla filtra

  // Efekty do zarządzania stanem użytkownika po zalogowaniu/wylogowaniu
  useEffect(() => {
    const getInitialUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getInitialUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Efekt do obsługi przekierowania po zalogowaniu (pozostaje bez zmian)
  useEffect(() => {
    if (user) {
      const redirectToAnnounceForm = localStorage.getItem('redirect_to_announce_form');
      const redirectToAnnounceDetailsId = localStorage.getItem('redirect_to_announce_details_id');

      if (redirectToAnnounceForm === 'true') {
        localStorage.removeItem('redirect_to_announce_form');
        setShowForm(true);
        setSelectedAnnouncement(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (redirectToAnnounceDetailsId) {
        localStorage.removeItem('redirect_to_announce_details_id');
      }
    } else {
      setShowForm(false);
      setSelectedAnnouncement(null);
    }
  }, [user]);

  const handleAnnouncementSuccess = () => {
    console.log('Ogłoszenie dodane pomyślnie!');
    fetchAnnouncements();
    setShowForm(false);
  };

  const handleOpenForm = () => {
    if (!user) {
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

  const handleAskQuestion = () => {
    if (!user) {
      alert('Musisz być zalogowany, aby zadać pytanie. Zostaniesz przekierowany do strony logowania.');
      localStorage.setItem('redirect_to_announce_details_id', selectedAnnouncement.id);
      navigate('/login');
      return;
    }
    console.log(`Zadano pytanie do ogłoszenia: ${selectedAnnouncement.title} (ID: ${selectedAnnouncement.id})`);
    alert('Funkcja "Zadaj pytanie" zostanie uruchomiona w przyszłości!');
  };

  const handleClearFilters = () => {
    setFilterFrom({ label: '', coords: null });
    setFilterTo({ label: '', coords: null });
    setFilterItem('');
    setFilterBudgetMin('');
    setFilterBudgetMax('');
    setFilterWeightMin('');
    setFilterWeightMax('');
    // Po wyczyszczeniu filtrów, useEffect ponownie uruchomi fetchAnnouncements
  };


  return (
    <React.Fragment>
      <Navbar />
      <div className="announcements-page-container">
        {/* LEWA KOLUMNA */}
        <div className="left-panel">
          {/* Przycisk "Dodaj Nowe Ogłoszenie" */}
          {!showForm && !selectedAnnouncement && (
            <button className="add-announcement-button" onClick={handleOpenForm}>
              Dodaj Nowe Ogłoszenie
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

          {/* MIEJSCE NA FILTRY WYSZUKIWANIA - widoczne, gdy nie wyświetlasz formularza ani szczegółów */}
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
                <div className="filter-group">
                    <label htmlFor="filterTo">Dokąd:</label>
                    <LocationAutocomplete
                        value={filterTo.label}
                        onSelectLocation={(label, sug) => setFilterTo({ label, coords: sug.geometry.coordinates })}
                        placeholder="Miasto docelowe"
                        className="filter-input"
                        searchType="city"
                    />
                </div>
                <div className="filter-group">
                    <label htmlFor="filterItem">Co do przewiezienia:</label>
                    <input
                        type="text"
                        id="filterItem"
                        value={filterItem}
                        onChange={(e) => setFilterItem(e.target.value)}
                        placeholder="Np. auto, meble"
                        className="filter-input"
                    />
                </div>
                <div className="filter-group-range">
                    <label>Budżet (PLN):</label>
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
                <div className="filter-group-range">
                    <label>Waga (kg):</label>
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

        {/* PRAWA KOLUMNA */}
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
              
              <div className="chat-and-direct-contact-buttons">
                {selectedAnnouncement.contact_whatsapp && (
                  <a href={`https://wa.me/${selectedAnnouncement.contact_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="action-button whatsapp-action-button">
                    <i className="fab fa-whatsapp"></i> Otwórz WhatsApp
                  </a>
                )}
                {selectedAnnouncement.contact_messenger && (
                  <a href={selectedAnnouncement.contact_messenger} target="_blank" rel="noopener noreferrer" className="action-button messenger-action-button">
                    <i className="fab fa-facebook-messenger"></i> Otwórz Messenger
                  </a>
                )}
                <button className="action-button ask-question-button" onClick={handleAskQuestion}>
                  <i className="fas fa-question-circle"></i> Zadaj pytanie
                </button>
              </div>

            </div>
          ) : (
            // WIDOK LISTY OGŁOSZEŃ
            <>
              <h2>Aktualne Ogłoszenia</h2>

              {loadingAnnouncements && <p className="loading-message">Ładowanie ogłoszeń...</p>}
              {errorAnnouncements && <p className="error-message-list">{errorAnnouncements}</p>}
              
              {!loadingAnnouncements && announcements.length === 0 && (
                <p className="no-announcements-message">Brak aktualnych ogłoszeń. Bądź pierwszy!</p>
              )}

              <div className="announcements-list-single-column">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="announcement-card-wide">
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
            </>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}