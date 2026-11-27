import { createClient } from '@supabase/supabase-js';

// Inicializamos Supabase buscando primero la LLAVE MAESTRA para saltar el RLS
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeTextoSimple(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function esOrdenDeRegistroExplicita(texto) {
  const t = normalizeTextoSimple(texto);
  const imperativo = /\b(anota|anotame|anotalo|anotala|registra|registrame|registralo|guarda|guardame|guardalo|apunta|apuntame)\b/.test(t);
  const pasadoConKm = /\bya (le )?(hice|cambie|monte|puse|instale|limpie|ajuste)\b/.test(t) && /\bkm|kilometros\b/.test(t);
  const duda = /\b(no se|duda|sera|quizas|parece|suena raro|deberia|debo|cuando|por que|como|ayuda|falla|fallando)\b/.test(t) || /\?/.test(t);
  return (imperativo && !duda) || (pasadoConKm && !duda);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { promptUsuario, contextoVehiculo, historial, imagenBase64, nombreUsuario, motoId, esEmergencia, analisisMotor } = req.body;
    const modoEmergencia = esEmergencia === true;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelo = process.env.OPENROUTER_MODEL || 'openrouter/free';
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    if (!apiKey) {
      return res.status(500).json({ error: 'Falta configurar OPENROUTER_API_KEY en Vercel' });
    }

    const nombreCliente = nombreUsuario || 'pana';
    const vehiculoActual = contextoVehiculo || 'Motocicleta general';
    const analisisAcustico = analisisMotor
      ? `\nEl piloto envió un análisis acústico del motor: frecuencia dominante ${Number(analisisMotor.frecuenciaDominanteHz || 0).toFixed(0)} Hz, nivel ${Number(analisisMotor.nivelDb || 0).toFixed(1)} dB, cadencia ${Number(analisisMotor.cadenciaRalentiHz || 0).toFixed(1)} Hz, duración ${(Number(analisisMotor.duracionMs || 0) / 1000).toFixed(1)} s. Úsalo como evidencia orientativa para evaluar válvulas, carburación, cadena o biela, sin inventar especificaciones exactas.`
      : '';

    const systemPrompt = `Eres "BujIA", el mecánico de confianza de Biela para motociclistas en Venezuela.
Hablas con ${nombreCliente}. Vehículo en contexto: ${vehiculoActual}.${analisisAcustico}
${modoEmergencia ? `ALERTA DE EMERGENCIA EN VÍA: El usuario está accidentado en la calle. Responde en formato ultra-corto, en 3 pasos numerados de revisión rápida (qué revisar primero con las manos o herramientas básicas en 2 minutos), advierte seguridad vial (orillarse, luces) y recomiéndale revisar la pestaña Tiendas/Auxilio Vial de Biela si necesita grúa o cauchera. NUNCA intentes registrar en bitácora durante una emergencia.` : ''}

PERSONALIDAD Y ESTILO:
- Habla como un pana mecánico venezolano natural, cercano y fluido. Sé claro y útil, sin sonar robótico.
- No repitas muletillas forzadas en cada frase; úsalas con naturalidad solo de vez en cuando.
- Responde directo y fácil de leer en celular: párrafos cortos, y viñetas cuando des pasos o revisiones.
- Si el usuario saluda, responde con cercanía y pregunta en qué le puedes echar una mano.

REGLA CRÍTICA DE INTENCIÓN (ANTI FALSO POSITIVO):
- POR DEFECTO, toda conversación, saludo, duda, síntoma, pregunta, diagnóstico o consejo debe ser "intencion": "chat".
- SOLO usa "intencion": "registrar_mantenimiento" cuando el usuario dé una ORDEN EXPLÍCITA en pasado o imperativo de registrar algo que YA HIZO en la moto.
  Ejemplos válidos de registro: "anota que cambié el aceite hoy a los 12.000 km", "registra en la bitácora que le monté pastillas nuevas", "guárdame que ya hice el servicio de cadena".
  Ejemplos que NUNCA son registro (deben ser chat): "¿cuándo cambio el aceite?", "me está fallando la cadena", "ya le hice el cambio de aceite pero no sé si quedó bien", "cambié el aceite y ahora suena raro" (esto es duda/diagnóstico).
- Ante la mínima duda, elige "chat". NUNCA registres por interpretar.

GUARDRAILS DE SEGURIDAD MECÁNICA (OBLIGATORIOS):
- Si el usuario describe una falla grave o de seguridad vial (frenos esponjosos o sin presión, fuga activa de gasolina cerca del escape, dirección trabada, humo azul/blanco denso, ruidos metálicos internos tipo biela/cigüeñal, rueda bloqueada, pérdida severa de frenos), advierte de inmediato que NO debe rodar la moto así y recomienda revisión presencial por un mecánico certificado/taller de confianza.
- Nunca inventes especificaciones técnicas exactas (torque, calibración de válvulas, holguras, viscosidad específica) si no conoces con certeza el modelo exacto. Da rangos generales típicos para motos de baja cilindrada solo como referencia y aclara que debe confirmar en el manual del fabricante o con su mecánico.
- Prohibido sugerir chapuzas peligrosas: puentear fusibles con alambre, usar líquidos no aptos en frenos, rodar sin aceite, sellar fugas de gasolina con trucos caseros, quitar frenos/luces de seguridad, etc.
- Si falta información clave para diagnosticar, pide datos concretos (modelo/año, km, cuándo empezó, ruido/síntoma) antes de concluir.

FORMATO DE RESPUESTA (OBLIGATORIO):
Responde ÚNICA Y EXCLUSIVAMENTE con un objeto JSON válido. Sin markdown, sin \`\`\`json, sin texto fuera de las llaves.

OPCIÓN A - REGISTRAR MANTENIMIENTO (solo orden explícita de registro ya realizado):
{
  "intencion": "registrar_mantenimiento",
  "servicio": "Descripción breve del servicio realizado",
  "km_actual": <número entero, 0 si no lo menciona>,
  "respuesta_usuario": "Confirmación breve y natural del registro."
}

OPCIÓN B - CHAT NORMAL (default):
{
  "intencion": "chat",
  "respuesta_usuario": "Tu respuesta útil, segura y natural."
}`;

    const messages = [{ role: 'system', content: systemPrompt }];

    const historialSeguro = Array.isArray(historial) ? historial.slice(-10) : [];
    for (const msg of historialSeguro) {
      if (!msg?.texto) continue;
      messages.push({
        role: msg.rol === 'user' ? 'user' : 'assistant',
        content: msg.texto,
      });
    }

    if (imagenBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: promptUsuario || 'Analiza esta imagen y dime qué ves.' },
          { type: 'image_url', image_url: { url: imagenBase64 } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: promptUsuario || '' });
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://biela-app.vercel.app',
        'X-Title': 'Biela App',
      },
      body: JSON.stringify({
        model: modelo,
        messages,
        max_tokens: modoEmergencia ? 512 : 1024,
        temperature: modoEmergencia ? 0.2 : 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error al consultar la IA');
    }

    let textoCrudo = data.choices?.[0]?.message?.content || '{}';
    let respuestaIA;

    textoCrudo = textoCrudo.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      respuestaIA = JSON.parse(textoCrudo);
    } catch {
      console.error('Error parseando JSON del LLM:', textoCrudo);
      respuestaIA = {
        intencion: 'chat',
        respuesta_usuario: 'Se me enredó una respuesta ahí. ¿Me lo repites en una frase para ayudarte bien?',
      };
    }

    if (!respuestaIA || typeof respuestaIA !== 'object') {
      respuestaIA = { intencion: 'chat', respuesta_usuario: 'No pude procesar eso bien. Intenta de nuevo.' };
    }
    if (modoEmergencia && respuestaIA.intencion === 'registrar_mantenimiento') {
      respuestaIA.intencion = 'chat';
    }
    if (respuestaIA.intencion !== 'registrar_mantenimiento' || !esOrdenDeRegistroExplicita(promptUsuario)) {
      if (respuestaIA.intencion === 'registrar_mantenimiento') {
        respuestaIA.respuesta_usuario = 'Te entiendo, pero no voy a anotar nada si no me lo pides de forma explícita. Si quieres que lo guarde, dime “anota que cambié…” o “registra en la bitácora…”.';
      }
      respuestaIA.intencion = 'chat';
    }
    if (typeof respuestaIA.respuesta_usuario !== 'string' || !respuestaIA.respuesta_usuario.trim()) {
      respuestaIA.respuesta_usuario = respuestaIA.intencion === 'registrar_mantenimiento'
        ? 'Listo, te lo registré en la bitácora.'
        : '¿Me das un poco más de detalle para ayudarte mejor?';
    }

    if (respuestaIA.intencion === 'registrar_mantenimiento' && motoId) {
      try {
        const kmActual = Number.isFinite(Number(respuestaIA.km_actual)) ? Math.max(0, parseInt(respuestaIA.km_actual, 10)) : 0;
        const servicio = typeof respuestaIA.servicio === 'string' && respuestaIA.servicio.trim()
          ? respuestaIA.servicio.trim().slice(0, 200)
          : 'Mantenimiento registrado desde BujIA';

        const { error: dbError } = await supabase.from('bitacora_servicios').insert({
          moto_id: motoId,
          servicio_id: 7,
          km_al_momento: kmActual,
          fecha_servicio: new Date().toISOString().split('T')[0],
          notas: servicio,
        });

        if (dbError) throw dbError;
      } catch (error) {
        console.error('Error guardando en Supabase:', error);
        respuestaIA.respuesta_usuario += '\n\n(Nota: no pude guardarlo en la bitácora por un error técnico. Puedes intentarlo de nuevo o registrarlo manualmente.)';
      }
    } else if (respuestaIA.intencion === 'registrar_mantenimiento' && !motoId) {
      respuestaIA.respuesta_usuario += '\n\n(Para anotarlo en la bitácora, primero registra una moto en tu garaje.)';
    }

    return res.status(200).json({ texto: respuestaIA.respuesta_usuario });
  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.status(500).json({ error: 'Hubo un fallo en el taller. Intenta de nuevo en un momento.' });
  }
}
