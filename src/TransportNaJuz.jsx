// src/TransportNaJuz.jsx
import React from 'react';
import Navbar from './components/Navbar'; // Upewnij się, że ścieżka do Navbar jest poprawna
import Footer from './components/Footer'; // Upewnij się, że ścieżka do Footer jest poprawna
import Header from './components/Header'; // Importujemy komponent Header
import './TransportNaJuz.css'; // Utworzymy ten plik CSS w kolejnym kroku

export default function TransportNaJuz() {
  return (
    <>
      <Navbar />
      <Header
        title="Transport Na Już!"
        subtitle="Pilne zgłoszenia pomocy drogowej i transportu awaryjnego."
      />
      <div className="content-container"> {/* Nowy kontener na właściwą treść */}
        {/* Tutaj będzie zawartość Transportu Na Już! */}
        <h2>Pilna Pomoc na Drodze!</h2>
        <p>Jesteś w potrzebie? Stoisz na drodze? Potrzebujesz natychmiastowego transportu?</p>
        <p>Tutaj możesz zgłosić pilną potrzebę transportu, a inni użytkownicy i przewoźnicy będą mogli szybko zareagować.</p>
        {/* PRZYKŁADOWA TREŚĆ - DO UZGODNIENIA PÓŹNIEJ */}
      </div>
      <Footer />
    </>
  );
}