import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "../db.server";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const { id } = params;

  if (!id) {
    return json(
      { error: "Configuration ID required" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const configuration = await db.productConfiguration.findUnique({
      where: { id },
      include: {
        product3D: {
          select: {
            name: true,
            baseModelUrl: true,
            shopifyProductId: true,
          },
        },
      },
    });

    if (!configuration) {
      return json(
        { error: "Configuration not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return json(
      {
        success: true,
        configuration: {
          id: configuration.id,
          colorName: configuration.colorName,
          colorHex: configuration.colorHex,
          materialName: configuration.materialName,
          totalPrice: configuration.totalPrice,
          configurationData: configuration.configurationData,
          productName: configuration.product3D?.name,
          modelUrl: configuration.product3D?.baseModelUrl,
          productId: configuration.product3D?.shopifyProductId,
          createdAt: configuration.createdAt,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error loading configuration:", error);
    return json(
      { error: "Failed to load configuration" },
      { status: 500, headers: corsHeaders }
    );
  }
}
