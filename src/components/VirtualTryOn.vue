<template>
  <div class="try-on-overlay" @click.self="handleClose">
    <div class="try-on-container">
      <!-- Header -->
      <div class="try-on-header">
        <h2>Virtual Try-On</h2>
        <button class="close-button" @click="handleClose">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Main Content -->
      <div class="try-on-content">
        <!-- Camera Permission Request -->
        <div v-if="!cameraReady && !cameraError" class="camera-request">
          <div class="camera-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </div>
          <h3>Enable Camera Access</h3>
          <p>To use virtual try-on, we need access to your camera</p>
          <button class="enable-camera-btn" @click="requestCameraAccess">
            Enable Camera
          </button>
        </div>

        <!-- Camera Error -->
        <div v-if="cameraError" class="camera-error">
          <div class="error-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3>Camera Access Denied</h3>
          <p>{{ cameraError }}</p>
          <button class="retry-btn" @click="requestCameraAccess">
            Try Again
          </button>
        </div>

        <!-- Try-On View -->
        <div v-if="cameraReady" class="try-on-view">
          <!-- Video Feed (mirrored for selfie view) -->
          <video
            ref="videoElement"
            class="camera-feed"
            autoplay
            playsinline
            muted
          ></video>

          <!-- Three.js Canvas Overlay (transparent) -->
          <canvas ref="tryOnCanvas" class="model-overlay"></canvas>

          <!-- Face Detection Guide -->
          <div v-if="!faceDetected" class="face-guide">
            <div class="face-outline"></div>
            <p>Position your face in the frame</p>
          </div>

          <!-- Loading Model -->
          <div v-if="isLoadingModel" class="loading-model">
            <div class="spinner"></div>
            <p>Loading 3D model...</p>
          </div>

        </div>
      </div>

      <!-- Controls -->
      <div v-if="cameraReady" class="try-on-controls">
        <!-- Color Options -->
        <div class="color-options" v-if="colorOptions.length > 0">
          <span class="control-label">Color:</span>
          <div class="color-swatches">
            <button
              v-for="color in colorOptions"
              :key="color.value"
              class="color-swatch"
              :class="{ active: selectedColor === color.value }"
              :style="{ backgroundColor: color.hex }"
              :title="color.name"
              @click="selectColor(color.value)"
            ></button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <!-- Download Photo -->
          <button class="download-btn" @click="downloadPhoto" title="Download photo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three-stdlib'
import { getFaceTrackingService, type FaceLandmarks } from '../services/faceTrackingService'

// Props
const props = defineProps<{
  modelUrl: string
  productType: string // 'glasses', 'hat', 'earrings', 'necklace'
  colorOptions: Array<{ value: string; name: string; hex: string }>
  selectedColor: string
  offsetY?: number // Vertical offset percentage (-50 to 50)
  scale?: number // Scale multiplier (0.5 to 2.0)
}>()

// Emits
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'capturePreview', dataUrl: string): void
  (e: 'colorChange', color: string): void
}>()

// Refs
const videoElement = ref<HTMLVideoElement | null>(null)
const tryOnCanvas = ref<HTMLCanvasElement | null>(null)

// State
const cameraReady = ref(false)
const cameraError = ref<string | null>(null)
const faceDetected = ref(false)
const isLoadingModel = ref(true)
const selectedColorLocal = ref(props.selectedColor)

// Three.js instances
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let model: THREE.Object3D | null = null
let cameraDistance = 1000 // Will be calculated based on canvas size
let animationFrameId: number | null = null


// Debug eye markers
let leftEyeMarker: THREE.Mesh | null = null
let rightEyeMarker: THREE.Mesh | null = null
const DEBUG_SHOW_EYE_MARKERS = true // Set to false to hide markers

// Face tracking service
const faceTracker = getFaceTrackingService()

/**
 * Request camera access
 */
// Store camera stream for later use
let cameraStream: MediaStream | null = null

