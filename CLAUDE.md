# Iani 3D Configurator - Complete Project Knowledge Base

---

# PART 1: DEVELOPMENT REFERENCE

## Project Overview

**Project**: Iani 3D Configurator
**Type**: Shopify App for 3D product customization (Glasses + Furniture)
**Current State**: 92% complete
**Stack**: Vue.js 3 + Three.js + TypeScript + Vite + Shopify Remix
**Deployment**: Vercel (Frontend) + Shopify (Theme Extension + Admin App)

---

## Quick Start

```bash
# Frontend (Vue 3D Configurator)
npm install
npm run dev          # localhost:5173
npm run build        # Production build

# Shopify Admin App (from iani-configurator/)
cd iani-configurator
npm install
npm run dev          # Starts with Cloudflare tunnel
shopify app deploy   # Deploy to Shopify
```

---

## Architecture

```
iani-configurator/
├── src/                              # Vue.js Frontend
│   ├── components/
│   │   ├── ThreeSceneMinimal.vue     # Main 3D configurator
│   │   └── VirtualTryOn.vue          # AR face try-on
│   ├── services/
│   │   ├── shopifyService.ts         # Cart integration
│   │   └── faceTrackingService.ts    # MediaPipe face detection
│   └── App.vue
│
├── iani-configurator/                 # Shopify Remix Admin App
│   ├── app/routes/
│   │   ├── app._index.tsx            # Dashboard
│   │   ├── app.products._index.tsx   # Product list
│   │   ├── app.products.new.tsx      # Add new 3D product
│   │   ├── app.products.$id.tsx      # Edit product (colors, materials, try-on)
│   │   ├── app.configurator.tsx      # Configurator preview
│   │   ├── api.gdpr.tsx              # GDPR compliance ✅
│   │   ├── api.product-config.$productId.tsx
│   │   └── privacy.tsx               # Privacy policy page
│   │
│   ├── prisma/schema.prisma          # PostgreSQL database schema
│   │
│   └── extensions/theme-extension/   # Shopify Theme App Extension ✅
│       ├── blocks/
│       │   ├── 3d-configurator.liquid  # Main App Block
│       │   └── cart-preview.liquid     # Cart preview block
│       ├── assets/
│       │   ├── configurator-loader.js  # Iframe loader + messaging
│       │   └── configurator.css
│       └── shopify.extension.toml
│
├── public/models/                    # 3D GLB models
└── dist/                             # Production build
```

---

## Development Progress: 92%

### ✅ FULLY COMPLETED

| Component | Status | Location |
|-----------|--------|----------|
| **3D CONFIGURATOR** | | |
| 3D Model Rendering (Three.js) | ✅ | `ThreeSceneMinimal.vue` |
| 360° Rotation (OrbitControls) | ✅ | `ThreeSceneMinimal.vue` |
| Color Customization (6 presets + custom) | ✅ | `ThreeSceneMinimal.vue` |
| Material Selection with pricing | ✅ | `ThreeSceneMinimal.vue` |
| Dynamic Pricing (real-time) | ✅ | `ThreeSceneMinimal.vue` |
| **AR - VIRTUAL TRY-ON (Face)** | | |
| MediaPipe Face Tracking | ✅ | `faceTrackingService.ts` |
| Glasses Overlay on Face | ✅ | `VirtualTryOn.vue` |
| Head Rotation Following | ✅ | `VirtualTryOn.vue` |
| Color Change in AR Mode | ✅ | `VirtualTryOn.vue` |
| Photo Capture & Download | ✅ | `VirtualTryOn.vue` |
| **AR - VIEW IN ROOM (Space)** | | |
| Place in Environment (WebXR) | ✅ | `ThreeSceneMinimal.vue` |
| Furniture Support | ✅ | Sofas, chairs, tables |
| **SHOPIFY THEME EXTENSION** | | |
| App Block (3d-configurator.liquid) | ✅ | `extensions/theme-extension/blocks/` |
| Modal & Inline Display Modes | ✅ | `3d-configurator.liquid` |
| Iframe Loader with PostMessage | ✅ | `configurator-loader.js` |
| Cart Preview Block | ✅ | `cart-preview.liquid` |
| Mobile Responsive | ✅ | CSS in liquid |
| **SHOPIFY ADMIN APP** | | |
| OAuth Authentication | ✅ | Remix + Shopify CLI |
| Product List Page | ✅ | `app.products._index.tsx` |
| Add New 3D Product | ✅ | `app.products.new.tsx` |
| Edit Product (colors, materials) | ✅ | `app.products.$id.tsx` |
| Try-On Enable/Disable per product | ✅ | `app.products.$id.tsx` |
| Configurator Preview | ✅ | `app.configurator.tsx` |
| **DATABASE (PostgreSQL)** | | |
| Session Management | ✅ | `prisma/schema.prisma` |
| Product3D Model | ✅ | Links to Shopify product |
| ColorOption Model | ✅ | Hex codes, pricing, sort order |
| MaterialOption Model | ✅ | Extra cost, descriptions |
| ProductConfiguration Model | ✅ | Customer configs, preview images |
| **GDPR COMPLIANCE** | | |
| customers/data_request webhook | ✅ | `api.gdpr.tsx` |
| customers/redact webhook | ✅ | `api.gdpr.tsx` |
| shop/redact webhook | ✅ | `api.gdpr.tsx` |
| Privacy Policy Page | ✅ | `privacy.tsx` |
| **E-COMMERCE INTEGRATION** | | |
| Add to Cart via PostMessage | ✅ | `configurator-loader.js` |
| Configuration in Cart Properties | ✅ | Saves color, material |
| Preview Image in localStorage | ✅ | For cart display |
| **DEPLOYMENT** | | |
| Vercel Auto-Deploy | ✅ | `vercel.json` |
| Shopify App Deploy | ✅ | `shopify.app.toml` |

