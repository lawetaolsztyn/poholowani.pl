// src/components/RequestDetails.jsx

import React, { useEffect, useState, useMemo } from 'react'; // Zmieniono z useRef na useMemo
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet'; 
import { supabase } from '../supabaseClient';
import './RequestDetails.css'; 
import 'leaflet/dist/leaflet.css';




// Komponent do centrowania mapy na markerze
function MapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] != null && center[1] != null) {
      map.setView(center, map.getZoom() > 10 ? map.getZoom() : 13);
    }
  }, [center, map]);
  return null;
}

export default function RequestDetails({ requestId, onBackToList }) {
  const [request, setRequest] = useState(null);
  const [nearbyRoadsideAssistance, setNearbyRoadsideAssistance] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingRoadside, setLoadingRoadside] = useState(false);

  // KLUCZOWA ZMIANA: Inicjalizacja ikon za pomocą useMemo
  // Gwarantuje, że ikony są tworzone tylko raz i są gotowe do użycia w renderze.
  const requestIcon = useMemo(() => {
    console.log("DEBUG: Tworzenie requestIcon...");
    return new L.Icon({
      iconUrl: '/icons/request-marker.png',
      iconSize: [35, 35],
      iconAnchor: [17, 35],
      popupAnchor: [0, -35],
    });
  }, []); // Pusta tablica zależności - tworzy się raz

  const towIcon = useMemo(() => {
    console.log("DEBUG: Tworzenie towIcon...");
    return new L.Icon({
      iconUrl: '/icons/pomoc-drogowa.png',
      iconSize: [40, 60],
      iconAnchor: [20, 60],
      popupAnchor: [0, -60],
    });
  }, []); // Pusta tablica zależności - tworzy się raz


  useEffect(() => {
    // Nie ma potrzeby używania iconsLoaded w tym kontekście,
    // ponieważ useMemo gwarantuje, że ikony są tworzone zaraz po pierwszym renderze.
    const fetchDetailsAndRoadside = async () => {
      setLoadingDetails(true);
      setRequest(null); 
      setNearbyRoadsideAssistance([]); 

      try {
        const { data: requestData, error: requestError } = await supabase
          .from('urgent_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (requestError) throw requestError;
        setRequest(requestData);

        if (requestData.location_from_lat && requestData.location_from_lng) {
          setLoadingRoadside(true);
          const { data: roadsideData, error: roadsideError } = await supabase
            .from('users_extended')
            .select('id, company_name, roadside_slug, roadside_city, roadside_street, roadside_number, roadside_phone, latitude, longitude')
            .eq('is_pomoc_drogowa', true)
            .eq('is_roadside_assistance_agreed', true) 
            .not('latitude', 'is', null) 
            .not('longitude', 'is', null);

          if (roadsideError) throw roadsideError;

          const distanceThresholdKm = 30; // Zasięg 30 km
          const nearby = roadsideData.filter(rs => {
            if (rs.latitude && rs.longitude) {
              const distance = calculateDistance(
                requestData.location_from_lat,
                requestData.location_from_lng,
                rs.latitude,
                rs.longitude
              );
              return distance <= distanceThresholdKm;
            }
            return false;
          });
          setNearbyRoadsideAssistance(nearby);
        }
      } catch (error) {
        console.error("Błąd ładowania szczegółów zgłoszenia lub pomocy drogowej:", error.message);
        setRequest(null);
        setNearbyRoadsideAssistance([]);
      } finally {
        setLoadingDetails(false);
        setLoadingRoadside(false);
      }
    };

    if (requestId) { 
      fetchDetailsAndRoadside();
    }
  }, [requestId]); // Zależność tylko od requestId

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Promień Ziemi w kilometrach
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance; // Odległość w kilometrach
  };

  // Ładowanie szczegółów zgłoszenia / mapy
  if (loadingDetails) { // Usunięto !iconsLoaded, bo useMemo gwarantuje tworzenie
    return <div className="request-details-loading">Ładowanie szczegółów zgłoszenia...</div>;
  }

  if (!request) {
    return (
      <div className="request-details-error">
        <p>Nie znaleziono zgłoszenia lub jest niedostępne.</p>
        <button className="btn-secondary" onClick={onBackToList}>
          Powrót do listy
        </button>
      </div>
    );
  }

  const requestPosition = request.location_from_lat && request.location_from_lng
    ? [request.location_from_lat, request.location_from_lng]
    : null;

  return (
    <div className="request-details-section">
      <h2>Szczegóły zgłoszenia</h2>
      <div className="details-card">
        <p><strong>Rodzaj pojazdu:</strong> {request.vehicle_type}</p>
        <p><strong>Lokalizacja:</strong> {request.location_from_label}</p>
        {request.location_to_label && <p><strong>Transport do:</strong> {request.location_to_label}</p>}
        <p><strong>Opis:</strong> {request.problem_description}</p>
        <p><strong>Zgłoszono:</strong> {new Date(request.created_at).toLocaleString()}</p>
        {request.phone_number && (
          <p className="phone-contact">
            📞 Telefon: <a href={`tel:${request.phone_number}`} className="text-blue-600 hover:underline">{request.phone_number}</a>
          </p>
        )}
      </div>

      {/* Renderuj mapę tylko wtedy, gdy requestPosition i ikony są zdefiniowane przez useMemo */}
      {requestPosition && requestIcon && towIcon ? ( 
        <div className="map-container">
          <MapContainer center={requestPosition} zoom={13} className="request-map" gestureHandling={true}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <MapCenterUpdater center={requestPosition} />
            <Marker position={requestPosition} icon={requestIcon} > 
              <Popup>
                <strong>Zgłoszenie:</strong> {request.vehicle_type} <br/> {request.location_from_label}
              </Popup>
            </Marker>

            {loadingRoadside && <div className="map-loading-overlay">Ładowanie pomocy drogowej...</div>}
            {nearbyRoadsideAssistance.length > 0 ? (
              nearbyRoadsideAssistance.map(rs => (
                rs.latitude && rs.longitude && (
                  <Marker key={rs.id} position={[rs.latitude, rs.longitude]} icon={towIcon}> 
                    <Popup>
                      <strong>{rs.company_name || 'Pomoc Drogowa'}</strong><br/>
                      {rs.roadside_city}, {rs.roadside_street} {rs.roadside_number}<br/>
                      {rs.roadside_phone && <a href={`tel:${rs.roadside_phone}`}>{rs.roadside_phone}</a>}<br/>
                      {rs.roadside_slug && <a href={`/pomoc-drogowa/${rs.roadside_slug}`} target="_blank" rel="noopener noreferrer">Zobacz profil</a>}
                    </Popup>
                  </Marker>
                )
              ))
            ) : (
              !loadingRoadside && <div className="map-info-overlay">Brak pobliskich pomocy drogowej (do 30 km od zgłoszenia).</div>
            )}
          </MapContainer>
        </div>
      ) : (
        <p className="no-coords-message">Brak koordynatów dla tego zgłoszenia, lub błąd ładowania mapy/ikon. Mapa niedostępna.</p>
      )}

      <button className="btn-secondary" onClick={onBackToList}>
        Powrót do listy
      </button>
    </div>
  );
}