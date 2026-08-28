import { Asset } from "../../types";
import { useState } from "react";
import EditAssetPanel from "./EditAssetsPanel";
type Props = {
  data: Asset[];
};

export default function EditAssetsView({ data }: Props) {
  const defaultImage = "/globe.svg";
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const openEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowEditPanel(true);
  };

  async function remove(asset: Asset) {
    try {
      const res = await fetch("/api/assets/edit/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.asset_id }),
      });
      if (!res.ok) throw new Error("Failed to remove asset");
    } catch (err) {
      console.error(err);
    }
  }

  const handleEditAsset = (updatedAsset: Asset) => {
    fetch("/api/assets/edit/change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedAsset),
    });
    window.location.reload();
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {data.map((asset) => {
          console.log("GRID ASSET:", asset);

          return (
            <div
              key={asset.asset_id}
              className="border rounded-lg shadow p-4 flex flex-col items-center"
            >
              <img
                src={defaultImage}
                alt={asset.name}
                className="w-32 h-32 object-cover mb-2 rounded"
              />

              <h3 className="font-bold text-lg mb-1">{asset.name}</h3>

              <p className="text-gray-600 text-sm">NO DESCRIPTION YET</p>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(asset)}
                  className="px-2 py-1 bg-blue-500 text-white text-sm rounded cursor-pointer"
                >
                  Edit
                </button>

                <button
                  onClick={() => remove(asset)}
                  className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showEditPanel && selectedAsset && (
        <EditAssetPanel
          key={selectedAsset.asset_id}
          onClose={() => {
            setShowEditPanel(false);
            setSelectedAsset(null);
          }}
          onEdit={handleEditAsset}
          assets={data}
          assetToEdit={selectedAsset}
        />
      )}
    </div>
  );
}
