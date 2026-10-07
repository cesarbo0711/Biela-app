import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Solo aceptamos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { promptUsuario, contextoVehiculo, historial } = req.body;
    
    // Vercel leerá tu llave directamente de sus servidores seguros
    const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
    
    const vehiculoActual = contextoVehiculo || "Bera BWS 2013";
    const systemInstruction = `Eres "BujIA", el experto número 1 en motocicletas de Venezuela y el mundo. Tienes años de experiencia en talleres, conociendo desde una Bera hasta una Harley. Tu estilo es único: hablas como un venezolano de pura cepa, usas expresiones como "épale", "chamo", "pana", "la nave", "chévere", pero sin perder el profesionalismo. Eres directo, ameno, empático y muy inteligente.

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

    // Validamos el historial
    const historialSeguro = Array.isArray(historial) ? historial : [];
    const contents = historialSeguro.map(msg => ({
      role: msg.rol === 'user' ? 'user' : 'model',
      parts: [{ text: msg.texto }]
    }));

    contents.push({ role: 'user', parts: [{ text: promptUsuario }] });

    // Hacemos la llamada desde Vercel (USA)
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.status(200).json({ texto: response.text });
  } catch (error) {
    console.error("Error en el servidor de Vercel:", error);
    res.status(500).json({ error: "Hubo un fallo en los servidores del taller." });
  }
}