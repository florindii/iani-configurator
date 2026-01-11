import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR Compliance Webhook Handler
 *
 * Handles three mandatory webhooks for Shopify App Store compliance:
 * 1. customers/data_request - Customer requests their data
 * 2. customers/redact - Customer requests deletion of their data
 * 3. shop/redact - Shop uninstalls and requests all data deletion
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`[GDPR] Received ${topic} webhook for shop: ${shop}`);

    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST": {
        // Customer requested their data
        // Find all configurations associated with this customer
        const customerId = payload?.customer?.id;
        const customerEmail = payload?.customer?.email;

        if (!customerId && !customerEmail) {
          console.log("[GDPR] No customer identifier provided");
          return json({ success: true, message: "No customer data found" });
        }

        // Query for customer configurations
        const customerConfigs = await db.productConfiguration.findMany({
          where: {
            OR: [
              customerEmail ? { customerEmail } : {},
              customerId ? { shopifyCustomerId: String(customerId) } : {},
            ].filter(condition => Object.keys(condition).length > 0),
          },
          include: {
            product3D: {
              select: {
                shopifyProductId: true,
                shop: true,
              },
            },
          },
        });

        console.log(
          `[GDPR] Data request for customer ${customerId || customerEmail}: found ${customerConfigs.length} configurations`
        );

        // In production, you would:
        // 1. Generate a data export file
        // 2. Email it to the customer or merchant
        // 3. Store it securely for retrieval

        // For now, we log the data (replace with actual export logic)
        if (customerConfigs.length > 0) {
          console.log("[GDPR] Customer data:", JSON.stringify(customerConfigs, null, 2));
        }

        return json({
          success: true,
          message: `Found ${customerConfigs.length} configurations for customer`
        });
      }

      case "CUSTOMERS_REDACT": {
        // Customer requested deletion of their data
        const customerId = payload?.customer?.id;
        const customerEmail = payload?.customer?.email;

        if (!customerId && !customerEmail) {
          console.log("[GDPR] No customer identifier provided for redaction");
          return json({ success: true, message: "No customer data to redact" });
        }

        // Delete customer configurations
        const deleteResult = await db.productConfiguration.deleteMany({
          where: {
            OR: [
              customerEmail ? { customerEmail } : {},
              customerId ? { shopifyCustomerId: String(customerId) } : {},
            ].filter(condition => Object.keys(condition).length > 0),
          },
        });

        console.log(
          `[GDPR] Deleted ${deleteResult.count} configurations for customer ${customerId || customerEmail}`
        );

        return json({
          success: true,
          message: `Deleted ${deleteResult.count} customer configurations`
        });
      }

      case "SHOP_REDACT": {
        // Shop uninstalled and requested data deletion
        // Delete ALL data associated with this shop

        console.log(`[GDPR] Shop redact requested for: ${shop}`);

        // Delete in order to respect foreign key constraints
        // 1. First delete configurations (they reference products)
        const configsDeleted = await db.productConfiguration.deleteMany({
          where: {
            product3D: {
              shop: shop,
            },
          },
        });

        // 2. Delete customization options (they reference products)
        const optionsDeleted = await db.customizationOption.deleteMany({
          where: {
            product3D: {
              shop: shop,
            },
          },
        });

        // 3. Delete 3D products
        const productsDeleted = await db.product3D.deleteMany({
          where: { shop },
        });

        // 4. Delete sessions
        const sessionsDeleted = await db.session.deleteMany({
          where: { shop },
        });

        console.log(`[GDPR] Shop redact complete for ${shop}:`, {
          configurations: configsDeleted.count,
          customizationOptions: optionsDeleted.count,
          products: productsDeleted.count,
          sessions: sessionsDeleted.count,
        });

        return json({
          success: true,
          message: `Deleted all data for shop ${shop}`,
          deleted: {
            configurations: configsDeleted.count,
            customizationOptions: optionsDeleted.count,
            products: productsDeleted.count,
            sessions: sessionsDeleted.count,
          }
        });
      }

      default:
        console.log(`[GDPR] Unknown webhook topic: ${topic}`);
        return json({ success: false, message: `Unknown topic: ${topic}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[GDPR] Webhook error:", error);

    // Return 200 even on error to prevent Shopify from retrying
    // Log the error for investigation
    return json({
      success: false,
      message: "Internal error processing webhook"
    });
  }
}

// GET handler for health check / verification
export async function loader() {
  return json({
    status: "ok",
    endpoint: "GDPR Compliance Webhooks",
    supported: [
      "customers/data_request",
      "customers/redact",
      "shop/redact"
    ]
  });
}
