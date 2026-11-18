import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';

import Navbar from './components/Navbar';
import Garage from './pages/Garage';
import MotoDetail from './pages/MotoDetail';
import MapaGasolina from './pages/MapaGasolina';
import ChatBot from './pages/ChatBot';
import Profile from './pages/Profile';
import Login from './pages/Login';

export default function App() {
  const [session, setSession] = useState(null);
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('theme') === 'light');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
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
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  return (
    <div className="min-h-screen transition-colors duration-300">
      <div className="min-h-screen bg-[#F8F5F0] dark:bg-[#111111] text-neutral-900 dark:text-white pb-20">
        <Router>
          {session ? (
            <>
              <Routes>
                <Route path="/" element={<Garage usuario={session.user} />} />
                <Route path="/moto/:id" element={<MotoDetail />} />
                <Route path="/mapa" element={<MapaGasolina />} />
                <Route path="/chat" element={<ChatBot />} />
                <Route path="/perfil" element={<Profile usuario={session.user} isLightMode={isLightMode} toggleTheme={() => setIsLightMode(!isLightMode)} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Navbar />
            </>
          ) : (
            <Routes>
              <Route path="*" element={<Login />} />
            </Routes>
          )}
        </Router>

      </div>
    </div>
  );
}