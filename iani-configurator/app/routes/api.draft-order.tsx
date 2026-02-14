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

    // First, fetch variant prices to calculate discounts
    const variantIds = lineItems.map((item: any) => `gid://shopify/ProductVariant/${item.variantId}`);

    const variantPricesResponse = await admin.graphql(
      `#graphql
      query getVariantPrices($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            price
          }
        }
      }`,
      {
        variables: {
          ids: variantIds
        }
      }
    );

    const variantPricesJson = await variantPricesResponse.json();
    console.log("📦 Variant prices response:", JSON.stringify(variantPricesJson, null, 2));

    // Create a map of variant ID to original price
    const variantPriceMap: Record<string, number> = {};
    variantPricesJson.data?.nodes?.forEach((node: any) => {
      if (node?.id && node?.price) {
        variantPriceMap[node.id] = parseFloat(node.price);
      }
    });

    console.log("📦 Variant price map:", variantPriceMap);

    // Get shop currency from the first variant (or default to USD)
    // We need to pass the currency code with priceOverride
    let shopCurrency = "USD";

    // Try to get currency from shop settings
    try {
      const shopResponse = await admin.graphql(
        `#graphql
        query getShopCurrency {
          shop {
            currencyCode
          }
        }`
      );
      const shopJson = await shopResponse.json();
      shopCurrency = shopJson.data?.shop?.currencyCode || "USD";
      console.log("📦 Shop currency:", shopCurrency);
    } catch (e) {
      console.log("📦 Could not fetch shop currency, defaulting to USD");
    }

    // Build draft order line items
    // For custom pricing with variantId, we must use priceOverride (NOT originalUnitPrice)
    // originalUnitPrice is ignored when variantId is present
    const draftOrderLineItems = lineItems.map((item: any) => {
      const variantGid = `gid://shopify/ProductVariant/${item.variantId}`;
      const originalPrice = variantPriceMap[variantGid] || 0;
      const configuredPrice = item.configuredPrice ? parseFloat(item.configuredPrice) : null;

      const lineItem: any = {
        variantId: variantGid,
        quantity: item.quantity || 1,
      };

      // Apply custom price if provided
      // Use priceOverride to set custom price when using variantId
      if (configuredPrice !== null) {
        console.log(`📦 Item ${item.variantId}: original=${originalPrice}, configured=${configuredPrice}`);

        // priceOverride requires amount and currencyCode
        lineItem.priceOverride = {
          amount: configuredPrice.toFixed(2),
          currencyCode: shopCurrency,
        };
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
