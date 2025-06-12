// src/components/MapComponent.jsx
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Ważne, aby CSS Leaflet był załadowany

// Mały komponent pomocniczy, który dba o odświeżanie rozmiaru mapy
function MapResizer() {
  const map = useMap(); // Pobierz instancję mapy z kontekstu Leaflet

  useEffect(() => {
    // Kiedy komponent się zamontuje, wywołaj invalidateSize
    map.invalidateSize();

    // Dodaj listener do zdarzenia zmiany rozmiaru okna
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);

    // Funkcja czyszcząca po odmontowaniu komponentu
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [map]); // Zależność od instancji mapy

  return null; // Ten komponent nie renderuje niczego wizualnie
}


const CustomMap = () => {
  return (
    <MapContainer
      center={[52.0, 19.0]} // Ustawienia początkowe mapy
      zoom={6}
      className="leaflet-map-container" // Twoja klasa CSS
      dragging={false} // Wyłączamy przeciąganie
      zoomControl={false} // Ukrywamy kontrolki zoomu
      scrollWheelZoom={false} // Wyłączamy zoom kółkiem myszy
      doubleClickZoom={false} // Wyłączamy zoom podwójnym kliknięciem
      boxZoom={false} // Wyłączamy zoom ramką
      keyboard={false} // Wyłączamy nawigację klawiaturą
      touchZoom={false} // Wyłączamy zoom dotykiem (jeśli chcesz pełną szerokość)
      // Usunąłem `whenCreated` tutaj, bo MapResizer zajmie się refem do mapy
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapResizer /> {/* Dodaj nowy komponent do odświeżania rozmiaru mapy */}
    </MapContainer>
  );
};

export default CustomMap;