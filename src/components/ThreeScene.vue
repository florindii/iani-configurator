<!-- Enhanced ThreeScene.vue with Shopify integration -->
<template>
  <div class="configurator-container">
    <!-- 3D Viewer -->
    <div class="viewer-section">
      <div ref="canvasContainer" class="viewer-container"></div>
      
      <!-- Loading Overlay -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Loading 3D model...</p>
      </div>
      
      <!-- Controls Overlay -->
      <div class="controls-overlay">
        <button @click="resetCamera" class="control-btn" title="Reset View">
          🔄
        </button>
        <button @click="takeScreenshot" class="control-btn" title="Take Screenshot">
          📷
        </button>
      </div>
      
      <!-- Info Panel -->
      <div class="info-panel" v-if="shopifyService.isEmbeddedInShopify()">
        <div class="info-item">
          <span>🏪 Shop:</span>
          <span>{{ shopifyService.shop }}</span>
        </div>
        <div class="info-item">
          <span>📦 Product ID:</span>
          <span>{{ shopifyService.productId }}</span>
        </div>
      </div>
    </div>

    <!-- Configuration Panel -->
    <div class="config-panel">
      <div class="config-header">
        <h2>Customize Your Product</h2>
        <div class="config-status">
          <span class="status-dot" :class="{ connected: isConnected }"></span>
          <span>{{ isConnected ? 'Connected to Shopify' : 'Standalone Mode' }}</span>
        </div>
      </div>
      
      <!-- Configuration Options -->
      <div class="config-section">
        <div class="config-group">
          <label>Material:</label>
          <select v-model="configuration.material" @change="updateConfiguration">
            <option value="fabric">Fabric ($0)</option>
            <option value="leather">Leather (+$199)</option>
            <option value="velvet">Velvet (+$149)</option>
          </select>
        </div>

        <div class="config-group">
          <label>Color:</label>
          <div class="color-options">
            <div 
              v-for="color in colorOptions" 
              :key="color.value"
              :class="['color-swatch', { active: configuration.color === color.value }]"
              :style="{ backgroundColor: color.hex }"
              @click="updateColor(color.value)"
              :title="color.label"
            ></div>
          </div>
        </div>

        <div class="config-group">
          <label>Size:</label>
          <div class="size-options">
            <button 
              v-for="size in sizeOptions" 
              :key="size.value"
              :class="['size-btn', { active: configuration.size === size.value }]"
              @click="updateSize(size.value)"
            >
              {{ size.label }}
              <span class="size-price" v-if="size.price > 0">+${{ size.price }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Price Display -->
      <div class="price-section">
        <div class="price-breakdown">
          <div class="price-item">
            <span>Base Price:</span>
            <span>${{ basePrice.toFixed(2) }}</span>
          </div>
          <div v-for="addon in priceAddons" :key="addon.name" class="price-item">
            <span>{{ addon.name }}:</span>
            <span>+${{ addon.price.toFixed(2) }}</span>
          </div>
          <div class="price-total">
            <span>Total:</span>
            <span>${{ totalPrice.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          @click="saveConfiguration" 
          :disabled="isSaving || !hasValidConfiguration"
          class="btn btn-secondary"
        >
          {{ isSaving ? 'Saving...' : 'Save Configuration' }}
        </button>
        
        <button 
          @click="addToCart" 
          :disabled="!hasValidConfiguration || isAddingToCart"
          class="btn btn-primary"
        >
          {{ isAddingToCart ? 'Adding...' : 'Add to Cart' }}
        </button>
      </div>

      <!-- Share Section -->
      <div class="share-section" v-if="shareableUrl">
        <h3>Share This Configuration</h3>
        <div class="share-url">
          <input 
            v-model="shareableUrl" 
            readonly 
            class="share-input"
            @click="copyToClipboard"
          />
          <button @click="copyToClipboard" class="btn btn-small">Copy</button>
        </div>
      </div>
      
      <!-- Debug Info (development only) -->
      <div class="debug-section" v-if="showDebug">
        <h3>Debug Info</h3>
        <pre>{{ JSON.stringify(debugInfo, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import shopifyService from '../services/shopifyService'

// Refs
const canvasContainer = ref(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isAddingToCart = ref(false)
const showDebug = ref(import.meta.env.DEV) // Show debug in development

// Three.js refs
let scene, camera, renderer, controls, model

// Configuration state
const configuration = ref({
  material: 'fabric',
  color: 'blue',
  size: 'medium'
})

// Pricing
const basePrice = ref(299.99)
const priceAddons = ref([])

// Options with pricing
const colorOptions = [
  { label: 'Blue', value: 'blue', hex: '#4A90E2' },
  { label: 'Red', value: 'red', hex: '#E24A4A' },
  { label: 'Green', value: 'green', hex: '#4AE24A' },
  { label: 'Brown', value: 'brown', hex: '#8B4513' },
  { label: 'Purple', value: 'purple', hex: '#9B59B6' },
  { label: 'Orange', value: 'orange', hex: '#E67E22' }
]

const sizeOptions = [
  { label: 'Small', value: 'small', multiplier: 0.8, price: 0 },
  { label: 'Medium', value: 'medium', multiplier: 1.0, price: 0 },
  { label: 'Large', value: 'large', multiplier: 1.2, price: 99.99 },
  { label: 'X-Large', value: 'xlarge', multiplier: 1.4, price: 199.99 }
]

// Computed
const totalPrice = computed(() => {
  let total = basePrice.value
  priceAddons.value.forEach(addon => {
    total += addon.price
  })
  return total
})

const hasValidConfiguration = computed(() => {
  return configuration.value.material && configuration.value.color && configuration.value.size
})

const isConnected = computed(() => {
  return shopifyService.isEmbeddedInShopify()
})

const shareableUrl = ref('')

const debugInfo = computed(() => ({
  shopifyService: {
    shop: shopifyService.shop,
    productId: shopifyService.productId,
    customerId: shopifyService.customerId,
    isEmbedded: shopifyService.isEmbeddedInShopify()
  },
  configuration: configuration.value,
  pricing: {
    base: basePrice.value,
    addons: priceAddons.value,
    total: totalPrice.value
  }
}))
  
// Methods
const initThreeJS = () => {
  if (!canvasContainer.value) {
    console.error('❌ Canvas container not found!')
    return
  }
  
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  camera = new THREE.PerspectiveCamera(
    75, 
    canvasContainer.value.clientWidth / canvasContainer.value.clientHeight, 
    0.1, 
    1000
  )
  camera.position.set(2, 1, 7)
  // camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  canvasContainer.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 5, 5)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)
  
  // ✅ ADD GROUND PLANE: Helps with depth perception
  const groundGeometry = new THREE.PlaneGeometry(20, 20)
  const groundMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xfafafa, 
    transparent: true, 
    opacity: 0.1 
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.1
  scene.add(ground)
console.log('erdh');

  // Load model
  loadModel()
  
  // Animation loop
  animate()
  // console.log('✅ Animation loop started')

  // Handle resize
  window.addEventListener('resize', onWindowResize)
}

const loadModel = () => {
  const loader = new GLTFLoader()
  const modelUrl = `${import.meta.env.VITE_BASE_URL}models/Couch.glb` // Your existing model
  
  console.log('🔄 Starting to load model from:', modelUrl)
  isLoading.value = true
  
  loader.load(
    modelUrl,
    (gltf) => {
      console.log('✅ 3D Model loaded successfully', gltf)
      model = gltf.scene
      
      // ✅ BETTER POSITIONING: Center and scale the model
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      console.log('📏 Model dimensions:', {
        center: { x: center.x, y: center.y, z: center.z },
        size: { x: size.x, y: size.y, z: size.z }
      })
      
      // Center the model
      model.position.sub(center)
      
      // Scale model to proper size (make it bigger and more visible)
      const maxDimension = Math.max(size.x, size.y, size.z)
      if (maxDimension > 0) {
        const targetSize = 3 // Target size for visibility
        const scale = targetSize / maxDimension
        model.scale.setScalar(scale)
        console.log('🔧 Model scaled by:', scale)
      }
      
      // Position model on the ground
      model.position.y = 0.5 // Slightly above ground
      
      // Enable shadows and fix materials
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          child.visible = true // Ensure visibility
          
          // ✅ COMPLETELY REPLACE MATERIAL: Force simple visible material
          child.material = new THREE.MeshStandardMaterial({
            color: 0x2563eb, // Brighter blue for better visibility
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide,
            wireframe: false,
            roughness: 0.7,
            metalness: 0.1
          })
          
          console.log('📦 Fixed mesh:', child.name || 'unnamed', {
            material: 'MeshStandardMaterial',
            color: 'blue',
            visible: child.visible
          })
        }
      })
      
      scene.add(model)
      isLoading.value = false
      
      // ✅ FORCE MODEL VISIBILITY: Make absolutely sure it's visible
      model.visible = true
      model.traverse((child) => {
        if (child.isMesh) {
          child.visible = true
          child.frustumCulled = false // Disable frustum culling
          
          // Make sure material is properly applied
          if (child.material) {
            child.material.needsUpdate = true
          }
        }
      })
      
      console.log('✅ Model added to scene with', model.children.length, 'children')
            
      // // ✅ TEMPORARY: Add LARGE visible test cube at center
      const testCube = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2), // Much larger cube
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      )
      testCube.position.set(0, 1, 0) // Center of scene, elevated
      scene.add(testCube)
      // console.log('🔴 Added LARGE test cube at center (0,1,0)')
      
      // // ✅ SCALE UP THE MODEL: Make it much bigger
      model.scale.setScalar(10) // Make model 10x bigger
      model.position.set(0, 0, 0) // Center it
      // console.log('🔧 Model scaled up 10x and centered')
      
      // ✅ SIMPLE CAMERA SETUP: Move camera back to see objects
      camera.position.set(5, 3, 5)
      camera.lookAt(0, 1, 0)
      controls.target.set(0, 1, 0)
      controls.update()
      
      console.log('📷 Camera positioned at (5,3,5) looking at (0,1,0)')
      
      console.log('✅ Model added to scene, isLoading set to false')
      
      // Apply initial configuration
      applyConfiguration()
    },
    (xhr) => {
      const progress = (xhr.loaded / xhr.total) * 100
      console.log(`Loading progress: ${progress}%`)
    },
    (error) => {
      console.error('❌ Error loading model:', error)
      console.error('Model URL attempted:', modelUrl)
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
        type: error.type
      })
      isLoading.value = false
      
      // Show a fallback or placeholder
      console.log('📎 Creating fallback cube geometry')
      const geometry = new THREE.BoxGeometry(2, 1, 3)
      const material = new THREE.MeshLambertMaterial({ 
        color: 0x4A90E2,
        transparent: false,
        opacity: 1.0
      })
      const cube = new THREE.Mesh(geometry, material)
      cube.position.set(0, 0.5, 0)
      cube.castShadow = true
      cube.receiveShadow = true
      scene.add(cube)
      model = cube // Set as model for configuration
      console.log('✅ Fallback cube added to scene')
      
      // Position camera to view fallback
      camera.position.set(4, 2, 6)
      camera.lookAt(0, 0.5, 0)
    }
  )
}

