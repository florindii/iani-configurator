import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  TextField,
  Button,
  InlineStack,
  Divider,
  Banner,
  Badge,
  Modal,
  TextContainer,
  Checkbox,
  Select,
  RangeSlider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { hasFeatureAccess, getShopSubscription, PLANS, type PlanType } from "../billing.server";

// Error boundary to catch and display errors properly
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <Page title="Error">
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              {error.status} - {error.statusText}
            </Text>
            <Text as="p">{error.data}</Text>
          </BlockStack>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Error">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Something went wrong</Text>
          <Text as="p">{error instanceof Error ? error.message : "Unknown error"}</Text>
        </BlockStack>
      </Card>
    </Page>
  );
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    throw new Response("Product ID is required", { status: 400 });
  }

  let product3D;
  try {
    product3D = await db.product3D.findUnique({
      where: { id },
      include: {
        colorOptions: { orderBy: { sortOrder: "asc" } },
        materialOptions: { orderBy: { sortOrder: "asc" } },
      },
    });
  } catch (error) {
    console.error("Error fetching product from database:", error);
    throw new Response(`Database error: ${error instanceof Error ? error.message : "Unknown"}`, { status: 500 });
  }

  if (!product3D || product3D.shop !== session.shop) {
    throw new Response("Product not found", { status: 404 });
  }

  // Fetch Shopify product details
  let shopifyProduct = null;
  try {
    const response = await admin.graphql(
      `#graphql
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            featuredImage {
              url
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
      `,
      {
        variables: {
          id: `gid://shopify/Product/${product3D.shopifyProductId}`,
        },
      }
    );

    const data = await response.json();
    if (data.data?.product) {
      const model3d = data.data.product.media.edges.find(
        (m: any) => m.node.mediaContentType === "MODEL_3D"
      );
      shopifyProduct = {
        title: data.data.product.title,
        image: data.data.product.featuredImage?.url || null,
        has3DModel: !!model3d,
        modelUrl: model3d?.node?.sources?.[0]?.url || null,
      };
    }
  } catch (e) {
    console.error("Error fetching Shopify product:", e);
  }

  // Check feature access for try-on
  const canUseTryOn = await hasFeatureAccess(session.shop, "tryOnEnabled");
  const subscription = await getShopSubscription(session.shop);
  const planDetails = PLANS[subscription.plan as PlanType] || PLANS.free;

  return json({
    product3D,
    shopifyProduct,
    canUseTryOn,
    subscription: {
      plan: subscription.plan,
      planName: planDetails.name,
    }
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    // Security: Verify shop ownership before deleting
    const product = await db.product3D.findUnique({
      where: { id },
      select: { shop: true }
    });

    if (!product || product.shop !== session.shop) {
      return json({ error: "Product not found or access denied" }, { status: 403 });
    }

    await db.product3D.delete({ where: { id } });
    return redirect("/app/products");
  }

  if (intent === "toggle") {
    const product = await db.product3D.findUnique({ where: { id } });
    if (product) {
      await db.product3D.update({
        where: { id },
        data: { isActive: !product.isActive },
      });
    }
    return json({ success: true });
  }

  if (intent === "update-try-on") {
    const tryOnEnabled = formData.get("tryOnEnabled") === "true";
    const tryOnType = formData.get("tryOnType") as string | null;
    const tryOnOffsetY = parseFloat(formData.get("tryOnOffsetY") as string) || 0;
    const tryOnScale = parseFloat(formData.get("tryOnScale") as string) || 1;

    // Check if user has try-on access before enabling
    if (tryOnEnabled) {
      const canUseTryOn = await hasFeatureAccess(session.shop, "tryOnEnabled");
      if (!canUseTryOn) {
        return json({ error: "Virtual Try-On requires Pro plan or higher" }, { status: 403 });
      }
    }

    await db.product3D.update({
      where: { id },
      data: {
        tryOnEnabled,
        tryOnType: tryOnEnabled ? tryOnType : null,
        tryOnOffsetY: tryOnEnabled ? tryOnOffsetY : 0,
        tryOnScale: tryOnEnabled ? tryOnScale : 1,
      },
    });
    return json({ success: true });
  }

  // Update product
  const name = formData.get("name") as string;
  const basePrice = parseFloat(formData.get("basePrice") as string) || 0;
  const colorsJson = formData.get("colors") as string;
  const materialsJson = formData.get("materials") as string;

  const colors = JSON.parse(colorsJson || "[]");
  const materials = JSON.parse(materialsJson || "[]");

  // Delete existing options and recreate
  await db.colorOption.deleteMany({ where: { product3DId: id } });
  await db.materialOption.deleteMany({ where: { product3DId: id } });

  await db.product3D.update({
    where: { id },
    data: {
      name,
      basePrice,
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

  return json({ success: true });
};

export default function EditProduct() {
  const { product3D, shopifyProduct, canUseTryOn, subscription } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [name, setName] = useState(product3D.name);
  const [basePrice, setBasePrice] = useState(product3D.basePrice.toString());
  const [colors, setColors] = useState(
    product3D.colorOptions.map((c) => ({
      name: c.name,
      hexCode: c.hexCode,
      price: c.price,
    }))
  );
  const [materials, setMaterials] = useState(
    product3D.materialOptions.map((m) => ({
      name: m.name,
      description: m.description || "",
      extraCost: m.extraCost,
    }))
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tryOnEnabled, setTryOnEnabled] = useState(product3D.tryOnEnabled || false);
  const [tryOnType, setTryOnType] = useState(product3D.tryOnType || "glasses");
  const [tryOnOffsetY, setTryOnOffsetY] = useState(product3D.tryOnOffsetY || 0);
  const [tryOnScale, setTryOnScale] = useState(product3D.tryOnScale || 1);

  // Get model URL for preview
  const modelUrlForPreview = shopifyProduct?.modelUrl || product3D.baseModelUrl || "";

  // Calibration status state
  const [calibrationStatus, setCalibrationStatus] = useState<string>("");
  const calibrationWindowRef = useRef<Window | null>(null);

  // Listen for calibration saved messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CALIBRATION_SAVED') {
        console.log('Calibration saved:', event.data);
        // Update local state with new values
        if (event.data.offsetY !== undefined) {
          setTryOnOffsetY(event.data.offsetY);
        }
        if (event.data.scale !== undefined) {
          setTryOnScale(event.data.scale);
        }
        // Show success message
        setCalibrationStatus("Settings saved successfully! ✓");
        setTimeout(() => setCalibrationStatus(""), 5000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Open calibration tool in new window
  const openCalibrationTool = () => {
    const calibrationUrl = `https://iani-configurator.vercel.app?admin-calibrate=true&productId=${product3D.id}&modelUrl=${encodeURIComponent(modelUrlForPreview)}&currentOffsetY=${tryOnOffsetY}&currentScale=${tryOnScale}&tryOnType=${tryOnType}`;

    calibrationWindowRef.current = window.open(
      calibrationUrl,
      'IaniCalibration',
      'width=1200,height=800,left=100,top=50,menubar=no,toolbar=no'
    );
  };

  const tryOnTypeOptions = [
    { label: "Glasses / Sunglasses", value: "glasses" },
    { label: "Hat / Cap", value: "hat" },
    { label: "Earrings", value: "earrings" },
    { label: "Necklace", value: "necklace" },
  ];

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
    formData.set("name", name);
    formData.set("basePrice", basePrice);
    formData.set("colors", JSON.stringify(colors));
    formData.set("materials", JSON.stringify(materials));
    submit(formData, { method: "post" });
  };

  const handleToggle = () => {
    const formData = new FormData();
    formData.set("intent", "toggle");
    submit(formData, { method: "post" });
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.set("intent", "delete");
    submit(formData, { method: "post" });
  };

  const handleTryOnSave = () => {
    const formData = new FormData();
    formData.set("intent", "update-try-on");
    formData.set("tryOnEnabled", tryOnEnabled.toString());
    formData.set("tryOnType", tryOnType);
    formData.set("tryOnOffsetY", tryOnOffsetY.toString());
    formData.set("tryOnScale", tryOnScale.toString());
    submit(formData, { method: "post" });
  };

  return (
    <Page
      backAction={{ content: "Products", url: "/app/products" }}
      title={shopifyProduct?.title || product3D.name}
      titleMetadata={
        <Badge tone={product3D.isActive ? "success" : "critical"}>
          {product3D.isActive ? "Active" : "Inactive"}
        </Badge>
      }
      secondaryActions={[
        {
          content: product3D.isActive ? "Deactivate" : "Activate",
          onAction: handleToggle,
        },
        {
          content: "Delete",
          destructive: true,
          onAction: () => setDeleteModalOpen(true),
        },
      ]}
    >
      <TitleBar title="Edit 3D Configuration" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {shopifyProduct && !shopifyProduct.has3DModel && (
              <Banner tone="warning">
                <p>
                  This product doesn't have a 3D model uploaded in Shopify.
                  Upload a GLB/GLTF file in the product's media section for the best experience.
                </p>
              </Banner>
            )}

            {shopifyProduct?.has3DModel && (
              <Banner tone="success">
                <p>
                  This product has a 3D model uploaded. The configurator will automatically use it.
                </p>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Basic Settings
                </Text>
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
                    Color Options ({colors.length})
                  </Text>
                  <Button onClick={addColor} size="slim">
                    Add Color
                  </Button>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Define the colors customers can choose from. Extra cost is added to the base price.
                </Text>
                <Divider />
                {colors.map((color, index) => (
                  <InlineStack key={index} gap="300" align="start" blockAlign="end">
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: color.hexCode,
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        flexShrink: 0,
                      }}
                    />
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
                      label="Extra Cost"
                      value={color.price.toString()}
                      onChange={(v) => handleColorChange(index, "price", v)}
                      type="number"
                      prefix="+$"
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
                    Material Options ({materials.length})
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

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Virtual Try-On Settings
                  </Text>
                  {tryOnEnabled && canUseTryOn && (
                    <Badge tone="info">Try-On Enabled</Badge>
                  )}
                  {!canUseTryOn && (
                    <Badge tone="warning">Pro Plan Required</Badge>
                  )}
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Enable virtual try-on for face-worn products like glasses, hats, or jewelry.
                  Customers can use their camera to see how the product looks on them.
                </Text>
                <Divider />

                {!canUseTryOn ? (
                  <Banner
                    title="Upgrade to Pro for Virtual Try-On"
                    tone="warning"
                    action={{ content: "Upgrade Plan", url: "/app/billing" }}
                  >
                    <p>
                      Virtual Try-On is available on the Pro plan ($49/mo) and above.
                      Let customers see how products look on them with AR face tracking.
                    </p>
                  </Banner>
                ) : (
                  <Checkbox
                    label="Enable Virtual Try-On"
                    checked={tryOnEnabled}
                    onChange={setTryOnEnabled}
                    helpText="When enabled, customers will see a 'Try On' button on the product page"
                  />
                )}

                {tryOnEnabled && canUseTryOn && (
                  <BlockStack gap="400">
                    <Select
                      label="Product Type"
                      options={tryOnTypeOptions}
                      value={tryOnType}
                      onChange={setTryOnType}
                      helpText="Select the type of product for proper face positioning"
                    />

                    {calibrationStatus && (
                      <Banner tone="success">
                        {calibrationStatus}
                      </Banner>
                    )}

                    {/* Current Settings Summary */}
                    <div
                      style={{
                        padding: "12px 16px",
                        backgroundColor: "#f6f6f7",
                        borderRadius: "8px",
                        border: "1px solid #e1e3e5",
                      }}
                    >
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Position & Scale Settings
                        </Text>
                        <InlineStack gap="400">
                          <Text as="span" variant="bodySm" tone="subdued">
                            Type: <strong>{tryOnTypeOptions.find(o => o.value === tryOnType)?.label}</strong>
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            Offset: <strong>{tryOnOffsetY}%</strong>
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            Scale: <strong>{tryOnScale.toFixed(2)}x</strong>
                          </Text>
                        </InlineStack>
                      </BlockStack>
                    </div>

                    {modelUrlForPreview && (
                      <BlockStack gap="200">
                        <Button onClick={openCalibrationTool} icon={undefined}>
                          🎥 Open Live Calibration Tool
                        </Button>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Opens in a new window with camera access to preview how glasses
                          will appear on customers' faces. Adjust position and scale in real-time.
                        </Text>
                      </BlockStack>
                    )}

                    {!shopifyProduct?.has3DModel && !product3D.baseModelUrl && (
                      <Banner tone="warning">
                        <p>
                          Please upload a 3D model (GLB/GLTF) in the Shopify product media for virtual try-on to work.
                        </p>
                      </Banner>
                    )}
                  </BlockStack>
                )}

                <InlineStack align="end" gap="300">
                  <Button variant="primary" onClick={handleTryOnSave} loading={isSubmitting}>
                    Save Try-On Settings
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <InlineStack align="end">
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={!name}
              >
                Save Changes
              </Button>
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete 3D Configuration"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: handleDelete,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setDeleteModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              Are you sure you want to delete this 3D configuration? This will remove all color
              and material options. The Shopify product itself will not be affected.
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>

    </Page>
  );
}
