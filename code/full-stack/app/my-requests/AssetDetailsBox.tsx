"use client";

import { MyRequests } from "@/app/types";

interface ViewAssetPanelProps {
  onClose: () => void; // called when user closes panel
  asset: MyRequests; // the asset being viewed
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const normalized = (status ?? "").toLowerCase();

  const styles: Record<string, string> = {
    available: "border-green-600 bg-green-600 text-white",
    "checked out": "border-black bg-black text-white",
    checked_out: "border-black bg-black text-white",
    overdue: "border-red-600 bg-red-600 text-white",
    pending: "border-yellow-600 bg-yellow-600 text-white",
  };

  const style = styles[normalized] ?? "border-black bg-white text-black";

  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-sm ${style}`}
    >
      {status ?? "Unknown"}
    </span>
  );
}

export default function ViewAssetPanel({
  onClose,
  asset,
}: ViewAssetPanelProps) {
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
          <h2 className="text-2xl font-semibold">Asset Details</h2>

          <button
            type="button"
            className="text-2xl leading-none cursor-pointer"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Name */}
          <DetailField label="Asset Name">
            <p className="text-base">{asset.asset || "-"}</p>
          </DetailField>

          {/* Checkout Status */}
          <DetailField label="Checkout Status">
            <StatusBadge status={asset.checkout_status} />
          </DetailField>

          {/* Message */}
          <DetailField label="Message">
            <p className="whitespace-pre-wrap text-base text-gray-800">
              {asset.message || "-"}
            </p>
          </DetailField>

          {/* Checkout Length */}
          <DetailField label="Checkout Length">
            <p className="text-base">{asset.checkout_length || "-"}</p>
          </DetailField>

          {/* Due Date */}
          <DetailField label="Due Date">
            <p className="text-base">{formatDate(asset.due_date)}</p>
          </DetailField>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-black pt-6 mt-6">
          <button
            type="button"
            className="rounded-md border border-black px-6 py-3 hover:bg-gray-100 cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailField({
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
