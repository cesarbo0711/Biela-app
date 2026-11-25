import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Bike, Droplets, Gauge, Pencil, Plus, Trash2, X } from 'lucide-react';
import { UploadDropzone } from '../components/UploadDropzone.jsx';
import TiltCard from '../components/TiltCard.jsx';
import './Garage.css';

function formatearKm(valor) {
  return Number(valor || 0).toLocaleString('es-VE');
}

function estadoAceite(moto, servicios) {
  const registros = servicios.filter((servicio) => servicio.moto_id === moto.id);
  if (!registros.length) {
    return { label: 'Aceite por registrar', tone: 'neutral' };
  }

  const ultimo = [...registros].sort((a, b) =>
    String(b.fecha_servicio || '').localeCompare(String(a.fecha_servicio || ''))
  )[0];
  const intervalo = Number(ultimo?.catalogo_servicios?.intervalo_km) || 0;
  const restante = Number(ultimo?.km_al_momento || 0) + intervalo - Number(moto.kilometraje || 0);
  const km = Math.abs(Math.round(restante));

  if (restante <= 0) return { label: `Cambio vencido · ${km} km de retraso`, tone: 'danger' };
  if (restante <= 300) return { label: `Cambio próximo · ${km} km restantes`, tone: 'warn' };
  return { label: `Aceite al día · ${km} km restantes`, tone: 'ok' };
}

function MotoCard({ moto, servicios, onVer, onEditarKm, onEliminar }) {
  const estado = estadoAceite(moto, servicios);

  return (
    <TiltCard className="gpane moto-card rounded-[2rem]">
      <button type="button" className="moto-delete" onClick={onEliminar} onPointerDown={(e) => e.stopPropagation()} title="Eliminar vehículo" aria-label="Eliminar vehículo">
        <Trash2 size={16} />
      </button>

      <button type="button" className="moto-visual" onClick={onVer} onPointerDown={(e) => e.stopPropagation()} aria-label={`Ver bitácora de ${moto.marca} ${moto.modelo}`}>
        {moto.imagen_url ? (
          <img src={moto.imagen_url} alt={`${moto.marca} ${moto.modelo}`} className="moto-image h-56 w-full object-contain" />
        ) : (
          <span className="moto-placeholder">
            <Bike size={30} strokeWidth={1.6} />
            <span>Sin foto</span>
          </span>
        )}
      </button>

      <div className="moto-info">
        <div className="moto-title-row">
          <h3>{moto.marca} {moto.modelo}</h3>
          <span className="moto-year tabular-nums">{moto.year || '—'}</span>
        </div>

        <div className={`moto-status tone-${estado.tone}`}>
          <span className="w-2 h-2 rounded-full moto-status-dot" aria-hidden="true" />
          <span>{estado.label}</span>
        </div>

        <div className="moto-facts">
          <div className="moto-fact">
            <div className="moto-fact-label"><Gauge size={14} /> Odómetro</div>
            <div className="moto-fact-value tabular-nums">
              {formatearKm(moto.kilometraje)} <small>km</small>
            </div>
            <button type="button" className="moto-fact-edit" onClick={onEditarKm} onPointerDown={(e) => e.stopPropagation()} title="Ajustar kilometraje" aria-label="Ajustar kilometraje">
              <Pencil size={13} />
            </button>
          </div>
          <div className="moto-fact">
            <div className="moto-fact-label"><Droplets size={14} /> Aceite</div>
            <div className="moto-fact-value moto-fact-value-text">{moto.tipo_aceite || 'Por definir'}</div>
          </div>
        </div>

        <button type="button" className="moto-open" onClick={onVer} onPointerDown={(e) => e.stopPropagation()}>
          Ver bitácora <ArrowUpRight size={16} />
        </button>
      </div>
    </TiltCard>
  );
}

