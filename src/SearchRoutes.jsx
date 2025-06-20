// src/SearchRoutes.jsx
import React, { useEffect, useState, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Polyline, Popup, Pane, useMap, useMapEvents } from 'react-leaflet';
// import * as turf from '@turf/turf'; // << USUŃ TEN IMPORT
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
    const polylineColor = isHovered ? '#0000FF' : '#FF0000'; // Niebieski dla hover, czerwony dla normalnego
    const polylineWeight = isHovered ? 6 : 4;
    const polylineOpacity = isHovered ? 0.9 : 0.7;

    // Sprawdź, czy route.polyline_geometry jest prawidłowym obiektem GeoJSON (po sparsowaniu)
    // i przekonwertuj go na format Leaflet [lat, lng]
    const leafletCoords = useMemo(() => {
        if (route.polyline_geometry && route.polyline_geometry.coordinates) {
            return route.polyline_geometry.coordinates.map(coord => [coord[1], coord[0]]); // Konwersja [lng, lat] na [lat, lng]
        }
        return [];
    }, [route.polyline_geometry]);


    if (!leafletCoords || leafletCoords.length === 0) {
        return null; // Nie renderuj, jeśli brak danych polilinii
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
                </div>
            </Popup>
        </Polyline>
    );
});

function SearchRoutes() {
    const [routes, setRoutes] = useState([]);
    const [filteredRoutes, setFilteredRoutes] = useState([]);
    const [searchFrom, setSearchFrom] = useState({ label: '', coords: null });
    const [searchTo, setSearchTo] = useState({ label: '', coords: null });
    const [searchVia, setSearchVia] = useState({ label: '', coords: null });
    const [searchDate, setSearchDate] = useState('');
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

    const fetchRoutes = useCallback(async () => {
        // WARUNEK ZAPEWNIAJĄCY, ŻE ZAPYTANIE JEST WYSŁANE TYLKO, GDY MAMY PODSTAWOWE DANE
        if (!searchFrom.coords || !searchTo.coords || !searchDate) {
            setRoutes([]);
            setFilteredRoutes([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .rpc('search_routes', {
                    p_from_lat: searchFrom.coords.lat,
                    p_from_lng: searchFrom.coords.lng,
                    p_to_lat: searchTo.coords.lat,
                    p_to_lng: searchTo.coords.lng,
                    p_date: searchDate,
                    p_via_lat: searchVia.coords?.lat || null,
                    p_via_lng: searchVia.coords?.lng || null,
                    p_radius_meters: 2000
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
    }, [searchFrom.coords, searchTo.coords, searchVia.coords, searchDate]);


    useEffect(() => {
        fetchRoutes();
    }, [fetchRoutes]);

    const handleSearch = (e) => {
        e.preventDefault();
        // Po prostu wywołaj fetchRoutes. Warunek wewnątrz fetchRoutes zdecyduje, czy zapytanie zostanie wysłane.
        fetchRoutes();
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
                <form onSubmit={handleSearch} className="search-form">
                    <LocationAutocomplete
                        label="Z:"
                        value={searchFrom.label}
                        onSelectLocation={setSearchFrom}
                        onChange={(newValue) => setSearchFrom(prev => ({ ...prev, label: newValue, coords: null }))} // Ustawiamy coords na null przy każdej zmianie tekstu
                        placeholder="Miejscowość początkowa"
                    />
                    <LocationAutocomplete
                        label="Do:"
                        value={searchTo.label}
                        onSelectLocation={setSearchTo}
                        onChange={(newValue) => setSearchTo(prev => ({ ...prev, label: newValue, coords: null }))} // Ustawiamy coords na null
                        placeholder="Miejscowość docelowa"
                    />
                    <LocationAutocomplete
                        label="Przez (opcjonalnie):"
                        value={searchVia.label}
                        onSelectLocation={setSearchVia}
                        onChange={(newValue) => setSearchVia(prev => ({ ...prev, label: newValue, coords: null }))} // Ustawiamy coords na null
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
                    <button type="submit" className="search-button" disabled={loading}>
                        {loading ? 'Szukam...' : 'Szukaj Tras'}
                    </button>
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