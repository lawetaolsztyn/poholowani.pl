// src/LandingPage.jsx
import Navbar from './components/Navbar';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './LandingPage.css'; // Ten plik będzie teraz zawierał WSZYSTKIE style DLA LANDING PAGE
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
// import logo from './assets/logo.png'; // To już niepotrzebne, bo logo jest w Header.jsx

import Header from './components/Header'; // <-- KLUCZOWE: IMPORTUJEMY KOMPONENT HEADER

const LandingPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);

  return (
    <>
      <Navbar />
      <div className="landing-container">
        {/* BANER Z LOGO I TEKSTEM - TERAZ UŻYWAMY KOMPONENTU HEADER */}
        {/* Kontener overlay-header z LandingPage.css nada mu tło i pełną szerokość */}
        {/* Header.jsx doda logo i tekst, i ostylizuje ich układ */}
        <Header
          title="Wykorzystaj puste przebiegi!"
          subtitle="Znajdź lub zaoferuj transport powrotny lawet i busów w całej Europie. Prosto i szybko!"
        />

        {/* SEKCJA MAPY */}
        <div className="map-wrapper">
          {/* Klasa map-background jest na divie, który opakowuje Leaflet MapContainer,
              aby na nim zastosować blur. MapContainer musi być wewnątrz map-background.
          */}
          <div className="map-background">
            <MapContainer
              center={[52.0, 19.0]}
              zoom={6}
              className="leaflet-map-container" /* Nowa klasa dla samego kontenera Leaflet */
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

          {/* PRZYCISKI AKCJI - MUSZĄ BYĆ BEZPOŚREDNIO W map-wrapper dla pozycjonowania absolutnego */}
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
              // Jeśli potrzebujesz specjalnego koloru, dodaj klasę do LandingPage.css
              onClick={() => navigate('/zlecam')}
            >
              ZLECAM TRANSPORT
              <div className="subtext">DODAJ ZLECENIE</div>
            </button>
            */}
          </div>
        </div>

        {/* Tu mogą być inne sekcje, np. formularz wyszukiwania, Footer itp. */}
      </div>
    </>
  );
};

export default LandingPage;
