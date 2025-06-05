import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';
import Navbar from './Navbar';
import Header from './Header';

export default function ChooseRoleAfterOAuth() {
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const ensureUserProfile = async () => {
      if (!user) return;

      let profileCreated = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        const { data: existing, error } = await supabase
          .from('users_extended')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (existing) {
          if (existing.role !== 'nieprzypisana') {
            console.log('✅ ChooseRoleAfterOAuth: Rola użytkownika już ustawiona na:', existing.role, '. Przekierowuję do profilu.');
            navigate('/profil');
            return;
          }
          return;
        }

        if (error?.code === 'PGRST116' || !existing) {
          console.warn(`⏳ Czekam na utworzenie profilu przez trigger (próba ${attempt + 1}/10)`);

          if (attempt === 4 && !profileCreated) {
            console.warn('⚠️ Trigger nie utworzył profilu – tworzymy ręcznie.');
            const { error: insertError } = await supabase
              .from('users_extended')
              .insert([{ id: user.id, email: user.email, role: 'nieprzypisana' }]);

            if (insertError) {
              console.error('❌ Błąd ręcznego tworzenia profilu:', insertError.message);
            } else {
              profileCreated = true;
            }
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.error('❌ ChooseRoleAfterOAuth: Profil nadal nie istnieje.');
    };

    ensureUserProfile();
  }, [user, navigate]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!role) {
      alert('Wybierz rolę przed przejściem dalej.');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('users_extended')
      .update({ role })
      .eq('id', user.id);

    if (error) {
      alert('Błąd przy zapisie roli.');
      setLoading(false);
    } else {
      localStorage.setItem('role', role);
      navigate('/profil');
    }
  };

  return (
    <>
      <Navbar />
      <Header title="Dokończ rejestrację" subtitle="Wybierz typ swojego konta" />
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>Wybierz swoje konto</h2>
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => setRole('klient')}
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
            OSOBA PRYWATNA
          </button>
          <button
            onClick={() => setRole('firma')}
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
    </>
  );
}
