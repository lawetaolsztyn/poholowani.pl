// src/components/AnnouncementChatSection.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ChatWindow from './ChatWindow'; // Będziemy używać ChatWindow w środku
import './AnnouncementChatSection.css'; // Stwórz ten plik CSS

export default function AnnouncementChatSection({ announcement, currentUserId, userJwt }) {
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [errorConversations, setErrorConversations] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null); // ID aktywnego chatu, jeśli jeden jest otwarty

  const isAnnouncementOwner = announcement.user_id === currentUserId;

  // Funkcja do pobierania konwersacji dla danego ogłoszenia i użytkownika
  const fetchConversations = async () => {
    setLoadingConversations(true);
    setErrorConversations(null);
    try {
      let query = supabase.from('conversations').select(`
        id, created_at, last_message_at, last_message_content,
        client_id, carrier_id,
        client:client_id(full_name, company_name, role),
        carrier:carrier_id(full_name, company_name, role)
      `).eq('announcement_id', announcement.id);

      // Dla właściciela ogłoszenia (klienta): pokaż wszystkie konwersacje związane z tym ogłoszeniem
      if (isAnnouncementOwner) {
        query = query.eq('client_id', currentUserId); // Tylko konwersacje, gdzie ja jestem klientem ogłoszenia
      } else {
      // Dla przewoźnika: pokaż TYLKO jego konwersacje związane z tym ogłoszeniem
        query = query
          .eq('carrier_id', currentUserId)
          .eq('client_id', announcement.user_id); // Upewnij się, że klient to wystawca ogłoszenia
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

  useEffect(() => {
    if (announcement?.id && currentUserId) {
      fetchConversations();

      // Realtime subscription for new conversations or updates
      // This is a more general channel, then specific chat ones
      const channel = supabase
        .channel(`conversations_on_announcement:${announcement.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `announcement_id=eq.${announcement.id}` }, payload => {
          console.log('Realtime conversation change detected!', payload);
          // Refetch conversations when a change occurs in conversations table for this announcement
          fetchConversations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [announcement.id, currentUserId]); // Zależy od ID ogłoszenia i ID zalogowanego użytkownika


  // Funkcja do inicjowania/otwierania chatu
  const handleOpenChat = async (targetUserId) => {
    // targetUserId to ID drugiej osoby w konwersacji (albo client_id, albo carrier_id)
    if (!currentUserId || !userJwt) {
      alert('Musisz być zalogowany, aby rozpocząć rozmowę.');
      // Opcjonalnie: Przekierowanie do logowania z localStorage.setItem(...)
      return;
    }

    if (!announcement) {
      alert('Błąd: Brak ogłoszenia.');
      return;
    }

    const clientUserId = announcement.user_id;
    const carrierUserId = (isAnnouncementOwner && targetUserId) ? targetUserId : currentUserId; // Jeśli jestem właścicielem i klikam na przewoźnika, to przewoźnik jest targetUserId. W innym przypadku (przewoźnik klika sam), to ja jestem carrier.
                                                                                           // Upewnij się, że to logiczne, clientUserId to zawsze wystawca ogloszenia

    // Jeśli currentUserId to wystawca ogłoszenia, a targetUserId to ID przewoźnika
    // Jeśli currentUserId to przewoźnik, a targetUserId to ID klienta (wystawcy ogłoszenia)

    // Sprawdź, czy konwersacja już istnieje między clientUserId a carrierUserId dla TEGO ogłoszenia
    try {
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

        setActiveChatId(convId); // Otwórz ten chat
    } catch (err) {
        console.error("Error managing conversation:", err.message);
        alert(`Błąd podczas zarządzania konwersacją: ${err.message}`);
    }
  };


  if (loadingConversations) {
    return <div className="chat-section-loading">Ładowanie konwersacji...</div>;
  }

  if (errorConversations) {
    return <div className="chat-section-error">{errorConversations}</div>;
  }

  // Widok dla WŁAŚCICIELA OGŁOSZENIA (Klient): Lista konwersacji
  if (isAnnouncementOwner) {
    return (
      <div className="chat-section-container">
        <h3>Pytania i Oferty do Twojego Ogłoszenia</h3>
        {conversations.length === 0 && !activeChatId && (
          <p className="no-conversations-message">Brak pytań/ofert do tego ogłoszenia.</p>
        )}

        {/* Jeśli otwarty jest konkretny chat */}
        {activeChatId ? (
          <ChatWindow
            conversationId={activeChatId}
            currentUserId={currentUserId}
            userJwt={userJwt}
            onClose={() => setActiveChatId(null)} // Zamknij chat
          />
        ) : (
          // Lista konwersacji dla klienta
          <div className="conversation-list">
            {conversations.map(conv => (
              <div key={conv.id} className="conversation-card" onClick={() => setActiveChatId(conv.id)}>
                <div className="conversation-header">
                  <h4>
                    Od: {conv.carrier.company_name || conv.carrier.full_name || conv.carrier.email}
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
            ))}
          </div>
        )}
      </div>
    );
  } else {
    // Widok dla PRZEWOŹNIKA (lub innego zainteresowanego): Otwarty chat LUB przycisk "Zadaj pytanie"
    const existingConvForThisCarrier = conversations.find(conv => conv.carrier_id === currentUserId);

    return (
      <div className="chat-section-container">
        <h3>Twoja rozmowa dotycząca ogłoszenia "{announcement.title}"</h3>
        {activeChatId || existingConvForThisCarrier ? (
          // Jeśli jest aktywny chat lub już istnieje konwersacja z tym przewoźnikiem
          <ChatWindow
            conversationId={activeChatId || existingConvForThisCarrier?.id}
            currentUserId={currentUserId}
            userJwt={userJwt}
            onClose={() => setActiveChatId(null)} // W sumie przewoźnik nie zamyka sekcji, ale resetuje widok
          />
        ) : (
          // Przycisk "Zadaj pytanie" dla przewoźnika, jeśli nie ma jeszcze konwersacji
          <div className="no-active-chat-container">
            <p>Jesteś zainteresowany tym ogłoszeniem? Rozpocznij rozmowę z jego wystawcą.</p>
            <button className="action-button ask-question-button" onClick={() => handleOpenChat(currentUserId)}> {/* Przewoźnik inicjuje chat z klientem ogłoszenia */}
                <i className="fas fa-question-circle"></i> Zadaj pytanie
            </button>
          </div>
        )}
      </div>
    );
  }
}