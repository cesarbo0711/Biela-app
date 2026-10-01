import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import './Garage.css';

export default function Garage({ usuario }) {
  const [motos, setMotos] = useState([]); 
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isKmModalOpen, setIsKmModalOpen] = useState(false); // NUEVO: Modal de KM

  // Estados de Moto Nueva
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [year, setYear] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [tipoAceite, setTipoAceite] = useState('');
  const [imagenArchivo, setImagenArchivo] = useState(null);
  
  // Estados de control
  const [motoActiva, setMotoActiva] = useState(null);
  const [nuevoKm, setNuevoKm] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargarMotos = async () => {
    const { data } = await supabase.from('motos').select('*').eq('user_id', usuario.id).order('created_at', { ascending: false });
    if (data) setMotos(data);
  };

  useEffect(() => {
    cargarMotos();
  }, [usuario]);

  // Función para registrar moto (Igual que antes)
  const registrarMoto = async (e) => {
    e.preventDefault();
    setCargando(true);
    let urlImagen = null;
    if (imagenArchivo) {
      const fileExt = imagenArchivo.name.split('.').pop();
      const filePath = `${usuario.id}/${Date.now()}.${fileExt}`;
      await supabase.storage.from('vehiculos').upload(filePath, imagenArchivo);
      const { data: { publicUrl } } = supabase.storage.from('vehiculos').getPublicUrl(filePath);
      urlImagen = publicUrl;
    }
    await supabase.from('motos').insert([{
      user_id: usuario.id, marca, modelo, year, kilometraje: parseInt(kilometraje) || 0, tipo_aceite: tipoAceite, imagen_url: urlImagen 
    }]);
    setIsModalOpen(false);
    cargarMotos();
    setCargando(false);
  };

  // NUEVO: Función para actualizar solo el KM
  const actualizarKm = async (e) => {
    e.preventDefault();
    setCargando(true);
    await supabase.from('motos').update({ kilometraje: parseInt(nuevoKm) }).eq('id', motoActiva.id);
    setIsKmModalOpen(false);
    cargarMotos();
    setCargando(false);
  };

  const confirmarEliminacion = async () => {
    setCargando(true);
    await supabase.from('motos').delete().eq('id', motoActiva.id);
    setIsDeleteModalOpen(false);
    cargarMotos();
    setCargando(false);
  };

  return (
    <div className="garage-tab fade-in">
      <div className="list-header">
        <h2 className="section-title">Tus Vehículos</h2>
        <button className="btn-icon-add" onClick={() => setIsModalOpen(true)}>+ Añadir</button>
      </div>

      <div className="motos-list">
        {motos.map((moto) => (
          <div key={moto.id} className="pro-moto-card">
            <div className="pro-card-actions">
              <button className="pro-btn-delete" onClick={() => { setMotoActiva(moto); setIsDeleteModalOpen(true); }}>Borrar</button>
            </div>
            
            <div className="pro-image-wrapper">
              <div className="pro-glow"></div>
              {moto.imagen_url && <img src={moto.imagen_url} alt="Moto" className="pro-moto-img" />}
            </div>

            <div className="pro-data-overlay">
              <div className="pro-data-header">
                <h3 className="pro-title">{moto.marca} - {moto.modelo}</h3>
                <span className="pro-year">{moto.year}</span>
              </div>
              
              <div className="pro-data-grid">
                <div className="pro-stat">
                  <span className="pro-stat-label">KILOMETRAJE</span>
                  <div className="pro-km-row">
                    <span className="pro-stat-value">{moto.kilometraje.toLocaleString('en-US')} <small>KM</small></span>
                    {/* BOTÓN RÁPIDO PARA EDITAR KM */}
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
            </div>
          </div>
        ))}
      </div>

      {/* Modal Actualizar KM (Pequeño y Rápido) */}
      {isKmModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content mini-modal">
            <h2 className="modal-title">Ajustar Kilometraje</h2>
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

      {/* Resto de modales (Registro y Eliminar) que ya teníamos... (Pégalos aquí, la lógica es idéntica) */}
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

