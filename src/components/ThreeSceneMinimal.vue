<!-- Updated 3D Configurator with Clickable Mesh Parts -->
<template>
  <div class="configurator-fullscreen">
    <!-- Left Side: 3D Viewer -->
    <div class="viewer-section">
      <div ref="canvasContainer" class="viewer-container"></div>
      
      <!-- Interactive Hotspot Overlays -->
      <div class="hotspot-overlays">
        <div 
          v-for="hotspot in visibleHotspots" 
          :key="hotspot.id"
          :class="['hotspot-marker', { 
            'active': activeHotspot?.id === hotspot.id,
            'highlighted': hoveredHotspot?.id === hotspot.id 
          }]"
          :style="{
            left: hotspot.screenPosition.x + 'px',
            top: hotspot.screenPosition.y + 'px'
          }"
          @mouseenter="onHotspotHover(hotspot)"
          @mouseleave="onHotspotLeave"
          @click="selectHotspot(hotspot)"
        >
          <div class="hotspot-pulse"></div>
          <div class="hotspot-icon">{{ hotspot.icon }}</div>
          <div class="hotspot-tooltip">{{ hotspot.name }} - Click mesh or hotspot</div>
        </div>
      </div>
      
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
          <h2>🛋️ Customize Your Sofa</h2>
          <p class="product-description">
            {{ activeHotspot ? `Customizing: ${activeHotspot.name}` : 'Click on sofa parts or hotspots to customize' }}
          </p>
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
          
          <!-- Default Overview -->
          <div v-if="!activeHotspot" class="overview-section">
            <div class="quick-overview">
              <h3>✨ How to Customize</h3>
              <p>Click directly on the sofa parts or use the hotspots:</p>
              <div class="feature-list">
                <div class="feature-item" @click="selectHotspotById('cushions')">
                  <span class="feature-icon">🟦</span>
                  <span class="feature-name">Cushions</span>
                  <span class="feature-desc">Click the seat cushions</span>
                </div>
                <div class="feature-item" @click="selectHotspotById('frame')">
                  <span class="feature-icon">🔲</span>
                  <span class="feature-name">Frame</span>
                  <span class="feature-desc">Click the main body</span>
                </div>
                <div class="feature-item" @click="selectHotspotById('pillows')">
                  <span class="feature-icon">🟨</span>
                  <span class="feature-name">Pillows</span>
                  <span class="feature-desc">Click decorative pillows</span>
                </div>
                <div class="feature-item" @click="selectHotspotById('legs')">
                  <span class="feature-icon">⚫</span>
                  <span class="feature-name">Legs</span>
                  <span class="feature-desc">Click the sofa legs</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Cushions Customization -->
          <div v-else-if="activeHotspot.id === 'cushions'" class="option-group">
            <div class="back-button" @click="clearSelection()">
              ← Back to Overview
            </div>
            <h3 class="option-title">🟦 Cushion Colors</h3>
            <p class="option-subtitle">{{ getSelectedColorLabel() }}</p>
            <div class="color-grid">
              <div 
                v-for="color in colorOptions" 
                :key="color.value"
                :class="['color-option', { active: configuration.cushionColor === color.value }]"
                @click="updateCushionColor(color.value)"
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

          <!-- Frame Customization -->
          <div v-else-if="activeHotspot.id === 'frame'" class="option-group">
            <div class="back-button" @click="clearSelection()">
              ← Back to Overview
            </div>
            <h3 class="option-title">🔲 Frame Material</h3>
            <p class="option-subtitle">{{ getFrameLabel() }}</p>
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

          <!-- Pillows Customization -->
          <div v-else-if="activeHotspot.id === 'pillows'" class="option-group">
            <div class="back-button" @click="clearSelection()">
              ← Back to Overview
            </div>
            <h3 class="option-title">🟨 Decorative Pillows</h3>
            <p class="option-subtitle">{{ getPillowLabel() }}</p>
            <div class="pillow-options">
              <div 
                v-for="pillow in pillowOptions" 
                :key="pillow.value"
                :class="['pillow-option', { active: configuration.pillowStyle === pillow.value }]"
                @click="updatePillowStyle(pillow.value)"
              >
                <div class="pillow-preview" :style="{ backgroundColor: pillow.color }"></div>
                <span class="pillow-name">{{ pillow.label }}</span>
                <span class="pillow-price">+${{ pillow.extraCost }}</span>
              </div>
            </div>
          </div>

          <!-- Legs Customization -->
          <div v-else-if="activeHotspot.id === 'legs'" class="option-group">
            <div class="back-button" @click="clearSelection()">
              ← Back to Overview
            </div>
            <h3 class="option-title">⚫ Sofa Legs</h3>
            <p class="option-subtitle">{{ getLegLabel() }}</p>
            <div class="leg-options">
              <div 
                v-for="leg in legOptions" 
                :key="leg.value"
                :class="['leg-option', { active: configuration.legStyle === leg.value }]"
                @click="updateLegStyle(leg.value)"
              >
                <div class="leg-preview">
                  <div class="leg-shape" :style="{ backgroundColor: leg.color }"></div>
                </div>
                <span class="leg-name">{{ leg.label }}</span>
                <span class="leg-price">+${{ leg.extraCost }}</span>
              </div>
            </div>
          </div>

          <!-- Size Selection (always visible) -->
          <div class="option-group size-selector">
            <h3 class="option-title">📏 Sofa Size</h3>
            <p class="option-subtitle">{{ getSizeLabel() }}</p>
            <div class="size-options">
              <div 
                v-for="size in sizeOptions"
                :key="size.value"
                :class="['size-option', { active: configuration.size === size.value }]"
                @click="updateSize(size.value)"
              >
                <span class="size-name">{{ size.label }}</span>
                <span class="size-dimensions">{{ size.dimensions }}</span>
                <span class="size-price">+${{ size.extraCost }}</span>
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
            <span v-else">Add to Cart - ${{ calculatedPrice.toFixed(2) }}</span>
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

