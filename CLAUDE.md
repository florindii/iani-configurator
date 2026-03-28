# Iani 3D Configurator - Complete Project Knowledge Base

---

# PART 1: DEVELOPMENT REFERENCE

## Project Overview

**Project**: Iani 3D Configurator
**Type**: Shopify App for 3D product customization (Glasses + Furniture)
**Stack**: Vue.js 3 + Three.js + TypeScript + Vite | Shopify Remix + Polaris + Prisma
**Deployment**: Vercel (Frontend) + Shopify (Theme Extension + Admin App)
**Last updated**: March 2026

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
│   ├── App.vue                         # Root component, routing logic (admin-calibrate, admin-test, or normal mode)
│   ├── main.ts                         # Entry point
│   ├── style.css                       # Global styles
│   ├── vite-env.d.ts                   # Vite type declarations
│   ├── env.d.ts                        # Environment type declarations
│   ├── utils/
│   │   └── logger.ts                   # Logging utility
│   ├── components/
│   │   ├── ThreeSceneMinimal.vue       # Main 3D configurator (~3614 lines): color, material, pricing, WebXR, per-mesh clicking, readonly mode, skeleton loading
│   │   ├── ThreeSceneModal.vue         # Legacy modal-mode wrapper (~737 lines) with placeholder cube geometry
│   │   ├── VirtualTryOn.vue            # Face AR overlay (~1198 lines): MediaPipe + PerspectiveCamera (low FOV 10deg)
│   │   ├── AdminTryOnPreview.vue       # Preview try-on result in admin (~146 lines)
│   │   ├── AdminTryOnTest.vue          # Legacy test try-on with live camera (~141 lines)
│   │   └── AdminCalibrateTryOn.vue     # Calibrate offsetY + scale for try-on per product (~552 lines)
│   └── services/
│       ├── shopifyService.ts           # MultiClientShopifyService class (~676 lines): client detection, variant management, cart operations, PostMessage
│       └── faceTrackingService.ts      # MediaPipe Face Mesh wrapper (~337 lines)
│
├── public/models/                      # 3D GLB models (served statically)
├── dist/                               # Production build (deployed to Vercel)
├── vercel.json                         # Vercel deployment config (CORS, CSP, rewrites)
├── vite.config.ts
└── package.json                        # Vue 3 + Three.js + Vite

iani-configurator/                      # Shopify Admin App (Remix)
├── app/
│   ├── shopify.server.ts               # Shopify app auth config
│   ├── db.server.ts                    # Prisma client singleton
│   ├── billing.server.ts              # PLANS config + billing helpers (getOrCreateShop, hasFeatureAccess, canAddProduct, createBillingSubscription, etc.)
│   ├── globals.d.ts                    # TypeScript global declarations
│   ├── routes.ts                       # Route configuration
│   └── routes/
│       ├── _index/
│       │   ├── route.tsx               # Landing page (non-app route)
│       │   └── styles.module.css       # Landing page styles
│       ├── app.tsx                     # Layout: NavMenu (Home, 3D Products, Preview, Subscription)
│       ├── app._index.tsx              # Dashboard: stats, onboarding checklist, quick actions, upsell banners
│       ├── app.products._index.tsx     # Product list with plan limit indicator
│       ├── app.products.new.tsx        # Add new 3D product (pick from Shopify catalog, 4-step wizard)
│       ├── app.products.$id.tsx        # Edit product: colors, materials, try-on toggle, calibration, delete
│       ├── app.configurator.tsx        # Iframe preview of the 3D configurator with recent configurations
│       ├── app.billing.tsx             # Subscription plans UI (Free/Starter/Pro/Business), dev mode plan switching
│       ├── app.additional.tsx          # Additional settings page (template placeholder)
│       ├── auth.$.tsx                  # OAuth callback handler
│       ├── auth.login/
│       │   ├── route.tsx               # Login route
│       │   └── error.server.tsx        # Login error handling
│       ├── privacy.tsx                 # GDPR privacy policy page
│       │
│       ├── api.gdpr.tsx                # GDPR webhooks (data_request, redact, shop redact)
│       ├── api.product-config.$productId.tsx     # Public: get product config for iframe (with feature gating)
│       ├── api.products.$productId.configuration.tsx  # Get product + color/material options
│       ├── api.save-configuration.tsx            # Save customer configuration to DB
│       ├── api.get-configuration.$id.tsx         # Get saved configuration by ID
│       ├── api.configurations.$configId.tsx      # Get/update configuration (alternate endpoint)
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
│       │   └── cart-preview.liquid     # Cart block: shows customized preview image + draft order checkout
│       └── assets/
│           ├── configurator-loader.js  # Iframe loader + PostMessage handler + cart flow
│           └── configurator.css
│
└── package.json                        # Remix 2.16 + Polaris 12 + Prisma 6
```

---

## Database Schema (PostgreSQL via Neon)

```prisma
Session          # Shopify OAuth sessions

