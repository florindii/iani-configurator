// Vercel API endpoint for product variants
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Return real Shopify variants for your store
    const variants = {
      blue: { id: '44770052309049', sku: 'SOFA-BLUE', price: 299.99, color: 'blue', available: true },
      red: { id: '44770045395001', sku: 'SOFA-RED', price: 319.99, color: 'red', available: true },
      green: { id: '44770045427769', sku: 'SOFA-GREEN', price: 309.99, color: 'green', available: true },
      brown: { id: '44770045460537', sku: 'SOFA-BROWN', price: 329.99, color: 'brown', available: true },
      purple: { id: '44770045493305', sku: 'SOFA-PURPLE', price: 349.99, color: 'purple', available: true },
      orange: { id: '44770045526073', sku: 'SOFA-ORANGE', price: 339.99, color: 'orange', available: true }
    };

    console.log('📦 Vercel API: Returning real Shopify variants for product 7976588148793');
    
    res.status(200).json(variants);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}