import { useState } from 'react';
import Navbar from './components/Navbar';
import Header from './components/Header';
import AddRouteForm from './AddRouteForm';
import MyRoutes from './MyRoutes';

export default function OferujeTransport() {
  const [refreshRoutes, setRefreshRoutes] = useState(false);

  const handleRouteCreated = () => {
    setRefreshRoutes(prev => !prev);
  };

  return (
    <>
      <Navbar />
  
      <div style={{ textAlign: 'center', padding: '20px' }}>
        
        <AddRouteForm onRouteCreated={handleRouteCreated} />


      </div>
    </>
  );
}
