// src/SearchRoutes.jsx
import React, { useEffect, useState, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Polyline, Popup, Pane, useMap, useMapEvents } from 'react-leaflet';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import Navbar from './components/Navbar';
import Header from './components/Header';
import LocationAutocomplete from './components/LocationAutocomplete';
import RouteSlider from './RouteSlider';
import L from 'leaflet';
import RoadsideMarkers from './components/RoadsideMarkers';
import './SearchRoutes.css';
import 'leaflet-gesture-handling/dist/leaflet-gesture-handling.css';
import { GestureHandling } from 'leaflet-gesture-handling';
import 'leaflet-gesture-handling';


const MapContext = createContext(null);

function MapEvents() {
    const map = useMap();
    const { setCenter, resetTrigger } = useContext(MapContext);

    useEffect(() => {
        // Ta funkcja jest głównie do aktualizacji stanu 'center' na podstawie geolokalizacji.
        // Nie powinna zmieniać widoku mapy.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCenter([position.coords.latitude, position.coords.longitude]);
                },
                () => {
                    setCenter([52.2297, 21.0122]); // Warszawa jako fallback
                }
            );
        } else {
            setCenter([52.2297, 21.0122]); // Warszawa jako 
        }
    }, [resetTrigger, setCenter]);

    useMapEvents({
        moveend: (event) => {
            const newCenter = event.target.getCenter();
            setCenter([newCenter.lat, newCenter.lng]);
        },
    });

    return null;
}

