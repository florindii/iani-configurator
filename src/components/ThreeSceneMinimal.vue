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
          <div>Pillows: {{ debugStats.pillows }}</div>
          <div>Legs: {{ debugStats.legs }}</div>
        </div>
        <button @click="exportModelStructure">Export Structure</button>
      </div>
      
      <!-- Debug Toggle -->
      <div class="debug-toggle" @click="showDebugInfo = !showDebugInfo">
        🔍
      </div>
      
      <!-- Click Instructions -->
      <div class="click-instructions">
        <div class="instruction-text">💡 Click on different parts of the sofa to customize them</div>
      </div>
      
      <!-- Loading Overlay -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Loading 3D model...</p>
      </div>
    </div>

    <!-- Right Side: Configuration Panel -->
    <div class="config-section">
      <div class="config-content">
        <!-- Header -->
        <div class="config-header">
          <h2>🛋️ {{ productName }}</h2>
          <p class="product-description">
            {{ selectedPart ? `Customizing: ${selectedPart.name}` : 'Click on parts to customize' }}
          </p>
        </div>

        <!-- Price Display -->
        <div class="price-section">
          <div class="current-price">
            <span class="currency">{{ currencySymbol }}</span>
            <span class="amount">{{ formatPrice(calculatedPrice) }}</span>
          </div>
        </div>

        <!-- Configuration Options -->
        <div class="config-options">
          
          <!-- Default Overview -->
          <div v-if="!selectedPart" class="overview-section">
            <div class="quick-overview">
              <h3>✨ How to Customize</h3>
              <p>Click directly on the model parts to customize them</p>
            </div>
          </div>

          <!-- Main Customization Menu After Mesh Selection -->
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
                    <span class="color-price">${{ color.price.toFixed(0) }}</span>
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
                  <span class="material-price">+${{ frame.extraCost }}</span>
                </div>
              </div>
            </div>
          </div>



        </div>

        <!-- Add to Cart Button -->
        <div class="cart-section">
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

          <button
            @click="addToCart"
            :disabled="!model || isAddingToCart"
            class="add-to-cart-btn">
            <span v-if="isAddingToCart">Adding to Cart...</span>
            <span v-else>Add to Cart - {{ currencySymbol }}{{ formatPrice(calculatedPrice) }}</span>
          </button>
        </div>
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
  frame: 0,
  pillows: 0,
  legs: 0
})

const showCustomizationPanel = ref(null)
const selectedPart = ref(null)
const clickedMesh = ref(null)

// Three.js variables
let scene, camera, renderer, model, controls, raycaster, mouse

// Store references to different parts of the sofa
let sofaParts = {
  cushions: [],
  frame: [],
  pillows: [],
  legs: [],
  all: []
}

// Custom color state
const customColor = ref('#4A90E2')

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

// Shopify price context (from URL params)
const shopifyBasePrice = ref(null)
const shopifyCurrency = ref('USD')

