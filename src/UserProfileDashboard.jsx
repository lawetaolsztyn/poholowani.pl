// src/UserProfileDashboard.jsx

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import './UserProfileDashboard.css'; // <-- WAŻNE: Upewnij się, że ten import jest

export default function UserProfileDashboard() {
  const [activeTab, setActiveTab] = useState('Moje dane');
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

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
        } else {
          console.error("Błąd ładowania danych użytkownika:", error.message);
          setMessage("Błąd ładowania danych użytkownika.");
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const getTabs = () => {
    if (!formData) return [];

    const baseTabs = ['Moje dane', 'Hasło'];
    // Zmieniono 'driver' na 'company' zgodnie z Twoim kodem
    if (formData.role === 'firma') {
      baseTabs.push('Profil publiczny');
      baseTabs.push('Pomoc drogowa');
    }
    return baseTabs;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async (e) => { // Zmieniono na handler onSubmit dla form
    e.preventDefault(); // Zapobiega domyślnemu przeładowaniu strony
    setSaving(true);
    setMessage('');

    // Logika geokodowania dla pomocy drogowej
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

      const { error } = await supabase
        .from('users_extended')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;

      setMessage('✅ Dane zapisane pomyślnie!');
      setUserData(formData); // Aktualizuj userData po zapisie
    } catch (error) {
      console.error('Błąd zapisu danych:', error.message);
      setMessage(`❌ Błąd zapisu danych: ${error.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000); // Usuń wiadomość po 3 sekundach
    }
  };

  const handlePasswordReset = async (e) => { // Zmieniono na handler onSubmit dla form
    e.preventDefault(); // Zapobiega domyślnemu przeładowaniu strony
    setPasswordMessage('');
    if (password !== confirm) {
      setPasswordMessage('❌ Hasła nie pasują do siebie.');
      return;
    }
    if (password.length < 6) { // Dodano walidację długości hasła
      setPasswordMessage('❌ Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    setSaving(true); // Użyj saving state również dla hasła
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
      setTimeout(() => setPasswordMessage(''), 3000); // Usuń wiadomość po 3 sekundach
    }
  };

  const renderTab = () => {
    if (loading) {
      return <p>Ładowanie danych użytkownika...</p>;
    }
    if (!formData) {
      return <p className="dashboard-message error">Nie udało się załadować danych użytkownika.</p>; // Dodano klasę
    }

    switch (activeTab) {
      case 'Moje dane':
        return (
          <form onSubmit={handleSave} className="dashboard-form-section"> {/* Użyto form tagu i onSubmit */}
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
          <form onSubmit={handlePasswordReset} className="dashboard-form-section"> {/* Użyto form tagu i onSubmit */}
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
        return (
          <div className="dashboard-form-section"> {/* Użyto klasy dla sekcji */}
            <h3>Profil publiczny</h3>
            <p>Twój profil publiczny jest widoczny pod tym linkiem:</p>
            <button
              onClick={() => window.open(`/profil/${formData.id}`, '_blank')}
              className="form-button" // Użyto klasy
              style={{ backgroundColor: '#007bff' }} // Drobna korekta koloru dla przycisku, jeśli potrzebujesz innego niż domyślny zielony
            >
              Przejdź do profilu publicznego
            </button>
          </div>
        );

      case 'Pomoc drogowa':
        return (
          <form onSubmit={handleSave} className="dashboard-form-section"> {/* Użyto form tagu i onSubmit */}
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

            {!formData.is_pomoc_drogowa && (
              <p className="dashboard-message error">
                Aby uzupełnić dane pomocy drogowej, zaznacz powyższe oświadczenie.
              </p>
            )}

            {formData.is_pomoc_drogowa && (
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

                <button type="submit" disabled={saving} className="form-button">
                  {saving ? 'Zapisywanie...' : 'Zapisz dane pomocy drogowej'}
                </button>

                <div className="dashboard-form-section" style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}> {/* Dodatkowy styl dla separacji */}
                  <button
                    onClick={() => window.open(`/pomoc-drogowa/${formData.roadside_slug}`, '_blank')}
                    className="form-button"
                    style={{ backgroundColor: '#007bff' }} // Możesz tu dać inny kolor, np. zielony, jeśli chcesz
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
      <div className="user-dashboard-container"> {/* Użyto klasy */}
        {formData && (
          <div className="dashboard-tabs-wrapper"> {/* Użyto klasy */}
            {getTabs().map(tab => (
              <button
  key={tab}
  onClick={() => setActiveTab(tab)}
  className={`dashboard-tab-button ${activeTab === tab ? 'active' : ''}`}
>
  {tab}
</button>
            ))}
          </div>
        )}
        <div>{renderTab()}</div>
      </div>
    </>
  );
}