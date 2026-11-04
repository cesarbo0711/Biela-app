import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabase'; 
import { useNavigate } from 'react-router-dom';

// Coordenadas por defecto (San Juan de los Morros)
const defaultCenter = [9.9115, -67.3538];

export default function MapaGasolina() {
  const navigate = useNavigate();
  const [estaciones, setEstaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [cargandoReporte, setCargandoReporte] = useState(false);

  useEffect(() => {
    verificarUsuario();
    cargarEstaciones();
  }, []);

  const verificarUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUsuarioActual(user);
  };

  const cargarEstaciones = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('estaciones_servicio')
      .select('*');

    if (error) {
      console.error("Error cargando bombas:", error.message);
    } else {
      setEstaciones(data || []);
    }
    setCargando(false);
  };

  const reportarEstatus = async (estacionId, nuevoEstado) => {
    if (!usuarioActual) {
      alert("Debes iniciar sesión para reportar");
      return;
    }

    setCargandoReporte(true);
    const { error } = await supabase
      .from('estaciones_servicio')
      .update({
        estado_actual: nuevoEstado,
        ultima_actualizacion: new Date().toISOString(),
        reportado_por: usuarioActual.id
      })
      .eq('id', estacionId);

    setCargandoReporte(false);

    if (error) {
      alert("Hubo un pelón reportando: " + error.message);
    } else {
      alert(`¡Gracias por el reporte, mi pana! Marcada como: ${nuevoEstado}`);
      cargarEstaciones(); 
    }
  };

  const getColorPorEstado = (estado) => {
    switch (estado) {
      case 'Surtiendo': return 'text-green-500 font-bold';
      case 'Cerrada': return 'text-red-500 font-bold';
      case 'Solo Gasoil': return 'text-yellow-500 font-bold';
      default: return 'text-gray-400 font-bold';
    }
  };

  // ESTA FUNCIÓN ES LA CLAVE PARA QUE SE VEAN LOS PUNTOS
  const crearIconoPorEstado = (estado) => {
    let bgColor = 'bg-gray-500';
    let ringColor = 'ring-gray-500';
    
    if (estado === 'Surtiendo') {
      bgColor = 'bg-green-500';
      ringColor = 'ring-green-500';
    } else if (estado === 'Cerrada') {
      bgColor = 'bg-red-500';
      ringColor = 'ring-red-500';
    } else if (estado === 'Solo Gasoil') {
      bgColor = 'bg-yellow-500';
      ringColor = 'ring-yellow-500';
    }

    // Usamos clases estándar de Tailwind garantizadas para mostrar un círculo
    const htmlString = `<div class="w-6 h-6 rounded-full border-2 border-black ${bgColor} shadow-lg ring-4 ${ringColor} ring-opacity-40"></div>`;

    return L.divIcon({
      className: 'bg-transparent border-0', // Evitamos el cuadradito blanco de leaflet
      html: htmlString,
      iconSize: [24, 24],
      iconAnchor: [12, 12], 
      popupAnchor: [0, -12]
    });
  };

  const tiempoRelativo = (fechaISO) => {
    if (!fechaISO) return "Nunca";
    const fecha = new Date(fechaISO);
    const ahora = new Date();
    const difMinutos = Math.floor((ahora - fecha) / 60000);
    
    if (difMinutos < 1) return "Justo ahora";
    if (difMinutos < 60) return `Hace ${difMinutos} min`;
    const difHoras = Math.floor(difMinutos / 60);
    if (difHoras < 24) return `Hace ${difHoras} hr`;
    return `Hace ${Math.floor(difHoras / 24)} días`;
  };

  if (cargando && estaciones.length === 0) {
    return <div className="min-h-screen bg-[#111] text-white flex items-center justify-center">Cargando radar...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[#111] text-white overflow-hidden">
      
      <header className="bg-neutral-950 p-4 flex items-center justify-between border-b border-neutral-800 z-[1000] relative shadow-md">
        <button onClick={() => navigate(-1)} className="text-[#84cc16] hover:text-white transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-white tracking-wide">Radar de Bombas</h1>
        <div className="w-6"></div>
      </header>

      <div className="flex-grow relative z-0">
       <MapContainer 
          center={defaultCenter} 
          zoom={14} 
          className="w-full h-full"
          style={{ filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(85%)' }}
        >
          {/* MAPA BASE GRATUITO (No necesita API KEY) */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {estaciones.map(bomba => (
            <Marker 
              key={bomba.id} 
              position={[bomba.latitud, bomba.longitud]}
              icon={crearIconoPorEstado(bomba.estado_actual)} // USAMOS EL ÍCONO INYECTADO
            >
              <Popup className="biela-dark-popup">
                <div className="p-2 min-w-[220px] bg-neutral-900 text-neutral-200 rounded-lg shadow-2xl -m-4">
                  
                  <div className="mb-2 border-b border-neutral-700 pb-2">
                    <h3 className="font-bold text-[1.1rem] text-white leading-tight">{bomba.nombre}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[0.65rem] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-800 px-1 py-0.5 rounded">
                        {bomba.tipo || 'General'}
                      </span>
                      {/* AQUÍ ESTÁ EL TELÉFONO */}
                      <span className="text-xs text-[#84cc16] font-mono flex items-center gap-1">
                        📞 {bomba.telefono || 'Sin Nro.'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4 bg-neutral-950 p-2 rounded border border-neutral-800">
                    <p className="text-xs text-neutral-400 mb-1 font-semibold uppercase">Estatus Reportado</p>
                    <p className={`text-base tracking-wide ${getColorPorEstado(bomba.estado_actual)}`}>
                      ● {bomba.estado_actual}
                    </p>
                    <p className="text-[0.7rem] text-neutral-500 mt-1 flex items-center gap-1 font-mono">
                      <span>⏱️</span> {tiempoRelativo(bomba.ultima_actualizacion)}
                    </p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-neutral-700">
                    <p className="text-xs font-bold text-neutral-300 mb-2 text-center">¿Estás en esta bomba?</p>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); reportarEstatus(bomba.id, 'Surtiendo'); }}
                        disabled={cargandoReporte}
                        className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2.5 px-3 rounded-md shadow-lg transition-all active:scale-95"
                      >
                        ¡ESTÁN SURTIENDO!
                      </button>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); reportarEstatus(bomba.id, 'Cerrada'); }}
                          disabled={cargandoReporte}
                          className="w-1/2 bg-red-600 hover:bg-red-500 text-white text-[0.65rem] font-bold py-2 px-1 rounded shadow transition-all active:scale-95 uppercase tracking-wide"
                        >
                          Cerrada
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); reportarEstatus(bomba.id, 'Solo Gasoil'); }}
                          disabled={cargandoReporte}
                          className="w-1/2 bg-yellow-500 hover:bg-yellow-400 text-black text-[0.65rem] font-bold py-2 px-1 rounded shadow transition-all active:scale-95 uppercase tracking-wide"
                        >
                          Gasoil
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}