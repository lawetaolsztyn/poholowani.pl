// src/SearchRoutes.jsx
import React, { useEffect, useState, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { MapContainer, TileLayer, Polyline, Popup, Pane, useMap, useMapEvents, Marker } from 'react-leaflet'; // Dodaj Marker
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

// Importy dla klasteryzacji
import MarkerClusterGroup from 'react-leaflet-markercluster'; // Jeśli używasz tego wrappera
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';


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
        console.log('MapAutoZoom: Uruchomiono główny efekt zooma.', { mapMode, filteredRoutesCount: filteredRoutes.length, selectedRouteId: selectedRoute?.id, fromLoc: fromLocation?.name, toLoc: toLocation?.name, trigger });

        let allCoords = [];
        let zoomExecuted = false;

        if (mapMode === 'grid') {
            return;
        }

        if (selectedRoute && selectedRoute.geojson?.features?.[0]?.geometry?.coordinates) {
            console.log('MapAutoZoom: Zoom do wybranej trasy (selectedRoute).');
            allCoords = selectedRoute.geojson.features[0].geometry.coordinates
                .filter(pair => Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'number' && !isNaN(pair[0]) && typeof pair[1] === 'number' && !isNaN(pair[1]))
                .map(([lng, lat]) => [lat, lng]);

            if (allCoords.length > 1) {
                setTimeout(() => {
                    const bounds = L.latLngBounds(allCoords);
                    map.fitBounds(bounds.pad(0.1), { padding: [80, 80], maxZoom: 12 });
                }, 0);
                zoomExecuted = true;
            } else if (allCoords.length === 1) {
                setTimeout(() => {
                    map.setView(allCoords[0], 12);
                }, 0);
                zoomExecuted = true;
            } else {
                console.warn('MapAutoZoom: selectedRoute ma niewystarczające/nieprawidłowe koordynaty dla fitBounds.', selectedRoute.id);
            }
        }

        if (!zoomExecuted && filteredRoutes && filteredRoutes.length > 0) {
            console.log('MapAutoZoom: Zoom do wszystkich przefiltrowanych tras (filteredRoutes).');
            allCoords = [];

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
                setTimeout(() => {
                    const bounds = L.latLngBounds(allCoords);
                    map.fitBounds(bounds.pad(0.1), { padding: [80, 80], maxZoom: 12 });
                }, 0);
                zoomExecuted = true;
            } else {
                console.warn('MapAutoZoom: filteredRoutes (po filtracji) nie zawiera prawidłowych koordynat. Nie ustawiam bounds.');
            }
        }

        if (!zoomExecuted) {
            if (fromLocation && toLocation) {
                console.log('MapAutoZoom: Zoom do fromLocation i toLocation.');
                setTimeout(() => {
                    const bounds = L.latLngBounds(
                        [fromLocation.lat, fromLocation.lng],
                        [toLocation.lat, toLocation.lng]
                    );
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
                }, 0);
                zoomExecuted = true;
            } else if (fromLocation) {
                console.log('MapAutoZoom: Zoom do fromLocation.');
                setTimeout(() => {
                    map.setView([fromLocation.lat, fromLocation.lng], 7);
                }, 0);
                zoomExecuted = true;
            } else if (toLocation) {
                console.log('MapAutoZoom: Zoom do toLocation.');
                setTimeout(() => {
                    map.setView([toLocation.lat, toLocation.lng], 7);
                }, 0);
                zoomExecuted = true;
            }
        }

        if (!zoomExecuted && mapMode === 'search') {
            console.log('MapAutoZoom: Brak tras/punktów, ustawiam domyślny widok w trybie search.');
            setTimeout(() => {
                map.setView([51.0504, 13.7373], 5);
            }, 0);
        }

    }, [map, mapMode, filteredRoutes, selectedRoute, fromLocation, toLocation, trigger, selectedRouteTrigger]);

    return null;
}

