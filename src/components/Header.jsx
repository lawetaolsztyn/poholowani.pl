// src/components/Header.jsx

import './Header.css'; // Importujemy dedykowany CSS dla Header'a
import logo from '../assets/logo.png'; // <--- KLUCZOWE: Upewnij się, że ta ścieżka do logo jest prawidłowa!

export default function Header({ title = "Wykorzystaj puste przebiegi!", subtitle = "Znajdź lub zaoferuj transport powrotny lawet i busów w całej Europie. Prosto i szybko!" }) {
  return (
    <div className="overlay-header">
      <img src={logo} alt="Poholowani.pl Logo" className="header-logo" /> {/* Użycie zaimportowanego logo */}
      <div className="header-text-container"> {/* <-- NOWY KONTENER NA TEKST */}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
