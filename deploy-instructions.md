# 🚀 Deploy Your 3D Configurator

## Quick Deployment Options

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your project folder
cd C:\Users\flori\Desktop\iani-configurator
vercel

# Follow prompts, get a URL like: https://your-app.vercel.app
```

### Option 2: Netlify
```bash
# Build the project
npm run build

# Drag the 'dist' folder to netlify.com/drop
# Get URL like: https://your-app.netlify.app
```

### Option 3: GitHub Pages
1. Push your code to GitHub
2. Go to Settings > Pages
3. Deploy from main branch /dist folder

## After Deployment

1. **Update Shopify Product**: Replace the iframe src with your new URL:
```html
<iframe 
  src="https://your-deployed-url.com" 
  width="100%" 
  height="600" 
  frameborder="0">
</iframe>
```

2. **Update CORS**: Add your Shopify domain to server CORS settings

## Current Status
✅ 3D configurator working on localhost:5173
❌ Not deployed yet (needs deployment for Shopify)
❌ Not embedded in Shopify product page
