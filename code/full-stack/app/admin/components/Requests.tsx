"use client";
import type { AssetCheckoutDetails } from "../../types";
import { useState } from "react";
import ReviewRequestBox from "./ReviewRequestBox";
import RequestTable from "./RequestTable";

type Props = {
  data: AssetCheckoutDetails[];
  onActionComplete?: () => void;
};

export default function RequestsView({ data }: Props) {
  const [selectedAsset, setSelectedAsset] = useState<AssetCheckoutDetails>();
  return (
    <>
      <RequestTable
        data={data}
        title="Pending Requests"
        description="Review incoming requests and respond to borrowers."
        emptyMessage="No pending requests."
        dateLabel="Request date"
        formatDate={value => new Date(value).toLocaleDateString()}
        actions={request => (
          <button type="button" className="cursor-pointer rounded-md bg-crimson-700 px-3 py-2 text-sm font-medium text-white hover:bg-crimson-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson-600" onClick={() => setSelectedAsset(request)}>
            Review
          </button>
        )}
      />
      {selectedAsset && (
        <ReviewRequestBox
          key={selectedAsset.checkout_id}
          onClose={() => setSelectedAsset(undefined)}
          request={selectedAsset}
          adminEmail={selectedAsset.email}
        />
      )}
    </>
  );
}
