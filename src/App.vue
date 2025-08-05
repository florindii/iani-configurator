<script setup lang="ts">
import { onMounted } from 'vue'
import ThreeSceneMinimal from './components/ThreeSceneMinimal.vue'
import  shopifyService from './services/shopifyService'

onMounted(() => {
  console.log('🚀 Vue App initialized - MINIMAL VERSION')
  console.log('🔗 Shopify integration:', shopifyService.isEmbeddedInShopify() ? 'Enabled' : 'Standalone')
  
  // Send ready message to parent window (Shopify)
  if (shopifyService.isEmbeddedInShopify()) {
    shopifyService.sendToShopify('VUE_APP_READY', {
      timestamp: new Date().toISOString()
    })
  }
})
</script>

<template>
  <ThreeSceneMinimal />
</template>

<style scoped>

</style>
