<!-- Updated 3D Configurator with Clickable Mesh Parts -->
<template>
  <div class="configurator-fullscreen">
    <!-- Left Side: 3D Viewer -->
    <div class="viewer-section">
      <div ref="canvasContainer" class="viewer-container"></div>
      

      
      <!-- Debug Info Panel -->
      <div v-if="showDebugInfo" class="debug-panel">
        <h4>🔍 Model Debug Info</h4>
        
        <!-- Model Selection Dropdown -->
        <div class="model-selector">
          <label for="model-select">📋 Select Model:</label>
          <select 
            id="model-select"
            v-model="selectedModel" 
            @change="changeModel" 
            class="model-dropdown"
          >
            <option 
              v-for="model in availableModels" 
              :key="model.value" 
              :value="model.value"
            >
              {{ model.name }}
            </option>
          </select>
        </div>
        
        <div class="debug-stats">
          <div>Current Model: {{ selectedModel }}</div>
          <div>Total Meshes: {{ debugStats.totalMeshes }}</div>
          <div>Cushions: {{ debugStats.cushions }}</div>
          <div>Frame: {{ debugStats.frame }}</div>
        </div>
        <button @click="exportModelStructure">Export Structure</button>
      </div>
      
      <!-- Debug Toggle -->
      <!-- <div class="debug-toggle" @click="showDebugInfo = !showDebugInfo">
        🔍
      </div> -->
      
      <!-- Click Instructions (hidden in readonly mode) -->
      <div v-if="!isReadOnlyMode" class="click-instructions">
        <div class="instruction-text">💡 Click on different parts to customize them</div>
      </div>

      <!-- Read-only Banner for Merchants -->
      <div v-if="isReadOnlyMode" class="readonly-banner">
        <div class="readonly-text">👁️ Viewing Customer Configuration</div>
      </div>
      
      <!-- Loading Overlay -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Loading 3D model...</p>
      </div>
    </div>

    <!-- Right Side: Configuration Panel -->
    <div class="config-section" :class="{ 'readonly-mode': isReadOnlyMode }">
      <div class="config-content">

        <!-- Skeleton: shown while 3D model is loading -->
        <template v-if="isLoading">
          <div class="config-header">
            <div class="skel skel-title"></div>
            <div class="skel skel-subtitle"></div>
          </div>
          <div class="price-section">
            <div class="skel skel-price-sm"></div>
            <div class="skel skel-price-lg"></div>
          </div>
          <div class="skel-section-label"></div>
          <div v-if="isReadOnlyMode" class="skel-rows">
            <div class="skel-row" v-for="n in 4" :key="n">
              <div class="skel skel-dot"></div>
              <div class="skel skel-row-label"></div>
              <div class="skel skel-row-value"></div>
            </div>
            <div class="skel-divider"></div>
            <div class="skel-row">
              <div class="skel skel-row-label"></div>
              <div class="skel skel-row-value-wide"></div>
            </div>
          </div>
          <div v-else class="skel-rows">
            <div class="skel skel-row-label" style="width:60%;margin-bottom:12px"></div>
            <div class="skel skel-row-label" style="width:80%"></div>
          </div>
        </template>

        <!-- Real content: shown after model loaded -->
        <template v-else>

        <!-- Header -->
        <div class="config-header">
          <h2>{{ productName }}</h2>
          <p v-if="isReadOnlyMode" class="product-description readonly-subtitle">
            📋 Configuration Details for Manufacturing
          </p>
          <p v-else class="product-description">
            {{ selectedPart ? `Customizing: ${selectedPart.name}` : 'Click on parts to customize' }}
          </p>
        </div>

        <!-- Price Display -->
        <div class="price-section">
          <!-- Show crossed-out base price when extras are added -->
          <div v-if="totalExtraCost > 0" class="base-price-crossed">
            <span class="currency">{{ currencySymbol }}</span>
            <span class="amount">{{ formatPrice(basePrice) }}</span>
          </div>
          <div class="current-price">
            <span class="currency">{{ currencySymbol }}</span>
            <span class="amount">{{ formatPrice(calculatedPrice) }}</span>
          </div>
        </div>

        <!-- Configuration Options -->
        <div class="config-options">

          <!-- READ-ONLY: Configuration Summary for Merchants -->
          <div v-if="isReadOnlyMode" class="readonly-summary">
            <div class="summary-section">
              <h3>🎨 Customized Parts</h3>
              <p class="readonly-hint">Click a part below to highlight it on the model</p>

              <!-- Show each customized mesh part -->
              <div
                v-for="(customization, meshName) in meshCustomizations"
                :key="meshName"
                class="summary-item clickable-part"
                :class="{ 'highlighted-part': highlightedMeshName === meshName }"
                @click="toggleMeshHighlight(meshName)"
              >
                <div class="summary-label">
                  <div
                    class="color-preview-dot"
                    :style="{ backgroundColor: customization.colorHex }"
                  ></div>
                  {{ meshName.replace(/_/g, ' ') }}
                </div>
                <span class="summary-value">
                  {{ customization.colorName }}
                  <span class="color-code-small">{{ customization.colorHex }}</span>
                </span>
              </div>

              <!-- Fallback if no mesh customizations -->
              <div v-if="Object.keys(meshCustomizations).length === 0" class="summary-item">
                <span class="summary-label">Color:</span>
                <span class="summary-value">{{ getSelectedColorLabel() || 'Default' }}</span>
              </div>

              <div class="summary-item total">
                <span class="summary-label">Total Price:</span>
                <span class="summary-value price">{{ currencySymbol }}{{ formatPrice(calculatedPrice) }}</span>
              </div>
            </div>

            <div class="readonly-instructions">
              <p>🔄 Rotate the 3D model to inspect all angles</p>
              <p>🔍 Use mouse wheel to zoom in/out</p>
              <p>👆 Click a part above to highlight it</p>
            </div>
          </div>

          <!-- NORMAL MODE: Default Overview -->
          <div v-else-if="!selectedPart" class="overview-section">
            <div class="quick-overview">
              <h3>✨ How to Customize</h3>
              <p>Click directly on the model parts to customize them</p>
            </div>
          </div>

          <!-- NORMAL MODE: Main Customization Menu After Mesh Selection -->
          <div v-else class="customization-menu">
            <div class="back-button" @click="clearSelection()">
              ← Back to Overview
            </div>
            <h3 class="option-title">{{ selectedPart.name }}</h3>
            <p class="option-subtitle">Select customization option</p>
            
            <!-- Customization Options Buttons -->
            <div class="customization-buttons">
              <button 
                class="custom-btn colors-btn"
                @click="showCustomizationPanel = 'colors'"
              >
                <span class="btn-icon">🟦</span>
                <span class="btn-text">Colors</span>
              </button>
              <button 
                class="custom-btn frame-btn"
                @click="showCustomizationPanel = 'frame'"
              >
                <span class="btn-icon">🔲</span>
                <span class="btn-text">Frame</span>
              </button>
            </div>

            <!-- Colors Panel -->
            <div v-if="showCustomizationPanel === 'colors'" class="customization-panel">
              <h4 class="panel-title">🟦 Available Colors</h4>
              <p class="panel-subtitle">{{ getSelectedColorLabel() }}</p>
              
              <!-- Preset Colors -->
              <div class="subsection">
                <h5 class="subsection-title">Preset Colors</h5>
                <div class="color-grid">
                  <div 
                    v-for="color in colorOptions" 
                    :key="color.value"
                    :class="['color-option', { active: configuration.cushionColor === color.value && !configuration.isCustomColor }]"
                    @click="setPresetColor(color.value, color.hex)"
                    :title="`${color.label} - ${color.price}`"
                  >
                    <div 
                      class="color-swatch"
                      :style="{ backgroundColor: color.hex }"
                    ></div>
                    <span class="color-name">{{ color.label }}</span>
                    <span class="color-price">+{{ currencySymbol }}{{ color.price.toFixed(0) }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Custom Color Picker -->
              <div class="subsection">
                <h5 class="subsection-title">Custom Color</h5>
                <div class="custom-color-section">
                  <input 
                    type="color" 
                    v-model="customColor"
                    @input="setCustomColor"
                    class="color-picker-input"
                    title="Pick any custom color"
                  />
                  <div 
                    v-if="configuration.isCustomColor"
                    class="custom-color-preview"
                    :style="{ backgroundColor: customColor }"
                  >
                    <div class="custom-color-label">{{ customColor.toUpperCase() }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Frame Panel -->
            <div v-if="showCustomizationPanel === 'frame'" class="customization-panel">
              <h4 class="panel-title">🔲 Frame Material</h4>
              <p class="panel-subtitle">{{ getFrameLabel() }}</p>
              <div class="material-options">
                <div 
                  v-for="frame in frameOptions" 
                  :key="frame.value"
                  :class="['material-option', { active: configuration.frameMaterial === frame.value }]"
                  @click="updateFrameMaterial(frame.value)"
                >
                  <span class="material-name">{{ frame.label }}</span>
                  <span class="material-description">{{ frame.description }}</span>
                  <span class="material-price">+{{ currencySymbol }}{{ frame.extraCost }}</span>
                </div>
              </div>
            </div>
          </div>



        </div>

        <!-- Add to Cart Button (hidden in readonly/preview mode) -->
        <div v-if="!isReadOnlyMode && !isPreviewMode" class="cart-section">
          <!-- Try-On Button (only shown when enabled) -->
          <button
            v-if="tryOnEnabled"
            @click="openTryOn"
            class="try-on-btn"
            title="Try on using your camera">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <span>Try On</span>
          </button>

          <!-- Space AR Button (only shown when enabled, device supports WebXR, and NOT a try-on product) -->
          <button
            v-if="spaceArEnabled && spaceArSupported && !isInArSession && !tryOnEnabled"
            @click="startArSession"
            class="space-ar-btn"
            title="View this product in your room using AR">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span>View in Your Space</span>
          </button>

          <button
            @click="addToCart"
            :disabled="!model || isAddingToCart"
            class="add-to-cart-btn">
            <span v-if="isAddingToCart">Adding to Cart...</span>
            <span v-else>Add to Cart - {{ currencySymbol }}{{ formatPrice(calculatedPrice) }}</span>
          </button>
        </div>

        </template><!-- end v-else (real content) -->
      </div>
    </div>

    <!-- AR Overlay Controls (DOM overlay for WebXR session) -->
    <div id="ar-overlay" class="ar-overlay" :class="{ 'ar-overlay--active': isInArSession }">
      <button @click="exitArSession" class="ar-exit-btn">
        Exit AR
      </button>
      <div v-if="!arModelPlaced" class="ar-instructions">
        Point your camera at the floor and tap to place
      </div>
      <div v-if="arModelPlaced && arGestureHint" class="ar-instructions ar-instructions--hint">
        Drag to move &bull; Pinch to resize &bull; Two fingers to rotate
      </div>
      <!-- Height adjustment buttons -->
      <div v-if="arModelPlaced" class="ar-height-controls">
        <button @click="adjustArHeight(0.03)" class="ar-height-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button @click="adjustArHeight(-0.03)" class="ar-height-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Virtual Try-On Modal -->
    <VirtualTryOn
      v-if="showTryOnModal"
      :model-url="currentModelUrl"
      :product-type="tryOnType"
      :color-options="colorOptionsForTryOn"
      :selected-color="configuration.cushionColor"
      :offset-y="tryOnOffsetY"
      :scale="tryOnScale"
      @close="closeTryOn"
      @capturePreview="handleTryOnCapture"
      @colorChange="handleTryOnColorChange"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import VirtualTryOn from './VirtualTryOn.vue'

// Refs
const canvasContainer = ref(null)
const isLoading = ref(true)
const isAddingToCart = ref(false)
const showDebugInfo = ref(false)
const selectedModel = ref('officeChair.glb') // Default model (small file, works on Vercel)

// Available models (only models under 10MB that are deployed to Vercel)
const availableModels = ref([
  { name: 'Office Chair', value: 'officeChair.glb' },
  { name: 'Couch', value: 'Couch.glb' },
  { name: 'AKM-SU (Low Poly)', value: 'low-poly_akmsu.glb' },
  { name: 'Check Model', value: 'check.glb' }
])

// Debug Stats
const debugStats = ref({
  totalMeshes: 0,
  cushions: 0,
  frame: 0
})

const showCustomizationPanel = ref(null)
const selectedPart = ref(null)
const clickedMesh = ref(null)

// Three.js variables
let scene, camera, renderer, model, controls, raycaster, mouse

let sofaParts = {
  cushions: [],
  frame: [],
  all: []
}

// Custom color state
const customColor = ref('#4A90E2')

// Track if user has explicitly selected a color (vs initial default)
const hasUserSelectedColor = ref(false)

// Track ALL mesh customizations - stores color/material per mesh name
// Format: { "meshName": { colorHex: "#FFFFFF", colorName: "Ocean Blue", type: "color" } }
const meshCustomizations = ref({})

// Configuration state
const configuration = ref({
  cushionColor: 'blue',
  frameMaterial: 'oak',
  isCustomColor: false,
  customHex: null
})



// Configuration Options - will be loaded dynamically from API
const colorOptions = ref([
  { label: 'Ocean Blue', value: 'blue', hex: '#4A90E2', price: 299.99 },
  { label: 'Crimson Red', value: 'red', hex: '#E74C3C', price: 319.99 },
  { label: 'Forest Green', value: 'green', hex: '#2ECC71', price: 309.99 },
  { label: 'Chocolate Brown', value: 'brown', hex: '#8B4513', price: 329.99 },
  { label: 'Royal Purple', value: 'purple', hex: '#9B59B6', price: 339.99 },
  { label: 'Sunset Orange', value: 'orange', hex: '#E67E22', price: 314.99 }
])

const frameOptions = ref([
  { label: 'Oak Wood', value: 'oak', description: 'Natural oak finish', extraCost: 0 },
  { label: 'Walnut', value: 'walnut', description: 'Dark walnut stain', extraCost: 50 },
  { label: 'Metal Frame', value: 'metal', description: 'Brushed steel', extraCost: 75 },
  { label: 'White Oak', value: 'white-oak', description: 'Light bleached oak', extraCost: 25 }
])

// Track if config was loaded from API
const configLoaded = ref(false)
const productName = ref('Customize Your Product')
const productModelUrl = ref('') // Model URL from product config API
const savedProductId = ref('') // Product ID from saved configuration (readonly mode)

// Shopify price context (from URL params)
const shopifyBasePrice = ref(null)
const shopifyCurrency = ref('USD')

// Saved configuration price (for readonly view)
const savedConfigPrice = ref(null)

// Virtual Try-On state
const tryOnEnabled = ref(false)
const tryOnType = ref('glasses')
const tryOnOffsetY = ref(0) // Vertical offset percentage
const tryOnScale = ref(1) // Scale multiplier
const showTryOnModal = ref(false)
const tryOnModelUrl = ref('')
const tryOnPreviewImage = ref(null) // Captured try-on image for cart

// Space AR (WebXR) state
const spaceArEnabled = ref(false)
const spaceArSupported = ref(false)
const isInArSession = ref(false)
const arModelPlaced = ref(false)
const arGestureHint = ref(false) // Show gesture hint briefly after placement
let hitTestSource = null
let hitTestSourceRequested = false
let reticle = null
let moveIndicator = null // Ring under the model showing it can be moved
let arModelContainer = null
let savedBackground = null
let arGestureHintTimeout = null

// Touch gesture state for AR (Shopify-style: drag=move, pinch=scale, two-finger-rotate=rotate)
let arTouches = { prev: [], count: 0 }
let arTouchMoveActive = false // Single-finger drag is moving the model

// Load configuration from merchant's settings
const loadProductConfig = async () => {
  const context = getShopifyContext()

  // Capture Shopify price and currency from context
  if (context.price) {
    shopifyBasePrice.value = context.price
    console.log('💰 Using Shopify product price:', context.price)
  }
  if (context.currency) {
    shopifyCurrency.value = context.currency
    console.log('💱 Using currency:', context.currency)
  }

  if (!context.productId || !context.shop) {
    console.log('📋 No product/shop context, using default options')
    return
  }

  try {
    // Try to load from Shopify app API first, then fall back to Vercel API
    // Use environment variable or default to production URL
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://iani-configurator-1.onrender.com'
    const vercelBaseUrl = import.meta.env.VITE_VERCEL_URL || 'https://iani-configurator.vercel.app'

    const apiUrls = [
      `${apiBaseUrl}/api/product-config/${context.productId}?shop=${context.shop}`,
      `${vercelBaseUrl}/api/product-config?productId=${context.productId}&shop=${context.shop}`
    ]

    for (const apiUrl of apiUrls) {
      try {
        if (import.meta.env.DEV) console.log('📡 Fetching product config from:', apiUrl)
        const response = await fetch(apiUrl)
        if (!response.ok) continue

        const data = await response.json()
        console.log('📦 Received product config:', data)

        if (data.config) {
          // Update product name
          if (data.config.name) {
            productName.value = data.config.name
          }

          // Update model URL
          if (data.config.baseModelUrl) {
            productModelUrl.value = data.config.baseModelUrl
          }

          // Update color options
          if (data.config.colorOptions && data.config.colorOptions.length > 0) {
            colorOptions.value = data.config.colorOptions.map((c, index) => ({
              label: c.name,
              value: c.name.toLowerCase().replace(/\s+/g, '-'),
              hex: c.hexCode,
              price: c.price,
              isDefault: c.isDefault || index === 0 // Mark first as default if none specified
            }))
            // Set default color
            const defaultColor = data.config.colorOptions.find(c => c.isDefault) || data.config.colorOptions[0]
            if (defaultColor) {
              configuration.value.cushionColor = defaultColor.name.toLowerCase().replace(/\s+/g, '-')
            }
          }

          // Update material/frame options
          if (data.config.materialOptions && data.config.materialOptions.length > 0) {
            frameOptions.value = data.config.materialOptions.map(m => ({
              label: m.name,
              value: m.name.toLowerCase().replace(/\s+/g, '-'),
              description: m.description || '',
              extraCost: m.extraCost
            }))
            // Set default material
            const defaultMaterial = data.config.materialOptions.find(m => m.isDefault) || data.config.materialOptions[0]
            if (defaultMaterial) {
              configuration.value.frameMaterial = defaultMaterial.name.toLowerCase().replace(/\s+/g, '-')
            }
          }

          // Load Virtual Try-On settings
          if (data.config.tryOnEnabled) {
            tryOnEnabled.value = true
            tryOnType.value = data.config.tryOnType || 'glasses'
            tryOnOffsetY.value = data.config.tryOnOffsetY || 0
            tryOnScale.value = data.config.tryOnScale || 1
            console.log('👓 Try-On enabled:', tryOnType.value, 'offset:', tryOnOffsetY.value, 'scale:', tryOnScale.value)
          }

          // Load Space AR settings
          if (data.config.spaceArEnabled) {
            spaceArEnabled.value = true
            console.log('🔲 Space AR enabled for this product')
          }

          configLoaded.value = true
          console.log('✅ Product config loaded successfully')
          return
        }
      } catch (err) {
        console.warn('⚠️ Failed to fetch from:', apiUrl, err)
      }
    }

    console.log('📋 No custom config found, using defaults')
  } catch (error) {
    console.error('❌ Error loading product config:', error)
  }
}




// Base price from Shopify
const basePrice = computed(() => {
  return shopifyBasePrice.value || 299.99
})

// Total extra costs (for showing what's being added)
// Now calculates based on ALL mesh customizations - each customized part adds its price
const totalExtraCost = computed(() => {
  let extras = 0

  // Calculate extras from all mesh customizations
  // Each customized mesh part adds its color/material price
  const customizations = Object.values(meshCustomizations.value)

  if (customizations.length > 0) {
    customizations.forEach((customization) => {
      // Use the stored price directly (set when customization was made)
      const price = customization.price || 0
      const colorName = customization.colorName || 'Unknown'
      if (price > 0) {
        extras += price
        console.log(`💰 Adding ${price} for ${colorName}`)
      }
    })
    console.log(`💵 Total extra cost from ${customizations.length} customizations: ${extras}`)
  } else {
    // Fallback to legacy single-color calculation if no mesh customizations
    if (hasUserSelectedColor.value) {
      const selectedColor = colorOptions.value.find(c => c.value === configuration.value.cushionColor)
      if (selectedColor && selectedColor.price) {
        extras += selectedColor.price
      }
    }

    // Add extra costs from selected frame material
    const selectedFrame = frameOptions.value.find(f => f.value === configuration.value.frameMaterial)
    if (selectedFrame) extras += selectedFrame.extraCost

  }

  return extras
})

// Computed price - uses saved config price in readonly mode, otherwise calculates from base + extras
const calculatedPrice = computed(() => {
  // In readonly mode with a saved configuration, use the saved price
  // Check readonly from URL params directly since isReadOnlyMode is defined later
  const urlParams = new URLSearchParams(window.location.search)
  const isReadonly = urlParams.get('readonly') === 'true'
  if (isReadonly && savedConfigPrice.value) {
    return savedConfigPrice.value
  }
  return basePrice.value + totalExtraCost.value
})

// Currency symbol based on Shopify currency
const currencySymbol = computed(() => {
  const symbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'RSD': 'RSD ',
    'CAD': 'C$',
    'AUD': 'A$',
    'JPY': '¥',
    'CNY': '¥',
    'INR': '₹',
    'BRL': 'R$',
    'MXN': 'MX$',
    'CHF': 'CHF ',
    'SEK': 'kr ',
    'NOK': 'kr ',
    'DKK': 'kr ',
    'PLN': 'zł ',
    'CZK': 'Kč ',
    'HUF': 'Ft ',
    'RUB': '₽',
    'TRY': '₺',
    'ZAR': 'R ',
    'KRW': '₩',
    'SGD': 'S$',
    'HKD': 'HK$',
    'NZD': 'NZ$'
  }
  return symbols[shopifyCurrency.value] || shopifyCurrency.value + ' '
})

// Format price based on currency
const formatPrice = (price) => {
  // For currencies without decimal (like JPY, KRW)
  const noDecimalCurrencies = ['JPY', 'KRW', 'HUF', 'VND']
  if (noDecimalCurrencies.includes(shopifyCurrency.value)) {
    return Math.round(price).toLocaleString()
  }
  return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Helper functions for labels
const getSelectedColorLabel = () => {
  const selected = colorOptions.value.find(c => c.value === configuration.value.cushionColor)
  return selected ? selected.label : 'Select Color'
}

const getFrameLabel = () => {
  const selected = frameOptions.value.find(f => f.value === configuration.value.frameMaterial)
  return selected ? selected.label : 'Select Material'
}




// MESH CLICKING FUNCTIONALITY
const onMouseClick = (event) => {
  if (!camera || !scene) return
  
  
  const rect = canvasContainer.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(scene.children, true)
  
  if (intersects.length > 0) {
    const targetMesh = intersects[0].object
    console.log('🖱️ Clicked mesh:', targetMesh.name, 'Type:', targetMesh.userData.partType)
    console.log('🔍 Material info:', {
      isArray: Array.isArray(targetMesh.material),
      materialCount: Array.isArray(targetMesh.material) ? targetMesh.material.length : 1,
      materialUuid: Array.isArray(targetMesh.material) ? targetMesh.material.map(m => m.uuid) : targetMesh.material?.uuid,
      hasClonedMaterial: !!targetMesh.userData.hasClonedMaterial
    })
    
    // Log all materials in the scene to check for duplicates
    const allMaterials = new Set()
    model.traverse(child => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => allMaterials.add(mat.uuid))
        } else {
          allMaterials.add(child.material.uuid)
        }
      }
    })
    console.log('🎨 Total unique materials in scene:', allMaterials.size)
    
    // Update the clicked mesh to the NEW mesh
    console.log("targetMesh",targetMesh);
    clickedMesh.value = targetMesh
    console.log('🎯 Set clickedMesh to:', clickedMesh.value.name)
    
    // Initialize custom config for this mesh if it doesn't exist
    if (!targetMesh.userData.customConfig) {
      targetMesh.userData.customConfig = {
        cushionColor: configuration.value.cushionColor,
        frameMaterial: configuration.value.frameMaterial
      }
    }
    
    // Update the global configuration to match this mesh's current config
    const partType = targetMesh.userData.partType
    if (partType === 'cushion') {
      configuration.value.cushionColor = targetMesh.userData.customConfig.cushionColor
    } else if (partType === 'frame') {
      configuration.value.frameMaterial = targetMesh.userData.customConfig.frameMaterial
    }
    
    // Set the selected part for UI display
    selectedPart.value = {
      name: targetMesh.name,
      type: targetMesh.userData.partType
    }
    
    // Add visual feedback
    highlightClickedMesh(targetMesh)
  } else {
    clearSelection()
  }
}



