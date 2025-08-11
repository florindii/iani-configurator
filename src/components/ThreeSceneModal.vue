<!-- Complete ThreeScene Modal Component -->
<template>
  <!-- Modal Overlay -->
  <div v-if="isConfiguratorOpen" class="configurator-modal-overlay" @click="closeConfigurator">
    <div class="configurator-container" @click.stop>
      <!-- Close Button -->
      <button @click="closeConfigurator" class="close-configurator-btn">
        <span>✕</span>
      </button>
      
      <!-- 3D Viewer - Main Area -->
      <div class="viewer-section">
        <div ref="canvasContainer" class="viewer-container"></div>
        
        <!-- Loading Overlay -->
        <div v-if="isLoading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <p>Loading 3D model...</p>
        </div>
      </div>

      <!-- Configuration Panel - Bottom -->
      <div class="config-panel">
        <div class="config-content">
          <div class="config-header">
            <h3>🛋️ Customize Your Sofa</h3>
            <p class="config-description">Customize your sofa and add it directly to your cart</p>
          </div>
          
          <!-- Configuration Options -->
          <div class="config-options">
            <div class="config-group">
              <label>Color:</label>
              <div class="color-options">
                <div 
                  v-for="color in colorOptions" 
                  :key="color.value"
                  :class="['color-swatch', { active: configuration.color === color.value }]"
                  :style="{ backgroundColor: color.hex }"
                  @click="updateColor(color.value)"
                  :title="`${color.label} - $${color.price || 299}`"
                >
                  <span v-if="color.price" class="color-price">${{ color.price.toFixed(0) }}</span>
                </div>
              </div>
            </div>

            <!-- Configurator Actions -->
            <div class="configurator-actions">
              <button @click="addToCartAndClose" :disabled="!model || isAddingToCart" class="add-to-cart-btn primary">
                {{ isAddingToCart ? 'Adding...' : `Add Custom Sofa - $${calculatedPrice.toFixed(2)}` }}
              </button>
              <button @click="applyToProductAndClose" class="apply-selection-btn secondary">
                Apply Selection to Product Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Configurator Trigger Button (when embedded in product page) -->
  <div v-else-if="isEmbedded" class="configurator-trigger">
    <button @click="openConfigurator" class="open-configurator-btn">
      🎨 Customize in 3D
    </button>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import shopifyService from '../services/shopifyService'

// Props
const props = defineProps({
  autoOpen: {
    type: Boolean,
    default: false
  },
  embedded: {
    type: Boolean,
    default: true
  }
})

// Refs
const canvasContainer = ref(null)
const isLoading = ref(true)
const isAddingToCart = ref(false)
const calculatedPrice = ref(299.99)
const availableVariants = ref([])
const currentVariant = ref(null)
const isConfiguratorOpen = ref(props.autoOpen)
const isEmbedded = ref(props.embedded)

// Three.js refs
let scene, camera, renderer, model, controls

// Configuration state
const configuration = ref({
  color: 'blue'
})

// Color options with pricing
const colorOptions = ref([
  { label: 'Blue', value: 'blue', hex: '#4A90E2', price: 299.99 },
  { label: 'Red', value: 'red', hex: '#E74C3C', price: 319.99 },
  { label: 'Green', value: 'green', hex: '#2ECC71', price: 309.99 },
  { label: 'Brown', value: 'brown', hex: '#8B4513', price: 329.99 },
  { label: 'Purple', value: 'purple', hex: '#9B59B6', price: 339.99 },
  { label: 'Orange', value: 'orange', hex: '#E67E22', price: 314.99 }
])

// Modal controls
const openConfigurator = () => {
  console.log('🎨 Opening configurator modal...')
  isConfiguratorOpen.value = true
  document.body.style.overflow = 'hidden'
  
  // Initialize 3D scene when opened
  nextTick(() => {
    if (canvasContainer.value && !model) {
      initThreeJS()
    }
  })
  
  // Send message to parent window
  sendToParent('CONFIGURATOR_OPENED', { productId: getProductId() })
}

const closeConfigurator = () => {
  console.log('❌ Closing configurator modal...')
  isConfiguratorOpen.value = false
  document.body.style.overflow = ''
  
  // Send message to parent window
  sendToParent('CONFIGURATOR_CLOSED', { productId: getProductId() })
}