function MapAutoZoom({ fromLocation, toLocation, trigger, selectedRoute, selectedRouteTrigger, mapMode, filteredRoutes }) {
  const map = useMap();

  // Ujednolicony useEffect do zarządzania zoomem mapy w trybie 'search'
  useEffect(() => {
    console.log('MapAutoZoom: Uruchomiono główny efekt zooma.', { mapMode, filteredRoutesCount: filteredRoutes.length, selectedRouteId: selectedRoute?.id, fromLoc: fromLocation?.name, toLoc: toLocation?.name, trigger });

    // Jeśli tryb to 'grid', nie robimy nic w tym efekcie - MapViewAndInteractionSetter ustawi domyślny widok.
    if (mapMode === 'grid') {
      return;
    }

    // --- Logika zoomowania w trybie 'search' ---
    let coordsToFit = [];
    let zoomExecuted = false;

    // Priorytet 1: Zoom do wybranej trasy (gdy użytkownik klika kafelek)
    if (selectedRoute && selectedRoute.geojson?.features?.[0]?.geometry?.coordinates) {
      console.log('MapAutoZoom: Zoom do wybranej trasy (selectedRoute).');
      coordsToFit = selectedRoute.geojson.features[0].geometry.coordinates
        .filter(pair => Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'number' && !isNaN(pair[0]) && typeof pair[1] === 'number' && !isNaN(pair[1]))
        .map(([lng, lat]) => [lat, lng]);

      if (coordsToFit.length > 1) {
        const bounds = L.latLngBounds(coordsToFit);
        map.fitBounds(bounds.pad(0.1), { padding: [80, 80], maxZoom: 12 });
        zoomExecuted = true;
      } else {
        console.warn('MapAutoZoom: selectedRoute ma niewystarczające/nieprawidłowe koordynaty dla fitBounds.', selectedRoute.id);
      }
    }

    // Priorytet 2: Zoom do wszystkich przefiltrowanych tras (jeśli nie wybrano konkretnej)
    // Wykonuje się tylko, jeśli zoom jeszcze nie nastąpił przez selectedRoute
    if (!zoomExecuted && filteredRoutes && filteredRoutes.length > 0) {
      console.log('MapAutoZoom: Zoom do wszystkich przefiltrowanych tras (filteredRoutes).');
      filteredRoutes.forEach(route => {
        const coords = route.geojson?.features?.[0]?.geometry?.coordinates;
        if (coords && Array.isArray(coords)) {
          coords.forEach(coordPair => {
            if (Array.isArray(coordPair) && coordPair.length === 2) {
              const [lng, lat] = coordPair;
              if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng)) {
                allCoords.push([lat, lng]);
              }
            }
          });
        }
      });

      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds.pad(0.1), { padding: [80, 80], maxZoom: 12 });
        zoomExecuted = true;
      } else {
          console.warn('MapAutoZoom: filteredRoutes (po filtracji) nie zawiera prawidłowych koordynat. Nie ustawiam bounds.');
      }
    }

    // Priorytet 3: Zoom do punktów początkowego/końcowego (jeśli nie ma tras)
    // Wykonuje się tylko, jeśli zoom jeszcze nie nastąpił
    if (!zoomExecuted) {
        if (fromLocation && toLocation) {
            console.log('MapAutoZoom: Zoom do fromLocation i toLocation.');
            const bounds = L.latLngBounds(
                [fromLocation.lat, fromLocation.lng],
                [toLocation.lat, toLocation.lng]
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
            zoomExecuted = true;
        } else if (fromLocation) {
            console.log('MapAutoZoom: Zoom do fromLocation.');
            map.setView([fromLocation.lat, fromLocation.lng], 7);
            zoomExecuted = true;
        } else if (toLocation) {
            console.log('MapAutoZoom: Zoom do toLocation.');
            map.setView([toLocation.lat, toLocation.lng], 7);
            zoomExecuted = true;
        }
    }

    // Opcjonalnie: Jeśli żaden zoom nie nastąpił, a jesteśmy w trybie search, ustaw domyślny widok
    if (!zoomExecuted && mapMode === 'search') {
        console.log('MapAutoZoom: Brak tras/punktów, ustawiam domyślny widok w trybie search.');
        map.setView([51.0504, 13.7373], 5); // Np. centrum Polski/Europy
    }


  // Zależności dla tego ujednoliconego efektu:
  // Trigger jest dodany, aby wymusić ponowne wykonanie efektu po każdym wyszukiwaniu,
  // nawet jeśli dane filteredRoutes czy selectedRoute są referencyjnie takie same.
  }, [map, mapMode, filteredRoutes, selectedRoute, fromLocation, toLocation, trigger, selectedRouteTrigger]);

  return null;
}
const HighlightedRoute = React.memo(function HighlightedRoute({ route, isHovered, onPolylineMouseOver, onPolylineMouseOut }) {
    const popupRef = useRef(null);
    const map = useMap();
    const closeTimeoutRef = useRef(null);

    let coords = [];
    if (route.geojson?.features?.[0]?.geometry?.coordinates) {
  // console.warn('Trasa bez danych geojson:', route.id, route);       //
 const rawCoords = route.geojson.features[0].geometry.coordinates;
        if (Array.isArray(rawCoords)) {
            coords = rawCoords
                .filter(coordPair =>
                    Array.isArray(coordPair) &&
                    coordPair.length === 2 &&
                    typeof coordPair[0] === 'number' && !isNaN(coordPair[0]) &&
                    typeof coordPair[1] === 'number' && !isNaN(coordPair[1])
                )
                .map(([lng, lat]) => [lat, lng]);
        }
    }

    if (coords.length === 0) return null;

    return (
        <Polyline
      positions={coords}
      pane={isHovered ? 'hovered' : 'routes'}
      pathOptions={{ color: isHovered ? 'red' : 'blue', weight: isHovered ? 6 : 5 }}
      eventHandlers={{
        mouseover: (e) => {
          if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }
          e.target.setStyle({ color: 'red' });
          if (popupRef.current) {
            popupRef.current.setLatLng(e.latlng).openOn(map);
          }
          if (onPolylineMouseOver) onPolylineMouseOver(route.id);
        },
        mouseout: (e) => {
          e.target.setStyle({ color: 'blue' });
          closeTimeoutRef.current = setTimeout(() => {
            if (popupRef.current) {
              popupRef.current.close();
            }
            closeTimeoutRef.current = null;
          }, 1600);
          if (onPolylineMouseOut) onPolylineMouseOut(null);
        },
        mousemove: (e) => {
          if (popupRef.current && popupRef.current.isOpen()) {
            popupRef.current.setLatLng(e.latlng);
          }
        }
      }}
    >

            <Popup ref={popupRef} autoClose={false} closeOnMouseOut={false} closeButton={false}>
        <div style={{ fontSize: '14px', lineHeight: '1.4', backgroundColor: 'white', padding: '4px', borderRadius: '5px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            <strong>Z:</strong> {route.from_city?.split(',')[0]}<br />
            <strong>Do:</strong> {route.to_city?.split(',')[0]}
          </div>
          <div style={{ marginBottom: '6px' }}>📅 {route.date}</div>
          <div style={{ marginBottom: '6px' }}>📦 {route.load_capacity || '–'}</div>
          <div style={{ marginBottom: '6px' }}> {route.passenger_count || '–'}</div>
          <div style={{ marginBottom: '6px' }}>🚚 {route.vehicle_type === 'laweta' ? 'Laweta' : 'Bus'}</div>
           {route.phone && (
            <div style={{ marginBottom: '10px' }}>
              📞 Telefon: <strong style={{ letterSpacing: '1px' }}>
                <a href={`tel:${route.phone}`} style={{ color: '#007bff', textDecoration: 'none' }}> {/* Link telefoniczny */}
                  {route.phone}
                </a>
              </strong>
              {route.uses_whatsapp && ( // Sprawdzamy czy uses_whatsapp jest true
                <div style={{ marginTop: '4px' }}>
                  <a
                    href={`https://wa.me/${route.phone.replace(/\D/g, '')}`} // Generujemy link WhatsApp
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: '#25D366', fontWeight: 'bold' }} // Stylizacja dla WhatsApp
                  >
                    🟢 WhatsApp
                  </a>
                </div>
              )}
            </div>
          )}
        {route.messenger_link && (
  <div style={{ marginTop: '4px' }}>
    <a
      href={route.messenger_link}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: '#0084FF', fontWeight: 'bold' }}
    >
      🔵 Messenger
    </a>
  </div>
)}

                    {route.user_id && route.users_extended?.nip && (
  <div>
    <div style={{ marginBottom: '8px' }}>
      <span title="Zarejestrowana firma" style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: '#007bff', color: '#FFC107', borderRadius: '5px', fontSize: '14px', fontWeight: 'bold' }}>
        🏢 Firma
      </span>
    </div>
    <strong>Profil przewoźnika:</strong>{' '}
    <a href={`https://poholowani.pl/profil/${route.user_id}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 'bold' }}>
      otwórz
    </a>
                    </div>
                )}

                </div>
            </Popup>
        </Polyline>
    );
});

const StaticRoutePolyline = React.memo(function StaticRoutePolyline({ route }) {
    let coords = [];
    if (route.geojson?.features?.[0]?.geometry?.coordinates) {
        const rawCoords = route.geojson.features[0].geometry.coordinates;
        if (Array.isArray(rawCoords)) {
            coords = rawCoords
                .filter(coordPair =>
                    Array.isArray(coordPair) &&
                    coordPair.length === 2 &&
                    typeof coordPair[0] === 'number' && !isNaN(coordPair[0]) &&
                    typeof coordPair[1] === 'number' && !isNaN(coordPair[1])
                )
                .map(([lng, lat]) => [lat, lng]);
        }
    }
    if (coords.length === 0) return null;

    return (
        <Polyline
            positions={coords}
            pane="routes"
            pathOptions={{
                color: 'blue',
                weight: 4,
                opacity: 1
            }}
        />
    );
});

// Nowy komponent do zarządzania widokiem i interakcjami mapy
function MapViewAndInteractionSetter({ mapMode }) {
    const map = useMap();

    useEffect(() => {
        console.log(`MapViewAndInteractionSetter: mapMode changed to ${mapMode}`);
        if (mapMode === 'grid') {
            map.setView([49.45, 11.07], 5); // Centrum Europy (Polska), zoom 5
            map.setMaxZoom(5);
            map.setMinZoom(5);

            // Wyłącz interakcje
            map.dragging.disable();
            map.touchZoom.disable();
            map.scrollWheelZoom.disable();
            map.doubleClickZoom.disable();
            map.boxZoom.disable();
            map.keyboard.disable();
            if (map.tap) map.tap.disable(); // `tap` może nie istnieć na wszystkich mapach
            if (map.gestureHandling) map.gestureHandling.disable();
            console.log("MapViewAndInteractionSetter: Interakcje mapy WYŁĄCZONE.");

        } else { // mapMode === 'search'
            map.setMaxZoom(19); // Pełny zakres zoomu
            map.setMinZoom(0); // Pełny zakres zoomu

            // Włącz interakcje
            map.dragging.enable();
            map.touchZoom.enable();
            map.scrollWheelZoom.enable();
            map.doubleClickZoom.enable();
            map.boxZoom.enable();
            map.keyboard.enable();
            if (map.tap) map.tap.enable();
            if (map.gestureHandling) map.gestureHandling.enable();
            console.log("MapViewAndInteractionSetter: Interakcje mapy WŁĄCZONE.");
        }
    }, [mapMode, map]); // Zależność od 'map' jest kluczowa

    return null;
}


function SearchRoutes() {
    const [center, setCenter] = useState([49.45, 11.07]);
    const [allRoutes, setAllRoutes] = useState([]);
    const [filteredRoutes, setFilteredRoutes] = useState([]);
    const [hoveredRouteId, setHoveredRouteId] = useState(null);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [selectedRouteTrigger, setSelectedRouteTrigger] = useState(0);
    const [fromLocation, setFromLocation] = useState(null);
    const [toLocation, setToLocation] = useState(null);
    const [fromValue, setFromValue] = useState('');
    const [toValue, setToValue] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [searchTrigger, setSearchTrigger] = useState(0);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const mapRef = useRef(null); // Używany do przechwycenia instancji mapy
    const today = new Date().toISOString().split('T')[0];

    const [mapMode, setMapMode] = useState('grid'); // Domyślnie tryb siatki

    // Efekt do początkowego pobierania tras dla trybu "grid" i obsługi zmian w czasie rzeczywistym
useEffect(() => {
    const fetchAllRoutesForGrid = async () => {
        setIsLoading(true); // Włącz stan ładowania
        const { data, error } = await supabase
            .from('routes')
            .select(`
                *,
                users_extended (
                    id,
                    nip,
                    role,
                    is_premium
                )
            `); // Pobieramy wszystkie trasy z informacjami o użytkownikach

        if (error) {
            console.error('Błąd podczas pobierania wszystkich tras dla trybu siatki:', error);
        } else {
            console.log('Supabase fetched all data for grid. Count:', data.length);
            const parsed = data.map(route => ({
                ...route,
                // GeoJSON może być już obiektem, ale dodaj zabezpieczenie na wypadek stringa
                geojson: typeof route.geojson === 'string' ? JSON.parse(route.geojson) : route.geojson,
                // Rekonstrukcja obiektu users_extended.
                // Funkcja .select() zwraca users_extended jako zagnieżdżony obiekt, ale z własnymi ID itp.
                // Upewniamy się, że users_extended istnieje, zanim spróbujemy dostać się do jego właściwości.
                users_extended: route.users_extended ? {
                    id: route.users_extended.id,
                    nip: route.users_extended.nip,
                    role: route.users_extended.role,
                    is_premium: route.users_extended.is_premium
                } : null
            }));
            setAllRoutes(parsed);
            // Bardzo ważne: ustawiamy filteredRoutes na allRoutes na starcie,
            // aby mapa i slider pokazywały wszystkie trasy w trybie grid
            setFilteredRoutes(parsed);
        }
        setIsLoading(false); // Wyłącz stan ładowania
    };

    fetchAllRoutesForGrid(); // Wywołaj funkcję przy pierwszym renderowaniu

    // Subskrypcja kanału dla aktualizacji w czasie rzeczywistym,
    // aby tryb "grid" również był dynamiczny
    const channel = supabase
        .channel('public:routes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, payload => {
            fetchAllRoutesForGrid(); // Ponownie pobierz wszystkie trasy po zmianie w bazie
        })
        .subscribe();

    // Funkcja czyszcząca przy odmontowaniu komponentu
    return () => {
        supabase.removeChannel(channel);
    };
}, []); // Pusta tablica zależności, uruchamia się tylko raz przy montowaniu komponentu

    const handleRouteClick = (route) => {
        setSelectedRoute(route); 
        setSelectedRouteTrigger(prev => prev + 1);
    };
   

   // src/SearchRoutes.jsx - w komponencie SearchRoutes
useEffect(() => {
    if (mapMode === 'search' && filteredRoutes.length >= 1 && mapRef.current) {
        const allCoords = [];

        filteredRoutes.forEach(route => {
            const coords = route.geojson?.features?.[0]?.geometry?.coordinates;
            if (coords && Array.isArray(coords)) {
                coords.forEach(coordPair => { // <--- Zmieniono na iterację po parze
                    if (Array.isArray(coordPair) && coordPair.length === 2) { // Dodatkowe sprawdzenie
                        const [lng, lat] = coordPair; // Destrukturyzacja dla czytelności
                        if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng)) { // <--- DODANO !isNaN
                            allCoords.push([lat, lng]); // <--- POPRAWIONO NA [lat, lng]
                        } else {
                            console.warn('SearchRoutes useEffect main: Wykryto nieprawidłową parę współrzędnych (nie-liczba/NaN):', coordPair, 'dla trasy ID:', route.id);
                        }
                    } else {
                        console.warn('SearchRoutes useEffect main: Nieprawidłowy format współrzędnych (nie tablica pary):', coordPair, 'dla trasy ID:', route.id);
                    }
                });
            } else {
                console.warn('SearchRoutes useEffect main: Trasa ma problem z GeoJSON (brak coords) dla ID:', route.id);
            }
        });

        if (allCoords.length > 0) {
            const bounds = L.latLngBounds(allCoords);
            mapRef.current.fitBounds(bounds.pad(0.1), { padding: [80, 80], maxZoom: 12 });
        } else {
            console.warn('SearchRoutes useEffect main: allCoords jest puste po filtracji, nie ustawiam bounds.');
        }
    }
}, [filteredRoutes, mapMode]);


 const handleSearchClick = useCallback(async () => {
    setIsLoading(true); // Włącz stan ładowania
    setSelectedRoute(null); // Wyczyść wybraną trasę przy nowym wyszukiwaniu

    // Upewnij się, że data jest w poprawnym formacie 'YYYY-MM-DD'.
    // Input type="date" zazwyczaj już to zapewnia.
    const formattedDate = selectedDate || null;

    // Określamy domyślny promień dla punktu pośredniego (via_point),
    // jeśli nie masz pola w formularzu wyszukiwania do jego ustawiania.
    // 5000 metrów = 5 km.
    const defaultRadiusForVia = 5000;

console.log("Parametry wysyłane do search_routes:");
    console.log("p_from_lat:", fromLocation?.lat);
    console.log("p_from_lng:", fromLocation?.lng);
    console.log("p_to_lat:", toLocation?.lat);
    console.log("p_to_lng:", toLocation?.lng);
    console.log("p_date:", formattedDate);
    console.log("p_vehicle_type:", vehicleType);
    console.log("p_radius_meters:", defaultRadiusForVia);

    // Wywołujemy funkcję bazodanową Supabase 'search_routes'
    const { data, error } = await supabase.rpc('search_routes', {
        p_from_lat: fromLocation?.lat || null, // latitude punktu początkowego
        p_from_lng: fromLocation?.lng || null, // longitude punktu początkowego
        p_to_lat: toLocation?.lat || null,     // latitude punktu końcowego
        p_to_lng: toLocation?.lng || null,     // longitude punktu końcowego
        p_via_lat: null, // Na razie brak pola "Via" w wyszukiwarce, więc null
        p_via_lng: null, // Na razie brak pola "Via" w wyszukiwarce, więc null
        p_date: formattedDate,          // Data z formularza
        p_vehicle_type: vehicleType || null, // Typ pojazdu z formularza
        p_radius_meters: defaultRadiusForVia // Promień dla via_point
    });

    if (error) {
        console.error('Błąd podczas wyszukiwania tras w Supabase:', error);
        setFilteredRoutes([]); // W przypadku błędu, wyczyść trasy
    } else {
        console.log('Supabase search_routes zwróciło dane. Ilość:', data.length, 'Dane:', data);

        // Przetwarzamy dane zwrócone przez funkcję Supabase
        // Musimy zrekonstruować obiekt `users_extended`, bo Supabase RPC zwraca płaskie kolumny
        const parsedRoutes = data.map(route => ({
            ...route,
            // Sprawdzenie, czy geojson jest stringiem i parsowanie, jeśli tak
            geojson: typeof route.geojson === 'string' ? JSON.parse(route.geojson) : route.geojson,
            // Tworzymy zagnieżdżony obiekt users_extended z płaskich kolumn
            users_extended: {
                id: route.users_extended_id,
                nip: route.users_extended_nip,
                role: route.users_extended_role,
                is_premium: route.users_extended_is_premium
            }
        }));
        setFilteredRoutes(parsedRoutes); // Ustawiamy przefiltrowane trasy
        setMapMode('search'); // Przełączamy mapę w tryb wyszukiwania
        setSearchTrigger(prev => prev + 1); // Wyzwalamy zoom mapy
        if (parsedRoutes.length > 0) {
            setSelectedRoute(parsedRoutes[0]); // Wybieramy pierwszą trasę, jeśli są wyniki
            setSelectedRouteTrigger(prev => prev + 1);
        }
    }
    setIsLoading(false); // Wyłącz stan ładowania
}, [fromLocation, toLocation, selectedDate, vehicleType]); // Te stany są zależnościami dla useCallback

    const handleResetClick = () => {
    console.log("Przycisk Reset kliknięty. Ustawiam mapMode na 'grid'.");
    // Czyścimy wszystkie stany formularza wyszukiwania
    setFromLocation(null);
    setToLocation(null);
    setFromValue('');
    setToValue('');
    setVehicleType('');
    setSelectedDate('');
    setSearchTrigger(0); // Zresetuj trigger wyszukiwania

    setMapMode('grid'); // Przełącz mapę w tryb siatki
    // Bardzo ważne: po resecie chcemy, aby filteredRoutes ponownie pokazywało WSZYSTKIE trasy,
    // które są już w stanie allRoutes (pobierane na starcie aplikacji)
    setFilteredRoutes(allRoutes);
    setSelectedRoute(null); // Wyczyść wybraną trasę na mapie
    setSelectedRouteTrigger(prev => prev + 1); // Zresetuj trigger, aby mapa mogła się wycentrować na widoku grid
    setResetTrigger(prev => prev + 1); // Wyzwalamy reset w MapEvents i MapViewAndInteractionSetter
};

    return (
        <>
            <Navbar />

            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)', width: '100%', boxSizing: 'border-box', overflowY: 'auto', paddingBottom: '0px' }}>

                <div className="search-form-container">
                    <LocationAutocomplete
                        placeholder="Skąd"
                        value={fromValue}
                        onSelectLocation={(label, loc) => {
                            const name = loc?.properties?.locality || loc?.properties?.name || '';
                            const lat = loc?.geometry?.coordinates?.[1];
                            const lng = loc?.geometry?.coordinates?.[0];

                            if (typeof lat === 'number' && typeof lng === 'number') {
                                setFromValue(label);
                                setFromLocation({ name, lat, lng });
                            } else {
                                console.warn("Nieprawidłowe współrzędne dla wybranej lokalizacji Skąd:", loc);
                                setFromValue('');
                                setFromLocation(null);
                            }
                        }}
                        className="location-autocomplete-field"
                    />
                    <LocationAutocomplete
                        placeholder="Dokąd"
                        value={toValue}
                        onSelectLocation={(label, loc) => {
                            const name = loc?.properties?.locality || loc?.properties?.name || '';
                            const lat = loc?.geometry?.coordinates?.[1];
                            const lng = loc?.geometry?.coordinates?.[0];

                            if (typeof lat === 'number' && typeof lng === 'number') {
                                setToValue(label);
                                setToLocation({ name, lat, lng });
                            } else {
                                console.warn("Nieprawidłowe współrzędne dla wybranej lokalizacji Dokąd:", loc);
                                setToValue('');
                                setToLocation(null);
                            }
                        }}
                       className="location-autocomplete-field"
                    />
                    <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="form-select-field">
                        <option value="">Typ pojazdu</option>
                        <option value="bus">🚌 Bus</option>
                        <option value="laweta">🚚 Laweta</option>

                    </select>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="form-date-field"
                        min={today}
                    />
                    <button type="button" onClick={handleSearchClick} className="search-button">Szukaj</button>
                    <button type="button" onClick={handleResetClick} className="reset-button">
                        Reset
                    </button>
                </div>
                <div style={{ position: 'relative', width: '98%', height: '550px', margin: '0 auto', marginBottom: '10px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                    <MapContext.Provider value={{ center, setCenter, resetTrigger }}>
                        <MapContainer
                            // Ustawienia początkowe, które zostaną nadpisane przez MapViewAndInteractionSetter
                            center={[51.0504, 13.7373]} // Początkowe centrum
                            zoom={5} // Początkowy zoom
                            maxZoom={19} // Pełny zakres
                            minZoom={0} // Pełny zakres
                            // Interakcje są teraz kontrolowane przez MapViewAndInteractionSetter
                           
                            gestureHandling={true}
                            whenCreated={mapInstance => {
                                mapRef.current = mapInstance;
                                // Initial setup is now in MapViewAndInteractionSetter's first render logic
                            }}
                            gestureHandlingOptions={{
                                touch: true,
                                text: 'Użyj dwóch palców, aby przesunąć mapę',
                                duration: 1000,
                                tap: false,
                                twoFingerPan: true,
                            }}
                            className="main-map-container"
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Pane name="routes" style={{ zIndex: 400 }} />
                            <Pane name="hovered" style={{ zIndex: 500 }} />

                            <MapEvents />
                            <MapAutoZoom
                                fromLocation={fromLocation}
                                toLocation={toLocation}
                                trigger={searchTrigger}
                                selectedRoute={selectedRoute}
                                selectedRouteTrigger={selectedRouteTrigger}
                                mapMode={mapMode}
				filteredRoutes={filteredRoutes}
                            />
                            {/* === Nowy komponent, który zarządza widokiem i interakcjami === */}
                            <MapViewAndInteractionSetter mapMode={mapMode} />

                            {center && mapMode === 'search' && (<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 999, fontSize: '32px', color: 'red', pointerEvents: 'none' }}>+</div>)}

                            {isLoading ? (
  <div style={{
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)', zIndex: 600,
    backgroundColor: 'rgba(255,255,255,0.8)', padding: '20px',
    borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
  }}>
    Ładowanie tras...
  </div>
) : (
  mapMode === 'grid' ? (
    allRoutes.map((route) => (
      <StaticRoutePolyline key={route.id} route={route} />
    ))
  ) : (
    <>
      {/* Renderujemy WSZYSTKIE trasy oprócz tej hoverowanej */}
      {filteredRoutes.map((route) => {
        if (route.id === hoveredRouteId) return null;
        return (
          <HighlightedRoute
            key={route.id}
            route={route}
            isHovered={false}
            onPolylineMouseOver={setHoveredRouteId}
            onPolylineMouseOut={setHoveredRouteId}
          />
        );
      })}

      {/* Renderujemy osobno hoverowaną trasę NA WIERZCHU */}
      {hoveredRouteId && (
        <HighlightedRoute
          key={'hovered-' + hoveredRouteId}
          route={filteredRoutes.find(r => r.id === hoveredRouteId)}
          isHovered={true}
          onPolylineMouseOver={setHoveredRouteId}
          onPolylineMouseOut={setHoveredRouteId}
        />
      )}
    </>
  )
)}


                            {mapMode === 'search' && <RoadsideMarkers />}

                        </MapContainer>
                    </MapContext.Provider>
                </div>
                {mapMode === 'search' && (
                    <div style={{ width: '98%', margin: '0 auto 20px auto', padding: '0px 10px 10px 10px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                        <RouteSlider
                            routes={filteredRoutes}
                            onHover={(id) => setHoveredRouteId(id)}
                            onClickRoute={handleRouteClick}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

export default SearchRoutes;