const removeEdgeHelpers = () => {
  sofaParts.all.forEach(part => {
    const toRemove = part.children.filter(c => c.userData.isEdgeHelper)
    toRemove.forEach(c => part.remove(c))
  })
}

const addEdgeBorder = (mesh) => {
  removeEdgeHelpers()
  const edges = new THREE.EdgesGeometry(mesh.geometry, 15)
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x999999 }))
  line.userData.isEdgeHelper = true
  mesh.add(line)
}

const highlightClickedMesh = (mesh) => {
  addEdgeBorder(mesh)
}

// Model changing functionality
const changeModel = async () => {
  console.log('🔄 Changing model to:', selectedModel.value)
  
  // Clear current selection
  clearSelection()
  
  // Reset parts arrays
  sofaParts = {
    cushions: [],
    frame: [],
    all: []
  }
  
  // Remove current model from scene
  if (model && scene) {
    scene.remove(model)
  }
  
  // Show loading
  isLoading.value = true
  
  try {
    await loadModel()
  } catch (error) {
    console.error('❌ Failed to change model:', error)
  }
}
const exportModelStructure = () => {
  if (!model) return
  
  const structure = []
  model.traverse((child) => {
    if (child.isMesh) {
      structure.push({
        name: child.name,
        type: child.type,
        parent: child.parent ? child.parent.name : 'ROOT',
        position: [
          parseFloat(child.position.x.toFixed(3)),
          parseFloat(child.position.y.toFixed(3)),
          parseFloat(child.position.z.toFixed(3))
        ],
        material: child.material ? {
          type: child.material.type,
          color: child.material.color ? `#${child.material.color.getHexString()}` : null,
          roughness: child.material.roughness || 0,
          metalness: child.material.metalness || 0
        } : null
      })
    }
  })
  
  console.log('📋 COMPLETE MODEL STRUCTURE:')
  console.log(JSON.stringify(structure, null, 2))
  
  // Copy to clipboard if possible
  if (navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(structure, null, 2))
    console.log('✅ Structure copied to clipboard!')
  }
}



