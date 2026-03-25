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
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { getShopSubscription, PLANS, type PlanType } from "../billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const subscription = await getShopSubscription(shop);
  const planDetails = PLANS[subscription.plan as PlanType] || PLANS.free;

  const activeProducts = await db.product3D.count({ where: { shop, isActive: true } });
  const totalConfigurations = await db.productConfiguration.count({ where: { shop } });

  // Onboarding: step 1 is auto-derived from having at least one product
  const hasProduct = (await db.product3D.count({ where: { shop } })) > 0;
  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  const hasAddedAppBlock = shopRecord?.hasAddedAppBlock ?? false;
  const hasPreviewedStore = shopRecord?.hasPreviewedStore ?? false;

  const stepsCompleted = [hasProduct, hasAddedAppBlock, hasPreviewedStore].filter(Boolean).length;
  const totalSteps = 3;
  const onboardingDone = stepsCompleted === totalSteps;

  // Store name from domain e.g. "mystore.myshopify.com" → "mystore"
  const storeName = shop.replace(".myshopify.com", "");

  const configuratorUrl = `${process.env.SHOPIFY_APP_URL ?? ""}`;

  return json({
    shop,
    storeName,
    configuratorUrl,
    stats: {
      activeProducts,
      totalConfigurations,
    },
    subscription: {
      plan: subscription.plan,
      planName: planDetails.name,
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
      totalSteps,
      onboardingDone,
    },
  });
};

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

// ─── Checklist step component ─────────────────────────────────────────────────

type StepState = "done" | "active" | "pending";

