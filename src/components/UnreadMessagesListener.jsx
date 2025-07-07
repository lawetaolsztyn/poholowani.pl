// src/components/UnreadMessagesListener.jsx
import { useEffect, useRef } from 'react'; // DODANO useRef
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function UnreadMessagesListener() {
  const { currentUser, loading: authLoading, fetchTotalUnreadMessages } = useAuth();
  const participantsChannelRef = useRef(null); // Używamy ref, aby przechowywać instancję kanału

  useEffect(() => {
    // Logi w useEffect
    console.log("UnreadMessagesListener useEffect triggered.");
    console.log("Current User (inside Listener Effect):", currentUser);
    console.log("Current User ID (inside Listener Effect):", currentUser?.id);
    console.log("Auth Loading (inside Listener Effect):", authLoading);

    // Warunek do subskrybowania
    if (currentUser && currentUser.id && !authLoading) {
      // Jeśli już istnieje instancja kanału i jest dla tego samego użytkownika, nie subskrybuj ponownie
      if (participantsChannelRef.current && participantsChannelRef.current.topic.includes(`all_participants_updates_listener_client_filtered_${currentUser.id}`)) {
        console.log(`Kanał już aktywny dla ${currentUser.id}, nie subskrybuję ponownie.`);
        return;
      }
      
      // Jeśli kanał jest dla innego użytkownika (zmiana użytkownika), usuń stary
      if (participantsChannelRef.current) {
        console.log(`Usuwam stary kanał dla poprzedniego użytkownika.`);
        supabase.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }

      console.log(`Subskrybuję OGÓLNE zmiany (FILTRACJA PO STRONIE KLIENTA) dla użytkownika: ${currentUser.id}`);

      // Subskrybujemy do WSZYSTKICH aktualizacji w tabeli conversation_participants
      // BEZ FILTRA po stronie serwera
      const channel = supabase
        .channel(`all_participants_updates_listener_client_filtered_${currentUser.id}`) // Unikalna nazwa kanału
        .on('postgres_changes', {
          event: 'UPDATE', // Interesują nas tylko aktualizacje
          schema: 'public',
          table: 'conversation_participants',
          // FILTR PO STRONIE SERWERA JEST USUNIĘTY (zakomentowany)
          // filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
          // FILTRACJA ODBYWA SIĘ TUTAJ, PO STRONIE KLIENTA
          if (payload.new && payload.new.user_id === currentUser.id) {
            console.log('Realtime update for CURRENT USER (client-filtered) detected:', payload.new);
            fetchTotalUnreadMessages(currentUser.id);
          } else {
            console.log('Realtime update received for OTHER user (client-filtered out):', payload.new);
          }
        })
        .subscribe();

      participantsChannelRef.current = channel; // Zapisz instancję kanału w ref

    } else {
        // Jeśli użytkownik jest null, a kanał jest aktywny, usuń go
        if (participantsChannelRef.current) {
            console.log(`Użytkownik wylogowany/null, usuwam kanał.`);
            supabase.removeChannel(participantsChannelRef.current);
            participantsChannelRef.current = null;
        }
        console.log("Not subscribing yet: User is null/undefined, ID is missing, or AuthContext is still loading.");
    }

    // Funkcja czyszcząca subskrypcję przy odmontowaniu komponentu (ważne)
    return () => {
      if (participantsChannelRef.current) {
        console.log(`Usuwam subskrypcję podczas czyszczenia useEffect dla użytkownika: ${currentUser?.id}`);
        supabase.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null; // Zresetuj ref
      }
    };
  }, [currentUser, authLoading, fetchTotalUnreadMessages]); // Zależności: currentUser i funkcje

  return null;
}