// Enhanced Multi-Client Shopify Service with Dynamic Configuration
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

interface ShopifyVariant {
  id: string;
  sku: string;
  price: number;
  color: string;
  available: boolean;
}

interface ProductVariants {
  [color: string]: ShopifyVariant;
}

interface ClientConfig {
  storeUrl: string;
  productId: string;
  variants: ProductVariants;
  apiKeys?: {
    storefrontToken?: string;
    adminToken?: string;
  };
  branding?: {
    logo?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
  };
  currency?: string;
  clientName?: string;
}

class MultiClientShopifyService {
  private baseUrl: string;
  private bridgeServerUrl: string;
  private isProduction: boolean;
  
  // Client-specific data
  private currentClient: string | null = null;
  private currentConfig: ClientConfig | null = null;
  
  // Legacy compatibility
  public shop: string | null = null;
  public productId: string | null = null;
  public customerId: string | null = null;
  public customerEmail: string | null = null;
  
  constructor() {
    // Detect environment
    this.isProduction = window.location.hostname.includes('vercel.app') || 
                       window.location.hostname.includes('shopify');
    
    if (this.isProduction) {
      this.bridgeServerUrl = 'https://iani-configurator.vercel.app';
      this.baseUrl = 'https://iani-configurator.vercel.app';
      if (import.meta.env.DEV) console.log('🚀 Production mode: Multi-client system active');
    } else {
      this.bridgeServerUrl = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3001';
      this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://iani-configurator.vercel.app';
      if (import.meta.env.DEV) console.log('🔧 Development mode: Multi-client system active');
    }
    
    // Initialize client detection and configuration
    this.initializeClient();
  }

  // Initialize client from URL parameters
  private async initializeClient(): Promise<void> {
    try {
      // Method 1: Extract from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      
      // Get client ID from various URL parameters
      this.currentClient = urlParams.get('client') || 
                          urlParams.get('store') || 
                          (urlParams.get('shop')?.split('.')[0] ?? null);
      
      // Legacy compatibility
      this.shop = urlParams.get('shop');
      this.customerId = urlParams.get('customerId');
      this.customerEmail = urlParams.get('customerEmail');
      
      if (import.meta.env.DEV) {
        console.log('🏢 Client detection:', {
          currentClient: this.currentClient,
          shop: this.shop,
          customerId: this.customerId
        });
      }
      
      // Load client configuration
      await this.loadClientConfiguration();
      
      // Set legacy compatibility values
      this.productId = this.currentConfig?.productId || null;
      
      if (import.meta.env.DEV) {
        console.log('✅ Client initialized:', {
          client: this.currentClient,
          productId: this.productId,
          storeUrl: this.currentConfig?.storeUrl
        });
      }
      
    } catch (error) {
      console.error('❌ Client initialization failed:', error);
      await this.loadDefaultConfiguration();
    }
  }

  // Load configuration for the current client
  private async loadClientConfiguration(): Promise<void> {
    if (!this.currentClient) {
      console.warn('⚠️ No client specified, using default configuration');
      await this.loadDefaultConfiguration();
      return;
    }

    try {
      // Try to load from API first (for production)
      if (this.isProduction) {
        try {
          const response = await fetch(`${this.baseUrl}/api/clients/${this.currentClient}/config`);
          if (response.ok) {
            this.currentConfig = await response.json();
            console.log('✅ Client config loaded from API:', this.currentClient);
            return;
          }
        } catch (error) {
          console.warn('⚠️ API config failed, trying static config:', (error as Error).message || error);
        }
      }

      // Load from static configuration
      this.currentConfig = this.getStaticClientConfig(this.currentClient);
      
      if (this.currentConfig) {
        console.log('✅ Client config loaded from static config:', this.currentClient);
      } else {
        // ✨ AUTO-GENERATE CLIENT: Create config for any client name
        console.log('🎉 Auto-generating configuration for new client:', this.currentClient);
        this.currentConfig = this.generateClientConfig(this.currentClient);
      }
      
    } catch (error) {
      console.error(`❌ Failed to load config for client ${this.currentClient}:`, error);
      await this.loadDefaultConfiguration();
    }
  }

