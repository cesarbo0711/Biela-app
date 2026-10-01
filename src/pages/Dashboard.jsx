import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import Garage from '../pages/Garage';
import Profile from '../pages/Profile';
import './Dashboard.css';

export default function Dashboard() {
  const [usuario, setUsuario] = useState(null);
  const [activeTab, setActiveTab] = useState('garage'); // Controla la vista
  const navigate = useNavigate();

  useEffect(() => {
    const obtenerDatos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUsuario(user);
      else navigate('/');
    };
    obtenerDatos();
  }, [navigate]);

  if (!usuario) return null;

  return (
    <div className="dashboard-shell">
      {/* Contenedor Principal Dinámico */}
      <main className="dashboard-viewport">
        {activeTab === 'garage' && <Garage usuario={usuario} />}
        {activeTab === 'bot' && (
          <div className="bot-placeholder">
            <span className="bot-icon">🤖</span>
            <h3>Chatbot Biela</h3>
            <p>Fase 4: En construcción...</p>
          </div>
        )}
        {activeTab === 'profile' && <Profile usuario={usuario} />}
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR (Estilo iOS) */}
      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 'garage' ? 'active' : ''}`} onClick={() => setActiveTab('garage')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          <span>Garaje</span>
        </button>

        <button className="nav-fab" onClick={() => setActiveTab('bot')}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a2 2 0 0 1 2 2c0 1.1-.9 2-2 2a2 2 0 0 1-2-2c0-1.1.9-2 2-2z"/><path d="M4 10h16v10H4z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>
        </button>

        <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Perfil</span>
        </button>
      </nav>
    </div>
  );
}