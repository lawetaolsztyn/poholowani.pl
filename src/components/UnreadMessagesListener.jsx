// src/components/UnreadMessagesListener.jsx
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function UnreadMessagesListener() {
  const { currentUser, loading: authLoading, fetchTotalUnreadMessages } = useAuth();

  useEffect(() => {
    console.log('UnreadMessagesListener useEffect start');
    console.log('CurrentUser:', currentUser);
    console.log('Auth Loading:', authLoading);

    if (!currentUser?.id || authLoading) {
      console.log('Listener NIE subskrybuje - user null/loading');
      return;
    }

    console.log('Listener subskrybuje zmiany dla user:', currentUser.id);

    const channel = supabase
      .channel(`unread_messages_user_listener_${currentUser.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${currentUser.id}`,
      }, (payload) => {
        console.log('Realtime update dla nieprzeczytanych wiadomości (payload):', payload.new);
        fetchTotalUnreadMessages(currentUser.id);
      })
      .subscribe();

    return () => {
      console.log('Usuwam subskrypcję unread_messages_user_listener dla:', currentUser.id);
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, authLoading, fetchTotalUnreadMessages]);

  return null;
}
