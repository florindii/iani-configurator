<!-- Fullscreen 3D Configurator - Roostr Style Layout -->
<template>
  <div class="configurator-fullscreen">
    <!-- Left Side: 3D Viewer -->
    <div class="viewer-section">
      <div ref="canvasContainer" class="viewer-container"></div>
      
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
          <h2>🛋️ Customize Your Sofa</h2>
          <p class="product-description">Configure your sofa and add it to your cart</p>
        </div>

        <!-- Price Display -->
        <div class="price-section">
          <div class="current-price">
            <span class="currency">$</span>
            <span class="amount">{{ calculatedPrice.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Configuration Options -->
        <div class="config-options">
          <!-- Color Selection -->
          <div class="option-group">
            <h3 class="option-title">Color</h3>
            <p class="option-subtitle">{{ getSelectedColorLabel() }}</p>
            <div class="color-grid">
              <div 
                v-for="color in colorOptions" 
                :key="color.value"
                :class="['color-option', { active: configuration.color === color.value }]"
                @click="updateColor(color.value)"
                :title="`${color.label} - $${color.price}`"
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

          <!-- Additional Options Placeholder -->
          <div class="option-group">
            <h3 class="option-title">Size</h3>
            <p class="option-subtitle">2-Seater</p>
            <div class="size-options">
              <div class="size-option active">
                <span class="size-name">2-Seater</span>
                <span class="size-dimensions">150cm × 85cm</span>
              </div>
            </div>
          </div>

          <!-- Material Options Placeholder -->
          <div class="option-group">
            <h3 class="option-title">Material</h3>
            <p class="option-subtitle">Premium Fabric</p>
            <div class="material-options">
              <div class="material-option active">
                <span class="material-name">Premium Fabric</span>
                <span class="material-description">Durable & comfortable</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Add to Cart Button -->
        <div class="cart-section">
          <button 
            @click="addToCart" 
            :disabled="!model || isAddingToCart"
            class="add-to-cart-btn">
            <span v-if="isAddingToCart">Adding to Cart...</span>
            <span v-else>Add to Cart - ${{ calculatedPrice.toFixed(2) }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import shopifyService from '../services/shopifyService'

// Refs
const canvasContainer = ref(null)
const isLoading = ref(true)
const isAddingToCart = ref(false)
const calculatedPrice = ref(299.99)

// Three.js variables
let scene, camera, renderer, model, controls

// Configuration state
const configuration = ref({
  color: 'blue',
  size: '2-seater',
  material: 'fabric'
})

// Color options with pricing
const colorOptions = ref([
  { label: 'Ocean Blue', value: 'blue', hex: '#4A90E2', price: 299.99 },
  { label: 'Crimson Red', value: 'red', hex: '#E74C3C', price: 319.99 },
  { label: 'Forest Green', value: 'green', hex: '#2ECC71', price: 309.99 },
  { label: 'Chocolate Brown', value: 'brown', hex: '#8B4513', price: 329.99 },
  { label: 'Royal Purple', value: 'purple', hex: '#9B59B6', price: 339.99 },
  { label: 'Sunset Orange', value: 'orange', hex: '#E67E22', price: 314.99 }
])

// Helper functions
const getSelectedColorLabel = () => {
  const selected = colorOptions.value.find(c => c.value === configuration.value.color)
  return selected ? selected.label : 'Select Color'
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
    scene.background = new THREE.Color(0xf8f9fa)
    
    // Camera setup
    const width = canvasContainer.value.clientWidth
    const height = canvasContainer.value.clientHeight
    
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.set(4, 3, 4)
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    
    canvasContainer.value.appendChild(renderer.domElement)
    
    // Enhanced Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight1.position.set(10, 10, 5)
    directionalLight1.castShadow = true
    directionalLight1.shadow.mapSize.width = 2048
    directionalLight1.shadow.mapSize.height = 2048
    scene.add(directionalLight1)
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3)
    directionalLight2.position.set(-5, 5, -5)
    scene.add(directionalLight2)
    
    // Controls
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2
    controls.maxDistance = 10
    controls.maxPolarAngle = Math.PI / 2.2
    controls.autoRotate = false
    controls.autoRotateSpeed = 1
    
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

// Load 3D model - Use original Couch.glb
const loadModel = async () => {
  console.log('📦 Loading original Couch.glb model...')
  
  try {
    const loader = new GLTFLoader()
    
    // Load the original sofa model
    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        '/models/Couch.glb', // Your original model path
        (gltf) => resolve(gltf),
        (progress) => {
          console.log('📈 Loading progress:', (progress.loaded / progress.total * 100) + '%')
        },
        (error) => reject(error)
      )
    })
    
    model = gltf.scene
    
    // Scale and position the model appropriately
    model.scale.setScalar(1)
    model.position.set(0, 0, 0)
    
    // Enable shadows
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        // Store original material for color changes
        if (child.material) {
          child.userData.originalMaterial = child.material.clone()
          
          // Apply initial color
          if (child.material.map) {
            // If has texture, tint it
            child.material.color.setHex(getColorHex(configuration.value.color))
          } else {
            // If no texture, apply solid color
            child.material.color.setHex(getColorHex(configuration.value.color))
          }
        }
      }
    })
    
    scene.add(model)
    
    // Auto-frame the model
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    // Position camera to frame the model nicely
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    const cameraDistance = maxDim / (2 * Math.tan(fov / 2)) * 1.5
    
    camera.position.set(
      center.x + cameraDistance * 0.8,
      center.y + cameraDistance * 0.6, 
      center.z + cameraDistance * 0.8
    )
    camera.lookAt(center)
    
    // Update controls target
    if (controls) {
      controls.target.copy(center)
      controls.update()
    }
    
    isLoading.value = false
    console.log('✅ Original Couch model loaded successfully')
    
  } catch (error) {
    console.error('❌ Failed to load Couch model:', error)
    console.log('🔄 Falling back to basic model...')
    
    // Fallback to basic model if Couch.glb fails
    const geometry = new THREE.BoxGeometry(3, 1.2, 1.5)
    const material = new THREE.MeshLambertMaterial({ color: getColorHex(configuration.value.color) })
    
    model = new THREE.Mesh(geometry, material)
    model.position.set(0, 0.6, 0)
    model.castShadow = true
    model.receiveShadow = true
    
    scene.add(model)
    
    // Store material reference for color updates
    model.userData.materials = [material]
    
    isLoading.value = false
  }
}

