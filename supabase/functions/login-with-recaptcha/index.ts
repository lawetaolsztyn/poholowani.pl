const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const RECAPTCHA_SECRET = Deno.env.get("RECAPTCHA_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

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
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  try {
    const { email, password, recaptchaToken } = await req.json();
    console.log("Request body:", { email, password, recaptchaToken });

    if (!email || !password || !recaptchaToken) {
      return jsonResponse({ error: "Brak wymaganych danych." }, 400);
    }

    // Weryfikacja reCAPTCHA
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
      return jsonResponse({ error: "Nieudana weryfikacja reCAPTCHA.", details: recaptchaData["error-codes"] }, 403);
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return jsonResponse({ error: "Brak konfiguracji Supabase." }, 500);
    }

    // Próba logowania użytkownika przez Supabase Auth REST API
    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
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
    console.log("loginData:", loginData);

    if (!loginResponse.ok || loginData.error) {
      return jsonResponse({ error: loginData.error_description || loginData.error || "Błąd logowania" }, 401);
    }

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
