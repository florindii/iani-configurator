<script setup lang="ts">
import { ref, onMounted } from 'vue'

const demoIframeRef = ref<HTMLIFrameElement | null>(null)
const activeFeature = ref<'config' | 'tryon' | 'space'>('config')

const configuratorUrl = `${window.location.origin}/?modelFile=Couch.glb`

const features = [
  {
    id: 'config',
    icon: '🎨',
    title: '3D Configurator',
    description: 'Customers click any part of a 3D product to change colors and materials in real-time. Works with any GLB model.',
    badge: 'All Plans'
  },
  {
    id: 'tryon',
    icon: '👓',
    title: 'Virtual Try-On',
    description: 'Face AR powered by MediaPipe. Customers try on glasses, hats, and jewelry using their camera. No app needed.',
    badge: 'Pro Plan'
  },
  {
    id: 'space',
    icon: '🛋️',
    title: 'View in Your Space',
    description: 'WebXR-powered AR. Customers place furniture in their actual room with their phone. Perfect for furniture stores.',
    badge: 'Business Plan'
  }
]

const plans = [
  { name: 'Free', price: '$0', products: '1 product', features: ['3D Configurator', 'Watermark'] },
  { name: 'Starter', price: '$19', products: '3 products', features: ['3D Configurator', 'Watermark'] },
  { name: 'Pro', price: '$49', products: 'Unlimited', features: ['3D Configurator', 'Virtual Try-On', 'No watermark'], highlighted: true },
  { name: 'Business', price: '$99', products: 'Unlimited', features: ['Everything in Pro', 'Space AR', 'Priority support'] }
]

onMounted(() => {
  console.log('🎬 Demo landing page loaded')
})

const scrollToDemo = () => {
  document.getElementById('live-demo')?.scrollIntoView({ behavior: 'smooth' })
}

const setActiveFeature = (id: 'config' | 'tryon' | 'space') => {
  activeFeature.value = id
  scrollToDemo()
}
</script>