// Apply saved mesh customizations to the loaded model
const applySavedMeshCustomizations = () => {
  if (!model) return

  const customizations = meshCustomizations.value
  const meshEntries = Object.entries(customizations)
  if (meshEntries.length === 0) return

  console.log(`🎨 Applying ${meshEntries.length} saved customizations to model...`)

  model.traverse((child) => {
    if (child.isMesh && customizations[child.name]) {
      const customization = customizations[child.name]
      const colorHex = parseInt(customization.colorHex.replace('#', '0x'))

      console.log(`   🔧 Applying ${customization.colorName} (${customization.colorHex}) to ${child.name}`)

      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          mat.color.setHex(colorHex)
          mat.roughness = 0.8
          mat.metalness = 0.1
          mat.needsUpdate = true
        })
      } else if (child.material) {
        child.material.color.setHex(colorHex)
        child.material.roughness = 0.8
        child.material.metalness = 0.1
        child.material.needsUpdate = true
      }
    }
  })

  console.log('✅ All mesh customizations applied')
}

// Highlight a specific mesh by name (for readonly click-to-highlight)
const highlightMeshByName = (meshName) => {
  if (!model) return

  model.traverse((child) => {
    if (child.isMesh && child.name === meshName) {
      addEdgeBorder(child)
    }
  })
}

// Track which mesh is currently highlighted in readonly mode
const highlightedMeshName = ref(null)

// Toggle highlight on a mesh (for readonly sidebar clicks)
const toggleMeshHighlight = (meshName) => {
  if (highlightedMeshName.value === meshName) {
    // Un-highlight
    clearSelection()
    highlightedMeshName.value = null
  } else {
    highlightMeshByName(meshName)
    highlightedMeshName.value = meshName
  }
}

const clearSelection = () => {
  selectedPart.value = null
  clickedMesh.value = null
  removeEdgeHelpers()
}

// ====== VIRTUAL TRY-ON FUNCTIONS ======

// Get current model URL for try-on (same logic as loadModel)
const currentModelUrl = computed(() => {
  const shopifyContext = getShopifyContext()

  // Priority: 1. Full URL from modelUrl param, 2. modelFile param, 3. selected model
  if (shopifyContext.modelUrl) {
    return shopifyContext.modelUrl
  } else if (shopifyContext.modelFile) {
    return `/models/${shopifyContext.modelFile}`
  }
  return `/models/${selectedModel.value}`
})

// Transform color options for try-on component format
const colorOptionsForTryOn = computed(() => {
  return colorOptions.value.map(c => ({
    value: c.value,
    name: c.label,
    hex: c.hex
  }))
})

// Open try-on modal
const openTryOn = () => {
  console.log('👓 Opening Virtual Try-On...')
  showTryOnModal.value = true
}

// Close try-on modal
const closeTryOn = () => {
  console.log('👓 Closing Virtual Try-On')
  showTryOnModal.value = false
}

// Handle captured try-on preview image
const handleTryOnCapture = (dataUrl) => {
  console.log('📸 Try-on preview captured')
  tryOnPreviewImage.value = dataUrl
  // This image can be used as the cart preview instead of 3D model screenshot
}

// Handle color change from try-on modal
const handleTryOnColorChange = (colorValue) => {
  console.log('🎨 Try-on color changed:', colorValue)
  const colorOption = colorOptions.value.find(c => c.value === colorValue)
  if (colorOption) {
    setPresetColor(colorValue, colorOption.hex)
  }
}





// Configuration update functions
// Set preset color
const setPresetColor = (colorValue, colorHex) => {
  console.log('🎨 Setting preset color to:', colorValue)
  configuration.value.cushionColor = colorValue
  configuration.value.isCustomColor = false
  configuration.value.customHex = null
  hasUserSelectedColor.value = true // Mark that user explicitly selected a color
  updateCushionColors()
}

// Set custom color
const setCustomColor = () => {
  console.log('🎨 Setting custom color to:', customColor.value)
  configuration.value.cushionColor = 'custom'
  configuration.value.isCustomColor = true
  configuration.value.customHex = customColor.value
  hasUserSelectedColor.value = true // Mark that user explicitly selected a color
  updateCushionColors()
}

const updateCushionColor = (colorValue) => {
  console.log('🎨 Updating cushion color to:', colorValue)
  configuration.value.cushionColor = colorValue
  configuration.value.isCustomColor = false
  configuration.value.customHex = null
  hasUserSelectedColor.value = true // Mark that user explicitly selected a color
  updateCushionColors()
}

const updateFrameMaterial = (material) => {
  console.log('🪵 Updating frame material to:', material)
  configuration.value.frameMaterial = material
  updateFrameMaterials()
}




