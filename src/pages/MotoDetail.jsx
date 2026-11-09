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
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [mostrarModalGasolina, setMostrarModalGasolina] = useState(false);
  const [servicioAEliminar, setServicioAEliminar] = useState(null);
  const [gasolinaAEliminar, setGasolinaAEliminar] = useState(null);
  
  // Formulario
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
    const { data: motoData } = await supabase.from('motos').select('*').eq('id', id).single();
    if (motoData) {
      setMoto(motoData);
      setKmAlMomento(motoData.kilometraje); 
    }

    const { data: catalogoData } = await supabase.from('catalogo_servicios').select('*');
    if (catalogoData) setCatalogoServicios(catalogoData);

    const { data: historialData } = await supabase
      .from('bitacora_servicios')
      .select(`id, km_al_momento, fecha_servicio, notas, catalogo_servicios (nombre, intervalo_km)`)
      .eq('moto_id', id)
      .order('fecha_servicio', { ascending: false });
      
    if (historialData) setHistorial(historialData);

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
    const { error } = await supabase.from('bitacora_servicios').delete().eq('id', servicioAEliminar.id);
    if (!error) {
      setIsDeleteModalOpen(false);
      setServicioAEliminar(null);
      cargarDatos();
    }
    setCargando(false);
  };

  const borrarGasolina = async () => {
    if (!gasolinaAEliminar) return;
    setCargando(true);
    const { error } = await supabase.from('registro_gasolina').delete().eq('id', gasolinaAEliminar.id);
    if (!error) {
      setIsDeleteModalOpen(false);
      setGasolinaAEliminar(null);
      cargarDatos();
    }
    setCargando(false);
  };

  const manejarGasolinaAnotada = () => {
    cargarDatos(); 
  };

  // Finanzas
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

