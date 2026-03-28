<script setup lang="ts">
import { onMounted } from 'vue'
import ThreeSceneMinimal from './components/ThreeSceneMinimal.vue'
import AdminCalibrateTryOn from './components/AdminCalibrateTryOn.vue'
import shopifyService from './services/shopifyService'

const urlParams = new URLSearchParams(window.location.search)
const isEmbedded = urlParams.get('embedded') === 'true'
const isAdminCalibrate = urlParams.get('admin-calibrate') === 'true' || window.location.pathname === '/admin-calibrate'

onMounted(() => {
  if (isAdminCalibrate) {
    console.log('🎯 Admin Calibration Mode - Full calibration tool')
  } else {
    console.log('🚀 Vue App initialized - FULLSCREEN VERSION')
    console.log('🔗 Shopify integration:', shopifyService.isEmbeddedInShopify() ? 'Enabled' : 'Standalone')
    console.log('📱 Embedded mode:', isEmbedded)

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
  <AdminCalibrateTryOn v-if="isAdminCalibrate" />
  <ThreeSceneMinimal v-else />
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
