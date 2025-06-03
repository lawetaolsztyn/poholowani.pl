import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Navigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [userEmail, setUserEmail] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        if (user.email === 'lawetaolsztyn@gmail.com') {
          fetchData();
        }
      } else {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: routeData } = await supabase.from('routes').select('*').order('departure_date', { ascending: false });
    const { data: userData } = await supabase.from('users_extended').select('*');
    setRoutes(routeData || []);
    setUsers(userData || []);
    setLoading(false);
  }

  async function deleteRoute(id) {
    await supabase.from('routes').delete().eq('id', id);
    fetchData();
  }

  if (!loading && userEmail !== 'lawetaolsztyn@gmail.com') {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <div className="p-4">Ładowanie...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Panel Administratora</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">Wszystkie trasy</h2>
        {routes.map(route => (
          <div key={route.id} className="mb-2 border rounded-lg p-4 shadow-sm bg-white">
<p><strong>Od:</strong> {route.origin_city} | <strong>Do:</strong> {route.destination_city}</p>
            <p><strong>Data:</strong> {route.departure_date}</p>
            <p><strong>Tel:</strong> {route.phone}</p>
            <button
              onClick={() => deleteRoute(route.id)}
              className="mt-2 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
            >Usuń</button>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-8 mb-2">Użytkownicy</h2>
        {users.map(user => (
          <div key={user.id} className="mb-2 border rounded-lg p-4 shadow-sm bg-white">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>NIP:</strong> {user.nip || 'Brak'}</p>
            <p><strong>Typ:</strong> {user.is_pomoc_drogowa ? 'Pomoc Drogowa' : (user.nip ? 'Firma' : 'Prywatny')}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
