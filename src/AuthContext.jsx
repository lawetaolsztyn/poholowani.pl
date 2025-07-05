// src/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  const fetchTotalUnreadMessages = async (userId) => {
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
        console.error("Błąd pobierania sumy nieprzeczytanych wiadomości:", error.message);
        setTotalUnreadMessages(0);
        return;
      }

      const sum = data.reduce((acc, participant) => acc + participant.unread_messages_count, 0);
      setTotalUnreadMessages(sum);
    } catch (err) {
      console.error("Ogólny błąd w fetchTotalUnreadMessages:", err.message);
      setTotalUnreadMessages(0);
    }
  };

  useEffect(() => {
    const fetchUserAndData = async (user) => {
      if (user) {
        setCurrentUser(user);
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
        fetchTotalUnreadMessages(user.id);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setTotalUnreadMessages(0);
      }
      setLoading(false);
    };

    // Pobranie początkowego użytkownika i jego danych
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      // --- ZMIANA TUTAJ ---
      if (error) {
        // Jeśli błąd to "Auth session missing!", to jest to normalne dla niezalogowanych
        if (error.message === 'Auth session missing!') {
          console.info("Informacja: Użytkownik nie jest zalogowany."); // Loguj jako info, nie error
        } else {
          console.error("Error fetching initial user:", error.message); // Inne błędy loguj jako error
        }
        setLoading(false);
      } else {
        fetchUserAndData(user);
      }
    });

    // Subskrybuj zmiany stanu uwierzytelnienia
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserAndData(session?.user || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

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