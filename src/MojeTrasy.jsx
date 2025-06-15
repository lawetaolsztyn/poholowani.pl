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
      {/* <--- TUTAJ DODAJ BRAKUJĄCY DIV KONTENERA */}
      <div className="my-routes-page-container">
        <div className="my-routes-section">
          <center><h2 className="section-title">🗺️ Podgląd tras na mapie</h2></center>
          {userId && <MyRoutes hoveredRouteId={hoveredRouteId} />}
        </div>
      </div> {/* <--- TEN ZAMYKAJĄCY DIV BYŁ JUŻ, TYLKO TERAZ MA OTWIERAJĄCY*/}
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
