import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Droplets,
  Gauge,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { supabase } from '../supabase';
import './PublicVehicleHistory.css';

function formatearFecha(valor) {
  if (!valor) return '—';
  const fecha = new Date(String(valor).slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function nombreServicio(item) {
  const relacion = Array.isArray(item.catalogo_servicios)
    ? item.catalogo_servicios[0]
    : item.catalogo_servicios;
  return relacion?.nombre || 'Mantenimiento general';
}

function estadoLubricacion(historial, kilometraje) {
  const cambioAceite = historial.find((item) => /aceite|lubric/i.test(nombreServicio(item)));
  if (!cambioAceite) {
    return { etiqueta: 'Pendiente', detalle: 'Sin cambio de aceite registrado', ok: false };
  }

  const relacion = Array.isArray(cambioAceite.catalogo_servicios)
    ? cambioAceite.catalogo_servicios[0]
    : cambioAceite.catalogo_servicios;
  const intervalo = Number(relacion?.intervalo_km) || 3000;
  const realizado = Number(cambioAceite.km_al_momento) || 0;
  const proximo = realizado + intervalo;
  const actual = Number(kilometraje) || 0;
  const alDia = actual <= proximo;

  return {
    etiqueta: alDia ? 'Al día' : 'Pendiente',
    detalle: alDia
      ? `Próximo cambio a los ${proximo.toLocaleString('en-US')} km`
      : `Supera los ${proximo.toLocaleString('en-US')} km previstos`,
    ok: alDia,
  };
}

export default function PublicVehicleHistory() {
  const { id } = useParams();
  const [moto, setMoto] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    let activo = true;

    async function cargarHistorial() {
      if (!id) {
        setEstado('no-encontrado');
        return;
      }

      try {
        const { data: motoData, error: motoError } = await supabase
          .from('motos')
          .select('marca, modelo, year, kilometraje, tipo_aceite, imagen_url, created_at')
          .eq('id', id)
          .maybeSingle();

        if (motoError) throw motoError;
        if (!activo) return;
        if (!motoData) {
          setEstado('no-encontrado');
          return;
        }

        const { data: historialData, error: historialError } = await supabase
          .from('bitacora_servicios')
          .select('id, km_al_momento, fecha_servicio, notas, catalogo_servicios (nombre, intervalo_km)')
          .eq('moto_id', id)
          .order('fecha_servicio', { ascending: false });

        if (historialError) throw historialError;
        if (!activo) return;

        setMoto(motoData);
        setHistorial(historialData || []);
        setEstado('listo');
      } catch (error) {
        console.error('Error cargando el pasaporte vehicular:', error);
        if (activo) setEstado('error');
      }
    }

    cargarHistorial();
    return () => {
      activo = false;
    };
  }, [id]);

  if (estado === 'cargando') {
    return (
      <main className="pvh-page">
        <div className="pvh-wrap">
          <div className="pvh-loader gpane">
            <span className="pvh-spinner" />
            <p>Verificando pasaporte vehicular...</p>
          </div>
        </div>
      </main>
    );
  }

  if (estado !== 'listo') {
    return (
      <main className="pvh-page">
        <div className="pvh-wrap">
          <section className="pvh-empty gpane">
            <ShieldCheck size={32} />
            <h1>{estado === 'error' ? 'No pudimos verificar el historial' : 'Pasaporte no disponible'}</h1>
            <p>El enlace puede ser inválido o el historial todavía no está disponible públicamente.</p>
            <Link to="/" className="pvh-cta-link">Ir a Biela <ArrowRight size={15} /></Link>
          </section>
        </div>
      </main>
    );
  }

  const ultimoMantenimiento = historial[0];
  const lubricacion = estadoLubricacion(historial, moto.kilometraje);

  return (
    <main className="pvh-page">
      <div className="pvh-wrap">
        <header className="pvh-topbar">
          <div className="pvh-brand">
            <span className="pvh-brand-mark">B</span>
            <span>BIELA</span>
          </div>
          <span className="pvh-verified">
            <ShieldCheck size={14} strokeWidth={2.2} /> HISTORIAL VERIFICADO
          </span>
        </header>

        <section className="pvh-intro">
          <span className="pvh-kicker">Pasaporte vehicular digital</span>
          <h1>Historial real de mantenimiento</h1>
          <p>Datos publicados por el propietario para respaldar una compra segura.</p>
        </section>

        <section className="pvh-hero gpane">
          <div className="pvh-photo">
            {moto.imagen_url ? (
              <img src={moto.imagen_url} alt={`${moto.marca} ${moto.modelo}`} />
            ) : (
              <div className="pvh-photo-placeholder">
                <Gauge size={34} strokeWidth={1.4} />
                <span>Sin foto</span>
              </div>
            )}
          </div>

          <div className="pvh-identity">
            <span className="pvh-label">Ficha del vehículo</span>
            <h2>{moto.marca} {moto.modelo}</h2>
            <p className="pvh-registered">
              Registrado en Biela el {formatearFecha(moto.created_at)}
            </p>
            <div className="pvh-specs">
              <div>
                <span>Año</span>
                <strong className="tabular-nums">{moto.year || '—'}</strong>
              </div>
              <div>
                <span>Odómetro actual</span>
                <strong className="tabular-nums">
                  {Number(moto.kilometraje || 0).toLocaleString('en-US')} <small>km</small>
                </strong>
              </div>
              <div>
                <span>Aceite recomendado</span>
                <strong>{moto.tipo_aceite || 'No registrado'}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="pvh-metrics" aria-label="Resumen de confianza">
          <article className="pvh-metric gpane">
            <span className="pvh-metric-icon"><Wrench size={17} strokeWidth={1.9} /></span>
            <span className="pvh-metric-label">Servicios Registrados</span>
            <strong className="tabular-nums">{historial.length}</strong>
            <small>Historial declarado</small>
          </article>

          <article className="pvh-metric gpane">
            <span className="pvh-metric-icon"><CalendarDays size={17} strokeWidth={1.9} /></span>
            <span className="pvh-metric-label">Último Mantenimiento</span>
            <strong>{formatearFecha(ultimoMantenimiento?.fecha_servicio)}</strong>
            <small>{ultimoMantenimiento ? nombreServicio(ultimoMantenimiento) : 'Sin registros'}</small>
          </article>

          <article className="pvh-metric gpane">
            <span className={`pvh-metric-icon${lubricacion.ok ? ' is-ok' : ' is-pending'}`}>
              <Droplets size={17} strokeWidth={1.9} />
            </span>
            <span className="pvh-metric-label">Estado de Lubricación</span>
            <strong className={lubricacion.ok ? 'is-ok' : 'is-pending'}>{lubricacion.etiqueta}</strong>
            <small>{lubricacion.detalle}</small>
          </article>
        </section>

        <section className="pvh-timeline-section">
          <header className="pvh-section-head">
            <div>
              <span className="pvh-kicker">Cronología</span>
              <h2>Mantenimientos documentados</h2>
            </div>
            <span className="pvh-count tabular-nums">{historial.length} registros</span>
          </header>

          {historial.length === 0 ? (
            <div className="pvh-empty-timeline gpane">
              Aún no hay mantenimientos registrados para esta motocicleta.
            </div>
          ) : (
            <ol className="pvh-timeline">
              {historial.map((item) => (
                <li key={item.id} className="pvh-timeline-item">
                  <span className="pvh-timeline-dot"><Wrench size={13} strokeWidth={2.1} /></span>
                  <article className="pvh-timeline-card gpane">
                    <div className="pvh-timeline-head">
                      <h3>{nombreServicio(item)}</h3>
                      <time>{formatearFecha(item.fecha_servicio)}</time>
                    </div>
                    <div className="pvh-timeline-km tabular-nums">
                      <Gauge size={13} strokeWidth={2} /> {Number(item.km_al_momento || 0).toLocaleString('en-US')} km al momento
                    </div>
                    {item.notas && <p className="pvh-timeline-notes">{item.notas}</p>}
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>

        <footer className="pvh-footer">
          <p>¿Tienes moto? Lleva tu historial certificado gratis en Biela</p>
          <Link to="/" className="pvh-cta-link">Conocer Biela <ArrowRight size={15} /></Link>
        </footer>
      </div>
    </main>
  );
}
