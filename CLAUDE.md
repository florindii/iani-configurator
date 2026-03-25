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

---

# PART 3: DETAILED FEATURE ANALYSIS REPORT

**Analysis Date**: March 2026
**Purpose**: Research-grade assessment of every implemented feature -- completeness, implementation quality, technical details, and known issues.

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
| 8 | Space AR (Shopify Native) | COMPLETE | 100% | 3d-configurator.liquid, Shopify Scene Viewer |
| 9 | PostMessage Iframe Protocol | COMPLETE | 100% | ThreeSceneMinimal.vue, configurator-loader.js |
| 10 | Theme Extension (App Block) | COMPLETE | 95% | 3d-configurator.liquid, configurator-loader.js |
| 11 | Cart Integration & Draft Orders | COMPLETE | 90% | cart-preview.liquid, api.cart.add, api.draft-order |
| 12 | Admin Dashboard | COMPLETE | 95% | app._index.tsx |
| 13 | Product Management (CRUD) | COMPLETE | 95% | app.products.*.tsx |
| 14 | Billing & Subscription System | COMPLETE | 90% | app.billing.tsx, billing.server.ts |
| 15 | Analytics Dashboard | NOT IMPLEMENTED | 0% | -- |
| 16 | Configuration Save/Load API | COMPLETE | 90% | api.save-configuration, api.get-configuration |
| 17 | Preview Image System | COMPLETE | 85% | api.upload-preview, api.preview-image |
| 18 | GDPR Compliance | PARTIAL | 70% | api.gdpr.tsx, privacy.tsx |
| 19 | Webhook Handlers | COMPLETE | 90% | webhooks.*.tsx |
| 20 | Database Schema | COMPLETE | 90% | schema.prisma |

**Overall Project Completion: ~87%**

---

## FEATURE 1: 3D Model Loading & Rendering

**Component**: `src/components/ThreeSceneMinimal.vue` (~2200 lines)
**Status**: COMPLETE (100%)

### How It Works
- Uses Three.js `GLTFLoader` to load `.glb` models from multiple sources with a priority chain:
  1. Product config API URL (fetched from `/api/product-config/:productId`)
  2. Full URL passed via URL params
  3. Model filename param (resolved against `/public/models/`)
  4. Dropdown selection from available models list
- On load, the system auto-calculates the bounding box of the model and positions the camera intelligently based on model dimensions
- Supports dynamic model switching via a dropdown UI (selectable: `officeChair.glb`, `Couch.glb`, `low-poly_akmsu.glb`, `check.glb`)
- Creates a fallback clickable sofa geometry if the primary model fails to load
- Scene setup: PerspectiveCamera (FOV 50), ambient + directional lighting, WebGLRenderer with antialiasing

### Technical Details
- Camera field of view: 50 degrees (hardcoded)
- Default model: `officeChair.glb`
- Model analysis on load: traverses all meshes, clones materials to prevent shared mutation (forces new UUIDs), assigns part types heuristically via name pattern matching (e.g., "cushion", "frame", "leg", "arm")
- Part type detection uses regex patterns: may miss models with non-standard naming conventions

### Error Handling
- try/catch around model loading with fallback geometry creation
- Console logging for debugging (95+ log statements throughout component)

### Known Issues
- Available models list is hardcoded (assumes specific files exist in `/public/models/`)
- Part assignment is heuristic-based (pattern matching on mesh names) -- may misclassify parts on unfamiliar models
- Component is monolithic at ~2200 lines -- difficult to maintain

---

## FEATURE 2: OrbitControls (Rotate/Zoom/Pan)

**Component**: `src/components/ThreeSceneMinimal.vue`
**Status**: COMPLETE (100%)

### How It Works
- Three.js `OrbitControls` instantiated with damping enabled (dampingFactor: 0.05) for smooth inertia
- Min/max zoom distance calculated dynamically based on loaded model's bounding box dimensions
- Polar angle range: 0 to 180 degrees (full vertical rotation permitted)
- Auto-updates camera target when model changes
- Controls: left-click drag to rotate, scroll wheel to zoom, right-click/two-finger drag to pan

### Technical Details
- Damping creates smooth deceleration when user releases drag
- Distance limits prevent zooming inside or too far from the model
- Controls update on each animation frame via `controls.update()` in render loop

---

## FEATURE 3: Color Customization (Per-Mesh)

**Component**: `src/components/ThreeSceneMinimal.vue`
**Status**: COMPLETE (100%)

