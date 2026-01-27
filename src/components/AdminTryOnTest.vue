<script setup lang="ts">
import { ref } from 'vue'
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

// Copy settings to clipboard
const copySettings = () => {
  const settings = `Offset: ${offsetY.value}%, Scale: ${scale.value.toFixed(2)}x`
  navigator.clipboard.writeText(settings)
  alert('Settings copied! Paste these values in the admin panel.')
}
</script>

<template>
  <div class="admin-test-container">
    <!-- Control Panel -->
    <div class="control-panel">
      <h2>Try-On Settings Tester</h2>

      <div class="control-group">
        <label>
          Vertical Offset: <strong>{{ offsetY }}%</strong>
        </label>
        <input
          type="range"
          v-model.number="offsetY"
          min="-50"
          max="50"
          step="1"
        />
        <span class="hint">Negative = up, Positive = down</span>
      </div>

      <div class="control-group">
        <label>
          Scale: <strong>{{ scale.toFixed(2) }}x</strong>
        </label>
        <input
          type="range"
          v-model.number="scale"
          min="0.5"
          max="2"
          step="0.05"
        />
        <span class="hint">Adjust the size of the glasses</span>
      </div>

      <div class="current-values">
        <span>Offset: <strong>{{ offsetY }}%</strong></span>
        <span>Scale: <strong>{{ scale.toFixed(2) }}x</strong></span>
      </div>

      <button class="copy-btn" @click="copySettings">
        Copy Settings
      </button>

      <p class="instructions">
        Adjust the sliders until the glasses fit perfectly, then copy the settings and paste them in the Shopify admin panel.
      </p>
    </div>

    <!-- Try-On Preview -->
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
  width: 100vw;
  height: 100vh;
  background: #1a1a2e;
  overflow: hidden;
}

.control-panel {
  width: 300px;
  padding: 20px;
  background: #252542;
  color: white;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.control-panel h2 {
  margin: 0;
  font-size: 18px;
  color: #fff;
  padding-bottom: 15px;
  border-bottom: 1px solid #3a3a5c;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  font-size: 14px;
  color: #ccc;
}

.control-group label strong {
  color: #fff;
}

.control-group input[type="range"] {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #3a3a5c;
  outline: none;
  cursor: pointer;
}

.control-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.control-group .hint {
  font-size: 11px;
  color: #888;
}

.current-values {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #1a1a2e;
  border-radius: 8px;
  font-size: 14px;
}

.current-values span {
  color: #ccc;
}

.current-values strong {
  color: #667eea;
}

.copy-btn {
  padding: 12px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.copy-btn:hover {
  background: #5a6fd6;
}

.instructions {
  font-size: 12px;
  color: #888;
  line-height: 1.5;
  margin-top: auto;
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

/* Mobile responsive */
@media (max-width: 768px) {
  .admin-test-container {
    flex-direction: column;
  }

  .control-panel {
    width: 100%;
    max-height: 250px;
  }

  .tryon-area {
    flex: 1;
  }
}
</style>
