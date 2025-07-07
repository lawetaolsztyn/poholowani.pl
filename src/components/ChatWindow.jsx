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
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]); // Zależy od ID konwersacji i ID zalogowanego użytkownika

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  // handleSendMessage - TERAZ W PEŁNI POLEGA NA TRIGGERACH!
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

      // Używamy Workera do wysłania wiadomości
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
      // Dalsze aktualizacje (last_message_at, last_message_content, unread_messages_count, is_deleted)
      // są teraz obsługiwane w bazie danych przez TRIGGERS po wstawieniu wiadomości.
      // Nie ma potrzeby ręcznych wywołań supabase.from().update() tutaj.

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
                {/* Usunięto ten warunek, aby nazwa była zawsze wyświetlana, jeśli chcesz ją widzieć, lub usuń cały span */}
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