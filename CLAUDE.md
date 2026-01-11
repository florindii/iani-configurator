# Iani 3D Configurator - Shopify App Development Roadmap

## Project Overview

**Project**: Iani 3D Configurator
**Goal**: Transform into a publishable Shopify App Store application
**Current State**: ~75% complete (core 3D configurator is production-ready)
**Target**: Public Shopify App for merchants to sell customizable 3D products

---

## Current Architecture

```
iani-configurator/
├── src/                    # Vue.js 3D Configurator (Frontend)
│   ├── components/
│   │   └── ThreeSceneMinimal.vue  # Main 3D component (2000+ lines)
│   └── services/
│       └── shopifyService.ts      # Shopify cart integration
│
├── iani-configurator/      # Shopify Remix Admin App
│   ├── app/routes/         # Admin pages & API endpoints
│   ├── prisma/             # Database schema
│   └── extensions/         # Theme extensions (TO BE CREATED)
│
├── server/                 # Express Bridge Server
│   └── index.js            # API proxy, file uploads
│
├── api/                    # Vercel Serverless Functions
├── public/models/          # 3D GLB/GLTF models
├── shopify-integration/    # Liquid templates (deprecated method)
└── dist/                   # Production build output
```

---

## What's Complete

| Component | Status | Notes |
|-----------|--------|-------|
| 3D Model Rendering (Three.js) | ✅ | High-quality GLB support |
| Color Customization | ✅ | 6 presets + custom picker |
| Material Selection | ✅ | Frame materials with pricing |
| Dynamic Pricing | ✅ | Real-time calculation |
| Cart Integration | ✅ | PostMessage API to Shopify |
| Shopify Admin App (Remix) | ✅ | Basic product management |
| Database Schema (Prisma) | ✅ | Session, Product3D, Configurations |
| Vercel Deployment | ✅ | Frontend + API functions |
| Mobile Responsive | ✅ | Works on all devices |

---

## What's Missing for App Store

| Requirement | Priority | Status |
|-------------|----------|--------|
| Theme App Extension | CRITICAL | ❌ Not created |
| Production Database (PostgreSQL) | HIGH | ❌ Using SQLite |
| Permanent Hosting URL | HIGH | ❌ Using Cloudflare tunnel |
| GDPR Compliance Endpoints | HIGH | ❌ Not implemented |
| App Listing Assets | MEDIUM | ❌ Not prepared |
| Additional OAuth Scopes | MEDIUM | ⚠️ May need more |
| Rate Limiting | MEDIUM | ❌ Not implemented |
| Unit/Integration Tests | LOW | ❌ Not written |

---

## Implementation Roadmap

### Phase 1: Test Current State (Day 1)

**Goal**: Verify everything works on your dev store before making changes.

#### Tasks:

1. **Start the Shopify Remix app**
   ```bash
   cd iani-configurator
   npm install
   npm run dev
   ```
   This opens a Cloudflare tunnel and starts the admin app.

2. **Build and serve the Vue configurator**
   ```bash
   # In project root (separate terminal)
   npm install
   npm run build
   npm run preview
   ```

3. **Install on dev store**
   - Go to your Shopify Partner dashboard
   - Navigate to Apps > iani-configurator
   - Install on `ianii.myshopify.com`

4. **Test the admin interface**
   - Open your dev store admin
   - Go to Apps > iani-configurator
   - Create a test 3D product
   - Verify database entries are created

5. **Test the storefront integration**
   - Currently requires manual Liquid file injection
   - Use files from `/shopify-integration/` folder
   - Test: customize product → add to cart → checkout
   - Verify configuration data appears in order

#### Verification Checklist:
- [ ] Admin app loads without errors
- [ ] Can create/edit 3D products
- [ ] 3D configurator renders correctly
- [ ] Color changes work in real-time
- [ ] Price updates dynamically
- [ ] Add to cart succeeds
- [ ] Configuration data saved to database
- [ ] Order contains customization details

---

### Phase 2: Theme App Extension (Days 2-4)

**Goal**: Create the required App Block for Shopify App Store compliance.

#### Why This Is Required:
- Shopify deprecated direct Liquid file injection for public apps
- All storefront integrations must use Theme App Extensions
- This is a **blocker** for App Store submission