if (!moto) return <div className="min-h-screen flex items-center justify-center">Cargando bitácora...</div>;

  return (
    <>
      <div className="min-h-screen pb-32 fade-in bg-transparent">
        
        {/* HEADER PREMIUM (ADAPTATIVO) */}
        <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-[#111111]/80 px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white font-bold transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Garaje
          </button>
          <h1 className="text-lg font-black tracking-tight uppercase text-neutral-900 dark:text-white">{moto.marca} <span className="opacity-50">/</span> {moto.modelo}</h1>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 text-neutral-900 dark:text-white">
          
          {/* RESUMEN DEL VEHÍCULO */}
          <div className="moto-summary-card">
            {moto.imagen_url ? (
               <img src={moto.imagen_url} alt="Moto" className="summary-img" />
            ) : (
               <div className="w-28 h-28 bg-neutral-200 dark:bg-[#1a1a1a] rounded-full flex items-center justify-center border-4 border-neutral-300 dark:border-[#2a2a2a] text-neutral-500 font-black shadow-lg">NO IMG</div>
            )}
            
            <div className="flex-1 w-full flex flex-col sm:flex-row justify-between gap-6">
              <div>
                <h2 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest mb-1">Odómetro</h2>
                <p className="text-4xl font-black leading-none">{moto.kilometraje.toLocaleString('en-US')} <span className="text-sm text-lime-600 dark:text-lime-500">KM</span></p>
              </div>
              
              <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-black/10 dark:border-white/10 pt-4 sm:pt-0 sm:pl-6">
                 <h2 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest mb-1">Gasto en Gasolina</h2>
                 <p className="text-2xl font-black text-lime-600 dark:text-lime-400">${totalDolaresGastados.toFixed(2)}</p>
                 <div className="mt-2 sm:justify-end flex">
                   <span className="text-xs font-bold bg-neutral-100 dark:bg-[#0a0a0a] border border-neutral-200 dark:border-[#222] px-3 py-1 rounded-full shadow-inner">
                      {rendimientoKmL} <span className="text-neutral-500">Km/L</span>
                   </span>
                 </div>
              </div>
            </div>
          </div>

          {/* HISTORIAL DE COMBUSTIBLE */}
          <div className="mt-10 mb-12">
            <div className="history-header">
              <h2 className="text-xl font-black flex items-center gap-2">
                <span className="text-lime-500">⛽</span> Combustible
              </h2>
            </div>
            
            {historialGasolina.length === 0 ? (
              <div className="text-center p-8 bg-neutral-100/50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-3xl text-neutral-500 font-bold text-sm">
                No has anotado gasolina todavía.
              </div>
            ) : (
              <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
                {[...historialGasolina].reverse().map((gas) => (
                  <div key={gas.id} className="min-w-[220px] bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-white/5 rounded-2xl p-4 shadow-md dark:shadow-xl snap-start relative group">
                    <div className="flex justify-between items-end mb-3 pr-6 border-b border-black/5 dark:border-white/5 pb-3">
                       <span className="font-black text-2xl">{gas.litros} <span className="text-xs text-neutral-500">L</span></span>
                       <span className="text-lime-600 dark:text-lime-400 font-black text-lg">${gas.precio_dolares}</span>
                    </div>
                    
                    <button 
                      className="absolute top-3 right-3 text-neutral-400 hover:text-red-500 bg-neutral-100 dark:bg-black/40 hover:bg-red-50 dark:hover:bg-red-500/20 p-2 rounded-full transition-all"
                      onClick={() => { setGasolinaAEliminar(gas); setIsDeleteModalOpen(true); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>

                    <div className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold flex flex-col gap-1.5">
                       <span className="flex justify-between"><span>📅 Fecha:</span> <span className="text-neutral-900 dark:text-white">{new Date(gas.fecha).toLocaleDateString()}</span></span>
                       <span className="flex justify-between"><span>🏍️ Odómetro:</span> <span className="text-neutral-900 dark:text-white">{gas.kilometraje.toLocaleString()} km</span></span>
                       {gas.notas && <span className="italic mt-2 text-neutral-500 border-t border-black/5 dark:border-white/5 pt-2">"{gas.notas}"</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BITÁCORA DE MANTENIMIENTOS */}
          <div className="mt-12">
            <div className="history-header">
              <h2 className="text-xl font-black flex items-center gap-2">
                <span className="text-lime-500">🔧</span> Servicios
              </h2>
              <button 
                className="bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"
                onClick={() => setIsModalOpen(true)}
              >
                + Nuevo
              </button>
            </div>

            {historial.length === 0 ? (
              <div className="text-center p-10 bg-neutral-100/50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-3xl text-neutral-500 font-bold text-sm">
                Tu bitácora está limpia. Registra mantenimientos para cuidarla.
              </div>
            ) : (
              <div className="history-list">
                {historial.map((item) => {
                  const intervalo = item.catalogo_servicios?.intervalo_km || 0;
                  const kmProximo = item.km_al_momento + intervalo;

                  return (
                    <div key={item.id} className="history-card">
                      <div className="history-icon">🔧</div>
                      
                      <div className="history-info">
                        <h3>{item.catalogo_servicios?.nombre || 'Mantenimiento General'}</h3>
                        <span className="history-date">{item.fecha_servicio}</span>
                        {item.notas && <p className="history-notes">"{item.notas}"</p>}
                      </div>
                      
                      <div className="history-kms">
                        <div className="km-block">
                          <span className="km-label">Realizado</span>
                          <span className="km-value">{item.km_al_momento.toLocaleString()} <span className="text-xs">km</span></span>
                        </div>
                        <div className="km-block next">
                          <span className="km-label">Toca a los</span>
                          <span className="km-value">{kmProximo.toLocaleString()} <span className="text-xs text-lime-600">km</span></span>
                        </div>
                      </div>

                      <button 
                        className="btn-delete-service"
                        onClick={() => { setServicioAEliminar(item); setIsDeleteModalOpen(true); }}
                        title="Eliminar registro"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* =========================================================
          BOTONES Y MODALES FLOTANTES (FUERA DEL CONTENEDOR ANIMADO)
          ========================================================= */}
      
      {/* BOTÓN FLOTANTE SURTIR GASOLINA */}
      <button 
        onClick={() => setMostrarModalGasolina(true)}
        className="fixed bottom-24 right-6 bg-gradient-to-r from-lime-400 to-lime-600 p-4 rounded-full shadow-[0_5px_20px_rgba(132,204,22,0.4)] hover:scale-105 active:scale-95 transition-transform z-[6000] flex items-center justify-center text-black"
        title="Surtir Gasolina"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 22h12"></path><path d="M4 9h10"></path><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"></path>
        </svg>
      </button>

      {/* MODAL: GASOLINA */}
      {mostrarModalGasolina && usuarioActual && (
        <ModalSurtirGasolina 
          userId={usuarioActual.id} 
          motoId={id} 
          onClose={() => setMostrarModalGasolina(false)}
          onAnotado={manejarGasolinaAnotada}
        />
      )}

      {/* MODAL: NUEVO SERVICIO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gradient-to-b dark:from-[#1a1a1a] dark:to-[#0a0a0a] border border-neutral-200 dark:border-white/10 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white">Servicio</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Registra un nuevo mantenimiento.</p>
            </div>
            
            <form onSubmit={registrarMantenimiento} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest block mb-2">Tipo de Servicio</label>
                <select 
                  value={servicioIdSeleccionado} 
                  onChange={(e) => setServicioIdSeleccionado(e.target.value)} 
                  required 
                  className="w-full bg-neutral-100 dark:bg-black/50 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white rounded-xl p-3.5 text-sm focus:border-lime-500 focus:outline-none appearance-none"
                >
                  <option value="" disabled>-- Seleccionar --</option>
                  {catalogoServicios.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest block mb-2">Odómetro (KM)</label>
                  <input type="number" value={kmAlMomento} onChange={(e) => setKmAlMomento(e.target.value)} required className="w-full bg-neutral-100 dark:bg-black/50 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white rounded-xl p-3.5 text-sm focus:border-lime-500 focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest block mb-2">Fecha</label>
                  <input type="date" value={fechaServicio} onChange={(e) => setFechaServicio(e.target.value)} required className="w-full bg-neutral-100 dark:bg-black/50 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white rounded-xl p-3.5 text-sm focus:border-lime-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest block mb-2">Notas (Opcional)</label>
                <textarea 
                  placeholder="Detalles del repuesto..." 
                  value={notas} 
                  onChange={(e) => setNotas(e.target.value)} 
                  className="w-full bg-neutral-100 dark:bg-black/50 border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white rounded-xl p-3.5 text-sm focus:border-lime-500 focus:outline-none"
                  rows="2"
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button type="button" className="flex-1 bg-neutral-200 dark:bg-white/5 hover:bg-neutral-300 dark:hover:bg-white/10 text-neutral-800 dark:text-white font-bold py-3.5 rounded-xl transition-all" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="flex-1 bg-lime-500 hover:bg-lime-400 text-black font-extrabold py-3.5 rounded-xl transition-all shadow-[0_5px_15px_rgba(132,204,22,0.2)]" disabled={cargando}>{cargando ? 'Guardando...' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111] border border-red-500/20 w-full max-w-xs rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-500/20 text-red-500">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white mb-2">¿Borrar registro?</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">Esta acción es irreversible.</p>
            <div className="flex gap-3">
              <button 
                type="button" 
                className="flex-1 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white font-bold py-3 rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors" 
                onClick={() => { setIsDeleteModalOpen(false); setServicioAEliminar(null); setGasolinaAEliminar(null); }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="flex-1 bg-red-600 text-white font-extrabold py-3 rounded-xl shadow-[0_5px_15px_rgba(220,38,38,0.3)] hover:bg-red-500 transition-colors" 
                onClick={() => { if (servicioAEliminar) borrarMantenimiento(); if (gasolinaAEliminar) borrarGasolina(); }} 
                disabled={cargando}
              >
                {cargando ? '...' : 'Sí, borrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}