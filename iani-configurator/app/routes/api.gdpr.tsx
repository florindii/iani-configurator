import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR Compliance Webhook Handler
 *
 * Handles three mandatory webhooks for Shopify App Store compliance:
 * 1. customers/data_request - Customer requests their data (must return it)
 * 2. customers/redact - Customer requests deletion of their data
 * 3. shop/redact - Shop uninstalls and requests all data deletion
 */

// Build a Prisma OR filter for customer lookups
function buildCustomerFilter(customerId?: string | number, customerEmail?: string) {
  const conditions: Record<string, string>[] = [];
  if (customerEmail) conditions.push({ customerEmail });
  if (customerId) conditions.push({ shopifyCustomerId: String(customerId) });
  return conditions.length > 0 ? { OR: conditions } : null;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`[GDPR] Received ${topic} webhook for shop: ${shop}`);

    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST": {
        // Customer requested their data — we must return all data we store about them
        const customerId = payload?.customer?.id;
        const customerEmail = payload?.customer?.email;
        const filter = buildCustomerFilter(customerId, customerEmail);

        if (!filter) {
          console.log("[GDPR] No customer identifier provided");
          return json({ success: true, customer: {}, message: "No customer data found" });
        }

        // Find all configurations associated with this customer
        const customerConfigs = await db.productConfiguration.findMany({
          where: filter,
          include: {
            product3D: {
              select: {
                shopifyProductId: true,
                name: true,
                shop: true,
              },
            },
          },
        });

        // Find any preview images for these configurations
        const configIds = customerConfigs.map((c) => c.id);
        const previews = configIds.length > 0
          ? await db.configurationPreview.findMany({
              where: { id: { in: configIds } },
              select: { id: true, createdAt: true },
            })
          : [];

        // Build the data export payload
        const dataExport = {
          customer: {
            shopifyCustomerId: customerId ? String(customerId) : null,
            email: customerEmail || null,
          },
          configurations: customerConfigs.map((config) => ({
            id: config.id,
            productName: config.product3D?.name || null,
            shopifyProductId: config.product3D?.shopifyProductId || null,
            colorName: config.colorName,
            colorHex: config.colorHex,
            materialName: config.materialName,
            totalPrice: config.totalPrice,
            status: config.status,
            configurationData: config.configurationData,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
          })),
          previewImages: previews.map((p) => ({
            configurationId: p.id,
            createdAt: p.createdAt,
          })),
        };

        console.log(
          `[GDPR] Data request for customer ${customerId || customerEmail}: found ${customerConfigs.length} configurations, ${previews.length} previews`
        );

        return json({
          success: true,
          customer: dataExport,
          message: `Exported ${customerConfigs.length} configurations for customer`,
        });
      }

      case "CUSTOMERS_REDACT": {
        // Customer requested deletion of their data
        const customerId = payload?.customer?.id;
        const customerEmail = payload?.customer?.email;
        const filter = buildCustomerFilter(customerId, customerEmail);

        if (!filter) {
          console.log("[GDPR] No customer identifier provided for redaction");
          return json({ success: true, message: "No customer data to redact" });
        }

        // Find configuration IDs first so we can delete associated previews
        const configsToDelete = await db.productConfiguration.findMany({
          where: filter,
          select: { id: true },
        });
        const configIds = configsToDelete.map((c) => c.id);

        // Delete preview images for these configurations
        let previewsDeleted = { count: 0 };
        if (configIds.length > 0) {
          previewsDeleted = await db.configurationPreview.deleteMany({
            where: { id: { in: configIds } },
          });
        }

        // Delete customer configurations
        const configsDeletedResult = await db.productConfiguration.deleteMany({
          where: filter,
        });

        console.log(
          `[GDPR] Redacted customer ${customerId || customerEmail}: ${configsDeletedResult.count} configurations, ${previewsDeleted.count} previews`
        );

        return json({
          success: true,
          message: `Deleted ${configsDeletedResult.count} configurations and ${previewsDeleted.count} preview images`,
          deleted: {
            configurations: configsDeletedResult.count,
            previewImages: previewsDeleted.count,
          },
        });
      }

      case "SHOP_REDACT": {
        // Shop uninstalled and requested deletion of ALL data
        console.log(`[GDPR] Shop redact requested for: ${shop}`);

        // Delete in order to respect foreign key constraints:
        // 1. Configuration previews (no FK, keyed by config ID)
        const previewsDeleted = await db.configurationPreview.deleteMany({
          where: { shop },
        });

        // 2. Product configurations (FK to Product3D)
        const configsDeleted = await db.productConfiguration.deleteMany({
          where: {
            product3D: { shop },
          },
        });

        // 3. Color options (FK to Product3D, cascade would handle this but explicit is safer)
        const colorsDeleted = await db.colorOption.deleteMany({
          where: {
            product3D: { shop },
          },
        });

        // 4. Material options (FK to Product3D)
        const materialsDeleted = await db.materialOption.deleteMany({
          where: {
            product3D: { shop },
          },
        });

        // 5. 3D products
        const productsDeleted = await db.product3D.deleteMany({
          where: { shop },
        });

        // 7. Shop record
        const shopDeleted = await db.shop.deleteMany({
          where: { shopDomain: shop },
        });

        // 8. Sessions
        const sessionsDeleted = await db.session.deleteMany({
          where: { shop },
        });

        const summary = {
          configurations: configsDeleted.count,
          previewImages: previewsDeleted.count,
          colorOptions: colorsDeleted.count,
          materialOptions: materialsDeleted.count,
          products: productsDeleted.count,
          shopRecords: shopDeleted.count,
          sessions: sessionsDeleted.count,
        };

        console.log(`[GDPR] Shop redact complete for ${shop}:`, summary);

        return json({
          success: true,
          message: `Deleted all data for shop ${shop}`,
          deleted: summary,
        });
      }

      default:
        console.log(`[GDPR] Unknown webhook topic: ${topic}`);
        return json({ success: false, message: `Unknown topic: ${topic}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[GDPR] Webhook error:", error);

    // Return 200 even on error to prevent Shopify from retrying endlessly
    return json({
      success: false,
      message: "Internal error processing webhook",
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
      "shop/redact",
    ],
  });
}
