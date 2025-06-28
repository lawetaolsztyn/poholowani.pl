import Navbar from './components/Navbar';
// { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './LandingPage.css';
import { useNavigate } from 'react-router-dom';
// { useRef } from 'react';
import Header from './components/Header'; // Importujemy komponent Header
import CustomMap from './components/MapComponent';

const LandingPage = () => {
  const navigate = useNavigate();
  // mapRef = useRef(null);

  return (
    <>
      <Navbar />
      <div className="landing-container">
        {/* Kontener dla całego banera, który ma tło i pełną szerokość */}
        <div className="overlay-header">
          {/* Komponent Header renderuje logo logo i tekst wewnątrz overlay-header */}
          <Header
            title="Wykorzystaj puste przebiegi!"
            subtitle="Znajdź lub zaoferuj transport powrotny lawet i busów w całej Europie."
          />
        </div>

        {/* SEKCJA MAPY */}
        <div className="map-wrapper">
          <div className="map-background">
            <CustomMap /> {/* Użyj nowego komponentu mapy tutaj */}
          </div>

          {/* PRZYCISKI AKCJI - TE WIĘKSZE */}
          <div className="action-buttons">
            <button className="secondary-button" onClick={() => navigate('/szukam')}>
              SZUKAM TRANSPORTU
              <div className="subtext">JESTEM KLIENTEM</div>
            </button>
            <button className="primary-button" onClick={() => navigate('/oferuje')}>
              OFERUJĘ TRANSPORT
              <div className="subtext">JESTEM PRZEWOŹNIKIEM</div>
            </button>
          </div>

          {/* NOWA SEKCJA: Dodatkowe banery - TERAZ W ŚRODKU MAP-WRAPPER */}
          {/* WAŻNE: To jest ten blok, który powinien być wklejony TUTAJ */}
          <div className="info-banners-container">
            <button className="info-banner-button" onClick={() => navigate('/tablica-ogloszen')}>
              Tablica Ogłoszeń
              <div className="subtext">PRZEGLĄDAJ →</div>
            </button>
            <button className="info-banner-button urgent" onClick={() => navigate('/transport-na-juz')}>
              Transport na Już!
              <div className="subtext">ZGŁOŚ PILNIE →</div>
            </button>
          </div>
          {/* KONIEC NOWEJ SEKCJI W MAP-WRAPPER */}

        </div> {/* <-- To zamyka div.map-wrapper */}

      </div> {/* <-- To zamyka div.landing-container */}
    </>
  );
};

export default LandingPage;