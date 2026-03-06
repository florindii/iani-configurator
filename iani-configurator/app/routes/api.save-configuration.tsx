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
      configurationId,
      shop,
      productId,
      variantId,
      productHandle,
      modelUrl,
      colorName,
      colorHex,
      materialName,
      totalPrice,
      configuration,
    } = body;

    if (!configurationId || !shop) {
      return json(
        { error: "Missing required fields: configurationId and shop" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Find the Product3D record for this product
    let product3DId = null;
    if (productId) {
      const product3D = await db.product3D.findFirst({
        where: {
          shopifyProductId: productId,
          shop: shop,
        },
      });
      if (product3D) {
        product3DId = product3D.id;
      }
    }

    // If no Product3D exists, create a minimal one or skip
    if (!product3DId) {
      // Create a minimal Product3D record for tracking
      const newProduct3D = await db.product3D.create({
        data: {
          shopifyProductId: productId || "unknown",
          shop: shop,
          name: productHandle || "Configured Product",
          basePrice: totalPrice || 0,
          baseModelUrl: modelUrl || null,
          useShopifyModel: !modelUrl,
          isActive: true,
        },
      });
      product3DId = newProduct3D.id;
    }

    // Save the configuration
    const savedConfig = await db.productConfiguration.create({
      data: {
        id: configurationId,
        product3DId: product3DId,
        shop: shop,
        configurationData: configuration || {},
        colorName: colorName || null,
        colorHex: colorHex || null,
        materialName: materialName || null,
        totalPrice: totalPrice || 0,
        status: "saved",
      },
    });

    return json(
      {
        success: true,
        configurationId: savedConfig.id,
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
