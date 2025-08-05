// Vercel API function for product configurations
export default function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Return sample configurations
      return res.status(200).json({
        configurations: [
          {
            id: 'config_1',
            productId: 'test-sofa',
            data: { color: 'blue' },
            createdAt: new Date().toISOString()
          }
        ]
      });
    }

    if (req.method === 'POST') {
      const { shop, customerId, customerEmail, configurationData, previewImage, totalPrice } = req.body;

      console.log('💾 Saving configuration:', { shop, configurationData, totalPrice });

      const configuration = {
        id: `config_${Date.now()}`,
        productId: req.query.productId || 'test-product',
        customerEmail,
        shopifyCustomerId: customerId,
        configurationData,
        previewImageUrl: previewImage,
        totalPrice: totalPrice || 0,
        status: 'saved',
        createdAt: new Date().toISOString()
      };

      console.log('✅ Configuration saved:', configuration);

      return res.status(200).json({
        success: true,
        configuration,
        message: 'Configuration saved successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Error in products API:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
}
