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
    messenger: '',
 usesWhatsapp: false,
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
    setForm(prevForm => ({
        ...prevForm,
        [name]: type === 'checkbox' ? checked : value
    }));
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
    if (!form.from.coords || !form.to.coords) { // Sprawdzamy coords, nie tylko label
      alert('❗Uzupełnij pola "Skąd" i "Dokąd", wybierając z listy sugestii.');
      setIsSaving(false);
      return;
    }

    if (!form.date) {
      alert('❗Ustaw datę przejazdu.');
      setIsSaving(false);
      return;
    }

    try {
      const apiKey = import.meta.env.VITE_ORS_API_KEY;
      const browserToken = localStorage.getItem('browser_token');

      const fromCoords = await geocode(form.from);
      const toCoords = await geocode(form.to);

      if (!fromCoords || !toCoords) {
        alert('Nie znaleziono jednego z miast.');
        setIsSaving(false);
        return;
      }

      let coordinates = [form.from.coords]; // form.from.coords to już [lng, lat]

     if (form.via.coords) { // Sprawdzamy czy punkt pośredni ma koordynaty
        coordinates.push(form.via.coords);
      }

      coordinates.push(form.to.coords); // form.to.coords to już [lng, lat]

       // Zapytanie do OpenRouteService o trasę - DODAJEMY instructions: false i geometry_simplify: true
      const routeRes = await fetchWithRetry('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey
        },
        body: JSON.stringify({
          coordinates: coordinates,
          instructions: false, // <-- DODANE
          geometry_simplify: true // <-- DODANE (opcjonalnie, ale zalecane)
        })
      });

      const routeData = await routeRes.json();
      setRouteData(routeData);

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const routePayload = {
        // Zapisujemy etykiety do bazy danych
        from_city: form.from.label,
        to_city: form.to.label,
        via: form.via.label || null, // Używamy etykiety, jeśli istnieje
        date: form.date,
        vehicle_type: form.vehicleType,
        load_capacity: form.loadCapacity || null,
        passenger_count: form.passengerCount ? parseInt(form.passengerCount) : null,
        max_detour_km: parseInt(form.maxDetour),
        geojson: routeData,
        created_at: new Date().toISOString(),
        phone: form.phone || null,
        uses_whatsapp: form.usesWhatsapp,
        messenger_link: form.messenger || null,
        user_id: userId || null,
        browser_token: browserToken || null
      };

      const { error } = await supabase.from('routes').insert([routePayload]);

      if (error) {
        console.error('Błąd zapisu:', error);
        alert('❌ Wystąpił błąd zapisu do bazy.');
        setIsSaving(false);
        return;
      }

      onRouteCreated(routeData);

setForm(prevForm => ({
        ...prevForm,
        from: { label: '', coords: null },
        to: { label: '', coords: null },
        via: { label: '', coords: null }
      }));
      alert('✅ Trasa zapisana do bazy danych!');
    } catch (err) {
      console.error('Błąd wyznaczania lub zapisu trasy:', err);
      alert('❌ Wystąpił błąd podczas zapisu trasy: ' + err.message); // Wyświetl dokładniejszy błąd
    } finally {
      setIsSaving(false);
    }
  };

 return (
    // ...
    <LocationAutocomplete
      value={form.from.label} // Nadal przekazujemy etykietę do wyświetlenia
      onSelectLocation={handleFromSelect} // Zmieniamy na nową funkcję
      placeholder="np. Warszawa"
      className="narrow-autocomplete"
    />
    // ...
    <LocationAutocomplete
      value={form.to.label}
      onSelectLocation={handleToSelect} // Zmieniamy na nową funkcję
      placeholder="np. Berlin"
      className="narrow-autocomplete"
    />
    // ...
    <LocationAutocomplete
      value={form.via.label}
      onSelectLocation={handleViaSelect} // Zmieniamy na nową funkcję
      placeholder="np. Poznań"
      className="narrow-autocomplete"
    />
          </div>
          <div className="form-field"> {/* Nowa klasa do stylizacji */}
            <label>Data przejazdu:</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              className="uinput"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="form-row"> {/* Nowa klasa do stylizacji */}
          <div className="form-field"> {/* Nowa klasa do stylizacji */}
            <label>Typ pojazdu:</label>
            <select name="vehicleType" value={form.vehicleType} onChange={handleChange} className="uinput">
              <option value="bus">🚌 Bus</option>
              <option value="laweta">🚚 Laweta</option>
            </select>
          </div>
          <div className="form-field"> {/* Nowa klasa do stylizacji */}
            <label>Ładowność (kg):</label>
            <input type="text" name="loadCapacity" value={form.loadCapacity} onChange={handleChange} className="uinput" />
          </div>
          <div className="form-field"> {/* Nowa klasa do stylizacji */}
            <label>Ilość osób do zabrania:</label>
            <input type="number" name="passengerCount" value={form.passengerCount} onChange={handleChange} className="uinput" />
          </div>
          <div className="form-field"> {/* Nowa klasa do stylizacji */}
            <label>Ile km możesz zjechać z trasy:</label>
            <select name="maxDetour" value={form.maxDetour} onChange={handleChange} className="uinput">
              <option value="25">25 km</option>
              <option value="50">50 km</option>
              <option value="75">75 km</option>
              <option value="100">100 km</option>
            </select>
          </div>
          <div className="form-field"> {/* Nowa klasa do stylizacji */}
            <label>Numer telefonu:</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="uinput" />
          </div>
<div className="form-field">
  <label>
    <input
      type="checkbox"
      name="usesWhatsapp"
      checked={form.usesWhatsapp}
      onChange={(e) => setForm({ ...form, usesWhatsapp: e.target.checked })}
    />
    Kontakt WhatsApp
  </label>
</div>
          <div className="form-field"> {/* Nowa klasa do stylizacji */}
            <label>Messenger: (link)</label>
            <input type="url" name="messenger" value={form.messenger} onChange={handleChange} className="uinput" />
          </div>
        </div>

        <button type="submit" className="submit-button" disabled={isSaving}> {/* Dodana klasa .submit-button */}
          💾 {isSaving ? 'Zapisywanie...' : 'Zapisz trasę i pokaż na mapie'}
        </button>
      </form>

      <RouteMap routeData={routeData} />
    </>
  );
}

export default AddRouteForm;
