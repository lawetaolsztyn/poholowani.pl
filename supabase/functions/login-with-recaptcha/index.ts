import 'https://deno.land/x/dotenv@v3.2.2/load.ts';

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const RECAPTCHA_SECRET = Deno.env.get("RECAPTCHA_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.poholowani.pl',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
};

Deno.serve(async (req) => {
  console.log("Login-with-recaptcha function invoked");
  console.log("RECAPTCHA_SECRET_KEY:", RECAPTCHA_SECRET ? "✔️" : "❌");
  console.log("SUPABASE_URL (at global scope):", SUPABASE_URL || "❌"); // Dodatkowy log dla sprawdzenia na początku
  console.log("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✔️" : "❌");
  console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✔️" : "❌");

  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request (preflight).");
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

  if (req.method !== "POST") {
    console.log(`Method Not Allowed: Received ${req.method}, expected POST.`);
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  try {
    const { email, password, recaptchaToken } = await req.json();
    console.log("Received email from request:", email);
    console.log("Received password length from request:", password ? password.length : 'null/undefined');
    console.log("Received recaptchaToken from request:", recaptchaToken);

    if (!email || !password || !recaptchaToken) {
      console.log("Missing required data (email, password, or recaptchaToken). Responding with 400.");
      return jsonResponse({ error: "Brak wymaganych danych." }, 400);
    }

    console.log("Attempting reCAPTCHA verification...");
    const recaptchaParams = new URLSearchParams();
    recaptchaParams.append("secret", RECAPTCHA_SECRET || "");
    recaptchaParams.append("response", recaptchaToken);

    console.log("reCAPTCHA verification URL:", RECAPTCHA_VERIFY_URL);
    console.log("reCAPTCHA secret used:", RECAPTCHA_SECRET ? "✔️" : "❌");

    const recaptchaRes = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      body: recaptchaParams,
    });
    console.log("reCAPTCHA fetch response status:", recaptchaRes.status);

    const recaptchaData = await recaptchaRes.json();
    console.log("reCAPTCHA response data:", recaptchaData);

    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      console.log("reCAPTCHA verification failed or score too low. Responding with 403.");
      return jsonResponse({ error: "Nieudana weryfikacja reCAPTCHA.", details: recaptchaData["error-codes"] }, 403);
    }
    console.log("reCAPTCHA verification successful.");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Critical: SUPABASE_URL or SUPABASE_ANON_KEY is missing. Responding with 500.");
      return jsonResponse({ error: "Brak konfiguracji Supabase (anon key)." }, 500);
    }
    console.log("Supabase configuration checked. Proceeding with login attempt.");

    console.log("Attempting user login via Supabase Auth REST API...");
    // === TEN LOG JEST NAJWAŻNIEJSZY TERAZ ===
    console.log("--- FINAL SUPABASE LOGIN API URL being used:", `${SUPABASE_URL}/auth/v1/signin`);

    const requestBodyForSupabase = {
      email,
      password,
    };
    console.log("Supabase login request body (stringified):", JSON.stringify(requestBodyForSupabase));

    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
  },
  body: JSON.stringify({ email, password }),
});

    console.log("Response from Supabase Auth API:");
    console.log("  loginResponse.ok:", loginResponse.ok);
    console.log("  loginResponse.status:", loginResponse.status);

    const rawResponseText = await loginResponse.text();
    console.log("  RAW RESPONSE TEXT from Supabase:", rawResponseText);

    let loginData: any = {};
    try {
        if (rawResponseText) {
            loginData = JSON.parse(rawResponseText);
        }
    } catch (jsonParseError: any) {
        console.error("❌ Failed to parse JSON from Supabase response (this is expected if response is not JSON):", jsonParseError.message, "Raw text was:", rawResponseText);
        // Jeśli ten błąd występuje, to znaczy, że odpowiedź NIE JEST JSON-em.
        // W tym przypadku nie będziemy mieli loginData.error ani loginData.error_description.
        // Zwracamy błąd 500, bo to oznacza nieoczekiwaną odpowiedź od Supabase.
        return jsonResponse({ error: "Nieoczekiwana odpowiedź od serwera autoryzacji.", details: rawResponseText }, 500);
    }

    console.log("  loginData (parsed JSON body if successful):", loginData);
    console.log("  ❌ loginData.error:", loginData.error);
    console.log("  ❌ loginData.error_description:", loginData.error_description);

    if (!loginResponse.ok || loginData.error) {
      console.log(`Login failed or error received from Supabase Auth API. Status: ${loginResponse.status}. Responding with 401.`);
      return jsonResponse({ error: loginData.error_description || loginData.error || "Błąd logowania" }, 401);
    }

    console.log("Login successful. Returning tokens to client.");
    return jsonResponse({
      user: loginData.user,
      access_token: loginData.access_token,
      refresh_token: loginData.refresh_token,
    }, 200);

  } catch (err: any) {
    console.error("❌ Błąd w funkcji (główny try-catch block):", err.message, "Stack:", err.stack);
    return jsonResponse({ error: "Internal server error", details: err.message }, 500);
  } finally {
    console.log("--- Edge Function finished ---");
  }
});