import React from 'react';
import { Polyline, Popup } from 'react-leaflet'; // Dodaj Popup, jeśli chcesz mieć wyskakujące okienko

export default function HighlightedRoute({ route, isHovered, onPolylineMouseOver, onPolylineMouseOut, onClickRoute }) {
    const geo = route.geojson?.features?.[0]?.geometry?.coordinates;

    if (!geo || !Array.isArray(geo) || geo.length < 2) {
        // Dodatkowe sprawdzenia, aby upewnić się, że geo jest poprawne
        // Powinno już być poprawione przez wcześniejsze parsowanie, ale to dodatkowa ostrożność
        console.warn(`HighlightedRoute: Invalid geometry for route ${route.id}. Skipping rendering.`);
        return null; // Nie renderuj, jeśli geometria jest nieprawidłowa lub za krótka
    }

    // Leaflet oczekuje współrzędnych w formacie [latitude, longitude]
    // Zmieniamy format [longitude, latitude] na [latitude, longitude]
    const leafletCoords = geo.map(coord => [coord[1], coord[0]]);

    // Ustawienie koloru i grubości linii w zależności od stanu najechania
    const lineColor = isHovered ? '#FF0000' : '#0000FF'; // Czerwony (#FF0000) jeśli najechany, Niebieski (#0000FF) domyślnie
    const lineWeight = isHovered ? 6 : 4; // Grubsza linia (6px) jeśli najechana, cieńsza (4px) domyślnie

    return (
        <Polyline
            positions={leafletCoords}
            color={lineColor}
            weight={lineWeight}
            eventHandlers={{
                mouseover: () => onPolylineMouseOver(route.id), // Ustawia hoveredRouteId w SearchRoutes.jsx
                mouseout: () => onPolylineMouseOut(null),     // Czyści hoveredRouteId w SearchRoutes.jsx
                click: () => {
                    // Opcjonalnie: jeśli kliknięcie na samą linię na mapie ma również reagować
                    if (onClickRoute) {
                        onClickRoute(route.id); // Wywołuje handleRouteClick w SearchRoutes.jsx
                    }
                    onPolylineMouseOver(route.id); // Pozostaw trasę czerwoną po kliknięciu na nią na mapie
                },
            }}
        >
            {/* Opcjonalny Popup, który pojawi się po kliknięciu na linię na mapie */}
            <Popup>
                <strong>ID Trasy:</strong> {route.id}<br/>
                <strong>Typ pojazdu:</strong> {route.vehicle_type}<br/>
                {route.start_location && <strong>Start:</strong>} {route.start_location || 'Brak danych'}<br/>
                {route.end_location && <strong>Koniec:</strong>} {route.end_location || 'Brak danych'}<br/>
                {/* Możesz dodać więcej szczegółów z obiektu trasy */}
            </Popup>
        </Polyline>
    );
}