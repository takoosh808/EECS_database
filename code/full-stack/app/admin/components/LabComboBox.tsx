import { useEffect, useState } from "react";
import { Lab } from "../../types";

interface Props {
  value: string; // lab_id
  onChange: (labId: string) => void;
}

export default function LabCombobox({ value, onChange }: Props) {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadLabs = async () => {
      const res = await fetch("/api/labs/get");
      const data: Lab[] = await res.json();
      setLabs(data);
    };
    loadLabs();
  }, []);

  const filtered = labs.filter((lab) =>
    lab.name.toLowerCase().includes(query.toLowerCase()),
  );

  const selectLab = (lab: Lab) => {
    setQuery(lab.name);
    onChange(lab.id);
    setOpen(false);
  };

  const createLab = async () => {
    const res = await fetch("/api/labs/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: query }),
    });

    const newLab: Lab = await res.json();

    setLabs((prev) => [...prev, newLab]);
    setQuery(newLab.name);
    onChange(newLab.id);
    setOpen(false);
  };

  useEffect(() => {
    if (!value) {
      setQuery("");
      return;
    }

    const selected = labs.find((l) => String(l.id) === String(value));

    setQuery(selected ? selected.name : "");
  }, [value, labs]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={query}
        placeholder="Search or create lab"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);

          // clear selection if typing something new
          const match = labs.find((l) => l.name === e.target.value);
          onChange(match ? match.id : "");
        }}
        onFocus={() => setOpen(true)}
      />

      {open && query && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            border: "1px solid #ccc",
            background: "white",
            zIndex: 10,
          }}
        >
          {filtered.map((lab) => (
            <div
              key={lab.id}
              onClick={() => selectLab(lab)}
              style={{ padding: 8, cursor: "pointer" }}
            >
              {lab.name}
            </div>
          ))}

          {filtered.length === 0 && (
            <div
              onClick={createLab}
              style={{
                padding: 8,
                cursor: "pointer",
                fontWeight: "bold",
                borderTop: "1px solid #ddd",
              }}
            >
              Create "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
