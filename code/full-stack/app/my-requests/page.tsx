"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { AssetCheckout } from "../types";

type RequestStatus = AssetCheckout["checkout_status"] | "DENIED";

function safeDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleDateString();
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<AssetCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyRequests = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/requests/mine");
      if (!response.ok) {
        throw new Error("Failed to load your requests.");
      }
      const data = (await response.json()) as unknown;
      setRequests(Array.isArray(data) ? (data as AssetCheckout[]) : []);
    } catch (err) {
      setError((err as Error).message || "Failed to load your requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  useEffect(() => {
    const evtSource = new EventSource("/api/sse");
    evtSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string };
        if (
          payload.type === "REQUEST_CREATED" ||
          payload.type === "APPROVE" ||
          payload.type === "DENIED" ||
          payload.type === "RETURNED"
        ) {
          fetchMyRequests();
        }
      } catch {
        // Ignore malformed event payloads.
      }
    };

    return () => evtSource.close();
  }, [fetchMyRequests]);

  const statusCounts = useMemo(() => {
    return requests.reduce(
      (acc, req) => {
        const status = req.checkout_status as RequestStatus;
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {} as Record<RequestStatus, number>
    );
  }, [requests]);

  return (
    <DashboardShell>
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">My Requests</h1>
        <p className="mt-2 text-sm text-gray-600">
          View your pending, approved, denied, and returned asset requests.
        </p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="rounded-md bg-gray-100 px-2 py-1">All: {requests.length}</span>
          <span className="rounded-md bg-yellow-100 px-2 py-1">Pending: {statusCounts.PENDING ?? 0}</span>
          <span className="rounded-md bg-green-100 px-2 py-1">Active: {statusCounts.ACTIVE ?? 0}</span>
          <span className="rounded-md bg-red-100 px-2 py-1">Denied: {statusCounts.DENIED ?? 0}</span>
          <span className="rounded-md bg-blue-100 px-2 py-1">Returned: {statusCounts.RETURNED ?? 0}</span>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Request ID</th>
                <th className="px-3 py-2 font-semibold">Asset ID</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Requested</th>
                <th className="px-3 py-2 font-semibold">Returned</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={5}>
                    Loading your requests...
                  </td>
                </tr>
              )}

              {!loading && requests.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={5}>
                    You do not have any requests yet.
                  </td>
                </tr>
              )}

              {!loading &&
                requests.map((req) => (
                  <tr key={req.id} className="border-t border-gray-200">
                    <td className="px-3 py-2">{req.id}</td>
                    <td className="px-3 py-2">{req.asset_id}</td>
                    <td className="px-3 py-2">{req.checkout_status}</td>
                    <td className="px-3 py-2">{safeDate(req.request_date)}</td>
                    <td className="px-3 py-2">{safeDate(req.returned_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
