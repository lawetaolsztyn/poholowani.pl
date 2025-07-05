// src/components/MojeOgloszenia.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

import './MojeOgloszenia.css';
import Navbar from './Navbar'; // Zostaje
import Modal from './Modal'; // <--- IMPORTUJEMY MODAL
import AnnouncementForm from './AnnouncementForm'; // <--- IMPORTUJEMY AnnouncementForm

export default function MojeOgloszenia() {
  const [myAnnouncements, setMyAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false); // NOWY STAN: do kontroli widoczności modala edycji
  const [currentAnnouncementToEdit, setCurrentAnnouncementToEdit] = useState(null); // NOWY STAN: przechowuje ogłoszenie do edycji

  const navigate = useNavigate();

  // Przenieś to do globalnej funkcji, jeśli jest duplikowane, ale na razie zostawmy tu
  const fetchUserAndAnnouncements = async () => {
    setLoading(true);
    setError(null);
    
    const { data: { user } = {} } = await supabase.auth.getUser(); // Dodano domyślną pustą dekonstrukcję
    setUser(user);

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setMyAnnouncements(data);
    } catch (err) {
      console.error("Błąd ładowania moich ogłoszeń:", err.message);
      setError("Nie udało się załadować Twoich ogłoszeń: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndAnnouncements();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
    });

    return () => {
        authListener?.subscription.unsubscribe();
    };

  }, []);

  // FUNKCJA OBSŁUGUJĄCA USUNIĘCIE OGŁOSZENIA (bez zmian)
  const handleDeleteAnnouncement = async (announcementId) => {
    if (!user) {
      alert('Musisz być zalogowany, aby usunąć ogłoszenie.');
      return;
    }

    if (window.confirm('Czy na pewno chcesz usunąć to ogłoszenie? Tej operacji nie można cofnąć!')) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', announcementId)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        setMyAnnouncements(prevAnnouncements => prevAnnouncements.filter(ann => ann.id !== announcementId));
        alert('Ogłoszenie zostało pomyślnie usunięte.');

      } catch (err) {
        console.error('Błąd podczas usuwania ogłoszenia:', err.message);
        alert('Wystąpił błąd podczas usuwania ogłoszenia: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // FUNKCJA OBSŁUGUJĄCA EDYCJĘ OGŁOSZENIA - otwiera modal z formularzem
  const handleEditAnnouncement = (announcement) => {
    setCurrentAnnouncementToEdit(announcement); // Ustawia ogłoszenie do edycji
    setShowEditModal(true); // Otwiera modal
  };

  // Funkcja wywoływana po udanej edycji/dodaniu ogłoszenia
  const handleAnnouncementFormSuccess = () => {
    setShowEditModal(false); // Zamknij modal
    setCurrentAnnouncementToEdit(null); // Wyczyść ogłoszenie do edycji
    fetchUserAndAnnouncements(); // Odśwież listę ogłoszeń
  };


  if (loading) {
    return (
      <div className="moje-ogloszenia-container">
        <h1>Moje Ogłoszenia</h1>
        <p>Ładowanie Twoich ogłoszeń...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="moje-ogloszenia-container">
        <h1>Moje Ogłoszenia</h1>
        <p className="error-message">Błąd: {error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="moje-ogloszenia-container">
        <h1>Moje Ogłoszenia</h1>
        <p>Musisz być zalogowany, aby zobaczyć swoje ogłoszenia.</p>
        <button className="action-button" onClick={() => navigate('/login')}>Zaloguj się</button>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="moje-ogloszenia-container">
        <h1>Moje Ogłoszenia</h1>
        {myAnnouncements.length === 0 ? (
          <p>Nie masz jeszcze żadnych ogłoszeń. <button className="add-announcement-inline-button" onClick={() => navigate('/tablica-ogloszen')}>Dodaj pierwsze ogłoszenie!</button></p>
        ) : (
          <div className="announcements-list-single-column">
            {myAnnouncements.map((announcement) => (
              <div key={announcement.id} className="announcement-card-wide">
                <div className="card-header">
                  <h3>{announcement.title}</h3>
                  <p className="posted-at">Dodano: {new Date(announcement.created_at).toLocaleString()}</p>
                </div>
                {announcement.image_url && (
                  <img src={announcement.image_url} alt={announcement.title} className="announcement-image-preview" />
                )}
                <p><strong>Opis:</strong> {announcement.description.length > 150 ? announcement.description.substring(0, 150) + '...' : announcement.description}</p>
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
                
                {/* Przyciski Edytuj i Usuń - dodano onClick */}
                <div className="my-announcement-actions">
                  <button className="action-button edit-button" onClick={() => handleEditAnnouncement(announcement)}>Edytuj</button>
                  <button className="action-button delete-button" onClick={() => handleDeleteAnnouncement(announcement.id)}>Usuń</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL EDYCJI OGŁOSZENIA */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
        title={currentAnnouncementToEdit ? 'Edytuj Ogłoszenie' : 'Dodaj Nowe Ogłoszenie'}
      >
        {currentAnnouncementToEdit && ( // Renderuj formularz tylko jeśli jest ogłoszenie do edycji
          <AnnouncementForm 
            onSuccess={handleAnnouncementFormSuccess} 
            announcementToEdit={currentAnnouncementToEdit} 
          />
        )}
      </Modal>
    </>
  );
}