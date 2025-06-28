// src/UserProfileDashboard.jsx

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import './UserProfileDashboard.css';

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
          // Upewnij się, że 'data' nie jest nullem przed ustawieniem stanów
          const fetchedData = data || {}; // Użyj pustego obiektu, jeśli 'data' jest nullem, aby zapobiec błędom

          setUserData(fetchedData);
          setFormData(fetchedData);
          // Ustaw stany zgód na podstawie pobranych danych, domyślnie na false
          setIsPublicProfileAgreed(fetchedData.is_public_profile_agreed || false);
          setIsRoadsideAssistanceAgreed(fetchedData.is_roadside_assistance_agreed || false);
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
  }, []); // Pusta tablica zależności oznacza, że uruchamia się raz po zamontowaniu komponentu

  // Memoizuj getTabs, aby zapewnić stabilność i ponowne obliczenia tylko po zmianie formData
  const getTabs = () => {
    if (!formData) {
      // console.log("DEBUG: getTabs - formData is null/undefined, returning empty array for tabs.");
      return [];
    }

    let baseTabs = ['Moje dane', 'Hasło'];
    
    // Sprawdź formData.role bezpiecznie
    if (formData.role === 'firma') {
      baseTabs.push('Profil publiczny');
      baseTabs.push('Pomoc drogowa');
    }
    // console.log("DEBUG: getTabs - Returning baseTabs:", baseTabs);
    return baseTabs;
  };

  const handleChange = (e) => {
    // Upewnij się, że formData istnieje przed aktualizacją
    if (formData) {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    if (!formData) {
        setMessage("Błąd: Brak danych do zapisu.");
        setSaving(false);
        return;
    }

    let updatedFormData = { ...formData }; // Utwórz zmienną kopię do aktualizacji

    // Logika geokodowania dla pomocy drogowej
    if (updatedFormData.is_pomoc_drogowa) {
      const address = `${updatedFormData.roadside_street || ''} ${updatedFormData.roadside_number || ''}, ${updatedFormData.roadside_city || ''}`;
      try {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${import.meta.env.VITE_MAPBOX_API_KEY}`);
        const json = await response.json();
        const coords = json?.features?.[0]?.center;
        if (coords) {
          updatedFormData = { ...updatedFormData, longitude: coords[0], latitude: coords[1] };
        } else {
            console.warn("Geokodowanie nie zwróciło koordynatów dla adresu:", address);
            setMessage("Ostrzeżenie: Nie udało się uzyskać koordynatów dla adresu pomocy drogowej.");
        }
      } catch (err) {
        console.error('Błąd geokodowania:', err.message);
        setMessage(`❌ Błąd geokodowania: ${err.message}`);
        setSaving(false);
        setTimeout(() => setMessage(''), 3000);
        return; // Zatrzymaj zapis, jeśli geokodowanie się nie powiedzie
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Użytkownik niezalogowany.");

      // Dodaj stany zgód do payloadu
      const finalUpdatePayload = {
        ...updatedFormData, // Użyj updatedFormData, które może zawierać współrzędne geograficzne
        is_public_profile_agreed: isPublicProfileAgreed,
        is_roadside_assistance_agreed: isRoadsideAssistanceAgreed,
      };

      const { error } = await supabase
        .from('users_extended')
        .update(finalUpdatePayload)
        .eq('id', user.id);

      if (error) throw error;

      setMessage('✅ Dane zapisane pomyślnie!');
      // Zaktualizuj stan formData komponentu o pomyślne zmiany, w tym współrzędne geograficzne
      setFormData(finalUpdatePayload); 
      setUserData(finalUpdatePayload); // Zaktualizuj również userData, jeśli jest używane gdzie indziej do wyświetlania
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
    // Kluczowe sprawdzenie: jeśli formData jest nullem po załadowaniu, pokaż błąd.
    // To powinno zapobiec dalszemu dostępowi do właściwości formData.
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
        // Upewnij się, że formData istnieje przed dostępem do jego właściwości w .some()
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
                    Aby Twój profil publiczny był widoczny i edytowalny, musisz wyrazić powyższą zgodę.
                </p>
            )}

            <button
                onClick={() => window.open(`/profil/${formData?.id}`, '_blank')} // Użyj opcjonalnego łańcuchowania dla formData.id
                className="form-button"
                style={{ backgroundColor: '#007bff', marginTop: '20px' }}
                // Przycisk jest wyłączony, jeśli zgoda NIE jest udzielona I żadne pola publiczne nie są wypełnione.
                // Jeśli zgoda NIE jest udzielona, ale pola publiczne SĄ wypełnione (np. dane starsze), przycisk powinien być nadal aktywny do przeglądania.
                // Uproszczony warunek: przycisk jest włączony, jeśli zgoda jest udzielona, LUB jeśli istniejące dane publiczne.
                disabled={!isPublicProfileAgreed && !isAnyPublicFieldFilled} 
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

            {/* Pola są renderowane tylko, jeśli oba checkboxy są zaznaczone */}
            {(formData.is_pomoc_drogowa && isRoadsideAssistanceAgreed) && (
              <>
                <label className="form-label">
                  Nazwa przyjazna (widoczna publicznie):
                  <input type="text" name="roadside_slug" value={formData.roadside_slug || ''} onChange={handleChange} className="form-input" />
                </label>
                <label className="form-label">
                  Miasto:
                  <input type="text" name="roadside_city" value={formData.roadside_city || ''} onChange={handleChange} className="form-input" />
                </label>
                <label className="form-label">
                  Ulica:
                  <input type="text" name="roadside_street" value={formData.roadside_street || ''} onChange={handleChange} className="form-input" />
                </label>
                <label className="form-label">
                  Numer:
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

                <button type="submit" disabled={saving} className="form-button">
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