// Virtual Try-On state
const tryOnEnabled = ref(false)
const tryOnType = ref('glasses')
const tryOnOffsetY = ref(0) // Vertical offset percentage
const tryOnScale = ref(1) // Scale multiplier
const showTryOnModal = ref(false)
const tryOnModelUrl = ref('')
const tryOnPreviewImage = ref(null) // Captured try-on image for cart

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
    const apiUrls = [
      `https://iani-configurator-1.onrender.com/api/product-config/${context.productId}?shop=${context.shop}`,
      `https://iani-configurator.vercel.app/api/product-config?productId=${context.productId}&shop=${context.shop}`
    ]

    for (const apiUrl of apiUrls) {
      try {
        console.log('📡 Fetching product config from:', apiUrl)
        const response = await fetch(apiUrl)
        if (!response.ok) continue

        const data = await response.json()
        console.log('📦 Received product config:', data)

        if (data.config) {
          // Update product name
          if (data.config.name) {
            productName.value = data.config.name
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

const pillowOptions = ref([
  { label: 'Classic', value: 'classic', color: '#E8E8E8', extraCost: 0 },
  { label: 'Velvet Blue', value: 'velvet-blue', color: '#3A5FCD', extraCost: 35 },
  { label: 'Golden', value: 'golden', color: '#DAA520', extraCost: 40 },
  { label: 'Burgundy', value: 'burgundy', color: '#8B0000', extraCost: 35 }
])

const legOptions = ref([
  { label: 'Wooden Legs', value: 'wooden', color: '#8B4513', extraCost: 0 },
  { label: 'Metal Legs', value: 'metal', color: '#696969', extraCost: 60 },
  { label: 'Brass Legs', value: 'brass', color: '#B5651D', extraCost: 80 },
  { label: 'Black Metal', value: 'black-metal', color: '#2F4F4F', extraCost: 65 }
])



// Computed price - uses Shopify product price as base when available
const calculatedPrice = computed(() => {
  // Get the selected color option
  const selectedColor = colorOptions.value.find(c => c.value === configuration.value.cushionColor)

  // Determine base price:
  // - If Shopify provides a price, use it as the starting point
  // - Otherwise use the selected color's price, or fallback to default
  let basePrice = shopifyBasePrice.value || (selectedColor?.price) || 299.99

  // If we have Shopify base price AND color options with different prices,
  // we need to add the color price difference from the lowest/default color
  if (shopifyBasePrice.value && selectedColor && colorOptions.value.length > 0) {
    // Find the default/first color to use as baseline
    const defaultColor = colorOptions.value.find(c => c.isDefault) || colorOptions.value[0]
    if (defaultColor && selectedColor.price !== defaultColor.price) {
      // Add the price difference between selected color and default color
      const colorPriceDiff = selectedColor.price - defaultColor.price
      basePrice += colorPriceDiff
    }
  }

  // Add extra costs from selected options
  const selectedFrame = frameOptions.value.find(f => f.value === configuration.value.frameMaterial)
  if (selectedFrame) basePrice += selectedFrame.extraCost

  const selectedPillow = pillowOptions.value.find(p => p.value === configuration.value.pillowStyle)
  if (selectedPillow) basePrice += selectedPillow.extraCost

  const selectedLeg = legOptions.value.find(l => l.value === configuration.value.legStyle)
  if (selectedLeg) basePrice += selectedLeg.extraCost

  return basePrice
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

const getPillowLabel = () => {
  const selected = pillowOptions.value.find(p => p.value === configuration.value.pillowStyle)
  return selected ? selected.label : 'Select Style'
}

const getLegLabel = () => {
  const selected = legOptions.value.find(l => l.value === configuration.value.legStyle)
  return selected ? selected.label : 'Select Style'
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
        frameMaterial: configuration.value.frameMaterial,
        pillowStyle: configuration.value.pillowStyle,
        legStyle: configuration.value.legStyle
      }
    }
    
    // Update the global configuration to match this mesh's current config
    const partType = targetMesh.userData.partType
    if (partType === 'cushion') {
      configuration.value.cushionColor = targetMesh.userData.customConfig.cushionColor
    } else if (partType === 'frame') {
      configuration.value.frameMaterial = targetMesh.userData.customConfig.frameMaterial
    } else if (partType === 'pillow') {
      configuration.value.pillowStyle = targetMesh.userData.customConfig.pillowStyle
    } else if (partType === 'leg') {
      configuration.value.legStyle = targetMesh.userData.customConfig.legStyle
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



const highlightClickedMesh = (mesh) => {
  console.log("🚀 ~ highlightClickedMesh ~ mesh:", mesh)
  // Remove previous highlights from ALL meshes
  sofaParts.all.forEach(part => {
    if (part.userData.isHighlighted) {
      if (part.userData.originalEmissive) {
        part.material.emissive.copy(part.userData.originalEmissive)
      }
      part.userData.isHighlighted = false
    }
  })
  
  // Highlight the newly clicked mesh
  if (mesh.material) {
    if (!mesh.userData.originalEmissive) {
      mesh.userData.originalEmissive = mesh.material.emissive.clone()
    }
    mesh.material.emissive.setHex(0x666666)
    mesh.userData.isHighlighted = true
    console.log('✨ Highlighted mesh:', mesh.name)
  }
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
    pillows: [],
    legs: [],
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



const clearSelection = () => {
  selectedPart.value = null
  clickedMesh.value = null
  console.log('🗑️ Cleared mesh selection')

  // Remove highlights from all meshes
  sofaParts.all.forEach(part => {
    if (part.userData.isHighlighted) {
      if (part.userData.originalEmissive) {
        part.material.emissive.copy(part.userData.originalEmissive)
      }
      part.userData.isHighlighted = false
    }
  })
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
  updateCushionColors()
}

// Set custom color
const setCustomColor = () => {
  console.log('🎨 Setting custom color to:', customColor.value)
  configuration.value.cushionColor = 'custom'
  configuration.value.isCustomColor = true
  configuration.value.customHex = customColor.value
  updateCushionColors()
}

const updateCushionColor = (colorValue) => {
  console.log('🎨 Updating cushion color to:', colorValue)
  configuration.value.cushionColor = colorValue
  configuration.value.isCustomColor = false
  configuration.value.customHex = null
  updateCushionColors()
}

const updateFrameMaterial = (material) => {
  console.log('🪵 Updating frame material to:', material)
  configuration.value.frameMaterial = material
  updateFrameMaterials()
}

const updatePillowStyle = (style) => {
  console.log('🟨 Updating pillow style to:', style)
  configuration.value.pillowStyle = style
  updatePillowStyles()
}

const updateLegStyle = (style) => {
  console.log('⚫ Updating leg style to:', style)
  configuration.value.legStyle = style
  updateLegStyles()
}



// Real-time 3D model update functions (work with existing model parts only)
const updateCushionColors = () => {
  console.log('🟦 updateCushionColors called')
  console.log('clickedMesh:', clickedMesh.value ? clickedMesh.value.name : 'none')
  
  // If we have a specific clicked mesh, ALWAYS update it regardless of type
  if (clickedMesh.value && clickedMesh.value.material) {
    // Support custom colors
    let newColorHex = 0x4A90E2 // default blue
    
    if (configuration.value.isCustomColor && configuration.value.customHex) {
      newColorHex = parseInt(configuration.value.customHex.replace('#', '0x'))
      console.log('🎨 Using custom color:', configuration.value.customHex)
    } else {
      newColorHex = getColorHex(configuration.value.cushionColor)
      console.log('🎨 Using preset color:', configuration.value.cushionColor)
    }
    
    console.log('🟦 Applying color to clicked mesh:', clickedMesh.value.name, 'Hex:', newColorHex.toString(16))
    
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

const updateFrameMaterials = () => {
  console.log('🔲 updateFrameMaterials called')
  console.log('clickedMesh:', clickedMesh.value ? clickedMesh.value.name : 'none')
  
  // If we have a specific clicked mesh, ALWAYS update it regardless of type
  if (clickedMesh.value && clickedMesh.value.material) {
    const frameColor = getFrameColor(configuration.value.frameMaterial)
    const materialProps = getFrameMaterialProperties(configuration.value.frameMaterial)
    console.log('🔲 Applying frame material to clicked mesh:', clickedMesh.value.name)
    console.log('🎨 Color hex:', frameColor.toString(16), 'Roughness:', materialProps.roughness)
    
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

const updatePillowStyles = () => {
  console.log('🟨 updatePillowStyles called - Parts available:', sofaParts.pillows.length)
  
  // If we have a specific clicked mesh, only update that one
  if (clickedMesh.value && clickedMesh.value.userData.partType === 'pillow') {
    const pillowColor = getPillowColor(configuration.value.pillowStyle)
    const pillowProps = getPillowMaterialProperties(configuration.value.pillowStyle)
    console.log('🟨 Applying pillow style to clicked mesh only:', clickedMesh.value.name)
    
    if (clickedMesh.value.material) {
      // Handle material arrays
      if (Array.isArray(clickedMesh.value.material)) {
        clickedMesh.value.material.forEach((mat, index) => {
          mat.color.setHex(pillowColor)
          mat.roughness = pillowProps.roughness
          mat.metalness = pillowProps.metalness
          mat.needsUpdate = true
          console.log(`   - Updated material ${index}: #${mat.color.getHexString()}`)
        })
      } else {
        clickedMesh.value.material.color.setHex(pillowColor)
        clickedMesh.value.material.roughness = pillowProps.roughness
        clickedMesh.value.material.metalness = pillowProps.metalness
        clickedMesh.value.material.needsUpdate = true
        console.log(`   - New color: #${clickedMesh.value.material.color.getHexString()}`)
      }
      
      // Save the configuration to this specific mesh
      if (!clickedMesh.value.userData.customConfig) {
        clickedMesh.value.userData.customConfig = {}
      }
      clickedMesh.value.userData.customConfig.pillowStyle = configuration.value.pillowStyle
      console.log(`   - Saved config to mesh:`, clickedMesh.value.userData.customConfig)
    }
    return
  }
  
  // Otherwise, update all pillows (initial load or hotspot click)
  if (!sofaParts.pillows.length) {
    console.log('⚠️ No pillow parts found in the model')
    return
  }
  
  const pillowColor = getPillowColor(configuration.value.pillowStyle)
  const pillowProps = getPillowMaterialProperties(configuration.value.pillowStyle)
  
  console.log('🟨 Applying pillow style:', configuration.value.pillowStyle, 'color:', pillowColor.toString(16))
  
  sofaParts.pillows.forEach((pillow, index) => {
    console.log(`   Updating pillow ${index}: ${pillow.name}`)
    if (pillow.material) {
      pillow.material.color.setHex(pillowColor)
      pillow.material.roughness = pillowProps.roughness
      pillow.material.metalness = pillowProps.metalness
      pillow.material.needsUpdate = true
      
      // Save config to each mesh
      if (!pillow.userData.customConfig) {
        pillow.userData.customConfig = {}
      }
      pillow.userData.customConfig.pillowStyle = configuration.value.pillowStyle
      
      console.log(`   - New color: #${pillow.material.color.getHexString()}`)
    }
  })
}

const updateLegStyles = () => {
  console.log('⚫ updateLegStyles called - Parts available:', sofaParts.legs.length)
  
  // If we have a specific clicked mesh, only update that one
  if (clickedMesh.value && clickedMesh.value.userData.partType === 'leg') {
    const legColor = getLegColor(configuration.value.legStyle)
    const legProps = getLegMaterialProperties(configuration.value.legStyle)
    console.log('⚫ Applying leg style to clicked mesh only:', clickedMesh.value.name)
    
    if (clickedMesh.value.material) {
      // Handle material arrays
      if (Array.isArray(clickedMesh.value.material)) {
        clickedMesh.value.material.forEach((mat, index) => {
          mat.color.setHex(legColor)
          mat.roughness = legProps.roughness
          mat.metalness = legProps.metalness
          mat.needsUpdate = true
          console.log(`   - Updated material ${index}: #${mat.color.getHexString()}`)
          
          if (configuration.value.legStyle.includes('metal') || configuration.value.legStyle.includes('brass')) {
            mat.metalness = 0.8
            mat.roughness = 0.3
            console.log(`   - Applied metallic properties to material ${index}`)
          }
        })
      } else {
        clickedMesh.value.material.color.setHex(legColor)
        clickedMesh.value.material.roughness = legProps.roughness
        clickedMesh.value.material.metalness = legProps.metalness
        clickedMesh.value.material.needsUpdate = true
        console.log(`   - Updated material: #${clickedMesh.value.material.color.getHexString()}`)
        
        if (configuration.value.legStyle.includes('metal') || configuration.value.legStyle.includes('brass')) {
          clickedMesh.value.material.metalness = 0.8
          clickedMesh.value.material.roughness = 0.3
          console.log(`   - Applied metallic properties`)
        }
      }
      
      // Save the configuration to this specific mesh
      if (!clickedMesh.value.userData.customConfig) {
        clickedMesh.value.userData.customConfig = {}
      }
      clickedMesh.value.userData.customConfig.legStyle = configuration.value.legStyle
      console.log(`   - Saved config to mesh:`, clickedMesh.value.userData.customConfig)
    }
    return
  }
  
  // Otherwise, update all legs (initial load or hotspot click)
  if (!sofaParts.legs.length) {
    console.log('⚠️ No leg parts found in the model - working with existing parts only')
    return
  }
  
  const legColor = getLegColor(configuration.value.legStyle)
  const legProps = getLegMaterialProperties(configuration.value.legStyle)
  
  console.log('⚫ Applying leg style:', configuration.value.legStyle, 'color:', legColor.toString(16))
  
  sofaParts.legs.forEach((leg, index) => {
    console.log(`   Updating existing leg ${index}: ${leg.name}`)
    if (leg.material) {
      leg.material.color.setHex(legColor)
      leg.material.roughness = legProps.roughness
      leg.material.metalness = legProps.metalness
      leg.material.needsUpdate = true
      
      // Save config to each mesh
      if (!leg.userData.customConfig) {
        leg.userData.customConfig = {}
      }
      leg.userData.customConfig.legStyle = configuration.value.legStyle
      
      console.log(`   - Updated material: #${leg.material.color.getHexString()}`)
      
      if (configuration.value.legStyle.includes('metal') || configuration.value.legStyle.includes('brass')) {
        leg.material.metalness = 0.8
        leg.material.roughness = 0.3
        console.log(`   - Applied metallic properties`)
      }
    }
  })
}



// ENHANCED model analysis - identify parts for clicking with PROPER material isolation
const identifySofaParts = () => {
  if (!model) return
  
  sofaParts = {
    cushions: [],
    frame: [],
    pillows: [],
    legs: [],
    all: []
  }
  
  console.log('🔍 Starting comprehensive model analysis for clicking...')
  
  model.traverse((child) => {
    if (child.isMesh) {
      const name = child.name.toLowerCase()
      const parentName = child.parent ? child.parent.name.toLowerCase() : ''
      
      console.log(`🔍 Analyzing clickable mesh: "${child.name}" (parent: "${child.parent ? child.parent.name : 'ROOT'}")`)      
      
      child.castShadow = true
      child.receiveShadow = true
      
      // CRITICAL: FORCE material cloning for COMPLETE isolation
      if (child.material) {
        // Handle both single materials and material arrays
        if (Array.isArray(child.material)) {
          console.log(`🔄 Cloning ${child.material.length} materials for: ${child.name}`)
          child.material = child.material.map((mat, index) => {
            const cloned = mat.clone()
            cloned.uuid = THREE.MathUtils.generateUUID() // Force new UUID
            console.log(`   Material ${index}: ${mat.uuid} -> ${cloned.uuid}`)
            return cloned
          })
          child.userData.originalMaterial = child.material.map(mat => mat.clone())
        } else {
          console.log(`🔄 Cloning single material for: ${child.name}`)
          const originalUuid = child.material.uuid
          child.material = child.material.clone()
          child.material.uuid = THREE.MathUtils.generateUUID() // Force new UUID
          child.userData.originalMaterial = child.material.clone()
          console.log(`   Material: ${originalUuid} -> ${child.material.uuid}`)
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

// For your rifle model, let's identify parts based on the mesh names
let identified = false

// Rifle-specific part patterns based on your model
const receiverPatterns = ['receiver', 'body', 'frame', 'main']
const barrelPatterns = ['barrel', 'tube', 'pipe']
const stockPatterns = ['stock', 'butt', 'shoulder']
const gripPatterns = ['grip', 'handle', 'pistol']
const triggerPatterns = ['trigger', 'guard']
const sightPatterns = ['sight', 'scope', 'optic']

if (receiverPatterns.some(pattern => name.includes(pattern))) {
sofaParts.frame.push(child) // Using 'frame' category for receiver
  child.userData.partType = 'frame'
console.log(`✅ IDENTIFIED AS RECEIVER/FRAME: ${child.name}`)
identified = true
} else if (barrelPatterns.some(pattern => name.includes(pattern))) {
sofaParts.legs.push(child) // Using 'legs' category for barrel
  child.userData.partType = 'leg'
  console.log(`✅ IDENTIFIED AS BARREL: ${child.name}`)
  identified = true
} else if (stockPatterns.some(pattern => name.includes(pattern))) {
sofaParts.cushions.push(child) // Using 'cushions' category for stock
child.userData.partType = 'cushion'
console.log(`✅ IDENTIFIED AS STOCK: ${child.name}`)
identified = true
} else if (gripPatterns.some(pattern => name.includes(pattern))) {
sofaParts.pillows.push(child) // Using 'pillows' category for grip
child.userData.partType = 'pillow'
console.log(`✅ IDENTIFIED AS GRIP: ${child.name}`)
identified = true
}

// If no specific pattern matches, assign based on mesh name analysis
if (!identified) {
console.log(`❓ UNIDENTIFIED: ${child.name}, assigning to frame category`)
sofaParts.frame.push(child)
child.userData.partType = 'frame'
console.log(`🔲 ASSIGNED AS FRAME: ${child.name}`)
}

// Make mesh clickable
child.userData.isClickable = true
}
})
  
  console.log('🎯 FINAL CLICKABLE PARTS:')
  console.log(`   🟦 Cushions: ${sofaParts.cushions.length}`, sofaParts.cushions.map(p => p.name))
  console.log(`   🔲 Frame: ${sofaParts.frame.length}`, sofaParts.frame.map(p => p.name))
  console.log(`   🟨 Pillows: ${sofaParts.pillows.length}`, sofaParts.pillows.map(p => p.name))
  console.log(`   ⚫ Legs: ${sofaParts.legs.length}`, sofaParts.legs.map(p => p.name))
  console.log(`   📊 Total: ${sofaParts.all.length}`)
  
  updateDebugStats()
}

const updateDebugStats = () => {
  debugStats.value = {
    totalMeshes: sofaParts.all.length,
    cushions: sofaParts.cushions.length,
    frame: sofaParts.frame.length,
    pillows: sofaParts.pillows.length,
    legs: sofaParts.legs.length
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

const getPillowColor = (style) => {
  const pillow = pillowOptions.value.find(p => p.value === style)
  return pillow ? parseInt(pillow.color.replace('#', '0x')) : 0xE8E8E8
}

const getLegColor = (style) => {
  const leg = legOptions.value.find(l => l.value === style)
  return leg ? parseInt(leg.color.replace('#', '0x')) : 0x8B4513
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

const getPillowMaterialProperties = (style) => {
  const properties = {
    classic: { roughness: 0.8, metalness: 0.0 },
    'velvet-blue': { roughness: 0.9, metalness: 0.0 },
    golden: { roughness: 0.6, metalness: 0.2 },
    burgundy: { roughness: 0.8, metalness: 0.0 }
  }
  return properties[style] || properties.classic
}

const getLegMaterialProperties = (style) => {
  const properties = {
    wooden: { roughness: 0.8, metalness: 0.0 },
    metal: { roughness: 0.2, metalness: 0.9 },
    brass: { roughness: 0.3, metalness: 0.8 },
    'black-metal': { roughness: 0.2, metalness: 0.9 }
  }
  return properties[style] || properties.wooden
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
    animate()
    
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

  // Priority: 1. Full URL from modelUrl param, 2. modelFile param, 3. selected model
  if (shopifyContext.modelUrl) {
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
    //   updatePillowStyles()
    //   updateLegStyles()
    // }, 500)
    
    isLoading.value = false
    console.log('✅ Model with clickable parts loaded successfully')
    
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

// Animation loop
const animate = () => {
  if (!renderer || !scene || !camera) return
  
  requestAnimationFrame(animate)
  
  if (controls) {
    controls.update()
  }
  
  renderer.render(scene, camera)
}

// Check if embedded in Shopify iframe
const isEmbeddedInShopify = () => {
  return window.parent && window.parent !== window
}

// Get URL parameters for Shopify context
const getShopifyContext = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    productId: urlParams.get('product'),
    variantId: urlParams.get('variant'),
    shop: urlParams.get('shop'),
    handle: urlParams.get('handle'),
    currency: urlParams.get('currency') || 'USD',
    embedded: urlParams.get('embedded') === 'true',
    // Price from Shopify product (passed via URL param)
    price: urlParams.get('price') ? parseFloat(urlParams.get('price').replace(/[^0-9.]/g, '')) : null,
    // New: Support for dynamic model URLs from Shopify product media
    modelUrl: urlParams.get('modelUrl'),
    modelFile: urlParams.get('modelFile')
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
      // Temporarily clear selection visuals without triggering UI updates
      if (clickedMesh.value && clickedMesh.value.userData) {
        // Remove any selection highlight effects
      }
    }
    selectedPart.value = null
    clickedMesh.value = null

    // Zoom in for better preview - move camera closer to model
    const zoomFactor = 0.65 // Closer zoom for cart thumbnail
    camera.position.set(
      originalPosition.x * zoomFactor,
      originalPosition.y * zoomFactor,
      originalPosition.z * zoomFactor
    )
    camera.lookAt(controls.target)
    camera.updateProjectionMatrix()

    // Render the zoomed, selection-free frame
    renderer.render(scene, camera)

    // Get the canvas
    const canvas = renderer.domElement

    // Create a thumbnail canvas (200x200 for better quality in cart)
    const thumbnailSize = 200
    const thumbnailCanvas = document.createElement('canvas')
    thumbnailCanvas.width = thumbnailSize
    thumbnailCanvas.height = thumbnailSize
    const ctx = thumbnailCanvas.getContext('2d')

    // Fill with white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, thumbnailSize, thumbnailSize)

    // Calculate center crop to maintain aspect ratio
    const sourceSize = Math.min(canvas.width, canvas.height)
    const sourceX = (canvas.width - sourceSize) / 2
    const sourceY = (canvas.height - sourceSize) / 2

    // Draw cropped and scaled image
    ctx.drawImage(
      canvas,
      sourceX, sourceY, sourceSize, sourceSize, // Source rectangle (centered square)
      0, 0, thumbnailSize, thumbnailSize // Destination rectangle
    )

    // Convert to base64 with good quality
    const dataUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.85)

    // Restore camera position
    camera.position.copy(originalPosition)
    controls.target.copy(originalTarget)
    camera.lookAt(controls.target)
    camera.updateProjectionMatrix()

    // Re-render with original view
    renderer.render(scene, camera)

    console.log('📸 Preview thumbnail captured (zoomed, no selection), size:', Math.round(dataUrl.length / 1024), 'KB')
    return dataUrl
  } catch (error) {
    console.error('❌ Failed to capture preview:', error)
    return null
  }
}

// Add to cart function
const addToCart = async () => {
  console.log('🛒 Adding configured sofa to cart...')

  try {
    isAddingToCart.value = true

    // Capture preview image before adding to cart
    const previewImage = capturePreviewImage()

    const fullConfiguration = {
      cushionColor: configuration.value.cushionColor,
      frameMaterial: configuration.value.frameMaterial,
      pillowStyle: configuration.value.pillowStyle,
      legStyle: configuration.value.legStyle,
      size: configuration.value.size,
      model: selectedModel.value
    }

    const shopifyContext = getShopifyContext()

    const cartData = {
      type: 'IANI_ADD_TO_CART',
      payload: {
        productId: shopifyContext.productId || 'customizable-sofa',
        variantId: shopifyContext.variantId,
        configuration: fullConfiguration,
        price: Number(calculatedPrice.value),
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

  // Load product configuration from merchant's settings
  await loadProductConfig()

  setTimeout(() => {
    initThreeJS()
  }, 100)
})

onUnmounted(() => {
  console.log('🧹 Cleaning up configurator...')

  // Remove Shopify message listener
  window.removeEventListener('message', handleShopifyMessage)

  if (canvasContainer.value) {
    canvasContainer.value.removeEventListener('click', onMouseClick)
  }

  if (renderer) {
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

.material-options, .pillow-options, .leg-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.material-option, .pillow-option, .leg-option {
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.material-option:hover, .pillow-option:hover, .leg-option:hover {
  border-color: #0066cc;
  background: #f9f9f9;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 102, 204, 0.1);
}

.material-option.active, .pillow-option.active, .leg-option.active {
  border-color: #0066cc;
  background: #f0f7ff;
  box-shadow: 0 3px 10px rgba(0, 102, 204, 0.15);
}

.material-name, .pillow-name, .leg-name {
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

.material-price, .pillow-price, .leg-price {
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 12px;
  color: #28a745;
  font-weight: 600;
}

.pillow-preview, .leg-preview {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.leg-shape {
  width: 100%;
  height: 100%;
  border-radius: 2px;
}



.cart-section {
  margin-top: auto;
  padding-top: 24px;
  border-top: 1px solid #e1e5e9;
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
  }
  
  .viewer-section {
    flex: 1;
    min-height: 60vh;
  }
  
  .config-section {
    width: 100%;
    max-height: 40vh;
    border-left: none;
    border-top: 1px solid #e1e5e9;
  }
  
  .config-content {
    padding: 16px;
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
</style>