Shop             # Per-shop billing state
  shopDomain     # "mystore.myshopify.com" (unique)
  plan           # "free" | "starter" | "pro" | "business"
  subscriptionId # Shopify subscription ID
  subscriptionStatus  # "none" | "active" | "cancelled" | "frozen" | "pending"
  trialEndsAt    # Trial expiry
  currentPeriodEnd # Current billing period end
  productLimit   # 1 / 3 / -1 (unlimited)
  hasAddedAppBlock   # Onboarding flag
  hasPreviewedStore  # Onboarding flag

Product3D        # A Shopify product with 3D config
  shopifyProductId + shop (unique compound)
  name
  basePrice      # Base price before customizations
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

CustomizationOption  # Legacy model (deprecated, unused)
  product3DId, optionType, optionName, optionValue, price

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

## Billing Plans (as implemented in billing.server.ts)

| Plan     | Price   | Products  | Face AR | Space AR | Watermark | Analytics | Priority Support |
|----------|---------|-----------|---------|----------|-----------|-----------|-----------------|
| Free     | $0      | 1         | No      | No       | Yes       | No        | No              |
| Starter  | $19/mo  | 3         | No      | No       | Yes       | No        | No              |
| Pro      | $49/mo  | Unlimited | Yes     | No       | No        | No        | No              |
| Business | $99/mo  | Unlimited | Yes     | Yes      | No        | No        | Yes             |

**Note**: Analytics is set to `false` for ALL plans in the current code, including Business. The analytics feature flag exists but no analytics route or dashboard has been implemented.

All paid plans include a 14-day free trial. Billing uses Shopify's native Billing API (`appSubscriptionCreate`). Custom apps fall back to a dev mode manual plan switch.

Feature access is gated server-side via `hasFeatureAccess(shop, feature)` in `billing.server.ts`.

---

## Key Technical Patterns

### PostMessage Communication (iframe to Shopify storefront)

```javascript
// Iframe -> Storefront
window.parent.postMessage({ type: 'IANI_ADD_TO_CART', payload: { colorName, colorHex, materialName, price, quantity, configuration, meshCustomizations, previewImage, configurationId } }, '*')
window.parent.postMessage({ type: 'IANI_TRYON_OPENED' }, '*')
window.parent.postMessage({ type: 'IANI_TRYON_CLOSED' }, '*')
window.parent.postMessage({ type: 'IANI_CLOSE' }, '*')
// Sent on mount:
window.parent.postMessage({ type: 'IANI_READY' }, '*')

// Storefront -> Iframe
{ type: 'IANI_INIT', payload: { productId, variantId, shop, currency, price, moneyFormat } }
{ type: 'IANI_CART_SUCCESS', payload: { item details } }
{ type: 'IANI_CART_ERROR', payload: { message } }
```

### AR Implementation
- **Face AR**: MediaPipe Face Mesh (`@mediapipe/face_mesh` from CDN) + Three.js `PerspectiveCamera` (FOV 10 degrees for near-orthographic look while preserving depth for temple arms)
- **Space AR**: WebXR Device API (`renderer.xr`) for room placement on ARCore Android devices

### Feature Gating (server-side)
```typescript
// billing.server.ts
const hasAccess = await hasFeatureAccess(shop, "tryOnEnabled");
// feature keys: "tryOnEnabled" | "spaceArEnabled" | "watermark" | "analytics" | "prioritySupport"
```

### Multi-Client Shopify Service
`shopifyService.ts` implements `MultiClientShopifyService` with:
- Client detection from URL params (`client`, `store`, `shop`)
- Static client configs for `ianii`, `demo-furniture`, `luxury-living`
- Auto-generation of client configs for unknown clients
- Cart operations with API fallback to local simulation
- PostMessage bridge to parent Shopify storefront

---

## Completed Features

