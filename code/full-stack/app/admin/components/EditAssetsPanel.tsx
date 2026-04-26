import { useState, useEffect, useRef } from "react";
import { Asset } from "../../types";
import { Lab } from "../../types";
import LabCombobox from "./LabComboBox";
import CategoryCombobox from "./CategoryComboBox";
import { constants } from "buffer";

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
  const [description, setDescription] = useState("/globe.svg");
  const [image_url, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState("");
  const [serial_number, setSerialNumber] = useState("");
  const [error, setError] = useState("");
  const [labs, setLabs] = useState<Lab[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const updatedAsset: Asset = {
      id: assetToEdit.id,
      name,
      category_id,
      lab_id,
      description,
      image_url,
      location,
      serial_number,
      created_at: assetToEdit?.created_at,
      updated_at: undefined,
    };
    console.log("UPDATED ASSET:", updatedAsset);

    onEdit(updatedAsset);

    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

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
    setImageUrl(assetToEdit.image_url ?? "");
    setDescription(assetToEdit.description ?? "");
    setLocation(assetToEdit.location ?? "");
    console.log("EDIT ASSET RAW:", assetToEdit);
  }, [assetToEdit?.id]);

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
          height: "600px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <h2 className="font-bold">Edit Asset</h2>
        <div className="flex justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          ></input>
          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="cursor-pointer"
          >
            <img
              src={image_url || "/globe.svg"}
              alt="upload"
              className="w-50 h-50"
            ></img>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "86%" }}
              className="border border-gray-200 rounded-md"
            />
          </div>

          <div className="flex items-center gap-1">
            <label>Category:</label>
            <CategoryCombobox
              value={category_id}
              onChange={(id) => setCategoryId(id)}
            />
          </div>

          <div className="flex items-center gap-1">
            <label>Lab:</label>
            <LabCombobox value={lab_id} onChange={(id) => setLabId(id)} />
          </div>

          <div>
            <label>Serial Number: </label>
            <input
              type="text"
              value={serial_number}
              className="border border-gray-200 rounded-md"
              style={{ width: "69%" }}
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
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%" }}
            className="border border-gray-200 rounded-md"
            maxLength={250}
          ></textarea>
          <div>
            <label>Location: </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ width: "80%" }}
              className="border border-gray-200 rounded-md"
            ></input>
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
