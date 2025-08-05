<!-- Minimal Working ThreeScene.vue -->
<template>
  <div class="configurator-container">
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
                :title="color.label"
              ></div>
            </div>
          </div>

          <!-- Add to Cart Button -->
          <div class="cart-section">
            <button 
              @click="addToCart" 
              :disabled="!model || isAddingToCart"
              class="add-to-cart-btn">
              {{ isAddingToCart ? 'Adding...' : `Add to Cart - ${calculatedPrice.toFixed(2)}` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import shopifyService from '../services/shopifyService'

// Refs
const canvasContainer = ref(null)
const isLoading = ref(true)
const sceneChildren = ref(0)
const isAddingToCart = ref(false)
const calculatedPrice = ref(299.99) // Base price

// Three.js refs
let scene, camera, renderer, model, controls

// Configuration state
const configuration = ref({
  color: 'blue'
})

const colorOptions = [
  { label: 'Blue', value: 'blue', hex: '#4A90E2' },
  { label: 'Red', value: 'red', hex: '#E24A4A' },
  { label: 'Green', value: 'green', hex: '#4AE24A' },
  { label: 'Brown', value: 'brown', hex: '#8B4513' },
  { label: 'Purple', value: 'purple', hex: '#9B59B6' },
  { label: 'Orange', value: 'orange', hex: '#E67E22' }
]

// Methods
const initThreeJS = () => {
  console.log('🚀 Initializing Three.js...')
  
  if (!canvasContainer.value) {
    console.error('❌ Canvas container not found!')
    return
  }
  
  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xfafafa)
  
  // Camera setup
  camera = new THREE.PerspectiveCamera(75, canvasContainer.value.clientWidth / canvasContainer.value.clientHeight, 0.1, 1000)
  camera.position.set(4, 2, 6)
  camera.lookAt(0, 0, 0)
  
  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight)
  canvasContainer.value.appendChild(renderer.domElement)
  
  // Camera controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enableZoom = true
  controls.enableRotate = true
  controls.enablePan = false
  controls.maxDistance = 15
  controls.minDistance = 3
  controls.maxPolarAngle = Math.PI * 0.8
  controls.minPolarAngle = Math.PI * 0.1
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)
  
  console.log('✅ Three.js setup complete')
  
  // Load model
  loadModel()
  
  // Start animation
  animate()
}

const loadModel = () => {
  console.log('🔄 Loading GLB model...')
  
  const loader = new GLTFLoader()
  
  loader.load(
    '/models/Couch.glb',
    (gltf) => {
      console.log('✅ GLB loaded successfully:', gltf)
      
      model = gltf.scene
      
      // Apply bright blue material to all meshes
      model.traverse((child) => {
        if (child.isMesh) {
          console.log('📦 Processing mesh:', child.name)
          child.material = new THREE.MeshStandardMaterial({
            color: 0x0088ff, // Bright blue
            transparent: false,
            opacity: 1.0
          })
          child.visible = true
        }
      })
      
      // Scale and position
      model.scale.setScalar(2.5)
      model.position.set(0, -0.5, 0)
      
      // Add to scene
      scene.add(model)
      sceneChildren.value = scene.children.length
      isLoading.value = false
      
      console.log('✅ Model added to scene')
    },
    (xhr) => {
      if (xhr.lengthComputable) {
        const progress = (xhr.loaded / xhr.total * 100)
        console.log(`⏳ Loading progress: ${progress.toFixed(1)}%`)
      }
    },
    (error) => {
      console.error('❌ Error loading GLB:', error)
      isLoading.value = false
      
      // Add fallback cube
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1, 3),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      )
      cube.position.set(0, 0.5, 0)
      scene.add(cube)
      model = cube
      sceneChildren.value = scene.children.length
      console.log('📎 Added fallback cube')
    }
  )
}

const updateColor = (color) => {
  configuration.value.color = color
  if (!model) return
  
  const colorOption = colorOptions.find(c => c.value === color)
  if (!colorOption) return
  
  const colorHex = colorOption.hex.replace('#', '0x')
  
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.color.setHex(colorHex)
    }
  })
  
  console.log('🎨 Color changed to:', color)
}

const addToCart = async () => {
  if (isAddingToCart.value) return
  
  try {
    isAddingToCart.value = true
    console.log('🛒 Starting add to cart process...')
    
    const configurationData = {
      color: configuration.value.color,
      basePrice: 299.99,
      selectedOptions: configuration.value
    }
    
    const result = await shopifyService.addToCart(configurationData, calculatedPrice.value)
    
    console.log('✅ Successfully added to cart:', result)
    alert('Product added to cart successfully!')
    
  } catch (error) {
    console.error('❌ Failed to add to cart:', error)
    alert('Failed to add to cart. Please try again.')
  } finally {
    isAddingToCart.value = false
  }
}

const animate = () => {
  requestAnimationFrame(animate)
  
  // Update controls for smooth damping
  if (controls) {
    controls.update()
  }
  
  renderer.render(scene, camera)
}

// Handle window resize
const handleResize = () => {
  if (!camera || !renderer || !canvasContainer.value) return
  
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

// Lifecycle
onMounted(() => {
  console.log('🚀 Component mounted, initializing...')
  initThreeJS()
  
  // Add resize listener
  window.addEventListener('resize', handleResize)
})

// Cleanup
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.configurator-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 600px;
  font-family: Arial, sans-serif;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  background: white;
}

.viewer-section {
  flex: 1;
  position: relative;
  background: #fafafa;
  min-height: 450px;
}

.viewer-container {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.config-panel {
  height: 150px;
  background: white;
  border-top: 2px solid #e1e5e9;
  overflow: hidden;
}

.config-content {
  padding: 15px 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.config-header {
  margin-bottom: 15px;
  text-align: center;
}

.config-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1a1a1a;
  font-weight: 600;
}

.config-options {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
}

.config-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #28a745;
}

.config-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-group label {
  font-weight: 600;
  color: #4a4a4a;
  font-size: 14px;
  margin: 0;
}

.color-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #e1e5e9;
  transition: all 0.2s ease;
}

.color-swatch:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.color-swatch.active {
  border-color: #0066cc;
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.3);
}

.cart-section {
  margin-left: auto;
}

.add-to-cart-btn {
  background: linear-gradient(135deg, #0066cc, #0052a3);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.3);
}

.add-to-cart-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #0052a3, #004080);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.4);
}

.add-to-cart-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
