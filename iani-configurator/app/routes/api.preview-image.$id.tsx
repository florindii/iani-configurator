import type { LoaderFunctionArgs } from "@remix-run/node";
import { db } from "../db.server";
import { checkRateLimit, rateLimitResponse } from "../utils/api-security.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  if (!checkRateLimit(request, "preview-image", 120)) {
    return new Response("Too many requests", { status: 429, headers: { "Retry-After": "60" } });
  }

  const { id } = params;

  if (!id) {
    return new Response("Preview ID required", { status: 400 });
  }

  try {
    const preview = await db.configurationPreview.findUnique({
      where: { id },
    });

    if (!preview || !preview.imageData) {
      // Return a placeholder image or 404
      return new Response("Preview not found", { status: 404 });
    }

    // Parse the base64 data URL
    const matches = preview.imageData.match(/^data:([^;]+);base64,(.+)$/);

    if (!matches) {
      return new Response("Invalid image data", { status: 500 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const imageBuffer = Buffer.from(base64Data, "base64");

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": imageBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      },
    });
  } catch (error) {
    console.error("Error serving preview image:", error);
    return new Response("Error loading preview", { status: 500 });
  }
}
