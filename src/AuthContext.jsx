// src/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  // Funkcja do pobierania i ustawiania całkowitej liczby nieprzeczytanych wiadomości
  const fetchTotalUnreadMessages = useCallback(async (userId) => {
    if (!userId) {
      setTotalUnreadMessages(0);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('unread_messages_count')
        .eq('user_id', userId)
        .filter('unread_messages_count', 'gt', 0); // Pobieramy tylko te, które mają niezerową liczbę

      if (error) {
        console.error("Błąd pobierania sumy nieprzeczytanych wiadomości:", error.message);
        setTotalUnreadMessages(0);
        return;
      }

      const sum = data.reduce((acc, item) => acc + item.unread_messages_count, 0);
      setTotalUnreadMessages(sum);
    } catch (err) {
      console.error('Ogólny błąd w fetchTotalUnreadMessages:', err.message);
      setTotalUnreadMessages(0);
    }
  }, []); // Bez zależności, aby była stabilna i nie powodowała pętli

  useEffect(() => {
    let participantsChannel = null; // Zmienna do przechowywania subskrypcji kanału Realtime

    // Subskrybuj zmiany stanu uwierzytelnienia (logowanie/wylogowanie)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true); // Ustaw loading na true, gdy stan autoryzacji się zmienia

      if (session) {
        // Użytkownik jest zalogowany
        setCurrentUser(session.user);

        // Pobierz rolę użytkownika
        const { data: profile, error: profileError } = await supabase
          .from('users_extended')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Błąd pobierania roli użytkownika:", profileError.message);
          setUserRole(null);
        } else {
          setUserRole(profile?.role || null);
        }

        // Pobierz początkową liczbę nieprzeczytanych wiadomości
        await fetchTotalUnreadMessages(session.user.id);

        // Subskrybuj zmiany w conversation_participants dla bieżącego użytkownika
        // Sprawdź, czy kanał już istnieje i czy jest dla tego samego użytkownika
        if (!participantsChannel || participantsChannel.topic !== `unread_messages_user_${session.user.id}`) {
          // Jeśli istnieje kanał dla innego użytkownika lub ogólny, usuń go najpierw
          if (participantsChannel) {
            supabase.removeChannel(participantsChannel);
          }

          participantsChannel = supabase
            .channel(`unread_messages_user_${session.user.id}`) // Unikalna nazwa kanału dla każdego użytkownika
            .on('postgres_changes', {
              event: 'UPDATE', // Interesują nas tylko aktualizacje
              schema: 'public',
              table: 'conversation_participants',
              filter: `user_id=eq.${session.user.id}` // Filtruj tylko zmiany dotyczące tego użytkownika
            }, (payload) => {
              console.log('Realtime change in conversation_participants for current user:', payload);
              // Po każdej zmianie (np. zwiększeniu licznika lub zresetowaniu), odśwież globalny licznik
              fetchTotalUnreadMessages(session.user.id);
            })
            .subscribe();
        }

      } else {
        // Użytkownik się wylogował
        setCurrentUser(null);
        setUserRole(null);
        setTotalUnreadMessages(0);

        // Usuń subskrypcję z kanału participants, jeśli jest aktywna
        if (participantsChannel) {
          supabase.removeChannel(participantsChannel);
          participantsChannel = null; // Resetuj zmienną kanału
        }
      }
      setLoading(false); // Zakończ loading
    });

    // Funkcja czyszcząca subskrypcje przy odmontowaniu komponentu
    return () => {
      if (authListener?.unsubscribe) {
        authListener.unsubscribe();
      }
      if (participantsChannel) {
        supabase.removeChannel(participantsChannel);
      }
    };
  }, [fetchTotalUnreadMessages]); // Zależność od funkcji useCallback

  const value = {
    currentUser,
    userRole,
    loading,
    totalUnreadMessages,
    fetchTotalUnreadMessages // Udostępniamy funkcję, jeśli inne komponenty chciałyby ręcznie odświeżyć
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}