// Update model color
const updateColor = (colorValue) => {
  console.log('🎨 Updating color to:', colorValue)
  
  configuration.value.color = colorValue
  
  // Update model color
  if (model) {
    const newColorHex = getColorHex(colorValue)
    
    if (model.traverse) {
      // GLTF model - traverse all meshes
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          if (child.material.map) {
            // If has texture, tint it
            child.material.color.setHex(newColorHex)
          } else {
            // If no texture, apply solid color
            child.material.color.setHex(newColorHex)
          }
        }
      })
    } else if (model.userData && model.userData.materials) {
      // Fallback model - update stored materials
      model.userData.materials.forEach(material => {
        material.color.setHex(newColorHex)
      })
    } else if (model.material) {
      // Simple mesh
      model.material.color.setHex(newColorHex)
    }
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

// Add to cart function - integrates with Shopify
const addToCart = async () => {
  console.log('🛒 Adding to cart...')
  
  try {
    isAddingToCart.value = true
    
    // Get selected configuration
    const selectedColor = colorOptions.value.find(c => c.value === configuration.value.color)
    
    // If embedded in Shopify, send message to parent
    if (shopifyService.isEmbeddedInShopify()) {
      // Send configuration to Shopify parent window
      window.parent.postMessage({
        type: 'CONFIGURATOR_ADD_TO_CART',
        data: {
          productId: getProductId(),
          variantId: `variant-${configuration.value.color}`,
          color: configuration.value.color,
          colorLabel: selectedColor?.label || 'Selected Color',
          price: calculatedPrice.value,
          quantity: 1,
          configuration: configuration.value
        }
      }, '*')
      
      // Show success message
      showSuccessMessage(`✅ ${selectedColor?.label || 'Custom'} sofa added to cart!`)
      
    } else {
      // Standalone mode - simulate cart addition
      await new Promise(resolve => setTimeout(resolve, 1500))
      showSuccessMessage(`✅ ${selectedColor?.label || 'Custom'} sofa added to cart! (Demo mode)`)
    }
    
  } catch (error) {
    console.error('❌ Failed to add to cart:', error)
    showSuccessMessage('❌ Failed to add to cart. Please try again.', 'error')
  } finally {
    isAddingToCart.value = false
  }
}

// Helper to get product ID
const getProductId = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('productId') || 'customizable-sofa'
}

// Show success message
const showSuccessMessage = (message, type = 'success') => {
  // Create notification element
  const notification = document.createElement('div')
  notification.className = `configurator-notification ${type}`
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#dc3545' : '#28a745'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 600;
    animation: slideInRight 0.3s ease-out;
  `
  
  document.body.appendChild(notification)
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease-out'
      setTimeout(() => {
        notification.parentNode.removeChild(notification)
      }, 300)
    }
  }, 4000)
  
  console.log(`📢 Notification: ${message}`)
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
  console.log('🚀 Fullscreen configurator mounted')
  
  // Initialize 3D scene
  setTimeout(() => {
    initThreeJS()
  }, 100)
  
  // Send ready message to Shopify
  if (shopifyService.isEmbeddedInShopify()) {
    window.parent.postMessage({
      type: 'CONFIGURATOR_READY',
      data: {
        mode: 'fullscreen',
        productId: getProductId()
      }
    }, '*')
  }
})

onUnmounted(() => {
  console.log('🧹 Cleaning up configurator...')
  
  // Cleanup Three.js
  if (renderer) {
    renderer.dispose()
  }
  if (scene) {
    scene.clear()
  }
})
</script>

<style scoped>
/* Fullscreen Layout */
.configurator-fullscreen {
  display: flex;
  height: 100vh;
  width: 100vw;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
}

/* Left Side: 3D Viewer */
.viewer-section {
  flex: 1;
  position: relative;
  background: #f8f9fa;
  border-right: 1px solid #e1e5e9;
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
  background: rgba(248, 249, 250, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
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

/* Right Side: Configuration Panel */
.config-section {
  width: 400px;
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

/* Header */
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

/* Price Section */
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

/* Configuration Options */
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

/* Color Grid */
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
}

.color-option.active {
  border-color: #0066cc;
  background: #f0f7ff;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.2);
}

.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-bottom: 8px;
  border: 2px solid rgba(0, 0, 0, 0.1);
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

/* Size and Material Options */
.size-options, .material-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.size-option, .material-option {
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.size-option.active, .material-option.active {
  border-color: #0066cc;
  background: #f0f7ff;
}

.size-name, .material-name {
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.size-dimensions, .material-description {
  font-size: 12px;
  color: #666;
}

/* Add to Cart Button */
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
}

.add-to-cart-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
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
  
  .color-grid {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }
  
  .color-option {
    padding: 12px 8px;
  }
  
  .color-swatch {
    width: 32px;
    height: 32px;
  }
  
  .config-header h2 {
    font-size: 20px;
  }
  
  .current-price .amount {
    font-size: 28px;
  }
}

/* Notification animations */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>
