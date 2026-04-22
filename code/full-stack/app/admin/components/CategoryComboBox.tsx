import { useEffect, useState } from "react";
import { Category } from "@/app/types";

interface Props {
  value: string;
  onChange: (categoryId: string) => void;
}

export default function CategoryCombobox({ value, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      const res = await fetch("/api/categories/get");
      const data: Category[] = await res.json();
      setCategories(data);
    };
    loadCategories();
  }, []);

  const filtered = categories.filter((category) =>
    category.name.toLowerCase().includes(query.toLocaleLowerCase()),
  );

  const selectCategory = (category: Category) => {
    setQuery(category.name);
    onChange(category.id);
    setOpen(false);
  };

  const createCategory = async () => {
    const res = await fetch("/api/categories/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: query }),
    });
    const newCategory: Category = await res.json();

    setCategories((prev) => [...prev, newCategory]);
    setQuery(newCategory.name);
    onChange(newCategory.id);
    setOpen(false);
  };

  useEffect(() => {
    if (!value) {
      setQuery("");
      return;
    }

    if (!Array.isArray(categories)) return;

    const selected = categories.find((c) => String(c.id) === String(value));

    setQuery(selected ? selected.name : "");
  }, [value, categories]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={query}
        placeholder="Search or create category"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);

          // clear selection if typing something new
          const match = categories.find((l) => l.name === e.target.value);
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
          {filtered.map((category) => (
            <div
              key={category.id}
              onClick={() => selectCategory(category)}
              style={{ padding: 8, cursor: "pointer" }}
            >
              {category.name}
            </div>
          ))}

          {filtered.length === 0 && (
            <div
              onClick={createCategory}
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