// Refs
const canvasContainer = ref(null)
const isLoading = ref(true)
const isAddingToCart = ref(false)
const showDebugInfo = ref(false)
const selectedModel = ref('armalite_ar-10t_battle_rifle.glb') // Default model

// Available models
const availableModels = ref([
  { name: 'AK-47 (Low Poly)', value: 'akm__free_lowpoly.glb' },
  { name: 'AR-10T Battle Rifle', value: 'armalite_ar-10t_battle_rifle.glb' },
  { name: 'Canon AT-1 Camera', value: 'canon_at-1_retro_camera.glb' },
  { name: 'Check Model', value: 'check.glb' },
  { name: 'Couch', value: 'Couch.glb' },
  { name: 'Headphones', value: 'headphones_free_model_by_oscar_creative.glb' },
  { name: 'AKM-SU (Low Poly)', value: 'low-poly_akmsu.glb' },
  { name: 'Office Chair', value: 'officeChair.glb' },
  { name: 'Old Fridge', value: 'old_fridge.glb' },
  { name: 'Old Table Fan', value: 'old_table_fan.glb' }
])

// Debug Stats
const debugStats = ref({
  totalMeshes: 0,
  cushions: 0,
  frame: 0,
  pillows: 0,
  legs: 0
})

// Hotspot System
const activeHotspot = ref(null)
const hoveredHotspot = ref(null)
const visibleHotspots = ref([])
const clickedMesh = ref(null) // Track the specific mesh that was clicked

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

// Configuration state
const configuration = ref({
  cushionColor: 'blue',
  frameMaterial: 'oak',
  pillowStyle: 'classic',
  legStyle: 'wooden',
  size: '2-seater'
})

// Hotspot definitions
const hotspotDefinitions = ref([
  {
    id: 'cushions',
    name: 'Seat Cushions',
    icon: '🟦',
    position: { x: 0, y: 0.5, z: 0.3 },
    meshNames: ['seat', 'cushion', 'Cushion']
  },
  {
    id: 'frame',
    name: 'Frame & Armrests',
    icon: '🔲', 
    position: { x: -1.2, y: 0.3, z: 0 },
    meshNames: ['frame', 'armrest', 'Frame', 'Armrest']
  },
  {
    id: 'pillows',
    name: 'Decorative Pillows',
    icon: '🟨',
    position: { x: -0.5, y: 0.8, z: -0.3 },
    meshNames: ['pillow', 'Pillow']
  },
  {
    id: 'legs',
    name: 'Sofa Legs',
    icon: '⚫',
    position: { x: 0, y: -0.3, z: 0.5 },
    meshNames: ['leg', 'Leg', 'support']
  }
])

