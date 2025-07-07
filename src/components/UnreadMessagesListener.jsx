// src/components/UnreadMessagesListener.jsx
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function UnreadMessagesListener() {
  const { currentUser, loading: authLoading, fetchTotalUnreadMessages } = useAuth();

  useEffect(() => {
    let participantsChannel = null;

    console.log("UnreadMessagesListener useEffect triggered.");
    console.log("Current User (inside Listener Effect):", currentUser);
    console.log("Current User ID (inside Listener Effect):", currentUser?.id);
    console.log("Auth Loading (inside Listener Effect):", authLoading);

    if (currentUser && currentUser.id && !authLoading) {
      console.log(`Subskrybuję zmiany nieprzeczytanych wiadomości dla użytkownika: ${currentUser.id}`);

      // PRZYWRÓCONY FILTR: Upewnij się, że jest dokładnie taki
      participantsChannel = supabase
        .channel(`unread_messages_user_listener_${currentUser.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${currentUser.id}` // FILTR PRZYWRÓCONY
        }, (payload) => {
          console.log('Realtime update for UNREAD messages detected (payload):', payload.new);
          fetchTotalUnreadMessages(currentUser.id);
        })
        .subscribe();
    } else {
        console.log("Not subscribing yet: Current User is null/undefined, ID is missing, or AuthContext is still loading.");
    }

    return () => {
      if (participantsChannel) {
        console.log(`Usuwam subskrypcję nieprzeczytanych wiadomości dla użytkownika: ${currentUser?.id}`);
        supabase.removeChannel(participantsChannel);
      }
    };
  }, [currentUser, authLoading, fetchTotalUnreadMessages]);

  return null;
}