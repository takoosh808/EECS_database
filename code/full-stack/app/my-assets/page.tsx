"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { AssetCheckout } from "../types";

type ApiAsset = {
  id: string;
  name: string;
};

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

export default function MyAssetsPage() {
  const [requests, setRequests] = useState<AssetCheckout[]>([]);
  const [assetNameById, setAssetNameById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssetNames = useCallback(async () => {
    try {
      const response = await fetch("/api/assets/get");
      if (!response.ok) {
        return;
      }
      const rows = (await response.json()) as unknown;
      if (!Array.isArray(rows)) {
        return;
      }
      const map = (rows as ApiAsset[]).reduce(
        (acc, asset) => {
          acc[asset.id] = asset.name;
          return acc;
        },
        {} as Record<string, string>
      );
      setAssetNameById(map);
    } catch {
      setAssetNameById({});
    }
  }, []);

  const fetchMyRequests = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/requests/mine");
      if (!response.ok) {
        throw new Error("Failed to load your assets.");
      }
      const data = (await response.json()) as unknown;
      setRequests(Array.isArray(data) ? (data as AssetCheckout[]) : []);
    } catch (err) {
      setError((err as Error).message || "Failed to load your assets.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();
    fetchAssetNames();
  }, [fetchMyRequests, fetchAssetNames]);

  useEffect(() => {
    const evtSource = new EventSource("/api/sse");
    evtSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string };
        if (payload.type === "APPROVE" || payload.type === "RETURNED" || payload.type === "REQUEST_CREATED") {
          fetchMyRequests();
        }
      } catch {
        // Ignore malformed event payloads.
      }
    };

    return () => evtSource.close();
  }, [fetchMyRequests]);

  const activeAssets = useMemo(
    () => requests.filter((request) => request.checkout_status === "ACTIVE"),
    [requests]
  );

  return (
    <DashboardShell>
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">My Assets</h1>
        <p className="mt-2 text-sm text-gray-600">Assets currently checked out to your account.</p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Asset</th>
                <th className="px-3 py-2 font-semibold">Asset ID</th>
                <th className="px-3 py-2 font-semibold">Checked Out</th>
                <th className="px-3 py-2 font-semibold">Request ID</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={5}>
                    Loading your assets...
                  </td>
                </tr>
              )}

              {!loading && activeAssets.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={5}>
                    You currently have no active assets.
                  </td>
                </tr>
              )}

              {!loading &&
                activeAssets.map((asset) => (
                  <tr key={asset.id} className="border-t border-gray-200">
                    <td className="px-3 py-2">{assetNameById[asset.asset_id] ?? "Unknown Asset"}</td>
                    <td className="px-3 py-2">{asset.asset_id}</td>
                    <td className="px-3 py-2">{safeDate(asset.request_date)}</td>
                    <td className="px-3 py-2">{asset.id}</td>
                    <td className="px-3 py-2 text-gray-500">-</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
