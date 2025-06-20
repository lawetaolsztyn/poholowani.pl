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
            setCenter([52.2297, 21.0122]); // Warszawa jako fallback
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

  // Zoom do from/to albo selectedRoute — jak wcześniej
  useEffect(() => {
    if (mapMode === 'search') {
      if (fromLocation && toLocation) {
        const bounds = L.latLngBounds(
          [fromLocation.lat, fromLocation.lng],
          [toLocation.lat, toLocation.lng]
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      } else if (fromLocation) {
        map.setView([fromLocation.lat, fromLocation.lng], 7);
      } else if (toLocation) {
        map.setView([toLocation.lat, toLocation.lng], 7);
      }
    }
  }, [trigger, mapMode, fromLocation, toLocation, map]);

  // Zoom do wybranej trasy (selectedRoute) — jak wcześniej
 
useEffect(() => {
 if (mapMode === 'search' && selectedRoute?.geojson?.features?.[0]?.geometry?.coordinates) {
   const coords = selectedRoute.geojson.features[0].geometry.coordinates
     .filter(pair => // <--- DODANO PEŁNĄ WALIDACJĘ
         Array.isArray(pair) &&
         pair.length === 2 &&
         typeof pair[0] === 'number' && !isNaN(pair[0]) &&
         typeof pair[1] === 'number' && !isNaN(pair[1])
     )
     .map(([lng, lat]) => [lat, lng]);

   if (coords.length > 1) { // Sprawdzenie, czy po filtracji pozostało wystarczająco dużo punktów
     const bounds = L.latLngBounds(coords);
     const paddedBounds = bounds.pad(0.1);
     map.fitBounds(paddedBounds, { padding: [80, 80], maxZoom: 12 });
   } else {
       console.warn('MapAutoZoom selectedRoute: Brak wystarczającej liczby prawidłowych współrzędnych dla trasy ID:', selectedRoute.id);
   }
 }
}, [selectedRoute, mapMode, map]);


  // NOWY EFEKT: Zoom do WSZYSTKICH tras w filteredRoutes
// src/SearchRoutes.jsx - w komponencie MapAutoZoom
useEffect(() => {
  console.log('MapAutoZoom: Zoom do wszystkich tras', filteredRoutes.length);
  if (mapMode === 'search' && filteredRoutes && filteredRoutes.length > 1) {
    const allCoords = [];
    filteredRoutes.forEach(route => {
      const coords = route.geojson?.features?.[0]?.geometry?.coordinates;
      if (coords && Array.isArray(coords)) {
        coords.forEach(coordPair => { // <--- Zmieniono na iterację po parze
          if (Array.isArray(coordPair) && coordPair.length === 2) { // Dodatkowe sprawdzenie
              const [lng, lat] = coordPair; // Destrukturyzacja dla czytelności
              if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng)) { // <--- DODANO !isNaN
                allCoords.push([lat, lng]);
              } else {
                console.warn('MapAutoZoom filteredRoutes: Wykryto nieprawidłową parę współrzędnych (nie-liczba/NaN):', coordPair, 'dla trasy ID:', route.id);
              }
          } else {
              console.warn('MapAutoZoom filteredRoutes: Nieprawidłowy format współrzędnych (nie tablica pary):', coordPair, 'dla trasy ID:', route.id);
          }
        });
      } else {
          console.warn('MapAutoZoom filteredRoutes: Trasa ma problem z GeoJSON (brak coords) dla ID:', route.id);
      }
    });

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      console.log('MapAutoZoom Bounds:', bounds.toBBoxString());
      map.fitBounds(bounds.pad(0.1), { padding: [80, 80], maxZoom: 12 });
    } else {
        console.warn('MapAutoZoom filteredRoutes: allCoords jest puste po filtracji, nie ustawiam bounds.');
    }
  }
}, [filteredRoutes, mapMode, map]);


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
    if (!map) return;

    if (mapMode === 'grid') {
        map.setView([49.45, 11.07], 5);
        map.setMinZoom(5);
        map.setMaxZoom(5);

        // WŁĄCZ tylko przesuwanie dwoma palcami
        map.dragging.enable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();

        if (map.tap) map.tap.disable();
        if (map.touchZoom) {
            map.touchZoom.enable(); // WYMAGANE
            map.touchZoom._zoom = false; // WYŁĄCZA zoom gestami
        }

        if (map.gestureHandling) map.gestureHandling.enable();

    } else {
        map.setMinZoom(0);
        map.setMaxZoom(19);

        map.dragging.enable();
        map.touchZoom.enable();
        map.scrollWheelZoom.enable();
        map.doubleClickZoom.enable();
        map.boxZoom.enable();
        map.keyboard.enable();
        if (map.tap) map.tap.enable();
        if (map.gestureHandling) map.gestureHandling.enable();
    }
}, [mapMode, map]);
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

    // Efekt do pobierania tras z Supabase
    useEffect(() => {
        const fetchRoutes = async () => {
            setIsLoading(true);
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
                `);

            if (error) {
                console.error('Błąd podczas pobierania tras:', error);
           } else {
    console.log('Supabase fetched data. Count:', data.length, 'Data:', data);

    const parsed = data.map(route => ({
        ...route,
        geojson: typeof route.geojson === 'string' ? JSON.parse(route.geojson) : route.geojson
    }));

    console.log('PO PARSOWANIU GEOJSON:', parsed);
    setAllRoutes(parsed);



            }
            setIsLoading(false);
        };

        fetchRoutes();

        const channel = supabase
            .channel('public:routes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, payload => {
                fetchRoutes();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleRouteClick = (route) => {
        setSelectedRoute(route); 
        setSelectedRouteTrigger(prev => prev + 1);
    };

    const routesToDisplayOnMap = useMemo(() => {
        console.log('--- Recalculating routesToDisplayOnMap ---');
        console.log('Current allRoutes.length:', allRoutes.length);
        console.log('Current mapMode:', mapMode);
        if (mapMode === 'grid') {
            console.log('mapMode: grid - displaying all routes');
            return allRoutes;
        }

        console.log('mapMode: search');

        if (allRoutes.length === 0) {
            console.log('No allRoutes data');
            return [];
        }

        let routesAfterLocationFilter = [];

        if (!fromLocation && !toLocation) {
            console.log("Tryb SEARCH: LOKALIZACJE PUSTE. Filtruj po typie pojazdu/dacie dla WSZYSTKICH tras.");
            routesAfterLocationFilter = allRoutes;
        } else {
            routesAfterLocationFilter = allRoutes.filter((route) => {
                const rawGeo = route.geojson?.features?.[0]?.geometry?.coordinates;
                const detourKm = parseInt(route.max_detour_km || 0);

                if (!rawGeo || !Array.isArray(rawGeo)) {
                    console.warn(`Skipping route ${route.id} due to missing or invalid rawGeo.`);
                    return false;
                }

                // ZMODYFIKOWANY BLOK FILTROWANIA
                const geo = rawGeo.filter(pair => {
                    if (!Array.isArray(pair) || pair.length !== 2) {
                        return false;
                    }
                    const lng = parseFloat(pair[0]); // Jawne parsowanie na liczbę
                    const lat = parseFloat(pair[1]); // Jawne parsowanie na liczbę

                    // Sprawdzenie, czy po parsowaniu są to poprawne liczby
                    return typeof lng === 'number' && !isNaN(lng) &&
                           typeof lat === 'number' && !isNaN(lat);
                }).map(pair => [parseFloat(pair[0]), parseFloat(pair[1])]); // Upewnienie się, że wszystkie elementy w końcowej tablicy są floatami

                // DEBUG LOG: Dodano logi dla problematycznej trasy
                if (route.id === 'd23b63bf-0a81-4922-91f5-d6cf285c6bd1') {
                    console.log(`DEBUG: Route ${route.id} - rawGeo:`, rawGeo);
                    console.log(`DEBUG: Route ${route.id} - filtered geo:`, geo);
                    console.log(`DEBUG: Route ${route.id} - geo.length:`, geo.length);
                }
                // KONIEC DEBUG LOGÓW

                if (geo.length < 2) { // turf.lineString potrzebuje co najmniej 2 punktów
                    console.warn(`Skipping route ${route.id} due to insufficient valid coordinates after filtering. Filtered length: ${geo.length}`);
                    return false;
                }

                if (detourKm === 0) { // Jeśli detourKm jest 0, żaden punkt nie może być w zasięgu.
                    console.warn(`Skipping route ${route.id} because max_detour_km is 0.`);
                    return false;
                }

                try {
                    const routeLine = turf.lineString(geo); // <--- Tutaj wcześniej był błąd

                    const checkPointInRange = (pointObj) => {
                        if (!pointObj || !pointObj.lat || !pointObj.lng) return false;
                        const userPoint = turf.point([pointObj.lng, pointObj.lat]);
                        const snapped = turf.nearestPointOnLine(routeLine, userPoint);
                        const dist = turf.distance(userPoint, snapped, { units: 'kilometers' });
                        return dist <= detourKm;
                    };

                    if (fromLocation && toLocation) {
                        const fromPoint = turf.point([fromLocation.lng, fromLocation.lat]);
                        const toPoint = turf.point([toLocation.lng, toLocation.lat]);
                        const fromSnap = turf.nearestPointOnLine(routeLine, fromPoint, { units: 'kilometers' });
                        const toSnap = turf.nearestPointOnLine(routeLine, toPoint, { units: 'kilometers' });

                        const fromDist = turf.distance(fromPoint, fromSnap, { units: 'kilometers' });
                        const toDist = turf.distance(toPoint, toSnap, { units: 'kilometers' });

                        const fromPos = fromSnap.properties.location;
                        const toPos = toSnap.properties.location;

                        const isInRange = fromDist <= detourKm && toDist <= detourKm;
                        const isCorrectOrder = fromPos < toPos;

                        console.log(`Route ID: ${route.id}, FromDist: ${fromDist.toFixed(2)}, ToDist: ${toDist.toFixed(2)}, isInRange: ${isInRange}, isCorrectOrder: ${isCorrectOrder}`);
                        return isInRange && isCorrectOrder;
                    } else if (fromLocation) {
                        console.log(`Route ID: ${route.id}, Checking From: ${fromLocation.name}`);
                        return checkPointInRange(fromLocation);
                    } else if (toLocation) {
                        console.log(`Route ID: ${route.id}, Checking To: ${toLocation.name}`);
                        return checkPointInRange(toLocation);
                    }
                    return false;
                } catch (e) {
                    console.error(`Error with turf operation for route: ${route.id} Error: ${e.message}`);
                    return false;
                }
            });
        }

        const finalFilteredRoutes = routesAfterLocationFilter.filter(route => {
            if (vehicleType && route.vehicle_type !== vehicleType) return false;
            if (selectedDate && route.date !== selectedDate) return false;
            return true;
        });

        console.log('Final Filtered Routes count:', finalFilteredRoutes.length);
        console.log('Final Filtered Routes data:', finalFilteredRoutes);
        return finalFilteredRoutes;

    }, [allRoutes, fromLocation, toLocation, vehicleType, selectedDate, mapMode]);

    useEffect(() => {
        setFilteredRoutes(routesToDisplayOnMap);
        console.log('Filtered Routes (after update):', routesToDisplayOnMap.length);
        console.log('Current Map Mode:', mapMode);
    }, [routesToDisplayOnMap, mapMode]);

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


    const handleSearchClick = () => {
  setSearchTrigger(prev => prev + 1);
  setMapMode('search');
  if (filteredRoutes.length > 0) {
    setSelectedRoute(filteredRoutes[0]);
    setSelectedRouteTrigger(prev => prev + 1);
  }
};

    const handleResetClick = () => {
        console.log("Reset button clicked. Setting mapMode to 'grid'.");
        setFromLocation(null);
        setToLocation(null);
        setFromValue('');
        setToValue('');
        setVehicleType('');
        setSelectedDate('');
        setSearchTrigger(0);

        setMapMode('grid'); // Ta zmiana mapMode wywoła MapViewAndInteractionSetter
        setResetTrigger(prev => prev + 1);
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
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                        
<MapContainer
  center={[51.0504, 13.7373]}
  zoom={5}
  maxZoom={19}
  minZoom={0}
  gestureHandling={true}
  whenCreated={mapInstance => {
    mapRef.current = mapInstance;
  }}
  gestureHandlingOptions={{
    touch: true,
    tap: false,
    twoFingerPan: true,
    duration: 1000,
    text: window.innerWidth < 768
      ? 'Użyj dwóch palców, aby przesunąć mapę' // tylko na telefonie
      : '', // brak napisu na desktopie
    cooperative: window.innerWidth >= 768 // na desktopie tryb cooperative - pozwala scrollować stronę
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