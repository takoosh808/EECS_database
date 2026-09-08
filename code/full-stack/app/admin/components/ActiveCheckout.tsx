"use client";
import { act, useEffect, useState } from "react";
import { Asset, AssetCheckout } from "../../types";
import { refresh } from "next/cache";
import { NEXT_HMR_REFRESH_HASH_COOKIE } from "next/dist/client/components/app-router-headers";

type Props = {
  data: AssetCheckout[];
  onActionComplete?: () => void;
};

//View for active checkouts
export default function ActiveAssetsView({ data }: Props) {
  const [error, setError] = useState<string | null>(null);
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

  //Display active assets
  return (
    <div className="bg-white border border-zinc-200 shadow-sm p-6 max-w-6xl mx-auto">
      <h2 className="text-1xl font-bold mb-4">
        Active Requests ({data.length})
      </h2>
      {data.length === 0 && (
        <p className="text-zinc-500 text-center">No pending requests.</p>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {data.length !== 0 && (
        <>
          <div className="grid grid-cols-5 gap-4 font-semibold text-zinc-600 border-b border-zinc-200 pb-2 mb-2">
            <div>USER</div>
            <div>ASSET</div>
            <div>CHECKED OUT</div>
            <div>STATUS</div>
            <div>ACTIONS</div>
          </div>
          <div className="space-y-2">
            {data.map((active) => (
              <div
                key={active.checkout_id}
                className="grid grid-cols-5 gap-4 items-center p-3 rounded-md bg-crimson-50 border border-crimson-100"
              >
                <div>
                  <div>{active.user}</div>
                  <div className="text-sm text-gray-500">{active.email}</div>
                </div>
                <div>{active.asset}</div>
                <div>{new Date(active.request_date).toLocaleDateString()}</div>
                <div>{active.checkout_status}</div>
                <div>
                  <button
                    className="border border-zinc-300 text-zinc-700 px-2 py-1 rounded mr-2 cursor-pointer hover:bg-zinc-100"
                    onClick={() => ApproveReturn(active.checkout_id)}
                  >
                    Mark Returned
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
