import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Bot,
  Check,
  ClipboardCheck,
  Fuel,
  Gauge,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { supabase } from '../supabase';
import {
  AVATAR_STYLE_DEFAULT,
  AVATAR_STYLES_SELECTABLE,
  avatarStyleFromUrl,
  buildAvatarUrl,
} from '../utils/avatarStyles';
import './OnboardingModal.css';

const CIUDADES = [
  'San Juan de los Morros, Guárico',
  'Caracas, Distrito Capital',
  'Maracay, Aragua',
  'Valencia, Carabobo',
  'Maracaibo, Zulia',
  'Mérida, Mérida',
  'Barquisimeto, Lara',
  'Puerto Ordaz, Bolívar',
  'Cumaná, Sucre',
  'Barcelona, Anzoátegui',
];

const MODULOS = [
  {
    key: 'garaje',
    label: 'Garaje',
    Icon: Bike,
    title: 'Tu garaje, de un vistazo',
    copy: 'Revisa la salud del aceite sin abrir nada. Cada moto muestra su estado con un punto discreto y sus datos esenciales.',
    tip: 'Toca el lápiz del odómetro para actualizar los kilómetros en dos segundos.',
    chips: [
      { Icon: Gauge, label: 'Odómetro' },
      { Icon: Pencil, label: 'Edición rápida' },
      { Icon: Plus, label: 'Varias motos' },
    ],
  },
  {
    key: 'bitacora',
    label: 'Bitácora y QR',
    Icon: ClipboardCheck,
    title: 'Cada servicio, documentado',
    copy: 'Anota mantenimientos y recargas de gasolina con Km/L. Tu historial se convierte en una Hoja de Vida verificable.',
    tip: 'Un registro completo sostiene mejor precio al momento de vender tu moto.',
    chips: [
      { Icon: QrCode, label: 'Hoja de Vida' },
      { Icon: Fuel, label: 'Km/L' },
      { Icon: ClipboardCheck, label: 'Historial' },
    ],
  },
  {
    key: 'radar',
    label: 'Radar Vial',
    Icon: MapPin,
    title: 'Sabe dónde hay combustible',
    copy: 'Consulta en tiempo real qué estaciones están surtiendo en Dólares, Subsidiada o Gasoil cerca de ti.',
    tip: 'Reporta el estatus que ves: tu aviso ayuda a toda la comunidad motorizada.',
    chips: [
      { Icon: MapPin, label: 'Estaciones' },
      { Icon: Fuel, label: 'Surtiendo' },
      { Icon: Check, label: 'Reportes' },
    ],
  },
  {
    key: 'bujia',
    label: 'BujIA 24/7',
    Icon: Bot,
    title: 'Tu mecánico de bolsillo',
    copy: 'Escribe o envía una foto de la falla. BujIA te guía paso a paso, incluso en el taller o en la vía.',
    tip: 'Prueba: “Anota cambio de aceite a los 12,000 km” y BujIA lo registra por ti.',
    chips: [
      { Icon: Bot, label: 'Texto y foto' },
      { Icon: Sparkles, label: 'Registro automático' },
      { Icon: ClipboardCheck, label: 'Bitácora' },
    ],
  },
];

function crearSemilla() {
  return Math.random().toString(36).substring(2, 10);
}

