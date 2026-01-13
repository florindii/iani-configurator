import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  TextField,
  Button,
  Select,
  InlineStack,
  Divider,
  Banner,
  FormLayout,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Fetch all products from Shopify
  const response = await admin.graphql(
    `#graphql
      query getProducts {
        products(first: 100) {
          edges {
            node {
              id
              title
              featuredImage {
                url
              }
              priceRangeV2 {
                minVariantPrice {
                  amount
                }
              }
              media(first: 10) {
                edges {
                  node {
                    mediaContentType
                    ... on Model3d {
                      sources {
                        url
                        format
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `
  );

  const data = await response.json();
  const products = data.data?.products?.edges?.map((edge: any) => {
    const has3DModel = edge.node.media.edges.some(
      (m: any) => m.node.mediaContentType === "MODEL_3D"
    );
    return {
      id: edge.node.id.replace("gid://shopify/Product/", ""),
      title: edge.node.title,
      image: edge.node.featuredImage?.url || null,
      price: parseFloat(edge.node.priceRangeV2?.minVariantPrice?.amount || "0"),
      has3DModel,
    };
  }) || [];

  // Get existing configured products to exclude them
  const existingProducts = await db.product3D.findMany({
    where: { shop: session.shop },
    select: { shopifyProductId: true },
  });
  const existingIds = new Set(existingProducts.map((p) => p.shopifyProductId));

  // Filter out already configured products
  const availableProducts = products.filter((p: any) => !existingIds.has(p.id));

  return json({ products: availableProducts, shop: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shopifyProductId = formData.get("shopifyProductId") as string;
  const name = formData.get("name") as string;
  const basePrice = parseFloat(formData.get("basePrice") as string) || 0;
  const colorsJson = formData.get("colors") as string;
  const materialsJson = formData.get("materials") as string;

  const colors = JSON.parse(colorsJson || "[]");
  const materials = JSON.parse(materialsJson || "[]");

  // Create the product with its options
  const product3D = await db.product3D.create({
    data: {
      shopifyProductId,
      shop: session.shop,
      name,
      basePrice,
      useShopifyModel: true,
      isActive: true,
      colorOptions: {
        create: colors.map((color: any, index: number) => ({
          name: color.name,
          hexCode: color.hexCode,
          price: color.price || basePrice,
          sortOrder: index,
          isDefault: index === 0,
        })),
      },
      materialOptions: {
        create: materials.map((material: any, index: number) => ({
          name: material.name,
          description: material.description || "",
          extraCost: material.extraCost || 0,
          sortOrder: index,
          isDefault: index === 0,
        })),
      },
    },
  });

  return redirect(`/app/products/${product3D.id}`);
};

// Default color presets
const defaultColors = [
  { name: "Ocean Blue", hexCode: "#1E90FF", price: 299.99 },
  { name: "Crimson Red", hexCode: "#DC143C", price: 319.99 },
  { name: "Forest Green", hexCode: "#228B22", price: 309.99 },
  { name: "Charcoal Gray", hexCode: "#36454F", price: 289.99 },
  { name: "Warm Beige", hexCode: "#D4A574", price: 299.99 },
  { name: "Royal Purple", hexCode: "#7851A9", price: 329.99 },
];

// Default material presets
const defaultMaterials = [
  { name: "Natural Oak", description: "Warm honey tones", extraCost: 0 },
  { name: "Walnut", description: "Rich dark brown", extraCost: 50 },
  { name: "Matte Black", description: "Modern minimal", extraCost: 30 },
  { name: "Brushed Steel", description: "Industrial look", extraCost: 75 },
];

export default function NewProduct() {
  const { products } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [selectedProduct, setSelectedProduct] = useState("");
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState("299.99");
  const [colors, setColors] = useState(defaultColors);
  const [materials, setMaterials] = useState(defaultMaterials);

  const productOptions = [
    { label: "Select a product...", value: "" },
    ...products.map((p: any) => ({
      label: `${p.title}${p.has3DModel ? " (has 3D model)" : ""}`,
      value: p.id,
    })),
  ];

  const handleProductChange = useCallback((value: string) => {
    setSelectedProduct(value);
    const product = products.find((p: any) => p.id === value);
    if (product) {
      setName(product.title);
      setBasePrice(product.price.toFixed(2));
      // Update color prices to match product price
      setColors(defaultColors.map((c) => ({ ...c, price: product.price })));
    }
  }, [products]);

  const handleColorChange = (index: number, field: string, value: string) => {
    const newColors = [...colors];
    if (field === "price") {
      newColors[index] = { ...newColors[index], [field]: parseFloat(value) || 0 };
    } else {
      newColors[index] = { ...newColors[index], [field]: value };
    }
    setColors(newColors);
  };

  const addColor = () => {
    setColors([...colors, { name: "", hexCode: "#000000", price: parseFloat(basePrice) || 0 }]);
  };

  const removeColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: string) => {
    const newMaterials = [...materials];
    if (field === "extraCost") {
      newMaterials[index] = { ...newMaterials[index], [field]: parseFloat(value) || 0 };
    } else {
      newMaterials[index] = { ...newMaterials[index], [field]: value };
    }
    setMaterials(newMaterials);
  };

  const addMaterial = () => {
    setMaterials([...materials, { name: "", description: "", extraCost: 0 }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.set("shopifyProductId", selectedProduct);
    formData.set("name", name);
    formData.set("basePrice", basePrice);
    formData.set("colors", JSON.stringify(colors));
    formData.set("materials", JSON.stringify(materials));
    submit(formData, { method: "post" });
  };

  return (
    <Page
      backAction={{ content: "Products", url: "/app/products" }}
      title="Add 3D Configuration"
    >
      <TitleBar title="Add 3D Configuration" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {products.length === 0 && (
              <Banner tone="warning">
                <p>
                  All your products already have 3D configurations, or you don't have any products yet.
                </p>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Select Product
                </Text>
                <Select
                  label="Shopify Product"
                  options={productOptions}
                  value={selectedProduct}
                  onChange={handleProductChange}
                  helpText="Choose a product to add 3D configuration"
                />
                <TextField
                  label="Display Name"
                  value={name}
                  onChange={setName}
                  autoComplete="off"
                  helpText="Name shown in the configurator"
                />
                <TextField
                  label="Base Price"
                  value={basePrice}
                  onChange={setBasePrice}
                  type="number"
                  prefix="$"
                  autoComplete="off"
                  helpText="Starting price before customizations"
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Color Options
                  </Text>
                  <Button onClick={addColor} size="slim">
                    Add Color
                  </Button>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Define the colors customers can choose from. Each color can have its own price.
                </Text>
                <Divider />
                {colors.map((color, index) => (
                  <InlineStack key={index} gap="300" align="start" blockAlign="end">
                    <div style={{ width: "40px", height: "40px", backgroundColor: color.hexCode, borderRadius: "4px", border: "1px solid #ccc" }} />
                    <TextField
                      label="Name"
                      value={color.name}
                      onChange={(v) => handleColorChange(index, "name", v)}
                      autoComplete="off"
                      labelHidden={index > 0}
                    />
                    <TextField
                      label="Hex Code"
                      value={color.hexCode}
                      onChange={(v) => handleColorChange(index, "hexCode", v)}
                      autoComplete="off"
                      labelHidden={index > 0}
                    />
                    <TextField
                      label="Price"
                      value={color.price.toString()}
                      onChange={(v) => handleColorChange(index, "price", v)}
                      type="number"
                      prefix="$"
                      autoComplete="off"
                      labelHidden={index > 0}
                    />
                    <Button
                      tone="critical"
                      onClick={() => removeColor(index)}
                      disabled={colors.length <= 1}
                    >
                      Remove
                    </Button>
                  </InlineStack>
                ))}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Material Options
                  </Text>
                  <Button onClick={addMaterial} size="slim">
                    Add Material
                  </Button>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Define frame materials. Extra cost is added to the color price.
                </Text>
                <Divider />
                {materials.map((material, index) => (
                  <InlineStack key={index} gap="300" align="start" blockAlign="end">
                    <TextField
                      label="Name"
                      value={material.name}
                      onChange={(v) => handleMaterialChange(index, "name", v)}
                      autoComplete="off"
                      labelHidden={index > 0}
                    />
                    <TextField
                      label="Description"
                      value={material.description}
                      onChange={(v) => handleMaterialChange(index, "description", v)}
                      autoComplete="off"
                      labelHidden={index > 0}
                    />
                    <TextField
                      label="Extra Cost"
                      value={material.extraCost.toString()}
                      onChange={(v) => handleMaterialChange(index, "extraCost", v)}
                      type="number"
                      prefix="+$"
                      autoComplete="off"
                      labelHidden={index > 0}
                    />
                    <Button
                      tone="critical"
                      onClick={() => removeMaterial(index)}
                      disabled={materials.length <= 1}
                    >
                      Remove
                    </Button>
                  </InlineStack>
                ))}
              </BlockStack>
            </Card>

            <InlineStack align="end">
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={!selectedProduct || !name}
              >
                Save 3D Configuration
              </Button>
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
