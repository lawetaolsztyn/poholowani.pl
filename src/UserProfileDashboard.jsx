// src/UserProfileDashboard.jsx

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import './UserProfileDashboard.css';
import LocationAutocomplete from './components/LocationAutocomplete';

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
  
  // NOWE STANY DLA ZGÓD
  const [isPublicProfileAgreed, setIsPublicProfileAgreed] = useState(false);
  const [isRoadsideAssistanceAgreed, setIsRoadsideAssistanceAgreed] = useState(false);

  // NOWE STANY DLA AUTO-UZUPEŁNIANIA ADRESÓW POMOCY DROGOWEJ
  const [roadsideCityAutocompleteValue, setRoadsideCityAutocompleteValue] = useState('');
  const [roadsideStreetAutocompleteValue, setRoadsideStreetAutocompleteValue] = useState('');
  const [roadsideSelectedCoords, setRoadsideSelectedCoords] = useState({ latitude: null, longitude: null }); // Koordynaty z autocomplete

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Brak zalogowanego użytkownika, wyczyść dane i zakończ ładowanie
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
          
          // KLUCZOWA ZMIANA W useEffect: Inicjalizacja formData i stanów autouzupełniania
          // Zapewnienie, że wszystkie pola są stringami, jeśli są null/undefined
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
          };
          setFormData(initialFormData); 

          // Ustaw wartości początkowe dla komponentów LocationAutocomplete
          setRoadsideCityAutocompleteValue(initialFormData.roadside_city);
          // Dla ulicy, jeśli masz numer, połącz go z nazwą ulicy, aby autocomplete mógł to rozpoznać
          const fullRoadsideStreetValue = initialFormData.roadside_street + (initialFormData.roadside_number ? ' ' + initialFormData.roadside_number : '');
          setRoadsideStreetAutocompleteValue(fullRoadsideStreetValue.trim());
          
          // Ustawienie koordynatów, jeśli już istnieją
          if (initialFormData.latitude != null && initialFormData.longitude != null) {
            setRoadsideSelectedCoords({ latitude: initialFormData.latitude, longitude: initialFormData.longitude });
          } else {
            setRoadsideSelectedCoords({ latitude: null, longitude: null });
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
    // Zapobiegamy domyślnemu zachowaniu formularza, jeśli handleSave jest wywoływane przez 'submit'
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

    // Logika geokodowania: preferujemy koordynaty z LocationAutocomplete
    if (activeTab === 'Pomoc drogowa' && updatedFormData.is_pomoc_drogowa && isRoadsideAssistanceAgreed) {
        if (roadsideSelectedCoords.latitude != null && roadsideSelectedCoords.longitude != null) {
            // Jeśli koordynaty zostały wybrane z autocomplete, używamy ich bezpośrednio
            updatedFormData = { 
                ...updatedFormData, 
                latitude: roadsideSelectedCoords.latitude, 
                longitude: roadsideSelectedCoords.longitude 
            };
            console.log('DEBUG: Użyto koordynatów z LocationAutocomplete:', roadsideSelectedCoords);
        } else {
            // Jeśli koordynaty z autocomplete nie są dostępne (np. użytkownik wpisał ręcznie i nie wybrał sugestii)
            // Spróbuj geokodować adres ręcznie wpisany.
            // Ważne: budujemy adres z wartości z inputów LocationAutocomplete i standardowego inputa numeru budynku.
            const fullAddressToGeocode = `${roadsideStreetAutocompleteValue || ''} ${updatedFormData.roadside_number || ''}, ${roadsideCityAutocompleteValue || ''}, Polska`;
            
            console.log('DEBUG: Adres do geokodowania (ręczny/fallback):', fullAddressToGeocode);

            // Dodatkowe sprawdzenie, czy adres nie jest pusty/niekompletny przed wysłaniem do Mapbox
            if (fullAddressToGeocode.trim() === ',' || fullAddressToGeocode.trim() === ', Polska' || fullAddressToGeocode.trim().length < 5) {
                console.warn('Ostrzeżenie: Adres pomocy drogowej jest pusty lub niekompletny. Pomijam geokodowanie.');
                setMessage("Ostrzeżenie: Wprowadź pełny adres pomocy drogowej.");
                updatedFormData = { ...updatedFormData, longitude: null, latitude: null }; // Resetuj koordynaty, jeśli adres jest zły
            } else {
                try {
                    // Używamy VITE_MAPBOX_API_KEY, aby pasowało do istniejącego kodu.
                    // Jeśli w LocationAutocomplete używasz VITE_MAPBOX_TOKEN, upewnij się, że oba są ustawione.
                    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddressToGeocode)}.json?access_token=${import.meta.env.VITE_MAPBOX_API_KEY}`);
                    const json = await response.json();
                    const coords = json?.features?.[0]?.center;
                    if (coords) {
                        updatedFormData = { ...updatedFormData, longitude: coords[0], latitude: coords[1] };
                        console.log('DEBUG: Geokodowanie ręcznego adresu sukces:', coords);
                    } else {
                        console.warn('Geokodowanie nie zwróciło koordynatów dla adresu:', fullAddressToGeocode);
                        setMessage("Ostrzeżenie: Nie udało się uzyskać koordynatów dla adresu pomocy drogowej.");
                        updatedFormData = { ...updatedFormData, longitude: null, latitude: null }; // Resetuj koordynaty
                    }
                } catch (err) {
                    console.error('Błąd geokodowania:', err.message);
                    setMessage(`❌ Błąd geokodowania: ${err.message}`);
                    setSaving(false);
                    setTimeout(() => setMessage(''), 3000);
                    return; // Zatrzymaj zapis, jeśli geokodowanie się nie powiedzie
                }
            }
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
      // Po zapisie, jeśli koordynaty zostały zmienione, zaktualizuj też roadsideSelectedCoords
      // To jest ważne, aby stan autouzupełniania odzwierciedlał zapisane koordynaty
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

            {/* Warunkowo renderuj pola na podstawie roli, bezpieczny dostęp do formData.role */}
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
            <label className="form-label">
              Miasto:
              <input type="text" name="city" value={formData.city || ''} onChange={handleChange} className="form-input" />
            </label>
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
                
                {/* ZASTĄPIONE STANDARDOWE INPUTY KOMPONENTAMI LocationAutocomplete */}
                <label className="form-label">
                  Miasto:
                  <LocationAutocomplete
                    value={roadsideCityAutocompleteValue}
                    onSelectLocation={(label, sug) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        roadside_city: sug.text || '', // sug.text to nazwa miasta z Mapbox
                        roadside_street: '', // Wyczyść ulicę, bo wybrano nowe miasto
                        roadside_number: '' // Wyczyść numer
                      }));
                      setRoadsideCityAutocompleteValue(label); // Aktualizuj wartość wyświetlaną w input
                      setRoadsideStreetAutocompleteValue(''); // Wyczyść input dla ulicy
                      // Ustaw koordynaty z wybranej sugestii miasta
                      if (sug.center && Array.isArray(sug.center) && sug.center.length >= 2) {
                          setRoadsideSelectedCoords({ latitude: sug.center[1], longitude: sug.center[0] });
                      } else {
                          console.warn("Brak koordynatów (sug.center) dla wybranej sugestii miasta:", sug);
                          setRoadsideSelectedCoords({ latitude: null, longitude: null });
                      }
                    }}
                    placeholder="Wpisz miasto działalności"
                    className="form-input"
                    searchType="city" // Dodano searchType: 'city'
                  />
                </label>

                <label className="form-label">
                  Ulica i Numer: {/* Zmieniono etykietę dla ułatwienia */}
                  <LocationAutocomplete
                    value={roadsideStreetAutocompleteValue}
                    onSelectLocation={(label, sug) => {
                      // Mapbox dla typu 'street' lub 'address' może zwracać:
                      // sug.text: nazwa ulicy (np. "Grunwaldzka")
                      // sug.place_name: pełniejszy opis (np. "Grunwaldzka, Olsztyn")
                      // sug.address: numer budynku (np. "12")
                      const streetName = sug.text || '';
                      const houseNumber = sug.address || ''; 

                      setFormData(prev => ({ 
                        ...prev, 
                        roadside_street: streetName, 
                        roadside_number: houseNumber // Numer z sugestii
                      }));
                      setRoadsideStreetAutocompleteValue(label); // Ustaw to, co wyświetla input (pełny adres sugerowany)
                      
                      // Ustaw precyzyjne koordynaty wybranego adresu (ulicy z numerem)
                      if (sug.center && Array.isArray(sug.center) && sug.center.length >= 2) {
                          setRoadsideSelectedCoords({ latitude: sug.center[1], longitude: sug.center[0] });
                      } else {
                          console.warn("Brak koordynatów (sug.center) dla wybranej sugestii ulicy:", sug);
                          setRoadsideSelectedCoords({ latitude: null, longitude: null });
                      }
                    }}
                    placeholder="Wpisz ulicę i numer"
                    className="form-input"
                    searchType="street" // Dodano searchType: 'street'
proximityCoords={
    roadsideSelectedCoords.latitude != null && roadsideSelectedCoords.longitude != null
      ? { latitude: roadsideSelectedCoords.latitude, longitude: roadsideSelectedCoords.longitude }
      : null
  }
                  />
                </label>
                
                {/* Pole numeru budynku jest teraz tylko do ew. uzupełnienia, jeśli LocationAutocomplete nie zwróciło numeru.
                    Możesz to pole ukryć, jeśli uznasz, że LocationAutocomplete zawsze zwraca numer. */}
                <label className="form-label">
                  Tylko numer budynku (jeśli nie został wypełniony wyżej):
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

                {/* Istniejący przycisk zapisu dla danych formularza pomocy drogowej (z 'type="submit"') */}
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