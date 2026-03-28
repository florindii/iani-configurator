import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db before importing the module under test
vi.mock("../../db.server", () => ({
  default: {
    shop: { findUnique: vi.fn() },
  },
  db: {
    shop: { findUnique: vi.fn() },
  },
}));

import {
  checkRateLimit,
  validateShop,
  rateLimitResponse,
  forbiddenResponse,
  _clearRateLimitStore,
} from "../api-security.server";
import db from "../../db.server";

const mockDb = db as { shop: { findUnique: ReturnType<typeof vi.fn> } };

function makeRequest(ip = "1.2.3.4"): Request {
  return new Request("https://example.com/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

// ── checkRateLimit ────────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  beforeEach(() => {
    _clearRateLimitStore();
  });

  it("allows the first request", () => {
    expect(checkRateLimit(makeRequest(), "test", 5)).toBe(true);
  });

  it("allows requests up to the limit", () => {
    const req = makeRequest("10.0.0.1");
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(req, "endpoint", 5)).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    const req = makeRequest("10.0.0.2");
    for (let i = 0; i < 5; i++) checkRateLimit(req, "endpoint", 5);
    expect(checkRateLimit(req, "endpoint", 5)).toBe(false);
  });

  it("tracks different IPs independently", () => {
    const req1 = makeRequest("192.168.1.1");
    const req2 = makeRequest("192.168.1.2");

    for (let i = 0; i < 5; i++) checkRateLimit(req1, "endpoint", 5);
    // req1 is now blocked, but req2 should still pass
    expect(checkRateLimit(req1, "endpoint", 5)).toBe(false);
    expect(checkRateLimit(req2, "endpoint", 5)).toBe(true);
  });

  it("tracks different endpoints independently for the same IP", () => {
    const req = makeRequest("10.0.0.3");
    for (let i = 0; i < 3; i++) checkRateLimit(req, "endpoint-a", 3);

    expect(checkRateLimit(req, "endpoint-a", 3)).toBe(false);
    expect(checkRateLimit(req, "endpoint-b", 3)).toBe(true);
  });

  it("falls back to 'unknown' ip when no forwarded header", () => {
    const req = new Request("https://example.com/api/test");
    expect(checkRateLimit(req, "test", 3)).toBe(true);
  });
});

// ── validateShop ──────────────────────────────────────────────────────────────

describe("validateShop", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false for null", async () => {
    expect(await validateShop(null)).toBe(false);
  });

  it("returns false for undefined", async () => {
    expect(await validateShop(undefined)).toBe(false);
  });

  it("returns false for non-myshopify domain", async () => {
    expect(await validateShop("evil.com")).toBe(false);
    expect(mockDb.shop.findUnique).not.toHaveBeenCalled();
  });

  it("returns false when shop not in DB", async () => {
    mockDb.shop.findUnique.mockResolvedValue(null);
    expect(await validateShop("unknown.myshopify.com")).toBe(false);
  });

  it("returns true when shop is registered in DB", async () => {
    mockDb.shop.findUnique.mockResolvedValue({ shopDomain: "legit.myshopify.com" });
    expect(await validateShop("legit.myshopify.com")).toBe(true);
  });
});

// ── Response helpers ──────────────────────────────────────────────────────────

describe("rateLimitResponse", () => {
  it("returns 429 status", () => {
    const res = rateLimitResponse();
    expect(res.status).toBe(429);
  });

  it("includes Retry-After header", () => {
    const res = rateLimitResponse();
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("merges extra CORS headers", () => {
    const res = rateLimitResponse({ "Access-Control-Allow-Origin": "*" });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("forbiddenResponse", () => {
  it("returns 403 status", () => {
    const res = forbiddenResponse();
    expect(res.status).toBe(403);
  });

  it("uses custom message", () => {
    const res = forbiddenResponse("Custom error");
    expect(res.status).toBe(403);
  });
});
