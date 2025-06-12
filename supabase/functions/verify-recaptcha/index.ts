// supabase/functions/verify-recaptcha/index.ts

// Zmieniamy import: zamiast statycznego obiektu `corsHeaders`, importujemy funkcję `getCorsHeaders`
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts'; // Importujemy funkcję getCorsHeaders

// Pobierz tajny klucz reCAPTCHA ze zmiennych środowiskowych
const RECAPTCHA_SECRET_KEY = Deno.env.get('RECAPTCHA_SECRET_KEY');

// Sprawdź, czy klucz istnieje. Jeśli nie, funkcja nie zadziała.
if (!RECAPTCHA_SECRET_KEY) {
  console.error('BŁĄD: Zmienna środowiskowa RECAPTCHA_SECRET_KEY nie jest ustawiona.');
  // Możesz rzucić błąd lub zwrócić błąd HTTP, jeśli chcesz.
  // throw new Error('RECAPTCHA_SECRET_KEY is not set');
}

serve(async (req) => {
  // Pobieramy origin żądania
  const requestOrigin = req.headers.get('Origin');
  // Generujemy nagłówki CORS dynamicznie, bazując na pochodzeniu żądania
  const headers = getCorsHeaders(requestOrigin);

  // Obsługa preflight OPTIONS request dla CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: headers }); // Używamy dynamicznie wygenerowanych nagłówków
  }

  try {
    const { recaptchaToken } = await req.json(); // Odbierz token z body żądania

    if (!recaptchaToken) {
      return new Response(
        JSON.stringify({ success: false, errors: ['missing-recaptcha-token'] }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } } // Używamy dynamicznie wygenerowanych nagłówków
      );
    }

    // Weryfikuj token z Google reCAPTCHA API
    const googleResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
    });

    const data = await googleResponse.json();

    if (data.success && data.score >= 0.5) { // Próg dla reCAPTCHA v3, możesz dostosować
      return new Response(
        JSON.stringify({ success: true, score: data.score }),
        { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } } // Używamy dynamicznie wygenerowanych nagłówków
      );
    } else {
      console.error('Weryfikacja reCAPTCHA nieudana:', data);
      return new Response(
        JSON.stringify({ success: false, errors: data['error-codes'] || ['verification-failed'], score: data.score || 0 }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } } // Używamy dynamicznie wygenerowanych nagłówków
      );
    }
  } catch (error) {
    console.error('Błąd w funkcji Edge Function:', error.message);
    return new Response(
      JSON.stringify({ success: false, errors: ['server-error', error.message] }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } } // Używamy dynamicznie wygenerowanych nagłówków
    );
  }
});