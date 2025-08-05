// Vercel API function for cart
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop, productId, configurationData, totalPrice, customerId, customerEmail } = req.body;

    console.log('🛒 Adding to cart via Vercel API:', { shop, productId, totalPrice });

    // For now, return success response
    // Later we'll connect this to a real database
    const cartResponse = {
      success: true,
      configuration: {
        id: `config_${Date.now()}`,
        productId,
        data: configurationData,
        price: totalPrice
      },
      cartItem: {
        id: `cart_${Date.now()}`,
        productId,
        title: `Custom Product Configuration`,
        price: totalPrice,
        quantity: 1,
        customProperties: {
          'Configuration': JSON.stringify(configurationData),
          'Total Price': `$${totalPrice.toFixed(2)}`
        }
      },
      message: 'Configuration saved successfully'
    };

    console.log('✅ Cart response:', cartResponse);
    res.status(200).json(cartResponse);

  } catch (error) {
    console.error('❌ Error adding to cart:', error);
    res.status(500).json({ 
      error: 'Failed to add to cart',
      details: error.message 
    });
  }
}
