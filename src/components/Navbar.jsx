import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, MessageSquareText, User, Wrench } from "lucide-react";
import "./Navbar.css";

/* ── ICONOS Y RUTAS DE BIELA ────────────────────────────── */
const DOCK = [
  { key: "/", label: "Garaje", Icon: Wrench },
  { key: "/mapa", label: "Estaciones", Icon: MapPin },
  { key: "/chat", label: "Boberto", Icon: MessageSquareText },
  { key: "/perfil", label: "Perfil", Icon: User },
];

/* ══ dock, distance based magnification ═══════════════════
   Scale falls off with distance from the cursor rather than
   applying only to the hovered item, which is what stops it
   reading as a row of buttons that happen to grow. */

export default function Navbar({
  magnify = 1.32,
  spread = 2,
  lift = 8,
  labels = true,
}) {
  const [hover, setHover] = useState(null);
  
  // Integración con React Router
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname; // El activo ahora es la ruta actual

  const bar = useRef(null);
  const down = useRef(false);
  const chose = useRef(false);

  const at = (clientX) => {
    const items = bar.current?.querySelectorAll(".gdock-item");
    if (!items?.length) return null;
    let best = 0;
    let gap = Infinity;
    items.forEach((el, i) => {
      const b = el.getBoundingClientRect();
      const d = Math.abs(clientX - (b.left + b.width / 2));
      if (d < gap) { gap = d; best = i; }
    });
    return best;
  };

  const to = (i) => {
    setHover(i);
  };

  const track = (e) => {
    if (e.pointerType !== "mouse" && !down.current) return;
    to(at(e.clientX));
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-[9999] px-4 pointer-events-none">
      <nav
        className="gdock pointer-events-auto"
        aria-label="Navegación principal"
        ref={bar}
        onPointerDownCapture={(e) => {
          down.current = true;
          chose.current = false;
          to(at(e.clientX));
        }}
        onPointerMoveCapture={track}
        onPointerUpCapture={(e) => {
          if (down.current && e.pointerType !== "mouse") {
            const i = at(e.clientX);
            if (i !== null) {
              chose.current = true;
              if (DOCK[i].key !== active) {
                navigate(DOCK[i].key);
              }
            }
          }
          down.current = false;
          if (e.pointerType !== "mouse") to(null);
        }}
        onPointerCancelCapture={() => { down.current = false; to(null); }}
        onPointerLeave={() => { if (!down.current) to(null); }}
      >
        {DOCK.map(({ key, label, Icon }, i) => {
          const d = hover === null ? 99 : Math.abs(i - hover);
          const f = d > spread ? 0 : (1 + Math.cos((Math.PI * d) / (spread + 1))) / 2;
          const scale = 1 + (magnify - 1) * f;
          
          return (
            <button
              key={key}
              className="gdock-item"
              aria-label={label}
              aria-current={active === key ? "page" : undefined}
              data-near={d <= 1 ? d : undefined}
              data-active={active === key}
              onClick={() => {
                if (chose.current) return;
                navigate(key);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span
                className="gdock-glyph"
                style={{ transform: `translateY(${-lift * f}px) scale(${scale})` }}
              >
                <Icon size={20} strokeWidth={2.5} />
              </span>
              <span className="gdock-dot" data-on={active === key} />
            </button>
          );
        })}
        {labels && <DockTip bar={bar} at={hover} />}
      </nav>
    </div>
  );
}

/* ── ONE TIP THAT TRAVELS ───────────────────────────────── */
function DockTip({ bar, at }) {
  const [last, setLast] = useState(0);
  const [place, setPlace] = useState(null);
  const word = useRef(null);
  const [ready, setReady] = useState(false);
  
  if (at !== null && at !== last) setLast(at);

  useLayoutEffect(() => {
    const nav = bar.current;
    const item = nav?.querySelectorAll(".gdock-item")[last];
    const text = word.current;
    if (!nav || !item || !text) return;
    const w = Math.ceil(text.scrollWidth) + 24;
    setPlace({ x: item.offsetLeft + item.offsetWidth / 2 - w / 2, w });
  }, [last, bar]);

  useLayoutEffect(() => {
    if (!place || ready) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [place, ready]);

  return (
    <span
      className="gdock-tip"
      aria-hidden="true"
      data-on={at !== null && !!place}
      data-ready={ready || undefined}
      style={place ? { width: place.w, transform: `translateX(${place.x}px)` } : undefined}
    >
      <span ref={word} className="font-extrabold tracking-wide uppercase text-[10px]">{DOCK[last].label}</span>
    </span>
  );
}