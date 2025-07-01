// src/components/AnnouncementsPage.jsx
import React, { useState, useEffect } from 'react'; // Dodaj useEffect i useState
import { supabase } from '../supabaseClient'; // Upewnij się, że ścieżka jest poprawna

import AnnouncementForm from './AnnouncementForm';
import './AnnouncementsPage.css';
import Navbar from './Navbar';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [errorAnnouncements, setErrorAnnouncements] = useState(null);

  // Funkcja do ładowania ogłoszeń
  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    setErrorAnnouncements(null);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false }); // Najnowsze ogłoszenia na górze

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
  }, []); // Pusta tablica zależności oznacza, że uruchomi się raz po zamontowaniu

  // Funkcja wywoływana po pomyślnym dodaniu nowego ogłoszenia z formularza
  const handleAnnouncementSuccess = () => {
    console.log('Ogłoszenie dodane pomyślnie!');
    fetchAnnouncements(); // Odśwież listę ogłoszeń po dodaniu nowego
  };

  return (
    <React.Fragment>
      <Navbar />
      <div className="announcements-page-container">
        <div className="left-panel">
          <h3>Dodaj Nowe Ogłoszenie</h3> {/* Przeniesione tutaj, bo formularz już ma nagłówek */}
          <AnnouncementForm onSuccess={handleAnnouncementSuccess} />
        </div>
        <div className="main-content-area">
          <h2>Aktualne Ogłoszenia</h2>

          {loadingAnnouncements && <p className="loading-message">Ładowanie ogłoszeń...</p>}
          {errorAnnouncements && <p className="error-message-list">{errorAnnouncements}</p>}
          
          {!loadingAnnouncements && announcements.length === 0 && (
            <p className="no-announcements-message">Brak aktualnych ogłoszeń. Bądź pierwszy!</p>
          )}

          <div className="announcements-grid">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="announcement-card">
                <h3>{announcement.title}</h3>
                {announcement.image_url && (
                  <img src={announcement.image_url} alt={announcement.title} className="announcement-image" />
                )}
                <p><strong>Opis:</strong> {announcement.description}</p>
                {announcement.location_from_text && announcement.location_to_text && (
                  <p><strong>Trasa:</strong> {announcement.location_from_text} &#8594; {announcement.location_to_text}</p>
                )}
                {!announcement.location_from_text && !announcement.location_to_text && (
                  <p className="no-route-info">Brak podanej trasy, sprawdź opis.</p>
                )}
                {announcement.item_to_transport && <p><strong>Do przewiezienia:</strong> {announcement.item_to_transport}</p>}
                {announcement.weight_kg && <p><strong>Waga:</strong> {announcement.weight_kg} kg</p>}
                {announcement.budget_pln && <p><strong>Budżet:</strong> {announcement.budget_pln} PLN</p>}
                
                {/* Przyciski/Linki do kontaktu - tutaj na razie tylko numer tel. */}
                <div className="contact-info">
                  <p><strong>Kontakt:</strong></p>
                  <a href={`tel:${announcement.contact_phone}`} className="contact-button phone-button">📞 {announcement.contact_phone}</a>
                  {announcement.contact_whatsapp && (
                    <a href={`https://wa.me/${announcement.contact_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="contact-button whatsapp-button">
                      WhatsApp
                    </a>
                  )}
                  {announcement.contact_messenger && (
                    <a href={announcement.contact_messenger} target="_blank" rel="noopener noreferrer" className="contact-button messenger-button">
                      Messenger
                    </a>
                  )}
                </div>
                
                <p className="posted-at">Dodano: {new Date(announcement.created_at).toLocaleString()}</p>
                
                {/* Tutaj docelowo będzie przycisk/link do otwierania chatu */}
                <button className="open-chat-button">Rozpocznij rozmowę</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}