import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Navbar.css';
import { supabase } from '../supabaseClient';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState(null);

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

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className={isActive('/')}>Strona Główna</Link>
        <Link to="/szukam" className={isActive('/szukam')}>Szukam Transportu</Link>
        <Link to="/oferuje" className={isActive('/oferuje')}>Oferuję Transport</Link>
        <Link to="/kontakt" className={isActive('/kontakt')}>Kontakt</Link>

        {email && (
          <>
            <Link to="/moje-trasy" className={isActive('/moje-trasy')}>Moje trasy</Link>
            {email === 'lawetaolsztyn@gmail.com' && (
              <Link to="/admin-dashboard" className={isActive('/admin-dashboard')}>Admin</Link>
            )}
          </>
        )}
      </div>

      <div className="nav-right">
        {!email ? (
          <>
            <Link to="/login" className={isActive('/login')}>Zaloguj</Link>
            <Link to="/register" className={isActive('/register')}>Zarejestruj</Link>
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
              onClick={() => navigate('/profil')}
            >
              🔒 {role?.toUpperCase() === 'KLIENT' ? 'Klient' :
                   role?.toUpperCase() === 'FIRMA' ? 'Firma' :
                   'Użytkownik'} ({email})
            </span>
            <button
              onClick={handleLogout}
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

     
    </nav>
  );
}
