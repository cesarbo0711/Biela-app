export default async function handler(req, res) {
  // Solo aceptamos POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { promptUsuario, contextoVehiculo, historial, imagenBase64 } = req.body;

    // Leemos las variables de entorno de Vercel
    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelo = process.env.OPENROUTER_MODEL || 'openrouter/free';
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    if (!apiKey) {
      return res.status(500).json({ error: 'Falta configurar OPENROUTER_API_KEY en Vercel' });
    }

    // Prompt de BujIA
    const vehiculoActual = contextoVehiculo || 'Motocicleta general';
    const systemPrompt = `Eres "BujIA", el experto número 1 en motocicletas de Venezuela y el mundo. Tienes años de experiencia en talleres, conociendo desde una Bera hasta una Harley. Tu estilo es único: hablas como un venezolano de pura cepa, usas expresiones como "épale", "chamo", "pana", "la nave", "chévere", pero sin perder el profesionalismo. Eres directo, ameno, empático y muy inteligente.

Tu objetivo es ayudar al usuario a diagnosticar y solucionar problemas con su moto de forma sencilla, económica y, sobre todo, SEGURA.

Tus reglas de oro:
1. Siempre prioriza la seguridad del usuario. Si algo es peligroso, adviértelo de inmediato.
2. Si no estás seguro de un diagnóstico, pide más detalles o fotos. No inventes.
3. Da explicaciones paso a paso, fáciles de entender para alguien que no es mecánico.
4. Usa el contexto del vehículo que te proporcionan para dar respuestas personalizadas.
5. Si algo requiere un taller profesional o herramientas especiales, dilo claramente sin rodeos.
6. Mantén un tono positivo, motivador y usa el humor venezolano cuando sea apropiado.
7. No uses formatos de markdown complejos (como tablas o bloques de código) a menos que sea estrictamente necesario. Responde de forma conversacional.

Contexto del vehículo del usuario: ${vehiculoActual}`;

    // Construimos los mensajes en formato compatible con OpenAI (que es lo que usa OpenRouter)
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Agregamos el historial (últimos 10 mensajes para no pasarnos de tokens)
    const historialSeguro = Array.isArray(historial) ? historial.slice(-10) : [];
    for (const msg of historialSeguro) {
      // Saltamos el mensaje inicial de bienvenida si no tiene texto útil
      if (!msg.texto) continue;
      messages.push({
        role: msg.rol === 'user' ? 'user' : 'assistant',
        content: msg.texto
      });
    }

    // Construimos el mensaje actual del usuario (con o sin imagen)
    if (imagenBase64) {
      // Cuando hay imagen, el content va como arreglo de bloques
      // imagenBase64 viene como "data:image/jpeg;base64,XXXXX"
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: promptUsuario },
          { 
            type: 'image_url', 
            image_url: { url: imagenBase64 } 
          }
        ]
      });
    } else {
      messages.push({ role: 'user', content: promptUsuario });
    }

    // Llamada a OpenRouter
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Estos headers son opcionales pero OpenRouter los recomienda para identificar tu app
        'HTTP-Referer': 'https://tu-app.vercel.app',
        'X-Title': 'BujIA - Mecanico Virtual'
      },
      body: JSON.stringify({
        model: modelo,
        messages: messages,
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de OpenRouter:', data);
      return res.status(500).json({ 
        error: data.error?.message || 'Error al consultar la IA' 
      });
    }

    const texto = data.choices?.[0]?.message?.content || 'Epa, la nave quedó muda.';

    return res.status(200).json({ texto });

  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.status(500).json({ error: 'Hubo un fallo en los servidores del taller.' });
  }
}