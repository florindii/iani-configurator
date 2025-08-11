const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const convertSvgToGlb = require('./convertSvgToGlb');

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ CORS needs to be added BEFORE any routes
app.use(cors({
  origin: '*', // Allow all origins for testing
  credentials: false
}));

// ✅ NEW: Add headers for iframe embedding and WebGL support
app.use((req, res, next) => {
  // Allow iframe embedding from Shopify and file origins
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.shopify.com https://admin.shopify.com file:;");
  
  // Set permissive permissions policy for iframe
  res.setHeader('Permissions-Policy', 
    'accelerometer=*, camera=*, geolocation=*, gyroscope=*, magnetometer=*, microphone=*, payment=*, usb=*, fullscreen=*'
  );
  
  // Allow all origins for GLB file access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  next();
});

app.use(express.json({ limit: '50mb' })); // Increase limit for 3D preview images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Multi-Client Product Variants System
const clientVariants = {
  // CLIENT 1: ianii (your store)
  'ianii': {
    blue: { id: '44770052309049', sku: 'SOFA-BLUE', price: 299.99, color: 'blue', available: true },
    red: { id: '44770045395001', sku: 'SOFA-RED', price: 319.99, color: 'red', available: true },
    green: { id: '44770045427769', sku: 'SOFA-GREEN', price: 309.99, color: 'green', available: true },
    brown: { id: '44770045460537', sku: 'SOFA-BROWN', price: 329.99, color: 'brown', available: true },
    purple: { id: '44770045493305', sku: 'SOFA-PURPLE', price: 349.99, color: 'purple', available: true },
    orange: { id: '44770045526073', sku: 'SOFA-ORANGE', price: 339.99, color: 'orange', available: true }
  },
  // CLIENT 2: demo-furniture (demo client)
  'demo-furniture': {
    blue: { id: 'demo_blue_001', sku: 'DEMO-BLUE', price: 399.99, color: 'blue', available: true },
    red: { id: 'demo_red_002', sku: 'DEMO-RED', price: 429.99, color: 'red', available: true },
    green: { id: 'demo_green_003', sku: 'DEMO-GREEN', price: 419.99, color: 'green', available: true },
    brown: { id: 'demo_brown_004', sku: 'DEMO-BROWN', price: 449.99, color: 'brown', available: true },
    purple: { id: 'demo_purple_005', sku: 'DEMO-PURPLE', price: 479.99, color: 'purple', available: true },
    orange: { id: 'demo_orange_006', sku: 'DEMO-ORANGE', price: 459.99, color: 'orange', available: true }
  },
  // CLIENT 3: luxury-living (luxury demo)
  'luxury-living': {
    black: { id: 'lux_black_001', sku: 'LUX-BLACK', price: 1299.99, color: 'black', available: true },
    white: { id: 'lux_white_002', sku: 'LUX-WHITE', price: 1399.99, color: 'white', available: true },
    gray: { id: 'lux_gray_003', sku: 'LUX-GRAY', price: 1349.99, color: 'gray', available: true },
    brown: { id: 'lux_brown_004', sku: 'LUX-BROWN', price: 1429.99, color: 'brown', available: true }
  },
  // Legacy support
  '7976588148793': {
    blue: { id: '44770052309049', sku: 'SOFA-BLUE', price: 299.99, color: 'blue', available: true },
    red: { id: '44770045395001', sku: 'SOFA-RED', price: 319.99, color: 'red', available: true },
    green: { id: '44770045427769', sku: 'SOFA-GREEN', price: 309.99, color: 'green', available: true },
    brown: { id: '44770045460537', sku: 'SOFA-BROWN', price: 329.99, color: 'brown', available: true },
    purple: { id: '44770045493305', sku: 'SOFA-PURPLE', price: 349.99, color: 'purple', available: true },
    orange: { id: '44770045526073', sku: 'SOFA-ORANGE', price: 339.99, color: 'orange', available: true }
  },
  'default-sofa-product': {
    blue: { id: '44770052309049', sku: 'SOFA-BLUE', price: 299.99, color: 'blue', available: true },
    red: { id: '44770045395001', sku: 'SOFA-RED', price: 319.99, color: 'red', available: true },
    green: { id: '44770045427769', sku: 'SOFA-GREEN', price: 309.99, color: 'green', available: true },
    brown: { id: '44770045460537', sku: 'SOFA-BROWN', price: 329.99, color: 'brown', available: true },
    purple: { id: '44770045493305', sku: 'SOFA-PURPLE', price: 349.99, color: 'purple', available: true },
    orange: { id: '44770045526073', sku: 'SOFA-ORANGE', price: 339.99, color: 'orange', available: true }
  }
};

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.glb', '.gltf', '.svg', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Simple JSON database (will be replaced with Prisma integration)
const dbPath = path.join(__dirname, 'data', 'configurations.json');
let db = { configurations: [], products: [] };

