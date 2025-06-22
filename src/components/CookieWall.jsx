import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CookieWall = () => {
  const [showWall, setShowWall] = useState(false);

  // Funkcja ładująca reCAPTCHA
  const loadRecaptcha = () => {
    const existingScript = document.querySelector('script[src*="recaptcha/api.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${import.meta.env.VITE_RECAPTCHA_SITE_KEY}`;
      script.async = true;
      script.onload = () => {
        console.log('✅ reCAPTCHA script loaded successfully!'); // Potwierdzenie ładowania
        // Tutaj można by też wywołać setIsRecaptchaLoaded(true) w Login.jsx za pomocą Context API,
        // ale na razie skupmy się na samym ładowaniu skryptu.
      };
      script.onerror = () => {
        console.error('❌ Failed to load reCAPTCHA script.');
      };
      document.body.appendChild(script);
    }
  };

  // Funkcja ładująca Facebook SDK
  const loadFacebookSDK = () => {
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/pl_PL/sdk.js';
      script.async = true;
      script.defer = true;
      script.onload = () => console.log('✅ Facebook SDK loaded successfully!');
      script.onerror = () => console.error('❌ Failed to load Facebook SDK.');
      document.body.appendChild(script);
    }
  };

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent === 'accepted') {
      setShowWall(false);
      // JEŚLI ZGODA JEST, ŁADUJ SKRYPTY OD RAZU
      loadRecaptcha();
      loadFacebookSDK();
    } else {
      setShowWall(true);
    }
  }, []); // Puste zależności, uruchamia się raz po zamontowaniu

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowWall(false);
    // Nadal wywołujemy tutaj, na wypadek gdyby użytkownik kliknął przycisk po raz pierwszy
    // w danej sesji (np. po czyszczeniu localStorage)
    loadRecaptcha();
    loadFacebookSDK();
  };

  if (!showWall) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      color: 'white',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'Poppins, sans-serif'
    }}>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Twoja prywatność ma znaczenie</h2>
      <p style={{ maxWidth: '600px', fontSize: '1rem' }}>
        Aby korzystać z naszego serwisu, musisz wyrazić zgodę na używanie plików cookies oraz na przetwarzanie danych przez Google (reCAPTCHA, logowanie) i Facebook (logowanie). <br />
        Szczegóły znajdziesz w naszej{' '}
        <Link to="/polityka-prywatnosci" style={{ color: '#ffa500', textDecoration: 'underline' }}>
          Polityce prywatności
        </Link>.
      </p>
      <button onClick={acceptCookies} style={{
        marginTop: '2rem',
        padding: '1rem 2rem',
        fontSize: '1.1rem',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
      }}>
        Akceptuję i przechodzę dalej
      </button>
    </div>
  );
};

export default CookieWall;