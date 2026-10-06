import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

// 1. Añadimos isLightMode y toggleTheme a las props para que el botón las entienda
export default function Profile({ usuario, isLightMode, toggleTheme }) {
  const navigate = useNavigate();

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          {usuario?.email?.charAt(0).toUpperCase()}
        </div>
        <h2 className="profile-email">{usuario?.email}</h2>
        <span className="profile-badge">Piloto Oficial</span>
      </div>

      <div className="profile-actions">
        <button className="btn-menu-item">Configuración de cuenta</button>
        <button className="btn-menu-item">Soporte y Ayuda</button>
        
        {/* 2. Botón conectado correctamente a las props */}
        <button 
          onClick={toggleTheme} 
          style={{
            padding: '10px 20px',
            borderRadius: '20px',
            border: '1px solid var(--accent-color)',
            color: 'var(--text-main)',
            backgroundColor: 'var(--bg-surface)',
            cursor: 'pointer',
            width: '100%',
            fontWeight: '600'
          }}
        >
          {isLightMode ? '🌙 Cambiar a Modo Oscuro' : '☀️ Cambiar a Modo Claro'}
        </button>

        <button onClick={cerrarSesion} className="btn-logout-large">
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}