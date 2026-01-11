// Basic Three.js React component to be enhanced later
import { useEffect, useRef, useState } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Button,
  Select,
  Text,
  Badge
} from '@shopify/polaris';

interface ThreeConfiguratorProps {
  productId: string;
  modelUrl: string;
  onConfigurationChange?: (config: any) => void;
  initialConfig?: any;
}

interface ConfigurationState {
  material: string;
  color: string;
  size: string;
  [key: string]: string;
}

export function ThreeConfigurator({ 
  productId, 
  modelUrl, 
  onConfigurationChange,
  initialConfig = {}
}: ThreeConfiguratorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  
  const [configuration, setConfiguration] = useState<ConfigurationState>({
    material: initialConfig.material || 'fabric',
    color: initialConfig.color || 'blue',
    size: initialConfig.size || 'medium',
    ...initialConfig
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configuration options
  const configOptions = {
    material: [
      { label: 'Fabric', value: 'fabric' },
      { label: 'Leather', value: 'leather' },
      { label: 'Velvet', value: 'velvet' }
    ],
    color: [
      { label: 'Blue', value: 'blue' },
      { label: 'Red', value: 'red' },
      { label: 'Green', value: 'green' },
      { label: 'Brown', value: 'brown' }
    ],
    size: [
      { label: 'Small', value: 'small' },
      { label: 'Medium', value: 'medium' },
      { label: 'Large', value: 'large' }
    ]
  };

  // Initialize Three.js scene (placeholder for now)
  useEffect(() => {
    if (!mountRef.current) return;

    // Placeholder implementation - will be enhanced with actual Three.js in Week 2
    const canvas = document.createElement('div');
    canvas.style.width = '100%';
    canvas.style.height = '400px';
    canvas.style.backgroundColor = '#f0f0f0';
    canvas.style.display = 'flex';
    canvas.style.alignItems = 'center';
    canvas.style.justifyContent = 'center';
    canvas.style.borderRadius = '8px';
    canvas.style.border = '2px dashed #ccc';
    canvas.innerHTML = `
      <div style="text-align: center; color: #666;">
        <h3>3D Model Preview</h3>
        <p>Model: ${modelUrl}</p>
        <p>Three.js integration coming in Week 2</p>
      </div>
    `;

    mountRef.current.appendChild(canvas);
    setIsLoading(false);

    return () => {
      if (mountRef.current && canvas) {
        mountRef.current.removeChild(canvas);
      }
    };
  }, [modelUrl]);

  // Handle configuration changes
  const handleConfigChange = (key: string, value: string) => {
    const newConfig = { ...configuration, [key]: value };
    setConfiguration(newConfig);
    onConfigurationChange?.(newConfig);
  };

  if (error) {
    return (
      <Card>
        <Text as="p" variant="bodyMd" tone="critical">
          {error}
        </Text>
      </Card>
    );
  }

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Product Configurator
          </Text>
          
          <div ref={mountRef} style={{ position: 'relative' }}>
            {isLoading && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10
              }}>
                <Text as="p" variant="bodyMd">Loading 3D model...</Text>
              </div>
            )}
          </div>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Customization Options
          </Text>
          
          <InlineStack gap="400" wrap={false}>
            <div style={{ flex: 1 }}>
              <Select
                label="Material"
                options={configOptions.material}
                value={configuration.material}
                onChange={(value) => handleConfigChange('material', value)}
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <Select
                label="Color"
                options={configOptions.color}
                value={configuration.color}
                onChange={(value) => handleConfigChange('color', value)}
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <Select
                label="Size"
                options={configOptions.size}
                value={configuration.size}
                onChange={(value) => handleConfigChange('size', value)}
              />
            </div>
          </InlineStack>

          <InlineStack gap="200">
            <Badge tone="info">Material: {configuration.material}</Badge>
            <Badge tone="success">Color: {configuration.color}</Badge>
            <Badge tone="attention">Size: {configuration.size}</Badge>
          </InlineStack>

          <InlineStack gap="200">
            <Button>Save Configuration</Button>
            <Button variant="primary">Add to Cart</Button>
          </InlineStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}