async function requestCameraAccess() {
  cameraError.value = null

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user', // Front camera
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    })

    // Store the stream
    cameraStream = stream

    // Set cameraReady FIRST so the video element appears in the DOM
    cameraReady.value = true

    // Wait for Vue to render the video element
    await nextTick()

    // Now the video element should exist
    if (videoElement.value) {
      videoElement.value.srcObject = stream

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        if (!videoElement.value) {
          reject(new Error('Video element not found'))
          return
        }

        videoElement.value.onloadedmetadata = () => {
          videoElement.value!.play()
            .then(() => resolve())
            .catch(reject)
        }

        videoElement.value.onerror = () => {
          reject(new Error('Video error'))
        }
      })

      console.log('Camera ready, video playing')

      // Initialize Three.js after video is ready
      await initThreeJS()

      // Start face tracking
      await startFaceTracking()
    } else {
      console.error('Video element not found after nextTick')
      cameraError.value = 'Failed to initialize video element'
      cameraReady.value = false
    }
  } catch (error: any) {
    console.error('Camera access error:', error)
    cameraReady.value = false

    if (error.name === 'NotAllowedError') {
      cameraError.value = 'Camera access was denied. Please allow camera access in your browser settings.'
    } else if (error.name === 'NotFoundError') {
      cameraError.value = 'No camera found. Please connect a camera and try again.'
    } else {
      cameraError.value = `Failed to access camera: ${error.message}`
    }
  }
}

// Store canvas dimensions for positioning calculations
let canvasWidth = 640
let canvasHeight = 480
// Store native video dimensions (what MediaPipe sees)
let nativeVideoWidth = 640
let nativeVideoHeight = 480

/**
 * Initialize Three.js scene
 */
async function initThreeJS() {
  if (!tryOnCanvas.value || !videoElement.value) return

  const canvas = tryOnCanvas.value
  const video = videoElement.value

  // IMPORTANT: Use the DISPLAYED size of the video, not the native video resolution
  // This accounts for CSS scaling in the modal
  const videoRect = video.getBoundingClientRect()
  canvasWidth = videoRect.width
  canvasHeight = videoRect.height

  // Set canvas to match displayed video size
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  // Also set CSS size to match
  canvas.style.width = canvasWidth + 'px'
  canvas.style.height = canvasHeight + 'px'

  // Store native video dimensions for coordinate conversion
  nativeVideoWidth = video.videoWidth || 640
  nativeVideoHeight = video.videoHeight || 480

  console.log('📐 Video native size:', nativeVideoWidth, 'x', nativeVideoHeight)
  console.log('📐 Video displayed size:', canvasWidth, 'x', canvasHeight)
  console.log('📐 Scale factor:', (canvasWidth / nativeVideoWidth).toFixed(2), 'x', (canvasHeight / nativeVideoHeight).toFixed(2))

  // Create renderer with transparent background
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true  // Required for screenshot capture
  })
  renderer.setSize(canvasWidth, canvasHeight)
  renderer.setClearColor(0x000000, 0) // Fully transparent

  // Create scene
  scene = new THREE.Scene()

  // No clipping plane - show full glasses including temples

  // Use PerspectiveCamera with low FOV for natural temple rendering
  // Low FOV (10°) gives almost orthographic look but preserves depth/perspective for temples
  // This way temples extending backward from the face render naturally
  const fov = 10 // Very low FOV for minimal perspective distortion
  const aspect = canvasWidth / canvasHeight
  camera = new THREE.PerspectiveCamera(fov, aspect, 1, 5000)

  // Position camera far back to compensate for low FOV
  // Distance needed = (canvasHeight/2) / tan(fov/2) to fill the view
  cameraDistance = (canvasHeight / 2) / Math.tan((fov * Math.PI / 180) / 2)
  camera.position.z = cameraDistance

  console.log('📷 PerspectiveCamera created, FOV:', fov, 'distance:', cameraDistance.toFixed(0), 'canvas:', canvasWidth, 'x', canvasHeight)

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
  directionalLight.position.set(0, 1, 2)
  scene.add(directionalLight)

  const backLight = new THREE.DirectionalLight(0xffffff, 0.3)
  backLight.position.set(0, 0, -1)
  scene.add(backLight)

  // Create debug eye markers (small white spheres - size in pixels now)
  if (DEBUG_SHOW_EYE_MARKERS) {
    const markerGeometry = new THREE.SphereGeometry(8, 16, 16) // 8 pixels radius
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }) // Green for visibility

    leftEyeMarker = new THREE.Mesh(markerGeometry, markerMaterial)
    rightEyeMarker = new THREE.Mesh(markerGeometry, markerMaterial)

    leftEyeMarker.visible = false
    rightEyeMarker.visible = false

    scene.add(leftEyeMarker)
    scene.add(rightEyeMarker)

    console.log('👁️ Debug eye markers created (green, 8px radius)')
  }

  // Load 3D model
  await loadModel()

  // Start render loop
  startRenderLoop()
}

