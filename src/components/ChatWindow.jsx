// src/components/ChatWindow.jsx (CAŁY PLIK)
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './ChatWindow.css';

// ZMIANA: Usunięto 'loading' i 'error' z propsów, przekazujemy 'participantsData' bezpośrednio
export default function ChatWindow({ conversationId, currentUserId, userJwt, participantsData, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(true); // Zmieniono nazwę, żeby nie kolidowało z globalnym loading
  const [chatError, setChatError] = useState(null); // Zmieniono nazwę
  const messagesEndRef = useRef(null);

  // Efekt do ładowania wiadomości i subskrypcji Realtime
  useEffect(() => {
    if (!conversationId) {
      setChatError('Brak ID konwersacji.');
      setChatLoading(false);
      return;
    }

    setChatLoading(true);
    setChatError(null);

    // Fetch initial messages
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
        setChatError('Nie udało się załadować wiadomości.');
      } finally {
        setChatLoading(false);
      }
    };

    fetchMessages(); // Pobierz początkowe wiadomości


    // Realtime subscription for new messages in this conversation
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => {
        // console.log('Realtime message received!', payload.new);
        setMessages(prevMessages => {
            const updatedMessages = [...prevMessages, payload.new];
            // Opcjonalnie: sortuj, jeśli mogą przyjść nie po kolei (rzadko w insert)
            return updatedMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
        // Po otrzymaniu nowej wiadomości, oznacz ją jako przeczytaną (jeśli jestem odbiorcą)
        // Jeśli nie jesteś nadawcą, oznacz wiadomość jako przeczytaną
        if (payload.new.sender_id !== currentUserId) {
            markMessageAsRead(payload.new.id);
        }
        // Upewnij się, że last_message_at i last_message_content są aktualizowane w `conversations`
        updateConversationLastMessage(conversationId, payload.new.content);
      })
      // Subskrypcja na zmiany (UPDATE) - np. gdy wiadomość jest oznaczana jako przeczytana
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => {
        setMessages(prevMessages => 
          prevMessages.map(msg => (msg.id === payload.new.id ? payload.new : msg))
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel); // Clean up on unmount
    };
  }, [conversationId, currentUserId]); // Zależy od conversationId i currentUserId

  // Przewijanie do najnowszej wiadomości
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Funkcja do oznaczania wiadomości jako przeczytanej
  const markMessageAsRead = async (messageId) => {
    try {
      // Upewnij się, że RLS dla UPDATE na messages jest prawidłowe dla odbiorcy
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('is_read', false); 

      if (error) {
        console.error('Błąd oznaczania wiadomości jako przeczytanej:', error.message);
      }
    } catch (err) {
      console.error('Błąd oznaczania wiadomości jako przeczytanej:', err.message);
    }
  };

  // Funkcja do aktualizacji last_message_at/content w tabeli conversations
  const updateConversationLastMessage = async (convId, lastContent) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_content: lastContent.length > 100 ? lastContent.substring(0, 97) + '...' : lastContent
        })
        .eq('id', convId);

      if (error) {
        console.error('Błąd aktualizacji konwersacji (last_message):', error.message);
      }
    } catch (err) {
      console.error('Błąd aktualizacji konwersacji (last_message):', err.message);
    }
  };


  // Funkcja do wysyłania wiadomości
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    try {
      if (!currentUserId || !userJwt) {
        alert('Błąd autoryzacji: Użytkownik nie jest zalogowany lub brak tokenu sesji.');
        return;
      }

      const messagePayload = {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: newMessage.trim(),
        is_read: false
      };

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
      // Wiadomość zostanie dodana do UI przez subskrypcję Realtime, nie dodajemy jej bezpośrednio

    } catch (err) {
      console.error('Błąd wysyłania wiadomości:', err.message);
      alert('❌ Błąd wysyłania wiadomości: ' + err.message);
    }
  };

  if (chatLoading) { // Użyj nowego stanu ładowania chatu
    return <div className="chat-window-loading">Ładowanie chatu...</div>;
  }

  if (chatError) { // Użyj nowego stanu błędu chatu
    return <div className="chat-window-error">{chatError}</div>;
  }

  // Określ nazwę drugiego uczestnika
  const otherParticipant = Object.values(participantsData).find(p => p.id !== currentUserId);
  const chatTitle = otherParticipant ? `Rozmowa z: ${otherParticipant.name}` : 'Rozmowa';

  return (
    <div className="chat-window-container">
      <div className="chat-header">
        {/* Usunięto przycisk zamykania z ChatWindow, będzie w AnnouncementChatSection */}
        <h4>{chatTitle}</h4>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.sender_id === currentUserId ? 'sent' : 'received'}`}>
            <div className="message-content">
                {/* Wyświetl nazwę nadawcy, jeśli to nie moja wiadomość */}
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