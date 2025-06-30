// src/UserProfileDashboard.jsx

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import './UserProfileDashboard.css';
import LocationAutocomplete from './components/LocationAutocomplete';
const provinces = [
  'Dolnośląskie', 'Kujawsko-Pomorskie', 'Lubelskie', 'Lubuskie',
  'Łódzkie', 'Małopolskie', 'Mazowieckie', 'Opolskie', 'Podkarpackie',
  'Podlaskie', 'Pomorskie', 'Śląskie', 'Świętokrzyskie', 'Warmińsko-Mazurskie',
  'Wielkopolskie', 'Zachodniopomorskie'
];

export default function UserProfileDashboard() {
  const [activeTab, setActiveTab] = useState('Moje dane');
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState(null); // Będzie przechowywać rozszerzone dane profilu użytkownika
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  
  // Stany dla zgód
  const [isPublicProfileAgreed, setIsPublicProfileAgreed] = useState(false);
  const [isRoadsideAssistanceAgreed, setIsRoadsideAssistanceAgreed] = useState(false);

  // Stany dla auto-uzupełniania adresów POMOCY DROGOWEJ
  const [roadsideCityAutocompleteValue, setRoadsideCityAutocompleteValue] = useState('');
  const [roadsideStreetAutocompleteValue, setRoadsideStreetAutocompleteValue] = useState('');
  const [roadsideSelectedCoords, setRoadsideSelectedCoords] = useState({ latitude: null, longitude: null }); // Koordynaty z autocomplete dla pomocy drogowej

  // Stany dla autouzupełniania MIASTA GŁÓWNEGO PROFILU (w "Moje dane")
  const [myCityAutocompleteValue, setMyCityAutocompleteValue] = useState('');
  const [mySelectedCityCoords, setMySelectedCityCoords] = useState({ latitude: null, longitude: null }); // Koordynaty z autocomplete dla miasta głównego


  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setUserData(null);
          setFormData(null);
          setIsPublicProfileAgreed(false);
          setIsRoadsideAssistanceAgreed(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Błąd pobierania danych użytkownika z Supabase:", error.message);
          setMessage("Błąd ładowania danych użytkownika.");
          setUserData(null);
          setFormData(null);
          setIsPublicProfileAgreed(false);
          setIsRoadsideAssistanceAgreed(false);
        } else {
          const fetchedData = data || {}; 
          
          // Inicjalizacja formData - upewnienie się, że wszystkie pola są stringami/booleanami
          const initialFormData = {
            ...fetchedData,
            roadside_street: fetchedData.roadside_street || '',
            roadside_number: fetchedData.roadside_number || '',
            roadside_city: fetchedData.roadside_city || '',
            roadside_phone: fetchedData.roadside_phone || '',
            roadside_slug: fetchedData.roadside_slug || '',
            roadside_description: fetchedData.roadside_description || '',
            is_pomoc_drogowa: fetchedData.is_pomoc_drogowa || false,
            is_public_profile_agreed: fetchedData.is_public_profile_agreed || false,
            is_roadside_assistance_agreed: fetchedData.is_roadside_assistance_agreed || false,
            province: fetchedData.province || '', // DODANO: inicjalizacja province
            city: fetchedData.city || '', // Upewnij się, że city jest stringiem
          };
          setFormData(initialFormData); 

          setRoadsideCityAutocompleteValue(initialFormData.roadside_city); 
          const fullRoadsideStreetValue = initialFormData.roadside_street + (initialFormData.roadside_number ? ' ' + initialFormData.roadside_number : '');
          setRoadsideStreetAutocompleteValue(fullRoadsideStreetValue.trim());
          
          if (initialFormData.latitude != null && initialFormData.longitude != null) {
            setRoadsideSelectedCoords({ latitude: initialFormData.latitude, longitude: initialFormData.longitude });
          } else {
            setRoadsideSelectedCoords({ latitude: null, longitude: null });
          }

          // Inicjalizacja dla MIASTA GŁÓWNEGO PROFILU ("Moje dane")
          setMyCityAutocompleteValue(initialFormData.city); 
          if (initialFormData.latitude != null && initialFormData.longitude != null) {
            setMySelectedCityCoords({ latitude: initialFormData.latitude, longitude: initialFormData.longitude });
          } else {
            setMySelectedCityCoords(null);
          }


          setIsPublicProfileAgreed(initialFormData.is_public_profile_agreed);
          setIsRoadsideAssistanceAgreed(initialFormData.is_roadside_assistance_agreed);
        }
      } catch (err) {
        console.error("Ogólny błąd podczas pobierania danych użytkownika:", err.message);
        setMessage("Wystąpił nieoczekiwany błąd podczas ładowania danych.");
        setUserData(null);
        setFormData(null);
        setIsPublicProfileAgreed(false);
        setIsRoadsideAssistanceAgreed(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const getTabs = () => { 
    if (!formData) {
      return [];
    }

    let baseTabs = ['Moje dane', 'Hasło'];
    
    if (formData.role === 'firma') {
      baseTabs.push('Profil publiczny');
      baseTabs.push('Pomoc drogowa');
    }
    return baseTabs;
  };

  const handleChange = (e) => {
    if (formData) {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    setSaving(true);
    setMessage('');

    if (!formData) {
        setMessage("Błąd: Brak danych do zapisu.");
        setSaving(false);
        return;
    }

    let updatedFormData = { ...formData }; 

    // Geokodowanie dla Pomocy Drogowej (jeśli zakładka jest aktywna i zgody są)
    if (activeTab === 'Pomoc drogowa' && updatedFormData.is_pomoc_drogowa && isRoadsideAssistanceAgreed) {
        if (roadsideSelectedCoords.latitude != null && roadsideSelectedCoords.longitude != null) {
            updatedFormData = { 
                ...updatedFormData, 
                latitude: roadsideSelectedCoords.latitude, 
                longitude: roadsideSelectedCoords.longitude 
            };
            console.log('DEBUG: Użyto koordynatów z LocationAutocomplete (Pomoc Drogowa):', roadsideSelectedCoords);
        } else {
            const cityPart = roadsideCityAutocompleteValue.split(',')[0].trim();
            const streetPart = roadsideStreetAutocompleteValue; 
            const fullAddressToGeocode = `${streetPart || ''} ${updatedFormData.roadside_number || ''}, ${cityPart || ''}, Polska`;
            
            console.log('DEBUG: Adres do geokodowania (Pomoc Drogowa, ręczny/fallback):', fullAddressToGeocode);

            if (fullAddressToGeocode.trim() === ',' || fullAddressToGeocode.trim() === ', Polska' || fullAddressToGeocode.trim().length < 5) {
                console.warn('Ostrzeżenie: Adres pomocy drogowej jest pusty lub niekompletny. Pomijam geokodowanie.');
                setMessage("Ostrzeżenie: Wprowadź pełny adres pomocy drogowej.");
                updatedFormData = { ...updatedFormData, longitude: null, latitude: null };
            } else {
                try {
                    // Używamy VITE_MAPBOX_TOKEN dla spójności
                    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddressToGeocode)}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&language=pl&country=PL`);
                    const json = await response.json();
                    const coords = json?.features?.[0]?.center;
                    if (coords) {
                        updatedFormData = { ...updatedFormData, longitude: coords[0], latitude: coords[1] };
                        console.log('DEBUG: Geokodowanie ręcznego adresu (Pomoc Drogowa) sukces:', coords);
                    } else {
                        console.warn('Geokodowanie (Pomoc Drogowa) nie zwróciło koordynatów dla adresu:', fullAddressToGeocode);
                        setMessage("Ostrzeżenie: Nie udało się uzyskać koordynatów dla adresu pomocy drogowej.");
                        updatedFormData = { ...updatedFormData, longitude: null, latitude: null };
                    }
                } catch (err) {
                    console.error('Błąd geokodowania (Pomoc Drogowa):', err.message);
                    setMessage(`❌ Błąd geokodowania (Pomoc Drogowa): ${err.message}`);
                    setSaving(false);
                    setTimeout(() => setMessage(''), 3000);
                    return;
                }
            }
        }
    }
    
    // NOWA LOGIKA: Geokodowanie dla Miasta w "Moje dane" i ustalenie województwa
    if (activeTab === 'Moje dane' && myCityAutocompleteValue) { 
        // Koordynaty i nazwa miasta są już ustawione z LocationAutocomplete
        if (mySelectedCityCoords.latitude != null && mySelectedCityCoords.longitude != null) {
            updatedFormData = { 
                ...updatedFormData, 
                latitude: mySelectedCityCoords.latitude, 
                longitude: mySelectedCityCoords.longitude,
                city: myCityAutocompleteValue // Upewnij się, że miasto jest z autocomplete
            };
            console.log('DEBUG: Użyto koordynatów z LocationAutocomplete (Moje dane):', mySelectedCityCoords);
        } else {
            // Jeśli brak koordynatów z autocomplete, spróbuj geokodować samo miasto
            try {
                const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(myCityAutocompleteValue)}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&language=pl&country=PL&types=place,locality`);
                const json = await response.json();
                const coords = json?.features?.[0]?.center;
                if (coords) {
                    updatedFormData.latitude = coords[1];
                    updatedFormData.longitude = coords[0];
                    console.log('DEBUG: Geokodowanie miasta głównego sukces:', coords);
                } else {
                    updatedFormData.latitude = null;
                    updatedFormData.longitude = null;
                    console.warn('DEBUG: Geokodowanie miasta głównego nie zwróciło koordynatów:', myCityAutocompleteValue);
                }
            } catch (err) {
                console.error('Błąd geokodowania miasta głównego:', err.message);
                updatedFormData.latitude = null;
                updatedFormData.longitude = null;
            }
        }

        // Pobierz województwo z kontekstu Mapboxa dla wybranego miasta
        try {
            // Używamy myCityAutocompleteValue (czysta nazwa miasta) do zapytania o kontekst
            const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(myCityAutocompleteValue.split(',')[0].trim())}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&language=pl&country=PL&types=place,locality`);
            const json = await response.json();
            const feature = json?.features?.[0];
            if (feature) {
                // Szukamy kontekstu, którego id zaczyna się od 'region.' lub 'province.'
                const contextProvince = feature.context?.find(c => c.id.startsWith('region.') || c.id.startsWith('province.'))?.text;
                if (contextProvince && provinces.includes(contextProvince)) { // Sprawdź czy to woj. z naszej listy
                    updatedFormData.province = contextProvince;
                    console.log('DEBUG: Ustalono województwo dla miasta głównego:', contextProvince);
                } else {
                    updatedFormData.province = ''; // Wyczyść, jeśli nie znaleziono
                    console.warn('DEBUG: Nie udało się ustalić województwa dla miasta głównego:', myCityAutocompleteValue);
                }
            } else {
                updatedFormData.province = '';
            }
        } catch (err) {
            console.error('Błąd pobierania województwa dla miasta głównego:', err.message);
            updatedFormData.province = '';
        }
    }


    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Użytkownik niezalogowany.");

      const finalUpdatePayload = {
        ...updatedFormData, 
        is_public_profile_agreed: isPublicProfileAgreed, 
        is_roadside_assistance_agreed: isRoadsideAssistanceAgreed, 
      };

      const { error } = await supabase
        .from('users_extended')
        .update(finalUpdatePayload) 
        .eq('id', user.id); 

      if (error) throw error;

      setMessage('✅ Dane zapisane pomyślnie!');
      setFormData(finalUpdatePayload); 
      setUserData(finalUpdatePayload); 
      // Zaktualizuj stan koordynatów dla miasta głównego po zapisie
      if (finalUpdatePayload.latitude !== mySelectedCityCoords.latitude || finalUpdatePayload.longitude !== mySelectedCityCoords.longitude) {
        setMySelectedCityCoords({ latitude: finalUpdatePayload.latitude, longitude: finalUpdatePayload.longitude });
      }
      // Zaktualizuj stan koordynatów dla pomocy drogowej po zapisie
      if (finalUpdatePayload.latitude !== roadsideSelectedCoords.latitude || finalUpdatePayload.longitude !== roadsideSelectedCoords.longitude) {
        setRoadsideSelectedCoords({ latitude: finalUpdatePayload.latitude, longitude: finalUpdatePayload.longitude });
      }


    } catch (error) {
      console.error('Błąd zapisu danych:', error.message);
      setMessage(`❌ Błąd zapisu danych: ${error.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    if (password !== confirm) {
      setPasswordMessage('❌ Hasła nie pasują do siebie.');
      return;
    }
    if (password.length < 6) {
      setPasswordMessage('❌ Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      setPasswordMessage('✅ Hasło zmienione pomyślnie!');
      setPassword('');
      setConfirm('');
    } catch (error) {
      console.error('Błąd zmiany hasła:', error.message);
      setPasswordMessage(`❌ Błąd zmiany hasła: ${error.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setPasswordMessage(''), 3000);
    }
  };

  const renderTab = () => {
    if (loading) {
      return <p>Ładowanie danych użytkownika...</p>;
    }
    if (!formData) {
      return <p className="dashboard-message error">Nie udało się załadować danych użytkownika. Spróbuj odświeżyć stronę.</p>;
    }

    switch (activeTab) {
      case 'Moje dane':
        return (
          <form onSubmit={handleSave} className="dashboard-form-section">
            <h3>Moje dane</h3>
            {message && <p className={`dashboard-message ${message.startsWith('✅') ? 'success' : 'error'}`}>{message}</p>}

            <label className="form-label">
              Imię i nazwisko:
              <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleChange} className="form-input" />
            </label>

            {formData.role === 'firma' && (
              <>
                <label className="form-label">
                  NIP:
                  <input type="text" name="nip" value={formData.nip || ''} onChange={handleChange} className="form-input" />
                </label>
                <label className="form-label">
                  Nazwa firmy:
                  <input type="text" name="company_name" value={formData.company_name || ''} onChange={handleChange} className="form-input" />
                </label>
                <label className="form-label">
                  Telefon:
                  <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} className="form-input" />
                </label>
                <label className="form-label">
                  <input
                    type="checkbox"
                    name="vat_payer"
                    checked={formData.vat_payer || false}
                    onChange={(e) => setFormData({ ...formData, vat_payer: e.target.checked })}
                  />{' '}
                  Płatnik VAT
                </label>
              </>
            )}

            <label className="form-label">
              Kraj:
              <input type="text" name="country" value={formData.country || ''} onChange={handleChange} className="form-input" />
            </label>
            {/* ZASTĄPIONE ZWYKŁY INPUT MIASTA PRZEZ LocationAutocomplete */}
            <label className="form-label">
              Miasto:
              <LocationAutocomplete
                value={myCityAutocompleteValue}
                onSelectLocation={(label, sug) => {
                  // KLUCZOWA ZMIANA: Zapisujemy tylko nazwę miasta (sug.text) do formData.city
                  setMyCityAutocompleteValue(label); // Ustaw wartość wyświetlaną w input
                  setFormData(prev => ({
                    ...prev,
                    city: sug.text || label, // Ustaw nazwę miasta z sugestii
                  }));
                  // Ustaw koordynaty dla miasta głównego profilu
                  if (sug.center && Array.isArray(sug.center) && sug.center.length >= 2) {
                    setMySelectedCityCoords({ latitude: sug.center[1], longitude: sug.center[0] });
                  } else {
                    setMySelectedCityCoords(null);
                  }
                }}
                placeholder="Wpisz miasto główne"
                className="form-input"
                searchType="city" // Szukaj tylko miast
              />
            </label>
            {/* Pole Kod pocztowy pozostało jako zwykły input, jeśli nie jest częścią autocomplete */}
            <label className="form-label">
              Kod pocztowy:
              <input type="text" name="postal_code" value={formData.postal_code || ''} onChange={handleChange} className="form-input" />
            </label>
            <label className="form-label">
              Ulica:
              <input type="text" name="street" value={formData.street || ''} onChange={handleChange} className="form-input" />
            </label>
            <label className="form-label">
              Numer budynku:
              <input type="text" name="building_number" value={formData.building_number || ''} onChange={handleChange} className="form-input" />
            </label>

            <button type="submit" disabled={saving} className="form-button">
              {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </form>
        );

      case 'Hasło':
        return (
          <form onSubmit={handlePasswordReset} className="dashboard-form-section">
            <h3>Zmiana hasła</h3>
            {passwordMessage && <p className={`dashboard-message ${passwordMessage.startsWith('✅') ? 'success' : 'error'}`}>{passwordMessage}</p>}
            <label className="form-label">
              Nowe hasło:
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="form-input" />
            </label>
            <label className="form-label">
              Potwierdź nowe hasło:
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="form-input" />
            </label>
            <button type="submit" disabled={saving} className="form-button">
              {saving ? 'Zmienianie...' : 'Zmień hasło'}
            </button>
          </form>
        );

      case 'Profil publiczny':
        const publicProfileFields = ['full_name', 'nip', 'company_name', 'phone', 'vat_payer', 'country', 'city', 'postal_code', 'street', 'building_number'];
        const isAnyPublicFieldFilled = formData && publicProfileFields.some(field => formData[field]);

        return (
          <div className="dashboard-form-section">
            <h3>Profil publiczny</h3>
            <p>Twój profil publiczny jest widoczny pod tym linkiem:</p>

            <label className="form-label">
                <input
                    type="checkbox"
                    checked={isPublicProfileAgreed}
                    onChange={(e) => setIsPublicProfileAgreed(e.target.checked)}
                    name="is_public_profile_agreed"
                />{' '}
                Wyrażam zgodę na udostępnianie moich danych (imię i nazwisko/nazwa firmy, NIP, numer telefonu, adres, dane floty, trasy, opis, zdjęcia) w publicznym profilu widocznym dla wszystkich użytkowników. Zapoznałem/am się z klauzulą informacyjną RODO.
            </label>

            {!isPublicProfileAgreed && (
                <p className="dashboard-message error" style={{marginTop: '10px'}}>
                    Aby Twój profil publiczny był widoczny, musisz wyrazić powyższą zgodę.
                </p>
            )}

            <button
                onClick={handleSave} 
                disabled={saving} 
                className="form-button"
                style={{ backgroundColor: '#28a745', marginTop: '20px' }}
            >
                {saving ? 'Zapisywanie...' : 'Zapisz ustawienia widoczności profilu'}
            </button>

            <button
                onClick={() => window.open(`/profil/${formData?.id}`, '_blank')}
                className="form-button"
                style={{ backgroundColor: '#007bff', marginTop: '10px' }} 
                disabled={!isPublicProfileAgreed} 
            >
                Przejdź do profilu publicznego
            </button>
          </div>
        );

      case 'Pomoc drogowa':
        return (
          <form onSubmit={handleSave} className="dashboard-form-section">
            <h3>Pomoc drogowa</h3>

            <label className="form-label">
                <input
                    type="checkbox"
                    name="is_pomoc_drogowa"
                    checked={formData.is_pomoc_drogowa || false}
                    onChange={(e) => setFormData({ ...formData, is_pomoc_drogowa: e.target.checked })}
                />{' '}
                Oświadczam, że prowadzę działalność gospodarczą w zakresie pomocy drogowej i posiadam wpisany kod PKD 52.21.A
            </label>

            <label className="form-label" style={{marginTop: '15px'}}>
                <input
                    type="checkbox"
                    checked={isRoadsideAssistanceAgreed}
                    onChange={(e) => setIsRoadsideAssistanceAgreed(e.target.checked)}
                    name="is_roadside_assistance_agreed"
                />{' '}
                Wyrażam zgodę na udostępnianie moich danych (nazwa, miasto, ulica, numer, telefon, opis) dla profilu pomocy drogowej widocznego publicznie. Zapoznałem/am się z klauzulą informacyjną RODO.
            </label>

            {(!formData.is_pomoc_drogowa || !isRoadsideAssistanceAgreed) && (
                <p className="dashboard-message error" style={{marginTop: '10px'}}>
                    Aby uzupełnić i udostępnić dane pomocy drogowej, musisz zaznaczyć powyższe oświadczenia.
                </p>
            )}

            <button
                onClick={handleSave} 
                disabled={saving}
                className="form-button"
                style={{ backgroundColor: '#28a745', marginTop: '20px' }}
            >
                {saving ? 'Zapisywanie...' : 'Zapisz ustawienia zgód pomocy drogowej'}
            </button>

            {(formData.is_pomoc_drogowa && isRoadsideAssistanceAgreed) && ( 
              <>
                <label className="form-label">
                  Nazwa przyjazna (widoczna publicznie):
                  <input type="text" name="roadside_slug" value={formData.roadside_slug || ''} onChange={handleChange} className="form-input" />
                </label>
                
                <label className="form-label">
                  Miasto:
                  <LocationAutocomplete
                    value={roadsideCityAutocompleteValue}
                    onSelectLocation={(label, sug) => {
                      // KLUCZOWA ZMIANA: Zapisujemy tylko nazwę miasta (sug.text) do formData.roadside_city
                      const cityText = sug.text || '';
                      setFormData(prev => ({ 
                        ...prev, 
                        roadside_city: cityText, 
                        roadside_street: '', // Wyczyść ulicę, bo wybrano nowe miasto
                        roadside_number: '' // Wyczyść numer
                      }));
                      setRoadsideCityAutocompleteValue(label); // Aktualizuj wartość wyświetlaną w input
                      setRoadsideStreetAutocompleteValue(''); // Wyczyść input dla ulicy
                      if (sug.center && Array.isArray(sug.center) && sug.center.length >= 2) {
                          setRoadsideSelectedCoords({ latitude: sug.center[1], longitude: sug.center[0] });
                      } else {
                          console.warn("Brak koordynatów (sug.center) dla wybranej sugestii miasta:", sug);
                          setRoadsideSelectedCoords({ latitude: null, longitude: null });
                      }
                    }}
                    placeholder="Wpisz miasto działalności"
                    className="form-input"
                    searchType="city" 
                  />
                </label>

                <label className="form-label">
                  Ulica:
                  <LocationAutocomplete
                    value={roadsideStreetAutocompleteValue}
                    onSelectLocation={(label, sug) => {
                      const streetName = sug.text || '';
                      const houseNumber = sug.address || ''; 

                      setFormData(prev => ({ 
                        ...prev, 
                        roadside_street: streetName, 
                        roadside_number: houseNumber 
                      }));
                      setRoadsideStreetAutocompleteValue(label); 
                      
                      if (sug.center && Array.isArray(sug.center) && sug.center.length >= 2) {
                          setRoadsideSelectedCoords({ latitude: sug.center[1], longitude: sug.center[0] });
                      } else {
                          console.warn("Brak koordynatów (sug.center) dla wybranej sugestii ulicy:", sug);
                          setRoadsideSelectedCoords({ latitude: null, longitude: null });
                      }
                    }}
                    placeholder="Wpisz ulicę"
                    className="form-input"
                    searchType="street"
                    // KLUCZOWA ZMIANA: contextCity dla wyszukiwania ulicy to teraz tylko NAZWA MIASTA
                    contextCity={roadsideCityAutocompleteValue.split(',')[0].trim() || ''} 
                  />
                </label>
                
                <label className="form-label">
                  Numer budynku (jeśli nie został automatycznie wypełniony):
                  <input type="text" name="roadside_number" value={formData.roadside_number || ''} onChange={handleChange} className="form-input" />
                </label>

                <label className="form-label">
                  Numer telefonu:
                  <input type="text" name="roadside_phone" value={formData.roadside_phone || ''} onChange={handleChange} className="form-input" />
                </label>
                <label className="form-label">
                  Opis usługi pomocy drogowej (max 500 znaków):
                  <textarea
                    name="roadside_description"
                    value={formData.roadside_description || ''}
                    onChange={handleChange}
                    maxLength={500}
                    className="form-input resize-y min-h-[100px]"
                    placeholder="Opisz swoje usługi pomocy drogowej, specjalizacje, dostępność 24/7 itp."
                  ></textarea>
                </label>

                <button type="submit" disabled={saving} className="form-button" style={{marginTop: '20px'}}>
                  {saving ? 'Zapisywanie...' : 'Zapisz dane pomocy drogowej'}
                </button>

                <div className="dashboard-form-section" style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                  <button
                    onClick={() => window.open(`/pomoc-drogowa/${formData.roadside_slug}`, '_blank')}
                    className="form-button"
                    style={{ backgroundColor: '#007bff' }}
                  >
                    Przejdź do profilu pomocy drogowej
                  </button>
                </div>
              </>
            )}
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Navbar />
      <div className="user-dashboard-container">
        {/* Renderuj zakładki tylko, jeśli formData jest dostępne */}
        {formData ? (
          <div className="dashboard-tabs-wrapper">
            {getTabs().map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`dashboard-tab-button ${activeTab === tab ? 'active' : ''}`}
              >
                {tab}
              </button>
            ))}
            {/* Przycisk "Moje trasy" */}
            <button
              key="moje-trasy-button"
              onClick={() => {
                setActiveTab('Moje trasy');
                window.location.href = '/moje-trasy';
              }}
              className={`dashboard-tab-button ${activeTab === 'Moje trasy' ? 'active' : ''}`}
            >
              Moje trasy
            </button>
          </div>
        ) : (
          // Renderuj nic lub spinner ładowania dla sekcji zakładek, jeśli formData jest nullem
          null 
        )}
        <div>{renderTab()}</div>
      </div>
    </>
  );
}