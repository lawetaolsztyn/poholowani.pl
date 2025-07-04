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
        setActiveChatParticipantsData(pData);
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
        client:client_id(full_name, company_name, role, id), 
        carrier:carrier_id(full_name, company_name, role, id) 
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
          fetchConversations();
          if (activeChatId && (payload.new?.id === activeChatId || payload.old?.id === activeChatId)) {
              fetchParticipantsDataForChat(activeChatId);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [announcement.id, currentUserId, activeChatId]);

  // Efekt do pobierania danych uczestników aktywnego chatu, gdy activeChatId się zmieni
  useEffect(() => {
      if (activeChatId) {
          fetchParticipantsDataForChat(activeChatId);
      } else {
          setActiveChatParticipantsData({});
      }
  }, [activeChatId]);


  // Funkcja do inicjowania/otwierania chatu
  const handleOpenChat = async (targetUserId) => {
    if (!currentUserId || !userJwt) {
      onAskQuestionRedirect();
      return;
    }

    if (!announcement) {
      alert('Błąd: Brak ogłoszenia.');
      return;
    }

    const clientUserId = announcement.user_id;
    const carrierUserId = currentUserId;

    if (clientUserId === currentUserId) {
      alert('Nie możesz zadać pytania do własnego ogłoszenia.');
      return;
    }

    try {
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('announcement_id', announcement.id)
        .or(`and(client_id.eq.${clientUserId},carrier_id.eq.${carrierUserId}),and(client_id.eq.${carrierUserId},carrier_id.eq.${clientUserId})`) 
        .single();

      let convId;

      if (findError && findError.code !== 'PGRST116') { 
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

      setActiveChatId(convId);
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

  if (activeChatId) {
    return (
      <div className="chat-section-container">
        <button className="back-to-conversations-button" onClick={() => setActiveChatId(null)}>
          ← Wróć do rozmów
        </button>
        <ChatWindow
          conversationId={activeChatId}
          currentUserId={currentUserId}
          userJwt={userJwt}
          participantsData={activeChatParticipantsData}
          onClose={() => setActiveChatId(null)}
        />
      </div>
    );
  }

  if (isAnnouncementOwner) {
    return (
      <div className="chat-section-container">
        <h3>Pytania i Oferty do Twojego Ogłoszenia</h3>
        {conversations.length === 0 ? (
          <p className="no-conversations-message">Brak pytań/ofert do tego ogłoszenia.</p>
        ) : (
          <div className="conversation-list">
            {conversations.map(conv => {
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
    const existingConvForThisCarrier = conversations.find(conv => conv.carrier_id === currentUserId);

    if (existingConvForThisCarrier) {
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