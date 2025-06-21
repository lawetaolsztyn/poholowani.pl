import { useState, useEffect, useRef } from 'react';
import './LocationAutocomplete.css';

export default function LocationAutocomplete({ value, onSelectLocation, placeholder, className, style }) {
  const [internalInput, setInternalInput] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const isMouseInListRef = useRef(false);
  const ignoreNextSearchRef = useRef(false);

  // Ta flaga będzie true TYLKO gdy internalInput zmieni się na skutek pisania przez użytkownika,
  // a nie przez prop 'value' przy inicjalizacji/aktualizacji modalu.
  const hasUserTypedRef = useRef(false);

  // Efekt do inicjalizacji internalInput z propa 'value'
  // Ten useEffect wykonuje się tylko raz na początkowe zamontowanie lub gdy 'value' się zmieni.
  useEffect(() => {
    // Ustawienie internalInput z propa.
    // Ważne: W tym momencie hasUserTypedRef pozostaje FALSE,
    // co pozwoli nam zignorować pierwsze, niechciane wyszukiwanie.
    setInternalInput(value || '');
    // Gdy component dostaje nową 'value' (np. przy edycji trasy), resetujemy hasUserTypedRef.
    // Dzięki temu, jeśli użytkownik zacznie pisać, autocomplete się aktywuje.
    hasUserTypedRef.current = false;
  }, [value]);

  // Efekt do pobierania sugestii (DZIAŁA TYLKO GDY UŻYTKOWNIK ZACZNIE PISAĆ)
  useEffect(() => {
    // Nie wyszukuj sugestii, jeśli użytkownik jeszcze nic nie wpisywał (hasUserTypedRef jest false).
    // Działa to przy inicjalizacji komponentu z propem 'value' (np. przy otwarciu modalu edycji).
    if (!hasUserTypedRef.current) {
        setSuggestions([]); // Upewnij się, że lista jest pusta
        return;
    }

    // Jeśli flaga jest ustawiona, ignoruj to wyszukiwanie (po kliknięciu na sugestję)
    if (ignoreNextSearchRef.current) {
      ignoreNextSearchRef.current = false; // Zresetuj flagę
      setSuggestions([]); // Upewnij się, że lista jest pusta
      return;
    }

    // Nie szukaj, jeśli tekst jest za krótki
    if (internalInput.length < 3) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const sanitizedText = internalInput.replace(/(\d{2})-(\d{3})/, '$1$2');

      setLoading(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            sanitizedText
          )}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&limit=5&language=pl,en&types=place,postcode&country=AL,AD,AT,BY,BE,BA,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IS,IE,IT,XK,LV,LI,LT,LU,MT,MD,MC,ME,NL,MK,NO,PL,PT,RO,RU,SM,RS,SK,SI,ES,SE,CH,TR,UA,GB,VA`
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
  }, [internalInput]); // Tylko internalInput jako zależność tutaj


  // Efekt do obsługi kliknięcia poza komponentem
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Wywołaj handleBlur tylko jeśli kliknięcie jest poza kontenerem
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !isMouseInListRef.current // Upewnij się, że mysz nie była w liście sugestii
      ) {
        // Opóźnij schowanie sugestii i auto-wybór, aby uniknąć konfliktu z handleSuggestionClick
        setTimeout(() => {
          setSuggestions([]);
          // Jeśli nie wybrano sugestii kliknięciem, spróbuj auto-wybrać
          if (!ignoreNextSearchRef.current && internalInput.length > 0 && suggestions.length > 0) {
            handleBlurLogic();
          }
        }, 100);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [internalInput, suggestions, onSelectLocation]); // Dodano zależności do handleClickOutside

  // Funkcja formatująca etykiety
  const formatLabel = (sug) => {
    const label = sug.place_name || sug.text || 'Nieznana lokalizacja';
    return { label, sub: '' };
  };

  // Obsługa zmiany wartości w polu input
  const handleInputChange = (e) => {
    setInternalInput(e.target.value);
    // Użytkownik zaczął pisać, więc ustawiamy flagę na true, aby włączyć wyszukiwanie
    hasUserTypedRef.current = true;
    ignoreNextSearchRef.current = false;
  };

  // Obsługa kliknięcia na sugestię
  const handleSuggestionClick = (sug) => {
    const { label } = formatLabel(sug);
    // Po wybraniu sugestii, nie chcemy, aby kolejne zmiany internalInput wyzwalały wyszukiwanie od razu
    ignoreNextSearchRef.current = true;
    // Po wybraniu sugestii, resetujemy hasUserTypedRef.
    // Dzięki temu, jeśli modal zostanie ponownie otwarty, nie będzie automatycznego wyszukiwania.
    hasUserTypedRef.current = false;
    onSelectLocation(label, sug);
    setInternalInput(label); // Ustawia wybraną wartość w input
    setSuggestions([]); // Natychmiast ukryj listę sugestii
  };

  // --- NOWA FUNKCJA DO LOGIKI ONBLUR ---
  const handleBlurLogic = () => {
    // Sprawdź, czy mysz nie jest w liście (użytkownik nie klikał sugestii)
    // i czy są jakieś sugestie
    // i czy input nie jest pusty
    if (!isMouseInListRef.current && suggestions.length > 0 && internalInput.length > 0) {
      const firstSuggestion = suggestions[0];
      const { label: firstSuggestionLabel } = formatLabel(firstSuggestion);

      // Proste sprawdzenie: czy wpisany tekst jest BARDZO podobny do pierwszej sugestii
      // Możesz dostosować tę logikę dopasowania, jeśli potrzebujesz większej precyzji
      const inputLower = internalInput.toLowerCase().trim();
      const suggestionLower = firstSuggestionLabel.toLowerCase().trim();

      // Warunki do auto-wyboru:
      // 1. Wpisany tekst jest identyczny z sugestią (po trimowaniu i toLowerCase)
      // 2. Wpisany tekst jest początkiem sugestii ORAZ sugestia jest jedyną pozostałą opcją
      // 3. Wpisany tekst jest bardzo blisko sugestii (np. zawiera ją)
      if (inputLower === suggestionLower || // Dokładne dopasowanie
          (suggestions.length === 1 && suggestionLower.includes(inputLower)) || // Jedna sugestia i zawiera wpisany tekst
          suggestionLower.startsWith(inputLower) // Sugestia zaczyna się od wpisanego tekstu
      ) {
          handleSuggestionClick(firstSuggestion);
      } else {
          // Jeśli żadna sugestia nie pasuje wystarczająco dobrze,
          // możesz np. wyczyścić pole, albo zostawić je z wpisanym tekstem, ale bez coords.
          // Obecnie, po prostu nie wybieramy sugestii.
          // Tutaj możemy opcjonalnie wywołać onSelectLocation z null coords
          // jeśli chcemy jawnie zresetować wartość w formularzu nadrzędnym.
          // onSelectLocation(internalInput, { geometry: { coordinates: null } });
          setSuggestions([]); // Ukryj sugestie
      }
    } else if (internalInput.length === 0) {
        // Jeśli pole jest puste, upewnij się, że w formularzu nadrzędnym też jest null dla coords
        onSelectLocation('', { geometry: { coordinates: null } });
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
                key={`${sug.id || sug.text}-${Math.random()}`}
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