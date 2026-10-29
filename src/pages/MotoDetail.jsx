import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './MotoDetail.css';
import ModalSurtirGasolina from "./ModalSurtirGasolina.jsx";

export default function MotoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [moto, setMoto] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [catalogoServicios, setCatalogoServicios] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [historialGasolina, setHistorialGasolina] = useState([]);
  
  // Modales y Estados de Eliminación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [mostrarModalGasolina, setMostrarModalGasolina] = useState(false);
  const [servicioAEliminar, setServicioAEliminar] = useState(null);
  const [gasolinaAEliminar, setGasolinaAEliminar] = useState(null); // <-- Estado para saber qué gasolina borrar
  
  // Formulario avanzado
  const [servicioIdSeleccionado, setServicioIdSeleccionado] = useState('');
  const [kmAlMomento, setKmAlMomento] = useState('');
  const [fechaServicio, setFechaServicio] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUsuarioActual(user);
    };
    obtenerUsuario();
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    // 1. Cargar datos de la moto
    const { data: motoData } = await supabase.from('motos').select('*').eq('id', id).single();
    if (motoData) {
      setMoto(motoData);
      setKmAlMomento(motoData.kilometraje); 
    }

    // 2. Cargar catálogo
    const { data: catalogoData } = await supabase.from('catalogo_servicios').select('*');
    if (catalogoData) setCatalogoServicios(catalogoData);

    // 3. Cargar historial de mantenimientos
    const { data: historialData } = await supabase
      .from('bitacora_servicios')
      .select(`id, km_al_momento, fecha_servicio, notas, catalogo_servicios (nombre, intervalo_km)`)
      .eq('moto_id', id)
      .order('fecha_servicio', { ascending: false });
      
    if (historialData) setHistorial(historialData);

    // 4. Cargar historial de gasolina
    const { data: gasolinaData } = await supabase
      .from('registro_gasolina')
      .select('*')
      .eq('moto_id', id)
      .order('fecha', { ascending: true });

    if (gasolinaData) setHistorialGasolina(gasolinaData);
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

  const borrarGasolina = async () => {
    if (!gasolinaAEliminar) return;
    setCargando(true);
    
    const { error } = await supabase
      .from('registro_gasolina')
      .delete()
      .eq('id', gasolinaAEliminar.id);

    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      setIsDeleteModalOpen(false);
      setGasolinaAEliminar(null);
      cargarDatos();
    }
    setCargando(false);
  };

  const manejarGasolinaAnotada = () => {
    alert("¡Gasolina anotada mi pana!"); 
    cargarDatos(); 
  };

  // ==========================================
  // LÓGICA DE CÁLCULO DE RENDIMIENTO Y FINANZAS
  // ==========================================
  let totalDolaresGastados = 0;
  let rendimientoKmL = "N/A";
  
  if (historialGasolina.length > 0) {
    totalDolaresGastados = historialGasolina.reduce((acc, reg) => acc + Number(reg.precio_dolares), 0);
    
    if (historialGasolina.length > 1) {
      const primerRegistro = historialGasolina[0];
      const ultimoRegistro = historialGasolina[historialGasolina.length - 1];
      
      const kmRecorridos = ultimoRegistro.kilometraje - primerRegistro.kilometraje;
      const litrosConsumidos = historialGasolina.slice(0, -1).reduce((acc, reg) => acc + Number(reg.litros), 0);

      if (litrosConsumidos > 0 && kmRecorridos > 0) {
        rendimientoKmL = (kmRecorridos / litrosConsumidos).toFixed(1);
      }
    }
  }
  // ==========================================

  if (!moto) return <div className="detail-container"><div style={{padding: '2rem', textAlign: 'center'}}>Cargando taller...</div></div>;

  return (
    <div className="detail-container fade-in relative pb-24">
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
          <div className="summary-data flex justify-between w-full">
            <div>
              <h2>Kilometraje Actual</h2>
              <p className="summary-km">{moto.kilometraje.toLocaleString('en-US')} <small>KM</small></p>
            </div>
            
            {/* PANEL FINANCIERO / RENDIMIENTO */}
            <div className="text-right border-l border-gray-700 pl-4">
               <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-1">Finanzas Gasolina</h2>
               <p className="text-[#84cc16] font-bold text-lg">${totalDolaresGastados.toFixed(2)}</p>
               <div className="flex gap-2 mt-1">
                 <span className="text-xs bg-[#2a2a2a] px-2 py-1 rounded-md text-gray-300">
                    {rendimientoKmL} <span className="text-gray-500">Km/L</span>
                 </span>
               </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN DE HISTORIAL DE GASOLINA */}
        <div className="history-section mt-6">
          <div className="history-header border-b border-gray-700 pb-2 mb-4">
            <h2 className="text-[#84cc16] flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22h12"></path><path d="M4 9h10"></path><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"></path></svg>
              Recargas de Combustible
            </h2>
          </div>
          
          {historialGasolina.length === 0 ? (
            <div className="empty-history text-sm text-gray-500 italic py-2">
              No has anotado gasolina todavía.
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
              {[...historialGasolina].reverse().map((gas) => (
                <div key={gas.id} className="min-w-[200px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 shadow-md flex-shrink-0 relative">
                  <div className="flex justify-between items-start mb-2 pr-6">
                     <span className="font-bold text-white">{gas.litros} Litros</span>
                     <span className="text-green-500 font-semibold">${gas.precio_dolares}</span>
                  </div>
                  
                  {/* BOTÓN ELIMINAR GASOLINA */}
                  <button 
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition-colors"
                    onClick={() => {
                      setGasolinaAEliminar(gas);
                      setIsDeleteModalOpen(true);
                    }}
                    title="Eliminar Registro Gasolina"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>

                  <div className="text-xs text-gray-400 flex flex-col gap-1 mt-2 border-t border-[#333] pt-2">
                     <span>📅 {new Date(gas.fecha).toLocaleDateString()}</span>
                     <span>🏍️ A los {gas.kilometraje.toLocaleString()} km</span>
                     {gas.notas && <span className="italic mt-1 text-gray-500">"{gas.notas}"</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECCIÓN DE BITÁCORA NORMAL (MANTENIMIENTOS) */}
        <div className="history-section mt-8">
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
                const intervalo = item.catalogo_servicios?.intervalo_km || 0;
                const kmProximo = item.km_al_momento + intervalo;

                return (
                  <div key={item.id} className="history-card relative">
                    <div className="history-icon">🔧</div>
                    
                    <div className="history-info pr-6">
                      <h3>{item.catalogo_servicios?.nombre || 'Servicio'}</h3>
                      <span className="history-date">{item.fecha_servicio}</span>
                      {item.notas && <p className="history-notes">"{item.notas}"</p>}
                    </div>
                    
                    <div className="history-kms mt-3">
                      <div className="km-block">
                        <span className="km-label">Hecho a los</span>
                        <span className="km-value">{item.km_al_momento.toLocaleString()} km</span>
                      </div>
                      <div className="km-block next">
                        <span className="km-label">Próximo a los</span>
                        <span className="km-value">{kmProximo.toLocaleString()} km</span>
                      </div>
                    </div>

                    {/* NUEVO BOTÓN ELIMINAR MANTENIMIENTO (Mismo diseño que gasolina) */}
                    <button 
                      className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors"
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

      {/* BOTÓN FLOTANTE PARA SURTIR GASOLINA */}
      <button 
        onClick={() => setMostrarModalGasolina(true)}
        className="fixed bottom-6 right-6 bg-[#84cc16] p-4 rounded-full shadow-[0_0_15px_rgba(132,204,22,0.5)] hover:scale-105 active:scale-95 transition-transform z-40 flex items-center justify-center"
        title="Surtir Gasolina"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 22h12"></path>
          <path d="M4 9h10"></path>
          <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path>
          <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"></path>
        </svg>
      </button>

      {/* MODALES ADICIONALES */}
      {mostrarModalGasolina && usuarioActual && (
        <ModalSurtirGasolina 
          userId={usuarioActual.id} 
          motoId={id} 
          onClose={() => setMostrarModalGasolina(false)}
          onAnotado={manejarGasolinaAnotada}
        />
      )}

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

      {/* MODAL UNIFICADO: CONFIRMAR ELIMINACIÓN */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h2 className="modal-title text-red">¿Borrar registro?</h2>
              <p className="modal-subtitle">Esta acción eliminará este elemento permanentemente.</p>
            </div>
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => { 
                  setIsDeleteModalOpen(false); 
                  setServicioAEliminar(null); 
                  setGasolinaAEliminar(null);
                }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-danger" 
                onClick={() => {
                  if (servicioAEliminar) borrarMantenimiento();
                  if (gasolinaAEliminar) borrarGasolina();
                }} 
                disabled={cargando}
              >
                {cargando ? 'Borrando...' : 'Sí, borrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}