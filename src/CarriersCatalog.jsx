// src/CarriersCatalog.jsx

import React, { useEffect, useState, useMemo } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { supabase } from './supabaseClient';
import './CarriersCatalog.css';
import LocationAutocomplete from './components/LocationAutocomplete'; 

// Opcje typów pojazdów/usług dla filtrowania (możesz dostosować)
const serviceTypeOptions = [
  { value: 'osobowy', label: 'Samochód osobowy' },
  { value: 'bus', label: 'Bus / Dostawczy' },
  { value: 'ciezarowy', label: 'Samochód ciężarowy' },
  { value: 'autolaweta', label: 'Autolaweta' },
  { value: 'pomoc_drogowa', label: 'Pomoc Drogowa' },
  { value: 'przyczepa_towarowa', label: 'Przyczepa towarowa' },
  { value: 'przyczepa_laweta', label: 'Przyczepa laweta' },
  { value: 'przyczepa_laweta_podwojna', label: 'Przyczepa laweta podwójna' },
];

// Lista województw (dla filtra)
const provinces = [
  'Cała Polska', // Opcja domyślna
  'Dolnośląskie', 'Kujawsko-Pomorskie', 'Lubelskie', 'Lubuskie',
  'Łódzkie', 'Małopolskie', 'Mazowieckie', 'Opolskie', 'Podkarpackie',
  'Podlaskie', 'Pomorskie', 'Śląskie', 'Świętokrzyskie', 'Warmińsko-Mazurskie',
  'Wielkopolskie', 'Zachodniopomorskie'
];

