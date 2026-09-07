export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { imageUrl, prompt } = req.body;

  try {
    // 1. Iniciar la predicción en Replicate
    const initialResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Modelo optimizado para diseño de interiores / inpainting
        version: "stability-ai/stable-diffusion-inpainting",
        input: {
          image: imageUrl,
          prompt: prompt || "modern custom wooden furniture, high quality, interior architecture, integrated LED lighting",
        }
      }),
    });

    const initialData = await initialResponse.json();
    const predictionId = initialData.id;

    // 2. Esperar y verificar el estado de la predicción hasta que esté 'succeeded'
    let predictionData;
    let status = 'starting';
    
    // Bucle para verificar el estado cada 2 segundos
    while (status === 'starting' || status === 'processing') {
      // Esperar 2 segundos antes de volver a preguntar
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      });
      predictionData = await statusResponse.json();
      status = predictionData.status;
    }

    if (status === 'succeeded') {
      // 3. Devolver la URL de la imagen generada
      return res.status(200).json({ outputUrl: predictionData.output[0] });
    } else {
      return res.status(500).json({ error: 'La generación de imagen falló', detail: predictionData });
    }

  } catch (error) {
    return res.status(500).json({ error: 'Error al conectar con la IA', detail: error.message });
  }
}
