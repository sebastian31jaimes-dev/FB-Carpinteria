export default async function handler(req, res) {
  // Asegurar cabeceras CORS y método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { imageUrl, prompt } = req.body;

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: 'Token de Replicate no configurado' });
    }

    // Usar el modelo SDXL optimizado para arquitectura e interiorismo
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          image: imageUrl,
          prompt: prompt || "modern custom wooden furniture, high quality, interior architecture, photorealistic",
          prompt_strength: 0.8
        }
      }),
    });

    const data = await response.json();

    if (response.status !== 201 && response.status !== 200) {
      return res.status(500).json({ error: data.detail || 'Error en Replicate' });
    }

    // Polling / Esperar resultado
    const predictionId = data.id;
    let predictionData = data;

    while (predictionData.status !== 'succeeded' && predictionData.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 2500));
      const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` }
      });
      predictionData = await checkRes.json();
    }

    if (predictionData.status === 'succeeded') {
      return res.status(200).json({ outputUrl: predictionData.output[0] });
    } else {
      return res.status(500).json({ error: 'La generación falló en el servidor.' });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
