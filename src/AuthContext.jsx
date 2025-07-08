// src/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient'; //

const AuthContext = createContext(); //

export function AuthProvider({ children }) { //
  const [currentUser, setCurrentUser] = useState(null); //
  const [userRole, setUserRole] = useState(null); //
  const [loading, setLoading] = useState(true); //
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0); //

  // ZMIENIONE: Funkcja fetchTotalUnreadMessages opakowana w useCallback
  const fetchTotalUnreadMessages = useCallback(async (userId) => { //
    if (!userId) { //
      setTotalUnreadMessages(0); //
      return; //
    }
    try {
      const { data, error } = await supabase //
        .from('conversation_participants') //
        .select('unread_messages_count') //
        .eq('user_id', userId); //

      if (error) { //
        console.error("Błąd pobierania sumy nieprzeczytanych wiadomości:", error.message); //
        setTotalUnreadMessages(0); //
        return; //
      }

      // Ważne: Sumuj tylko te, które mają unread_messages_count > 0, jeśli takie są w bazie
      const sum = data.reduce((acc, participant) => acc + participant.unread_messages_count, 0); //
      setTotalUnreadMessages(sum); //
    } catch (err) {
      console.error("Ogólny błąd w fetchTotalUnreadMessages:", err.message); //
      setTotalUnreadMessages(0); //
    }
  }, []); // Brak zależności, aby ta funkcja była stabilna i nie powodowała pętli //

  useEffect(() => { //
    let authListener = null; //
    let participantsChannel = null; // Zmienna do przechowywania subskrypcji kanału participants //

    const setupAuthAndSubscriptions = async (initialLoad = false) => { //
      // Pobierz początkową sesję (lub aktualizację z authListener)
      const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser(); //

      if (sessionError) { //
        if (sessionError.message === 'Auth session missing!') { //
          console.info("Informacja: Użytkownik nie jest zalogowany."); //
        } else {
          console.error("Error fetching user data:", sessionError.message); //
        }
        setCurrentUser(null); //
        setUserRole(null); //
        setTotalUnreadMessages(0); //
        setLoading(false); //
        return; // Ważne: Zakończ, jeśli użytkownik nie jest zalogowany //
      }

      if (sessionUser) { //
        setCurrentUser(sessionUser); //
        const { data: profile, error: profileError } = await supabase //
          .from('users_extended') //
          .select('role') //
          .eq('id', sessionUser.id) //
          .single(); //

        if (profileError) { //
          console.error("Error fetching user role:", profileError.message); //
          setUserRole(null); //
        } else {
          setUserRole(profile?.role || null); //
        }

        // Pobierz początkowy licznik nieprzeczytanych wiadomości
        fetchTotalUnreadMessages(sessionUser.id); //

        // Subskrypcja do zmian w conversation_participants dla bieżącego użytkownika
        // Aktywuj tylko, jeśli jest zalogowany i subskrypcja jeszcze nie istnieje
        // Zintegrowana logika z UnreadMessagesListener.jsx
        if (!participantsChannel) { // Sprawdzamy, czy kanał już nie istnieje //
            participantsChannel = supabase //
            .channel(`all_participants_updates_listener_client_filtered_${sessionUser.id}`) // Użyj unikalnej nazwy kanału, np. tej z UnreadMessagesListener //
            .on('postgres_changes', { //
              event: 'UPDATE', // Interesują nas aktualizacje //
              schema: 'public', //
              table: 'conversation_participants', //
              filter: `user_id=eq.${sessionUser.id}` // Filtruj tylko zmiany dotyczące tego użytkownika //
            }, (payload) => {
              console.log('Realtime change in conversation_participants for current user:', payload); //
              // Po każdej zmianie (np. zwiększeniu licznika lub zresetowaniu), odśwież globalny licznik
              fetchTotalUnreadMessages(sessionUser.id); //
            })
            .subscribe((status) => {
                // Logowanie statusu subskrypcji - przeniesione z UnreadMessagesListener.jsx
                if (status === 'SUBSCRIBED') { //
                    console.log('🟢 WebSocket SUBSCRIBED to unread messages!'); //
                } else {
                    console.warn('🔴 Problem z subskrypcją WebSocket dla nieprzeczytanych wiadomości:', status); //
                }
            });
        }

      } else { //
        setCurrentUser(null); //
        setUserRole(null); //
        setTotalUnreadMessages(0); //
        // Usuń subskrypcję, jeśli użytkownik się wylogował //
        if (participantsChannel) { //
          supabase.removeChannel(participantsChannel); //
          participantsChannel = null; // Resetuj zmienną kanału //
        }
      }
      setLoading(false); //
    };

    // Initial load
    setupAuthAndSubscriptions(true); //

    // Subskrybuj zmiany stanu uwierzytelnienia (logowanie/wylogowanie)
    authListener = supabase.auth.onAuthStateChange((_event, session) => { //
      // Wywołujemy setupAuthAndSubscriptions, aby ponownie skonfigurować wszystko, w tym subskrypcję participants
      // po każdej zmianie stanu autoryzacji
      setupAuthAndSubscriptions(false); // Nie jest to initial load //
    });

    // Funkcja czyszcząca subskrypcje przy odmontowaniu komponentu
    return () => { //
      if (authListener?.data?.subscription) { //
        authListener.data.subscription.unsubscribe(); //
      }
      if (participantsChannel) { // Upewnij się, że kanał jest usunięty przy czyszczeniu //
        supabase.removeChannel(participantsChannel); //
      }
    };
  }, [fetchTotalUnreadMessages]); // Zależność od funkcji useCallback //

  const value = { //
    currentUser, //
    userRole, //
    loading, //
    totalUnreadMessages, //
    fetchTotalUnreadMessages //
  };

  return ( //
    <AuthContext.Provider value={value}> //
      {children} //
    </AuthContext.Provider> //
  );
}

export function useAuth() { //
  const context = useContext(AuthContext); //
  if (context === undefined) { //
    throw new Error('useAuth must be used within an AuthProvider'); //
  }
  return context; //
}