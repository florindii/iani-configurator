// API route for adding configured products to cart
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "../db.server";

// Add CORS headers to response
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const {
      shop,
      productId,  // This is the Product3D id from the database
      shopifyProductId, // Alternatively, the Shopify product ID
      configurationData,
      totalPrice,
      customerId,
      customerEmail
    } = body;

    // Validate required fields
    if (!shop || (!productId && !shopifyProductId) || !configurationData || totalPrice === undefined) {
      return json({
        error: "Missing required fields: shop, productId/shopifyProductId, configurationData, totalPrice"
      }, { status: 400, headers: corsHeaders });
    }

    if (import.meta.env.DEV) {
      console.log("🛒 Adding to cart:", { shop, productId, shopifyProductId, totalPrice });
    }

    // Find the Product3D record
    let product3D;

    if (productId) {
      // Direct product3D id lookup
      product3D = await db.product3D.findUnique({
        where: { id: productId },
        include: {
          colorOptions: true,
          materialOptions: true,
        }
      });
    } else if (shopifyProductId) {
      // Lookup by Shopify product ID and shop
      product3D = await db.product3D.findFirst({
        where: {
          shopifyProductId: shopifyProductId,
          shop: shop
        },
        include: {
          colorOptions: true,
          materialOptions: true,
        }
      });
    }

    if (!product3D) {
      return json({ error: "3D Product not found" }, { status: 404, headers: corsHeaders });
    }

    // Create the configuration
    const configuration = await db.productConfiguration.create({
      data: {
        product3DId: product3D.id,
        customerEmail: customerEmail || null,
        shopifyCustomerId: customerId || null,
        configurationData,
        totalPrice: parseFloat(String(totalPrice)) || 0,
        status: 'in_cart'
      }
    });

    // Return success with configuration data
    const cartResponse = {
      success: true,
      configurationId: configuration.id,
      configuration,
      cartItem: {
        id: `config_${configuration.id}`,
        productId: product3D.shopifyProductId,
        title: `${product3D.name} (Custom Configuration)`,
        price: totalPrice,
        quantity: 1,
        customProperties: {
          'Configuration ID': configuration.id,
          'Custom Options': JSON.stringify(configurationData),
          'Total Price': `$${parseFloat(String(totalPrice)).toFixed(2)}`
        }
      },
      message: 'Configuration saved and ready for cart'
    };

    if (import.meta.env.DEV) {
      console.log("✅ Cart response:", cartResponse);
    }

    return json(cartResponse, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ Error adding to cart:", error);
    return json({
      error: "Failed to add to cart",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders });
  }
};

// Handle OPTIONS preflight
export const loader = async ({ request }: { request: Request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
};
