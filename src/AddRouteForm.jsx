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
      // Zmieniono: sprawdzanie res.ok i rzucenie błędu z treścią odpowiedzi
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
    countryCode: '+48', // Dodajemy domyślny kod kraju PL
    messenger: '',
    usesWhatsapp: false,
  });

  const [routeData, setRouteData] = useState(null); // Zachowujemy Twój stan routeData
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false); // NOWA: Wskaźnik ładowania trasy ORS
  const [routeError, setRouteError] = useState(null); // NOWA: Błąd trasy ORS


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
        // ZMIANA: Lepsze ładowanie geometrii dla RouteMap
        const lastRoute = data[0];
        let geojsonForMap = null;
        if (lastRoute.route_geom) {
            try {
                geojsonForMap = JSON.parse(lastRoute.route_geom);
            } catch (e) {
                console.error("Błąd parsowania route_geom z DB:", e);
            }
        } else if (lastRoute.geojson) {
            geojsonForMap = lastRoute.geojson; // Stare dane JSONB
        }
        
        if (geojsonForMap) {
            // RouteMap prawdopodobnie oczekuje obiektu FeatureCollection lub Geometry
            // setRouteData w Twoim kodzie przyjmuje całe routeData
            setRouteData(geojsonForMap);
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

  const handleFromSelect = (label, sug) => {
    setForm(prevForm => ({
      ...prevForm,
      // ZMIANA: Format coords z {lat, lng} na [lng, lat]
      // LocationAutocomplete zwraca {label, coords: [lng,lat]} LUB {label, coords: {lat,lng}} ?
      // Zakładam, że LocationAutocomplete zwraca coords w formacie [lng, lat]
      // Jeśli LocationAutocomplete zwraca {lat, lng}, to musiałbyś zmienić handleFromSelect na:
      // from: { label: label, coords: [sug.geometry.coordinates[0], sug.geometry.coordinates[1]] }
      // Sprawdź w konsoli, jaki format mają coords po wyborze
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

  // NOWA: useEffect do wywołania ORS po zmianie lokalizacji
  useEffect(() => {
    const fetchOrsRoute = async () => {
        if (!form.from.coords || !form.to.coords) {
            setRouteError(null);
            return;
        }

        setIsLoadingRoute(true);
        setRouteError(null);

        try {
            // Koordynaty dla ORS API - muszą być w formacie [lng, lat]
            const orsCoordinates = [form.from.coords];
            if (form.via.coords) {
                orsCoordinates.push(form.via.coords);
            }
            orsCoordinates.push(form.to.coords);

            const radiusesForOrs = [1500, ...Array(orsCoordinates.length - 1).fill(1500)];

            const routeRes = await fetchWithRetry('/api/ors-route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    coordinates: orsCoordinates,
                    instructions: false,
                    geometry_simplify: true,
                    radiuses: radiusesForOrs,
                }),
            });

            const orsData = await routeRes.json();

            if (routeRes.ok && orsData.features && orsData.features.length > 0) {
                const routeGeometry = orsData.features[0].geometry;
                const routeSummary = orsData.features[0].properties.summary;
                
                // ZMIANA: Aktualizujemy routeData, aby RouteMap działało jak wcześniej
                setRouteData(orsData); // Przekazujemy całą odpowiedź ORS do RouteMap

                setForm(prevForm => ({
                    ...prevForm,
                    // rawGeojsonForDb: routeGeometry, // Niepotrzebne w stanie form, wystarczy w routePayload
                    distanceFromOrs: routeSummary.distance,
                    durationFromOrs: routeSummary.duration,
                }));
            } else {
                throw new Error(orsData.error?.message || 'Brak danych trasy z ORS.');
            }
        } catch (error) {
            console.error('Błąd obliczania trasy ORS:', error);
            setRouteError(`Błąd obliczania trasy: ${error.message}`);
            setRouteData(null); // Resetuj dane mapy
            setForm(prevForm => ({
                ...prevForm,
                distanceFromOrs: null,
                durationFromOrs: null
            }));
        } finally {
            setIsLoadingRoute(false);
        }
    };

    if (form.from.coords && form.to.coords) {
        fetchOrsRoute();
    } else {
        setRouteData(null); // Usuń trasę z mapy, jeśli punkty nie są wybrane
        setRouteError(null);
        setForm(prevForm => ({
            ...prevForm,
            distanceFromOrs: null,
            durationFromOrs: null
        }));
    }
  }, [form.from.coords, form.to.coords, form.via.coords]);


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

    // ZMIANA: Walidacja, czy trasa z ORS została pobrana
    if (!routeData || !routeData.features || routeData.features.length === 0) {
        alert('❗Trasa nie została jeszcze obliczona lub wystąpił błąd. Proszę poczekać lub spróbować ponownie.');
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
      
      // ZMIANA: Pobranie geometrii i podsumowania z routeData (pełna odpowiedź ORS)
      const routeGeometry = routeData.features[0].geometry;
      const routeSummary = routeData.features[0].properties.summary;


      const routePayload = {
        // MAPOWANIE NAZWA_KOLUMNY_DB: wartość_z_formularza
        from_city: form.from.label,
        to_city: form.to.label,
        via: form.via.label || null, // `via` jest kolumną tekstową w DB
        date: form.date,
        vehicle_type: form.vehicleType,
        load_capacity: form.loadCapacity || null, // load_capacity to tekst w DB, może być null
        passenger_count: form.passengerCount ? parseInt(form.passengerCount) : null, // passenger_count to int w DB
        max_detour_km: parseInt(form.maxDetour), // max_detour_km to int
        phone: form.phone ? `${form.countryCode}${form.phone}` : null,
        uses_whatsapp: form.usesWhatsapp,
        messenger_link: form.messenger || null, // messenger_link to tekst w DB
        user_id: userId || null,
        browser_token: browserToken || null,
        created_at: new Date().toISOString(), // DB może też ustawiać automatycznie
        
        // ZMIANA KLUCZOWA: Zapis geometrii trasy do route_geom (typ geography)
        // routeGeometry to już obiekt GeoJSON LineString z ORS
        route_geom: JSON.stringify(form.rawGeojsonForDb), 
        
        // ZMIANA: Zapis dystansu i czasu trwania
        distance: routeSummary.distance, 
        duration: routeSummary.duration,
        
        // USUNIĘTO: geojson: routeData - nie zapisujemy już całego ORS response do geojson (zmieniono na route_geom)
        // USUNIĘTO: from_lat, from_lng, to_lat, to_lng, via_lat, via_lng - nie ma ich w DB
        // USUNIĘTO: time, price, description - nie ma ich w Twoim schemacie DB
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
        via: { label: '', coords: null }, // Poprawiono: upewniamy się, że to via
        date: '',
        vehicleType: 'bus',
        loadCapacity: '',
        maxDetour: '50',
        passengerCount: '',
        phone: '',
        countryCode: '+48',
        messenger: '',
        usesWhatsapp: false,
        polyline: null, // Resetuj również polilinię mapy
        rawGeojsonForDb: null, // Resetuj również rawGeojsonForDb
        distanceFromOrs: null, // Resetuj również dystans
        durationFromOrs: null, // Resetuj również czas trwania
      }));
      setRouteData(null); // Zresetuj routeData, aby mapa się wyczyściła
      setRouteError(null); // Wyczyść błędy trasy
      setIsLoadingRoute(false); // Upewnij się, że ładowanie jest wyłączone

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
                <option value="+386">🇸🇮 Słowenia +421</option>
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
          {/* ZMIANA: Wyświetlanie dystansu i czasu trwania */}
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
      {/* ZMIANA: Przekazujemy form.polyline zamiast routeData */}
      <RouteMap polyline={form.polyline} />
    </>
  );
}

export default AddRouteForm;