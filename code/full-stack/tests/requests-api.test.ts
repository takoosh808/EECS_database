import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createRequest } from "../app/api/requests/route";
import { POST as approveRequest } from "../app/api/requests/approve/route";
import { POST as denyRequest } from "../app/api/requests/deny/route";
import { POST as returnRequest } from "../app/api/requests/return/route";
import pool from "../db/init/db_index";
import { broadcastEvent } from "../app/api/sse/route";

vi.mock("../db/init/db_index", () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock("../app/api/sse/route", () => ({
  broadcastEvent: vi.fn(),
}));

function makeRequest(body: Record<string, unknown>, authUser?: string) {
  return {
    json: async () => body,
    cookies: {
      get: (name: string) => (name === "auth_user" ? { value: authUser ?? "" } : undefined),
    },
  } as any;
}

describe("create request route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when assetId is missing", async () => {
    const response = await createRequest(makeRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "assetId is required" });
  });

  it("creates a pending request and records the reason message", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ data_type: "uuid" }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: "req-123" }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    const response = await createRequest(
      makeRequest(
        {
          assetId: "asset-456",
          requesterName: "Jane Doe",
          lab: "Lab 3",
          reason: "Needed for instrumentation",
        },
        "user-99"
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, id: "req-123" });
    expect(vi.mocked(pool.query)).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO asset_checkout"),
      ["asset-456", "user-99"]
    );
    expect(vi.mocked(pool.query)).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("INSERT INTO asset_checkout_messages"),
      ["req-123", "Name: Jane Doe | Lab: Lab 3 | Reason: Needed for instrumentation"]
    );
    expect(vi.mocked(broadcastEvent)).toHaveBeenCalledWith({ type: "REQUEST_CREATED", requestId: "req-123" });
  });
});

describe("approve request route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin users", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);

    const response = await approveRequest(makeRequest({ id: "req-1" }, "user-1"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized: Admin access required" });
  });

  it("updates a pending request to ACTIVE", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ role: "admin" }] } as any)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ checkout_status: "PENDING" }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    const response = await approveRequest(makeRequest({ id: "req-1" }, "admin-1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(vi.mocked(pool.query)).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("UPDATE asset_checkout"),
      ["ACTIVE", "req-1"]
    );
    expect(vi.mocked(broadcastEvent)).toHaveBeenCalledWith({ type: "APPROVE", requestId: "req-1" });
  });

  it("rejects requests that are already processed", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ role: "admin" }] } as any)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ checkout_status: "ACTIVE" }] } as any);

    const response = await approveRequest(makeRequest({ id: "req-1" }, "admin-1"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Request already processed" });
  });
});

describe("deny request route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a pending request to DENIED", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ role: "admin" }] } as any)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ checkout_status: "PENDING" }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    const response = await denyRequest(makeRequest({ id: "req-2" }, "admin-1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(vi.mocked(pool.query)).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("UPDATE asset_checkout"),
      ["DENIED", "req-2"]
    );
    expect(vi.mocked(broadcastEvent)).toHaveBeenCalledWith({ type: "DENIED", requestId: "req-2" });
  });
});

describe("return request route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin users", async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [] } as any);

    const response = await returnRequest(makeRequest({ id: "req-3" }, "user-1"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized: Admin access required" });
  });

  it("marks a valid request as RETURNED", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ role: "admin" }] } as any)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ checkout_status: "ACTIVE" }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any);

    const response = await returnRequest(makeRequest({ id: "req-3" }, "admin-1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(vi.mocked(pool.query)).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("UPDATE asset_checkout"),
      ["RETURNED", "req-3"]
    );
    expect(vi.mocked(broadcastEvent)).toHaveBeenCalledWith({ type: "RETURNED", requestId: "req-3" });
  });

  it("rejects an already returned request", async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [{ role: "admin" }] } as any)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ checkout_status: "RETURNED" }] } as any);

    const response = await returnRequest(makeRequest({ id: "req-3" }, "admin-1"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Request already processed" });
  });
});
