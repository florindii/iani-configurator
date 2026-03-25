# Iani 3D Configurator - Complete Project Knowledge Base

---

# PART 1: DEVELOPMENT REFERENCE

## Project Overview

**Project**: Iani 3D Configurator
**Type**: Shopify App for 3D product customization (Glasses + Furniture)
**Stack**: Vue.js 3 + Three.js + TypeScript + Vite | Shopify Remix + Polaris + Prisma
**Deployment**: Vercel (Frontend) + Shopify (Theme Extension + Admin App)
**Last updated**: March 2025

---

## Quick Start

```bash
# Frontend (Vue 3D Configurator)
npm install
npm run dev          # localhost:5173
npm run build        # Production build
npx vercel --prod --yes  # Deploy to Vercel

# Shopify Admin App
cd iani-configurator
npm install
npm run dev          # Starts with Cloudflare tunnel
shopify app deploy   # Deploy app + extension

# Database
cd iani-configurator
npx prisma studio          # View/edit data
npx prisma migrate dev     # Run new migrations
```

---

## Full File Structure

```
iani-configurator/                      # Root = Vue frontend
├── src/
│   ├── App.vue                         # Root component, routing logic
│   ├── main.ts                         # Entry point
│   ├── utils/
│   │   └── logger.ts                   # Logging utility
│   ├── components/
│   │   ├── ThreeSceneMinimal.vue       # Main 3D configurator (color, material, pricing, WebXR)
│   │   ├── ThreeSceneModal.vue         # Modal-mode wrapper for ThreeSceneMinimal
│   │   ├── VirtualTryOn.vue            # Face AR overlay (MediaPipe + OrthographicCamera)
│   │   ├── AdminTryOnPreview.vue       # Preview try-on result in admin
│   │   ├── AdminTryOnTest.vue          # Test try-on with live camera in admin
│   │   └── AdminCalibrateTryOn.vue     # Calibrate offsetY + scale for try-on per product
│   └── services/
│       ├── shopifyService.ts           # PostMessage cart integration
│       └── faceTrackingService.ts      # MediaPipe Face Mesh wrapper
│
├── public/models/                      # 3D GLB models (served statically)
├── dist/                               # Production build (deployed to Vercel)
├── vercel.json                         # Vercel deployment config
├── vite.config.ts
└── package.json                        # Vue 3 + Three.js 0.176 + Vite 6

iani-configurator/                      # Shopify Admin App (Remix)
├── app/
│   ├── shopify.server.ts               # Shopify app auth config
│   ├── db.server.ts                    # Prisma client singleton
│   ├── billing.server.ts               # PLANS config + billing helpers
│   └── routes/
│       ├── app.tsx                     # Layout: NavMenu (Home, 3D Products, Preview, Analytics, Subscription)
│       ├── app._index.tsx              # Dashboard: stats, recent products, quick actions
│       ├── app.products._index.tsx     # Product list with plan limit indicator
│       ├── app.products.new.tsx        # Add new 3D product (pick from Shopify catalog)
│       ├── app.products.$id.tsx        # Edit product: colors, materials, try-on toggle, calibration
│       ├── app.configurator.tsx        # Iframe preview of the 3D configurator
│       ├── app.billing.tsx             # Subscription plans UI (Free/Starter/Pro/Business)
│       ├── app.analytics.tsx           # Analytics dashboard (Business plan only)
│       ├── app.additional.tsx          # Additional settings page
│       ├── auth.$.tsx                  # OAuth callback handler
│       ├── privacy.tsx                 # GDPR privacy policy page
│       │
│       ├── api.gdpr.tsx                # GDPR webhooks (data_request, redact, shop redact)
│       ├── api.product-config.$productId.tsx     # Public: get product config for iframe
│       ├── api.products.$productId.configuration.tsx  # Get product + color/material options
│       ├── api.save-configuration.tsx            # Save customer configuration to DB
│       ├── api.get-configuration.$id.tsx         # Get saved configuration by ID
│       ├── api.configurations.$configId.tsx      # Get configuration (alternate endpoint)
│       ├── api.upload-preview.tsx                # Upload base64 preview image to DB
│       ├── api.preview-image.$id.tsx             # Serve preview image by ID
│       ├── api.cart.add.tsx                      # Shopify cart add (server-side)
│       ├── api.draft-order.tsx                   # Create Shopify draft order
│       ├── api.test-db.tsx                       # DB health check endpoint
│       │
│       ├── webhooks.app.uninstalled.tsx           # App uninstall webhook
│       ├── webhooks.app.scopes_update.tsx         # Scopes update webhook
│       └── webhooks.app.subscriptions-update.tsx  # Billing subscription update webhook
│
├── prisma/
│   └── schema.prisma                   # PostgreSQL schema (see below)
│
├── extensions/
│   └── theme-extension/
│       ├── shopify.extension.toml
│       ├── locales/en.default.json
│       ├── blocks/
│       │   ├── 3d-configurator.liquid  # Main App Block (modal or inline mode)
│       │   └── cart-preview.liquid     # Cart block: shows customized preview image
│       └── assets/
│           ├── configurator-loader.js  # Iframe loader + PostMessage handler
│           └── configurator.css
│
└── package.json                        # Remix 2.16 + Polaris 12 + Prisma 6
```

