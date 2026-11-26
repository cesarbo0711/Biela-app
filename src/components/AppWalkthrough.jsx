import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import './AppWalkthrough.css';

const PASOS = [
  {
    etiqueta: 'Garaje',
    selectors: ['.moto-card', '.moto-empty', '.dashboard-header'],
    texto: 'Tu Garaje Vivo: Aquí ves tu moto en 3D, su estado de aceite y puedes tocarla para sentir su física táctil.',
  },
  {
    etiqueta: 'Odómetro',
    selectors: ['.moto-facts', '.moto-empty', '.dashboard-header'],
    texto: 'Odómetro y Pasaporte QR: Actualiza tus kilómetros en 2 segundos o entra a la bitácora para generar el QR verificable de compra-venta.',
  },
  {
    etiqueta: 'Navegación',
    selectors: ['.gdock'],
    texto: 'Navegación Rápida: Cambia entre tu Garaje, el Radar de Gasolina en vivo y BujIA, tu mecánico virtual 24/7.',
  },
];

const CARD_WIDTH = 340;
const CARD_HEIGHT = 260;

function encontrarObjetivo(selectors) {
  for (const selector of selectors) {
    const elemento = document.querySelector(selector);
    if (elemento) return elemento;
  }
  return null;
}

export default function AppWalkthrough({ onClose }) {
  const [indice, setIndice] = useState(0);
  const [rect, setRect] = useState(null);
  const paso = PASOS[indice];
  const esUltimo = indice === PASOS.length - 1;

  const medir = useCallback(() => {
    const objetivo = encontrarObjetivo(paso.selectors);
    if (!objetivo) {
      setRect(null);
      return;
    }
    const bounds = objetivo.getBoundingClientRect();
    setRect({
      top: bounds.top,
      left: bounds.left,
      width: bounds.width,
      height: bounds.height,
    });
  }, [paso]);

  useEffect(() => {
    let activo = true;
    const medirActivo = () => {
      if (activo) medir();
    };
    const frame = requestAnimationFrame(medirActivo);
    window.addEventListener('resize', medirActivo);
    window.addEventListener('scroll', medirActivo, true);
    return () => {
      activo = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', medirActivo);
      window.removeEventListener('scroll', medirActivo, true);
    };
  }, [medir]);

  useEffect(() => {
    const manejarTecla = (event) => {
      if (event.key === 'Escape') onClose?.(false);
    };
    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [onClose]);

  const anchoVentana = window.innerWidth;
  const altoVentana = window.innerHeight;
  const centroObjetivo = rect ? rect.left + rect.width / 2 : anchoVentana / 2;
  const left = Math.max(
    12,
    Math.min(centroObjetivo - CARD_WIDTH / 2, anchoVentana - CARD_WIDTH - 12),
  );
  const espacioAbajo = rect ? altoVentana - (rect.top + rect.height) : altoVentana;
  const colocarArriba = Boolean(rect) && espacioAbajo < CARD_HEIGHT + 24 && rect.top > CARD_HEIGHT;
  const top = colocarArriba
    ? Math.max(12, rect.top - CARD_HEIGHT - 14)
    : Math.min(
      Math.max(12, (rect?.top ?? altoVentana / 2) + (rect?.height ?? 0) + 14),
      altoVentana - CARD_HEIGHT - 12,
    );
  const flechaX = Math.max(18, Math.min(centroObjetivo - left, CARD_WIDTH - 18));

  return (
    <div className="aw-overlay" role="dialog" aria-modal="true" aria-label="Guía rápida de Biela">
      {rect && (
        <div
          className="aw-spotlight"
          style={{
            top: `${rect.top - 5}px`,
            left: `${rect.left - 5}px`,
            width: `${rect.width + 10}px`,
            height: `${rect.height + 10}px`,
          }}
          aria-hidden="true"
        />
      )}

      <article
        className={`aw-card ${colocarArriba ? 'is-above' : 'is-below'}`}
        style={{ top: `${top}px`, left: `${left}px`, '--aw-arrow-x': `${flechaX}px` }}
      >
        <span className="aw-arrow" aria-hidden="true" />

        <div className="aw-card-head">
          <span className="aw-step">{indice + 1} / {PASOS.length}</span>
          <span className="aw-topic"><Sparkles size={12} strokeWidth={2.2} /> {paso.etiqueta}</span>
        </div>

        <p className="aw-text">{paso.texto}</p>

        <div className="aw-tabs" aria-label="Pasos de la guía">
          {PASOS.map((item, posicion) => (
            <button
              key={item.etiqueta}
              type="button"
              className={`aw-tab${posicion === indice ? ' is-active' : ''}`}
              onClick={() => setIndice(posicion)}
              aria-current={posicion === indice ? 'step' : undefined}
            >
              {item.etiqueta}
            </button>
          ))}
        </div>

        <div className="aw-actions">
          <button type="button" className="aw-skip" onClick={() => onClose?.(false)}>
            Saltar
          </button>
          <div className="aw-nav">
            <button
              type="button"
              className="aw-previous"
              onClick={() => setIndice((actual) => Math.max(0, actual - 1))}
              disabled={indice === 0}
            >
              <ArrowLeft size={14} /> Anterior
            </button>
            <button
              type="button"
              className="aw-next"
              onClick={() => (esUltimo ? onClose?.(true) : setIndice((actual) => actual + 1))}
            >
              {esUltimo ? '¡Entendido!' : 'Siguiente'}
              {esUltimo ? <Check size={15} strokeWidth={2.5} /> : <ArrowRight size={15} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
