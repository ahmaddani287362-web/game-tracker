// api/proxy.js
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxJPjxi3ek4YrJZ0WKSQAkfK47JkWIuqeupx2fgpso1oTbKdFC9gZlCdi6OLPNssv3f/exec';
  
  try {
    let url = APPS_SCRIPT_URL;
    let options = { method: req.method };
    
    // Untuk DELETE, tambahkan parameter id
    if (req.method === 'DELETE') {
      const { id } = req.query;
      url = `${APPS_SCRIPT_URL}?id=${id}`;
    }
    
    // Untuk POST atau PUT, kirim body
    if (req.method === 'POST' || req.method === 'PUT') {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(req.body);
    }
    
    // Untuk GET, langsung fetch
    const response = await fetch(url, options);
    const data = await response.json();
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
