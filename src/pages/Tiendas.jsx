import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  Clock,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Store,
  Wrench,
  X,
} from 'lucide-react';
import { supabase } from '../supabase';
import { TiendasSkeleton } from '../components/BielaSkeletons.jsx';
import './Tiendas.css';

const CATEGORIAS = ['Todas', 'Lubricantes', 'Repuestos', 'Talleres', 'Cauchos'];

const CATEGORIA_ALIASES = {
  Lubricantes: ['lubricantes', 'lubricante', 'aceites', 'aceite'],
  Repuestos: ['repuestos', 'repuesto', 'accesorios'],
  Talleres: ['talleres', 'taller', 'mecánica', 'mecanica'],
  Cauchos: ['cauchos', 'caucho', 'cauchera', 'neumáticos', 'neumaticos'],
};

const MENSAJE_CONTACTO = 'Hola, los vi en Biela... ¿Tienen disponibilidad y precio?';

const COMERCIOS_EJEMPLO = [
  {
    id: 'demo-lubricantes-central',
    nombre: 'Lubricantes El Central',
    categoria: 'Lubricantes',
    ciudad: 'Caracas',
    direccion: 'Av. Principal de El Central',
    horario: 'Lun a Sáb · 8:00 AM – 6:00 PM',
    verificado: true,
    abierto_24h: false,
    descripcion: 'Aceites sintéticos, filtros y cambio de aceite para motos de trabajo y alto rendimiento.',
  },
  {
    id: 'demo-repuestos-bandera',
    nombre: 'Repuestos La Bandera',
    categoria: 'Repuestos',
    ciudad: 'Caracas',
    direccion: 'Calle 3, La Bandera',
    horario: 'Lun a Sáb · 9:00 AM – 7:00 PM',
    verificado: true,
    abierto_24h: false,
    descripcion: 'Repuestos originales y genéricos, frenos, transmisión y piezas eléctricas para motos.',
  },
  {
    id: 'demo-taller-moto-express',
    nombre: 'Taller Moto Express',
    categoria: 'Talleres',
    ciudad: 'Valencia',
    direccion: 'Av. Bolívar Norte',
    horario: 'Abierto 24 horas',
    verificado: false,
    abierto_24h: true,
    descripcion: 'Mecánica general, ajuste de motor, suspensión y diagnóstico electrónico para motos.',
  },
  {
    id: 'demo-cauchos-llanera',
    nombre: 'Cauchos La Llanera',
    categoria: 'Cauchos',
    ciudad: 'San Juan de los Morros',
    direccion: 'Carrera 9, centro',
    horario: 'Lun a Dom · 8:00 AM – 5:00 PM',
    verificado: true,
    abierto_24h: false,
    descripcion: 'Cauchos para moto, balanceo, pinchaduras y reparación de cámaras con garantía.',
  },
];

function normalizar(valor) {
  return String(valor ?? '').toLocaleLowerCase('es-VE');
}

function etiquetaCategoria(comercio) {
  const texto = normalizar(`${comercio?.categoria ?? ''} ${comercio?.descripcion ?? ''}`);

  if (texto.includes('lubric') || texto.includes('aceite')) return 'Lubricantes';
  if (texto.includes('cauch') || texto.includes('neum')) return 'Cauchos';
  if (texto.includes('taller') || texto.includes('mec')) return 'Talleres';
  if (texto.includes('repuest')) return 'Repuestos';

  return comercio?.categoria || 'Aliado';
}

function descripcionComercio(comercio) {
  if (comercio?.descripcion) return comercio.descripcion;

  switch (etiquetaCategoria(comercio)) {
    case 'Lubricantes':
      return 'Aceites, filtros y lubricantes para motos de todo tipo.';
    case 'Repuestos':
      return 'Piezas, frenos, transmisión y accesorios para tu moto.';
    case 'Talleres':
      return 'Mecánica general, diagnóstico y mantenimiento preventivo.';
    case 'Cauchos':
      return 'Cauchos, cámaras, balanceo y reparación de pinchaduras.';
    default:
      return 'Productos y servicios para motos cerca de ti.';
  }
}

function coincideCategoria(comercio, categoria) {
  if (categoria === 'Todas') return true;

  const texto = normalizar(`${etiquetaCategoria(comercio)} ${comercio?.categoria ?? ''}`);
  return (CATEGORIA_ALIASES[categoria] || []).some((alias) => texto.includes(alias));
}

function enlaceWhatsApp(comercio, mensaje = MENSAJE_CONTACTO) {
  const telefono = String(comercio?.telefono_whatsapp ?? '').replace(/\D/g, '');
  const base = telefono ? `https://wa.me/${telefono}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(mensaje)}`;
}

