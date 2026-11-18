import { useMemo, useState } from 'react';
import './MotoHealthDiagram.css';

const PARTS = [
  {
    key: 'aceite',
    label: 'Aceite de Motor',
    interval: 2000,
    keywords: ['aceite', 'oil'],
    x: 54,
    y: 88,
    anchor: { x: 52, y: 64 },
  },
  {
    key: 'bujia',
    label: 'Bujía y Carburador/Inyección',
    interval: 5000,
    keywords: ['bujia', 'bujía', 'carbur', 'inyecc', 'chispa', 'spark'],
    x: 46,
    y: 12,
    anchor: { x: 49, y: 41 },
  },
  {
    key: 'cadena',
    label: 'Kit de Arrastre / Cadena',
    interval: 8000,
    keywords: ['cadena', 'arrastre', 'piñon', 'pinon', 'corona', 'kit', 'sprocket', 'transmision'],
    x: 24,
    y: 88,
    anchor: { x: 39, y: 69 },
  },
  {
    key: 'frenos',
    label: 'Frenos / Pastillas',
    interval: 6000,
    keywords: ['freno', 'pastilla', 'banda', 'disco', 'brake'],
    x: 86,
    y: 54,
    anchor: { x: 71, y: 62 },
  },
  {
    key: 'cauchos',
    label: 'Cauchos / Neumáticos',
    interval: 15000,
    keywords: ['caucho', 'neum', 'llanta', 'goma', 'tire'],
    x: 12,
    y: 54,
    anchor: { x: 26, y: 73 },
  },
];

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getStatus = (pct) => {
  if (pct > 35) return { key: 'ok', label: 'Óptimo', color: '#84cc16' };
  if (pct >= 15) return { key: 'warn', label: 'Próximo a mantenimiento', color: '#f97316' };
  return { key: 'danger', label: 'Mantenimiento urgente', color: '#ef4444' };
};

function computePart(part, kilometrajeActual, historialMantenimientos) {
  const kmActual = Math.max(0, Number(kilometrajeActual) || 0);
  const historial = Array.isArray(historialMantenimientos) ? historialMantenimientos : [];

  const matches = historial.filter((item) => {
    const nombre = normalize(item?.catalogo_servicios?.nombre || item?.servicio || '');
    const notas = normalize(item?.notas || '');
    const haystack = `${nombre} ${notas}`;
    return part.keywords.some((k) => haystack.includes(normalize(k)));
  });

  let lastKm = null;
  if (matches.length > 0) {
    lastKm = matches.reduce((max, item) => {
      const km = Number(item?.km_al_momento);
      if (!Number.isFinite(km)) return max;
      return Math.max(max, km);
    }, -Infinity);
    if (!Number.isFinite(lastKm)) lastKm = null;
  }

  let kmRecorridos;
  if (lastKm !== null) {
    kmRecorridos = Math.max(0, kmActual - lastKm);
  } else {
    kmRecorridos = part.interval > 0 ? kmActual % part.interval : 0;
  }

  const remainingKm = Math.max(0, part.interval - kmRecorridos);
  const pctRemaining = part.interval > 0 ? Math.max(0, Math.min(100, (remainingKm / part.interval) * 100)) : 0;
  const status = getStatus(pctRemaining);

  return {
    ...part,
    kmActual,
    kmRecorridos,
    remainingKm,
    pctRemaining,
    status,
    lastKm,
  };
}

