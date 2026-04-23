export default async function handler(req, res) {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJcLSSs0GzApLHZpf-CYiw4Y_IPzK-zr5Ct7mBQXhZEoS0iLlcnBx-8wPsiq4j49qQ/exec';
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    let url = APPS_SCRIPT_URL;
    let options = { method: req.method };
    
    if (req.method === 'POST' || req.method === 'PUT') {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(req.body);
    }
    
    if (req.method === 'DELETE') {
      url = `${APPS_SCRIPT_URL}?id=${req.query.id}`;
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
