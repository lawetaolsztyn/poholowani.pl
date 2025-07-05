// src/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0); // NOWY STAN

  // NOWA FUNKCJA: Pobieranie całkowitej liczby nieprzeczytanych wiadomości
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
      console.error("Ogólny błąd fetchTotalUnreadMessages:", err.message);
      setTotalUnreadMessages(0);
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { user } = session;
        // Pobierz rozszerzone dane użytkownika z 'users_extended'
        const { data: userData, error } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Błąd pobierania danych użytkownika z users_extended:", error.message);
          setCurrentUser(user); // Ustaw podstawowe dane, jeśli rozszerzone nie są dostępne
        } else {
          setCurrentUser({ ...user, ...userData }); // Połącz dane z auth.user z users_extended
        }
        fetchTotalUnreadMessages(user.id); // Wywołaj po zalogowaniu
      } else {
        setCurrentUser(null);
        setTotalUnreadMessages(0); // Wyzeruj licznik po wylogowaniu
      }
      setLoading(false);
    });

    // Sprawdź początkową sesję
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { user } = session;
        const { data: userData, error } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Błąd pobierania danych użytkownika z users_extended (początkowa sesja):", error.message);
          setCurrentUser(user);
        } else {
          setCurrentUser({ ...user, ...userData });
        }
        fetchTotalUnreadMessages(user.id); // Wywołaj po załadowaniu początkowej sesji
      } else {
        setCurrentUser(null);
        setTotalUnreadMessages(0);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    loading,
    totalUnreadMessages, // Udostępnij w kontekście
    fetchTotalUnreadMessages // Udostępnij funkcję do odświeżania
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};