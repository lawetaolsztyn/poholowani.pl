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
    from: '',
    to: '',
    via: '',
    date: '',
    vehicleType: 'bus',
    loadCapacity: '',
    maxDetour: '50',
    passengerCount: '',
    phone: '',
    messenger: ''
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
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    if (!form.from || !form.to) {
      alert('❗Uzupełnij pola "Skąd" i "Dokąd".');
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

      const geocode = async (place) => {
        const res = await fetchWithRetry(`https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(place)}&size=1`);
        const data = await res.json();
        if (!data.features.length) return null;
        return data.features[0].geometry.coordinates;
      };

      const fromCoords = await geocode(form.from);
      const toCoords = await geocode(form.to);

      if (!fromCoords || !toCoords) {
        alert('Nie znaleziono jednego z miast.');
        setIsSaving(false);
        return;
      }

      let coordinates = [fromCoords];

      if (form.via && form.via.trim() !== '') {
        const viaCoords = await geocode(form.via);
        if (viaCoords) {
          coordinates.push(viaCoords);
        }
      }

      coordinates.push(toCoords);

      const routeRes = await fetchWithRetry('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey
        },
        body: JSON.stringify({ coordinates })
      });

      const routeData = await routeRes.json();
      setRouteData(routeData);

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const routePayload = {
        from_city: form.from,
        to_city: form.to,
        via: form.via || null,
        date: form.date,
        vehicle_type: form.vehicleType,
        load_capacity: form.loadCapacity || null,
        passenger_count: form.passengerCount ? parseInt(form.passengerCount) : null,
        max_detour_km: parseInt(form.maxDetour),
        geojson: routeData,
        created_at: new Date().toISOString(),
        phone: form.phone || null,
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
  from: '',
  to: '',
  via: ''
}));
      alert('✅ Trasa zapisana do bazy danych!');
    } catch (err) {
      console.error('Błąd wyznaczania lub zapisu trasy:', err);
      alert('❌ Wystąpił błąd podczas zapisu trasy.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <form className="route-form" onSubmit={handleSubmit}> {/* Dodana klasa .route-form */}
        <div className="form-row"> {/* Nowa klasa do stylizacji */}
          <div className="form-field"> {/* Nowa klasa do stylizacji */}
            <label>Skąd:</label>
            <LocationAutocomplete
              value={form.from}
              onSelectLocation={(label) => setForm({ ...form, from: label })}
              placeholder="np. Warszawa"
              className="narrow-autocomplete"
            />
          </div>
          <div className="form-field"> {/* Nowa klasa do stylizacji */}
            <label>Dokąd:</label>
            <LocationAutocomplete
              value={form.to}
              onSelectLocation={(label) => setForm({ ...form, to: label })}
              placeholder="np. Berlin"
              className="narrow-autocomplete"
            />
          </div>
          <div className="form-field"> {/* Nowa klasa do stylizacji */}
            <label>Punkt pośredni:</label>
            <LocationAutocomplete
              value={form.via}
              onSelectLocation={(label) => setForm({ ...form, via: label })}
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