const applyConfiguration = () => {
  if (!model) return

  const config = configuration.value
  console.log('🎨 Applying configuration:', config)

  model.traverse((child) => {
    if (child.isMesh && child.material) {
      // Apply color
      const colorOption = colorOptions.find(c => c.value === config.color)
      if (colorOption) {
        child.material.color.setHex(colorOption.hex.replace('#', '0x'))
      }

      // Apply material properties
      switch (config.material) {
        case 'leather':
          child.material.roughness = 0.3
          child.material.metalness = 0.1
          break
        case 'fabric':
          child.material.roughness = 0.8
          child.material.metalness = 0.0
          break
        case 'velvet':
          child.material.roughness = 0.9
          child.material.metalness = 0.0
          break
      }
    }
  })

  // Apply size (scale)
  const sizeOption = sizeOptions.find(s => s.value === config.size)
  if (sizeOption && model) {
    const scale = sizeOption.multiplier
    model.scale.set(scale, scale, scale)
  }

  // Update pricing
  updatePricing()
}

const updatePricing = () => {
  const config = configuration.value
  const addons = []

  // Material pricing
  if (config.material === 'leather') {
    addons.push({ name: 'Leather Upgrade', price: 199.99 })
  } else if (config.material === 'velvet') {
    addons.push({ name: 'Velvet Upgrade', price: 149.99 })
  }

  // Size pricing
  const sizeOption = sizeOptions.find(s => s.value === config.size)
  if (sizeOption && sizeOption.price > 0) {
    addons.push({ name: `${sizeOption.label} Size`, price: sizeOption.price })
  }

  priceAddons.value = addons
}

