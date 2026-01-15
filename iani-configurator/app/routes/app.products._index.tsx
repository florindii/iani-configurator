import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  IndexTable,
  Badge,
  EmptyState,
  Thumbnail,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Helper to extract numeric product ID from various formats
function extractProductId(productId: string): string {
  // Handle full URL format: https://admin.shopify.com/store/xxx/products/123
  const urlMatch = productId.match(/\/products\/(\d+)/);
  if (urlMatch) return urlMatch[1];

  // Handle GID format: gid://shopify/Product/123
  const gidMatch = productId.match(/gid:\/\/shopify\/Product\/(\d+)/);
  if (gidMatch) return gidMatch[1];

  // Already a numeric ID
  return productId;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get all 3D configured products for this shop
  const products3D = await db.product3D.findMany({
    where: { shop },
    include: {
      colorOptions: { orderBy: { sortOrder: "asc" } },
      materialOptions: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Extract clean product IDs (handle various stored formats)
  const productIds = products3D.map((p) => extractProductId(p.shopifyProductId));

  let shopifyProducts: Record<string, { title: string; image: string | null }> = {};

  if (productIds.length > 0) {
    try {
      const response = await admin.graphql(
        `#graphql
          query getProducts($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Product {
                id
                title
                featuredImage {
                  url
                }
              }
            }
          }
        `,
        {
          variables: {
            ids: productIds.map((id) => `gid://shopify/Product/${id}`),
          },
        }
      );

      const data = await response.json();
      if (data.data?.nodes) {
        for (const node of data.data.nodes) {
          if (node) {
            const numericId = node.id.replace("gid://shopify/Product/", "");
            shopifyProducts[numericId] = {
              title: node.title,
              image: node.featuredImage?.url || null,
            };
          }
        }
      }
    } catch (error) {
      console.error("Error fetching Shopify products:", error);
      // Continue without Shopify data - show products with fallback titles
    }
  }

  return json({
    products3D: products3D.map((p) => {
      const cleanId = extractProductId(p.shopifyProductId);
      return {
        ...p,
        shopifyTitle: shopifyProducts[cleanId]?.title || p.name || "Unknown Product",
        shopifyImage: shopifyProducts[cleanId]?.image || null,
      };
    }),
  });
};

export default function Products() {
  const { products3D } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const resourceName = {
    singular: "3D product",
    plural: "3D products",
  };

  const rowMarkup = products3D.map((product, index) => (
    <IndexTable.Row
      id={product.id}
      key={product.id}
      position={index}
      onClick={() => navigate(`/app/products/${product.id}`)}
    >
      <IndexTable.Cell>
        <InlineStack gap="400" blockAlign="center">
          <Thumbnail
            source={product.shopifyImage || "https://cdn.shopify.com/s/files/1/0757/9955/files/placeholder-images-product-1_large.png"}
            alt={product.shopifyTitle}
            size="small"
          />
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {product.shopifyTitle}
          </Text>
        </InlineStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={product.isActive ? "success" : "critical"}>
          {product.isActive ? "Active" : "Inactive"}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd">
          {product.colorOptions.length} colors
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd">
          {product.materialOptions.length} materials
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd">
          ${product.basePrice.toFixed(2)}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  const emptyStateMarkup = (
    <EmptyState
      heading="Configure 3D products"
      action={{
        content: "Add 3D Configuration",
        onAction: () => navigate("/app/products/new"),
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>
        Add 3D configuration to your products so customers can customize colors,
        materials, and see live previews.
      </p>
    </EmptyState>
  );

  return (
    <Page>
      <TitleBar title="3D Products">
        <button variant="primary" onClick={() => navigate("/app/products/new")}>
          Add 3D Configuration
        </button>
      </TitleBar>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {products3D.length === 0 ? (
              emptyStateMarkup
            ) : (
              <IndexTable
                resourceName={resourceName}
                itemCount={products3D.length}
                headings={[
                  { title: "Product" },
                  { title: "Status" },
                  { title: "Colors" },
                  { title: "Materials" },
                  { title: "Base Price" },
                ]}
                selectable={false}
              >
                {rowMarkup}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
