import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';

export default function ChooseRoleAfterOAuth() {
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const ensureUserProfile = async () => {
      if (!user) return; // Jeśli użytkownik nie jest zalogowany, wyjdź

      const { data: existing, error } = await supabase
        .from('users_extended')
        .select('role') // Optymalizacja: pobieraj tylko rolę
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Ten blok powinien być wykonywany TYLKO jeśli profil NIE ISTNIEJE
        // i jest to pierwsze zalogowanie OAuth, a trigger nie zadziałał.
        // Jeśli trigger działa, ten blok może być zbędny, a nawet usunięty.
        // W przeciwnym razie, może generować błąd "duplicate key" jeśli już istnieje.
        // Zakładamy, że trigger działa i tworzy "nieprzypisana".
        console.warn('➡️ ChooseRoleAfterOAuth: Profil nie znaleziony przy pierwszym sprawdzeniu. Oczekuję, że trigger go stworzy.');
        // Usuń stąd kod insertu, jeśli jest, ponieważ to robi trigger.
      } else if (error) {
        // Obsługa innych błędów pobierania profilu
        console.error('❌ ChooseRoleAfterOAuth: Błąd pobierania profilu:', error.message);
        // Możesz tutaj wyświetlić komunikat błędu użytkownikowi lub wylogować go.
      } else if (existing && existing.role?.toLowerCase() !== 'nieprzypisana') {
        // Jeśli profil istnieje I rola NIE JEST 'nieprzypisana' (czyli jest już ustawiona)
        console.log('✅ ChooseRoleAfterOAuth: Rola użytkownika już ustawiona na:', existing.role, '. Przekierowuję do profilu.');
        navigate('/profil'); // Przekieruj do profilu
        return; // Zakończ działanie funkcji, aby uniknąć dalszego renderowania formularza
      }
      // Jeśli profil istnieje, ale rola to 'nieprzypisana', pozostajemy na tej stronie, aby użytkownik mógł wybrać rolę.
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

    setLoading(true);
    const { error } = await supabase
      .from('users_extended')
      .update({ role: mappedRole })
      .eq('id', user.id);

    if (error) {
      alert('Błąd przy zapisie roli.');
      setLoading(false);
    } else {
      // Po pomyślnym zapisie roli, zaktualizuj localStorage i przekieruj
      localStorage.setItem('role', mappedRole);
      navigate('/profil');
    }
  };

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