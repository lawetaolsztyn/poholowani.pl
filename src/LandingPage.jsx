import Navbar from './components/Navbar';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './LandingPage.css'; // Ten plik będzie teraz zawierał WSZYSTKIE style DLA LANDING PAGE
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
// import logo from './assets/logo.png'; // Usuwamy, bo logo jest w Header.jsx
import Header from './components/Header'; // <-- KLUCZOWE: IMPORTUJEMY KOMPONENT HEADER

const LandingPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);

  return (
    <>
      <Navbar />
      <div className="landing-container">
        {/* BANER Z LOGO I TEKSTEM - TERAZ UŻYWAMY KOMPONENTU HEADER */}
        <Header /> {/* Komponent Header, stylizowany przez Header.css, tło z LandingPage.css */}

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
            // style={{ backgroundColor: '#ff6600' }} // Usuwamy, jeśli chcesz, żeby to była klasa CSS
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
