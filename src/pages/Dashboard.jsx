import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import Garage from './Garage';
import AppWalkthrough from '../components/AppWalkthrough';
import { GarageSkeleton } from '../components/BielaSkeletons.jsx';
import './Dashboard.css';

export default function Dashboard({ usuario }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tourSolicitado = searchParams.get('tour') === '1';
  const [showTour, setShowTour] = useState(() => tourSolicitado && Boolean(usuario?.id));
  const [motos, setMotos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [abrirModalVehiculo, setAbrirModalVehiculo] = useState(false);

  useEffect(() => {
    if (!usuario?.id) return undefined;

    let activo = true;
    let temporizador;

    const programarTour = () => {
      if (activo) {
        temporizador = window.setTimeout(() => setShowTour(true), 600);
      }
    };

    if (tourSolicitado) {
      const frame = requestAnimationFrame(() => {
        if (activo) setShowTour(true);
      });
      return () => {
        activo = false;
        cancelAnimationFrame(frame);
      };
    }

    async function verificarTour() {
      try {
        const { data, error } = await supabase
          .from('perfiles')
          .select('onboarding_completado')
          .eq('id', usuario.id)
          .maybeSingle();

        if (error) throw error;
        if (!activo) return;

        const vistoLocal = localStorage.getItem(`biela_tour_visto_${usuario.id}`) === 'true';
        const completado = data?.onboarding_completado === true;
        if (!vistoLocal && !completado) programarTour();
      } catch (err) {
        console.error('Error verificando guía rápida:', err);
        const vistoLocal = localStorage.getItem(`biela_tour_visto_${usuario.id}`) === 'true';
        if (!vistoLocal) programarTour();
      }
    }

    verificarTour();
    return () => {
      activo = false;
      if (temporizador) window.clearTimeout(temporizador);
    };
  }, [usuario?.id, tourSolicitado]);

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

  const finalizarTour = async () => {
    if (!usuario?.id) return;
    localStorage.setItem(`biela_tour_visto_${usuario.id}`, 'true');
    setShowTour(false);

    try {
      await supabase.from('perfiles').upsert({
        id: usuario.id,
        onboarding_completado: true,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error guardando guía rápida:', err);
    }

    if (tourSolicitado) setSearchParams({}, { replace: true });
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

      {showTour && <AppWalkthrough onClose={finalizarTour} />}
    </div>
  );
}
