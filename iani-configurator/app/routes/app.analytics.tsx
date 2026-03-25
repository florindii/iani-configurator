import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Icon,
  Box,
  Divider,
  Badge,
  Banner,
  Button,
} from "@shopify/polaris";
import { ProductIcon, ViewIcon, SettingsIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { hasFeatureAccess, getShopSubscription, PLANS, type PlanType } from "../billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const hasAccess = await hasFeatureAccess(shop, "analytics");

  // Return early with lock state — no redirect, show upsell instead
  if (!hasAccess) {
    const subscription = await getShopSubscription(shop);
    const planDetails = PLANS[subscription.plan as PlanType] || PLANS.free;
    return json({
      hasAccess: false,
      currentPlanName: planDetails.name,
      stats: null,
      topColors: [],
      topMaterials: [],
      productStats: [],
      recentOrders: [],
    });
  }

  // Overall stats
  const totalConfigurations = await db.productConfiguration.count({ where: { shop } });
  const orderedConfigurations = await db.productConfiguration.count({ where: { shop, status: "ordered" } });
  const savedConfigurations = await db.productConfiguration.count({ where: { shop, status: "saved" } });

  // Total revenue from ordered configs
  const revenueResult = await db.productConfiguration.aggregate({
    where: { shop, status: "ordered" },
    _sum: { totalPrice: true },
  });
  const totalRevenue = revenueResult._sum.totalPrice ?? 0;

  // Top 5 colors chosen by customers
  const colorGroups = await db.productConfiguration.groupBy({
    by: ["colorName", "colorHex"],
    where: { shop, colorName: { not: null } },
    _count: { colorName: true },
    orderBy: { _count: { colorName: "desc" } },
    take: 5,
  });

  // Top 5 materials chosen by customers
  const materialGroups = await db.productConfiguration.groupBy({
    by: ["materialName"],
    where: { shop, materialName: { not: null } },
    _count: { materialName: true },
    orderBy: { _count: { materialName: "desc" } },
    take: 5,
  });

  // Per-product breakdown
  const products = await db.product3D.findMany({
    where: { shop },
    select: {
      id: true,
      name: true,
      isActive: true,
      tryOnEnabled: true,
      _count: { select: { configurations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const productStats = await Promise.all(
    products.map(async (p) => {
      const ordered = await db.productConfiguration.count({
        where: { product3DId: p.id, status: "ordered" },
      });
      const revenueAgg = await db.productConfiguration.aggregate({
        where: { product3DId: p.id, status: "ordered" },
        _sum: { totalPrice: true },
      });
      return {
        id: p.id,
        name: p.name,
        isActive: p.isActive,
        tryOnEnabled: p.tryOnEnabled,
        totalConfigs: p._count.configurations,
        orderedConfigs: ordered,
        revenue: revenueAgg._sum.totalPrice ?? 0,
      };
    })
  );

  // 5 most recent ordered configurations
  const recentOrders = await db.productConfiguration.findMany({
    where: { shop, status: "ordered" },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { product3D: { select: { name: true } } },
  });

  return json({
    hasAccess: true,
    currentPlanName: null,
    stats: {
      totalConfigurations,
      orderedConfigurations,
      savedConfigurations,
      totalRevenue,
      conversionRate:
        totalConfigurations > 0
          ? Math.round((orderedConfigurations / totalConfigurations) * 100)
          : 0,
    },
    topColors: colorGroups.map((g) => ({
      name: g.colorName,
      hex: g.colorHex,
      count: g._count.colorName,
    })),
    topMaterials: materialGroups.map((g) => ({
      name: g.materialName,
      count: g._count.materialName,
    })),
    productStats,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      productName: o.product3D.name,
      colorName: o.colorName,
      materialName: o.materialName,
      totalPrice: o.totalPrice,
      orderedAt: o.updatedAt,
    })),
  });
};

export default function AnalyticsPage() {
  const { hasAccess, currentPlanName, stats, topColors, topMaterials, productStats, recentOrders } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // Lock screen for Free / Starter plans
  if (!hasAccess) {
    return (
      <Page title="Analytics" subtitle="Overview of customer configurations and orders">
        <Card>
          <Box padding="800">
            <BlockStack gap="400" inlineAlign="center">
              <Text as="h2" variant="headingLg">
                Analytics is available on the Business plan
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                You're currently on the <strong>{currentPlanName}</strong> plan. Upgrade to Business to unlock real-time
                insights: conversion rates, top colors, revenue per product, and more.
              </Text>
              <InlineStack gap="300">
                <Button variant="primary" onClick={() => navigate("/app/billing")}>
                  Upgrade to Business — $99/mo
                </Button>
                <Button onClick={() => navigate("/app")}>
                  Back to dashboard
                </Button>
              </InlineStack>

              {/* Blurred preview of what they'd see */}
              <div style={{ width: "100%", marginTop: "16px", position: "relative" }}>
                <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>
                  <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                    {["Total Configurations", "Orders", "Conversion Rate", "Revenue"].map((label) => (
                      <div key={label} style={{ flex: 1, background: "var(--p-color-bg-surface-secondary)", borderRadius: "8px", padding: "16px" }}>
                        <Text as="p" variant="headingSm" tone="subdued">{label}</Text>
                        <Text as="p" variant="headingXl">—</Text>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "16px" }}>
                    {["Top Colors", "Top Materials"].map((label) => (
                      <div key={label} style={{ flex: 1, background: "var(--p-color-bg-surface-secondary)", borderRadius: "8px", padding: "16px", height: "120px" }}>
                        <Text as="p" variant="headingSm" tone="subdued">{label}</Text>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <div style={{
                    background: "var(--p-color-bg-surface)",
                    border: "1px solid var(--p-color-border)",
                    borderRadius: "8px",
                    padding: "12px 20px",
                  }}>
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Upgrade to unlock analytics
                    </Text>
                  </div>
                </div>
              </div>
            </BlockStack>
          </Box>
        </Card>
      </Page>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <Page
      title="Analytics"
      subtitle="Overview of customer configurations and orders"
    >
      <BlockStack gap="500">
        {/* Summary Stats */}
        <div style={{ display: "flex", gap: "16px" }}>
          {/* Total Configurations */}
          <div style={{ flex: 1 }}>
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm" tone="subdued">
                    Total Configurations
                  </Text>
                  <Icon source={SettingsIcon} tone="base" />
                </InlineStack>
                <Text as="p" variant="headingXl">
                  {stats.totalConfigurations}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  All-time customer sessions
                </Text>
              </BlockStack>
            </Card>
          </div>

          {/* Orders */}
          <div style={{ flex: 1 }}>
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm" tone="subdued">
                    Orders
                  </Text>
                  <Icon source={ProductIcon} tone="success" />
                </InlineStack>
                <Text as="p" variant="headingXl">
                  {stats.orderedConfigurations}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Configurations added to cart
                </Text>
              </BlockStack>
            </Card>
          </div>

          {/* Conversion Rate */}
          <div style={{ flex: 1 }}>
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm" tone="subdued">
                    Conversion Rate
                  </Text>
                  <Icon source={ViewIcon} tone="info" />
                </InlineStack>
                <Text as="p" variant="headingXl">
                  {stats.conversionRate}%
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Configured → ordered
                </Text>
              </BlockStack>
            </Card>
          </div>

          {/* Revenue */}
          <div style={{ flex: 1 }}>
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm" tone="subdued">
                    Revenue
                  </Text>
                  <Icon source={ProductIcon} tone="success" />
                </InlineStack>
                <Text as="p" variant="headingXl">
                  {formatCurrency(stats.totalRevenue)}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  From ordered configurations
                </Text>
              </BlockStack>
            </Card>
          </div>
        </div>

        <Layout>
          {/* Top Colors */}
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Top Colors
                </Text>
                <Divider />
                {topColors.length === 0 ? (
                  <Text as="p" tone="subdued">
                    No color data yet.
                  </Text>
                ) : (
                  <BlockStack gap="300">
                    {topColors.map((color, i) => (
                      <InlineStack key={i} align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              background: color.hex ?? "#ccc",
                              border: "1px solid var(--p-color-border)",
                              flexShrink: 0,
                            }}
                          />
                          <Text as="span" variant="bodyMd">
                            {color.name ?? "Unknown"}
                          </Text>
                        </InlineStack>
                        <Badge>{String(color.count)} times</Badge>
                      </InlineStack>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Top Materials */}
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Top Materials
                </Text>
                <Divider />
                {topMaterials.length === 0 ? (
                  <Text as="p" tone="subdued">
                    No material data yet.
                  </Text>
                ) : (
                  <BlockStack gap="300">
                    {topMaterials.map((material, i) => (
                      <InlineStack key={i} align="space-between" blockAlign="center">
                        <Text as="span" variant="bodyMd">
                          {material.name ?? "Unknown"}
                        </Text>
                        <Badge>{String(material.count)} times</Badge>
                      </InlineStack>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Per-Product Breakdown */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Per-Product Breakdown
                </Text>
                <Divider />
                {productStats.length === 0 ? (
                  <Box padding="400">
                    <BlockStack gap="200" inlineAlign="center">
                      <Text as="p" tone="subdued">
                        No products configured yet.
                      </Text>
                      <Button onClick={() => navigate("/app/products/new")}>
                        Add your first product
                      </Button>
                    </BlockStack>
                  </Box>
                ) : (
                  <>
                    {/* Table header */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                        gap: "8px",
                        padding: "0 0 8px 0",
                        borderBottom: "1px solid var(--p-color-border)",
                      }}
                    >
                      <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">
                        Product
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">
                        Configurations
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">
                        Orders
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">
                        Revenue
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">
                        Status
                      </Text>
                    </div>
                    {productStats.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                          gap: "8px",
                          alignItems: "center",
                          padding: "4px 0",
                        }}
                      >
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="span" variant="bodyMd" fontWeight="semibold">
                            {p.name}
                          </Text>
                          {p.tryOnEnabled && (
                            <Badge tone="info">AR</Badge>
                          )}
                        </InlineStack>
                        <Text as="span" variant="bodyMd">
                          {p.totalConfigs}
                        </Text>
                        <Text as="span" variant="bodyMd">
                          {p.orderedConfigs}
                        </Text>
                        <Text as="span" variant="bodyMd">
                          {formatCurrency(p.revenue)}
                        </Text>
                        <Badge tone={p.isActive ? "success" : "critical"}>
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Recent Orders */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Recent Orders
                </Text>
                <Divider />
                {recentOrders.length === 0 ? (
                  <Text as="p" tone="subdued">
                    No orders yet. Orders appear here when customers add a configured product to their cart.
                  </Text>
                ) : (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr",
                        gap: "8px",
                        padding: "0 0 8px 0",
                        borderBottom: "1px solid var(--p-color-border)",
                      }}
                    >
                      <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">
                        Product
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">
                        Color
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">
                        Material
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">
                        Price
                      </Text>
                    </div>
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 1fr 1fr",
                          gap: "8px",
                          alignItems: "center",
                          padding: "4px 0",
                        }}
                      >
                        <BlockStack gap="050">
                          <Text as="span" variant="bodyMd" fontWeight="semibold">
                            {order.productName}
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {formatDate(order.orderedAt)}
                          </Text>
                        </BlockStack>
                        <InlineStack gap="200" blockAlign="center">
                          {order.colorName && (
                            <>
                              <div
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "50%",
                                  background: "#ccc",
                                  border: "1px solid var(--p-color-border)",
                                  flexShrink: 0,
                                }}
                              />
                              <Text as="span" variant="bodySm">
                                {order.colorName}
                              </Text>
                            </>
                          )}
                          {!order.colorName && (
                            <Text as="span" variant="bodySm" tone="subdued">—</Text>
                          )}
                        </InlineStack>
                        <Text as="span" variant="bodySm">
                          {order.materialName ?? "—"}
                        </Text>
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {formatCurrency(order.totalPrice)}
                        </Text>
                      </div>
                    ))}
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
