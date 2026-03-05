import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  InlineStack,
  Badge,
  Box,
  Divider,
  Button,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const { id } = params;

  if (!id) {
    throw new Response("Configuration ID is required", { status: 400 });
  }

  const configuration = await db.productConfiguration.findFirst({
    where: {
      id,
      shop,
    },
    include: {
      product3D: {
        select: {
          id: true,
          name: true,
          shopifyProductId: true,
          basePrice: true,
        },
      },
    },
  });

  if (!configuration) {
    throw new Response("Configuration not found", { status: 404 });
  }

  return json({ configuration, shop });
};

export default function ConfigurationDetailPage() {
  const { configuration, shop } = useLoaderData<typeof loader>();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ordered":
        return <Badge tone="success">Ordered</Badge>;
      case "saved":
        return <Badge tone="info">Saved</Badge>;
      case "draft":
        return <Badge tone="warning">Draft</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Parse configuration data
  const configData = configuration.configurationData as Record<string, any> || {};

  // Build Shopify admin order URL if order exists
  const shopifyOrderUrl = configuration.shopifyOrderId
    ? `https://${shop}/admin/orders/${configuration.shopifyOrderId.replace("gid://shopify/Order/", "")}`
    : null;

  // Build Shopify admin product URL
  const shopifyProductUrl = configuration.product3D?.shopifyProductId
    ? `https://${shop}/admin/products/${configuration.product3D.shopifyProductId}`
    : null;

  return (
    <Page
      backAction={{ content: "Configuration Orders", url: "/app/configurations" }}
      title={`Configuration for ${configuration.product3D?.name || "Unknown Product"}`}
      titleMetadata={getStatusBadge(configuration.status)}
      secondaryActions={
        shopifyOrderUrl
          ? [
              {
                content: "View Order in Shopify",
                url: shopifyOrderUrl,
                external: true,
              },
            ]
          : []
      }
    >
      <TitleBar title="Configuration Order Details" />
      <Layout>
        {/* Preview Image */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Preview Image
              </Text>
              <Box
                background="bg-surface-secondary"
                borderRadius="200"
                padding="200"
                minHeight="300px"
              >
                {configuration.previewImageUrl ? (
                  <img
                    src={configuration.previewImageUrl}
                    alt="Configuration preview"
                    style={{
                      width: "100%",
                      height: "auto",
                      borderRadius: "8px",
                      display: "block",
                    }}
                  />
                ) : (
                  <Box padding="1000">
                    <BlockStack gap="200" inlineAlign="center">
                      <Text as="p" tone="subdued" alignment="center">
                        No preview image available
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        Preview images are captured when customers add configured products to cart
                      </Text>
                    </BlockStack>
                  </Box>
                )}
              </Box>
              {configuration.previewImageUrl && (
                <Button
                  url={configuration.previewImageUrl}
                  external
                  fullWidth
                >
                  Open Full Image
                </Button>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Configuration Details */}
        <Layout.Section>
          <BlockStack gap="400">
            {/* Order Info (if ordered) */}
            {configuration.shopifyOrderId && (
              <Banner title="This configuration has been ordered" tone="success">
                <p>
                  Order: <strong>{configuration.shopifyOrderName || configuration.shopifyOrderId}</strong>
                </p>
              </Banner>
            )}

            {/* Product & Customer Info */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Details
                </Text>
                <Divider />

                <InlineStack gap="1000">
                  <BlockStack gap="200">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Product
                    </Text>
                    <InlineStack gap="200">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {configuration.product3D?.name || "Unknown"}
                      </Text>
                      {shopifyProductUrl && (
                        <Button size="slim" url={shopifyProductUrl} external variant="plain">
                          View in Shopify
                        </Button>
                      )}
                    </InlineStack>
                  </BlockStack>

                  <BlockStack gap="200">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Created
                    </Text>
                    <Text as="span" variant="bodyMd">
                      {formatDate(configuration.createdAt)}
                    </Text>
                  </BlockStack>

                  {configuration.customerEmail && (
                    <BlockStack gap="200">
                      <Text as="span" variant="bodySm" tone="subdued">
                        Customer Email
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {configuration.customerEmail}
                      </Text>
                    </BlockStack>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Selected Options */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Selected Options
                </Text>
                <Divider />

                <InlineStack gap="1000">
                  {/* Color */}
                  <BlockStack gap="200">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Color
                    </Text>
                    {configuration.colorName ? (
                      <InlineStack gap="200" blockAlign="center">
                        <Box
                          minWidth="24px"
                          minHeight="24px"
                          borderRadius="100"
                          overflowX="hidden"
                          overflowY="hidden"
                        >
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              backgroundColor: configuration.colorHex || "#ccc",
                              borderRadius: "6px",
                              border: "2px solid #ddd",
                            }}
                          />
                        </Box>
                        <BlockStack gap="0">
                          <Text as="span" variant="bodyMd" fontWeight="semibold">
                            {configuration.colorName}
                          </Text>
                          {configuration.colorHex && (
                            <Text as="span" variant="bodySm" tone="subdued">
                              {configuration.colorHex}
                            </Text>
                          )}
                        </BlockStack>
                      </InlineStack>
                    ) : (
                      <Text as="span" variant="bodyMd" tone="subdued">
                        Not specified
                      </Text>
                    )}
                  </BlockStack>

                  {/* Material */}
                  <BlockStack gap="200">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Material
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight={configuration.materialName ? "semibold" : "regular"}>
                      {configuration.materialName || "Not specified"}
                    </Text>
                  </BlockStack>

                  {/* Price */}
                  <BlockStack gap="200">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Configured Price
                    </Text>
                    <Text as="span" variant="headingLg">
                      {formatPrice(configuration.totalPrice)}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Raw Configuration Data */}
            {Object.keys(configData).length > 0 && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Full Configuration Data
                  </Text>
                  <Divider />
                  <Box
                    background="bg-surface-secondary"
                    padding="400"
                    borderRadius="200"
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        fontFamily: "monospace",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {JSON.stringify(configData, null, 2)}
                    </pre>
                  </Box>
                </BlockStack>
              </Card>
            )}

            {/* Configuration ID (for support) */}
            <Card>
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Configuration ID
                  </Text>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {configuration.id}
                  </Text>
                </BlockStack>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(configuration.id);
                  }}
                  size="slim"
                >
                  Copy ID
                </Button>
              </InlineStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
