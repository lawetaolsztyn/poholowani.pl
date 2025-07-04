// src/AddRouteForm.jsx (CAŁY PLIK)

import { useState, useEffect } from 'react';
import LocationAutocomplete from './components/LocationAutocomplete';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './AddRouteForm.css';
import 'leaflet-gesture-handling/dist/leaflet-gesture-handling.css';
import 'leaflet-gesture-handling';
import RouteMap from './RouteMap';

const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res;
    } catch (err) {
      console.warn(`⚠️ Próba ${i + 1} nie powiodła się:`, err.message);
      if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('❌ fetchWithRetry: wszystkie próby nie powiodły się');
};

function AddRouteForm({ onRouteCreated }) {
  const [form, setForm] = useState({
    from: { label: '', coords: null },
    to: { label: '', coords: null },
    via: { label: '', coords: null },
    date: '',
    vehicleType: 'bus',
    loadCapacity: '',
    maxDetour: '50',
    passengerCount: '',
    phone: '', // Będzie podstawiane z profilu
    // countryCode: '+48', // USUNIĘTO: Ten stan nie jest już potrzebny
    messenger: '', // Będzie podstawiane z profilu (profile_messenger_link)
    usesWhatsapp: false, // Będzie podstawiane z profilu (profile_uses_whatsapp)
    consentPhoneShare: false, // Będzie podstawiane z profilu (profile_consent_phone_share)
  });

  const [routeData, setRouteData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // NOWY useEffect do pobierania danych profilu użytkownika i autopodstawiania
  useEffect(() => {
    const fetchUserProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('users_extended')
          .select('phone, profile_uses_whatsapp, profile_messenger_link, profile_consent_phone_share') // Pobieramy odpowiednie kolumny
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Błąd pobierania danych profilu dla formularza trasy:', error.message);
        } else if (profile) {
          // Autopodstawianie danych z profilu do stanów formularza
          setForm(prevForm => ({
            ...prevForm,
            phone: profile.phone || '', // Używamy 'phone'
            usesWhatsapp: profile.profile_uses_whatsapp || false,
            messenger: profile.profile_messenger_link || '',
            consentPhoneShare: profile.profile_consent_phone_share || false,
          }));
        }
      }
    };

    fetchUserProfileData();
  }, []);


  useEffect(() => {
    let token = localStorage.getItem('browser_token');
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem('browser_token', token);
    }

    const loadMyRoutes = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('browser_token', token)
        .gte('date', today)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Błąd ładowania tras:', error);
        return;
      }
      if (data && data.length > 0) {
        setRouteData(data[0].geojson);
      }
    };

    loadMyRoutes();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prevForm => {
        const newState = {
            ...prevForm,
            [name]: type === 'checkbox' ? checked : value
        };

        // Jeśli odznaczono zgodę, wyczyść numer telefonu i WhatsApp
        if (name === 'consentPhoneShare' && !checked) {
            newState.phone = '';
            newState.usesWhatsapp = false; // Wyłącz WhatsApp, jeśli zgoda na telefon jest cofnięta
        }
        return newState;
    });
  };

  const handleFromSelect = (label, sug) => {
    setForm(prevForm => ({
      ...prevForm,
      from: { label: label, coords: sug.geometry.coordinates }
    }));
  };

  const handleToSelect = (label, sug) => {
    setForm(prevForm => ({
      ...prevForm,
      to: { label: label, coords: sug.geometry.coordinates }
    }));
  };

  const handleViaSelect = (label, sug) => {
    setForm(prevForm => ({
      ...prevForm,
      via: { label: label, coords: sug.geometry.coordinates }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    if (!form.from.coords || !form.to.coords) {
      alert('❗Uzupełnij pola "Skąd" i "Dokąd", wybierając z listy sugestii.');
      setIsSaving(false);
      return;
    }

    if (!form.date) {
      alert('❗Ustaw datę przejazdu.');
      setIsSaving(false);
      return;
    }

    if (form.phone && form.phone.trim() !== '') {
        if (!form.consentPhoneShare) {
            alert('❗Musisz wyrazić zgodę na udostępnienie numeru telefonu, aby go zapisać.');
            setIsSaving(false);
            return;
        }
    }


    try {
        const apiKey = import.meta.env.VITE_ORS_API_KEY;
        const browserToken = localStorage.getItem('browser_token');

        let coordinates = [form.from.coords];
        let radiuses = [1500];

        if (form.via.coords) {
          coordinates.push(form.via.coords);
          radiuses.push(1500);
        }

        coordinates.push(form.to.coords);
        radiuses.push(1500);

        console.log('Coordinates sent to ORS:', coordinates);
        console.log('Radiuses sent to ORS:', radiuses);

        const routeRes = await fetchWithRetry('https://map-api-proxy.lawetaolsztyn.workers.dev/api/ors-route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                coordinates,
                instructions: false,
                geometry_simplify: true,
                radiuses,
            }),
        });

        const routeData = await routeRes.json();
        setRouteData(routeData);

        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        const routePayload = {
            p_user_id: userId || null,
            p_from_city: form.from.label,
            p_via: form.via.label || null,
            p_to_city: form.to.label,
            p_date: form.date,
            p_vehicle_type: form.vehicleType,
            p_load_capacity: form.loadCapacity || null,
            p_passenger_count: form.passengerCount ? parseInt(form.passengerCount) : null,
            p_max_detour_km: parseInt(form.maxDetour),
            p_phone: form.phone && form.consentPhoneShare ? form.phone : null, // ZMIANA: Teraz używa tylko form.phone
            p_messenger_link: form.messenger || null,
            p_geojson: routeData,
            p_browser_token: browserToken || null,
            p_uses_whatsapp: form.usesWhatsapp
        };

        const workerResponse = await fetch('https://map-api-proxy.lawetaolsztyn.workers.dev/api/routes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': userId || 'anon', // Dodaj User ID do nagłówka dla Rate Limiting
            },
            body: JSON.stringify(routePayload),
        });

        if (!workerResponse.ok) {
            const errorBody = await workerResponse.json();
            console.error('Błąd zapisu trasy przez Worker:', errorBody);
            alert(`❌ Wystąpił błąd zapisu trasy: ${errorBody.message || 'Nieznany błąd z serwera.'}`);
            setIsSaving(false);
            return;
        }

        const successData = await workerResponse.json();
        console.log('Trasa dodana pomyślnie przez Workera:', successData);

        onRouteCreated(routeData);

        // Resetowanie formularza po zapisie (pozostawiamy pola kontaktowe, aby były autopodstawiane)
        setForm(prevForm => ({
            ...prevForm,
            from: { label: '', coords: null },
            to: { label: '', coords: null },
            via: { label: '', coords: null },
            date: '',
            vehicleType: 'bus',
            loadCapacity: '',
            maxDetour: '50',
            passengerCount: '',
            // Pola kontaktowe NIE są resetowane, aby pozostały podstawione z profilu
        }));
        alert('✅ Trasa zapisana do bazy danych!');

    } catch (err) {
        console.error('Błąd wyznaczania trasy lub zapisu:', err);
        alert('❌ Wystąpił błąd podczas zapisu trasy: ' + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <>
      <form className="route-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-field">
            <label>Skąd:</label>
            <LocationAutocomplete
              value={form.from.label}
              onSelectLocation={handleFromSelect}
              placeholder="np. Warszawa"
              className="narrow-autocomplete"
            />
          </div>
          <div className="form-field">
            <label>Dokąd:</label>
            <LocationAutocomplete
              value={form.to.label}
              onSelectLocation={handleToSelect}
              placeholder="np. Berlin"
              className="narrow-autocomplete"
            />
          </div>
          <div className="form-field">
            <label>Punkt pośredni:</label>
            <LocationAutocomplete
              value={form.via.label}
              onSelectLocation={handleViaSelect}
              placeholder="np. Poznań"
              className="narrow-autocomplete"
            />
          </div>
          <div className="form-field">
            <label>Data przejazdu:</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="uinput"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Typ pojazdu:</label>
            <select name="vehicleType" value={form.vehicleType} onChange={handleChange} className="uinput">
              <option value="bus">🚌 Bus</option>
              <option value="laweta">🚚 Laweta</option>
            </select>
          </div>
          <div className="form-field">
            <label>Ładowność (kg):</label>
            <input type="text" name="loadCapacity" value={form.loadCapacity} onChange={handleChange} className="uinput" placeholder="np.1500 lub 2x1300" />
          </div>
          <div className="form-field">
            <label>Ilość osób do zabrania:</label>
            <input type="number" name="passengerCount" value={form.passengerCount} onChange={handleChange} className="uinput" />
          </div>
          <div className="form-field">
            <label>Ile km możesz zjechać z trasy:</label>
            <select name="maxDetour" value={form.maxDetour} onChange={handleChange} className="uinput">
              <option value="25">25 km</option>
              <option value="50">50 km</option>
              <option value="75">75 km</option>
              <option value="100">100 km</option>
            </select>
          </div>

          <div className="form-field">
            <label>Numer telefonu:</label>
            <div className="phone-input-group">
              {/* USUNIĘTO: select dla countryCode */}
              <input
                type="tel"
                name="phone"
                value={form.phone} // Ten input ma teraz wartość ze stanu form.phone, inicjalizowanego z profilu
                onChange={handleChange}
                className="uinput"
                placeholder="np. +48 123 456 789" // Zmieniono placeholder
                disabled={!form.consentPhoneShare} // Wyłącz, jeśli brak zgody na udostępnianie telefonu
              />
            </div>
          </div>
          
          <div className="form-field">
            <label>
              <input
                type="checkbox"
                name="usesWhatsapp"
                checked={form.usesWhatsapp} // Stan z profilu
                onChange={handleChange}
		            className="whatsapp-checkbox"
              />
              Kontakt WhatsApp
            </label>
          </div>
          
          <div className="form-field">
            <label>Messenger: (link)</label>
            <input
              type="url"
              name="messenger"
              value={form.messenger} // Stan z profilu
              onChange={handleChange}
              className="uinput"
              placeholder="https://facebook.com/user"
            />
            <small style={{ marginTop: '5px' }}>
                <a href="/pomoc/messenger-link" target="_blank" rel="noopener noreferrer">
                    ❓ Skąd wziąć link do Messengera?
                </a>
            </small>
          </div>

          {/* PRZENIESIONE POLE: Zgoda na udostępnienie numeru telefonu */}
          <div className="form-field form-field-consent">
            <label htmlFor="consentPhoneShare">
              <input
                type="checkbox"
                id="consentPhoneShare"
                name="consentPhoneShare"
                checked={form.consentPhoneShare} // Stan z profilu
                onChange={handleChange}
                className="consent-checkbox"
              />
              <span>Zgadzam się na udostępnienie mojego numeru telefonu publicznie.</span>
            </label>
            <small style={{ marginTop: '5px', fontSize: '0.8em', color: '#666' }}>
              Numer telefonu będzie widoczny dla innych użytkowników.
            </small>
          </div>


        </div> {/* ZAMYKAMY form-row */}

        {/* NOWY FORM-ROW TYLKO DLA PRZYCISKU SUBMIT */}
        <div className="form-row submit-button-row">
          <div className="form-field form-field-button">
            <button type="submit" className="submit-button" disabled={isSaving}>
              💾 {isSaving ? 'Zapisywanie...' : 'Zapisz trasę i pokaż na mapie'}
            </button>
          </div>
        </div>
      </form>
      <RouteMap routeData={routeData} />
    </>
  );
}

export default AddRouteForm;