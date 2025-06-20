// src/SearchRoutes.jsx
import React, { useEffect, useState, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Polyline, Popup, Pane, useMap, useMapEvents } from 'react-leaflet';
// Usuń import * as turf from '@turf/turf'; jeśli nadal tam jest
import 'leaflet/dist/leaflet.css';
import Navbar from './components/Navbar';
import Header from './components/Header';
import LocationAutocomplete from './components/LocationAutocomplete'; // TEN PLIK NIE ZMIENIONY
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
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCenter([position.coords.latitude, position.coords.longitude]);
                },
                () => {
                    setCenter([52.2297, 21.0122]); // Domyślna lokalizacja, jeśli geolokalizacja nie jest dostępna
                }
            );
        }
    }, [resetTrigger, setCenter]);
    return null;
}

const HighlightedRoute = React.memo(({ route, isHovered, onPolylineMouseOver, onPolylineMouseOut }) => {
    const polylineColor = isHovered ? '#0000FF' : '#FF0000';
    const polylineWeight = isHovered ? 6 : 4;
    const polylineOpacity = isHovered ? 0.9 : 0.7;

    const leafletCoords = useMemo(() => {
        if (route.polyline_geometry && route.polyline_geometry.coordinates) {
            return route.polyline_geometry.coordinates.map(coord => [coord[1], coord[0]]);
        }
        return [];
    }, [route.polyline_geometry]);


    if (!leafletCoords || leafletCoords.length === 0) {
        return null;
    }

    return (
        <Polyline
            positions={leafletCoords}
            color={polylineColor}
            weight={polylineWeight}
            opacity={polylineOpacity}
            onmouseover={() => onPolylineMouseOver(route.id)}
            onmouseout={() => onPolylineMouseOut(null)}
        >
            <Popup>
                <div>
                    <h3>{route.from_city} do {route.to_city}</h3>
                    {route.via && <p>Przez: {route.via}</p>}
                    <p>Data: {new Date(route.date).toLocaleDateString()}</p>
                    {/* USUNIĘTO: <p>Godzina: {route.time}</p> */}
                    <p>Miejsca: {route.passenger_count}</p> {/* ZMIANA: seats na passenger_count */}
                    {/* USUNIĘTO: <p>Cena: {route.price} PLN</p> */}
                    {/* USUNIĘTO: {route.description && <p>{route.description}</p>} */}
                    <p>Telefon: {route.phone} {route.uses_whatsapp && '(WhatsApp)'}</p>
                    {route.messenger_link && <p><a href={route.messenger_link} target="_blank" rel="noopener noreferrer">Messenger</a></p>} {/* ZMIANA: messenger na messenger_link */}
                    {route.vehicle_type && <p>Typ pojazdu: {route.vehicle_type}</p>}
                </div>
            </Popup>
        </Polyline>
    );
});

