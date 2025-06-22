import Navbar from './components/Navbar';
// { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './LandingPage.css';
import { useNavigate } from 'react-router-dom';
// { useRef } from 'react';
import Header from './components/Header'; // Importujemy komponent Header
import CustomMap from './components/MapComponent';
import { Helmet } from 'react-helmet'; // Upewnij się, że to jest na początku pliku


const LandingPage = () => {
  const navigate = useNavigate();
  // mapRef = useRef(null);

  return (
    <>
<Helmet>
        <title>Poholowani.pl - Wykorzystaj puste przebiegi lawet i busów w Europie</title>
        <meta name="description" content="Poholowani.pl - Znajdź lub zaoferuj transport powrotny osób i ładunków. Platforma dla przewoźników i klientów. Bus, laweta, cała Europa." />

        {/* Metatagi Open Graph dla udostępniania w mediach społecznościowych */}
        <meta property="og:title" content="Poholowani.pl - Optymalizacja transportu w Europie" />
        <meta property="og:description" content="Znajdź wolne miejsca w busie lub lawetę na powrotnym kursie. Oszczędzaj czas i pieniądze na transportach po całej Europie." /> {/* UPEWNIJ SIĘ, ŻE TA LINIA JEST DOKŁADNIE TAKA */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.poholowani.pl/" /> {/* Upewnij się, że to jest prawidłowy i pełny URL strony głównej */}
        <meta property="og:image" content="https://www.poholowani.pl/images/logo_share.jpg" /> {/* ODKOMENTOWANA LINIA: Upewnij się, że URL do obrazka jest prawidłowy i publicznie dostępny! */}

        {/* Metatagi Twitter Cards (jeśli chcesz, aby linki ładnie wyglądały na Twitterze) */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Poholowani.pl - Lawety i busy z wolnym miejscem" />
        <meta name="twitter:description" content="Optymalizuj koszty transportu. Oferuj lub znajdź wolne przebiegi busów i lawet w całej Europie." />
        {/* <meta name="twitter:image" content="https://www.poholowani.pl/images/logo_share.jpg" /> */}
      </Helmet>
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
