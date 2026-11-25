import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  Fuel,
  Gauge,
  KeyRound,
  LifeBuoy,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { supabase } from '../supabase';
import './LandingLobby.css';

const NAV_LINKS = [
  { label: 'El Pasaporte Digital', href: '#pasaporte' },
  { label: 'Ecosistema', href: '#ecosistema' },
  { label: 'Auxilio 24/7', href: '#auxilio' },
  { label: 'Preguntas', href: '#preguntas' },
];

const AVATARS = [
  'https://api.dicebear.com/9.x/notionists/svg?seed=Andres',
  'https://api.dicebear.com/9.x/micah/svg?seed=Maria',
  'https://api.dicebear.com/9.x/glass/svg?seed=Carlos',
];

const TESTIMONIALS = [
  {
    kicker: 'COMPRA-VENTA TRANSPARENTE',
    quote: 'Vendí mi Bera en dos días. Le pasé el enlace de mi Biela-Historial por WhatsApp y el comprador vio cada aceite, repuesto y kilómetro. Se acabaron los cuentos y hasta defendí mejor precio.',
    name: 'Andrés R.',
    role: 'Motorizado · Caracas',
    avatar: AVATARS[0],
    variant: 'lime',
  },
  {
    kicker: 'RESCATE EN RUTA',
    quote: 'Se me espichó un caucho de noche. Toqué el Modo Emergencia de BujIA, seguí los 3 pasos y desde Auxilio Vial contacté una cauchera 24/7. No me quedé varada sin rumbo.',
    name: 'María G.',
    role: 'Bera + Empire · Maracay',
    avatar: AVATARS[1],
    variant: 'dark',
  },
  {
    kicker: 'CONTROL DE GASTOS',
    quote: 'Ahora sé exactamente cuánto me cuesta cada kilómetro. Con la tasa BCV integrada veo rendimiento en Km/L y gasto mensual en USD y bolívares sin hacer cuentas a mano.',
    name: 'Carlos M.',
    role: 'Motorizado · Valencia',
    avatar: AVATARS[2],
    variant: 'dark',
  },
];

