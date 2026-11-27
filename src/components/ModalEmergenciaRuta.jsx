import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Disc,
  Fuel,
  MapPin,
  MessageCircle,
  Navigation,
  X,
  ZapOff,
} from 'lucide-react';
import { supabase } from '../supabase';
import VoiceNote from './VoiceNote';

const OPCIONES = [
  { clave: 'no-prende', etiqueta: 'No prende', Icono: ZapOff },
  { clave: 'caucho', etiqueta: 'Caucho espichado', Icono: Disc },
  { clave: 'gasolina', etiqueta: 'Sin gasolina', Icono: Fuel },
  { clave: 'mecanica', etiqueta: 'Falla mecánica / Ruido', Icono: AlertTriangle },
];

const DIAGNOSTICO = 'Consultar diagnóstico rápido con BujIA';

function promptDesdeAnalisis(moto, analisis) {
  const detalle = [moto?.marca, moto?.modelo].filter(Boolean).join(' ') || 'mi moto';
  return `Mi ${detalle} hace un ruido extraño. Escuché el motor durante ${(Number(analisis?.duracionMs || 0) / 1000).toFixed(1)} s: frecuencia dominante ${Number(analisis?.frecuenciaDominanteHz || 0).toFixed(0)} Hz, nivel ${Number(analisis?.nivelDb || 0).toFixed(1)} dB, cadencia ${Number(analisis?.cadenciaRalentiHz || 0).toFixed(1)} Hz. Diagnostica posibles fallas de válvulas, carburación, cadena o biela.`;
}

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

function normalizar(valor) {
  return String(valor ?? '').toLocaleLowerCase('es-VE');
}

function extraerCoordenadas(item) {
  const lat = Number(item?.latitud ?? item?.lat ?? item?.latitude);
  const lng = Number(item?.longitud ?? item?.lng ?? item?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function coincideCategoria(comercio, alias) {
  const texto = normalizar(`${comercio?.categoria ?? ''} ${comercio?.descripcion ?? ''}`);
  return alias.some((fragmento) => texto.includes(fragmento));
}

function obtenerUbicacion() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicion) => resolve({
        lat: Number(posicion.coords.latitude),
        lng: Number(posicion.coords.longitude),
      }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
    );
  });
}

function enlaceMapas(coordenadas) {
  return `https://www.google.com/maps/dir/?api=1&destination=${coordenadas.lat},${coordenadas.lng}`;
}

