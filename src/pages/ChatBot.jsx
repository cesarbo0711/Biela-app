import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUp,
  Bot,
  Camera,
  ClipboardCheck,
  Gauge,
  PhoneCall,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { supabase } from '../supabase';
import './ChatBot.css';

const EMERGENCIAS = [
  'No prende / Sin chispa',
  'Se recalienta / Humo',
  'Caucho espichado / Rin',
  'Cadena partida / Trancada',
  'Falla de frenos',
  'Me quedé sin gasolina',
];

const ACCIONES_RAPIDAS = [
  { label: 'Anotar cambio de aceite', Icon: ClipboardCheck, texto: 'Quiero anotar un cambio de aceite en mi moto.' },
  { label: '¿Cada cuánto cambio la bujía?', Icon: Sparkles, texto: '¿Cada cuánto debo cambiar la bujía de mi moto?' },
  { label: 'La moto pierde fuerza al acelerar', Icon: Gauge, texto: 'La moto pierde fuerza al acelerar, ¿qué reviso primero?' },
  {
    label: 'Revisar foto de una pieza',
    Icon: Camera,
    texto: 'Revisa esta foto de una pieza y dime qué falla tiene.',
    conFoto: true,
  },
];

const GREETING = {
  rol: 'model',
  texto: '¡Épale! Soy BujIA, tu mecánico de confianza. Cuéntame qué le pasa a la nave o mándame una foto y lo revisamos.',
};

