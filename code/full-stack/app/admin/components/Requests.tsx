"use client";
import { AssetCheckout, AssetCheckoutDetails } from "../../types";
import { useState } from "react";
import ReviewRequestBox from "./ReviewRequestBox";
type Props = {
  data: AssetCheckoutDetails[];
};

//View for requested assets
export default function RequestsView({ data }: Props) {
  const [showReviewRequest, setShowReviewRequest] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetCheckoutDetails>();

  return (
    <div className="bg-white shadow-lg p-6 max-w-6xl mx-auto">
      <h2 className="text-1xl font-bold mb-4">
        Pending Requests ({data.length})
      </h2>
      {data.length === 0 && (
        <p className="text-gray-500 text-center">No pending requests.</p>
      )}
      {data.length !== 0 && (
        <>
          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 font-semibold text-gray-700 border-b pb-2 mb-2">
            <div>USER</div>
            <div>ASSET</div>
            <div>REQUEST DATE</div>
            <div>STATUS</div>
            <div>ACTIONS</div>
          </div>
          {/* Table rows */}
          <div className="space-y-2">
            {data.map((req) => (
              <div
                key={req.checkout_id}
                className="grid grid-cols-5 gap-4 items-center p-3 rounded-md bg-blue-50 border border-blue-200"
              >
                <div>{req.user}</div>
                <div>{req.asset}</div>
                <div>{new Date(req.request_date).toLocaleDateString()}</div>
                <div>{req.checkout_status}</div>
                <div>
                  <button
                    className="bg-gray-500 text-white px-2 py-1 rounded mr-2 cursor-pointer"
                    onClick={() => {
                      setShowReviewRequest(true);
                      setSelectedAsset(req);
                    }}
                  >
                    Review
                  </button>
                </div>
                {showReviewRequest && selectedAsset && (
                  <ReviewRequestBox
                    onClose={() => setShowReviewRequest(false)}
                    request={req}
                    adminEmail={req.email}
                  ></ReviewRequestBox>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
