import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabase'; // Ajusta esta ruta según tu proyecto
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

  // Helper para el color según el estado
  const getColorPorEstado = (estado) => {
    switch (estado) {
      case 'Surtiendo': return 'text-green-500 font-bold';
      case 'Cerrada': return 'text-red-500 font-bold';
      case 'Solo Gasoil': return 'text-yellow-500 font-bold';
      default: return 'text-gray-400';
    }
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
    return <div className="min-h-screen bg-[#111] text-white flex items-center justify-center">Cargando mapa...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[#111]">
      
      {/* HEADER TIPO BIELA */}
      <header className="bg-[#1a1a1a] p-4 flex items-center justify-between border-b border-[#2a2a2a] z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="text-[#84cc16] hover:text-white transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-xl font-bold text-white tracking-wide">Radar de Bombas</h1>
        <div className="w-6"></div> {/* Spacer */}
      </header>

      {/* CONTENEDOR DEL MAPA (Ocupa el resto de la pantalla) */}
      <div className="flex-grow relative z-0">
       <MapContainer 
          center={defaultCenter} 
          zoom={14} 
          className="w-full h-full"
          style={{ filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(85%)' }}
        >
          {/* TileLayer Oscuro para mantener el tema de Biela */}
        {/* TileLayer de OpenStreetMap (100% Libre y gratuito) */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Renderizamos los pines por cada estación */}
          {estaciones.map(bomba => (
            <Marker 
              key={bomba.id} 
              position={[bomba.latitud, bomba.longitud]}
            >
              <Popup className="biela-popup">
                <div className="p-1 min-w-[200px]">
                  
                  {/* Título y Tipo */}
                  <div className="mb-2 border-b border-gray-200 pb-2">
                    <h3 className="font-bold text-lg leading-tight">{bomba.nombre}</h3>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {bomba.tipo || 'General'}
                    </span>
                  </div>
                  
                  {/* Estatus Actual */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Estatus:</p>
                    <p className={`text-base ${getColorPorEstado(bomba.estado_actual)}`}>
                      {bomba.estado_actual}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <span>⏱️</span> Reportado {tiempoRelativo(bomba.ultima_actualizacion)}
                    </p>
                  </div>

                  {/* Botones de Crowdsourcing */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-bold text-gray-600 mb-2 text-center">¿Estás ahí? Repórtalo:</p>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => reportarEstatus(bomba.id, 'Surtiendo')}
                        disabled={cargandoReporte}
                        className="w-full bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 px-3 rounded shadow transition-colors"
                      >
                        ¡Están surtiendo!
                      </button>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => reportarEstatus(bomba.id, 'Cerrada')}
                          disabled={cargandoReporte}
                          className="w-1/2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 px-2 rounded shadow transition-colors"
                        >
                          Cerrada
                        </button>
                        <button 
                          onClick={() => reportarEstatus(bomba.id, 'Solo Gasoil')}
                          disabled={cargandoReporte}
                          className="w-1/2 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold py-2 px-2 rounded shadow transition-colors"
                        >
                          Solo Gasoil
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