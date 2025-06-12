// src/Login.jsx

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Header from './components/Header';
import './LandingPage.css';

// Zaktualizowana funkcja do uzyskiwania tokena reCAPTCHA
const getRecaptchaToken = async () => {
  return new Promise((resolve) => {
    const checkRecaptcha = () => {
      if (window.grecaptcha && window.grecaptcha.ready) {
        window.grecaptcha.ready(() => {
          // WAŻNE: Upewnij się, że '6LeqFVIrAAAAAHYmk1g43t4CyWuNKDKK3EAJDmhr' to Twój klucz witryny reCAPTCHA v3.
          window.grecaptcha.execute('6LeqFVIrAAAAAHYmk1g43t4CyWuNKDKK3EAJDmhr', { action: 'login' }).then((token) => {
            resolve(token);
          }).catch(err => {
            console.error("Błąd wykonania reCAPTCHA:", err); // Logowanie błędu, jeśli execute zawiedzie
            resolve(null); // Zwróć null w przypadku błędu wykonania
          });
        });
      } else {
        // Jeśli grecaptcha jeszcze nie jest dostępne, poczekaj i spróbuj ponownie
        // To jest kluczowe, ponieważ skrypt jest ładowany dynamicznie przez CookieWall
        setTimeout(checkRecaptcha, 100); // Spróbuj ponownie za 100ms
      }
    };
    checkRecaptcha();
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

    const recaptchaToken = await getRecaptchaToken(); // Zmieniono nazwę zmiennej dla jasności
    if (!recaptchaToken) {
      setMessage('❌ Nie udało się zweryfikować reCAPTCHA. Brak tokena.');
      // Dodatkowy log, który pomoże zdiagnozować, dlaczego token jest null
      console.error("getRecaptchaToken() zwróciło null. Sprawdź, czy skrypt reCAPTCHA jest załadowany.");
      return;
    }
    console.log('✅ Token reCAPTCHA:', recaptchaToken);

    // =====================================================================
    // WAŻNE: WERYFIKACJA reCAPTCHA PO STRONIE SERWERA JEST KLUCZOWA DLA BEZPIECZEŃSTWA!
    // Poniżej znajduje się placeholder, który MUSISZ zaimplementować.
    // Bez tego, każdy bot może obejść reCAPTCHA.
    // =====================================================================

    try {
      const response = await fetch('/api/verify-recaptcha', { // Upewnij się, że ten endpoint istnieje i jest dostępny
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recaptchaToken: recaptchaToken }),
      });

      const verificationResult = await response.json();

      if (!response.ok || !verificationResult.success || verificationResult.score < 0.5) { // Domyślny próg dla reCAPTCHA v3 to 0.5
        console.error('❌ Weryfikacja reCAPTCHA po stronie serwera nie powiodła się:', verificationResult.errors);
        setMessage('❌ Nie udało się zweryfikować reCAPTCHA. Proszę spróbować ponownie.');
        // Możesz tutaj dodać logikę resetowania reCAPTCHA, jeśli to reCAPTCHA v2 lub jeśli chcesz wymusić odświeżenie
        return;
      }
      console.log('✅ Weryfikacja reCAPTCHA po stronie serwera pomyślna. Wynik:', verificationResult.score);

    } catch (error) {
      console.error('❌ Błąd komunikacji z endpointem weryfikacji reCAPTCHA:', error);
      setMessage('❌ Wystąpił problem z weryfikacją reCAPTCHA. Spróbuj ponownie.');
      return;
    }

    // =====================================================================
    // KONIEC PLACHOLDERA WERYFIKACJI SERWEROWEJ
    // =====================================================================

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const errorMap = {
        'Invalid login credentials': '❌ Nieprawidłowy e-mail lub hasło',
        'Email not confirmed': '❌ Nie potwierdzono adresu e-mail.',
        'User already registered': '❌ E-mail już zarejestrowany.', // To błąd rejestracji, a nie logowania
        'User not found': '❌ Nie znaleziono użytkownika.', // Bardziej generyczny błąd
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
