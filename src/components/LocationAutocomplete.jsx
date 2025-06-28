// src/components/LocationAutocomplete.jsx

import { useState, useEffect, useRef } from 'react';
import './LocationAutocomplete.css';

export default function LocationAutocomplete({ value, onSelectLocation, placeholder, className, style, searchType = 'city' }) { // DODANO searchType
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

  useEffect(() => {
    if (!hasUserTypedRef.current) {
        setSuggestions([]);
        return;
    }

    if (ignoreNextSearchRef.current) {
      ignoreNextSearchRef.current = false;
      setSuggestions([]);
      return;
    }

    if (internalInput.length < 3) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const sanitizedText = internalInput.replace(/(\d{2})-(\d{3})/, '$1$2'); // To jest do kodów pocztowych, może być usunięte jeśli nie używamy
      
      let typesParam = '';
      if (searchType === 'city') {
          typesParam = 'place,postcode'; // Wyszukiwanie miast i kodów pocztowych
      } else if (searchType === 'street') {
          typesParam = 'address,street'; // Wyszukiwanie ulic i pełnych adresów
      } else {
          typesParam = 'locality,place,address,street,postcode'; // Domyślnie szukaj wszystkiego, jeśli typ jest nieznany
      }

      setLoading(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            sanitizedText
          )}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&limit=5&language=pl,en&types=${typesParam}&country=AL,AD,AT,BY,BE,BA,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IS,IE,IT,XK,LV,LI,LT,LU,MT,MD,MC,ME,NL,MK,NO,PL,PT,RO,RU,SM,RS,SK,SI,ES,SE,CH,TR,UA,GB,VA`
        );
        const data = await res.json();
        setSuggestions(data.features || []);
      } catch (error) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeout);
  }, [internalInput, searchType]); // DODANO searchType do zależności useEffect


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !isMouseInListRef.current
      ) {
        setTimeout(() => {
          setSuggestions([]);
          if (!ignoreNextSearchRef.current && internalInput.length > 0 && suggestions.length > 0) {
            handleBlurLogic();
          }
        }, 100);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [internalInput, suggestions, onSelectLocation]);

  const formatLabel = (sug) => {
    // Mapbox często zwraca pełny adres w 'place_name' lub 'text'.
    // Dla ulic i numerów, 'text' to często nazwa ulicy, a 'place_name' jest bardziej kompletny.
    // 'properties.address' może zawierać numer domu.
    const label = sug.place_name || sug.text || 'Nieznana lokalizacja';
    // Możesz dostosować, co ma być wyświetlane jako sub
    const sub = sug.context ? sug.context.map(c => c.text).filter(Boolean).join(', ') : ''; 
    return { label, sub };
  };

  const handleInputChange = (e) => {
    setInternalInput(e.target.value);
    hasUserTypedRef.current = true;
    ignoreNextSearchRef.current = false;
  };

  const handleSuggestionClick = (sug) => {
    const { label } = formatLabel(sug);
    ignoreNextSearchRef.current = true;
    hasUserTypedRef.current = false;
    
    // W zależności od searchType, onSelectLocation może potrzebować innych danych.
    // Sug.geometry.coordinates to [longitude, latitude]
    onSelectLocation(label, sug); // Przekazujemy całą sugestię, aby nadrzędny komponent mógł wyodrębnić szczegóły (ulica, numer, koordynaty)
    
    setInternalInput(label);
    setSuggestions([]);
  };

  const handleBlurLogic = () => {
    if (!isMouseInListRef.current && suggestions.length > 0 && internalInput.length > 0) {
      const firstSuggestion = suggestions[0];
      const { label: firstSuggestionLabel } = formatLabel(firstSuggestion);

      const inputLower = internalInput.toLowerCase().trim();
      const suggestionLower = firstSuggestionLabel.toLowerCase().trim();

      if (inputLower === suggestionLower || 
          (suggestions.length === 1 && suggestionLower.includes(inputLower)) ||
          suggestionLower.startsWith(inputLower)
      ) {
          handleSuggestionClick(firstSuggestion);
      } else {
          setSuggestions([]);
      }
    } else if (internalInput.length === 0) {
        // Jeśli pole jest puste, upewnij się, że w formularzu nadrzędnym też jest null dla coords
        onSelectLocation('', { geometry: { coordinates: null }, text: '', address: '' }); // Dodano puste text/address dla spójności
        setSuggestions([]);
    }
  };


  return (
    <div className={`autocomplete-container ${className || ''}`} ref={containerRef} style={style}>
      <input
        type="text"
        value={internalInput}
        onChange={handleInputChange}
        onBlur={handleBlurLogic}
        placeholder={placeholder || 'Wpisz lokalizację'} // Zmieniono placeholder
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
                key={`${sug.id || sug.text}-${Math.random()}`} // Ulepszono klucz
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