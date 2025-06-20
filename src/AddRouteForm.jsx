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
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Status ${res.status}: ${errorText || res.statusText}`);
      }
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
    countryCode: '+48',
    messenger: '',
    usesWhatsapp: false,
    polyline: null, // Leaflet polyline for map display
    rawGeojsonForDb: null, // NOWE: GeoJSON LineString do zapisu w DB
    distanceFromOrs: null, // NOWE: Dystans z ORS
    durationFromOrs: null, // NOWE: Czas trwania z ORS
  });

  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Zaktualizowany useEffect do ładowania ostatniej trasy
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
        const lastRoute = data[0];
        let leafletCoords = null;
        
        // Preferujemy nową kolumnę route_geom, jeśli jest.
        // Pamiętaj, route_geom jest typu geography w DB, ale SQL funkcja zwraca ją jako TEXT (GeoJSON string)
        if (lastRoute.route_geom) { 
            try {
                const geomObj = JSON.parse(lastRoute.route_geom); // Parsujemy GeoJSON string z DB
                if (geomObj.coordinates) {
                    leafletCoords = geomObj.coordinates.map(coord => [coord[1], coord[0]]);
                }
            } catch (e) {
                console.error("Błąd parsowania route_geom z DB:", e);
            }
        } 
        // Jeśli route_geom jest puste lub niepoprawne, a mamy stare geojson (JSONB)
        else if (lastRoute.geojson && lastRoute.geojson.features?.[0]?.geometry?.coordinates) { 
            // Zakładamy, że stare geojson (JSONB) to FeatureCollection
            leafletCoords = lastRoute.geojson.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        }

        if (leafletCoords) {
            setForm(prevForm => ({ ...prevForm, polyline: leafletCoords }));
        }
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

  // Uproszczone handlery dla LocationAutocomplete - przyjmują gotowy obiekt { label, coords }
  const handleFromSelect = (selected) => {
    setForm(prevForm => ({ ...prevForm, from: selected }));
  };

  const handleToSelect = (selected) => {
    setForm(prevForm => ({ ...prevForm, to: selected }));
  };

  const handleViaSelect = (selected) => {
    setForm(prevForm => ({ ...prevForm, via: selected }));
  };

  // FUNKCJA getRoute - Pobiera trasę z ORS
  const getRoute = async () => {
    const { from, to, via } = form;
    if (!from.coords || !to.coords) {
      console.log('Brak punktów startowych/końcowych do obliczenia trasy.');
      return;
    }

    setIsLoadingRoute(true);
    setRouteError(null);

    try {
      // ORS API oczekuje [lng, lat] dla coordinates
      const coordinatesForOrs = [
        [from.coords.lng, from.coords.lat],
        [to.coords.lng, to.coords.lat],
      ];
      if (via && via.coords) {
        coordinatesForOrs.splice(1, 0, [via.coords.lng, via.coords.lat]);
      }

      // Endpoint lokalny "/api/ors-route"
      const routeRes = await fetchWithRetry('/api/ors-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          coordinates: coordinatesForOrs,
          instructions: false,
          geometry_simplify: true,
          radiuses: [1500, ...Array(coordinatesForOrs.length - 1).fill(1500)],
        }),
      });

      const orsData = await routeRes.json();

      if (routeRes.ok) {
        const routeGeometry = orsData.features?.[0]?.geometry;
        const routeSummary = orsData.features?.[0]?.properties?.summary;

        if (routeGeometry && routeSummary) {
          // ORS geometry is GeoJSON LineString ([lng, lat])
          const leafletCoords = routeGeometry.coordinates.map(coord => [coord[1], coord[0]]); // Konwersja na [lat, lng] dla Leaflet
          setForm(prevForm => ({
            ...prevForm,
            polyline: leafletCoords, // Dla wyświetlania na mapie
            rawGeojsonForDb: routeGeometry, // KLUCZOWE: Cały GeoJSON LineString object do zapisu
            distanceFromOrs: routeSummary.distance,
            durationFromOrs: routeSummary.duration,
          }));
          console.log('Trasa obliczona pomyślnie:', orsData);
        } else {
          throw new Error('Brak danych trasy w odpowiedzi ORS.');
        }
      } else {
        throw new Error(orsData.error?.message || orsData.error || 'Nieznany błąd podczas obliczania trasy ORS.');
      }
    } catch (error) {
      console.error('Błąd podczas obliczania trasy:', error);
      setRouteError(`Błąd podczas obliczania trasy: ${error.message}`);
      setForm(prevForm => ({
        ...prevForm,
        polyline: null,
        rawGeojsonForDb: null,
        distanceFromOrs: null,
        durationFromOrs: null
      }));
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Użycie useEffect do wywołania getRoute, gdy changed coords
  useEffect(() => {
    if (form.from.coords && form.to.coords) {
      getRoute();
    } else {
      setForm(prevForm => ({
        ...prevForm,
        polyline: null,
        rawGeojsonForDb: null,
        distanceFromOrs: null,
        durationFromOrs: null
      }));
    }
  }, [form.from.coords, form.to.coords, form.via.coords]);


  // FUNKCJA handleSubmit - KLUCZOWE ZMIANY TUTAJ
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
    
    // NOWA WALIDACJA: Sprawdzamy, czy trasa została obliczona
    if (!form.rawGeojsonForDb) {
        alert('❗Trasa nie została jeszcze obliczona. Proszę czekać lub spróbować ponownie.');
        setIsSaving(false);
        return;
    }

    // Dodatkowa walidacja dla numeru telefonu:
    if (form.countryCode && !form.phone && form.phone !== '') {
        alert('❗Proszę podać numer telefonu po wybraniu kodu kraju.');
        setIsSaving(false);
        return;
    }

    try {
      const browserToken = localStorage.getItem('browser_token');
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const routePayload = {
        // MAPOWANIE PÓL FORMULARZA NA NAZWY KOLUMN W BAZIE DANYCH (Z TWOJEGO SCHEMATU)
        from_city: form.from.label,
        to_city: form.to.label,
        via: form.via.label || null, // `via` jest kolumną tekstową w DB
        date: form.date,
        vehicle_type: form.vehicleType,
        load_capacity: form.loadCapacity || null, // LoadCapacity jest stringiem, ale DB oczekuje tekstu lub numeru
        passenger_count: form.passengerCount ? parseInt(form.passengerCount) : null, // passenger_count jest int
        max_detour_km: parseInt(form.maxDetour), // max_detour_km jest int
        phone: form.phone ? `${form.countryCode}${form.phone}` : null,
        uses_whatsapp: form.usesWhatsapp,
        messenger_link: form.messenger || null, // messenger_link jest text
        user_id: userId || null,
        browser_token: browserToken || null,
        
        // KLUCZOWE: Zapis geometrii trasy
        // route_geom to kolumna typu geography(LineString, 4326)
        // form.rawGeojsonForDb to już obiekt GeoJSON LineString z ORS
        route_geom: form.rawGeojsonForDb, 
        
        distance: form.distanceFromOrs, // Wartość numeric z ORS
        duration: form.durationFromOrs, // Wartość numeric z ORS

        // Poniższe kolumny z Twojego oryginalnego schematu form
        // NIE SĄ ZAPISYWANE, bo nie istnieją w Twojej tabeli 'routes' w DB:
        // time (brak w DB)
        // price (brak w DB)
        // description (brak w DB)
        // geojson (nie zapisujemy już do tej JSONB, bo mamy route_geom)
        // from_lat, from_lng, to_lat, to_lng, via_lat, via_lng (koordynaty są w route_geom, a miasto w _city)
      };

      const { error } = await supabase.from('routes').insert([routePayload]);

      if (error) {
        console.error('Błąd zapisu:', error);
        alert('❌ Wystąpił błąd zapisu do bazy: ' + error.message);
        setIsSaving(false);
        return;
      }

      onRouteCreated(); // Wywołujemy tylko onRouteCreated, bez argumentów
      alert('✅ Trasa zapisana do bazy danych!');

      // Resetowanie formularza po zapisie
      setForm(prevForm => ({
        ...prevForm,
        from: { label: '', coords: null },
        to: { label: '', coords: null },
        via: { label: '', coords: null }, // Poprawiono: było gform
        date: '',
        vehicleType: 'bus',
        loadCapacity: '',
        maxDetour: '50',
        passengerCount: '',
        phone: '',
        countryCode: '+48',
        messenger: '',
        usesWhatsapp: false,
        polyline: null,
        rawGeojsonForDb: null,
        distanceFromOrs: null,
        durationFromOrs: null,
      }));

    } catch (err) {
      console.error('Błąd wyznaczania lub zapisu trasy:', err);
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
        </div>

        <div className="form-row">
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
        </div>

        <div className="form-field">
          {isLoadingRoute && <p>Obliczam trasę...</p>}
          {routeError && <p className="error-message">{routeError}</p>}
          {form.polyline && !isLoadingRoute && (
            <p>Trasa obliczona: Dystans: {(form.distanceFromOrs / 1000).toFixed(2)} km, Czas: {(form.durationFromOrs / 60).toFixed(0)} min.</p>
          )}
        </div>

        <div className="form-field form-field-button">
          <button type="submit" className="submit-button" disabled={isLoadingRoute || isSaving}>
            💾 {isSaving ? 'Zapisywanie...' : 'Zapisz trasę i pokaż na mapie'}
          </button>
        </div>
      </form>
      <RouteMap polyline={form.polyline} /> {/* Przekazujemy form.polyline, które jest już poprawnie ustawiane */}
    </>
  );
}

export default AddRouteForm;