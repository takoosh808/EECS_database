import { useState, useEffect, useRef } from "react";
import { Asset } from "../../types";
import { Lab } from "../../types";
import LabCombobox from "./LabComboBox";
import CategoryCombobox from "./CategoryComboBox";

interface CreateAssetPanelProps {
  onClose: () => void; // called when user closes panel
  onCreate: (asset: Asset) => void; // called when user submits new asset
  assets: Asset[];
}

export default function CreateAssetPanel({
  onClose,
  onCreate,
  assets,
}: CreateAssetPanelProps) {
  const [name, setName] = useState("");
  const [category_id, setCategoryId] = useState("");
  const [lab_id, setLabId] = useState("");
  const [serial_number, setSerialNumber] = useState("");
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [image_url, setImageUrl] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newAsset: Asset = {
      id: crypto.randomUUID(),
      name,
      category_id,
      lab_id,
      description,
      image_url,
      location,
      serial_number,
      created_at: undefined,
      updated_at: undefined,
    };

    onCreate(newAsset);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

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
        <h2>Create New Asset</h2>

        <form onSubmit={handleSubmit}>
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
          <div>
            <label>Name:</label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <label>Serial Number:</label>
            <input
              type="text"
              value={serial_number}
              className="border border-gray-200 rounded-md"
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
          <div>
            <label>Description: </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: "100%" }}
              className="border border-gray-200 rounded-md"
              maxLength={250}
            ></textarea>
            <p style={{ fontSize: "12px", color: "gray" }}>
              {description.length}/250
            </p>
          </div>
          <div>
            <label>Location: </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border border-gray-200 rounded-md"
            ></input>
          </div>

          <div style={{ marginTop: "10px" }}>
            <button className="cursor-pointer" type="submit">
              Create
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