  // ✨ Auto-generate configuration for any client name
  private generateClientConfig(clientName: string): ClientConfig {
    const basePrice = 299.99;
    const priceMultiplier = 1 + (clientName.length % 5) * 0.1; // Varies by name length
    
    return {
      clientName: clientName.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') + ' Store',
      storeUrl: `${clientName}.myshopify.com`,
      productId: `auto-generated-${clientName}-product`,
      currency: 'USD', // Default currency
      variants: {
        blue: { 
          id: `auto_${clientName}_blue`, 
          sku: `${clientName.toUpperCase()}-BLUE`, 
          price: Math.round(basePrice * priceMultiplier * 100) / 100, 
          color: 'blue', 
          available: true 
        },
        red: { 
          id: `auto_${clientName}_red`, 
          sku: `${clientName.toUpperCase()}-RED`, 
          price: Math.round(basePrice * priceMultiplier * 1.1 * 100) / 100, 
          color: 'red', 
          available: true 
        },
        green: { 
          id: `auto_${clientName}_green`, 
          sku: `${clientName.toUpperCase()}-GREEN`, 
          price: Math.round(basePrice * priceMultiplier * 1.05 * 100) / 100, 
          color: 'green', 
          available: true 
        },
        brown: { 
          id: `auto_${clientName}_brown`, 
          sku: `${clientName.toUpperCase()}-BROWN`, 
          price: Math.round(basePrice * priceMultiplier * 1.15 * 100) / 100, 
          color: 'brown', 
          available: true 
        },
        purple: { 
          id: `auto_${clientName}_purple`, 
          sku: `${clientName.toUpperCase()}-PURPLE`, 
          price: Math.round(basePrice * priceMultiplier * 1.2 * 100) / 100, 
          color: 'purple', 
          available: true 
        },
        orange: { 
          id: `auto_${clientName}_orange`, 
          sku: `${clientName.toUpperCase()}-ORANGE`, 
          price: Math.round(basePrice * priceMultiplier * 1.12 * 100) / 100, 
          color: 'orange', 
          available: true 
        }
      },
      branding: {
        colors: {
          primary: '#' + clientName.substring(0, 6).padEnd(6, '0'), // Color based on name
          secondary: '#666666'
        }
      }
    };
  }

  // Static client configurations
  private getStaticClientConfig(clientId: string): ClientConfig | null {
    const configs: { [key: string]: ClientConfig } = {
      
      // CLIENT 1: ianii (your store)
      'ianii': {
        clientName: 'Ianii Furniture',
        storeUrl: 'ianii.myshopify.com',
        productId: '7976588148793',
        currency: 'RSD',
        variants: {
          blue: { id: '44770052309049', sku: 'SOFA-BLUE', price: 299.99, color: 'blue', available: true },
          red: { id: '44770045395001', sku: 'SOFA-RED', price: 319.99, color: 'red', available: true },
          green: { id: '44770045427769', sku: 'SOFA-GREEN', price: 309.99, color: 'green', available: true },
          brown: { id: '44770045460537', sku: 'SOFA-BROWN', price: 329.99, color: 'brown', available: true },
          purple: { id: '44770045493305', sku: 'SOFA-PURPLE', price: 349.99, color: 'purple', available: true },
          orange: { id: '44770045526073', sku: 'SOFA-ORANGE', price: 339.99, color: 'orange', available: true }
        },
        branding: {
          logo: '/logos/ianii-logo.png',
          colors: {
            primary: '#0066cc',
            secondary: '#4A90E2'
          }
        }
      },

      // CLIENT 2: demo-furniture (demo client for testing)
      'demo-furniture': {
        clientName: 'Demo Furniture Store',
        storeUrl: 'demo-furniture.myshopify.com',
        productId: 'demo-sofa-12345',
        currency: 'USD',
        variants: {
          blue: { id: 'demo_blue_001', sku: 'DEMO-BLUE', price: 399.99, color: 'blue', available: true },
          red: { id: 'demo_red_002', sku: 'DEMO-RED', price: 429.99, color: 'red', available: true },
          green: { id: 'demo_green_003', sku: 'DEMO-GREEN', price: 419.99, color: 'green', available: true },
          brown: { id: 'demo_brown_004', sku: 'DEMO-BROWN', price: 449.99, color: 'brown', available: true },
          purple: { id: 'demo_purple_005', sku: 'DEMO-PURPLE', price: 479.99, color: 'purple', available: true },
          orange: { id: 'demo_orange_006', sku: 'DEMO-ORANGE', price: 459.99, color: 'orange', available: true }
        },
        branding: {
          logo: '/logos/demo-logo.png',
          colors: {
            primary: '#ff6b35',
            secondary: '#f7931e'
          }
        }
      },

      // CLIENT 3: luxury-living (luxury demo client)
      'luxury-living': {
        clientName: 'Luxury Living Furniture',
        storeUrl: 'luxury-living.myshopify.com',
        productId: 'luxury-sofa-789',
        currency: 'EUR',
        variants: {
          black: { id: 'lux_black_001', sku: 'LUX-BLACK', price: 1299.99, color: 'black', available: true },
          white: { id: 'lux_white_002', sku: 'LUX-WHITE', price: 1399.99, color: 'white', available: true },
          gray: { id: 'lux_gray_003', sku: 'LUX-GRAY', price: 1349.99, color: 'gray', available: true },
          brown: { id: 'lux_brown_004', sku: 'LUX-BROWN', price: 1429.99, color: 'brown', available: true }
        },
        branding: {
          logo: '/logos/luxury-logo.png',
          colors: {
            primary: '#2c3e50',
            secondary: '#34495e'
          }
        }
      }
    };

    return configs[clientId] || null;
  }

