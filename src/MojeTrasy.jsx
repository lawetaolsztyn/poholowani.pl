import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import MyRoutes from './MyRoutes';
import './MojeTrasy.css'; // Importujemy nowy plik CSS

export default function MojeTrasy() {
  const [routes, setRoutes] = useState([]);
  const [userId, setUserId] = useState(null);
  const [hoveredRouteId, setHoveredRouteId] = useState(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      setUserId(uid);

      if (!uid) return;

      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (!error) setRoutes(data);
    };

    fetchRoutes();
  }, []);

  return (
    <>
      <Navbar />
      <div className="my-routes-page-container"> {/* Usunięte style inline */}
        <div className="overlay-header">
          <h1>📍 Moje trasy</h1>
          <p>Lista tras dodanych przez Ciebie jako przewoźnik</p>
        </div>

        <div className="my-routes-section"> {/* Nowy div do ostylowania paddingu */}
          <center><h2 className="section-title">🗺️ Podgląd tras na mapie</h2></center> {/* Dodana klasa */}
          {userId && <MyRoutes hoveredRouteId={hoveredRouteId} />}
        </div>
      </div>
    </>
  );
}

// Ten obiekt cardStyle nie jest już używany, ponieważ style są przeniesione do CSS
// const cardStyle = {
//   background: '#fff',
//   border: '1px solid #ccc',
//   borderRadius: '10px',
//   padding: '15px',
//   marginBottom: '15px',
//   boxShadow: '0 0 10px rgba(0,0,0,0.05)',
//   transition: 'background 0.2s'
// };
