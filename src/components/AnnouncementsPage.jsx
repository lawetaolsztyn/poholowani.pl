// src/components/AnnouncementsPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom'; // Dodaj import useNavigate

import AnnouncementForm from './AnnouncementForm';
import './AnnouncementsPage.css';
import Navbar from './Navbar';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [errorAnnouncements, setErrorAnnouncements] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [user, setUser] = useState(null); // Nowy stan do przechowywania informacji o użytkowniku
  const navigate = useNavigate(); // Inicjalizacja useNavigate

  // Funkcja do ładowania ogłoszeń
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

  // Uruchom ładowanie ogłoszeń przy pierwszym renderowaniu komponentu
  useEffect(() => {
    fetchAnnouncements();

    // Sprawdzanie statusu logowania użytkownika przy ładowaniu strony
    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user); // Ustawiamy obiekt użytkownika w stanie
    };
    checkUserSession();

    // Możesz również subskrybować zmiany sesji, jeśli chcesz dynamicznej aktualizacji
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };

  }, []);

  // Funkcja wywoływana po pomyślnym dodaniu nowego ogłoszenia z formularza
  const handleAnnouncementSuccess = () => {
    console.log('Ogłoszenie dodane pomyślnie!');
    fetchAnnouncements();
    setShowForm(false);
  };

  // ZMIENIONA FUNKCJA: handleOpenForm
  const handleOpenForm = () => {
    if (!user) { // Sprawdzamy, czy użytkownik jest zalogowany
      alert('Musisz być zalogowany, aby dodać ogłoszenie. Zostaniesz przekierowany do strony logowania.');
      navigate('/login'); // Przekieruj do strony logowania
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

  return (
    <React.Fragment>
      <Navbar />
      <div className="announcements-page-container">
        {/* LEWA KOLUMNA: PRZYCISK DODAJ / FORMULARZ / FILTRY / SZCZEGÓŁY */}
        <div className="left-panel">
          {/* Przycisk "Dodaj Nowe Ogłoszenie" - zawsze widoczny na początku */}
          {!showForm && !selectedAnnouncement && (
            <button className="add-announcement-button" onClick={handleOpenForm}>
              Dodaj Nowe Ogłoszenie
            </button>
          )}

          {/* Formularz dodawania ogłoszenia - widoczny tylko, gdy showForm jest true */}
          {showForm && (
            <>
              <h3 className="form-header">Dodaj Nowe Ogłoszenie</h3>
              <AnnouncementForm onSuccess={handleAnnouncementSuccess} />
              <button className="back-button" onClick={() => setShowForm(false)}>
                ← Wróć
              </button>
            </>
          )}

          {/* Widok szczegółów ogłoszenia - widoczny, gdy selectedAnnouncement jest ustawione */}
          {selectedAnnouncement && (
            <div className="announcement-details-view">
              <h3>Szczegóły Ogłoszenia</h3>
              <h4>{selectedAnnouncement.title}</h4>
              <p><strong>Opis:</strong> {selectedAnnouncement.description}</p>
              {selectedAnnouncement.location_from_text && selectedAnnouncement.location_to_text && (
                <p><strong>Trasa:</strong> {selectedAnnouncement.location_from_text} &#8594; {selectedAnnouncement.location_to_text}</p>
              )}
              {selectedAnnouncement.item_to_transport && <p><strong>Do przewiezienia:</strong> {selectedAnnouncement.item_to_transport}</p>}
              {selectedAnnouncement.weight_kg && <p><strong>Waga:</strong> {selectedAnnouncement.weight_kg} kg</p>}
              {selectedAnnouncement.budget_pln && <p><strong>Budżet:</strong> {selectedAnnouncement.budget_pln} PLN</p>}
              {selectedAnnouncement.image_url && (
                <img src={selectedAnnouncement.image_url} alt={selectedAnnouncement.title} className="announcement-details-image" />
              )}
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
              <button className="open-chat-button-details">Rozpocznij rozmowę</button>

              <button className="back-button" onClick={handleBackToList}>← Wróć do listy</button>
            </div>
          )}

          {/* MIEJSCE NA FILTRY WYSZUKIWANIA */}
          {!showForm && ( // Filtry widoczne, gdy nie wyświetlasz formularza
              <div className="search-filter-section">
                <h3>Filtruj Ogłoszenia</h3>
                <p>(Tutaj pojawią się pola filtra)</p>
              </div>
          )}
        </div>

        {/* PRAWA KOLUMNA: LISTA OGŁOSZEŃ */}
        <div className="main-content-area">
          <h2>Aktualne Ogłoszenia</h2>

          {loadingAnnouncements && <p className="loading-message">Ładowanie ogłoszeń...</p>}
          {errorAnnouncements && <p className="error-message-list">{errorAnnouncements}</p>}
          
          {!loadingAnnouncements && announcements.length === 0 && (
            <p className="no-announcements-message">Brak aktualnych ogłoszeń. Bądź pierwszy!</p>
          )}

          {!selectedAnnouncement && ( // Wyświetlaj listę ogłoszeń TYLKO, gdy nie wyświetlasz szczegółów
            <div className="announcements-grid">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="announcement-card">
                  <h3>{announcement.title}</h3>
                  {announcement.image_url && (
                    <img src={announcement.image_url} alt={announcement.title} className="announcement-image" />
                  )}
                  <p><strong>Opis:</strong> {announcement.description.length > 150 ? announcement.description.substring(0, 150) + '...' : announcement.description}</p>
                  {announcement.location_from_text && announcement.location_to_text && (
                    <p><strong>Trasa:</strong> {announcement.location_from_text} &#8594; {announcement.location_to_text}</p>
                  )}
                  {!announcement.location_from_text && !announcement.location_to_text && (
                    <p className="no-route-info">Brak podanej trasy, sprawdź opis.</p>
                  )}
                  {announcement.item_to_transport && <p><strong>Do przewiezienia:</strong> {announcement.item_to_transport}</p>}
                  {announcement.weight_kg && <p><strong>Waga:</strong> {announcement.weight_kg} kg</p>}
                  {announcement.budget_pln && <p><strong>Budżet:</strong> {announcement.budget_pln} PLN</p>}
                  
                  <p className="posted-at">Dodano: {new Date(announcement.created_at).toLocaleString()}</p>
                  
                  <button className="view-details-button" onClick={() => handleViewDetails(announcement)}>
                    Zobacz szczegóły
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}