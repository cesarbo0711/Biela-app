import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import './ChatBot.css';

const SUGGESTED = [
  'Mi moto no quiere encender, ¿qué reviso primero?',
  '¿Cada cuánto debo ajustar la cadena?',
  'Escucho un ruido raro en el motor, ¿puede ser grave?',
];

const GREETING = {
  rol: 'model',
  texto: '¡Épale! Soy BujIA, tu mecánico de confianza. Cuéntame qué le pasa a la nave o mándame una foto y lo revisamos.',
};

export default function ChatBot({ usuario }) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [motoId, setMotoId] = useState(null);

  const [mensajes, setMensajes] = useState(() => {
    const chatGuardado = localStorage.getItem('bujia_historial');
    if (chatGuardado) {
      try {
        const { historial, ultimaActividad } = JSON.parse(chatGuardado);
        const diferenciaMinutos = (new Date().getTime() - ultimaActividad) / (1000 * 60);
        if (diferenciaMinutos < 30 && Array.isArray(historial) && historial.length > 0) {
          return historial;
        }
      } catch {
        localStorage.removeItem('bujia_historial');
      }
    }
    localStorage.removeItem('bujia_historial');
    return [{ ...GREETING }];
  });

  useEffect(() => {
    if (mensajes.length > 0) {
      localStorage.setItem('bujia_historial', JSON.stringify({
        historial: mensajes,
        ultimaActividad: new Date().getTime(),
      }));
    }
  }, [mensajes]);

  useEffect(() => {
    async function obtenerNombre() {
      if (!usuario) return;
      const { data } = await supabase
        .from('perfiles')
        .select('nombre')
        .eq('id', usuario.id)
        .maybeSingle();
      if (data?.nombre) setNombreUsuario(data.nombre);
    }
    obtenerNombre();
  }, [usuario]);

  const [inputTexto, setInputTexto] = useState('');
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [contextoVehiculo, setContextoVehiculo] = useState('Motocicleta general');
  const [errorChat, setErrorChat] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    async function cargarVehiculo() {
      if (!usuario) return;
      const { data, error } = await supabase
        .from('motos')
        .select('*')
        .eq('user_id', usuario.id);

      if (error) {
        console.error('Error buscando motos en ChatBot:', error.message);
        return;
      }

      if (data && data.length > 0) {
        setMotoId(data[0].id);
        const infoMotos = data
          .map((m) => `${m.marca} ${m.modelo} (${m.year}) con ${m.kilometraje} km`)
          .join(', ');
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

  const limpiarConversacion = () => {
    localStorage.removeItem('bujia_historial');
    setMensajes([{ ...GREETING }]);
    setErrorChat('');
    setInputTexto('');
    quitarImagen();
  };

  const enviarTexto = async (texto, imagenB64 = null, preview = null) => {
    const textoLimpio = (texto || '').trim();
    if ((!textoLimpio && !imagenB64) || cargando) return;

    const nuevoMensajeUsuario = {
      rol: 'user',
      texto: textoLimpio || 'Analiza esta imagen y dime qué falla tiene.',
      ...(preview ? { imagen: preview } : {}),
    };

    const historialAEnviar = mensajes;
    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    setInputTexto('');
    setImagenArchivo(null);
    setImagenPreview(null);
    setCargando(true);
    setErrorChat('');

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptUsuario: nuevoMensajeUsuario.texto,
          contextoVehiculo,
          historial: historialAEnviar,
          imagenBase64: imagenB64,
          nombreUsuario,
          motoId,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status} al contactar a BujIA`);
      }

      const textoRespuesta = typeof data.texto === 'string' && data.texto.trim()
        ? data.texto
        : 'No recibí una respuesta clara. Intenta preguntarme de otra forma.';

      setMensajes((prev) => [...prev, { rol: 'model', texto: textoRespuesta }]);
    } catch (error) {
      console.error('Error al contactar a BujIA:', error);
      const msg = error?.message || 'No pude conectar con el taller.';
      setErrorChat(msg);
      setMensajes((prev) => [
        ...prev,
        {
          rol: 'model',
          texto: 'Tuve un problema conectando con el taller. Revisa tu conexión e inténtalo de nuevo en un momento.',
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if ((!inputTexto.trim() && !imagenArchivo) || cargando) return;

    let imagenBase64 = null;
    let preview = null;
    if (imagenArchivo) {
      preview = imagenPreview;
      imagenBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(imagenArchivo);
      });
    }
    await enviarTexto(inputTexto, imagenBase64, preview);
  };

  const usarSugerencia = (texto) => {
    if (cargando) return;
    setInputTexto(texto);
  };

  const showSuggestions = mensajes.length <= 1 && !cargando;

  return (
    <div className="chatbot-container fade-in">
      <header className="chatbot-header">
        <div className="bot-avatar">
          <img
            src="https://api.dicebear.com/10.x/bottts/svg?backgroundColor=&textureProbability=30&eyesVariant=frame2&headVariant=round02&mouthVariant=smile01&sidesVariant=round&textureVariant=dirty01&seed=mdf9n8af"
            alt="BujIA"
          />
        </div>
        <div className="chatbot-header-info">
          <h2>Taller Mecánico (BujIA)</h2>
          <span className="bot-status">● En línea</span>
        </div>
        <button type="button" className="btn-clear-chat" onClick={limpiarConversacion} title="Limpiar conversación">
          Limpiar
        </button>
      </header>

      <div className="chat-safety-banner">
        Asistente preventivo IA • Ante fallas críticas de frenos o motor, consulta un taller certificado.
      </div>

      <div className="chatbot-messages">
        {mensajes.map((msg, index) => (
          <div
            key={index}
            className={`chat-bubble-wrapper ${msg.rol === 'user' ? 'user' : 'model'}`}
          >
            <div className="chat-bubble">
              {msg.imagen && <img src={msg.imagen} alt="Evidencia" className="chat-img-preview" />}
              <p>{msg.texto}</p>
            </div>
          </div>
        ))}

        {showSuggestions && (
          <div className="chat-suggestions">
            {SUGGESTED.map((s) => (
              <button key={s} type="button" className="chat-suggestion-chip" onClick={() => usarSugerencia(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {cargando && (
          <div className="chat-bubble-wrapper model">
            <div className="chat-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {errorChat && <div className="chat-error-inline">{errorChat}</div>}

      {imagenPreview && (
        <div className="preview-container">
          <img src={imagenPreview} alt="Preview" />
          <button type="button" onClick={quitarImagen} className="btn-remove-img" aria-label="Quitar imagen">
            ×
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
          placeholder="Escribe tu duda mecánica..."
          value={inputTexto}
          onChange={(e) => setInputTexto(e.target.value)}
          className="chat-input"
          enterKeyHint="send"
        />

        <button type="submit" className="btn-send" disabled={cargando} aria-label="Enviar mensaje">
          ➤
        </button>
      </form>
    </div>
  );
}