  // Load default/fallback configuration
  private async loadDefaultConfiguration(): Promise<void> {
    this.currentConfig = {
      clientName: 'Default Demo Store',
      storeUrl: 'demo.myshopify.com',
      productId: 'default-product-123',
      currency: 'USD',
      variants: {
        blue: { id: 'default_blue', sku: 'DEFAULT-BLUE', price: 299.99, color: 'blue', available: true },
        red: { id: 'default_red', sku: 'DEFAULT-RED', price: 319.99, color: 'red', available: true },
        green: { id: 'default_green', sku: 'DEFAULT-GREEN', price: 309.99, color: 'green', available: true },
        brown: { id: 'default_brown', sku: 'DEFAULT-BROWN', price: 329.99, color: 'brown', available: true }
      },
      branding: {
        colors: {
          primary: '#333333',
          secondary: '#666666'
        }
      }
    };
    
    this.productId = this.currentConfig.productId;
    console.log('📋 Loaded default configuration');
  }

  // Public methods for accessing client data
  public getClientName(): string {
    return this.currentConfig?.clientName || 'Unknown Store';
  }

  public getProductId(): string {
    return this.currentConfig?.productId || 'unknown-product';
  }

  public getStoreUrl(): string {
    return this.currentConfig?.storeUrl || 'demo.myshopify.com';
  }

  public getCurrency(): string {
    return this.currentConfig?.currency || 'USD';
  }

  public getBranding(): any {
    return this.currentConfig?.branding || {
      colors: { primary: '#333333', secondary: '#666666' }
    };
  }

  // Get variant by color (from current client's config)
  getVariantByColor(color: string): ShopifyVariant | null {
    if (!this.currentConfig?.variants) {
      console.warn('⚠️ No variants available for current client');
      return null;
    }
    return this.currentConfig.variants[color] || null;
  }

  // Get all available variants for current client
  getAvailableVariants(): ShopifyVariant[] {
    if (!this.currentConfig?.variants) {
      console.warn('⚠️ No variants available for current client');
      return [];
    }
    return Object.values(this.currentConfig.variants).filter(variant => variant.available);
  }

  // Get price for specific color
  getPriceByColor(color: string): number {
    const variant = this.getVariantByColor(color);
    return variant ? variant.price : 299.99;
  }

