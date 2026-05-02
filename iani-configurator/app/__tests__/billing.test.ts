import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db before importing billing.server
vi.mock("../db.server", () => ({
  default: {
    shop: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    product3D: { count: vi.fn() },
  },
  db: {
    shop: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    product3D: { count: vi.fn() },
  },
}));

import { PLANS, hasFeatureAccess, canAddProduct } from "../billing.server";
import { db } from "../db.server";

const mockDb = db as {
  shop: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  product3D: { count: ReturnType<typeof vi.fn> };
};

// ── PLANS data ────────────────────────────────────────────────────────────────

describe("PLANS", () => {
  it("free plan: 1 product, no tryOn, no spaceAr, has watermark", () => {
    expect(PLANS.free.productLimit).toBe(1);
    expect(PLANS.free.features.tryOnEnabled).toBe(false);
    expect(PLANS.free.features.spaceArEnabled).toBe(false);
    expect(PLANS.free.features.watermark).toBe(true);
    expect(PLANS.free.price).toBe(0);
  });

  it("starter plan: 3 products, no tryOn, no spaceAr", () => {
    expect(PLANS.starter.productLimit).toBe(3);
    expect(PLANS.starter.features.tryOnEnabled).toBe(false);
    expect(PLANS.starter.features.spaceArEnabled).toBe(false);
    expect(PLANS.starter.price).toBe(19);
  });

  it("pro plan: unlimited products, tryOn enabled, no spaceAr", () => {
    expect(PLANS.pro.productLimit).toBe(-1);
    expect(PLANS.pro.features.tryOnEnabled).toBe(true);
    expect(PLANS.pro.features.spaceArEnabled).toBe(false);
    expect(PLANS.pro.price).toBe(49);
  });

  it("business plan: unlimited products, tryOn + spaceAr + prioritySupport", () => {
    expect(PLANS.business.productLimit).toBe(-1);
    expect(PLANS.business.features.tryOnEnabled).toBe(true);
    expect(PLANS.business.features.spaceArEnabled).toBe(true);
    expect(PLANS.business.features.prioritySupport).toBe(true);
    expect(PLANS.business.price).toBe(99);
  });

});

// ── hasFeatureAccess ──────────────────────────────────────────────────────────

describe("hasFeatureAccess", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true for watermark on free plan (no subscription needed)", async () => {
    mockDb.shop.findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      plan: "free",
      subscriptionStatus: "none",
    });

    const result = await hasFeatureAccess("test.myshopify.com", "watermark");
    expect(result).toBe(true);
  });

  it("returns false for tryOnEnabled on free plan", async () => {
    mockDb.shop.findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      plan: "free",
      subscriptionStatus: "none",
    });

    const result = await hasFeatureAccess("test.myshopify.com", "tryOnEnabled");
    expect(result).toBe(false);
  });

  it("returns true for tryOnEnabled on pro plan with active subscription", async () => {
    mockDb.shop.findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      plan: "pro",
      subscriptionStatus: "active",
    });

    const result = await hasFeatureAccess("test.myshopify.com", "tryOnEnabled");
    expect(result).toBe(true);
  });

  it("returns false for tryOnEnabled on pro plan with cancelled subscription", async () => {
    mockDb.shop.findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      plan: "pro",
      subscriptionStatus: "cancelled",
    });

    const result = await hasFeatureAccess("test.myshopify.com", "tryOnEnabled");
    expect(result).toBe(false);
  });

  it("returns true for spaceArEnabled only on business plan", async () => {
    mockDb.shop.findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      plan: "business",
      subscriptionStatus: "active",
    });

    const result = await hasFeatureAccess("test.myshopify.com", "spaceArEnabled");
    expect(result).toBe(true);
  });

  it("returns false for spaceArEnabled on pro plan", async () => {
    mockDb.shop.findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      plan: "pro",
      subscriptionStatus: "active",
    });

    const result = await hasFeatureAccess("test.myshopify.com", "spaceArEnabled");
    expect(result).toBe(false);
  });

  it("creates shop record if not found and returns free plan access", async () => {
    mockDb.shop.findUnique.mockResolvedValue(null);
    mockDb.shop.create.mockResolvedValue({
      shopDomain: "new.myshopify.com",
      plan: "free",
      subscriptionStatus: "none",
    });

    const result = await hasFeatureAccess("new.myshopify.com", "tryOnEnabled");
    expect(mockDb.shop.create).toHaveBeenCalledOnce();
    expect(result).toBe(false);
  });
});

// ── canAddProduct ─────────────────────────────────────────────────────────────

describe("canAddProduct", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true for pro plan (unlimited)", async () => {
    mockDb.shop.findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      plan: "pro",
      subscriptionStatus: "active",
    });

    const result = await canAddProduct("test.myshopify.com");
    expect(result).toBe(true);
    expect(mockDb.product3D.count).not.toHaveBeenCalled();
  });

  it("returns true for free plan when under the 1-product limit", async () => {
    mockDb.shop.findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      plan: "free",
      subscriptionStatus: "none",
    });
    mockDb.product3D.count.mockResolvedValue(0);

    const result = await canAddProduct("test.myshopify.com");
    expect(result).toBe(true);
  });

  it("returns false for free plan when at the 1-product limit", async () => {
    mockDb.shop.findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      plan: "free",
      subscriptionStatus: "none",
    });
    mockDb.product3D.count.mockResolvedValue(1);

    const result = await canAddProduct("test.myshopify.com");
    expect(result).toBe(false);
  });

  it("returns false for starter plan when at the 3-product limit", async () => {
    mockDb.shop.findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      plan: "starter",
      subscriptionStatus: "active",
    });
    mockDb.product3D.count.mockResolvedValue(3);

    const result = await canAddProduct("test.myshopify.com");
    expect(result).toBe(false);
  });

  it("returns true for starter plan when under the 3-product limit", async () => {
    mockDb.shop.findUnique.mockResolvedValue({
      shopDomain: "test.myshopify.com",
      plan: "starter",
      subscriptionStatus: "active",
    });
    mockDb.product3D.count.mockResolvedValue(2);

    const result = await canAddProduct("test.myshopify.com");
    expect(result).toBe(true);
  });
});
