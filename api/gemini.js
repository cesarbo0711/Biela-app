import { createClient } from '@supabase/supabase-js';

// Inicializamos Supabase en el Backend
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { promptUsuario, contextoVehiculo, historial, imagenBase64, nombreUsuario, motoId } = req.body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelo = process.env.OPENROUTER_MODEL || 'openrouter/free';
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    if (!apiKey) {
      return res.status(500).json({ error: 'Falta configurar OPENROUTER_API_KEY en Vercel' });
    }

    const nombreCliente = nombreUsuario || 'pana';
    const vehiculoActual = contextoVehiculo || 'Motocicleta general';

    // NUEVO PROMPT DE AGENTE AUTÓNOMO CON FORMATO JSON OBLIGATORIO
    const systemPrompt = `Eres "BujIA", el experto número 1 en motocicletas de Venezuela.
El cliente con el que hablas se llama ${nombreCliente}. Vehículo: ${vehiculoActual}.

REGLA ESTRICTA DE RESPUESTA (FUNCTION CALLING):
Eres un agente de software. DEBES responder ÚNICA Y EXCLUSIVAMENTE con un objeto JSON válido. NO incluyas markdown (como \`\`\`json), NO pongas texto fuera de las llaves {}. 

Escucha la petición del usuario y decide tu acción:

OPCIÓN A - REGISTRAR MANTENIMIENTO:
Si el usuario te dice que le hizo un servicio, cambio de pieza o mantenimiento a su moto (ej: "anota que le cambié el aceite a los 300km" o "ya monté las pastillas nuevas con 1500km"), tu JSON debe ser:
{
  "intencion": "registrar_mantenimiento",
  "servicio": "Breve descripción del servicio (ej. Cambio de aceite 20W50)",
  "km_actual": <número entero con el kilometraje, pon 0 si no lo menciona>,
  "respuesta_usuario": "Tu respuesta coloquial venezolana confirmando el registro."
}

OPCIÓN B - CHAT NORMAL:
Si es cualquier otra consulta mecánica, duda o saludo, tu JSON debe ser:
{
  "intencion": "chat",
  "respuesta_usuario": "Tu respuesta amena, experta y coloquial venezolana."
}

Tus reglas de personalidad: Habla como venezolano (épale, chamo, pana, la nave). Sé profesional, seguro y advierte peligros mecánicos.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    const historialSeguro = Array.isArray(historial) ? historial.slice(-10) : [];
    for (const msg of historialSeguro) {
      if (!msg.texto) continue;
      messages.push({
        role: msg.rol === 'user' ? 'user' : 'assistant',
        content: msg.texto
      });
    }

    if (imagenBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: promptUsuario },
          { type: 'image_url', image_url: { url: imagenBase64 } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: promptUsuario });
    }

    // Llamada a OpenRouter forzando un formato de respuesta tipo JSON
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://biela-app.vercel.app',
        'X-Title': 'Biela App'
      },
      body: JSON.stringify({
        model: modelo,
        messages: messages,
        max_tokens: 1024,
        temperature: 0.4, // Temperatura baja para respuestas JSON estructuradas y consistentes
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error al consultar la IA');
    }

    let textoCrudo = data.choices?.[0]?.message?.content || '{}';
    let respuestaIA;
    
    // Limpiamos el texto por si el LLM incluye etiquetas de código rebeldes
    textoCrudo = textoCrudo.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      respuestaIA = JSON.parse(textoCrudo);
    } catch (e) {
      console.error("Error parseando JSON del LLM:", textoCrudo);
      respuestaIA = { intencion: 'chat', respuesta_usuario: 'Epa pana, tuve un cortocircuito en los cables, dímelo otra vez.' };
    }

    // INTERCEPTAMOS LA INTENCIÓN Y GUARDAMOS EL MANTENIMIENTO EN SUPABASE
    if (respuestaIA.intencion === 'registrar_mantenimiento' && motoId) {
      try {
        const { error: dbError } = await supabase
          .from('bitacora_servicios')
          .insert({
            moto_id: motoId,
            servicio: respuestaIA.servicio,
            kilometraje: respuestaIA.km_actual,
            fecha: new Date().toISOString()
          });

        if (dbError) throw dbError;
        
        console.log(`Mantenimiento registrado: ${respuestaIA.servicio} a los ${respuestaIA.km_actual}km`);
      } catch (error) {
        console.error("Error guardando en Supabase:", error);
        respuestaIA.respuesta_usuario += "\n\n*(Nota técnica: Hubo un pelón guardando en la bitácora, intenta registrarlo manual).*";
      }
    } else if (respuestaIA.intencion === 'registrar_mantenimiento' && !motoId) {
       respuestaIA.respuesta_usuario += "\n\n*(Epa, no tienes ninguna moto registrada en tu garaje todavía, guárdala primero para poder anotarte esto).*";
    }

    // Retornamos únicamente el texto de respuesta limpia al Frontend
    return res.status(200).json({ texto: respuestaIA.respuesta_usuario });

  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.status(500).json({ error: 'Hubo un fallo en los servidores del taller.' });
  }
}