// Real-time 3D model update functions (work with existing model parts only)
const updateCushionColors = () => {
  console.log('🟦 updateCushionColors called')
  console.log('clickedMesh:', clickedMesh.value ? clickedMesh.value.name : 'none')

  // If we have a specific clicked mesh, ALWAYS update it regardless of type
  if (clickedMesh.value && clickedMesh.value.material) {
    // Support custom colors
    let newColorHex = 0x4A90E2 // default blue
    let colorHexString = '#4A90E2'
    let colorName = 'Ocean Blue'

    if (configuration.value.isCustomColor && configuration.value.customHex) {
      newColorHex = parseInt(configuration.value.customHex.replace('#', '0x'))
      colorHexString = configuration.value.customHex
      colorName = 'Custom'
      console.log('🎨 Using custom color:', configuration.value.customHex)
    } else {
      newColorHex = getColorHex(configuration.value.cushionColor)
      colorHexString = '#' + newColorHex.toString(16).padStart(6, '0')
      // Find the color name from options
      const colorOption = colorOptions.value.find(c => c.value === configuration.value.cushionColor)
      colorName = colorOption ? colorOption.label : configuration.value.cushionColor
      console.log('🎨 Using preset color:', configuration.value.cushionColor)
    }

    console.log('🟦 Applying color to clicked mesh:', clickedMesh.value.name, 'Hex:', newColorHex.toString(16))

    // Get the price for this color
    const colorOption = colorOptions.value.find(c => c.label === colorName || c.value === configuration.value.cushionColor)
    const colorPrice = colorOption ? (colorOption.price || 0) : 0

    // Track this customization with price
    meshCustomizations.value[clickedMesh.value.name] = {
      colorHex: colorHexString.toUpperCase(),
      colorName: colorName,
      type: 'color',
      partType: clickedMesh.value.userData.partType || 'cushion',
      price: colorPrice
    }
    console.log('📝 Tracked customization:', clickedMesh.value.name, meshCustomizations.value[clickedMesh.value.name])

    // Handle material arrays
    if (Array.isArray(clickedMesh.value.material)) {
      clickedMesh.value.material.forEach((mat, index) => {
        mat.color.setHex(newColorHex)
        mat.roughness = 0.8
        mat.metalness = 0.1
        mat.needsUpdate = true
        console.log(`   ✅ Updated material ${index}: #${mat.color.getHexString()}`)
      })
    } else {
      clickedMesh.value.material.color.setHex(newColorHex)
      clickedMesh.value.material.roughness = 0.8
      clickedMesh.value.material.metalness = 0.1
      clickedMesh.value.material.needsUpdate = true
      console.log(`   ✅ Updated material: #${clickedMesh.value.material.color.getHexString()}`)
    }
    return
  }

  console.log('⚠️ No clicked mesh available')
}

// Apply a color to all cushion parts (for legacy single-color support)
const applyColorToAllCushions = (colorHex) => {
  if (!model) {
    console.warn('⚠️ Cannot apply color - no model loaded')
    return
  }

  const hexValue = typeof colorHex === 'string'
    ? parseInt(colorHex.replace('#', '0x'))
    : colorHex

  console.log('🎨 Applying color to all cushions:', colorHex)

  model.traverse((child) => {
    if (child.isMesh && child.userData.partType === 'cushion') {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          mat.color.setHex(hexValue)
          mat.needsUpdate = true
        })
      } else if (child.material) {
        child.material.color.setHex(hexValue)
        child.material.needsUpdate = true
      }
    }
  })
}

const updateFrameMaterials = () => {
  console.log('🔲 updateFrameMaterials called')
  console.log('clickedMesh:', clickedMesh.value ? clickedMesh.value.name : 'none')

  // If we have a specific clicked mesh, ALWAYS update it regardless of type
  if (clickedMesh.value && clickedMesh.value.material) {
    const frameColor = getFrameColor(configuration.value.frameMaterial)
    const materialProps = getFrameMaterialProperties(configuration.value.frameMaterial)
    console.log('🔲 Applying frame material to clicked mesh:', clickedMesh.value.name)
    console.log('🎨 Color hex:', frameColor.toString(16), 'Roughness:', materialProps.roughness)

    // Find the material name and price from options
    const frameOption = frameOptions.value.find(f => f.value === configuration.value.frameMaterial)
    const materialName = frameOption ? frameOption.label : configuration.value.frameMaterial
    const materialPrice = frameOption ? (frameOption.extraCost || 0) : 0

    // Track this customization with price
    meshCustomizations.value[clickedMesh.value.name] = {
      colorHex: '#' + frameColor.toString(16).padStart(6, '0').toUpperCase(),
      colorName: materialName,
      type: 'material',
      partType: clickedMesh.value.userData.partType || 'frame',
      price: materialPrice
    }
    console.log('📝 Tracked customization:', clickedMesh.value.name, meshCustomizations.value[clickedMesh.value.name])

    // Handle material arrays
    if (Array.isArray(clickedMesh.value.material)) {
      clickedMesh.value.material.forEach((mat, index) => {
        mat.color.setHex(frameColor)
        mat.roughness = materialProps.roughness
        mat.metalness = materialProps.metalness
        mat.needsUpdate = true
        console.log(`   ✅ Updated material ${index}: #${mat.color.getHexString()}`)
      })
    } else {
      clickedMesh.value.material.color.setHex(frameColor)
      clickedMesh.value.material.roughness = materialProps.roughness
      clickedMesh.value.material.metalness = materialProps.metalness
      clickedMesh.value.material.needsUpdate = true
      console.log(`   ✅ Updated material: #${clickedMesh.value.material.color.getHexString()}`)
    }
    return
  }

  console.log('⚠️ No clicked mesh available')
}




// ENHANCED model analysis - identify parts for clicking with PROPER material isolation
const identifySofaParts = () => {
  if (!model) return
  
  sofaParts = {
    cushions: [],
    frame: [],
    all: []
  }
  
  if (import.meta.env.DEV) console.log('🔍 Starting comprehensive model analysis for clicking...')
  
  model.traverse((child) => {
    if (child.isMesh) {
      const name = child.name.toLowerCase()
      const parentName = child.parent ? child.parent.name.toLowerCase() : ''
      
      if (import.meta.env.DEV) console.log(`🔍 Analyzing clickable mesh: "${child.name}" (parent: "${child.parent ? child.parent.name : 'ROOT'}")`)      
      
      child.castShadow = true
      child.receiveShadow = true
      
      // CRITICAL: FORCE material cloning for COMPLETE isolation
      if (child.material) {
        // Handle both single materials and material arrays
        if (Array.isArray(child.material)) {
          if (import.meta.env.DEV) console.log(`🔄 Cloning ${child.material.length} materials for: ${child.name}`)
          child.material = child.material.map((mat, index) => {
            const cloned = mat.clone()
            cloned.uuid = THREE.MathUtils.generateUUID() // Force new UUID
            if (import.meta.env.DEV) console.log(`   Material ${index}: ${mat.uuid} -> ${cloned.uuid}`)
            return cloned
          })
          child.userData.originalMaterial = child.material.map(mat => mat.clone())
        } else {
          if (import.meta.env.DEV) console.log(`🔄 Cloning single material for: ${child.name}`)
          const originalUuid = child.material.uuid
          child.material = child.material.clone()
          child.material.uuid = THREE.MathUtils.generateUUID() // Force new UUID
          child.userData.originalMaterial = child.material.clone()
          if (import.meta.env.DEV) console.log(`   Material: ${originalUuid} -> ${child.material.uuid}`)
        }
        
        // Store original properties for single material
        if (!Array.isArray(child.material)) {
          child.userData.originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000)
          child.userData.originalColor = child.material.color.clone()
        }
        
        // Mark that this mesh has been properly isolated
        child.userData.hasClonedMaterial = true
      }
      
      sofaParts.all.push(child)

      // Universal auto-mesh detection patterns for ANY GLB model
      let identified = false

      // Frame/main body patterns (glasses frames, sofa frames, furniture frames, etc.)
      const framePatterns = ['receiver', 'body', 'frame', 'main', 'base', 'structure', 'rim', 'temple', 'bridge']
      // Cushion/padding patterns (sofa cushions, seat padding, etc.)
      const cushionPatterns = ['cushion', 'seat', 'padding', 'back', 'fabric', 'upholstery', 'lens']
      // Leg/barrel/support patterns
      const legPatterns = ['barrel', 'tube', 'pipe', 'leg', 'support', 'foot', 'feet', 'stand']
      // Arms/pillows/accessories patterns
      const armPatterns = ['grip', 'handle', 'arm', 'pillow', 'rest', 'accessory', 'hinge']

      if (framePatterns.some(pattern => name.includes(pattern))) {
        sofaParts.frame.push(child)
        child.userData.partType = 'frame'
        if (import.meta.env.DEV) console.log(`✅ FRAME: ${child.name}`)
        identified = true
      } else if (cushionPatterns.some(pattern => name.includes(pattern))) {
        sofaParts.cushions.push(child)
        child.userData.partType = 'cushion'
        if (import.meta.env.DEV) console.log(`✅ CUSHION: ${child.name}`)
        identified = true
      } else if (legPatterns.some(pattern => name.includes(pattern))) {
        sofaParts.frame.push(child)
        child.userData.partType = 'frame'
        if (import.meta.env.DEV) console.log(`✅ LEG->FRAME: ${child.name}`)
        identified = true
      } else if (armPatterns.some(pattern => name.includes(pattern))) {
        sofaParts.cushions.push(child)
        child.userData.partType = 'cushion'
        if (import.meta.env.DEV) console.log(`✅ ARM->CUSHION: ${child.name}`)
        identified = true
      }

      // If no specific pattern matches, default to frame category (most versatile)
      if (!identified) {
        if (import.meta.env.DEV) console.log(`❓ UNIDENTIFIED: ${child.name}, assigning to frame category`)
        sofaParts.frame.push(child)
        child.userData.partType = 'frame'
      }

// Make mesh clickable
child.userData.isClickable = true
}
})
  
  if (import.meta.env.DEV) {
    console.log('🎯 FINAL CLICKABLE PARTS:')
    console.log(`   🟦 Cushions: ${sofaParts.cushions.length}`, sofaParts.cushions.map(p => p.name))
    console.log(`   🔲 Frame: ${sofaParts.frame.length}`, sofaParts.frame.map(p => p.name))
    console.log(`   📊 Total: ${sofaParts.all.length}`)
  }
  
  updateDebugStats()
}

const updateDebugStats = () => {
  debugStats.value = {
    totalMeshes: sofaParts.all.length,
    cushions: sofaParts.cushions.length,
    frame: sofaParts.frame.length
  }
}

// Helper functions for colors and materials
const getColorHex = (colorValue) => {
  // First, try to find in dynamic colorOptions (loaded from API)
  const colorOption = colorOptions.value.find(c => c.value === colorValue)
  if (colorOption && colorOption.hex) {
    return parseInt(colorOption.hex.replace('#', '0x'))
  }

  // Fallback to hardcoded map for backward compatibility
  const colorMap = {
    blue: 0x4A90E2,
    red: 0xE74C3C,
    green: 0x2ECC71,
    brown: 0x8B4513,
    purple: 0x9B59B6,
    orange: 0xE67E22
  }
  return colorMap[colorValue] || 0x4A90E2
}

const getFrameColor = (material) => {
  const colorMap = {
    oak: 0x8B4513,
    walnut: 0x654321,
    metal: 0x808080,
    'white-oak': 0xF5E6D3
  }
  return colorMap[material] || 0x8B4513
}


const getFrameMaterialProperties = (material) => {
  const properties = {
    oak: { roughness: 0.8, metalness: 0.0 },
    walnut: { roughness: 0.7, metalness: 0.0 },
    metal: { roughness: 0.3, metalness: 0.8 },
    'white-oak': { roughness: 0.9, metalness: 0.0 }
  }
  return properties[material] || properties.oak
}