export default function MotoHealthDiagram({
  kilometrajeActual = 0,
  historialMantenimientos = [],
  catalogoServicios = [],
  onRegistrarServicio,
}) {
  const [activeKey, setActiveKey] = useState(PARTS[0].key);

  const parts = useMemo(
    () => PARTS.map((p) => computePart(p, kilometrajeActual, historialMantenimientos)),
    [kilometrajeActual, historialMantenimientos]
  );

  const active = parts.find((p) => p.key === activeKey) || parts[0];

  const findCatalogMatch = (keywords) => {
    const list = Array.isArray(catalogoServicios) ? catalogoServicios : [];
    const match = list.find((c) => {
      const nombre = normalize(c?.nombre || '');
      return keywords.some((k) => nombre.includes(normalize(k)));
    });
    return match?.id ?? null;
  };

  const handleRegister = () => {
    const serviceId = findCatalogMatch(active.keywords);
    if (onRegistrarServicio) onRegistrarServicio(serviceId);
  };

  return (
    <div className="moto-health">
      <div className="moto-health__stage">
        <svg
          className="moto-health__svg"
          viewBox="0 0 1000 500"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Radiografía esquemática de la motocicleta"
        >
          <defs>
            <linearGradient id="mh-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="mh-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Sombra base */}
          <ellipse cx="500" cy="445" rx="360" ry="18" fill="currentColor" opacity="0.08" />

          {/* Rueda trasera */}
          <circle cx="260" cy="345" r="96" className="mh-stroke" />
          <circle cx="260" cy="345" r="64" className="mh-stroke mh-dim" />
          <circle cx="260" cy="345" r="12" className="mh-fill" />
          <g className="mh-stroke mh-dim" opacity="0.35">
            <line x1="260" y1="255" x2="260" y2="435" />
            <line x1="170" y1="345" x2="350" y2="345" />
            <line x1="196" y1="281" x2="324" y2="409" />
            <line x1="324" y1="281" x2="196" y2="409" />
          </g>

          {/* Rueda delantera */}
          <circle cx="740" cy="345" r="96" className="mh-stroke" />
          <circle cx="740" cy="345" r="64" className="mh-stroke mh-dim" />
          <circle cx="740" cy="345" r="40" className="mh-stroke mh-accent" />
          <circle cx="740" cy="345" r="12" className="mh-fill" />
          <g className="mh-stroke mh-dim" opacity="0.35">
            <line x1="740" y1="255" x2="740" y2="435" />
            <line x1="650" y1="345" x2="830" y2="345" />
            <line x1="676" y1="281" x2="804" y2="409" />
            <line x1="804" y1="281" x2="676" y2="409" />
          </g>

          {/* Basculante / swingarm */}
          <path d="M300 330 L500 300 L525 334 L300 360 Z" className="mh-fill" />
          <path d="M260 345 L505 312" className="mh-stroke" />
          <path d="M260 345 L505 332" className="mh-stroke mh-dim" />

          {/* Chasis principal */}
          <path d="M505 300 L420 245 L435 165 L640 175 L705 235 L560 300 Z" fill="url(#mh-body)" className="mh-stroke" />

          {/* Motor */}
          <path d="M430 248 L565 248 L582 332 L418 332 Z" className="mh-stroke" />
          <path d="M430 248 L565 248 L582 332 L418 332 Z" className="mh-fill" opacity="0.6" />
          <path d="M452 248 L458 190 L525 185 L548 248" className="mh-stroke" />
          <path d="M462 205 L535 200" className="mh-stroke mh-dim" />
          <path d="M466 218 L532 213" className="mh-stroke mh-dim" />
          <path d="M470 232 L528 228" className="mh-stroke mh-dim" />
          <line x1="445" y1="275" x2="555" y2="275" className="mh-stroke mh-dim" />
          <line x1="442" y1="295" x2="560" y2="295" className="mh-stroke mh-dim" />
          <line x1="438" y1="315" x2="565" y2="315" className="mh-stroke mh-dim" />
          <circle cx="500" cy="300" r="22" className="mh-stroke mh-dim" />

          {/* Tanque */}
          <path
            d="M438 168 C 475 112, 595 112, 648 168 C 618 218, 522 232, 458 212 Z"
            className="mh-stroke"
          />
          <path
            d="M438 168 C 475 112, 595 112, 648 168 C 618 218, 522 232, 458 212 Z"
            fill="url(#mh-body)"
            opacity="0.8"
          />

          {/* Asiento y colín */}
          <path
            d="M628 175 C 700 165, 748 188, 728 225 C 678 238, 640 228, 612 208 Z"
            className="mh-stroke"
          />
          <path d="M728 225 L745 260 L740 345" className="mh-stroke mh-dim" />

          {/* Subchasis y amortiguador */}
          <path d="M560 248 L525 305" className="mh-stroke mh-dim" />
          <path d="M705 235 L730 245" className="mh-stroke mh-dim" />

          {/* Dirección, faro y manillar */}
          <path d="M438 168 L405 150 L365 120" className="mh-stroke" />
          <path d="M365 120 L335 128" className="mh-stroke" />
          <path d="M365 120 L352 96" className="mh-stroke" />
          <path d="M405 150 L388 138 L398 118 L418 132 Z" className="mh-stroke mh-dim" />
          <circle cx="435" cy="165" r="10" className="mh-stroke mh-dim" />

          {/* Horquillas delanteras */}
          <path d="M430 170 L700 305" className="mh-stroke" />
          <path d="M448 178 L718 313" className="mh-stroke" />
          <path d="M700 305 L740 345" className="mh-stroke" />
          <path d="M718 313 L740 345" className="mh-stroke" />

          {/* Escape */}
          <path d="M570 318 C 630 355, 695 365, 770 338" className="mh-stroke" />
          <path d="M770 338 L800 332" className="mh-stroke" />

          {/* Cadena y coronas/piñón */}
          <path d="M505 327 C 435 360, 360 372, 305 358" className="mh-stroke mh-accent" />
          <path d="M505 315 C 435 348, 360 360, 305 346" className="mh-stroke mh-accent" />
          <circle cx="505" cy="321" r="18" className="mh-stroke mh-dim" />
          <circle cx="305" cy="352" r="24" className="mh-stroke mh-dim" />

          {/* Pinza de freno delantero */}
          <path d="M702 305 L726 294 L738 322 L714 333 Z" className="mh-stroke" />
          <path d="M726 294 L740 345" className="mh-stroke mh-dim" />

          {/* Líneas guía a hotspots */}
          {parts.map((p) => (
            <g key={p.key}>
              <line
                x1={p.anchor.x * 10}
                y1={p.anchor.y * 5}
                x2={p.x * 10}
                y2={p.y * 5}
                className={`mh-leader ${activeKey === p.key ? 'is-active' : ''}`}
                style={{ stroke: p.status.color }}
              />
              <circle
                cx={p.anchor.x * 10}
                cy={p.anchor.y * 5}
                r="4.5"
                style={{ fill: p.status.color }}
                opacity="0.95"
              />
            </g>
          ))}
        </svg>

        {parts.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`mh-hotspot ${p.status.key} ${activeKey === p.key ? 'is-active' : ''}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              '--mh-color': p.status.color,
            }}
            onClick={() => setActiveKey(p.key)}
            aria-label={`${p.label}: ${p.status.label}`}
            title={p.label}
          >
            <span className="mh-hotspot__dot" />
          </button>
        ))}
      </div>

      {active && (
        <div className="moto-health__panel" style={{ '--mh-color': active.status.color }}>
          <div className="moto-health__panel-head">
            <div>
              <div className="moto-health__title">{active.label}</div>
              <div className="moto-health__status">{active.status.label}</div>
            </div>
            <div className="moto-health__pct">{Math.round(active.pctRemaining)}%</div>
          </div>

          <div className="moto-health__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(active.pctRemaining)}>
            <div
              className="moto-health__bar-fill"
              style={{ width: `${active.pctRemaining}%`, backgroundColor: active.status.color }}
            />
          </div>

          <div className="moto-health__stats">
            <div className="moto-health__stat">
              <span className="k">Vida útil</span>
              <span className="v">{Math.round(active.pctRemaining)}% restante</span>
            </div>
            <div className="moto-health__stat">
              <span className="k">Recorridos</span>
              <span className="v">{active.kmRecorridos.toLocaleString('en-US')} km desde último cambio</span>
            </div>
            <div className="moto-health__stat">
              <span className="k">Restantes</span>
              <span className="v">{active.remainingKm.toLocaleString('en-US')} km recomendados</span>
            </div>
            <div className="moto-health__stat">
              <span className="k">Intervalo</span>
              <span className="v">cada {active.interval.toLocaleString('en-US')} km</span>
            </div>
          </div>

          <button type="button" className="moto-health__cta" onClick={handleRegister}>
            Registrar servicio ahora
          </button>
        </div>
      )}
    </div>
  );
}
