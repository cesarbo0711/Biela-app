import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Liquid } from "liquid-gooey";
import "./ThemeBall.css";

/* ── the zoom correction, applied to someone else's SVG ────── */
function useGooScale() {
  const box = useRef(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      const next = (r.width / (el.offsetWidth || r.width)) || 1;
      setK((was) => (Math.abs(was - next) < 0.001 ? was : next));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    const t = window.setInterval(read, 500);
    return () => { ro.disconnect(); window.clearInterval(t); };
  }, []);
  return { box, k };
}

/* ── ThemeBall: Adaptación de DraggingBall de Bencho ── */
const SWELL = 0.06;

export function ThemeBall({
  isLightMode,
  toggleTheme,
  stretch = 36,
  give = 50,
  size = 56, // Tamaño del botón
  grip = 50,
}) {
  const g = Math.min(1, Math.max(0, grip / 100));
  const { box, k } = useGooScale();

  const armed = useRef(false);
  const grab = () => {
    if (armed.current) return;
    armed.current = true;
  };
  
  // Al soltar (o tocar), cambiamos el tema si no se movió mucho
  const drop = (e, info) => {
    if (!armed.current) return;
    armed.current = false;
    
    // Si fue solo un clic (no se arrastró), cambiamos el tema
    if (info && info.offset && Math.abs(info.offset.x) < 5 && Math.abs(info.offset.y) < 5) {
      toggleTheme();
    } else if (!info) {
       // Fallback para clicks normales
       toggleTheme();
    }
  };

  return (
    <div
      className="drg-well fixed inset-0 z-[9999] pointer-events-none"
      ref={box}
      style={{ "--k": k }}
    >
      <Liquid
        className="drg-goo pointer-events-none"
        blur={4.5}
        contrast={16}
        fill="var(--fill-slab, #84cc16)" /* Biela Lime */
        filterPadding={80}
      >
        <Liquid.Item
          effect="move"
          move={{
            springiness: give / 100,
            stretch: stretch / 100,
            wobble: 0.35,
            trail: 0,
          }}
        >
          <motion.span
            className="drg-ball flex items-center justify-center pointer-events-auto shadow-[0_0_20px_rgba(132,204,22,0.4)]"
            style={{ width: size, height: size, x: window.innerWidth - size - 20, y: 20 }} // Inicia arriba a la derecha
            drag
            dragConstraints={box} // Se puede arrastrar por toda la pantalla
            dragElastic={0.14}
            dragMomentum={false}
            whileHover={{ scaleX: 1 + SWELL * g, scaleY: 1 + SWELL * g }}
            whileTap={{ scaleX: 1 - 0.16 * g, scaleY: 1 + 0.08 * g }}
            transition={{ type: "spring", stiffness: 500, damping: 18, mass: 0.6 }}
            onPointerDown={grab}
            onDragStart={grab}
            onDragEnd={drop}
            onClick={drop}
          >
            {/* Íconos de Tema */}
            <span className="text-black z-10">
              {isLightMode ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              )}
            </span>
          </motion.span>
        </Liquid.Item>
      </Liquid>
    </div>
  );
}