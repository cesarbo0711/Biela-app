// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const [usuario, setUsuario] = useState(null);
  const [motos, setMotos] = useState([]); 
  const navigate = useNavigate();

  // Estados Modal Registro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [year, setYear] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [tipoAceite, setTipoAceite] = useState('');
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Estados Modal Eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [motoAEliminar, setMotoAEliminar] = useState(null);
  const [borrando, setBorrando] = useState(false);

  useEffect(() => {
    const obtenerDatos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsuario(user);
        cargarMotos(user.id);
      } else {
        navigate('/');
      }
    };
    obtenerDatos();
  }, [navigate]);

  const cargarMotos = async (userId) => {
    const { data, error } = await supabase
      .from('motos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setMotos(data);
    if (error) console.error("Error al cargar motos:", error);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const registrarMoto = async (e) => {
    e.preventDefault();
    setGuardando(true);
    let urlImagen = null;

    if (imagenArchivo) {
      const fileExt = imagenArchivo.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${usuario.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehiculos')
        .upload(filePath, imagenArchivo);

      if (uploadError) {
        alert('Error al subir la imagen: ' + uploadError.message);
        setGuardando(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('vehiculos')
        .getPublicUrl(filePath);
        
      urlImagen = publicUrl;
    }

    const { error } = await supabase
      .from('motos')
      .insert([
        {
          user_id: usuario.id,
          marca: marca,
          modelo: modelo,
          year: year,
          kilometraje: parseInt(kilometraje) || 0,
          tipo_aceite: tipoAceite,
          imagen_url: urlImagen 
        }
      ]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      setMarca('');
      setModelo('');
      setYear('');
      setKilometraje('');
      setTipoAceite('');
      setImagenArchivo(null);
      setIsModalOpen(false);
      cargarMotos(usuario.id); 
    }
    setGuardando(false);
  };

  const confirmarEliminacion = async () => {
    if (!motoAEliminar) return;
    setBorrando(true);

    const { error } = await supabase
      .from('motos')
      .delete()
      .eq('id', motoAEliminar);

    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      setIsDeleteModalOpen(false);
      setMotoAEliminar(null);
      cargarMotos(usuario.id);
    }
    setBorrando(false);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Mi Garaje</h1>
          <p className="dashboard-user">Piloto: {usuario?.email}</p>
        </div>
        <button onClick={cerrarSesion} className="btn-logout">Salir</button>
      </header>

      <main className="dashboard-content">
        <div className="list-header">
          <h2 className="section-title">Tus Vehículos</h2>
          <button className="btn-icon-add" onClick={() => setIsModalOpen(true)}>+ Añadir</button>
        </div>

        {motos.length === 0 ? (
          <div className="empty-state">
            <p>Aún no tienes vehículos en tu garaje.</p>
            <button className="btn-add-moto" onClick={() => setIsModalOpen(true)}>+ Registrar Moto</button>
          </div>
        ) : (
          <div className="motos-list">
            {motos.map((moto) => (
              <div key={moto.id} className="pro-moto-card">
                
                {/* Botón Borrar Absoluto en la esquina */}
                <div className="pro-card-actions">
                  <button 
                    className="pro-btn-delete"
                    onClick={() => {
                      setMotoAEliminar(moto.id);
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    Borrar
                  </button>
                </div>

                {/* Imagen Flotante Protagonista */}
                <div className="pro-image-wrapper">
                  <div className="pro-glow"></div> {/* El destello verde neón de fondo */}
                  {moto.imagen_url ? (
                    <img src={moto.imagen_url} alt={`${moto.marca} ${moto.modelo}`} className="pro-moto-img" />
                  ) : (
                    <div className="pro-no-img">Sin imagen</div>
                  )}
                </div>

                {/* Panel de Datos Superpuesto (Glassmorphism) */}
                <div className="pro-data-overlay">
                  <div className="pro-data-header">
                    <h3 className="pro-title">{moto.marca} - {moto.modelo}</h3>
                    <span className="pro-year">{moto.year || 'Año N/A'}</span>
                  </div>
                  
                  <div className="pro-data-grid">
                    <div className="pro-stat">
                      <span className="pro-stat-label">KILOMETRAJE</span>
                      <span className="pro-stat-value">
                        {moto.kilometraje.toLocaleString('en-US')} <small>KM</small>
                      </span>
                    </div>
                    <div className="pro-stat">
                      <span className="pro-stat-label">TIPO DE ACEITE</span>
                      <span className="pro-stat-value text-medium">
                        {moto.tipo_aceite || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Registro (Se mantiene igual de funcional) */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Añadir al garaje</h2>
              <p className="modal-subtitle">Ingresa los datos de tu vehículo.</p>
            </div>
            <form onSubmit={registrarMoto} className="modal-form">
              <div className="input-group">
                <label>Foto de la moto (PNG sin fondo)</label>
                <input type="file" accept="image/png, image/jpeg" onChange={(e) => setImagenArchivo(e.target.files[0])} className="input-file" />
              </div>
              <div className="input-group">
                <label>Marca</label>
                <input type="text" placeholder="ej. Bera" value={marca} onChange={(e) => setMarca(e.target.value)} required className="input-field" />
              </div>
              <div className="row-inputs">
                <div className="input-group">
                  <label>Modelo</label>
                  <input type="text" placeholder="ej. BWS" value={modelo} onChange={(e) => setModelo(e.target.value)} required className="input-field" />
                </div>
                <div className="input-group">
                  <label>Año</label>
                  <input type="text" placeholder="ej. 2013" value={year} onChange={(e) => setYear(e.target.value)} required className="input-field" />
                </div>
              </div>
              <div className="row-inputs">
                <div className="input-group">
                  <label>Kilometraje</label>
                  <input type="number" placeholder="ej. 15000" value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} required className="input-field" />
                </div>
                <div className="input-group">
                  <label>Aceite</label>
                  <input type="text" placeholder="ej. 20W-50" value={tipoAceite} onChange={(e) => setTipoAceite(e.target.value)} className="input-field" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Subiendo...' : 'Guardar Moto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Eliminación */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h2 className="modal-title text-red">¿Eliminar vehículo?</h2>
              <p className="modal-subtitle">Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setIsDeleteModalOpen(false); setMotoAEliminar(null); }}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={confirmarEliminacion} disabled={borrando}>{borrando ? 'Borrando...' : 'Sí, eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}