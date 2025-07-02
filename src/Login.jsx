// src/Login.jsx (cała zawartość pliku, z uwzględnieniem zmian)

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Header from './components/Header';
import './LandingPage.css'; // Upewnij się, że ten CSS jest właściwy dla tej strony
import { getRecaptchaToken } from './utils/getRecaptchaToken';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [showResendEmailButton, setShowResendEmailButton] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Ta funkcja jest wywoływana po każdej zmianie stanu autentykacji
    // lub gdy komponent się montuje, aby sprawdzić, czy użytkownik jest już zalogowany.
    const handleAuthRedirect = async (user) => {
      if (!user) {
        // Jeśli brak użytkownika (np. wylogowany), po prostu nic nie robimy na stronie logowania.
        return;
      }

      console.log("Login.jsx: handleAuthRedirect - Użytkownik zalogowany:", user);

      // === LOGIKA PRZEKIEROWANIA PO ZALOGOWANIU ===
      const redirectToAnnounceForm = localStorage.getItem('redirect_to_announce_form');
      const redirectToAnnounceDetailsId = localStorage.getItem('redirect_to_announce_details_id');

      if (redirectToAnnounceForm === 'true') {
        localStorage.removeItem('redirect_to_announce_form'); // Usuń flagę po użyciu
        console.log('Login.jsx: Przekierowuję na /tablica-ogloszen (otworzy formularz po powrocie).');
        navigate('/tablica-ogloszen');
        return;
      }

      if (redirectToAnnounceDetailsId) {
        localStorage.removeItem('redirect_to_announce_details_id'); // Usuń ID po użyciu
        console.log(`Login.jsx: Przekierowuję na /tablica-ogloszen (miał otworzyć szczegóły ID: ${redirectToAnnounceDetailsId}).`);
        // Docelowo: navigate(`/tablica-ogloszen?id=${redirectToAnnounceDetailsId}`);
        navigate('/tablica-ogloszen'); 
        return;
      }
      
      // Standardowe przekierowania, jeśli nie ma żadnych specjalnych flag
      // Pobieramy rolę, aby zdecydować o domyślnym przekierowaniu
      const { data: profile, error: profileError } = await supabase
        .from('users_extended')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(); // Użyj maybeSingle, aby obsłużyć brak profilu bez rzucania błędu

      if (profileError && profileError.code !== 'PGRST116') { // Ignorujemy błąd 'no rows found'
        console.error('Login.jsx: Błąd pobierania profilu:', profileError.message);
        // Możesz tutaj zadecydować o przekierowaniu awaryjnym, np. do /profil
      }

      const userRole = profile?.role?.toLowerCase();

      if (!profile || userRole === 'nieprzypisana') {
        console.log('Login.jsx: Brak profilu lub rola nieprzypisana. Przekierowuję do wyboru roli.');
        navigate('/choose-role');
        return;
      }
      
      // Domyślne przekierowanie, jeśli użytkownik jest zalogowany i ma przypisaną rolę
      console.log('Login.jsx: Użytkownik zalogowany i ma rolę. Przekierowuję do profilu.');
      navigate('/profil');
    };

    // Nasłuchuj zmian stanu autentykacji
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Login.jsx: Auth state changed:', event, session);
      if (event === 'SIGNED_IN') {
        handleAuthRedirect(session?.user);
      } else if (event === 'SIGNED_OUT') {
        // Wyczyść flagi przekierowania, gdy użytkownik się wyloguje
        localStorage.removeItem('redirect_to_announce_form');
        localStorage.removeItem('redirect_to_announce_details_id');
        // Jeśli użytkownik wylogował się i nie jest na stronie logowania, przekieruj
        if (window.location.pathname !== '/login') {
            navigate('/login');
        }
      }
    });

    // Sprawdź początkowy stan autentykacji przy załadowaniu komponentu Login
    const checkInitialAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) { // Jeśli użytkownik jest już zalogowany przy wejściu na /login
            handleAuthRedirect(user);
        }
    };
    checkInitialAuth();


    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]); // navigate jako zależność

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setShowResendEmailButton(false);

    const token = await getRecaptchaToken('login');
    if (!token) {
      setMessage('❌ Nie udało się zweryfikować reCAPTCHA.');
      return;
    }
    console.log("URL edge function:", import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL);
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
        // Dodatkowe sprawdzenie, czy to błąd aktywacji
        if (data.error === "Email not confirmed") {
          setShowResendEmailButton(true);
        }
        return;
      }

      // Ustaw sesję ręcznie
      // To wywoła onAuthStateChange w useEffect, który następnie obsłuży przekierowanie
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      setMessage('✅ Zalogowano pomyślnie');
      // NIE PRZEKIEROWUJ TUTAJ BEZPOŚREDNIO! Pozwól useEffect to zrobić.
      // navigate('/profil'); // <-- USUŃ LUB ZAKOMENTUJ TĘ LINIĘ

    } catch (err) {
      setMessage('❌ Błąd logowania');
      console.error(err);
    }
  };


  const handleOAuthLogin = async (provider) => {
    setMessage(''); // Wyczyść wiadomość przed logowaniem OAuth
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Tutaj możesz dynamicznie ustawić redirectTo, jeśli chcesz, aby OAuth też wracało do /tablica-ogloszen
          // np. redirectTo: localStorage.getItem('redirect_to_announce_form') ? window.location.origin + '/choose-role?returnTo=/tablica-ogloszen' : window.location.origin + '/choose-role'
          redirectTo: 'https://poholowani.pl/choose-role'
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("OAuth error:", error.message);
      setMessage("❌ Błąd logowania OAuth: " + error.message);
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
              <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
              <input type="password" placeholder="Hasło" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
              <button type="submit" style={btnStyle}>Zaloguj</button>
              <button type="button" onClick={() => setResetMode(true)} style={linkStyle}>Zapomniałeś hasła?</button>
            </form>
          ) : (
            <>
              <input type="email" placeholder="Wpisz swój e-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
              <button type="button" onClick={handleResetPassword} style={btnStyle}>Wyślij link do resetowania</button>
              <button type="button" onClick={() => setResetMode(false)} style={linkStyle}>Wróć do logowania</button>
            </>
          )}

          <hr style={{ margin: '20px 0' }} />

          <button onClick={() => handleOAuthLogin('google')} style={{ ...btnStyle, backgroundColor: '#db4437' }}>Zaloguj przez Google</button>
          <button onClick={() => handleOAuthLogin('facebook')} style={{ ...btnStyle, backgroundColor: '#3b5998' }}>Zaloguj przez Facebook</button>
          {message && <p style={{ marginTop: '20px' }}>{message}</p>}

          {showResendEmailButton && (
            <button type="button" onClick={handleResendActivationEmail} disabled={isResendLoading} style={{ ...btnStyle, backgroundColor: isResendLoading ? '#ccc' : '#28a745', marginTop: '10px' }}>
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