"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";

type AssetRow = {
  id: string;
  name: string;
  location: string;
  rentedOut: boolean;
  rentedTo: string | null;
  rentedOutAt: string | null;
  description: string;
};

type ApiAsset = {
  id: string;
  name: string;
  lab_id: string;
  serial_number: string;
};

type ActiveCheckout = {
  asset_id: string;
  user_id: string;
  request_date: string | null;
  request_details?: string | null;
};

type LabOption = {
  id: string;
  name: string;
};

function parseLabFromRequestDetails(details: string | null | undefined): string | null {
  if (!details) {
    return null;
  }
  const match = details.match(/Lab:\s*([^|]+)/i);
  return match?.[1]?.trim() ?? null;
}

const SAMPLE_ASSETS: AssetRow[] = [
  {
    id: "a1",
    name: "Dell Latitude 5520",
    location: "Lab A - Cabinet 3",
    rentedOut: true,
    rentedTo: "Alex Morgan",
    rentedOutAt: "2026-04-01",
    description: "Standard faculty laptop with docking station and charger.",
  },
  {
    id: "a2",
    name: "Canon EOS R10 Camera",
    location: "Media Room - Shelf 2",
    rentedOut: false,
    rentedTo: null,
    rentedOutAt: null,
    description: "Mirrorless camera kit with lens and battery pack.",
  },
  {
    id: "a3",
    name: "3D Printer Toolkit",
    location: "Engineering Lab - Bin 8",
    rentedOut: true,
    rentedTo: "Jordan Lee",
    rentedOutAt: "2026-03-30",
    description: "Nozzle set, maintenance tools, and replacement filament holders.",
  },
];

export default function UserHomePage() {
  const [assets, setAssets] = useState<AssetRow[]>(SAMPLE_ASSETS);
  const [labs, setLabs] = useState<LabOption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [onlyRentedOut, setOnlyRentedOut] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null);
  const [requestAsset, setRequestAsset] = useState<AssetRow | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [requestLab, setRequestLab] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestConfirmationByAsset, setRequestConfirmationByAsset] = useState<Record<string, string>>({});

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setIsAdmin(role === "admin");

    let cancelled = false;

    async function loadDashboardAssets() {
      try {
        const [assetsResponse, activeResponse, labsResponse] = await Promise.all([
          fetch("/api/assets/get"),
          fetch("/api/requests/active"),
          fetch("/api/labs/get"),
        ]);

        if (!assetsResponse.ok || !activeResponse.ok || !labsResponse.ok) {
          return;
        }

        const rows = (await assetsResponse.json()) as ApiAsset[];
        const activeRowsRaw = (await activeResponse.json()) as unknown;
        const activeRows = Array.isArray(activeRowsRaw) ? (activeRowsRaw as ActiveCheckout[]) : [];
        const labsRaw = (await labsResponse.json()) as unknown;
        const labList = Array.isArray(labsRaw) ? (labsRaw as LabOption[]) : [];

        const activeByAssetId = new Map(activeRows.map((row) => [row.asset_id, row]));
        const labNameById = new Map(labList.map((lab) => [lab.id, lab.name]));

        const mapped: AssetRow[] = rows.map((row) => {
          const active = activeByAssetId.get(row.id);
          const requestedLab = parseLabFromRequestDetails(active?.request_details);
          return {
            id: row.id,
            name: row.name,
            location: requestedLab ?? labNameById.get(row.lab_id) ?? row.lab_id,
            rentedOut: Boolean(active),
            rentedTo: active?.user_id ?? null,
            rentedOutAt: active?.request_date ?? null,
            description: `Serial: ${row.serial_number}`,
          };
        });
        if (!cancelled && mapped.length > 0) {
          setAssets(mapped);
          setLabs(labList);
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

  const filteredAssets = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    return assets.filter((asset) => {
      if (onlyRentedOut && !asset.rentedOut) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const haystack = [asset.name, asset.location, asset.rentedTo ?? ""].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [assets, searchQuery, onlyRentedOut]);

  return (
    <DashboardShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 py-2">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Asset Dashboard</h1>
          <p className="text-sm text-gray-600">
            Search, filter, and browse assets. Click Details to view a full description.
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
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                    No assets match your search/filter.
                  </td>
                </tr>
              )}

              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="border-t border-gray-200">
                  <td className="px-4 py-3">{asset.name}</td>
                  <td className="px-4 py-3">{asset.location}</td>
                  <td className="px-4 py-3">{asset.rentedOut ? "Yes" : "No"}</td>
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
                        setRequesterName("");
                        setRequestLab("");
                        setRequestReason("");
                      }}
                      disabled={asset.rentedOut}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {asset.rentedOut ? "Unavailable" : "Request Asset"}
                    </button>
                    {requestConfirmationByAsset[asset.id] && (
                      <p className="mt-2 text-xs text-green-700">{requestConfirmationByAsset[asset.id]}</p>
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
            <p className="mt-2 text-sm text-gray-700">{selectedAsset.description}</p>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <p>
                <span className="font-medium">Location:</span> {selectedAsset.location}
              </p>
              <p>
                <span className="font-medium">Rented:</span> {selectedAsset.rentedOut ? "Yes" : "No"}
              </p>
              <p>
                <span className="font-medium">Rented To:</span> {selectedAsset.rentedTo ?? "-"}
              </p>
              <p>
                <span className="font-medium">Rented On:</span> {selectedAsset.rentedOutAt ?? "-"}
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
            <p className="mt-1 text-sm text-gray-700">Asset: {requestAsset.name}</p>

            <form
              className="mt-4 space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setRequestError(null);

                if (!requesterName.trim() || !requestLab.trim() || !requestReason.trim()) {
                  setRequestError("Please fill out name, lab, and reason.");
                  return;
                }

                try {
                  setRequestSubmitting(true);
                  const response = await fetch("/api/requests", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      assetId: requestAsset.id,
                      requesterName,
                      lab: requestLab,
                      reason: requestReason,
                    }),
                  });

                  const payload = (await response.json()) as { error?: string };
                  if (!response.ok) {
                    throw new Error(payload.error ?? "Failed to submit request.");
                  }

                  setRequestConfirmationByAsset((previous) => ({
                    ...previous,
                    [requestAsset.id]: "Request submitted successfully.",
                  }));
                  setRequestAsset(null);
                } catch (error) {
                  setRequestError((error as Error).message || "Failed to submit request.");
                } finally {
                  setRequestSubmitting(false);
                }
              }}
            >
              <div>
                <label htmlFor="request-name" className="mb-1 block text-sm font-medium text-gray-800">
                  Name
                </label>
                <input
                  id="request-name"
                  value={requesterName}
                  onChange={(event) => setRequesterName(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="request-lab" className="mb-1 block text-sm font-medium text-gray-800">
                  Lab
                </label>
                <input
                  id="request-lab"
                  type="text"
                  value={requestLab}
                  onChange={(event) => setRequestLab(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="Enter your lab"
                />
              </div>

              <div>
                <label htmlFor="request-reason" className="mb-1 block text-sm font-medium text-gray-800">
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

              {requestError && <p className="text-sm text-red-600">{requestError}</p>}

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