### 🔄 REMAINING (8%)

| Task | Priority | Effort | Notes |
|------|----------|--------|-------|
| Remove debug green dots | LOW | 5 min | Set `DEBUG_SHOW_EYE_MARKERS = false` |
| Fix temple length in try-on | LOW | 1 hour | Camera near plane issue |
| App Store Submission | MEDIUM | 2-3 days | Screenshots, description, review |
| Beta Testing with merchants | HIGH | 1 week | Real-world feedback |

---

## Key Technical Details

### Database Schema (PostgreSQL via Neon)
```prisma
Product3D {
  shopifyProductId    # Links to Shopify
  shop                # Multi-tenant
  baseModelUrl        # Custom GLB URL
  useShopifyModel     # Or use Shopify media
  tryOnEnabled        # Enable face AR
  tryOnType           # "glasses", "hat", etc.
  colorOptions[]      # Hex, price, sortOrder
  materialOptions[]   # Name, extraCost
}
```

### Theme Extension Communication
```javascript
// Configurator → Shopify (add to cart)
window.parent.postMessage({
  type: 'IANI_ADD_TO_CART',
  payload: { variantId, configuration, previewImage }
}, '*')

// Try-On state (hide/show Shopify close button)
window.parent.postMessage({ type: 'IANI_TRYON_OPENED' }, '*')
window.parent.postMessage({ type: 'IANI_TRYON_CLOSED' }, '*')
```

### AR Implementation
- **Face AR**: MediaPipe Face Mesh + OrthographicCamera
- **Space AR**: WebXR Device API for room placement

---

## File Quick Reference

| Purpose | Location |
|---------|----------|
| 3D Configurator | `src/components/ThreeSceneMinimal.vue` |
| Virtual Try-On | `src/components/VirtualTryOn.vue` |
| Face Tracking | `src/services/faceTrackingService.ts` |
| Theme App Block | `iani-configurator/extensions/theme-extension/blocks/3d-configurator.liquid` |
| Iframe Loader | `iani-configurator/extensions/theme-extension/assets/configurator-loader.js` |
| Admin Product Edit | `iani-configurator/app/routes/app.products.$id.tsx` |
| GDPR Webhooks | `iani-configurator/app/routes/api.gdpr.tsx` |
| Database Schema | `iani-configurator/prisma/schema.prisma` |

---

## Commands Reference

```bash
# Frontend Development
npm run dev                    # Start dev server
npm run build                  # Production build
npx vercel --prod --yes        # Deploy to Vercel

# Shopify Admin App
cd iani-configurator
npm run dev                    # Start with tunnel
shopify app deploy             # Deploy app + extension
npx prisma studio              # View database
npx prisma migrate dev         # Run migrations

# Git
git add . && git commit -m "message" && git push
```

---

## Recent Changes (January 2025)

- Fixed glasses temple orientation in Virtual Try-On
- Switched to OrthographicCamera for AR (no distortion)
- Added PostMessage communication for try-on state
- Theme extension hides close button during try-on

---

# PART 2: BUSINESS & PRODUCT KNOWLEDGE BASE