// Initialize Three.js scene
const initThreeJS = async () => {
  if (!canvasContainer.value) {
    console.error('❌ Canvas container not found')
    return
  }

  console.log('🔧 Initializing Three.js scene with mesh clicking...')
  
  try {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8f9fa)
    
    const width = canvasContainer.value.clientWidth
    const height = canvasContainer.value.clientHeight
    
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000)
    // Set initial camera position - will be adjusted per model
    camera.position.set(4, 3, 4)

    
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.xr.enabled = true

    canvasContainer.value.appendChild(renderer.domElement)
    
    // Enhanced lighting setup - Multi-directional for complete coverage
    // High ambient base for everywhere
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85)
    scene.add(ambientLight)
    
    // Light 1 - Front-right (main)
    const light1 = new THREE.DirectionalLight(0xffffff, 0.9)
    light1.position.set(20, 20, 15)
    light1.castShadow = true
    light1.shadow.mapSize.width = 2048
    light1.shadow.mapSize.height = 2048
    light1.shadow.camera.near = 0.1
    light1.shadow.camera.far = 500
    light1.shadow.camera.left = -100
    light1.shadow.camera.right = 100
    light1.shadow.camera.top = 100
    light1.shadow.camera.bottom = -100
    scene.add(light1)
    
    // Light 2 - Back-left (fill)
    const light2 = new THREE.DirectionalLight(0xffffff, 0.8)
    light2.position.set(-25, 15, -20)
    scene.add(light2)
    
    // Light 3 - Top (overhead)
    const light3 = new THREE.DirectionalLight(0xffffff, 0.7)
    light3.position.set(0, 25, 0)
    scene.add(light3)
    
    // Light 4 - Bottom (under-lighting to prevent completely dark undersides)
    const light4 = new THREE.DirectionalLight(0xffffff, 0.6)
    light4.position.set(0, -15, 0)
    scene.add(light4)
    
    // Light 5 - Front-left (cross-fill)
    const light5 = new THREE.DirectionalLight(0xffffff, 0.7)
    light5.position.set(-20, 12, 25)
    scene.add(light5)
    
    // Light 6 - Back-right (cross-back)
    const light6 = new THREE.DirectionalLight(0xffffff, 0.6)
    light6.position.set(25, 10, -25)
    scene.add(light6)
    
    // Hemisphere light for natural ambient
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6)
    hemiLight.position.set(0, 40, 0)
    scene.add(hemiLight)
    
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 0.1  // Allow very close zoom
    controls.maxDistance = 100  // Allow far zoom out
    controls.maxPolarAngle = Math.PI // Allow full rotation
    controls.autoRotate = false
    
    raycaster = new THREE.Raycaster()
    mouse = new THREE.Vector2()
    
    // Add click event listener for mesh interaction
    canvasContainer.value.addEventListener('click', onMouseClick)
    
    await loadModel()

    // Use setAnimationLoop for WebXR compatibility (works for both normal and AR modes)
    renderer.setAnimationLoop(animate)
    
    const handleResize = () => {
      if (!canvasContainer.value || !camera || !renderer) return
      
      const width = canvasContainer.value.clientWidth
      const height = canvasContainer.value.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    
    window.addEventListener('resize', handleResize)
    
    console.log('✅ Three.js scene with clickable meshes initialized successfully')
    
  } catch (error) {
    console.error('❌ Failed to initialize Three.js:', error)
    isLoading.value = false
  }
}

// Load 3D model with analysis for clicking
const loadModel = async () => {
  // Check for dynamic model URL from Shopify context
  const shopifyContext = getShopifyContext()
  let modelPath = `/models/${selectedModel.value}`

  // Priority: 1. API product config model URL, 2. Full URL from modelUrl param, 3. modelFile param, 4. selected model
  if (productModelUrl.value) {
    modelPath = productModelUrl.value
    console.log(`📦 Loading model from product config: ${modelPath}`)
  } else if (shopifyContext.modelUrl) {
    modelPath = shopifyContext.modelUrl
    console.log(`📦 Loading model from Shopify media URL: ${modelPath}`)
  } else if (shopifyContext.modelFile) {
    modelPath = `/models/${shopifyContext.modelFile}`
    console.log(`📦 Loading model from file: ${modelPath}`)
  } else {
    console.log(`📦 Loading ${selectedModel.value} with clickable mesh analysis...`)
  }
  
  try {
    const loader = new GLTFLoader()
    
    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        modelPath,
        (gltf) => resolve(gltf),
        (progress) => {
          console.log('📈 Loading progress:', (progress.loaded / progress.total * 100) + '%')
        },
        (error) => reject(error)
      )
    })

    console.log('gltf', gltf.scene.children[0]);
    console.log('gltf', gltf.scene.children[0].userData);

    model = gltf.scene.children[0]
    // model.scale.setScalar(1)
    // model.position.set(0, 0, 0)
    
    // Analyze parts for clicking
    identifySofaParts()
    
    scene.add(model)
    
    // Smart auto-framing that works with different model sizes
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    console.log('📎 Model info:', {
      center: center,
      size: size,
      maxDimension: Math.max(size.x, size.y, size.z)
    })
    
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    
    // Calculate appropriate distance based on model size
    let cameraDistance = maxDim / (2 * Math.tan(fov / 2))
    
    // Adjust distance based on model size to prevent clipping
    if (maxDim < 1) {
      // Very small models (like watches, small objects)
      cameraDistance *= 2
    } else if (maxDim < 5) {
      // Medium models (furniture, appliances)
      cameraDistance *= 1.5
    } else {
      // Large models
      cameraDistance *= 1.2
    }
    
    console.log('📷 Camera distance calculated:', cameraDistance)
    
    // Position camera at calculated distance
    camera.position.set(
      center.x + cameraDistance * 0.7,
      center.y + cameraDistance * 0.5, 
      center.z + cameraDistance * 0.7
    )
    camera.lookAt(center)
    
    if (controls) {
      controls.target.copy(center)
      controls.update()
      
      // Adjust zoom limits based on model size
      controls.minDistance = maxDim * 0.1  // Allow close zoom relative to model
      controls.maxDistance = maxDim * 10   // Allow far zoom relative to model
      
      console.log('🔍 Zoom limits:', {
        minDistance: controls.minDistance,
        maxDistance: controls.maxDistance
      })
    }
    
    // Apply initial configuration
    // setTimeout(() => {
    //   updateCushionColors()
    //   updateFrameMaterials()
    // }, 500)
    
    isLoading.value = false
    console.log('✅ Model with clickable parts loaded successfully')

    // Apply saved mesh customizations if we have them (readonly mode)
    if (Object.keys(meshCustomizations.value).length > 0) {
      console.log('🎨 Applying saved mesh customizations after model load...')
      applySavedMeshCustomizations()
    }

  } catch (error) {
    console.error('❌ Failed to load model:', error)
    console.log('🔄 Creating fallback...')
    
    createFallbackModel()
    isLoading.value = false
  }
}

// Create simple fallback model if loading fails (no extra legs)
const createFallbackModel = () => {
  const sofaGroup = new THREE.Group()
  
  // Main body
  const bodyGeo = new THREE.BoxGeometry(2.5, 0.8, 1.2)
  const bodyMat = new THREE.MeshLambertMaterial({ color: getFrameColor(configuration.value.frameMaterial) })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.set(0, 0.4, 0)
  body.name = 'SofaBody'
  body.userData.partType = 'frame'
  body.userData.isClickable = true
  sofaParts.frame.push(body)
  sofaGroup.add(body)
  
  // Seat cushion
  const seatGeo = new THREE.BoxGeometry(2.3, 0.2, 1.0)
  const seatMat = new THREE.MeshLambertMaterial({ color: getColorHex(configuration.value.cushionColor) })
  const seat = new THREE.Mesh(seatGeo, seatMat)
  seat.position.set(0, 0.9, 0)
  seat.name = 'SeatCushion'
  seat.userData.partType = 'cushion'
  seat.userData.isClickable = true
  sofaParts.cushions.push(seat)
  sofaGroup.add(seat)
  
  sofaParts.all = [...sofaParts.cushions, ...sofaParts.frame]
  
  sofaParts.all.forEach(part => {
    part.castShadow = true
    part.receiveShadow = true
    if (part.material) {
      part.userData.originalMaterial = part.material.clone()
      part.userData.originalEmissive = new THREE.Color(0x000000)
      part.userData.originalColor = part.material.color.clone()
    }
  })
  
  model = sofaGroup
  scene.add(model)
  
  updateDebugStats()
  console.log('✅ Created fallback clickable sofa model (no extra parts)')
}

// Animation loop (dual-mode: normal 3D + WebXR AR)
const animate = (timestamp, frame) => {
  if (!renderer || !scene || !camera) return

  // AR mode: handle hit-test for surface detection (reticle only, before placement)
  if (isInArSession.value && frame && !arModelPlaced.value) {
    const referenceSpace = renderer.xr.getReferenceSpace()

    if (!hitTestSourceRequested) {
      const session = renderer.xr.getSession()
      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        session.requestHitTestSource({ space: viewerSpace }).then((source) => {
          hitTestSource = source
        })
      })
      hitTestSourceRequested = true
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource)
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0]
        const pose = hit.getPose(referenceSpace)
        if (pose) {
          if (reticle) {
            reticle.visible = true
            reticle.matrix.fromArray(pose.transform.matrix)
          }
        }
      } else if (reticle) {
        reticle.visible = false
      }
    }
  }

  // Normal mode: update orbit controls
  if (!isInArSession.value && controls) {
    controls.update()
  }

  renderer.render(scene, camera)
}

// ==================== SPACE AR (WebXR) ====================

const createReticle = () => {
  const ringGeo = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75
  })
  reticle = new THREE.Mesh(ringGeo, ringMat)
  reticle.matrixAutoUpdate = false
  reticle.visible = false
  scene.add(reticle)
}

const createMoveIndicator = () => {
  // Move indicator: a dashed ring + arrows under the model (like Shopify's AR)
  const group = new THREE.Group()

  // Outer ring
  const ringGeo = new THREE.RingGeometry(0.18, 0.22, 48).rotateX(-Math.PI / 2)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  })
  group.add(new THREE.Mesh(ringGeo, ringMat))

  // Four arrow indicators (N, S, E, W)
  const arrowShape = new THREE.Shape()
  arrowShape.moveTo(0, 0)
  arrowShape.lineTo(-0.03, -0.06)
  arrowShape.lineTo(0.03, -0.06)
  arrowShape.closePath()
  const arrowGeo = new THREE.ShapeGeometry(arrowShape)
  const arrowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  })

  const directions = [
    { pos: [0, 0, -0.28], rot: 0 },      // North
    { pos: [0, 0, 0.28], rot: Math.PI },   // South
    { pos: [0.28, 0, 0], rot: -Math.PI / 2 }, // East
    { pos: [-0.28, 0, 0], rot: Math.PI / 2 }  // West
  ]
  directions.forEach(d => {
    const arrow = new THREE.Mesh(arrowGeo, arrowMat)
    arrow.position.set(d.pos[0], 0.005, d.pos[2])
    arrow.rotation.x = -Math.PI / 2
    arrow.rotation.z = d.rot
    group.add(arrow)
  })

  moveIndicator = group
  moveIndicator.visible = false
  // Add to arModelContainer so it moves with the model
  if (arModelContainer) arModelContainer.add(moveIndicator)
}

