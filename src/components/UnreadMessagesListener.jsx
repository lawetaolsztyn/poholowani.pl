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
      console.log(`Subskrybuję OGÓLNE zmiany nieprzeczytanych wiadomości (BEZ FILTRA) dla użytkownika: ${currentUser.id}`);

      // ZMIANA TUTAJ: Nowa nazwa kanału i BRAK FILTRA
      participantsChannel = supabase
        .channel(`all_participants_updates_test_${currentUser.id}_${Date.now()}`) // Unikalna nazwa z timestampem
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          // filter: `user_id=eq.${currentUser.id}` // Nadal zakomentowany
        }, (payload) => {
          // TEN LOG POWINIEN SIĘ POJAWIĆ, JEŚLI JAKAKOLWIEK ZMIANA W TABELI JEST ODBIERANA
          console.log('Realtime update for ANY participant (TEST):', payload.new);
          fetchTotalUnreadMessages(currentUser.id);
        })
        .subscribe();
    } else {
        console.log("Not subscribing yet: User is null/loading or ID is missing.");
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