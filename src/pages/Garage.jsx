import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { UploadDropzone } from '../components/UploadDropzone.jsx';

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
    <div className="min-h-screen text-white pb-32 px-4 sm:px-6 max-w-md mx-auto">
      
      {/* =========================================================
          ENCABEZADO: TUS VEHÍCULOS Y BOTÓN AÑADIR
          ========================================================= */}
      <div className="flex items-center justify-between pt-6 mb-12">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Tus Vehículos</h2>
          <p className="text-xs text-neutral-400 font-medium">Gestiona tu flota y mantenimientos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-lime-500 to-lime-600 text-black font-extrabold text-sm px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(132,204,22,0.3)] hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Añadir
        </button>
      </div>

      {motos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 bg-neutral-900/60 border border-neutral-800 rounded-3xl text-center mt-12 backdrop-blur-md">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4 text-neutral-500">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
          </div>
          <p className="text-neutral-300 font-bold mb-2">Aún no tienes vehículos</p>
          <p className="text-xs text-neutral-500 mb-6">Agrega tu primera nave para empezar la bitácora.</p>
          <button className="bg-lime-500 text-black font-extrabold px-6 py-3 rounded-xl hover:bg-lime-400 transition-all" onClick={() => setIsModalOpen(true)}>+ Registrar Moto</button>
        </div>
      ) : (
        /* =========================================================
            LISTA DE VEHÍCULOS (TARJETAS PRO CON EFECTO 3D LIMPIO)
            ========================================================= */
        <div className="flex flex-col gap-24 pt-12">
          {motos.map(moto => (
            <div key={moto.id} className="relative bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800/80 rounded-[2.5pxt] rounded-[2rem] p-6 shadow-2xl backdrop-blur-sm">
              
              {/* BOTÓN ELIMINAR (Discreto arriba a la derecha) */}
              <button 
                onClick={() => { setMotoActiva(moto); setIsDeleteModalOpen(true); }}
                className="absolute top-4 right-4 z-20 bg-neutral-900/80 hover:bg-red-500/20 p-2.5 rounded-full text-neutral-400 hover:text-red-400 transition-all border border-neutral-800 shadow-sm"
                title="Borrar vehículo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>

              {/* IMAGEN FLOTANTE 3D (Sobresale limpiamente sin cortarse) */}
              <div className="absolute -top-24 left-0 right-0 flex justify-center pointer-events-none z-10">
                {moto.imagen_url ? (
                  <img 
                    src={moto.imagen_url} 
                    alt={`${moto.marca} ${moto.modelo}`} 
                    className="w-52 h-40 object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] transition-transform duration-500 hover:scale-105"
                  />
                ) : (
                  <div className="w-36 h-36 bg-neutral-900 rounded-full flex items-center justify-center border-4 border-neutral-800 text-neutral-600 font-bold text-xs shadow-xl">
                    Sin foto
                  </div>
                )}
              </div>

              {/* ESPACIADOR INVISIBLE PARA COMPENSAR LA FOTO FLOTANTE */}
              <div className="h-16"></div>

              {/* MARCA, MODELO Y AÑO */}
              <div className="text-center mb-6">
                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                  {moto.marca} <span className="text-neutral-600 font-bold mx-1">/</span> {moto.modelo}
                </h3>
                <span className="inline-block mt-2 bg-neutral-950 border border-neutral-800 text-lime-400 px-3.5 py-1 rounded-full text-xs font-extrabold tracking-widest shadow-inner">
                  {moto.year || 'N/A'}
                </span>
              </div>

              {/* TARJETAS DE ESTADÍSTICAS (Grid moderno tipo Glassmorphism) */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                
                {/* KILOMETRAJE */}
                <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-3.5 flex flex-col justify-between relative group">
                   <span className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider mb-1">Kilometraje</span>
                   <div className="flex items-baseline gap-1">
                     <span className="text-xl sm:text-2xl font-black text-white tracking-tight">{moto.kilometraje.toLocaleString('en-US')}</span>
                     <span className="text-[10px] text-neutral-400 font-bold">KM</span>
                   </div>
                   
                   {/* BOTÓN EDITAR KM */}
                   <button 
                     onClick={() => { setMotoActiva(moto); setNuevoKm(moto.kilometraje); setIsKmModalOpen(true); }}
                     className="absolute top-3 right-3 bg-neutral-900 p-1.5 rounded-full text-neutral-400 hover:text-lime-400 hover:bg-neutral-800 transition-colors shadow-sm"
                     title="Actualizar Kilometraje"
                   >
                     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                   </button>
                </div>

                {/* ACEITE */}
                <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-3.5 flex flex-col justify-between">
                   <span className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider mb-1">Aceite</span>
                   <span className="text-sm font-black text-white truncate mt-1" title={moto.tipo_aceite}>
                     {moto.tipo_aceite || 'N/A'}
                   </span>
                </div>
                
              </div>

              {/* BOTÓN VER BITÁCORA */}
              <button 
                onClick={() => navigate(`/moto/${moto.id}`)}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-lime-500 border border-neutral-700 hover:border-lime-500 text-white hover:text-black font-extrabold py-3.5 rounded-xl transition-all duration-300 active:scale-95 shadow-md text-sm"
              >
                Ver Bitácora
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================
          MODALES PREMIUM
          ========================================================= */}
      
      {/* MODAL 1: REGISTRAR MOTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-white">Añadir al Garaje</h2>
              <p className="text-xs text-neutral-400 mt-1">Registra los datos de tu vehículo.</p>
            </div>
            <form onSubmit={registrarMoto} className="flex flex-col gap-4">
              <div className="input-group mb-6">
                <UploadDropzone onFileSelect={(imagen_url) => setImagenArchivo(imagen_url)} />
                <label className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-2 text-center margin-top 20px ">Foto de tu Moto</label>
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-neutral-400 uppercase mb-1 block">Marca</label>
                <input type="text" placeholder="ej. Bera" value={marca} onChange={(e) => setMarca(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-lime-500 focus:outline-none" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-extrabold text-neutral-400 uppercase mb-1 block">Modelo</label>
                  <input type="text" placeholder="ej. BR" value={modelo} onChange={(e) => setModelo(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-lime-500 focus:outline-none" />
                </div>
                <div className="w-24">
                  <label className="text-[11px] font-extrabold text-neutral-400 uppercase mb-1 block">Año</label>
                  <input type="text" placeholder="2026" value={year} onChange={(e) => setYear(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-lime-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-extrabold text-neutral-400 uppercase mb-1 block">Kilometraje</label>
                  <input type="number" placeholder="ej. 820" value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-lime-500 focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-extrabold text-neutral-400 uppercase mb-1 block">Aceite</label>
                  <input type="text" placeholder="ej. 20W-50" value={tipoAceite} onChange={(e) => setTipoAceite(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:border-lime-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl text-sm transition-all" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="flex-1 bg-lime-500 hover:bg-lime-400 text-black font-extrabold py-3 rounded-xl text-sm transition-all shadow-lg" disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ACTUALIZAR KM RÁPIDO */}
      {isKmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-xs rounded-3xl p-6 shadow-2xl text-center">
            <h2 className="text-lg font-black text-white mb-4">Ajustar Kilometraje</h2>
            <form onSubmit={actualizarKm} className="flex flex-col gap-4">
              <input type="number" autoFocus value={nuevoKm} onChange={(e) => setNuevoKm(e.target.value)} required className="w-full bg-neutral-950 border-2 border-lime-500 rounded-2xl p-4 text-white text-center text-3xl font-black focus:outline-none shadow-[0_0_20px_rgba(132,204,22,0.2)]" />
              <div className="flex gap-2 mt-2">
                <button type="button" className="flex-1 bg-neutral-800 text-white font-bold py-3 rounded-xl text-sm" onClick={() => setIsKmModalOpen(false)}>Cancelar</button>
                <button type="submit" className="flex-1 bg-lime-500 text-black font-extrabold py-3 rounded-xl text-sm" disabled={cargando}>{cargando ? '...' : 'Actualizar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ELIMINAR MOTO */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-xs rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20 text-red-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h2 className="text-lg font-black text-white mb-1">¿Eliminar vehículo?</h2>
            <p className="text-xs text-neutral-400 mb-6">Se borrará toda la bitácora de forma permanente.</p>
            <div className="flex gap-2">
              <button type="button" className="flex-1 bg-neutral-800 text-white font-bold py-3 rounded-xl text-sm" onClick={() => { setIsDeleteModalOpen(false); setMotoActiva(null); }}>Cancelar</button>
              <button type="button" className="flex-1 bg-red-600 text-white font-extrabold py-3 rounded-xl text-sm shadow-lg shadow-red-600/30" onClick={confirmarEliminacion} disabled={cargando}>{cargando ? 'Borrando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}