// /api/ors-route.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ORS_API_KEY = process.env.VITE_ORS_API_KEY;

  try {
    const orsResponse = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!orsResponse.ok) {
      const errorText = await orsResponse.text();
      return res.status(orsResponse.status).send(errorText);
    }

    const data = await orsResponse.json();
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
