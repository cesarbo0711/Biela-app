import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Check, Upload as UpIcon } from "lucide-react";
import "./UploadDropzone.css";

const MAX = 5; // 5MB

const SNARK = [
  "Sigue siendo muy pesada.",
  "Comprímela un poco, pana.",
  "Esa foto pesa demasiado.",
  "La caja está llena de excusas ahora.",
  "No.",
];

const fmt = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);

// Icono del archivo cuando ya se subió
function Page({ f, size = 40 }) {
  return (
    <svg className="upl-page" width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        className="upl-page-line"
        d="M7.75 4A3.25 3.25 0 0 1 11 .75h16c.121 0 .238.048.323.134l10.793 10.793a.46.46 0 0 1 .134.323v24A3.25 3.25 0 0 1 35 39.25H11A3.25 3.25 0 0 1 7.75 36z"
      />
      <path className="upl-page-line" d="M27 .5V8a4 4 0 0 0 4 4h7.5" />
      <rect width="29" height="16" x="1" y="18" rx="8" fill="#84cc16" />
      <text x="15.5" y="29.1" textAnchor="middle" fontSize="9" className="upl-page-ext">
        {f.name.split('.').pop().substring(0, 3).toUpperCase()}
      </text>
    </svg>
  );
}

export function UploadDropzone({ onFileSelect, speed = 50 }) {
  const [phase, setPhase] = useState({ kind: "idle" }); 
  const [over, setOver] = useState(false);
  const [refuse, setRefuse] = useState(null);
  const tries = useRef(0);
  const shake = useAnimationControls();
  const inputRef = useRef(null);

  // --- MANEJO DE ARCHIVOS REALES ---
  const handleFile = (file) => {
    if (!file) return;
    
    // Solo imágenes
    if (!file.type.startsWith('image/')) {
      shake.start({ x: [0, -7, 6, -4, 2, 0], transition: { duration: 0.42 } });
      setRefuse("Solo imágenes (PNG, JPG)");
      setTimeout(() => setRefuse(null), 2000);
      return;
    }

    // Límite de peso
    if (file.size > MAX * 1e6) {
      const n = tries.current++;
      setRefuse(n === 0 ? `Muy grande — máximo ${MAX} MB` : SNARK[Math.min(n - 1, SNARK.length - 1)]);
      shake.start({ x: [0, -7, 6, -4, 2, 0], transition: { duration: 0.42 } });
      setTimeout(() => setRefuse(null), 2000);
      return;
    }

    // Archivo aceptado: Iniciamos animación falsa de subida para el UX
    tries.current = 0;
    simulateUpload(file);
  };

  const simulateUpload = (file) => {
    setPhase({ kind: "up", f: file, p: 0 });
    
    // Simular progreso visual
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.1;
      if (progress >= 1) {
        clearInterval(interval);
        setPhase({ kind: "done", f: file });
        // Le pasamos el archivo real a tu formulario
        if (onFileSelect) onFileSelect(file);
      } else {
        setPhase({ kind: "up", f: file, p: progress });
      }
    }, 150); // Ajusta la velocidad aquí
  };

  // --- EVENTOS DRAG & DROP HTML5 ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // --- EVENTO CLIC (Abrir explorador) ---
  const handleClick = () => {
    if (phase.kind === "idle") {
      inputRef.current?.click();
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const up = phase.kind !== "idle";
  const f = phase.kind !== "idle" ? phase.f : null;

  return (
    <div className="upl w-full cursor-pointer" onClick={handleClick}>
      <input 
        type="file" 
        ref={inputRef} 
        onChange={handleInputChange} 
        accept="image/png, image/jpeg, image/webp" 
        className="hidden" 
      />
      
      <motion.div animate={shake} className="upl-zone-wrap">
        <div
          className="upl-zone border-2 hover:border-[#84cc16] transition-colors duration-300"
          data-over={over || undefined}
          data-refuse={refuse ? true : undefined}
          data-busy={up || undefined}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!f ? (
            <>
              <span className="upl-icon"><UpIcon size={18} strokeWidth={2} /></span>
              <span className="upl-say">
                <b className={refuse ? "text-red-500" : "text-white"}>
                  {refuse ?? (over ? "Suelta la foto aquí" : "Toca o arrastra la foto")}
                </b>
                <span className="text-neutral-500">JPG o PNG hasta {MAX} MB</span>
              </span>
            </>
          ) : (
            <span className="upl-now" key={f.name}>
              <Page f={f} size={36} />
              <span className="upl-text">
                <span className="upl-name">{f.name}</span>
                <span className="upl-meta">
                  {fmt(f.size)} · {phase.kind === "done" ? "¡Lista!" : "Subiendo..."}
                </span>
                <span className="upl-track">
                  <span className="upl-bar" style={{ transform: `scaleX(${phase.kind === "up" ? phase.p : 1})` }} />
                </span>
              </span>
              <span className="upl-end">
                {phase.kind === "done" && <span className="upl-tick"><Check size={14} strokeWidth={2} /></span>}
              </span>
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}