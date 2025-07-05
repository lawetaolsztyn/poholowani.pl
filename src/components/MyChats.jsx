// src/components/MyChats.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../../AuthContext.jsx'; // Pamiętaj o .jsx
import Navbar from './Navbar';
import Footer from './Footer';
import Modal from './Modal';
import ChatWindow from './ChatWindow';

import './MyChats.css';

export default function MyChats() {
  const { currentUser, loading: authLoading } = useAuth();
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
            announcement:announcement_id (id, title, description, user_id),
            client:client_id (id, full_name, company_name, email, role),
            carrier:carrier_id (id, full_name, company_name, email, role)
          `) // <--- USUNIĘTO KOMENTARZE WEWNĄTRZ STRINGA SELECT()
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

  }, [currentUser, authLoading]);

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
    // To jest miejsce, gdzie trzeba by zaimplementować logiczne oznaczenie jako przeczytane.
    // Na razie: po prostu odświeżenie listy, żeby ewentualne nowe wiadomości były widoczne.
    fetchConversations(); // Odświeżenie całej listy po zamknięciu chatu
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
            userJwt={currentUser?.jwt || ''}
            onClose={handleCloseChatModal}
          />
        )}
      </Modal>
    </>
  );
}