import { useState, useEffect } from 'react';
import LocationAutocomplete from './components/LocationAutocomplete';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './AddRouteForm.css'; // Importujemy nowy plik CSS
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
    phone: '',
    countryCode: '+48', // Dodajemy domyślny kod kraju PL
    messenger: '',
    usesWhatsapp: false,
    consentPhoneShare: false, // Stan zgody
  });

  const [routeData, setRouteData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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

        // Jeśli odznaczono zgodę, wyczyść numer telefonu
        if (name === 'consentPhoneShare' && !checked) {
            newState.phone = '';
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

    // Walidacja współrzędnych
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

    // Walidacja dla numeru telefonu: sprawdzamy, czy pole nie jest puste, gdy podano kod kraju
    // ORAZ czy zgoda została zaznaczona
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
            p_phone: form.phone && form.consentPhoneShare ? `${form.countryCode}${form.phone}` : null,
            p_messenger_link: form.messenger || null,
            p_geojson: routeData,
            p_browser_token: browserToken || null,
            p_uses_whatsapp: form.usesWhatsapp
        };

        const workerResponse = await fetch('https://map-api-proxy.lawetaolsztyn.workers.dev/api/routes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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

        // Resetowanie formularza po zapisie
        setForm(prevForm => ({
            ...prevForm,
            from: { label: '', coords: null },
            to: { label: '', coords: null },
            via: { label: '', coords: null },
            phone: '',
            countryCode: '+48',
            consentPhoneShare: false // Resetuj zgodę po zapisie
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
              <select
                name="countryCode"
                value={form.countryCode}
                onChange={handleChange}
                className="country-code-select uinput"
                disabled={!form.consentPhoneShare}
              >
                <option value="+48">🇵🇱 +48</option>
                <option value="+355">🇦🇱 Albania +355</option>
                <option value="+43">🇦🇹 Austria +43</option>
                <option value="+375">🇧🇾 Białoruś +375</option>
                <option value="+32">🇧🇪 Belgia +32</option>
                <option value="+387">🇧🇦 Bośnia i Hercegowina +387</option>
                <option value="+359">🇧🇬 Bułgaria +359</option>
                <option value="+385">🇭🇷 Chorwacja +385</option>
                <option value="+420">🇨🇿 Czechy +420</option>
                <option value="+45">🇩🇰 Dania +45</option>
                <option value="+372">🇪🇪 Estonia +372</option>
                <option value="+358">🇫🇮 Finlandia +358</option>
                <option value="+33">🇫🇷 Francja +33</option>
                <option value="+30">🇬🇷 Grecja +30</option>
                <option value="+34">🇪🇸 Hiszpania +34</option>
                <option value="+31">🇳🇱 Holandia +31</option>
                <option value="+354">🇮🇸 Islandia +354</option>
                <option value="+353">🇮🇪 Irlandia +353</option>
                <option value="+423">🇱🇮 Liechtenstein +423</option>
                <option value="+370">🇱🇹 Litwa +370</option>
                <option value="+352">🇱🇺 Luksemburg +352</option>
                <option value="+371">🇱🇻 Łotwa +371</option>
                <option value="+49">🇩🇪 Niemcy +49</option>
                <option value="+47">🇳🇴 Norwegia +47</option>
                <option value="+351">🇵🇹 Portugalia +351</option>
                <option value="+40">🇷🇴 Rumunia +40</option>
                <option value="+421">🇸🇰 Słowacja +421</option>
                <option value="+386">🇸🇮 Słowenia +386</option>
                <option value="+46">🇸🇪 Szwecja +46</option>
                <option value="+41">🇨🇭 Szwajcaria +41</option>
                <option value="+90">🇹🇷 Turcja +90</option>
                <option value="+380">🇺🇦 Ukraina +380</option>
                <option value="+36">🇭🇺 Węgry +36</option>
                <option value="+44">🇬🇧 Wielka Brytania +44</option>
                <option value="+39">🇮🇹 Włochy +39</option>
              </select>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="uinput"
                placeholder="np. 123 456 789"
                disabled={!form.consentPhoneShare}
              />
            </div>
          </div>
          
          <div className="form-field">
            <label>
              <input
                type="checkbox"
                name="usesWhatsapp"
                checked={form.usesWhatsapp}
                onChange={(e) => setForm({ ...form, usesWhatsapp: e.target.checked })}
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
              value={form.messenger}
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

          {/* PRZENIESIONE POLE: Zgoda na udostępnienie numeru telefonu - TERAZ W TEJ SAMEJ LINII, PO MESSENGERZE */}
          <div className="form-field form-field-consent">
  <label htmlFor="consentPhoneShare">
    <input
      type="checkbox"
      id="consentPhoneShare"
      name="consentPhoneShare"
      checked={form.consentPhoneShare}
      onChange={handleChange}
      className="consent-checkbox"
    />
    <span>Zgadzam się na udostępnienie mojego numeru telefonu publicznie.</span>
  </label>
  <small style={{ marginTop: '5px', fontSize: '0.8em', color: '#666' }}>
    Numer telefonu będzie widoczny dla innych użytkowników.
  </small>
</div>


          {/* Przycisk "Zapisz trasę" również w nowym rzędzie, aby był zawsze dostępny i czytelny */}
        </div> {/* ZAMYKAMY TEN SAM form-row */}

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