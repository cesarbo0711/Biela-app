import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import './Garage.css';

export default function Garage({ usuario }) {
  const [motos, setMotos] = useState([]); 
  const navigate = useNavigate();

  // Control de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isKmModalOpen, setIsKmModalOpen] = useState(false);

  // Estados del Formulario
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [year, setYear] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [tipoAceite, setTipoAceite] = useState('');
  const [imagenArchivo, setImagenArchivo] = useState(null);
  
  // Estados Operativos
  const [motoActiva, setMotoActiva] = useState(null);
  const [nuevoKm, setNuevoKm] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargarMotos = async () => {
    if (!usuario?.id) return;
    const { data, error } = await supabase
      .from('motos')
      .select('*')
      .eq('user_id', usuario.id)
      .order('created_at', { ascending: false });
      
    if (data) setMotos(data);
    if (error) console.error("Error al cargar motos:", error);
  };

  useEffect(() => {
    cargarMotos();
  }, [usuario]);

  // Guardar nueva moto
  const registrarMoto = async (e) => {
    e.preventDefault();
    setCargando(true);
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
        setCargando(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('vehiculos')
        .getPublicUrl(filePath);
        
      urlImagen = publicUrl;
    }

    const { error } = await supabase.from('motos').insert([{
      user_id: usuario.id,
      marca,
      modelo,
      year,
      kilometraje: parseInt(kilometraje) || 0,
      tipo_aceite: tipoAceite,
      imagen_url: urlImagen 
    }]);

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
      cargarMotos(); 
    }
    setCargando(false);
  };

  // Actualizar solo los KM
  const actualizarKm = async (e) => {
    e.preventDefault();
    setCargando(true);
    const { error } = await supabase
      .from('motos')
      .update({ kilometraje: parseInt(nuevoKm) })
      .eq('id', motoActiva.id);
      
    if (error) alert('Error: ' + error.message);
    else {
      setIsKmModalOpen(false);
      cargarMotos();
    }
    setCargando(false);
  };

  // Borrar moto
  const confirmarEliminacion = async () => {
    if (!motoActiva) return;
    setCargando(true);
    const { error } = await supabase.from('motos').delete().eq('id', motoActiva.id);
    if (error) alert('Error: ' + error.message);
    else {
      setIsDeleteModalOpen(false);
      setMotoActiva(null);
      cargarMotos();
    }
    setCargando(false);
  };

  return (
    <div className="garage-tab fade-in">
      <div className="list-header">
        <h2 className="section-title">Tus Vehículos</h2>
        <button className="btn-icon-add" onClick={() => setIsModalOpen(true)}>+ Añadir</button>
      </div>

      {/* TARJETA DESTACADA: RADAR DE BOMBAS (MAPA) */}
      <div style={{ padding: '0 1rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => navigate('/mapa-gasolina')}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #1f241d 0%, #121411 100%)',
            border: '1.5px solid #84cc16',
            borderRadius: '1rem',
            padding: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 20px rgba(132, 204, 22, 0.2)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              backgroundColor: 'rgba(132, 204, 22, 0.2)',
              padding: '0.8rem',
              borderRadius: '50%',
              color: '#84cc16',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Ícono de Mapa / Surtidor */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 22h12"></path>
                <path d="M4 9h10"></path>
                <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path>
                <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"></path>
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '1.1rem', margin: 0 }}>Radar de Bombas</h3>
                <span style={{
                  backgroundColor: '#84cc16',
                  color: '#000000',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '1rem',
                  textTransform: 'uppercase'
                }}>EN VIVO</span>
              </div>
              <p style={{ color: '#a1a1aa', fontSize: '0.8rem', margin: 0 }}>Ubicación y estatus de combustible</p>
            </div>
          </div>
          
          <div style={{
            backgroundColor: '#84cc16',
            color: '#000000',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            ➔
          </div>
        </button>
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
              <div className="pro-card-actions">
                <button className="pro-btn-delete" onClick={() => { setMotoActiva(moto); setIsDeleteModalOpen(true); }}>Borrar</button>
              </div>

              <div className="pro-image-wrapper">
                <div className="pro-glow"></div>
                {moto.imagen_url ? (
                  <img src={moto.imagen_url} alt={`${moto.marca} ${moto.modelo}`} className="pro-moto-img" />
                ) : (
                  <div className="pro-no-img">Sin imagen</div>
                )}
              </div>

              <div className="pro-data-overlay">
                <div className="pro-data-header">
                  <h3 className="pro-title">{moto.marca} - {moto.modelo}</h3>
                  <span className="pro-year">{moto.year || 'N/A'}</span>
                </div>
                
                <div className="pro-data-grid">
                  <div className="pro-stat">
                    <span className="pro-stat-label">KILOMETRAJE</span>
                    <div className="pro-km-row">
                      <span className="pro-stat-value">{moto.kilometraje.toLocaleString('en-US')} <small>KM</small></span>
                      <button className="btn-edit-km" onClick={() => { setMotoActiva(moto); setNuevoKm(moto.kilometraje); setIsKmModalOpen(true); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                  </div>
                  <div className="pro-stat">
                    <span className="pro-stat-label">ACEITE</span>
                    <span className="pro-stat-value text-medium">{moto.tipo_aceite || 'N/A'}</span>
                  </div>
                </div>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '2rem', marginLeft: '0.5rem', marginTop: '0.5rem' }}
                  onClick={() => navigate(`/moto/${moto.id}`)}
                >
                  Ver Bitácora
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: REGISTRAR MOTO */}
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
                <button type="submit" className="btn-primary" disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar Moto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ACTUALIZAR KM RÁPIDO */}
      {isKmModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content mini-modal">
            <div className="modal-header">
              <h2 className="modal-title">Ajustar Kilometraje</h2>
            </div>
            <form onSubmit={actualizarKm} className="modal-form">
              <div className="input-group">
                <input type="number" autoFocus value={nuevoKm} onChange={(e) => setNuevoKm(e.target.value)} required className="input-field km-input-huge" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsKmModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={cargando}>{cargando ? '...' : 'Actualizar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ELIMINAR MOTO */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h2 className="modal-title text-red">¿Eliminar vehículo?</h2>
              <p className="modal-subtitle">Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setIsDeleteModalOpen(false); setMotoActiva(null); }}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={confirmarEliminacion} disabled={cargando}>{cargando ? 'Borrando...' : 'Sí, eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}