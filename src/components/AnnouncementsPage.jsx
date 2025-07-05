// src/pages/AnnouncementsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
// Importy ikon serduszka
import { FaRegHeart, FaHeart } from 'react-icons/fa'; // FaRegHeart to obrys, FaHeart to wypełnione
// Importy ikon dla przycisku filtrowania (możesz użyć innych, np. z 'react-icons/fi' dla FiStar)
import { FaStar, FaRegStar } from 'react-icons/fa'; // Użyjemy tych samych ikon gwiazdki, ale inna rola

// Jeśli używasz react-select lub innych komponentów do filtrowania/sortowania, upewnij się, że są zaimportowane.
// import Select from 'react-select';

export default function AnnouncementsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [errorAnnouncements, setErrorAnnouncements] = useState(null);

  // Stany dla filtrowania/sortowania (jeśli masz takie istniejące)
  const [filters, setFilters] = useState({}); // Przykładowy stan dla filtrów
  const [sortBy, setSortBy] = useState('created_at'); // Przykładowy stan dla sortowania

  // NOWY STAN: Przechowuje ID ulubionych ogłoszeń dla aktualnego użytkownika
  const [favoriteAnnouncementIds, setFavoriteAnnouncementIds] = useState(new Set());
  const [loadingFavorites, setLoadingFavorites] = useState(false); // Stan ładowania ulubionych

  // NOWY STAN: Włączony filtr "Pokaż tylko ulubione"
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Funkcja do pobierania ulubionych ogłoszeń użytkownika
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
          event: '*', // INSERT, DELETE (gdy użytkownik dodaje/usuwa)
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

  // Funkcja do ładowania ogłoszeń (z uwzględnieniem filtra ulubionych)
  const fetchAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    setErrorAnnouncements(null);
    try {
      let query = supabase
        .from('announcements')
        .select(`
          *,
          user:user_id(full_name, company_name, email, role)
        `)
        .order(sortBy, { ascending: true }); // Domyślne sortowanie

      // FILTROWANIE: Jeśli włączono "Pokaż tylko ulubione"
      if (showOnlyFavorites && currentUser) {
        // Pobierz ID ogłoszeń, które są ulubione dla bieżącego użytkownika
        const { data: favoriteIdsData, error: favError } = await supabase
          .from('user_favorite_announcements')
          .select('announcement_id')
          .eq('user_id', currentUser.id);

        if (favError) {
          console.error("Błąd filtrowania ulubionych ogłoszeń:", favError.message);
          // Możesz zdecydować, czy wyświetlić błąd, czy po prostu nie filtrować
          return;
        }

        const idsToFilter = favoriteIdsData.map(item => item.announcement_id);
        if (idsToFilter.length === 0) {
          // Jeśli nie ma ulubionych, zwróć pustą listę ogłoszeń
          setAnnouncements([]);
          setLoadingAnnouncements(false);
          return;
        }
        query = query.in('id', idsToFilter); // Zastosuj filtr
      }

      // Tutaj możesz dodać więcej filtrów (np. filters.city, filters.vehicle_type)
      // if (filters.city) {
      //   query = query.ilike('city', `%${filters.city}%`);
      // }
      // ...

      const { data, error } = await query;

      if (error) throw error;
      setAnnouncements(data);
    } catch (err) {
      console.error("Błąd ładowania ogłoszeń:", err.message);
      setErrorAnnouncements("Nie udało się załadować ogłoszeń.");
    } finally {
      setLoadingAnnouncements(false);
    }
  }, [showOnlyFavorites, currentUser, sortBy]); // Zależy od showOnlyFavorites, currentUser i sortBy

  // Efekt do ładowania ogłoszeń przy zmianie filtra/sortowania
  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]); // Zależy od fetchAnnouncements (która już zależy od filtrów/sortowania)


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
  };

  if (loadingAnnouncements || authLoading || loadingFavorites) {
    return (
      <>
        <Navbar />
        <div className="announcements-page-container">
          <h1>Tablica Ogłoszeń</h1>
          <p>Ładowanie ogłoszeń...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (errorAnnouncements) {
    return (
      <>
        <Navbar />
        <div className="announcements-page-container">
          <h1>Tablica Ogłoszeń</h1>
          <p className="error-message">Błąd: {errorAnnouncements}</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="announcements-page-container">
        <h1>Tablica Ogłoszeń</h1>

        <div className="top-controls">
          {/* Przycisk "Dodaj nowe ogłoszenie" */}
          <button className="action-button primary" onClick={() => navigate('/dodaj-ogloszenie')}>
            Dodaj nowe ogłoszenie
          </button>

          {/* NOWY PRZYCISK: Filtr "Ulubione Ogłoszenia" */}
          {currentUser && ( // Pokaż przycisk tylko dla zalogowanych
            <button
              className={`action-button secondary favorite-filter-button ${showOnlyFavorites ? 'active' : ''}`}
              onClick={handleToggleShowOnlyFavorites}
              disabled={loadingAnnouncements} // Wyłącz podczas ładowania
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

          {/* Tutaj możesz dodać inne filtry/sortowanie */}
          {/* <div className="filters-and-sort">
            <input
              type="text"
              placeholder="Szukaj miasta..."
              onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
            />
            <Select options={[{ value: 'created_at', label: 'Najnowsze' }]} />
          </div> */}
        </div>

        {announcements.length === 0 && showOnlyFavorites ? (
          <p className="info-message">Brak ulubionych ogłoszeń.</p>
        ) : announcements.length === 0 ? (
          <p className="info-message">Brak dostępnych ogłoszeń.</p>
        ) : (
          <div className="announcements-grid">
            {announcements.map(announcement => (
              <div key={announcement.id} className="announcement-card">
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

                <h3>{announcement.title}</h3>
                <p>Opis: {announcement.description}</p>
                {/* Tutaj możesz dodać więcej szczegółów ogłoszenia */}
                <p>Wystawione przez: {announcement.user?.company_name || announcement.user?.full_name || announcement.user?.email}</p>
                <p>Data: {new Date(announcement.created_at).toLocaleDateString()}</p>

                <button className="details-button" onClick={() => navigate(`/announcements/${announcement.id}`)}>
                  Zobacz szczegóły
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}