export default function Garage({
  usuario,
  motos = [],
  servicios = [],
  recargar,
  abrirModalAdd = false,
  setAbrirModalAdd,
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
    <section className="garage-root">
      {motos.length === 0 ? (
        <div className="gpane moto-empty">
          <span className="moto-empty-icon"><Bike size={26} strokeWidth={1.6} /></span>
          <h2>Tu garaje está vacío</h2>
          <p>Añade tu primera moto para empezar la bitácora.</p>
          <button type="button" onClick={() => setAbrirModalAdd(true)}>
            <Plus size={16} /> Añadir moto
          </button>
        </div>
      ) : motos.length === 1 ? (
        <div className="moto-single max-w-lg mx-auto">
          <MotoCard
            moto={motos[0]}
            servicios={servicios}
            onVer={() => navigate(`/moto/${motos[0].id}`)}
            onEditarKm={() => abrirEdicionKm(motos[0])}
            onEliminar={() => abrirEliminacion(motos[0])}
          />
        </div>
      ) : (
        <div className="moto-grid grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
          {motos.map((moto) => (
            <MotoCard
              key={moto.id}
              moto={moto}
              servicios={servicios}
              onVer={() => navigate(`/moto/${moto.id}`)}
              onEditarKm={() => abrirEdicionKm(moto)}
              onEliminar={() => abrirEliminacion(moto)}
            />
          ))}
        </div>
      )}

      {abrirModalAdd && (
        <div className="biela-modal-overlay" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setAbrirModalAdd(false);
        }}>
          <div className="gpane biela-modal-panel">
            <button type="button" className="biela-modal-close" onClick={() => setAbrirModalAdd(false)} aria-label="Cerrar">
              <X size={16} />
            </button>
            <div className="biela-modal-head">
              <span className="biela-modal-badge">Nueva moto</span>
              <h2>Añadir al garaje</h2>
              <p>Registra los datos esenciales de tu vehículo.</p>
            </div>
            <form onSubmit={registrarMoto} className="biela-modal-form">
              <div className="biela-modal-upload">
                <UploadDropzone onFileSelect={(imagen_url) => setImagenArchivo(imagen_url)} />
                <label>Foto de la moto</label>
              </div>
              <div className="biela-modal-field">
                <label htmlFor="garage-marca">Marca</label>
                <input id="garage-marca" type="text" placeholder="Ej. Bera" value={marca} onChange={(e) => setMarca(e.target.value)} required />
              </div>
              <div className="biela-modal-row">
                <div className="biela-modal-field">
                  <label htmlFor="garage-modelo">Modelo</label>
                  <input id="garage-modelo" type="text" placeholder="Ej. BR" value={modelo} onChange={(e) => setModelo(e.target.value)} required />
                </div>
                <div className="biela-modal-field biela-modal-year">
                  <label htmlFor="garage-year">Año</label>
                  <input id="garage-year" type="text" placeholder="2026" value={year} onChange={(e) => setYear(e.target.value)} required />
                </div>
              </div>
              <div className="biela-modal-row">
                <div className="biela-modal-field">
                  <label htmlFor="garage-km">Kilometraje</label>
                  <input id="garage-km" type="number" min="0" placeholder="Ej. 820" value={kilometraje} onChange={(e) => setKilometraje(e.target.value)} required />
                </div>
                <div className="biela-modal-field">
                  <label htmlFor="garage-aceite">Aceite</label>
                  <input id="garage-aceite" type="text" placeholder="Ej. 20W-50" value={tipoAceite} onChange={(e) => setTipoAceite(e.target.value)} />
                </div>
              </div>
              <div className="biela-modal-actions">
                <button type="button" className="biela-modal-secondary" onClick={() => setAbrirModalAdd(false)}>Cancelar</button>
                <button type="submit" className="biela-modal-primary" disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar moto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isKmModalOpen && (
        <div className="biela-modal-overlay" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setIsKmModalOpen(false);
        }}>
          <div className="gpane biela-modal-panel biela-modal-panel-mini">
            <button type="button" className="biela-modal-close" onClick={() => setIsKmModalOpen(false)} aria-label="Cerrar">
              <X size={16} />
            </button>
            <div className="biela-modal-head">
              <span className="biela-modal-badge">Odómetro</span>
              <h2>Ajustar kilometraje</h2>
              <p>{motoActiva?.marca} {motoActiva?.modelo}</p>
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
                <button type="button" className="biela-modal-secondary" onClick={() => setIsKmModalOpen(false)}>Cancelar</button>
                <button type="submit" className="biela-modal-primary" disabled={cargando}>{cargando ? '...' : 'Actualizar'}</button>
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
          <div className="gpane biela-modal-panel biela-modal-panel-mini">
            <button type="button" className="biela-modal-close" onClick={() => { setIsDeleteModalOpen(false); setMotoActiva(null); }} aria-label="Cerrar">
              <X size={16} />
            </button>
            <span className="biela-modal-danger-icon"><Trash2 size={22} strokeWidth={1.7} /></span>
            <h2 className="biela-modal-danger-title">Eliminar vehículo</h2>
            <p className="biela-modal-danger-copy">Se borrará toda la bitácora de forma permanente.</p>
            <div className="biela-modal-actions">
              <button type="button" className="biela-modal-secondary" onClick={() => { setIsDeleteModalOpen(false); setMotoActiva(null); }}>Cancelar</button>
              <button type="button" className="biela-modal-danger" onClick={confirmarEliminacion} disabled={cargando}>{cargando ? 'Borrando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
