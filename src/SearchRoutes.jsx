// src/SearchRoutes.jsx
import { useEffect, useState, useRef, createContext, useContext } from 'react';
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
        // Ta część kodu będzie się uruchamiać przy każdym odświeżeniu resetTrigger (w tym przy pierwszym renderowaniu)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCenter([position.coords.latitude, position.coords.longitude]);
                    map.setView([position.coords.latitude, position.coords.longitude], 10);
                },
                () => {
                    // Fallback jeśli geolokalizacja się nie uda
                    setCenter([52.2297, 21.0122]); // Warszawa
                    map.setView([52.2297, 21.0122], 6);
                }
            );
        } else {
            // Fallback jeśli przeglądarka nie wspiera geolokalizacji
            setCenter([52.2297, 21.0122]); // Warszawa
            map.setView([52.2297, 21.0122], 6);
        }
    }, [resetTrigger]); // resetTrigger jest zależnością

    useMapEvents({
        moveend: (event) => {
            const newCenter = event.target.getCenter();
            setCenter([newCenter.lat, newCenter.lng]);
        },
    });

    return null;
}

function MapAutoZoom({ fromLocation, toLocation, trigger, center, resetTrigger, selectedRoute, selectedRouteTrigger }) {
    const map = useMap();

    useEffect(() => {
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
    }, [trigger]);

    useEffect(() => {
        if (center) {
            map.setView(center, 10, { animate: true });
        }
    }, [resetTrigger]);

    useEffect(() => {
    if (selectedRoute?.geojson?.features?.[0]?.geometry?.coordinates) {
        const coords = selectedRoute.geojson.features[0].geometry.coordinates
            .filter(pair => Array.isArray(pair) && pair.length === 2)
            .map(([lng, lat]) => [lat, lng]);

        if (coords.length > 1) {
            const bounds = L.latLngBounds(coords);
            const paddedBounds = bounds.pad(0.1); // 10% margines

            map.fitBounds(paddedBounds, { padding: [80, 80], maxZoom: 12 });
        }
    }
}, [selectedRouteTrigger]);

    return null;
}

function HighlightedRoute({ route, isHovered, onPolylineMouseOver, onPolylineMouseOut }) {
  const popupRef = useRef(null);
  const map = useMap();
  const closeTimeoutRef = useRef(null);

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
}

function SearchRoutes() {
    const [center, setCenter] = useState([52.2297, 21.0122]);
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
    // Zmieniamy początkową wartość resetTrigger, aby geolokalizacja uruchomiła się od razu
    const [resetTrigger, setResetTrigger] = useState(0);
    const [fromCoords, setFromCoords] = useState(null);
    const [toCoords, setToCoords] = useState(null);
    const mapRef = useRef(null);
    const today = new Date().toISOString().split('T')[0];
// Wymusza odświeżenie geolokalizacji przy każdym wejściu na stronę
useEffect(() => {
  setResetTrigger(prev => prev + 1);
}, []);

    const handleRouteClick = (route) => {
        setSelectedRoute(route);
        setSelectedRouteTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const fetchRoutes = async () => {
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
                setAllRoutes(data);
            }
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

    useEffect(() => {
        if (allRoutes.length === 0 || !center) {
            setFilteredRoutes([]);
            return;
        }

        if (searchTrigger === 0) {
            const centerPoint = turf.point([center[1], center[0]]);
            const filtered = allRoutes.filter((route) => {
                const geo = route.geojson?.features?.[0]?.geometry?.coordinates;
                if (!geo) return false;
                const routeLine = turf.lineString(geo);
                const nearest = turf.nearestPointOnLine(routeLine, centerPoint);
                const dist = turf.distance(centerPoint, nearest, { units: 'kilometers' });
                return dist <= 25;
            });
            setFilteredRoutes(filtered);
            return;
        }

        const results = allRoutes.filter((route) => {
            const geo = route.geojson?.features?.[0]?.geometry?.coordinates;
            const detourKm = parseInt(route.max_detour_km || 0);
            if (!geo || !Array.isArray(geo) || geo.length === 0 || detourKm === 0) return false;
            const routeLine = turf.lineString(geo);

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

                const fromPos = fromSnap.properties.location; // odległość od początku trasy w km
                const toPos = toSnap.properties.location;

                const isInRange = fromDist <= detourKm && toDist <= detourKm;
                const isCorrectOrder = fromPos < toPos;

                return isInRange && isCorrectOrder;

            } else if (fromLocation) {
                return checkPointInRange(fromLocation); // tylko początek
            } else if (toLocation) {
                return checkPointInRange(toLocation); // tylko koniec
            } else {
                return false; // nic nie wpisano? nie pokazuj nic
            }

        });

        const extraFiltered = results.filter(route => {
            if (vehicleType && route.vehicle_type !== vehicleType) return false;
            if (selectedDate && route.date !== selectedDate) return false;
            return true;
        });

        setFilteredRoutes(extraFiltered);
    }, [allRoutes, fromLocation, toLocation, center, vehicleType, selectedDate, searchTrigger]);

    const handleSearchClick = () => {
        setSearchTrigger(prev => prev + 1);

        if (fromLocation && toLocation && mapRef.current) {
            const bounds = L.latLngBounds(
                [fromLocation.lat, fromLocation.lng],
                [toLocation.lat, toLocation.lng]
            );
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        } else if (fromLocation && mapRef.current) {
            mapRef.current.setView([fromLocation.lat, fromLocation.lng], 7);
        } else if (toLocation && mapRef.current) {
            mapRef.current.setView([toLocation.lat, toLocation.lng], 7);
        }
    };
    const handleResetClick = () => {
        setFromLocation(null);
        setToLocation(null);
        setFromValue('');
        setToValue('');
        setVehicleType('');
        setSelectedDate('');
        setSearchTrigger(0);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setCenter([lat, lng]);
                    setResetTrigger(prev => prev + 1); // Zwiększenie resetTrigger, aby odświeżyć geolokalizację w MapEvents
                },
                () => {
                    // fallback jeśli geolokalizacja się nie uda
                    setCenter([52.2297, 21.0122]); // Warszawa
                    setResetTrigger(prev => prev + 1);
                }
            );
        } else {
            setCenter([52.2297, 21.0122]);
            setResetTrigger(prev => prev + 1);
        }
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
        // Bezpieczne sprawdzenia!
        const name = loc?.properties?.locality || loc?.properties?.name || '';
        const lat = loc?.geometry?.coordinates?.[1];
        const lng = loc?.geometry?.coordinates?.[0];

        if (typeof lat === 'number' && typeof lng === 'number') {
            setFromValue(label);
            setFromLocation({ name, lat, lng });
            // setFromCoords([lat, lng]); // Można usunąć jeśli nieużywane
        } else {
            // Obsługa przypadku, gdy współrzędne są niepoprawne
            console.warn("Nieprawidłowe współrzędne dla wybranej lokalizacji Skąd:", loc);
            setFromValue('');
            setFromLocation(null);
            // setFromCoords(null);
        }
    }}
    className="location-autocomplete-field"
