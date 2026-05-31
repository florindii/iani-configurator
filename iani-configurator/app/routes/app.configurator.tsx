import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Banner,
  Modal,
  EmptyState
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Just get existing 3D products configuration (no GraphQL needed)
  const products3D = await db.product3D.findMany({
    where: { shop: session.shop },
    include: {
      _count: {
        select: { configurations: true }
      }
    }
  });

  // Get recent configurations
  const recentConfigurations = await db.productConfiguration.findMany({
    where: {
      product3D: {
        shop: session.shop
      }
    },
    include: {
      product3D: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });

  return json({
    products3D,
    recentConfigurations,
    shop: session.shop
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action");

  try {
    switch (actionType) {
      case "create_3d_product": {
        const shopifyProductId = formData.get("shopifyProductId") as string;
        const name = formData.get("name") as string;
        const baseModelUrl = formData.get("baseModelUrl") as string;

        const product3D = await db.product3D.create({
          data: {
            shopifyProductId: shopifyProductId || "temp-product-id",
            shop: session.shop,
            name,
            baseModelUrl,
            isActive: true
          }
        });

        return json({ success: true, product3D });
      }

      case "delete_3d_product": {
        const productId = formData.get("productId") as string;

        await db.product3D.delete({
          where: { id: productId }
        });

        return json({ success: true });
      }

      default:
        return json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Action error:", error);
    return json({ error: "Something went wrong" }, { status: 500 });
  }
};

export default function ConfiguratorPage() {
  const { products3D, recentConfigurations, shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  
  const [productName, setProductName] = useState("");
  const [modelUrl, setModelUrl] = useState("/models/Couch.glb");
  const [shopifyProductId, setShopifyProductId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedConfiguratorProduct, setSelectedConfiguratorProduct] = useState<any>(null);

  const handleCreateProduct = () => {
    if (!productName || !modelUrl) {
      alert("Please fill in all fields");
      return;
    }

    fetcher.submit({
      action: "create_3d_product",
      shopifyProductId: shopifyProductId || "manual-product",
      name: productName,
      baseModelUrl: modelUrl
    }, { method: "POST" });

    setShowCreateModal(false);
    setProductName("");
    setModelUrl("/models/Couch.glb");
    setShopifyProductId("");
  };

  const openConfigurator = (product3D: any) => {
    setSelectedConfiguratorProduct(product3D);
  };

  const deleteProduct = (productId: string) => {
    if (confirm("Are you sure you want to delete this 3D product configuration?")) {
      fetcher.submit({
        action: "delete_3d_product",
        productId
      }, { method: "POST" });
    }
  };

  return (
    <Page>
      <TitleBar title="3D Product Configurator">
        <button variant="primary" onClick={() => setShowCreateModal(true)}>
          Add 3D Product
        </button>
      </TitleBar>

      <BlockStack gap="500">
        <Banner title="3D Configurator is working!" status="success">
          <p>
            The configurator interface has been successfully restored. You can now create 3D product configurations.
          </p>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  3D Products ({products3D.length})
                </Text>
                
                {products3D.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {products3D.map((product: any) => (
                      <Card key={product.id}>
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="start" wrap={true} gap="300">
                            <BlockStack gap="100">
                              <Text as="h3" variant="headingSm" fontWeight="semibold">
                                {product.name}
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Configurations: {product._count.configurations}
                              </Text>
                            </BlockStack>
                            <InlineStack gap="200">
                              <Button
                                size="micro"
                                onClick={() => openConfigurator(product)}
                              >
                                Configure
                              </Button>
                              <Button
                                size="micro"
                                variant="primary"
                                tone="critical"
                                onClick={() => deleteProduct(product.id)}
                              >
                                Delete
                              </Button>
                            </InlineStack>
                          </InlineStack>
                        </BlockStack>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    heading="No 3D products configured"
                    action={{
                      content: "Add 3D Product",
                      onAction: () => setShowCreateModal(true)
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Start by adding a 3D product to enable customer customization.</p>
                  </EmptyState>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Quick Stats
                  </Text>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text as="span" variant="bodyMd">Total Products:</Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {products3D.length}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text as="span" variant="bodyMd">Total Configurations:</Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {recentConfigurations.length}
                    </Text>
                  </div>
                </BlockStack>
              </Card>
              
              {/* ✅ NEW: Recent Cart Activity */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Recent Activity
                  </Text>
                  {recentConfigurations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {recentConfigurations.slice(0, 3).map((config: any) => (
                        <div key={config.id} style={{ 
                          padding: '12px', 
                          background: '#f9fafb', 
                          borderRadius: '8px',
                          border: '1px solid #e1e5e9'
                        }}>
                          <Text as="p" variant="bodyMd" fontWeight="semibold">
                            {config.product3D.name}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {config.configurationData?.material} • {config.configurationData?.color} • {config.configurationData?.size}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            ${config.totalPrice} • {config.status}
                          </Text>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No configurations yet
                    </Text>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Create Product Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add 3D Product"
        primaryAction={{
          content: "Create Product",
          onAction: handleCreateProduct,
          loading: fetcher.state === "submitting"
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowCreateModal(false)
          }
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Shopify Product ID (Optional)"
              value={shopifyProductId}
              onChange={setShopifyProductId}
              placeholder="gid://shopify/Product/123456789"
              autoComplete="off"
              helpText="Optional: Link to existing Shopify product"
            />
            
            <TextField
              label="3D Product Name"
              value={productName}
              onChange={setProductName}
              placeholder="e.g., Customizable Sofa"
              autoComplete="off"
            />
            
            <TextField
              label="3D Model URL"
              value={modelUrl}
              onChange={setModelUrl}
              placeholder="/models/sofa.glb"
              autoComplete="off"
              helpText="Relative path to your 3D model file"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Configurator Preview Modal — custom full-viewport overlay.
          Polaris Modal (via App Bridge) caps its width in the embedded admin,
          so we render our own overlay to guarantee a large split view. */}
      {selectedConfiguratorProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 520,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setSelectedConfiguratorProduct(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Configure ${selectedConfiguratorProduct.name}`}
        >
          <div
            style={{
              position: 'relative',
              width: '96vw',
              height: '94vh',
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.35)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: '1px solid #e1e5e9',
                flexShrink: 0
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                Configure: {selectedConfiguratorProduct.name}
              </span>
              <button
                onClick={() => setSelectedConfiguratorProduct(null)}
                aria-label="Close"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '20px',
                  lineHeight: 1,
                  color: '#6b7280',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Configurator iframe (fills the rest; Vue app splits 3D left / options right) */}
            <iframe
              src={`https://iani-configurator.vercel.app?shop=${encodeURIComponent(shop)}&product=${encodeURIComponent(selectedConfiguratorProduct.shopifyProductId)}&modelUrl=${encodeURIComponent(selectedConfiguratorProduct.baseModelUrl || '')}&preview=true`}
              style={{
                flex: 1,
                width: '100%',
                border: 'none'
              }}
              title="3D Product Configurator"
              allow="fullscreen; accelerometer; gyroscope; camera; xr-spatial-tracking"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </Page>
  );
}