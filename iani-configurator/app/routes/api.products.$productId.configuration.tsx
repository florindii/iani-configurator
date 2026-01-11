// API route for handling product configurations
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

// Add CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { productId } = params;
    
    if (!productId) {
      return json({ error: "Product ID is required" }, { status: 400 });
    }

    const configurations = await db.productConfiguration.findMany({
      where: { product3DId: productId },
      include: {
        product3D: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    return json({ configurations }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error loading configurations:", error);
    return json({ error: "Failed to load configurations" }, { status: 500, headers: corsHeaders });
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { productId } = params;
    
    if (!productId) {
      return json({ error: "Product ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const {
      shop,
      customerId,
      customerEmail,
      configurationData,
      previewImage,
      totalPrice = 0
    } = body;

    // Validate required fields
    if (!shop || !configurationData) {
      return json({ error: "Shop and configuration data are required" }, { status: 400 });
    }

    // Check if product exists
    const product3D = await db.product3D.findUnique({
      where: { id: productId }
    });

    if (!product3D) {
      return json({ error: "3D Product not found" }, { status: 404 });
    }

    // Create configuration
    const configuration = await db.productConfiguration.create({
      data: {
        product3DId: productId,
        customerEmail,
        shopifyCustomerId: customerId,
        configurationData,
        previewImageUrl: previewImage,
        totalPrice,
        status: 'saved'
      }
    });

    return json({ 
      success: true, 
      configuration,
      message: 'Configuration saved successfully' 
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Error saving configuration:", error);
    return json({ error: "Failed to save configuration" }, { status: 500, headers: corsHeaders });
  }
};