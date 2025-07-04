// src/components/ChatWindow.jsx (CAŁY PLIK)
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './ChatWindow.css'; // Stwórz ten plik CSS

export default function ChatWindow({ conversationId, currentUserId, onClose }) {
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
          .select('id, full_name, company_name, email, role') // DODANO: pobierz rolę
          .in('id', participantIds);

        if (usersError) throw usersError;

        const pData = {};
        usersData.forEach(user => {
          pData[user.id] = {
            name: user.role === 'firma' ? user.company_name : user.full_name || user.email,
            role: user.role // Zapisz rolę
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

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }); // Najstarsze na górze

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


    // Realtime subscription for new messages in this conversation
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => {
        setMessages(prevMessages => [...prevMessages, payload.new]);
        if (payload.new.sender_id !== currentUserId) {
            markMessageAsRead(payload.new.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  // Przewijanie do najnowszej wiadomości
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Funkcja do oznaczania wiadomości jako przeczytanej
  const markMessageAsRead = async (messageId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('is_read', false); // Oznacz tylko nieprzeczytane

      if (error) {
        console.error('Błąd oznaczania wiadomości jako przeczytanej:', error.message);
      }
    } catch (err) {
      console.error('Błąd oznaczania wiadomości jako przeczytanej:', err.message);
    }
  };

  // Funkcja do wysyłania wiadomości
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        alert('Musisz być zalogowany, aby wysłać wiadomość.');
        return;
      }

      const messagePayload = {
        conversation_id: conversationId,
        sender_id: userId,
        content: newMessage.trim(),
        is_read: false
      };

      // ZMIANA TUTAJ: WYSYŁAMY DO /api/messages, a nie /api/comments
      const workerResponse = await fetch('https://map-api-proxy.lawetaolsztyn.workers.dev/api/messages', { // <-- ZMIENIONY ENDPOINT
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
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
        {/* Przycisk zamykania modala chatu */}
        <button className="chat-close-button" onClick={onClose}>&times;</button>
        {/* Wyświetl nazwę drugiego uczestnika chatu */}
        <h4>Chat z: {Object.values(participantsData).find(p => p.id !== currentUserId)?.name || 'Nieznany uczestnik'}</h4>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.sender_id === currentUserId ? 'sent' : 'received'}`}>
            <div className="message-content">
                {/* Wyświetl nazwę nadawcy, jeśli to nie moja wiadomość (lub zawsze, jeśli chcesz) */}
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