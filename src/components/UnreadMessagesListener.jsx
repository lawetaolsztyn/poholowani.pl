// src/components/UnreadMessagesListener.jsx
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext'; // Upewnij się, że używasz useAuth do pobrania loading

export default function UnreadMessagesListener() {
  // Pobieramy loading: authLoading z useAuth, aby śledzić stan ładowania autoryzacji
  const { currentUser, loading: authLoading, fetchTotalUnreadMessages } = useAuth(); 

  useEffect(() => {
    let participantsChannel = null;

    // TE LOGI POWINNY POJAWIĆ SIĘ ZAWSZE, JEŚLI KOMPONENT JEST RENDEROWANY
    console.log("UnreadMessagesListener useEffect triggered.");
    console.log("Current User (inside Listener Effect):", currentUser);
    console.log("Current User ID (inside Listener Effect):", currentUser?.id);
    console.log("Auth Loading (inside Listener Effect):", authLoading); // Sprawdź stan ładowania auth

    // Aktywujemy subskrypcję tylko, gdy użytkownik jest dostępny i AuthContext nie jest w stanie ładowania
    if (currentUser && currentUser.id && !authLoading) { // DODANO: !authLoading
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
          console.log('Realtime update for unread messages detected (payload):', payload.new);
          // Gdy nastąpi zmiana, wywołaj funkcję z AuthContext, aby odświeżyć licznik
          fetchTotalUnreadMessages(currentUser.id);
        })
        .subscribe();
    } else {
        // Loguj, dlaczego subskrypcja nie jest aktywowana
        console.log("Not subscribing yet: Current User is null/undefined, ID is missing, or AuthContext is still loading.");
    }

    // Funkcja czyszcząca subskrypcję przy odmontowaniu komponentu lub zmianie użytkownika
    return () => {
      if (participantsChannel) {
        console.log(`Usuwam subskrypcję nieprzeczytanych wiadomości dla użytkownika: ${currentUser?.id}`);
        supabase.removeChannel(participantsChannel);
      }
    };
  }, [currentUser, authLoading, fetchTotalUnreadMessages]); // DODANO: authLoading do zależności

  return null; // Ten komponent nic nie renderuje wizualnie
}