## Product Vision

**Iani 3D Configurator** is a Shopify app with **Dual AR capabilities**:

1. **Face AR (Virtual Try-On)** - Glasses, sunglasses, jewelry overlay on face
2. **Space AR (View in Room)** - Furniture, decor placement in environment
3. **3D Configurator** - Real-time color/material customization with pricing

### Unique Selling Point
**Only Shopify app with BOTH Face AR and Space AR** - Competitors offer one or the other.

---

## What's Actually Built (Verified)

### For Merchants (Admin App)
- ✅ OAuth install from Shopify Partner dashboard
- ✅ Dashboard showing 3D-enabled products
- ✅ Add product → Select from Shopify catalog → Configure colors/materials
- ✅ Edit product → Change colors, hex codes, prices, materials
- ✅ Enable/disable Virtual Try-On per product
- ✅ Choose try-on type (glasses, hat, earrings, necklace)
- ✅ Use Shopify's 3D media OR custom GLB URL

### For Storefront (Theme Extension)
- ✅ App Block merchants add via theme editor
- ✅ Modal mode (popup) or Inline mode (embedded)
- ✅ Auto-load or click-to-load options
- ✅ Customizable colors, height, border radius
- ✅ Cart preview block for showing customized images

### For Customers (Frontend)
- ✅ Interactive 3D viewer (rotate, zoom)
- ✅ Color selection with visual preview
- ✅ Material selection with pricing
- ✅ Virtual Try-On with camera
- ✅ Photo capture and download
- ✅ Add to cart with configuration saved

---

## Target Markets

### Face AR (Virtual Try-On)
| Industry | Products | Market Size |
|----------|----------|-------------|
| Eyewear | Glasses, sunglasses | $180B globally |
| Jewelry | Earrings, necklaces | $350B globally |
| Fashion | Hats, headwear | $25B globally |

### Space AR (View in Room)
| Industry | Products | Market Size |
|----------|----------|-------------|
| Furniture | Sofas, chairs, tables | $250B e-commerce |
| Home Decor | Lamps, rugs, art | $130B globally |
| Outdoor | Patio, garden | $45B globally |

---

## Competitive Analysis

| Competitor | Type | Price | Our Advantage |
|------------|------|-------|---------------|
| Fittingbox | Face AR only | $500+/mo | We have Space AR too, $29/mo |
| Threekit | Space AR only | $1000+/mo | We have Face AR too, simpler |
| Zakeke | 3D Config only | $50/mo | We have both AR types |
| Shopify AR | Basic Space AR | Free | More features, customization |
| **Iani** | **BOTH + 3D** | $29/mo | **Only dual-AR solution** |

---

## Pricing Strategy (Proposed)

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0/mo | 1 product, 3D viewer only, watermark |
| **Pro** | $29/mo | Unlimited products, Face AR + Space AR, no watermark |
| **Business** | $79/mo | + Analytics, priority support, custom branding |
| **Enterprise** | Custom | White-label, API access, dedicated support |

---

## Beta Testing Readiness

### ✅ Ready for Beta
- Merchants can install app
- Merchants can configure products (colors, materials, pricing)
- Merchants can add App Block to theme
- Customers can use 3D configurator
- Customers can use Virtual Try-On
- Cart saves configuration
- GDPR compliant

### 🔄 Nice-to-Have for Beta
- Remove debug markers (green dots)
- Fix temple rendering edge case
- Better loading states

### ❌ Not Needed for Beta
- App Store listing (beta is private)
- Analytics dashboard
- Multi-language support

---

## Next Steps Priority

1. **Fix minor UI issues** (green dots, temple length) - 1 day
2. **Internal testing** on development store - 2 days
3. **Recruit 3-5 beta merchants** (eyewear + furniture) - 1 week
4. **Collect feedback & iterate** - 2 weeks
5. **App Store submission** - After beta validation

---

## Glossary

| Term | Definition |
|------|------------|
| **App Block** | Shopify theme component merchants add via editor |
| **Theme Extension** | Shopify-approved way to inject code into storefront |
| **PostMessage** | Browser API for iframe ↔ parent communication |
| **MediaPipe** | Google's ML framework for face detection |
| **OrthographicCamera** | Three.js camera without perspective distortion |
| **WebXR** | Web API for AR/VR experiences |
| **GLB/GLTF** | 3D model file formats |
| **Neon** | Serverless PostgreSQL provider |

---

*Last updated: January 2025*
*Actual progress verified from codebase*