/>
                    <LocationAutocomplete
    placeholder="Dokąd"
    value={toValue}
    onSelectLocation={(label, loc) => {
        // Bezpieczne sprawdzenia!
        const name = loc?.properties?.locality || loc?.properties?.name || '';
        const lat = loc?.geometry?.coordinates?.[1];
        const lng = loc?.geometry?.coordinates?.[0];

        if (typeof lat === 'number' && typeof lng === 'number') {
            setToValue(label);
            setToLocation({ name, lat, lng });
            // setToCoords([lat, lng]); // Można usunąć jeśli nieużywane
        } else {
            // Obsługa przypadku, gdy współrzędne są niepoprawne
            console.warn("Nieprawidłowe współrzędne dla wybranej lokalizacji Dokąd:", loc);
            setToValue('');
            setToLocation(null);
            // setToCoords(null);
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
  center={center}
  zoom={8}
maxZoom={14}
  whenCreated={mapInstance => mapRef.current = mapInstance}
  style={{ height: '80vh', width: '100%' }}
  gestureHandling={true} // włączamy obsługę gestów
  gestureHandlingOptions={{
    // pozwalamy przesuwać mapę tylko dwoma palcami
    touch: true,
    text: 'Użyj dwóch palców, aby przesunąć mapę',
    duration: 1000,
    tap: false, // tap pojedynczy nie przesuwa mapy
    twoFingerPan: true // przesuwanie dwoma palcami aktywne
  }}
>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Pane name="routes" style={{ zIndex: 400 }} />
                            <Pane name="hovered" style={{ zIndex: 500 }} />

                            <MapEvents />
                            <MapAutoZoom
                                fromLocation={fromLocation}
                                toLocation={toLocation}
                                trigger={searchTrigger}
                                resetTrigger={resetTrigger}
                                center={center}
                                selectedRoute={selectedRoute}
                                selectedRouteTrigger={selectedRouteTrigger}
                            />

                            {center && (<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 999, fontSize: '32px', color: 'red', pointerEvents: 'none' }}>+</div>)}
                      {filteredRoutes.map((route) => (
  <HighlightedRoute
    key={route.id}
    route={route}
    isHovered={route.id === hoveredRouteId}
    onPolylineMouseOver={setHoveredRouteId}
    onPolylineMouseOut={setHoveredRouteId}
  />

))}

{hoveredRouteId && (() => {
  const hoveredRoute = filteredRoutes.find(r => r.id === hoveredRouteId);
  return hoveredRoute ? (
    <HighlightedRoute
      key={`hover-${hoveredRoute.id}`}
      route={hoveredRoute}
      isHovered={true}
      onPolylineMouseOver={setHoveredRouteId}
      onPolylineMouseOut={setHoveredRouteId}
    />
  ) : null;
})()}

                            <RoadsideMarkers />

                        </MapContainer>
                    </MapContext.Provider>
                </div>
                <div style={{ width: '98%', margin: '0 auto 20px auto', padding: '0px 10px 10px 10px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                    <RouteSlider
                        routes={filteredRoutes}
                        onHover={(id) => setHoveredRouteId(id)}
                        onClickRoute={handleRouteClick}
                    />                
                </div>
            </div>
        </>
    );
}

export default SearchRoutes;
