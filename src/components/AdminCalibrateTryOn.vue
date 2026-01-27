<template>
  <div class="admin-calibrate">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <h1>🎯 Position Glasses on Your Face</h1>
        <p class="subtitle">Adjust settings while seeing live preview</p>
      </div>
      <div class="header-actions">
        <button class="btn-cancel" @click="cancelAndClose">Cancel</button>
        <button class="btn-save" @click="saveAndClose" :disabled="saving">
          {{ saving ? 'Saving...' : '✓ Save Settings' }}
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content-grid">
      <!-- Left: Live Camera Preview -->
      <div class="preview-section">
        <div class="preview-container">
          <VirtualTryOn
            ref="tryOnComponent"
            :model-url="modelUrl"
            :product-type="tryOnType"
            :color-options="colorOptions"
            selected-color="default"
            :offset-y="offsetY"
            :scale="scale"
            :hide-controls="true"
            @close="() => {}"
            @colorChange="() => {}"
          />
        </div>
        <div class="preview-info">
          <p class="status-text">✓ Camera preview active</p>
          <p class="help-text">
            Adjust the sliders on the right to position the glasses correctly
          </p>
        </div>
      </div>

      <!-- Right: Control Panel -->
      <div class="controls-section">
        <div class="control-group">
          <label class="control-label">
            <span class="label-text">📐 Vertical Position</span>
            <span class="label-value">{{ offsetY }}%</span>
          </label>
          <input
            type="range"
            v-model.number="offsetY"
            min="-50"
            max="50"
            step="1"
            class="slider"
          />
          <p class="control-hint">
            Negative = up, Positive = down
          </p>
        </div>

        <div class="control-group">
          <label class="control-label">
            <span class="label-text">🔍 Scale</span>
            <span class="label-value">{{ scale.toFixed(2) }}x</span>
          </label>
          <input
            type="range"
            v-model.number="scale"
            min="0.5"
            max="2.0"
            step="0.05"
            class="slider"
          />
          <p class="control-hint">
            Adjust size to fit face width
          </p>
        </div>

        <div class="preset-buttons">
          <button @click="resetToDefaults" class="btn-preset">
            ↺ Reset to Defaults
          </button>
          <button @click="applyNarrowFacePreset" class="btn-preset">
            Narrow Face Preset
          </button>
          <button @click="applyWideFacePreset" class="btn-preset">
            Wide Face Preset
          </button>
        </div>

        <div class="tips-section">
          <h3>💡 Tips for Best Results</h3>
          <ul>
            <li>Ensure good lighting on your face</li>
            <li>Look directly at the camera</li>
            <li>Position glasses so they sit naturally on nose bridge</li>
            <li>Scale should match natural eyewear width</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="error" class="error-banner">
      ⚠️ {{ error }}
    </div>

    <!-- Success Banner -->
    <div v-if="successMessage" class="success-banner">
      ✓ {{ successMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import VirtualTryOn from './VirtualTryOn.vue'

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search)
const productId = urlParams.get('productId') || ''
const modelUrl = urlParams.get('modelUrl') || ''
const tryOnType = urlParams.get('tryOnType') || 'glasses'
const currentOffsetY = parseFloat(urlParams.get('currentOffsetY') || urlParams.get('offsetY') || '0')
const currentScale = parseFloat(urlParams.get('currentScale') || urlParams.get('scale') || '1')

// State
const offsetY = ref(currentOffsetY)
const scale = ref(currentScale)
const saving = ref(false)
const error = ref('')
const successMessage = ref('')
const tryOnComponent = ref<InstanceType<typeof VirtualTryOn> | null>(null)

// Default color options for preview
const colorOptions = ref([
  { value: 'default', name: 'Default', hex: '#333333' }
])

// Preset functions
function resetToDefaults() {
  offsetY.value = 0
  scale.value = 1
}

function applyNarrowFacePreset() {
  offsetY.value = -2
  scale.value = 0.85
}

function applyWideFacePreset() {
  offsetY.value = 2
  scale.value = 1.15
}

// Save settings and close
async function saveAndClose() {
  saving.value = true
  error.value = ''
  successMessage.value = ''

  try {
    // Notify parent window (Shopify admin) with the new settings
    if (window.opener) {
      window.opener.postMessage({
        type: 'CALIBRATION_SAVED',
        productId,
        offsetY: offsetY.value,
        scale: scale.value
      }, '*')
    }

    successMessage.value = 'Settings saved! Closing window...'

    // Close window after short delay
    setTimeout(() => {
      window.close()
    }, 1000)

  } catch (err) {
    error.value = 'Failed to save settings. Please try again.'
    console.error('Save error:', err)
  } finally {
    saving.value = false
  }
}

function cancelAndClose() {
  if (offsetY.value !== currentOffsetY || scale.value !== currentScale) {
    if (!confirm('Discard changes and close?')) {
      return
    }
  }
  window.close()
}

onMounted(() => {
  console.log('🎯 Admin Calibration Tool loaded')
  console.log('📦 Product ID:', productId)
  console.log('🔗 Model URL:', modelUrl)
  console.log('📐 Initial offset:', currentOffsetY, 'scale:', currentScale)

  // Validate required params
  if (!modelUrl) {
    error.value = 'Missing model URL. Please reopen from admin panel.'
  }
})
</script>

<style scoped>
.admin-calibrate {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  background: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-content h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #1a1a1a;
}

.subtitle {
  margin: 0.25rem 0 0 0;
  color: #666;
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn-cancel,
.btn-save {
  padding: 0.625rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-save {
  background: #667eea;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Main Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  padding: 1.5rem;
  flex: 1;
}

/* Preview Section */
.preview-section {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.preview-container {
  flex: 1;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  min-height: 400px;
}

/* Override VirtualTryOn styles for fullscreen preview */
.preview-container :deep(.try-on-overlay) {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
}

.preview-container :deep(.try-on-container) {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 0 !important;
}

.preview-container :deep(.try-on-header) {
  display: none !important;
}

.preview-container :deep(.close-button) {
  display: none !important;
}

.preview-container :deep(.try-on-controls) {
  display: none !important;
}

.preview-container :deep(.action-buttons) {
  display: none !important;
}

.preview-info {
  margin-top: 1rem;
  text-align: center;
}

.preview-info .status-text {
  margin: 0;
  color: #059669;
  font-weight: 600;
}

.help-text {
  color: #6b7280 !important;
  font-weight: 400 !important;
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
}

/* Controls Section */
.controls-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #1a1a1a;
}

.label-value {
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #667eea;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  transition: all 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  background: #5568d3;
  transform: scale(1.1);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
}

.control-hint {
  margin: 0;
  font-size: 0.75rem;
  color: #9ca3af;
  font-style: italic;
}

/* Preset Buttons */
.preset-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-preset {
  padding: 0.5rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.btn-preset:hover {
  background: #f3f4f6;
  border-color: #667eea;
}

/* Tips Section */
.tips-section {
  margin-top: 0.5rem;
  padding: 1rem;
  background: #fffbeb;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

.tips-section h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #92400e;
}

.tips-section ul {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.75rem;
  color: #78350f;
}

.tips-section li {
  margin: 0.25rem 0;
}

/* Error Banner */
.error-banner {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #fee2e2;
  color: #991b1b;
  padding: 1rem 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  z-index: 1000;
}

/* Success Banner */
.success-banner {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #d1fae5;
  color: #065f46;
  padding: 1rem 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  z-index: 1000;
}

/* Responsive */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .controls-section {
    max-height: none;
  }

  .preview-container {
    min-height: 350px;
  }
}

@media (max-width: 600px) {
  .header {
    padding: 1rem;
  }

  .header-content h1 {
    font-size: 1.2rem;
  }

  .content-grid {
    padding: 1rem;
    gap: 1rem;
  }

  .preview-container {
    min-height: 300px;
  }
}
</style>
