import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import './Profile.css';

export default function Profile({ usuario, isLightMode, toggleTheme }) {
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  const [perfil, setPerfil] = useState({
    nombre: 'César Borrego', 
    telefono: '',
    residencia: 'San Juan de los Morros, Venezuela',
    avatar_seed: '' // <--- Nuevo campo para guardar el avatar elegido
  });

  useEffect(() => {
    async function cargarPerfil() {
      if (!usuario) return;
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', usuario.id)
        .maybeSingle();

      if (data) {
        setPerfil({
          nombre: data.nombre || 'César Borrego',
          telefono: data.telefono || '',
          residencia: data.residencia || 'San Juan de los Morros, Venezuela',
          avatar_seed: data.avatar_seed || ''
        });
      }
    }
    cargarPerfil();
  }, [usuario]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setPerfil(prev => ({ ...prev, [name]: value }));
  };

  // --- NUEVA FUNCIÓN: Cambiar el Avatar ---
  const refrescarAvatar = () => {
    // Generamos un código aleatorio (ej: "x7b9q2")
    const semillaAleatoria = Math.random().toString(36).substring(2, 10);
    setPerfil(prev => ({ ...prev, avatar_seed: semillaAleatoria }));
  };

  const guardarPerfil = async (e) => {
    e.preventDefault();
    setGuardando(true);
    
    const { error } = await supabase
      .from('perfiles')
      .upsert({
        id: usuario.id,
        nombre: perfil.nombre,
        telefono: perfil.telefono,
        residencia: perfil.residencia,
        avatar_seed: perfil.avatar_seed, // Guardamos la foto elegida
        updated_at: new Date()
      });

    if (error) {
      console.error("Error guardando perfil:", error);
      alert("Hubo un error al guardar los cambios.");
    } else {
      setIsModalOpen(false);
    }
    setGuardando(false);
  };

  // El avatar ahora usa la semilla aleatoria, y si no hay, usa el nombre
  const semillaBase = perfil.avatar_seed || perfil.nombre || 'piloto';
  const semillaAvatar = encodeURIComponent(semillaBase);
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${semillaAvatar}&backgroundColor=e5e5e5`;

  return (
    <div className="profile-container fade-in">
      
      {/* CABECERA PRINCIPAL */}
      <div className="profile-header">
        <div className="avatar-wrapper-main">
          <img src={avatarUrl} alt="Avatar" className="profile-avatar-img" />
        </div>
        <h2 className="profile-email">{perfil.nombre || usuario?.email}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-5px', marginBottom: '10px' }}>
          {perfil.residencia}
        </p>
        <span className="profile-badge">Piloto Oficial</span>
      </div>

      {/* BOTONES */}
      <div className="profile-actions">
        <button className="btn-menu-item" onClick={() => setIsModalOpen(true)}>
          ⚙️ Configuración de cuenta
        </button>
        <button className="btn-menu-item">🎧 Soporte y Ayuda</button>
        
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

      {/* MODAL DE EDICIÓN */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>✕</button>
            <h3>Editar Perfil</h3>
            
            <form onSubmit={guardarPerfil} className="profile-form">
              
              {/* --- NUEVA SECCIÓN DE AVATAR EN EL MODAL --- */}
              <div className="avatar-edit-container">
                <img src={avatarUrl} alt="Preview Avatar" className="avatar-preview-small" />
                <button type="button" onClick={refrescarAvatar} className="btn-refresh-avatar">
                  🎲 Cambiar Avatar
                </button>
              </div>

              <div className="form-group">
                <label>Nombre Completo</label>
                <input 
                  type="text" 
                  name="nombre"
                  value={perfil.nombre} 
                  onChange={manejarCambio}
                  placeholder="Ej: Carlos Pérez"
                />
              </div>

              <div className="form-group">
                <label>Lugar de Residencia</label>
                <input 
                  type="text" 
                  name="residencia"
                  value={perfil.residencia} 
                  onChange={manejarCambio}
                  placeholder="Ej: Caracas"
                />
              </div>

              <div className="form-group">
                <label>Número de Teléfono</label>
                <input 
                  type="tel" 
                  name="telefono"
                  value={perfil.telefono} 
                  onChange={manejarCambio}
                  placeholder="Ej: 0414-1234567"
                />
              </div>

              <button type="submit" className="btn-save-profile" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}