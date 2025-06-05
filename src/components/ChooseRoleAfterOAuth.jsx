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
        setLoading(false);
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
        setLoading(false);
      } else if (error) {
        console.error('❌ ChooseRoleAfterOAuth: Błąd pobierania profilu:', error.message);
        setLoading(false);
      } else if (existing && existing.role?.toLowerCase() !== 'nieprzypisana') {
        console.log('✅ ChooseRoleAfterOAuth: Rola użytkownika już ustawiona na:', existing.role, '. Przekierowuję do profilu.');
        navigate('/profil');
        return;
      } else {
        setLoading(false);
      }
    };

    ensureUserProfile();
  }, [user, navigate]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!role) {
      alert('Wybierz rolę przed przejściem dalej.');
      return;
    }

    // Zmieniono: usunięto 'client' i 'company' na rzecz 'klient' i 'firma'
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
      localStorage.setItem('role', mappedRole);
      navigate('/profil');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2rem', color: '#555' }}>
        Ładowanie...
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Wybierz swoje konto</h2>
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => setRole('klient')} // Zmieniono na 'klient'
          style={{
            padding: '10px 20px',
            marginRight: '20px',
            backgroundColor: role === 'klient' ? '#007bff' : '#f0f0f0',
            color: role === 'klient' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          KLIENT
        </button>
        <button
          onClick={() => setRole('firma')} // Zmieniono na 'firma'
          style={{
            padding: '10px 20px',
            backgroundColor: role === 'firma' ? '#007bff' : '#f0f0f0',
            color: role === 'firma' ? '#fff' : '#000',
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