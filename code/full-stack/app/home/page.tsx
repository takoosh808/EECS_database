"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { AssetRow } from "@/app/types";
import { Asset } from "@/app/types";

type ActiveCheckout = {
  asset_id: string;
  user_id: string;
  request_date: string | null;
};

const CHECKOUT_LENGTH_OPTIONS = [
  { value: "1_month", label: "One Month", months: 1, weeks: 4 },
  { value: "1_semester", label: "One Semester", months: 4, weeks: 16 },
  { value: "2_semesters", label: "Two Semesters", months: 8, weeks: 32 },
  { value: "1_year", label: "One Year", months: 12, weeks: 52 },
] as const;

function formatCheckoutRange(months?: number, weeks?: number) {
  const start = new Date();
  const end = new Date(start);

  if (months) {
    end.setMonth(end.getMonth() + months);
  } else if (weeks) {
    end.setDate(end.getDate() + weeks * 7);
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return {
    range: `${fmt(start)} - ${fmt(end)}`,
    dueDate: end,
  };
}

export function filterAssets(
  assets: AssetRow[],
  searchQuery: string,
  onlyRentedOut: boolean,
) {
  const normalized = searchQuery.trim().toLowerCase();

  return assets.filter((asset) => {
    if (onlyRentedOut && !asset.rentedOut) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    const haystack = [asset.name, asset.location, asset.rentedTo ?? ""]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export default function UserHomePage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [onlyRentedOut, setOnlyRentedOut] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null);
  const [requestAsset, setRequestAsset] = useState<AssetRow | null>(null);
  const [checkoutLength, setCheckoutLength] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestConfirmationByAsset, setRequestConfirmationByAsset] = useState<
    Record<string, string>
  >({});
  const [dueDate, setDueDate] = useState<Date>();

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardAssets() {
      try {
        const [assetsResponse, activeResponse] = await Promise.all([
          fetch("/api/assets/get"),
          fetch("/api/requests/active"),
        ]);

        if (!assetsResponse.ok || !activeResponse.ok) {
          return;
        }

        const rows = (await assetsResponse.json()) as Asset[];
        const activeRowsRaw = (await activeResponse.json()) as unknown;
        const activeRows = Array.isArray(activeRowsRaw)
          ? (activeRowsRaw as ActiveCheckout[])
          : [];

        const activeByAssetId = new Map(
          activeRows.map((row) => [row.asset_id, row]),
        );

        const mapped: AssetRow[] = rows.map((row) => {
          const active = activeByAssetId.get(row.asset_id);

          return {
            id: row.asset_id,
            name: row.name,
            location: row.location,
            rentedOut: Boolean(active),
            rentedTo: active?.user_id ?? null,
            rentedOutAt: active?.request_date ?? null,
            description: `Serial: ${row.serial_number}`,
          };
        });
        if (!cancelled && mapped.length > 0) {
          setAssets(mapped);
        }
      } catch {
        // Keep sample assets if backend is unavailable.
      }
    }

    loadDashboardAssets();

    const evtSource = new EventSource("/api/sse");
    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type?: string };
        if (
          data.type === "APPROVE" ||
          data.type === "RETURNED" ||
          data.type === "ADD_ASSET" ||
          data.type === "REMOVE_ASSET"
        ) {
          loadDashboardAssets();
        }
      } catch {
        // Ignore malformed event payloads.
      }
    };

    return () => {
      cancelled = true;
      evtSource.close();
    };
  }, []);

  const filteredAssets = useMemo(
    () => filterAssets(assets, searchQuery, onlyRentedOut),
    [assets, searchQuery, onlyRentedOut],
  );

  // Recomputed whenever the selected checkout length changes, so the
  // displayed range always reflects "now" through the chosen end date.
  const selectedRange = useMemo(() => {
    const selectedOption = CHECKOUT_LENGTH_OPTIONS.find(
      (option) => option.value === checkoutLength,
    );
    if (!selectedOption) {
      return null;
    }
    return formatCheckoutRange(selectedOption.months, selectedOption.weeks);
  }, [checkoutLength]);

  return (
    <DashboardShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 py-2">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Asset Dashboard</h1>
          <p className="text-sm text-gray-600">
            Search, filter, and browse assets. Click Details to view a full
            description.
          </p>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search assets, location, or renter"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />

            <button
              type="button"
              onClick={() => setShowFilters((previous) => !previous)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <input
                id="only-rented"
                type="checkbox"
                checked={onlyRentedOut}
                onChange={(event) => setOnlyRentedOut(event.target.checked)}
              />
              <label htmlFor="only-rented">Show only rented-out assets</label>
            </div>
          )}
        </section>

        <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Asset Name</th>
                <th className="px-4 py-3 font-semibold">Asset Location</th>
                <th className="px-4 py-3 font-semibold">Rented Out</th>
                <th className="px-4 py-3 font-semibold">Rented Out To</th>
                <th className="px-4 py-3 font-semibold">Rented Out Date</th>
                <th className="px-4 py-3 font-semibold">Details</th>
                <th className="px-4 py-3 font-semibold">Request Asset</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-gray-500"
                    colSpan={7}
                  >
                    No assets match your search/filter.
                  </td>
                </tr>
              )}

              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="border-t border-gray-200">
                  <td className="px-4 py-3">{asset.name}</td>
                  <td className="px-4 py-3">{asset.location}</td>
                  <td className="px-4 py-3">
                    {asset.rentedOut ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3">{asset.rentedTo ?? "-"}</td>
                  <td className="px-4 py-3">{asset.rentedOutAt ?? "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedAsset(asset)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                    >
                      View Details
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (asset.rentedOut) {
                          return;
                        }
                        setRequestAsset(asset);
                        setRequestError(null);
                      }}
                      disabled={asset.rentedOut}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {asset.rentedOut ? "Unavailable" : "Request Asset"}
                    </button>
                    {requestConfirmationByAsset[asset.id] && (
                      <p className="mt-2 text-xs text-green-700">
                        {requestConfirmationByAsset[asset.id]}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg">
            <h2 className="text-xl font-semibold">{selectedAsset.name}</h2>
            <p className="mt-2 text-sm text-gray-700">
              {selectedAsset.description}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <p>
                <span className="font-medium">Location:</span>{" "}
                {selectedAsset.location}
              </p>
              <p>
                <span className="font-medium">Rented:</span>{" "}
                {selectedAsset.rentedOut ? "Yes" : "No"}
              </p>
              <p>
                <span className="font-medium">Rented To:</span>{" "}
                {selectedAsset.rentedTo ?? "-"}
              </p>
              <p>
                <span className="font-medium">Rented On:</span>{" "}
                {selectedAsset.rentedOutAt ?? "-"}
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {requestAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg">
            <h2 className="text-xl font-semibold">Request Asset</h2>
            <p className="mt-1 text-sm text-gray-700">
              Asset: {requestAsset.name}
            </p>

            <form
              className="mt-4 space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setRequestError(null);

                try {
                  setRequestSubmitting(true);
                  const response = await fetch("/api/requests", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      assetId: requestAsset.id,
                      requestReason,
                      checkoutLength,
                      dueDate,
                    }),
                  });

                  const payload = (await response.json()) as { error?: string };
                  if (!response.ok) {
                    throw new Error(
                      payload.error ?? "Failed to submit request.",
                    );
                  }

                  setRequestConfirmationByAsset((previous) => ({
                    ...previous,
                    [requestAsset.id]: "Request submitted successfully.",
                  }));
                  setRequestAsset(null);
                } catch (error) {
                  setRequestError(
                    (error as Error).message || "Failed to submit request.",
                  );
                } finally {
                  setRequestSubmitting(false);
                }
              }}
            >
              <div>
                <label
                  htmlFor="checkout-length"
                  className="mb-1 block text-sm font-medium text-gray-800"
                >
                  Checkout Length
                </label>
                <select
                  id="checkout-length"
                  value={checkoutLength}
                  onChange={(event) => {
                    const selectedOption = CHECKOUT_LENGTH_OPTIONS.find(
                      (option) => option.value === event.target.value,
                    );

                    if (!selectedOption) return;

                    const computed = formatCheckoutRange(
                      selectedOption.months,
                      selectedOption.weeks,
                    );

                    setCheckoutLength(event.target.value);
                    setDueDate(computed.dueDate);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                >
                  <option value="" disabled>
                    Select a checkout length
                  </option>

                  {CHECKOUT_LENGTH_OPTIONS.map((option) => {
                    const { range } = formatCheckoutRange(
                      option.months,
                      option.weeks,
                    );

                    return (
                      <option key={option.value} value={option.value}>
                        {option.label} ({range})
                      </option>
                    );
                  })}
                </select>

                {selectedRange && (
                  <p className="mt-1 text-xs text-gray-600">
                    {selectedRange.range}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="request-reason"
                  className="mb-1 block text-sm font-medium text-gray-800"
                >
                  Reason For Request
                </label>
                <textarea
                  id="request-reason"
                  value={requestReason}
                  onChange={(event) => setRequestReason(event.target.value)}
                  className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="Brief reason for requesting this asset"
                />
              </div>

              {requestError && (
                <p className="text-sm text-red-600">{requestError}</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRequestAsset(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestSubmitting}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  {requestSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
