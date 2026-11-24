import { useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Bot, Fuel, Wrench, KeyRound } from 'lucide-react';
import { supabase } from '../supabase';
import './LandingLobby.css';

function mapAuthError(message) {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) return 'Correo o clave incorrectos.';
  if (m.includes('email not confirmed')) return 'Debes confirmar tu correo antes de entrar. Revisa tu bandeja.';
  if (m.includes('user already registered') || m.includes('already registered')) return 'Este correo ya está registrado. Intenta iniciar sesión.';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Ingresa un correo electrónico válido.';
  if (m.includes('signup requires a valid password')) return 'Ingresa una contraseña válida.';
  if (m.includes('rate limit') || m.includes('too many requests')) return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
  return message || 'Ocurrió un error. Intenta de nuevo.';
}

const FEATURES = [
  { icon: Bot, emoji: '🤖', title: 'BujIA Mecánico 24/7', desc: 'Diagnóstico por texto o foto.' },
  { icon: Fuel, emoji: '⛽', title: 'Radar de Gasolina', desc: 'Reportes en tiempo real (Dólares / Subsidiada).' },
  { icon: Wrench, emoji: '🔧', title: 'Bitácora & Salud', desc: 'Control de aceite, repuestos y rendimiento Km/L.' },
];

export default function LandingLobby({ session }) {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [recoverMode, setRecoverMode] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState('');
  const [recoverErr, setRecoverErr] = useState('');
  const authRef = useRef(null);

  if (session) return <Navigate to="/dashboard" replace />;

  const scrollToAuth = () => authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) { setError('Completa tu correo y contraseña.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      if (tab === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email: cleanEmail, password });
        if (err) throw err;
        if (!data?.session) {
          setInfo('Cuenta creada. Revisa tu bandeja para confirmar tu correo y luego inicia sesión.');
          setTab('login');
        }
      }
    } catch (err) {
      setError(mapAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    setRecoverErr(''); setRecoverMsg('');
    const clean = recoverEmail.trim();
    if (!clean) { setRecoverErr('Ingresa tu correo electrónico.'); return; }
    setRecoverLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo: window.location.origin });
      if (err) throw err;
      setRecoverMsg('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.');
    } catch (err) {
      setRecoverErr(mapAuthError(err?.message));
    } finally {
      setRecoverLoading(false);
    }
  };

  return (
    <div className="lobby-root">
      <div className="lobby-bg" aria-hidden="true" />
      <div className="lobby-grid" aria-hidden="true" />

      <div className="lobby-shell">
        <section className="lobby-hero">
          <div className="lobby-topbar">
            <div className="lobby-logo">BIELA</div>
          </div>

          <motion.div className="lobby-badge" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <span className="lobby-badge-dot" />
            TALLER INTELIGENTE &amp; RADAR VZLA
          </motion.div>

          <motion.h1 className="lobby-title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.04 }}>
            Tu moto bajo control. <span className="lobby-title-accent">Tu ruta sin sorpresas.</span>
          </motion.h1>

          <motion.p className="lobby-subtitle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
            Bitácora digital, rendimiento real de combustible y asistencia mecánica con <strong>BujIA</strong> + radar comunitario de gasolina.
          </motion.p>

          <button type="button" className="lobby-mobile-cta" onClick={scrollToAuth}>
            Entrar al Garaje <ArrowRight size={18} />
          </button>

          <div className="lobby-features">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} className="lobby-feature-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 + i * 0.06 }} whileHover={{ y: -2, scale: 1.01 }}>
                  <div className="lobby-feature-icon"><Icon size={18} strokeWidth={2.5} /></div>
                  <div className="lobby-feature-copy">
                    <div className="lobby-feature-title">{f.emoji} {f.title}</div>
                    <div className="lobby-feature-desc">{f.desc}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="lobby-auth-wrap" ref={authRef} id="acceso">
          <motion.div className="lobby-auth-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
            <div className="lobby-auth-head">
              <div className="lobby-brand">Acceso al Garaje</div>
              <p className="lobby-auth-tag">Entra o crea tu cuenta en segundos</p>
            </div>

            <div className="lobby-tabs" role="tablist" aria-label="Acceso">
              <button type="button" role="tab" aria-selected={tab === 'login'} className={`lobby-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Iniciar Sesión</button>
              <button type="button" role="tab" aria-selected={tab === 'register'} className={`lobby-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Crear Cuenta</button>
            </div>

            {error && <div className="lobby-alert lobby-alert-error">{error}</div>}
            {info && <div className="lobby-alert lobby-alert-info">{info}</div>}

            <form onSubmit={handleSubmit} className="lobby-form">
              <label className="lobby-label" htmlFor="lobby-email">Correo electrónico</label>
              <div className="lobby-input-wrap">
                <Mail size={18} className="lobby-input-icon" />
                <input id="lobby-email" type="email" autoComplete="email" inputMode="email" placeholder="piloto@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="lobby-input" />
              </div>

              <label className="lobby-label" htmlFor="lobby-pass">Contraseña</label>
              <div className="lobby-input-wrap">
                <Lock size={18} className="lobby-input-icon" />
                <input id="lobby-pass" type={showPassword ? 'text' : 'password'} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className="lobby-input lobby-input-pass" />
                <button type="button" className="lobby-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button type="submit" className="lobby-submit" disabled={loading}>
                {loading ? <Loader2 size={18} className="lobby-spin" /> : null}
                {loading ? 'Procesando...' : tab === 'login' ? 'Entrar al Garaje' : 'Crear mi cuenta'}
              </button>
            </form>

            <button type="button" className="lobby-link" onClick={() => { setRecoverMode((v) => !v); setRecoverMsg(''); setRecoverErr(''); }}>
              <KeyRound size={14} /> ¿Olvidaste tu contraseña?
            </button>

            {recoverMode && (
              <form onSubmit={handleRecover} className="lobby-recover">
                <label className="lobby-label" htmlFor="recover-email">Recuperar acceso</label>
                <div className="lobby-input-wrap">
                  <Mail size={18} className="lobby-input-icon" />
                  <input id="recover-email" type="email" autoComplete="email" inputMode="email" placeholder="Tu correo registrado" value={recoverEmail} onChange={(e) => setRecoverEmail(e.target.value)} className="lobby-input" />
                </div>
                {recoverErr && <div className="lobby-alert lobby-alert-error">{recoverErr}</div>}
                {recoverMsg && <div className="lobby-alert lobby-alert-info">{recoverMsg}</div>}
                <button type="submit" className="lobby-submit lobby-submit-secondary" disabled={recoverLoading}>
                  {recoverLoading ? <Loader2 size={18} className="lobby-spin" /> : null}
                  {recoverLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            )}
          </motion.div>
        </section>
      </div>
    </div>
  );
}
