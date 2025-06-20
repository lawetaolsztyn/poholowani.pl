// src/SearchRoutes.jsx
import React, { useEffect, useState, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Polyline, Popup, Pane, useMap, useMapEvents } from 'react-leaflet';
// Usuń import * as turf from '@turf/turf'; jeśli nadal tam jest
import 'leaflet/dist/leaflet.css';
import Navbar from './components/Navbar';
import Header from './components/Header';
import LocationAutocomplete from './components/LocationAutocomplete'; // NIE MODYFIKOWANY
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
                    <h3>{route.from_label} do {route.to_label}</h3>
                    {route.via_label && <p>Przez: {route.via_label}</p>}
                    <p>Data: {new Date(route.date).toLocaleDateString()}</p>
                    <p>Godzina: {route.time}</p>
                    <p>Miejsca: {route.seats}</p>
                    <p>Cena: {route.price} PLN</p>
                    {route.description && <p>{route.description}</p>}
                    <p>Telefon: {route.phone} {route.uses_whatsapp && '(WhatsApp)'}</p>
                    {route.messenger && <p><a href={route.messenger} target="_blank" rel="noopener noreferrer">Messenger</a></p>}
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
        console.log('Nominatim response status:', response.status);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log('Nominatim data:', data);
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
            console.log('Geocoding successful:', result);
        return null;
    } catch (error) {
        console.error("Błąd podczas geokodowania adresu:", error);
        return null;
    }
}


function SearchRoutes() {
    const [routes, setRoutes] = useState([]);
    const [filteredRoutes, setFilteredRoutes] = useState([]);
    // Stan dla tekstu wpisanego w input, niezależny od LocationAutocomplete
    const [fromInputText, setFromInputText] = useState('');
    const [toInputText, setToInputText] = useState('');
    const [viaInputText, setViaInputText] = useState('');

    // Stan dla wybranych lokalizacji (z coords), aktualizowany przez onSelectLocation
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
    const fetchRoutes = useCallback(async (fromCoords, toCoords, viaCoords) => {
        // Warunek jest kluczowy: nadal wymagamy koordynatów do zapytania do PostGIS
        if (!fromCoords || !toCoords || !searchDate) {
            setRoutes([]);
            setFilteredRoutes([]);
            // Możesz tutaj wyświetlić komunikat dla użytkownika, np. "Proszę wybrać początek i koniec trasy z listy sugestii."
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .rpc('search_routes', {
                    p_from_lat: fromCoords.lat,
                    p_from_lng: fromCoords.lng,
                    p_to_lat: toCoords.lat,
                    p_to_lng: toCoords.lng,
                    p_date: searchDate,
                    p_via_lat: viaCoords?.lat || null,
                    p_via_lng: viaCoords?.lng || null,
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
    }, [searchDate, searchVehicleType]); // Zależności dla fetchRoutes - tylko te, które nie są przekazywane jako argumenty

    // useEffect do automatycznego wyszukiwania po zmianie koordynatów (po wyborze sugestii)
    useEffect(() => {
        if (searchFrom.coords && searchTo.coords && searchDate) {
            fetchRoutes(searchFrom.coords, searchTo.coords, searchVia.coords);
        } else if (searchFrom.label || searchTo.label || searchVia.label || searchDate || searchVehicleType) {
            // Jeśli użytkownik wpisał tekst, ale nie wybrał sugestii, wyczyść wyniki
            setRoutes([]);
            setFilteredRoutes([]);
        }
    }, [searchFrom, searchTo, searchVia, searchDate, searchVehicleType]); // searchFrom/To/Via są obiektami, więc React je poprawnie monitoruje.

    // Ta funkcja będzie wywoływana po kliknięciu "Szukaj"
    const handleSearchClick = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
console.log('handleSearchClick invoked.');
    console.log('Initial fromInputText:', fromInputText);
    console.log('Initial toInputText:', toInputText);

        let finalFrom = { ...searchFrom };
        let finalTo = { ...searchTo };
        let finalVia = { ...searchVia };

        // Jeśli searchFrom.coords jest null, ale fromInputText ma wartość, spróbuj geokodować
        if (!finalFrom.coords && fromInputText) {
        console.log('Attempting to geocode fromInputText:', fromInputText);
            const geoFrom = await geocodeAddress(fromInputText);
            if (geoFrom) {
                finalFrom = geoFrom;
                setSearchFrom(geoFrom); // Aktualizuj stan, aby UI to odzwierciedlało
            } else {
                setError('Nie znaleziono lokalizacji dla "Z": ' + fromInputText);
                setLoading(false);
                return;
            }
        }

        // Jeśli searchTo.coords jest null, ale toInputText ma wartość, spróbuj geokodować
        if (!finalTo.coords && toInputText) {
        console.log('Attempting to geocode toInputText:', toInputText);

            const geoTo = await geocodeAddress(toInputText);
            if (geoTo) {
                finalTo = geoTo;
                setSearchTo(geoTo); // Aktualizuj stan
            console.log('Updated finalTo after geocoding:', finalTo);

            } else {
                setError('Nie znaleziono lokalizacji dla "Do": ' + toInputText);
                setLoading(false);
            console.log('Geocoding failed for toInputText.');

                return;
            }
        }

        // Jeśli searchVia.coords jest null, ale viaInputText ma wartość, spróbuj geokodować
        if (!finalVia.coords && viaInputText) {
            const geoVia = await geocodeAddress(viaInputText);
            if (geoVia) {
                finalVia = geoVia;
                setSearchVia(geoVia); // Aktualizuj stan
            } else {
                setError('Nie znaleziono lokalizacji dla "Przez": ' + viaInputText);
                setLoading(false);
                return;
            }
        }
    console.log('Final coords before calling fetchRoutes:');
    console.log('From Coords:', finalFrom.coords);
    console.log('To Coords:', finalTo.coords);
    console.log('Via Coords:', finalVia.coords);
    console.log('Search Date:', searchDate);

        // Teraz wywołaj fetchRoutes z upewnionymi koordynatami
        fetchRoutes(finalFrom.coords, finalTo.coords, finalVia.coords);
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

    return (
        <div className="search-routes-container">
            <Navbar onSetMapMode={setMapMode} onResetMap={handleResetMap} />
            <Header title="Wyszukiwanie Tras" />

            <div className="search-form-container">
                <form onSubmit={handleSearchClick} className="search-form"> {/* Zmieniono onSubmit na handleSearchClick */}
                    <LocationAutocomplete
                        label="Z:"
                        value={fromInputText} // Teraz LocationAutocomplete kontroluje tekst bezpośrednio
                        onSelectLocation={(selected) => {
                            setSearchFrom(selected);
                            setFromInputText(selected.label); // Upewnij się, że tekst inputu jest zaktualizowany
                        }}
                        placeholder="Miejscowość początkowa"
                    />
                    <LocationAutocomplete
                        label="Do:"
                        value={toInputText}
                        onSelectLocation={(selected) => {
                            setSearchTo(selected);
                            setToInputText(selected.label);
                        }}
                        placeholder="Miejscowość docelowa"
                    />
                    <LocationAutocomplete
                        label="Przez (opcjonalnie):"
                        value={viaInputText}
                        onSelectLocation={(selected) => {
                            setSearchVia(selected);
                            setViaInputText(selected.label);
                        }}
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
                    {error && <p className="error-message">{error}</p>} {/* Wyświetlanie błędów geokodowania */}
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