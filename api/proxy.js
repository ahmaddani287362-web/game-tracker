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
    let options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    // Untuk DELETE, tambahkan parameter id ke URL
    if (req.method === 'DELETE') {
      const { id } = req.query;
      url = `${APPS_SCRIPT_URL}?id=${id}`;
      options.body = undefined;
    }
    
    // Untuk POST atau PUT, kirim body
    if (req.method === 'POST') {
      options.body = JSON.stringify(req.body);
    }
    
    if (req.method === 'PUT') {
      options.body = JSON.stringify(req.body);
    }
    
    // Untuk GET, tidak perlu body
    if (req.method === 'GET') {
      options.body = undefined;
    }
    
    console.log(`Proxying ${req.method} request to: ${url}`);
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`Response status: ${response.status}`);
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}
