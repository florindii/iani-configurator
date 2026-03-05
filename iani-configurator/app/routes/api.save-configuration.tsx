import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "../db.server";

// CORS headers for cross-origin requests from storefront
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle OPTIONS preflight request
export async function loader() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await request.json();

    const {
      shop,
      productId, // Shopify product ID
      variantId,
      customerEmail,
      configurationData,
      previewImage,
      colorName,
      colorHex,
      materialName,
      totalPrice,
      shopifyOrderId,
      shopifyOrderName,
    } = body;

    if (!shop || !productId) {
      return json(
        { error: "Missing required fields: shop and productId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Find the Product3D record for this Shopify product
    const product3D = await db.product3D.findFirst({
      where: {
        shopifyProductId: productId,
        shop: shop,
      },
    });

    if (!product3D) {
      // If no Product3D record, create a minimal configuration record
      // This handles cases where the product wasn't configured in admin
      return json(
        { error: "Product not found in 3D configurator" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Create the configuration record
    const configuration = await db.productConfiguration.create({
      data: {
        product3DId: product3D.id,
        shop,
        customerEmail: customerEmail || null,
        shopifyOrderId: shopifyOrderId || null,
        shopifyOrderName: shopifyOrderName || null,
        configurationData: configurationData || {},
        previewImageUrl: previewImage || null,
        colorName: colorName || null,
        colorHex: colorHex || null,
        materialName: materialName || null,
        totalPrice: totalPrice || 0,
        status: shopifyOrderId ? "ordered" : "saved",
      },
    });

    return json(
      {
        success: true,
        configurationId: configuration.id,
        message: "Configuration saved successfully",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error saving configuration:", error);
    return json(
      { error: "Failed to save configuration" },
      { status: 500, headers: corsHeaders }
    );
  }
}
