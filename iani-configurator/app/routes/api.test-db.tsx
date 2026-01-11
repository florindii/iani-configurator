// Simple test endpoint to check database
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    
    // Test database connection
    const testResult = await db.product3D.findMany({
      take: 1
    });
    
    return json({ 
      success: true, 
      shop: session.shop,
      databaseWorking: true,
      testResult 
    });
  } catch (error) {
    console.error("Database test error:", error);
    return json({ 
      success: false, 
      error: error.message,
      databaseWorking: false 
    });
  }
};