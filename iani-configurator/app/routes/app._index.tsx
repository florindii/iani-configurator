import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Banner,
  Icon,
  Box,
  Divider,
  Badge,
  ProgressBar,
} from "@shopify/polaris";
import {
  ProductIcon,
  ViewIcon,
  SettingsIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getShopSubscription, PLANS, type PlanType } from "../billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get subscription status
  const subscription = await getShopSubscription(shop);
  const planDetails = PLANS[subscription.plan as PlanType] || PLANS.free;

  // Get counts for dashboard stats
  const totalProducts = await db.product3D.count({
    where: { shop },
  });

  const activeProducts = await db.product3D.count({
    where: { shop, isActive: true },
  });

  const tryOnEnabledProducts = await db.product3D.count({
    where: { shop, tryOnEnabled: true },
  });

  // Get recent products (last 5)
  const recentProducts = await db.product3D.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      isActive: true,
      tryOnEnabled: true,
      updatedAt: true,
    },
  });

  // Calculate product limit usage
  const productLimit = planDetails.productLimit;
  const canAddMore = productLimit === -1 || totalProducts < productLimit;

  return json({
    shop,
    stats: {
      totalProducts,
      activeProducts,
      tryOnEnabledProducts,
    },
    recentProducts,
    subscription: {
      plan: subscription.plan,
      planName: planDetails.name,
      isTrialing: subscription.isTrialing,
      trialEndsAt: subscription.trialEndsAt,
      productLimit,
      canAddMore,
      features: planDetails.features,
    },
  });
};