// Track if model loaded successfully
const modelLoaded = ref(false)
const modelLoadError = ref<string | null>(null)

/**
 * Load 3D model
 */
async function loadModel() {
  if (!scene) {
    console.error('Scene not initialized')
    return
  }

  isLoadingModel.value = true
  modelLoaded.value = false
  modelLoadError.value = null

  console.log('🔄 Loading try-on model from:', props.modelUrl)

  try {
    const loader = new GLTFLoader()

    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(
        props.modelUrl,
        (gltf) => {
          console.log('✅ Model loaded successfully')
          resolve(gltf)
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100)
            console.log(`📦 Loading model: ${percent}%`)
          }
        },
        (error) => {
          console.error('❌ Model load error:', error)
          reject(error)
        }
      )
    })

    model = gltf.scene

    if (!model) {
      throw new Error('Model scene is empty')
    }

    console.log('📐 Model children:', model.children.length)

    // Calculate model bounding box to auto-scale
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    console.log('📏 Original model size:', size)
    console.log('📍 Original model center:', center)

    // For OrthographicCamera, we scale to pixel units
    // Target: glasses should be about 150 pixels wide as default
    const maxDim = Math.max(size.x, size.y, size.z)
    const targetSizePixels = 150 // Target width in pixels
    const autoScale = targetSizePixels / maxDim

    console.log('🔧 Auto-scale factor (for pixels):', autoScale)

    // Save base scale for face tracking adjustments
    baseModelScale = autoScale

    // Apply scale
    model.scale.setScalar(autoScale)

    // Center the model geometry at origin
    model.position.x = -center.x * autoScale
    model.position.y = -center.y * autoScale
    model.position.z = 0 // Keep at z=0 for orthographic

    // NOTE: Initial position will be overwritten by face tracking

    // No clipping - show full model including temples

    // Make model visible
    model.visible = true

    scene.add(model)
    modelLoaded.value = true

    console.log('✅ Try-on model added to scene:', props.modelUrl)
    console.log('📊 Final model position:', model.position)
    console.log('📊 Final model scale:', model.scale)

  } catch (error: any) {
    console.error('❌ Failed to load try-on model:', error)
    modelLoadError.value = error.message || 'Failed to load model'

    // If Shopify CDN fails, try creating a simple fallback glasses shape
    console.log('🔧 Creating fallback glasses geometry...')
    createFallbackGlasses()
  } finally {
    isLoadingModel.value = false
  }
}

/**
 * Create fallback glasses if model fails to load
 */
function createFallbackGlasses() {
  if (!scene) return

  // Create simple glasses shape using Three.js primitives
  const glassesGroup = new THREE.Group()

  // Frame material
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.8,
    roughness: 0.2
  })

  // Lens material (semi-transparent)
  const lensMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    transparent: true,
    opacity: 0.3,
    metalness: 0.1,
    roughness: 0.1
  })

  // Left lens frame
  const leftFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.015, 8, 32),
    frameMaterial
  )
  leftFrame.position.x = -0.18
  leftFrame.rotation.y = Math.PI / 2
  glassesGroup.add(leftFrame)

  // Left lens
  const leftLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.13, 32),
    lensMaterial
  )
  leftLens.position.x = -0.18
  glassesGroup.add(leftLens)

  // Right lens frame
  const rightFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.015, 8, 32),
    frameMaterial
  )
  rightFrame.position.x = 0.18
  rightFrame.rotation.y = Math.PI / 2
  glassesGroup.add(rightFrame)

  // Right lens
  const rightLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.13, 32),
    lensMaterial
  )
  rightLens.position.x = 0.18
  glassesGroup.add(rightLens)

  // Bridge
  const bridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.08, 8),
    frameMaterial
  )
  bridge.rotation.z = Math.PI / 2
  bridge.position.y = 0.05
  glassesGroup.add(bridge)

  // Temples (arms)
  const leftTemple = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.01, 0.015),
    frameMaterial
  )
  leftTemple.position.set(-0.35, 0.05, -0.05)
  leftTemple.rotation.y = -0.15
  glassesGroup.add(leftTemple)

  const rightTemple = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.01, 0.015),
    frameMaterial
  )
  rightTemple.position.set(0.35, 0.05, -0.05)
  rightTemple.rotation.y = 0.15
  glassesGroup.add(rightTemple)

  model = glassesGroup
  model.visible = true
  model.scale.setScalar(1.5)
  scene.add(model)

  modelLoaded.value = true
  console.log('✅ Fallback glasses created')
}

