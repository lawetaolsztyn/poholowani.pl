import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Header from './components/Header';
import './LandingPage.css'; // Zakładam, że ten plik nadal zawiera ogólne style dla całej strony
import './Login.css'; // <--- DODAJ TEN IMPORT DLA NOWYCH STYLÓW LOGOWANIA
import { getRecaptchaToken } from './utils/getRecaptchaToken';
import ReCAPTCHA from 'react-google-recaptcha';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [showResendEmailButton, setShowResendEmailButton] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [captchaVersion, setCaptchaVersion] = useState('v3'); // 'v3' lub 'v2'
  const [recaptchaV2Token, setRecaptchaV2Token] = useState('');
  // Dodajemy stan dla trybu ciemnego, potrzebny do komponentu ReCAPTCHA
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  // Efekt do wykrywania trybu ciemnego przeglądarki
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches);

    // Ustaw początkowy stan
    setIsDarkMode(mediaQuery.matches);

    // Dodaj listenera do zmian
    mediaQuery.addEventListener('change', handleChange);

    // Funkcja czyszcząca
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []); // Pusta tablica zależności, aby efekt uruchomił się tylko raz


  useEffect(() => {
    const handleAuthRedirect = async (user) => {
      if (!user) return;

      const redirectToAnnounceForm = localStorage.getItem('redirect_to_announce_form');
      const redirectToAnnounceDetailsId = localStorage.getItem('redirect_to_announce_details_id');

      if (redirectToAnnounceForm === 'true') {
        localStorage.removeItem('redirect_to_announce_form');
        navigate('/tablica-ogloszen');
        return;
      }

      if (redirectToAnnounceDetailsId) {
        localStorage.removeItem('redirect_to_announce_details_id');
        navigate('/tablica-ogloszen');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users_extended')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Login.jsx: Błąd pobierania profilu:', profileError.message);
      }

      const userRole = profile?.role?.toLowerCase();

      if (!profile || userRole === 'nieprzypisana') {
        navigate('/choose-role');
        return;
      }

      navigate('/profil');
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        handleAuthRedirect(session?.user);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('redirect_to_announce_form');
        localStorage.removeItem('redirect_to_announce_details_id');
        if (window.location.pathname !== '/login') {
          navigate('/login');
        }
      }
    });

    const checkInitialAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) handleAuthRedirect(user);
    };
    checkInitialAuth();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setShowResendEmailButton(false);

    let token = '';
    if (captchaVersion === 'v3') {
      token = await getRecaptchaToken('login');
      if (!token) {
        setMessage('❌ Nie udało się zweryfikować reCAPTCHA v3.');
        return;
      }
    } else if (captchaVersion === 'v2') {
      if (!recaptchaV2Token) {
        setMessage('❌ Potwierdź, że nie jesteś robotem (reCAPTCHA v2).');
        return;
      }
      token = recaptchaV2Token;
    }

    try {
      const response = await fetch(import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, recaptchaToken: token, captchaVersion }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requireCaptchaV2) {
          setMessage('⚠️ Twoja ocena reCAPTCHA v3 jest zbyt niska. Proszę potwierdź, że nie jesteś robotem.');
          setCaptchaVersion('v2');
          return;
        }
        setMessage(`❌ Błąd logowania: ${data.error || 'Nieznany błąd'}`);
        if (data.error === "Email not confirmed") setShowResendEmailButton(true);
        return;
      }

      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      setMessage('✅ Zalogowano pomyślnie');
      // Przekierowanie zrobi useEffect powyżej
    } catch (err) {
      setMessage('❌ Błąd logowania');
      console.error(err);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'https://poholowani.pl/choose-role'
        }
      });
      if (error) throw error;
    } catch (error) {
      setMessage("❌ Błąd logowania OAuth: " + error.message);
      console.error("OAuth error:", error.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage('');
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://poholowani.pl/reset-hasla',
    });
    const { error } = result;
    if (error) {
      setMessage(`❌ Błąd resetowania: ${error.message}`);
      console.error('❌ Reset error:', error);
    } else {
      setMessage('✅ Wysłano instrukcje resetu hasła.');
    }
  };

  const handleResendActivationEmail = async () => {
    setIsResendLoading(true);
    setMessage('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      setMessage(`❌ Błąd wysyłki: ${error.message}`);
      console.error('❌ Błąd wysyłki:', error);
    } else {
      setMessage('✅ Link aktywacyjny wysłany ponownie.');
    }
    setIsResendLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="overlay-header">
        <Header title="Zaloguj się do swojego konta" subtitle="Zarządzaj zleceniami i trasami w jednym miejscu" />
      </div>
      <div className="landing-container">
        {/* Zmieniamy 'style={wrapper}' na 'className="login-form-wrapper"' */}
        <div className="login-form-wrapper">
          {/* Zmieniamy 'style={{ marginBottom: ..., textAlign: ..., fontSize: ..., color: ... }}' na 'className="login-heading"' */}
          <h2 className="login-heading">
            {resetMode ? 'Resetowanie Hasła' : 'Zaloguj się'}
          </h2>

          {!resetMode ? (
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="login-input" // Zmieniamy 'style={inputStyle}' na 'className="login-input"'
                required
              />
              <input
                type="password"
                placeholder="Hasło"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="login-input" // Zmieniamy 'style={inputStyle}' na 'className="login-input"'
                required
              />

              {/* Pokaż reCAPTCHA v2 tylko jeśli wymagana */}
              {captchaVersion === 'v2' && (
                <div style={{ marginBottom: 15 }}>
                  <ReCAPTCHA
                    sitekey={import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY}
                    onChange={token => {
                      setRecaptchaV2Token(token);
                      setMessage('');
                    }}
                    theme={isDarkMode ? 'dark' : 'light'} {/* Ustawienie motywu reCAPTCHA na podstawie stanu isDarkMode */}
                  />
                </div>
              )}

              <button type="submit" className="login-button">Zaloguj</button> {/* Zmieniamy 'style={btnStyle}' na 'className="login-button"' */}
              <button type="button" onClick={() => setResetMode(true)} className="login-link-button">Zapomniałeś hasła?</button> {/* Zmieniamy 'style={linkStyle}' na 'className="login-link-button"' */}
            </form>
          ) : (
            <>
              <input
                type="email"
                placeholder="Wpisz swój e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="login-input" // Zmieniamy 'style={inputStyle}' na 'className="login-input"'
                required
              />
              <button type="button" onClick={handleResetPassword} className="login-button">Wyślij link do resetowania</button> {/* Zmieniamy 'style={btnStyle}' na 'className="login-button"' */}
              <button type="button" onClick={() => setResetMode(false)} className="login-link-button">Wróć do logowania</button> {/* Zmieniamy 'style={linkStyle}' na 'className="login-link-button"' */}
            </>
          )}

          <hr className="login-hr" /> {/* Zmieniamy 'style={{ margin: '20px 0' }}' na 'className="login-hr"' */}

          {/* Tutaj łączymy klasę bazową 'login-button' z klasą specyficzną dla przycisku */}
          <button onClick={() => handleOAuthLogin('google')} className="login-button google">
            Zaloguj przez Google
          </button>
          <button onClick={() => handleOAuthLogin('facebook')} className="login-button facebook">
            Zaloguj przez Facebook
          </button>

          {/* Zmieniamy 'style={{ marginTop: 20 }}' na 'className="login-message"' */}
          {message && <p className="login-message">{message}</p>}

          {showResendEmailButton && (
            <button
              type="button"
              onClick={handleResendActivationEmail}
              disabled={isResendLoading}
              // Warunkowe dodanie klasy 'disabled' jeśli isResendLoading jest true
              className={`login-button resend-email ${isResendLoading ? 'disabled' : ''}`}
            >
              {isResendLoading ? 'Wysyłam...' : 'Wyślij ponownie link aktywacyjny'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

