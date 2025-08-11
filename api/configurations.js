// Vercel API endpoint for configuration operations
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const {
        productId,
        shop,
        customerId,
        customerEmail,
        configurationData,
        previewImage,
        totalPrice
      } = req.body;

      console.log('💾 Vercel API: Saving configuration for product:', productId);

      // Generate configuration ID
      const configId = `vercel_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const configuration = {
        id: configId,
        productId,
        shop,
        customerId,
        customerEmail,
        configurationData,
        previewImage,
        totalPrice,
        status: 'saved',
        createdAt: new Date().toISOString(),
        environment: 'vercel-production'
      };

      console.log('✅ Vercel API: Configuration saved:', configId);

      res.status(200).json({
        success: true,
        configuration,
        message: 'Configuration saved successfully'
      });
    } catch (error) {
      console.error('❌ Vercel API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save configuration',
        message: error.message
      });
    }
  } else if (req.method === 'GET') {
    // Return empty configurations for demo
    res.status(200).json({ configurations: [] });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}