---

## Database Schema (PostgreSQL via Neon)

```prisma
Session          # Shopify OAuth sessions

Shop             # Per-shop billing state
  shopDomain     # "mystore.myshopify.com"
  plan           # "free" | "starter" | "pro" | "business"
  subscriptionId # Shopify subscription ID
  subscriptionStatus  # "none" | "active" | "cancelled" | "frozen"
  trialEndsAt    # Trial expiry
  productLimit   # 1 / 3 / -1 (unlimited)

Product3D        # A Shopify product with 3D config
  shopifyProductId
  shop
  name
  baseModelUrl   # Custom GLB URL (optional)
  useShopifyModel  # Use Shopify product media instead
  isActive
  tryOnEnabled   # Enable face AR for this product
  tryOnType      # "glasses" | "hat" | "earrings" | "necklace"
  tryOnOffsetY   # Vertical offset (-50 to 50)
  tryOnScale     # Scale multiplier (0.5 to 2.0)
  colorOptions[]
  materialOptions[]
  configurations[]

ColorOption      # A color choice for a product
  name, hexCode, price, sortOrder, isDefault

MaterialOption   # A material choice for a product
  name, description, extraCost, sortOrder, isDefault

ProductConfiguration   # A customer's saved config
  product3DId, shop
  customerEmail, shopifyCustomerId
  shopifyOrderId, shopifyOrderName
  configurationData  # JSON blob
  previewImageUrl    # base64 or URL
  colorName, colorHex, materialName
  totalPrice
  status         # "draft" | "saved" | "ordered"

ConfigurationPreview   # Base64 preview images
  id (= configurationId), shop, imageData
```

---

## Billing Plans

| Plan     | Price   | Products  | Face AR | Space AR | Watermark | Analytics | Priority Support |
|----------|---------|-----------|---------|----------|-----------|-----------|-----------------|
| Free     | $0      | 1         | No      | No       | Yes       | No        | No              |
| Starter  | $19/mo  | 3         | No      | No       | Yes       | No        | No              |
| Pro      | $49/mo  | Unlimited | Yes     | No       | No        | No        | No              |
| Business | $99/mo  | Unlimited | Yes     | Yes      | No        | Yes       | Yes             |

All paid plans include a 14-day free trial. Billing uses Shopify's native Billing API (`appSubscriptionCreate`). Custom apps fall back to a dev mode manual plan switch.

Feature access is gated server-side via `hasFeatureAccess(shop, feature)` in `billing.server.ts`. The analytics route redirects to `/app/billing` if the shop is not on Business plan.

---

## Key Technical Patterns

### PostMessage Communication (iframe to Shopify storefront)

```javascript
// Add to cart
window.parent.postMessage({
  type: 'IANI_ADD_TO_CART',
  payload: { variantId, configuration, previewImage }
}, '*')

// Try-On lifecycle (hide/show Shopify close button)
window.parent.postMessage({ type: 'IANI_TRYON_OPENED' }, '*')
window.parent.postMessage({ type: 'IANI_TRYON_CLOSED' }, '*')
```

### AR Implementation
- **Face AR**: MediaPipe Face Mesh (`@mediapipe/face_mesh`) + Three.js `OrthographicCamera` (no distortion)
- **Space AR**: WebXR Device API (`renderer.xr`) for room placement

### Feature Gating (server-side)
```typescript
// billing.server.ts
const hasAccess = await hasFeatureAccess(shop, "analytics");
// feature keys: "tryOnEnabled" | "spaceArEnabled" | "watermark" | "analytics" | "prioritySupport"
if (!hasAccess) return redirect("/app/billing");
```

