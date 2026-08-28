"use client";
import { Asset } from "@/app/types";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import EditAssetPanel from "./EditAssetsPanel";
import { Category } from "@/app/types";
import { AssetCategory } from "@/app/types";
import { Lab } from "@/app/types";
import CreateAssetBox from "./CreateAsset";

export default function ManageAssetsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [onlyRentedOut, setOnlyRentedOut] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetCategories, setAssetCategories] = useState<
    Record<string, Category[]>
  >({});
  const [selectedAsset, setSelectedAsset] = useState<Asset>();
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
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

  const fetchAssetsCategories = async () => {
    try {
      const res = await fetch("/api/assets/get");

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json: Asset[] = await res.json();

      const categoryMap: Record<string, Category[]> = {};

      await Promise.all(
        json.map(async (asset) => {
          const categories = await fetchCategories(asset.asset_id);

          categoryMap[asset.asset_id] = categories;
        }),
      );

      setAssetCategories(categoryMap);
    } catch (err) {
      console.error("Failed to fetch asset categories:", err);
    }
  };
  const fetchCategories = async (asset_id: string): Promise<Category[]> => {
    try {
      const res = await fetch(
        `/api/assets/asset_categories/get?asset_id=${asset_id}`,
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();

      console.log("ASSET ID:", asset_id);
      console.log("CATEGORIES RETURNED:", json);

      return json;
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      return [];
    }
  };

  useEffect(() => {
    fetchAssetsCategories();
    fetchData();
  }, []);

  async function remove(asset: Asset) {
    try {
      const res = await fetch("/api/assets/edit/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: asset.asset_id }),
      });
      if (!res.ok) throw new Error("Failed to remove asset");
    } catch (err) {
      console.error(err);
    }
    setAssets((prev) => prev.filter((a) => a.asset_id !== asset.asset_id));
  }

  const handleCreateAsset = async (newAsset: Asset) => {
    setAssets((prev) => [...prev, newAsset]);

    const newAssetCategories = await fetchCategories(newAsset.asset_id);
    setAssetCategories((prev) => ({
      ...prev,
      [newAsset.asset_id]: newAssetCategories,
    }));
  };

  const handleEditAsset = async (updatedAsset: Asset) => {
    setAssets((prev) =>
      prev.map((asset) =>
        asset.asset_id === updatedAsset.asset_id ? updatedAsset : asset,
      ),
    );

    const updatedAssetCategories = await fetchCategories(updatedAsset.asset_id);

    setAssetCategories((prev) => ({
      ...prev,
      [updatedAsset.asset_id]: updatedAssetCategories,
    }));
  };

  const filteredAssets = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) return assets;

    return assets.filter((asset) => {
      const matchesAsset =
        asset.name?.toLowerCase().includes(query) ||
        asset.serial_number?.toLowerCase().includes(query) ||
        asset.location?.toLowerCase().includes(query);

      const matchesCategory = assetCategories[asset.asset_id]?.some(
        (category) => category.name.toLowerCase().includes(query),
      );

      return matchesAsset || matchesCategory;
    });
  }, [assets, assetCategories, searchQuery]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 py-2">
      <div className="flex items-start justify-between">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Asset Management</h1>
          <p className="text-sm text-gray-600">
            Search, filter, and browse assets you want to edit or remove
          </p>
        </header>

        <button
          className="cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          onClick={() => setShowCreatePanel(true)}
        >
          Add New Asset
        </button>
      </div>

      {showCreatePanel && (
        <CreateAssetBox
          assets={assets}
          onClose={() => setShowCreatePanel(false)}
          onCreate={handleCreateAsset}
        />
      )}
      {/* Search + Filters */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search asset names, serial numbers, categories, locations"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </div>
      </section>

      {/* Table */}
      <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Asset Name</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Serial Number</th>
              <th className="px-4 py-3 font-semibold">Remove Asset</th>
              <th className="px-4 py-3 font-semibold">Edit Asset/View Asset</th>
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

            {filteredAssets.map((asset) => {
              console.log(
                "ASSET IDS:",
                assets.map((asset) => asset.asset_id),
              );
              return (
                <tr key={asset.asset_id} className="border-t border-gray-200">
                  <td className="px-4 py-3">{asset.name}</td>
                  <td className="px-4 py-3">{asset.location}</td>
                  <td className="px-4 py-3">
                    {assetCategories[asset.asset_id]?.map((cat) => (
                      <div key={cat.category_id}>{cat.name}</div>
                    ))}
                  </td>
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
