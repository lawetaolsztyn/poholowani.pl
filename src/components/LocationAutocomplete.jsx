// LocationAutocomplete.jsx
import { useState, useEffect, useRef } from 'react';
import './LocationAutocomplete.css';

// Dodaj 'onChange' do destrukturyzacji propsów
export default function LocationAutocomplete({ value, onSelectLocation, onChange, placeholder, className, style }) {
  const [internalInput, setInternalInput] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const isMouseInListRef = useRef(false);
  const ignoreNextSearchRef = useRef(false);
  const hasUserTypedRef = useRef(false);

  useEffect(() => {
    setInternalInput(value || '');
    hasUserTypedRef.current = false;
  }, [value]);

  const searchSuggestions = async (input) => {
    if (input.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // ... (twój istniejący kod do fetchowania sugestii)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=geojson&limit=5&addressdetails=1`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const filteredSuggestions = data.features.filter(f => f.properties.osm_type === 'node' || f.properties.osm_type === 'way');
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error("Błąd podczas pobierania sugestii:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatLabel = (sug) => {
    const props = sug.properties;
    let label = props.name || props.display_name;
    let sub = '';

    if (props.address) {
      const address = props.address;
      if (address.road && address.house_number) {
        label = `${address.road} ${address.house_number}`;
        sub = `<span class="math-inline">\{address\.postcode ? address\.postcode \+ ' ' \: ''\}</span>{address.city || address.town || address.village || ''}, ${address.country || ''}`;
      } else if (address.city || address.town || address.village) {
        label = address.city || address.town || address.village;
        sub = `<span class="math-inline">\{address\.postcode ? address\.postcode \+ ' ' \: ''\}</span>{address.country || ''}`;
      }
    }
    return { full: props.display_name, label, sub };
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInternalInput(newValue);
    hasUserTypedRef.current = true; // Użytkownik zaczął pisać
    searchSuggestions(newValue);

    // NOWA LINIA: Wywołaj onChange, jeśli został przekazany
    if (onChange) {
        onChange(newValue); 
    }
  };

  const handleSuggestionClick = (sug) => {
    const coords = sug.geometry ? { lat: sug.geometry.coordinates[1], lng: sug.geometry.coordinates[0] } : null;
    const selectedValue = {
      label: formatLabel(sug).full,
      coords: coords,
    };
    onSelectLocation(selectedValue); // To aktualizuje nadrzędny stan z { label, coords }
    setInternalInput(selectedValue.label); // Ustawia pole input na pełną nazwę
    setSuggestions([]); // Ukryj sugestie
    ignoreNextSearchRef.current = true; // Zapobiegaj searchSuggestions na blur
  };

  const handleBlurLogic = () => {
    // Opóźnienie, aby umożliwić kliknięcie sugestii przed wykonaniem onBlur
    setTimeout(() => {
      if (isMouseInListRef.current) {
        return; // Użytkownik kliknął sugestię, nic nie rób w onBlur
      }
      if (!ignoreNextSearchRef.current) {
        // Jeśli użytkownik nie wybrał sugestii, a pole nie jest puste
        // i nie ma już wybranej wartości z props (np. przy edycji formularza)
        if (internalInput.length > 0 && !value) {
            // To jest scenariusz, gdy użytkownik wpisał coś, ale nie wybrał sugestii.
            // Możesz chcieć zresetować coords w nadrzędnym komponencie.
            onSelectLocation({ label: internalInput, coords: null });
        } else if (internalInput.length === 0) {
            // Jeśli pole jest puste, upewnij się, że w formularzu nadrzędnym też jest null dla coords
            onSelectLocation({ label: '', coords: null }); // Zmieniono na obiekt, aby spójnie przekazywać label i coords
            setSuggestions([]);
        }
      }
      ignoreNextSearchRef.current = false; // Zresetuj flagę
    }, 100);
  };

  return (
    <div className={`autocomplete-container ${className || ''}`} ref={containerRef} style={style}>
      <input
        type="text"
        value={internalInput}
        onChange={handleInputChange}
        onBlur={handleBlurLogic}
        placeholder={placeholder || 'Wpisz miasto lub kod pocztowy'}
        className="autocomplete-input"
      />
      {loading && <div className="autocomplete-loading">⏳</div>}
      {suggestions.length > 0 && (
        <ul
          className="autocomplete-list"
          onMouseEnter={() => (isMouseInListRef.current = true)}
          onMouseLeave={() => (isMouseInListRef.current = false)}
        >
          {suggestions.map((sug) => {
            const { label, sub } = formatLabel(sug);
            return (
              <li
                key={`<span class="math-inline">\{sug\.id \|\| sug\.text\}\-</span>{Math.random()}`} // Użycie Math.random() jest ok dla unikalności w map, ale nie jest idealne dla re-renderów. Lepiej by było coś bardziej stabilnego.
                className="autocomplete-item"
                onClick={() => handleSuggestionClick(sug)}
              >
                <strong>{label}</strong>
                {sub && <div className="autocomplete-sub">{sub}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}