#### Directory Structure to Create:

```
iani-configurator/extensions/
└── theme-extension/
    ├── blocks/
    │   └── 3d-configurator.liquid      # Main app block
    ├── snippets/
    │   └── configurator-styles.liquid  # Shared styles
    ├── assets/
    │   ├── configurator-loader.js      # JavaScript loader
    │   └── configurator.css            # Styles
    ├── locales/
    │   └── en.default.json             # Translations
    └── shopify.extension.toml          # Extension config
```

#### Implementation Steps:

1. **Generate extension scaffold**
   ```bash
   cd iani-configurator
   shopify app generate extension --type theme_app_extension --name theme-extension
   ```

2. **Create the app block** (`blocks/3d-configurator.liquid`):
   ```liquid
   {% comment %}
     Iani 3D Configurator App Block
     Renders the 3D product configurator on product pages
   {% endcomment %}

   <div
     id="iani-3d-configurator"
     class="iani-configurator-container"
     data-product-id="{{ product.id }}"
     data-variant-id="{{ product.selected_or_first_available_variant.id }}"
     data-shop="{{ shop.permanent_domain }}"
     data-configurator-url="{{ block.settings.configurator_url }}"
   >
     <div class="iani-loading">Loading 3D Configurator...</div>
   </div>

   <script src="{{ 'configurator-loader.js' | asset_url }}" defer></script>
   <link rel="stylesheet" href="{{ 'configurator.css' | asset_url }}">

   {% schema %}
   {
     "name": "3D Product Configurator",
     "target": "section",
     "enabled_on": {
       "templates": ["product"]
     },
     "settings": [
       {
         "type": "text",
         "id": "configurator_url",
         "label": "Configurator URL",
         "default": "https://iani-configurator.vercel.app"
       },
       {
         "type": "select",
         "id": "display_mode",
         "label": "Display Mode",
         "options": [
           { "value": "inline", "label": "Inline" },
           { "value": "modal", "label": "Modal Popup" },
           { "value": "fullscreen", "label": "Fullscreen" }
         ],
         "default": "inline"
       },
       {
         "type": "range",
         "id": "height",
         "label": "Configurator Height",
         "min": 400,
         "max": 800,
         "step": 50,
         "default": 600,
         "unit": "px"
       }
     ]
   }
   {% endschema %}
   ```

3. **Create JavaScript loader** (`assets/configurator-loader.js`):
   ```javascript
   (function() {
     const container = document.getElementById('iani-3d-configurator');
     if (!container) return;

     const config = {
       productId: container.dataset.productId,
       variantId: container.dataset.variantId,
       shop: container.dataset.shop,
       configuratorUrl: container.dataset.configuratorUrl
     };

     // Create iframe for configurator
     const iframe = document.createElement('iframe');
     iframe.src = `${config.configuratorUrl}?product=${config.productId}&shop=${config.shop}`;
     iframe.style.width = '100%';
     iframe.style.height = '100%';
     iframe.style.border = 'none';
     iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope';

     container.innerHTML = '';
     container.appendChild(iframe);

     // Listen for messages from configurator
     window.addEventListener('message', function(event) {
       if (event.origin !== config.configuratorUrl) return;

       const data = event.data;
       if (data.type === 'ADD_TO_CART') {
         // Handle add to cart via Shopify AJAX API
         fetch('/cart/add.js', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             id: data.variantId,
             quantity: 1,
             properties: data.configuration
           })
         })
         .then(res => res.json())
         .then(() => {
           window.location.href = '/cart';
         });
       }
     });
   })();
   ```

4. **Update extension config** (`shopify.extension.toml`):
   ```toml
   api_version = "2025-04"

   [[extensions]]
   name = "Iani 3D Configurator"
   handle = "iani-3d-configurator"
   type = "theme_app_extension"

   [extensions.capabilities]
   network_access = true
   ```

5. **Deploy the extension**
   ```bash
   cd iani-configurator
   shopify app deploy
   ```

6. **Test on dev store**
   - Go to Online Store > Themes > Customize
   - Add the "3D Product Configurator" block to product pages
   - Test the full flow

#### Verification Checklist:
- [ ] Extension shows in theme editor
- [ ] Block can be added to product pages
- [ ] Settings (URL, height, mode) work correctly
- [ ] Configurator loads in iframe
- [ ] Add to cart works via PostMessage
- [ ] Works on mobile themes

