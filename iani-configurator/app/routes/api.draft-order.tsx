// API route for creating Draft Orders with custom pricing
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";

// Add CORS headers to response
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Shopify-Shop",
};

// Handle both GET and OPTIONS (preflight) requests
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // OPTIONS preflight requests come through loader
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  return json({ status: "Draft Order API ready" }, { headers: corsHeaders });
};

export const action = async ({ request }: ActionFunctionArgs) => {

  try {
    const body = await request.json();
    const { shop, lineItems, customerEmail, note } = body;

    console.log("📦 Creating Draft Order for shop:", shop);
    console.log("📦 Line items:", JSON.stringify(lineItems, null, 2));

    // Validate required fields
    if (!shop || !lineItems || lineItems.length === 0) {
      return json({
        error: "Missing required fields: shop, lineItems"
      }, { status: 400, headers: corsHeaders });
    }

    // Get admin API client using unauthenticated access
    // This requires the shop to have installed the app
    const { admin } = await unauthenticated.admin(shop);

    // Build draft order line items
    // Each line item needs: variantId, quantity, and custom price
    const draftOrderLineItems = lineItems.map((item: any) => {
      const lineItem: any = {
        variantId: `gid://shopify/ProductVariant/${item.variantId}`,
        quantity: item.quantity || 1,
      };

      // Apply custom price if provided (this is the configured price)
      if (item.configuredPrice) {
        lineItem.appliedDiscount = {
          title: "Custom Configuration",
          description: item.configurationSummary || "Configured product",
          valueType: "FIXED_AMOUNT",
          value: 0, // We'll set the price directly instead
        };
        // Use originalUnitPrice to set the custom price
        lineItem.originalUnitPrice = item.configuredPrice.toString();
      }

      // Add custom attributes (shown in order details)
      if (item.customAttributes) {
        lineItem.customAttributes = Object.entries(item.customAttributes).map(
          ([key, value]) => ({ key, value: String(value) })
        );
      }

      return lineItem;
    });

    console.log("📦 Draft order line items:", JSON.stringify(draftOrderLineItems, null, 2));

    // Create the draft order using GraphQL Admin API
    const response = await admin.graphql(
      `#graphql
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            invoiceUrl
            status
            totalPrice
            lineItems(first: 10) {
              edges {
                node {
                  title
                  quantity
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            lineItems: draftOrderLineItems,
            email: customerEmail || undefined,
            note: note || "Created by Iani 3D Configurator",
            useCustomerDefaultAddress: true,
          },
        },
      }
    );

    const responseJson = await response.json();
    console.log("📦 Draft order response:", JSON.stringify(responseJson, null, 2));

    if (responseJson.data?.draftOrderCreate?.userErrors?.length > 0) {
      const errors = responseJson.data.draftOrderCreate.userErrors;
      console.error("❌ Draft order errors:", errors);
      return json({
        error: "Failed to create draft order",
        details: errors
      }, { status: 400, headers: corsHeaders });
    }

    const draftOrder = responseJson.data?.draftOrderCreate?.draftOrder;

    if (!draftOrder) {
      return json({
        error: "Failed to create draft order - no data returned"
      }, { status: 500, headers: corsHeaders });
    }

    console.log("✅ Draft order created:", draftOrder.id);
    console.log("✅ Invoice URL:", draftOrder.invoiceUrl);

    return json({
      success: true,
      draftOrderId: draftOrder.id,
      checkoutUrl: draftOrder.invoiceUrl,
      totalPrice: draftOrder.totalPrice,
      status: draftOrder.status,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ Error creating draft order:", error);
    return json({
      error: "Failed to create draft order",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders });
  }
};
