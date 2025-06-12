// src/components/MapTouchOverlay.jsx
import React, { useState, useEffect } from 'react';

const MapTouchOverlay = () => {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    if (isMobile) {
      setShowOverlay(true);
    }
  }, []);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      setShowOverlay(false);
    }
  };

  return showOverlay ? (
    <div
      className="map-overlay"
      onTouchStart={handleTouchStart}
    >
      <p>🖐️ Użyj <strong>dwóch palców</strong>, aby przesunąć mapę</p>
    </div>
  ) : null;
};

export default MapTouchOverlay;
