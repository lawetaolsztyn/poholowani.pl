import Navbar from './components/Navbar';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './LandingPage.css'; // Ten plik będzie teraz zawierał WSZYSTKIE style
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import logo from './assets/logo.png'; // Upewnij się, że ścieżka do logo jest poprawna

const LandingPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);

  return (
    <>
      <Navbar />
      <div className="landing-container">
        {/* BANER Z LOGO I TEKSTEM */}
        <div className="overlay-header"> {/* Wszystkie style tego bloku będą w LandingPage.css */}
          <img
            src={logo}
            alt="Poholowani.pl Logo"
            className="header-logo" // Dodajemy klasę dla logo
          />
          <div className="header-text-container"> {/* Dodajemy kontener dla tekstu, aby łatwiej nim zarządzać */}
            <h1 className="banner-heading"> {/* Stylizowany w LandingPage.css */}
              Wykorzystaj puste przebiegi!
            </h1>
            <p className="banner-subheading"> {/* Stylizowany w LandingPage.css */}
              Znajdź lub zaoferuj transport powrotny lawet i busów w całej Europie. Prosto i szybko!
            </p>
          </div>
        </div>

        {/* SEKCJA MAPY */}
        <div className="map-wrapper">
          <MapContainer
            center={[52.0, 19.0]}
            zoom={6}
            className="map-background landing-blurred-map" // Te klasy są już w LandingPage.css
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

        {/* PRZYCISKI AKCJI */}
        <div className="action-buttons">
          <button className="secondary-button" onClick={() => navigate('/szukam')}>
            SZUKAM TRANSPORTU
            <div className="subtext">JESTEM KLIENTEM</div>
          </button>
          <button className="primary-button" onClick={() => navigate('/oferuje')}>
            OFERUJĘ TRANSPORT
            <div className="subtext">JESTEM PRZEWOŹNIKIEM</div>
          </button>
          {/* 
          <button
            className="primary-button"
            style={{ backgroundColor: '#ff6600' }} // Ten inline style można przenieść do CSS jako nową klasę, np. .zlecam-button
            onClick={() => navigate('/zlecam')}
          >
            ZLECAM TRANSPORT
            <div className="subtext">DODAJ ZLECENIE</div>
          </button>
          */}
        </div>
      </div>
    </>
  );
};

export default LandingPage;
