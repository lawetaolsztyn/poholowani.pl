import { useState, useEffect } from 'react';
import LocationAutocomplete from './components/LocationAutocomplete';
import './EditRouteModal.css'; // <-- WAŻNE: Dodaj import nowego pliku CSS

export default function EditRouteModal({ route, onClose, onSave }) {
  const [form, setForm] = useState({
    from_city: '',
    to_city: '',
    via: '',
    date: '',
    vehicle_type: '',
    passenger_count: '',
    load_capacity: '',
    phone: '',
    messenger_link: ''
  });

  const [fromLocationLabel, setFromLocationLabel] = useState(''); // Do wyświetlania nazwy miasta
  const [toLocationLabel, setToLocationLabel] = useState('');   // Do wyświetlania nazwy miasta


  useEffect(() => {
    if (route) {
      setForm({
        from_city: route.from_city || '',
        to_city: route.to_city || '',
        via: route.via || '',
        date: route.date || '',
        vehicle_type: route.vehicle_type || '',
        passenger_count: route.passenger_count?.toString() || '',
        load_capacity: route.load_capacity || '',
        phone: route.phone || '',
        messenger_link: route.messenger_link || '',
        id: route.id
      });
      // Ustaw etykiety dla autocomplete na podstawie danych z trasy
      setFromLocationLabel(route.from_city || '');
      setToLocationLabel(route.to_city || '');
    }
  }, [route]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Walidacja
    if (!form.from_city || !form.to_city || !form.date || !form.vehicle_type) {
      alert('❌ Uzupełnij wszystkie wymagane pola: Skąd, Dokąd, Data, Typ pojazdu.');
      return;
    }

    onSave(form);
  };

  const handleFromSelect = (label, loc) => {
    setFromLocationLabel(label);
    setForm(prevForm => ({
        ...prevForm,
        from_city: label // Zapisz całą etykietę, nie tylko miasto
    }));
  };

  const handleToSelect = (label, loc) => {
    setToLocationLabel(label);
    setForm(prevForm => ({
        ...prevForm,
        to_city: label // Zapisz całą etykietę
    }));
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
            value={fromLocationLabel} // Użyj stanu dla wartości inputa
            onSelectLocation={handleFromSelect}
            // Ważne: Przekaż klasę, aby stylizacja działała
            inputClassName="location-autocomplete-input"
          />
          <LocationAutocomplete
            placeholder="Dokąd"
            value={toLocationLabel} // Użyj stanu dla wartości inputa
            onSelectLocation={handleToSelect}
            // Ważne: Przekaż klasę, aby stylizacja działała
            inputClassName="location-autocomplete-input"
          />

          <input name="via" type="text" value={form.via} onChange={handleChange} placeholder="Przez (opcjonalnie)" />
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

// Usuń te inline style, ponieważ teraz zarządzamy nimi w EditRouteModal.css
// const overlayStyle = {
//   position: 'fixed',
//   top: 0, left: 0, right: 0, bottom: 0,
//   backgroundColor: 'rgba(0,0,0,0.6)',
//   display: 'flex',
//   justifyContent: 'center',
//   alignItems: 'center',
//   zIndex: 9999
// };

// const modalStyle = {
//   backgroundColor: 'white',
//   padding: '30px',
//   borderRadius: '10px',
//   boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
//   width: '90%',
//   maxWidth: '500px',
//   position: 'relative',
//   maxHeight: '90vh',
//   overflowY: 'auto'
// };