import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { consultarMecánicoIA } from '../services/gemini';
import './ChatBot.css';

export default function ChatBot({ usuario }) {
  const [mensajes, setMensajes] = useState([
    { 
      rol: 'model', 
      texto: '¡Epa! Soy tu mecánico de confianza. ¿Qué falla tiene la nave hoy? Échame el cuento o mándame una foto de lo que le duele.' 
    }
  ]);
  const [inputTexto, setInputTexto] = useState('');
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [contextoVehiculo, setContextoVehiculo] = useState('Motocicleta general');
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    async function cargarVehiculo() {
      if (!usuario) return;
      const { data } = await supabase
        .from('motos')
        .select('*')
        .eq('user_id', usuario.id);

      if (data && data.length > 0) {
        const infoMotos = data.map(m => `${m.marca} ${m.modelo} (${m.year}) con ${m.kilometraje} km`).join(', ');
        setContextoVehiculo(`El usuario maneja los siguientes vehículos: ${infoMotos}.`);
      }
    }
    cargarVehiculo();
  }, [usuario]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagenArchivo(file);
      setImagenPreview(URL.createObjectURL(file));
    }
  };

  const quitarImagen = () => {
    setImagenArchivo(null);
    setImagenPreview(null);
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if ((!inputTexto.trim() && !imagenArchivo) || cargando) return;

    let imagenBase64 = null;
    if (imagenArchivo) {
      imagenBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(imagenArchivo);
      });
    }

    const nuevoMensajeUsuario = {
      rol: 'user',
      texto: inputTexto,
      imagen: imagenPreview
    };

    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    setInputTexto('');
    setImagenArchivo(null);
    setImagenPreview(null);
    setCargando(true);

    const respuestaIA = await consultarMecánicoIA(
      nuevoMensajeUsuario.texto || 'Analiza esta imagen y dime qué falla tiene.', 
      imagenBase64, 
      contextoVehiculo
    );

    setMensajes((prev) => [
      ...prev,
      { rol: 'model', texto: respuestaIA }
    ]);
    setCargando(false);
  };

  return (
    <div className="chatbot-container fade-in">
      <header className="chatbot-header">
        <div className="bot-avatar">🔧</div>
        <div>
          <h2>Taller Mecánico IA</h2>
          <span className="bot-status">● En línea (Especialista en ruta)</span>
        </div>
      </header>

      <div className="chatbot-messages">
        {mensajes.map((msg, index) => (
          <div key={index} className={`chat-bubble-wrapper ${msg.rol === 'user' ? 'user' : 'model'}`}>
            <div className="chat-bubble">
              {msg.imagen && <img src={msg.imagen} alt="Evidencia" className="chat-img-preview" />}
              <p>{msg.texto}</p>
            </div>
          </div>
        ))}

        {cargando && (
          <div className="chat-bubble-wrapper model">
            <div className="chat-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {imagenPreview && (
        <div className="preview-container">
          <img src={imagenPreview} alt="Preview" />
          <button type="button" onClick={quitarImagen} className="btn-remove-img">✕</button>
        </div>
      )}

      <form onSubmit={enviarMensaje} className="chatbot-input-form">
        <label className="btn-attach" title="Adjuntar foto de la falla">
          📷
          <input type="file" accept="image/*" onChange={handleImagenChange} style={{ display: 'none' }} />
        </label>
        
        <input 
          type="text" 
          placeholder="Escribe tu problema o duda mecánica..." 
          value={inputTexto} 
          onChange={(e) => setInputTexto(e.target.value)}
          className="chat-input"
        />

        <button type="submit" className="btn-send" disabled={cargando}>
          ➤
        </button>
      </form>
    </div>
  );
}