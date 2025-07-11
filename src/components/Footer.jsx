import React from 'react'; // Dodaj import React, jeśli go nie ma
import './Footer.css';

const Footer = () => {
  const facebookGroupLink = "https://www.facebook.com/groups/1278233000603384"; // Twój link do grupy

  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-column">
          <h4>Informacje</h4>
          <ul>
            <li><a href="/regulamin">Regulamin</a></li>
            <li><a href="/polityka-prywatnosci">Polityka prywatności</a></li>
            <li><a href="/rodo">RODO</a></li>
          </ul>
        </div>
        <div className="footer-column">
          <h4>Kontakt</h4>
          <ul>
            <li><a href="mailto:kontakt@poholowani.pl">kontakt@poholowani.pl</a></li>
            <li><a href="tel:+48510260270">+48 510 260 270</a></li>
          </ul>
        </div>
        {/* NOWA KOLUMNA: Społeczność / Facebook */}
        <div className="footer-column footer-social"> {/* Dodana klasa footer-social dla stylów */}
          <h4>Społeczność</h4>
          <ul>
            <li>
              <a href={facebookGroupLink} target="_blank" rel="noopener noreferrer" className="facebook-group-link">
                <i className="fab fa-facebook-square"></i> {/* Ikona Facebooka */}
                Dołącz do grupy na FB
              </a>
            </li>
          </ul>
        </div>
        {/* KONIEC NOWEJ KOLUMNY */}
        <div className="footer-column">
          <h4>Na skróty</h4>
          <ul>
            <li><a href="/">Strona główna</a></li>
            <li><a href="/faq">FAQ / Pomoc</a></li>
            <li><a href="/kontakt">Kontakt</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2025 poholowani.pl – Wszelkie prawa zastrzeżone</p>
        <p>Projekt i wykonanie: Daroot Garage</p>
      </div>
      
      <div className="footer-legal">
        Korzystanie z serwisu oznacza akceptację 
        <a href="/regulamin"> Regulaminu</a>, 
        <a href="/polityka-prywatnosci"> Polityki Prywatności</a> 
        i informacji o cookies.
      </div>
    </footer>
  );
};

export default Footer;
