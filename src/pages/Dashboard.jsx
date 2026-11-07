import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Garage from './Garage';
import ChatBot from './ChatBot'; 
import Profile from './Profile';
import './Dashboard.css';

// 1. Recibimos isLightMode y toggleTheme directo en la función principal
export default function Dashboard({ isLightMode, toggleTheme }) {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [pestanaActiva, setPestanaActiva] = useState('garage');
  const [cargando, setCargando] = useState(true);
  
  useEffect(() => {
    async function verificarSesion() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/'); 
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

  // ELIMINADA la declaración duplicada de "const Dashboard" que rompía la app

  return (
    <div className="dashboard-layout">
      <main className="dashboard-content">
        {pestanaActiva === 'garage' && <Garage usuario={usuario} />}
        {pestanaActiva === 'ia' && <ChatBot usuario={usuario} />}
        
        {/* 2. Le pasamos las herramientas al Profile */}
        {pestanaActiva === 'profile' && (
          <Profile 
            usuario={usuario} 
            isLightMode={isLightMode} 
            toggleTheme={toggleTheme} 
          />
        )}
      </main>

      
    </div>
  );
}