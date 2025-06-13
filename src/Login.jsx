// src/Login.jsx

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Header from './components/Header';
import './LandingPage.css';
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
    const handleAuthRedirect = async (user) => {
      if (!user) {
        // Użytkownik wylogowany, lub sesja wygasła
        console.log("handleAuthRedirect: Brak użytkownika. Przekierowuję do logowania.");
        navigate('/login'); // Zapewnij, że zawsze jesteśmy na /login, jeśli wylogowani
        return;
      }

      console.log("handleAuthRedirect: Użytkownik zalogowany:", user);

      // Zawsze pobieraj aktualny profil z bazy danych dla decyzyjności
      const { data: profile, error: profileError } = await supabase
        .from('users_extended')
        .select('role') // Pobieramy tylko rolę, aby było szybciej
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        // Jeśli profil nie istnieje (PGRST116) lub inny błąd,
        // kieruj do wyboru roli. Trigger powinien go stworzyć.
        console.error('❌ handleAuthRedirect: Błąd pobierania profilu lub brak profilu:', profileError.message);
        navigate('/choose-role'); // Nadal kierujemy na choose-role, jeśli błąd, aby to obsłużyć.
        return;
      }

      // Sprawdzamy rolę (konwertując na małe litery dla spójności)
      // DODAJ TE LOGI, ABY ZOBACZYĆ DOKŁADNIE, CO JEST W profile.role
      console.log('DEBUG: profile.role z bazy danych w Login.jsx:', profile.role);
      console.log('DEBUG: profile.role po toLowerCase() w Login.jsx:', profile.role?.toLowerCase());

      if (profile.role?.toLowerCase() === 'nieprzypisana') {
        console.log('handleAuthRedirect: Rola użytkownika to "nieprzypisana". Przekierowuję do wyboru roli.');
        navigate('/choose-role');
        return;
      }

      // Jeśli rola jest już ustawiona (np. 'klient' lub 'firma')
      console.log('handleAuthRedirect: Rola użytkownika już ustawiona na:', profile.role, '. Przekierowuję do profilu.');
      navigate('/profil');
    };

    // Nasłuchuj zmian stanu autentykacji
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      if (event === 'SIGNED_IN') {
        handleAuthRedirect(session?.user);
      } else if (event === 'SIGNED_OUT') {
        navigate('/login');
      }
    });

    // POZA słuchaczem, sprawdzaj sesję tylko raz przy załadowaniu komponentu,
    // aby obsłużyć przypadek, gdy użytkownik jest już zalogowany przy wejściu na stronę /login
    // i odświeża ją.
    const checkInitialAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        handleAuthRedirect(user);
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

  try {
    const response = await fetch(import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, recaptchaToken: token }),
});

    const data = await response.json();

    if (!response.ok) {
      setMessage(`❌ Błąd logowania: ${data.error || 'Nieznany błąd'}`);
      return;
    }

    // Ustaw sesję ręcznie
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    setMessage('✅ Zalogowano pomyślnie');
    navigate('/profil');
  } catch (err) {
    setMessage('❌ Błąd logowania');
    console.error(err);
  }
};


  const handleOAuthLogin = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'https://poholowani.pl/choose-role'
      }
    });
    if (error) console.error('OAuth error:', error.message);
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
// test