import { useCallback, useEffect, useRef, useState } from 'react';

const WAKE_PATTERN = /(?:^|\s)(?:oye\s+)?biela(?:\s|,|$)/i;

function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function hablarComoBiela(texto) {
  if (!texto || typeof window === 'undefined') return;
  const sintesis = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance;
  if (!sintesis || !Utterance) return;

  sintesis.cancel();
  const enunciado = new Utterance(String(texto));
  enunciado.lang = 'es-VE';
  enunciado.rate = 1.05;
  enunciado.pitch = 1;

  const voces = sintesis.getVoices?.() || [];
  const voz = voces.find((item) => item.lang?.toLowerCase() === 'es-ve')
    || voces.find((item) => item.lang?.toLowerCase().startsWith('es'));
  if (voz) enunciado.voice = voz;

  sintesis.speak(enunciado);
}

export default function useCopilotoVoz({ activo = false, onComando, onError } = {}) {
  const [escuchando, setEscuchando] = useState(false);
  const [ultimoComando, setUltimoComando] = useState('');
  const [error, setError] = useState('');

  const Recognition = typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;
  const soportado = Boolean(Recognition) && typeof window !== 'undefined' && Boolean(window.speechSynthesis);

  const activoRef = useRef(activo);
  const onComandoRef = useRef(onComando);
  const onErrorRef = useRef(onError);
  const falloRef = useRef('');

  useEffect(() => {
    activoRef.current = activo;
  }, [activo]);

  useEffect(() => {
    onComandoRef.current = onComando;
  }, [onComando]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const hablar = useCallback((texto) => {
    hablarComoBiela(texto);
  }, []);

  useEffect(() => {
    if (!activo) return undefined;

    if (!Recognition) {
      const aviso = window.setTimeout(() => {
        setError('no-soportado');
        onErrorRef.current?.('no-soportado');
      }, 0);
      return () => window.clearTimeout(aviso);
    }

    let cancelado = false;
    let temporizador = 0;
    let reconocimiento;
    falloRef.current = '';

    const iniciar = () => {
      if (cancelado || !activoRef.current || falloRef.current) return;
      try {
        reconocimiento.start();
      } catch {
        if (!cancelado) {
          temporizador = window.setTimeout(iniciar, 500);
        }
      }
    };

    reconocimiento = new Recognition();
    reconocimiento.lang = 'es-VE';
    reconocimiento.continuous = true;
    reconocimiento.interimResults = false;
    reconocimiento.maxAlternatives = 1;

    reconocimiento.onstart = () => {
      setError('');
      setEscuchando(true);
    };

    reconocimiento.onresult = (evento) => {
      for (let indice = evento.resultIndex; indice < evento.results.length; indice += 1) {
        const resultado = evento.results[indice];
        if (!resultado.isFinal) continue;
        const frase = resultado[0]?.transcript?.trim();
        if (!frase) continue;

        setUltimoComando(frase);
        const texto = normalizar(frase);
        if (!WAKE_PATTERN.test(texto)) continue;
        const comando = texto.replace(WAKE_PATTERN, '').replace(/^[,:\s]+/, '').trim();
        onComandoRef.current?.(comando);
      }
    };

    reconocimiento.onerror = (evento) => {
      const codigo = evento?.error || 'error';
      if (codigo === 'not-allowed' || codigo === 'service-not-allowed') {
        falloRef.current = codigo;
        setError(codigo);
        onErrorRef.current?.(codigo);
        return;
      }
      if (codigo === 'no-speech' || codigo === 'aborted') return;
      setError(codigo);
    };

    reconocimiento.onend = () => {
      setEscuchando(false);
      if (cancelado || !activoRef.current || falloRef.current) return;
      temporizador = window.setTimeout(iniciar, 350);
    };

    iniciar();

    return () => {
      cancelado = true;
      window.clearTimeout(temporizador);
      reconocimiento.onstart = null;
      reconocimiento.onresult = null;
      reconocimiento.onerror = null;
      reconocimiento.onend = null;
      try {
        reconocimiento.abort();
      } catch {
        reconocimiento = null;
      }
      setEscuchando(false);
    };
  }, [activo, Recognition]);

  return { hablar, escuchando, ultimoComando, error, soportado };
}
