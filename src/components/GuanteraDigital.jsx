import { useState } from 'react';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { DOCUMENTOS_GUANTERA, leerDocumentosGuantera, obtenerEstadoDocumento } from '../utils/guantera';

export default function GuanteraDigital({ usuario, enModal = false }) {
  const userId = usuario?.id || 'invitado';
  const [documentos, setDocumentos] = useState(() => leerDocumentosGuantera(userId));
  const [guardado, setGuardado] = useState(false);

  const guardar = () => {
    try {
      localStorage.setItem(`biela_guantera_${userId}`, JSON.stringify(documentos));
      setGuardado(true);
      window.setTimeout(() => setGuardado(false), 2200);
    } catch {
      setGuardado(false);
    }
  };

  return (
    <section className={enModal ? '' : 'mt-6 rounded-[2rem] border border-black/5 bg-[var(--bg-surface)] p-5 shadow-sm dark:border-white/10'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-lime-700 dark:text-lime-300">Disponible sin conexión</p>
          <h2 className="mt-1 text-base font-black">Guantera Digital</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
            Guarda tus vencimientos para mostrarlos en una alcabala.
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-lime-500/40 bg-lime-500/10 text-lime-700 dark:text-lime-300">
          <ShieldCheck size={19} strokeWidth={2} />
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {DOCUMENTOS_GUANTERA.map((documento) => {
          const estado = obtenerEstadoDocumento(documentos[documento.clave]);
          const Icono = estado.Icono;
          return (
            <div key={documento.clave} className="rounded-2xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black">{documento.etiqueta}</p>
                  <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-extrabold ${
                    estado.tono === 'ok'
                      ? 'border-lime-500/40 bg-lime-500/10 text-lime-700 dark:text-lime-300'
                      : estado.tono === 'warn'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : estado.tono === 'danger'
                          ? 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300'
                          : 'border-black/10 text-[var(--text-muted)] dark:border-white/10'
                  }`}>
                    <Icono size={12} strokeWidth={2.2} /> {estado.etiqueta}
                  </span>
                </div>
                <input
                  type="date"
                  value={documentos[documento.clave]}
                  onChange={(evento) => setDocumentos((prev) => ({ ...prev, [documento.clave]: evento.target.value }))}
                  aria-label={`Fecha de vencimiento de ${documento.etiqueta}`}
                  className="min-h-12 w-[148px] rounded-xl border border-black/10 bg-[var(--bg-base)] px-2 text-base text-[var(--text-main)] focus:border-lime-500 focus:outline-none dark:border-white/10"
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={guardar}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#FF9B71] bg-[#FF9B71] text-xs font-extrabold text-[#17181a] transition-colors hover:brightness-105 dark:border-[#84cc16] dark:bg-[#84cc16] dark:text-[#050505]"
      >
        {guardado ? <ShieldCheck size={15} strokeWidth={2.2} /> : <CalendarDays size={15} strokeWidth={2.2} />}
        {guardado ? 'Guardado en este teléfono' : 'Guardar guantera'}
      </button>
    </section>
  );
}
