#!/bin/bash

# 🚀 Iani Configurator - Quick Deploy Script

echo "🛋️ Deploying Iani 3D Configurator..."
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from your project root."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "======================================"
    echo "✅ Your 3D configurator is now live!"
    echo ""
    echo "📋 NEXT STEPS:"
    echo "1. Copy your Vercel URL (shown above)"
    echo "2. Update the configuratorUrl in your Shopify integration"
    echo "3. Test the integration on your Shopify store"
    echo ""
    echo "🔧 INTEGRATION FILE:"
    echo "Use: shopify-integration/fullscreen-integration-UPDATED.liquid"
    echo ""
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