// Enhanced add to cart that closes configurator
const addToCartAndClose = async () => {
  console.log('🛒 Adding to cart and closing...')
  
  try {
    isAddingToCart.value = true
    
    // Simulate cart addition
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Get current variant info
    const selectedColor = colorOptions.value.find(c => c.value === configuration.value.color)
    
    // Send success message to parent
    sendToParent('CONFIGURATOR_CART_SUCCESS', {
      productName: 'Custom Sofa',
      color: configuration.value.color,
      colorLabel: selectedColor?.label || 'Selected Color',
      price: calculatedPrice.value,
      variantId: `variant-${configuration.value.color}`,
      configuration: configuration.value
    })
    
    // Close configurator after success
    setTimeout(() => {
      closeConfigurator()
    }, 500)
    
  } catch (error) {
    console.error('❌ Failed to add to cart:', error)
    sendToParent('CONFIGURATOR_ERROR', {
      message: 'Failed to add item to cart. Please try again.'
    })
  } finally {
    isAddingToCart.value = false
  }
}

// Apply selection to main product page (doesn't add to cart)
const applyToProductAndClose = () => {
  console.log('🎨 Applying selection to product page...')
  
  const selectedColor = colorOptions.value.find(c => c.value === configuration.value.color)
  
  // Send selection to parent window
  sendToParent('APPLY_CONFIGURATION', {
    color: configuration.value.color,
    colorLabel: selectedColor?.label || 'Selected Color',
    price: calculatedPrice.value,
    variantId: `variant-${configuration.value.color}`,
    configuration: configuration.value
  })
  
  closeConfigurator()
}

// Helper function to send messages to parent
const sendToParent = (type, data) => {
  if (isEmbedded.value) {
    window.parent.postMessage({
      type: type,
      data: data
    }, '*')
    console.log('📨 Sent message to parent:', type, data)
  }
}

// Helper to get product ID
const getProductId = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('productId') || 'unknown-product'
}

// Initialize Three.js scene
const initThreeJS = async () => {
  if (!canvasContainer.value) {
    console.error('❌ Canvas container not found')
    return
  }

  console.log('🔧 Initializing Three.js scene...')
  
  try {
    // Scene setup
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xfafafa)
    
    // Camera setup
    const width = canvasContainer.value.clientWidth
    const height = canvasContainer.value.clientHeight
    
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(3, 2, 3)
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    
    canvasContainer.value.appendChild(renderer.domElement)
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 1024
    directionalLight.shadow.mapSize.height = 1024
    scene.add(directionalLight)
    
    // Controls
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2
    controls.maxDistance = 8
    controls.maxPolarAngle = Math.PI / 2
    
    // Load 3D model
    await loadModel()
    
    // Start animation loop
    animate()
    
    // Handle window resize
    const handleResize = () => {
      if (!canvasContainer.value || !camera || !renderer) return
      
      const width = canvasContainer.value.clientWidth
      const height = canvasContainer.value.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    
    window.addEventListener('resize', handleResize)
    
    console.log('✅ Three.js scene initialized successfully')
    
  } catch (error) {
    console.error('❌ Failed to initialize Three.js:', error)
    isLoading.value = false
  }
}

// Load 3D model
const loadModel = async () => {
  console.log('📦 Loading 3D model...')
  
  try {
    const loader = new GLTFLoader()
    
    // Create a simple cube as placeholder model
    const geometry = new THREE.BoxGeometry(2, 1, 3)
    const material = new THREE.MeshLambertMaterial({ color: getColorHex(configuration.value.color) })
    
    model = new THREE.Mesh(geometry, material)
    model.position.set(0, 0.5, 0)
    model.castShadow = true
    model.receiveShadow = true
    
    scene.add(model)
    
    // Add a ground plane
    const groundGeometry = new THREE.PlaneGeometry(10, 10)
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)
    
    isLoading.value = false
    console.log('✅ Model loaded successfully')
    
  } catch (error) {
    console.error('❌ Failed to load model:', error)
    isLoading.value = false
  }
}

