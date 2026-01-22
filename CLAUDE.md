# Iani 3D Configurator - Complete Project Knowledge Base

---

# PART 1: DEVELOPMENT REFERENCE

## Project Overview

**Project**: Iani 3D Configurator
**Type**: Shopify App for 3D product customization (Glasses)
**Current State**: 85% complete
**Stack**: Vue.js 3 + Three.js + TypeScript + Vite
**Deployment**: Vercel (Frontend) + Shopify (Theme Extension)

---

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Development server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
```

---

## Architecture

```
iani-configurator/
├── src/
│   ├── components/
│   │   ├── ThreeSceneMinimal.vue    # Main 3D configurator
│   │   └── VirtualTryOn.vue         # AR try-on with face tracking
│   ├── services/
│   │   ├── shopifyService.ts        # Shopify cart integration
│   │   └── faceTrackingService.ts   # MediaPipe face detection
│   ├── App.vue
│   └── main.ts
├── iani-configurator/               # Shopify Remix Admin App
│   ├── app/routes/
│   ├── prisma/
│   └── extensions/
├── public/models/                   # 3D GLB models
├── dist/                            # Production build
└── vercel.json
```

---

## Development Progress: 88%

### Completed Features ✅

| Feature | File Location | Notes |
|---------|---------------|-------|
| **3D Configurator** | | |
| 3D Model Rendering | `ThreeSceneMinimal.vue` | Three.js GLB loader |
| 360° Rotation | `ThreeSceneMinimal.vue` | OrbitControls (zoom, pan, rotate) |
| Color Customization | `ThreeSceneMinimal.vue` | 6 presets + custom picker |
| Material Selection | `ThreeSceneMinimal.vue` | Frame materials with pricing |
| Dynamic Pricing | `ThreeSceneMinimal.vue` | Real-time calculation |
| **AR - Virtual Try-On (Face)** | | |
| Face Tracking | `faceTrackingService.ts` | MediaPipe Face Mesh |
| Glasses Overlay | `VirtualTryOn.vue` | Real-time face positioning |
| Head Rotation Following | `VirtualTryOn.vue` | Pitch, yaw, roll tracking |
| Color Change in AR | `VirtualTryOn.vue` | Switch colors while trying on |
| Photo Capture | `VirtualTryOn.vue` | Save preview for cart |
| Photo Download | `VirtualTryOn.vue` | Download to device |
| **AR - View in Room (Space)** | | |
| Place in Environment | `ThreeSceneMinimal.vue` | WebXR / native AR |
| Furniture Support | | Sofas, chairs, tables, etc. |
| Real-world Scale | | Accurate product sizing |
| **E-commerce** | | |
| Cart Integration | `shopifyService.ts` | PostMessage to Shopify |
| Mobile Responsive | All components | Full mobile support |
| Vercel Deployment | `vercel.json` | Auto-deploy configured |

### Remaining Features (12%)

| Feature | Priority | Effort | Status |
|---------|----------|--------|--------|
| Theme App Extension | CRITICAL | Medium | 🔄 In Progress |
| PostgreSQL Database | HIGH | Low | ❌ Pending |
| GDPR Compliance | HIGH | Low | ❌ Pending |
| App Store Submission | HIGH | Medium | ❌ Pending |
| Green dot removal (try-on) | LOW | Trivial | ❌ Debug markers |

---

## Key Technical Details

### AR Features (Dual AR System)

**1. Virtual Try-On (Face AR)** - For wearables (glasses, jewelry)
- **Camera**: OrthographicCamera (no perspective distortion)
- **Face Detection**: MediaPipe Face Mesh via CDN
- **Positioning**: Eye landmarks for glasses placement
- **Rotation**: `model.rotation.y = Math.PI` (facing user)
- Photo capture and download support
- Real-time color changes while trying on

**2. View in Room (Space AR)** - For furniture/home decor
- **Technology**: WebXR / native device AR
- **Use case**: Place sofas, chairs, tables in real environment
- **Features**: Real-world scale, surface detection
- Works on AR-capable mobile devices

This **dual AR approach** is a key differentiator - competitors typically only offer one type of AR.

### Important Code Patterns

```typescript
// Color application to 3D model
model.traverse((child) => {
  if (child.isMesh && child.material) {
    child.material.color.set(hexColor)
  }
})

