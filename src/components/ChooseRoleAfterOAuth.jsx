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
      if (!user) return;

      const { data: existing, error } = await supabase
        .from('users_extended')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        console.warn('➡️ Tworzę nowy rekord w users_extended dla:', user.email);
        const { error: insertError } = await supabase
          .from('users_extended')
          .insert([{
            id: user.id,
            email: user.email,
            role: null,
            full_name: user.user_metadata?.full_name || '',
            company_name: '',
            nip: ''
          }]);

        if (insertError) {
          console.error('❌ Błąd tworzenia profilu:', insertError.message);
        }
      }
    };

    ensureUserProfile();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!role) {
      alert('Wybierz rolę przed przejściem dalej.');
      return;
    }

    const mappedRole = role === 'client' ? 'KLIENT' : 'FIRMA';

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
