// src/components/AnnouncementChatSection.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ChatWindow from './ChatWindow';
import './AnnouncementChatSection.css';

export default function AnnouncementChatSection({ announcement, currentUserId, userJwt, onAskQuestionRedirect }) {
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [errorConversations, setErrorConversations] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null); // ID aktywnego chatu
  const [activeChatParticipantsData, setActiveChatParticipantsData] = useState({}); // Dane uczestników aktywnego chatu

  const isAnnouncementOwner = announcement.user_id === currentUserId;

  // Funkcja do pobierania danych uczestników dla konkretnej konwersacji
  const fetchParticipantsDataForChat = async (convId) => {
    try {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('client_id, carrier_id')
        .eq('id', convId)
        .single();

      if (convError) throw convError;

      if (conversation) {
        const participantIds = [conversation.client_id, conversation.carrier_id];
        const { data: usersData, error: usersError } = await supabase
          .from('users_extended')
          .select('id, full_name, company_name, email, role')
          .in('id', participantIds);

        if (usersError) throw usersError;

        const pData = {};
        usersData.forEach(user => {
          pData[user.id] = {
            id: user.id,
            name: user.role === 'firma' ? user.company_name : user.full_name || user.email,
            role: user.role
          };
        });
        setActiveChatParticipantsData(pData); // Ustawiamy dane uczestników dla aktywnego chatu
      }
    } catch (err) {
      console.error('Błąd pobierania danych uczestników chatu:', err.message);
      setErrorConversations('Nie udało się załadować danych uczestników chatu.');
    }
  };


  // Funkcja do pobierania listy konwersacji (dla właściciela ogłoszenia lub przewoźnika)
  const fetchConversations = async () => {
    setLoadingConversations(true);
    setErrorConversations(null);
    try {
      let query = supabase.from('conversations').select(`
        id, created_at, last_message_at, last_message_content,
        client_id, carrier_id,
        client:client_id(full_name, company_name, role, id), /* DODANO ID W SELECT */
        carrier:carrier_id(full_name, company_name, role, id) /* DODANO ID W SELECT */
      `).eq('announcement_id', announcement.id);

      if (isAnnouncementOwner) {
        query = query.eq('client_id', currentUserId);
      } else {
        query = query.eq('carrier_id', currentUserId);
      }

      const { data, error } = await query.order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data);
    } catch (err) {
      console.error('Błąd ładowania konwersacji:', err.message);
      setErrorConversations('Nie udało się załadować konwersacji.');
    } finally {
      setLoadingConversations(false);
    }
  };

  // Efekt do ładowania listy konwersacji i subskrypcji Realtime
  useEffect(() => {
    if (announcement?.id && currentUserId) {
      fetchConversations();

      const channel = supabase
        .channel(`conversations_on_announcement:${announcement.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `announcement_id=eq.${announcement.id}` }, payload => {
          // console.log('Realtime conversation change detected!', payload);
          fetchConversations(); // Odśwież listę konwersacji
          // Jeśli aktywny chat został zaktualizowany, pobierz jego uczestników ponownie
          if (activeChatId && (payload.new?.id === activeChatId || payload.old?.id === activeChatId)) {
              fetchParticipantsDataForChat(activeChatId);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [announcement.id, currentUserId, activeChatId]); // Zależność od activeChatId dla odświeżenia danych uczestników chatu

  // Efekt do pobierania danych uczestników aktywnego chatu, gdy activeChatId się zmieni
  useEffect(() => {
      if (activeChatId) {
          fetchParticipantsDataForChat(activeChatId);
      } else {
          setActiveChatParticipantsData({}); // Wyczyść dane uczestników, gdy chat nie jest aktywny
      }
  }, [activeChatId]); // Ten efekt reaguje na zmianę aktywnego ID chatu


  // Funkcja do inicjowania/otwierania chatu
  const handleOpenChat = async (targetUserId) => {
    // Sprawdź, czy użytkownik jest zalogowany
    if (!currentUserId || !userJwt) {
      onAskQuestionRedirect(); // Wywołaj funkcję z AnnouncementsPage do przekierowania
      return;
    }

    if (!announcement) {
      alert('Błąd: Brak ogłoszenia.');
      return;
    }

    const clientUserId = announcement.user_id;
    const carrierUserId = currentUserId; // Zalogowany użytkownik jest inicjatorem (przewoźnikiem w tej konw.)

    // WAŻNE: Nie można zadawać pytań do własnego ogłoszenia (walidacja już w AnnouncementsPage, ale podwójnie nie zaszkodzi)
    if (clientUserId === currentUserId) {
      alert('Nie możesz zadać pytania do własnego ogłoszenia.');
      return;
    }

    try {
      // Szukamy konwersacji, gdzie client_id to klient ORAZ carrier_id to ja
      // LUB gdzie client_id to ja ORAZ carrier_id to klient (obsługa obu stron)
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('announcement_id', announcement.id)
        .or(`and(client_id.eq.${clientUserId},carrier_id.eq.${carrierUserId}),and(client_id.eq.${carrierUserId},carrier_id.eq.${clientUserId})`) 
        .single();

      let convId;

      if (findError && findError.code !== 'PGRST116') { // PGRST116 means no rows found, which is OK for new conv
        throw findError;
      }

      if (existing) {
        convId = existing.id;
        console.log("Existing conversation found:", convId);
      } else {
        console.log("Creating new conversation...");
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            announcement_id: announcement.id,
            client_id: clientUserId,
            carrier_id: carrierUserId,
            last_message_at: new Date().toISOString(),
            last_message_content: ''
          })
          .select('id')
          .single();

        if (createError) throw createError;
        convId = newConv.id;
        console.log("New conversation created:", convId);
      }

      setActiveChatId(convId); // Ustaw ID aktywnego chatu, aby wyrenderować ChatWindow
    } catch (err) {
      console.error("Error managing conversation:", err.message);
      setErrorConversations(`Błąd podczas zarządzania konwersacją: ${err.message}`);
    }
  };


  if (loadingConversations) {
    return <div className="chat-section-loading">Ładowanie konwersacji...</div>;
  }

  if (errorConversations) {
    return <div className="chat-section-error">{errorConversations}</div>;
  }

  // --- RENDERING WIDOKÓW CHATU ---
  // Jeśli jest aktywny chat (activeChatId jest ustawione), renderuj ChatWindow
  if (activeChatId) {
    return (
      <div className="chat-section-container">
        {/* Przycisk powrotu do listy konwersacji/ogłoszenia */}
        <button className="back-to-conversations-button" onClick={() => setActiveChatId(null)}>
          ← Wróć do rozmów
        </button>
        {/* ChatWindow */}
        <ChatWindow
          conversationId={activeChatId}
          currentUserId={currentUserId}
          userJwt={userJwt}
          participantsData={activeChatParticipantsData} // PRZEKAZUJEMY POBRANE DANE UCZESTNIKÓW
          onClose={() => setActiveChatId(null)} // Przyciskiem w ChatWindow można zamknąć, wracając do listy
        />
      </div>
    );
  }

  // Jeśli nie jest aktywny żaden chat, renderuj listę konwersacji (dla właściciela)
  // LUB przycisk "Zadaj pytanie" (dla przewoźnika)
  if (isAnnouncementOwner) {
    return (
      <div className="chat-section-container">
        <h3>Pytania i Oferty do Twojego Ogłoszenia</h3>
        {conversations.length === 0 ? (
          <p className="no-conversations-message">Brak pytań/ofert do tego ogłoszenia.</p>
        ) : (
          <div className="conversation-list">
            {conversations.map(conv => {
              // Określenie nazwy drugiej strony w konwersacji dla wyświetlenia na karcie
              const otherParticipant = conv.client_id === currentUserId ? conv.carrier : conv.client;
              return (
                <div key={conv.id} className="conversation-card" onClick={() => setActiveChatId(conv.id)}>
                  <div className="conversation-header">
                    <h4>
                      Od: {otherParticipant?.company_name || otherParticipant?.full_name || otherParticipant?.email || 'Nieznany'}
                    </h4>
                    <span className="last-message-time">
                      {new Date(conv.last_message_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="last-message-content">
                    {conv.last_message_content || "Brak wiadomości"}
                  </p>
                  <button className="open-conversation-button">Otwórz rozmowę</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  } else {
    // Widok dla PRZEWOŹNIKA (lub innego zainteresowanego): przycisk "Zadaj pytanie"
    // Sprawdź, czy przewoźnik już ma konwersację z tym ogłoszeniem.
    const existingConvForThisCarrier = conversations.find(conv => conv.carrier_id === currentUserId);

    if (existingConvForThisCarrier) {
      // Jeśli przewoźnik już ma konwersację, otwórz ją od razu
      // Będzie to ten sam widok ChatWindow, co powyżej.
      // Ustawiamy activeChatId i pobieramy dane uczestników
      setActiveChatId(existingConvForThisCarrier.id);
      return (
        <div className="chat-section-container">
            {activeChatId && (
                <ChatWindow
                    conversationId={activeChatId}
                    currentUserId={currentUserId}
                    userJwt={userJwt}
                    participantsData={activeChatParticipantsData}
                    onClose={() => setActiveChatId(null)}
                />
            )}
        </div>
      );
    } else {
      // Jeśli przewoźnik nie ma jeszcze konwersacji, pokaż przycisk "Zadaj pytanie"
      return (
        <div className="chat-section-container">
          <h3>Twoja rozmowa dotycząca ogłoszenia "{announcement.title}"</h3>
          <div className="no-active-chat-container">
            <p>Jesteś zainteresowany tym ogłoszeniem? Rozpocznij rozmowę z jego wystawcą.</p>
            <button className="action-button ask-question-button" onClick={() => handleOpenChat(currentUserId)}>
                <i className="fas fa-question-circle"></i> Zadaj pytanie
            </button>
          </div>
        </div>
      );
    }
  }
}