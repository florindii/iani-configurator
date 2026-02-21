import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { PLANS, type PlanType } from "../billing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  if (import.meta.env.DEV) {
    console.log(`Received ${topic} webhook for ${shop}`);
    console.log("Payload:", JSON.stringify(payload, null, 2));
  }

  try {
    const subscriptionPayload = payload as {
      app_subscription: {
        admin_graphql_api_id: string;
        name: string;
        status: string;
        created_at: string;
        updated_at: string;
        currency: string;
        capped_amount?: string;
      };
    };

    const subscription = subscriptionPayload.app_subscription;
    const status = subscription.status.toLowerCase();

    // Determine the plan from the subscription name
    let plan: PlanType = "free";
    const subscriptionName = subscription.name.toLowerCase();

    if (subscriptionName.includes("business")) {
      plan = "business";
    } else if (subscriptionName.includes("pro")) {
      plan = "pro";
    } else if (subscriptionName.includes("starter")) {
      plan = "starter";
    }

    // Map Shopify status to our status
    let subscriptionStatus: string;
    switch (status) {
      case "active":
        subscriptionStatus = "active";
        break;
      case "cancelled":
      case "declined":
      case "expired":
        subscriptionStatus = "cancelled";
        plan = "free"; // Downgrade to free on cancellation
        break;
      case "frozen":
        subscriptionStatus = "frozen";
        break;
      case "pending":
        subscriptionStatus = "pending";
        break;
      default:
        subscriptionStatus = status;
    }

    // Update shop record
    await db.shop.upsert({
      where: { shopDomain: shop },
      update: {
        plan,
        subscriptionId: subscription.admin_graphql_api_id,
        subscriptionStatus,
        productLimit: PLANS[plan].productLimit,
      },
      create: {
        shopDomain: shop,
        plan,
        subscriptionId: subscription.admin_graphql_api_id,
        subscriptionStatus,
        productLimit: PLANS[plan].productLimit,
      },
    });

    if (import.meta.env.DEV) {
      console.log(`Updated shop ${shop} to plan: ${plan}, status: ${subscriptionStatus}`);
    }
  } catch (error) {
    console.error("Error processing subscription webhook:", error);
    // Still return 200 to prevent Shopify from retrying
  }

  return new Response();
};
