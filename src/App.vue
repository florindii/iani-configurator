<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ThreeSceneMinimal from './components/ThreeSceneMinimal.vue'
import AdminTryOnPreview from './components/AdminTryOnPreview.vue'
import shopifyService from './services/shopifyService'

// Check URL parameters
const urlParams = new URLSearchParams(window.location.search)
const isEmbedded = urlParams.get('embedded') === 'true'
const isAdminPreview = urlParams.get('admin-preview') === 'true'

// Admin preview params
const modelUrl = ref(urlParams.get('modelUrl') || '')
const offsetY = ref(parseFloat(urlParams.get('offsetY') || '0'))
const scale = ref(parseFloat(urlParams.get('scale') || '1'))
const tryOnType = ref(urlParams.get('tryOnType') || 'glasses')

onMounted(() => {
  if (isAdminPreview) {
    console.log('🎛️ Admin Preview Mode - Try-On Settings')
    console.log('📐 Initial offset:', offsetY.value, 'scale:', scale.value)

    // Listen for postMessage updates from admin panel
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'UPDATE_TRYON_SETTINGS') {
        console.log('📨 Received settings update:', event.data)
        if (event.data.offsetY !== undefined) offsetY.value = event.data.offsetY
        if (event.data.scale !== undefined) scale.value = event.data.scale
        if (event.data.modelUrl !== undefined) modelUrl.value = event.data.modelUrl
      }
    })

    // Notify parent that preview is ready
    window.parent.postMessage({ type: 'ADMIN_PREVIEW_READY' }, '*')
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
  <!-- Admin Preview Mode: Show only Virtual Try-On -->
  <AdminTryOnPreview
    v-if="isAdminPreview"
    :model-url="modelUrl"
    :offset-y="offsetY"
    :scale="scale"
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
