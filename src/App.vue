<script setup lang="ts">
import { onMounted } from 'vue'
import ThreeSceneMinimal from './components/ThreeSceneMinimal.vue'
import shopifyService from './services/shopifyService'

// Check URL parameters
const urlParams = new URLSearchParams(window.location.search)
const isEmbedded = urlParams.get('embedded') === 'true'

onMounted(() => {
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
})
</script>

<template>
  <ThreeSceneMinimal />
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
