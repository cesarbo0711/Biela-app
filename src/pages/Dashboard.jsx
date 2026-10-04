import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Garage from './Garage';
import ChatBot from './ChatBot'; // <--- Importamos el componente de IA
import Profile from './Profile';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [pestanaActiva, setPestanaActiva] = useState('garage'); // 'garage' | 'ia' | 'perfil'
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function verificarSesion() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/'); // Si no hay sesión, regresa al Login
      } else {
        setUsuario(session.user);
      }
      setCargando(false);
    }
    verificarSesion();
  }, [navigate]);

  if (cargando) {
    return <div className="loading-screen">Cargando taller...</div>;
  }

  return (
    <div className="dashboard-layout">
      {/* CONTENIDO PRINCIPAL SEGÚN LA PESTAÑA ACTIVA */}
      <main className="dashboard-content">
        {pestanaActiva === 'garage' && <Garage usuario={usuario} />}
        {pestanaActiva === 'ia' && <ChatBot usuario={usuario} />}
        {pestanaActiva === 'profile' && <Profile usuario={usuario} />}
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR (SHELL & TABS) */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${pestanaActiva === 'garage' ? 'active' : ''}`} 
          onClick={() => setPestanaActiva('garage')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Garaje</span>
        </button>

        {/* BOTÓN CENTRAL DE IA (FASE 4) */}
        <button 
          className={`nav-item nav-ai-btn ${pestanaActiva === 'ia' ? 'active' : ''}`} 
          onClick={() => setPestanaActiva('ia')}
        >
          <div className="ai-glow-icon">🤖</div>
          <span>Mecánico IA</span>
        </button>

        <button 
          className={`nav-item ${pestanaActiva === 'profile' ? 'active' : ''}`} 
          onClick={() => setPestanaActiva('profile')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Perfil</span>
        </button>
      </nav>
    </div>
  );
}