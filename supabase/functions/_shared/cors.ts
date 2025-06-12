// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.poholowani.pl', // Zmień * na domenę Twojego frontendu w produkcji!
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};