const updateConfiguration = () => {
  applyConfiguration()
  generateShareableUrl()
}

const updateColor = (color) => {
  configuration.value.color = color
  updateConfiguration()
}

const updateSize = (size) => {
  configuration.value.size = size
  updateConfiguration()
}

const animate = () => {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

const onWindowResize = () => {
  if (!canvasContainer.value || !camera || !renderer) return
  
  camera.aspect = canvasContainer.value.clientWidth / canvasContainer.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
}

const resetCamera = () => {
  if (model) {
    // Reset to view the actual model
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    const distance = Math.max(size.x, size.y, size.z) * 2
    camera.position.set(distance, distance * 0.5, distance)
    camera.lookAt(center)
    
    console.log('🔄 Camera reset to view model:', {
      modelCenter: center,
      cameraPosition: camera.position
    })
  } else {
    // Default reset
    camera.position.set(2, 1, 7)
    camera.lookAt(0, 0, 0)
  }
  
  controls.reset()
}

const takeScreenshot = () => {
  if (!renderer) return
  
  const dataURL = renderer.domElement.toDataURL('image/png')
  const link = document.createElement('a')
  link.download = 'product-configuration.png'
  link.href = dataURL
  link.click()
  
  return dataURL
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    canvasContainer.value.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

const saveConfiguration = async () => {
  if (!shopifyService.productId) {
    alert('⚠️ No product ID found. Are you running in Shopify?')
    return
  }
  
  isSaving.value = true
  
  try {
    const previewImage = takeScreenshot()
    const result = await shopifyService.saveConfiguration(
      configuration.value,
      previewImage,
      totalPrice.value
    )
    
    console.log('✅ Configuration saved:', result)
    
    // Show success message
    if (shopifyService.isEmbeddedInShopify()) {
      shopifyService.sendToShopify('SHOW_TOAST', {
        message: 'Configuration saved successfully! 🎉',
        type: 'success'
      })
    } else {
      alert('✅ Configuration saved successfully!')
    }
    
  } catch (error) {
    console.error('❌ Error saving configuration:', error)
    alert('❌ Failed to save configuration. Please try again.')
  } finally {
    isSaving.value = false
  }
}

// const generateShareableUrl = () => {
//   shareableUrl.value = shopifyService.generateShareableUrl(configuration.value)
// }

// const copyToClipboard = () => {
//   navigator.clipboard.writeText(shareableUrl.value)
//   alert('✅ URL copied to clipboard!')
// }

// Lifecycle
onMounted(() => {
  console.log('🚀 Vue component mounted')
  
  // Initialize Three.js scene
  initThreeJS()
  
  // Load configuration from URL if present
  const urlConfig = shopifyService.getConfigFromUrl()
  if (urlConfig) {
    configuration.value = { ...configuration.value, ...urlConfig }
    console.log('🔗 Loaded configuration from URL:', urlConfig)
  }
  
  // Setup Shopify message listener
  shopifyService.setupShopifyMessageListener()
  
  // Generate initial shareable URL
  generateShareableUrl()
  
  // Notify Shopify that Vue app is ready
  if (shopifyService.isEmbeddedInShopify()) {
    shopifyService.sendToShopify('VUE_APP_READY', {
      message: '3D Configurator loaded successfully'
    })
  }
  
  console.log('🎉 3D Configurator initialization complete!')
})

// ✅ NEW: Add to Cart Function
const addToCart = async () => {
  if (!shopifyService.productId) {
    alert('⚠️ No product ID found. Are you running in Shopify?')
    return
  }
  
  if (!hasValidConfiguration.value) {
    alert('⚠️ Please complete your configuration before adding to cart.')
    return
  }
  
  isAddingToCart.value = true
  
  try {
    console.log('🛒 Starting cart addition process...')
    
    // Add to cart with current configuration and pricing
    const result = await shopifyService.addToCart(
      configuration.value,
      totalPrice.value
    )
    
    console.log('✅ Successfully added to cart:', result)
    
    // Show success message
    if (shopifyService.isEmbeddedInShopify()) {
      shopifyService.sendToShopify('SHOW_TOAST', {
        message: `Custom ${configuration.value.material} ${configuration.value.color} sofa added to cart! 🛒`,
        type: 'success'
      })
    } else {
      alert(`✅ Success! Custom ${configuration.value.material} ${configuration.value.color} sofa added to cart for ${totalPrice.value.toFixed(2)}!`)
    }
    
    // Optional: Reset configuration or redirect
    // configuration.value = { material: 'fabric', color: 'blue', size: 'medium' }
    // updateConfiguration()
    
  } catch (error) {
    console.error('❌ Error adding to cart:', error)
    
    // Show error message
    if (shopifyService.isEmbeddedInShopify()) {
      shopifyService.sendToShopify('SHOW_TOAST', {
        message: 'Failed to add to cart. Please try again.',
        type: 'error'
      })
    } else {
      alert('❌ Failed to add to cart. Please try again.')
    }
  } finally {
    isAddingToCart.value = false
  }
}

// const addToCart = async () => {
//   if (!shopifyService.productId) {
//     alert('⚠️ No product ID found. Are you running in Shopify?')
//     return
//   }
  
//   isAddingToCart.value = true
  
//   try {
//     // First save the configuration
//     const previewImage = takeScreenshot()
//     const saveResult = await shopifyService.saveConfiguration(
//       configuration.value,
//       previewImage,
//       totalPrice.value
//     )
    
//     // Then add to cart
//     await shopifyService.addToCart(saveResult.configuration.id)
    
//     // Show success message
//     if (shopifyService.isEmbeddedInShopify()) {
//       shopifyService.sendToShopify('SHOW_TOAST', {
//         message: 'Added to cart successfully! 🛒',
//         type: 'success'
//       })
//     } else {
//       alert('🛒 Added to cart successfully!')
//     }
    
//   } catch (error) {
//     console.error('❌ Error adding to cart:', error)
//     alert('❌ Failed to add to cart. Please try again.')
//   } finally {
//     isAddingToCart.value = false
//   }
// }

const generateShareableUrl = () => {
  shareableUrl.value = shopifyService.generateShareableUrl(configuration.value)
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(shareableUrl.value)
    alert('📋 URL copied to clipboard!')
  } catch (error) {
    console.error('Failed to copy URL:', error)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = shareableUrl.value
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    alert('📋 URL copied to clipboard!')
  }
}

const loadConfigurationFromUrl = () => {
  const urlConfig = shopifyService.getConfigFromUrl()
  if (urlConfig) {
    configuration.value = { ...configuration.value, ...urlConfig }
    console.log('🔗 Loaded configuration from URL:', urlConfig)
    applyConfiguration()
  }
}

// Lifecycle
onMounted(() => {
  console.log('🚀 ThreeScene mounted')
  
  // Initialize Shopify service
  shopifyService.setupShopifyMessageListener()
  
  // Initialize Three.js
  initThreeJS()
  
  // Load configuration from URL if present
  loadConfigurationFromUrl()
  
  // Generate initial shareable URL
  generateShareableUrl()
})

// Watch for configuration changes
</script>
  
<style scoped>
.configurator-container {
  display: flex;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8f9fa;
}

.viewer-section {
  flex: 2;
  position: relative;
  background: #f0f0f0;
}

.viewer-container {
  width: 100%;
  height: 100%;
  display: block;
  overflow: hidden;
}

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
  z-index: 10;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e1e5e9;
  border-top: 4px solid #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.controls-overlay {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  z-index: 5;
}