<template>
  <div class="demo-page">
    <!-- Navigation -->
    <nav class="nav">
      <div class="nav-container">
        <div class="nav-logo">
          <span class="logo-mark">◆</span>
          <span class="logo-text">Iani 3D</span>
        </div>
        <div class="nav-links">
          <a href="#features">Features</a>
          <a href="#live-demo">Live Demo</a>
          <a href="#pricing">Pricing</a>
          <a href="https://apps.shopify.com" class="nav-cta" target="_blank">Install on Shopify</a>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-badge">
          <span>✨ The only Shopify app with both Face AR + Space AR</span>
        </div>
        <h1 class="hero-title">
          Sell more with <span class="gradient-text">3D & AR</span><br>
          product experiences
        </h1>
        <p class="hero-subtitle">
          Let customers customize products in 3D, try them on with their camera, or view them in their room.
          One Shopify app. No coding required.
        </p>
        <div class="hero-cta">
          <button class="btn btn-primary" @click="scrollToDemo">
            Try Live Demo →
          </button>
          <a href="https://apps.shopify.com" class="btn btn-secondary" target="_blank">
            Install on Shopify
          </a>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <div class="stat-value">+34%</div>
            <div class="stat-label">avg. conversion lift</div>
          </div>
          <div class="stat">
            <div class="stat-value">-27%</div>
            <div class="stat-label">return rate reduction</div>
          </div>
          <div class="stat">
            <div class="stat-value">14-day</div>
            <div class="stat-label">free trial</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="features">
      <div class="container">
        <div class="section-header">
          <h2>Three powerful tools, one app</h2>
          <p>Built for eyewear, jewelry, fashion, and furniture stores.</p>
        </div>
        <div class="features-grid">
          <div
            v-for="feature in features"
            :key="feature.id"
            class="feature-card"
            :class="{ active: activeFeature === feature.id }"
            @click="setActiveFeature(feature.id as 'config' | 'tryon' | 'space')"
          >
            <div class="feature-icon">{{ feature.icon }}</div>
            <div class="feature-badge">{{ feature.badge }}</div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
            <div class="feature-link">Try this →</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Live Demo -->
    <section id="live-demo" class="live-demo">
      <div class="container">
        <div class="section-header">
          <h2>Try it yourself</h2>
          <p>Click any part of the model below to customize it. This is the actual app, running live.</p>
        </div>
        <div class="demo-frame-wrapper">
          <div class="demo-frame-header">
            <div class="demo-dots">
              <span></span><span></span><span></span>
            </div>
            <div class="demo-url">customer-storefront.myshopify.com</div>
          </div>
          <div class="demo-frame-body">
            <iframe
              ref="demoIframeRef"
              :src="configuratorUrl"
              allow="camera; microphone; xr-spatial-tracking; accelerometer; gyroscope; magnetometer"
              class="demo-iframe"
            ></iframe>
          </div>
        </div>
        <div class="demo-instructions">
          <div class="instruction">
            <span class="step">1</span>
            <span>Click any part of the model to select it</span>
          </div>
          <div class="instruction">
            <span class="step">2</span>
            <span>Pick a color or material from the panel</span>
          </div>
          <div class="instruction">
            <span class="step">3</span>
            <span>Drag to rotate, scroll to zoom</span>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="how-it-works">
      <div class="container">
        <div class="section-header">
          <h2>Setup in under 5 minutes</h2>
          <p>No developers needed. No code to write.</p>
        </div>
        <div class="steps">
          <div class="step-card">
            <div class="step-number">1</div>
            <h3>Install the app</h3>
            <p>One click from the Shopify App Store. Free trial included.</p>
          </div>
          <div class="step-card">
            <div class="step-number">2</div>
            <h3>Add your products</h3>
            <p>Pick products from your Shopify catalog. Upload a 3D model or use your existing product media.</p>
          </div>
          <div class="step-card">
            <div class="step-number">3</div>
            <h3>Add the block to your theme</h3>
            <p>Drop the configurator block into any product page using Shopify's theme editor.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="pricing">
      <div class="container">
        <div class="section-header">
          <h2>Simple pricing</h2>
          <p>Start free. Upgrade when you're ready. Cancel anytime.</p>
        </div>
        <div class="pricing-grid">
          <div
            v-for="plan in plans"
            :key="plan.name"
            class="pricing-card"
            :class="{ highlighted: plan.highlighted }"
          >
            <div v-if="plan.highlighted" class="pricing-badge">Most Popular</div>
            <h3>{{ plan.name }}</h3>
            <div class="pricing-price">
              <span class="price">{{ plan.price }}</span>
              <span class="period">/month</span>
            </div>
            <div class="pricing-products">{{ plan.products }}</div>
            <ul class="pricing-features">
              <li v-for="f in plan.features" :key="f">✓ {{ f }}</li>
            </ul>
            <a href="https://apps.shopify.com" target="_blank" class="btn btn-primary btn-block">
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="final-cta">
      <div class="container">
        <h2>Ready to give your customers a better shopping experience?</h2>
        <p>14-day free trial. No credit card required.</p>
        <a href="https://apps.shopify.com" target="_blank" class="btn btn-primary btn-large">
          Install on Shopify →
        </a>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-logo">
            <span class="logo-mark">◆</span>
            <span class="logo-text">Iani 3D</span>
          </div>
          <div class="footer-links">
            <a href="/privacy">Privacy</a>
            <a href="mailto:florindlatifii@gmail.com">Contact</a>
            <a href="https://apps.shopify.com" target="_blank">Shopify App Store</a>
          </div>
        </div>
        <div class="footer-bottom">
          © {{ new Date().getFullYear() }} Iani 3D. Built for Shopify.
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.demo-page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
  color: #1a1a2e;
  background: #fff;
  line-height: 1.6;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Navigation */
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 20px;
}
.logo-mark {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 24px;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 32px;
}
.nav-links a {
  color: #4b5563;
  text-decoration: none;
  font-weight: 500;
  font-size: 15px;
  transition: color 0.2s;
}
.nav-links a:hover {
  color: #6366f1;
}
.nav-cta {
  background: #1a1a2e;
  color: white !important;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600 !important;
}
.nav-cta:hover {
  background: #6366f1;
}

