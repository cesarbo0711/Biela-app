import { AlertCircle, CalendarDays, ShieldCheck } from 'lucide-react';

export const DOCUMENTOS_GUANTERA = [
  { clave: 'rcv', etiqueta: 'RCV / Póliza de Seguro' },
  { clave: 'licencia', etiqueta: 'Licencia de Conducir' },
  { clave: 'medico', etiqueta: 'Certificado Médico Vial' },
];

function crearVacio() {
  return { rcv: '', licencia: '', medico: '' };
}

export function leerDocumentosGuantera(userId) {
  try {
    const contenido = localStorage.getItem(`biela_guantera_${userId || 'invitado'}`);
    if (!contenido) return crearVacio();
    const datos = JSON.parse(contenido);
    return {
      rcv: String(datos?.rcv || ''),
      licencia: String(datos?.licencia || ''),
      medico: String(datos?.medico || ''),
    };
  } catch {
    return crearVacio();
  }
}

export function obtenerEstadoDocumento(fecha) {
  if (!fecha) {
    return { etiqueta: 'Sin registrar', tono: 'neutral', Icono: CalendarDays };
  }

  const vencimiento = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(vencimiento.getTime())) {
    return { etiqueta: 'Fecha inválida', tono: 'neutral', Icono: AlertCircle };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / 86400000);

  if (dias > 15) return { etiqueta: `Vigente (${dias} días)`, tono: 'ok', Icono: ShieldCheck };
  if (dias >= 1) return { etiqueta: `Vence en ${dias} días`, tono: 'warn', Icono: AlertCircle };
  return { etiqueta: 'Vencido', tono: 'danger', Icono: AlertCircle };
}

export function obtenerResumenGuantera(userId) {
  const documentos = leerDocumentosGuantera(userId);
  const estados = DOCUMENTOS_GUANTERA.map((documento) => obtenerEstadoDocumento(documentos[documento.clave]));

  if (estados.some((estado) => estado.tono === 'danger')) {
    return { etiqueta: 'Hay documentos vencidos', tono: 'danger' };
  }
  if (estados.some((estado) => estado.tono === 'warn')) {
    return { etiqueta: 'Próximo a vencer', tono: 'warn' };
  }
  if (estados.every((estado) => estado.tono === 'ok')) {
    return { etiqueta: 'Documentos al día', tono: 'ok' };
  }
  return { etiqueta: 'RCV · Licencia · Médico', tono: 'neutral' };
}