.control-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.control-btn:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.info-panel {
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 12px;
  font-size: 12px;
  color: #6b7280;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.config-panel {
  flex: 1;
  background: white;
  padding: 24px;
  overflow-y: auto;
  border-left: 1px solid #e1e5e9;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
}

.config-header {
  margin-bottom: 32px;
}

.config-header h2 {
  margin: 0 0 12px 0;
  color: #1a1a1a;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.config-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  transition: background-color 0.2s ease;
}

.status-dot.connected {
  background: #10b981;
}

.config-section {
  margin-bottom: 32px;
}

.config-group {
  margin-bottom: 24px;
}

.config-group label {
  display: block;
  margin-bottom: 12px;
  font-weight: 600;
  color: #374151;
  font-size: 16px;
}

.config-group select {
  width: 100%;
  padding: 16px;
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  font-size: 16px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><path fill="%23666" d="M2 0L0 2h4zm0 5L0 3h4z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 16px center;
  background-size: 12px;
}

.config-group select:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.color-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.color-swatch:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.color-swatch.active {
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15);
}

.size-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.size-btn {
  padding: 16px 20px;
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.size-btn:hover {
  border-color: #0066cc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.15);
}

.size-btn.active {
  border-color: #0066cc;
  background: #0066cc;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.25);
}

.size-price {
  font-size: 12px;
  opacity: 0.8;
}

.price-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 24px;
  border-radius: 16px;
  margin-bottom: 32px;
  border: 1px solid #e1e5e9;
}

