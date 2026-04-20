import { useState, useEffect } from "react";
import { Asset } from "../../types";
import { Lab } from "../../types";
import LabCombobox from "./LabComboBox";
import CategoryCombobox from "./CategoryComboBox";

interface EditAssetPanelProps {
  onClose: () => void; // called when user closes panel
  onEdit: (asset: Asset) => void; // called when user submits new asset
  assets: Asset[];
  assetToEdit: Asset;
}

export default function EditAssetPanel({
  onClose,
  onEdit,
  assets,
  assetToEdit,
}: EditAssetPanelProps) {
  const [name, setName] = useState("");
  const [category_id, setCategoryId] = useState("");
  const [lab_id, setLabId] = useState("");
  const [serial_number, setSerialNumber] = useState("");
  const [error, setError] = useState("");
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const updatedAsset: Asset = {
    id: assetToEdit.id,
    name,
    category_id,
    lab_id,
    serial_number,
    created_at: assetToEdit?.created_at,
    updated_at: undefined,
  };
    
  onEdit(updatedAsset);
    
    onClose();
  };

  const [labs, setLabs] = useState<Lab[]>([]);
  useEffect(() => {
    const loadLabs = async () => {
      const res = await fetch("/api/labs/get");
      const data: Lab[] = await res.json();
      setLabs(data);
    };
    loadLabs();
  }, []);
  console.log("labs:", labs);

  useEffect(() => {
    if (!assetToEdit) return;

    setName(assetToEdit.name ?? "");
    setCategoryId(assetToEdit.category_id ?? "");
    setLabId(assetToEdit.lab_id ?? "");
    setSerialNumber(assetToEdit.serial_number ?? "");
    console.log("EDIT ASSET RAW:", assetToEdit);
  }, [assetToEdit?.id]); // 👈 important change

  


  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose} // click outside closes modal
    >
      <div
        style={{
          width: "400px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <h2>Edit Asset</h2>

        <form onSubmit={handleSubmit}>
          <div>
            <label>Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label>Category:</label>
            <CategoryCombobox
              value={category_id}
              onChange={(id) => setCategoryId(id)}
            />
          </div>

          <div>
            <label>Lab:</label>
            <LabCombobox value={lab_id} onChange={(id) => setLabId(id)} />
          </div>

          <div>
            <label>Serial Number:</label>
            <input
              type="text"
              value={serial_number}
              onChange={(e) => {
                const value = e.target.value;
                setSerialNumber(value);

                const exists = assets.some((a) => a.serial_number === value);

                if (exists) {
                  setError("Serial number already exists");
                } else {
                  setError("");
                }
              }}
              required
            />

            {error && <p style={{ color: "red", fontSize: "12px" }}>{error}</p>}
          </div>

          <div style={{ marginTop: "10px" }}>
            <button className="cursor-pointer" type="submit">
              Edit
            </button>

            <button
              className="cursor-pointer"
              type="button"
              onClick={onClose}
              style={{ marginLeft: "10px" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
