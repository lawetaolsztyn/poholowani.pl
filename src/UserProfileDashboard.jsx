import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import './UserProfileDashboard.css';

export default function UserProfileDashboard() {
  const [activeTab, setActiveTab] = useState('Moje dane');
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordMessage, setPasswordMessage] = useState(''); // Zmieniono na useState
  
  // NOWE STANY DLA ZGÓD
  const [isPublicProfileAgreed, setIsPublicProfileAgreed] = useState(false);
  const [isRoadsideAssistanceAgreed, setIsRoadsideAssistanceAgreed] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error) {
          setUserData(data);
          setFormData(data);
          // Ustawienie stanów zgód na podstawie danych z bazy
          setIsPublicProfileAgreed(data.is_public_profile_agreed || false);
          setIsRoadsideAssistanceAgreed(data.is_roadside_assistance_agreed || false);
        } else {
          console.error("Błąd ładowania danych użytkownika:", error.message);
          setMessage("Błąd ładowania danych użytkownika.");
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const getTabs = () => { /* ... bez zmian ... */ };
  const handleChange = (e) => { /* ... bez zmian ... */ };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    // Obsługa geokodowania dla pomocy drogowej (już istnieje)
    if (formData.is_pomoc_drogowa) {
      const address = `${formData.roadside_street} ${formData.roadside_number}, ${formData.roadside_city}`;
      try {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${import.meta.env.VITE_MAPBOX_API_KEY}`);
        const json = await response.json();
        const coords = json?.features?.[0]?.center;
        if (coords) {
          setFormData(prev => ({ ...prev, longitude: coords[0], latitude: coords[1] }));
        }
      } catch (err) {
        console.error('Błąd geokodowania:', err);
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Użytkownik niezalogowany.");

      // NOWA ZMIANA: Dodaj stany zgód do aktualizowanych danych
      const updatePayload = {
        ...formData,
        is_public_profile_agreed: isPublicProfileAgreed,
        is_roadside_assistance_agreed: isRoadsideAssistanceAgreed,
      };

      const { error } = await supabase
        .from('users_extended')
        .update(updatePayload) // Użyj updatePayload
        .eq('id', user.id);

      if (error) throw error;

      setMessage('✅ Dane zapisane pomyślnie!');
      setUserData(formData); // Możesz zaktualizować userData o formData i nowe stany zgód
    } catch (error) {
      console.error('Błąd zapisu danych:', error.message);
      setMessage(`❌ Błąd zapisu danych: ${error.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handlePasswordReset = async (e) => { /* ... bez zmian ... */ };

  const renderTab = () => {
    if (loading) {
      return <p>Ładowanie danych użytkownika...</p>;
    }
    // Ten warunek jest kluczowy, aby zapobiec dostępowi do formData, gdy jest null
    if (!formData) {
      return <p className="dashboard-message error">Nie udało się załadować danych użytkownika.</p>;
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

            {/* Upewnij się, że formData.role jest bezpiecznie dostępne */}
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
        // ... (bez zmian)
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
                    Aby Twój profil publiczny był widoczny i edytowalny, musisz wyrazić powyższą zgodę.
                </p>
            )}

            <button
                onClick={() => window.open(`/profil/${formData?.id}`, '_blank')}
                className="form-button"
                style={{ backgroundColor: '#007bff', marginTop: '20px' }}
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

            {/* Zabezpieczenie przed próbą dostępu do niezdefiniowanych pól formData */}
            {formData.is_pomoc_drogowa && isRoadsideAssistanceAgreed && (
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
        {/* Ten warunek obejmuje cały kontener zakładek */}
        {formData && (
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
            {/* Zabezpieczenie na formData również dla przycisku "Moje trasy" */}
            {formData && (
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
            )}
          </div>
        )}
        <div>{renderTab()}</div>
      </div>
    </>
  );
}