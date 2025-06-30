// src/CarriersCatalog.jsx

import React, { useEffect, useState, useMemo } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { supabase } from './supabaseClient';
import './CarriersCatalog.css';
// LocationAutocomplete jest już niepotrzebny, bo nie filtrujemy po mieście jako osobnym input
// import LocationAutocomplete from './components/LocationAutocomplete'; 

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

  // Stany dla filtrów (bez searchName i cityAutocomplete)
  const [selectedProvince, setSelectedProvince] = useState('Cała Polska');
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
            province,           
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

        // Filtrowanie po województwie
        if (selectedProvince && selectedProvince !== 'Cała Polska') {
            query = query.eq('province', selectedProvince);
        }
        
        // Usunięto filtrowanie po nazwie tekstowej i po mieście jako input (teraz tylko province)


        const { data, error: fetchError } = await query.order('company_name', { ascending: true });

        if (fetchError) throw fetchError;

        // FILTROWANIE PO STRONIE KLIENTA DLA FLEET_FLAGS
        const finalCarriers = data.filter(carrier => {
            if (selectedServiceTypes.length === 0) return true; // Jeśli brak wybranych typów usług, pokaż wszystkich

            return selectedServiceTypes.some(selectedType => {
                if (selectedType === 'pomoc_drogowa') {
                    return carrier.is_pomoc_drogowa && carrier.is_roadside_assistance_agreed;
                }
                // Parsowanie fleet_flags (jeśli to string JSON) i sprawdzenie, czy zawiera wybrany typ
                let carrierFleetFlags = carrier.fleet_flags;
                if (typeof carrierFleetFlags === 'string') {
                    try { carrierFleetFlags = JSON.parse(carrierFleetFlags); } catch { carrierFleetFlags = []; }
                }
                if (!Array.isArray(carrierFleetFlags)) {
                    carrierFleetFlags = [];
                }
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
    }, 300); // Debounce, aby nie wysyłać zapytań przy każdej zmianie

    return () => clearTimeout(timeoutId);

  }, [selectedProvince, selectedServiceTypes]); // Zależności dla useEffect (już bez searchName, selectedCityLabel/Coords)

  const handleServiceTypeChange = (e) => {
    const { value, checked } = e.target;
    setSelectedServiceTypes(prev =>
      checked ? [...prev, value] : prev.filter(type => type !== value)
    );
  };

  // Funkcja pomocnicza do pobierania ikony pojazdu/usługi (zwraca pusty string)
  const getServiceIcon = (type) => {
    return ''; // Usuwamy ikony, zwracamy pusty string
  };


  return (
    <>
      <Navbar />
      <div className="carriers-catalog-container">
        <h1>Katalog Przewoźników i Pomocy Drogowych</h1>

        {/* Sekcja Filtrów */}
        <div className="catalog-filters">
          {/* USUNIĘTO: Pole "Szukaj po nazwie firmy/przewoźnika" */}
          {/* USUNIĘTO: Pole "Filtruj po mieście" (LocationAutocomplete) */}

          <label className="filter-label">Województwo:</label>
          <select
            value={selectedProvince}
            onChange={(e) => {
              setSelectedProvince(e.target.value);
            }}
            className="filter-select"
          >
            {provinces.map(prov => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>

          <div className="service-type-filters">
            <label className="filter-label full-width">Typy usług:</label>
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

          {/* Na razie brak przycisków "Szukaj" i "Wyczyść", bo filtry są debounce'owane */}
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
<h3><strong>{carrier.company_name || carrier.full_name || 'Brak nazwy'}</strong></h3>
                  <p>
                    <strong>Lokalizacja:</strong> {carrier.city}
                    {carrier.street && `, ${carrier.street} ${carrier.building_number}`}
                    {carrier.roadside_city && carrier.roadside_city !== carrier.city && (
                        <span> (Pomoc Drogowa: {carrier.roadside_city})</span>
                    )}
                    {carrier.province && ` (${carrier.province})`} {/* WYŚWIETLANIE WOJEWÓDZTWA */}
                  </p>
                  <p className="carrier-services">
                    {/* getServiceIcon() teraz zwraca pusty string, więc wyświetla się tylko tekst */}
                    {carrier.is_pomoc_drogowa && carrier.is_roadside_assistance_agreed && (
                        <span>{getServiceIcon('pomoc_drogowa')}Pomoc Drogowa </span>
                    )}
                    {carrier.fleet_flags && typeof carrier.fleet_flags === 'string' ? ( 
                        JSON.parse(carrier.fleet_flags).map((flag, index) => (
                            <span key={index}>{getServiceIcon(flag)}{flag} </span> 
                        ))
                    ) : (
                        Array.isArray(carrier.fleet_flags) && carrier.fleet_flags.map((flag, index) => (
                            <span key={index}>{getServiceIcon(flag)}{flag} </span>
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