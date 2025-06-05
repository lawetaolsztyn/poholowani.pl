import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';

export default function ChooseRoleAfterOAuth() {
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true); // Ustawiamy true domyślnie, aby pokazać ładowanie na początku
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const ensureUserProfile = async () => {
      if (!user) {
        // Jeśli użytkownik nie jest zalogowany, wyjdź.
        // Ewentualnie możesz tutaj przekierować do logowania,
        // ale komponent Login.jsx już to obsługuje.
        setLoading(false); // Zakończ ładowanie, jeśli nie ma użytkownika
        return;
      }

      console.log('ChooseRoleAfterOAuth: Użytkownik dostępny:', user.id, user.email);

      const { data: existing, error } = await supabase
        .from('users_extended')
        .select('role') // Optymalizacja: pobieraj tylko rolę
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        console.warn('➡️ ChooseRoleAfterOAuth: Profil nie znaleziony przy pierwszym sprawdzeniu. Oczekuję, że trigger go stworzy.');
        // Pozostajemy na tej stronie, aby umożliwić wybór roli.
        setLoading(false); // Zakończ ładowanie, aby formularz się pojawił
      } else if (error) {
        console.error('❌ ChooseRoleAfterOAuth: Błąd pobierania profilu:', error.message);
        // Możesz tutaj wyświetlić komunikat błędu użytkownikowi lub wylogować go.
        setLoading(false); // Zakończ ładowanie nawet w przypadku błędu
      } else if (existing && existing.role?.toLowerCase() !== 'nieprzypisana') {
        // Jeśli profil istnieje I rola NIE JEST 'nieprzypisana' (czyli jest już ustawiona)
        console.log('✅ ChooseRoleAfterOAuth: Rola użytkownika już ustawiona na:', existing.role, '. Przekierowuję do profilu.');
        navigate('/profil'); // Przekieruj do profilu
        // Ważne: nie ustawiaj setLoading(false) tutaj, bo i tak nastąpi przekierowanie
        return; // Zakończ działanie funkcji, aby uniknąć dalszego renderowania
      } else {
        // Profil istnieje, ale rola to 'nieprzypisana', więc pozostajemy na tej stronie.
        setLoading(false); // Zakończ ładowanie, aby formularz się pojawił
      }
    };

    ensureUserProfile();
  }, [user, navigate]); // Dodaj 'navigate' do zależności useEffect

  const handleSubmit = async () => {
    if (!user) return;
    if (!role) {
      alert('Wybierz rolę przed przejściem dalej.');
      return;
    }

    // Upewnij się, że rola jest zawsze zapisywana małymi literami
    const mappedRole = role === 'client' ? 'klient' : 'firma';

    setLoading(true); // Rozpocznij ładowanie podczas zapisywania
    const { error } = await supabase
      .from('users_extended')
      .update({ role: mappedRole })
      .eq('id', user.id);

    if (error) {
      alert('Błąd przy zapisie roli.');
      setLoading(false); // Zakończ ładowanie w przypadku błędu zapisu
    } else {
      // Po pomyślnym zapisie roli, zaktualizuj localStorage i przekieruj
      localStorage.setItem('role', mappedRole);
      navigate('/profil');
    }
  };

  // Warunkowe renderowanie: jeśli loading jest true, pokazujemy komunikat "Ładowanie..."
  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2rem', color: '#555' }}>
        Ładowanie...
      </div>
    );
  }

  // Jeśli nie ma loading, renderujemy formularz wyboru roli
  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Wybierz swoje konto</h2>
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => setRole('client')}
          style={{
            padding: '10px 20px',
            marginRight: '20px',
            backgroundColor: role === 'client' ? '#007bff' : '#f0f0f0',
            color: role === 'client' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          KLIENT
        </button>
        <button
          onClick={() => setRole('company')}
          style={{
            padding: '10px 20px',
            backgroundColor: role === 'company' ? '#007bff' : '#f0f0f0',
            color: role === 'company' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          FIRMA
        </button>
      </div>
      <div style={{ marginTop: '30px' }}>
        <button
          onClick={handleSubmit}
          disabled={!role || loading}
          style={{
            padding: '10px 30px',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: role ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.6 : 1
          }}
        >
          Zatwierdź
        </button>
      </div>
    </div>
  );
}