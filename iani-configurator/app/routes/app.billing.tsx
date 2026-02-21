import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Icon,
  Box,
  Divider,
  Banner,
} from "@shopify/polaris";
import { CheckIcon, XIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import {
  PLANS,
  getShopSubscription,
  createBillingSubscription,
  updateShopSubscription,
  type PlanType,
} from "../billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Check if returning from Shopify billing confirmation
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");

  if (chargeId) {
    // User approved the subscription, update our records
    const selectedPlan = url.searchParams.get("plan") as PlanType;
    if (selectedPlan && PLANS[selectedPlan]) {
      await updateShopSubscription(shop, selectedPlan, chargeId);
      return redirect("/app/billing?success=true");
    }
  }

  const subscription = await getShopSubscription(shop);
  const success = url.searchParams.get("success") === "true";

  return json({
    shop,
    subscription,
    plans: PLANS,
    success,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const plan = formData.get("plan") as PlanType;

  if (!plan || !PLANS[plan]) {
    return json({ error: "Invalid plan selected" }, { status: 400 });
  }

  if (plan === "free") {
    // Downgrade to free - handled separately
    return json({ error: "Use the cancel subscription option to downgrade to free" }, { status: 400 });
  }

  try {
    const returnUrl = `${process.env.SHOPIFY_APP_URL}/app/billing?plan=${plan}`;
    const { confirmationUrl } = await createBillingSubscription(admin, plan, returnUrl);

    if (confirmationUrl) {
      return redirect(confirmationUrl);
    }

    return json({ error: "Failed to create subscription" }, { status: 500 });
  } catch (error) {
    console.error("Billing error:", error);
    return json({ error: String(error) }, { status: 500 });
  }
};

export default function BillingPage() {
  const { subscription, plans, success } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  const handleSelectPlan = (plan: PlanType) => {
    if (plan === subscription.plan) return;
    submit({ plan }, { method: "post" });
  };

  const features = [
    { key: "products", label: "3D Products" },
    { key: "tryOnEnabled", label: "Virtual Try-On (Face AR)" },
    { key: "spaceArEnabled", label: "View in Space AR" },
    { key: "watermark", label: "No Watermark", inverted: true },
    { key: "analytics", label: "Analytics Dashboard" },
    { key: "prioritySupport", label: "Priority Support" },
  ];

  const getProductLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : String(limit);
  };

  const hasFeature = (plan: any, featureKey: string): boolean => {
    if (featureKey === "products") return true;
    if (featureKey === "watermark") return !plan.features.watermark;
    return plan.features[featureKey] || false;
  };

  return (
    <Page title="Subscription Plans" subtitle="Choose the plan that's right for your store">
      <Layout>
        {success && (
          <Layout.Section>
            <Banner
              title="Subscription activated!"
              tone="success"
              onDismiss={() => {}}
            >
              <p>Your subscription is now active. Enjoy all the features of your new plan!</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">Current Plan</Text>
                <Badge tone={subscription.plan === "free" ? "info" : "success"}>
                  {plans[subscription.plan as PlanType]?.name || "Free"}
                </Badge>
              </InlineStack>
              {subscription.isTrialing && (
                <Banner tone="info">
                  <p>You're currently on a 14-day free trial. Trial ends on {new Date(subscription.trialEndsAt!).toLocaleDateString()}.</p>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <InlineStack gap="400" align="center" wrap={false}>
            {(Object.keys(plans) as PlanType[]).map((planKey) => {
              const plan = plans[planKey];
              const isCurrentPlan = subscription.plan === planKey;
              const isPopular = planKey === "pro";

              return (
                <Box
                  key={planKey}
                  minWidth="250px"
                  padding="400"
                  borderWidth="025"
                  borderColor={isPopular ? "border-success" : "border"}
                  borderRadius="200"
                  background={isCurrentPlan ? "bg-surface-secondary" : "bg-surface"}
                >
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text variant="headingLg" as="h3">{plan.name}</Text>
                      {isPopular && <Badge tone="success">Popular</Badge>}
                    </InlineStack>

                    <BlockStack gap="100">
                      <InlineStack gap="100" blockAlign="baseline">
                        <Text variant="heading2xl" as="p">${plan.price}</Text>
                        {plan.price > 0 && (
                          <Text variant="bodySm" as="span" tone="subdued">/month</Text>
                        )}
                      </InlineStack>
                      {plan.price > 0 && (
                        <Text variant="bodySm" as="span" tone="subdued">14-day free trial</Text>
                      )}
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="200">
                      <InlineStack gap="200">
                        <Icon source={CheckIcon} tone="success" />
                        <Text as="span">{getProductLimit(plan.productLimit)} products</Text>
                      </InlineStack>

                      {features.slice(1).map((feature) => {
                        const has = hasFeature(plan, feature.key);
                        return (
                          <InlineStack key={feature.key} gap="200">
                            <Icon
                              source={has ? CheckIcon : XIcon}
                              tone={has ? "success" : "subdued"}
                            />
                            <Text as="span" tone={has ? undefined : "subdued"}>
                              {feature.label}
                            </Text>
                          </InlineStack>
                        );
                      })}
                    </BlockStack>

                    <Box paddingBlockStart="400">
                      <Button
                        variant={isCurrentPlan ? "secondary" : isPopular ? "primary" : "secondary"}
                        fullWidth
                        disabled={isCurrentPlan || isLoading}
                        onClick={() => handleSelectPlan(planKey)}
                        loading={isLoading}
                      >
                        {isCurrentPlan ? "Current Plan" : planKey === "free" ? "Downgrade" : "Select Plan"}
                      </Button>
                    </Box>
                  </BlockStack>
                </Box>
              );
            })}
          </InlineStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Need help choosing?</Text>
              <Text as="p" tone="subdued">
                • <strong>Starter ($19/mo)</strong> - Perfect for small stores with up to 3 products. Basic 3D viewer with small watermark.
              </Text>
              <Text as="p" tone="subdued">
                • <strong>Pro ($49/mo)</strong> - Unlimited products with Virtual Try-On for glasses, hats, and jewelry. No watermark. Most popular for eyewear stores.
              </Text>
              <Text as="p" tone="subdued">
                • <strong>Business ($99/mo)</strong> - Everything in Pro plus View in Space AR for furniture, analytics dashboard, and priority support.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
