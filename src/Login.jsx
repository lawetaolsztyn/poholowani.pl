import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Header from './components/Header';
import './LandingPage.css';
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
  const navigate = useNavigate();

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
        <div style={wrapper}>
          <h2 style={{ marginBottom: 20, textAlign: 'center', fontSize: '1.8rem', color: '#333' }}>
            {resetMode ? 'Resetowanie Hasła' : 'Zaloguj się'}
          </h2>

          {!resetMode ? (
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
              <input
                type="password"
                placeholder="Hasło"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
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
                  />
                </div>
              )}

              <button type="submit" style={btnStyle}>Zaloguj</button>
              <button type="button" onClick={() => setResetMode(true)} style={linkStyle}>Zapomniałeś hasła?</button>
            </form>
          ) : (
            <>
              <input
                type="email"
                placeholder="Wpisz swój e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
              <button type="button" onClick={handleResetPassword} style={btnStyle}>Wyślij link do resetowania</button>
              <button type="button" onClick={() => setResetMode(false)} style={linkStyle}>Wróć do logowania</button>
            </>
          )}

          <hr style={{ margin: '20px 0' }} />

          <button onClick={() => handleOAuthLogin('google')} style={{ ...btnStyle, backgroundColor: '#db4437' }}>
            Zaloguj przez Google
          </button>
          <button onClick={() => handleOAuthLogin('facebook')} style={{ ...btnStyle, backgroundColor: '#3b5998' }}>
            Zaloguj przez Facebook
          </button>

          {message && <p style={{ marginTop: 20 }}>{message}</p>}

          {showResendEmailButton && (
            <button
              type="button"
              onClick={handleResendActivationEmail}
              disabled={isResendLoading}
              style={{ ...btnStyle, backgroundColor: isResendLoading ? '#ccc' : '#28a745', marginTop: 10 }}
            >
              {isResendLoading ? 'Wysyłam...' : 'Wyślij ponownie link aktywacyjny'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

const wrapper = {
  background: '#fff',
  padding: 40,
  maxWidth: 500,
  margin: '0 auto',
  marginTop: 40,
  borderRadius: 12,
  boxShadow: '0 0 15px rgba(0,0,0,0.1)'
};

const inputStyle = {
  width: '100%',
  padding: 12,
  marginBottom: 15,
  borderRadius: 6,
  border: '1px solid #ccc',
  fontSize: '1rem'
};

const btnStyle = {
  width: '100%',
  padding: 12,
  backgroundColor: '#007bff',
  color: '#fff',
  fontSize: '1rem',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
  marginBottom: 10
};

const linkStyle = {
  width: '100%',
  padding: 12,
  backgroundColor: 'transparent',
  color: '#007bff',
  fontSize: '1rem',
  border: '1px solid #007bff',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'background-color 0.3s ease, color 0.3s ease',
  marginTop: 5,
  display: 'block',
  textAlign: 'center',
  textDecoration: 'none'
};
