// src/components/UnreadMessagesListener.jsx
import { useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Ścieżka do supabaseClient
import { useAuth } from '../AuthContext'; // Ścieżka do AuthContext

export default function UnreadMessagesListener() {
  const { currentUser, fetchTotalUnreadMessages } = useAuth(); // Pobieramy currentUserId i funkcję do odświeżania

  useEffect(() => {
    let participantsChannel = null;
  console.log("UnreadMessagesListener useEffect triggered.");
    console.log("Current User:", currentUser);
    console.log("Current User ID:", currentUser?.id);

    if (currentUser && currentUser.id) {
      console.log(`Subskrybuję zmiany nieprzeczytanych wiadomości dla użytkownika: ${currentUser.id}`);

      // Utwórz unikalny kanał dla tego użytkownika
      participantsChannel = supabase
        .channel(`unread_messages_user_listener_${currentUser.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', // Interesują nas tylko aktualizacje
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${currentUser.id}` // Filtruj tylko zmiany dotyczące tego użytkownika
        }, (payload) => {
          console.log('Realtime update for unread messages detected:', payload.new);
          // Gdy nastąpi zmiana, wywołaj funkcję z AuthContext, aby odświeżyć licznik
          fetchTotalUnreadMessages(currentUser.id);
        })
        .subscribe();
    }

    // Funkcja czyszcząca subskrypcję przy odmontowaniu komponentu lub zmianie użytkownika
    return () => {
      if (participantsChannel) {
        console.log(`Usuwam subskrypcję nieprzeczytanych wiadomości dla użytkownika: ${currentUser?.id}`);
        supabase.removeChannel(participantsChannel);
      }
    };
  }, [currentUser, fetchTotalUnreadMessages]); // Zależności: currentUser i funkcja z AuthContext

  return null; // Ten komponent nic nie renderuje wizualnie
}