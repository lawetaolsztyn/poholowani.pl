import { useState, useEffect } from 'react';

export default function RouteSlider({ routes, onHover, onClickRoute }) {
  const [startIndex, setStartIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState(null);
  // Dodajemy nowy stan dla liczby widocznych kafelków
  const [visibleCount, setVisibleCount] = useState(6);

  // Efekt do ustawienia początkowej liczby kafelków i nasłuchiwania zmian rozmiaru
  useEffect(() => {
    const handleResize = () => {
      // Ustal próg dla urządzeń mobilnych, np. 768px
      if (window.innerWidth <= 768) {
        setVisibleCount(3);
      } else {
        setVisibleCount(6);
      }
    };

    // Ustaw początkową wartość przy pierwszym renderowaniu
    handleResize();

    // Dodaj nasłuchiwanie na zmianę rozmiaru okna
    window.addEventListener('resize', handleResize);

    // Usuń nasłuchiwanie przy odmontowaniu komponentu
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Pusta tablica zależności oznacza, że efekt uruchomi się tylko raz po zamontowaniu

  useEffect(() => {
    // Resetuj do początku po każdej zmianie listy tras lub zmianie visibleCount
    // To ważne, bo jeśli zmienimy visibleCount (np. z 6 na 3),
    // startIndex może wskazywać poza zakres lub pokazywać niepoprawne elementy.
    setStartIndex(0);
  }, [routes, visibleCount]);

  const handlePrev = () => {
    if (startIndex > 0) {
      // Przesuwaj o aktualną liczbę widocznych elementów
      setStartIndex(prevIndex => Math.max(0, prevIndex - visibleCount));
    }
  };

  const handleNext = () => {
    // Sprawdź, czy są jeszcze elementy do wyświetlenia
    if (startIndex + visibleCount < routes.length) {
      // Przesuwaj o aktualną liczbę widocznych elementów
      setStartIndex(prevIndex => Math.min(routes.length - visibleCount, prevIndex + visibleCount));
    }
  };

  const visibleRoutes = routes.slice(startIndex, startIndex + visibleCount);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px', paddingBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button
          onClick={handlePrev}
          disabled={startIndex === 0}
          style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#e2e8f0', border: 'none', cursor: 'pointer' }}
        >
          ◀
        </button>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
          {visibleRoutes.map((route) => (
            <div
              key={route.id}
              onClick={() => onClickRoute && onClickRoute(route)}
              onMouseEnter={() => {
                onHover(route.id);
                setHoveredId(route.id);
              }}
              onMouseLeave={() => {
                onHover(null);
                setHoveredId(null);
              }}
              style={{
                border: route.id === hoveredId ? '2px solid red' : '1px solid #ccc',
                borderRadius: '12px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)',
                padding: '16px',
                backgroundColor: 'white',
                cursor: 'pointer',
                width: '220px',
                transition: 'border 0.2s ease-in-out',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                {route.from_city?.split(',')[0]} → {route.to_city?.split(',')[0]}
              </div>
              <div style={{ fontSize: '14px', color: '#555', marginBottom: '6px' }}>📅 {route.date}</div>
              <div style={{ fontSize: '14px', color: '#555', marginBottom: '6px' }}>📦 {route.load_capacity || '-'}</div>
              <div style={{ fontSize: '14px', color: '#555', marginBottom: '6px' }}>🧍 {route.passenger_count || '-'}</div>
              <div style={{ fontSize: '14px', color: '#555', marginBottom: '6px' }}>🚚 {route.vehicle_type === 'laweta' ? 'Laweta' : 'Bus'}</div>
{route.phone && (
  <div style={{ fontSize: '16px', color: '#555', marginBottom: '10px' }}>
    📞 <a
         href={`tel:${route.phone}`}
         style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}
         onClick={(e) => e.stopPropagation()} // <--- DODAĆ TO
       >
      {route.phone}
    </a>
    {route.usesWhatsapp && (
      <div style={{ marginTop: '4px' }}>
        <a
          href={`https://wa.me/${route.phone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Napisz na WhatsApp"
          onClick={(e) => e.stopPropagation()} // <--- DODAĆ TO
          style={{ textDecoration: 'none', color: '#25D366', fontSize: '18px', display: 'inline-block', marginTop: '4px' }}
        >
          🟢 WhatsApp
        </a>
      </div>
    )}
  </div>
)}
            {route.user_id && route.users_extended?.role === 'firma' && (
              <div style={{ fontSize: '14px', color: '#555' }}>
                {route.users_extended.nip ? (
                  <div style={{ marginBottom: '8px' }}>
                    <span
                      title="zarejestrowana firma"
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        backgroundColor: '#007bff',
                        color: '#FFC107',
                        borderRadius: '5px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px'
                      }}
                    >
                      🏢 firma
                    </span>
                  </div>
                ) : null}
                <strong>profil przewoźnika:</strong>{' '}
                <a
                  href={`https://poholowani.pl/profil/${route.user_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: 'bold' }}
                >
                  otwórz
                </a>
              </div>
            )}
            </div>
          ))}

          {routes.length === 0 && (
            <div style={{ fontSize: '16px', color: '#777', marginTop: '20px' }}>
              Brak pasujących tras do wyświetlenia.
            </div>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={startIndex + visibleCount >= routes.length}
          style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#e2e8f0', border: 'none', cursor: 'pointer' }}
        >
          ▶
        </button>
      </div>
    </div>
  );
}