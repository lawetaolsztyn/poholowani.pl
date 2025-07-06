// src/Login.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate, Link } from 'react-router-dom'; // Dodano Link, jeśli jest używany w szablonie
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'; // Import hooka

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha(); // Użycie hooka

  // NOWY STAN: Czy reCAPTCHA jest gotowa do użycia
  const [recaptchaReady, setRecaptchaReady] = useState(false); //

  // Efekt do monitorowania gotowości reCAPTCHA
  useEffect(() => {
    if (executeRecaptcha) {
      setRecaptchaReady(true); //
    } else {
      setRecaptchaReady(false); //
    }
  }, [executeRecaptcha]); // Zależy od dostępności executeRecaptcha


  // Funkcja obsługi logowania (główna)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Sprawdzenie, czy reCAPTCHA jest gotowa przed próbą wywołania
    if (!recaptchaReady || !executeRecaptcha) { //
      setMessage('Błąd reCAPTCHA: Usługa zabezpieczeń niezaładowana. Proszę chwilę poczekać i spróbować ponownie.'); //
      setLoading(false);
      return;
    }

    try {
      const recaptchaToken = await executeRecaptcha('login'); // Wywołanie reCAPTCHA
      if (!recaptchaToken) { //
        setMessage('Błąd reCAPTCHA: Nie udało się uzyskać tokena. Proszę spróbować ponownie.'); //
        setLoading(false);
        return;
      }

      // Wysłanie danych do Twojej funkcji Supabase Edge Function
      const response = await fetch('https://rzqahfqtbqsmhodzlgzs.supabase.co/functions/v1/login-with-recaptcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${recaptchaToken}` // Token reCAPTCHA jako Bearer token
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Jeśli odpowiedź nie jest OK (np. 403 Forbidden), obsłuż błąd
        throw new Error(data.message || 'Nieznany błąd podczas weryfikacji logowania.');
      }

      // Jeśli logowanie przebiegło pomyślnie, zaloguj użytkownika przez Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      setMessage('✅ Zalogowano pomyślnie!');
      // Sprawdź, czy jest jakieś przekierowanie po logowaniu
      const redirectTo = localStorage.getItem('redirect_after_login');
      if (redirectTo) {
        localStorage.removeItem('redirect_after_login');
        navigate(redirectTo);
      } else {
        navigate('/'); // Domyślne przekierowanie na stronę główną
      }

    } catch (err) {
      console.error('Błąd logowania:', err.message);
      let errorMessage = 'Wystąpił błąd podczas logowania. Sprawdź swoje dane.';
      if (err.message.includes('Invalid login credentials')) {
        errorMessage = 'Błędny email lub hasło.';
      } else if (err.message.includes('reCAPTCHA')) {
        errorMessage = err.message; // Wyświetlaj bardziej szczegółowe błędy reCAPTCHA
      }
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja obsługi logowania przez Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage('');

    if (!recaptchaReady || !executeRecaptcha) { //
        setMessage('Błąd reCAPTCHA: Usługa zabezpieczeń niezaładowana. Proszę chwilę poczekać i spróbować ponownie.'); //
        setLoading(false);
        return;
    }

    try {
        const recaptchaToken = await executeRecaptcha('google_login'); //
        if (!recaptchaToken) { //
            setMessage('Błąd reCAPTCHA: Nie udało się uzyskać tokena Google. Spróbuj ponownie.'); //
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                    // Możesz przekazać token reCAPTCHA w queryParams,
                    // jeśli Twoja funkcja Edge Function go potrzebuje do weryfikacji OAuth
                    // (chociaż zwykle reCAPTCHA jest używana dla standardowych loginów email/hasło,
                    // a nie dla OAuth, które ma własne zabezpieczenia).
                    // Jeśli Twoja funkcja edge function oczekuje tego tokena również dla OAuth, musisz go tutaj dodać.
                    // recaptcha_token: recaptchaToken // Przykład, jeśli potrzebne
                },
                redirectTo: window.location.origin + '/choose-role' // Przekierowanie po pomyślnym logowaniu
            },
        });

        if (error) {
            throw error;
        }
        // Użytkownik zostanie przekierowany do dostawcy OAuth
    } catch (error) {
        console.error("Błąd logowania przez Google:", error.message);
        setMessage(`❌ Błąd logowania przez Google: ${error.message}`);
    } finally {
        setLoading(false);
    }
};


  return (
    <div className="login-container">
      <h2>Zaloguj się</h2>
      {message && <p className={`message ${message.includes('Błąd') || message.startsWith('❌') ? 'error' : 'success'}`}>{message}</p>}
      <form onSubmit={handleLogin} className="login-form">
        <label className="login-label">
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
            disabled={loading || !recaptchaReady} //
          />
        </label>
        <label className="login-label">
          Hasło:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
            disabled={loading || !recaptchaReady} //
          />
        </label>
        <button type="submit" disabled={loading || !recaptchaReady} className="login-button"> {/* */}
          {loading ? 'Logowanie...' : 'Zaloguj'}
        </button>

        {/* Komunikat, gdy reCAPTCHA się ładuje */}
        {!recaptchaReady && ( //
          <p className="recaptcha-loading-message">
            Ładowanie zabezpieczeń (reCAPTCHA)... Proszę chwilę poczekać.
          </p>
        )}

      </form>

      <p className="login-register-text">
        Nie masz konta? <Link to="/register">Zarejestruj się</Link>
      </p>
      <p className="login-register-text">
        <Link to="/reset-password">Zapomniałeś hasła?</Link>
      </p>

      {/* Przycisk Google Login */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading || !recaptchaReady} //
        className="google-login-button"
      >
        Zaloguj przez Google
      </button>
    </div>
  );
}