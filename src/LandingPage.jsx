import Navbar from './components/Navbar';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './LandingPage.css';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import logo from './assets/logo.png';


const LandingPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);

  return (
    <>
      <Navbar />
      <div className="landing-container">
<div className="overlay-header" style={{
  position: 'relative',
  padding: '1rem 2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}}>
  <img
    src={logo}
    alt="Logo"
    style={{
      height: '220px',
      position: 'absolute',
      left: '10rem',
      top: '50%',
      transform: 'translateY(-50%)'
    }}
  />
  <div style={{
    textAlign: 'center',
    maxWidth: '800px'
  }}>
    <h1 className="banner-heading" style={{ margin: 0 }}>
      Wykorzystaj puste przebiegi!
    </h1>
    <p className="banner-subheading" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
      Znajdź lub zaoferuj transport powrotny lawet i busów w całej Europie. Prosto i szybko!
    </p>
  </div>
</div>



        <div className="map-wrapper">
          <MapContainer
            center={[52.0, 19.0]}
            zoom={6}
            className="map-background landing-blurred-map" 
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
            style={{ backgroundColor: '#ff6600' }}
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
