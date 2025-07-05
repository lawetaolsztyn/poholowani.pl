// src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext'; // Importuj useAuth
import './Navbar.css';

export default function Navbar() {
  const { currentUser, loading, totalUnreadMessages } = useAuth(); // Pobierz totalUnreadMessages
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Błąd wylogowania:', error.message);
      alert('Błąd wylogowania: ' + error.message);
    } else {
      navigate('/login');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">LawetaOlsztyn.pl</Link>
      </div>
      <div className="navbar-right">
        {loading ? (
          <span>Ładowanie...</span>
        ) : currentUser ? (
          <>
            <span className="navbar-welcome">Witaj, {currentUser.full_name || currentUser.email}!</span>
            <Link to="/moje-ogloszenia" className="navbar-item">Moje Ogłoszenia</Link>
            <Link to="/dodaj-ogloszenie" className="navbar-item">Dodaj Ogłoszenie</Link>
            <Link to="/moje-czaty" className="navbar-item">
              Moje Chaty
              {totalUnreadMessages > 0 && ( // Wyświetl licznik tylko jeśli > 0
                <span className="unread-messages-count-badge">
                  {totalUnreadMessages}
                </span>
              )}
            </Link>
            <button onClick={handleLogout} className="navbar-button">Wyloguj</button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-button">Logowanie</Link>
            <Link to="/rejestracja" className="navbar-button">Rejestracja</Link>
          </>
        )}
      </div>
    </nav>
  );
}