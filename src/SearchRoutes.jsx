// src/SearchRoutes.jsx
import React, { useEffect, useState, useRef, createContext, useContext, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Pane, useMap } from 'react-leaflet';
import { supabase } from './supabaseClient';
import 'leaflet/dist/leaflet.css';
import Navbar from './components/Navbar';
import Header from './components/Header';
import LocationAutocomplete from './components/LocationAutocomplete';
import RouteSlider from './RouteSlider';
import L from 'leaflet';
import RoadsideMarkers from './components/RoadsideMarkers';
import FloatingPopup from './components/FloatingPopup';

const MapContext = createContext(null);

function HighlightedRoute({ route, isHovered, onPolylineMouseOver, onPolylineMouseOut, setHoveredPopup }) {
  const map = useMap();

  let coords = [];
  if (route.geojson?.features?.[0]?.geometry?.coordinates) {
    coords = route.geojson.features[0].geometry.coordinates
      .filter(pair => Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'number' && typeof pair[1] === 'number')
      .map(([lng, lat]) => [lat, lng]);
  }
  if (coords.length === 0) return null;

  return (
    <Polyline
      positions={coords}
      pane={isHovered ? 'hovered' : 'routes'}
      pathOptions={{ color: isHovered ? 'red' : 'blue', weight: isHovered ? 6 : 5 }}
      eventHandlers={{
        mouseover: (e) => {
          setHoveredPopup({ latlng: e.latlng, route });
          if (onPolylineMouseOver) onPolylineMouseOver(route.id);
        },
        mousemove: (e) => {
          setHoveredPopup(prev => prev ? { ...prev, latlng: e.latlng } : null);
        },
        mouseout: () => {
          if (onPolylineMouseOut) onPolylineMouseOut(null);
          setTimeout(() => setHoveredPopup(null), 1500);
        }
      }}
    />
  );
}

function SearchRoutes() {
  const [center, setCenter] = useState([49.45, 11.07]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [hoveredRouteId, setHoveredRouteId] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [hoveredPopup, setHoveredPopup] = useState(null);
  const mapRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchRoutes = async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('*');
      if (!error) {
        const parsed = data.map(route => ({
          ...route,
          geojson: typeof route.geojson === 'string' ? JSON.parse(route.geojson) : route.geojson
        }));
        setAllRoutes(parsed);
        setFilteredRoutes(parsed);
      }
    };
    fetchRoutes();
  }, []);

  return (
    <>
      <Navbar />
      <div style={{ width: '100%', height: '600px', position: 'relative' }}>
        <MapContext.Provider value={{ center, setCenter }}>
          <MapContainer
            center={[51.0504, 13.7373]}
            zoom={5}
            whenCreated={(map) => (mapRef.current = map)}
            className="main-map-container"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Pane name="routes" style={{ zIndex: 400 }} />
            <Pane name="hovered" style={{ zIndex: 500 }} />

            {filteredRoutes.map(route => (
              <HighlightedRoute
                key={route.id}
                route={route}
                isHovered={route.id === hoveredRouteId}
                onPolylineMouseOver={setHoveredRouteId}
                onPolylineMouseOut={setHoveredRouteId}
                setHoveredPopup={setHoveredPopup}
              />
            ))}
          </MapContainer>
        </MapContext.Provider>

        {hoveredPopup && mapRef.current && (
          <FloatingPopup
            map={mapRef.current}
            latlng={hoveredPopup.latlng}
            route={hoveredPopup.route}
          />
        )}
      </div>
    </>
  );
}

export default SearchRoutes;
