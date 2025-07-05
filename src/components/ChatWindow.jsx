// src/components/ChatWindow.jsx (CAŁY PLIK)
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './ChatWindow.css';

// ZMIANA: Dodano prop userJwt
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

    // --- DODANY KOD: Oznacz konwersację jako przeczytaną po załadowaniu ---
    // Wywołanie funkcji RPC do zerowania licznika nieprzeczytanych wiadomości
    const markConversationAsReadOnLoad = async () => {
      if (currentUserId && conversationId) {
        try {
          const { error: rpcError } = await supabase.rpc('mark_conversation_as_read', {
            p_conversation_id: conversationId,
            p_user_id: currentUserId
          });

          if (rpcError) {
            console.error('Błąd RPC mark_conversation_as_read:', rpcError.message);
          } else {
            console.log('Konwersacja oznaczona jako przeczytana dla użytkownika:', currentUserId);
          }
        } catch (err) {
          console.error('Ogólny błąd podczas oznaczania jako przeczytane:', err.message);
        }
      }
    };
    markConversationAsReadOnLoad(); // Wywołaj tę funkcję od razu po załadowaniu czatu
    // --- KONIEC DODANEGO KODU ---


    // ZMIANA: Sprawdź, czy kanał jest prawidłowo subskrybowany i czy zdarzenia są odbierane
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => {
        console.log('Realtime message received!', payload.new);
        setMessages(prevMessages => [...prevMessages, payload.new]);
        // UWAGA: Funkcja markMessageAsRead została usunięta, bo logic jest w DB triggerze
        // if (payload.new.sender_id !== currentUserId) {
        //     markMessageAsRead(payload.new.id); // Ta linia została usunięta
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

  // Funkcja markMessageAsRead została usunięta z tego pliku

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    try {
      // ZMIANA: Używamy userJwt przekazanego jako prop
      if (!currentUserId || !userJwt) { // Walidacja, czy ID i JWT są dostępne
        alert('Błąd autoryzacji: Użytkownik nie jest zalogowany lub brak tokenu sesji.');
        console.error('Błąd: currentUserId lub userJwt brakujący.');
        return;
      }

      const messagePayload = {
        conversation_id: conversationId,
        sender_id: currentUserId, // Używamy currentUserId przekazanego jako prop
        content: newMessage.trim(),
        // is_read: false // is_read nie jest już używane do licznika nieprzeczytanych
      };

      const workerResponse = await fetch('https://map-api-proxy.lawetaolsztyn.workers.dev/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId, // Przekazujemy User ID dla Workera
          'Authorization': `Bearer ${userJwt}` // PRZEKAZUJEMY TOKEN JWT
        },
        body: JSON.stringify(messagePayload),
      });

      if (!workerResponse.ok) {
        const errorBody = await workerResponse.json();
        throw new Error(errorBody.message || 'Nieznany błąd z Workera.');
      }

      setNewMessage('');

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

  return (
    <div className="chat-window-container">
      <div className="chat-header">
        <button className="chat-close-button" onClick={onClose}>&times;</button>
        <h4>Chat z: {Object.values(participantsData).find(p => p.id !== currentUserId)?.name || 'Nieznany uczestnik'}</h4>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.sender_id === currentUserId ? 'sent' : 'received'}`}>
            <div className="message-content">
                {msg.sender_id !== currentUserId && (
                    <span className="sender-name">
                        {participantsData[msg.sender_id]?.name || 'Nieznany'}
                    </span>
                )}
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