// Face coordinates to Three.js (VirtualTryOn.vue:611)
function faceToThreeJS(faceX: number, faceY: number) {
  const pixelX = faceX * canvasWidth
  const pixelY = faceY * canvasHeight
  const worldX = pixelX - canvasWidth / 2
  const worldY = -(pixelY - canvasHeight / 2)
  return { x: worldX, y: worldY }
}
```

### Shopify Cart Integration
```javascript
window.parent.postMessage({
  type: 'ADD_TO_CART',
  variantId: '...',
  configuration: { color, material, ... }
}, '*')
```

---

## File Quick Reference

| Purpose | Location |
|---------|----------|
| Main 3D configurator | `src/components/ThreeSceneMinimal.vue` |
| Virtual try-on | `src/components/VirtualTryOn.vue` |
| Face tracking | `src/services/faceTrackingService.ts` |
| Shopify service | `src/services/shopifyService.ts` |
| 3D models | `public/models/IANI_Glasses.glb` |
| Build output | `dist/` |

---

## Commands Reference

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npx vercel --prod --yes        # Deploy to Vercel

# Shopify App (from iani-configurator/)
npm run dev                    # Start with tunnel
shopify app deploy             # Deploy app
npx prisma studio              # View database

# Git
git add . && git commit -m "message" && git push
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Temples spread/distorted | Use OrthographicCamera, not PerspectiveCamera |
| Temples clipped/short | Remove clipping plane configuration |
| Face tracking not working | Check HTTPS, camera permissions, MediaPipe CDN |
| Model not loading | Check CORS, verify GLB file, check console |
| Colors not applying | Ensure material has `.color` property |

---

## Recent Changes (January 2025)

- Fixed glasses temple orientation in Virtual Try-On
- Switched to OrthographicCamera for proper 2D rendering
- Removed clipping plane to show full temple length
- Implemented Virtual Try-On with MediaPipe face tracking
- Added photo capture and download functionality

---

## Next Development Steps

1. **Remove debug eye markers** - Set `DEBUG_SHOW_EYE_MARKERS = false`
2. **Complete Theme App Extension** - Required for Shopify App Store
3. **Set up PostgreSQL** - Replace SQLite (use Neon.tech)
4. **Implement GDPR endpoints** - Customer data/redact webhooks
5. **App Store submission** - Screenshots, description, review

---
---

# PART 2: BUSINESS & PRODUCT KNOWLEDGE BASE

## Product Vision

**Iani 3D Configurator** is a Shopify app that enables merchants to offer an immersive, interactive shopping experience with 3D visualization and dual AR capabilities.

### Core Capabilities
- **3D Product Viewer** - Interactive 360° rotation, zoom, pan
- **Real-time Customization** - Colors, materials, dynamic pricing
- **Face AR (Virtual Try-On)** - Glasses/jewelry overlay on user's face via camera
- **Space AR (View in Room)** - Place furniture/decor in real environment
- **Photo Capture** - Save and share AR experiences

### Unique Selling Point
**Dual AR System** - Most competitors offer only Face AR OR Space AR. We offer BOTH, making the app suitable for:
- Eyewear stores (Face AR)
- Furniture stores (Space AR)
- Jewelry stores (Face AR)
- Home decor (Space AR)
- Any customizable product (3D Configurator)

---

## Target Market

### Primary Audience (Face AR - Virtual Try-On)
- **Shopify eyewear stores** - prescription glasses, sunglasses, fashion eyewear
- **Jewelry stores** - earrings, necklaces, watches
- **Custom eyewear manufacturers** - personalized frames
- **Boutique optical shops** - differentiation online

### Primary Audience (Space AR - View in Room)
- **Furniture stores** - sofas, chairs, tables, beds
- **Home decor stores** - lamps, rugs, wall art
- **Interior design shops** - complete room visualization
- **Outdoor furniture** - patio sets, garden items

### Market Size
- Global eyewear market: $180+ billion
- Global furniture e-commerce: $250+ billion
- Online sales growing 8-12% annually
- AR experiences increase conversion by 40-60%
- 61% of shoppers prefer stores with AR capabilities

---

## Competitive Analysis

| Competitor | Type | Strengths | Weaknesses | Our Advantage |
|------------|------|-----------|------------|---------------|
| Warby Parker | Face AR | Brand recognition | Proprietary, not for merchants | Open to all Shopify stores |
| Fittingbox | Face AR | Accurate face mapping | High cost, API-only | No-code + affordable |
| Threekit | Space AR | Enterprise 3D platform | Very expensive, complex | Simple Shopify integration |
| Shopify AR | Space AR | Native integration | Basic features only | Advanced customization |
| Zakeke | 3D Config | Good customization | No AR capabilities | Dual AR system |
| **Iani** | **BOTH** | Face AR + Space AR + 3D | New to market | **Only dual-AR solution** |

### Our Unique Value Proposition
1. **Dual AR System** - Both Face AR (try-on) AND Space AR (view in room) - competitors have only one
2. **Shopify-native** - One-click install, App Block integration
3. **Affordable** - Fraction of enterprise pricing
4. **No coding required** - Merchants add via theme editor
5. **Real-time customization** - Colors, materials, pricing
6. **Multi-industry** - Works for eyewear, furniture, jewelry, home decor

---

## Business Model

### Pricing Strategy (Proposed)

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0/mo | 1 product, basic 3D viewer, watermark |
| **Pro** | $29/mo | Unlimited products, AR try-on, no watermark |
| **Business** | $79/mo | + Analytics, priority support, custom branding |
| **Enterprise** | Custom | White-label, API access, dedicated support |

### Revenue Projections (Conservative)

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Free users | 500 | 2,000 | 5,000 |
| Paid users | 50 | 200 | 600 |
| MRR | $1,450 | $5,800 | $17,400 |
| ARR | $17,400 | $69,600 | $208,800 |

---

## Customer Journey

### Merchant (B2B)
1. **Discovery** - Finds app in Shopify App Store searching "3D glasses" or "virtual try-on"
2. **Installation** - One-click install, OAuth flow
3. **Setup** - Upload GLB model, configure colors/materials/pricing
4. **Integration** - Add App Block to product page via theme editor
5. **Launch** - Customers can now use 3D configurator
6. **Growth** - Upgrade to Pro for AR try-on

### End Customer (B2C)
1. **Browse** - Visits Shopify store product page
2. **Explore** - Interacts with 3D model (rotate, zoom)
3. **Customize** - Selects color, material
4. **Try On** - Opens AR try-on, sees glasses on face
5. **Capture** - Takes photo, shares with friends
6. **Purchase** - Adds to cart with configuration saved

---

## Key Metrics to Track

### Product Metrics
- **Configurator loads** - How many times 3D viewer opened
- **Customization rate** - % who change color/material
- **Try-on usage** - % who use AR feature
- **Photo captures** - Engagement with try-on
- **Add to cart rate** - Conversion from configurator

### Business Metrics
- **Install rate** - App Store → Install
- **Activation rate** - Install → First product configured
- **Conversion rate** - Free → Paid
- **Churn rate** - Monthly cancellations
- **NPS** - Customer satisfaction

---

## Marketing Strategy

### App Store Optimization
- **Title**: "Iani 3D Configurator - Virtual Try-On for Glasses"
- **Keywords**: 3D glasses, virtual try-on, AR eyewear, product customizer
- **Screenshots**: Show 3D viewer, try-on, mobile experience
- **Video**: 30-second demo of customer journey

### Content Marketing
- Blog posts: "How AR Try-On Increases Eyewear Sales by 50%"
- Case studies with early merchants
- YouTube tutorials: "Setting Up 3D Products on Shopify"
- Social proof: Before/after conversion rates

### Partnerships
- 3D model creation services
- Shopify theme developers
- Eyewear industry associations
- Influencer opticians/fashion bloggers

---

## Technical Roadmap (Future Features)

### Q1 2025 (Current)
- [x] Core 3D configurator
- [x] Virtual try-on AR
- [ ] Shopify App Store launch

### Q2 2025
- [ ] Analytics dashboard
- [ ] Multiple 3D models per product
- [ ] Prescription lens visualization

### Q3 2025
- [ ] AI face shape recommendations
- [ ] Social sharing integration
- [ ] Multi-language support

### Q4 2025
- [ ] iOS/Android native SDK
- [ ] Enterprise API
- [ ] White-label solution

### 2026+
- [ ] Jewelry support (earrings, necklaces)
- [ ] Hats and headwear
- [ ] Full outfit visualization

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Shopify API changes | Medium | High | Stay updated, modular architecture |
| Browser compatibility | Low | Medium | Progressive enhancement, fallbacks |
| MediaPipe deprecation | Low | High | Abstract face tracking service |
| Competition from Shopify native | Medium | High | Differentiate with features, pricing |
| Slow merchant adoption | Medium | Medium | Free tier, excellent onboarding |

---

## Support & Resources

### For Merchants
- In-app onboarding wizard
- Help center documentation
- Email support (Pro+)
- Live chat (Business+)

### For Development
- **Shopify Dev Docs**: https://shopify.dev/docs/apps
- **Three.js Docs**: https://threejs.org/docs
- **MediaPipe**: https://developers.google.com/mediapipe
- **Remix**: https://remix.run/docs

---

## Team & Contacts

**Project Owner**: Florian
**Development**: Claude AI assisted
**Store**: ianii.myshopify.com
**App URL**: https://iani-configurator.vercel.app

---

## Glossary

| Term | Definition |
|------|------------|
| **GLB/GLTF** | 3D model file formats (GL Transmission Format) |
| **Three.js** | JavaScript 3D library for WebGL rendering |
| **MediaPipe** | Google's ML framework for face detection |
| **OrthographicCamera** | Camera without perspective distortion |
| **App Block** | Shopify theme component merchants can add |
| **PostMessage** | Browser API for cross-origin communication |
| **AR** | Augmented Reality - overlaying digital on real world |
| **MRR/ARR** | Monthly/Annual Recurring Revenue |

---

*Last updated: January 2025*
*Version: 1.0*
