import React, { useState, useEffect } from 'react';
// import './CookieWall.css'; // Dodamy ten plik CSS, jeśli go nie masz i używasz zewnętrznych stylów

export default function CookieWall() {
  // Stan, który kontroluje widoczność banera.
  // Ustawienie na 'true' domyślnie, jeśli zgoda nie została jeszcze udzielona.
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Sprawdź w localStorage, czy użytkownik już zaakceptował cookies.
    const hasAcceptedCookies = localStorage.getItem('cookiesAccepted');
    if (!hasAcceptedCookies) {
      setIsVisible(true); // Pokaż baner, jeśli zgoda nie została udzielona
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('cookiesAccepted', 'true'); // Zapisz akceptację w localStorage
    setIsVisible(false); // Ukryj baner
  };

  // Nie renderuj nic, jeśli baner nie jest widoczny
  if (!isVisible) {
    return null;
  }

  return (
    // Zmieniamy styl tak, aby baner był na dole, a nie na całym ekranie
    <div
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Ciemne, półprzezroczyste tło
        color: 'white',
        padding: '15px 20px',
        textAlign: 'center',
        zIndex: '9999', // Upewnij się, że jest na wierzchu
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.5)',
        display: 'flex', // Użyj flexboxa do wyrównania treści
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap', // Pozwól elementom zawijać się na małych ekranach
        gap: '15px' // Odstęp między tekstem a przyciskiem
      }}
    >
      <p style={{ margin: '0', fontSize: '0.9rem', lineHeight: '1.4' }}>
        Używamy plików cookie, aby zapewnić najlepszą jakość korzystania z naszej witryny. Kontynuując, zgadzasz się na ich użycie. Więcej w naszej{' '}
        <a href="/polityka-prywatnosci" style={{ color: '#007bff', textDecoration: 'underline' }}>
          Polityce Prywatności
        </a>.
      </p>
      <button
        onClick={handleAcceptCookies}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          padding: '8px 15px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          flexShrink: '0' // Zapobiega zmniejszaniu się przycisku
        }}
      >
        Akceptuję
      </button>
    </div>
  );
}