---

### Phase 3: Production Infrastructure (Days 5-6)

**Goal**: Set up production-ready hosting and database.

#### 3.1 PostgreSQL Database Setup

**Option A: Neon (Recommended - Free tier available)**
```bash
# 1. Create account at https://neon.tech
# 2. Create new project
# 3. Get connection string
# 4. Update Prisma schema
```

Update `iani-configurator/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Run migrations:
```bash
cd iani-configurator
npx prisma migrate dev --name init
```

**Option B: Railway**
```bash
# 1. Create account at https://railway.app
# 2. Create PostgreSQL service
# 3. Copy connection string to .env
```

**Option C: Heroku Postgres**
```bash
heroku addons:create heroku-postgresql:essential-0
heroku config:get DATABASE_URL
```

#### 3.2 App Hosting (Choose One)

**Option A: Fly.io (Recommended for Shopify apps)**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and deploy
fly auth login
fly launch --name iani-configurator-app

# Set secrets
fly secrets set SHOPIFY_API_KEY=xxx SHOPIFY_API_SECRET=xxx DATABASE_URL=xxx
```

**Option B: Heroku**
```bash
heroku create iani-configurator-app
heroku config:set SHOPIFY_API_KEY=xxx SHOPIFY_API_SECRET=xxx
git push heroku main
```

**Option C: Render.com**
- Connect GitHub repo
- Add environment variables
- Deploy

#### 3.3 Update Shopify App Config

Edit `iani-configurator/shopify.app.toml`:
```toml
client_id = "0c77e35b44769e334e279853c0764719"
name = "Iani 3D Configurator"
handle = "iani-3d-configurator"
application_url = "https://your-production-url.fly.dev"  # UPDATE THIS
embedded = true

[auth]
redirect_urls = [
  "https://your-production-url.fly.dev/auth/callback",
  "https://your-production-url.fly.dev/auth/shopify/callback"
]

[webhooks]
api_version = "2025-04"
```

#### 3.4 Environment Variables for Production

Create `.env.production`:
```env
SHOPIFY_API_KEY=0c77e35b44769e334e279853c0764719
SHOPIFY_API_SECRET=your_secret_here
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NODE_ENV=production
CONFIGURATOR_URL=https://iani-configurator.vercel.app
```

#### Verification Checklist:
- [ ] PostgreSQL database connected
- [ ] Migrations applied successfully
- [ ] App deployed to permanent URL
- [ ] OAuth flow works with production URL
- [ ] Webhooks receiving events
- [ ] SSL/HTTPS working

---

### Phase 4: GDPR Compliance (Day 7)

**Goal**: Implement required data privacy endpoints.

#### Required Endpoints

Shopify requires these webhooks for App Store approval:

1. **Customer Data Request** - When customer requests their data
2. **Customer Redact** - When customer requests deletion
3. **Shop Redact** - When shop uninstalls and requests data deletion

#### Implementation

Create `iani-configurator/app/routes/api.gdpr.tsx`:

```typescript
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function action({ request }: ActionFunctionArgs) {
  const { topic, shop, payload } = await authenticate.webhook(request);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      // Customer requested their data
      // Return all configurations for this customer
      const customerConfigs = await db.productConfiguration.findMany({
        where: {
          OR: [
            { customerEmail: payload.customer.email },
            { shopifyCustomerId: String(payload.customer.id) }
          ]
        }
      });

      console.log(`Data request for customer ${payload.customer.id}:`, customerConfigs);
      // In production: email this data to the customer or merchant
      break;

    case "CUSTOMERS_REDACT":
      // Customer requested deletion
      await db.productConfiguration.deleteMany({
        where: {
          OR: [
            { customerEmail: payload.customer.email },
            { shopifyCustomerId: String(payload.customer.id) }
          ]
        }
      });
      console.log(`Deleted data for customer ${payload.customer.id}`);
      break;

    case "SHOP_REDACT":
      // Shop uninstalled and requested data deletion
      await db.product3D.deleteMany({
        where: { shop }
      });
      await db.session.deleteMany({
        where: { shop }
      });
      console.log(`Deleted all data for shop ${shop}`);
      break;

    default:
      console.log(`Unknown GDPR topic: ${topic}`);
  }

  return json({ success: true });
}
```

