import 'https://deno.land/x/dotenv@v3.2.2/load.ts'; // Dodaj tę linię na samej górze

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const RECAPTCHA_SECRET = Deno.env.get("RECAPTCHA_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // Używany tylko do logowania, nie do działania funkcji

// ---
// ===== CORS =====
// UWAGA: Używaj '*' tylko do testów lokalnych. W produkcji podaj pełną domenę np. 'https://www.poholowani.pl'
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.poholowani.pl', // Zmieniono na konkretną domenę, jak sugerowałeś
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
};

Deno.serve(async (req) => {
  console.log("Login-with-recaptcha function invoked");
  console.log("RECAPTCHA_SECRET_KEY:", RECAPTCHA_SECRET ? "✔️" : "❌");
  console.log("SUPABASE_URL:", SUPABASE_URL || "❌");
  console.log("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✔️" : "❌");
  console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✔️" : "❌");

  // Obsługa preflight requestów (OPTIONS)
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request (preflight)."); // Dodano log
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
    console.log(`Method Not Allowed: Received ${req.method}, expected POST.`); // Ulepszono log
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  try {
    // === Logowanie danych wejściowych z żądania ===
    const { email, password, recaptchaToken } = await req.json();
    console.log("Received email from request:", email);
    console.log("Received password length from request:", password ? password.length : 'null/undefined'); // Logujemy tylko długość hasła
    console.log("Received recaptchaToken from request:", recaptchaToken);

    if (!email || !password || !recaptchaToken) {
      console.log("Missing required data (email, password, or recaptchaToken). Responding with 400."); // Ulepszono log
      return jsonResponse({ error: "Brak wymaganych danych." }, 400);
    }

    // ---
    // Start Weryfikacja reCAPTCHA
    console.log("Attempting reCAPTCHA verification...");
    const recaptchaParams = new URLSearchParams();
    recaptchaParams.append("secret", RECAPTCHA_SECRET || "");
    recaptchaParams.append("response", recaptchaToken);

    console.log("reCAPTCHA verification URL:", RECAPTCHA_VERIFY_URL); // Dodano log
    console.log("reCAPTCHA secret used:", RECAPTCHA_SECRET ? "✔️" : "❌"); // Dodano log

    const recaptchaRes = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      body: recaptchaParams,
    });
    console.log("reCAPTCHA fetch response status:", recaptchaRes.status);

    const recaptchaData = await recaptchaRes.json();
    console.log("reCAPTCHA response data:", recaptchaData);

    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      console.log("reCAPTCHA verification failed or score too low. Responding with 403."); // Ulepszono log
      return jsonResponse({ error: "Nieudana weryfikacja reCAPTCHA.", details: recaptchaData["error-codes"] }, 403);
    }
    console.log("reCAPTCHA verification successful.");
    // Koniec Weryfikacja reCAPTCHA

    // ---
    // Start Sprawdzanie konfiguracji Supabase
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Critical: SUPABASE_URL or SUPABASE_ANON_KEY is missing. Responding with 500."); // Ulepszono log
      return jsonResponse({ error: "Brak konfiguracji Supabase (anon key)." }, 500);
    }
    console.log("Supabase configuration checked. Proceeding with login attempt.");
    // Koniec Sprawdzanie konfiguracji Supabase

    // ---
    // Próba logowania użytkownika przez Supabase Auth REST API
    console.log("Attempting user login via Supabase Auth REST API...");
    console.log("Login API URL:", `${SUPABASE_URL}/auth/v1/signin`); // Upewniamy się, że to /signin

    const requestBodyForSupabase = {
      email,
      password,
    };
    console.log("Supabase login request body (stringified):", JSON.stringify(requestBodyForSupabase)); // Logujemy finalny JSON body

    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/signin`, { // Upewniamy się, że to /signin
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(requestBodyForSupabase),
    });

    // === Logowanie odpowiedzi z Supabase Auth API ===
    console.log("Response from Supabase Auth API:");
    console.log("  loginResponse.ok:", loginResponse.ok);
    console.log("  loginResponse.status:", loginResponse.status);

    // *** WAŻNA ZMIANA TUTAJ: Najpierw pobieramy tekst, a potem próbujemy parsować JSON ***
    const rawResponseText = await loginResponse.text();
    console.log("  RAW RESPONSE TEXT from Supabase:", rawResponseText);

    let loginData: any = {}; // Zaczynamy od pustego obiektu, aby uniknąć błędów
    try {
        if (rawResponseText) { // Sprawdzamy, czy w ogóle coś dostaliśmy w odpowiedzi
            loginData = JSON.parse(rawResponseText);
        }
    } catch (jsonParseError: any) {
        console.error("❌ Failed to parse JSON from Supabase response (this is expected if response is not JSON):", jsonParseError.message, "Raw text was:", rawResponseText);
        // Jeśli ten błąd występuje, to znaczy, że odpowiedź NIE JEST JSON-em.
        // W tym przypadku nie będziemy mieli loginData.error ani loginData.error_description.
        // Musimy podjąć decyzję, co zrobić, jeśli odpowiedź nie jest JSON-em.
        // Na razie zwrócimy ogólny błąd 500, bo to oznacza nieoczekiwaną odpowiedź od Supabase.
        return jsonResponse({ error: "Nieoczekiwana odpowiedź od serwera autoryzacji.", details: rawResponseText }, 500);
    }
    // Koniec ważnej zmiany

    console.log("  loginData (parsed JSON body if successful):", loginData); // Wyświetlamy cały obiekt JSON odpowiedzi
    console.log("  ❌ loginData.error:", loginData.error);
    console.log("  ❌ loginData.error_description:", loginData.error_description);

    if (!loginResponse.ok || loginData.error) {
      console.log(`Login failed or error received from Supabase Auth API. Status: ${loginResponse.status}. Responding with 401.`); // Ulepszono log
      return jsonResponse({ error: loginData.error_description || loginData.error || "Błąd logowania" }, 401);
    }

    console.log("Login successful. Returning tokens to client."); // Ulepszono log
    return jsonResponse({
      user: loginData.user,
      access_token: loginData.access_token,
      refresh_token: loginData.refresh_token,
    }, 200);

  } catch (err: any) { // Określono typ błędu jako 'any' dla lepszej kompatybilności
    console.error("❌ Błąd w funkcji (główny try-catch block):", err.message, "Stack:", err.stack); // Dodano stack trace
    return jsonResponse({ error: "Internal server error", details: err.message }, 500);
  } finally {
    console.log("--- Edge Function finished ---");
  }
});