// Update model color
const updateColor = (colorValue) => {
  console.log('🎨 Updating color to:', colorValue)
  
  configuration.value.color = colorValue
  
  // Update model color
  if (model && model.material) {
    model.material.color.setHex(getColorHex(colorValue))
  }
  
  // Update calculated price
  const selectedColor = colorOptions.value.find(c => c.value === colorValue)
  if (selectedColor) {
    calculatedPrice.value = selectedColor.price
  }
}

// Get color hex value
const getColorHex = (colorValue) => {
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

// Animation loop
const animate = () => {
  if (!renderer || !scene || !camera) return
  
  requestAnimationFrame(animate)
  
  if (controls) {
    controls.update()
  }
  
  renderer.render(scene, camera)
}

// Lifecycle
onMounted(() => {
  console.log('🚀 Modal component mounted')
  
  // Send ready message
  sendToParent('CONFIGURATOR_READY', {
    mode: 'modal',
    embedded: isEmbedded.value,
    autoOpen: props.autoOpen
  })
  
  // Auto-open if not embedded
  if (!isEmbedded.value && props.autoOpen) {
    openConfigurator()
  }
})

onUnmounted(() => {
  console.log('🧹 Cleaning up modal component...')
  
  // Cleanup Three.js
  if (renderer) {
    renderer.dispose()
  }
  if (scene) {
    scene.clear()
  }
  
  // Restore body overflow
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Modal Overlay */
.configurator-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

/* Modal Container */
.configurator-container {
  width: 95vw;
  height: 90vh;
  max-width: 1200px;
  max-height: 800px;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
}

/* Close Button */
.close-configurator-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  font-size: 18px;
}

.close-configurator-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.05);
}

/* Viewer Section */
.viewer-section {
  flex: 1;
  position: relative;
  background: #fafafa;
}

.viewer-container {
  width: 100%;
  height: 100%;
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(250, 250, 250, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e1e5e9;
  border-top: 4px solid #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Configuration Panel */
.config-panel {
  height: 180px;
  background: white;
  border-top: 2px solid #e1e5e9;
  padding: 20px;
}

.config-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.config-header h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
  color: #1a1a1a;
  font-weight: 600;
}

.config-description {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 14px;
}

/* Configuration Options */
.config-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.config-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

/* Color Options */
.color-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: 3px solid #ddd;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-swatch:hover {
  transform: scale(1.05);
  border-color: #bbb;
}

.color-swatch.active {
  border-color: #0066cc;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.color-price {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: #666;
  font-weight: 600;
  background: white;
  padding: 2px 4px;
  border-radius: 3px;
  border: 1px solid #ddd;
}

/* Configurator Actions */
.configurator-actions {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: auto;
}

.add-to-cart-btn.primary {
  background: linear-gradient(135deg, #0066cc, #0052a3);
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 25px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 250px;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.add-to-cart-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0052a3, #004080);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 102, 204, 0.4);
}

.add-to-cart-btn.primary:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.apply-selection-btn.secondary {
  background: transparent;
  color: #0066cc;
  border: 2px solid #0066cc;
  padding: 14px 24px;
  border-radius: 25px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.apply-selection-btn.secondary:hover {
  background: #0066cc;
  color: white;
}

/* Trigger Button */
.configurator-trigger {
  margin: 15px 0;
}

.open-configurator-btn {
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
  width: 100%;
  max-width: 300px;
}

.open-configurator-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .configurator-modal-overlay {
    align-items: flex-end;
    justify-content: center;
  }
  
  .configurator-container {
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    border-radius: 0;
  }
  
  .config-panel {
    height: 200px;
    padding: 15px;
  }
  
  .configurator-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .add-to-cart-btn.primary {
    width: 100%;
    min-width: auto;
  }
  
  .apply-selection-btn.secondary {
    width: 100%;
  }
}

/* Very small screens */
@media (max-width: 480px) {
  .config-panel {
    height: 220px;
    padding: 12px;
  }
  
  .color-swatch {
    width: 40px;
    height: 40px;
  }
  
  .config-header h3 {
    font-size: 16px;
  }
  
  .add-to-cart-btn.primary {
    font-size: 14px;
    padding: 14px 24px;
  }
  
  .apply-selection-btn.secondary {
    font-size: 13px;
    padding: 12px 20px;
  }
}
</style>
