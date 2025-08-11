// Vercel API endpoint for cart operations
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
        shop,
        productId,
        variantId,
        sku,
        configurationData,
        configurationId,
        totalPrice,
        customerId,
        customerEmail,
        quantity = 1,
        properties = {}
      } = req.body;

      console.log('🛒 Vercel API: Processing cart addition:', {
        productId,
        variantId,
        sku,
        configurationId,
        totalPrice
      });

      // Simulate successful cart addition for demo
      const cartItemId = `vercel_cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const variantTitle = `Custom ${configurationData.color} Sofa (${sku})`;
      
      const result = {
        success: true,
        cartItem: {
          id: cartItemId,
          variantId,
          sku,
          title: variantTitle,
          price: totalPrice,
          quantity,
          configurationId
        },
        message: `Custom ${configurationData.color} sofa configuration saved successfully!`,
        configurationUrl: `https://iani-configurator.vercel.app/configurator?config=${configurationId}`,
        environment: 'vercel-production',
        timestamp: new Date().toISOString()
      };

      console.log('✅ Vercel API: Cart simulation successful');
      res.status(200).json(result);
    } catch (error) {
      console.error('❌ Vercel API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process cart request',
        message: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}