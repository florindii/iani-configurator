// Shopify integration service for Vue.js app
interface ConfigurationData {
  material?: string;
  color?: string;
  size?: string;
  [key: string]: any;
}

interface SaveConfigurationResponse {
  success: boolean;
  configuration?: any;
  message?: string;
}

class ShopifyService {
  private baseUrl: string;
  public shop: string | null;
  public productId: string | null;
  public customerId: string | null;
  public customerEmail: string | null;
  
  constructor() {
    // Use Vercel API functions for production
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://iani-configurator.vercel.app';
    this.shop = null;
    this.productId = null;
    this.customerId = null;
    this.customerEmail = null;
    
    // Get URL parameters when embedded in Shopify
    this.initFromUrlParams();
  }

  initFromUrlParams(): void {
    const urlParams = new URLSearchParams(window.location.search);
    this.shop = urlParams.get('shop');
    this.productId = urlParams.get('productId');
    this.customerId = urlParams.get('customerId');
    this.customerEmail = urlParams.get('customerEmail');
    
    console.log('🛍️ Shopify params:', {
      shop: this.shop,
      productId: this.productId,
      customerId: this.customerId,
      customerEmail: this.customerEmail
    });
  }

  async saveConfiguration(configurationData: ConfigurationData, previewImage: string | null = null, totalPrice: number = 0): Promise<SaveConfigurationResponse> {
    try {
      console.log('💾 Saving configuration...', { 
        productId: this.productId, 
        shop: this.shop 
      });

      const response = await fetch(`${this.baseUrl}/api/products/${this.productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop: this.shop,
          customerId: this.customerId,
          customerEmail: this.customerEmail,
          configurationData,
          previewImage,
          totalPrice
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Configuration saved:', result);
      return result;
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
      throw error;
    }
  }

  async loadConfiguration(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products/${this.productId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.configurations || [];
    } catch (error) {
      console.error('❌ Error loading configuration:', error);
      return [];
    }
  }

  async generatePreview(configurationData: ConfigurationData, modelUrl: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configurationData,
          modelUrl
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.previewUrl;
    } catch (error) {
      console.error('❌ Error generating preview:', error);
      throw error;
    }
  }

  async addToCart(configurationData: ConfigurationData, totalPrice: number): Promise<any> {
    try {
      console.log('🛒 Adding to cart...', { configurationData, totalPrice });
      
      const cartPayload = {
        shop: this.shop,
        productId: this.productId,
        configurationData,
        totalPrice,
        customerId: this.customerId,
        customerEmail: this.customerEmail
      };

      // Send to our Vercel API
      const response = await fetch(`${this.baseUrl}/api/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cartPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Added to cart successfully:', result);
      
      // Send success message to parent window (Shopify admin) if embedded
      if (this.isEmbeddedInShopify()) {
        window.parent.postMessage({
          type: 'CART_SUCCESS',
          data: {
            configurationId: result.configuration?.id,
            productId: this.productId,
            totalPrice,
            message: 'Custom configuration added to cart successfully!'
          }
        }, '*');
      }

      return result;
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      
      // Send error message to parent window if embedded
      if (this.isEmbeddedInShopify()) {
        window.parent.postMessage({
          type: 'CART_ERROR',
          data: {
            error: error instanceof Error ? error.message : 'Failed to add to cart'
          }
        }, '*');
      }
      
      throw error;
    }
  }
  //       }, '*');
  //     }
      
  //     throw error;
  //   }
  // }

  // Get configuration from URL parameters (for sharing links)
  getConfigFromUrl(): ConfigurationData | null {
    const urlParams = new URLSearchParams(window.location.search);
    const configData = urlParams.get('config');
    
    if (configData) {
      try {
        return JSON.parse(decodeURIComponent(configData));
      } catch (error) {
        console.error('❌ Error parsing config from URL:', error);
        return null;
      }
    }
    
    return null;
  }

  // Generate shareable URL with configuration
  generateShareableUrl(configurationData: ConfigurationData): string {
    const baseUrl = window.location.origin + window.location.pathname;
    const configString = encodeURIComponent(JSON.stringify(configurationData));
    
    const params = new URLSearchParams(window.location.search);
    params.set('config', configString);
    
    return `${baseUrl}?${params.toString()}`;
  }

  // Check if we're running inside Shopify admin
  isEmbeddedInShopify(): boolean {
    return !!(window.parent && window.parent !== window && this.shop);
  }

  // Send messages to parent Shopify window
  sendToShopify(type: string, data: any): void {
    if (this.isEmbeddedInShopify()) {
      window.parent.postMessage({
        type,
        data: {
          ...data,
          shop: this.shop,
          productId: this.productId
        }
      }, '*');
      console.log('📤 Sent to Shopify:', type, data);
    }
  }

  // Listen for messages from Shopify
  setupShopifyMessageListener(): void {
    window.addEventListener('message', (event) => {
      // Only accept messages from Shopify domains
      if (event.origin.includes('shopify.com') || event.origin.includes('trycloudflare.com')) {
        console.log('📥 Received from Shopify:', event.data);
        
        switch (event.data.type) {
          case 'SHOPIFY_READY':
            console.log('✅ Shopify is ready');
            break;
          case 'UPDATE_PRODUCT':
            // Handle product updates from Shopify
            break;
          default:
            console.log('Unknown message type:', event.data.type);
        }
      }
    });
  }
}

export default new ShopifyService();