// src/components/MyChats.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Navbar from './Navbar';
import Footer from './Footer';
import Modal from './Modal';
import ChatWindow from './ChatWindow';

import './MyChats.css';

export default function MyChats() {
  const { currentUser, loading: authLoading } = useAuth();
  const [userJwt, setUserJwt] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [error, setError] = useState(null);

  const [showChatModal, setShowChatModal] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeAnnouncementTitle, setActiveAnnouncementTitle] = useState('');

  // Funkcja fetchConversations dostępna globalnie w komponencie
  const fetchConversations = async () => {
    if (authLoading || !currentUser) {
      setLoadingConversations(false);
      setConversations([]);
      return;
    }

    setLoadingConversations(true);
    setError(null);

    try {
      const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      created_at,
      last_message_at,
      last_message_content,
      announcement:announcement_id (id, title, description, user_id),
      client:client_id (id, full_name, company_name, email, role),
      carrier:carrier_id (id, full_name, company_name, email, role),
      conversation_participants(unread_messages_count, user_id)
    `)
        .or(`client_id.eq.${currentUser.id},carrier_id.eq.${currentUser.id}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Przetwarzamy dane, aby uzyskać unread_count bezpośrednio w obiekcie konwersacji
      const processedConversations = data.map(conv => {
        const currentUserParticipation = conv.conversation_participants.find(p => p.user_id === currentUser.id);
        const unreadCount = currentUserParticipation ? currentUserParticipation.unread_messages_count : 0;
        return {
          ...conv,
          unread_count: unreadCount // Dodajemy nową właściwość unread_count
        };
      });

      setConversations(processedConversations); // Ustawiamy przetworzone konwersacje
    } catch (err) {
      console.error("Błąd ładowania konwersacji:", err.message);
      setError("Nie udało się załadować Twoich konwersacji: " + err.message);
    } finally {
      setLoadingConversations(false);
    }
  };

  // Pobranie JWT z supabase.auth.getSession()
  useEffect(() => {
    async function fetchSession() {
      const { data } = await supabase.auth.getSession();
      setUserJwt(data?.session?.access_token || '');
    }
    fetchSession();
  }, []);

  useEffect(() => {
    fetchConversations();

    // Subskrypcja Realtime na zmiany w konwersacjach i uczestnikach
    // Możesz chcieć nasłuchiwać na conversation_participants, aby natychmiast odświeżać count
    const conversationChannel = supabase
      .channel(`my_chats_updates_conv:${currentUser?.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `or(client_id.eq.${currentUser?.id},carrier_id.eq.${currentUser?.id})` // Upewnij się, że ten filtr jest poprawny
      }, payload => {
        console.log('Realtime conversation update for conversations detected!', payload);
        fetchConversations(); // Odśwież całą listę, gdy zmieni się konwersacja
      })
      .subscribe();

    // Dodatkowa subskrypcja na conversation_participants dla szybkich aktualizacji licznika
    const participantsChannel = supabase
      .channel(`my_chats_updates_part:${currentUser?.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', // Tylko UPDATE, bo INSERT to początek, a DELETE to usunięcie czatu
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${currentUser?.id}`
      }, payload => {
        console.log('Realtime conversation participants update detected!', payload);
        fetchConversations(); // Odśwież, gdy zmieni się licznik nieprzeczytanych
      })
      .subscribe();


    return () => {
      supabase.removeChannel(conversationChannel);
      supabase.removeChannel(participantsChannel); // Usuń oba kanały przy odmontowaniu
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
    // Odświeżenie listy konwersacji po zamknięciu modala
    // TO WYWOŁANIE jest KLUCZOWE, bo zresetuje licznik w MyChats po tym, jak ChatWindow go wyzeruje
    fetchConversations();
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
              const otherParticipant = conv.client.id === currentUser.id ? conv.carrier : conv.client;
              const otherParticipantName = otherParticipant?.company_name || otherParticipant?.full_name || otherParticipant?.email || 'Nieznany';
              const otherParticipantRole = otherParticipant?.role === 'firma' ? 'Przewoźnik' : (otherParticipant?.role === 'klient' ? 'Klient' : 'Użytkownik');

              // LICZNIK NIEPRZECZYTANYCH JEST TERAZ W conv.unread_count, dzięki wcześniejszemu mapowaniu
              // const unreadCount = 0; // TODO: licznik nieprzeczytanych - TA LINIA ZNIKA

              return (
                <div
                  key={conv.id}
                  className={`conversation-card ${conv.unread_count > 0 ? 'unread' : ''}`} // <-- UŻYJ conv.unread_count
                  onClick={() => handleOpenChat(conv.id, conv.announcement?.title)}
                >
                  <div className="card-header">
                    <h4>{conv.announcement?.title || 'Brak tytułu ogłoszenia'}</h4>
                    {conv.unread_count > 0 && <span className="unread-count">{conv.unread_count}</span>} {/* <-- UŻYJ conv.unread_count */}
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

      <Modal
        isOpen={showChatModal}
        onClose={handleCloseChatModal}
        title={`Chat: ${activeAnnouncementTitle}`}
      >
        {activeConversationId && (
          <ChatWindow
            conversationId={activeConversationId}
            currentUserId={currentUser.id}
            userJwt={userJwt}
            onClose={handleCloseChatModal}
          />
        )}
      </Modal>
    </>
  );
}