export default function Index() {
  const { stats, recentProducts, subscription } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const getProductLimitText = () => {
    if (subscription.productLimit === -1) return "Unlimited";
    return `${stats.totalProducts} / ${subscription.productLimit}`;
  };

  const getProductLimitProgress = () => {
    if (subscription.productLimit === -1) return 0;
    return (stats.totalProducts / subscription.productLimit) * 100;
  };

  return (
    <Page>
      <TitleBar title="Iani 3D Configurator" />
      <BlockStack gap="500">
        {/* Subscription Status Banner */}
        {subscription.isTrialing && (
          <Banner
            title={`Free Trial - ${subscription.planName} Plan`}
            tone="warning"
          >
            <p>
              Your free trial ends on {new Date(subscription.trialEndsAt!).toLocaleDateString()}.
              Upgrade now to keep all features.
            </p>
          </Banner>
        )}

        {subscription.plan === "free" && (
          <Banner
            title="Upgrade to unlock more features"
            tone="info"
            action={{ content: "View Plans", onAction: () => navigate("/app/billing") }}
          >
            <p>
              You're on the Free plan with 1 product. Upgrade to Pro for unlimited products and Virtual Try-On.
            </p>
          </Banner>
        )}

        {/* Subscription Card */}
        <Card>
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h2" variant="headingMd">Current Plan</Text>
                <Badge tone={subscription.plan === "free" ? "info" : "success"}>
                  {subscription.planName}
                </Badge>
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                Products: {getProductLimitText()}
                {subscription.productLimit !== -1 && (
                  <> • Try-On: {subscription.features.tryOnEnabled ? "Enabled" : "Upgrade to enable"}</>
                )}
              </Text>
            </BlockStack>
            <Button onClick={() => navigate("/app/billing")}>
              {subscription.plan === "free" ? "Upgrade" : "Manage Subscription"}
            </Button>
          </InlineStack>
          {subscription.productLimit !== -1 && subscription.productLimit > 0 && (
            <Box paddingBlockStart="300">
              <ProgressBar progress={getProductLimitProgress()} size="small" />
            </Box>
          )}
        </Card>

        <Layout>
          {/* Stats Cards */}
          <Layout.Section>
            <InlineStack gap="400" wrap={false}>
              <Box minWidth="200px" width="100%">
                <Card>
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Total 3D Products
                      </Text>
                      <Icon source={ProductIcon} tone="base" />
                    </InlineStack>
                    <Text as="p" variant="headingXl">
                      {stats.totalProducts}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Products with 3D configuration
                    </Text>
                  </BlockStack>
                </Card>
              </Box>

              <Box minWidth="200px" width="100%">
                <Card>
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Active Products
                      </Text>
                      <Icon source={ViewIcon} tone="success" />
                    </InlineStack>
                    <Text as="p" variant="headingXl">
                      {stats.activeProducts}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Visible on your storefront
                    </Text>
                  </BlockStack>
                </Card>
              </Box>

              <Box minWidth="200px" width="100%">
                <Card>
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingSm" tone="subdued">
                        AR Try-On Enabled
                      </Text>
                      <Icon source={SettingsIcon} tone="info" />
                    </InlineStack>
                    <Text as="p" variant="headingXl">
                      {stats.tryOnEnabledProducts}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Products with virtual try-on
                    </Text>
                  </BlockStack>
                </Card>
              </Box>
            </InlineStack>
          </Layout.Section>

          {/* Quick Actions */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Quick Actions
                </Text>
                <Divider />
                <InlineStack gap="300" wrap>
                  <Button
                    variant="primary"
                    onClick={() => navigate("/app/products/new")}
                    disabled={!subscription.canAddMore}
                  >
                    Add 3D Product
                  </Button>
                  {!subscription.canAddMore && (
                    <Button onClick={() => navigate("/app/billing")}>
                      Upgrade for More Products
                    </Button>
                  )}
                  <Button onClick={() => navigate("/app/products")}>
                    View All Products
                  </Button>
                  <Button onClick={() => navigate("/app/configurator")}>
                    Preview Configurator
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Recent Products */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Recent Products
                  </Text>
                  <Button
                    variant="plain"
                    onClick={() => navigate("/app/products")}
                  >
                    View all
                  </Button>
                </InlineStack>
                <Divider />
                {recentProducts.length === 0 ? (
                  <Box padding="400">
                    <BlockStack gap="200" inlineAlign="center">
                      <Text as="p" tone="subdued">
                        No 3D products configured yet
                      </Text>
                      <Button onClick={() => navigate("/app/products/new")}>
                        Add your first product
                      </Button>
                    </BlockStack>
                  </Box>
                ) : (
                  <BlockStack gap="300">
                    {recentProducts.map((product) => (
                      <Box
                        key={product.id}
                        padding="300"
                        background="bg-surface-secondary"
                        borderRadius="200"
                      >
                        <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="100">
                            <Text as="span" variant="bodyMd" fontWeight="semibold">
                              {product.name}
                            </Text>
                            <InlineStack gap="200">
                              <Text
                                as="span"
                                variant="bodySm"
                                tone={product.isActive ? "success" : "critical"}
                              >
                                {product.isActive ? "Active" : "Inactive"}
                              </Text>
                              {product.tryOnEnabled && (
                                <Text as="span" variant="bodySm" tone="subdued">
                                  • AR Try-On
                                </Text>
                              )}
                            </InlineStack>
                          </BlockStack>
                          <Button
                            variant="plain"
                            onClick={() => navigate(`/app/products/${product.id}`)}
                          >
                            Edit
                          </Button>
                        </InlineStack>
                      </Box>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Getting Started Guide */}
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Getting Started
                </Text>
                <Divider />
                <BlockStack gap="300">
                  <Box
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <BlockStack gap="100">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        1. Add a 3D Product
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        Select a Shopify product and configure colors and materials
                      </Text>
                    </BlockStack>
                  </Box>
                  <Box
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <BlockStack gap="100">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        2. Upload 3D Model
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        Add a GLB/GLTF model to your Shopify product media
                      </Text>
                    </BlockStack>
                  </Box>
                  <Box
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <BlockStack gap="100">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        3. Add App Block to Theme
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        Enable the 3D configurator on your product pages
                      </Text>
                    </BlockStack>
                  </Box>
                  <Box
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <BlockStack gap="100">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        4. Enable AR Try-On (Optional)
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        Let customers try glasses or accessories with their camera
                      </Text>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Features Card */}
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Features
                </Text>
                <Divider />
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span">🎨</Text>
                    <Text as="span" variant="bodyMd">
                      Real-time color customization
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span">🔧</Text>
                    <Text as="span" variant="bodyMd">
                      Material selection with pricing
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span">👓</Text>
                    <Text as="span" variant="bodyMd">
                      Virtual Try-On (Face AR)
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span">📱</Text>
                    <Text as="span" variant="bodyMd">
                      Mobile-responsive design
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span">🛒</Text>
                    <Text as="span" variant="bodyMd">
                      Direct cart integration
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
