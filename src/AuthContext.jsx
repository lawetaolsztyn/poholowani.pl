// src/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Upewnij się, że ścieżka do supabaseClient.js jest poprawna

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0); // NOWY STAN DLA LICZNIKA

  // NOWA FUNKCJA: Pobieranie i ustawianie całkowitej liczby nieprzeczytanych wiadomości
  const fetchTotalUnreadMessages = async (userId) => {
    if (!userId) { // Upewnij się, że userId jest dostępne
      setTotalUnreadMessages(0);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('unread_messages_count')
        .eq('user_id', userId); // Filtrujemy po ID zalogowanego użytkownika

      if (error) {
        console.error("Błąd pobierania sumy nieprzeczytanych wiadomości:", error.message);
        setTotalUnreadMessages(0); // W przypadku błędu zresetuj licznik
        return;
      }

      const sum = data.reduce((acc, participant) => acc + participant.unread_messages_count, 0);
      setTotalUnreadMessages(sum); // Ustaw nową sumę
    } catch (err) {
      console.error("Ogólny błąd w fetchTotalUnreadMessages:", err.message);
      setTotalUnreadMessages(0);
    }
  };

  useEffect(() => {
    // Pomocnicza funkcja do pobierania użytkownika, jego roli i nieprzeczytanych wiadomości
    const fetchUserAndData = async (user) => {
      if (user) {
        setCurrentUser(user);
        // Pobierz rolę użytkownika z tabeli users_extended
        const { data: profile, error: profileError } = await supabase
          .from('users_extended')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error("Error fetching user role:", profileError.message);
          setUserRole(null);
        } else {
          setUserRole(profile?.role || null);
        }
        fetchTotalUnreadMessages(user.id); // Wywołaj fetchTotalUnreadMessages dla zalogowanego użytkownika
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setTotalUnreadMessages(0); // Wyzeruj licznik po wylogowaniu
      }
      setLoading(false); // Zakończ ładowanie po pobraniu danych użytkownika
    };

    // Pobranie początkowego użytkownika i jego danych przy pierwszym załadowaniu
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        console.error("Error fetching initial user:", error.message);
        setLoading(false);
      } else {
        fetchUserAndData(user);
      }
    });

    // Subskrybuj zmiany stanu uwierzytelnienia (logowanie/wylogowanie)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Wywołaj fetchUserAndData przy każdej zmianie stanu autoryzacji
      fetchUserAndData(session?.user || null); 
    });

    // Funkcja czyszcząca subskrypcję przy odmontowaniu komponentu
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []); // Pusta tablica zależności, aby efekt uruchomił się tylko raz

  const value = {
    currentUser,
    userRole,
    loading,
    totalUnreadMessages,      // UDZIEL DOSTĘPU DO LICZNIKA
    fetchTotalUnreadMessages  // UDZIEL DOSTĘPU DO FUNKCJI ODŚWIEŻANIA
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