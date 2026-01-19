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

          <!-- Capture Success Message -->
          <div v-if="showCaptureSuccess" class="capture-success">
            Photo saved!
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
          <!-- Capture for Cart -->
          <button class="capture-btn" @click="captureAndSave" title="Use as cart preview">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>Save Preview</span>
          </button>

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
const showCaptureSuccess = ref(false)
const selectedColorLocal = ref(props.selectedColor)

// Three.js instances
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let model: THREE.Object3D | null = null
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

/**
 * Initialize Three.js scene
 */
async function initThreeJS() {
  if (!tryOnCanvas.value || !videoElement.value) return

  const canvas = tryOnCanvas.value
  const video = videoElement.value

  // Match canvas size to video
  canvasWidth = video.videoWidth || 640
  canvasHeight = video.videoHeight || 480
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  console.log('📐 Canvas size:', canvasWidth, 'x', canvasHeight)

  // Create renderer with transparent background
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  })
  renderer.setSize(canvasWidth, canvasHeight)
  renderer.setClearColor(0x000000, 0) // Fully transparent

  // Create scene
  scene = new THREE.Scene()

  // Create perspective camera for better 3D effect
  const fov = 50
  const aspect = canvasWidth / canvasHeight
  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000)
  camera.position.z = 2

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
  directionalLight.position.set(0, 1, 2)
  scene.add(directionalLight)

  const backLight = new THREE.DirectionalLight(0xffffff, 0.3)
  backLight.position.set(0, 0, -1)
  scene.add(backLight)

  // Create debug eye markers (small white spheres)
  if (DEBUG_SHOW_EYE_MARKERS) {
    const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16)
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })

    leftEyeMarker = new THREE.Mesh(markerGeometry, markerMaterial)
    rightEyeMarker = new THREE.Mesh(markerGeometry, markerMaterial)

    leftEyeMarker.visible = false
    rightEyeMarker.visible = false

    scene.add(leftEyeMarker)
    scene.add(rightEyeMarker)

    console.log('👁️ Debug eye markers created')
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

    // Calculate scale to fit glasses to reasonable size (about 0.3 units wide for perspective camera)
    const maxDim = Math.max(size.x, size.y, size.z)
    const targetSize = 0.4 // Target size in world units
    const autoScale = targetSize / maxDim

    console.log('🔧 Auto-scale factor:', autoScale)

    // Save base scale for face tracking adjustments
    baseModelScale = autoScale

    // Apply scale and center the model
    model.scale.setScalar(autoScale)

    // Center the model at origin
    model.position.x = -center.x * autoScale
    model.position.y = -center.y * autoScale
    model.position.z = -center.z * autoScale

    // NOTE: Do NOT add initial rotation here - the model should face the camera naturally
    // The updateModelPosition function handles all rotation based on face tracking

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
 * This is the KEY function for accurate positioning
 */
function faceToThreeJS(faceX: number, faceY: number): { x: number, y: number } {
  // Face coordinates: (0,0) = top-left, (1,1) = bottom-right
  // Three.js with perspective camera: need to map to visible frustum

  // The canvas is mirrored with CSS scaleX(-1), so we DON'T flip X in code
  // Map face coords to -1 to 1 range
  const normalizedX = (faceX - 0.5) * 2  // -1 (left) to 1 (right)
  const normalizedY = -(faceY - 0.5) * 2 // -1 (bottom) to 1 (top) - flip Y

  // Calculate visible area at z=0 with our camera setup
  const fov = 50
  const cameraZ = 2
  const frustumHalfHeight = Math.tan((fov * Math.PI / 180) / 2) * cameraZ
  const frustumHalfWidth = frustumHalfHeight * (canvasWidth / canvasHeight)

  return {
    x: normalizedX * frustumHalfWidth,
    y: normalizedY * frustumHalfHeight
  }
}

/**
 * Update 3D model position based on face landmarks
 * STEP 1: Position eye markers exactly on the eyes
 * STEP 2: Position glasses centered between the eye markers
 */
