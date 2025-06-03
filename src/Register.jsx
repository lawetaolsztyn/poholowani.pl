// src/Register.jsx

import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import './LandingPage.css';
import Header from './components/Header';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('klient'); // Domyślna rola to 'klient'
  const [message, setMessage] = useState('');
  const [emailStatusMessage, setEmailStatusMessage] = useState('');
  const [fullName, setFullName] = useState(''); // Nowy stan dla pełnej nazwy
  const [companyName, setCompanyName] = useState(''); // Nowy stan dla nazwy firmy
  const [nip, setNip] = useState(''); // Nowy stan dla NIP
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    console.log('✅ START: Kliknięto Zarejestruj');
    e.preventDefault();
    setMessage('');
    setEmailStatusMessage('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      console.warn('❌ Niepoprawny e-mail:', trimmedEmail);
      setMessage('❌ Niepoprawny format adresu e-mail.');
      return;
    }

    if (trimmedPassword.length < 6) {
      console.warn('❌ Za krótkie hasło:', trimmedPassword);
      setMessage('❌ Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    if (role === 'klient' && !fullName.trim()) {
      setMessage('❌ Proszę podać imię i nazwisko.');
      return;
    }

    if (role === 'firma' && (!companyName.trim() || !nip.trim())) {
      setMessage('❌ Proszę podać nazwę firmy i NIP.');
      return;
    }

    try {
      // Krok 1: Rejestracja użytkownika w Supabase Auth
      // WAŻNE: Supabase signUp domyślnie NIE loguje użytkownika automatycznie,
      // co wymaga potwierdzenia e-maila.
    const { data, error: signUpError } = await supabase.auth.signUp({
  email: trimmedEmail,
  password: trimmedPassword,
  options: {
    data: {
      account_type: role === 'firma' ? 'company' : 'private',
      full_name: fullName || companyName, // wybierz to, co wpisano
      role: role // 'klient' lub 'firma'
    }
  }
});


      if (signUpError) {
console.error("❌ Pełny błąd Supabase:", signUpError);
        console.error("❌ Błąd rejestracji Supabase Auth:", signUpError.message);
        const errorMap = {
          'User already registered': '❌ Ten adres e-mail jest już zarejestrowany.',
          // Dodaj inne błędy, jeśli znasz ich komunikaty z Supabase
        };
        setMessage(errorMap[signUpError.message] || `❌ Błąd rejestracji: ${signUpError.message}`);
        return;
      }

      // Krok 2: Użytkownik został zarejestrowany w auth.users.
      // Teraz informujemy go o konieczności aktywacji e-maila.
      // Dalsze dane do users_extended dodamy po aktywacji konta.
      if (data.user) {
        console.log("✅ Użytkownik Supabase Auth zarejestrowany:", data.user);
        setMessage('✅ Rejestracja zakończona sukcesem! Sprawdź swoją skrzynkę e-mail, aby aktywować konto.');
        setEmailStatusMessage('Wysłano link aktywacyjny na Twój adres e-mail. Sprawdź folder SPAM, jeśli go nie widzisz.');
        // Opcjonalnie: możesz zapisać w localStorage rolę i e-mail, aby odtworzyć je po aktywacji
        localStorage.setItem('pending_registration_email', trimmedEmail);
        localStorage.setItem('pending_registration_role', role);
        localStorage.setItem('pending_registration_full_name', fullName);
        localStorage.setItem('pending_registration_company_name', companyName);
        localStorage.setItem('pending_registration_nip', nip);

      } else {
        setMessage('❌ Rejestracja nieudana. Spróbuj ponownie.');
      }
    } catch (e) {
      console.error("❌ Ogólny błąd podczas rejestracji:", e.message);
      setMessage("❌ Wystąpił nieoczekiwany błąd podczas rejestracji. Spróbuj ponownie lub skontaktuj się z administracją.");
    }
  };


  // Reszta kodu komponentu Register pozostaje bez zmian
  // ... (renderowanie formularza)
  return (
    <>
      <Navbar />
<Header
  title="Utwórz konto"
  subtitle="Zarejestruj się jako osoba prywatna lub firma – szybko i wygodnie"
/>
      <div style={wrapper}>
        <div style={innerWrapper}>
          <h2>Rejestracja</h2>
          <form onSubmit={handleRegister}>
            <div style={radioGroupStyle}>
              <label>
                <input
                  type="radio"
                  value="klient"
                  checked={role === 'klient'}
                  onChange={() => setRole('klient')}
                />
                Osoba Prywatna
              </label>
              <label style={{ marginLeft: '20px' }}>
                <input
                  type="radio"
                  value="firma"
                  checked={role === 'firma'}
                  onChange={() => setRole('firma')}
                  // Usuń console.log(e.target.value) - tylko do debugowania
                />
                Firma
              </label>
            </div>

            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
            <input
              type="password"
              placeholder="Hasło (min. 6 znaków)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />

            {role === 'klient' && (
              <input
                type="text"
                placeholder="Imię i Nazwisko"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={inputStyle}
                required
              />
            )}

            {role === 'firma' && (
              <>
                <input
                  type="text"
                  placeholder="Nazwa Firmy"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={inputStyle}
                  required
                />
                <input
                  type="text"
                  placeholder="NIP"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  style={inputStyle}
                  required
                />
              </>
            )}

            <button type="submit" style={btnStyle}>Zarejestruj</button>
          </form>

          {message && <p style={messageStyle}>{message}</p>}
          {emailStatusMessage && <p style={{ ...messageStyle, color: 'orange' }}>{emailStatusMessage}</p>}
        </div>
      </div>
    </>
  );
}

// Style inline (nie zmienione, pozostawione jak w oryginale)
const wrapper = {
  background: '#fff',
  padding: '40px',
  maxWidth: '500px',
  margin: '20px auto',
  borderRadius: '12px',
  boxShadow: '0 0 15px rgba(0,0,0,0.1)',
};

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginBottom: '15px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '1rem',
};

const btnStyle = {
  width: '100%',
  padding: '12px',
  backgroundColor: '#007bff',
  color: '#fff',
  fontSize: '1rem',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
};

const messageStyle = {
  marginTop: '20px',
  color: 'red',
  fontWeight: 'bold',
};

const radioGroupStyle = {
  marginBottom: '20px',
};

const innerWrapper = {
  padding: '20px',
};