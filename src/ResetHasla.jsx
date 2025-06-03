import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import Header from './components/Header';


export default function ResetHasla() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      // Poczekaj chwilę na aktywację sesji po kliknięciu w link z e-maila
      await new Promise(resolve => setTimeout(resolve, 400));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const hash = window.location.hash;
      const isRecovery = hash.includes('type=recovery') || hash.includes('recovery_token');

      if (isRecovery) {
        localStorage.setItem('reset-password-required', 'true');
      }

     if (!session || !session.user || !isRecovery) {
  // Nie pokazuj komunikatu – po prostu pokaż formularz
  setChecking(false);
  return;
}

      // wszystko OK
      setChecking(false);
    };

    verify();
  }, [navigate]);

  const handleReset = async () => {
    if (password !== confirm) {
      setMessage('❌ Hasła nie są takie same.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(`❌ Błąd: ${error.message}`);
    else {
      localStorage.removeItem('reset-password-required');
      setMessage('✅ Hasło zostało zmienione. Trwa wylogowywanie...');
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login');
      }, 2500);
    }
  };

  if (checking) return null;

  return (
    <>
      <Navbar />
      <div className="landing-container">
        <div className="overlay-header">
          <h1>Ustaw nowe hasło</h1>
          <p>Wprowadź nowe hasło do swojego konta</p>
        </div>
        <div style={wrapper}>
          <input
            type="password"
            placeholder="Nowe hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Powtórz nowe hasło"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleReset} style={btnStyle}>Zmień hasło</button>
          {message && <p style={{ marginTop: '20px' }}>{message}</p>}
        </div>
      </div>
    </>
  );
}

const wrapper = {
  background: '#fff',
  padding: '40px',
  maxWidth: '500px',
  margin: '40px auto',
  borderRadius: '12px',
  boxShadow: '0 0 15px rgba(0,0,0,0.1)'
};

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginBottom: '15px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '1rem'
};

const btnStyle = {
  width: '100%',
  padding: '12px',
  backgroundColor: '#28a745',
  color: '#fff',
  fontSize: '1rem',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer'
};
