import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const RECAPTCHA_SECRET = Deno.env.get("RECAPTCHA_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { email, password, recaptchaToken } = await req.json();

    if (!email || !password || !recaptchaToken) {
      return new Response(JSON.stringify({ error: "Brak wymaganych danych." }), { status: 400 });
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

    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      return new Response(JSON.stringify({ error: "Nieudana weryfikacja reCAPTCHA." }), { status: 403 });
    }

    // Logowanie użytkownika przez Supabase Auth REST API
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Brak konfiguracji Supabase." }), { status: 500 });
    }

    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        grant_type: "password",
        email,
        password,
      }),
    });

    const loginData = await loginResponse.json();

    if (loginData.error) {
      return new Response(JSON.stringify({ error: loginData.error_description || loginData.error }), { status: 401 });
    }

    // Zwracamy tokeny i usera do frontendu
    return new Response(
      JSON.stringify({
        user: loginData.user,
        access_token: loginData.access_token,
        refresh_token: loginData.refresh_token,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
