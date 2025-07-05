import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Upewnij się, że masz ten import
import { useNavigate } from 'react-router-dom'; // Jeśli będziesz potrzebować do np. edycji

import './MojeOgloszenia.css'; // Ten plik CSS już stworzyliśmy
// import Navbar from './Navbar'; // Usunięty import, bo Navbar jest renderowany w main.jsx

export default function MojeOgloszenia() {
  const [myAnnouncements, setMyAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null); // Stan na przechowywanie obiektu użytkownika

  const navigate = useNavigate(); // Inicjalizacja navigate, jeśli będziesz potrzebować np. przekierowania

  useEffect(() => {
    const fetchUserAndAnnouncements = async () => {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser(); // Pobieramy użytkownika
      setUser(user); // Ustawiamy użytkownika w stanie

      if (!user) {
        setLoading(false);
        // Opcjonalnie: Przekieruj do logowania, jeśli nie jest zalogowany
        // navigate('/login');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('announcements') // Nazwa tabeli z ogłoszeniami
          .select('*') // Pobieramy wszystkie kolumny
          .eq('user_id', user.id) // FILTRUJEMY po user_id zalogowanego użytkownika
          .order('created_at', { ascending: false }); // Sortujemy od najnowszych

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

    fetchUserAndAnnouncements();

    // Subskrypcja na zmiany w autoryzacji (np. wylogowanie)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
    });

    return () => {
        authListener?.subscription.unsubscribe();
    };

  }, []); // Pusta tablica zależności, aby useEffect uruchomił się raz przy montowaniu

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

  if (!user) { // Sprawdzamy, czy użytkownik jest zalogowany
    return (
      <div className="moje-ogloszenia-container">
        <h1>Moje Ogłoszenia</h1>
        <p>Musisz być zalogowany, aby zobaczyć swoje ogłoszenia.</p>
        {/* Możesz dodać przycisk do logowania */}
        <button className="action-button" onClick={() => navigate('/login')}>Zaloguj się</button>
      </div>
    );
  }

  return (
    <div className="moje-ogloszenia-container">
      <h1>Moje Ogłoszenia</h1>
      {myAnnouncements.length === 0 ? (
        <p>Nie masz jeszcze żadnych ogłoszeń. <button className="add-announcement-inline-button" onClick={() => navigate('/tablica-ogloszen')}>Dodaj pierwsze ogłoszenie!</button></p>
      ) : (
        <div className="announcements-list-single-column"> {/* Użyjemy tej samej klasy co w AnnouncementsPage dla spójności */}
          {myAnnouncements.map((announcement) => (
            <div key={announcement.id} className="announcement-card-wide"> {/* Ta sama klasa karty co w AnnouncementsPage */}
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
              
              {/* Tutaj możesz dodać przyciski do edycji lub usunięcia */}
              <div className="my-announcement-actions">
                <button className="action-button edit-button">Edytuj</button>
                <button className="action-button delete-button">Usuń</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}