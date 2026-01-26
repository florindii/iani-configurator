<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import VirtualTryOn from './VirtualTryOn.vue'

const props = defineProps<{
  modelUrl: string
  offsetY: number
  scale: number
  tryOnType: string
}>()

// Local state for the preview
const showTryOn = ref(false)
const currentModelUrl = ref(props.modelUrl)
const currentOffsetY = ref(props.offsetY)
const currentScale = ref(props.scale)

// Default color options for preview (single neutral option)
const colorOptions = ref([
  { value: 'default', name: 'Default', hex: '#333333' }
])

// Watch for prop changes (from postMessage)
watch(() => props.offsetY, (newVal) => {
  currentOffsetY.value = newVal
  console.log('📐 Offset updated:', newVal)
})

watch(() => props.scale, (newVal) => {
  currentScale.value = newVal
  console.log('📏 Scale updated:', newVal)
})

watch(() => props.modelUrl, (newVal) => {
  if (newVal) {
    currentModelUrl.value = newVal
    console.log('🎨 Model URL updated:', newVal)
  }
})

onMounted(() => {
  // Auto-start the try-on preview
  showTryOn.value = true
  console.log('🎛️ Admin Try-On Preview mounted')
  console.log('📍 Model URL:', currentModelUrl.value)
  console.log('📐 Offset Y:', currentOffsetY.value)
  console.log('📏 Scale:', currentScale.value)
})

// Handle close (shouldn't happen in admin, but just in case)
const handleClose = () => {
  // In admin preview, we don't actually close - just notify parent
  window.parent.postMessage({ type: 'ADMIN_PREVIEW_CLOSE_REQUESTED' }, '*')
}

// Handle color change (not used in admin preview, but required by component)
const handleColorChange = (color: string) => {
  console.log('Color change in admin preview (ignored):', color)
}
</script>

<template>
  <div class="admin-preview-container">
    <!-- Loading state while waiting for model URL -->
    <div v-if="!currentModelUrl" class="loading-state">
      <div class="loading-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </div>
      <p>Waiting for 3D model...</p>
      <p class="hint">Upload a 3D model to this product to enable preview</p>
    </div>

    <!-- Virtual Try-On Preview -->
    <VirtualTryOn
      v-else-if="showTryOn"
      :model-url="currentModelUrl"
      :product-type="tryOnType"
      :color-options="colorOptions"
      selected-color="default"
      :offset-y="currentOffsetY"
      :scale="currentScale"
      @close="handleClose"
      @colorChange="handleColorChange"
    />
  </div>
</template>

<style scoped>
.admin-preview-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  color: #888;
  text-align: center;
  padding: 20px;
}

.loading-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.loading-state p {
  margin: 4px 0;
  font-size: 14px;
}

.loading-state .hint {
  font-size: 12px;
  color: #666;
}

/* Override VirtualTryOn styles for admin embed */
:deep(.try-on-overlay) {
  position: relative !important;
  border-radius: 8px;
}

:deep(.close-btn) {
  display: none !important;
}

:deep(.try-on-controls) {
  display: none !important;
}

:deep(.action-buttons) {
  display: none !important;
}
</style>
