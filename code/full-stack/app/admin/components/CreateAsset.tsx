"use client";

import { useState, useEffect } from "react";
import { Asset } from "../../types";
import { Lab } from "../../types";
import LabCombobox from "./LabComboBox";
import { Category } from "../../types";
import { AssetCategory } from "../../types";
import CategoryCombobox from "./CategoryComboBox";

type ManageType = "category" | "lab" | null;

interface CreateAssetPanelProps {
  onClose: () => void; // called when user closes panel
  onCreate: (asset: Asset) => void; // called when user submits new asset
  assets: Asset[];
}

export default function CreateAssetBox({
  onClose,
  onCreate,
  assets,
}: CreateAssetPanelProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    const loadCategories = async () => {
      const res = await fetch("/api/categories/get");
      const data: Category[] = await res.json();
      setCategories(data);
    };
    loadCategories();
  }, []);

  const [labs, setLabs] = useState<string[]>([
    "EECS Lab",
    "Hardware Lab",
    "Research Lab",
  ]);

  // Multiple categories can now be applied to an asset, like tags.
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryToAdd, setCategoryToAdd] = useState("");
  const [description, setDescription] = useState("");
  const [image_url, setImageUrl] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [serial_number, setSerialNumber] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newLab, setNewLab] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [manageOpen, setManageOpen] = useState<ManageType>(null);

  const addCategoryTag = (category_id: string) => {
    if (!category_id) return;
    setSelectedCategories((prev) =>
      prev.includes(category_id) ? prev : [...prev, category_id],
    );
    setCategoryToAdd("");
  };

  const removeCategoryTag = (category_id: string) => {
    setSelectedCategories((prev) => prev.filter((id) => id !== category_id));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !serial_number.trim()) {
      setError("Name and serial number are required.");
      return;
    }

    setSubmitting(true);
    try {
      const newAssetId = crypto.randomUUID();

      const res = await fetch("/api/assets/edit/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: newAssetId,
          name,
          description,
          image_url,
          location,
          serial_number,
          category_ids: selectedCategories,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create asset");
      }

      const data = await res.json();
      // Backend now returns the actual inserted row via RETURNING * — use
      // that as the source of truth instead of rebuilding it client-side.
      const createdAsset: Asset = data.asset;

      onCreate(createdAsset);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  //fix here
  const createCategory = async () => {
    const value = newCategory.trim();

    //guard rails for inserting already present category names
    if (!value || categories.some((category) => category.name === value))
      return;

    const res = await fetch("/api/categories/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value }),
    });
    const createdCategory: Category = await res.json();
    setCategories((prev) => [...prev, createdCategory]);
    // Automatically tag the new asset with the category just created.
    addCategoryTag(createdCategory.category_id);
    setNewCategory("");
  };

  const deleteCategory = async (category_name: string) => {
    const categoryToDelete = categories.find(
      (category) => category.name === category_name,
    );

    const res = await fetch("/api/categories/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: category_name }),
    });
    setCategories((prev) =>
      prev.filter((category) => category.name !== category_name),
    );
    // Make sure a deleted category can't linger as a selected tag.
    if (categoryToDelete) {
      removeCategoryTag(categoryToDelete.category_id);
    }
  };

  // Categories not yet applied to this asset, available to add as a tag.
  const availableCategories = categories.filter(
    (category) => !selectedCategories.includes(category.category_id),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg border border-black bg-white p-5 text-black shadow-sm">
        {/* Header */}

        <div className="mb-8 flex items-center justify-between border-b border-black pb-4">
          <h2 className="text-2xl font-semibold">Create New Asset</h2>

          <button
            type="button"
            className="text-2xl leading-none"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Name */}
          <FormField label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter asset name"
              className="w-full rounded-md border border-black px-4 py-3 outline-none focus:ring-1 focus:ring-black"
            />
          </FormField>

          {/* Categories (multi-select / tags) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="font-medium">Categories</label>

              <button
                type="button"
                onClick={() =>
                  setManageOpen(manageOpen === "category" ? null : "category")
                }
                className="rounded border border-black px-3 py-2 hover:bg-black hover:text-white"
                aria-label="Manage categories"
                title="Manage Categories"
              >
                ⚙
              </button>
            </div>

            {/* Selected category tags */}
            {selectedCategories.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedCategories.map((category_id) => {
                  const category = categories.find(
                    (c) => c.category_id === category_id,
                  );
                  if (!category) return null;
                  return (
                    <span
                      key={category_id}
                      className="flex items-center gap-2 rounded-full border border-black bg-black px-3 py-1 text-sm text-white"
                    >
                      {category.name}
                      <button
                        type="button"
                        onClick={() => removeCategoryTag(category_id)}
                        aria-label={`Remove ${category.name}`}
                        className="leading-none hover:text-gray-300"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Add an existing category as a tag */}
            <select
              value={categoryToAdd}
              onChange={(e) => addCategoryTag(e.target.value)}
              className="w-full rounded-md border border-black bg-white px-4 py-3 outline-none"
            >
              <option value="">
                {availableCategories.length > 0
                  ? "Add a category"
                  : "All categories added"}
              </option>

              {availableCategories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Quick Category Creation */}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    createCategory();
                  }
                }}
                placeholder="New category"
                className="flex-1 rounded-md border border-black px-3 py-2 outline-none"
              />

              <button
                type="button"
                onClick={createCategory}
                className="rounded-md border border-black px-4 py-2 hover:bg-black hover:text-white"
              >
                + Add
              </button>
            </div>

            {/* Category Management */}
            {manageOpen === "category" && (
              <div className="mt-3 rounded-md border border-black p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Manage Categories</h3>

                  <button
                    type="button"
                    onClick={() => setManageOpen(null)}
                    className="text-xl"
                  >
                    ×
                  </button>
                </div>

                {categories.length === 0 ? (
                  <p className="text-sm">No categories available.</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div
                        key={category.category_id}
                        className="flex items-center justify-between border-b border-black pb-2"
                      >
                        <span>{category.name}</span>

                        <button
                          type="button"
                          onClick={() => deleteCategory(category.name)}
                          className="rounded border border-black px-3 py-1 text-sm hover:bg-black hover:text-white"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Serial Number */}
          <FormField label="Serial Number">
            <input
              type="text"
              value={serial_number}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Enter serial number"
              className="w-full rounded-md border border-black px-4 py-3 outline-none focus:ring-1 focus:ring-black"
            />
          </FormField>

          {/* Description */}
          <FormField label="Description">
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              className="w-full resize-none rounded-md border border-black px-4 py-3 outline-none focus:ring-1 focus:ring-black"
            />
          </FormField>

          {/* Location */}
          <FormField label="Location">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
              className="w-full rounded-md border border-black px-4 py-3 outline-none focus:ring-1 focus:ring-black"
            />
          </FormField>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-black pt-6">
            <button
              type="button"
              className="rounded-md border border-black px-6 py-3 hover:bg-gray-100"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-md bg-black px-6 py-3 text-white hover:bg-gray-800"
            >
              Create Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block font-medium">{label}</label>
      {children}
    </div>
  );
}
