import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { ProfileSkeleton } from '../components/BielaSkeletons.jsx';
import { useNavigate } from 'react-router-dom';
import { Camera, HelpCircle, LogOut, Moon, RefreshCw, Settings, Sun, User, X } from 'lucide-react';
import { ThemeBall } from '../components/ThemeBall';
import {
  AVATAR_STYLE_DEFAULT,
  AVATAR_STYLES_SELECTABLE,
  avatarStyleFromUrl,
  buildAvatarUrl,
} from '../utils/avatarStyles';
import './Profile.css';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function crearSemilla() {
  return Math.random().toString(36).substring(2, 10);
}

function esEstiloValido(estilo) {
  return AVATAR_STYLES_SELECTABLE.some(({ key }) => key === estilo);
}

function esAvatarSubido(url, seed) {
  return seed === 'custom' || (Boolean(url) && !url.includes('api.dicebear.com'));
}

export default function Profile({ usuario, isLightMode, toggleTheme }) {
  const navigate = useNavigate();
  const inputFotoRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const semillaInicial = crearSemilla();
  const [perfil, setPerfil] = useState({
    nombre: 'César Borrego',
    telefono: '',
    residencia: 'San Juan de los Morros, Venezuela',
    avatar_seed: semillaInicial,
    avatar_style: AVATAR_STYLE_DEFAULT,
    avatar_url: buildAvatarUrl(AVATAR_STYLE_DEFAULT, semillaInicial),
  });

  useEffect(() => {
    async function cargarPerfil() {
      if (!usuario) {
        setCargandoInicial(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', usuario.id)
          .maybeSingle();

        if (data) {
          const avatarUrlGuardada = data.avatar_url || '';
          const personalizado = esAvatarSubido(avatarUrlGuardada, data.avatar_seed);
          const semilla = data.avatar_seed && data.avatar_seed !== 'custom'
            ? data.avatar_seed
            : crearSemilla();
          const estilo = avatarStyleFromUrl(avatarUrlGuardada);

          setPerfil({
            nombre: data.nombre || 'César Borrego',
            telefono: data.telefono || '',
            residencia: data.residencia || 'San Juan de los Morros, Venezuela',
            avatar_seed: personalizado ? 'custom' : semilla,
            avatar_style: personalizado ? 'custom' : estilo,
            avatar_url: avatarUrlGuardada || buildAvatarUrl(estilo, semilla),
          });
        }
      } catch (error) {
        console.error('Error al cargar el perfil:', error);
      } finally {
        setCargandoInicial(false);
      }
    }
    cargarPerfil();
  }, [usuario]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setPerfil((prev) => ({ ...prev, [name]: value }));
  };

  const refrescarAvatar = () => {
    setAvatarError('');
    setPerfil((prev) => {
      const estilo = esEstiloValido(prev.avatar_style) ? prev.avatar_style : AVATAR_STYLE_DEFAULT;
      const semilla = crearSemilla();
      return {
        ...prev,
        avatar_seed: semilla,
        avatar_style: estilo,
        avatar_url: buildAvatarUrl(estilo, semilla),
      };
    });
  };

  const seleccionarEstilo = (estilo) => {
    setAvatarError('');
    setPerfil((prev) => {
      const semilla = prev.avatar_seed && prev.avatar_seed !== 'custom'
        ? prev.avatar_seed
        : crearSemilla();
      return {
        ...prev,
        avatar_seed: semilla,
        avatar_style: estilo,
        avatar_url: buildAvatarUrl(estilo, semilla),
      };
    });
  };

  const subirFoto = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo || !usuario?.id) return;

    if (!archivo.type.startsWith('image/')) {
      setAvatarError('Selecciona una imagen válida.');
      return;
    }

    if (archivo.size > MAX_AVATAR_BYTES) {
      setAvatarError('La imagen debe pesar menos de 5 MB.');
      return;
    }

    setSubiendoAvatar(true);
    setAvatarError('');

    try {
      const extension = archivo.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const ruta = `${usuario.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(ruta, archivo, { upsert: true, contentType: archivo.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(ruta);
      setPerfil((prev) => ({
        ...prev,
        avatar_seed: 'custom',
        avatar_style: 'custom',
        avatar_url: data.publicUrl,
      }));
    } catch (error) {
      console.error('Error subiendo avatar:', error);
      setAvatarError('No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setSubiendoAvatar(false);
    }
  };

  const guardarPerfil = async (e) => {
    e.preventDefault();
    setGuardando(true);

    const avatarSeed = perfil.avatar_seed || crearSemilla();
    const avatarUrlFinal = esAvatarSubido(perfil.avatar_url, avatarSeed)
      ? perfil.avatar_url
      : buildAvatarUrl(
        esEstiloValido(perfil.avatar_style) ? perfil.avatar_style : AVATAR_STYLE_DEFAULT,
        avatarSeed,
      );

    const { error } = await supabase
      .from('perfiles')
      .upsert({
        id: usuario.id,
        nombre: perfil.nombre,
        residencia: perfil.residencia,
        telefono: perfil.telefono,
        avatar_seed: avatarSeed,
        avatar_url: avatarUrlFinal,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error guardando perfil:', error);
      alert('Hubo un error al guardar los cambios.');
    } else {
      setIsModalOpen(false);
    }
    setGuardando(false);
  };

  const avatarPersonalizado = esAvatarSubido(perfil.avatar_url, perfil.avatar_seed);
  const avatarUrl = perfil.avatar_url
    || buildAvatarUrl(
      esEstiloValido(perfil.avatar_style) ? perfil.avatar_style : AVATAR_STYLE_DEFAULT,
      perfil.avatar_seed || perfil.nombre || 'piloto',
    );

  if (cargandoInicial) return <ProfileSkeleton />;

  return (
    <div className="biela-fade-in profile-container fade-in">
      <ThemeBall isLightMode={isLightMode} toggleTheme={toggleTheme} />

      <div className="profile-header">
        <div className="avatar-wrapper-main">
          <img src={avatarUrl} alt="Avatar de perfil" className="profile-avatar-img" />
        </div>
        <h2 className="profile-email">{perfil.nombre || usuario?.email}</h2>
        <p className="profile-residencia">{perfil.residencia}</p>
        <span className="profile-badge">
          <User size={12} strokeWidth={2.4} /> Piloto Oficial
        </span>
      </div>

      <div className="profile-actions">
        <button type="button" className="btn-menu-item gpane" onClick={() => setIsModalOpen(true)}>
          <Settings size={18} strokeWidth={1.8} />
          <span>Configuración de cuenta</span>
        </button>
        <button type="button" className="btn-menu-item gpane" onClick={() => navigate('/dashboard?tour=1')}>
          <HelpCircle size={18} strokeWidth={1.8} />
          <span>Ver guía rápida de la app</span>
        </button>
        <button type="button" onClick={toggleTheme} className="btn-theme gpane">
          {isLightMode ? <Moon size={17} strokeWidth={1.8} /> : <Sun size={17} strokeWidth={1.8} />}
          <span>{isLightMode ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}</span>
        </button>
        <button type="button" onClick={cerrarSesion} className="btn-logout-large gpane">
          <LogOut size={18} strokeWidth={1.8} />
          <span>Cerrar sesión</span>
        </button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setIsModalOpen(false);
        }}>
          <div className="modal-content gpane" role="dialog" aria-modal="true" aria-label="Editar perfil">
            <button type="button" className="btn-close-modal" onClick={() => setIsModalOpen(false)} aria-label="Cerrar">
              <X size={17} />
            </button>
            <h3>Editar Perfil</h3>

            <form onSubmit={guardarPerfil} className="profile-form">
              <div className="avatar-edit-container">
                <div className="avatar-preview-wrap">
                  <img src={avatarUrl} alt="Vista previa del avatar" className="avatar-preview-small" />
                  {!avatarPersonalizado && (
                    <button type="button" onClick={refrescarAvatar} className="btn-refresh-avatar" aria-label="Generar nuevo avatar" title="Generar nuevo avatar">
                      <RefreshCw size={15} strokeWidth={2} />
                    </button>
                  )}
                </div>

                <div className="avatar-style-picker" role="group" aria-label="Tipo de avatar">
                  {AVATAR_STYLES_SELECTABLE.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`avatar-style-option${!avatarPersonalizado && perfil.avatar_style === key ? ' is-active' : ''}`}
                      onClick={() => seleccionarEstilo(key)}
                      aria-pressed={!avatarPersonalizado && perfil.avatar_style === key}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <input
                  ref={inputFotoRef}
                  type="file"
                  accept="image/*"
                  className="avatar-file-input"
                  onChange={subirFoto}
                />
                <button
                  type="button"
                  className={`btn-upload-avatar${avatarPersonalizado ? ' is-active' : ''}`}
                  onClick={() => inputFotoRef.current?.click()}
                  disabled={subiendoAvatar}
                  aria-pressed={avatarPersonalizado}
                >
                  <Camera size={15} strokeWidth={1.8} />
                  <span>{subiendoAvatar ? 'Subiendo...' : 'Foto propia'}</span>
                </button>
                {avatarError && <p className="avatar-error">{avatarError}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="perfil-nombre">Nombre Completo</label>
                <input
                  id="perfil-nombre"
                  type="text"
                  name="nombre"
                  value={perfil.nombre}
                  onChange={manejarCambio}
                  placeholder="Ej: Carlos Pérez"
                />
              </div>

              <div className="form-group">
                <label htmlFor="perfil-residencia">Lugar de Residencia</label>
                <input
                  id="perfil-residencia"
                  type="text"
                  name="residencia"
                  value={perfil.residencia}
                  onChange={manejarCambio}
                  placeholder="Ej: Caracas"
                />
              </div>

              <div className="form-group">
                <label htmlFor="perfil-telefono">Número de Teléfono</label>
                <input
                  id="perfil-telefono"
                  type="tel"
                  name="telefono"
                  value={perfil.telefono}
                  onChange={manejarCambio}
                  placeholder="Ej: 0414-1234567"
                />
              </div>

              <button type="submit" className="btn-save-profile" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
