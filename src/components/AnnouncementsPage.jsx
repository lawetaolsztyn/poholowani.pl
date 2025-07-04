// src/pages/AnnouncementsPage.jsx (CAŁY PLIK)
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnnouncementCard from '../components/AnnouncementCard';
import AnnouncementDetail from '../components/AnnouncementDetail';
import AnnouncementForm from '../components/AnnouncementForm';
import AnnouncementChatSection from '../components/AnnouncementChatSection'; // Import chatu
import './AnnouncementsPage.css';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userJwt, setUserJwt] = useState(null); // Token JWT
  const navigate = useNavigate();

  // Efekt do zarządzania stanem autoryzacji
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setCurrentUserId(session?.user?.id || null);
        setUserJwt(session?.access_token || null); // Ustaw token JWT
        console.log("Auth state changed:", event, session);
        if (event === 'SIGNED_OUT') {
          // Jeśli użytkownik się wylogował, zresetuj stan
          setCurrentUserId(null);
          setUserJwt(null);
          setSelectedAnnouncement(null); // Zamknij szczegóły ogłoszenia
          setIsFormOpen(false); // Zamknij formularz
        }
      }
    );

    // Pobierz początkową sesję
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setCurrentUserId(session?.user?.id || null);
      setUserJwt(session?.access_token || null); // Ustaw token JWT
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);


  // Funkcja do pobierania ogłoszeń
  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          user_profiles!user_id(full_name, company_name, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data);
    } catch (err) {
      console.error('Błąd ładowania ogłoszeń:', err.message);
      setError('Nie udało się załadować ogłoszeń.');
    } finally {
      setLoading(false);
    }
  };

  // Efekt do ładowania ogłoszeń przy montowaniu komponentu
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Funkcja do obsługi kliknięcia ogłoszenia
  const handleAnnouncementClick = (announcement) => {
    setSelectedAnnouncement(announcement);
  };

  // Funkcja do zamykania szczegółów ogłoszenia
  const handleCloseDetail = () => {
    setSelectedAnnouncement(null);
  };

  // Funkcja do otwierania formularza dodawania ogłoszenia
  const handleOpenForm = () => {
    if (!user) {
      alert('Musisz być zalogowany, aby dodać ogłoszenie.');
      navigate('/login');
      return;
    }
    setIsFormOpen(true);
  };

  // Funkcja do zamykania formularza
  const handleCloseForm = () => {
    setIsFormOpen(false);
    fetchAnnouncements(); // Odśwież listę ogłoszeń po dodaniu/edycji
  };

  // Funkcja do edycji ogłoszenia
  const handleEditAnnouncement = (announcement) => {
    if (user && user.id === announcement.user_id) {
      setSelectedAnnouncement(announcement); // Ustaw ogłoszenie do edycji
      setIsFormOpen(true); // Otwórz formularz w trybie edycji
    } else {
      alert('Nie masz uprawnień do edycji tego ogłoszenia.');
    }
  };

  // Funkcja do usuwania ogłoszenia
  const handleDeleteAnnouncement = async (announcementId) => {
    if (!user || !currentUserId) {
      alert('Musisz być zalogowany, aby usunąć ogłoszenie.');
      return;
    }

    const { data: announcement, error: fetchError } = await supabase
      .from('announcements')
      .select('user_id')
      .eq('id', announcementId)
      .single();

    if (fetchError) {
      console.error('Błąd pobierania ogłoszenia do usunięcia:', fetchError.message);
      alert('Błąd: Nie można znaleźć ogłoszenia.');
      return;
    }

    if (announcement.user_id !== currentUserId) {
      alert('Nie masz uprawnień do usunięcia tego ogłoszenia.');
      return;
    }

    if (window.confirm('Czy na pewno chcesz usunąć to ogłoszenie?')) {
      try {
        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', announcementId);

        if (error) throw error;
        alert('Ogłoszenie usunięte pomyślnie!');
        fetchAnnouncements(); // Odśwież listę
        handleCloseDetail(); // Zamknij szczegóły, jeśli było otwarte
      } catch (err) {
        console.error('Błąd usuwania ogłoszenia:', err.message);
        alert('Nie udało się usunąć ogłoszenia.');
      }
    }
  };

  const handleAskQuestionRedirect = () => {
    alert('Musisz być zalogowany, aby zadać pytanie.');
    navigate('/login');
  };

  return (
    <div className="announcements-page">
      <Header />
      <main className="main-content">
        <h1 className="page-title">Aktualne Ogłoszenia Transportowe</h1>
        <button onClick={handleOpenForm} className="add-announcement-button">
          + Dodaj Ogłoszenie
        </button>

        {loading && <p className="loading-message">Ładowanie ogłoszeń...</p>}
        {error && <p className="error-message">{error}</p>}

        <div className="announcements-grid">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onClick={() => handleAnnouncementClick(announcement)}
            />
          ))}
        </div>

        {selectedAnnouncement && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button className="close-button" onClick={handleCloseDetail}>&times;</button>
              <AnnouncementDetail
                announcement={selectedAnnouncement}
                onEdit={handleEditAnnouncement}
                onDelete={handleDeleteAnnouncement}
                currentUserId={currentUserId}
              />
              {/* Sekcja chatu w szczegółach ogłoszenia */}
              <AnnouncementChatSection
                announcement={selectedAnnouncement}
                currentUserId={currentUserId}
                userJwt={userJwt} // Przekazujemy token JWT
                onAskQuestionRedirect={handleAskQuestionRedirect}
              />
            </div>
          </div>
        )}

        {isFormOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button className="close-button" onClick={handleCloseForm}>&times;</button>
              <AnnouncementForm
                onClose={handleCloseForm}
                initialData={selectedAnnouncement}
                userId={currentUserId} // Przekazujemy userId do formularza
              />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}