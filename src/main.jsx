import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';

import './index.css';
import './App.css';
import 'leaflet/dist/leaflet.css';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar'; // Nie używany bezpośrednio tutaj, ale to ok

import LandingPage from './LandingPage';
import Login from './Login';
import SearchRoutes from './SearchRoutes';
import OferujeTransport from './OferujeTransport';
import Register from './Register';
import MojeTrasy from './MojeTrasy';
import ResetHasla from './ResetHasla';
import UserProfileDashboard from './UserProfileDashboard';
import PomocDrogowaProfil from './PomocDrogowaProfil';
import Regulamin from './Regulamin';
import PolitykaPrywatnosci from './PolitykaPrywatnosci';
import FAQ from './FAQ';
import AdminDashboard from './AdminDashboard';
import Kontakt from './components/Kontakt';
import PublicProfile from './components/PublicProfile';
import EdycjaProfilu from './components/EdycjaProfilu';
import ChooseRoleAfterOAuth from './components/ChooseRoleAfterOAuth';
import Footer from './components/Footer';
import { Routes, Route } from 'react-router-dom';
import CookieWall from './components/CookieWall';
import MessengerHelp from './MessengerHelp';
import TransportNaJuz from './TransportNaJuz';
import CarriersCatalog from './CarriersCatalog';
import AnnouncementsPage from './components/AnnouncementsPage';
import MojeOgloszenia from './components/MojeOgloszenia';
import MyChats from './components/MyChats';
import { AuthProvider } from './AuthContext.jsx';
// Import Font Awesome jest podwójnie, jedno wystarczy, ale to nie krytyczny błąd
// import '@fortawesome/fontawesome-free/css/all.min.css';
import UnreadMessagesListener from './components/UnreadMessagesListener'; // Import Listenera

function App() {
  return (
    <div className="app">
      <CookieWall />
      {/* 🚀 Przenieś listener tu, działa równolegle z Navbar */}
      <UnreadMessagesListener />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/szukam" element={<SearchRoutes />} />
          <Route path="/oferuje" element={<OferujeTransport />} />
          <Route path="/register" element={<Register />} />
          <Route path="/moje-trasy" element={<MojeTrasy />} />
          <Route path="/reset-hasla" element={<ResetHasla />} />
          <Route path="/profil" element={<UserProfileDashboard />} />
          <Route path="/pomoc-drogowa/:slug" element={<PomocDrogowaProfil />} />
          <Route path="/regulamin" element={<Regulamin />} />
          <Route path="/polityka-prywatnosci" element={<PolitykaPrywatnosci />} />
          <Route path="/rodo" element={<PolitykaPrywatnosci />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/kontakt" element={<Kontakt />} />
          <Route path="/profil/:id" element={<PublicProfile />} />
          <Route path="/panel/profil" element={<EdycjaProfilu />} />
          <Route path="/choose-role" element={<ChooseRoleAfterOAuth />} />
          <Route path="/pomoc/messenger-link" element={<MessengerHelp />} />
          {/* Dwie trasy dla TransportNaJuz: jedna bazowa, druga ze szczegółami */}
          <Route path="/transport-na-juz" element={<TransportNaJuz />} />
          <Route path="/transport-na-juz/:requestId" element={<TransportNaJuz />} />
          <Route path="/katalog-przewoznikow" element={<CarriersCatalog />} />
          <Route path="/tablica-ogloszen" element={<AnnouncementsPage />} />
          <Route path="/moje-ogloszenia" element={<MojeOgloszenia />} />
          <Route path="/moje-chaty" element={<MyChats />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/announcements/:announcementId" element={<AnnouncementsPage />} />
       </Routes>
        <Footer />
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </SessionContextProvider>
  </React.StrictMode>
);