---

## Completed Features

### Frontend (Vue)
- 3D model rendering with OrbitControls (360 rotate, zoom)
- Color customization (preset swatches + custom hex)
- Material selection with extra cost pricing
- Real-time dynamic pricing display
- Virtual Try-On: MediaPipe face mesh, glasses overlay, head rotation, color sync
- Photo capture and download in try-on mode
- Space AR via WebXR (furniture/decor placement)
- Admin Try-On calibration UI (offsetY, scale sliders with live preview)
- PostMessage cart integration

### Shopify Admin App
- OAuth install flow
- Dashboard with product stats and plan usage bar
- Product list with plan limit progress indicator
- Add/edit products: colors, materials, pricing, try-on toggle, offsetY/scale calibration
- Configurator live preview iframe
- Full billing page: 4 plans, equal-height comparison cards, trial status, dev mode fallback
- Analytics dashboard (Business plan only): total configs, orders, conversion rate, revenue, top colors, top materials, per-product breakdown table, recent orders
- GDPR webhook handlers (data_request, customer redact, shop redact)
- App uninstall + subscription update webhooks

### Theme Extension
- App Block in modal or inline display mode
- Auto-load or click-to-load option
- Cart preview block (shows customization image in cart)
- Mobile responsive

### API Endpoints
- Product config serving for iframe (`/api/product-config/:productId`)
- Save/get configurations
- Preview image upload and serving
- Cart add (server-side proxy)
- Draft order creation

---

## Remaining / Known Issues

| Item | Priority | Notes |
|------|----------|-------|
| Remove debug green eye-marker dots | Low | Set `DEBUG_SHOW_EYE_MARKERS = false` in `ThreeSceneMinimal.vue` |
| Fix temple length edge case in try-on | Low | Camera near plane issue on certain face angles |
| App Store submission | Medium | Screenshots, description, review process |
| Beta testing with merchants | High | Real-world feedback needed |

---

## Commands Reference

```bash
# Frontend
npm run dev                    # Vite dev server (localhost:5173)
npm run build                  # Type-check + production build
npx vercel --prod --yes        # Deploy to Vercel

# Shopify Admin App
cd iani-configurator
npm run dev                    # Shopify CLI dev with tunnel
shopify app deploy             # Deploy app + theme extension
npx prisma studio              # DB GUI
npx prisma migrate dev         # Create + run migration
npx prisma generate            # Regenerate Prisma client

# Git
git add . && git commit -m "message" && git push
```

---

# PART 2: BUSINESS & PRODUCT KNOWLEDGE

## Unique Selling Point

**Only Shopify app with BOTH Face AR (Virtual Try-On) and Space AR (View in Room)** plus a full 3D configurator.

| Competitor  | Type           | Price      | Our Advantage                          |
|-------------|----------------|------------|----------------------------------------|
| Fittingbox  | Face AR only   | $500+/mo   | We have Space AR too, fraction of cost |
| Threekit    | Space AR only  | $1000+/mo  | We have Face AR too, simpler setup     |
| Zakeke      | 3D Config only | $50/mo     | We have both AR types                  |
| Shopify AR  | Basic Space AR | Free       | More features, customization, try-on   |

## Target Markets

- **Face AR**: Eyewear ($180B), Jewelry ($350B), Fashion accessories ($25B)
- **Space AR**: Furniture ($250B e-commerce), Home Decor ($130B), Outdoor ($45B)

## Beta Readiness

Ready now: install, configure products, add App Block, 3D viewer, Virtual Try-On, cart save, analytics, GDPR.
Nice to have before launch: remove debug markers, fix temple edge case, App Store submission.

---

## Glossary

| Term | Definition |
|------|------------|
| App Block | Shopify theme component merchants add via theme editor |
| Theme Extension | Shopify-approved way to inject code into storefront |
| PostMessage | Browser API for iframe to parent page communication |
| MediaPipe | Google ML framework for face landmark detection |
| OrthographicCamera | Three.js camera without perspective distortion (used for Face AR) |
| WebXR | Web API for AR/VR experiences (used for Space AR) |
| GLB/GLTF | 3D model file formats |
| Neon | Serverless PostgreSQL provider used for the database |
| Polaris | Shopify's React UI component library (v12) |