/**
 * Start face tracking
 */
async function startFaceTracking() {
  if (!videoElement.value) return

  try {
    await faceTracker.initialize()

    faceTracker.onFaceDetected((landmarks: FaceLandmarks) => {
      faceDetected.value = true
      updateModelPosition(landmarks)
    })

    faceTracker.onFaceLost(() => {
      faceDetected.value = false
      if (model) {
        model.visible = false
      }
    })

    await faceTracker.startTracking(videoElement.value)

  } catch (error) {
    console.error('Failed to start face tracking:', error)
  }
}

// Store base scale from model loading
let baseModelScale = 1

/**
 * Convert normalized face coordinates (0-1) to Three.js world coordinates
 * Using OrthographicCamera approach for direct 1:1 pixel mapping
 *
 * MediaPipe gives normalized coords (0-1) based on native video resolution
 * We need to map to the DISPLAYED canvas size (which may be different due to CSS scaling)
 */
function faceToThreeJS(faceX: number, faceY: number): { x: number, y: number } {
  // With PerspectiveCamera, convert face coordinates to world coordinates at z=0
  // The camera distance is calculated so the visible area at z=0 matches canvas dimensions

  // Face coordinates: (0,0) = top-left, (1,1) = bottom-right (normalized)
  // Convert normalized coords to pixel coordinates
  const pixelX = faceX * canvasWidth
  const pixelY = faceY * canvasHeight

  // Convert to world coordinates (center = 0,0)
  // X: 0 -> -width/2, width -> +width/2
  // Y: 0 -> +height/2 (top), height -> -height/2 (bottom) - flip Y
  const worldX = pixelX - canvasWidth / 2
  const worldY = -(pixelY - canvasHeight / 2) // Flip Y

  return { x: worldX, y: worldY }
}

/**
 * Update 3D model position based on face landmarks
 * STEP 1: Position eye markers exactly on the eyes
 * STEP 2: Position glasses centered between the eye markers
 */