#### Update Webhooks Config

Edit `iani-configurator/shopify.app.toml`:
```toml
[[webhooks.subscriptions]]
topics = ["customers/data_request"]
uri = "/api/gdpr"

[[webhooks.subscriptions]]
topics = ["customers/redact"]
uri = "/api/gdpr"

[[webhooks.subscriptions]]
topics = ["shop/redact"]
uri = "/api/gdpr"
```

#### Create Privacy Policy Page

Create `iani-configurator/app/routes/privacy.tsx`:
```typescript
export default function Privacy() {
  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: [DATE]</p>

      <h2>Data We Collect</h2>
      <p>When you use the Iani 3D Configurator, we collect:</p>
      <ul>
        <li>Product configuration choices (colors, materials, options)</li>
        <li>Preview images of your customized products</li>
        <li>Email address (if provided for saving configurations)</li>
      </ul>

      <h2>How We Use Your Data</h2>
      <p>We use this data to:</p>
      <ul>
        <li>Save your product customizations</li>
        <li>Process your orders with custom options</li>
        <li>Improve our configurator experience</li>
      </ul>

      <h2>Data Retention</h2>
      <p>Configuration data is retained for 90 days after creation,
         or until you request deletion.</p>

      <h2>Your Rights</h2>
      <p>You can request your data or deletion by contacting
         the store where you made your purchase.</p>

      <h2>Contact</h2>
      <p>For privacy concerns: [YOUR EMAIL]</p>
    </div>
  );
}
```

#### Verification Checklist:
- [ ] GDPR webhooks registered
- [ ] Data request handler works
- [ ] Customer redact deletes data
- [ ] Shop redact cleans up completely
- [ ] Privacy policy accessible
- [ ] Terms of service page (optional but recommended)

---

### Phase 5: App Store Submission (Days 8-10)

**Goal**: Prepare and submit app for Shopify review.

#### 5.1 App Listing Requirements

**Required Assets:**
- [ ] App icon (1200x1200 PNG)
- [ ] App screenshots (1600x900, 5-10 images)
- [ ] Demo video (optional but highly recommended)
- [ ] App description (2000+ characters)
- [ ] Feature list (bullet points)
- [ ] Category selection

**Example App Description:**
```
Transform your Shopify store with stunning 3D product customization.
Iani 3D Configurator lets your customers personalize products in
real-time with an interactive 3D viewer.

KEY FEATURES:
• Real-time 3D product visualization
• Color and material customization
• Dynamic pricing based on options
• Mobile-responsive design
• Easy theme integration with App Blocks
• No coding required

PERFECT FOR:
• Furniture stores
• Custom product manufacturers
• Fashion and accessories
• Home decor
• Any customizable products

HOW IT WORKS:
1. Upload your 3D model (GLTF/GLB format)
2. Configure customization options
3. Add the configurator to your product pages
4. Customers customize and add to cart

SUPPORT:
We provide full onboarding and support. Contact us at [email].
```

#### 5.2 Pricing Strategy

**Options to Consider:**
1. **Free + Premium** - Basic free, advanced features paid
2. **Usage-based** - Free up to X configurations/month
3. **Flat monthly** - $29-99/month based on plan
4. **Per-product** - Free for 1 product, $X per additional

**Recommended Starting Point:**
- Free tier: 1 product, basic features
- Pro: $29/month - Unlimited products, advanced features
- Enterprise: Custom pricing - White-label, priority support

#### 5.3 Submission Checklist

```
Pre-submission:
- [ ] App works on fresh install (test on new dev store)
- [ ] App works on Dawn theme (Shopify default)
- [ ] Mobile experience is acceptable
- [ ] All required scopes justified
- [ ] GDPR endpoints implemented
- [ ] Privacy policy published
- [ ] No console errors in production
- [ ] Rate limiting implemented

Submission:
- [ ] App listing complete in Partner Dashboard
- [ ] All screenshots uploaded
- [ ] Demo video uploaded (recommended)
- [ ] Pricing plans configured
- [ ] Test credentials provided to reviewers
- [ ] Submit for review

Post-submission:
- [ ] Monitor review status
- [ ] Respond to reviewer feedback within 48 hours
- [ ] Make requested changes promptly
- [ ] Re-submit after fixes
```

