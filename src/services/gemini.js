import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function consultarMecánicoIA(promptUsuario, imagenBase64 = null, contextoVehiculo = '') {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemInstruction = `
      Eres el mecánico experto número 1 de confianza, con un estilo coloquial pero sumamente técnico y preciso (estilo latinoamericano, cercano, directo al grano). 
      Tu objetivo es solucionar problemas reales de motocicletas de forma sencilla, económica y segura.
      Contexto del vehículo del usuario: ${contextoVehiculo}
      Si el usuario te envía una foto de una pieza dañada, bujía, carburador o fuga, analízala a fondo y dale un diagnóstico certero de qué está pasando y cómo repararlo paso a paso.
    `;

    const partesMensaje = [];
    
    if (imagenBase64) {
      partesMensaje.push({
        inlineData: {
          data: imagenBase64.split(',')[1],
          mimeType: 'image/jpeg'
        }
      });
    }

    partesMensaje.push(promptUsuario);

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemInstruction }] },
        { role: 'model', parts: [{ text: '¡Entendido! Saludos, soy tu mecánico de confianza listo para echarle mano a esa moto y resolver cualquier falla.' }] }
      ]
    });

    const resultado = await chat.sendMessage(partesMensaje);
    const respuesta = await resultado.response;
    return respuesta.text();

  } catch (error) {
    console.error('Error al consultar la IA:', error);
    return 'Epa, hubo un fallo de comunicación con el taller. Revisa tu conexión o tu clave de API e intenta de nuevo.';
  }
}