### How It Works
- **Preset Swatches**: 6 hardcoded color options with names and prices:
  - Ocean Blue (#1E90FF, $0), Crimson Red (#DC143C, $20), Forest Green (#228B22, $15), Chocolate Brown (#8B4513, $10), Royal Purple (#7851A9, $25), Sunset Orange (#FF6347, $15)
- **Custom Hex Picker**: Native HTML5 color input for arbitrary colors
- **Per-Mesh Application**: Clicking a 3D model part selects that specific mesh. Color changes apply ONLY to the selected part via `material.color.setHex()`
- **Data Tracking**: `meshCustomizations` reactive object stores per-mesh state: `{ "meshName": { colorHex, colorName, price, type, partType } }`

### Technical Details
- Material cloning ensures each mesh has its own material instance (prevents color bleeding between parts)
- Real-time application: no render delay, color updates immediately on click
- Each color carries a price modifier added to the total

### Known Issues
- Color options are hardcoded in the frontend, not fetched from the admin-configured options
- Custom hex colors have no price modifier (always $0 extra)

---

## FEATURE 4: Material Selection

**Component**: `src/components/ThreeSceneMinimal.vue`
**Status**: COMPLETE (95%)

### How It Works
- 4 frame material options with pricing: Oak Wood ($0), Walnut ($50), Metal Frame ($75), White Oak ($25)
- Material properties applied: roughness, metalness values per material type
- Applied only to the currently selected/clicked mesh
- UI only appears after clicking a model part classified as "frame" type

### Technical Details
- Material properties map defines roughness/metalness per material name
- Extra cost tracked per selection and added to total price
- Applied via `material.roughness` and `material.metalness` property updates

### Missing (5%)
- Material UI only visible after clicking a part -- not immediately discoverable
- Limited to "frame" classified parts only; other part types cannot have material changes
- Material options hardcoded in frontend rather than fetched from admin configuration

---

## FEATURE 5: Dynamic Pricing Engine

**Component**: `src/components/ThreeSceneMinimal.vue`
**Status**: COMPLETE (100%)

### How It Works
- **Base Price**: Fetched from Shopify product context or defaults to $299.99
- **Extra Costs** aggregated from:
  - Per-mesh color customization prices
  - Frame material extra cost
  - Pillow style extra cost
  - Leg style extra cost
- **Formula**: `calculatedPrice = basePrice + totalExtraCost`
- **Display**: Shows crossed-out base price alongside final price when extras exist
- **Currency Support**: 25+ currencies with proper locale formatting (USD, EUR, GBP, JPY, RSD, etc.)

### Technical Details
- `totalExtraCost` is a Vue computed property that sums all active customization prices
- Currency formatting uses `Intl.NumberFormat` with currency-specific locale mappings
- Price updates are reactive -- change instantly when any customization changes

---

## FEATURE 6: Virtual Try-On (Face AR)

**Component**: `src/components/VirtualTryOn.vue` (~1200 lines), `src/services/faceTrackingService.ts` (~330 lines)
**Status**: COMPLETE (95%)

### How It Works

#### Face Detection Pipeline
1. `faceTrackingService.ts` initializes MediaPipe Face Mesh (loaded from CDN: `cdn.jsdelivr.net/npm/@mediapipe/face_mesh/`)
2. Configuration: maxNumFaces=1, refineLandmarks=true, minDetectionConfidence=0.5
3. Extracts 468 face landmarks per frame, with key points for:
   - Eye corners and centers (glasses bridge positioning)
   - Nose bridge (vertical alignment)
   - Forehead (for hat placement)
   - Ears (for earring placement)
   - Chin and face oval (rotation calculation)

#### Glasses Positioning Algorithm
1. Face landmarks converted from normalized (0-1) coordinates to Three.js world coordinates
2. Eye positions calculated as midpoint between eye_outer and eye_inner landmarks
3. Glasses centered between both eyes
4. Eye distance used for scaling: `targetGlassesWidth = eyeDistance * 2.2`
5. Base lens offset: 35% of eye distance
6. Custom offsets applied: `customOffset = (offsetY / 100) * eyeDistance`
7. Custom scale multiplied: `finalScale = baseScale * customScaleMultiplier`

#### Head Rotation Tracking
- Extracts pitch (up/down), yaw (left/right), roll (tilt) from face landmark geometry
- Applied to glasses model with dampened multipliers to reduce jitter:
  - Pitch: `-rotation.pitch * 0.3`
  - Yaw: `-rotation.yaw * 0.6` (inverted for mirrored selfie view)
  - Roll: `rotation.roll * 0.5`

#### Camera System
- Uses PerspectiveCamera with very low FOV (10 degrees) instead of true OrthographicCamera
- Rationale: low FOV gives near-orthographic look while preserving depth for temple arms extending backward
- Documented decision in code comments

#### Color Synchronization
- Props receive `colorOptions` array and `selectedColor` from parent configurator
- `applyColorToModel()` traverses all meshes and updates material colors
- Watches for parent-initiated color changes reactively

#### Photo Capture & Download
- `combineVideoAndModel()` composites mirrored video feed + 3D glasses overlay onto single canvas
- JPEG quality: 0.9
- Auto-generated filename with timestamp
- Triggers browser download dialog

### Technical Details
- WebGL renderer uses `preserveDrawingBuffer: true` for screenshot capability
- Camera near plane: 1, far plane: 5000
- Fallback: creates simple geometric glasses if GLB model fails to load
- Resource cleanup: proper disposal of Three.js objects and camera stream on unmount

### Debug Features
- `DEBUG_SHOW_EYE_MARKERS = false` (green spheres at eye positions, hidden by default)
- Extensive console logging throughout pipeline

### Known Issues (5% incomplete)
- Temple length edge case: camera near-plane clipping on extreme face angles
- Error messages for camera denial explain iframe permission requirements
- No true OrthographicCamera (uses low-FOV perspective instead -- documented tradeoff)

---

## FEATURE 7: Try-On Calibration System

**Components**: `src/components/AdminCalibrateTryOn.vue` (~550 lines), `src/components/AdminTryOnPreview.vue` (~150 lines), `src/components/AdminTryOnTest.vue` (~140 lines)
**Status**: COMPLETE (100%)

### How It Works

#### Calibration UI (AdminCalibrateTryOn.vue)
- **Real-time sliders**:
  - Vertical position: -50% to +50% (negative = move glasses up)
  - Scale: 0.5x to 2.0x in 0.05 increments
- **Live preview**: Embeds VirtualTryOn component with hidden controls for real-time feedback
- **Preset buttons**:
  - Reset to defaults (offsetY=0, scale=1.0)
  - Narrow face preset (offsetY=-2, scale=0.85)
  - Wide face preset (offsetY=2, scale=1.15)
- **Help tips**: UX guidance text for merchants
- **Save mechanism**: Posts `CALIBRATION_SAVED` message to parent admin window with productId, offsetY, scale
- **Unsaved changes detection**: Confirms before closing if values changed

#### Admin Preview (AdminTryOnPreview.vue)
- Shows live try-on preview in admin product editor
- Receives modelUrl, offsetY, scale, tryOnType as props
- Hides UI controls via `:deep()` CSS scoping
- Auto-starts try-on on mount, watches for prop changes

#### Admin Test (AdminTryOnTest.vue)
- Full-screen try-on test window (legacy component)
- Receives `UPDATE_TRYON_SETTINGS` messages from parent for live slider updates
- Appears to be superseded by AdminCalibrateTryOn

### Integration with Admin
- Product edit page (`app.products.$id.tsx`) opens calibration in a new window
- Calibration URL: hardcoded to `https://iani-configurator.vercel.app?admin-calibrate=true&...`
- Results sent back via PostMessage and saved to Product3D record (tryOnOffsetY, tryOnScale)

---

## FEATURE 8: Space AR (Dual Implementation)

**Status**: COMPLETE (100%)

### Implementation A: Shopify Native AR (Scene Viewer / AR Quick Look)
**Mechanism**: Shopify's built-in 3D/AR system
**Works on**: Any theme with `<model-viewer>` support (e.g., Dawn)

1. Merchant uploads GLB model as Shopify product media
2. Theme extension detects 3D models (`3d-configurator.liquid` lines 249-262)
3. Shopify renders "View in your space" button automatically on mobile
4. Launches Google Scene Viewer (Android) or AR Quick Look (iOS)

**Verified working** on ianii.myshopify.com -- office chair placed in real room via camera.

**Limitation**: Shows the BASE model only, not the user's customized colors/materials.

### Implementation B: Custom WebXR (Three.js immersive-ar) -- NEW
**Mechanism**: WebXR Device API via Three.js `renderer.xr`
**Works on**: ARCore Android devices (Chrome), independent of Shopify theme
**Advantage**: Shows the CUSTOMIZED model with the user's selected colors and materials

#### How It Works
1. **Feature Gating**: `spaceArEnabled` checked via `hasFeatureAccess()` in `api.product-config.$productId.tsx` (Business plan only)
2. **Device Detection**: `navigator.xr.isSessionSupported('immersive-ar')` on mount -- button hidden if unsupported
3. **Iframe Permission**: `xr-spatial-tracking` added to iframe `allow` attribute in `configurator-loader.js`
4. **"View in Your Space" Button**: Appears in cart section between Try-On and Add to Cart
5. **AR Session Launch** (`startArSession()`):
   - Saves scene state (background, controls, model visibility)
   - Sets `scene.background = null` for camera passthrough
   - Clones the model with `model.clone(true)` -- shares materials, so all color/material customizations carry over
   - Auto-scales model to ~1 meter (largest dimension) for real-world proportions
   - Centers and grounds the model on its container
   - Requests `immersive-ar` session with `hit-test` required feature and optional `dom-overlay`
6. **Surface Detection**: Hit-test runs each frame, positions a white reticle ring on detected surfaces
7. **Tap-to-Place**: `select` event places the model at the reticle position
8. **Gesture Controls** (DOM overlay buttons):
   - Rotate left/right (45-degree increments)
   - Scale bigger/smaller (clamped 0.25x to 4x)
   - Tap to reposition
9. **Session End**: Restores scene background, re-enables OrbitControls, shows original model, cleans up AR objects

#### Technical Details
- Renderer: `renderer.xr.enabled = true` set in `initThreeJS()` (does not affect normal rendering)
- Animation loop: `renderer.setAnimationLoop(animate)` replaces `requestAnimationFrame` -- handles both normal and XR modes
- Callback signature: `(timestamp, frame)` where `frame` is null in normal mode, `XRFrame` during AR
- Reticle: `THREE.RingGeometry(0.15, 0.2, 32)` with `matrixAutoUpdate = false` (matrix set from hit-test pose)
- AR overlay: Fixed-position div with exit button, placement instructions, rotate/scale controls
- Cleanup: AR session ended in `onUnmounted`, animation loop stopped with `setAnimationLoop(null)`

#### Files Modified
- `src/components/ThreeSceneMinimal.vue` -- All WebXR logic, UI, styles
- `iani-configurator/extensions/theme-extension/assets/configurator-loader.js` -- `xr-spatial-tracking` permission
- `iani-configurator/app/routes/api.product-config.$productId.tsx` -- `spaceArEnabled` in API response

#### Device Compatibility
- **Android Chrome (ARCore)**: Full support
- **iOS Safari**: `isSessionSupported` returns false -- button hidden automatically (falls back to Shopify native AR if theme supports it)
- **Desktop browsers**: `navigator.xr` undefined -- button hidden automatically (Shopify serves the original uploaded model)

---

## FEATURE 9: PostMessage Iframe Communication Protocol

**Components**: `src/components/ThreeSceneMinimal.vue`, `extensions/theme-extension/assets/configurator-loader.js`
**Status**: COMPLETE (100%)

### Protocol Specification

#### Storefront to Iframe
| Message Type | Payload | When Sent |
|---|---|---|
| `IANI_INIT` | `{ productId, variantId, shop, currency, price, moneyFormat }` | After iframe sends IANI_READY |
| `IANI_CART_SUCCESS` | `{ item details from /cart/add.js }` | After successful cart addition |
| `IANI_CART_ERROR` | `{ message }` | If cart addition fails |

#### Iframe to Storefront
| Message Type | Payload | When Sent |
|---|---|---|
| `IANI_READY` | -- | On component mount |
| `IANI_ADD_TO_CART` | `{ colorName, colorHex, materialName, price, quantity, configuration, meshCustomizations, previewImage }` | User clicks "Add to Cart" |
| `IANI_TRYON_OPENED` | -- | User opens try-on mode |
| `IANI_TRYON_CLOSED` | -- | User closes try-on mode |
| `IANI_CLOSE` | -- | User closes modal |

### Security
- Origin validation present on both sides
- Configurator-loader validates against `(new URL(configuratorUrl)).origin`
- ThreeSceneMinimal checks `isEmbeddedInShopify()` before sending messages

### Cart Data Structure
On add-to-cart, the loader creates:
- Configuration ID: `config_${Date.now()}_${random}`
- Stores prices in localStorage: `iani_cart_prices`
- Shopify cart properties include: `_Configuration ID` (hidden), visible part customizations, material, price, and a deep-link URL to view the configuration

---

## FEATURE 10: Theme Extension (Shopify App Block)

**Files**: `extensions/theme-extension/blocks/3d-configurator.liquid`, `configurator-loader.js`, `configurator.css`
**Status**: COMPLETE (95%)

### How It Works

#### Display Modes
1. **Inline Mode**: Iframe embedded directly on product page at configurable height
2. **Modal Mode**: Click-to-open overlay with configurable trigger button

#### Merchant-Configurable Settings (via Shopify Theme Editor)
- `configurator_url`: Base URL (default: `https://iani-configurator.vercel.app`)
- `display_mode`: "inline" or "modal"
- `auto_load`: Auto-start or click-to-load
- `height` / `mobile_height`: Configurable dimensions
- `border_radius`: 0-24px
- `background_color`, `accent_color`, `loading_text_color`
- `show_fullscreen_button`: Toggle
- `button_text`: Custom trigger button text
- `debug_mode`: Enhanced logging

#### 3D Model Detection
- Automatically extracts GLB/GLTF model URL from Shopify product media
- Falls back to admin-configured model URL if no product media found

#### Accessibility & Responsiveness
- ARIA labels, semantic HTML
- `prefers-reduced-motion` support
- High contrast mode support
- 44px minimum touch targets on mobile
- Print-friendly (hidden on print)
- Safari-specific fixes
- CSS isolation via `isolation: isolate`

### Known Issues (5% incomplete)
- `debug_mode` setting exists in schema but not utilized in Liquid template
- Modal z-index uses maximum value (`2147483647`) -- could conflict with other theme overlays
- English-only localization (`en.default.json`)

---

## FEATURE 11: Cart Integration & Draft Orders

**Files**: `cart-preview.liquid`, `api.cart.add.tsx`, `api.draft-order.tsx`
**Status**: COMPLETE (90%)

### How It Works

#### Cart Preview Block (`cart-preview.liquid`)
- Restores configured item prices from localStorage on page load
- Hides internal "_Configuration ID" property from customer-facing cart display
- Shows preview images for configured products (green border indicator)
- Updates estimated total when cart quantity changes
- Intercepts checkout to create Shopify Draft Order with correct custom pricing
- Draft order lifecycle managed via localStorage with 30-minute expiration

#### Cart Add API (`api.cart.add.tsx`)
- Saves configuration to database with "in_cart" status
- Looks up Product3D by ID or shopifyProductId + shop
- Returns configuration with cart item structure

#### Draft Order API (`api.draft-order.tsx`)
- Creates Shopify draft order via GraphQL (`draftOrderCreate` mutation)
- Fetches variant prices from Shopify, applies price overrides for configured items
- Fetches shop currency from Shopify settings (falls back to USD)
- Returns draft order checkout URL

### Technical Details
- Configuration ID format: `config_${timestamp}_${random}` (regex: `/config_\d+_[a-z0-9]+/i`)
- Price override uses Shopify's `priceOverride` field with `variantId`
- Custom attributes properly formatted for Shopify API

### Known Issues (10% incomplete)
- Cart preview API URL hardcoded to `https://iani-configurator-1.onrender.com` (inconsistent with Vercel deployment)
- RSD currency hardcoded in price regex in cart-preview.liquid
- Dollar sign ($) hardcoded for price formatting (not shop-aware)
- localStorage-based pricing is client-side manipulable (not cryptographically signed)
- No rate limiting on draft order creation
- Draft order endpoint accepts any price including negative values (no server-side price validation)
- No retry logic for failed API saves

---

## FEATURE 12: Admin Dashboard

**Component**: `iani-configurator/app/routes/app._index.tsx`
**Status**: COMPLETE (95%)

### How It Works
- **Stats Display**: Active product count, total configurations, current plan, trial status
- **Onboarding Checklist** (3 steps with progress bar):
  1. Add your first 3D product
  2. Add the app block to your theme
  3. Preview your store
- **Contextual Upsell Banners**: Suggests Try-On upgrade for Free/Starter plans, Space AR for Pro
- **Quick Actions**: Add Product, View All Products, Manage Subscription
- **Setup Completion Tracking**: Progress persisted in Shop table (hasAddedAppBlock, hasPreviewedStore)

### Technical Details
- Loader authenticates via OAuth, fetches product/config counts, subscription status, onboarding flags
- Action handles "mark-app-block" and "mark-previewed" intents via POST (upserts Shop record)

### Known Issues (5% incomplete)
- Analytics upsell banner references analytics feature but route does not exist
- Trial countdown shows generic "Manage subscription" button instead of calculated remaining days

---

## FEATURE 13: Product Management (CRUD)

**Components**: `app.products._index.tsx`, `app.products.new.tsx`, `app.products.$id.tsx`
**Status**: COMPLETE (95%)

### Product List (`app.products._index.tsx`)
- Table columns: Product (with thumbnail), Status, Color Count, Material Count, Base Price
- Product images fetched from Shopify GraphQL API
- Row click navigates to edit page
- Handles multiple product ID formats (numeric, GID, URL) via `extractProductId()`

### Add Product (`app.products.new.tsx`)
- Step 1: Select from Shopify catalog (fetches first 100 products, filters already-configured)
- Step 2: Set display name and base price
- Step 3: Define color options (name, hex code, price)
- Step 4: Define material options (name, description, extra cost)
- Plan limit enforcement: `canAddProduct()` check server-side, returns 403 if exceeded
- Pre-fills with default colors and materials

### Edit Product (`app.products.$id.tsx`)
- Sections: Basic Settings, Color Options, Material Options, Virtual Try-On Settings
- Try-On calibration opens in new window (live camera tool)
- Toggle product active/inactive
- Delete product with confirmation modal
- Shop ownership verified on all actions
- Try-on feature gated behind Pro+ plan check

### Technical Details
- Color and material options are deleted and recreated on save (not updated in place)
- Supports both custom GLB URL and Shopify product media model
- Try-on settings: tryOnType dropdown, offsetY/scale from calibration tool

### Known Issues (5% incomplete)
- No hex code format validation (#RRGGBB)
- No duplicate color/material name validation
- No price range validation
- JSON parsing for colors/materials has no try-catch
- Calibration window PostMessage listener has no origin validation (potential XSS vector)
- Calibration URL hardcoded to Vercel production URL
- Hard delete (no soft delete) -- could lose order history
- Product table not paginated (could slow with hundreds of products)
- No sorting/filtering on product list

---

## FEATURE 14: Billing & Subscription System

**Components**: `app.billing.tsx`, `iani-configurator/app/billing.server.ts`
**Status**: COMPLETE (90%)

### Plan Configuration

| Plan | Price | Product Limit | tryOnEnabled | spaceArEnabled | watermark | analytics | prioritySupport |
|------|-------|---------------|-------------|----------------|-----------|-----------|-----------------|
| Free | $0/mo | 1 | false | false | true | false | false |
| Starter | $19/mo | 3 | false | false | true | false | false |
| Pro | $49/mo | Unlimited (-1) | true | false | false | false | false |
| Business | $99/mo | Unlimited (-1) | true | true | false | true | true |

### Server-Side Functions (`billing.server.ts`)

| Function | Purpose |
|---|---|
| `getOrCreateShop(domain)` | Creates Shop record with free plan if not exists |
| `getShopSubscription(domain)` | Returns plan + trial status + active flag |
| `updateShopSubscription(domain, plan, subId, trialDays)` | Updates/creates subscription with 14-day trial |
| `cancelShopSubscription(domain)` | Reverts to free plan, clears subscription |
| `canAddProduct(domain)` | Checks product count vs plan limit |
| `hasFeatureAccess(domain, feature)` | Core access control -- checks subscription active + feature flag |
| `createBillingSubscription(admin, plan, returnUrl)` | GraphQL `appSubscriptionCreate` mutation |
| `getCurrentSubscription(admin)` | Queries active subscriptions |
| `cancelBillingSubscription(admin, subId)` | GraphQL `appSubscriptionCancel` mutation |

### Billing UI (`app.billing.tsx`)
- 4 plans displayed side-by-side with feature comparison
- Shows current plan, trial status, trial end date
- "Upgrade" redirects to Shopify billing confirmation
- Dev mode fallback: manual plan switching for custom apps
- Handles `charge_id` callback from Shopify after purchase
- Success banner after subscription change

### Technical Details
- All paid plans include 14-day free trial
- Trial check: `trialEndsAt > now`
- Active check: `subscriptionStatus === "active" OR plan === "free"`
- Test mode flag: `NODE_ENV !== "production"`
- Feature gating used in routes via `hasFeatureAccess()` with redirect to billing page

### Known Issues (10% incomplete)
- `updateShopSubscription()` always sets 14-day trial even when called from webhook (should accept webhook data)
- Plan name detection in subscription webhook is fragile (uses `name.includes()`)
- Subscription status mapping may not cover all Shopify states (APPROVED, PENDING, DECLINED, EXPIRED, FROZEN, PAUSED vs internal "active" | "cancelled" | "frozen")
- No downgrade confirmation modal (paid to free)
- charge_id persists in URL after redirect -- success message shown on every reload
- Feature access changes require page refresh
- Plan prices hardcoded (no admin configuration)
- "Popular" badge hardcoded to Pro plan

---

## FEATURE 15: Analytics Dashboard

**Status**: NOT IMPLEMENTED (0%)

### Assessment
- Route file `app.analytics.tsx` does not exist in the filesystem
- Referenced in CLAUDE.md as "Business plan only" with: total configs, orders, conversion rate, revenue, top colors, top materials, per-product breakdown table, recent orders
- Feature flag exists in billing: `analytics: true` for Business plan
- `hasFeatureAccess(shop, "analytics")` function is available
- Analytics link removed from NavMenu (only Home, 3D Products, Preview, Subscription shown)
- Dashboard upsell banner references analytics but links to non-existent route

---

## FEATURE 16: Configuration Save/Load API

**Files**: `api.save-configuration.tsx`, `api.get-configuration.$id.tsx`, `api.products.$productId.configuration.tsx`, `api.configurations.$configId.tsx`
**Status**: COMPLETE (90%)

### Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /api/save-configuration` | POST | Save configuration from frontend (auto-creates Product3D if missing) |
| `GET /api/get-configuration/:id` | GET | Retrieve configuration by ID |
| `GET /api/products/:id/configuration` | GET | List last 10 configurations for a product |
| `POST /api/products/:id/configuration` | POST | Create new configuration |
| `PUT /api/configurations/:id` | PUT/PATCH | Update configuration status (draft/saved/in_cart/ordered/completed) |

### Data Structure
```json
{
  "configurationId": "uuid",
  "shop": "myshop.myshopify.com",
  "productId": "shopify-product-id",
  "colorName": "Ocean Blue",
  "colorHex": "#1E90FF",
  "materialName": "Walnut",
  "totalPrice": 349.99,
  "configuration": { "meshCustomizations": {...} },
  "status": "draft"
}
```

### Known Issues (10% incomplete)
- `api.save-configuration` auto-creates Product3D records with fake IDs if product doesn't exist -- allows junk data injection
- Duplicate endpoints: `api.save-configuration` and `api.products.*.configuration` overlap
- No authentication on any configuration endpoint (all public)
- Configuration IDs may be enumerable (privacy risk -- could expose other customers' data)
- Shop verification optional on status update endpoint
- No rate limiting on any endpoint
- configurationData stored without schema validation

---

## FEATURE 17: Preview Image System

**Files**: `api.upload-preview.tsx`, `api.preview-image.$id.tsx`
**Status**: COMPLETE (85%)

### How It Works
- Frontend captures 3D scene as base64 JPEG screenshot
- `POST /api/upload-preview` stores base64 data in `ConfigurationPreview` table
- `GET /api/preview-image/:id` serves stored image as binary with proper Content-Type
- Cache header: 1-year (`max-age=31536000`) for immutable images

### Known Issues (15% incomplete)
- **No file size limits**: accepts arbitrary base64 strings (database bloat risk)
- **Inefficient storage**: base64 is 33% larger than binary; should use S3/Cloudinary
- **Hardcoded return URL**: `https://iani-configurator-1.onrender.com/api/preview-image/${id}` (inconsistent with Vercel deployment)
- No authentication (anyone can fetch any preview by ID)
- No CORS headers on preview-image endpoint
- 90-day retention mentioned in privacy policy but no cleanup job implemented
- No image format/dimension validation

---

## FEATURE 18: GDPR Compliance

**Files**: `api.gdpr.tsx`, `privacy.tsx`
**Status**: PARTIAL (70%)

### Webhook Handlers (`api.gdpr.tsx`)

| Webhook | Implementation |
|---|---|
| `CUSTOMERS_DATA_REQUEST` | Finds customer configurations, **logs them only** (no actual data export to customer) |
| `CUSTOMERS_REDACT` | Hard deletes all customer configurations from database |
| `SHOP_REDACT` | Hard deletes all shop data: configurations, options, products, sessions |

### Privacy Policy (`privacy.tsx`)
- Static page covering: data collection, usage, 90-day retention, GDPR rights
- Contact email: support@iani-configurator.com (hardcoded)
- Dynamic copyright year

### Known Issues (30% incomplete)
- **Data export not implemented**: CUSTOMERS_DATA_REQUEST only logs data, doesn't email or generate downloadable file for the customer
- **Schema mismatch in shop redact**: Code attempts to delete `customizationOption` (legacy model) but actual schema uses `colorOption` and `materialOption` -- shop redact will likely fail or skip color/material cleanup
- **90-day retention not enforced**: Privacy policy claims 90-day data retention but no cleanup job or cron exists
- All deletes are hard deletes (no audit trail)
- Support email may not be active

---

## FEATURE 19: Webhook Handlers

**Files**: `webhooks.app.uninstalled.tsx`, `webhooks.app.scopes_update.tsx`, `webhooks.app.subscriptions-update.tsx`
**Status**: COMPLETE (90%)

### Handlers

| Webhook | Action |
|---|---|
| `APP_UNINSTALLED` | Calls `cancelShopSubscription()`, deletes session records |
| `SCOPES_UPDATE` | Updates session scope with new permissions |
| `APP_SUBSCRIPTIONS_UPDATE` | Parses subscription name to determine plan, updates Shop record |

### Known Issues (10% incomplete)
- **Subscription plan detection fragile**: Uses `name.includes("business")` -- could match false positives (e.g., "Pro + Business Bundle" matches "business")
- **Scope storage**: Converts array via `toString()` -- parsing back to array could be fragile
- **Status mapping incomplete**: Treats "cancelled", "declined", "expired" uniformly (all downgrade to free)
- No trial end date from webhook data (hardcoded 14 days on initial subscription only)

---

## FEATURE 20: Database Schema

**File**: `iani-configurator/prisma/schema.prisma`
**Status**: COMPLETE (90%)

### Models Summary

| Model | Records | Purpose | Indexed Fields |
|---|---|---|---|
| Session | Per OAuth session | Shopify auth tokens | shop (implicit) |
| Shop | Per merchant | Billing state, plan, onboarding flags | shopDomain (unique) |
| Product3D | Per configured product | 3D product settings, try-on config | shopifyProductId+shop (unique) |
| ColorOption | Per color per product | Color swatches with pricing | product3DId |
| MaterialOption | Per material per product | Material choices with extra cost | product3DId |
| ProductConfiguration | Per customer config | Saved configurations with status | product3DId, shop, customerEmail, shopifyCustomerId, shopifyOrderId, status |
| ConfigurationPreview | Per preview image | Base64 image storage | shop |
| CustomizationOption | Legacy | Deprecated, unused | product3DId |

### Design Strengths
- Foreign key constraints with cascade deletion (delete product deletes all children)
- Proper indexing for common query patterns
- JSON field (configurationData) for flexible extension
- Unique constraints prevent duplicate products per shop

### Known Issues (10% incomplete)
- `CustomizationOption` model is deprecated but still in schema (dead code)
- No audit log / timestamp tracking for status changes on configurations
- No multi-currency pricing support in schema
- No unique constraint on ProductConfiguration to prevent duplicate orders
- ConfigurationPreview uses string ID (concatenation risk)
- meshCustomizations stored inside configurationData JSON (no structured querying)
- No `description` or `tags` on Product3D for product discovery

---

## CROSS-CUTTING CONCERNS

### Security Assessment

#### Authentication Summary
| Layer | Auth Method | Status |
|---|---|---|
| Admin Routes (app.*) | Shopify OAuth | Secured |
| Webhook Routes | Shopify webhook signature | Secured |
| Public API Routes (api.*) | None | NOT SECURED |
| Theme Extension | Client-side only | NOT SECURED |

#### High-Priority Security Issues
1. **api.save-configuration**: Auto-creates Product3D records with arbitrary IDs -- allows database pollution
2. **api.preview-image & api.get-configuration**: No auth, enumerable IDs -- customer data exposure risk
3. **app.products.$id.tsx**: PostMessage listener for calibration results has no origin validation
4. **api.draft-order**: Accepts any price including negative values
5. **localStorage-based pricing**: Client-side manipulable, not signed

#### Medium-Priority Security Issues
6. **api.configurations.$configId**: Shop verification is optional (X-Shop-Domain header)
7. **api.upload-preview**: No file size limits (database bloat vector)
8. **vercel.json**: CORS `Access-Control-Allow-Origin: *` and `frame-ancestors: *` are overly permissive
9. **api.gdpr.tsx**: Schema mismatch could cause shop_redact to fail silently

### Code Quality Metrics

| Aspect | Score (1-10) | Notes |
|---|---|---|
| **Feature Completeness** | 9 | Most features work; Analytics dashboard missing |
| **Code Organization** | 5 | ThreeSceneMinimal.vue is 2200+ lines (should be split) |
| **Type Safety** | 3 | No TypeScript in Vue components despite complex data |
| **Error Handling** | 6 | Good in some areas, missing in API JSON parsing |
| **Input Validation** | 4 | Missing on most public endpoints |
| **Security** | 4 | Admin routes secured, all public APIs open |
| **Documentation** | 7 | Extensive console logging, CLAUDE.md thorough |
| **Test Coverage** | 1 | No test files found in repository |
| **Performance** | 6 | No obvious bottlenecks, but no optimization either |
| **Maintainability** | 5 | Large monolithic components, hardcoded values |

### Hardcoded Values Inventory

| Value | Location | Should Be |
|---|---|---|
| `https://iani-configurator.vercel.app` | configurator-loader.js, products.$id.tsx, 3d-configurator.liquid | Environment variable |
| `https://iani-configurator-1.onrender.com` | cart-preview.liquid, upload-preview.tsx | Environment variable |
| Color options (6 colors) | ThreeSceneMinimal.vue | Fetched from admin config API |
| Material options (4 materials) | ThreeSceneMinimal.vue | Fetched from admin config API |
| Base price $299.99 | shopifyService.ts | From Shopify product data |
| Model list (4 models) | ThreeSceneMinimal.vue | Dynamic from admin |
| Plan prices ($0/$19/$49/$99) | billing.server.ts | Configurable |
| Trial duration (14 days) | billing.server.ts | Configurable |
| support@iani-configurator.com | privacy.tsx | Environment variable |

### Deprecated / Legacy Components

| Component | Status | Action Needed |
|---|---|---|
| `ThreeSceneModal.vue` | Older, simpler version with placeholder cube geometry | Remove or archive |
| `AdminTryOnTest.vue` | Superseded by AdminCalibrateTryOn | Remove or archive |
| `CustomizationOption` (Prisma) | Deprecated model, unused | Remove from schema |
| `app.additional.tsx` | Shopify template placeholder with broken imports | Delete |
| `app.configurator.tsx` | Partially orphaned, overlaps with product routes | Integrate or remove |

---

## RESEARCH CONCLUSIONS

### What Is Production-Ready
1. **3D Configurator Core**: Model loading, rendering, OrbitControls, color/material customization, pricing -- all solid
2. **Virtual Try-On (Face AR)**: Sophisticated MediaPipe + Three.js pipeline with calibration system -- genuinely innovative
3. **Space AR**: Fully working via Shopify's native Scene Viewer/AR Quick Look integration -- zero custom code needed
4. **Shopify Admin App**: Dashboard, product CRUD, billing -- functional and complete
5. **Theme Extension**: Well-built App Block with good merchant customization options
6. **PostMessage Protocol**: Robust bidirectional communication between iframe and storefront

### What Needs Work Before Production
1. **Analytics**: Route missing entirely -- implement or remove from plan features
2. **API Security**: All public endpoints lack authentication and rate limiting
3. **Input Validation**: Missing on most API endpoints
4. **GDPR Data Export**: Only logs data, doesn't actually export to customer
5. **Test Coverage**: Zero automated tests
6. **Hardcoded URLs**: Production URLs scattered across codebase instead of environment variables
7. **Space AR Limitation**: AR view shows base model, not customized colors/materials

### What Is Technically Impressive
1. **Per-mesh color customization**: Clicking individual 3D model parts and applying colors independently
2. **Face tracking pipeline**: MediaPipe to Three.js coordinate conversion with dampened rotation
3. **Calibration system**: Real-time offset/scale adjustment with live camera preview
4. **Draft order integration**: Custom pricing flow through Shopify's GraphQL API
5. **Multi-source model loading**: Priority chain from API config to URL params to local files
