import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import MotoDetail from './pages/MotoDetail';
import MapaGasolina from './pages/MapaGasolina';
import ChatBot from './pages/ChatBot';
import Tiendas from './pages/Tiendas';
import Profile from './pages/Profile';
import LandingLobby from './pages/LandingLobby';
import PublicVehicleHistory from './pages/PublicVehicleHistory';

function AppContent({ session, isLightMode, toggleTheme }) {
  const location = useLocation();
  const esHistorialPublico = location.pathname.startsWith('/historial/');
  const mostrarNavbar = Boolean(session) && !esHistorialPublico;

  return (
    <div className="min-h-screen transition-colors duration-300">
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)]">
        <div className={mostrarNavbar ? 'pb-24' : undefined}>
          <Routes>
            <Route path="/historial/:id" element={<PublicVehicleHistory />} />
            {session ? (
              <>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard usuario={session.user} />} />
                <Route path="/moto/:id" element={<MotoDetail />} />
                <Route path="/mapa" element={<MapaGasolina />} />
                <Route path="/chat" element={<ChatBot usuario={session.user} />} />
                <Route path="/tiendas" element={<Tiendas />} />
                <Route
                  path="/perfil"
                  element={
                    <Profile
                      usuario={session.user}
                      isLightMode={isLightMode}
                      toggleTheme={toggleTheme}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </>
            ) : (
              <>
                <Route
                  path="/"
                  element={
                    <LandingLobby
                      session={session}
                      isLightMode={isLightMode}
                      toggleTheme={toggleTheme}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </div>
        {mostrarNavbar && <Navbar />}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('theme') === 'light');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', !isLightMode);
    root.classList.toggle('light-mode', isLightMode);
    document.body.classList.toggle('light-mode', isLightMode);
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  if (!authReady) {
    return <div className="min-h-screen bg-[var(--bg-base)]" />;
  }

  return (
    <Router>
      <AppContent
        session={session}
        isLightMode={isLightMode}
        toggleTheme={() => setIsLightMode((valor) => !valor)}
      />
    </Router>
  );
}
