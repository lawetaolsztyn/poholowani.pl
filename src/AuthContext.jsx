// src/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  // Funkcja fetchTotalUnreadMessages opakowana w useCallback
  const fetchTotalUnreadMessages = useCallback(async (userId) => {
    if (!userId) {
      setTotalUnreadMessages(0);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('unread_messages_count')
        .eq('user_id', userId);

      if (error) {
        console.error("AuthContext: Błąd pobierania sumy nieprzeczytanych wiadomości:", error.message);
        setTotalUnreadMessages(0);
        return;
      }
      const sum = data.reduce((acc, participant) => acc + participant.unread_messages_count, 0);
      setTotalUnreadMessages(sum);
    } catch (err) {
      console.error("AuthContext: Ogólny błąd w fetchTotalUnreadMessages:", err.message);
      setTotalUnreadMessages(0);
    }
  }, []); // Brak zależności, aby ta funkcja była stabilna

  useEffect(() => {
    let participantsChannel = null; // Zmienna do przechowywania subskrypcji kanału participants

    // Ta funkcja będzie wywoływana tylko przez onAuthStateChange, a nie bezpośrednio na starcie useEffect
    const handleAuthStateChange = async (_event, session) => {
      console.log('AuthContext: onAuthStateChange event:', _event, 'Session exists:', !!session);
      setLoading(true); // Zaczynamy ładowanie po każdej zmianie stanu autoryzacji

      let user = session?.user || null;
      let role = null;

      if (user) {
        // Użytkownik zalogowany lub odświeżono sesję
        const { data: profile, error: profileError } = await supabase
          .from('users_extended')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error("AuthContext: Error fetching user role:", profileError.message);
          role = null;
        } else {
          role = profile?.role || null;
        }

        fetchTotalUnreadMessages(user.id);

        // Zarządzanie kanałem Realtime
        if (participantsChannel) { // Jeśli kanał już istnieje
            // Jeśli ID użytkownika się zmieniło, usuń stary kanał
            if (participantsChannel.topic && !participantsChannel.topic.includes(`unread_messages_user_${user.id}`)) {
                console.log(`AuthContext: Usuwam stary kanał Realtime.`);
                supabase.removeChannel(participantsChannel);
                participantsChannel = null;
            }
        }
        if (!participantsChannel) { // Jeśli kanał nie istnieje, utwórz nowy
            console.log(`AuthContext: Subskrybuję OGÓLNE zmiany dla user_id = ${user.id}`);
            participantsChannel = supabase
            .channel(`unread_messages_user_${user.id}`)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'conversation_participants',
              filter: `user_id=eq.${user.id}`
            }, (payload) => {
              console.log('AuthContext: Realtime update dla bieżącego użytkownika:', payload.new);
              fetchTotalUnreadMessages(user.id);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('🟢 AuthContext: WebSocket SUBSCRIBED to unread messages!');
                } else {
                    console.warn('🔴 AuthContext: Problem z subskrypcją WebSocket dla nieprzeczytanych wiadomości:', status);
                }
            });
        }

      } else { // Użytkownik wylogowany / brak sesji
        console.log("AuthContext: Użytkownik wylogowany/brak sesji.");
        setTotalUnreadMessages(0);
        if (participantsChannel) {
          console.log(`AuthContext: Użytkownik wylogowany — czyszczę kanał.`);
          supabase.removeChannel(participantsChannel);
          participantsChannel = null;
        }
      }
      setCurrentUser(user);
      setUserRole(role);
      setLoading(false);
      console.log('AuthContext: Aktualny użytkownik po zmianie stanu:', user ? user.email : 'null', 'Rola:', role);
    };

    // Subskrybuj zmiany stanu uwierzytelnienia (logowanie/wylogowanie/odświeżenie tokena)
    // To jest jedyne miejsce, które powinno wyzwalać aktualizację stanu użytkownika
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initial check: Wywołaj raz, aby ustawić początkowy stan, jeśli onAuthStateChange nie wyzwoli się od razu
    // Ale w tej konfiguracji onAuthStateChange z 'INITIAL_SESSION' powinien to zrobić
    // Możesz usunąć ten setupAuthAndSubscriptions() jeśli onAuthStateChange jest wystarczający
    // W React StrictMode 'INITIAL_SESSION' wywołuje się dwukrotnie, co jest OK.
    // Jeśli chcesz uniknąć podwójnego renderowania na starcie, możesz użyć supabase.auth.getSession() raz.
    // Ale na razie zostawmy, to onAuthStateChange powinien być głównym driverem.

    // Funkcja czyszcząca subskrypcje przy odmontowaniu komponentu
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      if (participantsChannel) {
        console.log('AuthContext: Usuwam kanał przy odmontowaniu AuthProvider.');
        supabase.removeChannel(participantsChannel);
        participantsChannel = null;
      }
    };
  }, [fetchTotalUnreadMessages]); // Zależność od funkcji useCallback

  const value = {
    currentUser,
    userRole,
    loading,
    totalUnreadMessages,
    fetchTotalUnreadMessages
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