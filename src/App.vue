<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ThreeSceneMinimal from './components/ThreeSceneMinimal.vue'
import AdminTryOnTest from './components/AdminTryOnTest.vue'
import AdminCalibrateTryOn from './components/AdminCalibrateTryOn.vue'
import shopifyService from './services/shopifyService'

// Check URL parameters
const urlParams = new URLSearchParams(window.location.search)
const isEmbedded = urlParams.get('embedded') === 'true'
const isAdminTest = urlParams.get('admin-test') === 'true'
const isAdminCalibrate = urlParams.get('admin-calibrate') === 'true' || window.location.pathname === '/admin-calibrate'

// Admin test params (legacy)
const modelUrl = ref(urlParams.get('modelUrl') || '')
const initialOffsetY = ref(parseFloat(urlParams.get('offsetY') || urlParams.get('currentOffsetY') || '0'))
const initialScale = ref(parseFloat(urlParams.get('scale') || urlParams.get('currentScale') || '1'))
const tryOnType = ref(urlParams.get('tryOnType') || 'glasses')

onMounted(() => {
  if (isAdminCalibrate) {
    console.log('🎯 Admin Calibration Mode - Full calibration tool')
    console.log('📐 Initial offset:', initialOffsetY.value, 'scale:', initialScale.value)
  } else if (isAdminTest) {
    console.log('🎛️ Admin Test Mode - Try-On with Sliders')
    console.log('📐 Initial offset:', initialOffsetY.value, 'scale:', initialScale.value)
  } else {
    console.log('🚀 Vue App initialized - FULLSCREEN VERSION')
    console.log('🔗 Shopify integration:', shopifyService.isEmbeddedInShopify() ? 'Enabled' : 'Standalone')
    console.log('📱 Embedded mode:', isEmbedded)

    // Send ready message to parent window (Shopify)
    if (shopifyService.isEmbeddedInShopify()) {
      shopifyService.sendToShopify('VUE_APP_READY', {
        timestamp: new Date().toISOString(),
        mode: 'fullscreen',
        embedded: isEmbedded
      })
    }
  }
})
</script>

<template>
  <!-- Admin Calibration Mode: Full calibration tool with sliders -->
  <AdminCalibrateTryOn v-if="isAdminCalibrate" />

  <!-- Admin Test Mode: Simple try-on preview (legacy) -->
  <AdminTryOnTest
    v-else-if="isAdminTest"
    :model-url="modelUrl"
    :initial-offset-y="initialOffsetY"
    :initial-scale="initialScale"
    :try-on-type="tryOnType"
  />

  <!-- Normal Mode: Full Configurator -->
  <ThreeSceneMinimal v-else />
</template>

<style scoped>
/* Global styles for modal mode */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