/* Hero */
.hero {
  padding: 80px 24px 100px;
  background: linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%);
  text-align: center;
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  top: -200px;
  right: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.hero::after {
  content: '';
  position: absolute;
  bottom: -200px;
  left: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.hero-container {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}
.hero-badge {
  display: inline-block;
  padding: 8px 16px;
  background: white;
  border: 1px solid #e0e7ff;
  border-radius: 100px;
  font-size: 14px;
  color: #6366f1;
  font-weight: 600;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.hero-title {
  font-size: clamp(36px, 6vw, 64px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 24px;
}
.gradient-text {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-subtitle {
  font-size: 20px;
  color: #4b5563;
  max-width: 640px;
  margin: 0 auto 40px;
}
.hero-cta {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 60px;
}

/* Buttons */
.btn {
  padding: 14px 28px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 16px;
  text-decoration: none;
  display: inline-block;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
}
.btn-secondary {
  background: white;
  color: #1a1a2e;
  border: 1.5px solid #e5e7eb;
}
.btn-secondary:hover {
  border-color: #6366f1;
  color: #6366f1;
}
.btn-block {
  display: block;
  width: 100%;
  text-align: center;
  margin-top: 24px;
}
.btn-large {
  padding: 18px 36px;
  font-size: 18px;
}

/* Stats */
.hero-stats {
  display: flex;
  gap: 48px;
  justify-content: center;
  flex-wrap: wrap;
}
.stat {
  text-align: center;
}
.stat-value {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

/* Section header */
.section-header {
  text-align: center;
  max-width: 600px;
  margin: 0 auto 48px;
}
.section-header h2 {
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}
.section-header p {
  font-size: 18px;
  color: #6b7280;
}

/* Features */
.features {
  padding: 100px 0;
  background: white;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
.feature-card {
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 16px;
  padding: 32px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.feature-card:hover, .feature-card.active {
  border-color: #6366f1;
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.12);
}
.feature-icon {
  font-size: 40px;
  margin-bottom: 16px;
}
.feature-badge {
  position: absolute;
  top: 24px;
  right: 24px;
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  padding: 4px 10px;
  border-radius: 100px;
}
.feature-card h3 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}
.feature-card p {
  color: #6b7280;
  margin-bottom: 16px;
}
.feature-link {
  color: #6366f1;
  font-weight: 600;
  font-size: 14px;
}

/* Live demo */
.live-demo {
  padding: 100px 0;
  background: linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%);
}
.demo-frame-wrapper {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.12);
  border: 1px solid #e5e7eb;
  margin-bottom: 32px;
}
.demo-frame-header {
  background: #f8f9fa;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e5e7eb;
}
.demo-dots {
  display: flex;
  gap: 6px;
}
.demo-dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e5e7eb;
}
.demo-dots span:nth-child(1) { background: #ff5f57; }
.demo-dots span:nth-child(2) { background: #febc2e; }
.demo-dots span:nth-child(3) { background: #28c840; }
.demo-url {
  flex: 1;
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  font-family: ui-monospace, monospace;
}
.demo-frame-body {
  height: 700px;
  background: #f8f9fa;
}
.demo-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
.demo-instructions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}
.instruction {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 12px 20px;
  border-radius: 100px;
  border: 1px solid #e5e7eb;
}
.instruction .step {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 14px;
}

/* How it works */
.how-it-works {
  padding: 100px 0;
  background: white;
}
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}
.step-card {
  text-align: center;
  padding: 32px;
}
.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-radius: 50%;
  font-weight: 800;
  font-size: 24px;
  margin-bottom: 16px;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
}
.step-card h3 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}
.step-card p {
  color: #6b7280;
}

/* Pricing */
.pricing {
  padding: 100px 0;
  background: #f8f9ff;
}
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}
.pricing-card {
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 16px;
  padding: 32px 24px;
  position: relative;
  transition: all 0.2s;
}
.pricing-card.highlighted {
  border-color: #6366f1;
  transform: scale(1.04);
  box-shadow: 0 24px 64px rgba(99, 102, 241, 0.15);
}
.pricing-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 4px 16px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}
.pricing-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}
.pricing-price {
  margin-bottom: 8px;
}
.pricing-price .price {
  font-size: 40px;
  font-weight: 800;
}
.pricing-price .period {
  color: #6b7280;
  font-size: 16px;
}
.pricing-products {
  color: #6366f1;
  font-weight: 600;
  margin-bottom: 24px;
  font-size: 14px;
}
.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0;
}
.pricing-features li {
  padding: 8px 0;
  color: #4b5563;
  font-size: 14px;
}

/* Final CTA */
.final-cta {
  padding: 100px 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
  text-align: center;
  color: white;
}
.final-cta h2 {
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}
.final-cta p {
  font-size: 18px;
  color: #cbd5e1;
  margin-bottom: 32px;
}

/* Footer */
.footer {
  padding: 48px 0 32px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
}
.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}
.footer-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 18px;
}
.footer-links {
  display: flex;
  gap: 24px;
}
.footer-links a {
  color: #6b7280;
  text-decoration: none;
  font-size: 14px;
}
.footer-links a:hover {
  color: #6366f1;
}
.footer-bottom {
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
}

/* Responsive */
@media (max-width: 768px) {
  .nav-links a:not(.nav-cta) {
    display: none;
  }
  .demo-frame-body {
    height: 500px;
  }
  .pricing-card.highlighted {
    transform: none;
  }
  .hero-stats {
    gap: 24px;
  }
}
</style>
