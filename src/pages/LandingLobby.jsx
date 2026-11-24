import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Fuel,
  Gauge,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Wrench,
  X,
} from 'lucide-react';
import { supabase } from '../supabase';
import './LandingLobby.css';

const NAV_LINKS = [
  { label: 'Funciones', href: '#funciones' },
  { label: 'Comunidad', href: '#comunidad' },
  { label: 'Preguntas', href: '#preguntas' },
];

const FLOATING_ICONS = [
  { icon: Wrench, label: 'Llave mecánica', className: 'float-one' },
  { icon: Fuel, label: 'Surtidor', className: 'float-two' },
  { icon: Bot, label: 'IA BujIA', className: 'float-three' },
  { icon: ShieldCheck, label: 'Mantenimiento', className: 'float-four' },
];

const BENEFITS = [
  { icon: Wrench, title: 'Bitácora Inteligente', desc: 'Control exacto de aceite, bujía y repuestos.' },
  { icon: Gauge, title: 'Rendimiento Real', desc: 'Calcula cuánto te rinde cada litro en dólares.' },
  { icon: MapPin, title: 'Radar Comunitario', desc: 'Reportes en vivo de estaciones surtiendo.' },
  { icon: Bot, title: 'Diagnóstico BujIA', desc: 'Envía fotos o describe fallas al instante.' },
  { icon: Activity, title: 'Salud Visual', desc: 'Radiografía interactiva de cada pieza de tu moto.' },
];

const METRICS = [
  { value: '24/7', label: 'Asistencia mecánica IA' },
  { value: '100%', label: 'Gratis para motorizados' },
  { value: '5+', label: 'Sistemas de moto monitoreados' },
  { value: 'En Vivo', label: 'Mapa comunitario Vzla' },
];

const FAQS = [
  {
    question: '¿Cómo creo mi cuenta en Biela?',
    answer: 'Toca «Entrar al Garaje», cambia a «Crear Cuenta», escribe tu correo y contraseña. Si tu proveedor de correo exige confirmación, revisa tu bandeja y luego inicia sesión.',
  },
  {
    question: '¿Cómo funciona el asistente mecánico BujIA?',
    answer: 'Cuéntale qué le pasa a tu moto o envía una foto desde el chat. BujIA analiza el contexto, te da una orientación preventiva y te recomienda cuándo acudir a un taller certificado.',
  },
  {
    question: '¿El mapa de gasolina funciona en toda Venezuela?',
    answer: 'El radar es comunitario: muestra reportes de estaciones en Venezuela y se mejora con cada motorizado que comparte si una bomba está surtiendo, cerrada o solo con gasoil.',
  },
  {
    question: '¿Tiene algún costo usar la aplicación?',
    answer: 'No. Biela es gratis para motorizados. Puedes instalarla como PWA y usar el garaje, la bitácora, el radar y BujIA sin suscripción.',
  },
  {
    question: '¿Puedo registrar varias motos en mi garaje?',
    answer: 'Sí. Desde tu Garaje puedes añadir todas tus motos, llevar una bitácora independiente por vehículo y revisar el odómetro y mantenimientos de cada una.',
  },
];

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Andres&backgroundColor=84cc16',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=María&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luisa&backgroundColor=c0aede',
];