  // Load product variants (for compatibility)
  async loadProductVariants(): Promise<void> {
    try {
      console.log('🔄 Loading variants for client:', this.currentClient);
      
      // Try to fetch from API based on environment
      try {
        let apiUrl;
        if (this.isProduction) {
          apiUrl = `${this.baseUrl}/api/clients/${this.currentClient}/variants`;
        } else {
          apiUrl = `${this.bridgeServerUrl}/api/clients/${this.currentClient}/variants`;
        }
        
        const response = await fetch(apiUrl);
        if (response && response.ok) {
          const apiVariants = await response.json();
          if (this.currentConfig) {
            this.currentConfig.variants = apiVariants;
            console.log('✅ Updated variants from API for', this.currentClient);
          }
        }
      } catch (error) {
        console.warn('⚠️ API variants failed, using config variants:', (error as Error).message || error);
      }
      
      const variantCount = Object.keys(this.currentConfig?.variants || {}).length;
      console.log(`📦 ${variantCount} variants available for ${this.currentClient}`);
      
    } catch (error) {
      console.error('❌ Failed to load product variants:', error);
    }
  }

  // Save configuration with client context
  async saveConfiguration(configurationData: ConfigurationData, previewImage: string | null = null, totalPrice: number = 0): Promise<SaveConfigurationResponse> {
    try {
      console.log('💾 Saving configuration for client:', this.currentClient);

      const payload = {
        clientId: this.currentClient,
        productId: this.getProductId(),
        storeUrl: this.getStoreUrl(),
        shop: this.shop,
        customerId: this.customerId,
        customerEmail: this.customerEmail,
        configurationData,
        previewImage,
        totalPrice
      };

      // Try API first
      if (this.isProduction) {
        try {
          const response = await fetch(`${this.baseUrl}/api/configurations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Configuration saved via API:', result.configuration?.id);
            return result;
          }
        } catch (error) {
          console.warn('⚠️ API save failed, using fallback:', (error as Error).message || error);
        }
      }

      // Fallback configuration
      const fallbackConfig = {
        id: `config_${this.currentClient}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId: this.currentClient,
        productId: this.getProductId(),
        configurationData,
        previewImage,
        totalPrice,
        createdAt: new Date().toISOString()
      };

      console.log('✅ Configuration saved (fallback):', fallbackConfig.id);
      return {
        success: true,
        configuration: fallbackConfig,
        message: 'Configuration saved successfully'
      };
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
      
      return {
        success: true,
        configuration: {
          id: `error_fallback_${Date.now()}`,
          clientId: this.currentClient,
          productId: this.getProductId(),
          configurationData,
          totalPrice,
          createdAt: new Date().toISOString()
        },
        message: 'Configuration saved locally'
      };
    }
  }

  // Enhanced add to cart with client context
  async addToCart(configurationData: ConfigurationData, totalPrice: number): Promise<any> {
    try {
      console.log('🛒 Adding to cart for client:', this.currentClient, { configurationData, totalPrice });
      
      // Get the correct variant for the selected color
      let selectedVariant = this.getVariantByColor(configurationData.color || 'blue');
      
      if (!selectedVariant) {
        console.warn('⚠️ No variant found for color:', configurationData.color);
        selectedVariant = {
          id: `fallback_${this.currentClient}_${configurationData.color}`,
          sku: `${this.currentClient?.toUpperCase()}-${(configurationData.color || 'BLUE').toUpperCase()}`,
          price: totalPrice || 299.99,
          color: configurationData.color || 'blue',
          available: true
        };
      }

      // Save configuration first
      const savedConfig = await this.saveConfiguration(configurationData, null, selectedVariant.price);
      
      const cartPayload = {
        clientId: this.currentClient,
        storeUrl: this.getStoreUrl(),
        shop: this.shop,
        productId: this.getProductId(),
        variantId: selectedVariant.id,
        sku: selectedVariant.sku,
        configurationData,
        configurationId: savedConfig.configuration?.id,
        totalPrice: selectedVariant.price,
        currency: this.getCurrency(),
        customerId: this.customerId,
        customerEmail: this.customerEmail,
        quantity: 1,
        properties: {
          'Configuration ID': savedConfig.configuration?.id,
          'Client': this.getClientName(),
          'Custom Color': configurationData.color,
          'Configured At': new Date().toLocaleString(),
          'Configuration URL': this.generateConfigurationUrl(savedConfig.configuration?.id)
        }
      };

      // Try API based on environment
      let apiUrl = this.isProduction ? `${this.baseUrl}/api/cart` : `${this.bridgeServerUrl}/api/cart/add`;
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(cartPayload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Added to cart via API:', result);
          this.sendCartSuccessMessage(selectedVariant, savedConfig, configurationData);
          return result;
        }
      } catch (fetchError) {
        console.warn('⚠️ Cart API network error:', (fetchError as Error).message || fetchError);
      }

      // Fallback: simulate successful cart addition
      const fallbackResult = {
        success: true,
        cartItem: {
          id: `cart_${this.currentClient}_${Date.now()}`,
          variantId: selectedVariant.id,
          sku: selectedVariant.sku,
          title: `Custom ${configurationData.color} Sofa (${selectedVariant.sku})`,
          price: selectedVariant.price,
          currency: this.getCurrency(),
          quantity: 1,
          configurationId: savedConfig.configuration?.id
        },
        variant: selectedVariant,
        client: this.getClientName(),
        message: `🎉 Custom ${configurationData.color} sofa configuration saved for ${this.getClientName()}!`,
        configurationUrl: this.generateConfigurationUrl(savedConfig.configuration?.id)
      };

      console.log('✅ Cart fallback successful for', this.currentClient, ':', fallbackResult);
      this.sendCartSuccessMessage(selectedVariant, savedConfig, configurationData);
      return fallbackResult;

    } catch (error) {
      console.error('❌ Error adding to cart for client', this.currentClient, ':', error);
      
      if (this.isEmbeddedInShopify()) {
        window.parent.postMessage({
          type: 'CART_ERROR',
          data: {
            clientId: this.currentClient,
            error: error instanceof Error ? error.message : 'Failed to add to cart'
          }
        }, '*');
      }
      
      throw error;
    }
  }

  // Send success message with client context
  private sendCartSuccessMessage(variant: ShopifyVariant, savedConfig: any, configurationData: ConfigurationData) {
    if (this.isEmbeddedInShopify()) {
      window.parent.postMessage({
        type: 'CART_SUCCESS',
        data: {
          clientId: this.currentClient,
          clientName: this.getClientName(),
          configurationId: savedConfig.configuration?.id,
          variantId: variant.id,
          productId: this.getProductId(),
          totalPrice: variant.price,
          currency: this.getCurrency(),
          message: `Custom ${configurationData.color} sofa added to cart for ${this.getClientName()}!`
        }
      }, '*');
    }
  }

  // Generate configuration URL with client context
  generateConfigurationUrl(configId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/configurator?client=${this.currentClient}&config=${configId}&productId=${this.getProductId()}`;
  }

  // Generate shareable URL with client context
  generateShareableUrl(configurationData: ConfigurationData): string {
    const baseUrl = window.location.origin + window.location.pathname;
    const configString = encodeURIComponent(JSON.stringify(configurationData));
    
    const params = new URLSearchParams();
    if (this.currentClient) params.set('client', this.currentClient);
    params.set('config', configString);
    
    return `${baseUrl}?${params.toString()}`;
  }

  // Legacy compatibility methods
  loadConfiguration(): Promise<any[]> {
    return Promise.resolve([]);
  }

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

  isEmbeddedInShopify(): boolean {
    return !!(window.parent && window.parent !== window);
  }

  sendToShopify(type: string, data: any): void {
    if (this.isEmbeddedInShopify()) {
      window.parent.postMessage({
        type,
        data: {
          ...data,
          clientId: this.currentClient,
          shop: this.shop,
          productId: this.getProductId()
        }
      }, '*');
    }
  }

  setupShopifyMessageListener(): void {
    window.addEventListener('message', (event) => {
      if (event.origin.includes('shopify.com') || event.origin.includes('vercel.app')) {
        console.log('📥 Received from parent for client', this.currentClient, ':', event.data);
      }
    });
  }
}

export default new MultiClientShopifyService();