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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// NEW API ENDPOINTS FOR SHOPIFY INTEGRATION

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

// ✅ NEW: Cart Integration API
app.post('/api/cart/add', async (req, res) => {
  try {
    const {
      productId,
      configurationId,
      configurationData,
      totalPrice,
      shop,
      customerId,
      customerEmail
    } = req.body;

    console.log('🛒 Processing cart addition:', {
      productId,
      configurationId,
      totalPrice,
      shop
    });

    // Create a unique variant title based on configuration
    const variantTitle = `Custom ${configurationData.material} ${configurationData.color} ${configurationData.size}`;
    
    // Create a mock variant ID for now (in production, you'd create actual Shopify variants)
    const mockVariantId = `variant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockCartItemId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // For development: simulate cart addition
    const cartResult = {
      success: true,
      variantId: mockVariantId,
      cartItemId: mockCartItemId,
      variantTitle,
      price: totalPrice,
      configurationId,
      message: 'Configuration added to cart successfully'
    };

    // Save cart item to our database
    const cartItem = {
      id: mockCartItemId,
      configurationId,
      productId,
      variantId: mockVariantId,
      variantTitle,
      price: totalPrice,
      quantity: 1,
      shop,
      customerId,
      customerEmail,
      status: 'in_cart',
      configurationData,
      createdAt: new Date().toISOString()
    };

    // Add to cart items collection
    if (!db.cartItems) {
      db.cartItems = [];
    }
    db.cartItems.push(cartItem);
    saveDb();

    console.log('✅ Cart item created:', cartItem);

    res.json(cartResult);
  } catch (error) {
    console.error('❌ Cart addition error:', error);
    res.status(500).json({ 
      error: 'Failed to add to cart',
      message: error.message 
    });
  }
});

// Get cart items for a shop
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
