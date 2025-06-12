// supabase/functions/_shared/cors.ts

const allowedOrigins = [
  'https://localhost:5173', // Dla środowiska lokalnego
  'http://localhost:5173', // Dodaj, jeśli lokalnie używasz http zamiast https
  'https://www.poholowani.pl', // Twoja domena produkcyjna
  'https://poholowani.pl' // Dodaj domenę bez www, jeśli jej używasz
];

export function getCorsHeaders(requestOrigin: string | null) {
  const origin = requestOrigin || '';
  const isAllowed = allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0], // Użyj pierwszej dozwolonej, jeśli origin nie jest dozwolony
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // Dodaj dozwolone metody
  };
}