import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function UnreadMessagesListener() {
  const { currentUser, loading: authLoading, fetchTotalUnreadMessages } = useAuth();

  useEffect(() => {
    console.log('📡 UnreadMessagesListener uruchomiony');

    if (!currentUser?.id || authLoading) {
      console.log("Not subscribing yet: User is null/loading or ID is missing.");
      return;
    }

    console.log(`Subskrybuję zmiany nieprzeczytanych wiadomości dla użytkownika: ${currentUser.id}`);

    const participantsChannel = supabase
      .channel(`unread_messages_user_listener_${currentUser.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${currentUser.id}`
      }, (payload) => {
        console.log('🟢 PRZYCHODZI REAKCJA Z REALTIME:', payload.new);
        fetchTotalUnreadMessages(currentUser.id);
      })
      .subscribe();

    return () => {
      console.log(`Usuwam subskrypcję nieprzeczytanych wiadomości dla użytkownika: ${currentUser.id}`);
      supabase.removeChannel(participantsChannel);
    };

  }, [currentUser, authLoading, fetchTotalUnreadMessages]);

  return null;
}
