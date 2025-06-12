import { useState } from 'react';
import Navbar from './components/Navbar';
import Header from './components/Header'; // Zakładam, że Header też może być potrzebny, choć nie podałeś jego kodu
import AddRouteForm from './AddRouteForm';
import MyRoutes from './MyRoutes'; // MyRoutes jest już używane w MojeTrasy.jsx, więc tutaj nie jest potrzebne jeśli to oddzielne strony. Jeśli to jedna strona, to musisz zdecydować, gdzie je umieścić.

export default function OferujeTransport() {
  const [refreshRoutes, setRefreshRoutes] = useState(false);

  const handleRouteCreated = () => {
    setRefreshRoutes(prev => !prev);
  };

  return (
    <>
      <Navbar />
  
      <div className="oferuje-transport-container"> {/* Nowa klasa CSS */}
        <AddRouteForm onRouteCreated={handleRouteCreated} />
        {/* Jeśli chcesz również wyświetlać MyRoutes na tej stronie, dodaj je tutaj: */}
        {/* <MyRoutes /> */}
      </div>
    </>
  );
}
