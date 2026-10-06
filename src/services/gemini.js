import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export async function consultarMecánicoIA(historialMensajes, promptUsuario, imagenBase64 = null, contextoVehiculo = '') {
  try {
    // 1. Convertir el historial al formato de pasos de la nueva API
    const historialPasos = historialMensajes.map(msg => {
      if (msg.rol === 'user') {
        return {
          type: 'user_input',
          content: [{ type: 'text', text: msg.texto }]
        };
      } else {
        return {
          type: 'model_output',
          content: [{ type: 'text', text: msg.texto }]
        };
      }
    });

    // 2. Construir el paso actual del usuario
    const contenidoActual = [];
    if (imagenBase64) {
      contenidoActual.push({
        type: 'image',
        mime_type: 'image/jpeg',
        data: imagenBase64.split(',')[1]
      });
    }
    contenidoActual.push({ type: 'text', text: promptUsuario });

    const pasoActual = {
      type: 'user_input',
      content: contenidoActual
    };

    // 3. Unir historial + paso actual
    const inputFinal = [...historialPasos, pasoActual];

    const interaction = await ai.interactions.create({
      model: 'gemini-3.8-flash',
      store: false, // Modo stateless: manejamos el historial en el cliente
      input: inputFinal,
     system_instruction: `Eres "BujIA", el experto número 1 en motocicletas de Venezuela y el mundo. Tienes años de experiencia en talleres, conociendo desde una Bera hasta una Harley. Tu estilo es único: hablas como un venezolano de pura cepa, usas expresiones como "épale", "chamo", "pana", "la nave", "chévere", pero sin perder el profesionalismo. Eres directo, ameno, empático y muy inteligente.

Tu objetivo es ayudar al usuario a diagnosticar y solucionar problemas con su moto de forma sencilla, económica y, sobre todo, SEGURA.

Tus reglas de oro:
1. Siempre prioriza la seguridad del usuario. Si algo es peligroso, adviértelo de inmediato.
2. Si no estás seguro de un diagnóstico, pide más detalles o fotos. No inventes.
3. Da explicaciones paso a paso, fáciles de entender para alguien que no es mecánico.
4. Usa el contexto del vehículo que te proporcionan para dar respuestas personalizadas.
5. Si algo requiere un taller profesional o herramientas especiales, dilo claramente sin rodeos.
6. Mantén un tono positivo, motivador y usa el humor venezolano cuando sea apropiado.
7. No uses formatos de markdown complejos (como tablas o bloques de código) a menos que sea estrictamente necesario. Responde de forma conversacional.

Contexto del vehículo del usuario: ${contextoVehiculo}`
    });

    return interaction.output_text;

  } catch (error) {
    console.error('Error detallado de la IA:', error);
    return `Epa, error del servidor: ${error.message || 'Revisa la consola'}`;
  }
}