#### 5.4 Common Rejection Reasons

Avoid these issues:
1. **Broken OAuth** - Test install/uninstall multiple times
2. **Console errors** - Check browser console in production
3. **Missing GDPR** - All 3 webhooks must work
4. **Poor mobile UX** - Test on actual mobile devices
5. **Scope creep** - Only request scopes you actually use
6. **No value** - Make sure app provides clear value

---

## Feature Enhancement Ideas

### Priority Features (Before Launch)

| Feature | Effort | Impact |
|---------|--------|--------|
| **Model upload in admin** | Medium | HIGH - core value prop |
| **Multiple views/angles** | Low | Medium |
| **Zoom controls** | Low | Medium |
| **Configuration sharing URL** | Low | HIGH |
| **Save for later** | Low | Medium |

### Future Features (Post Launch)

| Feature | Effort | Impact |
|---------|--------|--------|
| **AR preview (View in Room)** | High | HIGH |
| **Custom texture upload** | High | HIGH |
| **Analytics dashboard** | Medium | Medium |
| **Multi-model per product** | Medium | Medium |
| **Bulk model import** | Medium | Low |
| **Custom branding** | Low | Medium |
| **White-label option** | Medium | Medium |
| **API for developers** | High | Medium |

---

## Commands Reference

### Development

```bash
# Start Shopify Remix app (with tunnel)
cd iani-configurator && npm run dev

# Build Vue configurator
npm run build

# Preview production build
npm run preview

# Start Express bridge server
cd server && npm run dev
```

### Deployment

```bash
# Deploy to Vercel (Vue configurator)
vercel --prod

# Deploy Shopify app
cd iani-configurator && shopify app deploy

# Deploy theme extension
cd iani-configurator && shopify app deploy --reset
```

### Database

```bash
# Generate Prisma client
cd iani-configurator && npx prisma generate

# Run migrations
npx prisma migrate dev

# View database
npx prisma studio

# Reset database (dev only!)
npx prisma migrate reset
```

### Debugging

```bash
# Check Shopify app status
cd iani-configurator && shopify app info

# View app logs
shopify app logs

# Validate extension
shopify app extension validate
```

---

## File Quick Reference

| Purpose | Location |
|---------|----------|
| Main 3D component | `src/components/ThreeSceneMinimal.vue` |
| Shopify service | `src/services/shopifyService.ts` |
| Admin routes | `iani-configurator/app/routes/` |
| Database schema | `iani-configurator/prisma/schema.prisma` |
| App config | `iani-configurator/shopify.app.toml` |
| Express server | `server/index.js` |
| Vercel config | `vercel.json` |
| 3D models | `public/models/` |
| Liquid templates | `shopify-integration/` |

---

## Support & Resources

- **Shopify App Development**: https://shopify.dev/docs/apps
- **Theme App Extensions**: https://shopify.dev/docs/apps/online-store/theme-app-extensions
- **Remix Documentation**: https://remix.run/docs
- **Three.js Documentation**: https://threejs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **Shopify Partner Dashboard**: https://partners.shopify.com

---

## Progress Tracker

Use this to track your progress:

```
[ ] Phase 1: Test Current State
    [ ] Install on dev store
    [ ] Test admin interface
    [ ] Test 3D configurator
    [ ] Test cart integration

[ ] Phase 2: Theme App Extension
    [ ] Generate extension
    [ ] Create app block
    [ ] Create JS loader
    [ ] Deploy extension
    [ ] Test on theme

[ ] Phase 3: Production Infrastructure
    [ ] Set up PostgreSQL
    [ ] Deploy to permanent host
    [ ] Update app config
    [ ] Test production flow

[ ] Phase 4: GDPR Compliance
    [ ] Implement webhooks
    [ ] Create privacy policy
    [ ] Test data deletion

[ ] Phase 5: App Store Submission
    [ ] Create listing assets
    [ ] Write app description
    [ ] Set up pricing
    [ ] Submit for review
    [ ] Address feedback
    [ ] Launch!
```

---

*Last updated: December 28, 2025*
*Created for: Iani 3D Configurator Shopify App*
