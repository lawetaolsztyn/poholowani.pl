// src/pages/TransportNaJuz.jsx

import React, { useState, useRef, useEffect } from 'react';
import Navbar from './components/Navbar';
import LocationAutocomplete from './components/LocationAutocomplete';
import RequestDetails from './components/RequestDetails';
import './TransportNaJuz.css';
import { supabase } from './supabaseClient';

export default function TransportNaJuz() {
  const [showForm, setShowForm] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState(null);
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

  // NOWE STANY DLA GEOLOKALIZACJI
  const [gettingLocation, setGettingLocation] = useState(false); // Stan ładowania geolokalizacji
  const [locationError, setLocationError] = useState(''); // Komunikat o błędzie geolokalizacji

  const [urgentRequests, setUrgentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

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

  // NOWA FUNKCJA: Pobieranie lokalizacji z urządzenia
  const handleGetMyLocation = async () => {
    setGettingLocation(true);
    setLocationError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocationFromCoords({ latitude, longitude });

          // Geokodowanie wsteczne (reverse geocoding) za pomocą Mapbox API
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${import.meta.env.VITE_MAPBOX_API_KEY}&language=pl&types=place,address,poi,postcode,locality`
            );
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              // Ustawiamy label na najbardziej czytelną nazwę miejsca z Mapbox
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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Opcje Geolocation
      );
    } else {
      setGettingLocation(false);
      setLocationError('❌ Twoja przeglądarka nie wspiera geolokalizacji.');
      alert('Twoja przeglądarka nie wspiera geolokalizacji.');
    }
  };

  const handleReportUrgentNeedClick = () => {
    setShowForm(true); // Pokaż formularz zgłoszenia
    setActiveRequestId(null); // Ukryj szczegóły, jeśli były aktywne
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleViewRequestDetails = (requestId) => {
    setActiveRequestId(requestId); // Ustaw ID aktywnego zgłoszenia, aby wyświetlić szczegóły
    setShowForm(false); // Ukryj formularz, jeśli był widoczny
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Przewiń na górę strony
  };

  const handleBackToList = () => {
    setActiveRequestId(null); // Wróć do listy
    setShowForm(false); // Upewnij się, że formularz jest ukryty
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
      
      // Resetuj formularz po wysłaniu
      setVehicleType('');
      setLocationFromLabel('');
      setLocationFromCoords({ latitude: null, longitude: null });
      setLocationToLabel('');
      setLocationToCoords({ latitude: null, longitude: null });
      setProblemDescription('');
      setPhoneNumber('');
      setAgreeToSharePhone(false);
      setShowForm(false); // Ukryj formularz po wysłaniu

      // Dodaj nowe zgłoszenie do listy od razu
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
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
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
                        searchType="all" // Szukaj wszystkiego (miast, adresów)
                      />
                      <button
                        type="button" // Ważne: typ "button", żeby nie wysyłać formularza
                        onClick={handleGetMyLocation}
                        disabled={gettingLocation}
                        className="btn-secondary small-btn" // Dodaj styl dla małego przycisku
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
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
              </section>
            ) : activeRequestId ? (
              <RequestDetails 
                requestId={activeRequestId} 
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
                        <h3>{request.vehicle_type}</h3>
                        <p>Lokalizacja: {request.location_from_label}</p>
                        <p>Opis: {request.problem_description}</p>
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