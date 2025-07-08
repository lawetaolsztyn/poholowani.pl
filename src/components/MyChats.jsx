// src/components/MyChats.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  // Referencje do kanałów WebSocket
  const conversationChannelRef = useRef(null);
  const participantsChannelRef = useRef(null);

  // ZMIENIONA FUNKCJA fetchConversations
  const fetchConversations = useCallback(async () => {
    // console.log("MyChats: Wywołano fetchConversations. authLoading:", authLoading, " currentUser:", !!currentUser);
    // Warunek dla ładowania konwersacji:
    // Czekamy, aż authLoading będzie false, ORAZ currentUser będzie obiektem.
    // Jeśli currentUser jest null, ale authLoading już zakończone, oznacza to, że użytkownik nie jest zalogowany.
    if (authLoading || !currentUser) {
        if (!authLoading && currentUser === null) { // Użytkownik definitywnie wylogowany (authLoading zakończone, user null)
             setLoadingConversations(false);
             setConversations([]);
             fetchTotalUnreadMessages(); // Zresetuj licznik nieprzeczytanych dla wylogowanego użytkownika
        } else {
            // authLoading jest true LUB currentUser jest null (ale authLoading jeszcze trwa)
            // W tej sytuacji czekamy, nie resetujemy konwersacji, tylko upewniamy się, że loading jest aktywne.
            setLoadingConversations(true); 
        }
        return;
    }

    // Od tego momentu wiemy, że authLoading jest false I currentUser jest dostępne (użytkownik jest zalogowany)
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
          last_message_sender_id, 
          announcement:announcement_id (id, title, description, user_id),
          client:client_id (id, full_name, company_name, email, role),
          carrier:carrier_id (id, full_name, company_name, email, role),
          conversation_participants (
            unread_messages_count,
            user_id,
            is_deleted,
            last_read_message_id 
          )
        `)
        .or(`client_id.eq.${currentUser.id},carrier_id.eq.${currentUser.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const processedConversations = data
        .map(conv => {
          const currentUserParticipation = conv.conversation_participants?.find(p => p.user_id === currentUser.id);

          if (!currentUserParticipation) {
            console.warn(`Brak danych uczestnictwa dla konwersacji ${conv.id} dla użytkownika ${currentUser.id}`);
            return null; 
          }

          const isDeletedByMe = currentUserParticipation.is_deleted;
          const hasUnreadMessages = currentUserParticipation.unread_messages_count > 0;
          
          const isVisible = !isDeletedByMe || (isDeletedByMe && hasUnreadMessages);

          return isVisible ? {
            ...conv,
            unread_count: currentUserParticipation.unread_messages_count, 
            is_deleted_by_me: isDeletedByMe, 
          } : null;
        })
        .filter(Boolean); 

      setConversations(processedConversations);
      fetchTotalUnreadMessages(currentUser.id); 

    } catch (err) {
      console.error("MyChats: Błąd ładowania konwersacji:", err.message);
      setError("Nie udało się załadować Twoich konwersacji: " + err.message);
    } finally {
      setLoadingConversations(false);
    }
  }, [authLoading, currentUser, fetchTotalUnreadMessages]); // Zależności bez zmian

  // Ten useEffect pobiera początkowy JWT raz po zamontowaniu komponentu
  useEffect(() => {
    async function fetchInitialSessionJwt() {
      const { data } = await supabase.auth.getSession();
      setUserJwt(data?.session?.access_token || '');
      console.log('MyChats: Initial JWT fetch complete. Has JWT:', !!data?.session?.access_token);
    }
    fetchInitialSessionJwt();
  }, []);

  // NOWY, dedykowany useEffect do zarządzania kanałami Realtime
  // Uruchamia się tylko, gdy currentUser.id lub userJwt się zmieni
  useEffect(() => {
    // console.log("MyChats: useEffect do zarządzania kanałami Realtime uruchomiony."); 

    // Najpierw usuń wszystkie istniejące kanały
    if (conversationChannelRef.current) {
        console.log('MyChats: Usuwam istniejący kanał konwersacji.');
        supabase.removeChannel(conversationChannelRef.current);
        conversationChannelRef.current = null;
    }
    if (participantsChannelRef.current) {
        console.log('MyChats: Usuwam istniejący kanał uczestników.');
        supabase.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
    }

    // Subskrybuj tylko, jeśli mamy zalogowanego użytkownika i aktualny token JWT
    if (currentUser && currentUser.id && userJwt) {
      console.log('MyChats: Próbuję zasubskrybować kanały Realtime z aktualnym JWT.');
      
      const conversationChannel = supabase
        .channel(`my_chats_updates_conv_global_${currentUser.id}`) 
        .on('postgres_changes', {
          event: '*', 
          schema: 'public',
          table: 'conversations',
          filter: `or(client_id.eq.${currentUser.id},carrier_id.eq.${currentUser.id})`
        }, (payload) => {
          console.log("MyChats: Zmiana w conversations (realtime) – trigger fetchConversations.", payload);
          fetchConversations(); // Wywołaj pobieranie danych po zmianie
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('🟢 MyChats: WebSocket SUBSCRIBED to conversations!');
          } else {
            console.warn('🔴 MyChats: Problem z subskrypcją WebSocket dla konwersacji:', status);
          }
        });
        conversationChannelRef.current = conversationChannel;

      const participantsChannel = supabase
        .channel(`my_chats_updates_part_${currentUser.id}`) 
        .on('postgres_changes', {
          event: 'UPDATE', 
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${currentUser.id}` 
        }, (payload) => {
          console.log("MyChats: Zmiana w conversation_participants (realtime) – trigger fetchConversations.", payload);
          fetchConversations(); // Wywołaj pobieranie danych po zmianie
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('🟢 MyChats: WebSocket SUBSCRIBED to participants!');
          } else {
            console.warn('🔴 MyChats: Problem z subskrypcją WebSocket dla uczestników:', status);
          }
        });
        participantsChannelRef.current = participantsChannel;

    } else {
        console.log("MyChats: Brak użytkownika lub JWT, nie subskrybuję kanałów Realtime.");
    }

    // Funkcja czyszcząca: usuwa kanały przy odmontowaniu komponentu lub zmianie zależności
    return () => {
      if (conversationChannelRef.current) {
          console.log('MyChats: Czyszczę kanał konwersacji przy unmount/dependency change.');
          supabase.removeChannel(conversationChannelRef.current);
          conversationChannelRef.current = null;
      }
      if (participantsChannelRef.current) {
          console.log('MyChats: Czyszczę kanał uczestników przy unmount/dependency change.');
          supabase.removeChannel(participantsChannelRef.current);
          participantsChannelRef.current = null;
      }
    };
  }, [currentUser?.id, userJwt]); // Zależności: tylko ID użytkownika i JWT. NIE fetchConversations

  // Ten useEffect wywołuje fetchConversations na początku i gdy zaleznosci sie zmieniaja.
  // Jest odpowiedzialny za pobranie danych o konwersacjach.
  useEffect(() => {
      // console.log("MyChats: Pierwszy useEffect uruchomiony, wywołuję fetchConversations.");
      fetchConversations();
  }, [fetchConversations]); // Zależność tylko od fetchConversations

  // useEffect do obsługi Page Visibility API - BEZ ZMIAN W TEJ WERSJI
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log("👀 MyChats: Zakładka stała się widoczna. Odświeżam sesję i konwersacje...");
        const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
        if (sessionError) {
          console.error("MyChats: Błąd odświeżania sesji po wznowieniu widoczności:", sessionError.message);
        } else if (session) {
          setUserJwt(session.access_token || '');
          console.log('MyChats: Sesja odświeżona. Ustawiam nowe JWT. Ma JWT:', !!session.access_token);
        } else {
          console.log('MyChats: Sesja nie odświeżona, brak sesji po refreshSession.');
          setUserJwt(''); 
        }

        // DODATKOWE OPÓŹNIENIE - TYLKO DO DIAGNOSTYKI!
        // Jeśli ten krok pomoże, problemem jest race condition.
        // Po udanej diagnozie, ten Promise.all usuwamy i sprawdzamy inne rozwiązania.
        await new Promise(resolve => setTimeout(resolve, 200)); 
        console.log('MyChats: Opóźnienie zakończone. Wywołuję fetchConversations.');

        fetchConversations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchConversations, setUserJwt]);

  const handleOpenChat = async (conversationId, announcementTitle) => {
    setActiveConversationId(conversationId);
    setActiveAnnouncementTitle(announcementTitle);
    setShowChatModal(true);

    if (currentUser && conversationId) {
      try {
        const { error: updateError } = await supabase
          .from('conversation_participants')
          .update({
            is_deleted: false, 
            unread_messages_count: 0, 
          })
          .eq('conversation_id', conversationId)
          .eq('user_id', currentUser.id);

        if (updateError) throw updateError;
        fetchConversations();
        fetchTotalUnreadMessages(currentUser.id); 
      } catch (error) {
        console.error('MyChats: Błąd podczas oznaczania konwersacji jako przeczytanej/przywracania:', error.message);
      }
    }
  };

  const handleCloseChatModal = () => {
    setShowChatModal(false);
    setActiveConversationId(null);
    setActiveAnnouncementTitle('');
    fetchConversations();
    fetchTotalUnreadMessages(currentUser.id); 
  };

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
      fetchConversations(); 
      fetchTotalUnreadMessages(currentUser.id); 
    } catch (err) {
      alert('MyChats: Błąd podczas ukrywania konwersacji: ' + err.message);
      console.error('MyChats: Błąd podczas ukrywania konwersacji:', err.message);
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
          />
        )}
      </Modal>
      
    </>
  );
}