// API route for updating configuration status
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { db } from "../db.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    const { configId } = params;
    
    if (!configId) {
      return json({ error: "Configuration ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { status, shopifyVariantId, shopifyOrderId } = body;

    // Find the configuration
    const existingConfig = await db.productConfiguration.findUnique({
      where: { id: configId }
    });

    if (!existingConfig) {
      return json({ error: "Configuration not found" }, { status: 404 });
    }

    // Update configuration
    const updatedConfiguration = await db.productConfiguration.update({
      where: { id: configId },
      data: {
        status: status || existingConfig.status,
        updatedAt: new Date()
      }
    });

    return json({ 
      success: true, 
      configuration: updatedConfiguration 
    });

  } catch (error) {
    console.error("Error updating configuration:", error);
    return json({ error: "Failed to update configuration" }, { status: 500 });
  }
};