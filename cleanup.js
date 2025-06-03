// cleanup.js
// Node.js script to remove expired routes from Supabase

// Polyfill fetch for Node.js
import fetch from 'node-fetch';
if (!globalThis.fetch) globalThis.fetch = fetch;

import { createClient } from '@supabase/supabase-js';

// Load environment variables (if using .env locally)
import 'dotenv/config';

// Validate ENV vars
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Brakuje zmiennych ENV: SUPABASE_URL i/lub SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseKey);

async function runCleanup() {
  try {
    const now = new Date();
    // Dziś o północy
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Wczorajsza data
    const cutoff = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);
    const cutoffISO = cutoff.toISOString().split('T')[0];

    // Usuń trasy starsze niż cutoffISO
    const { data, error } = await supabase
      .from('routes')
      .delete()
      .lt('date', cutoffISO);

    if (error) {
      console.error('❌ Błąd przy czyszczeniu tras:', error.message);
      process.exit(1);
    }

    console.log(`✅ Usunięto ${data?.length ?? 0} tras starszych niż ${cutoffISO}`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Nieoczekiwany błąd podczas czyszczenia tras:', e.message);
    process.exit(1);
  }
}

// Uruchom skrypt
runCleanup();
