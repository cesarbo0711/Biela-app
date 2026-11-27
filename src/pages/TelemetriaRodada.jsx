import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Gauge,
  MapPin,
  Navigation,
  Route,
  Timer,
  Zap,
} from 'lucide-react';
import { supabase } from '../supabase';
import SlideToConfirm from '../components/SlideToConfirm';
import TarjetaRodadaShare from '../components/TarjetaRodadaShare';
import ModalEmergenciaRuta from '../components/ModalEmergenciaRuta';

const VELOCIDAD_MAX_REALISTA = 180;

const RUTA_DEMO = [
  { lat: 10.4807, lng: -66.9036 },
  { lat: 10.4852, lng: -66.8874 },
  { lat: 10.4928, lng: -66.8715 },
  { lat: 10.5013, lng: -66.8582 },
  { lat: 10.5127, lng: -66.8491 },
  { lat: 10.5218, lng: -66.8375 },
  { lat: 10.5174, lng: -66.8207 },
  { lat: 10.5069, lng: -66.8093 },
  { lat: 10.4942, lng: -66.8018 },
];

function haversine(origen, destino) {
  const radio = 6371;
  const aRad = (origen.lat * Math.PI) / 180;
  const bRad = (destino.lat * Math.PI) / 180;
  const dLat = ((destino.lat - origen.lat) * Math.PI) / 180;
  const dLng = ((destino.lng - origen.lng) * Math.PI) / 180;
  const senoLat = Math.sin(dLat / 2);
  const senoLng = Math.sin(dLng / 2);
  const h = senoLat * senoLat + Math.cos(aRad) * Math.cos(bRad) * senoLng * senoLng;
  return 2 * radio * Math.asin(Math.sqrt(h));
}

function puntoDemo(segundos) {
  const tramo = Math.floor(segundos / 18) % (RUTA_DEMO.length - 1);
  const progreso = (segundos % 18) / 18;
  const actual = RUTA_DEMO[tramo];
  const siguiente = RUTA_DEMO[tramo + 1];
  return {
    lat: actual.lat + (siguiente.lat - actual.lat) * progreso,
    lng: actual.lng + (siguiente.lng - actual.lng) * progreso,
  };
}

function instantanea(datos) {
  return {
    velocidad: datos.velActual,
    distancia: datos.distancia,
    velocidadMax: datos.velMax,
    ruta: [...datos.ruta],
  };
}

function formatearTiempo(segundos) {
  const total = Math.max(0, Math.round(Number(segundos) || 0));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((valor) => String(valor).padStart(2, '0'))
    .join(':');
}

const ESTADOS_GPS = {
  solicitando: 'Buscando GPS...',
  activo: 'GPS activo',
  denegado: 'GPS denegado',
  unsupported: 'Sin GPS en este equipo',
  error: 'Señal GPS interrumpida',
  demo: 'Ruta simulada',
};