function enlaceWhatsapp(item, sintoma) {
  const digitos = String(item?.telefono_whatsapp ?? item?.telefono ?? '').replace(/\D/g, '');
  if (!digitos) return null;
  const numero = digitos.startsWith('58')
    ? digitos
    : digitos.startsWith('0')
      ? `58${digitos.slice(1)}`
      : `58${digitos}`;
  const mensaje = `Hola, soy piloto Biela. Tengo una emergencia: ${sintoma}. ¿Me pueden ayudar?`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function ordenarCercanos(items, origen) {
  return items
    .map((item) => {
      const coordenadas = extraerCoordenadas(item);
      if (!coordenadas) return null;
      return { ...item, coordenadas, distancia: haversine(origen, coordenadas) };
    })
    .filter(Boolean)
    .sort((a, b) => a.distancia - b.distancia)
    .slice(0, 3);
}

export default function ModalEmergenciaRuta({ moto, onCerrar }) {
  const navigate = useNavigate();
  const [paso, setPaso] = useState('seleccion');
  const [opcion, setOpcion] = useState(null);
  const [estadoUbicacion, setEstadoUbicacion] = useState('idle');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [analisisMotor, setAnalisisMotor] = useState(null);

  const cargarCercanos = async (clave, origen) => {
    setCargando(true);
    setAviso('');
    try {
      if (clave === 'gasolina') {
        const { data, error } = await supabase.from('estaciones_servicio').select('*');
        if (error) throw error;
        const cercanos = ordenarCercanos(data || [], origen);
        setResultados(cercanos);
        if (!cercanos.length) setAviso('No encontramos bombas con coordenadas registradas cerca de ti.');
        return;
      }

      const alias = clave === 'caucho'
        ? ['cauchera', 'caucho', 'llantera', 'neumatico', 'neumático', 'pinchadura']
        : ['taller', 'mecanica', 'mecánica', 'repuesto', 'servicio tecnico', 'servicio técnico'];
      const { data, error } = await supabase.from('comercios').select('*');
      if (error) throw error;
      const candidatos = (data || []).filter((comercio) => coincideCategoria(comercio, alias));
      const cercanos = ordenarCercanos(candidatos, origen);
      setResultados(cercanos);
      if (!cercanos.length) setAviso('No encontramos talleres o caucheras con coordenadas registradas cerca de ti.');
    } catch {
      setResultados([]);
      setAviso('No pudimos consultar el directorio cercano. Puedes usar el diagnóstico de BujIA.');
    } finally {
      setCargando(false);
    }
  };

  const elegirOpcion = async (item) => {
    setOpcion(item);
    setPaso('respuesta');
    setResultados([]);
    setAviso('');

    if (item.clave === 'no-prende') {
      setEstadoUbicacion('omitida');
      return;
    }

    setEstadoUbicacion('buscando');
    const origen = await obtenerUbicacion();
    if (!origen) {
      setEstadoUbicacion('error');
      setAviso('No pudimos obtener tu ubicación. Activa el GPS y vuelve a intentarlo.');
      return;
    }

    setEstadoUbicacion('listo');
    await cargarCercanos(item.clave, origen);
  };

  const consultarBujia = () => {
    navigate('/chat', {
      state: {
        sintoma: opcion?.etiqueta || 'Emergencia en ruta',
        moto,
        analisisMotor,
        promptAnalisis: analisisMotor ? promptDesdeAnalisis(moto, analisisMotor) : undefined,
      },
    });
    onCerrar();
  };

  const enviarSonidoABujia = ({ analisisMotor: resultado }) => {
    if (!resultado) {
      setAviso('No pudimos capturar el sonido del motor. Intenta grabar de nuevo.');
      return;
    }
    setAnalisisMotor(resultado);
    navigate('/chat', {
      state: {
        sintoma: 'Falla mecánica / Ruido',
        moto,
        analisisMotor: resultado,
        promptAnalisis: promptDesdeAnalisis(moto, resultado),
      },
    });
    onCerrar();
  };

  const IconoSeleccionado = opcion?.Icono || AlertTriangle;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border border-black/10 bg-[var(--bg-base)] text-[var(--text-main)] shadow-2xl dark:border-white/10 sm:rounded-[2rem]"
        role="dialog"
        aria-modal="true"
        aria-label="Auxilio en ruta"
      >
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-2">
            {paso === 'respuesta' && (
              <button
                type="button"
                onClick={() => setPaso('seleccion')}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/10 transition-colors hover:border-lime-500 dark:border-white/10"
                aria-label="Volver a opciones"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">Auxilio en ruta</p>
              <h2 className="truncate text-sm font-black">{paso === 'seleccion' ? '¿Qué pasó con la moto?' : opcion?.etiqueta}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/10 text-[var(--text-muted)] transition-colors hover:border-lime-500 dark:border-white/10"
            aria-label="Cerrar auxilio"
          >
            <X size={17} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {paso === 'seleccion' ? (
            <>
              <p className="mb-4 text-xs leading-relaxed text-[var(--text-muted)]">
                Elige una opción con un toque. Buscaremos ayuda cercana usando tu ubicación actual.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {OPCIONES.map(({ clave, etiqueta, Icono }) => (
                  <button
                    key={clave}
                    type="button"
                    onClick={() => elegirOpcion({ clave, etiqueta, Icono })}
                    className="flex min-h-[112px] flex-col items-start justify-between rounded-2xl border border-black/5 bg-[var(--bg-surface)] p-4 text-left shadow-sm transition-colors hover:border-amber-500 dark:border-white/10"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      <Icono size={20} strokeWidth={2} />
                    </span>
                    <span className="text-xs font-black leading-snug">{etiqueta}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  <IconoSeleccionado size={19} strokeWidth={2.1} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black">{opcion?.etiqueta}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                    {[moto?.marca, moto?.modelo].filter(Boolean).join(' ') || 'Tu moto'} · Reporte listo para BujIA.
                  </p>
                </div>
              </div>

              {opcion?.clave === 'mecanica' && (
                <div className="mt-4 rounded-2xl border border-black/5 bg-[var(--bg-surface)] p-4 dark:border-white/10">
                  <p className="mb-2 text-xs font-bold leading-relaxed text-[var(--text-main)]">
                    Graba 5 a 8 segundos del motor y BujIA analizará el sonido.
                  </p>
                  <VoiceNote modoMotor onTranscriptReady={enviarSonidoABujia} />
                </div>
              )}

              {opcion?.clave === 'no-prende' && (
                <div className="mt-4 rounded-2xl border border-black/5 bg-[var(--bg-surface)] p-4 text-xs leading-relaxed text-[var(--text-muted)] dark:border-white/10">
                  Revisa batería, fusible principal, bujía y gasolina antes de seguir intentando el arranque.
                </div>
              )}

              {opcion?.clave !== 'no-prende' && (
                <div className="mt-4">
                  {estadoUbicacion === 'buscando' && (
                    <p className="text-xs font-bold text-[var(--text-muted)]">Obteniendo tu ubicación GPS...</p>
                  )}
                  {estadoUbicacion === 'listo' && (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-lime-700 dark:text-lime-300">
                      <MapPin size={13} /> Ubicación obtenida
                    </p>
                  )}
                  {cargando && (
                    <p className="mt-2 text-xs font-bold text-[var(--text-muted)]">Buscando puntos cercanos...</p>
                  )}
                  {aviso && (
                    <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {aviso}
                    </p>
                  )}

                  <div className="mt-3 space-y-2">
                    {resultados.map((item) => {
                      const telefono = enlaceWhatsapp(item, opcion?.etiqueta);
                      return (
                        <div key={item.id} className="rounded-2xl border border-black/5 bg-[var(--bg-surface)] p-4 dark:border-white/10">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black">{item.nombre || 'Punto cercano'}</p>
                              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                {item.distancia.toFixed(1)} km · {item.estado_actual || item.categoria || 'Disponible'}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-lime-500/40 bg-lime-500/10 px-2 py-1 text-[9px] font-black text-lime-700 dark:text-lime-300">
                              {item.distancia.toFixed(1)} km
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <a
                              href={enlaceMapas(item.coordenadas)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-lime-500 bg-lime-500 text-[11px] font-extrabold text-[#050505] dark:bg-[#84cc16]"
                            >
                              <Navigation size={14} /> Cómo llegar
                            </a>
                            {telefono ? (
                              <a
                                href={telefono}
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-black/10 text-[11px] font-bold dark:border-white/10"
                              >
                                <MessageCircle size={14} /> WhatsApp
                              </a>
                            ) : (
                              <span className="flex min-h-11 items-center justify-center rounded-xl border border-black/5 text-[10px] font-bold text-[var(--text-muted)] dark:border-white/10">
                                Sin WhatsApp
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={consultarBujia}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#FF9B71] bg-[#FF9B71] px-4 text-xs font-extrabold text-[#17181a] transition-colors hover:brightness-105 dark:border-[#84cc16] dark:bg-[#84cc16] dark:text-[#050505]"
              >
                <ZapOff size={15} strokeWidth={2.2} /> {DIAGNOSTICO}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
