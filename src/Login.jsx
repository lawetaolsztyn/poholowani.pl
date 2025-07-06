// src/Login.jsx
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Header from './components/Header';
import './LandingPage.css'; // Upewnij się, że ten CSS jest właściwy dla tej strony


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [showResendEmailButton, setShowResendEmailButton] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // NOWY STAN: Czy reCAPTCHA jest gotowa do użycia
  const [recaptchaReady, setRecaptchaReady] = useState(false); // <-- DODAJ TĘ LINIĘ

  // Efekt do inicjalizacji i nasłuchiwania gotowości reCAPTCHA
  useEffect(() => {
    // Sprawdź, czy grecaptcha jest już dostępne (może być załadowane wcześniej)
    if (typeof grecaptcha !== 'undefined' && grecaptcha.ready) {
      grecaptcha.ready(() => {
        setRecaptchaReady(true);
        console.log("reCAPTCHA is ready from useEffect on mount.");
      });
    }

    // Funkcja nasłuchująca na globalną gotowość grecaptcha (jeśli ładuje się później)
    const onRecaptchaLoad = () => {
      if (typeof grecaptcha !== 'undefined' && grecaptcha.ready) {
        grecaptcha.ready(() => {
          setRecaptchaReady(true);
          console.log("reCAPTCHA is ready from global callback.");
        });
      }
    };

    // Przypisz globalny callback, jeśli jeszcze nie jest zdefiniowany
    // Upewnij się, że skrypt reCAPTCHA jest załadowany asynchronicznie w index.html
    // <script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY" async defer></script>
    if (window.grecaptcha_onload_callbacks) {
      window.grecaptcha_onload_callbacks.push(onRecaptchaLoad);
    } else {
      window.grecaptcha_onload_callbacks = [onRecaptchaLoad];
    }
    
    // Jeśli grecaptcha.ready jest już dostępne, wywołaj od razu
    if (typeof grecaptcha !== 'undefined' && grecaptcha.ready) {
      grecaptcha.ready(() => setRecaptchaReady(true));
    }


    // Logic do przekierowania po zalogowaniu (Twoja istniejąca)
    const handleAuthRedirect = async (user) => {
      if (!user) {
        return;
      }
      console.log("Login.jsx: handleAuthRedirect - Użytkownik zalogowany:", user);
      const redirectToAnnounceForm = localStorage.getItem('redirect_to_announce_form');
      const redirectToAnnounceDetailsId = localStorage.getItem('redirect_to_announce_details_id');

      if (redirectToAnnounceForm === 'true') {
        localStorage.removeItem('redirect_to_announce_form');
        console.log('Login.jsx: Przekierowuję na /tablica-ogloszen (otworzy formularz po powrocie).');
        navigate('/tablica-ogloszen');
        return;
      }
      if (redirectToAnnounceDetailsId) {
        localStorage.removeItem('redirect_to_announce_details_id');
        console.log(`Login.jsx: Przekierowuję na /tablica-ogloszen (miał otworzyć szczegóły ID: ${redirectToAnnounceDetailsId}).`);
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
        console.log('Login.jsx: Brak profilu lub rola nieprzypisana. Przekierowuję do wyboru roli.');
        navigate('/choose-role');
        return;
      }
      console.log('Login.jsx: Użytkownik zalogowany i ma rolę. Przekierowuję do profilu.');
      navigate('/profil');
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Login.jsx: Auth state changed:', event, session);
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
        if (user) {
            handleAuthRedirect(user);
        }
    };
    checkInitialAuth();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]); // navigate jako zależność


  // Funkcja do pobierania tokena reCAPTCHA (z użyciem globalnego grecaptcha)
  // PAMIĘTAJ, ABY ZAŁADOWAĆ SKRYPT reCAPTCHA W index.html
  // <script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY" async defer></script>
  // Gdzie YOUR_SITE_KEY to Twój klucz publiczny reCAPTCHA
  const getRecaptchaToken = async (action) => {
    return new Promise(resolve => {
      if (typeof grecaptcha === 'undefined' || !grecaptcha.ready) {
        console.warn("reCAPTCHA not loaded, waiting...");
        // Jeśli grecaptcha nie jest gotowe, możesz tutaj poczekać lub zwrócić null.
        // Dla pewności, można dodać timeout lub spróbować ponownie po chwili.
        // Jednak najlepiej jest, aby przycisk logowania był disabled, dopóki recaptchaReady jest false.
        resolve(null);
        return;
      }
      grecaptcha.ready(() => {
        grecaptcha.execute(import.meta.env.VITE_RECAPTCHA_SITE_KEY, { action: action })
          .then(token => resolve(token))
          .catch(err => {
            console.error("Error executing reCAPTCHA:", err);
            resolve(null);
          });
      });
    });
  };


  // Funkcja obsługi logowania (główna)
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setShowResendEmailButton(false);

    // Sprawdzenie, czy reCAPTCHA jest gotowa przed próbą wywołania
    if (!recaptchaReady) { //
      setMessage('Błąd: Zabezpieczenia (reCAPTCHA) nie są jeszcze gotowe. Proszę chwilę poczekać i spróbować ponownie.'); //
      return;
    }

    const token = await getRecaptchaToken('login');
    if (!token) {
      setMessage('❌ Nie udało się zweryfikować reCAPTCHA. Spróbuj ponownie.');
      return;
    }
    
    // Ustawienie loading state dla głównego przycisku logowania
    setLoading(true);

    try {
      // Upewnij się, że VITE_SUPABASE_EDGE_FUNCTION_URL jest poprawnie załadowane
      const response = await fetch(import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, recaptchaToken: token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`❌ Błąd logowania: ${data.error || 'Nieznany błąd'}`);
        if (data.error === "Email not confirmed") {
          setShowResendEmailButton(true);
        }
        return;
      }

      // Ustaw sesję ręcznie
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      setMessage('✅ Zalogowano pomyślnie');
      // Przekierowanie nastąpi w useEffect onAuthStateChange
    } catch (err) {
      setMessage('❌ Błąd logowania');
      console.error(err);
    } finally {
      setLoading(false); // Zresetuj loading state
    }
  };


  const handleOAuthLogin = async (provider) => {
    setMessage(''); 

    // Sprawdzenie, czy reCAPTCHA jest gotowa przed próbą wywołania
    if (!recaptchaReady) { //
      setMessage('Błąd: Zabezpieczenia (reCAPTCHA) nie są jeszcze gotowe. Proszę chwilę poczekać i spróbować ponownie.'); //
      return;
    }

    // reCAPTCHA token dla OAuth (opcjonalnie, zależy czy Twoja funkcja Edge Function tego wymaga)
    // Jeśli Twoja funkcja Edge Function do weryfikacji OAuth wymaga reCAPTCHA tokena,
    // musisz go tu pobrać i przekazać w queryParams.
    // const recaptchaToken = await getRecaptchaToken(`${provider}_login`);
    // if (!recaptchaToken) {
    //   setMessage('Błąd reCAPTCHA: Nie udało się uzyskać tokena dla logowania OAuth. Spróbuj ponownie.');
    //   return;
    // }

    setLoading(true); // Ustaw loading state dla przycisków OAuth

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          access_type: 'offline',
          prompt: 'consent',
          redirectTo: 'https://poholowani.pl/choose-role',
          // recaptcha_token: recaptchaToken // Przykład, jeśli potrzebne
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("OAuth error:", error.message);
      setMessage(`❌ Błąd logowania OAuth: ${error.message}`);
    } finally {
      setLoading(false); // Zresetuj loading state
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
          <h2 style={{ marginBottom: '20px', textAlign: 'center', fontSize: '1.8rem', color: '#333' }}>
            {resetMode ? 'Resetowanie Hasła' : 'Zaloguj się'}
          </h2>

          {!resetMode ? (
            <form onSubmit={handleLogin}>
              {/* Pola formularza wyłączone, dopóki reCAPTCHA nie jest gotowa */}
              <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required disabled={!recaptchaReady || loading} />
              <input type="password" placeholder="Hasło" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required disabled={!recaptchaReady || loading} />
              <button type="submit" style={btnStyle} disabled={!recaptchaReady || loading}>Zaloguj</button>
              <button type="button" onClick={() => setResetMode(true)} style={linkStyle} disabled={loading}>Zapomniałeś hasła?</button>
            </form>
          ) : (
            <>
              <input type="email" placeholder="Wpisz swój e-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required disabled={loading} />
              <button type="button" onClick={handleResetPassword} style={btnStyle} disabled={loading}>Wyślij link do resetowania</button>
              <button type="button" onClick={() => setResetMode(false)} style={linkStyle} disabled={loading}>Wróć do logowania</button>
            </>
          )}

          <hr style={{ margin: '20px 0' }} />

          {/* Przyciski OAuth również wyłączone, dopóki reCAPTCHA nie jest gotowa */}
          <button onClick={() => handleOAuthLogin('google')} style={{ ...btnStyle, backgroundColor: '#db4437' }} disabled={!recaptchaReady || loading}>Zaloguj przez Google</button>
          <button onClick={() => handleOAuthLogin('facebook')} style={{ ...btnStyle, backgroundColor: '#3b5998' }} disabled={!recaptchaReady || loading}>Zaloguj przez Facebook</button>
          
          {message && <p style={{ marginTop: '20px' }}>{message}</p>}

          {showResendEmailButton && (
            <button type="button" onClick={handleResendActivationEmail} disabled={isResendLoading} style={{ ...btnStyle, backgroundColor: isResendLoading ? '#ccc' : '#28a745', marginTop: '10px' }}>
              {isResendLoading ? 'Wysyłam...' : 'Wyślij ponownie link aktywacyjny'}
            </button>
          )}

          {/* Komunikat o ładowaniu reCAPTCHA */}
          {!recaptchaReady && (
            <p style={{ marginTop: '10px', textAlign: 'center', color: '#888', fontSize: '0.9em' }}>
              Ładowanie zabezpieczeń (reCAPTCHA)... Proszę chwilę poczekać.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// === Style inline (pamiętaj, że lepiej przenieść je do CSS) ===
const wrapper = {
  background: '#fff',
  padding: '40px',
  maxWidth: '500px',
  margin: '0 auto',
  marginTop: '40px',
  borderRadius: '12px',
  boxShadow: '0 0 15px rgba(0,0,0,0.1)'
};

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginBottom: '15px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '1rem'
};

const btnStyle = {
  width: '100%',
  padding: '12px',
  backgroundColor: '#007bff',
  color: '#fff',
  fontSize: '1rem',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
  marginBottom: '10px'
};

const linkStyle = {
  width: '100%',
  padding: '12px',
  backgroundColor: 'transparent',
  color: '#007bff',
  fontSize: '1rem',
  border: '1px solid #007bff',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease, color 0.3s ease',
  marginTop: '5px',
  display: 'block',
  textAlign: 'center',
  textDecoration: 'none'
};