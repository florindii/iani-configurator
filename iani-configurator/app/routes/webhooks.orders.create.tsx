import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  if (import.meta.env.DEV) {
    console.log(`Received ${topic} webhook for ${shop}`);
    console.log("Order payload:", JSON.stringify(payload, null, 2));
  }

  try {
    const order = payload as any;
    const orderId = order.id?.toString() || order.admin_graphql_api_id;
    const orderName = order.name || `#${order.order_number}`;
    const customerEmail = order.email || order.customer?.email || null;

    // Process each line item looking for configured products
    for (const lineItem of order.line_items || []) {
      const properties = lineItem.properties || [];

      // Check if this line item has a configuration ID
      const configIdProp = properties.find(
        (p: any) => p.name === "_Configuration ID" || p.name === "Configuration ID"
      );

      if (!configIdProp?.value) {
        // Not a configured product, skip
        continue;
      }

      const configurationId = configIdProp.value;

      // Extract configuration details from properties
      const colorName = properties.find((p: any) => p.name === "Color")?.value || null;
      const colorHex = properties.find((p: any) => p.name === "Color Code")?.value || null;
      const materialName = properties.find((p: any) => p.name === "Material")?.value || null;
      const configuredPriceStr = properties.find((p: any) => p.name === "Configured Price")?.value;
      const configuredPrice = configuredPriceStr
        ? parseFloat(configuredPriceStr.replace(/[^0-9.]/g, ""))
        : parseFloat(lineItem.price) || 0;

      // Get the Shopify product ID
      const shopifyProductId = lineItem.product_id?.toString();

      if (!shopifyProductId) {
        console.warn(`No product ID for line item in order ${orderName}`);
        continue;
      }

      // Find the Product3D record
      const product3D = await db.product3D.findFirst({
        where: {
          shopifyProductId,
          shop,
        },
      });

      if (!product3D) {
        console.warn(`No Product3D found for Shopify product ${shopifyProductId} in shop ${shop}`);
        continue;
      }

      // Try to get preview image from the configuration ID stored in localStorage
      // The preview image URL might be passed as a property if we add it
      const previewImageProp = properties.find((p: any) => p.name === "_Preview Image");
      const previewImageUrl = previewImageProp?.value || null;

      // Build configuration data from all properties
      const configurationData: Record<string, any> = {};
      for (const prop of properties) {
        if (!prop.name.startsWith("_")) {
          configurationData[prop.name] = prop.value;
        }
      }

      // Create or update the configuration record
      const existingConfig = await db.productConfiguration.findFirst({
        where: {
          shop,
          shopifyOrderId: orderId,
          product3DId: product3D.id,
        },
      });

      if (existingConfig) {
        // Update existing
        await db.productConfiguration.update({
          where: { id: existingConfig.id },
          data: {
            shopifyOrderName: orderName,
            customerEmail,
            colorName,
            colorHex,
            materialName,
            totalPrice: configuredPrice,
            configurationData,
            previewImageUrl: previewImageUrl || existingConfig.previewImageUrl,
            status: "ordered",
          },
        });

        if (import.meta.env.DEV) {
          console.log(`Updated configuration ${existingConfig.id} for order ${orderName}`);
        }
      } else {
        // Create new
        const newConfig = await db.productConfiguration.create({
          data: {
            product3DId: product3D.id,
            shop,
            customerEmail,
            shopifyOrderId: orderId,
            shopifyOrderName: orderName,
            configurationData,
            previewImageUrl,
            colorName,
            colorHex,
            materialName,
            totalPrice: configuredPrice,
            status: "ordered",
          },
        });

        if (import.meta.env.DEV) {
          console.log(`Created configuration ${newConfig.id} for order ${orderName}`);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing order webhook:", error);
    // Return 200 to acknowledge receipt (Shopify will retry on non-2xx)
    // Log the error but don't fail the webhook
    return new Response("OK", { status: 200 });
  }
};
