// supabase/functions/login-with-recaptcha/index.ts

// import { serve } from "https://deno.land/std@0.224.2/http/server.ts"; // Ta linia nadal powinna być zakomentowana, bo używasz Deno.serve

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const RECAPTCHA_SECRET = Deno.env.get("RECAPTCHA_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// ===== DODANE: Nagłówki CORS =====
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.poholowani.pl', // Zezwól na Twoją domenę z 'www'
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Dozwolone metody dla tej funkcji
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // Dozwolone nagłówki
  'Vary': 'Origin',
};
// ===================================

serve(async (req) => {
  console.log("Login-with-recaptcha function invoked");
  console.log("RECAPTCHA_SECRET_KEY:", RECAPTCHA_SECRET ? "✔️" : "❌");
  console.log("SUPABASE_URL:", SUPABASE_URL || "❌");
  console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✔️" : "❌");

  // ===== DODANE: Obsługa preflight OPTIONS request =====
  // Przeglądarka wysyła OPTIONS request przed POSTem, aby sprawdzić CORS
 if (req.method === 'OPTIONS') {
  return new Response('ok', {
    status: 200, // <- to jest kluczowe!
    headers: corsHeaders,
  });
}
  // ====================================================

  try {
    // Pomocnicza funkcja do zwracania JSON z nagłówkami CORS
    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders, // Dodaj nagłówki CORS do każdej odpowiedzi
          "Content-Type": "application/json",
        },
      });
    };

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method Not Allowed" }, 405);
    }

    const { email, password, recaptchaToken } = await req.json();
    console.log("Request body:", { email, password, recaptchaToken });

    if (!email || !password || !recaptchaToken) {
      return jsonResponse({ error: "Brak wymaganych danych." }, 400);
    }

    // Weryfikacja reCAPTCHA u Google
    const params = new URLSearchParams();
    params.append("secret", RECAPTCHA_SECRET || "");
    params.append("response", recaptchaToken);

    const recaptchaRes = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      body: params,
    });

    const recaptchaData = await recaptchaRes.json();
    console.log("reCAPTCHA response:", recaptchaData);

    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      // Jeśli reCAPTCHA zawiedzie, możesz dodać szczegóły do błędu
      return jsonResponse({ error: "Nieudana weryfikacja reCAPTCHA.", details: recaptchaData['error-codes'] }, 403);
    }

    // Logowanie użytkownika przez Supabase Auth REST API
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Brak konfiguracji Supabase." }, 500);
    }

    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") || ""}`,
      },
      body: JSON.stringify({
        grant_type: "password",
        email,
        password,
      }),
    });

    const loginData = await loginResponse.json();
    console.log("Supabase login response:", loginData);

    if (loginData.error) {
      return jsonResponse({ error: loginData.error_description || loginData.error }, 401);
    }

    // Zwracamy tokeny i usera do frontendu
    return jsonResponse({
      user: loginData.user,
      access_token: loginData.access_token,
      refresh_token: loginData.refresh_token,
    }, 200);

  } catch (err) {
    console.error("❌ Błąd w funkcji:", err);
    return jsonResponse({ error: "Internal server error", details: err.message }, 500);
  } finally {
    console.log("--- Edge Function finished ---");
  }
});