// Load existing data
if (fs.existsSync(dbPath)) {
  try {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (err) {
    console.error('Error loading database:', err);
  }
}

// Save data function
const saveDb = () => {
  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error saving database:', err);
  }
};

// ROUTES

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Original upload endpoint (keep for compatibility)
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = `${Date.now()}.glb`;
    const destPath = path.join(__dirname, 'glbs', fileName);
    
    // Ensure glbs directory exists
    if (!fs.existsSync(path.join(__dirname, 'glbs'))) {
      fs.mkdirSync(path.join(__dirname, 'glbs'), { recursive: true });
    }

    fs.renameSync(file.path, destPath);
    const fileUrl = `/glbs/${fileName}`;

    res.json({ 
      success: true, 
      url: fileUrl,
      fileName: fileName 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ✅ ENHANCED API ENDPOINTS FOR SHOPIFY INTEGRATION

// ✅ Multi-Client API: Get variants by client ID (with auto-generation)
app.get('/api/clients/:clientId/variants', (req, res) => {
  try {
    const { clientId } = req.params;
    let variants = clientVariants[clientId];
    
    console.log('📦 Fetching variants for client:', clientId);
    
    // If client not found, auto-generate variants
    if (!variants || Object.keys(variants).length === 0) {
      console.log('🎉 Auto-generating variants for new client:', clientId);
      variants = generateClientVariants(clientId);
      
      // Cache the generated variants
      clientVariants[clientId] = variants;
    }
    
    console.log('✅ Available variants:', Object.keys(variants));
    res.json(variants);
  } catch (error) {
    console.error('❌ Error fetching client variants:', error);
    res.status(500).json({ error: 'Failed to fetch client variants' });
  }
});

// ✨ Auto-generate variants for any client
function generateClientVariants(clientName) {
  const basePrice = 299.99;
  const priceMultiplier = 1 + (clientName.length % 5) * 0.1;
  
  return {
    blue: { 
      id: `auto_${clientName}_blue`, 
      sku: `${clientName.toUpperCase()}-BLUE`, 
      price: Math.round(basePrice * priceMultiplier * 100) / 100, 
      color: 'blue', 
      available: true 
    },
    red: { 
      id: `auto_${clientName}_red`, 
      sku: `${clientName.toUpperCase()}-RED`, 
      price: Math.round(basePrice * priceMultiplier * 1.1 * 100) / 100, 
      color: 'red', 
      available: true 
    },
    green: { 
      id: `auto_${clientName}_green`, 
      sku: `${clientName.toUpperCase()}-GREEN`, 
      price: Math.round(basePrice * priceMultiplier * 1.05 * 100) / 100, 
      color: 'green', 
      available: true 
    },
    brown: { 
      id: `auto_${clientName}_brown`, 
      sku: `${clientName.toUpperCase()}-BROWN`, 
      price: Math.round(basePrice * priceMultiplier * 1.15 * 100) / 100, 
      color: 'brown', 
      available: true 
    },
    purple: { 
      id: `auto_${clientName}_purple`, 
      sku: `${clientName.toUpperCase()}-PURPLE`, 
      price: Math.round(basePrice * priceMultiplier * 1.2 * 100) / 100, 
      color: 'purple', 
      available: true 
    },
    orange: { 
      id: `auto_${clientName}_orange`, 
      sku: `${clientName.toUpperCase()}-ORANGE`, 
      price: Math.round(basePrice * priceMultiplier * 1.12 * 100) / 100, 
      color: 'orange', 
      available: true 
    }
  };
}

// Legacy: Get product variants (backward compatibility)
app.get('/api/products/:productId/variants', (req, res) => {
  try {
    const { productId } = req.params;
    const variants = clientVariants[productId] || {};
    
    console.log('📦 Legacy: Fetching variants for product:', productId);
    console.log('✅ Available variants:', Object.keys(variants));
    res.json(variants);
  } catch (error) {
    console.error('❌ Error fetching variants:', error);
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

// Enhanced configuration save with variant mapping
app.post('/api/configurations', async (req, res) => {
  try {
    const { productId, variantId, configurationData, previewImage, totalPrice, customerId, customerEmail } = req.body;
    
    const configId = `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const configuration = {
      id: configId,
      productId,
      variantId,
      configurationData,
      previewImage,
      totalPrice,
      customerId,
      customerEmail,
      status: 'saved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store configuration
    db.configurations.push(configuration);
    saveDb();
    
    console.log('✅ Configuration saved with ID:', configId);
    res.json({ success: true, configuration });
  } catch (error) {
    console.error('❌ Error saving configuration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific configuration
app.get('/api/configurations/:configId', (req, res) => {
  try {
    const { configId } = req.params;
    const configuration = db.configurations.find(c => c.id === configId);
    
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    console.log('📖 Retrieved configuration:', configId);
    res.json(configuration);
  } catch (error) {
    console.error('❌ Error fetching configuration:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Upload preview image endpoint
app.post('/api/upload-preview', async (req, res) => {
  try {
    const { imageData, configurationId } = req.body;
    
    if (!imageData || !configurationId) {
      return res.status(400).json({ error: 'Missing imageData or configurationId' });
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, 'uploads', 'previews');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Convert base64 to file
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const filename = `preview_${configurationId}_${Date.now()}.png`;
    const filepath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(filepath, base64Data, 'base64');
    
    const previewUrl = `${req.protocol}://${req.get('host')}/uploads/previews/${filename}`;
    
    console.log('📸 Preview image saved:', previewUrl);
    res.json({ success: true, url: previewUrl, filename });
    
  } catch (error) {
    console.error('❌ Preview upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get product configuration
app.get('/api/products/:productId/configuration', (req, res) => {
  try {
    const { productId } = req.params;
    const configurations = db.configurations.filter(c => c.productId === productId);
    res.json({ configurations });
  } catch (error) {
    console.error('Get configuration error:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Save product configuration
app.post('/api/products/:productId/configuration', (req, res) => {
  try {
    const { productId } = req.params;
    const {
      shop,
      customerId,
      customerEmail,
      configurationData,
      previewImage,
      totalPrice = 0
    } = req.body;

    const configuration = {
      id: Date.now().toString(),
      productId,
      shop,
      customerId,
      customerEmail,
      configurationData,
      previewImage,
      totalPrice,
      status: 'saved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.configurations.push(configuration);
    saveDb();

    res.json({ 
      success: true, 
      configuration,
      message: 'Configuration saved successfully' 
    });
  } catch (error) {
    console.error('Save configuration error:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Update configuration status (for cart integration)
app.patch('/api/configurations/:configId', (req, res) => {
  try {
    const { configId } = req.params;
    const { status, shopifyVariantId, shopifyOrderId, cartItemId } = req.body;

    const configIndex = db.configurations.findIndex(c => c.id === configId);
    if (configIndex === -1) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    db.configurations[configIndex] = {
      ...db.configurations[configIndex],
      status,
      shopifyVariantId,
      shopifyOrderId,
      cartItemId,
      updatedAt: new Date().toISOString()
    };

    saveDb();

    res.json({ 
      success: true, 
      configuration: db.configurations[configIndex] 
    });
  } catch (error) {
    console.error('Update configuration error:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// ✅ ENHANCED Multi-Client Cart Integration API
app.post('/api/cart/add', async (req, res) => {
  try {
    const {
      clientId,
      shop,
      productId,
      variantId,
      sku,
      configurationData,
      configurationId,
      totalPrice,
      currency,
      customerId,
      customerEmail,
      quantity = 1,
      properties = {}
    } = req.body;

    console.log('🛒 Processing multi-client cart addition:', {
      clientId,
      productId,
      variantId,
      sku,
      configurationId,
      totalPrice,
      currency,
      quantity,
      color: configurationData?.color
    });

    // Get client-specific variants
    const productVars = clientVariants[clientId || productId] || {};
    let selectedVariant = Object.values(productVars).find(v => v.id === variantId);
    
    // If variant not found, check if it's a fallback variant
    if (!selectedVariant) {
      if (variantId && (variantId.startsWith('fallback_') || variantId.startsWith('demo_') || variantId.startsWith('lux_'))) {
        console.log('⚠️ Using fallback/demo variant:', variantId);
        selectedVariant = {
          id: variantId,
          sku: sku || `${(clientId || 'UNKNOWN').toUpperCase()}-${configurationData?.color?.toUpperCase() || 'UNKNOWN'}`,
          price: totalPrice || 299.99,
          color: configurationData?.color || 'unknown',
          available: true
        };
      } else {
        console.error('❌ Invalid variant for client:', clientId, 'variantId:', variantId, 'Available:', Object.keys(productVars));
        return res.status(400).json({
          success: false,
          error: 'Invalid variant selected',
          clientId,
          variantId,
          availableVariants: Object.keys(productVars),
          availableClients: Object.keys(clientVariants),
          message: `Variant ${variantId} not found for client ${clientId}`
        });
      }
    }

    // Create cart item with client context
    const cartItemId = `cart_${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const variantTitle = `Custom ${configurationData.color} Sofa (${selectedVariant.sku}) - ${clientId}`;
    
    const cartItem = {
      id: cartItemId,
      clientId,
      productId,
      variantId: selectedVariant.id,
      sku: selectedVariant.sku,
      title: variantTitle,
      price: selectedVariant.price,
      currency: currency || 'USD',
      quantity,
      configurationId,
      configurationData,
      shop,
      customerId,
      customerEmail,
      status: 'in_cart',
      properties: {
        'Configuration ID': configurationId,
        'Client': clientId,
        'Custom Color': configurationData.color,
        'Product SKU': selectedVariant.sku,
        'Configured At': new Date().toLocaleString(),
        'Configuration URL': `${req.protocol}://${req.get('host')}/configurator?client=${clientId}&config=${configurationId}`,
        ...properties
      },
      createdAt: new Date().toISOString()
    };

    // Add to cart items collection
    if (!db.cartItems) {
      db.cartItems = [];
    }
    db.cartItems.push(cartItem);
    saveDb();

    // Update configuration status
    const config = db.configurations.find(c => c.id === configurationId);
    if (config) {
      config.status = 'in_cart';
      config.cartItemId = cartItemId;
      config.shopifyVariantId = selectedVariant.id;
      config.clientId = clientId;
      config.updatedAt = new Date().toISOString();
      saveDb();
    }

    console.log('✅ Multi-client cart item created:', {
      id: cartItemId,
      client: clientId,
      variant: selectedVariant.sku,
      price: selectedVariant.price,
      currency: currency || 'USD',
      color: configurationData.color
    });

    // Return success with detailed info
    res.json({
      success: true,
      cartItem: {
        id: cartItemId,
        clientId,
        variantId: selectedVariant.id,
        sku: selectedVariant.sku,
        title: variantTitle,
        price: selectedVariant.price,
        currency: currency || 'USD',
        quantity,
        configurationId
      },
      variant: selectedVariant,
      client: clientId,
      message: `Custom ${configurationData.color} sofa added to cart for ${clientId}!`,
      configurationUrl: `${req.protocol}://${req.get('host')}/configurator?client=${clientId}&config=${configurationId}`,
      shareableUrl: `${req.protocol}://${req.get('host')}/configurator?client=${clientId}&config=${configurationId}&productId=${productId}`
    });
    
  } catch (error) {
    console.error('❌ Multi-client cart addition error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add item to cart',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 🔍 Debug endpoint to check what variants are available
app.get('/api/debug/variants/:productId?', (req, res) => {
  const { productId } = req.params;
  const targetProduct = productId || 'default-sofa-product';
  
  res.json({
    requestedProduct: targetProduct,
    availableProducts: Object.keys(productVariants),
    variants: productVariants[targetProduct] || {},
    allVariants: productVariants,
    timestamp: new Date().toISOString()
  });
});
app.get('/api/cart/:shop', (req, res) => {
  try {
    const { shop } = req.params;
    const cartItems = db.cartItems ? db.cartItems.filter(item => item.shop === shop) : [];
    res.json({ cartItems });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to get cart items' });
  }
});

// Get all configurations for a shop
app.get('/api/shop/:shop/configurations', (req, res) => {
  try {
    const { shop } = req.params;
    const configurations = db.configurations.filter(c => c.shop === shop);
    res.json({ configurations });
  } catch (error) {
    console.error('Get shop configurations error:', error);
    res.status(500).json({ error: 'Failed to get configurations' });
  }
});

// Generate preview image placeholder
app.post('/api/generate-preview', (req, res) => {
  try {
    const { configurationData, modelUrl } = req.body;
    
    // For now, return a placeholder
    // Later, you can implement server-side rendering with Three.js
    const previewUrl = `/previews/placeholder-${Date.now()}.png`;
    
    res.json({ 
      success: true, 
      previewUrl,
      message: 'Preview generated successfully' 
    });
  } catch (error) {
    console.error('Generate preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Serve static files
app.use('/glbs', express.static(path.join(__dirname, 'glbs')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/previews', express.static(path.join(__dirname, 'previews')));

// ✅ Enhanced static file serving with better paths
app.use('/uploads/previews', express.static(path.join(__dirname, 'uploads', 'previews')));

// ✅ NEW: Serve models from public/models directory (for Vue app compatibility)
app.use('/models', express.static(path.join(__dirname, '../public/models')));

// Serve Vue.js assets (CSS, JS, etc.) - MUST come before SPA routes
app.use('/assets', express.static(path.join(__dirname, '../dist/assets')));

// Serve Vue.js configurator (production build)
app.use('/configurator', express.static(path.join(__dirname, '../dist')));

// Vue.js SPA fallback - ONLY for HTML routes, not assets
app.get('/configurator/*', (req, res) => {
  // Don't serve index.html for asset requests
  if (req.path.includes('/assets/') || req.path.includes('.')) {
    return res.status(404).send('Asset not found');
  }
  
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Vue app not built. Run: npm run build' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Enhanced server running on http://localhost:${PORT}`);
  console.log(`📁 Vue configurator: http://localhost:${PORT}/configurator`);
  console.log(`🔧 API endpoints: http://localhost:${PORT}/api`);
  console.log(`📤 File uploads: http://localhost:${PORT}/upload`);
});