function updateModelPosition(landmarks: FaceLandmarks) {
  if (!camera) return

  // Get individual eye positions (now in pixel coordinates)
  const leftEyePos = faceToThreeJS(landmarks.leftEye.x, landmarks.leftEye.y)
  const rightEyePos = faceToThreeJS(landmarks.rightEye.x, landmarks.rightEye.y)

  // Update debug eye markers to visualize exact eye positions
  if (DEBUG_SHOW_EYE_MARKERS && leftEyeMarker && rightEyeMarker) {
    leftEyeMarker.visible = true
    rightEyeMarker.visible = true

    leftEyeMarker.position.set(leftEyePos.x, leftEyePos.y, 10)
    rightEyeMarker.position.set(rightEyePos.x, rightEyePos.y, 10)
  }

  // Position glasses if model is loaded
  if (model && props.productType === 'glasses') {
    model.visible = true

    // Calculate center point between the two eyes (in world coords)
    // This is the MIDPOINT between the green dots - glasses center should be HERE
    const centerX = (leftEyePos.x + rightEyePos.x) / 2
    const centerY = (leftEyePos.y + rightEyePos.y) / 2

    // Calculate the actual eye distance in world units
    const eyeDistanceWorld = Math.sqrt(
      Math.pow(rightEyePos.x - leftEyePos.x, 2) +
      Math.pow(rightEyePos.y - leftEyePos.y, 2)
    )

    // Position glasses so LENSES align with the green dots (eyes)
    // Base offset to align lenses with eyes (most models have origin at bridge)
    const baseLensOffset = eyeDistanceWorld * 0.35

    // Apply custom offset from props (percentage of eye distance)
    // Positive offsetY = move DOWN, Negative = move UP
    const customOffset = (props.offsetY || 0) / 100 * eyeDistanceWorld

    model.position.x = centerX
    model.position.y = centerY - baseLensOffset - customOffset  // Apply both offsets

    // Z position: Place model at z=0 (camera looks at this plane)
    model.position.z = 0

    // Scale glasses based on eye distance
    const targetGlassesWidth = eyeDistanceWorld * 2.2
    const baseScale = targetGlassesWidth / 150 * baseModelScale

    // Apply custom scale multiplier from props
    const customScaleMultiplier = props.scale || 1
    const finalScale = baseScale * customScaleMultiplier

    model.scale.setScalar(Math.max(finalScale, 10)) // Minimum scale

    // Apply face rotation
    // Video is mirrored (selfie mode):
    // - When YOU turn your head to YOUR right, it appears as LEFT in the video
    // - The yaw from face tracking gives the actual head direction
    // - We need to INVERT yaw so glasses match the mirrored appearance
    model.rotation.x = -landmarks.rotation.pitch * 0.3  // Follow head pitch
    model.rotation.y = -landmarks.rotation.yaw * 0.6  // Inverted for mirrored video
    model.rotation.z = landmarks.rotation.roll * 0.5  // Follow head tilt

    // Debug logging
    if (Math.random() < 0.02) {
      console.log('👁️ Left eye:', leftEyePos)
      console.log('👁️ Right eye:', rightEyePos)
      console.log('👓 Glasses center:', { x: centerX.toFixed(1), y: centerY.toFixed(1) })
      console.log('👓 Eye distance:', eyeDistanceWorld.toFixed(1))
      console.log('👓 Scale:', finalScale.toFixed(1))
    }
  }
}

/**
 * Start render loop
 */
function startRenderLoop() {
  const render = () => {
    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
    animationFrameId = requestAnimationFrame(render)
  }
  render()
}

/**
 * Select color
 */
function selectColor(color: string) {
  selectedColorLocal.value = color
  emit('colorChange', color)

  // Apply color to model
  if (model) {
    const colorHex = props.colorOptions.find(c => c.value === color)?.hex || '#000000'
    applyColorToModel(colorHex)
  }
}

/**
 * Apply color to 3D model
 */
function applyColorToModel(hexColor: string) {
  if (!model) return

  const color = new THREE.Color(hexColor)

  model.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if ((mat as THREE.MeshStandardMaterial).color) {
              (mat as THREE.MeshStandardMaterial).color.copy(color)
            }
          })
        } else {
          const mat = mesh.material as THREE.MeshStandardMaterial
          if (mat.color) mat.color.copy(color)
        }
      }
    }
  })
}

/**
 * Combine video and 3D overlay into single canvas
 * Uses the overlay canvas size to maintain correct proportions
 */
function combineVideoAndModel(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const video = videoElement.value!
  const overlay = tryOnCanvas.value!

  // Use overlay canvas dimensions to maintain correct glasses size
  // The overlay is sized to match the displayed video, not the native resolution
  canvas.width = overlay.width
  canvas.height = overlay.height

  const ctx = canvas.getContext('2d')!

  // Draw mirrored video scaled to match overlay size
  ctx.save()
  ctx.scale(-1, 1)
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
  ctx.restore()

  // Draw 3D overlay (also mirrored) - no scaling needed, same size
  ctx.save()
  ctx.scale(-1, 1)
  ctx.drawImage(overlay, -canvas.width, 0, canvas.width, canvas.height)
  ctx.restore()

  return canvas
}

/**
 * Download photo
 */
function downloadPhoto() {
  const canvas = combineVideoAndModel()
  const link = document.createElement('a')
  link.download = `try-on-${Date.now()}.jpg`
  link.href = canvas.toDataURL('image/jpeg', 0.9)
  link.click()
}

