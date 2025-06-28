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
    if (loading) { /* ... bez zmian ... */ }
    if (!formData) { /* ... bez zmian ... */ }

    switch (activeTab) {
      case 'Moje dane':
        return (
          <form onSubmit={handleSave} className="dashboard-form-section">
            {/* ... istniejące pola 'Moje dane' ... */}
            <button type="submit" disabled={saving} className="form-button">
              {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </form>
        );

      case 'Hasło':
        return (
          <form onSubmit={handlePasswordReset} className="dashboard-form-section">
            {/* ... istniejące pola 'Hasło' ... */}
            <button type="submit" disabled={saving} className="form-button">
              {saving ? 'Zmienianie...' : 'Zmień hasło'}
            </button>
          </form>
        );

      case 'Profil publiczny':
        // Pobierz wszystkie pola związane z profilem publicznym (z "Moje dane")
        const publicProfileFields = ['full_name', 'nip', 'company_name', 'phone', 'vat_payer', 'country', 'city', 'postal_code', 'street', 'building_number'];
        const isAnyPublicFieldFilled = publicProfileFields.some(field => formData[field]);

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
                onClick={() => window.open(`/profil/${formData.id}`, '_blank')}
                className="form-button"
                style={{ backgroundColor: '#007bff', marginTop: '20px' }}
                disabled={!isPublicProfileAgreed && !isAnyPublicFieldFilled} // Wyłączony, jeśli zgoda nie jest zaznaczona i brak wypełnionych danych publicznych
            >
                Przejdź do profilu publicznego
            </button>

            {/* Ważne: Pola do edycji publicznego profilu (np. opis, flota, trasy, zdjęcia)
                są edytowane w komponencie PublicProfile.jsx.
                Tutaj jedynie kontrolujemy zgodę na widoczność.
                Jeśli chcesz, aby niektóre podstawowe pola były tutaj edytowalne i zależne od zgody,
                musisz je dodać do tego formularza i ustawić disabled.
                Obecnie, główna edycja profilu publicznego odbywa się na stronie /profil/:id
            */}
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

            {formData.is_pomoc_drogowa && isRoadsideAssistanceAgreed && ( // Warunek: oba checkboxy zaznaczone
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