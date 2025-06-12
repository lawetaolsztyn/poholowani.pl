import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Klucz witryny reCAPTCHA - pobierany ze zmiennych środowiskowych Vite.
// Upewnij się, że masz plik .env (lub .env.local) w katalogu głównym projektu z wpisem:

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY; //

const CookieWall = () => {
  const [showWall, setShowWall] = useState(false);

  // Funkcja ładująca skrypt reCAPTCHA
  const loadRecaptcha = () => {
    const existingScript = document.querySelector('script[src*="recaptcha/api.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      // Używamy zmiennej środowiskowej dla klucza witryny reCAPTCHA.
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`; //
      script.async = true;
      script.defer = true; // Dodane defer dla lepszego zarządzania ładowaniem
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
      document.body.appendChild(script);
    }
  };

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent !== 'accepted') {
      // Jeśli zgoda nie została zaakceptowana, pokaż ścianę z ciasteczkami
      setShowWall(true);
    } else {
      // Jeśli zgoda jest już zaakceptowana, od razu załaduj skrypty
      loadRecaptcha(); //
      loadFacebookSDK(); //
    }
  }, []); // Pusta tablica zależności - useEffect uruchamia się raz po zamontowaniu komponentu

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowWall(false);
    // Po akceptacji również ładuj skrypty (na wypadek, gdyby to była pierwsza akceptacja w danej sesji)
    loadRecaptcha(); //
    loadFacebookSDK(); //
  };

  if (!showWall) return null; // Jeśli showWall jest false (zgoda zaakceptowana lub niepotrzebna), nie renderuj ściany

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.6)', // półprzezroczyste tło
      color: 'white',
      zIndex: 99999, // Upewnij się, że jest na wierzchu
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