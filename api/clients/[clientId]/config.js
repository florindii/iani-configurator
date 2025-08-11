// Multi-client configuration API endpoint  
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
    const { clientId } = req.query;

    console.log('🏢 Vercel API: Fetching config for client:', clientId);

    // Client configurations
    const clientConfigs = {
      'ianii': {
        clientName: 'Ianii Furniture',
        storeUrl: 'ianii.myshopify.com',
        productId: '7976588148793',
        currency: 'RSD',
        variants: {
          blue: { id: '44770052309049', sku: 'SOFA-BLUE', price: 299.99, color: 'blue', available: true },
          red: { id: '44770045395001', sku: 'SOFA-RED', price: 319.99, color: 'red', available: true },
          green: { id: '44770045427769', sku: 'SOFA-GREEN', price: 309.99, color: 'green', available: true },
          brown: { id: '44770045460537', sku: 'SOFA-BROWN', price: 329.99, color: 'brown', available: true },
          purple: { id: '44770045493305', sku: 'SOFA-PURPLE', price: 349.99, color: 'purple', available: true },
          orange: { id: '44770045526073', sku: 'SOFA-ORANGE', price: 339.99, color: 'orange', available: true }
        },
        branding: {
          logo: '/logos/ianii-logo.png',
          colors: {
            primary: '#0066cc',
            secondary: '#4A90E2'
          }
        }
      },
      'demo-furniture': {
        clientName: 'Demo Furniture Store',
        storeUrl: 'demo-furniture.myshopify.com',
        productId: 'demo-sofa-12345',
        currency: 'USD',
        variants: {
          blue: { id: 'demo_blue_001', sku: 'DEMO-BLUE', price: 399.99, color: 'blue', available: true },
          red: { id: 'demo_red_002', sku: 'DEMO-RED', price: 429.99, color: 'red', available: true },
          green: { id: 'demo_green_003', sku: 'DEMO-GREEN', price: 419.99, color: 'green', available: true },
          brown: { id: 'demo_brown_004', sku: 'DEMO-BROWN', price: 449.99, color: 'brown', available: true },
          purple: { id: 'demo_purple_005', sku: 'DEMO-PURPLE', price: 479.99, color: 'purple', available: true },
          orange: { id: 'demo_orange_006', sku: 'DEMO-ORANGE', price: 459.99, color: 'orange', available: true }
        },
        branding: {
          logo: '/logos/demo-logo.png',
          colors: {
            primary: '#ff6b35',
            secondary: '#f7931e'
          }
        }
      },
      'luxury-living': {
        clientName: 'Luxury Living Furniture',
        storeUrl: 'luxury-living.myshopify.com',
        productId: 'luxury-sofa-789',
        currency: 'EUR',
        variants: {
          black: { id: 'lux_black_001', sku: 'LUX-BLACK', price: 1299.99, color: 'black', available: true },
          white: { id: 'lux_white_002', sku: 'LUX-WHITE', price: 1399.99, color: 'white', available: true },
          gray: { id: 'lux_gray_003', sku: 'LUX-GRAY', price: 1349.99, color: 'gray', available: true },
          brown: { id: 'lux_brown_004', sku: 'LUX-BROWN', price: 1429.99, color: 'brown', available: true }
        },
        branding: {
          logo: '/logos/luxury-logo.png',
          colors: {
            primary: '#2c3e50',
            secondary: '#34495e'
          }
        }
      }
    };

    const config = clientConfigs[clientId];

    if (!config) {
      console.log('❌ Client config not found:', clientId);
      res.status(404).json({ 
        error: 'Client configuration not found',
        availableClients: Object.keys(clientConfigs),
        message: `Client "${clientId}" is not configured. Available clients: ${Object.keys(clientConfigs).join(', ')}`
      });
      return;
    }

    console.log('✅ Returning config for client:', clientId);
    res.status(200).json(config);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}