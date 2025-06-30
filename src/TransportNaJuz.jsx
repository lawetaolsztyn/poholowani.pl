// src/pages/TransportNaJuz.jsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import LocationAutocomplete from './components/LocationAutocomplete';
import RequestDetails from './components/RequestDetails';
import './TransportNaJuz.css';
import { supabase } from './supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Importy dla Mapy w formularzu
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Konfiguracja domyślnych ikon Leaflet (jeśli nadal występują błędy z ikonami, ten blok jest niezbędny)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Komponent do centrowania mapy (dla mapy w formularzu)
function FormMapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] != null && center[1] != null) {
      map.setView(center, map.getZoom() > 10 ? map.getZoom() : 10);
    }
  }, [center, map]);
  return null;
}

export default function TransportNaJuz() {
  const { requestId: urlRequestId } = useParams();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);

  // Stany dla pól formularza zgłoszenia
  const [vehicleType, setVehicleType] = useState('');
  const [locationFromLabel, setLocationFromLabel] = useState('');
  const [locationFromCoords, setLocationFromCoords] = useState({ latitude: null, longitude: null });
  const [locationToLabel, setLocationToLabel] = useState('');
  const [locationToCoords, setLocationToCoords] = useState({ latitude: null, longitude: null });
  const [problemDescription, setProblemDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agreeToSharePhone, setAgreeToSharePhone] = useState(false);

  // Stany dla geolokalizacji
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const [urgentRequests, setUrgentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // NOWE STANY I IKONY DLA MAPY W FORMULARZU
  const [nearbyRoadsideAssistanceInForm, setNearbyRoadsideAssistanceInForm] = useState([]);
  const [loadingRoadsideInForm, setLoadingRoadsideInForm] = useState(false);

  // Ikony dla mapy w formularzu (tworzone z useMemo)
  const userLocationIcon = useMemo(() => {
    return new L.Icon({
      iconUrl: '/icons/request-marker.png',
      iconSize: [35, 35],
      iconAnchor: [17, 35],
      popupAnchor: [0, -35],
    });
  }, []);

  const roadsideIcon = useMemo(() => {
    return new L.Icon({
      iconUrl: '/icons/pomoc-drogowa.png',
      iconSize: [40, 60],
      iconAnchor: [20, 60],
      popupAnchor: [0, -60],
    });
  }, []);

  // Funkcja obliczająca odległość (duplikacja z RequestDetails, jeśli nie ma globalnej utility)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Promień Ziemi w kilometrach
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance; // Odległość w kilometrach
  };

  // NOWA FUNKCJA: Generowanie linku nawigacyjnego
  const generateNavigationLink = (lat, lng) => {
    // Sprawdzenie, czy urządzenie jest mobilne (bardzo uproszczone)
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Dla urządzeń mobilnych preferujemy schemat URL 'geo:' lub 'maps:'
      // Lepsze wsparcie dla iOS i Android
      // lub bezpośrednio link do Google Maps z intencją nawigacji
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      // Alternatywnie: `geo:${lat},${lng}?q=${lat},${lng}`
    } else {
      // Dla desktopów otwieramy w Google Maps
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
  };


  useEffect(() => {
    const fetchUrgentRequests = async () => {
      setLoadingRequests(true);
      const { data, error } = await supabase
        .from('urgent_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Błąd ładowania pilnych zgłoszeń:', error.message);
      } else {
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const activeRequests = data.filter(req => {
          if (!req.created_at) {
            return false;
          }
          const createdAtDate = new Date(req.created_at);
          return createdAtDate >= fortyEightHoursAgo;
        });
        setUrgentRequests(activeRequests);
      }
      setLoadingRequests(false);
    };

    fetchUrgentRequests();

    const interval = setInterval(fetchUrgentRequests, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Efekt do zarządzania widokiem (formularz / szczegóły / lista) na podstawie URL
  useEffect(() => {
    if (urlRequestId) {
      setShowForm(false);
    } else {
      setShowForm(false);
    }
  }, [urlRequestId]);

  // NOWY EFFECT: Pobieranie pobliskich pomocy drogowych do formularza
  useEffect(() => {
    const findNearbyRoadsideAssistance = async () => {
      if (!locationFromCoords.latitude || !locationFromCoords.longitude) {
        setNearbyRoadsideAssistanceInForm([]); // Wyczyść, jeśli nie ma koordynat
        return;
      }

      setLoadingRoadsideInForm(true);
      try {
        const { data: roadsideData, error: roadsideError } = await supabase
          .from('users_extended')
          .select('id, company_name, roadside_slug, roadside_city, roadside_street, roadside_number, roadside_phone, latitude, longitude')
          .eq('is_pomoc_drogowa', true)
          .eq('is_roadside_assistance_agreed', true) // Tylko te, które wyraziły zgodę
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (roadsideError) throw roadsideError;

        const distanceThresholdKm = 50; // Zasięg 50 km
        const nearby = roadsideData.filter(rs => {
          if (rs.latitude && rs.longitude) {
            const distance = calculateDistance(
              locationFromCoords.latitude,
              locationFromCoords.longitude,
              rs.latitude,
              rs.longitude
            );
            return distance <= distanceThresholdKm;
          }
          return false;
        });
        setNearbyRoadsideAssistanceInForm(nearby);
      } catch (error) {
        console.error("Błąd ładowania pobliskiej pomocy drogowej w formularzu:", error.message);
        setNearbyRoadsideAssistanceInForm([]);
      } finally {
        setLoadingRoadsideInForm(false);
      }
    };

    findNearbyRoadsideAssistance();
  }, [locationFromCoords.latitude, locationFromCoords.longitude]);

  const handleGetMyLocation = async () => {
    setGettingLocation(true);
    setLocationError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocationFromCoords({ latitude, longitude });

          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&language=pl&types=place,address,poi,postcode,locality`
            );
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              const placeName = data.features[0].place_name;
              setLocationFromLabel(placeName);
              alert(`✅ Twoja lokalizacja: ${placeName}`);
            } else {
              setLocationFromLabel(`Lokalizacja GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
              alert(`✅ Znaleziono lokalizację GPS, ale nie udało się pobrać dokładnego adresu.`);
            }
          } catch (error) {
            console.error("Błąd geokodowania wstecznego Mapbox:", error);
            setLocationFromLabel(`Lokalizacja GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            alert(`✅ Znaleziono lokalizację GPS, ale błąd pobierania adresu.`);
          } finally {
            setGettingLocation(false);
          }
        },
        (error) => {
          setGettingLocation(false);
          let errorMessage = 'Błąd pobierania lokalizacji.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Lokalizacja została zablokowana. Zezwól na dostęp w ustawieniach przeglądarki.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Informacje o lokalizacji są niedostępne.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Przekroczono czas oczekiwania na lokalizację.';
              break;
            default:
              errorMessage = `Wystąpił nieznany błąd: ${error.message}`;
              break;
          }
          setLocationError(`❌ ${errorMessage}`);
          alert(`Błąd: ${errorMessage}`);
          console.error("Błąd geolokalizacji:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGettingLocation(false);
      setLocationError('❌ Twoja przeglądarka nie wspiera geolokalizacji.');
      alert('Twoja przeglądarka nie wspiera geolokalizacji.');
    }
  };

  const handleReportUrgentNeedClick = () => {
    setShowForm(true);
    navigate('/transport-na-juz');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleViewRequestDetails = (requestId) => {
    navigate(`/transport-na-juz/${requestId}`); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    navigate('/transport-na-juz');
  };

  const handleSubmitUrgentRequest = async (e) => {
    e.preventDefault();
    
    if (!locationFromCoords.latitude || !locationFromCoords.longitude) {
      alert('❗Lokalizacja (Skąd) jest wymagana. Użyj przycisku "Użyj mojej lokalizacji" lub wybierz adres z listy.');
      return;
    }
    if (!phoneNumber || phoneNumber.trim() === '') {
      alert('❗Numer telefonu jest wymagany.');
      return;
    }
    if (!agreeToSharePhone) {
      alert('❗Musisz wyrazić zgodę na udostępnienie numeru telefonu przewoźnikom.');
      return;
    }
    if (!vehicleType) {
      alert('❗Wybierz rodzaj pojazdu.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('urgent_requests')
        .insert([
          {
            vehicle_type: vehicleType,
            location_from_label: locationFromLabel,
            location_from_lat: locationFromCoords.latitude,
            location_from_lng: locationFromCoords.longitude,
            location_to_label: locationToLabel || null,
            location_to_lat: locationToCoords.latitude || null,
            location_to_lng: locationToCoords.longitude || null,
            problem_description: problemDescription,
            phone_number: agreeToSharePhone ? phoneNumber : null,
            agree_to_share_phone: agreeToSharePhone,
          },
        ])
        .select();

      if (error) throw error;

      alert('✅ Twoje zgłoszenie zostało wysłane! Przewoźnicy zostaną o nim powiadomieni.');
      
      setVehicleType('');
      setLocationFromLabel('');
      setLocationFromCoords({ latitude: null, longitude: null });
      setLocationToLabel('');
      setLocationToCoords({ latitude: null, longitude: null });
      setProblemDescription('');
      setPhoneNumber('');
      setAgreeToSharePhone(false);
      setShowForm(false); 

      if (data && data.length > 0) {
        setUrgentRequests(prevRequests => [data[0], ...prevRequests].slice(0, 100));
      }

    } catch (error) {
      alert(`❌ Wystąpił błąd podczas wysyłania zgłoszenia: ${error.message || JSON.stringify(error)}`);
      console.error('Błąd wysyłania zgłoszenia:', error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="transport-na-juz-container">
        <div className="main-content-grid">
          <div className="left-column">
            <section className="report-cta-section">
              <button className="btn-primary full-width-btn" onClick={handleReportUrgentNeedClick}>
                Zgłoś pilną potrzebę
              </button>
            </section>
          </div>

          <div className="right-column">
            {showForm ? (
              <section className="report-form-section" ref={formRef}>
                <h2>Formularz zgłoszenia pilnej potrzeby</h2>
                <form onSubmit={handleSubmitUrgentRequest} className="urgent-request-form">
                  <label className="form-label">
                    Rodzaj pojazdu do holowania/transportu:
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      required
                      className="form-select"
                    >
                      <option value="">Wybierz typ pojazdu</option>
                      <option value="osobowy">Samochód osobowy</option>
                      <option value="bus">Bus / Dostawczy</option>
                      <option value="ciezarowy">Samochód ciężarowy</option>
                      <option value="motocykl">Motocykl</option>
                      <option value="inny">Inny</option>
                    </select>
                  </label>

                  <label className="form-label">
                    Lokalizacja (Skąd potrzebujesz transportu?):
                    <div className="location-input-group"> 
                      <LocationAutocomplete
                        value={locationFromLabel}
                        onSelectLocation={(label, sug) => {
                          setLocationFromLabel(label);
                          if (sug.center && Array.isArray(sug.center) && sug.center.length >= 2) {
                            setLocationFromCoords({ latitude: sug.center[1], longitude: sug.center[0] });
                          } else {
                            console.warn("Brak koordynatów (sug.center) dla lokalizacji 'Skąd':", sug);
                            setLocationFromCoords({ latitude: null, longitude: null });
                          }
                        }}
                        placeholder="Wpisz adres lub lokalizację"
                        className="form-input"
                        searchType="all" 
                      />
                      <button
                        type="button" 
                        onClick={handleGetMyLocation}
                        disabled={gettingLocation}
                        className="btn-secondary small-btn"
                      >
                        {gettingLocation ? 'Pobieram...' : 'Użyj mojej lokalizacji'}
                      </button>
                    </div>
                    {locationError && <p className="error-message">{locationError}</p>}
                  </label>

                  <label className="form-label">
                    Lokalizacja (Dokąd ma być transport? - opcjonalnie):
                    <LocationAutocomplete
                      value={locationToLabel}
                      onSelectLocation={(label, sug) => {
                        setLocationToLabel(label);
                        if (sug.center && Array.isArray(sug.center) && sug.center.length >= 2) {
                          setLocationToCoords({ latitude: sug.center[1], longitude: sug.center[0] });
                        } else {
                          console.warn("Brak koordynatów (sug.center) dla lokalizacji 'Dokąd':", sug);
                          setLocationToCoords({ latitude: null, longitude: null });
                        }
                      }}
                      placeholder="Wpisz adres docelowy (opcjonalnie)"
                      className="form-input"
                      searchType="all"
                    />
                  </label>

                  <label className="form-label">
                    Krótki opis problemu/sytuacji:
                    <textarea
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      maxLength={250}
                      rows={3}
                      placeholder="Np. 'Awaria silnika na autostradzie A1', 'Stłuczka, auto nie jeździ', 'Brak paliwa w lesie'."
                      className="form-textarea"
                    ></textarea>
                    <small>{problemDescription.length}/250 znaków</small>
                  </label>

                  <label className="form-label">
                    Numer telefonu do kontaktu:
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      placeholder="Np. +48 123 456 789"
                      className="form-input"
                    />
                  </label>

                  <label className="form-checkbox-label">
                    <input
                      type="checkbox"
                      checked={agreeToSharePhone}
                      onChange={(e) => setAgreeToSharePhone(e.target.checked)}
                      required
                    />
                    Wyrażam zgodę na udostępnienie mojego numeru telefonu przewoźnikom w celu kontaktu.
                  </label>

                  <button type="submit" className="btn-primary form-submit-btn">
                    Wyślij zgłoszenie
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} style={{marginTop: '10px'}}>
                    Anuluj
                  </button>
                </form>

                {/* Sekcja Mapy w formularzu - POKAZUJE SIĘ, GDY LOKALIZACJA JEST DOSTĘPNA */}
                {locationFromCoords.latitude && locationFromCoords.longitude && userLocationIcon && roadsideIcon ? (
                  <div className="map-in-form-container"> {/* Nowa klasa do stylów */}
                    <h3>Pomoc drogowa w pobliżu ({locationFromCoords.latitude.toFixed(4)}, {locationFromCoords.longitude.toFixed(4)})</h3>
                    {loadingRoadsideInForm && <p>Ładowanie pobliskiej pomocy drogowej...</p>}
                    
                    <MapContainer center={[locationFromCoords.latitude, locationFromCoords.longitude]} zoom={10} className="form-map" gestureHandling={true}>
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                      />
                      <FormMapCenterUpdater center={[locationFromCoords.latitude, locationFromCoords.longitude]} />
                      
                      {/* Marker dla lokalizacji użytkownika */}
                      <Marker position={[locationFromCoords.latitude, locationFromCoords.longitude]} icon={userLocationIcon}>
                        <Popup>
                          <strong>Twoja Lokalizacja</strong><br/>
                          {locationFromLabel || `Lat: ${locationFromCoords.latitude.toFixed(4)}, Lng: ${locationFromCoords.longitude.toFixed(4)}`}
                        </Popup>
                      </Marker>

                      {/* Markery dla pobliskich pomocy drogowych */}
                      {nearbyRoadsideAssistanceInForm.length > 0 ? (
                        nearbyRoadsideAssistanceInForm.map(rs => (
                          rs.latitude && rs.longitude && (
                            <Marker key={rs.id} position={[rs.latitude, rs.longitude]} icon={roadsideIcon}>
                              <Popup>
                                <strong>{rs.company_name || 'Pomoc Drogowa'}</strong><br/>
                                {rs.roadside_city}, {rs.roadside_street} {rs.roadside_number}<br/>
                                {rs.roadside_phone && <a href={`tel:${rs.roadside_phone}`}>{rs.roadside_phone}</a>}<br/>
                                {rs.roadside_slug && <a href={`/pomoc-drogowa/${rs.roadside_slug}`} target="_blank" rel="noopener noreferrer">Zobacz profil</a>}<br/>
                                {/* NOWY PRZYCISK: Prowadź do lokalizacji */}
                                {request && request.location_from_lat && request.location_from_lng && ( // Upewnij się, że lokalizacja zgłoszenia jest znana
                                  <a 
                                    href={generateNavigationLink(rs.latitude, rs.longitude, locationFromCoords.latitude, locationFromCoords.longitude)}
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn-navigate" // Dodamy styl dla tego przycisku
                                    style={{marginTop: '10px', display: 'block', backgroundColor: '#007bff', color: 'white', padding: '5px 10px', borderRadius: '4px', textDecoration: 'none', textAlign: 'center'}}
                                  >
                                    Prowadź do tej lokalizacji
                                  </a>
                                )}
                              </Popup>
                            </Marker>
                          )
                        ))
                      ) : (
                        // USUNIĘTO: Nakładkę zasłaniającą mapę, gdy brak pomocy drogowej
                        // Zamiast tego komunikat będzie poniżej mapy lub w innym miejscu, jeśli wolisz.
                        null
                      )}
                    </MapContainer>
                     {/* Komunikat o braku pomocy drogowej pod mapą */}
                    {!loadingRoadsideInForm && nearbyRoadsideAssistanceInForm.length === 0 && (
                        <p className="map-info-message">Brak pobliskich pomocy drogowej (do 50 km).</p>
                    )}
                  </div>
                ) : (
                  // Komunikat, gdy lokalizacja nie jest jeszcze określona
                  <div className="map-placeholder">
                    {console.log("Mapa nie jest renderowana. Koordynaty:", locationFromCoords)} 
                    {console.log("Błąd lokalizacji:", locationError)} 
                    {locationError ? <p className="error-message">{locationError}</p> : <p>Określ lokalizację "Skąd", aby zobaczyć pobliskie pomoce drogowe.</p>}
                  </div>
                )}


              </section>
            ) : urlRequestId ? ( // Tutaj używamy urlRequestId zamiast activeRequestId
              <RequestDetails 
                requestId={urlRequestId} // Przekazujemy ID z URL
                onBackToList={handleBackToList} 
              />
            ) : (
              <section className="current-requests-section">
                <h2>Aktualne pilne zgłoszenia</h2>
                {loadingRequests ? (
                  <p>Ładowanie zgłoszeń...</p>
                ) : urgentRequests.length > 0 ? (
                  <div className="requests-list">
                    {urgentRequests.map((request) => (
                      <div key={request.id} className="request-card" onClick={() => handleViewRequestDetails(request.id)}>
                        <h3>
                          {request.problem_description && request.problem_description.length > 100
                            ? request.problem_description.substring(0, 100) + '...'
                            : request.problem_description || 'Brak opisu'}
                        </h3>
                        <p>Rodzaj pojazdu: {request.vehicle_type}</p>
                        <p>Lokalizacja: {request.location_from_label}</p>
                        <small>Zgłoszono: {new Date(request.created_at).toLocaleString()}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Brak aktualnych pilnych zgłoszeń.</p>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}