const showMoveIndicator = () => {
  if (moveIndicator) moveIndicator.visible = true
}

const hideMoveIndicator = () => {
  if (moveIndicator) moveIndicator.visible = false
}

const onArSelect = () => {
  if (!arModelContainer) return

  // INITIAL PLACEMENT: place model at reticle (tap to place)
  if (!arModelPlaced.value) {
    if (!reticle || !reticle.visible) return
    arModelContainer.position.setFromMatrixPosition(reticle.matrix)
    arModelContainer.visible = true
    arModelPlaced.value = true
    reticle.visible = false

    // Show gesture hint briefly
    arGestureHint.value = true
    clearTimeout(arGestureHintTimeout)
    arGestureHintTimeout = setTimeout(() => { arGestureHint.value = false }, 4000)

    // Create move indicator and show it briefly
    createMoveIndicator()
    showMoveIndicator()
    console.log('🔲 Model placed at:', arModelContainer.position.toArray())
    return
  }

  // After placement, taps are ignored (gestures handle everything)
}

// Project screen-space touch delta to world-space movement on the ground plane
const projectTouchDeltaToWorld = (dx, dy) => {
  if (!renderer || !arModelContainer) return new THREE.Vector3()
  const xrCamera = renderer.xr.getCamera()
  // Get camera's forward and right vectors projected onto horizontal plane
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(xrCamera.quaternion)
  forward.y = 0
  forward.normalize()
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(xrCamera.quaternion)
  right.y = 0
  right.normalize()
  // Scale: larger move sensitivity when model is further away
  const distance = xrCamera.position.distanceTo(arModelContainer.position)
  const sensitivity = Math.max(0.001, distance * 0.002)
  const worldDelta = new THREE.Vector3()
  worldDelta.addScaledVector(right, dx * sensitivity)
  worldDelta.addScaledVector(forward, -dy * sensitivity) // Invert Y: drag down = move away
  return worldDelta
}

// Touch gesture handlers for Shopify-style AR interaction
const onArTouchStart = (e) => {
  if (!arModelPlaced.value || !arModelContainer) return
  const touches = e.touches || e.changedTouches
  arTouches.count = touches.length
  arTouches.prev = Array.from(touches).map(t => ({ x: t.clientX, y: t.clientY }))

  if (touches.length === 1) {
    arTouchMoveActive = true
    showMoveIndicator()
  }
  // Hide gesture hint on first interaction
  arGestureHint.value = false
  clearTimeout(arGestureHintTimeout)
}

const onArTouchMove = (e) => {
  if (!arModelPlaced.value || !arModelContainer) return
  const touches = e.touches || e.changedTouches
  const current = Array.from(touches).map(t => ({ x: t.clientX, y: t.clientY }))

  if (touches.length === 2 && arTouches.prev.length === 2) {
    // Two-finger gestures: pinch-to-scale + rotate

    // Calculate previous and current distance (pinch)
    const prevDist = Math.hypot(
      arTouches.prev[1].x - arTouches.prev[0].x,
      arTouches.prev[1].y - arTouches.prev[0].y
    )
    const currDist = Math.hypot(
      current[1].x - current[0].x,
      current[1].y - current[0].y
    )
    if (prevDist > 0) {
      const scaleFactor = currDist / prevDist
      const newScale = Math.max(0.25, Math.min(4, arModelContainer.scale.x * scaleFactor))
      arModelContainer.scale.setScalar(newScale)
    }

    // Calculate rotation from angle change between two fingers
    const prevAngle = Math.atan2(
      arTouches.prev[1].y - arTouches.prev[0].y,
      arTouches.prev[1].x - arTouches.prev[0].x
    )
    const currAngle = Math.atan2(
      current[1].y - current[0].y,
      current[1].x - current[0].x
    )
    const deltaAngle = currAngle - prevAngle
    arModelContainer.rotation.y -= deltaAngle

    // Disable single-finger move during two-finger gesture
    arTouchMoveActive = false
    hideMoveIndicator()
  } else if (touches.length === 1 && arTouches.prev.length >= 1 && arTouchMoveActive) {
    // Single-finger drag: move model on the ground plane
    const dx = current[0].x - arTouches.prev[0].x
    const dy = current[0].y - arTouches.prev[0].y
    const worldDelta = projectTouchDeltaToWorld(dx, dy)
    arModelContainer.position.add(worldDelta)
  }

  arTouches.prev = current
  arTouches.count = touches.length
}

const onArTouchEnd = (e) => {
  const remaining = e.touches ? e.touches.length : 0
  if (remaining === 0) {
    arTouchMoveActive = false
    hideMoveIndicator()
    arTouches.prev = []
    arTouches.count = 0
  } else if (remaining === 1) {
    // Went from two fingers to one: resume single-finger move
    const touches = e.touches
    arTouches.prev = [{ x: touches[0].clientX, y: touches[0].clientY }]
    arTouches.count = 1
    arTouchMoveActive = true
    showMoveIndicator()
  }
}

const onArSessionEnd = () => {
  console.log('🔲 AR session ended')
  isInArSession.value = false
  arModelPlaced.value = false
  arGestureHint.value = false
  arTouchMoveActive = false
  arTouches = { prev: [], count: 0 }
  hitTestSource = null
  hitTestSourceRequested = false
  clearTimeout(arGestureHintTimeout)

  // Remove touch gesture listeners
  const overlayRoot = document.getElementById('ar-overlay')
  if (overlayRoot) {
    overlayRoot.removeEventListener('touchstart', onArTouchStart)
    overlayRoot.removeEventListener('touchmove', onArTouchMove)
    overlayRoot.removeEventListener('touchend', onArTouchEnd)
    overlayRoot.removeEventListener('touchcancel', onArTouchEnd)
  }

  // Restore scene
  if (savedBackground !== null) {
    scene.background = savedBackground
    savedBackground = null
  }
  if (controls) controls.enabled = true
  if (model) model.visible = true

  // Clean up AR objects
  if (arModelContainer) {
    scene.remove(arModelContainer)
    arModelContainer = null
  }
  moveIndicator = null
  if (reticle) reticle.visible = false
}

const startArSession = async () => {
  if (!renderer || !navigator.xr) return

  try {
    // Save current state
    savedBackground = scene.background
    scene.background = null // Transparent for camera passthrough

    if (controls) controls.enabled = false
    if (model) model.visible = false

    // Create AR container with cloned customized model
    arModelContainer = new THREE.Group()
    arModelContainer.visible = false
    scene.add(arModelContainer)

    const arModel = model.clone(true)
    arModel.visible = true

    // Auto-scale: normalize largest dimension to ~1 meter for real-world proportions
    const box = new THREE.Box3().setFromObject(arModel)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0) {
      const scaleFactor = 1.0 / maxDim
      arModel.scale.multiplyScalar(scaleFactor)
    }

    // Center and ground the model by translating geometry (not position offset).
    // This ensures the model's base-center is at (0,0,0) so pinch-to-scale
    // grows uniformly in place without drifting toward/away from camera.
    const centeredBox = new THREE.Box3().setFromObject(arModel)
    const center = centeredBox.getCenter(new THREE.Vector3())
    const offsetX = -center.x
    const offsetY = -centeredBox.min.y  // Ground the model (bottom at y=0)
    const offsetZ = -center.z
    arModel.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry.translate(offsetX, offsetY, offsetZ)
      }
    })
    arModel.position.set(0, 0, 0)
    arModelContainer.add(arModel)

    // Create reticle
    if (!reticle) createReticle()
    reticle.visible = false

    // Build AR overlay element reference
    const overlayRoot = document.getElementById('ar-overlay')

    // Request immersive-ar session
    const sessionInit = { requiredFeatures: ['hit-test'] }
    if (overlayRoot) {
      sessionInit.optionalFeatures = ['dom-overlay']
      sessionInit.domOverlay = { root: overlayRoot }
    }

    const session = await navigator.xr.requestSession('immersive-ar', sessionInit)

    session.addEventListener('select', onArSelect)
    session.addEventListener('end', onArSessionEnd)

    // Register touch gesture handlers on the overlay for Shopify-style interaction
    if (overlayRoot) {
      overlayRoot.addEventListener('touchstart', onArTouchStart, { passive: true })
      overlayRoot.addEventListener('touchmove', onArTouchMove, { passive: true })
      overlayRoot.addEventListener('touchend', onArTouchEnd, { passive: true })
      overlayRoot.addEventListener('touchcancel', onArTouchEnd, { passive: true })
    }

    renderer.xr.setReferenceSpaceType('local')
    await renderer.xr.setSession(session)

    isInArSession.value = true
    hitTestSourceRequested = false
    hitTestSource = null

    console.log('🔲 AR session started')
  } catch (error) {
    console.error('🔲 Failed to start AR:', error)
    // Restore on failure
    if (savedBackground !== null) {
      scene.background = savedBackground
      savedBackground = null
    }
    if (controls) controls.enabled = true
    if (model) model.visible = true
    if (arModelContainer) {
      scene.remove(arModelContainer)
      arModelContainer = null
    }
  }
}

const adjustArHeight = (delta) => {
  if (arModelContainer) {
    arModelContainer.position.y += delta
  }
}

const exitArSession = async () => {
  const session = renderer?.xr?.getSession()
  if (session) await session.end()
}



// ==================== END SPACE AR ====================

// Check if embedded in Shopify iframe
const isEmbeddedInShopify = () => {
  return window.parent && window.parent !== window
}

// Get URL parameters for Shopify context
const getShopifyContext = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    productId: urlParams.get('product') || savedProductId.value,
    variantId: urlParams.get('variant'),
    shop: urlParams.get('shop'),
    handle: urlParams.get('handle'),
    currency: urlParams.get('currency') || 'USD',
    embedded: urlParams.get('embedded') === 'true',
    // Price from Shopify product (passed via URL param)
    price: urlParams.get('price') ? parseFloat(urlParams.get('price').replace(/[^0-9.]/g, '')) : null,
    // New: Support for dynamic model URLs from Shopify product media
    modelUrl: urlParams.get('modelUrl'),
    modelFile: urlParams.get('modelFile'),
    // Read-only mode for merchant viewing
    readonly: urlParams.get('readonly') === 'true',
    configId: urlParams.get('configId'),
    // Preview mode: admin previewing a product (no cart)
    preview: urlParams.get('preview') === 'true'
  }
}

// Check if in read-only mode (for merchant viewing)
const isReadOnlyMode = computed(() => {
  const context = getShopifyContext()
  return context.readonly === true
})

// Check if in preview mode (admin previewing a product — no cart)
const isPreviewMode = computed(() => {
  const context = getShopifyContext()
  return context.preview === true
})

