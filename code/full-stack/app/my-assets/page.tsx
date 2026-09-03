"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { AssetCheckout, MyAssets } from "../types";

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
  const [assets, setAssets] = useState<MyAssets[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      const response = await fetch("/api/assets/get/mine");

      if (!response.ok) {
        setError("Failed to load your assets.");
        return;
      }

      const rows = (await response.json()) as unknown;

      if (!Array.isArray(rows)) {
        setError("Received unexpected data from the server.");
        return;
      }

      setError(null);
      setAssets(rows as MyAssets[]);
    } catch (err) {
      console.error(err);
      setError("Failed to load your assets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    const evtSource = new EventSource("/api/sse");
    evtSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string };
        if (
          payload.type === "APPROVE" ||
          payload.type === "RETURNED" ||
          payload.type === "REQUEST_CREATED"
        ) {
          fetchAssets();
        }
      } catch {
        // Ignore malformed event payloads.
      }
    };

    return () => evtSource.close();
  }, [fetchAssets]);

  return (
    <DashboardShell>
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">My Assets</h1>
        <p className="mt-2 text-sm text-gray-600">
          Assets currently checked out to your account.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Asset</th>
                <th className="px-3 py-2 font-semibold">Rent Length</th>
                <th className="px-3 py-2 font-semibold">Checked Out</th>
                <th className="px-3 py-2 font-semibold">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    className="px-3 py-4 text-center text-gray-500"
                    colSpan={4}
                  >
                    Loading your assets...
                  </td>
                </tr>
              )}

              {!loading && assets.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-4 text-center text-gray-500"
                    colSpan={4}
                  >
                    You currently have no active assets.
                  </td>
                </tr>
              )}

              {!loading &&
                assets.map((asset) => (
                  <tr
                    key={asset.checkout_id}
                    className="border-t border-gray-200"
                  >
                    <td className="px-3 py-2">
                      {asset.asset ?? "Unknown Asset"}
                    </td>
                    <td className="px-3 py-2">{asset.checkout_length}</td>
                    <td className="px-3 py-2">
                      {safeDate(asset.request_date)}
                    </td>
                    <td className="px-3 py-2">{safeDate(asset.due_date)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
