import { json, type LoaderFunctionArgs } from "@remix-run/node";
import db from "../db.server";

// CORS headers for cross-origin requests from the configurator iframe
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { productId } = params;
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!productId) {
    return json({ error: "Product ID is required" }, { status: 400, headers: corsHeaders });
  }

  if (!shop) {
    return json({ error: "Shop parameter is required" }, { status: 400, headers: corsHeaders });
  }

  try {
    // Find the 3D product configuration
    const product3D = await db.product3D.findFirst({
      where: {
        shopifyProductId: productId,
        shop: shop,
        isActive: true,
      },
      include: {
        colorOptions: {
          orderBy: { sortOrder: "asc" },
        },
        materialOptions: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!product3D) {
      // Return default configuration if no custom config exists
      return json(
        {
          configured: false,
          productId,
          shop,
          message: "No custom configuration found, using defaults",
          config: {
            name: "Product",
            basePrice: 299.99,
            // Virtual Try-On disabled by default
            tryOnEnabled: false,
            tryOnType: null,
            tryOnOffsetY: 0,
            tryOnScale: 1,
            colorOptions: [
              { name: "Ocean Blue", hexCode: "#1E90FF", price: 299.99, isDefault: true },
              { name: "Crimson Red", hexCode: "#DC143C", price: 319.99, isDefault: false },
              { name: "Forest Green", hexCode: "#228B22", price: 309.99, isDefault: false },
              { name: "Charcoal Gray", hexCode: "#36454F", price: 289.99, isDefault: false },
              { name: "Warm Beige", hexCode: "#D4A574", price: 299.99, isDefault: false },
              { name: "Royal Purple", hexCode: "#7851A9", price: 329.99, isDefault: false },
            ],
            materialOptions: [
              { name: "Natural Oak", description: "Warm honey tones", extraCost: 0, isDefault: true },
              { name: "Walnut", description: "Rich dark brown", extraCost: 50, isDefault: false },
              { name: "Matte Black", description: "Modern minimal", extraCost: 30, isDefault: false },
              { name: "Brushed Steel", description: "Industrial look", extraCost: 75, isDefault: false },
            ],
          },
        },
        { headers: corsHeaders }
      );
    }

    // Return the custom configuration
    return json(
      {
        configured: true,
        productId,
        shop,
        config: {
          id: product3D.id,
          name: product3D.name,
          basePrice: product3D.basePrice,
          useShopifyModel: product3D.useShopifyModel,
          baseModelUrl: product3D.baseModelUrl,
          // Virtual Try-On settings
          tryOnEnabled: product3D.tryOnEnabled,
          tryOnType: product3D.tryOnType,
          tryOnOffsetY: product3D.tryOnOffsetY,
          tryOnScale: product3D.tryOnScale,
          colorOptions: product3D.colorOptions.map((c) => ({
            id: c.id,
            name: c.name,
            hexCode: c.hexCode,
            price: c.price,
            isDefault: c.isDefault,
          })),
          materialOptions: product3D.materialOptions.map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            extraCost: m.extraCost,
            isDefault: m.isDefault,
          })),
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error fetching product config:", error);
    return json(
      { error: "Failed to fetch product configuration" },
      { status: 500, headers: corsHeaders }
    );
  }
};

// Handle OPTIONS preflight request
export const action = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
};
