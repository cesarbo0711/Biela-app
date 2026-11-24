import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Store,
  Wrench,
  X,
} from 'lucide-react';
import { supabase } from '../supabase';
import { TiendasSkeleton } from '../components/BielaSkeletons.jsx';

const CATEGORIAS = ['Todas', 'Repuestos', 'Cauchera', 'Taller', 'Grúa'];

const ESTILOS_CATEGORIA = {
  Repuestos: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  Cauchera: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Taller: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  Grúa: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
};

const MENSAJE_CONTACTO = encodeURIComponent(
  'Hola, los encontré en la app Biela. Necesito consultar disponibilidad / auxilio vial para mi moto.'
);

function enlaceWhatsApp(comercio) {
  const telefono = String(comercio?.telefono_whatsapp ?? '').replace(/\D/g, '');
  if (!telefono) return null;
  return `https://wa.me/${telefono}?text=${MENSAJE_CONTACTO}`;
}

function normalizar(valor) {
  return String(valor ?? '').toLocaleLowerCase('es-VE');
}

export default function Tiendas() {
  const [comercios, setComercios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [solo24h, setSolo24h] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recargaToken, setRecargaToken] = useState(0);
  const [solicitudAbierta, setSolicitudAbierta] = useState(false);
  const [solicitud, setSolicitud] = useState({ nombre: '', tipo: 'Taller', ciudad: '', telefono: '' });

  useEffect(() => {
    let activo = true;

    Promise.resolve(
      supabase
        .from('comercios')
        .select('*')
        .order('verificado', { ascending: false })
        .order('nombre', { ascending: true })
    )
      .then(({ data, error: dbError }) => {
        if (!activo) return;
        if (dbError) throw dbError;
        setComercios(data || []);
        setError('');
      })
      .catch((err) => {
        console.error('Error cargando comercios:', err);
        if (activo) setError('No pudimos cargar el directorio. Revisa tu conexión e inténtalo de nuevo.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [recargaToken]);

  const comerciosFiltrados = useMemo(() => {
    const termino = normalizar(busqueda).trim();

    return comercios.filter((comercio) => {
      const porCategoria = categoria === 'Todas' || comercio.categoria === categoria;
      const porHorario = !solo24h || comercio.abierto_24h === true;
      const texto = normalizar(
        [comercio.nombre, comercio.direccion, comercio.ciudad, comercio.categoria, comercio.horario].join(' ')
      );
      return porCategoria && porHorario && (!termino || texto.includes(termino));
    });
  }, [comercios, busqueda, categoria, solo24h]);

  const recargar = () => {
    setCargando(true);
    setRecargaToken((token) => token + 1);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoria('Todas');
    setSolo24h(false);
  };

  const abrirSolicitudAliado = (evento) => {
    evento.preventDefault();
    if (!solicitud.nombre.trim() || !solicitud.ciudad.trim()) return;

    const mensaje = encodeURIComponent(
      `Hola Biela, quiero unirme a la red de aliados. Negocio: ${solicitud.nombre.trim()}. ` +
        `Tipo: ${solicitud.tipo}. Ciudad: ${solicitud.ciudad.trim()}. ` +
        `WhatsApp: ${solicitud.telefono.trim() || 'lo indico por aquí'}.`
    );

    window.open(`https://wa.me/?text=${mensaje}`, '_blank', 'noopener,noreferrer');
    setSolicitudAbierta(false);
    setSolicitud({ nombre: '', tipo: 'Taller', ciudad: '', telefono: '' });
  };

  if (cargando) return <TiendasSkeleton />;

  return (
    <main className="biela-fade-in mx-auto w-full max-w-6xl px-4 pb-28 pt-8 text-[var(--text-main)]">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--accent-color)', color: '#111111', boxShadow: '0 10px 24px var(--accent-shadow)' }}
          >
            <Store size={20} strokeWidth={2.5} />
          </span>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Tienda &amp; Auxilio Vial</h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
          Talleres, caucheras y grúas verificadas cerca de ti, con un toque al WhatsApp.
        </p>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex min-h-[48px] flex-1 items-center">
          <Search className="pointer-events-none absolute left-4 text-[var(--text-muted)]" size={18} />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Busca por nombre, dirección o palabra clave"
            aria-label="Buscar comercios"
            className="min-h-[48px] w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] py-3 pl-11 pr-11 text-base text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)]"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-black/5 hover:text-[var(--text-main)] dark:hover:bg-white/10"
            >
              <X size={16} />
            </button>
          )}
        </label>

        <button
          type="button"
          onClick={() => setSolo24h((valor) => !valor)}
          aria-pressed={solo24h}
          className={`min-h-[48px] shrink-0 rounded-2xl border px-4 text-sm font-extrabold transition ${
            solo24h
              ? 'border-transparent bg-[var(--accent-color)] text-black shadow-[0_10px_24px_var(--accent-shadow)]'
              : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          🚨 Solo 24/7
        </button>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIAS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategoria(item)}
            aria-pressed={categoria === item}
            className={`min-h-[48px] shrink-0 rounded-full border px-4 text-xs font-extrabold transition ${
              categoria === item
                ? 'border-transparent bg-[var(--accent-color)] text-black shadow-[0_8px_20px_var(--accent-shadow)]'
                : 'border-[var(--border-color)] bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={recargar}
            className="min-h-[48px] rounded-xl border border-red-500/30 px-4 text-sm font-extrabold text-red-700 dark:text-red-300"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {comerciosFiltrados.length} {comerciosFiltrados.length === 1 ? 'resultado' : 'resultados'}
        </p>
        {(busqueda || categoria !== 'Todas' || solo24h) && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="min-h-[44px] px-2 text-xs font-bold text-[var(--text-muted)] underline decoration-dotted hover:text-[var(--text-main)]"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {comerciosFiltrados.length > 0 ? (
        <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {comerciosFiltrados.map((comercio) => {
            const enlace = enlaceWhatsApp(comercio);

            return (
              <article
                key={comercio.id}
                className="flex flex-col gap-4 rounded-2xl border border-[var(--border-color)] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
                style={{ background: 'var(--bg-card)' }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="min-w-0 flex-1 text-lg font-black leading-tight">{comercio.nombre}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                      ESTILOS_CATEGORIA[comercio.categoria] ||
                      'bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-200'
                    }`}
                  >
                    {comercio.categoria}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {comercio.verificado === true && (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck size={12} />
                      ✓ Verificado
                    </span>
                  )}
                  {comercio.abierto_24h === true && (
                    <span className="relative flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      24 Horas
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2 text-sm text-[var(--text-muted)]">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 shrink-0" size={15} />
                    <span>
                      {comercio.direccion || 'Dirección no disponible'}
                      {comercio.ciudad ? `, ${comercio.ciudad}` : ''}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Clock className="mt-0.5 shrink-0" size={15} />
                    <span>{comercio.horario || 'Horario no disponible'}</span>
                  </p>
                </div>

                <div className="mt-auto pt-1">
                  {enlace ? (
                    <a
                      href={enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold text-black transition hover:brightness-105"
                      style={{ background: 'var(--accent-color)', boxShadow: '0 10px 24px var(--accent-shadow)' }}
                    >
                      <MessageCircle size={17} strokeWidth={2.5} />
                      Contactar por WhatsApp
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex min-h-[48px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] px-4 text-sm font-bold text-[var(--text-muted)] opacity-60"
                    >
                      <MessageCircle size={17} />
                      Sin WhatsApp registrado
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
            <Wrench size={22} className="text-[var(--text-muted)]" />
          </span>
          <h2 className="text-base font-black">No encontramos comercios con esos filtros</h2>
          <p className="max-w-sm text-sm text-[var(--text-muted)]">
            Prueba con otro nombre, quita el filtro 24/7 o revisa todas las categorías.
          </p>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="min-h-[48px] rounded-xl bg-[var(--accent-color)] px-5 text-sm font-extrabold text-black"
            style={{ boxShadow: '0 10px 24px var(--accent-shadow)' }}
          >
            Ver todos
          </button>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <h2 className="text-sm font-black sm:text-base">
            ¿Tienes un taller, cauchera o venta de repuestos? Únete a la red Biela
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            Suma tu negocio al directorio y recibe consultas de motorizados cerca de ti.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSolicitudAbierta(true)}
          className="mt-4 min-h-[48px] shrink-0 rounded-xl border border-[var(--accent-color)] px-5 text-sm font-extrabold text-[var(--accent-color)] transition hover:bg-[var(--accent-color)] hover:text-black sm:mt-0"
        >
          Quiero ser aliado
        </button>
      </section>

      {solicitudAbierta && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSolicitudAbierta(false)}
        >
          <form
            onSubmit={abrirSolicitudAliado}
            onClick={(evento) => evento.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">Solicitar ingreso a la red</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Te abriremos WhatsApp con tu mensaje listo.</p>
              </div>
              <button
                type="button"
                onClick={() => setSolicitudAbierta(false)}
                aria-label="Cerrar solicitud"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-[var(--text-muted)]">Nombre del negocio</span>
                <input
                  required
                  type="text"
                  value={solicitud.nombre}
                  onChange={(evento) => setSolicitud({ ...solicitud, nombre: evento.target.value })}
                  placeholder="Ej. Caucheras El Centro"
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-base text-[var(--text-main)] outline-none focus:border-[var(--accent-color)]"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-[var(--text-muted)]">Tipo de aliado</span>
                <select
                  value={solicitud.tipo}
                  onChange={(evento) => setSolicitud({ ...solicitud, tipo: evento.target.value })}
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-base text-[var(--text-main)] outline-none focus:border-[var(--accent-color)]"
                >
                  {CATEGORIAS.filter((item) => item !== 'Todas').map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-[var(--text-muted)]">Ciudad</span>
                <input
                  required
                  type="text"
                  value={solicitud.ciudad}
                  onChange={(evento) => setSolicitud({ ...solicitud, ciudad: evento.target.value })}
                  placeholder="Ej. Caracas"
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-base text-[var(--text-main)] outline-none focus:border-[var(--accent-color)]"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-[var(--text-muted)]">WhatsApp del negocio (opcional)</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={solicitud.telefono}
                  onChange={(evento) => setSolicitud({ ...solicitud, telefono: evento.target.value })}
                  placeholder="0424 123 4567"
                  className="min-h-[48px] w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 text-base text-[var(--text-main)] outline-none focus:border-[var(--accent-color)]"
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold text-black"
              style={{ background: 'var(--accent-color)', boxShadow: '0 10px 24px var(--accent-shadow)' }}
            >
              <MessageCircle size={17} />
              Abrir WhatsApp
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
