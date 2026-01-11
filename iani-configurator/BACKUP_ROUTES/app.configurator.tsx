import { useState, useEffect } from "react";
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
  Select,
  TextField,
  Banner,
  Modal,
  EmptyState
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  // Get Shopify products
  const response = await admin.graphql(`
    query GetProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            status
            featuredImage {
              url
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                }
              }
            }
          }
        }
      }
    }
  `, {
    variables: { first: 20 }
  });

  const shopifyProducts = await response.json();

  // Get existing 3D products configuration
  const products3D = await db.product3D.findMany({
    where: { shop: session.shop },
    include: {
      customizationOptions: true,
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
    take: 10
  });

  return json({
    shopifyProducts: shopifyProducts.data.products.edges,
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
            shopifyProductId,
            shop: session.shop,
            name,
            baseModelUrl,
            isActive: true
          }
        });

        return json({ success: true, product3D });
      }

      case "toggle_3d_product": {
        const productId = formData.get("productId") as string;
        const isActive = formData.get("isActive") === "true";

        const product3D = await db.product3D.update({
          where: { id: productId },
          data: { isActive }
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
  const { shopifyProducts, products3D, recentConfigurations, shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productName, setProductName] = useState("");
  const [modelUrl, setModelUrl] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedConfiguratorProduct, setSelectedConfiguratorProduct] = useState<any>(null);

  const productOptions = shopifyProducts.map((product: any) => ({
    label: product.node.title,
    value: product.node.id
  }));

  const handleCreateProduct = () => {
    if (!selectedProduct || !productName || !modelUrl) {
      shopify.toast.show("Please fill in all fields", { isError: true });
      return;
    }

    fetcher.submit({
      action: "create_3d_product",
      shopifyProductId: selectedProduct,
      name: productName,
      baseModelUrl: modelUrl
    }, { method: "POST" });

    setShowCreateModal(false);
    setSelectedProduct("");
    setProductName("");
    setModelUrl("");
  };

  const openConfigurator = (product3D: any) => {
    const shopifyProduct = shopifyProducts.find((p: any) => 
      p.node.id === product3D.shopifyProductId
    );
    
    if (!shopifyProduct) {
      shopify.toast.show("Product not found", { isError: true });
      return;
    }

    setSelectedConfiguratorProduct({
      ...product3D,
      shopifyProduct: shopifyProduct.node
    });
  };

  const toggleProductStatus = (productId: string, currentStatus: boolean) => {
    fetcher.submit({
      action: "toggle_3d_product",
      productId,
      isActive: (!currentStatus).toString()
    }, { method: "POST" });
  };

  const deleteProduct = (productId: string) => {
    if (confirm("Are you sure you want to delete this 3D product configuration?")) {
      fetcher.submit({
        action: "delete_3d_product",
        productId
      }, { method: "POST" });
    }
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Action completed successfully");
    } else if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data]);

  return (
    <Page>
      <TitleBar title="3D Product Configurator">
        <button variant="primary" onClick={() => setShowCreateModal(true)}>
          Add 3D Product
        </button>
      </TitleBar>

      <BlockStack gap="500">
        {products3D.length === 0 && (
          <Banner title="Get started with 3D configurator" status="info">
            <p>
              Create your first 3D product configuration to allow customers to customize products in real-time.
            </p>
          </Banner>
        )}

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
                          <InlineStack align="space-between">
                            <BlockStack gap="100">
                              <Text as="h3" variant="headingSm" fontWeight="semibold">
                                {product.name}
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Model: {product.baseModelUrl}
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Configurations: {product._count.configurations}
                              </Text>
                            </BlockStack>
                            
                            <InlineStack gap="200">
                              <Button
                                size="micro"
                                onClick={() => toggleProductStatus(product.id, product.isActive)}
                                variant={product.isActive ? "primary" : ""}
                              >
                                {product.isActive ? "Active" : "Inactive"}
                              </Button>
                              <Button
                                size="micro"
                                onClick={() => openConfigurator(product)}
                                disabled={!product.isActive}
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
                    Recent Configurations
                  </Text>
                  {recentConfigurations.length > 0 ? (
                    <BlockStack gap="200">
                      {recentConfigurations.slice(0, 5).map((config: any) => (
                        <div key={config.id} style={{ 
                          padding: '12px', 
                          border: '1px solid #e1e5e9', 
                          borderRadius: '8px',
                          backgroundColor: '#f9f9f9'
                        }}>
                          <BlockStack gap="100">
                            <Text as="span" variant="bodySm" fontWeight="semibold">
                              {config.product3D.name}
                            </Text>
                            <Text as="span" variant="bodySm" tone="subdued">
                              ${config.totalPrice.toFixed(2)} • {config.status}
                            </Text>
                            <Text as="span" variant="bodySm" tone="subdued">
                              {new Date(config.createdAt).toLocaleDateString()}
                            </Text>
                          </BlockStack>
                        </div>
                      ))}
                    </BlockStack>
                  ) : (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No configurations yet.
                    </Text>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Quick Stats
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Total Products:</Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {products3D.length}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Active Products:</Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {products3D.filter((p: any) => p.isActive).length}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Total Configurations:</Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {recentConfigurations.length}
                      </Text>
                    </InlineStack>
                  </BlockStack>
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
            <Select
              label="Shopify Product"
              options={[{ label: "Select a product...", value: "" }, ...productOptions]}
              value={selectedProduct}
              onChange={setSelectedProduct}
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

      {/* Configurator Preview Modal */}
      {selectedConfiguratorProduct && (
        <Modal
          open={!!selectedConfiguratorProduct}
          onClose={() => setSelectedConfiguratorProduct(null)}
          title={`Configure: ${selectedConfiguratorProduct.name}`}
          size="fullScreen"
        >
          <Modal.Section>
            <div style={{ height: '90vh', width: '100%' }}>
              <iframe
                src={`http://localhost:3001/configurator?shop=${shop}&productId=${selectedConfiguratorProduct.id}&shopifyProductId=${selectedConfiguratorProduct.shopifyProductId}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '8px'
                }}
                title="3D Product Configurator"
                allow="fullscreen"
              />
            </div>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}