const FAQS = [
  {
    question: '¿Tus datos están seguros?',
    answer: 'Sí. Tu garaje, bitácora y reportes viven en Supabase con autenticación por correo y acceso por usuario. Nadie ve tu historial salvo que tú compartas el enlace verificable o exportes tu PDF.',
  },
  {
    question: '¿Realmente es gratis?',
    answer: 'Sí. Biela es gratis para motorizados: garaje, bitácora, BujIA, radar comunitario, directorio de auxilio y exportación de la Hoja de Vida PDF sin suscripción.',
  },
  {
    question: '¿Funciona sin internet?',
    answer: 'Biela se instala como PWA y abre desde tu pantalla de inicio. La interfaz y tus datos recientes quedan disponibles en el teléfono; cuando vuelve la conexión, se sincronizan los cambios.',
  },
  {
    question: '¿Cómo exporto la Hoja de Vida PDF?',
    answer: 'Desde el detalle de tu moto toca «Hoja de Vida (PDF)». Biela arma un documento con ficha técnica, odómetro certificado, servicios, repuestos y rendimiento real, listo para compartir al traspasar.',
  },
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

function HeroVisual() {
  return (
    <motion.div
      className="landing-hero-visual"
      initial={{ opacity: 0, y: 34, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.7, delay: 0.08 }}
    >
      <div className="landing-visual-orbit" aria-hidden="true" />

      <motion.div
        className="landing-float-widget landing-float-doc"
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        whileHover={{ y: -4 }}
      >
        <span className="landing-float-icon landing-float-icon-doc"><FileText size={18} /></span>
        <span>
          <strong>📄 Biela-Historial PDF</strong>
          <small>Verificado</small>
        </span>
        <span className="landing-float-check"><Check size={14} strokeWidth={3} /></span>
      </motion.div>

      <motion.div
        className="landing-float-widget landing-float-fuel"
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        whileHover={{ y: -4 }}
      >
        <span className="landing-float-icon landing-float-icon-fuel"><Fuel size={18} /></span>
        <span>
          <strong>⛽ Rendimiento: 38.4 Km/L</strong>
          <small>$0.013/km</small>
        </span>
      </motion.div>

      <div className="landing-app-frame">
        <div className="landing-app-top">
          <span className="landing-app-brand"><Wrench size={14} strokeWidth={3} /> Biela</span>
          <span className="landing-app-status"><span /> En vivo</span>
        </div>

        <div className="landing-moto-card">
          <div className="landing-moto-card-glow" aria-hidden="true" />
          <div className="landing-moto-card-head">
            <div>
              <span>MI GARAJE</span>
              <strong>Bera 150</strong>
            </div>
            <span className="landing-moto-card-badge">OK</span>
          </div>
          <div className="landing-moto-odometer">
            <Gauge size={18} />
            <strong>8.420</strong>
            <span>KM</span>
          </div>
          <div className="landing-moto-traffic">🟢 Aceite óptimo • Faltan 1,240 km</div>
          <div className="landing-moto-meter"><span /></div>
          <div className="landing-moto-meta">
            <span>Aceite 20W-50</span>
            <strong>72%</strong>
          </div>
          <div className="landing-moto-meta">
            <span>Rendimiento</span>
            <strong>38.4 Km/L</strong>
          </div>
        </div>

        <div className="landing-app-bars" aria-hidden="true">
          <span style={{ height: '38%' }} />
          <span style={{ height: '62%' }} />
          <span style={{ height: '48%' }} />
          <span style={{ height: '84%' }} />
          <span style={{ height: '56%' }} />
          <span style={{ height: '94%' }} />
          <span style={{ height: '70%' }} />
        </div>

        <div className="landing-app-bottom">
          <span><FileText size={15} /> Hoja de Vida</span>
          <span><LifeBuoy size={15} /> Auxilio 24/7</span>
          <span><Bot size={15} /> BujIA</span>
        </div>
      </div>

      <motion.div
        className="landing-phone-mini"
        initial={{ opacity: 0, y: 22, rotate: 5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.6, delay: 0.28 }}
        whileHover={{ y: -5 }}
      >
        <div className="landing-phone-mini-top">
          <span className="landing-phone-mini-avatar"><Bot size={15} /></span>
          <span>BujIA</span>
          <span className="landing-phone-mini-live">EN VÍA</span>
        </div>
        <p>Modo Emergencia activo. Te conecto con una cauchera cerca de ti. 🛞</p>
        <div className="landing-phone-mini-chips">
          <span>🔌 Sin chispa</span>
          <span>🛞 Caucho espichado</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CertificatePreview() {
  return (
    <motion.div
      className="landing-certificate"
      initial={{ opacity: 0, y: 28, rotate: 2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      whileHover={{ rotate: 0, y: -6 }}
      transition={{ duration: 0.5, type: 'spring', stiffness: 160, damping: 20 }}
    >
      <div className="landing-certificate-head">
        <div>
          <span className="landing-certificate-mark">BIELA</span>
          <strong>BIELA — HOJA DE VIDA VEHICULAR</strong>
        </div>
        <span className="landing-certificate-code"><ShieldCheck size={13} /> #BIE-894A</span>
      </div>

      <div className="landing-certificate-hero">
        <div>
          <span>VEHÍCULO</span>
          <strong>Bera 150 · 2022</strong>
        </div>
        <div>
          <span>ODÓMETRO CERTIFICADO</span>
          <strong>8.420 km</strong>
        </div>
      </div>

      <div className="landing-certificate-table">
        <div className="landing-certificate-row landing-certificate-row-head">
          <span>SERVICIO</span>
          <span>KM</span>
          <span>ESTADO</span>
        </div>
        <div className="landing-certificate-row">
          <span>Cambio de Aceite 20W-50</span>
          <span>7.180</span>
          <span><Check size={12} /> Verificado</span>
        </div>
        <div className="landing-certificate-row">
          <span>Kit de Arrastre</span>
          <span>6.940</span>
          <span><Check size={12} /> Verificado</span>
        </div>
        <div className="landing-certificate-row">
          <span>Bujía NGK</span>
          <span>6.120</span>
          <span><Check size={12} /> Verificado</span>
        </div>
      </div>

      <div className="landing-certificate-stamp">LISTO PARA TRASPASO</div>
      <p className="landing-certificate-note">Emitido por Biela · Historial verificable por enlace</p>
    </motion.div>
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
            Iniciar Sesión
          </button>
          <button type="button" role="tab" aria-selected={tab === 'register'} className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setError(''); setInfo(''); }}>
            Crear Cuenta
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

  const scrollTo = (href) => {
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  return (
    <div className="landing-root">
      <div className="landing-dot-grid" aria-hidden="true" />
      <div className="landing-ambient landing-ambient-one" aria-hidden="true" />
      <div className="landing-ambient landing-ambient-two" aria-hidden="true" />
      <div className="landing-ambient landing-ambient-three" aria-hidden="true" />

      <div className="landing-shell">
        <header className="landing-nav-wrap">
          <motion.nav
            className="landing-nav"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button type="button" className="landing-logo" onClick={() => scrollTo('#top')} aria-label="Biela, volver arriba">
              <span className="landing-logo-mark"><Wrench size={16} strokeWidth={3} /></span>
              <span>Biela</span>
              <span className="landing-logo-country">VZLA</span>
            </button>

            <div className="landing-nav-links">
              {NAV_LINKS.map((link) => (
                <button type="button" key={link.href} onClick={() => scrollTo(link.href)}>{link.label}</button>
              ))}
            </div>

            <div className="landing-nav-actions">
              <button type="button" className="landing-btn landing-btn-ghost" onClick={() => openAuth('login')}>
                Iniciar sesión
              </button>
              <button type="button" className="landing-btn landing-btn-primary" onClick={() => openAuth('register')}>
                Abrir mi Garaje <ArrowRight size={16} />
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
                  <button type="button" key={link.href} onClick={() => scrollTo(link.href)}>{link.label}</button>
                ))}
                <button type="button" onClick={() => openAuth('login')}>Iniciar sesión</button>
                <button type="button" className="landing-mobile-menu-primary" onClick={() => openAuth('register')}>Abrir mi Garaje</button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main>
          <section className="landing-hero" id="top">
            <motion.div
              className="landing-hero-copy"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <div className="landing-pill">
                <span className="landing-pill-dot" />
                🟢 NUEVO • HOJA DE VIDA DIGITAL PARA COMPRA-VENTA DE MOTOS
              </div>

              <h1 className="landing-title">
                El historial inteligente que cuida tu moto y <span>multiplica su valor.</span>
              </h1>

              <p className="landing-subtitle">
                Registra mantenimientos, calcula tu rendimiento real en Km/L (USD/Bs), pide auxilio vial 24/7 por WhatsApp y entrega un certificado PDF verificado cuando vendas tu moto.
              </p>

              <div className="landing-hero-actions">
                <button type="button" className="landing-btn landing-btn-primary landing-btn-xl" onClick={() => openAuth('register')}>
                  Crear mi Garaje Gratis <ArrowRight size={18} />
                </button>
                <button type="button" className="landing-btn landing-btn-outline landing-btn-xl" onClick={() => scrollTo('#pasaporte')}>
                  Ver cómo funciona el Biela-Historial
                </button>
              </div>

              <div className="landing-trust-row">
                <span><Check size={15} /> 100% Gratis</span>
                <span><Check size={15} /> Funciona en cualquier teléfono</span>
                <span><Check size={15} /> Tasa BCV integrada</span>
              </div>
            </motion.div>

            <HeroVisual />
          </section>

          <section className="landing-passport" id="pasaporte">
            <motion.div
              className="landing-passport-copy"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55 }}
            >
              <span className="landing-section-label">EL CARFAX DE LAS MOTOS EN VENEZUELA</span>
              <h2>¿Vas a vender o comprar una moto usada? <em>No compres a ciegas.</em></h2>
              <p>
                Como dueño, exportas tu <strong>Hoja de Vida PDF</strong> o compartes un enlace verificable por WhatsApp. Como comprador, ves cada cambio de aceite, cada repuesto y el kilometraje certificado antes de soltar el dinero.
              </p>
              <div className="landing-passport-points">
                <span><FileText size={17} /> PDF listo para traspaso</span>
                <span><MessageCircle size={17} /> Enlace compartible por WhatsApp</span>
                <span><ShieldCheck size={17} /> Odómetro y servicios verificados</span>
              </div>
              <button type="button" className="landing-btn landing-btn-primary landing-btn-lg" onClick={() => openAuth('register')}>
                Crear mi Biela-Historial <ArrowRight size={18} />
              </button>
            </motion.div>

            <CertificatePreview />
          </section>

          <section className="landing-ecosystem" id="ecosistema">
            <div className="landing-section-heading">
              <span className="landing-section-label">ECOSISTEMA BIELA</span>
              <h2>Todo lo que tu moto necesita, en una sola app.</h2>
              <p>De la falla en la vía al precio de reventa: cada módulo resuelve un problema real del motorizado venezolano.</p>
            </div>

            <div className="landing-bento">
              <motion.article
                className="landing-bento-card landing-bento-emergency"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45 }}
                whileHover={{ y: -5 }}
              >
                <div className="landing-bento-top">
                  <span className="landing-bento-icon"><Bot size={21} /></span>
                  <span className="landing-bento-tag">IA + RESCATE</span>
                </div>
                <h3>BujIA + Modo Emergencia en Vía</h3>
                <p>Diagnóstico instantáneo por foto y pasos claros cuando estás varado. Sin cuentos, sin registrar en la bitácora durante la emergencia.</p>
                <div className="landing-emergency-chips">
                  <span>🔌 Sin chispa</span>
                  <span>🛞 Caucho espichado</span>
                  <span>⛓️ Cadena partida</span>
                </div>
                <div className="landing-emergency-reply">
                  <span><Bot size={15} /> BujIA</span>
                  <p>Modo Emergencia activo: revisa la bujía, luego te conecto con talleres cerca de ti.</p>
                </div>
              </motion.article>

              <motion.article
                className="landing-bento-card landing-bento-store"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                whileHover={{ y: -5 }}
              >
                <div className="landing-bento-top">
                  <span className="landing-bento-icon"><LifeBuoy size={21} /></span>
                  <span className="landing-bento-tag">24/7</span>
                </div>
                <h3>Tienda & Auxilio Vial 24/7</h3>
                <p>Caucheras, grúas y repuesteras verificadas cerca de ti.</p>
                <div className="landing-store-list">
                  <span><MapPin size={14} /> Cauchera 24h · 1.2 km</span>
                  <span><MapPin size={14} /> Repuestos · 2.8 km</span>
                  <span><MapPin size={14} /> Grúa ligera · 4.1 km</span>
                </div>
                <button type="button" className="landing-bento-link" onClick={() => openAuth('register')}>
                  Abrir directorio <ArrowRight size={15} />
                </button>
              </motion.article>

              <motion.article
                className="landing-bento-card landing-bento-finance"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="landing-bento-top">
                  <span className="landing-bento-icon"><Wallet size={21} /></span>
                  <span className="landing-bento-tag">BCV</span>
                </div>
                <h3>Finanzas Multimoneda (USD / Bs)</h3>
                <p>Km/L real y gasto mensual con tasa BCV integrada.</p>
                <div className="landing-finance-values">
                  <div><span>Rendimiento</span><strong>38.4 Km/L</strong></div>
                  <div><span>Costo / km</span><strong>$0.013</strong></div>
                </div>
              </motion.article>

              <motion.article
                className="landing-bento-card landing-bento-radar"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: 0.15 }}
                whileHover={{ y: -5 }}
              >
                <div className="landing-bento-top">
                  <span className="landing-bento-icon"><Activity size={21} /></span>
                  <span className="landing-bento-tag">SALUD + RADAR</span>
                </div>
                <h3>Radiografía Interactiva & Radar de Gasolina</h3>
                <p>Desgaste real de cada pieza y reportes en vivo de bombas surtiendo en tu ciudad.</p>
                <div className="landing-radar-content">
                  <div className="landing-health-mini">
                    <span><Gauge size={15} /> Aceite <strong>72%</strong></span>
                    <span><Wrench size={15} /> Cadena <strong>48%</strong></span>
                    <span><Activity size={15} /> Frenos <strong>86%</strong></span>
                  </div>
                  <div className="landing-radar-mini">
                    <div className="landing-radar-mini-head"><Fuel size={15} /> Radar en vivo <span /></div>
                    <p>3 bombas surtiendo cerca de ti · Dólares y Subsidiada</p>
                  </div>
                </div>
              </motion.article>
            </div>
          </section>

          <section className="landing-impact" id="auxilio">
            <span className="landing-impact-watermark" aria-hidden="true">RUEDA SEGURO</span>
            <motion.div
              className="landing-impact-inner"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
            >
              <div className="landing-impact-title">
                <Sparkles size={19} />
                <span>UNA SOLA APP PARA CADA RUTA</span>
              </div>
              <div className="landing-impact-metrics">
                <div><strong>24/7</strong><span>Rescate IA</span></div>
                <div><strong>PDF</strong><span>Certificado</span></div>
                <div><strong>USD / Bs</strong><span>Tasa BCV</span></div>
                <div><strong>100%</strong><span>Gratis</span></div>
              </div>
            </motion.div>
          </section>

          <section className="landing-testimonials">
            <div className="landing-section-heading">
              <span className="landing-section-label">HISTORIAS REALES</span>
              <h2>Motorizados que ya ruedan con Biela.</h2>
            </div>
            <div className="landing-testimonial-grid">
              {TESTIMONIALS.map((item, index) => (
                <motion.article
                  key={item.name}
                  className={`landing-review landing-review-${item.variant}`}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.07 }}
                >
                  <div className="landing-review-head">
                    <span className="landing-review-kicker">{item.kicker}</span>
                    <div className="landing-stars" aria-label="5 estrellas">
                      {[0, 1, 2, 3, 4].map((star) => <Star key={star} size={14} fill="currentColor" />)}
                    </div>
                  </div>
                  <blockquote>«{item.quote}»</blockquote>
                  <div className="landing-review-author">
                    <img src={item.avatar} alt={`Avatar de ${item.name}`} />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.role}</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>

          <section className="landing-faq" id="preguntas">
            <div className="landing-section-heading">
              <span className="landing-section-label">PREGUNTAS FRECUENTES</span>
              <h2>Todo lo que necesitas saber.</h2>
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
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="landing-final-kicker"><Sparkles size={16} /> TU BITÁCORA, TU VALOR</span>
              <h2>Tu moto merece una bitácora profesional.</h2>
              <p>Regístrala hoy, cuida cada kilómetro y entrega un historial que hable por ti al momento de vender.</p>
              <button type="button" className="landing-btn landing-btn-primary landing-btn-xl" onClick={() => openAuth('register')}>
                Entrar a Biela Ahora <ArrowRight size={20} />
              </button>
            </motion.div>
          </section>
        </main>

        <footer className="landing-footer">
          <div className="landing-footer-brand">
            <div className="landing-logo">
              <span className="landing-logo-mark"><Wrench size={16} strokeWidth={3} /></span>
              <span>Biela</span>
              <span className="landing-logo-country">VZLA</span>
            </div>
            <p>La app venezolana que convierte el mantenimiento de tu moto en valor, confianza y seguridad en la ruta.</p>
            <span className="landing-footer-location">Hecho en Venezuela 🛵</span>
          </div>

          <div className="landing-footer-column">
            <strong>Funciones</strong>
            <button type="button" onClick={() => scrollTo('#pasaporte')}>Hoja de Vida PDF</button>
            <button type="button" onClick={() => scrollTo('#ecosistema')}>BujIA Emergencia</button>
            <button type="button" onClick={() => scrollTo('#ecosistema')}>Auxilio Vial</button>
            <button type="button" onClick={() => scrollTo('#ecosistema')}>Finanzas USD/Bs</button>
          </div>

          <div className="landing-footer-column">
            <strong>Comunidad / Soporte</strong>
            <button type="button" onClick={() => scrollTo('#ecosistema')}>Radar de Gasolina</button>
            <button type="button" onClick={() => scrollTo('#auxilio')}>Rescate 24/7</button>
            <button type="button" onClick={() => scrollTo('#preguntas')}>Preguntas frecuentes</button>
            <button type="button" onClick={() => openAuth('login')}>Acceder al Garaje</button>
          </div>

          <div className="landing-footer-column">
            <strong>Legal / Versión</strong>
            <span>Privacidad de datos</span>
            <span>Términos de uso</span>
            <span>Biela PWA · v1.0</span>
            <span>© {new Date().getFullYear()} Biela</span>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {authOpen && <AuthModal key={authMode} initialMode={authMode} onClose={closeAuth} />}
      </AnimatePresence>
    </div>
  );
}
