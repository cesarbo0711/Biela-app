import { createClient } from '@supabase/supabase-js';

// Inicializamos Supabase buscando primero la LLAVE MAESTRA para saltar el RLS
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
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

    
    // NUEVO PROMPT DE AGENTE CON REGLAS ESTRICTAS PARA DISTINGUIR INTENCIONES
    const systemPrompt = `Eres "BujIA", el experto número 1 en motocicletas de Venezuela, especializado en el tema mecánica, soluciones técnicas, eficaces y siempre con prudencia de dar un mal consejo.
El cliente con el que hablas se llama ${nombreCliente}. Vehículo: ${vehiculoActual}.

REGLA ESTRICTA DE RESPUESTA (FUNCTION CALLING):
Eres un agente de software. DEBES responder ÚNICA Y EXCLUSIVAMENTE con un objeto JSON válido. NO incluyas markdown (como \`\`\`json), NO pongas texto fuera de las llaves {}. 

Escucha la petición del usuario y decide tu acción basándote en su INTENCIÓN REAL:

OPCIÓN A - REGISTRAR MANTENIMIENTO (SÓLO ÓRDENES O ACCIONES YA HECHAS):
SÓLO usa esta opción si el usuario afirma que YA HIZO el trabajo o te DA LA ORDEN DIRECTA de anotarlo (ej: "anota que le cambié el aceite", "ya le monté las pastillas nuevas"). Si el usuario te hace una PREGUNTA, NO uses esta opción.
{
  "intencion": "registrar_mantenimiento",
  "servicio": "Breve descripción del servicio",
  "km_actual": <número entero con el kilometraje, pon 0 si no lo menciona>,
  "respuesta_usuario": "Tu confirmación coloquial de que lo anotaste en la bitácora."
}

OPCIÓN B - CHAT NORMAL (DUDAS, CONSEJOS, PREGUNTAS):
Usa esta opción si el usuario HACE UNA PREGUNTA, pide una recomendación, o está planeando un mantenimiento a futuro (ej: "¿cuándo me recomiendas hacer su primer cambio de aceite?", "¿qué caucho le compro?").
{
  "intencion": "chat",
  "respuesta_usuario": "Tu respuesta amena, experta y coloquial venezolana resolviendo su duda, SIN registrar nada."
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
        temperature: 0.4, 
        response_format: { type: "json_object" }
      })
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
      // Evitamos el "undefined" si la IA olvida responder
      if (!respuestaIA.respuesta_usuario) {
        respuestaIA.respuesta_usuario = "¡Listo, pana! Anotado en la bitácora.";
      }
    } catch (e) {
      console.error("Error parseando JSON del LLM:", textoCrudo);
      respuestaIA = { intencion: 'chat', respuesta_usuario: 'Epa pana, tuve un cortocircuito en los cables, dímelo otra vez.' };
    }

    // INTERCEPTAMOS LA INTENCIÓN Y GUARDAMOS EL MANTENIMIENTO EN SUPABASE CON LAS COLUMNAS CORRECTAS
   // INTERCEPTAMOS LA INTENCIÓN Y GUARDAMOS EL MANTENIMIENTO EN SUPABASE
    if (respuestaIA.intencion === 'registrar_mantenimiento' && motoId) {
      try {
        const { data, error: dbError } = await supabase
          .from('bitacora_servicios')
          .insert({
            moto_id: motoId,
            servicio_id: 7, // Asignamos "Mantenimiento General" (ID de tu catálogo)
            km_al_momento: respuestaIA.km_actual || 0, // Ajustado a km_al_momento
            fecha_servicio: new Date().toISOString().split('T')[0], // Ajustado a fecha_servicio (Solo fecha YYYY-MM-DD)
            notas: respuestaIA.servicio // Guardamos el texto del servicio en "notas"
          });

        if (dbError) {
            console.error("❌ ERROR EN SUPABASE:", dbError);
            throw dbError; 
        }
        
        console.log(`✅ Mantenimiento registrado: ${respuestaIA.servicio} a los ${respuestaIA.km_actual}km`);
      } catch (error) {
        console.error("Error guardando en Supabase:", error);
        // Le avisamos al usuario que BujIA respondió pero hubo un fallo técnico
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