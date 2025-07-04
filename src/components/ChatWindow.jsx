// src/components/ChatWindow.jsx (CAŁY PLIK)
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './ChatWindow.css';

export default function ChatWindow({ conversationId, currentUserId, userJwt, participantsData: initialParticipantsData, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState(null);
  const messagesEndRef = useRef(null);
  const [participantsData, setParticipantsData] = useState(initialParticipantsData || {});

  const fetchParticipantsData = async (convId) => {
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
        setParticipantsData(pData);
      }
    } catch (err) {
      console.error('Błąd pobierania danych uczestników chatu:', err.message);
      setChatError('Nie udało się załadować danych uczestników.');
    }
  };


  useEffect(() => {
    if (!conversationId) {
      setChatError('Brak ID konwersacji.');
      setChatLoading(false);
      return;
    }
    
    let channel = null;

    const setupRealtimeConnection = async () => {
      setChatLoading(true);
      setChatError(null);

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('permission denied') || error.message.includes('auth')) {
              setChatError('Brak dostępu do wiadomości (prawdopodobnie problem z autoryzacją lub RLS).');
            } else {
              setChatError('Nie udało się załadować wiadomości: ' + error.message);
            }
            throw error;
        }
        setMessages(data);
      } catch (err) {
        console.error('Błąd ładowania wiadomości:', err.message);
      } finally {
        setChatLoading(false);
      }

      if (Object.keys(initialParticipantsData).length === 0) {
          fetchParticipantsData(conversationId);
      } else {
          setParticipantsData(initialParticipantsData);
      }
      
      supabase.removeChannel(supabase.channel(`chat:${conversationId}`));

      channel = supabase
        .channel(`chat:${conversationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => {
          setMessages(prevMessages => {
              const updatedMessages = [...prevMessages, payload.new];
              return updatedMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          });
          if (payload.new.sender_id !== currentUserId) {
              markMessageAsRead(payload.new.id);
          }
          updateConversationLastMessage(conversationId, payload.new.content);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => {
          setMessages(prevMessages => 
            prevMessages.map(msg => (msg.id === payload.new.id ? payload.new : msg))
          );
        })
        .subscribe();
    };

    setupRealtimeConnection();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [conversationId, currentUserId, initialParticipantsData]); // userJwt usunięte z zależności

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const markMessageAsRead = async (messageId) => {
    try {
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


  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    try {
      // Używamy currentUserId i userJwt przekazanych jako propsy
      // Sprawdź, czy są dostępne
      if (!currentUserId || !userJwt) {
        alert('Błąd autoryzacji: Użytkownik nie jest zalogowany lub brak tokenu sesji.');
        console.error('Błąd: currentUserId lub userJwt brakujący w handleSendMessage.');
        return;
      }

      const messagePayload = {
        conversation_id: conversationId,
        sender_id: currentUserId, // Używamy currentUserId z propsów
        content: newMessage.trim(),
        is_read: false
      };

      const workerResponse = await fetch('https://map-api-proxy.lawetaolsztyn.workers.dev/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId,
          'Authorization': `Bearer ${userJwt}` // Używamy userJwt z propsów
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

  if (chatLoading) {
    return <div className="chat-window-loading">Ładowanie chatu...</div>;
  }

  if (chatError) {
    return <div className="chat-window-error">{chatError}</div>;
  }

  const otherParticipant = Object.values(participantsData).find(p => p.id !== currentUserId);
  const chatTitle = otherParticipant ? `Rozmowa z: ${otherParticipant.name}` : 'Rozmowa';

  return (
    <div className="chat-window-container">
      <div className="chat-header">
        <button className="chat-close-button" onClick={onClose}>&times;</button>
        <h4>{chatTitle}</h4>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.sender_id === currentUserId ? 'sent' : 'received'}`}>
            <div className="message-content">
                {msg.sender_id !== currentUserId && participantsData[msg.sender_id] && (
                    <span className="sender-name">
                        {participantsData[msg.sender_id].name || 'Nieznany'}
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