function updateModelPosition(landmarks: FaceLandmarks) {
  if (!camera) return

  // Get individual eye positions
  const leftEyePos = faceToThreeJS(landmarks.leftEye.x, landmarks.leftEye.y)
  const rightEyePos = faceToThreeJS(landmarks.rightEye.x, landmarks.rightEye.y)

  // Update debug eye markers to visualize exact eye positions
  if (DEBUG_SHOW_EYE_MARKERS && leftEyeMarker && rightEyeMarker) {
    leftEyeMarker.visible = true
    rightEyeMarker.visible = true

    leftEyeMarker.position.set(leftEyePos.x, leftEyePos.y, 0.1)
    rightEyeMarker.position.set(rightEyePos.x, rightEyePos.y, 0.1)
  }

  // Position glasses if model is loaded
  if (model && props.productType === 'glasses') {
    model.visible = true

    // Calculate center point between the two eyes
    const centerX = (leftEyePos.x + rightEyePos.x) / 2
    const centerY = (leftEyePos.y + rightEyePos.y) / 2

    // Position glasses at the center of the eyes
    model.position.x = centerX
    model.position.y = centerY
    model.position.z = 0

    // Calculate the actual eye distance in Three.js units (for scaling)
    const eyeDistanceWorld = Math.sqrt(
      Math.pow(rightEyePos.x - leftEyePos.x, 2) +
      Math.pow(rightEyePos.y - leftEyePos.y, 2)
    )

    // Scale glasses to match eye distance
    // The glasses should span roughly the eye distance (adjust multiplier as needed)
    const targetGlassesWidth = eyeDistanceWorld * 2.5 // Glasses are wider than eye distance
    const finalScale = (targetGlassesWidth / baseModelScale) * 0.5

    model.scale.setScalar(Math.max(finalScale, 0.1)) // Minimum scale to prevent disappearing

    // Apply face rotation
    model.rotation.x = -landmarks.rotation.pitch * 0.5
    model.rotation.y = -landmarks.rotation.yaw * 0.7
    model.rotation.z = -landmarks.rotation.roll * 0.8

    // Debug logging
    if (Math.random() < 0.02) {
      console.log('👁️ Left eye:', leftEyePos)
      console.log('👁️ Right eye:', rightEyePos)
      console.log('👓 Glasses center:', { x: centerX.toFixed(3), y: centerY.toFixed(3) })
      console.log('👓 Eye distance (world):', eyeDistanceWorld.toFixed(3))
      console.log('👓 Scale:', finalScale.toFixed(4))
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
 */
function combineVideoAndModel(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const video = videoElement.value!
  const overlay = tryOnCanvas.value!

  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 480

  const ctx = canvas.getContext('2d')!

  // Draw mirrored video (selfie style)
  ctx.save()
  ctx.scale(-1, 1)
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
  ctx.restore()

  // Draw 3D overlay (also mirrored)
  ctx.save()
  ctx.scale(-1, 1)
  ctx.drawImage(overlay, -canvas.width, 0, canvas.width, canvas.height)
  ctx.restore()

  return canvas
}

/**
 * Capture and save as cart preview
 */
function captureAndSave() {
  const canvas = combineVideoAndModel()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9)

  emit('capturePreview', dataUrl)

  // Show success message
  showCaptureSuccess.value = true
  setTimeout(() => {
    showCaptureSuccess.value = false
  }, 2000)
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

// Lifecycle
onMounted(() => {
  // Auto-request camera on mount
  // requestCameraAccess() // Uncomment to auto-start
})

onUnmounted(() => {
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
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.try-on-container {
  background: #1a1a1a;
  border-radius: 16px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.try-on-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.try-on-header h2 {
  color: white;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-button:hover {
  background: #333;
  color: white;
}

.try-on-content {
  flex: 1;
  position: relative;
  min-height: 400px;
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
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
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
