// API route for updating configuration status
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "../db.server";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Shop-Domain",
};

// Helper to extract shop from request (from header or body)
async function getShopFromRequest(request: Request, body?: any): Promise<string | null> {
  // Try from X-Shop-Domain header first
  const shopHeader = request.headers.get("X-Shop-Domain");
  if (shopHeader) return shopHeader;

  // Try from body
  if (body?.shop) return body.shop;

  return null;
}

// Handle OPTIONS preflight
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { configId } = params;

    if (!configId) {
      return json(
        { error: "Configuration ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { status, shopifyVariantId, shopifyOrderId, shop } = body;

    // Get shop from request (header or body)
    const requestShop = await getShopFromRequest(request, body);

    // Find the configuration with its associated product
    const existingConfig = await db.productConfiguration.findUnique({
      where: { id: configId },
      include: {
        product3D: {
          select: { shop: true }
        }
      }
    });

    if (!existingConfig) {
      return json(
        { error: "Configuration not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Security: Verify shop ownership
    // The configuration's product must belong to the requesting shop
    if (requestShop && existingConfig.product3D.shop !== requestShop) {
      return json(
        { error: "Access denied: Configuration does not belong to this shop" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Validate status if provided
    const validStatuses = ['draft', 'saved', 'in_cart', 'ordered', 'completed'];
    if (status && !validStatuses.includes(status)) {
      return json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Update configuration
    const updatedConfiguration = await db.productConfiguration.update({
      where: { id: configId },
      data: {
        status: status || existingConfig.status,
        updatedAt: new Date()
      }
    });

    return json(
      {
        success: true,
        configuration: updatedConfiguration
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Error updating configuration:", error);
    return json(
      {
        error: "Failed to update configuration",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
};
