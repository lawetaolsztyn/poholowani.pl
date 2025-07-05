import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Navbar.css';
import { supabase } from '../supabaseClient';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path ? 'active' : '';

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email);
        const { data: profile, error: profileError } = await supabase
          .from('users_extended')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Błąd pobierania roli użytkownika z Navbar:', profileError.message);
          setRole(null);
        } else if (profile?.role) {
          console.log('🔑 Odczytano rolę z Supabase:', profile.role);
          setRole(profile.role);
          localStorage.setItem('role', profile.role);
        } else {
          setRole(null);
          localStorage.removeItem('role');
        }
      } else {
        setEmail(null);
        setRole(null);
        localStorage.removeItem('role');
      }
    };

    checkUser();
  }, [location.pathname]);

  useEffect(() => {
    console.log('👀 Aktualna rola w stanie Reacta:', role);
  }, [role]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Błąd wylogowania:', error.message);
      alert('Wystąpił błąd podczas wylogowywania.');
    } else {
      setEmail(null);
      setRole(null);
      localStorage.removeItem('role');
      navigate('/login');
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Funkcja do zamykania menu mobilnego po kliknięciu linku
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };


  return (
    <nav className="navbar">
      {/* NOWY ELEMENT: Ikona hamburgera */}
      <div className="hamburger-menu" onClick={toggleMobileMenu}>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
      </div>

      {/* ZMIANA: Dodajemy klasę 'open' jeśli menu jest otwarte */}
      <div className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="nav-left">
          {/* USUNIĘTO WSZYSTKIE <br /> - zawijanie będzie kontrolowane przez CSS */}
          <Link to="/" className={isActive('/')} onClick={closeMobileMenu}>Strona Główna</Link>
          <Link to="/szukam" className={isActive('/szukam')} onClick={closeMobileMenu}>Szukam Transportu</Link>
          <Link to="/oferuje" className={isActive('/oferuje')} onClick={closeMobileMenu}>Oferuję Transport</Link>
          <Link to="/tablica-ogloszen" className={isActive('/tablica-ogloszen')} onClick={closeMobileMenu}>Tablica Ogłoszeń</Link>
          <Link to="/transport-na-juz" className={`${isActive('/transport-na-juz')} transport-na-juz-link`} onClick={closeMobileMenu}>
            Transport na Już!
          </Link>
          {/* NOWA POZYCJA MENU: KATALOG PRZEWOŹNIKÓW */}
          <Link to="/katalog-przewoznikow" className={isActive('/katalog-przewoznikow')} onClick={closeMobileMenu}>Katalog Przewoźników</Link>
          {/* KONIEC NOWEJ POZYCJI MENU */}
          <Link to="/kontakt" className={isActive('/kontakt')} onClick={closeMobileMenu}>Kontakt</Link>

          {email && (
            <>
              <Link to="/moje-trasy" className={isActive('/moje-trasy')} onClick={closeMobileMenu}>Moje Trasy</Link>
              <Link to="/moje-ogloszenia" className={isActive('/moje-ogloszenia')} onClick={closeMobileMenu}>Moje Ogłoszenia</Link>

              {email === 'lawetaolsztyn@gmail.com' && (
                <Link to="/admin-dashboard" className={isActive('/admin-dashboard')} onClick={closeMobileMenu}>Admin</Link>
              )}
            </>
          )}
        </div>

        <div className="nav-right">
          {!email ? (
            <>
              <Link to="/login" className={isActive('/login')} onClick={closeMobileMenu}>Zaloguj</Link>
              <Link to="/register" className={isActive('/register')} onClick={closeMobileMenu}>Zarejestruj</Link>
            </>
          ) : (
            <>
              <span
                style={{
                  color: '#fff',
                  fontWeight: 'bold',
                  marginRight: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
                onClick={() => { navigate('/profil'); closeMobileMenu(); }} // Added closeMobileMenu
              >
                🔒 {role === 'klient' ? 'Klient' :
       role === 'firma' ? 'Firma' :
       'Użytkownik'} ({email})
              </span>
              <button
                onClick={() => { handleLogout(); closeMobileMenu(); }} // Added closeMobileMenu
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '8px 15px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  marginLeft: '10px'
                }}
              >
                Wyloguj
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}