import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import Garage from './Garage';
import './Dashboard.css';

export default function Dashboard({ usuario }) {
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [pilotName, setPilotName] = useState('');
  const [city, setCity] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [onboardingError, setOnboardingError] = useState('');

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

  const avatarUrl = useMemo(() => {
    const seed = avatarSeed || pilotName || usuario?.email || 'piloto';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  }, [avatarSeed, pilotName, usuario?.email]);

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
      <main className="dashboard-content">
        <Garage usuario={usuario} />
      </main>

      {!checkingOnboarding && showOnboarding && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#121212]/95 dark:bg-[#121212]/95 text-white shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-white/10 bg-gradient-to-b from-lime-500/10 to-transparent">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-lime-400/30 bg-lime-400/10 text-lime-300 text-[10px] font-extrabold tracking-widest uppercase mb-3">
                Licencia de Piloto
              </div>
              <h2 className="text-2xl font-black tracking-tight">Configura tu Licencia de Piloto</h2>
              <p className="text-sm text-neutral-400 mt-1">Personaliza tu perfil para que BujIA te reconozca en el garaje. Toma menos de 10 segundos.</p>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-lime-400/50 bg-neutral-900 shrink-0">
                  <img src={avatarUrl} alt="Avatar de piloto" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 mb-2">Avatar en vivo</p>
                  <button
                    type="button"
                    onClick={refreshAvatar}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold transition-colors"
                  >
                    <span aria-hidden="true">🎲</span> Cambiar avatar
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-1.5">Nombre / Apodo de Piloto</label>
                  <input
                    type="text"
                    value={pilotName}
                    onChange={(e) => setPilotName(e.target.value)}
                    placeholder="Ej. César, El Turbio, Rider92"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-1.5">Ciudad / Estado</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ej. San Juan de los Morros, Guárico"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/20"
                  />
                </div>
              </div>

              {onboardingError && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {onboardingError}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => completarOnboarding(true)}
                  disabled={savingOnboarding}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3 text-sm font-bold text-neutral-200 transition-colors disabled:opacity-60"
                >
                  Más tarde
                </button>
                <button
                  type="button"
                  onClick={() => completarOnboarding(false)}
                  disabled={savingOnboarding}
                  className="flex-1 rounded-xl bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-300 hover:to-lime-400 px-4 py-3 text-sm font-extrabold text-black shadow-lg shadow-lime-500/20 transition-all disabled:opacity-60"
                >
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
