import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useNavigation } from "@remix-run/react";
import { useState } from "react";
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
  CheckIcon,
  ChartVerticalFilledIcon,
  StarFilledIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { getShopSubscription, PLANS, type PlanType } from "../billing.server";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateString).toLocaleDateString();
}

function daysUntil(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const days = Math.ceil((then - now) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const subscription = await getShopSubscription(shop);
  const planDetails = PLANS[subscription.plan as PlanType] || PLANS.free;

  const activeProducts = await db.product3D.count({ where: { shop, isActive: true } });
  const totalConfigurations = await db.productConfiguration.count({ where: { shop } });

  // Recent activity stats
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentConfigCount = await db.productConfiguration.count({
    where: { shop, createdAt: { gte: sevenDaysAgo } },
  });
  const prevWeekConfigCount = await db.productConfiguration.count({
    where: { shop, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
  });

  // Week-over-week change
  let weekOverWeekChange: number | null = null;
  if (prevWeekConfigCount > 0) {
    weekOverWeekChange = Math.round(
      ((recentConfigCount - prevWeekConfigCount) / prevWeekConfigCount) * 100
    );
  }

  // Recent configurations for activity feed
  const recentConfigs = await db.productConfiguration.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { product3D: { select: { name: true } } },
  });

  // Onboarding state
  const hasProduct = (await db.product3D.count({ where: { shop } })) > 0;
  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  const hasAddedAppBlock = shopRecord?.hasAddedAppBlock ?? false;
  const hasPreviewedStore = shopRecord?.hasPreviewedStore ?? false;
  const stepsCompleted = [hasProduct, hasAddedAppBlock, hasPreviewedStore].filter(Boolean).length;
  const onboardingDone = stepsCompleted === 3;

  const storeName = shop.replace(".myshopify.com", "");
  const configuratorUrl = `${process.env.SHOPIFY_APP_URL ?? ""}`;

  return json({
    shop,
    storeName,
    configuratorUrl,
    stats: {
      activeProducts,
      totalConfigurations,
      recentConfigCount,
      weekOverWeekChange,
    },
    subscription: {
      plan: subscription.plan,
      planName: planDetails.name,
      price: planDetails.price,
      isTrialing: subscription.isTrialing,
      trialEndsAt: subscription.trialEndsAt,
      productLimit: planDetails.productLimit,
      features: planDetails.features,
    },
    onboarding: {
      hasProduct,
      hasAddedAppBlock,
      hasPreviewedStore,
      stepsCompleted,
      onboardingDone,
    },
    recentConfigs: recentConfigs.map((c) => ({
      id: c.id,
      productName: c.product3D.name,
      colorName: c.colorName,
      colorHex: c.colorHex,
      materialName: c.materialName,
      totalPrice: c.totalPrice,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
  });
};

// ─── Action ──────────────────────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const base = {
    plan: "free",
    subscriptionStatus: "none" as const,
    productLimit: 1,
  };

  if (intent === "mark-app-block") {
    await db.shop.upsert({
      where: { shopDomain: shop },
      update: { hasAddedAppBlock: true },
      create: { shopDomain: shop, ...base, hasAddedAppBlock: true },
    });
  } else if (intent === "mark-previewed") {
    await db.shop.upsert({
      where: { shopDomain: shop },
      update: { hasPreviewedStore: true },
      create: { shopDomain: shop, ...base, hasPreviewedStore: true },
    });
  }

  return json({ ok: true });
};

// ─── Feature Card Component ─────────────────────────────────────────────────

function FeatureCard({
  title,
  description,
  unlocked,
  requiredPlan,
  requiredPrice,
  onUpgrade,
}: {
  title: string;
  description: string;
  unlocked: boolean;
  requiredPlan?: string;
  requiredPrice?: number;
  onUpgrade?: () => void;
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingSm">
            {title}
          </Text>
          <Badge tone={unlocked ? "success" : "attention"}>
            {unlocked ? "Active" : requiredPlan ?? "Locked"}
          </Badge>
        </InlineStack>
        <Text as="p" variant="bodySm" tone="subdued">
          {description}
        </Text>
        {!unlocked && requiredPlan && (
          <div
            style={{
              background: "var(--p-color-bg-surface-secondary)",
              borderRadius: "8px",
              padding: "10px 14px",
            }}
          >
            <InlineStack align="space-between" blockAlign="center">
              <Text as="span" variant="bodySm">
                Available on {requiredPlan}
                {requiredPrice ? ` ($${requiredPrice}/mo)` : ""}
              </Text>
              {onUpgrade && (
                <Button size="slim" onClick={onUpgrade}>
                  Upgrade
                </Button>
              )}
            </InlineStack>
          </div>
        )}
      </BlockStack>
    </Card>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function Index() {
  const { storeName, configuratorUrl, stats, subscription, onboarding, recentConfigs } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [copied, setCopied] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  const markAppBlock = () => {
    submit({ intent: "mark-app-block" }, { method: "post" });
  };

  const openPreview = () => {
    submit({ intent: "mark-previewed" }, { method: "post" });
    navigate("/app/configurator");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(configuratorUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Dynamic greeting
  const getGreeting = () => {
    if (stats.activeProducts === 0) {
      return {
        title: `Welcome to Iani 3D, ${storeName}!`,
        subtitle: "Set up your first 3D product in minutes and give customers an immersive shopping experience.",
      };
    }
    if (stats.totalConfigurations > 20) {
      return {
        title: `Welcome back, ${storeName}!`,
        subtitle: `${stats.totalConfigurations} configurations and counting. Your customers love it.`,
      };
    }
    return {
      title: `Welcome back, ${storeName}!`,
      subtitle: "Here's how your 3D configurator is performing.",
    };
  };

  const greeting = getGreeting();

  const atProductLimit =
    subscription.productLimit !== -1 && stats.activeProducts >= subscription.productLimit;

  const productLimitLabel =
    subscription.productLimit === -1 ? "Unlimited" : `of ${subscription.productLimit} available`;

  const productUsagePercent =
    subscription.productLimit > 0
      ? Math.round((stats.activeProducts / subscription.productLimit) * 100)
      : 0;

  // Onboarding banner content
  const showOnboarding = !onboarding.onboardingDone && !onboardingDismissed;

  return (
    <Page>
      <TitleBar title="Iani 3D Configurator" />
      <BlockStack gap="600">

        {/* ── Hero Header ───────────────────────────────────────────────── */}
        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text as="h1" variant="headingXl">
              {greeting.title}
            </Text>
            <Text as="p" variant="bodyLg" tone="subdued">
              {greeting.subtitle}
            </Text>
          </BlockStack>
          <InlineStack gap="300">
            <Button
              variant="primary"
              onClick={() => navigate("/app/products/new")}
              disabled={atProductLimit}
            >
              {atProductLimit ? "Upgrade to add more" : "Add 3D Product"}
            </Button>
            <Button onClick={openPreview}>Open Live Preview</Button>
          </InlineStack>
        </BlockStack>

        {/* ── Slim Onboarding Banner ────────────────────────────────────── */}
        {/* {showOnboarding && (
          <Banner
            title={`Setup progress: ${onboarding.stepsCompleted} of 3 steps complete`}
            tone="info"
            onDismiss={() => setOnboardingDismissed(true)}
          >
            <BlockStack gap="200">
              <InlineStack gap="300" wrap>
                <Text as="span" variant="bodySm">
                  {onboarding.hasProduct ? (
                    <s>1. Add a 3D product</s>
                  ) : (
                    <Button variant="plain" onClick={() => navigate("/app/products/new")}>
                      1. Add a 3D product
                    </Button>
                  )}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  {" > "}
                </Text>
                <Text as="span" variant="bodySm">
                  {onboarding.hasAddedAppBlock ? (
                    <s>2. Add the app block</s>
                  ) : (
                    <Button variant="plain" onClick={markAppBlock} loading={isSubmitting}>
                      2. Mark app block as done
                    </Button>
                  )}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  {" > "}
                </Text>
                <Text as="span" variant="bodySm">
                  {onboarding.hasPreviewedStore ? (
                    <s>3. Preview your store</s>
                  ) : (
                    <Button variant="plain" onClick={openPreview}>
                      3. Preview your store
                    </Button>
                  )}
                </Text>
              </InlineStack>
            </BlockStack>
          </Banner>
        )} */}

        {/* ── Trial Warning ─────────────────────────────────────────────── */}
        {subscription.isTrialing && subscription.trialEndsAt && (
          <Banner
            tone="warning"
            title={`Your ${subscription.planName} trial ends ${daysUntil(subscription.trialEndsAt)}`}
            action={{
              content: "Choose a plan",
              onAction: () => navigate("/app/billing"),
            }}
          >
            <p>After the trial you'll be charged automatically. Cancel anytime before then.</p>
          </Banner>
        )}

        {/* ── Stats Dashboard (4 columns) ───────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Active Products */}
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="bodySm" tone="subdued">
                  Active Products
                </Text>
                <Icon source={ProductIcon} tone="base" />
              </InlineStack>
              <Text as="p" variant="heading2xl">
                {stats.activeProducts}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {productLimitLabel}
              </Text>
              {subscription.productLimit > 0 && (
                <ProgressBar
                  progress={productUsagePercent}
                  size="small"
                  tone={productUsagePercent >= 100 ? "critical" : "primary"}
                />
              )}
            </BlockStack>
          </Card>

          {/* Total Configurations */}
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="bodySm" tone="subdued">
                  Total Configurations
                </Text>
                <Icon source={ViewIcon} tone="info" />
              </InlineStack>
              <Text as="p" variant="heading2xl">
                {stats.totalConfigurations}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Customer sessions
              </Text>
            </BlockStack>
          </Card>

          {/* This Week */}
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="bodySm" tone="subdued">
                  This Week
                </Text>
                <Icon source={ChartVerticalFilledIcon} tone="base" />
              </InlineStack>
              <InlineStack gap="200" blockAlign="center">
                <Text as="p" variant="heading2xl">
                  {stats.recentConfigCount}
                </Text>
                {stats.weekOverWeekChange !== null && (
                  <Badge tone={stats.weekOverWeekChange >= 0 ? "success" : "warning"}>
                    {stats.weekOverWeekChange >= 0 ? "+" : ""}
                    {String(stats.weekOverWeekChange)}%
                  </Badge>
                )}
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                Last 7 days
              </Text>
            </BlockStack>
          </Card>

          {/* Current Plan */}
          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="bodySm" tone="subdued">
                  Current Plan
                </Text>
                <Icon source={StarFilledIcon} tone="base" />
              </InlineStack>
              <InlineStack gap="200" blockAlign="center">
                <Text as="p" variant="heading2xl">
                  {subscription.planName}
                </Text>
                {subscription.isTrialing && <Badge tone="warning">Trial</Badge>}
              </InlineStack>
              <InlineStack align="space-between" blockAlign="center">
                <Text as="p" variant="bodySm" tone="subdued">
                  {subscription.price > 0 ? `$${subscription.price}/mo` : "Free forever"}
                </Text>
                <Button
                  variant="plain"
                  size="slim"
                  onClick={() => navigate("/app/billing")}
                >
                  {subscription.plan === "free" ? "Upgrade" : "Manage"}
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </div>

        {/* ── Feature Status Grid ───────────────────────────────────────── */}
        <BlockStack gap="400">
          <Text as="h2" variant="headingLg">
            Your Features
          </Text>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            <FeatureCard
              title="3D Product Viewer"
              description="Customers rotate, zoom, and explore your products in interactive 3D."
              unlocked={true}
            />
            <FeatureCard
              title="Color & Material Customization"
              description="Real-time color and material selection with per-part customization."
              unlocked={true}
            />
            <FeatureCard
              title="Virtual Try-On (Face AR)"
              description="Let customers try on glasses and accessories using their camera."
              unlocked={subscription.features.tryOnEnabled}
              requiredPlan="Pro"
              requiredPrice={49}
              onUpgrade={() => navigate("/app/billing")}
            />
            <FeatureCard
              title="View in Space AR"
              description="Customers place furniture and decor in their room using augmented reality."
              unlocked={subscription.features.spaceArEnabled}
              requiredPlan="Business"
              requiredPrice={99}
              onUpgrade={() => navigate("/app/billing")}
            />
            <FeatureCard
              title="Watermark-Free"
              description="Remove the Iani watermark for a clean, branded experience."
              unlocked={!subscription.features.watermark}
              requiredPlan="Starter"
              requiredPrice={19}
              onUpgrade={() => navigate("/app/billing")}
            />
            <FeatureCard
              title="Priority Support"
              description="Get faster responses and dedicated assistance from our team."
              unlocked={subscription.features.prioritySupport}
              requiredPlan="Business"
              requiredPrice={99}
              onUpgrade={() => navigate("/app/billing")}
            />
          </div>
        </BlockStack>

        {/* ── Recent Customer Activity ──────────────────────────────────── */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingLg">
                    Recent Configurations
                  </Text>
                  {recentConfigs.length > 0 && (
                    <Button variant="plain" onClick={() => navigate("/app/products")}>
                      View all products
                    </Button>
                  )}
                </InlineStack>

                {recentConfigs.length === 0 ? (
                  <Box padding="800">
                    <BlockStack gap="200" inlineAlign="center">
                      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                        No configurations yet
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        Customer activity will appear here once your configurator is live.
                        Share your store link to get started!
                      </Text>
                    </BlockStack>
                  </Box>
                ) : (
                  <BlockStack gap="0">
                    {recentConfigs.map((config, index) => (
                      <div key={config.id}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 0",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {/* Color swatch */}
                            <div
                              style={{
                                width: "14px",
                                height: "14px",
                                borderRadius: "50%",
                                backgroundColor: config.colorHex || "#ccc",
                                border: "1px solid var(--p-color-border-subdued)",
                                flexShrink: 0,
                              }}
                            />
                            <BlockStack gap="050">
                              <Text as="span" variant="bodyMd" fontWeight="semibold">
                                {config.productName}
                              </Text>
                              <Text as="span" variant="bodySm" tone="subdued">
                                {[config.colorName, config.materialName]
                                  .filter(Boolean)
                                  .join(" · ") || "Default configuration"}
                              </Text>
                            </BlockStack>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <Text as="span" variant="bodySm">
                              ${config.totalPrice.toFixed(2)}
                            </Text>
                            <Badge
                              tone={
                                config.status === "ordered"
                                  ? "success"
                                  : config.status === "saved"
                                  ? "info"
                                  : undefined
                              }
                            >
                              {config.status.charAt(0).toUpperCase() + config.status.slice(1)}
                            </Badge>
                            <Text as="span" variant="bodySm" tone="subdued">
                              {timeAgo(config.createdAt)}
                            </Text>
                          </div>
                        </div>
                        {index < recentConfigs.length - 1 && <Divider />}
                      </div>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ── Live Preview Card (slim) ─────────────────────────────────── */}
          <Layout.Section>
            <Card>
              <InlineStack align="space-between" blockAlign="center" wrap>
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Live Preview
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    See the 3D configurator on your store or share it with your team.
                  </Text>
                </BlockStack>
                <InlineStack gap="200">
                  <Button onClick={openPreview}>Open Preview</Button>
                  <Button variant="plain" onClick={copyLink}>
                    {copied ? "Link copied!" : "Copy Link"}
                  </Button>
                </InlineStack>
              </InlineStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
