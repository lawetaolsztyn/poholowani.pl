// src/components/CookieWall.jsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CookieWall = () => {
  const [showWall, setShowWall] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent !== 'accepted') {
      setShowWall(true);
    }
  }, []);

  // USUNIĘTO: Funkcja loadRecaptcha() - teraz skrypt jest w index.html

  const loadFacebookSDK = () => {
    // Zachowujemy to, jeśli chcesz ładować FB SDK dynamicznie po zgodzie
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/pl_PL/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  };

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowWall(false);
    // USUNIĘTO: loadRecaptcha();
    loadFacebookSDK(); // Tylko jeśli korzystasz z logowania przez FB
  };

  if (!showWall) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.8)', // Użyłem 0.8 dla lepszego zaciemnienia
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