const HighlightedRoute = React.memo(function HighlightedRoute({ route, isHovered, onPolylineMouseOver, onPolylineMouseOut }) {
    const popupRef = useRef(null);
    const map = useMap();
    const openTimeoutIdRef = useRef(null);
    const closeTimeoutIdRef = useRef(null);

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

    const cancelClose = () => {
        if (closeTimeoutIdRef.current) {
            clearTimeout(closeTimeoutIdRef.current);
            closeTimeoutIdRef.current = null;
            console.log('CancelClose: Anulowano planowane zamknięcie popupu.');
        }
    };

    const handleOpenPopup = (latlng) => {
        console.log('handleOpenPopup: Wywołano.');
        cancelClose();

        if (openTimeoutIdRef.current) {
            clearTimeout(openTimeoutIdRef.current);
            openTimeoutIdRef.current = null;
        }

        openTimeoutIdRef.current = setTimeout(() => {
            if (popupRef.current && !popupRef.current.isOpen()) {
                popupRef.current.setLatLng(latlng).openOn(map);
                console.log('OpenPopup: Popup otwarty.');
            } else {
                console.log('OpenPopup: Popup już otwarty lub ref niedostępny.');
            }
            openTimeoutIdRef.current = null;
        }, 100);

        if (onPolylineMouseOver) onPolylineMouseOver(route.id);
    };

    const handleClosePopup = () => {
        console.log('handleClosePopup: Wywołano.');
        if (openTimeoutIdRef.current) {
            clearTimeout(openTimeoutIdRef.current);
            openTimeoutIdRef.current = null;
            console.log('handleClosePopup: Anulowano planowane otwarcie (bo kursor zjechał).');
        }

        setTimeout(() => {
            if (!closeTimeoutIdRef.current) {
                closeTimeoutIdRef.current = setTimeout(() => {
                    if (popupRef.current && popupRef.current.isOpen()) {
                        popupRef.current.close();
                        console.log('ClosePopup: Popup zamknięty po opóźnieniu.');
                    } else {
                        console.log('ClosePopup: Popup już zamknięty lub ref niedostępny.');
                    }
                    closeTimeoutIdRef.current = null;
                }, 1500);
            }
        }, 50);

        if (onPolylineMouseOut) onPolylineMouseOut(null);
    };

    useEffect(() => {
        return () => {
            if (openTimeoutIdRef.current) clearTimeout(openTimeoutIdRef.current);
            if (closeTimeoutIdRef.current) clearTimeout(closeTimeoutIdRef.current); // Poprawiono nazwę ref
        };
    }, []);

    return (
        <Polyline
            positions={coords}
            pane={isHovered ? 'hovered' : 'routes'}
            pathOptions={{ color: isHovered ? 'red' : 'blue', weight: isHovered ? 6 : 5 }}
            eventHandlers={{
                mouseover: (e) => {
                    handleOpenPopup(e.latlng);
                    if (onPolylineMouseOver) onPolylineMouseOver(route.id);
                },
                mouseout: (e) => {
                    if (onPolylineMouseOut) onPolylineMouseOut(null);
                    setTimeout(() => {
                        handleClosePopup();
                    }, 50);
                },
                mousemove: (e) => {
                    if (popupRef.current && popupRef.current.isOpen()) {
                        popupRef.current.setLatLng(e.latlng);
                    }
                }
            }}
        >
            <Popup
                ref={popupRef}
                autoClose={false}
                closeOnEscapeKey={false}
                closeButton={false}
                closeOnClick={false}
                onOpen={(e) => {
                    console.log('Popup: onOpen wywołano. Podpinam mouseenter/mouseleave do kontenera.');
                    const popupContent = e.popup._container;
                    if (popupContent) {
                        popupContent.onmouseenter = cancelClose;
                        popupContent.onmouseleave = handleClosePopup;
                    }
                }}
                onClose={() => {
                    console.log('Popup: onClose wywołano.');
                }}
            >
                {/* ... (zawartość Popup) ... */}
                <div style={{ fontSize: '14px', lineHeight: '1.4', backgroundColor: 'white', padding: '4px', borderRadius: '5px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                        <strong>Z:</strong> {route.from_city?.split(',')[0]}<br />
                        <strong>Do:</strong> {route.to_city?.split(',')[0]}
                    </div>
                    <div style={{ marginBottom: '6px' }}>📅 {route.date}</div>
                    <div style={{ marginBottom: '6px' }}>📦 {route.load_capacity || '–'}</div>
                    <div style={{ marginBottom: '6px' }}>Osób: {route.passenger_count || '–'}</div>
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

// Zmieniony komponent StaticRoutePolyline, który teraz renderuje Marker w punkcie początkowym trasy
// i obsługuje Popup dla Markera
const StaticRouteClusterMarker = React.memo(function StaticRouteClusterMarker({ route }) {
    console.log('Rendering StaticRouteClusterMarker for route ID:', route.id);

    let fromPointCoords = null;
    if (typeof route.from_lat === 'number' && typeof route.from_lng === 'number') {
        fromPointCoords = [route.from_lat, route.from_lng]; // [lat, lng]
    }

    let toPointCoords = null;
    if (typeof route.to_lat === 'number' && typeof route.to_lng === 'number') {
        toPointCoords = [route.to_lat, route.to_lng]; // [lat, lng]
    }

    // Jeśli brakuje obu punktów, nie renderuj nic
    if (!fromPointCoords && !toPointCoords) return null;

    // Tworzenie domyślnej ikony markera (możesz użyć różnych ikon dla "from" i "to" jeśli chcesz)
    const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // Możesz stworzyć osobną ikonę dla punktu końcowego, np. czerwoną
    const toIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', // Przykład czerwonej ikony
        iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });


    // Funkcja do renderowania zawartości popupu
    const renderPopupContent = (route) => (
        <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                <strong>Z:</strong> {route.from_city?.split(',')[0]}<br />
                <strong>Do:</strong> {route.to_city?.split(',')[0]}
            </div>
            <div style={{ marginBottom: '6px' }}>📅 {route.date}</div>
            <div style={{ marginBottom: '6px' }}>📦 {route.load_capacity || '–'}</div>
            <div style={{ marginBottom: '6px' }}>Osób: {route.passenger_count || '–'}</div>
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
    );

    return (
        <>
            {/* Marker dla punktu początkowego */}
            {fromPointCoords && (
                <Marker position={fromPointCoords} icon={defaultIcon}>
                    <Popup>{renderPopupContent(route)}</Popup>
                </Marker>
            )}

            {/* Marker dla punktu końcowego */}
            {toPointCoords && (
                <Marker position={toPointCoords} icon={toIcon}> {/* Użyj innej ikony dla wyróżnienia */}
                    <Popup>{renderPopupContent(route)}</Popup>
                </Marker>
            )}
        </>
    );
});

function MapViewAndInteractionSetter({ mapMode, resetMapViewTrigger }) {
    const map = useMap();

    useEffect(() => {
        console.log(`MapViewAndInteractionSetter: mapMode changed to ${mapMode}`);
        if (mapMode === 'grid') {
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
            console.log("MapViewAndInteractionSetter: Interakcje mapy WŁĄCZONE (dla grid, z dwoma palcami).");

            map.setView([49.45, 11.07], 5);

        } else {
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
    }, [mapMode, map, resetMapViewTrigger]);

    return null;
}


function SearchRoutes() {
    const [center, setCenter] = useState([49.45, 11.07]);
    const [allRoutes, setAllRoutes] = useState([]); // Będzie akumulować wszystkie załadowane trasy
    const [filteredRoutes, setFilteredRoutes] = useState([]); // Nadal używane dla wyników wyszukiwania
   const [displayedRoutes, setDisplayedRoutes] = useState([]); // <--- PRZYWRÓCONA DEFINICJA
    const [isLoadingMore, setIsLoadingMore] = useState(false); // <--- PRZYWRÓCONA (dla spójności, choć bez paginacji)
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
    const [resetMapViewTrigger, setResetMapViewTrigger] = useState(0);

    // ... w SearchRoutes ...

    // NOWA FUNKCJA fetchRoutes (zastępuje fetchAllRoutesForGrid)
   const fetchRoutes = useCallback(async () => { // Usunięto 'isInitialLoad', bo zawsze ładujemy wszystko
        setIsLoading(true); // Główny loader dla całej strony

        const today = new Date().toISOString().split('T')[0];

        // Parametry zapytania dla Worker'a - BEZ offset/limit
        const queryParams = new URLSearchParams({
select: 'id,from_city,to_city,date,load_capacity,passenger_count,vehicle_type,phone,uses_whatsapp,messenger_link,user_id,from_lat,from_lng,to_lat,to_lng,users_extended(id,nip,role,is_premium)',
            'date': `gte.${today}`,
            'order': 'created_at.desc',
        }).toString();

        // Adres URL Twojego Cloudflare Worker'a
const workerUrl = `https://map-api-proxy.lawetaolsztyn.workers.dev/api/routes?${queryParams}`;

        let data = null;
        let error = null;
        // let count = null; // Nie potrzebujemy count, skoro ładujemy wszystko

        try {
             const response = await fetch(workerUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Prefer': 'count=exact',
                },
                cache: 'default' // <-- DODANA LINIA! Instruuje przeglądarkę, aby używała domyślnej polityki cache'owania HTTP
                // Alternatywnie, jeśli chcesz agresywnie cacheować, możesz użyć:
                // cache: 'force-cache' // To może być zbyt agresywne, 'default' jest zazwyczaj lepszy
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorBody}`);
            }

            data = await response.json();

            if (!Array.isArray(data)) {
                console.error("Worker zwrócił nieoczekiwany format danych:", data);
                throw new Error("Nieoczekiwany format danych z Worker'a (oczekiwano tablicy).");
            }

            const parsed = data.map(route => ({
                ...route,
                geojson: route.geojson, // Zakładamy, że jest już obiektem
                users_extended: route.users_extended ? {
                    id: route.users_extended.id,
                    nip: route.users_extended.nip,
                    role: route.users_extended.role,
                    is_premium: route.users_extended.is_premium
                } : null
            }));

            // ZAWSZE ustawiamy WSZYSTKIE pobrane trasy
            setAllRoutes(parsed);
            setDisplayedRoutes(parsed); // Wyświetlamy wszystkie

        } catch (e) {
            error = e;
            console.error("Błąd ładowania tras przez Worker'a:", e);
        } finally {
            setIsLoading(false);
            // setIsLoadingMore(false); // Ta zmienna nie jest już używana, więc ją usuń
        }
    }, []); // <-- ZALEŻNOŚCI: Teraz jest pusta tablica [], bo funkcja nie zależy od żadnych zmiennych stanu, które by ją zmieniały.

    // NOWY useEffect do wywołania fetchRoutes na starcie i przy resecie
    // ... w SearchRoutes ...

    // useEffect do wywołania fetchRoutes na starcie i przy resecie
    useEffect(() => {
        fetchRoutes(); // Wywołaj fetchRoutes bez argumentu, bo zawsze ładujemy wszystko
       // Realtime subscription
        const channel = supabase
            .channel('public:routes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, payload => {
                console.log('Realtime change detected, refetching ALL routes for grid mode.');
                fetchRoutes(); // Wywołaj fetchRoutes bez argumentu
             })
             .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchRoutes]); // Zależność od fetchRoutes (z useCallback) jest tutaj OK.

    const handleRouteClick = (route) => {
        setSelectedRoute(route);
        setSelectedRouteTrigger(prev => prev + 1);
    };


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


    const handleSearchClick = useCallback(async () => {
        setIsLoading(true);
        setSelectedRoute(null);

        const formattedDate = selectedDate || null;
        const defaultRadiusForVia = 5000;

        console.log("Parametry wysyłane do search_routes:");
        console.log("p_from_lat:", fromLocation?.lat);
        console.log("p_from_lng:", fromLocation?.lng);
        console.log("p_to_lat:", toLocation?.lat);
        console.log("p_to_lng:", toLocation?.lng);
        console.log("p_date:", formattedDate);
        console.log("p_vehicle_type:", vehicleType);
        console.log("p_radius_meters:", defaultRadiusForVia);

        const { data, error } = await supabase.rpc('search_routes', {
            p_from_lat: fromLocation?.lat || null,
            p_from_lng: fromLocation?.lng || null,
            p_to_lat: toLocation?.lat || null,
            p_to_lng: toLocation?.lng || null,
            p_via_lat: null,
            p_via_lng: null,
            p_date: formattedDate,
            p_vehicle_type: vehicleType || null,
            p_radius_meters: defaultRadiusForVia
        });

        if (error) {
            console.error('Błąd podczas wyszukiwania tras w Supabase:', error);
            setFilteredRoutes([]);
        } else {
            console.log('Supabase search_routes zwróciło dane. Ilość:', data.length, 'Dane:', data);

            const parsedRoutes = data.map(route => ({
                ...route,
                geojson: typeof route.geojson === 'string' ? JSON.parse(route.geojson) : route.geojson,
                users_extended: {
                    id: route.users_extended_id,
                    nip: route.users_extended_nip,
                    role: route.users_extended_role,
                    is_premium: route.users_extended_is_premium
                }
            }));
            setFilteredRoutes(parsedRoutes);
            setMapMode('search');
            setSearchTrigger(prev => prev + 1);
            if (parsedRoutes.length > 0) {
                setSelectedRoute(parsedRoutes[0]);
                setSelectedRouteTrigger(prev => prev + 1);
            }
        }
        setIsLoading(false);
    }, [fromLocation, toLocation, selectedDate, vehicleType]);

    const handleResetClick = useCallback(() => {
        console.log("Przycisk Reset kliknięty. Ustawiam mapMode na 'grid'.");
        setFromLocation(null);
        setToLocation(null);
        setFromValue('');
        setToValue('');
        setVehicleType('');
        setSelectedDate('');
        setSearchTrigger(0);

        setDisplayedRoutes([]); // Wyczyść wyświetlane trasy
        setAllRoutes([]);       // Wyczyść buforowane trasy
        setSelectedRoute(null);
        setSelectedRouteTrigger(prev => prev + 1);
        setResetTrigger(prev => prev + 1);
        setResetMapViewTrigger(prev => prev + 1);

        setMapMode('grid'); // Przełącz na tryb grid

        fetchRoutes(); // Wywołaj funkcję ładowania wszystkich tras (bez argumentu true)
    }, [fetchRoutes]);

    return (
        <>
            <Navbar />

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box', overflowY: 'auto', paddingBottom: '0px' }}>

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
                            <MapViewAndInteractionSetter mapMode={mapMode} resetMapViewTrigger={resetMapViewTrigger} />

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
                                    <MarkerClusterGroup>
                                        {displayedRoutes.map((route) => (
                                            <StaticRouteClusterMarker key={route.id} route={route} />
                                        ))}
                                    </MarkerClusterGroup>
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

                            {/* SEKCJA LEGENDY - DODAJ TEN KOD TUTAJ */}
                            <div style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '20px',
                                zIndex: 1000, /* Upewnij się, że jest nad mapą */
                                backgroundColor: 'white',
                                padding: '10px',
                                borderRadius: '8px',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                fontSize: '14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <img
                                        src="https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png" /* Ścieżka do niebieskiej pinezki */
                                        alt="Początek trasy"
                                        style={{ width: '25px', height: '41px', transform: 'scale(0.8)' }} /* Zmniejsz rozmiar */
                                    />
                                    <span>Początek trasy</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <img
                                        src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png" /* Ścieżka do czerwonej pinezki */
                                        alt="Koniec trasy"
                                        style={{ width: '25px', height: '41px', transform: 'scale(0.8)' }} /* Zmniejsz rozmiar */
                                    />
                                    <span>Koniec trasy</span>
                                </div>
                            </div>
                            {/* KONIEC SEKCJI LEGENDY */}

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