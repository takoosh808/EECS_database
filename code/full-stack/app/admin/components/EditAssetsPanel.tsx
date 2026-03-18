import { useState } from "react";
import { Asset } from "../../types"; // adjust path to your types

interface CreateAssetPanelProps {
    onClose: () => void;                  // called when user closes panel
    onCreate: (asset: Asset) => void;     // called when user submits new asset
}

export default function CreateAssetPanel({ onClose, onCreate }: CreateAssetPanelProps) {
    const [name, setName] = useState("");
    const [category_id, setCategory] = useState("");
    const [lab_id, setLabId] = useState("");
    const [serial_number, setSerialNumber] = useState("");
    const [created_at, setCreatedAt] = useState("");
    const [updated_at, setUpdateAt] = useState("");
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();


        const newAsset: Asset = {
            id: crypto.randomUUID(), // or generate ID however your backend wants it
            name,
            category_id,
            lab_id,
            serial_number,
            created_at: undefined,
            updated_at: undefined 
        };

        onCreate(newAsset);
        onClose(); // close panel after creation
    };

    return (
        <div style={{
            position: "absolute",
            top: 0, right: 0,
            width: "400px",
            height: "100%",
            backgroundColor: "#fff",
            borderLeft: "1px solid #ccc",
            padding: "20px",
            boxShadow: "-2px 0 5px rgba(0,0,0,0.2)"
        }}>
            <h2>Create New Asset</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Name:</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Category:</label>
                    <input
                        type="text"
                        value={category_id}
                        onChange={e => setCategory(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Lab:</label>
                    <input
                        type="text"
                        value={lab_id}
                        onChange={e => setLabId(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Serial Number:</label>
                    <input
                        type="text"
                        value={serial_number}
                        onChange={e => setSerialNumber(e.target.value)}
                        required
                    />
                </div>
                <div style={{ marginTop: "10px" }}>
                    <button className="cursor-pointer" type="submit">Create</button>
                    <button className="cursor-pointer" type="button" onClick={onClose} style={{ marginLeft: "10px" }}>Cancel</button>
                </div>
            </form>
        </div>
    );
}