// src/components/UnreadMessagesListener.jsx
import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function UnreadMessagesListener() {
  const { currentUser, loading: authLoading, fetchTotalUnreadMessages } = useAuth();
  const participantsChannelRef = useRef(null);

  useEffect(() => {
    console.log("🔁 UnreadMessagesListener useEffect triggered.");
    console.log("👤 Current User:", currentUser);
    console.log("🆔 Current User ID:", currentUser?.id);
    console.log("⌛ Auth Loading:", authLoading);

    if (currentUser && currentUser.id && !authLoading) {
      // Jeśli istnieje kanał i dotyczy aktualnego usera — nie subskrybuj ponownie
      if (
        participantsChannelRef.current &&
        participantsChannelRef.current.topic.includes(`all_participants_updates_listener_client_filtered_${currentUser.id}`)
      ) {
        console.log(`🔒 Kanał już istnieje dla ${currentUser.id}, nie tworzę ponownie.`);
        return;
      }

      // Jeśli istnieje kanał, ale dla innego usera — usuń go
      if (participantsChannelRef.current) {
        console.log(`🧹 Usuwam stary kanał.`);
        supabase.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }

      console.log(`🚀 Subskrybuję OGÓLNE zmiany (klient filtruje) dla user_id = ${currentUser.id}`);

      const channel = supabase
        .channel(`all_participants_updates_listener_client_filtered_${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversation_participants',
          },
          (payload) => {
            if (payload?.new?.user_id === currentUser.id) {
              console.log('✅ Realtime update dla bieżącego użytkownika:', payload.new);
              fetchTotalUnreadMessages(currentUser.id);
            } else {
              console.log('🛑 Update odfiltrowany — nie dla tego użytkownika:', payload.new);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('🟢 WebSocket SUBSCRIBED!');
          } else {
            console.warn('🔴 Problem z subskrypcją WebSocket:', status);
          }
        });

      participantsChannelRef.current = channel;
    } else {
      if (participantsChannelRef.current) {
        console.log(`👋 Użytkownik wylogowany lub brak ID — czyszczę kanał.`);
        supabase.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }
      console.log("⏳ Nie subskrybuję — user nie gotowy lub auth w toku.");
    }

    // Cleanup przy unmount lub zmianie usera
    return () => {
      if (participantsChannelRef.current) {
        console.log(`🧹 Usuwam subskrypcję przy odmontowaniu komponentu dla usera: ${currentUser?.id}`);
        supabase.removeChannel(participantsChannelRef.current);
        participantsChannelRef.current = null;
      }
    };
  }, [currentUser?.id, authLoading, fetchTotalUnreadMessages]);

  return null;
}
