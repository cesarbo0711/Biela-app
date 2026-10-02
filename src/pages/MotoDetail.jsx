import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './MotoDetail.css';

export default function MotoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [moto, setMoto] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [catalogoServicios, setCatalogoServicios] = useState([]);
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [servicioAEliminar, setServicioAEliminar] = useState(null);
  
  // Formulario avanzado
  const [servicioIdSeleccionado, setServicioIdSeleccionado] = useState('');
  const [kmAlMomento, setKmAlMomento] = useState('');
  const [fechaServicio, setFechaServicio] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    // 1. Cargar datos de la moto
    const { data: motoData } = await supabase.from('motos').select('*').eq('id', id).single();
    if (motoData) {
      setMoto(motoData);
      setKmAlMomento(motoData.kilometraje); 
    }

    // 2. Cargar catálogo de servicios disponibles
    const { data: catalogoData } = await supabase.from('catalogo_servicios').select('*');
    if (catalogoData) setCatalogoServicios(catalogoData);

    // 3. Cargar la bitácora con los datos relacionados del catálogo
    const { data: historialData } = await supabase
      .from('bitacora_servicios')
      .select(`
        id,
        km_al_momento,
        fecha_servicio,
        notas,
        catalogo_servicios (nombre, intervalo_km)
      `)
      .eq('moto_id', id)
      .order('fecha_servicio', { ascending: false });
      
    if (historialData) setHistorial(historialData);
  };

  const registrarMantenimiento = async (e) => {
    e.preventDefault();
    if (!servicioIdSeleccionado) return alert('Selecciona un servicio del catálogo');
    setCargando(true);

    const { error } = await supabase.from('bitacora_servicios').insert([{
      moto_id: id,
      servicio_id: parseInt(servicioIdSeleccionado),
      km_al_momento: parseInt(kmAlMomento),
      fecha_servicio: fechaServicio,
      notas: notas
    }]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      // Si el kilometraje registrado es mayor, actualizamos el odómetro general de la moto
      if (parseInt(kmAlMomento) > moto.kilometraje) {
        await supabase.from('motos').update({ kilometraje: parseInt(kmAlMomento) }).eq('id', id);
      }
      
      setServicioIdSeleccionado('');
      setNotas('');
      setIsModalOpen(false);
      cargarDatos(); 
    }
    setCargando(false);
  };

  const borrarMantenimiento = async () => {
    if (!servicioAEliminar) return;
    setCargando(true);
    
    const { error } = await supabase
      .from('bitacora_servicios')
      .delete()
      .eq('id', servicioAEliminar.id);

    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      setIsDeleteModalOpen(false);
      setServicioAEliminar(null);
      cargarDatos();
    }
    setCargando(false);
  };

  if (!moto) return <div className="detail-container"><div style={{padding: '2rem', textAlign: 'center'}}>Cargando taller...</div></div>;

  return (
    <div className="detail-container fade-in">
      <header className="detail-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Volver
        </button>
        <h1 className="detail-title">{moto.marca} {moto.modelo}</h1>
      </header>

      <main className="detail-content">
        <div className="moto-summary-card">
          {moto.imagen_url && <img src={moto.imagen_url} alt="Moto" className="summary-img" />}
          <div className="summary-data">
            <h2>Kilometraje Actual</h2>
            <p className="summary-km">{moto.kilometraje.toLocaleString('en-US')} <small>KM</small></p>
          </div>
        </div>

        <div className="history-section">
          <div className="history-header">
            <h2>Bitácora de Servicios</h2>
            <button className="btn-add-service" onClick={() => setIsModalOpen(true)}>+ Registrar</button>
          </div>

          {historial.length === 0 ? (
            <div className="empty-history">
              <p>No hay mantenimientos registrados aún.</p>
            </div>
          ) : (
            <div className="history-list">
              {historial.map((item) => {
                // Cálculo automático del próximo servicio sumando el intervalo del catálogo
                const intervalo = item.catalogo_servicios?.intervalo_km || 0;
                const kmProximo = item.km_al_momento + intervalo;

                return (
                  <div key={item.id} className="history-card">
                    <div className="history-icon">🔧</div>
                    
                    <div className="history-info">
                      <h3>{item.catalogo_servicios?.nombre || 'Servicio'}</h3>
                      <span className="history-date">{item.fecha_servicio}</span>
                      {item.notas && <p className="history-notes">"{item.notas}"</p>}
                    </div>
                    
                    <div className="history-kms">
                      <div className="km-block">
                        <span className="km-label">Hecho a los</span>
                        <span className="km-value">{item.km_al_momento.toLocaleString()} km</span>
                      </div>
                      <div className="km-block next">
                        <span className="km-label">Próximo a los</span>
                        <span className="km-value">{kmProximo.toLocaleString()} km</span>
                      </div>
                    </div>

                    <button 
                      className="btn-delete-service"
                      onClick={() => {
                        setServicioAEliminar(item);
                        setIsDeleteModalOpen(true);
                      }}
                      title="Eliminar registro"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: NUEVO SERVICIO DESDE EL CATÁLOGO */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Registrar Mantenimiento</h2>
              <p className="modal-subtitle">Selecciona el tipo de servicio realizado.</p>
            </div>
            <form onSubmit={registrarMantenimiento} className="modal-form">
              <div className="input-group">
                <label>Servicio</label>
                <select 
                  value={servicioIdSeleccionado} 
                  onChange={(e) => setServicioIdSeleccionado(e.target.value)} 
                  required 
                  className="input-field"
                >
                  <option value="">-- Elige un servicio --</option>
                  {catalogoServicios.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre} (Cada {cat.intervalo_km.toLocaleString()} km)
                    </option>
                  ))}
                </select>
              </div>

              <div className="row-inputs">
                <div className="input-group">
                  <label>KM al Momento</label>
                  <input type="number" value={kmAlMomento} onChange={(e) => setKmAlMomento(e.target.value)} required className="input-field" />
                </div>
                <div className="input-group">
                  <label>Fecha</label>
                  <input type="date" value={fechaServicio} onChange={(e) => setFechaServicio(e.target.value)} required className="input-field" />
                </div>
              </div>

              <div className="input-group">
                <label>Notas adicionales (Opcional)</label>
                <textarea 
                  placeholder="ej. Se usó aceite mineral, marca específica..." 
                  value={notas} 
                  onChange={(e) => setNotas(e.target.value)} 
                  className="input-field"
                  rows="2"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h2 className="modal-title text-red">¿Borrar registro?</h2>
              <p className="modal-subtitle">Esta acción eliminará este servicio de la bitácora.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => { setIsDeleteModalOpen(false); setServicioAEliminar(null); }}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={borrarMantenimiento} disabled={cargando}>
                {cargando ? 'Borrando...' : 'Sí, borrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}