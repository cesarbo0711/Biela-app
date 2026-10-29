import { useState } from 'react';
import { supabase } from '../supabase';

export default function ModalSurtirGasolina({ motoId, userId, onClose, onAnotado }) {
  const [litros, setLitros] = useState('');
  const [precioDolares, setPrecioDolares] = useState('');
  const [kilometrajeActual, setKilometrajeActual] = useState('');
  const [notas, setNotas] = useState('');
  
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    // Validación básica
    if (!litros || !precioDolares || !kilometrajeActual) {
      setError("Pana, llena todos los números obligatorios.");
      setCargando(false);
      return;
    }

    try {
      const { error: dbError } = await supabase
        .from('registro_gasolina')
        .insert({
          user_id: userId,
          moto_id: motoId,
          litros: parseFloat(litros),
          precio_dolares: parseFloat(precioDolares),
          kilometraje: parseFloat(kilometrajeActual),
          notas: notas || 'Tanque full'
        });

      if (dbError) throw dbError;

      // Éxito: Limpiamos y cerramos
      setLitros('');
      setPrecioDolares('');
      setKilometrajeActual('');
      setNotas('');
      
      // Llamamos al callback para que el Garaje sepa que se anotó y muestre el Toast verde
      if (onAnotado) onAnotado();
      
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (err) {
      console.error("Error guardando gasolina:", err);
      setError("Epa, hubo un pelón guardando el registro. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1a1a1a] w-11/12 max-w-md rounded-2xl p-6 border border-[#2a2a2a] shadow-2xl relative animate-slide-up">
        
        {/* Botón Cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#84cc16] p-2 rounded-full text-black">
            {/* Ícono de Bomba de Gasolina */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="22" x2="21" y2="22"></line>
              <line x1="4" y1="9" x2="20" y2="9"></line>
              <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path>
              <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Surtir Gasolina</h3>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/50 border border-red-500 text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Litros</label>
              <input 
                type="number" 
                step="0.01"
                value={litros}
                onChange={(e) => setLitros(e.target.value)}
                placeholder="Ej: 5.5"
                className="p-3 rounded-xl border border-gray-700 bg-[#2a2a2a] text-white focus:outline-none focus:border-[#84cc16]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Costo ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={precioDolares}
                onChange={(e) => setPrecioDolares(e.target.value)}
                placeholder="Ej: 2.75"
                className="p-3 rounded-xl border border-gray-700 bg-[#2a2a2a] text-white focus:outline-none focus:border-[#84cc16]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kilometraje Actual</label>
            <input 
              type="number" 
              value={kilometrajeActual}
              onChange={(e) => setKilometrajeActual(e.target.value)}
              placeholder="¿Qué dice el tablero ahorita?"
              className="p-3 rounded-xl border border-gray-700 bg-[#2a2a2a] text-white focus:outline-none focus:border-[#84cc16]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notas (Opcional)</label>
            <textarea 
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Bomba Los Alpes, sin cola..."
              rows="2"
              className="p-3 rounded-xl border border-gray-700 bg-[#2a2a2a] text-white focus:outline-none focus:border-[#84cc16] resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            className={`mt-2 w-full p-4 rounded-xl font-bold text-black transition-all ${
              cargando 
                ? 'bg-gray-500 cursor-not-allowed' 
                : 'bg-[#84cc16] hover:bg-[#65a30d] active:scale-95'
            }`}
          >
            {cargando ? 'Anotando...' : 'Guardar Recarga'}
          </button>
        </form>
      </div>
    </div>
  );
}