// Configuration Options
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

const sizeOptions = ref([
  { label: '2-Seater', value: '2-seater', dimensions: '150cm × 85cm', extraCost: 0 },
  { label: '3-Seater', value: '3-seater', dimensions: '200cm × 85cm', extraCost: 200 },
  { label: 'L-Shape', value: 'l-shape', dimensions: '250cm × 200cm', extraCost: 400 }
])

// Computed price
const calculatedPrice = computed(() => {
  let basePrice = 299.99
  
  const selectedColor = colorOptions.value.find(c => c.value === configuration.value.cushionColor)
  if (selectedColor) basePrice = selectedColor.price
  
  const selectedFrame = frameOptions.value.find(f => f.value === configuration.value.frameMaterial)
  if (selectedFrame) basePrice += selectedFrame.extraCost
  
  const selectedPillow = pillowOptions.value.find(p => p.value === configuration.value.pillowStyle)
  if (selectedPillow) basePrice += selectedPillow.extraCost
  
  const selectedLeg = legOptions.value.find(l => l.value === configuration.value.legStyle)
  if (selectedLeg) basePrice += selectedLeg.extraCost
  
  const selectedSize = sizeOptions.value.find(s => s.value === configuration.value.size)
  if (selectedSize) basePrice += selectedSize.extraCost
  
  return basePrice
})

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

const getSizeLabel = () => {
  const selected = sizeOptions.value.find(s => s.value === configuration.value.size)
  return selected ? selected.label : 'Select Size'
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
    
    // Determine which hotspot this mesh belongs to
    const hotspotId = identifyMeshHotspot(targetMesh)
    if (hotspotId) {
      console.log("🚀 ~ onMouseClick ~ hotspotId:", hotspotId)
      const hotspot = hotspotDefinitions.value.find(h => h.id === hotspotId)
      if (hotspot) {
        selectHotspot(hotspot)
        
        // Add visual feedback
        highlightClickedMesh(targetMesh)
      }
    }
  }else {
  clearSelection() 
  }
}

