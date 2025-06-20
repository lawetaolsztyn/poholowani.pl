import { useState, useEffect } from 'react';
import './RouteSlider.css';

export default function RouteSlider({ routes, onHover, onClickRoute, hoveredRouteId, clickedRouteId }) {
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setVisibleCount(3);
      } else {
        setVisibleCount(6);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setStartIndex(0);
  }, [routes, visibleCount]);

  const handlePrev = () => {
    if (startIndex > 0) {
      setStartIndex(prevIndex => Math.max(0, prevIndex - visibleCount));
    }
  };

  const handleNext = () => {
    if (startIndex + visibleCount < routes.length) {
      setStartIndex(prevIndex => Math.min(routes.length - visibleCount, prevIndex + visibleCount));
    }
  };

  const visibleRoutes = routes.slice(startIndex, startIndex + visibleCount);

  return (
    <div className="route-slider-main-container">
      <div className="route-slider-controls">
        <button
          onClick={handlePrev}
          disabled={startIndex === 0}
          className="slider-nav-button"
        >
          ◀
        </button>

        <div className="route-cards-container">
          {routes.length === 0 && (
            <div className="no-routes-message">
              Brak pasujących tras do wyświetlenia.
            </div>
          )}

          {visibleRoutes.map((route) => {
            const isCurrentHovered = route.id === hoveredRouteId;
            const isCurrentClicked = route.id === clickedRouteId;
            const cardClassName = `route-card ${isCurrentHovered ? 'hovered' : ''} ${isCurrentClicked ? 'clicked' : ''}`;

            return (
              <div
                key={route.id}
                className={cardClassName}
                onMouseEnter={() => onHover(route.id)}
                onMouseLeave={() => onHover(null)} // Resetuj hoveredId po opuszczeniu kafelka
                onClick={() => onClickRoute(route.id)} // Dodajemy obsługę kliknięcia
              >
                <div className="route-info">
                  <h4 style={{ marginBottom: '8px', color: '#333' }}>Trasa {route.id}</h4>
                  <p><strong>Początek:</strong> {route.start_location_name}</p>
                  <p><strong>Koniec:</strong> {route.end_location_name}</p>
                  <p><strong>Dystans:</strong> {route.distance ? `${(route.distance / 1000).toFixed(2)} km` : 'N/A'}</p>
                  <p><strong>Czas:</strong> {route.duration ? `${(route.duration / 60).toFixed(0)} min` : 'N/A'}</p>
                  {route.is_request && <p><strong>Typ:</strong> Zapytanie o trasę</p>}
                  {route.offer_price && <p><strong>Oferta cenowa:</strong> {route.offer_price} PLN</p>}
                  {route.notes && <p><strong>Notatki:</strong> {route.notes}</p>}
                </div>
                {route.contact_phone && (
                  <div style={{ fontSize: '14px', marginTop: '10px' }}>
                    <strong>Kontakt:</strong>{' '}
                    <a href={`tel:${route.contact_phone}`} style={{ fontWeight: 'bold', color: '#007bff', textDecoration: 'none' }}>
                      {route.contact_phone}
                    </a>
                  </div>
                )}
                {route.users_extended?.facebook && (
                  <div style={{ marginTop: '5px' }}>
                    <a
                      href={route.users_extended.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#084FF', fontSize: '18px', fontWeight: 'bold', textDecoration: 'none' }}
                    >
                      🔵 Messenger
                    </a>
                  </div>
                )}
                {route.user_id && route.users_extended?.role === 'firma' && (
                  <div style={{ fontSize: '14px' }}>
                    {route.users_extended.nip ? (
                      <div style={{ marginBottom: '8px' }}>
                        <span className="company-badge">
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
            );
          })}
        </div>

        <button
          onClick={handleNext}
          disabled={startIndex + visibleCount >= routes.length}
          className="slider-nav-button"
        >
          ▶
        </button>
      </div>
    </div>
  );
}