/**
 * Handle close
 */
function handleClose() {
  emit('close')
}

/**
 * Cleanup
 */
function cleanup() {
  // Stop face tracking
  faceTracker.stopTracking()

  // Stop render loop
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  // Stop camera stream
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop())
    cameraStream = null
  }

  // Dispose Three.js resources
  if (renderer) {
    renderer.dispose()
    renderer = null
  }
  if (scene) {
    scene.clear()
    scene = null
  }
  camera = null
  model = null
}

// Watch for color changes from parent
watch(() => props.selectedColor, (newColor) => {
  selectedColorLocal.value = newColor
  if (model) {
    const colorHex = props.colorOptions.find(c => c.value === newColor)?.hex || '#000000'
    applyColorToModel(colorHex)
  }
})

// Notify parent (Shopify modal) to hide/show its close button
function notifyParentTryOnState(isOpen: boolean) {
  // Send message to parent window (Shopify iframe container)
  if (window.parent !== window) {
    window.parent.postMessage({
      type: isOpen ? 'IANI_TRYON_OPENED' : 'IANI_TRYON_CLOSED'
    }, '*')
  }
}

// Lifecycle
onMounted(() => {
  // Notify parent that try-on modal is open
  notifyParentTryOnState(true)
  // Auto-request camera on mount
  // requestCameraAccess() // Uncomment to auto-start
})

onUnmounted(() => {
  // Notify parent that try-on modal is closed
  notifyParentTryOnState(false)
  cleanup()
})
</script>

<style scoped>
.try-on-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 0; /* Fullscreen - no padding */
}

.try-on-container {
  background: #000;
  border-radius: 0; /* Fullscreen - no border radius */
  width: 100%;
  height: 100%; /* Fullscreen */
  max-width: none; /* Fullscreen */
  max-height: none; /* Fullscreen */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.try-on-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%);
  z-index: 10;
  border-bottom: none;
}

.try-on-header h2 {
  color: white;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
}

.close-button {
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  border: none;
  color: white;
  cursor: pointer;
  padding: 10px;
  border-radius: 50%;
  transition: all 0.2s;
  z-index: 1000;
}

.close-button:hover {
  background: rgba(255,255,255,0.3);
  color: white;
}

.try-on-content {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
}

.camera-request,
.camera-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.camera-icon,
.error-icon {
  color: #666;
  margin-bottom: 20px;
}

.error-icon {
  color: #ff4444;
}

.camera-request h3,
.camera-error h3 {
  color: white;
  margin: 0 0 12px 0;
  font-size: 20px;
}

.camera-request p,
.camera-error p {
  color: #888;
  margin: 0 0 24px 0;
  max-width: 300px;
}

.enable-camera-btn,
.retry-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.enable-camera-btn:hover,
.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.try-on-view {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Mirror for selfie view */
}

.model-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scaleX(-1); /* Mirror to match video */
}

.face-guide {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.face-outline {
  width: 200px;
  height: 280px;
  border: 3px dashed rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.02); }
}

.face-guide p {
  color: white;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
}

.loading-model {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.7);
  padding: 24px 32px;
  border-radius: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-model p {
  color: white;
  margin: 0;
  font-size: 14px;
}

.capture-success {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #22c55e;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  animation: fadeInOut 2s ease-in-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  20% { opacity: 1; transform: translateX(-50%) translateY(0); }
  80% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}

.try-on-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-top: 1px solid #333;
  background: #222;
}

.color-options {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-label {
  color: #888;
  font-size: 14px;
}

.color-swatches {
  display: flex;
  gap: 8px;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.color-swatch.active {
  border-color: white;
  box-shadow: 0 0 0 2px #667eea;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.capture-btn,
.download-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #333;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.capture-btn:hover {
  background: #667eea;
}

.download-btn:hover {
  background: #22c55e;
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .try-on-overlay {
    padding: 0;
  }

  .try-on-container {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .try-on-controls {
    flex-direction: column;
    gap: 12px;
  }

  .action-buttons {
    width: 100%;
    justify-content: center;
  }

  .capture-btn,
  .download-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
