// src/components/AnnouncementsPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

import AnnouncementForm from './AnnouncementForm';
import './AnnouncementsPage.css';
import Navbar from './Navbar';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [errorAnnouncements, setErrorAnnouncements] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    setErrorAnnouncements(null);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

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

  useEffect(() => {
    fetchAnnouncements();

    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleAnnouncementSuccess = () => {
    console.log('Ogłoszenie dodane pomyślnie!');
    fetchAnnouncements();
    setShowForm(false);
  };

  const handleOpenForm = () => {
    if (!user) {
      alert('Musisz być zalogowany, aby dodać ogłoszenie. Zostaniesz przekierowany do strony logowania.');
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

  // NOWA FUNKCJA do obsługi kliknięcia "Zadaj pytanie"
  const handleAskQuestion = () => {
    if (!user) {
      alert('Musisz być zalogowany, aby zadać pytanie. Zostaniesz przekierowany do strony logowania.');
      navigate('/login');
      return;
    }
    // DOCELOWO: Tutaj będzie logika otwierania chatu
    console.log(`Zadano pytanie do ogłoszenia: ${selectedAnnouncement.title} (ID: ${selectedAnnouncement.id})`);
    alert('Funkcja "Zadaj pytanie" zostanie uruchomiona w przyszłości!'); // Tymczasowy alert
    // navigate do chatu, otwarcie modala chatu itp.
  };


  return (
    <React.Fragment>
      <Navbar />
      <div className="announcements-page-container">
        {/* LEWA KOLUMNA: PRZYCISK DODAJ / FORMULARZ / FILTRY / PRZYCISKI AKCJI W TRYBIE SZCZEGÓŁÓW */}
        <div className="left-panel">
          {/* Przycisk "Dodaj Nowe Ogłoszenie" - zawsze widoczny na początku lewej kolumny */}
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
                <p>(Tutaj pojawią się pola filtra)</p>
              </div>
          )}

          {/* PRZYCISKI W LEWEJ KOLUMNIE, GDY WIDOK SZCZEGÓŁÓW JEST AKTYWNY */}
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

        {/* PRAWA KOLUMNA: LISTA OGŁOSZEŃ LUB SZCZEGÓŁY OGŁOSZENIA */}
        <div className="main-content-area">
          {/* Warunkowe renderowanie: albo lista, albo szczegóły */}
          {selectedAnnouncement ? (
            // === WIDOK SZCZEGÓŁÓW JEDNEGO OGŁOSZENIA (w prawej kolumnie) ===
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

              {/* DANE KONTAKTOWE I PRZYCISKI - TYLKO TUTAJ W DETALACH */}
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
              
              {/* NOWY BLOK Z PRZYCISKAMI DO WHATSAPP I MESSENGER ORAZ ZADAJ PYTANIE */}
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
                {/* PRZYCISK ZADAJ PYTANIE */}
                <button className="action-button ask-question-button" onClick={handleAskQuestion}>
                  <i className="fas fa-question-circle"></i> Zadaj pytanie
                </button>
              </div>

            </div>
          ) : (
            // === WIDOK LISTY OGŁOSZEŃ ===
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