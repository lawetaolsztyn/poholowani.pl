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
      console.log(Subskrybuję zmiany nieprzeczytanych wiadomości dla użytkownika: ${currentUser.id});

      // ZMIANA TUTAJ: Usunięto filtr user_id
      participantsChannel = supabase
        .channel(unread_messages_user_listener_${currentUser.id})
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          // filter: user_id=eq.${currentUser.id} // TYMCZASOWO ZAKOMENTOWANE LUB USUNIĘTE
        }, (payload) => {
          // TEN LOG POWINIEN SIĘ POJAWIĆ, JEŚLI JAKAKOLWIEK ZMIANA W TABELI JEST ODBIERANA
          console.log('Realtime update for ANY unread messages detected (payload):', payload.new);
          // Nadal wywołujemy funkcję, ale teraz będzie reagować na każdą zmianę w tabeli
          fetchTotalUnreadMessages(currentUser.id);
        })
        .subscribe();
    } else {
        console.log("Not subscribing yet: Current User is null/undefined, ID is missing, or AuthContext is still loading.");
    }

    return () => {
      if (participantsChannel) {
        console.log(Usuwam subskrypcję nieprzeczytanych wiadomości dla użytkownika: ${currentUser?.id});
        supabase.removeChannel(participantsChannel);
      }
    };
  }, [currentUser, authLoading, fetchTotalUnreadMessages]);

  return null;
}