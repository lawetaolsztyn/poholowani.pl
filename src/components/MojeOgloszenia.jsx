import React from 'react';
import './MojeOgloszenia.css'; // Utworzymy ten plik CSS później
import Navbar from './Navbar';


export default function MojeOgloszenia() {
  return (
<>
<Navbar />
    <div className="moje-ogloszenia-container">
      <h1>Moje Ogłoszenia</h1>
      <p>Tutaj będą wyświetlane Twoje ogłoszenia.</p>
      {/* Tutaj będziesz dodawać logikę do pobierania i wyświetlania ogłoszeń użytkownika */}
    </div>
</>
  );
}