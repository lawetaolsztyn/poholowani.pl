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

  const loadRecaptcha = () => {
    const existingScript = document.querySelector('script[src*="recaptcha/api.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=6LeqFVIrAAAAAHYmk1g43t4CyWuNKDKK3EAJDmhr';
      script.async = true;
      document.body.appendChild(script);
    }
  };

  const loadFacebookSDK = () => {
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
    loadRecaptcha();
    loadFacebookSDK(); // tylko jeśli korzystasz z logowania przez FB
  };

  if (!showWall) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.6)', // półprzezroczyste
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
