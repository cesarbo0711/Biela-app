import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Check,
  Clock,
  FileText,
  Fuel,
  Gauge,
  LifeBuoy,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { supabase } from '../supabase';
import Garage from './Garage';
import { GarageSkeleton } from '../components/BielaSkeletons.jsx';
import './Dashboard.css';

function obtenerNombrePiloto(usuario, perfilNombre) {
  return (
    perfilNombre?.trim() ||
    usuario?.user_metadata?.nombre ||
    usuario?.user_metadata?.full_name ||
    usuario?.email?.split('@')[0] ||
    'Piloto'
  );
}

function obtenerSaludo(hora) {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatearKm(valor) {
  return Number(valor || 0).toLocaleString('es-VE');
}

function evaluarPreventivo(motos, servicios) {
  if (!motos.length) {
    return {
      label: '🟢 Garaje listo',
      detail: 'Registra tu primera moto para empezar',
      tone: 'ok',
    };
  }

  const ultimoPorMoto = new Map();
  servicios.forEach((servicio) => {
    const actual = ultimoPorMoto.get(servicio.moto_id);
    const fecha = String(servicio.fecha_servicio || '');
    if (!actual || fecha.localeCompare(String(actual.fecha_servicio || '')) > 0) {
      ultimoPorMoto.set(servicio.moto_id, servicio);
    }
  });

  let masUrgente = null;
  motos.forEach((moto) => {
    const servicio = ultimoPorMoto.get(moto.id);
    if (!servicio) return;
    const intervalo = Number(servicio.catalogo_servicios?.intervalo_km) || 0;
    const restante = Number(servicio.km_al_momento || 0) + intervalo - Number(moto.kilometraje || 0);
    if (!masUrgente || restante < masUrgente.restante) {
      masUrgente = { restante, moto };
    }
  });

  if (!masUrgente) {
    return {
      label: '🟠 Sin servicios registrados',
      detail: 'Añade tu primer mantenimiento en la bitácora',
      tone: 'warn',
    };
  }

  const km = Math.abs(Math.round(masUrgente.restante));
  const vehiculo = `${masUrgente.moto.marca} ${masUrgente.moto.modelo}`.trim();

  if (masUrgente.restante <= 0) {
    return { label: '🔴 Servicio vencido', detail: `${vehiculo} · ${km} km de retraso`, tone: 'danger' };
  }
  if (masUrgente.restante <= 300) {
    return { label: `🟠 Próximo cambio en ${km} km`, detail: vehiculo, tone: 'warn' };
  }
  return { label: '🟢 Todo al día', detail: `Próximo service en ${km} km · ${vehiculo}`, tone: 'ok' };
}

export default function Dashboard({ usuario }) {
  const navigate = useNavigate();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [pilotName, setPilotName] = useState('');
  const [perfilNombre, setPerfilNombre] = useState('');
  const [city, setCity] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [onboardingError, setOnboardingError] = useState('');
  const [motos, setMotos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [abrirModalVehiculo, setAbrirModalVehiculo] = useState(false);
  const [reloj, setReloj] = useState(() => new Date());

  useEffect(() => {
    const temporizador = window.setInterval(() => setReloj(new Date()), 30000);
    return () => window.clearInterval(temporizador);
  }, []);

  useEffect(() => {
    let active = true;

    async function verificarPerfil() {
      if (!usuario?.id) {
        if (active) setCheckingOnboarding(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('perfiles')
          .select('nombre, residencia, avatar_seed, onboarding_completado')
          .eq('id', usuario.id)
          .maybeSingle();

        if (error) throw error;

        if (active) {
          setPerfilNombre(data?.nombre || '');
          setCity(data?.residencia || '');
        }

        const needsOnboarding = !data || data.onboarding_completado === false || data.onboarding_completado == null;
        if (active && needsOnboarding) {
          setPilotName(data?.nombre || '');
          setCity(data?.residencia || '');
          setAvatarSeed(
            data?.avatar_seed ||
              Math.random().toString(36).slice(2, 10)
          );
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error('Error verificando perfil:', err);
      } finally {
        if (active) setCheckingOnboarding(false);
      }
    }

    verificarPerfil();
    return () => {
      active = false;
    };
  }, [usuario?.id]);

  const cargarDatos = useCallback(async () => {
    await Promise.resolve();
    if (!usuario?.id) {
      setMotos([]);
      setServicios([]);
      setCargandoDatos(false);
      return;
    }

    setCargandoDatos(true);
    try {
      const { data: motosData, error: motosError } = await supabase
        .from('motos')
        .select('*')
        .eq('user_id', usuario.id)
        .order('created_at', { ascending: false });

      if (motosError) throw motosError;
      const listaMotos = motosData || [];
      setMotos(listaMotos);

      if (listaMotos.length === 0) {
        setServicios([]);
        return;
      }

      const ids = listaMotos.map((moto) => moto.id);
      const { data: serviciosData, error: serviciosError } = await supabase
        .from('bitacora_servicios')
        .select('id, moto_id, km_al_momento, fecha_servicio, notas, catalogo_servicios (nombre, intervalo_km)')
        .in('moto_id', ids)
        .order('fecha_servicio', { ascending: false });

      if (serviciosError) throw serviciosError;
      setServicios(serviciosData || []);
    } catch (err) {
      console.error('Error cargando el garaje:', err);
    } finally {
      setCargandoDatos(false);
    }
  }, [usuario]);

  useEffect(() => {
    Promise.resolve().then(cargarDatos);
  }, [cargarDatos]);

  const avatarUrl = useMemo(() => {
    const seed = avatarSeed || pilotName || perfilNombre || usuario?.email || 'piloto';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  }, [avatarSeed, pilotName, perfilNombre, usuario?.email]);

  const refreshAvatar = () => {
    setAvatarSeed(Math.random().toString(36).slice(2, 10));
  };

  const completarOnboarding = async (skip = false) => {
    if (!usuario?.id) return;
    setSavingOnboarding(true);
    setOnboardingError('');
    try {
      const payload = {
        id: usuario.id,
        onboarding_completado: true,
        avatar_seed: avatarSeed || Math.random().toString(36).slice(2, 10),
        updated_at: new Date().toISOString(),
      };
      if (!skip) {
        payload.nombre = pilotName.trim();
        payload.residencia = city.trim();
      } else {
        if (pilotName.trim()) payload.nombre = pilotName.trim();
        if (city.trim()) payload.residencia = city.trim();
      }

      const { error } = await supabase.from('perfiles').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      if (payload.nombre) setPerfilNombre(payload.nombre);
      setShowOnboarding(false);
    } catch (err) {
      console.error('Error guardando onboarding:', err);
      setOnboardingError('No se pudo guardar tu perfil. Intenta de nuevo.');
    } finally {
      setSavingOnboarding(false);
    }
  };

  const nombrePiloto = obtenerNombrePiloto(usuario, perfilNombre);
  const saludo = obtenerSaludo(reloj.getHours());
  const horaActual = reloj.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  const fechaActual = reloj.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' });
  const kilometrajeTotal = motos.reduce((total, moto) => total + Number(moto.kilometraje || 0), 0);
  const preventivo = useMemo(() => evaluarPreventivo(motos, servicios), [motos, servicios]);
  const motoActiva = motos[0] || null;
  const exportarHoja = (moto = motoActiva) => {
    if (!moto) {
      setAbrirModalVehiculo(true);
      return;
    }
    navigate(`/moto/${moto.id}?exportar=pdf`);
  };

  return (
    <div className="dashboard-layout">
      <main className="dashboard-content pb-28">
        <div className="cockpit-shell">
          <header className="cockpit-topbar">
            <div className="cockpit-identity">
              <div className="cockpit-avatar-wrap">
                <img src={avatarUrl} alt={`Avatar de ${nombrePiloto}`} />
                <span className="cockpit-avatar-status" />
              </div>
              <div className="cockpit-identity-copy">
                <span className="cockpit-status-badge"><Sparkles size={13} /> ● EN RUTA • GARAJE DIGITAL</span>
                <h1>{saludo}, <span>{nombrePiloto}</span>.</h1>
                <p>Tu flota, tu bitácora y tu ruta bajo control.</p>
              </div>
            </div>

            <div className="cockpit-topbar-actions">
              <div className="cockpit-clock">
                <Clock size={16} />
                <div>
                  <strong>{horaActual}</strong>
                  <span>{fechaActual} · {motos.length} {motos.length === 1 ? 'vehículo' : 'vehículos'}</span>
                </div>
              </div>
              <button type="button" className="cockpit-add-btn" onClick={() => setAbrirModalVehiculo(true)}>
                <Plus size={18} strokeWidth={3} /> Añadir Vehículo
              </button>
            </div>
          </header>

          <section className="cockpit-summary" aria-label="Resumen de flota">
            <article className="cockpit-card cockpit-card-odometer">
              <div className="cockpit-card-top">
                <span className="cockpit-card-icon"><Gauge size={19} /></span>
                <span className="cockpit-card-tag">FLOTA</span>
              </div>
              <span className="cockpit-card-label">Odómetro Total</span>
              <strong className="cockpit-card-value">{formatearKm(kilometrajeTotal)} <small>KM</small></strong>
              <span className="cockpit-card-foot">{motos.length} {motos.length === 1 ? 'nave registrada' : 'naves registradas'}</span>
            </article>

            <article className={`cockpit-card cockpit-card-service tone-${preventivo.tone}`}>
              <div className="cockpit-card-top">
                <span className="cockpit-card-icon"><ShieldCheck size={19} /></span>
                <span className="cockpit-card-tag">PREVENTIVO</span>
              </div>
              <span className="cockpit-card-label">Aceite / Servicios</span>
              <strong className="cockpit-card-value cockpit-card-value-text">{preventivo.label}</strong>
              <span className="cockpit-card-foot">{preventivo.detail}</span>
            </article>

            <button type="button" className="cockpit-card cockpit-card-action" onClick={() => navigate('/chat')}>
              <div className="cockpit-card-top">
                <span className="cockpit-card-icon"><Bot size={19} /></span>
                <span className="cockpit-card-tag">IA</span>
              </div>
              <span className="cockpit-card-label">Mecánico Inteligente</span>
              <strong className="cockpit-card-value cockpit-card-value-text">Consultar al Mecánico IA</strong>
              <span className="cockpit-card-foot cockpit-card-cta">Abrir BujIA <ArrowRight size={14} /></span>
            </button>

            <div className="cockpit-card cockpit-card-radar">
              <div className="cockpit-card-top">
                <span className="cockpit-card-icon"><LifeBuoy size={19} /></span>
                <span className="cockpit-card-tag">RUTA</span>
              </div>
              <span className="cockpit-card-label">Radar & Auxilio Vial</span>
              <div className="cockpit-radar-actions">
                <button type="button" onClick={() => navigate('/mapa')}><MapPin size={15} /> Estaciones</button>
                <button type="button" onClick={() => navigate('/tiendas')}><Wrench size={15} /> Auxilio 24/7</button>
              </div>
            </div>
          </section>

          {cargandoDatos ? (
            <GarageSkeleton />
          ) : (
            <Garage
              usuario={usuario}
              motos={motos}
              servicios={servicios}
              recargar={cargarDatos}
              abrirModalAdd={abrirModalVehiculo}
              setAbrirModalAdd={setAbrirModalVehiculo}
              onExportar={exportarHoja}
            />
          )}

          <section className="cockpit-utilities" aria-label="Centro de Utilidades Biela">
            <div className="cockpit-utilities-head">
              <span className="landing-section-label cockpit-utilities-label">CENTRO DE UTILIDADES BIELA</span>
              <h2>Todo listo para tu próxima ruta.</h2>
              <p>Herramientas que convierten cada kilómetro en valor y tranquilidad.</p>
            </div>
            <div className="cockpit-utilities-grid">
              <button type="button" className="utility-card utility-passport" onClick={exportarHoja}>
                <span className="utility-icon"><FileText size={22} /></span>
                <span className="utility-copy">
                  <strong>Pasaporte Digital</strong>
                  <small>Hoja de Vida PDF lista para un traspaso transparente.</small>
                </span>
                <ArrowRight size={18} />
              </button>
              <button type="button" className="utility-card utility-rescue" onClick={() => navigate('/tiendas')}>
                <span className="utility-icon"><LifeBuoy size={22} /></span>
                <span className="utility-copy">
                  <strong>Auxilio Vial 24/7</strong>
                  <small>Caucheras, grúas y repuestos con un toque a WhatsApp.</small>
                </span>
                <ArrowRight size={18} />
              </button>
              <button type="button" className="utility-card utility-radar" onClick={() => navigate('/mapa')}>
                <span className="utility-icon"><Fuel size={22} /></span>
                <span className="utility-copy">
                  <strong>Radar de Estaciones</strong>
                  <small>Reportes en vivo de bombas surtiendo cerca de ti.</small>
                </span>
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        </div>
      </main>

      {!checkingOnboarding && showOnboarding && (
        <div className="biela-onboarding-overlay">
          <div className="biela-onboarding-panel">
            <div className="biela-onboarding-head">
              <span className="biela-onboarding-badge"><Check size={12} strokeWidth={3} /> Licencia de Piloto</span>
              <h2 className="text-2xl font-black tracking-tight">Configura tu Licencia de Piloto</h2>
              <p className="text-sm text-neutral-400 mt-1">Personaliza tu perfil para que BujIA te reconozca en el garaje. Toma menos de 10 segundos.</p>
            </div>

            <div className="biela-onboarding-body">
              <div className="biela-onboarding-avatar">
                <div className="biela-onboarding-avatar-img">
                  <img src={avatarUrl} alt="Avatar de piloto" />
                </div>
                <div>
                  <p className="biela-onboarding-label">Avatar en vivo</p>
                  <button type="button" onClick={refreshAvatar} className="biela-onboarding-avatar-btn">
                    <span aria-hidden="true">🎲</span> Cambiar avatar
                  </button>
                </div>
              </div>

              <div className="biela-onboarding-fields">
                <div>
                  <label className="biela-onboarding-label" htmlFor="onboarding-nombre">Nombre / Apodo de Piloto</label>
                  <input
                    id="onboarding-nombre"
                    type="text"
                    value={pilotName}
                    onChange={(e) => setPilotName(e.target.value)}
                    placeholder="Ej. César, El Turbio, Rider92"
                    className="biela-onboarding-input"
                  />
                </div>
                <div>
                  <label className="biela-onboarding-label" htmlFor="onboarding-ciudad">Ciudad / Estado</label>
                  <input
                    id="onboarding-ciudad"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ej. San Juan de los Morros, Guárico"
                    className="biela-onboarding-input"
                  />
                </div>
              </div>

              {onboardingError && <div className="biela-onboarding-error">{onboardingError}</div>}

              <div className="biela-onboarding-actions">
                <button type="button" onClick={() => completarOnboarding(true)} disabled={savingOnboarding} className="biela-onboarding-secondary">
                  Más tarde
                </button>
                <button type="button" onClick={() => completarOnboarding(false)} disabled={savingOnboarding} className="biela-onboarding-primary">
                  {savingOnboarding ? 'Guardando...' : 'Guardar y entrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