export default function OnboardingModal({
  usuario,
  perfilInicial = null,
  faseInicial = 'datos',
  onSaved,
  onComplete,
}) {
  const [fase, setFase] = useState(faseInicial);
  const [nombre, setNombre] = useState(perfilInicial?.nombre || '');
  const [residencia, setResidencia] = useState(perfilInicial?.residencia || '');
  const [telefono, setTelefono] = useState(perfilInicial?.telefono || '');
  const [avatarSeed, setAvatarSeed] = useState(perfilInicial?.avatar_seed || crearSemilla());
  const [avatarStyle, setAvatarStyle] = useState(
    avatarStyleFromUrl(perfilInicial?.avatar_url) || AVATAR_STYLE_DEFAULT,
  );
  const [avatarUrlPropia, setAvatarUrlPropia] = useState(
    perfilInicial?.avatar_url && !perfilInicial.avatar_url.includes('api.dicebear.com')
      ? perfilInicial.avatar_url
      : '',
  );
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [indice, setIndice] = useState(0);

  const modulo = MODULOS[indice];
  const ModuloIcon = modulo.Icon;
  const esUltimo = indice === MODULOS.length - 1;
  const avatarUrl = avatarUrlPropia
    || buildAvatarUrl(avatarStyle, avatarSeed || nombre || AVATAR_STYLE_DEFAULT);

  const refrescarAvatar = () => {
    setAvatarSeed(crearSemilla());
    setAvatarUrlPropia('');
  };

  const seleccionarEstilo = (estilo) => {
    setAvatarStyle(estilo);
    setAvatarSeed((semilla) => semilla || crearSemilla());
    setAvatarUrlPropia('');
  };

  const guardarDatos = async (e) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) {
      setError('Escribe tu nombre o apodo para continuar.');
      return;
    }

    if (!usuario?.id) {
      setError('No pudimos identificar tu sesión. Vuelve a ingresar.');
      return;
    }

    setGuardando(true);
    const payload = {
      id: usuario.id,
      nombre: nombre.trim(),
      residencia: residencia.trim(),
      telefono: telefono.trim(),
      avatar_seed: avatarSeed,
      avatar_url: avatarUrl,
      onboarding_completado: true,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error: guardadoError } = await supabase
        .from('perfiles')
        .upsert(payload, { onConflict: 'id' });

      if (guardadoError) throw guardadoError;
      onSaved?.(payload);
      setFase('tour');
    } catch (guardadoError) {
      console.error('Error guardando el perfil:', guardadoError);
      setError('No se pudo guardar tu perfil. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const cerrar = () => onComplete?.();

  return (
    <div
      className="onb-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (fase === 'tour' && e.target === e.currentTarget) cerrar();
      }}
    >
      <div className="onb-shell gpane" role="dialog" aria-modal="true" aria-label="Primer ingreso a Biela">
        {fase === 'tour' && (
          <button type="button" className="onb-close" onClick={cerrar} aria-label="Cerrar guía">
            <X size={17} />
          </button>
        )}

        {fase === 'datos' ? (
          <form onSubmit={guardarDatos} className="onb-form">
            <div className="onb-head">
              <span className="onb-badge">Paso 1 de 2 · Tu perfil</span>
              <h2>Tu taller empieza contigo</h2>
              <p>BujIA te llamará por tu nombre y mostrará tu garaje con tu identidad.</p>
            </div>

            <div className="onb-avatar-row">
              <div className="onb-avatar-preview">
                <img src={avatarUrl} alt="Vista previa del avatar" />
              </div>
              <div className="onb-avatar-controls">
                <div className="onb-style-picker" role="group" aria-label="Estilo del avatar">
                  {AVATAR_STYLES_SELECTABLE.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`onb-style-option${avatarStyle === key && !avatarUrlPropia ? ' is-active' : ''}`}
                      onClick={() => seleccionarEstilo(key)}
                      aria-pressed={avatarStyle === key && !avatarUrlPropia}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button type="button" className="onb-refresh" onClick={refrescarAvatar}>
                  <RefreshCw size={14} strokeWidth={2} /> Generar otro avatar
                </button>
              </div>
            </div>

            <div className="onb-field">
              <label htmlFor="onb-nombre">Nombre o apodo</label>
              <input
                id="onb-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Cómo quieres que te llame BujIA"
                autoComplete="nickname"
                required
              />
            </div>

            <div className="onb-field">
              <label htmlFor="onb-residencia">Ciudad / Estado</label>
              <input
                id="onb-residencia"
                type="text"
                list="onb-ciudades"
                value={residencia}
                onChange={(e) => setResidencia(e.target.value)}
                placeholder="San Juan de los Morros, Guárico"
                autoComplete="address-level2"
              />
              <datalist id="onb-ciudades">
                {CIUDADES.map((ciudad) => (
                  <option key={ciudad} value={ciudad} />
                ))}
              </datalist>
            </div>

            <div className="onb-field">
              <label htmlFor="onb-telefono">Teléfono / WhatsApp <span>Opcional</span></label>
              <input
                id="onb-telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="0414-0000000"
                autoComplete="tel"
              />
            </div>

            {error && <p className="onb-error">{error}</p>}

            <button type="submit" className="onb-primary onb-full" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Continuar al Tour'} <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <div className="onb-tour">
            <div className="onb-head">
              <span className="onb-badge">Tour interactivo · 0{indice + 1} / 04</span>
              <h2>Conoce tu taller digital</h2>
            </div>

            <div className="onb-tabs" role="tablist" aria-label="Módulos de Biela">
              {MODULOS.map(({ key, label, Icon }, i) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={i === indice}
                  className={`onb-tab${i === indice ? ' is-active' : ''}`}
                  onClick={() => setIndice(i)}
                >
                  <Icon size={14} strokeWidth={2} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="onb-tour-card" key={modulo.key}>
              <div className="onb-tour-icon">
                <ModuloIcon size={34} strokeWidth={1.6} />
              </div>
              <h3>{modulo.title}</h3>
              <p>{modulo.copy}</p>
              <div className="onb-chips">
                {modulo.chips.map(({ Icon: ChipIcon, label }) => (
                  <span key={label} className="onb-chip">
                    <ChipIcon size={12} strokeWidth={2} /> {label}
                  </span>
                ))}
              </div>
              <div className="onb-tip">
                <Sparkles size={14} strokeWidth={1.9} />
                <span>{modulo.tip}</span>
              </div>
            </div>

            <div className="onb-actions">
              {indice > 0 && (
                <button type="button" className="onb-secondary" onClick={() => setIndice((i) => i - 1)}>
                  <ArrowLeft size={15} /> Anterior
                </button>
              )}
              <button
                type="button"
                className="onb-primary"
                onClick={() => (esUltimo ? cerrar() : setIndice((i) => i + 1))}
              >
                {esUltimo ? (
                  <>
                    ¡Listo, ir a mi Garaje! <Check size={16} />
                  </>
                ) : (
                  <>
                    Siguiente <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
