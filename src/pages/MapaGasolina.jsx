import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabase'; 
import { useNavigate } from 'react-router-dom';

// Arreglo temporal de los iconos por defecto de Leaflet (problema común en React)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

  // Función para hacer Crowdsourcing y actualizar el estatus
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
      cargarEstaciones(); // Recargar los datos del mapa
    }
  };

  // Helper para el color según el estado del texto del popup
  const getColorPorEstado = (estado) => {
    switch (estado) {
      case 'Surtiendo': return 'text-green-500 font-bold';
      case 'Cerrada': return 'text-red-500 font-bold';
      case 'Solo Gasoil': return 'text-yellow-500 font-bold';
      default: return 'text-gray-400 font-bold';
    }
  };

  // NUEVA FUNCIÓN MEJORADA: Crea un ícono de mapa GRANDE, visible y anclado correctamente
  const crearIconoPorEstado = (estado) => {
    let colorFondo = 'bg-gray-500'; 
    let efectoLatido = '';
    
    if (estado === 'Surtiendo') {
      colorFondo = 'bg-green-500';
      efectoLatido = 'animate-pulse'; // Le da vida solo a las que surten
    }
    if (estado === 'Cerrada') colorFondo = 'bg-red-500';
    if (estado === 'Solo Gasoil') colorFondo = 'bg-yellow-500';

    return L.divIcon({
      className: 'custom-div-icon', // Quitamos márgenes/bordes base de Leaflet
      // 1. Aumenté el tamaño a w-10 h-10 (40px)
      // 2. Modifiqué la estructura HTML para que el anclaje sea preciso
      html: `
        <div class="relative flex items-center justify-center w-[40px] h-[40px]">
          <div class="absolute w-10 h-10 ${colorFondo} ${efectoLatido} opacity-40 rounded-full"></div>
          <div class="z-10 ${colorFondo} w-6 h-6 rounded-full border-[3px] border-[#111] shadow-[0_0_10px_rgba(0,0,0,0.9)]"></div>
        </div>
      `,
      iconSize: [40, 40], // Tamaño real del bloque HTML total
      iconAnchor: [20, 20], // El centro del círculo de 40x40 es (20,20)
      popupAnchor: [0, -20] // El globo sale justo 20px arriba del centro
    });
  };

  // Helper para mostrar "Hace X min"
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
      
      {/* HEADER TIPO BIELA */}
      <header className="bg-neutral-950 p-4 flex items-center justify-between border-b border-neutral-800 z-[1000] relative shadow-md">
        <button onClick={() => navigate(-1)} className="text-[#84cc16] hover:text-white transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-white tracking-wide">Radar de Bombas</h1>
        <div className="w-6"></div> {/* Spacer */}
      </header>

      {/* CONTENEDOR DEL MAPA */}
      <div className="flex-grow relative z-0">
       <MapContainer 
          center={defaultCenter} 
          zoom={14} 
          className="w-full h-full"
          style={{ filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(85%)' }}
        >
          {/* TileLayer de OpenStreetMap (100% Libre y gratuito) */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Renderizamos los pines personalizados */}
          {estaciones.map(bomba => (
            <Marker 
              key={bomba.id} 
              position={[bomba.latitud, bomba.longitud]}
              icon={crearIconoPorEstado(bomba.estado_actual)}
            >
              {/* Le inyecté estilos oscuros forzados al Popup nativo de Leaflet */}
              <Popup className="biela-dark-popup">
                <div className="p-2 min-w-[220px] bg-neutral-900 text-neutral-200 rounded-lg shadow-2xl -m-4">
                  
                  {/* Título y Tipo */}
                  <div className="mb-2 border-b border-neutral-700 pb-2">
                    <h3 className="font-bold text-[1.1rem] text-white leading-tight">{bomba.nombre}</h3>
                    <span className="text-[0.65rem] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-800 px-1 py-0.5 rounded">
                      {bomba.tipo || 'General'}
                    </span>
                  </div>
                  
                  {/* Estatus Actual */}
                  <div className="mb-4 bg-neutral-950 p-2 rounded border border-neutral-800">
                    <p className="text-xs text-neutral-400 mb-1 font-semibold uppercase">Estatus Reportado</p>
                    <p className={`text-base tracking-wide ${getColorPorEstado(bomba.estado_actual)}`}>
                      ● {bomba.estado_actual}
                    </p>
                    <p className="text-[0.7rem] text-neutral-500 mt-1 flex items-center gap-1 font-mono">
                      <span>⏱️</span> {tiempoRelativo(bomba.ultima_actualizacion)}
                    </p>
                  </div>

                  {/* Botones de Crowdsourcing */}
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