export default function TelemetriaRodada() {
  const { motoId } = useParams();
  const navigate = useNavigate();

  const [fase, setFase] = useState('activa');
  const [moto, setMoto] = useState(null);
  const [cargandoMoto, setCargandoMoto] = useState(true);
  const [estadoGps, setEstadoGps] = useState('solicitando');
  const [estadoWakeLock, setEstadoWakeLock] = useState('idle');
  const [demo, setDemo] = useState(false);
  const [horaActual, setHoraActual] = useState(0);
  const [inicioTs, setInicioTs] = useState(0);
  const [medicion, setMedicion] = useState({ velocidad: 0, distancia: 0, velocidadMax: 0, ruta: [] });
  const [resumen, setResumen] = useState(null);
  const [mostrarEmergencia, setMostrarEmergencia] = useState(false);

  const datosRef = useRef({
    velActual: 0,
    distancia: 0,
    velMax: 0,
    ruta: [],
    ultimaPos: null,
  });
  const demoInicioRef = useRef(null);
  const watchIdRef = useRef(null);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    let activo = true;
    supabase
      .from('motos')
      .select('id, marca, modelo, year, kilometraje, imagen_url')
      .eq('id', motoId)
      .single()
      .then(({ data, error }) => {
        if (!activo) return;
        if (!error && data) setMoto(data);
        setCargandoMoto(false);
      });
    return () => { activo = false; };
  }, [motoId]);

  useEffect(() => {
    const ahora = Date.now();
    const inicio = window.setTimeout(() => {
      setInicioTs(ahora);
      setHoraActual(ahora);
    }, 0);
    const temporizador = window.setInterval(() => setHoraActual(Date.now()), 1000);
    return () => {
      window.clearTimeout(inicio);
      window.clearInterval(temporizador);
    };
  }, []);

  useEffect(() => {
    if (fase !== 'activa') return undefined;
    let cancelado = false;

    const solicitar = async () => {
      if (!('wakeLock' in navigator)) {
        setEstadoWakeLock('unsupported');
        return;
      }
      try {
        const bloqueo = await navigator.wakeLock.request('screen');
        if (cancelado) {
          await bloqueo.release();
          return;
        }
        wakeLockRef.current = bloqueo;
        setEstadoWakeLock('active');
        bloqueo.addEventListener?.('release', () => {
          if (!cancelado) setEstadoWakeLock('released');
        });
      } catch {
        if (!cancelado) setEstadoWakeLock('denied');
      }
    };

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') solicitar();
    };

    solicitar();
    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      wakeLockRef.current?.release?.().catch?.(() => {});
      wakeLockRef.current = null;
    };
  }, [fase]);

  useEffect(() => {
    if (fase !== 'activa' || demo) return undefined;
    if (!navigator.geolocation) {
      const aviso = window.setTimeout(() => setEstadoGps('unsupported'), 0);
      return () => window.clearTimeout(aviso);
    }

    const aviso = window.setTimeout(() => setEstadoGps('solicitando'), 0);
    const identificador = navigator.geolocation.watchPosition(
      (posicion) => {
        setEstadoGps('activo');
        const ahora = Date.now();
        const datos = datosRef.current;
        const velocidadKmh = Number.isFinite(posicion.coords.speed)
          ? Math.max(0, posicion.coords.speed * 3.6)
          : 0;
        datos.velActual = velocidadKmh;

        const punto = { lat: posicion.coords.latitude, lng: posicion.coords.longitude };
        if (velocidadKmh < 2 || !Number.isFinite(punto.lat) || !Number.isFinite(punto.lng)) {
          setMedicion(instantanea(datos));
          return;
        }

        if (!datos.ultimaPos) {
          datos.ultimaPos = { ...punto, t: ahora };
          datos.ruta.push(punto);
          datos.velMax = Math.max(datos.velMax, velocidadKmh);
          setMedicion(instantanea(datos));
          return;
        }

        const segundos = Math.max(0.2, (ahora - datos.ultimaPos.t) / 1000);
        const distancia = haversine(datos.ultimaPos, punto);
        const saltoMaximo = (segundos / 3600) * VELOCIDAD_MAX_REALISTA + 0.05;

        if (distancia <= saltoMaximo) {
          datos.ultimaPos = { ...punto, t: ahora };
          if (distancia > 0.002) {
            datos.distancia += distancia;
            datos.ruta.push(punto);
            if (datos.ruta.length > 500) datos.ruta.shift();
          }
          datos.velMax = Math.max(datos.velMax, velocidadKmh);
        }

        setMedicion(instantanea(datos));
      },
      (error) => setEstadoGps(error?.code === 1 ? 'denegado' : 'error'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );

    watchIdRef.current = identificador;
    return () => {
      window.clearTimeout(aviso);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [fase, demo]);

  useEffect(() => {
    if (fase !== 'activa' || !demo) return undefined;
    demoInicioRef.current = Date.now();
    const aviso = window.setTimeout(() => setEstadoGps('demo'), 0);
    datosRef.current.ultimaPos = null;

    const temporizador = window.setInterval(() => {
      const segundos = (Date.now() - demoInicioRef.current) / 1000;
      const velocidad = Math.max(18, Math.min(54, 30 + 12 * Math.sin(segundos / 9) + 5 * Math.sin(segundos / 2.2)));
      const datos = datosRef.current;
      datos.velActual = velocidad;
      datos.distancia += velocidad / 3600;
      datos.velMax = Math.max(datos.velMax, velocidad);
      datos.ruta.push(puntoDemo(segundos));
      if (datos.ruta.length > 500) datos.ruta.shift();
      setMedicion(instantanea(datos));
    }, 1000);

    return () => {
      window.clearInterval(temporizador);
      window.clearTimeout(aviso);
    };
  }, [fase, demo]);

  const segundosActivos = fase === 'resumen'
    ? Number(resumen?.duracion_segundos) || 0
    : Math.max(0, Math.floor((horaActual - inicioTs) / 1000));
  const velocidadPromedio = medicion.distancia > 0 && segundosActivos > 0
    ? (medicion.distancia / (segundosActivos / 3600))
    : 0;

  const alternarDemo = () => {
    datosRef.current.ultimaPos = null;
    setDemo((valor) => !valor);
  };

  const handleFinalizarRodada = () => {
    if (fase !== 'activa') return;
    const ahora = Date.now();
    const inicio = inicioTs || ahora;
    const datos = datosRef.current;
    const duracion = Math.max(1, Math.round((ahora - inicio) / 1000));
    const distancia = Number(datos.distancia.toFixed(2));

    setResumen({
      fecha_inicio: new Date(inicio).toISOString(),
      distancia_km: distancia,
      duracion_segundos: duracion,
      velocidad_max_kmh: Number(datos.velMax.toFixed(1)),
      velocidad_promedio_kmh: Number((duracion > 0 ? datos.distancia / (duracion / 3600) : 0).toFixed(1)),
      ruta_coordenadas: [...datos.ruta],
    });
    setDemo(false);
    setFase('resumen');

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    wakeLockRef.current?.release?.().catch?.(() => {});
    wakeLockRef.current = null;
  };

  const handleGuardada = (informacion) => {
    if (informacion?.soloNavegar) {
      navigate(`/moto/${motoId}`);
      return true;
    }
    if (informacion?.sumarOdometro && moto && informacion.kilometrajeActualizado !== null) {
      setMoto({ ...moto, kilometraje: informacion.kilometrajeActualizado });
    }
    return undefined;
  };

  const nombreMoto = [moto?.marca, moto?.modelo].filter(Boolean).join(' ') || 'Tu moto';

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] pb-40">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[var(--bg-base)]/85 px-4 py-3 backdrop-blur-xl dark:border-white/10">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/moto/${motoId}`)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/10 transition-colors hover:border-[#84cc16] dark:border-white/10"
            aria-label="Volver a mi moto"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#84cc16]">Caja negra / Telemetría</p>
            <h1 className="truncate text-sm font-black">{nombreMoto}</h1>
          </div>
          <button
            type="button"
            onClick={() => setMostrarEmergencia(true)}
            title="Auxilio en ruta"
            aria-label="Auxilio en ruta"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-700 transition-colors hover:border-amber-500 dark:text-amber-300"
          >
            <AlertTriangle size={16} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={alternarDemo}
            className="min-h-10 shrink-0 rounded-full border border-black/10 px-3 text-[11px] font-bold transition-colors hover:border-[#84cc16] dark:border-white/10"
          >
            {demo ? 'Detener simulación' : 'Simular Ruta'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6">
        {fase === 'resumen' && resumen ? (
          <TarjetaRodadaShare
            rodada={resumen}
            moto={moto}
            onGuardada={handleGuardada}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${estadoGps === 'activo' || estadoGps === 'demo' ? 'border-[#84cc16]/50 bg-[#84cc16]/10 text-lime-700 dark:text-lime-300' : 'border-black/10 text-[var(--text-muted)] dark:border-white/10'}`}>
                <MapPin size={12} /> {ESTADOS_GPS[estadoGps]}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1 text-[var(--text-muted)] dark:border-white/10">
                <Zap size={12} /> Pantalla {estadoWakeLock === 'active' ? 'despierta' : estadoWakeLock === 'unsupported' ? 'sin bloqueo' : 'en espera'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1 text-[var(--text-muted)] dark:border-white/10">
                <Route size={12} /> {medicion.ruta.length} puntos
              </span>
            </div>

            <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-black/5 bg-[var(--bg-surface)] p-6 shadow-sm dark:border-white/10">
              <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#84cc16]/15 blur-3xl" aria-hidden="true" />
              <div className="relative text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--text-muted)]">Velocidad actual</span>
                <div className="mt-2 flex items-end justify-center gap-2">
                  <strong className="font-mono text-[clamp(4.5rem,18vw,8rem)] font-black leading-none tabular-nums text-[var(--text-main)]">
                    {Math.round(medicion.velocidad)}
                  </strong>
                  <span className="mb-3 text-sm font-black text-[#84cc16]">km/h</span>
                </div>
                <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                  <Navigation size={12} /> Registrando en vivo
                </span>
              </div>
            </section>

            <section className="mt-3 grid grid-cols-2 gap-3">
              {[
                { icon: Route, etiqueta: 'Distancia', valor: medicion.distancia.toFixed(2), unidad: 'km' },
                { icon: Timer, etiqueta: 'Tiempo', valor: formatearTiempo(segundosActivos), unidad: '' },
                { icon: Gauge, etiqueta: 'Vel. máxima', valor: Math.round(medicion.velocidadMax).toString(), unidad: 'km/h' },
                { icon: Gauge, etiqueta: 'Vel. promedio', valor: Math.round(velocidadPromedio).toString(), unidad: 'km/h' },
              ].map((metrica) => {
                const Icono = metrica.icon;
                return (
                  <div key={metrica.etiqueta} className="rounded-2xl border border-black/5 bg-[var(--bg-surface)] p-4 dark:border-white/10">
                    <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">
                      <Icono size={13} strokeWidth={2.2} /> {metrica.etiqueta}
                    </span>
                    <strong className="mt-2 block font-mono text-2xl font-black tabular-nums">
                      {metrica.valor} <span className="text-[10px] font-bold text-[var(--text-muted)]">{metrica.unidad}</span>
                    </strong>
                  </div>
                );
              })}
            </section>

            {cargandoMoto && (
              <p className="mt-5 text-center text-xs text-[var(--text-muted)]">Cargando datos de la moto...</p>
            )}

            <p className="mt-6 text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
              La velocidad se toma del GPS real. Los saltos irreales y el ruido con el moto detenido se descartan automáticamente.
            </p>
          </>
        )}
      </main>

      {fase === 'activa' && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-[var(--bg-base)]/90 px-4 py-5 backdrop-blur-xl dark:border-white/10">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-2">
            <SlideToConfirm
              width={300}
              label="Desliza para finalizar rodada"
              confirmedLabel="Rodada finalizada"
              onConfirm={handleFinalizarRodada}
            />
            <span className="text-center text-[10px] text-[var(--text-muted)]">Evita paradas accidentales con guantes o vibración.</span>
          </div>
        </div>
      )}

      {mostrarEmergencia && (
        <ModalEmergenciaRuta moto={moto} onCerrar={() => setMostrarEmergencia(false)} />
      )}
    </div>
  );
}
