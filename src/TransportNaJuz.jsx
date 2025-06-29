// src/pages/TransportNaJuz.jsx

import React, { useState, useRef, useEffect } from 'react';
import Navbar from './components/Navbar';
import LocationAutocomplete from './components/LocationAutocomplete';
import RequestDetails from './components/RequestDetails'; // Importujemy nowy komponent
import './TransportNaJuz.css';
import { supabase } from './supabaseClient';

export default function TransportNaJuz() {
  const [showForm, setShowForm] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState(null); // ID aktywnego zgłoszenia (dla widoku szczegółów)
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

  const [urgentRequests, setUrgentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Efekt do ładowania pilnych zgłoszeń z Supabase
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

    const interval = setInterval(fetchUrgentRequests, 60 * 1000); // Odświeżanie listy co minutę
    return () => clearInterval(interval);
  }, []);

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
    // Możesz przewinąć do góry prawej kolumny
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Przewiń na górę strony
  };

  const handleBackToList = () => {
    setActiveRequestId(null); // Wróć do listy
    setShowForm(false); // Upewnij się, że formularz jest ukryty
  };

  const handleSubmitUrgentRequest = async (e) => {
    e.preventDefault();
    
    if (!locationFromCoords.latitude || !locationFromCoords.longitude) {
      alert('❗Uzupełnij pole "Lokalizacja (Skąd)", wybierając z listy sugestii.');
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
        .select(); // Dodaj .select(), aby otrzymać wstawiony rekord i odświeżyć listę

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

      // Dodaj nowe zgłoszenie do listy od razu, zamiast pobierać całą listę ponownie
      if (data && data.length > 0) {
        setUrgentRequests(prevRequests => [data[0], ...prevRequests].slice(0, 100)); // Dodaj na początek listy
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
              // RENDEROWANIE KOMPONENTU SZCZEGÓŁÓW ZGŁOSZENIA
              <RequestDetails 
                requestId={activeRequestId} 
                onBackToList={handleBackToList} 
              />
            ) : (
              // Lista pilnych zgłoszeń (domyślny widok prawej kolumny)
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