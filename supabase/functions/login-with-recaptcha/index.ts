import 'https://deno.land/x/dotenv@v3.2.2/load.ts'; // Dodaj tę linię na samej górze

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const RECAPTCHA_SECRET = Deno.env.get("RECAPTCHA_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");



// ===== CORS =====
// UWAGA: Używaj '*' tylko do testów lokalnych. W produkcji podaj pełną domenę np. 'https://www.poholowani.pl'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
};

Deno.serve(async (req) => {
  console.log("Login-with-recaptcha function invoked");
  console.log("RECAPTCHA_SECRET_KEY:", RECAPTCHA_SECRET ? "✔️" : "❌");
  console.log("SUPABASE_URL:", SUPABASE_URL || "❌");
  console.log("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✔️" : "❌");
  // Dodajemy log dla klucza roli serwisowej
  console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✔️" : "❌"); // Dodano

  // Obsługa preflight requestów
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }

  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  };

  // Blokada innych metod niż POST
  if (req.method !== "POST") {
    console.log("Method Not Allowed: " + req.method); // Dodano
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  try {
    const { email, password, recaptchaToken } = await req.json();
    console.log("Request body:", { email, /* password: '***', */ recaptchaToken }); // Ukryto hasło w logach dla bezpieczeństwa

    if (!email || !password || !recaptchaToken) {
      console.log("Missing required data."); // Dodano
      return jsonResponse({ error: "Brak wymaganych danych." }, 400);
    }

    // --- Start Weryfikacja reCAPTCHA ---
    console.log("Attempting reCAPTCHA verification..."); // Dodano
    const params = new URLSearchParams();
    params.append("secret", RECAPTCHA_SECRET || "");
    params.append("response", recaptchaToken);

    const recaptchaRes = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      body: params,
    });
    console.log("reCAPTCHA fetch response status:", recaptchaRes.status); // Dodano

    const recaptchaData = await recaptchaRes.json();
    console.log("reCAPTCHA response data:", recaptchaData); // Zmieniono na "data" dla jasności

    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      console.log("reCAPTCHA verification failed or score too low."); // Dodano
      return jsonResponse({ error: "Nieudana weryfikacja reCAPTCHA.", details: recaptchaData["error-codes"] }, 403);
    }
    console.log("reCAPTCHA verification successful."); // Dodano
    // --- Koniec Weryfikacja reCAPTCHA ---

    // --- Start Sprawdzanie konfiguracji Supabase ---
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { // Zmieniono z SUPABASE_ANON_KEY na SERVICE_ROLE_KEY
      console.error("Critical: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing."); // Dodano
      return jsonResponse({ error: "Brak konfiguracji Supabase. (klucz serwisowy)" }, 500);
    }
    console.log("Supabase configuration checked. Proceeding with login attempt."); // Dodano
    // --- Koniec Sprawdzanie konfiguracji Supabase ---


    // Próba logowania użytkownika przez Supabase Auth REST API
    console.log("Attempting user login via Supabase Auth REST API..."); // Dodano
    console.log("Login API URL:", `${SUPABASE_URL}/auth/v1/token`); // Dodano
    // Logowanie body żądania (bez hasła!)
    console.log("Login request body:", JSON.stringify({ grant_type: "password", email })); // Dodano


    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY, // KLUCZOWA ZMIANA, Upewnij się, że SUPABASE_SERVICE_ROLE_KEY jest poprawnie ustawiony jako zmienna środowiskowa w Supabase
      },
      body: JSON.stringify({
        grant_type: "password",
        email,
        password,
      }),
    });

    const loginData = await loginResponse.json();
    console.log("loginResponse.ok:", loginResponse.ok);
    console.log("loginResponse.status:", loginResponse.status);
    console.log("loginData:", loginData); // BARDZO WAŻNY LOG

    if (!loginResponse.ok || loginData.error) {
      console.log("Login failed or error received from Supabase Auth API."); // Dodano
      return jsonResponse({ error: loginData.error_description || loginData.error || "Błąd logowania" }, 401);
    }

    console.log("Login successful. Returning tokens."); // Dodano
    return jsonResponse({
      user: loginData.user,
      access_token: loginData.access_token,
      refresh_token: loginData.refresh_token,
    }, 200);

  } catch (err) {
    console.error("❌ Błąd w funkcji (try-catch block):", err.message); // Ulepszono logowanie błędu
    return jsonResponse({ error: "Internal server error", details: err.message }, 500);
  } finally {
    console.log("--- Edge Function finished ---");
  }
});