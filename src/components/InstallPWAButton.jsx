import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import './InstallPWAButton.css';

function esIOS() {
  if (typeof navigator === 'undefined') return false;
  const agent = navigator.userAgent.toLowerCase();
  const iPadOS = agent.includes('macintosh') && navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/.test(agent) || iPadOS;
}

function yaInstalada() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
  );
}

export default function InstallPWAButton({ variant = 'navbar' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    const capturarPrompt = (evento) => {
      evento.preventDefault();
      setDeferredPrompt(evento);
    };
    const confirmarInstalacion = () => {
      setDeferredPrompt(null);
      setInstalada(true);
      setGuideOpen(false);
    };

    window.addEventListener('beforeinstallprompt', capturarPrompt);
    window.addEventListener('appinstalled', confirmarInstalacion);

    return () => {
      window.removeEventListener('beforeinstallprompt', capturarPrompt);
      window.removeEventListener('appinstalled', confirmarInstalacion);
    };
  }, []);

  if (instalada || yaInstalada()) return null;

  const instalar = async () => {
    if (esIOS() || !deferredPrompt) {
      setGuideOpen((valor) => !valor);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setInstalada(true);
  };

  return (
    <div className={`pwa-install-wrap pwa-install-${variant}`}>
      <button
        type="button"
        onClick={instalar}
        aria-expanded={guideOpen}
        className="pwa-install-button inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 whitespace-nowrap"
      >
        <Download size={15} strokeWidth={2.2} />
        <span>Instalar App</span>
      </button>

      {guideOpen && (
        <div className="pwa-install-guide" role="dialog" aria-label="Instalar Biela">
          <button
            type="button"
            onClick={() => setGuideOpen(false)}
            aria-label="Cerrar guía de instalación"
            className="pwa-install-guide-close"
          >
            <X size={16} />
          </button>
          <span className="pwa-install-guide-icon"><Smartphone size={20} strokeWidth={1.8} /></span>
          <h3>Instalar Biela</h3>
          <p>
            En iPhone o iPad: <strong>Compartir ➔ Agregar a pantalla de inicio</strong>.
          </p>
          <p>
            En Android o escritorio: abre el menú del navegador y elige{' '}
            <strong>Instalar aplicación</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
