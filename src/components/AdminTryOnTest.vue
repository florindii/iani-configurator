<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import VirtualTryOn from './VirtualTryOn.vue'

const props = defineProps<{
  modelUrl: string
  initialOffsetY: number
  initialScale: number
  tryOnType: string
}>()

// Local state for adjustable values
const offsetY = ref(props.initialOffsetY)
const scale = ref(props.initialScale)

// Default color options for preview
const colorOptions = ref([
  { value: 'default', name: 'Default', hex: '#333333' }
])

// Handle close
const handleClose = () => {
  window.close()
}

// Listen for settings updates from parent window (Shopify admin modal)
const handleMessage = (event: MessageEvent) => {
  if (event.data?.type === 'UPDATE_TRYON_SETTINGS') {
    console.log('Received settings update:', event.data)
    if (event.data.offsetY !== undefined) {
      offsetY.value = event.data.offsetY
    }
    if (event.data.scale !== undefined) {
      scale.value = event.data.scale
    }
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
  console.log('AdminTryOnTest: Listening for postMessage updates')
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <div class="admin-test-container">
    <!-- Header with current values -->
    <div class="header-bar">
      <span class="title">Virtual Try-On Preview</span>
      <span class="values">Offset: {{ offsetY }}% | Scale: {{ scale.toFixed(2) }}x</span>
    </div>

    <!-- Try-On Preview (full screen) -->
    <div class="tryon-area">
      <VirtualTryOn
        :model-url="modelUrl"
        :product-type="tryOnType"
        :color-options="colorOptions"
        selected-color="default"
        :offset-y="offsetY"
        :scale="scale"
        @close="handleClose"
        @colorChange="() => {}"
      />
    </div>
  </div>
</template>

<style scoped>
.admin-test-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: #1a1a2e;
  overflow: hidden;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #252542;
  color: white;
  border-bottom: 1px solid #3a3a5c;
}

.header-bar .title {
  font-size: 16px;
  font-weight: 600;
}

.header-bar .values {
  font-size: 14px;
  color: #667eea;
  font-weight: 500;
}

.tryon-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Override VirtualTryOn styles */
:deep(.try-on-overlay) {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
}

:deep(.try-on-container) {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 0 !important;
}

:deep(.try-on-header) {
  display: none !important;
}

:deep(.close-button) {
  display: none !important;
}

:deep(.try-on-controls) {
  display: none !important;
}

:deep(.action-buttons) {
  display: none !important;
}
</style>