// Load saved configuration from API (for readonly mode)
const loadSavedConfiguration = async () => {
  const context = getShopifyContext()
  if (!context.configId) return

  console.log('📥 Loading saved configuration:', context.configId)

  try {
    const response = await fetch(`https://iani-configurator-1.onrender.com/api/get-configuration/${context.configId}`)
    const data = await response.json()

    if (data.success && data.configuration) {
      const config = data.configuration

      console.log('✅ Configuration loaded:', config)

      // Set model URL and product context from saved configuration
      if (config.modelUrl && !productModelUrl.value) {
        productModelUrl.value = config.modelUrl
        console.log('📦 Model URL from saved config:', config.modelUrl)
      }
      if (config.productId) {
        savedProductId.value = config.productId
      }

      // Store the saved mesh customizations for later application
      const savedMeshCustomizations = config.meshCustomizations || {}
      console.log('📝 Mesh customizations to apply:', savedMeshCustomizations)

      // Restore mesh customizations ref (will be applied in loadModel after model loads)
      meshCustomizations.value = savedMeshCustomizations

      // Legacy fallback: Apply single color if no mesh customizations
      if (Object.keys(savedMeshCustomizations).length === 0 && config.colorHex) {
        configuration.value.cushionColor = 'custom'
        configuration.value.isCustomColor = true
        customColor.value = config.colorHex

        setTimeout(() => {
          if (model) {
            applyColorToAllCushions(config.colorHex)
          }
        }, 500)
      }

      // Apply material if saved
      if (config.materialName) {
        configuration.value.frameMaterial = config.materialName
      }

      // Update product name if available
      if (config.productName) {
        productName.value = config.productName
      }

      // Update price display if available
      if (config.totalPrice) {
        console.log('💰 Configured price from saved config:', config.totalPrice)
        // Store this price for display
        savedConfigPrice.value = config.totalPrice
      }
    }
  } catch (error) {
    console.error('❌ Failed to load configuration:', error)
  }
}

// Capture canvas screenshot as base64 image (thumbnail for cart)
const capturePreviewImage = () => {
  if (!renderer || !scene || !camera || !controls) {
    console.warn('⚠️ Cannot capture preview - renderer not ready')
    return null
  }

  try {
    // Store current camera position and selection state
    const originalPosition = camera.position.clone()
    const originalTarget = controls.target.clone()
    const hadSelection = selectedPart.value !== null

    // Clear selection to remove highlight outline
    if (hadSelection) {
      console.log('📸 Clearing selection for clean preview')
    }
    selectedPart.value = null
    clickedMesh.value = null

    // Calculate model bounding box to zoom in properly
    let modelToCapture = model
    if (modelToCapture) {
      const box = new THREE.Box3().setFromObject(modelToCapture)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)

      // Position camera to fill frame with model (front-facing view)
      const fov = camera.fov * (Math.PI / 180)
      const cameraDistance = (maxDim / 2) / Math.tan(fov / 2) * 1.2 // 1.2 for some padding

      // Set camera to front-facing position looking at model center
      camera.position.set(
        center.x + cameraDistance * 0.3, // Slight angle for 3D effect
        center.y + cameraDistance * 0.2, // Slightly above
        center.z + cameraDistance
      )
      controls.target.copy(center)
      camera.lookAt(center)
    } else {
      // Fallback: just zoom in more aggressively
      const zoomFactor = 0.4
      camera.position.set(
        originalPosition.x * zoomFactor,
        originalPosition.y * zoomFactor,
        originalPosition.z * zoomFactor
      )
      camera.lookAt(controls.target)
    }
    camera.updateProjectionMatrix()

    // Render the zoomed, selection-free frame
    renderer.render(scene, camera)

    // Get the canvas
    const canvas = renderer.domElement

    // Create a larger preview canvas (500x500 for clear visibility)
    const previewSize = 500
    const previewCanvas = document.createElement('canvas')
    previewCanvas.width = previewSize
    previewCanvas.height = previewSize
    const ctx = previewCanvas.getContext('2d')

    // Fill with light gray background (better than pure white for products)
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, previewSize, previewSize)

    // Calculate center crop to maintain aspect ratio
    const sourceSize = Math.min(canvas.width, canvas.height)
    const sourceX = (canvas.width - sourceSize) / 2
    const sourceY = (canvas.height - sourceSize) / 2

    // Draw cropped and scaled image
    ctx.drawImage(
      canvas,
      sourceX, sourceY, sourceSize, sourceSize, // Source rectangle (centered square)
      0, 0, previewSize, previewSize // Destination rectangle
    )

    // Convert to base64 with good quality
    const dataUrl = previewCanvas.toDataURL('image/jpeg', 0.9)

    // Restore camera position
    camera.position.copy(originalPosition)
    controls.target.copy(originalTarget)
    camera.lookAt(controls.target)
    camera.updateProjectionMatrix()

    // Re-render with original view
    renderer.render(scene, camera)

    console.log('📸 Preview captured (zoomed on model), size:', Math.round(dataUrl.length / 1024), 'KB')
    return dataUrl
  } catch (error) {
    console.error('❌ Failed to capture preview:', error)
    return null
  }
}

// Add to cart function
const addToCart = async () => {
  console.log('🛒 Adding configured product to cart...')

  try {
    isAddingToCart.value = true

    // Capture preview image before adding to cart
    const previewImage = capturePreviewImage()

    // Build list of all customized parts with their colors
    const partCustomizations = Object.entries(meshCustomizations.value).map(([meshName, config]) => ({
      part: meshName,
      colorName: config.colorName,
      colorHex: config.colorHex,
      type: config.type
    }))

    // Build a summary of unique color names used
    const uniqueColors = [...new Set(partCustomizations.map(p => p.colorName))]
    console.log('📝 Part customizations:', partCustomizations)
    console.log('🎨 Unique colors:', uniqueColors)

    // Build clean configuration for cart display (visible to customer)
    // Properties starting with _ are hidden in Shopify cart
    const fullConfiguration = {
      // Hidden properties (prefixed with _)
      _cushionColor: configuration.value.cushionColor,
      _frameMaterial: configuration.value.frameMaterial,
      _size: configuration.value.size,
      _model: selectedModel.value,
      // Store all mesh customizations for restoration
      _meshCustomizations: JSON.stringify(meshCustomizations.value)
    }

    // Add visible customization info - show each part's color
    if (partCustomizations.length > 0) {
      // Group by part name for cleaner display
      partCustomizations.forEach((customization, index) => {
        // Create readable part name from mesh name
        const partLabel = customization.part
          .replace(/_/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
        fullConfiguration[`Part ${index + 1}: ${partLabel}`] = customization.colorName
      })
    }

    const shopifyContext = getShopifyContext()

    // Use calculatedPrice which already includes base price + all extra costs from customizations
    const finalPrice = calculatedPrice.value

    const cartData = {
      type: 'IANI_ADD_TO_CART',
      payload: {
        productId: shopifyContext.productId || 'customizable-product',
        variantId: shopifyContext.variantId,
        configuration: fullConfiguration,
        // Include calculated price (base + all customization extras)
        price: Number(finalPrice),
        // Include all color names for order display
        colorName: uniqueColors.join(', '),
        // Include mesh customizations for restoration (deep clone to avoid Proxy)
        meshCustomizations: JSON.parse(JSON.stringify(meshCustomizations.value)),
        quantity: 1,
        timestamp: new Date().toISOString(),
        configurationId: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        previewImage: previewImage // Include preview image
      }
    }

    console.log('📦 Cart data:', cartData)

    // If embedded in Shopify, send message to parent
    if (isEmbeddedInShopify()) {
      console.log('📤 Sending ADD_TO_CART message to Shopify parent...')
      window.parent.postMessage(cartData, '*')

      // Show success notification
      const notification = document.createElement('div')
      notification.textContent = `✅ Adding to cart...`
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #28a745;
        color: white; padding: 16px 24px; border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2); z-index: 10000;
        font-weight: 600;
      `
      document.body.appendChild(notification)
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 3000)
    } else {
      // Not embedded - simulate cart addition for standalone testing
      console.log('🔧 Standalone mode - simulating cart addition')
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Show success notification
      const notification = document.createElement('div')
      notification.textContent = `✅ Custom sofa added to cart! ($${calculatedPrice.value.toFixed(2)})`
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #28a745;
        color: white; padding: 16px 24px; border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2); z-index: 10000;
        font-weight: 600;
      `
      document.body.appendChild(notification)
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 4000)
    }

  } catch (error) {
    console.error('❌ Failed to add to cart:', error)
  } finally {
    isAddingToCart.value = false
  }
}

// Handle messages from Shopify parent
const handleShopifyMessage = (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return

  console.log('📥 Received message from parent:', data.type)

  if (data.type === 'IANI_INIT') {
    console.log('✅ Shopify context received:', data.payload)
  }

  if (data.type === 'IANI_CART_SUCCESS') {
    console.log('✅ Cart addition successful:', data.payload)
    const notification = document.createElement('div')
    notification.textContent = `✅ Added to cart!`
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; background: #28a745;
      color: white; padding: 16px 24px; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2); z-index: 10000;
      font-weight: 600;
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 3000)
  }

  if (data.type === 'IANI_CART_ERROR') {
    console.error('❌ Cart error:', data.payload)
    const notification = document.createElement('div')
    notification.textContent = `❌ Failed to add to cart: ${data.payload?.message || 'Unknown error'}`
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; background: #dc3545;
      color: white; padding: 16px 24px; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2); z-index: 10000;
      font-weight: 600;
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 5000)
  }
}

// Lifecycle
onMounted(async () => {
  console.log('🚀 Clickable mesh configurator mounted')

  // Setup message listener for Shopify communication
  window.addEventListener('message', handleShopifyMessage)

  // Signal to parent that configurator is ready
  if (isEmbeddedInShopify()) {
    console.log('📤 Sending IANI_READY to parent')
    window.parent.postMessage({ type: 'IANI_READY' }, '*')
  }

  // In readonly mode, load saved configuration first (provides model URL + product context)
  if (isReadOnlyMode.value) {
    console.log('👁️ Read-only mode detected, loading saved configuration...')
    await loadSavedConfiguration()
  }

  // Load product configuration from merchant's settings
  await loadProductConfig()

  setTimeout(async () => {
    await initThreeJS()

    // Check WebXR AR support after renderer is ready
    if (spaceArEnabled.value && navigator.xr) {
      try {
        const supported = await navigator.xr.isSessionSupported('immersive-ar')
        spaceArSupported.value = supported
        console.log('🔲 WebXR immersive-ar supported:', supported)
      } catch (e) {
        console.warn('🔲 WebXR check failed:', e)
        spaceArSupported.value = false
      }
    }
  }, 100)

  // Force layout recalculation on mobile to fix button visibility issue
  // This triggers a reflow which ensures the flex layout is properly calculated
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'))
    // Double-check scroll position to make button visible
    const configSection = document.querySelector('.config-section')
    if (configSection && window.innerWidth <= 768) {
      configSection.scrollTop = 0
    }
  }, 300)
})