function enlaceMapa(comercio) {
  const destino = [comercio?.direccion, comercio?.ciudad].filter(Boolean).join(', ');
  if (!destino) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`;
}

function tonoCategoria(categoria) {
  return `tiendas-tone-${normalizar(categoria).replace(/[^a-z]/gi, '')}`;
}

export default function Tiendas() {
  const [comercios, setComercios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [solo24h, setSolo24h] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [recargaToken, setRecargaToken] = useState(0);
  const [solicitudAbierta, setSolicitudAbierta] = useState(false);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);
  const [solicitud, setSolicitud] = useState({
    nombre: '',
    categoria: 'Lubricantes',
    ciudad: '',
    telefono: '',
  });

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

        if (dbError) {
          console.warn('Directorio aliado no disponible:', dbError.message);
          setComercios(COMERCIOS_EJEMPLO);
          setAviso('Mostrando aliados de ejemplo mientras cargamos el directorio oficial.');
          return;
        }

        const lista = data || [];
        setComercios(lista.length ? lista : COMERCIOS_EJEMPLO);
        setAviso(lista.length ? '' : 'Directorio oficial vacío · mostrando aliados de ejemplo.');
      })
      .catch((err) => {
        console.warn('Error cargando comercios:', err);
        if (activo) {
          setComercios(COMERCIOS_EJEMPLO);
          setAviso('Mostrando aliados de ejemplo mientras cargamos el directorio oficial.');
        }
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
      const porCategoria = coincideCategoria(comercio, categoria);
      const porHorario = !solo24h || comercio.abierto_24h === true;
      const texto = normalizar(
        [
          comercio.nombre,
          comercio.direccion,
          comercio.ciudad,
          etiquetaCategoria(comercio),
          comercio.horario,
          descripcionComercio(comercio),
        ].join(' ')
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

  const abrirSolicitud = () => {
    setSolicitudEnviada(false);
    setSolicitudAbierta(true);
  };

  const cerrarSolicitud = () => {
    setSolicitudAbierta(false);
    setSolicitudEnviada(false);
    setSolicitud({ nombre: '', categoria: 'Lubricantes', ciudad: '', telefono: '' });
  };

  const enviarSolicitud = (evento) => {
    evento.preventDefault();
    if (!solicitud.nombre.trim() || !solicitud.ciudad.trim()) return;

    const mensaje =
      `Hola Biela, quiero registrar un comercio. ` +
      `Nombre: ${solicitud.nombre.trim()}. ` +
      `Categoría: ${solicitud.categoria}. ` +
      `Ciudad: ${solicitud.ciudad.trim()}. ` +
      `WhatsApp: ${solicitud.telefono.trim() || 'lo indico por aquí'}.`;

    window.open(
      enlaceWhatsApp({ telefono_whatsapp: solicitud.telefono }, mensaje),
      '_blank',
      'noopener,noreferrer'
    );
    setSolicitudEnviada(true);
  };

  if (cargando) return <TiendasSkeleton />;

  return (
    <main className="tiendas-page biela-fade-in mx-auto w-full max-w-3xl px-4 pt-6 pb-28 text-[var(--text-main)]">
      <header className="tiendas-header">
        <div className="tiendas-header-copy">
          <span className="tiendas-eyebrow">
            <Store size={14} strokeWidth={1.8} />
            Red de confianza Biela
          </span>
          <h1>Directorio Aliado</h1>
          <p>Talleres, repuestos y lubricantes verificados cerca de ti</p>
        </div>
        <button type="button" onClick={abrirSolicitud} className="tiendas-register">
          <Plus size={16} strokeWidth={1.9} />
          Registrar comercio
        </button>
      </header>

      <section className="tiendas-controls" aria-label="Buscar y filtrar comercios">
        <label className="tiendas-search gpane">
          <Search className="tiendas-search-icon" size={18} strokeWidth={1.8} />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar aceite, frenos, taller..."
            aria-label="Buscar comercios"
            className="tiendas-search-input"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              aria-label="Limpiar búsqueda"
              className="tiendas-search-clear"
            >
              <X size={16} />
            </button>
          )}
        </label>

        <div className="tiendas-filters" role="group" aria-label="Filtrar por categoría">
          {CATEGORIAS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategoria(item)}
              aria-pressed={categoria === item}
              className={`tiendas-pill ${categoria === item ? 'is-active' : ''}`}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSolo24h((valor) => !valor)}
            aria-pressed={solo24h}
            className={`tiendas-pill tiendas-pill-24h ${solo24h ? 'is-active' : ''}`}
          >
            <Clock size={14} strokeWidth={1.9} />
            24/7
          </button>
        </div>
      </section>

      {aviso && (
        <div className="tiendas-notice gpane">
          <span className="tiendas-notice-dot" />
          <span>{aviso}</span>
          <button type="button" onClick={recargar}>
            Reintentar
          </button>
        </div>
      )}

      <div className="tiendas-results-bar">
        <span>
          {comerciosFiltrados.length} {comerciosFiltrados.length === 1 ? 'resultado' : 'resultados'}
        </span>
        {(busqueda || categoria !== 'Todas' || solo24h) && (
          <button type="button" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        )}
      </div>

      {comerciosFiltrados.length > 0 ? (
        <section className="tiendas-grid">
          {comerciosFiltrados.map((comercio) => {
            const categoriaVisible = etiquetaCategoria(comercio);
            const enlace = enlaceWhatsApp(comercio);
            const mapa = enlaceMapa(comercio);

            return (
              <article key={comercio.id} className="tiendas-card gpane">
                <div className="tiendas-card-top">
                  <span className={`tiendas-category ${tonoCategoria(categoriaVisible)}`}>
                    {categoriaVisible}
                  </span>
                  <div className="tiendas-card-meta">
                    <span>
                      <MapPin size={13} strokeWidth={1.9} />
                      {comercio.ciudad || 'Zona no disponible'}
                    </span>
                    {comercio.verificado === true && (
                      <span className="tiendas-verified">
                        <BadgeCheck size={13} strokeWidth={1.9} />
                        Verificado
                      </span>
                    )}
                  </div>
                </div>

                <div className="tiendas-card-body">
                  <h2>{comercio.nombre}</h2>
                  <p className="tiendas-description">{descripcionComercio(comercio)}</p>
                  <p className="tiendas-schedule">
                    <Clock size={14} strokeWidth={1.8} />
                    {comercio.horario || (comercio.abierto_24h ? 'Abierto 24 horas' : 'Horario no disponible')}
                  </p>
                  {comercio.abierto_24h === true && <span className="tiendas-open-24h">Disponible 24/7</span>}
                </div>

                <div className="tiendas-card-actions">
                  <a href={enlace} target="_blank" rel="noopener noreferrer" className="tiendas-primary-action">
                    <MessageCircle size={16} strokeWidth={1.9} />
                    <span>Cotizar por WhatsApp</span>
                    <ArrowUpRight size={14} strokeWidth={1.9} />
                  </a>
                  {mapa && (
                    <a
                      href={mapa}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ver ${comercio.nombre} en el mapa`}
                      className="tiendas-secondary-action"
                    >
                      <MapPin size={17} strokeWidth={1.9} />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="tiendas-empty gpane">
          <span className="tiendas-empty-icon">
            <Wrench size={22} strokeWidth={1.7} />
          </span>
          <h2>No encontramos comercios con esos filtros</h2>
          <p>Prueba con otro término, revisa todas las categorías o desactiva el filtro 24/7.</p>
          <button type="button" onClick={limpiarFiltros}>
            Ver todos
          </button>
        </section>
      )}

      {solicitudAbierta && (
        <div className="tiendas-modal-overlay" onMouseDown={cerrarSolicitud}>
          <form
            onSubmit={enviarSolicitud}
            onMouseDown={(evento) => evento.stopPropagation()}
            className="tiendas-modal gpane"
          >
            <div className="tiendas-modal-head">
              <span className="tiendas-modal-icon">
                <Store size={18} strokeWidth={1.8} />
              </span>
              <div>
                <h2>Registrar comercio</h2>
                <p>Cuéntanos qué ofreces y te contactamos por WhatsApp.</p>
              </div>
              <button type="button" onClick={cerrarSolicitud} aria-label="Cerrar registro">
                <X size={18} />
              </button>
            </div>

            {solicitudEnviada ? (
              <div className="tiendas-success">
                <BadgeCheck size={28} strokeWidth={1.6} />
                <h3>Solicitud lista</h3>
                <p>Abrimos WhatsApp con tu mensaje preparado para el equipo Biela.</p>
                <button type="button" onClick={cerrarSolicitud}>
                  Listo
                </button>
              </div>
            ) : (
              <>
                <div className="tiendas-form">
                  <label>
                    <span>Nombre del negocio</span>
                    <input
                      required
                      type="text"
                      value={solicitud.nombre}
                      onChange={(evento) => setSolicitud({ ...solicitud, nombre: evento.target.value })}
                      placeholder="Ej. Lubricantes El Central"
                    />
                  </label>

                  <label>
                    <span>Categoría</span>
                    <select
                      value={solicitud.categoria}
                      onChange={(evento) => setSolicitud({ ...solicitud, categoria: evento.target.value })}
                    >
                      {CATEGORIAS.filter((item) => item !== 'Todas').map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="tiendas-form-row">
                    <label>
                      <span>Ciudad</span>
                      <input
                        required
                        type="text"
                        value={solicitud.ciudad}
                        onChange={(evento) => setSolicitud({ ...solicitud, ciudad: evento.target.value })}
                        placeholder="Ej. Caracas"
                      />
                    </label>
                    <label>
                      <span>WhatsApp (opcional)</span>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={solicitud.telefono}
                        onChange={(evento) => setSolicitud({ ...solicitud, telefono: evento.target.value })}
                        placeholder="0424 123 4567"
                      />
                    </label>
                  </div>
                </div>

                <button type="submit" className="tiendas-submit">
                  <MessageCircle size={16} strokeWidth={1.9} />
                  Enviar solicitud
                  <ArrowUpRight size={14} strokeWidth={1.9} />
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </main>
  );
}
