// src/UserProfileDashboard.jsx

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import './UserProfileDashboard.css';
// import MyRoutes from './MyRoutes'; // <-- USUWAMY TEN IMPORT, BO NIE BĘDZIEMY RENDEROWAĆ KOMPONENTU BEZPOŚREDNIO TUTAJ

export default function UserProfileDashboard() {
  const [activeTab, setActiveTab] = useState('Moje dane');
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordMessage, setPasswordMessage] = '';

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

    const baseTabs = ['Moje dane', 'Hasło']; // <-- ZMIANA: "Moje trasy" usunięte stąd, będzie jako link
    
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

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
      setUserData(formData);
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

      // --- USUWAMY CAŁY TEN CASE, BO NIE BĘDZIEMY TEGO RENDEROWAĆ TUTAJ ---
      // case 'Moje trasy':
      //   return (
      //     <div className="dashboard-form-section">
      //       <h3>Moje trasy</h3>
      //       <p>Tutaj znajdziesz wszystkie dodane przez Ciebie trasy.</p>
      //       <MyRoutes />
      //       <button
      //         onClick={() => window.location.href = '/oferuje-transport'}
      //         className="form-button"
      //         style={{ backgroundColor: '#007bff', marginTop: '20px' }}
      //       >
      //         ➕ Dodaj nową trasę
      //       </button>
      //     </div>
      //   );
      // --- KONIEC USUNIĘTEGO CASE'A ---

      case 'Profil publiczny':
        return (
          <div className="dashboard-form-section">
            <h3>Profil publiczny</h3>
            <p>Twój profil publiczny jest widoczny pod tym linkiem:</p>
            <button
              onClick={() => window.open(`/profil/${formData.id}`, '_blank')}
              className="form-button"
              style={{ backgroundColor: '#007bff' }}
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
		<label className="form-label">
            Opis usługi pomocy drogowej (max 500 znaków):
            <textarea
              name="roadside_description"
              value={formData.roadside_description || ''}
              onChange={handleChange}
              maxLength={500} // Ograniczenie do 500 znaków
              className="form-input resize-y min-h-[100px]" // Dodaj resize-y dla pionowej zmiany rozmiaru i min-h
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
            {/* DODANO: Przycisk/link "Moje trasy" niezależny od aktywnej zakładki, który przekierowuje */}
            {/* Renderuj tylko jeśli użytkownik jest zalogowany (lub formData istnieje) i jest to rola "firma" */}
            {/* Poprawka: Moje Trasy ma być dla każdego, więc warunek 'firma' nie jest potrzebny tutaj */}
            {formData && ( // Sprawdź, czy formData istnieje, aby pokazać przycisk po załadowaniu danych
  <button // <--- ZMIANA: ZASTĄP <a> NA <button>
    key="moje-trasy-button" // Dodaj unikalny klucz dla elementu mapowanego (jeśli nie jest w mapie, to unikalny string)
    onClick={() => {
      setActiveTab('Moje trasy'); // Podświetlenie zakładki
      // Przekierowanie do nowej strony. Użycie window.location.href jest proste
      window.location.href = '/moje-trasy'; 
    }}
    className={`dashboard-tab-button ${activeTab === 'Moje trasy' ? 'active' : ''}`}
    // style={{ marginLeft: '10px' }} // <--- USUŃ TEN INLINE'OWY STYL (BĘDZIEMY TO ROBIĆ PRZEZ CSS)
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
