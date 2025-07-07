// src/components/UnreadMessagesListener.jsx
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function UnreadMessagesListener() {
  const { currentUser, loading: authLoading, fetchTotalUnreadMessages } = useAuth();

  useEffect(() => {
    console.log('🔔 UnreadMessagesListener useEffect triggered');
    console.log('currentUser:', currentUser);
    console.log('authLoading:', authLoading);

    if (!(currentUser && currentUser.id) || authLoading) {
      console.log('🔕 Brak subskrypcji - user lub loading nie gotowe');
      return;
    }

    console.log(`🚀 Subskrybuję realtime na conversation_participants dla user_id = ${currentUser.id}`);

    const channelName = `unread_messages_${currentUser.id}`;
    const participantsChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log('🟢 Realtime update dla nieprzeczytanych wiadomości (payload):', payload.new);
          fetchTotalUnreadMessages(currentUser.id);
        }
      )
      .subscribe();

    console.log(`✅ Subskrypcja do kanału ${channelName} utworzona`);

    return () => {
      console.log(`🗑️ Usuwam subskrypcję dla usera ${currentUser?.id} na kanale ${channelName}`);
      supabase.removeChannel(participantsChannel);
    };
  }, [currentUser, authLoading, fetchTotalUnreadMessages]);

  return null;
}
