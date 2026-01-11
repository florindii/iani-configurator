// API route for adding configured products to cart
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

// Add CORS headers to response
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const {
      shop,
      productId,
      configurationData,
      totalPrice,
      customerId,
      customerEmail
    } = body;

    // Validate required fields
    if (!shop || !productId || !configurationData || !totalPrice) {
      return json({ 
        error: "Missing required fields: shop, productId, configurationData, totalPrice" 
      }, { status: 400 });
    }

    console.log("🛒 Adding to cart:", { shop, productId, totalPrice });

    // First, save the configuration
    const configuration = await db.productConfiguration.create({
      data: {
        product3DId: productId,
        customerEmail,
        shopifyCustomerId: customerId,
        configurationData,
        totalPrice,
        status: 'in_cart'
      }
    });

    // Get the 3D product details
    const product3D = await db.product3D.findUnique({
      where: { id: productId },
      include: {
        customizationOptions: true
      }
    });

    if (!product3D) {
      return json({ error: "3D Product not found" }, { status: 404 });
    }

    // For now, return success with configuration data
    // Later we'll integrate with actual Shopify Cart API
    const cartResponse = {
      success: true,
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
          'Total Price': `$${totalPrice.toFixed(2)}`
        }
      },
      message: 'Configuration saved and ready for cart'
    };

    console.log("✅ Cart response:", cartResponse);
    return json(cartResponse, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ Error adding to cart:", error);
    return json({ 
      error: "Failed to add to cart",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders });
  }
};
