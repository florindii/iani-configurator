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
    const { image, configurationId, shop } = body;

    if (!image || !configurationId) {
      return json(
        { error: "Missing required fields: image and configurationId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // For now, we'll store the base64 image in the database
    // In production, you'd upload to S3, Cloudinary, etc.
    // But we can create a simple image serving endpoint

    // Store the preview image
    const preview = await db.configurationPreview.create({
      data: {
        id: configurationId,
        shop: shop || "unknown",
        imageData: image,
        createdAt: new Date(),
      },
    });

    // Return a URL that can be used to view the image
    const imageUrl = `https://iani-configurator-1.onrender.com/api/preview-image/${configurationId}`;

    return json(
      {
        success: true,
        imageUrl,
        configurationId,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error uploading preview:", error);
    return json(
      { error: "Failed to upload preview image" },
      { status: 500, headers: corsHeaders }
    );
  }
}