.price-breakdown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.price-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  color: #6b7280;
}

.price-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  padding-top: 16px;
  border-top: 2px solid #e1e5e9;
  margin-top: 8px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.btn {
  padding: 18px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn-primary {
  background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0052a3 0%, #003366 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 102, 204, 0.4);
}

.btn-secondary {
  background: white;
  color: #4a4a4a;
  border: 2px solid #e1e5e9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.btn-secondary:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #0066cc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.15);
}

.btn-small {
  padding: 12px 20px;
  font-size: 14px;
  min-height: auto;
}

.share-section {
  border-top: 1px solid #e1e5e9;
  padding-top: 32px;
  margin-bottom: 32px;
}

.share-section h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
}

.share-url {
  display: flex;
  gap: 12px;
}

.share-input {
  flex: 1;
  padding: 16px;
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  font-size: 14px;
  background: #f8f9fa;
  cursor: pointer;
  font-family: 'Monaco', 'Menlo', monospace;
}

.share-input:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.debug-section {
  border-top: 1px solid #e1e5e9;
  padding-top: 24px;
  margin-top: 24px;
}

.debug-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ef4444;
}

.debug-section pre {
  background: #1f2937;
  color: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  overflow-x: auto;
  line-height: 1.4;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .configurator-container {
    flex-direction: column;
    height: auto;
  }
  
  .viewer-section {
    height: 50vh;
    min-height: 400px;
  }
  
  .config-panel {
    border-left: none;
    border-top: 1px solid #e1e5e9;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  }
}

@media (max-width: 768px) {
  .config-panel {
    padding: 16px;
  }
  
  .config-header h2 {
    font-size: 24px;
  }
  
  .size-options {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-buttons {
    gap: 12px;
  }
  
  .btn {
    padding: 16px 20px;
    font-size: 15px;
    min-height: 52px;
  }
}

@media (max-width: 480px) {
  .viewer-section {
    height: 40vh;
    min-height: 300px;
  }
  
  .controls-overlay {
    top: 12px;
    right: 12px;
    gap: 6px;
  }
  
  .control-btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  
  .size-options {
    grid-template-columns: 1fr;
  }
  
  .color-options {
    justify-content: center;
  }
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.config-panel {
  animation: fadeIn 0.5s ease-out;
}

/* Scrollbar Styling */
.config-panel::-webkit-scrollbar {
  width: 8px;
}

.config-panel::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.config-panel::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 10px;
}

.config-panel::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
  