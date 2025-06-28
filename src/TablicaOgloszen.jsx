// src/TablicaOgloszen.jsx
import React from 'react';
import Navbar from './components/Navbar'; // Upewnij się, że ścieżka do Navbar jest poprawna
import Header from './components/Header'; // Importujemy komponent Header
import './TablicaOgloszen.css'; // Utworzymy ten plik CSS w kolejnym kroku

export default function TablicaOgloszen() {
  return (
    <>
      <Navbar />
      <Header
        title="Tablica Ogłoszeń"
        subtitle="Przeglądaj ogłoszenia o potrzebie transportu."
      />
      <div className="content-container"> {/* Nowy kontener na właściwą treść */}
        {/* Tutaj będzie zawartość Tablicy Ogłoszeń */}
        <h2>Witaj na Tablicy Ogłoszeń!</h2>
        <p>Tutaj znajdziesz ogłoszenia klientów szukających transportu pojazdów lub innych ładunków w konkretnych terminach.</p>
        <p>Możesz składać zapytania, filtrować ogłoszenia i kontaktować się ze zleceniodawcami.</p>
        {/* PRZYKŁADOWA TREŚĆ - DO UZGODNIENIA PÓŹNIEJ */}
      </div>
    </>
  );
}