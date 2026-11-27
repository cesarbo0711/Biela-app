import { useId, useState } from 'react';
import {
  ArrowLeft,
  Bike,
  Check,
  Copy,
  Gauge,
  Route,
  Share2,
  Timer,
  X,
} from 'lucide-react';
import { supabase } from '../supabase';
import SlideToConfirm from './SlideToConfirm';
import LiquidToggle from './LiquidToggle';
import { encolarRodadaPendiente, esErrorDeRed } from '../utils/offlineRodadasQueue';

function formatearDuracion(segundos) {
  const total = Math.max(0, Math.round(Number(segundos) || 0));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const restantes = total % 60;
  return [horas, minutos, restantes].map((valor) => String(valor).padStart(2, '0')).join(':');
}

function formatearFecha(valor) {
  if (!valor) return new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function normalizarCoordenadas(ruta) {
  if (!Array.isArray(ruta)) return [];
  return ruta
    .map((punto) => {
      if (Array.isArray(punto)) {
        return { lat: Number(punto[0]), lng: Number(punto[1]) };
      }
      const lat = Number(punto?.lat ?? punto?.latitude);
      const lng = Number(punto?.lng ?? punto?.longitude);
      return { lat, lng };
    })
    .filter((punto) => Number.isFinite(punto.lat) && Number.isFinite(punto.lng));
}

function construirTrazado(ruta) {
  const puntos = normalizarCoordenadas(ruta);
  if (puntos.length < 2) {
    return { path: 'M 12 96 C 80 46 150 110 208 54 C 250 20 286 44 308 30', inicio: [12, 96], fin: [308, 30], total: puntos.length };
  }

  const lats = puntos.map((punto) => punto.lat);
  const lngs = puntos.map((punto) => punto.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;
  const posiciones = puntos.map((punto) => [
    12 + ((punto.lng - minLng) / spanLng) * 296,
    12 + (1 - (punto.lat - minLat) / spanLat) * 106,
  ]);

  return {
    path: posiciones.map(([x, y], indice) => `${indice === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' '),
    inicio: posiciones[0],
    fin: posiciones[posiciones.length - 1],
    total: puntos.length,
  };
}

function copiarTexto(texto) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(texto);
  const area = document.createElement('textarea');
  area.value = texto;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  return Promise.resolve();
}

export default function TarjetaRodadaShare({
  rodada,
  moto,
  modoHistorial = false,
  onClose,
  onGuardada,
  sumarOdometro: sumarOdometroControlado,
  onCambiarSumarOdometro,
  mostrarControlOdometro = true,
}) {
  const gradientId = useId().replace(/:/g, '');
  const [sumarOdometroInterno, setSumarOdometroInterno] = useState(true);
  const sumarOdometro = sumarOdometroControlado === undefined ? sumarOdometroInterno : Boolean(sumarOdometroControlado);
  const setSumarOdometro = (valor) => {
    if (sumarOdometroControlado === undefined) setSumarOdometroInterno(Boolean(valor));
    onCambiarSumarOdometro?.(Boolean(valor));
  };
  const [guardando, setGuardando] = useState(false);
  const [guardada, setGuardada] = useState(modoHistorial);
  const [error, setError] = useState('');
  const [compartido, setCompartido] = useState(false);

  const distancia = Number(rodada?.distancia_km) || 0;
  const velocidadMax = Number(rodada?.velocidad_max_kmh) || 0;
  const velocidadPromedio = Number(rodada?.velocidad_promedio_kmh) || 0;
  const duracion = Number(rodada?.duracion_segundos) || 0;
  const trazado = construirTrazado(rodada?.ruta_coordenadas);
  const nombreMoto = [moto?.marca, moto?.modelo].filter(Boolean).join(' ') || 'Mi moto';
  const textoResumen = `Biela • Rodada con ${nombreMoto}: ${distancia.toFixed(1)} km en ${formatearDuracion(duracion)}, vel. máx. ${velocidadMax.toFixed(0)} km/h, vel. promedio ${velocidadPromedio.toFixed(0)} km/h.`;

  const guardarRodadaEnSupabase = async () => {
    if (guardando || guardada || modoHistorial) return;
    setGuardando(true);
    setError('');

    let kilometrajeActualizado = null;
    let odometroAplicado = false;
    const datosRodada = {
      moto_id: moto?.id,
      distancia_km: Number(distancia.toFixed(2)),
      duracion_segundos: Math.round(duracion),
      velocidad_max_kmh: Number(velocidadMax.toFixed(1)),
      velocidad_promedio_kmh: Number(velocidadPromedio.toFixed(1)),
      ruta_coordenadas: normalizarCoordenadas(rodada?.ruta_coordenadas),
      fecha_inicio: rodada?.fecha_inicio || new Date().toISOString(),
      sumado_al_odometro: sumarOdometro,
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Necesitas iniciar sesión para guardar la rodada.');

      if (sumarOdometro) {
        const { data: motoActual, error: errorMoto } = await supabase
          .from('motos')
          .select('kilometraje')
          .eq('id', moto?.id)
          .single();
        if (errorMoto) throw errorMoto;

        kilometrajeActualizado = Math.max(0, Number(motoActual?.kilometraje) || 0) + Math.round(distancia);
        const { error: errorUpdate } = await supabase
          .from('motos')
          .update({ kilometraje: kilometrajeActualizado })
          .eq('id', moto?.id);
        if (errorUpdate) throw errorUpdate;
        odometroAplicado = true;
      }

      const { error: errorInsert } = await supabase
        .from('rodadas_telemetria')
        .insert({ ...datosRodada, user_id: user.id });
      if (errorInsert) throw errorInsert;

      setGuardada(true);
      onGuardada?.({ kilometrajeActualizado, sumarOdometro });
    } catch (guardadoError) {
      if (esErrorDeRed(guardadoError)) {
        encolarRodadaPendiente({
          rodadaData: datosRodada,
          sumarOdometro,
          kmASumar: Math.round(distancia),
          motoId: moto?.id,
          insertConfirmado: false,
          odometroAplicado,
        });
        setGuardada(true);
        setError('Sin conexión: la rodada quedó guardada en este teléfono y se sincronizará al volver la señal.');
        onGuardada?.({ kilometrajeActualizado: null, sumarOdometro, pendiente: true });
      } else {
        setError(guardadoError?.message || 'No se pudo guardar la rodada. Intenta de nuevo.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const compartirTarjeta = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Tarjeta de rodada Biela', text: textoResumen });
      } else {
        await copiarTexto(textoResumen);
      }
      setCompartido(true);
      window.setTimeout(() => setCompartido(false), 2200);
    } catch (compartirError) {
      if (compartirError?.name === 'AbortError') return;
      await copiarTexto(textoResumen);
      setCompartido(true);
      window.setTimeout(() => setCompartido(false), 2200);
    }
  };

  return (
    <div className="w-full text-[var(--text-main)]">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050505] p-5 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#84cc16]/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-[#84cc16]/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-sm">
              <img src="/favicon.ico" alt="" className="h-full w-full object-cover" />
            </span>
            <div className="min-w-0">
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.22em] text-[#a3e635]">Biela / Ride Card</span>
              <h2 className="truncate text-lg font-black tracking-tight">{nombreMoto}</h2>
              <span className="text-[10px] text-neutral-400">{moto?.year ? `${moto.year} · ` : ''}{formatearFecha(rodada?.fecha_inicio)}</span>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-neutral-300">
            GPS
          </span>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <svg viewBox="0 0 320 130" className="block h-32 w-full" role="img" aria-label="Trazado de la ruta de la rodada">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#65a30d" />
                <stop offset="100%" stopColor="#bef264" />
              </linearGradient>
            </defs>
            <path d="M 0 104 H 320 M 0 65 H 320 M 0 26 H 320" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <path d="M 54 0 V 130 M 160 0 V 130 M 266 0 V 130" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <path d={trazado.path} fill="none" stroke={`url(#${gradientId})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={trazado.inicio[0]} cy={trazado.inicio[1]} r="5" fill="#050505" stroke="#a3e635" strokeWidth="3" />
            <circle cx={trazado.fin[0]} cy={trazado.fin[1]} r="5" fill="#a3e635" stroke="#050505" strokeWidth="2" />
          </svg>
          <div className="flex items-center justify-between border-t border-white/10 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-neutral-400">
            <span>Ruta registrada</span>
            <span>{trazado.total} puntos</span>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2">
          {[
            { icon: Route, etiqueta: 'Distancia', valor: `${distancia.toFixed(1)}`, unidad: 'km' },
            { icon: Gauge, etiqueta: 'Vel. máxima', valor: `${velocidadMax.toFixed(0)}`, unidad: 'km/h' },
            { icon: Gauge, etiqueta: 'Vel. promedio', valor: `${velocidadPromedio.toFixed(0)}`, unidad: 'km/h' },
            { icon: Timer, etiqueta: 'Tiempo', valor: formatearDuracion(duracion), unidad: '' },
          ].map((metrica) => {
            const Icono = metrica.icon;
            return (
              <div key={metrica.etiqueta} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-neutral-400">
                  <Icono size={12} strokeWidth={2.2} /> {metrica.etiqueta}
                </span>
                <strong className="mt-1 block font-mono text-xl font-black tabular-nums text-white">
                  {metrica.valor} <span className="text-[10px] font-bold text-neutral-400">{metrica.unidad}</span>
                </strong>
              </div>
            );
          })}
        </div>
      </div>

      {modoHistorial ? (
        <div className="mt-4 rounded-2xl border border-black/5 bg-black/[0.02] p-3 text-xs dark:border-white/10 dark:bg-white/5">
          <span className="inline-flex items-center gap-2 font-bold text-[var(--text-main)]">
            <Check size={14} strokeWidth={2.4} />
            {rodada?.sumado_al_odometro ? `Sumado ${distancia.toFixed(1)} km al odómetro` : 'Guardada sin sumar al odómetro'}
          </span>
        </div>
        ) : mostrarControlOdometro ? (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/5">
            <div className="min-w-0">
              <p className="text-xs font-bold leading-snug text-[var(--text-main)]">
                Iba en mi moto (sumar +{distancia.toFixed(1)} km al odómetro)
              </p>
              <span className="text-[10px] text-[var(--text-muted)]">Actívalo solo si la rodada fue en tu moto.</span>
            </div>
            <LiquidToggle
              checked={sumarOdometro}
              onChange={setSumarOdometro}
              ariaLabel="Sumar kilómetros al odómetro"
            />
          </div>
        ) : null}

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      {guardada && !modoHistorial && (
        <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-lime-700 dark:text-lime-300">
          <Check size={15} strokeWidth={2.4} /> Rodada guardada en tu garaje.
        </p>
      )}

      {!modoHistorial && (
        <div className="mt-5 flex flex-col items-center gap-2">
          <SlideToConfirm
            width={300}
            label={sumarOdometro ? 'Desliza para guardar y sumar km' : 'Desliza para guardar sin sumar'}
            confirmedLabel="Guardado en garaje"
            onConfirm={guardarRodadaEnSupabase}
            disabled={guardando || guardada}
          />
          {guardando && <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Guardando...</span>}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={compartirTarjeta}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 text-xs font-bold text-[var(--text-main)] transition-colors hover:border-[#84cc16] hover:text-lime-700 dark:border-white/10 dark:hover:text-lime-300"
        >
          {compartido ? <Check size={15} /> : navigator.share ? <Share2 size={15} /> : <Copy size={15} />}
          {compartido ? 'Resumen copiado' : 'Compartir Tarjeta'}
        </button>
        {modoHistorial && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 text-xs font-bold text-[var(--text-main)] transition-colors hover:border-[#84cc16] dark:border-white/10"
          >
            <X size={15} /> Cerrar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onGuardada?.({ soloNavegar: true }) || window.history.back()}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#84cc16] bg-[#84cc16] text-xs font-extrabold text-[#050505] transition-colors hover:bg-[#a3e635]"
          >
            <ArrowLeft size={15} /> Volver a mi moto
          </button>
        )}
      </div>

      {!modoHistorial && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          <Bike size={12} /> Registro protegido contra sumas accidentales al odómetro.
        </p>
      )}
    </div>
  );
}