function ChecklistStep({
  state,
  title,
  description,
  actionLabel,
  onAction,
  loading,
}: {
  state: StepState;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  const borderColor =
    state === "done"
      ? "var(--p-color-border-success)"
      : state === "active"
      ? "var(--p-color-border-focus)"
      : "var(--p-color-border-subdued)";

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        padding: "12px 0",
        borderLeft: `3px solid ${borderColor}`,
        paddingLeft: "16px",
      }}
    >
      {/* Icon column */}
      <div style={{ paddingTop: "2px", flexShrink: 0 }}>
        {state === "done" ? (
          <Icon source={CheckIcon} tone="success" />
        ) : state === "active" ? (
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "var(--p-color-bg-fill-info)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        ) : (
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              border: "2px solid var(--p-color-border-subdued)",
            }}
          />
        )}
      </div>

      {/* Text + action column */}
      <div style={{ flex: 1 }}>
        <BlockStack gap="050">
          <Text
            as="span"
            variant="bodyMd"
            fontWeight={state === "active" ? "semibold" : "regular"}
            tone={state === "pending" ? "subdued" : undefined}
          >
            {state === "done" ? <s>{title}</s> : title}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            {description}
          </Text>
        </BlockStack>
      </div>

      {/* Action column */}
      {actionLabel && onAction && state !== "done" && (
        <div style={{ flexShrink: 0 }}>
          <Button
            variant={state === "active" ? "primary" : "secondary"}
            size="slim"
            disabled={state === "pending"}
            loading={loading}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      )}

      {state === "done" && (
        <div style={{ flexShrink: 0 }}>
          <Text as="span" variant="bodySm" tone="success">
            Done
          </Text>
        </div>
      )}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function Index() {
  const { storeName, configuratorUrl, stats, subscription, onboarding } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [copied, setCopied] = useState(false);

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

  // Derive step states
  const getStepState = (
    thisStepDone: boolean,
    previousStepsDone: boolean
  ): StepState => {
    if (thisStepDone) return "done";
    if (previousStepsDone) return "active";
    return "pending";
  };

  const step1State = getStepState(onboarding.hasProduct, true);
  const step2State = getStepState(onboarding.hasAddedAppBlock, onboarding.hasProduct);
  const step3State = getStepState(
    onboarding.hasPreviewedStore,
    onboarding.hasProduct && onboarding.hasAddedAppBlock
  );

  const progressPercent = Math.round(
    (onboarding.stepsCompleted / onboarding.totalSteps) * 100
  );

  // Contextual upsell banner
  const showTryOnUpsell =
    !subscription.features.tryOnEnabled &&
    (subscription.plan === "free" || subscription.plan === "starter");

  const showSpaceArUpsell = subscription.plan === "pro";

  return (
    <Page>
      <TitleBar title="Iani 3D Configurator" />
      <BlockStack gap="500">

        {/* ── Greeting ───────────────────────────────────────────────────── */}
        <BlockStack gap="100">
          <Text as="h1" variant="headingXl">
            Welcome back, {storeName}!
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Here's how to get the most from Iani 3D Configurator.
          </Text>
        </BlockStack>

        {/* ── Quick Stats Strip ──────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ flex: 1 }}>
            <Card>
              <BlockStack gap="100">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm" tone="subdued">
                    Active Products
                  </Text>
                  <Icon source={ProductIcon} tone="base" />
                </InlineStack>
                <Text as="p" variant="headingXl">
                  {stats.activeProducts}
                </Text>
              </BlockStack>
            </Card>
          </div>

          <div style={{ flex: 1 }}>
            <Card>
              <BlockStack gap="100">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm" tone="subdued">
                    Configurator Sessions
                  </Text>
                  <Icon source={ViewIcon} tone="info" />
                </InlineStack>
                <Text as="p" variant="headingXl">
                  {stats.totalConfigurations}
                </Text>
              </BlockStack>
            </Card>
          </div>

          <div style={{ flex: 1 }}>
            <Card>
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Current Plan
                </Text>
                <InlineStack gap="200" blockAlign="center">
                  <Text as="p" variant="headingXl">
                    {subscription.planName}
                  </Text>
                  {subscription.isTrialing && (
                    <Badge tone="warning">Trial</Badge>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>
          </div>
        </div>

        {/* ── Plan Upsell Banner (contextual) ───────────────────────────── */}
        {showTryOnUpsell && (
          <Banner
            title="Unlock Virtual Try-On with Face AR"
            tone="info"
            action={{
              content: "Upgrade to Pro — $49/mo",
              onAction: () => navigate("/app/billing"),
            }}
          >
            <p>
              Let customers try on glasses and accessories directly in their browser using their camera. Upgrade to Pro to enable it.
            </p>
          </Banner>
        )}

        {showSpaceArUpsell && (
          <Banner
            title="Unlock View in Space AR and Priority Support"
            tone="info"
            action={{
              content: "Upgrade to Business — $99/mo",
              onAction: () => navigate("/app/billing"),
            }}
          >
            <p>
              Business adds View in Space AR (furniture/decor room placement via WebXR) and priority support.
            </p>
          </Banner>
        )}

        {subscription.isTrialing && (
          <Banner
            title={`${subscription.planName} trial ends on ${new Date(
              subscription.trialEndsAt!
            ).toLocaleDateString()}`}
            tone="warning"
            action={{
              content: "Manage subscription",
              onAction: () => navigate("/app/billing"),
            }}
          >
            <p>After the trial you'll be charged automatically. Cancel anytime before then.</p>
          </Banner>
        )}

        <Layout>
          {/* ── Onboarding Checklist ─────────────────────────────────────── */}
          {!onboarding.onboardingDone && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Setup Checklist
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {onboarding.stepsCompleted} of {onboarding.totalSteps} steps complete
                      </Text>
                    </InlineStack>
                    <ProgressBar progress={progressPercent} size="small" tone="success" />
                  </BlockStack>

                  <Divider />

                  <BlockStack gap="0">
                    <ChecklistStep
                      state={step1State}
                      title="Add your first 3D product"
                      description="Pick a product from your Shopify catalog and configure colors and materials."
                      actionLabel="Add product"
                      onAction={() => navigate("/app/products/new")}
                    />
                    <ChecklistStep
                      state={step2State}
                      title="Add the App Block to your theme"
                      description="Go to your Shopify theme editor, open a product page template, and add the Iani 3D block."
                      actionLabel="Mark as done"
                      onAction={markAppBlock}
                      loading={isSubmitting}
                    />
                    <ChecklistStep
                      state={step3State}
                      title="Preview on your store"
                      description="See the 3D configurator live and make sure everything looks right."
                      actionLabel="Open preview"
                      onAction={openPreview}
                    />
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {/* ── Setup complete celebration ───────────────────────────────── */}
          {onboarding.onboardingDone && (
            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={CheckIcon} tone="success" />
                    <Text as="h2" variant="headingMd">
                      Your store is all set up!
                    </Text>
                  </InlineStack>
                  <Text as="p" tone="subdued">
                    The 3D configurator is live on your store. Keep adding products or check your analytics to see how customers interact.
                  </Text>
                  <InlineStack gap="300">
                    <Button onClick={() => navigate("/app/products/new")}>
                      Add another product
                    </Button>
                    <Button onClick={() => navigate("/app/products")}>
                      View all products
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {/* ── Hero Preview CTA ─────────────────────────────────────────── */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    See it live on your store
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Open a live preview of the 3D configurator or copy the link to share with your team.
                  </Text>
                </BlockStack>
                <InlineStack gap="300">
                  <Button variant="primary" onClick={openPreview}>
                    Open Live Preview
                  </Button>
                  <Button onClick={copyLink}>
                    {copied ? "Link copied!" : "Copy Link"}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ── Quick Actions ────────────────────────────────────────────── */}
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
                    disabled={
                      subscription.productLimit !== -1 &&
                      stats.activeProducts >= subscription.productLimit
                    }
                  >
                    Add 3D Product
                  </Button>
                  <Button onClick={() => navigate("/app/products")}>
                    View All Products
                  </Button>
                  <Button onClick={() => navigate("/app/billing")}>
                    {subscription.plan === "free" ? "Upgrade Plan" : "Manage Subscription"}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
