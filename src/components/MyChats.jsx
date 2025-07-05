// src/components/MyChats.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext'; // Potrzebne do pobrania ID użytkownika
import Navbar from '../Navbar'; // Nadal dodajemy Navbar zgodnie z Twoimi preferencjami
import Footer from './Footer'; // Dodaj też Footer, bo to będzie osobna strona
import Modal from './Modal'; // Będziemy używać Modala do wyświetlania ChatWindow
import ChatWindow from './ChatWindow'; // Komponent okna czatu


import './MyChats.css'; // Plik CSS dla tego komponentu

export default function MyChats() {
  const { currentUser, loading: authLoading } = useAuth(); // Pobieramy dane użytkownika
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [error, setError] = useState(null);

  const [showChatModal, setShowChatModal] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeAnnouncementTitle, setActiveAnnouncementTitle] = useState('');


  useEffect(() => {
    const fetchConversations = async () => {
      if (authLoading || !currentUser) {
        setLoadingConversations(false);
        setConversations([]);
        return;
      }

      setLoadingConversations(true);
      setError(null);

      try {
        // Kluczowe zapytanie: pobierz konwersacje, w których użytkownik jest klientem LUB przewoźnikiem
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            id,
            created_at,
            last_message_at,
            last_message_content,
            announcement:announcement_id (id, title, description, user_id), // Dane ogłoszenia
            client:client_id (id, full_name, company_name, email, role), // Dane klienta
            carrier:carrier_id (id, full_name, company_name, email, role)  // Dane przewoźnika
          `)
          .or(`client_id.eq.${currentUser.id},carrier_id.eq.${currentUser.id}`) // Filtr: user.id jest albo klientem, albo przewoźnikiem
          .order('last_message_at', { ascending: false }); // Sortuj po ostatniej wiadomości

        if (error) {
          throw error;
        }

        setConversations(data);
      } catch (err) {
        console.error("Błąd ładowania konwersacji:", err.message);
        setError("Nie udało się załadować Twoich konwersacji: " + err.message);
      } finally {
        setLoadingConversations(false);
      }
    };

    fetchConversations();

    // Subskrypcja Realtime na zmiany w konwersacjach, aby odświeżać listę
    // Ta subskrypcja powinna być bardziej zaawansowana, aby filtrować tylko istotne zmiany
    // Na razie, prosty refresh listy
    const channel = supabase
      .channel(`my_chats_updates:${currentUser?.id}`) // Dedykowany kanał dla danego użytkownika
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversations', 
        filter: `client_id=eq.${currentUser?.id}` // Filtrowanie dla klienta
      }, payload => {
        console.log('Realtime conversation update for client detected!', payload);
        fetchConversations();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversations', 
        filter: `carrier_id=eq.${currentUser?.id}` // Filtrowanie dla przewoźnika
      }, payload => {
        console.log('Realtime conversation update for carrier detected!', payload);
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [currentUser, authLoading]); // Zależności: currentUser, authLoading

  const handleOpenChat = (conversationId, announcementTitle) => {
    setActiveConversationId(conversationId);
    setActiveAnnouncementTitle(announcementTitle);
    setShowChatModal(true);
  };

  const handleCloseChatModal = () => {
    setShowChatModal(false);
    setActiveConversationId(null);
    setActiveAnnouncementTitle('');
    // Po zamknięciu modala, odśwież listę konwersacji, aby zaktualizować status nieprzeczytanych
    // Jeśli używasz is_read w tabeli messages i zliczasz, musisz to zaimplementować.
    // fetchConversations(); // Odświeżenie całej listy po zamknięciu chatu
  };

  if (authLoading || loadingConversations) {
    return (
      <>
        <Navbar />
        <div className="my-chats-container">
          <h1>Moje Chaty</h1>
          <p>Ładowanie Twoich konwersacji...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="my-chats-container">
          <h1>Moje Chaty</h1>
          <p className="error-message">Błąd: {error}</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <Navbar />
        <div className="my-chats-container">
          <h1>Moje Chaty</h1>
          <p>Musisz być zalogowany, aby zobaczyć swoje konwersacje.</p>
          {/* Możesz dodać przycisk do logowania */}
          {/* <button className="action-button" onClick={() => navigate('/login')}>Zaloguj się</button> */}
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="my-chats-container">
        <h1>Moje Chaty</h1>
        {conversations.length === 0 ? (
          <p>Nie masz jeszcze żadnych aktywnych konwersacji.</p>
        ) : (
          <div className="conversations-list">
            {conversations.map(conv => {
              // Określ, kto jest drugą stroną w konwersacji
              const otherParticipant = conv.client.id === currentUser.id ? conv.carrier : conv.client;
              const otherParticipantName = otherParticipant?.company_name || otherParticipant?.full_name || otherParticipant?.email || 'Nieznany';
              const otherParticipantRole = otherParticipant?.role === 'firma' ? 'Przewoźnik' : (otherParticipant?.role === 'klient' ? 'Klient' : 'Użytkownik');

              // TODO: Tutaj będziesz musiał/a zaimplementować logikę liczenia nieprzeczytanych wiadomości.
              // Na razie będzie to placeholder
              const unreadCount = 0; // Zastąp to rzeczywistym licznikiem

              return (
                <div key={conv.id} className="conversation-card" onClick={() => handleOpenChat(conv.id, conv.announcement?.title)}>
                  <div className="card-header">
                    <h4>{conv.announcement?.title || 'Brak tytułu ogłoszenia'}</h4>
                    {unreadCount > 0 && <span className="unread-count">{unreadCount}</span>}
                  </div>
                  <p>Z: <strong>{otherParticipantName}</strong> ({otherParticipantRole})</p>
                  <p className="last-message">Ostatnia wiadomość: "{conv.last_message_content || 'Brak wiadomości'}"</p>
                  <small className="message-time">Ostatnia aktywność: {new Date(conv.last_message_at).toLocaleString()}</small>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />

      {/* Modal do wyświetlania okna czatu */}
      <Modal 
        isOpen={showChatModal} 
        onClose={handleCloseChatModal} 
        title={`Chat: ${activeAnnouncementTitle}`}
      >
        {activeConversationId && (
          <ChatWindow
            conversationId={activeConversationId}
            currentUserId={currentUser?.id}
            userJwt={currentUser?.jwt || ''} // Przekazuj JWT, jeśli masz
            onClose={handleCloseChatModal}
          />
        )}
      </Modal>
    </>
  );
}