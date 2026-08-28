"use client"
import { useState } from "react";
import {AssetCheckout} from "../../types";



type Props = {
    data: AssetCheckout[];
    onActionComplete?: () => void;
}


//View for requested assets
export default function RequestsView({data, onActionComplete}: Props)
{
    const [error, setError] = useState<string | null>(null);
    //Function for approving requests which calls aprove API route
    async function approveRequests(requestId: string)
    {
        try{
            setError(null);
            const res = await fetch("/api/requests/approve", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: requestId}),
            });
            if (!res.ok) throw new Error("Failed to approve request");
            onActionComplete?.();

          
        }
        catch(err)
        {
            setError((err as Error).message);
        }
    }
    async function denyRequest(requestId: string)
    {
        try{
            setError(null);
            const res = await fetch("/api/requests/deny", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: requestId}),
            });
            if (!res.ok) throw new Error("Failed to deny request");
            onActionComplete?.();

        }
        catch(err)
        {
            setError((err as Error).message);
        }
    }
    return (
        <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-6 max-w-6xl mx-auto">
            <h2 className="text-1xl font-bold mb-4">
                Pending Requests ({data.length})
            </h2>
            {data.length === 0 && (
                <p className="text-zinc-500 text-center">No pending requests.</p>
            )}
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            {data.length !== 0 &&(
                <>
                    {/* Table header */}
                    <div className="grid grid-cols-5 gap-4 font-semibold text-zinc-600 border-b border-zinc-200 pb-2 mb-2">
                        <div>USER</div>
                        <div>ASSET</div>
                        <div>REQUEST DATE</div>
                        <div>STATUS</div>
                        <div>ACTIONS</div>
                    </div>
                    {/* Table rows */}
                    <div className="space-y-2">
                        {data.map((req) => (
                            <div key={req.id} className="grid grid-cols-5 gap-4 items-center p-3 rounded-md bg-crimson-50 border border-crimson-100">
                                <div>{req.user_id}</div>
                                <div>{req.asset_id}</div>
                                <div>{new Date(req.request_date).toLocaleDateString()}</div>
                                <div>{req.checkout_status}</div>
                                <div>
                                    <button className="bg-emerald-600 text-white px-2 py-1 rounded mr-2 cursor-pointer hover:bg-emerald-700" onClick={()=> approveRequests(req.id)}>
                                        Approve
                                    </button>
                                    <button className="bg-red-600 text-white px-2 py-1 rounded cursor-pointer hover:bg-red-700" onClick={()=> denyRequest(req.id)}>
                                        Deny
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