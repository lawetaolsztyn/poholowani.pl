import { useState, useEffect } from 'react';
import LocationAutocomplete from './components/LocationAutocomplete';
import './EditRouteModal.css'; // <-- WAŻNE: Dodaj import nowego pliku CSS

export default function EditRouteModal({ route, onClose, onSave }) {
  const [form, setForm] = useState({
    from_city_label: '', // Zmienione: etykieta
    from_city_coords: null, // Nowe: koordynaty
    to_city_label: '',
    to_city_coords: null,
    via_label: '',
    via_coords: null,
    date: '',
    vehicle_type: '',
    passenger_count: '',
    load_capacity: '',
    phone: '',
    messenger_link: '',
    id: null, // Dodajemy ID trasy
  });

  useEffect(() => {
    if (route) {
      // Przy otwarciu modalu, musimy spróbować odzyskać koordynaty miast.
      // Najlepszym rozwiązaniem byłoby zapisywanie koordynat w bazie danych.
      // Poniżej jest tymczasowe geokodowanie nazw miast za pomocą Mapboxa,
      // aby uzyskać współrzędne potrzebne do generowania trasy przez ORS.
      const geocodeInitialCities = async () => {
        const fetchMapboxCoords = async (text) => {
          if (!text) return null;
          try {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&limit=1&language=pl,en`
            );
            const data = await res.json();
            return data.features.length ? data.features[0].geometry.coordinates : null; // [lng, lat]
          } catch (error) {
            console.error("Błąd geokodowania początkowego miasta z Mapbox:", text, error);
            return null;
          }
        };

        const initialFromCoords = route.from_city ? await fetchMapboxCoords(route.from_city) : null;
        const initialToCoords = route.to_city ? await fetchMapboxCoords(route.to_city) : null;
        const initialViaCoords = route.via ? await fetchMapboxCoords(route.via) : null;

        setForm(prevForm => ({
          ...prevForm,
          from_city_label: route.from_city || '',
          from_city_coords: initialFromCoords,
          to_city_label: route.to_city || '',
          to_city_coords: initialToCoords,
          via_label: route.via || '',
          via_coords: initialViaCoords,
          date: route.date || '',
          vehicle_type: route.vehicle_type || '',
          passenger_count: route.passenger_count?.toString() || '',
          load_capacity: route.load_capacity || '',
          phone: route.phone || '',
          messenger_link: route.messenger_link || '',
          id: route.id,
        }));
      };

      geocodeInitialCities();
    }
  }, [route]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleFromSelect = (label, sug) => {
    setForm(prevForm => ({
        ...prevForm,
        from_city_label: label,
        from_city_coords: sug.geometry.coordinates // Zapisujemy koordynaty z Mapboxa
    }));
  };

  const handleToSelect = (label, sug) => {
    setForm(prevForm => ({
        ...prevForm,
        to_city_label: label,
        to_city_coords: sug.geometry.coordinates // Zapisujemy koordynaty z Mapboxa
    }));
  };

  const handleViaSelect = (label, sug) => {
    setForm(prevForm => ({
        ...prevForm,
        via_label: label,
        via_coords: sug.geometry.coordinates // Zapisujemy koordynaty z Mapboxa
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Walidacja - teraz sprawdzamy również, czy mamy koordynaty
    if (!form.from_city_coords || !form.to_city_coords || !form.date || !form.vehicle_type) {
      alert('❌ Uzupełnij wszystkie wymagane pola (Skąd, Dokąd, Data, Typ pojazdu), wybierając miasta z listy sugestii.');
      return;
    }

    onSave(form); // Przekazujemy cały obiekt form, który zawiera również koordynaty
  };

  if (!route) return null;

  return (
    // Użyj klasy 'modal-overlay' zamiast inline style
    <div className="modal-overlay">
      {/* Użyj klasy 'modal-content' zamiast inline style */}
      <div className="modal-content">
        <h2>Edytuj Trasę</h2>
        {/* Użyj klasy 'modal-form' dla formularza */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Użyj LocationAutocomplete z wartościami i obsługą zmian */}
          <LocationAutocomplete
            placeholder="Skąd"
            value={form.from_city_label} // Użyj stanu dla wartości inputa
            onSelectLocation={handleFromSelect}
            // Ważne: Przekaż klasę, aby stylizacja działała
            inputClassName="location-autocomplete-input"
          />
          <LocationAutocomplete
            placeholder="Dokąd"
            value={form.to_city_label} // Użyj stanu dla wartości inputa
            onSelectLocation={handleToSelect}
            // Ważne: Przekaż klasę, aby stylizacja działała
            inputClassName="location-autocomplete-input"
          />
          <LocationAutocomplete
            placeholder="Przez (opcjonalnie)"
            value={form.via_label} // Użyj stanu dla wartości inputa
            onSelectLocation={handleViaSelect}
            inputClassName="location-autocomplete-input"
          />

          <input name="date" type="date" value={form.date} onChange={handleChange} min={new Date().toISOString().split('T')[0]} />
          <select name="vehicle_type" value={form.vehicle_type} onChange={handleChange}>
            <option value="">Typ pojazdu</option>
            <option value="bus">🚌 Bus</option>
            <option value="laweta">🛻 Laweta</option>
          </select>
          <input name="passenger_count" type="number" value={form.passenger_count} onChange={handleChange} placeholder="Ilość osób (może być 0)" min="0" />
          <input name="load_capacity" value={form.load_capacity} onChange={handleChange} placeholder="Ładowność (kg)" />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Telefon" />
          <input name="messenger_link" value={form.messenger_link} onChange={handleChange} placeholder="Messenger (link)" />
          
          {/* Użyj klasy 'modal-buttons-container' dla kontenera przycisków */}
          <div className="modal-buttons-container">
            <button type="button" onClick={onClose}>❌ Anuluj</button>
            <button type="submit">💾 Zapisz</button>
          </div>
        </form>
      </div>
    </div>
  );
}