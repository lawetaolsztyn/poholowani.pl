// src/components/AnnouncementChatSection.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ChatWindow from './ChatWindow';
import './AnnouncementChatSection.css';

// ZMIANA: Dodajemy prop onAskQuestionRedirect do obsługi przekierowania
export default function AnnouncementChatSection({ announcement, currentUserId, userJwt, onAskQuestionRedirect }) {
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [errorConversations, setErrorConversations] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);

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
        query = query.eq('client_id', currentUserId);
      } else {
      // Dla przewoźnika: pokaż TYLKO jego konwersacje związane z tym ogłoszeniem
        query = query
          .eq('carrier_id', currentUserId)
          .eq('client_id', announcement.user_id);
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
    // ZMIANA: Dodajemy warunek, aby fetchConversations było wywoływane tylko jeśli user jest zalogowany
    if (announcement?.id && currentUserId) {
      fetchConversations();

      const channel = supabase
        .channel(`conversations_on_announcement:${announcement.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `announcement_id=eq.${announcement.id}` }, payload => {
          console.log('Realtime conversation change detected!', payload);
          fetchConversations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Jeśli użytkownik nie jest zalogowany, ustawiamy loading na false od razu
      setLoadingConversations(false);
      setConversations([]); // Upewnij się, że lista konwersacji jest pusta
    }
  }, [announcement.id, currentUserId]);

  const handleOpenChat = async (targetUserId) => {
    // ZMIANA: Wywołaj funkcję przekierowania z AnnouncementsPage, jeśli user nie jest zalogowany
    if (!currentUserId || !userJwt) {
        if (onAskQuestionRedirect && onAskQuestionRedirect()) {
            return; // Jeśli funkcja przekierowała, zakończ działanie
        }
        alert('Musisz być zalogowany, aby rozpocząć rozmowę.'); // Fallback, choć powinno być obsłużone przez redirect
        return;
    }

    if (!announcement) {
      alert('Błąd: Brak ogłoszenia.');
      return;
    }

    const clientUserId = announcement.user_id;
    const carrierUserId = currentUserId; // Ten, kto klika "Zadaj pytanie", jest carrierem

    let convId; // Deklarujemy convId na zewnątrz bloku try/catch

    try {
        const { data: existing, error: findError } = await supabase
            .from('conversations')
            .select('id')
            .eq('announcement_id', announcement.id)
            .or(`and(client_id.eq.${clientUserId},carrier_id.eq.${carrierUserId}),and(client_id.eq.${carrierUserId},carrier_id.eq.${clientUserId})`)
            .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 oznacza "nie znaleziono wierszy"
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

            // DODANY KOD: Dodaj wpisy do conversation_participants dla obu stron
            const { error: participantsError } = await supabase
                .from('conversation_participants')
                .insert([
                    { conversation_id: convId, user_id: clientUserId, unread_messages_count: 0 },
                    { conversation_id: convId, user_id: carrierUserId, unread_messages_count: 0 }
                ]);

            if (participantsError) {
                console.error('Błąd podczas tworzenia wpisów conversation_participants:', participantsError.message);
                throw participantsError; // Rzucamy błąd, aby zapewnić spójność danych
            }
            console.log("Conversation participants created.");
        }
    } catch (err) {
        console.error("Error managing conversation:", err.message);
        alert(`Błąd podczas zarządzania konwersacją: ${err.message}`);
        return; // Ważne: zakończ funkcję w przypadku błędu
    }

    // TA LINIA MUSI BYĆ TUTAJ, PO CAŁYM BLOKU TRY/CATCH, aby convId było już zdefiniowane
    setActiveChatId(convId);
  };


  // ZMIANA: Logika renderowania
  if (!currentUserId) {
    // Jeśli użytkownik NIE jest zalogowany, zawsze pokazujemy przycisk "Zadaj pytanie"
    return (
      <div className="chat-section-container">
        <h3>Zadaj pytanie lub złóż ofertę</h3>
        <div className="no-active-chat-container">
          <p>Zaloguj się, aby rozpocząć rozmowę z wystawcą ogłoszenia.</p>
          <button className="action-button ask-question-button" onClick={() => handleOpenChat(null)}>
              <i className="fas fa-question-circle"></i> Zadaj pytanie
          </button>
        </div>
      </div>
    );
  }

  // Od tego momentu wiemy, że currentUserId JEST zalogowany.
  // Reszta logiki pozostaje w zasadzie taka sama.
  if (loadingConversations) {
    return <div className="chat-section-loading">Ładowanie konwersacji...</div>;
  }

  if (errorConversations) {
    return <div className="chat-section-error">{errorConversations}</div>;
  }

  if (isAnnouncementOwner) {
    return (
      <div className="chat-section-container">
        <h3>Pytania i Oferty do Twojego Ogłoszenia</h3>
        {conversations.length === 0 && !activeChatId && (
          <p className="no-conversations-message">Brak pytań/ofert do tego ogłoszenia.</p>
        )}

        {activeChatId ? (
          <ChatWindow
            conversationId={activeChatId}
            currentUserId={currentUserId}
            userJwt={userJwt}
            onClose={() => setActiveChatId(null)}
          />
        ) : (
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
            onClose={() => setActiveChatId(null)}
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