"use client";
import type { AssetCheckout } from "../../types";
import RequestTable from "./RequestTable";

type Props = {
  data: AssetCheckout[];
  onActionComplete?: () => void;
};

export default function ActiveAssetsView({ data }: Props) {
  async function ApproveReturn(checkout_id: string) {
    try {
      const res = await fetch("/api/requests/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkout_id }),
      });
      if (!res.ok) throw new Error("Failed to approve return");
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <RequestTable
      data={data}
      title="Active Requests"
      description="Track equipment on loan and process returns."
      emptyMessage="No active requests."
      dateLabel="Checked out"
      formatDate={value => new Date(value).toLocaleDateString()}
      actions={active => (
        <button type="button" className="cursor-pointer rounded-md bg-crimson-700 px-3 py-2 text-sm font-medium text-white hover:bg-crimson-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson-600" onClick={() => ApproveReturn(active.checkout_id)}>
          Mark Returned
        </button>
      )}
    />
  );
}
