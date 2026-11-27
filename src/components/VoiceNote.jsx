import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import './VoiceNote.css';

/* ══ Voice note ═══════════════════════════════════════════
   Hold to record. The pill opens into a bar and the level
   rises in it as bars, newest on the right. Let go and the
   recording becomes a clip: press play and the bars light up
   as the playhead passes them, drag across them to scrub.
   Slide left while holding and it is thrown away — the bars
   collapse and the pill closes back to where it started.

   ── A CONCEPT, NOT A RECORDER ───────────────────────
   Nothing listens. The level is a stand-in shaped like speech —
   syllables inside phrases, with pauses — so the block is about
   the gesture and the shapes, and asks nobody for a microphone.

   ── THE PLAYHEAD IS A NUMBER, NOT A RENDER ──────────────
   Progress is one CSS variable on the wave, and each bar
   decides its own brightness from it and its index in calc().
   Playing costs no React renders at all. */

/* 56 tall and 17px type, the Slide to confirm pill's size, so the
   pills on the wall read as one family */
const H = 56;
const IDLE_W = 216;
const OPEN_W = 300;
/* one bar per sample while recording */
const SAMPLE = 70;
/* pointer travel, in px, that throws the recording away */
const CANCEL = 90;
/* shorter than this is a tap, not a recording */
const MIN_MS = 500;
const MAX_MS = 30000;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* speech, roughly: syllables inside phrases, and gaps between */
function standIn(t) {
  const syll = Math.abs(Math.sin(t * 6.1) * Math.sin(t * 1.9 + 0.7));
  const phrase = Math.sin(t * 0.9 + 0.4) > -0.55 ? 1 : 0.1;
  return Math.min(1, 0.06 + syll * phrase * (0.5 + Math.random() * 0.5));
}

/* n bars from however many samples, each the loudest it covers */
function resample(src, n) {
  if (!src.length) return Array(n).fill(0);
  return Array.from({ length: n }, (_, i) => {
    const a = Math.floor((i * src.length) / n);
    const b = Math.max(a + 1, Math.floor(((i + 1) * src.length) / n));
    let m = 0;
    for (let k = a; k < b && k < src.length; k++) m = Math.max(m, src[k]);
    return m;
  });
}

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ── play into pause, drawn ─────────────────────────────────
   The same two quadrilaterals, wound the same way: the pause's
   bars, and the play triangle split down its own axis. */
const PLAY = [[7, 4, 13, 7.6, 13, 16.4, 7, 20], [13, 7.6, 19, 12, 19, 12, 13, 16.4]];
const PAUSE = [[7, 5, 10.5, 5, 10.5, 19, 7, 19], [13.5, 5, 17, 5, 17, 19, 13.5, 19]];

