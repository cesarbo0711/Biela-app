import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Gauge, Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { UploadDropzone } from '../components/UploadDropzone.jsx';
import './Garage.css';

function formatearKm(valor) {
  return Number(valor || 0).toLocaleString('es-VE');
}

function estadoAceite(moto, servicios) {
  const registros = servicios.filter((servicio) => servicio.moto_id === moto.id);
  if (!registros.length) {
    return {
      label: '🟠 Por registrar service',
      detail: 'Carga tu primer mantenimiento en la bitácora.',
      tone: 'warn',
    };
  }

  const ultimo = [...registros].sort((a, b) =>
    String(b.fecha_servicio || '').localeCompare(String(a.fecha_servicio || ''))
  )[0];
  const intervalo = Number(ultimo?.catalogo_servicios?.intervalo_km) || 0;
  const restante = Number(ultimo?.km_al_momento || 0) + intervalo - Number(moto.kilometraje || 0);
  const km = Math.abs(Math.round(restante));

  if (restante <= 0) return { label: '🔴 Service vencido', detail: `${km} km de retraso`, tone: 'danger' };
  if (restante <= 300) return { label: `🟠 Próximo cambio en ${km} km`, detail: 'Programa tu próximo service.', tone: 'warn' };
  return { label: '🟢 Todo al día', detail: `Próximo cambio en ${km} km`, tone: 'ok' };
}

function MotoStage({ moto }) {
  return (
    <div className="garage-stage-wrap">
      <div className="garage-card-glow" aria-hidden="true" />
      <div className="garage-stage">
        <span className="garage-stage-ring" aria-hidden="true" />
        {moto.imagen_url ? (
          <img src={moto.imagen_url} alt={`${moto.marca} ${moto.modelo}`} className="garage-moto-img" />
        ) : (
          <div className="garage-no-photo"><Gauge size={30} /><span>Sin foto</span></div>
        )}
        <span className="garage-floor" aria-hidden="true" />
      </div>
    </div>
  );
}

