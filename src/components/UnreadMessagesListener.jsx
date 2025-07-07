// src/components/UnreadMessagesListener.jsx
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

// Ten log był pomocny do debugowania, możesz go usunąć lub zostawić
// console.log("UnreadMessagesListener component is being rendered.");

export default function UnreadMessagesListener() {
  const { currentUser, loading: authLoading, fetchTotalUnreadMessages } = useAuth();

  useEffect(() => {
    let participantsChannel = null;

    // Logi w useEffect
    console.log("UnreadMessagesListener useEffect triggered.");
    console.log("Current User (inside Listener Effect):", currentUser);
    console.log("Current User ID (inside Listener Effect):", currentUser?.id);
    console.log("Auth Loading (inside Listener Effect):", authLoading);

    if (currentUser && currentUser.id && !authLoading) {
      console.log(`Subskrybuję ZFILTROWANE zmiany nieprzeczytanych wiadomości dla użytkownika: ${currentUser.id}`);

      // PRZYWRACAMY FILTR!
      participantsChannel = supabase
        .channel(`unread_messages_user_listener_${currentUser.id}`) // Unikalna nazwa kanału dla każdego użytkownika
        .on('postgres_changes', {
          event: 'UPDATE', // Interesują nas aktualizacje
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${currentUser.id}` // <--- FILTR PRZYWRÓCONY
        }, (payload) => {
          console.log('Realtime update for CURRENT USER (filtered) detected:', payload.new);
          fetchTotalUnreadMessages(currentUser.id);
        })
        .subscribe();
    } else {
        console.log("Not subscribing yet: User is null/undefined, ID is missing, or AuthContext is still loading.");
    }

    // Funkcja czyszcząca subskrypcję przy odmontowaniu komponentu lub zmianie użytkownika
    return () => {
      if (participantsChannel) {
        console.log(`Usuwam zfiltrowaną subskrypcję nieprzeczytanych wiadomości dla użytkownika: ${currentUser?.id}`);
        supabase.removeChannel(participantsChannel);
      }
    };
  }, [currentUser, authLoading, fetchTotalUnreadMessages]);

  return null;
}