export default function ChatBot({ usuario }) {
  const navigate = useNavigate();
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
  const [modoEmergencia, setModoEmergencia] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const archivoRef = useRef(null);

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
    setModoEmergencia(false);
    quitarImagen();
  };

  const enviarTexto = async (texto, imagenB64 = null, preview = null, esEmergencia = false) => {
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
          esEmergencia,
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

  const enviarReporteEmergencia = (texto) => {
    if (cargando) return;
    setModoEmergencia(true);
    enviarTexto(texto, null, null, true);
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
    await enviarTexto(inputTexto, imagenBase64, preview, modoEmergencia);
  };

  const usarSugerencia = (texto) => {
    if (cargando) return;
    setInputTexto(texto);
  };

  const usarAccionRapida = ({ texto, conFoto }) => {
    usarSugerencia(texto);
    if (conFoto) archivoRef.current?.click();
    else inputRef.current?.focus();
  };

  const nombreMotoActiva = contextoVehiculo === 'Motocicleta general'
    ? 'Motocicleta general'
    : contextoVehiculo
      .replace('El usuario maneja los siguientes vehículos: ', '')
      .split(',')[0];

  const showSuggestions = mensajes.length <= 1 && !cargando && !modoEmergencia;

  return (
    <div className="chatbot-container fade-in">
      <div className="chatbot-shell">
        <header className="chatbot-header gpane backdrop-blur-md">
          <div className="chatbot-brand">
            <span className="chatbot-brand-icon"><Bot size={18} strokeWidth={1.9} /></span>
            <div className="chatbot-brand-copy">
              <h1>BujIA</h1>
              <span className="chatbot-moto-pill">
                <span className="chatbot-pulse-dot" aria-hidden="true" />
                {nombreMotoActiva} • En línea
              </span>
            </div>
          </div>

          <div className="chatbot-header-actions">
            <button
              type="button"
              className={`chatbot-icon-button${modoEmergencia ? ' is-active' : ''}`}
              onClick={() => setModoEmergencia((valor) => !valor)}
              aria-pressed={modoEmergencia}
              aria-label="Activar reporte de emergencia"
              title="Reporte de emergencia"
            >
              <AlertTriangle size={17} strokeWidth={1.9} />
            </button>
            <button
              type="button"
              className="chatbot-icon-button"
              onClick={limpiarConversacion}
              aria-label="Reiniciar conversación"
              title="Reiniciar conversación"
            >
              <RotateCcw size={17} strokeWidth={1.9} />
            </button>
          </div>
        </header>

        {modoEmergencia && (
          <section className="chat-emergency-panel gpane" aria-label="Reportes rápidos de emergencia">
            <p className="chat-emergency-title">
              <AlertTriangle size={14} strokeWidth={2} /> Reporte rápido · BujIA responde en 3 pasos
            </p>
            <div className="chat-emergency-chips">
              {EMERGENCIAS.map((falla) => (
                <button
                  key={falla}
                  type="button"
                  className="chat-emergency-chip"
                  disabled={cargando}
                  onClick={() => enviarReporteEmergencia(falla)}
                >
                  {falla}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="chat-emergency-action"
              onClick={() => navigate('/tiendas')}
            >
              <PhoneCall size={16} strokeWidth={2} /> Buscar grúa o cauchera cercana
            </button>
          </section>
        )}

        <main className="chatbot-messages" role="log" aria-live="polite">
          {showSuggestions ? (
            <section className="chat-welcome" aria-label="Bienvenida de BujIA">
              <span className="chat-welcome-emblem gpane"><Bot size={26} strokeWidth={1.7} /></span>
              <h2>¿Qué revisamos hoy en tu moto?</h2>
              <p>Cuéntame el síntoma o envía una foto. Te guío paso a paso.</p>
              <div className="chat-quick-grid">
                {ACCIONES_RAPIDAS.map(({ label, Icon, texto, conFoto }) => (
                  <button
                    key={label}
                    type="button"
                    className="chat-quick-card gpane"
                    onClick={() => usarAccionRapida({ texto, conFoto })}
                    disabled={cargando}
                  >
                    <Icon size={18} strokeWidth={1.9} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            mensajes.map((msg, index) => (
              <div
                key={index}
                className={`chat-message-row ${msg.rol === 'user' ? 'user' : 'model'}`}
              >
                {msg.rol === 'model' && (
                  <span className="chat-message-avatar"><Bot size={15} strokeWidth={2} /></span>
                )}
                <div className={`chat-message-surface ${msg.rol} ${msg.rol === 'user' ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}`}>
                  {msg.imagen && <img src={msg.imagen} alt="Evidencia" className="chat-img-preview" />}
                  <p>{msg.texto}</p>
                </div>
              </div>
            ))
          )}

          {cargando && (
            <div className="chat-message-row model">
              <span className="chat-message-avatar"><Bot size={15} strokeWidth={2} /></span>
              <div className="chat-message-surface model chat-typing">
                <span className="chat-typing-dots" aria-hidden="true">
                  <span /><span /><span />
                </span>
                <span>Analizando...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </main>

        <div className="chatbot-composer">
          {errorChat && <div className="chat-error-inline">{errorChat}</div>}

          {imagenPreview && (
            <div className="chat-attachment gpane">
              <img src={imagenPreview} alt="Foto adjunta" />
              <span>Foto lista para analizar</span>
              <button type="button" onClick={quitarImagen} aria-label="Quitar imagen">
                <X size={15} strokeWidth={2} />
              </button>
            </div>
          )}

          <form onSubmit={enviarMensaje} className="chat-compose-form gpane rounded-full backdrop-blur-md">
            <input
              ref={archivoRef}
              type="file"
              accept="image/*"
              onChange={handleImagenChange}
              className="chat-file-input"
            />
            <button
              type="button"
              className="chat-attach-button"
              onClick={() => archivoRef.current?.click()}
              aria-label="Adjuntar foto de la falla"
              title="Adjuntar foto"
            >
              <Camera size={18} strokeWidth={1.9} />
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Escribe tu consulta o registra un servicio..."
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              className="chat-input text-base"
              enterKeyHint="send"
            />
            <button
              type="submit"
              className="chat-send-button"
              disabled={cargando}
              aria-label="Enviar mensaje"
            >
              <ArrowUp size={18} strokeWidth={2.4} />
            </button>
          </form>

          <p className="chat-disclaimer">Asistente preventivo IA • Ante fallas críticas, consulta un taller.</p>
        </div>
      </div>
    </div>
  );
}
