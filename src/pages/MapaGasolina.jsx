import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabase'; 
import { useNavigate } from 'react-router-dom';

// Coordenadas iniciales (San Juan de los Morros)
const defaultCenter = [9.9115, -67.3538];

// COMPONENTE AUXILIAR PARA RASTREAR EL CENTRO DEL MAPA
function MapCenterTracker({ onCenterChange }) {
  const map = useMapEvents({
    moveend: () => {
      onCenterChange(map.getCenter());
    },
  });
  return null;
}

export default function MapaGasolina() {
  const navigate = useNavigate();
  
  // Estados de la app
  const [estacionesFull, setEstacionesFull] = useState([]);
  const [estaciones, setEstaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [cargandoReporte, setCargandoReporte] = useState(false);
  
  const [filtroActivo, setFiltroActivo] = useState('Todas'); 

  // Estados del Modo "Agregar Bomba"
  const [modoAgregar, setModoAgregar] = useState(false);
  const [centroActual, setCentroActual] = useState({ lat: defaultCenter[0], lng: defaultCenter[1] });
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [nuevaBombaNombre, setNuevaBombaNombre] = useState('');
  const [nuevaBombaEstatus, setNuevaBombaEstatus] = useState('Surtiendo');
  const [nuevaBombaTipo, setNuevaBombaTipo] = useState('Dólares'); 

  // Estado del mini-chat de BujÍA
  const [mostrarBujia, setMostrarBujia] = useState(false);

  useEffect(() => {
    verificarUsuario();
    cargarEstaciones();
  }, []);

  useEffect(() => {
    if (filtroActivo === 'Todas') {
      setEstaciones(estacionesFull);
    } else if (filtroActivo === 'Surtiendo') {
      setEstaciones(estacionesFull.filter(b => b.estado_actual === 'Surtiendo'));
    } else if (filtroActivo === 'Dólares') {
      setEstaciones(estacionesFull.filter(b => b.tipo === 'Dólares'));
    } else if (filtroActivo === 'Subsidiada') {
      setEstaciones(estacionesFull.filter(b => b.tipo === 'Subsidiada'));
    }
  }, [filtroActivo, estacionesFull]);

  const verificarUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUsuarioActual(user);
  };

  const cargarEstaciones = async () => {
    setCargando(true);
    const { data, error } = await supabase.from('estaciones_servicio').select('*');

    if (error) {
      console.error("❌ Error Supabase:", error.message);
    } else {
      const estacionesValidas = data.filter(e => e.latitud != null && e.longitud != null);
      setEstacionesFull(estacionesValidas || []);
      setEstaciones(estacionesValidas || []); 
    }
    setCargando(false);
  };

  const reportarEstatus = async (estacionId, nuevoEstado) => {
    if (!usuarioActual) return alert("Debes iniciar sesión para reportar");
    
    setCargandoReporte(true);
    const { error } = await supabase
      .from('estaciones_servicio')
      .update({
        estado_actual: nuevoEstado,
        ultima_actualizacion: new Date().toISOString(),
        // No pisamos el 'reportado_por' aquí para no quitarle la autoría de creación al dueño original.
        // Podrías crear una columna 'ultimo_reportero' si quieres trackear quién actualizó.
      })
      .eq('id', estacionId);
      
    setCargandoReporte(false);
    if (error) {
      alert("Error reportando: " + error.message);
    } else {
      alert(`¡Reporte exitoso! Marcada como: ${nuevoEstado}`);
      cargarEstaciones(); 
    }
  };

  const guardarNuevaBomba = async () => {
    if (!usuarioActual) return alert("Debes iniciar sesión para agregar bombas");
    if (!nuevaBombaNombre.trim()) return alert("Ponle un nombre a la bomba mi pana");

    setCargandoReporte(true);
    const { error } = await supabase
      .from('estaciones_servicio')
      .insert({
        nombre: nuevaBombaNombre,
        latitud: centroActual.lat,
        longitud: centroActual.lng,
        estado_actual: nuevaBombaEstatus,
        tipo: nuevaBombaTipo, 
        ultima_actualizacion: new Date().toISOString(),
        reportado_por: usuarioActual.id // Aquí marcamos que TÚ fuiste el creador
      });

    setCargandoReporte(false);

    if (error) {
      alert("Error guardando la bomba: " + error.message);
    } else {
      alert("¡Bomba agregada con éxito al mapa!");
      setMostrarFormNuevo(false);
      setModoAgregar(false);
      setNuevaBombaNombre('');
      cargarEstaciones();
    }
  };

  // NUEVA FUNCIÓN: ELIMINAR BOMBA (Solo si el usuario actual fue quien la creó)
  const eliminarBomba = async (estacionId, nombre) => {
    const confirmar = window.confirm(`¿Seguro que quieres borrar la bomba "${nombre}" del radar?`);
    if (!confirmar) return;

    setCargandoReporte(true);
    const { error } = await supabase
      .from('estaciones_servicio')
      .delete()
      .eq('id', estacionId)
      .eq('reportado_por', usuarioActual.id); // Doble chequeo de seguridad

    setCargandoReporte(false);

    if (error) {
      alert("Error borrando la bomba: " + error.message);
    } else {
      alert("Bomba eliminada del mapa.");
      // Forzamos a cerrar los popups activos de Leaflet
      document.dispatchEvent(new Event('mousedown'));
      cargarEstaciones();
    }
  };

  const getColorPorEstado = (estado) => {
    if (estado === 'Surtiendo') return 'text-green-500 font-bold';
    if (estado === 'Cerrada') return 'text-red-500 font-bold';
    if (estado === 'Solo Gasoil') return 'text-orange-500 font-bold';
    return 'text-gray-400 font-bold';
  };

  const crearIconoPorEstado = (estado) => {
    let colorFondo = '#9ca3af'; 
    let latido = '';
    
    if (estado === 'Surtiendo') {
      colorFondo = '#22c55e'; 
      latido = 'animate-pulse';
    } else if (estado === 'Cerrada') {
      colorFondo = '#ef4444'; 
    } else if (estado === 'Solo Gasoil') {
      colorFondo = '#f97316'; 
    }

    const htmlString = `
      <div class="relative flex items-center justify-center w-[40px] h-[40px]">
        <div class="absolute w-10 h-10 rounded-full opacity-40 ${latido}" style="background-color: ${colorFondo};"></div>
        <div class="z-10 w-6 h-6 rounded-full border-[3px] border-[#111] shadow-lg" style="background-color: ${colorFondo};"></div>
      </div>
    `;

    return L.divIcon({
      className: 'bg-transparent border-0',
      html: htmlString,
      iconSize: [40, 40],
      iconAnchor: [20, 20], 
      popupAnchor: [0, -20]
    });
  };

  const tiempoRelativo = (fechaISO) => {
    if (!fechaISO) return "Nunca";
    const min = Math.floor((new Date() - new Date(fechaISO)) / 60000);
    if (min < 1) return "Justo ahora";
    if (min < 60) return `Hace ${min} min`;
    if (min < 1440) return `Hace ${Math.floor(min / 60)} hr`;
    return `Hace ${Math.floor(min / 1440)} días`;
  };

  const mensajeBujia = () => {
    const activas = estacionesFull.filter(b => b.estado_actual === 'Surtiendo').length;
    if (activas === 0) return "¡Epale mi pana! Ahorita la cosa está frita, no veo bombas surtiendo en el radar. Pega un ojo al gasoil o espera un rato.";
    if (activas === 1) return `Chamo, arranca ya, solo veo una bomba surtiendo gasolina, no vayas a quedarte seco.`;
    return `¡Epa! Hay ${activas} bombas soltando gasolina ahorita mismo. Tienes opciones para escoger, revisa el mapa.`;
  };

  if (cargando && estacionesFull.length === 0) {
    return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">Cargando radar...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white overflow-hidden relative">
      
      <header className="bg-neutral-950 p-4 flex flex-col border-b border-neutral-800 z-[1000] relative shadow-md gap-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-[#84cc16] hover:text-white transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-xl font-bold text-white tracking-wide">Radar de Bombas</h1>
          <button 
            onClick={() => setModoAgregar(!modoAgregar)}
            className={`p-2 rounded-full transition-colors ${modoAgregar ? 'bg-red-500 text-white' : 'bg-[#84cc16] text-black'}`}
          >
            {modoAgregar ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            )}
          </button>
        </div>

        {!modoAgregar && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setFiltroActivo('Todas')} className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filtroActivo === 'Todas' ? 'bg-[#84cc16] text-black' : 'bg-neutral-800 text-neutral-400'}`}>
              🌎 Todas
            </button>
            <button onClick={() => setFiltroActivo('Surtiendo')} className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filtroActivo === 'Surtiendo' ? 'bg-green-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
              ✅ Solo Surtiendo
            </button>
            <button onClick={() => setFiltroActivo('Dólares')} className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filtroActivo === 'Dólares' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
              💵 Dólares
            </button>
            <button onClick={() => setFiltroActivo('Subsidiada')} className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filtroActivo === 'Subsidiada' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
              🇻🇪 Subsidiada
            </button>
          </div>
        )}
      </header>

      {modoAgregar && !mostrarFormNuevo && (
        <div className="absolute top-32 left-0 right-0 z-[2000] flex justify-center animate-fade-in pointer-events-none">
          <div className="bg-neutral-900/90 border border-[#84cc16] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm">
            Mueve el mapa para ubicar la bomba
          </div>
        </div>
      )}

      <div className="flex-grow relative z-0">
        
        {modoAgregar && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="2" className="drop-shadow-lg">
              <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><circle cx="12" cy="12" r="2" fill="#84cc16"></circle>
            </svg>
          </div>
        )}

        <MapContainer 
          center={defaultCenter} 
          zoom={14} 
          className="w-full h-full"
          style={{ filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(85%)' }}
        >
          {modoAgregar && <MapCenterTracker onCenterChange={setCentroActual} />}
          
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />

          {!modoAgregar && estaciones.map(bomba => (
            <Marker key={bomba.id} position={[bomba.latitud, bomba.longitud]} icon={crearIconoPorEstado(bomba.estado_actual)}>
              <Popup className="biela-dark-popup">
                <div className="p-2 min-w-[220px] bg-neutral-900 text-neutral-200 rounded-lg shadow-2xl -m-4 relative">
                  
                  {/* BOTÓN DE ELIMINAR (Solo visible si el usuario logueado creó esta bomba) */}
                  {usuarioActual && bomba.reportado_por === usuarioActual.id && (
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); eliminarBomba(bomba.id, bomba.nombre); }}
                      disabled={cargandoReporte}
                      title="Borrar bomba del mapa"
                      className="absolute top-2 right-2 text-neutral-500 hover:text-red-500 p-1 bg-neutral-950 rounded z-50 transition-colors pointer-events-auto"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  )}

                  <div className="mb-2 border-b border-neutral-700 pb-2 pr-6">
                    <h3 className="font-bold text-[1.1rem] text-white leading-tight">{bomba.nombre}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-[0.65rem] font-bold uppercase tracking-widest px-1 py-0.5 rounded ${bomba.tipo === 'Dólares' ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400'}`}>
                        {bomba.tipo || 'General'}
                      </span>
                      <span className="text-xs text-[#84cc16] font-mono">📞 {bomba.telefono || 'Sin Nro.'}</span>
                    </div>
                  </div>
                  
                  <div className="mb-4 bg-neutral-950 p-2 rounded border border-neutral-800">
                    <p className="text-xs text-neutral-400 mb-1 font-semibold uppercase">Estatus Reportado</p>
                    <p className={`text-base tracking-wide ${getColorPorEstado(bomba.estado_actual)}`}>● {bomba.estado_actual}</p>
                    <p className="text-[0.7rem] text-neutral-500 mt-1">⏱️ {tiempoRelativo(bomba.ultima_actualizacion)}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-neutral-700 pointer-events-auto">
                    <p className="text-xs font-bold text-neutral-300 mb-2 text-center">¿Estás en esta bomba?</p>
                    <div className="flex flex-col gap-2 relative z-50">
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); reportarEstatus(bomba.id, 'Surtiendo'); }} disabled={cargandoReporte} className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-3 px-3 rounded-lg shadow-lg active:scale-95">¡ESTÁN SURTIENDO!</button>
                      <div className="flex gap-2 w-full">
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); reportarEstatus(bomba.id, 'Cerrada'); }} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[0.7rem] font-bold py-2.5 rounded-lg active:scale-95 uppercase">Cerrada</button>
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); reportarEstatus(bomba.id, 'Solo Gasoil'); }} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white text-[0.7rem] font-bold py-2.5 rounded-lg active:scale-95 uppercase">Gasoil</button>
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {!modoAgregar && (
        <div className="absolute bottom-6 right-6 z-[2000] flex flex-col items-end gap-3 pointer-events-none">
          
          {mostrarBujia && (
            <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-2xl rounded-br-none shadow-2xl max-w-[250px] animate-fade-in pointer-events-auto relative">
              <button onClick={() => setMostrarBujia(false)} className="absolute top-2 right-2 text-neutral-500 hover:text-white">✕</button>
              <h4 className="text-[#84cc16] font-bold text-sm mb-1">BujÍA dice:</h4>
              <p className="text-sm text-neutral-300 italic">"{mensajeBujia()}"</p>
            </div>
          )}

          <button 
            onClick={() => setMostrarBujia(!mostrarBujia)}
            className="pointer-events-auto bg-[#111] border-2 border-[#84cc16] w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(132,204,22,0.3)] hover:scale-105 active:scale-95 transition-all overflow-hidden"
          >
            <span className="text-2xl">🤖</span>
          </button>
        </div>
      )}

      {modoAgregar && !mostrarFormNuevo && (
        <div className="absolute bottom-10 left-0 right-0 z-[2000] px-6">
          <button onClick={() => setMostrarFormNuevo(true)} className="w-full bg-[#84cc16] text-black font-extrabold text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(132,204,22,0.4)] active:scale-95">¡Agregar aquí!</button>
        </div>
      )}

      {mostrarFormNuevo && (
        <div className="absolute inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Nueva Estación</h2>
            
            <div className="mb-4">
              <label className="text-xs text-neutral-400 font-bold uppercase mb-1 block">Nombre</label>
              <input type="text" value={nuevaBombaNombre} onChange={(e) => setNuevaBombaNombre(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-white focus:border-[#84cc16] focus:outline-none" placeholder="Ej. Bomba Los Cedros"/>
            </div>

            <div className="mb-4">
              <label className="text-xs text-neutral-400 font-bold uppercase mb-2 block">Tipo de Bomba</label>
              <div className="flex gap-2">
                <button onClick={() => setNuevaBombaTipo('Dólares')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${nuevaBombaTipo === 'Dólares' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>💵 Dólares</button>
                <button onClick={() => setNuevaBombaTipo('Subsidiada')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${nuevaBombaTipo === 'Subsidiada' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>🇻🇪 Subsidiada</button>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs text-neutral-400 font-bold uppercase mb-2 block">Estatus Actual</label>
              <div className="flex gap-2">
                <button onClick={() => setNuevaBombaEstatus('Surtiendo')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${nuevaBombaEstatus === 'Surtiendo' ? 'bg-green-600 text-white border-2 border-green-400' : 'bg-neutral-800 text-neutral-400'}`}>Surtiendo</button>
                <button onClick={() => setNuevaBombaEstatus('Cerrada')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${nuevaBombaEstatus === 'Cerrada' ? 'bg-red-600 text-white border-2 border-red-400' : 'bg-neutral-800 text-neutral-400'}`}>Cerrada</button>
                <button onClick={() => setNuevaBombaEstatus('Solo Gasoil')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${nuevaBombaEstatus === 'Solo Gasoil' ? 'bg-orange-500 text-white border-2 border-orange-300' : 'bg-neutral-800 text-neutral-400'}`}>Gasoil</button>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setMostrarFormNuevo(false)} className="flex-1 bg-neutral-800 text-white py-3 rounded-xl font-bold active:scale-95">Cancelar</button>
              <button onClick={guardarNuevaBomba} disabled={cargandoReporte} className="flex-1 bg-[#84cc16] text-black py-3 rounded-xl font-bold active:scale-95">{cargandoReporte ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}