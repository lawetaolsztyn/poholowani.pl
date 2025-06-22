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

    // Funkcja do anulowania planowanego zamknięcia
    const cancelClose = () => {
        if (closeTimeoutIdRef.current) {
            clearTimeout(closeTimeoutIdRef.current);
            closeTimeoutIdRef.current = null;
            console.log('CancelClose: Anulowano planowane zamknięcie popupu.');
        }
    };

    // Funkcja do otwierania popupu
    const handleOpenPopup = (latlng) => {
        console.log('handleOpenPopup: Wywołano.');
        cancelClose(); // Anuluj każde planowane zamknięcie

        // Czyścimy poprzednie timeouty otwierania, aby uniknąć wielokrotnego otwierania
        if (openTimeoutIdRef.current) {
            clearTimeout(openTimeoutIdRef.current);
            openTimeoutIdRef.current = null;
        }

        // Planujemy otwarcie popupu po opóźnieniu (100ms)
        openTimeoutIdRef.current = setTimeout(() => {
            if (popupRef.current && !popupRef.current.isOpen()) {
                popupRef.current.setLatLng(latlng).openOn(map);
                console.log('OpenPopup: Popup otwarty.');
            } else {
                console.log('OpenPopup: Popup już otwarty lub ref niedostępny.');
            }
            openTimeoutIdRef.current = null; // Czyścimy ref po wykonaniu
        }, 100); // <-- Opóźnienie 100ms
        
        if (onPolylineMouseOver) onPolylineMouseOver(route.id); // Aktualizuj stan hover linii
    };

    // Funkcja do planowania zamknięcia popupu
    const handleClosePopup = () => {
        console.log('handleClosePopup: Wywołano.');
        // Czyścimy timeout otwierania, jeśli istnieje
        if (openTimeoutIdRef.current) {
            clearTimeout(openTimeoutIdRef.current);
            openTimeoutIdRef.current = null;
            console.log('handleClosePopup: Anulowano planowane otwarcie (bo kursor zjechał).');
        }

        // ZMIANA TUTAJ: Większe opóźnienie dla scheduleClosePopup
        // To opóźnienie da więcej czasu na przetworzenie mouseenter na popupie, zanim zdecydujemy o zamknięciu.
        closeTimeoutIdRef.current = setTimeout(() => { // Upewnij się, że ten timeout nie jest już ustawiony
            if (popupRef.current && popupRef.current.isOpen()) { // Sprawdzamy, czy popup jest nadal otwarty
                // Jeśli mysz NIE jest nad popupem, to go zamknij
                // Tutaj jest miejsce, gdzie można dodać dodatkowy warunek,
                // ale najpierw testujemy samo opóźnienie.
                popupRef.current.close();
                console.log('ClosePopup: Popup zamknięty po opóźnieniu.');
            } else {
                console.log('ClosePopup: Popup już zamknięty lub ref niedostępny.');
            }
            closeTimeoutIdRef.current = null; // Zresetuj ID po wykonaniu
        }, 300); // <-- ZWIĘKSZONE OPÓŹNIENIE NA START ZAMYKANIA DO 300ms (z 50ms)
        
        if (onPolylineMouseOut) onPolylineMouseOut(null); // Aktualizuj stan hover linii
    };

    // Użyj useEffect do czyszczenia timeoutów przy odmontowaniu komponentu
    useEffect(() => {
        return () => {
            if (openTimeoutIdRef.current) clearTimeout(openTimeoutIdRef.current);
            if (closeTimeoutIdRef.current) clearTimeout(closeTimeoutIdRef.current);
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
                    // ZMIANA TUTAJ: WYZYWAMY handleClosePopup BEZPOŚREDNIO
                    handleClosePopup();
                    if (onPolylineMouseOut) onPolylineMouseOut(null); // Ważne: to musi być tutaj, aby linia zmieniła kolor
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
                        popupContent.onmouseenter = cancelClose; // Anuluj zamknięcie, gdy kursor wejdzie na popup
                        popupContent.onmouseleave = handleClosePopup; // Planuj zamknięcie, gdy kursor opuści popup
                    }
                }}
                onClose={() => {
                    console.log('Popup: onClose wywołano.');
                }}
            >
                {/* ... (zawartość Popup bez zmian) ... */}
                <div style={{ fontSize: '14px', lineHeight: '1.4', backgroundColor: 'white', padding: '4px', borderRadius: '5px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                        <strong>Z:</strong> {route.from_city?.split(',')[0]}<br />
                        <strong>Do:</strong> {route.to_city?.split(',')[0]}
                    </div>
                    <div style={{ marginBottom: '6px' }}>📅 {route.date}</div>
                    <div style={{ marginBottom: '6px' }}>📦 {route.load_capacity || '–'}</div>
                    <div style={{ marginBottom: '6px' }}>🧍 {route.passenger_count || '–'}</div>
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