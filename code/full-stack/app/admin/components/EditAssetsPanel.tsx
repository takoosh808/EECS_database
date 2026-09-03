"use client";

import { useState, useEffect } from "react";
import { Asset } from "../../types";
import { Category } from "../../types";

type ManageType = "category" | "lab" | null;

interface EditAssetPanelProps {
  onClose: () => void; // called when user closes panel
  onEdit: (asset: Asset) => void; // called when user submits the edited asset
  assets: Asset[];
  assetToEdit: Asset; // the asset being edited — panel is prefilled from this
}

export default function EditAssetPanel({
  onClose,
  onEdit,
  assetToEdit,
}: EditAssetPanelProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    const loadCategories = async () => {
      const res = await fetch("/api/categories/get");
      const data: Category[] = await res.json();
      setCategories(data);
    };
    loadCategories();
  }, []);

  // Multiple categories can be applied to an asset, like tags.
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryToAdd, setCategoryToAdd] = useState("");
  const [description, setDescription] = useState("");
  const [image_url, setImageUrl] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [serial_number, setSerialNumber] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [manageOpen, setManageOpen] = useState<ManageType>(null);

  // Prefill the form from the asset being edited. Runs again if a different
  // asset is passed in (e.g. the panel is reused for another row without
  // unmounting).
  useEffect(() => {
    setName(assetToEdit.name ?? "");
    setDescription(assetToEdit.description ?? "");
    setImageUrl(assetToEdit.image_url ?? "");
    setLocation(assetToEdit.location ?? "");
    setSerialNumber(assetToEdit.serial_number ?? "");
  }, [assetToEdit]);

  // Prefill the selected category tags with this asset's existing
  // categories, using the same GET endpoint ManageAssetsView already uses
  // to populate its table.
  useEffect(() => {
    const loadAssetCategories = async () => {
      try {
        const res = await fetch(
          `/api/assets/asset_categories/get?asset_id=${assetToEdit.asset_id}`,
        );
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const existingCategories: Category[] = await res.json();
        setSelectedCategories(
          existingCategories.map((category) => category.category_id),
        );
      } catch (err) {
        console.error("Failed to load asset's existing categories:", err);
      }
    };
    loadAssetCategories();
  }, [assetToEdit.asset_id]);

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
      const res = await fetch("/api/assets/edit/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: assetToEdit.asset_id,
          name,
          serial_number,
          description,
          image_url,
          location,
          category_ids: selectedCategories,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update asset");
      }

      const data = await res.json();

      // Backend is the source of truth
      onEdit(data);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

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
    // Automatically tag this asset with the category just created.
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg border border-black bg-white p-5 text-black shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}

        <div className="mb-8 flex items-center justify-between border-b border-black pb-4">
          <h2 className="text-2xl font-semibold">Edit Asset</h2>

          <button
            type="button"
            className="text-2xl leading-none cursor-pointer"
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
                className="rounded border border-black px-3 py-2 hover:bg-black hover:text-white cursor-pointer"
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
                        className="leading-none hover:text-gray-300 cursor-pointer"
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
                className="rounded-md border border-black px-4 py-2 hover:bg-black hover:text-white cursor-pointer"
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
                    className="text-xl cursor-pointer"
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
                          className="rounded border border-black px-3 py-1 text-sm hover:bg-black hover:text-white cursor-pointer"
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
              className="rounded-md border border-black px-6 py-3 hover:bg-gray-100 cursor-pointer"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-md bg-black px-6 py-3 text-white hover:bg-gray-800 cursor-pointer"
            >
              Save Changes
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