function MotoDetails({ moto, servicios, destacada, onVer, onEditarKm, onEliminar, onExportar }) {
  const estado = estadoAceite(moto, servicios);
  const historial = servicios
    .filter((servicio) => servicio.moto_id === moto.id)
    .sort((a, b) => String(b.fecha_servicio || '').localeCompare(String(a.fecha_servicio || '')))
    .slice(0, 3);

  return (
    <div className={`garage-body${destacada ? ' garage-feature-panel' : ''}`}>
      <button type="button" className="garage-delete" onClick={onEliminar} title="Borrar vehículo" aria-label="Borrar vehículo">
        <Trash2 size={16} />
      </button>

      <header className="garage-card-head">
        <div>
          <span className="garage-eyebrow">{destacada ? 'VEHÍCULO PRINCIPAL' : 'EN FLOTA'}</span>
          <h3>{moto.marca} <span>/</span> {moto.modelo}</h3>
        </div>
        <span className="garage-year">{moto.year || 'N/A'}</span>
      </header>

      <div className={`garage-traffic tone-${estado.tone}`}>
        <span className="garage-traffic-dot" aria-hidden="true" />
        <div>
          <strong>{estado.label}</strong>
          <small>{estado.detail}</small>
        </div>
      </div>

      <div className="garage-metrics">
        <div className="garage-metric">
          <span>Kilometraje</span>
          <strong>{formatearKm(moto.kilometraje)} <small>KM</small></strong>
          <button type="button" className="garage-edit-km" onClick={onEditarKm} title="Actualizar Kilometraje" aria-label="Actualizar Kilometraje">
            <Pencil size={14} />
          </button>
        </div>
        <div className="garage-metric">
          <span>Aceite configurado</span>
          <strong className="garage-metric-text">{moto.tipo_aceite || 'N/A'}</strong>
        </div>
      </div>

      {destacada && (
        <div className="garage-history">
          <div className="garage-history-head">
            <span>Últimos mantenimientos</span>
            <button type="button" onClick={onVer}>Ver todos <ArrowRight size={13} /></button>
          </div>
          {historial.length ? (
            <ul>
              {historial.map((servicio) => (
                <li key={servicio.id}>
                  <span className="garage-history-dot" aria-hidden="true" />
                  <div>
                    <strong>{servicio.catalogo_servicios?.nombre || 'Mantenimiento'}</strong>
                    <small>{servicio.fecha_servicio || 'Sin fecha'} · {formatearKm(servicio.km_al_momento)} km</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="garage-history-empty">Tu bitácora está lista para el primer registro.</p>
          )}
        </div>
      )}

      <div className="garage-actions">
        <button type="button" className="garage-action-primary" onClick={onVer}>
          <Wrench size={17} /> Abrir Bitácora & Finanzas <ArrowRight size={17} />
        </button>
        <div className="garage-action-row">
          <button type="button" className="garage-action-secondary" onClick={onEditarKm}>
            <Gauge size={16} /> Ajustar KM
          </button>
          <button type="button" className="garage-action-secondary" onClick={onExportar}>
            <FileText size={16} /> Hoja de Vida PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function MotoCard(props) {
  return (
    <article className="garage-card">
      <MotoStage moto={props.moto} />
      <MotoDetails {...props} />
    </article>
  );
}

export default function Garage({
  usuario,
  motos = [],
  servicios = [],
  recargar,
  abrirModalAdd = false,
  setAbrirModalAdd,
  onExportar,
}) {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isKmModalOpen, setIsKmModalOpen] = useState(false);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [year, setYear] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [tipoAceite, setTipoAceite] = useState('');
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [motoActiva, setMotoActiva] = useState(null);
  const [nuevoKm, setNuevoKm] = useState('');
  const [cargando, setCargando] = useState(false);

  const abrirEdicionKm = (moto) => {
    setMotoActiva(moto);
    setNuevoKm(moto.kilometraje);
    setIsKmModalOpen(true);
  };

  const abrirEliminacion = (moto) => {
    setMotoActiva(moto);
    setIsDeleteModalOpen(true);
  };

  const exportarMoto = (moto) => {
    if (onExportar) {
      onExportar(moto);
      return;
    }
    navigate(`/moto/${moto.id}?exportar=pdf`);
  };

  const registrarMoto = async (e) => {
    e.preventDefault();
    setCargando(true);
    let urlImagen = null;

    if (imagenArchivo) {
      const fileExt = imagenArchivo.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${usuario.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehiculos')
        .upload(filePath, imagenArchivo);

      if (uploadError) {
        alert('Error al subir la imagen: ' + uploadError.message);
        setCargando(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('vehiculos')
        .getPublicUrl(filePath);

      urlImagen = publicUrl;
    }

    const { error } = await supabase.from('motos').insert([{
      user_id: usuario.id,
      marca,
      modelo,
      year,
      kilometraje: parseInt(kilometraje) || 0,
      tipo_aceite: tipoAceite,
      imagen_url: urlImagen,
    }]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      setMarca('');
      setModelo('');
      setYear('');
      setKilometraje('');
      setTipoAceite('');
      setImagenArchivo(null);
      setAbrirModalAdd(false);
      await recargar();
    }
    setCargando(false);
  };

  const actualizarKm = async (e) => {
    e.preventDefault();
    setCargando(true);
    const { error } = await supabase
      .from('motos')
      .update({ kilometraje: parseInt(nuevoKm) })
      .eq('id', motoActiva.id);

    if (error) alert('Error: ' + error.message);
    else {
      setIsKmModalOpen(false);
      await recargar();
    }
    setCargando(false);
  };

  const confirmarEliminacion = async () => {
    if (!motoActiva) return;
    setCargando(true);
    const { error } = await supabase.from('motos').delete().eq('id', motoActiva.id);
    if (error) alert('Error: ' + error.message);
    else {
      setIsDeleteModalOpen(false);
      setMotoActiva(null);
      await recargar();
    }
    setCargando(false);
  };

  return (
    <section className="garage-root biela-fade-in">
      <div className="garage-section-head">
        <div>
          <span className="garage-section-label">GARAJE DIGITAL</span>
          <h2>Tus vehículos</h2>
          <p>Una vista de cockpit para cada nave en tu flota.</p>
        </div>
        <button type="button" className="garage-head-add" onClick={() => setAbrirModalAdd(true)}>
          <Plus size={17} strokeWidth={3} /> <span>Añadir moto</span>
        </button>
      </div>

      {motos.length === 0 ? (
        <div className="garage-empty">
          <span className="garage-empty-icon"><Wrench size={32} /></span>
          <h3>Tu garaje está esperando su primera nave.</h3>
          <p>Registra tu moto y BujIA construirá su historial inteligente desde el primer kilómetro.</p>
          <button type="button" onClick={() => setAbrirModalAdd(true)}>+ Registrar Moto</button>
        </div>
      ) : motos.length === 1 ? (
        <div className="garage-feature-grid">
          <MotoStage moto={motos[0]} />
          <MotoDetails
            moto={motos[0]}
            servicios={servicios}
            destacada
            onVer={() => navigate(`/moto/${motos[0].id}`)}
            onEditarKm={() => abrirEdicionKm(motos[0])}
            onEliminar={() => abrirEliminacion(motos[0])}
            onExportar={() => exportarMoto(motos[0])}
          />
        </div>
      ) : (
        <div className="garage-grid">
          {motos.map((moto) => (
            <MotoCard
              key={moto.id}
              moto={moto}
              servicios={servicios}
              onVer={() => navigate(`/moto/${moto.id}`)}
              onEditarKm={() => abrirEdicionKm(moto)}
              onEliminar={() => abrirEliminacion(moto)}
              onExportar={() => exportarMoto(moto)}
            />
          ))}
        </div>
      )}

      {abrirModalAdd && (
        <div className="biela-modal-overlay" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setAbrirModalAdd(false);
        }}>
          <div className="biela-modal-panel">
            <div className="biela-modal-head">
              <span className="biela-modal-badge">NUEVA NAVE</span>
              <h2>Añadir al Garaje</h2>
              <p>Registra los datos de tu vehículo y su bitácora nace aquí.</p>
            </div>
            <form onSubmit={registrarMoto} className="biela-modal-form">
              <div className="biela-modal-upload">
                <UploadDropzone onFileSelect={(imagen_url) => setImagenArchivo(imagen_url)} />
                <label>Foto de tu Moto</label>
              </div>
              <div className="biela-modal-input-group">
                <label htmlFor="garage-marca">Marca</label>
                <input id="garage-marca" type="text" placeholder="ej. Bera" value={marca} onChange={(e) => setMarca(e.target.value)} required />
              </div>
              <div className="biela-modal-input-row">
                <div className="biela-modal-input-group">
                  <label htmlFor="garage-modelo">Modelo</label>
                  <input id="garage-modelo" type="text" placeholder="ej. BR" value={modelo} onChange={(e) => setModelo(e.target.value)} required />
                </div>
                <div className="biela-modal-input-group biela-modal-input-year">
                  <label htmlFor="garage-year">Año</label>
                  <input id="garage-year" type="text" placeholder="2026" value={year} onChange={(e) => setYear(e.target.value)} required />
                </div>
              </div>
              <div className="biela-modal-input-row">
                <div className="biela-modal-input-group">
                  <label htmlFor="garage-km">Kilometraje</label>
                  <input id="garage-km" type="number" min="0" placeholder="ej. 820" value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} required />
                </div>
                <div className="biela-modal-input-group">
                  <label htmlFor="garage-aceite">Aceite</label>
                  <input id="garage-aceite" type="text" placeholder="ej. 20W-50" value={tipoAceite} onChange={(e) => setTipoAceite(e.target.value)} />
                </div>
              </div>
              <div className="biela-modal-actions">
                <button type="button" className="biela-modal-btn-secondary" onClick={() => setAbrirModalAdd(false)}>Cancelar</button>
                <button type="submit" className="biela-modal-btn-primary" disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar moto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isKmModalOpen && (
        <div className="biela-modal-overlay" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setIsKmModalOpen(false);
        }}>
          <div className="biela-modal-panel biela-modal-panel-mini">
            <div className="biela-modal-head">
              <span className="biela-modal-badge">ODÓMETRO</span>
              <h2>Ajustar Kilometraje</h2>
              <p>Actualiza la lectura actual de {motoActiva?.marca} {motoActiva?.modelo}.</p>
            </div>
            <form onSubmit={actualizarKm} className="biela-modal-form">
              <input
                type="number"
                min="0"
                autoFocus
                value={nuevoKm}
                onChange={(e) => setNuevoKm(e.target.value)}
                required
                className="biela-modal-km-input"
                aria-label="Nuevo kilometraje"
              />
              <div className="biela-modal-actions">
                <button type="button" className="biela-modal-btn-secondary" onClick={() => setIsKmModalOpen(false)}>Cancelar</button>
                <button type="submit" className="biela-modal-btn-primary" disabled={cargando}>{cargando ? '...' : 'Actualizar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="biela-modal-overlay" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setIsDeleteModalOpen(false);
            setMotoActiva(null);
          }
        }}>
          <div className="biela-modal-panel biela-modal-panel-mini">
            <span className="biela-modal-danger-icon"><Trash2 size={24} /></span>
            <h2 className="biela-modal-danger-title">¿Eliminar vehículo?</h2>
            <p className="biela-modal-danger-copy">Se borrará toda la bitácora de forma permanente.</p>
            <div className="biela-modal-actions">
              <button type="button" className="biela-modal-btn-secondary" onClick={() => { setIsDeleteModalOpen(false); setMotoActiva(null); }}>Cancelar</button>
              <button type="button" className="biela-modal-btn-danger" onClick={confirmarEliminacion} disabled={cargando}>{cargando ? 'Borrando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