function PlayMark({ on }) {
  const [t, setT] = useState(on ? 1 : 0);
  const now = useRef(on ? 1 : 0);
  useEffect(() => {
    const from = now.current;
    const to = on ? 1 : 0;
    const t0 = performance.now();
    let raf = 0;
    const step = (ts) => {
      const u = Math.min(1, (ts - t0) / 220);
      const valor = from + (to - from) * (1 - Math.pow(1 - u, 4));
      now.current = valor;
      setT(valor);
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  const d = PLAY.map((q, k) => {
    const p = q.map((v, i) => (v + (PAUSE[k][i] - v) * t).toFixed(2));
    return `M${p[0]} ${p[1]}L${p[2]} ${p[3]}L${p[4]} ${p[5]}L${p[6]} ${p[7]}Z`;
  }).join('');
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/* the capsule filled, the stand drawn: solid like the play
   mark it becomes a clip beside, rather than lucide's outline */
function MicMark() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <rect x="8.5" y="2" width="7" height="12.5" rx="3.5" fill="currentColor" stroke="none" />
      <path d="M5 11.5a7 7 0 0 0 14 0" />
      <path d="M12 18.5V22" />
    </svg>
  );
}

const promedio = (numeros) => numeros.length
  ? numeros.reduce((total, valor) => total + valor, 0) / numeros.length
  : 0;

export function VoiceNote({
  /* how many bars the wave is drawn with */
  bars = 28,
  /* how tall a given level draws, 0..100 */
  gain = 60,
  /* how far the pill overshoots as it opens and closes, 0..100 */
  bounce = 40,
  corner = H / 2,
  modoMotor = false,
  idioma = 'es-VE',
  onTranscriptReady,
} = {}) {
  const [phase, setPhase] = useState('idle');
  const [levels, setLevels] = useState([]);
  const [ms, setMs] = useState(0);
  const [clip, setClip] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [pull, setPull] = useState(0);
  const [transcript, setTranscript] = useState('');
  const pullRef = useRef(0);

  const ph = useRef('idle');
  const raw = useRef([]);
  const t0 = useRef(0);
  const timer = useRef(0);
  const later = useRef(0);
  const x0 = useRef(0);
  const wave = useRef(null);
  const time = useRef(null);
  const prog = useRef(0);
  const praf = useRef(0);
  const scrub = useRef(false);
  const clipRef = useRef(null);

  const streamRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const grabadoraRef = useRef(null);
  const chunksRef = useRef([]);
  const reconocimientoRef = useRef(null);
  const notaRef = useRef('');
  const urlRef = useRef(null);
  const motorRef = useRef({ dominantes: [], db: [], pulsos: [] });

  const go = (p) => {
    ph.current = p;
    setPhase(p);
  };

  const n = Math.round(clamp(bars, 12, 48));
  const g = 0.4 + (clamp(gain, 0, 100) / 100) * 1.2;
  const r = clamp(corner, 0, H / 2);
  /* the play disc sits 6 inside: concentric once there is a
     curve to follow, square with the pill when there is not */
  const inner = Math.max(0, r - 6 * Math.min(1, r / 12));

  const detenerAudio = () => {
    clearInterval(timer.current);
    try {
      if (grabadoraRef.current?.state === 'recording') grabadoraRef.current.stop();
    } catch {
      grabadoraRef.current = null;
    }
    streamRef.current?.getTracks().forEach((pista) => pista.stop());
    streamRef.current = null;
    ctxRef.current?.close?.().catch?.(() => {});
    ctxRef.current = null;
    analyserRef.current = null;
    try {
      reconocimientoRef.current?.stop();
    } catch {
      reconocimientoRef.current = null;
    }
  };

  useEffect(() => () => {
    clearInterval(timer.current);
    clearTimeout(later.current);
    cancelAnimationFrame(praf.current);
    detenerAudio();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const iniciarAudio = async () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!navigator.mediaDevices?.getUserMedia || !AudioCtx) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (ph.current !== 'rec') {
        stream.getTracks().forEach((pista) => pista.stop());
        return;
      }
      streamRef.current = stream;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();
      const fuente = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      fuente.connect(analyser);
      analyserRef.current = analyser;

      if (typeof MediaRecorder !== 'undefined') {
        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
          .find((tipo) => MediaRecorder.isTypeSupported?.(tipo));
        grabadoraRef.current = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        grabadoraRef.current.ondataavailable = (evento) => {
          if (evento.data?.size) chunksRef.current.push(evento.data);
        };
        grabadoraRef.current.start(250);
      }
    } catch {
      analyserRef.current = null;
    }
  };

  const iniciarTranscripcion = () => {
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento || modoMotor) return;
    try {
      const reconocimiento = new Reconocimiento();
      reconocimiento.lang = idioma;
      reconocimiento.continuous = true;
      reconocimiento.interimResults = true;
      reconocimiento.maxAlternatives = 1;
      reconocimiento.onresult = (evento) => {
        let texto = '';
        for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
          texto += evento.results[i][0]?.transcript || '';
        }
        notaRef.current = texto.trim();
        setTranscript(notaRef.current);
      };
      reconocimiento.onerror = () => {};
      reconocimiento.onend = () => {
        reconocimientoRef.current = null;
      };
      reconocimiento.start();
      reconocimientoRef.current = reconocimiento;
    } catch {
      reconocimientoRef.current = null;
    }
  };

  const medir = () => {
    const analyser = analyserRef.current;
    if (!analyser) return null;
    const forma = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(forma);
    let suma = 0;
    let cruces = 0;
    let anterior = 0;
    for (let i = 0; i < forma.length; i += 1) {
      const valor = (forma[i] - 128) / 128;
      suma += valor * valor;
      if (anterior <= 0 && valor > 0.08) cruces += 1;
      anterior = valor;
    }
    const rms = Math.sqrt(suma / forma.length);
    const frecuencias = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frecuencias);
    let maximo = 0;
    let indice = 0;
    for (let i = 0; i < frecuencias.length; i += 1) {
      if (frecuencias[i] > maximo) {
        maximo = frecuencias[i];
        indice = i;
      }
    }
    const sampleRate = ctxRef.current?.sampleRate || 44100;
    if (modoMotor) {
      motorRef.current.dominantes.push((indice * sampleRate) / analyser.fftSize);
      motorRef.current.db.push(maximo > 0 ? 20 * Math.log10(maximo / 255) : -120);
      motorRef.current.pulsos.push(cruces);
    }
    return clamp(rms * 3.4, 0, 1);
  };

  const construirAudioUrl = () => new Promise((resolve) => {
    const grabadora = grabadoraRef.current;
    if (!grabadora || !chunksRef.current.length || grabadora.state === 'inactive') {
      resolve(null);
      return;
    }
    grabadora.onstop = () => {
      const tipo = grabadora.mimeType || 'audio/webm';
      resolve(URL.createObjectURL(new Blob(chunksRef.current, { type: tipo })));
    };
    try {
      grabadora.stop();
    } catch {
      resolve(null);
    }
  });

  const entregar = async (duracion) => {
    const audioUrl = await construirAudioUrl();
    if (audioUrl) {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = audioUrl;
    }
    const duracionMs = Math.round(duracion);
    detenerAudio();
    onTranscriptReady?.({
      texto: notaRef.current.trim(),
      audioUrl,
      duracionMs,
      modoMotor,
      analisisMotor: modoMotor
        ? {
          frecuenciaDominanteHz: Math.round(promedio(motorRef.current.dominantes)),
          nivelDb: Number(promedio(motorRef.current.db).toFixed(1)),
          cadenciaRalentiHz: Number((promedio(motorRef.current.pulsos) * (1000 / SAMPLE)).toFixed(1)),
          muestras: motorRef.current.dominantes.length,
          duracionMs,
        }
        : null,
    });
  };

  const paintProg = useCallback(() => {
    wave.current?.style.setProperty('--prog', prog.current.toFixed(4));
    const c = clipRef.current;
    if (time.current && c) {
      const p = prog.current;
      time.current.textContent = fmt(p > 0 && p < 1 ? p * c.ms : c.ms);
    }
  }, []);

  useEffect(() => {
    clipRef.current = clip;
    paintProg();
  }, [clip, paintProg]);

  const stopPlay = () => {
    cancelAnimationFrame(praf.current);
    praf.current = 0;
    setPlaying(false);
  };

  const close = () => {
    go('cancel');
    detenerAudio();
    clearTimeout(later.current);
    later.current = window.setTimeout(() => {
      setClip(null);
      pullRef.current = 0;
      setPull(0);
      go('idle');
    }, 360);
  };

  const end = (cancel) => {
    if (ph.current !== 'rec') return;
    clearInterval(timer.current);
    const took = performance.now() - t0.current;
    const keep = !cancel && took >= MIN_MS;
    if (!keep) {
      close(cancel ? 'whisk' : 'tock');
      return;
    }
    prog.current = 0;
    setClip({ raw: raw.current.slice(), ms: took });
    pullRef.current = 0;
    setPull(0);
    go('clip');
    entregar(took);
  };

  const begin = () => {
    if (ph.current !== 'idle') return;
    raw.current = [];
    chunksRef.current = [];
    motorRef.current = { dominantes: [], db: [], pulsos: [] };
    notaRef.current = '';
    setTranscript('');
    setLevels([]);
    setMs(0);
    pullRef.current = 0;
    setPull(0);
    t0.current = performance.now();
    go('rec');
    iniciarTranscripcion();
    iniciarAudio();
    clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const took = performance.now() - t0.current;
      raw.current.push(medir() ?? standIn(took / 1000));
      setLevels(raw.current.slice(-64));
      setMs(took);
      if (took >= MAX_MS) end(false);
    }, SAMPLE);
  };

  const toggle = () => {
    const c = clipRef.current;
    if (!c) return;
    if (praf.current) {
      stopPlay();
      return;
    }
    if (prog.current >= 1) prog.current = 0;
    setPlaying(true);
    let prev = performance.now();
    const step = (ts) => {
      if (!scrub.current) prog.current = Math.min(1, prog.current + (ts - prev) / c.ms);
      prev = ts;
      paintProg();
      if (prog.current >= 1) {
        stopPlay();
        return;
      }
      praf.current = requestAnimationFrame(step);
    };
    praf.current = requestAnimationFrame(step);
  };

  const seek = (clientX) => {
    const el = wave.current;
    const c = clipRef.current;
    if (!el || !c) return;
    const b = el.getBoundingClientRect();
    prog.current = clamp((clientX - b.left) / b.width, 0, 1);
    paintProg();
  };

  const discard = () => {
    stopPlay();
    close('whisk');
  };

  /* ── the bars ─────────────────────────────────────────── */
  const bar = (v, i, key) => (
    <i
      key={key}
      className="vn-bar"
      style={{ '--l': clamp(v * g, 0, 1).toFixed(3), '--i': i }}
    />
  );

  /* recording: the last n samples, right-aligned, and the rest
     of the row the resting dot a bar starts from */
  const recBars = () => {
    const out = [];
    for (let j = 0; j < n; j++) {
      const k = levels.length - n + j;
      out.push(k >= 0 ? bar(levels[k], j, k) : bar(0, j, `e${j}`));
    }
    return out;
  };

  const shift = -pull * CANCEL * 0.5;
  const armed = pull >= 1;
  const open = phase !== 'idle';
  const showClip = clip && (phase === 'clip' || phase === 'cancel');

  return (
    <div className="vn-frame">
      <div
        className="vn"
        data-phase={phase}
        role={phase === 'idle' || phase === 'rec' ? 'button' : undefined}
        tabIndex={phase === 'idle' || phase === 'rec' ? 0 : -1}
        aria-label={phase === 'rec' ? 'Grabando. Suelta para guardar, Escape para descartar.' : phase === 'idle' ? 'Mantén para grabar una nota de voz' : undefined}
        style={{
          '--w': `${open ? OPEN_W : IDLE_W}px`,
          '--r': `${r}px`,
          '--inner': `${inner}px`,
          '--ov': (1 + (clamp(bounce, 0, 100) / 100) * 0.7).toFixed(3),
          '--pull': pull.toFixed(3),
        }}
        onPointerDown={(e) => {
          if (ph.current !== 'idle') return;
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* a scripted pointer */ }
          x0.current = e.clientX;
          begin();
        }}
        onPointerMove={(e) => {
          if (ph.current !== 'rec') return;
          const p = clamp((x0.current - e.clientX) / CANCEL, 0, 1);
          /* all the way arms it — a tick as it catches — and
             sliding back disarms; letting go is what decides */
          pullRef.current = p;
          setPull(p);
        }}
        onPointerUp={(e) => {
          try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* never captured */ }
          end(pullRef.current >= 1);
        }}
        onPointerCancel={() => end(false)}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && ph.current === 'idle') {
            e.preventDefault();
            begin();
          } else if (e.key === 'Escape' && ph.current === 'rec') {
            end(true);
          }
        }}
        onKeyUp={(e) => {
          /* only while recording: the play and discard buttons
             inside act on keyup, and this would swallow it */
          if ((e.key === ' ' || e.key === 'Enter') && ph.current === 'rec') {
            e.preventDefault();
            end(false);
          }
        }}
        onBlur={() => { if (ph.current === 'rec') end(false); }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {phase === 'idle' && (
          <span key="idle" className="vn-in vn-idle">
            <MicMark />
            Mantén para hablar
          </span>
        )}

        {(phase === 'rec' || (phase === 'cancel' && !clip)) && (
          <span key="rec" className="vn-in vn-rec" style={{ translate: `${shift}px 0` }}>
            <span className="vn-dot" />
            <span className="vn-time">{fmt(ms)}</span>
            <span className="vn-wave" style={{ '--n': n }}>{recBars()}</span>
          </span>
        )}

        {/* slid all the way: the cancel mark takes the dot's
            place. It sits on the pill rather than in the sliding
            row, which by now has gone half out of the left edge */}
        {(phase === 'rec' || (phase === 'cancel' && !clip)) && (
          <span className="vn-cancel" data-on={armed || undefined} aria-hidden="true">
            <X size={16} strokeWidth={2} />
          </span>
        )}

        {showClip && (
          <span key="clip" className="vn-in vn-clip">
            <button
              type="button"
              className="vn-play"
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              onClick={toggle}
            >
              <PlayMark on={playing} />
            </button>
            <span
              ref={wave}
              className="vn-wave vn-scrub"
              style={{ '--n': n, '--prog': 0 }}
              onPointerDown={(e) => {
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* a scripted pointer */ }
                scrub.current = true;
                seek(e.clientX);
              }}
              onPointerMove={(e) => { if (scrub.current) seek(e.clientX); }}
              onPointerUp={(e) => {
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* never captured */ }
                scrub.current = false;
              }}
              onPointerCancel={() => { scrub.current = false; }}
            >
              {resample(clip.raw, n).map((v, i) => bar(v, i, i))}
            </span>
            <span ref={time} className="vn-time">{fmt(clip.ms)}</span>
            <button type="button" className="vn-x" aria-label="Descartar" onClick={discard}>
              <X size={18} strokeWidth={2} />
            </button>
          </span>
        )}
      </div>
      <span
        className="vn-hint"
        data-on={phase === 'rec' || undefined}
        data-armed={(phase === 'rec' && armed) || undefined}
        style={{ '--pull': pull.toFixed(3) }}
        aria-hidden="true"
      >
        {phase === 'rec' && armed ? 'Suelta para cancelar' : '‹ Desliza para cancelar'}
      </span>
      {modoMotor && <span className="vn-motor-tag">Escuchando motor</span>}
      {transcript && <span className="vn-transcript" aria-live="polite">{transcript}</span>}
    </div>
  );
}

export default VoiceNote;
