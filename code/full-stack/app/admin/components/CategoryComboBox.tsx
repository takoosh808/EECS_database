import { useEffect, useState } from "react";
import { Category } from "@/app/types";
import { Catamaran } from "next/font/google";

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

  const exactMatch = categories.some(
    (category) => category.name.toLowerCase() === query.toLowerCase(),
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
    <div className="relative w-[79%] border border-gray-200 rounded-md">
      <input
        className="w-full p-2 rounded-md outline-none"
        value={query}
        placeholder="Search or create category"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);

          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {open && query && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-md z-10">
          {filtered.map((category) => (
            <div
              key={category.id}
              onClick={() => selectCategory(category)}
              className="p-2 cursor-pointer hover:bg-gray-100"
            >
              {category.name}
            </div>
          ))}

          {!exactMatch && query && (
            <div
              onClick={createCategory}
              className="p-2 cursor-pointer font-semibold border-t border-gray-200 hover:bg-gray-100"
            >
              Create "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