// Funkcja pomocnicza do geokodowania tekstu
async function geocodeAddress(address) {
    if (!address || address.length < 3) return null;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=geojson&limit=1`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            return {
                label: feature.properties.display_name,
                coords: {
                    lat: feature.geometry.coordinates[1],
                    lng: feature.geometry.coordinates[0]
                }
            };
        }
        return null;
    } catch (error) {
        console.error("Błąd podczas geokodowania adresu:", error);
        return null;
    }
}


function SearchRoutes() {
    const [routes, setRoutes] = useState([]);
    const [filteredRoutes, setFilteredRoutes] = useState([]);
    
    // Utrzymujemy JEDEN stan dla każdej lokalizacji
    const [searchFrom, setSearchFrom] = useState({ label: '', coords: null });
    const [searchTo, setSearchTo] = useState({ label: '', coords: null });
    const [searchVia, setSearchVia] = useState({ label: '', coords: null });

    const [searchDate, setSearchDate] = useState('');
    const [searchVehicleType, setSearchVehicleType] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hoveredRouteId, setHoveredRouteId] = useState(null);
    const [mapCenter, setMapCenter] = useState([52.2297, 21.0122]);
    const [mapMode, setMapMode] = useState('search');
    const [resetTrigger, setResetTrigger] = useState(0);

    const mapRef = useRef(null);

    const handleResetMap = useCallback(() => {
        setMapCenter([52.2297, 21.0122]);
        setResetTrigger(prev => prev + 1);
    }, []);

    // Główna funkcja pobierania tras
    const fetchRoutes = useCallback(async (fromLocation, toLocation, viaLocation) => { // Przyjmuje obiekty {label, coords}
        // Nadal wymagamy koordynatów do zapytania do PostGIS
        if (!fromLocation.coords || !toLocation.coords || !searchDate) {
            setRoutes([]);
            setFilteredRoutes([]);
            console.log('FetchRoutes: Missing coords or date. Not fetching.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .rpc('search_routes', {
                    p_from_lat: fromLocation.coords.lat, // Używa fromLocation.coords
                    p_from_lng: fromLocation.coords.lng,
                    p_to_lat: toLocation.coords.lat,    // Używa toLocation.coords
                    p_to_lng: toLocation.coords.lng,
                    p_date: searchDate,
                    p_via_lat: viaLocation?.coords?.lat || null,
                    p_via_lng: viaLocation?.coords?.lng || null,
                    p_radius_meters: 2000,
                    p_vehicle_type: searchVehicleType || null
                });

            if (error) throw error;

            const processedRoutes = data.map(route => ({
                ...route,
                polyline_geometry: route.polyline_geometry ? JSON.parse(route.polyline_geometry) : null
            }));

            setRoutes(processedRoutes);
            setFilteredRoutes(processedRoutes);
            console.log('Fetched filtered routes from Supabase Function:', processedRoutes);
        } catch (err) {
            console.error('Błąd podczas pobierania tras:', err.message);
            setError('Błąd podczas pobierania tras: ' + err.message);
            setRoutes([]);
            setFilteredRoutes([]);
        } finally {
            setLoading(false);
        }
    }, [searchDate, searchVehicleType]); // Zależności: tylko te, które nie są argumentami

    // useEffect do automatycznego wyszukiwania po zmianie koordynatów (po wyborze sugestii)
    useEffect(() => {
        // Jeśli koordynaty i data są obecne, wywołaj fetchRoutes automatycznie
        if (searchFrom.coords && searchTo.coords && searchDate) {
            fetchRoutes(searchFrom, searchTo, searchVia);
        } else {
            // Jeśli koordynaty nie są ustawione, ale użytkownik już coś wpisał, wyczyść wyniki
            // Zapobiegaj czyszczeniu na początku, gdy searchFrom.label jest puste.
            if (searchFrom.label.length > 0 || searchTo.label.length > 0 || searchVia.label.length > 0 || searchDate.length > 0 || searchVehicleType.length > 0) {
                 setRoutes([]);
                 setFilteredRoutes([]);
            }
        }
    }, [searchFrom, searchTo, searchVia, searchDate, searchVehicleType, fetchRoutes]);


    // Ta funkcja będzie wywoływana po kliknięciu "Szukaj"
    const handleSearchClick = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Tworzymy kopię, którą będziemy modyfikować
        let finalFrom = { ...searchFrom };
        let finalTo = { ...searchTo };
        let finalVia = { ...searchVia };

        console.log('handleSearchClick invoked.');
        console.log('Initial searchFrom:', searchFrom); // Log przed geokodowaniem
        console.log('Initial searchTo:', searchTo);

        // Jeśli finalFrom.coords jest null, ale finalFrom.label ma wartość, spróbuj geokodować
        if (!finalFrom.coords && finalFrom.label) {
            console.log('Attempting to geocode FROM label:', finalFrom.label);
            const geoFrom = await geocodeAddress(finalFrom.label);
            if (geoFrom) {
                finalFrom = geoFrom;
                setSearchFrom(geoFrom); // Aktualizuj stan searchFrom
                console.log('Geocoded FROM:', geoFrom);
            } else {
                setError('Nie znaleziono lokalizacji dla "Z": ' + finalFrom.label);
                setLoading(false);
                return;
            }
        }

        if (!finalTo.coords && finalTo.label) {
            console.log('Attempting to geocode TO label:', finalTo.label);
            const geoTo = await geocodeAddress(finalTo.label);
            if (geoTo) {
                finalTo = geoTo;
                setSearchTo(geoTo); // Aktualizuj stan searchTo
                console.log('Geocoded TO:', geoTo);
            } else {
                setError('Nie znaleziono lokalizacji dla "Do": ' + finalTo.label);
                setLoading(false);
                return;
            }
        }

        if (!finalVia.coords && finalVia.label) {
            console.log('Attempting to geocode VIA label:', finalVia.label);
            const geoVia = await geocodeAddress(finalVia.label);
            if (geoVia) {
                finalVia = geoVia;
                setSearchVia(geoVia);
                console.log('Geocoded VIA:', geoVia);
            } else {
                setError('Nie znaleziono lokalizacji dla "Przez": ' + finalVia.label);
                setLoading(false);
                return;
            }
        }
        
        console.log('Final locations before fetching routes:');
        console.log('From:', finalFrom);
        console.log('To:', finalTo);
        console.log('Via:', finalVia);
        console.log('Date:', searchDate);


        // Teraz wywołaj fetchRoutes z upewnionymi koordynatami (mogą być z geokodowania)
        fetchRoutes(finalFrom, finalTo, finalVia);
    };

    const handleRouteClick = useCallback((route) => {
        if (mapRef.current && route.polyline_geometry && route.polyline_geometry.coordinates) {
            const leafletCoords = route.polyline_geometry.coordinates.map(coord => [coord[1], coord[0]]);
            if (leafletCoords.length > 0) {
                const bounds = L.latLngBounds(leafletCoords);
                mapRef.current.fitBounds(bounds);
            }
        }
    }, []);

    // Funkcje do obsługi onSelectLocation z LocationAutocomplete, które zawsze ustawiają obiekt {label, coords}
    const handleLocationSelect = useCallback((setLocationState) => (selectedFromAutocomplete) => {
        // LocationAutocomplete może zwracać:
        // 1. { label: 'pełna nazwa', coords: {lat, lng} } - po kliknięciu sugestii
        // 2. { label: 'wpisany_tekst', coords: null } - z handleBlurLogic w LocationAutocomplete (jeśli nie wybrano sugestii, ale jest tekst)
        // 3. { label: '', coords: null } - z handleBlurLogic (jeśli pole jest puste)

        // Normalizujemy wejście, aby zawsze był to obiekt { label, coords }
        let normalizedSelected;
        if (typeof selectedFromAutocomplete === 'string') {
            // Jeśli LocationAutocomplete zwracał sam string (stara, nieprawidłowa forma, ale mogła się zdarzyć)
            normalizedSelected = { label: selectedFromAutocomplete, coords: null };
        } else if (selectedFromAutocomplete && typeof selectedFromAutocomplete.geometry !== 'undefined') {
            // Jeśli LocationAutocomplete zwracał obiekt z 'geometry' (np. z pustymi coordinates dla zerowania)
            normalizedSelected = {
                label: selectedFromAutocomplete.label || '',
                coords: selectedFromAutocomplete.geometry?.coordinates ? { lat: selectedFromAutocomplete.geometry.coordinates[1], lng: selectedFromAutocomplete.geometry.coordinates[0] } : null
            };
        } else if (selectedFromAutocomplete && typeof selectedFromAutocomplete.label === 'string') {
            // Jeśli LocationAutocomplete zwracał już poprawny obiekt {label, coords} (po kliknięciu sugestii)
            normalizedSelected = selectedFromAutocomplete;
        } else {
            // Wszelkie inne przypadki, traktujemy jako puste
            normalizedSelected = { label: '', coords: null };
        }
        console.log('Normalizing LocationAutocomplete output:', selectedFromAutocomplete, '->', normalizedSelected);
        setLocationState(normalizedSelected);
    }, []);


    return (
        <div className="search-routes-container">
            <Navbar onSetMapMode={setMapMode} onResetMap={handleResetMap} />
            <Header title="Wyszukiwanie Tras" />

            <div className="search-form-container">
                <form onSubmit={handleSearchClick} className="search-form">
                    <LocationAutocomplete
                        label="Z:"
                        value={searchFrom.label} // Używamy searchFrom.label do kontrolowania wartości inputa
                        onSelectLocation={handleLocationSelect(setSearchFrom)} // Użyj ogólnego handlera
                        placeholder="Miejscowość początkowa"
                    />
                    <LocationAutocomplete
                        label="Do:"
                        value={searchTo.label}
                        onSelectLocation={handleLocationSelect(setSearchTo)}
                        placeholder="Miejscowość docelowa"
                    />
                    <LocationAutocomplete
                        label="Przez (opcjonalnie):"
                        value={searchVia.label}
                        onSelectLocation={handleLocationSelect(setSearchVia)}
                        placeholder="Punkt pośredni"
                    />
                    <div className="form-field">
                        <label>Data:</label>
                        <input
                            type="date"
                            value={searchDate}
                            onChange={(e) => setSearchDate(e.target.value)}
                            className="uinput"
                        />
                    </div>

                    <div className="form-field">
                        <label>Typ pojazdu:</label>
                        <select
                            value={searchVehicleType}
                            onChange={(e) => setSearchVehicleType(e.target.value)}
                            className="uinput"
                        >
                            <option value="">Wszystkie</option>
                            <option value="bus">Bus</option>
                            <option value="laweta">Laweta</option>
                        </select>
                    </div>

                    <button type="submit" className="search-button" disabled={loading}>
                        {loading ? 'Szukam...' : 'Szukaj Tras'}
                    </button>
                    {error && <p className="error-message">{error}</p>}
                </form>
            </div>

            <div className="map-and-results">
                <MapContext.Provider value={{ setCenter: setMapCenter, resetTrigger }}>
                    <MapContainer
                        center={mapCenter}
                        zoom={6}
                        scrollWheelZoom={true}
                        style={{ height: '500px', width: '100%' }}
                        whenCreated={mapInstance => { mapRef.current = mapInstance; }}
                        gestureHandling={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapEvents />

                        {filteredRoutes.map((route) => {
                            if (hoveredRouteId === route.id) return null;
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

                        {hoveredRouteId && (
                            <HighlightedRoute
                                key={'hovered-' + hoveredRouteId}
                                route={filteredRoutes.find(r => r.id === hoveredRouteId)}
                                isHovered={true}
                                onPolylineMouseOver={setHoveredRouteId}
                                onPolylineMouseOut={setHoveredRouteId}
                            />
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
    );
}

export default SearchRoutes;