"use client";
import { Asset } from "@/app/types";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import CreateAssetPanel from "./CreateAssetsPanel";
import EditAssetPanel from "./EditAssetsPanel";
import { Category } from "@/app/types";
import { Lab } from "@/app/types";

export default function ManageAssetsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [onlyRentedOut, setOnlyRentedOut] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset>();
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [requesterName, setRequesterName] = useState("");
  const [requestLab, setRequestLab] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestConfirmationByAsset, setRequestConfirmationByAsset] = useState<
    Record<string, string>
  >({});
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const fetchData = async () => {
    try {
      const res = await fetch("/api/assets/get");

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      setAssets(json);
    } catch (err) {
      console.error("Failed to fetch assets:", err);
    }
  };
  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories/get");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      setCategories(json);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };
  const fetchLabs = async () => {
    try {
      const res = await fetch("/api/labs/get");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      setLabs(json);
    } catch (err) {
      console.error("Failed to fetch labs:", err);
    }
  };
  useEffect(() => {
    fetchData();
    fetchCategories();
    fetchLabs();
  }, []);

  async function remove(asset: Asset) {
    try {
      const res = await fetch("/api/assets/edit/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id }),
      });
      if (!res.ok) throw new Error("Failed to remove asset");
    } catch (err) {
      console.error(err);
    }
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
  }
  const handleEditAsset = (updatedAsset: Asset) => {
    fetch("/api/assets/edit/change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedAsset),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to update asset");
        }
        return res.json();
      })
      .then((data) => {
        console.log("UPDATE RESPONSE:", data);
        const finalAsset = data.asset;
        // use backend response if it returns the updated asset

        setAssets((prevAssets) =>
          prevAssets.map((asset) =>
            asset.id === finalAsset.id ? finalAsset : asset,
          ),
        );
      })
      .catch((err) => {
        console.error("Error updating asset:", err);
      });
  };
  // const filteredAssets = useMemo(() => {
  //   const normalized = searchQuery.trim().toLowerCase();

  //     return SAMPLE_ASSETS.filter((asset) => {
  //       if (onlyRentedOut && !asset.rentedOut) {
  //         return false;
  //       }

  //       if (!normalized) {
  //         return true;
  //       }

  //       const haystack = [asset.name, asset.location, asset.rentedTo ?? ""]
  //         .join(" ")
  //         .toLowerCase();
  //       return haystack.includes(normalized);
  //     });
  //   }, [searchQuery, onlyRentedOut]);

  const handleCreateAsset = async (newAsset: Asset) => {
    console.log("Sending asset to backend:", newAsset);

    const res = await fetch("/api/assets/edit/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAsset),
    });

    const data = await res.json();

    setAssets((prev) => [...prev, data.asset ?? newAsset]);

    await fetchCategories();
    await fetchLabs();
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Asset Management</h1>
        <p className="text-sm text-gray-600">
          Search, filter, and browse assets. Click Details to view a full
          description.
        </p>
      </header>
      <div className="flex justify-end">
        <div className="py-1 px-2 rounded-md">
          <button
            className="cursor-pointer"
            onClick={() => setShowCreatePanel(true)}
          >
            Add New Asset
          </button>
          {showCreatePanel && (
            <CreateAssetPanel
              assets={assets}
              onClose={() => setShowCreatePanel(false)}
              onCreate={handleCreateAsset}
            />
          )}
        </div>
      </div>
      {/* Search + Filters */}
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

      {/* Table */}
      <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Asset Name</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Lab</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Serial Number</th>
              <th className="px-4 py-3 font-semibold">Remove Asset</th>
              <th className="px-4 py-3 font-semibold">Edit Asset</th>
            </tr>
          </thead>

          <tbody>
            {assets.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                  No assets match your search/filter.
                </td>
              </tr>
            )}

            {assets.map((asset) => {
              const category = categories.find(
                (c) => c.id === asset.category_id,
              );
              const lab = labs.find((l) => l.id === asset.lab_id);
              return (
                <tr key={asset.id} className="border-t border-gray-200">
                  <td className="px-4 py-3">{asset.name}</td>
                  <td className="px-4 py-3">{asset.location}</td>
                  <td className="px-4 py-3">{lab?.name ?? "not found"}</td>
                  <td className="px-4 py-3">{category?.name ?? ""}</td>
                  <td className="px-4 py-3">{asset.serial_number ?? "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        remove(asset);
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 cursor-pointer"
                    >
                      Remove Asset
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditPanel(true);
                        setSelectedAsset(asset);
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 cursor-pointer"
                    >
                      Edit Asset
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {showEditPanel && selectedAsset && (
        <EditAssetPanel
          onClose={() => setShowEditPanel(false)}
          onEdit={handleEditAsset}
          assets={assets}
          assetToEdit={selectedAsset}
        />
      )}
    </div>
  );
}
