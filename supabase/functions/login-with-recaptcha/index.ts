// import { serve } from "https://deno.land/std@0.224.2/http/server.ts";

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const RECAPTCHA_SECRET = Deno.env.get("RECAPTCHA_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
console.log("Login-with-recaptcha function invoked");
console.log("RECAPTCHA_SECRET_KEY:", RECAPTCHA_SECRET ? "✔️" : "❌");
  console.log("SUPABASE_URL:", SUPABASE_URL || "❌");
  console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✔️" : "❌");

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method Not Allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email, password, recaptchaToken } = await req.json();
    console.log("Request body:", { email, password, recaptchaToken });

    if (!email || !password || !recaptchaToken) {
      return new Response(
        JSON.stringify({ error: "Brak wymaganych danych." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Nieudana weryfikacja reCAPTCHA." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Logowanie użytkownika przez Supabase Auth REST API
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Brak konfiguracji Supabase." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
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
    console.log("Supabase login response:", loginData);

    if (loginData.error) {
      return new Response(
        JSON.stringify({ error: loginData.error_description || loginData.error }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
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
    console.error("❌ Błąd w funkcji:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
