// src/Register.jsx

import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import './LandingPage.css'; // Ten import pozostaje, ponieważ używasz .overlay-header
import './Register.css'; // <-- NOWY IMPORT DLA STYLÓW REJESTRACJI
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: {
            full_name: fullName || companyName,
            role: role
          }
        }
      });

      if (signUpError) {
        console.error("❌ Pełny błąd Supabase:", signUpError);
        console.error("❌ Błąd rejestracji Supabase Auth:", signUpError.message);
        const errorMap = {
          'User already registered': '❌ Ten adres e-mail jest już zarejestrowany.',
        };
        setMessage(errorMap[signUpError.message] || `❌ Błąd rejestracji: ${signUpError.message}`);
        return;
      }

      if (data.user) {
        console.log("✅ Użytkownik Supabase Auth zarejestrowany:", data.user);
        setMessage('✅ Rejestracja zakończona sukcesem! Sprawdź swoją skrzynkę e-mail, aby aktywować konto.');
        setEmailStatusMessage('Wysłano link aktywacyjny na Twój adres e-mail. Sprawdź folder SPAM, jeśli go nie widzisz.');
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

  return (
    <>
      <Navbar />
      <div className="overlay-header">
        <Header
          title="Utwórz konto"
          subtitle="Zarejestruj się jako osoba prywatna lub firma – szybko i wygodnie"
        />
      </div>
      {/* Użycie nowej klasy register-page-container */}
      <div className="register-page-container">
        {/* Użycie nowej klasy register-inner-wrapper */}
        <div className="register-inner-wrapper">
          {/* Użycie nowej klasy register-heading */}
          <h2 className="register-heading">Rejestracja</h2>
          {/* Użycie nowej klasy register-form */}
          <form onSubmit={handleRegister} className="register-form">
            {/* Użycie nowej klasy radio-group */}
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="klient"
                  checked={role === 'klient'}
                  onChange={() => setRole('klient')}
                />
                Osoba Prywatna
              </label>
              <label className="radio-label"> {/* Opcjonalnie: dodana klasa dla lepszej kontroli odstępu */}
                <input
                  type="radio"
                  value="firma"
                  checked={role === 'firma'}
                  onChange={() => setRole('firma')}
                />
                Firma
              </label>
            </div>

            {/* Użycie nowej klasy register-input dla wszystkich inputów */}
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="register-input"
              required
            />
            <input
              type="password"
              placeholder="Hasło (min. 6 znaków)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="register-input"
              required
            />

            {role === 'klient' && (
              <input
                type="text"
                placeholder="Imię i Nazwisko"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="register-input"
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
                  className="register-input"
                  required
                />
                <input
                  type="text"
                  placeholder="NIP"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="register-input"
                  required
                />
              </>
            )}

            {/* Użycie nowej klasy register-button */}
            <button type="submit" className="register-button">Zarejestruj</button>
          </form>

          {/* Użycie nowych klas dla komunikatów */}
          {message && <p className="register-message">{message}</p>}
          {emailStatusMessage && <p className="register-status-message">{emailStatusMessage}</p>}
        </div>
      </div>
    </>
  );
}

// <-- Usunięto tutaj wszystkie stałe ze stylami inline'owymi -->