import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Gauge,
  MapPin,
  Mic,
  MicOff,
  Music2,
  Navigation,
  Pause,
  Play,
  Route,
  SkipForward,
  Timer,
  Volume2,
  Zap,
} from 'lucide-react';
import { supabase } from '../supabase';
import SlideToConfirm from '../components/SlideToConfirm';
import TarjetaRodadaShare from '../components/TarjetaRodadaShare';
import ModalEmergenciaRuta from '../components/ModalEmergenciaRuta';
import LiquidToggle from '../components/LiquidToggle';
import useCopilotoVoz, { hablarComoBiela } from '../hooks/useCopilotoVoz';

const VELOCIDAD_MAX_REALISTA = 180;

const PISTAS_DEFAULT = [
  {
    id: 'ambiental-1',
    nombre: 'Ruta suave',
    artista: 'Biela Ambient',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'ambiental-2',
    nombre: 'Carretera abierta',
    artista: 'Biela Ambient',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'ambiental-3',
    nombre: 'Viaje nocturno',
    artista: 'Biela Ambient',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

function normalizarComando(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

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
  const [sumarOdometro, setSumarOdometro] = useState(true);
  const [mostrarEmergencia, setMostrarEmergencia] = useState(false);
  const [copilotoActivo, setCopilotoActivo] = useState(false);
  const [rodadaPausada, setRodadaPausada] = useState(false);
  const [pausaInicio, setPausaInicio] = useState(0);
  const [tiempoPausado, setTiempoPausado] = useState(0);
  const [pistas, setPistas] = useState(PISTAS_DEFAULT);
  const [indicePista, setIndicePista] = useState(0);
  const [volumen, setVolumen] = useState(0.7);
  const [reproduciendo, setReproduciendo] = useState(false);

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
  const audioRef = useRef(null);
  const archivoAudioRef = useRef(null);
  const urlsLocalesRef = useRef([]);

  const ajustarVolumen = useCallback((delta) => {
    const audio = audioRef.current;
    const actual = Number.isFinite(audio?.volume) ? audio.volume : volumen;
    const siguiente = Math.min(1, Math.max(0.1, Number((actual + delta).toFixed(2))));
    if (audio) audio.volume = siguiente;
    setVolumen(siguiente);
    hablarComoBiela(delta < 0 ? 'Bajando volumen' : 'Subiendo volumen');
  }, [volumen]);

  const pausarMusica = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !pistas.length) {
      hablarComoBiela('No tienes música cargada en el reproductor de ruta.');
      return;
    }
    audio.pause();
    setReproduciendo(false);
    hablarComoBiela('Música pausada');
  }, [pistas.length]);

  const reproducirMusica = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !pistas.length) {
      hablarComoBiela('No tienes música cargada en el reproductor de ruta.');
      return;
    }
    audio.play()
      .then(() => {
        setReproduciendo(true);
        hablarComoBiela('Reproduciendo música');
      })
      .catch(() => {
        setReproduciendo(false);
        hablarComoBiela('No pude reproducir la música. Revisa la pista.');
      });
  }, [pistas.length]);

  const cambiarPista = useCallback((delta, anunciar = true) => {
    if (!pistas.length) {
      hablarComoBiela('No tienes pistas cargadas. Puedes cargar música desde tu teléfono.');
      return;
    }
    setIndicePista((actual) => (actual + delta + pistas.length) % pistas.length);
    if (anunciar) hablarComoBiela(delta < 0 ? 'Pista anterior' : 'Siguiente pista');
  }, [pistas.length]);

  const cargarArchivos = useCallback((evento) => {
    const archivos = Array.from(evento.target.files || []).filter((archivo) =>
      archivo.type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|wav|webm)$/i.test(archivo.name),
    );
    if (!archivos.length) return;

    const nuevas = archivos.map((archivo) => {
      const url = URL.createObjectURL(archivo);
      urlsLocalesRef.current.push(url);
      return {
        id: url,
        nombre: archivo.name.replace(/\.[^.]+$/, ''),
        artista: 'Tu teléfono',
        src: url,
      };
    });

    setPistas((actual) => [...actual, ...nuevas]);
    evento.target.value = '';
    hablarComoBiela(`${nuevas.length} ${nuevas.length === 1 ? 'pista cargada' : 'pistas cargadas'} desde tu teléfono`);
  }, []);

  const pausarRodada = useCallback(() => {
    if (fase !== 'activa' || rodadaPausada) {
      hablarComoBiela('La rodada ya está pausada');
      return;
    }
    setPausaInicio(Date.now());
    setRodadaPausada(true);
    hablarComoBiela('Rodada pausada');
  }, [fase, rodadaPausada]);

  const reanudarRodada = useCallback(() => {
    if (fase !== 'activa' || !rodadaPausada) {
      hablarComoBiela('La rodada ya está en marcha');
      return;
    }
    const inicio = pausaInicio || Date.now();
    setTiempoPausado((actual) => actual + Math.max(0, Date.now() - inicio));
    setPausaInicio(0);
    setRodadaPausada(false);
    hablarComoBiela('Rodada reanudada');
  }, [fase, pausaInicio, rodadaPausada]);

  const procesarComando = useCallback((texto) => {
    const comando = normalizarComando(texto);
    if (!comando) {
      hablarComoBiela('No entendí el comando');
      return;
    }

    if (/(emergencia|auxilio)/.test(comando)) {
      setMostrarEmergencia(true);
      hablarComoBiela('Abriendo auxilio en ruta');
      return;
    }

    if (/(pausa|detener|para).*(rodada)|(rodada).*(pausa)/.test(comando)) {
      pausarRodada();
      return;
    }

    if (/(reanuda|reanudar|continua).*(rodada)|(rodada).*(reanuda)/.test(comando)) {
      reanudarRodada();
      return;
    }

    if (/(baja|bajar|reduce|reducir).*(musica|volumen)|(musica|volumen).*(baja|reducir)/.test(comando)) {
      ajustarVolumen(-0.25);
      return;
    }

    if (/(sube|subir|aumenta|aumentar).*(musica|volumen)|(musica|volumen).*(sube|aumenta)/.test(comando)) {
      ajustarVolumen(0.25);
      return;
    }

    if (/(cambia|siguiente|salta).*(musica|pista|cancion)|^siguiente$/.test(comando)) {
      cambiarPista(1);
      return;
    }

    if (/(pausa|detener|para).*(musica|reproduccion)|^pausa$/.test(comando)) {
      pausarMusica();
      return;
    }

    if (/(pon|reproduce|reanuda|inicia).*(musica)|^reproduce$|^pon musica$/.test(comando)) {
      reproducirMusica();
      return;
    }

    if (/(cuanto llevo|distancia|kilometros|cuantos kilometros)/.test(comando)) {
      hablarComoBiela(`Llevas ${Number(medicion.distancia || 0).toFixed(1)} kilómetros a ${Math.round(Number(medicion.velocidad || 0))} kilómetros por hora`);
      return;
    }

    hablarComoBiela('No entendí el comando. Prueba con: cuánto llevo, baja la música o auxilio');
  }, [ajustarVolumen, cambiarPista, medicion.distancia, medicion.velocidad, pausarMusica, pausarRodada, reproducirMusica, reanudarRodada]);

  const {
    escuchando: copilotoEscuchando,
    ultimoComando,
    error: errorCopiloto,
    soportado: copilotoSoportado,
  } = useCopilotoVoz({
    activo: copilotoActivo && fase === 'activa',
    onComando: procesarComando,
    onError: () => setCopilotoActivo(false),
  });

  const alternarCopiloto = () => {
    const siguiente = !copilotoActivo;
    if (siguiente && !copilotoSoportado) {
      hablarComoBiela('Este navegador no permite el copiloto por voz');
      return;
    }
    setCopilotoActivo(siguiente);
    hablarComoBiela(siguiente ? 'Copiloto activo. Di: oye Biela' : 'Copiloto desactivado');
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volumen;
  }, [volumen]);

  useEffect(() => () => {
    urlsLocalesRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsLocalesRef.current = [];
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const pista = pistas[indicePista];
    if (!audio || !pista || audio.src === pista.src) return;
    audio.src = pista.src;
    audio.load();
    if (reproduciendo) audio.play().catch(() => setReproduciendo(false));
  }, [indicePista, pistas, reproduciendo]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return undefined;
    const sesion = navigator.mediaSession;
    const pista = pistas[indicePista];

    if (pista && window.MediaMetadata) {
      sesion.metadata = new window.MediaMetadata({
        title: pista.nombre,
        artist: pista.artista || 'Biela',
        album: 'Música en ruta',
      });
    }
    sesion.playbackState = reproduciendo ? 'playing' : 'paused';

    const registrar = (accion, manejador) => {
      try {
        sesion.setActionHandler(accion, manejador);
      } catch (error) {
        void error;
      }
    };
    registrar('play', () => reproducirMusica());
    registrar('pause', () => pausarMusica());
    registrar('previoustrack', () => cambiarPista(-1));
    registrar('nexttrack', () => cambiarPista(1));

    return () => {
      ['play', 'pause', 'previoustrack', 'nexttrack'].forEach((accion) => {
        try {
          sesion.setActionHandler(accion, null);
        } catch (error) {
          void error;
        }
      });
    };
  }, [cambiarPista, indicePista, pausarMusica, pistas, reproduciendo, reproducirMusica]);

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
    if (fase !== 'activa' || rodadaPausada) return undefined;
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
  }, [fase, rodadaPausada]);

  useEffect(() => {
    if (fase !== 'activa' || rodadaPausada || demo) return undefined;
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
  }, [fase, demo, rodadaPausada]);

  useEffect(() => {
    if (fase !== 'activa' || rodadaPausada || !demo) return undefined;
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
  }, [fase, demo, rodadaPausada]);

  const pausaActualMs = rodadaPausada && pausaInicio
    ? Math.max(0, horaActual - pausaInicio)
    : 0;
  const segundosActivos = fase === 'resumen'
    ? Number(resumen?.duracion_segundos) || 0
    : Math.max(0, Math.floor((horaActual - inicioTs - tiempoPausado - pausaActualMs) / 1000));
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
    const pausaActual = rodadaPausada && pausaInicio ? Math.max(0, ahora - pausaInicio) : 0;
    const duracion = Math.max(1, Math.round((ahora - inicio - tiempoPausado - pausaActual) / 1000));
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
    setRodadaPausada(false);
    setPausaInicio(0);
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
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] pb-56">
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
          <>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[var(--bg-surface)] p-3 dark:border-white/10">
              <div className="min-w-0">
                <p className="text-xs font-bold leading-snug text-[var(--text-main)]">
                  Sumar {Number(resumen.distancia_km || 0).toFixed(1)} km al odómetro
                </p>
                <span className="text-[10px] text-[var(--text-muted)]">Desactívalo si la rodada no fue en tu moto.</span>
              </div>
              <LiquidToggle
                checked={sumarOdometro}
                onChange={setSumarOdometro}
                ariaLabel="Sumar kilómetros al odómetro"
              />
            </div>
            <div className="mt-3">
              <TarjetaRodadaShare
                rodada={resumen}
                moto={moto}
                onGuardada={handleGuardada}
                sumarOdometro={sumarOdometro}
                onCambiarSumarOdometro={setSumarOdometro}
                mostrarControlOdometro={false}
              />
            </div>
          </>
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
              <button
                type="button"
                onClick={alternarCopiloto}
                aria-pressed={copilotoActivo}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest transition-colors ${
                  copilotoActivo
                    ? 'border-[#84cc16]/50 bg-[#84cc16]/10 text-lime-700 dark:text-lime-300'
                    : 'border-black/10 text-[var(--text-muted)] dark:border-white/10'
                }`}
              >
                {copilotoActivo ? <Mic size={13} /> : <MicOff size={13} />}
                Copiloto Voz
                {copilotoActivo && (
                  <span className={`h-2 w-2 rounded-full bg-[#84cc16] ${copilotoEscuchando ? 'animate-pulse' : 'opacity-40'}`} aria-hidden="true" />
                )}
              </button>
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

            {copilotoActivo && (
              <div className="mt-3 rounded-2xl border border-[#84cc16]/30 bg-[#84cc16]/5 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-lime-700 dark:text-lime-300">
                    <span className={`h-2 w-2 rounded-full bg-[#84cc16] ${copilotoEscuchando ? 'animate-pulse' : 'opacity-40'}`} aria-hidden="true" />
                    {copilotoEscuchando ? 'Escuchando "Oye Biela..."' : 'Copiloto en espera'}
                  </span>
                  {rodadaPausada && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black text-amber-700 dark:text-amber-300">
                      Rodada pausada
                    </span>
                  )}
                </div>
                {ultimoComando && (
                  <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">Último comando: "{ultimoComando}"</p>
                )}
                {errorCopiloto && (
                  <p className="mt-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    {errorCopiloto === 'no-soportado'
                      ? 'Este navegador no permite escuchar comandos de voz.'
                      : 'Micrófono o reconocimiento de voz no disponible.'}
                  </p>
                )}
              </div>
            )}

            <section className="mt-3 rounded-2xl border border-black/5 bg-[var(--bg-surface)] p-3 dark:border-white/10">
              <audio
                ref={audioRef}
                preload="metadata"
                className="hidden"
                onPlay={() => setReproduciendo(true)}
                onPause={() => setReproduciendo(false)}
                onEnded={() => cambiarPista(1, false)}
              />
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/10 text-[var(--text-muted)] dark:border-white/10">
                  <Music2 size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black">{pistas[indicePista]?.nombre || 'Reproductor de ruta'}</p>
                  <p className="truncate text-[10px] text-[var(--text-muted)]">{pistas[indicePista]?.artista || 'Carga tu música'}</p>
                </div>
                <button
                  type="button"
                  onClick={pausarMusica}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/10 dark:border-white/10"
                  aria-label="Pausar música"
                >
                  <Pause size={16} />
                </button>
                <button
                  type="button"
                  onClick={reproducirMusica}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#84cc16]/50 bg-[#84cc16]/10 text-lime-700 dark:text-lime-300"
                  aria-label="Reproducir música"
                >
                  <Play size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => cambiarPista(1)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/10 dark:border-white/10"
                  aria-label="Siguiente pista"
                >
                  <SkipForward size={16} />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Volume2 size={14} className="shrink-0 text-[var(--text-muted)]" />
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={volumen}
                  onChange={(evento) => {
                    const valor = Number(evento.target.value);
                    if (audioRef.current) audioRef.current.volume = valor;
                    setVolumen(valor);
                  }}
                  className="h-10 flex-1 accent-[#84cc16]"
                  aria-label="Volumen de la música"
                />
                <span className="w-9 text-right text-[10px] font-bold tabular-nums text-[var(--text-muted)]">
                  {Math.round(volumen * 100)}%
                </span>
              </div>
              <label className="mt-1 flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 px-3 text-[11px] font-bold dark:border-white/10">
                + Cargar música de tu teléfono
                <input
                  ref={archivoAudioRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  onChange={cargarArchivos}
                />
              </label>
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
