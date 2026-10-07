export async function consultarMecanicoIA(promptUsuario, imagenBase64 = null, contextoVehiculo = '', historial = []) {
  try {
    // Llamamos a nuestro propio servidor en Vercel
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        promptUsuario, 
        contextoVehiculo, 
        historial 
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error);
    }

    return data.texto || "Epa, la nave quedó muda.";

  } catch (error) {
    console.error("Error comunicándose con Vercel:", error);
    return "Epa, hubo un fallo de conexión con el taller.";
  }
}