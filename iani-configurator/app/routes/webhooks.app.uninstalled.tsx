import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { cancelShopSubscription } from "../billing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  if (import.meta.env.DEV) {
    console.log(`Received ${topic} webhook for ${shop}`);
  }

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    // Cancel subscription and reset to free plan
    try {
      await cancelShopSubscription(shop);
    } catch (error) {
      // Shop record may not exist, that's okay
      if (import.meta.env.DEV) {
        console.log(`No shop record to cancel for ${shop}`);
      }
    }

    // Delete session data
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