### Frontend (Vue)
- 3D model rendering with OrbitControls (360 rotate, zoom, pan with damping)
- Per-mesh clicking: click individual parts to customize them independently
- Color customization: 6 preset swatches + custom hex picker, per-mesh application
- Material selection: 4 frame materials (Oak, Walnut, Metal, White Oak) with roughness/metalness
- Pillow style options (Classic, Velvet Blue, Golden, Burgundy)
- Leg style options (Wooden, Metal, Brass, Black Metal)
- Real-time dynamic pricing with 25+ currency support
- Loading skeleton UI while model loads
- Read-only mode for merchant configuration viewing (click-to-highlight parts)
- Preview mode for admin (no cart button)
- Virtual Try-On: MediaPipe face mesh, glasses overlay, head rotation tracking, color sync
- Photo capture and download in try-on mode
- Space AR via WebXR (tap-to-place, rotate/scale/move controls, surface detection reticle)
- Admin Try-On calibration UI (offsetY, scale sliders with presets)
- PostMessage cart integration with preview image capture
- Fallback models: geometric sofa (configurator) and geometric glasses (try-on) if GLB fails
- Dynamic model loading from: API config > URL param > Shopify media > default models
- Dynamic config loading from API: color options, material options, try-on settings, space AR flag

### Shopify Admin App
- OAuth install flow with session management
- Dashboard with product stats, onboarding checklist (3 steps with progress bar), upsell banners
- Product list with plan limit progress indicator
- Add products: 4-step wizard (select Shopify product > name/price > colors > materials)
- Edit products: colors, materials, pricing, try-on toggle, offsetY/scale calibration, delete with confirmation
- Configurator live preview iframe with recent configurations list
- Full billing page: 4 plans side-by-side, trial status, dev mode fallback for custom apps
- GDPR webhook handlers (data_request logs data, customer redact deletes configs, shop redact deletes all data)
- App uninstall + subscription update webhooks
- Error boundaries on product edit page

### Theme Extension
- App Block in modal or inline display mode
- Auto-load or click-to-load option
- Configurable: height, colors, border radius, button text, fullscreen toggle, debug mode
- Cart preview block: shows customization image, hides internal properties, price restoration from localStorage
- Draft order creation for checkout with custom pricing (30-min expiration)
- Mobile responsive with accessibility (ARIA labels, touch targets, reduced motion, high contrast)
- CSS isolation, Safari fixes, print-friendly

### API Endpoints
- `GET /api/product-config/:productId` - Product config with feature gating (CORS enabled)
- `POST /api/save-configuration` - Save configuration (auto-creates Product3D if missing)
- `GET /api/get-configuration/:id` - Get saved configuration
- `GET /api/products/:id/configuration` - List last 10 configs for product
- `POST /api/products/:id/configuration` - Create new configuration
- `PUT /api/configurations/:id` - Update configuration status
- `POST /api/upload-preview` - Upload base64 preview image
- `GET /api/preview-image/:id` - Serve preview image (1-year cache)
- `POST /api/cart/add` - Cart add (server-side proxy)
- `POST /api/draft-order` - Create Shopify draft order with price overrides
- `GET /api/test-db` - Database health check

---

## Remaining / Known Issues

| Item | Priority | Notes |
|------|----------|-------|
| App Store submission | Medium | Screenshots, description, review process needed |
| Color/material options partially hardcoded | Low | Frontend has hardcoded fallbacks for standalone/demo mode; loads from API when product/shop context available — intentional behavior |

## Recently Completed

| Item | Notes |
|------|-------|
| Public API endpoints secured | Rate limiting (per-IP, per-minute) + shop domain validation on all `/api/*` routes via `app/utils/api-security.server.ts` |
| Automated tests added | Vitest + 20 tests covering billing plan logic and API security; run with `cd iani-configurator && npm test` |
| Analytics references removed | Dashboard no longer references unimplemented analytics feature |
| Hardcoded URLs replaced with env vars | `FRONTEND_URL` (Remix app), `VITE_CONFIGURATOR_URL` (Vue frontend); theme extension reads URLs from configurable block settings |
| `CustomizationOption` removed from schema | Run `npx prisma migrate dev --name remove_customization_option` to apply |
| Legacy files deleted | `app.additional.tsx`, `ThreeSceneModal.vue`, `AdminTryOnTest.vue` removed; `App.vue` cleaned up |
| GDPR webhooks completed | All three handlers now fully compliant (data export, customer redact with previews, shop redact in correct FK order) |

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

