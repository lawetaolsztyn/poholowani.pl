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

    useEffect(() => {
        if (mapMode === 'search') {
            if (fromLocation && typeof fromLocation.lat === 'number' && typeof fromLocation.lng === 'number' &&
                toLocation && typeof toLocation.lat === 'number' && typeof toLocation.lng === 'number') {
                const bounds = L.latLngBounds(
                    [fromLocation.lat, fromLocation.lng],
                    [toLocation.lat, toLocation.lng]
                );
                map.fitBounds(bounds, { padding: [50, 50] });
            } else if (fromLocation && typeof fromLocation.lat === 'number' && typeof fromLocation.lng === 'number') {
                map.setView([fromLocation.lat, fromLocation.lng], 7);
            } else if (toLocation && typeof toLocation.lat === 'number' && typeof toLocation.lng === 'number') {
                map.setView([toLocation.lat, toLocation.lng], 7);
            }
        }
    }, [trigger, mapMode, fromLocation, toLocation, map]);

    useEffect(() => {
        if (mapMode === 'search' && selectedRoute?.geojson?.features?.[0]?.geometry?.coordinates) {
            const coords = selectedRoute.geojson.features[0].geometry.coordinates
                .filter(pair =>
                    Array.isArray(pair) &&
                    pair.length === 2 &&
                    typeof pair[0] === 'number' && !isNaN(pair[0]) &&
                    typeof pair[1] === 'number' && !isNaN(pair[1])
                )
                .map(([lng, lat]) => [lat, lng]);

            if (coords.length > 1) {
                const bounds = L.latLngBounds(coords);
                const paddedBounds = bounds.pad(0.1);
                map.fitBounds(paddedBounds, { padding: [80, 80], maxZoom: 12 });
            } else {
                console.warn('MapAutoZoom selectedRoute: Brak wystarczającej liczby prawidłowych współrzędnych dla trasy ID:', selectedRoute.id);
            }
        }
    }, [selectedRoute, mapMode, map]);

    useEffect(() => {
        console.log('MapAutoZoom: Zoom do wszystkich tras', filteredRoutes.length);
        if (mapMode === 'search' && filteredRoutes && filteredRoutes.length > 1) {
            const allCoords = [];
            filteredRoutes.forEach(route => {
                const coords = route.geojson?.features?.[0]?.geometry?.coordinates;
                if (coords && Array.isArray(coords)) {
                    coords.forEach(coordPair => {
                        if (Array.isArray(coordPair) && coordPair.length === 2) {
                            const [lng, lat] = coordPair;
                            if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng)) {
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
                color: 'red',
                weight: 5,
                opacity: 1
            }}
            eventHandlers={{
                mouseover: (e) => {
                    if (closeTimeoutRef.current) {
                        clearTimeout(closeTimeoutRef.current);
                        closeTimeoutRef.current = null;
                    }
                    if (popupRef.current) {
                        popupRef.current.setLatLng(e.latlng).openOn(map);
                    }
                    if (onPolylineMouseOver) onPolylineMouseOver(route.id);
                },
                mouseout: (e) => {
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
                    <div style={{ marginBottom: '6px' }}>Pojemność: {route.load_capacity || '–'}</div>
                    <div style={{ marginBottom: '6px' }}>Pasażerowie: {route.passenger_count || '–'}</div>
                    <div style={{ marginBottom: '6px' }}>🚚 {route.vehicle_type === 'laweta' ? 'Laweta' : 'Bus'}</div>
                        {route.phone && (
                        <div style={{ marginBottom: '10px' }}>
                            📞 Telefon: <strong style={{ letterSpacing: '1px' }}>
                                <a href={`tel:${route.phone}`} style={{ color: '#007bff', textDecoration: 'none' }}>
                                    {route.phone}
                                </a>
                            </strong>
                            {route.uses_whatsapp && (
                                <div style={{ marginTop: '4px' }}>
                                    <a
                                        href={`https://wa.me/${route.phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ textDecoration: 'none', color: '#25D366', fontWeight: 'bold' }}
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

function MapViewAndInteractionSetter({ mapMode }) {
    const map = useMap();

    useEffect(() => {
        console.log(`MapViewAndInteractionSetter: mapMode changed to ${mapMode}`);
        if (mapMode === 'grid') {
            map.setView([49.45, 11.07], 5); // Centrum Europy (Polska), zoom 5
            map.setMaxZoom(5);
            map.setMinZoom(5);

            map.dragging.disable();
            map.touchZoom.disable();
            map.scrollWheelZoom.disable();
            map.doubleClickZoom.disable();
            map.boxZoom.disable();
            map.keyboard.disable();
            if (map.tap) map.tap.disable();
            if (map.gestureHandling) map.gestureHandling.disable();
            console.log("MapViewAndInteractionSetter: Interakcje mapy WYŁĄCZONE.");

        } else { // mapMode === 'search'
            map.setMaxZoom(19);
            map.setMinZoom(0);

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
    }, [mapMode, map]);

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
    const mapRef = useRef(null);
    const today = new Date().toISOString().split('T')[0];

    const [mapMode, setMapMode] = useState('grid');

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
            return allRoutes.filter(route => {
                const rawGeoCoords = route.geojson?.features?.[0]?.geometry?.coordinates;
                if (!rawGeoCoords || !Array.isArray(rawGeoCoords) || rawGeoCoords.length < 2) {
                    console.warn('Grid mode: Skipping route due to missing, invalid, or insufficient geojson coordinates:', route.id);
                    return false;
                }
                const isValid = rawGeoCoords.every(coordPair =>
                    Array.isArray(coordPair) &&
                    coordPair.length === 2 &&
                    typeof coordPair[0] === 'number' && !isNaN(coordPair[0]) &&
                    typeof coordPair[1] === 'number' && !isNaN(coordPair[1])
                );
                if (!isValid) {
                    console.warn('Grid mode: Skipping route due to non-numeric coordinates:', route.id, rawGeoCoords);
                }
                return isValid;
            });
        }

        console.log('mapMode: search');

        if (allRoutes.length === 0) {
            console.log('No allRoutes data');
            return [];
        }

        let routesAfterLocationFilter = [];

        if (!fromLocation && !toLocation) {
            console.log("Tryb SEARCH: LOKALIZACJE PUSTE. Filtruj po typie pojazdu/dacie dla WSZYSTKICH tras.");
            routesAfterLocationFilter = allRoutes.filter(route => {
                const rawGeoCoords = route.geojson?.features?.[0]?.geometry?.coordinates;
                if (!rawGeoCoords || !Array.isArray(rawGeoCoords) || rawGeoCoords.length < 2) {
                    console.warn('Search mode (no locations): Skipping route due to missing, invalid, or insufficient geojson coordinates:', route.id);
                    return false;
                }
                const isValid = rawGeoCoords.every(coordPair =>
                    Array.isArray(coordPair) &&
                    coordPair.length === 2 &&
                    typeof coordPair[0] === 'number' && !isNaN(coordPair[0]) &&
                    typeof coordPair[1] === 'number' && !isNaN(coordPair[1])
                );
                if (!isValid) {
                    console.warn('Search mode (no locations): Skipping route due to non-numeric coordinates:', route.id, rawGeoCoords);
                }
                return isValid;
            });
        } else {
            routesAfterLocationFilter = allRoutes.filter((route) => {
                const rawGeoCoords = route.geojson?.features?.[0]?.geometry?.coordinates;
                if (!rawGeoCoords || !Array.isArray(rawGeoCoords) || rawGeoCoords.length === 0) {
                    console.warn('Skipping route due to missing or invalid geojson coordinates:', route.id);
                    return false;
                }

                const geo = rawGeoCoords
                    .filter(coordPair =>
                        Array.isArray(coordPair) &&
                        coordPair.length === 2 &&
                        typeof coordPair[0] === 'number' && !isNaN(coordPair[0]) &&
                        typeof coordPair[1] === 'number' && !isNaN(coordPair[1])
                    )
                    .map(([lng, lat]) => [lng, lat]);

                if (geo.length < 2) {
                    console.warn('Skipping route due to insufficient valid coordinates after filtration:', route.id);
                    return false;
                }

                const detourKm = parseInt(route.max_detour_km || 0);
                if (detourKm <= 0) { // Changed to <= 0 to also handle 0
                    console.warn('Skipping route due to max_detour_km being 0 or less:', route.id);
                    return false;
                }

                let routeLine;
                try {
                    routeLine = turf.lineString(geo);
                } catch (e) {
                    console.error('Error creating turf.lineString for route:', route.id, e);
                    return false;
                }

                const checkPointInRange = (pointObj) => {
                    if (!pointObj || typeof pointObj.lat !== 'number' || typeof pointObj.lng !== 'number' || isNaN(pointObj.lat) || isNaN(pointObj.lng)) {
                        console.warn('Invalid point object for checkPointInRange:', pointObj);
                        return false;
                    }
                    const userPoint = turf.point([pointObj.lng, pointObj.lat]);
                    const snapped = turf.nearestPointOnLine(routeLine, userPoint);
                    const dist = turf.distance(userPoint, snapped, { units: 'kilometers' });
                    return dist <= detourKm;
                };

                if (fromLocation && toLocation) {
                    if (typeof fromLocation.lat !== 'number' || typeof fromLocation.lng !== 'number' || isNaN(fromLocation.lat) || isNaN(fromLocation.lng) ||
                        typeof toLocation.lat !== 'number' || typeof toLocation.lng !== 'number' || isNaN(toLocation.lat) || isNaN(toLocation.lng)) {
                        console.warn("Invalid from/to location coordinates provided.");
                        return false;
                    }

                    const fromPoint = turf.point([fromLocation.lng, fromLocation.lat]);
                    const toPoint = turf.point([toLocation.lng, toLocation.lat]);

                    let fromSnap, toSnap;
                    try {
                        fromSnap = turf.nearestPointOnLine(routeLine, fromPoint);
                        toSnap = turf.nearestPointOnLine(routeLine, toPoint);
                    } catch (e) {
                        console.error('Error with turf.nearestPointOnLine for route:', route.id, e);
                        return false;
                    }

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

    useEffect(() => {
        if (mapMode === 'search' && filteredRoutes.length >= 1 && mapRef.current) {
            const allCoords = [];

            filteredRoutes.forEach(route => {
                const coords = route.geojson?.features?.[0]?.geometry?.coordinates;
                if (coords && Array.isArray(coords)) {
                    coords.forEach(coordPair => {
                        if (Array.isArray(coordPair) && coordPair.length === 2) {
                            const [lng, lat] = coordPair;
                            if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng)) {
                                allCoords.push([lat, lng]);
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

        setMapMode('grid');
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

                            if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
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

                            if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
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
                                text: 'Użyj dwóch palców, aby przesunąć mapę',
                                duration: 1000,
                                tap: false,
                                twoFingerPan: true
                            }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <MapEvents />
                            <MapViewAndInteractionSetter mapMode={mapMode} />
                            <MapAutoZoom
                                fromLocation={fromLocation}
                                toLocation={toLocation}
                                trigger={searchTrigger}
                                selectedRoute={selectedRoute}
                                selectedRouteTrigger={selectedRouteTrigger}
                                mapMode={mapMode}
                                filteredRoutes={filteredRoutes}
                            />

                            <Pane name="routes" style={{ zIndex: 500 }}>
                                {mapMode === 'grid' ? (
                                    allRoutes.map((route) => (
                                        <StaticRoutePolyline key={route.id} route={route} />
                                    ))
                                ) : (
                                    filteredRoutes.map((route) => (
                                        <HighlightedRoute
                                            key={route.id}
                                            route={route}
                                            isHovered={route.id === hoveredRouteId}
                                            onPolylineMouseOver={setHoveredRouteId}
                                            onPolylineMouseOut={setHoveredRouteId}
                                        />
                                    ))
                                )}
                            </Pane>

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