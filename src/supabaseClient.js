// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // WAŻNE: Zapewnia, że sesja jest przechowywana i odczytywana
    autoRefreshToken: true, // Automatycznie odświeża tokeny sesji
    detectSessionInUrl: true, // Wykrywa sesję w URL (np. po logowaniu OAuth/reset hasła)
    flowType: 'pkce', // Zalecany typ przepływu dla aplikacji SPA/klientowych
  },
});