# Tests
cd iani-configurator
npm test                       # Run all Vitest tests (billing + API security)
npm run test:watch             # Watch mode

# Required after removing CustomizationOption
npx prisma migrate dev --name remove_customization_option
```

## Environment Variables

```bash
# Shopify Admin App (iani-configurator/.env)
SHOPIFY_APP_URL=https://iani-configurator-1.onrender.com   # Backend API URL
FRONTEND_URL=https://iani-configurator.vercel.app          # Vue frontend URL (for calibration tool link)

# Vue Frontend (.env / .env.production)
VITE_CONFIGURATOR_URL=https://iani-configurator.vercel.app # Production configurator URL
VITE_API_BASE_URL=https://iani-configurator.vercel.app     # Dev API base URL
VITE_BRIDGE_URL=http://localhost:3001                      # Dev bridge server URL
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

---

## Glossary

| Term | Definition |
|------|------------|
| App Block | Shopify theme component merchants add via theme editor |
| Theme Extension | Shopify-approved way to inject code into storefront |
| PostMessage | Browser API for iframe to parent page communication |
| MediaPipe | Google ML framework for face landmark detection |
| WebXR | Web API for AR/VR experiences (used for Space AR) |
| GLB/GLTF | 3D model file formats |
| Neon | Serverless PostgreSQL provider used for the database |
| Polaris | Shopify's React UI component library (v12) |

---

# PART 3: DETAILED FEATURE ANALYSIS REPORT

**Analysis Date**: March 2026
**Purpose**: Accurate assessment of every implemented feature -- completeness, implementation quality, technical details, and known issues.

---

## Feature Completion Overview

| # | Feature | Status | Completion | Component(s) |
|---|---------|--------|------------|---------------|
| 1 | 3D Model Loading & Rendering | COMPLETE | 100% | ThreeSceneMinimal.vue |
| 2 | OrbitControls (Rotate/Zoom/Pan) | COMPLETE | 100% | ThreeSceneMinimal.vue |
| 3 | Color Customization (Per-Mesh) | COMPLETE | 100% | ThreeSceneMinimal.vue |
| 4 | Material Selection | COMPLETE | 95% | ThreeSceneMinimal.vue |
| 5 | Dynamic Pricing Engine | COMPLETE | 100% | ThreeSceneMinimal.vue |
| 6 | Virtual Try-On (Face AR) | COMPLETE | 95% | VirtualTryOn.vue, faceTrackingService.ts |
| 7 | Try-On Calibration System | COMPLETE | 100% | AdminCalibrateTryOn.vue, AdminTryOnPreview.vue |
| 8 | Space AR (WebXR Custom) | COMPLETE | 100% | ThreeSceneMinimal.vue (WebXR), 3d-configurator.liquid (Shopify native) |
| 9 | PostMessage Iframe Protocol | COMPLETE | 100% | ThreeSceneMinimal.vue, configurator-loader.js |
| 10 | Theme Extension (App Block) | COMPLETE | 95% | 3d-configurator.liquid, configurator-loader.js |
| 11 | Cart Integration & Draft Orders | COMPLETE | 90% | cart-preview.liquid, api.cart.add, api.draft-order |
| 12 | Admin Dashboard | COMPLETE | 95% | app._index.tsx |
| 13 | Product Management (CRUD) | COMPLETE | 95% | app.products.*.tsx |
| 14 | Billing & Subscription System | COMPLETE | 90% | app.billing.tsx, billing.server.ts |
| 15 | Analytics Dashboard | NOT IMPLEMENTED | 0% | No route file exists |
| 16 | Configuration Save/Load API | COMPLETE | 90% | api.save-configuration, api.get-configuration |
| 17 | Preview Image System | COMPLETE | 85% | api.upload-preview, api.preview-image |
| 18 | GDPR Compliance | COMPLETE | 95% | api.gdpr.tsx, privacy.tsx |
| 19 | Webhook Handlers | COMPLETE | 90% | webhooks.*.tsx |
| 20 | Database Schema | COMPLETE | 90% | schema.prisma |
| 21 | Read-Only Configuration Viewer | COMPLETE | 100% | ThreeSceneMinimal.vue |
| 22 | Multi-Client Service | COMPLETE | 90% | shopifyService.ts |

**Overall Project Completion: ~87%**

---

## FEATURE 1: 3D Model Loading & Rendering

**Component**: `src/components/ThreeSceneMinimal.vue` (~3614 lines)
**Status**: COMPLETE (100%)

