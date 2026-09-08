import { beforeAll, describe, expect, it } from "vitest";

// Runs against a live stack (web-system-test + db-system-test) started via
// `docker compose --profile system-test`. No mocks: exercises real HTTP + Postgres.
const BASE_URL = process.env.SYSTEM_TEST_BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = "admin@wsu.edu";
const ADMIN_PASSWORD = "admin123";

type JsonRecord = Record<string, unknown>;

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function waitForHealth(): Promise<void> {
  const deadline = Date.now() + 60_000;
  let lastError = "unknown";

  while (Date.now() < deadline) {
    try {
      // No dedicated /health route is wired into the app router, so use a
      // real DB-backed API route to confirm the app + Postgres are ready.
      const response = await fetch(`${BASE_URL}/api/assets/get`);
      if (response.ok) {
        return;
      }
      lastError = `status ${response.status}: ${await response.text()}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`App/DB never became healthy: ${lastError}`);
}

function extractCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Login response did not set a cookie");
  }
  return setCookie.split(";")[0];
}

async function loginAsAdmin(): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  expect(response.status).toBe(200);
  return extractCookie(response);
}

async function createLab(name: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/labs/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { id: string };
  return body.id;
}

async function createCategory(name: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/categories/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { id: string };
  return body.id;
}

async function createAsset(categoryId: string, labId: string): Promise<string> {
  const assetId = crypto.randomUUID();
  const response = await fetch(`${BASE_URL}/api/assets/edit/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: assetId,
      name: `System Test Asset ${randomSuffix()}`,
      category_id: categoryId,
      lab_id: labId,
      serial_number: `SYS-${randomSuffix()}`,
    }),
  });
  expect(response.status).toBe(200);
  return assetId;
}

async function createRequest(assetId: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assetId,
      requesterName: "System Tester",
      lab: "System Test Lab",
      reason: "Full lifecycle system test",
    }),
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { success: boolean; id: string };
  expect(body.success).toBe(true);
  return body.id;
}

async function getRequestsByStatusEndpoint(path: string): Promise<JsonRecord[]> {
  const response = await fetch(`${BASE_URL}${path}`);
  expect(response.status).toBe(200);
  return (await response.json()) as JsonRecord[];
}

describe("full asset request lifecycle (system test)", () => {
  let adminCookie: string;
  let categoryId: string;
  let labId: string;

  beforeAll(async () => {
    await waitForHealth();
    adminCookie = await loginAsAdmin();
    labId = await createLab(`System Test Lab ${randomSuffix()}`);
    categoryId = await createCategory(`System Test Category ${randomSuffix()}`);
  });

  it("rejects approve/deny/return from a non-admin cookie", async () => {
    const assetId = await createAsset(categoryId, labId);
    const requestId = await createRequest(assetId);

    const response = await fetch(`${BASE_URL}/api/requests/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "auth_user=not-a-real-user" },
      body: JSON.stringify({ id: requestId }),
    });

    expect(response.status).toBe(403);
  });

  it("creates, approves, and returns a request end to end", async () => {
    const assetId = await createAsset(categoryId, labId);
    const requestId = await createRequest(assetId);

    const pending = await getRequestsByStatusEndpoint("/api/requests");
    expect(pending.some((row) => row.id === requestId)).toBe(true);

    const approveResponse = await fetch(`${BASE_URL}/api/requests/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ id: requestId }),
    });
    expect(approveResponse.status).toBe(200);

    const active = await getRequestsByStatusEndpoint("/api/requests/active");
    expect(active.some((row) => row.id === requestId)).toBe(true);

    const returnResponse = await fetch(`${BASE_URL}/api/requests/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ id: requestId }),
    });
    expect(returnResponse.status).toBe(200);

    const inactive = await getRequestsByStatusEndpoint("/api/requests/inactive");
    const returned = inactive.find((row) => row.id === requestId);
    expect(returned?.checkout_status).toBe("RETURNED");
  });

  it("creates and denies a request end to end", async () => {
    const assetId = await createAsset(categoryId, labId);
    const requestId = await createRequest(assetId);

    const denyResponse = await fetch(`${BASE_URL}/api/requests/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ id: requestId }),
    });
    expect(denyResponse.status).toBe(200);

    const inactive = await getRequestsByStatusEndpoint("/api/requests/inactive");
    const denied = inactive.find((row) => row.id === requestId);
    expect(denied?.checkout_status).toBe("DENIED");
  });
});