const identifyMeshHotspot = (mesh) => {
  const name = mesh.name.toLowerCase()
  const partType = mesh.userData.partType
  
  // Identify which hotspot category this mesh belongs to
  if (name.includes('leg') || name.includes('support') || partType === 'leg') {
    return 'legs'
  } else if (name.includes('seat') || name.includes('cushion') || partType === 'cushion') {
    return 'cushions'  
  } else if (name.includes('pillow') || partType === 'pillow') {
    return 'pillows'
  } else if (name.includes('frame') || name.includes('arm') || name.includes('back') || partType === 'frame') {
    return 'frame'
  }
  
  return null
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

// Hotspot interaction functions
const onHotspotHover = (hotspot) => {
  hoveredHotspot.value = hotspot
  highlightMeshes(hotspot.meshNames, true)
}

const onHotspotLeave = () => {
  if (hoveredHotspot.value) {
    highlightMeshes(hoveredHotspot.value.meshNames, false)
  }
  hoveredHotspot.value = null
}

const selectHotspot = (hotspot) => {
  activeHotspot.value = hotspot
  // DO NOT clear clicked mesh here - we want to preserve it for individual mesh updates
  // clickedMesh.value = null // REMOVED - this was causing the bug!
  console.log('🎯 Selected hotspot:', hotspot.name)
  console.log('🎯 Current clickedMesh:', clickedMesh.value ? clickedMesh.value.name : 'none')
}

const selectHotspotById = (id) => {
  const hotspot = hotspotDefinitions.value.find(h => h.id === id)
  if (hotspot) {
    selectHotspot(hotspot)
  }
}

const clearSelection = () => {
  activeHotspot.value = null
  clickedMesh.value = null // Clear the clicked mesh when going back to overview
  
  console.log('🗑️ Cleared selection - activeHotspot and clickedMesh reset')
  
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

// Mesh highlighting function
const highlightMeshes = (meshNames, highlight) => {
  if (!model) return
  
  const targetParts = sofaParts.all.filter(part => 
    meshNames.some(name => 
      part.name.toLowerCase().includes(name.toLowerCase()) ||
      part.userData.partType?.includes(name.toLowerCase())
    )
  )
  
  targetParts.forEach(part => {
    if (part.material) {
      if (highlight) {
        if (!part.userData.originalEmissive) {
          part.userData.originalEmissive = part.material.emissive.clone()
        }
        part.material.emissive.setHex(0x444444)
      } else {
        if (part.userData.originalEmissive) {
          part.material.emissive.copy(part.userData.originalEmissive)
        }
      }
    }
  })
}

// Update hotspot screen positions
const updateHotspotPositions = () => {
  if (!camera || !model) return
  
  visibleHotspots.value = hotspotDefinitions.value.map(hotspot => {
    const vector = new THREE.Vector3(
      hotspot.position.x,
      hotspot.position.y, 
      hotspot.position.z
    )
    
    vector.applyMatrix4(model.matrixWorld)
    vector.project(camera)
    
    const rect = canvasContainer.value?.getBoundingClientRect()
    if (!rect) return { ...hotspot, screenPosition: { x: -1000, y: -1000 } }
    
    const x = ((vector.x + 1) / 2) * rect.width
    const y = ((-vector.y + 1) / 2) * rect.height
    
    return {
      ...hotspot,
      screenPosition: { x, y },
      visible: vector.z < 1
    }
  }).filter(h => h.visible)
}

// Configuration update functions
const updateCushionColor = (colorValue) => {
  console.log('🎨 Updating cushion color to:', colorValue)
  configuration.value.cushionColor = colorValue
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

const updateSize = (size) => {
  console.log('📏 Updating sofa size to:', size)
  configuration.value.size = size
  updateSofaSize(size)
}

// Real-time 3D model update functions (work with existing model parts only)
const updateCushionColors = () => {
  console.log('🟦 updateCushionColors called - Parts available:', sofaParts.cushions.length)
  
  // If we have a specific clicked mesh, only update that one
  if (clickedMesh.value && clickedMesh.value.userData.partType === 'cushion') {
    const newColorHex = getColorHex(configuration.value.cushionColor)
    console.log('🟦 Applying cushion color to clicked mesh only:', clickedMesh.value.name)
    
    if (clickedMesh.value.material) {
      // Handle material arrays
      if (Array.isArray(clickedMesh.value.material)) {
        clickedMesh.value.material.forEach((mat, index) => {
          mat.color.setHex(newColorHex)
          mat.roughness = 0.8
          mat.metalness = 0.1
          mat.needsUpdate = true
          console.log(`   - Updated material ${index}: #${mat.color.getHexString()}`)
        })
      } else {
        clickedMesh.value.material.color.setHex(newColorHex)
        clickedMesh.value.material.roughness = 0.8
        clickedMesh.value.material.metalness = 0.1
        clickedMesh.value.material.needsUpdate = true
        console.log(`   - New color: #${clickedMesh.value.material.color.getHexString()}`)
      }
      
      // Save the configuration to this specific mesh
      if (!clickedMesh.value.userData.customConfig) {
        clickedMesh.value.userData.customConfig = {}
      }
      clickedMesh.value.userData.customConfig.cushionColor = configuration.value.cushionColor
      console.log(`   - Saved config to mesh:`, clickedMesh.value.userData.customConfig)
    }
    return
  }
  
  // Otherwise, update all cushions (initial load or hotspot click)
  if (!sofaParts.cushions.length) {
    console.log('⚠️ No cushion parts found in the model')
    return
  }
  
  const newColorHex = getColorHex(configuration.value.cushionColor)
  console.log('🟦 Applying cushion color:', newColorHex.toString(16), 'to', sofaParts.cushions.length, 'parts')
  
  sofaParts.cushions.forEach((cushion, index) => {
    console.log(`   Updating cushion ${index}: ${cushion.name}`)
    if (cushion.material) {
      cushion.material.color.setHex(newColorHex)
      cushion.material.roughness = 0.8
      cushion.material.metalness = 0.1
      cushion.material.needsUpdate = true
      
      // Save config to each mesh
      if (!cushion.userData.customConfig) {
        cushion.userData.customConfig = {}
      }
      cushion.userData.customConfig.cushionColor = configuration.value.cushionColor
      
      console.log(`   - New color: #${cushion.material.color.getHexString()}`)
    }
  })
}

const updateFrameMaterials = () => {
  console.log('🔲 updateFrameMaterials called - Parts available:', sofaParts.frame.length)
  console.log('clickedMesh.value',clickedMesh.value);
  console.log('frame',clickedMesh.value.userData.partType);

  // If we have a specific clicked mesh, only update that one
  if (clickedMesh.value && clickedMesh.value.userData.partType === 'frame') {
    const frameColor = getFrameColor(configuration.value.frameMaterial)
    const materialProps = getFrameMaterialProperties(configuration.value.frameMaterial)
    console.log('🔲 Applying frame material to clicked mesh only:', clickedMesh.value.name)
    console.log('🔍 Target mesh material UUID(s):', Array.isArray(clickedMesh.value.material) ? clickedMesh.value.material.map(m => m.uuid) : clickedMesh.value.material.uuid)
    
    if (clickedMesh.value.material) {
      // Handle material arrays
      if (Array.isArray(clickedMesh.value.material)) {
        clickedMesh.value.material.forEach((mat, index) => {
          console.log(`🎨 Updating array material ${index} with UUID: ${mat.uuid}`)
          mat.color.setHex(frameColor)
          mat.roughness = materialProps.roughness
          mat.metalness = materialProps.metalness
          mat.needsUpdate = true
          console.log(`   - Updated material ${index}: #${mat.color.getHexString()}`)
        })
      } else {
        console.log(`🎨 Updating single material with UUID: ${clickedMesh.value.material.uuid}`)
        clickedMesh.value.material.color.setHex(frameColor)
        clickedMesh.value.material.roughness = materialProps.roughness
        clickedMesh.value.material.metalness = materialProps.metalness
        clickedMesh.value.material.needsUpdate = true
        console.log(`   - New color: #${clickedMesh.value.material.color.getHexString()}`)
      }
      
      // Save the configuration to this specific mesh
      if (!clickedMesh.value.userData.customConfig) {
        clickedMesh.value.userData.customConfig = {}
      }
      clickedMesh.value.userData.customConfig.frameMaterial = configuration.value.frameMaterial
      console.log(`   - Saved config to mesh:`, clickedMesh.value.userData.customConfig)
    }
    
    // SAFETY CHECK: Verify no other meshes were affected
    console.log('🔎 SAFETY CHECK: Verifying other meshes were not affected...')
    let affectedCount = 0
    sofaParts.all.forEach(part => {
      if (part !== clickedMesh.value && part.material) {
        const currentColor = Array.isArray(part.material) 
          ? part.material[0].color.getHexString() 
          : part.material.color.getHexString()
        const targetColor = frameColor.toString(16).padStart(6, '0')
        if (currentColor === targetColor) {
          console.warn(`⚠️ UNEXPECTED: ${part.name} also has the target color!`)
          affectedCount++
        }
      }
    })
    console.log(`🔎 Safety check complete: ${affectedCount} unexpected matches found`)
    return
  }
  
  // Otherwise, update all frame parts (initial load or hotspot click)
  if (!sofaParts.frame.length) {
    console.log('⚠️ No frame parts found in the model')
    return
  }
  
  const frameColor = getFrameColor(configuration.value.frameMaterial)
  const materialProps = getFrameMaterialProperties(configuration.value.frameMaterial)
  
  console.log('🔲 Applying frame material:', configuration.value.frameMaterial, 'color:', frameColor.toString(16))
  
  sofaParts.frame.forEach((framePart, index) => {
    console.log(`   Updating frame ${index}: ${framePart.name}`)
    if (framePart.material) {
      framePart.material.color.setHex(frameColor)
      framePart.material.roughness = materialProps.roughness
      framePart.material.metalness = materialProps.metalness
      framePart.material.needsUpdate = true
      
      // Save config to each mesh
      if (!framePart.userData.customConfig) {
        framePart.userData.customConfig = {}
      }
      framePart.userData.customConfig.frameMaterial = configuration.value.frameMaterial
      
      console.log(`   - New color: #${framePart.material.color.getHexString()}`)
    }
  })
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

const updateSofaSize = (size) => {
  if (!model) return
  
  const scaleFactors = {
    '2-seater': { x: 1.0, y: 1.0, z: 1.0 },
    '3-seater': { x: 1.3, y: 1.0, z: 1.0 },
    'l-shape': { x: 1.2, y: 1.0, z: 1.4 }
  }
  
  const scale = scaleFactors[size] || scaleFactors['2-seater']
  model.scale.set(scale.x, scale.y, scale.z)
  
  console.log('📏 Scaled sofa to:', scale)
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
    
    // Enhanced lighting setup for better visibility from all angles
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    
    // Key light - main directional light
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8)
    keyLight.position.set(10, 10, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 2048
    keyLight.shadow.mapSize.height = 2048
    keyLight.shadow.camera.near = 0.1
    keyLight.shadow.camera.far = 500
    keyLight.shadow.camera.left = -50
    keyLight.shadow.camera.right = 50
    keyLight.shadow.camera.top = 50
    keyLight.shadow.camera.bottom = -50
    scene.add(keyLight)
    
    // Fill light - softer light from the opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
    fillLight.position.set(-10, 5, -5)
    scene.add(fillLight)
    
    // Back light - to separate the model from background
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3)
    backLight.position.set(0, 5, -10)
    scene.add(backLight)
    
    // Add some hemisphere light for more natural lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4)
    hemiLight.position.set(0, 20, 0)
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
  const modelPath = `/models/${selectedModel.value}`
  console.log(`📦 Loading ${selectedModel.value} with clickable mesh analysis...`)
  
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
  
  updateHotspotPositions()
  renderer.render(scene, camera)
}

// Add to cart function
const addToCart = async () => {
  console.log('🛒 Adding configured sofa to cart...')
  
  try {
    isAddingToCart.value = true
    
    const fullConfiguration = {
      cushionColor: configuration.value.cushionColor,
      frameMaterial: configuration.value.frameMaterial,
      pillowStyle: configuration.value.pillowStyle,
      legStyle: configuration.value.legStyle,
      size: configuration.value.size
    }
    
    const cartData = {
      productId: 'customizable-sofa',
      configuration: fullConfiguration,
      price: Number(calculatedPrice.value),
      quantity: 1,
      timestamp: new Date().toISOString()
    }
    
    console.log('📦 Cart data:', cartData)
    
    // Simulate cart addition
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Show success notification
    const notification = document.createElement('div')
    notification.textContent = `✅ Custom sofa added to cart! (${calculatedPrice.value.toFixed(2)})`
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
    
  } catch (error) {
    console.error('❌ Failed to add to cart:', error)
  } finally {
    isAddingToCart.value = false
  }
}

// Lifecycle
onMounted(async () => {
  console.log('🚀 Clickable mesh configurator mounted')
  
  setTimeout(() => {
    initThreeJS()
  }, 100)
})

onUnmounted(() => {
  console.log('🧹 Cleaning up configurator...')
  
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

/* Hotspot System */
.hotspot-overlays {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.hotspot-marker {
  position: absolute;
  pointer-events: all;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
}

.hotspot-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  border: 2px solid rgba(0, 102, 204, 0.6);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 2s infinite;
}

.hotspot-marker.highlighted .hotspot-pulse {
  border-color: rgba(255, 107, 53, 0.8);
  animation-duration: 1s;
}

.hotspot-marker.active .hotspot-pulse {
  border-color: rgba(40, 167, 69, 0.8);
  border-width: 3px;
}

.hotspot-icon {
  position: relative;
  width: 32px;
  height: 32px;
  background: white;
  border: 2px solid #0066cc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: 2;
}

.hotspot-marker.highlighted .hotspot-icon {
  background: #ff6b35;
  border-color: #ff6b35;
  color: white;
  transform: scale(1.2);
}

.hotspot-marker.active .hotspot-icon {
  background: #28a745;
  border-color: #28a745;
  color: white;
  transform: scale(1.1);
}

.hotspot-tooltip {
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s ease;
}

.hotspot-marker:hover .hotspot-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(-4px);
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
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

.material-options, .pillow-options, .leg-options, .size-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.material-option, .pillow-option, .leg-option, .size-option {
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.material-option:hover, .pillow-option:hover, .leg-option:hover, .size-option:hover {
  border-color: #0066cc;
  background: #f9f9f9;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 102, 204, 0.1);
}

.material-option.active, .pillow-option.active, .leg-option.active, .size-option.active {
  border-color: #0066cc;
  background: #f0f7ff;
  box-shadow: 0 3px 10px rgba(0, 102, 204, 0.15);
}

.material-name, .pillow-name, .leg-name, .size-name {
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.material-description, .size-dimensions {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.material-price, .pillow-price, .leg-price, .size-price {
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

.size-selector {
  border-top: 2px solid #e1e5e9;
  padding-top: 24px;
  margin-top: 24px;
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
</style>