### How It Works
- Uses Three.js `GLTFLoader` to load `.glb` models with priority chain:
  1. Product config API URL (fetched from `/api/product-config/:productId`)
  2. Full URL passed via `modelUrl` URL param
  3. Model filename from `modelFile` URL param (resolved against `/public/models/`)
  4. Dropdown selection from available models list (debug mode)
- On load: auto-calculates bounding box, positions camera intelligently based on model dimensions (small/medium/large scaling)
- Takes `gltf.scene.children[0]` as the model root
- Creates fallback clickable sofa geometry (body + seat cushion) if primary model fails
- Scene: PerspectiveCamera (FOV 50), 7-light setup (ambient + 6 directional + hemisphere), WebGLRenderer with antialiasing, shadow maps, ACES filmic tone mapping

### Lighting Setup (Enhanced Multi-Directional)
- Ambient: 0.85 intensity
- 6 directional lights from all angles (front-right, back-left, top, bottom, front-left, back-right)
- Hemisphere light for natural ambient fill
- Shadow maps: PCFSoftShadowMap, 2048x2048 resolution

### Model Analysis (identifySofaParts)
- Traverses all meshes and classifies via name pattern matching:
  - **Frame patterns**: receiver, body, frame, main, base, structure, rim, temple, bridge
  - **Cushion patterns**: cushion, seat, padding, back, fabric, upholstery, lens
  - **Leg patterns**: barrel, tube, pipe, leg, support, foot, feet, stand
  - **Arm/Pillow patterns**: grip, handle, arm, pillow, rest, accessory, hinge
- Unidentified meshes default to frame category
- Each mesh gets material cloned with new UUID for complete isolation

### Debug Features
- Hidden debug panel with model selector dropdown (4 hardcoded models)
- Debug stats: total meshes, cushions, frame, pillows, legs counts
- Export model structure to clipboard
- Debug toggle commented out in template

---

## FEATURE 2: OrbitControls (Rotate/Zoom/Pan)

**Component**: `src/components/ThreeSceneMinimal.vue`
**Status**: COMPLETE (100%)

- Three.js `OrbitControls` with damping (factor: 0.05)
- Zoom limits calculated dynamically: minDistance = maxDim * 0.1, maxDistance = maxDim * 10
- Full polar angle range (0 to PI)
- Auto-updates target to model center on load

---

## FEATURE 3: Color Customization (Per-Mesh)

**Component**: `src/components/ThreeSceneMinimal.vue`
**Status**: COMPLETE (100%)

