@echo off
echo 🛋️ Deploying Iani 3D Configurator...
echo ======================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from your project root.
    pause
    exit /b 1
)

REM Build the project
echo 🔨 Building project...
call npm run build

if errorlevel 1 (
    echo ❌ Build failed. Please fix errors and try again.
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
call vercel --prod

if errorlevel 0 (
    echo.
    echo 🎉 DEPLOYMENT SUCCESSFUL!
    echo ======================================
    echo ✅ Your 3D configurator is now live!
    echo.
    echo 📋 NEXT STEPS:
    echo 1. Copy your Vercel URL ^(shown above^)
    echo 2. Update the configuratorUrl in your Shopify integration
    echo 3. Test the integration on your Shopify store
    echo.
    echo 🔧 INTEGRATION FILE:
    echo Use: shopify-integration/fullscreen-integration-UPDATED.liquid
    echo.
) else (
    echo ❌ Deployment failed. Please check the error messages above.
    pause
    exit /b 1
)

pause