function mapAuthError(message) {
  const value = (message || '').toLowerCase();
  if (value.includes('invalid login credentials') || value.includes('invalid credentials')) return 'Correo o clave incorrectos.';
  if (value.includes('email not confirmed')) return 'Debes confirmar tu correo antes de entrar. Revisa tu bandeja.';
  if (value.includes('user already registered') || value.includes('already registered')) return 'Este correo ya está registrado. Intenta iniciar sesión.';
  if (value.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (value.includes('unable to validate email') || value.includes('invalid email')) return 'Ingresa un correo electrónico válido.';
  if (value.includes('signup requires a valid password')) return 'Ingresa una contraseña válida.';
  if (value.includes('rate limit') || value.includes('too many requests')) return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
  return message || 'Ocurrió un error. Intenta de nuevo.';
}

function PhoneMockup() {
  return (
    <div className="landing-phone" aria-hidden="true">
      <div className="landing-phone-notch" />
      <div className="landing-phone-screen">
        <div className="landing-phone-top">
          <div className="landing-phone-brand">
            <span className="landing-phone-brand-mark"><Wrench size={12} strokeWidth={3} /></span>
            Biela
          </div>
          <span className="landing-phone-time">8:42</span>
        </div>

        <div className="landing-phone-card">
          <div className="landing-phone-card-head">
            <div>
              <span className="landing-phone-overline">MI GARAJE</span>
              <strong>Bera 150</strong>
            </div>
            <span className="landing-phone-chip">OK</span>
          </div>
          <div className="landing-phone-odometer">
            <Gauge size={16} />
            <span>8.420</span>
            <small>KM</small>
          </div>
          <div className="landing-phone-bar"><span /></div>
          <div className="landing-phone-row">
            <span>Aceite</span>
            <strong>20W-50 · 72%</strong>
          </div>
          <div className="landing-phone-row">
            <span>Próximo service</span>
            <strong>1.580 km</strong>
          </div>
        </div>

        <div className="landing-phone-chat">
          <div className="landing-phone-bujia">
            <Bot size={16} />
            <span>BujIA</span>
          </div>
          <p>Todo al día. Te aviso antes de que toque el cambio de aceite. 🏍️</p>
        </div>

        <div className="landing-phone-tabs">
          <span className="active"><Gauge size={14} /></span>
          <span><Fuel size={14} /></span>
          <span><MessageCircle size={14} /></span>
          <span><ShieldCheck size={14} /></span>
        </div>
      </div>
    </div>
  );
}

function RadarMockup() {
  return (
    <div className="landing-radar-mockup" aria-hidden="true">
      <div className="landing-radar-grid" />
      <div className="landing-radar-road landing-radar-road-a" />
      <div className="landing-radar-road landing-radar-road-b" />
      <span className="landing-radar-pin pin-a"><Fuel size={14} /></span>
      <span className="landing-radar-pin pin-b"><Fuel size={14} /></span>
      <span className="landing-radar-pin pin-c"><Fuel size={14} /></span>
      <div className="landing-radar-card">
        <div className="landing-radar-card-head">
          <div>
            <span>Radar en vivo</span>
            <strong>3 bombas surtiendo</strong>
          </div>
          <span className="landing-live-dot" />
        </div>
        <div className="landing-radar-lines">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="landing-radar-chat">
        <span className="landing-radar-chat-icon"><Bot size={15} /></span>
        <p>Arranca ya, hay una bomba cerca de ti.</p>
      </div>
    </div>
  );
}

function AuthModal({ initialMode, onClose }) {
  const [tab, setTab] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [recoverMode, setRecoverMode] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverError, setRecoverError] = useState('');
  const [recoverInfo, setRecoverInfo] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError('Completa tu correo y contraseña.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (authError) throw authError;
        onClose();
      } else {
        const { data, error: authError } = await supabase.auth.signUp({ email: cleanEmail, password });
        if (authError) throw authError;
        if (data?.session) {
          onClose();
        } else {
          setInfo('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
          setTab('login');
        }
      }
    } catch (authError) {
      setError(mapAuthError(authError?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (event) => {
    event.preventDefault();
    setRecoverError('');
    setRecoverInfo('');
    const cleanEmail = recoverEmail.trim();

    if (!cleanEmail) {
      setRecoverError('Ingresa tu correo electrónico.');
      return;
    }

    setRecoverLoading(true);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });
      if (authError) throw authError;
      setRecoverInfo('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.');
    } catch (authError) {
      setRecoverError(mapAuthError(authError?.message));
    } finally {
      setRecoverLoading(false);
    }
  };

  return (
    <motion.div
      className="auth-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        className="auth-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Acceso a Biela"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="auth-close" onClick={onClose} aria-label="Cerrar acceso">
          <X size={20} />
        </button>

        <div className="auth-head">
          <div className="auth-logo">
            <span className="auth-logo-mark"><Wrench size={17} strokeWidth={3} /></span>
            Biela
          </div>
          <h2>{tab === 'login' ? 'Entra a tu Garaje' : 'Crea tu cuenta'}</h2>
          <p>{tab === 'login' ? 'Tu bitácora y tu radar están a un clic.' : 'Empieza a cuidar tu moto hoy mismo.'}</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Modo de acceso">
          <button type="button" role="tab" aria-selected={tab === 'login'} className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setError(''); setInfo(''); }}>
            Iniciar sesión
          </button>
          <button type="button" role="tab" aria-selected={tab === 'register'} className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setError(''); setInfo(''); }}>
            Crear cuenta
          </button>
        </div>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {info && <div className="auth-alert auth-alert-info">{info}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="auth-email">Correo electrónico</label>
          <div className="auth-input-wrap">
            <Mail size={18} className="auth-input-icon" />
            <input
              id="auth-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="piloto@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="auth-input"
            />
          </div>

          <label className="auth-label" htmlFor="auth-password">Contraseña</label>
          <div className="auth-input-wrap">
            <Lock size={18} className="auth-input-icon" />
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-input auth-input-password"
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <Loader2 size={18} className="auth-spin" /> : <ArrowRight size={18} />}
            {loading ? 'Procesando...' : tab === 'login' ? 'Entrar al Garaje' : 'Crear mi cuenta'}
          </button>
        </form>

        <button
          type="button"
          className="auth-recover-toggle"
          onClick={() => {
            setRecoverMode((value) => !value);
            setRecoverEmail(email);
            setRecoverError('');
            setRecoverInfo('');
          }}
        >
          <KeyRound size={15} />
          ¿Olvidaste tu contraseña?
        </button>

        <AnimatePresence initial={false}>
          {recoverMode && (
            <motion.form
              className="auth-recover"
              onSubmit={handleRecover}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <label className="auth-label" htmlFor="auth-recover-email">Recuperar acceso</label>
              <div className="auth-input-wrap">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="auth-recover-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Tu correo registrado"
                  value={recoverEmail}
                  onChange={(event) => setRecoverEmail(event.target.value)}
                  className="auth-input"
                />
              </div>
              {recoverError && <div className="auth-alert auth-alert-error">{recoverError}</div>}
              {recoverInfo && <div className="auth-alert auth-alert-info">{recoverInfo}</div>}
              <button type="submit" className="auth-submit auth-submit-secondary" disabled={recoverLoading}>
                {recoverLoading ? <Loader2 size={18} className="auth-spin" /> : <Mail size={18} />}
                {recoverLoading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default function LandingLobby({ session }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const openAuth = useCallback((mode = 'login') => {
    setAuthMode(mode);
    setMenuOpen(false);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing-root">
      <div className="landing-glow" aria-hidden="true" />
      <div className="landing-grid" aria-hidden="true" />

      <div className="landing-shell">
        <header className="landing-nav-wrap">
          <motion.nav
            className="landing-nav"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <a className="landing-logo" href="#top" aria-label="Biela, volver arriba">
              <span className="landing-logo-mark"><Wrench size={16} strokeWidth={3} /></span>
              <span>Biela</span>
            </a>

            <div className="landing-nav-links">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href}>{link.label}</a>
              ))}
            </div>

            <div className="landing-nav-actions">
              <button type="button" className="landing-btn landing-btn-ghost" onClick={() => openAuth('login')}>
                Iniciar sesión
              </button>
              <button type="button" className="landing-btn landing-btn-primary" onClick={() => openAuth('login')}>
                Entrar al Garaje <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="landing-menu-btn"
                onClick={() => setMenuOpen((value) => !value)}
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </motion.nav>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                className="landing-mobile-menu"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {NAV_LINKS.map((link) => (
                  <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>
                ))}
                <button type="button" onClick={() => openAuth('login')}>Iniciar sesión</button>
                <button type="button" className="landing-mobile-menu-primary" onClick={() => openAuth('login')}>Entrar al Garaje</button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main>
          <section className="landing-hero" id="top">
            <motion.div
              className="landing-hero-copy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <div className="landing-eyebrow">
                <span className="landing-pulse-dot" />
                TALLER INTELIGENTE &amp; RADAR VZLA
              </div>

              <h1 className="landing-title">
                Tu moto.<br />
                Tu control.<br />
                <span>Una sola app.</span>
              </h1>

              <p className="landing-subtitle">
                Bitácora digital, rendimiento real de combustible, radar de gasolina y asistencia mecánica con <strong>BujIA</strong>. Todo pensado para la ruta venezolana.
              </p>

              <div className="landing-hero-actions">
                <button type="button" className="landing-btn landing-btn-primary landing-btn-lg" onClick={() => openAuth('login')}>
                  Abrir mi Garaje <ArrowRight size={18} />
                </button>
                <a className="landing-link-button" href="#funciones">Ver funciones</a>
              </div>

              <div className="landing-trust-row">
                <span><Check size={14} /> Gratis para motorizados</span>
                <span><Check size={14} /> Funciona como PWA</span>
              </div>
            </motion.div>

            <motion.div
              className="landing-phone-stage"
              initial={{ opacity: 0, y: 28, rotate: -3 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
            >
              <div className="landing-phone-halo" aria-hidden="true" />
              <PhoneMockup />
            </motion.div>

            <motion.aside
              className="landing-social-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.14 }}
            >
              <div className="landing-avatar-stack">
                {AVATARS.map((src, index) => (
                  <img key={src} src={src} alt="" style={{ zIndex: AVATARS.length - index }} />
                ))}
              </div>
              <p className="landing-social-label">Comunidad Activa</p>
              <strong className="landing-social-value">24/7 en ruta</strong>
              <p className="landing-social-copy">Pilotos compartiendo reportes reales para no quedarse varado.</p>
              <div className="landing-pwa-badge">
                <Download size={16} />
                <span>Acceso rápido PWA</span>
              </div>
            </motion.aside>
          </section>

          <section className="landing-lime-banner" id="comunidad">
            <span className="landing-watermark" aria-hidden="true">CONTROLA TU NAVE</span>
            <motion.div
              className="landing-banner-content"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
            >
              <div className="landing-banner-kicker"><Sparkles size={16} /> PLATAFORMA TODO EN UNO</div>
              <h2>
                La plataforma todo en uno que está revolucionando el cuidado de tu moto en Venezuela.
              </h2>
              <div className="landing-banner-badges">
                <span><Wrench size={16} /> Garaje Digital</span>
                <span><Fuel size={16} /> Radar de Gasolina</span>
                <span><Bot size={16} /> Asistente BujIA</span>
              </div>
            </motion.div>
          </section>

          <section className="landing-value" id="funciones">
            <div className="landing-value-orbit" aria-hidden="true">
              {FLOATING_ICONS.map(({ icon: Icon, label, className }) => (
                <motion.div
                  key={label}
                  className={`landing-float-card ${className}`}
                  title={label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  whileHover={{ y: -4 }}
                >
                  <Icon size={22} strokeWidth={2.3} />
                </motion.div>
              ))}
            </div>

            <motion.div
              className="landing-value-copy"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5 }}
            >
              <span className="landing-section-label">UNA APP, CERO COMPLICACIONES</span>
              <h2>Nuestra app es la solución todo en uno para gestionar tu moto y tus rutas diarias.</h2>
              <button type="button" className="landing-btn landing-btn-primary landing-btn-lg" onClick={() => openAuth('register')}>
                Empezar ahora <ArrowRight size={18} />
              </button>
            </motion.div>
          </section>

          <section className="landing-benefits">
            <div className="landing-section-heading">
              <span className="landing-section-label">BENEFICIOS</span>
              <h2>Hecho para llevar tu moto más lejos</h2>
              <p>Cada función nace de un problema real de quien maneja todos los días.</p>
            </div>

            <div className="landing-benefit-grid">
              {BENEFITS.map(({ icon: Icon, title, desc }, index) => (
                <motion.article
                  key={title}
                  className="landing-benefit-card"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.4, delay: index * 0.04 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="landing-benefit-icon"><Icon size={22} strokeWidth={2.2} /></div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </motion.article>
              ))}
            </div>
          </section>

          <section className="landing-showcase">
            <span className="landing-watermark landing-showcase-watermark" aria-hidden="true">FUNCIONES</span>
            <motion.div
              className="landing-showcase-stage"
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55 }}
            >
              <RadarMockup />
              <div className="landing-showcase-chip chip-left"><MapPin size={15} /> Radar comunitario</div>
              <div className="landing-showcase-chip chip-right"><Bot size={15} /> BujIA al instante</div>
            </motion.div>
          </section>

          <section className="landing-metrics">
            <div className="landing-metrics-title">
              <span className="landing-section-label">DATOS Y CIFRAS</span>
              <h2>La ruta se vive mejor con información</h2>
            </div>
            <div className="landing-metrics-grid">
              {METRICS.map((metric, index) => (
                <motion.div
                  key={metric.value}
                  className="landing-metric"
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="landing-testimonials">
            <motion.article
              className="landing-review landing-review-lime"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
            >
              <span className="landing-review-kicker">CONTROL TOTAL</span>
              <blockquote>
                «Desde que uso Biela nunca se me pasa un cambio de aceite ni me quedo accidentado sin saber qué tiene la moto.»
              </blockquote>
              <div className="landing-review-author">
                <img src={AVATARS[0]} alt="Avatar de Andrés" />
                <div>
                  <strong>Andrés R.</strong>
                  <span>Motorizado · Caracas</span>
                </div>
              </div>
            </motion.article>

            <motion.article
              className="landing-review landing-review-dark"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.08 }}
            >
              <div className="landing-stars" aria-label="5 estrellas">
                {[0, 1, 2, 3, 4].map((star) => <Star key={star} size={16} fill="currentColor" />)}
              </div>
              <blockquote>
                «Andaba en mi Bera y no encontraba gasolina. Abrí el radar, vi una bomba surtiendo y BujIA me dijo qué revisar antes de seguir ruta. Mi Empire también está en el garaje.»
              </blockquote>
              <div className="landing-review-author">
                <img src={AVATARS[1]} alt="Avatar de María" />
                <div>
                  <strong>María G.</strong>
                  <span>Bera + Empire · Maracay</span>
                </div>
              </div>
            </motion.article>
          </section>

          <section className="landing-faq" id="preguntas">
            <div className="landing-section-heading landing-faq-heading">
              <span className="landing-section-label">PREGUNTAS FRECUENTES</span>
              <h2>Todo lo que necesitas saber</h2>
              <p>Si aún tienes dudas, BujIA también puede ayudarte desde el chat.</p>
            </div>

            <div className="landing-faq-list">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div className={`landing-faq-item ${isOpen ? 'open' : ''}`} key={faq.question}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq((current) => (current === index ? null : index))}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.question}</span>
                      <ChevronDown size={20} className="landing-faq-chevron" />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          className="landing-faq-answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24 }}
                        >
                          <p>{faq.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="landing-final-cta">
            <motion.div
              className="landing-final-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Smartphone size={26} />
              <h2>Empieza a organizar tu moto hoy mismo</h2>
              <p>Registra tu primera nave, lleva tu bitácora y únete al radar comunitario.</p>
              <button type="button" className="landing-btn landing-btn-primary landing-btn-lg" onClick={() => openAuth('register')}>
                Entrar al Garaje <ArrowRight size={18} />
              </button>
            </motion.div>
          </section>
        </main>

        <footer className="landing-footer">
          <div className="landing-footer-brand">
            <div className="landing-logo">
              <span className="landing-logo-mark"><Wrench size={16} strokeWidth={3} /></span>
              <span>Biela</span>
            </div>
            <p>La app venezolana para cuidar tu moto, planear tu ruta y llegar tranquilo.</p>
          </div>
          <div className="landing-footer-links">
            <a href="#funciones">Funciones</a>
            <a href="#comunidad">Comunidad</a>
            <a href="#preguntas">Soporte</a>
          </div>
          <p className="landing-copyright">© {new Date().getFullYear()} Biela. Hecho en Venezuela para quienes ruedan.</p>
        </footer>
      </div>

      <AnimatePresence>
        {authOpen && <AuthModal key={authMode} initialMode={authMode} onClose={closeAuth} />}
      </AnimatePresence>
    </div>
  );
}