onUnmounted(() => {
  console.log('🧹 Cleaning up configurator...')

  // Remove Shopify message listener
  window.removeEventListener('message', handleShopifyMessage)

  if (canvasContainer.value) {
    canvasContainer.value.removeEventListener('click', onMouseClick)
  }

  // End any active AR session
  if (renderer?.xr?.getSession()) {
    renderer.xr.getSession().end()
  }
  if (renderer) {
    renderer.setAnimationLoop(null)
    renderer.dispose()
  }
  if (scene) {
    scene.clear()
  }
})
</script>

<style scoped>
.configurator-fullscreen {
  display: flex;
  height: 100vh;
  width: 100vw;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
}

.viewer-section {
  flex: 1;
  position: relative;
  background: #f8f9fa;
  border-right: 1px solid #e1e5e9;
}

.viewer-container {
  width: 100%;
  height: 100%;
  cursor: pointer;
}

/* Click Instructions */
.click-instructions {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: rgba(0, 102, 204, 0.9);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  z-index: 15;
  animation: pulse-instruction 3s infinite;
}

@keyframes pulse-instruction {
  0%, 70%, 100% { opacity: 0.9; }
  35% { opacity: 0.7; }
}

/* Read-only Mode Styles */
.readonly-banner {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  background: linear-gradient(135deg, #059669, #10b981);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  z-index: 15;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.readonly-subtitle {
  color: #059669 !important;
  font-weight: 600 !important;
}

.config-section.readonly-mode {
  background: linear-gradient(to bottom, #f0fdf4, #ffffff);
}

.readonly-summary {
  padding: 8px 0;
}

.readonly-summary h3 {
  font-size: 16px;
  margin: 0 0 16px 0;
  color: #374151;
}

.summary-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-item.total {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 2px solid #e5e7eb;
  border-bottom: none;
}

.summary-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.summary-value {
  font-size: 14px;
  color: #111827;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-value.color-code {
  font-family: monospace;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.summary-value.price {
  font-size: 18px;
  color: #059669;
}

.color-preview-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  flex-shrink: 0;
}

.readonly-hint {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
  font-style: italic;
}

.clickable-part {
  cursor: pointer;
  padding: 8px 10px !important;
  border-radius: 6px;
  transition: background-color 0.2s, box-shadow 0.2s;
  border: 1px solid transparent;
}

.clickable-part:hover {
  background: #f0f9ff;
  border-color: #bae6fd;
}

.clickable-part.highlighted-part {
  background: #dbeafe;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.color-code-small {
  display: block;
  font-size: 11px;
  color: #9ca3af;
  font-family: monospace;
}

.readonly-instructions {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 12px;
}

.readonly-instructions p {
  margin: 4px 0;
  font-size: 13px;
  color: #0369a1;
}

/* Debug Panel */
.debug-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  min-width: 220px;
  max-width: 300px;
  z-index: 15;
}

.debug-panel h4 {
  margin: 0 0 12px 0;
  color: #4CAF50;
}

.model-selector {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #444;
}

.model-selector label {
  display: block;
  margin-bottom: 6px;
  color: #FFD700;
  font-weight: bold;
  font-size: 11px;
}

.model-dropdown {
  width: 100%;
  padding: 6px 8px;
  background: #333;
  color: white;
  border: 1px solid #555;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.model-dropdown:hover {
  border-color: #777;
}

.model-dropdown:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 1px #4CAF50;
}

.model-dropdown option {
  background: #333;
  color: white;
  padding: 4px;
}

.debug-stats div {
  margin: 4px 0;
}

.debug-panel button {
  background: #2196F3;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  margin-top: 8px;
}

.debug-toggle {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  z-index: 16;
}

.debug-toggle:hover {
  background: rgba(0, 0, 0, 0.9);
}



/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(248, 249, 250, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #e1e5e9;
  border-top: 4px solid #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Skeleton loader */
@keyframes skel-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.skel {
  background: #e5e7eb;
  border-radius: 6px;
  animation: skel-pulse 1.4s ease-in-out infinite;
}
.skel-title       { height: 24px; width: 55%; margin-bottom: 10px; }
.skel-subtitle    { height: 14px; width: 40%; }
.skel-price-sm    { height: 14px; width: 30%; margin-bottom: 8px; }
.skel-price-lg    { height: 36px; width: 50%; }
.skel-section-label {
  height: 14px; width: 35%;
  background: #e5e7eb;
  border-radius: 6px;
  margin: 24px 0 16px;
  animation: skel-pulse 1.4s ease-in-out infinite;
}
.skel-rows        { display: flex; flex-direction: column; gap: 4px; }
.skel-row         { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
.skel-dot         { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.skel-row-label   { height: 13px; width: 30%; flex-shrink: 0; }
.skel-row-value   { height: 13px; width: 25%; margin-left: auto; }
.skel-row-value-wide { height: 13px; width: 35%; margin-left: auto; }
.skel-divider     { height: 1px; background: #e5e7eb; margin: 8px 0; }

/* Configuration Panel */
.config-section {
  width: 420px;
  background: white;
  border-left: 1px solid #e1e5e9;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.config-content {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.config-header {
  margin-bottom: 24px;
  border-bottom: 1px solid #e1e5e9;
  padding-bottom: 20px;
}

.config-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.product-description {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.price-section {
  margin-bottom: 32px;
  padding: 16px 0;
  border-bottom: 1px solid #e1e5e9;
}

.base-price-crossed {
  display: flex;
  align-items: baseline;
  gap: 4px;
  text-decoration: line-through;
  opacity: 0.5;
  margin-bottom: 4px;
}

.base-price-crossed .currency {
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.base-price-crossed .amount {
  font-size: 18px;
  font-weight: 500;
  color: #666;
}

.current-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.currency {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.amount {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
}

.config-options {
  flex: 1;
  margin-bottom: 24px;
}

.option-group {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.option-group:last-child {
  border-bottom: none;
}

.back-button {
  display: inline-block;
  color: #0066cc;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.back-button:hover {
  background: #f0f7ff;
  color: #0052a3;
}

/* Customization Menu */
.customization-menu {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.customization-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 20px 0;
}

.custom-btn {
  padding: 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.custom-btn:hover {
  border-color: #0066cc;
  background: #f0f7ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.15);
}

.custom-btn.colors-btn {
  border-color: #4A90E2;
}

.custom-btn.frame-btn {
  border-color: #8B4513;
}

.btn-icon {
  font-size: 24px;
}

.btn-text {
  font-size: 13px;
}

.customization-panel {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e1e5e9;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.panel-subtitle {
  font-size: 13px;
  color: #666;
  margin: 0 0 16px 0;
}

.option-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.option-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px 0;
}

.overview-section {
  margin-bottom: 32px;
}

.quick-overview h3 {
  font-size: 18px;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.quick-overview p {
  color: #666;
  margin: 0 0 20px 0;
}

.feature-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  background: white;
}

.feature-item:hover {
  border-color: #0066cc;
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.15);
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.feature-name {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 12px;
  color: #666;
}

.color-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.color-option {
  padding: 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: white;
}

.color-option:hover {
  border-color: #0066cc;
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.15);
  transform: translateY(-2px);
}

.color-option.active {
  border-color: #0066cc;
  background: #f0f7ff;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.2);
  transform: translateY(-1px);
}

.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-bottom: 8px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.color-option:hover .color-swatch {
  transform: scale(1.1);
}

.color-name {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.color-price {
  font-size: 11px;
  color: #666;
  font-weight: 500;
}

.material-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.material-option {
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.material-option:hover {
  border-color: #0066cc;
  background: #f9f9f9;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 102, 204, 0.1);
}

.material-option.active {
  border-color: #0066cc;
  background: #f0f7ff;
  box-shadow: 0 3px 10px rgba(0, 102, 204, 0.15);
}

.material-name {
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.material-description {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.material-price {
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 12px;
  color: #28a745;
  font-weight: 600;
}




.cart-section {
  margin-top: auto;
  padding-top: 24px;
  border-top: 1px solid #e1e5e9;
  flex-shrink: 0;
}

.add-to-cart-btn {
  width: 100%;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: white;
  border: none;
  padding: 18px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(255, 107, 53, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-to-cart-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
  background: linear-gradient(135deg, #ff5722, #e68900);
}

.add-to-cart-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Virtual Try-On Button */
.try-on-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  margin-bottom: 12px;
}

.try-on-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  background: linear-gradient(135deg, #5a6fd6, #6b429a);
}

.try-on-btn svg {
  flex-shrink: 0;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .configurator-fullscreen {
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .viewer-section {
    flex: 0 0 55vh;
    min-height: 0;
    overflow: hidden;
  }

  .config-section {
    width: 100%;
    flex: 1 1 45vh;
    min-height: 0;
    border-left: none;
    border-top: 1px solid #e1e5e9;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .config-content {
    padding: 16px;
    padding-bottom: 100px;
  }

  .cart-section {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 16px;
    margin: 0;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
  }

  .click-instructions {
    font-size: 12px;
    padding: 8px 12px;
  }
}

/* Subsection Styles */
.subsection {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.subsection:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.subsection-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Custom Color Section */
.custom-color-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker-input {
  width: 60px;
  height: 60px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-picker-input:hover {
  border-color: #0066cc;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.2);
}

.color-picker-input:active {
  transform: scale(0.98);
}

.custom-color-preview {
  flex: 1;
  height: 60px;
  border-radius: 8px;
  border: 2px solid rgba(0, 102, 204, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.custom-color-label {
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #333;
  letter-spacing: 1px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* Space AR Styles */
.space-ar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 20px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-bottom: 8px;
}

.space-ar-btn:hover {
  opacity: 0.9;
}

.ar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  pointer-events: none;
}

.ar-overlay--active {
  display: block;
  pointer-events: auto;
}

.ar-instructions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  background: rgba(0, 0, 0, 0.5);
  padding: 16px 24px;
  border-radius: 12px;
  font-size: 16px;
  text-align: center;
  pointer-events: none;
  backdrop-filter: blur(4px);
}

.ar-instructions--hint {
  top: auto;
  bottom: 100px;
  transform: translateX(-50%);
  font-size: 14px;
  padding: 12px 20px;
  animation: ar-hint-fade 4s ease-out forwards;
}

@keyframes ar-hint-fade {
  0%, 70% { opacity: 1; }
  100% { opacity: 0; }
}

.ar-exit-btn {
  position: absolute;
  top: 40px;
  right: 20px;
  padding: 10px 20px;
  background: rgba(220, 38, 38, 0.8);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  pointer-events: auto;
  backdrop-filter: blur(4px);
}

.ar-exit-btn:active {
  background: rgba(220, 38, 38, 1);
}

.ar-height-controls {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: auto;
}

.ar-height-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.85);
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.ar-height-btn:active {
  background: rgba(255, 255, 255, 1);
  transform: scale(0.9);
}
</style>