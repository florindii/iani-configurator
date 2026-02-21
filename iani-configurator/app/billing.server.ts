import { db } from "./db.server";

// Plan definitions with features and limits
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    productLimit: 1,
    features: {
      tryOnEnabled: false,
      spaceArEnabled: false,
      watermark: true,
      analytics: false,
      prioritySupport: false,
    },
  },
  starter: {
    name: "Starter",
    price: 19,
    productLimit: 3,
    features: {
      tryOnEnabled: false,
      spaceArEnabled: false,
      watermark: true,
      analytics: false,
      prioritySupport: false,
    },
  },
  pro: {
    name: "Pro",
    price: 49,
    productLimit: -1, // unlimited
    features: {
      tryOnEnabled: true,
      spaceArEnabled: false,
      watermark: false,
      analytics: false,
      prioritySupport: false,
    },
  },
  business: {
    name: "Business",
    price: 99,
    productLimit: -1, // unlimited
    features: {
      tryOnEnabled: true,
      spaceArEnabled: true,
      watermark: false,
      analytics: true,
      prioritySupport: true,
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;

// Get or create shop record
export async function getOrCreateShop(shopDomain: string) {
  let shop = await db.shop.findUnique({
    where: { shopDomain },
  });

  if (!shop) {
    shop = await db.shop.create({
      data: {
        shopDomain,
        plan: "free",
        subscriptionStatus: "none",
        productLimit: PLANS.free.productLimit,
      },
    });
  }

  return shop;
}

// Get shop subscription status
export async function getShopSubscription(shopDomain: string) {
  const shop = await getOrCreateShop(shopDomain);
  const plan = PLANS[shop.plan as PlanType] || PLANS.free;

  return {
    ...shop,
    planDetails: plan,
    isActive: shop.subscriptionStatus === "active" || shop.plan === "free",
    isTrialing: shop.trialEndsAt ? new Date(shop.trialEndsAt) > new Date() : false,
  };
}

// Update shop subscription after Shopify billing confirmation
export async function updateShopSubscription(
  shopDomain: string,
  plan: PlanType,
  subscriptionId: string,
  trialDays: number = 14
) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  const currentPeriodEnd = new Date();
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

  return await db.shop.upsert({
    where: { shopDomain },
    update: {
      plan,
      subscriptionId,
      subscriptionStatus: "active",
      trialEndsAt,
      currentPeriodEnd,
      productLimit: PLANS[plan].productLimit,
    },
    create: {
      shopDomain,
      plan,
      subscriptionId,
      subscriptionStatus: "active",
      trialEndsAt,
      currentPeriodEnd,
      productLimit: PLANS[plan].productLimit,
    },
  });
}

// Cancel subscription
export async function cancelShopSubscription(shopDomain: string) {
  return await db.shop.update({
    where: { shopDomain },
    data: {
      plan: "free",
      subscriptionId: null,
      subscriptionStatus: "cancelled",
      productLimit: PLANS.free.productLimit,
    },
  });
}

// Check if shop can add more products
export async function canAddProduct(shopDomain: string): Promise<boolean> {
  const shop = await getOrCreateShop(shopDomain);
  const plan = PLANS[shop.plan as PlanType] || PLANS.free;

  if (plan.productLimit === -1) return true; // unlimited

  const productCount = await db.product3D.count({
    where: { shop: shopDomain },
  });

  return productCount < plan.productLimit;
}

// Check if shop has access to a specific feature
export async function hasFeatureAccess(
  shopDomain: string,
  feature: keyof typeof PLANS.free.features
): Promise<boolean> {
  const shop = await getOrCreateShop(shopDomain);
  const plan = PLANS[shop.plan as PlanType] || PLANS.free;

  // Check if subscription is active (or free plan)
  if (shop.plan !== "free" && shop.subscriptionStatus !== "active") {
    return false;
  }

  return plan.features[feature];
}

// Create billing subscription URL using Shopify GraphQL
export async function createBillingSubscription(
  admin: any,
  plan: PlanType,
  returnUrl: string
) {
  const planDetails = PLANS[plan];

  if (plan === "free") {
    throw new Error("Cannot create subscription for free plan");
  }

  const response = await admin.graphql(`
    mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        trialDays: $trialDays
        lineItems: $lineItems
        test: ${process.env.NODE_ENV !== "production"}
      ) {
        appSubscription {
          id
          status
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      name: `Iani 3D Configurator - ${planDetails.name}`,
      returnUrl,
      trialDays: 14,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: planDetails.price, currencyCode: "USD" },
              interval: "EVERY_30_DAYS"
            }
          }
        }
      ]
    }
  });

  const result = await response.json();

  if (result.data?.appSubscriptionCreate?.userErrors?.length > 0) {
    throw new Error(result.data.appSubscriptionCreate.userErrors[0].message);
  }

  return {
    subscriptionId: result.data?.appSubscriptionCreate?.appSubscription?.id,
    confirmationUrl: result.data?.appSubscriptionCreate?.confirmationUrl,
  };
}

// Get current subscription from Shopify
export async function getCurrentSubscription(admin: any) {
  const response = await admin.graphql(`
    query {
      currentAppInstallation {
        activeSubscriptions {
          id
          name
          status
          currentPeriodEnd
          trialDays
          test
          lineItems {
            plan {
              pricingDetails {
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                  interval
                }
              }
            }
          }
        }
      }
    }
  `);

  const result = await response.json();
  const subscriptions = result.data?.currentAppInstallation?.activeSubscriptions || [];

  return subscriptions.length > 0 ? subscriptions[0] : null;
}

// Cancel subscription in Shopify
export async function cancelBillingSubscription(admin: any, subscriptionId: string) {
  const response = await admin.graphql(`
    mutation appSubscriptionCancel($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: { id: subscriptionId }
  });

  const result = await response.json();

  if (result.data?.appSubscriptionCancel?.userErrors?.length > 0) {
    throw new Error(result.data.appSubscriptionCancel.userErrors[0].message);
  }

  return result.data?.appSubscriptionCancel?.appSubscription;
}
