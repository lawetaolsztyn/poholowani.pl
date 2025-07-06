// src/components/MyChats.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Navbar from './Navbar';
import Footer from './Footer';
import Modal from './Modal';
import ChatWindow from './ChatWindow';

import './MyChats.css';

export default function MyChats() {
  const { currentUser, loading: authLoading, fetchTotalUnreadMessages } = useAuth();
  const [userJwt, setUserJwt] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [error, setError] = useState(null);

  const [showChatModal, setShowChatModal] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeAnnouncementTitle, setActiveAnnouncementTitle] = useState('');

  // Użycie useCallback dla funkcji fetchConversations
  const fetchConversations = useCallback(async () => {
    if (authLoading || !currentUser) {
      setLoadingConversations(false);
      setConversations([]);
      fetchTotalUnreadMessages(); // Upewnij się, że globalny licznik jest zresetowany
      return;
    }

    setLoadingConversations(true);
    setError(null);

    try {
      // Pobierz konwersacje z połączeniem do conversation_participants
      // Dodaj last_message_sender_id do selecta z `conversations`
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          created_at,
          last_message_at,
          last_message_content,
          last_message_sender_id, // DODANE: Potrzebne do logiki "nowych wiadomości od drugiej strony"
          announcement:announcement_id (id, title, description, user_id),
          client:client_id (id, full_name, company_name, email, role),
          carrier:carrier_id (id, full_name, company_name, email, role),
          conversation_participants (
            unread_messages_count,
            user_id,
            is_deleted,
            last_read_message_id // DODANE: Do precyzyjniejszego śledzenia
          )
        `)
        .or(`client_id.eq.${currentUser.id},carrier_id.eq.${currentUser.id}`)
        .order('last_message_at', { ascending: false }); // Sortuj po dacie ostatniej wiadomości

      if (error) throw error;

      let totalUnreadInMyChats = 0; // Lokalny licznik dla globalnego stanu powiadomień

      const processedConversations = data
        .map(conv => {
          const currentUserParticipation = conv.conversation_participants.find(p => p.user_id === currentUser.id);

          if (!currentUserParticipation) {
            console.warn(`Brak danych uczestnictwa dla konwersacji ${conv.id} dla użytkownika ${currentUser.id}`);
            return null; // Pomiń czat bez danych uczestnictwa
          }

          const isDeletedByMe = currentUserParticipation.is_deleted;
          const hasUnreadMessages = currentUserParticipation.unread_messages_count > 0;
          // Alternatywnie, jeśli unread_messages_count nie jest zawsze aktualne przez triggery:
          // const isLastMessageFromOther = conv.last_message_sender_id !== currentUser.id;
          // const myLastReadMessageId = currentUserParticipation.last_read_message_id;
          // const hasUnreadMessages = isLastMessageFromOther && conv.last_message_content && conv.last_message_id !== myLastReadMessageId;

          if (hasUnreadMessages) {
            totalUnreadInMyChats += currentUserParticipation.unread_messages_count;
          }

          // KLUCZOWA ZMIANA LOGIKI WIDOCZNOŚCI:
          // Czat jest widoczny, jeśli:
          // 1. NIE jest oznaczony jako usunięty PRZEZE MNIE (isDeletedByMe === false)
          // LUB
          // 2. JEST oznaczony jako usunięty PRZEZE MNIE (isDeletedByMe === true), ALE ma nieprzeczytane wiadomości
          const isVisible = !isDeletedByMe || (isDeletedByMe && hasUnreadMessages);

          return isVisible ? {
            ...conv,
            unread_count: currentUserParticipation.unread_messages_count, // Przekaż licznik nieprzeczytanych
            is_deleted_by_me: isDeletedByMe, // Przekaż status usunięcia przez obecnego użytkownika
          } : null;
        })
        .filter(Boolean); // Usuń wszystkie `null` (czaty, które nie są widoczne)

      setConversations(processedConversations);
      // Aktualizuj globalny licznik nieprzeczytanych wiadomości w AuthContext
      fetchTotalUnreadMessages(currentUser.id); // Wywołaj funkcję z AuthContext, która sama pobierze i ustawi
      // Jeśli AuthContext.jsx sam zlicza i odpytuje supabase, to ta linia może być wystarczająca.

    } catch (err) {
      console.error("Błąd ładowania konwersacji:", err.message);
      setError("Nie udało się załadować Twoich konwersacji: " + err.message);
    } finally {
      setLoadingConversations(false);
    }
  }, [authLoading, currentUser, fetchTotalUnreadMessages]); // Dodano fetchTotalUnreadMessages jako zależność do useCallback

  useEffect(() => {
    async function fetchSession() {
      const { data } = await supabase.auth.getSession();
      setUserJwt(data?.session?.access_token || '');
    }
    fetchSession();
  }, []);

  useEffect(() => {
    fetchConversations(); // Pierwsze ładowanie

    let conversationChannel;
    let participantsChannel;

    if (currentUser && currentUser.id) {
      // Subskrypcja na zmiany w tabeli 'conversations'
      conversationChannel = supabase
        .channel(`my_chats_updates_conv_global_${currentUser.id}`) // Unikalny kanał dla użytkownika
        .on('postgres_changes', {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'conversations',
          filter: `or(client_id.eq.${currentUser.id},carrier_id.eq.${currentUser.id})`
        }, (payload) => {
          console.log("Zmiana w conversations (realtime):", payload);
          // Jeśli nastąpiła zmiana w konwersacji, odśwież listę
          fetchConversations();
        })
        .subscribe();

      // Subskrypcja na zmiany w tabeli 'conversation_participants' (zmiana is_deleted, unread_messages_count)
      participantsChannel = supabase
        .channel(`my_chats_updates_part_${currentUser.id}`) // Unikalny kanał dla użytkownika
        .on('postgres_changes', {
          event: 'UPDATE', // Aktualizacje statusów uczestników
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${currentUser.id}` // Tylko zmiany dotyczące bieżącego użytkownika
        }, (payload) => {
          console.log("Zmiana w conversation_participants (realtime):", payload);
          fetchConversations(); // Odśwież listę konwersacji
        })
        .subscribe();
    }

    return () => {
      if (conversationChannel) supabase.removeChannel(conversationChannel);
      if (participantsChannel) supabase.removeChannel(participantsChannel);
    };
  }, [currentUser, fetchConversations]); // Zależności: currentUser i funkcja fetchConversations (przez useCallback)


  const handleOpenChat = async (conversationId, announcementTitle) => {
    setActiveConversationId(conversationId);
    setActiveAnnouncementTitle(announcementTitle);
    setShowChatModal(true);

    // KLUCZOWA ZMIANA: Po otwarciu czatu, oznacz go jako nie-usunięty i przeczytany dla TEGO użytkownika
    if (currentUser && conversationId) {
      try {
        const { error: updateError } = await supabase
          .from('conversation_participants')
          .update({
            is_deleted: false, // KLUCZOWE: Ustaw na false, aby czat był widoczny na liście
            unread_messages_count: 0, // Zresetuj licznik nieprzeczytanych wiadomości
            // last_read_message_id: <ID_OSTATNIEJ_WIADOMOSCI> // To powinno być aktualizowane przez ChatWindow lub trigger
          })
          .eq('conversation_id', conversationId)
          .eq('user_id', currentUser.id);

        if (updateError) throw updateError;

        // Odśwież konwersacje i globalny licznik po aktualizacji statusu
        fetchConversations();
        fetchTotalUnreadMessages(currentUser.id); // Odśwież licznik w Navbar
      } catch (error) {
        console.error('Błąd podczas oznaczania konwersacji jako przeczytanej/przywracania:', error.message);
      }
    }
  };


  const handleCloseChatModal = () => {
    setShowChatModal(false);
    setActiveConversationId(null);
    setActiveAnnouncementTitle('');
    // Po zamknięciu modalu, odśwież dane, aby upewnić się, że liczniki i statusy są aktualne
    fetchConversations();
    fetchTotalUnreadMessages(currentUser.id); // Odśwież globalny licznik w Navbar
  };

  // handleHideConversation - ta funkcja już ustawia is_deleted na true, co jest poprawne
  const handleHideConversation = async (conversationId) => {
    try {
      const confirmDelete = window.confirm('Czy na pewno chcesz usunąć tę rozmowę z listy? Będzie widoczna ponownie, jeśli otrzymasz nową wiadomość.');
      if (!confirmDelete) return;

      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_deleted: true })
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      fetchConversations(); // Odśwież listę po ukryciu
      fetchTotalUnreadMessages(currentUser.id); // Odśwież globalny licznik
    } catch (err) {
      alert('Błąd podczas ukrywania konwersacji: ' + err.message);
      console.error('Błąd podczas ukrywania konwersacji:', err.message);
    }
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
          <p className="no-chats-message">Nie masz jeszcze żadnych aktywnych konwersacji.</p>
        ) : (
          <div className="conversations-list">
            {conversations.map(conv => {
              const otherParticipant = conv.client.id === currentUser.id ? conv.carrier : conv.client;
              const otherParticipantName = otherParticipant?.company_name || otherParticipant?.full_name || otherParticipant?.email || 'Nieznany';
              const otherParticipantRole = otherParticipant?.role === 'firma' ? 'Przewoźnik' : (otherParticipant?.role === 'klient' ? 'Klient' : 'Użytkownik');

              const handleDeleteClick = async (e) => {
                e.stopPropagation();
                await handleHideConversation(conv.id);
              };

              return (
                <div
                  key={conv.id}
                  className={`conversation-card ${conv.unread_count > 0 ? 'unread' : ''}`}
                  onClick={() => handleOpenChat(conv.id, conv.announcement?.title)}
                  style={{ position: 'relative' }}
                >
                  <button
                    className="delete-chat-button"
                    onClick={handleDeleteClick}
                    aria-label="Usuń czat"
                    title="Usuń czat"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>

                  <div className="card-header">
                    <h4>{conv.announcement?.title || 'Brak tytułu ogłoszenia'}</h4>
                    {/* Tutaj unread_count jest pobierany z konw. participants */}
                    {conv.unread_count > 0 && <span className="unread-count">{conv.unread_count}</span>}
                  </div>
                  <p>Z: <strong>{otherParticipantName}</strong> ({otherParticipantRole})</p>
                  <p className="last-message">Ostatnia wiadomość: "{conv.last_message_content || 'Brak wiadomości'}"</p>
                  <small className="message-time">Ostatnia aktywność: {conv.last_message_at ? new Date(conv.last_message_at).toLocaleString() : new Date(conv.created_at).toLocaleString()}</small>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
            // Ważne: Jeśli ChatWindow wysyła wiadomości, musi tam być logika,
            // która aktualizuje 'conversations' i 'conversation_participants'
            // albo trigger w bazie danych.
          />
        )}
      </Modal>
      <Footer />
    </>
  );
}