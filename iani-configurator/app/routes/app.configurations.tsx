import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  InlineStack,
  Badge,
  Box,
  EmptyState,
  Thumbnail,
  DataTable,
  Filters,
  ChoiceList,
  Pagination,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { useState, useCallback } from "react";

const PAGE_SIZE = 20;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const status = url.searchParams.get("status") || "all";

  const where: any = { shop };
  if (status !== "all") {
    where.status = status;
  }

  // Get total count for pagination
  const totalCount = await db.productConfiguration.count({ where });

  // Get configurations with product info
  const configurations = await db.productConfiguration.findMany({
    where,
    include: {
      product3D: {
        select: {
          id: true,
          name: true,
          shopifyProductId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return json({
    configurations,
    pagination: {
      page,
      totalPages,
      totalCount,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    currentStatus: status,
  });
};

export default function ConfigurationsPage() {
  const { configurations, pagination, currentStatus } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string[]>(
    currentStatus === "all" ? [] : [currentStatus]
  );

  const handleStatusChange = useCallback((value: string[]) => {
    setStatusFilter(value);
    const status = value.length > 0 ? value[0] : "all";
    navigate(`/app/configurations?status=${status}&page=1`);
  }, [navigate]);

  const handlePageChange = (newPage: number) => {
    const status = statusFilter.length > 0 ? statusFilter[0] : "all";
    navigate(`/app/configurations?status=${status}&page=${newPage}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ordered":
        return <Badge tone="success">Ordered</Badge>;
      case "saved":
        return <Badge tone="info">Saved</Badge>;
      case "draft":
        return <Badge tone="warning">Draft</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const filters = [
    {
      key: "status",
      label: "Status",
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: "Ordered", value: "ordered" },
            { label: "Saved", value: "saved" },
            { label: "Draft", value: "draft" },
          ]}
          selected={statusFilter}
          onChange={handleStatusChange}
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = statusFilter.length > 0
    ? [
        {
          key: "status",
          label: `Status: ${statusFilter[0]}`,
          onRemove: () => handleStatusChange([]),
        },
      ]
    : [];

  return (
    <Page title="Configuration Orders" subtitle="View configured product orders ready for fulfillment">
      <TitleBar title="Configuration Orders" />
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <Box padding="400">
              <Filters
                filters={filters}
                appliedFilters={appliedFilters}
                onClearAll={() => handleStatusChange([])}
                queryValue=""
                onQueryChange={() => {}}
                onQueryClear={() => {}}
              />
            </Box>

            {configurations.length === 0 ? (
              <Box padding="400">
                <EmptyState
                  heading="No configuration orders yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    When customers place orders with configured products,
                    their configuration details will appear here for fulfillment.
                  </p>
                </EmptyState>
              </Box>
            ) : (
              <BlockStack gap="0">
                {configurations.map((config) => (
                  <Box
                    key={config.id}
                    padding="400"
                    borderBlockEndWidth="025"
                    borderColor="border"
                  >
                    <InlineStack align="space-between" blockAlign="start">
                      <InlineStack gap="400" blockAlign="start">
                        {/* Preview Image */}
                        <Box
                          minWidth="80px"
                          minHeight="80px"
                          background="bg-surface-secondary"
                          borderRadius="200"
                          overflowX="hidden"
                          overflowY="hidden"
                        >
                          {config.previewImageUrl ? (
                            <img
                              src={config.previewImageUrl}
                              alt="Configuration preview"
                              style={{
                                width: "80px",
                                height: "80px",
                                objectFit: "cover",
                                borderRadius: "8px",
                              }}
                            />
                          ) : (
                            <Box
                              padding="400"
                              minWidth="80px"
                              minHeight="80px"
                            >
                              <Text as="span" tone="subdued" variant="bodySm">
                                No image
                              </Text>
                            </Box>
                          )}
                        </Box>

                        {/* Configuration Details */}
                        <BlockStack gap="100">
                          <InlineStack gap="200" blockAlign="center">
                            <Text as="h3" variant="headingSm">
                              {config.product3D?.name || "Unknown Product"}
                            </Text>
                            {getStatusBadge(config.status)}
                          </InlineStack>

                          <InlineStack gap="300">
                            {config.colorName && (
                              <InlineStack gap="100" blockAlign="center">
                                <Box
                                  minWidth="16px"
                                  minHeight="16px"
                                  borderRadius="100"
                                  background="bg-surface"
                                  overflowX="hidden"
                                  overflowY="hidden"
                                >
                                  <div
                                    style={{
                                      width: "16px",
                                      height: "16px",
                                      backgroundColor: config.colorHex || "#ccc",
                                      borderRadius: "4px",
                                      border: "1px solid #ddd",
                                    }}
                                  />
                                </Box>
                                <Text as="span" variant="bodySm">
                                  {config.colorName}
                                </Text>
                              </InlineStack>
                            )}
                            {config.materialName && (
                              <Text as="span" variant="bodySm" tone="subdued">
                                Material: {config.materialName}
                              </Text>
                            )}
                          </InlineStack>

                          <InlineStack gap="300">
                            <Text as="span" variant="bodySm" tone="subdued">
                              {formatDate(config.createdAt)}
                            </Text>
                            {config.customerEmail && (
                              <Text as="span" variant="bodySm" tone="subdued">
                                {config.customerEmail}
                              </Text>
                            )}
                            {config.shopifyOrderName && (
                              <Text as="span" variant="bodySm">
                                Order: {config.shopifyOrderName}
                              </Text>
                            )}
                          </InlineStack>
                        </BlockStack>
                      </InlineStack>

                      {/* Price and Actions */}
                      <BlockStack gap="200" inlineAlign="end">
                        <Text as="span" variant="headingMd">
                          {formatPrice(config.totalPrice)}
                        </Text>
                        <Button
                          size="slim"
                          url={`/app/configurations/${config.id}`}
                        >
                          View Details
                        </Button>
                      </BlockStack>
                    </InlineStack>
                  </Box>
                ))}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Box padding="400">
                    <InlineStack align="center">
                      <Pagination
                        hasPrevious={pagination.hasPrev}
                        onPrevious={() => handlePageChange(pagination.page - 1)}
                        hasNext={pagination.hasNext}
                        onNext={() => handlePageChange(pagination.page + 1)}
                      />
                    </InlineStack>
                    <Box paddingBlockStart="200">
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        Showing {((pagination.page - 1) * PAGE_SIZE) + 1} - {Math.min(pagination.page * PAGE_SIZE, pagination.totalCount)} of {pagination.totalCount} configurations
                      </Text>
                    </Box>
                  </Box>
                )}
              </BlockStack>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
