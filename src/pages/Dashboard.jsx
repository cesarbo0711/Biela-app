import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';
import Garage from './Garage';
import { GarageSkeleton } from '../components/BielaSkeletons.jsx';
import './Dashboard.css';

export default function Dashboard({ usuario }) {
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [pilotName, setPilotName] = useState('');
  const [perfilNombre, setPerfilNombre] = useState('');
  const [city, setCity] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [avatarStyle, setAvatarStyle] = useState('notionists');
  const [avatarUrlGuardada, setAvatarUrlGuardada] = useState('');
  const [onboardingError, setOnboardingError] = useState('');
  const [motos, setMotos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [abrirModalVehiculo, setAbrirModalVehiculo] = useState(false);

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
          .select('nombre, residencia, avatar_seed, avatar_style, avatar_url, onboarding_completado')
          .eq('id', usuario.id)
          .maybeSingle();

        if (error) throw error;

        if (active) {
          setPerfilNombre(data?.nombre || '');
          setCity(data?.residencia || '');
          setAvatarStyle(data?.avatar_style || 'notionists');
          setAvatarUrlGuardada(data?.avatar_url || '');
        }

        const needsOnboarding = !data || data.onboarding_completado === false || data.onboarding_completado == null;
        if (active && needsOnboarding) {
          setPilotName(data?.nombre || '');
          setCity(data?.residencia || '');
          setAvatarSeed(data?.avatar_seed || Math.random().toString(36).slice(2, 10));
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
    return avatarUrlGuardada || `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${encodeURIComponent(seed)}`;
  }, [avatarSeed, avatarStyle, avatarUrlGuardada, pilotName, perfilNombre, usuario?.email]);

  const refreshAvatar = () => {
    setAvatarSeed(Math.random().toString(36).slice(2, 10));
    setAvatarUrlGuardada('');
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
        avatar_style: avatarStyle,
        avatar_url: avatarUrlGuardada || null,
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

  return (
    <div className="dashboard-layout">
      <main className="dashboard-content pb-28">
        <div className="dashboard-shell max-w-4xl mx-auto">
          <header className="dashboard-header">
            <div className="dashboard-heading">
              <h1>
                Garaje
                {motos.length > 1 && <span className="dashboard-count tabular-nums">{motos.length}</span>}
              </h1>
            </div>
            <button type="button" className="dashboard-add" onClick={() => setAbrirModalVehiculo(true)}>
              <Plus size={16} strokeWidth={2.5} /> Añadir
            </button>
          </header>

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
            />
          )}
        </div>
      </main>

      {!checkingOnboarding && showOnboarding && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal gpane">
            <div className="dashboard-modal-head">
              <span className="dashboard-modal-badge">Perfil de piloto</span>
              <h2>Configura tu garaje</h2>
              <p>Un perfil simple para personalizar tu experiencia.</p>
            </div>

            <div className="dashboard-modal-body">
              <div className="dashboard-modal-avatar">
                <img src={avatarUrl} alt="Avatar de piloto" />
                <button type="button" onClick={refreshAvatar} className="dashboard-modal-refresh">
                  <RefreshCw size={14} /> Cambiar avatar
                </button>
              </div>

              <div className="dashboard-modal-fields">
                <div className="dashboard-modal-field">
                  <label htmlFor="onboarding-nombre">Nombre o apodo</label>
                  <input
                    id="onboarding-nombre"
                    type="text"
                    value={pilotName}
                    onChange={(e) => setPilotName(e.target.value)}
                    placeholder="Cómo quieres que te llame BujIA"
                  />
                </div>
                <div className="dashboard-modal-field">
                  <label htmlFor="onboarding-ciudad">Ciudad o estado</label>
                  <input
                    id="onboarding-ciudad"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Tu ubicación aproximada"
                  />
                </div>
              </div>

              {onboardingError && <div className="dashboard-modal-error">{onboardingError}</div>}

              <div className="dashboard-modal-actions">
                <button type="button" onClick={() => completarOnboarding(true)} disabled={savingOnboarding} className="dashboard-modal-secondary">
                  Más tarde
                </button>
                <button type="button" onClick={() => completarOnboarding(false)} disabled={savingOnboarding} className="dashboard-modal-primary">
                  {savingOnboarding ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
