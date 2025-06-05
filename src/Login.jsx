// src/Login.jsx

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Header from './components/Header';
import './LandingPage.css';

const getRecaptchaToken = async () => {
  return new Promise((resolve) => {
    if (!window.grecaptcha) return resolve(null);
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute('6LeqFVIrAAAAAHYmk1g43t4CyWuNKDKK3EAJDmhr', { action: 'login' }).then((token) => {
        resolve(token);
      });
    });
  });
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [showResendEmailButton, setShowResendEmailButton] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthChange = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (user) {
        console.log("✅ Użytkownik zalogowany:", user);

        const { data: profile, error: profileError } = await supabase
          .from('users_extended')
          .select('role') // Pobieramy tylko rolę, aby było szybciej
          .eq('id', user.id)
          .single();

        if (profileError) {
          // Jeśli profil nie istnieje (PGRST116) LUB wystąpił inny błąd podczas pobierania,
          // zawsze przekieruj do wyboru roli. Trigger powinien już utworzyć rekord.
          console.error('❌ Błąd pobierania profilu lub brak profilu:', profileError.message);
          navigate('/choose-role');
          return;
        }

        // Sprawdzamy rolę (konwertując na małe litery dla spójności)
        if (profile.role?.toLowerCase() === 'nieprzypisana') {
          console.log('Rola użytkownika to "nieprzypisana". Przekierowuję do wyboru roli.');
          navigate('/choose-role');
          return;
        }

        // Jeśli rola jest już ustawiona (np. 'klient' lub 'firma')
        console.log('Rola użytkownika już ustawiona na:', profile.role, '. Przekierowuję do profilu.');
        navigate('/profil');
        
      } else {
        // Użytkownik wylogowany, lub sesja wygasła
        console.log("Użytkownik wylogowany lub brak sesji. Przekierowuję do logowania.");
        navigate('/login');
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      if (event === 'SIGNED_IN') {
        handleAuthChange();
      } else if (event === 'SIGNED_OUT') {
        navigate('/login');
      }
    });

    // Wywołaj handleAuthChange również przy pierwszym renderowaniu komponentu
    handleAuthChange();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setShowResendEmailButton(false);

    const token = await getRecaptchaToken();
    if (!token) {
      setMessage('❌ Nie udało się zweryfikować reCAPTCHA.');
      return;
    }
    console.log('✅ Token reCAPTCHA:', token);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const errorMap = {
        'Invalid login credentials': '❌ Nieprawidłowy e-mail lub hasło',
        'Email not confirmed': '❌ Nie potwierdzono adresu e-mail.',
        'User already registered': '❌ E-mail już zarejestrowany.',
        'User not found': '❌ Nie znaleziono użytkownika.',
      };

      const friendlyMessage = errorMap[error.message] || `❌ Błąd: ${error.message}`;
      setMessage(friendlyMessage);
      console.error('❌ Błąd logowania:', error);

      if (error.message === 'Email not confirmed') {
        setShowResendEmailButton(true);
      }
    } else {
      console.log('✅ Zalogowano:', data);
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
      <Header title="Zaloguj się do swojego konta" subtitle="Zarządzaj zleceniami i trasami w jednym miejscu" />
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