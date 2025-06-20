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
                    setCenter([52.2297, 21.0122]); // Default to Warsaw if geolocation fails
                }
            );
        }
    }, [resetTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

    return null;
}

// Nowy komponent do renderowania wyróżnionej trasy z pop-upem
function HighlightedRouteWithPopup({ route, isHovered, isClicked, onPolylineMouseOver, onPolylineMouseOut, onPolylineClick }) {
    const polylineRef = useRef();

    useEffect(() => {
        if (polylineRef.current) {
            const map = polylineRef.current._map; // Dostęp do instancji mapy
            if (isClicked) {
                // Otwórz popup, jeśli trasa jest kliknięta
                polylineRef.current.openPopup();
                // Opcjonalnie, wyśrodkuj mapę na klikniętej trasie
                map.fitBounds(polylineRef.current.getBounds());
            } else {
                // Zamknij popup, jeśli trasa nie jest kliknięta
                polylineRef.current.closePopup();
            }
        }
    }, [isClicked]);

    const polylineOptions = useMemo(() => {
        let color = '#0000FF'; // Domyślny niebieski
        let weight = 4; // Domyślna grubość

        if (isHovered && !isClicked) {
            color = '#FF0000'; // Czerwony dla najechania
            weight = 6;
        } else if (isClicked) {
            color = '#FF0000'; // Czerwony dla kliknięcia
            weight = 6;
        }
        return { color, weight, dashArray: route.is_request ? '10, 10' : undefined };
    }, [isHovered, isClicked, route.is_request]);

    if (!route.route_geometry || route.route_geometry.coordinates.length === 0) {
        return null;
    }

    // Zamieniamy [lon, lat] na [lat, lon] dla Leaflet
    const leafletCoordinates = route.route_geometry.coordinates.map(coord => [coord[1], coord[0]]);

    return (
        <Polyline
            positions={leafletCoordinates}
            pathOptions={polylineOptions}
            eventHandlers={{
                mouseover: () => onPolylineMouseOver(route.id),
                mouseout: () => onPolylineMouseOut(),
                click: () => onPolylineClick(route.id),
            }}
            ref={polylineRef}
        >
            <Popup className="route-popup">
                <div style={{ padding: '10px', minWidth: '200px' }}>
                    <h3 style={{ marginBottom: '10px', color: '#333' }}>Szczegóły Trasy</h3>
                    <p><strong>Dystans:</strong> {route.distance ? `${(route.distance / 1000).toFixed(2)} km` : 'N/A'}</p>
                    <p><strong>Czas:</strong> {route.duration ? `${(route.duration / 60).toFixed(0)} min` : 'N/A'}</p>
                    {route.is_request && <p><strong>Typ:</strong> Zapytanie o trasę</p>}
                    {route.offer_price && <p><strong>Oferta cenowa:</strong> {route.offer_price} PLN</p>}
                    {route.notes && <p><strong>Notatki:</strong> {route.notes}</p>}
                    {route.contact_phone && (
                        <p>
                            <strong>Kontakt:</strong>{' '}
                            <a href={`tel:${route.contact_phone}`} style={{ fontWeight: 'bold', color: '#007bff', textDecoration: 'none' }}>
                                {route.contact_phone}
                            </a>
                        </p>
                    )}
                    {route.users_extended?.facebook && (
                        <p>
                            <a
                                href={route.users_extended.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#084FF', fontSize: '18px', fontWeight: 'bold', textDecoration: 'none' }}
                            >
                                🔵 Messenger
                            </a>
                        </p>
                    )}
                    {route.user_id && route.users_extended?.role === 'firma' && (
                        <div style={{ fontSize: '14px' }}>
                            {route.users_extended.nip ? (
                                <div style={{ marginBottom: '8px' }}>
                                    <span className="company-badge" style={{
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontWeight: 'bold',
                                        marginRight: '5px'
                                    }}>
                                        🏢 firma
                                    </span>
                                </div>
                            ) : null}
                            <strong>profil przewoźnika:</strong>{' '}
                            <a
                                href={`https://poholowani.pl/profil/${route.user_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontWeight: 'bold', color: '#007bff', textDecoration: 'none' }}
                            >
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
    const [center, setCenter] = useState([52.2297, 21.0122]); // Default to Warsaw
    const [routes, setRoutes] = useState([]);
    const [filteredRoutes, setFilteredRoutes] = useState([]);
    const [resetTrigger, setResetTrigger] = useState(0);
    const [mapMode, setMapMode] = useState('search');
    const [hoveredRouteId, setHoveredRouteId] = useState(null);
    const [clickedRouteId, setClickedRouteId] = useState(null); // Nowy stan dla klikniętej trasy

    const mapRef = useRef();

    useEffect(() => {
        const fetchRoutes = async () => {
            const { data, error } = await supabase.from('routes').select(`
                *,
                users_extended (
                    id,
                    username,
                    role,
                    facebook,
                    nip
                )
            `);
            if (error) {
                console.error('Error fetching routes:', error);
            } else {
                setRoutes(data);
                setFilteredRoutes(data);
            }
        };

        fetchRoutes();
    }, []);

    // Funkcja do obsługi kliknięcia na kafelek trasy w sliderze
    const handleRouteClick = useCallback((routeId) => {
        setClickedRouteId(routeId); // Ustaw klikniętą trasę
        setHoveredRouteId(null); // Wyzeruj najechaną trasę, jeśli jest
    }, []);


    return (
        <>
            <Navbar />
            <Header />
            <div className="search-routes-container">
                <LocationAutocomplete setFilteredRoutes={setFilteredRoutes} routes={routes} setMapMode={setMapMode} />

                <div className="map-container">
                    <MapContext.Provider value={{ setCenter, resetTrigger, mapRef }}>
                        <MapContainer
                            center={center}
                            zoom={6}
                            style={{ height: '100%', width: '100%' }}
                            whenCreated={(map) => {
                                mapRef.current = map;
                                // Inicjalizacja GestureHandling
                                L.Map.addInitHook(function () {
                                    if (this.options.gestureHandling) {
                                        this.gestureHandling = new L.GestureHandling(this);
                                    }
                                });
                                map.options.gestureHandling = true; // Włącz GestureHandling
                            }}
                            gestureHandling={true} // Włącz GestureHandling w propsach MapContainer
                        >
                            <MapEvents />
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />

                            {filteredRoutes.length > 0 && (
                                filteredRoutes.map((route) => (
                                    <HighlightedRouteWithPopup
                                        key={route.id}
                                        route={route}
                                        isHovered={route.id === hoveredRouteId}
                                        isClicked={route.id === clickedRouteId} // Przekazujemy stan kliknięcia
                                        onPolylineMouseOver={(id) => setHoveredRouteId(id)}
                                        onPolylineMouseOut={() => setHoveredRouteId(null)} // Resetuj hoveredId
                                        onPolylineClick={(id) => setClickedRouteId(id)} // Ustaw klikniętą trasę
                                    />
                                ))
                            )}

                            {mapMode === 'search' && <RoadsideMarkers />}

                        </MapContainer>
                    </MapContext.Provider>
                </div>
                {mapMode === 'search' && (
                    <div style={{ width: '98%', margin: '0 auto 20px auto', padding: '0px 10px 10px 10px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                        <RouteSlider
                            routes={filteredRoutes}
                            onHover={(id) => setHoveredRouteId(id)} // Nadal używamy onHover, ale teraz będzie tylko dla hovera z slidera
                            onClickRoute={handleRouteClick} // Przekazujemy handleRouteClick do RouteSlider
                            hoveredRouteId={hoveredRouteId} // Przekaż hoveredRouteId do RouteSlider, jeśli chcesz wizualnie wyróżnić kafelek
                            clickedRouteId={clickedRouteId} // Przekaż clickedRouteId do RouteSlider
                        />
                    </div>
                )}
            </div>
        </>
    );
}

export default SearchRoutes;