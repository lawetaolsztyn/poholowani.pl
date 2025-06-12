import Navbar from './components/Navbar';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './LandingPage.css';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import Header from './components/Header'; // Importujemy komponent Header

const LandingPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);

  return (
    <>
      <Navbar />
      <div className="landing-container">
        {/* Kontener dla całego banera, który ma tło i pełną szerokość */}
        <div className="overlay-header">
          {/* Komponent Header renderuje logo i tekst wewnątrz overlay-header */}
          <Header
            title="Wykorzystaj puste przebiegi!"
            subtitle="Znajdź lub zaoferuj transport powrotny lawet i busów w całej Europie. Prosto i szybko!"
          />
        </div>

        {/* SEKCJA MAPY */}
        <div className="map-wrapper">
          <div className="map-background">
            <MapContainer
              center={[52.0, 19.0]}
              zoom={6}
              className="leaflet-map-container"
              dragging={false}
              zoomControl={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              boxZoom={false}
              keyboard={false}
              touchZoom={false}
              whenCreated={(mapInstance) => {
                mapRef.current = mapInstance;
              }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </MapContainer>
          </div>

          {/* PRZYCISKI AKCJI - W map-wrapper */}
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
        </div>
      </div>
    </>
  );
};

export default LandingPage;