export default function CarriersCatalog() {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stany dla filtrów (usunięto searchName)
  const [selectedProvince, setSelectedProvince] = useState('Cała Polska');
  const [selectedCityLabel, setSelectedCityLabel] = useState('');
  const [selectedCityCoords, setSelectedCityCoords] = useState(null); 
  const [selectedServiceTypes, setSelectedServiceTypes] = useState([]);


  useEffect(() => {
    const fetchCarriers = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('users_extended')
          .select(`
            id,
            company_name,
            full_name,
            city,
            province,           // DODANO: pobieranie kolumny province
            street,
            building_number,
            phone,
            roadside_phone,
            roadside_city,
            roadside_street,
            roadside_number,
            roadside_slug,
            email,
            role,
            is_pomoc_drogowa,
            is_public_profile_agreed,
            is_roadside_assistance_agreed,
            fleet_flags,
            description,
            roadside_description
          `)
          .in('role', ['firma', 'klient'])
          .or('is_public_profile_agreed.eq.true,is_roadside_assistance_agreed.eq.true'); 

        // Filtrowanie po województwie (TERAZ Z KOLUMNY 'province')
        if (selectedProvince && selectedProvince !== 'Cała Polska') {
            query = query.eq('province', selectedProvince);
        }
        
        // Filtrowanie po mieście
        if (selectedCityLabel) {
            query = query.ilike('city', `%${selectedCityLabel}%`); // Używamy ilike dla elastyczności
            // Można też dodać: .ilike('roadside_city', `%${selectedCityLabel}%`)
        }

        // Filtrowanie po typach usług
        if (selectedServiceTypes.length > 0) {
            const serviceFilters = selectedServiceTypes.map(type => {
                if (type === 'pomoc_drogowa') {
                    return `(is_pomoc_drogowa.eq.true,is_roadside_assistance_agreed.eq.true)`;
                }
                // Jeśli fleet_flags to array w bazie, możesz użyć operatora 'contains' (@>).
                // Np. `fleet_flags.cs.{${type}}` - to wymaga, aby kolumna fleet_flags była typu text[]
                return null; 
            }).filter(Boolean);
            
            if (serviceFilters.length > 0) {
                // Skomponuj warunek OR dla wielu typów usług
                const orConditions = serviceFilters.join(',');
                query = query.or(orConditions);
                
                // UWAGA: Filtrowanie fleet_flags przez API jest bardziej złożone. 
                // Jeśli fleet_flags jest JSON stringiem lub text[], to trzeba użyć odpowiedniego operatora Supabase.
                // Na razie, jeśli fleet_flags to text[], dla innych typów niż pomoc_drogowa,
                // musiałbyś dopisać logikę dla każdego typu (np. .contains('fleet_flags', [type]))
                // Bardziej elastyczne byłoby filtrowanie po stronie klienta dla fleet_flags, 
                // lub dedykowane kolumny dla każdego typu pojazdu, albo bardziej zaawansowany filtr.
            }
        }


        const { data, error: fetchError } = await query.order('company_name', { ascending: true });

        if (fetchError) throw fetchError;

        // FILTROWANIE PO STRONIE KLIENTA DLA FLEET_FLAGS (tymczasowo lub dla złożonych zapytań)
        const finalCarriers = data.filter(carrier => {
            if (selectedServiceTypes.length === 0) return true; // Jeśli brak wybranych typów, pokaż wszystkich

            // Sprawdź, czy którykolwiek z wybranych typów pasuje
            return selectedServiceTypes.some(selectedType => {
                if (selectedType === 'pomoc_drogowa') {
                    return carrier.is_pomoc_drogowa && carrier.is_roadside_assistance_agreed;
                }
                // Jeśli fleet_flags to string JSON, parsowanie
                let carrierFleetFlags = carrier.fleet_flags;
                if (typeof carrierFleetFlags === 'string') {
                    try { carrierFleetFlags = JSON.parse(carrierFleetFlags); } catch { carrierFleetFlags = []; }
                }
                if (!Array.isArray(carrierFleetFlags)) {
                    carrierFleetFlags = [];
                }
                // Sprawdź, czy wybrany typ jest w fleet_flags przewoźnika
                return carrierFleetFlags.includes(selectedType);
            });
        });

        setCarriers(finalCarriers);
      } catch (err) {
        console.error('Błąd ładowania przewoźników:', err.message);
        setError('Nie udało się załadować listy przewoźników.');
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
        fetchCarriers();
    }, 300);

    return () => clearTimeout(timeoutId);

  }, [selectedProvince, selectedCityLabel, selectedServiceTypes]); // Zależności dla useEffect

  const handleServiceTypeChange = (e) => {
    const { value, checked } = e.target;
    setSelectedServiceTypes(prev =>
      checked ? [...prev, value] : prev.filter(type => type !== value)
    );
  };

  // Funkcja pomocnicza do pobierania ikony pojazdu/usługi
  const getServiceIcon = (type) => {
    switch (type) {
      case 'osobowy': return '🚗';
      case 'bus': return '🚌';
      case 'ciezarowy': return '🚚'; // Przydałoby się odróżnić od autolawety
      case 'autolaweta': return '🛻';
      case 'pomoc_drogowa': return '🆘';
      case 'przyczepa_towarowa': return '🚛';
      case 'przyczepa_laweta': return '🚜';
      case 'przyczepa_laweta_podwojna': return '🚚'; // Może inna ikona
      default: return '❓';
    }
  };


  return (
    <>
      <Navbar />
      <div className="carriers-catalog-container">
        <h1>Katalog Przewoźników i Pomocy Drogowych</h1>

        {/* Sekcja Filtrów */}
        <div className="catalog-filters">
          {/* Usunięto pole wyszukiwania tekstowego */}
          {/* Usunięto pole "Wpisz miasto" (jako osobny input) */}

          <select
            value={selectedProvince}
            onChange={(e) => {
              setSelectedProvince(e.target.value);
              setSelectedCityLabel(''); // Wyczyść miasto, gdy zmieniasz województwo
              setSelectedCityCoords(null);
            }}
            className="filter-select"
          >
            {provinces.map(prov => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>

          <LocationAutocomplete
            value={selectedCityLabel}
            onSelectLocation={(label, sug) => {
              setSelectedCityLabel(sug.text || label); // Użyj czystego tekstu miasta
              // Spróbuj pobrać województwo z sugestii Mapbox i zaktualizować selectedProvince
              const contextProvince = sug.context?.find(c => c.id.startsWith('region.') || c.id.startsWith('province.'))?.text;
              if (contextProvince && provinces.includes(contextProvince)) { // Sprawdź czy to woj. z naszej listy
                  setSelectedProvince(contextProvince);
              }
              if (sug.center && Array.isArray(sug.center) && sug.center.length >= 2) {
                setSelectedCityCoords({ latitude: sug.center[1], longitude: sug.center[0] });
              } else {
                setSelectedCityCoords(null);
              }
            }}
            placeholder="Filtruj po mieście"
            className="filter-input"
            searchType="city" // Szukaj tylko miast
          />

          <div className="service-type-filters">
            {serviceTypeOptions.map(option => (
              <label key={option.value} className="checkbox-label">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={selectedServiceTypes.includes(option.value)}
                  onChange={handleServiceTypeChange}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Sekcja Wyników */}
        <div className="catalog-results">
          {loading ? (
            <p className="loading-message">Ładowanie przewoźników...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : carriers.length > 0 ? (
            <div className="carriers-list">
              {carriers.map(carrier => (
                <div key={carrier.id} className="carrier-card">
                  <h3>{carrier.company_name || carrier.full_name || 'Brak nazwy'}</h3>
                  <p>
                    <strong>Lokalizacja:</strong> {carrier.city} {carrier.street && `, ${carrier.street} ${carrier.building_number}`}
                    {carrier.roadside_city && carrier.roadside_city !== carrier.city && (
                        <span> (Pomoc Drogowa: {carrier.roadside_city})</span>
                    )}
                    {carrier.province && ` (${carrier.province})`} {/* WYŚWIETLANIE WOJEWÓDZTWA */}
                  </p>
                  <p className="carrier-services">
                    {carrier.is_pomoc_drogowa && carrier.is_roadside_assistance_agreed && (
                        <span>{getServiceIcon('pomoc_drogowa')} Pomoc Drogowa </span>
                    )}
                    {carrier.fleet_flags && typeof carrier.fleet_flags === 'string' ? ( // Sprawdź, czy fleet_flags to string JSON
                        JSON.parse(carrier.fleet_flags).map((flag, index) => (
                            <span key={index}>{getServiceIcon(flag)} {flag} </span>
                        ))
                    ) : (
                        Array.isArray(carrier.fleet_flags) && carrier.fleet_flags.map((flag, index) => ( // Jeśli to już array
                            <span key={index}>{getServiceIcon(flag)} {flag} </span>
                        ))
                    )}
                  </p>
                  {carrier.phone && carrier.is_public_profile_agreed && (
                    <p className="carrier-contact">📞 <a href={`tel:${carrier.phone}`} className="phone-link">{carrier.phone}</a></p>
                  )}
                  {carrier.roadside_phone && carrier.is_roadside_assistance_agreed && !carrier.phone && (
                    <p className="carrier-contact">📞 <a href={`tel:${carrier.roadside_phone}`} className="phone-link">(Pomoc Drogowa) {carrier.roadside_phone}</a></p>
                  )}
                  
                  <div className="carrier-actions">
                    {carrier.is_public_profile_agreed && (
                      <a href={`/profil/${carrier.id}`} target="_blank" rel="noopener noreferrer" className="btn-view-profile">
                        Zobacz profil
                      </a>
                    )}
                    {carrier.is_pomoc_drogowa && carrier.is_roadside_assistance_agreed && carrier.roadside_slug && (
                      <a href={`/pomoc-drogowa/${carrier.roadside_slug}`} target="_blank" rel="noopener noreferrer" className="btn-view-profile">
                        Profil Pomocy Drogowej
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-results-message">Brak przewoźników spełniających kryteria.</p>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}