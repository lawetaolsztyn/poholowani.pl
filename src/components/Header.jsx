// src/components/Header.jsx

import './Header.css';
import logo from '../assets/logo.png'; // Upewnij się, że ta ścieżka jest poprawna!

export default function Header({ title, subtitle }) {
  return (
    <div className="header-component"> {/* To jest kontener WNĘTRZA headera */}
      <img src={logo} alt="Poholowani.pl Logo" className="header-logo" />
      <div className="header-text-content"> {/* Kontener dla tekstu */}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
