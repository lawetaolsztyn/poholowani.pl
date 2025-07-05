// src/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Upewnij się, że ścieżka do supabaseClient.js jest poprawna

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
        setCurrentUser(null);
        setUserRole(null);
      } else {
        setCurrentUser(user);
        if (user) {
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
        } else {
          setUserRole(null);
        }
      }
      setLoading(false); // Zakończ ładowanie po pobraniu danych użytkownika
    };

    fetchUser(); // Wywołaj funkcję raz przy montowaniu komponentu

    // Subskrybuj zmiany stanu uwierzytelnienia (logowanie/wylogowanie)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Ustaw aktualnego użytkownika i odśwież jego rolę
      setCurrentUser(session?.user || null);
      if (session?.user) {
        const fetchRole = async () => {
          const { data: profile, error: profileError } = await supabase
            .from('users_extended')
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (profileError) {
            console.error("Error fetching user role on auth state change:", profileError.message);
            setUserRole(null);
          } else {
            setUserRole(profile?.role || null);
          }
        };
        fetchRole();
      } else {
        setUserRole(null);
      }
      setLoading(false); // Zakończ ładowanie po zmianie stanu autoryzacji
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
    // Możesz tutaj dodać inne funkcje, np. login/logout, jeśli chcesz je centralizować
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