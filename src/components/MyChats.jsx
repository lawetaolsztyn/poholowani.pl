// src/components/MyChats.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext'; // Upewnij się, że to jest zaimportowane
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

  // Pobieraj tylko konwersacje NIEUSUNIĘTE przez danego użytkownika
  const fetchConversations = async () => {
    if (authLoading || !currentUser) {
      setLoadingConversations(false);
      setConversations([]);
      return;
    }

    setLoadingConversations(true);
    setError(null);

    try {
      // Pobierz konwersacje z połączeniem do conversation_participants i filtruj po is_deleted = false
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
          conversation_participants (
            unread_messages_count,
            user_id,
            is_deleted
          )
        `)
        .or(`client_id.eq.${currentUser.id},carrier_id.eq.${currentUser.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Filtruj po is_deleted = false dla aktualnego usera
      const visibleConversations = data.filter(conv => {
        const participation = conv.conversation_participants.find(p => p.user_id === currentUser.id);
        return participation && participation.is_deleted === false;
      });

      // Dodaj unread_count
      const processedConversations = visibleConversations.map(conv => {
        const currentUserParticipation = conv.conversation_participants.find(p => p.user_id === currentUser.id);
        return {
          ...conv,
          unread_count: currentUserParticipation ? currentUserParticipation.unread_messages_count : 0
        };
      });

      setConversations(processedConversations);
    } catch (err) {
      console.error("Błąd ładowania konwersacji:", err.message);
      setError("Nie udało się załadować Twoich konwersacji: " + err.message);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    async function fetchSession() {
      const { data } = await supabase.auth.getSession();
      setUserJwt(data?.session?.access_token || '');
    }
    fetchSession();
  }, []);

  useEffect(() => {
    fetchConversations();

    let conversationChannel;
    let participantsChannel;

    if (currentUser && currentUser.id) {
      conversationChannel = supabase
        .channel(`my_chats_updates_conv:${currentUser.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `or(client_id.eq.${currentUser.id},carrier_id.eq.${currentUser.id})`
        }, () => fetchConversations())
        .subscribe();

      participantsChannel = supabase
        .channel(`my_chats_updates_part:${currentUser.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${currentUser.id}`
        }, () => fetchConversations())
        .subscribe();
    }

    return () => {
      if (conversationChannel) supabase.removeChannel(conversationChannel);
      if (participantsChannel) supabase.removeChannel(participantsChannel);
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
    fetchConversations();
    if (currentUser) fetchTotalUnreadMessages(currentUser.id);
  };

  // Ustaw is_deleted = true dla konwersacji dla aktualnego użytkownika (ukrycie)
  const handleHideConversation = async (conversationId) => {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_deleted: true })
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      fetchConversations();
    } catch (err) {
      alert('Błąd podczas ukrywania konwersacji: ' + err.message);
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
          <p>Nie masz jeszcze żadnych aktywnych konwersacji.</p>
        ) : (
          <div className="conversations-list">
            {conversations.map(conv => {
              const otherParticipant = conv.client.id === currentUser.id ? conv.carrier : conv.client;
              const otherParticipantName = otherParticipant?.company_name || otherParticipant?.full_name || otherParticipant?.email || 'Nieznany';
              const otherParticipantRole = otherParticipant?.role === 'firma' ? 'Przewoźnik' : (otherParticipant?.role === 'klient' ? 'Klient' : 'Użytkownik');

              const handleDeleteClick = async (e) => {
                e.stopPropagation();
                const confirmDelete = window.confirm('Czy na pewno chcesz usunąć tę rozmowę?');
                if (!confirmDelete) return;
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
                    aria-label="Ukryj czat"
                    title="Ukryj czat"
                  >
                    🗑️
                  </button>

                  <div className="card-header">
                    <h4>{conv.announcement?.title || 'Brak tytułu ogłoszenia'}</h4>
                    {conv.unread_count > 0 && <span className="unread-count">{conv.unread_count}</span>}
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
      <Footer />
    </>
  );
}
