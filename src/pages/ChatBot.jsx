import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import './ChatBot.css';

export default function ChatBot({ usuario }) {
  const [mensajes, setMensajes] = useState([
    { 
      rol: 'model', 
      texto: '¡Epa! Soy BujIA, tu mecánico de confianza. ¿Qué falla tiene la nave hoy? Échame el cuento o mándame una foto de lo que le duele.' 
    }
  ]);

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [motoId, setMotoId] = useState(null); // <-- NUEVO ESTADO PARA IDENTIFICAR LA MOTO ACTIVA

  // BLOQUE 1: RECUPERAR EL CHAT SI NO HAN PASADO 30 MINUTOS
  useEffect(() => {
    const chatGuardado = localStorage.getItem('bujia_historial');
    if (chatGuardado) {
      try {
        const { historial, ultimaActividad } = JSON.parse(chatGuardado);
        const tiempoActual = new Date().getTime();
        const diferenciaMinutos = (tiempoActual - ultimaActividad) / (1000 * 60);

        if (diferenciaMinutos < 30) {
          setMensajes(historial);
        } else {
          localStorage.removeItem('bujia_historial');
        }
      } catch (error) {
        localStorage.removeItem('bujia_historial');
      }
    }
  }, []);

  // BLOQUE 2: GUARDAR CADA MENSAJE NUEVO CON LA HORA EXACTA
  useEffect(() => {
    if (mensajes.length > 0) {
      const datosParaGuardar = {
        historial: mensajes,
        ultimaActividad: new Date().getTime()
      };
      localStorage.setItem('bujia_historial', JSON.stringify(datosParaGuardar));
    }
  }, [mensajes]);

  // BLOQUE 3: BUSCAR EL NOMBRE DEL USUARIO EN SUPABASE
  useEffect(() => {
    async function obtenerNombre() {
      if (!usuario) return;
      const { data } = await supabase
        .from('perfiles')
        .select('nombre')
        .eq('id', usuario.id)
        .maybeSingle();

      if (data && data.nombre) {
        setNombreUsuario(data.nombre);
      }
    }
    obtenerNombre();
  }, [usuario]);

  const [inputTexto, setInputTexto] = useState('');
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [contextoVehiculo, setContextoVehiculo] = useState('Motocicleta general');

  const chatEndRef = useRef(null);

  // BLOQUE 4: CARGAR EL VEHÍCULO Y SU ID
// BLOQUE 4: CARGAR EL VEHÍCULO Y SU ID
  useEffect(() => {
    async function cargarVehiculo() {
      if (!usuario) return;
      console.log("Buscando motos para el usuario:", usuario.id); // <-- Rastreador 1

      const { data, error } = await supabase
        .from('motos')
        .select('*')
        .eq('user_id', usuario.id);

      if (error) {
        console.error("Error buscando motos en el ChatBot:", error.message);
        return;
      }

      console.log("Motos encontradas para BujÍA:", data); // <-- Rastreador 2

      if (data && data.length > 0) {
        setMotoId(data[0].id); // <-- GUARDAMOS EL ID DE LA PRIMERA MOTO
        const infoMotos = data
          .map(m => `${m.marca} ${m.modelo} (${m.year}) con ${m.kilometraje} km`)
          .join(', ');
        setContextoVehiculo(`El usuario maneja los siguientes vehículos: ${infoMotos}.`);
      } else {
        console.warn("BujÍA no vio ninguna moto en la tabla.");
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

    // Convertir imagen a Base64 si existe
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
      texto: inputTexto || 'Analiza esta imagen y dime qué falla tiene.',
      imagen: imagenPreview
    };

    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);

    const textoAEnviar = inputTexto || 'Analiza esta imagen y dime qué falla tiene.';
    const historialAEnviar = mensajes;
    const imagenAEnviar = imagenBase64;

    setInputTexto('');
    setImagenArchivo(null);
    setImagenPreview(null);
    setCargando(true);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promptUsuario: textoAEnviar,
          contextoVehiculo: contextoVehiculo,
          historial: historialAEnviar,
          imagenBase64: imagenAEnviar,
          nombreUsuario: nombreUsuario,
          motoId: motoId // <-- ENVIAMOS EL ID DE LA MOTO AL BACKEND PARA QUE PUEDA REGISTRAR EL SERVICIO
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el servidor');
      }

      setMensajes((prev) => [
        ...prev,
        { rol: 'model', texto: data.texto || 'Epa, la nave quedó muda.' }
      ]);
    } catch (error) {
      console.error('Error al contactar a BujIA:', error);
      setMensajes((prev) => [
        ...prev,
        { 
          rol: 'model', 
          texto: 'Epa, pana, se me cayó el sistema un momento. ¿Puedes repetirme la pregunta?' 
        }
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="chatbot-container fade-in">
      <header className="chatbot-header">
        <div className="bot-avatar">
          <img
            src="https://api.dicebear.com/10.x/bottts/svg?backgroundColor=&textureProbability=30&eyesVariant=frame2&headVariant=round02&mouthVariant=smile01&sidesVariant=round&textureVariant=dirty01&seed=mdf9n8af"
            alt="avatar" 
          />
        </div>
        <div>
          <h2>Taller Mecánico (BujIA)</h2>
          <span className="bot-status">● En línea</span>
        </div>
      </header>

      <div className="chatbot-messages">
        {mensajes.map((msg, index) => (
          <div
            key={index}
            className={`chat-bubble-wrapper ${msg.rol === 'user' ? 'user' : 'model'}`}
          >
            <div className="chat-bubble">
              {msg.imagen && (
                <img src={msg.imagen} alt="Evidencia" className="chat-img-preview" />
              )}
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
          <button type="button" onClick={quitarImagen} className="btn-remove-img">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={enviarMensaje} className="chatbot-input-form">
        <label className="btn-attach" title="Adjuntar foto de la falla">
          📷
          <input
            type="file"
            accept="image/*"
            onChange={handleImagenChange}
            style={{ display: 'none' }}
          />
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