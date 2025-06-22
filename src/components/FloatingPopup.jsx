// src/components/FloatingPopup.jsx
import React from 'react';
import L from 'leaflet';

function FloatingPopup({ map, latlng, route }) {
  if (!map || !latlng || !route) return null;

  const point = map.latLngToContainerPoint(latlng);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${point.x}px`,
        top: `${point.y}px`,
        transform: 'translate(-50%, -100%)',
        background: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        zIndex: 9999,
        fontSize: '14px',
        maxWidth: '220px',
      }}
    >
      <div><strong>Z:</strong> {route.from_city?.split(',')[0]}</div>
      <div><strong>Do:</strong> {route.to_city?.split(',')[0]}</div>
      <div><strong>📅</strong> {route.date}</div>
      <div><strong>📦</strong> {route.load_capacity || '–'}</div>
      <div><strong>🚐</strong> {route.vehicle_type === 'laweta' ? 'Laweta' : 'Bus'}</div>
    </div>
  );
}

export default FloatingPopup;
