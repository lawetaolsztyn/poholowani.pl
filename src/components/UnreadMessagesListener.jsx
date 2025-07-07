// src/components/UnreadMessagesListener.jsx
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

// DODANO: Log poza useEffect - powinien pojawić się ZAWSZE, jeśli komponent jest renderowany
console.log("UnreadMessagesListener component is being rendered.");

export default function UnreadMessagesListener() {
  const { currentUser, loading: authLoading, fetchTotalUnreadMessages } = useAuth();

  useEffect(() => {
    let participantsChannel = null;

    // Logi w useEffect - powinny pojawić się, jeśli useEffect się uruchomi
    console.log("UnreadMessagesListener useEffect triggered.");
    console.log("Current User (inside Listener Effect):", currentUser);
    console.log("Current User ID (inside Listener Effect):", currentUser?.id);
    console.log("Auth Loading (inside Listener Effect):", authLoading);

    if (currentUser && currentUser.id && !authLoading) {
      console.log(`Subskrybuję OGÓLNE zmiany nieprzeczytanych wiadomości (BEZ FILTRA) dla użytkownika: ${currentUser.id}`);

      participantsChannel = supabase
        .channel(`all_participants_updates_test_v2_${currentUser.id}_${Date.now()}`) // Zmieniona nazwa kanału
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          // filter: `user_id=eq.${currentUser.id}` // Nadal zakomentowane
        }, (payload) => {
          console.log('Realtime update for ANY participant (TEST V2):', payload.new);
          fetchTotalUnreadMessages(currentUser.id);
        })
        .subscribe();
    } else {
        console.log("Not subscribing yet: User is null/undefined, ID is missing, or AuthContext is still loading.");
    }

    return () => {
      if (participantsChannel) {
        console.log(`Usuwam OGÓLNĄ subskrypcję nieprzeczytanych wiadomości dla użytkownika: ${currentUser?.id}`);
        supabase.removeChannel(participantsChannel);
      }
    };
  }, [currentUser, authLoading, fetchTotalUnreadMessages]);

  return null;
}