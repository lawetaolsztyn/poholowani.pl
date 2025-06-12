// src/components/Header.jsx

import './Header.css'; // Importujemy dedykowany CSS dla Header'a

export default function Header({ title = "Wykorzystaj puste przebiegi!", subtitle = "Znajdź lub zaoferuj transport powrotny lawet i busów w całej Europie. Prosto i szybko!" }) {
  return (
    // Ten div.overlay-header otrzyma tło i szerokość z LandingPage.css,
    // ale styl zawartości (tekstu, logo) będzie z Header.css
    <div className="overlay-header">
      {/* Upewnij się, że logo jest tutaj i ma klasę */}
      <img src="/poholowani_logo.png" alt="Poholowani.pl Logo" className="header-logo" />
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}
