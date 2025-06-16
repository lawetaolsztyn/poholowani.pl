import { useState, useEffect } from 'react';
import './RouteSlider.css'; // Dodaj import pliku CSS

export default function RouteSlider({ routes, onHover, onClickRoute }) {
  const [startIndex, setStartIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState(null);
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
    <div className="route-slider-main-container"> {/* Dodana klasa */}
      <div className="route-slider-content-wrapper"> {/* Dodana klasa */}
        <button
          onClick={handlePrev}
          disabled={startIndex === 0}
          className="slider-nav-button" /* Dodana klasa */
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
              className="route-card-item" /* Dodana klasa */
              style={{
                // Styl hover przeniesiony do CSS za pomocą :hover
                // Jednak, jeśli chcesz utrzymać dynamiczne podkreślenie hoverem z RouteMap,
                // nadal potrzebujesz tej dynamicznej zmiany border, ale tylko dla samej ramki.
                // Na razie zostawiam tylko warunkowy border, reszta w CSS.
                border: route.id === hoveredId ? '2px solid red' : '', // Ten styl zostanie, aby pokazać hover z mapy
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                {route.from_city?.split(',')[0]} → {route.to_city?.split(',')[0]}
              </div>
              <div>📅 {route.date}</div>
              <div>📦 {route.load_capacity || '-'}</div>
              <div>🧍 {route.passenger_count || '-'}</div>
              <div>🚚 {route.vehicle_type === 'laweta' ? 'Laweta' : 'Bus'}</div>
              {route.phone && (
                <div style={{ fontSize: '16px', marginBottom: '10px' }}> {/* Usuwamy color: #555 */}
                  📞 <a
                       href={`tel:${route.phone}`}
                       onClick={(e) => e.stopPropagation()}
                     >
                    {route.phone}
                  </a>
                  {route.uses_whatsapp && (
                    <div style={{ marginTop: '4px' }}>
                      <a
                        href={`https://wa.me/${route.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Napisz na WhatsApp"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: '18px', display: 'inline-block', marginTop: '4px' }} /* Usuwamy color: #25D366 */
                      >
                        🟢 WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              )}
{route.messenger_link && (
  <div style={{ marginTop: '4px' }}>
    <a
      href={route.messenger_link}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: '#0084FF', fontWeight: 'bold' }}
    >
      🔵 Messenger
    </a>
  </div>
)}
              {route.user_id && route.users_extended?.role === 'firma' && (
                <div style={{ fontSize: '14px' }}> {/* Usuwamy color: #555 */}
                  {route.users_extended.nip ? (
                    <div style={{ marginBottom: '8px' }}>
                      <span className="company-badge"> {/* Dodana klasa */}
                        🏢 firma
                      </span>
                    </div>
                  ) : null}
                  <strong>profil przewoźnika:</strong>{' '}
                  <a
                    href={`https://poholowani.pl/profil/${route.user_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 'bold' }} /* Usuwamy color: #007bff */
                  >
                    otwórz
                  </a>
                </div>
              )}
            </div>
          ))}

          {routes.length === 0 && (
            <div className="no-routes-message"> {/* Dodana klasa */}
              Brak pasujących tras do wyświetlenia.
            </div>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={startIndex + visibleCount >= routes.length}
          className="slider-nav-button" /* Dodana klasa */
        >
          ▶
        </button>
      </div>
    </div>
  );
}