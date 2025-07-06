// src/components/ChatWindow.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './ChatWindow.css';

export default function ChatWindow({ conversationId, currentUserId, userJwt, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const [participantsData, setParticipantsData] = useState({});

  // Funkcja do pobierania danych uczestników konwersacji
  const fetchParticipantsData = async (convId) => {
    try {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('client_id, carrier_id, announcement_id')
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
            name: user.role === 'firma' ? user.company_name : user.full_name || user.email,
            role: user.role
          };
        });
        setParticipantsData(pData);
      }
    } catch (err) {
      console.error('Błąd pobierania danych uczestników chatu:', err.message);
      setError('Nie udało się załadować danych uczestników.');
    }
  };


  // Efekt do ładowania wiadomości i subskrypcji Realtime
  useEffect(() => {
    if (!conversationId) {
      setError('Brak ID konwersacji.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data);
      } catch (err) {
        console.error('Błąd ładowania wiadomości:', err.message);
        setError('Nie udało się załadować wiadomości.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    fetchParticipantsData(conversationId);

    // KLUCZOWA ZMIANA: Oznacz konwersację jako przeczytaną po załadowaniu ChatWindow
    const markConversationAsReadOnLoad = async () => {
      if (currentUserId && conversationId) {
        try {
          // Pobierz ID ostatniej wiadomości, aby ustawić last_read_message_id
          const { data: latestMessageData, error: latestMessageError } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (latestMessageError && latestMessageError.code !== 'PGRST116') { // PGRST116 = No rows found
            console.warn("Brak wiadomości w czacie lub błąd pobierania ostatniej wiadomości:", latestMessageError.message);
          }

          const latestMessageId = latestMessageData ? latestMessageData.id : null;

          const { error: updateError } = await supabase
            .from('conversation_participants')
            .update({
              unread_messages_count: 0, // Zresetuj licznik nieprzeczytanych
              is_deleted: false, // KLUCZOWE: Przywróć czat na listę, jeśli był wcześniej "usunięty" przez tego użytkownika
              last_read_message_id: latestMessageId // Zaktualizuj ostatnią przeczytaną wiadomość
            })
            .eq('conversation_id', conversationId)
            .eq('user_id', currentUserId);

          if (updateError) throw updateError;

          console.log(`Konwersacja ${conversationId} oznaczona jako przeczytana i przywrócona dla użytkownika ${currentUserId}`);
        } catch (err) {
          console.error('Ogólny błąd podczas oznaczania jako przeczytane/przywracania:', err.message);
        }
      }
    };
    markConversationAsReadOnLoad(); // Wywołaj tę funkcję od razu po załadowaniu czatu


    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => {
        console.log('Realtime message received!', payload.new);
        setMessages(prevMessages => [...prevMessages, payload.new]);

        // Jeśli nowa wiadomość przyszła od drugiego użytkownika, zaktualizuj też jego last_read_message_id (opcjonalnie)
        // LUB po prostu polegaj na triggerze/logice w MyChats.jsx do oznaczania jako przeczytane.
        // Jeśli trigger działa, to ten fragment jest zbędny:
        // if (payload.new.sender_id !== currentUserId) {
        //   // Jeśli ChatWindow jest otwarte i wiadomość jest od drugiej strony, oznacz ją jako przeczytaną
        //   supabase.from('conversation_participants')
        //     .update({ last_read_message_id: payload.new.id, unread_messages_count: 0 })
        //     .eq('conversation_id', conversationId)
        //     .eq('user_id', currentUserId)
        //     .then(res => {
        //       if (res.error) console.error('Error marking message as read on receive:', res.error);
        //     });
        // }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]); // Zależy od ID konwersacji i ID zalogowanego użytkownika

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  // handleSendMessage - KLUCZOWA ZMIANA: Aktualizacja conversation_participants i conversations
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    try {
      if (!currentUserId || !userJwt) {
        alert('Błąd autoryzacji: Użytkownik nie jest zalogowany lub brak tokenu sesji.');
        console.error('Błąd: currentUserId lub userJwt brakujący.');
        return;
      }

      const messagePayload = {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: newMessage.trim(),
      };

      // Używamy Workera do wysłania wiadomości (jak w Twoim kodzie)
      const workerResponse = await fetch('https://map-api-proxy.lawetaolsztyn.workers.dev/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId,
          'Authorization': `Bearer ${userJwt}`
        },
        body: JSON.stringify(messagePayload),
      });

      if (!workerResponse.ok) {
        const errorBody = await workerResponse.json();
        throw new Error(errorBody.message || 'Nieznany błąd z Workera.');
      }

      setNewMessage('');

      // WAŻNE: Dodajemy wywołania RPC/UPDATE bezpośrednio tutaj,
      // jeśli nie masz triggerów w bazie danych.
      // Jeśli masz triggery (jak te, które proponowałem), możesz usunąć te fragmenty.

      // 1. Zaktualizuj główną konwersację w tabeli 'conversations'
      // Zapewnij, że 'last_message_sender_id' jest aktualizowany.
      const { error: convoUpdateError } = await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_content: messagePayload.content,
          last_message_sender_id: currentUserId, // KLUCZOWE
        })
        .eq('id', conversationId);

      if (convoUpdateError) {
        console.error('Błąd aktualizacji konwersacji (handleSendMessage):', convoUpdateError.message);
      }

      // 2. Zaktualizuj conversation_participants dla OBU uczestników
      // Pobierz dane konwersacji, aby zidentyfikować drugiego uczestnika
      const { data: convData, error: convDataError } = await supabase
        .from('conversations')
        .select('client_id, carrier_id')
        .eq('id', conversationId)
        .single();

      if (convDataError) {
        console.error('Błąd pobierania danych konwersacji dla uczestników:', convDataError.message);
        return;
      }

      const otherParticipantId = convData.client_id === currentUserId ? convData.carrier_id : convData.client_id;

      // a) Dla nadawcy (bieżącego użytkownika): zresetuj unread_messages_count i ustaw is_deleted na false
      const { error: senderPartUpdateError } = await supabase
        .from('conversation_participants')
        .update({
          unread_messages_count: 0,
          is_deleted: false, // Nadawca właśnie wysłał wiadomość, więc czat musi być dla niego widoczny
          last_read_message_id: messageData.id // (Jeśli messageData.id jest dostępne po wysłaniu)
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUserId);

      if (senderPartUpdateError) {
        console.error('Błąd aktualizacji uczestnika (nadawcy):', senderPartUpdateError.message);
      }

      // b) Dla ODBIORCY: zwiększ unread_messages_count i ustaw is_deleted na false
      // TO WYWOŁUJE FUNKCJĘ RPC Z BAZY DANYCH!
      const { error: receiverPartUpdateError } = await supabase
        .rpc('increment_unread_and_undelete_participant', {
          p_conversation_id: conversationId,
          p_user_id: otherParticipantId
        });

      if (receiverPartUpdateError) {
        console.error('Błąd aktualizacji uczestnika (odbiorcy) przez RPC:', receiverPartUpdateError.message);
      }

    } catch (err) {
      console.error('Błąd wysyłania wiadomości:', err.message);
      alert('❌ Błąd wysyłania wiadomości: ' + err.message);
    }
  };


  if (loading) {
    return <div className="chat-window-loading">Ładowanie chatu...</div>;
  }

  if (error) {
    return <div className="chat-window-error">{error}</div>;
  }

  // Wyszukaj nazwę uczestnika, który nie jest currentUserId
  const chatPartnerName = Object.values(participantsData).find(p => p.id !== currentUserId)?.name || 'Nieznany uczestnik';

  return (
    <div className="chat-window-container">
      <div className="chat-header">
        <button className="chat-close-button" onClick={onClose}>&times;</button>
        <h4>Czat z: {chatPartnerName}</h4> {/* Użyj znalezionej nazwy */}
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.sender_id === currentUserId ? 'sent' : 'received'}`}>
            <div className="message-content">
                {/* Usuń warunek sender_id !== currentUserId, aby nazwa była zawsze wyświetlana (lub usuń całkowicie, jeśli nie potrzebujesz) */}
                {/* <span className="sender-name">
                    {participantsData[msg.sender_id]?.name || 'Nieznany'}
                </span> */}
                <p>{msg.content}</p>
                <span className="message-timestamp">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="chat-input-form">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Napisz wiadomość..."
          rows="1"
          className="chat-textarea"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        ></textarea>
        <button type="submit" className="send-button">Wyślij</button>
      </form>
    </div>
  );
}