### How It Works
- **Click a mesh part** -> shows customization menu (Colors or Frame buttons)
- **Preset Colors**: 6 defaults loaded from API or hardcoded fallback:
  - Ocean Blue (#4A90E2, $299.99), Crimson Red (#E74C3C, $319.99), Forest Green (#2ECC71, $309.99), Chocolate Brown (#8B4513, $329.99), Royal Purple (#9B59B6, $339.99), Sunset Orange (#E67E22, $314.99)
- **Custom Hex Picker**: Native HTML5 color input
- **Per-Mesh Tracking**: `meshCustomizations` reactive object stores per-mesh state: `{ "meshName": { colorHex, colorName, type, partType, price } }`
- Colors and materials dynamically loaded from `/api/product-config/:productId` when Shopify context is available

### Edge highlight
- Clicked mesh gets edge border highlight (`EdgesGeometry` + `LineSegments`)
- Only one mesh highlighted at a time

---

## FEATURE 4: Material Selection

**Component**: `src/components/ThreeSceneMinimal.vue`
**Status**: COMPLETE (95%)

### Materials
- 4 frame materials: Oak Wood ($0, rough:0.8/metal:0.0), Walnut ($50, 0.7/0.0), Metal Frame ($75, 0.3/0.8), White Oak ($25, 0.9/0.0)
- 4 pillow styles: Classic ($0), Velvet Blue ($35), Golden ($40), Burgundy ($35)
- 4 leg styles: Wooden ($0), Metal ($60), Brass ($80), Black Metal ($65)
- Applied to clicked mesh only via `material.roughness` and `material.metalness`

### Missing (5%)
- Material UI requires clicking a part first -- not immediately discoverable
- Material options loaded from API when available, but pillow/leg options are always hardcoded

---

## FEATURE 5: Dynamic Pricing Engine

**Component**: `src/components/ThreeSceneMinimal.vue`
**Status**: COMPLETE (100%)

- **Base Price**: From Shopify URL param `price`, or product config API, or default $299.99
- **Extra Costs**: Aggregated from all `meshCustomizations` entries (each customized mesh adds its color/material price)
- **Legacy fallback**: If no mesh customizations, sums from single color + frame + pillow + leg selections
- **Formula**: `calculatedPrice = basePrice + totalExtraCost`
- **Display**: Crossed-out base price when extras exist
- **Currency**: 25+ currencies via symbol map + `Intl.NumberFormat`-style formatting
- **Read-only mode**: Uses saved config price (`savedConfigPrice`) instead of calculating

---

## FEATURE 6: Virtual Try-On (Face AR)

**Components**: `src/components/VirtualTryOn.vue` (~1198 lines), `src/services/faceTrackingService.ts` (~337 lines)
**Status**: COMPLETE (95%)

### Face Detection Pipeline
1. `faceTrackingService.ts` loads MediaPipe Face Mesh from CDN (`cdn.jsdelivr.net/npm/@mediapipe/face_mesh/`)
2. Config: maxNumFaces=1, refineLandmarks=true, minDetectionConfidence=0.5
3. Extracts 468 landmarks per frame, key points for eyes, nose, forehead, ears

### Glasses Positioning Algorithm
1. MediaPipe normalized coords (0-1) -> pixel coords -> Three.js world coords via `faceToThreeJS()`
2. Center point = midpoint between left and right eye positions
3. Eye distance used for scaling: `targetGlassesWidth = eyeDistance * 2.2`
4. Base lens offset: `eyeDistance * 0.35`
5. Custom offset: `(offsetY / 100) * eyeDistance`
6. Custom scale: `baseScale * customScaleMultiplier`

### Camera System
- PerspectiveCamera with FOV 10 degrees (near-orthographic look, preserves depth for temples)
- Camera distance: `(canvasHeight/2) / tan(fov/2)` to fill view
- Canvas sized to match displayed video element (not native resolution)

### Head Rotation Tracking
- Pitch: `-rotation.pitch * 0.3`
- Yaw: `-rotation.yaw * 0.6` (inverted for mirrored selfie view)
- Roll: `rotation.roll * 0.5`

### Color Sync
- Receives `colorOptions` and `selectedColor` props from parent configurator
- `applyColorToModel()` traverses all meshes and updates material colors
- Watches for parent-initiated color changes

### Photo Capture
- `combineVideoAndModel()`: composites mirrored video + 3D overlay onto canvas
- JPEG quality 0.9, auto-generated filename with timestamp

### Fallback Glasses
- Creates geometric glasses (torus frames, circle lenses, cylinder bridge, box temples) if GLB fails

### Debug
- `DEBUG_SHOW_EYE_MARKERS = false` (green spheres at eye positions)

---

## FEATURE 7: Try-On Calibration System

**Components**: `AdminCalibrateTryOn.vue` (~552 lines), `AdminTryOnPreview.vue` (~146 lines), `AdminTryOnTest.vue` (~141 lines, legacy)
**Status**: COMPLETE (100%)

- Real-time sliders: offsetY (-50% to +50%), scale (0.5x to 2.0x, step 0.05)
- Presets: Reset defaults, Narrow face, Wide face
- Save sends `CALIBRATION_SAVED` PostMessage to parent admin window
- Unsaved changes detection before close
- Admin preview embeds VirtualTryOn with hidden controls
- Product edit page opens calibration in new window (hardcoded Vercel URL)

---

## FEATURE 8: Space AR (Dual Implementation)

**Status**: COMPLETE (100%)

### Implementation A: Shopify Native AR
- Shopify's built-in `<model-viewer>` / Scene Viewer / AR Quick Look
- Works when merchant uploads GLB as Shopify product media
- Shows BASE model only (not customized colors)

### Implementation B: Custom WebXR (Three.js immersive-ar)
- Feature gated: `spaceArEnabled` via `hasFeatureAccess()` (Business plan)
- Device detection: `navigator.xr.isSessionSupported('immersive-ar')` -- button hidden if unsupported
- Iframe permission: `xr-spatial-tracking` in iframe `allow` attribute

#### Flow
1. Saves scene state, sets transparent background for camera passthrough
2. Clones model with `model.clone(true)` -- shares materials (customizations carry over)
3. Auto-scales to ~1 meter (largest dimension)
4. Hit-test for surface detection, white reticle ring on detected surfaces
5. Tap to place model at reticle position
6. After placement: move mode (model follows surface), rotate (10-degree increments), scale (0.95x-1.05x, clamped 0.25-4.0)
7. Move indicator: ring + 4 directional arrows, auto-hides after 5 seconds
8. Session end: restores scene, re-enables controls

#### Device Compatibility
- Android Chrome (ARCore): Full support
- iOS Safari: `isSessionSupported` returns false -- falls back to Shopify native AR
- Desktop: `navigator.xr` undefined -- button hidden

---

## FEATURE 9: PostMessage Iframe Communication

**Status**: COMPLETE (100%)

### Messages (see Key Technical Patterns section above for full spec)

### Cart Data Structure
On add-to-cart, the configurator sends:
- Configuration ID: `config_${Date.now()}_${random}`
- Full `meshCustomizations` map
- Per-part visible cart properties (e.g., "Part 1: SeatCushion: Ocean Blue")
- Hidden properties prefixed with `_`
- Preview image (base64 JPEG)

### Configurator-Loader (configurator-loader.js)
- API_BASE: `https://iani-configurator-1.onrender.com`
- CONFIGURATOR_BASE: `https://iani-configurator.vercel.app`
- Saves configuration to API on add-to-cart
- Stores prices in localStorage: `iani_cart_prices`
- Builds iframe with full permissions: camera, microphone, xr-spatial-tracking, etc.

---

## FEATURE 10: Theme Extension (Shopify App Block)

**Status**: COMPLETE (95%)

### Display Modes
1. **Inline**: Iframe embedded at configurable height
2. **Modal**: Click-to-open overlay

### Merchant Settings (Theme Editor)
- configurator_url, display_mode, auto_load, height/mobile_height, border_radius
- background_color, accent_color, loading_text_color
- show_fullscreen_button, button_text, debug_mode

### 3D Model Detection
- Extracts GLB/GLTF URL from Shopify product media automatically
- Falls back to admin-configured URL

---

## FEATURE 11: Cart Integration & Draft Orders

**Status**: COMPLETE (90%)

### Cart Preview Block
- Restores configured item prices from localStorage
- Hides internal `_Configuration ID` properties
- Shows preview images with green border
- Draft order creation with 30-minute expiration

### Known Issues
- API URLs hardcoded to Render (`https://iani-configurator-1.onrender.com`)
- RSD currency hardcoded in price regex
- localStorage-based pricing is client-side manipulable
- No rate limiting on draft order creation
- Draft order accepts any price (no server-side validation)

---

## FEATURE 12: Admin Dashboard

**Component**: `app._index.tsx`
**Status**: COMPLETE (95%)

- Stats: active products, total configurations, current plan, trial status
- 3-step onboarding checklist with progress bar
- Contextual upsell banners (Try-On for Free/Starter, Space AR for Pro)
- Quick actions: Add Product, View All, Manage Subscription

---

## FEATURE 13: Product Management (CRUD)

**Status**: COMPLETE (95%)

### Product List
- Table with thumbnail, status, color/material counts, base price
- Row click navigates to edit; handles multiple product ID formats

### Add Product (4-step wizard)
1. Select from Shopify catalog (first 100 products, filters already-configured)
2. Set display name and base price
3. Define color options (name, hex, price)
4. Define material options (name, description, extra cost)
- Plan limit enforcement server-side

### Edit Product
- Sections: Basic, Colors, Materials, Virtual Try-On
- Calibration opens in new window
- Delete with confirmation modal
- Error boundary for graceful error display
- Colors/materials deleted and recreated on save (not updated in place)

---

## FEATURE 14: Billing & Subscription

**Status**: COMPLETE (90%)

### Server Functions
- `getOrCreateShop(domain)` -- creates with free plan if not exists
- `getShopSubscription(domain)` -- returns plan + trial + active status
- `updateShopSubscription(domain, plan, subId, trialDays=14)` -- upserts with trial
- `cancelShopSubscription(domain)` -- reverts to free
- `canAddProduct(domain)` -- checks count vs limit
- `hasFeatureAccess(domain, feature)` -- core access control
- `createBillingSubscription(admin, plan, returnUrl)` -- GraphQL mutation
- `getCurrentSubscription(admin)` -- queries active subs
- `cancelBillingSubscription(admin, subId)` -- GraphQL cancel

### UI
- 4 plans side-by-side, trial status display
- Dev mode: manual plan switching for custom apps
- Handles `charge_id` callback from Shopify billing

---

## FEATURE 15: Analytics Dashboard

**Status**: NOT IMPLEMENTED (0%)

- No `app.analytics.tsx` route file exists
- Feature flag `analytics` is `false` for ALL plans (including Business)
- Dashboard upsell banner references analytics but links to non-existent route
- NavMenu does not include Analytics link

---

## FEATURE 16-20: See detailed notes in previous sections

---

## FEATURE 21: Read-Only Configuration Viewer

**Component**: `ThreeSceneMinimal.vue`
**Status**: COMPLETE (100%)

- Activated via `?readonly=true&configId=...` URL params
- Loads saved configuration from API, applies mesh customizations to model
- Shows configuration summary sidebar (each customized part with color dot)
- Click part names in sidebar to highlight corresponding mesh on model
- Displays saved total price (not recalculated)
- Hides Add to Cart and customization controls

---

## FEATURE 22: Multi-Client Service

**Component**: `src/services/shopifyService.ts` (~676 lines)
**Status**: COMPLETE (90%)

- `MultiClientShopifyService` class instantiated as singleton
- Detects client from URL params, loads static configs or auto-generates
- Static configs: ianii (RSD), demo-furniture (USD), luxury-living (EUR)
- Methods: `getVariantByColor()`, `getPriceByColor()`, `saveConfiguration()`, `addToCart()`, `generateConfigurationUrl()`, `generateShareableUrl()`
- PostMessage bridge via `sendToShopify()` and `isEmbeddedInShopify()`

---

## CROSS-CUTTING CONCERNS

### Security Assessment

| Layer | Auth Method | Status |
|---|---|---|
| Admin Routes (app.*) | Shopify OAuth | Secured |
| Webhook Routes | Shopify webhook signature | Secured |
| Public API Routes (api.*) | None | NOT SECURED |
| Theme Extension | Client-side only | NOT SECURED |

### Hardcoded Values Inventory

| Value | Location | Should Be |
|---|---|---|
| `https://iani-configurator.vercel.app` | shopifyService.ts, products.$id.tsx, configurator-loader.js | Environment variable |
| `https://iani-configurator-1.onrender.com` | configurator-loader.js, ThreeSceneMinimal.vue (loadProductConfig, loadSavedConfiguration) | Environment variable |
| Color options (6 colors with prices) | ThreeSceneMinimal.vue, api.product-config defaults | Fully from admin config API |
| Material options (4 materials) | ThreeSceneMinimal.vue, api.product-config defaults | Fully from admin config API |
| Pillow options (4 styles) | ThreeSceneMinimal.vue | From admin config |
| Leg options (4 styles) | ThreeSceneMinimal.vue | From admin config |
| Base price $299.99 | ThreeSceneMinimal.vue, shopifyService.ts | From Shopify product data |
| Model list (4 models) | ThreeSceneMinimal.vue | Dynamic from admin |
| Plan prices ($0/$19/$49/$99) | billing.server.ts | Configurable |
| Trial duration (14 days) | billing.server.ts | Configurable |
| support@iani-configurator.com | privacy.tsx | Environment variable |

### Deprecated / Legacy Components

| Component | Status | Action Needed |
|---|---|---|
| `ThreeSceneModal.vue` (~737 lines) | Legacy modal with placeholder cube | Remove or archive |
| `AdminTryOnTest.vue` (~141 lines) | Superseded by AdminCalibrateTryOn | Remove or archive |
| `CustomizationOption` (Prisma model) | Deprecated, unused | Remove from schema |
| `app.additional.tsx` | Template placeholder with broken imports | Delete |

### Code Quality Metrics

| Aspect | Score (1-10) | Notes |
|---|---|---|
| **Feature Completeness** | 9 | Most features work; Analytics missing |
| **Code Organization** | 5 | ThreeSceneMinimal.vue is 3614 lines (should be split) |
| **Type Safety** | 3 | No TypeScript in ThreeSceneMinimal despite complex data |
| **Error Handling** | 6 | Good in some areas, missing in API JSON parsing |
| **Input Validation** | 4 | Missing on most public endpoints |
| **Security** | 4 | Admin routes secured, all public APIs open |
| **Test Coverage** | 1 | No test files found |
| **Performance** | 6 | No obvious bottlenecks |
| **Maintainability** | 5 | Large monolithic components, hardcoded values |
